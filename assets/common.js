// =============================================
// YHuo 全站脚本（多页面改造：由原 index.html 主 IIFE 提取）
// 所有页面共用； meteor 流星特效已并入文件尾部。
// =============================================
  (function () {
    'use strict';

    // =========================
    // DOM 引用
    // =========================
    var siteHeader = document.getElementById('siteHeader');
    var progressBar = document.getElementById('progressBar');
    var backTopBtn = document.getElementById('backTop');
    var themeBtn = document.getElementById('themeToggle');
    
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
    var sectionLinks = navLinks.filter(function (a) {
      return a.getAttribute('data-target');
    });
    var sections = sectionLinks.map(function (a) {
      return document.getElementById(a.getAttribute('data-target'));
    }).filter(Boolean);

    var clockHEl = document.getElementById('clockH');
    var clockMEl = document.getElementById('clockM');
    var clockSEl = document.getElementById('clockS');
    var clockMsEl = document.getElementById('clockMs');
    var clockDateEl = document.getElementById('clockDate');

    var gallery = document.getElementById('galleryGrid');
    var galleryEmpty = document.getElementById('galleryEmpty');

    var miniPlayer = document.getElementById('miniPlayer');
    var miniTitle = document.getElementById('miniTitle');
    var miniPlayBtn = document.getElementById('miniPlayBtn');
    var miniPlayIcon = document.getElementById('miniPlayIcon');
    var miniPrevBtn = document.getElementById('miniPrevBtn');
    var miniNextBtn = document.getElementById('miniNextBtn');
    var miniProgressFill = document.getElementById('miniProgressFill');
    var miniListBtn = document.getElementById('miniListBtn');
    var miniPlaylist = document.getElementById('miniPlaylist');
    var miniPlaylistList = document.getElementById('miniPlaylistList');
    var miniModeBtn = document.getElementById('miniModeBtn');

    var footerTop = document.getElementById('footerTop');

    // =========================
    // 深色模式
    // =========================
    var THEME_KEY = 'apple-theme';
    var iconMoon = document.getElementById('iconMoon');
    var iconSun = document.getElementById('iconSun');

    function applyTheme(theme) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        if (iconMoon) iconMoon.hidden = true;
        if (iconSun) iconSun.hidden = false;
      } else {
        document.documentElement.classList.remove('dark');
        if (iconMoon) iconMoon.hidden = false;
        if (iconSun) iconSun.hidden = true;
      }
    }

    // 初始化主题（在渲染前尽可能早地应用，避免闪烁）
    var savedTheme = null;
    try {
      savedTheme = localStorage.getItem(THEME_KEY);
    } catch (e) {}
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    // 主题切换动效：新主题从按钮位置圆形扫出（View Transitions API，机制与参考站一致）。
    // Firefox 等不支持 VT 的浏览器自动降级为直接切换；reduced-motion 同样跳过动画
    var themeSwitching = false;
    var themeRevealStyle = document.getElementById('theme-reveal-style');
    if (!themeRevealStyle) {
      themeRevealStyle = document.createElement('style');
      themeRevealStyle.id = 'theme-reveal-style';
      document.head.appendChild(themeRevealStyle);
    }
    themeBtn.addEventListener('click', function () {
      if (themeSwitching) return;
      var isDark = document.documentElement.classList.contains('dark');
      var next = isDark ? 'light' : 'dark';
      var root = document.documentElement;
      var motionOK = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      if (motionOK && document.startViewTransition) {
        var rect = themeBtn.getBoundingClientRect();
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;
        // 覆盖全屏所需半径：圆心到最远角的距离 + 20px 余量
        var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 20;
        // 坐标必须用百分比：快照按设备像素密度光栅化，px 在 2x 屏会只画一半；
        // circle() 的百分比半径按归一化对角线 hypot(W,H)/√2 解析，故半径也要换算
        var xPct = (x / window.innerWidth) * 100;
        var yPct = (y / window.innerHeight) * 100;
        var rPct = radius / (Math.hypot(window.innerWidth, window.innerHeight) / Math.SQRT2) * 100;
        themeSwitching = true;
        themeBtn.classList.add('is-switching');
        themeRevealStyle.textContent = '@keyframes theme-reveal { from { clip-path: circle(0 at ' + xPct.toFixed(4) + '% ' + yPct.toFixed(4) + '%); } to { clip-path: circle(' + rPct.toFixed(4) + '% at ' + xPct.toFixed(4) + '% ' + yPct.toFixed(4) + '%); } }';
        root.classList.add('theme-vt');
        var vt = document.startViewTransition(function () { applyTheme(next); });
        vt.finished.catch(function () {}).finally(function () {
          themeSwitching = false;
          themeBtn.classList.remove('is-switching');
          root.classList.remove('theme-vt');
        });
      } else {
        applyTheme(next);
      }
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });

    // =========================
    // 滚动处理：导航高亮 + 进度条 + 回顶按钮 + 导航阴影
    // =========================
    function onScroll() {
      var scrollY = window.scrollY;
      var doc = document.documentElement;
      var maxScroll = doc.scrollHeight - window.innerHeight;

      // 阅读进度条
      if (progressBar) {
        progressBar.style.width = (maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0) + '%';
      }

      // 导航滚动阴影
      if (siteHeader) {
        siteHeader.classList.toggle('scrolled', scrollY > 10);
      }

      // 导航高亮
      var pos = scrollY + 120;
      var current = sections[0];
      sections.forEach(function (sec) {
        if (sec.offsetTop <= pos) current = sec;
      });
      var id = current ? current.id : '';
      // 多页面：仅首页按滚动位置高亮（子页面导航高亮是静态的，滚动逻辑不许摘掉它）
      if (sections.length)
      navLinks.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('data-target') === id);
      });

      // 回到顶部按钮
      if (backTopBtn) {
        backTopBtn.classList.toggle('show', scrollY > 600);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // =========================
    // 功能开关（后台「外观 → 功能开关」，/api/settings 下发，缺省全开）
    // 多页面架构（2026-09-05）：原「全屏层统一管理器」（FS_TOP/fsOpen/fsClose/垫底覆盖）与
    // 「路径路由器」（FS_ROUTE/popstate 深链接）已随「栏目拆独立页」整体移除——
    // 工具/文档/AI/杂项/留言各是真实页面（/tools/ /docs/ /ai/ /misc/ /board/），界面切换 = 真实导航；
    // 跨页无缝与音乐不断播由 IIFE 尾部的 PJAX 路由负责。
    // =========================
    var FLAGS_OFF = {}; // true 的界面/模块前台直接隐藏
    var FF_APPLY_HOOKS = []; // flags 应用后要通知的启动期模块（画廊等在各自块级作用域里注册回调，规避坑 9）
    var PAGE_KEY = document.documentElement.getAttribute('data-page') || 'home'; // 当前页面（各页 <html> 上标死）
    var PAGE_ROUTE = { home: '/', tools: '/tools/', docs: '/docs/', ai: '/ai/', misc: '/misc/', board: '/board/' };
    var PAGE_TITLES = { home: document.title, tools: '工具合集 - YHuo', docs: '文档 - YHuo', ai: 'AI 助手 - YHuo', misc: '杂项 - YHuo', board: '留言板 - YHuo' };

    // 应用功能开关：给 <html> 打/摘 ff-* 类（CSS 负责隐藏；head 内联脚本已按 localStorage 缓存提前打过，这里按最新配置校正）
    // 并刷新缓存供下次访问首屏预隐藏；天气/歌词条由各自渲染入口判 FLAGS_OFF
    function applyFeatureFlags(flags) {
      flags = flags || {};
      FLAGS_OFF = {
        toolsView: flags.tools === false,
        docsView: flags.docs === false,
        miscView: flags.misc === false,
        weather: flags.weather === false,
        lyric: flags.lyric === false,
        video: flags.video === false
      };
      var fc = document.documentElement.classList;
      fc.remove('ff-boot-hide'); // 配置已到达，首访的"先藏后放"状态按真实 flags 放行
      window.__FF_CACHE = flags; // 同步缓存镜像刷新为最新值（启动期代码判断用）
      fc.toggle('ff-tools-off', FLAGS_OFF.toolsView);
      fc.toggle('ff-docs-off', FLAGS_OFF.docsView);
      fc.toggle('ff-misc-off', FLAGS_OFF.miscView);
      fc.toggle('ff-video-off', FLAGS_OFF.video);
      try { localStorage.setItem('yhuoFlags', JSON.stringify(flags)); } catch (e) {}
      if (FLAGS_OFF.video) {
        var vb = document.querySelector('.video-box');
        if (vb) vb.style.display = 'none';
        var hv = document.getElementById('homeVideo');
        if (hv) { try { hv.pause(); } catch (e) {} }
      }
      FF_APPLY_HOOKS.forEach(function (fn) { try { fn(); } catch (e) {} }); // 通知启动期模块按最新开关校正（如画廊补加载）
      // 当前页面本身被开关关闭（后台关掉某栏目后直接访问/停留该页）：整页回首页
      if (PAGE_KEY !== 'home' && FLAGS_OFF[PAGE_KEY + 'View']) location.replace('/');
    }

    // =========================
    // 平滑滚动导航
    // =========================
    sectionLinks.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault(); // 仅首页有 #home 锚点；子页面导航全是真链接，不进这里
        var target = document.getElementById(a.getAttribute('data-target'));
        if (!target) return;
        var top = target.getBoundingClientRect().top + window.scrollY - 52;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });

    // 回到顶部按钮
    backTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 页脚回顶链接
    if (footerTop) {
      footerTop.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // =========================
    // 实时时钟
    // =========================
    var WEEK = ['日', '一', '二', '三', '四', '五', '六'];
    function pad2(n) {
      return (n < 10 ? '0' : '') + n;
    }
    function greetingText(h) {
      if (h < 5) return '夜深了 🌌';
      if (h < 11) return '早上好 ☀️';
      if (h < 13) return '中午好 🍚';
      if (h < 18) return '下午好 🌤️';
      return '晚上好 🌙';
    }
    var heroGreeting = null;
    var lastSecond = null;
    var homeClockTimers = [];
    function stopHomeClock() {
      homeClockTimers.forEach(clearInterval);
      homeClockTimers = [];
    }
    function startHomeClock() {
      stopHomeClock();
      clockHEl = document.getElementById('clockH');
      clockMEl = document.getElementById('clockM');
      clockSEl = document.getElementById('clockS');
      clockMsEl = document.getElementById('clockMs');
      clockDateEl = document.getElementById('clockDate');
      heroGreeting = document.getElementById('heroGreeting');
      updateClock();
      homeClockTimers.push(setInterval(updateClock, 200));
      // 毫秒滚数
      if (clockMsEl) {
        homeClockTimers.push(setInterval(function () {
          clockMsEl.textContent = '.' + ('00' + new Date().getMilliseconds()).slice(-3);
        }, 50));
      }
    }

    // =========================
    // 一言池：当日缓存（texts 数组，兼容旧 text 单条）优先，否则并行拉 6 条去重；
    // 寄语区与歌词条待机共用一个 Promise，避免重复请求。没配寄语时用它 3 秒轮播。
    // =========================
    var hitokotoPool = null;
    function getHitokotoPool() {
      if (hitokotoPool) return hitokotoPool;
      hitokotoPool = new Promise(function (resolve) {
        var cached = null;
        try { cached = JSON.parse(localStorage.getItem('dailyQuote')); } catch (e) {}
        // 只认新格式（texts 数组）；旧单条 text 缓存不作数，强制拉新的一批
        if (cached && cached.date === new Date().toDateString() && Array.isArray(cached.texts) && cached.texts.length > 1) {
          resolve(cached.texts);
          return;
        }
        var jobs = [];
        for (var i = 0; i < 6; i++) {
          jobs.push(fetch('https://v1.hitokoto.cn/?c=i&encode=json')
            .then(function (res) { return res.json(); })
            .catch(function () { return null; }));
        }
        Promise.all(jobs).then(function (list) {
          var seen = {}, texts = [];
          list.forEach(function (d) {
            if (!d || !d.hitokoto) return;
            var s = d.hitokoto + (d.from ? ' —— 「' + d.from + '」' : '');
            if (!seen[s]) { seen[s] = 1; texts.push(s); }
          });
          if (!texts.length) {
            // 主域名全军覆没：换国际备用域名再试一批
            var jobs2 = [];
            for (var j = 0; j < 6; j++) {
              jobs2.push(fetch('https://international.v1.hitokoto.cn/?c=i&encode=json')
                .then(function (res) { return res.json(); })
                .catch(function () { return null; }));
            }
            return Promise.all(jobs2).then(function (list2) {
              list2.forEach(function (d) {
                if (!d || !d.hitokoto) return;
                var s = d.hitokoto + (d.from ? ' —— 「' + d.from + '」' : '');
                if (!seen[s]) { seen[s] = 1; texts.push(s); }
              });
              resolve(texts);
            });
          }
          resolve(texts);
        }).then(function (texts) {
          if (texts.length) {
            try {
              localStorage.setItem('dailyQuote', JSON.stringify({ date: new Date().toDateString(), texts: texts }));
            } catch (e) {}
          }
          return texts;
        }).then(resolve);
      });
      return hitokotoPool;
    }

    // =========================
    // 时钟下方的寄语：管理员在后台设置过"主页寄语"就优先显示；
    // 否则用每日一言（多条，3 秒切一句）。打字机逐字打出并轮播切换（仿歌词条效果）。
    // =========================
    var hqTeardown = null;
    function destroyHomeQuote() {
      if (!hqTeardown) return;
      hqTeardown();
      hqTeardown = null;
    }
    function startHomeQuote() {
      destroyHomeQuote();
      var heroQuote = document.getElementById('heroQuote');
      if (!heroQuote) return;
      var heroQuoteText = document.getElementById('heroQuoteText');
      var hqList = [];            // 轮播内容池
      var hqIdx = -1;             // 当前显示条
      var hqTypeTimer = null;     // 打字机定时器
      var hqHoldTimer = null;     // 停留定时器
      var HQ_TYPE_MS = 45;        // 每字打字间隔
      var HQ_HOLD_MS = 6000;      // 寄语每条停留时长（一言用 3000）
      var hqHoldMs = HQ_HOLD_MS;  // 当前生效的停留时长
      var hqStop = false;         // 页面隐藏时暂停轮播

      function hqTypeText(text, done) {
        clearInterval(hqTypeTimer);
        heroQuote.classList.add('typing');
        var shown = 0;
        heroQuoteText.textContent = '';
        hqTypeTimer = setInterval(function () {
          shown++;
          heroQuoteText.textContent = text.slice(0, shown);
          if (shown >= text.length) {
            clearInterval(hqTypeTimer);
            heroQuote.classList.remove('typing');
            if (done) done();
          }
        }, HQ_TYPE_MS);
      }
      function hqNext() {
        if (hqStop || !hqList.length) return;
        hqIdx = (hqIdx + 1) % hqList.length;
        hqTypeText(hqList[hqIdx], function () {
          hqHoldTimer = setTimeout(hqNext, hqHoldMs);
        });
      }
      // 点击一言：立即切下一条；池子只有 0~1 条时在线拉一条新的（避免切了还是原来那句）
      heroQuote.addEventListener('click', function () {
        clearTimeout(hqHoldTimer);
        if (hqList.length >= 2) { hqNext(); return; }
        // 池子不足：现拉一条替换显示（不进池子，下次点击再拉）
        fetch('https://v1.hitokoto.cn/?c=i&encode=json')
          .then(function (res) { return res.ok ? res.json() : null; })
          .catch(function () { return null; })
          .then(function (d) {
            if (d && d.hitokoto) {
              var s = d.hitokoto + (d.from ? ' —— 「' + d.from + '」' : '');
              if (s !== hqList[hqIdx]) { hqTypeText(s); return; }
            }
            // 拉失败或与当前相同：换备用域名再试一次
            return fetch('https://international.v1.hitokoto.cn/?c=i&encode=json')
              .then(function (res) { return res.ok ? res.json() : null; })
              .catch(function () { return null; })
              .then(function (d2) {
                if (d2 && d2.hitokoto) {
                  var s2 = d2.hitokoto + (d2.from ? ' —— 「' + d2.from + '」' : '');
                  if (s2 !== hqList[hqIdx]) hqTypeText(s2);
                }
              });
          });
      });
      heroQuote.style.cursor = 'pointer';
      heroQuote.title = '点击切换';
      // 页面不可见时暂停打字/轮播，回来继续
      var onVis = function () {
        hqStop = document.hidden;
        if (hqStop) { clearInterval(hqTypeTimer); clearTimeout(hqHoldTimer); heroQuote.classList.remove('typing'); }
        else if (hqList.length > 1) hqNext();
      };
      document.addEventListener('visibilitychange', onVis);

      var showQuote = function (text, holdMs) {
        hqHoldMs = holdMs || HQ_HOLD_MS;
        heroQuote.hidden = false;
        requestAnimationFrame(function () {
          heroQuote.classList.add('loaded');
        });
        if (hqList.length > 1) { hqIdx = -1; hqNext(); } // 多条：打字机轮播
        else { heroQuoteText.textContent = text; }        // 单条：静态显示
      };
      var showQuotes = function (list) {
        hqList = list.filter(function (q) { return q && q.trim(); });
        if (!hqList.length) return loadDailyQuote();
        if (hqList.length === 1) {
          // 单条寄语：并入一言池混合轮播（避免只有一条时静态不动）
          getHitokotoPool().then(function (texts) {
            hqList = hqList.concat(texts);
            showQuote(hqList[0], 6000);
          });
          return;
        }
        showQuote(hqList[0]);
      };
      var loadDailyQuote = function () {
        getHitokotoPool().then(function (texts) {
          if (!texts.length) { heroQuote.hidden = true; return; }
          hqList = texts;
          showQuote(texts[0], 3000); // 一言：3 秒切一句
        });
      };
      fetch('/api/settings?t=' + Date.now(), { credentials: 'same-origin' }) // 时间戳穿透浏览器 60s 缓存
        .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('无接口')); })
        .then(function (s) {
          var qs = s && s.ok && Array.isArray(s.quotes) ? s.quotes : [];
          showQuotes(qs);
        })
        .catch(loadDailyQuote);

      hqTeardown = function () {
        clearInterval(hqTypeTimer);
        clearTimeout(hqHoldTimer);
        document.removeEventListener('visibilitychange', onVis);
      };
    }

    // =========================
    // 滚动入场动画
    // =========================
    var revealObserver = null;
    function initScrollReveal() {
      if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.content-section').forEach(function (el) {
          el.classList.add('visible');
        });
        return;
      }
      if (!revealObserver) {
        revealObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              revealObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
      }
      document.querySelectorAll('.content-section:not(.visible)').forEach(function (el) {
        revealObserver.observe(el);
      });
    }

    // =========================
    // 图片画廊 + 灯箱
    // =========================
    // 画廊状态挂 IIFE 作用域：resetCardMouse（外层）与外观开关要触达（坑 9：严格模式块内声明不可见）；
    // 非杂项页保持空默认值，resetCardMouse 因此不再有 undefined.forEach 隐患
    var loadedImgs = [];
    var tiltRaf = null;
    var hoverImg = null;
    var galleryCard = null;
    var cardMouseOn = true; // 大卡片跟随鼠标（外观卡片开关）
    var imgTiltOn = true;   // 小图片倾斜动效（外观卡片开关）
    var miscTeardown = null;
    var miscAllowHook = null; // 当前画廊实例的「配置到达校正」回调（经 FF_APPLY_HOOKS 转发）

    function initMiscGallery() {
      destroyMiscGallery();
      gallery = document.getElementById('galleryGrid');
      galleryEmpty = document.getElementById('galleryEmpty');
      if (!gallery) return;
      // 约定：图片命名为 1、2、3… 放入 images 文件夹，自动尝试多种格式
      var IMAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      var IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'];
      var imgPending = 0; // 等加载路径确定（后台接口或本地扫描）后再计数

      // 折叠相册：所有照片叠成一副牌，幻灯片式逐张展示（4 秒自动切换，悬停暂停）
      var deckIndex = 0;
      var deckTimer = null;
      var deckCount = document.getElementById('deckCount');
      var deckNav = document.getElementById('deckNav');
      var deckPrev = document.getElementById('deckPrev');
      var deckNext = document.getElementById('deckNext');

      function applyDeck() {
        var n = loadedImgs.length;
        if (!n) return;
        if (deckIndex >= n) deckIndex = 0;
        loadedImgs.forEach(function (el, i) {
          el.classList.remove('deck-front', 'deck-1', 'deck-2');
          var rel = (i - deckIndex + n) % n;
          if (rel === 0) el.classList.add('deck-front');
          else if (rel === 1) el.classList.add('deck-1');
          else if (rel === 2) el.classList.add('deck-2');
          el.style.zIndex = String(n - rel);
        });
        if (deckCount) deckCount.textContent = (deckIndex + 1) + ' / ' + n;
        if (deckNav) deckNav.hidden = n < 2;
      }

      function deckStep(delta) {
        var n = loadedImgs.length;
        if (n < 2) return;
        deckIndex = (deckIndex + delta + n) % n;
        applyDeck();
        restartDeckTimer();
      }

      function restartDeckTimer() {
        if (deckTimer) { clearInterval(deckTimer); deckTimer = null; }
        if (loadedImgs.length < 2) return;
        deckTimer = setInterval(function () {
          if (document.hidden || !loadedImgs.length) return;
          deckIndex = (deckIndex + 1) % loadedImgs.length;
          applyDeck();
        }, 4000);
      }

      // 布局：舞台高度要容得下最大的照片（照片最宽 560px，4:3 + 上下白边 ≈ 432px），
      // 否则最大化窗口时照片会戳出白色卡片、盖住下方的切换按钮
      function layoutGallery() {
        gallery.style.height = loadedImgs.length ? 'min(42vw, 432px)' : '0px';
        applyDeck();
        if (loadedImgs.length > 1 && !deckTimer) restartDeckTimer();
      }
      window.addEventListener('resize', layoutGallery);

      if (deckPrev) deckPrev.addEventListener('click', function () { deckStep(-1); });
      if (deckNext) deckNext.addEventListener('click', function () { deckStep(1); });
      // 悬停在照片上时暂停自动轮播，移开继续
      gallery.addEventListener('mouseenter', function () {
        if (deckTimer) { clearInterval(deckTimer); deckTimer = null; }
      });
      gallery.addEventListener('mouseleave', function () { restartDeckTimer(); });

      // 鼠标动效：卡片 3D 倾斜 + 照片视差 + 聚光灯（rAF 节流，纯 CSS 变量驱动）
      galleryCard = gallery.closest('.apple-card');
      var lastMove = null;
      var reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (galleryCard && !reduceMotion) {
        function applyCardMouse() {
          tiltRaf = null;
          if (!lastMove) return;
          var r = galleryCard.getBoundingClientRect();
          var nx = (lastMove.clientX - r.left) / r.width * 2 - 1; // -1 ~ 1
          var ny = (lastMove.clientY - r.top) / r.height * 2 - 1;
          if (cardMouseOn) {
            galleryCard.style.setProperty('--cx', (ny * -2.5).toFixed(2) + 'deg');
            galleryCard.style.setProperty('--cy', (nx * 2.5).toFixed(2) + 'deg');
            galleryCard.style.setProperty('--mx', ((nx + 1) / 2 * 100).toFixed(1) + '%');
            galleryCard.style.setProperty('--my', ((ny + 1) / 2 * 100).toFixed(1) + '%');
            loadedImgs.forEach(function (el, i) {
              var depth = 6 + (i % 3) * 5; // 每张照片视差深度不同
              el.style.setProperty('--px', (nx * depth).toFixed(1) + 'px');
              el.style.setProperty('--py', (ny * depth).toFixed(1) + 'px');
            });
          }

          // 单张照片自己的 3D 倾斜（跟随鼠标在照片内的位置）
          var t = lastMove.target && lastMove.target.tagName === 'IMG' ? lastMove.target : null;
          if (t !== hoverImg) {
            if (hoverImg) {
              hoverImg.style.setProperty('--ix', '0deg');
              hoverImg.style.setProperty('--iy', '0deg');
            }
            hoverImg = t;
          }
          if (hoverImg) {
            if (imgTiltOn) {
              var ir = hoverImg.getBoundingClientRect();
              var ix = (lastMove.clientX - ir.left) / ir.width * 2 - 1;
              var iy = (lastMove.clientY - ir.top) / ir.height * 2 - 1;
              hoverImg.style.setProperty('--ix', (iy * -10).toFixed(2) + 'deg');
              hoverImg.style.setProperty('--iy', (ix * 10).toFixed(2) + 'deg');
            } else {
              hoverImg.style.setProperty('--ix', '0deg');
              hoverImg.style.setProperty('--iy', '0deg');
            }
          }
        }
        galleryCard.addEventListener('mousemove', function (e) {
          if (!cardMouseOn && !imgTiltOn) return;
          lastMove = e;
          if (tiltRaf === null) {
            tiltRaf = requestAnimationFrame(applyCardMouse);
          }
        });
        galleryCard.addEventListener('mouseleave', resetCardMouse);
      }

      function addGalleryImg(img, n) {
        // 每张图带一点确定性倾斜/抖动，保留照片随手摆放的感觉
        img.style.setProperty('--tilt', (((n * 47) % 17) - 8) + 'deg');
        img.style.setProperty('--jx', (((n * 29) % 21) - 10) + 'px');
        img.style.setProperty('--jy', (((n * 13) % 15) - 7) + 'px');
        loadedImgs.push(img);
        gallery.appendChild(img);
        layoutGallery();
        imgDone();
      }

      function tryImage(n, extIndex) {
        if (extIndex >= IMAGE_EXT.length) {
          imgDone();
          return;
        }
        var img = new Image();
        img.alt = 'image ' + n;
        img.onload = function () {
          addGalleryImg(img, n);
        };
        img.onerror = function () {
          tryImage(n, extIndex + 1);
        };
        // 图片位于项目根目录 images/ 文件夹
        img.src = 'images/' + n + '.' + IMAGE_EXT[extIndex];
      }

      // 后台图片 + 本地 images/ 合并显示：后台的排前面；
      // 编号已在后台里的静态图跳过（如"1"已导入），避免前台重复显示
      function startGallery(apiImages) {
        var apiPart = (apiImages && apiImages.length) ? apiImages : [];
        var have = {};
        apiPart.forEach(function (m) { have[m.name] = true; });
        var staticNums = IMAGES.filter(function (n) { return !have[String(n)]; });
        imgPending = apiPart.length + staticNums.length;
        apiPart.forEach(function (m, i) {
          var img = new Image();
          img.alt = m.name;
          img.onload = function () {
            addGalleryImg(img, i + 1);
          };
          img.onerror = function () { imgDone(); };
          img.src = m.url;
        });
        staticNums.forEach(function (n) {
          tryImage(n, 0);
        });
      }
      function imgDone() {
        imgPending--;
        if (imgPending === 0 && gallery.children.length === 0) {
          galleryEmpty.hidden = false;
        }
      }
      function galleryGated() {
        // 相册界面已移除：画廊只看杂项开关（settings 已应用过以实时 flags 为准）
        if (FLAGS_OFF.miscView !== undefined) return FLAGS_OFF.miscView;
        // 画廊跑得比 settings 早：先看 head 内联脚本同步存的 window.__FF_CACHE，配置到达后经 FF_APPLY_HOOKS 校正补加载
        var c = window.__FF_CACHE;
        return !!(c && c.misc === false);
      }
      var galleryStarted = false;
      var pendingApiImages = null;
      function startGalleryIfAllowed(apiImages) {
        pendingApiImages = apiImages || null;
        if (galleryStarted || galleryGated()) return;
        galleryStarted = true;
        startGallery(pendingApiImages);
      }
      miscAllowHook = function () { startGalleryIfAllowed(pendingApiImages); };
      // 加载（fix：移除相册时误删的启动调用，画廊此前完全不出图）
      fetch('/api/playlist', { credentials: 'same-origin' })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('无后台接口')); })
        .then(function (data) {
          startGalleryIfAllowed(data && data.ok ? data.images : null);
        })
        .catch(function () { startGalleryIfAllowed(null); });

      miscTeardown = function () {
        if (deckTimer) { clearInterval(deckTimer); deckTimer = null; }
        window.removeEventListener('resize', layoutGallery);
        if (tiltRaf) { cancelAnimationFrame(tiltRaf); tiltRaf = null; }
        galleryCard = null;
        hoverImg = null;
        loadedImgs = [];
        miscAllowHook = null;
      };
    }

    function destroyMiscGallery() {
      if (miscTeardown) { miscTeardown(); miscTeardown = null; }
    }
    // 配置到达时转发校正（画廊比 settings 先启动/被开关拦下时补启动）
    FF_APPLY_HOOKS.push(function () {
      if (miscAllowHook) miscAllowHook();
    });

    // =========================
    // 首页视频轮播：video 文件夹里的视频依次循环播放（静音自动播放，控件可取消静音）
    // =========================
    var homeVideo = document.getElementById('homeVideo');
    var videoList = [];
    var videoIndex = 0;
    // 首页视频播放模式（后台视频页可设置）：seq 顺序循环 / single 单视频循环 / random 随机
    var videoMode = { mode: 'seq', url: '' };
    fetch('/api/settings?t=' + Date.now(), { credentials: 'same-origin' }) // 时间戳穿透浏览器 60s 缓存：后台改完设置（播放器款式等）下次进页面立即生效，不等缓存过期
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.ok && d.videoMode) videoMode = d.videoMode;
        if (videoList.length) applyVideoModeStart();
      })
      .catch(function () {});

    function isVideoName(n) {
      return /\.(mp4|webm|mov|m4v|ogv)$/i.test(n);
    }
    function videoSrcOf(item) {
      if (typeof item === 'string') return 'video/' + encodeURIComponent(item);
      return item.url || 'video/' + encodeURIComponent(item.name);
    }
    function playVideoAt(i) {
      if (!homeVideo || FLAGS_OFF.video || !videoList.length) return;
      videoIndex = ((i % videoList.length) + videoList.length) % videoList.length;
      homeVideo.src = videoSrcOf(videoList[videoIndex]);
      var p = homeVideo.play();
      if (p && p.catch) p.catch(function () {});
    }
    // 列表就绪后按当前播放模式选初始视频
    function applyVideoModeStart() {
      if (!videoList.length) return;
      if (videoMode.mode === 'single' && videoMode.url) {
        for (var i = 0; i < videoList.length; i++) {
          if (videoSrcOf(videoList[i]) === videoMode.url) { playVideoAt(i); return; }
        }
      } else if (videoMode.mode === 'random') {
        playVideoAt(Math.floor(Math.random() * videoList.length));
        return;
      }
      playVideoAt(0);
    }
    function playVideoList(list) {
      videoList = list;
      applyVideoModeStart();
    }
    // 后台清单 + 静态文件夹合并显示：后台的排前面，同名去重
    function autoLoadVideoFolder() {
      var apiList = null;
      var staticList = null;
      var apiP = fetch('/api/playlist', { credentials: 'same-origin' })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('无后台接口')); })
        .then(function (data) {
          if (data && data.ok && Array.isArray(data.video) && data.video.length) apiList = data.video;
        })
        .catch(function () {});
      var staticP = loadVideoStaticNames()
        .then(function (names) { staticList = names; })
        .catch(function () {});
      Promise.all([apiP, staticP]).then(function () {
        var seen = {};
        var combined = [];
        [].concat(apiList || [], staticList || []).forEach(function (item) {
          var n = typeof item === 'string' ? item : item.name;
          if (seen[n]) return;
          seen[n] = true;
          combined.push(item);
        });
        if (combined.length) playVideoList(combined);
      });
    }
    function loadVideoStaticNames() {
      return fetch('video/', { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('video 目录不可访问');
          return res.text();
        })
        .then(function (html) {
          var names = [];
          var re = /<a href="([^"]+)">/g;
          var m;
          while ((m = re.exec(html))) {
            var href = m[1];
            if (href.indexOf('../') === 0 || href === '/') continue;
            var name = decodeURIComponent(href);
            if (isVideoName(name) && names.indexOf(name) === -1) names.push(name);
          }
          // 与歌单同理：Cloudflare Pages 对不存在目录也返回 200，空结果必须抛错走清单兜底
          if (!names.length) throw new Error('目录列表中没有视频，改用清单文件');
          return names;
        })
        .catch(function () {
          return fetch('video/playlist.json', { credentials: 'same-origin' })
            .then(function (res) {
              if (!res.ok) throw new Error('无清单文件');
              return res.json();
            })
            .then(function (names) {
              if (!Array.isArray(names) || !names.length) throw new Error('清单为空');
              var list = names.filter(function (n) { return isVideoName(n); });
              if (!list.length) throw new Error('清单里没有视频');
              return list;
            })
            .catch(function () {});
        });
    }
    function startHomeVideo() {
      homeVideo = document.getElementById('homeVideo');
      if (!homeVideo) return;
      homeVideo.addEventListener('ended', function () {
        // 单视频循环：还在独占当前视频就重播（currentTime 清零不重新加载）；否则按当前模式切下一个
        if (videoMode.mode === 'single' && videoMode.url === videoSrcOf(videoList[videoIndex])) {
          homeVideo.currentTime = 0;
          var p1 = homeVideo.play();
          if (p1 && p1.catch) p1.catch(function () {});
          return;
        }
        if (videoMode.mode === 'random') {
          var nxt = Math.floor(Math.random() * videoList.length);
          if (videoList.length > 1 && nxt === videoIndex) nxt = (nxt + 1) % videoList.length;
          playVideoAt(nxt);
          return;
        }
        playVideoAt(videoIndex + 1); // 播完自动切下一个，到末尾回到第一个
      });
      autoLoadVideoFolder();
    }

    // =========================
    // 音乐播放器
    // =========================
    var audio = new Audio();
    var AUDIO_EXT = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac', '.opus', '.aiff', '.aif', '.weba'];

    function isAudio(name) {
      var n = name.toLowerCase();
      return AUDIO_EXT.some(function (ext) {
        return n.indexOf(ext) === n.length - ext.length;
      });
    }

    var tracks = [];
    var current = -1;
    // 当前曲目按歌名追踪：列表合并/重排后按下标会错位，先记名再重新定位
    var currentName = null;

    // 歌名展示名：去掉音频格式后缀（播放条/播放列表/搜索显示用）；
    // tracks[].name 本身保持原名——收藏定位与搜索匹配都靠它，别在数据上剥后缀
    function musicDisplayName(name) {
      return String(name || '').replace(/\.(mp3|wav|m4a|flac|ogg|aac|opus)$/i, '');
    }
    // 上次会话的播放进度（等文件夹扫描完成后尝试接续；读不到文件夹时用于缓存兜底）
    var pendingMeta = null;

    function syncCurrentByName() {
      if (!currentName) return;
      for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].name === currentName) { current = i; return; }
      }
    }

    function playIndex(i) {
      if (i < 0 || i >= tracks.length) return;
      current = i;
      currentName = tracks[i].name;
      audio.src = tracks[i].src;
      audio.play().catch(function () {});
      if (miniTitle) miniTitle.textContent = musicDisplayName(tracks[i].name);
      updateMiniCover(); // 迷你播放器封面跟随切歌
      musicLyricsLoad(tracks[i].name, tracks[i].src, tracks[i].lrc); // 歌词横条跟随切歌
      renderPlaylist();
      saveMeta();
    }

    // 迷你播放器专辑封面：当前曲目有 cover（后台曲库下发）就显示图片并参与旋转，否则回落音符图标
    function updateMiniCover() {
      var cover = document.getElementById('miniCover');
      var img = document.getElementById('miniCoverImg');
      if (!cover || !img) return;
      var t = current >= 0 ? tracks[current] : null;
      if (t && t.cover) {
        // 封面地址失效（KV 被删/备份恢复后悬空键）回落音符图标，不露破图；
        // src 每次都重新赋值（同地址走缓存），保证加载失败后再次选中还能触发 onerror
        img.onerror = function () {
          img.onerror = null;
          cover.classList.remove('has-cover');
        };
        img.src = t.cover;
        cover.classList.add('has-cover');
      } else {
        img.onerror = null;
        img.removeAttribute('src');
        cover.classList.remove('has-cover');
      }
    }

    function updatePlayIcon(playing) {
      var pauseSvg = '<circle cx="12" cy="12" r="10"/><line x1="10" x2="10" y1="15" y2="9"/><line x1="14" x2="14" y1="15" y2="9"/>';
      var playSvg = '<path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z"/><circle cx="12" cy="12" r="10"/>';
      if (miniPlayIcon) miniPlayIcon.innerHTML = playing ? pauseSvg : playSvg;
      if (miniPlayer) miniPlayer.classList.toggle('playing', playing);
      if (lyricBar) lyricBar.classList.toggle('playing', playing); // 歌词条右侧律动条：播放原地跳动，暂停静止
    }

    var pendingPlay = false; // 曲库加载期间点击过播放：加载完成后自动开始
    function togglePlay() {
      if (!tracks.length) {
        // 首次进入时曲库可能还在加载：记住播放意图，避免点击无反应
        pendingPlay = true;
        if (miniTitle) miniTitle.textContent = '曲库加载中…';
        return;
      }
      if (current < 0) {
        playIndex(0);
        return;
      }
      if (audio.paused) {
        audio.play().catch(function () {});
      } else {
        audio.pause();
      }
    }

    if (miniPlayBtn) miniPlayBtn.addEventListener('click', togglePlay);
    if (miniPrevBtn) {
      miniPrevBtn.addEventListener('click', function () {
        if (tracks.length) playIndex((current - 1 + tracks.length) % tracks.length);
      });
    }
    function nextTrack() {
      if (!tracks.length) return;
      // 随机播放：下一首随机（且不与当前重复，单曲时重播）
      if (playMode === 'shuffle' && tracks.length > 1) {
        var n = current;
        while (n === current) {
          n = Math.floor(Math.random() * tracks.length);
        }
        playIndex(n);
        return;
      }
      playIndex((current + 1) % tracks.length);
    }

    if (miniNextBtn) {
      miniNextBtn.addEventListener('click', nextTrack);
    }

    audio.addEventListener('play', function () {
      updatePlayIcon(true);
      saveMeta();
    });
    audio.addEventListener('pause', function () {
      updatePlayIcon(false);
      lyricFinishTyping(); // 歌词横条：暂停时当前句立即补完
      saveMeta();
    });
    audio.addEventListener('ended', function () {
      if (!tracks.length) return;
      // 单曲循环：重播当前曲目
      if (playMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(function () {});
        return;
      }
      nextTrack();
    });

    var lastMetaSave = 0;
    audio.addEventListener('timeupdate', function () {
      musicLyricsTick(); // 歌词横条：跟随播放进度同步当前句
      if (audio.duration) {
        if (miniProgressFill) {
          miniProgressFill.style.width = (audio.currentTime / audio.duration) * 100 + '%';
        }
        var now = Date.now();
        if (now - lastMetaSave > 1000) {
          lastMetaSave = now;
          saveMeta();
        }
      }
    });

    // =========================
    // 歌词横条（hero 末尾）：后台曲库自带 .lrc（media.lrc 随 /api/playlist 下发）或
    // music/ 曲库同名 .lrc，打字机逐字同步当前句。无歌词 → ♪ 歌名占位；从未播放 → 待机提示。
    // 防坑 2：Cloudflare 对不存在路径返回 200+首页，响应以 '<' 开头一律视为无歌词。
    // =========================
    var lyricBar = document.getElementById('lyricBar');
    var lyricText = document.getElementById('lyricText');
    var lyricLines = null;     // [{t, text}] 按时间排序（有时间戳的 lrc）
    var lyricPlain = null;     // [text] 纯文本歌词降级（无时间戳，按时长均分）
    var lyricIdx = -1;         // 当前句下标
    var lyricFull = '';        // 当前句完整文本（暂停时补完用）
    var lyricTypeTimer = null; // 打字机定时器
    var lyricFetchSeq = 0;     // 切歌取消上一次未完成的加载

    function lyricShowPlaceholder(text, waiting) {
      if (!lyricBar || FLAGS_OFF.lyric) return;
      clearInterval(lyricTypeTimer);
      lyricTypeTimer = null;
      lyricFull = '';
      lyricIdx = -1;
      lyricBar.hidden = false;
      lyricBar.classList.add('placeholder');
      lyricBar.classList.remove('typing');
      lyricBar.classList.toggle('waiting', !!waiting);
      lyricText.textContent = text;
      if (!lyricBar.classList.contains('show')) {
        void lyricBar.offsetWidth;
        lyricBar.classList.add('show');
      }
    }

    function lyricParseLrc(raw) {
      var rows = String(raw || '').split(/\r\n|\n|\r/);
      var timed = [], plain = [];
      var timeRe = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
      rows.forEach(function (line) {
        var m, times = [], consumed = 0;
        timeRe.lastIndex = 0;
        while ((m = timeRe.exec(line))) {
          var frac = m[3] ? parseInt(m[3], 10) / Math.pow(10, m[3].length) : 0;
          times.push(parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + frac);
          consumed = timeRe.lastIndex;
        }
        var text = line.slice(consumed).trim();
        if (!times.length) {
          if (/^\s*\[[a-zA-Z]+:/.test(line)) return; // [ti:/[ar: 等元数据行忽略
          if (text) plain.push(text);
          return;
        }
        if (text) times.forEach(function (t) { timed.push({ t: t, text: text }); }); // 一行多时间标签
      });
      if (timed.length) {
        timed.sort(function (a, b) { return a.t - b.t; });
        return { timed: timed, plain: null };
      }
      return plain.length ? { timed: null, plain: plain } : null;
    }

    // 曲目切换时调用：优先用后台曲库自带的 .lrc 文本（media.lrc，随 /api/playlist 下发）；
    // 否则取静态 music/ 同名 .lrc；本地 blob 无歌词。
    function lyricDisplayName(name) {
      return String(name || '').replace(/\.(mp3|wav|m4a|flac|ogg|aac|opus|aiff|aif|weba)$/i, '');
    }
    function musicLyricsLoad(name, src, lrc) {
      lyricLines = null;
      lyricPlain = null;
      lyricIdx = -1;
      var seq = ++lyricFetchSeq;
      lyricStopIdle(); // 任何切歌都终止待机一言轮播
      if (!lyricBar) return;
      var display = lyricDisplayName(name);
      // 后台曲库歌词：直接解析自带文本，不用再 fetch 同名文件
      if (lrc) {
        var parsed0 = lyricParseLrc(lrc);
        if (parsed0) {
          lyricLines = parsed0.timed;
          lyricPlain = parsed0.plain;
          lyricIdx = -1;
          musicLyricsTick();
        } else lyricShowPlaceholder('♪ ' + display);
        return;
      }
      if (!/music\//.test(src || '')) { lyricShowPlaceholder('♪ ' + display); return; } // KV 媒体/本地 blob 无同名 lrc 可取
      lyricShowPlaceholder('♪ ' + display, true); // 加载期间显示歌名 + 待机点
      fetch('music/' + encodeURIComponent(display) + '.lrc', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (txt) {
          if (seq !== lyricFetchSeq) return;
          if (!txt || /^\s*</.test(txt)) { lyricShowPlaceholder('♪ ' + display); return; } // 404/伪 200 HTML
          var parsed = lyricParseLrc(txt);
          if (!parsed) { lyricShowPlaceholder('♪ ' + display); return; }
          lyricLines = parsed.timed;
          lyricPlain = parsed.plain;
          lyricIdx = -1;
          musicLyricsTick();
        })
        .catch(function () {
          if (seq === lyricFetchSeq) lyricShowPlaceholder('♪ ' + display);
        });
    }

    function lyricStartTyping(text, lineDurMs) {
      if (!lyricBar || FLAGS_OFF.lyric) return;
      clearInterval(lyricTypeTimer);
      lyricTypeTimer = null;
      lyricFull = text;
      lyricBar.classList.remove('placeholder', 'waiting');
      lyricBar.classList.add('typing');
      var per = Math.max(15, Math.min(40, (lineDurMs || 4000) / Math.max(text.length, 1)));
      var shown = 0;
      lyricText.textContent = '';
      lyricTypeTimer = setInterval(function () {
        shown++;
        lyricText.textContent = text.slice(0, shown);
        if (shown >= text.length) clearInterval(lyricTypeTimer);
      }, per);
      if (!lyricBar.classList.contains('show')) {
        void lyricBar.offsetWidth;
        lyricBar.classList.add('show');
      }
    }

    // 暂停时当前句立即补完，不留半截
    function lyricFinishTyping() {
      if (lyricTypeTimer) {
        clearInterval(lyricTypeTimer);
        lyricTypeTimer = null;
        lyricText.textContent = lyricFull;
      }
    }

    // 播放进度 → 当前句（每次重算，句数少开销可忽略，seek 回退天然正确）
    function musicLyricsTick() {
      if (!lyricBar || lyricBar.hidden || (!lyricLines && !lyricPlain)) return;
      var sec = audio.currentTime || 0;
      var idx = -1, text = '', nextT = Infinity;
      if (lyricLines) {
        for (var i = 0; i < lyricLines.length; i++) {
          if (sec >= lyricLines[i].t) { idx = i; } else { nextT = lyricLines[i].t; break; }
        }
        text = idx >= 0 ? lyricLines[idx].text : '';
      } else {
        var dur = audio.duration || 240;
        var per = dur / lyricPlain.length;
        idx = Math.min(lyricPlain.length - 1, Math.floor(sec / per));
        nextT = (idx + 1) * per;
        text = lyricPlain[idx];
      }
      if (idx === lyricIdx) return;
      lyricIdx = idx;
      if (!text) { // 句前间隙/纯间奏：待机点 + 空文案
        clearInterval(lyricTypeTimer);
        lyricTypeTimer = null;
        lyricFull = '';
        lyricText.textContent = '';
        lyricBar.classList.remove('typing', 'placeholder');
        lyricBar.classList.add('waiting');
        return;
      }
      lyricStartTyping(text, Math.max(600, Math.min(8000, (nextT - sec) * 1000)));
    }

    // 从未播放过：待机提示（一言已移到天气胶囊下方独立显示，这里不再重复轮播）
    if (lyricBar) lyricShowPlaceholder('♪ 打开底部播放器，歌词会在这里滚动');
    function lyricStopIdle() {} // 切歌时调用，保留空实现（待机只有静态一句，无需终止）

    // pjax 回到首页时重绑歌词条元素（旧的已随 <main> 换掉）：播放中恢复当前句，从未播放显示待机
    function lyricRebind() {
      lyricBar = document.getElementById('lyricBar');
      lyricText = document.getElementById('lyricText');
      if (!lyricBar) return;
      if (!audio.src) {
        lyricShowPlaceholder('♪ 打开底部播放器，歌词会在这里滚动');
        return;
      }
      lyricBar.hidden = false;
      if (!lyricBar.classList.contains('show')) lyricBar.classList.add('show');
      lyricFinishTyping();
      musicLyricsTick();
    }

    // =========================
    // 底部悬浮迷你播放器
    // =========================
    function updateMiniPlayerVisibility() {
      if (!miniPlayer) return;
      var show = tracks.length > 0;
      miniPlayer.classList.toggle('show', show);
      document.body.classList.toggle('mini-active', show);
    }

    // 曲库扫描结束的统一收口：刷新列表、接续上次进度、补上加载期间点击的播放
    function finishMusicLoad() {
      updateMiniPlayerVisibility();
      var resumed = false;
      if (pendingMeta) resumed = applyResume();
      if (tracks.length) renderPlaylist();
      if (pendingPlay) {
        pendingPlay = false;
        if (!tracks.length) {
          if (miniTitle) miniTitle.textContent = '未找到歌曲';
        } else if (!resumed) {
          playIndex(0);
        } else if (audio.paused) {
          audio.play().catch(function () {});
        }
      } else if (!tracks.length && !resumed && miniTitle && miniTitle.textContent === '曲库加载中…') {
        miniTitle.textContent = 'music 文件夹里没有歌曲';
      }
    }

    // 恢复上次的播放进度：只在文件夹扫描结果里能找到那首歌时才接续（曲库严格跟随文件夹）
    function applyResume() {
      var meta = pendingMeta;
      pendingMeta = null;
      if (!meta || !meta.names || meta.current < 0 || meta.current >= meta.names.length) return false;
      var want = meta.names[meta.current];
      var idx = -1;
      for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].name === want) { idx = i; break; }
      }
      if (idx < 0) return false;
      current = idx;
      currentName = tracks[idx].name;
      if (miniTitle) miniTitle.textContent = musicDisplayName(tracks[idx].name);
      updateMiniCover(); // 迷你播放器封面跟随恢复的曲目
      musicLyricsLoad(tracks[idx].name, tracks[idx].src, tracks[idx].lrc); // 歌词横条跟随切歌
      audio.src = tracks[idx].src;
      audio.addEventListener('loadedmetadata', function () {
        audio.currentTime = meta.time || 0;
        if (meta.playing) {
          audio.play().catch(function () { updatePlayIcon(false); });
        }
      }, { once: true });
      if (meta.playing) updatePlayIcon(true);
      return true;
    }

    // =========================
    // 播放模式：顺序播放 / 随机播放 / 单曲循环
    // =========================
    var PLAY_MODES = ['order', 'shuffle', 'one'];
    var MODE_META = {
      order: {
        label: '顺序播放',
        icon: '<line x1="4" y1="8" x2="15" y2="8"/><path d="m12 5 3 3-3 3"/><line x1="4" y1="16" x2="15" y2="16"/><path d="m12 13 3 3-3 3"/>'
      },
      shuffle: {
        label: '随机播放',
        icon: '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>'
      },
      one: {
        label: '单曲循环',
        icon: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/>'
      }
    };
    var playMode = 'order';
    try {
      var savedMode = localStorage.getItem('playMode');
      if (PLAY_MODES.indexOf(savedMode) >= 0) playMode = savedMode;
    } catch (e) {}

    function applyPlayMode() {
      if (!miniModeBtn) return;
      var meta = MODE_META[playMode];
      miniModeBtn.innerHTML =
        '<svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        meta.icon + '</svg>';
      miniModeBtn.title = meta.label;
      miniModeBtn.setAttribute('aria-label', meta.label);
    }
    applyPlayMode();

    if (miniModeBtn) {
      miniModeBtn.addEventListener('click', function () {
        playMode = PLAY_MODES[(PLAY_MODES.indexOf(playMode) + 1) % PLAY_MODES.length];
        try { localStorage.setItem('playMode', playMode); } catch (e) {}
        applyPlayMode();
      });
    }

    // =========================
    // 播放列表面板
    // =========================
    var plCloseTimer = null;

    function renderPlaylist() {
      if (!miniPlaylistList) return;
      miniPlaylistList.innerHTML = '';
      tracks.forEach(function (t, i) {
        var li = document.createElement('li');
        if (i === current) li.className = 'active';
        var idx = document.createElement('span');
        idx.className = 'pl-index';
        idx.textContent = String(i + 1).padStart(2, '0');
        var name = document.createElement('span');
        name.className = 'pl-name';
        name.textContent = musicDisplayName(t.name);
        li.appendChild(idx);
        li.appendChild(name);
        // 收藏心形：只对站点内路径的曲目显示（本地文件夹的 blob 地址不可收藏）
        var tp = null;
        try { tp = new URL(t.src, location.href).pathname; } catch (e) {}
        if (tp && tp.charAt(0) === '/') {
          var fav = document.createElement('span');
          fav.className = 'pl-fav' + (favHas(tp) ? ' faved' : '');
          fav.title = favHas(tp) ? '取消收藏' : '收藏';
          fav.setAttribute('role', 'button');
          fav.setAttribute('aria-label', fav.title);
          fav.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
          fav.addEventListener('click', function (e) {
            e.stopPropagation(); // 别触发整行切歌
            favToggle('music', tp, t.name, function (on) {
              fav.classList.toggle('faved', on);
              fav.title = on ? '取消收藏' : '收藏';
              fav.setAttribute('aria-label', fav.title);
            });
          });
          li.appendChild(fav);
        }
        li.addEventListener('click', function () {
          playIndex(i);
        });
        miniPlaylistList.appendChild(li);
      });
      if (miniPlaylist && !miniPlaylist.hidden) {
        var act = miniPlaylistList.querySelector('li.active');
        if (act) act.scrollIntoView({ block: 'nearest' });
      }
    }

    function togglePlaylist(force) {
      if (!miniPlaylist) return;
      var show = typeof force === 'boolean' ? force : miniPlaylist.hidden;
      if (plCloseTimer) {
        clearTimeout(plCloseTimer);
        plCloseTimer = null;
      }
      if (show && tracks.length) {
        renderPlaylist();
        miniPlaylist.hidden = false;
        void miniPlaylist.offsetWidth;
        miniPlaylist.classList.add('show');
        var act = miniPlaylistList.querySelector('li.active');
        if (act) act.scrollIntoView({ block: 'nearest' });
      } else {
        miniPlaylist.classList.remove('show');
        plCloseTimer = setTimeout(function () {
          miniPlaylist.hidden = true;
        }, 200);
      }
      if (miniListBtn) miniListBtn.classList.toggle('active', show && tracks.length);
    }

    if (miniListBtn) {
      miniListBtn.addEventListener('click', function () {
        togglePlaylist();
      });
    }
    // 点击胶囊外或按 Esc 收起面板
    if (miniPlayer) {
      miniPlayer.addEventListener('click', function (e) { e.stopPropagation(); });
    }
    document.addEventListener('click', function () { togglePlaylist(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') togglePlaylist(false);
    });

    // =========================
    // IndexedDB 持久化
    // =========================
    var DB_NAME = 'musicStore';
    var STORE = 'files';
    var META_KEY = 'musicMeta';
    var DIR_KEY = 'musicDirHandle';
    var _dbPromise = null;

    function idbOpen() {
      if (_dbPromise) return _dbPromise;
      _dbPromise = new Promise(function (resolve, reject) {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () {
          req.result.createObjectStore(STORE);
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
      return _dbPromise;
    }

    function idbPut(key, blob) {
      return idbOpen().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(blob, key);
          tx.oncomplete = resolve;
          tx.onerror = function () { reject(tx.error); };
        });
      });
    }

    function idbGetAll(keys) {
      return idbOpen().then(function (db) {
        return Promise.all(keys.map(function (k) {
          return new Promise(function (resolve) {
            var tx = db.transaction(STORE, 'readonly');
            var req = tx.objectStore(STORE).get(k);
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { resolve(null); };
          });
        }));
      });
    }

    function saveMeta() {
      try {
        localStorage.setItem(META_KEY, JSON.stringify({
          names: tracks.map(function (t) { return t.name; }),
          current: current,
          time: audio.currentTime || 0,
          playing: !audio.paused
        }));
      } catch (e) {}
    }

    // 兜底：读不到 music 文件夹（如 file:// 直接打开）时，用浏览器缓存恢复曲目
    function restoreCachedTracks() {
      var meta = pendingMeta;
      pendingMeta = null;
      if (!meta || !meta.names || !meta.names.length || meta.current < 0) return;

      idbGetAll(meta.names).then(function (blobs) {
        var valid = blobs.every(function (b) { return !!b; });
        if (!valid) return;

        // 合并恢复：跳过已扫描到的新歌，避免互相覆盖
        var existing = {};
        tracks.forEach(function (t) { existing[t.name] = true; });
        meta.names.forEach(function (name, i) {
          if (existing[name]) return;
          tracks.push({ name: name, src: URL.createObjectURL(blobs[i]) });
          existing[name] = true;
        });
        tracks.sort(function (a, b) {
          return a.name.localeCompare(b.name, 'zh-Hans-CN');
        });
        updateMiniPlayerVisibility();

        // 排序后按歌名找回当前曲目
        currentName = meta.names[meta.current] || null;
        current = 0;
        syncCurrentByName();
        if (miniTitle) miniTitle.textContent = musicDisplayName(tracks[current].name);
          updateMiniCover(); // 迷你播放器封面跟随恢复的曲目
          musicLyricsLoad(tracks[current].name, tracks[current].src, tracks[current].lrc); // 歌词横条跟随切歌
        audio.src = tracks[current].src;

        // 曲库加载期间用户点过播放：直接开始
        if (pendingPlay) {
          pendingPlay = false;
          audio.play().catch(function () {});
        }

        audio.addEventListener('loadedmetadata', function () {
          audio.currentTime = meta.time || 0;
          if (meta.playing) {
            audio.play().catch(function () {
              updatePlayIcon(false);
            });
          }
        }, { once: true });
        if (meta.playing) updatePlayIcon(true);
      });
    }

    // =========================
    // 文件夹句柄持久化（File System Access API）
    // =========================
    function getDirHandle() {
      return idbOpen().then(function (db) {
        return new Promise(function (resolve) {
          var tx = db.transaction(STORE, 'readonly');
          var req = tx.objectStore(STORE).get(DIR_KEY);
          req.onsuccess = function () { resolve(req.result || null); };
          req.onerror = function () { resolve(null); };
        });
      });
    }

    function loadFromDirHandle(handle) {
      var collected = [];
      var iter = handle.values();

      function next() {
        try {
          var p = iter.next();
          if (p && typeof p.then === 'function') {
            p.then(onEntry).catch(function () { onEntry({ done: true }); });
          } else {
            onEntry(p);
          }
        } catch (e) {
          onEntry({ done: true });
        }
      }

      function onEntry(res) {
        if (!res || res.done) { finish(); return; }
        var entry = res.value;
        if (entry.kind === 'file' && isAudio(entry.name)) {
          entry.getFile().then(function (file) {
            collected.push({ name: entry.name, file: file });
            next();
          }).catch(function () { next(); });
        } else {
          next();
        }
      }

      function finish() {
        collected.sort(function (a, b) {
          return a.name.localeCompare(b.name, 'zh-Hans-CN');
        });
        if (collected.length) {
          tracks = collected.map(function (item) {
            return { name: item.name, src: URL.createObjectURL(item.file) };
          });
          syncCurrentByName();
          collected.forEach(function (item) { idbPut(item.name, item.file); });
        }
        finishMusicLoad();
        if (tracks.length) saveMeta();
      }

      next();
    }

    // 悬浮播放器（博客款）读取同一份曲库快照（未就绪时返回 null，由对方轮询等待）
    window.__siteMusicTracks = function () { return tracks.length ? tracks.slice() : null; };

    // 自动读取曲库：后台清单 + music 文件夹合并，后台的排前面，同名去重
    function autoLoadMusicFolder() {
      var apiItems = null;
      var staticNames = null;
      var apiP = fetch('/api/playlist', { credentials: 'same-origin' })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('无后台接口')); })
        .then(function (data) {
          if (data && data.ok && Array.isArray(data.music) && data.music.length) {
            apiItems = data.music.map(function (m) { return { name: m.name, url: m.url, lrc: m.lrc, cover: m.cover }; });
          }
        })
        .catch(function () {});
      var staticP = loadMusicStaticNames()
        .then(function (names) { staticNames = names; })
        .catch(function () {});
      Promise.all([apiP, staticP]).then(function () {
        var combined = [].concat(apiItems || [], staticNames || []);
        if (combined.length) { loadMusicFiles(combined); return; }
        // 彻底失败（如 file:// 直接打开）：给出明确提示，并退回用浏览器缓存恢复曲目
        if (!tracks.length && miniTitle && miniTitle.textContent === '曲库加载中…') {
          miniTitle.textContent = '无法读取 music 文件夹，请通过本地服务器打开';
        }
        if (!tracks.length) restoreCachedTracks();
      });
    }

    function loadMusicStaticNames() {
      return fetch('music/', { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('music 目录不可访问');
          return res.text();
        })
        .then(function (html) {
          var names = [];
          var re = /<a href="([^"]+)">/g;
          var m;
          while ((m = re.exec(html))) {
            var href = m[1];
            if (href.indexOf('../') === 0 || href === '/') continue;
            var name = decodeURIComponent(href);
            if (isAudio(name) && names.indexOf(name) === -1) names.push(name);
          }
          // 没解析到音频时必须抛错走清单兜底：
          // Cloudflare Pages 对不存在的目录也返回 200 + 首页内容（SPA 回退），
          // 静默 return 会导致歌单永远加载不出来
          if (!names.length) throw new Error('目录列表中没有音频，改用清单文件');
          return names;
        })
        .catch(function () {
          // 目录列表不可用时（GitHub Pages 等静态托管不支持）：
          // 退回读取清单文件 music/playlist.json（用"生成歌单.bat"维护）
          return fetch('music/playlist.json', { credentials: 'same-origin' })
            .then(function (res) {
              if (!res.ok) throw new Error('无清单文件');
              return res.json();
            })
            .then(function (names) {
              if (!Array.isArray(names) || !names.length) throw new Error('清单为空');
              var list = names.filter(function (n) { return isAudio(n); });
              if (!list.length) throw new Error('清单里没有音频');
              return list;
            });
        });
    }

    function loadMusicFiles(items) {
      // 合并模式：只补充列表里没有的新文件，不覆盖已恢复的会话
      // items 可以是文件名数组（静态目录模式）或 {name, url} 数组（后台接口模式）
      var nameOf = function (it) { return typeof it === 'string' ? it : it.name; };
      var existing = {};
      tracks.forEach(function (t) { existing[t.name] = true; });
      var fresh = items.filter(function (it) { return !existing[nameOf(it)]; });
      if (!fresh.length) return;
      var pending = fresh.length;
      var added = 0;
      // 接口模式：直接挂流地址播放（不整文件下载进缓存），顺序以接口返回为准
      var apiMode = fresh.some(function (it) { return typeof it !== 'string' && it.url; });
      var order = {};
      items.forEach(function (it, i) {
        var n = nameOf(it);
        if (!(n in order)) order[n] = i;
      });

      function trackDone() {
        pending--;
        if (pending === 0 && added) {
          if (apiMode) {
            tracks.sort(function (a, b) {
              return (order[a.name] !== undefined ? order[a.name] : 1e9) -
                     (order[b.name] !== undefined ? order[b.name] : 1e9);
            });
          } else {
            tracks.sort(function (a, b) {
              return a.name.localeCompare(b.name, 'zh-Hans-CN');
            });
          }
          syncCurrentByName();
          finishMusicLoad();
          saveMeta();
        }
      }

      fresh.forEach(function (item) {
        var name = nameOf(item);
        if (typeof item !== 'string' && item.url) {
          var dupIdx = -1;
          for (var i = 0; i < tracks.length; i++) {
            if (tracks[i].name === name) { dupIdx = i; break; }
          }
          if (dupIdx === -1) {
            tracks.push({ name: name, src: item.url, lrc: item.lrc, cover: item.cover }); // lrc=后台曲库歌词文本、cover=专辑封面地址（有才带）
            added++;
          } else {
            // 同名已在列（如缓存恢复先建了条目）：补齐后台后到的歌词/封面，当前曲目即时刷新封面
            var t0 = tracks[dupIdx];
            if (item.lrc && !t0.lrc) t0.lrc = item.lrc;
            if (item.cover && !t0.cover) t0.cover = item.cover;
            if (dupIdx === current) updateMiniCover();
          }
          trackDone();
          return;
        }
        fetch('music/' + encodeURIComponent(name))
          .then(function (res) {
            if (!res.ok) throw new Error('读取失败');
            return res.blob();
          })
          .then(function (blob) {
            // push 前再查一次：缓存恢复（restoreSession）可能已经把同名歌加进来了
            var dup = false;
            for (var i = 0; i < tracks.length; i++) {
              if (tracks[i].name === name) { dup = true; break; }
            }
            if (!dup) {
              var file = new File([blob], name, { type: blob.type });
              tracks.push({ name: name, src: URL.createObjectURL(file) });
              added++;
              idbPut(name, file);
            }
          })
          .catch(function () {})
          .then(trackDone);
      });
    }

    function autoRestoreDir() {
      if (window.showDirectoryPicker) {
        getDirHandle()
          .then(function (handle) {
            if (!handle) return autoLoadMusicFolder();
            return handle.queryPermission({ mode: 'read' }).then(function (perm) {
              if (perm === 'granted') loadFromDirHandle(handle);
              else autoLoadMusicFolder();
            });
          })
          .catch(function () { autoLoadMusicFolder(); });
      } else {
        autoLoadMusicFolder();
      }
    }

    // 初始化音乐：曲库严格跟随 music 文件夹，缓存只用于恢复"上次听到哪了"
    pendingMeta = null;
    try {
      var _m = JSON.parse(localStorage.getItem(META_KEY));
      if (_m && _m.names && _m.names.length && _m.current >= 0) pendingMeta = _m;
    } catch (e) {}
    autoRestoreDir();

    // 复位所有鼠标跟随变量（供 mouseleave 和外观开关共用；放在外层作用域，严格模式下块内函数声明不可见）
    function resetCardMouse() {
      if (tiltRaf !== null && tiltRaf !== undefined) {
        cancelAnimationFrame(tiltRaf);
        tiltRaf = null;
      }
      if (galleryCard) {
        galleryCard.style.setProperty('--cx', '0deg');
        galleryCard.style.setProperty('--cy', '0deg');
        galleryCard.style.setProperty('--mx', '50%');
        galleryCard.style.setProperty('--my', '50%');
      }
      if (hoverImg) {
        hoverImg.style.setProperty('--ix', '0deg');
        hoverImg.style.setProperty('--iy', '0deg');
        hoverImg = null;
      }
      loadedImgs.forEach(function (el) {
        el.style.setProperty('--px', '0px');
        el.style.setProperty('--py', '0px');
      });
    }

    // =========================
    // 外观抽屉：点击箭头弹出/收起，点外部或 Esc 收起
    // =========================
    var appearDock = document.getElementById('appearDock');
    var appearTab = document.getElementById('appearTab');

    function setAppearOpen(open) {
      document.body.classList.toggle('appear-open', open);
      if (appearTab) appearTab.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    if (appearTab) {
      appearTab.addEventListener('click', function (e) {
        e.stopPropagation();
        setAppearOpen(!document.body.classList.contains('appear-open'));
      });
    }
    document.addEventListener('click', function (e) {
      if (!document.body.classList.contains('appear-open')) return;
      if (appearDock && appearDock.contains(e.target)) return;
      setAppearOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setAppearOpen(false);
    });

    // =========================
    // 外观：主题色 + 自定义背景
    // =========================
    var swatches = Array.prototype.slice.call(document.querySelectorAll('.swatch'));
    var bgLayer = document.getElementById('bgLayer');
    var bgDimLayer = document.getElementById('bgDimLayer');
    var bgUploadBtn = document.getElementById('bgUploadBtn');
    var bgClearBtn = document.getElementById('bgClearBtn');
    var bgInput = document.getElementById('bgInput');
    var bgDimSlider = document.getElementById('bgDim');

    function applyAccent(name) {
      if (name === 'blue') name = 'terracotta'; // 蓝色默认已退役：旧 localStorage/后台存档统一归一到新默认陶土色
      document.documentElement.setAttribute('data-accent', name);
      swatches.forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-accent') === name);
      });
    }
    var savedAccent = null;
    try { savedAccent = localStorage.getItem('accent'); } catch (e) {}
    applyAccent(savedAccent || 'terracotta');

    // 播放器样式切换（后台「外观」设置，缺省迷你播放条）：blog 模式藏迷你条、显示悬浮播放器；
    // 本地存档 yhuoPlayerMode 供 head 内联脚本首屏预切。两种款式共用站内曲库
    var blogPlayerInited = false;
    function applyPlayerMode(mode) {
      var blog = mode === 'blog';
      document.documentElement.classList.toggle('using-blog-player', blog);
      try { localStorage.setItem('yhuoPlayerMode', blog ? 'blog' : 'mini'); } catch (e) {}
      if (!blog) return;
      if (blogPlayerInited) return;
      blogPlayerInited = true;
      if (typeof window.__initBlogPlayer === 'function') window.__initBlogPlayer();
    }
    swatches.forEach(function (b) {
      b.addEventListener('click', function () {
        var name = b.getAttribute('data-accent');
        applyAccent(name);
        try { localStorage.setItem('accent', name); } catch (e) {}
      });
    });

    function applyDim(v) {
      if (bgDimLayer) bgDimLayer.style.opacity = v / 100;
      if (bgDimSlider) bgDimSlider.value = v;
    }
    var savedDim = 25;
    try { savedDim = parseInt(localStorage.getItem('bgDim'), 10); } catch (e) {}
    if (isNaN(savedDim)) savedDim = 25;
    applyDim(savedDim);
    if (bgDimSlider) {
      bgDimSlider.addEventListener('input', function () {
        applyDim(parseInt(bgDimSlider.value, 10));
        try { localStorage.setItem('bgDim', bgDimSlider.value); } catch (e) {}
      });
    }

    // 背景模糊：blur 在全屏层边缘会露出半透明软边，配合轻微放大消除
    var bgBlurSlider = document.getElementById('bgBlur');
    var bgBlurFollowBtn = document.getElementById('bgBlurFollow');
    var siteDefaultBlur = null; // 管理员设置的站点默认（/api/settings 回来后填充）
    function applyBlur(v) {
      var px = isNaN(v) ? 0 : Math.max(0, Math.min(30, v));
      if (bgLayer) {
        bgLayer.style.filter = px > 0 ? 'blur(' + px + 'px)' : '';
        bgLayer.style.transform = px > 0 ? 'scale(1.08)' : '';
      }
      if (bgBlurSlider) bgBlurSlider.value = px;
    }
    // 本地存档 + 站点默认都存在时，提供"恢复跟随站点默认"入口（否则拖过一次就永远回不去了）
    function refreshBlurFollow() {
      if (!bgBlurFollowBtn) return;
      var hasLocal = false;
      try { hasLocal = localStorage.getItem('bgBlur') !== null; } catch (e) {}
      bgBlurFollowBtn.hidden = !(hasLocal && siteDefaultBlur !== null);
    }
    var savedBlur = 0;
    try { savedBlur = parseInt(localStorage.getItem('bgBlur'), 10); } catch (e) {}
    if (isNaN(savedBlur)) savedBlur = 0;
    applyBlur(savedBlur);
    if (bgBlurSlider) {
      bgBlurSlider.addEventListener('input', function () {
        applyBlur(parseInt(bgBlurSlider.value, 10));
        try { localStorage.setItem('bgBlur', bgBlurSlider.value); } catch (e) {}
        refreshBlurFollow();
      });
    }
    if (bgBlurFollowBtn) {
      bgBlurFollowBtn.addEventListener('click', function () {
        try { localStorage.removeItem('bgBlur'); } catch (e) {}
        applyBlur(siteDefaultBlur || 0);
        refreshBlurFollow();
      });
    }

    function applyCustomBg(blob) {
      if (!bgLayer) return;
      if (bgLayer.dataset.bgUrl) {
        URL.revokeObjectURL(bgLayer.dataset.bgUrl);
        delete bgLayer.dataset.bgUrl;
      }
      if (blob && blob.size) {
        var url = URL.createObjectURL(blob);
        bgLayer.style.backgroundImage = 'url(' + url + ')';
        bgLayer.dataset.bgUrl = url;
        document.body.classList.add('has-custom-bg');
      } else {
        bgLayer.style.backgroundImage = '';
        document.body.classList.remove('has-custom-bg');
      }
    }

    // =========================
    // 背景图选择器：默认从站内图片（images 文件夹）中挑选；也可上传本地图片
    // =========================
    var BG_SRC_KEY = 'customBgSrc';
    var bgPicker = document.getElementById('bgPicker');
    var bgPickerGrid = document.getElementById('bgPickerGrid');
    var bgPickerEmpty = document.getElementById('bgPickerEmpty');
    var bgLocalBtn = document.getElementById('bgLocalBtn');
    var bgPickerClose = document.getElementById('bgPickerClose');

    function applyBgFromSrc(src) {
      if (!bgLayer) return;
      if (bgLayer.dataset.bgUrl) {
        URL.revokeObjectURL(bgLayer.dataset.bgUrl);
        delete bgLayer.dataset.bgUrl;
      }
      bgLayer.style.backgroundImage = 'url(' + src + ')';
      document.body.classList.add('has-custom-bg');
      // 图片已不存在（如站内图片被删除）时自动清除，避免整页空白背景。
      // 加时间参数绕过浏览器缓存，确保探测的是服务器上的真实状态
      var probe = new Image();
      probe.onerror = function () {
        if (bgLayer.style.backgroundImage.indexOf(src) !== -1) {
          applyCustomBg(null);
          try { localStorage.removeItem(BG_SRC_KEY); } catch (e) {}
        }
      };
      probe.src = src + (src.indexOf('?') === -1 ? '?' : '&') + '_ck=' + Date.now();
    }

    function openBgPicker() {
      bgPickerGrid.innerHTML = '';
      var imgs = typeof loadedImgs !== 'undefined' ? loadedImgs : [];
      if (bgPickerEmpty) bgPickerEmpty.hidden = imgs.length > 0;
      var savedSrc = null;
      try { savedSrc = localStorage.getItem(BG_SRC_KEY); } catch (e) {}
      imgs.forEach(function (img) {
        var thumb = document.createElement('img');
        thumb.src = img.src;
        thumb.alt = '设为背景：' + (img.alt || '站内图片');
        if (savedSrc && img.src.indexOf(savedSrc) !== -1) thumb.classList.add('picked');
        thumb.addEventListener('click', function () {
          applyBgFromSrc(img.src);
          idbPut('customBg', '');
          try { localStorage.setItem(BG_SRC_KEY, img.src); } catch (e) {}
          closeBgPicker();
        });
        bgPickerGrid.appendChild(thumb);
      });
      bgPicker.hidden = false;
      void bgPicker.offsetWidth; // 触发重排以启用过渡动画
      bgPicker.classList.add('show');
    }

    function closeBgPicker() {
      bgPicker.classList.remove('show');
      setTimeout(function () {
        bgPicker.hidden = true;
      }, 250);
    }

    idbGetAll(['customBg']).then(function (blobs) {
      var savedSrc = null;
      try { savedSrc = localStorage.getItem(BG_SRC_KEY); } catch (e) {}
      if (!savedSrc && blobs[0]) applyCustomBg(blobs[0]);
    }).catch(function () {});
    {
      var _savedBgSrc = null;
      try { _savedBgSrc = localStorage.getItem(BG_SRC_KEY); } catch (e) {}
      if (_savedBgSrc) applyBgFromSrc(_savedBgSrc);
    }

    // 站点默认外观（管理员后台设置）：访客本地没自己选过主题色/背景时才采用
    fetch('/api/settings?t=' + Date.now(), { credentials: 'same-origin' }) // 时间戳穿透浏览器 60s 缓存：后台改完设置（播放器款式等）下次进页面立即生效，不等缓存过期
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        document.documentElement.classList.remove('ff-boot-hide'); // 有响应就放行首访预藏（off 类由 applyFeatureFlags 按 flags 决定）
        if (!d || !d.ok) return;
        applyFeatureFlags(d.flags); // 功能开关：关掉的界面/首页模块直接隐藏（缺省全开，接口失败不裁功能）
        if (d.accent && !savedAccent) applyAccent(d.accent);
        applyPlayerMode(d.playerMode);
        // 站点默认背景模糊：访客本地没自己调过滑杆（无 bgBlur 存档）才采用
        if (d.blur !== null && d.blur !== undefined) {
          siteDefaultBlur = d.blur;
          var hasLocalBlur = false;
          try { hasLocalBlur = localStorage.getItem('bgBlur') !== null; } catch (e) {}
          if (!hasLocalBlur) applyBlur(parseInt(d.blur, 10) || 0);
        }
        refreshBlurFollow();
        if (d.background) {
          idbGetAll(['customBg']).then(function (blobs) {
            var hasLocalBg = blobs && blobs[0] && blobs[0].size;
            if (hasLocalBg) return;
            var hasSrc = false;
            try { hasSrc = !!localStorage.getItem(BG_SRC_KEY); } catch (e) {}
            if (!hasSrc) applyBgFromSrc(d.background);
          }).catch(function () {});
        }
      })
      .catch(function () {
        document.documentElement.classList.remove('ff-boot-hide'); // 接口失败：全部放行（缺省全开）
      });

    if (bgUploadBtn) {
      bgUploadBtn.addEventListener('click', openBgPicker);
    }
    if (bgPickerClose) {
      bgPickerClose.addEventListener('click', closeBgPicker);
    }
    if (bgLocalBtn) {
      bgLocalBtn.addEventListener('click', function () {
        closeBgPicker();
        bgInput.click();
      });
    }
    // 点遮罩空白处关闭
    if (bgPicker) {
      bgPicker.addEventListener('click', function (e) {
        if (e.target === bgPicker) closeBgPicker();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && bgPicker && !bgPicker.hidden) closeBgPicker();
    });
    if (bgInput) {
      bgInput.addEventListener('change', function () {
        var f = bgInput.files[0];
        if (!f) return;
        applyCustomBg(f);
        idbPut('customBg', f);
        try { localStorage.removeItem(BG_SRC_KEY); } catch (e) {}
        bgInput.value = '';
      });
    }
    if (bgClearBtn) {
      bgClearBtn.addEventListener('click', function () {
        applyCustomBg(null);
        idbPut('customBg', '');
        try { localStorage.removeItem(BG_SRC_KEY); } catch (e) {}
      });
    }

    // 动效开关：大卡片跟随鼠标 / 小图片倾斜
    var cardMouseToggle = document.getElementById('cardMouseToggle');
    var imgMouseToggle = document.getElementById('imgMouseToggle');
    if (cardMouseToggle || imgMouseToggle) {
      var cardMouseSaved = null;
      var imgMouseSaved = null;
      try {
        cardMouseSaved = localStorage.getItem('cardMouse');
        imgMouseSaved = localStorage.getItem('imgMouse');
      } catch (e) {}
      cardMouseOn = cardMouseSaved !== '0';
      imgTiltOn = imgMouseSaved !== '0';
      if (cardMouseToggle) {
        cardMouseToggle.checked = cardMouseOn;
        cardMouseToggle.addEventListener('change', function () {
          cardMouseOn = cardMouseToggle.checked;
          try { localStorage.setItem('cardMouse', cardMouseOn ? '1' : '0'); } catch (e) {}
          if (!cardMouseOn) resetCardMouse();
        });
      }
      if (imgMouseToggle) {
        imgMouseToggle.checked = imgTiltOn;
        imgMouseToggle.addEventListener('change', function () {
          imgTiltOn = imgMouseToggle.checked;
          try { localStorage.setItem('imgMouse', imgTiltOn ? '1' : '0'); } catch (e) {}
          if (!imgTiltOn) resetCardMouse();
        });
      }
    }
    // 页脚：网站运行时长（起点为网站启用时间；如调整上线时间，改 SITE_BIRTH 即可）
    var SITE_BIRTH = new Date('2026-08-29T12:42:07+08:00');
    var uptimeEl = document.getElementById('siteUptime');
    function renderUptime() {
      if (!uptimeEl) return;
      var s = Math.max(0, Math.floor((Date.now() - SITE_BIRTH.getTime()) / 1000));
      var d = Math.floor(s / 86400);
      var h = Math.floor(s % 86400 / 3600);
      var m = Math.floor(s % 3600 / 60);
      uptimeEl.textContent = ' · 已运行 ' + d + ' 天 ' + h + ' 时 ' + m + ' 分 ' + (s % 60) + ' 秒';
    }
    renderUptime();
    setInterval(renderUptime, 1000);

    // 访问计数：每个浏览器会话只计一次（Cloudflare 部署时可用，失败静默）；带当前页面路径供后台记录访问明细
    if (!sessionStorage.getItem('visitCounted')) {
      sessionStorage.setItem('visitCounted', '1');
      fetch('/api/visit', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: location.pathname + location.hash })
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          var el = document.getElementById('visitCount');
          if (d && d.ok && el) {
            el.textContent = ' · 被访问 ' + d.visits + ' 次';
            el.hidden = false;
          }
        })
        .catch(function () {});
    }

    // =========================
    // 登录界面：真实账号体系（注册/登录走服务端验证），游客可进入；本次会话内记住，刷新不重弹
    // =========================
    var loginGate = document.getElementById('loginGate');
    var loginForm = document.getElementById('loginForm');
    var loginUser = document.getElementById('loginUser');
    var loginPass = document.getElementById('loginPass');
    var loginError = document.getElementById('loginError');
    var loginRegister = document.getElementById('loginRegister');
    var loginGuest = document.getElementById('loginGuest');
    var LOGIN_KEY = 'demoLogin';
    var LOGIN_NAME_KEY = 'demoLoginName';
    var LOGIN_AVATAR_KEY = 'demoLoginAvatar';
    function getLoginAvatar() {
      try { return sessionStorage.getItem(LOGIN_AVATAR_KEY); } catch (e) { return null; }
    }
    function setLoginAvatar(key) {
      try {
        if (key) sessionStorage.setItem(LOGIN_AVATAR_KEY, key);
        else sessionStorage.removeItem(LOGIN_AVATAR_KEY);
      } catch (e) {}
    }

    // 有记录即放行：'1' 为已登录，'guest' 为游客身份
    function gatePassed() {
      try { return !!sessionStorage.getItem(LOGIN_KEY); } catch (e) { return false; }
    }
    // 输入草稿：误触关闭或刷新后不丢已输入内容
    var LOGIN_DRAFT = 'demoLoginDraft';
    function saveLoginDraft() {
      try {
        sessionStorage.setItem(LOGIN_DRAFT, JSON.stringify({
          u: loginUser ? loginUser.value : '',
          p: loginPass ? loginPass.value : ''
        }));
      } catch (e) {}
    }
    function restoreLoginDraft() {
      try {
        var d = JSON.parse(sessionStorage.getItem(LOGIN_DRAFT) || 'null');
        if (d && loginUser && !loginUser.value) loginUser.value = d.u || '';
        if (d && loginPass && !loginPass.value) loginPass.value = d.p || '';
      } catch (e) {}
    }
    function clearLoginDraft() {
      try { sessionStorage.removeItem(LOGIN_DRAFT); } catch (e) {}
    }
    function showLoginMsg(text) {
      if (!loginError) return;
      if (text) {
        loginError.textContent = text;
        loginError.hidden = false;
      } else {
        loginError.hidden = true;
      }
    }
    // 认证请求：20 秒超时，网络挂起时也能给用户反馈
    // authJson 通用版（任意 body）；needCode（登录二次验证）原样透传给回调
    function authJson(path, body, done, busyBtns) {
      busyBtns = busyBtns || [];
      busyBtns.forEach(function (b) { if (b) b.disabled = true; });
      var opts = {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      };
      if (typeof AbortController === 'function') {
        var ctl = new AbortController();
        opts.signal = ctl.signal;
        setTimeout(function () { ctl.abort(); }, 20000);
      }
      fetch(path, opts)
        .then(function (res) {
          return res.json().catch(function () { return { ok: false, error: '响应异常' }; });
        })
        .then(function (d) {
          if (d && d.ok) done(d);
          else if (d && d.needCode) done({ ok: false, needCode: true, ticket: d.ticket, error: d.error });
          else done({ ok: false, error: (d && d.error) || '服务暂时不可用，请稍后重试' });
        })
        .catch(function () { done({ ok: false, error: '网络错误，请稍后重试' }); })
        .then(function () { busyBtns.forEach(function (b) { if (b) b.disabled = false; }); });
    }
    function authPost(path, u, p, done, busyBtns) {
      authJson(path, { username: u, password: p }, done, busyBtns);
    }
    function openGate() {
      document.body.classList.add('login-lock');
      loginGate.classList.remove('hide');
      loginGate.hidden = false;
      restoreLoginDraft();
      void loginGate.offsetWidth;
      loginGate.classList.add('show');
    }
    window.openGate = openGate; // 跨块调用（留言板等）：本块被 if 包裹，块内函数外层不可见（坑 9），经 window 暴露
    function passGate(role) {
      // role: 用户名（真实登录/注册）| 'guest' | '1'（历史遗留）
      try {
        sessionStorage.setItem(LOGIN_KEY, role === 'guest' ? 'guest' : '1');
        if (role === 'guest') {
          sessionStorage.removeItem(LOGIN_NAME_KEY);
          setLoginAvatar(null); // 游客无头像
        } else {
          sessionStorage.setItem(LOGIN_NAME_KEY, role);
        }
      } catch (e) {}
      if (loginError) loginError.hidden = true;
      clearLoginDraft();
      if (loginUser) loginUser.value = '';
      if (loginPass) loginPass.value = '';
      loginGate.classList.remove('show');
      loginGate.classList.add('hide');
      document.body.classList.remove('login-lock');
      refreshLoginBadge();
      setTimeout(function () { loginGate.hidden = true; }, 450);
    }
    function dismissGate() {
      // 误触/点空白关闭：不记身份、不清输入，重开时内容还在
      loginGate.classList.remove('show');
      loginGate.classList.add('hide');
      document.body.classList.remove('login-lock');
      setTimeout(function () { loginGate.hidden = true; }, 450);
    }
    // 顶栏登录按钮：悬停提示当前身份；真实登录显示主题色描边；
    // 有头像时显示圆形头像图，否则已登录显示首字徽章，未登录/游客显示人形图标
    var loginToggle = document.getElementById('loginToggle');
    var avatarImg = document.getElementById('avatarImg');
    var avatarLetter = document.getElementById('avatarLetter');
    function refreshLoginBadge() {
      if (!loginToggle) return;
      var role = null;
      var name = null;
      try {
        role = sessionStorage.getItem(LOGIN_KEY);
        name = sessionStorage.getItem(LOGIN_NAME_KEY);
      } catch (e) {}
      var av = getLoginAvatar();
      if (role === '1') {
        loginToggle.classList.add('logged-in');
        loginToggle.title = '个人中心（当前：' + (name || '已登录') + '）';
        loginToggle.setAttribute('aria-haspopup', 'dialog');
        if (av && avatarImg) {
          avatarImg.src = '/media/' + av;
          loginToggle.classList.add('has-avatar');
        } else {
          loginToggle.classList.remove('has-avatar');
          if (avatarImg) avatarImg.removeAttribute('src');
          if (avatarLetter) avatarLetter.textContent = (name || '?').slice(0, 1).toUpperCase();
        }
      } else if (role === 'guest') {
        loginToggle.classList.remove('logged-in', 'has-avatar');
        if (avatarImg) avatarImg.removeAttribute('src');
        loginToggle.title = '登录选项（当前：游客）';
      } else {
        loginToggle.classList.remove('logged-in', 'has-avatar');
        if (avatarImg) avatarImg.removeAttribute('src');
        loginToggle.title = '登录选项（未登录）';
      }
    }
    if (loginToggle) {
      refreshLoginBadge();
      loginToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var role = null;
        try { role = sessionStorage.getItem(LOGIN_KEY); } catch (err) {}
        if (role === '1') {
          // 已登录：点头像展开/收起个人中心
          setProfileOpen(!document.body.classList.contains('profile-open'));
        } else {
          // 未登录/游客：走登录卡片
          document.body.classList.add('login-lock');
          openGate();
        }
      });
    }
    if (loginGate) {
      if (gatePassed()) {
        loginGate.classList.add('hide');
        loginGate.hidden = true;
      } else {
        // 首次到访：先问服务器有没有仍然有效的会话（Cookie 30 天），
        // 有就静默放行，没有再浮出登录卡片
        document.body.classList.add('login-lock');
        restoreLoginDraft();
        var showGateLater = function () {
          setTimeout(function () { loginGate.classList.add('show'); }, 300);
        };
        fetch('/api/user/me', { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) {
            if (d && d.ok && d.authenticated && d.username) {
              setLoginAvatar(d.avatar || null); // 恢复登录态时同步头像
              passGate(d.username);
            } else showGateLater();
          })
          .catch(showGateLater);
      }
      // 点空白遮罩关闭：内容保留，可随时从右上角按钮重开
      loginGate.addEventListener('click', function (e) {
        if (e.target === loginGate) dismissGate();
      });
      if (loginUser) loginUser.addEventListener('input', saveLoginDraft);
      if (loginPass) loginPass.addEventListener('input', saveLoginDraft);

      // ---------- 登录卡片多模式：login | register | reset（忘记密码）| code（二次验证码步骤） ----------
      var gateMode = 'login';
      var gateEmailEnabled = false;   // 邮箱功能可用（找回密码入口/重置表单）
      var gateEmailRegister = false;  // 注册需邮箱验证（仅站长模式下为 false，普通用户注册不要邮箱）
      var gateTicket = '';          // 登录二次验证的中间票据
      var gateUser = '';            // 进入验证码步骤时暂存用户名
      var gateEmailInput = document.getElementById('gateEmail');
      var gateCodeInput = document.getElementById('gateCode');
      var gateNewPassInput = document.getElementById('gateNewPass');
      var gateSendCodeBtn = document.getElementById('gateSendCode');
      var forgotBtn = document.getElementById('forgotBtn');
      var backLoginBtn = document.getElementById('backLoginBtn');
      var loginSubEl = document.getElementById('loginSub');
      var loginSubmitBtn = document.getElementById('loginSubmitBtn');

      // ---------- 模式切换的平滑动画（登录/注册/找回/验证码互相过渡不生硬） ----------
      var gateMotionOK = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      function gateClearAnim(el) {
        if (el._gateT) { clearTimeout(el._gateT); el._gateT = 0; }
        el.style.transition = '';
        el.style.height = '';
        el.style.opacity = '';
        el.style.overflow = '';
        el.style.marginBottom = '';
        el.style.transform = '';
        el.style.flex = '';
        el.style.minWidth = '';
        el.style.whiteSpace = '';
      }
      // 输入行：高度+透明度+下边距一起过渡，卡片高度随内容平滑伸缩
      function gateSlide(el, show) {
        if (!el) return;
        var isHidden = el.style.display === 'none';
        if (show === !isHidden) return; // 显隐状态没变，不重复动画
        gateClearAnim(el);
        if (!gateMotionOK) { el.style.display = show ? '' : 'none'; return; }
        if (show) {
          el.style.display = '';
          var h = el.offsetHeight; // 先量自然高度再从 0 展开
          if (!h) return;
          el.style.overflow = 'hidden';
          el.style.height = '0px';
          el.style.opacity = '0';
          el.style.marginBottom = '0';
          el.style.transform = 'translateY(-6px)';
          void el.offsetWidth; // 强制回流让起始态生效
          el.style.transition = 'height 300ms var(--ease-out), opacity 240ms var(--ease-out), margin-bottom 300ms var(--ease-out), transform 300ms var(--ease-out)';
          el.style.height = h + 'px';
          el.style.opacity = '1';
          el.style.marginBottom = '';
          el.style.transform = '';
          el._gateT = setTimeout(function () { gateClearAnim(el); }, 340);
        } else {
          var h0 = el.offsetHeight;
          if (!h0) { el.style.display = 'none'; return; }
          el.style.overflow = 'hidden';
          el.style.height = h0 + 'px';
          void el.offsetWidth;
          el.style.transition = 'height 300ms var(--ease-out), opacity 200ms var(--ease-out), margin-bottom 300ms var(--ease-out), transform 300ms var(--ease-out)';
          el.style.height = '0px';
          el.style.opacity = '0';
          el.style.marginBottom = '0';
          el.style.transform = 'translateY(-6px)';
          el._gateT = setTimeout(function () {
            el.style.display = 'none';
            gateClearAnim(el);
          }, 320);
        }
      }
      // 小链接/发送按钮：淡入淡出
      function gateFade(el, show) {
        if (!el) return;
        var isHidden = el.style.display === 'none';
        if (show === !isHidden) return;
        gateClearAnim(el);
        if (!gateMotionOK) { el.style.display = show ? '' : 'none'; return; }
        if (show) {
          el.style.display = '';
          el.style.opacity = '0';
          void el.offsetWidth;
          el.style.transition = 'opacity 240ms var(--ease-out)';
          el.style.opacity = '1';
          el._gateT = setTimeout(function () { gateClearAnim(el); }, 280);
        } else {
          el.style.transition = 'opacity 180ms var(--ease-out)';
          el.style.opacity = '0';
          el._gateT = setTimeout(function () {
            el.style.display = 'none';
            gateClearAnim(el);
          }, 200);
        }
      }
      // 并排的注册按钮：flex 宽度+透明度过渡，避免整行布局突跳
      function gateFlex(el, show) {
        if (!el) return;
        var isHidden = el.style.display === 'none';
        if (show === !isHidden) return;
        gateClearAnim(el);
        if (!gateMotionOK) { el.style.display = show ? '' : 'none'; return; }
        el.style.minWidth = '0';
        el.style.whiteSpace = 'nowrap';
        if (show) {
          el.style.display = '';
          el.style.overflow = 'hidden';
          el.style.flex = '0 1 0%';
          el.style.opacity = '0';
          void el.offsetWidth;
          el.style.transition = 'flex 300ms var(--ease-out), opacity 240ms var(--ease-out)';
          el.style.flex = '1 1 0%';
          el.style.opacity = '1';
          el._gateT = setTimeout(function () { gateClearAnim(el); }, 340);
        } else {
          el.style.overflow = 'hidden';
          el.style.transition = 'flex 300ms var(--ease-out), opacity 200ms var(--ease-out)';
          el.style.flex = '0 1 0%';
          el.style.opacity = '0';
          el._gateT = setTimeout(function () {
            el.style.display = 'none';
            gateClearAnim(el);
          }, 320);
        }
      }
      // 文案切换（副标题/提交按钮）：先淡出换字再淡入
      function gateText(el, text) {
        if (!el || el.textContent === text) return;
        if (!gateMotionOK) { el.textContent = text; return; }
        if (el._gateT) { clearTimeout(el._gateT); el._gateT = 0; }
        el.style.transition = 'opacity 140ms var(--ease-out)';
        el.style.opacity = '0';
        el._gateT = setTimeout(function () {
          el.textContent = text;
          el.style.opacity = '1';
          el._gateT = setTimeout(function () {
            el.style.transition = '';
            el.style.opacity = '';
            el._gateT = 0;
          }, 180);
        }, 150);
      }

      function setGateMode(mode) {
        gateMode = mode;
        var emailOn = (gateEmailRegister && mode === 'register') || (gateEmailEnabled && mode === 'reset');
        var codeOn = emailOn || mode === 'code';
        // code 模式：验证码由服务器在密码验证通过时已发送，隐藏手动发送按钮
        // （先定发送按钮显隐再展开验证码行，量出来的高度才准确）
        gateFade(gateSendCodeBtn, codeOn && mode !== 'code');
        gateSlide(document.getElementById('emailField'), emailOn);
        gateSlide(document.getElementById('codeField'), codeOn);
        gateSlide(document.getElementById('newPassField'), mode === 'reset');
        gateSlide(document.getElementById('loginUserField'), mode === 'login' || mode === 'register');
        gateSlide(document.getElementById('loginPassField'), mode === 'login' || mode === 'register');
        gateFlex(loginRegister, mode === 'login');
        gateText(loginSubmitBtn, mode === 'register' ? '注 册' : mode === 'reset' ? '重置密码' : mode === 'code' ? '验 证' : '登 录');
        gateFade(forgotBtn, mode === 'login' && gateEmailEnabled);
        gateFade(backLoginBtn, mode !== 'login');
        gateText(loginSubEl, mode === 'register' ? '创建一个新账号'
          : mode === 'reset' ? '通过绑定邮箱找回密码'
          : mode === 'code' ? '输入邮箱里的验证码' : '欢迎回来，请登录');
        showLoginMsg('');
      }

      // 邮箱功能开关：跟随站点配置（后台未配邮件服务时相关 UI 全部隐藏；
      // 仅站长模式下注册不要邮箱，但找回密码入口保留——服务端只放行站长邮箱）
      fetch('/api/settings?t=' + Date.now(), { credentials: 'same-origin' }) // 时间戳穿透浏览器 60s 缓存：后台改完设置（播放器款式等）下次进页面立即生效，不等缓存过期
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          var was = gateEmailEnabled;
          gateEmailEnabled = !!(d && d.ok && d.emailEnabled);
          gateEmailRegister = !!(d && d.ok && d.emailRegister);
          if (was !== gateEmailEnabled || (gateMode === 'register' && !gateEmailRegister)) {
            setGateMode(gateMode); // 刷新字段可见性
          }
        })
        .catch(function () {});

      // 登录成功统一收口（普通登录 / 二次验证通过共用）
      function gateLoginDone(d, fallbackUser) {
        showLoginMsg('');
        setLoginAvatar(d.avatar || null); // 登录响应带头像键
        // 管理员账密验证通过时响应才带 admin:true，据此弹欢迎浮窗（含"进入后台"按钮）；
        // 不能查 /api/auth/status 判断登录身份——它只看浏览器有无管理员会话 Cookie，
        // 浏览器残留后台登录态时普通账号也会被误判（坑 11，欢迎浮窗也曾因此误弹）
        passGate(d.nickname || d.username || fallbackUser);
        favLoad(); // 拉取该账号的收藏
        setGateMode('login');
        try {
          if (d.admin) {
            sessionStorage.setItem('adminWelcome', '1');      // 本次会话是管理员登录
            sessionStorage.setItem('adminWelcomeShown', '1'); // 刚弹过，刷新不重复
            showWelcomeToast(d.username || fallbackUser, true);
          } else {
            // 普通账号登录：清掉可能残留的管理员标记，写自己的欢迎标记
            sessionStorage.removeItem('adminWelcome');
            sessionStorage.removeItem('adminWelcomeShown');
            sessionStorage.setItem('userWelcome', '1');
            sessionStorage.setItem('userWelcomeShown', '1');
            showWelcomeToast(d.username || fallbackUser, false);
          }
        } catch (e) {}
      }

      if (forgotBtn) {
        forgotBtn.addEventListener('click', function () { setGateMode('reset'); });
      }
      if (backLoginBtn) {
        backLoginBtn.addEventListener('click', function () {
          gateTicket = '';
          setGateMode('login');
        });
      }

      // 发送验证码（60 秒倒计时防连点）
      var codeCountdown = null;
      function startCodeCountdown() {
        var left = 60;
        if (gateSendCodeBtn) {
          gateSendCodeBtn.disabled = true;
          gateSendCodeBtn.textContent = left + 's';
          clearInterval(codeCountdown);
          codeCountdown = setInterval(function () {
            left--;
            if (left <= 0) {
              clearInterval(codeCountdown);
              gateSendCodeBtn.disabled = false;
              gateSendCodeBtn.textContent = '发送验证码';
            } else gateSendCodeBtn.textContent = left + 's';
          }, 1000);
        }
      }
      if (gateSendCodeBtn) {
        gateSendCodeBtn.addEventListener('click', function () {
          var email = gateEmailInput ? gateEmailInput.value.trim() : '';
          if (!email) { showLoginMsg('请先填写邮箱'); return; }
          var purpose = gateMode === 'reset' ? 'reset' : 'register';
          showLoginMsg('验证码发送中…');
          authJson('/api/email/code', { email: email, purpose: purpose }, function (d) {
            if (d.ok) {
              showLoginMsg('验证码已发送，注意查收（含垃圾箱）');
              startCodeCountdown();
            } else showLoginMsg(d.error);
          }, [gateSendCodeBtn]);
        });
      }

      if (loginForm) {
        var loginButtons = [loginForm.querySelector('.login-btn'), loginRegister];
        loginForm.addEventListener('submit', function (e) {
          e.preventDefault();
          var u = loginUser ? loginUser.value.trim() : '';
          var p = loginPass ? loginPass.value : '';
          var email = gateEmailInput ? gateEmailInput.value.trim() : '';
          var code = gateCodeInput ? gateCodeInput.value.trim() : '';
          var np = gateNewPassInput ? gateNewPassInput.value : '';

          if (gateMode === 'register') {
            if (!u || !p) { showLoginMsg('请填写账号和密码'); return; }
            if (p.length < 6) { showLoginMsg('密码至少 6 位'); return; }
            if (gateEmailRegister) {
              if (!email) { showLoginMsg('请填写邮箱'); return; }
              if (!/^\d{6}$/.test(code)) { showLoginMsg('请填写 6 位邮箱验证码'); return; }
            }
            showLoginMsg('注册中…');
            authJson('/api/user/register', {
              username: u, password: p,
              email: gateEmailRegister ? email : undefined,
              code: gateEmailRegister ? code : undefined,
            }, function (d) {
              if (d.ok) {
                setLoginAvatar(null); // 新注册没有头像
                passGate(d.nickname || u);
                favLoad(); // 新账号收藏为空，同时清掉内存里的残留
                setGateMode('login');
              } else showLoginMsg(d.error);
            }, loginButtons);
            return;
          }

          if (gateMode === 'reset') {
            if (!email || !/^\d{6}$/.test(code)) { showLoginMsg('请填写邮箱和 6 位验证码'); return; }
            if (np.length < 6) { showLoginMsg('新密码至少 6 位'); return; }
            showLoginMsg('重置中…');
            authJson('/api/user/password', { email: email, code: code, newPassword: np }, function (d) {
              if (d.ok) {
                setGateMode('login');
                showLoginMsg('密码已重置，请用新密码登录');
              } else showLoginMsg(d.error);
            }, loginButtons);
            return;
          }

          if (gateMode === 'code') {
            if (!/^\d{6}$/.test(code)) { showLoginMsg('请填写 6 位验证码'); return; }
            showLoginMsg('验证中…');
            authJson('/api/user/login', { username: gateUser, ticket: gateTicket, code: code }, function (d) {
              if (d.ok) gateLoginDone(d, gateUser);
              else if (d.needCode) { gateTicket = d.ticket; showLoginMsg(d.error); } // 极少：重新触发了发码
              else showLoginMsg(d.error);
            }, loginButtons);
            return;
          }

          // 常规登录
          if (!u || !p) { showLoginMsg('请填写账号和密码'); return; }
          showLoginMsg('登录中…');
          authPost('/api/user/login', u, p, function (d) {
            if (d.ok) gateLoginDone(d, u);
            else if (d.needCode) {
              // 开了二次验证：验证码已由服务器发送到邮箱，进入验证码步骤
              gateTicket = d.ticket;
              gateUser = u;
              if (gateCodeInput) gateCodeInput.value = '';
              setGateMode('code');
              showLoginMsg(d.error);
            }
            else showLoginMsg(d.error);
          }, loginButtons);
        });
      }
      if (loginRegister) {
        loginRegister.addEventListener('click', function () { setGateMode('register'); });
      }
      if (loginGuest) {
        loginGuest.addEventListener('click', function () {
          passGate('guest');
        });
      }
    }

    // =========================
    // 个人中心面板：头像上传/移除 + 退出登录（点击顶栏头像展开）
    // 注意：本项目全局 CSS 里 [hidden] 等于永久隐藏，动态显隐一律用 class 切换
    // 注意：本 IIFE 是严格模式，此块必须放在 if(loginGate) 块外，
    //       否则块内函数声明不外提，顶栏监听里调 setProfileOpen 会 ReferenceError
    // =========================
    var profileDock = document.getElementById('profileDock');
      var profilePanel = document.getElementById('profilePanel');
      var profileAvatar = document.getElementById('profileAvatar');
      var profileAvatarImg = document.getElementById('profileAvatarImg');
      var profileAvatarLetter = document.getElementById('profileAvatarLetter');
      var profileName = document.getElementById('profileName');
      var profileStatus = document.getElementById('profileStatus');
      var profileHint = document.getElementById('profileHint');
      var profileMsg = document.getElementById('profileMsg');
      var avatarInput = document.getElementById('avatarInput');
      var avatarChangeBtn = document.getElementById('avatarChangeBtn');
      var avatarRemoveBtn = document.getElementById('avatarRemoveBtn');
      var profileLogoutBtn = document.getElementById('profileLogoutBtn');

      // 打开时把面板右缘/顶缘对齐到头像按钮（下方留 8px 间距），窄屏至少留 12px 边距
      function positionProfileDock() {
        if (!profileDock || !loginToggle) return;
        var r = loginToggle.getBoundingClientRect();
        profileDock.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
        profileDock.style.top = Math.max(60, r.bottom + 8) + 'px';
      }

      function setProfileOpen(open) {
        if (open) positionProfileDock();
        document.body.classList.toggle('profile-open', open);
        if (loginToggle) loginToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) updateProfilePanel();
      }

      window.addEventListener('resize', function () {
        if (document.body.classList.contains('profile-open')) positionProfileDock();
      });

      function showProfileMsg(text, err) {
        if (!profileMsg) return;
        profileMsg.textContent = text || '';
        profileMsg.classList.toggle('err', !!err);
      }

      // 依据 sessionStorage 三键刷新面板内容与状态类
      function updateProfilePanel() {
        var role = null;
        var name = null;
        var av = getLoginAvatar();
        try {
          role = sessionStorage.getItem(LOGIN_KEY);
          name = sessionStorage.getItem(LOGIN_NAME_KEY);
        } catch (e) {}
        var isMember = role === '1';
        document.body.classList.toggle('profile-member', isMember);
        if (profileName) profileName.textContent = isMember ? (name || '已登录') : (role === 'guest' ? '游客' : '未登录');
        if (profileStatus) profileStatus.textContent = isMember ? '已登录' : (role === 'guest' ? '游客模式' : '点右上角人像登录');
        if (profileHint) profileHint.hidden = isMember;
        // 控制面板内"移除头像"菜单项的显隐
        if (profilePanel) profilePanel.classList.toggle('has-avatar', !!(isMember && av));
        if (profileAvatar) {
          profileAvatar.classList.toggle('has-img', !!(isMember && av));
          if (isMember && av && profileAvatarImg) profileAvatarImg.src = '/media/' + av;
          if (profileAvatarLetter) profileAvatarLetter.textContent = isMember ? (name || '?').slice(0, 1).toUpperCase() : '';
        }
      }

      document.addEventListener('click', function (e) {
        if (!document.body.classList.contains('profile-open')) return;
        if (profileDock && profileDock.contains(e.target)) return;
        if (loginToggle && loginToggle.contains(e.target)) return; // 头像按钮自己管开合
        setProfileOpen(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') setProfileOpen(false);
      });

      function openAvatarPicker() {
        if (document.body.classList.contains('profile-member') && avatarInput) avatarInput.click();
      }
      if (profileAvatar) {
        profileAvatar.addEventListener('click', openAvatarPicker);
        profileAvatar.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAvatarPicker(); }
        });
      }
      if (avatarChangeBtn) avatarChangeBtn.addEventListener('click', openAvatarPicker);

      if (avatarInput) {
        avatarInput.addEventListener('change', function () {
          var f = this.files && this.files[0];
          this.value = '';
          if (!f) return;
          // 前端预校验：格式 + 大小
          var okType = /image\/(jpeg|png|gif|webp)/.test(f.type) ||
            /\.(jpe?g|png|gif|webp)$/i.test(f.name);
          if (!okType) { showProfileMsg('仅支持 JPG/PNG/GIF/WebP 图片', true); return; }
          if (f.size > 2 * 1024 * 1024) { showProfileMsg('头像图片不能超过 2MB', true); return; }

          showProfileMsg('上传中…');
          var form = new FormData();
          form.append('file', f);
          fetch('/api/user/avatar', { method: 'POST', credentials: 'same-origin', body: form })
            .then(function (res) { return res.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
            .then(function (d) {
              if (d.ok) {
                setLoginAvatar(d.avatar);
                refreshLoginBadge();
                updateProfilePanel();
                updateProfileView(); // 个人主页开着时同步大头像
                showProfileMsg('头像已更新');
              } else showProfileMsg(d.error || '上传失败', true);
            })
            .catch(function () { showProfileMsg('网络错误，上传失败', true); });
        });
      }

      if (avatarRemoveBtn) {
        avatarRemoveBtn.addEventListener('click', function () {
          showProfileMsg('移除中…');
          fetch('/api/user/avatar', { method: 'DELETE', credentials: 'same-origin' })
            .then(function (res) { return res.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
            .then(function (d) {
              if (d.ok) {
                setLoginAvatar(null);
                refreshLoginBadge();
                updateProfilePanel();
                updateProfileView();
                showProfileMsg('已移除头像');
              } else showProfileMsg(d.error || '移除失败', true);
            })
            .catch(function () { showProfileMsg('网络错误', true); });
        });
      }

      if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', function () {
          fetch('/api/user/logout', { method: 'POST', credentials: 'same-origin' })
            .catch(function () {})
            .then(function () {
            try {
              sessionStorage.removeItem(LOGIN_KEY);
              sessionStorage.removeItem(LOGIN_NAME_KEY);
              sessionStorage.removeItem('adminWelcome');
              sessionStorage.removeItem('adminWelcomeShown');
              sessionStorage.removeItem('userWelcome');
              sessionStorage.removeItem('userWelcomeShown');
            } catch (e) {}
            setLoginAvatar(null); // 退出清空三键
            refreshLoginBadge();
            favLoad(); // 收藏是账号数据，退出即清空内存态
            aiHistory = [];        // AI 对话同属账号数据，退出清内存（服务端历史保留，下次登录可恢复）
            aiAttach = [];
            aiConvId = 0;
            aiConvs = [];
            if (aiMessages) aiMessages.innerHTML = '';
            aiRestored = false; // 下个账号打开 AI 界面时重新拉取自己的历史
            setProfileOpen(false); // 回到未登录态并收起面板
            updateProfilePanel();
            showProfileMsg('已退出登录');
            showTopToast('👋 已退出登录，期待下次再见', false);
            });
        });
      }

      updateProfilePanel();

    // =========================
    // 个人主页界面（下拉菜单"我的主页"进入）+ 收藏功能
    // 收藏以站点内路径（url 的 pathname）为标识：静态文件与后台媒体统一处理，与域名无关。
    // favSet 是唯一的收藏状态源：灯箱/播放列表只读它渲染心形，增删都走 favToggle。
    // =========================
    var profileView = document.getElementById('profileView');
    var profileViewClose = document.getElementById('profileViewClose');
    var profileHomeBtn = document.getElementById('profileHomeBtn');
    var profilevAvatar = document.getElementById('profilevAvatar');
    var profilevAvatarImg = document.getElementById('profilevAvatarImg');
    var profilevAvatarLetter = document.getElementById('profilevAvatarLetter');
    var profilevName = document.getElementById('profilevName');
    var profilevSub = document.getElementById('profilevSub');
    var profilevAvatarBtn = document.getElementById('profilevAvatarBtn');
    var profilevLogoutBtn = document.getElementById('profilevLogoutBtn');
    var pwdForm = document.getElementById('pwdForm');
    var pwdOld = document.getElementById('pwdOld');
    var pwdNew = document.getElementById('pwdNew');
    var pwdNew2 = document.getElementById('pwdNew2');
    var pwdMsg = document.getElementById('pwdMsg');
    var pwdSubmit = document.getElementById('pwdSubmit');
    var favMusicEl = document.getElementById('favMusic');
    var favEmptyEl = document.getElementById('favEmpty');

    var favSet = {};     // url -> { type, url, title }
    var favLoaded = false;

    function isMember() {
      try { return sessionStorage.getItem(LOGIN_KEY) === '1'; } catch (e) { return false; }
    }

    function normPath(u) {
      try { return new URL(u, location.href).pathname; } catch (e) { return String(u || ''); }
    }

    function favHas(url) {
      return Object.prototype.hasOwnProperty.call(favSet, url);
    }

    // 心形状态刷新：播放列表直接重绘；灯箱在画廊块里监听 yhuo:favs-changed
    function refreshHearts() {
      renderPlaylist();
      document.dispatchEvent(new CustomEvent('yhuo:favs-changed'));
    }

    function favLoad() {
      if (!isMember()) {
        var had = favLoaded;
        favSet = {};
        favLoaded = false;
        if (had) refreshHearts();
        return;
      }
      fetch('/api/user/favorites', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : { favorites: [] }; })
        .then(function (d) {
          favSet = {};
          ((d && d.favorites) || []).forEach(function (f) { favSet[f.url] = f; });
          favLoaded = true;
          refreshHearts();
        })
        .catch(function () {});
    }

    // 增/删收藏。未登录 → 弹登录卡片。onDone(favorited) 供调用方就地更新心形。
    function favToggle(type, url, title, onDone) {
      if (!isMember()) {
        document.body.classList.add('login-lock');
        openGate();
        return;
      }
      if (!url || url.charAt(0) !== '/') return;
      var faved = favHas(url);
      var opts = faved
        ? { method: 'DELETE', body: JSON.stringify({ url: url }) }
        : { method: 'POST', body: JSON.stringify({ type: type, url: url, title: title || '' }) };
      fetch('/api/user/favorites', {
        method: opts.method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: opts.body,
      })
        .then(function (r) { return r.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
        .then(function (d) {
          if (!d.ok) return;
          if (faved) delete favSet[url];
          else favSet[url] = { type: type, url: url, title: title || '' };
          refreshHearts();
          if (onDone) onDone(!faved);
        })
        .catch(function () {});
    }

    // ---------- 个人主页界面 ----------
    function fmtDate(d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    // ---------- 邮箱卡：绑定 / 换绑 / 登录二次验证（服务未启用时整卡隐藏） ----------
    var emailCard = document.getElementById('emailCard');
    var emailBoundView = document.getElementById('emailBoundView');
    var emailBindView = document.getElementById('emailBindView');
    var pemailInput = document.getElementById('pemailInput');
    var pemailCode = document.getElementById('pemailCode');
    var pemailSendBtn = document.getElementById('pemailSendBtn');
    var pemailVerifyBtn = document.getElementById('pemailVerifyBtn');
    var pemailMsg = document.getElementById('pemailMsg');
    var emailBoundText = document.getElementById('emailBoundText');
    var emailRebindBtn = document.getElementById('emailRebindBtn');
    var twofaToggleBtn = document.getElementById('twofaToggleBtn');
    var emailBoundEmail = null;
    var emailTwofa = false;

    function showPEmailMsg(text, err) {
      if (!pemailMsg) return;
      pemailMsg.textContent = text || '';
      pemailMsg.classList.toggle('err', !!err);
    }
    function maskedEmail(e) {
      var at = String(e || '').indexOf('@');
      if (at < 1) return e || '';
      var name = e.slice(0, at);
      var head = name.slice(0, Math.min(2, name.length));
      return head + '***' + e.slice(at);
    }
    function renderEmailCard() {
      if (!emailCard) return;
      if (!emailBoundEmail) {
        emailBoundView.style.display = 'none';
        emailBindView.style.display = '';
      } else {
        emailBoundView.style.display = '';
        emailBindView.style.display = 'none';
        emailBoundText.textContent = '已绑定 ' + maskedEmail(emailBoundEmail) + '（可用于找回密码）';
        if (twofaToggleBtn) twofaToggleBtn.textContent = emailTwofa ? '关闭二次验证' : '开启二次验证';
      }
    }
    function loadEmailCard() {
      if (!emailCard) return;
      fetch('/api/user/email', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.ok) { emailCard.style.display = 'none'; return; } // 未登录/接口不可用
          // 邮件服务未配置，或"仅站长模式"下当前用户不是站长 → 整卡隐藏
          emailCard.style.display = (d.enabled && d.owner) ? '' : 'none';
          emailBoundEmail = d.verified ? d.email : null;
          emailTwofa = !!d.twofa;
          renderEmailCard();
        })
        .catch(function () { if (emailCard) emailCard.style.display = 'none'; });
    }
    if (emailRebindBtn) {
      emailRebindBtn.addEventListener('click', function () {
        emailBoundEmail = null; // 临时进入绑定视图（不影响已存数据）
        if (pemailInput) pemailInput.value = '';
        if (pemailCode) pemailCode.value = '';
        showPEmailMsg('');
        renderEmailCard();
      });
    }
    // 发送绑定验证码（60 秒倒计时）
    var peCountdown = null;
    if (pemailSendBtn) {
      pemailSendBtn.addEventListener('click', function () {
        var email = pemailInput ? pemailInput.value.trim() : '';
        if (!email) { showPEmailMsg('请先填写邮箱地址', true); return; }
        showPEmailMsg('验证码发送中…');
        fetch('/api/user/email', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bind-send', email: email }),
        })
          .then(function (r) { return r.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
          .then(function (d) {
            if (d.ok) {
              showPEmailMsg('验证码已发送，注意查收（含垃圾箱）');
              var left = 60;
              pemailSendBtn.disabled = true;
              pemailSendBtn.textContent = left + 's';
              clearInterval(peCountdown);
              peCountdown = setInterval(function () {
                left--;
                if (left <= 0) {
                  clearInterval(peCountdown);
                  pemailSendBtn.disabled = false;
                  pemailSendBtn.textContent = '发送验证码';
                } else pemailSendBtn.textContent = left + 's';
              }, 1000);
            } else showPEmailMsg(d.error || '发送失败', true);
          })
          .catch(function () { showPEmailMsg('网络错误', true); });
      });
    }
    if (pemailVerifyBtn) {
      pemailVerifyBtn.addEventListener('click', function () {
        var email = pemailInput ? pemailInput.value.trim() : '';
        var code = pemailCode ? pemailCode.value.trim() : '';
        if (!email || !/^\d{6}$/.test(code)) { showPEmailMsg('请填写邮箱和 6 位验证码', true); return; }
        fetch('/api/user/email', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bind-verify', email: email, code: code }),
        })
          .then(function (r) { return r.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
          .then(function (d) {
            if (d.ok) {
              emailBoundEmail = d.email || email;
              emailTwofa = false; // 换绑后 2FA 保持关闭，避免旧邮箱验证状态误开
              renderEmailCard();
              showPEmailMsg('邮箱绑定成功');
            } else showPEmailMsg(d.error || '绑定失败', true);
          })
          .catch(function () { showPEmailMsg('网络错误', true); });
      });
    }
    if (twofaToggleBtn) {
      twofaToggleBtn.addEventListener('click', function () {
        var next = !emailTwofa;
        fetch('/api/user/email', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle2fa', enabled: next }),
        })
          .then(function (r) { return r.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
          .then(function (d) {
            if (d.ok) {
              emailTwofa = !!d.twofa;
              renderEmailCard();
              showPEmailMsg(emailTwofa ? '二次验证已开启，下次登录将要求邮箱验证码' : '二次验证已关闭');
            } else showPEmailMsg(d.error || '操作失败', true);
          })
          .catch(function () { showPEmailMsg('网络错误', true); });
      });
    }

    // ---------- 签到（等级 0~6）：等级规则在服务端（functions/api/user/checkin.js），前端只渲染 ----------
    var ckCard = document.getElementById('checkinCard');
    var ckBtn = document.getElementById('ckBtn');
    var CK_WEEK_CHARS = ['日', '一', '二', '三', '四', '五', '六'];
    function ckRender(d) {
      if (!d || !d.ok || !d.status || !ckCard) return;
      var st = d.status;
      var lv = st.level || {};
      var lvEl = document.getElementById('ckLv');
      var nameEl = document.getElementById('ckLvName');
      var hintEl = document.getElementById('ckBarHint');
      var statsEl = document.getElementById('ckStats');
      var weekEl = document.getElementById('ckWeek');
      var fill = document.getElementById('ckBarFill');
      if (lvEl) {
        lvEl.textContent = 'Lv.' + lv.lv;
        lvEl.classList.toggle('max', lv.lv >= 6);
        lvEl.title = lv.name || '';
      }
      if (nameEl) nameEl.textContent = lv.name || '—';
      if (fill) {
        // 进度 = 当前等级下限(prev) → 下一级阈值(next) 之间的位置；满级恒 100%
        var pct = 100;
        if (lv.next) pct = Math.max(0, Math.min(100, Math.round(((lv.total - (lv.prev || 0)) / (lv.next - (lv.prev || 0))) * 100)));
        fill.style.width = pct + '%';
      }
      if (hintEl) {
        if (!lv.next) hintEl.textContent = '已满级 · 累计签到 ' + lv.total + ' 天，感谢陪伴！';
        else hintEl.textContent = '再签 ' + (lv.next - lv.total) + ' 天升到 Lv.' + (lv.lv + 1) + ' ' + (lv.nextName || '');
      }
      if (statsEl) statsEl.textContent = '累计 ' + st.total + ' 天 · 连续 ' + st.streak + ' 天' + (st.checkedToday ? ' · 今日已签' : ' · 今日未签');
      if (weekEl) {
        weekEl.textContent = '';
        (st.week || []).forEach(function (w) {
          var cell = document.createElement('div');
          cell.className = 'ck-day' + (w.checked ? ' on' : '') + (w.today ? ' today' : '');
          var dot = document.createElement('i');
          dot.textContent = w.checked ? '✓' : '';
          var lab = document.createElement('span');
          lab.textContent = w.today ? '今' : CK_WEEK_CHARS[new Date(w.day + 'T00:00:00Z').getUTCDay()];
          cell.title = w.day + (w.checked ? ' · 已签到' : ' · 未签到');
          cell.appendChild(dot);
          cell.appendChild(lab);
          weekEl.appendChild(cell);
        });
      }
      if (ckBtn) {
        ckBtn.disabled = !!st.checkedToday;
        ckBtn.textContent = st.checkedToday ? '已签到 ✓' : '签到';
        ckBtn.classList.toggle('ck-btn-done', !!st.checkedToday);
      }
      ckCard.style.display = '';
    }
    function loadCheckin() {
      if (!ckCard || profileIsAdmin) return;
      fetch('/api/user/checkin', { credentials: 'same-origin' })
        .then(function (r) { return r.json().catch(function () { return null; }); })
        .then(ckRender)
        .catch(function () {});
    }
    if (ckBtn) {
      ckBtn.addEventListener('click', function () {
        if (ckBtn.disabled) return;
        ckBtn.disabled = true;
        ckBtn.textContent = '签到中…';
        fetch('/api/user/checkin', { method: 'POST', credentials: 'same-origin' })
          .then(function (r) { return r.json().catch(function () { return null; }); })
          .then(function (d) {
            if (d && (d.ok || d.already)) ckRender(d);
            else {
              ckBtn.disabled = false;
              ckBtn.textContent = '签到';
            }
          })
          .catch(function () {
            ckBtn.disabled = false;
            ckBtn.textContent = '签到';
          });
      });
    }

    // ---- 昵称（身份卡编辑）：展示名优先，登录账号名不变 ----
    var profileNickname = '';
    var profileUsername = '';
    var profileNameEditBtn = document.getElementById('profilevNameEdit');
    var profileNameEditBox = document.getElementById('profilevNameEditBox');
    var profileNameInput = document.getElementById('profilevNameInput');
    var profileNameCancel = document.getElementById('profilevNameCancel');
    var profileNameSave = document.getElementById('profilevNameSave');
    function closeNameEdit() {
      if (profileNameEditBox) profileNameEditBox.hidden = true;
      if (profileNameEditBtn) profileNameEditBtn.hidden = false;
    }
    if (profileNameEditBtn) {
      profileNameEditBtn.addEventListener('click', function () {
        profileNameInput.value = profileNickname;
        profileNameEditBtn.hidden = true;
        profileNameEditBox.hidden = false;
        profileNameInput.focus();
      });
    }
    if (profileNameCancel) profileNameCancel.addEventListener('click', closeNameEdit);
    if (profileNameSave) {
      profileNameSave.addEventListener('click', function () {
        var nick = profileNameInput.value.trim().replace(/\s+/g, ' ');
        var btn = profileNameSave;
        btn.disabled = true;
        fetch('/api/user/nickname', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname: nick })
        }).then(function (r) { return r.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
          .then(function (d) {
            btn.disabled = false;
            if (!d.ok) { profileNameInput.value = profileNickname; alertProfileName(d.error || '保存失败'); return; }
            profileNickname = d.nickname || '';
            var shown = profileNickname || profileUsername || '已登录';
            try { sessionStorage.setItem('demoLoginName', shown); } catch (e) {}
            // 顶栏字母与菜单名即时同步（这些元素在别的块里，直接改 DOM）
            var letterEl = document.getElementById('avatarLetter');
            var menuLetter = document.getElementById('profileAvatarLetter');
            var menuName = document.getElementById('profileName');
            var shown = profileNickname || profileUsername || '已登录';
            if (letterEl) letterEl.textContent = shown.slice(0, 1).toUpperCase();
            if (menuLetter) menuLetter.textContent = shown.slice(0, 1).toUpperCase();
            if (menuName) menuName.textContent = shown;
            closeNameEdit();
            if (profilevName) profilevName.textContent = shown;
          })
          .catch(function () { btn.disabled = false; alertProfileName('网络错误', true); });
      });
    }
    function alertProfileName(msg, err) {
      // 昵称表单内联提示：输入框 placeholder 兼职展示（无需额外元素）
      profileNameInput.placeholder = (err ? '⚠ ' : '') + msg;
      setTimeout(function () { profileNameInput.placeholder = '昵称（1~20 字，留空 = 恢复显示用户名）'; }, 2500);
    }

    function loadProfileData() {
      fetch('/api/user/profile', { credentials: 'same-origin' })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (d) {
          if (!d || !d.ok) {
            // 会话失效或异常
            if (profilevName) profilevName.textContent = d && d.error === '未登录' ? '未登录' : (profilevName.textContent || '—');
            if (profilevSub && d && d.error === '未登录') profilevSub.textContent = '登录已失效，请重新登录';
            return;
          }
          // 管理员身份：显示管理头像/用户名，隐藏前台专属功能卡（收藏/课表/邮箱/改密/更换头像/签到）
          applyProfileAdminMode(!!d.admin);
          loadCheckin(); // 签到卡：仅前台注册账号（管理员由 applyProfileAdminMode 拦住不拉取）
          // 昵称：展示名优先，登录账号名只作登录用
          var displayName = d.nickname || d.username;
          profileNickname = d.nickname || '';
          profileUsername = d.username || '';
          if (profilevName) profilevName.textContent = displayName;
          try {
            if (!d.admin) sessionStorage.setItem('demoLoginName', displayName); // 顶栏字母/欢迎语取这里
          } catch (e) {}
          var letterEl = document.getElementById('avatarLetter');
          var menuLetter = document.getElementById('profileAvatarLetter');
          var menuName = document.getElementById('profileName');
          if (letterEl && !d.avatar) letterEl.textContent = displayName.slice(0, 1).toUpperCase();
          if (menuLetter && !d.avatar) menuLetter.textContent = displayName.slice(0, 1).toUpperCase();
          if (menuName && !d.admin) menuName.textContent = displayName;
          if (profilevName) profilevName.textContent = displayName;
          var sub = '';
          if (d.admin) {
            sub = '管理员账号';
            if (d.created_at) {
              var ac = new Date(String(d.created_at).replace(' ', 'T') + 'Z');
              if (!isNaN(ac)) sub += ' · 创建于 ' + fmtDate(ac);
            }
            sub += '（收藏、课表、邮箱、改密、签到仅前台注册账号可用）';
          } else {
            if (d.created_at) {
              var created = new Date(String(d.created_at).replace(' ', 'T') + 'Z');
              if (!isNaN(created)) {
                var days = Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000) + 1);
                sub = '已加入 ' + days + ' 天 · 注册于 ' + fmtDate(created);
              }
            }
            if (d.last_seen_at) {
              var ls = new Date(String(d.last_seen_at).replace(' ', 'T') + 'Z');
              if (!isNaN(ls)) sub += (sub ? ' · ' : '') + '上次活跃 ' + fmtDate(ls);
            }
          }
          if (profilevSub) profilevSub.textContent = sub || '—';
          if (profilevAvatar) {
            profilevAvatar.classList.toggle('has-img', !!d.avatar);
            if (d.avatar && profilevAvatarImg) profilevAvatarImg.src = '/media/' + d.avatar;
            if (profilevAvatarLetter) profilevAvatarLetter.textContent = (d.username || '?').slice(0, 1).toUpperCase();
          }
        })
        .catch(function () {
          if (profilevSub) profilevSub.textContent = '资料加载失败';
        });
    }

    // 管理员前台个人主页模式：隐藏前台专属功能卡、禁用更换头像；
    // 课表卡对管理员开放（管理员也能配早报/课前提醒，提醒发到后台绑定邮箱/站长邮箱）
    var profileIsAdmin = false;
    function applyProfileAdminMode(isAdmin) {
      profileIsAdmin = !!isAdmin;
      var hidden = ['emailCard', 'pwdCard', 'favCard', 'checkinCard', 'profilevNameEdit', 'profilevNameEditBox'];
      var shown = ['pwdCard', 'favCard', 'acctCard'];
      var avBtn = document.getElementById('profilevAvatarBtn');
      var avEl = document.getElementById('profilevAvatar');
      var mask = avEl && avEl.querySelector('.profile-avatar-mask');
      if (isAdmin) {
        hidden.forEach(function (id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; });
        var acct = document.getElementById('acctCard');
        if (acct) acct.style.display = 'block';
        if (avBtn) avBtn.style.display = 'none';
        if (avEl) { avEl.title = ''; avEl.setAttribute('role', ''); if (mask) mask.style.display = 'none'; }
        // 管理员课表卡提示：提醒发给后台绑定邮箱（没有则站长邮箱）
        var hint = document.getElementById('schedEmailHint');
        if (hint) { hint.textContent = '管理员课表提醒将发送到后台绑定的管理员邮箱（未绑定则发站长邮箱）。'; hint.hidden = false; }
      } else {
        // 还原各卡初始显隐（emailCard 由邮件服务开关控制，初始隐藏；其余常显）
        var emailCard = document.getElementById('emailCard');
        if (emailCard) emailCard.style.display = 'none';
        shown.forEach(function (id) { var el = document.getElementById(id); if (el) el.style.display = ''; });
        if (avBtn) avBtn.style.display = '';
        if (avEl) { avEl.title = '更换头像'; avEl.setAttribute('role', 'button'); if (mask) mask.style.display = ''; }
      }
    }

    // ---------- 课表卡：周视图 / WakeUp 导入 / 手动编辑 / 邮件提醒设置 ----------
    // 数据结构与后端 lib/schedule.js 对齐；每次改动整份 PUT 保存
    var schedCard = document.getElementById('schedCard');
    var schedGridEl = document.getElementById('schedGrid');
    var schedWeekLabel = document.getElementById('schedWeekLabel');
    var schedWeekPrev = document.getElementById('schedWeekPrev');
    var schedWeekNext = document.getElementById('schedWeekNext');
    var schedTermStart = document.getElementById('schedTermStart');
    var schedImportBtn = document.getElementById('schedImportBtn');
    var schedImportFile = document.getElementById('schedImportFile');
    var schedAddBtn = document.getElementById('schedAddBtn');
    var schedEditor = document.getElementById('schedEditor');
    var schedEName = document.getElementById('schedEName');
    var schedEPlace = document.getElementById('schedEPlace');
    var schedETeacher = document.getElementById('schedETeacher');
    var schedEWeeks = document.getElementById('schedEWeeks');
    var schedERemind = document.getElementById('schedERemind');
    var schedEDelete = document.getElementById('schedEDelete');
    var schedECancel = document.getElementById('schedECancel');
    var schedESave = document.getElementById('schedESave');
    var schedDailyOn = document.getElementById('schedDailyOn');
    var schedDailyTime = document.getElementById('schedDailyTime');
    var schedAhead = document.getElementById('schedAhead');
    var schedNodeTimesEl = document.getElementById('schedNodeTimes');
    var schedMsg = document.getElementById('schedMsg');
    var schedEmailHint = document.getElementById('schedEmailHint');
    var schedData = null;   // 归一化课表（termStart/nodeTimes/courses/daily/remindAhead）
    var schedViewWeek = 0;  // 正在查看的教学周（0 = 跟随当前周）
    var schedEditIdx = -2; // 编辑中的课程下标（-1 = 新增，-2 = 未在编辑）
    var schedPreview = null; // 编辑中的实时预览（null = 不显示；{name,day,startNode,endNode}）
    var SCHED_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    var SCHED_COLORS = ['#5b8def', '#e8618c', '#3aa981', '#e0913d', '#8b6fd6', '#4ab3c4', '#d16a4a', '#6f7f95'];

    function showSchedMsg(text, err) {
      if (!schedMsg) return;
      schedMsg.textContent = text || '';
      schedMsg.classList.toggle('err', !!err);
    }
    function schedColor(name) {
      var h = 0;
      var s = String(name || '');
      for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return SCHED_COLORS[h % SCHED_COLORS.length];
    }
    // 当前教学周（本地时间；termStart 自动校准到那周的周一）
    function schedCurWeek() {
      if (!schedData || !schedData.termStart) return 0;
      var t = new Date(schedData.termStart + 'T00:00:00');
      if (isNaN(t)) return 0;
      var wd = t.getDay();
      t.setDate(t.getDate() - ((wd + 6) % 7));
      var days = Math.floor((Date.now() - t.getTime()) / 86400e3);
      return days < 0 ? 0 : Math.floor(days / 7) + 1;
    }
    // 周次文本 → 周数组（与服务端 parseWeekDesc 同规则）："1-16(单)" "1,3,5" "1-8周(双)"
    function schedParseWeeks(str) {
      var s = String(str || '').trim();
      if (!s) return [];
      var odd = /单/.test(s), even = /双/.test(s);
      var nums = {}, out = [];
      var ranges = s.match(/\d+(\s*-\s*\d+)?/g) || [];
      ranges.forEach(function (r) {
        var ab = r.split('-');
        var from = parseInt(ab[0], 10) || 0, to = parseInt(ab[1], 10) || from;
        for (var i = from; i <= to && i <= 30; i++) {
          if (i < 1) continue;
          if (odd && i % 2 === 0) continue;
          if (even && i % 2 === 1) continue;
          if (!nums[i]) { nums[i] = 1; out.push(i); }
        }
      });
      return out.sort(function (a, b) { return a - b; });
    }
    // 周数组 → 紧凑文本（连续周压缩成区间："1,2,3,5" → "1-3,5"）
    function schedWeeksText(arr) {
      if (!arr || !arr.length) return '';
      var sorted = arr.slice().sort(function (a, b) { return a - b; });
      var parts = [], start = sorted[0], prev = sorted[0];
      for (var i = 1; i <= sorted.length; i++) {
        var cur = sorted[i];
        if (cur === prev + 1) { prev = cur; continue; }
        parts.push(start === prev ? String(start) : start + '-' + prev);
        start = prev = cur;
      }
      return parts.join(',');
    }

    function renderSchedGrid() {
      if (!schedGridEl || !schedData) return;
      var grid = schedGridEl;
      if (grid._cleanupDrag) { grid._cleanupDrag(); grid._cleanupDrag = null; }
      grid.innerHTML = '';
      var cur = schedCurWeek();
      var week = schedViewWeek || cur || 1;
      if (schedWeekLabel) {
        schedWeekLabel.textContent = schedData.termStart
          ? '第 ' + week + ' 周' + (week === cur ? ' · 本周' : '')
          : '未设学期起始';
      }
      // 本周有课的课程（week=0 时按第 1 周展示，避免空白）
      var show = schedData.courses.filter(function (c) {
        return !c.weeks.length || c.weeks.indexOf(week) !== -1;
      });
      var maxNode = 10;
      show.forEach(function (c) { if (c.endNode > maxNode) maxNode = c.endNode; });
      grid.style.gridTemplateRows = '26px repeat(' + maxNode + ', 50px)';
      var cell = function (col, row, el, span) {
        el.style.gridColumn = String(col);
        el.style.gridRow = String(row) + (span ? ' / span ' + span : '');
        grid.appendChild(el);
      };
      // 空白格状态：点击弹添加表单（预填星期/节次）；mousedown 后拖到别的格 = 预填跨节
      var dragStart = null; // {day, node}
      var dragCells = [];
      var cellIndex = {};   // 'day,node' → 空白格元素（拖选高亮用）
      var markDrag = function (on) {
        dragCells.forEach(function (el) { el.classList.toggle('drag-on', on); });
      };
      var cellDay = 0, cellNode = 0;
      var onCellEnter = function (day, node) {
        if (!dragStart) return;
        // 拖选范围：同一天的连续节次
        if (day !== dragStart.day) { markDrag(false); dragCells = []; return; }
        var from = Math.min(dragStart.node, node), to = Math.max(dragStart.node, node);
        markDrag(false); dragCells = [];
        for (var n = from; n <= to; n++) {
          var el = cellIndex[day + ',' + n];
          if (el) { el.classList.add('drag-on'); dragCells.push(el); }
        }
        cellNode = node;
      };
      var onCellDown = function (day, node, e) {
        if (e.button !== 0) return;
        dragStart = { day: day, node: node };
        cellDay = day; cellNode = node;
        onCellEnter(day, node);
        e.preventDefault(); // 防止拖选时选中文本
      };
      var onCellUp = function () {
        if (!dragStart) return;
        var from = Math.min(dragStart.node, cellNode), to = Math.max(dragStart.node, cellNode);
        dragStart = null;
        markDrag(false); dragCells = [];
        schedOpenEditor(-1, cellDay, from, to); // 预填星期与节次区间
      };
      // 表头：空 + 周一~周日
      for (var d = 1; d <= 7; d++) {
        var h = document.createElement('div');
        h.className = 'sched-head';
        h.textContent = SCHED_DAYS[d - 1];
        cell(d + 1, 1, h);
      }
      // 节次号 + 空底格
      for (var n = 1; n <= maxNode; n++) {
        var num = document.createElement('div');
        num.className = 'sched-node';
        num.textContent = n;
        cell(1, n + 1, num);
        for (var dd = 1; dd <= 7; dd++) {
          var empty = document.createElement('div');
          empty.className = 'sched-empty-cell';
          empty.title = '点击添加课程';
          (function (day, node, el) {
            el.addEventListener('mousedown', function (e) { onCellDown(day, node, e); });
            el.addEventListener('mouseenter', function () { onCellEnter(day, node); });
            cellIndex[day + ',' + node] = el;
          })(dd, n, empty);
          cell(dd + 1, n + 1, empty);
        }
      }
      // 全局 mouseup：拖到格子外松开也收尾
      var docMouseUp = function () { onCellUp(); };
      document.addEventListener('mouseup', docMouseUp);
      grid._cleanupDrag = function () { document.removeEventListener('mouseup', docMouseUp); };
      // 课程块（叠在空底格上）；正在编辑的那门课跳过原块——由预览块顶替
      schedData.courses.forEach(function (c, i) {
        if (show.indexOf(c) === -1) return;
        if (i === schedEditIdx) return;
        var el = document.createElement('div');
        el.className = 'sched-course';
        el.style.background = schedColor(c.name);
        el.style.gridColumn = String(c.day + 1);
        el.style.gridRow = (c.startNode + 1) + ' / span ' + (c.endNode - c.startNode + 1);
        el.title = c.name + (c.place ? ' · ' + c.place : '') + (c.teacher ? ' · ' + c.teacher : '')
          + ' · 第' + c.startNode + '-' + c.endNode + '节' + (c.weeks.length ? ' · ' + schedWeeksText(c.weeks) + ' 周' : '');
        var nm = document.createElement('span');
        nm.className = 'sched-course-name';
        nm.textContent = c.name;
        el.appendChild(nm);
        if (c.place) {
          var pl = document.createElement('span');
          pl.className = 'sched-course-place';
          pl.textContent = c.place;
          el.appendChild(pl);
        }
        if (c.remind) {
          var rm = document.createElement('span');
          rm.className = 'sched-course-remind';
          rm.textContent = '⏰';
          el.appendChild(rm);
        }
        el.addEventListener('click', function () { schedOpenEditor(i); });
        grid.appendChild(el);
      });
      // 编辑中的临时预览块：弹窗改字段时周视图实时反映（半透明虚线框）
      if (schedEditIdx !== -2 && schedPreview) {
        var pv = document.createElement('div');
        pv.className = 'sched-course sched-preview';
        pv.style.background = schedColor(schedPreview.name || '新课程');
        pv.style.gridColumn = String(schedPreview.day + 1);
        pv.style.gridRow = (schedPreview.startNode + 1) + ' / span ' + (schedPreview.endNode - schedPreview.startNode + 1);
        pv.appendChild((function () {
          var s = document.createElement('span');
          s.className = 'sched-course-name';
          s.textContent = schedPreview.name || '新课程';
          return s;
        })());
        grid.appendChild(pv);
      }
    }

    function renderSchedNodeTimes() {
      if (!schedNodeTimesEl || !schedData) return;
      var box = schedNodeTimesEl;
      box.innerHTML = '';
      schedData.nodeTimes.forEach(function (t, i) {
        var wrap = document.createElement('label');
        wrap.className = 'sched-nt-item';
        var label = document.createElement('span');
        label.className = 'sched-inline';
        label.style.whiteSpace = 'nowrap';
        label.textContent = '第' + (i + 1) + '节';
        var input = document.createElement('input');
        input.type = 'time';
        input.className = 'sched-inline-input';
        input.value = String(t.h).padStart(2, '0') + ':' + String(t.m).padStart(2, '0');
        input.addEventListener('change', function () {
          var v = input.value.split(':');
          schedData.nodeTimes[i] = { h: parseInt(v[0], 10) || 0, m: parseInt(v[1], 10) || 0 };
          schedSave('作息时间已保存');
        });
        wrap.appendChild(label);
        wrap.appendChild(input);
        box.appendChild(wrap);
      });
    }

    function renderSchedAll() {
      if (!schedData) return;
      if (schedTermStart) schedTermStart.value = schedData.termStart || '';
      if (schedDailyOn) schedDailyOn.checked = !!(schedData.daily && schedData.daily.on);
      if (schedDailyTime) schedDailyTime.value = (schedData.daily && schedData.daily.time) || '07:00';
      if (schedAhead) schedAhead.value = schedData.remindAhead || 30;
      schedSyncDailyDep();
      schedSyncTimePills();
      schedSyncAheadPills();
      renderSchedGrid();
      renderSchedNodeTimes();
    }

    // ---------- 胶囊点选控件：编辑弹窗（星期/节次/周次快选） ----------
    // 状态存内存（schedEDayVal 等），胶囊高亮同步；原 select/number 输入已移除
    var schedEDayVal = 1;
    var schedEStartVal = 1;
    var schedEEndVal = 2;
    var schedDayPills = document.getElementById('schedEDayPills');
    var schedStartPills = document.getElementById('schedEStartPills');
    var schedEndPills = document.getElementById('schedEEndPills');
    var schedWeekQuick = document.getElementById('schedEWeekQuick');
    var schedENodeHint = document.getElementById('schedENodeHint');

    // 节次胶囊按作息表数量生成（默认 12 节）
    function schedBuildNodePills() {
      [schedStartPills, schedEndPills].forEach(function (box) {
        if (!box) return;
        box.innerHTML = '';
        var n = schedData && schedData.nodeTimes ? schedData.nodeTimes.length : 12;
        for (var i = 1; i <= Math.max(n, 10); i++) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'sched-pill';
          b.dataset.v = String(i);
          b.textContent = String(i);
          box.appendChild(b);
        }
      });
      schedSyncPills();
    }
    function schedSyncPills() {
      if (schedDayPills) Array.prototype.forEach.call(schedDayPills.children, function (b) {
        b.classList.toggle('on', Number(b.dataset.v) === schedEDayVal);
      });
      if (schedStartPills) Array.prototype.forEach.call(schedStartPills.children, function (b) {
        b.classList.toggle('on', Number(b.dataset.v) === schedEStartVal);
      });
      if (schedEndPills) Array.prototype.forEach.call(schedEndPills.children, function (b) {
        b.classList.toggle('on', Number(b.dataset.v) === schedEEndVal);
      });
      if (schedENodeHint) {
        var t = schedData && schedData.nodeTimes ? schedData.nodeTimes[schedEStartVal - 1] : null;
        schedENodeHint.textContent = t ? '（' + String(t.h).padStart(2, '0') + ':' + String(t.m).padStart(2, '0') + ' 开课）' : '';
      }
      // 周次快选：文本与输入框完全一致才高亮
      if (schedWeekQuick) {
        var wv = (schedEWeeks ? schedEWeeks.value : '').replace(/\s/g, '');
        Array.prototype.forEach.call(schedWeekQuick.children, function (b) {
          b.classList.toggle('on', b.dataset.w === wv);
        });
      }
    }
    if (schedDayPills) schedDayPills.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.sched-pill') : null;
      if (!b) return;
      schedEDayVal = Number(b.dataset.v) || 1;
      schedSyncPills();
      schedUpdatePreview();
    });
    if (schedStartPills) schedStartPills.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.sched-pill') : null;
      if (!b) return;
      schedEStartVal = Number(b.dataset.v) || 1;
      if (schedEEndVal < schedEStartVal) schedEEndVal = schedEStartVal;
      schedSyncPills();
      schedUpdatePreview();
    });
    if (schedEndPills) schedEndPills.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.sched-pill') : null;
      if (!b) return;
      schedEEndVal = Math.max(schedEStartVal, Number(b.dataset.v) || schedEStartVal);
      schedSyncPills();
      schedUpdatePreview();
    });
    if (schedWeekQuick) schedWeekQuick.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.sched-pill') : null;
      if (!b) return;
      if (schedEWeeks) schedEWeeks.value = b.dataset.w || '';
      schedSyncPills();
    });
    if (schedEWeeks) schedEWeeks.addEventListener('input', schedSyncPills);

    // idx: 课程下标；-1 = 新增（可带预填 day/startNode/endNode，来自点/拖空白格）
    function schedOpenEditor(idx, preDay, preStart, preEnd) {
      if (!schedEditor || !schedData) return;
      schedEditIdx = idx;
      var c = idx >= 0 ? schedData.courses[idx] : null;
      var titleEl = document.getElementById('schedEditorTitle');
      if (titleEl) titleEl.textContent = c ? '编辑课程' : '添加课程';
      schedEName.value = c ? c.name : '';
      schedEPlace.value = c ? c.place : '';
      schedETeacher.value = c ? c.teacher : '';
      schedEDayVal = c ? c.day : (preDay || 1);
      var st = c ? c.startNode : (preStart || 1);
      var en = c ? c.endNode : (preEnd || preStart || (st + 1));
      schedEStartVal = st;
      schedEEndVal = Math.max(st, en);
      schedEWeeks.value = c ? schedWeeksText(c.weeks) : '1-16';
      schedERemind.checked = c ? !!c.remind : false;
      schedEDelete.hidden = !c;
      schedBuildNodePills();
      schedUpdatePreview();
      schedEditor.hidden = false;
      void schedEditor.offsetWidth; // 重启动效
      schedEditor.classList.add('show');
      if (schedEName) schedEName.focus();
    }

    function schedCloseEditor() {
      if (!schedEditor) return;
      schedEditor.classList.remove('show');
      setTimeout(function () { schedEditor.hidden = true; }, 260);
      schedEditIdx = -2;
      schedPreview = null;
      renderSchedGrid();
    }

    // 弹窗字段 → 周视图实时预览（临时半透明块）
    function schedUpdatePreview() {
      if (schedEditIdx === -2 || !schedData) return;
      schedPreview = {
        name: schedEName.value.trim(),
        day: schedEDayVal,
        startNode: Math.max(1, Math.min(20, Math.min(schedEStartVal, schedEEndVal))),
        endNode: Math.max(1, Math.min(20, Math.max(schedEStartVal, schedEEndVal))),
      };
      renderSchedGrid();
    }
    if (schedEName) schedEName.addEventListener('input', schedUpdatePreview);

    function schedSave(msg) {
      if (!schedData) return;
      fetch('/api/schedule', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: schedData }),
      })
        .then(function (r) { return r.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
        .then(function (d) {
          if (d.ok) {
            schedData = d.schedule;
            renderSchedAll();
            showSchedMsg(msg || '已保存', false);
          } else showSchedMsg(d.error || '保存失败', true);
        })
        .catch(function () { showSchedMsg('网络错误', true); });
    }

    // 启用/移除两个视图：没存过课表 → 只显示"＋ 启用课表"入口；有数据 → 完整卡
    var schedEnableBox = document.getElementById('schedEnable');
    var schedBodyBox = document.getElementById('schedBody');
    var schedEnableBtn = document.getElementById('schedEnableBtn');
    var schedRemoveBtn = document.getElementById('schedRemoveBtn');
    function schedShowBody(on) {
      if (schedEnableBox) schedEnableBox.hidden = on;
      if (schedBodyBox) schedBodyBox.hidden = !on;
    }

    function loadSched() {
      if (!schedCard) return;
      fetch('/api/schedule', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.ok) { schedCard.style.display = 'none'; return; } // 未登录/接口不可用
          schedCard.style.display = '';
          schedData = d.schedule;
          schedViewWeek = 0;
          schedCloseEditor();
          renderSchedAll();
          showSchedMsg('');
          schedShowBody(!!d.exists); // 没启用过只显示入口行
          if (d.exists) renderSchedEmailHint();
        })
        .catch(function () { if (schedCard) schedCard.style.display = 'none'; });
    }

    // 启用：把默认空课表存到服务端（落行），切到完整视图
    if (schedEnableBtn) schedEnableBtn.addEventListener('click', function () {
      if (!schedData) return;
      schedSave('课表已启用，先设学期首周一再添加课程');
      schedShowBody(true);
      renderSchedEmailHint();
    });

    // 移除：确认后删服务端数据，回到入口行（提醒随之停止）
    if (schedRemoveBtn) schedRemoveBtn.addEventListener('click', function () {
      if (!schedData) return;
      var doRemove = function () {
        fetch('/api/schedule', { method: 'DELETE', credentials: 'same-origin' })
          .then(function (r) { return r.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
          .then(function (d) {
            if (d.ok) {
              schedShowBody(false);
              showSchedMsg('');
            } else showSchedMsg(d.error || '移除失败', true);
          })
          .catch(function () { showSchedMsg('网络错误', true); });
      };
      if (typeof ask === 'function') {
        ask({
          title: '移除课表',
          msg: '移除后所有课程、作息和提醒设置将被删除，提醒邮件随之停止。此操作不可恢复。',
          okText: '移除', danger: true,
          cb: function (ok) { if (ok) doRemove(); },
        });
      } else if (window.confirm('移除后所有课程、作息和提醒设置将被删除，确定移除课表？')) {
        doRemove();
      }
    });

    // 提示语：提醒依赖邮件服务 + 已验证邮箱（GitHub Pages 静态模式下接口 404 → 整卡隐藏）；
    // 管理员课表提示由 applyProfileAdminMode 统一设置（/api/user/email 不识别管理员会话）
    function renderSchedEmailHint() {
      if (profileIsAdmin) return;
      if (!schedEmailHint) return;
      fetch('/api/user/email', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.ok) { schedEmailHint.hidden = true; return; }
          if (!d.enabled) {
            schedEmailHint.textContent = '站点未启用邮件服务，课表提醒暂时不会发送。';
            schedEmailHint.hidden = false;
          } else if (!d.verified) {
            schedEmailHint.textContent = '提醒通过邮件发送，请先在下方绑定并验证邮箱。';
            schedEmailHint.hidden = false;
          } else if (!d.owner) {
            schedEmailHint.textContent = '当前为"仅站长"邮件模式，普通账号暂收不到课表提醒。';
            schedEmailHint.hidden = false;
          } else {
            schedEmailHint.hidden = true;
          }
        })
        .catch(function () { schedEmailHint.hidden = true; });
    }

    if (schedWeekPrev) schedWeekPrev.addEventListener('click', function () {
      var cur = schedCurWeek() || 1;
      schedViewWeek = Math.max(1, (schedViewWeek || cur) - 1);
      renderSchedGrid();
    });
    if (schedWeekNext) schedWeekNext.addEventListener('click', function () {
      var cur = schedCurWeek() || 1;
      schedViewWeek = Math.min(30, (schedViewWeek || cur) + 1);
      renderSchedGrid();
    });
    if (schedTermStart) schedTermStart.addEventListener('change', function () {
      if (!schedData) return;
      schedData.termStart = schedTermStart.value || '';
      schedViewWeek = 0;
      schedSave('学期起始已保存');
    });
    if (schedImportBtn) schedImportBtn.addEventListener('click', function () {
      if (schedImportFile) schedImportFile.click();
    });
    if (schedImportFile) schedImportFile.addEventListener('change', function () {
      var file = schedImportFile.files && schedImportFile.files[0];
      schedImportFile.value = ''; // 允许重复导入同一文件
      if (!file) return;
      showSchedMsg('导入中…');
      var isCsv = /\.csv$/i.test(file.name);
      var reader = new FileReader();
      reader.onload = function () {
        var text = String(reader.result || '');
        // 按内容兜底分流：JSON 一定以 { 或 [ 开头，其余按 CSV 处理
        if (!/^\s*[{[]/.test(text)) isCsv = true;
        var payload;
        if (isCsv) {
          payload = { wakeUpCsv: text };
        } else {
          var obj;
          try { obj = JSON.parse(text); } catch (e) {
            showSchedMsg('文件不是合法的 JSON / CSV', true); return;
          }
          payload = { wakeUp: obj };
        }
        fetch('/api/schedule', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then(function (r) { return r.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
          .then(function (d) {
            if (d.ok) {
              schedData = d.schedule;
              schedViewWeek = 0;
              schedCloseEditor();
              renderSchedAll();
              showSchedMsg('导入成功，共 ' + schedData.courses.length + ' 门课程');
            } else showSchedMsg(d.error || '导入失败', true);
          })
          .catch(function () { showSchedMsg('网络错误', true); });
      };
      reader.readAsText(file);
    });
    if (schedAddBtn) schedAddBtn.addEventListener('click', function () { schedOpenEditor(-1); });
    // 导出课表：纯前端生成 WakeUp 兼容 JSON 下载——本站「导入 WakeUp」可直接导回，
    // WakeUp App 也认这个格式。weeks 转布尔数组（下标 0 = 第 1 周），step = 节次跨度
    var schedExportBtn = document.getElementById('schedExportBtn');
    if (schedExportBtn) schedExportBtn.addEventListener('click', function () {
      if (!schedData || !schedData.courses || !schedData.courses.length) {
        showSchedMsg('还没有课程可导出', true); return;
      }
      var maxWeek = 1;
      schedData.courses.forEach(function (c) {
        (c.weeks && c.weeks.length ? c.weeks : [1]).forEach(function (w) { if (w > maxWeek) maxWeek = w; });
      });
      var courses = schedData.courses.map(function (c) {
        var weeks = [];
        for (var i = 1; i <= maxWeek; i++) {
          // 内部 weeks 为空数组 = 每周都上，导出为全 true 才能无损导回
          weeks.push(!c.weeks || !c.weeks.length || c.weeks.indexOf(i) !== -1);
        }
        return {
          courseName: c.name, roomName: c.place || '', teacherName: c.teacher || '',
          day: c.day, startNode: c.startNode, endNode: c.endNode,
          step: Math.max(1, c.endNode - c.startNode + 1), weeks: weeks,
        };
      });
      var out = { courses: courses };
      if (schedData.termStart) out.termStart = schedData.termStart; // 本站导回时保留学期起始（WakeUp 忽略未知字段）
      var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
      var now = new Date();
      a.href = URL.createObjectURL(blob);
      a.download = 'WakeUp课表导出-' + now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate()) + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      showSchedMsg('已导出 ' + courses.length + ' 门课程（WakeUp JSON，可再导入）');
    });
    // 点遮罩空白处关闭（点面板内部不关）
    if (schedEditor) schedEditor.addEventListener('click', function (e) {
      if (e.target === schedEditor) schedCloseEditor();
    });
    // Esc 关闭编辑弹窗（不冒泡给个人主页的 Esc——那会连主页一起关掉）
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && schedEditor && !schedEditor.hidden) {
        e.stopImmediatePropagation();
        schedCloseEditor();
      }
    }, true);
    if (schedECancel) schedECancel.addEventListener('click', schedCloseEditor);
    if (schedEDelete) schedEDelete.addEventListener('click', function () {
      if (schedEditIdx < 0 || !schedData) return;
      schedData.courses.splice(schedEditIdx, 1);
      schedCloseEditor();
      schedSave('课程已删除');
    });
    if (schedESave) schedESave.addEventListener('click', function () {
      if (!schedData) return;
      var name = schedEName.value.trim();
      if (!name) { showSchedMsg('课程名不能为空', true); return; }
      var start = schedEStartVal, end = schedEEndVal;
      if (end < start) end = start;
      var weeks = schedParseWeeks(schedEWeeks.value);
      if (!weeks.length) { showSchedMsg('周次格式不正确，示例：1-16 或 1,3,5 或 1-16(单)', true); return; }
      var c = {
        name: name, place: schedEPlace.value.trim(), teacher: schedETeacher.value.trim(),
        day: schedEDayVal,
        startNode: Math.max(1, Math.min(20, start)),
        endNode: Math.max(1, Math.min(20, end)),
        weeks: weeks, remind: schedERemind.checked,
      };
      if (schedEditIdx >= 0) schedData.courses[schedEditIdx] = c;
      else schedData.courses.push(c);
      schedCloseEditor();
      schedSave('课程已保存');
    });
    // 早报开关：同步时间快选行的禁用态
    var schedTimeQuickRow = document.getElementById('schedDailyTimeRow');
    function schedSyncDailyDep() {
      if (schedTimeQuickRow) schedTimeQuickRow.classList.toggle('off', !(schedDailyOn && schedDailyOn.checked));
    }
    if (schedDailyOn) schedDailyOn.addEventListener('change', function () {
      schedData.daily.on = schedDailyOn.checked;
      schedSyncDailyDep();
      schedSave('提醒设置已保存');
    });
    // 时间快选胶囊：点击即写入并保存
    var schedTimeQuick = document.getElementById('schedTimeQuick');
    if (schedTimeQuick) schedTimeQuick.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.sched-pill') : null;
      if (!b || !b.dataset.t) return;
      if (schedDailyTime) schedDailyTime.value = b.dataset.t;
      schedSyncTimePills();
      schedData.daily.time = b.dataset.t;
      schedSave('提醒设置已保存');
    });
    function schedSyncTimePills() {
      if (!schedTimeQuick) return;
      var v = schedDailyTime ? schedDailyTime.value : '';
      Array.prototype.forEach.call(schedTimeQuick.children, function (b) {
        if (b.dataset.t) b.classList.toggle('on', b.dataset.t === v);
      });
    }
    if (schedDailyTime) schedDailyTime.addEventListener('change', function () {
      schedData.daily.time = schedDailyTime.value || '07:00';
      schedSyncTimePills();
      schedSave('提醒设置已保存');
    });
    // 提前量快选胶囊
    var schedAheadQuick = document.getElementById('schedAheadQuick');
    function schedSyncAheadPills() {
      if (!schedAheadQuick) return;
      var v = String(schedAhead ? schedAhead.value : '');
      Array.prototype.forEach.call(schedAheadQuick.children, function (b) {
        if (b.dataset.a) b.classList.toggle('on', b.dataset.a === v);
      });
    }
    if (schedAheadQuick) schedAheadQuick.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.sched-pill') : null;
      if (!b || !b.dataset.a) return;
      var n = Number(b.dataset.a) || 30;
      if (schedAhead) schedAhead.value = String(n);
      schedSyncAheadPills();
      schedData.remindAhead = n;
      schedSave('提醒设置已保存');
    });
    if (schedAhead) schedAhead.addEventListener('change', function () {
      schedData.remindAhead = Math.max(5, Math.min(120, parseInt(schedAhead.value, 10) || 30));
      schedAhead.value = String(schedData.remindAhead);
      schedSyncAheadPills();
      schedSave('提醒设置已保存');
    });

    // 头像变化后同步个人主页（面板由 updateProfilePanel 管，这里管主页大头像）
    function updateProfileView() {
      if (profileView && !profileView.hidden) loadProfileData();
    }

    function updateFavEmpty() {
      if (!favEmptyEl) return;
      var m = favMusicEl ? favMusicEl.children.length : 0;
      favEmptyEl.hidden = !!m;
    }

    function renderFavorites() {
      if (!favMusicEl) return;
      favMusicEl.innerHTML = '';
      var music = [];
      Object.keys(favSet).forEach(function (u) {
        var f = favSet[u];
        if (f.type === 'image') photos.push(f);
        else if (f.type === 'music') music.push(f);
      });

      music.forEach(function (f) {
        var li = document.createElement('li');
        li.className = 'fav-music-item';
        var play = document.createElement('button');
        play.className = 'fav-icon-btn';
        play.type = 'button';
        play.title = '播放';
        play.setAttribute('aria-label', '播放 ' + (f.title || '音乐'));
        play.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M10 8.5a.6.6 0 0 1 .9-.52l4.6 2.88a.6.6 0 0 1 0 1.03l-4.6 2.88a.6.6 0 0 1-.9-.52z"/></svg>';
        play.addEventListener('click', function () {
          // 按歌名回当前曲库定位（曲库合并/重排按下标会错位，与播放器自身逻辑一致）
          for (var i = 0; i < tracks.length; i++) {
            if (tracks[i].name === f.title) { playIndex(i); return; }
          }
        });
        // 曲库里找不到（已删除/本地文件夹曲目）就禁用播放
        var found = false;
        for (var i = 0; i < tracks.length; i++) {
          if (tracks[i].name === f.title) { found = true; break; }
        }
        play.disabled = !found;
        var name = document.createElement('span');
        name.className = 'fav-music-name';
        name.textContent = musicDisplayName(f.title || f.url); // 展示名剥格式后缀（匹配仍用原名 f.title）
        var rm = document.createElement('button');
        rm.className = 'fav-icon-btn faved';
        rm.type = 'button';
        rm.title = '取消收藏';
        rm.setAttribute('aria-label', '取消收藏 ' + (f.title || '音乐'));
        rm.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
        rm.addEventListener('click', function () {
          favToggle('music', f.url, f.title, function () { renderFavorites(); });
        });
        li.appendChild(play);
        li.appendChild(name);
        li.appendChild(rm);
        favMusicEl.appendChild(li);
      });

      updateFavEmpty();
    }

    function openProfileView() {
      if (!profileView || !isMember()) return;
      closeDocViewer(); // 与阅读层互斥（原由全屏管理器互斥代办）
      setProfileOpen(false);
      loadProfileData();
      loadEmailCard();
      loadSched();
      renderFavorites();
      profileView.hidden = false;
      void profileView.offsetWidth;
      profileView.classList.add('show');
    }

    function closeProfileView() {
      if (!profileView || profileView.hidden) return;
      profileView.classList.remove('show');
      setTimeout(function () { profileView.hidden = true; }, 260);
    }

    if (profileViewClose) profileViewClose.addEventListener('click', closeProfileView);
    if (profileHomeBtn) profileHomeBtn.addEventListener('click', openProfileView);
    document.addEventListener('keydown', function (e) {
      // 个人主页 Esc 关闭（修：原条件里的 lightbox 自移除相册起就是 null，在这里解引用会让 Esc 静默报错）
      if (e.key === 'Escape' && profileView && !profileView.hidden) closeProfileView();
    });

    // 主页大头像更换：复用下拉菜单那套 avatarInput 流程
    function openAvatarPickerFromView() {
      if (profileIsAdmin) return; // 管理员头像在后台改
      if (isMember() && avatarInput) avatarInput.click();
    }
    if (profilevAvatar) {
      profilevAvatar.addEventListener('click', openAvatarPickerFromView);
      profilevAvatar.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAvatarPickerFromView(); }
      });
    }
    if (profilevAvatarBtn) profilevAvatarBtn.addEventListener('click', openAvatarPickerFromView);

    if (profilevLogoutBtn) {
      profilevLogoutBtn.addEventListener('click', function () {
        fetch('/api/user/logout', { method: 'POST', credentials: 'same-origin' })
          .catch(function () {})
          .then(function () {
            try {
              sessionStorage.removeItem(LOGIN_KEY);
              sessionStorage.removeItem(LOGIN_NAME_KEY);
              sessionStorage.removeItem('adminWelcome');
              sessionStorage.removeItem('adminWelcomeShown');
              sessionStorage.removeItem('userWelcome');
              sessionStorage.removeItem('userWelcomeShown');
            } catch (e) {}
            setLoginAvatar(null); // 退出清空三键
            refreshLoginBadge();
            favLoad(); // 收藏是账号数据，退出即清空内存态
            aiHistory = [];        // AI 对话同属账号数据，退出清内存（服务端历史保留，下次登录可恢复）
            aiAttach = [];
            aiConvId = 0;
            aiConvs = [];
            if (aiMessages) aiMessages.innerHTML = '';
            aiRestored = false;
            closeProfileView();
            updateProfilePanel();
            showTopToast('👋 已退出登录，期待下次再见', false);
          });
      });
    }

    // ---------- 修改密码 ----------
    function showPwdMsg(text, err) {
      if (!pwdMsg) return;
      pwdMsg.textContent = text || '';
      pwdMsg.classList.toggle('err', !!err);
    }

    if (pwdForm) {
      pwdForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var o = pwdOld ? pwdOld.value : '';
        var n = pwdNew ? pwdNew.value : '';
        var n2 = pwdNew2 ? pwdNew2.value : '';
        if (!o || !n) { showPwdMsg('请填写旧密码和新密码'); return; }
        if (n.length < 6) { showPwdMsg('新密码至少 6 位'); return; }
        if (n !== n2) { showPwdMsg('两次输入的新密码不一致'); return; }
        showPwdMsg('提交中…');
        if (pwdSubmit) pwdSubmit.disabled = true;
        fetch('/api/user/password', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPassword: o, newPassword: n }),
        })
          .then(function (r) { return r.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
          .then(function (d) {
            if (d.ok) {
              pwdOld.value = '';
              pwdNew.value = '';
              pwdNew2.value = '';
              showPwdMsg('密码已修改');
            } else showPwdMsg(d.error || '修改失败', true);
          })
          .catch(function () { showPwdMsg('网络错误，修改失败', true); })
          .then(function () { if (pwdSubmit) pwdSubmit.disabled = false; });
      });
    }

    if (isMember()) favLoad();

    // =========================
    // 登录欢迎浮窗：管理员/普通账号登录成功都弹出（管理员多一个"进入后台"按钮）；
    // 页面加载时只认 sessionStorage 里的标记（刷新不重复弹）。
    // 注意：绝不能用 /api/auth/status 做"是不是管理员"的判断——它只反映
    // 浏览器有无管理员会话 Cookie，分不清当前登录的是谁（坑 11）
    // =========================
    var adminToast = document.getElementById('adminToast');
    var adminToastTimer = null;

    function showTopToast(text, withAdminBtn) {
      if (!adminToast) return;
      var textEl = document.getElementById('adminToastText');
      if (textEl) textEl.textContent = text;
      // "进入后台"按钮只在管理员欢迎时显示，其余场景（普通登录/退出）不展示
      if (adminToastAdminBtn) adminToastAdminBtn.style.display = withAdminBtn ? '' : 'none';
      adminToast.classList.add('show');
      if (adminToastTimer) clearTimeout(adminToastTimer);
      adminToastTimer = setTimeout(function () { adminToast.classList.remove('show'); }, 6000);
    }

    function showWelcomeToast(name, isAdmin) {
      showTopToast(isAdmin
        ? '👑 欢迎回来，管理员 ' + (name || '')
        : '👋 欢迎回来，' + (name || ''), isAdmin);
    }

    var adminToastClose = document.getElementById('adminToastClose');
    if (adminToastClose) adminToastClose.addEventListener('click', function () {
      if (adminToastTimer) clearTimeout(adminToastTimer);
      adminToast.classList.remove('show');
    });
    var adminToastAdminBtn = document.getElementById('adminToastAdminBtn');
    if (adminToastAdminBtn) adminToastAdminBtn.addEventListener('click', function () {
      location.href = '/admin';
    });

    // 页面加载：仅当本会话确实发生过登录（且本次刷新还没弹过）才补弹
    (function checkLoginWelcome() {
      var flag = null, shown = null, adminFlag = null;
      try {
        adminFlag = sessionStorage.getItem('adminWelcome');
        if (adminFlag === '1') {
          flag = 'admin';
          shown = sessionStorage.getItem('adminWelcomeShown');
        } else {
          flag = sessionStorage.getItem('userWelcome') === '1' ? 'user' : null;
          shown = sessionStorage.getItem('userWelcomeShown');
        }
      } catch (e) {}
      if (flag && shown !== '1') {
        try {
          sessionStorage.setItem(flag === 'admin' ? 'adminWelcomeShown' : 'userWelcomeShown', '1');
        } catch (e) {}
        var name = null;
        try { name = sessionStorage.getItem(LOGIN_NAME_KEY); } catch (e) {}
        showWelcomeToast(name, flag === 'admin');
      }
    })();

    // =========================
    // 首页天气：Open-Meteo 免费接口（无需 key，支持 CORS），GitHub Pages 静态托管也能用。
    // 位置优先级：localStorage 手动选择 > IP 自动定位（ipapi.co + bigdatacloud 反查中文城市名）
    //   > 默认北京；结果缓存 30 分钟；任一环节失败静默隐藏（与每日一言的处理一致）
    // =========================
    var weatherChip = null;    // 首页模块：startHomeWeather 按当前 DOM 重查（pjax 换页后重建）
    var weatherIcon = null;
    var weatherText = null;
    var weatherPicker = document.getElementById('weatherPicker');
    var weatherSearch = document.getElementById('weatherSearch');
    var weatherResults = document.getElementById('weatherResults');
    var weatherResultsEmpty = document.getElementById('weatherResultsEmpty');
    var LS_WEATHER_LOC = 'weatherLoc';     // { lat, lon, city } 手动选择的城市
    var LS_WEATHER_CACHE = 'weatherCache'; // { ts, key, payload }
    var WEATHER_DEFAULT_LOC = { lat: 39.9042, lon: 116.4074, city: '北京' };
    // 内置常用城市坐标：在线搜索接口（geocoding-api）在部分网络环境连不上时，本地表保证换城市始终可用
    var CITY_TABLE = [
      ['北京', 39.9042, 116.4074], ['上海', 31.2304, 121.4737], ['广州', 23.1291, 113.2644],
      ['深圳', 22.5431, 114.0579], ['成都', 30.5728, 104.0668], ['杭州', 30.2741, 120.1551],
      ['武汉', 30.5928, 114.3055], ['西安', 34.3416, 108.9398], ['南京', 32.0603, 118.7969],
      ['重庆', 29.5630, 106.5516], ['天津', 39.3434, 117.3616], ['苏州', 31.2989, 120.5853],
      ['长沙', 28.2282, 112.9388], ['郑州', 34.7466, 113.6254], ['青岛', 36.0671, 120.3826],
      ['大连', 38.9140, 121.6147], ['厦门', 24.4798, 118.0894], ['福州', 26.0745, 119.2965],
      ['合肥', 31.8206, 117.2272], ['济南', 36.6512, 117.1201], ['沈阳', 41.8057, 123.4315],
      ['哈尔滨', 45.8038, 126.5350], ['长春', 43.8171, 125.3235], ['石家庄', 38.0428, 114.5149],
      ['太原', 37.8706, 112.5489], ['南昌', 28.6820, 115.8579], ['昆明', 25.0389, 102.7183],
      ['贵阳', 26.6470, 106.6302], ['南宁', 22.8170, 108.3665], ['海口', 20.0444, 110.1999],
      ['兰州', 36.0611, 103.8343], ['乌鲁木齐', 43.8256, 87.6168], ['拉萨', 29.6520, 91.1721],
      ['银川', 38.4872, 106.2309], ['西宁', 36.6171, 101.7782], ['呼和浩特', 40.8414, 111.7519],
      ['香港', 22.3193, 114.1694], ['澳门', 22.1987, 113.5439], ['台北', 25.0330, 121.5654],
      ['东京', 35.6762, 139.6503], ['首尔', 37.5665, 126.9780], ['新加坡', 1.3521, 103.8198],
      ['曼谷', 13.7563, 100.5018], ['伦敦', 51.5074, -0.1278], ['巴黎', 48.8566, 2.3522],
      ['纽约', 40.7128, -74.0060], ['洛杉矶', 34.0522, -118.2437], ['旧金山', 37.7749, -122.4194],
      ['悉尼', -33.8688, 151.2093], ['莫斯科', 55.7558, 37.6173],
    ];

    function searchLocalCities(q) {
      var out = [];
      for (var i = 0; i < CITY_TABLE.length && out.length < 6; i++) {
        if (CITY_TABLE[i][0].indexOf(q) !== -1) {
          out.push({ name: CITY_TABLE[i][0], lat: CITY_TABLE[i][1], lon: CITY_TABLE[i][2], region: '' });
        }
      }
      return out;
    }

    function fetchWithTimeout(url, ms) {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, ms || 5000);
      return fetch(url, { signal: ctrl.signal }).finally(function () { clearTimeout(timer); });
    }

    // WMO 天气码 → 图标 + 中文
    function wmoInfo(code) {
      if (code === 0) return { icon: '☀️', text: '晴' };
      if (code === 1) return { icon: '🌤️', text: '晴间多云' };
      if (code === 2) return { icon: '⛅', text: '多云' };
      if (code === 3) return { icon: '☁️', text: '阴' };
      if (code === 45 || code === 48) return { icon: '🌫️', text: '雾' };
      if (code >= 51 && code <= 57) return { icon: '🌦️', text: '毛毛雨' };
      if (code >= 61 && code <= 67) return { icon: '🌧️', text: '雨' };
      if (code >= 71 && code <= 77) return { icon: '🌨️', text: '雪' };
      if (code >= 80 && code <= 82) return { icon: '🌧️', text: '阵雨' };
      if (code === 85 || code === 86) return { icon: '🌨️', text: '阵雪' };
      if (code >= 95) return { icon: '⛈️', text: '雷雨' };
      return { icon: '🌡️', text: '—' };
    }

    function renderWeather(loc, data) {
      if (!weatherChip || !weatherIcon || !weatherText) return;
      if (FLAGS_OFF.weather) return; // 功能开关：天气胶囊已关闭
      var info = wmoInfo(data.code);
      weatherIcon.textContent = info.icon;
      weatherText.textContent = loc.city + ' ' + Math.round(data.temp) + '°C · ' + info.text +
        ' ' + Math.round(data.tmax) + '°/' + Math.round(data.tmin) + '°';
      weatherChip.hidden = false;
      requestAnimationFrame(function () { weatherChip.classList.add('loaded'); });
    }

    function loadWeather(loc) {
      if (!weatherChip) return;
      var key = loc.lat.toFixed(2) + ',' + loc.lon.toFixed(2);
      var cache = null;
      try { cache = JSON.parse(localStorage.getItem(LS_WEATHER_CACHE) || 'null'); } catch (e) {}
      if (cache && cache.key === key && Date.now() - cache.ts < 30 * 60000) {
        renderWeather(loc, cache.payload);
        return;
      }
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat + '&longitude=' + loc.lon +
        '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto';
      fetchWithTimeout(url, 6000)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('weather http ' + r.status)); })
        .then(function (d) {
          if (!d || !d.current || !d.daily) throw new Error('weather bad payload');
          var payload = {
            temp: d.current.temperature_2m,
            code: d.current.weather_code,
            tmax: d.daily.temperature_2m_max[0],
            tmin: d.daily.temperature_2m_min[0],
          };
          try {
            localStorage.setItem(LS_WEATHER_CACHE, JSON.stringify({ ts: Date.now(), key: key, payload: payload }));
          } catch (e) {}
          renderWeather(loc, payload);
        })
        .catch(function () {}); // 失败静默：胶囊保持隐藏
    }

    // 坐标 → 中文城市名（bigdatacloud 免费客户端接口，无需 key）
    function reverseCity(lat, lon) {
      return fetchWithTimeout('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat +
        '&longitude=' + lon + '&localityLanguage=zh', 5000)
        .then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (d) { return d.city || d.locality || d.principalSubdivision || ''; })
        .catch(function () { return ''; });
    }

    function initWeather() {
      var loc = null;
      try { loc = JSON.parse(localStorage.getItem(LS_WEATHER_LOC) || 'null'); } catch (e) {}
      if (loc && typeof loc.lat === 'number' && typeof loc.lon === 'number') {
        loadWeather(loc);
        return;
      }
      // 未手动选过城市：尝试 IP 定位（ipwho.is 主源，geojs 备用，都失败退回默认城市）
      fetchWithTimeout('https://ipwho.is/', 4000)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('ip http ' + r.status)); })
        .then(function (d) {
          if (!d || d.success === false || typeof d.latitude !== 'number' || typeof d.longitude !== 'number') {
            return Promise.reject(new Error('ip no coords'));
          }
          return reverseCity(d.latitude, d.longitude).then(function (city) {
            return { lat: d.latitude, lon: d.longitude, city: city || '当前位置' };
          });
        })
        .catch(function () {
          return fetchWithTimeout('https://get.geojs.io/v1/ip/geo.json', 4000)
            .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('geojs http ' + r.status)); })
            .then(function (d) {
              var lat = parseFloat(d.latitude);
              var lon = parseFloat(d.longitude);
              if (isNaN(lat) || isNaN(lon)) return Promise.reject(new Error('geojs no coords'));
              return reverseCity(lat, lon).then(function (city) {
                return { lat: lat, lon: lon, city: city || '当前位置' };
              });
            });
        })
        .catch(function () { return WEATHER_DEFAULT_LOC; })
        .then(loadWeather);
    }

    // ---------- 城市选择弹窗 ----------
    function openWeatherPicker() {
      if (!weatherPicker) return;
      weatherPicker.hidden = false;
      void weatherPicker.offsetWidth;
      weatherPicker.classList.add('show');
      if (weatherSearch) {
        weatherSearch.value = '';
        setTimeout(function () { weatherSearch.focus(); }, 120);
      }
      if (weatherResults) weatherResults.innerHTML = '';
      if (weatherResultsEmpty) weatherResultsEmpty.hidden = true;
    }

    function closeWeatherPicker() {
      if (!weatherPicker || weatherPicker.hidden) return;
      weatherPicker.classList.remove('show');
      setTimeout(function () { weatherPicker.hidden = true; }, 220);
    }

    function applyCity(loc) {
      try { localStorage.setItem(LS_WEATHER_LOC, JSON.stringify(loc)); } catch (e) {}
      try { localStorage.removeItem(LS_WEATHER_CACHE); } catch (e) {}
      closeWeatherPicker();
      loadWeather(loc);
    }

    var weatherPickerClose = document.getElementById('weatherPickerClose');
    if (weatherPickerClose) weatherPickerClose.addEventListener('click', closeWeatherPicker);
    if (weatherPicker) {
      weatherPicker.addEventListener('click', function (e) {
        if (e.target === weatherPicker) closeWeatherPicker();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && weatherPicker && !weatherPicker.hidden) closeWeatherPicker();
    });

    // 渲染城市候选列表
    function renderCityResults(list) {
      if (!weatherResults) return;
      weatherResults.innerHTML = '';
      if (weatherResultsEmpty) weatherResultsEmpty.hidden = list.length > 0;
      list.forEach(function (item) {
        var li = document.createElement('li');
        var btn = document.createElement('button');
        btn.type = 'button';
        var nm = document.createElement('span');
        nm.textContent = item.name;
        btn.appendChild(nm);
        if (item.region) {
          var rg = document.createElement('span');
          rg.className = 'wr-region';
          rg.textContent = item.region;
          btn.appendChild(rg);
        }
        btn.addEventListener('click', function () {
          applyCity({ lat: item.lat, lon: item.lon, city: item.name });
        });
        li.appendChild(btn);
        weatherResults.appendChild(li);
      });
    }

    // 城市搜索：本地内置表立即匹配（永远可用），再叠加 Open-Meteo 在线结果；
    // 在线接口在部分网络环境连不上，失败时静默保留本地结果
    var weatherSearchTimer = null;
    if (weatherSearch) {
      weatherSearch.addEventListener('input', function () {
        var q = weatherSearch.value.trim();
        if (weatherSearchTimer) clearTimeout(weatherSearchTimer);
        if (!q) {
          if (weatherResults) weatherResults.innerHTML = '';
          if (weatherResultsEmpty) weatherResultsEmpty.hidden = true;
          return;
        }
        renderCityResults(searchLocalCities(q));
        weatherSearchTimer = setTimeout(function () {
          fetchWithTimeout('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) +
            '&count=6&language=zh&format=json', 6000)
            .then(function (r) { return r.ok ? r.json() : { results: [] }; })
            .then(function (d) {
              var merged = [];
              var seen = {};
              ((d && d.results) || []).forEach(function (item) {
                if (!seen[item.name]) {
                  seen[item.name] = true;
                  merged.push({
                    name: item.name,
                    lat: item.latitude,
                    lon: item.longitude,
                    region: [item.admin1, item.country].filter(Boolean).join(' · '),
                  });
                }
              });
              searchLocalCities(q).forEach(function (c) {
                if (!seen[c.name]) merged.push(c);
              });
              renderCityResults(merged.slice(0, 8));
            })
            .catch(function () {}); // 本地结果已在，静默即可
        }, 400);
      });
    }

    // 浏览器定位（需用户授权；拒绝或失败给提示）
    var weatherLocateBtn = document.getElementById('weatherLocateBtn');
    if (weatherLocateBtn) {
      weatherLocateBtn.addEventListener('click', function () {
        if (!navigator.geolocation) return;
        weatherLocateBtn.disabled = true;
        navigator.geolocation.getCurrentPosition(function (pos) {
          weatherLocateBtn.disabled = false;
          var lat = pos.coords.latitude;
          var lon = pos.coords.longitude;
          reverseCity(lat, lon).then(function (city) {
            applyCity({ lat: lat, lon: lon, city: city || '当前位置' });
          });
        }, function () {
          weatherLocateBtn.disabled = false;
          if (weatherResultsEmpty) {
            weatherResultsEmpty.textContent = '定位失败或未授权，请搜索城市。';
            weatherResultsEmpty.hidden = false;
            setTimeout(function () {
              weatherResultsEmpty.textContent = '没有找到匹配的城市。';
              weatherResultsEmpty.hidden = true;
            }, 3000);
          }
        }, { timeout: 8000 });
      });
    }

    function startHomeWeather() {
      weatherChip = document.getElementById('weatherChip');
      weatherIcon = document.getElementById('weatherIcon');
      weatherText = document.getElementById('weatherText');
      if (!weatherChip) return;
      weatherChip.addEventListener('click', openWeatherPicker);
      initWeather();
    }

    // =========================
    // 工具合集：重要日子 / 番茄钟 / 换算器 / 文本工具 / 随机决策 / 计算器（纯本地，无外部依赖）
    // =========================

    // ---- 计算器（带历史） ----
    function initCalc() {
      var screen = document.getElementById('calcScreen');
      var pad = document.getElementById('calcPad');
      var histEl = document.getElementById('calcHist');
      var histHead = document.getElementById('calcHistHead');
      var histClear = document.getElementById('calcHistClear');
      if (!screen || !pad) return;
      var expr = '';
      var hist = [];
      try {
        var saved = JSON.parse(localStorage.getItem('yhuoCalcHist') || '[]');
        if (Array.isArray(saved)) hist = saved.slice(0, 20);
      } catch (e) {}
      function saveHist() {
        try { localStorage.setItem('yhuoCalcHist', JSON.stringify(hist.slice(0, 20))); } catch (e) {}
      }
      function renderHist() {
        if (!histEl || !histHead) return;
        histEl.textContent = '';
        hist.forEach(function (r) {
          var item = document.createElement('div');
          item.className = 'tool-list-item';
          var code = document.createElement('code');
          code.className = 'grow';
          code.textContent = r.e + ' = ' + r.r;
          code.title = '点击填入结果';
          item.appendChild(code);
          item.addEventListener('click', function () {
            expr = String(r.r);
            render();
          });
          histEl.appendChild(item);
        });
        histHead.hidden = hist.length === 0;
      }
      function render() {
        screen.textContent = expr || '0';
        screen.scrollLeft = screen.scrollWidth;
      }
      function evaluate() {
        // 只放行数字与四则/括号/小数点，杜绝任意代码执行
        if (!/^[0-9+\-*/().%\s]+$/.test(expr)) return null;
        try {
          var val = Function('"use strict";return (' + expr + ')')();
          if (typeof val !== 'number' || !isFinite(val)) return null;
          return Math.round(val * 1e10) / 1e10;
        } catch (e) { return null; }
      }
      pad.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        var k = btn.getAttribute('data-k');
        if (k === 'C') expr = '';
        else if (k === 'back') expr = expr.slice(0, -1);
        else if (k === '=') {
          var v = evaluate();
          if (v === null) {
            screen.textContent = '错误';
            expr = '';
            return;
          }
          // 连续相同算式不重复入历史
          if (!hist.length || hist[0].e !== expr) {
            hist.unshift({ e: expr, r: v });
            hist = hist.slice(0, 20);
            saveHist();
            renderHist();
          }
          expr = String(v);
        } else expr += k;
        render();
      });
      if (histClear) histClear.addEventListener('click', function () {
        hist = [];
        saveHist();
        renderHist();
      });
      render();
      renderHist();
    }

    var pomoStopHook = null;
    // ---- 番茄钟（原倒计时升级：25/5/15 循环 + 今日完成数，响铃沿用） ----
    function initPomo() {
      var display = document.getElementById('pomoDisplay');
      var startBtn = document.getElementById('pomoStart');
      var resetBtn = document.getElementById('pomoReset');
      var tabs = document.getElementById('pomoTabs');
      var note = document.getElementById('pomoNote');
      if (!display || !startBtn || !resetBtn) return;
      var DUR = { work: 1500, break: 300, long: 900 };
      var mode = 'work';
      var total = DUR.work;
      var left = total;
      var timer = null;
      function fmt(s) {
        var m = Math.floor(s / 60);
        var ss = s % 60;
        return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
      }
      function todayKey() {
        var d = new Date();
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
      }
      function loadCount() {
        try {
          var o = JSON.parse(localStorage.getItem('yhuoPomo') || '{}');
          return o.day === todayKey() ? (Number(o.n) || 0) : 0;
        } catch (e) { return 0; }
      }
      function renderNote() {
        if (!note) return;
        var n = loadCount();
        note.textContent = n > 0 ? '今日完成 ' + n : '';
      }
      function addCount() {
        try { localStorage.setItem('yhuoPomo', JSON.stringify({ day: todayKey(), n: loadCount() + 1 })); } catch (e) {}
        renderNote();
      }
      function render() { display.textContent = fmt(left); }
      function setMode(m) {
        mode = DUR[m] ? m : 'work';
        total = DUR[mode];
        left = total;
        display.classList.remove('ringing');
        if (tabs) {
          tabs.querySelectorAll('button').forEach(function (b) {
            b.classList.toggle('on', b.getAttribute('data-m') === mode);
          });
        }
        startBtn.textContent = '开始';
        render();
      }
      function stop() {
        if (timer) { clearInterval(timer); timer = null; }
        startBtn.textContent = left === total ? '开始' : '继续';
      }
      function beep() {
        try {
          var ctx = new (window.AudioContext || window.webkitAudioContext)();
          [0, 0.35, 0.7].forEach(function (delay) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.18, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.25);
          });
        } catch (e) {}
      }
      if (tabs) {
        tabs.addEventListener('click', function (e) {
          var btn = e.target.closest('button');
          if (!btn) return;
          stop();
          setMode(btn.getAttribute('data-m'));
        });
      }
      startBtn.addEventListener('click', function () {
        if (timer) { stop(); return; }
        if (left <= 0) left = total;
        display.classList.remove('ringing');
        startBtn.textContent = '暂停';
        timer = setInterval(function () {
          left--;
          render();
          if (left <= 0) {
            stop();
            left = 0;
            render();
            beep();
            if (mode === 'work') addCount();
            // 自动切到下一阶段（不自动开始），数字闪烁提示
            setMode(mode === 'work' ? 'break' : 'work');
            display.classList.add('ringing');
          }
        }, 1000);
      });
      resetBtn.addEventListener('click', function () {
        stop();
        setMode(mode);
      });
      renderNote();
      render();
      pomoStopHook = stop; // 交给页面模块：pjax 离开工具页时停表
    }

    // ---- 重要日子（倒计时天数，存 localStorage） ----
    function initDays() {
      var listEl = document.getElementById('daysList');
      var emptyEl = document.getElementById('daysEmpty');
      var nameEl = document.getElementById('daysName');
      var dateEl = document.getElementById('daysDate');
      var addBtn = document.getElementById('daysAdd');
      if (!listEl || !nameEl || !dateEl || !addBtn) return;
      if (emptyEl && !emptyEl.textContent) emptyEl.textContent = '还没有记录，加一个吧';
      function load() {
        try {
          var arr = JSON.parse(localStorage.getItem('yhuoDays') || '[]');
          return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
      }
      function save(arr) {
        try { localStorage.setItem('yhuoDays', JSON.stringify(arr)); } catch (e) {}
      }
      function parseDay(s) {
        var p = String(s || '').split('-');
        if (p.length !== 3) return null;
        var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        return isNaN(d.getTime()) ? null : d;
      }
      function diffText(diff) {
        if (diff === 0) return '今天';
        if (diff === 1) return '明天';
        if (diff === -1) return '昨天';
        return diff > 0 ? '还有 ' + diff + ' 天' : '已过 ' + (-diff) + ' 天';
      }
      function render() {
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var items = load().map(function (it, i) {
          var d = parseDay(it.d);
          return { n: it.n, d: it.d, i: i, diff: d ? Math.round((d - today) / 864e5) : null };
        }).sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
        listEl.textContent = '';
        items.forEach(function (it) {
          var item = document.createElement('div');
          item.className = 'tool-list-item';
          var box = document.createElement('div');
          box.className = 'tool-item-main';
          var nm = document.createElement('div');
          nm.className = 'nm';
          nm.textContent = it.n;
          var sub = document.createElement('div');
          sub.className = 'sub';
          sub.textContent = it.d;
          box.appendChild(nm);
          box.appendChild(sub);
          item.appendChild(box);
          if (it.diff !== null) {
            var badge = document.createElement('span');
            badge.className = 'tool-badge';
            badge.textContent = diffText(it.diff);
            item.appendChild(badge);
          }
          var del = document.createElement('button');
          del.type = 'button';
          del.className = 'tool-x';
          del.textContent = '✕';
          del.setAttribute('aria-label', '删除 ' + it.n);
          del.addEventListener('click', function () {
            var arr = load();
            arr.splice(it.i, 1);
            save(arr);
            render();
          });
          item.appendChild(del);
          listEl.appendChild(item);
        });
        if (emptyEl) emptyEl.hidden = items.length > 0;
      }
      addBtn.addEventListener('click', function () {
        var n = nameEl.value.trim();
        var d = dateEl.value;
        if (!n || !d) return;
        var arr = load();
        arr.push({ n: n, d: d });
        save(arr);
        nameEl.value = '';
        render();
      });
      [nameEl, dateEl].forEach(function (el) {
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter') addBtn.click(); });
      });
      render();
    }

    // ---- 换算器（单位 + 进制，BigInt 保精度） ----
    function initConv() {
      var tabs = document.getElementById('convTabs');
      var cats = document.getElementById('unitCats');
      var unitPane = document.getElementById('convUnit');
      var basePane = document.getElementById('convBase');
      var inEl = document.getElementById('unitIn');
      var outEl = document.getElementById('unitOut');
      var fromEl = document.getElementById('unitFrom');
      var toEl = document.getElementById('unitTo');
      var baseIn = document.getElementById('baseIn');
      var baseTabs = document.getElementById('baseFrom');
      var baseRows = document.getElementById('baseRows');
      if (!tabs || !cats || !unitPane || !basePane || !inEl || !outEl || !fromEl || !toEl) return;
      var UNITS = {
        len: [['mm', '毫米', 0.001], ['cm', '厘米', 0.01], ['m', '米', 1], ['km', '千米', 1000], ['in', '英寸', 0.0254], ['ft', '英尺', 0.3048], ['mi', '英里', 1609.344]],
        weight: [['mg', '毫克', 0.001], ['g', '克', 1], ['kg', '千克', 1000], ['t', '吨', 1000000], ['oz', '盎司', 28.3495], ['lb', '磅', 453.592]],
        temp: [['°C', '摄氏度'], ['°F', '华氏度'], ['K', '开尔文']],
        data: [['B', '字节', 1], ['KB', '千字节', 1024], ['MB', '兆字节', 1048576], ['GB', '吉字节', 1073741824], ['TB', '太字节', 1099511627776]]
      };
      var cat = 'len';
      function factor(c, u) {
        var list = UNITS[c];
        for (var i = 0; i < list.length; i++) if (list[i][0] === u) return list[i][2];
        return 1;
      }
      function convert(v, from, to) {
        if (cat === 'temp') {
          var c = from === '°C' ? v : from === '°F' ? (v - 32) * 5 / 9 : v - 273.15;
          return to === '°C' ? c : to === '°F' ? c * 9 / 5 + 32 : c + 273.15;
        }
        return v * factor(cat, from) / factor(cat, to);
      }
      function fmtNum(v) {
        if (!isFinite(v)) return '—';
        if (v !== 0 && (Math.abs(v) >= 1e15 || Math.abs(v) < 1e-9)) return v.toExponential(6);
        return String(Number(v.toPrecision(10)));
      }
      function fillSelect(sel, c, keep) {
        sel.textContent = '';
        UNITS[c].forEach(function (u) {
          var opt = document.createElement('option');
          opt.value = u[0];
          opt.textContent = u[0] + (u[1] !== u[0] ? ' ' + u[1] : '');
          sel.appendChild(opt);
        });
        sel.selectedIndex = Math.min(keep || 0, UNITS[c].length - 1);
      }
      function runUnit() {
        var v = parseFloat(inEl.value);
        if (isNaN(v)) { outEl.value = ''; return; }
        outEl.value = fmtNum(convert(v, fromEl.value, toEl.value));
      }
      function setCat(c) {
        if (!UNITS[c]) return;
        cat = c;
        cats.querySelectorAll('button').forEach(function (b) {
          b.classList.toggle('on', b.getAttribute('data-c') === c);
        });
        fillSelect(fromEl, c, 0);
        fillSelect(toEl, c, c === 'temp' ? 1 : Math.min(2, UNITS[c].length - 1));
        runUnit();
      }
      tabs.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        tabs.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === btn); });
        var t = btn.getAttribute('data-t');
        unitPane.hidden = t !== 'unit';
        basePane.hidden = t !== 'base';
      });
      cats.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (btn) setCat(btn.getAttribute('data-c'));
      });
      inEl.addEventListener('input', runUnit);
      fromEl.addEventListener('change', runUnit);
      toEl.addEventListener('change', runUnit);

      var RADIX = { bin: 2, oct: 8, dec: 10, hex: 16 };
      var radix = 10;
      function parseBig(s, r) {
        s = String(s || '').trim().toLowerCase();
        if (!s) return null;
        if (!new RegExp('^[' + '0123456789abcdef'.slice(0, r) + ']+$').test(s)) return null;
        var bn = 0n;
        var rb = BigInt(r);
        for (var i = 0; i < s.length; i++) bn = bn * rb + BigInt(parseInt(s.charAt(i), r));
        return bn;
      }
      function runBase() {
        var bn = parseBig(baseIn ? baseIn.value : '', radix);
        Object.keys(RADIX).forEach(function (k) {
          var el = document.getElementById('base' + k.charAt(0).toUpperCase() + k.slice(1));
          if (el) el.textContent = bn === null ? '—' : bn.toString(RADIX[k]).toUpperCase();
        });
      }
      if (baseTabs) {
        baseTabs.addEventListener('click', function (e) {
          var btn = e.target.closest('button');
          if (!btn) return;
          radix = Number(btn.getAttribute('data-b')) || 10;
          baseTabs.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === btn); });
          runBase();
        });
      }
      if (baseIn) baseIn.addEventListener('input', runBase);
      if (baseRows) {
        baseRows.addEventListener('click', function (e) {
          var row = e.target.closest('[data-copy]');
          if (!row) return;
          var code = row.querySelector('code');
          if (!code || code.textContent === '—') return;
          if (navigator.clipboard) navigator.clipboard.writeText(code.textContent).catch(function () {});
        });
      }
      setCat('len');
      runBase();
    }

    // ---- 文本工具（字数 / 整理 / 时间戳 / JSON） ----
    function initText() {
      var tabs = document.getElementById('textTabs');
      if (!tabs) return;
      var PANES = { count: 'textCount', clean: 'textClean', ts: 'textTs', json: 'textJson' };
      tabs.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        var t = btn.getAttribute('data-t');
        tabs.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === btn); });
        Object.keys(PANES).forEach(function (k) {
          var el = document.getElementById(PANES[k]);
          if (el) el.hidden = k !== t;
        });
      });
      // 字数统计：词数口径 = 中文按字、英文/数字连续串按词
      var tcIn = document.getElementById('tcIn');
      var tcChars = document.getElementById('tcChars');
      var tcNoSpace = document.getElementById('tcNoSpace');
      var tcWords = document.getElementById('tcWords');
      var tcLines = document.getElementById('tcLines');
      if (tcIn && tcChars && tcNoSpace && tcWords && tcLines) {
        tcIn.addEventListener('input', function () {
          var s = tcIn.value;
          tcChars.textContent = s.length;
          tcNoSpace.textContent = s.replace(/\s/g, '').length;
          tcWords.textContent = (s.match(/[\u4e00-\u9fff]|[A-Za-z0-9]+/g) || []).length;
          tcLines.textContent = s ? s.split(/\r?\n/).length : 0;
        });
      }
      // 整理：按行处理，结果写回输入框
      var tlIn = document.getElementById('tlIn');
      if (tlIn) {
        document.querySelectorAll('#textClean [data-clean]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var kind = btn.getAttribute('data-clean');
            var lines = tlIn.value.split(/\r?\n/);
            if (kind === 'dedupe') {
              var seen = {};
              lines = lines.filter(function (l) {
                var k = l.trim();
                if (seen[k]) return false;
                seen[k] = true;
                return true;
              });
            } else if (kind === 'sort') lines = lines.slice().sort(function (a, b) { return a.localeCompare(b, 'zh-Hans-CN'); });
            else if (kind === 'noblank') lines = lines.filter(function (l) { return l.trim() !== ''; });
            else if (kind === 'trim') lines = lines.map(function (l) { return l.trim(); });
            else if (kind === 'upper') lines = lines.map(function (l) { return l.toUpperCase(); });
            else if (kind === 'lower') lines = lines.map(function (l) { return l.toLowerCase(); });
            tlIn.value = lines.join('\n');
          });
        });
      }
      // 时间戳
      var tsIn = document.getElementById('tsIn');
      var tsOut = document.getElementById('tsOut');
      function fmtDate(ms) {
        var d = new Date(ms);
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
      }
      if (tsIn && tsOut) {
        var toBtn = document.getElementById('tsTo');
        var nowBtn = document.getElementById('tsNow');
        if (toBtn) toBtn.addEventListener('click', function () {
          var v = String(tsIn.value).trim();
          if (!/^\d+$/.test(v)) { tsOut.textContent = '请输入纯数字时间戳'; return; }
          // 10 位以内按秒，更长按毫秒
          tsOut.textContent = fmtDate(v.length > 10 ? Number(v) : Number(v) * 1000);
        });
        if (nowBtn) nowBtn.addEventListener('click', function () {
          tsIn.value = String(Math.floor(Date.now() / 1000));
          tsOut.textContent = '当前时间：' + fmtDate(Date.now());
        });
      }
      // JSON 格式化/压缩
      var tjIn = document.getElementById('tjIn');
      var tjOut = document.getElementById('tjOut');
      if (tjIn && tjOut) {
        function jsonRun(minify) {
          try {
            var obj = JSON.parse(tjIn.value);
            tjIn.value = minify ? JSON.stringify(obj) : JSON.stringify(obj, null, 2);
            tjOut.textContent = '✓ 合法 JSON';
          } catch (e) {
            tjOut.textContent = '解析失败：' + e.message;
          }
        }
        var fmtBtn = document.getElementById('tjFmt');
        var minBtn = document.getElementById('tjMin');
        if (fmtBtn) fmtBtn.addEventListener('click', function () { jsonRun(false); });
        if (minBtn) minBtn.addEventListener('click', function () { jsonRun(true); });
      }
    }

    // ---- 随机决策（滚灯式抽取，选项自动保存） ----
    function initDice() {
      var input = document.getElementById('diceIn');
      var goBtn = document.getElementById('diceGo');
      var out = document.getElementById('diceOut');
      if (!input || !goBtn || !out) return;
      try {
        var saved = localStorage.getItem('yhuoDice');
        if (saved) input.value = saved;
      } catch (e) {}
      input.addEventListener('input', function () {
        try { localStorage.setItem('yhuoDice', input.value); } catch (e) {}
      });
      function options() {
        return input.value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l !== ''; });
      }
      goBtn.addEventListener('click', function () {
        var opts = options();
        if (!opts.length) { out.textContent = '先在上面填几个选项'; return; }
        if (opts.length === 1) { out.textContent = opts[0] + '（没得选）'; return; }
        goBtn.disabled = true;
        out.classList.add('rolling');
        var n = 0;
        var iv = setInterval(function () {
          out.textContent = opts[Math.floor(Math.random() * opts.length)];
          if (++n >= 14) {
            clearInterval(iv);
            out.textContent = opts[Math.floor(Math.random() * opts.length)];
            out.classList.remove('rolling');
            goBtn.disabled = false;
            goBtn.textContent = '再抽一次';
          }
        }, 70);
      });
    }

    // ---- 密码生成（更多工具折叠区） ----
    function initPwdGen() {
      var out = document.getElementById('pwdGenOut');
      var lenEl = document.getElementById('pwdGenLen');
      var lenLabel = document.getElementById('pwdGenLenLabel');
      var symEl = document.getElementById('pwdGenSym');
      var genBtn = document.getElementById('pwdGenBtn');
      var copyBtn = document.getElementById('pwdGenCopy');
      if (!out || !lenEl || !genBtn) return;
      function gen() {
        var len = Number(lenEl.value) || 16;
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        if (symEl && symEl.checked) chars += '!@#$%^&*_-+=?';
        var buf = new Uint32Array(len);
        crypto.getRandomValues(buf);
        var s = '';
        for (var i = 0; i < len; i++) s += chars.charAt(buf[i] % chars.length);
        out.value = s;
      }
      lenEl.addEventListener('input', function () {
        if (lenLabel) lenLabel.textContent = lenEl.value + ' 位';
      });
      genBtn.addEventListener('click', gen);
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          if (!out.value) return;
          (navigator.clipboard ? navigator.clipboard.writeText(out.value) : Promise.reject())
            .then(function () {
              copyBtn.textContent = '已复制';
              setTimeout(function () { copyBtn.textContent = '复制'; }, 1500);
            })
            .catch(function () {
              out.select();
              try { document.execCommand('copy'); } catch (e) {}
            });
        });
      }
      gen();
    }

    function initToolsPage() {
      initCalc();
      initPomo();
      initDays();
      initConv();
      initText();
      initDice();
      initPwdGen();
    }

    // 从 URL 锚点定位工具卡（/tools/#toolCalc；全站搜索跨页跳转同用此入口）
    function locateToolCard(id) {
      if (id === 'toolPwd') {
        var fold = document.querySelector('.tool-more');
        if (fold) fold.open = true;
      }
      var el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('cmdk-flash');
      setTimeout(function () { el.classList.remove('cmdk-flash'); }, 1600);
    }

    // =========================
    // 文档区：docs/docs.json 清单 + docs/*.md，点击卡片进全屏阅读层。
    // 静态托管没有目录列表（坑 1），清单文件必须手工维护：加文档 = 放 md + 在 docs.json 加一条
    // =========================
    var docsGrid = null;    // 文档页模块：initDocsPage 按当前 DOM 重查
    var docsEmpty = null;
    var docViewer = document.getElementById('docViewer');
    var docViewerTitle = document.getElementById('docViewerTitle');
    var docArticle = document.getElementById('docArticle');

    // 迷你 Markdown 渲染：先整体转义 HTML 再按行解析，支持
    // #/##/### 标题、- 与 1. 列表、> 引用、``` 代码块、--- 分隔线、
    // **粗** *斜* `行内码` [链接](url) ![图](url)；不支持的语法原样显示
    function mdToHtml(src) {
      var esc = function (s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      };
      var inline = function (s) {
        return s
          .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">')
          .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
          .replace(/`([^`]+)`/g, '<code>$1</code>');
      };
      var lines = esc(src).split(/\r?\n/);
      var html = '';
      var inCode = false;
      var listType = null; // 'ul' | 'ol'
      function closeList() {
        if (listType) { html += '</' + listType + '>'; listType = null; }
      }
      lines.forEach(function (line) {
        if (/^```/.test(line)) {
          closeList();
          html += inCode ? '</code></pre>' : '<pre><code>';
          inCode = !inCode;
          return;
        }
        if (inCode) { html += line + '\n'; return; }
        var m;
        if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
          closeList();
          var lvl = m[1].length;
          html += '<h' + lvl + '>' + inline(m[2]) + '</h' + lvl + '>';
        } else if (/^\s*[-*]\s+/.test(line)) {
          if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; }
          html += '<li>' + inline(line.replace(/^\s*[-*]\s+/, '')) + '</li>';
        } else if (/^\s*\d+\.\s+/.test(line)) {
          if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol'; }
          html += '<li>' + inline(line.replace(/^\s*\d+\.\s+/, '')) + '</li>';
        } else if (/^>\s?/.test(line)) {
          closeList();
          html += '<blockquote>' + inline(line.replace(/^>\s?/, '')) + '</blockquote>';
        } else if (/^\s*---+\s*$/.test(line)) {
          closeList();
          html += '<hr>';
        } else if (line.trim() === '') {
          closeList();
        } else {
          closeList();
          html += '<p>' + inline(line) + '</p>';
        }
      });
      closeList();
      if (inCode) html += '</code></pre>';
      return html;
    }

    function openDoc(title, file) {
      if (!docViewer) return;
      if (docViewerTitle) docViewerTitle.textContent = title || '文档';
      if (docArticle) docArticle.innerHTML = '<p style="color:var(--apple-muted-foreground)">加载中…</p>';
      docViewer.hidden = false;
      void docViewer.offsetWidth;
      docViewer.classList.add('show');
      var isChangelog = /changelog\.md$/i.test(String(file || ''));
      fetch(file, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error('http ' + r.status)); })
        .then(function (text) {
          if (docArticle) docArticle.innerHTML = isChangelog ? clTimelineHtml(text) : mdToHtml(text);
        })
        .catch(function () {
          if (docArticle) docArticle.innerHTML = '<p>文档加载失败：' + escHtml(file) + '</p>';
        });
    }

    // 更新日志时间轴：## 日期 分组为时间轴节点，* 条目为卡片（标题取条目开头的 **粗体** 段）。
    // 长条目默认折叠（>220 字），「展开全部/收起」切换由下方全局委托处理。
    function clTimelineHtml(src) {
      var lines = String(src).replace(/\r\n/g, '\n').split('\n');
      var days = [];
      var cur = null;
      var entry = null;
      function inline(s) {
        return String(s)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      }
      lines.forEach(function (line) {
        var m;
        if ((m = line.match(/^##\s+(.+)$/))) {
          cur = { date: m[1].trim(), entries: [] };
          days.push(cur);
          entry = null;
          return;
        }
        if (!cur) return; // 文档大标题等前置内容不进时间轴
        if ((m = line.match(/^\*\s+(.+)$/))) {
          var raw = m[1];
          var tm = raw.match(/^\*\*(.+?)\*\*[:：]\s*/);
          var eTitle = tm ? tm[1] : '';
          if (tm) raw = raw.slice(tm[0].length);
          entry = { title: eTitle, body: raw };
          cur.entries.push(entry);
          return;
        }
        if (entry && line.trim() && line.charAt(0) !== '#') entry.body += '\n' + line;
      });
      var html = '<div class="cl-timeline">';
      days.forEach(function (day) {
        html += '<section class="cl-day"><p class="cl-date">' + inline(day.date) + '</p>';
        day.entries.forEach(function (e) {
          var bodyHtml = inline(e.body).replace(/\n/g, '<br>');
          var long = e.body.length > 220;
          html += '<article class="cl-entry">' +
            (e.title ? '<p class="cl-entry-title">' + inline(e.title) + '</p>' : '') +
            '<div class="cl-entry-body' + (long ? ' cl-clamp' : '') + '">' + bodyHtml + '</div>' +
            (long ? '<button type="button" class="cl-toggle" data-cl-toggle>展开全部</button>' : '') +
            '</article>';
        });
        html += '</section>';
      });
      html += '</div>';
      return html;
    }

    // 时间轴折叠切换（委托，一次注册）
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-cl-toggle]') : null;
      if (!btn) return;
      var body = btn.parentElement.querySelector('.cl-entry-body');
      if (!body) return;
      var clamped = body.classList.toggle('cl-clamp');
      btn.textContent = clamped ? '展开全部' : '收起';
    });

    function escHtml(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function closeDocViewer() {
      if (!docViewer || docViewer.hidden) return;
      docViewer.classList.remove('show');
      setTimeout(function () { docViewer.hidden = true; }, 260);
    }

    var docViewerClose = document.getElementById('docViewerClose');
    if (docViewerClose) docViewerClose.addEventListener('click', closeDocViewer);
    document.addEventListener('keydown', function (e) {
      // 文档阅读层 Esc 关闭（修：原条件里的 lightbox 自移除相册起就是 null，在这里解引用会让 Esc 静默报错）
      if (e.key === 'Escape' && docViewer && !docViewer.hidden) closeDocViewer();
    });

    function initDocsPage() {
      docsGrid = document.getElementById('docsGrid');
      docsEmpty = document.getElementById('docsEmpty');
      if (!docsGrid) return;
      fetch('/docs/docs.json', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)); })
        .then(function (list) {
          if (!Array.isArray(list) || !list.length) {
            if (docsEmpty) docsEmpty.hidden = false;
            return;
          }
          list.forEach(function (d) {
            var card = document.createElement('button');
            card.className = 'doc-card';
            card.type = 'button';
            var t = document.createElement('p');
            t.className = 'doc-card-title';
            t.textContent = d.title || d.file;
            card.appendChild(t);
            if (d.desc) {
              var desc = document.createElement('p');
              desc.className = 'doc-card-desc';
              desc.textContent = d.desc;
              card.appendChild(desc);
            }
            if (d.date) {
              var meta = document.createElement('p');
              meta.className = 'doc-card-meta';
              meta.textContent = d.date;
              card.appendChild(meta);
            }
            card.addEventListener('click', function () { openDoc(d.title || d.file, d.file); });
            docsGrid.appendChild(card);
          });
        })
        .catch(function () {
          if (docsEmpty) {
            docsEmpty.textContent = '文档清单加载失败（docs/docs.json）。';
            docsEmpty.hidden = false;
          }
        });
    }

    // =========================
    // AI 界面：对话实装（后端 /api/ai/* 代理转发，服务商 Key 只存在后台数据库）
    // 流式回复：后端把上游 SSE 归一化成 data: {"delta":"..."} / [DONE]，前端按行解析；
    // 多轮历史只存在内存里，关闭界面或点"新对话"即清空
    // =========================
    var aiView = null;       // AI 页模块：initAiPage 按当前 DOM 重查（pjax 换页后重建）
    var aiBtn = document.getElementById('aiBtn'); // 顶栏入口（外壳，常驻）
    var aiForm = null;
    var aiInput = null;
    var aiMessages = null;
    var aiHistory = [];      // 本次对话 {role, content} 列表
    var aiConvId = 0;        // 当前对话的服务端 id（0=尚未落库的新对话）
    var aiConvs = [];        // 左侧历史栏数据 [{id,title,updated_at,msgs}]
    var aiConfig = null;     // {enabled, models:[{name,model}], model(默认档案名)}，来自 /api/ai/config
    var aiCurrentModel = null; // 当前选中的档案名
    var aiAttach = [];         // 待发送附件 [{name, size, kind:'image'|'text', data}]
    var aiBusy = false;
    var aiAbort = null;

    function addAiMsg(role, text, pending) {
      if (!aiMessages) return null;
      var el = document.createElement('div');
      el.className = 'ai-msg ' + role + (pending ? ' pending' : '');
      el.textContent = text;
      aiMessages.appendChild(el);
      aiMessages.scrollTop = aiMessages.scrollHeight;
      return el;
    }

    // 机器人消息走 Markdown 渲染（mdToHtml 先整体转义再解析，防 XSS）
    function aiRenderBot(el, text) {
      if (!el) return;
      el.innerHTML = mdToHtml(text);
      aiMessages.scrollTop = aiMessages.scrollHeight;
    }

    function aiGreeting() {
      if (aiConfig && aiConfig.enabled) return '你好，我是 YHuo 的 AI 助手 🤖\n有什么想问的尽管说～';
      return '你好，我是 YHuo 的 AI 助手 🤖\n对话能力还在接入中，敬请期待～';
    }

    function aiGreetIfEmpty() {
      if (aiMessages && !aiMessages.children.length) addAiMsg('bot', aiGreeting());
    }

    // 输入条工具行的模型切换：纯文字 + ⌄，向上弹出分组菜单（仿桌面客户端，按供应商分组）
    function aiSyncModelSwitcher() {
      var btn = document.getElementById('aiModelBtn');
      var label = document.getElementById('aiModelLabel');
      var menu = document.getElementById('aiModelMenu');
      if (!btn || !label || !menu) return;
      if (!(aiConfig && aiConfig.enabled && aiConfig.models.length)) {
        btn.hidden = true;
        menu.hidden = true;
        aiCurrentModel = null;
        return;
      }
      // 保留本次会话已选的模型（若仍在列表里），否则用后台指定的默认
      var cur = aiCurrentModel;
      if (!cur || !aiConfig.models.some(function (m) { return m.key === cur; })) {
        cur = (aiConfig.model && aiConfig.models.some(function (m) { return m.key === aiConfig.model; }))
          ? aiConfig.model
          : aiConfig.models[0].key;
      }
      aiCurrentModel = cur;
      label.textContent = currentModelName();
      btn.hidden = false;
      menu.innerHTML = '';
      // 按供应商分组（对应客户端里的供应商分组）
      var groups = [];
      aiConfig.models.forEach(function (m) {
        var g = groups.filter(function (x) { return x.provider === m.provider; })[0];
        if (!g) {
          g = { provider: m.provider, items: [] };
          groups.push(g);
        }
        g.items.push(m);
      });
      groups.forEach(function (g) {
        var head = document.createElement('div');
        head.className = 'ai-model-group';
        head.textContent = g.provider;
        menu.appendChild(head);
        g.items.forEach(function (m) {
          var it = document.createElement('button');
          it.type = 'button';
          it.className = 'ai-model-item' + (m.key === aiCurrentModel ? ' active' : '');
          it.setAttribute('role', 'option');
          it.setAttribute('aria-selected', m.key === aiCurrentModel ? 'true' : 'false');
          var nm = document.createElement('span');
          nm.textContent = m.name;
          it.appendChild(nm);
          // 类型标签（后台设置：文本/视觉/推理）
          if (m.tag) {
            var tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = m.tag;
            it.appendChild(tag);
          }
          var chk = document.createElement('span');
          chk.className = 'chk';
          chk.textContent = '✓';
          it.appendChild(chk);
          it.addEventListener('click', function () {
            if (m.key !== aiCurrentModel) {
              aiCurrentModel = m.key;
              label.textContent = m.name;
              addAiMsg('bot', '已切换到「' + m.name + '」（' + m.provider + '）～');
            }
            menu.hidden = true;
          });
          menu.appendChild(it);
        });
      });
      // 底部"管理模型"：跳后台 AI 标签页（新标签打开，不打断当前聊天）
      var foot = document.createElement('div');
      foot.className = 'ai-model-foot';
      var manage = document.createElement('a');
      manage.className = 'ai-model-manage';
      manage.href = '/admin';
      manage.target = '_blank';
      manage.rel = 'noopener';
      manage.textContent = '管理模型';
      foot.appendChild(manage);
      menu.appendChild(foot);
    }

    function currentModelName() {
      var m = (aiConfig && aiConfig.models || []).filter(function (x) { return x.key === aiCurrentModel; })[0];
      return m ? m.name : '';
    }

    function fetchAiConfig(force) {
      if (aiConfig && !force) return Promise.resolve(aiConfig);
      return fetch('/api/ai/config', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : { enabled: false, models: [], model: null, _miss: true }; })
        .catch(function () { return { enabled: false, models: [], model: null, _miss: true }; })
        .then(function (d) {
          document.documentElement.classList.remove('ff-ai-boot-hide'); // 配置到达（开/关/失败都放行首访预藏，开关状态由下面决定）
          aiConfig = { enabled: !!(d && d.enabled), models: (d && d.models) || [], model: (d && d.model) || null };
          // 全局开关关=顶栏入口直接隐藏（CSS 类 + 内联样式双保险，并写缓存供下次首屏预隐藏）；
          // 请求失败（_miss）不动，避免网络抖动误隐藏且无法恢复
          if (aiBtn && !(d && d._miss)) {
            aiBtn.style.display = aiConfig.enabled ? '' : 'none';
            try {
              localStorage.setItem('yhuoAiOff', aiConfig.enabled ? '0' : '1');
              document.documentElement.classList.toggle('ff-ai-off', !aiConfig.enabled);
            } catch (e) {}
          }
          aiSyncModelSwitcher();
          return aiConfig;
        });
    }
    fetchAiConfig(false); // 启动即拉一次配置：AI 被后台全局开关关掉时，顶栏入口直接消失（而不是打开后才看到"接入中"）

    function aiStopBusy() {
      aiBusy = false;
      var sendBtn = document.getElementById('aiSendBtn');
      if (sendBtn) sendBtn.disabled = false;
    }

    // 清空对话（新对话用）：只清本地视图，开一个未落库的新会话（旧对话留在服务端历史栏里）
    function aiResetChat() {
      if (aiAbort) {
        try { aiAbort.abort(); } catch (e) {}
        aiAbort = null;
      }
      aiHistory = [];
      aiConvId = 0;
      aiAttach = [];
      aiRenderAttach();
      if (aiMessages) aiMessages.innerHTML = '';
      aiStopBusy();
      aiRenderHistoryList();
    }

    // 追加保存到服务端（静默失败，不打断聊天）；首次落库会返回 conv id 与标题
    function aiSaveHistory(msgs) {
      if (!msgs || !msgs.length) return;
      fetch('/api/ai/history', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, conv: aiConvId || undefined }),
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && d.ok && d.conv) {
            aiConvId = d.conv;
            // 更新侧栏（新建则插到最前，否则挪到最前并刷新标题/时间）
            var existed = false;
            aiConvs = aiConvs.filter(function (c) {
              if (c.id === d.conv) {
                c.title = d.title || c.title;
                c.updated_at = new Date().toISOString();
                c.msgs = (c.msgs || 0) + (d.added || 0);
                existed = true;
              }
              return c.id !== d.conv;
            });
            if (existed || d.title) {
              var cur = { id: d.conv, title: d.title || '新对话', updated_at: new Date().toISOString(), msgs: d.added || 0 };
              aiConvs.unshift(cur);
            }
            aiRenderHistoryList();
          }
        })
        .catch(function () {});
    }

    // 渲染左侧历史栏
    function aiRenderHistoryList() {
      var list = document.getElementById('aiHistoryList');
      if (!list) return;
      list.innerHTML = '';
      if (!aiConvs.length) {
        var empty = document.createElement('div');
        empty.className = 'ai-history-empty';
        empty.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
          + '<p class="he-main">还没有历史对话</p>'
          + '<p class="he-sub">开启新对话后自动保存在这里</p>';
        list.appendChild(empty);
        return;
      }
      aiConvs.forEach(function (c) {
        var it = document.createElement('button');
        it.type = 'button';
        it.className = 'ai-history-item' + (c.id === aiConvId ? ' active' : '');
        var main = document.createElement('span');
        main.className = 'hi-main';
        var t = document.createElement('span');
        t.className = 'hi-title';
        t.textContent = c.title || '新对话';
        var meta = document.createElement('span');
        meta.className = 'hi-meta';
        var n = Number(c.msgs) || 0;
        meta.textContent = (n ? n + ' 条' : '空') + (c.updated_at ? ' · ' + aiConvTime(c.updated_at) : '');
        main.appendChild(t);
        main.appendChild(meta);
        it.appendChild(main);
        var del = document.createElement('span');
        del.className = 'hi-del';
        del.title = '删除对话';
        del.setAttribute('role', 'button');
        del.setAttribute('aria-label', '删除对话 ' + (c.title || ''));
        del.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/></svg>';
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          // 两段式确认（留言板同款）：首点变红武装，2.5 秒内再点才真删；不用原生 confirm
          if (del.dataset.armed === '1') { doDeleteConv(c.id); return; }
          var armed = list.querySelector('.hi-del[data-armed="1"]');
          if (armed) { armed.dataset.armed = ''; armed.classList.remove('armed'); armed.title = '删除对话'; }
          del.dataset.armed = '1';
          del.classList.add('armed');
          del.title = '再点一次确认删除';
          setTimeout(function () {
            if (!del.isConnected) return;
            del.dataset.armed = '';
            del.classList.remove('armed');
            del.title = '删除对话';
          }, 2500);
        });
        it.appendChild(del);
        it.addEventListener('click', function () { aiOpenConv(c.id); });
        list.appendChild(it);
      });
    }

    // 相对时间（updated_at 是 UTC 的 "YYYY-MM-DD HH:MM:SS"）
    function aiConvTime(s) {
      var t = Date.parse(String(s || '').replace(' ', 'T') + 'Z');
      if (isNaN(t)) return '';
      var m = Math.round((Date.now() - t) / 60000);
      if (m < 1) return '刚刚';
      if (m < 60) return m + ' 分钟前';
      var h = Math.round(m / 60);
      if (h < 24) return h + ' 小时前';
      return Math.round(h / 24) + ' 天前';
    }

    // 拉取历史栏列表
    function aiLoadConvList() {
      fetch('/api/ai/conversations', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && d.ok) {
            aiConvs = d.conversations || [];
            aiRenderHistoryList();
          }
        })
        .catch(function () {});
    }

    function doDeleteConv(id) {
      fetch('/api/ai/conversations?id=' + id, { method: 'DELETE', credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.ok) return;
          aiConvs = aiConvs.filter(function (x) { return x.id !== id; });
          // 删的是当前对话：回到开场白状态（不自动跳别的对话，避免误打开）
          if (id === aiConvId) {
            aiConvId = 0;
            aiHistory = [];
            if (aiMessages) aiMessages.innerHTML = '';
            aiGreetIfEmpty();
          }
          aiRenderHistoryList();
        })
        .catch(function () {});
    }

    // 切换到某个历史对话
    function aiOpenConv(id) {
      if (id === aiConvId) { aiCloseHistoryDrawer(); return; }
      if (aiAbort) {
        try { aiAbort.abort(); } catch (e) {}
        aiAbort = null;
      }
      fetch('/api/ai/history?conv=' + id, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.ok) return;
          aiConvId = id;
          aiHistory = (d.messages || []).map(function (m) { return { role: m.role, content: m.content }; });
          aiAttach = [];
          aiRenderAttach();
          aiMessages.innerHTML = '';
          if (aiHistory.length) {
            aiHistory.forEach(function (m) {
              if (m.role === 'user') addAiMsg('user', m.content);
              else aiRenderBot(addAiMsg('bot', ''), m.content);
            });
          } else {
            aiGreetIfEmpty();
          }
          aiRenderHistoryList();
          aiCloseHistoryDrawer();
          if (aiInput) aiInput.focus();
        })
        .catch(function () {});
    }

    // 历史抽屉开合：遮罩同步 + 唤出按钮高亮 + aria-expanded
    function aiHistoryEls() {
      return {
        drawer: document.getElementById('aiHistory'),
        scrim: document.getElementById('aiHistoryScrim'),
        toggle: document.getElementById('aiHistoryToggle'),
      };
    }
    function aiDrawerOpen() {
      var h = aiHistoryEls().drawer;
      return !!(h && h.classList.contains('open'));
    }
    function aiOpenHistoryDrawer() {
      var els = aiHistoryEls();
      if (!els.drawer) return;
      els.drawer.classList.add('open');
      if (els.scrim) els.scrim.classList.add('show');
      if (els.toggle) {
        els.toggle.classList.add('open');
        els.toggle.setAttribute('aria-expanded', 'true');
      }
    }
    function aiCloseHistoryDrawer() {
      var els = aiHistoryEls();
      if (els.drawer) els.drawer.classList.remove('open');
      if (els.scrim) els.scrim.classList.remove('show');
      if (els.toggle) {
        els.toggle.classList.remove('open');
        els.toggle.setAttribute('aria-expanded', 'false');
      }
      // 关抽屉顺手解除未完成的删除确认
      var armed = document.querySelector('.hi-del[data-armed="1"]');
      if (armed) { armed.dataset.armed = ''; armed.classList.remove('armed'); armed.title = '删除对话'; }
    }

    // 打开界面时恢复最近对话（登录用户）
    var aiRestored = false;
    function aiRestoreHistory() {
      fetch('/api/ai/history', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.ok) return;
          aiConvId = d.conv || 0;
          var msgs = d.messages || [];
          if (!msgs.length) return;
          aiMessages.innerHTML = '';
          msgs.forEach(function (m) {
            if (m.role === 'user') addAiMsg('user', m.content);
            else aiRenderBot(addAiMsg('bot', ''), m.content);
          });
          aiHistory = msgs.map(function (m) { return { role: m.role, content: m.content }; });
          aiRenderHistoryList();
        })
        .catch(function () {});
    }

    function aiFail(messages, pending, msg) {
      // 失败时把刚 push 的用户消息弹回去，重试不会重复入历史
      if (messages.length && messages[messages.length - 1].role === 'user') messages.pop();
      if (pending) pending.remove();
      addAiMsg('bot', '⚠️ ' + msg);
      aiStopBusy();
    }

    function streamAiReply(messages, pending) {
      var full = '';
      var finished = false;
      var usageInfo = null; // 流里拿到的 token 用量 {prompt, completion}
      var ctl = typeof AbortController === 'function' ? new AbortController() : null;
      aiAbort = ctl;
      var decoder = typeof TextDecoder === 'function' ? new TextDecoder() : null;

      function finish() {
        if (finished) return;
        finished = true;
        aiAbort = null;
        if (full) {
          if (pending) {
            pending.classList.remove('pending');
            aiRenderBot(pending, full);
          } else {
            aiRenderBot(addAiMsg('bot', ''), full);
          }
          messages.push({ role: 'assistant', content: full });
          // 成功的一问一答成对入服务端历史（失败的不存，避免重试重复）
          aiSaveHistory(messages.slice(-2));
        } else {
          if (pending) pending.remove();
          addAiMsg('bot', '（模型没有返回内容，换个问法试试？）');
        }
        aiStopBusy();
        // token 用量：小字挂在回复气泡下 + 上报统计（失败静默）
        if (usageInfo) {
          var lastBot = aiMessages ? aiMessages.lastElementChild : null;
          if (lastBot && lastBot.className.indexOf('bot') !== -1) {
            var line = document.createElement('div');
            line.className = 'ai-usage';
            line.textContent = '↑' + usageInfo.prompt + ' / ↓' + usageInfo.completion + ' tokens';
            lastBot.appendChild(line);
          }
          fetch('/api/ai/usage', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: aiCurrentModel, prompt_tokens: usageInfo.prompt, completion_tokens: usageInfo.completion }),
          }).catch(function () {});
        }
      }

      // 解析一行归一化 SSE 数据；错误对象 {aiError} / {aiAuth} 抛给外层 catch
      function handleData(data) {
        if (data === '[DONE]') { finish(); return; }
        var j;
        try {
          j = JSON.parse(data);
        } catch (e) { return; }
        if (j.usage) { usageInfo = j.usage; return; }
        if (j.error) throw { aiError: j.error };
        if (j.delta) {
          full += j.delta;
          if (pending) {
            pending.classList.remove('pending');
            aiRenderBot(pending, full);
          }
        }
      }

      fetch('/api/ai/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages.slice(-20), model: aiCurrentModel }),
        signal: ctl ? ctl.signal : undefined
      }).then(function (res) {
        if (res.status === 401) throw { aiAuth: true };
        if (!res.ok) {
          return res.json().catch(function () { return {}; }).then(function (d) {
            throw { aiError: (d && d.error) || '服务暂时不可用（HTTP ' + res.status + '）' };
          });
        }
        if (!res.body || !res.body.getReader) {
          // 极端兜底：浏览器不支持流式，整段读完再解析
          return res.text().then(function (t) {
            t.split(/\n\n/).forEach(function (seg) {
              seg.split(/\r?\n/).forEach(function (line) {
                if (line.indexOf('data:') !== 0) return;
                handleData(line.slice(5).trim());
              });
            });
            finish();
          });
        }
        var reader = res.body.getReader();
        var buf = '';
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) { finish(); return; }
            buf += decoder.decode(r.value, { stream: true });
            var idx;
            while ((idx = buf.indexOf('\n\n')) !== -1) {
              var seg = buf.slice(0, idx);
              buf = buf.slice(idx + 2);
              seg.split(/\r?\n/).forEach(function (line) {
                line = line.trim();
                if (line.indexOf('data:') !== 0) return;
                handleData(line.slice(5).trim());
              });
              if (finished) return;
            }
            return pump();
          });
        }
        return pump();
      }).catch(function (e) {
        if (e && e.aiAuth) { aiFail(messages, pending, '登录状态已过期，请重新登录后再聊'); openGate(); return; }
        if (e && e.name === 'AbortError') return; // 关闭界面/新对话主动中断，不提示
        if (e && e.aiError) { aiFail(messages, pending, e.aiError); return; }
        if (!finished) aiFail(messages, pending, '网络错误，请稍后再试');
      });
    }

    // —— AI 页模块（/ai/ 为独立页面）：进入重建绑定，离开断流 + 摘 document 监听 ——
    var aiDocCleanup = null;
    function initAiPage() {
      aiView = document.getElementById('aiView');
      aiForm = document.getElementById('aiForm');
      aiInput = document.getElementById('aiInput');
      aiMessages = document.getElementById('aiMessages');
      if (!aiView) return;
      // 每次进入都刷新一次配置（后台开关/改配置即时生效），再补开场白
      fetchAiConfig(true).then(aiGreetIfEmpty);
      if (!aiRestored && !aiHistory.length) {
        aiRestored = true;
        aiLoadConvList();
        aiRestoreHistory();
      } else if (aiHistory.length) {
        // pjax 回来：用内存历史重建消息视图
        aiMessages.innerHTML = '';
        aiHistory.forEach(function (m) {
          if (m.role === 'user') addAiMsg('user', m.content);
          else aiRenderBot(addAiMsg('bot', ''), m.content);
        });
      } else {
        aiGreetIfEmpty();
      }
      var aiNewChatBtn = document.getElementById('aiNewChatBtn');
      if (aiNewChatBtn) {
        aiNewChatBtn.addEventListener('click', function () {
          aiResetChat();
          // 无论之前有没有聊天记录，都给出可见反馈（否则只有欢迎语时点击像"没反应"）
          addAiMsg('bot', '🆕 已开启新对话，有什么想问的～');
          aiCloseHistoryDrawer(); // 抽屉开着时同步收起
          if (aiInput) aiInput.focus();
        });
      }
      // 抽屉内"新对话"：同款行为 + 关抽屉
      var aiHistNewBtn = document.getElementById('aiHistNewBtn');
      if (aiHistNewBtn) {
        aiHistNewBtn.addEventListener('click', function () {
          aiResetChat();
          aiGreetIfEmpty();
          addAiMsg('bot', '🆕 已开启新对话，有什么想问的～');
          aiCloseHistoryDrawer();
          if (aiInput) aiInput.focus();
        });
      }
      // 历史抽屉：顶栏气泡按钮开合；点遮罩/聊天区关闭
      var aiHistoryToggle = document.getElementById('aiHistoryToggle');
      if (aiHistoryToggle) {
        aiHistoryToggle.setAttribute('aria-expanded', 'false');
        aiHistoryToggle.addEventListener('click', function () {
          if (aiDrawerOpen()) aiCloseHistoryDrawer();
          else aiOpenHistoryDrawer();
        });
      }
      var aiHistoryScrim = document.getElementById('aiHistoryScrim');
      if (aiHistoryScrim) aiHistoryScrim.addEventListener('click', aiCloseHistoryDrawer);
      var aiChatEl = aiView.querySelector('.ai-chat');
      if (aiChatEl) {
        aiChatEl.addEventListener('click', function () { aiCloseHistoryDrawer(); });
      }
      // 顶栏切换模型：只影响之后的回复，当前对话历史延续（菜单逻辑见 aiSyncModelSwitcher）
      var aiModelBtn = document.getElementById('aiModelBtn');
      var aiModelMenu = document.getElementById('aiModelMenu');
      if (aiModelBtn && aiModelMenu) {
        aiModelBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          aiModelMenu.hidden = !aiModelMenu.hidden;
        });
      }
      // document 级监听登记起来，离开页面时移除（防 pjax 反复进出叠加监听）
      var onDocClick = function (e) {
        if (aiModelMenu && !aiModelMenu.hidden && !e.target.closest('#aiModelSwitch')) aiModelMenu.hidden = true;
      };
      // Esc：先收模型菜单，再收历史抽屉（退出页面交给浏览器返回键，不再有"关界面"动作）
      var onDocKey = function (e) {
        if (e.key !== 'Escape') return;
        if (aiModelMenu && !aiModelMenu.hidden) { aiModelMenu.hidden = true; return; }
        if (aiDrawerOpen()) aiCloseHistoryDrawer();
      };
      document.addEventListener('click', onDocClick);
      document.addEventListener('keydown', onDocKey);
      aiDocCleanup = function () {
        document.removeEventListener('click', onDocClick);
        document.removeEventListener('keydown', onDocKey);
      };
      aiBindPageControls();
    }

    function destroyAiPage() {
      if (aiDocCleanup) { aiDocCleanup(); aiDocCleanup = null; }
      if (aiAbort) { try { aiAbort.abort(); } catch (e) {} aiAbort = null; }
    }

    // ---------- 附件：＋上传文件（图片→视觉模型 base64；文本文件→上下文注入，不存服务器） ----------
    var IMAGE_MAX = 4 * 1024 * 1024;   // 单图 4MB
    var TEXT_MAX = 200 * 1024;         // 文本文件 200KB
    var ATTACH_MAX = 4;                // 单条消息最多 4 个附件
    var TEXT_EXT = /\.(txt|md|markdown|json|csv|log|js|ts|mjs|py|html|css|xml|yml|yaml|sh|sql|ini|conf)$/i;

    function aiRenderAttach() {
      var row = document.getElementById('aiAttachRow');
      if (!row) return;
      row.innerHTML = '';
      row.hidden = !aiAttach.length;
      aiAttach.forEach(function (f, idx) {
        var chip = document.createElement('span');
        chip.className = 'ai-chip';
        var nm = document.createElement('span');
        nm.className = 'chip-name';
        nm.textContent = f.name;
        var tg = document.createElement('span');
        tg.className = 'chip-tag';
        tg.textContent = f.kind === 'image' ? '图片' : '文本';
        var x = document.createElement('button');
        x.type = 'button';
        x.className = 'chip-x';
        x.textContent = '✕';
        x.setAttribute('aria-label', '移除附件 ' + f.name);
        x.addEventListener('click', function () {
          aiAttach.splice(idx, 1);
          aiRenderAttach();
        });
        chip.appendChild(nm);
        chip.appendChild(tg);
        chip.appendChild(x);
        row.appendChild(chip);
      });
    }

    function aiAddFiles(files) {
      Array.prototype.forEach.call(files || [], function (f) {
        if (aiAttach.length >= ATTACH_MAX) {
          addAiMsg('bot', '⚠️ 一次最多带 ' + ATTACH_MAX + ' 个附件');
          return;
        }
        var isImage = /^image\//.test(f.type);
        var isText = /^text\//.test(f.type) || TEXT_EXT.test(f.name);
        if (isImage && f.size <= IMAGE_MAX) {
          var reader = new FileReader();
          reader.onload = function () {
            aiAttach.push({ name: f.name, size: f.size, kind: 'image', data: String(reader.result) });
            aiRenderAttach();
            aiHintVisionModel();
          };
          reader.readAsDataURL(f);
        } else if (!isImage && isText && f.size <= TEXT_MAX) {
          var tr = new FileReader();
          tr.onload = function () {
            aiAttach.push({ name: f.name, size: f.size, kind: 'text', data: String(tr.result) });
            aiRenderAttach();
          };
          tr.readAsText(f);
        } else {
          addAiMsg('bot', '⚠️ 仅支持图片（≤4MB）和文本类文件（≤200KB）');
        }
      });
    }

    // 附了图片但当前模型没打"视觉"标签时提醒一句（不拦着发）
    function aiHintVisionModel() {
      var cur = ((aiConfig && aiConfig.models) || []).filter(function (x) { return x.key === aiCurrentModel; })[0];
      if (cur && cur.tag && cur.tag !== '视觉') {
        addAiMsg('bot', '提示：当前模型「' + cur.name + '」未打「视觉」标签，可能看不了图片，可在下方切换模型。');
      }
    }

    function aiBindPageControls() {
      // ---------- 附件：＋上传文件（图片→视觉模型 base64；文本文件→上下文注入，不存服务器） ----------
      var aiFileBtn = document.getElementById('aiFileBtn');
      var aiFileInput = document.getElementById('aiFileInput');
      if (aiFileBtn && aiFileInput) {
        aiFileBtn.addEventListener('click', function () { aiFileInput.click(); });
        aiFileInput.addEventListener('change', function () {
          aiAddFiles(this.files);
          this.value = '';
        });
      }

      if (aiForm) {
        aiForm.addEventListener('submit', function (e) {
          e.preventDefault();
          var text = aiInput ? aiInput.value.trim() : '';
          if ((!text && !aiAttach.length) || aiBusy) return;
          if (!isMember()) {
            addAiMsg('bot', '要和我聊天，请先登录或注册一个账号哦～（右上角头像进入登录）');
            openGate();
            return;
          }
          aiBusy = true;
          var sendBtn = document.getElementById('aiSendBtn');
          if (sendBtn) sendBtn.disabled = true;
          fetchAiConfig(false).then(function (cfg) {
            if (!cfg.enabled) {
              addAiMsg('bot', 'AI 对话还没有配置好，请等站长在后台接入～');
              aiStopBusy();
              return;
            }
            // 组装消息：文本附件注入上下文；有图片时升级为多模态 parts（发给视觉模型）
            var content = text;
            var attachNote = '';
            aiAttach.forEach(function (f) {
              if (f.kind === 'text') {
                content += (content ? '\n\n' : '') + '【附件 ' + f.name + '】\n' + f.data;
                attachNote += ' 📄' + f.name;
              }
            });
            var images = aiAttach.filter(function (f) { return f.kind === 'image'; });
            if (images.length) {
              var parts = [{ type: 'text', text: content || '请看这些图片' }];
              images.forEach(function (f) {
                parts.push({ type: 'image_url', image_url: { url: f.data } });
                attachNote += ' 🖼' + f.name;
              });
              content = parts;
            }
            addAiMsg('user', text + attachNote);
            aiHistory.push({ role: 'user', content: content });
            aiAttach = [];
            aiRenderAttach();
            if (aiInput) aiInput.value = '';
            var pending = addAiMsg('bot', '思考中…', true);
            streamAiReply(aiHistory, pending);
          });
        });
      }
    }


    // ---------- 留言板（boardView）：前台用户发布、管理员删除、留言带签到等级徽标 ----------
    var boardList = null;   // 留言板页模块：initBoardPage 按当前 DOM 重查
    var boardInput = null;
    var boardCount = null;
    var boardHint = null;
    var boardPost = null;
    var boardEmpty = null;
    var boardMore = null;
    var boardMe = { loggedIn: false, admin: false }; // 进入页面时经 /api/user/me 判定
    var boardOffset = 0;

    function boardRefreshIdentity() {
      fetch('/api/user/me', { credentials: 'same-origin' })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (d) {
          boardMe = { loggedIn: !!(d && d.username), admin: !!(d && (d.admin || d.alsoAdmin)) };
          boardHint.textContent = boardMe.loggedIn
            ? (boardMe.admin ? (d.admin ? '以站长身份发布' : '已登录：' + d.username + '（管理员）') : '已登录：' + d.username)
            : '登录后可发布留言';
        })
        .catch(function () { boardMe = { loggedIn: false, admin: false }; });
    }
    function boardItem(it) {
      var item = document.createElement('div');
      item.className = 'board-item' + (it.isAdmin ? ' is-admin' : '');
      var av = document.createElement('div');
      av.className = 'board-avatar';
      av.textContent = it.isAdmin ? '站' : (it.username || '?').slice(0, 1).toUpperCase();
      item.appendChild(av);
      var body = document.createElement('div');
      body.className = 'board-body';
      var head = document.createElement('div');
      head.className = 'board-head';
      var nm = document.createElement('span');
      nm.className = 'board-name';
      nm.textContent = it.username;
      head.appendChild(nm);
      if (it.isAdmin) {
        var badge = document.createElement('span');
        badge.className = 'board-admin-badge';
        badge.textContent = '站长';
        head.appendChild(badge);
      } else if (it.level) {
        var lv = document.createElement('span');
        lv.className = 'board-lv';
        lv.textContent = 'Lv.' + it.level.lv + ' ' + it.level.name;
        head.appendChild(lv);
      }
      var tm = document.createElement('span');
      tm.className = 'board-time';
      tm.textContent = fmtBoardTime(it.created_at);
      head.appendChild(tm);
      if (boardMe.admin) {
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'board-del';
        del.textContent = '删除';
        del.setAttribute('aria-label', '删除该留言');
        del.addEventListener('click', function () {
          if (!confirmBoardDelete(del)) return;
          fetch('/api/messages?id=' + it.id, { method: 'DELETE', credentials: 'same-origin' })
            .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
            .then(function (d) { if (d.ok) { boardOffset = 0; boardLoad(); } else alertLike(d.error || '删除失败'); })
            .catch(function () { alertLike('网络错误'); });
        });
        head.appendChild(del);
      }
      body.appendChild(head);
      var ct = document.createElement('div');
      ct.className = 'board-content';
      ct.textContent = it.content;
      body.appendChild(ct);
      item.appendChild(body);
      return item;
    }
    // 轻提示：留言板内不引 toast 组件，用临时按钮文字/提示行表达
    function alertLike(msg) { boardHint.textContent = msg; setTimeout(function () { boardRefreshIdentity(); }, 2500); }
    function confirmBoardDelete(btn) {
      // 两段式确认：第一次点变「确认删除」，2.5 秒内再点才真删（不用原生 confirm）
      if (btn.dataset.armed === '1') return true;
      btn.dataset.armed = '1';
      var old = btn.textContent;
      btn.textContent = '确认删除';
      btn.style.color = '#e5484d';
      setTimeout(function () {
        btn.dataset.armed = '';
        btn.textContent = old;
        btn.style.color = '';
      }, 2500);
      return false;
    }
    function fmtBoardTime(s) {
      var d = new Date(String(s || '').replace(' ', 'T') + 'Z');
      if (isNaN(d.getTime())) return String(s || '');
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      var now = new Date();
      var sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      var hm = p(d.getHours()) + ':' + p(d.getMinutes());
      if (sameDay) return '今天 ' + hm;
      return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + hm;
    }
    function boardLoad() {
      fetch('/api/messages?offset=' + boardOffset, { credentials: 'same-origin' })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (d) {
          if (!d.ok) { boardHint.textContent = d.error || '留言加载失败'; return; }
          boardList.textContent = '';
          (d.list || []).forEach(function (it) { boardList.appendChild(boardItem(it)); });
          boardEmpty.hidden = (d.list || []).length > 0;
          boardMore.hidden = !d.hasMore;
          boardOffset += (d.list || []).length;
          if (!(d.list || []).length) boardHint.textContent = '';
        })
        .catch(function () { boardHint.textContent = '留言加载失败'; });
    }
    function initBoardPage() {
      boardList = document.getElementById('boardList');
      boardInput = document.getElementById('boardInput');
      boardCount = document.getElementById('boardCount');
      boardHint = document.getElementById('boardHint');
      boardPost = document.getElementById('boardPost');
      boardEmpty = document.getElementById('boardEmpty');
      boardMore = document.getElementById('boardMore');
      if (!boardList || !boardInput) return;
      boardInput.addEventListener('input', function () {
        boardCount.textContent = boardInput.value.length + ' / 500';
      });
      if (boardPost) {
        boardPost.addEventListener('click', function () {
          var content = boardInput.value.trim();
          if (!content) { boardHint.textContent = '说点什么再发布吧'; return; }
          if (!boardMe.loggedIn) { openGate(); return; }
          boardPost.disabled = true;
          boardPost.textContent = '发布中…';
          fetch('/api/messages', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content })
          }).then(function (r) { return r.json().catch(function () { return { ok: false, error: '响应异常' }; }); })
            .then(function (d) {
              boardPost.disabled = false;
              boardPost.textContent = '发布留言';
              if (d.ok) {
                boardInput.value = '';
                boardCount.textContent = '0 / 500';
                boardOffset = 0;
                boardLoad();
                boardHint.textContent = '留言已发布';
                setTimeout(function () { boardRefreshIdentity(); }, 2500);
              } else {
                boardHint.textContent = d.error || '发布失败';
              }
            })
            .catch(function () { boardPost.disabled = false; boardPost.textContent = '发布留言'; boardHint.textContent = '网络错误'; });
        });
      }
      if (boardMore) boardMore.addEventListener('click', boardLoad);
      boardOffset = 0;
      boardRefreshIdentity();
      boardLoad();
    }


    // ---------- 全站搜索（Ctrl+K / 顶栏放大镜）：命令面板 ----------
    // 数据源：界面/工具静态清单 + /api/playlist（失败回退 music|video|images 三个静态清单）+ docs/docs.json，60 秒缓存。
    // 动作全部复用现有机制：界面 pjax 跳真实页面、文档 openDoc、音乐按歌名回 tracks 定位 playIndex、
    // 视频/首页回 home。被功能开关关闭的界面/模块不出现在结果里。
    (function initCmdk() {
      var root = document.getElementById('cmdk');
      var input = document.getElementById('cmdkInput');
      var listEl = document.getElementById('cmdkResults');
      var toggleBtn = document.getElementById('searchToggle');
      if (!root || !input || !listEl) return;
      var opened = false;
      var hideTimer = null;
      var items = [];   // 当前渲染的扁平结果
      var active = 0;
      var data = { at: 0, docs: [], music: [], images: [], videos: [] };

      function loadData() {
        if (Date.now() - data.at < 60000) return;
        data.at = Date.now();
        fetch('/docs/docs.json', { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : []; })
          .then(function (l) { data.docs = Array.isArray(l) ? l : []; })
          .catch(function () { data.docs = []; });
        var useStatic = function () {
          data.music = []; data.images = []; data.videos = [];
          fetch('music/playlist.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (a) {
            (Array.isArray(a) ? a : []).forEach(function (n) {
              var name = String(n);
              data.music.push({ name: name, url: 'music/' + encodeURIComponent(name) });
            });
          }).catch(function () {});
          fetch('video/playlist.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (a) {
            (Array.isArray(a) ? a : []).forEach(function (n) {
              data.videos.push({ name: String(n), url: 'video/' + encodeURIComponent(String(n)) });
            });
          }).catch(function () {});
          fetch('images/manifest.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
            ((m && m.files) || []).forEach(function (f) {
              data.images.push({ title: f.title || '', url: f.url || '', album: '' });
            });
          }).catch(function () {});
        };
        fetch('/api/playlist', { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)); })
          .then(function (d) {
            // 坑 2：非 ok（SPA 回退伪 200）也要走静态兜底，不能静默 return
            if (!d || !d.ok) { useStatic(); return; }
            data.music = (d.music || []).map(function (m) { return { name: m.name || '', url: m.url || '' }; });
            data.images = (d.images || []).map(function (m) { return { title: m.title || m.name || '', url: m.url || '', album: m.album || '' }; });
            data.videos = (d.video || []).map(function (m) { return { name: m.name || m.title || '', url: m.url || '' }; });
          })
          .catch(useStatic);
      }

      function aiOn() { return !(aiConfig && aiConfig.enabled === false); }

      function stripExt(name) {
        return String(name || '').replace(/\.[^.]+$/, '');
      }

      function buildItems(q) {
        var ql = (q || '').trim().toLowerCase();
        var out = [];
        function push(group, tag, label, run, opts) {
          opts = opts || {};
          var hl = ql ? String(label || '').toLowerCase().indexOf(ql) : 0;
          // 副文本（如文档日期）也可匹配
          if (hl < 0 && opts.sub && String(opts.sub).toLowerCase().indexOf(ql) >= 0) hl = 0;
          if (ql && hl < 0) return;
          out.push({ group: group, tag: tag, label: label, sub: opts.sub, run: run, disabled: !!opts.disabled, hl: hl });
        }
        // 界面（功能开关过滤：关闭的界面搜不到，AI 跟随其全局开关）；首页走原生锚点
        push('界面', '界面', '首页', function () { pjaxGo('/'); });
        if (!FLAGS_OFF.toolsView) push('界面', '界面', '工具', function () { pjaxGo('/tools/'); });
        if (!FLAGS_OFF.docsView) push('界面', '界面', '文档', function () { pjaxGo('/docs/'); });
        if (aiOn()) push('界面', '界面', 'AI 助手', function () { pjaxGo('/ai/'); });
        if (!FLAGS_OFF.miscView) push('界面', '界面', '杂项', function () { pjaxGo('/misc/'); });
        push('界面', '界面', '留言板', function () { pjaxGo('/board/'); });
        // 工具卡（打开工具界面并定位到卡片）
        if (!FLAGS_OFF.toolsView) {
          var TOOLS = [
            { label: '计算器', id: 'toolCalc' },
            { label: '番茄钟', id: 'toolPomo' },
            { label: '换算器', id: 'toolConv' },
            { label: '文本工具', id: 'toolText' },
            { label: '随机决策', id: 'toolDice' },
            { label: '重要日子', id: 'toolDays' },
            { label: '密码生成', id: 'toolPwd', fold: true }
          ];
          TOOLS.forEach(function (t) {
            push('工具', t.label, t.label, function () { pjaxGo('/tools/#' + t.id); });
          });
        }
        // 文档
        if (!FLAGS_OFF.docsView) {
          data.docs.forEach(function (d) {
            var title = d.title || d.file || '';
            push('文档', '文档', title, function () {
              openDoc(title, d.file); // 阅读层是全站外壳浮层，任何页面原地打开
            }, { sub: d.date || '' });
          });
        }
        // 音乐：按歌名回当前曲库定位播放（与收藏同机制；曲库里没有则禁用）；展示名去掉格式后缀
        data.music.forEach(function (m) {
          var idx = -1;
          for (var i = 0; i < tracks.length; i++) { if (tracks[i].name === m.name) { idx = i; break; } }
          push('音乐', '音乐', musicDisplayName(m.name), function () { playIndex(idx); }, { disabled: idx < 0 });
        });
        // 视频
        if (!FLAGS_OFF.video) {
          data.videos.forEach(function (v) {
            push('视频', '视频', stripExt(v.name), function () { pjaxGo('/'); }, { sub: '回首页播放' });
          });
        }
        // 组内按命中位置排序，组间按各组最佳命中排序（组保持整体，不交错——渲染按组变化插组头）
        var groupOrder = [];
        var byGroup = {};
        out.forEach(function (it) {
          if (ql && it.hl < 0) return;
          if (!ql && it.group !== '界面' && it.group !== '工具') return;
          if (!byGroup[it.group]) { byGroup[it.group] = []; groupOrder.push(it.group); }
          byGroup[it.group].push(it);
        });
        if (ql) {
          groupOrder.forEach(function (g) { byGroup[g].sort(function (a, b) { return a.hl - b.hl; }); });
          groupOrder.sort(function (a, b) {
            var ma = 9999, mb = 9999;
            byGroup[a].forEach(function (it) { if (it.hl < ma) ma = it.hl; });
            byGroup[b].forEach(function (it) { if (it.hl < mb) mb = it.hl; });
            return ma - mb;
          });
        }
        var flat = [];
        groupOrder.forEach(function (g) { byGroup[g].forEach(function (it) { flat.push(it); }); });
        return flat.slice(0, 40);
      }

      function appendHighlighted(el, text, hl) {
        text = String(text || '');
        var qlen = input.value.trim().length;
        if (hl == null || hl < 0 || !qlen) { el.textContent = text; return; }
        el.appendChild(document.createTextNode(text.slice(0, hl)));
        var mark = document.createElement('mark');
        mark.textContent = text.slice(hl, hl + qlen);
        el.appendChild(mark);
        el.appendChild(document.createTextNode(text.slice(hl + qlen)));
      }

      function setActive(i) {
        if (!items.length) return;
        active = Math.max(0, Math.min(items.length - 1, i));
        var nodes = listEl.querySelectorAll('.cmdk-item');
        nodes.forEach(function (n, k) { n.classList.toggle('active', k === active); });
        var cur = nodes[active];
        if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
      }

      function render() {
        items = buildItems(input.value);
        active = 0;
        listEl.textContent = '';
        if (!items.length) {
          var empty = document.createElement('p');
          empty.className = 'cmdk-empty';
          empty.textContent = input.value.trim() ? '没有匹配的结果' : '这里什么都没有——搜个歌名、文档或工具试试';
          listEl.appendChild(empty);
          return;
        }
        var lastGroup = null;
        items.forEach(function (it, i) {
          if (it.group !== lastGroup) {
            lastGroup = it.group;
            var h = document.createElement('p');
            h.className = 'cmdk-group';
            h.textContent = it.group;
            listEl.appendChild(h);
          }
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'cmdk-item' + (i === active ? ' active' : '');
          if (it.disabled) b.disabled = true;
          var tag = document.createElement('span');
          tag.className = 'cmdk-tag';
          tag.textContent = it.tag;
          b.appendChild(tag);
          var title = document.createElement('span');
          title.className = 'cmdk-title';
          appendHighlighted(title, it.label, it.hl);
          b.appendChild(title);
          if (it.sub) {
            var s = document.createElement('span');
            s.className = 'cmdk-sub';
            s.textContent = it.sub;
            b.appendChild(s);
          }
          b.addEventListener('click', function () { runItem(it); });
          b.addEventListener('mousemove', function () { if (active !== i) setActive(i); });
          listEl.appendChild(b);
        });
      }

      function runItem(it) {
        if (!it || it.disabled) return;
        closePanel();
        setTimeout(function () {
          try { it.run(); } catch (e) {}
        }, 90);
      }

      function showPanel() {
        if (opened) return;
        opened = true;
        clearTimeout(hideTimer);
        loadData();
        root.hidden = false;
        void root.offsetWidth;
        root.classList.add('show');
        input.value = '';
        render();
        setTimeout(function () { input.focus(); }, 60);
      }

      function closePanel() {
        if (!opened) return;
        opened = false;
        root.classList.remove('show');
        hideTimer = setTimeout(function () { root.hidden = true; }, 190);
      }

      if (toggleBtn) toggleBtn.addEventListener('click', function () { showPanel(); });
      document.getElementById('cmdkBackdrop').addEventListener('click', closePanel);
      root.addEventListener('wheel', function (e) {
        if (e.target && e.target.classList && e.target.classList.contains('cmdk-backdrop')) e.preventDefault();
      }, { passive: false });

      input.addEventListener('input', render);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (items.length) setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          runItem(items[active]);
        }
      });

      // 捕获阶段接管：面板打开时 Esc/箭头/Enter 不再漏给其他全屏层；Ctrl/Cmd+K 全局唤起
      document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
          e.preventDefault();
          e.stopPropagation();
          if (opened) closePanel(); else showPanel();
          return;
        }
        if (!opened) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closePanel();
        }
      }, true);
    })();

    // =========================
    // 多页面核心：pjax 无缝换页（2026-09-05）
    // 六个页面都是真实 HTML（/、/tools/、/docs/、/ai/、/misc/、/board/），直接输入网址/刷新/分享全部可用；
    // 站内导航在这里拦截：fetch 目标页 → 只替换 <main>（头部/播放器/浮层/页脚都在外壳里不动）→ 音乐跨页不断播。
    // fetch 失败或禁 JS：浏览器整页加载兜底（页面本来就是真文件）。
    // =========================
    var PAGE_MODULES = {
      home: {
        init: function () { startHomeClock(); startHomeQuote(); startHomeVideo(); startHomeWeather(); lyricRebind(); },
        destroy: function () { stopHomeClock(); destroyHomeQuote(); }
      },
      tools: {
        init: function () { initToolsPage(); },
        destroy: function () { if (pomoStopHook) pomoStopHook(); },
        onHash: function (h) { var id = String(h || '').slice(1); if (/^tool/.test(id)) locateToolCard(id); }
      },
      docs:  { init: function () { initDocsPage(); } },
      ai:    { init: function () { initAiPage(); }, destroy: destroyAiPage },
      misc:  { init: function () { initMiscGallery(); }, destroy: destroyMiscGallery },
      board: { init: function () { initBoardPage(); } }
    };
    var currentPage = PAGE_KEY;

    function runPageHook(key, name, arg) {
      var m = PAGE_MODULES[key];
      if (m && m[name]) { try { m[name](arg); } catch (e) {} }
    }
    function pageKeyForPath(p) {
      var key = String(p || '').replace(/^\/+|\/+$/g, '');
      if (!key) return 'home';
      return PAGE_ROUTE[key] ? key : null;
    }
    function isInternalLink(a) {
      if (!a || a.tagName !== 'A') return false;
      if (a.target === '_blank' || a.hasAttribute('download')) return false;
      if (a.protocol !== location.protocol || a.host !== location.host) return false;
      var h = a.getAttribute('href') || '';
      if (!h || h.charAt(0) === '#') return false;
      if (/^(admin|api|media)(\/|$)/.test(h.replace(/^\/+/, '').replace(/\/+$/, ''))) return false;
      return true;
    }
    function applyNavActive(key) {
      navLinks.forEach(function (a) {
        var k = a.id ? a.id.replace(/Btn$/, '') : (a.getAttribute('data-target') === 'home' ? 'home' : '');
        var on = k === key;
        a.classList.toggle('active', on);
        if (on) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    }
    function closeAllTransientOverlays() {
      // 换页时收起外壳上的临时浮层（不随 <main> 换页重置）
      try { closeProfileView(); } catch (e) {}
      try { closeDocViewer(); } catch (e) {}
      try { closeWeatherPicker(); } catch (e) {}
      try { closeBgPicker(); } catch (e) {}
      try { setAppearOpen(false); } catch (e) {}
      try { setProfileOpen(false); } catch (e) {}
    }
    function postVisit(path) {
      // 访问计数：pjax 换页也按真实路径上报（每个浏览器会话的首次进入由顶部访问计数块负责）
      try {
        fetch('/api/visit', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: path + location.hash })
        }).catch(function () {});
      } catch (e) {}
    }

    var scrollMem = {};  // 离开页面时的滚动位置（返回键恢复）
    var pjaxBusy = false;
    function pjaxSwap(u, push, restoreY) {
      if (pjaxBusy) return;
      pjaxBusy = true;
      fetch(u.href, { credentials: 'same-origin' })
        .then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var nextMain = doc.querySelector('main.page-main');
          var curMain = document.querySelector('main.page-main');
          if (!nextMain || !curMain) throw new Error('pjax: 目标页缺少 <main>');
          var key = doc.documentElement.getAttribute('data-page') || pageKeyForPath(u.pathname) || 'home';
          // 后台把该栏目关掉了：整页回首页（与 applyFeatureFlags 同口径）
          var c = window.__FF_CACHE;
          if (key !== 'home' && c && c[key] === false) { location.replace('/'); return; }
          runPageHook(currentPage, 'destroy');
          curMain.innerHTML = nextMain.innerHTML;
          document.documentElement.setAttribute('data-page', key);
          document.title = doc.title || PAGE_TITLES[key] || document.title;
          applyNavActive(key);
          currentPage = key;
          closeAllTransientOverlays();
          if (push) history.pushState(null, '', u.href);
          else history.replaceState(null, '', u.href);
          window.scrollTo(0, restoreY || 0);
          initScrollReveal();
          runPageHook(key, 'init');
          if (u.hash) runPageHook(key, 'onHash', u.hash);
          postVisit(u.pathname);
        })
        .catch(function () {
          location.href = u.href; // fetch 失败（离线/异常响应）：整页加载兜底
        })
        .finally(function () { pjaxBusy = false; });
    }
    function pjaxGo(url) {
      var u = new URL(url, location.href);
      if (u.pathname === location.pathname) {
        // 同页：锚点定位或滚顶，不换内容
        if (u.hash && u.hash !== location.hash) {
          location.hash = u.hash.slice(1);
          runPageHook(currentPage, 'onHash', u.hash);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
      scrollMem[location.pathname] = window.scrollY;
      pjaxSwap(u, true, 0);
    }
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var t = e.target;
      var a = t && t.closest ? t.closest('a') : null;
      if (!isInternalLink(a)) return;
      e.preventDefault();
      pjaxGo(a.href);
    });
    window.addEventListener('popstate', function () {
      // 返回/前进：换回目标页内容并恢复滚动位置
      var key = pageKeyForPath(location.pathname);
      if (!key) { location.reload(); return; } // 未知路径交给服务器（Cloudflare SPA 回退回首页）
      if (key === currentPage) {
        // 同页 hash 变动（如工具页内 #toolCalc）：只做定位
        if (location.hash) runPageHook(key, 'onHash', location.hash);
        return;
      }
      pjaxSwap(new URL(location.href), false, scrollMem[location.pathname] || 0);
    });

    // 旧链接兼容：#/tools 形式的 hash 自动归一到独立页（不产生多余历史记录）
    (function () {
      var m = /^#\/(tools|docs|ai|misc|board)\b/.exec(location.hash || '');
      if (m) location.replace('/' + m[1] + '/');
    })();

    // 当前页面启动：跑对应模块（首访的滚动高亮/进度条由 onScroll 自理）
    runPageHook(currentPage, 'init');
  })();

    // 流星（参考博客站 fx 特效接入，源码 博客动画源码/03-流星-meteors.js 精简）：
    // 本站无 00 设置核心，档位固定 high（30 颗）；触屏窄屏自动降为 low（10 颗），
    // 系统减弱动态时不渲染（CSS @media 兜底隐藏）。负 delay 让每颗首帧即处于不同相位
    (function () {
      var root = document.querySelector('[data-fx-meteors]');
      if (!root) return;
      var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var lowPower = window.matchMedia('(max-width: 859px)').matches
        && window.matchMedia('(pointer: coarse)').matches;
      var count = reduceMotion ? 0 : (lowPower ? 10 : 30);
      var frag = document.createDocumentFragment();
      for (var i = 0; i < count; i++) {
        var meteor = document.createElement('span');
        var duration = 4.5 + Math.random() * 4.5;
        meteor.className = 'fx-meteor';
        meteor.style.setProperty('--left', (-35 + Math.random() * 125) + '%');
        meteor.style.setProperty('--duration', duration + 's');
        meteor.style.setProperty('--delay', (-Math.random() * duration) + 's');
        meteor.style.setProperty('--tail', (38 + Math.random() * 34) + 'px');
        frag.appendChild(meteor);
      }
      root.appendChild(frag);
    })();
