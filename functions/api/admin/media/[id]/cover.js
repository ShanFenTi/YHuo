// POST   /api/admin/media/:id/cover → 上传/替换专辑封面（multipart file；jpg/png/gif/webp/avif ≤2MB，存 KV covers/）
// DELETE /api/admin/media/:id/cover → 移除封面（删 KV 文件 + 置 NULL）
import { json } from '../../../../lib/util.js';
import { ensureSchema } from '../../../../lib/migrate.js';

const MAX_COVER = 2 * 1024 * 1024;

const EXT_MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
};

export async function onRequestPost({ request, env, params }) {
  await ensureSchema(env);
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: '参数错误' }, 400);

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
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : '';
  if (!EXT_MIME[ext]) return json({ ok: false, error: '封面必须是 jpg/png/gif/webp/avif 图片' }, 400);
  if (file.size > MAX_COVER) return json({ ok: false, error: '封面图片超过 2MB' }, 413);

  const row = await env.DB.prepare('SELECT cover FROM media WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: '条目不存在' }, 404);

  const key = `covers/m${id}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const mime = EXT_MIME[ext] || file.type || 'image/jpeg';
  await env.MEDIA.put(key, await file.arrayBuffer(), { metadata: { mime } });
  await env.DB.prepare('UPDATE media SET cover = ? WHERE id = ?').bind(key, id).run();
  if (row.cover && row.cover !== key) await env.MEDIA.delete(row.cover); // 换图删旧

  return json({ ok: true, cover: key });
}

export async function onRequestDelete({ env, params }) {
  await ensureSchema(env);
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: '参数错误' }, 400);

  const row = await env.DB.prepare('SELECT cover FROM media WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: '条目不存在' }, 404);
  if (row.cover) await env.MEDIA.delete(row.cover);
  await env.DB.prepare('UPDATE media SET cover = NULL WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
