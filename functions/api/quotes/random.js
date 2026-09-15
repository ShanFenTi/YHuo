// GET /api/quotes/random → 随机一条主页寄语（公开、无鉴权；2026-09-15）
//   ?format=svg → 同数据自绘 SVG 徽章，外站 <img src="..."> 可直接引用（README/博客侧栏等）
// 数据源：site_settings.quotes（JSON 数组，旧单条 quote 自动并入——与后台「外观」页 readQuotes 同口径）。
// 站长没配寄语时：JSON 返回 ok:false（404），SVG 回落站名+域名，徽章永远可展示。
// 隐私口径：只出站长主动配置的公开寄语，不含任何用户/站点内部数据。
// 缓存：公开只读，边缘/浏览器缓存 10 分钟——随机性在缓存窗口内生效（每 10 分钟换一批，徽章场景够用）。
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

async function getSetting(env, key) {
  const row = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?').bind(key).first();
  return row ? row.value : null;
}

async function readQuotes(env) {
  let list = [];
  try { list = JSON.parse((await getSetting(env, 'quotes')) || '[]'); } catch {}
  if (!Array.isArray(list)) list = [];
  if (!list.length) {
    const legacy = await getSetting(env, 'quote');
    if (legacy) list = [legacy];
  }
  return list.filter((q) => typeof q === 'string' && q.trim()).map((q) => q.trim());
}

// SVG 文本不会自动折行：按"中文 14px / 半角 8px"估算宽度手动断行，最多 3 行、超长省略号收尾
function svgBadge(quote) {
  const esc = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
  const W = 420, textW = W - 52;
  const text = quote || '这里什么都没有，去看看 yhuo.pages.dev 吧';
  const lines = [];
  let buf = '', w = 0, more = false;
  for (const ch of text) {
    const cw = ch.charCodeAt(0) > 255 ? 14 : 8;
    if (w + cw > textW) {
      lines.push(buf);
      buf = ch; w = cw;
      if (lines.length === 3) { more = true; break; }
    } else { buf += ch; w += cw; }
  }
  if (!more && buf) lines.push(buf);
  if (more && lines[2].length > 1) lines[2] = lines[2].slice(0, -1) + '…';
  const H = 58 + lines.length * 24;
  const font = 'PingFang SC,Microsoft YaHei,system-ui,sans-serif';
  const body =
    '<rect width="' + W + '" height="' + H + '" rx="14" fill="#f8f7f4"/>' +
    '<rect x="0.5" y="0.5" width="' + (W - 1) + '" height="' + (H - 1) + '" rx="13.5" fill="none" stroke="#e6e3da"/>' +
    '<circle cx="27" cy="27" r="5" fill="#b0532b"/>' +
    '<text x="40" y="32" font-family="' + font + '" font-size="15" font-weight="bold" fill="#1b1c1e">YHuo</text>' +
    '<text x="' + (W - 24) + '" y="31" text-anchor="end" font-family="Segoe UI,system-ui,sans-serif" font-size="12" font-style="italic" fill="#b0532b">yhuo.pages.dev</text>' +
    lines.map((l, i) => '<text x="27" y="' + (60 + i * 24) + '" font-family="' + font + '" font-size="14" fill="#5f6166">' + esc(l) + '</text>').join('');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="YHuo 寄语">' + body + '</svg>';
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
  });
}

export async function onRequestGet({ request, env }) {
  try {
    await ensureSchema(env);
    const list = await readQuotes(env);
    const quote = list.length ? list[Math.floor(Math.random() * list.length)] : null;
    if (new URL(request.url).searchParams.get('format') === 'svg') return svgBadge(quote);
    if (!quote) return json({ ok: false, error: '站点还没有配置主页寄语' }, 404, { 'Cache-Control': 'public, max-age=600' });
    return json({ ok: true, quote }, 200, { 'Cache-Control': 'public, max-age=600' });
  } catch {
    // fail-open：任何异常都不 500 泄细节，SVG 路径回落站名、JSON 路径 ok:false
    if (new URL(request.url).searchParams.get('format') === 'svg') return svgBadge(null);
    return json({ ok: false, error: '服务暂时不可用' }, 503, { 'Cache-Control': 'no-store' });
  }
}
