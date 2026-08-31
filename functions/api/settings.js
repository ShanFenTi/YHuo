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
    // 邮箱功能是否启用（找回密码/2FA 的 UI 开关）+ 注册是否要求邮箱验证
    // emailRegister = 启用且非"仅站长模式"（仅站长模式下普通用户注册不要求邮箱）
    let emailEnabled = false;
    let emailRegister = false;
    try {
      const c = JSON.parse(map.email_config || 'null');
      emailEnabled = !!(c && c.enabled && c.api_key && c.from);
      emailRegister = emailEnabled && !c.admin_only;
    } catch {}
    return json({
      ok: true,
      accent: map.accent || null,
      background: map.bg ? '/media/' + map.bg : null,
      quotes,
      quote: quotes[0] || null, // 兼容字段：第一条
      blur: map.bg_blur !== undefined && map.bg_blur !== null ? parseInt(map.bg_blur, 10) || 0 : null,
      emailEnabled,
      emailRegister,
    }, 200, { 'Cache-Control': 'public, max-age=60' });
  } catch {
    return json({ ok: true, accent: null, background: null, quotes: [], quote: null, blur: null, emailEnabled: false, emailRegister: false }, 200, { 'Cache-Control': 'no-store' });
  }
}
