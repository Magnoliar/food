const CACHE_NAME = 'zhuzhu-home-kitchen-v2'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([OFFLINE_URL, '/manifest.webmanifest', '/pwa-icon.svg'])))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))))
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(fetch(event.request).catch(async () => {
    const cached = await caches.match(event.request)
    return cached || caches.match(OFFLINE_URL)
  }))
})
