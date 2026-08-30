// GET /api/ai/config → 前台判断 AI 可用状态 + 可切换的模型清单（不含任何敏感信息）
// models: [{provider, name, key}]，key = "供应商/模型"，前端切换时原样回传
import { json } from '../../lib/util.js';
import { getAiProviders, listProviderModels } from '../../lib/ai.js';

export async function onRequestGet({ env }) {
  try {
    const { enabled, providers, defaultKey } = await getAiProviders(env);
    const models = listProviderModels(providers);
    const on = enabled && models.length > 0;
    return json({ ok: true, enabled: on, model: on ? defaultKey : null, models: on ? models : [] });
  } catch {
    return json({ ok: true, enabled: false, model: null, models: [] });
  }
}
