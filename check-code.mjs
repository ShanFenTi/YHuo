// 一键代码检查（双击 校验代码.bat 运行）：
//   1. index.html / functions/admin/index.js 的内联 <script> 做 new Function 语法校验
//   2. functions/ 下所有 ESM 文件的 import/export 语法 + 相对导入路径真实存在（嵌套目录层级写错当场拦住）
//   3. index.html 的 <script src>/<link href> 引用的本地文件存在
// 退出码非 0 = 有问题；推送前跑一遍，两类"语法没错但一跑就炸"的错误当场现形
import { readFileSync, existsSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = dirname(fileURLToPath(import.meta.url));
let errors = 0;
const fail = (msg) => { errors++; console.log('  ✗ ' + msg); };
const ok = (msg) => console.log('  ✓ ' + msg);

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
checkInlineScripts(join(ROOT, 'index.html'), 'index.html');
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

// ---------- 3. index.html 引用的本地静态文件 ----------
console.log('[3] index.html 本地引用');
{
  const src = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const refRe = /(?:src|href)="(\/[^"']+?)"/g;
  let m, checked = 0, bad = 0;
  while ((m = refRe.exec(src))) {
    const path = m[1].split('?')[0].split('#')[0];
    if (path.startsWith('/api/') || path.startsWith('/media/') || path === '/admin') continue;
    const target = join(ROOT, path);
    checked++;
    if (!existsSync(target)) { bad++; fail(`引用 ${path} 不存在`); }
  }
  if (!bad) ok(`本地静态引用 ${checked} 个全部存在`);
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
