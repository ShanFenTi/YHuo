// GET    /api/admin/notes → 全部随笔（含 created_at，管理列表用）
// POST   /api/admin/notes → action 分发（与 albums.js 同款动作式）：
//   { action: 'create', mood?, text }                新增一条（日期服务端自动取北京时间当天——随笔即当日随手记，表单不设日期项）
//   { action: 'update', id, mood?, text }            改一条（日期保持创建时的不变，只改天气/时段与正文）
//   { action: 'delete', id }                         删一条
//   { action: 'import', list: [{date, mood, text}] } 静态清单批量导入（date+text 全同的跳过；导入保留清单里的原日期，用于搬存量）
// 校验：mood ≤12 字、text 1~2000 字（导入项另校验 date YYYY-MM-DD）；date 只存不解析（显示/分组都在前台）。
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function beijingDay() {
  // Workers 跑 UTC，随笔日期按北京时间计天（与 visit_daily/checkins 同口径）
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function cleanBody(body) {
  const mood = String(body.mood || '').trim().slice(0, 12);
  const text = String(body.text || '').trim();
  if (!text) return { error: '正文不能为空' };
  if (text.length > 2000) return { error: '正文最长 2000 字（当前 ' + text.length + ' 字）' };
  return { mood, text };
}

function cleanImportItem(item) {
  const date = String(item.date || '').trim();
  const mood = String(item.mood || '').trim().slice(0, 12);
  const text = String(item.text || '').trim();
  if (!DATE_RE.test(date)) return { error: '日期格式应为 YYYY-MM-DD' };
  if (!text) return { error: '正文不能为空' };
  if (text.length > 2000) return { error: '正文最长 2000 字' };
  return { date, mood, text };
}

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const res = await env.DB.prepare(
    'SELECT id, date, mood, text, created_at FROM notes ORDER BY date DESC, id DESC'
  ).all();
  return json({ ok: true, list: res.results || [] });
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const action = String(body.action || '');

  if (action === 'create') {
    const n = cleanBody(body);
    if (n.error) return json({ ok: false, error: n.error }, 400);
    const res = await env.DB.prepare('INSERT INTO notes (date, mood, text) VALUES (?, ?, ?)')
      .bind(beijingDay(), n.mood, n.text).run();
    return json({ ok: true, id: res.meta ? res.meta.last_row_id : 0 });
  }

  if (action === 'update') {
    const id = parseInt(body.id, 10) || 0;
    if (!id) return json({ ok: false, error: '参数错误' }, 400);
    const n = cleanBody(body);
    if (n.error) return json({ ok: false, error: n.error }, 400);
    const exists = await env.DB.prepare('SELECT 1 FROM notes WHERE id = ?').bind(id).first();
    if (!exists) return json({ ok: false, error: '这条随笔已不存在（可能已被删除），刷新后重试' }, 404);
    // 日期不参与更新：随笔日期 = 创建当天，编辑只改天气/时段与正文
    await env.DB.prepare('UPDATE notes SET mood = ?, text = ? WHERE id = ?')
      .bind(n.mood, n.text, id).run();
    return json({ ok: true });
  }

  if (action === 'delete') {
    const id = parseInt(body.id, 10) || 0;
    if (!id) return json({ ok: false, error: '参数错误' }, 400);
    await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  if (action === 'import') {
    const list = Array.isArray(body.list) ? body.list : [];
    if (!list.length) return json({ ok: false, error: '清单里没有可导入的随笔' }, 400);
    const stmts = [];
    const seen = new Set();
    let skipped = 0;
    // 先查库里已有的 date+text 组合（连同本批内的重复一起去重）
    const existing = await env.DB.prepare("SELECT date || '|' || text AS k FROM notes").all();
    (existing.results || []).forEach((r) => seen.add(r.k));
    for (const item of list) {
      const n = cleanImportItem(item);
      if (n.error) { skipped++; continue; }
      const key = n.date + '|' + n.text;
      if (seen.has(key)) { skipped++; continue; }
      seen.add(key);
      stmts.push(env.DB.prepare('INSERT INTO notes (date, mood, text) VALUES (?, ?, ?)')
        .bind(n.date, n.mood, n.text));
    }
    if (stmts.length) await env.DB.batch(stmts);
    return json({ ok: true, imported: stmts.length, skipped });
  }

  return json({ ok: false, error: '未知操作' }, 400);
}
