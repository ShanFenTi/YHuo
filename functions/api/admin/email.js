// GET  /api/admin/email → 邮件服务配置（Key 不回传，只回是否已设置+尾 4 位）
// PUT  /api/admin/email { enabled, provider, from, api_key? } → 保存（api_key 留空 = 保留原 Key）
// POST /api/admin/email { to } → 测试发送（真发一封到指定邮箱）
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

  if (!isEmailAddr(from)) return json({ ok: false, error: '发件地址格式不正确' }, 400);

  const cfg = { provider, from, api_key: apiKey, enabled };
  await env.DB
    .prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(CONFIG_KEY, JSON.stringify(cfg))
    .run();
  return json({ ok: true, enabled, provider, from, keySet: !!apiKey });
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
    await sendMail(env, to, 'YHuo 测试邮件', '<div style="font-family:system-ui,sans-serif;padding:24px;"><h2 style="margin:0 0 12px;">测试成功 🎉</h2><p style="color:#555;margin:0;">这封邮件说明 YHuo 的邮件服务配置正确。</p></div>');
  } catch (e) {
    return json({ ok: false, error: (e && e.message) || '发送失败' }, 500);
  }
  return json({ ok: true });
}
