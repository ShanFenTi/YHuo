// GET /admin → 管理后台单页（首次使用显示初始化表单，未登录显示登录表单）
// 页面只是壳，所有数据操作都要过 /api/admin/* 的会话校验
import { html } from '../lib/util.js';

const PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>YHuo 管理后台</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body {
    min-height: 100vh;
    display: flex; flex-direction: column; align-items: center;
    padding: 36px 16px 60px;
    background: linear-gradient(180deg, #eef1f6 0%, #f5f5f7 240px);
    color: #1d1d1f;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  header { width: 100%; max-width: 860px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand .mark {
    width: 42px; height: 42px; border-radius: 12px;
    background: linear-gradient(135deg, #0a84ff, #5e5ce6);
    color: #fff; font-weight: 700; font-size: 15px; letter-spacing: .05em;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 16px rgba(10, 132, 255, .35);
  }
  .brand h1 { font-size: 19px; font-weight: 700; }
  .brand p { font-size: 12px; color: #86868b; margin-top: 2px; }
  .card {
    width: 100%; max-width: 860px;
    background: #fff; border-radius: 18px; padding: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 12px 32px rgba(0,0,0,.05);
  }
  .hint { color: #86868b; font-size: 13px; line-height: 1.6; margin-bottom: 16px; }
  input[type=text], input[type=password] {
    width: 100%; padding: 10px 12px; margin: 6px 0 14px;
    border: 1px solid #d2d2d7; border-radius: 10px; font-size: 15px; background: #fff; color: inherit;
  }
  input:focus { outline: 2px solid #0071e3; outline-offset: -1px; border-color: transparent; }
  button {
    padding: 9px 18px; border: none; border-radius: 10px; font-size: 14px;
    background: #0071e3; color: #fff; cursor: pointer;
    transition: background .15s, transform .1s, opacity .15s;
  }
  button:hover { background: #0077ed; }
  button:active { transform: scale(.97); }
  button.ghost { background: #ececf0; color: #1d1d1f; }
  button.ghost:hover { background: #e0e0e5; }
  button.danger { background: #ececf0; color: #d70015; }
  button.danger:hover { background: #fbe9eb; }
  button:disabled { opacity: .5; cursor: default; }
  .msg { min-height: 18px; font-size: 13px; margin-top: 10px; }
  .msg.err { color: #d70015; }
  .msg.ok { color: #008a00; }
  .tabs { display: flex; gap: 6px; margin-bottom: 20px; background: #ececf0; padding: 4px; border-radius: 12px; width: fit-content; }
  .tabs button { background: transparent; color: #1d1d1f; padding: 8px 18px; border-radius: 9px; }
  .tabs button.active { background: #fff; color: #1d1d1f; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.12); }
  .stats { width: 100%; max-width: 860px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 22px; }
  .stat {
    background: #fff; border-radius: 16px; padding: 16px 18px;
    box-shadow: 0 1px 3px rgba(0,0,0,.05);
    display: flex; align-items: center; gap: 14px;
  }
  .stat .ico { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-size: 19px; }
  .stat .num { font-size: 22px; font-weight: 700; line-height: 1.1; }
  .stat .lbl { font-size: 12px; color: #86868b; }
  .upload-row {
    display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
    padding: 14px; background: #f5f5f7; border-radius: 14px;
    border: 1.5px dashed #d2d2d7;
  }
  .upload-row input[type=text] { flex: 1 1 160px; margin: 0; }
  .upload-row input[type=file] { font-size: 13px; max-width: 260px; }
  .progress { height: 4px; background: #e8e8ed; border-radius: 2px; margin-top: 12px; overflow: hidden; display: none; }
  .progress i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #0a84ff, #5e5ce6); transition: width .2s; }
  ul.list { list-style: none; padding: 0; margin-top: 14px; }
  ul.list li {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 8px; border-bottom: 1px solid #f0f0f2; font-size: 14px;
    border-radius: 8px;
    transition: background .15s, box-shadow .15s;
  }
  ul.list li.dragging { opacity: .45; }
  ul.list li.dragover { box-shadow: inset 0 2px 0 #0a84ff; }
  ul.list li .handle { color: #c7c7cc; cursor: grab; font-size: 15px; letter-spacing: -2px; user-select: none; padding: 0 2px; }
  ul.list li .title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
  ul.list li .title:hover { color: #0071e3; }
  ul.list li .meta { color: #86868b; font-size: 12px; white-space: nowrap; }
  ul.list li button { padding: 5px 10px; font-size: 12px; border-radius: 8px; }
  .empty { color: #86868b; font-size: 14px; text-align: center; padding: 34px 0; }
  .avatar {
    width: 34px; height: 34px; border-radius: 50%; flex: none;
    color: #fff; font-size: 15px; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
  }
  .badge { font-size: 11px; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
  .badge.ok { background: #e8f6e8; color: #008a00; }
  .badge.banned { background: #fbe9eb; color: #d70015; }
  [hidden] { display: none !important; }
  footer { margin-top: 24px; font-size: 12px; color: #86868b; }
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
  <button id="logoutBtn" class="ghost" hidden>退出登录</button>
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
  <div class="stat"><div class="ico" style="background:#e8f1ff">🎵</div><div><div class="num" id="statMusic">0</div><div class="lbl">音乐</div></div></div>
  <div class="stat"><div class="ico" style="background:#f0ebff">🎬</div><div><div class="num" id="statVideo">0</div><div class="lbl">视频</div></div></div>
  <div class="stat"><div class="ico" style="background:#ffeef2">🖼️</div><div><div class="num" id="statImage">0</div><div class="lbl">图片</div></div></div>
  <div class="stat"><div class="ico" style="background:#e8f6e8">👥</div><div><div class="num" id="statUsers">0</div><div class="lbl">注册用户</div></div></div>
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
  var AVATAR_COLORS = ['#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f', '#ff9f0a', '#30d158', '#64d2ff'];
  var currentType = 'music';
  var items = { music: [], video: [], image: [] };
  var users = [];

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

      li.appendChild(handle); li.appendChild(title); li.appendChild(meta);
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
      avatar.style.background = AVATAR_COLORS[(u.username || '?').charCodeAt(0) % AVATAR_COLORS.length];
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
