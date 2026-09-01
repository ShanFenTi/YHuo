// GET /api/schedule/tick → 定时触发入口（cron-job.org 每 5 分钟调一次）
// 鉴权：?key= 或 Authorization: Bearer <key>，密钥存 site_settings `schedule_tick_key`
//（后台「邮件」页可查看/重新生成）。幂等：发送记录在 schedule_sent 表，重复调用不会重发。
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';
import { runTick } from '../../lib/schedule.js';

const KEY_NAME = 'schedule_tick_key';

async function getTickKey(env) {
  const row = await env.DB
    .prepare('SELECT value FROM site_settings WHERE key = ?').bind(KEY_NAME).first();
  return row ? String(row.value) : '';
}

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  const url = new URL(request.url);
  const given = url.searchParams.get('key')
    || (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const key = await getTickKey(env);
  // 密钥没生成过（管理员从没用过课表功能）→ 一律拒绝，提示去后台生成
  if (!key || String(given || '') !== key) {
    return json({ ok: false, error: '无效的定时密钥' }, 401);
  }
  try {
    const r = await runTick(env);
    return json({ ok: true, sent: r.sent, disabled: !!r.disabled, errors: r.errors || [], users: r.users || [] });
  } catch (e) {
    return json({ ok: false, error: (e && e.message) || '执行失败' }, 500);
  }
}
