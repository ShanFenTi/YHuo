// GET    /api/admin/me → 管理员资料 { ok, username, created_at, avatar, email, emailEnabled, twoFa, sessions:[{current,ip,ua,created_at}], logins:[{ok,ip,ua,note,created_at}] }（avatar 为 KV 键或 null）
// POST   /api/admin/me → 两种用法：
//          multipart（file 字段）→ 上传管理员头像（JPG/PNG/GIF/WebP；≤2MB；KV 键 avatars/admin-{hex}.{ext}，键名存 site_settings 'admin_avatar'，换图删旧）
//          JSON {action:'email-send', email} → 给管理员邮箱发绑定验证码
//          JSON {action:'email-verify', email, code} → 验证并保存管理员邮箱（存 site_settings 'admin_email'）
//          JSON {action:'email-remove'} → 解绑邮箱
//          JSON {action:'password', oldPassword, newPassword} → 修改管理员密码（限速 scope=pwd；成功后踢掉其他设备）
//          JSON {action:'sessions-revoke-others'} → 吊销除当前外的全部管理员会话
//          JSON {action:'2fa', enabled} → 登录二次验证开关（存 site_settings 'admin_2fa'；开启前提是已绑邮箱）
// PUT    /api/admin/me → JSON {action} 同上（formData 与 json 两种 POST 都兼容，PUT 保留给 JSON）
// DELETE /api/admin/me → 移除头像（删 KV 文件 + 清设置）
// 头像读取走既有路由 GET /media/{key}（键名含随机 hex，换图不串缓存）；本接口全部经 /api/admin/* 会话门卫
import { json, getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { randomHex, verifyPassword, hashPassword, loginKey, loginLockedFor, recordLoginFail, clearLoginFails } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';
import { getEmailConfig, isEmailAddr, issueCode, verifyCode } from '../../lib/email.js';

const MAX_SIZE = 2 * 1024 * 1024;
const EXT_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

async function getAvatarKey(env) {
  const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'admin_avatar'").first();
  return row ? row.value : null;
}

async function getAdminEmail(env) {
  const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'admin_email'").first();
  return row ? row.value : null;
}

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  const u = await env.DB.prepare('SELECT username, created_at FROM admin_users ORDER BY id LIMIT 1').first();
  const cfg = await getEmailConfig(env);
  const current = getCookie(request, SESSION_COOKIE);
  // 有效会话（登录设备）列表：标记哪个是当前设备，不回传原始 token
  const sessRes = await env.DB
    .prepare('SELECT token, ip, ua, created_at, expires_at FROM sessions WHERE expires_at >= ? ORDER BY created_at DESC')
    .bind(new Date().toISOString())
    .all();
  const sessions = (sessRes.results || []).map(function (s) {
    return { current: s.token === current, ip: s.ip || '', ua: s.ua || '', created_at: s.created_at };
  });
  // 最近登录记录（成功+失败，最新在前）
  const logRes = await env.DB
    .prepare('SELECT ok, ip, ua, note, created_at FROM admin_login_logs ORDER BY id DESC LIMIT 10')
    .all();
  const t2 = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'admin_2fa'").first();
  return json({
    ok: true,
    username: u ? u.username : '',
    created_at: u ? u.created_at : null,
    avatar: await getAvatarKey(env),
    email: await getAdminEmail(env),
    emailEnabled: cfg.enabled,
    twoFa: !!(t2 && t2.value === '1'),
    sessions,
    logins: logRes.results || [],
  });
}

// JSON 分支；供 POST(非 multipart) 与 PUT 共用
// 邮箱类 action（email-send/email-verify/email-remove）要求邮件服务已启用；
// 安全类 action（password/sessions-revoke-others/2fa）不依赖邮件服务（2fa 开启前提是已绑邮箱）
async function handleEmailAction(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const action = String(body.action || '');

  // ---- 修改管理员密码：验证旧密码（限速复用登录限速 scope=pwd），成功后踢掉其他设备 ----
  if (action === 'password') {
    const oldP = String(body.oldPassword || '');
    const newP = String(body.newPassword || '');
    if (!oldP) return json({ ok: false, error: '请输入当前密码' }, 400);
    if (newP.length < 6 || newP.length > 100) return json({ ok: false, error: '新密码需 6-100 位' }, 400);
    const u = await env.DB.prepare('SELECT id, username, password_hash, salt FROM admin_users ORDER BY id LIMIT 1').first();
    if (!u) return json({ ok: false, error: '管理员账号不存在' }, 404);
    const key = loginKey(request, 'pwd', u.username);
    const lockedMin = await loginLockedFor(env, key);
    if (lockedMin > 0) return json({ ok: false, error: '尝试次数过多已锁定，请约 ' + lockedMin + ' 分钟后再试' }, 429);
    if (!(await verifyPassword(oldP, u.salt, u.password_hash))) {
      await recordLoginFail(env, key);
      return json({ ok: false, error: '当前密码错误' }, 401);
    }
    await clearLoginFails(env, key);
    const salt = randomHex(32);
    const hash = await hashPassword(newP, salt);
    const current = getCookie(request, SESSION_COOKIE);
    await env.DB.batch([
      env.DB.prepare('UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?').bind(hash, salt, u.id),
      current
        ? env.DB.prepare('DELETE FROM sessions WHERE token <> ?').bind(current)
        : env.DB.prepare('DELETE FROM sessions'),
    ]);
    return json({ ok: true });
  }

  // ---- 退出其他设备：吊销除当前会话外的全部管理员会话 ----
  if (action === 'sessions-revoke-others') {
    const current = getCookie(request, SESSION_COOKIE);
    if (!current) return json({ ok: false, error: '未识别到当前会话' }, 401);
    const r = await env.DB.prepare('DELETE FROM sessions WHERE token <> ?').bind(current).run();
    return json({ ok: true, revoked: (r.meta && r.meta.changes) || 0 });
  }

  // ---- 登录二次验证开关（开 2FA 前提：已绑管理员邮箱且邮件服务已启用——
  //      否则邮件链路一断管理员会被锁在门外；若已在开启状态下邮件服务挂掉，只能直接改库解锁） ----
  if (action === '2fa') {
    const enable = !!body.enabled;
    if (enable) {
      const cfg2 = await getEmailConfig(env);
      if (!cfg2.enabled) return json({ ok: false, error: '请先在「邮件」页启用邮件服务（否则邮件链路故障时会被锁在门外）' }, 400);
      const adminEmail = await getAdminEmail(env);
      if (!adminEmail) return json({ ok: false, error: '请先绑定管理员邮箱' }, 400);
      await env.DB
        .prepare("INSERT INTO site_settings (key, value) VALUES ('admin_2fa', '1') ON CONFLICT(key) DO UPDATE SET value = '1'")
        .run();
    } else {
      await env.DB.prepare("DELETE FROM site_settings WHERE key = 'admin_2fa'").run();
    }
    return json({ ok: true, twoFa: enable });
  }

  const cfg = await getEmailConfig(env);
  if (!cfg.enabled) return json({ ok: false, error: '邮件服务未启用，请先在「邮件」页配置' }, 503);

  if (action === 'email-send') {
    const email = String(body.email || '').trim().toLowerCase();
    if (!isEmailAddr(email)) return json({ ok: false, error: '邮箱格式不正确' }, 400);
    try {
      await issueCode(env, email, 'admin-bind');
    } catch (e) {
      return json({ ok: false, error: (e && e.message) || '发送失败' }, 429);
    }
    return json({ ok: true });
  }
  if (action === 'email-verify') {
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    if (!isEmailAddr(email)) return json({ ok: false, error: '邮箱格式不正确' }, 400);
    try {
      await verifyCode(env, email, 'admin-bind', code);
    } catch (e) {
      return json({ ok: false, error: (e && e.message) || '验证失败' }, 400);
    }
    await env.DB
      .prepare("INSERT INTO site_settings (key, value) VALUES ('admin_email', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(email)
      .run();
    return json({ ok: true, email });
  }
  if (action === 'email-remove') {
    await env.DB.prepare("DELETE FROM site_settings WHERE key = 'admin_email'").run();
    return json({ ok: true });
  }
  return json({ ok: false, error: '未知操作' }, 400);
}

export async function onRequestPut({ request, env }) {
  await ensureSchema(env);
  return handleEmailAction(request, env);
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  // JSON 请求 = 邮箱操作；multipart = 头像上传
  const ct = String(request.headers.get('content-type') || '');
  if (ct.indexOf('application/json') > -1) return handleEmailAction(request, env);
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ ok: false, error: '没有收到图片' }, 400);

  const name = file.name || '';
  const dot = name.lastIndexOf('.');
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : '';
  if (!EXT_MIME[ext]) return json({ ok: false, error: '仅支持 JPG/PNG/GIF/WebP 图片' }, 400);
  if (file.size > MAX_SIZE) return json({ ok: false, error: '头像图片不能超过 2MB' }, 413);

  const key = 'avatars/admin-' + randomHex(8) + '.' + ext;
  await env.MEDIA.put(key, await file.arrayBuffer(), { metadata: { mime: EXT_MIME[ext] } });

  const old = await getAvatarKey(env);
  if (old) await env.MEDIA.delete(old); // 换图自动删旧文件，省 KV 空间
  await env.DB
    .prepare("INSERT INTO site_settings (key, value) VALUES ('admin_avatar', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(key)
    .run();
  return json({ ok: true, avatar: key });
}

export async function onRequestDelete({ env }) {
  await ensureSchema(env);
  const old = await getAvatarKey(env);
  if (old) await env.MEDIA.delete(old);
  await env.DB.prepare("DELETE FROM site_settings WHERE key = 'admin_avatar'").run();
  return json({ ok: true });
}
