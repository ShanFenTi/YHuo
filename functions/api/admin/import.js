// POST /api/admin/import { type, files: [{ title, url }] }
// 把仓库静态文件夹里按约定命名的媒体导入后台（KV + 数据库），实现"静态内容搬进后台统一管理"。
// 客户端负责探测文件是否存在（按 images/1.jpg… 约定），服务端逐个抓取：
// 抓不到、返回的不是目标类型（SPA 回退会返回 HTML）、超过大小上限的都会跳过。
import { json } from '../../lib/util.js';

const MAX_SIZE = 24 * 1024 * 1024;
const MAX_FILES = 12; // Workers 免费版单请求子请求数有限，一次最多导入 12 个（客户端自动分批）

const IMAGE_MIME = /^image\//;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const type = String(body.type || 'image');
  const files = Array.isArray(body.files) ? body.files.slice(0, MAX_FILES) : [];
  if (!files.length) return json({ ok: false, error: '没有要导入的文件' }, 400);

  // 已存在的同名条目跳过，防止重复导入
  const existing = new Set(
    (await env.DB.prepare('SELECT title FROM media WHERE type = ?').bind(type).all()).results.map((r) => r.title)
  );

  const next = await env.DB
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS v FROM media WHERE type = ?')
    .bind(type)
    .first();
  let sortOrder = next.v;

  let imported = 0;
  const skipped = [];
  for (const f of files) {
    const title = String((f && f.title) || '').trim().slice(0, 200);
    if (!title || existing.has(title)) { skipped.push(title || '(无标题)'); continue; }

    let url;
    try { url = new URL(String(f.url || ''), request.url); } catch { skipped.push(title); continue; }

    let res;
    try { res = await fetch(url); } catch { skipped.push(title); continue; }
    if (!res.ok) { skipped.push(title); continue; }
    const mime = (res.headers.get('content-type') || '').split(';')[0];
    if (!IMAGE_MIME.test(mime)) { skipped.push(title); continue; } // SPA 回退返回的是 HTML

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_SIZE) { skipped.push(title); continue; }

    const ext = (url.pathname.match(/\.([a-z0-9]+)$/i) || [])[1] || (mime.split('/')[1] || 'bin');
    const key = `${type}/${crypto.randomUUID()}.${ext.toLowerCase()}`;
    await env.MEDIA.put(key, buf, { metadata: { mime } });

    sortOrder += 1;
    await env.DB
      .prepare('INSERT INTO media (type, title, r2_key, mime, size, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(type, title, key, mime, buf.byteLength, sortOrder)
      .run();
    existing.add(title);
    imported += 1;
  }

  return json({ ok: true, imported, skipped });
}
