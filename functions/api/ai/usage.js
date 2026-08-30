// POST /api/ai/usage → 前台把流里拿到的 token 用量上报进来（需登录，与 /api/ai/chat 同鉴权）
// 入参 {key: "供应商/模型", prompt_tokens, completion_tokens}；按 北京时间day+供应商+模型 累加
import { json, getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { USER_COOKIE, getUserSession, isValidSession } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

const MAX_TOKENS = 10000000; // 单条上报上限（防伪造刷库）

function num(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_TOKENS) : 0;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: 'no db' }, 503);

  // 与 chat 相同的鉴权：前台用户会话或管理员会话
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

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad request' }, 400);
  }
  const key = typeof body.key === 'string' ? body.key.slice(0, 140) : '';
  const idx = key.indexOf('/');
  if (idx <= 0) return json({ ok: false, error: 'bad key' }, 400);
  const provider = key.slice(0, idx).slice(0, 30);
  const model = key.slice(idx + 1).slice(0, 100);
  const prompt = num(body.prompt_tokens);
  const completion = num(body.completion_tokens);
  if (!prompt && !completion) return json({ ok: false, error: 'no usage' }, 400);

  const day = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // 北京时间
  try {
    await ensureSchema(env);
    await env.DB
      .prepare(
        'INSERT INTO ai_usage_daily (day, provider, model, calls, prompt_tokens, completion_tokens) ' +
        'VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT(day, provider, model) DO UPDATE SET ' +
        'calls = calls + 1, prompt_tokens = prompt_tokens + excluded.prompt_tokens, ' +
        'completion_tokens = completion_tokens + excluded.completion_tokens'
      )
      .bind(day, provider, model, prompt, completion)
      .run();
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'record failed' }, 500);
  }
}
