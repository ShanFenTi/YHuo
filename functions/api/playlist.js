// GET /api/playlist → 前台歌单/视频/图片清单
// 数据库还没建好或没绑定时返回 ok:false，前端自动走原有的静态文件兜底
import { json } from '../lib/util.js';

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB
      .prepare('SELECT type, title, r2_key, album FROM media ORDER BY type, sort_order, id')
      .all();
    const pick = (t) =>
      results.filter((r) => r.type === t).map((r) => ({ name: r.title, url: '/media/' + r.r2_key }));
    // 图片额外带相册字段，前台相册界面按它分组
    const images = results
      .filter((r) => r.type === 'image')
      .map((r) => ({ name: r.title, url: '/media/' + r.r2_key, album: r.album || '' }));
    return json({ ok: true, music: pick('music'), video: pick('video'), images });
  } catch {
    return json({ ok: false });
  }
}
