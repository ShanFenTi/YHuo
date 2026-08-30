// POST /api/admin/albums → 相册重命名/删除
// { action: 'rename', from, to }：把 from 相册的所有图片改名为 to
// { action: 'delete', name }：删除相册（图片回到"未分组"，不动文件本体）
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const action = String(body.action || '');

  if (action === 'rename') {
    const from = String(body.from || '').trim().slice(0, 50);
    const to = String(body.to || '').trim().slice(0, 50);
    if (!from || !to) return json({ ok: false, error: '相册名不能为空（50 字以内）' }, 400);
    await env.DB.prepare('UPDATE media SET album = ? WHERE album = ?').bind(to, from).run();
    return json({ ok: true, album: to });
  }

  if (action === 'delete') {
    const name = String(body.name || '').trim().slice(0, 50);
    if (!name) return json({ ok: false, error: '参数错误' }, 400);
    await env.DB.prepare("UPDATE media SET album = '' WHERE album = ?").bind(name).run();
    return json({ ok: true });
  }

  return json({ ok: false, error: '未知操作' }, 400);
}
