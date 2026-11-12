/* ============================================================
   Lab · 02 AI 交互
   ThoughtLine / LatticeLoader / StatusMark / VoicePill
   ============================================================ */
(function () {
  'use strict';
  var RB = window.RB;

  /* ---------------- ThoughtLine ---------------- */
  RB.demo('thought-line', function (stage) {
    stage.innerHTML =
      '<div class="tl">' +
        '<button class="tl-head" type="button" aria-expanded="true">' +
          '<span class="tl-glyph">' + RB.svg('<path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7Z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z"/>', 18) + '</span>' +
          '<span class="tl-label">Thinking…</span>' +
          '<span class="tl-timer">0.0s</span>' +
          '<span class="tl-chev">' + RB.svg('<path d="m6 9 6 6 6-6"/>', 14) + '</span>' +
          '<span class="tl-reset" role="button" tabindex="0" aria-label="重播思考轨迹">↻</span>' +
        '</button>' +
        '<div class="tl-body">' +
          '<div class="tl-steps">' +
            '<div class="tl-step"><i></i><span>读取当前会话与站内笔记</span></div>' +
            '<div class="tl-step"><i></i><span>检索 3 条相关随笔与相册</span></div>' +
            '<div class="tl-step"><i></i><span>整理上下文，检查时间与课表</span></div>' +
            '<div class="tl-step"><i></i><span>组织回答，准备输出</span></div>' +
          '</div>' +
          '<button class="tl-replay" type="button">重新演示</button>' +
        '</div>' +
      '</div>';
    var root = stage.querySelector('.tl');
    var head = stage.querySelector('.tl-head');
    var label = stage.querySelector('.tl-label');
    var timer = stage.querySelector('.tl-timer');
    var body = stage.querySelector('.tl-body');
    var steps = Array.prototype.slice.call(stage.querySelectorAll('.tl-step'));
    var replay = stage.querySelector('.tl-replay');
    var t0 = 0, timerId = 0, stepTimers = [], done = false;

    function setOpen(open) {
      root.classList.toggle('open', open);
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      body.style.maxHeight = open ? body.scrollHeight + 40 + 'px' : '0px';
    }
    function tick() {
      var s = (performance.now() - t0) / 1000;
      timer.textContent = s.toFixed(1) + 's';
    }
    function reset() {
      stepTimers.forEach(clearTimeout); stepTimers = [];
      clearInterval(timerId);
      done = false;
      root.classList.remove('done');
      label.textContent = 'Thinking…';
      steps.forEach(function (s) { s.classList.remove('on'); });
      timer.textContent = '0.0s';
      setOpen(true);
      t0 = performance.now();
      timerId = setInterval(tick, 100);
      steps.forEach(function (s, i) {
        stepTimers.push(setTimeout(function () { s.classList.add('on'); }, 650 + i * 780));
      });
      stepTimers.push(setTimeout(function () {
        clearInterval(timerId);
        var secs = ((performance.now() - t0) / 1000).toFixed(1);
        done = true;
        root.classList.add('done');
        label.textContent = 'Thought for ' + secs + 's';
        timer.textContent = '';
        setTimeout(function () { if (done) setOpen(false); }, 900);
      }, 650 + steps.length * 780 + 700));
    }
    head.addEventListener('click', function () { setOpen(!root.classList.contains('open')); });
    replay.addEventListener('click', function (e) { e.stopPropagation(); reset(); });
    var headReset = stage.querySelector('.tl-reset');
    headReset.addEventListener('click', function (e) { e.stopPropagation(); reset(); });
    headReset.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); reset(); } });
    reset();
    setOpen(true);
  });

  /* ---------------- LatticeLoader ---------------- */
  RB.demo('lattice-loader', function (stage) {
    stage.innerHTML =
      '<div class="ll">' +
        '<div class="ll-grid" aria-hidden="true"></div>' +
        '<div class="ll-meta"><span class="ll-text">正在检索站内内容</span><b class="ll-time">0.0s</b></div>' +
        '<div class="ll-bar"><i></i></div>' +
      '</div>';
    var grid = stage.querySelector('.ll-grid');
    var time = stage.querySelector('.ll-time');
    var bar = stage.querySelector('.ll-bar i');
    var cols = 9, rows = 3;
    for (var i = 0; i < cols * rows; i++) {
      var c = RB.el('span');
      c.style.setProperty('--i', String(i));
      c.style.setProperty('--d', String((i % cols) * 0.08 + Math.floor(i / cols) * 0.14));
      grid.appendChild(c);
    }
    var t0 = performance.now();
    setInterval(function () {
      var s = (performance.now() - t0) / 1000;
      time.textContent = s.toFixed(1) + 's';
      bar.style.transform = 'scaleX(' + Math.min(1, (s % 3.2) / 2.4) + ')';
    }, 100);
  });

  /* ---------------- StatusMark ---------------- */
  RB.demo('status-mark', function (stage) {
    stage.innerHTML =
      '<div class="sm">' +
        '<div class="sm-mark" data-state="idle">' +
          '<svg viewBox="0 0 48 48" aria-hidden="true">' +
            '<circle class="sm-ring" cx="24" cy="24" r="17"></circle>' +
            '<circle class="sm-arc" cx="24" cy="24" r="17"></circle>' +
            '<path class="sm-check" d="M15 24.5l6 6L33 19"></path>' +
            '<circle class="sm-dot" cx="24" cy="24" r="3"></circle>' +
          '</svg>' +
        '</div>' +
        '<div class="sm-copy"><b>状态符号</b><span>点按钮切换：空闲 → 进行中 → 完成</span></div>' +
        '<button class="lab-btn sm-next" type="button">下一步</button>' +
      '</div>';
    var mark = stage.querySelector('.sm-mark');
    var next = stage.querySelector('.sm-next');
    var order = ['idle', 'running', 'done'];
    var names = { idle: '空闲', running: '进行中', done: '完成' };
    next.addEventListener('click', function () {
      var i = order.indexOf(mark.dataset.state);
      mark.dataset.state = order[(i + 1) % order.length];
      next.textContent = names[mark.dataset.state];
    });
    next.textContent = '下一步';
  });

  /* ---------------- VoicePill ---------------- */
  RB.demo('voice-pill', function (stage) {
    stage.innerHTML =
      '<div class="vp">' +
        '<button class="vp-mic" type="button" aria-label="按住说话">' +
          '<span class="vp-ico">' + RB.svg('<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>', 18) + '</span>' +
          '<span class="vp-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
          '<span class="vp-time">00:00</span>' +
        '</button>' +
        '<span class="vp-hint">按住麦克风</span>' +
      '</div>';
    var pill = stage.querySelector('.vp-mic');
    var time = stage.querySelector('.vp-time');
    var hint = stage.querySelector('.vp-hint');
    var t0 = 0, id = 0;
    function start() {
      if (pill.classList.contains('rec')) return;
      pill.classList.add('rec');
      hint.textContent = '正在听…松手结束';
      t0 = performance.now();
      id = setInterval(function () {
        var s = Math.floor((performance.now() - t0) / 1000);
        time.textContent = '00:' + String(s).padStart(2, '0');
      }, 200);
    }
    function stop() {
      if (!pill.classList.contains('rec')) return;
      pill.classList.remove('rec');
      clearInterval(id);
      hint.textContent = '已结束 · 再按一次';
      setTimeout(function () { if (!pill.classList.contains('rec')) { time.textContent = '00:00'; hint.textContent = '按住麦克风'; } }, 1200);
    }
    pill.addEventListener('pointerdown', function (e) { e.preventDefault(); start(); });
    window.addEventListener('pointerup', stop);
    pill.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); start(); } });
    pill.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') stop(); });
  });
})();
