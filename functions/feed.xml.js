// GET /feed.xml → RSS 2.0 订阅（随笔，公开无鉴权；文件路由，2026-09-09 PWA/SEO 批次新增）
// 数据源：D1 notes 表最近 50 条；空库/异常时回落 /notes/notes.json 静态清单（与 /notes/ 页同口径）。
// 响应头带 30 分钟公开缓存；注意 lib/util.js 的 json() 只发 JSON，这里直接 new Response。
import { ensureSchema } from './lib/migrate.js';

const SITE_URL = 'https://190963.xyz/';
const CHANNEL_TITLE = 'YHuo 随笔与更新';
const CHANNEL_DESC = 'YHuo 个人主页的随笔与站点更新';

// XML 特殊字符转义
function xmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 随笔正文粗剥 Markdown 标记（去 #>*`[]()!~_- 等符号即可，不做完整解析），压平空白后截断 500 字
function stripMarkdown(text) {
  const plain = String(text || '')
    .replace(/[#>*_`\[\]()!~_-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 500 ? plain.slice(0, 500) + '…' : plain;
}

// 随笔日期（YYYY-MM-DD，北京时间口径）→ RFC 822 pubDate；解析失败回落当前时间
function toPubDate(date) {
  try {
    return new Date(date + 'T00:00:00+08:00').toUTCString();
  } catch (e) {
    return new Date().toUTCString();
  }
}

export async function onRequestGet({ env, request }) {
  let list = [];
  try {
    await ensureSchema(env);
    const res = await env.DB.prepare(
      'SELECT id, date, mood, text FROM notes ORDER BY date DESC LIMIT 50'
    ).all();
    list = res.results || [];
  } catch (e) { /* 空库/异常回落静态清单 */ }
  if (!list.length) {
    try {
      const res = await env.ASSETS.fetch(new URL('/notes/notes.json', request.url));
      const data = await res.json();
      list = Array.isArray(data) ? data : [];
    } catch (e) {
      list = [];
    }
  }

  const items = list.map((n) => {
    const mood = n.mood ? ` · ${n.mood}` : '';
    const guid = `note-${n.id != null ? n.id : n.date}`; // 静态清单条目没有 id，退用日期
    return [
      '    <item>',
      `      <title>${xmlEscape(`随笔 · ${n.date}${mood}`)}</title>`,
      `      <guid>${xmlEscape(guid)}</guid>`,
      `      <pubDate>${toPubDate(n.date)}</pubDate>`,
      `      <description>${xmlEscape(stripMarkdown(n.text))}</description>`,
      '    </item>',
    ].join('\n');
  }).join('\n');

  const lastBuildDate = list.length && list[0].date ? toPubDate(list[0].date) : new Date().toUTCString();
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${xmlEscape(CHANNEL_TITLE)}</title>`,
    `    <link>${SITE_URL}</link>`,
    `    <description>${xmlEscape(CHANNEL_DESC)}</description>`,
    '    <language>zh-cn</language>',
    '    <generator>YHuo Pages Functions</generator>',
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
}
