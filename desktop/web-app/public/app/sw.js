// AlloFlow Service Worker
// Navigation and boot assets stay bound to this worker's approved release.
// Other same-origin requests: network-first with cache fallback.

// IMPORTANT: placeholders are replaced by postbuild.js.
const RELEASE_ID = '871942c461b5101dd23af20ee731906c9905ef634a7cc85b2d99dece67caf7ce';
const RELEASE_BUILT_AT = 1793036253857;
const CACHE_NAME = 'alloflow-student-shell-v871942c461b5101dd23af20ee731906c9905ef634a7cc85b2d99dece67caf7ce-1793036253857';
const PRECACHE_PATHS = ["./index.html","./alloflow_desktop_bridge.js","./alloflow_update.js","./static/js/main.ea04757e.js","./static/css/main.2573ca88.css","./ai_backend_module.js?v=bb3e486f","./vendor/drag-drop-touch-2.0.3.esm.min.js?autoload"];
const PRECACHE_DIGESTS = {"./index.html":{"sha384":"e6fa0350262ab34eaa2f0d1caf644c49274491359582d7b1b0c800597e8989de24d3244b9af52abfa0ff36b4a9e5f394","bytes":12081},"./alloflow_desktop_bridge.js":{"sha384":"e60357018641e70b45be3b0e3d9045c6c4dea7235f0efb1eca35f15e8f447356156cfa4b531a7bd859111a056fbf3125","bytes":7935},"./alloflow_update.js":{"sha384":"e8e668e6b261a6bc7f667281ee518b166f3f51ec3589c0f03e7279d003a639da803efe4813d25a347e208e729652b44e","bytes":10049},"./static/js/main.ea04757e.js":{"sha384":"86be7f43e03808ea3a2d303270b964986a6dfa1d1673bd8608c4aadc547899e8f5f85ca229bf7e69cdd316520f228b1e","bytes":2197977},"./static/css/main.2573ca88.css":{"sha384":"af350edaccbce83af04bc139d54569c4e666ab2a5d6851a18db77e834524747fbe3e2cf3f3496a1131b25efe7d7e8c73","bytes":616695},"./ai_backend_module.js?v=bb3e486f":{"sha384":"3c2ade77083a1b5e268a09716bd4ca40dacdeaf960193e6241df740a6b071ca6b2427b14adbd2b04732c97f2711d0316","bytes":184825},"./vendor/drag-drop-touch-2.0.3.esm.min.js?autoload":{"sha384":"4d90d638275f84a14c6d4f54c5099280129ccc7db379ed0870177c69caf6e461c1e0b741f95954cb4aa5b98182eab278","bytes":7731},"./vendor/vexflow-5.0.0/vexflow.js":{"sha384":"0aab2c0c3ac1d200f39941b053f4cf8a9e0224e4227f8a96916fb0df5c6d36a2d5df80fbbadb2aecee0deee040b45f6e","bytes":1128380},"./vendor/jsonrepair-3.15.0.min.js":{"sha384":"72dca7d672479ab5333c6305ffd3858f89166f6f2a315554a3c9b138516cb9c3028717b9fe91c33a98ff10a28fcd0386","bytes":7436},"./vendor/jszip-3.10.1.min.js":{"sha384":"fa66d5d88635664fd7d69fe75a5946c9225250df2e32cfa0500375d0eafde54047d1fa63e867ca80f9a00b911789e5c6","bytes":97630},"./lame.min.js":{"sha384":"23db3295db60c4fef8c380e2c57152ec6cdc3aeaf69f4cd2ec26d6e1554cc670b5bbe96e96a8f73cf855c8cf387cdb7e","bytes":156478},"./vendor/pptxgenjs-3.12.0.bundle.js":{"sha384":"09c935e1a03d7227e362895c9e379b5d17d61a4cf996d1cc0621b8a71fe3f064bec5071bece84d416658c968d0f94c10","bytes":477529},"./vendor/lz-string-1.4.4.min.js":{"sha384":"fa95a7ca2f0bb59c7e7205df0f66ab5a0517ee91c86842f6d797043cf93d5abb1e80d960bc32fd0cd8daaac71e42aea8","bytes":4719},"./vendor/idb-keyval-6.2.0.umd.min.js":{"sha384":"59edf274a81db791473341b0a55023fcea20607157a67bf5d75d5a1bdcfcada28caa0cb715c5211ece61123f49b626ac","bytes":4585},"./vendor/three-r128/three.min.js":{"sha384":"088dc42c1554cfd5d03bef7bc7a9f03033e8b0f4795efb315b6b9aecdd577b281e875231b60aad0a419f418f5659d1ee","bytes":603445},"./vendor/three-r128/OrbitControls.js":{"sha384":"c1a819848160638843fbb6b08d08d1e1ed84dbde32e89d874a777c79335cd7966e6d3790795459c21409f96ea19c1b1f","bytes":26375},"./runtime_assets/engine/piper-ort-simd.7d168b18f233bc5da98465b8.wasm":{"sha384":"7d168b18f233bc5da98465b888eb689d36acfe1ffe822e699ee45b6081431cc018eb097c3e306239de369555290da35d","bytes":10595041},"./runtime_assets/engine/piper-ort.927679b038ae4e2b05831065.wasm":{"sha384":"927679b038ae4e2b05831065c18dedc10107f10960b21ba94c8158d92b31d9fcf8d73a62bfc67868a16b77ddd6a2c030","bytes":9758086},"./runtime_assets/engine/piper-phonemizer.a7ba79de91cc749fc2ceae6b.wasm":{"sha384":"a7ba79de91cc749fc2ceae6bf22d1c5d65602c0f8279711e922d4d1b234dd0129f3452c87717a0d11d3ee52ccd4a8a77","bytes":635212},"./runtime_assets/engine/piper-phonemizer.e9787705f887f97edee0ccb5.data":{"sha384":"e9787705f887f97edee0ccb5d64ebabc3a7b5945909a7e487e6b31e19075c20f2f03dfa598e52e72e9ea26936c354b9f","bytes":18077249},"./runtime_assets/engine/piper.closed.f1884b1c5218340ee886929c.mjs":{"sha384":"f1884b1c5218340ee886929c37f341b013f4bd3837bf232020b090c92dfbb36dd2877237f0a29361708e5f7e59559f0d","bytes":788566},"./runtime_assets/engine/kokoro-transformers-3.5.1.bbf6c3b31dfd73ec2dd0b6c7.wasm":{"sha384":"bbf6c3b31dfd73ec2dd0b6c798e0b2771b787f28a2837d75f214203937cebeb7e481270ce21468d88c13b65c72a08d36","bytes":21596019},"./runtime_assets/engine/kokoro.closed.8c3835d7a2e9eadf077cd154.mjs":{"sha384":"8c3835d7a2e9eadf077cd1543dbc91047aadf6ee5a3488271ec9dc4ff9ca0e12e6b514ef6a35248bc79903f2ddf330b5","bytes":2267244},"./runtime_assets/engine/transformers-3.3.1.98f95211528ba8b53becd02b.wasm":{"sha384":"98f95211528ba8b53becd02bbd4fac7064b0d9905d81f2ad1b98bc420ac9d4e4997c43bb9950d13f022c25fc96dd4282","bytes":22792576},"./runtime_assets/engine/transformers.closed.9c5887e102e3838a3aeaf0b0.mjs":{"sha384":"9c5887e102e3838a3aeaf0b0550cbf2bb75cd7d922e5f9adbabed81e73f406c953c79c9e0ce3038c0a240a8ac96f7526","bytes":925973},"./runtime_assets/engine/ort-1.21.0.65bfb71e22a47917da2a906e.wasm":{"sha384":"65bfb71e22a47917da2a906e8d625b82800541d24fd2ef3aedfd08fc21b609ef76b987c6689edcfd98b494a51856b3c7","bytes":23914392},"./runtime_assets/engine/ort.closed.8986603e90c3ccac4973ca1b.mjs":{"sha384":"8986603e90c3ccac4973ca1bfaa0aca78a4ba73b4329f65be23fea82571e8d6e92317ae14449dde9a09654403307e3ea","bytes":402386},"./runtime_assets/document/pdf-lib-1.17.1/pdf-lib.min.js":{"sha384":"c1e300070ae5b40ea3591f030def49a796e593eb59421eee8290ac177270480e7759933dff5e0f8d2e4b009347363008","bytes":525099},"./runtime_assets/document/pdfjs-3.11.174/pdf.min.js":{"sha384":"ff5a940921b04eeafdbe37ffcfd966bbf7825186e93938128e6a5b310675fc2b57daffd670020aa91bfe5350d4086e9e","bytes":320004},"./runtime_assets/document/pdfjs-3.11.174/pdf.worker.min.js":{"sha384":"4a7ccea1ba5130b5d9e76889bd99bf0b47d8c343907a64d7cd38c8b1db1f31cac2b4211ef6a833c537774529253b9c76","bytes":1087212},"./runtime_assets/document/pako-2.1.0/pako.min.js":{"sha384":"acd95a1397ecf5d1888e6c560c02d087f44101a191613e4286bcc7a3ab517e0ad9dfa8911408aab8fe60e3526cbfed23","bytes":46859},"./runtime_assets/document/tesseract-5.1.1/tesseract.min.js":{"sha384":"189a92bbbbee790f6a37413dc8b3dbdd6b6977b3ab80af0a998cc2f13d48cac1b56dcbf1bc83b8aad611fc3dc0f7dd45","bytes":66695},"./runtime_assets/document/mammoth-1.6.0/mammoth.browser.min.js":{"sha384":"9c5a128d92281f7082a7c5badfd8c9c9092e3c78a72763477bba27d71be5500ed2b867c901fbcc95daeca00566e840b3","bytes":642759},"./runtime_assets/document/jszip-3.10.1/jszip.min.js":{"sha384":"fa66d5d88635664fd7d69fe75a5946c9225250df2e32cfa0500375d0eafde54047d1fa63e867ca80f9a00b911789e5c6","bytes":97630},"./runtime_assets/document/fontkit-1.1.1/fontkit.umd.min.js":{"sha384":"da9e94fb59a6a85d745127a115e462c86d84486f45c08a8dfa3c542e7e70f638d02228529fd3edd777550a7fc76b08e7","bytes":758440},"./runtime_assets/document/sheetjs-0.20.1/xlsx.full.min.js":{"sha384":"40221dab650c544a12461477656670773dbfa62bcba30afe7a890531d632ba4abba88dba55847115ae0d97a14a7ad98b","bytes":944491},"./runtime_assets/document/sheetjs-0.18.5/xlsx.full.min.js":{"sha384":"bed8dab3289d528d245bde0ae4c5c35e7b73389a50801297984eded866b82c6d2c9134cb7818bdede1405eca9ec098f0","bytes":881727},"./runtime_assets/document/axe-core-4.12.1/axe.min.js":{"sha384":"2507a0457aba1214e25a818f1439aa6c936c0e8c390684ac1a19da783cc6a7eab23850ae319676e2a6367f3dc5c59179","bytes":572599},"./runtime_assets/document/dompurify-3.1.7/purify.min.js":{"sha384":"5d0a97ff8ca2506bbea32afcee3bd6cd1baa0542bf69dad8d03ba784bfad203f66ffd7704a957c87d164fd283a89f550","bytes":21531},"./runtime_assets/document/temml-0.10.34/temml.min.js":{"sha384":"69cb9e20399c836df9f2012744197313cd41fbfef3726dd6051a32d64ef63d65e8c2ec7bde888cf4e055421da143e895","bytes":158417},"./runtime_assets/document/ibm-ace-3.1.83/ace.js":{"sha384":"7ae24d8fbd31f0348624243da5fc2585b130bf52d8a0b72cc4765708df13adc97bc246ee573dceae2a31c02accab2a13","bytes":583961},"./runtime_assets/document/tesseract-5.1.1/worker.min.js":{"sha384":"cf19fe56aa1f1735e91fdf5d51bddf6b8cb0a1205024fcbaffaa046891cf95b9595ebe776b4835265ebbdb4be04b307b","bytes":123724},"./runtime_assets/document/tesseract-core-5.1.1/tesseract-core-lstm.wasm.js":{"sha384":"10a598e490f0a61428cb186f614ede68273243411d57a7d92b72f6bf37d972fda272145d35dea94a7c963cdbfa7ccb91","bytes":3938277},"./runtime_assets/document/tesseract-core-5.1.1/tesseract-core-simd-lstm.wasm.js":{"sha384":"60cd46fb3696632f554913f60b5d352c283387b9f71ea6fa3849bda83a196200800ec9e2de79c40ac902dd689a95007b","bytes":3938657},"./runtime_assets/document/tesseract-core-5.1.1/tesseract-core-lstm.wasm":{"sha384":"df7a35a910bc1c52d19df7b7aadbeef5c232465e76b64b27cfcf13c96f6617e497b990c685c5faa479c42257990c1f12","bytes":2859424},"./runtime_assets/document/tesseract-core-5.1.1/tesseract-core-simd-lstm.wasm":{"sha384":"bd16ffe830758737202a5e52c1753073184f237a437155acf30d395ea45e69c898d9397686f9a5aad467fd13be916eb1","bytes":2859709},"./runtime_assets/document/tesseract-5.1.1/bootstrap.js":{"sha384":"568f4a7fbdf70f8a6484d278a0729de79242ab569f9cfab6b9e696b072f79a4234c426ef0671ff573541a18bdd2da6aa","bytes":1788},"./duckdb-assets/duckdb-browser.mjs":{"sha384":"509d389b8b9b15ec67f42071c157902115846890f5b049de48207974f63a99f94b9fa94448ff93c32b40fcb9c90898ef","bytes":227413},"./duckdb-assets/duckdb-browser-mvp.worker.js":{"sha384":"001078405814a10a9f88c46fe0499edb4442a3eacefff38110e25f8946e26450511ffe13e31cbc55cbb884b5e03f1434","bytes":844644},"./duckdb-assets/duckdb-mvp.wasm.part00":{"sha384":"84902b9ca2761ddef705ed707f469caa4fded6fea7d558afd4697b31918d0775807f59fa9fcec9e33d710a73843d8253","bytes":16777216},"./duckdb-assets/duckdb-mvp.wasm.part01":{"sha384":"132a7037c5eb8e930e441c42d7dc17e3b4c72c8dc5dd7be618d5cb7e3b87f75fd1921ae7a51c6bf09b65c5ebc52fda4a","bytes":16777216},"./duckdb-assets/duckdb-mvp.wasm.part02":{"sha384":"ea9defaf2fe7a7589d2fd72f53d75b00b3aea77007601adb09d2a764cef7816d338cf3ecea0c1cc77b6d648adbe2c066","bytes":5808219}};
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
            keys.filter(k => k.startsWith('alloflow-student-shell-v') && k !== CACHE_NAME).map(k => caches.delete(k))
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
