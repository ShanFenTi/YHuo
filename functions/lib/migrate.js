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
  // 访问明细表 visit_logs 已随"最近访问 / IP 记录"功能整体移除（2026-09-06）：不再建表、不再写入、不再读取。
  // 线上残留的旧表如需清理数据，可在 Cloudflare D1 控制台执行：DROP TABLE IF EXISTS visit_logs;
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
  // 相册本体落库（2026-09-06 根治"空相册不落库"：此前相册只由 media.album 派生，
  // 新建的空相册刷新即消失）。图片归属仍以 media.album 为准，本表只管"存在与顺序"
  // （sort_order 预留相册排序）；凡往 media.album 写相册名的接口都应同步 upsert 本表
  `CREATE TABLE IF NOT EXISTS albums (
    name       TEXT PRIMARY KEY,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 随笔（后台「随笔」页管理，前台 /notes/ 时间线展示）：date=随笔日期 YYYY-MM-DD
  // （前台按它倒序 + 年份分组，也是单条锚点 id），mood=心情短语可空，text=正文
  // （支持迷你 Markdown，前台 common.js mdToHtml 渲染；服务端只存文本不解析）
  `CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT NOT NULL,
    mood       TEXT NOT NULL DEFAULT '',
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notes_date ON notes (date, id)`,
  // 短链（后台「短链」页管理，前台 /s/{code} 302 跳转并计次）：code=短码（自定义或随机 6 位 hex），
  // url=目标完整 http(s) 链接，clicks=跳转次数（每次命中 +1），created_at 存北京时间
  `CREATE TABLE IF NOT EXISTS short_links (
    code       TEXT PRIMARY KEY,
    url        TEXT NOT NULL,
    clicks     INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 前端错误上报（RUM）：前台 common.js 顶部采集段把 window.onerror / unhandledrejection /
  // 资源加载失败发到 /api/rum（公开写入，防风暴限速在接口侧），后台状态页「前端错误」卡展示；
  // 表只留最近 200 条（api/rum.js 每次写入顺手删旧）
  `CREATE TABLE IF NOT EXISTS error_reports (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    path       TEXT NOT NULL DEFAULT '',
    msg        TEXT NOT NULL,
    stack      TEXT,
    version    TEXT,
    ua         TEXT
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
  // 专辑封面：media.cover 存 KV 键（covers/m{id}-{随机}.{ext}，/media/{key} 访问）
  try {
    await env.DB.prepare("ALTER TABLE media ADD COLUMN cover TEXT").run();
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
  // 存量相册回填：把 media.album 里已有的相册名补进 albums 表
  // （INSERT OR IGNORE 幂等，ensureSchema 每个隔离实例各跑一遍也无副作用）
  try {
    await env.DB.prepare("INSERT OR IGNORE INTO albums (name) SELECT DISTINCT album FROM media WHERE album != ''").run();
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
