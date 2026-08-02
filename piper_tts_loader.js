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

    if (window._piperTTS) {
        console.log('[Piper TTS] Already registered, skipping duplicate load');
        return;
    }

    // ─── Constants ──────────────────────────────────────────────────────
    // CDN for the piper-tts-web library (mintplex-labs fork — works on jsDelivr)
    const PIPER_CDN = 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.4/+esm';

    // Default voice per language (quality: medium for best balance)
    // voiceId matches the PATH_MAP keys in the piper-tts-web package
    const PIPER_VOICE_MAP = {
        'ar': { name: 'Arabic (Kareem)',         voiceId: 'ar_JO-kareem-medium' },
        'ca': { name: 'Catalan (Upc)',           voiceId: 'ca_ES-upc_ona-medium' },
        'cs': { name: 'Czech (Jirka)',           voiceId: 'cs_CZ-jirka-medium' },
        'da': { name: 'Danish (Talesyntese)',    voiceId: 'da_DK-talesyntese-medium' },
        'de': { name: 'German (Thorsten)',       voiceId: 'de_DE-thorsten-medium' },
        'el': { name: 'Greek (Rapunzel)',        voiceId: 'el_GR-rapunzelina-medium' },
        'en': { name: 'English (Lessac)',        voiceId: 'en_US-lessac-medium' },
        'es': { name: 'Spanish (Carlfm)',        voiceId: 'es_ES-carlfm-medium' },
        'fi': { name: 'Finnish (Harri)',         voiceId: 'fi_FI-harri-medium' },
        'fr': { name: 'French (Siwis)',          voiceId: 'fr_FR-siwis-medium' },
        'hu': { name: 'Hungarian (Anna)',        voiceId: 'hu_HU-anna-medium' },
        'is': { name: 'Icelandic (Bui)',         voiceId: 'is_IS-bui-medium' },
        'it': { name: 'Italian (Riccardo)',      voiceId: 'it_IT-riccardo-medium' },
        'ka': { name: 'Georgian (Natia)',        voiceId: 'ka_GE-natia-medium' },
        'kk': { name: 'Kazakh (Isseke)',         voiceId: 'kk_KZ-iseke-medium' },
        'ne': { name: 'Nepali (Google)',         voiceId: 'ne_NP-google-medium' },
        'nl': { name: 'Dutch (Mls)',             voiceId: 'nl_NL-mls-medium' },
        'no': { name: 'Norwegian (Talesyntese)', voiceId: 'no_NO-talesyntese-medium' },
        'pl': { name: 'Polish (Gosia)',          voiceId: 'pl_PL-gosia-medium' },
        'pt': { name: 'Portuguese (Faber)',      voiceId: 'pt_BR-faber-medium' },
        'ro': { name: 'Romanian (Mihai)',        voiceId: 'ro_RO-mihai-medium' },
        'ru': { name: 'Russian (Irina)',         voiceId: 'ru_RU-irina-medium' },
        'sr': { name: 'Serbian (Srecko)',        voiceId: 'sr_RS-srecko-medium' },
        'sv': { name: 'Swedish (Nst)',           voiceId: 'sv_SE-nst-medium' },
        'sw': { name: 'Swahili (Lanfrica)',      voiceId: 'sw_CD-lanfrica-medium' },
        'tr': { name: 'Turkish (Dfki)',          voiceId: 'tr_TR-dfki-medium' },
        'uk': { name: 'Ukrainian (Lada)',        voiceId: 'uk_UA-lada-medium' },
        'vi': { name: 'Vietnamese (25hours)',    voiceId: 'vi_VN-25hours_single-medium' },
        'zh': { name: 'Chinese (HuaYang)',       voiceId: 'zh_CN-huayan-medium' },
    };

    // ─── State ──────────────────────────────────────────────────────────
    let _currentLang = null;
    let _ready = false;
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
        const controller = new AbortController();
        let forwardAbort = null;
        if (callerSignal) {
            if (callerSignal.aborted) {
                controller.abort(callerSignal.reason);
            } else {
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
                if (callerSignal && forwardAbort) {
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
        if (_onProgress) _onProgress({ stage, pct });
        console.log('[Piper TTS] ' + stage + ': ' + Math.round(pct * 100) + '%');
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
                const lib = await import(/* webpackIgnore: true */ PIPER_CDN);
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

    // ─── Download a Voice Model for a Language ──────────────────────────
    async function _ensureVoice(langCode, options) {
        const signal = options && options.signal;
        if (signal && signal.aborted) throw _signalAbortError(signal);
        const baseLang = langCode.split('-')[0].toLowerCase();

        if (_loadedVoices.has(baseLang)) {
            _currentLang = baseLang;
            return true;
        }

        const voiceInfo = PIPER_VOICE_MAP[baseLang];
        if (!voiceInfo) {
            console.warn('[Piper TTS] No voice model for language:', baseLang);
            return false;
        }

        let promise = _voiceLoadPromises.get(baseLang);
        if (!promise) {
            const generation = _generation;
            promise = (async () => {
                try {
                    const lib = await _ensureLibLoaded();
                    _fireProgress('Downloading ' + voiceInfo.name + ' voice', 0.2);

                    // Pre-download the voice model into IndexedDB cache.
                    if (lib.download) {
                        await lib.download(voiceInfo.voiceId, function (progress) {
                            var pct = 0.2 + (progress && progress.progress ? progress.progress * 0.6 : 0);
                            _fireProgress('Downloading ' + voiceInfo.name, pct);
                        });
                    }

                    if (generation !== _generation) {
                        throw _abortError('Piper TTS was disposed while downloading a voice');
                    }
                    _loadedVoices.add(baseLang);
                    _currentLang = baseLang;
                    _ready = true;
                    _fireProgress('Ready', 1.0);
                    console.log('[Piper TTS] Voice ready for: ' + voiceInfo.name);
                    return true;
                } catch (e) {
                    if (e && e.name === 'AbortError') throw e;
                    console.error('[Piper TTS] Failed to load voice for ' + baseLang + ':', e);
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

    // ─── Generate Speech ────────────────────────────────────────────────
    async function speak(text, lang, speed, options) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) return null;

        options = options || {};
        const request = _createRequest(options.signal);
        _activeRequests.add(request);
        const signal = request.signal;
        lang = lang || 'en';
        const baseLang = lang.split('-')[0].toLowerCase();

        try {
            if (signal.aborted) throw _signalAbortError(signal);
            const loaded = await _ensureVoice(baseLang, { signal });
            if (signal.aborted) throw _signalAbortError(signal);
            if (!loaded) return null;

            const voiceInfo = PIPER_VOICE_MAP[baseLang];
            if (!voiceInfo) return null;

            const cacheKey = _cacheKey(text, voiceInfo.voiceId);
            const cached = _cacheGet(cacheKey, text, voiceInfo.voiceId);
            if (cached) return cached;

            const lib = await _awaitWithSignal(_ensureLibLoaded(), signal);
            if (signal.aborted) throw _signalAbortError(signal);
            // predict() returns neutral-speed WAV bytes. The Audio element owns
            // playbackRate, so speed is not applied a second time here.
            const blob = await _awaitWithSignal(Promise.resolve(lib.predict({
                text: text,
                voiceId: voiceInfo.voiceId
            })), signal);
            if (signal.aborted) throw _signalAbortError(signal);

            if (!blob) {
                console.warn('[Piper TTS] predict() returned empty result');
                return null;
            }

            const raced = _cacheGet(cacheKey, text, voiceInfo.voiceId);
            if (raced) return raced;

            const audioUrl = URL.createObjectURL(blob);
            if (!audioUrl) return null;
            _cacheSet(cacheKey, text, voiceInfo.voiceId, audioUrl);
            console.log('[Piper TTS] Generated audio for:', text.substring(0, 40));
            return audioUrl;
        } catch (e) {
            if (e && e.name === 'AbortError') throw e;
            console.error('[Piper TTS] Generation failed:', e);
            return null;
        } finally {
            _finishRequest(request);
        }
    }

    // ─── Language Support Check ─────────────────────────────────────────
    function supportsLanguage(langCode) {
        if (!langCode) return false;
        var baseLang = langCode.split('-')[0].toLowerCase();
        return baseLang in PIPER_VOICE_MAP;
    }

    function getSupportedLanguages() {
        return Object.entries(PIPER_VOICE_MAP).map(function (entry) {
            return { code: entry[0], name: entry[1].name };
        });
    }

    // ─── Proactive Language Preloading ──────────────────────────────────
    // Downloads voice model in background so first TTS request is instant.
    async function preloadLanguage(langCode, options) {
        if (!langCode) return false;
        var baseLang = langCode.split('-')[0].toLowerCase();
        if (baseLang === 'en') return true; // Kokoro handles English
        if (!(baseLang in PIPER_VOICE_MAP)) return false;

        const request = _createRequest(options && options.signal);
        _activeRequests.add(request);
        try {
            const ready = await _ensureVoice(baseLang, { signal: request.signal });
            if (request.signal.aborted) throw _signalAbortError(request.signal);
            return ready;
        } finally {
            _finishRequest(request);
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
        _loadedVoices.clear();
        _voiceLoadPromises.clear();
    }

    // ─── Expose Global API ──────────────────────────────────────────────
    window._piperTTS = {
        init: init,
        speak: speak,
        preloadLanguage: preloadLanguage,
        stop: stop,
        dispose: dispose,
        ownsUrl: ownsUrl,
        invalidateUrl: invalidateUrl,
        clearCache: clearCache,
        supportsLanguage: supportsLanguage,
        getSupportedLanguages: getSupportedLanguages,
        voiceMap: PIPER_VOICE_MAP,
        get ready() { return _ready; },
        get progress() { return _loadProgress; },
        get currentLang() { return _currentLang; },
        get synthesisRate() { return SYNTHESIS_SPEED; },
    };

    console.log('[Piper TTS] Loader registered. Supports', Object.keys(PIPER_VOICE_MAP).length, 'languages.');
})();
