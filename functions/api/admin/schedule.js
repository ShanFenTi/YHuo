// GET  /api/admin/schedule → 定时任务配置（tick URL + 密钥；密钥不存在时自动生成）
// POST /api/admin/schedule { action:'regenerate' } → 重新生成密钥（旧 URL 立即失效）
// POST /api/admin/schedule { action:'test', email? } → 按真实课表算"今天该发什么"并立即发测试邮件
//   （不写 schedule_sent 防重发记录，真实提醒不受影响；收件人默认站长邮箱，
//    仅站长模式下强制只发站长邮箱。用于主动验证 解析→计算→拼邮件→发送 全链路）
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';
import { randomHex } from '../../lib/auth.js';
import { getEmailConfig, isEmailAddr, sendMail } from '../../lib/email.js';
import { normSchedule, coursesToday, bjNow, bjDayStr, dailyHtml, classHtml } from '../../lib/schedule.js';

const KEY_NAME = 'schedule_tick_key';

async function readKey(env) {
  const row = await env.DB
    .prepare('SELECT value FROM site_settings WHERE key = ?').bind(KEY_NAME).first();
  return row ? String(row.value) : '';
}

async function writeKey(env, key) {
  await env.DB
    .prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(KEY_NAME, key).run();
  return key;
}

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  let key = await readKey(env);
  if (!key) key = await writeKey(env, randomHex(20)); // 首次查看自动生成
  const origin = new URL(request.url).origin;
  return json({
    ok: true,
    key,
    url: origin + '/api/schedule/tick?key=' + key,
  });
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  let body = {};
  try { body = await request.json(); } catch {}
  if (body.action === 'test') return await runTest(env, body);
  if (body.action !== 'regenerate') return json({ ok: false, error: '不支持的操作' }, 400);
  const key = await writeKey(env, randomHex(20));
  const origin = new URL(request.url).origin;
  return json({ ok: true, key, url: origin + '/api/schedule/tick?key=' + key });
}

// 测试发送：模拟 tick 的计算过程，把早报/课前提醒样例立即发出去
async function runTest(env, body) {
  const cfg = await getEmailConfig(env);
  if (!cfg.enabled) return json({ ok: false, error: '邮件服务未启用，请先在上方配置并启用' }, 400);

  let email = String(body.email || '').trim().toLowerCase();
  if (!email && cfg.ownerEmail) email = cfg.ownerEmail;
  if (!isEmailAddr(email)) return json({ ok: false, error: '请填写有效的收件邮箱' }, 400);
  // 仅站长模式：发给别人也会被服务商拒收（Resend 无域名限制），提前拦下
  if (cfg.adminOnly && email !== cfg.ownerEmail) {
    return json({ ok: false, error: '仅站长模式下只能发到站长邮箱 ' + cfg.ownerEmail }, 400);
  }

  // 收件人须是绑定了已验证邮箱、启用过课表的前台账号（测试的意义就是验证真实数据链路）
  const row = await env.DB
    .prepare('SELECT s.data FROM schedules s JOIN users u ON u.id = s.user_id WHERE lower(u.email) = ? AND u.email_verified = 1 AND u.banned = 0')
    .bind(email).first();
  if (!row) {
    return json({ ok: false, error: '该邮箱没有可测试的课表：需要在前台个人主页启用课表，且账号已绑定此邮箱并完成验证' }, 404);
  }
  let data;
  try { data = normSchedule(JSON.parse(row.data)); } catch {
    return json({ ok: false, error: '课表数据无法解析，请重新导入' }, 500);
  }

  const now = bjNow();
  const day = bjDayStr(now);
  const t = coursesToday(data, now);
  const list = t.list;

  const sent = [];
  const errors = [];
  const pushErr = (tag, e) => errors.push(tag + '：' + String((e && e.message) || e).slice(0, 80));

  // 1) 早报样式：无论是否到点都发，主题加【测试】前缀；模板与真实发送同一份
  try {
    await sendMail(env, email, '【测试】今日课程（' + day + '）', dailyHtml(day, list), 'sched-test');
    sent.push('早报样式');
  } catch (e) { pushErr('早报', e); }
  // 2) 课前提醒样式：找今天第一个开了提醒的重点课，按真实提前量模拟
  const rc = list.find(c => c.remind);
  if (rc) {
    try {
      await sendMail(env, email, '【测试】即将上课：' + rc.name, classHtml(rc, data.remindAhead), 'sched-test');
      sent.push('课前提醒（' + rc.name + '）');
    } catch (e) { pushErr('课前提醒', e); }
  }

  return json({
    ok: true,
    email,
    date: day,
    week: t.week,
    dow: t.dow,
    courseCount: list.length,
    courses: list.map(c => ({ name: c.name, time: c.startHH + ':' + c.startMM, place: c.place, remind: !!c.remind })),
    daily: { on: data.daily.on, time: data.daily.time },
    remindAhead: data.remindAhead,
    sent, errors,
  });
}
