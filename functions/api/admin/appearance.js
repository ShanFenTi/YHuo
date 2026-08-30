// GET /api/admin/appearance → 当前站点默认外观（accent/bg/quote/blur）
// PUT  /api/admin/appearance { accent } | { quote } | { blur } → 分字段设置（哪个字段在就处理哪个）
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

const ACCENTS = ['blue', 'purple', 'pink', 'green', 'orange'];

async function getSetting(env, key) {
  const row = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?').bind(key).first();
  return row ? row.value : null;
}

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const accent = await getSetting(env, 'accent');
  const bg = await getSetting(env, 'bg');
  const quote = await getSetting(env, 'quote');
  const blur = await getSetting(env, 'bg_blur');
  return json({ ok: true, accent: accent || null, bg: bg || null, quote: quote || null, blur: blur === null ? null : parseInt(blur, 10) || 0 });
}

export async function onRequestPut({ request, env }) {
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  // 默认背景模糊：0 = 清除设置（恢复默认不模糊）
  if (body.blur !== undefined) {
    const blur = parseInt(body.blur, 10);
    if (isNaN(blur) || blur < 0 || blur > 30) return json({ ok: false, error: '模糊度需在 0~30 之间' }, 400);
    if (!blur) {
      await env.DB.prepare("DELETE FROM site_settings WHERE key = 'bg_blur'").run();
      return json({ ok: true, blur: null });
    }
    await env.DB
      .prepare("INSERT INTO site_settings (key, value) VALUES ('bg_blur', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(String(blur))
      .run();
    return json({ ok: true, blur });
  }
  // 主页寄语：传空 = 恢复每日一言
  if (body.quote !== undefined) {
    const quote = String(body.quote || '').trim().slice(0, 100);
    if (!quote) {
      await env.DB.prepare("DELETE FROM site_settings WHERE key = 'quote'").run();
      return json({ ok: true, quote: null });
    }
    await env.DB
      .prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .bind('quote', quote)
      .run();
    return json({ ok: true, quote });
  }
  // accent 传 null/空 表示恢复站点默认（blue）
  if (body.accent === null || body.accent === '') {
    await env.DB.prepare('DELETE FROM site_settings WHERE key = ?').bind('accent').run();
    return json({ ok: true, accent: null });
  }
  const accent = String(body.accent || '');
  if (!ACCENTS.includes(accent)) return json({ ok: false, error: '未知主题色' }, 400);
  await env.DB
    .prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind('accent', accent)
    .run();
  return json({ ok: true, accent });
}
