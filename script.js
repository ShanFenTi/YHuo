// 黑白极简 · 个人主页交互
(function () {
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".site-nav a")
  );
  // 只对页内锚点链接做滚动处理，外链（如小工具页面）正常跳转
  var sectionLinks = navLinks.filter(function (a) {
    return a.getAttribute("data-target");
  });
  var sections = sectionLinks
    .map(function (a) {
      return document.getElementById(a.getAttribute("data-target"));
    })
    .filter(Boolean);

  var progressBar = document.getElementById("progressBar");
  var backTopBtn = document.getElementById("backTop");

  // ---------- 滚动：导航高亮 + 阅读进度 + 回顶按钮 ----------
  function onScroll() {
    var pos = window.scrollY + 120; // 考虑固定导航高度
    var current = sections[0];

    sections.forEach(function (sec) {
      if (sec.offsetTop <= pos) current = sec;
    });

    var id = current ? current.id : "";
    navLinks.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-target") === id);
    });

    // 阅读进度条
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    if (progressBar) {
      progressBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    }

    // 回到顶部按钮
    if (backTopBtn) {
      backTopBtn.classList.toggle("show", window.scrollY > 600);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- 导航点击：手动平滑滚动，避免被 sticky 导航遮挡 ----------
  sectionLinks.forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var target = document.getElementById(a.getAttribute("data-target"));
      if (!target) return;
      var top = target.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top: top, behavior: "smooth" });
    });
  });

  // ---------- 回到顶部按钮 ----------
  if (backTopBtn) {
    backTopBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // 页脚回顶链接
  var backLink = document.querySelector(".site-footer a[href='#home']");
  if (backLink) {
    backLink.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ---------- 深色模式切换 ----------
  var themeBtn = document.getElementById("themeToggle");
  var STORAGE_KEY = "theme";

  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    if (themeBtn) themeBtn.textContent = theme === "dark" ? "亮" : "暗";
  }

  if (themeBtn) {
    var saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}
    var prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefersDark ? "dark" : "light"));

    themeBtn.addEventListener("click", function () {
      var next =
        document.body.getAttribute("data-theme") === "dark"
          ? "light"
          : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {}
    });
  }

  // ---------- 左上角日期时间 ----------
  var datetimeEl = document.getElementById("datetime");
  if (datetimeEl) {
    var WEEK = ["日", "一", "二", "三", "四", "五", "六"];
    function pad2(n) {
      return (n < 10 ? "0" : "") + n;
    }
    function updateClock() {
      var d = new Date();
      datetimeEl.textContent =
        d.getFullYear() +
        "." +
        pad2(d.getMonth() + 1) +
        "." +
        pad2(d.getDate()) +
        " 周" +
        WEEK[d.getDay()] +
        " " +
        pad2(d.getHours()) +
        ":" +
        pad2(d.getMinutes()) +
        ":" +
        pad2(d.getSeconds());
    }
    updateClock();
    setInterval(updateClock, 1000);
  }

  // ---------- 打字机动态标题 ----------
  var typeText = document.getElementById("typeText");
  if (typeText) {
    var phrases = ["设计师", "开发者", "创作者", "终身学习者"];
    var wordIndex = 0;
    var charIndex = 0;
    var deleting = false;

    function tick() {
      var word = phrases[wordIndex];

      if (deleting) {
        charIndex--;
      } else {
        charIndex++;
      }

      typeText.textContent = word.slice(0, charIndex);

      var delay = deleting ? 45 : 110;

      if (!deleting && charIndex === word.length) {
        delay = 1600; // 打完后停留
        deleting = true;
      } else if (deleting && charIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % phrases.length;
        delay = 350;
      }

      setTimeout(tick, delay);
    }

    tick();
  }

  // ================= 图片展示 =================
  var gallery = document.getElementById("galleryGrid");
  var galleryEmpty = document.getElementById("galleryEmpty");
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");

  if (gallery) {
    // 约定：图片命名为 1、2、3… 放入 images 文件夹，自动尝试多种格式
    var IMAGES = [1, 2, 3, 4, 5, 6, 7, 8];
    var IMAGE_EXT = [
      "jpg", "jpeg", "png", "gif",
      "webp", "svg", "bmp", "avif",
    ];
    var imgPending = IMAGES.length;

    // 依次尝试各扩展名，命中第一个能加载的即显示
    function tryImage(n, extIndex) {
      if (extIndex >= IMAGE_EXT.length) {
        imgDone();
        return;
      }
      var img = new Image();
      img.alt = "image " + n;
      img.onload = function () {
        img.addEventListener("click", function () {
          lightboxImg.src = img.src;
          lightbox.hidden = false;
        });
        gallery.appendChild(img);
        imgDone();
      };
      img.onerror = function () {
        tryImage(n, extIndex + 1);
      };
      img.src = "images/" + n + "." + IMAGE_EXT[extIndex];
    }

    IMAGES.forEach(function (n) {
      tryImage(n, 0);
    });

    function imgDone() {
      imgPending--;
      if (imgPending === 0 && gallery.children.length === 0) {
        galleryEmpty.hidden = false;
      }
    }

    lightbox.addEventListener("click", function () {
      lightbox.hidden = true;
    });
  }

  // ================= 音乐播放 =================
  // 页面不刷新，audio 常驻，切到其他板块音乐继续播放
  var audio = new Audio();
  var nowTitle = document.getElementById("nowTitle");
  var timeDisplay = document.getElementById("timeDisplay");
  var progressFill = document.getElementById("progressFill");
  var progressWrap = document.getElementById("progressWrap");
  var trackListEl = document.getElementById("trackList");
  var playBtn = document.getElementById("playBtn");
  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");
  var folderBtn = document.getElementById("folderBtn");
  var folderInput = document.getElementById("folderInput");
  var fileBtn = document.getElementById("fileBtn");
  var fileInput = document.getElementById("fileInput");

  // 按后缀识别音频，不依赖文件名
  var AUDIO_EXT = [
    ".mp3", ".wav", ".m4a", ".flac",
    ".ogg", ".aac", ".opus", ".aiff", ".aif", ".weba",
  ];

  function isAudio(name) {
    var n = name.toLowerCase();
    return AUDIO_EXT.some(function (ext) {
      return n.indexOf(ext) === n.length - ext.length;
    });
  }

  var tracks = []; // {name, src}
  var current = -1;

  function fmt(t) {
    t = Math.max(0, Math.floor(t || 0));
    var m = Math.floor(t / 60);
    var s = t % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function renderTrackList() {
    trackListEl.innerHTML = "";
    if (!tracks.length) {
      var hint = document.createElement("li");
      hint.textContent = "点击「选择音乐文件夹」识别其中的音频，或选择单个音乐文件。";
      trackListEl.appendChild(hint);
      return;
    }
    tracks.forEach(function (t, i) {
      var li = document.createElement("li");
      li.className = i === current ? "active" : "";
      var idx = document.createElement("span");
      idx.className = "track-index";
      idx.textContent = String(i + 1).padStart(2, "0");
      var name = document.createElement("span");
      name.textContent = t.name;
      li.appendChild(idx);
      li.appendChild(name);
      li.addEventListener("click", function () {
        playIndex(i);
      });
      trackListEl.appendChild(li);
    });
  }

  function playIndex(i) {
    if (i < 0 || i >= tracks.length) return;
    current = i;
    audio.src = tracks[i].src;
    audio.play();
    nowTitle.textContent = tracks[i].name;
    renderTrackList();
    saveMeta();
  }

  playBtn.addEventListener("click", function () {
    if (current < 0 && tracks.length) {
      playIndex(0);
      return;
    }
    if (audio.paused) audio.play();
    else audio.pause();
  });

  prevBtn.addEventListener("click", function () {
    if (tracks.length) playIndex((current - 1 + tracks.length) % tracks.length);
  });

  nextBtn.addEventListener("click", function () {
    if (tracks.length) playIndex((current + 1) % tracks.length);
  });

  audio.addEventListener("play", function () {
    playBtn.textContent = "⏸";
    saveMeta();
  });
  audio.addEventListener("pause", function () {
    playBtn.textContent = "▶";
    saveMeta();
  });
  audio.addEventListener("ended", function () {
    if (tracks.length) playIndex((current + 1) % tracks.length);
  });

  var lastMetaSave = 0;
  audio.addEventListener("timeupdate", function () {
    if (audio.duration) {
      progressFill.style.width = (audio.currentTime / audio.duration) * 100 + "%";
      timeDisplay.textContent = fmt(audio.currentTime) + " / " + fmt(audio.duration);
      // 节流保存播放进度（每秒至多一次）
      var now = Date.now();
      if (now - lastMetaSave > 1000) {
        lastMetaSave = now;
        saveMeta();
      }
    }
  });

  // 点击进度条跳转
  progressWrap.addEventListener("click", function (e) {
    if (!audio.duration) return;
    var rect = progressWrap.getBoundingClientRect();
    var ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
  });

  // 选择音乐文件夹：优先用 File System Access API（记住目录，下次打开自动读取），不支持时回退到目录选择
  folderBtn.addEventListener("click", function () {
    if (window.showDirectoryPicker) {
      window
        .showDirectoryPicker({ mode: "read" })
        .then(function (handle) {
          storeDirHandle(handle);
          loadFromDirHandle(handle);
        })
        .catch(function (err) {
          if (err && err.name === "AbortError") return; // 用户取消选择
          folderInput.click(); // 其他情况回退到旧方式
        });
    } else {
      folderInput.click();
    }
  });
  folderInput.addEventListener("change", function () {
    // 临时诊断：输出选择文件夹后浏览器返回的原始文件信息
    var raw = Array.prototype.slice.call(folderInput.files || []);
    console.log("[folder] total:", raw.length);
    console.log(
      "[folder] sample:",
      raw.slice(0, 20).map(function (f) {
        return f.name;
      })
    );

    var files = Array.prototype.slice
      .call(folderInput.files || [])
      .filter(function (f) {
        return isAudio(f.name);
      })
      .sort(function (a, b) {
        return a.name.localeCompare(b.name, "zh-Hans-CN");
      });

    if (!files.length) {
      // 选择成功但没找到音频：把浏览器返回的真实文件信息显示出来，便于定位
      trackListEl.innerHTML = "";
      var hint = document.createElement("li");
      var names = raw
        .slice(0, 8)
        .map(function (f) {
          return f.name;
        })
        .join("、");
      hint.textContent =
        "所选文件夹中没有音频文件。浏览器本次返回 " +
        raw.length +
        " 个文件" +
        (raw.length ? "，例如：" + names : "") +
        "。请确认选中了含 .mp3 的音乐文件夹。";
      trackListEl.appendChild(hint);
      return;
    }

    tracks = files.map(function (f) {
      return { name: f.name, src: URL.createObjectURL(f) };
    });
    // 存入 IndexedDB，供刷新后自动续播使用
    files.forEach(function (f) {
      idbPut(f.name, f);
    });
    renderTrackList();
    saveMeta();
    folderInput.value = "";
  });

  // 选择单个音乐文件
  fileBtn.addEventListener("click", function () {
    fileInput.click();
  });
  fileInput.addEventListener("change", function () {
    var f = fileInput.files[0];
    if (!f) return;
    tracks.push({ name: f.name, src: URL.createObjectURL(f) });
    idbPut(f.name, f);
    renderTrackList();
    playIndex(tracks.length - 1);
    fileInput.value = "";
  });

  // ================= 播放状态持久化（刷新后自动续播） =================
  var DB_NAME = "musicStore";
  var STORE = "files";
  var META_KEY = "musicMeta";
  var _dbPromise = null;

  function idbOpen() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        req.result.createObjectStore(STORE);
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
    return _dbPromise;
  }

  function idbPut(key, blob) {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(blob, key);
        tx.oncomplete = resolve;
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function idbGetAll(keys) {
    return idbOpen().then(function (db) {
      return Promise.all(
        keys.map(function (k) {
          return new Promise(function (resolve) {
            var tx = db.transaction(STORE, "readonly");
            var req = tx.objectStore(STORE).get(k);
            req.onsuccess = function () {
              resolve(req.result);
            };
            req.onerror = function () {
              resolve(null);
            };
          });
        })
      );
    });
  }

  function saveMeta() {
    try {
      localStorage.setItem(
        META_KEY,
        JSON.stringify({
          names: tracks.map(function (t) {
            return t.name;
          }),
          current: current,
          time: audio.currentTime || 0,
          playing: !audio.paused,
        })
      );
    } catch (e) {}
  }

  function restoreSession() {
    var meta = null;
    try {
      meta = JSON.parse(localStorage.getItem(META_KEY));
    } catch (e) {}
    if (!meta || !meta.names || !meta.names.length || meta.current < 0) return;

    idbGetAll(meta.names).then(function (blobs) {
      var valid = blobs.every(function (b) {
        return !!b;
      });
      if (!valid) return;

      tracks = meta.names.map(function (name, i) {
        return { name: name, src: URL.createObjectURL(blobs[i]) };
      });
      renderTrackList();
      current = meta.current;
      nowTitle.textContent = tracks[current].name;
      audio.src = tracks[current].src;

      audio.addEventListener(
        "loadedmetadata",
        function () {
          audio.currentTime = meta.time || 0;
          if (meta.playing) {
            audio.play().catch(function () {
              // 浏览器可能拦截自动播放，进度已恢复，点击播放即可续播
              playBtn.textContent = "▶";
            });
          }
        },
        { once: true }
      );
      if (meta.playing) playBtn.textContent = "⏸";
    });
  }

  restoreSession();

  // ================= 自动读取音乐文件夹（File System Access API） =================
  // 首次选择文件夹后记住句柄，之后打开页面自动读取其中的音频，无需再手动选择
  var DIR_KEY = "musicDirHandle";

  function storeDirHandle(handle) {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(handle, DIR_KEY);
        tx.oncomplete = resolve;
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function getDirHandle() {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE, "readonly");
        var req = tx.objectStore(STORE).get(DIR_KEY);
        req.onsuccess = function () {
          resolve(req.result || null);
        };
        req.onerror = function () {
          resolve(null);
        };
      });
    });
  }

  // 读取目录中所有音频文件（按后缀识别），填充曲目列表
  function loadFromDirHandle(handle) {
    var collected = [];
    var iter = handle.values();

    function next() {
      try {
        var p = iter.next();
        if (p && typeof p.then === "function") {
          p.then(onEntry).catch(function () {
            onEntry({ done: true });
          });
        } else {
          onEntry(p);
        }
      } catch (e) {
        onEntry({ done: true });
      }
    }

    function onEntry(res) {
      if (!res || res.done) {
        finish();
        return;
      }
      var entry = res.value;
      if (entry.kind === "file" && isAudio(entry.name)) {
        entry
          .getFile()
          .then(function (file) {
            collected.push({ name: entry.name, file: file });
            next();
          })
          .catch(function () {
            next();
          });
      } else {
        next();
      }
    }

    function finish() {
      collected.sort(function (a, b) {
        return a.name.localeCompare(b.name, "zh-Hans-CN");
      });
      if (!collected.length) {
        trackListEl.innerHTML = "";
        var hint = document.createElement("li");
        hint.textContent = "所选文件夹中没有音频文件，请确认选中了含 .mp3 等音频的文件夹。";
        trackListEl.appendChild(hint);
        return;
      }
      tracks = collected.map(function (item) {
        return { name: item.name, src: URL.createObjectURL(item.file) };
      });
      collected.forEach(function (item) {
        idbPut(item.name, item.file);
      });
      renderTrackList();
      saveMeta();
    }

    next();
  }

  // 自动读取网页当前路径下的 music 文件夹（依赖服务器目录索引，如 python -m http.server）
  function autoLoadMusicFolder() {
    fetch("music/", { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error("music 目录不可访问");
        return res.text();
      })
      .then(function (html) {
        var names = [];
        var re = /<a href="([^"]+)">/g;
        var m;
        while ((m = re.exec(html))) {
          var href = m[1];
          if (href.indexOf("../") === 0 || href === "/") continue;
          var name = decodeURIComponent(href);
          if (isAudio(name) && names.indexOf(name) === -1) names.push(name);
        }
        if (!names.length) return;
        loadMusicFiles(names);
      })
      .catch(function () {});
  }

  // 逐首读取 music 文件夹中的音频为 blob，存入 IndexedDB，供列表与刷新续播使用
  function loadMusicFiles(names) {
    var pending = names.length;
    tracks = [];
    names.forEach(function (name) {
      fetch("music/" + encodeURIComponent(name))
        .then(function (res) {
          if (!res.ok) throw new Error("读取失败");
          return res.blob();
        })
        .then(function (blob) {
          var file = new File([blob], name, { type: blob.type });
          tracks.push({ name: name, src: URL.createObjectURL(file) });
          idbPut(name, file);
        })
        .catch(function () {})
        .then(function () {
          pending--;
          if (pending === 0) {
            tracks.sort(function (a, b) {
              return a.name.localeCompare(b.name, "zh-Hans-CN");
            });
            if (tracks.length) renderTrackList();
          }
        });
    });
  }

  // 打开页面时自动读取音乐：优先用已记住的文件夹（File System Access API），否则自动读取当前路径的 music 文件夹
  function autoRestoreDir() {
    if (window.showDirectoryPicker) {
      getDirHandle()
        .then(function (handle) {
          if (!handle) return autoLoadMusicFolder();
          return handle
            .queryPermission({ mode: "read" })
            .then(function (perm) {
              if (perm === "granted") loadFromDirHandle(handle);
              else autoLoadMusicFolder();
            });
        })
        .catch(function () {
          autoLoadMusicFolder();
        });
    } else {
      autoLoadMusicFolder();
    }
  }

  var _hasValidMeta = false;
  try {
    var _m = JSON.parse(localStorage.getItem(META_KEY));
    _hasValidMeta = !!(_m && _m.names && _m.names.length && _m.current >= 0);
  } catch (e) {}
  if (!_hasValidMeta) autoRestoreDir();
})();
