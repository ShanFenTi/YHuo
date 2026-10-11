// POST /api/admin/qq-cover → 从 QQ 音乐批量匹配专辑封面（2026-10-11）
// 对没有封面的音乐条目按标题搜索 QQ 音乐，取首个带专辑 mid 的结果，把专辑图下载进
// KV（covers/，存本站不热链），写 media.cover——与单曲封面上传端点同一条存储链路。
// 单次最多处理 10 条（每条 2 个子请求，Pages Functions 免费版单请求子请求数有限），
// 返回 remaining 供前端循环到零；全部无匹配时前端据此停轮。
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

const BATCH = 10;
const SEARCH_API = 'https://c.y.qq.com/soso/fcgi-bin/client_search_cp?format=json&n=5&w=';
const COVER_URL = 'https://y.gtimg.cn/music/photo_new/T002R500x500M000';
const MAX_COVER = 2 * 1024 * 1024;
const HEADERS = {
  Referer: 'https://y.qq.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};

// 标题→搜索词：曲库名多为「歌名 - 歌手.mp3」形态，去掉扩展名即可（QQ 搜索吃这套）
function searchWord(title) {
  return String(title || '').replace(/\.(mp3|wav|m4a|flac|ogg|aac|opus)$/i, '').trim().slice(0, 80);
}

// 搜索取首个带专辑 mid 的结果（无封面专辑的结果跳过）
async function qqSearch(kw) {
  const res = await fetch(SEARCH_API + encodeURIComponent(kw), { headers: HEADERS });
  if (!res.ok) return null;
  const data = await res.json().catch(function () { return null; });
  const list = data && data.data && data.data.song && data.data.song.list;
  if (!Array.isArray(list)) return null;
  for (const s of list) {
    if (s && s.albummid) return { mid: s.albummid, album: s.albumname || '' };
  }
  return null;
}

export async function onRequestPost({ env }) {
  await ensureSchema(env);
  const { results } = await env.DB
    .prepare("SELECT id, title FROM media WHERE type = 'music' AND (cover IS NULL OR cover = '') ORDER BY sort_order, id LIMIT " + BATCH)
    .all();
  let matched = 0;
  const failed = [];
  for (const row of results) {
    const kw = searchWord(row.title);
    try {
      const hit = kw ? await qqSearch(kw) : null;
      if (!hit) { failed.push({ title: row.title, reason: kw ? 'QQ 音乐无匹配结果' : '标题为空' }); continue; }
      const res = await fetch(COVER_URL + hit.mid + '.jpg', { headers: HEADERS });
      const buf = res.ok ? await res.arrayBuffer() : null;
      if (!buf || buf.byteLength < 1000 || buf.byteLength > MAX_COVER) { failed.push({ title: row.title, reason: '封面图下载失败' }); continue; }
      const key = 'covers/m' + row.id + '-qq' + crypto.randomUUID().slice(0, 8) + '.jpg';
      await env.MEDIA.put(key, buf, { metadata: { mime: 'image/jpeg' } });
      const old = await env.DB.prepare('SELECT cover FROM media WHERE id = ?').bind(row.id).first();
      await env.DB.prepare('UPDATE media SET cover = ? WHERE id = ?').bind(key, row.id).run();
      if (old && old.cover) await env.MEDIA.delete(old.cover); // 换图删旧
      matched += 1;
    } catch (e) {
      failed.push({ title: row.title, reason: '网络错误' });
    }
  }
  const left = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM media WHERE type = 'music' AND (cover IS NULL OR cover = '')")
    .first();
  return json({ ok: true, matched, failed, remaining: left.n });
}
