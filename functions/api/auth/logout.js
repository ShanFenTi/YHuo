// POST /api/auth/logout
import { json, getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { deleteSession, clearSessionCookie } from '../../lib/auth.js';

export async function onRequestPost({ request, env }) {
  await deleteSession(env, getCookie(request, SESSION_COOKIE));
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}
