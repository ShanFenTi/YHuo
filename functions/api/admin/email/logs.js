// GET /api/admin/email/logs?kind=&limit= → 邮件发送明细（概览页"邮件统计"卡片）
// kind 空 = 全部；limit 上限 50；按最新在前；走 /api/admin/* 会话门卫
import { json } from '../../../lib/util.js';
import { ensureSchema } from '../../../lib/migrate.js';

export async function onRequestGet({ env, request }) {
  try {
    await ensureSchema(env);
    const url = new URL(request.url);
    const kind = (url.searchParams.get('kind') || '').trim().slice(0, 20);
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit')) || 20));
    const where = kind ? 'WHERE kind = ?' : '';
    const r = await env.DB.prepare(
      `SELECT kind, to_email, subject, ok, err, created_at FROM email_logs ${where} ORDER BY id DESC LIMIT ?`
    ).bind(...(kind ? [kind, limit] : [limit])).all();
    return json({ ok: true, logs: r.results || [] });
  } catch {
    return json({ ok: false, logs: [] });
  }
}