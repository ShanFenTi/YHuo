// PUT    /api/admin/media/:id → 改标题 { title } / 调整相册 { album } / 歌词 { lrc }（非空文本=保存 ≤200KB，''=移除）
// DELETE /api/admin/media/:id → 删除（连同 KV 里的文件）
import { json } from '../../../lib/util.js';
import { ensureSchema } from '../../../lib/migrate.js';

const MAX_LRC = 200 * 1024;

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
  if (body.title === undefined && body.album === undefined && body.lrc === undefined) {
    return json({ ok: false, error: '没有要修改的内容' }, 400);
  }

  const row = await env.DB.prepare('SELECT title, album FROM media WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: '条目不存在' }, 404);

  const title = body.title !== undefined ? String(body.title).trim().slice(0, 200) : row.title;
  if (!title) return json({ ok: false, error: '标题不能为空（200 字以内）' }, 400);
  const album = body.album !== undefined ? String(body.album).trim().slice(0, 50) : (row.album || '');
  // 歌词：传非空文本保存，传空串移除（置 NULL），不传保持原值
  const lrc = body.lrc !== undefined
    ? (String(body.lrc).trim() ? String(body.lrc).slice(0, MAX_LRC) : null)
    : undefined;

  const result = lrc === undefined
    ? await env.DB.prepare('UPDATE media SET title = ?, album = ? WHERE id = ?').bind(title, album, id).run()
    : await env.DB.prepare('UPDATE media SET title = ?, album = ?, lrc = ? WHERE id = ?').bind(title, album, lrc, id).run();
  if (!result.meta.changes) return json({ ok: false, error: '条目不存在' }, 404);
  return json({ ok: true, title, album, has_lrc: lrc === undefined ? undefined : !!lrc });
}

export async function onRequestDelete({ env, params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: '参数错误' }, 400);

  const row = await env.DB.prepare('SELECT r2_key, cover FROM media WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: '条目不存在' }, 404);

  await env.MEDIA.delete(row.r2_key);
  if (row.cover) await env.MEDIA.delete(row.cover); // 专辑封面一并清理
  await env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
