// POST /api/user/register { username, password, email?, code? } —— 开放注册，成功即自动登录
// 邮箱服务启用时 email+code 必填（验证通过才落库）；未启用时保持纯用户名注册。
import { json } from '../../lib/util.js';
import { hashPassword, randomHex, createUserSession, userCookie } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';
import { getEmailConfig, isEmailAddr, verifyCode } from '../../lib/email.js';

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

  // 邮箱验证（服务启用时强制）
  const cfg = await getEmailConfig(env);
  let email = null;
  if (cfg.enabled) {
    email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    if (!isEmailAddr(email)) return json({ ok: false, error: '请填写正确的邮箱' }, 400);
    if (!/^\d{6}$/.test(code)) return json({ ok: false, error: '请填写 6 位邮箱验证码' }, 400);
    try {
      await verifyCode(env, email, 'register', code);
    } catch (e) {
      return json({ ok: false, error: (e && e.message) || '验证码校验失败' }, 400);
    }
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
      .prepare(cfg.enabled
        ? 'INSERT INTO users (username, password_hash, salt, email, email_verified) VALUES (?, ?, ?, ?, 1)'
        : 'INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)')
      .bind(...(cfg.enabled ? [username, hash, salt, email] : [username, hash, salt]))
      .run();
  } catch {
    return json({ ok: false, error: '用户名已被占用' }, 400); // 并发注册撞 UNIQUE 的兜底
  }

  // 注册完直接登录
  const token = await createUserSession(env, result.meta.last_row_id);
  return json({ ok: true, username }, 200, { 'Set-Cookie': userCookie(token) });
}
