// GET /api/schedule → 当前身份课表（没存过返回默认空结构）
// PUT /api/schedule → 三种 body：
//   { schedule: {...} }        整份保存（前端每次改动全量提交，结构见 lib/schedule.js）
//   { wakeUp: <WakeUp导出JSON> } 导入 WakeUp JSON：服务端解析替换课程，保留提醒设置/作息
//   { wakeUpCsv: '<CSV文本>' }  导入 WakeUp CSV（同上）
// 前台用户课表存 schedules(user_id)；管理员课表存 site_settings('admin_schedule')，
// 二者通过会话类型自动区分（管理员也能用课表，提醒发到管理员/站长邮箱）
import { json, getCookie, SESSION_COOKIE } from '../lib/util.js';
import { getUserSession, isValidSession, USER_COOKIE } from '../lib/auth.js';
import { ensureSchema } from '../lib/migrate.js';
import { normSchedule, parseWakeUp, parseWakeUpCsv } from '../lib/schedule.js';

// 返回当前身份：{ kind:'user', userId } 或 { kind:'admin' }；未登录返回 null
async function identity(request, env) {
  await ensureSchema(env);
  const user = await getUserSession(env, getCookie(request, USER_COOKIE));
  if (user) return { kind: 'user', userId: user.userId };
  if (await isValidSession(env, getCookie(request, SESSION_COOKIE))) return { kind: 'admin' };
  return null;
}

async function readSchedule(env, id) {
  if (id.kind === 'admin') {
    const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'admin_schedule'").first();
    let data = {};
    try { data = JSON.parse(row ? row.value : '{}') || {}; } catch {}
    return { exists: !!row, data };
  }
  const row = await env.DB
    .prepare('SELECT data FROM schedules WHERE user_id = ?')
    .bind(id.userId).first();
  let data = {};
  try { data = JSON.parse(row ? row.data : '{}') || {}; } catch {}
  return { exists: !!row, data };
}

async function writeSchedule(env, id, data) {
  if (id.kind === 'admin') {
    await env.DB
      .prepare(
        "INSERT INTO site_settings (key, value) VALUES ('admin_schedule', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      )
      .bind(JSON.stringify(data)).run();
    return;
  }
  await env.DB
    .prepare(`INSERT INTO schedules (user_id, data, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`)
    .bind(id.userId, JSON.stringify(data))
    .run();
}

async function deleteSchedule(env, id) {
  if (id.kind === 'admin') {
    await env.DB.prepare("DELETE FROM site_settings WHERE key = 'admin_schedule'").run();
    return;
  }
  await env.DB.prepare('DELETE FROM schedules WHERE user_id = ?').bind(id.userId).run();
}

export async function onRequestGet({ request, env }) {
  const id = await identity(request, env);
  if (!id) return json({ ok: false, error: '未登录' }, 401);
  const { exists, data } = await readSchedule(env, id);
  return json({ ok: true, exists, schedule: normSchedule(data) });
}

export async function onRequestPut({ request, env }) {
  const id = await identity(request, env);
  if (!id) return json({ ok: false, error: '未登录' }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  let data;
  if (body && (body.wakeUp || body.wakeUpCsv)) {
    // WakeUp 导入（JSON 或 CSV）：解析课程替换原有，保留学期起始/作息/提醒设置
    const { data: old } = await readSchedule(env, id);
    let courses;
    try {
      courses = body.wakeUp ? parseWakeUp(body.wakeUp) : parseWakeUpCsv(body.wakeUpCsv);
    } catch (e) {
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
  // 课表提醒依赖收件邮箱；没配置也允许保存（先录课表后配邮箱）
  await writeSchedule(env, id, data);
  return json({ ok: true, schedule: data });
}

// DELETE /api/schedule → 移除整份课表（课程/设置/学期起始全部清空，提醒随之停止）
export async function onRequestDelete({ request, env }) {
  const id = await identity(request, env);
  if (!id) return json({ ok: false, error: '未登录' }, 401);
  await deleteSchedule(env, id);
  return json({ ok: true });
}