// POST /api/email/code { email, purpose: 'register' | 'reset' } → 发验证码（公开接口）
// bind（换绑）走 /api/user/email 需要登录；login（2FA）由登录接口内部触发。
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';
import { getEmailConfig, isEmailAddr, issueCode, consumeMailQuota, isSafeEmailError } from '../../lib/email.js';

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
  const purpose = body.purpose === 'reset' ? 'reset'
    : body.purpose === 'register' ? 'register'
    : body.purpose === 'admin-reset' ? 'admin-reset'
    : null;
  if (!purpose) return json({ ok: false, error: '无效的验证码用途' }, 400);
  if (!isEmailAddr(email)) return json({ ok: false, error: '邮箱格式不正确' }, 400);

  // 单 IP 每小时签发上限：先原子占额、后发信——占额逻辑抽到 lib/email.js consumeMailQuota，
  // 与所有 issueCode 调用方共用（此前只有本接口有这层，换绑/管理员绑定等口子可绕开烧配额）
  try {
    await consumeMailQuota(env, request);
  } catch (e) {
    return json({ ok: false, error: (e && e.message) || '请求过于频繁' }, 429);
  }

  // 管理员重置：只发绑定的管理员邮箱（存 site_settings 'admin_email'）。
  // 错配不回 404——那等于告知「哪个地址是管理员 2FA 收件箱」（给定向重置爆破指路），
  // 与成功响应保持同形（不发信、直接 ok），真假不可区分
  if (purpose === 'admin-reset') {
    const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'admin_email'").first();
    const adminEmail = row ? String(row.value).toLowerCase() : '';
    if (!adminEmail || email !== adminEmail) {
      return json({ ok: true });
    }
  } else if (cfg.adminOnly && email !== cfg.ownerEmail) {
    // 仅站长模式：只有站长邮箱能收验证码（无域名邮件服务只能发注册邮箱的场景）
    return json({ ok: false, error: '当前站点邮件功能仅站长可用' }, 403);
  }

  // register：邮箱不能已被注册；reset：邮箱必须已绑定（个人站从简，直接告知）
  if (purpose !== 'admin-reset') {
    const taken = await env.DB
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email).first();
    if (purpose === 'register' && taken) return json({ ok: false, error: '该邮箱已被注册' }, 400);
    if (purpose === 'reset' && !taken) return json({ ok: false, error: '该邮箱未绑定任何账号' }, 400);
  }

  try {
    await issueCode(env, email, purpose);
  } catch (e) {
    const msg = String((e && e.message) || '');
    console.error('验证码签发失败[' + purpose + ']: ' + msg);
    // 本站自有节流文案可直出；其余（可能带上游响应片段）回固定文案，细节留日志
    if (isSafeEmailError(msg)) return json({ ok: false, error: msg }, 429);
    return json({ ok: false, error: '验证码发送失败，请稍后再试' }, 429);
  }
  return json({ ok: true });
}
