// POST /api/admin/upload —— multipart 表单上传媒体文件到 KV
// 字段：type = music|video|image；file = 文件；title = 可选显示名；
//       lrc = 可选歌词附件（仅 type=music，.lrc 文本文件 ≤200KB，随歌曲一并入库）
import { json } from '../../lib/util.js';

// KV 单值上限 25MiB（免费版无需绑卡），留点余量
const MAX_SIZE = 24 * 1024 * 1024;
const MAX_LRC = 200 * 1024;

const TYPES = {
  music: ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac', 'opus'],
  video: ['mp4', 'webm', 'mov', 'm4v', 'ogv'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp'],
};

const MIME = {
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', flac: 'audio/flac',
  ogg: 'audio/ogg', aac: 'audio/aac', opus: 'audio/opus',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4', ogv: 'video/ogg',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif', bmp: 'image/bmp',
};

export async function onRequestPost({ request, env }) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_SIZE) return json({ ok: false, error: '文件超过 24MB 上限（免费版存储单文件限制）' }, 413);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }

  const type = String(form.get('type') || '');
  const file = form.get('file');
  if (!TYPES[type]) return json({ ok: false, error: '类型错误' }, 400);
  if (!file || typeof file === 'string') return json({ ok: false, error: '没有收到文件' }, 400);

  const name = file.name || '';
  const dot = name.lastIndexOf('.');
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : '';
  if (!ext || !TYPES[type].includes(ext)) {
    return json({ ok: false, error: '不支持的文件格式：' + ext }, 400);
  }
  if (file.size > MAX_SIZE) return json({ ok: false, error: '文件超过 24MB 上限（免费版存储单文件限制）' }, 413);

  const title = String(form.get('title') || '').trim().slice(0, 200) ||
    (dot > -1 ? name.slice(0, dot) : name);
  const album = String(form.get('album') || '').trim().slice(0, 50);
  const key = `${type}/${crypto.randomUUID()}.${ext}`;
  const mime = MIME[ext] || file.type || 'application/octet-stream';

  // 可选歌词附件：.lrc 文本直接进 media.lrc（不进 KV，歌词很小不值得单独对象）
  let lrcText = null;
  if (type === 'music') {
    const lrcFile = form.get('lrc');
    if (lrcFile && typeof lrcFile !== 'string') {
      if (!/\.lrc$/i.test(lrcFile.name || '')) return json({ ok: false, error: '歌词附件必须是 .lrc 文件' }, 400);
      if (lrcFile.size > MAX_LRC) return json({ ok: false, error: '歌词文件超过 200KB' }, 400);
      lrcText = (await lrcFile.text()).slice(0, MAX_LRC);
    }
  }

  // KV 存二进制，mime 放进 metadata 供播放接口使用
  await env.MEDIA.put(key, await file.arrayBuffer(), { metadata: { mime } });

  const next = await env.DB
    .prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS v FROM media WHERE type = ?')
    .bind(type)
    .first();
  const result = await env.DB
    .prepare('INSERT INTO media (type, title, r2_key, mime, size, sort_order, album, lrc) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(type, title, key, mime, file.size, next.v, album, lrcText)
    .run();

  return json({
    ok: true,
    item: { id: result.meta.last_row_id, type, title, mime, size: file.size, sort_order: next.v, album, has_lrc: !!lrcText },
  });
}
