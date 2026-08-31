// AI 对话历史持久化：GET 恢复 / POST 追加 / DELETE 清空（新对话）
// 鉴权同 chat.js：前台用户会话或管理员会话任一有效；owner = 'u{userId}' 或 'admin'
import { json, getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { USER_COOKIE, getUserSession, isValidSession } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

const MAX_KEEP = 200;     // 每人最多保留条数（超出删最旧的）
const MAX_CHARS = 50000;  // 单条 content 字符上限

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

// content 归一为纯文本：数组（多模态 parts）只取 text 部分，图片转「[图片]」占位
function toText(c) {
  if (typeof c === 'string') return c;
  if (!Array.isArray(c)) return '';
  let out = '';
  for (const p of c) {
    if (!p || typeof p !== 'object') continue;
    if (p.type === 'text' && typeof p.text === 'string') out += (out ? '\n' : '') + p.text;
    else if (p.type === 'image_url') out += (out ? '\n' : '') + '[图片]';
  }
  return out;
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: '站点未配置数据库' }, 503);
  await ensureSchema(env);
  const owner = await getOwner(request, env);
  if (!owner) return json({ ok: false, error: 'login' }, 401);
  const { results } = await env.DB
    .prepare('SELECT role, content FROM ai_chat_history WHERE owner = ? ORDER BY id ASC LIMIT ?')
    .bind(owner, MAX_KEEP)
    .all();
  return json({ ok: true, messages: results || [] });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: '站点未配置数据库' }, 503);
  await ensureSchema(env);
  const owner = await getOwner(request, env);
  if (!owner) return json({ ok: false, error: 'login' }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const list = Array.isArray(body && body.messages) ? body.messages : [];
  const stmt = env.DB
    .prepare('INSERT INTO ai_chat_history (owner, role, content) VALUES (?, ?, ?)');
  let added = 0;
  for (const m of list.slice(0, 20)) {
    if (!m || typeof m !== 'object') continue;
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = toText(m.content).slice(0, MAX_CHARS).trim();
    if (!content) continue;
    await stmt.bind(owner, role, content).run();
    added++;
  }
  // 超量裁剪：保留最新 MAX_KEEP 条
  await env.DB
    .prepare('DELETE FROM ai_chat_history WHERE owner = ? AND id NOT IN (SELECT id FROM ai_chat_history WHERE owner = ? ORDER BY id DESC LIMIT ?)')
    .bind(owner, owner, MAX_KEEP)
    .run();
  return json({ ok: true, added });
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) return json({ ok: false, error: '站点未配置数据库' }, 503);
  await ensureSchema(env);
  const owner = await getOwner(request, env);
  if (!owner) return json({ ok: false, error: 'login' }, 401);
  await env.DB.prepare('DELETE FROM ai_chat_history WHERE owner = ?').bind(owner).run();
  return json({ ok: true });
}
