// POST /api/user/nickname { nickname } → 设置/修改昵称（仅前台用户会话）
// 昵称是展示名：留言板/个人主页/顶栏显示用，登录账号名不变；清空（空串）= 恢复用用户名
import { json, getCookie } from '../../lib/util.js';
import { getUserSession, USER_COOKIE } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

const MAX_NICK = 20;

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  const sess = await getUserSession(env, getCookie(request, USER_COOKIE));
  if (!sess) return json({ ok: false, error: '未登录' }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const nickname = String(body.nickname || '').trim().replace(/\s+/g, ' ');
  if (nickname.length > MAX_NICK) return json({ ok: false, error: '昵称最多 ' + MAX_NICK + ' 个字' }, 400);
  await env.DB
    .prepare('UPDATE users SET nickname = ? WHERE id = ?')
    .bind(nickname, sess.userId)
    .run();
  return json({ ok: true, nickname });
}
