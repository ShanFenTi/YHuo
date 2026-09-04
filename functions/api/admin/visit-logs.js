// GET /api/admin/visit-logs → 最近访问明细（IP/页面/UA），概览页"最近访问"列表用
// 同时返回归属地开关状态（site_settings.visit_geo，未设置默认开）
// 走 /api/admin/* 会话门卫（_middleware.js），未登录 401
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestGet({ env }) {
  try {
    await ensureSchema(env);
    const [r, cfg] = await Promise.all([
      env.DB.prepare(
        'SELECT day, ip, path, ua, created_at FROM visit_logs ORDER BY id DESC LIMIT 20'
      ).all(),
      env.DB.prepare("SELECT value FROM site_settings WHERE key = 'visit_geo'").first(),
    ]);
    return json({ ok: true, logs: r.results || [], geoEnabled: cfg ? cfg.value !== '0' : true });
  } catch {
    return json({ ok: false, logs: [] });
  }
}