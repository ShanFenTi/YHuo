// POST /api/admin/albums → 相册新建/重命名/解散/排序
// { action: 'create', name }：新建空相册（落 albums 表，刷新不消失）
// { action: 'rename', from, to }：把 from 相册改名为 to（media.album 与 albums 表同步）
// { action: 'delete', name }：解散相册（图片回"未分组"，不动文件本体，albums 行一并删除）
// { action: 'move', name, dir: 'up'|'down' }：相册排序上移/下移（2026-10-03 相册排序 UI 落地，
//   §11 欠账；后台 ⋯ 菜单操作——侧栏同时承载图片拖放归类，拖拽排序语义冲突故不采用；
//   前台 /album/ 牌堆与照片墙的相册顺序随 albums.sort_order 呈现，playlist.js 随清单下发顺序表）
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  const action = String(body.action || '');

  if (action === 'create') {
    const name = String(body.name || '').trim().slice(0, 50);
    if (!name) return json({ ok: false, error: '相册名不能为空（50 字以内）' }, 400);
    // INSERT OR IGNORE 单语句原子查重（albums.name 是 PRIMARY KEY）：原先 SELECT 预查与裸 INSERT
    // 之间有并发窗口，两个同名请求一起穿过后撞键直接 500；IGNORE 后判 changes=0 即重名，预查成多余删掉
    const res = await env.DB.prepare('INSERT OR IGNORE INTO albums (name) VALUES (?)').bind(name).run();
    if (!res.meta.changes) return json({ ok: false, error: '相册已存在' }, 400);
    return json({ ok: true, album: name });
  }

  if (action === 'rename') {
    const from = String(body.from || '').trim().slice(0, 50);
    const to = String(body.to || '').trim().slice(0, 50);
    if (!from || !to) return json({ ok: false, error: '相册名不能为空（50 字以内）' }, 400);
    if (from === to) return json({ ok: true, album: to });
    const toExists = await env.DB.prepare('SELECT 1 FROM albums WHERE name = ?').bind(to).first();
    if (toExists) return json({ ok: false, error: '相册「' + to + '」已存在' }, 400);
    // 顺序关键：先改 albums 行名，再 INSERT OR IGNORE 兜底"from 只存在于 media 不在 albums"的情况
    // （顺序反了且两行都在时会撞 PRIMARY KEY）
    try {
      await env.DB.batch([
        env.DB.prepare('UPDATE albums SET name = ? WHERE name = ?').bind(to, from),
        env.DB.prepare('INSERT OR IGNORE INTO albums (name) VALUES (?)').bind(to),
        env.DB.prepare('UPDATE media SET album = ? WHERE album = ?').bind(to, from),
      ]);
    } catch {
      // 预查与 batch 之间的并发窗口内另一请求已占用目标名：第一条 UPDATE 撞 albums 主键抛错；
      // batch 是事务、已整体回滚（media.album 原样）无副作用，按「目标名已存在」回 400 而非 500
      return json({ ok: false, error: '相册「' + to + '」已存在' }, 400);
    }
    return json({ ok: true, album: to });
  }

  if (action === 'delete') {
    const name = String(body.name || '').trim().slice(0, 50);
    if (!name) return json({ ok: false, error: '参数错误' }, 400);
    await env.DB.batch([
      env.DB.prepare("UPDATE media SET album = '' WHERE album = ?").bind(name),
      env.DB.prepare('DELETE FROM albums WHERE name = ?').bind(name),
    ]);
    return json({ ok: true });
  }

  if (action === 'move') {
    const name = String(body.name || '').trim().slice(0, 50);
    const dir = String(body.dir || '') === 'up' ? 'up' : 'down';
    if (!name) return json({ ok: false, error: '参数错误' }, 400);
    // 相册名只存在于 media 不在 albums 时先补行（历史派生名自愈）
    await env.DB.prepare('INSERT OR IGNORE INTO albums (name) VALUES (?)').bind(name).run();
    // 按 (sort_order, name) 取当前序，交换相邻项后全量重编号 1..n——存量 sort_order 全 0 的
    // 老数据也在第一次移动时被规范化，无需迁移
    const { results } = await env.DB.prepare('SELECT name FROM albums ORDER BY sort_order, name').all();
    const names = (results || []).map((r) => r.name);
    const i = names.indexOf(name);
    const j = dir === 'up' ? i - 1 : i + 1;
    if (i === -1 || j < 0 || j >= names.length) return json({ ok: true }); // 已在边界：无操作
    const swapped = names.slice();
    swapped[i] = names[j];
    swapped[j] = names[i];
    const stmts = swapped.map((n, k) =>
      env.DB.prepare('UPDATE albums SET sort_order = ? WHERE name = ?').bind(k + 1, n)
    );
    await env.DB.batch(stmts);
    return json({ ok: true });
  }

  return json({ ok: false, error: '未知操作' }, 400);
}
