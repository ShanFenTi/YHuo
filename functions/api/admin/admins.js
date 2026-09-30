// 管理员账号管理（2026-09-30 多管理员分级；超管专属——/api/admin/* 中间件已按前缀挡 403）
// GET  /api/admin/admins → 管理员列表（不含密码哈希；含角色/禁用/创建时间/活跃会话数）
// POST /api/admin/admins {action} →
//   create         {username, password, role:'admin'|'super'}  新建管理员
//   reset-password {id, password}                              重置某管理员密码（踢其全部会话；不用于自己——自己改密走「我的」页验旧密码）
//   set-role       {id, role}                                  调整角色（升/降级）
//   set-banned     {id, banned}                                禁用/启用（禁用即时踢下线）
//   delete         {id}                                        删除账号（连带其会话）
// 守护：除 create 外不能操作自己；任何会减少「可用超管」的操作（降级/禁用/删除超管）
//       要求操作后仍剩至少一个未禁用的超管——站点永远留得住一个能进后台的人
import { json, getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { randomHex, hashPassword, getAdminAuth, logAdminLogin } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

// 可用（未禁用）超管数
async function liveSuperCount(env, excludeId) {
  const sql = "SELECT COUNT(*) AS n FROM admin_users WHERE role = 'super' AND banned = 0"
    + (excludeId ? ' AND id != ?' : '');
  const row = await env.DB.prepare(sql).bind(...(excludeId ? [excludeId] : [])).first();
  return Number(row.n || 0);
}

// 管理动作审计：落 admin_login_logs（note 带 [管理] 前缀与「我的」页登录记录区分，行为人=操作者）
function logAction(env, request, actor, note) {
  return logAdminLogin(env, request, 1, '[管理] ' + note, actor);
}

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  const list = await env.DB
    .prepare('SELECT a.id, a.username, a.role, a.banned, a.created_at, (SELECT COUNT(*) FROM sessions s WHERE s.admin_id = a.id AND s.expires_at >= ?) AS active_sessions FROM admin_users a ORDER BY a.id')
    .bind(new Date().toISOString())
    .all();
  return json({ ok: true, items: list.results || [] });
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  const me = await getAdminAuth(env, getCookie(request, SESSION_COOKIE));
  if (!me || me.role !== 'super') return json({ ok: false, error: '该操作需要超级管理员权限' }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const action = String(body.action || '');
  const id = Number(body.id || 0);

  if (action === 'create') {
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const role = body.role === 'super' ? 'super' : 'admin';
    if (!username || username.length > 50 || /\s/.test(username)) {
      return json({ ok: false, error: '用户名 1-50 字且不含空格' }, 400);
    }
    if (password.length < 6 || password.length > 100) return json({ ok: false, error: '密码需 6-100 位' }, 400);
    const salt = randomHex(32);
    const hash = await hashPassword(password, salt);
    try {
      await env.DB
        .prepare('INSERT INTO admin_users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)')
        .bind(username, hash, salt, role)
        .run();
    } catch (e) {
      return json({ ok: false, error: '用户名已存在' }, 400);
    }
    await logAction(env, request, me.username, '新建管理员 ' + username + '（' + (role === 'super' ? '超级管理员' : '管理员') + '）');
    return json({ ok: true });
  }

  // 以下动作都针对既有账号：先取目标行，不存在 404；不能操作自己（改自己走「我的」页）
  const target = id > 0
    ? await env.DB.prepare('SELECT id, username, role, banned FROM admin_users WHERE id = ?').bind(id).first()
    : null;
  if (!target) return json({ ok: false, error: '目标管理员不存在' }, 404);
  if (target.id === me.id) return json({ ok: false, error: '不能对自己执行该操作（改密码请在「我的」页验证旧密码后修改）' }, 400);

  if (action === 'reset-password') {
    const password = String(body.password || '');
    if (password.length < 6 || password.length > 100) return json({ ok: false, error: '密码需 6-100 位' }, 400);
    const salt = randomHex(32);
    const hash = await hashPassword(password, salt);
    await env.DB.batch([
      env.DB.prepare('UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?').bind(hash, salt, target.id),
      env.DB.prepare('DELETE FROM sessions WHERE admin_id = ?').bind(target.id),
    ]);
    await logAction(env, request, me.username, '重置管理员 ' + target.username + ' 的密码');
    return json({ ok: true });
  }

  if (action === 'set-role') {
    const role = body.role === 'super' ? 'super' : 'admin';
    if (role === target.role) return json({ ok: true });
    if (target.role === 'super' && (await liveSuperCount(env, target.id)) < 1) {
      return json({ ok: false, error: '至少保留一个可用的超级管理员' }, 400);
    }
    await env.DB.prepare('UPDATE admin_users SET role = ? WHERE id = ?').bind(role, target.id).run();
    await logAction(env, request, me.username, (role === 'super' ? '将 ' : '将 ') + target.username + (role === 'super' ? ' 升为超级管理员' : ' 降为管理员'));
    return json({ ok: true });
  }

  if (action === 'set-banned') {
    const banned = !!body.banned;
    if (banned === !!target.banned) return json({ ok: true });
    if (banned && target.role === 'super' && (await liveSuperCount(env, target.id)) < 1) {
      return json({ ok: false, error: '至少保留一个可用的超级管理员' }, 400);
    }
    await env.DB.batch([
      env.DB.prepare('UPDATE admin_users SET banned = ? WHERE id = ?').bind(banned ? 1 : 0, target.id),
      // 禁用即时下线：其存量会话在 getAdminAuth 侧也会被拒，这里主动清干净
      ...(banned ? [env.DB.prepare('DELETE FROM sessions WHERE admin_id = ?').bind(target.id)] : []),
    ]);
    await logAction(env, request, me.username, (banned ? '禁用' : '启用') + '管理员 ' + target.username);
    return json({ ok: true });
  }

  if (action === 'delete') {
    if (target.role === 'super' && (await liveSuperCount(env, target.id)) < 1) {
      return json({ ok: false, error: '至少保留一个可用的超级管理员' }, 400);
    }
    await env.DB.batch([
      env.DB.prepare('DELETE FROM admin_users WHERE id = ?').bind(target.id),
      env.DB.prepare('DELETE FROM sessions WHERE admin_id = ?').bind(target.id),
    ]);
    await logAction(env, request, me.username, '删除管理员 ' + target.username);
    return json({ ok: true });
  }

  return json({ ok: false, error: '未知操作' }, 400);
}
