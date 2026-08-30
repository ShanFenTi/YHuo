// POST /api/admin/ai/test → 用指定供应商（或默认模型）真发一条消息，验证连通性
// 入参 {name: 供应商名} 或 {key: "供应商/模型"}；前端流程：先 PUT 保存，再调本接口
import { json } from '../../../lib/util.js';
import { getAiProviders, pickModel, buildUpstreamRequest } from '../../../lib/ai.js';

const TEST_PROMPT = [{ role: 'user', content: '你好，请只回复四个字：连接成功' }];

export async function onRequestPost({ request, env }) {
  let body = {};
  try {
    body = await request.json();
  } catch {}
  const wanted = typeof body.key === 'string' && body.key.includes('/')
    ? body.key.slice(0, 140)
    : (typeof body.name === 'string' ? body.name.slice(0, 30) : null);

  const { enabled, providers } = await getAiProviders(env);
  if (!enabled) return json({ ok: false, error: 'AI 当前处于停用状态，先打开开关' });
  // 只给供应商名时探测它的第一个模型
  let key = wanted;
  if (key && !key.includes('/')) {
    const p = providers.find((x) => x.name === key);
    key = p && p.models.length ? p.name + '/' + p.models[0] : null;
  }
  const s = pickModel(providers, key);
  if (!s || !s.apiKey || !s.model) {
    return json({ ok: false, error: (wanted ? '「' + wanted + '」没有可测试的模型，或缺少 API Key' : '还没有可测试的模型') });
  }

  const { url, init } = buildUpstreamRequest(s, TEST_PROMPT, false); // 测试用非流式，解析简单
  const started = Date.now();
  let res;
  try {
    res = await fetch(url, init);
  } catch {
    return json({ ok: false, error: '连不上 ' + url + '（检查地址/网络）' });
  }
  const ms = Date.now() - started;
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {}
    return json({ ok: false, error: 'HTTP ' + res.status + (detail ? '：' + detail : '') });
  }
  try {
    const j = await res.json();
    if (j.error) {
      const msg = typeof j.error === 'string' ? j.error : j.error.message || '上游返回错误';
      return json({ ok: false, error: msg });
    }
    let reply = '';
    if (s.protocol === 'anthropic') {
      reply = (j.content || []).map((b) => (b && b.type === 'text' ? b.text : '')).join('');
    } else {
      const c = j.choices && j.choices[0];
      reply = (c && ((c.message && c.message.content) || (c.delta && c.delta.content))) || '';
    }
    if (!reply) return json({ ok: false, error: '上游响应里没有正文，请检查模型名是否正确' });
    return json({ ok: true, reply: reply.slice(0, 100), ms, name: s.name });
  } catch {
    return json({ ok: false, error: '上游响应不是合法 JSON，请确认接口地址指向 API 而非网页' });
  }
}
