// YHuo Service Worker 卸载器（2026-09-10 移除 PWA：本文件唯一职责是给已安装过旧 SW 的访客
// 自动注销并清光历史缓存；新访客不会注册任何 SW。保留 no-cache 头保证卸载脚本即时生效。
// 恢复 PWA 时找回 22a03bf 里的 sw.js/manifest.webmanifest/offline.html 并删除本卸载器。）
const SW_VERSION = 'yhuo-sw-v4-uninstall';
self.addEventListener('install', function () {
  self.skipWaiting();
});
self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    await self.registration.unregister();
    await self.clients.claim();
  })());
});
