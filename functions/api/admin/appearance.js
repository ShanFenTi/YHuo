// GET /api/admin/appearance → 当前站点默认外观（accent/bg/quote/blur/flags）
// PUT  /api/admin/appearance { accent } | { quote } | { blur } | { flags } → 分字段设置（哪个字段在就处理哪个）
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

const ACCENTS = ['terracotta', 'purple', 'pink', 'green', 'orange'];

// 功能开关白名单（true=显示，缺省开）。ai 不在此列——跟随 AI 页全局开关（site_settings.ai_enabled）
const FLAG_KEYS = ['tools', 'docs', 'album', 'misc', 'weather', 'lyric', 'video'];

async function getSetting(env, key) {
  const row = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?').bind(key).first();
  return row ? row.value : null;
}

async function readFlags(env) {
  let raw = {};
  try { raw = JSON.parse((await getSetting(env, 'feature_flags')) || '{}'); } catch {}
  if (!raw || typeof raw !== 'object') raw = {};
  const flags = {};
  for (const k of FLAG_KEYS) flags[k] = raw[k] !== false; // 缺省/未知值一律视为开
  return flags;
}

// 底部播放器样式：{mode:'mini'|'blog'}（blog=悬浮播放器；两种款式共用站内曲库，无外部音源）
async function readPlayer(env) {
  let raw = {};
  try { raw = JSON.parse((await getSetting(env, 'player_config')) || '{}'); } catch {}
  if (!raw || typeof raw !== 'object') raw = {};
  return { mode: raw.mode === 'blog' ? 'blog' : 'mini' };
}

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const accent = await getSetting(env, 'accent');
  const bg = await getSetting(env, 'bg');
  const quotes = await readQuotes(env);
  const blur = await getSetting(env, 'bg_blur');
  const flags = await readFlags(env);
  const player = await readPlayer(env);
  return json({ ok: true, accent: accent || null, bg: bg || null, quotes, blur: blur === null ? null : parseInt(blur, 10) || 0, flags, player });
}

// 寄语列表：优先读新的 quotes（JSON 数组），旧的单条 quote 自动并入
async function readQuotes(env) {
  let list = [];
  try { list = JSON.parse((await getSetting(env, 'quotes')) || '[]'); } catch {}
  if (!Array.isArray(list)) list = [];
  if (!list.length) {
    const legacy = await getSetting(env, 'quote');
    if (legacy) list = [legacy];
  }
  return list.filter((q) => typeof q === 'string' && q.trim()).map((q) => q.trim());
}

export async function onRequestPut({ request, env }) {
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  // 功能开关：只收白名单键的布尔值，未传的键视为开；全部为开时清键（保持缺省态）
  if (body.flags !== undefined) {
    if (!body.flags || typeof body.flags !== 'object' || Array.isArray(body.flags)) return json({ ok: false, error: 'flags 需为对象' }, 400);
    const clean = {};
    for (const k of FLAG_KEYS) if (typeof body.flags[k] === 'boolean') clean[k] = body.flags[k];
    const allOn = FLAG_KEYS.every((k) => clean[k] !== false);
    if (allOn) {
      await env.DB.prepare("DELETE FROM site_settings WHERE key = 'feature_flags'").run();
    } else {
      await env.DB
        .prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        .bind('feature_flags', JSON.stringify(clean))
        .run();
    }
    return json({ ok: true, flags: await readFlags(env) });
  }
  // 播放器样式：mode 仅 mini/blog
  if (body.player !== undefined) {
    const p = body.player || {};
    if (typeof p !== 'object' || Array.isArray(p)) return json({ ok: false, error: 'player 需为对象' }, 400);
    const clean = { mode: p.mode === 'blog' ? 'blog' : 'mini' };
    await env.DB
      .prepare("INSERT INTO site_settings (key, value) VALUES ('player_config', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(JSON.stringify(clean))
      .run();
    return json({ ok: true, player: clean });
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
  // 主页寄语（多条）：字符串数组，每条 ≤100 字、最多 20 条；空数组 = 恢复每日一言
  if (body.quotes !== undefined) {
    if (!Array.isArray(body.quotes)) return json({ ok: false, error: 'quotes 需为数组' }, 400);
    const list = body.quotes
      .map((q) => String(q || '').trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, 20);
    if (!list.length) {
      await env.DB.prepare("DELETE FROM site_settings WHERE key IN ('quotes', 'quote')").run();
      return json({ ok: true, quotes: [] });
    }
    await env.DB
      .prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .bind('quotes', JSON.stringify(list))
      .run();
    await env.DB.prepare("DELETE FROM site_settings WHERE key = 'quote'").run(); // 迁移到新键后清掉旧单条
    return json({ ok: true, quotes: list });
  }
  // accent 传 null/空 表示恢复站点默认（terracotta）
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
