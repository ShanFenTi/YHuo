// GET  /api/admin/media            → 全部媒体清单（按类型分组）
// POST /api/admin/media            → 调整顺序 { type, ids: [id1, id2, ...] }
import { json } from '../../lib/util.js';

const TYPES = ['music', 'video', 'image'];

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare('SELECT id, type, title, r2_key, mime, size, sort_order, album, created_at FROM media ORDER BY type, sort_order, id')
    .all();
  const items = { music: [], video: [], image: [] };
  for (const r of results) {
    if (items[r.type]) items[r.type].push(r);
  }
  return json({ ok: true, items });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const type = String(body.type || '');
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isInteger) : [];
  if (!TYPES.includes(type) || !ids.length) return json({ ok: false, error: '参数错误' }, 400);

  // 整批按传入顺序重排 sort_order
  const stmts = ids.map((id, i) =>
    env.DB.prepare('UPDATE media SET sort_order = ? WHERE id = ? AND type = ?').bind(i + 1, id, type)
  );
  await env.DB.batch(stmts);
  return json({ ok: true });
}
