// GET/DELETE /api/admin/rum → 前端错误上报管理（位于 api/admin/ 下，自动被 _middleware.js
// 会话门卫保护，未登录 401，本文件不写鉴权；公开写入接口见 api/rum.js）。
// 注意：本文件在 api/admin/ 嵌套子目录，import 要多一层（坑 16）：../../lib/
//   GET     最近 30 条 {ok, list:[{id, created_at, path, msg, stack, version, ua}], total}（total=COUNT(*)）
//   DELETE  清空全部（后台状态页「前端错误」卡的「清空」按钮用，两段式确认在前端）
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestGet({ env }) {
  try {
    await ensureSchema(env);
    const res = await env.DB.prepare(
      'SELECT id, created_at, path, msg, stack, version, ua FROM error_reports ORDER BY id DESC LIMIT 30'
    ).all();
    const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM error_reports').first();
    return json({ ok: true, list: res.results || [], total: (cnt && cnt.n) || 0 });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e || '读取失败').slice(0, 200) }, 500);
  }
}

export async function onRequestDelete({ env }) {
  try {
    await ensureSchema(env);
    await env.DB.prepare('DELETE FROM error_reports').run();
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e || '清空失败').slice(0, 200) }, 500);
  }
}
