// GET    /api/admin/me → 管理员资料 { ok, username, created_at, avatar }（avatar 为 KV 键或 null）
// POST   /api/admin/me → 上传管理员头像（multipart file 字段；JPG/PNG/GIF/WebP；≤2MB）
//                        KV 键 avatars/admin-{随机hex}.{ext}，键名存 site_settings 'admin_avatar'，换图自动删旧
// DELETE /api/admin/me → 移除头像（删 KV 文件 + 清设置）
// 头像读取走既有路由 GET /media/{key}（键名含随机 hex，换图不串缓存）；本接口全部经 /api/admin/* 会话门卫
import { json } from '../../lib/util.js';
import { randomHex } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

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

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const u = await env.DB.prepare('SELECT username, created_at FROM admin_users ORDER BY id LIMIT 1').first();
  return json({ ok: true, username: u ? u.username : '', created_at: u ? u.created_at : null, avatar: await getAvatarKey(env) });
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
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
