// POST /api/rum → 前端错误上报（RUM，公开接口，无需登录；只写不读，读取/清空走 /api/admin/rum）
// 浏览器端 common.js 顶部采集段在 window.onerror / unhandledrejection / 资源加载失败时发来
// {msg, stack, path, version}，会话随机 id 放 header X-Err-Id。设计铁律：上报通道绝不能让前端
// 二次报错——
//   ① 字段超长一律截断入库（服务端兜底，前端已各截一档），绝不返回 400；
//   ② 防风暴限速（内存即可，风格照 messages.js 路人限速；Worker 隔离实例间为近似值，够用）：
//      单会话（X-Err-Id）每 10 秒最多 1 条 + 全局每分钟最多 30 条，超了静默丢弃；
//   ③ 任何内部失败（JSON 解析炸/表还没建/D1 抖）都吞掉并返回 200 {ok:true}——前端不读响应体，
//      但接口永远"成功"。
// 写入顺手 prune：表只留最近 200 条（与后台「前端错误」卡的展示规模匹配，防无限增长）
import { json } from '../lib/util.js';
import { ensureSchema } from '../lib/migrate.js';

const MAX_MSG = 300;              // msg 必填 ≤300 字，超长截断
const MAX_STACK = 1500;           // 调用栈 ≤1500 字（前端发来时已截 1200，这里兜底）
const MAX_PATH = 200;             // 页面路径 ≤200
const MAX_VERSION = 40;           // 构建版本 ≤40
const MAX_UA = 200;               // User-Agent 存档截 200 字够看浏览器/系统了
const GLOBAL_LIMIT = 30;          // 全局兜底：每分钟 30 条
const SESSION_INTERVAL_MS = 10000; // 单会话：每 10 秒最多 1 条
const KEEP_ROWS = 200;            // 表保留条数上限（每次写入顺手删更旧的）

// 内存限速表：sessionRate = X-Err-Id → 最近上报时间戳数组；globalTimes = 全部上报时间戳
const sessionRate = new Map();
const globalTimes = [];
// Map 条目上限：超过 1000 就清掉「窗口内已无记录」的键，防内存无界增长
function pruneSessionRate(now) {
  if (sessionRate.size <= 1000) return;
  for (const [k, arr] of sessionRate) {
    if (!arr.length || now - arr[arr.length - 1] >= SESSION_INTERVAL_MS) sessionRate.delete(k);
  }
}
// 服务端兜底截断：任何字段超长都砍到上限而不是拒绝（浏览器端尽力、服务端兜底）
function clip(v, max) {
  const s = String(v == null ? '' : v);
  return s.length > max ? s.slice(0, max) : s;
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json(); // 解析失败走外层 catch，照样 200
    const msg = clip(body && body.msg, MAX_MSG);
    if (!msg) return json({ ok: true }); // 空消息没意义，但也不报错
    const now = Date.now();
    // 防风暴三层的后两层（第一层在浏览器端：每 10 秒最多发 1 条，见 common.js 采集段）
    const errId = clip(request.headers.get('X-Err-Id'), 64);
    pruneSessionRate(now);
    if (errId) {
      const arr = (sessionRate.get(errId) || []).filter((t) => now - t < SESSION_INTERVAL_MS);
      if (arr.length) {
        sessionRate.set(errId, arr);
        return json({ ok: true }); // 10 秒内重复上报：静默丢弃
      }
      arr.push(now);
      sessionRate.set(errId, arr);
    }
    // 全局兜底：多个访客同时踩雷也封顶每分钟 30 条
    while (globalTimes.length && now - globalTimes[0] >= 60000) globalTimes.shift();
    if (globalTimes.length >= GLOBAL_LIMIT) return json({ ok: true }); // 静默丢弃，绝不 429
    globalTimes.push(now);
    await ensureSchema(env);
    await env.DB.prepare(
      "INSERT INTO error_reports (created_at, msg, stack, path, version, ua) VALUES (datetime('now','+8 hours'), ?, ?, ?, ?, ?)" // 北京时间，与全站口径一致
    ).bind(
      msg,
      clip(body && body.stack, MAX_STACK) || null,
      clip(body && body.path, MAX_PATH),
      clip(body && body.version, MAX_VERSION),
      clip(request.headers.get('User-Agent'), MAX_UA)
    ).run();
    // 顺手 prune：只留最近 KEEP_ROWS 条（LIMIT 是硬编码常量，无注入面）
    await env.DB.prepare(
      'DELETE FROM error_reports WHERE id NOT IN (SELECT id FROM error_reports ORDER BY id DESC LIMIT ' + KEEP_ROWS + ')'
    ).run();
  } catch (e) {
    // 吞掉一切内部错误：上报端点永远返回 200，绝不给前端添新错
  }
  return json({ ok: true });
}
