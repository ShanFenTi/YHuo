// POST   /api/admin/appearance/background → 上传默认背景图（multipart，字段 file）
// DELETE /api/admin/appearance/background → 清除默认背景图
import { json } from '../../../lib/util.js';
import { ensureSchema } from '../../../lib/migrate.js';

const MAX_SIZE = 24 * 1024 * 1024;
const EXT_MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif', bmp: 'image/bmp',
};

async function getSetting(env, key) {
  const row = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?').bind(key).first();
  return row ? row.value : null;
}

async function setSetting(env, key, value) {
  await env.DB
    .prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, value)
    .run();
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_SIZE) return json({ ok: false, error: '文件超过 24MB 上限' }, 413);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ ok: false, error: '没有收到文件' }, 400);

  const name = file.name || '';
  const dot = name.lastIndexOf('.');
  const ext = (dot > -1 ? name.slice(dot + 1) : '').toLowerCase();
  if (!ext || !EXT_MIME[ext]) return json({ ok: false, error: '仅支持图片文件' }, 400);
  if (file.size > MAX_SIZE) return json({ ok: false, error: '文件超过 24MB 上限' }, 413);

  const key = 'bg/' + crypto.randomUUID() + '.' + ext;
  await env.MEDIA.put(key, await file.arrayBuffer(), { metadata: { mime: EXT_MIME[ext] } });

  // 换图后删掉旧背景文件，不占存储
  const old = await getSetting(env, 'bg');
  if (old && old !== key) await env.MEDIA.delete(old);

  await setSetting(env, 'bg', key);
  return json({ ok: true, bg: key });
}

export async function onRequestDelete({ env }) {
  await ensureSchema(env);
  const old = await getSetting(env, 'bg');
  if (old) {
    await env.MEDIA.delete(old);
    await env.DB.prepare('DELETE FROM site_settings WHERE key = ?').bind('bg').run();
  }
  return json({ ok: true });
}
