// GET /api/notes → 随笔清单（公开，后台「随笔」页维护，存 D1 notes 表）
// 返回 { ok, list:[{id, date, mood, text}] }，按日期倒序（前台按年份分组渲染）。
// 前台 /notes/ 页数据源：本接口失败或空库时回落 /notes/notes.json 静态清单（common.js 处理）。
import { json } from '../lib/util.js';
import { ensureSchema } from '../lib/migrate.js';

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const res = await env.DB.prepare(
    'SELECT id, date, mood, text FROM notes ORDER BY date DESC, id DESC'
  ).all();
  return json({ ok: true, list: res.results || [] });
}
