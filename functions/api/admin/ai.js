// 多模型档案管理（存 site_settings：ai_models JSON 数组 + ai_default + ai_enabled）
// GET  /api/admin/ai → 档案列表（Key 不回传，只回 has_key + 尾 4 位）
// PUT  /api/admin/ai
//   {enabled:true|false}                        → 全局开关
//   {action:'save', profile:{name,protocol,base_url,api_key,model,system_prompt}} → 新增/更新（api_key 留空 = 保留原 Key）
//   {action:'delete', name}                     → 删除档案
//   {action:'default', name}                    → 设为默认
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';
import { getAiProfiles, AI_PROTOCOLS } from '../../lib/ai.js';

const MAX_PROFILES = 10;
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

async function saveProfiles(env, profiles, defaultName) {
  await setSetting(env, 'ai_models', JSON.stringify(profiles));
  // 档案落库后，老的单配置键不再有 readers（getAiProfiles 只在无档案时读），清掉避免双源混淆
  for (const k of ['ai_api_key', 'ai_model', 'ai_protocol', 'ai_base_url', 'ai_system_prompt']) {
    await delSetting(env, k);
  }
  if (defaultName) await setSetting(env, 'ai_default', defaultName);
}

function publicProfile(p) {
  const hasKey = !!(p.api_key || '').trim();
  return {
    name: p.name,
    protocol: AI_PROTOCOLS.includes(p.protocol) ? p.protocol : 'openai',
    protocol_label: PROTOCOL_LABELS[AI_PROTOCOLS.includes(p.protocol) ? p.protocol : 'openai'],
    base_url: p.base_url || '',
    model: p.model || '',
    system_prompt: p.system_prompt || '',
    has_key: hasKey,
    key_hint: hasKey ? '····' + p.api_key.trim().slice(-4) : '',
  };
}

export async function onRequestGet({ env }) {
  const { enabled, profiles, defaultName } = await getAiProfiles(env);
  return json({
    ok: true,
    enabled,
    default: defaultName,
    profiles: profiles.map(publicProfile),
    usable: profiles.some((p) => (p.api_key || '').trim() && (p.model || '').trim()),
  });
}

// 校验并归一化待保存档案；失败返回 {error}，成功返回 {profile}
function normalizeProfile(raw) {
  if (!raw || typeof raw !== 'object') return { error: '请求格式错误' };
  const name = String(raw.name || '').trim().slice(0, 30);
  if (!name) return { error: '模型名称不能为空' };
  if (!AI_PROTOCOLS.includes(raw.protocol)) return { error: '未知协议' };
  const base_url = String(raw.base_url || '').trim();
  if (base_url && !/^https?:\/\//i.test(base_url)) return { error: '接口地址要以 http(s):// 开头' };
  const model = String(raw.model || '').trim().slice(0, 100);
  if (!model) return { error: '模型名不能为空' };
  return {
    profile: {
      name,
      protocol: raw.protocol,
      base_url,
      api_key: String(raw.api_key || '').trim().slice(0, 300),
      model,
      system_prompt: String(raw.system_prompt || '').trim().slice(0, 2000),
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
  const state = await getAiProfiles(env);
  let profiles = state.profiles;

  // 全局开关（和档案操作可同请求出现，开关在前）
  if (body.enabled !== undefined) {
    await setSetting(env, 'ai_enabled', body.enabled ? '1' : '0');
    state.enabled = !!body.enabled;
  }

  if (body.action === 'save') {
    const norm = normalizeProfile(body.profile);
    if (norm.error) return json({ ok: false, error: norm.error }, 400);
    const np = norm.profile;
    const idx = profiles.findIndex((p) => p.name === np.name);
    if (idx >= 0) {
      if (!np.api_key) np.api_key = profiles[idx].api_key || ''; // 留空 = 保留原 Key
      profiles[idx] = np;
    } else {
      if (!np.api_key) return json({ ok: false, error: '请填写 API Key' }, 400);
      if (profiles.length >= MAX_PROFILES) return json({ ok: false, error: '最多 ' + MAX_PROFILES + ' 个模型档案' }, 400);
      profiles.push(np);
    }
    await saveProfiles(env, profiles, state.defaultName || np.name);
    return json({ ok: true, name: np.name, default: state.defaultName || np.name, key_hint: '····' + np.api_key.slice(-4) });
  }

  if (body.action === 'delete') {
    const name = String(body.name || '').slice(0, 30);
    const next = profiles.filter((p) => p.name !== name);
    if (next.length === profiles.length) return json({ ok: false, error: '档案不存在' }, 404);
    const defaultName = state.defaultName === name ? (next[0] ? next[0].name : null) : state.defaultName;
    await saveProfiles(env, next, defaultName);
    return json({ ok: true, default: defaultName });
  }

  if (body.action === 'default') {
    const name = String(body.name || '').slice(0, 30);
    if (!profiles.some((p) => p.name === name)) return json({ ok: false, error: '档案不存在' }, 404);
    await setSetting(env, 'ai_default', name);
    return json({ ok: true, default: name });
  }

  const { enabled } = await getAiProfiles(env);
  return json({ ok: true, enabled });
}
