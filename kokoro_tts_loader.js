/**
 * kokoro_tts_loader.js — AlloFlow Canvas TTS Provider (Primary)
 *
 * Loads Kokoro TTS (WASM) via a Web Worker for zero main-thread blocking.
 * ALL heavy computation runs in the worker: ONNX inference, sentence
 * splitting, WAV conversion, and multi-chunk concatenation.
 *
 * The main thread only sends text and receives a ready-made WAV ArrayBuffer.
 *
 * Features:
 * - Inline blob Web Worker (no extra file needed)
 * - Worker-side sentence chunking + WAV concatenation (zero main-thread work)
 * - Warm-up inference after init to eliminate cold-start stutter
 * - Transferable ArrayBuffers for zero-copy audio transfer
 * - LRU audio cache (100 entries)
 *
 * Exposes: window._kokoroTTS = { init(), speak(text, voice, speed), voices, ready }
 *
 * License: Apache 2.0 (Kokoro model + kokoro-js library)
 * Model: ~86MB quantized (q8), cached after first download
 */
(function () {
    'use strict';

    // ─── Constants ──────────────────────────────────────────────────────
    const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
    const DTYPE = 'q8';  // 86MB quantized — best quality/size ratio
    const CDN_BASE = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';
    const CACHE_MAX = 100;
    const CHUNK_THRESHOLD = 200; // characters — below this, don't chunk

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

    // ─── Worker Source ──────────────────────────────────────────────────
    // EVERYTHING heavy runs here: ONNX inference, sentence splitting,
    // Float32→WAV conversion, multi-chunk WAV concatenation.
    // The main thread only sends text and receives a ready-made WAV buffer.
    const WORKER_SOURCE = `
        let _tts = null;
        const CHUNK_THRESHOLD = ${CHUNK_THRESHOLD};

        // ── Sentence splitter (runs in worker) ──
        function splitSentences(text) {
            const sentences = text.match(/[^.!?]*(?:(?:Dr|Mr|Mrs|Ms|St|Jr|Sr|Prof|vs|Inc|Ltd|Co|U\\.S\\.A|etc)\\.[^.!?]*)*[.!?]+[\\s]*|[^.!?]+$/gi);
            if (!sentences) return [text];
            return sentences.map(s => s.trim()).filter(s => s.length > 1);
        }

        // ── Float32 PCM → WAV (runs in worker) ──
        function float32ToWav(float32Array, sampleRate) {
            const bitsPerSample = 16;
            const dataSize = float32Array.length * 2;
            const buffer = new ArrayBuffer(44 + dataSize);
            const view = new DataView(buffer);

            function w(off, str) { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); }
            w(0, 'RIFF');
            view.setUint32(4, 36 + dataSize, true);
            w(8, 'WAVE'); w(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, 1, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * 2, true);
            view.setUint16(32, 2, true);
            view.setUint16(34, bitsPerSample, true);
            w(36, 'data');
            view.setUint32(40, dataSize, true);

            let off = 44;
            for (let i = 0; i < float32Array.length; i++) {
                const s = Math.max(-1, Math.min(1, float32Array[i]));
                view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                off += 2;
            }
            return buffer;
        }

        // ── Concatenate multiple WAV buffers (runs in worker) ──
        function concatWavBuffers(buffers) {
            if (buffers.length === 0) return null;
            if (buffers.length === 1) return buffers[0];
            let totalDataSize = 0;
            const parts = [];
            for (const buf of buffers) {
                const sz = buf.byteLength - 44;
                parts.push(new Uint8Array(buf, 44, sz));
                totalDataSize += sz;
            }
            const combined = new ArrayBuffer(44 + totalDataSize);
            const out = new Uint8Array(combined);
            const view = new DataView(combined);
            out.set(new Uint8Array(buffers[0], 0, 44), 0);
            view.setUint32(4, 36 + totalDataSize, true);
            view.setUint32(40, totalDataSize, true);
            let off = 44;
            for (const p of parts) { out.set(p, off); off += p.byteLength; }
            return combined;
        }

        // ── Generate audio for a single piece of text ──
        async function generateOne(text, voice, speed) {
            const result = await _tts.generate(text, { voice, speed });
            if (result && result.audio) {
                const audioData = result.audio instanceof Float32Array ? result.audio : new Float32Array(result.audio);
                return float32ToWav(audioData, result.sampling_rate || 24000);
            } else if (result && typeof result.toBlob === 'function') {
                const blob = await result.toBlob();
                return await blob.arrayBuffer();
            }
            return null;
        }

        self.onmessage = async ({ data }) => {
            try {
                // ── INIT ──
                if (data.type === 'init') {
                    self.postMessage({ type: 'progress', stage: 'Loading Kokoro TTS library', pct: 0.05 });
                    const mod = await import(data.cdn);
                    const KokoroTTS = mod.KokoroTTS;
                    self.postMessage({ type: 'progress', stage: 'Downloading voice model (~86MB, cached after first load)', pct: 0.1 });
                    _tts = await KokoroTTS.from_pretrained(data.modelId, {
                        dtype: data.dtype,
                        progress_callback: (p) => {
                            if (p && typeof p.progress === 'number') {
                                self.postMessage({ type: 'progress', stage: 'Downloading voice model', pct: 0.1 + (p.progress / 100) * 0.85 });
                            }
                        }
                    });
                    self.postMessage({ type: 'progress', stage: 'Ready', pct: 1.0 });
                    self.postMessage({ type: 'ready' });
                }

                // ── GENERATE (single) ──
                if (data.type === 'generate') {
                    if (!_tts) { self.postMessage({ type: 'error', id: data.id, error: 'Model not initialized' }); return; }
                    const t0 = performance.now();
                    const buf = await generateOne(data.text, data.voice, data.speed);
                    if (buf) {
                        self.postMessage({ type: 'audio', id: data.id, buffer: buf, elapsed: performance.now() - t0 }, [buf]);
                    } else {
                        self.postMessage({ type: 'error', id: data.id, error: 'No audio generated' });
                    }
                }

                // ── GENERATE_BATCH (chunked — all work in worker) ──
                if (data.type === 'generate_batch') {
                    if (!_tts) { self.postMessage({ type: 'error', id: data.id, error: 'Model not initialized' }); return; }
                    const t0 = performance.now();
                    const text = data.text;
                    const voice = data.voice;
                    const speed = data.speed;
                    let wavBuffers = [];

                    if (text.length > CHUNK_THRESHOLD) {
                        const sentences = splitSentences(text);
                        for (const chunk of sentences) {
                            const buf = await generateOne(chunk, voice, speed);
                            if (buf) wavBuffers.push(buf);
                        }
                    } else {
                        const buf = await generateOne(text, voice, speed);
                        if (buf) wavBuffers.push(buf);
                    }

                    if (wavBuffers.length === 0) {
                        self.postMessage({ type: 'error', id: data.id, error: 'No audio generated' });
                        return;
                    }

                    const finalBuf = concatWavBuffers(wavBuffers);
                    const elapsed = performance.now() - t0;
                    self.postMessage({
                        type: 'audio', id: data.id, buffer: finalBuf,
                        elapsed, chunks: wavBuffers.length
                    }, [finalBuf]);
                }
            } catch (e) {
                self.postMessage({
                    type: data.type === 'init' ? 'init_error' : 'error',
                    id: data.id,
                    error: e.message || String(e)
                });
            }
        };
    `;

    // ─── State ──────────────────────────────────────────────────────────
    let _worker = null;
    let _ready = false;
    let _initPromise = null;
    let _loadProgress = 0;
    let _onProgress = null;
    let _msgId = 0;
    const _pendingMessages = new Map(); // id → { resolve, reject }
    const _audioCache = new Map();

    // ─── Worker Setup ───────────────────────────────────────────────────
    function _createWorker() {
        const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const w = new Worker(url, { type: 'module' });

        w.onmessage = ({ data }) => {
            switch (data.type) {
                case 'progress':
                    _loadProgress = data.pct;
                    if (_onProgress) _onProgress({ stage: data.stage, pct: data.pct });
                    console.log(`[Kokoro TTS] ${data.stage}: ${Math.round(data.pct * 100)}%`);
                    break;

                case 'ready': {
                    _ready = true;
                    console.log('[Kokoro TTS] ✅ Worker initialized');
                    const p = _pendingMessages.get('__init__');
                    if (p) { p.resolve(true); _pendingMessages.delete('__init__'); }
                    break;
                }

                case 'init_error': {
                    console.error('[Kokoro TTS] ❌ Worker init failed:', data.error);
                    const p = _pendingMessages.get('__init__');
                    if (p) { p.reject(new Error(data.error)); _pendingMessages.delete('__init__'); }
                    break;
                }

                case 'audio': {
                    const p = _pendingMessages.get(data.id);
                    if (p) {
                        p.resolve({ buffer: data.buffer, elapsed: data.elapsed, chunks: data.chunks || 1 });
                        _pendingMessages.delete(data.id);
                    }
                    break;
                }

                case 'error': {
                    const p = _pendingMessages.get(data.id);
                    if (p) { p.reject(new Error(data.error)); _pendingMessages.delete(data.id); }
                    break;
                }
            }
        };

        w.onerror = (e) => {
            console.error('[Kokoro TTS] Worker error:', e.message);
        };

        return w;
    }

    function _sendToWorker(type, payload) {
        return new Promise((resolve, reject) => {
            const id = payload.id || `msg_${++_msgId}`;
            _pendingMessages.set(id, { resolve, reject });
            _worker.postMessage({ type, ...payload, id });
        });
    }

    // ─── Initialize ─────────────────────────────────────────────────────
    async function init(onProgress) {
        if (_ready && _worker) return true;
        if (_initPromise) return _initPromise;

        _onProgress = onProgress || null;

        _initPromise = (async () => {
            try {
                _worker = _createWorker();

                const initDone = new Promise((resolve, reject) => {
                    _pendingMessages.set('__init__', { resolve, reject });
                });

                _worker.postMessage({
                    type: 'init',
                    modelId: MODEL_ID,
                    dtype: DTYPE,
                    cdn: CDN_BASE,
                });

                await initDone;

                // ── Warm-up inference ──
                // Runs a tiny dummy generation in the worker to JIT-warm the WASM
                // so the first real speak() doesn't stutter.
                console.log('[Kokoro TTS] 🔥 Running warm-up inference...');
                try {
                    await _sendToWorker('generate', {
                        text: '.',
                        voice: 'af_heart',
                        speed: 1.0,
                        id: '__warmup__',
                    });
                    console.log('[Kokoro TTS] 🔥 Warm-up complete');
                } catch (warmupErr) {
                    console.warn('[Kokoro TTS] Warm-up failed (non-fatal):', warmupErr.message);
                }

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
    // Main thread does: send text → receive WAV ArrayBuffer → Blob → URL.
    // ALL heavy work (inference, chunking, WAV conversion, concatenation)
    // happens in the worker.
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
            // Send to worker — all chunking, inference, WAV conversion, and
            // concatenation happen there. We get back a single WAV ArrayBuffer.
            const result = await _sendToWorker('generate_batch', {
                text,
                voice,
                speed,
            });

            if (!result.buffer) {
                console.warn('[Kokoro TTS] No audio generated');
                return null;
            }

            // Only thing on main thread: wrap the ArrayBuffer in a Blob URL
            const blob = new Blob([result.buffer], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(blob);

            const elapsed = Math.round(result.elapsed);
            console.log(`[Kokoro TTS] 🎤 Generated in ${elapsed}ms (${result.chunks} chunk${result.chunks > 1 ? 's' : ''}): ${text.substring(0, 40)}`);

            // Cache (LRU eviction)
            _audioCache.set(cacheKey, audioUrl);
            if (_audioCache.size > CACHE_MAX) {
                const oldest = _audioCache.keys().next().value;
                URL.revokeObjectURL(_audioCache.get(oldest));
                _audioCache.delete(oldest);
            }

            return audioUrl;
        } catch (e) {
            console.error('[Kokoro TTS] ❌ Generation failed:', e);
            return null;
        }
    }

    // ─── Language Support Check ─────────────────────────────────────────
    function supportsLanguage(langCode) {
        if (!langCode) return true;
        const baseLang = langCode.split('-')[0].toLowerCase();
        return KOKORO_LANGS.has(baseLang);
    }

    // ─── Expose Global API (identical interface) ────────────────────────
    window._kokoroTTS = {
        init: init,
        speak: speak,
        supportsLanguage: supportsLanguage,
        voices: KOKORO_VOICE_LIST,
        get ready() { return _ready; },
        get progress() { return _loadProgress; },
    };

    console.log('[Kokoro TTS] 📦 Worker-based loader registered. Call window._kokoroTTS.init() or speak() to start.');
})();
