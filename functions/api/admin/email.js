// GET  /api/admin/email → 邮件服务配置（Key 不回传，只回是否已设置+尾 4 位）
// PUT  /api/admin/email { enabled, provider, from, api_key? } → 保存（api_key 留空 = 保留原 Key）
// POST /api/admin/email { to } → 测试发送（真发一封到指定邮箱）
//      POST /api/admin/email { to, subject, text } → 自定义邮件（主题+纯文本正文）
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';
import { getEmailConfig, isEmailAddr, sendMail } from '../../lib/email.js';

const CONFIG_KEY = 'email_config';

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const row = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?').bind(CONFIG_KEY).first();
  let cfg = {};
  try { cfg = JSON.parse(row ? row.value : '{}') || {}; } catch {}
  return json({
    ok: true,
    enabled: !!cfg.enabled,
    provider: cfg.provider === 'brevo' ? 'brevo' : 'resend',
    from: cfg.from || '',
    keySet: !!cfg.api_key,
    keyTail: cfg.api_key ? String(cfg.api_key).slice(-4) : '',
    adminOnly: !!cfg.admin_only,
    ownerEmail: cfg.owner_email || '',
  });
}

export async function onRequestPut({ request, env }) {
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const row = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?').bind(CONFIG_KEY).first();
  let old = {};
  try { old = JSON.parse(row ? row.value : '{}') || {}; } catch {}

  const provider = body.provider === 'brevo' ? 'brevo' : 'resend';
  const from = String(body.from || '').trim();
  const apiKey = body.api_key ? String(body.api_key).trim() : old.api_key || null;
  const enabled = !!body.enabled && !!apiKey && !!from; // 缺 Key/发件人不许开
  // owner_email：显式传空字符串 = 移除站长邮箱；不传（undefined）= 保留原值
  const ownerEmail = String(
    body.owner_email != null ? body.owner_email : (old.owner_email || '')
  ).trim().toLowerCase();
  const adminOnly = !!body.admin_only && isEmailAddr(ownerEmail); // 开"仅站长"必须有站长邮箱

  if (!isEmailAddr(from)) return json({ ok: false, error: '发件地址格式不正确' }, 400);
  if (body.admin_only && !isEmailAddr(ownerEmail)) {
    return json({ ok: false, error: '开启"仅站长使用"前请填写站长邮箱' }, 400);
  }

  const cfg = { provider, from, api_key: apiKey, enabled, admin_only: adminOnly, owner_email: ownerEmail || null };
  await env.DB
    .prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(CONFIG_KEY, JSON.stringify(cfg))
    .run();
  return json({ ok: true, enabled, provider, from, keySet: !!apiKey, adminOnly, ownerEmail });
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const to = String(body.to || '').trim();
  if (!isEmailAddr(to)) return json({ ok: false, error: '收件地址格式不正确' }, 400);
  const cfg = await getEmailConfig(env);
  if (!cfg.enabled) return json({ ok: false, error: '请先填写并启用邮件服务' }, 400);
  try {
    if (body.subject != null || body.text != null) {
      // 自定义邮件：主题 + 纯文本正文（换行转 <br>，HTML 转义防注入）
      const subject = String(body.subject || '').trim().slice(0, 200) || 'YHuo 邮件';
      const text = String(body.text || '').slice(0, 5000);
      const esc = s => s.replace(/[&<>"']/g, ch =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
      const html = '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:28px 24px;color:#222;font-size:14px;line-height:1.7;white-space:pre-wrap;">'
        + esc(text) + '</div>';
      await sendMail(env, to, subject, html);
    } else {
      await sendMail(env, to, 'YHuo 测试邮件', '<div style="font-family:system-ui,sans-serif;padding:24px;"><h2 style="margin:0 0 12px;">测试成功 🎉</h2><p style="color:#555;margin:0;">这封邮件说明 YHuo 的邮件服务配置正确。</p></div>');
    }
  } catch (e) {
    return json({ ok: false, error: (e && e.message) || '发送失败' }, 500);
  }
  return json({ ok: true });
}
