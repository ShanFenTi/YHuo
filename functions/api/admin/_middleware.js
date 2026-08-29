// /api/admin/* 的统一门卫：没有有效会话一律 401
import { getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { isValidSession } from '../../lib/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  const token = getCookie(request, SESSION_COOKIE);
  if (await isValidSession(env, token)) return context.next();
  return new Response(JSON.stringify({ ok: false, error: '未登录或会话已过期' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
