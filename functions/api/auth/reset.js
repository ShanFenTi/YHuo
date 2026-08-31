// POST /api/auth/reset { email, code, newPassword } → 管理员邮箱验证码重置密码（免登录）
// 邮箱必须是 site_settings 'admin_email'（管理员在后台「我的」页绑定）；
// 验证码 purpose='admin-reset'；成功后踢掉全部管理员会话（防令牌留在被盗设备）。
// 注意：前台用户的找回密码走 POST /api/user/password，这里是管理员专用通道。
import { json } from '../../lib/util.js';
import { hashPassword, randomHex } from '../../lib/auth.js';
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
  const email = String(body.email || '').trim().toLowerCase();
  const code = String(body.code || '').trim();
  const newPassword = String(body.newPassword || '');
  if (!email || !/^\d{6}$/.test(code)) return json({ ok: false, error: '请填写邮箱和 6 位验证码' }, 400);
  if (newPassword.length < 6 || newPassword.length > 100) {
    return json({ ok: false, error: '新密码需 6-100 位' }, 400);
  }

  const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'admin_email'").first();
  const adminEmail = row ? String(row.value).toLowerCase() : '';
  if (!adminEmail || email !== adminEmail) {
    return json({ ok: false, error: '该邮箱未绑定管理员账号' }, 404);
  }

  try {
    await verifyCode(env, email, 'admin-reset', code);
  } catch (e) {
    return json({ ok: false, error: (e && e.message) || '验证码校验失败' }, 400);
  }

  const u = await env.DB.prepare('SELECT id FROM admin_users ORDER BY id LIMIT 1').first();
  if (!u) return json({ ok: false, error: '管理员账号不存在' }, 404);

  const salt = randomHex(32);
  const hash = await hashPassword(newPassword, salt);
  await env.DB.batch([
    env.DB.prepare('UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?').bind(hash, salt, u.id),
    env.DB.prepare('DELETE FROM sessions'), // 踢掉全部管理员会话
  ]);
  return json({ ok: true });
}
