const CACHE = 'dafeiyu-v1'
const SHELL = ['/', '/index.html', '/style.css', '/app.js', '/manifest.webmanifest',
  '/art/dafeiyu.png', '/art/icon-192.png', '/art/icon-512.png',
  '/art/videos/idle.webm', '/art/videos/wave.webm', '/art/videos/happy.webm',
  '/art/videos/shy.webm', '/art/videos/tsun.webm', '/art/videos/laugh.webm']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {})
      return res
    }).catch(() => caches.match('/index.html')))
  )
})

self.addEventListener('push', (e) => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch (err) { data = { body: e.data && e.data.text() } }
  const title = data.title || '大肥鱼'
  const body = data.body || '她找你了'
  e.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/art/icon-192.png',
    badge: '/art/icon-192.png',
    tag: 'dafeiyu-' + Date.now(),
    renotify: true,
    data: { url: data.url || '/' },
  }))
})
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if (c.url.includes(location.host)) { c.focus(); return } }
    return clients.openWindow(url)
  }))
})
