# -*- coding: utf-8 -*-
"""common.js 多页面手术：删全屏管理器/路径路由，页面模块 init/teardown 化，接 pjax。
行号基于当前 assets/common.js（提取自原 index.html 6091-12715 行 + 流星段）。
每个操作带起止行内容断言，自底向上应用，任何断言失败立即报错退出。"""
import io, sys

PATH = 'assets/common.js'
with io.open(PATH, 'r', encoding='utf-8', newline='') as f:
    lines = f.read().split('\n')   # 0-based；1-based 行 N = lines[N-1]

def A(n):  # 1-based 取行
    return lines[n-1]

OPS = []  # (start1, end1, expect_start, expect_end, replacement_lines 或 None=删除)

def op(a, b, ea, eb, rep):
    OPS.append((a, b, ea, eb, rep))

# ---------- OP1 onScroll 视图守卫（143-148）----------
op(143, 148,
   '// 全屏界面打开期间高亮由各自的 open 函数接管', ') return;',
   [
"      // 多页面：仅首页按滚动位置高亮（子页面导航高亮是静态的，滚动逻辑不许摘掉它）",
"      if (sections.length)",
   ])

# ---------- OP2 全屏管理器 + 路径路由（162-312）→ 功能开关 + 页面元数据 ----------
op(162, 312,
   None, '});',
   [
"    // =========================",
"    // 功能开关（后台「外观 → 功能开关」，/api/settings 下发，缺省全开）",
"    // 多页面架构（2026-09-05）：原「全屏层统一管理器」（FS_TOP/fsOpen/fsClose/垫底覆盖）与",
"    // 「路径路由器」（FS_ROUTE/popstate 深链接）已随「栏目拆独立页」整体移除——",
"    // 工具/文档/AI/杂项/留言各是真实页面（/tools/ /docs/ /ai/ /misc/ /board/），界面切换 = 真实导航；",
"    // 跨页无缝与音乐不断播由 IIFE 尾部的 PJAX 路由负责。",
"    // =========================",
"    var FLAGS_OFF = {}; // true 的界面/模块前台直接隐藏",
"    var FF_APPLY_HOOKS = []; // flags 应用后要通知的启动期模块（画廊等在各自块级作用域里注册回调，规避坑 9）",
"    var PAGE_KEY = document.documentElement.getAttribute('data-page') || 'home'; // 当前页面（各页 <html> 上标死）",
"    var PAGE_ROUTE = { home: '/', tools: '/tools/', docs: '/docs/', ai: '/ai/', misc: '/misc/', board: '/board/' };",
"    var PAGE_TITLES = { home: document.title, tools: '工具合集 - YHuo', docs: '文档 - YHuo', ai: 'AI 助手 - YHuo', misc: '杂项 - YHuo', board: '留言板 - YHuo' };",
   ])

# ---------- OP3 applyFeatureFlags 尾部（341-347）----------
op(341, 347,
   '// 深链接打开的/正开着的界面被开关关闭', '});',
   [
"      // 当前页面本身被开关关闭（后台关掉某栏目后直接访问/停留该页）：整页回首页",
"      if (PAGE_KEY !== 'home' && FLAGS_OFF[PAGE_KEY + 'View']) location.replace('/');",
   ])

# ---------- OP4 平滑滚动导航（353-368）去全屏条件 ----------
op(353, 368,
   'sectionLinks.forEach(function (a) {', '});',
   [
"    sectionLinks.forEach(function (a) {",
"      a.addEventListener('click', function (e) {",
"        e.preventDefault(); // 仅首页有 #home 锚点；子页面导航全是真链接，不进这里",
"        var target = document.getElementById(a.getAttribute('data-target'));",
"        if (!target) return;",
"        var top = target.getBoundingClientRect().top + window.scrollY - 52;",
"        window.scrollTo({ top: top, behavior: 'smooth' });",
"      });",
"    });",
   ])

# ---------- OP5 实时时钟（397-428）→ 首页模块 ----------
op(397, 428,
   'var heroGreeting = document.getElementById', '}',
   [
"    var heroGreeting = null;",
"    var lastSecond = null;",
"    var homeClockTimers = [];",
"    function stopHomeClock() {",
"      homeClockTimers.forEach(clearInterval);",
"      homeClockTimers = [];",
"    }",
"    function startHomeClock() {",
"      stopHomeClock();",
"      clockHEl = document.getElementById('clockH');",
"      clockMEl = document.getElementById('clockM');",
"      clockSEl = document.getElementById('clockS');",
"      clockMsEl = document.getElementById('clockMs');",
"      clockDateEl = document.getElementById('clockDate');",
"      heroGreeting = document.getElementById('heroGreeting');",
"      updateClock();",
"      homeClockTimers.push(setInterval(updateClock, 200));",
"      // 毫秒滚数",
"      if (clockMsEl) {",
"        homeClockTimers.push(setInterval(function () {",
"          clockMsEl.textContent = '.' + ('00' + new Date().getMilliseconds()).slice(-3);",
"        }, 50));",
"      }",
"    }",
   ])

# ---------- OP6 寄语轮播（492-596）→ 可重入首页模块 ----------
op(492, 596,
   'var heroQuote = document.getElementById', '}',
   [
"    var hqTeardown = null;",
"    function destroyHomeQuote() {",
"      if (!hqTeardown) return;",
"      hqTeardown();",
"      hqTeardown = null;",
"    }",
"    function startHomeQuote() {",
"      destroyHomeQuote();",
"      var heroQuote = document.getElementById('heroQuote');",
"      if (!heroQuote) return;",
"      var heroQuoteText = document.getElementById('heroQuoteText');",
"      var hqList = [];            // 轮播内容池",
"      var hqIdx = -1;             // 当前显示条",
"      var hqTypeTimer = null;     // 打字机定时器",
"      var hqHoldTimer = null;     // 停留定时器",
"      var HQ_TYPE_MS = 45;        // 每字打字间隔",
"      var HQ_HOLD_MS = 6000;      // 寄语每条停留时长（一言用 3000）",
"      var hqHoldMs = HQ_HOLD_MS;  // 当前生效的停留时长",
"      var hqStop = false;         // 页面隐藏时暂停轮播",
"",
"      function hqTypeText(text, done) {",
"        clearInterval(hqTypeTimer);",
"        heroQuote.classList.add('typing');",
"        var shown = 0;",
"        heroQuoteText.textContent = '';",
"        hqTypeTimer = setInterval(function () {",
"          shown++;",
"          heroQuoteText.textContent = text.slice(0, shown);",
"          if (shown >= text.length) {",
"            clearInterval(hqTypeTimer);",
"            heroQuote.classList.remove('typing');",
"            if (done) done();",
"          }",
"        }, HQ_TYPE_MS);",
"      }",
"      function hqNext() {",
"        if (hqStop || !hqList.length) return;",
"        hqIdx = (hqIdx + 1) % hqList.length;",
"        hqTypeText(hqList[hqIdx], function () {",
"          hqHoldTimer = setTimeout(hqNext, hqHoldMs);",
"        });",
"      }",
"      // 点击一言：立即切下一条；池子只有 0~1 条时在线拉一条新的（避免切了还是原来那句）",
"      heroQuote.addEventListener('click', function () {",
"        clearTimeout(hqHoldTimer);",
"        if (hqList.length >= 2) { hqNext(); return; }",
"        // 池子不足：现拉一条替换显示（不进池子，下次点击再拉）",
"        fetch('https://v1.hitokoto.cn/?c=i&encode=json')",
"          .then(function (res) { return res.ok ? res.json() : null; })",
"          .catch(function () { return null; })",
"          .then(function (d) {",
"            if (d && d.hitokoto) {",
"              var s = d.hitokoto + (d.from ? ' —— 「' + d.from + '」' : '');",
"              if (s !== hqList[hqIdx]) { hqTypeText(s); return; }",
"            }",
"            // 拉失败或与当前相同：换备用域名再试一次",
"            return fetch('https://international.v1.hitokoto.cn/?c=i&encode=json')",
"              .then(function (res) { return res.ok ? res.json() : null; })",
"              .catch(function () { return null; })",
"              .then(function (d2) {",
"                if (d2 && d2.hitokoto) {",
"                  var s2 = d2.hitokoto + (d2.from ? ' —— 「' + d2.from + '」' : '');",
"                  if (s2 !== hqList[hqIdx]) hqTypeText(s2);",
"                }",
"              });",
"          });",
"      });",
"      heroQuote.style.cursor = 'pointer';",
"      heroQuote.title = '点击切换';",
"      // 页面不可见时暂停打字/轮播，回来继续",
"      var onVis = function () {",
"        hqStop = document.hidden;",
"        if (hqStop) { clearInterval(hqTypeTimer); clearTimeout(hqHoldTimer); heroQuote.classList.remove('typing'); }",
"        else if (hqList.length > 1) hqNext();",
"      };",
"      document.addEventListener('visibilitychange', onVis);",
"",
"      var showQuote = function (text, holdMs) {",
"        hqHoldMs = holdMs || HQ_HOLD_MS;",
"        heroQuote.hidden = false;",
"        requestAnimationFrame(function () {",
"          heroQuote.classList.add('loaded');",
"        });",
"        if (hqList.length > 1) { hqIdx = -1; hqNext(); } // 多条：打字机轮播",
"        else { heroQuoteText.textContent = text; }        // 单条：静态显示",
"      };",
"      var showQuotes = function (list) {",
"        hqList = list.filter(function (q) { return q && q.trim(); });",
"        if (!hqList.length) return loadDailyQuote();",
"        if (hqList.length === 1) {",
"          // 单条寄语：并入一言池混合轮播（避免只有一条时静态不动）",
"          getHitokotoPool().then(function (texts) {",
"            hqList = hqList.concat(texts);",
"            showQuote(hqList[0], 6000);",
"          });",
"          return;",
"        }",
"        showQuote(hqList[0]);",
"      };",
"      var loadDailyQuote = function () {",
"        getHitokotoPool().then(function (texts) {",
"          if (!texts.length) { heroQuote.hidden = true; return; }",
"          hqList = texts;",
"          showQuote(texts[0], 3000); // 一言：3 秒切一句",
"        });",
"      };",
"      fetch('/api/settings?t=' + Date.now(), { credentials: 'same-origin' }) // 时间戳穿透浏览器 60s 缓存",
"        .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('无接口')); })",
"        .then(function (s) {",
"          var qs = s && s.ok && Array.isArray(s.quotes) ? s.quotes : [];",
"          showQuotes(qs);",
"        })",
"        .catch(loadDailyQuote);",
"",
"      hqTeardown = function () {",
"        clearInterval(hqTypeTimer);",
"        clearTimeout(hqHoldTimer);",
"        document.removeEventListener('visibilitychange', onVis);",
"      };",
"    }",
   ])

# ---------- OP7 滚动入场（601-619）→ 可重跑函数 ----------
op(601, 619,
   "if ('IntersectionObserver' in window) {", '}',
   [
"    var revealObserver = null;",
"    function initScrollReveal() {",
"      if (!('IntersectionObserver' in window)) {",
"        document.querySelectorAll('.content-section').forEach(function (el) {",
"          el.classList.add('visible');",
"        });",
"        return;",
"      }",
"      if (!revealObserver) {",
"        revealObserver = new IntersectionObserver(function (entries) {",
"          entries.forEach(function (entry) {",
"            if (entry.isIntersecting) {",
"              entry.target.classList.add('visible');",
"              revealObserver.unobserve(entry.target);",
"            }",
"          });",
"        }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });",
"      }",
"      document.querySelectorAll('.content-section:not(.visible)').forEach(function (el) {",
"        revealObserver.observe(el);",
"      });",
"    }",
   ])

# ---------- OP8 画廊（624-808）→ 杂项模块（顺带修复：加载调用被相册移除时误删） ----------
op(624, 808,
   'if (gallery) {', '^    }$'.replace('^', '').replace('$', ''),
   [
"    // 画廊状态挂 IIFE 作用域：resetCardMouse（外层）与外观开关要触达（坑 9：严格模式块内声明不可见）；",
"    // 非杂项页保持空默认值，resetCardMouse 因此不再有 undefined.forEach 隐患",
"    var loadedImgs = [];",
"    var tiltRaf = null;",
"    var hoverImg = null;",
"    var galleryCard = null;",
"    var cardMouseOn = true; // 大卡片跟随鼠标（外观卡片开关）",
"    var imgTiltOn = true;   // 小图片倾斜动效（外观卡片开关）",
"    var miscTeardown = null;",
"    var miscAllowHook = null; // 当前画廊实例的「配置到达校正」回调（经 FF_APPLY_HOOKS 转发）",
"",
"    function initMiscGallery() {",
"      destroyMiscGallery();",
"      gallery = document.getElementById('galleryGrid');",
"      galleryEmpty = document.getElementById('galleryEmpty');",
"      if (!gallery) return;",
"      // 约定：图片命名为 1、2、3… 放入 images 文件夹，自动尝试多种格式",
"      var IMAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];",
"      var IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'];",
"      var imgPending = 0; // 等加载路径确定（后台接口或本地扫描）后再计数",
"",
"      // 折叠相册：所有照片叠成一副牌，幻灯片式逐张展示（4 秒自动切换，悬停暂停）",
"      var deckIndex = 0;",
"      var deckTimer = null;",
"      var deckCount = document.getElementById('deckCount');",
"      var deckNav = document.getElementById('deckNav');",
"      var deckPrev = document.getElementById('deckPrev');",
"      var deckNext = document.getElementById('deckNext');",
"",
"      function applyDeck() {",
"        var n = loadedImgs.length;",
"        if (!n) return;",
"        if (deckIndex >= n) deckIndex = 0;",
"        loadedImgs.forEach(function (el, i) {",
"          el.classList.remove('deck-front', 'deck-1', 'deck-2');",
"          var rel = (i - deckIndex + n) % n;",
"          if (rel === 0) el.classList.add('deck-front');",
"          else if (rel === 1) el.classList.add('deck-1');",
"          else if (rel === 2) el.classList.add('deck-2');",
"          el.style.zIndex = String(n - rel);",
"        });",
"        if (deckCount) deckCount.textContent = (deckIndex + 1) + ' / ' + n;",
"        if (deckNav) deckNav.hidden = n < 2;",
"      }",
"",
"      function deckStep(delta) {",
"        var n = loadedImgs.length;",
"        if (n < 2) return;",
"        deckIndex = (deckIndex + delta + n) % n;",
"        applyDeck();",
"        restartDeckTimer();",
"      }",
"",
"      function restartDeckTimer() {",
"        if (deckTimer) { clearInterval(deckTimer); deckTimer = null; }",
"        if (loadedImgs.length < 2) return;",
"        deckTimer = setInterval(function () {",
"          if (document.hidden || !loadedImgs.length) return;",
"          deckIndex = (deckIndex + 1) % loadedImgs.length;",
"          applyDeck();",
"        }, 4000);",
"      }",
"",
"      // 布局：舞台高度要容得下最大的照片（照片最宽 560px，4:3 + 上下白边 ≈ 432px），",
"      // 否则最大化窗口时照片会戳出白色卡片、盖住下方的切换按钮",
"      function layoutGallery() {",
"        gallery.style.height = loadedImgs.length ? 'min(42vw, 432px)' : '0px';",
"        applyDeck();",
"        if (loadedImgs.length > 1 && !deckTimer) restartDeckTimer();",
"      }",
"      window.addEventListener('resize', layoutGallery);",
"",
"      if (deckPrev) deckPrev.addEventListener('click', function () { deckStep(-1); });",
"      if (deckNext) deckNext.addEventListener('click', function () { deckStep(1); });",
"      // 悬停在照片上时暂停自动轮播，移开继续",
"      gallery.addEventListener('mouseenter', function () {",
"        if (deckTimer) { clearInterval(deckTimer); deckTimer = null; }",
"      });",
"      gallery.addEventListener('mouseleave', function () { restartDeckTimer(); });",
"",
"      // 鼠标动效：卡片 3D 倾斜 + 照片视差 + 聚光灯（rAF 节流，纯 CSS 变量驱动）",
"      galleryCard = gallery.closest('.apple-card');",
"      var lastMove = null;",
"      var reduceMotion = window.matchMedia &&",
"        window.matchMedia('(prefers-reduced-motion: reduce)').matches;",
"      if (galleryCard && !reduceMotion) {",
"        function applyCardMouse() {",
"          tiltRaf = null;",
"          if (!lastMove) return;",
"          var r = galleryCard.getBoundingClientRect();",
"          var nx = (lastMove.clientX - r.left) / r.width * 2 - 1; // -1 ~ 1",
"          var ny = (lastMove.clientY - r.top) / r.height * 2 - 1;",
"          if (cardMouseOn) {",
"            galleryCard.style.setProperty('--cx', (ny * -2.5).toFixed(2) + 'deg');",
"            galleryCard.style.setProperty('--cy', (nx * 2.5).toFixed(2) + 'deg');",
"            galleryCard.style.setProperty('--mx', ((nx + 1) / 2 * 100).toFixed(1) + '%');",
"            galleryCard.style.setProperty('--my', ((ny + 1) / 2 * 100).toFixed(1) + '%');",
"            loadedImgs.forEach(function (el, i) {",
"              var depth = 6 + (i % 3) * 5; // 每张照片视差深度不同",
"              el.style.setProperty('--px', (nx * depth).toFixed(1) + 'px');",
"              el.style.setProperty('--py', (ny * depth).toFixed(1) + 'px');",
"            });",
"          }",
"",
"          // 单张照片自己的 3D 倾斜（跟随鼠标在照片内的位置）",
"          var t = lastMove.target && lastMove.target.tagName === 'IMG' ? lastMove.target : null;",
"          if (t !== hoverImg) {",
"            if (hoverImg) {",
"              hoverImg.style.setProperty('--ix', '0deg');",
"              hoverImg.style.setProperty('--iy', '0deg');",
"            }",
"            hoverImg = t;",
"          }",
"          if (hoverImg) {",
"            if (imgTiltOn) {",
"              var ir = hoverImg.getBoundingClientRect();",
"              var ix = (lastMove.clientX - ir.left) / ir.width * 2 - 1;",
"              var iy = (lastMove.clientY - ir.top) / ir.height * 2 - 1;",
"              hoverImg.style.setProperty('--ix', (iy * -10).toFixed(2) + 'deg');",
"              hoverImg.style.setProperty('--iy', (ix * 10).toFixed(2) + 'deg');",
"            } else {",
"              hoverImg.style.setProperty('--ix', '0deg');",
"              hoverImg.style.setProperty('--iy', '0deg');",
"            }",
"          }",
"        }",
"        galleryCard.addEventListener('mousemove', function (e) {",
"          if (!cardMouseOn && !imgTiltOn) return;",
"          lastMove = e;",
"          if (tiltRaf === null) {",
"            tiltRaf = requestAnimationFrame(applyCardMouse);",
"          }",
"        });",
"        galleryCard.addEventListener('mouseleave', resetCardMouse);",
"      }",
"",
"      function addGalleryImg(img, n) {",
"        // 每张图带一点确定性倾斜/抖动，保留照片随手摆放的感觉",
"        img.style.setProperty('--tilt', (((n * 47) % 17) - 8) + 'deg');",
"        img.style.setProperty('--jx', (((n * 29) % 21) - 10) + 'px');",
"        img.style.setProperty('--jy', (((n * 13) % 15) - 7) + 'px');",
"        loadedImgs.push(img);",
"        gallery.appendChild(img);",
"        layoutGallery();",
"        imgDone();",
"      }",
"",
"      function tryImage(n, extIndex) {",
"        if (extIndex >= IMAGE_EXT.length) {",
"          imgDone();",
"          return;",
"        }",
"        var img = new Image();",
"        img.alt = 'image ' + n;",
"        img.onload = function () {",
"          addGalleryImg(img, n);",
"        };",
"        img.onerror = function () {",
"          tryImage(n, extIndex + 1);",
"        };",
"        // 图片位于项目根目录 images/ 文件夹",
"        img.src = 'images/' + n + '.' + IMAGE_EXT[extIndex];",
"      }",
"",
"      // 后台图片 + 本地 images/ 合并显示：后台的排前面；",
"      // 编号已在后台里的静态图跳过（如\"1\"已导入），避免前台重复显示",
"      function startGallery(apiImages) {",
"        var apiPart = (apiImages && apiImages.length) ? apiImages : [];",
"        var have = {};",
"        apiPart.forEach(function (m) { have[m.name] = true; });",
"        var staticNums = IMAGES.filter(function (n) { return !have[String(n)]; });",
"        imgPending = apiPart.length + staticNums.length;",
"        apiPart.forEach(function (m, i) {",
"          var img = new Image();",
"          img.alt = m.name;",
"          img.onload = function () {",
"            addGalleryImg(img, i + 1);",
"          };",
"          img.onerror = function () { imgDone(); };",
"          img.src = m.url;",
"        });",
"        staticNums.forEach(function (n) {",
"          tryImage(n, 0);",
"        });",
"      }",
"      function imgDone() {",
"        imgPending--;",
"        if (imgPending === 0 && gallery.children.length === 0) {",
"          galleryEmpty.hidden = false;",
"        }",
"      }",
"      function galleryGated() {",
"        // 相册界面已移除：画廊只看杂项开关（settings 已应用过以实时 flags 为准）",
"        if (FLAGS_OFF.miscView !== undefined) return FLAGS_OFF.miscView;",
"        // 画廊跑得比 settings 早：先看 head 内联脚本同步存的 window.__FF_CACHE，配置到达后经 FF_APPLY_HOOKS 校正补加载",
"        var c = window.__FF_CACHE;",
"        return !!(c && c.misc === false);",
"      }",
"      var galleryStarted = false;",
"      var pendingApiImages = null;",
"      function startGalleryIfAllowed(apiImages) {",
"        pendingApiImages = apiImages || null;",
"        if (galleryStarted || galleryGated()) return;",
"        galleryStarted = true;",
"        startGallery(pendingApiImages);",
"      }",
"      miscAllowHook = function () { startGalleryIfAllowed(pendingApiImages); };",
"      // 加载（fix：移除相册时误删的启动调用，画廊此前完全不出图）",
"      fetch('/api/playlist', { credentials: 'same-origin' })",
"        .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('无后台接口')); })",
"        .then(function (data) {",
"          startGalleryIfAllowed(data && data.ok ? data.images : null);",
"        })",
"        .catch(function () { startGalleryIfAllowed(null); });",
"",
"      miscTeardown = function () {",
"        if (deckTimer) { clearInterval(deckTimer); deckTimer = null; }",
"        window.removeEventListener('resize', layoutGallery);",
"        if (tiltRaf) { cancelAnimationFrame(tiltRaf); tiltRaf = null; }",
"        galleryCard = null;",
"        hoverImg = null;",
"        loadedImgs = [];",
"        miscAllowHook = null;",
"      };",
"    }",
"",
"    function destroyMiscGallery() {",
"      if (miscTeardown) { miscTeardown(); miscTeardown = null; }",
"    }",
"    // 配置到达时转发校正（画廊比 settings 先启动/被开关拦下时补启动）",
"    FF_APPLY_HOOKS.push(function () {",
"      if (miscAllowHook) miscAllowHook();",
"    });",
   ])

# ---------- OP9 首页视频（917-935）→ 首页模块 ----------
op(917, 935,
   'if (homeVideo) {', '}',
   [
"    function startHomeVideo() {",
"      homeVideo = document.getElementById('homeVideo');",
"      if (!homeVideo) return;",
"      homeVideo.addEventListener('ended', function () {",
"        // 单视频循环：还在独占当前视频就重播（currentTime 清零不重新加载）；否则按当前模式切下一个",
"        if (videoMode.mode === 'single' && videoMode.url === videoSrcOf(videoList[videoIndex])) {",
"          homeVideo.currentTime = 0;",
"          var p1 = homeVideo.play();",
"          if (p1 && p1.catch) p1.catch(function () {});",
"          return;",
"        }",
"        if (videoMode.mode === 'random') {",
"          var nxt = Math.floor(Math.random() * videoList.length);",
"          if (videoList.length > 1 && nxt === videoIndex) nxt = (nxt + 1) % videoList.length;",
"          playVideoAt(nxt);",
"          return;",
"        }",
"        playVideoAt(videoIndex + 1); // 播完自动切下一个，到末尾回到第一个",
"      });",
"      autoLoadVideoFolder();",
"    }",
   ])

# ---------- OP10 歌词条重绑（插在 lyricStopIdle 行后） ----------
op(1255, 1255,
   'function lyricStopIdle() {}', 'function lyricStopIdle() {}',
   [
"    function lyricStopIdle() {} // 切歌时调用，保留空实现（待机只有静态一句，无需终止）",
"",
"    // pjax 回到首页时重绑歌词条元素（旧的已随 <main> 换掉）：播放中恢复当前句，从未播放显示待机",
"    function lyricRebind() {",
"      lyricBar = document.getElementById('lyricBar');",
"      lyricText = document.getElementById('lyricText');",
"      if (!lyricBar) return;",
"      if (!audio.src) {",
"        lyricShowPlaceholder('♪ 打开底部播放器，歌词会在这里滚动');",
"        return;",
"      }",
"      lyricBar.hidden = false;",
"      if (!lyricBar.classList.contains('show')) lyricBar.classList.add('show');",
"      lyricFinishTyping();",
"      musicLyricsTick();",
"    }",
   ])

# ---------- OP11a 天气元素声明（4243-4245）----------
op(4243, 4245,
   'var weatherChip = document.getElementById', 'var weatherText = document.getElementById',
   [
"    var weatherChip = null;    // 首页模块：startHomeWeather 按当前 DOM 重查（pjax 换页后重建）",
"    var weatherIcon = null;",
"    var weatherText = null;",
   ])

# ---------- OP11b 天气 chip 绑定挪进模块（4416） ----------
op(4416, 4416,
   'if (weatherChip) weatherChip.addEventListener', None,
   [])

# ---------- OP11c initWeather() 调用（4522）→ startHomeWeather ----------
op(4522, 4522,
   '    initWeather();', None,
   [
"    function startHomeWeather() {",
"      weatherChip = document.getElementById('weatherChip');",
"      weatherIcon = document.getElementById('weatherIcon');",
"      weatherText = document.getElementById('weatherText');",
"      if (!weatherChip) return;",
"      weatherChip.addEventListener('click', openWeatherPicker);",
"      initWeather();",
"    }",
   ])

# ---------- OP12a 工具七个 IIFE → 具名函数 ----------
TOOL_RENAMES = [
    (4529, 4608, 'initCalc'),
    (4611, 4716, 'initPomo'),
    (4719, 4806, 'initDays'),
    (4809, 4926, 'initConv'),
    (4929, 5022, 'initText'),
    (5025, 5058, 'initDice'),
    (5061, None, 'initPwdGen'),  # 结束行由 OP12c 处理（同线改写为函数收尾 + 工具页入口）
]
for a, b, name in TOOL_RENAMES:
    op(a, a, '(function %s() {' % name, None,
       ['    function %s() {' % name])
    if b:
        op(b, b, '})();', None, ['    }'])

# ---------- OP12b 番茄钟停表钩子 + 工具页入口 + 锚点定位 ----------
op(4714, 4715,
   'renderNote();', 'render();',
   [
"      renderNote();",
"      render();",
"      pomoStopHook = stop; // 交给页面模块：pjax 离开工具页时停表",
   ])
op(4610, 4610,
   '// ---- 番茄钟（原倒计时升级：25/5/15 循环 + 今日完成数，响铃沿用） ----', None,
   [
"    var pomoStopHook = null;",
"    // ---- 番茄钟（原倒计时升级：25/5/15 循环 + 今日完成数，响铃沿用） ----",
   ])
op(5098, 5098,
   '})();', None,
   [
"    }",
"",
"    function initToolsPage() {",
"      initCalc();",
"      initPomo();",
"      initDays();",
"      initConv();",
"      initText();",
"      initDice();",
"      initPwdGen();",
"    }",
"",
"    // 从 URL 锚点定位工具卡（/tools/#toolCalc；全站搜索跨页跳转同用此入口）",
"    function locateToolCard(id) {",
"      if (id === 'toolPwd') {",
"        var fold = document.querySelector('.tool-more');",
"        if (fold) fold.open = true;",
"      }",
"      var el = document.getElementById(id);",
"      if (!el) return;",
"      el.scrollIntoView({ block: 'center', behavior: 'smooth' });",
"      el.classList.add('cmdk-flash');",
"      setTimeout(function () { el.classList.remove('cmdk-flash'); }, 1600);",
"    }",
   ])

# ---------- OP13 文档卡列表（5267）→ 文档页模块 ----------
op(5267, 5267,
   'if (docsGrid) {', None,
   [
"    function initDocsPage() {",
"      docsGrid = document.getElementById('docsGrid');",
"      docsEmpty = document.getElementById('docsEmpty');",
"      if (!docsGrid) return;",
   ])
op(5104, 5105,
   'var docsGrid = document.getElementById', 'var docsEmpty = document.getElementById',
   [
"    var docsGrid = null;    // 文档页模块：initDocsPage 按当前 DOM 重查",
"    var docsEmpty = null;",
   ])

# ---------- OP14a AI 元素声明（5312-5316） ----------
op(5312, 5316,
   "var aiView = document.getElementById", "var aiMessages = document.getElementById",
   [
"    var aiView = null;       // AI 页模块：initAiPage 按当前 DOM 重查（pjax 换页后重建）",
"    var aiBtn = document.getElementById('aiBtn'); // 顶栏入口（外壳，常驻）",
"    var aiForm = null;",
"    var aiInput = null;",
"    var aiMessages = null;",
   ])

# ---------- OP14b AI 启动/绑定（5864-5922）→ initAiPage（绑定向） ----------
op(5864, 5922,
   "if (aiBtn) aiBtn.addEventListener('click', openAiView);", '});',
   [
"    // —— AI 页模块（/ai/ 为独立页面）：进入重建绑定，离开断流 + 摘 document 监听 ——",
"    var aiDocCleanup = null;",
"    function initAiPage() {",
"      aiView = document.getElementById('aiView');",
"      aiForm = document.getElementById('aiForm');",
"      aiInput = document.getElementById('aiInput');",
"      aiMessages = document.getElementById('aiMessages');",
"      if (!aiView) return;",
"      // 每次进入都刷新一次配置（后台开关/改配置即时生效），再补开场白",
"      fetchAiConfig(true).then(aiGreetIfEmpty);",
"      if (!aiRestored && !aiHistory.length) {",
"        aiRestored = true;",
"        aiLoadConvList();",
"        aiRestoreHistory();",
"      } else if (aiHistory.length) {",
"        // pjax 回来：用内存历史重建消息视图",
"        aiMessages.innerHTML = '';",
"        aiHistory.forEach(function (m) {",
"          if (m.role === 'user') addAiMsg('user', m.content);",
"          else aiRenderBot(addAiMsg('bot', ''), m.content);",
"        });",
"      } else {",
"        aiGreetIfEmpty();",
"      }",
"      var aiNewChatBtn = document.getElementById('aiNewChatBtn');",
"      if (aiNewChatBtn) {",
"        aiNewChatBtn.addEventListener('click', function () {",
"          aiResetChat();",
"          // 无论之前有没有聊天记录，都给出可见反馈（否则只有欢迎语时点击像\"没反应\"）",
"          addAiMsg('bot', '🆕 已开启新对话，有什么想问的～');",
"          aiCloseHistoryDrawer(); // 抽屉开着时同步收起",
"          if (aiInput) aiInput.focus();",
"        });",
"      }",
"      // 抽屉内\"新对话\"：同款行为 + 关抽屉",
"      var aiHistNewBtn = document.getElementById('aiHistNewBtn');",
"      if (aiHistNewBtn) {",
"        aiHistNewBtn.addEventListener('click', function () {",
"          aiResetChat();",
"          aiGreetIfEmpty();",
"          addAiMsg('bot', '🆕 已开启新对话，有什么想问的～');",
"          aiCloseHistoryDrawer();",
"          if (aiInput) aiInput.focus();",
"        });",
"      }",
"      // 历史抽屉：顶栏气泡按钮开合；点遮罩/聊天区关闭",
"      var aiHistoryToggle = document.getElementById('aiHistoryToggle');",
"      if (aiHistoryToggle) {",
"        aiHistoryToggle.setAttribute('aria-expanded', 'false');",
"        aiHistoryToggle.addEventListener('click', function () {",
"          if (aiDrawerOpen()) aiCloseHistoryDrawer();",
"          else aiOpenHistoryDrawer();",
"        });",
"      }",
"      var aiHistoryScrim = document.getElementById('aiHistoryScrim');",
"      if (aiHistoryScrim) aiHistoryScrim.addEventListener('click', aiCloseHistoryDrawer);",
"      var aiChatEl = aiView.querySelector('.ai-chat');",
"      if (aiChatEl) {",
"        aiChatEl.addEventListener('click', function () { aiCloseHistoryDrawer(); });",
"      }",
"      // 顶栏切换模型：只影响之后的回复，当前对话历史延续（菜单逻辑见 aiSyncModelSwitcher）",
"      var aiModelBtn = document.getElementById('aiModelBtn');",
"      var aiModelMenu = document.getElementById('aiModelMenu');",
"      if (aiModelBtn && aiModelMenu) {",
"        aiModelBtn.addEventListener('click', function (e) {",
"          e.stopPropagation();",
"          aiModelMenu.hidden = !aiModelMenu.hidden;",
"        });",
"      }",
"      // document 级监听登记起来，离开页面时移除（防 pjax 反复进出叠加监听）",
"      var onDocClick = function (e) {",
"        if (aiModelMenu && !aiModelMenu.hidden && !e.target.closest('#aiModelSwitch')) aiModelMenu.hidden = true;",
"      };",
"      // Esc：先收模型菜单，再收历史抽屉（退出页面交给浏览器返回键，不再有\"关界面\"动作）",
"      var onDocKey = function (e) {",
"        if (e.key !== 'Escape') return;",
"        if (aiModelMenu && !aiModelMenu.hidden) { aiModelMenu.hidden = true; return; }",
"        if (aiDrawerOpen()) aiCloseHistoryDrawer();",
"      };",
"      document.addEventListener('click', onDocClick);",
"      document.addEventListener('keydown', onDocKey);",
"      aiDocCleanup = function () {",
"        document.removeEventListener('click', onDocClick);",
"        document.removeEventListener('keydown', onDocKey);",
"      };",
"      aiBindPageControls();",
"    }",
"",
"    function destroyAiPage() {",
"      if (aiDocCleanup) { aiDocCleanup(); aiDocCleanup = null; }",
"      if (aiAbort) { try { aiAbort.abort(); } catch (e) {} aiAbort = null; }",
"    }",
   ])

# ---------- OP14c AI 附件/发送绑定（5997-6053）→ aiBindPageControls ----------
op(5997, 6053,
   "var aiFileBtn = document.getElementById('aiFileBtn');", '}',
   [
"    function aiBindPageControls() {",
"      // ---------- 附件：＋上传文件（图片→视觉模型 base64；文本文件→上下文注入，不存服务器） ----------",
"      var aiFileBtn = document.getElementById('aiFileBtn');",
"      var aiFileInput = document.getElementById('aiFileInput');",
"      if (aiFileBtn && aiFileInput) {",
"        aiFileBtn.addEventListener('click', function () { aiFileInput.click(); });",
"        aiFileInput.addEventListener('change', function () {",
"          aiAddFiles(this.files);",
"          this.value = '';",
"        });",
"      }",
"",
"      if (aiForm) {",
"        aiForm.addEventListener('submit', function (e) {",
"          e.preventDefault();",
"          var text = aiInput ? aiInput.value.trim() : '';",
"          if ((!text && !aiAttach.length) || aiBusy) return;",
"          if (!isMember()) {",
"            addAiMsg('bot', '要和我聊天，请先登录或注册一个账号哦～（右上角头像进入登录）');",
"            openGate();",
"            return;",
"          }",
"          aiBusy = true;",
"          var sendBtn = document.getElementById('aiSendBtn');",
"          if (sendBtn) sendBtn.disabled = true;",
"          fetchAiConfig(false).then(function (cfg) {",
"            if (!cfg.enabled) {",
"              addAiMsg('bot', 'AI 对话还没有配置好，请等站长在后台接入～');",
"              aiStopBusy();",
"              return;",
"            }",
"            // 组装消息：文本附件注入上下文；有图片时升级为多模态 parts（发给视觉模型）",
"            var content = text;",
"            var attachNote = '';",
"            aiAttach.forEach(function (f) {",
"              if (f.kind === 'text') {",
"                content += (content ? '\\n\\n' : '') + '【附件 ' + f.name + '】\\n' + f.data;",
"                attachNote += ' 📄' + f.name;",
"              }",
"            });",
"            var images = aiAttach.filter(function (f) { return f.kind === 'image'; });",
"            if (images.length) {",
"              var parts = [{ type: 'text', text: content || '请看这些图片' }];",
"              images.forEach(function (f) {",
"                parts.push({ type: 'image_url', image_url: { url: f.data } });",
"                attachNote += ' 🖼' + f.name;",
"              });",
"              content = parts;",
"            }",
"            addAiMsg('user', text + attachNote);",
"            aiHistory.push({ role: 'user', content: content });",
"            aiAttach = [];",
"            aiRenderAttach();",
"            if (aiInput) aiInput.value = '';",
"            var pending = addAiMsg('bot', '思考中…', true);",
"            streamAiReply(aiHistory, pending);",
"          });",
"        });",
"      }",
"    }",
   ])

# ---------- OP15a 工具/文档/杂项视图与接线（6055-6154）→ 删 ----------
op(6055, 6154,
   None, 'fsRegister(\'miscView\'',
   [])

# ---------- OP15b 留言板元素声明（6157-6167） ----------
op(6157, 6167,
   'var boardBtn = document.getElementById', 'var boardOffset = 0;',
   [
"    var boardList = null;   // 留言板页模块：initBoardPage 按当前 DOM 重查",
"    var boardInput = null;",
"    var boardCount = null;",
"    var boardHint = null;",
"    var boardPost = null;",
"    var boardEmpty = null;",
"    var boardMore = null;",
"    var boardMe = { loggedIn: false, admin: false }; // 进入页面时经 /api/user/me 判定",
"    var boardOffset = 0;",
   ])

# ---------- OP15c open/closeBoardView（6169-6185）→ 删 ----------
op(6169, 6185,
   'function openBoardView() {', '}',
   [])

# ---------- OP15d 留言板绑定（6290-6329）→ initBoardPage ----------
op(6290, 6329,
   'if (boardInput) {', 'fsRegister(\'boardView\'',
   [
"    function initBoardPage() {",
"      boardList = document.getElementById('boardList');",
"      boardInput = document.getElementById('boardInput');",
"      boardCount = document.getElementById('boardCount');",
"      boardHint = document.getElementById('boardHint');",
"      boardPost = document.getElementById('boardPost');",
"      boardEmpty = document.getElementById('boardEmpty');",
"      boardMore = document.getElementById('boardMore');",
"      if (!boardList || !boardInput) return;",
"      boardInput.addEventListener('input', function () {",
"        boardCount.textContent = boardInput.value.length + ' / 500';",
"      });",
"      if (boardPost) {",
"        boardPost.addEventListener('click', function () {",
"          var content = boardInput.value.trim();",
"          if (!content) { boardHint.textContent = '说点什么再发布吧'; return; }",
"          if (!boardMe.loggedIn) { openGate(); return; }",
"          boardPost.disabled = true;",
"          boardPost.textContent = '发布中…';",
"          fetch('/api/messages', {",
"            method: 'POST',",
"            credentials: 'same-origin',",
"            headers: { 'Content-Type': 'application/json' },",
"            body: JSON.stringify({ content: content })",
"          }).then(function (r) { return r.json().catch(function () { return { ok: false, error: '响应异常' }; }); })",
"            .then(function (d) {",
"              boardPost.disabled = false;",
"              boardPost.textContent = '发布留言';",
"              if (d.ok) {",
"                boardInput.value = '';",
"                boardCount.textContent = '0 / 500';",
"                boardOffset = 0;",
"                boardLoad();",
"                boardHint.textContent = '留言已发布';",
"                setTimeout(function () { boardRefreshIdentity(); }, 2500);",
"              } else {",
"                boardHint.textContent = d.error || '发布失败';",
"              }",
"            })",
"            .catch(function () { boardPost.disabled = false; boardPost.textContent = '发布留言'; boardHint.textContent = '网络错误'; });",
"        });",
"      }",
"      if (boardMore) boardMore.addEventListener('click', boardLoad);",
"      boardOffset = 0;",
"      boardRefreshIdentity();",
"      boardLoad();",
"    }",
   ])

# ---------- OP15e 视图 Esc（6331-6339）→ 删 ----------
op(6331, 6339,
   "document.addEventListener('keydown', function (e) {", '});',
   [])

# ---------- OP16a openProfileView（4070-4081） ----------
op(4070, 4073,
   'function openProfileView() {', 'setProfileOpen(false);',
   [
"    function openProfileView() {",
"      if (!profileView || !isMember()) return;",
"      closeDocViewer(); // 与阅读层互斥（原由全屏管理器互斥代办）",
"      setProfileOpen(false);",
   ])
# ---------- OP16b fsRegister + Esc 灯箱条件（4091、4092-4095） ----------
op(4091, 4095,
   "fsRegister('profileView'", '}',
   [
"    document.addEventListener('keydown', function (e) {",
"      // 个人主页 Esc 关闭（修：原条件里的 lightbox 自移除相册起就是 null，在这里解引用会让 Esc 静默报错）",
"      if (e.key === 'Escape' && profileView && !profileView.hidden) closeProfileView();",
"    });",
   ])

# ---------- OP17 docViewer fsRegister + Esc（5261-5265） ----------
op(5261, 5265,
   '// docViewer 叠在 docsView 上', '}',
   [
"    document.addEventListener('keydown', function (e) {",
"      // 文档阅读层 Esc 关闭（修：原条件里的 lightbox 自移除相册起就是 null，在这里解引用会让 Esc 静默报错）",
"      if (e.key === 'Escape' && docViewer && !docViewer.hidden) closeDocViewer();",
"    });",
   ])

# ---------- OP18 cmdk 动作改真实导航 ----------
op(6413, 6418,
   "push('界面', '界面', '首页'", "fsNavigate('boardView'); });",
   [
"        push('界面', '界面', '首页', function () { pjaxGo('/'); });",
"        if (!FLAGS_OFF.toolsView) push('界面', '界面', '工具', function () { pjaxGo('/tools/'); });",
"        if (!FLAGS_OFF.docsView) push('界面', '界面', '文档', function () { pjaxGo('/docs/'); });",
"        if (aiOn()) push('界面', '界面', 'AI 助手', function () { pjaxGo('/ai/'); });",
"        if (!FLAGS_OFF.miscView) push('界面', '界面', '杂项', function () { pjaxGo('/misc/'); });",
"        push('界面', '界面', '留言板', function () { pjaxGo('/board/'); });",
   ])
# 工具卡：pjax 到 /tools/#卡片id（同页锚点定位 / 跨页换页后由 onHash 定位）
op(6431, 6442,
   "push('工具', t.label, t.label, function () {", '});',
   [
"            push('工具', t.label, t.label, function () { pjaxGo('/tools/#' + t.id); });",
   ])
# 文档：阅读层是全站外壳浮层，原地打开
op(6450, 6452,
   "fsNavigate('docsView');", 'openDoc(title, d.file); }, 400);',
   [
"              openDoc(title, d.file); // 阅读层是全站外壳浮层，任何页面原地打开",
   ])
op(6465, 6465,
   "location.hash = '#home'; }, { sub: '回首页播放' });", None,
   [
"            push('视频', '视频', stripExt(v.name), function () { pjaxGo('/'); }, { sub: '回首页播放' });",
   ])

# ---------- OP19 深链接启动（6617-6628）→ PAGE_MODULES + pjax 路由 + 启动分发 ----------
op(6617, 6628,
   '// 深链接：以 /tools（真实路径', '})();',
   ['@@PJAX@@'])

# ---------- 应用 ----------
OPS.sort(key=lambda o: o[0], reverse=True)
for a, b, ea, eb, rep in OPS:
    sa, sb = A(a), A(b)
    if ea and ea not in sa:
        sys.exit('OP 断言失败 @%d 起始：%r 不含 %r' % (a, sa[:90], ea))
    if eb and eb not in sb:
        sys.exit('OP 断言失败 @%d 结束：%r 不含 %r' % (b, sb[:90], eb))
    lines[a-1:b] = rep

text = '\n'.join(lines)
PJAX = r'''    // =========================
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
    runPageHook(currentPage, 'init');'''

assert '@@PJAX@@' in text
text = text.replace('@@PJAX@@', PJAX)

with io.open(PATH, 'w', encoding='utf-8', newline='') as f:
    f.write(text)
print('surgery done, lines:', text.count('\n') + 1)
