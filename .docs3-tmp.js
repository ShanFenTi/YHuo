// 文档同步（重试）：锚点动态取头部当前第一条
const fs = require('fs');
let t = fs.readFileSync('部署说明.md', 'utf8');
const lines = t.split('\n');
const li = 2; // 行3 = 更新时间行
let head = lines[li];
const m = head.match(/本行仅列大项：\*\*[^*]{0,40}/);
if (!m) { console.log('FAIL header anchor'); process.exit(1); }
const a1 = m[0];
const b1 = '本行仅列大项：**后台「写一篇」弹窗三段式重排（站长发截图「优化这个界面」）——①布局：弹窗改 头部固定/滚区（.nb-scroll）/常驻底栏 三段式 flex column，预览/AI 润色/保存挪进底栏常驻（原在正文后流内，长文时要滚很远才够得着保存），任何滚动位置都可直接点；结果盒（预览/润色）留滚区限高 45vh 内部滚动；max-height 92→86vh（顶部留白翻倍，消除「弹窗贴着导航胶囊」的观感——代码上 modal 999>顶栏 50 本就盖住它，纯视觉问题）②正文 textarea min-height 240px（写作主工作区）；≤640px 底栏按钮换行保存靠右③顺修计数 bug：noteResetForm 清空不派发 input，打开弹窗字数计数显示上一次残留（敲键才归零）——清空与编辑回填后各派发一次 input 让 attachCounter 立即同步';
lines[li] = head.replace(a1, b1);
fs.writeFileSync('部署说明.md', lines.join('\n'));

let c = fs.readFileSync('docs/changelog.md', 'utf8');
const ca = '* **后台「写一篇」弹窗有了开合动画**——展开时放大上浮入场、关闭时淡出下沉收场，不再是生硬地突然出现/消失';
const cb = ca + '\n* **弹窗布局三段式重排**——「预览 / AI 润色 / 保存」常驻底部动作栏，写长文时不用再滚到最底找保存；弹窗顶部不再贴着导航胶囊；正文写作区加大；顺修打开弹窗时字数计数不归零的小问题';
if (!c.includes(ca)) { console.log('FAIL ca'); process.exit(1); }
c = c.replace(ca, cb);

// 当前进度行（行5）动态锚
let d = fs.readFileSync('部署说明.md', 'utf8');
const dlines = d.split('\n');
const p2 = dlines[4];
const m2 = p2.match(/当前进度：\*\*2026-10-02（[^（)]{0,30}/);
if (!m2) { console.log('FAIL progress anchor'); process.exit(1); }
dlines[4] = p2.replace(m2[0], '当前进度：**2026-10-02（后台「写一篇」弹窗三段式重排已推送上线——预览/AI 润色/保存常驻底栏（长文也不用滚去找保存）、弹窗顶部不再贴导航胶囊、正文写作区加大、打开弹窗字数计数正确归零（顺修残留 bug））；2026-10-02（');
fs.writeFileSync('部署说明.md', dlines.join('\n'));
console.log('docs OK');
