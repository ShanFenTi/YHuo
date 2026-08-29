// GET /api/health → 报告绑定状态，用于排查"绑定没生效"的部署问题
import { json } from '../lib/util.js';
import { ensureSchema } from '../lib/migrate.js';

export async function onRequestGet({ env }) {
  const report = {
    ok: true,
    db: !!env.DB,        // D1 是否绑定（变量名必须叫 DB）
    media: !!env.MEDIA,  // KV 是否绑定（变量名必须叫 MEDIA）
    dbReadable: false,   // 绑定了且能查询（说明库可用）
    tablesReady: false,  // 建表 SQL 是否已执行
  };
  if (report.db) {
    report.dbType = typeof env.DB.prepare === 'function' ? 'd1' : 'wrong-binding-type';
    try {
      await ensureSchema(env); // 顺手自动建表
      await env.DB.prepare('SELECT 1').first();
      report.dbReadable = true;
      const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_users').first();
      report.tablesReady = true;
      report.adminCount = n.n;
    } catch (e) {
      report.dbError = String(e && e.message ? e.message : e).slice(0, 300);
    }
  }
  return json(report, 200, { 'Cache-Control': 'no-store' });
}
