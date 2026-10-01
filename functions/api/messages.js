// GET    /api/messages?offset=0 → 最近留言（每页 30 条；每条带用户名 + 签到等级徽标数据）
// POST   /api/messages {content} → 发布留言（前台用户会话或管理员会话；同一用户 60 秒一条）
//        无会话时按「路人」处理（2026-09-09）：内容校验同登录用户，落库 user_id=0 + is_admin=2（复用现有整型列，
//        0=注册用户 1=站长 2=路人，不动表结构）；身份凭 yhuo_guest 随机 Cookie（16 位 hex，无则现发），单人滑动窗口
//        60 秒一条 + 全局每分钟 10 条兜底（内存 Map，防多个陌生访客同时刷），超限 429
// DELETE /api/messages?id=N → 删除留言（仅管理员会话，留言板管理）
// 等级徽标按 checkins 累计天数实时算（lib/levels.js），不入库
import { json, getCookie, SESSION_COOKIE } from '../lib/util.js';
import { USER_COOKIE, getUserSession, getAdminAuth } from '../lib/auth.js';
import { ensureSchema } from '../lib/migrate.js';
import { levelOf } from '../lib/levels.js';

const PAGE_SIZE = 30;
const MAX_CHARS = 500;
const POST_INTERVAL_MS = 60000;
const GUEST_COOKIE = 'yhuo_guest';        // 路人身份 Cookie：随机 hex 16 位，长效（180 天）匿名标识
const GUEST_GLOBAL_LIMIT = 10;            // 路人全局兜底：每分钟 10 条
const GUEST_IP_MIN_LIMIT = 3;             // 路人单 IP 兜底：每分钟 3 条（D1 计数，跨 isolate 生效）

// 路人限速表（照 ai/chat.js 的内存滑动窗口写法；Worker 隔离实例间为近似值，防刷够用）：
// guestRate = guestId → 最近发布时间戳数组；guestGlobalTimes = 全部路人发布时间戳（全局兜底）
const guestRate = new Map();
const guestGlobalTimes = [];
// Map 条目上限：超过 500 就清掉「窗口内已无记录」的键，防内存无界增长（陌生访客 Cookie 一次性的场景）
function pruneGuestRate(now) {
  if (guestRate.size <= 500) return;
  for (const [k, arr] of guestRate) {
    if (!arr.length || now - arr[arr.length - 1] >= POST_INTERVAL_MS) guestRate.delete(k);
  }
}
function randomHex(len) {
  const bytes = new Uint8Array(len / 2);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 双会话鉴权：前台用户优先，其次管理员会话（与 /api/ai/chat 同口径）；都无 → null（按路人处理）。
// 管理员带出身份（2026-09-30）：留言按角色落 is_admin=1(超管/站长)/3(普通管理员)+admin_id，
// 前台显示本人的名字与头像——此前普通管理员发言会被冒名成「站长」
async function identity(request, env) {
  const user = await getUserSession(env, getCookie(request, USER_COOKIE));
  if (user) return { kind: 'user', userId: user.userId };
  const admin = await getAdminAuth(env, getCookie(request, SESSION_COOKIE));
  if (admin) return { kind: 'admin', adminId: admin.id, role: admin.role, username: admin.username };
  return null;
}

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  const url = new URL(request.url);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
  const res = await env.DB.prepare(
    'SELECT m.id, m.content, m.created_at, m.is_admin, m.user_id, m.admin_id, ' +
    'u.avatar_key AS avatar, ' +
    "COALESCE(NULLIF(u.nickname, ''), u.username) AS username, " +
    'a.username AS admin_username, a.avatar_key AS admin_avatar_key ' +
    'FROM messages m LEFT JOIN users u ON u.id = m.user_id ' +
    'LEFT JOIN admin_users a ON a.id = m.admin_id ' +
    'ORDER BY m.id DESC LIMIT ? OFFSET ?'
  ).bind(PAGE_SIZE + 1, offset).all();
  const rows = res.results || [];
  // 涉及用户的签到总数（一次查齐，算等级徽标）；路人（is_admin=2）与管理员（1/3）不参与
  const ids = [...new Set(rows.filter((r) => !r.is_admin && r.user_id).map((r) => r.user_id))];
  const counts = {};
  if (ids.length) {
    const cRes = await env.DB
      .prepare('SELECT user_id, COUNT(*) AS n FROM checkins WHERE user_id IN (' + ids.map(() => '?').join(',') + ') GROUP BY user_id')
      .bind(...ids)
      .all();
    (cRes.results || []).forEach((r) => { counts[r.user_id] = r.n; });
  }
  // 站长官方形象（留言板「站长留言」专用，后台「我的」页设置，存 site_settings 'admin_avatar'）：
  // 页面里有站长留言（is_admin=1）才查；普通管理员留言（is_admin=3）用自己的头像
  let adminAvatar = null;
  if (rows.some((r) => r.is_admin === 1)) {
    const aRow = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'admin_avatar'").first();
    adminAvatar = (aRow && aRow.value) || null;
  }
  const list = rows.slice(0, PAGE_SIZE).map((r) => {
    const lv = levelOf(counts[r.user_id] || 0);
    // is_admin 身份标记：0=注册用户 1=站长(超管) 2=路人 3=管理员(2026-09-30 起)；
    // 旧库无 admin_id 的历史站长留言回落「站长」名 + 官方形象
    const guest = r.is_admin === 2;
    const mod = r.is_admin === 3;
    return {
      id: r.id,
      content: r.content,
      created_at: r.created_at,
      user_id: r.user_id, // 路人恒为 0（前端渲染侧判定兜底）
      username: guest ? '路人'
        : mod ? (r.admin_username || '管理员')
        : r.is_admin ? (r.admin_username || '站长')
        : (r.username || '已注销用户'),
      avatar: guest ? null
        : mod ? (r.admin_avatar_key || null)
        : r.is_admin ? (adminAvatar || r.admin_avatar_key || null)
        : (r.avatar || null),
      isAdmin: !!r.is_admin && !guest && !mod,
      isMod: mod,
      isGuest: guest,
      level: (r.is_admin || guest) ? null : { lv: lv.lv, name: lv.name },
    };
  });
  return json({ ok: true, list, hasMore: rows.length > PAGE_SIZE });
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  const who = await identity(request, env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  // 内容校验：路人照登录用户同款（非空 + 500 字上限），不做截断只拦截（与原逻辑一致）
  const content = String(body.content || '').trim();
  if (!content) return json({ ok: false, error: '说点什么再发布吧' }, 400);
  if (content.length > MAX_CHARS) return json({ ok: false, error: '留言最多 ' + MAX_CHARS + ' 字' }, 400);
  if (who && who.kind === 'user') {
    // 同一用户 60 秒一条：INSERT…WHERE NOT EXISTS 单语句原子判定（2026-10-01 审计改；
    // 原「先 SELECT 再比较再 INSERT」并发双发可同读旧值双双穿过，1 条/分钟被放大成并发 N 条。
    // changes=0 即最近 60 秒已有发布，命中限速）
    const res = await env.DB
      .prepare(
        'INSERT INTO messages (user_id, content) SELECT ?, ? WHERE NOT EXISTS (' +
        'SELECT 1 FROM messages WHERE user_id = ? AND created_at > datetime(\'now\', \'-' + (POST_INTERVAL_MS / 1000) + ' seconds\'))'
      )
      .bind(who.userId, content, who.userId)
      .run();
    if (!res.meta.changes) {
      return json({ ok: false, error: '发得太快啦，稍等片刻再留言' }, 429);
    }
  } else if (who) {
    // 管理员留言：超管=1（站长徽标+官方形象）、普通管理员=3（管理员徽标+本人头像），admin_id 记发帖人
    await env.DB
      .prepare('INSERT INTO messages (user_id, content, is_admin, admin_id) VALUES (0, ?, ?, ?)')
      .bind(content, who.role === 'super' ? 1 : 3, who.adminId || null).run();
  } else {
    // —— 路人发布（2026-09-09）：is_admin=2 标记（不建列不改表），user_id 恒 0 ——
    const now = Date.now();
    // 匿名身份：优先读既有 yhuo_guest Cookie，没有就现发一个（响应统一带 Set-Cookie，浏览器后续携带同一 id）
    const guestId = getCookie(request, GUEST_COOKIE) || randomHex(16);
    const cookieHeader = {
      'Set-Cookie': GUEST_COOKIE + '=' + guestId + '; Max-Age=15552000; Path=/; SameSite=Lax; Secure',
    };
    // IP 维度限速（D1 计数，跨 isolate/冷启动都生效）：guestId Cookie 是客户端可控的，不带 Cookie
    // 的脚本每请求都是新身份，内存桶拦不住——所以配额身份用 CF-Connecting-IP，按分钟桶记数
    //（复用 login_throttle，UPSERT+RETURNING 原子取「含本次」的累计值）。内存桶降级为快速路径
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipMinKey = 'guestip:' + ip + ':' + Math.floor(now / 60000);
    const used = await env.DB.prepare(
      'INSERT INTO login_throttle (key, fails, last_fail) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET fails = fails + 1, last_fail = excluded.last_fail RETURNING fails'
    ).bind(ipMinKey, new Date(now).toISOString()).first();
    if (used && Number(used.fails) > GUEST_IP_MIN_LIMIT) {
      return json({ ok: false, error: '留言太频繁啦，稍等片刻再来吧' }, 429, cookieHeader);
    }
    // 时间桶键（guestip:/emailcode:/aiusage:/visitip:/regip:）不会像登录键那样被成功登录清掉：
    // 5% 概率顺手清 2 小时前的旧行，防无界增长（aiusage 每活跃用户每天 +24 行、visitip 每分钟一键）
    if (Math.random() < 0.05) {
      try {
        await env.DB.prepare(
          "DELETE FROM login_throttle WHERE last_fail < ? AND (key LIKE 'guestip:%' OR key LIKE 'emailcode:%' OR key LIKE 'aiusage:%' OR key LIKE 'visitip:%' OR key LIKE 'regip:%')"
        ).bind(new Date(now - 2 * 3600 * 1000).toISOString()).run();
      } catch (e) {}
    }
    pruneGuestRate(now);
    // 单个路人 60 秒一条（滑动窗口）
    const arr = (guestRate.get(guestId) || []).filter((t) => now - t < POST_INTERVAL_MS);
    if (arr.length) {
      guestRate.set(guestId, arr);
      return json({ ok: false, error: '路人留言限每分钟一条，稍等片刻再来吧' }, 429, cookieHeader);
    }
    arr.push(now);
    guestRate.set(guestId, arr);
    // 全局兜底：多个陌生访客同时刷也封顶每分钟 10 条
    while (guestGlobalTimes.length && now - guestGlobalTimes[0] >= POST_INTERVAL_MS) guestGlobalTimes.shift();
    if (guestGlobalTimes.length >= GUEST_GLOBAL_LIMIT) {
      return json({ ok: false, error: '此刻留言的人有点多，稍等片刻再试试' }, 429, cookieHeader);
    }
    guestGlobalTimes.push(now);
    await env.DB.prepare('INSERT INTO messages (user_id, content, is_admin) VALUES (0, ?, 2)').bind(content).run();
    return json({ ok: true }, 200, cookieHeader);
  }
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  await ensureSchema(env);
  // 修复（2026-10-01 审计）：此处原引用 isValidSession，但身份逻辑重写时该符号没进顶部 import——
  // ESM 未定义引用直接 ReferenceError，删除留言必 500、功能整体坏死（语法检查查不出未定义引用，
  // 本地实测复现）。getAdminAuth 是 isValidSession 的现行替代（返回 null 即无有效管理员会话），
  // 语义不变：凭管理员 Cookie 判定，与前台用户会话无关。
  const admin = await getAdminAuth(env, getCookie(request, SESSION_COOKIE));
  if (!admin) {
    return json({ ok: false, error: '仅管理员可删除留言' }, 403);
  }
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id') || '', 10);
  if (!id) return json({ ok: false, error: '缺少留言 id' }, 400);
  await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
