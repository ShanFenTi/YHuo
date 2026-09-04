// GET/PUT /api/admin/video-mode → 首页视频播放模式设置（site_settings 'video_mode'）
// { mode: 'seq'|'single'|'random', url }：seq=顺序循环（默认）/ single=单视频循环（url=该视频地址）/ random=随机播放
// url 标识与前台播放列表同口径（后台媒体 '/media/{r2_key}'、静态 'video/xxx.mp4'）；走 /api/admin/* 会话门卫
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

const KEY = 'video_mode';

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const r = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?').bind(KEY).first();
  let m = {};
  try { m = JSON.parse(r ? r.value : 'null') || {}; } catch {}
  return json({
    ok: true,
    mode: m.mode === 'single' ? 'single' : (m.mode === 'random' ? 'random' : 'seq'),
    url: String(m.url || ''),
  });
}

export async function onRequestPut({ env, request }) {
  await ensureSchema(env);
  let body = {};
  try { body = await request.json(); } catch {}
  const mode = body.mode === 'single' ? 'single' : (body.mode === 'random' ? 'random' : 'seq');
  // 只有单视频模式需要 url，其他模式清空
  const url = mode === 'single' ? String(body.url || '').slice(0, 300) : '';
  await env.DB
    .prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(KEY, JSON.stringify({ mode, url })).run();
  return json({ ok: true, mode, url });
}