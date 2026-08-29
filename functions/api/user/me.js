// GET /api/user/me → 当前登录的前台用户（没登录返回 authenticated:false，不报错）
import { json, getCookie } from '../../lib/util.js';
import { getUserSession, USER_COOKIE } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestGet({ request, env }) {
  try {
    await ensureSchema(env);
    const user = await getUserSession(env, getCookie(request, USER_COOKIE));
    if (!user) return json({ ok: true, authenticated: false });
    return json({ ok: true, authenticated: true, username: user.username });
  } catch {
    // 数据库不可用时按未登录处理，别让主页卡住
    return json({ ok: true, authenticated: false });
  }
}
