// GET  /api/admin/media            → 全部媒体清单（按类型分组；albums=相册名单，见下）
// POST /api/admin/media            → 调整顺序 { type, ids: [id1, id2, ...] }
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

const TYPES = ['music', 'video', 'image'];

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const { results } = await env.DB
    .prepare('SELECT id, type, title, r2_key, mime, size, sort_order, album, created_at, (lrc IS NOT NULL) AS has_lrc, (cover IS NOT NULL) AS has_cover FROM media ORDER BY type, sort_order, id')
    .all();
  const items = { music: [], video: [], image: [] };
  for (const r of results) {
    if (items[r.type]) items[r.type].push(r);
  }
  // 相册名单（含空相册）：albums 表是本体，前端与 media.album 派生名取并集展示
  const { results: albumRows } = await env.DB
    .prepare('SELECT name FROM albums ORDER BY sort_order, name')
    .all();
  return json({ ok: true, items, albums: albumRows.map((r) => r.name) });
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
