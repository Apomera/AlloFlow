// AlloFlow Service Worker
// Navigation: cached shell immediately, refresh in the background.
// Hashed JS/CSS: precached at install and served cache-first.
// Other same-origin requests: network-first with cache fallback.

// IMPORTANT: placeholders are replaced by postbuild.js.
const CACHE_NAME = 'alloflow-student-shell-v1784863121125';
const PRECACHE_PATHS = ["./index.html","./alloflow_desktop_bridge.js","./static/js/main.c689de77.js","./static/css/main.663ffaaa.css"];
const scopedUrl = (relativePath) => new URL(relativePath, self.registration.scope).toString();
const SHELL_URL = scopedUrl('./index.html');

self.addEventListener('install', (event) => {
    console.log('[SW] Installing:', CACHE_NAME);
    // Install succeeds only when the HTML and every hashed boot asset are cached.
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_PATHS.map(scopedUrl)))
    );
    // Do not call skipWaiting(): never interrupt an active classroom tab.
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating:', CACHE_NAME);
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter(k => k.startsWith('alloflow-student-shell-v') && k !== CACHE_NAME).map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin && event.request.mode !== 'navigate') return;

    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => cache.match(SHELL_URL).then((cached) => {
                const networkFetch = fetch(event.request).then((response) => {
                    if (response.ok) cache.put(SHELL_URL, response.clone());
                    return response;
                }).catch(() => cached || new Response('AlloFlow is loading...', {
                    status: 503,
                    headers: { 'Content-Type': 'text/html' }
                }));
                return cached || networkFetch;
            }))
        );
        return;
    }

    if (url.pathname.match(/\/static\/(js|css)\/.*\.[a-f0-9]{8}\./)) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => cache.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response.ok) cache.put(event.request, response.clone());
                    return response;
                });
            }))
        );
        return;
    }

    event.respondWith(
        fetch(event.request).then((response) => {
            // Clone synchronously BEFORE returning: caches.open() resolves in a
            // later microtask, by which time the page may have consumed the body
            // and clone() throws "Response body is already used" (cache write
            // silently failed on every request). Same pattern as the handlers above.
            if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
        }).catch(() => caches.match(event.request).then((response) => response || new Response(
            'Network error and no cache available.',
            { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/plain' } }
        )))
    );
});