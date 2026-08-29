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
