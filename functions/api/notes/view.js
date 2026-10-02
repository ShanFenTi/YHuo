// POST /api/notes/view {id} → 随笔阅读计数 +1（公开；2026-10-02 后台随笔文章化配套）。
// 去重在客户端：前台渲染随笔后对本会话没上报过的篇目各 POST 一次（sessionStorage 去重，刷新不重复计）。
// 服务端只做 IP 分钟桶限速（复用 login_throttle，与 /api/visit 同款：超限静默回 ok 不计数），
// 不记 IP/UA 明细（与 2026-09-06 移除 IP 记录的立场一致）。
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

const VIEW_IP_MIN_LIMIT = 60;

export async function onRequestPost({ request, env }) {
  try {
    await ensureSchema(env);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false }, 200, { 'Cache-Control': 'no-store' });
    }
    const id = parseInt(body && body.id, 10) || 0;
    if (!id) return json({ ok: false }, 200, { 'Cache-Control': 'no-store' });
    const now = Date.now();
    const ip = (request.headers && request.headers.get('CF-Connecting-IP')) || 'unknown';
    const used = await env.DB.prepare(
      'INSERT INTO login_throttle (key, fails, last_fail) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET fails = fails + 1, last_fail = excluded.last_fail RETURNING fails'
    ).bind('noteview:' + ip + ':' + Math.floor(now / 60000), new Date(now).toISOString()).first();
    if (used && Number(used.fails) > VIEW_IP_MIN_LIMIT) {
      return json({ ok: true }, 200, { 'Cache-Control': 'no-store' });
    }
    // 只给非草稿计数（草稿不下发也就不该被计数，双保险）
    await env.DB.prepare('UPDATE notes SET views = views + 1 WHERE id = ? AND draft = 0').bind(id).run();
    return json({ ok: true }, 200, { 'Cache-Control': 'no-store' });
  } catch {
    return json({ ok: false }, 200, { 'Cache-Control': 'no-store' });
  }
}
