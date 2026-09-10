// 根级 catch-all（2026-09-10 性能批次）：边缘指纹注入。
// 机制：服务 HTML 时把页面里的 /assets/site.css、/assets/common.js、/assets/blog-player.js 引用
// 动态改写成 ?v=<部署commit前8位>，静态源文件与源码里的引用保持原样；配合 _headers 里
// /assets/* 的 immutable 一年长缓存，实现"资源指纹 + 长缓存 + 部署即全局换新"。
// 为什么不用构建脚本：本项目守零构建红线——页面是手写静态 HTML，构建步骤会引入"改完忘了跑构建
// 就推了旧引用"的人为坑；放在边缘响应时注入，部署指纹天然就是当前 commit，没有可忘记的步骤。
// 路由由根目录 _routes.json 手工声明（include /*，exclude /assets /music /video /images 四类静态
// 二进制直连静态服务不进函数）；/api /admin /media /s /feed.xml 等既有函数目录更具体，按 Pages
// "具体性优先"继续命中各自文件，本文件只兜真正没有专属函数的路径（含静态 HTML）。

// 需要指纹化的资产引用（与页面 <link>/<script> 书写形式逐字对应；HTML 是纯文本，直接改写）。
// 站点图标也走指纹：换图标图只需重传文件，?v= 随部署变化，边缘/浏览器缓存自动失效（2026-09-10）
const FINGERPRINT_ASSETS = ['/assets/site.css', '/assets/common.js', '/assets/blog-player.js', '/assets/icons/favicon.png', '/assets/icons/apple-touch-icon.png'];

// 给单个资产引用补 ?v= 版本号：split 拆开后逐段检查，已带 ?v= 的段原样放回（防重复注入成 ...js?v=a?v=b 的脏 URL）
function tagAssetRefs(html, bare, v) {
  const parts = html.split(bare);
  if (parts.length === 1) return html; // 该页没引用这个资产，原样返回
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i];
    out += seg.startsWith('?v=') ? bare : bare + '?v=' + v;
    out += seg;
  }
  return out;
}

// GET：取静态资产 → 仅 HTML 改写（资产指纹 + build-version meta），非 HTML 一律逐字节原样透传
//（sw.js / manifest / robots / sitemap / offline.html / favicon 都走透传路径，不能有任何扰动）
export async function onRequestGet({ request, env }) {
  try {
    const assetResp = await env.ASSETS.fetch(request); // 用原始 request，保留 URL 与查询参数
    const contentType = assetResp.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return assetResp; // 非 HTML：body 流式原样透传，头不动

    // 版本号取部署 commit 前 8 位（生产 Pages 与本地 wrangler 都注入 CF_PAGES_COMMIT_SHA），缺失/异常回落 'dev'
    const v = String(env.CF_PAGES_COMMIT_SHA || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 8) || 'dev';

    let html = await assetResp.text();
    for (const bare of FINGERPRINT_ASSETS) html = tagAssetRefs(html, bare, v);
    // build-version meta 插到 <head> 后第一个位置（源文件 head 为小写）；找不到就不注入，不报错
    const headAt = html.indexOf('<head>');
    if (headAt >= 0) {
      const at = headAt + '<head>'.length;
      html = html.slice(0, at) + '\n  <meta name="build-version" content="' + v + '">' + html.slice(at);
    }

    // 内容已改写：只抄 Content-Type，ETag 刻意不透传（旧 etag 对改写后的内容不再匹配，留着只会误导 304）；
    // Cache-Control 短缓存 5 分钟：新部署后旧 HTML 全局最多 5 分钟自然滚到新版本（引用的带指纹资产即时可用）
    return new Response(html, {
      status: assetResp.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (e) {
    // fail-open：任何错误（ASSETS 异常、改写出错）降级成无改写的原始静态服务——站点绝不能因这个函数挂掉
    try {
      return await env.ASSETS.fetch(request);
    } catch (e2) {
      return new Response('Service Unavailable', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  }
}

// 非 GET（HEAD/POST/…）不参与改写，直接透传静态资产服务（只导出 onRequestGet 的话其余方法会 405）。
// 同时导出动词处理器时 GET 仍优先命中上面的 onRequestGet（具体动词优先，见 Pages Functions 文档），
// 这里只会被其余方法走到。
export async function onRequest({ request, env }) {
  return env.ASSETS.fetch(request);
}
