// 修复 bs-fix 的 $' 特殊替换模式误伤：把断行/异常行恢复为正确写法，并完成剩余两处未套上的修正
const fs = require('fs');
let t = fs.readFileSync('assets/admin.js', 'utf8');

// 1) 坏行：prompt 字符串里「原文：」后被真换行打断——合并回单反斜杠 \n
const brokenRe = /原文：\n' \+ text/g;
if (brokenRe.test(t)) {
  t = t.replace(/原文：\n' \+ text/g, "原文：\\n' + text");
  console.log('fixed: broken 原文 line re-joined');
} else {
  console.log('WARN: broken 原文 pattern not found');
}

// 2) 验证码替换点复核：正确形态 = 单反斜杠 \d；若被 $' 注入残余行会很长
t.split('\n').forEach((l, i) => {
  if (l.includes('{6}')) console.log('code line', i + 1, 'len', l.length, JSON.stringify(l.trim().slice(0, 90)));
});

// 3) 剩余未修正：摘要空白折叠 replace(/\s+/g 字符串拼接构造，避免正则字面量歧义
const before = t;
t = t.split('replace(/\\\\s+/g').join("replace(/\\s+/g");
if (t !== before) console.log('fixed: s-regex backslash');
else console.log('note: s-regex already single');

fs.writeFileSync('assets/admin.js', t);
