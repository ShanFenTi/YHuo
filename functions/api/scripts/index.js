// GET /api/scripts → Sprout Pro 在线脚本清单（只读，App 用）
// 鉴权：X-Sprout-Token 必须等于环境变量 SCRIPTS_TOKEN；未配置 SCRIPTS_TOKEN 一律 503（fail closed）。
// 返回 {ok:true, scripts:[{name,description,size,sha256,version,updatedAt,signature,keyId,mode}]}，按 name 升序。
// mode=signed 走签名校验；mode=direct 为免签名直传，signature/keyId 固定为空串，原文为原始字节。
// 注意：脚本必须走本接口鉴权读取，绝不能把 scripts/ 加进 functions/media/[[key]].js 的 ALLOWED。
import { json } from '../../lib/util.js';
import { listScriptRecords, scriptItemFromMeta, scriptTokenMatches } from '../../lib/scripts.js';

export async function onRequestGet({ request, env }) {
  if (typeof env.SCRIPTS_TOKEN !== 'string' || !env.SCRIPTS_TOKEN) {
    return json({ ok: false, error: '脚本服务未配置' }, 503);
  }
  if (!scriptTokenMatches(request, env)) {
    return json({ ok: false, error: '令牌无效' }, 401);
  }
  if (!env.MEDIA) return json({ ok: false, error: '存储未绑定' }, 500);

  try {
    const records = await listScriptRecords(env);
    // 只下发元数据完整的条目；残缺/未签名记录绝不进 App 清单
    const scripts = records
      .map((r) => scriptItemFromMeta(r.name, r.metadata))
      .filter(Boolean);
    return json({ ok: true, scripts });
  } catch (e) {
    console.error('[scripts] list failed', e);
    return json({ ok: false, error: '读取脚本清单失败' }, 500);
  }
}
