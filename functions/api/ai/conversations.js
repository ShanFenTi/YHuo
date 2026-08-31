// AI 会话管理：GET 列表 / DELETE 删除（含消息）。owner 隔离同 chat.js。
import { json, getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { USER_COOKIE, getUserSession, isValidSession } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

const MAX_CONVS = 50; // 每人最多保留对话数，超出删最旧

async function getOwner(request, env) {
  let user = null;
  try {
    user = await getUserSession(env, getCookie(request, USER_COOKIE));
  } catch {}
  if (user) return 'u' + user.userId;
  let isAdmin = false;
  try {
    isAdmin = await isValidSession(env, getCookie(request, SESSION_COOKIE));
  } catch {}
  return isAdmin ? 'admin' : null;
}

// 对话标题：取该对话第一条用户消息前 20 字
async function convTitle(env, owner, convId) {
  const row = await env.DB
    .prepare("SELECT content FROM ai_chat_history WHERE owner = ? AND conv_id = ? AND role = 'user' ORDER BY id ASC LIMIT 1")
    .bind(owner, convId)
    .first();
  if (!row) return '新对话';
  return (row.content || '').replace(/\s+/g, ' ').slice(0, 20) || '新对话';
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: '站点未配置数据库' }, 503);
  await ensureSchema(env);
  const owner = await getOwner(request, env);
  if (!owner) return json({ ok: false, error: 'login' }, 401);
  const { results } = await env.DB
    .prepare(`SELECT c.id, c.title, c.updated_at,
      (SELECT COUNT(*) FROM ai_chat_history h WHERE h.conv_id = c.id) AS msgs
      FROM ai_conversations c WHERE c.owner = ? ORDER BY c.updated_at DESC, c.id DESC LIMIT ?`)
    .bind(owner, MAX_CONVS)
    .all();
  return json({ ok: true, conversations: results || [] });
}

// POST：创建空对话（前端"新对话"点下即建，返回 id；首次发消息时也可自动建，这里供两种用法）
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: '站点未配置数据库' }, 503);
  await ensureSchema(env);
  const owner = await getOwner(request, env);
  if (!owner) return json({ ok: false, error: 'login' }, 401);
  const conv = await env.DB
    .prepare("INSERT INTO ai_conversations (owner, title) VALUES (?, '新对话')")
    .bind(owner).run();
  const id = conv.meta ? conv.meta.last_row_id : 0;
  // 超量裁剪：删最旧对话及其消息
  const stale = await env.DB
    .prepare('SELECT id FROM ai_conversations WHERE owner = ? ORDER BY updated_at DESC, id DESC LIMIT -1 OFFSET ?')
    .bind(owner, MAX_CONVS)
    .all();
  for (const r of stale.results || []) {
    await env.DB.prepare('DELETE FROM ai_chat_history WHERE conv_id = ?').bind(r.id).run();
    await env.DB.prepare('DELETE FROM ai_conversations WHERE id = ?').bind(r.id).run();
  }
  return json({ ok: true, id });
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) return json({ ok: false, error: '站点未配置数据库' }, 503);
  await ensureSchema(env);
  const owner = await getOwner(request, env);
  if (!owner) return json({ ok: false, error: 'login' }, 401);
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id') || '0', 10);
  if (!id) return json({ ok: false, error: '缺少对话 id' }, 400);
  const row = await env.DB
    .prepare('SELECT id FROM ai_conversations WHERE id = ? AND owner = ?')
    .bind(id, owner).first();
  if (!row) return json({ ok: false, error: '对话不存在' }, 404);
  await env.DB.prepare('DELETE FROM ai_chat_history WHERE conv_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM ai_conversations WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
