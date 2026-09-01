// 邮件服务：配置存 site_settings `email_config` {provider, api_key, from, enabled}
// Workers 运行时只有 fetch（无原始 TCP），SMTP 不可用，只支持 HTTP API 服务商：
//   resend → POST https://api.resend.com/emails（免费 100 封/天）
//   brevo  → POST https://api.brevo.com/v3/smtp/email（免费 300 封/天）
// 验证码：email_codes 表（PK=email+purpose），6 位数字、哈希存储、10 分钟有效、
// 限 5 次尝试、60 秒重发间隔；过期行在签发时懒清理。
import { randomHex } from './auth.js';

const CONFIG_KEY = 'email_config';
export const CODE_TTL_MIN = 10;   // 验证码有效期（分钟）
const CODE_RESEND_SEC = 60;       // 重发间隔（秒）
const CODE_MAX_ATTEMPTS = 5;      // 验证码最多尝试次数

export async function getEmailConfig(env) {
  if (!env.DB) return { enabled: false };
  const row = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?').bind(CONFIG_KEY).first();
  let cfg = null;
  try { cfg = JSON.parse(row ? row.value : 'null'); } catch {}
  if (!cfg || typeof cfg !== 'object') {
    return { enabled: false, provider: 'resend', apiKey: null, from: null, adminOnly: false, ownerEmail: null };
  }
  const ownerEmail = isEmailAddr(cfg.owner_email) ? String(cfg.owner_email).trim().toLowerCase() : null;
  return {
    enabled: !!cfg.enabled && !!cfg.api_key && !!cfg.from,
    provider: cfg.provider === 'brevo' ? 'brevo' : 'resend',
    apiKey: cfg.api_key || null,
    from: cfg.from || null,
    // 仅站长模式：无域名邮件服务（如 Resend onboarding）只能发给注册邮箱时用——
    // 普通用户不出现邮箱 UI，只有 owner_email 这个账号能用找回密码/绑定/2FA
    adminOnly: !!cfg.admin_only && !!ownerEmail,
    ownerEmail,
  };
}

export function isEmailAddr(s) {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,32}$/.test(String(s || '').trim());
}

async function sendViaResend(cfg, to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + cfg.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: cfg.from, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error('resend ' + res.status + ' ' + (await res.text()).slice(0, 200));
}

async function sendViaBrevo(cfg, to, subject, html) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': cfg.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: { email: cfg.from }, to: [{ email: to }], subject, htmlContent: html }),
  });
  if (!res.ok) throw new Error('brevo ' + res.status + ' ' + (await res.text()).slice(0, 200));
}

// 发送邮件并按天计账（kind=用途：code/t/custom/sched-daily/sched-class，概览统计用）。
// 记账失败不影响发送结果（catch 吞掉）。
export async function sendMail(env, to, subject, html, kind) {
  const cfg = await getEmailConfig(env);
  if (!cfg.enabled) throw new Error('邮件服务未启用');
  if (cfg.provider === 'brevo') await sendViaBrevo(cfg, to, subject, html);
  else await sendViaResend(cfg, to, subject, html);
  if (kind) {
    try {
      const day = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
      await env.DB
        .prepare(`INSERT INTO email_usage_daily (day, kind, count) VALUES (?, ?, 1)
          ON CONFLICT(day, kind) DO UPDATE SET count = count + 1`)
        .bind(day, String(kind).slice(0, 20))
        .run();
    } catch {}
  }
}

function codeHtml(code, minutes) {
  return '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:420px;margin:0 auto;padding:28px 24px;">'
    + '<h2 style="margin:0 0 14px;font-size:18px;color:#111;">YHuo 验证码</h2>'
    + '<p style="margin:0 0 16px;color:#444;font-size:14px;">你的验证码是：</p>'
    + '<p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:8px;color:#111;">' + code + '</p>'
    + '<p style="margin:0;color:#888;font-size:13px;">' + minutes + ' 分钟内有效。若非本人操作，请忽略这封邮件。</p>'
    + '</div>';
}

async function hashCode(email, code) {
  const enc = new TextEncoder();
  const bits = await crypto.subtle.digest('SHA-256', enc.encode(email + ':' + code));
  let s = '';
  for (const b of new Uint8Array(bits)) s += b.toString(16).padStart(2, '0');
  return s;
}

function utcNowIso() { return new Date().toISOString(); }
function dbNow(offsetSec) { return new Date(Date.now() + (offsetSec || 0) * 1000).toISOString().slice(0, 19).replace('T', ' '); }

// 签发验证码并发送邮件。成功返回 {ok:true}；失败抛 Error（中文消息可直接给前端）。
export async function issueCode(env, email, purpose) {
  email = String(email || '').trim().toLowerCase();
  // 60 秒内已发过：拦截（读 created_at，PK 覆盖前先查）
  const prev = await env.DB
    .prepare('SELECT created_at, expires_at FROM email_codes WHERE email = ? AND purpose = ?')
    .bind(email, purpose).first();
  if (prev) {
    const last = Date.parse(String(prev.created_at).replace(' ', 'T') + 'Z');
    if (!isNaN(last) && Date.now() - last < CODE_RESEND_SEC * 1000) {
      throw new Error('发送太频繁，请 ' + Math.ceil((CODE_RESEND_SEC * 1000 - (Date.now() - last)) / 1000) + ' 秒后再试');
    }
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hash = await hashCode(email, code);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM email_codes WHERE expires_at < ?').bind(dbNow(0)),
    env.DB
      .prepare(`INSERT INTO email_codes (email, purpose, code_hash, attempts, expires_at) VALUES (?, ?, ?, 0, ?)
        ON CONFLICT(email, purpose) DO UPDATE SET code_hash = excluded.code_hash, attempts = 0, expires_at = excluded.expires_at, created_at = datetime('now')`)
      .bind(email, purpose, hash, dbNow(CODE_TTL_MIN * 60)),
  ]);
  try {
    await sendMail(env, email, 'YHuo 验证码：' + code, codeHtml(code, CODE_TTL_MIN), 'code');
  } catch (e) {
    // 邮件没发出去：把刚写的码作废，避免用户收到不了却占着 60 秒冷却
    await env.DB.prepare('DELETE FROM email_codes WHERE email = ? AND purpose = ?').bind(email, purpose).run();
    throw new Error('邮件发送失败（' + (String(e && e.message).slice(0, 80)) + '），请检查后台配置');
  }
  return { ok: true };
}

// 校验验证码：对 = 删记录返回 true；错 = 记一次尝试返回 false；超限/过期抛 Error。
export async function verifyCode(env, email, purpose, code) {
  email = String(email || '').trim().toLowerCase();
  const row = await env.DB
    .prepare('SELECT code_hash, attempts, expires_at FROM email_codes WHERE email = ? AND purpose = ?')
    .bind(email, purpose).first();
  if (!row) throw new Error('验证码不存在或已失效，请重新获取');
  if (Date.parse(String(row.expires_at).replace(' ', 'T') + 'Z') < Date.now()) {
    await env.DB.prepare('DELETE FROM email_codes WHERE email = ? AND purpose = ?').bind(email, purpose).run();
    throw new Error('验证码已过期，请重新获取');
  }
  if (row.attempts >= CODE_MAX_ATTEMPTS) {
    await env.DB.prepare('DELETE FROM email_codes WHERE email = ? AND purpose = ?').bind(email, purpose).run();
    throw new Error('尝试次数过多，请重新获取验证码');
  }
  const hash = await hashCode(email, String(code || '').trim());
  if (hash !== row.code_hash) {
    await env.DB
      .prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE email = ? AND purpose = ?')
      .bind(email, purpose).run();
    const left = CODE_MAX_ATTEMPTS - row.attempts - 1;
    throw new Error(left > 0 ? '验证码不正确（还剩 ' + left + ' 次机会）' : '尝试次数过多，请重新获取验证码');
  }
  await env.DB.prepare('DELETE FROM email_codes WHERE email = ? AND purpose = ?').bind(email, purpose).run();
  return true;
}

// 2FA 登录中间票据
export async function createLoginPending(env, userId) {
  const ticket = randomHex(24);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM email_login_pending WHERE expires_at < ?').bind(utcNowIso()),
    env.DB.prepare('INSERT INTO email_login_pending (ticket, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(ticket, userId, new Date(Date.now() + 10 * 60000).toISOString()),
  ]);
  return ticket;
}

export async function consumeLoginPending(env, ticket) {
  if (!ticket) return null;
  const row = await env.DB
    .prepare('SELECT user_id, expires_at FROM email_login_pending WHERE ticket = ?')
    .bind(String(ticket).slice(0, 80)).first();
  if (!row) return null;
  await env.DB.prepare('DELETE FROM email_login_pending WHERE ticket = ?').bind(String(ticket).slice(0, 80)).run();
  if (Date.parse(row.expires_at) < Date.now()) return null;
  return row.user_id;
}
