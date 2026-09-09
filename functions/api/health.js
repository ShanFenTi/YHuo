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
    } catch (e) {
      report.tablesReady = false;
    }
  }
  if (report.media) {
    try {
      await env.MEDIA.list({ limit: 1 });
      report.mediaOk = true;
    } catch (e) {
      report.mediaOk = false;
    }
  }
  // 只读观测：最近一次每日备份的日期（KV backup:lastdate，由 /api/schedule/tick 每天顺带写入；
  // 读取失败置 null，不影响本接口）
  report.backupLastDate = null;
  if (report.media) {
    try {
      report.backupLastDate = (await env.MEDIA.get('backup:lastdate')) || null;
    } catch (e) {
      report.backupLastDate = null;
    }
  }
  return json(report, 200, { 'Cache-Control': 'no-store' });
}
