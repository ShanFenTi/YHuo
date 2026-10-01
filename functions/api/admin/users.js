// GET /api/admin/users → 注册用户列表（含注册人数；is_admin/admin_role = 同名管理员账号存在标记，
// 账号页据此显隐「授权为管理员」钮——users 与 admin_users 是两套独立账号表，按用户名比对）
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const { results } = await env.DB
    .prepare('SELECT id, username, nickname, banned, created_at, last_seen_at, avatar_key, email, twofa_enabled FROM users ORDER BY id DESC LIMIT 1000')
    .all();
  const adm = await env.DB.prepare('SELECT username, role FROM admin_users').all();
  const roleByName = {};
  (adm.results || []).forEach(function (r) { roleByName[r.username] = r.role; });
  const users = (results || []).map(function (u) {
    const role = roleByName[u.username];
    return role ? Object.assign({}, u, { is_admin: 1, admin_role: role }) : u;
  });
  // 上限 1000 防开放注册后整页拖全表（当前量级远够；count 为截断后的行数）
  return json({ ok: true, count: users.length, users });
}
