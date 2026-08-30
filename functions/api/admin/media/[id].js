// PUT    /api/admin/media/:id → 改标题 { title } / 调整相册 { album }
// DELETE /api/admin/media/:id → 删除（连同 KV 里的文件）
import { json } from '../../../lib/util.js';
import { ensureSchema } from '../../../lib/migrate.js';

export async function onRequestPut({ request, env, params }) {
  await ensureSchema(env);
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: '参数错误' }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  if (body.title === undefined && body.album === undefined) {
    return json({ ok: false, error: '没有要修改的内容' }, 400);
  }

  const row = await env.DB.prepare('SELECT title, album FROM media WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: '条目不存在' }, 404);

  const title = body.title !== undefined ? String(body.title).trim().slice(0, 200) : row.title;
  if (!title) return json({ ok: false, error: '标题不能为空（200 字以内）' }, 400);
  const album = body.album !== undefined ? String(body.album).trim().slice(0, 50) : (row.album || '');

  const result = await env.DB.prepare('UPDATE media SET title = ?, album = ? WHERE id = ?').bind(title, album, id).run();
  if (!result.meta.changes) return json({ ok: false, error: '条目不存在' }, 404);
  return json({ ok: true, title, album });
}

export async function onRequestDelete({ env, params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: '参数错误' }, 400);

  const row = await env.DB.prepare('SELECT r2_key FROM media WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: '条目不存在' }, 404);

  await env.MEDIA.delete(row.r2_key);
  await env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
