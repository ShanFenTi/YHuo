// POST /api/user/login
//   { username, password }                    常规登录（开 2FA 时返回 needCode+ticket，验证码已发邮箱）
//   { username, ticket, code }                 二次验证第二步：凭票+验证码换正式会话
// 普通用户 → 发用户会话；管理员账号 → 发管理员会话并标记 admin:true（前台据此跳转后台）
import { json } from '../../lib/util.js';
import {
  verifyPassword, hashPassword, randomHex,
  createUserSession, userCookie,
  createSession, sessionCookie,
  loginKey, loginLockedFor, recordLoginFail, clearLoginFails,
} from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';
import { verifyCode, issueCode, createLoginPending, consumeLoginPending } from '../../lib/email.js';

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
  const ticket = body.ticket ? String(body.ticket) : '';
  const code = body.code ? String(body.code) : '';

  // ---- 2FA 第二步：票 + 验证码 ----
  if (ticket && code) {
    const userId = await consumeLoginPending(env, ticket);
    if (!userId) return json({ ok: false, error: '验证已过期，请重新登录' }, 401);
    const u = await env.DB
      .prepare('SELECT id, username, banned, email FROM users WHERE id = ?')
      .bind(userId).first();
    if (!u || u.banned) return json({ ok: false, error: '该账号已被禁用' }, 403);
    try {
      await verifyCode(env, u.email || '', 'login', code);
    } catch (e) {
      // 验证码错了票据也作废（防拿一张票慢慢试码）
      return json({ ok: false, error: (e && e.message) || '验证码校验失败，请重新登录' }, 400);
    }
    await env.DB.batch([
      env.DB.prepare('DELETE FROM user_sessions WHERE expires_at < ?').bind(new Date().toISOString()),
      env.DB.prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?").bind(u.id),
    ]);
    const token = await createUserSession(env, u.id);
    const av = await env.DB.prepare('SELECT avatar_key FROM users WHERE id = ?').bind(u.id).first();
    return json({ ok: true, username: u.username, avatar: (av && av.avatar_key) || null }, 200, { 'Set-Cookie': userCookie(token) });
  }

  if (!username || !password) return json({ ok: false, error: '请输入用户名和密码' }, 400);

  const row = await env.DB
    .prepare('SELECT id, banned, password_hash, salt, email, email_verified, twofa_enabled FROM users WHERE username = ?')
    .bind(username)
    .first();

  if (row) {
    // 不存在的用户名也跑一次哈希在这里做不了，放到下面统一兜底；这里只处理存在的情况
    if (row.banned) return json({ ok: false, error: '该账号已被禁用，请联系管理员' }, 403);
    if (await verifyPassword(password, row.salt, row.password_hash)) {
      // 开了二次验证：发验证码 + 发票据，前端进入验证码步骤
      if (row.twofa_enabled && row.email_verified && row.email) {
        let t;
        try {
          await issueCode(env, row.email, 'login');
          t = await createLoginPending(env, row.id);
        } catch (e) {
          return json({ ok: false, error: (e && e.message) || '验证码发送失败，请联系管理员' }, 500);
        }
        return json({ ok: false, needCode: true, ticket: t, error: '验证码已发送到你的邮箱' });
      }
      await env.DB.batch([
        env.DB.prepare('DELETE FROM user_sessions WHERE expires_at < ?').bind(new Date().toISOString()),
        env.DB.prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?").bind(row.id),
      ]);
      const token = await createUserSession(env, row.id);
      const av = await env.DB.prepare('SELECT avatar_key FROM users WHERE id = ?').bind(row.id).first();
      return json({ ok: true, username, avatar: (av && av.avatar_key) || null }, 200, { 'Set-Cookie': userCookie(token) });
    }
    return json({ ok: false, error: '用户名或密码错误' }, 401);
  }

  // 前台用户表没有：尝试管理员账号（主页用管理员账密登录可直接进后台）
  const admin = await env.DB
    .prepare('SELECT id, username, password_hash, salt FROM admin_users WHERE username = ?')
    .bind(username)
    .first();
  if (admin) {
    // 管理员分支同样限速（这里是从主页进后台的入口）
    const throttleKey = loginKey(request, 'admin', username);
    const lockedMin = await loginLockedFor(env, throttleKey);
    if (lockedMin > 0) {
      return json({ ok: false, error: '尝试次数过多已锁定，请约 ' + lockedMin + ' 分钟后再试' }, 429);
    }
    if (await verifyPassword(password, admin.salt, admin.password_hash)) {
      await clearLoginFails(env, throttleKey);
      await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()).run();
      const token = await createSession(env);
      // 管理员用前台入口登录：带上后台设置的管理头像（site_settings.admin_avatar 存 KV 键）
      const avRow = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'admin_avatar'").first();
      return json({ ok: true, admin: true, username: admin.username, avatar: (avRow && avRow.value) || null }, 200, { 'Set-Cookie': sessionCookie(token) });
    }
    await recordLoginFail(env, throttleKey);
    return json({ ok: false, error: '用户名或密码错误' }, 401);
  }

  // 用户不存在：跑一次哈希，避免响应时间暴露"有没有这个用户名"
  await hashPassword(password, randomHex(32));
  return json({ ok: false, error: '用户名或密码错误' }, 401);
}
