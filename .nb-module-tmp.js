  // ---------- 随笔管理（2026-10-02 文章管理改版，设计稿定稿）：工具行搜索 + 文章列表 + 写一篇弹窗 ----------
  // 数据：D1 notes 表，title/tags/summary/draft/views 为本次新增字段（migrate 补列，存量落默认值）；
  // 前台 /notes/ 时间线消费同一份数据（公开接口不下发草稿，阅读计数 /api/notes/view 前台上报）。
  var notesCache = [];
  var noteEditingId = 0;
  var noteSearchQ = '';

  function noteFormMsg(text, err) { showMsg($('noteFormMsg'), text || '', err ? 'err' : ''); }

  // created_at 双口径兼容：新数据=北京时间「YYYY-MM-DD HH:mm」原串直出；
  // 老数据=UTC datetime('now')（带秒），+8 转北京时间显示（坑 37 同源）；异常回落 date
  function fmtNoteTime(n) {
    var s = String(n.created_at || '');
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) {
      var d = new Date(s.replace(' ', 'T') + 'Z');
      if (!isNaN(d)) return new Date(d.getTime() + 8 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
    }
    return n.date;
  }

  // 剥 Markdown 取纯文本（列表摘要用）：代码块/行内码先摘除，再剥图片链接语法与记号
  function noteStripMd(s) {
    var t = String(s || '');
    t = t.replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]*)`/g, '$1');
    t = t.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
    t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
    t = t.replace(/^#{1,6}\s+/gm, '').replace(/^>\s?/gm, '').replace(/^[-*]\s+/gm, '');
    t = t.replace(/\*\*([^*]*)\*\*/g, '$1').replace(/\*([^*]*)\*/g, '$1');
    return t.replace(/\s+/g, ' ').trim();
  }

  function noteResetForm() {
    noteEditingId = 0;
    $('noteModalTitle').textContent = '写一篇随笔';
    $('noteTitle').value = '';
    $('noteTags').value = '';
    $('noteSummary').value = '';
    $('noteText').value = '';
    $('noteDraft').checked = false;
    noteFormMsg('');
    notePolishReset();
    notePreviewReset();
  }

  function openNoteModal(n) {
    noteResetForm();
    if (n) {
      noteEditingId = n.id;
      $('noteModalTitle').textContent = '编辑随笔';
      $('noteTitle').value = n.title || '';
      $('noteTags').value = n.tags || '';
      $('noteSummary').value = n.summary || '';
      $('noteText').value = n.text || '';
      $('noteDraft').checked = !!n.draft;
    }
    $('noteModal').hidden = false;
    $('noteTitle').focus();
  }

  function closeNoteModal() {
    if ($('noteModal').hidden) return;
    $('noteModal').hidden = true;
    noteEditingId = 0;
  }

  function loadNotes() {
    var listEl = $('notesList');
    listEl.innerHTML = skListHtml(4);
    api('/api/admin/notes').then(function (d) {
      if (!d.ok) { listEl.innerHTML = emptyStateHtml(ICO.x, '加载失败', d.error || '请稍后重试。'); $('notesSumm').textContent = ''; return; }
      notesCache = d.list || [];
      renderNotesList();
    }).catch(function () {
      listEl.innerHTML = emptyStateHtml(ICO.x, '加载失败', '网络异常，请稍后重试。');
    });
  }

  function renderNotesList() {
    var listEl = $('notesList');
    listEl.textContent = '';
    var q = noteSearchQ.trim().toLowerCase();
    var show = notesCache.filter(function (n) {
      if (!q) return true;
      return (n.title || '').toLowerCase().indexOf(q) !== -1
        || (n.text || '').toLowerCase().indexOf(q) !== -1
        || (n.tags || '').toLowerCase().indexOf(q) !== -1;
    });
    $('notesSumm').textContent = '当前显示 ' + show.length + ' 篇（总数 ' + notesCache.length + '）';
    var emptyEl = $('notesEmpty');
    if (!show.length) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      if (!notesCache.length) {
        emptyEl.querySelector('.es-title').textContent = '还没有随笔';
        emptyEl.querySelector('.es-hint').textContent = '点左上角「写一篇」发布第一篇；搜索无结果时也会显示这里。';
      } else {
        emptyEl.querySelector('.es-title').textContent = '没有匹配的随笔';
        emptyEl.querySelector('.es-hint').textContent = '换个关键词试试，支持搜索标题、正文与标签。';
      }
      return;
    }
    emptyEl.hidden = true;
    var frag = document.createDocumentFragment();
    show.forEach(function (n) {
      var row = document.createElement('div');
      row.className = 'nb-row';
      // 头行：标题 + 状态徽标 + 行内操作
      var head = document.createElement('div');
      head.className = 'nb-row-head';
      var title = document.createElement('span');
      title.className = 'nb-title';
      title.textContent = n.title || noteStripMd(n.text).slice(0, 24) || n.date;
      head.appendChild(title);
      var badge = document.createElement('span');
      badge.className = 'nb-badge ' + (n.draft ? 'draft' : 'published');
      badge.textContent = n.draft ? '草稿' : '已发布';
      head.appendChild(badge);
      var actions = document.createElement('span');
      actions.className = 'row-actions';
      var editBtn = document.createElement('button');
      editBtn.className = 'mini';
      editBtn.textContent = '编辑';
      editBtn.addEventListener('click', function () { openNoteModal(n); });
      actions.appendChild(editBtn);
      var toggleBtn = document.createElement('button');
      toggleBtn.className = 'mini';
      toggleBtn.textContent = n.draft ? '转为发布' : '转为草稿';
      toggleBtn.addEventListener('click', function () {
        api('/api/admin/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update', id: n.id,
            title: n.title || '', tags: n.tags || '', summary: n.summary || '',
            draft: n.draft ? 0 : 1, text: n.text || ''
          })
        }).then(function (r) {
          if (!r.ok) { toast(r.error || '操作失败', 'err'); return; }
          toast(n.draft ? '已发布' : '已转为草稿');
          loadNotes();
        }).catch(function () { toast('操作失败（网络异常）', 'err'); });
      });
      actions.appendChild(toggleBtn);
      var delBtn = document.createElement('button');
      delBtn.className = 'mini danger';
      delBtn.textContent = '删除';
      delBtn.addEventListener('click', function () {
        ask({
          title: '删除这篇随笔？',
          msg: (n.title || noteStripMd(n.text).slice(0, 30) || n.date) + '，删除后不可恢复。',
          okText: '删除',
          danger: true,
          cb: function (okVal) {
            if (!okVal) return;
            api('/api/admin/notes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'delete', id: n.id })
            }).then(function (r) {
              if (!r.ok) { toast(r.error || '删除失败', 'err'); return; }
              toast('已删除');
              if (noteEditingId === n.id) closeNoteModal();
              loadNotes();
            }).catch(function () { toast('删除失败（网络异常）', 'err'); });
          }
        });
      });
      actions.appendChild(delBtn);
      head.appendChild(actions);
      row.appendChild(head);
      // meta 行：时间 · 阅读 N · #标签
      var tags = String(n.tags || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var meta = document.createElement('div');
      meta.className = 'nb-row-meta';
      var metaText = fmtNoteTime(n) + ' · 阅读 ' + (n.views || 0);
      if (tags.length) metaText += ' · ' + tags.map(function (t) { return '#' + t; }).join(' ');
      meta.textContent = metaText;
      row.appendChild(meta);
      // 摘要行：后台填的摘要优先，没填从正文截取
      var sum = String(n.summary || '').trim();
      if (!sum) {
        sum = noteStripMd(n.text);
        if (sum.length > 120) sum = sum.slice(0, 120) + '…';
      }
      if (sum) {
        var sumEl = document.createElement('div');
        sumEl.className = 'nb-row-sum';
        sumEl.textContent = sum;
        row.appendChild(sumEl);
      }
      frag.appendChild(row);
    });
    listEl.appendChild(frag);
  }

  // ---------- 弹窗：开合与保存 ----------
  $('noteWriteBtn').addEventListener('click', function () { openNoteModal(null); });
  $('noteModalClose').addEventListener('click', closeNoteModal);
  $('noteModalBackdrop').addEventListener('click', closeNoteModal);
  document.addEventListener('keydown', function (e) {
    // Esc 关随笔弹窗；ask 确认框叠在上面时让位（删除确认先关）
    if (e.key !== 'Escape' || $('noteModal').hidden || !$('askModal').hidden) return;
    closeNoteModal();
  });
  $('noteSearch').addEventListener('input', function () {
    noteSearchQ = this.value;
    if (notesCache.length) renderNotesList();
  });
  $('notesRefreshBtn').addEventListener('click', function () { loadNotes(); });

  $('noteSaveBtn').addEventListener('click', function () {
    var payload = {
      action: noteEditingId ? 'update' : 'create',
      id: noteEditingId,
      title: $('noteTitle').value.trim(),
      tags: $('noteTags').value.trim(),
      summary: $('noteSummary').value.trim(),
      draft: $('noteDraft').checked ? 1 : 0,
      text: $('noteText').value.trim()
    };
    if (!payload.text) { noteFormMsg('正文不能为空', true); return; }
    if (payload.text.length > 2000) { noteFormMsg('正文最长 2000 字（当前 ' + payload.text.length + ' 字）', true); return; }
    var wasEdit = !!noteEditingId;
    var btn = this;
    btn.disabled = true;
    api('/api/admin/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      btn.disabled = false;
      if (!r.ok) { noteFormMsg(r.error || '保存失败', true); return; }
      closeNoteModal();
      toast(wasEdit ? '已保存修改' : (payload.draft ? '已存为草稿' : '已发布'));
      loadNotes();
    }).catch(function () {
      btn.disabled = false;
      noteFormMsg('保存失败（网络异常）', true);
    });
  });

  // ---------- 弹窗内预览：后台副本迷你 Markdown 渲染（先转义再解析，防注入；与前台 mdToHtml 同思路精简版） ----------
  function noteSafeUrl(u) {
    var s = String(u || '').trim();
    return /^(https?:\/\/|\/|#|\.\/)/i.test(s) ? s : '';
  }
  function noteMdInline(s) {
    var t = s.replace(/`([^`]*)`/g, function (_, c) { return '<code>' + c + '</code>'; });
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, url) {
      var safe = noteSafeUrl(url);
      return safe ? '<a href="' + safe + '" target="_blank" rel="noopener">' + txt + '</a>' : txt;
    });
    return t;
  }
  function noteMdToHtml(src) {
    var esc = String(src || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var lines = esc.split(/\r?\n/);
    var out = [], inCode = false, inList = false, inQuote = false;
    var closeList = function () { if (inList) { out.push('</ul>'); inList = false; } };
    var closeQuote = function () { if (inQuote) { out.push('</blockquote>'); inQuote = false; } };
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^```/.test(line)) {
        closeList(); closeQuote();
        out.push(inCode ? '</pre></code>' : '<pre><code>');
        inCode = !inCode;
        continue;
      }
      if (inCode) { out.push(line); continue; }
      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        closeList(); closeQuote();
        var lv = h[1].length;
        out.push('<h' + (lv + 1) + '>' + noteMdInline(h[2]) + '</h' + (lv + 1) + '>');
        continue;
      }
      var li = line.match(/^\s*[-*]\s+(.*)$/);
      if (li) {
        closeQuote();
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + noteMdInline(li[1]) + '</li>');
        continue;
      }
      var qt = line.match(/^&gt;\s?(.*)$/);
      if (qt) {
        closeList();
        if (!inQuote) { out.push('<blockquote>'); inQuote = true; }
        out.push('<p>' + noteMdInline(qt[1]) + '</p>');
        continue;
      }
      closeList(); closeQuote();
      if (line.trim()) out.push('<p>' + noteMdInline(line) + '</p>');
    }
    closeList(); closeQuote();
    if (inCode) out.push('</pre></code>');
    return out.join('');
  }
  function notePreviewReset() {
    $('notePreviewBox').hidden = true;
    $('notePreviewBody').innerHTML = '';
  }
  $('notePreviewBtn').addEventListener('click', function () {
    var text = $('noteText').value.trim();
    if (!text) { noteFormMsg('正文是空的，没东西可预览', true); return; }
    notePolishReset();
    $('notePreviewBody').innerHTML = noteMdToHtml(text);
    $('notePreviewBox').hidden = false;
  });
  $('notePreviewClose').addEventListener('click', notePreviewReset);

  // ---------- AI 润色：正文送 /api/admin/ai/complete（非流式、默认模型），结果落预览区，
  // 「应用」才写回 textarea——预览期正文原样不动，防丢稿。失败只报错不影响正文。
  var notePolishText = '';
  function notePolishReset() {
    notePolishText = '';
    $('notePolishBox').hidden = true;
    $('notePolishText').value = '';
    $('notePolishMeta').textContent = '';
  }
  $('notePolishBtn').addEventListener('click', function () {
    var btn = this;
    var text = $('noteText').value.trim();
    if (!text) { noteFormMsg('正文是空的，没东西可润色', true); return; }
    btn.disabled = true;
    noteFormMsg('AI 润色中…（走后台默认模型，通常几秒）');
    notePolishReset();
    notePreviewReset();
    api('/api/admin/ai/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '请把下面这段随笔正文润色一遍：保持原意与第一人称口吻，修正错别字与不通顺的句子，理顺标点；不要添加新观点、不要翻译成英文、不要输出任何解释或前后缀，只输出润色后的正文本身。原文：\n' + text
      })
    }).then(function (r) {
      btn.disabled = false;
      if (!r.ok) { noteFormMsg(r.error || '润色失败', true); return; }
      notePolishText = String(r.reply || '').trim();
      if (!notePolishText) { noteFormMsg('模型返回了空内容', true); return; }
      noteFormMsg('');
      $('notePolishText').value = notePolishText;
      $('notePolishMeta').textContent = (r.name || '') + ' · ' + ((r.ms || 0) / 1000).toFixed(1) + 's';
      $('notePolishBox').hidden = false;
    }).catch(function () {
      btn.disabled = false;
      noteFormMsg('润色失败（网络异常）', true);
    });
  });
  $('notePolishApply').addEventListener('click', function () {
    if (!notePolishText) return;
    $('noteText').value = notePolishText;
    notePolishReset();
    noteFormMsg('已把润色稿写回正文，满意就点「保存」。');
  });
  $('notePolishDiscard').addEventListener('click', function () { notePolishReset(); });

