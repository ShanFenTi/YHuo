// 等级规则：0~6 级，按累计签到天数。签到卡（/api/user/checkin）与留言板徽标（/api/messages）共用，
// 改阈值只改 LEVELS 数组，存量数据自动重算（等级不入库，实时计算）。
export const LEVELS = [
  { lv: 0, name: '初来乍到', need: 0 },
  { lv: 1, name: '渐入佳境', need: 5 },
  { lv: 2, name: '常客', need: 15 },
  { lv: 3, name: '老朋友', need: 40 },
  { lv: 4, name: '中坚力量', need: 80 },
  { lv: 5, name: '镇站之宝', need: 150 },
  { lv: 6, name: '传奇', need: 300 },
];

// 累计天数 → 等级信息（prev/next 供进度条）
export function levelOf(total) {
  let cur = LEVELS[0];
  let next = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (total >= LEVELS[i].need) cur = LEVELS[i];
    else if (!next) next = LEVELS[i];
  }
  return {
    lv: cur.lv,
    name: cur.name,
    total,
    prev: cur.need,
    next: next ? next.need : null,
    nextName: next ? next.name : null,
  };
}
