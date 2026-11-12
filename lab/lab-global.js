/* ============================================================
   Lab · 01 全局质感
   GradualBlur / SquishSwitch / WarmTooltip / ScrubField / ElasticSlider
   ============================================================ */
(function () {
  'use strict';
  var RB = window.RB;

  /* ---------------- GradualBlur ---------------- */
  RB.demo('gradual-blur', function (stage) {
    stage.innerHTML =
      '<div class="gb-wrap">' +
        '<div class="gb-fakebar">顶栏 / 阅读层标题</div>' +
        '<div class="gb-scroll" tabindex="0">' +
          '<div class="gb-copy">' +
            '<b>滚动这块内容</b>' +
            '<p>上下边缘会逐渐模糊，而不是一条硬线。固定顶栏、文档阅读层、相册滚动容器的上下缘都可以用。</p>' +
            '<p>实现是两条 backdrop-filter + mask 的渐变层，不包一层 wrapper、不改布局，滚动事件零参与。</p>' +
            '<p>下面是一段用来制造滚动距离的占位文字。可以把它想成关于页的长文、随笔详情，或者相册照片墙。</p>' +
            '<p>风从纸页之间穿过，字迹在边缘慢慢化开；中间的阅读区始终清晰。</p>' +
            '<p>再滚一点。模糊带的宽度和强度都可以按容器调，顶栏用 56px，阅读层用 36px。</p>' +
            '<p>最后一段。到底以后下缘的模糊会自然淡出，因为遮罩是跟着滚动容器走的。</p>' +
          '</div>' +
        '</div>' +
        '<div class="gb-edge gb-top"></div>' +
        '<div class="gb-edge gb-bottom"></div>' +
      '</div>';
  });

  /* ---------------- SquishSwitch ---------------- */
  RB.demo('squish-switch', function (stage) {
    stage.innerHTML =
      '<div class="sq-row">' +
        '<button class="sq-switch on" type="button" role="switch" aria-checked="true"><i></i><span>每日早报</span></button>' +
        '<button class="sq-switch" type="button" role="switch" aria-checked="false"><i></i><span>重点课提醒</span></button>' +
        '<button class="sq-switch on" type="button" role="switch" aria-checked="true"><i></i><span>深浅跟随</span></button>' +
      '</div>';
    Array.prototype.slice.call(stage.querySelectorAll('.sq-switch')).forEach(function (sw) {
      var thumb = sw.querySelector('i');
      var drag = null;
      function set(on) {
        sw.classList.toggle('on', on);
        sw.setAttribute('aria-checked', on ? 'true' : 'false');
      }
      sw.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        try { sw.setPointerCapture(e.pointerId); } catch (err) {}
        drag = { x: e.clientX, on: sw.classList.contains('on'), moved: 0 };
        thumb.classList.add('squish');
      });
      sw.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.x;
        drag.moved = Math.max(drag.moved, Math.abs(dx));
        var stretch = Math.min(1.35, 1 + Math.abs(dx) / 70);
        var travel = RB.clamp((drag.on ? 24 : -24) + dx, -26, 26);
        thumb.style.transform = 'translateX(' + travel + 'px) scaleX(' + stretch + ')';
      });
      function up(e) {
        if (!drag) return;
        var dx = e.clientX - drag.x;
        var on = drag.on;
        if (Math.abs(dx) > 6) on = dx > 0; else on = !drag.on;
        drag = null;
        thumb.classList.remove('squish');
        thumb.style.transform = '';
        set(on);
      }
      sw.addEventListener('pointerup', up);
      sw.addEventListener('pointercancel', up);
      sw.addEventListener('click', function (e) {
        // pointerup 已处理拖动；纯键盘/无指针时走这里
        if (e.detail === 0) set(!sw.classList.contains('on'));
      });
    });
  });

  /* ---------------- WarmTooltip ---------------- */
  RB.demo('warm-tooltip', function (stage) {
    var icons = [
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
      '<path d="M12 5v14M5 12h14"/>',
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      '<path d="M4 12h16M4 6h16M4 18h10"/>'
    ];
    var labels = ['编辑', '删除', '添加', '计时', '更多'];
    var wrap = RB.el('div', 'wt-wrap');
    var tip = RB.el('div', 'wt-tip', '');
    wrap.appendChild(tip);
    icons.forEach(function (path, i) {
      var b = RB.el('button', 'wt-btn', RB.svg(path, 17));
      b.type = 'button';
      b.setAttribute('aria-label', labels[i]);
      b.dataset.label = labels[i];
      wrap.appendChild(b);
    });
    stage.appendChild(wrap);
    var lastLeave = 0, showTimer = null, hideTimer = null, current = null;
    function show(btn, warm) {
      clearTimeout(showTimer); clearTimeout(hideTimer);
      var run = function () {
        current = btn;
        tip.textContent = btn.dataset.label;
        var r = btn.getBoundingClientRect();
        var wr = wrap.getBoundingClientRect();
        tip.style.left = (r.left - wr.left + r.width / 2) + 'px';
        tip.style.top = (r.top - wr.top) + 'px';
        tip.classList.add('show');
      };
      if (warm) run(); else showTimer = setTimeout(run, 400);
    }
    function hide() {
      clearTimeout(showTimer);
      hideTimer = setTimeout(function () {
        tip.classList.remove('show');
        lastLeave = performance.now();
        current = null;
      }, 70);
    }
    Array.prototype.slice.call(wrap.querySelectorAll('.wt-btn')).forEach(function (b) {
      b.addEventListener('pointerenter', function () { show(b, performance.now() - lastLeave < 1400); });
      b.addEventListener('pointerleave', hide);
      b.addEventListener('focus', function () { show(b, true); });
      b.addEventListener('blur', hide);
    });
  });

  /* ---------------- ScrubField ---------------- */
  RB.demo('scrub-field', function (stage) {
    var wrap = RB.el('div', 'sf-wrap');
    wrap.innerHTML = '<span class="sf-label">重点课提前</span>';
    var chip = RB.el('div', 'sf-chip');
    chip.tabIndex = 0;
    chip.setAttribute('role', 'spinbutton');
    chip.setAttribute('aria-valuemin', '5');
    chip.setAttribute('aria-valuemax', '120');
    var value = 30;
    function paint() {
      chip.innerHTML = '<b>' + value + '</b><span>分钟</span>';
      chip.setAttribute('aria-valuenow', String(value));
    }
    paint();
    wrap.appendChild(chip);
    var tail = RB.el('span', 'sf-tail', '拖动改值 · 点击输入');
    wrap.appendChild(tail);
    stage.appendChild(wrap);

    var drag = null, input = null;
    function startEdit() {
      if (input) return;
      input = document.createElement('input');
      input.className = 'sf-input';
      input.type = 'number';
      input.min = '5'; input.max = '120';
      input.value = String(value);
      chip.replaceWith(input);
      input.focus(); input.select();
      var commit = function () {
        var v = parseInt(input.value, 10);
        if (isFinite(v)) value = RB.clamp(v, 5, 120);
        input.replaceWith(chip); input = null; paint();
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { input.value = String(value); commit(); }
      });
    }
    chip.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      try { chip.setPointerCapture(e.pointerId); } catch (err) {}
      drag = { x: e.clientX, v: value, moved: 0 };
      chip.classList.add('drag');
    });
    chip.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      var next = drag.v + Math.round(dx / 4);
      var clamped = RB.clamp(next, 5, 120);
      value = clamped; paint();
      var over = next - clamped;
      chip.style.transform = 'translateX(' + RB.clamp(over * 0.22, -8, 8) + 'px)';
    });
    function up() {
      if (!drag) return;
      var wasDrag = drag.moved > 4;
      drag = null;
      chip.classList.remove('drag');
      chip.style.transform = '';
      if (!wasDrag) startEdit();
    }
    chip.addEventListener('pointerup', up);
    chip.addEventListener('pointercancel', up);
    chip.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); startEdit(); return; }
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); value = RB.clamp(value + 5, 5, 120); paint(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); value = RB.clamp(value - 5, 5, 120); paint(); }
    });
  });

  /* ---------------- ElasticSlider ---------------- */
  RB.demo('elastic-slider', function (stage) {
    stage.innerHTML =
      '<div class="es-wrap">' +
        '<div class="es-head"><span>音量</span><b class="es-val">64</b></div>' +
        '<div class="es-track" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="64">' +
          '<div class="es-fill"></div><div class="es-thumb"></div><div class="es-ghost"></div>' +
        '</div>' +
        '<div class="es-scale"><span>0</span><span>50</span><span>100</span></div>' +
      '</div>';
    var track = stage.querySelector('.es-track');
    var fill = stage.querySelector('.es-fill');
    var thumb = stage.querySelector('.es-thumb');
    var ghost = stage.querySelector('.es-ghost');
    var val = stage.querySelector('.es-val');
    var value = 64, drag = null;
    function paint(v, stretch) {
      var p = RB.clamp(v, 0, 100);
      fill.style.width = p + '%';
      thumb.style.left = p + '%';
      val.textContent = String(Math.round(p));
      track.setAttribute('aria-valuenow', String(Math.round(p)));
      if (stretch) {
        var over = v - p;
        fill.style.transform = 'scaleX(' + (1 + Math.min(0.16, Math.abs(over) / 100)) + ')';
        fill.style.transformOrigin = over > 0 ? 'left center' : 'right center';
        thumb.style.transform = 'translate(-50%, -50%) scaleX(' + (1 + Math.min(0.45, Math.abs(over) / 30)) + ')';
        ghost.style.opacity = Math.min(0.5, Math.abs(over) / 30);
        ghost.style.left = (over > 0 ? 100 : 0) + '%';
        ghost.style.width = Math.min(14, Math.abs(over) / 2) + '%';
      } else {
        fill.style.transform = '';
        thumb.style.transform = 'translate(-50%, -50%)';
        ghost.style.opacity = '0';
      }
    }
    paint(value, false);
    function fromEvent(e) {
      var r = track.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 100;
    }
    track.addEventListener('pointerdown', function (e) {
      try { track.setPointerCapture(e.pointerId); } catch (err) {}
      drag = true;
      track.classList.add('drag');
      value = fromEvent(e);
      paint(value, true);
    });
    track.addEventListener('pointermove', function (e) {
      if (!drag) return;
      value = fromEvent(e);
      paint(value, true);
    });
    function up() {
      if (!drag) return;
      drag = false;
      track.classList.remove('drag');
      var settled = RB.clamp(value, 0, 100);
      value = settled;
      paint(value, false);
    }
    track.addEventListener('pointerup', up);
    track.addEventListener('pointercancel', up);
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); value = RB.clamp(value + 5, 0, 100); paint(value, false); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); value = RB.clamp(value - 5, 0, 100); paint(value, false); }
    });
  });
})();
