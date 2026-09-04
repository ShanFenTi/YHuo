// GET /api/admin/visit-logs → 最近访问明细（IP/页面/UA），概览页"最近访问"列表用
// 走 /api/admin/* 会话门卫（_middleware.js），未登录 401
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestGet({ env }) {
  try {
    await ensureSchema(env);
    const r = await env.DB.prepare(
      'SELECT day, ip, path, ua, created_at FROM visit_logs ORDER BY id DESC LIMIT 20'
    ).all();
    return json({ ok: true, logs: r.results || [] });
  } catch {
    return json({ ok: false, logs: [] });
  }
}