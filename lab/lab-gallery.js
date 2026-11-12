/* ============================================================
   Lab · 03 首页与相册
   SplitFlapText / ScrollExpand / HalftoneReveal / ChromaGrid / Masonry / StickerPeel
   ============================================================ */
(function () {
  'use strict';
  var RB = window.RB;

  /* ---------------- SplitFlapText ---------------- */
  RB.demo('split-flap', function (stage) {
    stage.innerHTML =
      '<div class="sf-clock">' +
        '<div class="sf-row" id="sfRow"></div>' +
        '<div class="sf-meta"><span>YHuo · 本地时间</span><button class="sf-toggle" type="button">暂停</button></div>' +
      '</div>';
    var row = stage.querySelector('#sfRow');
    var toggle = stage.querySelector('.sf-toggle');
    var digits = [];
    function makeDigit() {
      var d = RB.el('span', 'sf-digit');
      d.innerHTML = '<span class="sf-half sf-top">0</span><span class="sf-half sf-bottom">0</span><span class="sf-leaf"></span>';
      row.appendChild(d);
      digits.push(d);
      return d;
    }
    for (var i = 0; i < 6; i++) {
      if (i === 2 || i === 4) {
        var sep = RB.el('span', 'sf-colon', ':');
        row.appendChild(sep);
      }
      makeDigit();
    }
    var last = '';
    var running = true;
    function setDigit(d, ch) {
      var top = d.querySelector('.sf-top');
      var bot = d.querySelector('.sf-bottom');
      if (top.textContent === ch) return;
      var leaf = d.querySelector('.sf-leaf');
      d.classList.remove('flip');
      void d.offsetWidth;
      leaf.textContent = top.textContent;
      top.textContent = ch;
      bot.textContent = ch;
      d.classList.add('flip');
    }
    function update() {
      if (!running) return;
      var now = new Date();
      var str = [now.getHours(), now.getMinutes(), now.getSeconds()].map(function (n) { return String(n).padStart(2, '0'); }).join('');
      if (str === last) return;
      last = str;
      for (var i = 0; i < 6; i++) setDigit(digits[i], str.charAt(i));
    }
    update();
    setInterval(update, 250);
    toggle.addEventListener('click', function () {
      running = !running;
      toggle.textContent = running ? '暂停' : '继续';
    });
  });

  /* ---------------- ScrollExpand ---------------- */
  RB.demo('scroll-expand', function (stage) {
    stage.innerHTML =
      '<div class="se-scroll" tabindex="0">' +
        '<div class="se-spacer">向下滚动</div>' +
        '<div class="se-frame"><img alt="" loading="lazy"><span class="se-play">▶</span><span class="se-cap">aemeath · PV</span></div>' +
        '<div class="se-after">继续滚动，圆角会收回来</div>' +
      '</div>';
    var scroll = stage.querySelector('.se-scroll');
    var frame = stage.querySelector('.se-frame');
    var img = frame.querySelector('img');
    RB.images(function (list) {
      var pick = list.filter(function (x) { return /aemeath|denia/i.test(x.url); })[0] || list[0];
      if (pick) img.src = pick.url;
    });
    function onScroll() {
      var r = frame.getBoundingClientRect();
      var sr = scroll.getBoundingClientRect();
      var center = r.top + r.height / 2 - sr.top;
      var p = 1 - Math.min(1, Math.abs(center - sr.height / 2) / (sr.height * 0.52));
      p = RB.clamp(p, 0, 1);
      var w = 58 + p * 42;
      frame.style.width = w + '%';
      frame.style.borderRadius = (18 - p * 18) + 'px';
      frame.style.transform = 'scale(' + (0.98 + p * 0.02) + ')';
    }
    scroll.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  });

  /* ---------------- HalftoneReveal ---------------- */
  RB.demo('halftone-reveal', function (stage) {
    stage.innerHTML = '<div class="hr-wrap"><img class="hr-img" alt=""><canvas class="hr-dots"></canvas><span class="hr-hint">移动指针显影</span></div>';
    var wrap = stage.querySelector('.hr-wrap');
    var img = stage.querySelector('.hr-img');
    var canvas = stage.querySelector('.hr-dots');
    var hint = stage.querySelector('.hr-hint');
    var ctx = canvas.getContext('2d');
    var dots = [];
    var cw = 0, ch = 0, dpr = 1;
    var mx = -999, my = -999;
    function build() {
      if (!img.naturalWidth) return;
      var r = wrap.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var sample = document.createElement('canvas');
      var sw = 90, sh = Math.max(1, Math.round(sw * ch / cw));
      sample.width = sw; sample.height = sh;
      var sctx = sample.getContext('2d');
      sctx.drawImage(img, 0, 0, sw, sh);
      var data = sctx.getImageData(0, 0, sw, sh).data;
      dots = [];
      var gap = 5;
      for (var y = 0; y < ch; y += gap) {
        for (var x = 0; x < cw; x += gap) {
          var sx = Math.min(sw - 1, Math.floor(x / cw * sw));
          var sy = Math.min(sh - 1, Math.floor(y / ch * sh));
          var idx = (sy * sw + sx) * 4;
          var lum = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
          var rad = RB.clamp((1 - lum) * 2.4 + 0.4, 0.4, 2.6);
          dots.push({ x: x, y: y, r: rad, g: Math.round(60 + lum * 120) });
        }
      }
      draw();
    }
    function draw() {
      ctx.clearRect(0, 0, cw, ch);
      // 纸色底 + 半调网点点阵；mask 在指针处开洞，露出下方彩色照片
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#fff';
      ctx.fillRect(0, 0, cw, ch);
      dots.forEach(function (d) {
        ctx.beginPath();
        ctx.fillStyle = 'rgb(' + d.g + ',' + d.g + ',' + d.g + ')';
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    RB.images(function (list) {
      var pick = list.filter(function (x) { return /denia|aemeath/i.test(x.url); })[0] || list[0];
      if (!pick) return;
      img.onload = build;
      img.src = pick.url;
    });
    function move(e) {
      var r = wrap.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
      canvas.style.webkitMaskImage = 'radial-gradient(circle 92px at ' + mx + 'px ' + my + 'px, transparent 0 58px, #000 118px)';
      canvas.style.maskImage = canvas.style.webkitMaskImage;
      hint.style.opacity = '0';
    }
    wrap.addEventListener('pointermove', move);
    wrap.addEventListener('pointerleave', function () {
      canvas.style.webkitMaskImage = 'radial-gradient(circle 0px at 50% 50%, transparent, #000 1px)';
      canvas.style.maskImage = canvas.style.webkitMaskImage;
      hint.style.opacity = '1';
    });
    window.addEventListener('resize', build);
    var themeBtn = document.getElementById('labTheme');
    if (themeBtn) themeBtn.addEventListener('click', function () { setTimeout(draw, 30); });
  });

  /* ---------------- ChromaGrid ---------------- */
  RB.demo('chroma-grid', function (stage) {
    stage.innerHTML = '<div class="cg-grid"></div>';
    var grid = stage.querySelector('.cg-grid');
    RB.images(function (list) {
      var picks = list.slice(0, 8);
      while (picks.length < 8 && list.length) picks.push(list[picks.length % list.length]);
      picks.forEach(function (it, i) {
        var card = RB.el('div', 'cg-card');
        card.innerHTML = '<img class="cg-gray" alt="" loading="lazy"><img class="cg-color" alt="" loading="lazy"><span>' + (i + 1) + '</span>';
        var g = card.querySelector('.cg-gray');
        var c = card.querySelector('.cg-color');
        g.src = it.url; c.src = it.url;
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          card.style.setProperty('--x', (e.clientX - r.left) + 'px');
          card.style.setProperty('--y', (e.clientY - r.top) + 'px');
          card.classList.add('live');
        });
        card.addEventListener('pointerleave', function () { card.classList.remove('live'); });
        grid.appendChild(card);
      });
    });
  });

  /* ---------------- Masonry ---------------- */
  RB.demo('masonry', function (stage) {
    stage.innerHTML = '<div class="ms-tool"><span>混合横竖图 · 点图看大图</span><button class="lab-btn ms-shuffle" type="button">重排</button></div><div class="ms-grid"></div><div class="ms-lb" hidden><img alt=""><button type="button" aria-label="关闭">×</button></div>';
    var grid = stage.querySelector('.ms-grid');
    var lb = stage.querySelector('.ms-lb');
    var lbImg = lb.querySelector('img');
    var shuffle = stage.querySelector('.ms-shuffle');
    var picks = [];
    function render() {
      grid.innerHTML = '';
      picks.forEach(function (it, i) {
        var fig = RB.el('figure', 'ms-item');
        fig.style.setProperty('--h', (130 + (i * 37) % 120) + 'px');
        fig.innerHTML = '<img alt="" loading="lazy">';
        fig.querySelector('img').src = it.url;
        fig.addEventListener('click', function () {
          lbImg.src = it.url;
          lb.hidden = false;
        });
        grid.appendChild(fig);
      });
    }
    RB.images(function (list) {
      picks = list.slice(0, 10);
      render();
    });
    shuffle.addEventListener('click', function () {
      for (var i = picks.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = picks[i]; picks[i] = picks[j]; picks[j] = t;
      }
      render();
    });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.tagName === 'BUTTON') lb.hidden = true;
    });
  });

  /* ---------------- StickerPeel ---------------- */
  RB.demo('sticker-peel', function (stage) {
    var sticker = 'denia-sticker-01.gif';
    stage.innerHTML =
      '<div class="sp-stage">' +
        '<div class="sp-shadow"></div>' +
        '<div class="sp-sticker" tabindex="0">' +
          '<img src="/assets/dania-chibi/' + sticker + '" alt="达妮娅贴纸">' +
          '<span class="sp-fold"></span>' +
        '</div>' +
        '<span class="sp-hint">捏住贴纸拖动 / 甩出</span>' +
        '<button class="lab-btn sp-reset" type="button">放回去</button>' +
      '</div>';
    var wrap = stage.querySelector('.sp-stage');
    var st = stage.querySelector('.sp-sticker');
    var fold = stage.querySelector('.sp-fold');
    var drag = null, x = 0, y = 0, rot = 0;
    function apply(scale) {
      st.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + rot + 'deg) scale(' + (scale || 1) + ')';
    }
    st.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      try { st.setPointerCapture(e.pointerId); } catch (err) {}
      drag = { sx: e.clientX, sy: e.clientY, ox: x, oy: y };
      st.classList.add('grab');
    });
    st.addEventListener('pointermove', function (e) {
      if (!drag) return;
      x = drag.ox + e.clientX - drag.sx;
      y = drag.oy + e.clientY - drag.sy;
      rot = RB.clamp((e.clientX - drag.sx) * 0.08, -14, 14);
      var peel = RB.clamp(Math.max(Math.abs(x), Math.abs(y)) / 110, 0, 1);
      fold.style.opacity = String(peel);
      fold.style.transform = 'scale(' + (0.2 + peel * 1.1) + ') rotate(' + (35 + peel * 25) + 'deg)';
      apply(1);
    });
    function up(e) {
      if (!drag) return;
      drag = null;
      st.classList.remove('grab');
      var speed = Math.hypot(x, y);
      if (speed > 80) {
        st.classList.add('fly');
        x *= 1.8; y *= 1.8; rot *= 1.6;
        apply(0.86);
        setTimeout(function () {
          st.classList.remove('fly');
          x = 0; y = 0; rot = 0;
          fold.style.opacity = '0';
          apply(1);
        }, 620);
      } else {
        apply(1);
        fold.style.opacity = '0';
      }
    }
    st.addEventListener('pointerup', up);
    st.addEventListener('pointercancel', up);
    stage.querySelector('.sp-reset').addEventListener('click', function () {
      x = 0; y = 0; rot = 0; fold.style.opacity = '0'; st.classList.remove('fly'); apply(1);
    });
  });
})();
