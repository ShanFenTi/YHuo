// GET  /api/user/email → 当前邮箱状态（需登录）
// POST /api/user/email { action } →
//   bind-send  { email }            发换绑验证码（需登录）
//   bind-verify { email, code }     验证并保存邮箱（需登录）
//   toggle2fa  { enabled }          开关登录二次验证（需已验证邮箱）
import { json, getCookie } from '../../lib/util.js';
import { getUserSession, USER_COOKIE } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';
import { getEmailConfig, isEmailAddr, issueCode, verifyCode } from '../../lib/email.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: '站点未配置数据库' }, 503);
  await ensureSchema(env);
  const sess = await getUserSession(env, getCookie(request, USER_COOKIE));
  if (!sess) return json({ ok: false, error: '未登录' }, 401);
  const row = await env.DB
    .prepare('SELECT email, email_verified, twofa_enabled FROM users WHERE id = ?')
    .bind(sess.userId).first();
  if (!row) return json({ ok: false, error: '账号不存在' }, 404);
  const cfg = await getEmailConfig(env);
  return json({
    ok: true,
    enabled: cfg.enabled,
    email: row.email || null,
    verified: !!row.email_verified,
    twofa: !!row.twofa_enabled,
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: '站点未配置数据库' }, 503);
  await ensureSchema(env);
  const sess = await getUserSession(env, getCookie(request, USER_COOKIE));
  if (!sess) return json({ ok: false, error: '未登录' }, 401);
  const cfg = await getEmailConfig(env);
  if (!cfg.enabled) return json({ ok: false, error: '邮件服务未启用' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const action = String(body.action || '');

  if (action === 'bind-send') {
    const email = String(body.email || '').trim().toLowerCase();
    if (!isEmailAddr(email)) return json({ ok: false, error: '邮箱格式不正确' }, 400);
    const taken = await env.DB
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .bind(email, sess.userId).first();
    if (taken) return json({ ok: false, error: '该邮箱已被其他账号绑定' }, 400);
    try {
      await issueCode(env, email, 'bind');
    } catch (e) {
      return json({ ok: false, error: (e && e.message) || '发送失败' }, 429);
    }
    return json({ ok: true });
  }

  if (action === 'bind-verify') {
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    if (!isEmailAddr(email)) return json({ ok: false, error: '邮箱格式不正确' }, 400);
    const taken = await env.DB
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .bind(email, sess.userId).first();
    if (taken) return json({ ok: false, error: '该邮箱已被其他账号绑定' }, 400);
    try {
      await verifyCode(env, email, 'bind', code);
    } catch (e) {
      return json({ ok: false, error: (e && e.message) || '验证失败' }, 400);
    }
    await env.DB
      .prepare('UPDATE users SET email = ?, email_verified = 1 WHERE id = ?')
      .bind(email, sess.userId).run();
    return json({ ok: true, email });
  }

  if (action === 'toggle2fa') {
    const enabled = !!body.enabled;
    const row = await env.DB
      .prepare('SELECT email_verified FROM users WHERE id = ?')
      .bind(sess.userId).first();
    if (!row || !row.email_verified) {
      return json({ ok: false, error: '请先绑定并验证邮箱' }, 400);
    }
    await env.DB
      .prepare('UPDATE users SET twofa_enabled = ? WHERE id = ?')
      .bind(enabled ? 1 : 0, sess.userId).run();
    return json({ ok: true, twofa: enabled });
  }

  return json({ ok: false, error: '未知操作' }, 400);
}
