// AI 对话：供应商配置读取 + 上游协议适配（OpenAI 兼容 / Anthropic）+ 流式归一化
// 配置存 site_settings（后台"AI"标签页维护），key 永不下发给前端
// 数据模型：ai_models = 供应商数组 [{name, protocol, base_url, api_key, enabled, system_prompt, models:[模型id]}]
//          ai_default = 默认模型键 "供应商名/模型id"，ai_enabled = 全局开关
// 旧版单配置键、旧版扁平档案（每档案一个模型）读取时自动迁移，首次保存后落为新格式
import { ensureSchema } from './migrate.js';

export const AI_PROTOCOLS = ['openai', 'anthropic'];

// 各协议的默认接口地址（后台 Base URL 留空时使用）
export const PROTOCOL_BASES = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
};

export function modelKey(providerName, modelId) {
  return providerName + '/' + modelId;
}

export async function getAiProviders(env) {
  await ensureSchema(env);
  const { results } = await env.DB.prepare(
    "SELECT key, value FROM site_settings WHERE key IN ('ai_models','ai_enabled','ai_default','ai_protocol','ai_base_url','ai_api_key','ai_model','ai_system_prompt')"
  ).all();
  const map = {};
  for (const r of results) map[r.key] = r.value;
  const enabled = map.ai_enabled !== '0';

  let providers = [];
  try {
    providers = JSON.parse(map.ai_models || '[]');
  } catch {
    providers = [];
  }
  if (!Array.isArray(providers)) providers = [];
  providers = providers.filter((p) => p && typeof p === 'object' && p.name);

  if (providers.length && !providers.some((p) => Array.isArray(p.models))) {
    // 旧版扁平档案（name/protocol/base_url/api_key/model/system_prompt，每档案一个模型）
    providers = providers
      .filter((p) => (p.model || '').trim())
      .map((p) => ({
        name: p.name,
        protocol: p.protocol,
        base_url: p.base_url || '',
        api_key: p.api_key || '',
        enabled: p.enabled !== false,
        system_prompt: p.system_prompt || '',
        models: [(p.model || '').trim()],
      }));
  }
  if (!providers.length && map.ai_api_key && map.ai_model) {
    // 最早的行业单配置键
    providers = [{
      name: '默认供应商',
      protocol: AI_PROTOCOLS.includes(map.ai_protocol) ? map.ai_protocol : 'openai',
      base_url: (map.ai_base_url || '').trim(),
      api_key: (map.ai_api_key || '').trim(),
      enabled: true,
      system_prompt: (map.ai_system_prompt || '').trim(),
      models: [(map.ai_model || '').trim()],
    }];
  }
  // 规整字段
  providers = providers.map((p) => ({
    name: String(p.name).slice(0, 30),
    protocol: AI_PROTOCOLS.includes(p.protocol) ? p.protocol : 'openai',
    base_url: (p.base_url || '').trim(),
    api_key: (p.api_key || '').trim(),
    enabled: p.enabled !== false,
    system_prompt: (p.system_prompt || '').trim(),
    models: Array.isArray(p.models) ? p.models.map((m) => String(m).trim()).filter(Boolean).slice(0, 20) : [],
  })).filter((p) => p.models.length);

  // 默认模型键：兼容旧值（纯档案名 → 该档案第一个模型）
  let defaultKey = map.ai_default || '';
  const keys = [];
  for (const p of providers) for (const m of p.models) keys.push(modelKey(p.name, m));
  if (keys.length && !keys.includes(defaultKey)) {
    const byName = providers.find((p) => p.name === defaultKey);
    defaultKey = byName ? modelKey(byName.name, byName.models[0]) : (keys.includes(defaultKey) ? defaultKey : keys[0]);
  }
  if (!keys.length) defaultKey = '';
  return { enabled, providers, defaultKey };
}

// 供应商统一补全默认值，供上游调用
function normalizeUpstream(p, modelId) {
  const protocol = AI_PROTOCOLS.includes(p.protocol) ? p.protocol : 'openai';
  return {
    name: p.name,
    protocol,
    baseUrl: (p.base_url || '').trim() || PROTOCOL_BASES[protocol],
    apiKey: (p.api_key || '').trim(),
    model: modelId,
    systemPrompt: (p.system_prompt || '').trim(),
  };
}

// 按键 "供应商/模型" 取上游配置；key 为空取第一个可用模型；
// key 指定了但不存在/不可用时返回 null（不静默回落，由调用方决定回退顺序）
export function pickModel(providers, key) {
  const list = Array.isArray(providers) ? providers : [];
  const usable = list.filter((p) => p.enabled !== false && (p.api_key || '').trim() && (p.models || []).length);
  if (!usable.length) return null;
  if (key && typeof key === 'string' && key.includes('/')) {
    const idx = key.indexOf('/');
    const p = usable.find((x) => x.name === key.slice(0, idx));
    const mi = key.slice(idx + 1);
    if (p && p.models.includes(mi)) return normalizeUpstream(p, mi);
    return null;
  }
  return normalizeUpstream(usable[0], usable[0].models[0]);
}

// 可切换的模型清单（前台菜单用，不含敏感信息）：{provider, name, key}
export function listProviderModels(providers) {
  const list = Array.isArray(providers) ? providers : [];
  const out = [];
  for (const p of list) {
    if (p.enabled === false || !(p.api_key || '').trim()) continue;
    for (const m of p.models || []) out.push({ provider: p.name, name: m, key: modelKey(p.name, m) });
  }
  return out;
}

// ---------- 上游请求构造 ----------
// upstream: {protocol, baseUrl, apiKey, model, systemPrompt}；messages: [{role, content}]
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
