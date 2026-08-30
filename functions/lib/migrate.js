// 自动建表：后台相关接口首次访问时执行（幂等，重复执行无副作用），
// 免去在 Cloudflare 控制台手动跑 db/schema.sql 的步骤
const DDL = [
  `CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt          TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS media (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL CHECK (type IN ('music', 'video', 'image')),
    title      TEXT NOT NULL,
    r2_key     TEXT NOT NULL UNIQUE,
    mime       TEXT,
    size       INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_media_type_order ON media (type, sort_order, id)`,
  // 前台用户（开放注册），与管理员 admin_users 分开
  `CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt          TEXT NOT NULL,
    banned        INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 站点级设置（管理员后台配置，前台读取）：accent=默认主题色，bg=默认背景图的 KV 键
  `CREATE TABLE IF NOT EXISTS site_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  // 访问统计按天计数（day = 北京时间日期 YYYY-MM-DD），后台趋势图用
  `CREATE TABLE IF NOT EXISTS visit_daily (
    day   TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
  )`,
  // 管理员登录限速：同一 IP+用户名 连续失败 5 次锁 10 分钟
  `CREATE TABLE IF NOT EXISTS login_throttle (
    key          TEXT PRIMARY KEY,
    fails        INTEGER NOT NULL DEFAULT 0,
    last_fail    TEXT,
    locked_until TEXT
  )`,
  // 前台用户收藏（相册照片/音乐）。url 存站点内路径（如 /media/xxx、/images/1.jpg），
  // 与域名无关；静态文件和后台媒体统一按路径识别，不与 media 表外键关联（删除媒体后收藏自然失效，前台过滤）
  `CREATE TABLE IF NOT EXISTS user_favorites (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('image', 'music')),
    url        TEXT NOT NULL,
    title      TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, url)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fav_user ON user_favorites (user_id, created_at)`,
];

// 同一个隔离实例里只跑一次
let migrated = false;

export async function ensureSchema(env) {
  if (migrated || !env.DB) return;
  for (const sql of DDL) {
    await env.DB.prepare(sql).run();
  }
  // 老库补列：列已存在时报错，忽略即可
  try {
    await env.DB.prepare("ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0").run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE users ADD COLUMN last_seen_at TEXT").run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE media ADD COLUMN album TEXT NOT NULL DEFAULT ''").run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE users ADD COLUMN avatar_key TEXT").run();
  } catch {}
  migrated = true;
}
