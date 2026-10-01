// /api/admin/* 的统一门卫：没有有效会话一律 401（2026-09-30 起叠加角色分级）
// 超管专属接口（密钥/账号/用户/备份/外观/邮件配置）普通管理员一律 403——
// 前端隐藏入口只是体验，这里是真正的边界；具体接口内的细分（如 schedule 的
// 「测试发送开放普通管理员」）在对应文件内部自行判断
import { getCookie, SESSION_COOKIE } from '../../lib/util.js';
import { getAdminAuth } from '../../lib/auth.js';

const denied = () => new Response(JSON.stringify({ ok: false, error: '该操作需要超级管理员权限' }), {
  status: 403,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});
const unauthorized = () => new Response(JSON.stringify({ ok: false, error: '未登录或会话已过期' }), {
  status: 401,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});

// 完全超管的单文件接口（注意 /api/admin/ai/complete 润色与 /api/admin/email/usage、
// /api/admin/ai/usage 用量统计对普通管理员开放，故不进前缀表、只按完整路径匹配）
const SUPER_EXACT = new Set([
  '/api/admin/ai',          // AI 供应商配置（Key 所在）
  '/api/admin/ai/models',   // 模型挂载管理
  '/api/admin/ai/test',     // 供应商连通测试
  '/api/admin/email',       // 邮件服务配置 / 测试 / 自定义邮件发送
  '/api/admin/email/logs',  // 发送明细（含收件人邮箱）
  '/api/admin/backup',      // 备份清单 / 下载（含用户哈希与邮箱）
]);
// 超管的树形接口（含动态子路径，如 /api/admin/users/[id]、/api/admin/appearance/background）
const SUPER_PREFIX = [
  '/api/admin/users',       // 用户管理（封禁/删除）
  '/api/admin/appearance',  // 外观全局设置
  '/api/admin/admins',      // 管理员账号管理（本功能自身）
  '/api/admin/schedule',    // 课表定时任务（tick 密钥/重新生成/测试发送——2026-09-30 尾部调整：
                            //   邮件页对普通管理员整体隐藏后，此接口随邮件页整口收归超管）
];

export async function onRequest(context) {
  const { request, env } = context;
  const admin = await getAdminAuth(env, getCookie(request, SESSION_COOKIE));
  if (!admin) return unauthorized();
  if (admin.role !== 'super') {
    const path = new URL(request.url).pathname;
    const hit = SUPER_EXACT.has(path) || SUPER_PREFIX.some((p) => path === p || path.startsWith(p + '/'));
    if (hit) return denied();
  }
  // 身份顺带给下游（需要按人处理的接口——me/admins/schedule——也可自行 getAdminAuth 再查一次）
  context.data.admin = admin;
  return context.next();
}
