// GET /admin → 管理后台单页（首次使用显示初始化表单，未登录显示登录表单）
// 黑白主题（浅色/深色可切换，本地记住）；页面只是壳，所有数据操作都要过 /api/admin/* 的会话校验
import { html } from '../lib/util.js';

// ⚠️ 下面整页 HTML+CSS+JS 包在模板字符串里：内联代码的正则反斜杠必须双写（\\d、\\.），
//    单写会被模板转义吃掉——/^\d{6}$/ 到浏览器里就成了 /^d{6}$/（匹配 6 个字母 d），
//    管理员绑定邮箱 + 忘记密码重置的验证码校验因此从未通过过（2026-08-31 起，2026-09-04 根治）。改内联正则时务必双写。
const PAGE = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>YHuo 管理后台</title>
<script>
try { document.documentElement.setAttribute('data-theme', localStorage.getItem('adminTheme') || 'light'); } catch (e) {}
</script>
<style>
  /* 语义变量对齐前台 site.css 暖白纸感（浅色）/ 纯黑纸面（深色）；改色值要两块同步 */
  :root, [data-theme="light"] {
    --bg: #f8f7f4; --card: #ffffff; --fg: #1b1c1e; --bg-fg: #f8f7f4;
    --muted: #5f6166; --border: #e6e3da; --chip: #f0ede6; --chip-hover: #e7e3d8;
    --input-bg: #ffffff; --hover: #f0ede6; --row-line: #eceae1;
    --shadow: 0 1px 3px rgba(28,25,20,.06), 0 12px 32px rgba(28,25,20,.07);
    --ok: #16a34a; --warn: #d97706; --danger: #dc2626;
    /* 陶土主题色（对齐前台 terracotta #b0532b）：主按钮/焦点环/进度条/图表强调/开关选中走这里 */
    --brand: #b0532b; --on-brand: #ffffff;
  }
  [data-theme="dark"] {
    --bg: #000000; --card: #1c1c1e; --fg: #f5f5f7; --bg-fg: #000000;
    --muted: #8e8e93; --border: #2c2c2e; --chip: #2c2c2e; --chip-hover: #3a3a3c;
    --input-bg: #232325; --hover: #2c2c2e; --row-line: #2c2c2e;
    --shadow: 0 1px 3px rgba(0,0,0,.5);
    --ok: #4ade80; --warn: #fbbf24; --danger: #f87171;
    --brand: #c96a42; --on-brand: #ffffff;
  }
  /* ---------- 动效令牌（对齐参考博客站的缓动体系：长缓出 + 轻回弹） ---------- */
  :root {
    --ease-soft: cubic-bezier(.16, 1, .3, 1);
    --ease-outc: cubic-bezier(.22, 1, .36, 1);
    --ease-spring: cubic-bezier(.34, 1.56, .64, 1);
    --t-fast: .22s; --t-med: .4s; --t-reveal: .6s;
  }
  /* 主题切换圆形揭示（参考站同款，View Transitions）：旧帧定格垫底、新帧从按钮位置圆形扫开；
     实际 clip 动画由 JS 对 ::view-transition-new(root) 做 element.animate（半径按归一化对角线换算百分比） */
  ::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
  ::view-transition-old(root) { z-index: 1; }
  ::view-transition-new(root) { z-index: 2; }
  /* 细滚动条随主题配色（scrollbar-* 属性可继承） */
  html { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--fg) 25%, transparent) transparent; }
  * { box-sizing: border-box; margin: 0; }
  body {
    min-height: 100vh;
    background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    transition: background .25s, color .25s;
  }
  /* ---------- 顶栏胶囊（复刻前台 site-header/header-pill）+ 窄屏抽屉侧栏 ---------- */
  .shell { min-height: 100vh; }
  .main-col { min-width: 0; }
  .admin-header {
    position: sticky; top: 0; z-index: 50;
    display: flex; justify-content: center;
    padding: 10px 12px 0;
    pointer-events: none; /* 胶囊外点击穿透（前台同款） */
  }
  .header-pill {
    pointer-events: auto;
    display: flex; align-items: center; gap: 6px;
    padding: 5px 8px;
    border-radius: 999px;
    background: rgba(255,255,255,.6);
    -webkit-backdrop-filter: saturate(1.8) blur(22px);
    backdrop-filter: saturate(1.8) blur(22px);
    border: 1px solid rgba(255,255,255,.55);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.45), 0 8px 28px rgba(0,0,0,.1);
    transition: box-shadow .25s var(--ease-outc);
    max-width: 100%;
  }
  [data-theme="dark"] .header-pill {
    background: rgba(30,30,32,.58);
    border-color: rgba(255,255,255,.1);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 8px 28px rgba(0,0,0,.42);
  }
  .admin-header.scrolled .header-pill { box-shadow: inset 0 1px 0 rgba(255,255,255,.45), 0 10px 32px rgba(0,0,0,.16); }
  [data-theme="dark"] .admin-header.scrolled .header-pill { box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 10px 32px rgba(0,0,0,.5); }
  /* 头像圆（原侧栏 brand mark 移植，点击进「我的」） */
  .mark {
    width: 34px; height: 34px; border-radius: 50%; flex: none;
    background: var(--fg); color: var(--bg);
    font-weight: 700; font-size: 13px; letter-spacing: .05em;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; position: relative; overflow: hidden;
    margin-left: 6px;
    transition: transform .15s, box-shadow .15s;
  }
  .mark:hover { transform: scale(1.06); box-shadow: 0 0 0 3px color-mix(in srgb, var(--fg) 18%, transparent); }
  .mark img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  nav.site-nav { display: flex; gap: 2px; min-width: 0; }
  nav.site-nav button {
    height: 34px; padding: 0 13px; border-radius: 999px;
    font-size: 13px; font-weight: 500; white-space: nowrap;
    color: var(--fg); border: none; cursor: pointer; background: transparent;
    transition: background .2s var(--ease-outc), color .2s var(--ease-outc);
  }
  nav.site-nav button:hover { background: var(--hover); }
  nav.site-nav button.active { background: var(--fg); color: var(--bg); font-weight: 600; }
  .header-actions { display: flex; gap: 2px; border-left: 1px solid var(--border); padding-left: 6px; margin-left: 2px; }
  .action-btn {
    width: 34px; height: 34px; border-radius: 50%; flex: none;
    display: flex; align-items: center; justify-content: center;
    padding: 0; /* 抵消全局 button 的 9px 18px 内边距，否则 34px 圆钮里 svg 会被挤成 0 宽 */
    color: var(--fg); border: none; cursor: pointer; background: transparent;
    transition: background .2s var(--ease-outc);
  }
  .action-btn:hover { background: var(--hover); }
  .action-btn svg { width: 16px; height: 16px; display: block; }
  /* 窄屏抽屉侧栏：≤900px 汉堡唤出（宽屏 display:none，导航走胶囊） */
  aside.sidenav { display: none; }
  aside.sidenav .brand { padding: 6px 10px 14px; }
  aside.sidenav .brand h1 { font-size: 16px; font-weight: 700; }
  nav.sidenav-links { display: flex; flex-direction: column; gap: 4px; }
  nav.sidenav-links button {
    display: flex; align-items: center; gap: 10px;
    background: transparent; color: var(--fg);
    padding: 10px 12px; border-radius: 10px; font-size: 14px;
    text-align: left; border: none; cursor: pointer;
    transition: background .2s var(--ease-outc), color .2s var(--ease-outc);
  }
  nav.sidenav-links button:hover { background: var(--hover); }
  nav.sidenav-links button.active { background: var(--fg); color: var(--bg); font-weight: 600; }
  nav.sidenav-links button svg { width: 17px; height: 17px; flex: none; }
  .menu-btn { display: none; }
  main.content { padding: 24px 28px 48px; flex: 1; }
  /* ---------- 悬停预览卡（顶栏栏目实时缩略 + 视频行快速预览；复刻前台 fx-link-preview） ---------- */
  .fx-admin-preview, .video-hover-preview {
    position: fixed; left: 0; top: 0; z-index: 400; /* 压过抽屉(200)、让过预览弹窗(999)/吐司(1001) */
    pointer-events: none;
    opacity: 0; transform: translateY(4px);
    transition: opacity .18s var(--ease-outc), transform .18s var(--ease-outc);
  }
  .fx-admin-preview.is-visible, .video-hover-preview.is-visible { opacity: 1; transform: none; }
  .fx-admin-preview .ap-card {
    position: absolute; left: 0; top: 0; /* 必须可定位：JS 的 left/top 只对 absolute/fixed 生效，缺了会永远钉在容器原点（左上角） */
    width: 320px; overflow: hidden;
    background: var(--card); border: 1px solid var(--border);
    border-radius: 14px; box-shadow: var(--shadow);
  }
  .fx-admin-preview .ap-visual {
    position: relative; height: 112px; overflow: hidden;
    background: color-mix(in srgb, var(--fg) 8%, var(--bg));
  }
  /* 实时缩略：iframe 按 1280 宽渲染、scale(0.25) 缩进 320×112；加载完成前显示「预览加载中…」 */
  .fx-admin-preview .ap-frame-host iframe {
    width: 1280px; height: 448px; border: 0; margin: 0;
    transform: scale(0.25); transform-origin: 0 0;
    position: absolute; left: 0; top: 0;
    pointer-events: none; opacity: 0; transition: opacity .2s;
  }
  .fx-admin-preview .ap-frame-host iframe.is-ready { opacity: 1; }
  .fx-admin-preview .ap-loading {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; color: var(--muted);
  }
  .fx-admin-preview .ap-meta { padding: 9px 14px 11px; display: flex; flex-direction: column; gap: 2px; }
  .fx-admin-preview .ap-domain { font-size: 11px; color: var(--muted); }
  .fx-admin-preview .ap-title { font-size: 13px; font-weight: 600; }
  .fx-admin-preview .ap-desc { font-size: 12px; color: var(--muted); }
  .video-hover-preview {
    width: 320px; overflow: hidden;
    background: var(--card); border: 1px solid var(--border);
    border-radius: 14px; box-shadow: var(--shadow);
  }
  .video-hover-preview video { width: 100%; aspect-ratio: 16 / 9; object-fit: contain; background: #000; display: block; }
  .video-hover-preview .vhp-title {
    padding: 7px 12px; font-size: 12px; font-weight: 500;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .card {
    background: var(--card); border-radius: 18px; padding: 24px;
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
    margin-bottom: 20px;
    transition: border-color var(--t-fast) var(--ease-outc), box-shadow var(--t-med) var(--ease-soft), translate var(--t-med) var(--ease-spring);
  }
  /* 卡片悬浮：轻抬 + 边框加深 + 阴影扩散（触屏设备不触发悬浮态） */
  @media (hover: hover) {
    .card:hover, .stat:hover {
      translate: 0 -2px;
      border-color: color-mix(in srgb, var(--fg) 26%, var(--border));
      box-shadow: 0 2px 6px rgba(0, 0, 0, .06), 0 18px 40px rgba(0, 0, 0, .10);
    }
  }
  .hint { color: var(--muted); font-size: 13px; line-height: 1.6; margin-bottom: 16px; }
  input[type=text], input[type=password] {
    width: 100%; padding: 10px 12px; margin: 6px 0 14px;
    border: 1px solid var(--border); border-radius: 10px; font-size: 15px;
    background: var(--input-bg); color: var(--fg);
  }
  input:focus, textarea:focus, select:focus {
    outline: none; border-color: var(--brand);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 20%, transparent);
  }
  textarea {
    width: 100%; padding: 10px 12px; margin: 6px 0 4px;
    border: 1px solid var(--border); border-radius: 10px; font-size: 14px;
    background: var(--input-bg); color: var(--fg);
    font-family: inherit; line-height: 1.6; resize: vertical; min-height: 90px;
  }
  button {
    padding: 9px 18px; border: none; border-radius: 10px; font-size: 14px;
    background: var(--brand); color: var(--on-brand); cursor: pointer;
    transition: opacity .15s, transform .18s var(--ease-spring), background .15s, color .15s, border-color .15s, box-shadow .2s var(--ease-outc);
  }
  button:hover { opacity: .82; }
  button:active { transform: scale(.97); }
  button.ghost { background: var(--chip); color: var(--fg); }
  button.ghost:hover { background: var(--chip-hover); opacity: 1; }
  button.danger { background: var(--chip); color: var(--fg); font-weight: 700; border: 1px solid var(--border); }
  /* 删除类按钮：悬停转危险色（状态色走 --danger，别改回中性灰） */
  button.danger:hover {
    opacity: 1; color: var(--danger);
    background: color-mix(in srgb, var(--danger) 10%, var(--chip-hover));
    border-color: color-mix(in srgb, var(--danger) 40%, var(--border));
  }
  button:disabled { opacity: .5; cursor: default; }
  button:disabled:hover { opacity: .5; }
  /* 键盘可达性：Tab 聚焦统一焦点环（鼠标点击不触发） */
  :focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
  .msg { min-height: 18px; font-size: 13px; margin-top: 10px; }
  .msg.err { color: var(--fg); font-weight: 700; }
  .msg.err::before { content: "✕ "; }
  .msg.ok { color: var(--muted); }
  .msg.ok::before { content: "✓ "; }
  .appear-label2 { font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: .05em; margin: 20px 0 10px; }
  .accent-row { display: flex; gap: 10px; }
  .accent-dot { width: 34px; height: 34px; border-radius: 50%; border: 3px solid transparent; padding: 0; }
  .accent-dot.active { border-color: var(--fg); }
  .player-mode-btn.active:hover { opacity: 1; } /* 激活态本体走组件层的分组规则（与 vm-chip/el-chip/range-btn 同一份反色 chip） */
  .bgset-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .bg-preview { width: 160px; height: 90px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border); }
  .meta2 { color: var(--muted); font-size: 13px; }
  /* AI 供应商管理：左侧列表 + 右侧详情（仿客户端模型设置页） */
  .ai-mgr { display: flex; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: var(--card); min-height: 420px; }
  .ai-mgr-side { width: 230px; flex: none; border-right: 1px solid var(--border); padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }
  .ai-mgr-group { font-size: 11px; font-weight: 600; color: var(--muted); letter-spacing: .06em; padding: 4px 10px 8px; }
  .ai-mgr-item {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 7px 9px; border-radius: 11px; border: 1px solid transparent;
    background: none; cursor: pointer; font-size: 13.5px; color: var(--fg);
    text-align: left; font-family: inherit;
    transition: background .15s, border-color .15s;
  }
  .ai-mgr-item:hover { background: var(--hover); }
  .ai-mgr-item.active { border-color: var(--border); background: var(--chip); }
  .ai-mgr-item.off { color: var(--muted); }
  .ai-mgr-item .ai-mgr-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
  .ai-mgr-ico {
    flex: none; width: 28px; height: 28px; border-radius: 8px;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--chip); color: var(--fg); opacity: 0.85;
  }
  .ai-mgr-ico svg { display: block; }
  .ai-mgr-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ok) 22%, transparent); }
  .ai-mgr-item.off .ai-mgr-dot { background: transparent; box-shadow: none; border: 1.5px solid var(--muted); }
  .ai-mgr-add {
    margin-top: 10px; background: none; border: 1.5px dashed var(--border); color: var(--fg);
    text-align: left; padding: 8px 10px; font-size: 13px; font-family: inherit; border-radius: 10px; cursor: pointer;
    display: flex; align-items: center; gap: 7px; transition: border-color .15s, background .15s;
  }
  .ai-mgr-add:hover { border-color: var(--muted); background: var(--hover); }
  .ai-mgr-add:disabled { opacity: 0.5; cursor: default; }
  .ai-mgr-add svg { flex: none; opacity: 0.75; }
  .ai-mgr-main { flex: 1; padding: 20px 22px 22px; min-width: 0; }
  /* 自定义下拉（替代 AI 面板原生 select，可做展开动画） */
  .ai-drop { position: relative; display: inline-flex; }
  .ai-drop-full { display: flex; width: 100%; }
  .ai-drop-btn {
    display: inline-flex; align-items: center; gap: 6px; width: 100%;
    padding: 8px 10px; border: 1px solid var(--border); border-radius: 10px;
    background: var(--input-bg); color: var(--fg); font-size: 13px; font-family: inherit;
    cursor: pointer; text-align: left; transition: border-color .15s, background .15s;
  }
  .ai-drop-btn:hover { border-color: var(--muted); }
  .ai-drop-lbl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ai-drop-chev { flex: none; display: inline-flex; opacity: .55; transition: transform .18s ease; }
  .ai-drop-chev svg { display: block; }
  .ai-drop.open .ai-drop-chev { transform: rotate(180deg); }
  .ai-drop-menu {
    position: absolute; top: calc(100% + 5px); left: 0; min-width: 100%; max-height: 240px; overflow-y: auto;
    z-index: 60; background: var(--card); border: 1px solid var(--border); border-radius: 11px;
    box-shadow: var(--shadow); padding: 4px;
    opacity: 0; transform: translateY(-4px) scale(.97); transform-origin: top;
    transition: opacity .16s ease, transform .16s ease; pointer-events: none;
  }
  .ai-drop.open .ai-drop-menu { opacity: 1; transform: none; pointer-events: auto; }
  .ai-drop.up .ai-drop-menu { top: auto; bottom: calc(100% + 5px); transform-origin: bottom; }
  .ai-drop-opt {
    display: flex; align-items: center; gap: 6px; width: 100%;
    padding: 7px 9px; border: none; border-radius: 8px; background: none;
    color: var(--fg); font-size: 13px; font-family: inherit; text-align: left;
    cursor: pointer; white-space: nowrap; transition: background .12s;
  }
  .ai-drop-opt:hover { background: var(--hover); }
  .ai-drop-mark { flex: none; display: inline-flex; width: 14px; height: 14px; opacity: 0; }
  .ai-drop-mark svg { display: block; width: 14px; height: 14px; }
  .ai-drop-opt.on { font-weight: 600; }
  .ai-drop-opt.on .ai-drop-mark { opacity: 1; }
  .ai-model-row .ai-drop.ai-mr-tag .ai-drop-btn { padding: 4px 7px; font-size: 12px; border-radius: 8px; }
  .ai-mgr-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 13px; }
  .ai-mgr-head { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
  .ai-mgr-head strong { font-size: 18px; letter-spacing: -0.01em; }
  .ai-mgr-flex { flex: 1; }
  .ai-pill-on { font-size: 12px; font-weight: 700; color: var(--ok); background: color-mix(in srgb, var(--ok) 13%, transparent); border-radius: 999px; padding: 3px 12px; }
  .ai-pill-off { font-size: 12px; font-weight: 700; color: var(--muted); background: var(--chip); border-radius: 999px; padding: 3px 12px; }
  .icon-mini {
    flex: none; display: inline-flex; align-items: center; justify-content: center;
    background: none; border: none; padding: 6px; border-radius: 8px; cursor: pointer;
    color: var(--fg); opacity: 0.6; font-size: 14px; font-family: inherit;
    transition: background .15s, opacity .15s, color .15s;
  }
  .icon-mini:hover { background: var(--hover); opacity: 1; }
  .icon-mini.danger-hover:hover { color: var(--danger); }
  .icon-mini svg { display: block; }
  .ai-mgr-label { font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: .05em; margin: 16px 0 4px; }
  .ai-key-wrap { display: flex; align-items: center; position: relative; }
  .ai-key-wrap input { flex: 1; margin: 0; padding-right: 44px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13.5px; }
  .ai-key-wrap .ai-key-eye { position: absolute; right: 6px; }
  .ai-model-row {
    display: flex; align-items: center; gap: 6px;
    border: 1px solid var(--border); border-radius: 12px;
    background: color-mix(in srgb, var(--hover) 55%, transparent);
    padding: 5px 5px 5px 14px; margin-bottom: 6px;
    transition: border-color .15s, background .15s;
  }
  .ai-model-row:hover { border-color: var(--muted); }
  .ai-model-row .ai-mr-name {
    flex: 1; min-width: 0; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ai-model-row .ai-mr-def {
    flex: none; font-size: 11px; font-weight: 700; color: var(--ok);
    background: color-mix(in srgb, var(--ok) 13%, transparent);
    border-radius: 999px; padding: 2px 9px;
  }
  .ai-mgr-addmodel {
    display: flex; gap: 6px; margin-top: 0;
    overflow: hidden; max-height: 0; opacity: 0; transform: translateY(-4px);
    transition: max-height .22s ease, opacity .18s ease, transform .18s ease, margin-top .22s ease;
  }
  .ai-mgr-addmodel.show { max-height: 60px; opacity: 1; transform: none; margin-top: 8px; }
  /* 展开动画结束后放开裁剪，否则内里的下拉弹层会被 overflow:hidden 裁掉 */
  .ai-mgr-addmodel.open-ov { overflow: visible; }
  .ai-model-row .star-def.on { color: var(--warn); opacity: 1; }
  .ai-model-row .star-def svg { display: block; }
  .ai-mgr-addmodel input { flex: 1; margin: 0; }
  .ai-test-ok { color: var(--ok); font-weight: 600; }
  .ai-test-err { color: var(--danger); font-weight: 600; }
  @keyframes aiFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .ai-mgr-main.ai-enter { animation: aiFadeIn .2s ease; }
  /* 功能界面切换动效：参考站同款「模糊揭示」——上浮 + 模糊收焦（fill 用默认值，动画结束无残留，
     不占 transform、不破坏面板内 fixed 元素的包含块）；卡片/统计卡再加级联延迟（--stagger-i 由 switchPage 写入） */
  @keyframes panelReveal { from { opacity: 0; transform: translateY(14px); filter: blur(10px); } to { opacity: 1; transform: none; filter: none; } }
  @keyframes cardReveal { from { opacity: 0; transform: translateY(12px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
  .panel-enter { animation: panelReveal var(--t-reveal) var(--ease-soft); }
  .panel-enter .card, .panel-enter .stat, .panel-enter .section-card, .panel-enter .page-head { animation: cardReveal .5s var(--ease-soft) backwards; animation-delay: calc(var(--stagger-i, 0) * 55ms); }
  /* 登录门卡片切换（初始化/登录/找回密码/网络错误）与进入主界面的入场动效：同样靠 hidden 切换自动重播 */
  @keyframes gateIn { from { opacity: 0; transform: translateY(16px) scale(.98); filter: blur(8px); } to { opacity: 1; transform: none; filter: none; } }
  #gateWrap .card:not([hidden]) { animation: gateIn .5s var(--ease-soft); }
  #appShell:not([hidden]) { animation: panelReveal .55s var(--ease-soft); }
  /* 无障碍合规：系统开启"减弱动态效果"时压掉全部动画与过渡（面板/列表/弹窗/下拉/侧边栏一律瞬时完成），
     不再逐个枚举——漏一个就还有动的。无 infinite 动画，iteration-count 收 1 安全 */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
      scroll-behavior: auto !important;
    }
  }
  /* 我的（管理员资料 + 头像） */
  .me-card { display: flex; gap: 24px; align-items: center; max-width: 620px; }
  .me-left { flex: none; text-align: center; }
  .me-avatar {
    width: 88px; height: 88px; border-radius: 50%; margin: 0 auto;
    background: var(--fg); color: var(--bg);
    font-weight: 700; font-size: 26px; letter-spacing: .05em;
    display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
  }
  .me-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .me-avatar-btns { display: flex; gap: 8px; margin-top: 12px; justify-content: center; }
  .me-info { min-width: 0; }
  .me-name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .me-info .meta2 { margin-top: 2px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 22px; }
  .stat {
    background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 16px 18px;
    box-shadow: var(--shadow);
    display: flex; align-items: center; gap: 14px;
  }
  .stat .ico { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; background: var(--chip); color: var(--fg); }
  .stat .ico svg { width: 20px; height: 20px; }
  .stat .num { font-size: 22px; font-weight: 700; line-height: 1.1; }
  .stat .lbl { font-size: 12px; color: var(--muted); }
  /* 上传区：居中式大拖放区（点击/拖入均可；拖入高亮走 .dragover） */
  .upload-row {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px;
    min-height: 130px; padding: 24px 20px; text-align: center; cursor: pointer;
    background: color-mix(in srgb, var(--hover) 40%, transparent);
    border: 1.5px dashed var(--border); border-radius: 16px;
    transition: border-color var(--t-fast) var(--ease-outc), background var(--t-fast) var(--ease-outc);
  }
  .upload-row:hover {
    border-color: color-mix(in srgb, var(--brand) 55%, var(--border));
    background: color-mix(in srgb, var(--brand) 5%, transparent);
  }
  .upload-row .ur-ico {
    width: 44px; height: 44px; border-radius: 14px; margin-bottom: 2px; flex: none;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--brand) 12%, transparent); color: var(--brand);
  }
  .upload-row .ur-ico svg { width: 22px; height: 22px; display: block; }
  .upload-row .upload-hint { margin: 0; max-width: 580px; line-height: 1.6; }
  .upload-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
  .upload-actions input[type=text] { flex: 1 1 220px; margin: 0; }
  .upload-actions button { flex: none; }
  /* 原生 file input 视觉隐藏（保留多选/文件夹/accept 能力），由自定义"选择文件"按钮触发 */
  #fileInput { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .file-pick-btn { flex: none; display: inline-flex; align-items: center; gap: 6px; }
  .file-pick-btn svg { display: block; }
  .file-pick-info {
    display: none; width: 100%; margin-top: 10px;
    padding: 9px 13px; border-radius: 10px; font-size: 12.5px; line-height: 1.6; color: var(--fg);
    background: color-mix(in srgb, var(--ok) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--ok) 30%, var(--border));
  }
  .file-pick-info.show { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; animation: fpiIn .18s ease; }
  .file-pick-info::before { content: "✓ 已选择"; margin-right: 2px; font-weight: 700; color: var(--ok); flex: none; }
  .pick-chip {
    display: inline-flex; align-items: center; gap: 5px; max-width: 100%;
    padding: 2px 4px 2px 10px; border-radius: 999px; font-size: 12px;
    background: var(--card); border: 1px solid color-mix(in srgb, var(--ok) 28%, var(--border));
  }
  .pick-chip .pc-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; }
  .pick-x {
    width: 18px; height: 18px; padding: 0; flex: none;
    border: none; border-radius: 50%; background: var(--chip); color: var(--muted);
    display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    transition: background .15s, color .15s;
  }
  .pick-x:hover { background: color-mix(in srgb, var(--danger) 15%, var(--chip)); color: var(--danger); opacity: 1; }
  .pick-x svg { width: 10px; height: 10px; display: block; }
  @keyframes fpiIn { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: none; } }
  .progress { height: 4px; background: var(--chip); border-radius: 2px; margin-top: 12px; overflow: hidden; display: none; }
  .progress i { display: block; height: 100%; width: 0; background: var(--brand); transition: width .2s; }
  ul.list { list-style: none; padding: 0; margin-top: 14px; }
  ul.list li {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 8px; border-bottom: 1px solid var(--row-line); font-size: 14px;
    border-radius: 8px;
  }
  ul.list li.dragging { opacity: .45; }
  ul.list li.dragover { box-shadow: inset 0 2px 0 var(--fg); }
  .thumb {
    width: 54px; height: 38px; object-fit: cover; flex: none;
    border-radius: 7px; border: 1px solid var(--border); background: var(--chip);
  }
  ul.list li .handle { color: var(--muted); cursor: grab; font-size: 15px; letter-spacing: -2px; user-select: none; padding: 0 2px; }
  ul.list li .title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
  ul.list li .title:hover { text-decoration: underline; }
  ul.list li .meta { color: var(--muted); font-size: 12px; white-space: nowrap; }
  ul.list li button { padding: 5px 10px; font-size: 12px; border-radius: 8px; display: inline-flex; align-items: center; gap: 5px; }
  ul.list li button svg { display: block; }
  /* 行内小图标钮：方形、hover 浅底 */
  .icon-btn-sm {
    padding: 5px 7px !important; line-height: 0; border-radius: 8px;
  }
  .icon-btn-sm svg { display: block; }
  ul.list li:hover { background: color-mix(in srgb, var(--hover) 55%, transparent); }
  /* ---------- 图片页缩略图网格（仅 #list.img-grid；音乐/视频仍走行式列表） ---------- */
  ul.list.img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(164px, 1fr)); gap: 14px; }
  ul.list.img-grid li {
    position: relative; display: flex; flex-direction: column; overflow: hidden;
    padding: 0; border: 1px solid var(--border); border-radius: 14px; background: var(--card);
    transition: border-color var(--t-fast) var(--ease-outc), box-shadow var(--t-med) var(--ease-soft), translate var(--t-med) var(--ease-spring);
  }
  @media (hover: hover) {
    ul.list.img-grid li:hover {
      translate: 0 -2px;
      border-color: color-mix(in srgb, var(--brand) 40%, var(--border));
      box-shadow: 0 2px 6px rgba(0, 0, 0, .06), 0 14px 30px rgba(0, 0, 0, .10);
    }
  }
  ul.list.img-grid li:has(.sel:checked) { border-color: color-mix(in srgb, var(--brand) 55%, var(--border)); }
  ul.list.img-grid li .handle { display: none; } /* 网格里排序走悬停层的 ↑↓，拖拽保留给相册归类 */
  ul.list.img-grid li .sel {
    position: absolute; top: 8px; left: 8px; z-index: 3; margin: 0;
    width: 18px; height: 18px; opacity: 0; transition: opacity .15s;
  }
  ul.list.img-grid li:hover .sel, ul.list.img-grid li:focus-within .sel,
  ul.list.img-grid li .sel:checked { opacity: 1; }
  .img-grid .ic-thumbs { position: relative; }
  .img-grid .thumb { width: 100%; height: auto; aspect-ratio: 4 / 3; display: block; border: none; border-radius: 0; background: var(--chip); }
  .img-grid .ic-ov {
    position: absolute; left: 0; right: 0; bottom: 0;
    display: flex; justify-content: center; align-items: center; gap: 4px; flex-wrap: wrap;
    padding: 24px 6px 6px;
    background: linear-gradient(transparent, rgba(0, 0, 0, .55));
  }
  @media (hover: hover) and (pointer: fine) {
    .img-grid .ic-ov { opacity: 0; pointer-events: none; transition: opacity .18s var(--ease-outc); }
    ul.list.img-grid li:hover .ic-ov, ul.list.img-grid li:focus-within .ic-ov { opacity: 1; pointer-events: auto; }
  }
  /* 悬停层里的操作钮：白色玻璃底压在图片上（同前台毛玻璃配方），触屏常显不隐藏；
     网格里按钮只留图标（文字 span 隐藏，说明走 title 提示）并紧凑化保证单行——
     5 钮（图标 14 + padding 4×5 = 24px/钮，gap 3）共 ~132px，最小列 164px 去掉层内边距剩 ~152px，
     数学上必单行；flex-wrap 仅作极端情况的兜底（坑 36 前身 b881dcf 的「允许换行」治标不治本：
     原 30~36px/钮一行需 ~186px，158px 最小列怎么都放不下，用户实拍仍是 4+1 两行） */
  .img-grid .ic-ov .row-actions {
    margin: 0; opacity: 1; pointer-events: auto; flex-basis: auto;
    flex-wrap: wrap; justify-content: center; max-width: 100%; gap: 3px; row-gap: 4px;
  }
  .img-grid .ic-ov .row-actions span { display: none; }
  .img-grid .ic-ov .row-actions button { padding: 4px 5px !important; background: rgba(255,255,255,.16); color: #ffffff; backdrop-filter: blur(4px); }
  .img-grid .ic-ov .row-actions button svg { width: 14px; height: 14px; }
  .img-grid .ic-ov .row-actions button:hover { background: rgba(255,255,255,.28); opacity: 1; }
  .img-grid .ic-ov .row-actions button.danger:hover {
    color: #ffffff;
    background: color-mix(in srgb, var(--danger) 55%, transparent);
    border-color: color-mix(in srgb, var(--danger) 70%, transparent);
  }
  .img-grid .ic-info { display: flex; flex-direction: column; gap: 3px; padding: 9px 11px 11px; min-width: 0; }
  .img-grid .ic-info .title {
    flex: none; font-size: 13px; font-weight: 600; cursor: pointer;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .img-grid .ic-info .title:hover { text-decoration: underline; }
  .img-grid .ic-info .meta { color: var(--muted); font-size: 11.5px; white-space: nowrap; }
  .img-grid .ic-info .ai-drop.row-album { align-self: flex-start; margin-top: 3px; }
  .img-grid .ic-info .inline-edit { margin: 0 0 2px; }
  .empty { color: var(--muted); font-size: 14px; text-align: center; padding: 34px 0; }
  /* 相册/列表切换淡入动效（搜索输入不触发，仅在整表刷新与切相册时重播） */
  @keyframes listSwap { from { opacity: 0; transform: translateY(6px); filter: blur(4px); } to { opacity: 1; transform: none; filter: none; } }
  #list.list-swap { animation: listSwap .22s ease; }
  .upload-row.dragover { border-color: var(--brand); border-style: solid; background: color-mix(in srgb, var(--brand) 9%, transparent); }
  /* 状态页信息行/用量条改用组件层的 .list-row / .meter-row（2026-09-11 UI 现代化），旧 .st-row 已删 */
  .mail-quota { display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
  .mq-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .upload-hint { color: var(--muted); font-size: 12px; line-height: 1.6; }
  .queue-info { font-size: 13px; color: var(--muted); margin-top: 8px; min-height: 0; }
  /* 首页视频播放模式栏 */
  .video-mode-bar {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    margin-top: 10px; padding: 10px 12px; border-radius: 12px;
    background: var(--hover); border: 1px dashed var(--border); font-size: 13px;
  }
  .vm-chip {
    padding: 3px 12px; font-size: 12px; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--border); background: none; color: var(--muted);
    transition: background .15s, color .15s, border-color .15s;
  }
  .vm-chip:hover { color: var(--fg); border-color: var(--muted); }
  .vm-single { color: var(--ok); font-size: 12px; }
  .row-actions button.vm-set { color: var(--warn); }
  .storage-line { margin-top: 16px; }
  .storage-line > span { font-size: 12px; color: var(--muted); }
  .storage-bar { height: 6px; background: var(--chip); border-radius: 3px; overflow: hidden; margin-top: 6px; }
  .storage-bar i { display: block; height: 100%; width: 0; background: var(--brand); transition: width .3s; }
  .list-tools { display: flex; gap: 10px; align-items: center; margin-top: 18px; flex-wrap: wrap; }
  .list-tools input[type=text] { flex: 1 1 180px; margin: 0; }
  .list-tools label { font-size: 13px; color: var(--muted); cursor: pointer; }
  input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--brand); cursor: pointer; flex: none; }
  /* 滑杆与勾选框同走陶土主题色（原生蓝与主题不搭） */
  input[type="range"] { accent-color: var(--brand); }
  input[readonly] {
    background: color-mix(in srgb, var(--hover) 55%, var(--input-bg)); color: var(--muted);
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px;
  }
  ul.list li .sel { flex: none; }
  .modal { position: fixed; inset: 0; z-index: 999; display: flex; align-items: center; justify-content: center; }
  .modal-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.62); }
  .modal-body {
    position: relative; z-index: 1;
    background: var(--card); color: var(--fg);
    border-radius: 16px; padding: 16px;
    width: min(760px, 92vw); max-height: 88vh; overflow: auto;
  }
  /* 弹窗入场动效：hidden 切换（display none→flex）会自动重播，无需 JS 参与 */
  @keyframes modalBackIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes modalBodyIn { from { opacity: 0; transform: translateY(12px) scale(.96); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
  .modal:not([hidden]) .modal-backdrop { animation: modalBackIn .16s ease; }
  .modal:not([hidden]) .modal-body { animation: modalBodyIn .34s var(--ease-spring); }
  .modal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  .modal-head strong { font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .modal-body audio { width: 100%; margin-top: 4px; }
  .modal-body video { width: 100%; max-height: 68vh; border-radius: 10px; background: #000; }
  .modal-body img { max-width: 100%; max-height: 68vh; border-radius: 10px; display: block; margin: 0 auto; }
  /* 访问趋势 */
  .visit-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
  .visit-head strong { font-size: 15px; }
  .visit-head .spacer { flex: 1; }
  .range-btn { padding: 5px 12px; font-size: 12px; border-radius: 8px; }
  .range-btn svg { display: block; } /* 图标型视图切换按钮 */
  #visitChart svg { width: 100%; height: 170px; display: block; }
  #visitChart .gl { stroke: var(--border); stroke-width: 1; }
  #visitChart .gt { fill: var(--muted); font-size: 10px; font-family: inherit; }
  #visitChart .bar-hit { fill: transparent; pointer-events: all; cursor: pointer; } /* 命中层固定静止，柱子上浮不再丢 hover */
  #visitChart .bar { fill: var(--brand); opacity: .82;
    transition: transform .2s cubic-bezier(.2,.7,.3,1.25), opacity .2s ease, filter .2s ease;
    transform-box: fill-box; transform-origin: center; pointer-events: none; /* 不设就绕 SVG 左上原点缩放，右侧的柱悬停会横向漂移 */
  }
  #visitChart .bar-hit:hover + .bar { opacity: 1; transition: none; transform: translate(var(--dx, 0), var(--dy, -4px)) scale(1.02); } /* 悬停瞬时到位（进即弹），移开后用基础规则的 .2s 缓回 */
  #visitChart .bar.dim { opacity: .16; }
  #visitChart .bar.hl { filter: brightness(1.18); }
  /* 环形图视图：环在左、图例在右双列，窄卡片自动换成上下（donut-mode 类由 renderVisitChart 增删） */
  #visitChart { position: relative; } /* tooltip 定位基准 */
  #visitChart.donut-mode { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 22px; }
  #visitChart.donut-mode svg { width: 400px; max-width: 100%; flex: none; }
  #visitChart.donut-mode .visit-legend { flex: 1; min-width: 230px; flex-direction: column; align-items: flex-start; gap: 2px 14px; margin-top: 0; }
  #visitChart .donut-hit { fill: transparent; pointer-events: all; cursor: pointer; } /* 命中层：静止几何接管 hover，视觉层怎么弹都不丢事件 */
  #visitChart .donut-seg { transition: transform .2s cubic-bezier(.2,.7,.3,1.25), opacity .2s ease, filter .2s ease;
    transform-box: fill-box; transform-origin: center; pointer-events: none; /* scale 必须绕扇区自身，绕 SVG 原点会整体朝右下歪移 */
  }
  #visitChart .donut-seg.donut-today { transform: translate(var(--tx), var(--ty)); } /* 今天的段默认外移 5px 作锚点 */
  #visitChart .donut-hit:hover + .donut-seg { transition: none; transform: translate(var(--dx), var(--dy)) scale(1.06); } /* 进即弹、离缓回（同柱状图） */
  #visitChart .donut-seg.dim { opacity: .16; }
  #visitChart .donut-seg.hl { filter: brightness(1.18); }
  #visitChart .dkey { fill: var(--muted); font-size: 11px; font-family: inherit; }
  #visitChart .dval { fill: var(--fg); font-family: inherit; }
  #visitChart .dann { fill: var(--muted); font-size: 10px; font-family: inherit; }
  .visit-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 12px; }
  .vlg-item {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--muted); padding: 3px 8px; border-radius: 8px;
    cursor: pointer; transition: background .15s, color .15s;
  }
  .vlg-item:hover, .vlg-item.hl { background: var(--hover); color: var(--fg); }
  .vlg-cc { width: 10px; height: 10px; border-radius: 3px; flex: none; }
  .vlg-ct { font-weight: 700; margin-left: 2px; }
  .vlg-today { font-style: normal; font-size: 10px; line-height: 1; background: var(--fg); color: var(--bg); border-radius: 6px; padding: 2px 5px; }
  .visit-tip {
    position: absolute; left: 0; top: 0; pointer-events: none; z-index: 5;
    background: var(--card); border: 1px solid var(--border); border-radius: 10px;
    padding: 7px 11px; font-size: 12px; color: var(--fg); box-shadow: var(--shadow);
    opacity: 0; transition: opacity .12s; white-space: nowrap;
  }
  .visit-tip.show { opacity: 1; }
  /* 归属地滑动开关（最近访问卡片头部） */
  .geo-toggle {
    display: inline-flex; align-items: center; gap: 8px;
    background: none; border: 0; cursor: pointer; padding: 4px 0;
  }
  .geo-toggle .gt-label { font-size: 12px; color: var(--muted); transition: color .15s; }
  .geo-toggle.on .gt-label { color: var(--fg); }
  .geo-toggle .gt-track {
    width: 34px; height: 20px; border-radius: 999px; position: relative;
    background: var(--chip); border: 1px solid var(--border);
    transition: background .18s ease, border-color .18s ease;
  }
  .geo-toggle.on .gt-track { background: var(--brand); border-color: var(--brand); } /* on 态走陶土主题色（与新 .switch 统一） */
  .geo-toggle .gt-thumb {
    position: absolute; top: 50%; left: 2px; width: 14px; height: 14px;
    border-radius: 50%; background: var(--card); box-shadow: var(--shadow);
    transform: translateY(-50%); transition: transform .18s cubic-bezier(.2,.7,.3,1.2);
  }
  .geo-toggle.on .gt-thumb { transform: translate(16px, -50%); }
  /* 滑动开关（原"归属地"开关样式；归属地功能已移除，现仅外观页功能开关使用） */
  #flagRows { display: flex; flex-wrap: wrap; gap: 6px 22px; max-width: 640px; }
  /* 邮件统计：趋势 + 发送明细 */
  .mail-sec-title { font-size: 12px; color: var(--muted); margin: 14px 0 4px; }
  #mailTrend svg { width: 100%; height: 70px; display: block; }
  #mailTrend .mt-bar { fill: var(--brand); opacity: .78; }
  #mailTrend .mt-bar:hover { opacity: 1; }
  #mailTrend .mt-t { fill: var(--muted); font-size: 9px; font-family: inherit; }
  .el-filters { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 8px; }
  .el-chip {
    padding: 3px 11px; font-size: 12px; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--border); background: none; color: var(--muted);
    transition: background .15s, color .15s, border-color .15s;
  }
  .el-chip:hover { color: var(--fg); border-color: var(--muted); }
  #mailLogBox .el-row {
    display: flex; align-items: center; gap: 10px; padding: 7px 0;
    font-size: 13px; border-bottom: 1px solid var(--row-line);
  }
  #mailLogBox .el-row:last-child { border-bottom: none; }
  #mailLogBox .el-time { flex: none; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
  #mailLogBox .el-kind { flex: none; font-size: 11px; padding: 1px 8px; border-radius: 999px; background: var(--chip); color: var(--fg); }
  #mailLogBox .el-to {
    flex: none; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px;
    max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  #mailLogBox .el-subj {
    flex: 1; min-width: 0; color: var(--muted); font-size: 12px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  #mailLogBox .el-status { flex: none; font-weight: 700; }
  #mailLogBox .el-status.ok { color: var(--ok); }
  #mailLogBox .el-status.bad { color: var(--danger); cursor: help; }
  /* 邮件统计动效：进入淡入、趋势柱悬停抬起、明细行悬停高亮 */
  @keyframes mailFadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
  #mailUsageBody { animation: mailFadeIn .25s ease; }
  #mailLogBox { animation: mailFadeIn .2s ease; }
  #mailTrend .mt-bar { transition: transform .16s ease, opacity .16s ease, filter .16s ease; }
  #mailTrend .mt-bar:hover { transform: translateY(-3px); opacity: 1; filter: brightness(1.15); }
  #mailLogBox .el-row { transition: background .15s ease; }
  #mailLogBox .el-row:hover { background: var(--hover); }
  /* 相册管理 */
  select {
    padding: 8px 10px; border: 1px solid var(--border); border-radius: 10px;
    background: var(--input-bg); color: var(--fg); font-size: 13px; max-width: 180px;
  }
  /* 图片页布局：左侧相册栏 + 右侧列表 */
  .image-shell { display: flex; gap: 18px; align-items: flex-start; }
  .album-side {
    width: 210px; flex: none; position: sticky; top: 18px;
    background: var(--card); border: 1px solid var(--border); border-radius: 14px;
    padding: 12px 10px 10px;
  }
  .album-side-head { font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: .08em; padding: 0 8px 8px; }
  .album-side-list { display: flex; flex-direction: column; gap: 2px; }
  .album-side-item {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 8px; border-radius: 9px; cursor: pointer; font-size: 13px;
    border: 1px dashed transparent;
    transition: background 150ms, border-color 150ms;
    user-select: none;
  }
  .album-side-item:hover { background: var(--hover); }
  .album-side-item.active { background: var(--fg); color: var(--bg); font-weight: 600; }
  .album-side-item.drop-hint { border-color: var(--fg); background: var(--chip-hover); }
  .album-side-item .as-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .album-side-item .as-count {
    flex: none; font-size: 11px; color: var(--muted);
    background: var(--chip); border-radius: 999px; padding: 1px 7px; font-variant-numeric: tabular-nums;
  }
  .album-side-item.active .as-count { background: rgba(255,255,255,.2); color: var(--bg); }
  .album-side-item .as-more {
    flex: none; width: 22px; height: 22px; padding: 0; border: none; border-radius: 7px;
    background: none; color: inherit; cursor: pointer; line-height: 1;
    display: inline-flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 120ms;
  }
  .album-side-item .as-more svg { width: 14px; height: 14px; display: block; }
  .album-side-item:hover .as-more, .album-side-item .as-more:focus { opacity: .8; }
  .album-side-new { width: 100%; margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .album-side-new svg { display: block; }
  .album-side-hint { font-size: 12px; color: var(--muted); margin-top: 8px; padding: 0 4px; line-height: 1.5; }
  /* 相册 ⋯ 菜单 */
  .album-menu {
    position: fixed; z-index: 60; min-width: 130px;
    background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    box-shadow: var(--shadow); padding: 5px; display: flex; flex-direction: column;
  }
  .album-menu button {
    border: none; background: none; text-align: left; padding: 8px 10px;
    font-size: 13px; color: var(--fg); border-radius: 8px; cursor: pointer;
  }
  .album-menu button:hover { background: var(--hover); }
  .album-menu button.danger { color: var(--danger); }
  @media (max-width: 900px) {
    .image-shell { flex-direction: column; }
    .album-side { width: 100%; position: static; }
    .album-side-list { flex-direction: row; flex-wrap: wrap; }
    .album-side-item { border: 1px solid var(--border); border-radius: 999px; padding: 5px 10px; }
  }
  ul.list li .ai-drop.row-album .ai-drop-btn { padding: 4px 8px; font-size: 12px; border-radius: 8px; }
  ul.list li .ai-drop.row-album .ai-drop-lbl { max-width: 96px; }
  .avatar {
    width: 34px; height: 34px; border-radius: 50%; flex: none; overflow: hidden;
    background: var(--fg); color: var(--bg);
    font-size: 15px; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
  }
  .avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  [hidden] { display: none !important; }
  /* 行内操作按钮组：桌面悬停/聚焦浮现，触屏设备常显 */
  .row-actions { display: flex; gap: 6px; margin-left: auto; flex: none; }
  @media (hover: hover) and (pointer: fine) {
    .row-actions { opacity: 0; pointer-events: none; transition: opacity .15s; }
    ul.list li:hover .row-actions, ul.list li:focus-within .row-actions,
    .list-row:hover .row-actions, .list-row:focus-within .row-actions { opacity: 1; pointer-events: auto; }
  }
  /* 行内改名输入框 */
  .inline-edit {
    flex: 1; min-width: 0; margin: 0; padding: 5px 9px;
    border: 1px solid var(--fg); border-radius: 8px;
    background: var(--input-bg); color: var(--fg); font-size: 14px;
  }
  /* 全局 toast 轻提示（底部浮现，自动消失） */
  .toast {
    position: fixed; left: 50%; bottom: 30px; z-index: 1001;
    transform: translate(-50%, 16px);
    background: var(--fg); color: var(--bg);
    padding: 10px 20px; border-radius: 12px; font-size: 14px;
    box-shadow: 0 6px 24px rgba(0,0,0,.22);
    opacity: 0; pointer-events: none; max-width: 86vw;
    transition: opacity .25s var(--ease-outc), transform .32s var(--ease-spring);
  }
  .toast.show { opacity: 1; transform: translate(-50%, 0); }
  .toast.err { font-weight: 700; }
  .toast.err::before { content: "✕ "; }
  .toast.ok::before { content: "✓ "; }
  /* 询问弹窗（替代原生 prompt/confirm） */
  .ask-modal-body { width: min(420px, 92vw); }
  .ask-msg { font-size: 14px; line-height: 1.65; margin-bottom: 16px; }
  .ask-btns { display: flex; justify-content: flex-end; gap: 8px; }
  /* 危险确认钮：状态色走 --danger（深浅主题各一档），文字取 --bg 保证两主题对比度（别写死 hex） */
  #askOk.danger-ok { background: var(--danger); color: var(--bg); }
  #askOk.danger-ok:hover { opacity: .88; }
  /* 登录/初始化/网络错误：独立居中卡，不套框架 */
  .gate-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .gate-wrap .card { width: min(420px, 100%); margin-bottom: 0; }
  /* ---------- 组件层（2026-09-11 UI 现代化）：页面标题区/分组卡/字段/表格/列表行/空态/骨架屏/开关/分段/用量条 ----------
     全部走语义变量与动效令牌；选择器特异性压过上方基础控件规则（同特异性时靠书写顺序靠后取胜） */
  .page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px 18px; flex-wrap: wrap; margin: 4px 0 18px; }
  .page-head h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.25; }
  .page-head .ph-desc { color: var(--muted); font-size: 13px; line-height: 1.6; margin-top: 4px; max-width: 660px; }
  .page-head .ph-actions { display: flex; gap: 8px; align-items: center; flex: none; }
  .page-head .ph-actions button { flex: none; white-space: nowrap; }
  .section-card {
    background: var(--card); border: 1px solid var(--border); border-radius: 18px;
    box-shadow: var(--shadow); padding: 20px 22px 22px; margin-bottom: 16px;
  }
  .section-title { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .section-sub { color: var(--muted); font-size: 12.5px; line-height: 1.65; margin-bottom: 12px; }
  @media (hover: hover) {
    .section-card { transition: border-color var(--t-fast) var(--ease-outc); }
    .section-card:hover { border-color: color-mix(in srgb, var(--fg) 22%, var(--border)); }
  }
  .field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .field > label { font-size: 12.5px; font-weight: 600; color: var(--muted); }
  .field .sub { font-size: 12px; color: var(--muted); line-height: 1.6; }
  .field input[type=text], .field input[type=password], .field textarea, .field select { margin: 0; }
  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px 18px; }
  .form-grid .field-full { grid-column: 1 / -1; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .data-table th {
    text-align: left; font-size: 12px; font-weight: 600; color: var(--muted);
    padding: 6px 10px; border-bottom: 1px solid var(--border); white-space: nowrap;
  }
  .data-table td { padding: 9px 10px; border-top: 1px solid var(--row-line); }
  .data-table tbody tr:first-child td { border-top: none; }
  .data-table th.num, .data-table td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .data-table td.ellip { max-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .data-table tbody tr { transition: background .15s ease; }
  .data-table tbody tr:hover { background: color-mix(in srgb, var(--hover) 60%, transparent); }
  /* 统一列表行（随笔/短链/设备/登录记录/备份清单等；媒体与用户列表仍走 ul.list） */
  .list-row {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 10px; border-bottom: 1px solid var(--row-line); font-size: 14px; border-radius: 10px;
  }
  .list-row:last-child { border-bottom: none; }
  .list-row:hover { background: color-mix(in srgb, var(--hover) 55%, transparent); }
  .list-row .lr-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .list-row .lr-title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .list-row .lr-sub { color: var(--muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .list-row .lr-grow { flex: 1; min-width: 0; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); font-size: 12px; }
  .list-row .lr-side { flex: none; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .list-row .lr-side.good { color: var(--ok); }
  .chip-tag {
    flex: none; font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 999px;
    border: 1px solid var(--border); background: var(--chip); color: var(--fg); white-space: nowrap;
  }
  .chip-tag.mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-variant-numeric: tabular-nums; }
  .chip-tag.ok { color: var(--ok); border-color: color-mix(in srgb, var(--ok) 35%, var(--border)); background: color-mix(in srgb, var(--ok) 9%, transparent); }
  .chip-tag.bad { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 35%, var(--border)); background: color-mix(in srgb, var(--danger) 9%, transparent); }
  .chip-tag.banned { background: var(--fg); color: var(--bg); border-color: var(--fg); font-weight: 700; }
  button.chip-tag { cursor: pointer; }
  button.chip-tag:hover { border-color: var(--muted); opacity: 1; }
  /* 空状态（图标 + 主文案 + 副文案；列表/卡片通用） */
  .empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 5px; padding: 36px 16px; color: var(--muted); }
  .empty-state .es-ico {
    width: 46px; height: 46px; border-radius: 14px; margin-bottom: 4px;
    display: flex; align-items: center; justify-content: center;
    background: var(--chip); color: var(--muted);
  }
  .empty-state .es-ico svg { width: 22px; height: 22px; display: block; }
  .empty-state .es-title { color: var(--fg); font-weight: 600; font-size: 14px; }
  .empty-state .es-hint { font-size: 12.5px; line-height: 1.65; max-width: 430px; }
  /* 骨架屏（加载占位；reduced-motion 由全局压缩规则一并瞬时化） */
  @keyframes skPulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
  .sk { border-radius: 8px; background: var(--chip); animation: skPulse 1.4s ease-in-out infinite; }
  .sk-row { display: flex; align-items: center; gap: 12px; padding: 12px 4px; border-bottom: 1px solid var(--row-line); }
  .sk-row:last-child { border-bottom: none; }
  .sk-row .sk-dot { width: 34px; height: 34px; border-radius: 50%; flex: none; }
  .sk-row .sk-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .sk-row .sk-l1 { height: 12px; width: 34%; }
  .sk-row .sk-l2 { height: 10px; width: 62%; }
  /* 自绘开关（原生 checkbox 视觉替换：input 仍保留语义与 JS 读写能力，label 包裹即切换） */
  .switch { position: relative; display: inline-flex; flex: none; width: 40px; height: 23px; }
  .switch input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
  .switch .sw-track {
    position: absolute; inset: 0; border-radius: 999px; pointer-events: none;
    background: var(--chip); border: 1px solid var(--border);
    transition: background .18s ease, border-color .18s ease;
  }
  .switch .sw-thumb {
    position: absolute; top: 50%; left: 3px; width: 17px; height: 17px; border-radius: 50%;
    background: var(--card); box-shadow: 0 1px 3px rgba(0,0,0,.28); pointer-events: none;
    transform: translateY(-50%); transition: transform .18s cubic-bezier(.2,.7,.3,1.2);
  }
  .switch input:checked ~ .sw-track { background: var(--brand); border-color: var(--brand); }
  .switch input:checked ~ .sw-thumb { transform: translate(15px, -50%); }
  .switch input:disabled { cursor: default; }
  .switch input:disabled ~ .sw-track { opacity: .45; }
  .switch input:focus-visible ~ .sw-track { outline: 2px solid var(--fg); outline-offset: 2px; }
  .switch-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  /* 搜索框：左放大镜 + 右一键清空（有值才出现）；input 事件照旧驱动各页过滤 */
  .search-box { position: relative; display: flex; align-items: center; flex: 1 1 190px; min-width: 170px; }
  .search-box .sb-ico { position: absolute; left: 11px; display: flex; color: var(--muted); pointer-events: none; }
  .search-box .sb-ico svg { width: 15px; height: 15px; display: block; }
  .search-box input[type=text] { width: 100%; padding-left: 34px; padding-right: 34px; margin: 0; }
  .search-box .sb-clear {
    position: absolute; right: 6px; display: none; align-items: center; justify-content: center;
    width: 22px; height: 22px; padding: 0; border: none; border-radius: 50%;
    background: var(--chip); color: var(--muted); cursor: pointer;
    transition: background .15s, color .15s;
  }
  .search-box .sb-clear:hover { background: var(--chip-hover); color: var(--fg); }
  .search-box .sb-clear svg { width: 11px; height: 11px; display: block; }
  .search-box.has-value .sb-clear { display: flex; }
  /* 字数计数器（attachCounter 动态挂在输入框下方；超 90% 转警示色） */
  .char-count { font-size: 11px; color: var(--muted); text-align: right; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .char-count.warn { color: var(--warn); font-weight: 700; }
  /* 分段/筛选钮（新标记用 .seg-btn；旧 vm-chip/el-chip/range-btn/player-mode-btn 的激活态收编为同一份反色 chip） */
  .seg { display: inline-flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .seg-btn {
    padding: 5px 13px; font-size: 12.5px; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--border); background: transparent; color: var(--muted);
    transition: background .15s, color .15s, border-color .15s;
  }
  .seg-btn:hover { color: var(--fg); border-color: var(--muted); opacity: 1; }
  .seg-btn.on { background: var(--fg); color: var(--bg); border-color: var(--fg); font-weight: 600; opacity: 1; }
  .vm-chip.active, .el-chip.active, .range-btn.active, .player-mode-btn.active { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  /* 用量条（存储分区/邮件额度）与迷你柱状图 */
  .meter-row { display: flex; align-items: center; gap: 12px; padding: 9px 0; font-size: 13px; border-bottom: 1px solid var(--row-line); }
  .meter-row:last-child { border-bottom: none; }
  .meter-row .mt-name { flex: none; min-width: 64px; color: var(--muted); }
  .meter-row .mt-track { flex: 1; height: 8px; border-radius: 999px; background: var(--chip); overflow: hidden; }
  .meter-row .mt-track i { display: block; height: 100%; width: 0; border-radius: 999px; background: var(--brand); transition: width .3s ease; }
  .meter-row .mt-track i.warn { background: var(--warn); }
  .meter-row .mt-track i.danger { background: var(--danger); }
  .meter-row .mt-meta { flex: none; font-size: 12px; color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .mini-bars { display: flex; align-items: flex-end; gap: 6px; height: 52px; padding-top: 6px; }
  .mini-bars .mb-col { flex: 1; min-width: 0; text-align: center; }
  .mini-bars .mb-bar { background: var(--brand); opacity: .85; border-radius: 3px; }
  .mini-bars .mb-lbl { font-size: 10px; color: var(--muted); margin-top: 3px; }
  /* 登录门：标题与整行按钮 */
  .gate-title { font-size: 21px; font-weight: 800; letter-spacing: .01em; margin-bottom: 10px; }
  .btn-block { display: block; width: 100%; margin-top: 4px; }
  /* 移动端适配 */
  @media (max-width: 900px) {
    /* 窄屏：导航回抽屉，胶囊只留 汉堡/头像/动作钮（前台式占满行宽） */
    .site-nav.pill-nav { display: none; } /* 两档类名压过基础规则 nav.site-nav 的 display:flex */
    .menu-btn { display: flex; }
    .admin-header { padding: 8px 10px 0; }
    .header-pill { width: 100%; }
    aside.sidenav {
      display: flex; flex-direction: column;
      position: fixed; left: 0; top: 0; z-index: 200;
      width: 220px; height: 100vh; padding: 14px 12px;
      background: var(--card); border-right: 1px solid var(--border);
      transform: translateX(-100%); transition: transform .22s;
      overflow-y: auto;
    }
    body.nav-open aside.sidenav { transform: translateX(0); box-shadow: 0 0 0 100vmax rgba(0,0,0,.45); }
    main.content { padding: 16px 16px 40px; }
    .card { padding: 16px; border-radius: 14px; }
    .section-card { padding: 16px; border-radius: 14px; }
    .page-head { margin-bottom: 14px; }
    .page-head h2 { font-size: 19px; }
    .page-head .ph-actions { width: 100%; }
    .page-head .ph-actions .meta2 { flex: 1 1 100%; }
    ul.list li { flex-wrap: wrap; row-gap: 8px; padding: 10px 2px; }
    ul.list li .title { flex: 1 1 40%; }
    ul.list li .meta { margin-left: auto; }
    .row-actions { flex-basis: 100%; margin-left: 0; }
    .list-tools { gap: 8px; }
    .stat { padding: 12px 14px; }
    /* AI 供应商管理：窄屏改上下结构，供应商列表折叠在上 */
    .ai-mgr { flex-direction: column; min-height: 0; }
    .ai-mgr-side {
      width: 100%; flex: none;
      border-right: none; border-bottom: 1px solid var(--border);
      max-height: 36vh; overflow-y: auto;
    }
    .ai-mgr-main { padding: 14px 14px 16px; }
    .ai-mgr-head { flex-wrap: wrap; row-gap: 8px; }
    .ai-mgr-head strong { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ai-mgr-empty { padding: 28px 16px; }
    /* 模型行：名称占满第一行，标签+操作按钮换到第二行 */
    .ai-model-row { flex-wrap: wrap; row-gap: 6px; padding: 8px 8px 8px 14px; }
    .ai-model-row .ai-mr-name { flex: 1 1 100%; white-space: normal; word-break: break-all; }
    /* 添加模型内联表单：输入框占满一行，标签+按钮换行 */
    .ai-mgr-addmodel { flex-wrap: wrap; }
    .ai-mgr-addmodel input { flex: 1 1 100%; }
    .ai-mgr-addmodel.show { max-height: 140px; } /* 换行后内容变高，放开折叠动画上限 */
  }
  /* 触屏没有 HTML5 拖拽：隐藏拖拽柄，排序用 ↑↓ */
  @media (hover: none) {
    ul.list li .handle { display: none; }
  }
  footer { margin-top: 24px; font-size: 12px; color: var(--muted); }
</style>
</head>
<body>
<div class="gate-wrap" id="gateWrap">
  <div class="card" id="setupCard" hidden>
    <p class="gate-title">YHuo 管理后台</p>
    <p class="hint">首次使用：创建超级管理员账号。这个账号只创建这一次，请记好用户名和密码。</p>
    <div class="field"><label for="setupUser">用户名</label><input type="text" id="setupUser" autocomplete="username"></div>
    <div class="field"><label for="setupPass">密码</label><input type="password" id="setupPass" placeholder="至少 6 位" autocomplete="new-password"></div>
    <div class="field"><label for="setupPass2">确认密码</label><input type="password" id="setupPass2" placeholder="再输入一遍密码" autocomplete="new-password"></div>
    <button id="setupBtn" class="btn-block">创建并进入后台</button>
    <div class="msg" id="setupMsg"></div>
  </div>

  <div class="card" id="loginCard" hidden>
    <p class="gate-title">YHuo 管理后台</p>
    <p class="hint">请登录管理后台。</p>
    <div class="field"><label for="loginUser">用户名</label><input type="text" id="loginUser" autocomplete="username"></div>
    <div class="field"><label for="loginPass">密码</label><input type="password" id="loginPass" autocomplete="current-password"></div>
    <!-- 管理员 2FA：开启后密码通过还要输邮箱验证码（此行默认隐藏，needCode 时出现） -->
    <input type="text" id="loginCode" placeholder="6 位邮箱验证码" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="display:none">
    <button id="loginBtn" class="btn-block">登录</button>
    <!-- 忘记密码：管理员邮箱验证码重置（未绑邮箱/未启用邮件服务时隐藏，由前端拉 /api/settings 判断） -->
    <button id="adminForgotBtn" class="ghost btn-block" type="button" style="margin-top:8px;display:none">忘记密码？</button>
    <div class="msg" id="loginMsg"></div>
  </div>

  <div class="card" id="adminResetCard" hidden>
    <p class="gate-title">重置密码</p>
    <p class="hint">通过绑定的管理员邮箱重置密码。</p>
    <div class="field"><label for="arEmail">管理员邮箱</label><input type="text" id="arEmail" autocomplete="email"></div>
    <div class="field"><label for="arCode">验证码</label>
      <div style="display:flex;gap:8px">
        <input type="text" id="arCode" inputmode="numeric" maxlength="6" placeholder="6 位验证码" style="flex:1" autocomplete="one-time-code">
        <button id="arSendBtn" class="ghost" type="button">发送验证码</button>
      </div>
    </div>
    <div class="field"><label for="arNewPass">新密码</label><input type="password" id="arNewPass" placeholder="至少 6 位" autocomplete="new-password"></div>
    <button id="arSubmitBtn" class="btn-block">重置密码</button>
    <button id="arBackBtn" class="ghost btn-block" type="button" style="margin-top:8px">返回登录</button>
    <div class="msg" id="arMsg"></div>
  </div>

  <div class="card" id="neterrCard" hidden>
    <p class="gate-title">YHuo 管理后台</p>
    <p class="hint">无法连接服务器。你的网络访问 Cloudflare 可能不稳定，请稍候点击重试（或检查代理/VPN）。</p>
    <button id="retryBtn" class="btn-block">重试</button>
    <div class="msg" id="netMsg"></div>
  </div>
</div>

<div class="shell" id="appShell" hidden>
  <aside class="sidenav">
    <div class="brand"><h1>管理界面</h1></div>
    <nav class="sidenav-links" id="drawerNav">
      <button data-type="overview" title="概览"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg><span>概览</span></button>
      <button data-type="music" title="音乐"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span>音乐</span></button>
      <button data-type="video" title="视频"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20M2 16h20M8 4v16M16 4v16"/></svg><span>视频</span></button>
      <button data-type="image" title="图片"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><span>图片</span></button>
      <button data-type="notes" title="随笔"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/></svg><span>随笔</span></button>
      <button data-type="links" title="短链"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>短链</span></button>
      <button data-type="users" title="用户"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>用户</span></button>
      <button data-type="appearance" title="外观"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor" stroke="none"/></svg><span>外观</span></button>
      <button data-type="ai" title="AI 设置"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4"/><path d="M9 4h6"/><circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/><path d="M9 17h6"/></svg><span>AI</span></button>
      <button data-type="email" title="邮件"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg><span>邮件</span></button>
      <button data-type="me" title="我的"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>我的</span></button>
      <button data-type="status" title="状态"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20a8 8 0 1 1 8-8"/><path d="M12 12l3.5-3.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><path d="M20 12a8 8 0 0 0-8-8"/></svg><span>状态</span></button>
    </nav>
  </aside>

  <div class="main-col">
    <header class="admin-header" id="adminHeader">
      <div class="header-pill">
        <button id="menuBtn" class="action-btn menu-btn" title="菜单">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
        <div class="mark" id="brandMark" title="我的"><span id="brandMono">YH</span><img id="brandAvatarImg" hidden alt=""></div>
        <nav class="site-nav pill-nav" id="sideNav" aria-label="后台导航">
          <button data-type="overview">概览</button>
          <button data-type="music">音乐</button>
          <button data-type="video">视频</button>
          <button data-type="image">图片</button>
          <button data-type="notes">随笔</button>
          <button data-type="links">短链</button>
          <button data-type="users">用户</button>
          <button data-type="appearance">外观</button>
          <button data-type="ai">AI</button>
          <button data-type="email">邮件</button>
          <button data-type="me">我的</button>
          <button data-type="status">状态</button>
        </nav>
        <div class="header-actions">
          <a class="action-btn" href="/" target="_blank" rel="noopener" title="回前台">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h5v-7h4v7h5V9.5"/></svg>
          </a>
          <button id="themeBtn" class="action-btn" title="切换浅色/深色">
            <svg id="themeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg>
          </button>
          <button id="logoutBtn" class="action-btn" title="退出登录">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
          </button>
        </div>
      </div>
    </header>

    <main class="content">
      <div id="overviewPanel">
        <div class="page-head"><div><h2>概览</h2><p class="ph-desc">站点内容总量、访问趋势与 AI / 邮件用量一览。</p></div></div>
        <div class="stats" id="stats">
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div><div><div class="num" id="statMusic">0</div><div class="lbl">音乐</div></div></div>
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20M2 16h20M8 4v16M16 4v16"/></svg></div><div><div class="num" id="statVideo">0</div><div class="lbl">视频</div></div></div>
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div><div><div class="num" id="statImage">0</div><div class="lbl">图片</div></div></div>
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><div class="num" id="statUsers">0</div><div class="lbl">注册用户</div></div></div>
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></div><div><div class="num" id="statVisits">0</div><div class="lbl">总访问量（历史累计）</div></div></div>
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div><div><div class="num" id="statToday">0</div><div class="lbl">今日访问</div></div></div>
          <div class="stat" style="justify-content:center"><div><div class="num" id="statUptime" style="font-size:15px;white-space:nowrap;font-variant-numeric:tabular-nums;text-align:center">0</div><div class="lbl" style="font-size:11px;text-align:center">网站运行</div></div></div>
        </div>
        <div class="card" id="visitCard">
          <div class="visit-head">
            <strong>访问趋势</strong>
            <span class="meta2" id="visitSumm"></span>
            <span class="spacer"></span>
            <button type="button" class="ghost range-btn" data-range="14">近 14 天</button>
            <button type="button" class="ghost range-btn" data-range="30">近 30 天</button>
            <button type="button" class="ghost range-btn vbar active" data-view="bar" title="柱状图" aria-label="切换为柱状图"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 20V10M12 20V4M18 20v-8M3 20h18"/></svg></button>
            <button type="button" class="ghost range-btn vdonut" data-view="donut" title="环形图" aria-label="切换为环形图"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 8 8" stroke-dasharray="1.6 4"/></svg></button>
          </div>
          <div id="visitChart"></div>
          <p class="hint" id="visitHint" style="margin:10px 0 0" hidden>按天明细从上线开始积累，之前累积的总访问量没有逐日记录。</p>
        </div>
        <div class="card" id="aiUsageCard">
          <div class="visit-head">
            <strong>AI 用量</strong>
            <span class="meta2" id="aiUsageSumm"></span>
          </div>
          <div id="aiUsageBody"><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div></div>
        </div>
        <div class="card" id="mailUsageCard">
          <div class="visit-head">
            <strong>邮件统计</strong>
            <span class="meta2" id="mailUsageSumm"></span>
          </div>
          <div id="mailUsageBody"><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div></div>
        </div>
      </div>

      <div id="mediaPanel" hidden>
    <div class="page-head">
      <div><h2 id="mediaPhTitle">音乐管理</h2><p class="ph-desc" id="mediaPhDesc">站内曲库：前台迷你播放条与悬浮播放器的数据源。</p></div>
    </div>
    <div class="upload-row" id="uploadRow">
      <input type="file" id="fileInput" multiple>
      <div class="ur-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg></div>
      <button type="button" class="ghost file-pick-btn" id="filePickBtn">点击选择文件</button>
      <p class="upload-hint" id="uploadHint">支持一次选多个文件，也可以把文件或整个文件夹拖进来；与已有内容同名的自动跳过；单文件上限 24MB。</p>
    </div>
    <p class="file-pick-info" id="filePickInfo"></p>
    <div class="upload-actions">
      <input type="text" id="titleInput" placeholder="显示名称（可选，仅单个文件时生效）">
      <button id="uploadBtn">上传</button>
    </div>
    <div class="video-mode-bar" id="videoModeBar" hidden>
      <span class="meta2">首页视频播放</span>
      <button type="button" class="ghost vm-chip" data-m="seq">顺序循环</button>
      <button type="button" class="ghost vm-chip" data-m="single">单视频循环</button>
      <button type="button" class="ghost vm-chip" data-m="random">随机播放</button>
      <span class="vm-single" id="vmSingleText"></span>
    </div>
    <div class="progress" id="progress"><i id="progressBar"></i></div>
    <div class="queue-info" id="queueInfo"></div>
    <div class="image-shell" id="imageShell" hidden>
      <aside class="album-side" id="albumSide">
        <div class="album-side-head">相册</div>
        <div class="album-side-list" id="albumSideList"></div>
        <button class="ghost album-side-new" id="albumSideNewBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>新建相册</button>
        <p class="album-side-hint">把图片拖到相册名上即可归类；勾选后点相册名可批量移入。点 ⋯ 重命名或解散（解散不删图）。</p>
      </aside>
      <div class="album-main">
        <div class="storage-line">
          <span id="storageText">存储用量统计中…</span>
          <div class="storage-bar" id="storageBar"><i></i></div>
        </div>
        <div class="list-tools">
          <input type="checkbox" id="selAll">
          <label for="selAll">全选</label>
          <span class="search-box">
            <span class="sb-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
            <input type="text" id="searchInput" placeholder="搜索文件名…">
            <button type="button" class="sb-clear" data-for="searchInput" title="清空搜索" aria-label="清空搜索"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
          </span>
          <button id="batchDelBtn" class="danger" hidden>删除所选</button>
        </div>
        <ul class="list" id="list"></ul>
        <div class="empty-state" id="empty" hidden>
          <span class="es-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></span>
          <span class="es-title">还没有内容</span>
          <span class="es-hint">先上传一个文件吧；也可以拖动条目调整顺序。</span>
        </div>
      </div>
    </div>
  </div>

  <div id="notesPanel" hidden>
    <div class="page-head"><div><h2>随笔管理</h2><p class="ph-desc">前台 /notes/ 时间线的内容源；保存后访客刷新即生效。</p></div></div>
    <div class="card" style="margin-bottom:16px">
      <p class="appear-label2" style="margin-top:0" id="noteFormTitle">新增随笔（日期自动取当天）</p>
      <div class="field" style="max-width:280px"><label for="noteMood">天气 / 时段（可空）</label>
        <input type="text" id="noteMood" placeholder="如 晴 / 雨 / 夜" maxlength="12">
      </div>
      <div class="field" style="margin-top:12px"><label for="noteText">正文</label>
        <textarea id="noteText" rows="4" placeholder="1~2000 字；支持迷你 Markdown：**粗** *斜* 行内码 [链接](url) > 引用，前台按它渲染"></textarea>
      </div>
      <div class="bgset-row" style="margin-top:10px">
        <button id="noteSaveBtn" type="button">保存</button>
        <button id="noteCancelEditBtn" class="ghost" type="button" hidden>取消编辑</button>
        <span class="meta2" id="noteFormMsg"></span>
      </div>
    </div>
    <div class="card">
      <div class="visit-head"><strong>全部随笔</strong><span class="meta2" id="notesSumm"></span></div>
      <div class="bgset-row" style="margin-top:8px">
        <button id="notesImportBtn" class="ghost" type="button">从静态清单导入</button>
        <span class="meta2">把 notes/notes.json 里的存量随笔导入数据库（日期与正文完全相同的自动跳过）；导入后前台以数据库为准。</span>
      </div>
      <div id="notesList" style="margin-top:10px"></div>
    </div>
  </div>

  <div id="linksPanel" hidden>
    <div class="page-head"><div><h2>短链管理</h2><p class="ph-desc">创建 /s/码 302 跳转外链并计次；访客直接访问 /s/码 即生效。</p></div></div>
    <div class="card" style="margin-bottom:16px">
      <div class="form-grid">
        <div class="field"><label for="linkCode">自定义短码（可空）</label><input type="text" id="linkCode" placeholder="2~32 位字母数字_-" maxlength="32"></div>
        <div class="field"><label for="linkUrl">目标链接</label><input type="text" id="linkUrl" placeholder="http(s):// 开头"></div>
      </div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="linkCreateBtn" type="button">创建短链</button>
        <span class="meta2">短码留空则自动生成 6 位；与站内路由撞名的保留路径（admin / api / assets / 图片音乐等）不接受。</span>
      </div>
    </div>
    <div class="card">
      <div class="visit-head"><strong>全部短链</strong><span class="meta2" id="linksSumm"></span></div>
      <div id="linksList" style="margin-top:10px"></div>
    </div>
  </div>

  <div id="userPanel" hidden>
    <div class="page-head"><div><h2>用户管理</h2><p class="ph-desc">注册用户列表：搜索、封禁与删除。封禁立即踢下线；删除同时清除其数据，不可恢复。</p></div></div>
    <div class="card">
      <div class="list-tools" style="margin-top:0">
        <span class="search-box">
          <span class="sb-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
          <input type="text" id="userSearch" placeholder="搜索用户名…">
          <button type="button" class="sb-clear" data-for="userSearch" title="清空搜索" aria-label="清空搜索"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        </span>
        <button class="ghost" id="userSortBtn" title="切换排序">注册时间：新→旧</button>
      </div>
      <ul class="list" id="userList"></ul>
      <div class="empty-state" id="userEmpty" hidden>
        <span class="es-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
        <span class="es-title">还没有用户</span>
        <span class="es-hint">有访客在前台注册后会出现在这里。</span>
      </div>
    </div>
  </div>

  <div id="appearancePanel" hidden>
    <div class="page-head"><div><h2>外观设置</h2><p class="ph-desc">全站默认外观：访客自己在主页没改过时才会采用；改过的以访客本地选择为准。</p></div></div>
    <div class="section-card">
      <p class="section-title">默认主题色</p>
      <div class="accent-row" id="accentRow" style="margin-top:12px"></div>
    </div>
    <div class="section-card">
      <p class="section-title">默认背景图</p>
      <div class="bgset-row" style="margin-top:12px">
        <img id="bgPreview" class="bg-preview" hidden alt="当前默认背景">
        <span id="bgNone" class="meta2">未设置（使用网站自带背景）</span>
        <input type="file" id="bgFileInput" accept=".jpg,.jpeg,.png,.gif,.webp,.avif,.bmp" hidden>
        <button id="bgUploadBtn2" class="ghost">上传背景图</button>
        <button id="bgClearBtn2" class="danger">清除</button>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">默认背景模糊</p>
      <div class="bgset-row" style="margin-top:12px">
        <input type="range" id="bgBlurAdmin" min="0" max="30" value="0" style="max-width:220px">
        <span class="meta2" id="bgBlurAdminVal">未设置（访客不模糊）</span>
        <button id="bgBlurSaveBtn" class="ghost">保存模糊度</button>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">主页寄语</p>
      <p class="section-sub">保存多条后前台随机显示其一；全部删除则恢复每日一言。</p>
      <div id="quoteRows"></div>
      <div class="bgset-row" style="margin-top:10px">
        <button id="quoteAddBtn" class="ghost" type="button">添加一条</button>
        <button id="quoteSaveBtn" class="ghost" type="button">保存寄语</button>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">功能开关</p>
      <p class="section-sub">关闭的界面前台直接隐藏，保存后访客下次进页面生效。AI 界面跟随「AI」页的全局启用开关，不在这里控制。</p>
      <div id="flagRows"></div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="flagSaveBtn" class="ghost" type="button">保存功能开关</button>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">底部音乐播放器</p>
      <p class="section-sub">两种款式共用站内曲库，保存后访客下次进页面生效。</p>
      <div class="seg" style="margin-top:2px">
        <button id="playerModeMini" class="ghost player-mode-btn" type="button">迷你播放条（原版）</button>
        <button id="playerModeBlog" class="ghost player-mode-btn" type="button">悬浮播放器（博客款）</button>
      </div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="playerSaveBtn" class="ghost" type="button">保存播放器设置</button>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">备份</p>
      <div class="bgset-row" style="margin-top:12px">
        <button id="exportBtn" class="ghost">导出媒体清单备份（JSON）</button>
        <span class="meta2">含全部媒体条目与访问地址；KV 里的文件本体请自行下载保存。</span>
      </div>
    </div>
  </div>

  <div id="aiPanel" hidden>
    <div class="page-head"><div><h2>AI 服务</h2><p class="ph-desc">配置模型供应商、API Key 与模型列表；前台 AI 助手经服务端代理调用，Key 永不下发到浏览器。</p></div></div>
    <p class="appear-label2" style="margin-top:0">模型供应商</p>
    <div class="ai-mgr">
      <aside class="ai-mgr-side">
        <div class="ai-mgr-group">自定义供应商</div>
        <div id="aiProvList"></div>
        <button id="aiAddBtn" class="ai-mgr-add" type="button"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>添加供应商</button>
      </aside>
      <div class="ai-mgr-main" id="aiProvDetail" hidden>
        <div class="ai-mgr-head">
          <strong id="aiProvName" hidden></strong>
          <input type="text" id="aiProvNameInput" hidden maxlength="30" placeholder="供应商名称（如 deepseek）" style="max-width:240px;margin:0">
          <button id="aiRenameBtn" class="icon-mini" type="button" title="重命名"></button>
          <span id="aiProvState" class="ai-pill-on">已启用</span>
          <button id="aiToggleProvBtn" class="ghost" type="button">禁用</button>
          <span class="ai-mgr-flex"></span>
          <button id="aiDelProvBtn" class="icon-mini" type="button" title="删除供应商"></button>
        </div>
        <div class="form-grid" style="margin-top:12px">
          <div class="field"><label for="aiBaseUrl">Base URL</label>
            <input type="text" id="aiBaseUrl" placeholder="https://api.deepseek.com（留空用所选格式的官方默认）">
          </div>
          <div class="field"><label>API 格式</label><span id="aiProtocol" class="ai-drop-full"></span></div>
        </div>
        <div class="field" style="margin-top:14px"><label for="aiApiKey">API Key</label>
          <div class="ai-key-wrap">
            <input type="password" id="aiApiKey" autocomplete="new-password" placeholder="sk-…">
            <button id="aiKeyEye" class="icon-mini ai-key-eye" type="button" title="显示/隐藏"></button>
          </div>
          <span class="sub" id="aiKeyHint">未设置</span>
        </div>
        <div class="field" style="margin-top:14px"><label for="aiPrompt">系统提示词（AI 人设，可选，≤2000 字）</label>
          <textarea id="aiPrompt" rows="3" maxlength="2000" placeholder="例如：回答简洁友好，默认用中文。"></textarea>
        </div>
        <p class="ai-mgr-label">模型列表</p>
        <div id="aiModelRows"></div>
        <div class="ai-mgr-addmodel" id="aiAddModelWrap">
          <input type="text" id="aiNewModelInput" list="aiModelList" maxlength="100" placeholder="输入模型名（如 deepseek-v4-flash）">
          <datalist id="aiModelList"></datalist>
          <span id="aiNewModelTag" class="ai-mr-tag" title="模型类型标签（前台菜单里显示）"></span>
          <button id="aiAddModelOk" class="ghost" type="button">确定</button>
          <button id="aiAddModelCancel" class="ghost" type="button">取消</button>
        </div>
        <div class="bgset-row" style="margin-top:10px">
          <button id="aiAddModelBtn" class="ghost" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>添加模型</button>
          <button id="aiFetchModelsBtn" class="ghost" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>自动获取</button>
          <span class="meta2" id="aiModelHint">自动获取会请求该供应商的 /models 接口</span>
        </div>
        <div class="bgset-row" style="margin-top:18px">
          <button id="aiSaveBtn" type="button">保存供应商</button>
          <button id="aiTestBtn" class="ghost" type="button">测试连接</button>
          <span class="meta2" id="aiTestResult"></span>
        </div>
      </div>
      <div class="ai-mgr-empty" id="aiProvEmpty">从左侧选择一个供应商，或点"添加供应商"。</div>
    </div>
    <div class="section-card" style="margin-top:18px">
      <p class="section-title">全局开关</p>
      <div class="bgset-row" style="margin-top:10px">
        <button id="aiToggleBtn" class="ghost">停用 AI</button>
        <span class="meta2" id="aiStateText">状态读取中…</span>
      </div>
    </div>
  </div>

  <div id="emailPanel" hidden>
    <div class="page-head">
      <div><h2>邮件服务</h2><p class="ph-desc">注册邮箱验证 / 找回密码 / 登录二次验证与课表提醒邮件都在这里配置。</p></div>
      <div class="ph-actions">
        <span class="meta2" id="emailStateText">状态读取中…</span>
        <button id="emailToggleBtn" class="ghost" type="button">停用</button>
        <button id="emailSaveBtn" type="button">保存配置</button>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">服务配置</p>
      <p class="section-sub">服务商都走 HTTP API（Cloudflare Workers 原生支持）；API Key 保存后不再回显，编辑留空即保留原值。</p>
      <div class="form-grid">
        <div class="field"><label>服务商</label><span id="emailProviderDrop" class="ai-drop-full"></span></div>
        <div class="field"><label for="emailFrom">发件地址</label><input type="text" id="emailFrom" placeholder="noreply@yourdomain.com"><span class="sub">需在服务商侧完成发件人验证。</span></div>
        <div class="field field-full"><label for="emailApiKey">API Key</label>
          <div class="ai-key-wrap">
            <input type="password" id="emailApiKey" autocomplete="new-password" placeholder="re_…（Resend）/ xkeysib-…（Brevo）">
            <button id="emailKeyEye" class="icon-mini ai-key-eye" type="button" title="显示/隐藏"></button>
          </div>
          <span class="sub" id="emailKeyHint">未设置</span>
        </div>
        <div class="field field-full"><label for="emailOwnerInput">站长邮箱</label>
          <input type="text" id="emailOwnerInput" placeholder="you@example.com">
          <span class="sub">「仅站长使用」模式下唯一能收验证码的地址，填你注册 Resend 的邮箱；清空后点「保存配置」即移除，「仅站长使用」会自动关闭。</span>
        </div>
      </div>
      <div class="bgset-row" style="margin-top:14px">
        <button id="emailAdminOnlyBtn" class="ghost" type="button">开启"仅站长使用"</button>
        <span class="meta2" id="emailAdminOnlyText">关闭：所有用户可用邮箱功能</span>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">测试发送</p>
      <div class="form-grid" style="margin-top:12px">
        <div class="field"><label for="emailTestTo">收件邮箱</label><input type="text" id="emailTestTo" placeholder="you@example.com"></div>
      </div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="emailTestBtn" class="ghost" type="button">发送测试邮件</button>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">自定义邮件</p>
      <p class="section-sub">给任意邮箱发任意内容（纯文本，支持换行，≤5000 字）。</p>
      <div class="form-grid">
        <div class="field"><label for="emailCustomTo">收件邮箱</label><input type="text" id="emailCustomTo" placeholder="to@example.com"></div>
        <div class="field"><label for="emailCustomSubject">邮件主题</label><input type="text" id="emailCustomSubject" placeholder="主题"></div>
        <div class="field field-full"><label for="emailCustomText">邮件正文</label><textarea id="emailCustomText" rows="5" placeholder="正文（纯文本，支持换行）"></textarea></div>
      </div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="emailCustomBtn" type="button">发送</button>
        <span class="meta2" id="emailCustomMsg"></span>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">课表提醒定时任务</p>
      <p class="section-sub">用户课表的每日早报 / 重点课课前提醒。Pages Functions 不支持定时触发，需要外部 cron 每 5 分钟访问下面的 URL——推荐 cron-job.org（免费）：注册后新建任务，地址填下面的 URL，执行间隔选「每 5 分钟」。</p>
      <div class="field">
        <label for="schedTickUrl">Tick 地址（首次查看自动生成密钥）</label>
        <div class="bgset-row">
          <input type="text" id="schedTickUrl" readonly style="flex:1;min-width:220px;max-width:520px">
          <button id="schedTickCopyBtn" class="ghost" type="button">复制</button>
        </div>
      </div>
      <p class="meta2" id="schedTickLast" style="margin-top:8px"></p>
      <div class="bgset-row" style="margin-top:8px">
        <button id="schedTickRegenBtn" class="ghost" type="button">重新生成密钥</button>
        <button id="schedTickRunBtn" class="ghost" type="button">立即执行一次</button>
        <span class="meta2" id="schedTickMsg"></span>
      </div>
      <div class="field" style="margin-top:18px;max-width:420px">
        <label for="schedTestTo">发送测试提醒（收件邮箱留空 = 站长邮箱）</label>
        <div class="bgset-row">
          <input type="text" id="schedTestTo" placeholder="留空 = 站长邮箱" style="flex:1;min-width:200px">
          <button id="schedTestBtn" class="ghost" type="button">发送</button>
        </div>
        <span class="sub" id="schedTestMsg"></span>
      </div>
      <p class="meta2" style="margin-top:10px">按真实课表算出「今天该发什么」，立即发送早报 / 课前提醒样式的【测试】邮件（不用等真实到点，不影响防重发记录）。收件人须是绑定了已验证邮箱且启用过课表的账号；仅站长模式下只能发到站长邮箱。</p>
    </div>
  </div>

  <div id="mePanel" hidden>
    <div class="page-head"><div><h2>我的</h2><p class="ph-desc">管理员资料、头像与账号安全。</p></div></div>
    <div class="card me-card">
      <div class="me-left">
        <div class="me-avatar" id="meAvatar"><span id="meAvatarMono">YH</span><img id="meAvatarImg" hidden alt="管理员头像"></div>
        <div class="me-avatar-btns">
          <button id="meAvatarUploadBtn" class="ghost">更换头像</button>
          <button id="meAvatarRemoveBtn" class="danger" hidden>移除头像</button>
        </div>
      </div>
      <div class="me-info">
        <p class="me-name" id="meName">—</p>
        <p class="meta2" id="meMeta"></p>
        <p class="meta2">头像显示在侧边栏左上角；JPG/PNG/GIF/WebP，≤2MB，保存在站点 KV。</p>
      </div>
      <input type="file" id="meAvatarInput" accept=".jpg,.jpeg,.png,.gif,.webp" hidden>
    </div>
    <div class="card" id="meEmailCard" style="margin-top:16px" hidden>
      <p class="appear-label2" style="margin-top:0">管理员邮箱</p>
      <p class="meta2" style="margin-bottom:12px">绑定后可用邮箱验证码重置后台密码。</p>
      <div class="bgset-row" id="meEmailBoundRow" hidden>
        <span class="meta2" id="meEmailText"></span>
        <button id="meEmailRemoveBtn" class="danger" type="button">解绑</button>
      </div>
      <div id="meEmailFormRow">
        <div class="form-grid" style="max-width:660px">
          <div class="field"><label for="meEmailInput">管理员邮箱</label>
            <div class="bgset-row" style="flex-wrap:nowrap">
              <input type="text" id="meEmailInput" placeholder="you@example.com" style="flex:1;min-width:160px">
              <button id="meEmailSendBtn" class="ghost" type="button" style="flex:none">发送验证码</button>
            </div>
          </div>
          <div class="field"><label for="meEmailCode">邮箱验证码</label>
            <div class="bgset-row" style="flex-wrap:nowrap">
              <input type="text" id="meEmailCode" inputmode="numeric" maxlength="6" placeholder="6 位验证码" style="flex:1;min-width:130px">
              <button id="meEmailVerifyBtn" type="button" style="flex:none">验证并绑定</button>
            </div>
          </div>
        </div>
        <p class="meta2" id="meEmailMsg" style="margin:10px 0 0"></p>
      </div>
    </div>
    <div class="card" id="meSecCard" style="margin-top:16px">
      <p class="appear-label2" style="margin-top:0">安全 · SECURITY</p>

      <p class="appear-label2">修改密码</p>
      <div class="form-grid" style="max-width:640px">
        <div class="field"><label for="mePwdOld">当前密码</label><input type="password" id="mePwdOld" autocomplete="current-password"></div>
        <div class="field"><label for="mePwdNew">新密码</label><input type="password" id="mePwdNew" placeholder="6-100 位" autocomplete="new-password"></div>
      </div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="mePwdBtn" type="button">修改密码</button>
      </div>
      <p class="meta2" id="mePwdMsg" style="margin:8px 0 0">改密后其他设备会被退出登录，当前设备保持不变。</p>

      <p class="appear-label2">登录二次验证（邮箱验证码）</p>
      <div class="switch-row">
        <span class="switch"><input type="checkbox" id="me2faOn"><span class="sw-track"></span><span class="sw-thumb"></span></span>
        <span class="meta2">登录时向绑定的管理员邮箱发送验证码</span>
      </div>
      <p class="meta2" id="me2faMsg" style="margin:8px 0 0"></p>

      <p class="appear-label2">登录设备</p>
      <div id="meSessions"></div>
      <div class="bgset-row" style="margin-top:8px">
        <button id="meRevokeBtn" class="danger" type="button">退出其他设备</button>
      </div>

      <p class="appear-label2">最近登录（成功与失败，最多 10 条）</p>
      <div id="meLogins"></div>
    </div>
  </div>
  <div id="statusPanel" hidden>
    <div class="page-head"><div><h2>状态</h2><p class="ph-desc">存储空间、邮件额度、数据备份与前端错误监控。</p></div></div>
    <div class="card" id="stStorageCard">
      <div class="visit-head"><strong>存储空间</strong><span class="meta2" id="stStorageSumm"></span></div>
      <div id="stStorageBody"><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div></div>
    </div>
    <div class="card" id="stMailCard">
      <div class="visit-head"><strong>邮件发送额度</strong><span class="meta2" id="stMailSumm"></span></div>
      <div id="stMailBody"><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div></div>
    </div>
    <div class="card" id="stBackupCard">
      <div class="visit-head"><strong>数据备份</strong><span class="meta2" id="stBackupSumm"></span></div>
      <div id="stBackupBody"><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div></div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="stBackupNowBtn" class="ghost" type="button">立即备份</button>
        <span class="meta2" id="stBackupTip"></span>
      </div>
      <p class="meta2" style="margin:8px 0 0">每日自动备份到 KV，保留最近 7 份（随课表提醒的定时任务每天顺带执行）。</p>
    </div>
    <div class="card" id="stRumCard">
      <div class="visit-head"><strong>前端错误</strong><span class="meta2" id="stRumSumm"></span></div>
      <div id="stRumBody"><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div></div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="stRumClearBtn" class="ghost" type="button">清空</button>
        <span class="meta2" id="stRumTip"></span>
      </div>
      <p class="meta2" style="margin:8px 0 0">前台脚本报错自动上报（JS 异常 / 未处理的 Promise 拒绝 / 资源加载失败），保留最近 200 条，悬停错误行可看完整调用栈。</p>
    </div>
  </div>
    </main>
  </div>
</div>

<footer>文件存放在 Cloudflare KV（单文件上限 24MB）；删除与禁用操作即时生效，请谨慎确认。</footer>

<div class="toast" id="toast"></div>

<div class="modal" id="askModal" hidden>
  <div class="modal-backdrop" id="askBackdrop"></div>
  <div class="modal-body ask-modal-body">
    <div class="modal-head"><strong id="askTitle"></strong></div>
    <p class="ask-msg" id="askMsg"></p>
    <input type="text" id="askInput" hidden>
    <div class="ask-btns">
      <button id="askCancel" class="ghost">取消</button>
      <button id="askOk">确定</button>
    </div>
  </div>
</div>

<div class="modal" id="previewModal" hidden>
  <div class="modal-backdrop" id="previewBackdrop"></div>
  <div class="modal-body">
    <div class="modal-head">
      <strong id="previewTitle"></strong>
      <button id="previewClose" class="ghost">关闭</button>
    </div>
    <div id="previewContent"></div>
  </div>
</div>

<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var TYPE_NAMES = { music: '音乐', video: '视频', image: '图片' };
  var TYPE_EXT = {
    music: '.mp3,.wav,.m4a,.flac,.ogg,.aac,.opus,.lrc', // .lrc 在上传队列里与同名歌曲配对成歌词附件，不单独入库
    video: '.mp4,.webm,.mov,.m4v,.ogv',
    image: '.jpg,.jpeg,.png,.gif,.webp,.svg,.avif,.bmp'
  };
  var currentType = 'music';
  var lastEnterPanel = null; // 切换动效：上一个播放过进入动画的面板（避免媒体页内部来回切重复闪烁）
  var items = { music: [], video: [], image: [] };
  var users = [];

  // ---------- 统一线性图标（16px 渲染、stroke 2、currentColor，深浅主题通用） ----------
  function ico(paths, filled) {
    return '<svg width="16" height="16" viewBox="0 0 24 24"' + (filled
      ? ' fill="currentColor" stroke="none"'
      : ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') + ' aria-hidden="true">' + paths + '</svg>';
  }
  var ICO = {
    plus: ico('<path d="M12 5v14M5 12h14"/>'),
    pencil: ico('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    trash: ico('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/>'),
    eye: ico('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff: ico('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="m2 2 20 20"/>'),
    starOn: ico('<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>', true),
    starOff: ico('<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>'),
    play: ico('<path d="M6 4l14 8-14 8z"/>', true),
    view: ico('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
    refresh: ico('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
    dots: ico('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>', true),
    grip: ico('<circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/>', true),
    up: ico('<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>'),
    down: ico('<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>'),
    box: ico('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'),
    lrc: ico('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/>'),
    disc: ico('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2.5"/>'),
    x: ico('<path d="M18 6 6 18M6 6l12 12"/>'),
    chat: ico('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
    shield: ico('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
    clock: ico('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  };

  // ---------- 骨架屏 / 空状态（列表类加载与空数据的统一形态；纯字符串拼接，禁模板字面量） ----------
  function skListHtml(n) {
    var out = '';
    for (var i = 0; i < (n || 4); i++) {
      out += '<div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div>';
    }
    return out;
  }
  function emptyStateHtml(icon, title, hint) {
    return '<div class="empty-state"><span class="es-ico">' + icon + '</span>' +
      '<span class="es-title">' + escapeHtml(title) + '</span>' +
      (hint ? '<span class="es-hint">' + escapeHtml(hint) + '</span>' : '') + '</div>';
  }
  // 字数计数器：输入框下方 n/上限 小字，超 90% 转警示色；重复调用安全（已挂则复用）
  function attachCounter(el, max) {
    if (!el) return;
    var tip = el.nextElementSibling;
    if (!tip || tip.className.indexOf('char-count') === -1) {
      tip = document.createElement('div');
      tip.className = 'char-count';
      if (el.nextSibling) el.parentNode.insertBefore(tip, el.nextSibling);
      else el.parentNode.appendChild(tip);
    }
    function sync() {
      var n = (el.value || '').length;
      tip.textContent = n + ' / ' + max;
      tip.className = 'char-count' + (n > max * 0.9 ? ' warn' : '');
    }
    el.addEventListener('input', sync);
    sync();
  }
  // 单行输入按 Enter 直接触发对应按钮（登录/初始化/短链创建；不改任何提交逻辑，只是少点一次）
  function enterToClick(inputIds, btnId) {
    inputIds.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); $(btnId).click(); }
      });
    });
  }
  // 输入细节初始化（脚本在 body 末尾，DOM 均已就绪；隐藏面板里的静态控件同样可挂）
  attachCounter($('noteText'), 2000);
  attachCounter($('emailCustomText'), 5000);
  attachCounter($('aiPrompt'), 2000);
  enterToClick(['loginUser', 'loginPass', 'loginCode'], 'loginBtn');
  enterToClick(['setupUser', 'setupPass', 'setupPass2'], 'setupBtn');
  enterToClick(['linkCode', 'linkUrl'], 'linkCreateBtn');
  // 搜索框：has-value 态切换清空钮显隐；清空后派发 input 事件复用各页既有过滤逻辑
  document.querySelectorAll('.search-box').forEach(function (box) {
    var input = box.querySelector('input');
    if (!input) return;
    var sync = function () { box.classList.toggle('has-value', !!(input.value || '').length); };
    input.addEventListener('input', sync);
    sync();
  });
  document.querySelectorAll('.sb-clear').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = $(btn.getAttribute('data-for'));
      if (!input) return;
      input.value = '';
      input.dispatchEvent(new Event('input'));
      input.focus();
    });
  });

  // ---------- 黑白主题切换（浅色 / 深色，本地记住） ----------
  var SUN_SVG = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  var MOON_SVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var icon = $('themeIcon');
    if (icon) icon.innerHTML = t === 'dark' ? SUN_SVG : MOON_SVG;
  }
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  // 主题切换：支持 View Transitions 的浏览器播放「从按钮位置圆形揭示」动效（参考站同款）；
  // 半径按归一化对角线换算成百分比（px 裁剪坐标在 2x 屏只画一半），Firefox/减弱动态回退即时切换
  var themeVTBusy = false;
  $('themeBtn').addEventListener('click', function (e) {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) {}
    if (themeVTBusy || reduce || !document.startViewTransition) {
      applyTheme(next);
    } else {
      themeVTBusy = true;
      try {
        var r = e.currentTarget.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var px = (cx / window.innerWidth * 100).toFixed(2);
        var py = (cy / window.innerHeight * 100).toFixed(2);
        var maxR = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
        var rr = (maxR * 100 / (Math.hypot(window.innerWidth, window.innerHeight) / Math.SQRT2)).toFixed(2);
        var vt = document.startViewTransition(function () { applyTheme(next); });
        vt.ready.then(function () {
          document.documentElement.animate(
            { clipPath: ['circle(0% at ' + px + '% ' + py + '%)', 'circle(' + rr + '% at ' + px + '% ' + py + '%)'] },
            { duration: 480, easing: 'linear', pseudoElement: '::view-transition-new(root)' }
          );
        }).catch(function () {});
        vt.finished.finally(function () { themeVTBusy = false; });
      } catch (err2) {
        themeVTBusy = false;
        applyTheme(next);
      }
    }
    try { localStorage.setItem('adminTheme', next); } catch (e) {}
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtSize(n) {
    if (!n && n !== 0) return '';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }
  function fmtDate(s) {
    return s ? String(s).replace('T', ' ').slice(0, 16) : '';
  }
  function showMsg(el, text, cls) {
    el.textContent = text || '';
    el.className = 'msg' + (cls ? ' ' + cls : '');
  }

  // ---------- toast 轻提示（底部浮现，自动消失；sticky=true 时常驻直到下一条） ----------
  var toastTimer = null;
  function toast(text, cls, sticky) {
    var t = $('toast');
    t.textContent = text || '';
    t.className = 'toast show' + (cls ? ' ' + cls : '');
    clearTimeout(toastTimer);
    if (!sticky) toastTimer = setTimeout(function () { t.className = 'toast' + (cls ? ' ' + cls : ''); }, 2600);
  }

  // ---------- 询问弹窗（替代原生 prompt / confirm） ----------
  var askCb = null;
  function ask(opts) {
    $('askTitle').textContent = opts.title || '请确认';
    var msg = $('askMsg');
    msg.textContent = opts.msg || '';
    msg.hidden = !opts.msg;
    var input = $('askInput');
    if (opts.input) {
      input.hidden = false;
      input.value = opts.value || '';
      input.maxLength = opts.max || 200;
      input.placeholder = opts.placeholder || '';
    } else {
      input.hidden = true;
    }
    var ok = $('askOk');
    ok.textContent = opts.okText || '确定';
    ok.className = opts.danger ? 'danger-ok' : '';
    $('askModal').hidden = false;
    askCb = opts.cb || null;
    if (opts.input) { input.focus(); input.select(); }
    else ok.focus();
  }
  function askClose(okVal) {
    if ($('askModal').hidden) return;
    $('askModal').hidden = true;
    var cb = askCb, val = $('askInput').value;
    askCb = null;
    if (cb) cb(okVal, val);
  }
  $('askOk').addEventListener('click', function () { askClose(true); });
  $('askCancel').addEventListener('click', function () { askClose(false); });
  $('askBackdrop').addEventListener('click', function () { askClose(false); });
  $('askInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); askClose(true); }
  });

  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    if (typeof AbortController === 'function') {
      var ctl = new AbortController();
      opts.signal = ctl.signal;
      setTimeout(function () { ctl.abort(); }, 20000);
    }
    return fetch(path, opts).then(function (res) {
      return res.json().catch(function () { return { ok: false, error: '响应异常' }; })
        .then(function (data) { data._status = res.status; return data; });
    });
  }

  // ---------- 状态切换 ----------
  function show(name) {
    $('gateWrap').hidden = name === 'main';
    $('appShell').hidden = name !== 'main';
    $('setupCard').hidden = name !== 'setup';
    $('loginCard').hidden = name !== 'login';
    $('adminResetCard').hidden = name !== 'reset';
    $('neterrCard').hidden = name !== 'neterr';
    // 登录页显示时顺带查邮件服务开关（决定"忘记密码"入口显隐）
    if (name === 'login') refreshAdminForgot();
  }

  // 管理员"忘记密码"入口：邮件服务启用才显示
  var adminForgotChecked = false;
  function refreshAdminForgot() {
    fetch('/api/settings').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      adminForgotChecked = true;
      var on = !!(d && d.ok && d.emailEnabled);
      $('adminForgotBtn').style.display = on ? '' : 'none';
    }).catch(function () {});
  }

  // ---------- 管理员邮箱重置密码 ----------
  function arMsg(text, err) { showMsg($('arMsg'), text || '', err ? 'err' : ''); }
  $('adminForgotBtn').addEventListener('click', function () { show('reset'); });
  $('arBackBtn').addEventListener('click', function () { show('login'); });
  var arCountdown = null;
  $('arSendBtn').addEventListener('click', function () {
    var email = $('arEmail').value.trim();
    if (!email) { arMsg('请先填写管理员邮箱', true); return; }
    var btn = this; btn.disabled = true;
    api('/api/email/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, purpose: 'admin-reset' })
    }).then(function (d) {
      btn.disabled = false;
      if (d.ok) {
        arMsg('验证码已发送，注意查收（含垃圾箱）');
        var left = 60;
        btn.disabled = true;
        btn.textContent = left + 's';
        clearInterval(arCountdown);
        arCountdown = setInterval(function () {
          left--;
          if (left <= 0) { clearInterval(arCountdown); btn.disabled = false; btn.textContent = '发送验证码'; }
          else btn.textContent = left + 's';
        }, 1000);
      } else arMsg(d.error || '发送失败', true);
    }).catch(function () { btn.disabled = false; arMsg('网络错误', true); });
  });
  $('arSubmitBtn').addEventListener('click', function () {
    var email = $('arEmail').value.trim();
    var code = $('arCode').value.trim();
    var np = $('arNewPass').value;
    if (!email || !/^\\d{6}$/.test(code)) { arMsg('请填写邮箱和 6 位验证码', true); return; }
    if (np.length < 6) { arMsg('新密码至少 6 位', true); return; }
    var btn = this; btn.disabled = true;
    api('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, code: code, newPassword: np })
    }).then(function (d) {
      btn.disabled = false;
      if (d.ok) {
        show('login');
        showMsg($('loginMsg'), '密码已重置，请用新密码登录', '');
      } else arMsg(d.error || '重置失败', true);
    }).catch(function () { btn.disabled = false; arMsg('网络错误', true); });
  });

  // 自动重试 3 次：网络抖动时误显示登录表单会让人误以为账号丢了
  function loadStatus(tries) {
    tries = tries || 0;
    api('/api/auth/status').then(function (data) {
      if (!data || !data.ok) { show('neterr'); return; }
      if (!data.initialized) show('setup');
      else if (data.adminSession) enterMain(); // 明确用管理员会话字段（旧字段 authenticated 仍兼容）
      else show('login');
    }).catch(function () {
      if (tries < 2) setTimeout(function () { loadStatus(tries + 1); }, 1200);
      else show('neterr');
    });
  }
  $('retryBtn').addEventListener('click', function () {
    showMsg($('netMsg'), '正在重试…');
    loadStatus(0);
  });

  // ---------- 初始化 / 登录 / 退出 ----------
  $('setupBtn').addEventListener('click', function () {
    var btn = this; btn.disabled = true;
    if ($('setupPass').value !== $('setupPass2').value) {
      showMsg($('setupMsg'), '两次输入的密码不一致', 'err'); btn.disabled = false; return;
    }
    api('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $('setupUser').value, password: $('setupPass').value })
    }).then(function (data) {
      btn.disabled = false;
      if (data.ok) enterMain();
      else showMsg($('setupMsg'), data.error || '创建失败', 'err');
    }).catch(function () { btn.disabled = false; showMsg($('setupMsg'), '网络错误', 'err'); });
  });

  var loginTicket = ''; // 管理员 2FA 中间票据（needCode 时服务端下发，验码时带回）
  $('loginBtn').addEventListener('click', function () {
    var btn = this; btn.disabled = true;
    var body = { username: $('loginUser').value, password: $('loginPass').value };
    if (loginTicket) { body.ticket = loginTicket; body.code = $('loginCode').value.trim(); }
    api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (data) {
      btn.disabled = false;
      if (data.ok) { loginTicket = ''; $('loginCode').style.display = 'none'; $('loginBtn').textContent = '登录'; enterMain(); return; }
      if (data.needCode && data.ticket) {
        loginTicket = data.ticket;
        $('loginCode').style.display = '';
        $('loginCode').value = '';
        $('loginBtn').textContent = '验证并登录';
        showMsg($('loginMsg'), data.error || '验证码已发送', 'ok');
        $('loginCode').focus();
        return;
      }
      showMsg($('loginMsg'), data.error || '登录失败', 'err');
    }).catch(function () { btn.disabled = false; showMsg($('loginMsg'), '网络错误', 'err'); });
  });

  $('loginCode').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('loginBtn').click(); });

  $('loginPass').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('loginBtn').click(); });
  $('setupPass2').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('setupBtn').click(); });

  $('logoutBtn').addEventListener('click', function () {
    api('/api/auth/logout', { method: 'POST' }).then(function () { show('login'); });
  });

  // ---------- 主界面 ----------
  // 统计数字滚动（概览六卡）：仅首次从 0 填充时播放（后续刷新直接落值，不反复播）；减弱动态时跳过
  function countUp(el, to) {
    if (!el) return;
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var from = parseInt(el.textContent, 10) || 0;
    if (reduce || from !== 0 || !(to > 0)) { el.textContent = to; return; }
    var t0 = null, dur = 700;
    var step = function (ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = to;
    };
    requestAnimationFrame(step);
  }

  function enterMain() {
    show('main');
    switchPage('overview'); // 默认落在概览页
    loadList().then(function () { syncStaticMedia(); });
    loadUsers();
    loadVisits();
    loadAiUsage();
    loadMailUsage();
    loadMe(); // 顶栏胶囊左上角头像
    // 顶栏悬停预览卡的 iframe 在启动期（登录门/加载态）发来的切面板请求在这里补应用
    if (previewPendingPanel && previewPendingPanel !== currentType) {
      var pp = previewPendingPanel;
      previewPendingPanel = null;
      switchPage(pp);
    }
    // 自己作为预览 iframe 被嵌在顶栏悬停卡里时，向父页报就绪（父页据此补发切面板消息）
    try { if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'adminPreviewReady' }, location.origin); } catch (e) {}
  }

    // 预览 iframe 同步切面板：顶栏悬停预览卡里嵌的 /admin iframe 收到悬停事件后 postMessage 过来切栏目。
    // iframe 启动早期主界面还没显示（登录门/加载态）时先存 pending，enterMain 末尾应用（防消息丢失）
    var previewPendingPanel = null;
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin) return;
      var d = e.data || {};
      if (d.type !== 'adminPreviewPanel') return;
      var type = String(d.panel || '');
      var known = false;
      navBtns.forEach(function (b) { if (b.getAttribute('data-type') === type) known = true; });
      if (!known) return;
      if (document.getElementById('appShell').hidden) { previewPendingPanel = type; return; }
      if (type !== currentType) switchPage(type);
    });

  function refreshStats() {
    countUp($('statMusic'), items.music.length);
    countUp($('statVideo'), items.video.length);
    countUp($('statImage'), items.image.length);
    countUp($('statUsers'), users.length);
  }

  function loadList() {
    return api('/api/admin/media').then(function (data) {
      if (data.ok) {
        items = data.items;
        serverAlbums = data.albums || [];
        listSwap(); // 整表刷新（含相册重命名/解散/批量移入）时列表淡入
        renderList();
        refreshStats();
      } else if (data._status === 401) {
        show('login');
      }
    }).catch(function () {});
  }

  // 列表切换淡入动效：整表刷新（相册重命名/解散/批量移入等）或切相册时重播一次
  function listSwap() {
    var box = $('list');
    if (!box) return;
    box.classList.remove('list-swap');
    void box.offsetWidth;
    box.classList.add('list-swap');
  }

  function loadUsers() {
    api('/api/admin/users').then(function (data) {
      if (data.ok) {
        users = data.users;
        renderUsers();
        refreshStats();
      }
    }).catch(function () {});
  }

  // ---------- 访问统计：今日卡 + 近 N 天柱状趋势图（纯 SVG，无依赖） ----------
  var visitData = { visits: 0, today: 0, yesterday: 0, daily: [] };
  var visitRange = 14;
  var visitView = 'bar'; // 访问趋势视图：bar 柱状 / donut 环形
  // 环形图标配多色调色板（柔和高辨识，明度适中，深浅主题均可读），按日期顺序循环取色
  var RING_COLORS = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#86bcb6'];

  // 网站运行时长：与前台 index.html 的 SITE_BIRTH 同源（改上线时间要两处同步）；概览统计卡 + 状态页共用
  var SITE_BIRTH = new Date('2026-08-29T12:42:07+08:00');
  function renderUptime() {
    var s = Math.max(0, Math.floor((Date.now() - SITE_BIRTH.getTime()) / 1000));
    var d = Math.floor(s / 86400);
    var h = Math.floor(s % 86400 / 3600);
    var m = Math.floor(s % 3600 / 60);
    var txt = d + ' 天 ' + h + ' 时 ' + m + ' 分 ' + (s % 60) + ' 秒';
    var el = $('statUptime');
    if (el) el.textContent = txt;
    var se = $('statusUptime');
    if (se) se.textContent = txt;
  }
  renderUptime();
  setInterval(renderUptime, 1000);

  // ---------- AI token 用量（概览卡片） ----------
  function loadAiUsage() {
    api('/api/admin/ai/usage').then(function (d) {
      if (!d.ok) return;
      var body = $('aiUsageBody');
      if (!d.total || !d.total.calls) {
        body.innerHTML = emptyStateHtml(ICO.chat, '还没有 AI 对话数据', '去前台聊几句，这里就会按模型汇总用量。');
        $('aiUsageSumm').textContent = '';
        return;
      }
      function fmt(r) {
        var t = (r.prompt || 0) + (r.completion || 0);
        return t.toLocaleString() + ' tokens / ' + r.calls + ' 次';
      }
      $('aiUsageSumm').textContent = '今日 ' + fmt(d.today) + ' · 近 14 天 ' + fmt(d.d14) + ' · 近 30 天 ' + fmt(d.d30);
      var html = '<table class="data-table"><thead><tr>' +
        '<th>模型</th>' +
        '<th class="num">调用</th>' +
        '<th class="num">输入 tokens</th>' +
        '<th class="num">输出 tokens</th></tr></thead><tbody>';
      d.byModel.forEach(function (m) {
        html += '<tr>' +
          '<td class="ellip">' + escapeHtml(m.provider + ' / ' + m.model) + '</td>' +
          '<td class="num">' + m.calls + '</td>' +
          '<td class="num">' + Number(m.prompt).toLocaleString() + '</td>' +
          '<td class="num">' + Number(m.completion).toLocaleString() + '</td></tr>';
      });
      html += '</tbody></table>';
      body.innerHTML = html;
    }).catch(function () {});
  }

  // ---------- 邮件发送统计（概览卡片：汇总 + 近 14 天趋势 + 发送明细列表） ----------
  var MAIL_KIND_NAMES = {
    'code': '验证码',
    'test': '测试邮件',
    'custom': '自定义邮件',
    'sched-daily': '课表每日早报',
    'sched-class': '课表课前提醒',
    'sched-test': '课表提醒测试',
  };
  function escAttr(s) { return escapeHtml(String(s == null ? '' : s)).replace(/"/g, '&quot;'); }
  function maskEmail(e) {
    if (!e) return '';
    var at = e.indexOf('@');
    if (at <= 1) return e.slice(0, 10);
    return e.slice(0, 2) + '***' + e.slice(at);
  }
  function renderMailTrend(trend) {
    var el = $('mailTrend');
    if (!el || !trend || !trend.length) return;
    var W = 460, H = 70, padB = 14, padT = 6;
    var max = 1;
    trend.forEach(function (t) { if (t.count > max) max = t.count; });
    var bw = (W - 10) / trend.length;
    var parts = [];
    trend.forEach(function (t, i) {
      var h = Math.max(t.count > 0 ? 2 : 0, Math.round(t.count / max * (H - padB - padT)));
      var x = 5 + i * bw + bw * 0.2;
      var y = H - padB - h;
      parts.push('<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + (bw * 0.6).toFixed(1) +
        '" height="' + h + '" rx="1.5" class="mt-bar"><title>' + t.day + '：' + t.count + ' 封</title></rect>');
    });
    parts.push('<text x="5" y="' + (H - 3) + '" class="mt-t">' + escapeHtml(trend[0].day) + '</text>');
    parts.push('<text x="' + (W - 5) + '" y="' + (H - 3) + '" class="mt-t" text-anchor="end">' + escapeHtml(trend[trend.length - 1].day) + '</text>');
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '">' + parts.join('') + '</svg>';
  }
  var mailLogKind = '';
  function bindLogChips() {
    document.querySelectorAll('#mailLogBox .el-chip').forEach(function (c) {
      c.onclick = function () {
        mailLogKind = c.getAttribute('data-k');
        loadMailLogs();
      };
    });
  }
  function loadMailLogs() {
    api('/api/admin/email/logs?kind=' + encodeURIComponent(mailLogKind) + '&limit=20').then(function (d) {
      if (!d.ok) return;
      var kinds = [
        ['', '全部'], ['code', '验证码'], ['test', '测试'], ['custom', '自定义'],
        ['sched-daily', '早报'], ['sched-class', '课前提醒'], ['sched-test', '提醒测试'],
      ];
      var html = '<div class="el-filters">' + kinds.map(function (k) {
        return '<button type="button" class="el-chip' + (mailLogKind === k[0] ? ' active' : '') + '" data-k="' + k[0] + '">' + k[1] + '</button>';
      }).join('') + '</div>';
      var logs = d.logs || [];
      if (!logs.length) {
        html += emptyStateHtml(ICO.chat, '暂无发送记录', '发出第一封邮件后，最近 20 条明细会列在这里。');
      } else {
        html += logs.map(function (l) {
          var subj = l.kind === 'code' ? '验证码邮件' : (l.subject || '');
          return '<div class="el-row">' +
            '<span class="el-time">' + fmtLogTime(l.created_at) + '</span>' +
            '<span class="el-kind">' + (MAIL_KIND_NAMES[l.kind] || l.kind || '邮件') + '</span>' +
            '<span class="el-to">' + escapeHtml(maskEmail(l.to_email)) + '</span>' +
            '<span class="el-subj" title="' + escAttr(subj) + '">' + escapeHtml(subj) + '</span>' +
            '<span class="el-status ' + (l.ok ? 'ok' : 'bad') + '" title="' + (l.ok ? '发送成功' : escAttr(l.err || '发送失败')) + '">' + (l.ok ? '✓' : '✕') + '</span>' +
            '</div>';
        }).join('');
      }
      $('mailLogBox').innerHTML = html;
      bindLogChips();
    }).catch(function () {});
  }
  function loadMailUsage() {
    api('/api/admin/email/usage').then(function (d) {
      if (!d.ok) return;
      $('mailUsageSumm').textContent = '今日 ' + d.today + ' · 近 14 天 ' + d.d14 + ' · 近 30 天 ' + d.d30;
      var html = '';
      if (d.total) {
        html = '<table class="data-table"><thead><tr>' +
          '<th>用途</th>' +
          '<th class="num">累计发送</th></tr></thead><tbody>';
        (d.byKind || []).forEach(function (k) {
          html += '<tr>' +
            '<td>' + (MAIL_KIND_NAMES[k.kind] || k.kind || '—') + '</td>' +
            '<td class="num">' + k.count + '</td></tr>';
        });
        html += '</tbody></table>';
      } else {
        html = emptyStateHtml(ICO.chat, '还没有成功的发送记录', '发出第一封邮件后这里会有统计（失败记录见下方明细）。');
      }
      html += '<div class="mail-sec-title">近 14 天发送趋势</div><div id="mailTrend"></div>' +
        '<div class="mail-sec-title">发送明细（最近 20 条）</div><div id="mailLogBox">' + skListHtml(3) + '</div>';
      $('mailUsageBody').innerHTML = html;
      renderMailTrend(d.d14days || []);
      loadMailLogs();
    }).catch(function () {});
  }

  function loadVisits() {
    api('/api/admin/visits').then(function (d) {
      if (!d.ok) return;
      visitData = d;
      countUp($('statVisits'), d.visits);
      countUp($('statToday'), d.today);
      renderVisitChart();
    }).catch(function () {});
  }

  // 「最近访问」IP 明细卡与归属地查询已整体移除（2026-09-06）：/api/visit 不再记录 IP/UA，
  // /api/admin/visit-logs 与 /api/admin/geoip 接口一并下线；fmtLogTime 保留（邮件发送明细在用）
  function fmtLogTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    function p(x) { return x < 10 ? '0' + x : x; }
    return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function renderVisitChart() {
    var n = visitRange;
    var byDay = {};
    (visitData.daily || []).forEach(function (r) { byDay[r.day] = r.count; });

    // 近 n 天序列（北京时间，与后端口径一致），没有数据的天补 0
    var days = [];
    for (var i = n - 1; i >= 0; i--) {
      var s = new Date(Date.now() + 8 * 3600e3 - i * 86400e3).toISOString().slice(0, 10);
      days.push({ day: s, count: byDay[s] || 0 });
    }
    var totalInRange = days.reduce(function (a, d) { return a + d.count; }, 0);
    var activeDays = days.filter(function (d) { return d.count > 0; }).length;
    $('visitSumm').textContent = '历史累计 ' + visitData.visits + ' 次 · 今日 ' + visitData.today + ' · 昨日 ' + visitData.yesterday +
      ' · 近 ' + n + ' 天共 ' + totalInRange + ' 次' +
      (activeDays ? '，日均 ' + Math.round(totalInRange / n * 10) / 10 + ' 次' : '');
    $('visitHint').hidden = activeDays > 0;

    var W = 700, H = 170;
    var parts = [];
    if (visitView === 'donut') {
      // 环形图：有访问的天各一段，按日期顺时针从 12 点排（细缝分隔、纯色无灰底；零流量天不画段，占比按有访问的天计）。
      // 活动日 ≤8 个全画；更多时只画占比 Top 7、其余合并成灰色「其他」段——10 色循环取色段一多颜色就复用失指，
      // 封顶后颜色恒唯一。今天的段默认径向外移 5px 作锚点（.donut-today）。
      // 注意 --dx/--dy 等变量必须带 px：translate() 收到无单位数字整条 transform 会失效
      var cx = 200, cy = 84, Rout = 62, Rin = 48;
      var TOP_N = 7;
      var today = days[days.length - 1].day;
      var maxC = 1;
      days.forEach(function (d) { if (d.count > maxC) maxC = d.count; });
      var act = days.filter(function (d) { return d.count > 0; });
      var segsData = act, restDays = null;
      if (act.length > TOP_N + 1) { // 只在聚掉的 >1 天时才聚合，避免出现「其他 1 天」
        var topSet = act.slice().sort(function (a, b) { return b.count - a.count; }).slice(0, TOP_N);
        restDays = act.filter(function (d) { return topSet.indexOf(d) < 0; });
        segsData = act.filter(function (d) { return topSet.indexOf(d) >= 0; });
        segsData.push({ other: true, count: restDays.reduce(function (s, d) { return s + d.count; }, 0) });
      }
      function pt(r, deg) {
        var rad = (deg - 90) * Math.PI / 180;
        return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
      }
      function segD(a, b) {
        var p1 = pt(Rout, a), p2 = pt(Rout, b), p3 = pt(Rin, b), p4 = pt(Rin, a);
        var lg = (b - a) > 180 ? 1 : 0;
        return 'M' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) +
          'A' + Rout + ' ' + Rout + ' 0 ' + lg + ' 1 ' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2) +
          'L' + p3[0].toFixed(2) + ' ' + p3[1].toFixed(2) +
          'A' + Rin + ' ' + Rin + ' 0 ' + lg + ' 0 ' + p4[0].toFixed(2) + ' ' + p4[1].toFixed(2) + 'Z';
      }
      var acc = 0, idx = 0;
      var legendHtml = '<div class="visit-legend">';
      segsData.forEach(function (d) {
        var frac = d.count / totalInRange;
        var span = frac * 360;
        var adj = Math.min(0.8, span / 4); // 段两端各缩一点，形成细缝分隔（露出卡片底色，无灰环）
        var a = acc * 360 + adj, b = (acc + frac) * 360 - adj;
        var midDeg = (a + b) / 2, rad = (midDeg - 90) * Math.PI / 180;
        var isToday = !d.other && d.day === today;
        var fill = d.other ? 'var(--chip)' : RING_COLORS[idx % RING_COLORS.length];
        var dx = Math.cos(rad) * 9, dy = Math.sin(rad) * 9;
        // 命中层(hit)与视觉层分离：弹出/缩放动的若是被悬停元素自己，贴内缘悬停时「弹出→鼠标悬空→回落→再弹出」会抖个不停；
        // hit 固定在静止几何上接管指针事件，视觉层 pointer-events:none 纯展示，随便弹也不会丢 hover
        parts.push('<path d="' + segD(a, b) + '" class="donut-hit" fill="transparent" data-i="' + idx +
          '" data-day="' + (d.other ? '其余 ' + restDays.length + ' 天' : d.day) +
          '" data-count="' + d.count + '" data-pct="' + (frac * 100).toFixed(1) +
          '" data-max="' + (!d.other && d.count === maxC ? '1' : '0') + '"' +
          (d.other ? ' data-other="1" data-list="' + restDays.map(function (r) { return r.day + ':' + r.count; }).join('|') + '"' : '') +
          '></path>' +
          '<path d="' + segD(a, b) + '" class="donut-seg' + (isToday ? ' donut-today' : '') +
          '" style="fill:' + fill + ';pointer-events:none;--dx:' + dx.toFixed(2) + 'px;--dy:' + dy.toFixed(2) + 'px' +
          (isToday ? ';--tx:' + (Math.cos(rad) * 5).toFixed(2) + 'px;--ty:' + (Math.sin(rad) * 5).toFixed(2) + 'px' : '') +
          '"></path>');
        // 大段（占比 ≥10%）在环外标注百分比
        if (frac >= 0.1) {
          parts.push('<text x="' + (cx + Math.cos(rad) * (Rout + 13)).toFixed(1) + '" y="' + (cy + Math.sin(rad) * (Rout + 13) + 3).toFixed(1) +
            '" class="dann" text-anchor="' + (Math.cos(rad) >= 0 ? 'start' : 'end') + '">' + Math.round(frac * 100) + '%</text>');
        }
        legendHtml += '<span class="vlg-item" data-i="' + idx + '"><i class="vlg-cc" style="background:' + fill + '"></i>' +
          (d.other ? '其他 ' + restDays.length + ' 天' : d.day.slice(5)) +
          (isToday ? ' <i class="vlg-today">今</i>' : '') +
          ' <b class="vlg-ct">' + d.count + '</b> 次 · ' + (frac * 100).toFixed(1) + '%</span>';
        acc += frac; idx++;
      });
      legendHtml += '</div>';
      // 中心：总量 + 日均
      parts.push('<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" class="dval" style="font-size:21px;font-weight:700">' + totalInRange + '</text>');
      parts.push('<text x="' + cx + '" y="' + (cy + 15) + '" text-anchor="middle" class="dkey" style="font-size:11px">日均 ' + Math.round(totalInRange / n * 10) / 10 + ' 次</text>');
      $('visitChart').classList.add('donut-mode');
      $('visitChart').innerHTML = '<svg viewBox="0 0 400 170" role="img" aria-label="近 ' + n + ' 天访问趋势（环形图）">' + parts.join('') + '</svg>' +
        '<div class="visit-tip"></div>' + legendHtml;
      return;
    }

    // 柱状图
    $('visitChart').classList.remove('donut-mode');
    var padL = 34, padB = 22, padT = 14, padR = 10;
    var max = 1;
    days.forEach(function (d) { if (d.count > max) max = d.count; });
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var bw = innerW / n;
    parts.push('<line x1="' + padL + '" y1="' + padT + '" x2="' + (W - padR) + '" y2="' + padT + '" class="gl"/>');
    parts.push('<line x1="' + padL + '" y1="' + (H - padB) + '" x2="' + (W - padR) + '" y2="' + (H - padB) + '" class="gl"/>');
    parts.push('<text x="' + (padL - 6) + '" y="' + (padT + 4) + '" class="gt" text-anchor="end">' + max + '</text>');
    parts.push('<text x="' + (padL - 6) + '" y="' + (H - padB + 4) + '" class="gt" text-anchor="end">0</text>');
    var labelEvery = Math.max(1, Math.ceil(n / 6));
    days.forEach(function (d, i) {
      var h = Math.max(d.count > 0 ? 2 : 0, Math.round(d.count / max * innerH));
      var x = padL + i * bw + bw * 0.15;
      var y = H - padB - h;
      var pct = totalInRange ? (d.count / totalInRange * 100).toFixed(1) : '0';
      parts.push('<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + (bw * 0.7).toFixed(1) +
        '" height="' + h + '" rx="2" class="bar-hit" data-i="' + i + '" data-day="' + d.day + '" data-count="' + d.count +
        '" data-pct="' + pct + '" data-max="' + (d.count === max ? '1' : '0') + '"></rect>' +
        '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + (bw * 0.7).toFixed(1) +
        '" height="' + h + '" rx="2" class="bar" data-i="' + i + '" style="--dx:0;--dy:-4px;pointer-events:none"></rect>');
      if (i % labelEvery === 0 || i === n - 1) {
        parts.push('<text x="' + (padL + i * bw + bw / 2).toFixed(1) + '" y="' + (H - 6) +
          '" class="gt" text-anchor="middle">' + d.day.slice(5) + '</text>');
      }
    });
    $('visitChart').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="近 ' + n + ' 天访问趋势">' + parts.join('') + '</svg>' +
      '<div class="visit-tip"></div>';
  }

  // ---------- 批量选择 / 搜索 ----------
  var selected = {}; // id → true，切标签页时清空

  // ---------- 相册管理（仅图片类型） ----------
  var albumFilter = ''; // '' 全部图片，'__none__' 未分组，其他 = 相册名
  var serverAlbums = []; // albums 表里的相册名单（GET /api/admin/media 随清单返回，空相册也持久保存）
  function albumNames() {
    var set = [];
    (items.image || []).forEach(function (it) {
      var a = (it.album || '').trim();
      if (a && set.indexOf(a) === -1) set.push(a);
    });
    serverAlbums.forEach(function (a) {
      if (set.indexOf(a) === -1) set.push(a);
    });
    return set;
  }

  // 批量把图片移入某相册（target：'__none__'=未分组，其他值=相册名）
  function moveImagesToAlbum(ids, target) {
    if (!ids || !ids.length) return;
    var left = ids.length;
    var byId = {};
    (items.image || []).forEach(function (it) { byId[it.id] = it; });
    ids.forEach(function (id) {
      api('/api/admin/media/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album: target === '__none__' ? '' : target })
      }).then(function (d) {
        if (d.ok && byId[id]) byId[id].album = target === '__none__' ? '' : target;
        if (--left === 0) {
          // 移完清空勾选：不然接着点别的相册会一直弹移入所选确认
          ids.forEach(function (id) { delete selected[id]; });
          loadList();
          toast('已把 ' + ids.length + ' 张图片移入「' + (target === '__none__' ? '未分组' : target) + '」', 'ok');
        }
      }).catch(function () {
        if (--left === 0) { loadList(); toast('部分移动失败，请重试', 'err'); }
      });
    });
  }

  // 相册 ⋯ 菜单（重命名 / 解散）
  function closeAlbumMenu() {
    var m = document.getElementById('albumMenuPop');
    if (m) m.remove();
  }
  function openAlbumMenu(anchor, name) {
    closeAlbumMenu();
    var menu = document.createElement('div');
    menu.className = 'album-menu';
    menu.id = 'albumMenuPop';
    var rn = document.createElement('button');
    rn.type = 'button';
    rn.textContent = '重命名';
    rn.addEventListener('click', function () {
      closeAlbumMenu();
      ask({
        title: '重命名相册',
        msg: '把相册「' + name + '」重命名为：',
        input: true, value: name, max: 50,
        okText: '重命名',
        cb: function (ok, val) {
          var to = (val || '').trim().slice(0, 50);
          if (!ok || !to || to === name) return;
          api('/api/admin/albums', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'rename', from: name, to: to })
          }).then(function (d) {
            if (d.ok) {
              if (albumFilter === name) albumFilter = to;
              loadList();
              toast('已重命名为「' + to + '」', 'ok');
            } else toast(d.error || '操作失败', 'err');
          });
        }
      });
    });
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'danger';
    del.textContent = '解散相册（不删图）';
    del.addEventListener('click', function () {
      closeAlbumMenu();
      ask({
        title: '解散相册',
        msg: '解散相册「' + name + '」？里面的图片会回到"未分组"，文件本体不受影响。',
        okText: '解散相册', danger: true,
        cb: function (ok) {
          if (!ok) return;
          api('/api/admin/albums', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', name: name })
          }).then(function (d) {
            if (d.ok) {
              if (albumFilter === name) albumFilter = '';
              loadList();
              toast('相册已解散，图片回到未分组', 'ok');
            } else toast(d.error || '操作失败', 'err');
          });
        }
      });
    });
    menu.appendChild(rn);
    menu.appendChild(del);
    document.body.appendChild(menu);
    var r = anchor.getBoundingClientRect();
    var left = Math.min(r.left, window.innerWidth - menu.offsetWidth - 8);
    menu.style.left = Math.max(8, left) + 'px';
    menu.style.top = (r.bottom + 6) + 'px';
    setTimeout(function () {
      document.addEventListener('click', function onDoc(e) {
        if (!menu.contains(e.target)) { closeAlbumMenu(); document.removeEventListener('click', onDoc); }
      });
    }, 0);
  }

  function clearAlbumDropHints() {
    document.querySelectorAll('.album-side-item.drop-hint').forEach(function (el) {
      el.classList.remove('drop-hint');
    });
  }

  var albumDragIds = null; // 正在拖拽归类的图片 id 列表

  function rebuildAlbumControls() {
    var names = albumNames();
    // 刚新建还没移入图片的相册也要留在列表里（serverAlbums 已在 albumNames 里合并）
    if (albumFilter && albumFilter !== '__none__' && names.indexOf(albumFilter) === -1) {
      names = [albumFilter].concat(names);
    }
    var imgs = items.image || [];
    var countOf = function (target) {
      var n = 0;
      imgs.forEach(function (it) {
        var a = (it.album || '').trim();
        if (target === '__none__' ? !a : a === target) n++;
      });
      return n;
    };
    var listEl = $('albumSideList');
    listEl.innerHTML = '';

    function makeItem(value, label, count, isAlbum) {
      var item = document.createElement('div');
      item.className = 'album-side-item' + (albumFilter === value ? ' active' : '');
      var nm = document.createElement('span');
      nm.className = 'as-name';
      nm.textContent = label;
      nm.title = label;
      var badge = document.createElement('span');
      badge.className = 'as-count';
      badge.textContent = String(count);
      item.appendChild(nm);
      item.appendChild(badge);

      if (isAlbum) {
        var more = document.createElement('button');
        more.type = 'button';
        more.className = 'as-more';
        more.innerHTML = ICO.dots;
        more.title = '相册操作';
        more.addEventListener('click', function (e) {
          e.stopPropagation();
          openAlbumMenu(more, value);
        });
        item.appendChild(more);
      }

      // 点击：有勾选时 = 把所选移入该相册（"全部图片"除外，仅导航）
      item.addEventListener('click', function () {
        var n = selectedCount();
        if (value !== '' && n > 0) {
          var ids = (items.image || []).filter(function (it) { return selected[it.id]; }).map(function (it) { return it.id; });
          ask({
            title: '移入相册',
            msg: '把所选 ' + ids.length + ' 张图片移入「' + (value === '__none__' ? '未分组' : value) + '」？',
            okText: '移入',
            cb: function (ok) {
              if (ok) moveImagesToAlbum(ids, value);
            }
          });
          return;
        }
        albumFilter = value;
        listSwap(); // 相册切换：列表淡入
        renderList();
      });

      // 拖放归类目标（"全部图片"不接收）
      if (value !== '') {
        item.addEventListener('dragover', function (e) {
          if (!albumDragIds) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          item.classList.add('drop-hint');
        });
        item.addEventListener('dragleave', function () { item.classList.remove('drop-hint'); });
        item.addEventListener('drop', function (e) {
          e.preventDefault();
          item.classList.remove('drop-hint');
          if (!albumDragIds) return;
          var ids = albumDragIds.slice();
          albumDragIds = null;
          moveImagesToAlbum(ids, value);
        });
      }

      listEl.appendChild(item);
    }

    makeItem('', '全部图片', imgs.length, false);
    makeItem('__none__', '未分组', countOf('__none__'), false);
    names.forEach(function (nm) { makeItem(nm, nm, countOf(nm), true); });

    // 上传提示：说明当前视图的自动归入规则
    var hint = $('uploadHint');
    if (hint) {
      var base = '支持一次选多个文件，也可以把文件或整个文件夹拖进来；与已有内容同名的自动跳过；单文件上限 24MB。';
      if (albumFilter && albumFilter !== '__none__') {
        hint.textContent = base + ' 当前在相册「' + albumFilter + '」视图，新上传将自动归入该相册。';
      } else if (albumFilter === '__none__') {
        hint.textContent = base + ' 当前在"未分组"视图，新上传不归入相册。';
      } else {
        hint.textContent = base;
      }
    }
  }

  function selectedCount() {
    var n = 0;
    (items[currentType] || []).forEach(function (it) { if (selected[it.id]) n++; });
    return n;
  }

  function updateBatchBtn() {
    var n = selectedCount();
    $('batchDelBtn').hidden = n === 0;
    $('batchDelBtn').textContent = '删除所选 (' + n + ')';
  }

  // ---------- 音乐歌词：补传/替换/移除（存 media.lrc 列，/api/playlist 随清单下发前台） ----------
  function uploadLrc(it) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.lrc';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      if (!/\\.lrc$/i.test(f.name)) { toast('请选择 .lrc 歌词文件', 'err'); return; }
      if (f.size > 200 * 1024) { toast('歌词文件超过 200KB', 'err'); return; }
      f.text().then(function (txt) {
        if (!txt.trim()) { toast('歌词文件是空的', 'err'); return; }
        api('/api/admin/media/' + it.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lrc: txt })
        }).then(function (d) {
          if (d.ok) {
            it.has_lrc = true;
            toast('《' + it.title + '》歌词已保存，前台刷新后生效', 'ok');
            renderList();
          } else toast(d.error || '保存失败', 'err');
        }).catch(function () { toast('网络错误', 'err'); });
      });
    };
    inp.click();
  }

  function removeLrc(it) {
    ask({
      title: '移除歌词',
      msg: '移除《' + it.title + '》的歌词？歌曲本身不受影响。',
      okText: '移除',
      danger: true,
      cb: function (yes) {
        if (!yes) return;
        api('/api/admin/media/' + it.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lrc: '' })
        }).then(function (d) {
          if (d.ok) {
            it.has_lrc = false;
            toast('歌词已移除', 'ok');
            renderList();
          } else toast(d.error || '操作失败', 'err');
        }).catch(function () { toast('网络错误', 'err'); });
      },
    });
  }

  // ---------- 音乐专辑封面：上传/替换/移除（media.cover 存 KV 键，/api/playlist 随清单下发前台播放器） ----------
  function uploadCover(it) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.jpg,.jpeg,.png,.gif,.webp,.avif,image/jpeg,image/png,image/gif,image/webp,image/avif';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      if (!/\\.(jpe?g|png|gif|webp|avif)$/i.test(f.name)) { toast('请选择 jpg/png/gif/webp/avif 图片', 'err'); return; }
      if (f.size > 2 * 1024 * 1024) { toast('封面图片超过 2MB', 'err'); return; }
      var form = new FormData();
      form.append('file', f);
      api('/api/admin/media/' + it.id + '/cover', { method: 'POST', body: form }).then(function (d) {
        if (d.ok) {
          it.has_cover = true;
          toast('《' + it.title + '》封面已保存，前台刷新后生效', 'ok');
          renderList();
        } else toast(d.error || '上传失败', 'err');
      }).catch(function () { toast('网络错误', 'err'); });
    };
    inp.click();
  }

  function removeCover(it) {
    ask({
      title: '移除封面',
      msg: '移除《' + it.title + '》的专辑封面？歌曲本身不受影响。',
      okText: '移除',
      danger: true,
      cb: function (yes) {
        if (!yes) return;
        api('/api/admin/media/' + it.id + '/cover', { method: 'DELETE' }).then(function (d) {
          if (d.ok) {
            it.has_cover = false;
            toast('封面已移除', 'ok');
            renderList();
          } else toast(d.error || '操作失败', 'err');
        }).catch(function () { toast('网络错误', 'err'); });
      },
    });
  }

  function renderList() {
    var list = $('list');
    var arr = items[currentType] || [];
    var q = ($('searchInput').value || '').trim().toLowerCase();
    var showArr = arr.filter(function (it) {
      return !q || (it.title || '').toLowerCase().indexOf(q) > -1;
    });
    // 相册筛选（仅图片页）
    if (currentType === 'image' && albumFilter === '__none__') {
      showArr = showArr.filter(function (it) { return !(it.album || '').trim(); });
    } else if (currentType === 'image' && albumFilter) {
      showArr = showArr.filter(function (it) { return (it.album || '').trim() === albumFilter; });
    }
    var filtering = !!q || (currentType === 'image' && !!albumFilter); // 筛选视图只读，不排不拖
    list.classList.toggle('img-grid', currentType === 'image'); // 图片页走缩略图网格，音乐/视频走行式
    list.innerHTML = '';
    var ebox = $('empty');
    ebox.hidden = showArr.length > 0;
    if (arr.length) {
      ebox.querySelector('.es-title').textContent = '没有匹配的文件';
      ebox.querySelector('.es-hint').textContent = '没有文件名包含「' + q + '」，换个关键词试试。';
    } else {
      ebox.querySelector('.es-title').textContent = '还没有内容';
      ebox.querySelector('.es-hint').textContent = '先上传一个文件吧。';
    }
    showArr.forEach(function (it) {
      var i = arr.indexOf(it);
      var li = document.createElement('li');
      li.draggable = !filtering || currentType === 'image';
      // 图片网格：缩略图容器 + 悬停操作层 + 下方信息区；音乐/视频仍是平铺行
      var icThumbs = null, icOv = null, icInfo = null;
      if (currentType === 'image') {
        icThumbs = document.createElement('div');
        icThumbs.className = 'ic-thumbs';
        icOv = document.createElement('div');
        icOv.className = 'ic-ov';
        icInfo = document.createElement('div');
        icInfo.className = 'ic-info';
      }

      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'sel';
      chk.checked = !!selected[it.id];
      chk.addEventListener('change', function () {
        if (chk.checked) selected[it.id] = true; else delete selected[it.id];
        updateBatchBtn();
        syncSelAll(showArr);
      });
      li.appendChild(chk);

      var handle = document.createElement('span');
      handle.className = 'handle';
      handle.innerHTML = ICO.grip;
      handle.title = '拖动排序';

      if (!filtering) li.appendChild(handle);

      // 图片类显示缩略图（点击可直接预览大图）
      if (currentType === 'image' && it.r2_key) {
        var thumb = document.createElement('img');
        thumb.className = 'thumb';
        thumb.loading = 'lazy';
        thumb.src = '/media/' + it.r2_key;
        thumb.style.cursor = 'zoom-in';
        thumb.addEventListener('click', function () { openPreview(it); });
        icThumbs.appendChild(thumb);
        icThumbs.appendChild(icOv);
        li.appendChild(icThumbs);
      }

      var title = document.createElement('span');
      title.className = 'title';
      title.textContent = it.title;
      title.title = it.title;
      title.addEventListener('click', function () { startRename(it, title); });

      var meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = fmtSize(it.size) + ' · ' + fmtDate(it.created_at);

      var titleHost = currentType === 'image' ? icInfo : li;
      titleHost.appendChild(title);
      titleHost.appendChild(meta);

      // 视频行挂媒体地址与标题：行悬停预览卡用（见「视频行悬停预览」模块）。
      // 注意 _vkey/_vtitle 是 JS 属性不是 class，querySelector('#list li._vkey') 永远查不到
      if (currentType === 'video' && it.r2_key) {
        li._vkey = '/media/' + it.r2_key;
        li._vtitle = it.title;
      }

      // 图片：行内相册归属下拉（自定义组件，带展开动画；与 AI 面板同款 makeAiDrop）
      if (currentType === 'image') {
        var cur = (it.album || '').trim();
        var anames = albumNames();
        var aopts = [{ value: '', label: '未分组' }];
        if (cur && anames.indexOf(cur) === -1) aopts.push({ value: cur, label: cur }); // 刚被别人改名的兜底
        anames.forEach(function (nm) { aopts.push({ value: nm, label: nm }); });
        var ainit = '';
        aopts.forEach(function (o) { if (o.value === cur) ainit = cur; });
        var ahost = document.createElement('span');
        makeAiDrop(ahost, {
          className: 'row-album',
          title: '归属相册（拖到左侧相册名也可归类）',
          value: ainit,
          options: aopts,
          onChange: function (val) {
            api('/api/admin/media/' + it.id, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ album: val })
            }).then(function (d) {
              if (d.ok) {
                it.album = val;
                rebuildAlbumControls();
                toast('已移入「' + (val || '未分组') + '」', 'ok');
              } else toast(d.error || '操作失败', 'err');
            });
          },
        });
        icInfo.appendChild(ahost);
      }

      // 图片行可拖到左侧相册栏归类（勾选状态下拖任意已选行 = 整批移动）；
      // 与排序拖拽共存：drop 落在相册项上走归类，落在列表行上走排序
      if (currentType === 'image') {
        li.draggable = true;
        li.addEventListener('dragstart', function (e) {
          albumDragIds = selected[it.id]
            ? (items.image || []).filter(function (x) { return selected[x.id]; }).map(function (x) { return x.id; })
            : [it.id];
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'copyMove';
            try { e.dataTransfer.setData('text/plain', 'yhuo-album'); } catch (err) {}
          }
        });
        li.addEventListener('dragend', function () {
          albumDragIds = null;
          clearAlbumDropHints();
        });
      }

      // 行内操作按钮组（桌面悬停/聚焦浮现，触屏常显，窄屏换行到第二行；图片网格时放进悬停层）
      var actions = document.createElement('div');
      actions.className = 'row-actions' + (currentType === 'image' ? ' ic-act' : '');

      var renameBtn = document.createElement('button');
      renameBtn.className = 'ghost icon-btn-sm';
      renameBtn.innerHTML = ICO.pencil;
      renameBtn.title = '修改显示名称';
      renameBtn.addEventListener('click', function () { startRename(it, title); });
      actions.appendChild(renameBtn);

      var playBtn = document.createElement('button');
      playBtn.className = 'ghost';
      playBtn.innerHTML = (currentType === 'image' ? ICO.view : ICO.play) +
        '<span>' + (currentType === 'music' ? '试听' : (currentType === 'video' ? '预览' : '查看')) + '</span>';
      playBtn.addEventListener('click', function () { openPreview(it); });
      actions.appendChild(playBtn);

      // 视频行：设为首页单视频循环（独播）——选中项高亮星标
      if (currentType === 'video') {
        var vmBtn = document.createElement('button');
        vmBtn.className = 'ghost icon-btn-sm';
        vmBtn.title = '设为首页单视频循环（独播）';
        var vmActive = videoMode.mode === 'single' && videoMode.url === videoItemUrl(it);
        if (vmActive) vmBtn.classList.add('vm-set');
        vmBtn.innerHTML = vmActive ? ICO.starOn : ICO.starOff;
        vmBtn.addEventListener('click', function () { saveVideoMode('single', videoItemUrl(it)); });
        actions.appendChild(vmBtn);
      }

      // 音乐行：歌词按钮（上传/替换 .lrc；已配歌词可移除，歌词存 media.lrc 随清单下发）
      if (currentType === 'music') {
        var lrcBtn = document.createElement('button');
        lrcBtn.className = 'ghost';
        lrcBtn.innerHTML = ICO.lrc + '<span>歌词' + (it.has_lrc ? '✓' : '') + '</span>';
        lrcBtn.title = it.has_lrc ? '已配歌词，点击替换' : '上传 .lrc 歌词（与歌名对应）';
        lrcBtn.addEventListener('click', function () { uploadLrc(it); });
        actions.appendChild(lrcBtn);
        if (it.has_lrc) {
          var lrcDel = document.createElement('button');
          lrcDel.className = 'ghost icon-btn-sm';
          lrcDel.innerHTML = ICO.x;
          lrcDel.title = '移除歌词';
          lrcDel.addEventListener('click', function () { removeLrc(it); });
          actions.appendChild(lrcDel);
        }
        // 专辑封面按钮：上传/替换/移除（media.cover，前台迷你播放器旋转显示）
        var coverBtn = document.createElement('button');
        coverBtn.className = 'ghost';
        coverBtn.innerHTML = ICO.disc + '<span>封面' + (it.has_cover ? '✓' : '') + '</span>';
        coverBtn.title = it.has_cover ? '已设封面，点击替换' : '上传专辑封面（jpg/png/gif/webp/avif ≤2MB）';
        coverBtn.addEventListener('click', function () { uploadCover(it); });
        actions.appendChild(coverBtn);
        if (it.has_cover) {
          var coverDel = document.createElement('button');
          coverDel.className = 'ghost icon-btn-sm';
          coverDel.innerHTML = ICO.x;
          coverDel.title = '移除封面';
          coverDel.addEventListener('click', function () { removeCover(it); });
          actions.appendChild(coverDel);
        }
      }

      if (!filtering) {
        var up = document.createElement('button');
        up.className = 'ghost icon-btn-sm'; up.innerHTML = ICO.up; up.disabled = i === 0;
        up.title = '上移';
        up.addEventListener('click', function () { move(currentType, i, -1); });

        var down = document.createElement('button');
        down.className = 'ghost icon-btn-sm'; down.innerHTML = ICO.down; down.disabled = i === arr.length - 1;
        down.title = '下移';
        down.addEventListener('click', function () { move(currentType, i, 1); });

        actions.appendChild(up); actions.appendChild(down);
        addDragHandlers(li, currentType, i);
      }

      var del = document.createElement('button');
      del.className = 'danger';
      del.innerHTML = ICO.trash + '<span>删除</span>';
      del.title = '删除';
      del.addEventListener('click', function () { removeItem(it); });
      actions.appendChild(del);

      if (currentType === 'image') { icOv.appendChild(actions); li.appendChild(icInfo); }
      else li.appendChild(actions);

      list.appendChild(li);
    });
    syncSelAll(showArr);
    updateBatchBtn();
    renderStorage();
    if (currentType === 'image') rebuildAlbumControls();
  }

  function syncSelAll(showArr) {
    var all = showArr.length > 0 && showArr.every(function (it) { return selected[it.id]; });
    $('selAll').checked = all;
  }

  // ---------- 存储用量（KV 总量 1GB，媒体大小从清单求和） ----------
  function renderStorage() {
    var total = 0;
    ['music', 'video', 'image'].forEach(function (t) {
      (items[t] || []).forEach(function (it) { total += it.size || 0; });
    });
    var CAP = 1024 * 1024 * 1024;
    var pct = total / CAP * 100;
    $('storageText').textContent = '存储已用 ' + fmtSize(total) + ' / 1 GB' +
      (pct >= 80 ? '（快满了，建议清理大文件）' : '');
    $('storageBar').firstElementChild.style.width = Math.min(100, pct).toFixed(2) + '%';
  }

  // ---------- 首页视频播放模式（视频页顶部设置：顺序/单视频/随机，影响前台首页视频轮播） ----------
  var videoMode = { mode: 'seq', url: '' };
  function videoItemUrl(it) { return '/media/' + (it.r2_key || it.id || ''); }
  function applyVideoModeUI() {
    document.querySelectorAll('.vm-chip').forEach(function (c) {
      c.classList.toggle('active', c.getAttribute('data-m') === videoMode.mode);
    });
    var t = $('vmSingleText');
    if (t) {
      if (videoMode.mode === 'single') {
        var hit = null;
        (items.video || []).forEach(function (it) { if (videoItemUrl(it) === videoMode.url) hit = it; });
        t.textContent = hit ? '独播：' + hit.title : (videoMode.url ? '独播视频已被删除' : '在列表点「设为独播」选择');
      } else t.textContent = '';
    }
    if (currentType === 'video') renderList(); // 刷新行的"设为独播"高亮
  }
  function loadVideoMode() {
    api('/api/admin/video-mode').then(function (d) {
      if (!d || !d.ok) return;
      videoMode = { mode: d.mode, url: d.url || '' };
      applyVideoModeUI();
    }).catch(function () {});
  }
  function saveVideoMode(mode, url) {
    api('/api/admin/video-mode', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: mode, url: url || '' })
    }).then(function (d) {
      if (d && d.ok) {
        videoMode = { mode: d.mode, url: d.url || '' };
        applyVideoModeUI();
        toast('首页视频播放已更新', 'ok');
      } else toast((d && d.error) || '保存失败', 'err');
    }).catch(function () { toast('保存失败', 'err'); });
  }
  document.querySelectorAll('.vm-chip').forEach(function (c) {
    c.addEventListener('click', function () {
      var m = c.getAttribute('data-m');
      var url = videoMode.url;
      // 切到单视频模式且还没选中过：默认第一个视频
      if (m === 'single' && !url) {
        var first = (items.video || [])[0];
        if (first) url = videoItemUrl(first);
      }
      saveVideoMode(m, url);
    });
  });

  // ---------- 状态页：系统信息 / 存储空间分区 / 邮件发送额度 ----------
  var MAIL_DAILY_CAP = { resend: 100, brevo: 300 }; // 服务商免费额度（封/天）
  function storageDetail() {
    var out = { total: 0, items: [] };
    ['music', 'video', 'image'].forEach(function (t) {
      var size = 0;
      (items[t] || []).forEach(function (it) { size += it.size || 0; });
      out.items.push({ type: t, name: { music: '音乐', video: '视频', image: '图片' }[t], count: (items[t] || []).length, size: size });
      out.total += size;
    });
    return out;
  }
  function renderStatus() {
    // 存储空间：总量条 + 三类分区条
    var sd = storageDetail();
    var CAP = 1024 * 1024 * 1024; // 本地常量（renderStorage 里的 CAP 是它函数内的局部变量，这里不能复用）
    var stPct = sd.total / CAP * 100;
    $('stStorageSumm').textContent = fmtSize(sd.total) + ' / 1 GB（' + stPct.toFixed(1) + '%）' + (stPct >= 80 ? '，快满了请清理' : '');
    function srow(name, size, pct2, count) {
      var b = pct2 >= 90 ? ' danger' : (pct2 >= 80 ? ' warn' : '');
      return '<div class="meter-row"><span class="mt-name">' + name + '</span>' +
        '<div class="mt-track"><i class="' + b + '" style="width:' + Math.min(100, pct2).toFixed(1) + '%"></i></div>' +
        '<span class="mt-meta">' + fmtSize(size) + (count ? ' · ' + count + ' 个' : '') + '</span></div>';
    }
    $('stStorageBody').innerHTML =
      srow('全部', sd.total, stPct, sd.items.reduce(function (a, x) { return a + x.count; }, 0)) +
      sd.items.map(function (x) { return srow(x.name, x.size, x.size / CAP * 100, x.count); }).join('');

    // 邮件发送额度：服务商上限 - 今日已发（本地计数估算）
    $('stMailBody').innerHTML = skListHtml(2);
    $('stMailSumm').textContent = '';
    api('/api/admin/email').then(function (cfg) {
      var cOk = cfg && cfg.ok;
      if (!cOk) {
        $('stMailBody').innerHTML = emptyStateHtml(ICO.x, '读取失败', '请稍后重试。');
        return;
      }
      if (!cfg.enabled) {
        $('stMailSumm').textContent = '未启用';
        $('stMailBody').innerHTML = emptyStateHtml(ICO.clock, '邮件服务未启用', '到「邮件」页配置并开启后再查看额度。');
        return;
      }
      api('/api/admin/email/usage').then(function (u) {
        if (!u || !u.ok) {
          $('stMailBody').innerHTML = emptyStateHtml(ICO.x, '读取失败', '请稍后重试。');
          return;
        }
        var pname = cfg.provider === 'brevo' ? 'Brevo（300 封/天）' : 'Resend（100 封/天）';
        var cap = MAIL_DAILY_CAP[cfg.provider] || 100;
        var today = u.today || 0;
        var left = Math.max(0, cap - today);
        $('stMailSumm').textContent = '今日已发 ' + today + ' 封';
        var html = '<div class="mail-quota">' +
          '<div class="mq-line"><span class="meta2">服务商</span><span>' + pname + '</span></div>' +
          '<div class="meter-row"><span class="mt-name">今日已发</span>' +
          '<div class="mt-track"><i class="' + (today / cap >= 0.8 ? ' warn' : '') + '" style="width:' + Math.min(100, today / cap * 100).toFixed(1) + '%"></i></div>' +
          '<span class="mt-meta">' + today + ' / ' + cap + ' 封</span></div>' +
          '<div class="mq-line"><span class="meta2">剩余免费额度</span><span><strong style="font-size:16px">' + left + '</strong> 封</span></div>' +
          '</div>';
        // 近 7 天每日发送（迷你柱状）
        var d7 = (u.d14days || []).slice(-7);
        if (d7.length) {
          var m7 = 1;
          d7.forEach(function (d) { if (d.count > m7) m7 = d.count; });
          html += '<div class="mail-sec-title">近 7 天每日发送</div><div class="mini-bars">' +
            d7.map(function (d) {
              var h = Math.max(d.count > 0 ? 3 : 1, Math.round(d.count / m7 * 38));
              return '<div class="mb-col"><div class="mb-bar" style="height:' + h + 'px" title="' + d.day + '：' + d.count + ' 封"></div><div class="mb-lbl">' + d.day.slice(5) + '</div></div>';
            }).join('') + '</div>';
        }
        $('stMailBody').innerHTML = html;
      }).catch(function () {});
    }).catch(function () {});
  }

  // ---------- 状态页 · 数据备份卡（D1 每日自动备份，KV 保留最近 7 份） ----------
  function loadBackupCard() {
    $('stBackupBody').innerHTML = skListHtml(3);
    $('stBackupSumm').textContent = '';
    api('/api/admin/backup').then(function (d) {
      if (!d || !d.ok) {
        $('stBackupBody').innerHTML = emptyStateHtml(ICO.x, '读取失败', '请稍后重试。');
        return;
      }
      $('stBackupSumm').textContent = d.lastdate ? ('最近备份：' + d.lastdate) : '还没有备份';
      if (!(d.list || []).length) {
        $('stBackupBody').innerHTML = emptyStateHtml(ICO.box, '还没有备份文件', '点下方「立即备份」马上生成第一份。');
        return;
      }
      var rows = '';
      d.list.forEach(function (b) {
        var countsTxt = '明细解析失败';
        if (b.counts) {
          countsTxt = (b.counts.notes || 0) + ' 随笔 · ' + (b.counts.messages || 0) + ' 留言 · ' +
            (b.counts.checkins || 0) + ' 签到 · ' + (b.counts.users || 0) + ' 用户';
        }
        rows += '<div class="list-row"><span class="chip-tag mono">' + b.date + '</span>' +
          '<span class="lr-grow">' + countsTxt + '</span>' +
          '<a class="meta2" style="color:var(--fg);text-decoration:underline" href="/api/admin/backup?date=' +
          encodeURIComponent(b.date) + '" download="yhuo-backup-' + b.date + '.json">下载</a></div>';
      });
      $('stBackupBody').innerHTML = rows;
    }).catch(function () {
      $('stBackupBody').innerHTML = emptyStateHtml(ICO.x, '读取失败', '请稍后重试。');
    });
  }
  $('stBackupNowBtn').addEventListener('click', function () {
    var btn = $('stBackupNowBtn');
    btn.disabled = true;
    $('stBackupTip').textContent = '正在备份…';
    api('/api/admin/backup', { method: 'POST' }).then(function (d) {
      btn.disabled = false;
      $('stBackupTip').textContent = '';
      if (d && d.ok) toast('已备份 ' + d.date + '（' + fmtSize(d.bytes) + '）', 'ok');
      else toast((d && d.error) || '备份失败', 'err');
      loadBackupCard(); // 成功失败都重拉清单：成功出最新一份，失败回到旧列表态
    }).catch(function () {
      btn.disabled = false;
      $('stBackupTip').textContent = '';
      toast('网络错误，备份失败', 'err');
    });
  });

  // ---------- 状态页 · 前端错误卡（RUM：前台报错经 /api/rum 入库，本卡只读+清空） ----------
  var rumTotal = 0; // 最近一次拉到的总条数，「清空」确认弹窗文案用
  function loadRumCard() {
    $('stRumBody').innerHTML = skListHtml(3);
    $('stRumSumm').textContent = '';
    api('/api/admin/rum').then(function (d) {
      if (!d || !d.ok) {
        $('stRumBody').innerHTML = emptyStateHtml(ICO.x, '读取失败', '请稍后重试。');
        return;
      }
      var list = d.list || [];
      rumTotal = d.total || 0;
      // 摘要行：0 条绿色安心话术，有错条数用 --warn 提醒（色走变量不写死 hex）
      var summ = $('stRumSumm');
      summ.textContent = '';
      if (!rumTotal) {
        var okSpan = document.createElement('span');
        okSpan.style.color = 'var(--ok)';
        okSpan.textContent = '还没有收到前端错误，一切正常';
        summ.appendChild(okSpan);
      } else {
        var warnSpan = document.createElement('span');
        warnSpan.style.color = 'var(--warn)';
        warnSpan.textContent = '共 ' + rumTotal + ' 条';
        summ.appendChild(warnSpan);
        summ.appendChild(document.createTextNode(list[0] ? ' · 最近：' + fmtDate(list[0].created_at) : ''));
      }
      if (!list.length) {
        $('stRumBody').innerHTML = emptyStateHtml(ICO.shield, '一切正常', '还没有收到前端错误上报。');
        return;
      }
      // 最近 10 条列表：时间 · path · msg 首行；全部 textContent 组装（错误消息来自访客端，防注入），
      // 整行悬停 title 显示完整调用栈
      $('stRumBody').innerHTML = '';
      list.slice(0, 10).forEach(function (r) {
        var row = document.createElement('div');
        row.className = 'list-row';
        row.title = r.stack || r.msg || '';
        var time = document.createElement('span');
        time.className = 'chip-tag mono';
        time.textContent = fmtDate(r.created_at);
        var path = document.createElement('span');
        path.className = 'lr-side';
        path.textContent = r.path || '/';
        var msg = document.createElement('span');
        msg.className = 'lr-grow';
        msg.style.color = 'var(--fg)';
        msg.textContent = String(r.msg || '').split('\\n')[0]; // 只取首行，完整 stack 悬停看（坑 18：模板里反斜杠必须双写，否则换行转义被求值成真换行打断字符串）
        row.appendChild(time);
        row.appendChild(path);
        row.appendChild(msg);
        $('stRumBody').appendChild(row);
      });
    }).catch(function () {
      $('stRumBody').innerHTML = emptyStateHtml(ICO.x, '读取失败', '请稍后重试。');
    });
  }
  $('stRumClearBtn').addEventListener('click', function () {
    ask({
      title: '清空前端错误',
      msg: '确定清空全部 ' + rumTotal + ' 条前端错误记录吗？清空后不可恢复。',
      okText: '清空', danger: true,
      cb: function (ok) {
        if (!ok) return;
        var btn = $('stRumClearBtn');
        btn.disabled = true;
        $('stRumTip').textContent = '正在清空…';
        api('/api/admin/rum', { method: 'DELETE' }).then(function (d) {
          btn.disabled = false;
          $('stRumTip').textContent = '';
          if (d && d.ok) { toast('已清空', 'ok'); loadRumCard(); }
          else toast((d && d.error) || '清空失败', 'err');
        }).catch(function () {
          btn.disabled = false;
          $('stRumTip').textContent = '';
          toast('网络错误，清空失败', 'err');
        });
      }
    });
  });

  // ---------- 拖拽排序 ----------
  var dragFrom = null;
  function addDragHandlers(li, type, index) {
    li.addEventListener('dragstart', function (e) {
      dragFrom = { type: type, index: index };
      li.classList.add('dragging');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', function () {
      dragFrom = null;
      li.classList.remove('dragging');
    });
    li.addEventListener('dragover', function (e) {
      e.preventDefault();
      if (dragFrom && dragFrom.type === type) li.classList.add('dragover');
    });
    li.addEventListener('dragleave', function () { li.classList.remove('dragover'); });
    li.addEventListener('drop', function (e) {
      e.preventDefault();
      li.classList.remove('dragover');
      if (!dragFrom || dragFrom.type !== type || dragFrom.index === index) return;
      var arr = items[type];
      var ids = arr.map(function (x) { return x.id; });
      var moved = ids.splice(dragFrom.index, 1)[0];
      ids.splice(index, 0, moved);
      reorder(type, ids);
    });
  }

  function reorder(type, ids) {
    api('/api/admin/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type, ids: ids })
    }).then(function (data) {
      if (data.ok) { loadList(); toast('顺序已更新', 'ok'); }
      else toast(data.error || '操作失败', 'err');
    });
  }

  // 行内改名：标题位直接变输入框，Enter 保存 / Esc 取消 / 失焦保存
  function startRename(it, titleEl) {
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-edit';
    input.value = it.title;
    input.maxLength = 200;
    titleEl.replaceWith(input);
    input.focus();
    input.select();
    var done = false;
    function finish(save) {
      if (done) return;
      done = true;
      var t = input.value.trim();
      if (!save || !t || t === it.title) { renderList(); return; }
      api('/api/admin/media/' + it.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t })
      }).then(function (data) {
        if (data.ok) { it.title = t; toast('已改名', 'ok'); }
        else toast(data.error || '操作失败', 'err');
        renderList();
      }).catch(function () { renderList(); toast('网络错误', 'err'); });
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
    });
    input.addEventListener('blur', function () { finish(true); });
  }

  function removeItem(it) {
    ask({
      title: '删除文件',
      msg: '确定删除「' + it.title + '」吗？文件会一并从存储里删除，不可恢复。',
      okText: '删除', danger: true,
      cb: function (ok) {
        if (!ok) return;
        api('/api/admin/media/' + it.id, { method: 'DELETE' }).then(function (data) {
          if (data.ok) { loadList(); toast('已删除', 'ok'); }
          else toast(data.error || '删除失败', 'err');
        });
      }
    });
  }

  function deleteSelected() {
    var ids = (items[currentType] || []).filter(function (it) { return selected[it.id]; });
    if (!ids.length) return;
    ask({
      title: '批量删除',
      msg: '确定删除所选 ' + ids.length + ' 项吗？文件会一并从存储里删除，不可恢复。',
      okText: '全部删除', danger: true,
      cb: function (ok) {
        if (!ok) return;
        var left = ids.length;
        ids.forEach(function (it) {
          api('/api/admin/media/' + it.id, { method: 'DELETE' }).then(function (data) {
            if (data.ok) delete selected[it.id];
            if (--left === 0) {
              loadList();
              toast('批量删除完成', 'ok');
            }
          }).catch(function () {
            if (--left === 0) { loadList(); toast('部分删除失败，请重试', 'err'); }
          });
        });
      }
    });
  }

  // ---------- 媒体预览弹窗（音乐试听 / 视频预览 / 图片查看） ----------
  function openPreview(it) {
    var c = $('previewContent');
    c.innerHTML = '';
    var url = '/media/' + it.r2_key;
    var el;
    if (currentType === 'music') {
      el = document.createElement('audio');
      el.controls = true; el.autoplay = true; el.src = url;
    } else if (currentType === 'video') {
      el = document.createElement('video');
      el.controls = true; el.autoplay = true; el.src = url;
    } else {
      el = document.createElement('img');
      el.src = url; el.alt = it.title;
    }
    c.appendChild(el);
    $('previewTitle').textContent = it.title + '（' + fmtSize(it.size) + '）';
    $('previewModal').hidden = false;
  }

  function closePreview() {
    $('previewContent').innerHTML = ''; // 移除节点即停止播放
    $('previewModal').hidden = true;
  }

  $('previewClose').addEventListener('click', closePreview);
  $('previewBackdrop').addEventListener('click', closePreview);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('previewModal').hidden) closePreview();
    else if (!$('askModal').hidden) askClose(false);
  });

  function move(type, index, delta) {
    var arr = items[type];
    var ids = arr.map(function (x) { return x.id; });
    var target = index + delta;
    if (target < 0 || target >= ids.length) return;
    var tmp = ids[index]; ids[index] = ids[target]; ids[target] = tmp;
    reorder(type, ids);
  }

  // ---------- 用户管理 ----------
  var userSortDesc = true; // 注册时间 新→旧

  // 相对时间：最后活跃显示用（last_seen_at 是 UTC 的 "YYYY-MM-DD HH:MM:SS"）
  function fmtRel(s) {
    if (!s) return '从未活跃';
    var t = Date.parse(String(s).replace(' ', 'T') + 'Z');
    if (isNaN(t)) return '从未活跃';
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return '刚刚活跃';
    if (m < 60) return m + ' 分钟前活跃';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' 小时前活跃';
    return Math.round(h / 24) + ' 天前活跃';
  }

  function renderUsers() {
    var list = $('userList');
    var q = ($('userSearch').value || '').trim().toLowerCase();
    var arr = users.filter(function (u) {
      return !q || (u.username || '').toLowerCase().indexOf(q) > -1;
    });
    arr = arr.slice().sort(function (a, b) {
      return userSortDesc ? b.id - a.id : a.id - b.id; // id 顺序即注册顺序
    });
    list.innerHTML = '';
    var ue = $('userEmpty');
    ue.hidden = arr.length > 0;
    ue.querySelector('.es-title').textContent = users.length ? '没有匹配的用户' : '还没有用户';
    ue.querySelector('.es-hint').textContent = users.length
      ? ('没有用户名包含「' + q + '」的注册用户，换个关键词试试。')
      : '有访客在前台注册后会出现在这里。';
    arr.forEach(function (u) {
      var li = document.createElement('li');

      var avatar = document.createElement('div');
      avatar.className = 'avatar';
      if (u.avatar_key) {
        var img = document.createElement('img');
        img.src = '/media/' + u.avatar_key;
        img.alt = '';
        img.loading = 'lazy';
        avatar.appendChild(img);
      } else {
        avatar.textContent = (u.username || '?').slice(0, 1).toUpperCase();
      }

      var title = document.createElement('span');
      title.className = 'title';
      title.textContent = u.username;

      var badge = document.createElement('span');
      badge.className = 'chip-tag ' + (u.banned ? 'banned' : 'ok');
      badge.textContent = u.banned ? '已禁用' : '正常';

      var meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = '注册于 ' + fmtDate(u.created_at) + ' · ' + fmtRel(u.last_seen_at)
        + (u.email ? ' · ' + u.email + (u.twofa_enabled ? '（2FA）' : '') : '');

      var actions = document.createElement('div');
      actions.className = 'row-actions';
      var ban = document.createElement('button');
      ban.className = 'ghost';
      ban.textContent = u.banned ? '解封' : '禁用';
      ban.addEventListener('click', function () { setBanned(u, !u.banned); });

      var del = document.createElement('button');
      del.className = 'danger';
      del.textContent = '删除';
      del.addEventListener('click', function () { removeUser(u); });

      actions.appendChild(ban); actions.appendChild(del);
      li.appendChild(avatar); li.appendChild(title); li.appendChild(badge); li.appendChild(meta);
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  function setBanned(u, banned) {
    if (!banned) { doSetBanned(u, false); return; }
    ask({
      title: '禁用用户',
      msg: '禁用「' + u.username + '」？该用户会立即被踢下线且无法再登录。',
      okText: '禁用', danger: true,
      cb: function (ok) { if (ok) doSetBanned(u, true); }
    });
  }
  function doSetBanned(u, banned) {
    api('/api/admin/users/' + u.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banned: banned })
    }).then(function (data) {
      if (data.ok) { loadUsers(); toast(banned ? '已禁用' : '已解封', 'ok'); }
      else toast(data.error || '操作失败', 'err');
    });
  }

  function removeUser(u) {
    ask({
      title: '删除账号',
      msg: '彻底删除账号「' + u.username + '」？此操作不可恢复。',
      okText: '删除', danger: true,
      cb: function (ok) {
        if (!ok) return;
        api('/api/admin/users/' + u.id, { method: 'DELETE' }).then(function (data) {
          if (data.ok) { loadUsers(); toast('账号已删除', 'ok'); }
          else toast(data.error || '删除失败', 'err');
        });
      }
    });
  }

  // ---------- 外观设置（站点默认主题色 / 默认背景图） ----------
  var ACCENTS = [
    { name: 'terracotta', label: '陶土', color: '#b0532b' },
    { name: 'purple', label: '紫色', color: '#8b5cf6' },
    { name: 'pink', label: '粉色', color: '#ec4899' },
    { name: 'green', label: '绿色', color: '#10b981' },
    { name: 'orange', label: '橙色', color: '#f59e0b' }
  ];
  var currentAccent = null;

  function renderAccents() {
    var row = $('accentRow');
    row.innerHTML = '';
    ACCENTS.forEach(function (a) {
      var b = document.createElement('button');
      b.className = 'accent-dot' + (currentAccent === a.name ? ' active' : '');
      b.style.background = a.color;
      b.title = a.label + (currentAccent === a.name ? '（当前）' : '');
      b.addEventListener('click', function () {
        api('/api/admin/appearance', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accent: a.name })
        }).then(function (d) {
          if (d.ok) { currentAccent = d.accent; renderAccents(); toast('默认主题色已保存，前台即刻生效', 'ok'); }
          else toast(d.error || '保存失败', 'err');
        }).catch(function () { toast('网络错误', 'err'); });
      });
      row.appendChild(b);
    });
  }

  function renderBgPreview(bgKey) {
    var img = $('bgPreview');
    var none = $('bgNone');
    if (bgKey) { img.src = '/media/' + bgKey; img.hidden = false; none.hidden = true; }
    else { img.hidden = true; none.hidden = false; }
  }

  function loadAppearance() {
    api('/api/admin/appearance').then(function (d) {
      if (d.ok) {
        currentAccent = d.accent;
        renderAccents();
        renderBgPreview(d.bg);
        quoteRows = Array.isArray(d.quotes) ? d.quotes.slice() : [];
        renderQuoteRows();
        var blur = d.blur === null || d.blur === undefined ? 0 : d.blur;
        $('bgBlurAdmin').value = blur;
        $('bgBlurAdminVal').textContent = d.blur === null || d.blur === undefined
          ? '未设置（访客不模糊）'
          : '当前默认 ' + blur + 'px';
        flagState = d.flags || {};
        renderFlagRows();
        playerCfg = d.player || playerCfg;
        renderPlayerMode();
      } else if (d._status === 401) {
        show('login');
      }
    }).catch(function () {});
  }
  $('bgBlurAdmin').addEventListener('input', function () {
    $('bgBlurAdminVal').textContent = '滑杆值 ' + this.value + 'px（保存后生效）';
  });
  $('bgBlurSaveBtn').addEventListener('click', function () {
    api('/api/admin/appearance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blur: parseInt($('bgBlurAdmin').value, 10) || 0 })
    }).then(function (d) {
      if (d.ok) {
        $('bgBlurAdminVal').textContent = d.blur === null ? '未设置（访客不模糊）' : '当前默认 ' + d.blur + 'px';
        toast(d.blur ? '默认背景模糊已保存（' + d.blur + 'px），前台约 1 分钟内生效' : '已清除默认模糊，前台约 1 分钟内恢复不模糊', 'ok');
      } else toast(d.error || '保存失败', 'err');
    }).catch(function () { toast('网络错误', 'err'); });
  });

  // ---------- 主页寄语（多条） ----------
  var quoteRows = [];

  function renderQuoteRows() {
    var box = $('quoteRows');
    box.innerHTML = '';
    quoteRows.forEach(function (q, i) {
      var row = document.createElement('div');
      row.className = 'bgset-row';
      var input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 100;
      input.placeholder = '寄语内容（≤100 字）';
      input.value = q;
      input.addEventListener('input', function () { quoteRows[i] = this.value; });
      var del = document.createElement('button');
      del.className = 'icon-mini';
      del.type = 'button';
      del.title = '删除这条';
      del.innerHTML = ICO.trash;
      del.addEventListener('click', function () { quoteRows.splice(i, 1); renderQuoteRows(); });
      row.appendChild(input);
      row.appendChild(del);
      attachCounter(input, 100); // 放在 append 之后，计数器插到输入框与删除钮之间
      box.appendChild(row);
    });
    if (!quoteRows.length) {
      var empty = document.createElement('span');
      empty.className = 'meta2';
      empty.textContent = '未设置（前台显示每日一言）';
      box.appendChild(empty);
    }
  }

  $('quoteAddBtn').addEventListener('click', function () {
    if (quoteRows.length >= 20) { toast('最多 20 条寄语', 'err'); return; }
    quoteRows.push('');
    renderQuoteRows();
    var inputs = $('quoteRows').querySelectorAll('input');
    if (inputs.length) inputs[inputs.length - 1].focus();
  });

  $('quoteSaveBtn').addEventListener('click', function () {
    api('/api/admin/appearance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotes: quoteRows })
    }).then(function (d) {
      if (d.ok) {
        quoteRows = d.quotes.slice();
        renderQuoteRows();
        toast(d.quotes.length ? '已保存 ' + d.quotes.length + ' 条寄语，前台随机显示' : '已清空寄语，前台恢复每日一言', 'ok');
      } else toast(d.error || '保存失败', 'err');
    }).catch(function () { toast('网络错误', 'err'); });
  });

  // ---------- 功能开关（前台界面/首页模块显隐；/api/settings 下发，缺省全开） ----------
  var FLAG_DEFS = [
    { key: 'tools', label: '工具界面' },
    { key: 'docs', label: '文档界面' },
    { key: 'weather', label: '天气胶囊' },
    { key: 'lyric', label: '歌词横条' },
    { key: 'video', label: '首页视频' }
  ];
  var flagState = {};

  function renderFlagRows() {
    var box = $('flagRows');
    box.innerHTML = '';
    FLAG_DEFS.forEach(function (f) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'geo-toggle' + (flagState[f.key] !== false ? ' on' : '');
      b.setAttribute('role', 'switch');
      b.innerHTML = '<span class="gt-label">' + f.label + '</span><span class="gt-track"><span class="gt-thumb"></span></span>';
      b.addEventListener('click', function () {
        flagState[f.key] = flagState[f.key] === false; // 开→关 / 关→开（缺省视为开）
        b.classList.toggle('on', flagState[f.key] !== false);
      });
      box.appendChild(b);
    });
  }

  $('flagSaveBtn').addEventListener('click', function () {
    var payload = {};
    FLAG_DEFS.forEach(function (f) { payload[f.key] = flagState[f.key] !== false; });
    api('/api/admin/appearance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flags: payload })
    }).then(function (d) {
      if (d.ok) {
        flagState = d.flags || payload;
        renderFlagRows();
        toast('功能开关已保存，访客下次进页面生效', 'ok');
      } else toast(d.error || '保存失败', 'err');
    }).catch(function () { toast('网络错误', 'err'); });
  });

  // ---------- 播放器样式（迷你播放条 / 悬浮播放器，共用站内曲库；/api/settings 下发 playerMode） ----------
  var playerCfg = { mode: 'mini' };

  function renderPlayerMode() {
    $('playerModeMini').classList.toggle('active', playerCfg.mode !== 'blog');
    $('playerModeBlog').classList.toggle('active', playerCfg.mode === 'blog');
  }
  $('playerModeMini').addEventListener('click', function () { playerCfg.mode = 'mini'; renderPlayerMode(); });
  $('playerModeBlog').addEventListener('click', function () { playerCfg.mode = 'blog'; renderPlayerMode(); });
  $('playerSaveBtn').addEventListener('click', function () {
    api('/api/admin/appearance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player: playerCfg })
    }).then(function (d) {
      if (d.ok) {
        playerCfg = d.player || playerCfg;
        renderPlayerMode();
        toast('播放器设置已保存，访客下次进页面生效', 'ok');
      } else toast(d.error || '保存失败', 'err');
    }).catch(function () { toast('网络错误', 'err'); });
  });

  // 备份导出：媒体清单 + 站点设置 + 访问统计，打包成 JSON 下载
  $('exportBtn').addEventListener('click', function () {
    var payload = {
      exported_at: new Date().toISOString(),
      media: items,
      settings: { accent: currentAccent, quotes: quoteRows.filter(function (q) { return (q || '').trim(); }) },
      visits: visitData,
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'yhuo-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });

  $('bgUploadBtn2').addEventListener('click', function () { $('bgFileInput').click(); });
  $('bgFileInput').addEventListener('change', function () {
    var f = this.files[0];
    this.value = '';
    if (!f) return;
    toast('正在上传背景图…', '', true);
    var form = new FormData();
    form.append('file', f);
    var opts = { method: 'POST', credentials: 'same-origin', body: form };
    if (typeof AbortController === 'function') {
      var ctl = new AbortController();
      opts.signal = ctl.signal;
      setTimeout(function () { ctl.abort(); }, 60000);
    }
    fetch('/api/admin/appearance/background', opts)
      .then(function (res) { return res.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
      .then(function (d) {
        if (d.ok) { renderBgPreview(d.bg); toast('默认背景图已更新', 'ok'); }
        else toast(d.error || '上传失败', 'err');
      })
      .catch(function () { toast('网络错误，上传失败', 'err'); });
  });
  $('bgClearBtn2').addEventListener('click', function () {
    ask({
      title: '清除背景图',
      msg: '清除默认背景图？访客将回到网站自带背景。',
      okText: '清除', danger: true,
      cb: function (ok) {
        if (!ok) return;
        api('/api/admin/appearance/background', { method: 'DELETE' }).then(function (d) {
          if (d.ok) { renderBgPreview(null); toast('已清除', 'ok'); }
          else toast(d.error || '操作失败', 'err');
        });
      }
    });
  });

  // ---------- AI 供应商管理（左侧列表 + 右侧详情，仿客户端模型设置） ----------
  var currentAiEnabled = false;
  var aiProviders = [];
  var aiDefaultKey = '';
  var aiSelected = null;   // 当前选中的供应商名；'__new__' = 新增模式
  var aiNewModels = [];    // 新增模式下的模型列表
  var aiModelsSig = null;

  var PENCIL_SVG = ICO.pencil;
  var TRASH_SVG = ICO.trash;
  var BOX_SVG = ICO.box;
  $('aiRenameBtn').innerHTML = PENCIL_SVG;
  $('aiDelProvBtn').innerHTML = TRASH_SVG;
  $('aiKeyEye').innerHTML = ICO.eye;
  $('aiDelProvBtn').classList.add('danger-hover');

  // 测试结果着色：ok===true 绿 / false 红 / 未定中性
  function setTestResult(text, ok) {
    var el = $('aiTestResult');
    el.textContent = text;
    el.className = 'meta2' + (ok === true ? ' ai-test-ok' : ok === false ? ' ai-test-err' : '');
  }

  function updateAiToggle(enabled, usable) {
    currentAiEnabled = !!enabled;
    $('aiToggleBtn').textContent = enabled ? '停用 AI' : '启用 AI';
    $('aiStateText').textContent = enabled
      ? (usable ? '启用中，前台 AI 界面可正常对话' : '启用中，但还没有可用的供应商（缺 Key 或模型），前台暂不可用')
      : '已停用，前台显示"接入中"';
  }

  function aiKeyHint(hasKey, hint) {
    $('aiKeyHint').textContent = hasKey ? '已保存（' + hint + '）；输入框留空 = 不修改' : '未设置';
    $('aiApiKey').placeholder = hasKey ? '留空保持不变' : 'sk-…';
  }

  function loadAiSettings(keepSelection) {
    api('/api/admin/ai').then(function (d) {
      if (!d.ok) { toast(d.error || '读取 AI 配置失败', 'err'); return; }
      updateAiToggle(d.enabled, d.usable);
      aiProviders = d.providers || [];
      aiDefaultKey = d.default || '';
      if (!keepSelection || aiSelected === '__new__' || !aiProviders.some(function (p) { return p.name === aiSelected; })) {
        aiSelected = aiProviders.length ? aiProviders[0].name : null;
      }
      renderAiManager();
    }).catch(function () { toast('网络错误', 'err'); });
  }

  function isNewMode() { return aiSelected === '__new__'; }

  function selectedProvider() {
    return aiProviders.filter(function (p) { return p.name === aiSelected; })[0] || null;
  }

  function renderAiManager() {
    // 左侧供应商列表
    var list = $('aiProvList');
    list.innerHTML = '';
    $('aiAddBtn').disabled = aiProviders.length >= 10;
    aiProviders.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ai-mgr-item' + (p.name === aiSelected ? ' active' : '') + (p.enabled ? '' : ' off');
      var ic = document.createElement('span');
      ic.className = 'ai-mgr-ico';
      ic.innerHTML = BOX_SVG;
      var nm = document.createElement('span');
      nm.className = 'ai-mgr-name';
      nm.textContent = p.name;
      var dot = document.createElement('span');
      dot.className = 'ai-mgr-dot';
      dot.title = p.enabled ? '启用中' : '已停用';
      b.appendChild(ic);
      b.appendChild(nm);
      b.appendChild(dot);
      b.addEventListener('click', function () { aiSelected = p.name; renderAiManager(); });
      list.appendChild(b);
    });

    // 右侧详情
    var p = isNewMode() ? null : selectedProvider();
    var showDetail = isNewMode() || !!p;
    $('aiProvDetail').hidden = !showDetail;
    $('aiProvEmpty').hidden = showDetail;
    if (showDetail) { // 切换供应商/进入新增时整块淡入，避免生硬跳变
      var det = $('aiProvDetail');
      det.classList.remove('ai-enter');
      void det.offsetWidth;
      det.classList.add('ai-enter');
    }
    if (!showDetail) return;
    setTestResult('');
    aiAddModelSetShow(false);
    aiModelsSig = null;

    if (isNewMode()) {
      $('aiProvName').hidden = true;
      $('aiProvNameInput').hidden = false;
      $('aiProvNameInput').value = '';
      $('aiRenameBtn').hidden = true;
      $('aiDelProvBtn').hidden = true;
      $('aiProvState').hidden = true;
      $('aiToggleProvBtn').hidden = true;
      $('aiBaseUrl').value = '';
      $('aiProtocol').value = 'openai';
      $('aiPrompt').value = '';
      $('aiApiKey').value = '';
      aiKeyHint(false, '');
      renderModelRows(null, aiNewModels);
      return;
    }

    $('aiProvName').hidden = false;
    $('aiProvNameInput').hidden = true;
    $('aiRenameBtn').hidden = false;
    $('aiDelProvBtn').hidden = false;
    $('aiProvState').hidden = false;
    $('aiToggleProvBtn').hidden = false;
    $('aiProvName').textContent = p.name;
    updateProvStateUi(p);
    $('aiBaseUrl').value = p.base_url || '';
    $('aiProtocol').value = p.protocol;
    $('aiPrompt').value = p.system_prompt || '';
    $('aiApiKey').value = '';
    setEye(false);
    aiKeyHint(p.has_key, p.key_hint);
    renderModelRows(p, p.models);
  }

  function updateProvStateUi(p) {
    var pill = $('aiProvState');
    var tbtn = $('aiToggleProvBtn');
    if (p.enabled) {
      pill.textContent = '已启用';
      pill.className = 'ai-pill-on';
      tbtn.textContent = '禁用';
    } else {
      pill.textContent = '已停用';
      pill.className = 'ai-pill-off';
      tbtn.textContent = '启用';
    }
  }

  function modelKeyOf(pn, m) { return pn + '/' + m; }

  var MODEL_TAGS = ['', '文本', '视觉', '推理'];
  function tagOptions() {
    return MODEL_TAGS.map(function (t) { return { value: t, label: t === '' ? '无标签' : t }; });
  }

  // ---------- 自定义下拉（带展开/收起动画；原生 select 弹层是系统渲染的做不了动画） ----------
  var aiDrops = []; // 所有实例，供全局"点空白/Esc 全关"用
  function makeAiDrop(host, opts) {
    host.classList.add('ai-drop');
    if (opts.className) host.classList.add(opts.className);
    if (opts.fullWidth) host.classList.add('ai-drop-full');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ai-drop-btn';
    btn.title = opts.title || '';
    var lbl = document.createElement('span');
    lbl.className = 'ai-drop-lbl';
    var chev = document.createElement('span');
    chev.className = 'ai-drop-chev';
    chev.innerHTML = ico('<path d="m6 9 6 6 6-6"/>');
    btn.appendChild(lbl);
    btn.appendChild(chev);
    var menu = document.createElement('div');
    menu.className = 'ai-drop-menu';
    var options = opts.options || [];
    var cur = opts.value;
    var open = false, closeTimer = null, inst = { host: host, close: close };
    options.forEach(function (o) {
      var it = document.createElement('button');
      it.type = 'button';
      it.className = 'ai-drop-opt';
      it.dataset.value = o.value;
      var mark = document.createElement('span');
      mark.className = 'ai-drop-mark';
      mark.innerHTML = ico('<path d="M20 6 9 17l-5-5"/>');
      var txt = document.createElement('span');
      txt.textContent = o.label;
      it.appendChild(mark);
      it.appendChild(txt);
      it.addEventListener('click', function () {
        var changed = o.value !== cur;
        set(o.value);
        close();
        if (changed) {
          if (opts.onChange) opts.onChange(o.value);
          host.dispatchEvent(new Event('change'));
        }
      });
      menu.appendChild(it);
    });
    btn.addEventListener('click', function () { open ? close() : openMenu(); });
    host.appendChild(btn);
    host.appendChild(menu);

    function paint() {
      var sel = null;
      options.forEach(function (o) { if (o.value === cur) sel = o; });
      lbl.textContent = sel ? sel.label : (options[0] ? options[0].label : '');
      menu.querySelectorAll('.ai-drop-opt').forEach(function (it) {
        it.classList.toggle('on', it.dataset.value === cur);
      });
    }
    function openMenu() {
      clearTimeout(closeTimer);
      closeAllAiDrops(inst);
      // 底部空间不够就向上弹
      host.classList.remove('up');
      var r = btn.getBoundingClientRect();
      if (r.bottom + menu.offsetHeight + 12 > window.innerHeight) host.classList.add('up');
      host.classList.add('open');
      open = true;
    }
    function close() {
      if (!open) return;
      host.classList.remove('open');
      open = false;
      closeTimer = setTimeout(function () { host.classList.remove('up'); }, 180);
    }
    function set(v) { cur = v; paint(); }
    Object.defineProperty(host, 'value', {
      get: function () { return cur; },
      set: function (v) { set(v); },
    });
    paint();
    aiDrops.push(inst);
    return inst;
  }
  function closeAllAiDrops(except) {
    aiDrops.forEach(function (d) { if (d !== except) d.close(); });
  }
  // 媒体列表/AI 模型列表会频繁重绘，宿主已断连的实例顺手从注册表摘掉，避免无限增长
  function pruneAiDrops() {
    for (var i = aiDrops.length - 1; i >= 0; i--) {
      if (!aiDrops[i].host.isConnected) aiDrops.splice(i, 1);
    }
  }
  document.addEventListener('pointerdown', function (e) {
    pruneAiDrops();
    aiDrops.forEach(function (d) { if (!d.host.contains(e.target)) d.close(); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { pruneAiDrops(); closeAllAiDrops(); }
  });

  makeAiDrop($('aiProtocol'), {
    fullWidth: true,
    value: 'openai',
    options: [
      { value: 'openai', label: 'Chat Completions（/chat/completions，OpenAI 兼容）' },
      { value: 'anthropic', label: 'Anthropic Messages（/messages）' },
    ],
  });
  makeAiDrop($('aiNewModelTag'), {
    className: 'ai-mr-tag',
    title: '模型类型标签（前台切换菜单里显示）',
    options: tagOptions(),
  });

  // ---------- 邮件服务配置 ----------
  var emailEnabledNow = false;
  makeAiDrop($('emailProviderDrop'), {
    fullWidth: true,
    value: 'resend',
    options: [
      { value: 'resend', label: 'Resend（免费 100 封/天，推荐）' },
      { value: 'brevo', label: 'Brevo（免费 300 封/天）' },
    ],
  });
  $('emailKeyEye').innerHTML = ICO.eye;
  var emailKeyShown = false;
  $('emailKeyEye').addEventListener('click', function () {
    emailKeyShown = !emailKeyShown;
    $('emailApiKey').type = emailKeyShown ? 'text' : 'password';
    $('emailKeyEye').innerHTML = emailKeyShown ? ICO.eyeOff : ICO.eye;
  });
  var emailAdminOnlyNow = false;
  function emailStateText(enabled) {
    $('emailStateText').textContent = enabled
      ? '已启用：' + (emailAdminOnlyNow ? '仅站长可用（找回密码/绑定/2FA 限站长邮箱）' : '前台注册需邮箱验证，找回密码/二次验证可用')
      : '未启用：前台不显示邮箱相关功能';
    $('emailToggleBtn').textContent = enabled ? '停用' : '启用';
  }
  function emailAdminOnlyText(on) {
    $('emailAdminOnlyText').textContent = on
      ? '已开启：普通用户不出现邮箱功能，只有站长邮箱可用（适合无域名只能发自己的场景）'
      : '关闭：所有用户可用邮箱功能';
    $('emailAdminOnlyBtn').textContent = on ? '关闭"仅站长使用"' : '开启"仅站长使用"';
  }
  function loadEmailSettings() {
    api('/api/admin/email').then(function (d) {
      if (!d.ok) { toast(d.error || '读取邮件配置失败', 'err'); return; }
      emailEnabledNow = !!d.enabled;
      emailAdminOnlyNow = !!d.adminOnly;
      $('emailProviderDrop').value = d.provider;
      $('emailFrom').value = d.from || '';
      $('emailApiKey').value = '';
      $('emailApiKey').placeholder = d.keySet ? '留空保持不变' : 're_…（Resend）/ xkeysib-…（Brevo）';
      $('emailKeyHint').textContent = d.keySet ? '已保存（尾 4 位 ' + d.keyTail + '）；输入框留空 = 不修改' : '未设置';
      $('emailOwnerInput').value = d.ownerEmail || '';
      emailAdminOnlyText(emailAdminOnlyNow);
      emailStateText(d.enabled);
    }).catch(function () { toast('网络错误', 'err'); });
  }
  function saveEmailConfig(opts, done) {
    var ownerEmail = $('emailOwnerInput').value.trim();
    api('/api/admin/email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: opts.enabled,
        // 站长邮箱清空 = 移除（此时"仅站长"强制关闭）
        admin_only: opts.admin_only && !!ownerEmail,
        provider: $('emailProviderDrop').value,
        from: $('emailFrom').value.trim(),
        owner_email: ownerEmail,
        api_key: $('emailApiKey').value.trim() || undefined, // 留空 = 保留原 Key
      })
    }).then(function (d) {
      if (d.ok) {
        emailEnabledNow = !!d.enabled;
        $('emailApiKey').value = '';
        loadEmailSettings();
        if (done) done(d);
      } else toast(d.error || '保存失败', 'err');
    }).catch(function () { toast('网络错误', 'err'); });
  }
  $('emailAdminOnlyBtn').addEventListener('click', function () {
    var next = !emailAdminOnlyNow;
    if (next && !$('emailOwnerInput').value.trim()) {
      toast('请先填写站长邮箱', 'err');
      return;
    }
    saveEmailConfig({ enabled: emailEnabledNow, admin_only: next }, function (d) {
      toast(d.adminOnly ? '已开启"仅站长使用"' : '已关闭，所有用户可用邮箱功能', 'ok');
    });
  });
  $('emailSaveBtn').addEventListener('click', function () {
    saveEmailConfig({ enabled: true, admin_only: emailAdminOnlyNow }, function (d) {
      toast(d.enabled ? '邮件配置已保存并启用' : '已保存；补全 API Key 和发件人后会自动启用', 'ok');
    });
  });
  $('emailToggleBtn').addEventListener('click', function () {
    saveEmailConfig({ enabled: !emailEnabledNow, admin_only: emailAdminOnlyNow }, function (d) {
      toast(d.enabled ? '邮件服务已启用' : '邮件服务已停用', 'ok');
    });
  });
  $('emailTestBtn').addEventListener('click', function () {
    var to = $('emailTestTo').value.trim();
    if (!to) { toast('请填写收件邮箱', 'err'); return; }
    toast('发送中…', '', true);
    api('/api/admin/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: to })
    }).then(function (d) {
      if (d.ok) toast('测试邮件已发送，注意查收（含垃圾箱）', 'ok');
      else toast(d.error || '发送失败', 'err');
    }).catch(function () { toast('网络错误', 'err'); });
  });

  // ---------- 自定义邮件：任意收件人 + 主题 + 纯文本正文 ----------
  $('emailCustomBtn').addEventListener('click', function () {
    var to = $('emailCustomTo').value.trim();
    var subject = $('emailCustomSubject').value.trim();
    var text = $('emailCustomText').value;
    if (!to) { toast('请填写收件邮箱', 'err'); return; }
    if (!subject && !text.trim()) { toast('请填写主题或正文', 'err'); return; }
    $('emailCustomBtn').disabled = true;
    $('emailCustomMsg').textContent = '发送中…';
    api('/api/admin/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: to, subject: subject, text: text })
    }).then(function (d) {
      if (d.ok) {
        $('emailCustomMsg').textContent = '已发送至 ' + to + '，注意查收（含垃圾箱）';
        toast('自定义邮件已发送', 'ok');
      } else {
        $('emailCustomMsg').textContent = d.error || '发送失败';
        toast(d.error || '发送失败', 'err');
      }
    }).catch(function () {
      $('emailCustomMsg').textContent = '网络错误';
      toast('网络错误', 'err');
    }).then(function () { $('emailCustomBtn').disabled = false; });
  });

  // ---------- 课表提醒定时任务（tick URL 管理 + 手动触发 + cron 访问留痕显示） ----------
  var schedTickKey = '';
  function renderTickLast(last, lastBad) {
    var el = $('schedTickLast');
    if ((!last || !last.t) && (!lastBad || !lastBad.t)) {
      el.textContent = '还没有任何访问记录：外部 cron 从未来敲过门（任务没建/没激活，或 URL 填错）';
      return;
    }
    var seg = '';
    if (last && last.t) {
      seg = '最近一次 tick 访问：' + last.t + '（北京时间）· 密钥正确';
      if (last.error) seg += ' · 执行出错：' + last.error;
      else seg += last.disabled ? ' · 邮件服务未启用' : ' · 发送 ' + (last.sent || 0) + ' 封'
        + (last.errors ? '，' + last.errors + ' 个失败' : '');
      seg += '（后台手动执行也计入）';
    }
    if (lastBad && lastBad.t) {
      if (seg) seg += '　|　';
      seg += '⚠ 另有密钥错误的访问：' + lastBad.t + '（有调用方在用过期 URL 敲门，把 cron 任务里的地址换成上面最新的）';
    }
    el.textContent = seg;
  }
  function loadSchedTick() {
    api('/api/admin/schedule').then(function (d) {
      if (!d.ok) return;
      schedTickKey = d.key || '';
      $('schedTickUrl').value = d.url || '';
      renderTickLast(d.last, d.lastBad);
    }).catch(function () {});
  }
  $('schedTickCopyBtn').addEventListener('click', function () {
    var url = $('schedTickUrl').value;
    if (!url) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { toast('已复制', 'ok'); });
    } else {
      $('schedTickUrl').select();
      document.execCommand('copy');
      toast('已复制', 'ok');
    }
  });
  $('schedTickRegenBtn').addEventListener('click', function () {
    api('/api/admin/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'regenerate' })
    }).then(function (d) {
      if (d.ok) {
        schedTickKey = d.key || '';
        $('schedTickUrl').value = d.url || '';
        $('schedTickMsg').textContent = '已重新生成，旧地址立即失效（记得更新 cron 配置）';
        toast('定时密钥已重新生成', 'ok');
      } else toast(d.error || '操作失败', 'err');
    }).catch(function () { toast('网络错误', 'err'); });
  });
  $('schedTickRunBtn').addEventListener('click', function () {
    $('schedTickMsg').textContent = '执行中…';
    api('/api/schedule/tick?key=' + encodeURIComponent(schedTickKey)).then(function (d) {
      if (d.ok) {
        if (d.disabled) {
          $('schedTickMsg').textContent = '邮件服务未启用，未发送任何提醒';
          return;
        }
        var parts = ['本次发送 ' + (d.sent || 0) + ' 封'];
        (d.users || []).forEach(function (u) {
          if (u.skip) { parts.push('账号跳过：' + u.skip + '（今日 ' + u.todayCount + ' 节）'); return; }
          var seg = '今日 ' + u.todayCount + ' 节';
          seg += u.dailyOn
            ? (u.dailyAlready ? ' · 早报今天已发过'
              : u.dailyDue ? ' · 早报本次已发'
              : ' · 早报未到点（设 ' + u.dailyTime + '）')
            : ' · 早报未开';
          if (u.remindCount) {
            seg += ' · 重点课 ' + u.remindCount + ' 门' + (u.inWindow ? '，' + u.inWindow + ' 门本次已提醒' : '，当前不在提醒窗口');
          }
          if (u.error) seg += ' · 出错：' + u.error;
          parts.push(u.email + '：' + seg);
        });
        if (d.errors && d.errors.length) parts.push(d.errors.length + ' 个发送失败');
        $('schedTickMsg').textContent = parts.join('　|　');
        loadSchedTick(); // 手动执行也留了痕，刷新"最近访问"显示
      } else $('schedTickMsg').textContent = d.error || '执行失败';
    }).catch(function () { $('schedTickMsg').textContent = '网络错误'; });
  });
  $('schedTestBtn').addEventListener('click', function () {
    var to = $('schedTestTo').value.trim();
    $('schedTestBtn').disabled = true;
    $('schedTestMsg').textContent = '发送中…';
    api('/api/admin/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test', email: to })
    }).then(function (d) {
      if (d.ok) {
        var dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        var info = (d.week ? '第 ' + d.week + ' 教学周' : '学期外') + ' · ' + (dayNames[d.dow - 1] || '') + ' · 今日 ' + d.courseCount + ' 节课';
        $('schedTestMsg').textContent = '已发 ' + d.sent.length + ' 封到 ' + d.email + '（' + info + '）' + (d.errors.length ? '，' + d.errors.length + ' 封失败' : '');
        toast('测试提醒已发送', 'ok');
      } else {
        $('schedTestMsg').textContent = d.error || '发送失败';
        toast(d.error || '发送失败', 'err');
      }
    }).catch(function () {
      $('schedTestMsg').textContent = '网络错误';
    }).then(function () { $('schedTestBtn').disabled = false; });
  });

  function tagSelect(value, onchange) {
    var host = document.createElement('span');
    makeAiDrop(host, {
      className: 'ai-mr-tag',
      title: '模型类型标签（前台切换菜单里显示）',
      value: value || '',
      options: tagOptions(),
      onChange: onchange,
    });
    return host;
  }

  function renderModelRows(p, models) {
    var wrap = $('aiModelRows');
    wrap.innerHTML = '';
    models.forEach(function (m) {
      var row = document.createElement('div');
      row.className = 'ai-model-row';
      var nm = document.createElement('span');
      nm.className = 'ai-mr-name';
      nm.textContent = m.id;
      row.appendChild(nm);
      row.appendChild(tagSelect(m.tag, function (val) {
        if (isNewMode()) { m.tag = val; return; } // 新增模式：models 就是 aiNewModels，直接改内存
        var np = currentProviderDraft();
        if (!np) return;
        np.models = np.models.map(function (x) { return x.id === m.id ? { id: x.id, tag: val } : x; });
        saveProviderDraft(np);
      }));
      var isDef = !!p && modelKeyOf(p.name, m.id) === aiDefaultKey;
      if (isDef) {
        var def = document.createElement('span');
        def.className = 'ai-mr-def';
        def.textContent = '默认';
        row.appendChild(def);
      }
      if (p) {
        var star = document.createElement('button');
        star.type = 'button';
        star.className = 'icon-mini star-def' + (isDef ? ' on' : '');
        star.title = isDef ? '当前默认模型' : '设为默认';
        star.innerHTML = isDef ? ICO.starOn : ICO.starOff;
        star.addEventListener('click', function () {
          api('/api/admin/ai', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'default', key: modelKeyOf(p.name, m.id) }),
          }).then(function (d) {
            if (d.ok) { aiDefaultKey = d.default; renderAiManager(); toast('默认模型已设为 ' + d.default, 'ok'); }
            else toast(d.error || '操作失败', 'err');
          }).catch(function () { toast('网络错误', 'err'); });
        });
        row.appendChild(star);
      }

      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'icon-mini';
      edit.title = '重命名模型';
      edit.innerHTML = PENCIL_SVG;
      edit.addEventListener('click', function () {
        ask({
          title: '重命名模型',
          msg: '模型 ' + m.id + ' 改名为：',
          input: true, value: m.id, max: 100, okText: '确定',
          cb: function (ok, val) {
            if (!ok || !val || !val.trim() || val.trim() === m.id) return;
            var id = val.trim();
            if (isNewMode()) {
              if (aiNewModels.some(function (x) { return x.id === id; })) { toast('模型已存在', 'err'); return; }
              m.id = id;
              renderModelRows(null, aiNewModels);
              return;
            }
            var np = currentProviderDraft();
            if (!np) return;
            np.models = np.models.map(function (x) { return x.id === m.id ? { id: id, tag: x.tag } : x; });
            saveProviderDraft(np);
          }
        });
      });
      row.appendChild(edit);

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'icon-mini danger-hover';
      del.title = '删除模型';
      del.innerHTML = TRASH_SVG;
      del.addEventListener('click', function () {
        ask({
          title: '删除模型',
          msg: (p ? '从「' + p.name + '」' : '') + '删除模型 ' + m.id + '？',
          okText: '删除', danger: true,
          cb: function (ok) {
            if (!ok) return;
            if (isNewMode()) {
              aiNewModels = aiNewModels.filter(function (x) { return x.id !== m.id; });
              renderModelRows(null, aiNewModels);
              return;
            }
            if (models.length <= 1) { toast('至少保留一个模型；不要这个供应商可用右上角删除', 'err'); return; }
            var np = currentProviderDraft();
            if (!np) return;
            np.models = np.models.filter(function (x) { return x.id !== m.id; });
            saveProviderDraft(np);
          }
        });
      });
      row.appendChild(del);

      wrap.appendChild(row);
    });
    if (!models.length) {
      var empty = document.createElement('p');
      empty.className = 'meta2';
      empty.textContent = '还没有模型，点下方"添加模型"。';
      wrap.appendChild(empty);
    }
  }

  // 从表单收集供应商草稿（models 用内存最新列表；api_key 留空 = 保留原 Key）
  function currentProviderDraft() {
    var models = isNewMode() ? aiNewModels.slice() : (selectedProvider() ? selectedProvider().models.slice() : []);
    return {
      name: isNewMode() ? $('aiProvNameInput').value.trim() : aiSelected,
      protocol: $('aiProtocol').value,
      base_url: $('aiBaseUrl').value.trim(),
      api_key: $('aiApiKey').value.trim(),
      system_prompt: $('aiPrompt').value,
      models: models,
    };
  }

  function saveProviderDraft(np, done) {
    api('/api/admin/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', provider: np }),
    }).then(function (d) {
      if (!d.ok) { toast(d.error || '保存失败', 'err'); if (done) done(d); return; }
      toast('已保存「' + d.name + '」，前台即刻生效', 'ok');
      aiSelected = d.name;
      loadAiSettings(true);
      if (done) done(d);
    }).catch(function () { toast('网络错误', 'err'); });
  }

  $('aiSaveBtn').addEventListener('click', function () {
    var np = currentProviderDraft();
    if (isNewMode() && !np.name) { toast('先填写供应商名称', 'err'); $('aiProvNameInput').focus(); return; }
    if (!np.models.length) { toast('至少添加一个模型', 'err'); return; }
    saveProviderDraft(np);
  });

  $('aiAddBtn').addEventListener('click', function () {
    aiSelected = '__new__';
    aiNewModels = [];
    renderAiManager();
    $('aiProvNameInput').focus();
  });

  $('aiRenameBtn').addEventListener('click', function () {
    ask({
      title: '重命名供应商',
      msg: '「' + aiSelected + '」改名为：',
      input: true, value: aiSelected, max: 30, okText: '确定',
      cb: function (ok, val) {
        if (!ok || !val || !val.trim() || val.trim() === aiSelected) return;
        api('/api/admin/ai', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'rename', from: aiSelected, to: val.trim() }),
        }).then(function (d) {
          if (d.ok) { aiSelected = d.name; loadAiSettings(true); toast('已重命名为「' + d.name + '」', 'ok'); }
          else toast(d.error || '操作失败', 'err');
        }).catch(function () { toast('网络错误', 'err'); });
      }
    });
  });

  $('aiToggleProvBtn').addEventListener('click', function () {
    var p = selectedProvider();
    if (!p) return;
    api('/api/admin/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', name: p.name, enabled: !p.enabled }),
    }).then(function (d) {
      if (d.ok) { loadAiSettings(true); toast(d.enabled ? '「' + d.name + '」已启用' : '「' + d.name + '」已停用，前台切换列表里不再显示', 'ok'); }
      else toast(d.error || '操作失败', 'err');
    }).catch(function () { toast('网络错误', 'err'); });
  });

  $('aiDelProvBtn').addEventListener('click', function () {
    ask({
      title: '删除供应商',
      msg: '删除「' + aiSelected + '」及其全部模型？前台将不再显示该供应商下的选项。此操作不可恢复。',
      okText: '删除', danger: true,
      cb: function (ok) {
        if (!ok) return;
        api('/api/admin/ai', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', name: aiSelected }),
        }).then(function (d) {
          if (d.ok) { aiSelected = null; loadAiSettings(false); toast('已删除', 'ok'); }
          else toast(d.error || '操作失败', 'err');
        }).catch(function () { toast('网络错误', 'err'); });
      }
    });
  });

  $('aiToggleBtn').addEventListener('click', function () {
    api('/api/admin/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'global', enabled: !currentAiEnabled }),
    }).then(function (d) {
      if (!d.ok) { toast(d.error || '操作失败', 'err'); return; }
      toast(d.enabled ? 'AI 已启用' : 'AI 已停用，前台恢复"接入中"文案', 'ok');
      loadAiSettings(true);
    }).catch(function () { toast('网络错误', 'err'); });
  });

  $('aiTestBtn').addEventListener('click', function () {
    setTestResult('测试中…（先保存再用当前配置实测）');
    var np = currentProviderDraft();
    if (isNewMode() && !np.name) { setTestResult('✕ 先填写供应商名称', false); return; }
    if (!np.models.length) { setTestResult('✕ 至少添加一个模型', false); return; }
    saveProviderDraft(np, function (d) {
      if (!d.ok) { setTestResult('保存失败：' + (d.error || '未知错误'), false); return; }
      api('/api/admin/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: d.name + '/' + np.models[0].id }),
      }).then(function (t) {
        setTestResult(t.ok
          ? '✓ 「' + t.name + '」连接成功（' + t.ms + 'ms）：' + t.reply
          : '✕ ' + (t.error || '未知错误'), t.ok);
      }).catch(function () { setTestResult('✕ 网络错误', false); });
    });
  });

  // ---------- API Key 显示/隐藏（图标同步切换） ----------
  function setEye(on) {
    $('aiApiKey').type = on ? 'text' : 'password';
    $('aiKeyEye').innerHTML = on ? ICO.eyeOff : ICO.eye;
  }
  $('aiKeyEye').addEventListener('click', function () {
    setEye($('aiApiKey').type === 'password');
  });

  // ---------- 模型的增删改 + 模型列表自动获取（服务端代理 /models，key 不出后端） ----------
  var aiAddOvTimer = null;
  function aiAddModelSetShow(on) {
    var w = $('aiAddModelWrap');
    clearTimeout(aiAddOvTimer);
    if (on) {
      w.classList.add('show');
      // 等展开动画播完再放开 overflow，让内里的下拉弹层能弹出容器
      aiAddOvTimer = setTimeout(function () { w.classList.add('open-ov'); }, 240);
    } else {
      w.classList.remove('open-ov');
      w.classList.remove('show');
    }
  }
  $('aiAddModelBtn').addEventListener('click', function () {
    aiAddModelSetShow(true);
    $('aiNewModelInput').value = '';
    $('aiNewModelTag').value = '';
    $('aiNewModelInput').focus();
  });
  $('aiAddModelCancel').addEventListener('click', function () {
    aiAddModelSetShow(false);
  });
  function commitAddModel() {
    var val = $('aiNewModelInput').value.trim();
    if (!val) { $('aiNewModelInput').focus(); return; }
    var models = isNewMode() ? aiNewModels : (selectedProvider() ? selectedProvider().models : []);
    if (!models) return;
    if (models.some(function (x) { return x.id === val; })) { toast('模型已存在', 'err'); return; }
    var entry = { id: val, tag: $('aiNewModelTag').value || '' };
    if (isNewMode()) {
      // 新增模式：只重绘模型列表，绝不能重绘整个表单（会把已填的名称/URL/Key 清空）
      aiNewModels.push(entry);
      renderModelRows(null, aiNewModels);
      aiAddModelSetShow(false);
    } else {
      var np = currentProviderDraft();
      np.models.push(entry);
      saveProviderDraft(np);
    }
  }
  $('aiAddModelOk').addEventListener('click', commitAddModel);
  $('aiNewModelInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); commitAddModel(); }
  });

  function fetchAiModels(manual) {
    var key = $('aiApiKey').value.trim();
    // 指纹里 Key 只取尾 4 位：不完整输入不打到服务端
    var sig = aiSelected + '|' + $('aiProtocol').value + '|' + $('aiBaseUrl').value.trim() + '|' + (key ? key.length + ':' + key.slice(-4) : (isNewMode() ? 'none' : 'profile'));
    if (!manual && sig === aiModelsSig) return;
    aiModelsSig = sig;
    $('aiModelHint').textContent = '获取模型列表中…';
    api('/api/admin/ai/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: isNewMode() ? null : aiSelected, // 编辑已有供应商时，Key 留空可回落到已保存的 Key
        protocol: $('aiProtocol').value,
        base_url: $('aiBaseUrl').value.trim(),
        api_key: key,
      }),
    }).then(function (d) {
      if (d.ok) {
        var dl = $('aiModelList');
        dl.innerHTML = '';
        d.models.forEach(function (m) {
          var o = document.createElement('option');
          o.value = m;
          dl.appendChild(o);
        });
        $('aiModelHint').textContent = '已获取 ' + d.models.length + ' 个模型，添加时输入框可下拉选择';
      } else {
        $('aiModelHint').textContent = '获取失败：' + (d.error || '未知错误');
      }
    }).catch(function () {
      $('aiModelHint').textContent = '获取失败：网络错误，可手动输入模型名';
    });
  }

  $('aiFetchModelsBtn').addEventListener('click', function () { fetchAiModels(true); });
  $('aiBaseUrl').addEventListener('change', function () { fetchAiModels(false); });
  $('aiApiKey').addEventListener('change', function () { fetchAiModels(false); });
  $('aiProtocol').addEventListener('change', function () { fetchAiModels(false); });

  // ---------- 随笔管理（前台 /notes/ 时间线；D1 notes 表，静态 notes/notes.json 仅作前台兜底） ----------
  // 坑 18：本文件是模板字符串，正则反斜杠一律双写；反引号与「美元符+花括号」插值序列都不许出现
  var notesCache = [];
  var noteEditingId = 0;

  function noteFormMsg(text, err) { showMsg($('noteFormMsg'), text || '', err ? 'err' : ''); }

  function noteResetForm() {
    noteEditingId = 0;
    $('noteFormTitle').textContent = '新增随笔（日期自动取当天）';
    $('noteMood').value = '';
    $('noteText').value = '';
    $('noteCancelEditBtn').hidden = true;
  }

  function loadNotes() {
    var listEl = $('notesList');
    listEl.innerHTML = skListHtml(4);
    api('/api/admin/notes').then(function (d) {
      if (!d.ok) { listEl.innerHTML = emptyStateHtml(ICO.x, '加载失败', d.error || '请稍后重试。'); return; }
      notesCache = d.list || [];
      renderNotesList();
    }).catch(function () {
      listEl.innerHTML = emptyStateHtml(ICO.x, '加载失败', '网络异常，请稍后重试。');
    });
  }

  function renderNotesList() {
    var listEl = $('notesList');
    listEl.textContent = '';
    $('notesSumm').textContent = notesCache.length ? ('共 ' + notesCache.length + ' 条 · 按日期倒序') : '';
    if (!notesCache.length) {
      listEl.innerHTML = emptyStateHtml(ICO.pencil, '还没有随笔', '在上方新增，或点「从静态清单导入」把 notes/notes.json 的存量搬进数据库。');
      return;
    }
    var frag = document.createDocumentFragment();
    notesCache.forEach(function (n) {
      var row = document.createElement('div');
      row.className = 'list-row';
      row.style.alignItems = 'flex-start';
      var dEl = document.createElement('span');
      dEl.className = 'chip-tag mono';
      dEl.textContent = n.date;
      row.appendChild(dEl);
      var mid = document.createElement('div');
      mid.className = 'lr-main';
      mid.style.gap = '0';
      var t = String(n.text || '').replace(/\\s+/g, ' ');
      if (t.length > 60) t = t.slice(0, 60) + '…';
      var txt = document.createElement('span');
      txt.className = 'lr-title';
      txt.style.fontWeight = '400';
      txt.style.whiteSpace = 'normal';
      txt.style.lineHeight = '1.55';
      txt.textContent = t;
      mid.appendChild(txt);
      if (n.mood) {
        var moodEl = document.createElement('span');
        moodEl.className = 'lr-sub';
        moodEl.textContent = '天气/时段：' + n.mood;
        mid.appendChild(moodEl);
      }
      mid.title = String(n.text || '');
      row.appendChild(mid);
      var actions = document.createElement('span');
      actions.className = 'row-actions';
      var editBtn = document.createElement('button');
      editBtn.className = 'icon-mini';
      editBtn.title = '编辑';
      editBtn.innerHTML = ICO.pencil;
      editBtn.addEventListener('click', function () {
        noteEditingId = n.id;
        $('noteFormTitle').textContent = '编辑随笔 · ' + n.date + '（日期不变）';
        $('noteMood').value = n.mood || '';
        $('noteText').value = n.text || '';
        $('noteCancelEditBtn').hidden = false;
        noteFormMsg('正在编辑这条随笔，改完点「保存」。');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      actions.appendChild(editBtn);
      var delBtn = document.createElement('button');
      delBtn.className = 'icon-mini';
      delBtn.title = '删除';
      delBtn.innerHTML = ICO.trash;
      delBtn.addEventListener('click', function () {
        ask({
          title: '删除这条随笔？',
          msg: n.date + (n.mood ? '（' + n.mood + '）' : '') + '：' + String(n.text || '').slice(0, 50),
          okText: '删除',
          danger: true,
          cb: function (okVal) {
            if (!okVal) return;
            api('/api/admin/notes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'delete', id: n.id })
            }).then(function (r) {
              if (!r.ok) { toast(r.error || '删除失败', 'err'); return; }
              toast('已删除');
              if (noteEditingId === n.id) noteResetForm();
              loadNotes();
            });
          }
        });
      });
      actions.appendChild(delBtn);
      row.appendChild(actions);
      frag.appendChild(row);
    });
    listEl.appendChild(frag);
  }

  $('noteSaveBtn').addEventListener('click', function () {
    var mood = $('noteMood').value.trim();
    var text = $('noteText').value.trim();
    if (!text) { noteFormMsg('正文不能为空', true); return; }
    if (text.length > 2000) { noteFormMsg('正文最长 2000 字（当前 ' + text.length + ' 字）', true); return; }
    var wasEdit = !!noteEditingId;
    // 日期前端不管：create 服务端自动取北京时间当天，update 保持原日期
    var payload = { action: wasEdit ? 'update' : 'create', id: noteEditingId, mood: mood, text: text };
    var btn = this;
    btn.disabled = true;
    api('/api/admin/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      btn.disabled = false;
      if (!r.ok) { noteFormMsg(r.error || '保存失败', true); return; }
      noteResetForm();
      noteFormMsg('');
      toast(wasEdit ? '已保存修改' : '已新增随笔');
      loadNotes();
    }).catch(function () {
      btn.disabled = false;
      noteFormMsg('保存失败（网络异常）', true);
    });
  });
  $('noteCancelEditBtn').addEventListener('click', function () { noteResetForm(); noteFormMsg(''); });

  // 从静态清单导入：读部署在前台的 notes/notes.json 存量数据，批量搬进 D1（date+text 全同的跳过）
  $('notesImportBtn').addEventListener('click', function () {
    var btn = this;
    btn.disabled = true;
    fetch('/notes/notes.json', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)); })
      .then(function (list) {
        if (!Array.isArray(list) || !list.length) { btn.disabled = false; toast('静态清单为空或不存在', 'err'); return; }
        ask({
          title: '导入静态清单？',
          msg: 'notes/notes.json 里共 ' + list.length + ' 条，将批量导入数据库（日期与正文完全相同的自动跳过）。导入后前台以数据库为准。',
          okText: '导入',
          cb: function (okVal) {
            if (!okVal) { btn.disabled = false; return; }
            api('/api/admin/notes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'import', list: list })
            }).then(function (r) {
              btn.disabled = false;
              if (!r.ok) { toast(r.error || '导入失败', 'err'); return; }
              toast('导入完成：新增 ' + r.imported + ' 条' + (r.skipped ? ('，跳过 ' + r.skipped + ' 条') : ''));
              loadNotes();
            }).catch(function () { btn.disabled = false; toast('导入失败（网络异常）', 'err'); });
          }
        });
      })
      .catch(function () { btn.disabled = false; toast('读取 notes/notes.json 失败', 'err'); });
  });

  // ---------- 短链（后台建 /s/{code}，302 跳转 + 计次；码/url 均来自用户输入，渲染一律 textContent/DOM API 防注入） ----------
  var linksCache = [];

  function loadLinks() {
    var listEl = $('linksList');
    listEl.innerHTML = skListHtml(4);
    api('/api/admin/links').then(function (d) {
      if (!d.ok) { listEl.innerHTML = emptyStateHtml(ICO.x, '加载失败', d.error || '请稍后重试。'); return; }
      linksCache = d.list || [];
      renderLinksList();
    }).catch(function () {
      listEl.innerHTML = emptyStateHtml(ICO.x, '加载失败', '网络异常，请稍后重试。');
    });
  }

  // 点行首短码复制完整短链（协议+域名现场拼，本地预览/线上都拿到可用地址）
  function copyShortLink(code) {
    var full = location.origin + '/s/' + code;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(full).then(function () { toast('已复制', 'ok'); });
    } else {
      var tmp = document.createElement('input');
      tmp.value = full;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
      toast('已复制', 'ok');
    }
  }

  function renderLinksList() {
    var listEl = $('linksList');
    listEl.textContent = '';
    $('linksSumm').textContent = linksCache.length ? ('共 ' + linksCache.length + ' 条 · 按创建时间倒序 · 点短码复制') : '';
    if (!linksCache.length) {
      listEl.innerHTML = emptyStateHtml(ICO.box, '还没有短链', '在上方填目标链接创建，短码留空则自动生成 6 位。');
      return;
    }
    var frag = document.createDocumentFragment();
    linksCache.forEach(function (it) {
      var row = document.createElement('div');
      row.className = 'list-row';
      var codeEl = document.createElement('button');
      codeEl.className = 'chip-tag mono';
      codeEl.title = '点击复制完整短链（创建于 ' + fmtDate(it.created_at) + '）';
      codeEl.textContent = '/s/' + it.code;
      codeEl.addEventListener('click', function () { copyShortLink(it.code); });
      row.appendChild(codeEl);
      var mid = document.createElement('span');
      mid.className = 'lr-grow';
      mid.style.textAlign = 'left';
      mid.style.fontSize = '13px';
      mid.style.color = 'var(--fg)';
      mid.textContent = it.url || '';
      mid.title = it.url || '';
      row.appendChild(mid);
      var cEl = document.createElement('span');
      cEl.className = 'lr-side' + (it.clicks > 0 ? ' good' : '');
      cEl.textContent = (it.clicks || 0) + ' 次';
      row.appendChild(cEl);
      var actions = document.createElement('span');
      actions.className = 'row-actions';
      var delBtn = document.createElement('button');
      delBtn.className = 'icon-mini danger-hover';
      delBtn.title = '删除';
      delBtn.innerHTML = ICO.trash;
      delBtn.addEventListener('click', function () {
        ask({
          title: '删除这个短链？',
          msg: '/s/' + it.code + ' → ' + String(it.url || '').slice(0, 60),
          okText: '删除',
          danger: true,
          cb: function (okVal) {
            if (!okVal) return;
            api('/api/admin/links', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: it.code })
            }).then(function (r) {
              if (!r.ok) { toast(r.error || '删除失败', 'err'); return; }
              toast('已删除');
              loadLinks();
            });
          }
        });
      });
      actions.appendChild(delBtn);
      row.appendChild(actions);
      frag.appendChild(row);
    });
    listEl.appendChild(frag);
  }

  $('linkCreateBtn').addEventListener('click', function () {
    var code = $('linkCode').value.trim();
    var url = $('linkUrl').value.trim();
    if (!url) { toast('请填写目标链接（http(s):// 开头）', 'err'); return; }
    if (code && !/^[A-Za-z0-9_-]{2,32}$/.test(code)) { toast('短码限 2~32 位字母、数字、下划线或连字符', 'err'); return; }
    var btn = this;
    btn.disabled = true;
    api('/api/admin/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, url: url })
    }).then(function (r) {
      btn.disabled = false;
      if (!r.ok) { toast(r.error || '创建失败', 'err'); return; }
      $('linkCode').value = '';
      $('linkUrl').value = '';
      toast('已创建 /s/' + (r.code || code), 'ok');
      loadLinks();
    }).catch(function () { btn.disabled = false; toast('创建失败（网络异常）', 'err'); });
  });

  // ---------- 顶部胶囊 + 抽屉导航（两套按钮同走 switchPage，active 同步打在两份上） ----------
  var navBtns = document.querySelectorAll('#sideNav button, #drawerNav button');
  // ---------- 我的（管理员资料 + 头像；头像 KV 键存 site_settings 'admin_avatar'） ----------
  function applyAdminAvatar(key) {
    var has = !!key;
    var url = has ? '/media/' + key : '';
    var brandImg = $('brandAvatarImg'), meImg = $('meAvatarImg');
    $('brandMono').style.display = has ? 'none' : '';
    $('meAvatarMono').style.display = has ? 'none' : '';
    if (has) { brandImg.src = url; meImg.src = url; }
    brandImg.hidden = !has;
    meImg.hidden = !has;
    $('meAvatarRemoveBtn').hidden = !has;
  }
  // ---------- 管理员邮箱（绑定/解绑；重置后台密码用） ----------
  var meAdminEmail = null;
  function meEmailMsg(text, err) {
    var el = $('meEmailMsg');
    el.textContent = text || '';
    el.className = 'meta2' + (err ? ' ai-test-err' : '');
  }
  function renderMeEmail() {
    var card = $('meEmailCard');
    if (!meAdminEmail) {
      $('meEmailBoundRow').hidden = true;
      $('meEmailFormRow').hidden = false;
    } else {
      $('meEmailBoundRow').hidden = false;
      $('meEmailFormRow').hidden = true;
      $('meEmailText').textContent = '已绑定 ' + meAdminEmail + '（可用于重置后台密码）';
    }
  }
  var meEmailCountdown = null;
  var meEmailSentTo = ''; // 发送成功后暂存邮箱：验证时输入框若被清空/改动，仍用发码的那个地址
  function startMeEmailCountdown() {
    var left = 60;
    var btn = $('meEmailSendBtn');
    btn.disabled = true;
    btn.textContent = left + 's';
    clearInterval(meEmailCountdown);
    meEmailCountdown = setInterval(function () {
      left--;
      if (left <= 0) {
        clearInterval(meEmailCountdown);
        btn.disabled = false;
        btn.textContent = '发送验证码';
      } else btn.textContent = left + 's';
    }, 1000);
  }
  $('meEmailSendBtn').addEventListener('click', function () {
    var email = $('meEmailInput').value.trim();
    if (!email) { meEmailMsg('请先填写邮箱地址', true); return; }
    meEmailMsg('验证码发送中…');
    api('/api/admin/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'email-send', email: email })
    }).then(function (d) {
      if (d.ok) {
        meEmailSentTo = email;
        meEmailMsg('验证码已发送，注意查收（含垃圾箱）');
        startMeEmailCountdown();
      }
      else meEmailMsg(d.error || '发送失败', true);
    }).catch(function () { meEmailMsg('网络错误', true); });
  });
  $('meEmailVerifyBtn').addEventListener('click', function () {
    // 优先取输入框的邮箱；为空则回落到发码时暂存的地址
    var email = $('meEmailInput').value.trim() || meEmailSentTo;
    var code = $('meEmailCode').value.trim();
    if (!email) { meEmailMsg('请填写邮箱地址', true); return; }
    if (!/^\\d{6}$/.test(code)) { meEmailMsg('请填写 6 位验证码', true); return; }
    if (meEmailSentTo && email !== meEmailSentTo) {
      meEmailMsg('邮箱与发送验证码的地址不一致，请改回 ' + meEmailSentTo + ' 或重新发送', true);
      return;
    }
    api('/api/admin/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'email-verify', email: email, code: code })
    }).then(function (d) {
      if (d.ok) { meAdminEmail = d.email || email; renderMeEmail(); meEmailMsg('邮箱绑定成功'); }
      else meEmailMsg(d.error || '绑定失败', true);
    }).catch(function () { meEmailMsg('网络错误', true); });
  });
  $('meEmailRemoveBtn').addEventListener('click', function () {
    ask({
      title: '解绑邮箱',
      msg: '解绑后将无法通过邮箱重置后台密码，确定？',
      okText: '解绑', danger: true,
      cb: function (okVal) {
        if (!okVal) return;
        api('/api/admin/me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'email-remove' })
        }).then(function (d) {
          if (d.ok) { meAdminEmail = null; renderMeEmail(); meEmailMsg(''); toast('邮箱已解绑', 'ok'); }
          else toast(d.error || '操作失败', 'err');
        }).catch(function () { toast('网络错误', 'err'); });
      },
    });
  });

  function loadMe() {
    api('/api/admin/me').then(function (d) {
      if (!d.ok) return;
      $('meName').textContent = d.username || '管理员';
      $('meMeta').textContent = d.created_at ? '管理员账号 · ' + fmtDate(d.created_at) + ' 创建' : '管理员账号';
      applyAdminAvatar(d.avatar);
      // 邮箱卡：邮件服务启用才显示
      $('meEmailCard').hidden = !d.emailEnabled;
      meAdminEmail = d.email || null;
      renderMeEmail();
      renderSec(d);
    }).catch(function () {});
  }

  // ---- 安全卡：登录设备 / 最近登录 / 改密 / 2FA 开关 ----
  function fmtShortTime(s) {
    // created_at 是 UTC 'YYYY-MM-DD HH:MM:SS'，转本地展示（只取到分钟）
    var d = new Date(String(s || '').replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return String(s || '');
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function renderSec(d) {
    // 2FA 开关：未启邮件服务 / 未绑邮箱时禁用
    var two = $('me2faOn');
    two.checked = !!d.twoFa;
    two.disabled = !d.emailEnabled || !d.email;
    $('me2faMsg').textContent = !d.emailEnabled
      ? '需先在「邮件」页启用邮件服务'
      : !d.email
        ? '需先在上方绑定管理员邮箱'
        : '开启后，后台与前台入口的管理员登录都需输入邮箱验证码。';
    // 登录设备列表
    var sess = $('meSessions');
    sess.textContent = '';
    (d.sessions || []).forEach(function (s) {
      var row = document.createElement('div');
      row.className = 'list-row';
      var name = document.createElement('span');
      name.className = 'chip-tag' + (s.current ? ' ok' : '');
      name.textContent = s.current ? '本设备' : '其他设备';
      row.appendChild(name);
      var mid = document.createElement('span');
      mid.className = 'lr-grow';
      mid.style.textAlign = 'left';
      mid.style.fontSize = '13px';
      mid.style.color = 'var(--fg)';
      mid.textContent = s.ua || '未知设备';
      mid.title = s.ua || '';
      row.appendChild(mid);
      var meta = document.createElement('span');
      meta.className = 'lr-side';
      meta.textContent = (s.ip || 'IP 未知') + ' · ' + fmtShortTime(s.created_at);
      row.appendChild(meta);
      sess.appendChild(row);
    });
    if (!(d.sessions || []).length) {
      sess.innerHTML = emptyStateHtml(ICO.clock, '暂无有效会话', '当前登录会话生效后这里会列出全部设备。');
    }
    // 最近登录列表
    var logs = $('meLogins');
    logs.textContent = '';
    (d.logins || []).forEach(function (l) {
      var row = document.createElement('div');
      row.className = 'list-row';
      var mark = document.createElement('span');
      mark.className = 'chip-tag mono ' + (l.ok ? 'ok' : 'bad');
      mark.textContent = l.ok ? '成功' : '失败';
      row.appendChild(mark);
      var mid = document.createElement('span');
      mid.className = 'lr-grow';
      mid.style.textAlign = 'left';
      mid.style.fontSize = '13px';
      mid.style.color = 'var(--fg)';
      mid.textContent = (l.note ? l.note + ' · ' : '') + (l.ip || '');
      mid.title = l.ua || '';
      row.appendChild(mid);
      var meta = document.createElement('span');
      meta.className = 'lr-side';
      meta.textContent = fmtShortTime(l.created_at);
      row.appendChild(meta);
      logs.appendChild(row);
    });
    if (!(d.logins || []).length) {
      logs.innerHTML = emptyStateHtml(ICO.clock, '暂无记录', '本次上线后开始积累登录记录。');
    }
  }

  function mePwdMsg(text, err) { showMsg($('mePwdMsg'), text, err ? 'err' : 'ok'); }

  $('mePwdBtn').addEventListener('click', function () {
    var btn = this;
    var oldP = $('mePwdOld').value;
    var newP = $('mePwdNew').value;
    if (!oldP) { mePwdMsg('请输入当前密码', true); return; }
    if (newP.length < 6) { mePwdMsg('新密码至少 6 位', true); return; }
    btn.disabled = true;
    api('/api/admin/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'password', oldPassword: oldP, newPassword: newP })
    }).then(function (d) {
      btn.disabled = false;
      if (d.ok) {
        $('mePwdOld').value = '';
        $('mePwdNew').value = '';
        mePwdMsg('密码已修改，其他设备已退出登录。');
        toast('密码已修改', 'ok');
        loadMe(); // 刷新设备列表（其他会话已被踢）
      } else mePwdMsg(d.error || '修改失败', true);
    }).catch(function () { btn.disabled = false; mePwdMsg('网络错误', true); });
  });

  $('me2faOn').addEventListener('change', function () {
    var box = this;
    var on = box.checked;
    box.disabled = true;
    api('/api/admin/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '2fa', enabled: on })
    }).then(function (d) {
      box.disabled = false;
      if (d.ok) {
        toast(on ? '二次验证已开启，下次登录需输入邮箱验证码' : '二次验证已关闭', 'ok');
        $('me2faMsg').textContent = on ? '已开启：后台与前台入口的管理员登录都需输入邮箱验证码。' : '已关闭。';
      } else {
        box.checked = !on;
        toast(d.error || '操作失败', 'err');
      }
    }).catch(function () { box.disabled = false; box.checked = !on; toast('网络错误', 'err'); });
  });

  $('meRevokeBtn').addEventListener('click', function () {
    ask({
      title: '退出其他设备',
      msg: '确定退出其他所有设备的登录？当前设备保持登录状态。',
      okText: '退出',
      danger: true,
      cb: function (okVal) {
        if (!okVal) return;
        api('/api/admin/me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sessions-revoke-others' })
        }).then(function (d) {
          if (d.ok) { toast('已退出 ' + (d.revoked || 0) + ' 个其他会话', 'ok'); loadMe(); }
          else toast(d.error || '操作失败', 'err');
        }).catch(function () { toast('网络错误', 'err'); });
      }
    });
  });
  $('brandMark').addEventListener('click', function () { switchPage('me'); });
  $('meAvatarUploadBtn').addEventListener('click', function () { $('meAvatarInput').click(); });
  $('meAvatarInput').addEventListener('change', function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast('头像图片不能超过 2MB', 'err'); return; }
    var btn = $('meAvatarUploadBtn');
    btn.disabled = true;
    var fd = new FormData();
    fd.append('file', f);
    fetch('/api/admin/me', { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
      .then(function (d) {
        btn.disabled = false;
        if (d.ok) { applyAdminAvatar(d.avatar); toast('头像已更新', 'ok'); }
        else toast(d.error || '上传失败', 'err');
      })
      .catch(function () { btn.disabled = false; toast('网络错误', 'err'); });
  });
  $('meAvatarRemoveBtn').addEventListener('click', function () {
    ask({
      title: '移除头像',
      msg: '确定移除管理员头像？侧边栏左上角会恢复显示字母徽标。',
      okText: '移除',
      danger: true,
      cb: function (okVal) {
        if (!okVal) return;
        api('/api/admin/me', { method: 'DELETE' }).then(function (d) {
          if (d.ok) { applyAdminAvatar(null); toast('头像已移除', 'ok'); }
          else toast(d.error || '操作失败', 'err');
        }).catch(function () { toast('网络错误', 'err'); });
      },
    });
  });

  // 侧栏滑动指示器：把胶囊对齐到当前 active 项（参考站「导航胶囊指示器」竖排移植）
  function switchPage(type) {
    currentType = type;
    navBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-type') === type); });
    var isOverview = type === 'overview';
    var isUsers = type === 'users';
    var isAppear = type === 'appearance';
    var isAi = type === 'ai';
    var isEmail = type === 'email';
    var isMe = type === 'me';
    var isStatus = type === 'status';
    var isNotes = type === 'notes';
    var isLinks = type === 'links';
    $('overviewPanel').hidden = !isOverview;
    $('mediaPanel').hidden = isOverview || isUsers || isAppear || isAi || isEmail || isMe || isStatus || isNotes || isLinks;
    $('notesPanel').hidden = !isNotes;
    $('linksPanel').hidden = !isLinks;
    $('userPanel').hidden = !isUsers;
    $('appearancePanel').hidden = !isAppear;
    $('aiPanel').hidden = !isAi;
    $('emailPanel').hidden = !isEmail;
    $('mePanel').hidden = !isMe;
    $('statusPanel').hidden = !isStatus;
    // 列表对所有媒体类型常显（列表/工具/存储条都在 image-shell 里，隐藏它会连列表一起藏掉）；
    // 只收起左侧相册侧栏
    $('imageShell').hidden = false;
    var albumSideEl = document.querySelector('.album-side');
    if (albumSideEl) albumSideEl.hidden = type !== 'image';
    document.body.classList.remove('nav-open'); // 窄屏选完即收起菜单
    if (isOverview) {
      loadAiUsage(); // 每次切回概览刷新 AI 用量
      loadMailUsage(); // 邮件统计同刷
    }
    if (isAppear) {
      loadAppearance();
    }
    if (isAi) {
      loadAiSettings();
    }
    if (isEmail) {
      loadEmailSettings();
      loadSchedTick();
    }
    if (isMe) {
      loadMe();
    }
    if (isStatus) {
      renderStatus();
      loadBackupCard(); // 数据备份卡每次进页同刷
      loadRumCard(); // 前端错误卡同刷：新上报随时进来看最新
    }
    if (isNotes) {
      noteResetForm(); // 每次进页表单归零（日期预填今天），防上次的编辑草稿串场
      loadNotes();
    }
    if (isLinks) {
      loadLinks(); // 每次进页都拉最新：点击计数在 /s/ 侧实时累加，缓存旧列表会显示过期次数
    }
    if (isUsers) {
      $('userSearch').value = ''; // 换进来重置搜索
      var usb = $('userSearch').closest('.search-box');
      if (usb) usb.classList.remove('has-value');
      loadUsers();
    }
    if (!isOverview && !isUsers && !isAppear && !isAi && !isEmail && !isMe && !isStatus && !isNotes && !isLinks) {
      $('fileInput').accept = TYPE_EXT[type];
      $('titleInput').value = '';
      selected = {}; // 换标签页清空勾选和搜索
      $('searchInput').value = '';
      var msb = $('searchInput').closest('.search-box');
      if (msb) msb.classList.remove('has-value');
      $('selAll').checked = false;
      $('batchDelBtn').hidden = true;
      if (type !== 'image') albumFilter = '';
      // 媒体页页面标题区：三档子页共用一个面板，标题/说明随当前子页切换
      var MEDIA_DESCS = {
        music: '站内曲库：前台迷你播放条与悬浮播放器的数据源。',
        video: '首页右侧视频轮播的数据源，可设顺序 / 独播 / 随机。',
        image: '相册分组与前台背景选择器的图源。'
      };
      $('mediaPhTitle').textContent = TYPE_NAMES[type] + '管理';
      $('mediaPhDesc').textContent = MEDIA_DESCS[type] || '';
      renderList();
    }
    // 首页视频播放模式栏：仅视频页显示，进入时加载设置
    var vbar = $('videoModeBar');
    if (vbar) vbar.hidden = type !== 'video';
    if (type === 'video') loadVideoMode();
    // 功能界面切换动效：给新显示的面板挂一次进入动画（与上一次不是同一面板时才播）
    var targetPanel = isOverview ? $('overviewPanel') :
      isUsers ? $('userPanel') :
      isAppear ? $('appearancePanel') :
      isAi ? $('aiPanel') :
      isEmail ? $('emailPanel') :
      isMe ? $('mePanel') :
      isStatus ? $('statusPanel') :
      isNotes ? $('notesPanel') :
      isLinks ? $('linksPanel') : $('mediaPanel');
    if (targetPanel && targetPanel !== lastEnterPanel) {
      lastEnterPanel = targetPanel;
      targetPanel.classList.remove('panel-enter');
      // 卡片级联入场：给面板里的卡片/统计卡/分组卡/标题区按顺序写 --stagger-i（封顶 8，后面的同时入场）
      var stag = targetPanel.querySelectorAll('.card, .stat, .section-card, .page-head');
      for (var si = 0; si < stag.length; si++) stag[si].style.setProperty('--stagger-i', String(Math.min(si, 8)));
      void targetPanel.offsetWidth; // 强制 reflow 以重播动画
      targetPanel.classList.add('panel-enter');
    }
  }
  navBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchPage(btn.getAttribute('data-type'));
    });
  });
  // 窄屏汉堡菜单：点遮罩收起
  $('menuBtn').addEventListener('click', function () {
    document.body.classList.toggle('nav-open');
  });
  document.addEventListener('click', function (e) {
    if (!document.body.classList.contains('nav-open')) return;
    if (e.target.closest('aside.sidenav') || e.target.closest('#menuBtn')) return;
    document.body.classList.remove('nav-open');
  });
  // 顶栏滚动投影（复刻前台 .scrolled：滚过 10px 加深胶囊投影）
  window.addEventListener('scroll', function () {
    var h = document.getElementById('adminHeader');
    if (h) h.classList.toggle('scrolled', (window.scrollY || 0) > 10);
  }, { passive: true });

  // ---------- 顶栏悬停预览卡（复刻前台 fx-link-preview：导航项悬停出栏目实时缩略卡） ----------
  // 后台是单页应用、十个栏目共用 /admin 一个地址，视觉区放一个常驻 iframe（加载 /admin 自身，
  // 1280 宽 scale(0.25) 缩进 320×112），悬停不同栏目时 postMessage 让 iframe 里的 admin 实例
  // 切到对应面板——消息监听在 enterMain 附近（adminPreviewPanel）。仅悬停设备启用。
  (function () {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var PANEL_INFO = {
      overview: { name: '概览', desc: '站点统计 / 访问趋势 / AI 与邮件用量' },
      music: { name: '音乐', desc: '曲库管理 · 歌词 / 封面 / 试听' },
      video: { name: '视频', desc: '视频管理 · 首页播放模式 · 行上悬停可预览' },
      image: { name: '图片', desc: '图片管理 · 相册分组 / 拖拽归类' },
      users: { name: '用户', desc: '注册用户 · 禁用 / 解封 / 删除' },
      appearance: { name: '外观', desc: '主题色 / 寄语 / 功能开关 / 播放器款式' },
      ai: { name: 'AI', desc: 'AI 供应商 / 模型 / 全局开关' },
      email: { name: '邮件', desc: '邮件服务 / 验证码 / 课表提醒定时任务' },
      notes: { name: '随笔', desc: '随笔管理 · 新增 / 编辑 / 删除 / 静态清单导入' },
      links: { name: '短链', desc: '外链缩短 · /s/码 302 跳转并计次 · 自定义短码' },
      me: { name: '我的', desc: '管理员资料 / 头像 / 安全中心' },
      status: { name: '状态', desc: '健康状态 / 数据库与 KV' }
    };
    var root = document.createElement('div');
    root.className = 'fx-admin-preview';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<article class="ap-card">' +
        '<div class="ap-visual"><div class="ap-frame-host"></div><div class="ap-loading">预览加载中…</div></div>' +
        '<div class="ap-meta">' +
          '<span class="ap-domain">管理后台</span>' +
          '<strong class="ap-title"></strong>' +
          '<span class="ap-desc"></span>' +
        '</div>' +
      '</article>';
    document.body.appendChild(root);
    var card = root.querySelector('.ap-card');
    var host = root.querySelector('.ap-frame-host');
    var loading = root.querySelector('.ap-loading');
    var titleEl = root.querySelector('.ap-title');
    var descEl = root.querySelector('.ap-desc');
    var frame = null, pendingPanel = '';
    var showTimer = 0, rafId = 0, px = 0, py = 0, activeBtn = null;
    function applyPending() {
      if (!pendingPanel || !frame || !frame.contentWindow) return;
      try { frame.contentWindow.postMessage({ type: 'adminPreviewPanel', panel: pendingPanel }, location.origin); } catch (e) {}
    }
    function ensureFrame() {
      if (frame) { applyPending(); return; }
      frame = document.createElement('iframe');
      frame.src = '/admin';
      frame.tabIndex = -1;
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('title', '栏目预览');
      // load 只代表文档加载完，不代表 iframe 里的后台脚本已就绪；就绪信号靠 iframe
      // enterMain 里的 adminPreviewReady 消息，收到前显示「预览加载中…」遮罩。
      // load 后先试发 + 定时补发（面板未变时重复 postMessage 在 iframe 侧是无害 no-op）
      frame.addEventListener('load', function () {
        frame.classList.add('is-ready');
        loading.hidden = true;
        applyPending();
        setTimeout(applyPending, 600);
        setTimeout(applyPending, 1800);
      });
      host.appendChild(frame);
    }
    // iframe 里的 admin 完成启动（enterMain）后会报 adminPreviewReady，收到即补发当前栏目
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin) return;
      var d = e.data || {};
      if (d.type === 'adminPreviewReady') {
        loading.hidden = true;
        if (frame) frame.classList.add('is-ready');
        applyPending();
      }
    });
    function position() {
      rafId = 0;
      // 用 offsetWidth/Height 量布局尺寸（前台坑：入场动画期间 getBoundingClientRect 会量到缩小的尺寸）
      var w = card.offsetWidth, h = card.offsetHeight, gap = 12;
      var x = Math.max(gap, Math.min(px + 18, window.innerWidth - w - gap));
      var y = Math.max(gap, Math.min(py + 18, window.innerHeight - h - gap));
      card.style.left = x + 'px';
      card.style.top = y + 'px';
    }
    function show(btn) {
      var type = btn.getAttribute('data-type');
      var info = PANEL_INFO[type];
      if (!info) return;
      titleEl.textContent = info.name;
      descEl.textContent = info.desc;
      ensureFrame();
      pendingPanel = type;
      applyPending();
      root.classList.add('is-visible');
      if (!rafId) rafId = window.requestAnimationFrame(position);
    }
    function hide() {
      window.clearTimeout(showTimer);
      showTimer = 0; activeBtn = null; pendingPanel = '';
      root.classList.remove('is-visible');
    }
    document.addEventListener('pointerover', function (e) {
      var btn = e.target.closest ? e.target.closest('#sideNav button') : null;
      if (!btn || btn === activeBtn) return;
      window.clearTimeout(showTimer);
      activeBtn = btn;
      px = e.clientX; py = e.clientY;
      showTimer = window.setTimeout(function () {
        showTimer = 0;
        if (activeBtn === btn) show(btn);
      }, 150);
    });
    document.addEventListener('pointerout', function (e) {
      var btn = e.target.closest ? e.target.closest('#sideNav button') : null;
      if (!btn) return;
      var to = e.relatedTarget;
      if (to instanceof Element && to.closest && to.closest('#sideNav button') === btn) return;
      hide();
    });
    document.addEventListener('pointercancel', hide);
    document.addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (root.classList.contains('is-visible') && !rafId) rafId = window.requestAnimationFrame(position);
    });
    window.addEventListener('scroll', hide, { passive: true });
  })();

  // ---------- 视频行悬停预览（悬浮小卡内静音循环播放；仅悬停设备） ----------
  // 视频行在 renderList 里挂了 _vkey(/media/地址)/_vtitle，这里委托 pointerover 弹卡；
  // 行内 ▶ 预览弹窗行为不变，悬停卡只是免点击的快速预览
  (function () {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var card = document.createElement('div');
    card.className = 'video-hover-preview';
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML = '<video muted loop playsinline preload="auto"></video><div class="vhp-title"></div>';
    document.body.appendChild(card);
    var video = card.querySelector('video');
    var titleEl = card.querySelector('.vhp-title');
    var showTimer = 0, rafId = 0, px = 0, py = 0, activeLi = null;
    function position() {
      rafId = 0;
      var w = card.offsetWidth, h = card.offsetHeight, gap = 12;
      var x = Math.max(gap, Math.min(px + 18, window.innerWidth - w - gap));
      var y = Math.max(gap, Math.min(py + 18, window.innerHeight - h - gap));
      card.style.left = x + 'px';
      card.style.top = y + 'px';
    }
    function show(li) {
      titleEl.textContent = li._vtitle || '';
      video.src = li._vkey;
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
      card.classList.add('is-visible');
      if (!rafId) rafId = window.requestAnimationFrame(position);
    }
    function hide() {
      window.clearTimeout(showTimer);
      showTimer = 0; activeLi = null;
      card.classList.remove('is-visible');
      video.pause();
      video.removeAttribute('src'); // 卸载媒体，停止下载与播放
      video.load();
    }
    document.addEventListener('pointerover', function (e) {
      var li = e.target.closest ? e.target.closest('#list li') : null;
      if (!li || !li._vkey || li === activeLi) return;
      window.clearTimeout(showTimer);
      activeLi = li;
      px = e.clientX; py = e.clientY;
      showTimer = window.setTimeout(function () {
        showTimer = 0;
        if (activeLi === li) show(li);
      }, 150);
    });
    document.addEventListener('pointerout', function (e) {
      var li = e.target.closest ? e.target.closest('#list li') : null;
      if (!li || !li._vkey) return;
      var to = e.relatedTarget;
      if (to instanceof Element && to.closest && to.closest('#list li') === li) return;
      hide();
    });
    document.addEventListener('pointercancel', hide);
    document.addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (!card.classList.contains('is-visible')) return;
      // 行被重渲染删掉（切页/搜索）时鼠标一动就自动收起
      var li = e.target && e.target.closest ? e.target.closest('#list li') : null;
      if (!li || !li._vkey) { hide(); return; }
      if (!rafId) rafId = window.requestAnimationFrame(position);
    });
    window.addEventListener('scroll', hide, { passive: true });
  })();
  $('fileInput').accept = TYPE_EXT.music;
  $('searchInput').addEventListener('input', renderList);
  $('selAll').addEventListener('change', function () {
    var checked = this.checked;
    var q = ($('searchInput').value || '').trim().toLowerCase();
    (items[currentType] || []).forEach(function (it) {
      if (q && (it.title || '').toLowerCase().indexOf(q) === -1) return; // 只影响搜索结果里的
      if (checked) selected[it.id] = true; else delete selected[it.id];
    });
    renderList();
  });
  $('batchDelBtn').addEventListener('click', deleteSelected);

  // ---------- 相册侧栏事件 ----------
  $('albumSideNewBtn').addEventListener('click', function () {
    ask({
      title: '新建相册',
      input: true, placeholder: '相册名称（50 字以内）', max: 50,
      okText: '创建',
      cb: function (ok, val) {
        var name = (val || '').trim().slice(0, 50);
        if (!ok || !name) return;
        if (albumNames().indexOf(name) > -1) { toast('相册「' + name + '」已存在', 'err'); return; }
        api('/api/admin/albums', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', name: name })
        }).then(function (d) {
          if (d.ok) {
            albumFilter = name;
            loadList();
            toast('已创建「' + name + '」，把图片拖到相册名上即可归组', 'ok');
          } else toast(d.error || '创建失败', 'err');
        });
      }
    });
  });

  // 访问趋势：14/30 天切换
  document.querySelectorAll('.range-btn[data-range]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.range-btn[data-range]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      visitRange = Number(btn.getAttribute('data-range')) || 14;
      renderVisitChart();
    });
  });
  // 访问趋势：柱状 / 环形视图切换
  document.querySelectorAll('.range-btn[data-view]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.range-btn[data-view]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      visitView = btn.getAttribute('data-view');
      renderVisitChart();
    });
  });

  // 访问趋势交互：悬停柱/扇区/图例联动（抬起/径向外移、其余变淡、数值浮现）+ 点击弹出当日明细（事件委托，绑定一次）
  function openDayModal(day, count, pct, isMax, listStr) {
    var WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    $('previewTitle').textContent = '访问明细';
    var html = '<div style="line-height:2.1;font-size:14px">';
    if (listStr) {
      // 环形图「其他」聚合段：逐日列出包含的日期
      html += '<div style="margin-bottom:6px"><strong style="font-size:16px">' + day + '</strong>　共 <b>' + count + '</b> 次 · 占近 ' + visitRange + ' 天 ' + pct + '%</div>';
      listStr.split('|').forEach(function (s) {
        var p = s.split(':');
        var w = WD[new Date(p[0] + 'T00:00:00+08:00').getDay()];
        html += '<div style="display:flex;justify-content:space-between;gap:24px;border-top:1px solid var(--row-line)">' +
          '<span>' + p[0] + '（' + w + '）</span><b>' + p[1] + ' 次</b></div>';
      });
    } else {
      var wd = WD[new Date(day + 'T00:00:00+08:00').getDay()];
      html += '<div><strong style="font-size:16px">' + day + '</strong>（' + wd + '）</div>' +
        '<div>访问次数：<b>' + count + '</b> 次</div>' +
        '<div>占近 ' + visitRange + ' 天访问量：' + pct + '%</div>' +
        (isMax ? '<div style="color:var(--ok)">当日为近 ' + visitRange + ' 天访问峰值</div>' : '');
    }
    html += '</div>';
    $('previewContent').innerHTML = html;
    $('previewModal').hidden = false;
  }
  (function () {
    var chart = $('visitChart');
    function findSeg(e) { return e.target && e.target.closest ? e.target.closest('.donut-hit, .donut-seg, .bar-hit, .bar') : null; }
    function findLi(e) { return e.target && e.target.closest ? e.target.closest('.vlg-item') : null; }
    function setFocus(i) {
      var segs = chart.querySelectorAll('.donut-seg, .bar');
      for (var k = 0; k < segs.length; k++) {
        segs[k].classList.toggle('dim', i !== null && k !== i);
        segs[k].classList.toggle('hl', k === i);
      }
      var lis = chart.querySelectorAll('.vlg-item');
      for (var m = 0; m < lis.length; m++) lis[m].classList.toggle('hl', m === i);
    }
    chart.addEventListener('mouseover', function (e) {
      var seg = findSeg(e), li = findLi(e);
      setFocus(seg ? Number(seg.getAttribute('data-i')) : (li ? Number(li.getAttribute('data-i')) : null));
    });
    chart.addEventListener('mousemove', function (e) {
      var tip = chart.querySelector('.visit-tip');
      if (!tip) return;
      var seg = findSeg(e);
      if (!seg) { tip.classList.remove('show'); return; }
      var r = chart.getBoundingClientRect();
      tip.innerHTML = '<b>' + seg.getAttribute('data-day') + '</b>　' + Number(seg.getAttribute('data-count')) + ' 次 · ' +
        Number(seg.getAttribute('data-pct')) + '%<div style="margin-top:3px;color:var(--muted)">' +
        (seg.getAttribute('data-other') === '1' ? '点击查看包含的日期' : '点击查看当日明细') + '</div>';
      tip.classList.add('show');
      tip.style.left = (e.clientX - r.left + 12) + 'px';
      tip.style.top = (e.clientY - r.top - tip.offsetHeight - 10) + 'px';
    });
    chart.addEventListener('mouseleave', function () {
      setFocus(null);
      var tip = chart.querySelector('.visit-tip');
      if (tip) tip.classList.remove('show');
    });
    chart.addEventListener('click', function (e) {
      var seg = findSeg(e); if (!seg) return;
      openDayModal(seg.getAttribute('data-day'), Number(seg.getAttribute('data-count')),
        Number(seg.getAttribute('data-pct')), seg.getAttribute('data-max') === '1', seg.getAttribute('data-list'));
    });
  })();

  // 用户列表：搜索 + 排序切换
  $('userSearch').addEventListener('input', renderUsers);
  $('userSortBtn').addEventListener('click', function () {
    userSortDesc = !userSortDesc;
    this.textContent = userSortDesc ? '注册时间：新→旧' : '注册时间：旧→新';
    renderUsers();
  });

  // ---------- 静态媒体自动同步 ----------
  // 打开后台即自动对比三个清单（images/manifest.json、music/playlist.json、video/playlist.json），
  // 把静态文件夹里还没进后台的文件批量搬进 KV，音乐/视频/图片全部直接可见，无需任何手动导入。
  function syncStaticMedia() {
    var jobs = [
      { type: 'image', url: '/images/manifest.json', pick: function (m) { return m && m.files ? m.files : []; } },
      {
        type: 'music', url: '/music/playlist.json',
        pick: function (m) { return (m || []).map(function (n) { return { title: n, url: 'music/' + n }; }); }
      },
      {
        type: 'video', url: '/video/playlist.json',
        pick: function (m) { return (m || []).map(function (n) { return { title: n, url: 'video/' + n }; }); }
      }
    ];
    var pending = [];
    var done = 0;
    var synced = 0;
    var fail = false;
    jobs.forEach(function (job) {
      api(job.url).then(function (m) {
        var existing = {};
        (items[job.type] || []).forEach(function (it) { existing[it.title] = true; });
        job.pick(m).forEach(function (f) {
          if (f && f.title && !existing[f.title]) pending.push({ type: job.type, title: f.title, url: f.url });
        });
      }).catch(function () {}).then(function () {
        done++;
        if (done === jobs.length) runImport();
      });
    });

    function runImport() {
      if (!pending.length) {
        if (synced && !fail) toast('已同步 ' + synced + ' 个静态媒体', 'ok');
        return; // 没有缺的，静默结束
      }
      toast('正在同步静态媒体… 剩余 ' + pending.length + ' 个', '', true);
      var type = pending[0].type;
      var batch = [];
      while (batch.length < 12 && pending.length && pending[0].type === type) batch.push(pending.shift());
      api('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, files: batch })
      }).then(function (d) {
        if (!d.ok) { fail = true; toast(d.error || '同步失败', 'err'); pending = []; return; }
        synced += batch.length;
        loadList().then(runImport);
      }).catch(function () {
        fail = true;
        toast('网络错误，同步中断（重新打开后台会自动续传）', 'err');
      });
    }
  }

  // ---------- 外观设置（站点默认主题色 / 默认背景图） ----------

  // ---------- 上传：多选 + 拖拽（含文件夹），队列逐个传，同名/超大/格式不符自动过滤 ----------
  function extAllowed(f) {
    var name = (f.name || '').toLowerCase();
    var ok = false;
    TYPE_EXT[currentType].split(',').forEach(function (ext) {
      if (name.slice(-ext.length) === ext) ok = true;
    });
    return ok;
  }

  function uploadFiles(files) {
    var all = Array.prototype.slice.call(files || []);
    if (!all.length) return;
    var MAX_SIZE = 24 * 1024 * 1024;
    var existing = {};
    (items[currentType] || []).forEach(function (it) {
      var t = (it.title || '').toLowerCase();
      existing[t] = true;
      existing[t.replace(/\\.[^.]+$/, '')] = true; // 同步进来的标题可能带扩展名，两种都算同名
    });

    // .lrc 歌词文件不单独入库：与同 basename 的歌曲配对，作为歌词附件随上传一起提交
    var lrcFiles = [], mediaAll = [];
    all.forEach(function (f) {
      if (currentType === 'music' && /\\.lrc$/i.test(f.name || '')) lrcFiles.push(f);
      else mediaAll.push(f);
    });

    var queue = [], skipped = [], oversize = [], wrongType = 0;
    mediaAll.forEach(function (f) {
      if (!extAllowed(f)) { wrongType++; return; }
      if (f.size > MAX_SIZE) { oversize.push(f.name); return; }
      var base = (f.name || '').replace(/\\.[^.]+$/, '').toLowerCase();
      if (existing[base] || existing[(f.name || '').toLowerCase()]) { skipped.push(f.name); return; }
      queue.push(f);
    });

    // 歌词配对：只配本次队列里的同名歌曲（给已有歌曲补歌词用列表行的「歌词」按钮）
    var lrcUnmatched = [];
    lrcFiles.forEach(function (lf) {
      if (lf.size > 200 * 1024) { lrcUnmatched.push(lf.name + '（超 200KB）'); return; }
      var base = lf.name.replace(/\\.lrc$/i, '').toLowerCase();
      for (var q = 0; q < queue.length; q++) {
        if ((queue[q].name || '').replace(/\\.[^.]+$/, '').toLowerCase() === base) { queue[q]._lrc = lf; return; }
      }
      lrcUnmatched.push(lf.name);
    });

    if (!queue.length) {
      var m = '没有需要上传的文件';
      if (skipped.length) m += '（跳过同名 ' + skipped.length + ' 个）';
      if (oversize.length) m += '（' + oversize.length + ' 个超过 24MB）';
      if (wrongType) m += '（' + wrongType + ' 个格式不符）';
      if (lrcUnmatched.length) m += '；歌词 ' + lrcUnmatched.join('、') + ' 没有同名歌曲（可用歌曲行的「歌词」按钮补传）';
      toast(m, 'err');
      return;
    }

    var btn = $('uploadBtn');
    var i = 0, okCount = 0, failCount = 0;
    btn.disabled = true;
    $('progress').style.display = 'block';

    function next() {
      if (i >= queue.length) {
        btn.disabled = false;
        $('progress').style.display = 'none';
        $('progressBar').style.width = '0';
        $('queueInfo').textContent = '';
        $('fileInput').value = '';
        $('filePickInfo').classList.remove('show');
        $('titleInput').value = '';
        var msg = '上传完成 ' + okCount + ' 个';
        var withLrc = 0;
        queue.forEach(function (q) { if (q._lrc) withLrc++; });
        if (withLrc) msg += '，其中 ' + withLrc + ' 首带歌词';
        if (failCount) msg += '，失败 ' + failCount + ' 个';
        if (skipped.length) msg += '，跳过同名 ' + skipped.length + ' 个';
        if (oversize.length) msg += '，' + oversize.length + ' 个超过 24MB';
        if (wrongType) msg += '，' + wrongType + ' 个格式不符';
        if (lrcUnmatched.length) msg += '；歌词 ' + lrcUnmatched.join('、') + ' 未配对到歌曲（可用歌曲行的「歌词」按钮补传）';
        toast(msg, failCount ? 'err' : 'ok');
        loadList();
        return;
      }
      var f = queue[i++];
      $('queueInfo').textContent = '正在上传 ' + i + '/' + queue.length + '：' + f.name + '（' + fmtSize(f.size) + '）';
      var form = new FormData();
      form.append('type', currentType);
      if (queue.length === 1 && $('titleInput').value.trim()) form.append('title', $('titleInput').value.trim());
      // 图片页选中了具体相册时，新上传直接归入该相册
      if (currentType === 'image' && albumFilter && albumFilter !== '__none__') form.append('album', albumFilter);
      form.append('file', f);
      if (f._lrc) form.append('lrc', f._lrc); // 同名配对的歌词附件

      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/upload');
      xhr.withCredentials = true;
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          var filePct = e.loaded / e.total;
          var totalPct = ((i - 1) + filePct) / queue.length * 100;
          $('progressBar').style.width = totalPct.toFixed(1) + '%';
        }
      };
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            if (data.ok) okCount++; else failCount++;
          } catch (e) { failCount++; }
        } else if (xhr.status === 401) {
          show('login');
          return; // 会话失效，终止队列
        } else {
          failCount++;
        }
        next();
      };
      xhr.onerror = function () { failCount++; next(); };
      xhr.send(form);
    }
    next();
  }

  // 把拖拽进来的东西展开成文件列表（支持整个文件夹，递归读取）
  function filesFromDataTransfer(dt, cb) {
    var plain = [];
    var entries = [];
    if (dt.items && dt.items.length && dt.items[0].webkitGetAsEntry) {
      for (var i = 0; i < dt.items.length; i++) {
        if (dt.items[i].kind !== 'file') continue;
        var entry = dt.items[i].webkitGetAsEntry();
        if (entry) entries.push(entry);
        else { var f = dt.items[i].getAsFile(); if (f) plain.push(f); }
      }
    }
    if (!entries.length) { cb(Array.prototype.slice.call(dt.files || plain)); return; }

    var out = [], left = entries.length;
    function walk(entry) {
      if (entry.isFile) {
        entry.file(function (f) { out.push(f); settle(); }, settle);
      } else if (entry.isDirectory) {
        var reader = entry.createReader();
        (function readBatch() {
          reader.readEntries(function (batch) {
            if (!batch.length) { settle(); return; }
            batch.forEach(walk);
            readBatch(); // readEntries 每次最多返回 100 条，读到空为止
          }, settle);
        })();
      } else settle();
    }
    function settle() { if (--left === 0) cb(out.concat(plain)); }
    entries.forEach(walk);
  }

  $('uploadBtn').addEventListener('click', function () {
    var fileEl = $('fileInput');
    if (!fileEl.files || !fileEl.files.length) {
      toast('请先选择文件', 'err'); return;
    }
    uploadFiles(fileEl.files);
  });

  // 自定义"选择文件"按钮：触发原生 input（功能完全等价：多选/文件夹/accept 限制）
  $('filePickBtn').addEventListener('click', function () { $('fileInput').click(); });
  // 拖放区整块可点：点空白处等同「选择文件」（按钮/输入框上的点击直接返回，防重复弹文件框）
  $('uploadRow').addEventListener('click', function (e) {
    if (e.target.closest('button') || e.target.closest('input')) return;
    $('fileInput').click();
  });
  // 选中文件确认条：每个文件一枚胶囊，点 ✕ 单独移除（经 DataTransfer 重建 input.files，全部移完自动收起）
  function renderPickInfo() {
    var input = $('fileInput');
    var info = $('filePickInfo');
    var files = input.files;
    if (!files || !files.length) { info.classList.remove('show'); info.textContent = ''; return; }
    info.textContent = '';
    info.classList.add('show');
    var total = 0;
    for (var i = 0; i < files.length; i++) total += files[i].size || 0;
    var head = document.createElement('span');
    head.textContent = files.length + ' 个文件，共 ' + fmtSize(total) + '：';
    info.appendChild(head);
    for (var k = 0; k < files.length; k++) {
      (function (f, idx) {
        var chip = document.createElement('span');
        chip.className = 'pick-chip';
        var nm = document.createElement('span');
        nm.className = 'pc-name';
        nm.textContent = f.name + '（' + fmtSize(f.size) + '）';
        nm.title = f.name;
        chip.appendChild(nm);
        var x = document.createElement('button');
        x.type = 'button';
        x.className = 'pick-x';
        x.title = '移除 ' + f.name;
        x.setAttribute('aria-label', '移除 ' + f.name);
        x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
        x.addEventListener('click', function () {
          var dt = new DataTransfer();
          var list = input.files;
          for (var m = 0; m < list.length; m++) { if (m !== idx) dt.items.add(list[m]); }
          input.files = dt.files;
          renderPickInfo();
        });
        chip.appendChild(x);
        info.appendChild(chip);
      })(files[k], k);
    }
  }
  $('fileInput').addEventListener('change', renderPickInfo);

  // 拖拽上传：绑在整个媒体面板上；内部拖拽排序（dragFrom 有值）不抢
  var mediaPanel = $('mediaPanel');
  var uploadRow = $('uploadRow');
  mediaPanel.addEventListener('dragover', function (e) {
    e.preventDefault();
    if (!dragFrom) uploadRow.classList.add('dragover');
  });
  mediaPanel.addEventListener('dragleave', function (e) {
    if (!mediaPanel.contains(e.relatedTarget)) uploadRow.classList.remove('dragover');
  });
  mediaPanel.addEventListener('drop', function (e) {
    uploadRow.classList.remove('dragover');
    if (dragFrom) return; // 列表内部排序
    e.preventDefault();
    filesFromDataTransfer(e.dataTransfer, uploadFiles);
  });

  loadStatus();
})();
</script>
</body>
</html>`;

export async function onRequestGet() {
  return html(PAGE);
}
