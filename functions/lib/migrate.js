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
  // AI 对话 token 用量（北京时间 day，按 供应商+模型 聚合累加；前端从流里拿到 usage 后上报）
  `CREATE TABLE IF NOT EXISTS ai_usage_daily (
    day               TEXT NOT NULL,
    provider          TEXT NOT NULL,
    model             TEXT NOT NULL,
    calls             INTEGER NOT NULL DEFAULT 0,
    prompt_tokens     INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, provider, model)
  )`,
  // AI 对话（会话）：一个用户可有多个对话，左侧历史栏展示
  `CREATE TABLE IF NOT EXISTS ai_conversations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner      TEXT NOT NULL,
    title      TEXT NOT NULL DEFAULT '新对话',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ai_conv_owner ON ai_conversations (owner, updated_at)`,
  // 邮箱验证码：PK=email+purpose（重发覆盖旧码）；code 存哈希；attempts 限 5 次；过期懒清理
  `CREATE TABLE IF NOT EXISTS email_codes (
    email      TEXT NOT NULL,
    purpose    TEXT NOT NULL,
    code_hash  TEXT NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (email, purpose)
  )`,
  // 登录二次验证的中间票据：密码对 + 开了 2FA 时发一张，凭票+验证码换正式会话
  `CREATE TABLE IF NOT EXISTS email_login_pending (
    ticket     TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    expires_at TEXT NOT NULL
  )`,
  // AI 对话历史（登录用户/管理员各存一份；owner='u{userId}' 或 'admin'）。
  // conv_id 关联 ai_conversations（0=旧数据迁移前的孤儿消息，读取时自动归入"历史对话"）；
  // content 存纯文本：多模态消息只存 text 部分，图片以「[图片]」占位（dataURL 太大不入库）
  `CREATE TABLE IF NOT EXISTS ai_chat_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner      TEXT NOT NULL,
    role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT NOT NULL,
    conv_id    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ai_chat_owner ON ai_chat_history (owner, id)`,
  // 课表（每用户一份 JSON）：termStart=学期第一周周一，courses=归一化课程数组，
  // nodeTimes=各节次开始时间，daily/remindAhead=提醒设置。结构见 lib/schedule.js
  `CREATE TABLE IF NOT EXISTS schedules (
    user_id    INTEGER PRIMARY KEY,
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 课表提醒发送记录：防同一提醒重复发送。
  // kind='daily'（每日早报，ref 固定 0）| 'class'（重点课课前提醒，ref=课程在数组里的下标）
  `CREATE TABLE IF NOT EXISTS schedule_sent (
    user_id INTEGER NOT NULL,
    day     TEXT NOT NULL,
    kind    TEXT NOT NULL,
    ref     TEXT NOT NULL DEFAULT '0',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, day, kind, ref)
  )`,
  // 邮件发送量按天计账（北京时间 day + 用途 kind）：验证码/测试/自定义/课表早报/课表课前提醒
  // sendMail 成功后写入，后台概览页"邮件统计"卡片展示
  `CREATE TABLE IF NOT EXISTS email_usage_daily (
    day   TEXT NOT NULL,
    kind  TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, kind)
  )`,
  // 访问明细（IP/页面/UA 摘要）：与 /api/visit 同一触发（每浏览器会话一条），概览页"最近访问"列表用
  `CREATE TABLE IF NOT EXISTS visit_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    day        TEXT NOT NULL,
    ip         TEXT NOT NULL DEFAULT '',
    path       TEXT NOT NULL DEFAULT '',
    ua         TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 邮件发送明细（每次 sendMail 记一条，成功/失败都记，ok=1 成功 0 失败 + 失败原因）：
  // 概览页"邮件统计"卡片里的发送明细列表用；成功时与 email_usage_daily 同日入账
  `CREATE TABLE IF NOT EXISTS email_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    kind       TEXT NOT NULL DEFAULT '',
    to_email   TEXT NOT NULL DEFAULT '',
    subject    TEXT NOT NULL DEFAULT '',
    ok         INTEGER NOT NULL DEFAULT 1,
    err        TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 每日签到（北京时间 day；(user_id, day) 主键防同日重复，等级按累计天数在接口侧计算不入库）
  `CREATE TABLE IF NOT EXISTS checkins (
    user_id    INTEGER NOT NULL,
    day        TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, day)
  )`,
  // 管理员登录记录（成功/失败都记；「我的」页安全卡展示，只留最近 100 条）
  `CREATE TABLE IF NOT EXISTS admin_login_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ok         INTEGER NOT NULL DEFAULT 1,
    ip         TEXT NOT NULL DEFAULT '',
    ua         TEXT NOT NULL DEFAULT '',
    note       TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 留言板（前台用户 user_id；is_admin=1 为站长留言 user_id=0；60 秒一条由接口侧限制）
  `CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL DEFAULT 0,
    content    TEXT NOT NULL,
    is_admin   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
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
  // 后台曲库歌词：media.lrc 存 .lrc 文本（静态 music/ 曲库仍走同名文件方案）
  try {
    await env.DB.prepare("ALTER TABLE media ADD COLUMN lrc TEXT").run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE users ADD COLUMN avatar_key TEXT").run();
  } catch {}
  // 邮箱体系补列：绑定邮箱 / 验证标记 / 登录二次验证开关
  try {
    await env.DB.prepare("ALTER TABLE users ADD COLUMN email TEXT").run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0").run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE users ADD COLUMN twofa_enabled INTEGER NOT NULL DEFAULT 0").run();
  } catch {}
  // 昵称（展示名，空 = 用用户名；留言板/个人主页/顶栏展示用，登录账号名不变）
  try {
    await env.DB.prepare("ALTER TABLE users ADD COLUMN nickname TEXT NOT NULL DEFAULT ''").run();
  } catch {}
  // 老库补列：AI 历史表加 conv_id（列已存在时报错忽略）
  try {
    await env.DB.prepare("ALTER TABLE ai_chat_history ADD COLUMN conv_id INTEGER NOT NULL DEFAULT 0").run();
  } catch {}
  // 会话表补 ip/ua：「我的」页登录设备列表展示用（老库补列，报错忽略即可）
  try {
    await env.DB.prepare("ALTER TABLE sessions ADD COLUMN ip TEXT NOT NULL DEFAULT ''").run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE sessions ADD COLUMN ua TEXT NOT NULL DEFAULT ''").run();
  } catch {}
  // 旧数据迁移：conv_id=0 的孤儿消息归入自动创建的"历史对话"（一次性，幂等）
  try {
    const orphan = await env.DB.prepare(
      "SELECT DISTINCT owner FROM ai_chat_history WHERE conv_id = 0"
    ).all();
    for (const r of orphan.results || []) {
      const conv = await env.DB.prepare(
        "INSERT INTO ai_conversations (owner, title) VALUES (?, '历史对话')"
      ).bind(r.owner).run();
      const convId = conv.meta ? conv.meta.last_row_id : 0;
      if (convId) {
        await env.DB.prepare(
          "UPDATE ai_chat_history SET conv_id = ? WHERE owner = ? AND conv_id = 0"
        ).bind(convId, r.owner).run();
      }
    }
  } catch {}
  migrated = true;
}
