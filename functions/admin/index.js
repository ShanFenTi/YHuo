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
    padding: 40px 16px;
    background: #f5f5f7; color: #1d1d1f;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  header { width: 100%; max-width: 760px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  header h1 { font-size: 20px; font-weight: 600; }
  .card {
    width: 100%; max-width: 760px;
    background: #fff; border-radius: 16px; padding: 28px;
    box-shadow: 0 1px 3px rgba(0,0,0,.08);
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
  }
  button:hover { background: #0077ed; }
  button.ghost { background: #e8e8ed; color: #1d1d1f; }
  button.ghost:hover { background: #dddde2; }
  button.danger { background: #e8e8ed; color: #d70015; }
  button:disabled { opacity: .5; cursor: default; }
  .msg { min-height: 18px; font-size: 13px; margin-top: 10px; }
  .msg.err { color: #d70015; }
  .msg.ok { color: #008a00; }
  .tabs { display: flex; gap: 8px; margin-bottom: 20px; }
  .tabs button { background: #e8e8ed; color: #1d1d1f; }
  .tabs button.active { background: #1d1d1f; color: #fff; }
  .upload-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; padding: 14px; background: #f5f5f7; border-radius: 12px; }
  .upload-row input[type=text] { flex: 1 1 160px; margin: 0; }
  .upload-row input[type=file] { font-size: 13px; max-width: 260px; }
  .progress { height: 4px; background: #e8e8ed; border-radius: 2px; margin-top: 12px; overflow: hidden; display: none; }
  .progress i { display: block; height: 100%; width: 0; background: #0071e3; transition: width .2s; }
  ul.list { list-style: none; padding: 0; margin-top: 18px; }
  ul.list li {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 4px; border-bottom: 1px solid #f0f0f2; font-size: 14px;
  }
  ul.list li .title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
  ul.list li .title:hover { color: #0071e3; }
  ul.list li .meta { color: #86868b; font-size: 12px; white-space: nowrap; }
  ul.list li button { padding: 5px 10px; font-size: 12px; border-radius: 8px; }
  .empty { color: #86868b; font-size: 14px; text-align: center; padding: 30px 0; }
  [hidden] { display: none !important; }
  footer { margin-top: 24px; font-size: 12px; color: #86868b; }
  footer a { color: inherit; }
</style>
</head>
<body>
<header>
  <h1>YHuo 管理后台</h1>
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

<div class="card" id="mainCard" hidden>
  <div class="tabs">
    <button data-type="music" class="active">音乐</button>
    <button data-type="video">视频</button>
    <button data-type="image">图片</button>
  </div>

  <div class="upload-row">
    <input type="file" id="fileInput">
    <input type="text" id="titleInput" placeholder="显示名称（可选，默认用文件名）">
    <button id="uploadBtn">上传</button>
  </div>
  <div class="progress" id="progress"><i id="progressBar"></i></div>
  <div class="msg" id="mainMsg"></div>

  <ul class="list" id="list"></ul>
  <div class="empty" id="empty" hidden>还没有内容，先上传一个文件吧。</div>
</div>

<footer>文件存放在 Cloudflare KV（单文件上限 24MB），删除即彻底删除，操作前请确认。</footer>

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
  function showMsg(el, text, cls) {
    el.textContent = text || '';
    el.className = 'msg' + (cls ? ' ' + cls : '');
  }

  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    return fetch(path, opts).then(function (res) {
      return res.json().catch(function () { return { ok: false, error: '响应异常' }; })
        .then(function (data) { data._status = res.status; return data; });
    });
  }

  // ---------- 状态切换 ----------
  function show(name) {
    $('setupCard').hidden = name !== 'setup';
    $('loginCard').hidden = name !== 'login';
    $('mainCard').hidden = name !== 'main';
    $('logoutBtn').hidden = name !== 'main';
  }

  function loadStatus() {
    api('/api/auth/status').then(function (data) {
      if (!data || !data.ok) { show('login'); return; }
      if (!data.initialized) show('setup');
      else if (data.authenticated) enterMain();
      else show('login');
    }).catch(function () { show('login'); });
  }

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
  }

  function loadList() {
    api('/api/admin/media').then(function (data) {
      if (data.ok) {
        items = data.items;
        renderList();
      } else if (data._status === 401) {
        show('login');
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

      li.appendChild(title); li.appendChild(meta); li.appendChild(up); li.appendChild(down); li.appendChild(del);
      list.appendChild(li);
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
    api('/api/admin/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type, ids: ids })
    }).then(function (data) {
      if (data.ok) loadList();
      else showMsg($('mainMsg'), data.error || '操作失败', 'err');
    });
  }

  // ---------- 上传（XHR 以显示进度） ----------
  var tabs = document.querySelectorAll('.tabs button');
  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabs.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentType = btn.getAttribute('data-type');
      $('fileInput').accept = TYPE_EXT[currentType];
      $('titleInput').value = '';
      renderList();
    });
  });
  $('fileInput').accept = TYPE_EXT.music;

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
