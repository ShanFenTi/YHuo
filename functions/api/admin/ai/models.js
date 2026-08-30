// POST /api/admin/ai/models → 用（草稿或已保存的）配置拉取服务商模型列表
// 入参 {protocol?, base_url?, api_key?} 可只传草稿值，缺省回落到已保存配置；不做任何保存
// OpenAI 兼容：GET {base}/models（Bearer）；Anthropic：GET {base}/models（x-api-key）。两者都返回 {data:[{id}]}
import { json } from '../../../lib/util.js';
import { getAiStatus, AI_PROTOCOLS, PROTOCOL_BASES } from '../../../lib/ai.js';

export async function onRequestPost({ request, env }) {
  let body = {};
  try {
    body = await request.json();
  } catch {}

  const s = await getAiStatus(env);
  const protocol = AI_PROTOCOLS.includes(body.protocol) ? body.protocol : s.protocol;
  const baseUrl = String(body.base_url || '').trim() || PROTOCOL_BASES[protocol];
  const apiKey = String(body.api_key || '').trim() || s.apiKey;
  if (!apiKey) return json({ ok: false, error: '先填 API Key（或使用后台已保存的 Key）' });

  const url = baseUrl.replace(/\/+$/, '') + '/models';
  const headers = protocol === 'anthropic'
    ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
    : { authorization: 'Bearer ' + apiKey };

  let res;
  try {
    res = await fetch(url, { headers });
  } catch {
    return json({ ok: false, error: '连不上 ' + url + '（检查地址/网络）' });
  }
  if (!res.ok) {
    return json({ ok: false, error: 'HTTP ' + res.status + '（服务商可能不开放模型列表，可手动填写模型名）' });
  }
  try {
    const j = await res.json();
    const arr = Array.isArray(j.data) ? j.data : Array.isArray(j.models) ? j.models : [];
    const ids = arr
      .map((m) => (typeof m === 'string' ? m : m && m.id))
      .filter((x) => typeof x === 'string' && x);
    if (!ids.length) return json({ ok: false, error: '服务商返回了空列表，可手动填写模型名' });
    return json({ ok: true, models: ids.sort().slice(0, 200) });
  } catch {
    return json({ ok: false, error: '响应不是 JSON，请确认地址指向 API；也可手动填写模型名' });
  }
}
