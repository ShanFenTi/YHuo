// GET /api/ai/config → 前台判断 AI 是否可用（不含任何敏感信息）
import { json } from '../../lib/util.js';
import { getAiStatus } from '../../lib/ai.js';

export async function onRequestGet({ env }) {
  try {
    const s = await getAiStatus(env);
    return json({ ok: true, enabled: s.usable, model: s.usable ? s.model : null });
  } catch {
    return json({ ok: true, enabled: false, model: null });
  }
}
