// GET /api/admin/visits → 总访问量（后台统计卡用）
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'visits'").first();
  return json({ ok: true, visits: row ? Number(row.value) : 0 });
}
