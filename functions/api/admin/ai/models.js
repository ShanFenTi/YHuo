// POST /api/admin/ai/models → 用（草稿值或指定档案的）配置拉取服务商模型列表
// 入参 {name?, protocol?, base_url?, api_key?}：草稿值优先，api_key 留空时回落到 name 指定档案的已存 Key；不落库
// OpenAI 兼容：GET {base}/models（Bearer）；Anthropic：GET {base}/models（x-api-key）。两者都返回 {data:[{id}]}
import { json } from '../../../lib/util.js';
import { getAiProviders, AI_PROTOCOLS, PROTOCOL_BASES } from '../../../lib/ai.js';

export async function onRequestPost({ request, env }) {
  let body = {};
  try {
    body = await request.json();
  } catch {}

  const { providers } = await getAiProviders(env);
  const wanted = typeof body.name === 'string' ? body.name.slice(0, 30) : null;
  const saved = wanted ? providers.find((p) => p.name === wanted) : null;

  const protocol = AI_PROTOCOLS.includes(body.protocol) ? body.protocol : (saved ? saved.protocol : 'openai');
  const baseUrl = String(body.base_url || '').trim()
    || (saved ? (saved.base_url || '').trim() : '')
    || PROTOCOL_BASES[protocol];
  const apiKey = String(body.api_key || '').trim() || (saved ? (saved.api_key || '').trim() : '');
  if (!apiKey) return json({ ok: false, error: '先填 API Key（或使用该档案已保存的 Key）' });

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
