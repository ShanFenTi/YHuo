// 邮件服务：配置存 site_settings `email_config` {provider, api_key, from, enabled}
// Workers 运行时只有 fetch（无原始 TCP），SMTP 不可用，只支持 HTTP API 服务商：
//   resend → POST https://api.resend.com/emails（免费 100 封/天）
//   brevo  → POST https://api.brevo.com/v3/smtp/email（免费 300 封/天）
// 验证码：email_codes 表（PK=email+purpose），6 位数字、哈希存储、10 分钟有效、
// 限 5 次尝试（原子占额）、60 秒重发间隔（原子判定）；过期行在签发时懒清理。
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
    return { enabled: false, provider: 'resend', apiKey: null, from: null, adminOnly: false, ownerEmail: null, registerRequireEmail: true };
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
    // 注册必须验证邮箱（2026-10-01）：缺省=强制（兼容老配置）；关闭后注册页出现
    // 「使用邮箱注册」开关，访客可自选纯用户名注册
    registerRequireEmail: cfg.register_require_email !== 0,
  };
}

export function isEmailAddr(s) {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,32}$/.test(String(s || '').trim());
}

// 单 IP 每小时发信占额（防配额烧穿）：UPSERT+RETURNING 一次拿到「含本次」的累计值，
// 占额不因后续步骤失败退还（防失败重试白嫖）。所有 issueCode 调用方（公开发码/换绑/
// 管理员绑定/两处 2FA 登录）统一先占额——此前只有 /api/email/code 有这层，其余口子
// 换收件人即可绕开烧穿日配额，连带 2FA 发码失败把管理员锁在门外。键前缀 emailcode:
// 与 messages.js / visit.js 的旧行清理同清单。
const MAIL_IP_HOUR_LIMIT = 8;
export async function consumeMailQuota(env, request) {
  if (!env.DB) return;
  const ip = (request && request.headers && request.headers.get('CF-Connecting-IP')) || 'unknown';
  const ipHourKey = 'emailcode:' + ip + ':' + new Date().toISOString().slice(0, 13);
  const used = await env.DB.prepare(
    'INSERT INTO login_throttle (key, fails, last_fail) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET fails = fails + 1, last_fail = excluded.last_fail RETURNING fails'
  ).bind(ipHourKey, new Date().toISOString()).first();
  if (used && Number(used.fails) > MAIL_IP_HOUR_LIMIT) {
    throw new Error('验证码请求过于频繁，请一小时后再试');
  }
}

// issueCode / consumeMailQuota 抛出的本站自有节流文案（不含上游细节）可直出给前端；
// 其余错误（如带 resend 响应片段的发送失败）调用方必须换成固定文案，细节进日志
export function isSafeEmailError(msg) {
  const s = String(msg || '');
  return s.indexOf('发送太频繁') === 0 || s.indexOf('验证码请求过于频繁') === 0 || s === '邮件服务未启用';
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

// 发送邮件并按天计账（kind=用途：code/test/custom/sched-daily/sched-class，概览统计用）。
// 记账失败不影响发送结果（catch 吞掉）；同时每条（成功/失败）写入 email_logs 明细（概览页"发送明细"列表用）。
export async function sendMail(env, to, subject, html, kind) {
  const cfg = await getEmailConfig(env);
  if (!cfg.enabled) throw new Error('邮件服务未启用');
  try {
    if (cfg.provider === 'brevo') await sendViaBrevo(cfg, to, subject, html);
    else await sendViaResend(cfg, to, subject, html);
  } catch (e) {
    await logEmail(env, kind, to, subject, 0, String((e && e.message) || e).slice(0, 500));
    throw e;
  }
  await logEmail(env, kind, to, subject, 1, '');
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

// 写邮件发送明细（失败记录也在 await 链里，写库失败直接吞掉不影响发送结果）
async function logEmail(env, kind, to, subject, ok, err) {
  try {
    await env.DB.prepare(
      'INSERT INTO email_logs (kind, to_email, subject, ok, err) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      String(kind || '').slice(0, 20),
      String(to || '').slice(0, 200),
      String(subject || '').slice(0, 200),
      ok ? 1 : 0,
      String(err || '').slice(0, 500),
    ).run();
  } catch {}
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

// 签发验证码并发送邮件。成功返回 {ok:true}；失败抛 Error（本站自有文案可直接给前端，
// 发送失败类消息可能带上游片段，调用方用 isSafeEmailError 过滤后再回）。
// 60 秒重发冷却原子化：UPSERT 的 DO UPDATE 带 WHERE（距上次签发 ≥60 秒才覆盖），
// 条件不满足时该语句 changes=0——此前「先 SELECT created_at 再覆盖」两步走，并发请求
// 同读旧值可以一起穿过，连单邮箱 60 秒都拦不住并发刷
export async function issueCode(env, email, purpose) {
  email = String(email || '').trim().toLowerCase();
  // 验证码是安全凭据：CSPRNG 取数（Math.random 可预测；无盐 SHA-256 下离线爆破空间更小越好）
  const rnd = new Uint32Array(1);
  crypto.getRandomValues(rnd);
  const code = String(100000 + (rnd[0] % 900000));
  const hash = await hashCode(email, code);
  const res = await env.DB.batch([
    env.DB.prepare('DELETE FROM email_codes WHERE expires_at < ?').bind(dbNow(0)),
    env.DB
      .prepare(`INSERT INTO email_codes (email, purpose, code_hash, attempts, expires_at) VALUES (?, ?, ?, 0, ?)
        ON CONFLICT(email, purpose) DO UPDATE SET code_hash = excluded.code_hash, attempts = 0, expires_at = excluded.expires_at, created_at = datetime('now')
        WHERE (strftime('%s', 'now') - strftime('%s', email_codes.created_at)) >= ${CODE_RESEND_SEC}`)
      .bind(email, purpose, hash, dbNow(CODE_TTL_MIN * 60)),
  ]);
  const changes = res && res[1] && res[1].meta ? Number(res[1].meta.changes || 0) : 0;
  if (changes === 0) throw new Error('发送太频繁，请 1 分钟后再试');
  try {
    await sendMail(env, email, 'YHuo 验证码：' + code, codeHtml(code, CODE_TTL_MIN), 'code');
  } catch (e) {
    // 邮件没发出去：把刚写的码作废，避免用户收到不了却占着 60 秒冷却
    await env.DB.prepare('DELETE FROM email_codes WHERE email = ? AND purpose = ?').bind(email, purpose).run();
    throw new Error('邮件发送失败（' + (String(e && e.message).slice(0, 80)) + '），请检查后台配置');
  }
  return { ok: true };
}

// 校验验证码：对 = 删记录返回 true；错 = 记一次尝试；超限/过期抛 Error。
// 尝试计数原子化：先 UPDATE…RETURNING 占名额再比较——此前「读 row.attempts → 比较 →
// 单独 UPDATE +1」的写法里，并发波次会共享同一个旧值、每发请求都拿到一次哈希比较
// 机会，「5 次/码」上限被击穿（reset 码可从公开接口按 8 个/小时/IP 持续获取）
export async function verifyCode(env, email, purpose, code) {
  email = String(email || '').trim().toLowerCase();
  const row = await env.DB
    .prepare('SELECT code_hash, expires_at FROM email_codes WHERE email = ? AND purpose = ?')
    .bind(email, purpose).first();
  if (!row) throw new Error('验证码不存在或已失效，请重新获取');
  if (Date.parse(String(row.expires_at).replace(' ', 'T') + 'Z') < Date.now()) {
    await env.DB.prepare('DELETE FROM email_codes WHERE email = ? AND purpose = ?').bind(email, purpose).run();
    throw new Error('验证码已过期，请重新获取');
  }
  const used = await env.DB.prepare(
    'UPDATE email_codes SET attempts = attempts + 1 WHERE email = ? AND purpose = ? AND attempts < ? RETURNING attempts'
  ).bind(email, purpose, CODE_MAX_ATTEMPTS).first();
  if (!used) {
    await env.DB.prepare('DELETE FROM email_codes WHERE email = ? AND purpose = ?').bind(email, purpose).run();
    throw new Error('尝试次数过多，请重新获取验证码');
  }
  const hash = await hashCode(email, String(code || '').trim());
  if (hash !== row.code_hash) {
    const left = CODE_MAX_ATTEMPTS - Number(used.attempts);
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
