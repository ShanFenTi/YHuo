// POST /api/user/login { username, password }
// 普通用户 → 发用户会话；管理员账号 → 发管理员会话并标记 admin:true（前台据此跳转后台）
import { json } from '../../lib/util.js';
import {
  verifyPassword, hashPassword, randomHex,
  createUserSession, userCookie,
  createSession, sessionCookie,
} from '../../lib/auth.js';
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
    .prepare('SELECT id, banned, password_hash, salt FROM users WHERE username = ?')
    .bind(username)
    .first();

  if (row) {
    // 不存在的用户名也跑一次哈希在这里做不了，放到下面统一兜底；这里只处理存在的情况
    if (row.banned) return json({ ok: false, error: '该账号已被禁用，请联系管理员' }, 403);
    if (await verifyPassword(password, row.salt, row.password_hash)) {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM user_sessions WHERE expires_at < ?').bind(new Date().toISOString()),
        env.DB.prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?").bind(row.id),
      ]);
      const token = await createUserSession(env, row.id);
      return json({ ok: true, username }, 200, { 'Set-Cookie': userCookie(token) });
    }
    return json({ ok: false, error: '用户名或密码错误' }, 401);
  }

  // 前台用户表没有：尝试管理员账号（主页用管理员账密登录可直接进后台）
  const admin = await env.DB
    .prepare('SELECT id, username, password_hash, salt FROM admin_users WHERE username = ?')
    .bind(username)
    .first();
  if (admin && (await verifyPassword(password, admin.salt, admin.password_hash))) {
    await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()).run();
    const token = await createSession(env);
    return json({ ok: true, admin: true, username: admin.username }, 200, { 'Set-Cookie': sessionCookie(token) });
  }

  // 用户不存在：跑一次哈希，避免响应时间暴露"有没有这个用户名"
  await hashPassword(password, randomHex(32));
  return json({ ok: false, error: '用户名或密码错误' }, 401);
}
