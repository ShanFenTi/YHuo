// GET    /api/messages?offset=0 → 最近留言（每页 30 条；每条带用户名 + 签到等级徽标数据）
// POST   /api/messages {content} → 发布留言（前台用户会话或管理员会话；同一用户 60 秒一条）
// DELETE /api/messages?id=N → 删除留言（仅管理员会话，留言板管理）
// 等级徽标按 checkins 累计天数实时算（lib/levels.js），不入库
import { json, getCookie, SESSION_COOKIE } from '../lib/util.js';
import { USER_COOKIE, getUserSession, isValidSession } from '../lib/auth.js';
import { ensureSchema } from '../lib/migrate.js';
import { levelOf } from '../lib/levels.js';

const PAGE_SIZE = 30;
const MAX_CHARS = 500;
const POST_INTERVAL_MS = 60000;

// 双会话鉴权：前台用户优先，其次管理员会话（与 /api/ai/chat 同口径）
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
    "COALESCE(NULLIF(u.nickname, ''), u.username) AS username " +
    'FROM messages m LEFT JOIN users u ON u.id = m.user_id ' +
    'ORDER BY m.id DESC LIMIT ? OFFSET ?'
  ).bind(PAGE_SIZE + 1, offset).all();
  const rows = res.results || [];
  // 涉及用户的签到总数（一次查齐，算等级徽标）
  const ids = [...new Set(rows.filter((r) => !r.is_admin && r.user_id).map((r) => r.user_id))];
  const counts = {};
  if (ids.length) {
    const cRes = await env.DB
      .prepare('SELECT user_id, COUNT(*) AS n FROM checkins WHERE user_id IN (' + ids.map(() => '?').join(',') + ') GROUP BY user_id')
      .bind(...ids)
      .all();
    (cRes.results || []).forEach((r) => { counts[r.user_id] = r.n; });
  }
  const list = rows.slice(0, PAGE_SIZE).map((r) => {
    const lv = levelOf(counts[r.user_id] || 0);
    return {
      id: r.id,
      content: r.content,
      created_at: r.created_at,
      username: r.is_admin ? '站长' : (r.username || '已注销用户'),
      isAdmin: !!r.is_admin,
      level: r.is_admin ? null : { lv: lv.lv, name: lv.name },
    };
  });
  return json({ ok: true, list, hasMore: rows.length > PAGE_SIZE });
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  const who = await identity(request, env);
  if (!who) return json({ ok: false, error: '请先登录后再留言' }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const content = String(body.content || '').trim();
  if (!content) return json({ ok: false, error: '说点什么再发布吧' }, 400);
  if (content.length > MAX_CHARS) return json({ ok: false, error: '留言最多 ' + MAX_CHARS + ' 字' }, 400);
  if (who.kind === 'user') {
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
  } else {
    await env.DB.prepare("INSERT INTO messages (user_id, content, is_admin) VALUES (0, ?, 1)").bind(content).run();
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
