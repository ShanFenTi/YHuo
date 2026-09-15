// POST /api/admin/ai/complete → 非流式补全（2026-09-15 站长效率批次）
// 入参 {prompt}（≤6000 字）或 {prompt, key:"供应商/模型"}；用默认模型补全一段，返回全文。
// 服务后台两处按钮：随笔编辑区「AI 润色」、概览页「AI 总结今日留言」。与 test.js 同链路
//（getAiProviders/pickModel/buildUpstreamRequest，stream=false），但不截断回复——test 只回
// 前 100 字，润色/摘要没法用，故单开端点。管理员会话由 api/admin/_middleware.js 守卫。
import { json } from '../../../lib/util.js';
import { getAiProviders, pickModel, buildUpstreamRequest } from '../../../lib/ai.js';

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch {}
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return json({ ok: false, error: 'prompt 不能为空' });
  if (prompt.length > 6000) return json({ ok: false, error: 'prompt 超过 6000 字上限' });

  const { enabled, providers } = await getAiProviders(env);
  if (!enabled) return json({ ok: false, error: 'AI 当前处于停用状态，先到「AI」页打开全局开关' });
  const wanted = typeof body.key === 'string' && body.key.includes('/') ? body.key.slice(0, 140) : null;
  const s = pickModel(providers, wanted);
  if (!s || !s.apiKey || !s.model) {
    return json({ ok: false, error: wanted ? '「' + wanted + '」不可用或缺 API Key' : '还没有可用的默认模型——先到「AI」页添加供应商与模型并设默认' });
  }

  const { url, init } = buildUpstreamRequest(s, [{ role: 'user', content: prompt }], false);
  const started = Date.now();
  let res;
  try {
    res = await fetch(url, init);
  } catch {
    return json({ ok: false, error: '连不上 ' + url + '（检查地址/网络）' });
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.text()).slice(0, 200); } catch {}
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
    return json({ ok: true, reply: reply.slice(0, 6000), ms: Date.now() - started, name: s.name + '/' + s.model });
  } catch {
    return json({ ok: false, error: '上游响应不是合法 JSON，请确认接口地址指向 API 而非网页' });
  }
}
