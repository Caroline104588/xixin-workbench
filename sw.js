// 肸肸工作台 Service Worker
const CACHE_VERSION = 'xixin-v3';  // 改版本号会清空旧缓存
const CORE_FILES = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// 安装：预缓存核心文件，跳过等待立即生效
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(CORE_FILES).catch(()=>{}))
  );
  self.skipWaiting();
});

// 激活：清理旧版本缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截：网络优先，失败再用缓存（保证更新及时 + 离线可用）
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request).then(res => {
      // 同源 GET 请求才缓存
      if (e.request.url.startsWith(location.origin)) {
        const clone = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, clone)).catch(()=>{});
      }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || new Response('离线状态', {status:503})))
  );
});

// 收到"强制更新"消息：清理所有缓存并通知客户端刷新
self.addEventListener('message', e => {
  if (e.data === 'force-update') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage('update-done'))));
  }
});
