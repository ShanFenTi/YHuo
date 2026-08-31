// GET /api/settings → 站点默认外观（管理员在后台配置）
// 数据库不可用时按"未设置"处理，前端走自带默认值
import { json } from '../lib/util.js';
import { ensureSchema } from '../lib/migrate.js';

export async function onRequestGet({ env }) {
  try {
    await ensureSchema(env);
    const { results } = await env.DB.prepare('SELECT key, value FROM site_settings').all();
    const map = {};
    for (const r of results) map[r.key] = r.value;
    // 寄语多条：新 quotes（JSON 数组）优先，旧单条 quote 兜底并入
    let quotes = [];
    try { quotes = JSON.parse(map.quotes || '[]'); } catch {}
    if (!Array.isArray(quotes)) quotes = [];
    quotes = quotes.filter((q) => typeof q === 'string' && q.trim()).map((q) => q.trim());
    if (!quotes.length && map.quote) quotes = [map.quote];
    return json({
      ok: true,
      accent: map.accent || null,
      background: map.bg ? '/media/' + map.bg : null,
      quotes,
      quote: quotes[0] || null, // 兼容字段：第一条
      blur: map.bg_blur !== undefined && map.bg_blur !== null ? parseInt(map.bg_blur, 10) || 0 : null,
    }, 200, { 'Cache-Control': 'public, max-age=60' });
  } catch {
    return json({ ok: true, accent: null, background: null, quotes: [], quote: null, blur: null }, 200, { 'Cache-Control': 'no-store' });
  }
}
