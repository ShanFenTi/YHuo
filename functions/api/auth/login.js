// POST /api/auth/login { username, password }
import { json, getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { verifyPassword, hashPassword, randomHex, createSession, sessionCookie } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (!username || !password) return json({ ok: false, error: '请输入用户名和密码' }, 400);

  const row = await env.DB
    .prepare('SELECT id, username, password_hash, salt FROM admin_users WHERE username = ?')
    .bind(username)
    .first();

  // 用户不存在也跑一次哈希，避免响应时间暴露"有没有这个用户名"
  if (!row) {
    await hashPassword(password, randomHex(32));
    return json({ ok: false, error: '用户名或密码错误' }, 401);
  }

  if (!(await verifyPassword(password, row.salt, row.password_hash))) {
    return json({ ok: false, error: '用户名或密码错误' }, 401);
  }

  // 顺手清理过期会话
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()).run();

  const token = await createSession(env);
  return json({ ok: true, username: row.username }, 200, { 'Set-Cookie': sessionCookie(token) });
}
