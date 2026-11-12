/* EKAMBANI service worker — offline support for the POS and its modules.
   IMPORTANT: change VERSION whenever you publish new versions of the HTML files, so the old cache is replaced.
   Strategy:
   - App pages (index/Finance/Phone/More): network first (so updates appear when online), cached copy when offline.
   - Same-origin files (icons, manifest): cached copy first, refreshed in the background.
   - Known library/CDN files (jQuery, SweetAlert2, Select2, Font Awesome, html2pdf, html5-qrcode, QRCode, Google Fonts):
     cached after first use and served from the cache.
   - Google APIs, sign-in and the Apps Script "More" content are NEVER cached or intercepted. */
const VERSION = 'ekambani-v2';
const CORE = [
  './', 'index.html', 'Finance.html', 'More.html', 'Phone.html', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/logo.png'
];
const CDN = [
  'https://code.jquery.com/jquery-3.6.0.min.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css',
  'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-brands-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Poppins:wght@400;500;600&display=swap'
];
const CACHEABLE_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'code.jquery.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', function(event) {
  event.waitUntil((async function() {
    const cache = await caches.open(VERSION);
    // Best effort: one missing file never blocks installation.
    await Promise.allSettled(CORE.map(function(u) { return cache.add(new Request(u, { cache: 'reload' })); }));
    await Promise.allSettled(CDN.map(function(u) { return cache.add(new Request(u, { mode: 'no-cors' })); }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function(event) {
  event.waitUntil((async function() {
    const keys = await caches.keys();
    await Promise.all(keys.filter(function(k) { return k !== VERSION && k.indexOf('ekambani-') === 0; }).map(function(k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

function offlinePage() {
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;text-align:center;padding:40px;color:#334155"><h3>Not available offline yet</h3><p>Open this page once while online so it can be saved for offline use.</p></body>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

self.addEventListener('fetch', function(event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Same-origin
  if (url.origin === self.location.origin) {
    const isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;
    if (isPage) {
      event.respondWith((async function() {
        const cache = await caches.open(VERSION);
        try {
          const net = await fetch(req);
          if (net && net.ok) cache.put(req, net.clone()).catch(function() {});
          return net;
        } catch (e) {
          const hit = await cache.match(req, { ignoreSearch: true });
          if (hit) return hit;
          const p = url.pathname;
          if (req.mode === 'navigate' && (p.endsWith('/') || p.endsWith('/index.html'))) {
            const idx = await cache.match('index.html') || await cache.match('./');
            if (idx) return idx;
          }
          return offlinePage();   // never answer a module's request with the POS page
        }
      })());
      return;
    }
    event.respondWith((async function() {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req, { ignoreSearch: true });
      const refresh = fetch(req).then(function(net) { if (net && net.ok) cache.put(req, net.clone()).catch(function() {}); return net; }).catch(function() { return null; });
      if (hit) { event.waitUntil(refresh); return hit; }
      const net = await refresh;
      return net || new Response('', { status: 504 });
    })());
    return;
  }

  // Known CDN / font hosts: cache first, fill on first use
  if (CACHEABLE_HOSTS.indexOf(url.hostname) !== -1) {
    event.respondWith((async function() {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const net = await fetch(req);
        if (net && (net.ok || net.type === 'opaque')) cache.put(req, net.clone()).catch(function() {});
        return net;
      } catch (e) { return new Response('', { status: 504 }); }
    })());
  }
  // Everything else (Google APIs, sign-in, Apps Script, WhatsApp...) goes straight to the network.
});
