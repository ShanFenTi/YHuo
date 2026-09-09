// D1 数据每日自动备份：核心逻辑拆成 runBackupNow（后台「立即备份」强制执行也走它），
// maybeRunDailyBackup 负责"每天只跑一次"的幂等判断，搭课表提醒外部 cron 的便车
//（/api/schedule/tick 每 5 分钟被 cron-job.org 敲一次，处理末尾调用本模块，无需新注册定时任务）。
// 备份 JSON 存 KV（绑定名 MEDIA，既能存媒体 blob 也能存普通 JSON 值）：
//   backup:YYYY-MM-DD  当天全量备份（北京时间日期，与 visit/checkins 计天同口径，字典序=时间序）
//   backup:lastdate    最近一次备份日期（幂等判断 + /api/health 的 backupLastDate 观测）
// 只保留最近 7 个日期键，更旧的在每次备份成功后轮换删除；KV 单值上限 25MB，远超当前数据量。
// 纪律：备份挂了绝不能影响提醒主流程——maybeRunDailyBackup 全程 try/catch，绝不抛错。
const PREFIX = 'backup:';
const KEEP = 7; // 保留最近 7 份
const TABLES = ['notes', 'messages', 'checkins', 'users']; // 四张业务表全量；sessions/限速等会话类表不备

// 北京时间当天日期 YYYY-MM-DD（口径同 functions/api/visit.js：UTC + 8h 取日期段）
function bjToday() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

// 轮换：以 backup: 前缀枚举 KV，只认日期形态的键（lastdate 等内部键跳过、永不删），
// 按字典序保留最近 KEEP 个日期键，更旧的逐个 delete（KV delete 对不存在的键是幂等 no-op）
async function rotateBackups(env) {
  const dates = [];
  let cursor;
  do {
    const page = await env.MEDIA.list({ prefix: PREFIX, cursor });
    for (const k of (page.keys || [])) {
      const d = k.name.slice(PREFIX.length);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dates.push(d);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  dates.sort();
  const stale = dates.slice(0, Math.max(0, dates.length - KEEP));
  for (const d of stale) await env.MEDIA.delete(PREFIX + d);
}

// 立即执行一次备份：任一步失败向上抛错由调用方兜住；lastdate 只在四表全查成功后才写——
// 半途失败不落 lastdate，下次 tick（5 分钟后）自动重试，不会误标"今天已备"跳到明天。
export async function runBackupNow(env) {
  const date = bjToday();
  // 并发查四张表全量（SELECT *；结果行数小，直接全进内存）
  const res = await Promise.all(TABLES.map(t => env.DB.prepare('SELECT * FROM ' + t).all()));
  const tables = {};
  TABLES.forEach((t, i) => { tables[t] = (res[i] && res[i].results) || []; });
  const text = JSON.stringify({ generatedAt: new Date().toISOString(), tz: 'Asia/Shanghai', tables });
  const bytes = new TextEncoder().encode(text).length; // 真实 UTF-8 字节数
  await env.MEDIA.put(PREFIX + date, text);
  await env.MEDIA.put(PREFIX + 'lastdate', date);
  await rotateBackups(env);
  return { ran: true, date, bytes };
}

// 每日备份入口（课表 tick 末尾调用）：今天已备过直接跳过；任何异常都不外抛
export async function maybeRunDailyBackup(env) {
  try {
    const today = bjToday();
    const last = await env.MEDIA.get(PREFIX + 'lastdate');
    if (last === today) return { ran: false };
    return await runBackupNow(env);
  } catch (e) {
    return { ran: false, error: String((e && e.message) || e || '备份失败').slice(0, 200) };
  }
}
