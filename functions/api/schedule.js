// GET /api/schedule → 当前用户课表（没存过返回默认空结构）
// PUT /api/schedule → 两种 body：
//   { schedule: {...} }        整份保存（前端每次改动全量提交，结构见 lib/schedule.js）
//   { wakeUp: <WakeUp导出JSON> } 导入 WakeUp 课表：服务端解析替换课程，保留提醒设置/作息
import { json, getCookie } from '../lib/util.js';
import { getUserSession, USER_COOKIE } from '../lib/auth.js';
import { ensureSchema } from '../lib/migrate.js';
import { normSchedule, parseWakeUp } from '../lib/schedule.js';

async function currentUser(request, env) {
  await ensureSchema(env);
  return getUserSession(env, getCookie(request, USER_COOKIE));
}

export async function onRequestGet({ request, env }) {
  const sess = await currentUser(request, env);
  if (!sess) return json({ ok: false, error: '未登录' }, 401);
  const row = await env.DB
    .prepare('SELECT data FROM schedules WHERE user_id = ?')
    .bind(sess.userId).first();
  let data = {};
  try { data = JSON.parse(row ? row.data : '{}') || {}; } catch {}
  return json({ ok: true, schedule: normSchedule(data) });
}

export async function onRequestPut({ request, env }) {
  const sess = await currentUser(request, env);
  if (!sess) return json({ ok: false, error: '未登录' }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  let data;
  if (body && body.wakeUp) {
    // WakeUp 导入：解析课程替换原有，保留学期起始/作息/提醒设置
    const row = await env.DB
      .prepare('SELECT data FROM schedules WHERE user_id = ?')
      .bind(sess.userId).first();
    let old = {};
    try { old = JSON.parse(row ? row.data : '{}') || {}; } catch {}
    let courses;
    try { courses = parseWakeUp(body.wakeUp); } catch (e) {
      return json({ ok: false, error: (e && e.message) || '导入失败' }, 400);
    }
    data = normSchedule({
      termStart: old.termStart, nodeTimes: old.nodeTimes,
      daily: old.daily, remindAhead: old.remindAhead,
      courses,
    });
  } else {
    data = normSchedule(body && body.schedule);
  }
  // 课表提醒依赖绑定邮箱；没绑定也允许保存（先录课表后绑邮箱）
  await env.DB
    .prepare(`INSERT INTO schedules (user_id, data, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`)
    .bind(sess.userId, JSON.stringify(data))
    .run();
  return json({ ok: true, schedule: data });
}
