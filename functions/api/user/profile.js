// GET /api/user/profile → 当前登录用户的个人主页资料（前端用户或管理员）
import { json, getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { getUserSession, isValidSession, USER_COOKIE } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  const sess = await getUserSession(env, getCookie(request, USER_COOKIE));
  if (sess) {
    const row = await env.DB
      .prepare('SELECT username, nickname, avatar_key, created_at, last_seen_at FROM users WHERE id = ?')
      .bind(sess.userId)
      .first();
    if (!row) return json({ ok: false, error: '账号不存在' }, 404);
    return json({
      ok: true,
      admin: false,
      username: row.username,
      nickname: row.nickname || '',
      avatar: row.avatar_key || null,
      created_at: row.created_at || null,
      last_seen_at: row.last_seen_at || null,
    });
  }
  // 管理员会话：给前台个人主页返回管理员资料（收藏/课表/邮箱/改密等前台功能对管理员不可用，前端据此隐藏）
  if (await isValidSession(env, getCookie(request, SESSION_COOKIE))) {
    const avRow = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'admin_avatar'").first();
    const adm = await env.DB
      .prepare('SELECT username, created_at FROM admin_users ORDER BY id LIMIT 1')
      .first();
    if (!adm) return json({ ok: false, error: '未登录' }, 401);
    return json({
      ok: true,
      admin: true,
      username: adm.username,
      avatar: (avRow && avRow.value) || null,
      created_at: adm.created_at || null,
      last_seen_at: null,
    });
  }
  return json({ ok: false, error: '未登录' }, 401);
}
