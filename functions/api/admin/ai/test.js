// POST /api/admin/ai/test → 用已保存的配置真发一条消息，验证连通性
// 前端流程：先 PUT 保存，再调本接口
import { json } from '../../../lib/util.js';
import { getAiStatus, buildUpstreamRequest } from '../../../lib/ai.js';

const TEST_PROMPT = [{ role: 'user', content: '你好，请只回复四个字：连接成功' }];

export async function onRequestPost({ env }) {
  const s = await getAiStatus(env);
  if (!s.enabled) return json({ ok: false, error: 'AI 当前处于停用状态，先打开开关' });
  if (!s.apiKey || !s.model) return json({ ok: false, error: '请先保存 API Key 和模型名' });

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
    return json({ ok: true, reply: reply.slice(0, 100), ms });
  } catch {
    return json({ ok: false, error: '上游响应不是合法 JSON，请确认接口地址指向 API 而非网页' });
  }
}
