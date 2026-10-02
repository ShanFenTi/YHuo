// 一次性脚本：修 admin.js 拆分遗留的双反斜杠正则/转义（模板字符串时代写法在普通 JS 里语义错误）
const fs = require('fs');
let t = fs.readFileSync('assets/admin.js', 'utf8');
const fixes = [
  // 验证码校验： /^\\d{6}$/ → /^\d{6}$/（双反斜杠在普通 JS 正则里匹配字面「\d」，校验永远失败）
  [/\/\^\\\\d\{6\}\$\//g, '/^\\d{6}$/'],
  // 字符串里的换行： '\\n' → '\n'（join/split/prompt 三处，双反斜杠是字面「\n」两字符不是换行）
  [/join\('\\\\n'\)/g, "join('\\n')"],
  [/留言：\\\\n' \+ lines/g, "留言：\\n' + lines"],
  [/原文：\\\\n' \+ text/g, "原文：\\n' + text"],
  [/split\('\\\\n'\)\[0\]/g, "split('\\n')[0]"],
  // 摘要空白折叠： /\\s+/g → /\s+/g
  [/replace\(\/\\\\s\+\/g, ' '\)/g, "replace(/\\s+/g, ' ')"],
];
let applied = 0;
for (const [re, to] of fixes) {
  const before = t;
  t = t.replace(re, to);
  if (t !== before) applied++;
  else console.log('NOT APPLIED:', re);
}
fs.writeFileSync('assets/admin.js', t);
// 复核：不得再有 双反斜杠+dsbwn 组合
const left = t.split('\n').map((l, i) => [i + 1, l]).filter(([n, l]) => /\\\\[dsbwnDSBWN]/.test(l));
console.log('applied:', applied, '| leftover lines:', left.map(([n]) => n).join(','));
