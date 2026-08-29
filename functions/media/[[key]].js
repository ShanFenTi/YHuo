// GET/HEAD /media/<key> → 从 KV 读出媒体文件
// KV 不支持服务端 Range，这里手动按浏览器的 Range 头切片返回（206），播放拖进度条可用
export async function onRequest({ request, env, params }) {
  if (!env.MEDIA) return new Response('KV 未绑定', { status: 404 });

  const key = String(params.key || '').replace(/\/+$/, '');
  if (!key) return new Response('Not Found', { status: 404 });

  // getWithMetadata 返回 { value, metadata }；KV 有边缘缓存，同地区第二次读取走缓存
  const obj = await env.MEDIA.getWithMetadata(key, { type: 'arrayBuffer', cacheTtl: 300 });
  if (!obj || !obj.value) return new Response('Not Found', { status: 404 });

  const buf = obj.value;
  const size = buf.byteLength;

  const headers = new Headers();
  headers.set('Content-Type', (obj.metadata && obj.metadata.mime) || 'application/octet-stream');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=31536000'); // 键名含唯一 UUID，内容永不变化

  const range = request.headers.get('Range');
  const m = range && range.match(/^bytes=(\d*)-(\d*)$/);
  if (m && (m[1] !== '' || m[2] !== '')) {
    let start;
    let end;
    if (m[1] === '') {
      // bytes=-N：取末尾 N 字节
      const n = Number(m[2]);
      if (n <= 0) return rangeNotSatisfiable(headers, size);
      start = Math.max(0, size - n);
      end = size - 1;
    } else {
      start = Number(m[1]);
      end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
    }
    if (start > end || start >= size) return rangeNotSatisfiable(headers, size);

    const slice = buf.slice(start, end + 1);
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(slice.byteLength));
    return new Response(slice, { status: 206, headers });
  }

  headers.set('Content-Length', String(size));
  return new Response(buf, { status: 200, headers });
}

function rangeNotSatisfiable(headers, size) {
  const h = new Headers(headers);
  h.set('Content-Range', `bytes */${size}`);
  return new Response(null, { status: 416, headers: h });
}
