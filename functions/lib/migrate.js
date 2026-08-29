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
];

// 同一个隔离实例里只跑一次
let migrated = false;

export async function ensureSchema(env) {
  if (migrated || !env.DB) return;
  for (const sql of DDL) {
    await env.DB.prepare(sql).run();
  }
  // 老库补列：早期版本的 users 表没有 banned 列（列已存在时报错，忽略即可）
  try {
    await env.DB.prepare("ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0").run();
  } catch {}
  migrated = true;
}
