// GET /api/user/me → 当前登录身份（前台用户或管理员）：没登录返回 authenticated:false，不报错
import { json, getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { getUserSession, isValidSession, USER_COOKIE } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestGet({ request, env }) {
  try {
    await ensureSchema(env);
    const user = await getUserSession(env, getCookie(request, USER_COOKIE));
    if (user) {
      // 最后活跃时间：超过 1 小时才刷新一次，避免每次进首页都写库；顺带带出头像键
      const row = await env.DB
        .prepare('SELECT last_seen_at, avatar_key FROM users WHERE id = ?')
        .bind(user.userId)
        .first();
      const last = row && row.last_seen_at ? Date.parse(row.last_seen_at.replace(' ', 'T') + 'Z') : 0;
      if (!last || Date.now() - last > 3600e3) {
        await env.DB.prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?").bind(user.userId).run();
      }
      return json({ ok: true, authenticated: true, username: user.username, avatar: (row && row.avatar_key) || null, admin: false });
    }
    // 前台用户会话没有：识别管理员会话（后台登录后在前台刷新时静默恢复管理员身份与头像）
    if (await isValidSession(env, getCookie(request, SESSION_COOKIE))) {
      const avRow = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'admin_avatar'").first();
      const adm = await env.DB.prepare('SELECT username FROM admin_users ORDER BY id LIMIT 1').first();
      return json({ ok: true, authenticated: true, admin: true, username: (adm && adm.username) || '管理员', avatar: (avRow && avRow.value) || null });
    }
    return json({ ok: true, authenticated: false });
  } catch {
    // 数据库不可用时按未登录处理，别让主页卡住
    return json({ ok: true, authenticated: false });
  }
}
