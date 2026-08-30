// GET /api/auth/status → 初始化状态 + 两类会话分列（自描述，杜绝语义误读）
// 历史教训（交接文档坑 11）：旧版只返回一个 authenticated（= 管理员会话 Cookie 是否存在），
// 前台曾把它当"当前登录人是不是管理员"用，两次误判。现在明确分列：
//   adminSession — 浏览器有有效管理员会话（yhuo_session，只说明"这个浏览器"，不说明前台登录人是谁）
//   userSession  — 浏览器有有效前台用户会话（yhuo_user，{userId, username} 或 null，这才是前台登录人）
// 前台"是不是管理员"的展示逻辑仍只认登录响应的 admin:true 欢迎标记，本接口不做身份判断依据。
// authenticated 为旧字段（= adminSession），兼容部署窗口期的后台旧缓存。
import { json, getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { isValidSession, getUserSession, USER_COOKIE } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_users').first();
  const adminSession = await isValidSession(env, getCookie(request, SESSION_COOKIE));
  const user = await getUserSession(env, getCookie(request, USER_COOKIE));
  return json({
    ok: true,
    initialized: row.n > 0,
    adminSession,
    userSession: user ? { userId: user.userId, username: user.username } : null,
    authenticated: adminSession,
  });
}
