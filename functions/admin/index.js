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
  :root, [data-theme="light"] {
    --bg: #f5f5f7; --card: #ffffff; --fg: #1d1d1f; --bg-fg: #ffffff;
    --muted: #86868b; --border: #d2d2d7; --chip: #ececf0; --chip-hover: #e0e0e5;
    --input-bg: #ffffff; --hover: #f0f0f2; --row-line: #ececee;
    --shadow: 0 1px 3px rgba(0,0,0,.07), 0 12px 32px rgba(0,0,0,.05);
    --ok: #16a34a; --warn: #d97706; --danger: #dc2626;
  }
  [data-theme="dark"] {
    --bg: #111113; --card: #1c1c1e; --fg: #f5f5f7; --bg-fg: #111113;
    --muted: #98989d; --border: #3a3a3c; --chip: #2c2c2e; --chip-hover: #3a3a3c;
    --input-bg: #2a2a2c; --hover: #2c2c2e; --row-line: #2c2c2e;
    --shadow: 0 1px 3px rgba(0,0,0,.5);
    --ok: #4ade80; --warn: #fbbf24; --danger: #f87171;
  }
  * { box-sizing: border-box; margin: 0; }
  body {
    min-height: 100vh;
    background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    transition: background .25s, color .25s;
  }
  /* ---------- 侧边栏 + 顶栏框架 ---------- */
  .shell { display: flex; min-height: 100vh; }
  aside.sidenav {
    width: 220px; flex: none;
    background: var(--card); border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    padding: 18px 12px;
    position: sticky; top: 0; height: 100vh;
    transition: width .2s;
    overflow: hidden;
  }
  /* 收起态：只剩图标列 */
  body.nav-collapsed aside.sidenav { width: 64px; }
  body.nav-collapsed .brand { padding-left: 4px; padding-right: 4px; gap: 0; }
  body.nav-collapsed nav.sidenav-links button { justify-content: center; padding: 10px 0; gap: 0; }
  body.nav-collapsed .sidenav-foot .icon-btn { justify-content: center; padding: 10px 0; gap: 0; }
  /* 文字标签用「宽度收成 0 + 淡出」而不是 display:none，展开时与侧边栏宽度过渡完全同步，不闪烁 */
  .brand-text, nav.sidenav-links button span, .sidenav-foot .icon-btn span {
    white-space: nowrap; overflow: hidden; max-width: 200px; opacity: 1;
    transition: max-width .22s ease, opacity .16s ease;
  }
  body.nav-collapsed .brand-text,
  body.nav-collapsed nav.sidenav-links button span,
  body.nav-collapsed .sidenav-foot .icon-btn span {
    max-width: 0; opacity: 0;
    transition: max-width .2s ease, opacity .12s ease;
  }
  #navCollapseBtn svg { transition: transform .2s; }
  body.nav-collapsed #navCollapseBtn svg { transform: rotate(180deg); }
  .brand { display: flex; align-items: center; gap: 10px; padding: 4px 10px 18px; position: relative; transition: padding .22s ease, gap .22s ease; }
  .brand .mark {
    width: 38px; height: 38px; border-radius: 50%;
    background: var(--fg); color: var(--bg);
    font-weight: 700; font-size: 14px; letter-spacing: .05em;
    display: flex; align-items: center; justify-content: center; flex: none;
    cursor: pointer; position: relative; overflow: hidden;
    transition: transform .15s, box-shadow .15s;
  }
  .brand .mark:hover { transform: scale(1.06); box-shadow: 0 0 0 3px color-mix(in srgb, var(--fg) 18%, transparent); }
  .brand .mark img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .brand h1 { font-size: 16px; font-weight: 700; line-height: 1.2; }
  .brand p { font-size: 11px; color: var(--muted); margin-top: 2px; }
  nav.sidenav-links { display: flex; flex-direction: column; gap: 4px; }
  nav.sidenav-links button {
    display: flex; align-items: center; gap: 10px;
    background: transparent; color: var(--fg);
    padding: 10px 12px; border-radius: 10px; font-size: 14px;
    text-align: left; border: none; cursor: pointer;
    transition: background .15s ease, padding .22s ease, gap .22s ease;
  }
  nav.sidenav-links button:hover { background: var(--hover); opacity: 1; }
  nav.sidenav-links button.active { background: var(--fg); color: var(--bg); font-weight: 600; }
  nav.sidenav-links button svg { width: 17px; height: 17px; flex: none; }
  .sidenav-foot { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--row-line); display: flex; flex-direction: column; gap: 4px; }
  .sidenav-foot .icon-btn { justify-content: flex-start; transition: background .15s ease, padding .22s ease, gap .22s ease; }
  .sidenav-foot .icon-btn:hover { opacity: 1; }
  .main-col { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  header.topbar {
    position: sticky; top: 0; z-index: 50;
    display: flex; align-items: center; gap: 12px;
    padding: 12px 28px;
    background: var(--card); border-bottom: 1px solid var(--border);
  }
  header.topbar h2 { font-size: 17px; font-weight: 700; flex: 1; }
  .menu-btn { display: none; padding: 8px 10px; }
  .menu-btn svg { width: 18px; height: 18px; display: block; }
  .topbar-btns { display: flex; gap: 8px; }
  .icon-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 10px; font-size: 13px;
  }
  .icon-btn svg { width: 15px; height: 15px; }
  main.content { padding: 24px 28px 48px; flex: 1; }
  .card {
    background: var(--card); border-radius: 18px; padding: 24px;
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
    margin-bottom: 20px;
  }
  .hint { color: var(--muted); font-size: 13px; line-height: 1.6; margin-bottom: 16px; }
  input[type=text], input[type=password] {
    width: 100%; padding: 10px 12px; margin: 6px 0 14px;
    border: 1px solid var(--border); border-radius: 10px; font-size: 15px;
    background: var(--input-bg); color: var(--fg);
  }
  input:focus { outline: 2px solid var(--fg); outline-offset: -1px; border-color: transparent; }
  textarea {
    width: 100%; padding: 10px 12px; margin: 6px 0 4px;
    border: 1px solid var(--border); border-radius: 10px; font-size: 14px;
    background: var(--input-bg); color: var(--fg);
    font-family: inherit; line-height: 1.6; resize: vertical; min-height: 90px;
  }
  button {
    padding: 9px 18px; border: none; border-radius: 10px; font-size: 14px;
    background: var(--fg); color: var(--bg); cursor: pointer;
    transition: opacity .15s, transform .1s, background .15s;
  }
  button:hover { opacity: .82; }
  button:active { transform: scale(.97); }
  button.ghost { background: var(--chip); color: var(--fg); }
  button.ghost:hover { background: var(--chip-hover); opacity: 1; }
  button.danger { background: var(--chip); color: var(--fg); font-weight: 700; border: 1px solid var(--border); }
  button.danger:hover { background: var(--chip-hover); opacity: 1; }
  button:disabled { opacity: .5; cursor: default; }
  .msg { min-height: 18px; font-size: 13px; margin-top: 10px; }
  .msg.err { color: var(--fg); font-weight: 700; }
  .msg.err::before { content: "✕ "; }
  .msg.ok { color: var(--muted); }
  .msg.ok::before { content: "✓ "; }
  .appear-label2 { font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: .05em; margin: 20px 0 10px; }
  .accent-row { display: flex; gap: 10px; }
  .accent-dot { width: 34px; height: 34px; border-radius: 50%; border: 3px solid transparent; padding: 0; }
  .accent-dot.active { border-color: var(--fg); }
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
  /* 功能界面切换动效：新面板淡入 + 轻微上移 */
  @keyframes pageFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .panel-enter { animation: pageFadeIn .22s ease; }
  @media (prefers-reduced-motion: reduce) { .panel-enter, #mailUsageBody, #mailLogBox { animation: none !important; } }
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
  .upload-row {
    display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
    padding: 14px; background: var(--hover); border-radius: 14px;
    border: 1.5px dashed var(--border);
  }
  .upload-row input[type=text] { flex: 1 1 160px; margin: 0; }
  /* 原生 file input 视觉隐藏（保留多选/文件夹/accept 能力），由自定义"选择文件"按钮触发 */
  #fileInput { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .file-pick-btn { flex: none; display: inline-flex; align-items: center; gap: 6px; }
  .file-pick-btn svg { display: block; }
  .file-pick-info {
    width: 100%; display: none; color: var(--muted); font-size: 12px; line-height: 1.5;
    margin-top: 2px; animation: fpiIn .18s ease;
  }
  .file-pick-info.show { display: block; }
  @keyframes fpiIn { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: none; } }
  .progress { height: 4px; background: var(--chip); border-radius: 2px; margin-top: 12px; overflow: hidden; display: none; }
  .progress i { display: block; height: 100%; width: 0; background: var(--fg); transition: width .2s; }
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
  .empty { color: var(--muted); font-size: 14px; text-align: center; padding: 34px 0; }
  /* 相册/列表切换淡入动效（搜索输入不触发，仅在整表刷新与切相册时重播） */
  @keyframes listSwap { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
  #list.list-swap { animation: listSwap .22s ease; }
  .upload-row.dragover { border-color: var(--fg); background: var(--chip); }
  /* 状态页：存储分区条 / 邮件额度 */
  .st-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; font-size: 13px; border-bottom: 1px solid var(--row-line); }
  .st-row:last-child { border-bottom: none; }
  .st-row .st-name { flex: none; width: 64px; color: var(--muted); }
  .st-row .st-bar { flex: 1; height: 8px; border-radius: 999px; background: var(--chip); overflow: hidden; }
  .st-row .st-bar i { display: block; height: 100%; background: var(--fg); border-radius: 999px; transition: width .3s ease; }
  .st-row .st-bar i.warn { background: var(--warn); }
  .st-row .st-bar i.danger { background: var(--danger); }
  .st-row .st-meta { flex: none; font-size: 12px; color: var(--muted); white-space: nowrap; }
  .mail-quota { display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
  .mq-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .upload-hint { color: var(--muted); font-size: 12px; margin-top: 8px; line-height: 1.5; }
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
  .vm-chip.active { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  .vm-single { color: var(--ok); font-size: 12px; }
  .row-actions button.vm-set { color: var(--warn); }
  .storage-line { margin-top: 16px; }
  .storage-line > span { font-size: 12px; color: var(--muted); }
  .storage-bar { height: 6px; background: var(--chip); border-radius: 3px; overflow: hidden; margin-top: 6px; }
  .storage-bar i { display: block; height: 100%; width: 0; background: var(--fg); transition: width .3s; }
  .list-tools { display: flex; gap: 10px; align-items: center; margin-top: 18px; flex-wrap: wrap; }
  .list-tools input[type=text] { flex: 1 1 180px; margin: 0; }
  .list-tools label { font-size: 13px; color: var(--muted); cursor: pointer; }
  input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--fg); cursor: pointer; flex: none; }
  ul.list li .sel { flex: none; }
  .modal { position: fixed; inset: 0; z-index: 999; display: flex; align-items: center; justify-content: center; }
  .modal-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.62); }
  .modal-body {
    position: relative; z-index: 1;
    background: var(--card); color: var(--fg);
    border-radius: 16px; padding: 16px;
    width: min(760px, 92vw); max-height: 88vh; overflow: auto;
  }
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
  .range-btn.active { background: var(--fg); color: var(--bg); }
  .range-btn svg { display: block; } /* 图标型视图切换按钮 */
  #visitChart svg { width: 100%; height: 170px; display: block; }
  #visitChart .gl { stroke: var(--border); stroke-width: 1; }
  #visitChart .gt { fill: var(--muted); font-size: 10px; font-family: inherit; }
  #visitChart .bar {
    fill: var(--fg); opacity: .82; cursor: pointer;
    transition: transform .2s cubic-bezier(.2,.7,.3,1.25), opacity .2s ease, filter .2s ease;
    transform-box: fill-box; transform-origin: center; /* 不设就绕 SVG 左上原点缩放，右侧的柱悬停会横向漂移 */
  }
  #visitChart .bar:hover { opacity: 1; transition: none; transform: translate(var(--dx, 0), var(--dy, -4px)) scale(1.02); } /* 悬停瞬时到位（进即弹），移开后用基础规则的 .2s 缓回 */
  #visitChart .bar.dim { opacity: .16; }
  #visitChart .bar.hl { filter: brightness(1.18); }
  /* 环形图视图：环在左、图例在右双列，窄卡片自动换成上下（donut-mode 类由 renderVisitChart 增删） */
  #visitChart { position: relative; } /* tooltip 定位基准 */
  #visitChart.donut-mode { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 22px; }
  #visitChart.donut-mode svg { width: 400px; max-width: 100%; flex: none; }
  #visitChart.donut-mode .visit-legend { flex: 1; min-width: 230px; flex-direction: column; align-items: flex-start; gap: 2px 14px; margin-top: 0; }
  #visitChart .donut-seg { transition: transform .2s cubic-bezier(.2,.7,.3,1.25), opacity .2s ease, filter .2s ease; cursor: pointer;
    transform-box: fill-box; transform-origin: center; /* 同柱状图：scale 必须绕扇区自身，绕 SVG 原点会整体朝右下歪移 */
  }
  #visitChart .donut-seg.donut-today { transform: translate(var(--tx), var(--ty)); } /* 今天的段默认外移 5px 作锚点；写在 :hover 前面让悬停优先 */
  #visitChart .donut-seg:hover { transition: none; transform: translate(var(--dx), var(--dy)) scale(1.06); } /* 进即弹、离缓回（同柱状图） */
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
  .geo-toggle.on .gt-track { background: var(--ok); border-color: var(--ok); }
  .geo-toggle .gt-thumb {
    position: absolute; top: 50%; left: 2px; width: 14px; height: 14px;
    border-radius: 50%; background: var(--card); box-shadow: var(--shadow);
    transform: translateY(-50%); transition: transform .18s cubic-bezier(.2,.7,.3,1.2);
  }
  .geo-toggle.on .gt-thumb { transform: translate(16px, -50%); }
  /* 最近访问明细 */
  #visitLogsBody .vl-row {
    display: flex; align-items: center; gap: 12px; padding: 7px 0;
    font-size: 13px; border-bottom: 1px solid var(--row-line);
  }
  #visitLogsBody .vl-row:last-child { border-bottom: none; }
  #visitLogsBody .vl-time { flex: none; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
  #visitLogsBody .vl-ip { flex: none; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 600; }
  #visitLogsBody .vl-geo { flex: none; color: var(--muted); font-size: 12px; min-width: 34px; }
  #visitLogsBody .vl-path {
    flex: none; max-width: 160px; color: var(--muted); font-size: 12px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  #visitLogsBody .vl-ua {
    flex: 1; min-width: 0; color: var(--muted); font-size: 12px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  /* 邮件统计：趋势 + 发送明细 */
  .mail-sec-title { font-size: 12px; color: var(--muted); margin: 14px 0 4px; }
  #mailTrend svg { width: 100%; height: 70px; display: block; }
  #mailTrend .mt-bar { fill: var(--fg); opacity: .78; }
  #mailTrend .mt-bar:hover { opacity: 1; }
  #mailTrend .mt-t { fill: var(--muted); font-size: 9px; font-family: inherit; }
  .el-filters { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 8px; }
  .el-chip {
    padding: 3px 11px; font-size: 12px; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--border); background: none; color: var(--muted);
    transition: background .15s, color .15s, border-color .15s;
  }
  .el-chip:hover { color: var(--fg); border-color: var(--muted); }
  .el-chip.active { background: var(--fg); color: var(--bg); border-color: var(--fg); }
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
  .album-menu button.danger { color: #e0342b; }
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
  .badge { font-size: 11px; padding: 2px 9px; border-radius: 99px; white-space: nowrap; border: 1px solid var(--border); }
  .badge.ok { color: var(--muted); }
  .badge.banned { background: var(--fg); color: var(--bg); border-color: var(--fg); font-weight: 700; }
  [hidden] { display: none !important; }
  /* 行内操作按钮组：桌面悬停/聚焦浮现，触屏设备常显 */
  .row-actions { display: flex; gap: 6px; margin-left: auto; flex: none; }
  @media (hover: hover) and (pointer: fine) {
    .row-actions { opacity: 0; pointer-events: none; transition: opacity .15s; }
    ul.list li:hover .row-actions, ul.list li:focus-within .row-actions { opacity: 1; pointer-events: auto; }
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
    transition: opacity .22s, transform .22s;
  }
  .toast.show { opacity: 1; transform: translate(-50%, 0); }
  .toast.err { font-weight: 700; }
  .toast.err::before { content: "✕ "; }
  .toast.ok::before { content: "✓ "; }
  /* 询问弹窗（替代原生 prompt/confirm） */
  .ask-modal-body { width: min(420px, 92vw); }
  .ask-msg { font-size: 14px; line-height: 1.65; margin-bottom: 16px; }
  .ask-btns { display: flex; justify-content: flex-end; gap: 8px; }
  #askOk.danger-ok { background: #d64545; color: #fff; }
  #askOk.danger-ok:hover { opacity: .88; }
  /* 登录/初始化/网络错误：独立居中卡，不套框架 */
  .gate-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .gate-wrap .card { width: min(420px, 100%); margin-bottom: 0; }
  /* 移动端适配 */
  @media (max-width: 900px) {
    aside.sidenav {
      position: fixed; left: 0; top: 0; z-index: 200;
      transform: translateX(-100%); transition: transform .22s;
      box-shadow: none; height: 100vh;
    }
    body.nav-open aside.sidenav { transform: translateX(0); box-shadow: 0 0 0 100vmax rgba(0,0,0,.45); }
    body.nav-open aside.sidenav .brand { pointer-events: auto; }
    .menu-btn { display: flex; align-items: center; }
    /* 窄屏抽屉永远显示完整侧边栏：覆盖桌面端收起态的图标模式 */
    body.nav-collapsed aside.sidenav { width: 220px; }
    body.nav-collapsed .brand { padding: 4px 10px 18px; gap: 10px; }
    body.nav-collapsed .brand-text { max-width: 200px; opacity: 1; }
    body.nav-collapsed nav.sidenav-links button { justify-content: flex-start; padding: 10px 12px; gap: 10px; }
    body.nav-collapsed nav.sidenav-links button span { max-width: 200px; opacity: 1; }
    body.nav-collapsed .sidenav-foot .icon-btn { justify-content: flex-start; padding: 8px 14px; gap: 6px; }
    body.nav-collapsed .sidenav-foot .icon-btn span { max-width: 200px; opacity: 1; }
    header.topbar { padding: 10px 16px; }
    main.content { padding: 16px 16px 40px; }
    .card { padding: 16px; border-radius: 14px; }
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
    <p class="hint">首次使用：创建超级管理员账号。这个账号只创建这一次，请记好用户名和密码。</p>
    <input type="text" id="setupUser" placeholder="用户名" autocomplete="username">
    <input type="password" id="setupPass" placeholder="密码（至少 6 位）" autocomplete="new-password">
    <input type="password" id="setupPass2" placeholder="再输入一遍密码" autocomplete="new-password">
    <button id="setupBtn">创建并进入后台</button>
    <div class="msg" id="setupMsg"></div>
  </div>

  <div class="card" id="loginCard" hidden>
    <p class="hint">请登录管理后台。</p>
    <input type="text" id="loginUser" placeholder="用户名" autocomplete="username">
    <input type="password" id="loginPass" placeholder="密码" autocomplete="current-password">
    <button id="loginBtn">登录</button>
    <!-- 忘记密码：管理员邮箱验证码重置（未绑邮箱/未启用邮件服务时隐藏，由前端拉 /api/settings 判断） -->
    <button id="adminForgotBtn" class="ghost" type="button" style="width:100%;margin-top:8px;display:none">忘记密码？</button>
    <div class="msg" id="loginMsg"></div>
  </div>

  <div class="card" id="adminResetCard" hidden>
    <p class="hint">通过绑定的管理员邮箱重置密码。</p>
    <input type="text" id="arEmail" placeholder="管理员邮箱" autocomplete="email">
    <div style="display:flex;gap:8px">
      <input type="text" id="arCode" inputmode="numeric" maxlength="6" placeholder="验证码" style="flex:1" autocomplete="one-time-code">
      <button id="arSendBtn" class="ghost" type="button">发送验证码</button>
    </div>
    <input type="password" id="arNewPass" placeholder="新密码（至少 6 位）" autocomplete="new-password">
    <button id="arSubmitBtn">重置密码</button>
    <button id="arBackBtn" class="ghost" type="button" style="width:100%;margin-top:8px">返回登录</button>
    <div class="msg" id="arMsg"></div>
  </div>

  <div class="card" id="neterrCard" hidden>
    <p class="hint">无法连接服务器。你的网络访问 Cloudflare 可能不稳定，请稍候点击重试（或检查代理/VPN）。</p>
    <button id="retryBtn">重试</button>
    <div class="msg" id="netMsg"></div>
  </div>
</div>

<div class="shell" id="appShell" hidden>
  <aside class="sidenav">
    <div class="brand">
      <div class="mark" id="brandMark" title="我的"><span id="brandMono">YH</span><img id="brandAvatarImg" hidden alt=""></div>
      <div class="brand-text">
        <h1>管理界面</h1>
      </div>
    </div>
    <nav class="sidenav-links" id="sideNav">
      <button data-type="overview" title="概览"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg><span>概览</span></button>
      <button data-type="music" title="音乐"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span>音乐</span></button>
      <button data-type="video" title="视频"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20M2 16h20M8 4v16M16 4v16"/></svg><span>视频</span></button>
      <button data-type="image" title="图片"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><span>图片</span></button>
      <button data-type="users" title="用户"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>用户</span></button>
      <button data-type="appearance" title="外观"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor" stroke="none"/></svg><span>外观</span></button>
      <button data-type="ai" title="AI 设置"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4"/><path d="M9 4h6"/><circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/><path d="M9 17h6"/></svg><span>AI</span></button>
      <button data-type="email" title="邮件"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg><span>邮件</span></button>
      <button data-type="me" title="我的"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>我的</span></button>
      <button data-type="status" title="状态"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20a8 8 0 1 1 8-8"/><path d="M12 12l3.5-3.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><path d="M20 12a8 8 0 0 0-8-8"/></svg><span>状态</span></button>
    </nav>
    <div class="sidenav-foot">
      <button id="themeBtn" class="ghost icon-btn" title="切换浅色/深色">
        <svg id="themeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg>
        <span id="themeLabel">深色</span>
      </button>
      <button id="logoutBtn" class="ghost icon-btn" title="退出">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
        <span>退出</span>
      </button>
      <button id="navCollapseBtn" class="ghost icon-btn" title="收起/展开侧边栏">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        <span id="navCollapseLabel">收起侧边栏</span>
      </button>
    </div>
  </aside>

  <div class="main-col">
    <header class="topbar">
      <button id="menuBtn" class="ghost menu-btn" title="菜单">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
      <h2 id="pageTitle">概览</h2>
    </header>

    <main class="content">
      <div id="overviewPanel">
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
        <div class="card" id="visitLogsCard">
          <div class="visit-head">
            <strong>最近访问</strong>
            <span class="meta2" id="visitLogsSumm"></span>
            <span class="spacer"></span>
            <button type="button" class="geo-toggle on" id="visitGeoToggle" role="switch" aria-checked="true" title="显示/隐藏 IP 归属地查询">
              <span class="gt-label">归属地</span>
              <span class="gt-track"><i class="gt-thumb"></i></span>
            </button>
          </div>
          <div id="visitLogsBody"><p class="hint" style="margin:0">加载中…</p></div>
        </div>
        <div class="card" id="aiUsageCard">
          <div class="visit-head">
            <strong>AI 用量</strong>
            <span class="meta2" id="aiUsageSumm"></span>
          </div>
          <div id="aiUsageBody"><p class="hint" style="margin:0">加载中…</p></div>
        </div>
        <div class="card" id="mailUsageCard">
          <div class="visit-head">
            <strong>邮件统计</strong>
            <span class="meta2" id="mailUsageSumm"></span>
          </div>
          <div id="mailUsageBody"><p class="hint" style="margin:0">加载中…</p></div>
        </div>
      </div>

      <div id="mediaPanel" hidden>
    <div class="upload-row" id="uploadRow">
      <input type="file" id="fileInput" multiple>
      <button type="button" class="ghost file-pick-btn" id="filePickBtn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg>
        选择文件
      </button>
      <input type="text" id="titleInput" placeholder="显示名称（可选，仅单个文件时生效）">
      <button id="uploadBtn">上传</button>
    </div>
    <p class="file-pick-info" id="filePickInfo"></p>
    <p class="upload-hint" id="uploadHint">支持一次选多个文件，也可以把文件或整个文件夹拖进来；与已有内容同名的自动跳过；单文件上限 24MB。</p>
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
          <input type="text" id="searchInput" placeholder="搜索文件名…">
          <button id="batchDelBtn" class="danger" hidden>删除所选</button>
        </div>
        <ul class="list" id="list"></ul>
        <div class="empty" id="empty" hidden>还没有内容，先上传一个文件吧。也可以拖动条目调整顺序。</div>
      </div>
    </div>
  </div>

  <div id="userPanel" hidden>
    <div class="list-tools">
      <input type="text" id="userSearch" placeholder="搜索用户名…">
      <button class="ghost" id="userSortBtn" title="切换排序">注册时间：新→旧</button>
    </div>
    <ul class="list" id="userList"></ul>
    <div class="empty" id="userEmpty" hidden>还没有用户注册。</div>
  </div>

  <div id="appearancePanel" hidden>
    <p class="hint">这里设置的是全站默认外观：访客自己在主页没改过时才会采用；改过的以访客本地选择为准。</p>
    <p class="appear-label2">默认主题色</p>
    <div class="accent-row" id="accentRow"></div>
    <p class="appear-label2">默认背景图</p>
    <div class="bgset-row">
      <img id="bgPreview" class="bg-preview" hidden alt="当前默认背景">
      <span id="bgNone" class="meta2">未设置（使用网站自带背景）</span>
      <input type="file" id="bgFileInput" accept=".jpg,.jpeg,.png,.gif,.webp,.avif,.bmp" hidden>
      <button id="bgUploadBtn2" class="ghost">上传背景图</button>
      <button id="bgClearBtn2" class="danger">清除</button>
    </div>
    <p class="appear-label2">默认背景模糊</p>
    <div class="bgset-row">
      <input type="range" id="bgBlurAdmin" min="0" max="30" value="0" style="max-width:220px">
      <span class="meta2" id="bgBlurAdminVal">未设置（访客不模糊）</span>
      <button id="bgBlurSaveBtn" class="ghost">保存模糊度</button>
    </div>
    <p class="appear-label2">主页寄语（保存多条后前台随机显示其一，全部删除则恢复每日一言）</p>
    <div id="quoteRows"></div>
    <div class="bgset-row" style="margin-top:8px">
      <button id="quoteAddBtn" class="ghost" type="button">添加一条</button>
      <button id="quoteSaveBtn" class="ghost" type="button">保存寄语</button>
    </div>
    <p class="appear-label2">备份</p>
    <div class="bgset-row">
      <button id="exportBtn" class="ghost">导出媒体清单备份（JSON）</button>
      <span class="meta2">含全部媒体条目与访问地址；KV 里的文件本体请自行下载保存。</span>
    </div>
  </div>

  <div id="aiPanel" hidden>
    <p class="appear-label2">模型供应商</p>
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
        <p class="ai-mgr-label">Base URL</p>
        <input type="text" id="aiBaseUrl" placeholder="https://api.deepseek.com（留空用所选格式的官方默认）">
        <p class="ai-mgr-label">API 格式</p>
        <span id="aiProtocol" class="ai-drop-full"></span>
        <p class="ai-mgr-label">API Key</p>
        <div class="ai-key-wrap">
          <input type="password" id="aiApiKey" autocomplete="new-password" placeholder="sk-…">
          <button id="aiKeyEye" class="icon-mini ai-key-eye" type="button" title="显示/隐藏"></button>
        </div>
        <p class="meta2" id="aiKeyHint" style="margin-top:6px">未设置</p>
        <p class="ai-mgr-label">系统提示词（AI 人设，可选，≤2000 字）</p>
        <textarea id="aiPrompt" rows="3" maxlength="2000" placeholder="例如：回答简洁友好，默认用中文。"></textarea>
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
    <p class="appear-label2" style="margin-top:18px">全局开关</p>
    <div class="bgset-row">
      <button id="aiToggleBtn" class="ghost">停用 AI</button>
      <span class="meta2" id="aiStateText">状态读取中…</span>
    </div>
  </div>

  <div id="emailPanel" hidden>
    <p class="appear-label2">邮件服务（用于注册邮箱验证 / 找回密码 / 登录二次验证）</p>
    <p class="ai-mgr-label">服务商（都走 HTTP API，Workers 原生支持）</p>
    <span id="emailProviderDrop" class="ai-drop-full"></span>
    <p class="ai-mgr-label">发件地址（需在服务商侧完成发件人验证）</p>
    <input type="text" id="emailFrom" placeholder="noreply@yourdomain.com" style="max-width:320px">
    <p class="ai-mgr-label">API Key</p>
    <div class="ai-key-wrap">
      <input type="password" id="emailApiKey" autocomplete="new-password" placeholder="re_…（Resend）/ xkeysib-…（Brevo）">
      <button id="emailKeyEye" class="icon-mini ai-key-eye" type="button" title="显示/隐藏"></button>
    </div>
    <p class="meta2" id="emailKeyHint" style="margin-top:6px">未设置</p>
    <p class="ai-mgr-label" style="margin-top:14px">站长邮箱（"仅站长使用"模式下唯一能收验证码的地址，填你注册 Resend 的邮箱；清空后点"保存配置"即移除，"仅站长使用"会自动关闭）</p>
    <input type="text" id="emailOwnerInput" placeholder="you@example.com" style="max-width:320px">
    <div class="bgset-row" style="margin-top:14px">
      <button id="emailAdminOnlyBtn" class="ghost" type="button">开启"仅站长使用"</button>
      <span class="meta2" id="emailAdminOnlyText">关闭：所有用户可用邮箱功能</span>
    </div>
    <div class="bgset-row" style="margin-top:18px">
      <button id="emailSaveBtn" type="button">保存配置</button>
      <button id="emailToggleBtn" class="ghost" type="button">停用</button>
      <span class="meta2" id="emailStateText">状态读取中…</span>
    </div>
    <p class="appear-label2" style="margin-top:22px">测试发送</p>
    <div class="bgset-row">
      <input type="text" id="emailTestTo" placeholder="收件邮箱" style="max-width:260px">
      <button id="emailTestBtn" class="ghost" type="button">发送测试邮件</button>
    </div>
    <p class="appear-label2" style="margin-top:22px">自定义邮件（给任意邮箱发任意内容）</p>
    <div class="bgset-row">
      <input type="text" id="emailCustomTo" placeholder="收件邮箱" style="max-width:260px">
      <input type="text" id="emailCustomSubject" placeholder="邮件主题" style="max-width:320px">
    </div>
    <div class="bgset-row" style="margin-top:8px;align-items:flex-start">
      <textarea id="emailCustomText" placeholder="邮件正文（纯文本，支持换行，≤5000 字）" rows="5" style="max-width:560px;width:100%;resize:vertical"></textarea>
    </div>
    <div class="bgset-row" style="margin-top:8px">
      <button id="emailCustomBtn" type="button">发送</button>
      <span class="meta2" id="emailCustomMsg"></span>
    </div>
    <p class="appear-label2" style="margin-top:26px">课表提醒定时任务（用户课表的每日早报 / 重点课课前提醒）</p>
    <p class="meta2">Pages Functions 不支持定时触发，需要外部 cron 每 5 分钟访问下面的 URL。推荐 cron-job.org（免费）：注册后新建任务，地址填下面的 URL，执行间隔选"每 5 分钟"。</p>
    <div class="bgset-row" style="margin-top:10px">
      <input type="text" id="schedTickUrl" readonly style="max-width:460px">
      <button id="schedTickCopyBtn" class="ghost" type="button">复制</button>
    </div>
    <p class="meta2" id="schedTickLast" style="margin-top:8px"></p>
    <div class="bgset-row" style="margin-top:8px">
      <button id="schedTickRegenBtn" class="ghost" type="button">重新生成密钥</button>
      <button id="schedTickRunBtn" class="ghost" type="button">立即执行一次</button>
      <span class="meta2" id="schedTickMsg"></span>
    </div>
    <p class="appear-label2" style="margin-top:18px">发送测试提醒</p>
    <div class="bgset-row" style="margin-top:8px">
      <input type="text" id="schedTestTo" placeholder="收件邮箱（留空=站长邮箱）" style="max-width:260px">
      <button id="schedTestBtn" class="ghost" type="button">发送测试提醒</button>
      <span class="meta2" id="schedTestMsg"></span>
    </div>
    <p class="meta2" style="margin-top:6px">按真实课表算出"今天该发什么"，立即发送早报 / 课前提醒样式的【测试】邮件（不用等真实到点，不影响防重发记录）。收件人须是绑定了已验证邮箱且启用过课表的账号；仅站长模式下只能发到站长邮箱。</p>
  </div>

  <div id="mePanel" hidden>
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
      <p class="appear-label2" style="margin-top:0">管理员邮箱（绑定后可用邮箱验证码重置后台密码）</p>
      <div class="bgset-row" id="meEmailBoundRow" hidden>
        <span class="meta2" id="meEmailText"></span>
        <button id="meEmailRemoveBtn" class="danger" type="button">解绑</button>
      </div>
      <div id="meEmailFormRow">
        <div class="bgset-row">
          <input type="text" id="meEmailInput" placeholder="you@example.com" style="max-width:280px">
          <button id="meEmailSendBtn" class="ghost" type="button">发送验证码</button>
        </div>
        <div class="bgset-row" style="margin-top:8px">
          <input type="text" id="meEmailCode" inputmode="numeric" maxlength="6" placeholder="6 位验证码" style="max-width:160px">
          <button id="meEmailVerifyBtn" type="button">验证并绑定</button>
        </div>
        <p class="meta2" id="meEmailMsg" style="margin:8px 0 0"></p>
      </div>
    </div>
  </div>
  <div id="statusPanel" hidden>
    <div class="card" id="stStorageCard" style="margin-top:16px">
      <div class="visit-head"><strong>存储空间</strong><span class="meta2" id="stStorageSumm"></span></div>
      <div id="stStorageBody"><p class="hint" style="margin:0">加载中…</p></div>
    </div>
    <div class="card" id="stMailCard" style="margin-top:16px">
      <div class="visit-head"><strong>邮件发送额度</strong><span class="meta2" id="stMailSumm"></span></div>
      <div id="stMailBody"><p class="hint" style="margin:0">加载中…</p></div>
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
    x: ico('<path d="M18 6 6 18M6 6l12 12"/>'),
  };

  // ---------- 黑白主题切换（浅色 / 深色，本地记住） ----------
  var SUN_SVG = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  var MOON_SVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var icon = $('themeIcon');
    if (icon) icon.innerHTML = t === 'dark' ? SUN_SVG : MOON_SVG;
    var label = $('themeLabel');
    if (label) label.textContent = t === 'dark' ? '浅色' : '深色';
  }
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  $('themeBtn').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
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

  $('loginBtn').addEventListener('click', function () {
    var btn = this; btn.disabled = true;
    api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $('loginUser').value, password: $('loginPass').value })
    }).then(function (data) {
      btn.disabled = false;
      if (data.ok) enterMain();
      else showMsg($('loginMsg'), data.error || '登录失败', 'err');
    }).catch(function () { btn.disabled = false; showMsg($('loginMsg'), '网络错误', 'err'); });
  });

  $('loginPass').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('loginBtn').click(); });
  $('setupPass2').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('setupBtn').click(); });

  $('logoutBtn').addEventListener('click', function () {
    api('/api/auth/logout', { method: 'POST' }).then(function () { show('login'); });
  });

  // ---------- 主界面 ----------
  function enterMain() {
    show('main');
    switchPage('overview'); // 默认落在概览页
    loadList().then(function () { syncStaticMedia(); });
    loadUsers();
    loadVisits();
    loadAiUsage();
    loadMailUsage();
    loadMe(); // 侧边栏左上角头像
  }

  function refreshStats() {
    $('statMusic').textContent = items.music.length;
    $('statVideo').textContent = items.video.length;
    $('statImage').textContent = items.image.length;
    $('statUsers').textContent = users.length;
  }

  function loadList() {
    return api('/api/admin/media').then(function (data) {
      if (data.ok) {
        items = data.items;
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
        body.innerHTML = '<p class="hint" style="margin:0">还没有 AI 对话数据，去前台聊几句就有了。</p>';
        $('aiUsageSumm').textContent = '';
        return;
      }
      function fmt(r) {
        var t = (r.prompt || 0) + (r.completion || 0);
        return t.toLocaleString() + ' tokens / ' + r.calls + ' 次';
      }
      $('aiUsageSumm').textContent = '今日 ' + fmt(d.today) + ' · 近 14 天 ' + fmt(d.d14) + ' · 近 30 天 ' + fmt(d.d30);
      var html = '<table style="width:100%;border-collapse:collapse;font-size:13px">';
      html += '<tr style="color:var(--muted)">' +
        '<th style="text-align:left;padding:4px 6px;font-weight:600">模型</th>' +
        '<th style="text-align:right;padding:4px 6px;font-weight:600">调用</th>' +
        '<th style="text-align:right;padding:4px 6px;font-weight:600">输入 tokens</th>' +
        '<th style="text-align:right;padding:4px 6px;font-weight:600">输出 tokens</th></tr>';
      d.byModel.forEach(function (m) {
        html += '<tr>' +
          '<td style="padding:5px 6px;border-top:1px solid var(--row-line);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:0">' + escapeHtml(m.provider + ' / ' + m.model) + '</td>' +
          '<td style="padding:5px 6px;border-top:1px solid var(--row-line);text-align:right;white-space:nowrap">' + m.calls + '</td>' +
          '<td style="padding:5px 6px;border-top:1px solid var(--row-line);text-align:right;white-space:nowrap">' + Number(m.prompt).toLocaleString() + '</td>' +
          '<td style="padding:5px 6px;border-top:1px solid var(--row-line);text-align:right;white-space:nowrap">' + Number(m.completion).toLocaleString() + '</td></tr>';
      });
      html += '</table>';
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
        html += '<p class="hint" style="margin:4px 0 0">暂无发送记录。</p>';
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
        html = '<table style="width:100%;border-collapse:collapse;font-size:13px">';
        html += '<tr style="color:var(--muted)">' +
          '<th style="text-align:left;padding:4px 6px;font-weight:600">用途</th>' +
          '<th style="text-align:right;padding:4px 6px;font-weight:600">累计发送</th></tr>';
        (d.byKind || []).forEach(function (k) {
          html += '<tr>' +
            '<td style="padding:5px 6px;border-top:1px solid var(--row-line)">' + (MAIL_KIND_NAMES[k.kind] || k.kind || '—') + '</td>' +
            '<td style="padding:5px 6px;border-top:1px solid var(--row-line);text-align:right;white-space:nowrap">' + k.count + '</td></tr>';
        });
        html += '</table>';
      } else {
        html = '<p class="hint" style="margin:0">还没有成功的发送记录，发出第一封邮件后这里会有统计（失败记录见下方明细）。</p>';
      }
      html += '<div class="mail-sec-title">近 14 天发送趋势</div><div id="mailTrend"></div>' +
        '<div class="mail-sec-title">发送明细（最近 20 条）</div><div id="mailLogBox"><p class="hint" style="margin:0">加载中…</p></div>';
      $('mailUsageBody').innerHTML = html;
      renderMailTrend(d.d14days || []);
      loadMailLogs();
    }).catch(function () {});
  }

  function loadVisits() {
    api('/api/admin/visits').then(function (d) {
      if (!d.ok) return;
      visitData = d;
      $('statVisits').textContent = d.visits;
      $('statToday').textContent = d.today;
      renderVisitChart();
    }).catch(function () {});
    loadVisitLogs();
  }

  // 最近访问明细（IP/页面/UA），概览页卡片；IP 归属地可按开关启用（site_settings.visit_geo，默认开）
  var geoEnabled = true;
  var geoCache = {}; // 会话内去重：ip → '查询中'/geo/'—'
  function setGeoToggle() {
    var b = $('visitGeoToggle');
    if (!b) return;
    b.classList.toggle('on', geoEnabled);
    b.setAttribute('aria-checked', geoEnabled ? 'true' : 'false');
    b.title = geoEnabled ? '点击关闭 IP 归属地查询' : '点击开启 IP 归属地查询';
  }
  function fmtLogTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    function p(x) { return x < 10 ? '0' + x : x; }
    return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function loadGeo() {
    if (!geoEnabled) return;
    var els = document.querySelectorAll('#visitLogsBody .vl-geo[data-ip]');
    els.forEach(function (el) {
      var ip = el.getAttribute('data-ip');
      if (!ip) { el.remove(); return; }
      var cached = geoCache[ip];
      if (cached) { el.textContent = cached; return; }
      geoCache[ip] = '…';
      api('/api/admin/geoip?ip=' + encodeURIComponent(ip)).then(function (d) {
        var txt = (d && d.ok && d.geo) ? d.geo : '—';
        geoCache[ip] = txt;
        if (el.parentNode) el.textContent = txt;
      }).catch(function () { geoCache[ip] = '—'; if (el.parentNode) el.textContent = '—'; });
    });
  }
  function loadVisitLogs() {
    api('/api/admin/visit-logs').then(function (d) {
      if (!d.ok) return;
      var logs = d.logs || [];
      if (typeof d.geoEnabled === 'boolean') { geoEnabled = d.geoEnabled; setGeoToggle(); }
      $('visitLogsSumm').textContent = logs.length ? '最近 ' + logs.length + ' 次访问' : '暂无记录';
      var body = $('visitLogsBody');
      if (!logs.length) {
        body.innerHTML = '<p class="hint" style="margin:0">暂无访问明细——上线并在前台访问过首页后，这里会显示最近访问的 IP / 归属地 / 页面 / 设备。</p>';
        return;
      }
      body.innerHTML = logs.map(function (l) {
        var t = '<span class="vl-time">' + fmtLogTime(l.created_at) + '</span>' +
          '<span class="vl-ip">' + escapeHtml(l.ip || '-') + '</span>' +
          (geoEnabled && l.ip ? '<span class="vl-geo" data-ip="' + escapeHtml(l.ip) + '"></span>' : '');
        if (l.path) t += '<span class="vl-path" title="' + escapeHtml(l.path) + '">' + escapeHtml(l.path) + '</span>';
        if (l.ua) t += '<span class="vl-ua" title="' + escapeHtml(l.ua) + '">' + escapeHtml(l.ua) + '</span>';
        return '<div class="vl-row">' + t + '</div>';
      }).join('');
      loadGeo();
    }).catch(function () {});
  }
  // 归属地开关：只控制前端是否查询，不删数据
  $('visitGeoToggle').addEventListener('click', function () {
    api('/api/admin/geoip', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !geoEnabled }),
    }).then(function (d) {
      if (d && d.ok) {
        geoEnabled = d.enabled;
        setGeoToggle();
        loadVisitLogs();
      }
    }).catch(function () { toast('切换失败', 'err'); });
  });

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
        // fill 走 style 而非 fill 属性：表示属性里不能用 var()
        parts.push('<path d="' + segD(a, b) + '" class="donut-seg' + (isToday ? ' donut-today' : '') +
          '" style="fill:' + fill + ';--dx:' + dx.toFixed(2) + 'px;--dy:' + dy.toFixed(2) + 'px' +
          (isToday ? ';--tx:' + (Math.cos(rad) * 5).toFixed(2) + 'px;--ty:' + (Math.sin(rad) * 5).toFixed(2) + 'px' : '') +
          '" data-i="' + idx + '" data-day="' + (d.other ? '其余 ' + restDays.length + ' 天' : d.day) +
          '" data-count="' + d.count + '" data-pct="' + (frac * 100).toFixed(1) +
          '" data-max="' + (!d.other && d.count === maxC ? '1' : '0') + '"' +
          (d.other ? ' data-other="1" data-list="' + restDays.map(function (r) { return r.day + ':' + r.count; }).join('|') + '"' : '') +
          '></path>');
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
        '" height="' + h + '" rx="2" class="bar" data-i="' + i + '" data-day="' + d.day + '" data-count="' + d.count +
        '" data-pct="' + pct + '" data-max="' + (d.count === max ? '1' : '0') + '" style="--dx:0;--dy:-4px"></rect>');
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
  var extraAlbums = []; // 本次会话里新建过的空相册（相册由 media.album 派生，空相册得靠这里记住）
  function albumNames() {
    var set = [];
    (items.image || []).forEach(function (it) {
      var a = (it.album || '').trim();
      if (a && set.indexOf(a) === -1) set.push(a);
    });
    extraAlbums.forEach(function (a) {
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
              var idx = extraAlbums.indexOf(name);
              if (idx > -1) extraAlbums[idx] = to; // 空相册重命名：同步会话名单
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
              var idx = extraAlbums.indexOf(name);
              if (idx > -1) extraAlbums.splice(idx, 1);
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
    // 刚新建还没移入图片的相册也要留在列表里（extraAlbums 已在 albumNames 里合并）
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
    list.innerHTML = '';
    $('empty').hidden = showArr.length > 0;
    $('empty').textContent = arr.length ? '没有匹配「' + q + '」的文件。' : '还没有内容，先上传一个文件吧。也可以拖动条目调整顺序。';
    showArr.forEach(function (it) {
      var i = arr.indexOf(it);
      var li = document.createElement('li');
      li.draggable = !filtering || currentType === 'image';

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
        li.appendChild(thumb);
      }

      var title = document.createElement('span');
      title.className = 'title';
      title.textContent = it.title;
      title.title = it.title;
      title.addEventListener('click', function () { startRename(it, title); });

      var meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = fmtSize(it.size) + ' · ' + fmtDate(it.created_at);

      li.appendChild(title);
      li.appendChild(meta);

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
        li.appendChild(ahost);
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

      // 行内操作按钮组（桌面悬停/聚焦浮现，触屏常显，窄屏换行到第二行）
      var actions = document.createElement('div');
      actions.className = 'row-actions';

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
      del.addEventListener('click', function () { removeItem(it); });
      actions.appendChild(del);

      li.appendChild(actions);

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
      return '<div class="st-row"><span class="st-name">' + name + '</span>' +
        '<div class="st-bar"><i class="' + b + '" style="width:' + Math.min(100, pct2).toFixed(1) + '%"></i></div>' +
        '<span class="st-meta">' + fmtSize(size) + (count ? ' · ' + count + ' 个' : '') + '</span></div>';
    }
    $('stStorageBody').innerHTML =
      srow('全部', sd.total, stPct, sd.items.reduce(function (a, x) { return a + x.count; }, 0)) +
      sd.items.map(function (x) { return srow(x.name, x.size, x.size / CAP * 100, x.count); }).join('');

    // 邮件发送额度：服务商上限 - 今日已发（本地计数估算）
    $('stMailBody').innerHTML = '<p class="hint" style="margin:0">加载中…</p>';
    $('stMailSumm').textContent = '';
    api('/api/admin/email').then(function (cfg) {
      var cOk = cfg && cfg.ok;
      if (!cOk) {
        $('stMailBody').innerHTML = '<p class="hint" style="margin:0">读取失败，请稍后重试。</p>';
        return;
      }
      if (!cfg.enabled) {
        $('stMailSumm').textContent = '未启用';
        $('stMailBody').innerHTML = '<p class="hint" style="margin:0">邮件服务未启用，请到「邮件」页配置并开启后再查看额度。</p>';
        return;
      }
      api('/api/admin/email/usage').then(function (u) {
        if (!u || !u.ok) {
          $('stMailBody').innerHTML = '<p class="hint" style="margin:0">读取失败，请稍后重试。</p>';
          return;
        }
        var pname = cfg.provider === 'brevo' ? 'Brevo（300 封/天）' : 'Resend（100 封/天）';
        var cap = MAIL_DAILY_CAP[cfg.provider] || 100;
        var today = u.today || 0;
        var left = Math.max(0, cap - today);
        $('stMailSumm').textContent = '今日已发 ' + today + ' 封';
        var html = '<div class="mail-quota">' +
          '<div class="mq-line"><span class="meta2">服务商</span><span>' + pname + '</span></div>' +
          '<div class="st-row" style="padding-left:0"><span class="st-name">今日已发</span>' +
          '<div class="st-bar"><i class="' + (today / cap >= 0.8 ? ' warn' : '') + '" style="width:' + Math.min(100, today / cap * 100).toFixed(1) + '%"></i></div>' +
          '<span class="st-meta">' + today + ' / ' + cap + ' 封</span></div>' +
          '<div class="mq-line"><span class="meta2">剩余免费额度</span><span><strong style="font-size:16px">' + left + '</strong> 封</span></div>' +
          '</div>';
        // 近 7 天每日发送（迷你柱状）
        var d7 = (u.d14days || []).slice(-7);
        if (d7.length) {
          var m7 = 1;
          d7.forEach(function (d) { if (d.count > m7) m7 = d.count; });
          html += '<div class="mail-sec-title">近 7 天每日发送</div><div style="display:flex;align-items:flex-end;gap:6px;height:48px;padding-top:6px">' +
            d7.map(function (d) {
              var h = Math.max(d.count > 0 ? 3 : 1, Math.round(d.count / m7 * 38));
              return '<div style="flex:1;text-align:center"><div style="background:var(--fg);opacity:.85;border-radius:3px;height:' + h + 'px" title="' + d.day + '：' + d.count + ' 封"></div><div style="font-size:10px;color:var(--muted);margin-top:3px">' + d.day.slice(5) + '</div></div>';
            }).join('') + '</div>';
        }
        $('stMailBody').innerHTML = html;
      }).catch(function () {});
    }).catch(function () {});
  }

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
    $('userEmpty').hidden = arr.length > 0;
    $('userEmpty').textContent = users.length ? '没有匹配「' + q + '」的用户。' : '还没有用户注册。';
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
      badge.className = 'badge ' + (u.banned ? 'banned' : 'ok');
      badge.textContent = u.banned ? '已禁用' : '正常';

      var meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = '注册于 ' + fmtDate(u.created_at) + ' · ' + fmtRel(u.last_seen_at)
        + (u.email ? ' · ' + u.email + (u.twofa_enabled ? '（2FA）' : '') : '');

      var ban = document.createElement('button');
      ban.className = 'ghost';
      ban.textContent = u.banned ? '解封' : '禁用';
      ban.addEventListener('click', function () { setBanned(u, !u.banned); });

      var del = document.createElement('button');
      del.className = 'danger';
      del.textContent = '删除';
      del.addEventListener('click', function () { removeUser(u); });

      li.appendChild(avatar); li.appendChild(title); li.appendChild(badge); li.appendChild(meta);
      li.appendChild(ban); li.appendChild(del);
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
    { name: 'blue', label: '蓝色', color: '#0a84ff' },
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

  // ---------- 侧边栏导航 ----------
  var PAGE_TITLES = { overview: '概览', music: '音乐', video: '视频', image: '图片', users: '用户', appearance: '外观', ai: 'AI 设置', email: '邮件', me: '我的', status: '状态' };
  var navBtns = document.querySelectorAll('#sideNav button');
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
    }).catch(function () {});
  }
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

  function switchPage(type) {
    currentType = type;
    navBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-type') === type); });
    $('pageTitle').textContent = PAGE_TITLES[type] || type;
    var isOverview = type === 'overview';
    var isUsers = type === 'users';
    var isAppear = type === 'appearance';
    var isAi = type === 'ai';
    var isEmail = type === 'email';
    var isMe = type === 'me';
    var isStatus = type === 'status';
    $('overviewPanel').hidden = !isOverview;
    $('mediaPanel').hidden = isOverview || isUsers || isAppear || isAi || isEmail || isMe || isStatus;
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
    }
    if (isUsers) {
      $('userSearch').value = ''; // 换进来重置搜索
      loadUsers();
    }
    if (!isOverview && !isUsers && !isAppear && !isAi && !isEmail && !isMe && !isStatus) {
      $('fileInput').accept = TYPE_EXT[type];
      $('titleInput').value = '';
      selected = {}; // 换标签页清空勾选和搜索
      $('searchInput').value = '';
      $('selAll').checked = false;
      $('batchDelBtn').hidden = true;
      if (type !== 'image') albumFilter = '';
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
      isStatus ? $('statusPanel') : $('mediaPanel');
    if (targetPanel && targetPanel !== lastEnterPanel) {
      lastEnterPanel = targetPanel;
      targetPanel.classList.remove('panel-enter');
      void targetPanel.offsetWidth; // 强制 reflow 以重播动画
      targetPanel.classList.add('panel-enter');
    }
  }
  navBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchPage(btn.getAttribute('data-type'));
    });
  });
  // 侧边栏收起/展开（桌面端，localStorage 记住）
  try {
    if (localStorage.getItem('adminNavCollapsed') === '1') {
      document.body.classList.add('nav-collapsed');
      $('navCollapseLabel').textContent = '展开侧边栏';
      $('navCollapseBtn').title = '展开侧边栏';
    }
  } catch (e) {}
  $('navCollapseBtn').addEventListener('click', function () {
    var collapsed = document.body.classList.toggle('nav-collapsed');
    $('navCollapseLabel').textContent = collapsed ? '展开侧边栏' : '收起侧边栏';
    this.title = collapsed ? '展开侧边栏' : '收起侧边栏';
    try { localStorage.setItem('adminNavCollapsed', collapsed ? '1' : '0'); } catch (e) {}
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
        extraAlbums.push(name); // 空相册不用落库，移入第一张图时自然生成
        albumFilter = name;
        renderList();
        toast('已创建「' + name + '」，把图片拖到相册名上即可归组', 'ok');
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
    function findSeg(e) { return e.target && e.target.closest ? e.target.closest('.donut-seg, .bar') : null; }
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
  $('fileInput').addEventListener('change', function () {
    var files = this.files;
    var info = $('filePickInfo');
    if (!files || !files.length) { info.classList.remove('show'); return; }
    var names = [];
    for (var i = 0; i < Math.min(files.length, 3); i++) names.push(files[i].name);
    if (files.length > 3) names.push('…');
    info.textContent = '已选 ' + files.length + ' 个文件：' + names.join('、') + '（可再点按钮更换）';
    info.classList.add('show');
  });

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
