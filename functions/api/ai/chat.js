// POST /api/ai/chat → 流式对话代理（仅登录用户/管理员可用，key 不出后端）
// 入参 { messages: [{role:'user'|'assistant', content}] }
// 响应：text/event-stream，统一格式 data: {"delta":"..."} / {"error":"..."} / [DONE]
import { json, getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { USER_COOKIE, getUserSession, isValidSession } from '../../lib/auth.js';
import { getAiStatus, buildUpstreamRequest, sseNormalizer } from '../../lib/ai.js';

const MAX_MESSAGES = 20;   // 最多携带最近 20 条
const MAX_CHARS = 4000;    // 单条消息最长字符
const RATE_LIMIT = 20;     // 每用户每分钟条数（进程内滑动窗口，跨隔离实例为近似值）

// 内存限速表：userId → 时间戳数组（Worker 隔离实例重启即清，防刷够用）
const rate = new Map();
function overRate(key) {
  const now = Date.now();
  const arr = (rate.get(key) || []).filter((t) => now - t < 60000);
  if (arr.length >= RATE_LIMIT) {
    rate.set(key, arr);
    return true;
  }
  arr.push(now);
  rate.set(key, arr);
  return false;
}

function sanitize(messages) {
  if (!Array.isArray(messages)) return null;
  const out = [];
  for (const m of messages) {
    if (!m || typeof m !== 'object') continue;
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = String(m.content || '').trim();
    if (!content) continue;
    out.push({ role, content: content.slice(0, MAX_CHARS) });
    if (out.length >= MAX_MESSAGES) break;
  }
  // 对话必须以用户消息收尾，否则截掉尾巴上的 assistant 消息
  while (out.length && out[out.length - 1].role !== 'user') out.pop();
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: '站点未配置数据库，AI 不可用' }, 503);

  // 鉴权：前台用户会话或管理员会话任一有效（管理员不必注册前台账号）
  let user = null;
  try {
    user = await getUserSession(env, getCookie(request, USER_COOKIE));
  } catch {}
  let isAdmin = false;
  if (!user) {
    try {
      isAdmin = await isValidSession(env, getCookie(request, SESSION_COOKIE));
    } catch {}
  }
  if (!user && !isAdmin) return json({ ok: false, error: 'login' }, 401);

  const identity = user ? 'u' + user.userId : 'admin';
  if (overRate(identity)) return json({ ok: false, error: '发送太频繁了，休息一下再试' }, 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const messages = sanitize(body && body.messages);
  if (!messages) return json({ ok: false, error: '没有有效的消息内容' }, 400);

  let s;
  try {
    s = await getAiStatus(env);
  } catch {
    return json({ ok: false, error: 'AI 配置读取失败，请稍后再试' }, 500);
  }
  if (!s.usable) return json({ ok: false, error: 'AI 对话还没有配置好，请等待站长在后台接入' }, 503);

  const { url, init } = buildUpstreamRequest(s, messages, true);
  let upstream;
  try {
    upstream = await fetch(url, init);
  } catch {
    return json({ ok: false, error: '连不上 AI 服务商，请稍后再试' }, 502);
  }
  if (!upstream.ok) {
    let detail = '';
    try {
      const t = await upstream.text();
      try {
        detail = extractUpstreamError(s.protocol, t) || t.slice(0, 200);
      } catch {}
    } catch {}
    const friendly = /invalid|incorrect/i.test(detail) && /api key/i.test(detail)
      ? 'AI 服务商拒绝了 API Key，请到后台检查'
      : 'AI 服务商返回错误（HTTP ' + upstream.status + '）';
    return json({ ok: false, error: friendly, detail }, 502);
  }

  return new Response(upstream.body.pipeThrough(sseNormalizer(s.protocol)), {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}

// 非流式错误体里的错误信息（chat.js 内部用）
function extractUpstreamError(protocol, text) {
  try {
    const j = JSON.parse(text);
    if (j && j.error) {
      if (typeof j.error === 'string') return j.error;
      if (j.error.message) return j.error.message;
    }
    if (protocol === 'anthropic' && j && j.type === 'error' && j.error) return j.error.message;
  } catch {}
  return null;
}
