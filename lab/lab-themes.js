/* ============================================================
   Lab · 06 主题与背景
   CRT / 终端 / 扫描 / 抖动 / 字符 / 雪 / 极光 / 绸缎 / 点阵 / 轨道 / 文字 / 火花
   ============================================================ */
(function () {
  'use strict';
  var RB = window.RB;

  function col(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }
  function brand() { return col('--brand-500', '#b0532b'); }
  function brand2() { return col('--brand-400', '#c96a42'); }
  function ink() { return col('--foreground', '#1b1c1e'); }
  function paper() { return col('--background', '#f8f7f4'); }

  function full(stage) {
    stage.innerHTML = '<canvas class="lab-bg-canvas"></canvas>';
    return stage.querySelector('canvas');
  }

  /* ---------------- CRTWarp ---------------- */
  RB.demo('crt-warp', function (stage) {
    var cv = full(stage);
    var p = RB.pointer(cv);
    RB.canvas(cv, function (ctx, w, h, dt, t) {
      ctx.fillStyle = '#040705';
      ctx.fillRect(0, 0, w, h);
      var cell = Math.max(10, Math.round(w / 44));
      var px = p.inside ? p.x / w - 0.5 : 0;
      var py = p.inside ? p.y / h - 0.5 : 0;
      for (var y = 0; y < h; y += cell) {
        for (var x = 0; x < w; x += cell) {
          var v = Math.sin(x * 0.045 + t * 1.4 + px * 3) + Math.sin(y * 0.07 - t * 1.1 + py * 3) + Math.sin((x + y) * 0.03 + t * 0.8);
          var a = v > 0.7 ? 0.95 : v > 0 ? 0.45 : 0.14;
          ctx.fillStyle = 'rgba(51,255,102,' + a + ')';
          ctx.fillRect(x, y, cell - 2, cell - 2);
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,.26)';
      for (var sy = 0; sy < h; sy += 3) ctx.fillRect(0, sy, w, 1);
      var g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.85);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,.72)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  });

  /* ---------------- FaultyTerminal ---------------- */
  RB.demo('faulty-terminal', function (stage) {
    var cv = full(stage);
    var p = RB.pointer(cv);
    var glyphs = '01<>[]{}#$%&*+=?/\\|ABCDEFHKMNPQRSVXZ';
    var grid = [];
    var last = 0;
    RB.canvas(cv, function (ctx, w, h, dt, t) {
      var fs = 13, cw = 12, ch = 16;
      if (!grid.length) {
        for (var y = 0; y < h; y += ch) for (var x = 0; x < w; x += cw) grid.push({ x: x, y: y, c: ' ', a: 0 });
      }
      ctx.fillStyle = 'rgba(3,6,3,.34)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = fs + 'px ' + col('--font-mono', 'monospace');
      if (t - last > 0.11) {
        last = t;
        grid.forEach(function (g) {
          if (Math.random() < 0.12) { g.c = glyphs[Math.floor(Math.random() * glyphs.length)]; g.a = Math.random() * 0.7 + 0.12; }
        });
      }
      grid.forEach(function (g) {
        var d = p.inside ? Math.hypot(g.x - p.x, g.y - p.y) : 999;
        var hot = d < 70 ? 1 - d / 70 : 0;
        if (hot > 0.2 && Math.random() < 0.09) g.c = glyphs[Math.floor(Math.random() * glyphs.length)];
        ctx.fillStyle = hot > 0.1 ? 'rgba(176,255,190,' + (0.4 + hot * 0.6) + ')' : 'rgba(51,255,102,' + g.a + ')';
        ctx.fillText(g.c, g.x, g.y);
      });
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      for (var sy = 0; sy < h; sy += 3) ctx.fillRect(0, sy, w, 1);
    });
  });

  /* ---------------- Scanner ---------------- */
  RB.demo('scanner', function (stage) {
    var cv = full(stage);
    var p = RB.pointer(cv);
    RB.canvas(cv, function (ctx, w, h, dt, t) {
      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 0, w, h);
      var beam = (Math.sin(t * 0.55) * 0.5 + 0.5) * w;
      for (var y = 0; y < h; y += 4) {
        var d = Math.abs(y - (Math.sin(t * 0.9 + y * 0.02) * 0.5 + 0.5) * h);
        var a = 0.09 + (1 - Math.min(1, d / 80)) * 0.26;
        ctx.fillStyle = 'rgba(120,200,160,' + a + ')';
        ctx.fillRect(0, y, w, 1);
      }
      var g = ctx.createLinearGradient(beam - 24, 0, beam + 24, 0);
      g.addColorStop(0, 'rgba(60,255,160,0)');
      g.addColorStop(0.5, 'rgba(80,255,170,.55)');
      g.addColorStop(1, 'rgba(60,255,160,0)');
      ctx.fillStyle = g;
      ctx.fillRect(beam - 24, 0, 48, h);
      ctx.strokeStyle = 'rgba(150,255,200,.95)';
      ctx.beginPath();
      ctx.moveTo(beam, 0);
      ctx.lineTo(beam, h);
      ctx.stroke();
      if (p.inside) {
        ctx.strokeStyle = 'rgba(160,255,200,.35)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 38, 0, Math.PI * 2);
        ctx.stroke();
      }
      var v = ctx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, h * 0.9);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,.8)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    });
  });

  /* ---------------- Dither ---------------- */
  RB.demo('dither', function (stage) {
    var cv = full(stage);
    var p = RB.pointer(cv);
    var trail = [];
    var bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    RB.canvas(cv, function (ctx, w, h, dt, t) {
      ctx.fillStyle = paper();
      ctx.fillRect(0, 0, w, h);
      var cell = 5;
      if (p.inside) { trail.push({ x: p.x, y: p.y, t: t }); if (trail.length > 30) trail.shift(); }
      for (var y = 0; y < h; y += cell) {
        for (var x = 0; x < w; x += cell) {
          var v = Math.sin(x * 0.045 + t * 1.5) + Math.sin(y * 0.06 - t * 1.1) + Math.sin((x + y) * 0.02 + t * 0.7);
          var near = 0;
          for (var i = 0; i < trail.length; i++) {
            var d = Math.hypot(x - trail[i].x, y - trail[i].y);
            if (d < 60) near = Math.max(near, 1 - d / 60);
          }
          var th = (bayer[(y / cell | 0) % 4][(x / cell | 0) % 4] + 0.5) / 16 - 0.5;
          if (v + near * 1.6 > th) {
            ctx.fillStyle = near > 0.2 ? brand() : brand2();
            ctx.fillRect(x, y, cell - 1, cell - 1);
          }
        }
      }
    });
  });

  /* ---------------- LetterGlitch ---------------- */
  RB.demo('letter-glitch', function (stage) {
    var cv = full(stage);
    var p = RB.pointer(cv);
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+-<>';
    var cells = [];
    var last = 0;
    RB.canvas(cv, function (ctx, w, h, dt, t) {
      ctx.fillStyle = paper();
      ctx.fillRect(0, 0, w, h);
      var cw = 13, ch = 16;
      if (!cells.length) {
        for (var y = 6; y < h; y += ch) for (var x = 4; x < w; x += cw) cells.push({ x: x, y: y, c: chars[(Math.random() * chars.length) | 0], a: Math.random() * 0.55 + 0.1 });
      }
      if (t - last > 0.16) {
        last = t;
        cells.forEach(function (c) { if (Math.random() < 0.03) c.c = chars[(Math.random() * chars.length) | 0]; });
      }
      ctx.font = '12px ' + col('--font-mono', 'monospace');
      cells.forEach(function (c) {
        var d = p.inside ? Math.hypot(c.x - p.x, c.y - p.y) : 999;
        var hot = d < 60 ? 1 - d / 60 : 0;
        if (hot > 0.3 && Math.random() < 0.08) c.c = chars[(Math.random() * chars.length) | 0];
        ctx.fillStyle = hot > 0.15 ? brand() : ink(); ctx.globalAlpha = hot > 0.15 ? 1 : c.a;
        ctx.fillText(c.c, c.x, c.y);
        ctx.globalAlpha = 1;
      });
    });
  });

  /* ---------------- GlitchText ---------------- */
  RB.demo('glitch-text', function (stage) {
    stage.innerHTML =
      '<div class="gt-wrap"><span class="gt" data-text="YHuo">YHuo</span><span class="gt-sub">RGB split / jitter</span></div>';
  });

  /* ---------------- DecryptedText ---------------- */
  RB.demo('decrypted-text', function (stage) {
    var target = 'Hello, YHuo — welcome back.';
    stage.innerHTML = '<div class="dt-wrap"><span class="dt-text"></span><button class="lab-btn dt-replay" type="button">重播</button></div>';
    var out = stage.querySelector('.dt-text');
    var chars = '!<>-_\\/[]{}—=+*^?#________';
    var id = 0;
    function play() {
      clearInterval(id);
      var i = 0;
      out.textContent = '';
      id = setInterval(function () {
        var s = '';
        for (var k = 0; k < target.length; k++) {
          if (k < i) s += target[k];
          else if (k < i + 6) s += chars[(Math.random() * chars.length) | 0];
          else s += ' ';
        }
        out.textContent = s;
        i += 1;
        if (i > target.length) clearInterval(id);
      }, 32);
    }
    stage.querySelector('.dt-replay').addEventListener('click', play);
    play();
  });

  /* ---------------- GradientASCII ---------------- */
  RB.demo('gradient-ascii', function (stage) {
    var cv = full(stage);
    var p = RB.pointer(cv);
    var ramp = ' .:-=+*#%@';
    RB.canvas(cv, function (ctx, w, h, dt, t) {
      ctx.fillStyle = paper();
      ctx.fillRect(0, 0, w, h);
      var cw = 9, ch = 12;
      ctx.font = '10px ' + col('--font-mono', 'monospace');
      for (var y = 4; y < h; y += ch) {
        for (var x = 4; x < w; x += cw) {
          var v = (Math.sin(x * 0.035 + t * 0.9) + Math.sin(y * 0.05 - t * 0.7) + Math.sin((x + y) * 0.018 + t * 1.2)) / 3;
          v = (v + 1) / 2;
          if (p.inside) {
            var d = Math.hypot(x - p.x, y - p.y);
            if (d < 80) v = Math.min(1, v + (1 - d / 80) * 0.5);
          }
          var ch2 = ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))];
          var hue = 18 + v * 34;
          ctx.fillStyle = 'hsl(' + hue + ',58%,' + (32 + v * 26) + '%)';
          ctx.fillText(ch2, x, y);
        }
      }
    });
  });

  /* ---------------- PixelSnow ---------------- */
  RB.demo('pixel-snow', function (stage) {
    var cv = full(stage);
    var p = RB.pointer(cv);
    var flakes = [];
    RB.canvas(cv, function (ctx, w, h, dt, t) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = col('--background', '#f8f7f4');
      ctx.fillRect(0, 0, w, h);
      if (!flakes.length) {
        for (var i = 0; i < 90; i++) flakes.push({ x: Math.random() * w, y: Math.random() * h, s: 2 + Math.random() * 4, v: 8 + Math.random() * 22, o: Math.random() });
      }
      flakes.forEach(function (f) {
        f.y += f.v * dt / 1000;
        f.x += Math.sin(t + f.o * 6) * 0.35;
        if (p.inside) {
          var d = Math.hypot(f.x - p.x, f.y - p.y);
          if (d < 70) { f.x += (f.x - p.x) / d * 1.6; f.y += (f.y - p.y) / d * 1.2; }
        }
        if (f.y > h + 6) { f.y = -6; f.x = Math.random() * w; }
        if (f.x < -6) f.x = w + 6; if (f.x > w + 6) f.x = -6;
        ctx.fillStyle = document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,' + (0.5 + f.o * 0.5) + ')' : 'rgba(120,150,180,' + (0.42 + f.o * 0.34) + ')';
        ctx.fillRect(f.x | 0, f.y | 0, f.s, f.s);
      });
      ctx.fillStyle = 'rgba(120,150,180,.12)';
      ctx.fillRect(0, 0, w, 3);
    });
  });

  /* ---------------- Aurora ---------------- */
  RB.demo('aurora', function (stage) {
    var cv = full(stage);
    var p = RB.pointer(cv);
    RB.canvas(cv, function (ctx, w, h, dt, t) {
      ctx.fillStyle = col('--background', '#f8f7f4');
      ctx.fillRect(0, 0, w, h);
      var px = p.inside ? p.x / w - 0.5 : 0;
      for (var i = 0; i < 4; i++) {
        var g = ctx.createLinearGradient(0, 0, 0, h);
        var hue = 150 + i * 18;
        g.addColorStop(0, 'hsla(' + hue + ',70%,62%,0)');
        g.addColorStop(0.28, 'hsla(' + hue + ',70%,62%,.18)');
        g.addColorStop(0.62, 'hsla(' + (hue + 30) + ',75%,58%,.08)');
        g.addColorStop(1, 'hsla(' + hue + ',70%,62%,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.2 + i * 8);
        for (var x = 0; x <= w; x += 8) {
          var y = h * 0.18 + i * 12 + Math.sin(x * 0.012 + t * 0.55 + i * 1.3 + px * 4) * 22 + Math.sin(x * 0.004 - t * 0.3) * 18;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      }
    });
  });

  /* ---------------- Grainient ---------------- */
  RB.demo('grainient', function (stage) {
    var cv = full(stage);
    var p = RB.pointer(cv);
    RB.canvas(cv, function (ctx, w, h, dt, t) {
      var px = p.inside ? p.x / w : 0.5, py = p.inside ? p.y / h : 0.5;
      var g = ctx.createLinearGradient(0, 0, w, h);
      var a = 0.5 + Math.sin(t * 0.6 + px * 3) * 0.18;
      g.addColorStop(0, 'hsl(' + (24 + px * 20) + ',52%,' + (28 + a * 18) + '%)');
      g.addColorStop(0.55, 'hsl(' + (348 + py * 18) + ',48%,' + (34 + a * 14) + '%)');
      g.addColorStop(1, 'hsl(' + (200 + px * 30) + ',40%,' + (20 + a * 16) + '%)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // 颗粒：稀疏点，避免整屏随机像素太贵
      ctx.fillStyle = 'rgba(255,255,255,.11)';
      for (var i = 0; i < 600; i++) ctx.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1, 1);
    });
  });

  /* ---------------- Silk ---------------- */
  RB.demo('silk', function (stage) {
    var cv = full(stage);
    var p = RB.pointer(cv);
    RB.canvas(cv, function (ctx, w, h, dt, t) {
      var px = p.inside ? p.x / w : 0.5;
      ctx.fillStyle = '#0c0b0f';
      ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 22; i++) {
        var y0 = h * i / 22;
        var g = ctx.createLinearGradient(0, y0, w, y0 + 50);
        var a = 0.05 + Math.sin(i * 0.6 + t * 0.7) * 0.04 + 0.06;
        g.addColorStop(0, 'rgba(180,140,255,' + a + ')');
        g.addColorStop(0.5, 'rgba(255,210,190,' + (a + 0.06) + ')');
        g.addColorStop(1, 'rgba(120,180,255,' + a + ')');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, y0 + Math.sin(t * 0.8 + i) * 8);
        for (var x = 0; x <= w; x += 10) {
          var y = y0 + Math.sin(x * 0.012 + t * 0.65 + i * 0.22 + px * 3) * (18 + i * 0.5) + Math.sin(x * 0.004 - t * 0.4) * 10;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      }
    });
  });

  /* ---------------- LineWaves ---------------- */
  RB.demo('line-waves', function (stage) {
    var cv = full(stage);
    var p = RB.pointer(cv);
    RB.canvas(cv, function (ctx, w, h, dt, t) {
      ctx.fillStyle = col('--background', '#f8f7f4');
      ctx.fillRect(0, 0, w, h);
      var px = p.inside ? p.x / w - 0.5 : 0;
      var inkc = col('--foreground', '#1b1c1e');
      for (var i = 0; i < 34; i++) {
        ctx.beginPath();
        ctx.strokeStyle = inkc;
        ctx.globalAlpha = 0.08 + i / 34 * 0.16;
        for (var x = 0; x <= w; x += 6) {
          var y = h * 0.5 + (i - 17) * 4 + Math.sin(x * 0.018 + t * 0.7 + i * 0.16 + px * 4) * 12 + Math.sin(x * 0.006 - t * 0.4) * 18;
          if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      var bx = (t * 0.12 % 1) * w;
      var g = ctx.createLinearGradient(bx - 80, 0, bx + 80, 0);
      g.addColorStop(0, 'rgba(176,83,43,0)');
      g.addColorStop(0.5, 'rgba(176,83,43,.18)');
      g.addColorStop(1, 'rgba(176,83,43,0)');
      ctx.fillStyle = g;
      ctx.fillRect(bx - 80, 0, 160, h);
    });
  });

  /* ---------------- DotGrid ---------------- */
  RB.demo('dot-grid', function (stage) {
    var cv = full(stage);
    var p = RB.pointer(cv);
    var dots = [];
    var w = 0, h = 0;
    function init() {
      dots = [];
      for (var y = 12; y < h; y += 20) for (var x = 12; x < w; x += 20) dots.push({ x: x, y: y, x0: x, y0: y, vx: 0, vy: 0 });
    }
    var resized = false;
    RB.canvas(cv, function (ctx, ww, hh, dt, t) {
      if (ww !== w || hh !== h || !dots.length) { w = ww; h = hh; init(); }
      ctx.fillStyle = col('--background', '#f8f7f4');
      ctx.fillRect(0, 0, w, h);
      var px = p.inside ? p.x : -999, py = p.inside ? p.y : -999;
      dots.forEach(function (d) {
        var dx = d.x - px, dy = d.y - py;
        var dist = Math.hypot(dx, dy);
        if (dist < 100) {
          var f = (1 - dist / 100) * 1.6;
          d.vx += (dx / (dist || 1)) * f;
          d.vy += (dy / (dist || 1)) * f;
        }
        d.vx += (d.x0 - d.x) * 0.045;
        d.vy += (d.y0 - d.y) * 0.045;
        d.vx *= 0.9; d.vy *= 0.9;
        d.x += d.vx; d.y += d.vy;
        var near = Math.max(0, 1 - Math.hypot(d.x - px, d.y - py) / 90);
        ctx.fillStyle = near > 0.1 ? brand() : ink();
        ctx.globalAlpha = near > 0.1 ? 1 : (0.18 + near * 0.5);
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.4 + near * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    });
    cv.addEventListener('pointerdown', function (e) {
      var r = cv.getBoundingClientRect();
      var cx = e.clientX - r.left, cy = e.clientY - r.top;
      dots.forEach(function (d) {
        var dx = d.x - cx, dy = d.y - cy;
        var dist = Math.hypot(dx, dy) || 1;
        var f = Math.max(0, 1 - dist / 220) * 14;
        d.vx += dx / dist * f; d.vy += dy / dist * f;
      });
    });
  });

  /* ---------------- OrbitImages ---------------- */
  RB.demo('orbit-images', function (stage) {
    stage.innerHTML = '<div class="oi"><div class="oi-ring"></div><div class="oi-center">YHuo</div></div>';
    var ring = stage.querySelector('.oi-ring');
    RB.images(function (list) {
      var picks = list.slice(0, 6);
      picks.forEach(function (it, i) {
        var d = RB.el('div', 'oi-item');
        d.style.transform = 'rotate(' + (i * 60) + 'deg) translateX(96px) rotate(' + (-i * 60) + 'deg)';
        d.innerHTML = '<img alt="" loading="lazy">';
        d.querySelector('img').src = it.url;
        ring.appendChild(d);
      });
    });
  });

  /* ---------------- CircularText ---------------- */
  RB.demo('circular-text', function (stage) {
    stage.innerHTML =
      '<div class="ct-wrap"><svg viewBox="0 0 220 220" class="ct-svg" aria-label="YHuo personal homepage">' +
        '<defs><path id="ctPath" d="M110,110 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0"/></defs>' +
        '<text class="ct-text"><textPath href="#ctPath" startOffset="0">YHUO · PERSONAL HOMEPAGE · EST. 2026 · </textPath></text>' +
      '</svg><span class="ct-dot"></span></div>';
  });

  /* ---------------- DepthText ---------------- */
  RB.demo('depth-text', function (stage) {
    stage.innerHTML = '<div class="dpth-wrap"><span class="dpth" data-text="YHuo">YHuo</span></div>';
    var el = stage.querySelector('.dpth');
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--dx', (x * 14) + 'px');
      el.style.setProperty('--dy', (y * 14) + 'px');
    });
    stage.addEventListener('pointerleave', function () {
      el.style.setProperty('--dx', '0px');
      el.style.setProperty('--dy', '0px');
    });
  });

  /* ---------------- ClickSpark ---------------- */
  RB.demo('click-spark', function (stage) {
    stage.innerHTML = '<canvas class="cs-canvas"></canvas><div class="cs-hint">点一下</div>';
    var cv = stage.querySelector('.cs-canvas');
    var parts = [];
    var ctx = null, w = 0, h = 0;
    RB.canvas(cv, function (c, ww, hh, dt, t) {
      ctx = c; w = ww; h = hh;
      c.clearRect(0, 0, w, h);
      parts.forEach(function (p) {
        p.x += p.vx * dt / 16; p.y += p.vy * dt / 16;
        p.vy += 0.06; p.life -= dt / 620;
        p.vx *= 0.99; p.vy *= 0.99;
        if (p.life <= 0) return;
        c.strokeStyle = 'hsla(' + p.h + ',70%,55%,' + p.life + ')';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
        c.stroke();
      });
      parts = parts.filter(function (p) { return p.life > 0; });
    });
    cv.addEventListener('pointerdown', function (e) {
      var r = cv.getBoundingClientRect();
      var cx = e.clientX - r.left, cy = e.clientY - r.top;
      for (var i = 0; i < 26; i++) {
        var a = Math.random() * Math.PI * 2;
        var s = 1.5 + Math.random() * 4;
        parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, h: 20 + Math.random() * 30 });
      }
    });
  });
})();
