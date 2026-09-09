// GET /api/wallpaper → 必应每日一图（外观抽屉背景选择器「今日壁纸」首格的数据源，公开）
// 两个官方源依次试（cn 源国内快、www 兜底），取当天 images[0]；url 可能是 /th?id=... 相对路径，
// 按来源补 origin 成绝对图址。全部失败 502，前端走既有错误提示行。边缘缓存 6 小时：
// caches.default 命中直接回；缓存读写全程 try/catch，缓存失败不影响主流程。
import { json } from '../lib/util.js';

const SOURCES = [
  { origin: 'https://cn.bing.com', api: 'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1' },
  { origin: 'https://www.bing.com', api: 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1' },
];

async function fetchBingDaily() {
  for (const src of SOURCES) {
    try {
      const res = await fetch(src.api, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      const img = data && Array.isArray(data.images) && data.images[0];
      if (!img || !img.url) continue;
      // 相对路径按来源补 origin（图床与接口同源，cn 源补 cn、www 源补 www，别张冠李戴）
      const url = /^https?:\/\//i.test(img.url) ? img.url : src.origin + img.url;
      return { url, copyright: String(img.copyright || ''), title: String(img.title || '') };
    } catch {
      continue; // 单源超时/挂了换下一个
    }
  }
  return null;
}

export async function onRequestGet({ request }) {
  // 边缘缓存命中直接回（上游当天内本就不变，6 小时足够跨过一天的图）
  try {
    const hit = await caches.default.match(request);
    if (hit) return hit;
  } catch { /* 缓存失败走主流程 */ }

  const daily = await fetchBingDaily();
  if (!daily) return json({ ok: false }, 502);

  const res = json(
    { ok: true, url: daily.url, copyright: daily.copyright, title: daily.title },
    200,
    { 'Cache-Control': 'public, max-age=21600' },
  );
  try {
    await caches.default.put(request, res.clone());
  } catch { /* 缓存失败不影响返回 */ }
  return res;
}
