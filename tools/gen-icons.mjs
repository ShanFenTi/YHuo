// 图标生成器（2026-09-09 PWA 批次；一次性工具，可重跑重生成）：纯 Node 内置 zlib 手写 PNG，零 npm 依赖。
// 设计：陶土色 #b0532b 圆角方块（圆角半径 22%）+ 白色几何「Y」（左上→中心 / 右上→中心 / 中心→下方
// 三笔粗线段，线宽 16%，端点随距离判定天然圆润）；每像素 4×4 超采样抗锯齿（≥3）。
// maskable 版：底铺满整幅（直角，防系统圆形/方圆形遮罩裁出透明角），「Y」内容缩进中央 80% 安全区。
// PNG 结构：签名 + IHDR(8bit RGBA) + IDAT(zlib deflate，每行 filter 0) + IEND；CRC32 手写查表版（zlib 不导出）。
// 跑法：node tools/gen-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'assets', 'icons');

const TERRA = [0xb0, 0x53, 0x2b]; // 陶土色（站点主品牌色）
const WHITE = [0xff, 0xff, 0xff];

// 「Y」字形三笔（归一化坐标）：左上臂 / 右上臂 / 下竖，交点在 (0.5, 0.5)
const Y_ARMS = [
  [[0.30, 0.16], [0.50, 0.50]],
  [[0.70, 0.16], [0.50, 0.50]],
  [[0.50, 0.50], [0.50, 0.86]],
];
const STROKE_W = 0.16; // 线宽 16%
const SS = 4;          // 每像素 4×4 超采样

// 点到线段距离（端点圆润：距离 ≤ 半线宽即算覆盖）
function segDist(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}

// 圆角方块 SDF（<0 在形内）；r=0 即满幅直角（maskable 底）
function roundedRectDist(u, v, r) {
  const qx = Math.abs(u - 0.5) - (0.5 - r);
  const qy = Math.abs(v - 0.5) - (0.5 - r);
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

function render(size, { radius = 0.22, contentScale = 1 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const half = (STROKE_W * contentScale) / 2;
  // maskable 内容缩放：三笔端点绕中心 (0.5, 0.5) 收缩到 80% 安全区（线宽同步缩）
  const arms = Y_ARMS.map(([a, b]) => [
    [0.5 + (a[0] - 0.5) * contentScale, 0.5 + (a[1] - 0.5) * contentScale],
    [0.5 + (b[0] - 0.5) * contentScale, 0.5 + (b[1] - 0.5) * contentScale],
  ]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgIn = 0, fgIn = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          if (roundedRectDist(u, v, radius) < 0) bgIn++;
          for (const [a, b] of arms) {
            if (segDist(u, v, a, b) <= half) { fgIn++; break; }
          }
        }
      }
      // source-over 合成：先陶土底，再白「Y」
      const bgCov = bgIn / (SS * SS);
      const fgCov = fgIn / (SS * SS);
      const outA = fgCov + bgCov * (1 - fgCov);
      const i = (y * size + x) * 4;
      if (outA <= 0) { rgba[i + 3] = 0; continue; }
      rgba[i]     = Math.round((WHITE[0] * fgCov + TERRA[0] * bgCov * (1 - fgCov)) / outA);
      rgba[i + 1] = Math.round((WHITE[1] * fgCov + TERRA[1] * bgCov * (1 - fgCov)) / outA);
      rgba[i + 2] = Math.round((WHITE[2] * fgCov + TERRA[2] * bgCov * (1 - fgCov)) / outA);
      rgba[i + 3] = Math.round(outA * 255);
    }
  }
  return rgba;
}

// —— PNG 编码 ——
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // 位深 8
  ihdr[9] = 6;  // 颜色类型 6 = RGBA
  // 压缩/滤波/隔行均默认 0（滤波每行行首独立写 filter 0）
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter 0：None
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const ICONS = [
  ['icon-192.png', 192, { radius: 0.22 }],
  ['icon-512.png', 512, { radius: 0.22 }],
  ['icon-maskable-512.png', 512, { radius: 0, contentScale: 0.8 }], // 底满幅 + 内容缩进 80% 安全区
  ['apple-touch-icon.png', 180, { radius: 0.22 }],
  ['favicon.png', 64, { radius: 0.22 }],
];

mkdirSync(OUT, { recursive: true });
for (const [name, size, opts] of ICONS) {
  writeFileSync(join(OUT, name), encodePng(size, render(size, opts)));
  console.log('  生成 assets/icons/' + name + '（' + size + '×' + size + '）');
}
console.log('完成：' + ICONS.length + ' 张 PNG → assets/icons/');
