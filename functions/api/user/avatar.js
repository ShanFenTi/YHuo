// POST   /api/user/avatar → 上传头像（multipart file 字段；JPG/PNG/GIF/WebP；≤2MB）
//                          KV 键 avatars/u{userId}-{随机hex}.{ext}，换图自动删旧文件
// DELETE /api/user/avatar → 删除 KV 文件 + 清 avatar_key 列
// 头像读取走既有路由 GET /media/{key}（键名含随机 hex，换图不串缓存）
import { json, getCookie } from '../../lib/util.js';
import { getUserSession, USER_COOKIE, randomHex } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

const MAX_SIZE = 2 * 1024 * 1024;
const EXT_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

async function currentUser(request, env) {
  await ensureSchema(env);
  return getUserSession(env, getCookie(request, USER_COOKIE));
}

async function deleteOldAvatar(env, userId) {
  const row = await env.DB.prepare('SELECT avatar_key FROM users WHERE id = ?').bind(userId).first();
  if (row && row.avatar_key) await env.MEDIA.delete(row.avatar_key);
}

export async function onRequestPost({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: '请先登录' }, 401);

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

  const key = 'avatars/u' + user.userId + '-' + randomHex(8) + '.' + ext;
  await env.MEDIA.put(key, await file.arrayBuffer(), { metadata: { mime: EXT_MIME[ext] } });

  await deleteOldAvatar(env, user.userId); // 换图自动删旧文件，省 KV 空间
  await env.DB.prepare('UPDATE users SET avatar_key = ? WHERE id = ?').bind(key, user.userId).run();
  return json({ ok: true, avatar: key });
}

export async function onRequestDelete({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: '请先登录' }, 401);

  await deleteOldAvatar(env, user.userId);
  await env.DB.prepare('UPDATE users SET avatar_key = NULL WHERE id = ?').bind(user.userId).run();
  return json({ ok: true });
}
