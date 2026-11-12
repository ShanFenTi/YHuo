/* ============================================================
   YHuo Lab · 核心
   清单、分组、公共工具。所有 demo 由后续 lab-*.js 注册到 RB.demos。
   ============================================================ */
(function () {
  'use strict';

  var RB = window.RB = window.RB || {};
  RB.demos = RB.demos || {};
  RB.demo = function (id, fn) { RB.demos[id] = fn; };

  RB.groups = [
    { id: 'global', no: '01', name: '全局质感', desc: '不改变功能，只把现有的按钮、开关、滑杆、提示做得更顺手。' },
    { id: 'ai', no: '02', name: 'AI 交互', desc: '思考轨迹、工作状态、语音输入——给 AI 页的一套工作态语言。' },
    { id: 'media', no: '03', name: '首页与相册', desc: '时钟、视频、照片墙、角色贴纸的视觉玩法。' },
    { id: 'nav', no: '04', name: '列表与导航', desc: '列表、侧栏、顶栏、步骤条与选项组的运动方式。' },
    { id: 'text', no: '05', name: '卡片与文字', desc: '卡片光效、个人名片、文字入场与用量仪表。' },
    { id: 'themes', no: '06', name: '主题与背景', desc: 'CRT/季节/氛围背景与彩蛋；默认不常驻，按主题启用。' }
  ];

  RB.manifest = [
    /* global */
    { id: 'gradual-blur', group: 'global', name: 'GradualBlur', src: 'Animations', desc: '边缘渐进模糊：顶栏、阅读层、滚动容器的上下缘不再硬切。', wide: true, stage: 'tall' },
    { id: 'squish-switch', group: 'global', name: 'SquishSwitch', src: 'Micro', desc: '滑块随拖动速度拉伸，撞到两端压扁再回弹。', note: '拖快一点看拉伸；点一下也能切。' },
    { id: 'warm-tooltip', group: 'global', name: 'WarmTooltip', src: 'Micro', desc: '第一个提示等 400ms，随后同组提示秒开；离开后 1.4s 内仍保持“热”。', note: '把鼠标在一排图标上快速扫过。' },
    { id: 'scrub-field', group: 'global', name: 'ScrubField', src: 'Micro', desc: '数字胶囊左右拖动改值，越界有橡皮筋；点一下可以键盘输入。', note: '拖动数字；点数字直接输入。' },
    { id: 'elastic-slider', group: 'global', name: 'ElasticSlider', src: 'Components', desc: '悬停时滑杆长高，拖过两端像橡皮筋一样拉伸再弹回。', note: '拖到最左/最右继续拉。' },

    /* ai */
    { id: 'thought-line', group: 'ai', name: 'ThoughtLine', src: 'Micro', desc: '一条可折叠的思考轨迹：实时计时，完成后收成一行摘要。', wide: true },
    { id: 'lattice-loader', group: 'ai', name: 'LatticeLoader', src: 'Micro', desc: '点阵逐格亮起的等待态 + 秒表，替代三点跳动。' },
    { id: 'status-mark', group: 'ai', name: 'StatusMark', src: 'Micro', desc: '一个状态符号从空闲环，长成进度弧，最后变成对勾。', note: '点按钮循环三种状态。' },
    { id: 'voice-pill', group: 'ai', name: 'VoicePill', src: 'Micro', desc: '麦克风按下后胀成胶囊，实时均衡条 + 计时，松手收束。', note: '按住麦克风按钮。' },

    /* media */
    { id: 'split-flap', group: 'media', name: 'SplitFlapText', src: 'TextAnimations', desc: '翻牌钟：每一位数字上下两半翻过去，机械感但不吵。', wide: true, stage: 'tall' },
    { id: 'scroll-expand', group: 'media', name: 'ScrollExpand', src: 'Animations', desc: '圆角视频框随滚动逐渐长到全屏，再缩回卡片。', wide: true, stage: 'tall' },
    { id: 'halftone-reveal', group: 'media', name: 'HalftoneReveal', src: 'Animations', desc: '照片先以半调网点呈现，指针扫过的地方显真彩。', wide: true, stage: 'tall' },
    { id: 'chroma-grid', group: 'media', name: 'ChromaGrid', src: 'Components', desc: '灰度照片墙，指针聚光处恢复颜色；离开后慢慢褪回灰度。', wide: true },
    { id: 'masonry', group: 'media', name: 'Masonry', src: 'Components', desc: '混合横竖图的瀑布流，重排有弹簧，点图开灯箱。', wide: true },
    { id: 'sticker-peel', group: 'media', name: 'StickerPeel', src: 'Animations', desc: '角色贴纸可以捏住一角撕起、拖动、甩出，松手回弹。', note: '拖动贴纸右下角。' },

    /* nav */
    { id: 'swipe-row', group: 'nav', name: 'SwipeRow', src: 'Micro', desc: '列表行左滑露出操作，滑到底松手删除；桌面保留按钮。', wide: true, note: '触屏或鼠标横向拖动。' },
    { id: 'animated-list', group: 'nav', name: 'AnimatedList', src: 'Components', desc: '列表行弹入、选中高亮滑行、方向键可移动。', note: '点行或按 ↑↓。' },
    { id: 'line-sidebar', group: 'nav', name: 'LineSidebar', src: 'Components', desc: '侧栏项随指针邻近程度平移与提亮，不是逐项 hover。' },
    { id: 'gooey-nav', group: 'nav', name: 'GooeyNav', src: 'Components', desc: '顶栏选中胶囊像黏液一样断开、流到新项目上。', wide: true },
    { id: 'pill-nav', group: 'nav', name: 'PillNav', src: 'Components', desc: '胶囊导航：底色从下方升起，文字向上滚出，active 点滑行。', wide: true },
    { id: 'stepper', group: 'nav', name: 'Stepper', src: 'Components', desc: '多步流程：指示器滑行、步骤弹簧切换、横竖两种布局。' },
    { id: 'jelly-radio', group: 'nav', name: 'JellyRadio', src: 'Micro', desc: '单选胶囊：选中的那个胀开，把邻居挤开。', wide: true },

    /* cards/text */
    { id: 'spotlight-card', group: 'text', name: 'SpotlightCard', src: 'Components', desc: '卡片上的柔光跟着指针走，边缘亮起并波及邻近卡片。' },
    { id: 'glare-hover', group: 'text', name: 'GlareHover', src: 'Animations', desc: '高光条按指针进入方向扫过卡片，像翻过一张铜版纸。' },
    { id: 'magic-bento', group: 'text', name: 'MagicBento', src: 'Components', desc: 'Bento 网格的边缘光、指针跟随与点击波纹。', wide: true },
    { id: 'profile-card', group: 'text', name: 'ProfileCard', src: 'Components', desc: '个人名片随指针 3D 倾斜，全息箔在倾斜时闪一下。' },
    { id: 'shiny-text', group: 'text', name: 'ShinyText', src: 'TextAnimations', desc: '一道高光缓慢扫过文字，适合标题与小标识。' },
    { id: 'star-border', group: 'text', name: 'StarBorder', src: 'Animations', desc: '一颗星沿着按钮/卡片轮廓跑，拖出星尘。' },
    { id: 'fold-text', group: 'text', name: 'FoldText', src: 'TextAnimations', desc: '每一行像折纸一样从折痕展开，适合随笔标题。' },
    { id: 'blur-text', group: 'text', name: 'BlurText', src: 'TextAnimations', desc: '文字从模糊到清晰逐词落位。' },
    { id: 'slosh-gauge', group: 'text', name: 'SloshGauge', src: 'Micro', desc: '液面随数值追赶、移动时倾斜、灌满时溅一下。', wide: true },

    /* themes */
    { id: 'crt-warp', group: 'themes', name: 'CRTWarp', src: 'Backgrounds', desc: '曲面 CRT 上的块状等离子，扫描线 + 磷光余晖。', wide: true, stage: 'tall' },
    { id: 'faulty-terminal', group: 'themes', name: 'FaultyTerminal', src: 'Backgrounds', desc: '闪烁的终端字符雨，指针处有磷光拖尾。', stage: 'tall' },
    { id: 'scanner', group: 'themes', name: 'Scanner', src: 'Backgrounds', desc: '扫描光束扫过干涉线，带 CRT 暗角与指针透镜。', stage: 'tall' },
    { id: 'dither', group: 'themes', name: 'Dither', src: 'Backgrounds', desc: 'Bayer/半调/线条三种抖动波形，指针拖出轨迹。', stage: 'tall' },
    { id: 'letter-glitch', group: 'themes', name: 'LetterGlitch', src: 'Backgrounds', desc: '一片字符在闪烁、错位、变色，指针搅动，点击撕开。', stage: 'tall' },
    { id: 'glitch-text', group: 'themes', name: 'GlitchText', src: 'TextAnimations', desc: 'RGB 分离与抖动故障字。', wide: true },
    { id: 'decrypted-text', group: 'themes', name: 'DecryptedText', src: 'TextAnimations', desc: '随机字符解密成真文字，适合 AI/终端语境。', wide: true },
    { id: 'gradient-ascii', group: 'themes', name: 'GradientASCII', src: 'Backgrounds', desc: '用 ASCII 字符画的渐变光晕，指针经过会错位。', stage: 'tall' },
    { id: 'pixel-snow', group: 'themes', name: 'PixelSnow', src: 'Backgrounds', desc: '分层像素雪花，指针可以拨开。', stage: 'tall' },
    { id: 'aurora', group: 'themes', name: 'Aurora', src: 'Backgrounds', desc: '页面顶部的柔和极光，缓慢流向指针。', wide: true, stage: 'tall' },
    { id: 'grainient', group: 'themes', name: 'Grainient', src: 'Backgrounds', desc: '带颗粒的流动渐变，指针可以搅动。', stage: 'tall' },
    { id: 'silk', group: 'themes', name: 'Silk', src: 'Backgrounds', desc: '绸缎褶皱的高光随指针转向。', stage: 'tall' },
    { id: 'line-waves', group: 'themes', name: 'LineWaves', src: 'Backgrounds', desc: '细线丝滑波动，一道光带缓慢穿过。', wide: true, stage: 'tall' },
    { id: 'dot-grid', group: 'themes', name: 'DotGrid', src: 'Backgrounds', desc: '有弹性的点阵，指针可以拨动、点击有冲击波。', stage: 'tall' },
    { id: 'orbit-images', group: 'themes', name: 'OrbitImages', src: 'Animations', desc: '照片沿椭圆轨道绕行，悬停会减速并抬起。' },
    { id: 'circular-text', group: 'themes', name: 'CircularText', src: 'TextAnimations', desc: '文字绕圆排布，可缓慢旋转。' },
    { id: 'depth-text', group: 'themes', name: 'DepthText', src: 'TextAnimations', desc: '多层挤出文字随指针视差错动。' },
    { id: 'click-spark', group: 'themes', name: 'ClickSpark', src: 'Animations', desc: '点击处爆出一小簇火花；只建议做彩蛋，不要全局。', wide: true, stage: 'tall' }
  ];

  /* ---------- 公共小工具 ---------- */
  RB.el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  RB.svg = function (path, size) {
    return '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  };
  RB.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  RB.lerp = function (a, b, t) { return a + (b - a) * t; };
  RB.reduced = function () {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };
  RB.touch = function () {
    try { return window.matchMedia('(hover: none), (pointer: coarse)').matches; } catch (e) { return false; }
  };
  RB.local = function (k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) {}
    return null;
  };

  /* 只在可见时跑 rAF，离屏自动停 */
  RB.visibleLoop = function (el, fn) {
    var raf = 0, running = false, last = 0, started = 0;
    function tick(now) {
      if (!running) return;
      var dt = last ? Math.min(48, now - last) : 16;
      last = now;
      fn(dt, (now - started) / 1000);
      raf = requestAnimationFrame(tick);
    }
    function start() {
      if (running) return;
      running = true; last = 0; started = performance.now();
      raf = requestAnimationFrame(tick);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
      }, { threshold: 0.06 });
      io.observe(el);
    } else start();
    return { stop: stop, start: start };
  };

  /* 高 DPI canvas 自适应；draw 收到 {w,h,dpr} */
  RB.canvas = function (canvas, draw) {
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0, dpr = 1;
    function resize() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    var loop = RB.visibleLoop(canvas, function (dt, t) { draw(ctx, w, h, dt, t); });
    return loop;
  };

  /* 指针位置（相对元素） */
  RB.pointer = function (el) {
    var p = { x: 0, y: 0, down: false, inside: false };
    function pos(e) {
      var r = el.getBoundingClientRect();
      p.x = e.clientX - r.left;
      p.y = e.clientY - r.top;
      return p;
    }
    el.addEventListener('pointermove', function (e) { pos(e); p.inside = true; });
    el.addEventListener('pointerenter', function (e) { pos(e); p.inside = true; });
    el.addEventListener('pointerleave', function () { p.inside = false; });
    el.addEventListener('pointerdown', function (e) { pos(e); p.down = true; });
    window.addEventListener('pointerup', function () { p.down = false; });
    return p;
  };

  /* 轻量 toast，给 demo 反馈用 */
  RB.toast = function (text) {
    var t = document.getElementById('labToast');
    if (!t) {
      t = RB.el('div', 'lab-toast');
      t.id = 'labToast';
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  };

  /* ---------- 页面装配 ---------- */
  RB.boot = function () {
    var wrap = document.getElementById('labSections');
    var nav = document.getElementById('labNav');
    var filters = document.getElementById('labFilters');
    if (!wrap) return;

    var byGroup = {};
    RB.groups.forEach(function (g) { byGroup[g.id] = []; });
    RB.manifest.forEach(function (m) { if (byGroup[m.group]) byGroup[m.group].push(m); });

    RB.groups.forEach(function (g) {
      var sec = RB.el('section', 'lab-group');
      sec.id = 'group-' + g.id;
      sec.dataset.group = g.id;
      var head = RB.el('div', 'lab-group-head');
      head.innerHTML = '<span class="lab-group-no">' + g.no + '</span><h2>' + g.name + '</h2><p>' + g.desc + '</p>';
      sec.appendChild(head);
      var grid = RB.el('div', 'lab-grid');
      byGroup[g.id].forEach(function (m) {
        var card = RB.el('article', 'lab-demo' + (m.wide ? ' wide' : ''));
        card.dataset.demo = m.id;
        var h = RB.el('div', 'lab-demo-head');
        h.innerHTML = '<h3>' + m.name + '</h3><span class="lab-demo-src">' + m.src + '</span>';
        card.appendChild(h);
        card.appendChild(RB.el('p', 'lab-demo-desc', m.desc));
        var stage = RB.el('div', 'lab-stage' + (m.stage === 'tall' ? ' tall' : '') + (m.stage === 'flush' ? ' flush' : ''));
        card.appendChild(stage);
        if (m.note) {
          var note = RB.el('p', 'lab-note');
          note.innerHTML = '<span class="lab-dot"></span><span>' + m.note + '</span>';
          card.appendChild(note);
        }
        grid.appendChild(card);
        // demo 延迟到可见再初始化
        var run = function () {
          try {
            if (RB.demos[m.id]) RB.demos[m.id](stage, m);
            else stage.innerHTML = '<div class="lab-missing">demo 未加载</div>';
          } catch (err) {
            stage.innerHTML = '<div class="lab-missing">出错了：' + String(err && err.message || err) + '</div>';
            if (window.console) console.error('[lab]', m.id, err);
          }
        };
        // 直接初始化：49 个 demo 的 DOM 很轻，canvas 循环另有 visibleLoop 门控。
        // 不用 IntersectionObserver 懒加载——IAB 后台窗格/隐藏标签页会冻结 IO 回调，整页空白。
        run();
      });
      sec.appendChild(grid);
      wrap.appendChild(sec);
    });

    // 顶部导航 + 筛选
    RB.groups.forEach(function (g) {
      var a = RB.el('a', '', g.name);
      a.href = '#group-' + g.id;
      a.dataset.group = g.id;
      nav.appendChild(a);
      var b = RB.el('button', '', g.no + ' ' + g.name);
      b.type = 'button';
      b.dataset.group = g.id;
      b.addEventListener('click', function () {
        var target = document.getElementById('group-' + g.id);
        if (target) target.scrollIntoView({ behavior: RB.reduced() ? 'auto' : 'smooth', block: 'start' });
      });
      filters.appendChild(b);
    });
    var count = document.getElementById('labCount');
    if (count) count.textContent = String(RB.manifest.length);

    // 滚动高亮 + 进度条
    var progress = document.querySelector('#labProgress i');
    var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a'));
    var filterBtns = Array.prototype.slice.call(filters.querySelectorAll('button'));
    function onScroll() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var p = max > 0 ? doc.scrollTop / max : 0;
      if (progress) progress.style.width = (p * 100).toFixed(2) + '%';
      var cur = RB.groups[0].id, best = -1e9;
      RB.groups.forEach(function (g) {
        var el = document.getElementById('group-' + g.id);
        if (!el) return;
        var top = el.getBoundingClientRect().top - 150;
        if (top < 0 && top > best) { best = top; cur = g.id; }
      });
      navLinks.forEach(function (a) { a.classList.toggle('on', a.dataset.group === cur); });
      filterBtns.forEach(function (b) { b.classList.toggle('on', b.dataset.group === cur); });
    }
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // 主题
    var themeBtn = document.getElementById('labTheme');
    if (RB.local('labTheme') === 'dark') document.documentElement.classList.add('dark');
    if (themeBtn) themeBtn.addEventListener('click', function () {
      var dark = document.documentElement.classList.toggle('dark');
      RB.local('labTheme', dark ? 'dark' : 'light');
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', RB.boot);
  else RB.boot();
})();

/* ---------- 站内素材 ---------- */
(function () {
  var RB = window.RB;
  var cache = null;
  RB.images = function (cb) {
    if (cache) { cb(cache); return; }
    var out = [];
    function push(list, prefix) {
      (list || []).forEach(function (it) {
        if (!it || !it.url) return;
        var url = prefix && it.url.charAt(0) !== '/' ? '/' + it.url : it.url;
        if (out.some(function (x) { return x.url === url; })) return;
        out.push({ url: url, title: it.title || it.name || '' });
      });
    }
    var jobs = [
      fetch('/api/playlist', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (d && d.ok) push(d.images, true);
      }).catch(function () {}),
      fetch('/images/manifest.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (d && d.files) push(d.files, true);
      }).catch(function () {}),
      fetch('/denia/manifest.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (d && d.files) push(d.files, true);
      }).catch(function () {}),
      fetch('/aemeath/manifest.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (d && d.files) push(d.files, true);
      }).catch(function () {})
    ];
    Promise.all(jobs).then(function () {
      if (!out.length) out = [
        { url: '/images/1.jpg', title: '1' },
        { url: '/images/3.webp', title: '3' },
        { url: '/images/4.webp', title: '4' },
        { url: '/images/5.webp', title: '5' },
        { url: '/images/6.webp', title: '6' },
        { url: '/images/7.webp', title: '7' },
        { url: '/images/8.jpeg', title: '8' }
      ];
      cache = out;
      cb(cache);
    });
  };
})();
