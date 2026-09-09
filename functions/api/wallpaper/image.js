// GET /api/wallpaper/image?u=<url 编码的图址> → 必应图床反代（公开）
// 前端把 /api/wallpaper 下发的图址转成站内代理地址再设为背景：绕开图床防盗链（需 Referer），
// 访客浏览器也不直连第三方域。白名单只放 bing 官方域，u 缺失/不合法/域不对一律 400；
// 上游 8s 超时，流式回传 body，边缘缓存 1 天，任何失败 502 兜底。
import { json } from '../../lib/util.js';

const HOST_ALLOW = ['bing.com', 'www.bing.com', 'cn.bing.com']; // /api/wallpaper 下发图址的三个官方域
const HOST_SUFFIX = '.bing.net'; // 图床 CDN（th.bing.net / s.cn.bing.net 等）任意子域放行

function hostAllowed(hostname) {
  const h = String(hostname || '').toLowerCase();
  return HOST_ALLOW.indexOf(h) !== -1 || h.endsWith(HOST_SUFFIX);
}

export async function onRequestGet({ request }) {
  const u = new URL(request.url).searchParams.get('u') || '';
  let target;
  try {
    target = new URL(u); // u 缺失时 new URL('') 抛错，同样落 400
  } catch {
    return json({ ok: false, error: 'u 缺失或不是合法 URL' }, 400);
  }
  if ((target.protocol !== 'https:' && target.protocol !== 'http:') || !hostAllowed(target.hostname)) {
    return json({ ok: false, error: 'u 不在白名单' }, 400);
  }

  // 边缘缓存命中直接回（同一张图址当天/一天内反复被设为背景）
  try {
    const hit = await caches.default.match(request);
    if (hit) return hit;
  } catch { /* 缓存失败走主流程 */ }

  try {
    const upstream = await fetch(target, {
      signal: AbortSignal.timeout(8000),
      headers: { Referer: 'https://www.bing.com/' }, // 图床校验 referrer，不带会被 403
    });
    if (!upstream.ok || !upstream.body) return json({ ok: false }, 502);
    const res = new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
    try {
      await caches.default.put(request, res.clone());
    } catch { /* 缓存失败不影响返回 */ }
    return res;
  } catch {
    return json({ ok: false }, 502);
  }
}
