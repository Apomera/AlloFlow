/**
 * piper_tts_loader.js — AlloFlow TTS Provider (Language Fallback)
 *
 * Loads Piper TTS (WASM) in the browser for text-to-speech in languages
 * that Kokoro doesn't support (40+ languages, 100+ voices).
 *
 * Uses @mintplex-labs/piper-tts-web which provides predict({ text, voiceId }) → Blob
 *
 * Exposes: window._piperTTS = { init(), speak(text, lang, speed), voices, ready }
 *
 * License: MIT (Piper) + MIT (piper-tts-web)
 * Models: ~15-75MB per voice, downloaded on-demand and cached
 */
(function () {
    'use strict';

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
    const _audioCache = new Map();
    const _loadedVoices = new Set(); // lang codes with downloaded voices

    let _onProgress = null;

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

        _libInitPromise = (async () => {
            try {
                _fireProgress('Loading Piper TTS library', 0.05);
                _PiperLib = await import(/* webpackIgnore: true */ PIPER_CDN);
                _fireProgress('Piper library loaded', 0.15);
                return _PiperLib;
            } catch (e) {
                console.error('[Piper TTS] Failed to load library:', e);
                _libInitPromise = null;
                throw e;
            }
        })();

        return _libInitPromise;
    }

    // ─── Download a Voice Model for a Language ──────────────────────────
    async function _ensureVoice(langCode) {
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

        try {
            var lib = await _ensureLibLoaded();

            _fireProgress('Downloading ' + voiceInfo.name + ' voice', 0.2);

            // Pre-download the voice model into IndexedDB cache
            if (lib.download) {
                await lib.download(voiceInfo.voiceId, function (progress) {
                    var pct = 0.2 + (progress && progress.progress ? progress.progress * 0.6 : 0);
                    _fireProgress('Downloading ' + voiceInfo.name, pct);
                });
            }

            _loadedVoices.add(baseLang);
            _currentLang = baseLang;
            _ready = true;

            _fireProgress('Ready', 1.0);
            console.log('[Piper TTS] Voice ready for: ' + voiceInfo.name);
            return true;
        } catch (e) {
            console.error('[Piper TTS] Failed to load voice for ' + baseLang + ':', e);
            return false;
        }
    }

    // ─── Initialize ─────────────────────────────────────────────────────
    async function init(lang, onProgress) {
        _onProgress = onProgress || null;
        lang = lang || 'en';
        return _ensureVoice(lang);
    }

    // ─── Generate Speech ────────────────────────────────────────────────
    async function speak(text, lang, speed) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) return null;

        lang = lang || 'en';
        speed = speed || 1.0;
        var baseLang = lang.split('-')[0].toLowerCase();

        // Load voice for this language if not already loaded
        var loaded = await _ensureVoice(baseLang);
        if (!loaded) return null;

        var voiceInfo = PIPER_VOICE_MAP[baseLang];
        if (!voiceInfo) return null;

        // Cache check
        var cacheKey = 'piper__' + text.toLowerCase().trim().substring(0, 200) + '__' + baseLang + '__' + speed;
        if (_audioCache.has(cacheKey)) {
            console.log('[Piper TTS] Cache HIT:', text.substring(0, 30));
            return _audioCache.get(cacheKey);
        }

        try {
            var lib = await _ensureLibLoaded();

            // predict() returns a Blob (WAV audio)
            var blob = await lib.predict({
                text: text,
                voiceId: voiceInfo.voiceId
            });

            if (!blob) {
                console.warn('[Piper TTS] predict() returned empty result');
                return null;
            }

            var audioUrl = URL.createObjectURL(blob);

            // Cache with LRU eviction
            if (audioUrl) {
                _audioCache.set(cacheKey, audioUrl);
                if (_audioCache.size > 50) {
                    var oldest = _audioCache.keys().next().value;
                    URL.revokeObjectURL(_audioCache.get(oldest));
                    _audioCache.delete(oldest);
                }
            }

            console.log('[Piper TTS] Generated audio for:', text.substring(0, 40));
            return audioUrl;
        } catch (e) {
            console.error('[Piper TTS] Generation failed:', e);
            return null;
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
    async function preloadLanguage(langCode) {
        if (!langCode) return false;
        var baseLang = langCode.split('-')[0].toLowerCase();
        if (baseLang === 'en') return true; // Kokoro handles English
        if (!(baseLang in PIPER_VOICE_MAP)) return false;
        return _ensureVoice(baseLang);
    }

    // ─── Expose Global API ──────────────────────────────────────────────
    window._piperTTS = {
        init: init,
        speak: speak,
        preloadLanguage: preloadLanguage,
        supportsLanguage: supportsLanguage,
        getSupportedLanguages: getSupportedLanguages,
        voiceMap: PIPER_VOICE_MAP,
        get ready() { return _ready; },
        get progress() { return _loadProgress; },
        get currentLang() { return _currentLang; },
    };

    console.log('[Piper TTS] Loader registered. Supports', Object.keys(PIPER_VOICE_MAP).length, 'languages.');
})();
