/**
 * piper_tts_loader.js — AlloFlow TTS Provider (Language Fallback)
 *
 * Loads Piper TTS (WASM) in the browser for text-to-speech in languages
 * that Kokoro doesn't support (40+ languages, 100+ voices).
 *
 * Uses @mintplex-labs/piper-tts-web which provides predict({ text, voiceId }) → Blob
 *
 * Exposes: window._piperTTS = { init(), speak(text, lang, speed, options),
 *   stop(), dispose(), ownsUrl(), invalidateUrl(), voices, ready }
 *
 * License: MIT (Piper) + MIT (piper-tts-web)
 * Models: ~15-75MB per voice, downloaded on-demand and cached
 */
(function () {
    'use strict';

    if (typeof window !== 'object' || !window) return;

    function _log() {
        if (typeof console !== 'undefined' && console && typeof console.log === 'function') {
            console.log.apply(console, arguments);
        }
    }
    function _warn() {
        if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
            console.warn.apply(console, arguments);
        }
    }
    function _error() {
        if (typeof console !== 'undefined' && console && typeof console.error === 'function') {
            console.error.apply(console, arguments);
        }
    }
    function _normalizeBaseLang(langCode) {
        if (langCode == null || langCode === '') return '';
        let raw = '';
        if (typeof langCode === 'string') raw = langCode;
        else { try { raw = String(langCode); } catch (_) { return ''; } }
        return raw.trim().split(/[-_]/)[0].toLowerCase();
    }

    if (window._piperTTS) {
        _log('[Piper TTS] Already registered, skipping duplicate load');
        return;
    }

    // ─── Constants ──────────────────────────────────────────────────────
    // CDN for the piper-tts-web library (mintplex-labs fork — works on jsDelivr)
    const PIPER_CDN = 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.4/+esm';

    // Default voice per language.
    //
    // ── 2026-08-16: seven of these ids did not exist ─────────────────────
    // voiceId MUST be a key of the PATH_MAP that piper-tts-web ships. When it
    // is not, the library computes `PATH_MAP[voiceId]` -> undefined and fetches
    //   https://huggingface.co/.../resolve/main/undefined
    //   https://huggingface.co/.../resolve/main/undefined.json
    // Hugging Face answers 404 with the plain body "Entry not found", and the
    // library's fetchBlob() never checks response.ok — so that error page is
    // written into OPFS as the "voice model", the download reports Ready 100%,
    // and the next predict() runs
    //   JSON.parse("Entry not found")
    //     -> SyntaxError: Unexpected token 'E', "Entry not found" is not valid JSON
    // which is the exact string field-reported on 2026-08-16. Spanish was one of
    // the seven (es_ES-carlfm only exists at x_low), which is why it looked like
    // a non-English-only fault.
    //
    // Verified against @mintplex-labs/piper-tts-web@1.0.4 PATH_MAP (124 keys):
    // every id below is a real key. `_resolveVoiceId` re-checks at runtime, so a
    // future library version that drops an id degrades to "no Piper voice for
    // this language" instead of poisoning the cache.
    const PIPER_VOICE_MAP = {
        'ar': { name: 'Arabic (Kareem)',         voiceId: 'ar_JO-kareem-medium' },
        'ca': { name: 'Catalan (Upc)',           voiceId: 'ca_ES-upc_ona-medium' },
        'cs': { name: 'Czech (Jirka)',           voiceId: 'cs_CZ-jirka-medium' },
        'da': { name: 'Danish (Talesyntese)',    voiceId: 'da_DK-talesyntese-medium' },
        'de': { name: 'German (Thorsten)',       voiceId: 'de_DE-thorsten-medium' },
        'el': { name: 'Greek (Rapunzelina)',     voiceId: 'el_GR-rapunzelina-low' },
        'en': { name: 'English (Lessac)',        voiceId: 'en_US-lessac-medium' },
        // Latin American Spanish: the app's Spanish users are US school
        // families. es_ES-davefx-medium (peninsular) is the alternative.
        'es': { name: 'Spanish (Ald)',           voiceId: 'es_MX-ald-medium' },
        'fi': { name: 'Finnish (Harri)',         voiceId: 'fi_FI-harri-medium' },
        'fr': { name: 'French (Siwis)',          voiceId: 'fr_FR-siwis-medium' },
        'hu': { name: 'Hungarian (Anna)',        voiceId: 'hu_HU-anna-medium' },
        'is': { name: 'Icelandic (Bui)',         voiceId: 'is_IS-bui-medium' },
        'it': { name: 'Italian (Paola)',         voiceId: 'it_IT-paola-medium' },
        'ka': { name: 'Georgian (Natia)',        voiceId: 'ka_GE-natia-medium' },
        'kk': { name: 'Kazakh (Iseke)',          voiceId: 'kk_KZ-iseke-x_low' },
        'ne': { name: 'Nepali (Google)',         voiceId: 'ne_NP-google-medium' },
        'nl': { name: 'Dutch (Mls)',             voiceId: 'nl_NL-mls-medium' },
        'no': { name: 'Norwegian (Talesyntese)', voiceId: 'no_NO-talesyntese-medium' },
        'pl': { name: 'Polish (Gosia)',          voiceId: 'pl_PL-gosia-medium' },
        'pt': { name: 'Portuguese (Faber)',      voiceId: 'pt_BR-faber-medium' },
        'ro': { name: 'Romanian (Mihai)',        voiceId: 'ro_RO-mihai-medium' },
        'ru': { name: 'Russian (Irina)',         voiceId: 'ru_RU-irina-medium' },
        'sr': { name: 'Serbian (Serbski Institut)', voiceId: 'sr_RS-serbski_institut-medium' },
        'sv': { name: 'Swedish (Nst)',           voiceId: 'sv_SE-nst-medium' },
        'sw': { name: 'Swahili (Lanfrica)',      voiceId: 'sw_CD-lanfrica-medium' },
        'tr': { name: 'Turkish (Dfki)',          voiceId: 'tr_TR-dfki-medium' },
        'uk': { name: 'Ukrainian (Ukrainian TTS)', voiceId: 'uk_UA-ukrainian_tts-medium' },
        'vi': { name: 'Vietnamese (Vais1000)',   voiceId: 'vi_VN-vais1000-medium' },
        'zh': { name: 'Chinese (HuaYang)',       voiceId: 'zh_CN-huayan-medium' },
    };

    // Preference order when the configured id is missing from a future
    // PATH_MAP and a same-language substitute has to be picked.
    const QUALITY_ORDER = ['-medium', '-high', '-low', '-x_low'];

    // ─── State ──────────────────────────────────────────────────────────
    let _currentLang = null;
    let _ready = false;
    let _lastError = null;
    let _loadProgress = 0;
    let _onProgress = null;
    let _generation = 0;
    const CACHE_MAX = 50;
    const SYNTHESIS_SPEED = 1.0;
    const _audioCache = new Map(); // exact request key -> { url, text, voiceId }
    const _ownedUrls = new Map(); // blob URL -> cache key
    const _loadedVoices = new Set(); // lang codes with downloaded voices
    const _voiceLoadPromises = new Map(); // lang code -> shared download promise
    const _activeRequests = new Set(); // cancellable public operations

    function _abortError(reason) {
        const message = reason || 'Piper TTS operation was cancelled';
        try { return new DOMException(message, 'AbortError'); }
        catch (_) {
            const error = new Error(message);
            error.name = 'AbortError';
            return error;
        }
    }

    function _signalAbortError(signal) {
        const reason = signal && signal.reason;
        return _abortError(reason && reason.message ? reason.message : (reason || 'Piper TTS request was cancelled'));
    }

    function _awaitWithSignal(promise, signal) {
        if (!signal) return promise;
        if (signal.aborted) return Promise.reject(_signalAbortError(signal));

        return new Promise((resolve, reject) => {
            let settled = false;
            const cleanup = () => signal.removeEventListener('abort', abort);
            const abort = () => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(_signalAbortError(signal));
            };
            signal.addEventListener('abort', abort, { once: true });
            Promise.resolve(promise).then(
                (value) => {
                    if (settled) return;
                    settled = true;
                    cleanup();
                    resolve(value);
                },
                (error) => {
                    if (settled) return;
                    settled = true;
                    cleanup();
                    reject(error);
                }
            );
        });
    }

    function _createRequest(callerSignal) {
        let controller;
        if (typeof AbortController === 'function') {
            controller = new AbortController();
        } else {
            const listeners = new Set();
            const fallbackSignal = {
                aborted: false,
                reason: undefined,
                addEventListener: (type, fn) => { if (type === 'abort' && typeof fn === 'function') listeners.add(fn); },
                removeEventListener: (type, fn) => { if (type === 'abort') listeners.delete(fn); },
            };
            controller = {
                signal: fallbackSignal,
                abort: (reason) => {
                    if (fallbackSignal.aborted) return;
                    fallbackSignal.aborted = true;
                    fallbackSignal.reason = reason;
                    for (const fn of Array.from(listeners)) {
                        try { fn(); } catch (_) {}
                    }
                    listeners.clear();
                },
            };
        }
        let forwardAbort = null;
        if (callerSignal) {
            if (callerSignal.aborted) {
                controller.abort(callerSignal.reason);
            } else if (typeof callerSignal.addEventListener === 'function') {
                forwardAbort = () => controller.abort(callerSignal.reason);
                callerSignal.addEventListener('abort', forwardAbort, { once: true });
            }
        }
        return {
            signal: controller.signal,
            cancel: (reason) => {
                if (!controller.signal.aborted) controller.abort(_abortError(reason));
            },
            cleanup: () => {
                if (callerSignal && forwardAbort && typeof callerSignal.removeEventListener === 'function') {
                    callerSignal.removeEventListener('abort', forwardAbort);
                }
            },
        };
    }

    function _finishRequest(request) {
        request.cleanup();
        _activeRequests.delete(request);
    }

    // Hash every case-preserving UTF-16 code unit, then validate the exact text
    // stored in the entry on every hit. Hash collisions fail safe as misses.
    function _textFingerprint(text) {
        let h1 = 0x811c9dc5;
        let h2 = 0x9e3779b9;
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            h1 = Math.imul(h1 ^ (code & 0xff), 0x01000193);
            h1 = Math.imul(h1 ^ (code >>> 8), 0x01000193);
            h2 = Math.imul(h2 ^ code, 0x85ebca6b);
            h2 = (h2 << 13) | (h2 >>> 19);
        }
        return text.length.toString(36) + ':' +
            (h1 >>> 0).toString(36) + ':' + (h2 >>> 0).toString(36);
    }

    // Piper synthesizes neutral 1x bytes, so playback speed is absent.
    function _cacheKey(text, voiceId) {
        return JSON.stringify(['piper-v2', _textFingerprint(text), voiceId, SYNTHESIS_SPEED]);
    }

    function ownsUrl(url) {
        return typeof url === 'string' && _ownedUrls.has(url);
    }

    function invalidateUrl(url) {
        const key = _ownedUrls.get(url);
        if (key === undefined) return false;
        _ownedUrls.delete(url);
        const entry = _audioCache.get(key);
        if (entry && entry.url === url) _audioCache.delete(key);
        try { URL.revokeObjectURL(url); } catch (_) {}
        return true;
    }

    function clearCache() {
        const urls = Array.from(_audioCache.values(), (entry) => entry.url);
        for (const url of urls) invalidateUrl(url);
        _audioCache.clear();
    }

    function _cacheGet(key, text, voiceId) {
        const entry = _audioCache.get(key);
        if (!entry || !ownsUrl(entry.url)) {
            if (entry) _audioCache.delete(key);
            return null;
        }
        if (entry.text !== text || entry.voiceId !== voiceId) return null;
        _audioCache.delete(key);
        _audioCache.set(key, entry);
        return entry.url;
    }

    function _cacheSet(key, text, voiceId, url) {
        const replaced = _audioCache.get(key);
        if (replaced && replaced.url !== url) invalidateUrl(replaced.url);

        _audioCache.set(key, { url, text, voiceId });
        _ownedUrls.set(url, key);
        while (_audioCache.size > CACHE_MAX) {
            const oldestKey = _audioCache.keys().next().value;
            const oldest = _audioCache.get(oldestKey);
            if (oldest) invalidateUrl(oldest.url);
            else _audioCache.delete(oldestKey);
        }
    }

    function _fireProgress(stage, pct) {
        _loadProgress = pct;
        if (typeof _onProgress === 'function') {
            try { _onProgress({ stage, pct }); } catch (_) {}
        }
        _log('[Piper TTS] ' + stage + ': ' + Math.round(pct * 100) + '%');
    }

    // ─── Initialize Library ─────────────────────────────────────────────
    let _PiperLib = null;
    let _libInitPromise = null;

    async function _ensureLibLoaded() {
        if (_PiperLib) return _PiperLib;
        if (_libInitPromise) return _libInitPromise;

        const generation = _generation;
        const promise = (async () => {
            try {
                _fireProgress('Loading Piper TTS library', 0.05);
                if (typeof window.__alloLoadVerifiedRuntime !== 'function') throw new Error('Verified Piper runtime delivery is unavailable');
                const lib = await window.__alloLoadVerifiedRuntime('piper');
                if (generation !== _generation) throw _abortError('Piper TTS was disposed while loading');
                _PiperLib = lib;
                _fireProgress('Piper library loaded', 0.15);
                return lib;
            } catch (e) {
                if (!e || e.name !== 'AbortError') {
                    console.error('[Piper TTS] Failed to load library:', e);
                }
                throw e;
            }
        })();

        _libInitPromise = promise;
        const clear = () => {
            if (_libInitPromise === promise) _libInitPromise = null;
        };
        promise.then(clear, clear);
        return promise;
    }

    // ─── voiceId validation against the library's own PATH_MAP ──────────
    // The single most important guard in this file. piper-tts-web resolves a
    // voice through PATH_MAP[voiceId]; an id that is not a key produces the
    // literal URL ".../resolve/main/undefined", a 404 body of "Entry not
    // found", and a permanently poisoned OPFS entry (see PIPER_VOICE_MAP).
    // Nothing here ever hands the library an unvalidated id.
    let _pathMap = null;                 // filled once the library is loaded
    const _unavailableLangs = new Set(); // proven to have no usable voice
    const _resolvedIds = new Map();      // baseLang -> voiceId actually usable

    function _resolveVoiceId(baseLang) {
        const configured = Object.prototype.hasOwnProperty.call(PIPER_VOICE_MAP, baseLang) ? PIPER_VOICE_MAP[baseLang] : null;
        if (!configured) return null;
        if (_resolvedIds.has(baseLang)) return _resolvedIds.get(baseLang);
        // Before the library is loaded we can only trust the table. Every id in
        // it was checked against 1.0.4's PATH_MAP, so this is the normal path.
        if (!_pathMap) return configured.voiceId;
        if (Object.prototype.hasOwnProperty.call(_pathMap, configured.voiceId)) {
            _resolvedIds.set(baseLang, configured.voiceId);
            return configured.voiceId;
        }
        // The library dropped the id. Pick the best same-language substitute
        // rather than fetching a URL we know is wrong.
        const prefix = String(configured.voiceId).split('_')[0] + '_';
        const candidates = Object.keys(_pathMap).filter((k) => k.indexOf(prefix) === 0);
        let picked = null;
        for (const suffix of QUALITY_ORDER) {
            picked = candidates.find((k) => k.endsWith(suffix)) || null;
            if (picked) break;
        }
        if (!picked) picked = candidates[0] || null;
        if (picked) {
            console.warn('[Piper TTS] "' + configured.voiceId + '" is not in this library build; using "' + picked + '" for ' + baseLang + '.');
        } else {
            console.warn('[Piper TTS] No voice model available for ' + baseLang + ' in this library build.');
            _unavailableLangs.add(baseLang);
        }
        _resolvedIds.set(baseLang, picked);
        return picked;
    }

    function _isRemoteBlocked() {
        return typeof window !== 'undefined' && (
            window._isDesktopBundledApp === true ||
            window.__alloOfflineOnly === true ||
            window.__ALLO_LOCAL_BOX === true ||
            !!window.__alloQrStudentMode ||
            window._alloQrBlocked === true ||
            window.__alloStudentAiDisabled === true
        );
    }

    // Returns 'ok' | 'invalid' | 'transient'. Only permanent bad configs (404/410
    // or non-JSON 200 error pages) are 'invalid' and evict/blacklist the voice;
    // transient network/5xx/timeout errors return 'transient' so offline/flaky
    // sessions keep cached OPFS voices and can retry later.
    async function _configIsReal(lib, voiceId) {
        let controller = null;
        let timer = null;
        try {
            if (_isRemoteBlocked()) return 'transient';
            // Without PATH_MAP we cannot build the URL the library will use, so
            // there is nothing to pre-flight. Do not fail closed on a library
            // shape we do not recognise: the eviction, purge and corrupt-error
            // guards still cover the failure, and refusing every voice because
            // one export is missing would be worse than the bug being fixed.
            if (!lib || !lib.PATH_MAP) return 'ok';
            const path = Object.prototype.hasOwnProperty.call(lib.PATH_MAP, voiceId) ? lib.PATH_MAP[voiceId] : null;
            const base = lib.HF_BASE || 'https://huggingface.co/diffusionstudio/piper-voices/resolve/840e38a7e26d813bd6221b78cfbaefa3585b3f71';
            if (!path) return 'invalid';
            if (typeof AbortController !== 'undefined') {
                controller = new AbortController();
                timer = setTimeout(() => controller.abort(), 15000);
            }
            const fetchOpts = controller ? { signal: controller.signal, credentials: 'omit' } : { credentials: 'omit' };
            const res = await fetch(base + '/' + path + '.json', fetchOpts);
            if (!res.ok) {
                _warn('[Piper TTS] Voice config for ' + voiceId + ' returned HTTP ' + res.status + '; skipping this voice.');
                return (res.status === 404 || res.status === 410) ? 'invalid' : 'transient';
            }
            const text = await res.text();
            try {
                JSON.parse(text); // an error page fails here, before it can be cached
            } catch (parseErr) {
                _warn('[Piper TTS] Voice config for ' + voiceId + ' is not valid JSON:', (parseErr && parseErr.message) || parseErr);
                return 'invalid';
            }
            return 'ok';
        } catch (e) {
            _warn('[Piper TTS] Voice config check for ' + voiceId + ' failed transiently:', (e && e.message) || e);
            return 'transient';
        } finally {
            if (timer !== null) clearTimeout(timer);
        }
    }

    // ─── One-time cleanup of already-poisoned OPFS entries ──────────────
    // Devices that ran the previous build have files in OPFS named literally
    // "undefined" and "undefined.json" (the 404 error page saved under the
    // last path segment of ".../resolve/main/undefined"). The library's own
    // stored()/remove() cannot see or delete them: stored() only lists .onnx
    // files whose key is in PATH_MAP, and remove() recomputes the same
    // undefined path only for an id that is still broken. Correcting the voice
    // table therefore does not un-break an already-poisoned device, so clear
    // the bad entries directly, once per session.
    //
    // Also drops any cached voice file under 1 KB: a genuine .onnx is
    // megabytes and a genuine config is hundreds of bytes of JSON, so anything
    // that small is an error page from some other interrupted download.
    let _purgePromise = null;
    function _purgePoisonedEntries() {
        if (_purgePromise) return _purgePromise;
        _purgePromise = (async () => {
            try {
                if (typeof navigator === 'undefined' || !navigator || !navigator.storage || typeof navigator.storage.getDirectory !== 'function') return 0;
                const root = await navigator.storage.getDirectory();
                let dir;
                try { dir = await root.getDirectoryHandle('piper'); }
                catch (_) { return 0; } // nothing cached yet
                const doomed = [];
                for await (const [name, handle] of dir.entries()) {
                    if (!handle || handle.kind !== 'file') continue;
                    if (name === 'undefined' || name.indexOf('undefined.') === 0) { doomed.push(name); continue; }
                    try {
                        const file = await handle.getFile();
                        if (file.size < 1024) doomed.push(name);
                    } catch (_) {}
                }
                for (const name of doomed) {
                    try { await dir.removeEntry(name); } catch (_) {}
                }
                if (doomed.length) {
                    _warn('[Piper TTS] Removed ' + doomed.length + ' unusable cached voice file(s):', doomed);
                }
                return doomed.length;
            } catch (e) {
                _warn('[Piper TTS] Could not check the voice cache:', (e && e.message) || e);
                return 0;
            }
        })();
        return _purgePromise;
    }

    // ─── Download a Voice Model for a Language ──────────────────────────
    async function _ensureVoice(langCode, options) {
        const signal = options && options.signal;
        if (signal && signal.aborted) throw _signalAbortError(signal);
        const baseLang = _normalizeBaseLang(langCode);
        if (!baseLang) return false;

        if (_loadedVoices.has(baseLang)) {
            _currentLang = baseLang;
            return true;
        }
        if (_unavailableLangs.has(baseLang)) return false;

        const voiceInfo = Object.prototype.hasOwnProperty.call(PIPER_VOICE_MAP, baseLang) ? PIPER_VOICE_MAP[baseLang] : null;
        if (!voiceInfo) {
            _warn('[Piper TTS] No voice model for language:', baseLang);
            return false;
        }

        let promise = _voiceLoadPromises.get(baseLang);
        if (!promise) {
            const generation = _generation;
            promise = (async () => {
                try {
                    await _purgePoisonedEntries();
                    if (generation !== _generation) throw _abortError('Piper TTS was disposed while checking cache');
                    const lib = await _ensureLibLoaded();
                    if (generation !== _generation) throw _abortError('Piper TTS was disposed while loading');
                    if (!_pathMap && lib && lib.PATH_MAP) _pathMap = lib.PATH_MAP;
                    const voiceId = _resolveVoiceId(baseLang);
                    if (!voiceId) {
                        if (generation === _generation) _unavailableLangs.add(baseLang);
                        return false;
                    }
                    _fireProgress('Downloading ' + voiceInfo.name + ' voice', 0.2);

                    const tryStoredVoice = async () => {
                        const storedList = typeof lib.stored === 'function' ? await lib.stored().catch(() => []) : [];
                        if (generation !== _generation) {
                            throw _abortError('Piper TTS was disposed while checking cached voices');
                        }
                        if (Array.isArray(storedList) && storedList.includes(voiceId)) {
                            _loadedVoices.add(baseLang);
                            _currentLang = baseLang;
                            _ready = true;
                            _fireProgress('Ready', 1.0);
                            return true;
                        }
                        return false;
                    };

                    if (_isRemoteBlocked() || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
                        if (await tryStoredVoice()) return true;
                        return false;
                    }

                    const configStatus = await _configIsReal(lib, voiceId);
                    if (generation !== _generation) throw _abortError('Piper TTS was disposed while verifying voice config');
                    if (configStatus !== 'ok') {
                        if (configStatus === 'invalid') {
                            // Anything already sitting in OPFS for this voice came
                            // from the same bad response, so throw it out too.
                            await _evictVoice(lib, voiceId, baseLang);
                            if (generation === _generation) _unavailableLangs.add(baseLang);
                            return false;
                        }
                        // Transient network failure: reuse an already-downloaded OPFS voice if present.
                        return tryStoredVoice();
                    }

                    // Pre-download the voice model into the OPFS cache with stall timeout watchdog.
                    if (typeof lib.download === 'function') {
                        let stallTimer = null;
                        try {
                            await new Promise((resolve, reject) => {
                                const resetStall = () => {
                                    if (stallTimer !== null) clearTimeout(stallTimer);
                                    stallTimer = setTimeout(() => {
                                        reject(new Error('Piper TTS voice download timed out for ' + voiceId));
                                    }, 90000);
                                };
                                resetStall();
                                Promise.resolve(lib.download(voiceId, function (progress) {
                                    resetStall();
                                    if (generation !== _generation) return;
                                    var pct = 0.2 + (progress && progress.progress ? progress.progress * 0.6 : 0);
                                    _fireProgress('Downloading ' + voiceInfo.name, pct);
                                })).then(resolve, reject);
                            });
                        } finally {
                            if (stallTimer !== null) clearTimeout(stallTimer);
                        }
                    }

                    if (generation !== _generation) {
                        throw _abortError('Piper TTS was disposed while downloading a voice');
                    }
                    _loadedVoices.add(baseLang);
                    _currentLang = baseLang;
                    _ready = true;
                    _fireProgress('Ready', 1.0);
                    _log('[Piper TTS] Voice ready for: ' + voiceInfo.name + ' (' + voiceId + ')');
                    return true;
                } catch (e) {
                    if (e && e.name === 'AbortError') throw e;
                    _error('[Piper TTS] Failed to load voice for ' + baseLang + ':', e);
                    return false;
                }
            })();

            _voiceLoadPromises.set(baseLang, promise);
            const clear = () => {
                if (_voiceLoadPromises.get(baseLang) === promise) {
                    _voiceLoadPromises.delete(baseLang);
                }
            };
            promise.then(clear, clear);
        }

        return _awaitWithSignal(promise, signal);
    }

    // ─── Initialize ─────────────────────────────────────────────────────
    async function init(lang, onProgress, options) {
        _onProgress = onProgress || null;
        lang = lang || 'en';
        const request = _createRequest(options && options.signal);
        _activeRequests.add(request);
        try {
            const ready = await _ensureVoice(lang, { signal: request.signal });
            if (request.signal.aborted) throw _signalAbortError(request.signal);
            return ready;
        } finally {
            _finishRequest(request);
        }
    }

    // ─── Poisoned voice-model cache: detect and self-heal ───────────────
    // piper-tts-web caches each voice in OPFS (navigator.storage →
    // "piper"/<file>.onnx). Its download path does NOT check response.ok and
    // never compares the streamed byte count against Content-Length, so an
    // interrupted or error-page response is written to that cache as a
    // truncated file with no complaint. Nothing invalidates it afterwards:
    // the read path uses the file whenever it EXISTS, so every later attempt
    // feeds the same bad bytes to onnxruntime and gets
    //   "Can't create a session ... No graph was found in the protobuf"
    // forever, with no way out from inside the app.
    //
    // The library does export remove()/flush(), so the recovery is available
    // — it just was never wired up. Evict on that signature and retry once.
    // Keyed off the ACTUAL failure rather than a guessed size threshold,
    // because low-quality voices are legitimately small and a threshold
    // would throw away good models.
    function _isCorruptModelError(e) {
        const msg = String((e && (e.message || e.toString && e.toString())) || '');
        return /no graph was found in the protobuf/i.test(msg)
            || /can't create a session/i.test(msg)
            || /failed to load model/i.test(msg)
            || /protobuf parsing failed/i.test(msg)
            // A cached HTTP error page reaches us as a JSON parse failure on the
            // voice CONFIG rather than an onnx session failure. Same disease,
            // same cure: evict and re-download once. Without these patterns the
            // 2026-08-16 "Unexpected token 'E' ... Entry not found ... is not
            // valid JSON" state was permanent for that language.
            || /is not valid json/i.test(msg)
            || /unexpected token/i.test(msg)
            || /unexpected end of json input/i.test(msg)
            || /entry not found/i.test(msg);
    }

    async function _evictVoice(lib, voiceId, baseLang) {
        let evicted = false;
        try {
            if (lib && typeof lib.remove === 'function') {
                await lib.remove(voiceId);
                evicted = true;
            } else if (lib && typeof lib.flush === 'function') {
                await lib.flush();
                evicted = true;
            }
        } catch (err) {
            console.warn('[Piper TTS] Could not evict the cached voice:', err);
        }
        // Force the next request to re-run the download path.
        if (baseLang) _loadedVoices.delete(baseLang);
        _voiceLoadPromises.delete(baseLang);
        return evicted;
    }

    // ─── Per-language session reset ─────────────────────────────────────
    // piper-tts-web keeps ONE TtsSession in a static `_instance`. Its
    // constructor short-circuits on a second call: it reassigns `voiceId` and
    // returns the existing instance WITHOUT re-running init(), so the ONNX
    // session and model config stay those of the first language loaded. The
    // result is that the second language in a session is synthesized with the
    // first language's model — Spanish text read by the Ukrainian voice, and so
    // on. Dropping the static instance forces a real init for the new voice.
    // `_instance` is a plain public static field on the exported class, so this
    // uses only what the package exposes.
    let _sessionVoiceId = null;
    let _predictQueue = Promise.resolve();
    function _prepareSessionFor(lib, voiceId, force) {
        try {
            if (!force && _sessionVoiceId === voiceId) return;
            const Session = lib && lib.TtsSession;
            if (Session && Object.prototype.hasOwnProperty.call(Session, '_instance')) {
                Session._instance = null;
            }
            _sessionVoiceId = null;
        } catch (_) { /* fall through: a stale session is still better than a throw */ }
    }
    function _runSerializedPredict(lib, voiceId, text, signal, forceReset) {
        const exec = async () => {
            if (signal && signal.aborted) throw _signalAbortError(signal);
            _prepareSessionFor(lib, voiceId, forceReset);
            try {
                const blob = await _awaitWithSignal(Promise.resolve(lib.predict({
                    text: text,
                    voiceId: voiceId
                })), signal);
                if (signal && signal.aborted) throw _signalAbortError(signal);
                _sessionVoiceId = voiceId;
                return blob;
            } catch (err) {
                _sessionVoiceId = null;
                throw err;
            }
        };
        const slot = _predictQueue.then(exec, exec);
        _predictQueue = slot.then(() => {}, () => {});
        return _awaitWithSignal(slot, signal);
    }

    // ─── Generate Speech ────────────────────────────────────────────────
    async function speak(text, lang, speed, options) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) return null;

        options = options || {};
        const force = options.force === true;
        const baseLang = _normalizeBaseLang(lang || 'en') || 'en';
        const request = _createRequest(options.signal);
        _activeRequests.add(request);
        const signal = request.signal;

        try {
            if (signal.aborted) throw _signalAbortError(signal);
            const loaded = await _ensureVoice(baseLang, { signal });
            if (signal.aborted) throw _signalAbortError(signal);
            if (!loaded) return null;

            const voiceInfo = Object.prototype.hasOwnProperty.call(PIPER_VOICE_MAP, baseLang) ? PIPER_VOICE_MAP[baseLang] : null;
            if (!voiceInfo) return null;
            const voiceId = _resolveVoiceId(baseLang);
            if (!voiceId) return null;

            const cacheKey = _cacheKey(text, voiceId);
            const cached = _cacheGet(cacheKey, text, voiceId);
            if (cached && !force) return cached;

            const lib = await _awaitWithSignal(_ensureLibLoaded(), signal);
            if (signal.aborted) throw _signalAbortError(signal);
            // predict() returns neutral-speed WAV bytes. The Audio element owns
            // playbackRate, so speed is not applied a second time here.
            let blob;
            try {
                blob = await _runSerializedPredict(lib, voiceId, text, signal, false);
            } catch (predictErr) {
                if (predictErr && predictErr.name === 'AbortError') throw predictErr;
                if (!_isCorruptModelError(predictErr)) throw predictErr;
                // The cached model is unusable and will stay that way until it
                // is thrown out. Do that, re-download, and try once.
                _warn('[Piper TTS] Cached voice model is unusable — clearing it and re-downloading once.', predictErr);
                _fireProgress('Repairing the ' + voiceInfo.name + ' voice download', 0.1);
                await _evictVoice(lib, voiceId, baseLang);
                if (signal.aborted) throw _signalAbortError(signal);
                const reloaded = await _ensureVoice(baseLang, { signal });
                if (signal.aborted) throw _signalAbortError(signal);
                if (!reloaded) return null;
                blob = await _runSerializedPredict(lib, voiceId, text, signal, true);
                _log('[Piper TTS] Voice model repaired after re-download.');
            }
            if (signal.aborted) throw _signalAbortError(signal);

            if (!blob) {
                _warn('[Piper TTS] predict() returned empty result');
                return null;
            }

            const raced = _cacheGet(cacheKey, text, voiceId);
            if (raced && !force) return raced;

            const audioUrl = URL.createObjectURL(blob);
            if (!audioUrl) return null;
            _cacheSet(cacheKey, text, voiceId, audioUrl);
            _log('[Piper TTS] Generated audio for:', text.substring(0, 40));
            return audioUrl;
        } catch (e) {
            if (e && e.name === 'AbortError') throw e;
            // Piper is a FALLBACK leg. Returning null hands the utterance to the
            // next engine; the message stays in the console and in lastError for
            // diagnostics and is never shown to a learner.
            _lastError = String((e && e.message) || e || 'unknown');
            _error('[Piper TTS] Generation failed:', e);
            return null;
        } finally {
            _finishRequest(request);
        }
    }

    // ─── Language Support Check ─────────────────────────────────────────
    // Synchronous, because the TTS cascade asks before the library is loaded.
    // Once a language has been PROVEN to have no usable model it is excluded,
    // so the cascade stops handing Piper work it cannot do and the utterance
    // goes to the next engine instead of failing.
    function supportsLanguage(langCode) {
        var baseLang = _normalizeBaseLang(langCode);
        if (!baseLang) return false;
        if (_unavailableLangs.has(baseLang)) return false;
        return Object.prototype.hasOwnProperty.call(PIPER_VOICE_MAP, baseLang);
    }

    // Has this language's model finished downloading to this device? The
    // narrator settings panel used supportsLanguage() for this and therefore
    // told the user "Piper Neural Voice — auto-selected" for a voice that had
    // never been downloaded.
    function isLanguageReady(langCode) {
        var baseLang = _normalizeBaseLang(langCode);
        if (!baseLang) return false;
        return _loadedVoices.has(baseLang);
    }

    // Check OPFS for an already-downloaded model without initiating any download.
    // Lets Voice Settings and Student AI-Off wake a previously saved language
    // voice across page reloads without surprising bandwidth-constrained users.
    async function isLanguageStored(langCode) {
        var baseLang = _normalizeBaseLang(langCode);
        if (!baseLang || _unavailableLangs.has(baseLang)) return false;
        if (_loadedVoices.has(baseLang)) return true;
        if (!Object.prototype.hasOwnProperty.call(PIPER_VOICE_MAP, baseLang)) return false;
        try {
            await _purgePoisonedEntries();
            const lib = await _ensureLibLoaded();
            if (!_pathMap && lib && lib.PATH_MAP) _pathMap = lib.PATH_MAP;
            const voiceId = _resolveVoiceId(baseLang);
            if (!voiceId || !lib || typeof lib.stored !== 'function') return false;
            const storedList = await lib.stored().catch(() => []);
            if (Array.isArray(storedList) && storedList.includes(voiceId)) {
                _loadedVoices.add(baseLang);
                _ready = true;
                return true;
            }
            return false;
        } catch (_) {
            return false;
        }
    }

    function getSupportedLanguages() {
        return Object.entries(PIPER_VOICE_MAP).map(function (entry) {
            return { code: entry[0], name: entry[1].name };
        });
    }

    // ─── Proactive Language Preloading ──────────────────────────────────
    // Downloads voice model in background so first TTS request is instant.
    async function preloadLanguage(langCode, options) {
        var baseLang = _normalizeBaseLang(langCode);
        if (!baseLang) return false;
        if (baseLang === 'en') return true; // Kokoro handles English
        if (!Object.prototype.hasOwnProperty.call(PIPER_VOICE_MAP, baseLang)) return false;

        const prevProgress = _onProgress;
        if (options && typeof options.onProgress === 'function') _onProgress = options.onProgress;
        const request = _createRequest(options && options.signal);
        _activeRequests.add(request);
        try {
            const ready = await _ensureVoice(baseLang, { signal: request.signal });
            if (request.signal.aborted) throw _signalAbortError(request.signal);
            return ready;
        } finally {
            if (options && typeof options.onProgress === 'function' && _onProgress === options.onProgress) {
                _onProgress = prevProgress;
            }
            _finishRequest(request);
        }
    }

    // Remove one language's cached OPFS model to free device storage without
    // wiping other downloaded languages.
    async function removeLanguage(langCode) {
        var baseLang = _normalizeBaseLang(langCode);
        if (!baseLang || !Object.prototype.hasOwnProperty.call(PIPER_VOICE_MAP, baseLang)) return false;
        try {
            const lib = await _ensureLibLoaded();
            if (!_pathMap && lib && lib.PATH_MAP) _pathMap = lib.PATH_MAP;
            const voiceId = _resolveVoiceId(baseLang) || PIPER_VOICE_MAP[baseLang].voiceId;
            if (!voiceId) return false;
            const removed = await _evictVoice(lib, voiceId, baseLang);
            if (_sessionVoiceId === voiceId) _sessionVoiceId = null;
            if (_loadedVoices.size === 0) _ready = false;
            clearCache();
            _log('[Piper TTS] Removed cached voice for:', baseLang, '(' + voiceId + ')');
            return removed;
        } catch (e) {
            _warn('[Piper TTS] removeLanguage failed for ' + baseLang + ':', e);
            return false;
        }
    }

    function stop(reason) {
        const requests = Array.from(_activeRequests);
        for (const request of requests) {
            request.cancel(reason || 'Piper TTS stopped');
        }
        return requests.length > 0;
    }

    function dispose(reason) {
        stop(reason || 'Piper TTS disposed');
        _generation++;
        clearCache();
        _ready = false;
        _currentLang = null;
        _loadProgress = 0;
        _onProgress = null;
        _PiperLib = null;
        _libInitPromise = null;
        _purgePromise = null;
        _loadedVoices.clear();
        _voiceLoadPromises.clear();
        _unavailableLangs.clear();
        _resolvedIds.clear();
        _pathMap = null;
        _sessionVoiceId = null;
        _lastError = null;
    }

    // Drop every cached voice model so the next request downloads fresh.
    // Reports what it did rather than failing silently, because the whole
    // point is to diagnose a download that went wrong once and then stuck.
    async function repairVoices() {
        stop('Piper TTS repairing voices');
        _generation++;
        _purgePromise = null;
        let lib = null;
        try { lib = await _ensureLibLoaded(); } catch (e) {
            _warn('[Piper TTS] repairVoices: library unavailable', e);
        }
        let names = [];
        try {
            if (lib && typeof lib.stored === 'function') {
                const raw = await lib.stored();
                names = Array.isArray(raw) ? raw : [];
            }
        } catch (_) {}
        try {
            if (lib && typeof lib.flush === 'function') await lib.flush();
        } catch (e) {
            _warn('[Piper TTS] repairVoices: flush failed', e);
        }
        _loadedVoices.clear();
        _voiceLoadPromises.clear();
        _unavailableLangs.clear();
        _resolvedIds.clear();
        _sessionVoiceId = null;
        _lastError = null;
        _ready = false;
        _currentLang = null;
        clearCache();
        _log('[Piper TTS] Cleared ' + names.length + ' cached voice file(s):', names);
        return names;
    }

    // ─── Expose Global API ──────────────────────────────────────────────
    window._piperTTS = {
        init: init,
        speak: speak,
        preloadLanguage: preloadLanguage,
        removeLanguage: removeLanguage,
        stop: stop,
        dispose: dispose,
        ownsUrl: ownsUrl,
        invalidateUrl: invalidateUrl,
        clearCache: clearCache,
        // Throw away the downloaded voice MODELS (OPFS), not just the audio
        // cache. speak() self-heals on the corrupt-model signature, but a
        // download can also go bad in ways that surface differently, so keep
        // a manual escape hatch: window._piperTTS.repairVoices().
        repairVoices: repairVoices,
        supportsLanguage: supportsLanguage,
        isLanguageReady: isLanguageReady,
        isLanguageStored: isLanguageStored,
        getSupportedLanguages: getSupportedLanguages,
        voiceMap: PIPER_VOICE_MAP,
        // Diagnostics only. Nothing user-facing reads this; it exists so a
        // support conversation can find out WHY a language went quiet without
        // the learner ever seeing a parser error.
        get lastError() { return _lastError; },
        get ready() { return _ready; },
        get progress() { return _loadProgress; },
        get currentLang() { return _currentLang; },
        get synthesisRate() { return SYNTHESIS_SPEED; },
    };

    _log('[Piper TTS] Loader registered. Supports', Object.keys(PIPER_VOICE_MAP).length, 'languages.');
})();
