// POST /api/visit → 访问计数（每个浏览器会话只在首页打开时调一次，客户端用 sessionStorage 去重）
// 总量存 site_settings.visits，按天明细存 visit_daily（北京时间），后台趋势图用。
// 不记录 IP/UA/访问明细（IP 记录功能已于 2026-09-06 整体移除）；
// 2026-09-30 起 IP 分钟桶限速（复用 login_throttle）：服务端此前无节流，脚本可无限刷总量/趋势图
import { json } from '../lib/util.js';
import { ensureSchema } from '../lib/migrate.js';

const VISIT_IP_MIN_LIMIT = 30;

export async function onRequestPost({ request, env }) {
  try {
    await ensureSchema(env);
    const now = Date.now();
    const ip = (request.headers && request.headers.get('CF-Connecting-IP')) || 'unknown';
    const used = await env.DB.prepare(
      'INSERT INTO login_throttle (key, fails, last_fail) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET fails = fails + 1, last_fail = excluded.last_fail RETURNING fails'
    ).bind('visitip:' + ip + ':' + Math.floor(now / 60000), new Date(now).toISOString()).first();
    // 超限静默丢弃：仍回 ok（前端零感知），但不再计数——刷量脚本拿不到任何可判定的反馈
    if (used && Number(used.fails) > VISIT_IP_MIN_LIMIT) {
      return json({ ok: true }, 200, { 'Cache-Control': 'no-store' });
    }
    if (Math.random() < 0.05) {
      // 与 messages.js 同款顺手清理（visitip 也是时间桶键，不会像登录键那样被清掉）
      try {
        await env.DB.prepare(
          "DELETE FROM login_throttle WHERE last_fail < ? AND (key LIKE 'guestip:%' OR key LIKE 'emailcode:%' OR key LIKE 'aiusage:%' OR key LIKE 'visitip:%')"
        ).bind(new Date(now - 2 * 3600 * 1000).toISOString()).run();
      } catch (e) {}
    }
    const day = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // 北京时间日期
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO site_settings (key, value) VALUES ('visits', '1') ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)"
      ),
      env.DB.prepare(
        'INSERT INTO visit_daily (day, count) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET count = count + 1'
      ).bind(day),
    ]);
    const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'visits'").first();
    return json({ ok: true, visits: Number(row.value) }, 200, { 'Cache-Control': 'no-store' });
  } catch {
    // 统计失败不影响访问
    return json({ ok: false }, 200, { 'Cache-Control': 'no-store' });
  }
}
