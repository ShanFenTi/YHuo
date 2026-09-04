// GET /api/admin/email/usage → 邮件发送量统计（概览页"邮件统计"卡片）
// 返回：总量、今日、近 14/30 天的发送数，按用途排行，近 14 天按天序列（趋势迷你图用）
import { json } from '../../../lib/util.js';
import { ensureSchema } from '../../../lib/migrate.js';

function dayNAgo(n) {
  return new Date(Date.now() + 8 * 3600 * 1000 - n * 86400000).toISOString().slice(0, 10);
}

export async function onRequestGet({ env }) {
  try {
    await ensureSchema(env);
    const today = dayNAgo(0);
    const d14 = dayNAgo(13);
    const d30 = dayNAgo(29);

    const [totalRow, todayRow, d14Row, d30Row, byKind, days14] = await Promise.all([
      env.DB.prepare('SELECT COALESCE(SUM(count),0) AS c FROM email_usage_daily').first(),
      env.DB.prepare('SELECT COALESCE(SUM(count),0) AS c FROM email_usage_daily WHERE day = ?').bind(today).first(),
      env.DB.prepare('SELECT COALESCE(SUM(count),0) AS c FROM email_usage_daily WHERE day >= ?').bind(d14).first(),
      env.DB.prepare('SELECT COALESCE(SUM(count),0) AS c FROM email_usage_daily WHERE day >= ?').bind(d30).first(),
      env.DB.prepare('SELECT kind, SUM(count) AS c FROM email_usage_daily GROUP BY kind ORDER BY c DESC').all(),
      env.DB.prepare('SELECT day, SUM(count) AS c FROM email_usage_daily WHERE day >= ? GROUP BY day').bind(d14).all(),
    ]);

    // 近 14 天按天（补 0）
    const byDay = {};
    (days14.results || []).forEach((r) => { byDay[r.day] = r.c || 0; });
    const trend = [];
    for (let i = 13; i >= 0; i--) {
      const d = dayNAgo(i);
      trend.push({ day: d, count: byDay[d] || 0 });
    }

    return json({
      ok: true,
      total: totalRow ? totalRow.c : 0,
      today: todayRow ? todayRow.c : 0,
      d14: d14Row ? d14Row.c : 0,
      d30: d30Row ? d30Row.c : 0,
      byKind: (byKind.results || []).map(r => ({ kind: r.kind, count: r.c || 0 })),
      d14days: trend,
    });
  } catch (e) {
    return json({ ok: false, error: '读取邮件统计失败' }, 500);
  }
}
