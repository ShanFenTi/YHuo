// GET/HEAD /media/<key> → 从 R2 读出媒体文件（支持 Range，音乐/视频拖动进度条可用）
export async function onRequest({ request, env, params }) {
  if (!env.MEDIA) return new Response('R2 未绑定', { status: 404 });

  const key = String(params.key || '').replace(/\/+$/, '');
  if (!key) return new Response('Not Found', { status: 404 });

  // range/onlyIf 直接透传浏览器原始请求头，R2 会处理 Range 与 If-None-Match
  const obj = await env.MEDIA.get(key, { range: request.headers, onlyIf: request.headers });
  if (!obj) return new Response('Not Found', { status: 404 });

  const headers = new Headers();
  headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('ETag', obj.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  // 键名含唯一 UUID，内容永不变化，可以放心长缓存
  headers.set('Cache-Control', 'public, max-age=31536000');

  // onlyIf 命中缓存（If-None-Match 未变化）时返回的是不带 body 的对象
  if (!obj.body) return new Response(null, { status: 304, headers });

  if (request.headers.has('range') && typeof obj.range?.offset === 'number') {
    const start = obj.range.offset;
    const end = (typeof obj.range.length === 'number' ? start + obj.range.length : obj.size) - 1;
    headers.set('Content-Range', `bytes ${start}-${end}/${obj.size}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(obj.body, { status: 206, headers });
  }

  headers.set('Content-Length', String(obj.size));
  return new Response(obj.body, { status: 200, headers });
}
