// GET /api/ai/config → 前台判断 AI 可用状态 + 可切换的模型列表（不含任何敏感信息）
import { json } from '../../lib/util.js';
import { getAiProfiles } from '../../lib/ai.js';

export async function onRequestGet({ env }) {
  try {
    const { enabled, profiles, defaultName } = await getAiProfiles(env);
    // 可用档案 = 有 key 有模型名
    const usable = profiles
      .filter((p) => (p.api_key || '').trim() && (p.model || '').trim())
      .map((p) => ({ name: p.name, model: p.model }));
    const on = enabled && usable.length > 0;
    return json({ ok: true, enabled: on, model: on ? defaultName : null, models: on ? usable : [] });
  } catch {
    return json({ ok: true, enabled: false, model: null, models: [] });
  }
}
