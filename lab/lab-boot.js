/* 启动后的小检查：缺哪个 demo 直接在控制台点名，方便本地验收。 */
(function () {
  'use strict';
  window.addEventListener('load', function () {
    var RB = window.RB;
    if (!RB) return;
    var missing = RB.manifest.filter(function (m) { return !RB.demos[m.id]; }).map(function (m) { return m.id; });
    if (missing.length && window.console) console.warn('[lab] 未注册的 demo:', missing.join(', '));
    document.documentElement.classList.add('lab-ready');
    if (window.console) console.info('[lab] ready ·', RB.manifest.length, 'effects');
  });
})();
