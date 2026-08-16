// tts_source.jsx — Text-to-Speech orchestration for AlloFlow
// Extracted from AlloFlowANTI.txt on 2026-04-24.
//
// Three functions: fetchTTSBytes (Gemini TTS API call), callTTS (main orchestrator
// with Gemini → Kokoro/Piper fallback cascade), callTTSDirect (bot-queue variant).
//
// Module-level state (queue, botQueue, urlCache, rateLimitedUntil) is passed in as
// a shared mutable `state` object so:
//  1. The factory can mutate it across calls (queue.then chain, rate-limit updates)
//  2. window.__clearAlloTtsCacheForWord (set up in monolith) can still touch the same
//     urlCache Map — preserves Word Sounds "regenerate this word" behavior.
//
// React state (leveledTextLanguage, currentUiLanguage, _aiUserConfig, ai) is accessed
// via getter callbacks so the factory always reads fresh values without re-binding.
const createTTS = (deps) => {
    const {
        state,              // { queue, botQueue, urlCache, rateLimitedUntil }
        apiKey, GEMINI_MODELS, AVAILABLE_VOICES, _isCanvasEnv,
        languageToTTSCode, isGlobalMuted,
        warnLog, debugLog,
        // Dynamic getters for React-state-dependent values
        getLeveledTextLanguage, getCurrentUiLanguage, getAiUserConfig, getAi,
        getSelectedVoice, getAvailableVoices,
        // React callback
        setShowKokoroOfferModal,
    } = deps;

    const DEFAULT_GEMINI_VOICE = 'Kore';
    const _voiceId = (value) => {
        if (typeof value === 'string') return value.trim();
        if (value && typeof value === 'object' && typeof value.voice === 'string') return value.voice.trim();
        return '';
    };
    const _liveGeminiVoices = () => {
        let voices = null;
        try { if (typeof getAvailableVoices === 'function') voices = getAvailableVoices(); } catch (_) {}
        try {
            if (!Array.isArray(voices) || voices.length === 0) {
                const config = window.AlloModules && window.AlloModules.VoiceConfig;
                if (config && Array.isArray(config.AVAILABLE_VOICES)) voices = config.AVAILABLE_VOICES;
            }
        } catch (_) {}
        if ((!Array.isArray(voices) || voices.length === 0) && Array.isArray(AVAILABLE_VOICES)) voices = AVAILABLE_VOICES;
        return (Array.isArray(voices) ? voices : []).map((voice) => {
            if (typeof voice === 'string') return voice.trim();
            return voice && typeof voice.id === 'string' ? voice.id.trim() : '';
        }).filter(Boolean);
    };
    const _liveSelectedVoice = () => {
        let selected = '';
        try { if (typeof getSelectedVoice === 'function') selected = _voiceId(getSelectedVoice()); } catch (_) {}
        try { if (!selected && typeof window !== 'undefined') selected = _voiceId(window.__alloSelectedVoice); } catch (_) {}
        return selected || DEFAULT_GEMINI_VOICE;
    };
    const _resolveRequestedVoice = (voiceName) => _voiceId(voiceName) || _liveSelectedVoice();
    const _resolveGeminiVoice = (voiceName) => {
        const requested = _voiceId(voiceName);
        const selected = _liveSelectedVoice();
        const voices = _liveGeminiVoices();
        // VoiceConfig is asynchronous. While its catalog is still empty,
        // preserve the caller's explicit/selected name instead of declaring
        // every valid Gemini voice invalid and silently substituting Puck.
        if (voices.length === 0) return requested || selected || DEFAULT_GEMINI_VOICE;
        const canonical = (candidate) => voices.find((voice) => voice.toLowerCase() === String(candidate || '').toLowerCase());
        return canonical(requested) || canonical(selected) || canonical(DEFAULT_GEMINI_VOICE) || DEFAULT_GEMINI_VOICE;
    };
    // Cloud voices need the full pronunciation profile, while local Piper
    // routing needs only the base language. Keep those identities separate so
    // French (France) and French (Canada) never share generated audio, without
    // handing a human dialect label to languageToTTSCode.
    const _normalizeTtsSpeechProfile = (languageValue, localeValue, dialectValue) => {
        const supplied = languageValue && typeof languageValue === 'object' ? languageValue : null;
        const clean = (value, maxLength) => String(value == null ? '' : value)
            .trim().replace(/\s+/g, ' ').slice(0, maxLength);
        let baseLanguage = clean(supplied ? supplied.baseLanguage : languageValue, 80) || 'English';
        let inferredDialect = '';
        const parenthetical = baseLanguage.match(/^(.+?)\s*\(([^()]*)\)\s*$/);
        if (parenthetical) {
            baseLanguage = clean(parenthetical[1], 80) || 'English';
            inferredDialect = clean(parenthetical[2], 80);
        }
        let locale = clean(localeValue || (supplied && supplied.locale), 40).replace(/_/g, '-');
        if (locale) {
            try {
                if (typeof Intl !== 'undefined' && typeof Intl.getCanonicalLocales === 'function') {
                    locale = Intl.getCanonicalLocales(locale)[0] || '';
                }
            } catch (_) {
                locale = '';
            }
            if (locale && !/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(locale)) locale = '';
            if (locale && !(typeof Intl !== 'undefined' && typeof Intl.getCanonicalLocales === 'function')) {
                locale = locale.split('-').map((part, index) => {
                    if (index === 0) return part.toLowerCase();
                    if (/^[A-Za-z]{2}$/.test(part)) return part.toUpperCase();
                    if (/^[A-Za-z]{4}$/.test(part)) return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
                    return part;
                }).join('-');
            }
        }
        const dialect = clean(dialectValue || (supplied && supplied.dialect) || inferredDialect, 80);
        const cacheIdentity = (!locale && !dialect)
            ? baseLanguage
            : [baseLanguage.toLocaleLowerCase(), locale.toLowerCase(), dialect.toLocaleLowerCase()].join('\u241f');
        return { baseLanguage, locale, dialect, cacheIdentity };
    };
    const _cloudTtsPrompt = (textValue, speechProfile) => {
        const profile = _normalizeTtsSpeechProfile(speechProfile);
        const isPlainEnglish = /^english$/i.test(profile.baseLanguage) && !profile.locale && !profile.dialect;
        if (isPlainEnglish) return textValue;
        const qualifiers = [];
        if (profile.locale) qualifiers.push('locale ' + profile.locale);
        if (profile.dialect) qualifiers.push('the ' + profile.dialect + ' dialect or regional variety');
        const qualifierText = qualifiers.length ? ' using ' + qualifiers.join(' and ') : '';
        return 'Pronounce the following ' + profile.baseLanguage + ' text' + qualifierText
            + ' with native ' + profile.baseLanguage + ' phonology: ' + textValue;
    };

    // Effective cloud-TTS key. Two ways a "key" can be a lie (both field-hit
    // 2026-07-06 on desktop): the bundler's old 'desktop-user-provided'
    // sentinel (truthy placeholder nothing recognized), and a real-looking key
    // Google rejects (__ttsGeminiAuthFailed latches on the first key-invalid
    // 400). Either way the cloud leg is unusable and keyless routing — local
    // Kokoro reroute + skip-doomed-calls — must engage.
    const _cloudKeyUsable = () => {
        if (!apiKey || apiKey === 'desktop-user-provided') return false;
        if (typeof window !== 'undefined' && window.__ttsGeminiAuthFailed) return false;
        return true;
    };

    // The auth latch must be able to RECOVER: a Canvas-injected token can be
    // rejected mid-session and then rotate back to valid. Any successful
    // Gemini fetch proves the key works again, so clear the latch (and the
    // Canvas probe cooldown) the moment real bytes come back.
    const _noteGeminiSuccess = () => {
        // Real bytes came back, so the earlier deadline was a blip, not a slow
        // path. Clear the strike so the NEXT slow response gets its retry too
        // instead of inheriting a strike from ten minutes ago.
        ttsTimeoutStrikes = 0;
        if (state.timeoutRetryAt) {
            state.timeoutRetryAt = 0;
            _ttsTrace('calltts:timeout-recovered', null);
        }
        if (typeof window !== 'undefined' && window.__ttsGeminiAuthFailed) {
            window.__ttsGeminiAuthFailed = false;
            state.authRetryAt = 0;
            _ttsTrace('calltts:auth-recovered', null);
        }
    };

    // pcmToWav is inlined here (not injected) because it's a pure conversion
    // utility with no external deps. Keeps the module self-contained and avoids
    // a TDZ trap from the monolith's pcmToWav being component-scoped.
    const pcmToWav = (pcmData, sampleRate = 24000) => {
        const headerLength = 44;
        const dataLength = pcmData.length;
        const buffer = new ArrayBuffer(headerLength + dataLength);
        const view = new DataView(buffer);
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, dataLength, true);
        const pcmBytes = new Uint8Array(pcmData);
        const wavBytes = new Uint8Array(buffer, 44);
        wavBytes.set(pcmBytes);
        return buffer;
    };

    // ── urlCache ownership + bounded eviction (2026-07-17) ────────────────
    // The cache OWNS its blob URLs: playback must never revoke a URL that is
    // still cached (playSequence used to releaseBlob() after each segment
    // while the cache retained the string — every replay then got a dead
    // blob: URL and burned 1s+2s+4s retries). Ownership contract:
    //  • all cache writes go through _cacheSet (Map insertion order = LRU);
    //  • eviction is the ONLY place a cache-owned URL is revoked;
    //  • hosts ask window.__alloTtsCacheOwnsUrl(url) before revoking any
    //    blob URL that may have come from callTTS.
    const URL_CACHE_MAX_ENTRIES = 150;
    const _cacheSet = (key, url) => {
        if (state.urlCache.has(key)) {
            const replacedUrl = state.urlCache.get(key);
            state.urlCache.delete(key);
            try {
                if (replacedUrl && replacedUrl !== url && String(replacedUrl).indexOf('blob:') === 0) URL.revokeObjectURL(replacedUrl);
            } catch (_) {}
        }
        state.urlCache.set(key, url);
        while (state.urlCache.size > URL_CACHE_MAX_ENTRIES) {
            const oldestKey = state.urlCache.keys().next().value;
            const oldestUrl = state.urlCache.get(oldestKey);
            state.urlCache.delete(oldestKey);
            try {
                if (oldestUrl && String(oldestUrl).indexOf('blob:') === 0) URL.revokeObjectURL(oldestUrl);
            } catch (_) {}
        }
    };
    const _externalTtsOwners = () => {
        const owners = [];
        try { const ai = getAi && getAi(); if (ai) owners.push(ai); } catch (_) {}
        try { if (window._kokoroTTS) owners.push(window._kokoroTTS); } catch (_) {}
        try { if (window._piperTTS) owners.push(window._piperTTS); } catch (_) {}
        return owners;
    };
    try {
        window.__alloTtsCacheOwnsUrl = (url) => {
            if (!url) return false;
            for (const cached of state.urlCache.values()) { if (cached === url) return true; }
            return _externalTtsOwners().some((owner) => {
                try { return typeof owner.ownsUrl === 'function' && owner.ownsUrl(url); } catch (_) { return false; }
            });
        };
        window.__alloInvalidateTtsUrl = (url) => {
            if (!url) return false;
            let invalidated = false;
            for (const [key, cached] of Array.from(state.urlCache.entries())) {
                if (cached === url) { state.urlCache.delete(key); invalidated = true; }
            }
            for (const owner of _externalTtsOwners()) {
                try {
                    if (typeof owner.invalidateUrl === 'function' && owner.invalidateUrl(url)) invalidated = true;
                } catch (_) {}
            }
            try { if (String(url).indexOf('blob:') === 0) URL.revokeObjectURL(url); } catch (_) {}
            return invalidated;
        };
    } catch (_) {}

    // ── TTS diagnostics trace (2026-07-19) ────────────────────────────────
    // Bounded ring buffer of routing/latency events at window.__alloTtsTrace.
    // The karaoke overlay's "Copy diagnostics" button snapshots it, so a
    // stuck or silent read-aloud can be diagnosed from a paste instead of a
    // remote debugger. Events are cheap plain objects; never throws.
    const TTS_TRACE_MAX = 150;
    const _ttsTrace = (event, detail) => {
        try {
            const buffer = window.__alloTtsTrace || (window.__alloTtsTrace = []);
            buffer.push({ at: Date.now(), event: event, detail: detail || null });
            while (buffer.length > TTS_TRACE_MAX) buffer.shift();
        } catch (_) {}
    };
    // A hung cloud request must fail loudly, not wedge the serialized TTS
    // queue forever (each lane is one promise chain — one stalled fetch used
    // to block EVERY later sentence, which read as "TTS is stuck").
    // Tiered budgets (2026-07-20 field trace): real generations complete in
    // 1.9–5.5s, but the Canvas proxy can HANG ~60s before failing with a 401.
    // At the old 60s ceiling one zombie request cost a minute of dead air per
    // retry; 12s interactive / 25s background kills zombies while covering
    // slow-but-real generations with room to spare.
    const TTS_FETCH_TIMEOUT_INTERACTIVE_MS = 12000;
    const TTS_FETCH_TIMEOUT_MS = 25000;
    // One hard deadline is enough evidence that the cloud path is too slow for
    // current playback. Prefer local/browser audio briefly instead of waiting
    // through the same deadline two more times.
    const TTS_TIMEOUT_COOLDOWN_MS = 60000;
    // A first hard deadline can be one slow response rather than a slow path,
    // and arming the cooldown on it pushed a full minute of playback onto the
    // browser voice. Retry once, THEN believe it.
    let ttsTimeoutStrikes = 0;
    // Which Gemini failures are worth a second attempt. The old inline list was
    // 401/403/503/"Transient Error"/"empty result", which quietly excluded the
    // two most common real-world flakes: fetchTTSBytes throws a bare
    // `API Error: 500 …` for every 5xx that is not 503, and a dropped
    // connection surfaces as the browser's own TypeError ("Failed to fetch" /
    // "NetworkError" / "Load failed"). Neither was retried, so a single blip on
    // a school network sent the whole passage to the browser voice.
    // Deliberately NOT here: 429, missing/invalid key, and model refusals —
    // those are answers, not flakes, and retrying them only adds latency.
    const _isRetryableTtsError = (message) => {
        const msg = String(message || '');
        if (/\b(401|403|500|502|503|504|522|524)\b/.test(msg)) return true;
        if (msg.includes('Transient Error')) return true;
        if (msg.includes('empty result')) return true;
        if (msg.includes('No audio data received')) return true;
        return /failed to fetch|networkerror|network error|load failed|connection|socket hang up|econnreset|err_network/i.test(msg);
    };
    // Waking an already-downloaded Kokoro means decoding ~88MB into WASM. This
    // is now a STALL budget, not a total budget: how long the loader may sit
    // without its progress moving before the current utterance stops waiting.
    // See ensureKokoroTts for why the total-time version broke every first
    // request.
    const KOKORO_ENSURE_TIMEOUT_MS = 15000;
    // Absolute ceiling on one utterance's wait, however healthy the progress
    // looks. Past this the load continues in the background and serves the
    // next sentence.
    const KOKORO_ENSURE_MAX_MS = 60000;
    // In-flight joins older than this are presumed wedged and REPLACED —
    // background joiners must not inherit a zombie either.
    const CALLTTS_JOIN_MAX_AGE_MS = 20000;

    // Some Canvas host/proxy fetch implementations do not settle when their
    // AbortSignal fires. An abort-only watchdog therefore left the serialized
    // TTS lane occupied until the proxy's own ~60s 401 response, even though
    // playback had already moved on. Race the request against a real rejecting
    // deadline so the queue is always released on time. The original promise
    // remains observed by this wrapper, so a late rejection cannot become an
    // unhandled promise rejection or mutate the settled caller.
    const awaitTtsHardDeadline = (promise, timeoutMs, onTimeout, message, signal) => new Promise((resolve, reject) => {
        let settled = false;
        let timer = null;
        const cleanup = () => {
            if (timer !== null) clearTimeout(timer);
            try { signal?.removeEventListener?.('abort', rejectAborted); } catch (_) {}
        };
        const finish = (fn, value) => {
            if (settled) return;
            settled = true;
            cleanup();
            fn(value);
        };
        const rejectAborted = () => {
            const error = new Error('TTS request aborted');
            error.name = 'AbortError';
            finish(reject, error);
        };
        timer = setTimeout(() => {
            if (settled) return;
            try { if (typeof onTimeout === 'function') onTimeout(); } catch (_) {}
            finish(reject, new Error(message || ('TTS request timed out after ' + timeoutMs + 'ms')));
        }, timeoutMs);
        if (signal) {
            try {
                if (signal.aborted) rejectAborted();
                else signal.addEventListener('abort', rejectAborted, { once: true });
            } catch (_) {}
        }
        Promise.resolve(promise).then(
            value => finish(resolve, value),
            error => finish(reject, error)
        );
    });
    const fetchTTSBytes = (text, voiceName, speed = 1, language = 'English', signal = null, requestPriority = 'normal') => {
        // Resolve against the LIVE catalog: TTS can initialize before VoiceConfig.
        const safeVoice = _resolveGeminiVoice(voiceName);
        const speechProfile = _normalizeTtsSpeechProfile(language);
        if (safeVoice !== voiceName) console.warn(`[TTS] Voice "${voiceName}" is not a valid Gemini voice. Falling back to "${safeVoice}".`);
        debugLog("[fetchTTSBytes] text:", text?.substring(0, 30), "lang:", speechProfile.cacheIdentity);
        // Foreground read-aloud must not wait behind speculative/bulk preloads.
        // Keep one serialized lane for interactive playback and one for normal
        // background work. This deliberately caps cloud concurrency at two while
        // preventing a Word Sounds/glossary warm-up backlog from making a Play
        // click appear frozen. Each lane preserves the existing settle gap.
        const queueSlot = requestPriority === 'interactive' ? 'interactiveQueue' : 'queue';
        if (!state[queueSlot] || typeof state[queueSlot].then !== 'function') {
            state[queueSlot] = Promise.resolve();
        }
        _ttsTrace('fetch:enqueue', {
            slot: queueSlot,
            voice: safeVoice,
            lang: speechProfile.cacheIdentity,
            chars: String(text || '').length,
        });
        const queuedTask = state[queueSlot].then(async () => {
            const taskStartedAt = Date.now();
            // Watchdog: abort the network call after the lane's time budget.
            // Chained with the caller's signal; a watchdog abort is rethrown
            // as a REGULAR error (not AbortError) so retry/fallback engage
            // instead of being treated as a user cancel.
            const fetchTimeoutMs = requestPriority === 'interactive' ? TTS_FETCH_TIMEOUT_INTERACTIVE_MS : TTS_FETCH_TIMEOUT_MS;
            let watchdogFired = false;
            const watchdogController = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const callerAbortHandler = () => { try { watchdogController?.abort(); } catch (_) {} };
            if (signal && watchdogController) {
                try {
                    if (signal.aborted) watchdogController.abort();
                    else signal.addEventListener('abort', callerAbortHandler, { once: true });
                } catch (_) {}
            }
            const fetchSignal = watchdogController ? watchdogController.signal : (signal || undefined);
            const rethrowWatchdog = (err) => {
                if (watchdogFired && err && err.name === 'AbortError') {
                    return new Error('TTS Transient Error (timeout after ' + Math.round(fetchTimeoutMs / 1000) + 's)');
                }
                return err;
            };
            try {
                const taskResult = await (async () => {
            const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.tts}:generateContent`;
            const url = `${baseUrl}?key=${apiKey || ''}`;
            const decodeBase64 = (base64) => {
                 const binaryString = window.atob(base64);
                 const len = binaryString.length;
                 const bytes = new Uint8Array(len);
                 for (let j = 0; j < len; j++) bytes[j] = binaryString.charCodeAt(j);
                 return bytes;
            };
            // Guard: callers can pass a missing field; undefined.length threw here and
            // was pointlessly retried. Normalize; empty text fails fast, non-retryable.
            text = (text == null ? '' : String(text));
            if (!text.trim()) throw new Error('TTS Empty Text');
            let promptText = text.length <= 2 ? `Say the sound: ${text}` : (text.length <= 5 ? `Please say the word: ${text}` : text);
            promptText = promptText.replace(/^\s*\d+\.\s+/gm, '');
            promptText = promptText.replace(/^\s*[-*•]\s+/gm, '');
            // Strip markdown emphasis markers — Gemini TTS reads them literally
            // (`**bold**` becomes "asterisk asterisk bold asterisk asterisk").
            // Strip in pair-aware order: bold (**…**) before italic (*…*) so
            // the inner-pair regex doesn't half-consume the outer pair. Same
            // for underscore-style emphasis. Backtick code spans → drop ticks.
            promptText = promptText.replace(/\*\*([^*]+)\*\*/g, '$1');
            promptText = promptText.replace(/__([^_]+)__/g, '$1');
            promptText = promptText.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2');
            promptText = promptText.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1$2');
            promptText = promptText.replace(/~~([^~]+)~~/g, '$1');
            promptText = promptText.replace(/`([^`\n]+)`/g, '$1');
            // Markdown links [text](url) — read only the visible text
            promptText = promptText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            // Heading hashes at line start (#, ##, ### ...) — drop the marker
            promptText = promptText.replace(/^#{1,6}\s+/gm, '');
            promptText = promptText.replace(/\n{2,}/g, '. ');
            promptText = promptText.replace(/\n/g, ', ');
            promptText = promptText.replace(/\s{2,}/g, ' ').trim();
            promptText = _cloudTtsPrompt(promptText, speechProfile);
            const payload = {
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                // Read-aloud FIDELITY temperature (2026-07-06). Gemini TTS is a
                // GENERATIVE model — at the default (~1.0) or even 0.7 it has
                // latitude to paraphrase or DROP words, which on repetitive
                // leveled text surfaced as e.g. 'The teacher says, "Jump up
                // high."' being spoken as a truncated fragment. The text sent
                // is provably intact (splitter + preprocessing verified), so
                // the drift is the model's sampling. 0.2 strongly favors reading
                // the words verbatim — the priority for a struggling reader
                // tracking along. Personas keep 0.7 (callTTSDirect) for
                // expressive delivery. Gated so a 400 rejecting the field
                // disables it globally (see below).
                ...(state.ttsTemperatureUnsupported ? {} : { temperature: 0.2 }),
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: safeVoice } }
                }
              }
            };
            // Abort fast-path: if the caller already aborted before we got
            // here (the queue can hold a request behind 10+ Word Sounds
            // preloads), throw an AbortError immediately rather than starting
            // a fetch we'll just cancel. The matching check after fetch
            // catches signals that fire while the fetch is in flight.
            if (signal && signal.aborted) {
              const err = new Error('TTS aborted by caller');
              err.name = 'AbortError';
              throw err;
            }
            try {
              const response = await awaitTtsHardDeadline(fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: fetchSignal
              }), fetchTimeoutMs, () => {
                watchdogFired = true;
                try { watchdogController?.abort(); } catch (_) {}
              }, 'TTS Transient Error (timeout after ' + Math.round(fetchTimeoutMs / 1000) + 's)', signal);
              if (!response.ok) {
                if (response.status === 429) {
                  state.rateLimitedUntil = Date.now() + 60000;
                  console.warn("[TTS] Rate limited (429). 60s cooldown activated.");
                  throw new Error("TTS Rate Limited (429)");
                }
                if (response.status === 401 || response.status === 503) {
                  console.warn(`[TTS] Transient error (${response.status}). Caller will retry...`);
                  throw new Error(`TTS Transient Error (${response.status})`);
                }
                const errorBody = await response.text().catch(() => '');
                if (response.status === 400 && !state.ttsTemperatureUnsupported && /temperature/i.test(errorBody)) {
                    state.ttsTemperatureUnsupported = true;
                    console.warn('[TTS] API rejected temperature param — disabled; caller retry will go without it.');
                    throw new Error('TTS Transient Error (400 temperature)');
                }
                if (response.status === 400 && /API key not valid|API_KEY_INVALID/i.test(errorBody)) {
                    // Key-invalid latch: this key will NEVER work — flip the whole
                    // session to keyless routing (local Kokoro serves; no more doomed calls).
                    try { window.__ttsGeminiAuthFailed = true; } catch (_) {}
                    console.warn("[TTS]" + " cloud TTS key rejected — switching this session to the local voice.");
                }
                console.error("[TTS] API Error:", response.status, response.statusText, errorBody.substring(0, 200));
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
              }
              const data = await response.json();
              if (data.promptFeedback?.blockReason) throw new Error(`TTS Content Blocked: ${data.promptFeedback.blockReason}`);
              if (data.candidates?.[0]?.finishReason === 'OTHER') {
                  warnLog("Gemini Model Refusal (finishReason: OTHER). Caller retry budget will handle it.");
                  throw new Error("Gemini TTS model refused");
              }
              const part = data.candidates?.[0]?.content?.parts?.[0];
              const base64Audio = part?.inlineData?.data;
              if (!base64Audio) {
                  console.error("[TTS] No audio data in response. Keys:", Object.keys(data), "candidates:", JSON.stringify(data.candidates?.[0]?.content?.parts?.map(p => Object.keys(p))).substring(0, 200));
                  throw new Error("No audio data received.");
              }
              const bytes = decodeBase64(base64Audio);
              _noteGeminiSuccess();
              return { bytes, base64: base64Audio };
            } catch (err) {
              console.warn("[TTS] Gemini TTS Fetch Error:", err.message);
              throw err;
            }
                })();
                _ttsTrace('fetch:ok', { ms: Date.now() - taskStartedAt, voice: safeVoice });
                return taskResult;
            } catch (taskError) {
                const mapped = rethrowWatchdog(taskError);
                _ttsTrace('fetch:fail', {
                    ms: Date.now() - taskStartedAt,
                    error: String((mapped && mapped.message) || mapped).substring(0, 140),
                    aborted: !!(mapped && mapped.name === 'AbortError'),
                });
                throw mapped;
            } finally {
                try { signal?.removeEventListener?.('abort', callerAbortHandler); } catch (_) {}
            }
        });
        // Inter-request breathing room — the Word Sounds preload fires 10+
        // TTS requests back-to-back through this queue, and the Canvas proxy
        // rotates auth tokens fast enough that a request can land mid-
        // rotation and come back 401. The 150ms settle gap lives on the QUEUE
        // (before the next serialized fetch), not on the caller's await —
        // moving it off the critical path (2026-07-17) shaves 150ms from
        // every time-to-first-audio without changing inter-request spacing.
        state[queueSlot] = queuedTask.catch(() => {}).then(() => new Promise(r => setTimeout(r, 150)));
        if (!signal) return queuedTask;
        return new Promise((resolve, reject) => {
            const cleanup = () => { try { signal.removeEventListener('abort', rejectAborted); } catch (_) {} };
            const rejectAborted = () => {
                cleanup();
                const error = new Error('TTS request aborted');
                error.name = 'AbortError';
                reject(error);
            };
            if (signal.aborted) return rejectAborted();
            try { signal.addEventListener('abort', rejectAborted, { once: true }); } catch (_) {}
            queuedTask.then(
                (value) => { cleanup(); resolve(value); },
                (error) => { cleanup(); reject(error); }
            );
        });
    };

    // ONE voice-prefix test and ONE local-TTS text cleaner for all four
    // routing sites (Canvas/non-Canvas x callTTS/callTTSDirect). The copies
    // had already drifted: the short chains lacked the Dr./Mr./decimal-point
    // pronunciation rules the Canvas chain applies.
    const KOKORO_VOICE_PREFIX = /^(af_|am_|bf_|bm_)/i;
    const cleanTextForLocalTTS = (raw) => String(raw == null ? '' : raw)
        .replace(/^\s*\d+\.\s+/gm, '')
        .replace(/^\s*[-*\u2022]\s+/gm, '')
        .replace(/\be\.g\.\s/gi, 'for example ')
        .replace(/\bi\.e\.\s/gi, 'that is ')
        .replace(/\betc\.\s/gi, 'etcetera ')
        .replace(/\bvs\.\s/gi, 'versus ')
        .replace(/\bDr\.\s/gi, 'Doctor ')
        .replace(/\bMr\.\s/gi, 'Mister ')
        .replace(/\bMs\.\s/gi, 'Miss ')
        .replace(/\bSt\.\s/gi, 'Saint ')
        .replace(/(\d)\.\s+(\d)/g, '$1 point $2')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ', ')
        .replace(/\s{2,}/g, ' ').trim();
    // ── Spoken math pre-pass (2026-07-05) ──
    // Substitute delimited math ($x^2$, $$..$$, \(..\), \[..\]) with a spoken
    // rendering via Speech Rule Engine (sre_loader.js → window.AlloMathSpeech)
    // BEFORE the text forks to any synthesis leg — without this every engine
    // reads "dollar x caret two dollar". One shared pre-pass, same rationale
    // as cleanTextForLocalTTS (the per-leg copies drift). Fallback-safe: on
    // no-math / loader missing / SRE failure / timeout the original text is
    // returned untouched, so the worst case is exactly today's behaviour.
    const DELIMITED_MATH_SEGMENT_RE = /\$\$([^$]{1,400}?)\$\$|\\\[([\s\S]{1,400}?)\\\]|\\\(([\s\S]{1,300}?)\\\)|\$([^$\n]{1,200}?)\$/g;
    const MATHML_SEGMENT_RE = /<math\b[\s\S]{1,12000}?<\/math>/gi;
    // Currency guard: "$5 and $10" pairs into a bogus segment. Only treat a
    // delimited segment as math when it carries a LaTeX command, a super/subscript,
    // or a short equation. Actual MathML elements are always eligible.
    const _mathLooksReal = (content) => /\\[a-zA-Z]+|[\^_]/.test(content)
        || (/=/.test(content) && content.length <= 80);
    const _collectMathSpeechJobs = (src) => {
        const jobs = [];
        DELIMITED_MATH_SEGMENT_RE.lastIndex = 0;
        let match;
        while ((match = DELIMITED_MATH_SEGMENT_RE.exec(src))) {
            const body = (match[1] || match[2] || match[3] || match[4] || '').trim();
            if (body && _mathLooksReal(body)) jobs.push({ raw: match[0], body, off: match.index, end: match.index + match[0].length });
            if (match[0] === '') DELIMITED_MATH_SEGMENT_RE.lastIndex += 1;
        }
        MATHML_SEGMENT_RE.lastIndex = 0;
        while ((match = MATHML_SEGMENT_RE.exec(src))) {
            jobs.push({ raw: match[0], body: match[0], off: match.index, end: match.index + match[0].length });
            if (match[0] === '') MATHML_SEGMENT_RE.lastIndex += 1;
        }
        jobs.sort((a, b) => a.off - b.off || b.end - a.end);
        const nonOverlapping = [];
        let coveredUntil = -1;
        jobs.forEach((job) => {
            if (job.off >= coveredUntil) {
                nonOverlapping.push(job);
                coveredUntil = job.end;
            }
        });
        return nonOverlapping;
    };
    const _mathToSpeakable = async (raw, language, speechOptions = null) => {
        try {
            const src = String(raw == null ? '' : raw);
            const jobs = _collectMathSpeechJobs(src);
            if (!jobs.length) return raw;
            if (!window.AlloMathSpeech && window.__alloLoadPlugin) {
                try { await window.__alloLoadPlugin('sre_loader.js'); } catch (_) {}
            }
            if (!window.AlloMathSpeech || typeof window.AlloMathSpeech.toSpeech !== 'function') return raw;
            const sharedOptions = (speechOptions && typeof speechOptions === 'object') ? speechOptions : {};
            const spoken = await Promise.all(jobs.map((job) => window.AlloMathSpeech.toSpeech(job.body, {
                ...sharedOptions,
                lang: language,
                timeoutMs: Number(sharedOptions.timeoutMs) > 0 ? Number(sharedOptions.timeoutMs) : 6000
            })));
            let out = '';
            let cursor = 0;
            jobs.forEach((job, index) => {
                out += src.slice(cursor, job.off);
                out += (spoken[index] && String(spoken[index]).trim())
                    ? (' ' + String(spoken[index]).trim() + ' ')
                    : job.raw;
                cursor = job.end;
            });
            out += src.slice(cursor);
            return out;
        } catch (_) { return raw; }
    };
    // De-dupe identical, non-cancellable cloud requests that arrive before the
    // first one has populated urlCache (for example, karaoke playback racing a
    // look-ahead warm). Requests carrying an AbortSignal stay independent so
    // one caller can never cancel audio another caller is awaiting.
    const callTTSInFlight = new Map();
    const waitForTtsDelay = (delayMs, signal) => {
        if (!signal) return new Promise(resolve => setTimeout(resolve, delayMs));
        if (signal.aborted) {
            const error = new Error('TTS request aborted');
            error.name = 'AbortError';
            return Promise.reject(error);
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { cleanup(); resolve(); }, delayMs);
            const onAbort = () => {
                cleanup();
                const error = new Error('TTS request aborted');
                error.name = 'AbortError';
                reject(error);
            };
            const cleanup = () => {
                clearTimeout(timer);
                try { signal.removeEventListener('abort', onAbort); } catch (_) {}
            };
            try { signal.addEventListener('abort', onAbort, { once: true }); } catch (_) {}
        });
    };

    // Piper is the MULTILINGUAL fallback. For English the ladder is Gemini ->
// Kokoro -> the browser voice, and the browser voice is always present and
// needs no download, so pulling a Piper model mid-read only adds a failure
// surface (and a large fetch) on the one language that never needed it.
// Flip to true to restore Piper as an English fallback.
const PIPER_HANDLES_ENGLISH = false;
let piperLoadPromise = null;
    const ensurePiperTts = async () => {
        try {
            if (window._piperTTS) return window._piperTTS;
            if (typeof window.__loadPiperTTS !== 'function') return null;
            if (!piperLoadPromise) {
                piperLoadPromise = Promise.resolve(window.__loadPiperTTS())
                    .then(() => window._piperTTS || null)
                    .finally(() => { piperLoadPromise = null; });
            }
            return await piperLoadPromise;
        } catch (error) {
            console.warn('[TTS] Piper loader failed:', error?.message || error);
            return null;
        }
    };

    // Kokoro is the ENGLISH fallback, and it was only ever used when the engine
    // happened to be live already: every leg below tested `window._kokoroTTS`
    // and, finding nothing, returned null so the caller spoke through the
    // browser voice. A page refresh clears window._kokoroTTS while the ~88MB
    // model stays in device storage, so a learner who downloaded Kokoro still
    // got the robotic browser voice for the rest of the session.
    //
    // Loading an ALREADY-DOWNLOADED model is not a download, so it does not
    // touch the off-desktop no-auto-download policy (QR students on phones must
    // never pull 88MB unasked). hasKokoro() is the exact distinction: it reads
    // the model cache and fetches nothing. Desktop keeps its existing licence
    // to fetch, since that build ships expecting the local voice.
    let kokoroLoadPromise = null;
    const kokoroModelOnDevice = async () => {
        try {
            const mc = window.AlloModules && window.AlloModules.AlloCommands && window.AlloModules.AlloCommands.modelCache;
            if (!mc || typeof mc.hasKokoro !== 'function') return false;
            return !!(await mc.hasKokoro());
        } catch (_) { return false; }
    };
    const ensureKokoroTts = async (timeoutMs) => {
        try {
            if (window._kokoroTTS && window._kokoroTTS.ready) return window._kokoroTTS;
            if (typeof window.__loadKokoroTTS !== 'function') return null;
            const onDevice = await kokoroModelOnDevice();
            if (!onDevice && !window._isDesktopBundledApp) {
                _ttsTrace('calltts:kokoro-not-on-device', null);
                return null;
            }
            // Desktop may fetch the model, but a speaker waiting on a FIRST
            // 88MB download would sit in silence for minutes. Only the wake of
            // an on-device model is worth blocking a live utterance for; a
            // genuine download stays fire-and-forget, exactly as before, and
            // serves the sentences after it.
            const blocking = onDevice;
            if (!kokoroLoadPromise) {
                window.__kokoroTTSDownloading = true;
                kokoroLoadPromise = Promise.resolve(window.__loadKokoroTTS())
                    .then(() => (window._kokoroTTS && window._kokoroTTS.ready ? window._kokoroTTS : null))
                    .catch((error) => {
                        console.warn('[TTS] Kokoro loader failed:', error?.message || error);
                        return null;
                    })
                    .finally(() => { kokoroLoadPromise = null; window.__kokoroTTSDownloading = false; });
            }
            if (!blocking) {
                _ttsTrace('calltts:kokoro-background-download', null);
                return null;
            }
            // ── V2 (cold start): wait on PROGRESS, not on a stopwatch ──
            // A cached model still has to be read out of device storage,
            // decoded into WASM and warmed with one inference. On a school
            // laptop that is routinely 20-45s, so the old flat 15s deadline
            // expired on the FIRST request every time: that utterance fell
            // through to another engine (or, keyless with the browser-fallback
            // checkbox off, to silence), and only the SECOND request found
            // ready=true. That is exactly the "works on the second try"
            // report.
            //
            // A stopwatch cannot tell a slow-but-healthy wake from a wedged
            // one; forward progress can. Keep waiting while the loader is
            // still moving, give up only after it has been STALLED for the
            // stall budget, and cap the whole thing so nothing waits forever.
            const stallBudget = Number.isFinite(timeoutMs) ? timeoutMs : KOKORO_ENSURE_TIMEOUT_MS;
            const engine = await Promise.race([
                kokoroLoadPromise,
                new Promise((resolve) => {
                    const startedAt = Date.now();
                    let lastPct = -1;
                    let lastMovedAt = startedAt;
                    const tick = setInterval(() => {
                        let pct = -1;
                        try { pct = Number(window._kokoroTTS && window._kokoroTTS.progress); } catch (_) {}
                        if (Number.isFinite(pct) && pct > lastPct) { lastPct = pct; lastMovedAt = Date.now(); }
                        const stalledFor = Date.now() - lastMovedAt;
                        const elapsed = Date.now() - startedAt;
                        if (stalledFor >= stallBudget || elapsed >= KOKORO_ENSURE_MAX_MS) {
                            clearInterval(tick);
                            resolve(undefined);
                        }
                    }, 500);
                    // The winning branch of the race leaves this interval
                    // running otherwise; kokoroLoadPromise always settles.
                    Promise.resolve(kokoroLoadPromise).catch(() => {}).then(() => clearInterval(tick));
                }),
            ]);
            if (engine === undefined) {
                _ttsTrace('calltts:kokoro-ensure-timeout', { stallBudgetMs: stallBudget, maxMs: KOKORO_ENSURE_MAX_MS });
                return null;
            }
            return engine;
        } catch (error) {
            console.warn('[TTS] ensureKokoroTts failed:', error?.message || error);
            return null;
        }
    };

    const callTTS = async (text, voiceName, speed = 1, maxRetriesOrOpts = 2, languageArg) => {
        if (isGlobalMuted()) {
            _ttsTrace('calltts:muted', { chars: String(text || '').length });
            return null;
        }
        if (text == null || !String(text).trim()) {
            console.warn('[TTS] Skipped: empty text (a caller passed a missing field)');
            _ttsTrace('calltts:empty-text', null);
            return null;
        }
        var _requestedVoice = String(voiceName || '');
        voiceName = _resolveRequestedVoice(voiceName);
        var maxRetries = typeof maxRetriesOrOpts === 'number' ? maxRetriesOrOpts
            : (maxRetriesOrOpts && typeof maxRetriesOrOpts.maxRetries === 'number' ? maxRetriesOrOpts.maxRetries : 2);
        var _callOpts = (maxRetriesOrOpts && typeof maxRetriesOrOpts === 'object') ? maxRetriesOrOpts : {};
        // Force refresh is deliberately a strict, per-call boolean. It bypasses
        // only this request's exact cache key and still uses the caller's normal
        // retry ceiling, so regeneration cannot expand into an unbounded retry or
        // broad cache-clear operation. Keep the previous URL until replacement
        // synthesis succeeds; _cacheSet then revokes it atomically.
        var _forceRefresh = _callOpts.force === true;
        maxRetries = Math.max(0, Math.min(2, Math.floor(Number(maxRetries) || 0)));
        // When the caller omits the language, resolve it from app state the
        // same way callTTSDirect does — defaulting to 'English' made Kokoro
        // speak Spanish glossary terms with English phonology (and cache it).
        var _rawLanguage = languageArg || _callOpts.language || getLeveledTextLanguage() || getCurrentUiLanguage() || 'English';
        var _speechProfile = _normalizeTtsSpeechProfile(_rawLanguage, _callOpts.locale, _callOpts.dialect);
        var _language = _speechProfile.baseLanguage;
        var _isEnglish = /^english$/i.test(_language);
        var _signal = _callOpts.signal || null;
        var _isAbortError = (e) => e && (e.name === 'AbortError' || /aborted/i.test(e.message || ''));
        var _resolvedProfileEmitted = false;
        var _resolutionProfile = (provider, engine, model, resolvedVoice, effectiveRate, extra) => {
            var profile = {
                provenanceVersion: 1,
                provider: provider,
                engine: engine,
                voice: _requestedVoice || voiceName,
                language: _speechProfile.cacheIdentity,
                synthesisRate: speed,
                effectiveSynthesisRate: effectiveRate == null ? 1 : effectiveRate,
                voiceResolverVersion: 2,
            };
            if (model) profile.model = model;
            if (resolvedVoice) profile.resolvedVoice = resolvedVoice;
            return Object.assign(profile, extra || {});
        };
        var _emitResolvedProfile = (url, profile) => {
            if (!url) return url;
            if (!_resolvedProfileEmitted && typeof _callOpts.onResolvedProfile === 'function') {
                _resolvedProfileEmitted = true;
                try { _callOpts.onResolvedProfile(profile || {}); } catch (_) {}
            }
            return url;
        };
        var _resolvedKokoroVoice = (requested) => {
            try {
                return window._kokoroTTS && typeof window._kokoroTTS.resolveVoice === 'function'
                    ? window._kokoroTTS.resolveVoice(requested)
                    : null;
            } catch (_) { return null; }
        };
        var _resolvedPiperVoice = (languageCode) => {
            try {
                var key = String(languageCode || '').split('-')[0].toLowerCase();
                var voice = window._piperTTS && window._piperTTS.voiceMap && window._piperTTS.voiceMap[key];
                return voice && voice.voiceId ? String(voice.voiceId) : null;
            } catch (_) { return null; }
        };
        // Provider policy is authoritative before math plugins or synthesis load.
        var _earlyTtsConfig = getAiUserConfig();
        var _earlyTtsProvider = (_earlyTtsConfig && _earlyTtsConfig.ttsProvider) || 'auto';
        if (_earlyTtsProvider === 'off' || _earlyTtsProvider === 'browser') {
            _ttsTrace(_earlyTtsProvider === 'off' ? 'calltts:provider-off' : 'calltts:browser-required', {
                chars: String(text || '').length,
            });
            return null;
        }
        // ── V6: the device voice is a narrator CHOICE, not only a fallback ──
        // "browser" is not a Gemini voice name, so _resolveGeminiVoice() used to
        // rewrite it to the default cloud voice and the cloud spoke instead —
        // picking it in the narrator panel did nothing. Signal the existing
        // browser-required contract instead: callers already treat that as
        // "speak this with speechSynthesis", and unlike a plain null it does not
        // depend on the browser-fallback checkbox. The trade Aaron is buying
        // here is deliberate: a plainer voice that starts instantly.
        if (String(voiceName || '').toLowerCase() === 'browser') {
            _ttsTrace('calltts:browser-voice-selected', { chars: String(text || '').length });
            const browserVoiceRequest = new Error('The device voice is selected for narration.');
            browserVoiceRequest.code = 'BROWSER_TTS_REQUIRED';
            browserVoiceRequest.useBrowserTts = true;
            throw browserVoiceRequest;
        }
        // Spoken math pre-pass (no-op unless delimited math is present)
        text = await _mathToSpeakable(text, _language, _callOpts.mathSpeech || null);
        _ttsTrace('calltts:start', {
            chars: String(text || '').length,
            voice: String(voiceName || ''),
            lang: _speechProfile.cacheIdentity,
            maxRetries: maxRetries,
            priority: _callOpts.priority || 'normal',
            reason: _callOpts.reason || null,
            force: _forceRefresh,
            signal: !!_signal,
            canvas: !!_isCanvasEnv,
        });
        // Canvas: Gemini TTS (primary, expressive, multilingual) → Kokoro/Piper (offline fallback)
        if (_isCanvasEnv && _earlyTtsProvider !== 'local') {
            // Hoisted so the end-of-branch diagnostics trace can report the
            // last Gemini failure even though attempts run in a nested block.
            var canvasLastErr = null;
            var _kokoroVoicePrefix = /^(af_|am_|bf_|bm_)/i;
            var _isKokoroVoice = typeof voiceName === 'string' && _kokoroVoicePrefix.test(voiceName);
            if (_isKokoroVoice && !_isEnglish) {
                const _geminiVoice = _resolveGeminiVoice(voiceName);
                console.log('[TTS] Kokoro voice "' + voiceName + '" cannot pronounce ' + _language + ' — switching to Gemini "' + _geminiVoice + '" for this call');
                voiceName = _geminiVoice;
                _isKokoroVoice = false;
            }
            if (_isKokoroVoice) {
                console.log('[Canvas TTS] Kokoro voice selected (' + voiceName + ') — skipping Gemini, using Kokoro directly');
            }
            if (!_isKokoroVoice) voiceName = _resolveGeminiVoice(voiceName);
            // Match the non-Canvas cache key exactly, including language. The
            // previous Canvas branch wrote a shorter key and never read it, so
            // a warmed sentence was synthesized again when playback asked.
            const canvasCacheKey = JSON.stringify([String(text || ''), voiceName, _speechProfile.cacheIdentity, 'natural-rate-v1']);
            if (!_isKokoroVoice && !_forceRefresh && state.urlCache.has(canvasCacheKey)) {
                debugLog('callTTS Canvas cache HIT:', text?.substring(0, 30));
                _ttsTrace('calltts:cache-hit', { chars: String(text || '').length, voice: voiceName });
                return _emitResolvedProfile(
                    state.urlCache.get(canvasCacheKey),
                    _resolutionProfile('gemini', 'gemini-tts', GEMINI_MODELS?.tts, voiceName, 1, { cacheHit: true })
                );
            }
            if (_isKokoroVoice) {
                // Intentional fall-through to Kokoro/Piper block below.
            } else if (window.__ttsGeminiAuthFailed && Date.now() < (state.authRetryAt || 0)) {
                // The Canvas-injected key was 401-rejected this session. Every
                // Gemini attempt is doomed until the token rotates, and each
                // one costs the caller a full fetch budget while a ready local
                // engine sits idle (field log 2026-07-20: Edit-Audio hung
                // minutes across three doomed attempts). Skip straight to the
                // local fallback; a single probe re-tests Gemini per cooldown.
                canvasLastErr = new Error('Gemini auth latched — skipped (probe in ' + Math.max(0, Math.round(((state.authRetryAt || 0) - Date.now()) / 1000)) + 's)');
                _ttsTrace('calltts:canvas-skip-authfailed', { probeInMs: Math.max(0, (state.authRetryAt || 0) - Date.now()) });
            } else if (Date.now() < (state.timeoutRetryAt || 0)) {
                const timeoutCooldownMs = Math.max(0, state.timeoutRetryAt - Date.now());
                canvasLastErr = new Error('Gemini timeout cooldown; using local audio');
                _ttsTrace('calltts:canvas-skip-timeout', { untilMs: timeoutCooldownMs });
                console.warn('[Canvas TTS] Gemini timeout cooldown active; using local fallback');
            } else if (Date.now() >= state.rateLimitedUntil) {
                // Honor the caller's retry budget here just as the non-Canvas
                // path does below. Karaoke deliberately uses 0 retries for
                // look-ahead and 1 retry for active playback; the former
                // hard-coded three attempts could add several seconds before
                // the learner heard the local/browser fallback.
                let canvasMaxAttempts = Math.max(
                    1,
                    (Number.isFinite(maxRetries) ? Math.max(0, Math.floor(maxRetries)) : 2) + 1
                );
                if (window.__ttsGeminiAuthFailed) {
                    // Latched but the cooldown expired (or was never armed):
                    // this call is the PROBE. One attempt only, and arm the
                    // cooldown up front so a failed probe stays cheap for the
                    // next five minutes of callers.
                    state.authRetryAt = Date.now() + 5 * 60000;
                    canvasMaxAttempts = 1;
                    _ttsTrace('calltts:canvas-auth-probe', null);
                }
                canvasLastErr = null;
                const fetchCanvasTTSBytes = async () => {
                    if (_signal) return fetchTTSBytes(text, voiceName, speed, _speechProfile, _signal, _callOpts.priority);
                    // A waiting learner must never be glued to someone else's
                    // possibly-wedged request (field trace 2026-07-20: a Canvas
                    // fetch hung 60s before its 401 and every playback retry
                    // JOINED that zombie — a minute of dead air per join).
                    // Interactive callers always issue their OWN request (still
                    // registered, so background callers can piggyback on the
                    // fast one); background callers join only entries younger
                    // than the stale ceiling.
                    const isInteractive = _callOpts.priority === 'interactive';
                    let entry = callTTSInFlight.get(canvasCacheKey);
                    const entryAge = entry ? Date.now() - entry.startedAt : 0;
                    if (!entry || isInteractive || _forceRefresh || entryAge > CALLTTS_JOIN_MAX_AGE_MS) {
                        if (entry && entryAge > CALLTTS_JOIN_MAX_AGE_MS) {
                            _ttsTrace('calltts:inflight-stale-replaced', { chars: String(text || '').length, ageMs: entryAge });
                        }
                        entry = { promise: fetchTTSBytes(text, voiceName, speed, _speechProfile, null, _callOpts.priority), startedAt: Date.now() };
                        callTTSInFlight.set(canvasCacheKey, entry);
                    } else {
                        debugLog('callTTS Canvas in-flight JOIN:', text?.substring(0, 30));
                        _ttsTrace('calltts:inflight-join', { chars: String(text || '').length });
                    }
                    try {
                        return await entry.promise;
                    } finally {
                        if (callTTSInFlight.get(canvasCacheKey) === entry) {
                            callTTSInFlight.delete(canvasCacheKey);
                        }
                    }
                };
                for (let canvasAttempt = 0; canvasAttempt < canvasMaxAttempts; canvasAttempt++) {
                    try {
                        console.log(`[Canvas TTS] Attempting Gemini TTS${canvasAttempt > 0 ? ` (retry ${canvasAttempt})` : ''} for:`, text?.substring(0, 40), 'voice:', voiceName);
                        const ttsResult = await fetchCanvasTTSBytes();
                        console.log('[Canvas TTS] fetchTTSBytes result:', ttsResult ? 'got audio (' + (ttsResult.bytes?.length || 0) + ' bytes)' : 'null');
                        if (ttsResult) {
                            // A joined caller may resume after the owner already
                            // converted these bytes and populated the URL cache.
                            if (!_forceRefresh && state.urlCache.has(canvasCacheKey)) {
                                return _emitResolvedProfile(
                                    state.urlCache.get(canvasCacheKey),
                                    _resolutionProfile('gemini', 'gemini-tts', GEMINI_MODELS?.tts, voiceName, 1, { cacheHit: true, joined: true })
                                );
                            }
                            const { bytes: pcmBytes } = ttsResult;
                            const wavBuffer = pcmToWav(pcmBytes);
                            const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                            const url = URL.createObjectURL(blob);
                            _cacheSet(canvasCacheKey, url);
                            console.log('[Canvas TTS] ✅ Gemini TTS succeeded!');
                            return _emitResolvedProfile(
                                url,
                                _resolutionProfile('gemini', 'gemini-tts', GEMINI_MODELS?.tts, voiceName, 1, { cacheHit: false })
                            );
                        }
                        throw new Error('fetchTTSBytes returned empty result');
                    } catch (e) {
                        canvasLastErr = e;
                        const msg = e?.message || '';
                        _ttsTrace('calltts:canvas-attempt-fail', {
                            attempt: canvasAttempt + 1,
                            of: canvasMaxAttempts,
                            error: String(msg).substring(0, 140),
                        });
                        if (_isAbortError(e)) { throw e; } // caller cancelled — exit cascade
                        if (msg.includes('429') || msg.includes('Rate Limited')) {
                            state.rateLimitedUntil = Date.now() + 60000;
                            window.__ttsGeminiQuotaFailed = true;
                            console.warn('[Canvas TTS] Rate limited; using local fallback:', msg);
                            break;
                        }
                        if (msg.includes('Missing API Key')) {
                            window.__ttsGeminiAuthFailed = true;
                            console.warn('[Canvas TTS] Missing API key; using local fallback:', msg);
                            break;
                        }
                        const isDeadlineTimeout = msg.includes('timeout after');
                        if (isDeadlineTimeout) {
                            // A SINGLE slow response used to arm a 60s cooldown
                            // and break with zero retries, so one hiccup handed
                            // a full minute of reading to the browser voice.
                            // Spend one retry first; a second strike is evidence
                            // the path really is slow and still arms the cooldown.
                            ttsTimeoutStrikes += 1;
                            if (ttsTimeoutStrikes < 2 && canvasAttempt < canvasMaxAttempts - 1) {
                                _ttsTrace('calltts:canvas-timeout-retry', { strike: ttsTimeoutStrikes });
                                console.warn('[Canvas TTS] Gemini timed out — retrying once before the cooldown:', msg);
                                await waitForTtsDelay(600, _signal);
                                continue;
                            }
                            state.timeoutRetryAt = Date.now() + TTS_TIMEOUT_COOLDOWN_MS;
                            _ttsTrace('calltts:canvas-timeout-fallback', { cooldownMs: TTS_TIMEOUT_COOLDOWN_MS, strikes: ttsTimeoutStrikes });
                            console.warn('[Canvas TTS] Gemini timed out; using local fallback:', msg);
                            break;
                        }
                        // finishReason=OTHER is a completed model refusal, not a
                        // transport failure. Repeating the same text/voice
                        // immediately produced another 5-10 second refusal in
                        // the field trace; fall through to local/browser audio
                        // after the first response instead.
                        if (msg.includes('model refused')) {
                            _ttsTrace('calltts:canvas-model-refusal-fallback', null);
                            console.warn('[Canvas TTS] Gemini refused this utterance; using local fallback');
                            break;
                        }
                        const isTransient = _isRetryableTtsError(msg);
                        if (isTransient && canvasAttempt < canvasMaxAttempts - 1) {
                            const backoffMs = 800 * Math.pow(2, canvasAttempt);
                            console.warn(`[Canvas TTS] Transient error "${msg}" — retrying in ${backoffMs}ms (attempt ${canvasAttempt + 2}/${canvasMaxAttempts})`);
                            await waitForTtsDelay(backoffMs, _signal);
                            continue;
                        }
                        console.warn('[Canvas TTS] Gemini unavailable after retries; using local fallback:', msg);
                        if (msg.includes('401') || msg.includes('403') || msg.includes('API key')) {
                            window.__ttsGeminiAuthFailed = true;
                        }
                        break;
                    }
                }
            } else {
                console.warn('[Canvas TTS] Gemini rate-limited, using local fallback');
                _ttsTrace('calltts:rate-limit-cooldown', { untilMs: Math.max(0, state.rateLimitedUntil - Date.now()) });
                window.__ttsGeminiQuotaFailed = true;
            }
            // Fallback: Kokoro (English) or Piper (multilingual) — works offline
            if (!window._kokoroTTS?.ready && !window.__kokoroTTSDownloading) {
              if (!window.__kokoroOfferShown && !window.__kokoroOfferDeclined && (window.__ttsGeminiQuotaFailed || window.__ttsGeminiAuthFailed)) {
                window.__kokoroOfferShown = true;
                if (setShowKokoroOfferModal) setShowKokoroOfferModal(true);
              }
            }
            const localTtsText = cleanTextForLocalTTS(text);
            const ttsLang = languageToTTSCode(_language);
            if (!window._piperTTS && ttsLang !== 'en') {
                await ensurePiperTts();
            }
            if (ttsLang === 'en') {
                try {
                    // Wake an already-downloaded engine rather than skipping
                    // straight to the browser voice. Piper has had this lazy
                    // ensure since it landed; Kokoro never did, so a refresh
                    // (which clears window._kokoroTTS but not the cached model)
                    // pinned English readers to the browser voice for the rest
                    // of the session. ensureKokoroTts is a no-op unless the
                    // model is genuinely on THIS device or we are the desktop
                    // build, so it cannot start a surprise 88MB download for a
                    // QR student on a phone.
                    if (!window._kokoroTTS || !window._kokoroTTS.ready) await ensureKokoroTts();
                    if (window._kokoroTTS) {
                        // callTTS promises one COMPLETE playable URL. The streaming
                        // API returns only its first chunk and requires chainPlay,
                        // which karaoke and most read-aloud callers do not use.
                        // Kokoro only knows its own voice ids — a Gemini name
                        // ('Kore') passed through raw made the engine return
                        // nothing, SILENTLY, while ready (field log 2026-07-20).
                        const kokoroVoice = _kokoroVoicePrefix.test(String(voiceName || '')) ? voiceName : 'af_heart';
                        // Preserve the loader's ownership contract: a signal-free
                        // prewarm owns shareable background work, while an active
                        // request with an upstream signal remains cancellable.
                        // Manufacturing a controller for prewarm made every call
                        // look signal-owned, so Kokoro could not register it in
                        // its background in-flight map and active playback ran a
                        // duplicate generation.
                        const kokoroController = _signal && typeof AbortController !== 'undefined'
                            ? new AbortController()
                            : null;
                        const kokoroSpeakOptions = _signal
                            ? { signal: kokoroController?.signal || _signal }
                            : undefined;
                        let kokoroTimedOut = false;
                        const relayKokoroAbort = () => { try { kokoroController?.abort(); } catch (_) {} };
                        if (_signal && kokoroController) {
                            if (_signal.aborted) relayKokoroAbort();
                            else _signal.addEventListener('abort', relayKokoroAbort, { once: true });
                        }
                        let kokoroTimer = null;
                        try {
                            const url = await Promise.race([
                                window._kokoroTTS.speak(localTtsText, kokoroVoice, speed, kokoroSpeakOptions),
                                new Promise((_, reject) => {
                                    kokoroTimer = setTimeout(() => {
                                        kokoroTimedOut = true;
                                        relayKokoroAbort();
                                        reject(new Error('kokoro fallback timeout (60s)'));
                                    }, 60000);
                                }),
                            ]);
                            if (url) {
                                _ttsTrace('calltts:kokoro-fallback-ok', { voice: kokoroVoice });
                                return _emitResolvedProfile(
                                    url,
                                    _resolutionProfile('local', 'kokoro-browser', null, _resolvedKokoroVoice(kokoroVoice), 1, {
                                        fallbackFrom: _isKokoroVoice ? null : 'gemini'
                                    })
                                );
                            }
                            _ttsTrace('calltts:kokoro-fallback-empty', { voice: kokoroVoice });
                        } catch (kokoroError) {
                            if (kokoroTimedOut) throw new Error('kokoro fallback timeout (60s)');
                            throw kokoroError;
                        } finally {
                            if (kokoroTimer) clearTimeout(kokoroTimer);
                            try { _signal?.removeEventListener?.('abort', relayKokoroAbort); } catch (_) {}
                        }
                    }
                } catch (e) {
                    if (_isAbortError(e)) throw e;
                    console.warn('[Canvas TTS] Kokoro fallback failed:', e?.message);
                    _ttsTrace('calltts:kokoro-fallback-fail', { error: String(e?.message || e).substring(0, 100) });
                }
                try {
                    if (PIPER_HANDLES_ENGLISH && window._piperTTS) {
                        const url = await window._piperTTS.speak(localTtsText, 'en', speed, { signal: _signal });
                        if (url) {
                            _ttsTrace('calltts:piper-fallback-ok', null);
                            return _emitResolvedProfile(
                                url,
                                _resolutionProfile('local', 'piper-browser', null, _resolvedPiperVoice('en'), 1, {
                                    languageCode: 'en',
                                    fallbackFrom: 'gemini'
                                })
                            );
                        }
                    }
                } catch (e) {
                    if (_isAbortError(e)) throw e;
                    console.warn('[Canvas TTS] Piper en fallback failed:', e?.message);
                    _ttsTrace('calltts:piper-fallback-fail', { error: String(e?.message || e).substring(0, 100) });
                }
            } else {
                try {
                    if (window._piperTTS && window._piperTTS.supportsLanguage(ttsLang)) {
                        const url = await window._piperTTS.speak(localTtsText, ttsLang, speed, { signal: _signal });
                        if (url) {
                            _ttsTrace('calltts:piper-fallback-ok', { lang: ttsLang });
                            return _emitResolvedProfile(
                                url,
                                _resolutionProfile('local', 'piper-browser', null, _resolvedPiperVoice(ttsLang), 1, {
                                    languageCode: ttsLang,
                                    fallbackFrom: 'gemini'
                                })
                            );
                        }
                    }
                } catch (e) {
                    if (_isAbortError(e)) throw e;
                    console.warn('[Canvas TTS] Piper', ttsLang, 'fallback failed:', e?.message);
                    _ttsTrace('calltts:piper-fallback-fail', { lang: ttsLang, error: String(e?.message || e).substring(0, 100) });
                }
            }
            // Nothing on the Canvas cascade produced audio: the caller will
            // fall back to the device/browser voice. Record WHY we got here.
            _ttsTrace('calltts:canvas-null', {
                chars: String(text || '').length,
                lastError: canvasLastErr ? String(canvasLastErr.message || canvasLastErr).substring(0, 140) : null,
                quotaFailed: !!window.__ttsGeminiQuotaFailed,
                authFailed: !!window.__ttsGeminiAuthFailed,
            });
            return null;
        }
        // ─── Desktop/Firebase: a selected Kokoro voice speaks through the local engine ───
        // The Canvas branch above has always routed af_/am_/bf_/bm_ voices to the
        // in-browser Kokoro engine, but this non-Canvas path sent them to the
        // AIProvider/Gemini instead: Gemini 400s on non-Gemini voice names, every
        // caller's catch lands on browser speechSynthesis, and the model that the
        // header picker downloads (and desktop/Firebase boot auto-loads) never speaks.
        var _kokoroDeferredToGemini = false;
        // Routing breadcrumb for the Setup Health card / diagnostics: which leg
        // actually served (or refused) the last read-aloud, and why.
        var _routeNote = function (route, detail) {
            try { window.__ttsLastRoute = { at: Date.now(), fn: 'callTTS', voice: String(voiceName || ''), route: route, detail: detail || '' }; } catch (_) {}
            // Same breadcrumb, durable form: the Setup Health card shows only
            // the LAST route; the trace keeps the sequence for diagnostics.
            _ttsTrace('route:' + route, { voice: String(voiceName || ''), detail: detail || '' });
        };
        // Keyless installs have NO usable cloud voice: once the local engine is
        // ready it should serve EVERY voice name (the engine's resolveVoice maps
        // Gemini names like 'Kore' to Kokoro equivalents). Without this, any
        // stale cloud voice name in storage pinned keyless users to the browser
        // voice even with a ready engine. Explicit 'browser' choice and
        // provider-managed TTS (Edge/off) are respected.
        var _cfgTtsEarly = getAiUserConfig();
        var _provTtsEarly = (_cfgTtsEarly && _cfgTtsEarly.ttsProvider) || 'auto';
        var _provIsLocalAI = !!(_cfgTtsEarly && (_cfgTtsEarly.backend === 'ollama' || _cfgTtsEarly.backend === 'localai'));
        // 'local' does NOT block Kokoro (field-caught 2026-07-06, the last bug
        // of the batch): the "Local TTS" setting predates the in-browser
        // engine and pointed only at self-hosted Kokoro-FastAPI (:8880) /
        // Edge-TTS (:5500) servers a desktop install doesn't run — picking
        // "Local TTS" ironically skipped the REAL local voice and landed on
        // the browser fallback. The in-browser engine is now the FIRST leg of
        // that cascade; the provider servers stay second for setups that run them.
        var _providerHandlesTts = _provTtsEarly === 'browser' || _provTtsEarly === 'off' || (_provTtsEarly === 'auto' && _provIsLocalAI);
        var _kokoroPreferred = typeof voiceName === 'string' && KOKORO_VOICE_PREFIX.test(voiceName);
        var _localTtsChosen = _provTtsEarly === 'local' && typeof voiceName === 'string' && voiceName !== 'browser';
        var _kokoroKeyless = !_isCanvasEnv && !_cloudKeyUsable() && !_providerHandlesTts && typeof voiceName === 'string' && voiceName !== 'browser';
        if (_kokoroPreferred || _localTtsChosen || _kokoroKeyless) {
            if (!_isEnglish) {
                console.log('[TTS] Kokoro voice "' + voiceName + '" cannot pronounce ' + _language + ' — deferring to cloud voices for this call');
                _routeNote('kokoro-skip', 'non-English content: ' + _language);
                _kokoroDeferredToGemini = true;
            } else if (window._kokoroTTS && window._kokoroTTS.ready) {
                try {
                    // Generic callTTS callers consume a single URL, so return a
                    // complete WAV instead of silently dropping later stream chunks.
                    // AlloBot keeps using callTTSDirect + chainPlay for true streaming.
                    const kokoroUrl = await window._kokoroTTS.speak(cleanTextForLocalTTS(text), voiceName, speed, { signal: _signal });
                    if (kokoroUrl) {
                        _routeNote('kokoro', _kokoroPreferred ? 'kokoro voice selected' : 'keyless reroute');
                        return _emitResolvedProfile(
                            kokoroUrl,
                            _resolutionProfile('local', 'kokoro-browser', null, _resolvedKokoroVoice(voiceName), 1)
                        );
                    }
                    _routeNote('kokoro-empty', 'engine returned no audio');
                    _kokoroDeferredToGemini = true; // engine returned nothing
                } catch (e) {
                    if (_isAbortError(e)) { throw e; }
                    console.warn('[TTS] Kokoro engine failed — deferring to provider/cloud voices:', e?.message);
                    _kokoroDeferredToGemini = true;
                }
            } else if (await ensureKokoroTts()) {
                // The engine was not live, but the model IS on this device (or
                // we are desktop), so wake it and speak now. Previously this
                // case only ever kicked a background load and returned, handing
                // the CURRENT utterance to the cloud or the browser voice —
                // which is what a learner actually hears.
                try {
                    const wokenUrl = await window._kokoroTTS.speak(cleanTextForLocalTTS(text), voiceName, speed, { signal: _signal });
                    if (wokenUrl) {
                        _routeNote('kokoro', 'engine woken from on-device model');
                        return _emitResolvedProfile(
                            wokenUrl,
                            _resolutionProfile('local', 'kokoro-browser', null, _resolvedKokoroVoice(voiceName), 1)
                        );
                    }
                    _routeNote('kokoro-empty', 'woken engine returned no audio');
                    _kokoroDeferredToGemini = true;
                } catch (e) {
                    if (_isAbortError(e)) { throw e; }
                    console.warn('[TTS] Woken Kokoro engine failed — deferring to provider/cloud voices:', e?.message);
                    _kokoroDeferredToGemini = true;
                }
            } else if (window._isDesktopBundledApp) {
                // Engine missing OR loaded-but-never-ready: kick a background
                // (re)load for future calls. The ready gate matters — a failed
                // first init (e.g. the ~86MB voice download racing a multi-GB
                // LLM download on first desktop boot, or a truncated cache)
                // leaves window._kokoroTTS PRESENT with ready=false forever;
                // without re-init here every call silently lands on the
                // browser voice. __loadKokoroTTS re-runs init when not ready.
                // The configured provider still sees the ORIGINAL voice —
                // OpenAI-compatible local TTS servers (Kokoro-FastAPI) accept
                // af_* natively; only the Gemini leg needs a Gemini voice.
                if (window.__loadKokoroTTS && !window.__kokoroTTSDownloading) {
                    window.__kokoroTTSDownloading = true;
                    Promise.resolve(window.__loadKokoroTTS()).then(function () { window.__kokoroTTSDownloading = false; }, function () { window.__kokoroTTSDownloading = false; });
                }
                _routeNote('kokoro-not-ready', 'engine preparing — background (re)init kicked');
                _kokoroDeferredToGemini = true;
            } else {
                // Off-desktop (CDN student shell, hosted origins, Canvas) the
                // ~88MB engine must NEVER download without an explicit user
                // action (voice picker, offer modal, Word Sounds button) —
                // QR students on phones were getting silent model downloads.
                // This call falls through to provider/cloud/browser voices.
                _routeNote('kokoro-not-ready', 'engine not downloaded — automatic download is desktop-only');
                _kokoroDeferredToGemini = true;
            }
        }

        if (!_isEnglish && (_localTtsChosen || _kokoroKeyless)) {
            try {
                const piper = window._piperTTS || await ensurePiperTts();
                const piperLanguage = languageToTTSCode(_language);
                if (piper?.supportsLanguage?.(piperLanguage)) {
                    const piperUrl = await piper.speak(cleanTextForLocalTTS(text), piperLanguage, speed, { signal: _signal });
                    if (piperUrl) {
                        _routeNote('piper', 'local multilingual fallback: ' + piperLanguage);
                        return _emitResolvedProfile(
                            piperUrl,
                            _resolutionProfile('local', 'piper-browser', null, _resolvedPiperVoice(piperLanguage), 1, {
                                languageCode: piperLanguage
                            })
                        );
                    }
                }
            } catch (error) {
                if (_isAbortError(error)) throw error;
                _routeNote('piper-failed', error?.message || 'multilingual local fallback failed');
            }
        }

        // ─── AIProvider TTS routing ───────────────────────────────────
        const _aiUserConfig = getAiUserConfig();
        const _ai = getAi();
        const _ttsOvr = _aiUserConfig?.ttsProvider || 'auto';
        const _isLocalAI = (_aiUserConfig?.backend === 'ollama' || _aiUserConfig?.backend === 'localai');
        if (_ttsOvr === 'local' || _ttsOvr === 'browser' || _ttsOvr === 'off' || (_ttsOvr === 'auto' && _isLocalAI)) {
            try {
                const result = await _ai.textToSpeech(text, { voice: voiceName, speed, language: _language, locale: _speechProfile.locale, dialect: _speechProfile.dialect, signal: _signal, force: _forceRefresh });
                _routeNote('provider', 'ttsProvider=' + _ttsOvr);
                return _emitResolvedProfile(
                    result,
                    _resolutionProfile(
                        (_ttsOvr === 'auto' && _isLocalAI) ? 'local' : _ttsOvr,
                        'ai-provider-' + ((_aiUserConfig && _aiUserConfig.backend) || 'custom'),
                        (_ai && _ai.models && _ai.models.tts) || (_aiUserConfig && _aiUserConfig.models && _aiUserConfig.models.tts) || null,
                        voiceName,
                        1
                    )
                );
            } catch (e) {
                if (_isAbortError(e)) throw e;
                if (e?.useBrowserTts || e?.code === 'BROWSER_TTS_REQUIRED' || _ttsOvr === 'browser') {
                    _routeNote('browser-required', 'ttsProvider=' + _ttsOvr);
                    return null;
                }
                console.warn('[callTTS] AIProvider TTS failed:', e?.message);
                if (_ttsOvr === 'local' || (_ttsOvr === 'auto' && _isLocalAI)) return null;
            }
        }
        if (_kokoroDeferredToGemini && KOKORO_VOICE_PREFIX.test(voiceName)) {
            voiceName = _resolveGeminiVoice(voiceName);
            console.warn('[TTS] Kokoro voice unavailable for this call — using Gemini "' + voiceName + '"');
        }
        if (Date.now() < state.rateLimitedUntil) {
            console.warn("[TTS] Skipping — global rate-limit cooldown active for", Math.round((state.rateLimitedUntil - Date.now()) / 1000), "more seconds");
            return null;
        }
        // Keyless install (desktop Built-in Engine, no cloud account): the
        // Gemini TTS leg can NEVER succeed — every attempt is a guaranteed
        // 400 + retries + an error-report entry. Skip it silently (one log
        // per session); callers fall to the browser voice until Kokoro is up.
        if (!_isCanvasEnv && !_cloudKeyUsable()) {
            if (typeof window !== 'undefined' && !window.__ttsKeylessLogged) {
                window.__ttsKeylessLogged = true;
                console.log('[TTS] No cloud TTS key — cloud voice skipped; local Kokoro/browser voices handle read-aloud.');
            }
            _routeNote('keyless-skip', 'no cloud key; caller falls back to the browser voice');
            return null;
        }
        voiceName = _resolveGeminiVoice(voiceName);
        const cacheKey = JSON.stringify([String(text || ''), voiceName, _speechProfile.cacheIdentity, 'natural-rate-v1']);
        if (!_forceRefresh && state.urlCache.has(cacheKey)) {
            debugLog("⚡ callTTS cache HIT:", text?.substring(0, 30));
            return _emitResolvedProfile(
                state.urlCache.get(cacheKey),
                _resolutionProfile('gemini', 'gemini-tts', GEMINI_MODELS?.tts, voiceName, 1, { cacheHit: true })
            );
        }
        const fetchSharedTTSBytes = async () => {
            if (_signal) return fetchTTSBytes(text, voiceName, speed, _speechProfile, _signal, _callOpts.priority);
            // Same zombie-protection as the Canvas branch: interactive callers
            // never join, background callers never join a stale entry.
            const isInteractive = _callOpts.priority === 'interactive';
            let entry = callTTSInFlight.get(cacheKey);
            const entryAge = entry ? Date.now() - entry.startedAt : 0;
            if (!entry || isInteractive || _forceRefresh || entryAge > CALLTTS_JOIN_MAX_AGE_MS) {
                entry = { promise: fetchTTSBytes(text, voiceName, speed, _speechProfile, null, _callOpts.priority), startedAt: Date.now() };
                callTTSInFlight.set(cacheKey, entry);
            } else {
                debugLog('callTTS in-flight JOIN:', text?.substring(0, 30));
            }
            try {
                return await entry.promise;
            } finally {
                if (callTTSInFlight.get(cacheKey) === entry) callTTSInFlight.delete(cacheKey);
            }
        };
        let lastError = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const ttsResult = await fetchSharedTTSBytes();
                if (!ttsResult) { throw new Error("[TTS] fetchTTSBytes returned no audio data"); }
                // The owner of a joined request may already have cached its URL.
                if (!_forceRefresh && state.urlCache.has(cacheKey)) {
                    return _emitResolvedProfile(
                        state.urlCache.get(cacheKey),
                        _resolutionProfile('gemini', 'gemini-tts', GEMINI_MODELS?.tts, voiceName, 1, { cacheHit: true, joined: true })
                    );
                }
                const { bytes: pcmBytes } = ttsResult;
                const wavBuffer = pcmToWav(pcmBytes);
                const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                _cacheSet(cacheKey, url);
                return _emitResolvedProfile(
                    url,
                    _resolutionProfile('gemini', 'gemini-tts', GEMINI_MODELS?.tts, voiceName, 1, { cacheHit: false })
                );
            } catch (e) {
                lastError = e;
                if (_isAbortError(e)) { throw e; } // caller cancelled — no retry
                if (e.message?.includes('Missing API Key')) {
                    throw e;
                }
                const isRateLimit = e.message?.includes('429') || e.message?.includes('Rate Limited');
                if (isRateLimit) {
                    state.rateLimitedUntil = Date.now() + 60000;
                    console.warn(`[TTS] ⚠️ Attempt ${attempt + 1} got 429 — 60s cooldown activated, skipping remaining retries.`);
                    break;
                }
                if (attempt < maxRetries) {
                    const delay = 1000 * (attempt + 1);
                    console.warn(`[TTS-Bot] ⚠️ Attempt ${attempt + 1} failed, will retry...`, e.message);
                    await waitForTtsDelay(delay, _signal);
                }
            }
        }
        warnLog("[TTS] All retries exhausted for:", text?.substring(0, 30), lastError?.message);
        // ── V4: non-English had no engine between the cloud and the checkbox ──
        // English fails soft: Gemini -> Kokoro -> browser, and Kokoro is tried
        // inside this function. Every other language went Gemini -> (nothing) ->
        // the "Browser-voice fallback" checkbox, which is off by default. So
        // when Gemini declined a Spanish sentence the learner got silence, and
        // ticking a checkbox labelled "browser voice" appeared to be what made
        // Gemini work. It never was: it was the only remaining leg.
        //
        // Piper is the multilingual local engine and it was already installed,
        // but it was only reachable from the Canvas branch and from keyless /
        // "Local TTS" installs. Reach it from the cloud path too, so the
        // checkbox goes back to meaning what it says.
        if (!_isEnglish) {
            try {
                const piperLast = window._piperTTS || await ensurePiperTts();
                const piperLastLanguage = languageToTTSCode(_language);
                if (piperLast?.supportsLanguage?.(piperLastLanguage)) {
                    const piperLastUrl = await piperLast.speak(cleanTextForLocalTTS(text), piperLastLanguage, speed, { signal: _signal });
                    if (piperLastUrl) {
                        _routeNote('piper', 'cloud voice declined; local multilingual voice served ' + piperLastLanguage);
                        return _emitResolvedProfile(
                            piperLastUrl,
                            _resolutionProfile('local', 'piper-browser', null, _resolvedPiperVoice(piperLastLanguage), 1, {
                                languageCode: piperLastLanguage,
                                fallbackFrom: 'gemini'
                            })
                        );
                    }
                }
            } catch (piperLastError) {
                if (_isAbortError(piperLastError)) throw piperLastError;
                // Piper reports its own failures to the console and returns
                // null; a raw engine message must never reach a learner.
                _routeNote('piper-failed', 'local multilingual voice could not serve this sentence');
            }
        }
        throw lastError;
    };

    const callTTSDirect = async (text, voiceName, speed = 1, maxRetries = 2) => {
        if (isGlobalMuted()) return null;
        if (text == null || !String(text).trim()) { console.warn('[TTS] Skipped: empty text'); return null; }
        var _directOpts = (maxRetries && typeof maxRetries === 'object') ? maxRetries : {};
        maxRetries = typeof maxRetries === 'number' ? maxRetries
            : (typeof _directOpts.maxRetries === 'number' ? _directOpts.maxRetries : 2);
        maxRetries = Math.max(0, Math.min(2, Number(maxRetries) || 0));
        var _directSignal = _directOpts.signal || null;
        var _directLanguage = _directOpts.language || getLeveledTextLanguage() || getCurrentUiLanguage() || 'English';
        var _isDirectAbortError = (e) => e && (e.name === 'AbortError' || /aborted/i.test(e.message || ''));
        var _directTtsConfig = getAiUserConfig();
        var _directTtsProvider = (_directTtsConfig && _directTtsConfig.ttsProvider) || 'auto';
        if (_directTtsProvider === 'off' || _directTtsProvider === 'browser') return null;
        // Spoken math pre-pass (no-op unless delimited LaTeX or MathML is present).
        text = await _mathToSpeakable(
            text,
            _directLanguage,
            _directOpts.mathSpeech || null
        );
        voiceName = _resolveRequestedVoice(voiceName);
        // ─── Canvas: Gemini TTS first → Kokoro/Piper fallback (same cascade as callTTS) ─────
        if (_isCanvasEnv && _directTtsProvider !== 'local') {
            if (Date.now() < (state.timeoutRetryAt || 0)) {
                _ttsTrace('callttsdirect:canvas-skip-timeout', { untilMs: Math.max(0, state.timeoutRetryAt - Date.now()) });
            } else if (Date.now() >= state.rateLimitedUntil) {
                // Match callTTS's Canvas resilience (field-caught 2026-07-06): the
                // Canvas proxy rotates auth tokens fast enough that a request can
                // transiently 401/503, and the generative TTS model occasionally
                // refuses a short bot line. This path had NO retry (unlike callTTS),
                // so a single blip dropped AlloBot straight to the browser voice
                // even though Gemini was available — the "sometimes browser TTS"
                // regression. Retry transient errors before giving up.
                const botCanvasMaxAttempts = Math.min(2, maxRetries + 1);
                for (let botAttempt = 0; botAttempt < botCanvasMaxAttempts; botAttempt++) {
                    try {
                const botCanvasGeminiVoice = _resolveGeminiVoice(voiceName);
                        const ttsResult = await fetchTTSBytes(text, botCanvasGeminiVoice, speed, _directLanguage, _directSignal, 'interactive');
                        if (ttsResult) {
                            const { bytes: pcmBytes } = ttsResult;
                            const wavBuffer = pcmToWav(pcmBytes);
                            const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                            return URL.createObjectURL(blob);
                        }
                        throw new Error('fetchTTSBytes returned empty result');
                    } catch (e) {
                        if (_isDirectAbortError(e)) throw e;
                        const msg = e?.message || '';
                        if (msg.includes('429') || msg.includes('Rate Limited')) {
                            state.rateLimitedUntil = Date.now() + 60000;
                            console.warn('[callTTSDirect] Gemini rate-limited — falling back to local:', msg);
                            break;
                        }
                        const isDeadlineTimeout = msg.includes('timeout after');
                        if (isDeadlineTimeout) {
                            state.timeoutRetryAt = Date.now() + TTS_TIMEOUT_COOLDOWN_MS;
                            _ttsTrace('callttsdirect:canvas-timeout-fallback', { cooldownMs: TTS_TIMEOUT_COOLDOWN_MS });
                            console.warn('[callTTSDirect] Gemini timed out; using local fallback:', msg);
                            break;
                        }
                        // Bot lines keep their extra tolerance for a one-off
                        // model refusal (a short greeting often succeeds on the
                        // second ask, unlike a whole passage sentence).
                        const isTransient = _isRetryableTtsError(msg) || msg.includes('model refused');
                        if (isTransient && botAttempt < botCanvasMaxAttempts - 1) {
                            const backoffMs = 800 * Math.pow(2, botAttempt);
                            console.warn(`[callTTSDirect] Transient Gemini error "${msg}" — retrying in ${backoffMs}ms (attempt ${botAttempt + 2}/${botCanvasMaxAttempts})`);
                            await waitForTtsDelay(backoffMs, _directSignal);
                            continue;
                        }
                        console.warn('[callTTSDirect] Gemini TTS failed after retries, falling back to local:', msg);
                        break;
                    }
                }
            }
            const ttsLang = languageToTTSCode(_directLanguage);
            if (!window._piperTTS && ttsLang !== 'en') {
                await ensurePiperTts();
            }
            const cleanedText = cleanTextForLocalTTS(text);
            if (ttsLang === 'en') {
                try {
                    // Same lazy wake as callTTS: an on-device model should serve
                    // bot lines too instead of losing them to the browser voice.
                    if (!window._kokoroTTS || !window._kokoroTTS.ready) await ensureKokoroTts();
                    if (window._kokoroTTS) {
                        const url = await window._kokoroTTS.speakStreaming(cleanedText, voiceName, speed, { signal: _directSignal });
                        if (url) return url;
                    }
                } catch (e) { if (_isDirectAbortError(e)) throw e; console.warn('[callTTSDirect] Kokoro failed:', e?.message); }
                try {
                    if (PIPER_HANDLES_ENGLISH && window._piperTTS) {
                        const url = await window._piperTTS.speak(cleanedText, 'en', speed, { signal: _directSignal });
                        if (url) return url;
                    }
                } catch (e) { if (_isDirectAbortError(e)) throw e; console.warn('[callTTSDirect] Piper en fallback failed:', e?.message); }
            } else {
                try {
                    if (window._piperTTS && window._piperTTS.supportsLanguage(ttsLang)) {
                        const url = await window._piperTTS.speak(cleanedText, ttsLang, speed, { signal: _directSignal });
                        if (url) return url;
                    }
                } catch (e) { if (_isDirectAbortError(e)) throw e; console.warn('[callTTSDirect] Piper', ttsLang, 'failed:', e?.message); }
            }
            return null;
        }
        // ─── Desktop/Firebase: selected Kokoro voice → local engine (same fix as callTTS) ───
        var _routeNoteBot = function (route, detail) {
            try { window.__ttsLastRoute = { at: Date.now(), fn: 'callTTSDirect', voice: String(voiceName || ''), route: route, detail: detail || '' }; } catch (_) {}
        };
        // Keyless: the local engine serves ANY bot voice name once ready
        // (resolveVoice maps Gemini names) — same reroute as callTTS.
        var _botCfgTts = getAiUserConfig();
        var _botProvTts = (_botCfgTts && _botCfgTts.ttsProvider) || 'auto';
        var _botProvLocalAI = !!(_botCfgTts && (_botCfgTts.backend === 'ollama' || _botCfgTts.backend === 'localai'));
        // Same as callTTS: ttsProvider 'local' PREFERS the in-browser engine
        // (first cascade leg), never blocks it.
        var _botProviderHandles = _botProvTts === 'browser' || _botProvTts === 'off' || (_botProvTts === 'auto' && _botProvLocalAI);
        var _botKokoroEligible = (typeof voiceName === 'string' && KOKORO_VOICE_PREFIX.test(voiceName))
            || (_botProvTts === 'local' && typeof voiceName === 'string' && voiceName !== 'browser')
            || (!_isCanvasEnv && !_cloudKeyUsable() && !_botProviderHandles && typeof voiceName === 'string' && voiceName !== 'browser');
        if (_botKokoroEligible) {
            const botKokoroLang = languageToTTSCode(_directLanguage);
            if (botKokoroLang === 'en' && window._kokoroTTS && window._kokoroTTS.ready) {
                try {
                    const kokoroBotUrl = await window._kokoroTTS.speakStreaming(cleanTextForLocalTTS(text), voiceName, speed, { signal: _directSignal });
                    if (kokoroBotUrl) { _routeNoteBot('kokoro'); return kokoroBotUrl; }
                } catch (e) { console.warn('[callTTSDirect] Kokoro engine failed — deferring to provider/cloud:', e?.message); _routeNoteBot('kokoro-failed', e?.message); }
                if (_directSignal?.aborted) {
                    const abortError = new Error('TTS request aborted');
                    abortError.name = 'AbortError';
                    throw abortError;
                }
            } else if (botKokoroLang === 'en' && window._isDesktopBundledApp) {
                // Missing or never-ready engine: background (re)init, same as
                // callTTS — a failed first init otherwise pins every bot line
                // to the browser voice with no path back to Kokoro. Desktop
                // only: off-desktop the engine never downloads without an
                // explicit user action (same policy as callTTS above).
                if (window.__loadKokoroTTS && !window.__kokoroTTSDownloading) {
                    window.__kokoroTTSDownloading = true;
                    Promise.resolve(window.__loadKokoroTTS()).then(function () { window.__kokoroTTSDownloading = false; }, function () { window.__kokoroTTSDownloading = false; });
                }
            }
            // No rewrite here: the configured provider accepts af_* names
            // (Kokoro-FastAPI); the safeVoice guard below maps any non-Gemini
            // voice to the selected/default voice for the Gemini fallback leg.
        }

        // ─── AIProvider TTS routing (same as callTTS) ─────────────────
        const _aiUserConfig = getAiUserConfig();
        const _ai = getAi();
        const _ttsOvrBot = _aiUserConfig?.ttsProvider || 'auto';
        const _isLocalAIBot = (_aiUserConfig?.backend === 'ollama' || _aiUserConfig?.backend === 'localai');
        if (_ttsOvrBot === 'local' || _ttsOvrBot === 'browser' || _ttsOvrBot === 'off' || (_ttsOvrBot === 'auto' && _isLocalAIBot)) {
            try {
                return await _ai.textToSpeech(text, { voice: voiceName, speed, language: _directLanguage, signal: _directSignal });
            } catch (e) {
                if (_isDirectAbortError(e)) throw e;
                if (e?.useBrowserTts || e?.code === 'BROWSER_TTS_REQUIRED' || _ttsOvrBot === 'browser') {
                    _routeNoteBot('browser-required', 'ttsProvider=' + _ttsOvrBot);
                    return null;
                }
                console.warn('[callTTSDirect] AIProvider TTS failed:', e?.message);
                if (_ttsOvrBot === 'local' || (_ttsOvrBot === 'auto' && _isLocalAIBot)) return null;
            }
        }
        if (Date.now() < state.rateLimitedUntil) {
            console.warn("[TTS-Bot] Skipping — global rate-limit cooldown active for", Math.round((state.rateLimitedUntil - Date.now()) / 1000), "more seconds");
            return null;
        }
        // Same keyless short-circuit as callTTS: no key = guaranteed 400 from
        // the Gemini leg, so don't burn retries or pollute the error report.
        if (!_isCanvasEnv && !_cloudKeyUsable()) {
            if (typeof window !== 'undefined' && !window.__ttsKeylessLogged) {
                window.__ttsKeylessLogged = true;
                console.log('[TTS-Bot] No cloud TTS key — cloud voice skipped; local Kokoro/browser voices handle speech.');
            }
            return null;
        }
        const safeVoice = _resolveGeminiVoice(voiceName);
        if (safeVoice !== voiceName) console.warn(`[TTS-Bot] Voice "${voiceName}" is not a valid Gemini voice. Falling back to "${safeVoice}".`);
        console.log("[TTS-Bot] 🎤 callTTSDirect called:", { text: text?.substring(0, 40), voice: safeVoice, speed });
        const cacheKey = JSON.stringify([String(text || ''), safeVoice, _directLanguage, 'natural-rate-v1']);
        if (state.urlCache.has(cacheKey)) {
            console.log("[TTS-Bot] ⚡ Cache HIT:", text?.substring(0, 30));
            return state.urlCache.get(cacheKey);
        }
        let lastError = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[TTS-Bot] ⏳ Entering bot queue (attempt ${attempt + 1}/${maxRetries + 1})...`);
                if (attempt > 0) {
                    const backoffDelay = 3000 * attempt;
                    console.log(`[TTS-Bot] ⏳ Waiting ${backoffDelay}ms before retry...`);
                    await waitForTtsDelay(backoffDelay, _directSignal);
                }
                const queuedTask = state.botQueue.then(async () => {
                    console.log("[TTS-Bot] 🔄 Queue slot acquired, making API call...");
                    const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.tts}:generateContent`;
                    const url = `${baseUrl}${apiKey ? `?key=${apiKey}` : ''}`;
                    const decodeBase64 = (base64) => {
                         const binaryString = window.atob(base64);
                         const len = binaryString.length;
                         const bytes = new Uint8Array(len);
                         for (let j = 0; j < len; j++) bytes[j] = binaryString.charCodeAt(j);
                         return bytes;
                    };
                    const payload = {
                      contents: [{ parts: [{ text: (text.length > 10 ? 'Read the following text aloud naturally, do not perform sound effects or noises: ' : '') + text }] }],
                      generationConfig: {
                        responseModalities: ["AUDIO"],
                        ...(state.ttsTemperatureUnsupported ? {} : { temperature: 0.7 }),
                        speechConfig: {
                          voiceConfig: { prebuiltVoiceConfig: { voiceName: safeVoice } }
                        }
                      }
                    };
                    if (_directSignal?.aborted) {
                        const abortError = new Error('TTS request aborted');
                        abortError.name = 'AbortError';
                        throw abortError;
                    }
                    const fetchController = new AbortController();
                    let fetchTimedOut = false;
                    const onDirectAbort = () => { try { fetchController.abort(); } catch (_) {} };
                    try { _directSignal?.addEventListener?.('abort', onDirectAbort, { once: true }); } catch (_) {}
                    let response;
                    try {
                        response = await awaitTtsHardDeadline(fetch(url, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload),
                          signal: fetchController.signal,
                        }), TTS_FETCH_TIMEOUT_INTERACTIVE_MS, () => {
                            fetchTimedOut = true;
                            try { fetchController.abort(); } catch (_) {}
                        }, 'Direct TTS request timed out', _directSignal);
                    } catch (fetchError) {
                        if (_directSignal?.aborted) { fetchError.name = 'AbortError'; throw fetchError; }
                        if (fetchTimedOut) throw new Error('Direct TTS request timed out');
                        throw fetchError;
                    } finally {
                        try { _directSignal?.removeEventListener?.('abort', onDirectAbort); } catch (_) {}
                    }
                    console.log("[TTS-Bot] API response status:", response.status, response.statusText);
                    if (!response.ok) {
                      if (response.status === 429) {
                        state.rateLimitedUntil = Date.now() + 60000;
                        console.warn("[TTS-Bot] ❌ Rate limited (429). 60s cooldown activated.");
                        throw new Error("TTS Rate Limited (429)");
                      }
                      if (response.status === 401 || response.status === 503) {
                        console.warn(`[TTS-Bot] ❌ Transient error (${response.status}). Will retry...`);
                        throw new Error(`TTS Transient Error (${response.status})`);
                      }
                      const errorBody = await response.text().catch(() => '');
                      if (response.status === 400 && !state.ttsTemperatureUnsupported && /temperature/i.test(errorBody)) {
                          state.ttsTemperatureUnsupported = true;
                          console.warn('[TTS-Bot] API rejected temperature param — disabled; retry will go without it.');
                          throw new Error('TTS Transient Error (400 temperature)');
                      }
                      if (response.status === 400 && /API key not valid|API_KEY_INVALID/i.test(errorBody)) {
                    // Key-invalid latch: this key will NEVER work — flip the whole
                    // session to keyless routing (local Kokoro serves; no more doomed calls).
                    try { window.__ttsGeminiAuthFailed = true; } catch (_) {}
                    console.warn("[TTS-Bot]" + " cloud TTS key rejected — switching this session to the local voice.");
                }
                console.error("[TTS-Bot] ❌ API Error:", response.status, response.statusText, errorBody.substring(0, 200));
                      throw new Error(`API Error: ${response.status} ${response.statusText}`);
                    }
                    const data = await response.json();
                    if (data.promptFeedback?.blockReason) {
                        console.error("[TTS-Bot] ❌ Content blocked:", data.promptFeedback.blockReason);
                        throw new Error(`TTS Content Blocked: ${data.promptFeedback.blockReason}`);
                    }
                    if (data.candidates?.[0]?.finishReason === 'OTHER') {
                        console.warn("[TTS-Bot] ❌ Gemini Model Refusal (finishReason: OTHER).");
                        throw new Error("Gemini TTS model refused");
                    }
                    const part = data.candidates?.[0]?.content?.parts?.[0];
                    const base64Audio = part?.inlineData?.data;
                    if (!base64Audio) {
                        console.error("[TTS-Bot] ❌ No audio data in response.");
                        throw new Error("No audio data received.");
                    }
                    console.log("[TTS-Bot] ✅ Audio data received, decoding...");
                    const bytes = decodeBase64(base64Audio);
                    _noteGeminiSuccess();
                    return { bytes, base64: base64Audio };
                });
                state.botQueue = queuedTask.catch(() => {});
                const ttsResult = await queuedTask;
                if (!ttsResult) { throw new Error("[TTS-Bot] fetchTTSBytes returned no audio data"); }
                const { bytes: pcmBytes } = ttsResult;
                const wavBuffer = pcmToWav(pcmBytes);
                const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                _cacheSet(cacheKey, url);
                console.log("[TTS-Bot] ✅ Bot speech generated via dedicated queue for:", text?.substring(0, 30));
                return url;
            } catch (e) {
                if (_isDirectAbortError(e)) throw e;
                if (typeof window !== 'undefined' && window.__ttsGeminiAuthFailed) return null;

                lastError = e;
                if (e.message?.includes('Missing API Key')) {
                    console.error("[TTS-Bot] ❌ Missing API Key, aborting.");
                    throw e;
                }
                if (attempt < maxRetries) {
                    console.warn(`[TTS-Bot] ⚠️ Attempt ${attempt + 1} failed, will retry with backoff...`, e.message);
                }
            }
        }
        console.error("[TTS-Bot] ❌ All retries exhausted after backoff:", lastError?.message || lastError);
        throw lastError;
    };

    return { fetchTTSBytes, callTTS, callTTSDirect };
};

// Registration shim — attach factory + trigger monolith's _upgradeTTS().
if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.createTTS = createTTS;
    window.AlloModules.TTS = true;
    console.log('[TTS] Factory registered');
    if (typeof window._upgradeTTS === 'function') {
        window._upgradeTTS();
    }
}
