// GET /api/playlist → 前台歌单/视频/图片清单
// 数据库还没建好或没绑定时返回 ok:false，前端自动走原有的静态文件兜底
import { json } from '../lib/util.js';

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB
      .prepare('SELECT type, title, r2_key, album, lrc, cover FROM media ORDER BY type, sort_order, id LIMIT 1000')
      .all();
    // 上限 1000 防清单无限膨胀（当前量级远够）；已知优化方向：lrc 整份随清单下发偏重，将来改按需拉取
    const pick = (t) =>
      results.filter((r) => r.type === t).map((r) => ({ name: r.title, url: '/media/' + r.r2_key }));
    // 音乐额外带歌词与专辑封面（后台曲库存的 .lrc 文本 / cover KV 键；为空不带字段，静态 music/ 曲库仍走同名 .lrc 文件）
    const music = results
      .filter((r) => r.type === 'music')
      .map((r) => {
        const it = { name: r.title, url: '/media/' + r.r2_key };
        if (r.lrc) it.lrc = String(r.lrc);
        if (r.cover) it.cover = '/media/' + r.cover;
        return it;
      });
    // 图片带相册字段（后台图片页仍在用；前台消费方=外观抽屉背景选择器的站内图网格 + /album/ 分组）
    const images = results
      .filter((r) => r.type === 'image')
      .map((r) => ({ name: r.title, url: '/media/' + r.r2_key, album: r.album || '' }));
    // 相册顺序表（2026-10-03 相册排序接通：后台 ⋯ 菜单上移/下移写 albums.sort_order，
    // /album/ 的相册组按此序呈现；老前端不读此字段零影响）
    const { results: albumRows } = await env.DB
      .prepare('SELECT name FROM albums ORDER BY sort_order, name')
      .all();
    return json({ ok: true, music, video: pick('video'), images, albums: albumRows.map((r) => r.name) });
  } catch {
    return json({ ok: false });
  }
}
