// 静态清单自动转正（2026-10-03，站长要求「示例随笔像真实存在一样」，不要手动导入）：
// 仓库 notes/notes.json 的手工条目在首次访问随笔数据时一次性写进 notes 表成为真实行——
// 之后与后台写的文章完全同权（可编辑/转草稿/删除，删除即真删不复活），前台不再有
// 「静态清单 vs 数据库」两套显示形态，后台一旦写过随笔示例就消失的问题不复存在。
// 机制：site_settings 旗标 notes_seed_done 保证只跑一次；清单项按 date+text 幂等去重
// （INSERT…SELECT…WHERE NOT EXISTS 原子写，并发首访也不会重种）；清单不存在/坏格式
// 同样落旗（没东西可种，不每次空转）；只有 ASSETS/DB 异常不落旗，下次请求静默重试。
// 后台「从静态清单导入」按钮保留作兜底（同 date+text 去重口径，互不冲突）。
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 北京时间「YYYY-MM-DD HH:mm」——与 admin/notes.js create 的 created_at 同口径（fmtNoteTime 双口径兼容）
function beijingMinute() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate())
    + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
}

async function setFlag(env) {
  await env.DB.prepare(
    "INSERT INTO site_settings (key, value) VALUES ('notes_seed_done', '1') ON CONFLICT(key) DO UPDATE SET value = '1'"
  ).run();
}

export async function seedStaticNotes(env, request) {
  try {
    const flag = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'notes_seed_done'").first();
    if (flag) return;
    const base = new URL(request.url).origin;
    const res = await env.ASSETS.fetch(base + '/notes/notes.json');
    let list = null;
    if (res.ok) list = await res.json().catch(function () { return null; });
    if (!Array.isArray(list)) { await setFlag(env); return; } // 清单不存在/坏格式：没东西可种，落旗不再空转
    for (const item of list) {
      const date = String((item && item.date) || '').trim();
      const mood = String((item && item.mood) || '').trim().slice(0, 12);
      const text = String((item && item.text) || '').trim();
      if (!DATE_RE.test(date) || !text || text.length > 2000) continue; // 与手动导入同校验口径，坏项跳过
      await env.DB.prepare(
        'INSERT INTO notes (date, mood, text, created_at) SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM notes WHERE date = ? AND text = ?)'
      ).bind(date, mood, text, beijingMinute(), date, text).run();
    }
    await setFlag(env);
  } catch (e) {
    // 静默吞掉：种子失败不影响本请求返回清单，旗标未落下次请求自动重试
  }
}
