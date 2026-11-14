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

    // Loading the 82M model and ONNX/WASM runtime beside a live microphone can
    // exhaust or destabilize an iOS WebKit Canvas process. The shell normally
    // blocks this first; keep the loader safe when it is injected directly too.
    function isIosCanvasRuntime() {
        try {
            const href = String(window.location && window.location.href || '');
            const host = String(window.location && window.location.hostname || '');
            const canvas = window._isCanvasEnv === true || href.startsWith('blob:') ||
                /(?:googleusercontent|scf\.usercontent|code-server|idx\.google|run\.app)/i.test(host);
            if (!canvas) return false;
            if (window._isIOSCanvasEnv === true) return true;
            const nav = window.navigator || {};
            return /iP(?:hone|ad|od)/i.test(String(nav.userAgent || '')) ||
                (String(nav.platform || '') === 'MacIntel' && Number(nav.maxTouchPoints) > 1);
        } catch (_) { return false; }
    }
    if (isIosCanvasRuntime()) {
        window.__kokoroTTSUnavailableReason = 'ios-canvas';
        console.warn('[Kokoro TTS] Disabled inside Gemini Canvas on iPhone/iPad to protect the Canvas session');
        return;
    }

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

    // ─── Word recipe: say the word in a sentence, cut it out ──────────
    // The owner-approved Packets recipe (dev-tools/build_word_sounds_word_audio.cjs
    // --recipe sentence, 2026-11-13), ported for live use: the voice reads
    // "Here is the word... {word}.", the word is cut out at the pause, kept
    // with a gentle trim and brought to -20 LUFS (BS.1770, true peak <= -1.5
    // dBTP). Each function below is the generator's own, line for line, on
    // ArrayBuffer/DataView instead of Buffer; tests/kokoro_word_recipe.test.js
    // runs both on the same input and requires identical output. This factory
    // is self-contained: its source text is copied into the worker.
    function kokoroWordRecipe() {
        'use strict';
        const GENTLE = Object.freeze({ floor: 0.003, beforeSeconds: 0.06, afterSeconds: 0.12, fadeInSeconds: 0.005, fadeOutSeconds: 0.03 });
        const CUT = Object.freeze({ frameSeconds: 0.01, hopSeconds: 0.005, quietDb: -40, minGapSeconds: 0.1, rivalRatio: 0.7, minRatio: 0.6, maxRatio: 1.8,
            minPrefixSeconds: 0.25, minWordSeconds: 0.12, settleSeconds: 0.02, prefixTolerance: 0.3 });
        const LOUDNESS = Object.freeze({ target: -20, ceiling: -1.5, maxGainDb: 12 });
        const GATES = Object.freeze({ minSeconds: 0.25, maxSeconds: 2.5, under: 0.28, over: 0.45, minPeak: 0.2, minRms: 0.05, maxRms: 0.16, minAudibleSeconds: 0.08,
            maxClippedFraction: 0.0005, maxTailRatio: 0.02, minSourceTailSeconds: 0.06, minSourceLeadSeconds: 0.01, encodedDurationSlack: 0.08 });
        const RECIPE_GATES = Object.freeze(Object.assign({}, GATES, { minRms: 0.02, offsetSeconds: 0.09 }));
        const CARRIERS = Object.freeze(['Here is the word... {word}.', 'The word is... {word}.']);
        const CARRIER_SLOT = '{word}';
        const CALIBRATION_WORDS = Object.freeze(['man', 'sun', 'top']);
        const assert = (condition, message) => { if (!condition) throw new Error(message); };
        const viewOf = raw => (raw instanceof ArrayBuffer ? new DataView(raw) : new DataView(raw.buffer, raw.byteOffset, raw.byteLength));
        const tagAt = (view, offset) => String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
        function readPcm(raw) {
            const view = viewOf(raw);
            assert(view.byteLength >= 46 && tagAt(view, 0) === 'RIFF' && tagAt(view, 36) === 'data', 'Expected loader PCM WAV');
            assert(view.getUint16(20, true) === 1 && view.getUint16(22, true) === 1 && view.getUint16(34, true) === 16, 'Expected mono 16-bit PCM');
            const rate = view.getUint32(24, true), length = Math.min(view.getUint32(40, true), view.byteLength - 44) >> 1;
            const samples = new Float32Array(length);
            for (let i = 0; i < length; i++) samples[i] = view.getInt16(44 + i * 2, true) / 32768;
            return { rate, samples };
        }
        function pcmToWav(samples, rate) {
            const n = samples.length, wav = new ArrayBuffer(44 + n * 2), view = new DataView(wav), ints = new Int16Array(n);
            const put = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
            put(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); put(8, 'WAVEfmt ');
            view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
            view.setUint16(32, 2, true); view.setUint16(34, 16, true); put(36, 'data'); view.setUint32(40, n * 2, true);
            for (let i = 0; i < n; i++) { ints[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32768))); view.setInt16(44 + i * 2, ints[i], true); }
            return { wav, samples: ints };
        }
        const peakOf = samples => { let peak = 0; for (let i = 0; i < samples.length; i++) { const a = Math.abs(samples[i]); if (a > peak) peak = a; } return peak; };
        function soundEdges(samples, floorValue, from = 0, to = samples.length) {
            let first = from, last = to - 1;
            while (first < to && Math.abs(samples[first]) < floorValue) first++;
            while (last >= first && Math.abs(samples[last]) < floorValue) last--;
            return first < to && last >= first ? { first, last } : null;
        }
        function marginClip(samples, rate, first, last, limits = {}) {
            const lower = limits.lower == null ? 0 : limits.lower, upper = limits.upper == null ? samples.length : limits.upper;
            const start = Math.max(lower, first - Math.round(rate * GENTLE.beforeSeconds));
            const end = Math.min(upper, last + 1 + Math.round(rate * GENTLE.afterSeconds));
            const count = end - start, out = new Float32Array(count);
            const fadeIn = Math.min(Math.round(rate * GENTLE.fadeInSeconds), Math.floor(count / 2), first - start);
            const fadeOut = Math.min(Math.round(rate * GENTLE.fadeOutSeconds), Math.floor(count / 2), end - 1 - last);
            for (let i = 0; i < count; i++) {
                let gain = 1;
                if (fadeIn > 0 && i < fadeIn) gain = 0.5 - 0.5 * Math.cos(Math.PI * i / fadeIn);
                if (fadeOut > 0 && i >= count - fadeOut) gain = Math.min(gain, 0.5 - 0.5 * Math.cos(Math.PI * (count - 1 - i) / fadeOut));
                out[i] = samples[start + i] * gain;
            }
            return { float: out, start, end, first, last, rate, sourceDurationSeconds: samples.length / rate, trimmedLeadingSeconds: start / rate, trimmedTrailingSeconds: (samples.length - end) / rate,
                sourceLeadSilenceSeconds: (first - lower) / rate, sourceTailSilenceSeconds: (upper - 1 - last) / rate };
        }
        function asTrimmed(clip) { const { wav, samples } = pcmToWav(clip.float, clip.rate); return Object.assign({}, clip, { wav, samples }); }
        function quietRuns(samples, rate) {
            const size = Math.round(rate * CUT.frameSeconds), hop = Math.round(rate * CUT.hopSeconds);
            const frames = Math.max(0, Math.floor((samples.length - size) / hop) + 1), rms = new Float64Array(frames);
            let loudest = 0;
            for (let f = 0; f < frames; f++) {
                let sum = 0;
                for (let i = f * hop, end = f * hop + size; i < end; i++) sum += samples[i] * samples[i];
                rms[f] = Math.sqrt(sum / size);
                if (rms[f] > loudest) loudest = rms[f];
            }
            const limit = loudest * Math.pow(10, CUT.quietDb / 20);
            let firstLoud = -1, lastLoud = -1;
            for (let f = 0; f < frames; f++) if (rms[f] >= limit) { if (firstLoud < 0) firstLoud = f; lastLoud = f; }
            const runs = [];
            for (let f = firstLoud + 1; f < lastLoud; f++) {
                if (rms[f] >= limit) continue;
                let g = f;
                while (g + 1 < lastLoud && rms[g + 1] < limit) g++;
                const from = (f - 1) * hop + size, to = (g + 1) * hop;
                runs.push({ from, to, seconds: Math.max(0, to - from) / rate });
                f = g;
            }
            return { runs, speechFrom: firstLoud < 0 ? 0 : firstLoud * hop, speechTo: lastLoud < 0 ? samples.length : lastLoud * hop + size, frames, hop, size };
        }
        function cutCarrier(raw, { bareSeconds = 0, prefixSeconds = 0 } = {}) {
            const { rate, samples } = readPcm(raw);
            const failures = [];
            const peak = peakOf(samples);
            if (!(peak > 0)) return { ok: false, failures: ['the take is silent'] };
            const found = quietRuns(samples, rate);
            const long = found.runs.filter(run => run.seconds >= CUT.minGapSeconds);
            if (!long.length) return { ok: false, failures: ['no clear pause before the word (no quiet stretch of 100 ms)'], runs: found.runs };
            const gap = long.reduce((best, run) => (run.seconds > best.seconds ? run : best), long[0]);
            const rivals = long.filter(run => run !== gap && run.seconds >= gap.seconds * CUT.rivalRatio);
            if (rivals.length) failures.push('two pauses look alike (' + Math.round(gap.seconds * 1000) + ' ms and ' + Math.round(rivals[0].seconds * 1000) + ' ms)');
            const later = long.filter(run => run.from > gap.from);
            if (later.length) failures.push('another pause after the cut (' + Math.round(later[0].seconds * 1000) + ' ms): the cut may hold more than the word');
            const before = (gap.from - found.speechFrom) / rate;
            if (before < CUT.minPrefixSeconds) failures.push('the pause comes too early (' + before.toFixed(2) + ' s after the first sound)');
            if (prefixSeconds > 0 && Math.abs(before - prefixSeconds) > prefixSeconds * CUT.prefixTolerance) {
                failures.push('the pause is not where this sentence puts it (' + before.toFixed(2) + ' s after the first sound, usually ' + prefixSeconds.toFixed(2) + ' s)');
            }
            const floorValue = peak * GENTLE.floor, win = Math.max(1, Math.round(rate * 0.005)), needQuiet = Math.round(CUT.settleSeconds / 0.005);
            const loudIn = (a, b) => { for (let i = Math.max(0, a); i < Math.min(samples.length, b); i++) if (Math.abs(samples[i]) >= floorValue) return true; return false; };
            let best = null;
            for (let at = gap.from, from = -1; at + win <= gap.to + win; at += win) {
                const quiet = at + win <= gap.to && !loudIn(at, at + win);
                if (quiet && from < 0) from = at;
                if (!quiet && from >= 0) { if (!best || at - from > best.to - best.from) best = { from, to: at }; from = -1; }
            }
            if (!best || best.to - best.from < needQuiet * win) return { ok: false, failures: failures.concat(['the sentence runs into the word: no 20 ms under -50 dB in the pause']), gap };
            const carrierEnd = best.from;
            const after = soundEdges(samples, floorValue, best.to, samples.length);
            if (!after) return { ok: false, failures: failures.concat(['nothing after the pause']), gap };
            const own = { first: after.first, last: after.last };
            const lower = Math.min(own.first, carrierEnd + Math.min(Math.round(rate * CUT.settleSeconds), Math.floor((best.to - best.from) / 2)));
            const clip = marginClip(samples, rate, own.first, own.last, { lower });
            const wordSeconds = (own.last + 1 - own.first) / rate;
            if (wordSeconds < CUT.minWordSeconds) failures.push('the cut is too short (' + wordSeconds.toFixed(2) + ' s)');
            const ratio = bareSeconds > 0 ? wordSeconds / bareSeconds : 0;
            if (bareSeconds > 0 && (ratio < CUT.minRatio || ratio > CUT.maxRatio)) failures.push('the cut is ' + ratio.toFixed(2) + ' x the bare word (' + wordSeconds.toFixed(2) + ' s against ' + bareSeconds.toFixed(2) + ' s): outside 0.6 to 1.8');
            let remnant = 0;
            for (let i = clip.start; i < own.first; i++) if (Math.abs(samples[i]) >= floorValue) remnant++;
            if (remnant > Math.round(rate * 0.002)) failures.push('sound from the sentence is left in front of the word');
            if (own.first - clip.start < Math.round(rate * 0.01)) failures.push('the pause leaves under 10 ms of quiet before the word');
            return { ok: !failures.length, failures, clip: failures.length ? null : asTrimmed(clip), wordSeconds, ratio, gap: { seconds: gap.seconds, before }, beforeSeconds: (own.first - clip.start) / rate,
                afterSeconds: (clip.end - 1 - own.last) / rate, runs: found.runs.length };
        }
        function measurePcm(samples, rate) {
            const n = samples.length;
            let peakInt = 0, squares = 0, audible = 0, clipped = 0;
            for (let i = 0; i < n; i++) {
                const a = Math.abs(samples[i]);
                if (a > peakInt) peakInt = a;
                squares += samples[i] * samples[i];
                if (a > 327) audible++;
                if (a >= 32736) clipped++;
            }
            const floor = peakInt * 0.01;
            let first = 0, last = n - 1;
            while (first < last && Math.abs(samples[first]) < floor) first++;
            while (last > first && Math.abs(samples[last]) < floor) last--;
            const tail = Math.min(n, Math.round(rate * 0.03));
            let tailSquares = 0;
            for (let i = n - tail; i < n; i++) tailSquares += samples[i] * samples[i];
            return { durationSeconds: n / rate, sampleRate: rate, peak: peakInt / 32768, rms: n ? Math.sqrt(squares / n) / 32768 : 0,
                audibleSeconds: audible / rate, clippedFraction: n ? clipped / n : 0, leadSilenceSeconds: n ? first / rate : 0, tailSilenceSeconds: n ? (n - 1 - last) / rate : 0,
                tailRms: tail ? Math.sqrt(tailSquares / tail) / 32768 : 0 };
        }
        const expectedSeconds = sounds => 0.415 + 0.046 * sounds;
        function checkClip(trimmed, sounds, gates = GATES) {
            const m = measurePcm(trimmed.samples, trimmed.rate);
            const failures = [];
            const seconds = value => value.toFixed(2) + ' s';
            if (m.durationSeconds < gates.minSeconds || m.durationSeconds > gates.maxSeconds) failures.push('duration ' + seconds(m.durationSeconds) + ' is outside 0.25 to 2.5 s');
            else if (sounds > 0) {
                const expected = expectedSeconds(sounds) + (gates.offsetSeconds || 0);
                if (m.durationSeconds < expected - gates.under || m.durationSeconds > expected + gates.over) {
                    failures.push('duration ' + seconds(m.durationSeconds) + ' is not plausible for ' + sounds + ' sounds (' + seconds(Math.max(gates.minSeconds, expected - gates.under)) + ' to ' + seconds(expected + gates.over) + ')');
                }
            }
            if (m.peak < gates.minPeak || m.rms < gates.minRms || m.audibleSeconds < gates.minAudibleSeconds) failures.push((gates === GATES ? 'silent or much quieter than the bank (peak ' : 'silent or far too quiet (peak ') + m.peak.toFixed(3) + ', rms ' + m.rms.toFixed(3) + ')');
            else if (m.rms > gates.maxRms) failures.push('much louder than the bank (rms ' + m.rms.toFixed(3) + '; its clips are near 0.09)');
            if (m.clippedFraction > gates.maxClippedFraction || m.peak >= 0.999) failures.push('clipping (' + (m.clippedFraction * 100).toFixed(2) + '% of samples at full scale)');
            if (m.peak > 0 && m.tailRms / m.peak > gates.maxTailRatio) failures.push('the end is cut off (the last 30 ms are not quiet)');
            else if (trimmed.sourceTailSilenceSeconds < gates.minSourceTailSeconds) failures.push('the end is cut off (the voice stopped ' + Math.round(trimmed.sourceTailSilenceSeconds * 1000) + ' ms after the last sound)');
            if (trimmed.sourceLeadSilenceSeconds < gates.minSourceLeadSeconds) failures.push('the start is cut off (sound from the first sample)');
            return { ok: !failures.length, failures, measures: m };
        }
        function kWeighted(samples, rate) {
            const run = (input, b, a) => {
                const out = new Float64Array(input.length);
                let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
                for (let i = 0; i < input.length; i++) {
                    const x = input[i], y = b[0] * x + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
                    x2 = x1; x1 = x; y2 = y1; y1 = y; out[i] = y;
                }
                return out;
            };
            let K = Math.tan(Math.PI * 1681.974450955533 / rate);
            const Q = 0.7071752369554196, Vh = Math.pow(10, 3.999843853973347 / 20), Vb = Math.pow(Vh, 0.4996667741545416), a0 = 1 + K / Q + K * K;
            const shelf = run(samples, [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0], [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]);
            K = Math.tan(Math.PI * 38.13547087602444 / rate);
            const Q2 = 0.5003270373238773, d = 1 + K / Q2 + K * K;
            return run(shelf, [1, -2, 1], [1, 2 * (K * K - 1) / d, (1 - K / Q2 + K * K) / d]);
        }
        function loudnessOf(samples, rate, from = 0, to = samples.length) {
            const weighted = kWeighted(samples, rate);
            const size = Math.round(rate * 0.4), step = Math.round(rate * 0.1), blocks = [];
            const meanSquare = (a, b) => { let sum = 0; for (let i = a; i < b; i++) sum += weighted[i] * weighted[i]; return sum / Math.max(1, b - a); };
            if (to - from <= size) blocks.push(meanSquare(from, to));
            else for (let a = from; a + size <= to; a += step) blocks.push(meanSquare(a, a + size));
            const lufs = z => -0.691 + 10 * Math.log10(z);
            const absolute = blocks.filter(z => z > 0 && lufs(z) > -70);
            if (!absolute.length) return -Infinity;
            const mean = list => list.reduce((s, z) => s + z, 0) / list.length;
            const gate = lufs(mean(absolute)) - 10;
            const relative = absolute.filter(z => lufs(z) > gate);
            return lufs(mean(relative.length ? relative : absolute));
        }
        function truePeakDb(samples) {
            const taps = 16, phases = 4, kernel = [];
            for (let p = 1; p < phases; p++) {
                const row = [], t = p / phases;
                for (let k = -taps + 1; k <= taps; k++) {
                    const x = k - t, sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
                    const window = 0.5 + 0.5 * Math.cos(Math.PI * x / taps);
                    row.push(sinc * window);
                }
                kernel.push(row);
            }
            let peak = peakOf(samples);
            for (let i = 0; i < samples.length - 1; i++) {
                for (const row of kernel) {
                    let sum = 0;
                    for (let k = -taps + 1, j = 0; k <= taps; k++, j++) { const at = i + k; if (at >= 0 && at < samples.length) sum += samples[at] * row[j]; }
                    if (Math.abs(sum) > peak) peak = Math.abs(sum);
                }
            }
            return 20 * Math.log10(Math.max(peak, 1e-9));
        }
        function normalizeLoudness(trimmed, options = {}) {
            const target = options.target == null ? LOUDNESS.target : options.target, ceiling = options.ceiling == null ? LOUDNESS.ceiling : options.ceiling;
            const float = trimmed.float || Float32Array.from(trimmed.samples, v => v / 32768);
            const edges = trimmed.first != null && trimmed.start != null ? { first: trimmed.first - trimmed.start, last: trimmed.last - trimmed.start } : soundEdges(float, peakOf(float) * GENTLE.floor);
            const from = edges ? edges.first : 0, to = edges ? edges.last + 1 : float.length;
            const before = loudnessOf(float, trimmed.rate, from, to);
            const peakBefore = truePeakDb(float);
            let gainDb = target - before, limited = false;
            if (peakBefore + gainDb > ceiling) { gainDb = ceiling - peakBefore; limited = true; }
            const failures = [];
            if (!Number.isFinite(before)) failures.push('no loudness to measure');
            else if (Math.abs(gainDb) > LOUDNESS.maxGainDb) failures.push('needs ' + gainDb.toFixed(1) + ' dB to reach ' + target + ' LUFS: not like the other clips');
            const gain = Math.pow(10, (Number.isFinite(gainDb) ? gainDb : 0) / 20), out = new Float32Array(float.length);
            for (let i = 0; i < float.length; i++) out[i] = float[i] * gain;
            const { wav, samples } = pcmToWav(out, trimmed.rate);
            return { ok: !failures.length, failures, wav, samples, float: out, gainDb, limited, loudnessBefore: before, loudnessAfter: before + gainDb, truePeakBefore: peakBefore, truePeakAfter: peakBefore + gainDb };
        }
        function wordPhonemes(takePhonemes, prefixPhonemes) {
            const text = String(takePhonemes || '');
            const prefix = String(prefixPhonemes || '');
            const rest = prefix && text.startsWith(prefix) ? text.slice(prefix.length) : text;
            return rest.replace(/[.!?,;:…\s]+$/, '').replace(/^[.,;:…\s]+/, '').trim();
        }
        const carrierText = (template, word) => String(template).split(CARRIER_SLOT).join(word);
        // Not in the generator (it read sound counts from the word list): the
        // count of sounds in the phonemizer's reading, a diphthong or an
        // affricate counted once, stress and length marks not at all.
        function soundCount(phonemes) {
            const text = String(phonemes || '').replace(/[ˈˌːˑ.!?,;:…\s'"-]/g, '');
            const joined = text.replace(/eɪ|aɪ|ɔɪ|aʊ|oʊ|əʊ|tʃ|dʒ|ʧ|ʤ|ɪə|eə|ʊə/g, '#');
            return Array.from(joined).length;
        }
        // The time the bare word sounds for, from its sound count: the line the
        // generator's duration check uses (0.415 s + 0.046 s a sound, a clip with
        // 30 + 60 ms margins), less those margins. The app has no bare take to
        // measure, so the cut is held against this instead.
        const bareSecondsFor = sounds => (sounds > 0 ? expectedSeconds(sounds) - 0.09 : 0);
        function commonPrefixPhonemes(strings) {
            let common = strings.length ? strings[0] : '';
            for (const text of strings.slice(1)) { let n = 0; while (n < common.length && n < text.length && common[n] === text[n]) n++; common = common.slice(0, n); }
            common = common.slice(0, common.lastIndexOf(' ') + 1).trim();
            return common || null;
        }
        const median = values => { const sorted = values.slice().sort((a, b) => a - b), mid = sorted.length >> 1; return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; };
        // One carrier take -> the finished clip, or the reasons it was refused:
        // the cut, the reading, the clip checks and the loudness step, in the
        // generator's order (voiceWordCarrier + finishClip, less the encoder).
        function finishTake(take, context) {
            let cut;
            try { cut = cutCarrier(take.wav, { bareSeconds: context.bareSeconds || 0, prefixSeconds: context.prefixSeconds || 0 }); }
            catch (error) { return { ok: false, failures: [error.message] }; }
            if (!cut.ok) return { ok: false, failures: cut.failures, cut };
            if (take.phonemes && context.prefixPhonemes != null && context.barePhonemes != null) {
                const said = wordPhonemes(take.phonemes, context.prefixPhonemes);
                if (said !== String(context.barePhonemes).replace(/[.!?]+$/, '')) return { ok: false, failures: ['read as /' + said + '/ in the sentence, /' + context.barePhonemes + '/ alone'], cut };
            }
            const checked = checkClip(cut.clip, context.sounds || 0, RECIPE_GATES);
            if (!checked.ok) return { ok: false, failures: checked.failures, cut };
            const loud = normalizeLoudness(cut.clip, { target: context.target, ceiling: context.ceiling });
            if (!loud.ok) return { ok: false, failures: loud.failures, cut };
            return { ok: true, failures: [], wav: loud.wav, cut, measures: Object.assign({}, checked.measures, { gainDb: loud.gainDb, loudness: loud.loudnessAfter,
                loudnessBefore: loud.loudnessBefore, truePeak: loud.truePeakAfter, peakLimited: loud.limited, wordSeconds: cut.wordSeconds, ratio: cut.ratio, gapSeconds: cut.gap.seconds, prefixSeconds: cut.gap.before }) };
        }
        return { GENTLE, CUT, LOUDNESS, GATES, RECIPE_GATES, CARRIERS, CARRIER_SLOT, CALIBRATION_WORDS, readPcm, pcmToWav, peakOf, soundEdges, marginClip, asTrimmed,
            quietRuns, cutCarrier, measurePcm, expectedSeconds, checkClip, kWeighted, loudnessOf, truePeakDb, normalizeLoudness, wordPhonemes, carrierText,
            soundCount, bareSecondsFor, commonPrefixPhonemes, median, finishTake };
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
        // ── Cached-bytes integrity gate (added 2026-08-16) ───────────────────
        // A cache HIT was trusted unconditionally. Two things can be sitting in
        // durable storage that are not a model: an HTTP error page saved by an
        // earlier build, and a short row left by a write that was interrupted
        // mid-way. Either one is then handed to onnxruntime on EVERY later
        // session, which fails identically forever, and nothing in the app can
        // get out of that state. This repo has already shipped one truncated-
        // model-in-durable-storage incident.
        //
        // Two cheap checks, both of which can only reject a bad blob:
        //   - an .onnx model file is megabytes; anything under 1 MB is not one
        //   - a model never begins with '<' or '{' (an HTML or JSON error body)
        // A rejected hit falls through to the network, and the fresh bytes
        // overwrite the bad row through the normal put path, so the cache
        // self-heals without any new storage API.
        // The size floor applies ONLY to the graph files. Kokoro's per-voice
        // style vectors are legitimately small .bin files, so a blanket
        // megabyte floor would refuse to cache them and re-download the voice
        // pack every session.
        const _MIN_MODEL_BYTES = 1048576;
        const _GRAPH_FILE_RE = /\\.onnx(_data)?(\\?|$)/i;
        function _looksLikeModel(url, buffer) {
            try {
                if (!buffer || buffer.byteLength < 16) return false;
                if (_GRAPH_FILE_RE.test(url) && buffer.byteLength < _MIN_MODEL_BYTES) return false;
                const head = new Uint8Array(buffer, 0, Math.min(8, buffer.byteLength));
                // '<' = 0x3C (HTML), '{' = 0x7B (JSON error body)
                if (head[0] === 0x3C || head[0] === 0x7B) return false;
                return true;
            } catch (_) { return false; }
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
                    if (_looksLikeModel(url, hit.buffer)) {
                        return new Response(hit.buffer, { status: 200, headers: { 'content-type': hit.contentType || 'application/octet-stream' } });
                    }
                    self.postMessage({
                        type: 'progress',
                        stage: 'Repairing the saved voice model',
                        pct: 0.1
                    });
                    console.warn('[Kokoro TTS] Cached model file is truncated or is not a model (' +
                        ((hit.buffer && hit.buffer.byteLength) || 0) + ' bytes) — re-downloading it.');
                }
            } catch (_) {}
            const res = await _nativeFetch(input, init);
            try {
                if (res && res.ok) {
                    const buf = await res.clone().arrayBuffer();
                    // Never write back something that failed the same test we
                    // just applied on read, or the bad row is simply replaced
                    // with another bad row.
                    if (_looksLikeModel(url, buf)) {
                        // Transfer the copy; the Response the caller gets is untouched.
                        _askMain({ op: 'put', url, buffer: buf, contentType: res.headers.get('content-type') || '' }, [buf]);
                    }
                }
            } catch (_) {}
            return res;
        };

        // ── Sentence splitter (runs in worker) ──
        function splitSentences(text) {
            // Template string: every regex backslash is doubled here. Titles,
            // initials (U.S.A., a.m.) and decimals (3.5) never end a sentence.
            const sentences = text.match(/(?:\\b(?:Dr|Mr|Mrs|Ms|St|Jr|Sr|Prof|vs|Inc|Ltd|Co|etc)\\.(?!$)|\\b(?:[a-z]\\.){2,}(?!$)|\\.(?=\\d)|[^.!?])+(?:[.!?]+|$)\\s*/gi);
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

        // ── One word, said in a sentence and cut out (kokoroWordRecipe) ──
        // Any refusal, and any error before the cut, falls back to exactly
        // what generateOne gives for the word alone.
        const _wordRecipeFactory = ${kokoroWordRecipe.toString()};
        let _wordRecipe = null;
        const _wordPrefixPhonemes = new Map();
        const _wordPauses = new Map();
        const _PHONEMES_READ = { marker: 'phonemes-read' };
        function _probe(tokenizer) { const probe = Object.create(_tts); probe.tokenizer = tokenizer; return probe; }
        async function phonemesOf(text, voice) {
            let read = null;
            try { await _probe((value) => { read = value; throw _PHONEMES_READ; }).generate(text, { voice, speed: 1 }); }
            catch (e) { if (e !== _PHONEMES_READ) throw e; }
            return read;
        }
        async function takeOf(text, voice, speed) {
            let read = null;
            const tokenizer = _tts.tokenizer;
            const result = await _probe((value, options) => { read = value; return tokenizer(value, options); }).generate(text, { voice, speed });
            if (!result || !result.audio) throw new Error('No audio generated');
            const audio = result.audio instanceof Float32Array ? result.audio : new Float32Array(result.audio);
            return { wav: float32ToWav(audio, result.sampling_rate || 24000), phonemes: read };
        }
        async function generateWord(word, voice, speed, options) {
            const recipe = _wordRecipe || (_wordRecipe = _wordRecipeFactory());
            const failures = [], timing = { phonemesMs: 0, takeMs: 0, cutMs: 0 };
            let mark = performance.now();
            const lap = (name) => { const now = performance.now(); timing[name] += now - mark; mark = now; };
            const templates = (Array.isArray(options.carriers) && options.carriers.length ? options.carriers : recipe.CARRIERS.slice(0, 1))
                .filter((template) => typeof template === 'string' && template.split(recipe.CARRIER_SLOT).length === 2);
            let barePhonemes = null;
            try { barePhonemes = await phonemesOf(word, voice); } catch (_) {}
            const sounds = recipe.soundCount(barePhonemes);
            lap('phonemesMs');
            for (let i = 0; i < templates.length; i++) {
                const form = i ? 'carrier2' : 'carrier';
                try {
                    const prefixKey = voice.charAt(0) + '|' + templates[i], pauseKey = voice + '|' + templates[i];
                    if (!_wordPrefixPhonemes.has(prefixKey)) {
                        const read = [];
                        for (const sample of recipe.CALIBRATION_WORDS) { try { const p = await phonemesOf(recipe.carrierText(templates[i], sample), voice); if (p) read.push(p); } catch (_) {} }
                        _wordPrefixPhonemes.set(prefixKey, read.length === recipe.CALIBRATION_WORDS.length ? recipe.commonPrefixPhonemes(read) : null);
                    }
                    const pauses = _wordPauses.get(pauseKey) || [];
                    lap('phonemesMs');
                    const take = await takeOf(recipe.carrierText(templates[i], word), voice, speed);
                    lap('takeMs');
                    const done = recipe.finishTake(take, {
                        bareSeconds: options.estimateBare === false ? 0 : recipe.bareSecondsFor(sounds),
                        prefixSeconds: pauses.length >= 3 ? recipe.median(pauses) : 0,
                        prefixPhonemes: _wordPrefixPhonemes.get(prefixKey), barePhonemes, sounds,
                        target: options.target, ceiling: options.ceiling,
                    });
                    lap('cutMs');
                    if (done.ok) {
                        pauses.push(done.cut.gap.before);
                        if (pauses.length > 9) pauses.shift();
                        _wordPauses.set(pauseKey, pauses);
                        done.measures.readingChecked = !!(take.phonemes && _wordPrefixPhonemes.get(prefixKey) != null && barePhonemes != null);
                        return { buffer: done.wav, form, failures, measures: done.measures, sounds, timing };
                    }
                    failures.push(form + ': ' + done.failures.join('; '));
                } catch (e) {
                    failures.push(form + ': ' + (e && e.message || String(e)));
                }
            }
            const buffer = await generateOne(word, voice, speed);
            lap('takeMs');
            return { buffer, form: 'bare', failures, measures: null, sounds, timing };
        }

        self.onmessage = async ({ data }) => {
            try {
                // ── INIT ──
                if (data.type === 'init') {
                    self.postMessage({ type: 'progress', stage: 'Loading Kokoro TTS library', pct: 0.05 });
                    const mod = await __alloRuntimeImport('kokoro.module');
                    mod.__alloflowConfigureRuntime(__alloRuntimeAssets);
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

                // ── GENERATE_WORD (one word: carrier sentence, cut, or the bare word) ──
                if (data.type === 'generate_word') {
                    if (!_tts) { self.postMessage({ type: 'error', id: data.id, error: 'Model not initialized' }); return; }
                    const t0 = performance.now();
                    const word = await generateWord(data.text, data.voice, data.speed, data.recipe || {});
                    if (!word.buffer) { self.postMessage({ type: 'error', id: data.id, error: 'No audio generated' }); return; }
                    self.postMessage({
                        type: 'audio', id: data.id, buffer: word.buffer, elapsed: performance.now() - t0, chunks: 1, expectedChunks: 1,
                        word: { recipe: (data.recipe && data.recipe.id) || null, form: word.form, failures: word.failures, measures: word.measures, sounds: word.sounds, timing: word.timing },
                    }, [word.buffer]);
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
    let _workerGeneration = 0;
    let _ready = false;
    let _initPromise = null;
    let _loadProgress = 0;
    let _onProgress = null;
    let _msgId = 0;
    const _pendingMessages = new Map(); // id -> { resolve, reject }
    const _audioCache = new Map(); // exact request key -> { url, text, voice }
    const _ownedUrls = new Map(); // blob URL -> { kind, key?, stream? }
    const _backgroundBatchInFlight = new Map(); // exact batch key -> { promise }
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

    // One word voiced with the word recipe (kokoroWordRecipe). Callers ask for
    // it with speak(word, voice, speed, { word: true }); anything that is not
    // one English word is spoken as before. On by default; for debugging,
    // window.__alloKokoroWordRecipe = false or
    // localStorage.alloflow_kokoro_word_recipe = 'off' turns it off.
    // Its clips have their own cache key (with the recipe id), so a clip made
    // the old way never answers a word request, nor the other way round.
    const WORD_RECIPE = Object.freeze({ id: 'sentence-cut-v1', carriers: Object.freeze(['Here is the word... {word}.']), target: -20, ceiling: -1.5 });
    const WORD_RECIPE_STORAGE_KEY = 'alloflow_kokoro_word_recipe';
    const _SINGLE_WORD_RE = /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/;
    let _lastWordResult = null;
    function wordRecipeEnabled() {
        try { if (window.__alloKokoroWordRecipe === false) return false; } catch (_) {}
        try {
            const stored = window.localStorage && window.localStorage.getItem(WORD_RECIPE_STORAGE_KEY);
            if (stored === 'off' || stored === 'false' || stored === '0') return false;
        } catch (_) {}
        return true;
    }
    function isSingleWord(text) {
        const value = typeof text === 'string' ? text.trim() : '';
        return value.length > 0 && value.length <= 32 && _SINGLE_WORD_RE.test(value);
    }
    function _wordCacheKey(text, voice) {
        return JSON.stringify(['kokoro-word-v1', WORD_RECIPE.id, _textFingerprint(text), voice, SYNTHESIS_SPEED, _currentDtype]);
    }
    function _wordRecipeRequest() {
        return { id: WORD_RECIPE.id, carriers: WORD_RECIPE.carriers.slice(), target: WORD_RECIPE.target, ceiling: WORD_RECIPE.ceiling };
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
            if (pending.type !== 'generate_batch' && pending.type !== 'generate_word') continue;
            const taken = _takePending(id);
            if (taken) {
                cancelled++;
                taken.reject(error);
            }
        }
        return cancelled;
    }

    function _terminateWorker(reason) {
        _workerGeneration += 1;
        _disarmStallWatchdog();
        const error = reason instanceof Error ? reason : _abortError(reason || 'Kokoro TTS worker terminated');
        const worker = _worker;
        _worker = null;
        _ready = false;
        _initPromise = null;
        _rejectAllPending(error);
        _backgroundBatchInFlight.clear();
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
    async function _createWorker() {
        if (typeof window.__alloCreateVerifiedWorker !== 'function') throw new Error('Verified Kokoro runtime delivery is unavailable');
        const w = await window.__alloCreateVerifiedWorker('kokoro', WORKER_SOURCE, { type: 'module' });

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
                    if (_stallTimer) { const p = _pendingMessages.get('__init__'); if (p) _armStallWatchdog(p.reject); }
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
                            word: data.word || null,
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
    // Stall watchdog (2026-09-14). The model fetch runs inside the worker with
    // no timeout of its own: a stalled network left the init promise pending
    // forever and the host's progress pill frozen at one percentage until the
    // person refreshed the page. Now, if NO progress message arrives for
    // STALL_MS while initialising, the worker is terminated and the init is
    // retried once from a fresh worker. Only COMPLETE files are reused from the
    // cache, and the model is one ~88MB file, so a stall mid-model restarts that
    // file from zero. A second stall rejects with a TimeoutError the host can
    // report honestly.
    const STALL_MS = 60000;
    const STALL_RETRIES = 1;
    let _stallTimer = null;
    let _stallAttempt = 0;
    function _armStallWatchdog(reject) {
        if (_stallTimer) clearTimeout(_stallTimer);
        _stallTimer = setTimeout(() => {
            _stallTimer = null;
            const error = new Error('Kokoro voice download stalled (no progress for ' + Math.round(STALL_MS / 1000) + 's)');
            error.name = 'TimeoutError';
            error.code = 'kokoro-init-stalled';
            reject(error);
        }, STALL_MS);
    }
    function _disarmStallWatchdog() {
        if (_stallTimer) { clearTimeout(_stallTimer); _stallTimer = null; }
    }

    async function init(onProgress) {
        if (onProgress) _onProgress = onProgress; // Always update callback before early returns
        if (_ready && _worker) return true;
        if (_initPromise) return _initPromise;

        const generation = _workerGeneration;
        _initPromise = (async () => {
            try {
                const worker = await _createWorker();
                if (generation !== _workerGeneration) {
                    try { worker.terminate(); } catch (_) {}
                    throw _abortError('Kokoro TTS was disposed while preparing its verified runtime');
                }
                _worker = worker;

                let rejectInit = null;
                const initDone = new Promise((resolve, reject) => {
                    rejectInit = reject;
                    _pendingMessages.set('__init__', { resolve, reject });
                });
                _armStallWatchdog((error) => { if (rejectInit) rejectInit(error); });

                _worker.postMessage({
                    type: 'init',
                    modelId: MODEL_ID,
                    dtype: _currentDtype,
                    sizeLabel: DTYPE_SIZES[_currentDtype] || '~88MB',
                });

                try {
                    await initDone;
                } finally {
                    _disarmStallWatchdog();
                }
                _stallAttempt = 0;

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
                // A cancelled graph preparation may finish after a new init;
                // it must not terminate that newer worker or clear its timer.
                if (generation !== _workerGeneration) throw e;
                _disarmStallWatchdog();
                if (e && e.code === 'kokoro-init-stalled' && _stallAttempt < STALL_RETRIES) {
                    _stallAttempt += 1;
                    console.warn('[Kokoro TTS] ⏳ ' + e.message + '; retrying from a fresh worker (' + _stallAttempt + '/' + STALL_RETRIES + ')');
                    try { if (_onProgress) _onProgress({ stage: 'Download stalled, retrying', pct: _loadProgress || 0 }); } catch (_) {}
                    _terminateWorker(e);
                    return init(_onProgress);
                }
                _stallAttempt = 0;
                console.error('[Kokoro TTS] ❌ Initialization failed:', e);
                _terminateWorker(e);
                throw e;
            }
        })();

        return _initPromise;
    }

    async function _generateBatchAudio(text, voice, cacheKey, signal, force = false, asWord = false) {
        const result = await _sendToWorker(
            asWord ? 'generate_word' : 'generate_batch',
            asWord ? { text, voice, speed: SYNTHESIS_SPEED, recipe: _wordRecipeRequest() } : { text, voice, speed: SYNTHESIS_SPEED },
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
        if (raced && !force) return raced;

        const audioBlob = new Blob([result.buffer], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        _cacheSet(cacheKey, text, voice, audioUrl);
        if (asWord) {
            const word = result.word || {};
            _lastWordResult = { text, voice, url: audioUrl, recipe: word.recipe || WORD_RECIPE.id, form: word.form || 'bare',
                failures: Array.isArray(word.failures) ? word.failures : [], measures: word.measures || null, sounds: word.sounds || 0, timing: word.timing || null, elapsed: result.elapsed };
            if (_lastWordResult.form === 'bare') console.info('[Kokoro TTS] Word recipe fell back to the word alone for "' + text + '": ' + _lastWordResult.failures.join(' | '));
        }
        return audioUrl;
    }

    // The word recipe without the cache or a URL: { buffer (WAV), form, failures,
    // measures, elapsed }, or null for text that is not one word. Ignores the
    // on/off flag (an explicit request); options.recipe overrides recipe parts.
    async function voiceWordClean(word, voice, options) {
        options = options || {};
        const text = typeof word === 'string' ? word.trim() : '';
        if (!isSingleWord(text)) return null;
        voice = resolveVoice(voice);
        if (!_ready) await _awaitWithSignal(init(), options.signal);
        const recipe = Object.assign(_wordRecipeRequest(), options.recipe || {});
        const result = await _sendToWorker('generate_word', { text, voice, speed: SYNTHESIS_SPEED, recipe }, { signal: options.signal });
        const info = result.word || {};
        return { buffer: result.buffer, elapsed: result.elapsed, recipe: info.recipe || recipe.id, form: info.form || 'bare',
            failures: Array.isArray(info.failures) ? info.failures : [], measures: info.measures || null, sounds: info.sounds || 0, timing: info.timing || null };
    }

    // ─── Generate Speech (batch — waits for all chunks) ─────────────────
    async function speak(text, voice, speed, options) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) return null;

        options = options || {};
        const signal = options.signal;
        const force = options.force === true;
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

        const asWord = options.word === true && isSingleWord(text) && wordRecipeEnabled();
        if (asWord) text = text.trim();
        const cacheKey = asWord ? _wordCacheKey(text, voice) : _cacheKey(text, voice);
        const cached = _cacheGet(cacheKey, text, voice);
        if (cached && !force) return cached;

        // A signal-free prewarm owns shareable background work. A later active
        // caller may cancel only its wait; the owner keeps generating and fills
        // the cache. Signal-owned requests remain independent so their existing
        // AbortSignal still cancels the worker request when no owner exists.
        const batchKey = JSON.stringify([asWord ? 'kokoro-word-v1:' + WORD_RECIPE.id : 'kokoro-batch-v1', text, voice, SYNTHESIS_SPEED, _currentDtype]);
        const sharedEntry = _backgroundBatchInFlight.get(batchKey);
        if (sharedEntry && !force) {
            try {
                return await _awaitWithSignal(sharedEntry.promise, signal);
            } catch (e) {
                if (e && e.name === 'AbortError') throw e;
                console.warn('[Kokoro TTS] Generation failed:', e);
                return null;
            }
        }

        let batchPromise;
        if (!signal) {
            const entry = { promise: null };
            entry.promise = _generateBatchAudio(text, voice, cacheKey, null, force, asWord).finally(() => {
                if (_backgroundBatchInFlight.get(batchKey) === entry) {
                    _backgroundBatchInFlight.delete(batchKey);
                }
            });
            _backgroundBatchInFlight.set(batchKey, entry);
            batchPromise = entry.promise;
        } else {
            batchPromise = _generateBatchAudio(text, voice, cacheKey, signal, force, asWord);
        }

        try {
            // Speed is deliberately applied by the Audio element, not baked
            // into reusable bytes. Callers already set playbackRate.
            return await batchPromise;
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
        if (options.word === true && text.length <= CHUNK_THRESHOLD) return speak(text, voice, speed, options);
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
            stop: (notifyDone = true) => _cancelStream(
                stream,
                _abortError('Kokoro stream playback stopped'),
                !!notifyDone
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
        voiceWordClean: voiceWordClean,
        isSingleWord: isSingleWord,
        wordRecipe: Object.freeze({
            id: WORD_RECIPE.id,
            storageKey: WORD_RECIPE_STORAGE_KEY,
            get enabled() { return wordRecipeEnabled(); },
            get last() { return _lastWordResult; },
        }),
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

    console.log('[Kokoro TTS] 📦 Worker-based loader registered (default: q8). Call init() or speak() to start.');
})();
