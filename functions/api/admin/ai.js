// GET /api/admin/ai → 当前 AI 配置（key 不回传，只回 has_key + 尾 4 位）
// PUT /api/admin/ai { protocol?, base_url?, api_key?, model?, system_prompt?, enabled?, clear_key? }
// api_key 传空 = 保持不变（避免改其他项误覆盖）；clear_key: true = 清除
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';
import { getAiStatus, AI_PROTOCOLS } from '../../lib/ai.js';

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

export async function onRequestGet({ env }) {
  const s = await getAiStatus(env);
  return json({
    ok: true,
    protocol: s.protocol,
    protocol_label: PROTOCOL_LABELS[s.protocol],
    base_url: s.baseUrl === protocolDefaultBase(s.protocol) ? '' : s.baseUrl,
    has_key: !!s.apiKey,
    key_hint: s.apiKey ? '····' + s.apiKey.slice(-4) : '',
    model: s.model || '',
    system_prompt: s.systemPrompt || '',
    enabled: s.enabled,
    usable: s.usable,
  });
}

// 返回协议默认地址（与 lib/ai.js 的默认一致，用于把默认地址显示为"留空"）
function protocolDefaultBase(protocol) {
  return protocol === 'anthropic' ? 'https://api.anthropic.com/v1' : 'https://api.openai.com/v1';
}

export async function onRequestPut({ request, env }) {
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }

  if (body.protocol !== undefined) {
    if (!AI_PROTOCOLS.includes(body.protocol)) return json({ ok: false, error: '未知协议' }, 400);
    await setSetting(env, 'ai_protocol', body.protocol);
  }

  if (body.base_url !== undefined) {
    const url = String(body.base_url || '').trim();
    if (!url) {
      await delSetting(env, 'ai_base_url'); // 留空 = 用协议默认地址
    } else if (!/^https?:\/\//i.test(url)) {
      return json({ ok: false, error: '接口地址要以 http(s):// 开头' }, 400);
    } else {
      await setSetting(env, 'ai_base_url', url);
    }
  }

  if (body.clear_key === true) {
    await delSetting(env, 'ai_api_key');
  } else if (body.api_key !== undefined && String(body.api_key).trim()) {
    await setSetting(env, 'ai_api_key', String(body.api_key).trim());
  }

  if (body.model !== undefined) {
    const model = String(body.model || '').trim().slice(0, 100);
    if (model) await setSetting(env, 'ai_model', model);
    else await delSetting(env, 'ai_model');
  }

  if (body.system_prompt !== undefined) {
    const sp = String(body.system_prompt || '').trim().slice(0, 2000);
    if (sp) await setSetting(env, 'ai_system_prompt', sp);
    else await delSetting(env, 'ai_system_prompt');
  }

  if (body.enabled !== undefined) {
    await setSetting(env, 'ai_enabled', body.enabled ? '1' : '0');
  }

  const s = await getAiStatus(env);
  return json({
    ok: true,
    enabled: s.enabled,
    has_key: !!s.apiKey,
    key_hint: s.apiKey ? '····' + s.apiKey.slice(-4) : '',
    usable: s.usable,
  });
}
