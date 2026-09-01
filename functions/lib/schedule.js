// 课表核心逻辑：WakeUp JSON 解析、周次/当日课程计算、提醒发送（tick）。
// 数据结构（schedules.data，每用户一份）：
//   {
//     termStart: 'YYYY-MM-DD',            // 学期第一周的周一
//     nodeTimes: [{h:8,m:0}, ...],        // 各节次上课时间（下标 0 = 第 1 节）
//     courses: [{ name, place, teacher,   // day: 1-7（周一~周日）
//                 day, startNode, endNode,
//                 weeks: [1,2,...],       // 上课的教学周列表
//                 remind: false }],       // 重点课：课前单独提醒
//     daily: { on: true, time: '07:00' }, // 每日早报
//     remindAhead: 30                      // 重点课提前几分钟提醒
//   }
// 发送记录 schedule_sent：(user_id, day, kind, ref) 唯一，防重复发送。
import { sendMail, getEmailConfig } from './email.js';

export const MAX_COURSES = 200;
export const MAX_NODES = 20;

// 默认作息：大学常见 12 节
export const DEFAULT_NODE_TIMES = [
  { h: 8, m: 0 }, { h: 8, m: 50 }, { h: 10, m: 0 }, { h: 10, m: 50 }, { h: 11, m: 40 },
  { h: 14, m: 0 }, { h: 14, m: 50 }, { h: 16, m: 0 }, { h: 16, m: 50 }, { h: 17, m: 40 },
  { h: 19, m: 0 }, { h: 19, m: 50 },
];

const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// ---------- 北京时间（Workers 跑 UTC，站点按北京时间计天） ----------
export function bjNow() { return new Date(Date.now() + 8 * 3600e3); }
function bjDateParts(d) {
  return {
    y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, da: d.getUTCDate(),
    hh: d.getUTCHours(), mm: d.getUTCMinutes(),
  };
}
function pad(n) { return (n < 10 ? '0' : '') + n; }
export function bjDayStr(d) {
  const p = bjDateParts(d);
  return p.y + '-' + pad(p.mo) + '-' + pad(p.da);
}

// ---------- 数据校验与归一化（保存入口和读取兜底共用） ----------
function normTime(t) {
  const h = Math.max(0, Math.min(23, Math.floor(Number(t && t.h) || 0)));
  const m = Math.max(0, Math.min(59, Math.floor(Number(t && t.m) || 0)));
  return { h, m };
}

export function normSchedule(raw) {
  const d = (raw && typeof raw === 'object') ? raw : {};
  const out = {};
  // 学期起始周一：YYYY-MM-DD；宽松接受任意日期，算周次时按周一校准
  const ts = String(d.termStart || '').trim();
  out.termStart = /^\d{4}-\d{2}-\d{2}$/.test(ts) ? ts : '';
  // 节次时间
  const nt = Array.isArray(d.nodeTimes) ? d.nodeTimes.slice(0, MAX_NODES).map(normTime) : [];
  out.nodeTimes = nt.length >= 2 ? nt : DEFAULT_NODE_TIMES.slice();
  // 课程
  const list = Array.isArray(d.courses) ? d.courses : [];
  out.courses = [];
  for (const c of list.slice(0, MAX_COURSES)) {
    if (!c || typeof c !== 'object') continue;
    const name = String(c.name || '').trim().slice(0, 60);
    if (!name) continue;
    const day = Math.max(1, Math.min(7, Math.floor(Number(c.day) || 0)));
    const startNode = Math.max(1, Math.min(MAX_NODES, Math.floor(Number(c.startNode) || 1)));
    const endNode = Math.max(startNode, Math.min(MAX_NODES, Math.floor(Number(c.endNode) || startNode)));
    const weeks = (Array.isArray(c.weeks) ? c.weeks : [])
      .map(w => Math.max(1, Math.min(30, Math.floor(Number(w) || 0))))
      .filter(w => w > 0).slice(0, 30);
    out.courses.push({
      name, place: String(c.place || '').trim().slice(0, 60),
      teacher: String(c.teacher || '').trim().slice(0, 40),
      day, startNode, endNode, weeks,
      remind: !!c.remind,
    });
  }
  // 提醒设置
  const dailyOn = !!(d.daily && d.daily.on);
  const tm = String((d.daily && d.daily.time) || '07:00');
  out.daily = { on: dailyOn, time: /^([01]\d|2[0-3]):[0-5]\d$/.test(tm) ? tm : '07:00' };
  out.remindAhead = Math.max(5, Math.min(120, Math.floor(Number(d.remindAhead) || 30)));
  return out;
}

// ---------- WakeUp 课程表导出 JSON 解析 ----------
// WakeUp 导出格式：{ courses: [{ courseName, roomName, teacherName,
//   day(1-7), startNode, step(节次跨度), weeks: bool[](下标0=第1周) }]
// 兼容多版本字段：courseName/name、roomName/room、teacherName/teacher、
//   startNode/startSection、endNode/endSection、weeks 支持布尔数组/数字数组/文本（"1-16"、"2-16双"）、weekStr。
// 解析失败抛 Error（中文消息可直接给前端）。
export function parseWakeUp(obj) {
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.courses)) {
    throw new Error('不是有效的 WakeUp 课表文件（缺少 courses 数组）');
  }
  if (!obj.courses.length) throw new Error('课表文件里没有课程');
  const courses = [];
  for (const c of obj.courses) {
    if (!c || typeof c !== 'object') continue;
    const name = String(c.courseName || c.name || '').trim().slice(0, 60);
    if (!name) continue;
    const day = Math.max(1, Math.min(7, Math.floor(Number(c.day) || 0)));
    if (!day || day < 1) continue;
    const sn = c.startNode != null ? c.startNode : c.startSection;
    const startNode = Math.max(1, Math.floor(Number(sn) || 1));
    const en = c.endNode != null ? c.endNode : c.endSection;
    const endNode = en != null
      ? Math.max(startNode, Math.floor(Number(en) || startNode))
      : startNode + Math.max(1, Math.floor(Number(c.step) || 1)) - 1;
    // weeks：布尔数组（true=该周有课）/ 数字数组 / 文本（如 "1-16"、"2-16双"、"1-16周(单)"）；另有 weekStr 别称
    let weeks = [];
    if (Array.isArray(c.weeks)) {
      c.weeks.forEach((w, i) => {
        const n = i + 1;
        if (n > 30) return;
        if (typeof w === 'number' ? w > 0 : !!w) weeks.push(n);
      });
    } else if (typeof c.weeks === 'string' && c.weeks.trim()) {
      weeks = parseWeekDesc(c.weeks);
    } else if (typeof c.weekStr === 'string' && c.weekStr.trim()) {
      weeks = parseWeekDesc(c.weekStr);
    }
    if (!weeks.length) weeks = [1]; // 无周次信息按全学期处理不了，退化为第 1 周
    courses.push({
      name, place: String(c.roomName || c.room || '').trim().slice(0, 60),
      teacher: String(c.teacherName || c.teacher || '').trim().slice(0, 40),
      day, startNode, endNode: Math.min(endNode, MAX_NODES), weeks, remind: false,
    });
  }
  if (!courses.length) throw new Error('没有解析到有效课程');
  return courses.slice(0, MAX_COURSES);
}

// 周次文本 → 周列表："1-16周(单)" / "1,3,5" / "1-8周(双)"
export function parseWeekDesc(str) {
  const s = String(str || '');
  const odd = /单/.test(s), even = /双/.test(s);
  const nums = new Set();
  const ranges = s.match(/\d+(\s*-\s*\d+)?/g) || [];
  for (const r of ranges) {
    const [a, b] = r.split('-').map(x => parseInt(x, 10));
    const from = a || 0, to = b || a || 0;
    for (let i = from; i <= to && i <= 30; i++) {
      if (i < 1) continue;
      if (odd && i % 2 === 0) continue;
      if (even && i % 2 === 1) continue;
      nums.add(i);
    }
  }
  return Array.from(nums).sort((x, y) => x - y);
}

// ---------- WakeUp CSV 解析 ----------
// WakeUp「分享-导出 CSV」格式（UTF-8，首行表头）：
//   课程名,星期,讲师,节数,教室,周次
//   高等数学,周一,张三,第1,2节,教1-101,1-16周(单)
// 解析失败抛 Error（中文消息）。列按表头名匹配，兼容列序变化。
function splitCsvLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } // 转义的引号
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      out.push(cur); cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

// "第1,2节" / "第1-2节" / "第3节" → {start,end}
function parseNodeDesc(str) {
  const nums = (String(str || '').match(/\d+/g) || []).map(Number);
  if (!nums.length) return null;
  const start = nums[0];
  const end = nums.length > 1 ? nums[nums.length - 1] : start;
  return { start, end: Math.max(start, end) };
}

export function parseWakeUpCsv(text) {
  const s = String(text || '').replace(/^\uFEFF/, ''); // 去 BOM
  const lines = s.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV 文件里没有课程数据');
  const header = splitCsvLine(lines[0]);
  // 找各列下标（表头可能叫"课程名/星期/讲师/教师/节数/节次/教室/地点/周次"）
  const colOf = (names) => {
    for (const n of names) {
      const i = header.findIndex(h => h.replace(/\s/g, '') === n);
      if (i > -1) return i;
    }
    return -1;
  };
  const ciName = colOf(['课程名', '课程名称', '课程']);
  const ciDay = colOf(['星期', '周几', '星期几']);
  const ciTeacher = colOf(['讲师', '教师', '老师']);
  const ciStartNode = colOf(['开始节数']);
  const ciEndNode = colOf(['结束节数']);
  const ciNode = colOf(['节数', '节次', '上课节次']); // 单列式（"第1,2节"）
  const ciPlace = colOf(['教室', '地点', '上课地点']);
  const ciWeeks = colOf(['周次', '周数', '上课周次']);
  if (ciName < 0) throw new Error('CSV 表头里找不到"课程名"列');
  // 星期："周一"或数字 1-7
  const dayOf = (v) => {
    const map = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7 };
    const m = String(v || '').match(/[一二三四五六日天]/);
    if (m) return map[m[0]] || 0;
    const n = parseInt(String(v).replace(/\D/g, ''), 10);
    return n >= 1 && n <= 7 ? n : 0;
  };
  const courses = [];
  for (const line of lines.slice(1)) {
    const f = splitCsvLine(line);
    const name = (f[ciName] || '').slice(0, 60);
    if (!name) continue;
    const day = ciDay >= 0 ? dayOf(f[ciDay]) : 0;
    if (!day) continue;
    // 节次：优先"开始/结束节数"两列，否则单列"第1,2节"式描述
    let startNode = 1, endNode = 1;
    if (ciStartNode >= 0) {
      startNode = parseInt((f[ciStartNode] || '').match(/\d+/) || ['1'], 10) || 1;
      endNode = ciEndNode >= 0
        ? (parseInt((f[ciEndNode] || '').match(/\d+/) || [String(startNode)], 10) || startNode)
        : startNode;
    } else {
      const node = ciNode >= 0 ? parseNodeDesc(f[ciNode]) : null;
      startNode = node ? node.start : 1;
      endNode = node ? node.end : startNode;
    }
    if (endNode < startNode) endNode = startNode;
    let weeks = ciWeeks >= 0 ? parseWeekDesc(f[ciWeeks]) : [];
    if (!weeks.length) weeks = [1];
    courses.push({
      name,
      place: ciPlace >= 0 ? (f[ciPlace] || '').slice(0, 60) : '',
      teacher: ciTeacher >= 0 ? (f[ciTeacher] || '').slice(0, 40) : '',
      day,
      startNode,
      endNode: Math.min(endNode, MAX_NODES),
      weeks,
      remind: false,
    });
  }
  if (!courses.length) throw new Error('CSV 里没有解析到有效课程（检查星期/节数列）');
  return courses.slice(0, MAX_COURSES);
}

// ---------- 周次与当日课程 ----------
// termStart 会被校准到那一周的周一；返回当前教学周（1 起），学期外返回 0
export function currentWeek(termStart, bjDate) {
  if (!termStart) return 0;
  const t = new Date(termStart + 'T00:00:00Z');
  if (isNaN(t)) return 0;
  // 校准到周一：getUTCDay 0=周日 → 回退到本周一
  const wd = t.getUTCDay();
  t.setUTCDate(t.getUTCDate() - ((wd + 6) % 7));
  const days = Math.floor((bjDate.getTime() - t.getTime()) / 86400e3);
  if (days < 0) return 0;
  return Math.floor(days / 7) + 1;
}

// 今天（北京时间）要上的课：按教学周过滤 + 按节次排序
export function coursesToday(data, bjDate) {
  const p = bjDateParts(bjDate);
  const dow = ((bjDate.getUTCDay() + 6) % 7) + 1; // 1=周一 … 7=周日
  const week = currentWeek(data.termStart, bjDate);
  const today = [];
  (data.courses || []).forEach((c, i) => {
    if (c.day !== dow) return;
    if (week && c.weeks && c.weeks.length && c.weeks.indexOf(week) === -1) return;
    const t = (data.nodeTimes || [])[c.startNode - 1];
    today.push({
      idx: i, ...c,
      startHH: t ? pad(t.h) : '08', startMM: t ? pad(t.m) : '00',
    });
  });
  today.sort((a, b) => a.startNode - b.startNode || a.endNode - b.endNode);
  return { dow, week, date: p.y + '-' + pad(p.mo) + '-' + pad(p.da), list: today };
}

// ---------- 邮件内容 ----------
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function dailyHtml(date, list) {
  const rows = list.map(c =>
    '<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:nowrap;font-weight:600;">'
    + c.startHH + ':' + c.startMM + '</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">'
    + esc(c.name) + (c.place ? ' <span style="color:#888;">· ' + esc(c.place) + '</span>' : '')
    + '</td></tr>').join('');
  return '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:28px 24px;">'
    + '<h2 style="margin:0 0 6px;font-size:18px;color:#111;">📚 今日课程</h2>'
    + '<p style="margin:0 0 18px;color:#888;font-size:13px;">' + esc(date) + ' · 共 ' + list.length + ' 节</p>'
    + '<table style="width:100%;border-collapse:collapse;font-size:14px;color:#222;">' + rows + '</table>'
    + '<p style="margin:18px 0 0;color:#999;font-size:12px;">来自 YHuo 个人主页</p></div>';
}

function classHtml(c, minutes) {
  return '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:420px;margin:0 auto;padding:28px 24px;">'
    + '<h2 style="margin:0 0 10px;font-size:18px;color:#111;">⏰ ' + minutes + ' 分钟后上课</h2>'
    + '<p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#111;">' + esc(c.name) + '</p>'
    + '<p style="margin:0 0 4px;color:#444;font-size:14px;">' + c.startHH + ':' + c.startMM
    + (c.place ? ' · ' + esc(c.place) : '') + '</p>'
    + (c.teacher ? '<p style="margin:0 0 16px;color:#888;font-size:13px;">' + esc(c.teacher) + '</p>' : '<p style="margin:0 0 16px;"></p>')
    + '<p style="margin:0;color:#999;font-size:12px;">来自 YHuo 个人主页</p></div>';
}

// ---------- tick：检查并发送本期提醒 ----------
// 返回 { ok, sent }；任何一封发送失败不中断后续（记入 errors 数组）
export async function runTick(env) {
  // 邮件服务没配好直接跳过；仅站长模式下只有站长邮箱能收到（Resend 无域名限制），
  // 其他用户不发（发了也是被服务商拒收）
  const cfg = await getEmailConfig(env);
  if (!cfg.enabled) return { ok: true, sent: 0, disabled: true };

  const now = bjNow();
  const day = bjDayStr(now);
  const p = bjDateParts(now);
  const nowHM = p.hh * 60 + p.mm;

  const { results: rows } = await env.DB
    .prepare('SELECT s.user_id, s.data FROM schedules s JOIN users u ON u.id = s.user_id WHERE u.banned = 0 AND u.email IS NOT NULL AND u.email_verified = 1')
    .all();
  let sent = 0;
  const errors = [];
  for (const row of rows || []) {
    let data;
    try { data = normSchedule(JSON.parse(row.data)); } catch { continue; }
    const { date, list } = coursesToday(data, now);
    if (date !== day) continue; // 理论不会发生，防御
    if (!list.length) continue;
    const email = await getUserEmail(env, row.user_id);
    if (!email) continue;
    if (cfg.adminOnly && email !== cfg.ownerEmail) continue;
    try {
      // 1) 每日早报：到点且今天没发过
      if (data.daily && data.daily.on) {
        const [hh, mm] = data.daily.time.split(':').map(Number);
        if (nowHM >= hh * 60 + mm) {
          if (!(await hasSent(env, row.user_id, day, 'daily', '0'))) {
            await sendMail(env, email, '今日课程（' + day + '）', dailyHtml(day, list), 'sched-daily');
            await markSent(env, row.user_id, day, 'daily', '0');
            sent++;
          }
        }
      }
      // 2) 重点课课前提醒：进入 [开课-提前量, 开课) 窗口且该课没发过
      for (const c of list) {
        if (!c.remind) continue;
        const startMin = Number(c.startHH) * 60 + Number(c.startMM);
        const remindAt = startMin - data.remindAhead;
        if (nowHM >= remindAt && nowHM < startMin) {
          const ref = String(c.idx);
          if (!(await hasSent(env, row.user_id, day, 'class', ref))) {
            await sendMail(env, email, '即将上课：' + c.name, classHtml(c, data.remindAhead), 'sched-class');
            await markSent(env, row.user_id, day, 'class', ref);
            sent++;
          }
        }
      }
    } catch (e) {
      errors.push(String((e && e.message) || e).slice(0, 100));
    }
  }
  return { ok: true, sent, errors };
}

async function getUserEmail(env, userId) {
  const u = await env.DB
    .prepare('SELECT email FROM users WHERE id = ? AND banned = 0 AND email IS NOT NULL AND email_verified = 1')
    .bind(userId).first();
  return u ? String(u.email).trim().toLowerCase() : null;
}

async function hasSent(env, userId, day, kind, ref) {
  const r = await env.DB
    .prepare('SELECT 1 FROM schedule_sent WHERE user_id = ? AND day = ? AND kind = ? AND ref = ?')
    .bind(userId, day, kind, ref).first();
  return !!r;
}

async function markSent(env, userId, day, kind, ref) {
  await env.DB
    .prepare('INSERT OR IGNORE INTO schedule_sent (user_id, day, kind, ref) VALUES (?, ?, ?, ?)')
    .bind(userId, day, kind, ref).run();
}
