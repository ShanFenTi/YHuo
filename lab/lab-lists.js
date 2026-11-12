/* ============================================================
   Lab · 04 列表与导航
   SwipeRow / AnimatedList / LineSidebar / GooeyNav / PillNav / Stepper / JellyRadio
   ============================================================ */
(function () {
  'use strict';
  var RB = window.RB;

  /* ---------------- SwipeRow ---------------- */
  RB.demo('swipe-row', function (stage) {
    stage.innerHTML =
      '<div class="sw-list">' +
        row('今天的随笔写完了吗', '3 分钟前', '删除') +
        row('相册「达妮娅 · 官方」新增 14 张', '1 小时前', '归档') +
        row('课表提醒已停用', '昨天', '删除') +
        row('有人回复了你的留言', '2 天前', '标为已读') +
      '</div>' +
      '<p class="sw-tip">向左拖 → 露出操作；继续拖到底 → 松手执行</p>';
    function row(t, s, action) {
      return '<div class="sw-row"><div class="sw-actions"><button type="button">' + action + '</button></div>' +
        '<div class="sw-content"><b>' + t + '</b><span>' + s + '</span></div></div>';
    }
    Array.prototype.slice.call(stage.querySelectorAll('.sw-row')).forEach(function (rowEl) {
      var content = rowEl.querySelector('.sw-content');
      var actions = rowEl.querySelector('.sw-actions');
      var start = null, x = 0, open = false;
      function apply(v) {
        x = v;
        content.style.transform = 'translateX(' + v + 'px)';
      }
      content.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        try { content.setPointerCapture(e.pointerId); } catch (err) {}
        start = { x: e.clientX, base: x };
      });
      content.addEventListener('pointermove', function (e) {
        if (!start) return;
        var dx = e.clientX - start.x;
        apply(RB.clamp(start.base + dx, -170, 0));
      });
      function up() {
        if (!start) return;
        start = null;
        if (x < -140) {
          rowEl.classList.add('deleted');
          setTimeout(function () { rowEl.style.height = '0px'; rowEl.style.marginBottom = '0px'; }, 220);
        } else if (x < -55) { open = true; apply(-112); }
        else { open = false; apply(0); }
      }
      content.addEventListener('pointerup', up);
      content.addEventListener('pointercancel', up);
      actions.querySelector('button').addEventListener('click', function () {
        rowEl.classList.add('deleted');
        setTimeout(function () { rowEl.style.height = '0px'; rowEl.style.marginBottom = '0px'; }, 220);
      });
    });
  });

  /* ---------------- AnimatedList ---------------- */
  RB.demo('animated-list', function (stage) {
    var items = ['相册 · 达妮娅官方', '随笔 · 十月的风', '课表 · 周三实验课', '留言 · 来自路人', '音乐 · 晴天', '文档 · 关于本站'];
    stage.innerHTML = '<div class="al"><span class="al-pill"></span><div class="al-list"></div></div><p class="al-tip">点行或按 ↑↓ 移动，Enter 选中</p>';
    var box = stage.querySelector('.al');
    var list = stage.querySelector('.al-list');
    var pill = stage.querySelector('.al-pill');
    var rows = [];
    var idx = 0;
    items.forEach(function (t, i) {
      var b = RB.el('button', 'al-row');
      b.type = 'button';
      b.innerHTML = '<span class="al-ico">' + RB.svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2 2"/>', 14) + '</span><span>' + t + '</span><span class="al-go">↗</span>';
      b.addEventListener('click', function () { select(i); });
      list.appendChild(b);
      rows.push(b);
    });
    function select(i) {
      idx = RB.clamp(i, 0, rows.length - 1);
      rows.forEach(function (r, k) { r.classList.toggle('on', k === idx); });
      var r = rows[idx];
      pill.style.transform = 'translateY(' + r.offsetTop + 'px)';
      pill.style.height = r.offsetHeight + 'px';
      pill.style.opacity = '1';
    }
    box.tabIndex = 0;
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); select(idx + 1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); select(idx - 1); }
      if (e.key === 'Enter') { e.preventDefault(); RB.toast('选中：' + items[idx]); }
    });
    requestAnimationFrame(function () { select(0); });
    rows.forEach(function (r, i) {
      r.style.animationDelay = (i * 45) + 'ms';
      r.classList.add('al-in');
    });
  });

  /* ---------------- LineSidebar ---------------- */
  RB.demo('line-sidebar', function (stage) {
    var items = ['概览', '音乐', '视频', '图片', '随笔', '账号', '外观', 'AI'];
    stage.innerHTML = '<div class="ls"><div class="ls-rail"></div><div class="ls-list"></div></div><p class="ls-tip">指针靠近哪一项，哪一项就浮起来</p>';
    var list = stage.querySelector('.ls-list');
    var rail = stage.querySelector('.ls-rail');
    var rows = [];
    items.forEach(function (t, i) {
      var b = RB.el('button', 'ls-item');
      b.type = 'button';
      b.innerHTML = '<span class="ls-dot"></span><span>' + t + '</span>';
      b.addEventListener('click', function () { RB.toast('切到：' + t); });
      list.appendChild(b);
      rows.push(b);
    });
    function paint(y) {
      rows.forEach(function (r) {
        var rr = r.getBoundingClientRect();
        var lr = list.getBoundingClientRect();
        var cy = rr.top - lr.top + rr.height / 2;
        var d = Math.abs(cy - y);
        var k = RB.clamp(1 - d / 90, 0, 1);
        r.style.transform = 'translateX(' + (k * 5) + 'px)';
        r.style.color = k > 0.55 ? 'var(--foreground)' : '';
        r.style.background = k > 0.55 ? 'color-mix(in srgb, var(--brand-500) 8%, var(--card))' : '';
        r.style.opacity = String(0.5 + k * 0.5);
      });
      rail.style.opacity = '1';
      rail.style.transform = 'translateY(' + y + 'px)';
    }
    list.addEventListener('pointermove', function (e) {
      var lr = list.getBoundingClientRect();
      paint(e.clientY - lr.top);
    });
    list.addEventListener('pointerleave', function () {
      rows.forEach(function (r) { r.style.transform = ''; r.style.color = ''; r.style.background = ''; r.style.opacity = ''; });
      rail.style.opacity = '0';
    });
  });

  /* ---------------- GooeyNav ---------------- */
  RB.demo('gooey-nav', function (stage) {
    var items = ['首页', '随笔', 'AI', '相册', '留言'];
    stage.innerHTML =
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="labGoo"><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" result="goo"/><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter></svg>' +
      '<div class="gn"><div class="gn-goo"><span class="gn-trail"></span><span class="gn-pill"></span></div><div class="gn-row"></div></div>' +
      '<p class="gn-tip">点一个导航项，看胶囊断开、流过去</p>';
    var row = stage.querySelector('.gn-row');
    var pill = stage.querySelector('.gn-pill');
    var trail = stage.querySelector('.gn-trail');
    var btns = [];
    var idx = 0;
    items.forEach(function (t, i) {
      var b = RB.el('button', 'gn-item', t);
      b.type = 'button';
      b.addEventListener('click', function () { go(i); });
      row.appendChild(b);
      btns.push(b);
    });
    function go(i) {
      idx = i;
      var b = btns[i];
      var r = b.getBoundingClientRect();
      var box = row.getBoundingClientRect();
      var left = r.left - box.left;
      var w = r.width;
      pill.style.left = left + 'px';
      pill.style.width = w + 'px';
      trail.style.left = left + 'px';
      trail.style.width = w + 'px';
      btns.forEach(function (x, k) { x.classList.toggle('on', k === idx); });
    }
    requestAnimationFrame(function () { go(0); });
    window.addEventListener('resize', function () { go(idx); });
  });

  /* ---------------- PillNav ---------------- */
  RB.demo('pill-nav', function (stage) {
    var items = ['首页', '随笔', '相册', 'AI'];
    stage.innerHTML = '<div class="pn"><div class="pn-row"></div><span class="pn-dot"></span></div><p class="pn-tip">悬停看文字上滚，点击看 active 点滑行</p>';
    var row = stage.querySelector('.pn-row');
    var dot = stage.querySelector('.pn-dot');
    var btns = [];
    items.forEach(function (t, i) {
      var b = RB.el('button', 'pn-item');
      b.type = 'button';
      b.innerHTML = '<span class="pn-fill"></span><span class="pn-label"><i>' + t + '</i><i>' + t + '</i></span>';
      b.addEventListener('click', function () { go(i); });
      row.appendChild(b);
      btns.push(b);
    });
    function go(i) {
      btns.forEach(function (b, k) { b.classList.toggle('on', k === i); });
      var b = btns[i];
      var r = b.getBoundingClientRect();
      var box = row.getBoundingClientRect();
      dot.style.left = (r.left - box.left + r.width / 2) + 'px';
    }
    requestAnimationFrame(function () { go(0); });
  });

  /* ---------------- Stepper ---------------- */
  RB.demo('stepper', function (stage) {
    var steps = [
      { t: '选择文件', d: '拖入或点选要上传的媒体' },
      { t: '整理信息', d: '填写标题、归属相册与歌词' },
      { t: '确认上传', d: '滑到底开始，失败会自动回滚' }
    ];
    stage.innerHTML = '<div class="stp"><div class="stp-bar"><i></i></div><div class="stp-row"></div><div class="stp-card"></div><div class="stp-actions"><button class="lab-btn stp-prev" type="button">上一步</button><button class="lab-btn primary stp-next" type="button">下一步</button></div></div>';
    var row = stage.querySelector('.stp-row');
    var bar = stage.querySelector('.stp-bar i');
    var card = stage.querySelector('.stp-card');
    var next = stage.querySelector('.stp-next');
    var prev = stage.querySelector('.stp-prev');
    var idx = 0;
    steps.forEach(function (s, i) {
      var b = RB.el('button', 'stp-dot');
      b.type = 'button';
      b.innerHTML = '<i>' + (i + 1) + '</i><span>' + s.t + '</span>';
      b.addEventListener('click', function () { go(i); });
      row.appendChild(b);
    });
    function go(i) {
      idx = RB.clamp(i, 0, steps.length - 1);
      Array.prototype.slice.call(row.children).forEach(function (b, k) {
        b.classList.toggle('on', k === idx);
        b.classList.toggle('done', k < idx);
      });
      bar.style.width = (idx / (steps.length - 1) * 100) + '%';
      card.innerHTML = '<b>' + steps[idx].t + '</b><span>' + steps[idx].d + '</span>';
      prev.disabled = idx === 0;
      next.textContent = idx === steps.length - 1 ? '完成' : '下一步';
    }
    next.addEventListener('click', function () { if (idx === steps.length - 1) RB.toast('流程完成'); else go(idx + 1); });
    prev.addEventListener('click', function () { go(idx - 1); });
    go(0);
  });

  /* ---------------- JellyRadio ---------------- */
  RB.demo('jelly-radio', function (stage) {
    var items = ['周一', '周二', '周三', '周四', '周五', '周末'];
    stage.innerHTML = '<div class="jr"></div><p class="jr-tip">选中的胶囊会胀开，把邻居挤开</p>';
    var box = stage.querySelector('.jr');
    var btns = [];
    items.forEach(function (t, i) {
      var b = RB.el('button', 'jr-item', t);
      b.type = 'button';
      b.addEventListener('click', function () { select(i); });
      box.appendChild(b);
      btns.push(b);
    });
    function select(i) {
      btns.forEach(function (b, k) {
        b.classList.toggle('on', k === i);
        b.classList.toggle('push-l', k < i);
        b.classList.toggle('push-r', k > i);
      });
    }
    select(2);
  });
})();
