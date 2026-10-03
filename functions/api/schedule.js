// GET /api/schedule → 当前身份课表（没存过返回默认空结构）；响应带 holiday=今天命中的假日条目
//   （如 '10-01~10-07'，null=非假日）——与邮件停发同源（lib/schedule.js getHoliday），
//   前台看课视图据此显示假期状态（2026-10-02 站长反馈：放假了页面不该还显示「正在上课」）
// PUT /api/schedule → 三种 body：
//   { schedule: {...} }        整份保存（前端每次改动全量提交，结构见 lib/schedule.js）
//   { wakeUp: <WakeUp导出JSON> } 导入 WakeUp JSON：服务端解析替换课程，保留提醒设置/作息
//   { wakeUpCsv: '<CSV文本>' }  导入 WakeUp CSV（同上）
// 前台用户课表存 schedules(user_id)；管理员课表（2026-10-03 按人分份）也存 schedules，
// user_id = -admin_users.id（负数=管理员，与 messages/schedule_sent 的负数哨兵先例一致）——
// 此前所有管理员共用 site_settings('admin_schedule') 一份，普通管理员间互相干扰且无收件维度；
// 旧键由 ensureSchema 幂等迁移到超管名下后保留不删（迁移源可回溯），新逻辑不再读它
import { json, getCookie, SESSION_COOKIE } from '../lib/util.js';
import { getUserSession, getAdminAuth, USER_COOKIE } from '../lib/auth.js';
import { ensureSchema } from '../lib/migrate.js';
import { normSchedule, parseWakeUp, parseWakeUpCsv, getHoliday, bjNow, bjDayStr } from '../lib/schedule.js';

// 返回当前身份：{ kind:'user', userId } 或 { kind:'admin', adminId }；未登录返回 null
async function identity(request, env) {
  await ensureSchema(env);
  const user = await getUserSession(env, getCookie(request, USER_COOKIE));
  if (user) return { kind: 'user', userId: user.userId };
  // getAdminAuth 内部处理禁用/过期（清会话返回 null），语义与原 isValidSession 等价且带 admin id
  const admin = await getAdminAuth(env, getCookie(request, SESSION_COOKIE));
  if (admin) return { kind: 'admin', adminId: admin.id };
  return null;
}

// 统一存储键：前台用户 = 正的 users.id；管理员 = 负的 admin_users.id
function storageId(id) {
  return id.kind === 'admin' ? -id.adminId : id.userId;
}

async function readSchedule(env, id) {
  const row = await env.DB
    .prepare('SELECT data FROM schedules WHERE user_id = ?')
    .bind(storageId(id)).first();
  let data = {};
  try { data = JSON.parse(row ? row.data : '{}') || {}; } catch {}
  return { exists: !!row, data };
}

async function writeSchedule(env, id, data) {
  await env.DB
    .prepare(`INSERT INTO schedules (user_id, data, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`)
    .bind(storageId(id), JSON.stringify(data))
    .run();
}

async function deleteSchedule(env, id) {
  await env.DB.prepare('DELETE FROM schedules WHERE user_id = ?').bind(storageId(id)).run();
}

export async function onRequestGet({ request, env }) {
  const id = await identity(request, env);
  if (!id) return json({ ok: false, error: '未登录' }, 401);
  const { exists, data } = await readSchedule(env, id);
  const holiday = await getHoliday(env, bjDayStr(bjNow()));
  return json({ ok: true, exists, schedule: normSchedule(data), holiday });
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
      termStart: old.termStart, nodeTimes: old.nodeTimes, nodeMinutes: old.nodeMinutes,
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