// GET /api/summary → 站点数据看板（公开无鉴权，关于页「站点数据」卡消费）
// 只返回聚合计数，绝不返回任何个体记录/IP/UA（隐私立场与 2026-09-06 移除 IP 记录一致）。
// 表口径（实读 visit.js / migrate.js，勿凭印象改）：
//   总访问   = site_settings 表 key='visits'（visit.js 累加的就是这一行，TEXT 存数字）
//   今日访问 = visit_daily 表 day=北京时间今天（口径同 visit.js：Date.now()+8h 取 ISO 前十位）
//   随笔/留言/注册用户/累计签到 = notes / messages / users / checkins 各表 COUNT(*)
//   曲目数   = media 表 type='music'（CHECK 约束只有 'music'/'video'/'image' 三种取值）
// 建站天数 = 北京时间今天 − 2026-08-29 的天数差，服务端算好（与页脚 SITE_BIRTH 同一起点）。
// 单条 SQL 挂了就整体 ok:false（以简单稳妥为先，前台失败整卡隐藏）。
import { json } from '../lib/util.js';
import { ensureSchema } from '../lib/migrate.js';

export async function onRequestGet({ env }) {
  try {
    await ensureSchema(env);
    const day = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // 北京时间今天（同 visit.js）
    const [visits, today, notes, messages, tracks, users, checkins] = await Promise.all([
      env.DB.prepare("SELECT value FROM site_settings WHERE key = 'visits'").first(), // 尚无访问时无行，按 0
      env.DB.prepare('SELECT count FROM visit_daily WHERE day = ?').bind(day).first(), // 当天没人访问也无行，按 0
      env.DB.prepare('SELECT COUNT(*) AS n FROM notes').first(),
      env.DB.prepare('SELECT COUNT(*) AS n FROM messages').first(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM media WHERE type = 'music'").first(),
      env.DB.prepare('SELECT COUNT(*) AS n FROM users').first(),
      env.DB.prepare('SELECT COUNT(*) AS n FROM checkins').first(), // (user_id, day) 主键 = 一次签到一行
    ]);
    const days = Math.max(
      1,
      Math.floor((Date.parse(day) - Date.parse('2026-08-29')) / 86400000)
    ); // 两侧都是纯日期串按 UTC 解析，差值即天数；起跑当天保底 1
    return json({
      ok: true,
      data: {
        totalVisits: visits ? Number(visits.value) || 0 : 0,
        todayVisits: today ? Number(today.count) || 0 : 0,
        notes: notes ? Number(notes.n) || 0 : 0,
        messages: messages ? Number(messages.n) || 0 : 0,
        tracks: tracks ? Number(tracks.n) || 0 : 0,
        users: users ? Number(users.n) || 0 : 0,
        checkins: checkins ? Number(checkins.n) || 0 : 0,
        days,
      },
    });
  } catch {
    // 建表失败/库未绑定/任一条 SQL 挂：不 500 不泄细节，前台按失败隐藏数据卡
    return json({ ok: false });
  }
}
