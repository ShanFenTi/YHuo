// POST /api/visit → 访问计数（每个浏览器会话只在首页打开时调一次，客户端用 sessionStorage 去重）
// 总量存 site_settings.visits，按天明细存 visit_daily（北京时间），后台趋势图用；
// 同时记录一条访问明细（visit_logs：IP/页面/UA），概览页"最近访问"列表用
import { json } from '../lib/util.js';
import { ensureSchema } from '../lib/migrate.js';

export async function onRequestPost({ env, request }) {
  try {
    await ensureSchema(env);
    const day = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // 北京时间日期
    // IP：优先 Cloudflare 直连头，本地调试回退 x-forwarded-for
    let ip = request.headers.get('cf-connecting-ip') || '';
    if (!ip) {
      const fwd = request.headers.get('x-forwarded-for');
      if (fwd) ip = fwd.split(',')[0].trim();
    }
    const ua = (request.headers.get('user-agent') || '').slice(0, 200);
    let path = '';
    try {
      const body = await request.json();
      if (body && typeof body.path === 'string') path = body.path.slice(0, 200);
    } catch { /* 无 body 或非 JSON：path 留空 */ }
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO site_settings (key, value) VALUES ('visits', '1') ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)"
      ),
      env.DB.prepare(
        'INSERT INTO visit_daily (day, count) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET count = count + 1'
      ).bind(day),
      env.DB.prepare('INSERT INTO visit_logs (day, ip, path, ua) VALUES (?, ?, ?, ?)').bind(day, ip, path, ua),
    ]);
    const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'visits'").first();
    return json({ ok: true, visits: Number(row.value) }, 200, { 'Cache-Control': 'no-store' });
  } catch {
    // 统计失败不影响访问
    return json({ ok: false }, 200, { 'Cache-Control': 'no-store' });
  }
}