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
  }
  [data-theme="dark"] {
    --bg: #111113; --card: #1c1c1e; --fg: #f5f5f7; --bg-fg: #111113;
    --muted: #98989d; --border: #3a3a3c; --chip: #2c2c2e; --chip-hover: #3a3a3c;
    --input-bg: #2a2a2c; --hover: #2c2c2e; --row-line: #2c2c2e;
    --shadow: 0 1px 3px rgba(0,0,0,.5);
  }
  * { box-sizing: border-box; margin: 0; }
  body {
    min-height: 100vh;
    display: flex; flex-direction: column; align-items: flex-start;
    padding: 36px 24px 60px 4vw;
    background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    transition: background .25s, color .25s;
  }
  header { width: 100%; max-width: 860px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand .mark {
    width: 42px; height: 42px; border-radius: 12px;
    background: var(--fg); color: var(--bg);
    font-weight: 700; font-size: 15px; letter-spacing: .05em;
    display: flex; align-items: center; justify-content: center;
  }
  .brand h1 { font-size: 19px; font-weight: 700; }
  .brand p { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .header-btns { display: flex; gap: 8px; }
  .icon-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 10px; font-size: 13px;
  }
  .icon-btn svg { width: 15px; height: 15px; }
  .card {
    width: 100%; max-width: 860px;
    background: var(--card); border-radius: 18px; padding: 24px;
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
  }
  .hint { color: var(--muted); font-size: 13px; line-height: 1.6; margin-bottom: 16px; }
  input[type=text], input[type=password] {
    width: 100%; padding: 10px 12px; margin: 6px 0 14px;
    border: 1px solid var(--border); border-radius: 10px; font-size: 15px;
    background: var(--input-bg); color: var(--fg);
  }
  input:focus { outline: 2px solid var(--fg); outline-offset: -1px; border-color: transparent; }
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
  .tabs { display: flex; gap: 6px; margin-bottom: 20px; background: var(--chip); padding: 4px; border-radius: 12px; width: fit-content; }
  .tabs button { background: transparent; color: var(--fg); padding: 8px 18px; border-radius: 9px; }
  .tabs button.active { background: var(--card); color: var(--fg); font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.18); }
  .appear-label2 { font-size: 13px; font-weight: 600; margin: 18px 0 10px; }
  .accent-row { display: flex; gap: 10px; }
  .accent-dot { width: 34px; height: 34px; border-radius: 50%; border: 3px solid transparent; padding: 0; }
  .accent-dot.active { border-color: var(--fg); }
  .bgset-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .bg-preview { width: 160px; height: 90px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border); }
  .meta2 { color: var(--muted); font-size: 13px; }
  .stats { width: 100%; max-width: 860px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 22px; }
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
  ul.list li button { padding: 5px 10px; font-size: 12px; border-radius: 8px; }
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
  footer { margin-top: 24px; font-size: 12px; color: var(--muted); }
</style>
</head>
<body>
<header>
  <div class="brand">
    <div class="mark">YH</div>
    <div>
      <h1>YHuo 管理后台</h1>
      <p>内容与用户一站式管理</p>
    </div>
  </div>
  <div class="header-btns">
    <button id="themeBtn" class="ghost icon-btn" title="切换浅色/深色">
      <svg id="themeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg>
      <span id="themeLabel">深色</span>
    </button>
    <button id="logoutBtn" class="ghost icon-btn" hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
      <span>退出</span>
    </button>
  </div>
</header>

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

<div class="stats" id="stats" hidden>
  <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div><div><div class="num" id="statMusic">0</div><div class="lbl">音乐</div></div></div>
  <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20M2 16h20M8 4v16M16 4v16"/></svg></div><div><div class="num" id="statVideo">0</div><div class="lbl">视频</div></div></div>
  <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div><div><div class="num" id="statImage">0</div><div class="lbl">图片</div></div></div>
  <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><div class="num" id="statUsers">0</div><div class="lbl">注册用户</div></div></div>
  <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></div><div><div class="num" id="statVisits">0</div><div class="lbl">访问量</div></div></div>
</div>

<div class="card" id="mainCard" hidden>
  <div class="tabs">
    <button data-type="music" class="active">音乐</button>
    <button data-type="video">视频</button>
    <button data-type="image">图片</button>
    <button data-type="users">用户</button>
    <button data-type="appearance">外观</button>
  </div>

  <div id="mediaPanel">
    <div class="upload-row" id="uploadRow">
      <input type="file" id="fileInput" multiple>
      <input type="text" id="titleInput" placeholder="显示名称（可选，仅单个文件时生效）">
      <button id="uploadBtn">上传</button>
    </div>
    <p class="upload-hint">支持一次选多个文件，也可以把文件或整个文件夹拖进来；与已有内容同名的自动跳过；单文件上限 24MB。</p>
    <div class="progress" id="progress"><i id="progressBar"></i></div>
    <div class="queue-info" id="queueInfo"></div>
    <div class="msg" id="mainMsg"></div>
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

  <div id="userPanel" hidden>
    <div class="msg" id="userMsg"></div>
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
    <div class="msg" id="appearMsg"></div>
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

<footer>文件存放在 Cloudflare KV（单文件上限 24MB）；删除与禁用操作即时生效，请谨慎确认。</footer>

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
    $('setupCard').hidden = name !== 'setup';
    $('loginCard').hidden = name !== 'login';
    $('neterrCard').hidden = name !== 'neterr';
    $('mainCard').hidden = name !== 'main';
    $('stats').hidden = name !== 'main';
    $('logoutBtn').hidden = name !== 'main';
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

  function loadVisits() {
    api('/api/admin/visits').then(function (d) {
      if (d.ok) $('statVisits').textContent = d.visits;
    }).catch(function () {});
  }

  // ---------- 批量选择 / 搜索 ----------
  var selected = {}; // id → true，切标签页时清空

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
    var filtering = !!q; // 搜索时是只读视图，隐藏排序控件避免顺序错乱
    list.innerHTML = '';
    $('empty').hidden = showArr.length > 0;
    $('empty').textContent = arr.length ? '没有匹配「' + q + '」的文件。' : '还没有内容，先上传一个文件吧。也可以拖动条目调整顺序。';
    showArr.forEach(function (it) {
      var i = arr.indexOf(it);
      var li = document.createElement('li');
      li.draggable = !filtering;

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
      handle.textContent = '⠿';
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

      var meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = fmtSize(it.size) + ' · ' + fmtDate(it.created_at);

      li.appendChild(title);
      li.appendChild(meta);

      var renameBtn = document.createElement('button');
      renameBtn.className = 'ghost';
      renameBtn.textContent = '✏️';
      renameBtn.title = '修改显示名称';
      renameBtn.addEventListener('click', function () { rename(it); });
      li.appendChild(renameBtn);

      var playBtn = document.createElement('button');
      playBtn.className = 'ghost';
      playBtn.textContent = currentType === 'music' ? '▶ 试听' : (currentType === 'video' ? '▶ 预览' : '👁 查看');
      playBtn.addEventListener('click', function () { openPreview(it); });
      li.appendChild(playBtn);

      if (!filtering) {
        var up = document.createElement('button');
        up.className = 'ghost'; up.textContent = '↑'; up.disabled = i === 0;
        up.addEventListener('click', function () { move(currentType, i, -1); });

        var down = document.createElement('button');
        down.className = 'ghost'; down.textContent = '↓'; down.disabled = i === arr.length - 1;
        down.addEventListener('click', function () { move(currentType, i, 1); });

        li.appendChild(up); li.appendChild(down);
        addDragHandlers(li, currentType, i);
      }

      var del = document.createElement('button');
      del.className = 'danger'; del.textContent = '删除';
      del.addEventListener('click', function () { removeItem(it); });
      li.appendChild(del);

      list.appendChild(li);
    });
    syncSelAll(showArr);
    updateBatchBtn();
    renderStorage();
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
      if (data.ok) { loadList(); showMsg($('mainMsg'), '顺序已更新', 'ok'); }
      else showMsg($('mainMsg'), data.error || '操作失败', 'err');
    });
  }

  function rename(it) {
    var t = prompt('修改显示名称：', it.title);
    if (t === null) return;
    t = t.trim();
    if (!t || t === it.title) return;
    api('/api/admin/media/' + it.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t })
    }).then(function (data) {
      if (data.ok) { it.title = t; renderList(); showMsg($('mainMsg'), '已改名', 'ok'); }
      else showMsg($('mainMsg'), data.error || '操作失败', 'err');
    });
  }

  function removeItem(it) {
    if (!confirm('确定删除「' + it.title + '」吗？文件会一并从存储里删除，不可恢复。')) return;
    api('/api/admin/media/' + it.id, { method: 'DELETE' }).then(function (data) {
      if (data.ok) { loadList(); showMsg($('mainMsg'), '已删除', 'ok'); }
      else showMsg($('mainMsg'), data.error || '删除失败', 'err');
    });
  }

  function deleteSelected() {
    var ids = (items[currentType] || []).filter(function (it) { return selected[it.id]; });
    if (!ids.length) return;
    if (!confirm('确定删除所选 ' + ids.length + ' 项吗？文件会一并从存储里删除，不可恢复。')) return;
    var left = ids.length;
    ids.forEach(function (it) {
      api('/api/admin/media/' + it.id, { method: 'DELETE' }).then(function (data) {
        if (data.ok) delete selected[it.id];
        if (--left === 0) {
          loadList();
          showMsg($('mainMsg'), '批量删除完成', 'ok');
        }
      }).catch(function () {
        if (--left === 0) { loadList(); showMsg($('mainMsg'), '部分删除失败，请重试', 'err'); }
      });
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
    if (e.key === 'Escape' && !$('previewModal').hidden) closePreview();
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
  function renderUsers() {
    var list = $('userList');
    list.innerHTML = '';
    $('userEmpty').hidden = users.length > 0;
    users.forEach(function (u) {
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
      meta.textContent = '注册于 ' + fmtDate(u.created_at);

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
    if (banned && !confirm('禁用「' + u.username + '」？该用户会立即被踢下线且无法再登录。')) return;
    api('/api/admin/users/' + u.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banned: banned })
    }).then(function (data) {
      if (data.ok) { loadUsers(); showMsg($('userMsg'), banned ? '已禁用' : '已解封', 'ok'); }
      else showMsg($('userMsg'), data.error || '操作失败', 'err');
    });
  }

  function removeUser(u) {
    if (!confirm('彻底删除账号「' + u.username + '」？此操作不可恢复。')) return;
    api('/api/admin/users/' + u.id, { method: 'DELETE' }).then(function (data) {
      if (data.ok) { loadUsers(); showMsg($('userMsg'), '账号已删除', 'ok'); }
      else showMsg($('userMsg'), data.error || '删除失败', 'err');
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
          if (d.ok) { currentAccent = d.accent; renderAccents(); showMsg($('appearMsg'), '默认主题色已保存，前台即刻生效', 'ok'); }
          else showMsg($('appearMsg'), d.error || '保存失败', 'err');
        }).catch(function () { showMsg($('appearMsg'), '网络错误', 'err'); });
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
      } else if (d._status === 401) {
        show('login');
      }
    }).catch(function () {});
  }

  $('bgUploadBtn2').addEventListener('click', function () { $('bgFileInput').click(); });
  $('bgFileInput').addEventListener('change', function () {
    var f = this.files[0];
    this.value = '';
    if (!f) return;
    showMsg($('appearMsg'), '正在上传背景图…');
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
        if (d.ok) { renderBgPreview(d.bg); showMsg($('appearMsg'), '默认背景图已更新', 'ok'); }
        else showMsg($('appearMsg'), d.error || '上传失败', 'err');
      })
      .catch(function () { showMsg($('appearMsg'), '网络错误，上传失败', 'err'); });
  });
  $('bgClearBtn2').addEventListener('click', function () {
    if (!confirm('清除默认背景图？访客将回到网站自带背景。')) return;
    api('/api/admin/appearance/background', { method: 'DELETE' }).then(function (d) {
      if (d.ok) { renderBgPreview(null); showMsg($('appearMsg'), '已清除', 'ok'); }
      else showMsg($('userMsg'), d.error || '操作失败', 'err');
    });
  });

  // ---------- 标签页 ----------
  var tabs = document.querySelectorAll('.tabs button');
  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabs.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentType = btn.getAttribute('data-type');
      var isUsers = currentType === 'users';
      var isAppear = currentType === 'appearance';
      $('mediaPanel').hidden = isUsers || isAppear;
      $('userPanel').hidden = !isUsers;
      $('appearancePanel').hidden = !isAppear;
      if (isAppear) {
        loadAppearance();
      }
      if (!isUsers && !isAppear) {
        $('fileInput').accept = TYPE_EXT[currentType];
        $('titleInput').value = '';
        selected = {}; // 换标签页清空勾选和搜索
        $('searchInput').value = '';
        $('selAll').checked = false;
        $('batchDelBtn').hidden = true;
        renderList();
      }
    });
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
      if (!pending.length) return; // 没有缺的，静默结束
      showMsg($('mainMsg'), '正在同步静态媒体… 剩余 ' + pending.length + ' 个');
      var type = pending[0].type;
      var batch = [];
      while (batch.length < 12 && pending.length && pending[0].type === type) batch.push(pending.shift());
      api('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, files: batch })
      }).then(function (d) {
        if (!d.ok) { showMsg($('mainMsg'), d.error || '同步失败', 'err'); pending = []; }
        loadList().then(runImport);
      }).catch(function () {
        showMsg($('mainMsg'), '网络错误，同步中断（重新打开后台会自动续传）', 'err');
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
      showMsg($('mainMsg'), m, 'err');
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
        showMsg($('mainMsg'), msg, failCount ? 'err' : 'ok');
        loadList();
        return;
      }
      var f = queue[i++];
      $('queueInfo').textContent = '正在上传 ' + i + '/' + queue.length + '：' + f.name + '（' + fmtSize(f.size) + '）';
      var form = new FormData();
      form.append('type', currentType);
      if (queue.length === 1 && $('titleInput').value.trim()) form.append('title', $('titleInput').value.trim());
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
      showMsg($('mainMsg'), '请先选择文件', 'err'); return;
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
