// GET    /api/messages?offset=0 → 最近留言（每页 30 条；每条带用户名 + 签到等级徽标数据）
// POST   /api/messages {content} → 发布留言（前台用户会话或管理员会话；同一用户 60 秒一条）
//        无会话时按「路人」处理（2026-09-09）：内容校验同登录用户，落库 user_id=0 + is_admin=2（复用现有整型列，
//        0=注册用户 1=站长 2=路人，不动表结构）；身份凭 yhuo_guest 随机 Cookie（16 位 hex，无则现发），单人滑动窗口
//        60 秒一条 + 全局每分钟 10 条兜底（内存 Map，防多个陌生访客同时刷），超限 429
// DELETE /api/messages?id=N → 删除留言（仅管理员会话，留言板管理）
// 等级徽标按 checkins 累计天数实时算（lib/levels.js），不入库
import { json, getCookie, SESSION_COOKIE } from '../lib/util.js';
import { USER_COOKIE, getUserSession, isValidSession } from '../lib/auth.js';
import { ensureSchema } from '../lib/migrate.js';
import { levelOf } from '../lib/levels.js';

const PAGE_SIZE = 30;
const MAX_CHARS = 500;
const POST_INTERVAL_MS = 60000;
const GUEST_COOKIE = 'yhuo_guest';        // 路人身份 Cookie：随机 hex 16 位，长效（180 天）匿名标识
const GUEST_GLOBAL_LIMIT = 10;            // 路人全局兜底：每分钟 10 条

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

// 双会话鉴权：前台用户优先，其次管理员会话（与 /api/ai/chat 同口径）；都无 → null（按路人处理）
async function identity(request, env) {
  const user = await getUserSession(env, getCookie(request, USER_COOKIE));
  if (user) return { kind: 'user', userId: user.userId };
  if (await isValidSession(env, getCookie(request, SESSION_COOKIE))) return { kind: 'admin' };
  return null;
}

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  const url = new URL(request.url);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
  const res = await env.DB.prepare(
    'SELECT m.id, m.content, m.created_at, m.is_admin, m.user_id, ' +
    'u.avatar_key AS avatar, ' +
    "COALESCE(NULLIF(u.nickname, ''), u.username) AS username " +
    'FROM messages m LEFT JOIN users u ON u.id = m.user_id ' +
    'ORDER BY m.id DESC LIMIT ? OFFSET ?'
  ).bind(PAGE_SIZE + 1, offset).all();
  const rows = res.results || [];
  // 涉及用户的签到总数（一次查齐，算等级徽标）；路人（is_admin=2）与站长不参与
  const ids = [...new Set(rows.filter((r) => !r.is_admin && r.user_id).map((r) => r.user_id))];
  const counts = {};
  if (ids.length) {
    const cRes = await env.DB
      .prepare('SELECT user_id, COUNT(*) AS n FROM checkins WHERE user_id IN (' + ids.map(() => '?').join(',') + ') GROUP BY user_id')
      .bind(...ids)
      .all();
    (cRes.results || []).forEach((r) => { counts[r.user_id] = r.n; });
  }
  // 站长头像（后台「我的」页设置，存 site_settings 'admin_avatar'，KV 键）：页面里有站长留言才查
  let adminAvatar = null;
  if (rows.some((r) => r.is_admin === 1)) {
    const aRow = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'admin_avatar'").first();
    adminAvatar = (aRow && aRow.value) || null;
  }
  const list = rows.slice(0, PAGE_SIZE).map((r) => {
    const lv = levelOf(counts[r.user_id] || 0);
    // is_admin 复用为身份标记：0=注册用户 1=站长 2=路人（user_id 同为 0，靠本列区分）
    const guest = r.is_admin === 2;
    return {
      id: r.id,
      content: r.content,
      created_at: r.created_at,
      user_id: r.user_id, // 路人恒为 0（前端渲染侧判定兜底）
      username: guest ? '路人' : (r.is_admin ? '站长' : (r.username || '已注销用户')),
      avatar: guest ? null : (r.is_admin ? adminAvatar : (r.avatar || null)),
      isAdmin: !!r.is_admin && !guest,
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
    // 同一用户 60 秒一条（查最近一条的时间即可，够用）
    const last = await env.DB
      .prepare('SELECT created_at FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT 1')
      .bind(who.userId).first();
    if (last) {
      const t = Date.parse(String(last.created_at).replace(' ', 'T') + 'Z');
      if (!isNaN(t) && Date.now() - t < POST_INTERVAL_MS) {
        return json({ ok: false, error: '发得太快啦，稍等片刻再留言' }, 429);
      }
    }
    await env.DB.prepare('INSERT INTO messages (user_id, content) VALUES (?, ?)').bind(who.userId, content).run();
  } else if (who) {
    await env.DB.prepare("INSERT INTO messages (user_id, content, is_admin) VALUES (0, ?, 1)").bind(content).run();
  } else {
    // —— 路人发布（2026-09-09）：is_admin=2 标记（不建列不改表），user_id 恒 0 ——
    const now = Date.now();
    // 匿名身份：优先读既有 yhuo_guest Cookie，没有就现发一个（响应统一带 Set-Cookie，浏览器后续携带同一 id）
    const guestId = getCookie(request, GUEST_COOKIE) || randomHex(16);
    const cookieHeader = {
      'Set-Cookie': GUEST_COOKIE + '=' + guestId + '; Max-Age=15552000; Path=/; SameSite=Lax; Secure',
    };
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
  if (!(await isValidSession(env, getCookie(request, SESSION_COOKIE)))) {
    return json({ ok: false, error: '仅管理员可删除留言' }, 403);
  }
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id') || '', 10);
  if (!id) return json({ ok: false, error: '缺少留言 id' }, 400);
  await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
