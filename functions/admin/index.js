// GET /admin → 管理后台单页（首次使用显示初始化表单，未登录显示登录表单）
// 黑白主题（浅色/深色可切换，本地记住）；页面只是壳，所有数据操作都要过 /api/admin/* 的会话校验
import { html } from '../lib/util.js';

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
  body.nav-collapsed .brand { padding-left: 4px; padding-right: 4px; }
  body.nav-collapsed .brand h1, body.nav-collapsed .brand p { display: none; }
  body.nav-collapsed nav.sidenav-links button { justify-content: center; padding: 10px 0; }
  body.nav-collapsed nav.sidenav-links button span { display: none; }
  body.nav-collapsed .sidenav-foot .icon-btn { justify-content: center; padding: 10px 0; }
  body.nav-collapsed .sidenav-foot .icon-btn span { display: none; }
  #navCollapseBtn svg { transition: transform .2s; }
  body.nav-collapsed #navCollapseBtn svg { transform: rotate(180deg); }
  .brand { display: flex; align-items: center; gap: 10px; padding: 4px 10px 18px; position: relative; }
  .brand .mark {
    width: 38px; height: 38px; border-radius: 11px;
    background: var(--fg); color: var(--bg);
    font-weight: 700; font-size: 14px; letter-spacing: .05em;
    display: flex; align-items: center; justify-content: center; flex: none;
  }
  .brand h1 { font-size: 16px; font-weight: 700; line-height: 1.2; }
  .brand p { font-size: 11px; color: var(--muted); margin-top: 2px; }
  nav.sidenav-links { display: flex; flex-direction: column; gap: 4px; }
  nav.sidenav-links button {
    display: flex; align-items: center; gap: 10px;
    background: transparent; color: var(--fg);
    padding: 10px 12px; border-radius: 10px; font-size: 14px;
    text-align: left; border: none; cursor: pointer;
  }
  nav.sidenav-links button:hover { background: var(--hover); opacity: 1; }
  nav.sidenav-links button.active { background: var(--fg); color: var(--bg); font-weight: 600; }
  nav.sidenav-links button svg { width: 17px; height: 17px; flex: none; }
  .sidenav-foot { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--row-line); display: flex; flex-direction: column; gap: 4px; }
  .sidenav-foot .icon-btn { justify-content: flex-start; }
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
  .ai-model-row select.ai-mr-tag {
    flex: none; max-width: none; padding: 4px 6px; font-size: 12px; border-radius: 8px; margin: 0;
  }
  .ai-model-row .star-def.on { color: var(--warn); opacity: 1; }
  .ai-model-row .star-def svg { display: block; }
  .ai-mgr-addmodel { display: flex; gap: 6px; margin-top: 8px; }
  .ai-mgr-addmodel input { flex: 1; margin: 0; }
  .ai-test-ok { color: var(--ok); font-weight: 600; }
  .ai-test-err { color: var(--danger); font-weight: 600; }
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
  .upload-row input[type=file] { font-size: 13px; max-width: 260px; color: var(--fg); }
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
  .upload-row.dragover { border-color: var(--fg); background: var(--chip); }
  .upload-hint { color: var(--muted); font-size: 12px; margin-top: 8px; line-height: 1.5; }
  .queue-info { font-size: 13px; color: var(--muted); margin-top: 8px; min-height: 0; }
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
  #visitChart svg { width: 100%; height: 170px; display: block; }
  #visitChart .gl { stroke: var(--border); stroke-width: 1; }
  #visitChart .gt { fill: var(--muted); font-size: 10px; font-family: inherit; }
  #visitChart .bar { fill: var(--fg); opacity: .82; }
  #visitChart .bar:hover { opacity: 1; }
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
  ul.list li select.row-album { padding: 4px 6px; font-size: 12px; border-radius: 8px; max-width: 110px; }
  .avatar {
    width: 34px; height: 34px; border-radius: 50%; flex: none;
    background: var(--fg); color: var(--bg);
    font-size: 15px; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
  }
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
    body.nav-collapsed .brand { padding: 4px 10px 18px; }
    body.nav-collapsed .brand h1, body.nav-collapsed .brand p { display: block; }
    body.nav-collapsed nav.sidenav-links button { justify-content: flex-start; padding: 10px 12px; }
    body.nav-collapsed nav.sidenav-links button span { display: inline; }
    body.nav-collapsed .sidenav-foot .icon-btn { justify-content: flex-start; padding: 8px 14px; }
    body.nav-collapsed .sidenav-foot .icon-btn span { display: inline; }
    header.topbar { padding: 10px 16px; }
    main.content { padding: 16px 16px 40px; }
    .card { padding: 16px; border-radius: 14px; }
    ul.list li { flex-wrap: wrap; row-gap: 8px; padding: 10px 2px; }
    ul.list li .title { flex: 1 1 40%; }
    ul.list li .meta { margin-left: auto; }
    .row-actions { flex-basis: 100%; margin-left: 0; }
    .list-tools { gap: 8px; }
    .stat { padding: 12px 14px; }
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
    <div class="msg" id="loginMsg"></div>
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
      <div class="mark">YH</div>
      <div>
        <h1>YHuo 管理后台</h1>
        <p>内容与用户一站式管理</p>
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
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></div><div><div class="num" id="statVisits">0</div><div class="lbl">访问量</div></div></div>
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div><div><div class="num" id="statToday">0</div><div class="lbl">今日访问</div></div></div>
        </div>
        <div class="card" id="visitCard">
          <div class="visit-head">
            <strong>访问趋势</strong>
            <span class="meta2" id="visitSumm"></span>
            <span class="spacer"></span>
            <button class="ghost range-btn active" data-range="14">近 14 天</button>
            <button class="ghost range-btn" data-range="30">近 30 天</button>
          </div>
          <div id="visitChart"></div>
          <p class="hint" id="visitHint" style="margin:10px 0 0" hidden>按天明细从上线开始积累，之前累积的总访问量没有逐日记录。</p>
        </div>
      </div>

      <div id="mediaPanel" hidden>
    <div class="upload-row" id="uploadRow">
      <input type="file" id="fileInput" multiple>
      <input type="text" id="titleInput" placeholder="显示名称（可选，仅单个文件时生效）">
      <button id="uploadBtn">上传</button>
    </div>
    <p class="upload-hint" id="uploadHint">支持一次选多个文件，也可以把文件或整个文件夹拖进来；与已有内容同名的自动跳过；单文件上限 24MB。</p>
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
    <p class="appear-label2">主页寄语</p>
    <input type="text" id="quoteInput" maxlength="100" placeholder="显示在时钟下方；留空则用每日一言">
    <button id="quoteSaveBtn" class="ghost">保存寄语</button>
    <p class="appear-label2">备份</p>
    <div class="bgset-row">
      <button id="exportBtn" class="ghost">导出媒体清单备份（JSON）</button>
      <span class="meta2">含全部媒体条目与访问地址；KV 里的文件本体请自行下载保存。</span>
    </div>
  </div>

  <div id="aiPanel" hidden>
    <p class="hint">管理模型供应商：配置后前台「AI」对话界面可切换使用；每个供应商可挂多个模型，其中一个是默认。API Key 只存在站点数据库，不下发浏览器，对话统一走服务端代理转发。"Chat Completions" 是 OpenAI 兼容格式，可覆盖 GLM / DeepSeek / Kimi / Gemini 兼容端点等主流服务商。</p>
    <p class="appear-label2">全局开关</p>
    <div class="bgset-row">
      <button id="aiToggleBtn" class="ghost">停用 AI</button>
      <span class="meta2" id="aiStateText">状态读取中…</span>
    </div>
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
        <select id="aiProtocol">
          <option value="openai">Chat Completions（/chat/completions，OpenAI 兼容）</option>
          <option value="anthropic">Anthropic Messages（/messages）</option>
        </select>
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
        <div class="ai-mgr-addmodel" id="aiAddModelWrap" hidden>
          <input type="text" id="aiNewModelInput" list="aiModelList" maxlength="100" placeholder="输入模型名（如 deepseek-v4-flash）">
          <datalist id="aiModelList"></datalist>
          <select id="aiNewModelTag" class="ai-mr-tag" title="模型类型标签（前台菜单里显示）">
            <option value="">无标签</option>
            <option value="文本">文本</option>
            <option value="视觉">视觉</option>
            <option value="推理">推理</option>
          </select>
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
    music: '.mp3,.wav,.m4a,.flac,.ogg,.aac,.opus',
    video: '.mp4,.webm,.mov,.m4v,.ogv',
    image: '.jpg,.jpeg,.png,.gif,.webp,.svg,.avif,.bmp'
  };
  var currentType = 'music';
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
    $('neterrCard').hidden = name !== 'neterr';
  }

  // 自动重试 3 次：网络抖动时误显示登录表单会让人误以为账号丢了
  function loadStatus(tries) {
    tries = tries || 0;
    api('/api/auth/status').then(function (data) {
      if (!data || !data.ok) { show('neterr'); return; }
      if (!data.initialized) show('setup');
      else if (data.authenticated) enterMain();
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
        renderList();
        refreshStats();
      } else if (data._status === 401) {
        show('login');
      }
    }).catch(function () {});
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

  function loadVisits() {
    api('/api/admin/visits').then(function (d) {
      if (!d.ok) return;
      visitData = d;
      $('statVisits').textContent = d.visits;
      $('statToday').textContent = d.today;
      renderVisitChart();
    }).catch(function () {});
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
    $('visitSumm').textContent = '今日 ' + visitData.today + ' · 昨日 ' + visitData.yesterday +
      ' · 近 ' + n + ' 天共 ' + totalInRange + ' 次' +
      (activeDays ? '，日均 ' + Math.round(totalInRange / n * 10) / 10 + ' 次' : '');
    $('visitHint').hidden = activeDays > 0;

    var W = 700, H = 170, padL = 34, padB = 22, padT = 14, padR = 10;
    var max = 1;
    days.forEach(function (d) { if (d.count > max) max = d.count; });
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var bw = innerW / n;
    var parts = [];
    parts.push('<line x1="' + padL + '" y1="' + padT + '" x2="' + (W - padR) + '" y2="' + padT + '" class="gl"/>');
    parts.push('<line x1="' + padL + '" y1="' + (H - padB) + '" x2="' + (W - padR) + '" y2="' + (H - padB) + '" class="gl"/>');
    parts.push('<text x="' + (padL - 6) + '" y="' + (padT + 4) + '" class="gt" text-anchor="end">' + max + '</text>');
    parts.push('<text x="' + (padL - 6) + '" y="' + (H - padB + 4) + '" class="gt" text-anchor="end">0</text>');
    var labelEvery = Math.max(1, Math.ceil(n / 6));
    days.forEach(function (d, i) {
      var h = Math.max(d.count > 0 ? 2 : 0, Math.round(d.count / max * innerH));
      var x = padL + i * bw + bw * 0.15;
      var y = H - padB - h;
      parts.push('<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + (bw * 0.7).toFixed(1) +
        '" height="' + h + '" rx="2" class="bar"><title>' + d.day + '：' + d.count + ' 次</title></rect>');
      if (i % labelEvery === 0 || i === n - 1) {
        parts.push('<text x="' + (padL + i * bw + bw / 2).toFixed(1) + '" y="' + (H - 6) +
          '" class="gt" text-anchor="middle">' + d.day.slice(5) + '</text>');
      }
    });
    $('visitChart').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="近 ' + n + ' 天访问趋势">' + parts.join('') + '</svg>';
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

  function albumOption(sel, value, label) {
    var el = document.createElement('option');
    el.value = value;
    el.textContent = label;
    sel.appendChild(el);
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

      // 图片：行内相册归属下拉
      if (currentType === 'image') {
        var asel = document.createElement('select');
        asel.className = 'row-album';
        var cur = (it.album || '').trim();
        albumOption(asel, '', '未分组');
        var anames = albumNames();
        if (cur && anames.indexOf(cur) === -1) albumOption(asel, cur, cur); // 刚被别人改名的兜底
        anames.forEach(function (nm) { albumOption(asel, nm, nm); });
        asel.value = cur;
        if (asel.value !== cur) asel.value = '';
        asel.addEventListener('change', function () {
          api('/api/admin/media/' + it.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ album: asel.value })
          }).then(function (d) {
            if (d.ok) {
              it.album = asel.value;
              rebuildAlbumControls();
              toast('已移入「' + (asel.value || '未分组') + '」', 'ok');
            } else toast(d.error || '操作失败', 'err');
          });
        });
        li.appendChild(asel);
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
      avatar.textContent = (u.username || '?').slice(0, 1).toUpperCase();

      var title = document.createElement('span');
      title.className = 'title';
      title.textContent = u.username;

      var badge = document.createElement('span');
      badge.className = 'badge ' + (u.banned ? 'banned' : 'ok');
      badge.textContent = u.banned ? '已禁用' : '正常';

      var meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = '注册于 ' + fmtDate(u.created_at) + ' · ' + fmtRel(u.last_seen_at);

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
        $('quoteInput').value = d.quote || '';
      } else if (d._status === 401) {
        show('login');
      }
    }).catch(function () {});
  }

  $('quoteSaveBtn').addEventListener('click', function () {
    api('/api/admin/appearance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote: $('quoteInput').value })
    }).then(function (d) {
      if (d.ok) toast(d.quote ? '寄语已保存，前台即刻生效' : '已清除寄语，前台恢复每日一言', 'ok');
      else toast(d.error || '保存失败', 'err');
    }).catch(function () { toast('网络错误', 'err'); });
  });

  // 备份导出：媒体清单 + 站点设置 + 访问统计，打包成 JSON 下载
  $('exportBtn').addEventListener('click', function () {
    var payload = {
      exported_at: new Date().toISOString(),
      media: items,
      settings: { accent: currentAccent, quote: $('quoteInput').value || null },
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
    if (!showDetail) return;
    setTestResult('');
    $('aiAddModelWrap').hidden = true;
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
  function tagSelect(value, onchange) {
    var sel = document.createElement('select');
    sel.className = 'ai-mr-tag';
    sel.title = '模型类型标签（前台切换菜单里显示）';
    MODEL_TAGS.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t;
      o.textContent = t === '' ? '无标签' : t;
      sel.appendChild(o);
    });
    sel.value = value || '';
    sel.addEventListener('change', function () { onchange(sel.value); });
    return sel;
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

        var edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'icon-mini';
        edit.title = '重命名模型';
        edit.innerHTML = PENCIL_SVG;
        edit.addEventListener('click', function () {
          ask({
            title: '重命名模型',
            msg: '「' + p.name + '」里的模型 ' + m.id + ' 改名为：',
            input: true, value: m.id, max: 100, okText: '确定',
            cb: function (ok, val) {
              if (!ok || !val || !val.trim() || val.trim() === m.id) return;
              var np = currentProviderDraft();
              if (!np) return;
              np.models = np.models.map(function (x) { return x.id === m.id ? { id: val.trim(), tag: x.tag } : x; });
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
          if (models.length <= 1) { toast('至少保留一个模型；不要这个供应商可用右上角删除', 'err'); return; }
          ask({
            title: '删除模型',
            msg: '从「' + p.name + '」删除模型 ' + m.id + '？',
            okText: '删除', danger: true,
            cb: function (ok) {
              if (!ok) return;
              var np = currentProviderDraft();
              if (!np) return;
              np.models = np.models.filter(function (x) { return x.id !== m.id; });
              saveProviderDraft(np);
            }
          });
        });
        row.appendChild(del);
      }
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
      body: JSON.stringify({ enabled: !currentAiEnabled }),
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
  $('aiAddModelBtn').addEventListener('click', function () {
    $('aiAddModelWrap').hidden = false;
    $('aiNewModelInput').value = '';
    $('aiNewModelInput').focus();
  });
  $('aiAddModelCancel').addEventListener('click', function () {
    $('aiAddModelWrap').hidden = true;
  });
  function commitAddModel() {
    var val = $('aiNewModelInput').value.trim();
    if (!val) { $('aiNewModelInput').focus(); return; }
    var models = isNewMode() ? aiNewModels : (selectedProvider() ? selectedProvider().models : []);
    if (!models) return;
    if (models.some(function (x) { return x.id === val; })) { toast('模型已存在', 'err'); return; }
    var entry = { id: val, tag: $('aiNewModelTag').value || '' };
    if (isNewMode()) {
      aiNewModels.push(entry);
      renderAiManager();
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
  var PAGE_TITLES = { overview: '概览', music: '音乐', video: '视频', image: '图片', users: '用户', appearance: '外观', ai: 'AI 设置' };
  var navBtns = document.querySelectorAll('#sideNav button');
  function switchPage(type) {
    currentType = type;
    navBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-type') === type); });
    $('pageTitle').textContent = PAGE_TITLES[type] || type;
    var isOverview = type === 'overview';
    var isUsers = type === 'users';
    var isAppear = type === 'appearance';
    var isAi = type === 'ai';
    $('overviewPanel').hidden = !isOverview;
    $('mediaPanel').hidden = isOverview || isUsers || isAppear || isAi;
    $('userPanel').hidden = !isUsers;
    $('appearancePanel').hidden = !isAppear;
    $('aiPanel').hidden = !isAi;
    // 列表对所有媒体类型常显（列表/工具/存储条都在 image-shell 里，隐藏它会连列表一起藏掉）；
    // 只收起左侧相册侧栏
    $('imageShell').hidden = false;
    var albumSideEl = document.querySelector('.album-side');
    if (albumSideEl) albumSideEl.hidden = type !== 'image';
    document.body.classList.remove('nav-open'); // 窄屏选完即收起菜单
    if (isAppear) {
      loadAppearance();
    }
    if (isAi) {
      loadAiSettings();
    }
    if (isUsers) {
      $('userSearch').value = ''; // 换进来重置搜索
      loadUsers();
    }
    if (!isOverview && !isUsers && !isAppear && !isAi) {
      $('fileInput').accept = TYPE_EXT[type];
      $('titleInput').value = '';
      selected = {}; // 换标签页清空勾选和搜索
      $('searchInput').value = '';
      $('selAll').checked = false;
      $('batchDelBtn').hidden = true;
      if (type !== 'image') albumFilter = '';
      renderList();
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
  document.querySelectorAll('.range-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.range-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      visitRange = Number(btn.getAttribute('data-range')) || 14;
      renderVisitChart();
    });
  });

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
      existing[t.replace(/\.[^.]+$/, '')] = true; // 同步进来的标题可能带扩展名，两种都算同名
    });

    var queue = [], skipped = [], oversize = [], wrongType = 0;
    all.forEach(function (f) {
      if (!extAllowed(f)) { wrongType++; return; }
      if (f.size > MAX_SIZE) { oversize.push(f.name); return; }
      var base = (f.name || '').replace(/\.[^.]+$/, '').toLowerCase();
      if (existing[base] || existing[(f.name || '').toLowerCase()]) { skipped.push(f.name); return; }
      queue.push(f);
    });

    if (!queue.length) {
      var m = '没有需要上传的文件';
      if (skipped.length) m += '（跳过同名 ' + skipped.length + ' 个）';
      if (oversize.length) m += '（' + oversize.length + ' 个超过 24MB）';
      if (wrongType) m += '（' + wrongType + ' 个格式不符）';
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
        $('titleInput').value = '';
        var msg = '上传完成 ' + okCount + ' 个';
        if (failCount) msg += '，失败 ' + failCount + ' 个';
        if (skipped.length) msg += '，跳过同名 ' + skipped.length + ' 个';
        if (oversize.length) msg += '，' + oversize.length + ' 个超过 24MB';
        if (wrongType) msg += '，' + wrongType + ' 个格式不符';
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
