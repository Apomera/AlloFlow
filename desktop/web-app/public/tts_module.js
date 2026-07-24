(function() {
'use strict';
if (window.AlloModules && window.AlloModules.TTS) { console.log('[CDN] TTS already loaded, skipping'); return; }
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
const createTTS = deps => {
  const {
    state,
    // { queue, botQueue, urlCache, rateLimitedUntil }
    apiKey,
    GEMINI_MODELS,
    AVAILABLE_VOICES,
    _isCanvasEnv,
    languageToTTSCode,
    isGlobalMuted,
    warnLog,
    debugLog,
    // Dynamic getters for React-state-dependent values
    getLeveledTextLanguage,
    getCurrentUiLanguage,
    getAiUserConfig,
    getAi,
    getSelectedVoice,
    getAvailableVoices,
    // React callback
    setShowKokoroOfferModal
  } = deps;
  const DEFAULT_GEMINI_VOICE = 'Kore';
  const _voiceId = value => {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value === 'object' && typeof value.voice === 'string') return value.voice.trim();
    return '';
  };
  const _liveGeminiVoices = () => {
    let voices = null;
    try {
      if (typeof getAvailableVoices === 'function') voices = getAvailableVoices();
    } catch (_) {}
    try {
      if (!Array.isArray(voices) || voices.length === 0) {
        const config = window.AlloModules && window.AlloModules.VoiceConfig;
        if (config && Array.isArray(config.AVAILABLE_VOICES)) voices = config.AVAILABLE_VOICES;
      }
    } catch (_) {}
    if ((!Array.isArray(voices) || voices.length === 0) && Array.isArray(AVAILABLE_VOICES)) voices = AVAILABLE_VOICES;
    return (Array.isArray(voices) ? voices : []).map(voice => {
      if (typeof voice === 'string') return voice.trim();
      return voice && typeof voice.id === 'string' ? voice.id.trim() : '';
    }).filter(Boolean);
  };
  const _liveSelectedVoice = () => {
    let selected = '';
    try {
      if (typeof getSelectedVoice === 'function') selected = _voiceId(getSelectedVoice());
    } catch (_) {}
    try {
      if (!selected && typeof window !== 'undefined') selected = _voiceId(window.__alloSelectedVoice);
    } catch (_) {}
    return selected || DEFAULT_GEMINI_VOICE;
  };
  const _resolveRequestedVoice = voiceName => _voiceId(voiceName) || _liveSelectedVoice();
  const _resolveGeminiVoice = voiceName => {
    const requested = _voiceId(voiceName);
    const selected = _liveSelectedVoice();
    const voices = _liveGeminiVoices();
    // VoiceConfig is asynchronous. While its catalog is still empty,
    // preserve the caller's explicit/selected name instead of declaring
    // every valid Gemini voice invalid and silently substituting Puck.
    if (voices.length === 0) return requested || selected || DEFAULT_GEMINI_VOICE;
    const canonical = candidate => voices.find(voice => voice.toLowerCase() === String(candidate || '').toLowerCase());
    return canonical(requested) || canonical(selected) || canonical(DEFAULT_GEMINI_VOICE) || DEFAULT_GEMINI_VOICE;
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
    if (state.urlCache.has(key)) state.urlCache.delete(key);
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
  try {
    window.__alloTtsCacheOwnsUrl = url => {
      if (!url) return false;
      for (const cached of state.urlCache.values()) {
        if (cached === url) return true;
      }
      return false;
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
      buffer.push({
        at: Date.now(),
        event: event,
        detail: detail || null
      });
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
  // In-flight joins older than this are presumed wedged and REPLACED —
  // background joiners must not inherit a zombie either.
  const CALLTTS_JOIN_MAX_AGE_MS = 20000;
  const fetchTTSBytes = (text, voiceName, speed = 1, language = 'English', signal = null, requestPriority = 'normal') => {
    // Resolve against the LIVE catalog: TTS can initialize before VoiceConfig.
    const safeVoice = _resolveGeminiVoice(voiceName);
    if (safeVoice !== voiceName) console.warn(`[TTS] Voice "${voiceName}" is not a valid Gemini voice. Falling back to "${safeVoice}".`);
    debugLog("[fetchTTSBytes] text:", text?.substring(0, 30), "lang:", language);
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
      lang: language,
      text: String(text || '').substring(0, 48)
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
      const watchdogTimer = watchdogController ? setTimeout(() => {
        watchdogFired = true;
        try {
          watchdogController.abort();
        } catch (_) {}
      }, fetchTimeoutMs) : null;
      if (signal && watchdogController) {
        try {
          if (signal.aborted) watchdogController.abort();else signal.addEventListener('abort', () => {
            try {
              watchdogController.abort();
            } catch (_) {}
          }, {
            once: true
          });
        } catch (_) {}
      }
      const fetchSignal = watchdogController ? watchdogController.signal : signal || undefined;
      const rethrowWatchdog = err => {
        if (watchdogFired && err && err.name === 'AbortError') {
          return new Error('TTS Transient Error (timeout after ' + Math.round(fetchTimeoutMs / 1000) + 's)');
        }
        return err;
      };
      try {
        const taskResult = await (async () => {
          const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.tts}:generateContent`;
          const url = `${baseUrl}?key=${apiKey || ''}`;
          const decodeBase64 = base64 => {
            const binaryString = window.atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let j = 0; j < len; j++) bytes[j] = binaryString.charCodeAt(j);
            return bytes;
          };
          // Guard: callers can pass a missing field; undefined.length threw here and
          // was pointlessly retried. Normalize; empty text fails fast, non-retryable.
          text = text == null ? '' : String(text);
          if (!text.trim()) throw new Error('TTS Empty Text');
          let promptText = text.length <= 2 ? `Say the sound: ${text}` : text;
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
          if (language && typeof language === 'string' && language !== 'English') {
            promptText = `Pronounce the following ${language} text with native ${language} phonology: ${promptText}`;
          }
          const payload = {
            contents: [{
              parts: [{
                text: promptText
              }]
            }],
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
              ...(state.ttsTemperatureUnsupported ? {} : {
                temperature: 0.2
              }),
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: safeVoice
                  }
                }
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
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload),
              signal: fetchSignal
            });
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
                try {
                  window.__ttsGeminiAuthFailed = true;
                } catch (_) {}
                console.warn("[TTS]" + " cloud TTS key rejected — switching this session to the local voice.");
              }
              console.error("[TTS] API Error:", response.status, response.statusText, errorBody.substring(0, 200));
              throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            if (data.promptFeedback?.blockReason) throw new Error(`TTS Content Blocked: ${data.promptFeedback.blockReason}`);
            if (data.candidates?.[0]?.finishReason === 'OTHER') {
              warnLog("Gemini Model Refusal (finishReason: OTHER). Retrying with context...");
              if (text.length <= 5) {
                try {
                  const retryPayload = {
                    contents: [{
                      parts: [{
                        text: `Please say the word: ${text}`
                      }]
                    }],
                    generationConfig: {
                      responseModalities: ["AUDIO"],
                      ...(state.ttsTemperatureUnsupported ? {} : {
                        temperature: 0.2
                      }),
                      speechConfig: {
                        voiceConfig: {
                          prebuiltVoiceConfig: {
                            voiceName: safeVoice
                          }
                        }
                      }
                    }
                  };
                  const retryResponse = await fetch(url, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(retryPayload),
                    signal: fetchSignal
                  });
                  const retryData = await retryResponse.json();
                  const retryBase64 = retryData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                  if (retryBase64) {
                    debugLog("✅ TTS retry with context succeeded");
                    _noteGeminiSuccess();
                    return {
                      bytes: decodeBase64(retryBase64),
                      base64: retryBase64
                    };
                  }
                } catch (retryErr) {
                  warnLog("Retry with context also failed:", retryErr.message);
                }
              }
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
            return {
              bytes,
              base64: base64Audio
            };
          } catch (err) {
            console.warn("[TTS] Gemini TTS Fetch Error:", err.message);
            throw err;
          }
        })();
        _ttsTrace('fetch:ok', {
          ms: Date.now() - taskStartedAt,
          voice: safeVoice
        });
        return taskResult;
      } catch (taskError) {
        const mapped = rethrowWatchdog(taskError);
        _ttsTrace('fetch:fail', {
          ms: Date.now() - taskStartedAt,
          error: String(mapped && mapped.message || mapped).substring(0, 140),
          aborted: !!(mapped && mapped.name === 'AbortError')
        });
        throw mapped;
      } finally {
        if (watchdogTimer) clearTimeout(watchdogTimer);
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
    return queuedTask;
  };

  // ONE voice-prefix test and ONE local-TTS text cleaner for all four
  // routing sites (Canvas/non-Canvas x callTTS/callTTSDirect). The copies
  // had already drifted: the short chains lacked the Dr./Mr./decimal-point
  // pronunciation rules the Canvas chain applies.
  const KOKORO_VOICE_PREFIX = /^(af_|am_|bf_|bm_)/i;
  const cleanTextForLocalTTS = raw => String(raw == null ? '' : raw).replace(/^\s*\d+\.\s+/gm, '').replace(/^\s*[-*\u2022]\s+/gm, '').replace(/\be\.g\.\s/gi, 'for example ').replace(/\bi\.e\.\s/gi, 'that is ').replace(/\betc\.\s/gi, 'etcetera ').replace(/\bvs\.\s/gi, 'versus ').replace(/\bDr\.\s/gi, 'Doctor ').replace(/\bMr\.\s/gi, 'Mister ').replace(/\bMs\.\s/gi, 'Miss ').replace(/\bSt\.\s/gi, 'Saint ').replace(/(\d)\.\s+(\d)/g, '$1 point $2').replace(/\n{2,}/g, '. ').replace(/\n/g, ', ').replace(/\s{2,}/g, ' ').trim();
  // ── Spoken math pre-pass (2026-07-05) ──
  // Substitute delimited math ($x^2$, $$..$$, \(..\), \[..\]) with a spoken
  // rendering via Speech Rule Engine (sre_loader.js → window.AlloMathSpeech)
  // BEFORE the text forks to any synthesis leg — without this every engine
  // reads "dollar x caret two dollar". One shared pre-pass, same rationale
  // as cleanTextForLocalTTS (the per-leg copies drift). Fallback-safe: on
  // no-math / loader missing / SRE failure / timeout the original text is
  // returned untouched, so the worst case is exactly today's behaviour.
  const MATH_SEGMENT_RE = /\$\$([^$]{1,400}?)\$\$|\\\[([\s\S]{1,400}?)\\\]|\\\(([\s\S]{1,300}?)\\\)|\$([^$\n]{1,200}?)\$/g;
  // Currency guard: "$5 and $10" pairs into a bogus segment. Only treat a
  // segment as math when it carries a LaTeX command, super/subscript, or a
  // short equation — anything else stays verbatim (conservative by design).
  const _mathLooksReal = c => /\\[a-zA-Z]+|[\^_]/.test(c) || /=/.test(c) && c.length <= 80;
  const _mathToSpeakable = async (raw, language) => {
    try {
      const src = String(raw == null ? '' : raw);
      MATH_SEGMENT_RE.lastIndex = 0;
      if (!MATH_SEGMENT_RE.test(src)) return raw;
      if (!window.AlloMathSpeech && window.__alloLoadPlugin) {
        try {
          await window.__alloLoadPlugin('sre_loader.js');
        } catch (_) {}
      }
      if (!window.AlloMathSpeech || typeof window.AlloMathSpeech.toSpeech !== 'function') return raw;
      const jobs = [];
      src.replace(MATH_SEGMENT_RE, (m, disp, brk, par, inl, off) => {
        const body = (disp || brk || par || inl || '').trim();
        if (body && _mathLooksReal(body)) jobs.push({
          m,
          body,
          off
        });
        return m;
      });
      if (!jobs.length) return raw;
      const spoken = await Promise.all(jobs.map(j => window.AlloMathSpeech.toSpeech(j.body, {
        lang: language,
        timeoutMs: 6000
      })));
      let out = '';
      let cursor = 0;
      jobs.forEach((j, i) => {
        out += src.slice(cursor, j.off);
        out += spoken[i] && String(spoken[i]).trim() ? ' ' + String(spoken[i]).trim() + ' ' : j.m;
        cursor = j.off + j.m.length;
      });
      out += src.slice(cursor);
      return out;
    } catch (_) {
      return raw;
    }
  };
  // De-dupe identical, non-cancellable cloud requests that arrive before the
  // first one has populated urlCache (for example, karaoke playback racing a
  // look-ahead warm). Requests carrying an AbortSignal stay independent so
  // one caller can never cancel audio another caller is awaiting.
  const callTTSInFlight = new Map();
  const callTTS = async (text, voiceName, speed = 1, maxRetriesOrOpts = 2, languageArg) => {
    if (isGlobalMuted()) {
      _ttsTrace('calltts:muted', {
        text: String(text || '').substring(0, 48)
      });
      return null;
    }
    if (text == null || !String(text).trim()) {
      console.warn('[TTS] Skipped: empty text (a caller passed a missing field)');
      _ttsTrace('calltts:empty-text', null);
      return null;
    }
    voiceName = _resolveRequestedVoice(voiceName);
    var maxRetries = typeof maxRetriesOrOpts === 'number' ? maxRetriesOrOpts : maxRetriesOrOpts && typeof maxRetriesOrOpts.maxRetries === 'number' ? maxRetriesOrOpts.maxRetries : 2;
    var _callOpts = maxRetriesOrOpts && typeof maxRetriesOrOpts === 'object' ? maxRetriesOrOpts : {};
    // When the caller omits the language, resolve it from app state the
    // same way callTTSDirect does — defaulting to 'English' made Kokoro
    // speak Spanish glossary terms with English phonology (and cache it).
    var _language = languageArg || _callOpts.language || getLeveledTextLanguage() || getCurrentUiLanguage() || 'English';
    var _isEnglish = typeof _language === 'string' && /^english$/i.test(_language.trim());
    // Spoken math pre-pass (no-op unless delimited math is present)
    text = await _mathToSpeakable(text, _language);
    // Optional AbortSignal for per-call cancellation. AlloSpeechPlayer.stop()
    // aborts in-flight TTS so a fast click-to-stop doesn't keep burning the
    // Gemini quota for audio the user already cancelled. fetchTTSBytes
    // surfaces AbortError; we check it inside each catch and re-throw so
    // it propagates cleanly (no retry, no fallback) instead of being eaten.
    var _signal = _callOpts.signal || null;
    var _isAbortError = e => e && (e.name === 'AbortError' || /aborted/i.test(e.message || ''));
    _ttsTrace('calltts:start', {
      text: String(text || '').substring(0, 48),
      voice: String(voiceName || ''),
      lang: _language,
      maxRetries: maxRetries,
      priority: _callOpts.priority || 'normal',
      reason: _callOpts.reason || null,
      signal: !!_signal,
      canvas: !!_isCanvasEnv
    });
    // Canvas: Gemini TTS (primary, expressive, multilingual) → Kokoro/Piper (offline fallback)
    if (_isCanvasEnv) {
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
      const canvasCacheKey = (text || '').toLowerCase().trim() + '__' + voiceName + '__' + speed + '__' + (_language || 'English');
      if (!_isKokoroVoice && state.urlCache.has(canvasCacheKey)) {
        debugLog('callTTS Canvas cache HIT:', text?.substring(0, 30));
        _ttsTrace('calltts:cache-hit', {
          text: String(text || '').substring(0, 48),
          voice: voiceName
        });
        return state.urlCache.get(canvasCacheKey);
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
        _ttsTrace('calltts:canvas-skip-authfailed', {
          probeInMs: Math.max(0, (state.authRetryAt || 0) - Date.now())
        });
      } else if (Date.now() >= state.rateLimitedUntil) {
        // Honor the caller's retry budget here just as the non-Canvas
        // path does below. Karaoke deliberately uses 0 retries for
        // look-ahead and 1 retry for active playback; the former
        // hard-coded three attempts could add several seconds before
        // the learner heard the local/browser fallback.
        let canvasMaxAttempts = Math.max(1, (Number.isFinite(maxRetries) ? Math.max(0, Math.floor(maxRetries)) : 2) + 1);
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
          if (_signal) return fetchTTSBytes(text, voiceName, speed, _language, _signal, _callOpts.priority);
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
          if (!entry || isInteractive || entryAge > CALLTTS_JOIN_MAX_AGE_MS) {
            if (entry && entryAge > CALLTTS_JOIN_MAX_AGE_MS) {
              _ttsTrace('calltts:inflight-stale-replaced', {
                text: String(text || '').substring(0, 48),
                ageMs: entryAge
              });
            }
            entry = {
              promise: fetchTTSBytes(text, voiceName, speed, _language, null, _callOpts.priority),
              startedAt: Date.now()
            };
            callTTSInFlight.set(canvasCacheKey, entry);
          } else {
            debugLog('callTTS Canvas in-flight JOIN:', text?.substring(0, 30));
            _ttsTrace('calltts:inflight-join', {
              text: String(text || '').substring(0, 48)
            });
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
              if (state.urlCache.has(canvasCacheKey)) return state.urlCache.get(canvasCacheKey);
              const {
                bytes: pcmBytes
              } = ttsResult;
              const wavBuffer = pcmToWav(pcmBytes);
              const blob = new Blob([wavBuffer], {
                type: 'audio/wav'
              });
              const url = URL.createObjectURL(blob);
              _cacheSet(canvasCacheKey, url);
              console.log('[Canvas TTS] ✅ Gemini TTS succeeded!');
              return url;
            }
            throw new Error('fetchTTSBytes returned empty result');
          } catch (e) {
            canvasLastErr = e;
            const msg = e?.message || '';
            _ttsTrace('calltts:canvas-attempt-fail', {
              attempt: canvasAttempt + 1,
              of: canvasMaxAttempts,
              error: String(msg).substring(0, 140)
            });
            if (_isAbortError(e)) {
              throw e;
            } // caller cancelled — exit cascade
            if (msg.includes('429') || msg.includes('Rate Limited')) {
              state.rateLimitedUntil = Date.now() + 60000;
              window.__ttsGeminiQuotaFailed = true;
              console.error('[Canvas TTS] ❌ Rate limited, falling back to local:', msg);
              break;
            }
            if (msg.includes('Missing API Key')) {
              window.__ttsGeminiAuthFailed = true;
              console.error('[Canvas TTS] ❌ Missing API key, falling back to local:', msg);
              break;
            }
            const isTransient = msg.includes('401') || msg.includes('403') || msg.includes('503') || msg.includes('model refused') || msg.includes('Transient Error') || msg.includes('empty result');
            if (isTransient && canvasAttempt < canvasMaxAttempts - 1) {
              const backoffMs = 800 * Math.pow(2, canvasAttempt);
              console.warn(`[Canvas TTS] Transient error "${msg}" — retrying in ${backoffMs}ms (attempt ${canvasAttempt + 2}/${canvasMaxAttempts})`);
              await new Promise(r => setTimeout(r, backoffMs));
              continue;
            }
            console.error('[Canvas TTS] ❌ Gemini TTS failed after retries, falling back to local:', msg);
            if (msg.includes('401') || msg.includes('403') || msg.includes('API key')) {
              window.__ttsGeminiAuthFailed = true;
            }
            break;
          }
        }
      } else {
        console.warn('[Canvas TTS] Gemini rate-limited, using local fallback');
        _ttsTrace('calltts:rate-limit-cooldown', {
          untilMs: Math.max(0, state.rateLimitedUntil - Date.now())
        });
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
      const ttsLang = languageToTTSCode(getLeveledTextLanguage() || getCurrentUiLanguage() || 'English');
      if (ttsLang === 'en') {
        try {
          if (window._kokoroTTS) {
            // callTTS promises one COMPLETE playable URL. The streaming
            // API returns only its first chunk and requires chainPlay,
            // which karaoke and most read-aloud callers do not use.
            // Kokoro only knows its own voice ids — a Gemini name
            // ('Kore') passed through raw made the engine return
            // nothing, SILENTLY, while ready (field log 2026-07-20).
            const kokoroVoice = _kokoroVoicePrefix.test(String(voiceName || '')) ? voiceName : 'af_heart';
            const url = await Promise.race([window._kokoroTTS.speak(localTtsText, kokoroVoice, speed), new Promise((_, reject) => setTimeout(() => reject(new Error('kokoro fallback timeout (60s)')), 60000))]);
            if (url) {
              _ttsTrace('calltts:kokoro-fallback-ok', {
                voice: kokoroVoice
              });
              return url;
            }
            _ttsTrace('calltts:kokoro-fallback-empty', {
              voice: kokoroVoice
            });
          }
        } catch (e) {
          console.warn('[Canvas TTS] Kokoro fallback failed:', e?.message);
          _ttsTrace('calltts:kokoro-fallback-fail', {
            error: String(e?.message || e).substring(0, 100)
          });
        }
        try {
          if (window._piperTTS) {
            const url = await window._piperTTS.speak(localTtsText, 'en', speed);
            if (url) {
              _ttsTrace('calltts:piper-fallback-ok', null);
              return url;
            }
          }
        } catch (e) {
          console.warn('[Canvas TTS] Piper en fallback failed:', e?.message);
          _ttsTrace('calltts:piper-fallback-fail', {
            error: String(e?.message || e).substring(0, 100)
          });
        }
      } else {
        try {
          if (window._piperTTS && window._piperTTS.supportsLanguage(ttsLang)) {
            const url = await window._piperTTS.speak(localTtsText, ttsLang, speed);
            if (url) {
              _ttsTrace('calltts:piper-fallback-ok', {
                lang: ttsLang
              });
              return url;
            }
          }
        } catch (e) {
          console.warn('[Canvas TTS] Piper', ttsLang, 'fallback failed:', e?.message);
          _ttsTrace('calltts:piper-fallback-fail', {
            lang: ttsLang,
            error: String(e?.message || e).substring(0, 100)
          });
        }
      }
      // Nothing on the Canvas cascade produced audio: the caller will
      // fall back to the device/browser voice. Record WHY we got here.
      _ttsTrace('calltts:canvas-null', {
        text: String(text || '').substring(0, 48),
        lastError: canvasLastErr ? String(canvasLastErr.message || canvasLastErr).substring(0, 140) : null,
        quotaFailed: !!window.__ttsGeminiQuotaFailed,
        authFailed: !!window.__ttsGeminiAuthFailed
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
      try {
        window.__ttsLastRoute = {
          at: Date.now(),
          fn: 'callTTS',
          voice: String(voiceName || ''),
          route: route,
          detail: detail || ''
        };
      } catch (_) {}
      // Same breadcrumb, durable form: the Setup Health card shows only
      // the LAST route; the trace keeps the sequence for diagnostics.
      _ttsTrace('route:' + route, {
        voice: String(voiceName || ''),
        detail: detail || ''
      });
    };
    // Keyless installs have NO usable cloud voice: once the local engine is
    // ready it should serve EVERY voice name (the engine's resolveVoice maps
    // Gemini names like 'Kore' to Kokoro equivalents). Without this, any
    // stale cloud voice name in storage pinned keyless users to the browser
    // voice even with a ready engine. Explicit 'browser' choice and
    // provider-managed TTS (Edge/off) are respected.
    var _cfgTtsEarly = getAiUserConfig();
    var _provTtsEarly = _cfgTtsEarly && _cfgTtsEarly.ttsProvider || 'auto';
    var _provIsLocalAI = !!(_cfgTtsEarly && (_cfgTtsEarly.backend === 'ollama' || _cfgTtsEarly.backend === 'localai'));
    // 'local' does NOT block Kokoro (field-caught 2026-07-06, the last bug
    // of the batch): the "Local TTS" setting predates the in-browser
    // engine and pointed only at self-hosted Kokoro-FastAPI (:8880) /
    // Edge-TTS (:5500) servers a desktop install doesn't run — picking
    // "Local TTS" ironically skipped the REAL local voice and landed on
    // the browser fallback. The in-browser engine is now the FIRST leg of
    // that cascade; the provider servers stay second for setups that run them.
    var _providerHandlesTts = _provTtsEarly === 'browser' || _provTtsEarly === 'off' || _provTtsEarly === 'auto' && _provIsLocalAI;
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
          const kokoroUrl = await window._kokoroTTS.speak(cleanTextForLocalTTS(text), voiceName, speed);
          if (kokoroUrl) {
            _routeNote('kokoro', _kokoroPreferred ? 'kokoro voice selected' : 'keyless reroute');
            return kokoroUrl;
          }
          _routeNote('kokoro-empty', 'engine returned no audio');
          _kokoroDeferredToGemini = true; // engine returned nothing
        } catch (e) {
          if (_isAbortError(e)) {
            throw e;
          }
          console.warn('[TTS] Kokoro engine failed — deferring to provider/cloud voices:', e?.message);
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
          Promise.resolve(window.__loadKokoroTTS()).then(function () {
            window.__kokoroTTSDownloading = false;
          }, function () {
            window.__kokoroTTSDownloading = false;
          });
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

    // ─── AIProvider TTS routing ───────────────────────────────────
    const _aiUserConfig = getAiUserConfig();
    const _ai = getAi();
    const _ttsOvr = _aiUserConfig?.ttsProvider || 'auto';
    const _isLocalAI = _aiUserConfig?.backend === 'ollama' || _aiUserConfig?.backend === 'localai';
    if (_ttsOvr === 'local' || _ttsOvr === 'browser' || _ttsOvr === 'off' || _ttsOvr === 'auto' && _isLocalAI) {
      try {
        const result = await _ai.textToSpeech(text, {
          voice: voiceName,
          speed
        });
        _routeNote('provider', 'ttsProvider=' + _ttsOvr);
        return result;
      } catch (e) {
        console.warn('[callTTS] AIProvider TTS failed, falling back to Gemini:', e?.message);
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
    const cacheKey = `${(text || '').toLowerCase().trim()}__${voiceName}__${speed}__${_language || 'English'}`;
    if (state.urlCache.has(cacheKey)) {
      debugLog("⚡ callTTS cache HIT:", text?.substring(0, 30));
      return state.urlCache.get(cacheKey);
    }
    const fetchSharedTTSBytes = async () => {
      if (_signal) return fetchTTSBytes(text, voiceName, speed, _language, _signal, _callOpts.priority);
      // Same zombie-protection as the Canvas branch: interactive callers
      // never join, background callers never join a stale entry.
      const isInteractive = _callOpts.priority === 'interactive';
      let entry = callTTSInFlight.get(cacheKey);
      const entryAge = entry ? Date.now() - entry.startedAt : 0;
      if (!entry || isInteractive || entryAge > CALLTTS_JOIN_MAX_AGE_MS) {
        entry = {
          promise: fetchTTSBytes(text, voiceName, speed, _language, null, _callOpts.priority),
          startedAt: Date.now()
        };
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
        if (!ttsResult) {
          throw new Error("[TTS] fetchTTSBytes returned no audio data");
        }
        // The owner of a joined request may already have cached its URL.
        if (state.urlCache.has(cacheKey)) return state.urlCache.get(cacheKey);
        const {
          bytes: pcmBytes
        } = ttsResult;
        const wavBuffer = pcmToWav(pcmBytes);
        const blob = new Blob([wavBuffer], {
          type: 'audio/wav'
        });
        const url = URL.createObjectURL(blob);
        _cacheSet(cacheKey, url);
        return url;
      } catch (e) {
        lastError = e;
        if (_isAbortError(e)) {
          throw e;
        } // caller cancelled — no retry
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
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    warnLog("[TTS] All retries exhausted for:", text?.substring(0, 30), lastError?.message);
    throw lastError;
  };
  const callTTSDirect = async (text, voiceName, speed = 1, maxRetries = 2) => {
    if (isGlobalMuted()) return null;
    if (text == null || !String(text).trim()) {
      console.warn('[TTS] Skipped: empty text');
      return null;
    }
    // Spoken math pre-pass (no-op unless delimited math is present)
    text = await _mathToSpeakable(text, getLeveledTextLanguage() || getCurrentUiLanguage() || 'English');
    voiceName = _resolveRequestedVoice(voiceName);
    // ─── Canvas: Gemini TTS first → Kokoro/Piper fallback (same cascade as callTTS) ─────
    if (_isCanvasEnv) {
      if (Date.now() >= state.rateLimitedUntil) {
        // Match callTTS's Canvas resilience (field-caught 2026-07-06): the
        // Canvas proxy rotates auth tokens fast enough that a request can
        // transiently 401/503, and the generative TTS model occasionally
        // refuses a short bot line. This path had NO retry (unlike callTTS),
        // so a single blip dropped AlloBot straight to the browser voice
        // even though Gemini was available — the "sometimes browser TTS"
        // regression. Retry transient errors before giving up.
        const botCanvasMaxAttempts = 3;
        for (let botAttempt = 0; botAttempt < botCanvasMaxAttempts; botAttempt++) {
          try {
            const botCanvasGeminiVoice = _resolveGeminiVoice(voiceName);
            const ttsResult = await fetchTTSBytes(text, botCanvasGeminiVoice, speed);
            if (ttsResult) {
              const {
                bytes: pcmBytes
              } = ttsResult;
              const wavBuffer = pcmToWav(pcmBytes);
              const blob = new Blob([wavBuffer], {
                type: 'audio/wav'
              });
              return URL.createObjectURL(blob);
            }
            throw new Error('fetchTTSBytes returned empty result');
          } catch (e) {
            const msg = e?.message || '';
            if (msg.includes('429') || msg.includes('Rate Limited')) {
              state.rateLimitedUntil = Date.now() + 60000;
              console.warn('[callTTSDirect] Gemini rate-limited — falling back to local:', msg);
              break;
            }
            const isTransient = msg.includes('401') || msg.includes('403') || msg.includes('503') || msg.includes('model refused') || msg.includes('Transient Error') || msg.includes('empty result');
            if (isTransient && botAttempt < botCanvasMaxAttempts - 1) {
              const backoffMs = 800 * Math.pow(2, botAttempt);
              console.warn(`[callTTSDirect] Transient Gemini error "${msg}" — retrying in ${backoffMs}ms (attempt ${botAttempt + 2}/${botCanvasMaxAttempts})`);
              await new Promise(r => setTimeout(r, backoffMs));
              continue;
            }
            console.warn('[callTTSDirect] Gemini TTS failed after retries, falling back to local:', msg);
            break;
          }
        }
      }
      const ttsLang = languageToTTSCode(getLeveledTextLanguage() || getCurrentUiLanguage() || 'English');
      const cleanedText = cleanTextForLocalTTS(text);
      if (ttsLang === 'en') {
        try {
          if (window._kokoroTTS) {
            const url = await window._kokoroTTS.speakStreaming(cleanedText, voiceName, speed);
            if (url) return url;
          }
        } catch (e) {
          console.warn('[callTTSDirect] Kokoro failed:', e?.message);
        }
        try {
          if (window._piperTTS) {
            const url = await window._piperTTS.speak(cleanedText, 'en', speed);
            if (url) return url;
          }
        } catch (e) {
          console.warn('[callTTSDirect] Piper en fallback failed:', e?.message);
        }
      } else {
        try {
          if (window._piperTTS && window._piperTTS.supportsLanguage(ttsLang)) {
            const url = await window._piperTTS.speak(cleanedText, ttsLang, speed);
            if (url) return url;
          }
        } catch (e) {
          console.warn('[callTTSDirect] Piper', ttsLang, 'failed:', e?.message);
        }
      }
      return null;
    }
    // ─── Desktop/Firebase: selected Kokoro voice → local engine (same fix as callTTS) ───
    var _routeNoteBot = function (route, detail) {
      try {
        window.__ttsLastRoute = {
          at: Date.now(),
          fn: 'callTTSDirect',
          voice: String(voiceName || ''),
          route: route,
          detail: detail || ''
        };
      } catch (_) {}
    };
    // Keyless: the local engine serves ANY bot voice name once ready
    // (resolveVoice maps Gemini names) — same reroute as callTTS.
    var _botCfgTts = getAiUserConfig();
    var _botProvTts = _botCfgTts && _botCfgTts.ttsProvider || 'auto';
    var _botProvLocalAI = !!(_botCfgTts && (_botCfgTts.backend === 'ollama' || _botCfgTts.backend === 'localai'));
    // Same as callTTS: ttsProvider 'local' PREFERS the in-browser engine
    // (first cascade leg), never blocks it.
    var _botProviderHandles = _botProvTts === 'browser' || _botProvTts === 'off' || _botProvTts === 'auto' && _botProvLocalAI;
    var _botKokoroEligible = typeof voiceName === 'string' && KOKORO_VOICE_PREFIX.test(voiceName) || _botProvTts === 'local' && typeof voiceName === 'string' && voiceName !== 'browser' || !_isCanvasEnv && !_cloudKeyUsable() && !_botProviderHandles && typeof voiceName === 'string' && voiceName !== 'browser';
    if (_botKokoroEligible) {
      const botKokoroLang = languageToTTSCode(getLeveledTextLanguage() || getCurrentUiLanguage() || 'English');
      if (botKokoroLang === 'en' && window._kokoroTTS && window._kokoroTTS.ready) {
        try {
          const kokoroBotUrl = await window._kokoroTTS.speakStreaming(cleanTextForLocalTTS(text), voiceName, speed);
          if (kokoroBotUrl) {
            _routeNoteBot('kokoro');
            return kokoroBotUrl;
          }
        } catch (e) {
          console.warn('[callTTSDirect] Kokoro engine failed — deferring to provider/cloud:', e?.message);
          _routeNoteBot('kokoro-failed', e?.message);
        }
      } else if (botKokoroLang === 'en' && window._isDesktopBundledApp) {
        // Missing or never-ready engine: background (re)init, same as
        // callTTS — a failed first init otherwise pins every bot line
        // to the browser voice with no path back to Kokoro. Desktop
        // only: off-desktop the engine never downloads without an
        // explicit user action (same policy as callTTS above).
        if (window.__loadKokoroTTS && !window.__kokoroTTSDownloading) {
          window.__kokoroTTSDownloading = true;
          Promise.resolve(window.__loadKokoroTTS()).then(function () {
            window.__kokoroTTSDownloading = false;
          }, function () {
            window.__kokoroTTSDownloading = false;
          });
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
    const _isLocalAIBot = _aiUserConfig?.backend === 'ollama' || _aiUserConfig?.backend === 'localai';
    if (_ttsOvrBot === 'local' || _ttsOvrBot === 'browser' || _ttsOvrBot === 'off' || _ttsOvrBot === 'auto' && _isLocalAIBot) {
      try {
        return await _ai.textToSpeech(text, {
          voice: voiceName,
          speed
        });
      } catch (e) {
        console.warn('[callTTSDirect] AIProvider TTS failed, falling back to Gemini:', e?.message);
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
    console.log("[TTS-Bot] 🎤 callTTSDirect called:", {
      text: text?.substring(0, 40),
      voice: safeVoice,
      speed
    });
    const cacheKey = `${(text || '').toLowerCase().trim()}__${safeVoice}__${speed}`;
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
          await new Promise(r => setTimeout(r, backoffDelay));
        }
        const queuedTask = state.botQueue.then(async () => {
          console.log("[TTS-Bot] 🔄 Queue slot acquired, making API call...");
          const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.tts}:generateContent`;
          const url = `${baseUrl}${apiKey ? `?key=${apiKey}` : ''}`;
          const decodeBase64 = base64 => {
            const binaryString = window.atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let j = 0; j < len; j++) bytes[j] = binaryString.charCodeAt(j);
            return bytes;
          };
          const payload = {
            contents: [{
              parts: [{
                text: (text.length > 10 ? 'Read the following text aloud naturally, do not perform sound effects or noises: ' : '') + text
              }]
            }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              ...(state.ttsTemperatureUnsupported ? {} : {
                temperature: 0.7
              }),
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: safeVoice
                  }
                }
              }
            }
          };
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
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
              try {
                window.__ttsGeminiAuthFailed = true;
              } catch (_) {}
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
          return {
            bytes,
            base64: base64Audio
          };
        });
        state.botQueue = queuedTask.catch(() => {});
        const ttsResult = await queuedTask;
        if (!ttsResult) {
          throw new Error("[TTS-Bot] fetchTTSBytes returned no audio data");
        }
        const {
          bytes: pcmBytes
        } = ttsResult;
        const wavBuffer = pcmToWav(pcmBytes);
        const blob = new Blob([wavBuffer], {
          type: 'audio/wav'
        });
        const url = URL.createObjectURL(blob);
        _cacheSet(cacheKey, url);
        console.log("[TTS-Bot] ✅ Bot speech generated via dedicated queue for:", text?.substring(0, 30));
        return url;
      } catch (e) {
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
  return {
    fetchTTSBytes,
    callTTS,
    callTTSDirect
  };
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
})();
