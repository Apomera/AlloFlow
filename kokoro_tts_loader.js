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
 * - **Streaming playback** — first sentence plays immediately while rest generates
 * - Warm-up inference after init to eliminate cold-start stutter
 * - Transferable ArrayBuffers for zero-copy audio transfer
 * - Exact-text fingerprinted LRU audio cache (100 entries)
 * - AbortSignal cancellation and loader-owned Blob URL lifecycle
 * - q8 model (the retired quality names remain API-compatible)
 *
 * Exposes: window._kokoroTTS = { init(), speak(text, voice, speed, options),
 *   speakStreaming(text, voice, speed, options), stop(), dispose(), ... }
 *
 * License: Apache 2.0 (Kokoro model + kokoro-js library)
 */
(function () {
    'use strict';

    // ─── Duplicate-load guard ────────────────────────────────────────────
    // React StrictMode runs useEffect twice, injecting two <script> tags.
    // Both scripts can execute before either sets window._kokoroTTS (line ~687).
    // Use a synchronous sentinel set IMMEDIATELY to block the second load.
    if (window._kokoroTTS || window.__kokoroTTSLoading) {
        console.log('[Kokoro TTS] Already registered/loading, skipping duplicate load');
        return;
    }
    window.__kokoroTTSLoading = true; // Synchronous sentinel — blocks any racing duplicate

    // ─── Constants ──────────────────────────────────────────────────────
    const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
    // q8 (model_quantized) is the ONLY sane wasm-CPU choice — measured
    // 2026-07-06 (repo file sizes + same-machine bench, first cold run):
    //   q4  = 291 MiB download (the old "~43MB" label was fiction — that
    //         export only quantizes MatMuls, everything else ships fp32),
    //         WORSE audio, and NOT faster (TTFA 88s vs 58s under load).
    //   q8  = 88 MiB, better audio, equal-or-faster inference.
    // q4 is retired: bigger AND slower AND worse. setQuality() kept for API
    // compat but both modes resolve to q8.
    let _currentDtype = 'q8';
    const CDN_BASE = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';
    const CACHE_MAX = 100;
    const CHUNK_THRESHOLD = 120; // characters — chunk earlier for faster first-audio

    // Model sizes for progress display — REAL Hugging Face content-lengths
    // (2026-07-06), not aspirational: q4 is genuinely ~291MB.
    const DTYPE_SIZES = { 'q4': '~291MB', 'q4f16': '~147MB', 'q8': '~88MB', 'fp16': '~155MB', 'fp32': '~310MB' };

    // Available Kokoro voices (id → label mapping for UI)
    // Must match voices actually supported by the Kokoro CDN worker.
    const KOKORO_VOICE_LIST = [
        // ── American English — Female ──
        { id: 'af_heart',     label: '❤️ Heart — Warm female (English US)',    lang: 'en' },
        { id: 'af_nova',      label: '⭐ Nova — Clear female (English US)',     lang: 'en' },
        { id: 'af_sky',       label: '🌤️ Sky — Bright female (English US)',    lang: 'en' },
        { id: 'af_bella',     label: '🔔 Bella — Elegant female (English US)', lang: 'en' },
        { id: 'af_sarah',     label: '🌸 Sarah — Gentle female (English US)',  lang: 'en' },
        { id: 'af_nicole',    label: '🎵 Nicole — Musical female (English US)', lang: 'en' },
        { id: 'af_alloy',     label: '🔩 Alloy — Versatile female (English US)', lang: 'en' },
        { id: 'af_aoede',     label: '🎶 Aoede — Melodic female (English US)', lang: 'en' },
        { id: 'af_jessica',   label: '💐 Jessica — Friendly female (English US)', lang: 'en' },
        { id: 'af_kore',      label: '🌿 Kore — Calm female (English US)',     lang: 'en' },
        { id: 'af_river',     label: '🌊 River — Smooth female (English US)',  lang: 'en' },
        // ── American English — Male ──
        { id: 'am_adam',      label: '🧑 Adam — Natural male (English US)',     lang: 'en' },
        { id: 'am_michael',   label: '🎙️ Michael — Deep male (English US)',   lang: 'en' },
        { id: 'am_echo',      label: '📡 Echo — Resonant male (English US)',   lang: 'en' },
        { id: 'am_eric',      label: '🎤 Eric — Confident male (English US)',  lang: 'en' },
        { id: 'am_fenrir',    label: '🐺 Fenrir — Bold male (English US)',     lang: 'en' },
        { id: 'am_liam',      label: '📘 Liam — Steady male (English US)',     lang: 'en' },
        { id: 'am_onyx',      label: '🖤 Onyx — Rich male (English US)',       lang: 'en' },
        { id: 'am_puck',      label: '🃏 Puck — Playful male (English US)',    lang: 'en' },
        // ── British English ──
        { id: 'bf_emma',      label: '🇬🇧 Emma — British female',              lang: 'en' },
        { id: 'bf_isabella',  label: '🇬🇧 Isabella — British female',          lang: 'en' },
        { id: 'bf_alice',     label: '🇬🇧 Alice — British female',             lang: 'en' },
        { id: 'bf_lily',      label: '🇬🇧 Lily — British female',              lang: 'en' },
        { id: 'bm_george',    label: '🇬🇧 George — British male',              lang: 'en' },
        { id: 'bm_lewis',     label: '🇬🇧 Lewis — British male',               lang: 'en' },
        { id: 'bm_daniel',    label: '🇬🇧 Daniel — British male',              lang: 'en' },
        { id: 'bm_fable',     label: '🇬🇧 Fable — British male',               lang: 'en' },
    ];

    // Languages Kokoro supports (for cascade decision)
    const KOKORO_LANGS = new Set(['en']);

    // ─── Gemini → Kokoro voice mapping ──────────────────────────────
    const GEMINI_TO_KOKORO = {
        'puck':    'am_adam',
        'charon':  'am_michael',
        'kore':    'af_heart',
        'fenrir':  'am_michael',
        'aoede':   'af_nova',
        'leda':    'af_bella',
        'orus':    'am_adam',
        'zephyr':  'af_sky',
        'achelous':'bm_george',
    };

    function resolveVoice(voiceName) {
        if (!voiceName) return 'af_heart';
        if (voiceName.includes('_')) return voiceName;
        const mapped = GEMINI_TO_KOKORO[voiceName.toLowerCase()];
        if (mapped) return mapped;
        console.log('[Kokoro TTS] Unknown voice "' + voiceName + '", defaulting to af_heart');
        return 'af_heart';
    }

    // ─── Worker Source ──────────────────────────────────────────────────
    // EVERYTHING heavy runs here: ONNX inference, sentence splitting,
    // Float32→WAV conversion, multi-chunk WAV concatenation.
    const WORKER_SOURCE = `
        let _tts = null;
        const CHUNK_THRESHOLD = ${CHUNK_THRESHOLD};

        // ── Durable model cache proxy (added 2026-08-05) ─────────────────────
        // kokoro-js downloads the voice model through fetch() and relies on the
        // browser Cache API to keep it. In the Gemini Canvas sandbox that cache
        // is partitioned and effectively ephemeral, so the ~88MB model was
        // re-downloaded every session. This worker cannot reach AlloFlow's
        // durable device-storage bridge (that lives on the main thread), so we
        // intercept fetch here and relay through it: a hit returns bytes from
        // durable storage, a miss downloads once and stores them.
        // Only large model artifacts are proxied — never the library import,
        // never small JSON config, and never anything cross-origin we did not
        // ask for.
        const _MODEL_URL_RE = /(huggingface\\.co|hf\\.co|onnx-community|kokoro)/i;
        const _MODEL_FILE_RE = /\\.(onnx|onnx_data|bin|safetensors)(\\?|$)/i;
        let _cacheSeq = 0;
        const _cachePending = new Map();
        self.addEventListener('message', (ev) => {
            const d = ev.data;
            if (!d || d.type !== 'allo-model-cache-reply') return;
            const p = _cachePending.get(d.id);
            if (!p) return;
            _cachePending.delete(d.id);
            p(d);
        });
        function _askMain(payload, transfer) {
            return new Promise((resolve) => {
                const id = 'mc' + (++_cacheSeq);
                _cachePending.set(id, resolve);
                // Never hang the model load on the cache: give up and fall
                // through to the network.
                setTimeout(() => { if (_cachePending.has(id)) { _cachePending.delete(id); resolve({ ok: false }); } }, 20000);
                self.postMessage(Object.assign({ type: 'allo-model-cache', id }, payload), transfer || []);
            });
        }
        const _nativeFetch = self.fetch.bind(self);
        self.fetch = async function (input, init) {
            let url = '';
            try { url = typeof input === 'string' ? input : (input && input.url) || ''; } catch (_) {}
            const proxied = url && _MODEL_URL_RE.test(url) && _MODEL_FILE_RE.test(url);
            if (!proxied) return _nativeFetch(input, init);
            try {
                const hit = await _askMain({ op: 'get', url });
                if (hit && hit.ok && hit.buffer) {
                    return new Response(hit.buffer, { status: 200, headers: { 'content-type': hit.contentType || 'application/octet-stream' } });
                }
            } catch (_) {}
            const res = await _nativeFetch(input, init);
            try {
                if (res && res.ok) {
                    const buf = await res.clone().arrayBuffer();
                    // Transfer the copy; the Response the caller gets is untouched.
                    _askMain({ op: 'put', url, buffer: buf, contentType: res.headers.get('content-type') || '' }, [buf]);
                }
            } catch (_) {}
            return res;
        };

        // ── Sentence splitter (runs in worker) ──
        function splitSentences(text) {
            const sentences = text.match(/[^.!?]*(?:(?:Dr|Mr|Mrs|Ms|St|Jr|Sr|Prof|vs|Inc|Ltd|Co|U\\\\.S\\\\.A|etc)\\\\.[^.!?]*)*[.!?]+[\\\\s]*|[^.!?]+$/gi);
            if (!sentences) return [text];
            return sentences.map(s => s.trim()).filter(s => s.length > 1);
        }

        // ── Float32 PCM → WAV (runs in worker) ──
        // De-click ramps. The model can end while a voiced sound is still at
        // full amplitude, which word-final nasals ("bun", "hon") reliably are.
        // Writing that straight to PCM leaves a step at the buffer edge, and a
        // step is a click; heard right after a nasal it reads as a /t/ or /d/
        // release. In a phonemic-awareness activity that is not cosmetic — a
        // child asked for the last sound in "bun" can hear the wrong one.
        //
        // These are ramps, not trims: no sample is removed, so no phoneme can
        // be shortened. The fade-in is deliberately much shorter than the
        // fade-out, because a word beginning with a stop carries its burst in
        // the first few milliseconds and softening that would trade one wrong
        // sound for another.
        const FADE_IN_MS = 2;
        const FADE_OUT_MS = 6;
        function edgeGain(i, n, fadeIn, fadeOut) {
            let g = 1;
            if (fadeIn && i < fadeIn) g = i / fadeIn;
            if (fadeOut && i >= n - fadeOut) g = Math.min(g, (n - 1 - i) / fadeOut);
            return g;
        }
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

            const n = float32Array.length;
            // Never let a ramp eat more than half the clip from either end.
            const half = Math.floor(n / 2);
            const fadeIn = n > 3 ? Math.min(Math.floor(sampleRate * (FADE_IN_MS / 1000)), half) : 0;
            const fadeOut = n > 3 ? Math.min(Math.floor(sampleRate * (FADE_OUT_MS / 1000)), half) : 0;
            let off = 44;
            for (let i = 0; i < n; i++) {
                const s = Math.max(-1, Math.min(1, float32Array[i] * edgeGain(i, n, fadeIn, fadeOut)));
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
                    const sizeLabel = data.sizeLabel || '~88MB';
                    self.postMessage({ type: 'progress', stage: 'Downloading voice model (' + sizeLabel + ', cached after first load)', pct: 0.1 });
                    _tts = await KokoroTTS.from_pretrained(data.modelId, {
                        dtype: data.dtype,
                        progress_callback: (p) => {
                            if (!p) return;
                            if (typeof p.progress === 'number') {
                                self.postMessage({ type: 'progress', stage: 'Downloading voice model', pct: 0.1 + (p.progress / 100) * 0.85 });
                            } else if (p.status === 'initiate') {
                                self.postMessage({ type: 'progress', stage: 'Downloading voice model (' + (data.sizeLabel || '~88MB') + ')', pct: 0.1 });
                            } else if (p.status === 'done') {
                                self.postMessage({ type: 'progress', stage: 'Loading voice model into memory', pct: 0.95 });
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

                // ── GENERATE_BATCH (chunked — all work in worker, returns single buffer) ──
                if (data.type === 'generate_batch') {
                    if (!_tts) { self.postMessage({ type: 'error', id: data.id, error: 'Model not initialized' }); return; }
                    const t0 = performance.now();
                    const text = data.text;
                    const voice = data.voice;
                    const speed = data.speed;
                    const chunks = text.length > CHUNK_THRESHOLD ? splitSentences(text) : [text];
                    const wavBuffers = [];

                    for (let i = 0; i < chunks.length; i++) {
                        const buf = await generateOne(chunks[i], voice, speed);
                        // Never return a deceptively successful partial clip. A
                        // missing middle sentence is worse than a clean fallback.
                        if (!buf) throw new Error('Incomplete batch: no audio for chunk ' + (i + 1) + ' of ' + chunks.length);
                        wavBuffers.push(buf);
                    }

                    if (wavBuffers.length !== chunks.length || wavBuffers.length === 0) {
                        throw new Error('Incomplete batch: generated ' + wavBuffers.length + ' of ' + chunks.length + ' chunks');
                    }

                    const finalBuf = concatWavBuffers(wavBuffers);
                    const elapsed = performance.now() - t0;
                    self.postMessage({
                        type: 'audio', id: data.id, buffer: finalBuf,
                        elapsed, chunks: wavBuffers.length, expectedChunks: chunks.length
                    }, [finalBuf]);
                }

                // ── GENERATE_STREAM (chunked — posts each chunk back immediately) ──
                if (data.type === 'generate_stream') {
                    if (!_tts) { self.postMessage({ type: 'error', id: data.id, error: 'Model not initialized' }); return; }
                    const t0 = performance.now();
                    const text = data.text;
                    const voice = data.voice;
                    const speed = data.speed;

                    let sentences;
                    if (text.length > CHUNK_THRESHOLD) {
                        sentences = splitSentences(text);
                    } else {
                        sentences = [text];
                    }

                    const total = sentences.length;
                    let generated = 0;

                    for (let i = 0; i < sentences.length; i++) {
                        const buf = await generateOne(sentences[i], voice, speed);
                        if (!buf) throw new Error('Incomplete stream: no audio for chunk ' + (i + 1) + ' of ' + total);
                        generated++;
                        self.postMessage({
                            type: 'stream_chunk',
                            id: data.id,
                            buffer: buf,
                            index: i,
                            total,
                            elapsed: performance.now() - t0
                        }, [buf]);
                    }

                    if (generated !== total || generated === 0) {
                        throw new Error('Incomplete stream: generated ' + generated + ' of ' + total + ' chunks');
                    }
                    self.postMessage({
                        type: 'stream_done',
                        id: data.id,
                        total: generated,
                        expectedTotal: total,
                        elapsed: performance.now() - t0
                    });
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
    const _pendingMessages = new Map(); // id -> { resolve, reject }
    const _audioCache = new Map(); // exact request key -> { url, text, voice }
    const _ownedUrls = new Map(); // blob URL -> { kind, key?, stream? }
    const SYNTHESIS_SPEED = 1.0;

    // Streaming is request-scoped. The public queue helpers still address the
    // current stream for backwards compatibility, but a new request explicitly
    // supersedes and rejects a pending older request.
    let _activeStream = null;
    let _activeChain = null;
    const STREAM_PRELOAD = 3;

    function _abortError(reason) {
        const message = reason || 'Kokoro TTS operation was cancelled';
        try { return new DOMException(message, 'AbortError'); }
        catch (_) {
            const error = new Error(message);
            error.name = 'AbortError';
            return error;
        }
    }

    function _safeRevoke(url) {
        try { URL.revokeObjectURL(url); } catch (_) {}
    }

    // Hash every case-preserving UTF-16 code unit, then validate the exact text
    // stored in the entry on every hit. Even a theoretical hash collision can
    // only become a cache miss; it can never return another sentence's audio.
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

    function _cacheKey(text, voice) {
        // v3: edge fades changed the bytes, so a clip cached under v2 would
        // keep its click for the life of the page.
        return JSON.stringify(['kokoro-v3', _textFingerprint(text), voice, SYNTHESIS_SPEED, _currentDtype]);
    }

    function ownsUrl(url) {
        return typeof url === 'string' && _ownedUrls.has(url);
    }

    function invalidateUrl(url) {
        const meta = _ownedUrls.get(url);
        if (!meta) return false;
        _ownedUrls.delete(url);

        if (meta.kind === 'cache') {
            const entry = _audioCache.get(meta.key);
            if (entry && entry.url === url) _audioCache.delete(meta.key);
        } else if (meta.kind === 'stream' && meta.stream) {
            const stream = meta.stream;
            stream.urls.delete(url);
            stream.queue = stream.queue.filter((item) => item !== url);
            stream.buffer = stream.buffer.filter((item) => item !== url);
            if (stream.firstUrl === url) stream.firstUrl = null;
        }

        _safeRevoke(url);
        return true;
    }

    function _clearAudioCache() {
        const urls = Array.from(_audioCache.values(), (entry) => entry.url);
        for (const url of urls) invalidateUrl(url);
        _audioCache.clear();
    }

    function _cacheGet(key, text, voice) {
        const entry = _audioCache.get(key);
        if (!entry || !ownsUrl(entry.url)) {
            if (entry) _audioCache.delete(key);
            return null;
        }
        if (entry.text !== text || entry.voice !== voice) return null;
        // Map insertion order is our LRU order.
        _audioCache.delete(key);
        _audioCache.set(key, entry);
        return entry.url;
    }

    function _cacheSet(key, text, voice, url) {
        const replaced = _audioCache.get(key);
        if (replaced && replaced.url !== url) invalidateUrl(replaced.url);

        const entry = { url, text, voice };
        _audioCache.set(key, entry);
        _ownedUrls.set(url, { kind: 'cache', key });

        while (_audioCache.size > CACHE_MAX) {
            const oldestKey = _audioCache.keys().next().value;
            const oldest = _audioCache.get(oldestKey);
            if (oldest) invalidateUrl(oldest.url);
            else _audioCache.delete(oldestKey);
        }
    }

    function _newStream(id) {
        const stream = {
            id,
            active: true,
            cancelled: false,
            queue: [],
            buffer: [],
            bufferFlushed: false,
            urls: new Set(),
            firstUrl: null,
            firstSettled: false,
            expectedTotal: null,
            nextIndex: 0,
            resolveFirst: null,
            rejectFirst: null,
        };
        stream.firstPromise = new Promise((resolve, reject) => {
            stream.resolveFirst = resolve;
            stream.rejectFirst = reject;
        });
        return stream;
    }

    function _resolveStreamFirst(stream, url) {
        if (stream.firstSettled) return;
        stream.firstSettled = true;
        stream.firstUrl = url;
        const resolve = stream.resolveFirst;
        stream.resolveFirst = null;
        stream.rejectFirst = null;
        if (resolve) resolve(url);
    }

    function _rejectStreamFirst(stream, error) {
        if (stream.firstSettled) return;
        stream.firstSettled = true;
        const reject = stream.rejectFirst;
        stream.resolveFirst = null;
        stream.rejectFirst = null;
        if (reject) reject(error);
    }

    function _registerStreamUrl(stream, url) {
        stream.urls.add(url);
        _ownedUrls.set(url, { kind: 'stream', stream });
    }

    function _flushStreamBuffer(stream) {
        if (stream.bufferFlushed || stream.buffer.length === 0) return;
        stream.bufferFlushed = true;
        const first = stream.buffer.shift();
        stream.queue.push(...stream.buffer);
        stream.buffer = [];
        _resolveStreamFirst(stream, first);
    }

    function _cancelStream(stream, reason, notifyDone) {
        if (!stream || stream.cancelled) return false;
        const error = reason instanceof Error ? reason : _abortError(reason);
        stream.active = false;
        stream.cancelled = true;
        if (stream.signalCleanup) {
            stream.signalCleanup();
            stream.signalCleanup = null;
        }
        _rejectStreamFirst(stream, error);

        if (_activeChain && _activeChain.stream === stream) {
            _stopChain(Boolean(notifyDone));
        }

        for (const url of Array.from(stream.urls)) invalidateUrl(url);
        stream.queue = [];
        stream.buffer = [];
        if (_activeStream === stream) _activeStream = null;
        return true;
    }

    function _takePending(id) {
        const pending = _pendingMessages.get(id);
        if (!pending) return null;
        _pendingMessages.delete(id);
        if (pending.cleanup) pending.cleanup();
        return pending;
    }

    function _signalAbortError(signal) {
        const reason = signal && signal.reason;
        return _abortError(reason && reason.message ? reason.message : (reason || 'Kokoro TTS request was cancelled'));
    }

    function _awaitWithSignal(promise, signal, onAbort) {
        if (!signal) return promise;
        if (signal.aborted) {
            if (onAbort) onAbort();
            return Promise.reject(_signalAbortError(signal));
        }

        return new Promise((resolve, reject) => {
            let settled = false;
            const cleanup = () => signal.removeEventListener('abort', abort);
            const abort = () => {
                if (settled) return;
                settled = true;
                cleanup();
                if (onAbort) onAbort();
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

    function _rejectAllPending(error) {
        for (const id of Array.from(_pendingMessages.keys())) {
            const pending = _takePending(id);
            if (pending) {
                try { pending.reject(error); } catch (_) {}
            }
        }
    }

    function _cancelPendingGeneration(reason) {
        const error = reason instanceof Error ? reason : _abortError(reason);
        let cancelled = 0;
        for (const [id, pending] of Array.from(_pendingMessages.entries())) {
            if (pending.type !== 'generate_batch') continue;
            const taken = _takePending(id);
            if (taken) {
                cancelled++;
                taken.reject(error);
            }
        }
        return cancelled;
    }

    function _terminateWorker(reason) {
        const error = reason instanceof Error ? reason : _abortError(reason || 'Kokoro TTS worker terminated');
        const worker = _worker;
        _worker = null;
        _ready = false;
        _initPromise = null;
        _rejectAllPending(error);
        if (_activeStream) _cancelStream(_activeStream, error, true);

        if (worker) {
            worker.onmessage = null;
            worker.onerror = null;
            worker.onmessageerror = null;
            try { worker.terminate(); } catch (_) {}
        }
    }

    function _handleWorkerFailure(worker, error) {
        if (_worker !== worker) return;
        console.warn('[Kokoro TTS] Worker failed:', error.message);
        _terminateWorker(error);
    }

    // ─── Worker Setup ───────────────────────────────────────────────────
    function _createWorker() {
        const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        let w;
        try {
            w = new Worker(url, { type: 'module' });
        } finally {
            // Worker() captures the script URL synchronously; retaining it leaks
            // one Blob URL on every quality switch/retry.
            _safeRevoke(url);
        }

        w.onmessage = ({ data }) => {
            // Durable model cache relay (see the worker-side comment). Kept
            // ahead of the switch because it is not part of the TTS protocol,
            // and it must never throw into the worker's message handling.
            if (data && data.type === 'allo-model-cache') {
                const mc = window.AlloModules && window.AlloModules.AlloCommands && window.AlloModules.AlloCommands.modelCache;
                const reply = (payload) => { try { w.postMessage(Object.assign({ type: 'allo-model-cache-reply', id: data.id }, payload)); } catch (_) {} };
                if (!mc) { reply({ ok: false }); return; }
                if (data.op === 'get') {
                    Promise.resolve(mc.match(data.url)).then((res) => {
                        if (!res) { reply({ ok: false }); return; }
                        return res.arrayBuffer().then((buf) => {
                            try { w.postMessage({ type: 'allo-model-cache-reply', id: data.id, ok: true, buffer: buf, contentType: res.headers.get('content-type') || '' }, [buf]); }
                            catch (_) { reply({ ok: false }); }
                        });
                    }).catch(() => reply({ ok: false }));
                } else if (data.op === 'put') {
                    Promise.resolve(mc.put(data.url, data.buffer, data.contentType))
                        .then(() => reply({ ok: true })).catch(() => reply({ ok: false }));
                } else {
                    reply({ ok: false });
                }
                return;
            }
            switch (data.type) {
                case 'progress':
                    _loadProgress = data.pct;
                    if (_onProgress) _onProgress({ stage: data.stage, pct: data.pct });
                    // Only log at 25% milestones to reduce console noise
                    var pctRound = Math.round(data.pct * 100);
                    if (pctRound % 25 === 0 || pctRound >= 95) console.log('[Kokoro TTS] ' + data.stage + ': ' + pctRound + '%');
                    break;

                case 'ready': {
                    _ready = true;
                    console.log('[Kokoro TTS] Worker initialized (dtype: ' + _currentDtype + ')');
                    const p = _takePending('__init__');
                    if (p) p.resolve(true);
                    _purgeStaleModelCache();
                    break;
                }

                case 'init_error': {
                    const error = new Error(data.error || 'Kokoro worker initialization failed');
                    console.warn('[Kokoro TTS] Worker init failed:', error.message);
                    const p = _takePending('__init__');
                    if (p) p.reject(error);
                    break;
                }

                case 'audio': {
                    const p = _takePending(data.id);
                    if (p) {
                        p.resolve({
                            buffer: data.buffer,
                            elapsed: data.elapsed,
                            chunks: data.chunks,
                            expectedChunks: data.expectedChunks,
                        });
                    }
                    break;
                }

                case 'error': {
                    const error = new Error(data.error || 'Kokoro worker generation failed');
                    const p = _takePending(data.id);
                    if (p) p.reject(error);

                    const stream = _activeStream;
                    if (stream && data.id === stream.id) _cancelStream(stream, error, true);
                    break;
                }

                case 'stream_chunk': {
                    const stream = _activeStream;
                    if (!stream || stream.cancelled || data.id !== stream.id) break;

                    const total = Number(data.total);
                    const index = Number(data.index);
                    if (!Number.isInteger(total) || total < 1 ||
                        !Number.isInteger(index) || index !== stream.nextIndex ||
                        (stream.expectedTotal !== null && stream.expectedTotal !== total)) {
                        _cancelStream(stream, new Error('Incomplete stream: out-of-order or inconsistent chunk metadata'), true);
                        break;
                    }
                    stream.expectedTotal = total;
                    stream.nextIndex++;

                    const chunkBlob = new Blob([data.buffer], { type: 'audio/wav' });
                    const chunkUrl = URL.createObjectURL(chunkBlob);
                    _registerStreamUrl(stream, chunkUrl);

                    if (stream.bufferFlushed) {
                        stream.queue.push(chunkUrl);
                    } else {
                        stream.buffer.push(chunkUrl);
                        if (stream.buffer.length >= STREAM_PRELOAD || total === 1) {
                            _flushStreamBuffer(stream);
                        }
                    }
                    break;
                }

                case 'stream_done': {
                    const stream = _activeStream;
                    if (!stream || stream.cancelled || data.id !== stream.id) break;

                    const total = Number(data.total);
                    const expected = Number(data.expectedTotal);
                    if (!Number.isInteger(total) || total < 1 ||
                        !Number.isInteger(expected) || total !== expected ||
                        expected !== stream.expectedTotal ||
                        stream.nextIndex !== expected) {
                        _cancelStream(stream, new Error('Incomplete stream: worker ended before every chunk arrived'), true);
                        break;
                    }

                    stream.active = false;
                    _flushStreamBuffer(stream);
                    if (!stream.firstSettled) {
                        _cancelStream(stream, new Error('Incomplete stream: no playable audio was generated'), true);
                    }
                    break;
                }
            }
        };

        w.onerror = (event) => {
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
            _handleWorkerFailure(w, new Error((event && event.message) || 'Kokoro worker crashed'));
        };
        w.onmessageerror = () => {
            _handleWorkerFailure(w, new Error('Kokoro worker returned an unreadable message'));
        };

        return w;
    }

    function _sendToWorker(type, payload, options) {
        return new Promise((resolve, reject) => {
            if (!_worker) {
                reject(new Error('Kokoro TTS worker is not available'));
                return;
            }

            const signal = options && options.signal;
            if (signal && signal.aborted) {
                reject(_signalAbortError(signal));
                return;
            }

            const id = payload.id || ('msg_' + (++_msgId));
            const previous = _takePending(id);
            if (previous) previous.reject(_abortError('Kokoro TTS request was superseded'));

            let cleanup = null;
            if (signal) {
                const abort = () => {
                    const pending = _takePending(id);
                    if (pending) pending.reject(_signalAbortError(signal));
                };
                signal.addEventListener('abort', abort, { once: true });
                cleanup = () => signal.removeEventListener('abort', abort);
            }
            _pendingMessages.set(id, { resolve, reject, cleanup, type });

            try {
                _worker.postMessage({ type, ...payload, id });
            } catch (error) {
                const pending = _takePending(id);
                if (pending) pending.reject(error);
            }
        });
    }

    // ─── Stale-model cache reclaim ──────────────────────────────────────
    // Installs that booted before the q8 default carry the 291MB q4 blob in
    // the Cache API (per origin!). After a SUCCESSFUL init, delete cached
    // Kokoro model files for every dtype except the active one. Never runs
    // on failure, so a broken init can't strand the user with no model at
    // all. Fire-and-forget; transformers.js uses the 'transformers-cache'.
    const DTYPE_FILES = { 'fp32': 'model.onnx', 'fp16': 'model_fp16.onnx', 'q8': 'model_quantized.onnx', 'q4': 'model_q4.onnx', 'q4f16': 'model_q4f16.onnx' };
    function _purgeStaleModelCache() {
        try {
            if (typeof caches === 'undefined' || !caches.open) return;
            const keep = DTYPE_FILES[_currentDtype] || 'model_quantized.onnx';
            caches.open('transformers-cache').then(async (cache) => {
                const entries = await cache.keys();
                let freed = 0;
                for (const req of entries) {
                    const url = String(req.url || '');
                    if (url.indexOf('Kokoro-82M') < 0 || url.indexOf('/onnx/model') < 0) continue;
                    if (url.indexOf('/' + keep) >= 0) continue;
                    try { if (await cache.delete(req)) freed++; } catch (_) {}
                }
                if (freed) console.log('[Kokoro TTS] 🧹 Reclaimed ' + freed + ' stale model file(s) from cache (kept ' + keep + ')');
            }).catch(() => {});
        } catch (_) {}
    }

    // ─── Initialize ─────────────────────────────────────────────────────
    async function init(onProgress) {
        if (onProgress) _onProgress = onProgress; // Always update callback before early returns
        if (_ready && _worker) return true;
        if (_initPromise) return _initPromise;

        _initPromise = (async () => {
            try {
                _worker = _createWorker();

                const initDone = new Promise((resolve, reject) => {
                    _pendingMessages.set('__init__', { resolve, reject });
                });

                _worker.postMessage({
                    type: 'init',
                    modelId: MODEL_ID,
                    dtype: _currentDtype,
                    cdn: CDN_BASE,
                    sizeLabel: DTYPE_SIZES[_currentDtype] || '~88MB',
                });

                await initDone;

                // ── Warm-up inference ──
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
                    if (!_worker || !_ready) throw warmupErr;
                    console.warn('[Kokoro TTS] Warm-up failed (non-fatal):', warmupErr.message);
                }

                return true;
            } catch (e) {
                console.error('[Kokoro TTS] ❌ Initialization failed:', e);
                _terminateWorker(e);
                throw e;
            }
        })();

        return _initPromise;
    }

    // ─── Generate Speech (batch — waits for all chunks) ─────────────────
    async function speak(text, voice, speed, options) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) return null;

        options = options || {};
        const signal = options.signal;
        if (signal && signal.aborted) throw _signalAbortError(signal);
        voice = resolveVoice(voice);

        if (!_ready) {
            try {
                await _awaitWithSignal(init(), signal);
            } catch (e) {
                if (e && e.name === 'AbortError') throw e;
                console.warn('[Kokoro TTS] Init failed in speak(), returning null:', e && e.message);
                return null;
            }
        }
        if (signal && signal.aborted) throw _signalAbortError(signal);

        const cacheKey = _cacheKey(text, voice);
        const cached = _cacheGet(cacheKey, text, voice);
        if (cached) return cached;

        try {
            // Speed is deliberately applied by the Audio element, not baked
            // into reusable bytes. Callers already set playbackRate.
            const result = await _sendToWorker(
                'generate_batch',
                { text, voice, speed: SYNTHESIS_SPEED },
                { signal }
            );
            if (signal && signal.aborted) throw _signalAbortError(signal);
            if (!result.buffer ||
                !Number.isInteger(result.chunks) ||
                !Number.isInteger(result.expectedChunks) ||
                result.chunks < 1 ||
                result.chunks !== result.expectedChunks) {
                console.warn('[Kokoro TTS] Incomplete batch; refusing partial audio');
                return null;
            }

            // Another identical request may have completed while this worker
            // request was queued. Reuse it instead of replacing a live URL.
            const raced = _cacheGet(cacheKey, text, voice);
            if (raced) return raced;

            const audioBlob = new Blob([result.buffer], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            _cacheSet(cacheKey, text, voice, audioUrl);
            return audioUrl;
        } catch (e) {
            if (e && e.name === 'AbortError') throw e;
            console.warn('[Kokoro TTS] Generation failed:', e);
            return null;
        }
    }

    // ─── Streaming Speech (plays first sentence ASAP) ───────────────────
    // Returns a URL for the FIRST chunk immediately. Remaining chunks are
    // pushed into _streamQueue for the caller to play sequentially.
    //
    // Usage:
    //   const firstUrl = await _kokoroTTS.speakStreaming(text, voice, speed);
    //   // Play firstUrl immediately
    //   // On audio end, check _kokoroTTS.streamQueue for next chunk:
    //   //   const nextUrl = _kokoroTTS.shiftStreamChunk();
    //   //   if (nextUrl) playNextAudio(nextUrl);
    //   //   else done();
    async function speakStreaming(text, voice, speed, options) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) return null;

        options = options || {};
        const signal = options.signal;
        if (signal && signal.aborted) throw _signalAbortError(signal);
        voice = resolveVoice(voice);

        if (!_ready) {
            try {
                await _awaitWithSignal(init(), signal);
            } catch (e) {
                if (e && e.name === 'AbortError') throw e;
                console.warn('[Kokoro TTS] Init failed in speakStreaming(), returning null:', e && e.message);
                return null;
            }
        }
        if (signal && signal.aborted) throw _signalAbortError(signal);

        if (_activeStream) {
            _cancelStream(_activeStream, _abortError('Kokoro stream was superseded'), false);
        }

        // Cached and short requests need no stream state.
        const cacheKey = _cacheKey(text, voice);
        const cached = _cacheGet(cacheKey, text, voice);
        if (cached) return cached;
        if (text.length <= CHUNK_THRESHOLD) {
            return speak(text, voice, speed, options);
        }

        const stream = _newStream('stream_' + (++_msgId));
        _activeStream = stream;

        if (signal) {
            const abort = () => {
                if (_activeStream === stream && !stream.cancelled) {
                    _cancelStream(stream, _signalAbortError(signal), true);
                }
            };
            signal.addEventListener('abort', abort, { once: true });
            stream.signalCleanup = () => signal.removeEventListener('abort', abort);
        }

        try {
            // As with speak(), generate neutral 1x bytes. chainPlay applies
            // requested playback speed exactly once to every streamed chunk.
            _worker.postMessage({
                type: 'generate_stream',
                text,
                voice,
                speed: SYNTHESIS_SPEED,
                id: stream.id,
            });
            return await stream.firstPromise;
        } catch (e) {
            if (!stream.cancelled) _cancelStream(stream, e, true);
            if (e && e.name === 'AbortError') throw e;
            console.warn('[Kokoro TTS] Streaming failed:', e);
            return null;
        }
    }

    // Called by an existing audio player when the current chunk ends.
    function shiftStreamChunk() {
        const stream = _activeStream;
        if (!stream || stream.cancelled || stream.queue.length === 0) return null;
        return stream.queue.shift();
    }

    function hasStreamChunks() {
        const stream = _activeStream;
        return Boolean(stream && !stream.cancelled && (stream.queue.length > 0 || stream.active));
    }

    function stop(reason) {
        const error = _abortError(reason || 'Kokoro TTS playback stopped');
        let stopped = _cancelPendingGeneration(error) > 0;
        if (_activeStream) {
            stopped = _cancelStream(_activeStream, error, true) || stopped;
        } else if (_activeChain) {
            _stopChain(true);
            stopped = true;
        }
        return stopped;
    }

    function clearCache() {
        _clearAudioCache();
    }

    function dispose(reason) {
        stop(reason || 'Kokoro TTS disposed');
        _terminateWorker(_abortError(reason || 'Kokoro TTS disposed'));
        _clearAudioCache();
        _loadProgress = 0;
        _onProgress = null;
    }

    // Quality Toggle (API compatibility)
    // q4 is retired: every legacy mode resolves to q8 so callers do not
    // download a larger, slower, lower-quality model.
    async function setQuality(mode, onProgress) {
        const newDtype = 'q8';
        if (newDtype === _currentDtype && _ready) {
            console.log('[Kokoro TTS] Quality already set to', mode);
            return _currentDtype;
        }

        console.log(`[Kokoro TTS] 🔄 Switching quality: ${_currentDtype} → ${newDtype}`);
        _currentDtype = newDtype;

        // Tear down current worker and every URL it owns.
        _terminateWorker(_abortError('Kokoro TTS quality changed'));
        _clearAudioCache();

        // Re-initialize with new dtype
        try {
            await init(onProgress);
            console.log('[Kokoro TTS] ✅ Quality switched to', mode, '(' + newDtype + ')');
        } catch (e) {
            console.warn('[Kokoro TTS] ❌ Quality switch failed:', e);
        }

        return _currentDtype;
    }

    // ─── Language Support Check ─────────────────────────────────────────
    function supportsLanguage(langCode) {
        if (!langCode) return true;
        const baseLang = langCode.split('-')[0].toLowerCase();
        return KOKORO_LANGS.has(baseLang);
    }

    // ─── Streaming Chain-Player ──────────────────────────────────────────
    // Self-contained helper: given an Audio element playing the FIRST
    // streaming chunk, wires up onended to automatically play subsequent
    // chunks from the queue. Caller just needs:
    //   window._kokoroTTS.chainPlay(audio, speed, volume, onAllDone);
    function _audioUrl(audio) {
        if (!audio) return '';
        return audio.currentSrc || audio.src ||
            (typeof audio.getAttribute === 'function' ? audio.getAttribute('src') : '') || '';
    }

    function _finishChain(chain, notifyDone, stopAudio) {
        if (!chain || chain.finished) return;
        chain.finished = true;
        if (chain.timer) clearTimeout(chain.timer);

        if (stopAudio && chain.audio && typeof chain.audio.pause === 'function') {
            try { chain.audio.pause(); } catch (_) {}
        }
        if (chain.currentUrl && ownsUrl(chain.currentUrl)) {
            invalidateUrl(chain.currentUrl);
        }

        const stream = chain.stream;
        if (stream && !stream.active && stream.queue.length === 0) {
            if (stream.signalCleanup) {
                stream.signalCleanup();
                stream.signalCleanup = null;
            }
            for (const url of Array.from(stream.urls)) invalidateUrl(url);
            if (_activeStream === stream) _activeStream = null;
        }

        if (_activeChain === chain) _activeChain = null;
        if (notifyDone && !chain.doneNotified && typeof chain.onDone === 'function') {
            chain.doneNotified = true;
            chain.onDone();
        }
    }

    function _stopChain(notifyDone) {
        const chain = _activeChain;
        if (!chain) return false;
        _finishChain(chain, notifyDone, true);
        return true;
    }

    function chainPlay(audio, speed, volume, onDone) {
        const initialUrl = _audioUrl(audio);
        const ownership = _ownedUrls.get(initialUrl);
        const stream = ownership && ownership.kind === 'stream' ? ownership.stream : null;

        // AlloBot calls this helper for cloud and cached clips too. Only a URL
        // owned by the current stream may consume that stream's queue.
        if (!stream || stream !== _activeStream || stream.cancelled) {
            audio.onended = () => { if (onDone) onDone(); };
            return { stop: () => false };
        }

        _stopChain(false);
        const playbackRate = Number.isFinite(Number(speed)) && Number(speed) > 0 ? Number(speed) : 1;
        const playbackVolume = volume === undefined || volume === null
            ? 1
            : Math.max(0, Math.min(1, Number(volume)));

        const chain = {
            stream,
            audio,
            currentUrl: initialUrl,
            timer: null,
            onDone,
            doneNotified: false,
            finished: false,
        };
        _activeChain = chain;
        audio.playbackRate = playbackRate;
        audio.volume = Number.isFinite(playbackVolume) ? playbackVolume : 1;

        const failChain = (error) => {
            if (!stream.cancelled) {
                _cancelStream(stream, error || new Error('Kokoro stream playback failed'), true);
            } else {
                _finishChain(chain, true, false);
            }
        };

        const playNext = () => {
            if (chain.finished) return;
            if (chain.currentUrl && ownsUrl(chain.currentUrl)) invalidateUrl(chain.currentUrl);
            chain.currentUrl = null;

            if (!window._kokoroTTS || stream.cancelled || stream !== _activeStream) {
                _finishChain(chain, false, false);
                return;
            }

            const nextUrl = stream.queue.length > 0 ? stream.queue.shift() : null;
            if (nextUrl) {
                const next = new Audio(nextUrl);
                chain.audio = next;
                chain.currentUrl = nextUrl;
                next.playbackRate = playbackRate;
                next.volume = Number.isFinite(playbackVolume) ? playbackVolume : 1;
                next.onended = playNext;
                next.onerror = () => failChain(new Error('Kokoro stream audio failed to play'));
                next.play().catch((error) => failChain(error));
                return;
            }

            if (stream.active) {
                chain.timer = setTimeout(playNext, 200);
                return;
            }
            _finishChain(chain, true, false);
        };

        audio.onended = playNext;
        return {
            stop: () => _cancelStream(
                stream,
                _abortError('Kokoro stream playback stopped'),
                true
            )
        };
    }

    // ─── Expose Global API ──────────────────────────────────────────────
    window._kokoroTTS = {
        init: init,
        speak: speak,
        speakStreaming: speakStreaming,
        shiftStreamChunk: shiftStreamChunk,
        hasStreamChunks: hasStreamChunks,
        chainPlay: chainPlay,
        stop: stop,
        dispose: dispose,
        ownsUrl: ownsUrl,
        invalidateUrl: invalidateUrl,
        clearCache: clearCache,
        setQuality: setQuality,
        resolveVoice: resolveVoice,
        supportsLanguage: supportsLanguage,
        voices: KOKORO_VOICE_LIST,
        get ready() { return _ready; },
        get progress() { return _loadProgress; },
        get quality() { return _currentDtype === 'q8' ? 'high' : 'fast'; },
        get synthesisRate() { return SYNTHESIS_SPEED; },
        get streamActive() {
            return Boolean(_activeStream && !_activeStream.cancelled && _activeStream.active);
        },
        get streamQueueLength() {
            return _activeStream && !_activeStream.cancelled ? _activeStream.queue.length : 0;
        },
    };

    console.log('[Kokoro TTS] 📦 Worker-based loader registered (default: q4 fast mode). Call init() or speak() to start.');
})();
