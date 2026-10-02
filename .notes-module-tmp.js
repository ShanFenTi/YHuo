    var notesFeed = null;   // 随笔页模块：initNotesPage 按当前 DOM 重查
    var notesEmpty = null;
    // 两态交互（2026-10-02，参考博客站同款）：列表=摘要卡（不再全文铺开），点击切详情态；
    // 详情 URL 为 /notes/#note-<id>（可分享/可后退，走既有 onHash 通道——popstate 同页 hash 分支
    // 与 pjax 落地都会调 notesHandleHash）；旧锚点 /notes/#日期 语义升级为「打开该日期第一篇详情」
    var notesDetailEl = null;      // 详情容器（notes/index.html main 内，免八页外壳同步）
    var notesCacheList = [];       // 本轮渲染排序后的清单（hash ↔ note 查找用）
    var noteOpenKey = null;        // 当前详情的键（'id:12' / 'date:2026-09-07'；null=列表态）

    // 随笔页竞态守卫（2026-10-01）：notesFeed 是模块级变量，pjax 离页再回页后 initNotesPage 重跑、
    // 它被重新指向新 DOM；旧页在途的 fetch 落定时照常 append 进新容器（不清空），慢网下快速往返
    // 随笔翻倍、article id 全重复（文档页 docsGrid 同病同修，见 initDocsPage）。
    // 按进页时锁定的容器引用判 isConnected，脱离文档即放弃；守卫通过时它与模块级 notesFeed 必然相等，
    // notesShow/renderNotes 照旧用模块级引用不动。
    function initNotesPage() {
      notesFeed = document.getElementById('notesFeed');
      notesEmpty = document.getElementById('notesEmpty');
      notesDetailEl = document.getElementById('notesDetail');
      noteOpenKey = null; // pjax 回页 main 已重建为列表态，模块状态归零
      if (!notesFeed) return;
      var feed = notesFeed; // 锁定本轮页面实例
      fetch('/api/notes', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)); })
        .then(function (d) {
          if (!feed.isConnected) return; // fetch 期间 pjax 切走了：放弃，防双渲染
          var list = (d && d.ok && Array.isArray(d.list)) ? d.list : null;
          if (list && list.length) { notesShow(list); return; }
          fetchStaticNotes(feed); // 空库（后台还没录数据）→ 静态清单
        })
        .catch(function () {
          if (!feed.isConnected) return; // 竞态守卫：容器已被换走就不再转静态回落
          fetchStaticNotes(feed); // 接口失败（离线/异常响应）→ 静态清单
        });
    }

    function fetchStaticNotes(feed) {
      if (!feed || !feed.isConnected) return;
      fetch('/notes/notes.json', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)); })
        .then(function (list) {
          if (!feed.isConnected) return; // 同上，pjax 竞态守卫
          notesShow(list);
        })
        .catch(function () {
          if (!feed.isConnected) return; // 写错误文案前确认容器还挂在本页实例上
          hidePageSkel('notesSkel'); // 两路全失败也是终态：骨架让位给错误提示
          if (notesEmpty) {
            notesEmpty.textContent = '随笔清单加载失败。';
            notesEmpty.hidden = false;
          }
        });
    }

    function notesShow(list) {
      hidePageSkel('notesSkel'); // 内容出口统一撤骨架（接口成功与静态回落都走这里）
      if (!Array.isArray(list) || !list.length) {
        if (notesEmpty) notesEmpty.hidden = false;
        return;
      }
      renderNotes(list);
      // 直达 /notes/#note-12 或旧锚点 /notes/#日期：内容渲染完再处理（原生锚点会扑空）
      if (location.hash) notesHandleHash(location.hash);
    }

    // 卡片标题：后台标题优先，没填回落正文剥 md 截 24 字，再回落日期（与后台列表同口径）
    function noteCardTitle(n) {
      return String(n.title || '').trim() || noteStripMd(n.text).slice(0, 24) || String(n.date);
    }
    // 摘要：后台 summary 优先，没填剥 md 截约 110 字
    function noteExcerpt(n) {
      var s = String(n.summary || '').trim();
      if (!s) {
        s = noteStripMd(n.text);
        if (s.length > 110) s = s.slice(0, 110) + '…';
      }
      return s;
    }
    // 阅读时长：正文字符数 / 400 向上取整（纯前端估算，够个人站用）
    function noteReadMinutes(n) {
      var m = Math.ceil(noteStripMd(n.text).length / 400);
      return m < 1 ? '不足 1' : String(m);
    }
    function noteKey(n) { return n.id ? 'id:' + n.id : 'date:' + n.date; }
    function noteHash(n) { return n.id ? '#note-' + n.id : '#' + n.date; }
    function noteTagList(n) {
      return String(n.tags || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    function renderNotes(list) {
      // 日期倒序 + 年份分组；清单顺序随意，这里统一排；同日多条时卡片 DOM id 顺延 -2/-3 防重复
      var items = list.filter(function (n) { return n && n.date && n.text; })
        .sort(function (a, b) { return String(a.date) < String(b.date) ? 1 : (String(a.date) > String(b.date) ? -1 : 0); });
      notesCacheList = items; // notesHandleHash 按 id/日期回查
      if (!items.length) { if (notesEmpty) notesEmpty.hidden = false; return; }
      var usedId = {};
      var curYear = '';
      var frag = document.createDocumentFragment();
      items.forEach(function (n) {
        var year = String(n.date).slice(0, 4);
        if (year !== curYear) {
          curYear = year;
          var yh = document.createElement('h2');
          yh.className = 'notes-year';
          yh.textContent = year;
          frag.appendChild(yh);
        }
        var id = String(n.date), k = 2;
        while (usedId[id]) { id = n.date + '-' + k; k++; }
        usedId[id] = true;
        // 摘要卡：整卡可点进详情（正文全文只在详情态渲染）
        var art = document.createElement('article');
        art.className = 'note note-card';
        art.id = id;
        art.tabIndex = 0;
        art.setAttribute('role', 'button');
        art.setAttribute('aria-label', '阅读全文：' + noteCardTitle(n));
        var open = function () { openNoteDetail(n, { push: true }); };
        art.addEventListener('click', open);
        art.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
        var ttl = document.createElement('h3');
        ttl.className = 'note-title';
        ttl.textContent = noteCardTitle(n);
        art.appendChild(ttl);
        var meta = document.createElement('div');
        meta.className = 'note-meta';
        var time = document.createElement('time');
        var dm = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(n.date));
        if (dm) {
          time.dateTime = n.date;
          time.textContent = dm[1] + ' 年 ' + parseInt(dm[2], 10) + ' 月 ' + parseInt(dm[3], 10) + ' 日';
        } else {
          time.textContent = n.date;
        }
        meta.appendChild(time);
        if (n.mood) {
          var mood = document.createElement('span');
          mood.className = 'note-mood';
          mood.textContent = n.mood;
          meta.appendChild(mood);
        }
        noteTagList(n).forEach(function (t) {
          var tag = document.createElement('span');
          tag.className = 'note-tag';
          tag.textContent = '#' + t;
          meta.appendChild(tag);
        });
        art.appendChild(meta);
        var ex = document.createElement('p');
        ex.className = 'note-excerpt';
        ex.textContent = noteExcerpt(n);
        art.appendChild(ex);
        frag.appendChild(art);
      });
      notesFeed.appendChild(frag);
      // 阅读计数不再随列表渲染批量上报（2026-10-02 两态改版）：改为打开详情时对该篇计一次，
      // 「阅读数」从此等于真实打开次数（noteReportView 在 openNoteDetail 内）
    }

    // ---------- 详情态：同页切换（列表隐藏/详情显示），#note-<id> 可分享可后退 ----------
    function openNoteDetail(n, opts) {
      opts = opts || {};
      if (!notesDetailEl || !n || !n.text) return;
      var key = noteKey(n);
      if (noteOpenKey === key && !notesDetailEl.hidden) return; // 幂等（popstate 重复触发等）
      noteOpenKey = key;
      notesDetailEl.innerHTML = '';
      // 头部行：返回列表 + 元信息（完整日期 · 阅读 N · 约 X 分钟）
      var bar = document.createElement('div');
      bar.className = 'note-detail-bar';
      var back = document.createElement('button');
      back.type = 'button';
      back.className = 'note-detail-back';
      back.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg><span>返回列表</span>';
      back.addEventListener('click', function () { closeNoteDetail({ push: true }); });
      bar.appendChild(back);
      notesDetailEl.appendChild(bar);
      var dm = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(n.date));
      var metaText = dm
        ? dm[1] + ' 年 ' + parseInt(dm[2], 10) + ' 月 ' + parseInt(dm[3], 10) + ' 日'
        : String(n.date);
      metaText += ' · 阅读 ' + (n.views || 0) + ' · 约 ' + noteReadMinutes(n) + ' 分钟';
      if (n.mood) metaText += ' · ' + n.mood;
      var meta = document.createElement('p');
      meta.className = 'note-detail-meta';
      meta.textContent = metaText;
      notesDetailEl.appendChild(meta);
      var ttl = document.createElement('h1');
      ttl.className = 'note-detail-title';
      ttl.textContent = noteCardTitle(n);
      notesDetailEl.appendChild(ttl);
      var tags = noteTagList(n);
      if (tags.length) {
        var tagsEl = document.createElement('div');
        tagsEl.className = 'note-tags';
        tags.forEach(function (t) {
          var tag = document.createElement('span');
          tag.className = 'note-tag';
          tag.textContent = '#' + t;
          tagsEl.appendChild(tag);
        });
        notesDetailEl.appendChild(tagsEl);
      }
      var body = document.createElement('div');
      body.className = 'note-body note-detail-body';
      body.innerHTML = mdToHtml(String(n.text)); // mdToHtml 先整体转义再解析，防注入
      notesDetailEl.appendChild(body);
      // 尾部动作：生成分享图 / 复制链接（分享卡从列表卡挪进详情尾；坑 29：预览 iframe 不渲染）
      if (!noteInPreviewFrame()) {
        var foot = document.createElement('div');
        foot.className = 'note-foot';
        var shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'note-share-btn';
        shareBtn.setAttribute('aria-label', '生成这张随笔的分享图');
        shareBtn.innerHTML = // 下载箭头图标，与 AI 历史对话「导出」同款
          '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>' +
          '<span>生成分享图</span>';
        shareBtn.addEventListener('click', function () { noteShareDownload(n, shareBtn); });
        foot.appendChild(shareBtn);
        var copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'note-share-btn';
        copyBtn.setAttribute('aria-label', '复制这篇随笔的链接');
        copyBtn.textContent = '复制链接';
        copyBtn.addEventListener('click', function () {
          var done = function () {
            copyBtn.textContent = '已复制';
            setTimeout(function () { copyBtn.textContent = '复制链接'; }, 1400);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(location.href).then(done, function () {});
          } else {
            var ta = document.createElement('textarea');
            ta.value = location.href;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); } catch (e) {}
            ta.remove();
          }
        });
        foot.appendChild(copyBtn);
        notesDetailEl.appendChild(foot);
      }
      notesFeed.hidden = true;
      notesDetailEl.hidden = false;
      window.scrollTo({ top: 0, behavior: 'instant' }); // 详情从顶部开始读（压过全局 smooth）
      if (opts.push) history.pushState(null, '', noteHash(n));
      // 阅读计数（2026-10-02 语义升级）：打开详情才算一次阅读（sessionStorage 去重；静态清单无 id 不上报）
      if (n.id) noteReportView(n.id);
    }

    function closeNoteDetail(opts) {
      opts = opts || {};
      if (!notesDetailEl || notesDetailEl.hidden) return;
      noteOpenKey = null;
      notesDetailEl.hidden = true;
      notesDetailEl.innerHTML = '';
      notesFeed.hidden = false;
      if (opts.push) history.pushState(null, '', location.pathname + location.search); // 回列表态 URL
    }

    function noteReportView(id) {
      var seenKey = 'yhuoNoteSeen';
      var seen = {};
      try { seen = JSON.parse(sessionStorage.getItem(seenKey) || '{}') || {}; } catch (e) { seen = {}; }
      if (seen[id]) return;
      seen[id] = 1;
      try { sessionStorage.setItem(seenKey, JSON.stringify(seen)); } catch (e2) {}
      fetch('/api/notes/view', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id }),
        keepalive: true,
      }).catch(function () {});
    }

    // hash 统一入口（PAGE_MODULES.notes.onHash）：popstate 同页 hash / pjax 落地 / 冷加载全到这
    function notesHandleHash(h) {
      h = String(h || '');
      if (!h) { closeNoteDetail(); return; } // 后退到无 hash：回列表态
      var dec;
      try { dec = decodeURIComponent(h); } catch (e) { dec = h; }
      var m = /^#note-(\d+)$/i.exec(dec);
      if (m) {
        var byId = null;
        notesCacheList.forEach(function (n) { if (n.id && String(n.id) === m[1]) byId = n; });
        if (byId) openNoteDetail(byId); // 不 push：popstate 已在目标态
        else closeNoteDetail(); // 清单里没有这篇（如静态清单回落）：回列表态
        return;
      }
      // 旧锚点 #日期（全站搜索随笔组/首页最新随笔卡的既有链接）：打开该日期第一篇详情
      var date = dec.slice(1);
      var hit = null;
      notesCacheList.forEach(function (n) { if (!hit && String(n.date) === date) hit = n; });
      if (hit) { openNoteDetail(hit); return; }
      locateNote(h); // 未知锚点（含同日顺延 #日期-2 形态）：回落旧行为定位高亮卡片
    }

    // 定位单条随笔卡片并高亮（详情态打开失败时的兜底路径）
    function locateNote(h) {
      if (notesDetailEl && !notesDetailEl.hidden) return; // 详情开着时不滚列表
      var el = document.getElementById(String(h || '').slice(1));
      if (!el || !el.classList.contains('note')) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('cmdk-flash');
      setTimeout(function () { el.classList.remove('cmdk-flash'); }, 1600);
    }
