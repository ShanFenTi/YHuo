// POST /api/auth/login
//   { username, password }   常规登录（管理员开了 2FA 时返回 needCode+ticket，验证码已发管理员邮箱）
//   { ticket, code }         二次验证第二步：凭票+验证码换正式会话（email_login_pending 里 user_id 为负数 = 管理员 id 取负，与 schedule_sent 的 -1 约定同源）
// 每次登录（成功/失败）都记 admin_login_logs，「我的」页安全卡展示
import { json } from '../../lib/util.js';
import { verifyPassword, hashPassword, randomHex, createSession, sessionCookie, loginKey, loginLockedFor, recordLoginFail, clearLoginFails, logAdminLogin } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';
import { issueCode, verifyCode, createLoginPending, consumeLoginPending } from '../../lib/email.js';

async function getSetting(env, key) {
  const row = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?').bind(key).first();
  return row ? row.value : null;
}

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
  const code = body.code ? String(body.code).trim() : '';

  // ---- 2FA 第二步：票 + 验证码（不走近路：票一次性、码限 5 次尝试） ----
  if (ticket && code) {
    const negId = await consumeLoginPending(env, ticket);
    if (!negId || negId > 0) return json({ ok: false, error: '验证已过期，请重新登录' }, 401);
    const admin = await env.DB.prepare('SELECT id, username FROM admin_users WHERE id = ?').bind(-negId).first();
    if (!admin) return json({ ok: false, error: '验证已过期，请重新登录' }, 401);
    const adminEmail = await getSetting(env, 'admin_email');
    try {
      await verifyCode(env, adminEmail || '', 'admin2fa', code);
    } catch (e) {
      await logAdminLogin(env, request, 0, '2FA 验证码错误');
      return json({ ok: false, error: (e && e.message) || '验证码校验失败，请重新登录' }, 400);
    }
    await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()).run();
    const token = await createSession(env, request);
    await logAdminLogin(env, request, 1, '密码 + 邮箱验证码');
    return json({ ok: true, username: admin.username }, 200, { 'Set-Cookie': sessionCookie(token) });
  }

  if (!username || !password) return json({ ok: false, error: '请输入用户名和密码' }, 400);

  // 登录限速：同一 IP+用户名 连续失败 5 次锁 10 分钟
  const throttleKey = loginKey(request, 'admin', username);
  const lockedMin = await loginLockedFor(env, throttleKey);
  if (lockedMin > 0) {
    return json({ ok: false, error: '尝试次数过多已锁定，请约 ' + lockedMin + ' 分钟后再试' }, 429);
  }

  const row = await env.DB
    .prepare('SELECT id, username, password_hash, salt FROM admin_users WHERE username = ?')
    .bind(username)
    .first();

  // 用户不存在也跑一次哈希，避免响应时间暴露"有没有这个用户名"
  if (!row) {
    await hashPassword(password, randomHex(32));
    await recordLoginFail(env, throttleKey);
    await logAdminLogin(env, request, 0, '用户名不存在');
    return json({ ok: false, error: '用户名或密码错误' }, 401);
  }

  if (!(await verifyPassword(password, row.salt, row.password_hash))) {
    await recordLoginFail(env, throttleKey);
    await logAdminLogin(env, request, 0, '密码错误');
    return json({ ok: false, error: '用户名或密码错误' }, 401);
  }

  await clearLoginFails(env, throttleKey);

  // 管理员 2FA：开启且已绑邮箱 → 密码通过只算一半，发码要求二次验证
  const twoFa = await getSetting(env, 'admin_2fa');
  const adminEmail = twoFa === '1' ? await getSetting(env, 'admin_email') : null;
  if (adminEmail) {
    const pending = await createLoginPending(env, -row.id);
    try {
      await issueCode(env, adminEmail, 'admin2fa');
    } catch (e) {
      const msg = String(e && e.message) || '';
      await logAdminLogin(env, request, 0, '2FA 邮件发送失败');
      // 60 秒重发节流：上一封邮件里的验证码仍然有效，提示直接用旧码
      if (msg.indexOf('发送太频繁') >= 0) {
        return json({ ok: false, needCode: true, ticket: pending, error: '验证码已发送过，请查收邮箱后输入（约 1 分钟后才能重发）' });
      }
      return json({ ok: false, error: msg || '验证码发送失败' }, 500);
    }
    await logAdminLogin(env, request, 0, '密码通过，等待二次验证');
    return json({ ok: false, needCode: true, ticket: pending, error: '验证码已发送到管理员邮箱' });
  }

  // 顺手清理过期会话
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()).run();

  const token = await createSession(env, request);
  await logAdminLogin(env, request, 1, '密码登录');
  return json({ ok: true, username: row.username }, 200, { 'Set-Cookie': sessionCookie(token) });
}
