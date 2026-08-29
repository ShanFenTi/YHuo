// PUT    /api/admin/media/:id → 改标题 { title }
// DELETE /api/admin/media/:id → 删除（连同 R2 里的文件）
import { json } from '../../../lib/util.js';

export async function onRequestPut({ request, env, params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: '参数错误' }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const title = String(body.title || '').trim();
  if (!title || title.length > 200) return json({ ok: false, error: '标题不能为空（200 字以内）' }, 400);

  const result = await env.DB.prepare('UPDATE media SET title = ? WHERE id = ?').bind(title, id).run();
  if (!result.meta.changes) return json({ ok: false, error: '条目不存在' }, 404);
  return json({ ok: true });
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
