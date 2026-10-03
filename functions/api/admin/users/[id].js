// PUT    /api/admin/users/:id { banned: true|false } → 禁用/解封（禁用同时踢掉全部会话）
// POST   /api/admin/users/:id { password } → 重置该前台用户密码（2026-10-03：换哈希 + 踢掉其
//          全部前台会话；动作记 [管理] 日志。该用户名若同时是管理员，其后台登录密码是
//          admin_users 里独立的一份（授权时复制的），不受本次重置影响
// DELETE /api/admin/users/:id → 删除账号（连同其会话）
// 三个动作均为超管专属（/api/admin/users 在中间件 SUPER_PREFIX 前缀表内）
import { json } from '../../../lib/util.js';
import { randomHex, hashPassword, logAdminLogin } from '../../../lib/auth.js';
import { ensureSchema } from '../../../lib/migrate.js';

export async function onRequestPut({ request, env, params }) {
  await ensureSchema(env);
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: '参数错误' }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const banned = body.banned ? 1 : 0;

  const result = await env.DB.prepare('UPDATE users SET banned = ? WHERE id = ?').bind(banned, id).run();
  if (!result.meta.changes) return json({ ok: false, error: '用户不存在' }, 404);

  // 禁用即踢下线：清掉该用户全部会话
  if (banned) await env.DB.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(id).run();
  return json({ ok: true, banned: !!banned });
}

export async function onRequestPost({ request, env, params, data }) {
  await ensureSchema(env);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: '参数错误' }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  // 与注册/找回密码/管理员重置同一口径（6-100 位）
  const password = String(body.password || '');
  if (password.length < 6 || password.length > 100) return json({ ok: false, error: '密码需 6-100 位' }, 400);

  const u = await env.DB.prepare('SELECT id, username FROM users WHERE id = ?').bind(id).first();
  if (!u) return json({ ok: false, error: '用户不存在' }, 404);

  const salt = randomHex(32);
  const hash = await hashPassword(password, salt);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').bind(hash, salt, id),
    // 旧密码派生的存量会话全部作废——否则重置不生效（旧会话还登着）
    env.DB.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(id),
  ]);
  const actor = (data && data.admin && data.admin.username) || '?';
  await logAdminLogin(env, request, 1, '[管理] 重置前台用户 ' + u.username + ' 的密码', actor);
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  await ensureSchema(env);
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: '参数错误' }, 400);

  const row = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: '用户不存在' }, 404);

  await env.DB.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
