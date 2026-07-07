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
    // React callback
    setShowKokoroOfferModal
  } = deps;

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
  const fetchTTSBytes = (text, voiceName = "Puck", speed = 1, language = 'English', signal = null) => {
    // Defensive: ensure voiceName is a valid Gemini voice, fall back to Puck if not
    const safeVoice = AVAILABLE_VOICES.map(v => v.toLowerCase()).includes((voiceName || '').toLowerCase()) ? voiceName : 'Puck';
    if (safeVoice !== voiceName) console.warn(`[TTS] Voice "${voiceName}" is not a valid Gemini voice. Falling back to "${safeVoice}".`);
    debugLog("[fetchTTSBytes] text:", text?.substring(0, 30), "lang:", language);
    const queuedTask = state.queue.then(async () => {
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
          signal: signal || undefined
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
                signal: signal || undefined
              });
              const retryData = await retryResponse.json();
              const retryBase64 = retryData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
              if (retryBase64) {
                debugLog("✅ TTS retry with context succeeded");
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
        // Inter-request breathing room — the Word Sounds preload fires 10+
        // TTS requests back-to-back through this queue, and the Canvas proxy
        // rotates auth tokens fast enough that a request can land mid-
        // rotation and come back 401. A small post-call delay (150ms) gives
        // the proxy time to settle before the next serialized fetch starts.
        await new Promise(r => setTimeout(r, 150));
        return {
          bytes,
          base64: base64Audio
        };
      } catch (err) {
        console.warn("[TTS] Gemini TTS Fetch Error:", err.message);
        throw err;
      }
    });
    state.queue = queuedTask.catch(() => {});
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
  const callTTS = async (text, voiceName = "Puck", speed = 1, maxRetriesOrOpts = 2, languageArg) => {
    if (isGlobalMuted()) {
      return null;
    }
    if (text == null || !String(text).trim()) {
      console.warn('[TTS] Skipped: empty text (a caller passed a missing field)');
      return null;
    }
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
    // Canvas: Gemini TTS (primary, expressive, multilingual) → Kokoro/Piper (offline fallback)
    if (_isCanvasEnv) {
      var _kokoroVoicePrefix = /^(af_|am_|bf_|bm_)/i;
      var _isKokoroVoice = typeof voiceName === 'string' && _kokoroVoicePrefix.test(voiceName);
      if (_isKokoroVoice && !_isEnglish) {
        console.log('[TTS] Kokoro voice "' + voiceName + '" cannot pronounce ' + _language + ' — switching to Gemini "Puck" for this call');
        voiceName = 'Puck';
        _isKokoroVoice = false;
      }
      if (_isKokoroVoice) {
        console.log('[Canvas TTS] Kokoro voice selected (' + voiceName + ') — skipping Gemini, using Kokoro directly');
      }
      if (_isKokoroVoice) {
        // Intentional fall-through to Kokoro/Piper block below.
      } else if (Date.now() >= state.rateLimitedUntil) {
        const canvasMaxAttempts = 3;
        let canvasLastErr = null;
        for (let canvasAttempt = 0; canvasAttempt < canvasMaxAttempts; canvasAttempt++) {
          try {
            console.log(`[Canvas TTS] Attempting Gemini TTS${canvasAttempt > 0 ? ` (retry ${canvasAttempt})` : ''} for:`, text?.substring(0, 40), 'voice:', voiceName);
            const ttsResult = await fetchTTSBytes(text, voiceName, speed, _language, _signal);
            console.log('[Canvas TTS] fetchTTSBytes result:', ttsResult ? 'got audio (' + (ttsResult.bytes?.length || 0) + ' bytes)' : 'null');
            if (ttsResult) {
              const {
                bytes: pcmBytes
              } = ttsResult;
              const wavBuffer = pcmToWav(pcmBytes);
              const blob = new Blob([wavBuffer], {
                type: 'audio/wav'
              });
              const url = URL.createObjectURL(blob);
              const cacheKey = `${(text || '').toLowerCase().trim()}__${voiceName}__${speed}`;
              state.urlCache.set(cacheKey, url);
              console.log('[Canvas TTS] ✅ Gemini TTS succeeded!');
              return url;
            }
            throw new Error('fetchTTSBytes returned empty result');
          } catch (e) {
            canvasLastErr = e;
            const msg = e?.message || '';
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
            const url = await window._kokoroTTS.speakStreaming(localTtsText, voiceName, speed);
            if (url) return url;
          }
        } catch (e) {
          console.warn('[Canvas TTS] Kokoro fallback failed:', e?.message);
        }
        try {
          if (window._piperTTS) {
            const url = await window._piperTTS.speak(localTtsText, 'en', speed);
            if (url) return url;
          }
        } catch (e) {
          console.warn('[Canvas TTS] Piper en fallback failed:', e?.message);
        }
      } else {
        try {
          if (window._piperTTS && window._piperTTS.supportsLanguage(ttsLang)) {
            const url = await window._piperTTS.speak(localTtsText, ttsLang, speed);
            if (url) return url;
          }
        } catch (e) {
          console.warn('[Canvas TTS] Piper', ttsLang, 'fallback failed:', e?.message);
        }
      }
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
          const kokoroUrl = await window._kokoroTTS.speakStreaming(cleanTextForLocalTTS(text), voiceName, speed);
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
      } else {
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
      console.warn('[TTS] Kokoro voice unavailable for this call — using Gemini "Puck"');
      voiceName = 'Puck';
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
    const cacheKey = `${(text || '').toLowerCase().trim()}__${voiceName}__${speed}__${_language || 'English'}`;
    if (state.urlCache.has(cacheKey)) {
      debugLog("⚡ callTTS cache HIT:", text?.substring(0, 30));
      return state.urlCache.get(cacheKey);
    }
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const ttsResult = await fetchTTSBytes(text, voiceName, speed, _language, _signal);
        if (!ttsResult) {
          throw new Error("[TTS] fetchTTSBytes returned no audio data");
        }
        const {
          bytes: pcmBytes
        } = ttsResult;
        const wavBuffer = pcmToWav(pcmBytes);
        const blob = new Blob([wavBuffer], {
          type: 'audio/wav'
        });
        const url = URL.createObjectURL(blob);
        state.urlCache.set(cacheKey, url);
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
  const callTTSDirect = async (text, voiceName = "Puck", speed = 1, maxRetries = 2) => {
    if (isGlobalMuted()) return null;
    if (text == null || !String(text).trim()) {
      console.warn('[TTS] Skipped: empty text');
      return null;
    }
    // Spoken math pre-pass (no-op unless delimited math is present)
    text = await _mathToSpeakable(text, getLeveledTextLanguage() || getCurrentUiLanguage() || 'English');
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
            const ttsResult = await fetchTTSBytes(text, voiceName, speed);
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
      } else if (botKokoroLang === 'en') {
        // Missing or never-ready engine: background (re)init, same as
        // callTTS — a failed first init otherwise pins every bot line
        // to the browser voice with no path back to Kokoro.
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
      // (Kokoro-FastAPI); the safeVoice guard below already maps any
      // non-Gemini voice to 'Puck' for the Gemini fallback leg.
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
    const safeVoice = AVAILABLE_VOICES.map(v => v.toLowerCase()).includes((voiceName || '').toLowerCase()) ? voiceName : 'Puck';
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
        state.urlCache.set(cacheKey, url);
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
