// GET /api/admin/users → 注册用户列表（含注册人数）
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const { results } = await env.DB
    .prepare('SELECT id, username, banned, created_at, last_seen_at FROM users ORDER BY id DESC')
    .all();
  return json({ ok: true, count: results.length, users: results });
}
