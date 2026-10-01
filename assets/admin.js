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
  // 单行输入按 Enter 直接触发对应按钮（登录/初始化；不改任何提交逻辑，只是少点一次）
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
    // 消费点全是 D1 datetime('now')（UTC 串）：补 Z 转本地再显示（与 fmtRel 同口径），
    // 此前直出 UTC 串，北京时区看到的注册/上传/创建时间都差 8 小时
    if (!s) return '';
    var str = String(s);
    var d = new Date(/Z$|[+-]\d\d:?\d\d$/.test(str) ? str : str.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return str.slice(0, 16);
    function p(x) { return x < 10 ? '0' + x : x; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
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
    loadVisits();
    loadAiUsage();
    loadTodayMessages(); // 概览「今日留言」卡
    loadMailUsage();
    // 先拿身份（角色）再按角色补超管专属数据；普通管理员不拉用户列表（接口会 403）
    loadMe().then(function () { if (myRole === 'super') loadUsers(); }).catch(function () {});
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
  // 今日留言（2026-09-15）：公开 /api/messages 翻页取今天（北京时间 created_at 前缀）的条目做计数，
  // 「AI 总结今日」把留言拼进 prompt 送 /api/admin/ai/complete。最多翻 4 页（120 条）兜底。
  var todayMsgCache = [];
  function bjTodayStr() {
    var d = new Date(Date.now() + 8 * 3600 * 1000);
    return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
  }
  // messages.created_at 是 D1 CURRENT_TIMESTAMP 的 UTC 时间（前端渲染时才转北京时区）——
  // "今天的留言" = UTC 时间落在 [北京当天 00:00, +1 天) 窗口内，不能直接按日期前缀比
  function bjTodayWindow() {
    var start = Date.parse(bjTodayStr() + 'T00:00:00+08:00');
    return [start, start + 86400000];
  }
  function loadTodayMessages() {
    todayMsgCache = [];
    $('todayMsgSumm').textContent = '';
    $('aiMsgSummaryOut').hidden = true;
    $('aiMsgSummaryOut').textContent = '';
    var out = $('todayMsgBody');
    out.textContent = '加载中…';
    var all = [], offset = 0;
    var win = bjTodayWindow();
    (function pull() {
      fetch('/api/messages?offset=' + offset, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)); })
        .then(function (d) {
          var list = (d && d.ok && Array.isArray(d.list)) ? d.list : [];
          var more = true;
          for (var k = 0; k < list.length; k++) {
            var t = Date.parse(String(list[k].created_at || '').replace(' ', 'T') + 'Z');
            if (!isNaN(t) && t < win[0]) { more = false; break; } // 已翻到昨天，停止
            if (!isNaN(t) && t < win[1]) all.push(list[k]);
          }
          if (more && (d.hasMore || list.length >= 30) && offset < 90) { offset += 30; pull(); return; }
          todayMsgCache = all;
          if (!all.length) { out.textContent = '今天还没有留言。'; return; }
          var guests = all.filter(function (m) { return m.isGuest; }).length;
          var latest = new Date(Date.parse(String(all[0].created_at || '').replace(' ', 'T') + 'Z') + 8 * 3600 * 1000);
          var hhmm = ('0' + latest.getUTCHours()).slice(-2) + ':' + ('0' + latest.getUTCMinutes()).slice(-2);
          out.textContent = '今天已有 ' + all.length + ' 条留言' + (guests ? '（其中路人 ' + guests + ' 条）' : '') +
            '，最新一条 ' + hhmm + '。点「AI 总结今日」让默认模型概括今天的留言氛围。';
        })
        .catch(function () { out.textContent = '留言加载失败（接口异常）。'; });
    })();
  }
  $('aiMsgSummaryBtn').addEventListener('click', function () {
    var btn = this;
    if (!todayMsgCache.length) { toast('今天还没有留言可总结', 'err'); return; }
    btn.disabled = true;
    var out = $('aiMsgSummaryOut');
    out.hidden = false;
    out.textContent = 'AI 总结中…';
    var lines = todayMsgCache.map(function (m, i) {
      var who = m.isAdmin ? '[站长] ' : (m.isGuest ? '[路人] ' : '');
      return (i + 1) + '. ' + who + (m.username || '匿名') + '：' + String(m.content || '').slice(0, 80);
    }).join('\\n');
    api('/api/admin/ai/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '以下是一个个人站点留言板今天（' + bjTodayStr() + '）的全部留言，按时间从新到旧。请用 3~5 句话总结今天的留言氛围和大家主要在聊什么；如果有需要站长回复、答疑或处理的内容，请在最后单独用一小段点出来。不要逐条复述，不要输出任何前后缀解释。留言：\\n' + lines
      })
    }).then(function (r) {
      btn.disabled = false;
      if (!r.ok) { out.textContent = r.error || '总结失败'; return; }
      out.textContent = String(r.reply || '').trim() || '（模型返回为空）';
      $('todayMsgSumm').textContent = '已总结 ' + todayMsgCache.length + ' 条';
    }).catch(function () {
      btn.disabled = false;
      out.textContent = '总结失败（网络异常）';
    });
  });

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
    // D1 的 datetime('now') 是 UTC 的 "YYYY-MM-DD HH:MM:SS"：补 Z 再交给 Date——
    // 否则按本地时区解析又原样格式化回去，等于零转换直出 UTC（北京时区差 8 小时）
    var d = new Date(String(iso || '').replace(' ', 'T') + 'Z');
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

  // ---------- 管理员页（2026-09-30 多管理员分级；仅超管可见，接口侧另有角色闸） ----------
  var adminsCache = [];
  function loadAdmins() {
    var wrap = $('admListWrap');
    wrap.innerHTML = '<div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div>';
    api('/api/admin/admins').then(function (d) {
      if (!d.ok) { wrap.textContent = '加载失败：' + (d.error || '未知错误'); return; }
      adminsCache = d.items || [];
      renderAdmins();
    }).catch(function () { wrap.textContent = '网络错误，稍后再试'; });
  }
  function renderAdmins() {
    var wrap = $('admListWrap');
    if (!adminsCache.length) { wrap.textContent = '还没有管理员账号。'; return; }
    var html = '<table class="data-table"><thead><tr><th>ID</th><th>用户名</th><th>角色</th><th>状态</th><th>创建时间</th><th class="num">活跃会话</th><th style="text-align:right">操作</th></tr></thead><tbody>';
    adminsCache.forEach(function (a) {
      var self = a.id === myId;
      html += '<tr>'
        + '<td class="num">' + a.id + '</td>'
        + '<td>' + escapeHtml(a.username) + (self ? ' <span class="chip-tag ok">当前账号</span>' : '') + '</td>'
        + '<td>' + (a.role === 'super' ? '超级管理员' : '管理员') + '</td>'
        + '<td>' + (a.banned ? '<span class="chip-tag banned">已禁用</span>' : '<span class="chip-tag ok">正常</span>') + '</td>'
        + '<td>' + fmtDate(a.created_at) + '</td>'
        + '<td class="num">' + (a.active_sessions || 0) + '</td>'
        + '<td style="text-align:right;white-space:nowrap">';
      if (self) {
        html += '<span class="meta2">改密码请在「我的」页</span>';
      } else {
        html += '<button class="ghost adm-act" data-id="' + a.id + '" data-do="reset">重置密码</button> '
          + '<button class="ghost adm-act" data-id="' + a.id + '" data-do="ban">' + (a.banned ? '启用' : '禁用') + '</button> '
          + '<button class="danger adm-act" data-id="' + a.id + '" data-do="del">删除</button>';
      }
      html += '</td></tr>';
    });
    html += '</tbody></table><p class="meta2" style="margin-top:10px">超级管理员只有首建的那一个，其余管理员均由用户列表「授权」产生。守护规则：不能操作当前账号；任何会让「可用的超级管理员」归零的操作（禁用 / 删除超管）都会被拒绝——站点永远留得住一个能进后台的人。管理动作记入「我的」页最近记录（[管理] 前缀）。</p>';
    wrap.innerHTML = html;
  }
  function admPost(body, done) {
    api('/api/admin/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (d) {
      if (d.ok) { if (done) done(d); else loadAdmins(); }
      else toast(d.error || '操作失败', 'bad');
    }).catch(function () { toast('网络错误', 'bad'); });
  }
  document.getElementById('admListWrap').addEventListener('click', function (e) {
    var btn = e.target.closest('button.adm-act');
    if (!btn) return;
    var id = Number(btn.getAttribute('data-id'));
    var a = adminsCache.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    var doWhat = btn.getAttribute('data-do');
    if (doWhat === 'reset') {
      ask({
        title: '重置 ' + a.username + ' 的密码',
        msg: '其全部登录会话会被踢出，需用新密码重新登录。',
        input: true,
        placeholder: '新密码（至少 6 位）',
        okText: '重置',
        cb: function (ok, val) {
          if (!ok) return;
          if (!val || val.length < 6 || val.length > 100) { toast('密码需 6-100 位', 'bad'); return; }
          admPost({ action: 'reset-password', id: id, password: val });
        },
      });
    } else if (doWhat === 'ban') {
      var toBan = !a.banned;
      ask({
        title: (toBan ? '禁用' : '启用') + '管理员 ' + a.username + '？',
        msg: toBan ? '禁用后立即踢出其全部会话，无法再登录。' : '恢复登录与操作权限。',
        danger: toBan,
        okText: toBan ? '禁用' : '启用',
        cb: function (ok) { if (ok) admPost({ action: 'set-banned', id: id, banned: toBan }); },
      });
    } else if (doWhat === 'del') {
      ask({
        title: '删除管理员 ' + a.username + '？',
        msg: '账号与其全部会话一并删除，不可恢复（登录记录保留）；其前台账号（若有同名注册用户）不受影响。',
        danger: true,
        okText: '删除',
        cb: function (ok) { if (ok) admPost({ action: 'delete', id: id }); },
      });
    }
  });

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

      // 同名管理员账号标记（GET /api/admin/users 按用户名比对 admin_users 下发）：
      // 已是管理员的行不再给「授权」钮，防止撞 UNIQUE
      var admBadge = null;
      if (u.is_admin) {
        admBadge = document.createElement('span');
        admBadge.className = 'chip-tag mono';
        admBadge.textContent = u.admin_role === 'super' ? '超管' : '管理员';
        admBadge.title = '该用户名已有管理员账号（下方管理员列表中）';
      }

      var meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = '注册于 ' + fmtDate(u.created_at) + ' · ' + fmtRel(u.last_seen_at)
        + (u.email ? ' · ' + u.email + (u.twofa_enabled ? '（2FA）' : '') : '');

      var actions = document.createElement('div');
      actions.className = 'row-actions';
      if (!u.is_admin) {
        var promote = document.createElement('button');
        promote.className = 'ghost';
        promote.textContent = '授权';
        promote.title = '授权为管理员（密码沿用其前台密码）';
        promote.addEventListener('click', function () {
          ask({
            title: '授权 ' + u.username + ' 为管理员？',
            msg: '管理员密码沿用其前台密码，对方立即可用现有密码登录后台；之后两边改密互不影响。被禁用的账号需先解封才能授权。',
            okText: '确认授权',
            cb: function (ok) {
              if (!ok) return;
              admPost({ action: 'promote', userId: u.id }, function () {
                toast('已授权 ' + u.username + '（密码沿用前台账号，立即可登后台）', 'ok');
                // 两个列表都刷：用户行要换成管理员徽标、管理员列表要出现新行
                loadUsers();
                loadAdmins();
              });
            },
          });
        });
        actions.appendChild(promote);
      }
      var ban = document.createElement('button');
      ban.className = 'ghost';
      ban.textContent = u.banned ? '解封' : '禁用';
      ban.addEventListener('click', function () { setBanned(u, !u.banned); });

      var del = document.createElement('button');
      del.className = 'danger';
      del.textContent = '删除';
      del.addEventListener('click', function () { removeUser(u); });

      actions.appendChild(ban); actions.appendChild(del);
      li.appendChild(avatar); li.appendChild(title); li.appendChild(badge);
      if (admBadge) li.appendChild(admBadge);
      li.appendChild(meta);
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
  var emailRegReqNow = true; // 注册必须邮箱（2026-10-01）：缺省强制，兼容老配置
  function emailStateText(enabled) {
    $('emailStateText').textContent = enabled
      ? '已启用：' + (emailAdminOnlyNow ? '仅站长可用（找回密码/绑定/2FA 限站长邮箱）' : (emailRegReqNow ? '前台注册需邮箱验证，找回密码/二次验证可用' : '前台注册邮箱可选，找回密码/二次验证可用'))
      : '未启用：前台不显示邮箱相关功能';
    $('emailToggleBtn').textContent = enabled ? '停用' : '启用';
  }
  function emailAdminOnlyText(on) {
    $('emailAdminOnlyText').textContent = on
      ? '已开启：普通用户不出现邮箱功能，只有站长邮箱可用（适合无域名只能发自己的场景）'
      : '关闭：所有用户可用邮箱功能';
    $('emailAdminOnlyBtn').textContent = on ? '关闭"仅站长使用"' : '开启"仅站长使用"';
  }
  function emailRegReqText(on) {
    $('emailRegReqText').textContent = on
      ? '已开启：注册必须验证邮箱'
      : '已关闭：注册页出「使用邮箱注册」勾选框，访客可自选纯用户名注册（之后可在个人主页绑定邮箱）';
    $('emailRegReqBtn').textContent = on ? '关闭"注册必须邮箱"' : '开启"注册必须邮箱"';
  }
  function loadEmailSettings() {
    api('/api/admin/email').then(function (d) {
      if (!d.ok) { toast(d.error || '读取邮件配置失败', 'err'); return; }
      emailEnabledNow = !!d.enabled;
      emailAdminOnlyNow = !!d.adminOnly;
      emailRegReqNow = d.registerRequireEmail !== false;
      $('emailProviderDrop').value = d.provider;
      $('emailFrom').value = d.from || '';
      $('emailApiKey').value = '';
      $('emailApiKey').placeholder = d.keySet ? '留空保持不变' : 're_…（Resend）/ xkeysib-…（Brevo）';
      $('emailKeyHint').textContent = d.keySet ? '已保存（尾 4 位 ' + d.keyTail + '）；输入框留空 = 不修改' : '未设置';
      $('emailOwnerInput').value = d.ownerEmail || '';
      emailAdminOnlyText(emailAdminOnlyNow);
      emailRegReqText(emailRegReqNow);
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
        register_require_email: opts.register_require_email != null ? opts.register_require_email : emailRegReqNow,
      })
    }).then(function (d) {
      if (d.ok) {
        emailEnabledNow = !!d.enabled;
        emailRegReqNow = d.registerRequireEmail !== false;
        $('emailApiKey').value = '';
        loadEmailSettings();
        if (done) done(d);
      } else toast(d.error || '保存失败', 'err');
    }).catch(function () { toast('网络错误', 'err'); });
  }
  $('emailRegReqBtn').addEventListener('click', function () {
    saveEmailConfig({ enabled: emailEnabledNow, admin_only: emailAdminOnlyNow, register_require_email: !emailRegReqNow }, function (d) {
      toast(d.registerRequireEmail ? '注册必须验证邮箱' : '注册邮箱改为可选，访客可自选', 'ok');
    });
  });
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
      else if (last.holiday) seg += ' · 节假日停发（' + last.holiday + '）';
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
      // 节假日表（超管专属区块）：显示站长配置原文 + 当前生效表与今天是否命中
      if (d.holidays) {
        $('schedHoliInput').value = d.holidays.configured || '';
        var eff = d.holidays.none
          ? '未启用（none：节假日照常提醒）'
          : '当前生效 ' + (d.holidays.effective || []).length + ' 条：' + (d.holidays.effective || []).join('、');
        $('schedHoliEff').textContent = eff + (d.holidays.today ? '　⚠ 今天命中：' + d.holidays.today + '（提醒整天停发）' : '　· 今天不是假日');
      }
    }).catch(function () {});
  }
  $('schedHoliSaveBtn').addEventListener('click', function () {
    var msg = $('schedHoliMsg');
    msg.textContent = '保存中…';
    api('/api/admin/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-holidays', value: $('schedHoliInput').value })
    }).then(function (d) {
      if (d.ok) {
        msg.textContent = '已保存';
        loadSchedTick();
      } else {
        msg.textContent = d.error || '保存失败';
      }
    }).catch(function () { msg.textContent = '网络错误'; });
  });
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
    notePolishReset();
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

  // AI 润色（2026-09-15）：正文送 /api/admin/ai/complete（非流式、默认模型），结果落预览区，
  // 「应用」才写回 textarea——预览期正文原样不动，防丢稿。失败只报错不影响正文。
  var notePolishText = '';
  function notePolishReset() {
    notePolishText = '';
    $('notePolishBox').hidden = true;
    $('notePolishText').value = '';
    $('notePolishMeta').textContent = '';
  }
  $('notePolishBtn').addEventListener('click', function () {
    var btn = this;
    var text = $('noteText').value.trim();
    if (!text) { noteFormMsg('正文是空的，没东西可润色', true); return; }
    btn.disabled = true;
    noteFormMsg('AI 润色中…（走后台默认模型，通常几秒）');
    notePolishReset();
    api('/api/admin/ai/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '请把下面这段随笔正文润色一遍：保持原意与第一人称口吻，修正错别字与不通顺的句子，理顺标点；不要添加新观点、不要翻译成英文、不要输出任何解释或前后缀，只输出润色后的正文本身。原文：\\n' + text
      })
    }).then(function (r) {
      btn.disabled = false;
      if (!r.ok) { noteFormMsg(r.error || '润色失败', true); return; }
      notePolishText = String(r.reply || '').trim();
      if (!notePolishText) { noteFormMsg('模型返回了空内容', true); return; }
      noteFormMsg('');
      $('notePolishText').value = notePolishText;
      $('notePolishMeta').textContent = (r.name || '') + ' · ' + ((r.ms || 0) / 1000).toFixed(1) + 's';
      $('notePolishBox').hidden = false;
    }).catch(function () {
      btn.disabled = false;
      noteFormMsg('润色失败（网络异常）', true);
    });
  });
  $('notePolishApply').addEventListener('click', function () {
    if (!notePolishText) return;
    $('noteText').value = notePolishText;
    notePolishReset();
    noteFormMsg('已把润色稿写回正文，满意就点「保存」。');
  });
  $('notePolishDiscard').addEventListener('click', function () { notePolishReset(); });

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
    return api('/api/admin/me').then(function (d) {
      if (!d.ok) return;
      // 多管理员分级：身份与角色落在 UI（导航隐藏/区块隐藏只是体验层，接口侧另有角色闸）
      myRole = d.role === 'super' ? 'super' : 'admin';
      myId = d.id || 0;
      applyRoleUI();
      $('meName').textContent = (d.username || '管理员') + (myRole === 'super' ? '（超级管理员）' : '（管理员）');
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
  // 多管理员分级：当前登录管理员的角色与 id（loadMe 拉取）。默认低权限——loadMe 拿不到
  // 身份（网络失败等）时按普通管理员渲染（超管入口藏着），接口侧的角色闸仍是真边界
  var myRole = 'admin';
  var myId = 0;
  function applyRoleUI() {
    document.body.classList.toggle('role-limited', myRole !== 'super');
    // 正停在超管专属页时（如被降级的瞬间）重放当前页——switchPage 的角色闸会弹回概览
    switchPage(currentType);
  }

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
    // 角色闸（2026-09-30）：普通管理员只进内容运营页——邮件页整体超管专属（尾部调整：
    // 含课表测试发送），用户/管理员/外观/AI 本就超管专属；误入（预览消息/降级瞬间）弹回概览
    if (myRole !== 'super' && (type === 'accounts' || type === 'appearance' || type === 'ai' || type === 'email')) type = 'overview';
    currentType = type;
    navBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-type') === type); });
    var isOverview = type === 'overview';
    var isAccounts = type === 'accounts';
    var isAppear = type === 'appearance';
    var isAi = type === 'ai';
    var isEmail = type === 'email';
    var isMe = type === 'me';
    var isStatus = type === 'status';
    var isNotes = type === 'notes';
    $('overviewPanel').hidden = !isOverview;
    $('mediaPanel').hidden = isOverview || isAccounts || isAppear || isAi || isEmail || isMe || isStatus || isNotes;
    $('notesPanel').hidden = !isNotes;
    $('accountsPanel').hidden = !isAccounts;
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
      loadTodayMessages(); // 今日留言卡同刷
      loadMailUsage(); // 邮件统计同刷
    }
    if (isAppear) {
      loadAppearance();
    }
    if (isAi) {
      loadAiSettings();
    }
    if (isEmail) {
      // 服务配置与 tick 密钥是超管专属接口；普通管理员进邮件页只见课表测试发送区
      if (myRole === 'super') {
        loadEmailSettings();
        loadSchedTick();
      }
    }
    if (isMe) {
      loadMe();
    }
    if (isStatus) {
      renderStatus();
      if (myRole === 'super') loadBackupCard(); // 数据备份卡超管专属（接口按角色 403）
      loadRumCard(); // 前端错误卡同刷：新上报随时进来看最新
    }
    if (isNotes) {
      noteResetForm(); // 每次进页表单归零（日期预填今天），防上次的编辑草稿串场
      loadNotes();
    }
    if (isAccounts) {
      $('userSearch').value = ''; // 换进来重置搜索
      var usb = $('userSearch').closest('.search-box');
      if (usb) usb.classList.remove('has-value');
      loadUsers(); // 两个列表都拉：授权后两边（用户行管理员徽标 / 管理员账号列表）都要即时反映
      loadAdmins();
    }
    if (!isOverview && !isAccounts && !isAppear && !isAi && !isEmail && !isMe && !isStatus && !isNotes) {
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
      isAccounts ? $('accountsPanel') :
      isAppear ? $('appearancePanel') :
      isAi ? $('aiPanel') :
      isEmail ? $('emailPanel') :
      isMe ? $('mePanel') :
      isStatus ? $('statusPanel') :
      isNotes ? $('notesPanel') : $('mediaPanel');
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
      accounts: { name: '账号', desc: '用户与管理员 · 授权 / 角色 / 重置密码' },
      appearance: { name: '外观', desc: '主题色 / 寄语 / 功能开关 / 播放器款式' },
      ai: { name: 'AI', desc: 'AI 供应商 / 模型 / 全局开关' },
      email: { name: '邮件', desc: '邮件服务 / 验证码 / 课表提醒定时任务' },
      notes: { name: '随笔', desc: '随笔管理 · 新增 / 编辑 / 删除 / 静态清单导入' },
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

  // 大图上传前本地压缩（2026-09-15）：仅图片页、仅 >500KB 且 ≤20MB（再大解码内存不划算），
  // 长边压到 1920、WebP q0.85（<img> 解码自带 EXIF 方向，canvas 出图方向正确）。
  // 任何失败/压不小/浏览器不支持 → 一律回落原文件，压缩绝不能挡上传；开关存 localStorage 默认开。
  function imgCompressOn() {
    try { return localStorage.getItem('adminImgCompress') !== '0'; } catch (e) { return true; }
  }
  function compressUploadFile(f, cb) {
    try {
      // 注意：这里不能写 /image\// 正则——原始源码要写单反斜杠、模板求值后要双反斜杠，二者不可兼得
      //（步骤[1]查原始、步骤[5]查求值后），字符串 indexOf 两边都成立
      if (currentType !== 'image' || !imgCompressOn() || String(f.type || '').indexOf('image/') !== 0) { cb(f); return; }
      if (f.size <= 512 * 1024 || f.size > 20 * 1024 * 1024) { cb(f); return; }
      var url = URL.createObjectURL(f);
      var img = new Image();
      img.onload = function () {
        try {
          URL.revokeObjectURL(url);
          var w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) { cb(f); return; }
          var scale = Math.min(1, 1920 / Math.max(w, h));
          if (scale >= 1 && f.size <= 2 * 1024 * 1024) { cb(f); return; } // 不需要缩且不算大，不强行重编码
          var cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(w * scale));
          cv.height = Math.max(1, Math.round(h * scale));
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          if (!cv.toBlob) { cb(f); return; }
          cv.toBlob(function (blob) {
            if (!blob || blob.size >= f.size) { cb(f); return; } // 压不小就不硬压
            var ext = blob.type === 'image/webp' ? '.webp' : (blob.type === 'image/png' ? '.png' : '.jpg');
            var out;
            try { out = new File([blob], String(f.name || 'image').replace(/\\.[^.]+$/, '') + ext, { type: blob.type }); }
            catch (e) { cb(f); return; }
            cb(out, '已压缩 ' + fmtSize(f.size) + ' → ' + fmtSize(out.size));
          }, 'image/webp', 0.85);
        } catch (e) { cb(f); }
      };
      img.onerror = function () { try { URL.revokeObjectURL(url); } catch (e) {} cb(f); };
      img.src = url;
    } catch (e) { cb(f); }
  }
  $('imgCompressToggle').checked = imgCompressOn();
  $('imgCompressToggle').addEventListener('change', function () {
    try { localStorage.setItem('adminImgCompress', this.checked ? '1' : '0'); } catch (e) {}
  });

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
      var head = '正在上传 ' + i + '/' + queue.length + '：' + f.name + '（' + fmtSize(f.size) + '）';
      $('queueInfo').textContent = head;
      // send：真正上传一个文件（可能已被压缩替换过）；note = 压缩说明，拼在队列行里展示
      var send = function (file, note) {
        if (note) $('queueInfo').textContent = head + ' · ' + note;
        var form = new FormData();
        form.append('type', currentType);
        if (queue.length === 1 && $('titleInput').value.trim()) form.append('title', $('titleInput').value.trim());
        // 图片页选中了具体相册时，新上传直接归入该相册
        if (currentType === 'image' && albumFilter && albumFilter !== '__none__') form.append('album', albumFilter);
        form.append('file', file);
        if (file._lrc) form.append('lrc', file._lrc); // 同名配对的歌词附件

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
      };
      compressUploadFile(f, send);
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
