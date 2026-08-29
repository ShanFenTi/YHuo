// GET /api/playlist → 前台歌单/视频/图片清单
// 数据库还没建好或没绑定时返回 ok:false，前端自动走原有的静态文件兜底
import { json } from '../lib/util.js';

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB
      .prepare('SELECT type, title, r2_key FROM media ORDER BY type, sort_order, id')
      .all();
    const pick = (t) =>
      results.filter((r) => r.type === t).map((r) => ({ name: r.title, url: '/media/' + r.r2_key }));
    return json({ ok: true, music: pick('music'), video: pick('video'), images: pick('image') });
  } catch {
    return json({ ok: false });
  }
}
