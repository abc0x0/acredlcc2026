'use strict';
// Cambiar VERSION al publicar una actualización de los archivos.
const VERSION = 'v1';
const PREFIX = `lcc-2026-${self.registration.scope}-`;
const CACHE = `${PREFIX}${VERSION}`;
const FILES = [
  './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './Agenda-de-trabajo.pdf', './icons/icon-192.png', './icons/icon-512.png',
  './icons/maskable-512.png', './icons/apple-touch-icon.png'
].map(path => new URL(path, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(FILES.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  const rootPath = new URL(self.registration.scope).pathname;
  const indexPath = new URL('./index.html', self.registration.scope).pathname;
  if (event.request.mode === 'navigate' && [rootPath, indexPath].includes(url.pathname)) {
    event.respondWith((async () => {
      // El HTML y sus recursos se actualizan juntos con la versión del worker.
      const cache = await caches.open(CACHE);
      const page = await cache.match(new URL('./index.html', self.registration.scope).href);
      return page || fetch(event.request);
    })());
  } else if (FILES.includes(url.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(event.request)) || fetch(event.request);
    })());
  }
});
