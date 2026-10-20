// 在线脚本库（Sprout Pro）公共逻辑：KV 前缀、文件名/UTF-8 校验、签名 payload 与 ECDSA 验签。
// 契约见 AF/sprout-pro-signing/服务端提示词.md。
// 关键点：Node 产出的 ECDSA 签名是 DER（约 70 字节），WebCrypto 的 ECDSA verify 只认
// IEEE P1363 的 raw r||s（P-256 固定 64 字节）——必须先转格式，否则验签恒为 false。
export const SCRIPT_PREFIX = 'scripts/';
// 文件名只取 basename 后按此校验：首字符字母/数字，其后字母数字 . _ -，最长 64 字符 + .sh
export const SCRIPT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}\.sh$/;
// 平台保护上限（不是业务限制）：KV 单值上限 25MiB、Worker 内存有限，
// 超过 20MB 的请求在解析/写 KV 前直接拒绝，避免把 Worker 打爆；业务上不再限制 512KB。
export const MAX_SCRIPT_BYTES = 20 * 1024 * 1024;

// 上传端：从 File.name 或路径里取 basename，非法返回空串（浏览器/客户端可能带路径）
export function normalizeScriptName(raw) {
  const base = String(raw || '').split(/[\\/]/).pop() || '';
  return SCRIPT_NAME_RE.test(base) ? base : '';
}

// 读/删端：URL 参数必须本身就是单段合法文件名，绝不做 basename 归一
//（防 %2F 等被解码成路径分隔符后越出 scripts/ 前缀）
export function strictScriptName(raw) {
  const s = String(raw || '');
  return SCRIPT_NAME_RE.test(s) ? s : '';
}

// 签名覆盖的规范化 payload：字段顺序固定，每行 \n 结尾（description 必须逐字节保留，禁止 trim）
export function scriptPayload({ keyId, name, version, sha256, size, description }) {
  return 'SPROUT-SCRIPT-V1\n' +
    'keyId=' + keyId + '\n' +
    'name=' + name + '\n' +
    'version=' + version + '\n' +
    'sha256=' + sha256 + '\n' +
    'size=' + size + '\n' +
    'description=' + description + '\n';
}

export function isSha256Hex(s) {
  return typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);
}

// KV metadata → 给 App 的清单项。任何必需字段缺失/形状不对都返回 null：
// 宁可这条不出现，也不能下发一条「看起来有签名」的残缺记录。
export function scriptItemFromMeta(name, meta) {
  if (!meta || typeof meta !== 'object') return null;
  const size = Number(meta.size);
  const version = Number(meta.version);
  if (!Number.isInteger(size) || size < 0) return null; // 业务上不设大小上限，只要是非负整数
  if (!Number.isInteger(version) || version < 1) return null;
  if (!isSha256Hex(meta.sha256)) return null;
  if (typeof meta.updatedAt !== 'string' || !meta.updatedAt) return null;
  if (typeof meta.description !== 'string') return null;
  // 兼容旧条目：没有 mode 的按签名条目处理；direct 免签名，不要求 signature/keyId
  const mode = meta.mode === 'direct' ? 'direct' : 'signed';
  if (mode === 'signed') {
    if (typeof meta.signature !== 'string' || !meta.signature) return null;
    if (typeof meta.keyId !== 'string' || !meta.keyId) return null;
  }
  return {
    name,
    description: meta.description,
    size,
    sha256: meta.sha256,
    version,
    updatedAt: meta.updatedAt,
    signature: mode === 'signed' ? meta.signature : '',
    keyId: mode === 'signed' ? meta.keyId : '',
    mode,
  };
}

// 列出 scripts/ 前缀下的全部键（自动翻页），按 name 升序
export async function listScriptRecords(env) {
  const out = [];
  let cursor;
  for (let guard = 0; guard < 100; guard++) {
    const page = await env.MEDIA.list({ prefix: SCRIPT_PREFIX, cursor });
    const keys = (page && page.keys) || [];
    for (const k of keys) {
      const name = String(k.name || '').slice(SCRIPT_PREFIX.length);
      if (!SCRIPT_NAME_RE.test(name)) continue; // 子目录/异形键不进清单
      out.push({ name, metadata: k.metadata || null });
    }
    if (!page || page.list_complete !== false) break;
    cursor = page.cursor;
    if (!cursor) break;
  }
  out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return out;
}

// 只读接口的固定时间比较（长度不同也不提前返回）
export function scriptTokenMatches(request, env) {
  const expected = env.SCRIPTS_TOKEN;
  if (typeof expected !== 'string' || !expected) return false;
  const got = request.headers.get('X-Sprout-Token') || '';
  const a = new TextEncoder().encode(got);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a[i] || 0) ^ (b[i] || 0);
  return diff === 0;
}

// 严格 UTF-8：非法字节序列直接抛错（TextDecoder fatal），不接受替换字符式静默降级。
// ignoreBOM: true 让 U+FEFF 留在字符串里——默认会吞掉 BOM，写回 KV 时字节数变小，
// 与上传时按原始字节算出的 sha256 对不上，App 端验签会莫名失败。
export function decodeUtf8Strict(bytes) {
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
}

export async function sha256Hex(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  let out = '';
  for (let i = 0; i < digest.length; i++) out += digest[i].toString(16).padStart(2, '0');
  return out;
}

export function base64ToBytes(text) {
  const bin = atob(String(text || '').replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// DER ECDSA-Sig-Value → raw r||s（各 32 字节，左侧补零）。
// 容忍 DER 正整数的 0x00 前导（高位为 1 时必须补），其余非规范形态一律拒绝。
export function derSignatureToRaw(der) {
  let offset = 0;
  const need = (n) => {
    if (offset + n > der.length) throw new Error('bad der');
  };
  const readLen = () => {
    need(1);
    let len = der[offset++];
    if (len & 0x80) {
      const n = len & 0x7f;
      if (n < 1 || n > 4) throw new Error('bad der length');
      need(n);
      len = 0;
      for (let i = 0; i < n; i++) len = (len << 8) | der[offset++];
    }
    return len;
  };

  need(2);
  if (der[offset++] !== 0x30) throw new Error('not a sequence');
  const seqLen = readLen();
  if (offset + seqLen !== der.length) throw new Error('bad sequence length');

  const raw = new Uint8Array(64);
  for (let part = 0; part < 2; part++) {
    need(1);
    if (der[offset++] !== 0x02) throw new Error('not an integer');
    const len = readLen();
    need(len);
    if (len < 1) throw new Error('empty integer');
    let v = der.subarray(offset, offset + len);
    offset += len;
    if (v[0] & 0x80) throw new Error('negative integer'); // DER 负数（ECDSA 签名不应出现）
    if (v.length > 33) throw new Error('integer too large');
    if (v.length === 33) {
      if (v[0] !== 0) throw new Error('integer too large');
      v = v.subarray(1);
    }
    if (v.length > 32) throw new Error('integer too large');
    raw.set(v, part * 32 + (32 - v.length));
  }
  if (offset !== der.length) throw new Error('trailing data');
  return raw;
}

// 公钥导入按 isolate 缓存；SCRIPTS_PUBKEY 支持 base64 SPKI（也容忍误贴 PEM）
let pubKeyCache = { source: '', key: null };
export async function importScriptPubKey(env) {
  const source = String(env.SCRIPTS_PUBKEY || '').trim();
  if (!source) return null;
  if (pubKeyCache.source === source) return pubKeyCache.key;
  let b64 = source;
  if (b64.indexOf('-----BEGIN PUBLIC KEY-----') > -1) {
    b64 = b64.replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s+/g, '');
  }
  const key = await crypto.subtle.importKey(
    'spki',
    base64ToBytes(b64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
  pubKeyCache = { source, key };
  return key;
}

// 返回 { ok:true } / { ok:false, reason:'bad-signature'|'missing-key'|'bad-key' }
export async function verifyScriptSignature(env, payload, signatureBase64) {
  let key;
  try {
    key = await importScriptPubKey(env);
  } catch {
    return { ok: false, reason: 'bad-key' };
  }
  if (!key) return { ok: false, reason: 'missing-key' };

  let raw;
  try {
    raw = derSignatureToRaw(base64ToBytes(signatureBase64));
  } catch {
    return { ok: false, reason: 'bad-signature' };
  }
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    raw,
    new TextEncoder().encode(payload)
  );
  return ok ? { ok: true } : { ok: false, reason: 'bad-signature' };
}
