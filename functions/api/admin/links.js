// 短链管理接口（/api/admin/links，未登录由目录 _middleware 统一兜 401）：
// GET    → 全部短链（创建时间倒序，管理列表用）
// POST   {code?, url} → 新建：url 必须 http(s) 完整链接；code 可选，不给则随机生成 6 位 hex，
//                       给了则限 2~32 位字母数字_- 且拒绝与站内路由撞名的保留字；撞主键给友好提示
// PUT    {code, url}  → 只改指向，短码与计数不动
// DELETE {code}       → 删除
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';
import { randomHex } from '../../lib/auth.js';

const URL_RE = /^https?:\/\/.+/;
const CODE_RE = /^[a-zA-Z0-9_-]{2,32}$/;
// 保留字黑名单：这些码对应站内静态页 / 资源目录 / functions 路由 / 后台登录入口，
// 收进短链会和现有路由撞车（/s/{code} 之外它们有更优先的解析），一律不收
const RESERVED = [
  'admin', 'api', 'assets', 'media', 'music', 'video', 'images', 'games',
  'notes', 'tools', 'docs', 'ai', 'board', 'schedule', 'blog', 's',
  'feed.xml', 'sw.js', 'offline', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml',
  'login', 'register',
];

function beijingNow() {
  // Workers 跑 UTC，created_at 按北京时间存（与 visit_daily/checkins 同口径），后台列表展示用
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

// 目标链接校验：必须 http(s) 完整链接（跳转直接塞 Location，其它协议一律不收）
function cleanUrl(raw) {
  const url = String(raw || '').trim().slice(0, 2048);
  if (!URL_RE.test(url)) return { error: '目标链接必须以 http:// 或 https:// 开头' };
  return { url };
}

// 自定义码校验：2~32 位字母数字下划线连字符，且不在保留字黑名单
function cleanCode(raw) {
  const code = String(raw || '').trim();
  if (!code) return { code: '' }; // 空码 = 自动生成
  if (!CODE_RE.test(code)) return { error: '短码限 2~32 位字母、数字、下划线或连字符' };
  if (RESERVED.indexOf(code) > -1) return { error: '「' + code + '」是站内保留路径，换一个短码' };
  return { code };
}

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const res = await env.DB.prepare(
    'SELECT code, url, clicks, created_at FROM short_links ORDER BY created_at DESC, code'
  ).all();
  return json({ ok: true, list: res.results || [] });
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const u = cleanUrl(body.url);
  if (u.error) return json({ ok: false, error: u.error }, 400);
  const c = cleanCode(body.code);
  if (c.error) return json({ ok: false, error: c.error }, 400);
  const code = c.code || randomHex().slice(0, 6); // 未自定义则随机 6 位 hex（碰撞概率极低，撞了走 UNIQUE 兜底）
  try {
    await env.DB.prepare('INSERT INTO short_links (code, url, clicks, created_at) VALUES (?, ?, 0, ?)')
      .bind(code, u.url, beijingNow()).run();
  } catch (e) {
    // code 是主键，重复插入会抛 UNIQUE 约束错误，转成可读提示
    if (String(e && e.message || '').indexOf('UNIQUE') > -1) {
      return json({ ok: false, error: '短码「' + code + '」已被占用，换一个' }, 400);
    }
    throw e;
  }
  return json({ ok: true, code });
}

export async function onRequestPut({ request, env }) {
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const code = String(body.code || '').trim();
  if (!CODE_RE.test(code)) return json({ ok: false, error: '参数错误' }, 400);
  const u = cleanUrl(body.url);
  if (u.error) return json({ ok: false, error: u.error }, 400);
  const exists = await env.DB.prepare('SELECT 1 FROM short_links WHERE code = ?').bind(code).first();
  if (!exists) return json({ ok: false, error: '这条短链已不存在（可能已被删除），刷新后重试' }, 404);
  await env.DB.prepare('UPDATE short_links SET url = ? WHERE code = ?').bind(u.url, code).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const code = String(body.code || '').trim();
  if (!CODE_RE.test(code)) return json({ ok: false, error: '参数错误' }, 400);
  await env.DB.prepare('DELETE FROM short_links WHERE code = ?').bind(code).run();
  return json({ ok: true });
}
