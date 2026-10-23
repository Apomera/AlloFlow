// AlloFlow Service Worker
// Navigation: cached shell immediately, refresh in the background.
// Hashed JS/CSS: precached at install and served cache-first.
// Other same-origin requests: network-first with cache fallback.

// IMPORTANT: placeholders are replaced by postbuild.js.
const RELEASE_ID = 'a06a92103e8efd56e074fa267c91f00b42684998dde385dd4593e4bed76b4b8f';
const RELEASE_BUILT_AT = 1792716629270;
const CACHE_NAME = 'alloflow-student-shell-va06a92103e8efd56e074fa267c91f00b42684998dde385dd4593e4bed76b4b8f-1792716629270';
const PRECACHE_PATHS = ["./index.html","./alloflow_desktop_bridge.js","./alloflow_update.js","./static/js/main.8f677b78.js","./static/css/main.ec11f4ef.css"];
const scopedUrl = (relativePath) => new URL(relativePath, self.registration.scope).toString();
const SHELL_URL = scopedUrl('./index.html');
const CLASSROOM_NETWORK_PATHS = new Set([
    '/classroom-import.html', '/classroom-import',
    '/classroom_import_config.js', '/classroom_import_app.js',
    '/classroom_import_service.js'
]);

// Cloudflare Pages answers ./index.html with a 308 to ./ (clean URLs), so the
// precached shell arrived as a REDIRECTED response. A navigation request's
// redirect mode is not "follow", and a redirected response may not be served
// to it: Chrome failed the load with net::ERR_FAILED. Measured 2026-09-13 on
// the live app: the first reload after every install or update died, and the
// next one worked only because the background refetch had replaced the entry.
// Anything that goes into the cache as the shell is re-wrapped first, and a
// redirected entry left by an older worker is never served.
const cleanCopy = (response) => {
    if (!response || !response.redirected) return response;
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
};

self.addEventListener('install', (event) => {
    console.log('[SW] Installing:', CACHE_NAME);
    // Install succeeds only when the HTML and every hashed boot asset are cached.
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => Promise.all(PRECACHE_PATHS.map(scopedUrl).map((assetUrl) =>
            fetch(assetUrl, { cache: 'reload' }).then(async (response) => {
                if (!response.ok) throw new Error('[SW] precache failed: ' + assetUrl + ' -> ' + response.status);
                // A deployment can switch between fetching sw.js and HTML.
                // Never announce a release unless its own shell was installed.
                if (assetUrl === SHELL_URL) {
                    const html = await response.clone().text();
                    const release = html.match(/window\.__alloReleaseId\s*=\s*["']([a-f0-9]+)["']/);
                    if (!release || release[1] !== RELEASE_ID) throw new Error('[SW] shell release does not match worker');
                }
                return cache.put(assetUrl, cleanCopy(response));
            })
        )))
    );
    // Do not call skipWaiting(): never interrupt an active classroom tab.
});

// A waiting worker activates only after the person explicitly accepts the
// in-app update prompt. This preserves interruption-free automatic updates
// while making "Refresh now" deterministic when the timing is appropriate.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ALLOFLOW_GET_RELEASE') {
        const reply = { type: 'ALLOFLOW_RELEASE', releaseId: RELEASE_ID, releaseBuiltAt: RELEASE_BUILT_AT };
        if (event.ports && event.ports[0]) event.ports[0].postMessage(reply);
        return;
    }
    if (event.data && event.data.type === 'ALLOFLOW_ACTIVATE_UPDATE') {
        self.skipWaiting();
    }
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating:', CACHE_NAME);
    event.waitUntil(
        // Purge only OUR previous shell caches. Other named caches on this origin
        // belong to other owners: 'transformers-cache' holds the 88 MB Kokoro
        // voice model, and deleting it here forced a full re-download after
        // every deploy (the student-shell copy has been prefix-scoped by
        // build.js since the shell split; this is the same rule for the rest).
        caches.keys().then((keys) => Promise.all(
            keys.filter(k => k.startsWith('alloflow-student-shell-v') && k !== CACHE_NAME).map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin && event.request.mode !== 'navigate') return;

    // Standalone Classroom pages must never become the app shell. Fetch the
    // helper and its configuration afresh so cached enablement cannot reopen
    // Google access after school IT has disabled the deployment.
    if (url.origin === self.location.origin && CLASSROOM_NETWORK_PATHS.has(url.pathname)) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' }).catch(() => new Response(
                'Classroom connection is unavailable. Reconnect and reopen this page.',
                {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'no-store',
                        'X-Content-Type-Options': 'nosniff'
                    }
                }
            ))
        );
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => cache.match(SHELL_URL).then((stored) => {
                const cached = stored && !stored.redirected ? stored : null;
                const networkFetch = fetch(event.request).then((response) => {
                    if (response.ok) cache.put(SHELL_URL, cleanCopy(response.clone()));
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

    // Version-pinned module URLs (?v=<stamp>) are immutable by repo convention:
    // every deploy restamps the pin, so a cached body for a given pinned URL
    // cannot go stale, and the per-deploy CACHE_NAME purge clears old pins
    // anyway. Serving them cache-first lets a warm boot skip ~180 module
    // round trips; unpinned URLs (audio_bank.json and other data fetches)
    // keep the network-first handling below.
    if (url.origin === self.location.origin && url.searchParams.has('v')) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => cache.match(event.request).then((cached) => {
                if (cached) return cached;
                // A new release cache must not inherit a still-fresh HTTP
                // cache entry for an unchanged local module URL.
                return fetch(event.request, { cache: 'no-cache' }).then((response) => {
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
