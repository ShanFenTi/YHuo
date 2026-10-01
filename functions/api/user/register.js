// POST /api/user/register { username, password, email?, code? } —— 开放注册，成功即自动登录
// 邮箱服务启用且非"仅站长模式"时：后台开了「注册必须邮箱」（缺省，兼容老配置）= email+code 必填；
// 关掉则访客可自选——填了就验证，不填就纯用户名注册（之后可在个人主页绑定邮箱找回密码）。
import { json } from '../../lib/util.js';
import { hashPassword, randomHex, createUserSession, userCookie } from '../../lib/auth.js';
import { ensureSchema } from '../../lib/migrate.js';
import { getEmailConfig, isEmailAddr, verifyCode } from '../../lib/email.js';

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (username.length < 2 || username.length > 30 || /\s/.test(username)) {
    return json({ ok: false, error: '用户名需 2-30 字符且不含空格' }, 400);
  }
  if (password.length < 6 || password.length > 100) {
    return json({ ok: false, error: '密码需 6-100 位' }, 400);
  }

  // 注册 IP 限速（2026-10-01 审计补）：纯用户名路径此前完全裸奔（发码路径有 8 次/小时/IP 占额），
  // 脚本可批量刷号。小时桶 10 个/IP，复用 login_throttle 的 UPSERT+RETURNING 原子计数
  //（与留言板 guestip / 访问 visitip 同套写法，键随 messages.js 的 5% 顺手清理滚出）
  const regKey = 'regip:' + (request.headers.get('CF-Connecting-IP') || 'unknown') + ':' + Math.floor(Date.now() / 3600000);
  const regUsed = await env.DB.prepare(
    'INSERT INTO login_throttle (key, fails, last_fail) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET fails = fails + 1, last_fail = excluded.last_fail RETURNING fails'
  ).bind(regKey, new Date().toISOString()).first();
  if (regUsed && Number(regUsed.fails) > 10) {
    return json({ ok: false, error: '注册太频繁，请稍后再试' }, 429);
  }

  // 管理员用户名也不允许被前台注册占用，避免冒充。
  // 前置到验证码消费之前（2026-10-01 审计顺手修）：原顺序下用户名被占时验证码已作废，
  // 用户改完名还得重新取码、再吃一次 60 秒冷却
  const taken = await env.DB.prepare('SELECT id FROM admin_users WHERE username = ?').bind(username).first()
    || await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (taken) return json({ ok: false, error: '用户名已被占用' }, 400);

  const cfg = await getEmailConfig(env);
  let email = null;
  if (cfg.enabled && !cfg.adminOnly) {
    const requireEmail = cfg.registerRequireEmail !== false; // 缺省=强制（兼容老配置）
    const wanted = String(body.email || '').trim().toLowerCase();
    if (wanted || requireEmail) {
      email = wanted;
      const code = String(body.code || '').trim();
      if (!isEmailAddr(email)) return json({ ok: false, error: '请填写正确的邮箱' }, 400);
      if (!/^\d{6}$/.test(code)) return json({ ok: false, error: '请填写 6 位邮箱验证码' }, 400);
      try {
        await verifyCode(env, email, 'register', code);
      } catch (e) {
        return json({ ok: false, error: (e && e.message) || '验证码校验失败' }, 400);
      }
    }
  }

  const salt = randomHex(32);
  const hash = await hashPassword(password, salt);
  const withEmail = !!email; // 仅站长模式下 email 为 null（普通用户注册不带邮箱）
  let result;
  try {
    result = await env.DB
      .prepare(withEmail
        ? 'INSERT INTO users (username, password_hash, salt, email, email_verified) VALUES (?, ?, ?, ?, 1)'
        : 'INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)')
      .bind(...(withEmail ? [username, hash, salt, email] : [username, hash, salt]))
      .run();
  } catch {
    return json({ ok: false, error: '用户名已被占用' }, 400); // 并发注册撞 UNIQUE 的兜底
  }

  // 注册完直接登录
  const token = await createUserSession(env, result.meta.last_row_id);
  return json({ ok: true, username, nickname: '' }, 200, { 'Set-Cookie': userCookie(token) });
}
