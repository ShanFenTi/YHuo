// GET /api/schedule/tick → 定时触发入口（cron-job.org 每 5 分钟调一次）
// 鉴权：?key= 或 Authorization: Bearer <key>，密钥存 site_settings `schedule_tick_key`
//（后台「邮件」页可查看/重新生成）。幂等：发送记录在 schedule_sent 表，重复调用不会重发。
// 访问留痕：无论密钥对错都写一条时间戳到 site_settings（schedule_tick_last=鉴权成功 /
// schedule_tick_bad=密钥错误），后台「邮件」页据此显示"外部 cron 最近有没有真的来敲门"。
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';
import { runTick } from '../../lib/schedule.js';

const KEY_NAME = 'schedule_tick_key';
const LAST_OK = 'schedule_tick_last';
const LAST_BAD = 'schedule_tick_bad';

async function getTickKey(env) {
  const row = await env.DB
    .prepare('SELECT value FROM site_settings WHERE key = ?').bind(KEY_NAME).first();
  return row ? String(row.value) : '';
}

// 北京时间 "YYYY-MM-DD HH:MM"（站点按北京时间计天，展示也用它）
function bjStamp() {
  return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
}

// 留痕失败不影响主流程（表没建好/写满等一律吞掉）
async function record(env, keyName, obj) {
  try {
    await env.DB
      .prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .bind(keyName, JSON.stringify(obj)).run();
  } catch {}
}

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  const url = new URL(request.url);
  const given = url.searchParams.get('key')
    || (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const key = await getTickKey(env);
  // 密钥没生成过（管理员从没用过课表功能）→ 一律拒绝，提示去后台生成
  if (!key || String(given || '') !== key) {
    await record(env, LAST_BAD, { t: bjStamp() });
    return json({ ok: false, error: '无效的定时密钥' }, 401);
  }
  try {
    const r = await runTick(env);
    await record(env, LAST_OK, { t: bjStamp(), sent: r.sent || 0, disabled: !!r.disabled, errors: (r.errors || []).length });
    return json({ ok: true, sent: r.sent, disabled: !!r.disabled, errors: r.errors || [], users: r.users || [] });
  } catch (e) {
    await record(env, LAST_OK, { t: bjStamp(), error: String((e && e.message) || '执行失败').slice(0, 80) });
    return json({ ok: false, error: (e && e.message) || '执行失败' }, 500);
  }
}
