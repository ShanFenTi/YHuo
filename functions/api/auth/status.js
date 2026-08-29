// GET /api/auth/status → 前台判断是否已初始化管理员、当前是否已登录
import { json, getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { isValidSession } from '../../lib/auth.js';

export async function onRequestGet({ request, env }) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_users').first();
  const authenticated = await isValidSession(env, getCookie(request, SESSION_COOKIE));
  return json({ ok: true, initialized: row.n > 0, authenticated });
}
