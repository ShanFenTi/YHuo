// PUT    /api/admin/users/:id { banned: true|false } → 禁用/解封（禁用同时踢掉全部会话）
// DELETE /api/admin/users/:id → 删除账号（连同其会话）
import { json } from '../../../lib/util.js';
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
