// GET /api/user/profile → 当前登录用户的个人主页资料（用户名/头像/注册时间/上次活跃）
import { json, getCookie } from '../../lib/util.js';
import { getUserSession, USER_COOKIE } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  const sess = await getUserSession(env, getCookie(request, USER_COOKIE));
  if (!sess) return json({ ok: false, error: '未登录' }, 401);
  const row = await env.DB
    .prepare('SELECT username, avatar_key, created_at, last_seen_at FROM users WHERE id = ?')
    .bind(sess.userId)
    .first();
  if (!row) return json({ ok: false, error: '账号不存在' }, 404);
  return json({
    ok: true,
    username: row.username,
    avatar: row.avatar_key || null,
    created_at: row.created_at || null,
    last_seen_at: row.last_seen_at || null,
  });
}
