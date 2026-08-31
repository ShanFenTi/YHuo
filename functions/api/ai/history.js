// AI 对话历史持久化：GET 恢复 / POST 追加（含自动建对话+更新标题/时间）/ DELETE 清空
// 鉴权同 chat.js：前台用户会话或管理员会话任一有效；owner = 'u{userId}' 或 'admin'
import { json, getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { USER_COOKIE, getUserSession, isValidSession } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

const MAX_KEEP = 200;     // 每对话最多保留条数（超出删最旧的）
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
  const url = new URL(request.url);
  const convId = parseInt(url.searchParams.get('conv') || '0', 10);
  if (convId) {
    // 校验对话归属
    const conv = await env.DB
      .prepare('SELECT id FROM ai_conversations WHERE id = ? AND owner = ?')
      .bind(convId, owner).first();
    if (!conv) return json({ ok: false, error: '对话不存在' }, 404);
    const { results } = await env.DB
      .prepare('SELECT role, content FROM ai_chat_history WHERE owner = ? AND conv_id = ? ORDER BY id ASC LIMIT ?')
      .bind(owner, convId, MAX_KEEP)
      .all();
    return json({ ok: true, messages: results || [] });
  }
  // 无 conv：返回最近活跃对话的消息（前端打开界面时用）
  const latest = await env.DB
    .prepare('SELECT id FROM ai_conversations WHERE owner = ? ORDER BY updated_at DESC, id DESC LIMIT 1')
    .bind(owner).first();
  if (!latest) return json({ ok: true, conv: null, messages: [] });
  const { results } = await env.DB
    .prepare('SELECT role, content FROM ai_chat_history WHERE owner = ? AND conv_id = ? ORDER BY id ASC LIMIT ?')
    .bind(owner, latest.id, MAX_KEEP)
    .all();
  return json({ ok: true, conv: latest.id, messages: results || [] });
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
  let convId = parseInt(body && body.conv, 10) || 0;

  // 指定了对话则校验归属；没指定（或无效）则自动新建
  if (convId) {
    const conv = await env.DB
      .prepare('SELECT id, title FROM ai_conversations WHERE id = ? AND owner = ?')
      .bind(convId, owner).first();
    if (!conv) convId = 0; // 对话被删了：降级为新建
  }
  let isNewConv = false;
  if (!convId) {
    const conv = await env.DB
      .prepare("INSERT INTO ai_conversations (owner, title) VALUES (?, '新对话')")
      .bind(owner).run();
    convId = conv.meta ? conv.meta.last_row_id : 0;
    isNewConv = true;
  }
  if (!convId) return json({ ok: false, error: '保存失败' }, 500);

  const stmt = env.DB
    .prepare('INSERT INTO ai_chat_history (owner, role, content, conv_id) VALUES (?, ?, ?, ?)');
  let added = 0;
  let firstUser = '';
  for (const m of list.slice(0, 20)) {
    if (!m || typeof m !== 'object') continue;
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = toText(m.content).slice(0, MAX_CHARS).trim();
    if (!content) continue;
    if (role === 'user' && !firstUser) firstUser = content;
    await stmt.bind(owner, role, content, convId).run();
    added++;
  }

  // 标题：新对话取第一条用户消息前 20 字；已命名的沿用
  let title = null;
  if (isNewConv && firstUser) {
    title = firstUser.replace(/\s+/g, ' ').slice(0, 20);
    await env.DB.prepare('UPDATE ai_conversations SET title = ? WHERE id = ?').bind(title, convId).run();
  }
  await env.DB.prepare("UPDATE ai_conversations SET updated_at = datetime('now') WHERE id = ?").bind(convId).run();

  // 单对话超量裁剪
  await env.DB
    .prepare('DELETE FROM ai_chat_history WHERE conv_id = ? AND id NOT IN (SELECT id FROM ai_chat_history WHERE conv_id = ? ORDER BY id DESC LIMIT ?)')
    .bind(convId, convId, MAX_KEEP)
    .run();
  return json({ ok: true, added, conv: convId, title });
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) return json({ ok: false, error: '站点未配置数据库' }, 503);
  await ensureSchema(env);
  const owner = await getOwner(request, env);
  if (!owner) return json({ ok: false, error: 'login' }, 401);
  // 删本对话的消息（对话壳保留在 conversations 接口管理；这里供"清空当前对话内容"用）
  const url = new URL(request.url);
  const convId = parseInt(url.searchParams.get('conv') || '0', 10);
  if (convId) {
    const conv = await env.DB
      .prepare('SELECT id FROM ai_conversations WHERE id = ? AND owner = ?')
      .bind(convId, owner).first();
    if (!conv) return json({ ok: false, error: '对话不存在' }, 404);
    await env.DB.prepare('DELETE FROM ai_chat_history WHERE conv_id = ?').bind(convId).run();
    return json({ ok: true });
  }
  // 无 conv：清空该用户全部历史消息 + 全部对话（整账户重来）
  await env.DB.prepare('DELETE FROM ai_chat_history WHERE owner = ?').bind(owner).run();
  await env.DB.prepare('DELETE FROM ai_conversations WHERE owner = ?').bind(owner).run();
  return json({ ok: true });
}
