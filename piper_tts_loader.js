/**
 * piper_tts_loader.js — AlloFlow Canvas TTS Provider (Language Fallback)
 * 
 * Loads Piper TTS (WASM) in the browser for text-to-speech in languages
 * that Kokoro doesn't support (40+ languages, 100+ voices).
 * 
 * Exposes: window._piperTTS = { init(), speak(text, lang, speed), voices, ready }
 * 
 * License: MIT (Piper) + MIT (piper-tts-web)
 * Models: ~15-75MB per voice, downloaded on-demand and cached
 */
(function () {
    'use strict';

    // ─── Constants ──────────────────────────────────────────────────────
    // Piper voice models hosted on Hugging Face (ONNX format)
    const MODEL_BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0';

    // CDN for the piper-tts-web library 
    const PIPER_CDN = 'https://cdn.jsdelivr.net/npm/@nicebro/piper-tts-web@1.0.1/+esm';

    // Default voice per language (quality: medium for best balance)
    const PIPER_VOICE_MAP = {
        // Language code → { model path relative to MODEL_BASE, config path }
        'ar': { name: 'Arabic (Kareem)',      model: 'ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx',        config: 'ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx.json' },
        'ca': { name: 'Catalan (Upc)',        model: 'ca/ca_ES/upc_ona/medium/ca_ES-upc_ona-medium.onnx',     config: 'ca/ca_ES/upc_ona/medium/ca_ES-upc_ona-medium.onnx.json' },
        'cs': { name: 'Czech (Jirka)',        model: 'cs/cs_CZ/jirka/medium/cs_CZ-jirka-medium.onnx',         config: 'cs/cs_CZ/jirka/medium/cs_CZ-jirka-medium.onnx.json' },
        'da': { name: 'Danish (Talesyntese)', model: 'da/da_DK/talesyntese/medium/da_DK-talesyntese-medium.onnx', config: 'da/da_DK/talesyntese/medium/da_DK-talesyntese-medium.onnx.json' },
        'de': { name: 'German (Thorsten)',    model: 'de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx',    config: 'de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx.json' },
        'el': { name: 'Greek (Rapunzel)',     model: 'el/el_GR/rapunzelina/medium/el_GR-rapunzelina-medium.onnx', config: 'el/el_GR/rapunzelina/medium/el_GR-rapunzelina-medium.onnx.json' },
        'en': { name: 'English (Lessac)',     model: 'en/en_US/lessac/medium/en_US-lessac-medium.onnx',        config: 'en/en_US/lessac/medium/en_US-lessac-medium.onnx.json' },
        'es': { name: 'Spanish (Carlfm)',     model: 'es/es_ES/carlfm/medium/es_ES-carlfm-medium.onnx',       config: 'es/es_ES/carlfm/medium/es_ES-carlfm-medium.onnx.json' },
        'fi': { name: 'Finnish (Harri)',      model: 'fi/fi_FI/harri/medium/fi_FI-harri-medium.onnx',         config: 'fi/fi_FI/harri/medium/fi_FI-harri-medium.onnx.json' },
        'fr': { name: 'French (Siwis)',       model: 'fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx',         config: 'fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json' },
        'hu': { name: 'Hungarian (Anna)',     model: 'hu/hu_HU/anna/medium/hu_HU-anna-medium.onnx',           config: 'hu/hu_HU/anna/medium/hu_HU-anna-medium.onnx.json' },
        'is': { name: 'Icelandic (Bui)',      model: 'is/is_IS/bui/medium/is_IS-bui-medium.onnx',             config: 'is/is_IS/bui/medium/is_IS-bui-medium.onnx.json' },
        'it': { name: 'Italian (Riccardo)',   model: 'it/it_IT/riccardo/medium/it_IT-riccardo-medium.onnx',    config: 'it/it_IT/riccardo/medium/it_IT-riccardo-medium.onnx.json' },
        'ka': { name: 'Georgian (Natia)',     model: 'ka/ka_GE/natia/medium/ka_GE-natia-medium.onnx',         config: 'ka/ka_GE/natia/medium/ka_GE-natia-medium.onnx.json' },
        'kk': { name: 'Kazakh (Isseke)',      model: 'kk/kk_KZ/iseke/medium/kk_KZ-iseke-medium.onnx',        config: 'kk/kk_KZ/iseke/medium/kk_KZ-iseke-medium.onnx.json' },
        'ne': { name: 'Nepali (Google)',      model: 'ne/ne_NP/google/medium/ne_NP-google-medium.onnx',       config: 'ne/ne_NP/google/medium/ne_NP-google-medium.onnx.json' },
        'nl': { name: 'Dutch (Mls)',          model: 'nl/nl_NL/mls/medium/nl_NL-mls-medium.onnx',             config: 'nl/nl_NL/mls/medium/nl_NL-mls-medium.onnx.json' },
        'no': { name: 'Norwegian (Talesyntese)', model: 'no/no_NO/talesyntese/medium/no_NO-talesyntese-medium.onnx', config: 'no/no_NO/talesyntese/medium/no_NO-talesyntese-medium.onnx.json' },
        'pl': { name: 'Polish (Gosia)',       model: 'pl/pl_PL/gosia/medium/pl_PL-gosia-medium.onnx',         config: 'pl/pl_PL/gosia/medium/pl_PL-gosia-medium.onnx.json' },
        'pt': { name: 'Portuguese (Faber)',   model: 'pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx',         config: 'pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx.json' },
        'ro': { name: 'Romanian (Mihai)',     model: 'ro/ro_RO/mihai/medium/ro_RO-mihai-medium.onnx',         config: 'ro/ro_RO/mihai/medium/ro_RO-mihai-medium.onnx.json' },
        'ru': { name: 'Russian (Irina)',      model: 'ru/ru_RU/irina/medium/ru_RU-irina-medium.onnx',         config: 'ru/ru_RU/irina/medium/ru_RU-irina-medium.onnx.json' },
        'sr': { name: 'Serbian (Srecko)',     model: 'sr/sr_RS/srecko/medium/sr_RS-srecko-medium.onnx',       config: 'sr/sr_RS/srecko/medium/sr_RS-srecko-medium.onnx.json' },
        'sv': { name: 'Swedish (Nst)',        model: 'sv/sv_SE/nst/medium/sv_SE-nst-medium.onnx',             config: 'sv/sv_SE/nst/medium/sv_SE-nst-medium.onnx.json' },
        'sw': { name: 'Swahili (Lanfrica)',   model: 'sw/sw_CD/lanfrica/medium/sw_CD-lanfrica-medium.onnx',    config: 'sw/sw_CD/lanfrica/medium/sw_CD-lanfrica-medium.onnx.json' },
        'tr': { name: 'Turkish (Dfki)',       model: 'tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx',           config: 'tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx.json' },
        'uk': { name: 'Ukrainian (Lada)',     model: 'uk/uk_UA/lada/medium/uk_UA-lada-medium.onnx',           config: 'uk/uk_UA/lada/medium/uk_UA-lada-medium.onnx.json' },
        'vi': { name: 'Vietnamese (25hours)', model: 'vi/vi_VN/25hours_single/medium/vi_VN-25hours_single-medium.onnx', config: 'vi/vi_VN/25hours_single/medium/vi_VN-25hours_single-medium.onnx.json' },
        'zh': { name: 'Chinese (HuaYang)',    model: 'zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx',       config: 'zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx.json' },
    };

    // ─── State ──────────────────────────────────────────────────────────
    let _engine = null;
    let _currentLang = null;
    let _initPromise = null;
    let _ready = false;
    let _loadProgress = 0;
    const _audioCache = new Map();
    const _loadedModels = new Map(); // lang → engine instance

    let _onProgress = null;

    function _fireProgress(stage, pct) {
        _loadProgress = pct;
        if (_onProgress) _onProgress({ stage, pct });
        console.log(`[Piper TTS] ${stage}: ${Math.round(pct * 100)}%`);
    }

    // ─── Initialize Library ─────────────────────────────────────────────
    let _PiperModule = null;
    let _libInitPromise = null;

    async function _ensureLibLoaded() {
        if (_PiperModule) return _PiperModule;
        if (_libInitPromise) return _libInitPromise;

        _libInitPromise = (async () => {
            try {
                _fireProgress('Loading Piper TTS library', 0.05);
                _PiperModule = await import(/* webpackIgnore: true */ PIPER_CDN);
                _fireProgress('Piper library loaded', 0.15);
                return _PiperModule;
            } catch (e) {
                console.error('[Piper TTS] ❌ Failed to load library:', e);
                _libInitPromise = null;
                throw e;
            }
        })();

        return _libInitPromise;
    }

    // ─── Load a Voice Model for a Language ───────────────────────────────
    async function _loadVoice(langCode) {
        const baseLang = langCode.split('-')[0].toLowerCase();
        
        // Check if already loaded
        if (_loadedModels.has(baseLang)) {
            _engine = _loadedModels.get(baseLang);
            _currentLang = baseLang;
            return true;
        }

        const voiceInfo = PIPER_VOICE_MAP[baseLang];
        if (!voiceInfo) {
            console.warn('[Piper TTS] No voice model for language:', baseLang);
            return false;
        }

        try {
            const lib = await _ensureLibLoaded();
            
            _fireProgress(`Downloading ${voiceInfo.name} voice`, 0.2);

            // Create a new engine instance for this language
            const modelUrl = `${MODEL_BASE}/${voiceInfo.model}`;
            const configUrl = `${MODEL_BASE}/${voiceInfo.config}`;

            let engine;
            if (lib.PiperWebEngine) {
                engine = new lib.PiperWebEngine();
                await engine.init({ modelUrl, configUrl });
            } else if (lib.default && lib.default.PiperWebEngine) {
                engine = new lib.default.PiperWebEngine();
                await engine.init({ modelUrl, configUrl });
            } else {
                // Fallback: try various exports
                const EngineClass = lib.PiperWebEngine || lib.PiperTTSWeb || lib.default;
                if (typeof EngineClass === 'function') {
                    engine = new EngineClass();
                    await engine.init({ modelUrl, configUrl });
                } else {
                    throw new Error('Could not find PiperWebEngine in module exports');
                }
            }

            _loadedModels.set(baseLang, engine);
            _engine = engine;
            _currentLang = baseLang;
            _ready = true;

            _fireProgress('Ready', 1.0);
            console.log(`[Piper TTS] ✅ Voice loaded for: ${voiceInfo.name}`);
            return true;
        } catch (e) {
            console.error(`[Piper TTS] ❌ Failed to load voice for ${baseLang}:`, e);
            return false;
        }
    }

    // ─── Initialize ─────────────────────────────────────────────────────
    async function init(lang, onProgress) {
        _onProgress = onProgress || null;
        lang = lang || 'en';
        return _loadVoice(lang);
    }

    // ─── Generate Speech ────────────────────────────────────────────────
    async function speak(text, lang, speed) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) return null;

        lang = lang || 'en';
        speed = speed || 1.0;
        const baseLang = lang.split('-')[0].toLowerCase();

        // Load voice for this language if not already loaded
        if (_currentLang !== baseLang || !_engine) {
            const loaded = await _loadVoice(baseLang);
            if (!loaded) return null;
        }

        // Cache check
        const cacheKey = `piper__${text.toLowerCase().trim().substring(0, 200)}__${baseLang}__${speed}`;
        if (_audioCache.has(cacheKey)) {
            console.log('[Piper TTS] ⚡ Cache HIT:', text.substring(0, 30));
            return _audioCache.get(cacheKey);
        }

        try {
            // Generate audio
            const result = await _engine.generate(text, { speed });

            let audioUrl = null;

            if (result instanceof Blob) {
                audioUrl = URL.createObjectURL(result);
            } else if (result && result.audio) {
                // Raw audio data — convert to WAV
                const wavBuffer = _int16ToWav(result.audio, result.sampleRate || 22050);
                const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                audioUrl = URL.createObjectURL(blob);
            } else if (result && typeof result.toBlob === 'function') {
                const blob = await result.toBlob();
                audioUrl = URL.createObjectURL(blob);
            } else if (result && ArrayBuffer.isView(result)) {
                // Raw Int16Array
                const wavBuffer = _int16ToWav(result, 22050);
                const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                audioUrl = URL.createObjectURL(blob);
            } else {
                console.warn('[Piper TTS] Unexpected result format:', typeof result);
                return null;
            }

            // Cache
            if (audioUrl) {
                _audioCache.set(cacheKey, audioUrl);
                if (_audioCache.size > 50) {
                    const oldest = _audioCache.keys().next().value;
                    URL.revokeObjectURL(_audioCache.get(oldest));
                    _audioCache.delete(oldest);
                }
            }

            console.log('[Piper TTS] 🎤 Generated audio for:', text.substring(0, 40));
            return audioUrl;
        } catch (e) {
            console.error('[Piper TTS] ❌ Generation failed:', e);
            return null;
        }
    }

    // ─── Language Support Check ─────────────────────────────────────────
    function supportsLanguage(langCode) {
        if (!langCode) return false;
        const baseLang = langCode.split('-')[0].toLowerCase();
        return baseLang in PIPER_VOICE_MAP;
    }

    function getSupportedLanguages() {
        return Object.entries(PIPER_VOICE_MAP).map(([code, info]) => ({
            code,
            name: info.name,
        }));
    }

    // ─── Int16 PCM → WAV Conversion ─────────────────────────────────────
    function _int16ToWav(int16Array, sampleRate) {
        const numChannels = 1;
        const bitsPerSample = 16;
        const bytesPerSample = bitsPerSample / 8;
        const blockAlign = numChannels * bytesPerSample;
        const dataSize = int16Array.length * bytesPerSample;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        _writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        _writeString(view, 8, 'WAVE');
        _writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        _writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        // Copy int16 samples
        const output = new Int16Array(buffer, 44);
        output.set(int16Array);

        return buffer;
    }

    function _writeString(view, offset, str) {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }

    // ─── Expose Global API ──────────────────────────────────────────────
    window._piperTTS = {
        init: init,
        speak: speak,
        supportsLanguage: supportsLanguage,
        getSupportedLanguages: getSupportedLanguages,
        voiceMap: PIPER_VOICE_MAP,
        get ready() { return _ready; },
        get progress() { return _loadProgress; },
        get currentLang() { return _currentLang; },
    };

    console.log('[Piper TTS] 📦 Loader registered. Supports', Object.keys(PIPER_VOICE_MAP).length, 'languages.');
})();
