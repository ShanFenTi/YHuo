// POST /api/user/register { username, password } —— 开放注册，成功即自动登录
import { json } from '../../lib/util.js';
import { hashPassword, randomHex, createUserSession, userCookie } from '../../lib/auth.js';
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
  if (username.length < 2 || username.length > 30 || /\s/.test(username)) {
    return json({ ok: false, error: '用户名需 2-30 字符且不含空格' }, 400);
  }
  if (password.length < 6 || password.length > 100) {
    return json({ ok: false, error: '密码需 6-100 位' }, 400);
  }

  // 管理员用户名也不允许被前台注册占用，避免冒充
  const taken = await env.DB.prepare('SELECT id FROM admin_users WHERE username = ?').bind(username).first()
    || await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (taken) return json({ ok: false, error: '用户名已被占用' }, 400);

  const salt = randomHex(32);
  const hash = await hashPassword(password, salt);
  let result;
  try {
    result = await env.DB
      .prepare('INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)')
      .bind(username, hash, salt)
      .run();
  } catch {
    return json({ ok: false, error: '用户名已被占用' }, 400); // 并发注册撞 UNIQUE 的兜底
  }

  // 注册完直接登录
  const token = await createUserSession(env, result.meta.last_row_id);
  return json({ ok: true, username }, 200, { 'Set-Cookie': userCookie(token) });
}
