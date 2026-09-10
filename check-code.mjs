// 一键代码检查（双击 校验代码.bat 运行）：
//   1. 八个前台页面（/ 与 tools/docs/ai/board/schedule/blog/notes 七个子页）+ functions/admin/index.js 的内联 <script> 做 new Function 语法校验
//   2. functions/ 下所有 ESM 文件的 import/export 语法 + 相对导入路径真实存在（嵌套目录层级写错当场拦住）
//   3. 各页面 <script src>/<link href> 引用的本地文件存在
//   4. 八页外壳一致性（坑 23：头部/浮层/页脚/播放器等外壳 markup 八页各一份拷贝，漏同步当场报错）
// 退出码非 0 = 有问题；推送前跑一遍，几类"语法没错但一跑就炸"的错误当场现形
import { readFileSync, existsSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = dirname(fileURLToPath(import.meta.url));
let errors = 0;
const fail = (msg) => { errors++; console.log('  ✗ ' + msg); };
const ok = (msg) => console.log('  ✓ ' + msg);

// 多页面改造（2026-09-05）后的前台页面（2026-09-06 增课表页 /schedule/ 与预览页 /blog/、同日移除杂项页 /misc/；
// 2026-09-07 增随笔页 /notes/，2026-09-09 深夜增游戏页、同日应用户要求移除，现共八个）；改外壳（头部/导航/浮层）要多处同步，这里全部把关
const PAGES = ['index.html', 'tools/index.html', 'docs/index.html', 'ai/index.html', 'board/index.html', 'schedule/index.html', 'blog/index.html', 'notes/index.html'];

// ---------- 1. 内联 <script> 语法 ----------
function checkInlineScripts(file, label) {
  const src = readFileSync(file, 'utf8');
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m, i = 0;
  while ((m = re.exec(src))) {
    i++;
    try {
      new Function(m[1]);
      ok(`${label} 内联脚本块 ${i}（${m[1].length} 字符）语法通过`);
    } catch (e) {
      fail(`${label} 内联脚本块 ${i} 语法错误：${e.message}`);
    }
  }
  if (i === 0) fail(`${label} 没找到内联 <script>（正则失效？记得兼容 CRLF）`);
}

console.log('[1] 内联 <script> 语法');
for (const p of PAGES) checkInlineScripts(join(ROOT, p), p);
checkInlineScripts(join(ROOT, 'functions', 'admin', 'index.js'), 'functions/admin/index.js');

// ---------- 2. functions/ ESM：语法 + 相对导入存在性 ----------
function listJs(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listJs(p));
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

console.log('[2] functions/ ESM 语法与 import 路径');
const jsFiles = listJs(join(ROOT, 'functions'));
for (const file of jsFiles) {
  const rel = relative(ROOT, file);
  // 语法：package.json 无 "type":"module"，拷成 .mjs 再 node --check
  const tmp = join(tmpdir(), 'yhuo-check-' + randomName() + '.mjs');
  try {
    writeFileSync(tmp, readFileSync(file, 'utf8'));
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
  } catch (e) {
    fail(`${rel} 语法错误：${String(e.stderr || e.message).split('\n')[0]}`);
    rmSync(tmp, { force: true });
    continue;
  }
  rmSync(tmp, { force: true });

  // 相对导入目标是否存在（含目录 → index？本项目不用的写法直接报出来）
  const src = readFileSync(file, 'utf8');
  const impRe = /import\s+(?:[\s\S]*?from\s+)?['"](\.[^'"]+)['"]/g;
  let m, bad = 0;
  while ((m = impRe.exec(src))) {
    const target = resolve(dirname(file), m[1]);
    if (!existsSync(target)) {
      bad++;
      fail(`${rel} import '${m[1]}' 不存在（检查 ../ 层级是否多写/少写）`);
    }
  }
  if (!bad) ok(`${rel}（${relative(ROOT, file).split('\\').length - 1} 层深，import 全部可达）`);
}

// ---------- 3. 各页面的本地静态文件引用 ----------
console.log('[3] 前台页面本地引用');
{
  let checked = 0, bad = 0;
  for (const p of PAGES) {
    const src = readFileSync(join(ROOT, p), 'utf8');
    const refRe = /(?:src|href)="(\/[^"']+?)"/g;
    let m;
    while ((m = refRe.exec(src))) {
      const path = m[1].split('?')[0].split('#')[0];
      if (path.startsWith('/api/') || path.startsWith('/media/') || path === '/admin') continue;
      if (path === '/feed.xml') continue; // functions/feed.xml.js 文件路由提供（RSS），静态目录里没有该文件，跳过存在性检查
      const target = join(ROOT, path);
      checked++;
      if (!existsSync(target)) { bad++; fail(`${p} 引用 ${path} 不存在`); }
    }
  }
  if (!bad) ok(`八个页面本地静态引用 ${checked} 个全部存在`);
}

// ---------- 4. 八页外壳一致性（坑 23） ----------
// 外壳 = <main>…</main> 之外的全部内容（head + 头部胶囊 + 浮层 + 页脚 + 播放器 + script 引用）。
// 八页本就只差 data-page / <title> / 每页专属描述与 og:*（2026-09-09 SEO 起）/ 导航高亮四处，
// 归一化掉之后应当逐行相等；
// 不等 = 改外壳时漏同步了某个页面，当场报出错页与首个差异行。
console.log('[4] 八页外壳一致性');
{
  const MAIN_OPEN = /<main[\s>]/g;
  const MAIN_CLOSE = /<\/main>/g;
  const shells = PAGES.map((p) => {
    const src = readFileSync(join(ROOT, p), 'utf8');
    const openN = (src.match(MAIN_OPEN) || []).length;
    const closeN = (src.match(MAIN_CLOSE) || []).length;
    const openAt = src.indexOf('<main');
    const closeAt = src.indexOf('</main>');
    if (openN !== 1 || closeN !== 1 || openAt < 0 || closeAt < openAt) {
      fail(`${p} <main> 出现 ${openN}/${closeN} 次，无法定位内容区，该页跳过外壳比对`);
      return null;
    }
    return src.slice(0, openAt) + src.slice(closeAt + '</main>'.length);
  });
  // 差异白名单：页间合法差异（ai-entry 类不在白名单里，各页本就一致，剥掉反而会放过漏改）。
  // 2026-09-09 PWA/SEO 批次起，每页专属的 meta description / og:* 行也按内容剔除后比对
  //（og:title 与各页 <title> 一致，属合法差异；其余 head 行仍要求逐行一致）。
  // 前面已统一 \r\n → \n（坑 8），行尾再兜一层 \s* 兼容残余 \r。
  const norm = (s) => s.replace(/\r\n/g, '\n')
    .replace(/data-page="[^"]*"/g, 'data-page="*"')
    .replace(/<title>[^<]*<\/title>/g, '<title>*</title>')
    .split('\n')
    .filter((line) => !/^\s*<meta (?:name="description"|property="og:)[^>]*>\s*$/.test(line))
    .map((line) => line.includes('nav-link')
      ? line.replace(/\s+aria-current="page"/g, '').replace(/\s+active(?=["\s])/g, '')
      : line)
    .join('\n');
  if (shells[0] === null) {
    fail('首页外壳无法提取，跳过比对');
  } else {
    const base = norm(shells[0]);
    let bad = 0;
    for (let i = 1; i < PAGES.length; i++) {
      if (shells[i] === null) { bad++; continue; }
      const other = norm(shells[i]);
      if (other === base) continue;
      bad++;
      const a = base.split('\n');
      const b = other.split('\n');
      let ln = 0;
      while (ln < Math.min(a.length, b.length) && a[ln] === b[ln]) ln++;
      const snippet = (b[ln] || '(该页外壳提前结束)').trim().slice(0, 60);
      fail(`${PAGES[i]} 外壳与首页不一致（归一化后第 ${ln + 1} 行）：${snippet}`);
    }
    if (!bad) ok(`八个子页外壳与首页一致（比对 ${base.split('\n').length} 行；白名单：data-page/标题/描述与 og:*/导航高亮）`);
  }
}

function randomName() {
  return Math.random().toString(36).slice(2, 10);
}

console.log('');
if (errors) {
  console.log(`✗ ${errors} 个问题，先修再推送`);
  process.exit(1);
} else {
  console.log('✓ 全部通过');
}
