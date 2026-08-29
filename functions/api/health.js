// GET /api/health → 报告绑定状态，用于排查"绑定没生效"的部署问题
import { json } from '../lib/util.js';

export async function onRequestGet({ env }) {
  const report = {
    ok: true,
    db: !!env.DB,        // D1 是否绑定（变量名必须叫 DB）
    media: !!env.MEDIA,  // KV 是否绑定（变量名必须叫 MEDIA）
    dbReadable: false,   // 绑定了且能查询（说明库可用）
    tablesReady: false,  // 建表 SQL 是否已执行
  };
  if (report.db) {
    try {
      await env.DB.prepare('SELECT 1').first();
      report.dbReadable = true;
      const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_users').first();
      report.tablesReady = true;
      report.adminCount = n.n;
    } catch {
      // SELECT 1 成功但查表失败 → 库在、表没建
      try {
        await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_users').first();
        report.tablesReady = true;
        report.adminCount = 0;
      } catch {}
    }
  }
  return json(report, 200, { 'Cache-Control': 'no-store' });
}
