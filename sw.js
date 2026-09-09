// YHuo Service Worker（PWA 可安装 + 离线兜底，2026-09-09 接入）
// 策略总览（仅拦同源 GET；/api/ /admin/ /media/ 与带 Range 的请求完全不拦）：
//   导航 → network-first（3 秒超时）→ 缓存 → /offline.html
//   /assets/* → stale-while-revalidate（缓存优先秒回 + 后台更新）
//   /music/ /video/ /images/ → cache-first（上限 60 条，超出删最旧）
//   其余同源 GET → network-first（简单版，无超时控制）
// 注意：本文件是普通根文件（非 ESM、不在页面里），改完用 node --check sw.js 验语法。
const SW_VERSION = 'yhuo-sw-v1';
const PRECACHE = SW_VERSION + '-precache'; // install 精装（刻意轻量，绝不整站 precache）
const RUNTIME = SW_VERSION + '-runtime';   // 导航 + /assets/* 运行时缓存
const MEDIA = SW_VERSION + '-media';       // 音视频图片（有条数上限）
const MEDIA_MAX = 60;                      // 媒体缓存条目上限，超出删最旧
const OFFLINE_URL = '/offline.html';

// install 只精装三个：离线兜底页 / 图标 / 清单
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE);
    await cache.addAll([OFFLINE_URL, '/assets/icons/favicon.png', '/manifest.webmanifest']);
    await self.skipWaiting();
  })());
});

// activate：清掉所有非当前版本的旧缓存，然后接管未受控页面
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => k !== PRECACHE && k !== RUNTIME && k !== MEDIA)
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return; // 只拦 GET

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return; // chrome-extension 等一律不拦
  if (url.origin !== self.location.origin) return; // 跨域（字体/CDN）不拦

  // 动态接口 / 后台 / 媒体流：完全不拦（不 respondWith，直接放行网络）
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/') || url.pathname === '/admin') return;
  if (url.pathname.startsWith('/media/')) return;
  if (request.headers.has('range')) return; // 音视频 seek（Range 请求）不拦，交给浏览器

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(request));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    const { value, update } = staleWhileRevalidate(request);
    event.respondWith(value);
    event.waitUntil(update); // 后台更新期间保活 SW
    return;
  }
  if (url.pathname.startsWith('/music/') || url.pathname.startsWith('/video/') || url.pathname.startsWith('/images/')) {
    event.respondWith(cacheFirstCapped(request));
    return;
  }
  event.respondWith(networkFirstSimple(request));
});

// 导航：network-first，网络 3 秒超时 → 缓存 → 离线页
async function handleNavigate(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME);
      cache.put(request, response.clone()); // 顺手进运行时缓存，断网可回看
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline || offlineText();
  } finally {
    clearTimeout(timer);
  }
}

// /assets/*：stale-while-revalidate —— 缓存命中先回，同时后台拉新；未命中等网络
function staleWhileRevalidate(request) {
  const cachePromise = caches.open(RUNTIME);
  const network = cachePromise.then((cache) =>
    fetch(request).then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
  );
  return {
    value: cachePromise
      .then((cache) => cache.match(request))
      .then((cached) => cached || network.then((r) => r || offlineText())),
    update: network.then(() => {}, () => {}),
  };
}

// /music/ /video/ /images/：cache-first，超出上限删最旧（cache.keys() 顺序即插入顺序）
async function cacheFirstCapped(request) {
  const cache = await caches.open(MEDIA);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      while (keys.length > MEDIA_MAX) {
        await cache.delete(keys[0]);
        keys.shift();
      }
    }
    return response;
  } catch (e) {
    return offlineText();
  }
}

// 其余同源 GET：network-first 简单版（无超时控制）
async function networkFirstSimple(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || offlineText();
  }
}

// 兜底 503 文本响应（极小概率走到：连离线页都没装上时）
function offlineText() {
  return new Response('网络不可用，且本地无缓存。', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
