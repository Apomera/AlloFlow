/**
 * kokoro_tts_loader.js — AlloFlow Canvas TTS Provider (Primary)
 * 
 * Loads Kokoro TTS (WASM) in the browser for high-quality, offline-capable
 * text-to-speech in Canvas mode where Gemini TTS is unavailable.
 * 
 * Exposes: window._kokoroTTS = { init(), speak(text, voice, speed), voices, ready }
 * 
 * License: Apache 2.0 (Kokoro model + kokoro-js library)
 * Model: ~86MB quantized (q8), cached after first download
 * Languages: English US/UK, French, Japanese, Chinese, Korean, Hindi, Spanish, Portuguese, Italian
 */
(function () {
    'use strict';

    // ─── Constants ──────────────────────────────────────────────────────
    const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
    const DTYPE = 'q8';  // 86MB quantized — best quality/size ratio
    const CDN_BASE = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';

    // Available Kokoro voices (id → label mapping for UI)
    const KOKORO_VOICE_LIST = [
        // ── American English ──
        { id: 'af_heart',     label: '❤️ Heart — Warm female (English US)',    lang: 'en' },
        { id: 'af_nova',      label: '⭐ Nova — Clear female (English US)',     lang: 'en' },
        { id: 'af_sky',       label: '🌤️ Sky — Bright female (English US)',    lang: 'en' },
        { id: 'af_bella',     label: '🔔 Bella — Elegant female (English US)', lang: 'en' },
        { id: 'af_sarah',     label: '🌸 Sarah — Gentle female (English US)',  lang: 'en' },
        { id: 'af_nicole',    label: '🎵 Nicole — Musical female (English US)', lang: 'en' },
        { id: 'am_adam',      label: '🧑 Adam — Natural male (English US)',     lang: 'en' },
        { id: 'am_michael',   label: '🎙️ Michael — Deep male (English US)',   lang: 'en' },
        // ── British English ──
        { id: 'bf_emma',      label: '🇬🇧 Emma — British female',              lang: 'en' },
        { id: 'bf_isabella',  label: '🇬🇧 Isabella — British female',          lang: 'en' },
        { id: 'bm_george',    label: '🇬🇧 George — British male',              lang: 'en' },
        { id: 'bm_lewis',     label: '🇬🇧 Lewis — British male',               lang: 'en' },
        // ── Other Languages ──
        { id: 'ff_siwis',     label: '🇫🇷 Siwis — French female',              lang: 'fr' },
        { id: 'hf_alpha',     label: '🇮🇳 Alpha — Hindi female',               lang: 'hi' },
        { id: 'hm_omega',     label: '🇮🇳 Omega — Hindi male',                 lang: 'hi' },
        { id: 'jf_alpha',     label: '🇯🇵 Alpha — Japanese female',            lang: 'ja' },
        { id: 'jf_gongitsune',label: '🇯🇵 Gongitsune — Japanese female',       lang: 'ja' },
        { id: 'zf_xiaobei',   label: '🇨🇳 Xiaobei — Chinese female',           lang: 'zh' },
        { id: 'zf_xiaoni',    label: '🇨🇳 Xiaoni — Chinese female',            lang: 'zh' },
        { id: 'zm_yunjian',   label: '🇨🇳 Yunjian — Chinese male',             lang: 'zh' },
        { id: 'ef_dora',      label: '🇪🇸 Dora — Spanish female',              lang: 'es' },
        { id: 'em_alex',      label: '🇪🇸 Alex — Spanish male',                lang: 'es' },
        { id: 'if_sara',      label: '🇮🇹 Sara — Italian female',              lang: 'it' },
        { id: 'im_nicola',    label: '🇮🇹 Nicola — Italian male',              lang: 'it' },
        { id: 'pf_dora',      label: '🇧🇷 Dora — Portuguese female',           lang: 'pt' },
        { id: 'pm_alex',      label: '🇧🇷 Alex — Portuguese male',             lang: 'pt' },
    ];

    // Languages Kokoro supports (for cascade decision)
    const KOKORO_LANGS = new Set(['en', 'fr', 'hi', 'ja', 'zh', 'es', 'it', 'pt', 'ko']);

    // ─── State ──────────────────────────────────────────────────────────
    let _ttsInstance = null;
    let _initPromise = null;
    let _ready = false;
    let _loadProgress = 0;
    const _audioCache = new Map();

    // ─── Progress Callback ──────────────────────────────────────────────
    let _onProgress = null;

    function _fireProgress(stage, pct) {
        _loadProgress = pct;
        if (_onProgress) _onProgress({ stage, pct });
        console.log(`[Kokoro TTS] ${stage}: ${Math.round(pct * 100)}%`);
    }

    // ─── Initialize ─────────────────────────────────────────────────────
    async function init(onProgress) {
        if (_ready && _ttsInstance) return true;
        if (_initPromise) return _initPromise;

        _onProgress = onProgress || null;

        _initPromise = (async () => {
            try {
                _fireProgress('Loading Kokoro TTS library', 0.05);

                // Dynamic ESM import from CDN
                const { KokoroTTS } = await import(/* webpackIgnore: true */ CDN_BASE);

                _fireProgress('Downloading voice model (~86MB, cached after first load)', 0.1);

                // Load model with progress tracking
                _ttsInstance = await KokoroTTS.from_pretrained(MODEL_ID, {
                    dtype: DTYPE,
                    progress_callback: (progress) => {
                        if (progress && typeof progress.progress === 'number') {
                            _fireProgress('Downloading voice model', 0.1 + (progress.progress / 100) * 0.85);
                        }
                    },
                });

                _fireProgress('Ready', 1.0);
                _ready = true;
                console.log('[Kokoro TTS] ✅ Initialized successfully');
                return true;
            } catch (e) {
                console.error('[Kokoro TTS] ❌ Initialization failed:', e);
                _initPromise = null;
                _ready = false;
                throw e;
            }
        })();

        return _initPromise;
    }

    // ─── Generate Speech ────────────────────────────────────────────────
    async function speak(text, voice, speed) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) return null;

        voice = voice || 'af_heart';
        speed = speed || 1.0;

        // Initialize on first use (lazy loading)
        if (!_ready) {
            try {
                await init();
            } catch (e) {
                console.warn('[Kokoro TTS] Init failed in speak(), returning null:', e?.message);
                return null;
            }
        }

        // Cache check                
        const cacheKey = `kokoro__${text.toLowerCase().trim().substring(0, 200)}__${voice}__${speed}`;
        if (_audioCache.has(cacheKey)) {
            console.log('[Kokoro TTS] ⚡ Cache HIT:', text.substring(0, 30));
            return _audioCache.get(cacheKey);
        }

        try {
            // Generate audio
            const result = await _ttsInstance.generate(text, {
                voice: voice,
                speed: speed,
            });

            // Convert to audio URL
            // kokoro-js returns an audio object with .toBlob() or raw PCM data
            let audioUrl = null;

            if (result && typeof result.toBlob === 'function') {
                // Newer API: has toBlob()
                const blob = await result.toBlob();
                audioUrl = URL.createObjectURL(blob);
            } else if (result && result.audio) {
                // Older API: raw Float32Array audio data
                const audioData = result.audio;
                const sampleRate = result.sampling_rate || 24000;
                const wavBuffer = _float32ToWav(audioData, sampleRate);
                const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                audioUrl = URL.createObjectURL(blob);
            } else if (result && result instanceof Blob) {
                audioUrl = URL.createObjectURL(result);
            } else {
                console.warn('[Kokoro TTS] Unexpected result format:', typeof result);
                return null;
            }

            // Cache the URL
            if (audioUrl) {
                _audioCache.set(cacheKey, audioUrl);
                // Limit cache size
                if (_audioCache.size > 100) {
                    const oldest = _audioCache.keys().next().value;
                    const oldUrl = _audioCache.get(oldest);
                    URL.revokeObjectURL(oldUrl);
                    _audioCache.delete(oldest);
                }
            }

            console.log('[Kokoro TTS] 🎤 Generated audio for:', text.substring(0, 40));
            return audioUrl;
        } catch (e) {
            console.error('[Kokoro TTS] ❌ Generation failed:', e);
            return null;
        }
    }

    // ─── Language Support Check ─────────────────────────────────────────
    function supportsLanguage(langCode) {
        if (!langCode) return true; // Default to English
        const baseLang = langCode.split('-')[0].toLowerCase();
        return KOKORO_LANGS.has(baseLang);
    }

    // ─── Float32 PCM → WAV Conversion ───────────────────────────────────
    function _float32ToWav(float32Array, sampleRate) {
        const numChannels = 1;
        const bitsPerSample = 16;
        const bytesPerSample = bitsPerSample / 8;
        const blockAlign = numChannels * bytesPerSample;
        const dataSize = float32Array.length * bytesPerSample;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        // WAV header
        _writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        _writeString(view, 8, 'WAVE');
        _writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        _writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        // Convert float32 [-1, 1] to int16
        let offset = 44;
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }

        return buffer;
    }

    function _writeString(view, offset, str) {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }

    // ─── Expose Global API ──────────────────────────────────────────────
    window._kokoroTTS = {
        init: init,
        speak: speak,
        supportsLanguage: supportsLanguage,
        voices: KOKORO_VOICE_LIST,
        get ready() { return _ready; },
        get progress() { return _loadProgress; },
    };

    console.log('[Kokoro TTS] 📦 Loader registered. Call window._kokoroTTS.init() or speak() to start.');
})();
