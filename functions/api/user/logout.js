// POST /api/user/logout
import { json, getCookie } from '../../lib/util.js';
import { deleteUserSession, clearUserCookie, USER_COOKIE } from '../../lib/auth.js';

export async function onRequestPost({ request, env }) {
  await deleteUserSession(env, getCookie(request, USER_COOKIE));
  return json({ ok: true }, 200, { 'Set-Cookie': clearUserCookie() });
}
