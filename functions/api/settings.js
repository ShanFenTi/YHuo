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
    // 首页视频播放模式：{mode:'seq'|'single'|'random', url}（前台首页视频轮播用）
    let videoMode = { mode: 'seq', url: '' };
    try {
      const vm = JSON.parse(map.video_mode || 'null');
      if (vm && typeof vm === 'object') {
        videoMode = {
          mode: vm.mode === 'single' ? 'single' : (vm.mode === 'random' ? 'random' : 'seq'),
          url: String(vm.url || ''),
        };
      }
    } catch {}
    // 功能开关：tools/docs/misc 顶栏界面 + weather/lyric/video 首页模块（缺省全开；
    // 关掉的界面前台直接隐藏，ai 跟随 ai_enabled 不在此列；album 相册界面已移除，旧库存量键忽略）
    const flags = { tools: true, docs: true, misc: true, weather: true, lyric: true, video: true };
    try {
      const f = JSON.parse(map.feature_flags || 'null');
      if (f && typeof f === 'object' && !Array.isArray(f)) {
        for (const k of Object.keys(flags)) if (f[k] === false) flags[k] = false;
      }
    } catch {}
    // 底部播放器样式：mini=迷你播放条（默认）/ blog=悬浮播放器（两种款式共用站内曲库）
    let playerMode = 'mini';
    try {
      const pc = JSON.parse(map.player_config || 'null');
      if (pc && typeof pc === 'object' && pc.mode === 'blog') playerMode = 'blog';
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
      videoMode,
      playerMode,
      flags,
    }, 200, { 'Cache-Control': 'public, max-age=60' });
  } catch {
    const flags = { tools: true, docs: true, misc: true, weather: true, lyric: true, video: true };
    return json({ ok: true, accent: null, background: null, quotes: [], quote: null, blur: null, emailEnabled: false, emailRegister: false, playerMode: 'mini', flags }, 200, { 'Cache-Control': 'no-store' });
  }
}
