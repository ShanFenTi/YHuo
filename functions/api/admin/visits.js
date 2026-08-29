// GET /api/admin/visits → 总访问量 + 今日/昨日 + 近 30 天按天明细（后台趋势图用）
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const now = Date.now() + 8 * 3600 * 1000; // 北京时间
  const dayStr = (offsetDays) => new Date(now - offsetDays * 86400000).toISOString().slice(0, 10);
  const today = dayStr(0);
  const start = dayStr(29); // 近 30 天窗口

  const [totalRow, daily] = await Promise.all([
    env.DB.prepare("SELECT value FROM site_settings WHERE key = 'visits'").first(),
    env.DB.prepare('SELECT day, count FROM visit_daily WHERE day >= ? ORDER BY day').bind(start).all(),
  ]);

  const byDay = {};
  for (const r of daily.results) byDay[r.day] = r.count;

  return json({
    ok: true,
    visits: totalRow ? Number(totalRow.value) : 0,
    today: byDay[today] || 0,
    yesterday: byDay[dayStr(1)] || 0,
    daily: daily.results,
  });
}
