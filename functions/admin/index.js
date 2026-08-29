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
</div>

<div class="card" id="mainCard" hidden>
  <div class="tabs">
    <button data-type="music" class="active">音乐</button>
    <button data-type="video">视频</button>
    <button data-type="image">图片</button>
    <button data-type="users">用户</button>
  </div>

  <div id="mediaPanel">
    <div class="upload-row">
      <input type="file" id="fileInput">
      <input type="text" id="titleInput" placeholder="显示名称（可选，默认用文件名）">
      <button id="uploadBtn">上传</button>
      <button id="importBtn" class="ghost" title="把仓库 images/1.jpg… 约定命名的静态图片导入后台统一管理">导入静态图片</button>
    </div>
    <div class="progress" id="progress"><i id="progressBar"></i></div>
    <div class="msg" id="mainMsg"></div>
    <ul class="list" id="list"></ul>
    <div class="empty" id="empty" hidden>还没有内容，先上传一个文件吧。也可以拖动条目调整顺序。</div>
  </div>

  <div id="userPanel" hidden>
    <div class="msg" id="userMsg"></div>
    <ul class="list" id="userList"></ul>
    <div class="empty" id="userEmpty" hidden>还没有用户注册。</div>
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
    loadList();
    loadUsers();
  }

  function refreshStats() {
    $('statMusic').textContent = items.music.length;
    $('statVideo').textContent = items.video.length;
    $('statImage').textContent = items.image.length;
    $('statUsers').textContent = users.length;
  }

  function loadList() {
    api('/api/admin/media').then(function (data) {
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

  function renderList() {
    var list = $('list');
    var arr = items[currentType] || [];
    list.innerHTML = '';
    $('empty').hidden = arr.length > 0;
    arr.forEach(function (it, i) {
      var li = document.createElement('li');
      li.draggable = true;

      var handle = document.createElement('span');
      handle.className = 'handle';
      handle.textContent = '⠿';
      handle.title = '拖动排序';

      li.appendChild(handle);

      // 图片类显示缩略图
      if (currentType === 'image' && it.r2_key) {
        var thumb = document.createElement('img');
        thumb.className = 'thumb';
        thumb.loading = 'lazy';
        thumb.src = '/media/' + it.r2_key;
        li.appendChild(thumb);
      }

      var title = document.createElement('span');
      title.className = 'title';
      title.textContent = it.title;
      title.title = '点击修改显示名称';
      title.addEventListener('click', function () { rename(it); });

      var meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = fmtSize(it.size);

      var up = document.createElement('button');
      up.className = 'ghost'; up.textContent = '↑'; up.disabled = i === 0;
      up.addEventListener('click', function () { move(currentType, i, -1); });

      var down = document.createElement('button');
      down.className = 'ghost'; down.textContent = '↓'; down.disabled = i === arr.length - 1;
      down.addEventListener('click', function () { move(currentType, i, 1); });

      var del = document.createElement('button');
      del.className = 'danger'; del.textContent = '删除';
      del.addEventListener('click', function () { removeItem(it); });

      li.appendChild(title); li.appendChild(meta);
      li.appendChild(up); li.appendChild(down); li.appendChild(del);
      addDragHandlers(li, currentType, i);
      list.appendChild(li);
    });
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

  // ---------- 标签页 ----------
  var tabs = document.querySelectorAll('.tabs button');
  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabs.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentType = btn.getAttribute('data-type');
      var isUsers = currentType === 'users';
      $('mediaPanel').hidden = isUsers;
      $('userPanel').hidden = !isUsers;
      if (!isUsers) {
        $('fileInput').accept = TYPE_EXT[currentType];
        $('titleInput').value = '';
        renderList();
      }
    });
  });
  $('fileInput').accept = TYPE_EXT.music;

  // ---------- 导入静态图片（images/1.jpg… 约定命名） ----------
  $('importBtn').addEventListener('click', function () {
    var btn = this; btn.disabled = true;
    if (currentType !== 'image') { showMsg($('mainMsg'), '请先切到"图片"标签页再导入', 'err'); btn.disabled = false; return; }
    showMsg($('mainMsg'), '正在扫描静态图片…');

    var exts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'];
    function probeNumber(n) {
      return new Promise(function (resolve) {
        var i = 0;
        function tryNext() {
          if (i >= exts.length) { resolve(null); return; }
          var ext = exts[i++];
          var img = new Image();
          img.onload = function () { resolve({ title: String(n), url: 'images/' + n + '.' + ext }); };
          img.onerror = tryNext;
          img.src = 'images/' + n + '.' + ext;
        }
        tryNext();
      });
    }
    // 逐个编号探测，连续 5 个编号都不存在就停（最多扫到 40）
    function scanAll() {
      var found = [];
      var n = 1, misses = 0;
      function step() {
        if (n > 40 || misses >= 5) return Promise.resolve(found);
        return probeNumber(n).then(function (r) {
          if (r) { found.push(r); misses = 0; } else { misses++; }
          n++;
          showMsg($('mainMsg'), '正在扫描静态图片… 已找到 ' + found.length + ' 张');
          return step();
        });
      }
      return step();
    }

    scanAll().then(function (found) {
      if (!found.length) {
        btn.disabled = false;
        showMsg($('mainMsg'), '没有发现静态图片（需按 images/1.jpg、2.webp… 约定命名）', 'err');
        return;
      }
      // 分批提交，单次最多 12 个（服务端子请求限制）
      var chunks = [];
      for (var i = 0; i < found.length; i += 12) chunks.push(found.slice(i, i + 12));
      var imported = 0, skipped = 0;
      function nextChunk() {
        if (!chunks.length) {
          btn.disabled = false;
          showMsg($('mainMsg'), '导入完成：新增 ' + imported + ' 张' + (skipped ? '，跳过 ' + skipped + ' 张（已存在或不可读）' : ''), imported ? 'ok' : 'err');
          loadList();
          return;
        }
        api('/api/admin/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'image', files: chunks.shift() })
        }).then(function (d) {
          if (d.ok) { imported += d.imported; skipped += (d.skipped || []).length; }
          else showMsg($('mainMsg'), d.error || '导入失败', 'err');
          nextChunk();
        }).catch(function () { showMsg($('mainMsg'), '网络错误，导入中断', 'err'); nextChunk(); });
      }
      nextChunk();
    });
  });

  // ---------- 上传（XHR 以显示进度） ----------
  $('uploadBtn').addEventListener('click', function () {
    var btn = this;
    var fileEl = $('fileInput');
    if (!fileEl.files || !fileEl.files.length) {
      showMsg($('mainMsg'), '请先选择文件', 'err'); return;
    }
    var form = new FormData();
    form.append('type', currentType);
    form.append('title', $('titleInput').value);
    form.append('file', fileEl.files[0]);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload');
    xhr.withCredentials = true;
    btn.disabled = true;
    $('progress').style.display = 'block';
    showMsg($('mainMsg'), '正在上传…');
    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable) {
        $('progressBar').style.width = Math.round(e.loaded / e.total * 100) + '%';
      }
    };
    xhr.onload = function () {
      btn.disabled = false;
      $('progress').style.display = 'none';
      $('progressBar').style.width = '0';
      var data = {};
      try { data = JSON.parse(xhr.responseText); } catch (e) {}
      if (xhr.status === 200 && data.ok) {
        fileEl.value = ''; $('titleInput').value = '';
        showMsg($('mainMsg'), '上传成功', 'ok');
        loadList();
      } else if (xhr.status === 401) {
        show('login');
      } else {
        showMsg($('mainMsg'), data.error || '上传失败', 'err');
      }
    };
    xhr.onerror = function () {
      btn.disabled = false;
      $('progress').style.display = 'none';
      showMsg($('mainMsg'), '网络错误，上传失败', 'err');
    };
    xhr.send(form);
  });

  loadStatus();
})();
</script>
</body>
</html>`;

export async function onRequestGet() {
  return html(PAGE);
}
