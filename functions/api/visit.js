// POST /api/visit → 访问计数（每个浏览器会话只在首页打开时调一次，客户端用 sessionStorage 去重）
import { json } from '../lib/util.js';
import { ensureSchema } from '../lib/migrate.js';

export async function onRequestPost({ env }) {
  try {
    await ensureSchema(env);
    await env.DB
      .prepare("INSERT INTO site_settings (key, value) VALUES ('visits', '1') ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)")
      .run();
    const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'visits'").first();
    return json({ ok: true, visits: Number(row.value) }, 200, { 'Cache-Control': 'no-store' });
  } catch {
    // 统计失败不影响访问
    return json({ ok: false }, 200, { 'Cache-Control': 'no-store' });
  }
}
