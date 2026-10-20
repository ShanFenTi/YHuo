// DELETE /api/admin/scripts/<name> → 删除脚本（仅超级管理员，中间件统一把关）
// 删除是幂等的：键不存在也返回 ok，后台可安全重试。
import { json } from '../../../lib/util.js';
import { SCRIPT_PREFIX, strictScriptName } from '../../../lib/scripts.js';

export async function onRequestDelete(context) {
  const { env, params } = context;
  if (!env.MEDIA) return json({ ok: false, error: '存储未绑定' }, 500);

  const name = strictScriptName(params && params.name);
  if (!name) return json({ ok: false, error: '文件名不合法' }, 400);

  try {
    await env.MEDIA.delete(SCRIPT_PREFIX + name);
  } catch (e) {
    console.error('[scripts] delete failed', name, e);
    return json({ ok: false, error: '删除脚本失败' }, 500);
  }

  const admin = (context.data && context.data.admin) || {};
  console.log('[scripts] delete by=' + (admin.username || '?') +
    ' file=' + name + ' at=' + new Date().toISOString());

  return json({ ok: true });
}
