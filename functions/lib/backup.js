// D1 数据备份：核心逻辑 runBackupNow，后台「立即备份」按钮调用。
// 2026-11-02 起取消每日自动备份——原 maybeRunDailyBackup 搭课表 tick 的便车（cron-job.org 每 5 分钟
// 敲门时顺带检查当天备没备），随外部 cron 停用一并移除；现在只有后台手动触发，需要时点「立即备份」。
// 备份 JSON 存 KV（绑定名 MEDIA，既能存媒体 blob 也能存普通 JSON 值）：
//   backup:YYYY-MM-DD  当天全量备份（北京时间日期，与 visit/checkins 计天同口径，字典序=时间序）
//   backup:lastdate    最近一次备份日期（/api/health 的 backupLastDate 观测）
// 只保留最近 7 个日期键，更旧的在每次备份成功后轮换删除；KV 单值上限 25MB，远超当前数据量。
// 纪律：任一步失败向上抛错由调用方兜住（后台会提示失败）；lastdate 只在四表全查成功后写，
// 半途失败不会落标，下次手动备份会重新全量执行。
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
// 半途失败不落 lastdate，下次手动备份会重新全量执行，不会误标「今天已备」。
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
