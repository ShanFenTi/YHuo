// GET /s/{code} → 短链 302 跳转并计次（后台「短链」页创建，目标存完整 http(s) 链接）
// 命中：clicks + 1（await 直写，量小无妨）后 302；带 Cache-Control: no-store 防 CF 边缘
// 缓存 302 导致同一访客二次点击不再回源、计数被跳过。未命中：返回自足的 404 内联页。
import { ensureSchema } from '../lib/migrate.js';
import { html } from '../lib/util.js';

export async function onRequestGet({ params, env }) {
  await ensureSchema(env);
  // params 是对象，[code] 单段动态路由取 params.code
  const code = String((params && params.code) || '');
  // 与后台建链同款码规则：2~32 位字母数字下划线连字符；不合法直接 404，省一次查询
  if (!code || !/^[a-zA-Z0-9_-]{2,32}$/.test(code)) return notFound();
  const row = await env.DB
    .prepare('SELECT url, clicks FROM short_links WHERE code = ?')
    .bind(code)
    .first();
  if (!row || !row.url) return notFound();
  await env.DB
    .prepare('UPDATE short_links SET clicks = clicks + 1 WHERE code = ?')
    .bind(code)
    .run();
  // url 存的就是完整 http(s) 链接，直接作 Location；302 临时跳转（换指向即时生效）
  return new Response(null, {
    status: 302,
    headers: { Location: row.url, 'Cache-Control': 'no-store' },
  });
}

// 未命中的 404 页：样式简单自足，不依赖任何外部资源（深浅主题跟随系统）
function notFound() {
  return html(
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>短链不存在</title><style>' +
    'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'font:15px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;' +
    'background:#f5f5f5;color:#333}' +
    '@media (prefers-color-scheme:dark){body{background:#161618;color:#ddd}}' +
    '.box{text-align:center;padding:32px}.code{font-size:44px;font-weight:700;letter-spacing:.08em}' +
    'p{margin:10px 0 0;color:#888}@media (prefers-color-scheme:dark){p{color:#999}}' +
    '</style></head><body><div class="box"><div class="code">404</div>' +
    '<p>短链不存在或已被删除</p></div></body></html>',
    404
  );
}
