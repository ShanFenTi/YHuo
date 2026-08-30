// GET /api/admin/ai/usage → AI token 用量统计（概览页"AI 用量"卡片）
// 返回：总量、今日、近 14 天、近 30 天的 tokens/调用次数，按模型排行（按总 tokens 降序）
import { json } from '../../../lib/util.js';
import { ensureSchema } from '../../../lib/migrate.js';

// 与后端其他统计一致：day 存北京时间 YYYY-MM-DD
function dayNAgo(n) {
  return new Date(Date.now() + 8 * 3600 * 1000 - n * 86400000).toISOString().slice(0, 10);
}

export async function onRequestGet({ env }) {
  try {
    await ensureSchema(env);
    const today = dayNAgo(0);
    const d14 = dayNAgo(13);
    const d30 = dayNAgo(29);

    const total = await env.DB
      .prepare('SELECT COALESCE(SUM(calls),0) AS calls, COALESCE(SUM(prompt_tokens),0) AS pt, COALESCE(SUM(completion_tokens),0) AS ct FROM ai_usage_daily')
      .first();
    const todayRow = await env.DB
      .prepare('SELECT COALESCE(SUM(calls),0) AS calls, COALESCE(SUM(prompt_tokens),0) AS pt, COALESCE(SUM(completion_tokens),0) AS ct FROM ai_usage_daily WHERE day = ?')
      .bind(today)
      .first();
    const d14Row = await env.DB
      .prepare('SELECT COALESCE(SUM(calls),0) AS calls, COALESCE(SUM(prompt_tokens),0) AS pt, COALESCE(SUM(completion_tokens),0) AS ct FROM ai_usage_daily WHERE day >= ?')
      .bind(d14)
      .first();
    const d30Row = await env.DB
      .prepare('SELECT COALESCE(SUM(calls),0) AS calls, COALESCE(SUM(prompt_tokens),0) AS pt, COALESCE(SUM(completion_tokens),0) AS ct FROM ai_usage_daily WHERE day >= ?')
      .bind(d30)
      .first();
    const { results: byModel } = await env.DB
      .prepare('SELECT provider, model, SUM(calls) AS calls, SUM(prompt_tokens) AS pt, SUM(completion_tokens) AS ct FROM ai_usage_daily GROUP BY provider, model ORDER BY (SUM(prompt_tokens)+SUM(completion_tokens)) DESC LIMIT 10')
      .all();

    const pick = (r) => ({ calls: r.calls || 0, prompt: r.pt || 0, completion: r.ct || 0 });
    return json({
      ok: true,
      today: pick(todayRow),
      d14: pick(d14Row),
      d30: pick(d30Row),
      total: pick(total),
      byModel: (byModel || []).map((r) => ({
        provider: r.provider,
        model: r.model,
        calls: r.calls || 0,
        prompt: r.pt || 0,
        completion: r.ct || 0,
      })),
    });
  } catch (e) {
    return json({ ok: false, error: '读取 AI 用量失败' }, 500);
  }
}
