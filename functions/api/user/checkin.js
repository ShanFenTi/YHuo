// 前台用户每日签到 + 等级（0~6 级，按累计签到天数算级，等级不入库）
// day 为北京时间日期（与 visit_daily 等同口径）；(user_id, day) 主键防同日重复，INSERT OR IGNORE 幂等。
// 仅认前台用户会话（yhuo_user）；管理员账号在 users 表无行，天然 401——与收藏同口径。
import { json, getCookie } from '../../lib/util.js';
import { getUserSession, USER_COOKIE } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';
import { levelOf } from '../../lib/levels.js';

// Workers 跑 UTC，站点按北京时间计天（同 functions/api/visit.js）
function bjDay(offsetDays) {
  return new Date(Date.now() + 8 * 3600 * 1000 + (offsetDays || 0) * 86400e3).toISOString().slice(0, 10);
}

// day 字符串按 UTC 锚定推前一天（'YYYY-MM-DD' 只做日期运算，安全）
function prevDay(day) {
  return new Date(Date.parse(day + 'T00:00:00Z') - 86400e3).toISOString().slice(0, 10);
}

// 签到状态：今天是否已签 / 累计 / 连续 / 近 7 天圆点 / 等级进度
// 连续天数：今天已签从今天往回数，未签从昨天往回数（断一天清零）
async function buildStatus(env, userId) {
  const today = bjDay(0);
  const { results } = await env.DB
    .prepare('SELECT day FROM checkins WHERE user_id = ? AND day >= ? ORDER BY day DESC')
    .bind(userId, bjDay(-400)) // 连续天数最多往前追溯 400 天，足够
    .all();
  const set = new Set((results || []).map((r) => r.day));
  let cursor = set.has(today) ? today : prevDay(today);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = prevDay(cursor);
  }
  const totalRow = await env.DB.prepare('SELECT COUNT(*) AS n FROM checkins WHERE user_id = ?').bind(userId).first();
  const total = totalRow ? Number(totalRow.n) || 0 : 0;
  const week = [];
  for (let i = -6; i <= 0; i++) {
    const day = bjDay(i);
    week.push({ day, checked: set.has(day), today: i === 0 });
  }
  return {
    checkedToday: set.has(today),
    total,
    streak,
    week,
    level: levelOf(total),
  };
}

async function currentUser(request, env) {
  await ensureSchema(env);
  return getUserSession(env, getCookie(request, USER_COOKIE));
}

export async function onRequestGet({ request, env }) {
  const sess = await currentUser(request, env);
  if (!sess) return json({ ok: false, error: '未登录' }, 401);
  return json({ ok: true, status: await buildStatus(env, sess.userId) });
}

export async function onRequestPost({ request, env }) {
  const sess = await currentUser(request, env);
  if (!sess) return json({ ok: false, error: '未登录' }, 401);
  const today = bjDay(0);
  const res = await env.DB
    .prepare('INSERT OR IGNORE INTO checkins (user_id, day) VALUES (?, ?)')
    .bind(sess.userId, today)
    .run();
  const inserted = res && res.meta && typeof res.meta.changes === 'number' ? res.meta.changes > 0 : true;
  const status = await buildStatus(env, sess.userId);
  if (!inserted) return json({ ok: false, error: '今天已经签过啦', already: true, status });
  return json({ ok: true, status });
}
