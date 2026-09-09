// GET/POST /api/admin/backup → D1 每日备份管理（位于 api/admin/ 下，自动被 _middleware.js
// 会话门卫保护，未登录 401，本文件不写鉴权）。备份本体在 functions/lib/backup.js：
//   GET            最近 7 份清单 {ok, list:[{date, size(字节), counts:{notes,messages,checkins,users}}], lastdate}
//   GET ?date=…    下载该份备份原始 JSON（attachment，浏览器同源带 Cookie 直接下载）
//   POST           立即强制备份一次（无视 lastdate，调 runBackupNow）
// 注意：本文件在 api/admin/ 嵌套子目录，import 要多一层（坑 16）：../../lib/
import { json } from '../../lib/util.js';
import { runBackupNow } from '../../lib/backup.js';

const PREFIX = 'backup:';
const TABLES = ['notes', 'messages', 'checkins', 'users'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // 只认日期形态的键，backup:lastdate 等内部键不外泄/不参与清单

function byteLen(s) { return new TextEncoder().encode(s).length; }

export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    if (date) {
      // 下载单份：键名先过日期格式校验，再读 KV 原样回传
      if (!DATE_RE.test(date)) return json({ ok: false, error: '日期格式应为 YYYY-MM-DD' }, 400);
      const value = await env.MEDIA.get(PREFIX + date);
      if (value == null) return json({ ok: false, error: '该日期没有备份' }, 404);
      return new Response(value, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="yhuo-backup-' + date + '.json"',
          'Cache-Control': 'no-store',
        },
      });
    }
    // 清单：枚举日期键倒序取最近 7 份，逐份读出 parse 取行数（7 份小数据，可接受）
    const dates = [];
    let cursor;
    do {
      const page = await env.MEDIA.list({ prefix: PREFIX, cursor });
      for (const k of (page.keys || [])) {
        const d = k.name.slice(PREFIX.length);
        if (DATE_RE.test(d)) dates.push(d);
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    dates.sort().reverse();
    const list = [];
    for (const d of dates.slice(0, 7)) {
      const item = { date: d, size: 0, counts: null };
      try {
        const value = await env.MEDIA.get(PREFIX + d);
        if (value != null) {
          item.size = byteLen(value);
          const data = JSON.parse(value);
          if (data && data.tables) {
            item.counts = {};
            for (const t of TABLES) item.counts[t] = (data.tables[t] || []).length;
          }
        }
      } catch (e) { /* 单份读取/解析失败不影响清单其余项 */ }
      list.push(item);
    }
    let lastdate = null;
    try { lastdate = (await env.MEDIA.get(PREFIX + 'lastdate')) || null; } catch (e) {}
    return json({ ok: true, list, lastdate });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e || '读取失败').slice(0, 200) }, 500);
  }
}

export async function onRequestPost({ env }) {
  try {
    const r = await runBackupNow(env); // 无视 lastdate 强制跑（含轮换删旧）
    return json({ ok: true, date: r.date, bytes: r.bytes });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e || '备份失败').slice(0, 200) }, 500);
  }
}
