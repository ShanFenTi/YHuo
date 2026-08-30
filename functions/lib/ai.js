// AI 对话：配置读取 + 上游协议适配（OpenAI 兼容 / Anthropic）+ 流式归一化
// 配置存在 site_settings 表（后台"AI"标签页维护），key 永不下发给前端
import { ensureSchema } from './migrate.js';

export const AI_PROTOCOLS = ['openai', 'anthropic'];

// 各协议的默认接口地址（后台 Base URL 留空时使用）
const PROTOCOL_BASES = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
};

async function readSettings(env) {
  await ensureSchema(env);
  const { results } = await env.DB.prepare('SELECT key, value FROM site_settings WHERE key LIKE ?').bind('ai_%').all();
  const map = {};
  for (const r of results) map[r.key] = r.value;
  const protocol = AI_PROTOCOLS.includes(map.ai_protocol) ? map.ai_protocol : 'openai';
  const baseUrl = (map.ai_base_url || '').trim() || PROTOCOL_BASES[protocol];
  return {
    protocol,
    baseUrl,
    apiKey: (map.ai_api_key || '').trim(),
    model: (map.ai_model || '').trim(),
    systemPrompt: (map.ai_system_prompt || '').trim(),
    enabled: map.ai_enabled !== '0',
  };
}

// 是否已配置到可以发起对话（开关打开 + key + 模型名）
export async function getAiStatus(env) {
  const s = await readSettings(env);
  const usable = s.enabled && !!s.apiKey && !!s.model;
  return { ...s, usable };
}

// ---------- 上游请求构造 ----------
// messages: [{role:'user'|'assistant', content}]，调用方已做条数/长度截断
export function buildUpstreamRequest(s, messages, stream) {
  if (s.protocol === 'anthropic') {
    // Anthropic 原生：system 提示词是独立字段；消息必须 user 开头、严格交替
    const msgs = [];
    for (const m of messages) {
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      if (msgs.length && msgs[msgs.length - 1].role === role) {
        msgs[msgs.length - 1].content += '\n\n' + m.content;
      } else {
        msgs.push({ role, content: m.content });
      }
    }
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    const body = { model: s.model, max_tokens: 2048, stream: !!stream, messages: msgs };
    if (s.systemPrompt) body.system = s.systemPrompt;
    return {
      url: s.baseUrl.replace(/\/+$/, '') + '/messages',
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': s.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      },
    };
  }
  // OpenAI 兼容（OpenAI/GLM/DeepSeek/Kimi/Gemini 兼容端点等）：system 提示词作为第一条消息
  const msgs = [];
  if (s.systemPrompt) msgs.push({ role: 'system', content: s.systemPrompt });
  for (const m of messages) msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
  return {
    url: s.baseUrl.replace(/\/+$/, '') + '/chat/completions',
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + s.apiKey },
      body: JSON.stringify({ model: s.model, stream: !!stream, messages: msgs }),
    },
  };
}

// 从上游各协议的流式/整段 JSON 里抽正文文本；返回 null 表示该包没有正文
export function extractText(protocol, j) {
  if (!j || typeof j !== 'object') return null;
  if (j.error) return null; // 错误包由 extractError 处理
  if (protocol === 'anthropic') {
    if (j.type === 'content_block_delta' && j.delta && typeof j.delta.text === 'string') return j.delta.text;
    if (!j.type && Array.isArray(j.content)) {
      return j.content.map((b) => (b && b.type === 'text' ? b.text : '')).join('') || null;
    }
    return null;
  }
  const c = j.choices && j.choices[0];
  if (!c) return null;
  if (c.delta && typeof c.delta.content === 'string' && c.delta.content) return c.delta.content;
  if (c.message && typeof c.message.content === 'string' && c.message.content) return c.message.content;
  return null;
}

// 上游错误信息提取（流中 error 事件或非 2xx 响应体）
export function extractError(protocol, j) {
  if (j && typeof j === 'object' && j.error) {
    if (typeof j.error === 'string') return j.error;
    if (j.error.message) return j.error.message;
  }
  if (protocol === 'anthropic' && j && j.type === 'error' && j.error && j.error.message) return j.error.message;
  return null;
}

// ---------- 流式归一化 ----------
// 把上游 SSE 转成统一格式发给前端：data: {"delta":"..."} 每行一个增量，
// data: {"error":"..."} 上游报错，data: [DONE] 结束。前端只解析这一种格式。
export function sseNormalizer(protocol) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  let errored = false;
  let finished = false;
  return new TransformStream({
    transform(chunk, controller) {
      if (finished) return;
      buffer += decoder.decode(chunk, { stream: true });
      let idx;
      // 逐行处理（SSE 事件以空行分隔，但两种协议的 data 都占一行，逐行即可）
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).replace(/\r$/, '').trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        if (data === '[DONE]') {
          finished = true;
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          return;
        }
        let j;
        try {
          j = JSON.parse(data);
        } catch {
          continue; // 忽略上游偶发的非 JSON 心跳行
        }
        const err = extractError(protocol, j);
        if (err) {
          if (!errored) {
            errored = true;
            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ error: err }) + '\n\n'));
          }
          continue;
        }
        const delta = extractText(protocol, j);
        if (delta) controller.enqueue(encoder.encode('data: ' + JSON.stringify({ delta }) + '\n\n'));
      }
    },
  });
}
