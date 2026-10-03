// GET /api/notes → 随笔清单（公开，后台「随笔」页维护，存 D1 notes 表）
// 返回 { ok, list:[{id, date, mood, text, title, tags, summary, views}] }，按日期倒序（前台按年份分组渲染）。
// 2026-10-02 起草稿不下发（draft=1 只在后台可见）；title/tags/summary/views 为后台随笔文章化新字段，
// 老数据全为空/0，前台对空标题回落日期、空标签不渲染——行为与改版前一致。
// 前台 /notes/ 页数据源：本接口失败或空库时回落 /notes/notes.json 静态清单（common.js 处理）。
// 2026-10-03 起 notes.json 在首次访问时由 seedStaticNotes 一次性转正为真实行（自动种子，
// 详见 lib/notesSeed.js）——正常情况下不再存在「静态 vs 数据库」两套形态，回落仅兜底。
import { json } from '../lib/util.js';
import { ensureSchema } from '../lib/migrate.js';
import { seedStaticNotes } from '../lib/notesSeed.js';

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  await seedStaticNotes(env, request); // 首访一次性把静态清单转正为真实行（旗标防重跑，幂等）
  const res = await env.DB.prepare(
    'SELECT id, date, mood, text, title, tags, summary, views FROM notes WHERE draft = 0 ORDER BY date DESC, id DESC LIMIT 1000'
  ).all();
  // 上限 1000：前台时间线按设计展示全部，个人站量级远够；防接口被当全量导出口子线性放大
  return json({ ok: true, list: res.results || [] });
}
