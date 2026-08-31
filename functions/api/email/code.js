// POST /api/email/code { email, purpose: 'register' | 'reset' } → 发验证码（公开接口）
// bind（换绑）走 /api/user/email 需要登录；login（2FA）由登录接口内部触发。
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';
import { getEmailConfig, isEmailAddr, issueCode } from '../../lib/email.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: '站点未配置数据库' }, 503);
  await ensureSchema(env);
  const cfg = await getEmailConfig(env);
  if (!cfg.enabled) return json({ ok: false, error: '邮件服务未启用，请联系站长' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const email = String(body.email || '').trim().toLowerCase();
  const purpose = body.purpose === 'reset' ? 'reset' : body.purpose === 'register' ? 'register' : null;
  if (!purpose) return json({ ok: false, error: '无效的验证码用途' }, 400);
  if (!isEmailAddr(email)) return json({ ok: false, error: '邮箱格式不正确' }, 400);

  // register：邮箱不能已被注册；reset：邮箱必须已绑定（个人站从简，直接告知）
  const taken = await env.DB
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email).first();
  if (purpose === 'register' && taken) return json({ ok: false, error: '该邮箱已被注册' }, 400);
  if (purpose === 'reset' && !taken) return json({ ok: false, error: '该邮箱未绑定任何账号' }, 400);

  try {
    await issueCode(env, email, purpose);
  } catch (e) {
    return json({ ok: false, error: (e && e.message) || '发送失败' }, 429);
  }
  return json({ ok: true });
}
