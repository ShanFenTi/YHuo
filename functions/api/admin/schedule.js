// GET  /api/admin/schedule → 定时任务配置（tick URL + 密钥；密钥不存在时自动生成）
// POST /api/admin/schedule { action:'regenerate' } → 重新生成密钥（旧 URL 立即失效）
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';
import { randomHex } from '../../lib/auth.js';

const KEY_NAME = 'schedule_tick_key';

async function readKey(env) {
  const row = await env.DB
    .prepare('SELECT value FROM site_settings WHERE key = ?').bind(KEY_NAME).first();
  return row ? String(row.value) : '';
}

async function writeKey(env, key) {
  await env.DB
    .prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(KEY_NAME, key).run();
  return key;
}

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  let key = await readKey(env);
  if (!key) key = await writeKey(env, randomHex(20)); // 首次查看自动生成
  const origin = new URL(request.url).origin;
  return json({
    ok: true,
    key,
    url: origin + '/api/schedule/tick?key=' + key,
  });
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  let body = {};
  try { body = await request.json(); } catch {}
  if (body.action !== 'regenerate') return json({ ok: false, error: '不支持的操作' }, 400);
  const key = await writeKey(env, randomHex(20));
  const origin = new URL(request.url).origin;
  return json({ ok: true, key, url: origin + '/api/schedule/tick?key=' + key });
}
