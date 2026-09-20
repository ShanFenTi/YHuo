// GET /api/health → 报告绑定状态，用于排查"绑定没生效"的部署问题
// 注意：这是公开端点且被 /status/ 每 60 秒自刷——只做只读探测，绝不跑 ensureSchema
//（迁移含 DDL 与探测语句，此前健康检查自己就在定期写库）
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
    report.dbType = typeof env.DB.prepare === 'function' ? 'd1' : 'wrong-binding-type';
    try {
      await env.DB.prepare('SELECT 1').first();
      report.dbReadable = true;
      // 表存在性用一次轻量探测代替迁移：site_settings 不存在会抛错 → tablesReady=false（建表由各业务接口的 ensureSchema 负责）
      await env.DB.prepare('SELECT 1 FROM site_settings LIMIT 1').first();
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
  // 邮件服务是否启用（2026-09-15 公开状态页用）：只回布尔，不回任何配置细节
  report.mail = false;
  try {
    const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'email_config'").first();
    const cfg = JSON.parse((row && row.value) || '{}');
    report.mail = !!(cfg && cfg.enabled);
  } catch (e) {
    report.mail = false;
  }
  return json(report, 200, { 'Cache-Control': 'no-store' });
}
