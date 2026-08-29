-- YHuo 管理后台数据库表结构
-- 用法：Cloudflare 控制台 → Storage & Databases → D1 → 创建数据库 yhuo-db
--       → 打开 Console，整段粘贴执行（可以重复执行，不会破坏已有数据）

-- 管理员（只有一个超级管理员，首次打开 /admin 时也可以在页面上创建）
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,             -- PBKDF2-SHA256，十六进制
  salt          TEXT NOT NULL,             -- 随机盐，十六进制
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 登录会话（HttpOnly Cookie 里只存 token，服务器查这张表）
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,                -- ISO 时间，过期即失效
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 媒体清单：音乐 / 视频 / 图片的元数据，文件本体存在 KV 里（单文件上限 24MB）
CREATE TABLE IF NOT EXISTS media (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL CHECK (type IN ('music', 'video', 'image')),
  title      TEXT NOT NULL,                -- 前台显示名
  r2_key     TEXT NOT NULL UNIQUE,         -- R2 里的存储键
  mime       TEXT,
  size       INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,   -- 后台可调整顺序
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_type_order ON media (type, sort_order, id);

-- 前台用户（开放注册），与管理员 admin_users 分开
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  banned        INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 前台用户会话（Cookie yhuo_user）
CREATE TABLE IF NOT EXISTS user_sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 站点级设置（管理员后台配置，前台读取）：accent=默认主题色，bg=默认背景图的 KV 键
CREATE TABLE IF NOT EXISTS site_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
