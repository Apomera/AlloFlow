// AlloFlow Service Worker
// Purpose: Stale-while-revalidate to bypass Chrome QUIC protocol issues
// that cause page loads to hang on networks blocking UDP traffic.
//
// Strategy:
// - Navigation requests: Stale-while-revalidate (serve cached, update in background)
// - Static assets (JS/CSS with hashes): Cache-first (immutable, never changes)
// - Other requests: Network-first with cache fallback
//
// IMPORTANT: CACHE_VERSION is auto-replaced by build.js on each deploy.
// Do not change the format of the next line.

const CACHE_NAME = 'alloflow-v__BUILD_TS__';

// Install: pre-cache index.html so stale-while-revalidate always has content
// CRITICAL: Without pre-caching, the first load after install falls back to
// network-only, which will hang on QUIC-blocked networks.
self.addEventListener('install', (event) => {
    console.log('[SW] Installing:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.add('/index.html');
        })
    );
    // Activate immediately, don't wait for old tabs to close
    self.skipWaiting();
});

// Activate: clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating:', CACHE_NAME);
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => {
                    console.log('[SW] Purging old cache:', k);
                    return caches.delete(k);
                })
            );
        }).then(() => {
            // Take control of all open tabs immediately
            return self.clients.claim();
        })
    );
});

// Fetch: intercept all requests
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only handle same-origin requests and navigation
    if (url.origin !== self.location.origin && event.request.mode !== 'navigate') {
        return; // Let cross-origin requests pass through
    }

    // Navigation requests (page loads/reloads): stale-while-revalidate
    // CRITICAL: This strategy serves cached HTML instantly, preventing QUIC hangs.
    // Do NOT change this to network-first — it will hang on networks blocking UDP.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match('/index.html').then((cached) => {
                    const networkFetch = fetch(event.request).then((response) => {
                        if (response.ok) {
                            cache.put('/index.html', response.clone());
                        }
                        return response;
                    }).catch(() => {
                        // Network failed (QUIC hang, offline, etc.)
                        return cached || new Response('AlloFlow is loading...', {
                            headers: { 'Content-Type': 'text/html' }
                        });
                    });

                    // Return cached immediately if available, otherwise wait for network
                    return cached || networkFetch;
                });
            })
        );
        return;
    }

    // Static assets with hash in filename (immutable): cache-first
    if (url.pathname.match(/\/static\/(js|css)\/.*\.[a-f0-9]{8}\./)) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cached) => {
                    if (cached) return cached;
                    return fetch(event.request).then((response) => {
                        if (response.ok) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    });
                });
            })
        );
        return;
    }

    // All other same-origin requests: network-first with cache fallback
    event.respondWith(
        fetch(event.request).then((response) => {
            if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
            }
            return response;
        }).catch(() => {
            return caches.match(event.request).then((response) => {
                return response || new Response('Network error and no cache available.', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({ 'Content-Type': 'text/plain' })
                });
            });
        })
    );
});
