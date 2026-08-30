// PUT /api/user/password { oldPassword, newPassword } → 前台用户自助改密
// 必须验证旧密码；旧密码试错走与管理员登录同一套限速（同 IP+用户名 5 次锁 10 分钟），
// 防止会话被窃后暴力试旧密码。改密后已有会话保持有效（会话令牌独立于密码）。
import { json, getCookie } from '../../lib/util.js';
import {
  getUserSession, USER_COOKIE,
  verifyPassword, hashPassword, randomHex,
  loginKey, loginLockedFor, recordLoginFail, clearLoginFails,
} from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestPut({ request, env }) {
  await ensureSchema(env);
  const sess = await getUserSession(env, getCookie(request, USER_COOKIE));
  if (!sess) return json({ ok: false, error: '未登录' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const oldPassword = String(body.oldPassword || '');
  const newPassword = String(body.newPassword || '');
  if (!oldPassword || !newPassword) return json({ ok: false, error: '请填写旧密码和新密码' }, 400);
  if (newPassword.length < 6) return json({ ok: false, error: '新密码至少 6 位' }, 400);
  if (newPassword === oldPassword) return json({ ok: false, error: '新密码不能和旧密码相同' }, 400);

  const row = await env.DB
    .prepare('SELECT id, password_hash, salt FROM users WHERE id = ?')
    .bind(sess.userId)
    .first();
  if (!row) return json({ ok: false, error: '账号不存在' }, 404);

  const throttleKey = loginKey(request, 'pwd', sess.username);
  const lockedMin = await loginLockedFor(env, throttleKey);
  if (lockedMin > 0) {
    return json({ ok: false, error: '尝试次数过多已锁定，请约 ' + lockedMin + ' 分钟后再试' }, 429);
  }

  if (!(await verifyPassword(oldPassword, row.salt, row.password_hash))) {
    await recordLoginFail(env, throttleKey);
    return json({ ok: false, error: '旧密码不正确' }, 403);
  }
  await clearLoginFails(env, throttleKey);

  const salt = randomHex(32);
  const hash = await hashPassword(newPassword, salt);
  await env.DB
    .prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?')
    .bind(hash, salt, sess.userId)
    .run();
  return json({ ok: true });
}
