// GET    /api/admin/me → 管理员资料 { ok, username, created_at, avatar, email, emailEnabled }（avatar 为 KV 键或 null）
// POST   /api/admin/me → 两种用法：
//          multipart（file 字段）→ 上传管理员头像（JPG/PNG/GIF/WebP；≤2MB；KV 键 avatars/admin-{hex}.{ext}，键名存 site_settings 'admin_avatar'，换图删旧）
//          JSON {action:'email-send', email} → 给管理员邮箱发绑定验证码
//          JSON {action:'email-verify', email, code} → 验证并保存管理员邮箱（存 site_settings 'admin_email'）
//          JSON {action:'email-remove'} → 解绑邮箱
// PUT    /api/admin/me → JSON {action} 同上（formData 与 json 两种 POST 都兼容，PUT 保留给 JSON）
// DELETE /api/admin/me → 移除头像（删 KV 文件 + 清设置）
// 头像读取走既有路由 GET /media/{key}（键名含随机 hex，换图不串缓存）；本接口全部经 /api/admin/* 会话门卫
import { json } from '../../lib/util.js';
import { randomHex } from '../../lib/auth.js';
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

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const u = await env.DB.prepare('SELECT username, created_at FROM admin_users ORDER BY id LIMIT 1').first();
  const cfg = await getEmailConfig(env);
  return json({
    ok: true,
    username: u ? u.username : '',
    created_at: u ? u.created_at : null,
    avatar: await getAvatarKey(env),
    email: await getAdminEmail(env),
    emailEnabled: cfg.enabled,
  });
}

// JSON 分支（绑定/解绑邮箱）；供 POST(非 multipart) 与 PUT 共用
async function handleEmailAction(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const action = String(body.action || '');
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
