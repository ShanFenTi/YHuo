// 前台用户收藏：GET 列表 / POST 添加 / DELETE 移除
// url 存站点内路径（/media/xxx、/images/1.jpg、/music/x.mp3），与域名无关；
// 静态文件与后台媒体统一按路径识别。同一 url 唯一（UNIQUE），重复添加静默幂等。
import { json, getCookie } from '../../lib/util.js';
import { getUserSession, USER_COOKIE } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';

async function currentUser(request, env) {
  await ensureSchema(env);
  return getUserSession(env, getCookie(request, USER_COOKIE));
}

export async function onRequestGet({ request, env }) {
  const sess = await currentUser(request, env);
  if (!sess) return json({ ok: false, error: '未登录' }, 401);
  const { results } = await env.DB
    .prepare('SELECT type, url, title, created_at FROM user_favorites WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .bind(sess.userId)
    .all();
  return json({ ok: true, favorites: results || [] });
}

export async function onRequestPost({ request, env }) {
  const sess = await currentUser(request, env);
  if (!sess) return json({ ok: false, error: '未登录' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const type = String(body.type || '');
  const url = String(body.url || '');
  const title = String(body.title || '').slice(0, 200);
  if (type !== 'image' && type !== 'music') return json({ ok: false, error: '不支持的收藏类型' }, 400);
  // 只收站点内路径：防外链，也避免 blob: 等临时地址进库
  if (!url.startsWith('/') || url.length > 500) return json({ ok: false, error: '无效的收藏地址' }, 400);

  await env.DB
    .prepare('INSERT OR IGNORE INTO user_favorites (user_id, type, url, title) VALUES (?, ?, ?, ?)')
    .bind(sess.userId, type, url, title)
    .run();
  return json({ ok: true, favorited: true });
}

export async function onRequestDelete({ request, env }) {
  const sess = await currentUser(request, env);
  if (!sess) return json({ ok: false, error: '未登录' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const url = String(body.url || '');
  if (!url) return json({ ok: false, error: '缺少收藏地址' }, 400);

  await env.DB
    .prepare('DELETE FROM user_favorites WHERE user_id = ? AND url = ?')
    .bind(sess.userId, url)
    .run();
  return json({ ok: true, favorited: false });
}
