// 认证：PBKDF2 密码哈希 + D1 会话
import { SESSION_COOKIE, SESSION_DAYS } from './util.js';

const PBKDF2_ITERATIONS = 100000;

function bytesToHex(bytes) {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function pbkdf2(password, saltHex, iterations) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations },
    key,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

export function randomHex(bytes = 32) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return bytesToHex(b);
}

export async function hashPassword(password, saltHex) {
  return pbkdf2(password, saltHex, PBKDF2_ITERATIONS);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password, saltHex, hashHex) {
  const h = await hashPassword(password, saltHex);
  return timingSafeEqual(h, hashHex);
}

export async function createSession(env) {
  const token = randomHex(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token, expires_at) VALUES (?, ?)').bind(token, expires).run();
  return token;
}

export async function isValidSession(env, token) {
  if (!token) return false;
  const row = await env.DB.prepare('SELECT expires_at FROM sessions WHERE token = ?').bind(token).first();
  if (!row) return false;
  if (row.expires_at < new Date().toISOString()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return false;
  }
  return true;
}

export async function deleteSession(env, token) {
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

// HttpOnly + Secure + SameSite=Strict：脚本读不到，跨站请求带不上
export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

// ==================== 前台用户会话（与管理员会话分开，Cookie 也分开） ====================
export const USER_COOKIE = 'yhuo_user';
const USER_SESSION_DAYS = 30;

export async function createUserSession(env, userId) {
  const token = randomHex(32);
  const expires = new Date(Date.now() + USER_SESSION_DAYS * 86400000).toISOString();
  await env.DB
    .prepare('INSERT INTO user_sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, expires)
    .run();
  return token;
}

// 返回 { username } 或 null；被禁用的账号一律视为未登录
export async function getUserSession(env, token) {
  if (!token) return null;
  const row = await env.DB
    .prepare('SELECT s.user_id, s.expires_at, u.username, u.banned FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
    .bind(token)
    .first();
  if (!row) return null;
  if (row.banned) {
    await env.DB.prepare('DELETE FROM user_sessions WHERE token = ?').bind(token).run();
    return null;
  }
  if (row.expires_at < new Date().toISOString()) {
    await env.DB.prepare('DELETE FROM user_sessions WHERE token = ?').bind(token).run();
    return null;
  }
  return { userId: row.user_id, username: row.username };
}

export async function deleteUserSession(env, token) {
  if (token) await env.DB.prepare('DELETE FROM user_sessions WHERE token = ?').bind(token).run();
}

export function userCookie(token) {
  return `${USER_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${USER_SESSION_DAYS * 86400}`;
}

export function clearUserCookie() {
  return `${USER_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

// ==================== 登录限速（管理员登录防爆破） ====================
// 同一 IP+用户名 连续失败 5 次锁 10 分钟；状态存 D1，跨 Worker 隔离实例生效
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 10 * 60 * 1000;

// 限速键：范围 + IP + 用户名（小写）
export function loginKey(request, scope, username) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  return scope + ':' + ip + ':' + String(username || '').toLowerCase();
}

// 返回剩余锁定分钟数（0 = 未锁定）
export async function loginLockedFor(env, key) {
  const row = await env.DB.prepare('SELECT locked_until FROM login_throttle WHERE key = ?').bind(key).first();
  if (!row || !row.locked_until) return 0;
  const left = new Date(row.locked_until).getTime() - Date.now();
  return left > 0 ? Math.ceil(left / 60000) : 0;
}

export async function recordLoginFail(env, key) {
  await env.DB.prepare(
    'INSERT INTO login_throttle (key, fails, last_fail) VALUES (?, 1, ?) ' +
    'ON CONFLICT(key) DO UPDATE SET fails = fails + 1, last_fail = excluded.last_fail'
  ).bind(key, new Date().toISOString()).run();
  const row = await env.DB.prepare('SELECT fails FROM login_throttle WHERE key = ?').bind(key).first();
  if (row && row.fails >= LOGIN_MAX_FAILS) {
    await env.DB.prepare('UPDATE login_throttle SET locked_until = ?, fails = 0 WHERE key = ?')
      .bind(new Date(Date.now() + LOGIN_LOCK_MS).toISOString(), key)
      .run();
  }
}

export async function clearLoginFails(env, key) {
  await env.DB.prepare('DELETE FROM login_throttle WHERE key = ?').bind(key).run();
}
