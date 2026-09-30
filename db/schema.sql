-- YHuo 管理后台数据库表结构（全量新库形态参考，2026-09-30 按 functions/lib/migrate.js 重新生成）
-- ⚠️ 权威在 functions/lib/migrate.js 的 ensureSchema：接口首次访问自动建表/补列（幂等），线上无需手动跑本文件。
-- 本文件仅作「D1 控制台手工建新库」的参考——老库的补列 ALTER（users/media/sessions/ai_chat_history 的
-- 后加列）已折叠进对应建表语句，与跑完 ensureSchema 的库形态等价。
-- 改表结构：先改 migrate.js，再同步本文件；两侧漂移只误导读者，不影响运行中的站点。

-- 管理员（首建账号（/api/auth/setup）即超级管理员；2026-09-30 多管理员分级：
-- role='super'|'admin'、banned=1 即时下线；普通管理员由超管在「管理员」页建号）
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,             -- PBKDF2-SHA256，十六进制
  salt          TEXT NOT NULL,             -- 随机盐，十六进制
  role          TEXT NOT NULL DEFAULT 'admin',
  banned        INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 管理员登录会话（HttpOnly Cookie 里只存 token；ip/ua 供「我的」页登录设备列表；
-- admin_id 绑定具体管理员——角色判断/按人会话/审计的前提，2026-09-30 起）
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip         TEXT NOT NULL DEFAULT '',
  ua         TEXT NOT NULL DEFAULT '',
  admin_id   INTEGER
);

-- 媒体清单：音乐/视频/图片元数据，文件本体存 KV（单值上限 24MB）
-- album=相册分组；lrc=后台维护的歌词文本；cover=专辑封面的 KV 键（covers/…）
CREATE TABLE IF NOT EXISTS media (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL CHECK (type IN ('music', 'video', 'image')),
  title      TEXT NOT NULL,
  r2_key     TEXT NOT NULL UNIQUE,         -- KV 里的存储键（前缀 music|video|image/）
  mime       TEXT,
  size       INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  album      TEXT NOT NULL DEFAULT '',
  lrc        TEXT,
  cover      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_type_order ON media (type, sort_order, id);

-- 前台用户（开放注册），与管理员 admin_users 分开
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  salt           TEXT NOT NULL,
  banned         INTEGER NOT NULL DEFAULT 0,
  nickname       TEXT NOT NULL DEFAULT '',  -- 昵称（展示名，空 = 用用户名）
  last_seen_at   TEXT,
  avatar_key     TEXT,                     -- 头像 KV 键（avatars/…）
  email          TEXT,                     -- 绑定邮箱（找回密码/2FA 用）
  email_verified INTEGER NOT NULL DEFAULT 0,
  twofa_enabled  INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 前台用户会话（Cookie yhuo_user）
CREATE TABLE IF NOT EXISTS user_sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 站点级设置（管理员后台配置，前台读取）：accent=默认主题色，bg=默认背景图的 KV 键等
CREATE TABLE IF NOT EXISTS site_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 访问统计按天计数（day = 北京时间日期 YYYY-MM-DD），后台趋势图用
CREATE TABLE IF NOT EXISTS visit_daily (
  day   TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

-- 限速/配额记账（同表多用途）：管理员与用户登录失败锁定（IP+用户名）、
-- 路人留言 guestip: 分钟桶、发信占额 emailcode: 小时桶、AI 用量 aiusage: 小时桶、
-- 访问计数 visitip: 分钟桶（时间桶键由 messages.js/visit.js 顺手清理旧行）
CREATE TABLE IF NOT EXISTS login_throttle (
  key          TEXT PRIMARY KEY,
  fails        INTEGER NOT NULL DEFAULT 0,
  last_fail    TEXT,
  locked_until TEXT
);

-- 前台用户收藏（音乐）。url 存站点内路径（如 /media/xxx、/images/1.jpg），不与 media 外键关联
CREATE TABLE IF NOT EXISTS user_favorites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('image', 'music')),
  url        TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, url)
);
CREATE INDEX IF NOT EXISTS idx_fav_user ON user_favorites (user_id, created_at);

-- AI 对话 token 用量（北京时间 day，按 供应商+模型 聚合；前台从流里拿到 usage 后上报）
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  day               TEXT NOT NULL,
  provider          TEXT NOT NULL,
  model             TEXT NOT NULL,
  calls             INTEGER NOT NULL DEFAULT 0,
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, provider, model)
);

-- AI 对话（会话）：一个用户可有多个对话，左侧历史栏展示
CREATE TABLE IF NOT EXISTS ai_conversations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  owner      TEXT NOT NULL,                -- 'u{userId}' 或 'admin'
  title      TEXT NOT NULL DEFAULT '新对话',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_conv_owner ON ai_conversations (owner, updated_at);

-- 邮箱验证码：PK=email+purpose（重发覆盖旧码）；code 存哈希；attempts 限 5 次（原子占额）；过期懒清理
CREATE TABLE IF NOT EXISTS email_codes (
  email      TEXT NOT NULL,
  purpose    TEXT NOT NULL,
  code_hash  TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (email, purpose)
);

-- 登录二次验证的中间票据：密码对 + 开了 2FA 时发一张，凭票+验证码换正式会话
CREATE TABLE IF NOT EXISTS email_login_pending (
  ticket     TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,             -- 管理员票存负数 id
  expires_at TEXT NOT NULL
);

-- AI 对话历史（owner 同上；conv_id 关联 ai_conversations，0=迁移前孤儿消息；
-- content 存纯文本：多模态消息只存 text 部分，图片以「[图片]」占位）
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  owner      TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  conv_id    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_chat_owner ON ai_chat_history (owner, id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_conv ON ai_chat_history (conv_id);

-- 课表（每用户一份 JSON）；管理员课表存 site_settings.admin_schedule 不占本表
CREATE TABLE IF NOT EXISTS schedules (
  user_id    INTEGER PRIMARY KEY,
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 课表提醒发送记录（防重发锁）：kind='daily'（早报，ref 固定 0）| 'class'（重点课课前提醒，ref=课程下标）
CREATE TABLE IF NOT EXISTS schedule_sent (
  user_id    INTEGER NOT NULL,
  day        TEXT NOT NULL,
  kind       TEXT NOT NULL,
  ref        TEXT NOT NULL DEFAULT '0',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, day, kind, ref)
);

-- 邮件发送量按天计账（北京时间 day + 用途 kind），后台概览「邮件统计」卡展示
CREATE TABLE IF NOT EXISTS email_usage_daily (
  day   TEXT NOT NULL,
  kind  TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind)
);

-- 邮件发送明细（每次 sendMail 记一条，成功/失败都记，ok=1 成功 0 失败 + 失败原因）
CREATE TABLE IF NOT EXISTS email_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL DEFAULT '',
  to_email   TEXT NOT NULL DEFAULT '',
  subject    TEXT NOT NULL DEFAULT '',
  ok         INTEGER NOT NULL DEFAULT 1,
  err        TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 每日签到（北京时间 day；(user_id, day) 主键防同日重复，等级按累计天数接口侧计算）
CREATE TABLE IF NOT EXISTS checkins (
  user_id    INTEGER NOT NULL,
  day        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, day)
);

-- 管理员登录记录（成功/失败都记；「我的」页安全卡展示，只留最近 100 条；
-- username=行为人/登录尝试的账号名，note 带 [管理] 前缀的是账号管理动作，2026-09-30 起）
CREATE TABLE IF NOT EXISTS admin_login_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ok         INTEGER NOT NULL DEFAULT 1,
  ip         TEXT NOT NULL DEFAULT '',
  ua         TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  username   TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 留言板（前台用户 user_id；is_admin=1 站长 user_id=0；is_admin=2 路人 user_id=0）
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL DEFAULT 0,
  content    TEXT NOT NULL,
  is_admin   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 相册本体（图片归属仍以 media.album 为准，本表只管"存在与顺序"，防空相册刷新消失）
CREATE TABLE IF NOT EXISTS albums (
  name       TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 随笔（后台「随笔」页管理，前台 /notes/ 时间线；date 倒序+年份分组，锚点 id=日期）
CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT NOT NULL,
  mood       TEXT NOT NULL DEFAULT '',
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notes_date ON notes (date, id);

-- 短链（/s/{code} 302 跳转并计次）
CREATE TABLE IF NOT EXISTS short_links (
  code       TEXT PRIMARY KEY,
  url        TEXT NOT NULL,
  clicks     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 前端错误上报（RUM）：只留最近 200 条（api/rum.js 每次写入顺手删旧）
CREATE TABLE IF NOT EXISTS error_reports (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  path       TEXT NOT NULL DEFAULT '',
  msg        TEXT NOT NULL,
  stack      TEXT,
  version    TEXT,
  ua         TEXT
);

-- 历史注：visit_logs 表已随"最近访问 / IP 记录"功能移除（2026-09-06），不再建、不再写。
-- 线上残留旧表如需清理，可在 D1 控制台执行：DROP TABLE IF EXISTS visit_logs;
