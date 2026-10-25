// AlloFlow Service Worker
// Navigation and boot assets stay bound to this worker's approved release.
// Other same-origin requests: network-first with cache fallback.

// IMPORTANT: placeholders are replaced by postbuild.js.
const RELEASE_ID = '__RELEASE_ID__';
const RELEASE_BUILT_AT = __BUILD_TS__;
const CACHE_NAME = 'alloflow-v__RELEASE_ID__-__BUILD_TS__';
const PRECACHE_PATHS = __PRECACHE_PATHS__;
const PRECACHE_DIGESTS = __PRECACHE_DIGESTS__;
const scopedUrl = (relativePath) => new URL(relativePath, self.registration.scope).toString();
const SHELL_URL = scopedUrl('./index.html');
const RELEASE_ASSETS = new Map(Object.entries(PRECACHE_DIGESTS).map(([asset, record]) => [scopedUrl(asset), record]));
const RELEASE_PATHS = new Set([...RELEASE_ASSETS.keys()].map(asset => new URL(asset).pathname));
const STATIC_CODE_PATH = new URL('./static/', self.registration.scope).pathname;
const MAX_RELEASE_ASSET_BYTES = 64 * 1024 * 1024;
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

// The digest map is emitted with the trusted worker, never fetched alongside
// an asset. Bound the decoded stream before allocating/hash computation.
async function verifyReleaseResponse(response, assetUrl) {
    const expected = RELEASE_ASSETS.get(assetUrl);
    if (!expected || !Number.isSafeInteger(expected.bytes) || expected.bytes < 0
        || expected.bytes > MAX_RELEASE_ASSET_BYTES || !/^[a-f0-9]{96}$/.test(expected.sha384)
        || !response || response.status !== 200) throw new Error('[SW] unapproved release asset: ' + assetUrl);
    const reader = response.clone().body?.getReader();
    if (!reader) throw new Error('[SW] release asset has no readable body');
    const bytes = new Uint8Array(expected.bytes);
    let length = 0;
    try {
        while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            if (length + chunk.value.byteLength > expected.bytes) throw new Error('[SW] release asset exceeds its approved length');
            bytes.set(chunk.value, length);
            length += chunk.value.byteLength;
        }
    } catch (error) {
        reader.cancel().catch(() => {});
        throw error;
    }
    if (length !== expected.bytes) throw new Error('[SW] release asset length mismatch');
    const digest = await crypto.subtle.digest('SHA-384', bytes);
    const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (actual !== expected.sha384) throw new Error('[SW] release asset digest mismatch');
    if (assetUrl === SHELL_URL) {
        const release = new TextDecoder().decode(bytes).match(/window\.__alloReleaseId\s*=\s*["']([a-f0-9]+)["']/);
        if (!release || release[1] !== RELEASE_ID) throw new Error('[SW] shell release does not match worker');
    }
    return cleanCopy(response);
}

const releaseUnavailable = () => new Response('This approved AlloFlow release is unavailable. Reconnect and try again.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

const cacheable = response => response && response.ok
    && !/(?:^|,)\s*(?:private|no-store)(?:\s|,|=|$)/i.test(response.headers.get('Cache-Control') || '')
    && response.headers.get('Vary') !== '*';

async function releaseResponse(assetUrl) {
    const cache = await caches.open(CACHE_NAME);
    const stored = await cache.match(assetUrl);
    if (stored) {
        try {
            if (!cacheable(stored)) throw new Error('[SW] private response is not an offline asset');
            return await verifyReleaseResponse(stored, assetUrl);
        }
        catch (_) { await cache.delete(assetUrl); }
    }
    try {
        const response = await verifyReleaseResponse(await fetch(assetUrl, { cache: 'no-cache' }), assetUrl);
        if (cacheable(response)) await cache.put(assetUrl, response.clone());
        return response;
    } catch (_) { return releaseUnavailable(); }
}

self.addEventListener('install', (event) => {
    console.log('[SW] Installing:', CACHE_NAME);
    // Verify the complete boot set before writing any candidate cache entry.
    // A partial/mixed deployment must not replace an already approved cache.
    event.waitUntil(
        Promise.all(PRECACHE_PATHS.map(async asset => {
            const assetUrl = scopedUrl(asset);
            const response = await verifyReleaseResponse(await fetch(assetUrl, { cache: 'reload' }), assetUrl);
            return [assetUrl, response];
        })).then(async assets => {
            const cache = await caches.open(CACHE_NAME);
            await Promise.all(assets.filter(([, response]) => cacheable(response)).map(([assetUrl, response]) => cache.put(assetUrl, response)));
        })
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
            keys.filter(k => k.startsWith('alloflow-v') && k !== CACHE_NAME).map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET') return;
    if (url.origin !== self.location.origin && event.request.mode !== 'navigate') return;

    // Classroom API responses and credential-bearing/private requests must
    // never enter an offline cache or use a cached substitute.
    if (event.request.headers.has('Authorization') || event.request.cache === 'no-store'
        || /(?:^|,)\s*no-store(?:\s|,|$)/i.test(event.request.headers.get('Cache-Control') || '')
        || /(?:^|\/)api(?:\/|$)/i.test(url.pathname)) {
        event.respondWith(fetch(event.request, { cache: 'no-store' }));
        return;
    }

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
        // New HTML belongs to its own waiting worker. Never refresh A's shell
        // to B while a classroom has chosen Later or is still using A.
        event.respondWith(releaseResponse(SHELL_URL));
        return;
    }

    if (url.origin === self.location.origin && RELEASE_PATHS.has(url.pathname)) {
        // A different query can name a different release. It cannot bypass the
        // approved map and fall through to a generic version-keyed cache.
        event.respondWith(RELEASE_ASSETS.has(url.href) ? releaseResponse(url.href) : Promise.resolve(releaseUnavailable()));
        return;
    }

    if (url.pathname.startsWith(STATIC_CODE_PATH) && /\.(?:js|css)$/i.test(url.pathname)) {
        event.respondWith(Promise.resolve(releaseUnavailable()));
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
                if (cacheable(cached)) return cached;
                // A new release cache must not inherit a still-fresh HTTP
                // cache entry for an unchanged local module URL.
                return fetch(event.request, { cache: 'no-cache' }).then((response) => {
                    if (cacheable(response)) cache.put(event.request, response.clone());
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
            if (cacheable(response)) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
        }).catch(() => caches.open(CACHE_NAME).then(cache => cache.match(event.request)).then((response) => cacheable(response) ? response : new Response(
            'Network error and no cache available.',
            { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/plain' } }
        )))
    );
});
