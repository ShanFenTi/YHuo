// POST /api/admin/import { type, files: [{ title, url }] }
// 把仓库静态文件夹里的媒体（按清单）导入后台（KV + 数据库）。
// 客户端负责读清单并 diff 出缺失文件，分批（每批 ≤12）发过来；
// 服务端逐个抓取：抓不到、类型不符（SPA 回退返回 HTML）、超过大小上限的都会跳过。
import { json } from '../../lib/util.js';

const MAX_SIZE = 24 * 1024 * 1024;
const MAX_FILES = 12; // Workers 免费版单请求子请求数有限

const TYPE_MIME = { image: /^image\//, music: /^audio\//, video: /^video\// };
// content-type 缺失/为通用流时的兜底：按扩展名判断类型
const EXT_TYPE = {
  mp3: 'music', wav: 'music', m4a: 'music', flac: 'music', ogg: 'music', aac: 'music', opus: 'music',
  mp4: 'video', webm: 'video', mov: 'video', m4v: 'video', ogv: 'video',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image', avif: 'image', bmp: 'image',
};

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const type = String(body.type || '');
  if (!TYPE_MIME[type]) return json({ ok: false, error: '类型错误' }, 400);
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
    try {
      const raw = String(f.url || '');
      // 清单里是站点根相对路径（如 images/1.jpg）；直接拿 request.url 当 base
      // 会解析到 /api/admin/* 下被会话门卫 401，必须按站点根解析
      url = new URL(/^https?:\/\//.test(raw) || raw.startsWith('/') ? raw : '/' + raw, request.url);
    } catch { skipped.push(title); continue; }

    let res;
    try { res = await fetch(url); } catch { skipped.push(title); continue; }
    if (!res.ok) { skipped.push(title); continue; }
    const mime = (res.headers.get('content-type') || '').split(';')[0];
    const ext = ((url.pathname.match(/\.([a-z0-9]+)$/i) || [])[1] || '').toLowerCase();
    const mimeOk = TYPE_MIME[type].test(mime) || (mime === 'application/octet-stream' && EXT_TYPE[ext] === type);
    if (!mimeOk) { skipped.push(title); continue; } // SPA 回退返回的是 HTML，必然不符

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_SIZE) { skipped.push(title); continue; }

    const key = `${type}/${crypto.randomUUID()}.${ext || (mime.split('/')[1] || 'bin')}`;
    await env.MEDIA.put(key, buf, { metadata: { mime: mime || 'application/octet-stream' } });

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
