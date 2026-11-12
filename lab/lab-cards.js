/* ============================================================
   Lab · 05 卡片与文字
   SpotlightCard / GlareHover / MagicBento / ProfileCard / ShinyText
   StarBorder / FoldText / BlurText / SloshGauge
   ============================================================ */
(function () {
  'use strict';
  var RB = window.RB;

  /* ---------------- SpotlightCard ---------------- */
  RB.demo('spotlight-card', function (stage) {
    stage.innerHTML =
      '<div class="sc-wrap">' +
        '<article class="sc-card"><span class="sc-glow"></span><div class="sc-in"><b>相册</b><p>牌堆、照片墙与灯箱，全部在 /album/。</p><span class="sc-link">去看看 →</span></div></article>' +
        '<article class="sc-card small"><span class="sc-glow"></span><div class="sc-in"><b>随笔</b><p>时间树上的短句。</p></div></article>' +
      '</div>';
    Array.prototype.slice.call(stage.querySelectorAll('.sc-card')).forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        card.classList.add('live');
      });
      card.addEventListener('pointerleave', function () { card.classList.remove('live'); });
    });
  });

  /* ---------------- GlareHover ---------------- */
  RB.demo('glare-hover', function (stage) {
    stage.innerHTML =
      '<div class="gl-wrap">' +
        '<article class="gl-card" tabindex="0"><span class="gl-glare"></span><div class="gl-in"><span class="gl-kicker">ALBUM</span><b>达妮娅 · 官方</b><span class="gl-sub">14 张 · 点击进入</span></div></article>' +
      '</div>';
    var card = stage.querySelector('.gl-card');
    var glare = stage.querySelector('.gl-glare');
    card.addEventListener('pointerenter', function (e) {
      var r = card.getBoundingClientRect();
      var fromLeft = e.clientX - r.left < r.width / 2;
      glare.style.setProperty('--dir', fromLeft ? '-1' : '1');
      card.classList.remove('sweep');
      void card.offsetWidth;
      card.classList.add('sweep');
    });
    glare.addEventListener('animationend', function () { card.classList.remove('sweep'); });
  });

  /* ---------------- MagicBento ---------------- */
  RB.demo('magic-bento', function (stage) {
    var cards = [
      { t: '相册', d: '96 张照片', cls: 'big' },
      { t: '随笔', d: '18 篇' },
      { t: '课表', d: '本周 12 节' },
      { t: '音乐', d: '2 首常听' },
      { t: '访问', d: '今日 34' },
      { t: 'AI', d: '26 次对话' }
    ];
    stage.innerHTML = '<div class="mb"></div>';
    var box = stage.querySelector('.mb');
    cards.forEach(function (c) {
      var el = RB.el('article', 'mb-card' + (c.cls ? ' ' + c.cls : ''));
      el.innerHTML = '<span class="mb-edge"></span><span class="mb-wave"></span><div class="mb-in"><b>' + c.t + '</b><span>' + c.d + '</span></div>';
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      el.addEventListener('click', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--wx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--wy', (e.clientY - r.top) + 'px');
        el.classList.remove('hit');
        void el.offsetWidth;
        el.classList.add('hit');
      });
      box.appendChild(el);
    });
  });

  /* ---------------- ProfileCard ---------------- */
  RB.demo('profile-card', function (stage) {
    stage.innerHTML =
      '<div class="pc-scene">' +
        '<article class="pc-card">' +
          '<div class="pc-foil"></div>' +
          '<div class="pc-sheen"></div>' +
          '<div class="pc-avatar">YH</div>' +
          '<div class="pc-name">YHuo</div>' +
          '<div class="pc-role">个人主页 · 站长</div>' +
          '<div class="pc-stats"><span><b>2026</b>建站</span><span><b>8</b>页面</span><span><b>96</b>照片</span></div>' +
          '<div class="pc-foot">MOVE YOUR POINTER</div>' +
        '</article>' +
      '</div>';
    var card = stage.querySelector('.pc-card');
    var foil = stage.querySelector('.pc-foil');
    var sheen = stage.querySelector('.pc-sheen');
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = 'rotateX(' + (-y * 14) + 'deg) rotateY(' + (x * 16) + 'deg)';
      sheen.style.transform = 'translate(' + (x * 70) + 'px,' + (y * 70) + 'px)';
      foil.style.backgroundPosition = ((x + 0.5) * 100) + '% ' + ((y + 0.5) * 100) + '%';
    });
    card.addEventListener('pointerleave', function () {
      card.style.transform = '';
      sheen.style.transform = '';
    });
  });

  /* ---------------- ShinyText ---------------- */
  RB.demo('shiny-text', function (stage) {
    stage.innerHTML = '<div class="st-wrap"><span class="st-shiny">YHuo</span><span class="st-sub">个人主页 · 2016 → 2026</span></div>';
  });

  /* ---------------- StarBorder ---------------- */
  RB.demo('star-border', function (stage) {
    stage.innerHTML =
      '<div class="sb-wrap">' +
        '<a class="sb-btn" href="#" onclick="return false">' +
          '<svg class="sb-svg" viewBox="0 0 220 52" preserveAspectRatio="none" aria-hidden="true">' +
            '<defs><path id="sbPath" d="M26 1H194A25 25 0 0 1 219 26A25 25 0 0 1 194 51H26A25 25 0 0 1 1 26A25 25 0 0 1 26 1Z"/></defs>' +
            '<rect x="1" y="1" width="218" height="50" rx="25" fill="none" stroke="var(--border)" stroke-width="1.5"></rect>' +
            '<circle r="2.6" fill="var(--brand-400)">' +
              '<animateMotion dur="4.2s" repeatCount="indefinite" rotate="auto"><mpath href="#sbPath"/></animateMotion>' +
            '</circle>' +
            '<circle r="6" fill="var(--brand-500)" opacity=".25">' +
              '<animateMotion dur="4.2s" repeatCount="indefinite" rotate="auto"><mpath href="#sbPath"/></animateMotion>' +
            '</circle>' +
          '</svg>' +
          '<span>开始探索</span>' +
        '</a>' +
      '</div>' +
      '<p class="sb-tip">星点沿按钮轮廓跑一圈，拖出一点光</p>';
  });

  /* ---------------- FoldText ---------------- */
  RB.demo('fold-text', function (stage) {
    stage.innerHTML =
      '<div class="ft-wrap"><div class="ft-lines">' +
        '<span class="ft-line"><i>十月的风</i></span>' +
        '<span class="ft-line"><i>把页面吹成</i></span>' +
        '<span class="ft-line"><i>一张摊开的纸</i></span>' +
      '</div><button class="lab-btn ft-replay" type="button">重播</button></div>';
    var lines = Array.prototype.slice.call(stage.querySelectorAll('.ft-line'));
    function play() {
      lines.forEach(function (l) {
        l.classList.remove('in');
        void l.offsetWidth;
        l.classList.add('in');
      });
    }
    stage.querySelector('.ft-replay').addEventListener('click', play);
    play();
  });

  /* ---------------- BlurText ---------------- */
  RB.demo('blur-text', function (stage) {
    var text = '把每一句话，放回它该在的位置。';
    stage.innerHTML = '<div class="bt-wrap"><p class="bt-text"></p><button class="lab-btn bt-replay" type="button">重播</button></div>';
    var p = stage.querySelector('.bt-text');
    var words = text.split('');
    words.forEach(function (ch) {
      var s = document.createElement('span');
      s.textContent = ch;
      p.appendChild(s);
    });
    function play() {
      Array.prototype.slice.call(p.children).forEach(function (s, i) {
        s.style.animation = 'none';
        void s.offsetWidth;
        s.style.animation = 'bt-in .7s cubic-bezier(.23,1,.32,1) ' + (i * 0.045) + 's forwards';
      });
    }
    stage.querySelector('.bt-replay').addEventListener('click', play);
    play();
  });

  /* ---------------- SloshGauge ---------------- */
  RB.demo('slosh-gauge', function (stage) {
    stage.innerHTML =
      '<div class="sg">' +
        '<div class="sg-head"><span>存储用量</span><b class="sg-val">68%</b></div>' +
        '<div class="sg-tank"><div class="sg-liquid"><span class="sg-wave"></span></div><span class="sg-ticks"></span></div>' +
        '<div class="sg-actions"><button class="lab-btn sg-minus" type="button">−10</button><button class="lab-btn sg-plus" type="button">+10</button><span class="sg-hint">灌满会溅一下</span></div>' +
      '</div>';
    var v = 68, tank = stage.querySelector('.sg-tank'), liquid = stage.querySelector('.sg-liquid'), val = stage.querySelector('.sg-val');
    function paint(next) {
      var prev = v;
      v = RB.clamp(next, 0, 100);
      liquid.style.height = v + '%';
      liquid.style.transform = 'rotate(' + ((v - prev) * 0.18) + 'deg)';
      val.textContent = v + '%';
      setTimeout(function () { liquid.style.transform = ''; }, 380);
      if (v === 100 && prev < 100) {
        tank.classList.remove('full');
        void tank.offsetWidth;
        tank.classList.add('full');
        RB.toast('满了，该清理一下');
      }
    }
    stage.querySelector('.sg-plus').addEventListener('click', function () { paint(v + 10); });
    stage.querySelector('.sg-minus').addEventListener('click', function () { paint(v - 10); });
    paint(68);
  });
})();
