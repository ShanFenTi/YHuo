// POST /api/auth/setup —— 仅在管理员表为空时可用，用于首次创建超级管理员
import { json } from '../../lib/util.js';
import { hashPassword, randomHex, createSession, sessionCookie } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  // 空库快速失败；真闸门是下面的原子 INSERT——COUNT 与 INSERT 之间有窗口，
  // 未初始化时两个并发请求（不同用户名）可各自看到 n=0 双双建号（UNIQUE 只挡同名）
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_users').first();
  if (row.n > 0) return json({ ok: false, error: '管理员已存在，不能重复初始化' }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (!username || username.length > 50) return json({ ok: false, error: '用户名不能为空（50 字以内）' }, 400);
  if (password.length < 6) return json({ ok: false, error: '密码至少 6 位' }, 400);

  const salt = randomHex(32);
  const hash = await hashPassword(password, salt);
  const res = await env.DB
    .prepare(
      'INSERT INTO admin_users (username, password_hash, salt) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM admin_users)'
    )
    .bind(username, hash, salt)
    .run();
  if (!res.meta || Number(res.meta.changes || 0) === 0) {
    return json({ ok: false, error: '管理员已存在，不能重复初始化' }, 403);
  }

  // 创建完直接登录
  const token = await createSession(env, request);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token) });
}
