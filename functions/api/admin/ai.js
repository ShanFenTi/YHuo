// 供应商管理（存 site_settings：ai_models 供应商数组 + ai_default 模型键 + ai_enabled 全局开关）
// GET  /api/admin/ai → 供应商列表（Key 不回传，只回 has_key + 尾 4 位）
// PUT  /api/admin/ai
//   {action:'global', enabled:true|false}         → 全局开关（显式动作，与单供应商 toggle 的 enabled 字段不再共用语义）
//   {enabled:true|false}                          → 旧写法全局开关（兼容，仅无 action 时生效）
//   {action:'save', provider:{name,protocol,base_url,api_key,system_prompt,models:[id]}} → 新增/更新（api_key 留空 = 保留原 Key）
//   {action:'rename', from, to}                   → 重命名供应商（保留全部配置）
//   {action:'toggle', name, enabled}              → 启用/停用单个供应商
//   {action:'delete', name}                       → 删除供应商
//   {action:'default', key}                       → 设默认模型（"供应商/模型"）
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';
import { getAiProviders, AI_PROTOCOLS, modelKey, normalizeModelList } from '../../lib/ai.js';

const MAX_PROVIDERS = 10;
const MAX_MODELS = 20;

const PROTOCOL_LABELS = { openai: 'OpenAI 兼容', anthropic: 'Anthropic' };

async function setSetting(env, key, value) {
  await env.DB
    .prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, value)
    .run();
}

async function delSetting(env, key) {
  await env.DB.prepare('DELETE FROM site_settings WHERE key = ?').bind(key).run();
}

async function saveProviders(env, providers, defaultKey) {
  await setSetting(env, 'ai_models', JSON.stringify(providers));
  // 新格式落库后，老的单配置键不再有 readers（getAiProviders 只在无数据时读），清掉避免双源混淆
  for (const k of ['ai_api_key', 'ai_model', 'ai_protocol', 'ai_base_url', 'ai_system_prompt']) {
    await delSetting(env, k);
  }
  if (defaultKey) await setSetting(env, 'ai_default', defaultKey);
}

function publicProvider(p) {
  const hasKey = !!(p.api_key || '').trim();
  return {
    name: p.name,
    protocol: p.protocol,
    protocol_label: PROTOCOL_LABELS[p.protocol],
    base_url: p.base_url || '',
    system_prompt: p.system_prompt || '',
    enabled: p.enabled !== false,
    models: p.models || [],
    has_key: hasKey,
    key_hint: hasKey ? '····' + p.api_key.trim().slice(-4) : '',
  };
}

export async function onRequestGet({ env }) {
  const { enabled, providers, defaultKey } = await getAiProviders(env);
  const usable = providers.some((p) => p.enabled !== false && (p.api_key || '').trim() && p.models.length);
  return json({
    ok: true,
    enabled,
    default: defaultKey,
    providers: providers.map(publicProvider),
    usable,
  });
}

// 校验并归一化待保存供应商；失败返回 {error}，成功返回 {provider}
function normalizeProvider(raw) {
  if (!raw || typeof raw !== 'object') return { error: '请求格式错误' };
  const name = String(raw.name || '').trim().slice(0, 30);
  if (!name) return { error: '供应商名称不能为空' };
  if (!AI_PROTOCOLS.includes(raw.protocol)) return { error: '未知 API 格式' };
  const base_url = String(raw.base_url || '').trim();
  if (base_url && !/^https?:\/\//i.test(base_url)) return { error: '接口地址要以 http(s):// 开头' };
  const models = normalizeModelList(raw.models);
  if (models.length > MAX_MODELS) return { error: '每个供应商最多 ' + MAX_MODELS + ' 个模型' };
  return {
    provider: {
      name,
      protocol: raw.protocol,
      base_url,
      api_key: String(raw.api_key || '').trim().slice(0, 300),
      system_prompt: String(raw.system_prompt || '').trim().slice(0, 2000),
      enabled: raw.enabled !== false,
      models,
    },
  };
}

export async function onRequestPut({ request, env }) {
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const state = await getAiProviders(env);
  let providers = state.providers;

  // 全局开关：显式 action:'global'（不再靠"无 action 的裸 enabled"猜意图，
  // 避免与 toggle 等动作里的 enabled 字段混淆——曾因此停用单个供应商把整个 AI 关掉）。
  // 兼容旧写法 {enabled} 无 action（同一后台版本部署期间的前端旧缓存）
  if (body.action === 'global') {
    await setSetting(env, 'ai_enabled', body.enabled !== false ? '1' : '0');
    state.enabled = body.enabled !== false;
  } else if (body.enabled !== undefined && !body.action) {
    await setSetting(env, 'ai_enabled', body.enabled ? '1' : '0');
    state.enabled = !!body.enabled;
  }

  if (body.action === 'save') {
    const norm = normalizeProvider(body.provider);
    if (norm.error) return json({ ok: false, error: norm.error }, 400);
    const np = norm.provider;
    if (!np.models.length) return json({ ok: false, error: '至少要有一个模型' }, 400);
    const idx = providers.findIndex((p) => p.name === np.name);
    if (idx >= 0) {
      if (!np.api_key) np.api_key = providers[idx].api_key || ''; // 留空 = 保留原 Key
      providers[idx] = np;
    } else {
      if (!np.api_key) return json({ ok: false, error: '请填写 API Key' }, 400);
      if (providers.length >= MAX_PROVIDERS) return json({ ok: false, error: '最多 ' + MAX_PROVIDERS + ' 个供应商' }, 400);
      providers.push(np);
    }
    // 默认键失效（供应商被改没了原模型）时回落到它的第一个模型
    const allKeys = [];
    for (const p of providers) for (const m of p.models) allKeys.push(modelKey(p.name, m.id));
    const defaultKey = allKeys.includes(state.defaultKey) ? state.defaultKey : modelKey(np.name, np.models[0]);
    await saveProviders(env, providers, defaultKey);
    return json({ ok: true, name: np.name, default: defaultKey, key_hint: '····' + np.api_key.slice(-4) });
  }

  if (body.action === 'rename') {
    const from = String(body.from || '').trim().slice(0, 30);
    const to = String(body.to || '').trim().slice(0, 30);
    if (!to) return json({ ok: false, error: '新名称不能为空' }, 400);
    const p = providers.find((x) => x.name === from);
    if (!p) return json({ ok: false, error: '供应商不存在' }, 404);
    if (providers.some((x) => x.name === to)) return json({ ok: false, error: '名称已存在' }, 400);
    p.name = to;
    const defaultKey = state.defaultKey.startsWith(from + '/')
      ? to + state.defaultKey.slice(from.length)
      : state.defaultKey;
    await saveProviders(env, providers, defaultKey);
    return json({ ok: true, name: to, default: defaultKey });
  }

  if (body.action === 'toggle') {
    const name = String(body.name || '').trim().slice(0, 30);
    const p = providers.find((x) => x.name === name);
    if (!p) return json({ ok: false, error: '供应商不存在' }, 404);
    p.enabled = body.enabled !== false;
    await saveProviders(env, providers, state.defaultKey);
    return json({ ok: true, name, enabled: p.enabled });
  }

  if (body.action === 'delete') {
    const name = String(body.name || '').trim().slice(0, 30);
    const next = providers.filter((p) => p.name !== name);
    if (next.length === providers.length) return json({ ok: false, error: '供应商不存在' }, 404);
    let defaultKey = state.defaultKey;
    const allKeys = [];
    for (const p of next) for (const m of p.models) allKeys.push(modelKey(p.name, m.id));
    if (!allKeys.includes(defaultKey)) defaultKey = allKeys[0] || '';
    await saveProviders(env, next, defaultKey);
    return json({ ok: true, default: defaultKey });
  }

  if (body.action === 'default') {
    const key = String(body.key || '').slice(0, 140);
    const ok = providers.some((p) => p.models.includes(key.slice(p.name.length + 1)) && key.startsWith(p.name + '/'));
    if (!ok) return json({ ok: false, error: '模型不存在' }, 404);
    await setSetting(env, 'ai_default', key);
    return json({ ok: true, default: key });
  }

  return json({ ok: true, enabled: state.enabled });
}
