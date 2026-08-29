// GET /api/user/me → 当前登录的前台用户（没登录返回 authenticated:false，不报错）
import { json, getCookie } from '../../lib/util.js';
import { getUserSession, USER_COOKIE } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestGet({ request, env }) {
  try {
    await ensureSchema(env);
    const user = await getUserSession(env, getCookie(request, USER_COOKIE));
    if (!user) return json({ ok: true, authenticated: false });
    // 最后活跃时间：超过 1 小时才刷新一次，避免每次进首页都写库
    const row = await env.DB.prepare('SELECT last_seen_at FROM users WHERE id = ?').bind(user.userId).first();
    const last = row && row.last_seen_at ? Date.parse(row.last_seen_at.replace(' ', 'T') + 'Z') : 0;
    if (!last || Date.now() - last > 3600e3) {
      await env.DB.prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?").bind(user.userId).run();
    }
    return json({ ok: true, authenticated: true, username: user.username });
  } catch {
    // 数据库不可用时按未登录处理，别让主页卡住
    return json({ ok: true, authenticated: false });
  }
}
