// GET  /api/admin/scripts → 脚本库列表（从 KV scripts/ 前缀读 metadata）
// POST /api/admin/scripts → multipart 上传：file(.sh) + sig(base64 DER) + description + version + keyId
// 仅超级管理员可用（functions/api/admin/_middleware.js 的 SUPER_PREFIX）。
// 上传校验顺序：文件名 → 大小 → 严格 UTF-8（含 NUL）→ SHA-256/payload → ECDSA 验签 → 写 KV。
// 验签失败绝不落 KV；description 必须逐字节保留（签名覆盖它，trim 会让 App 端验签失败）。
import { json } from '../../../lib/util.js';
import {
  MAX_SCRIPT_BYTES,
  SCRIPT_PREFIX,
  base64ToBytes,
  bytesToBase64,
  decodeUtf8Strict,
  listScriptRecords,
  normalizeScriptName,
  scriptItemFromMeta,
  scriptPayload,
  sha256Hex,
  verifyScriptSignature,
} from '../../../lib/scripts.js';

export async function onRequestGet({ env }) {
  if (!env.MEDIA) return json({ ok: false, error: '存储未绑定' }, 500);
  try {
    const records = await listScriptRecords(env);
    const scripts = records.map((r) => {
      const meta = r.metadata || {};
      const item = scriptItemFromMeta(r.name, meta);
      return {
        name: r.name,
        description: typeof meta.description === 'string' ? meta.description : '',
        size: Number.isInteger(meta.size) ? meta.size : null,
        sha256: typeof meta.sha256 === 'string' ? meta.sha256 : '',
        version: Number.isInteger(meta.version) ? meta.version : null,
        updatedAt: typeof meta.updatedAt === 'string' ? meta.updatedAt : '',
        keyId: typeof meta.keyId === 'string' ? meta.keyId : '',
        valid: !!item,
      };
    });
    return json({ ok: true, scripts });
  } catch (e) {
    console.error('[scripts] admin list failed', e);
    return json({ ok: false, error: '读取脚本列表失败' }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.MEDIA) return json({ ok: false, error: '存储未绑定' }, 500);
  if (typeof env.SCRIPTS_PUBKEY !== 'string' || !env.SCRIPTS_PUBKEY.trim()) {
    return json({ ok: false, error: '脚本服务未配置公钥' }, 503);
  }

  // 只留平台保护上限（业务上不限制大小）：先按 content-length 拦，避免解析超大表单
  // multipart 边界/签名字段给一点余量；20MB 由 MAX_SCRIPT_BYTES 统一决定
  const maxMb = Math.round(MAX_SCRIPT_BYTES / 1024 / 1024);
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_SCRIPT_BYTES + 128 * 1024) {
    return json({ ok: false, error: '脚本超过平台保护上限 ' + maxMb + 'MB' }, 413);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ ok: false, error: '没有收到脚本文件' }, 400);

  // 1. 文件名：只取 basename 后校验
  const name = normalizeScriptName(file.name);
  if (!name) {
    return json({ ok: false, error: '文件名需为 1~64 位字母数字开头、仅含字母数字 . _ -，并以 .sh 结尾' }, 400);
  }

  // 2. 大小：仅平台保护上限（业务上不限制大小）
  if (file.size > MAX_SCRIPT_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return json({ ok: false, error: '脚本超过平台保护上限 ' + maxMb + 'MB（当前 ' + mb + 'MB）' }, 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // 3. 严格 UTF-8，拒绝 NUL
  let text;
  try {
    text = decodeUtf8Strict(bytes);
  } catch {
    return json({ ok: false, error: '脚本不是有效的 UTF-8 文本' }, 400);
  }
  if (text.indexOf('\u0000') > -1) {
    return json({ ok: false, error: '脚本不能包含 NUL 字符' }, 400);
  }

  // 4. 字段校验 + SHA-256 + 重建签名 payload
  const descRaw = form.get('description');
  if (descRaw !== null && typeof descRaw !== 'string') {
    return json({ ok: false, error: '说明字段格式错误' }, 400);
  }
  const description = descRaw === null ? '' : descRaw; // 原样保留，禁止 trim
  if (description.length > 200) return json({ ok: false, error: '说明最长 200 字符' }, 400);
  if (/[\r\n]/.test(description)) return json({ ok: false, error: '说明必须是单行文本' }, 400);

  const versionRaw = form.get('version');
  const version = Number(String(versionRaw === null ? '' : versionRaw).trim());
  if (!Number.isInteger(version) || version < 1 || version > 2147483647) {
    return json({ ok: false, error: '版本必须是正整数' }, 400);
  }

  const keyIdRaw = form.get('keyId');
  const keyId = keyIdRaw === null || keyIdRaw === '' ? '1' : String(keyIdRaw);
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(keyId)) {
    return json({ ok: false, error: 'keyId 格式错误（字母数字 . _ -，最长 64）' }, 400);
  }

  const sigRaw = form.get('sig');
  if (sigRaw === null) return json({ ok: false, error: '没有收到签名文件' }, 400);
  let sigText;
  if (typeof sigRaw === 'string') {
    sigText = sigRaw;
  } else if (typeof sigRaw.text === 'function') {
    sigText = await sigRaw.text();
  } else {
    return json({ ok: false, error: '签名字段格式错误' }, 400);
  }

  let signature;
  try {
    // .sig 文件常带尾随换行：签名本身不受覆盖，去掉空白安全；再规范化成无换行 base64 存 metadata
    signature = bytesToBase64(base64ToBytes(sigText.trim()));
  } catch {
    return json({ ok: false, error: '签名不是有效的 base64' }, 400);
  }

  const sha256 = await sha256Hex(bytes);
  const payload = scriptPayload({ keyId, name, version, sha256, size: bytes.length, description });

  // 5. ECDSA P-256 / SHA-256 验签（DER → raw r||s）
  const verified = await verifyScriptSignature(env, payload, signature);
  if (!verified.ok) {
    if (verified.reason === 'missing-key') return json({ ok: false, error: '脚本服务未配置公钥' }, 503);
    if (verified.reason === 'bad-key') return json({ ok: false, error: '服务端公钥配置错误' }, 503);
    return json({ ok: false, error: '签名校验失败，脚本未写入' }, 400);
  }

  const metadata = {
    size: bytes.length,
    sha256,
    version,
    description,
    updatedAt: new Date().toISOString(),
    signature,
    keyId,
  };

  // KV metadata 上限 1024 字节：极端长说明（多字节字符）可能在签名合法时仍放不下，提前拒绝而不是写入失败
  if (new TextEncoder().encode(JSON.stringify(metadata)).length > 1024) {
    return json({ ok: false, error: '说明过长，元数据超过 KV 1024 字节上限，请缩短说明' }, 400);
  }

  try {
    await env.MEDIA.put(SCRIPT_PREFIX + name, text, { metadata });
  } catch (e) {
    console.error('[scripts] put failed', name, e);
    return json({ ok: false, error: '写入存储失败' }, 500);
  }

  const admin = (context.data && context.data.admin) || {};
  console.log('[scripts] upload by=' + (admin.username || '?') +
    ' file=' + name + ' version=' + version + ' size=' + bytes.length +
    ' sha256=' + sha256 + ' at=' + metadata.updatedAt);

  return json({
    ok: true,
    item: {
      name,
      description,
      size: metadata.size,
      sha256,
      version,
      updatedAt: metadata.updatedAt,
      signature,
      keyId,
    },
  });
}
