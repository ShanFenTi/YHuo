// GET /api/scripts/<name> → 脚本原文（Sprout Pro 只读接口）
// 鉴权与清单接口一致（X-Sprout-Token === SCRIPTS_TOKEN；未配置 token → 503）。
// 成功：text/plain; charset=utf-8 + ETag "<sha256>" + Cache-Control: no-cache，支持 If-None-Match → 304。
// 不存在 / 元数据残缺 / 未签名一律 404：读接口绝不把没有签名的记录当脚本下发。
import { json } from '../../lib/util.js';
import { scriptItemFromMeta, scriptTokenMatches, SCRIPT_PREFIX, strictScriptName } from '../../lib/scripts.js';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'",
};

function fail(status, error) {
  return json({ ok: false, error }, status, SECURITY_HEADERS);
}

function etagMatches(header, etag) {
  if (!header) return false;
  return String(header).split(',').some((part) => {
    let v = part.trim();
    if (v === '*') return true;
    if (v.slice(0, 2) === 'W/') v = v.slice(2);
    return v === etag;
  });
}

export async function onRequestGet({ request, env, params }) {
  if (typeof env.SCRIPTS_TOKEN !== 'string' || !env.SCRIPTS_TOKEN) {
    return fail(503, '脚本服务未配置');
  }
  if (!scriptTokenMatches(request, env)) return fail(401, '令牌无效');
  if (!env.MEDIA) return fail(500, '存储未绑定');

  const name = strictScriptName(params && params.name);
  if (!name) return fail(404, '脚本不存在');

  let obj;
  try {
    obj = await env.MEDIA.getWithMetadata(SCRIPT_PREFIX + name, { type: 'text', cacheTtl: 60 });
  } catch (e) {
    console.error('[scripts] read failed', name, e);
    return fail(500, '读取脚本失败');
  }
  if (!obj || typeof obj.value !== 'string') return fail(404, '脚本不存在');

  const item = scriptItemFromMeta(name, obj.metadata);
  if (!item) return fail(404, '脚本不存在');

  const etag = '"' + item.sha256 + '"';
  const headers = Object.assign({
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
    'ETag': etag,
  }, SECURITY_HEADERS);

  if (etagMatches(request.headers.get('If-None-Match'), etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(obj.value, { status: 200, headers });
}
