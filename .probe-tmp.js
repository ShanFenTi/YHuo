// 最小重现：定位哪条 fix 把「原文：\\n' + text」弄成了真换行
const fs = require('fs');
const old = fs.readFileSync('assets/admin.js', 'utf8');
// 当前坏文件里找到坏行，还原它的原状来测
const badLine = old.split('\n').findIndex(l => l.includes("原文：") && l.trim().endsWith("prompt: '"));

// 逐条 fix 在「老文本副本」上单独跑，看谁动了原文行
const fixes = [
  [/\/\^\\\\d\{6\}\$\//g, '/^\\d{6}$/'],
  [/join\('\\\\n'\)/g, "join('\\n')"],
  [/留言：\\\\n' \+ lines/g, "留言：\\n' + lines"],
  [/split\('\\\\n'\)\[0\]/g, "split('\\n')[0]"],
];
const oldText = "prompt: 'xxx。原文：\\\\n' + text"; // 双反斜杠版（老文件状态）
const oldText2 = "prompt: 'xxx。原文：\\n' + text";  // 单反斜杠版（新模块应有状态）
for (let i = 0; i < fixes.length; i++) {
  const [re, to] = fixes[i];
  const r1 = oldText.replace(re, to);
  const r2 = oldText2.replace(re, to);
  if (r1 !== oldText) console.log('fix#' + i, '改了双反斜杠版 →', JSON.stringify(r1.slice(-22)));
  if (r2 !== oldText2) console.log('fix#' + i, '改了单反斜杠版 →', JSON.stringify(r2.slice(-22)));
}
// 检查当前坏文件的坏行上下文
console.log('坏行 idx:', badLine, '| 下一行:', JSON.stringify(old.split('\n')[badLine + 1]));
