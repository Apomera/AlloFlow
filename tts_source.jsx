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
        pcmToWav, languageToTTSCode, isGlobalMuted,
        warnLog, debugLog,
        // Dynamic getters for React-state-dependent values
        getLeveledTextLanguage, getCurrentUiLanguage, getAiUserConfig, getAi,
        // React callback
        setShowKokoroOfferModal,
    } = deps;

    const fetchTTSBytes = (text, voiceName = "Puck", speed = 1, language = 'English') => {
        // Defensive: ensure voiceName is a valid Gemini voice, fall back to Puck if not
        const safeVoice = AVAILABLE_VOICES.map(v => v.toLowerCase()).includes((voiceName || '').toLowerCase()) ? voiceName : 'Puck';
        if (safeVoice !== voiceName) console.warn(`[TTS] Voice "${voiceName}" is not a valid Gemini voice. Falling back to "${safeVoice}".`);
        debugLog("[fetchTTSBytes] text:", text?.substring(0, 30), "lang:", language);
        const queuedTask = state.queue.then(async () => {
            const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.tts}:generateContent`;
            const url = `${baseUrl}?key=${apiKey || ''}`;
            const decodeBase64 = (base64) => {
                 const binaryString = window.atob(base64);
                 const len = binaryString.length;
                 const bytes = new Uint8Array(len);
                 for (let j = 0; j < len; j++) bytes[j] = binaryString.charCodeAt(j);
                 return bytes;
            };
            let promptText = text.length <= 2 ? `Say the sound: ${text}` : text;
            promptText = promptText.replace(/^\s*\d+\.\s+/gm, '');
            promptText = promptText.replace(/^\s*[-*•]\s+/gm, '');
            promptText = promptText.replace(/\n{2,}/g, '. ');
            promptText = promptText.replace(/\n/g, ', ');
            promptText = promptText.replace(/\s{2,}/g, ' ').trim();
            if (language && typeof language === 'string' && language !== 'English') {
                promptText = `Pronounce the following ${language} text with native ${language} phonology: ${promptText}`;
            }
            const payload = {
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: safeVoice } }
                }
              }
            };
            try {
              const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
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
                              contents: [{ parts: [{ text: `Please say the word: ${text}` }] }],
                              generationConfig: {
                                  responseModalities: ["AUDIO"],
                                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: safeVoice } } }
                              }
                          };
                          const retryResponse = await fetch(url, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(retryPayload)
                          });
                          const retryData = await retryResponse.json();
                          const retryBase64 = retryData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                          if (retryBase64) {
                              debugLog("✅ TTS retry with context succeeded");
                              return { bytes: decodeBase64(retryBase64), base64: retryBase64 };
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
              return { bytes, base64: base64Audio };
            } catch (err) {
              console.warn("[TTS] Gemini TTS Fetch Error:", err.message);
              throw err;
            }
        });
        state.queue = queuedTask.catch(() => {});
        return queuedTask;
    };

    const callTTS = async (text, voiceName = "Puck", speed = 1, maxRetriesOrOpts = 2, languageArg) => {
        if (isGlobalMuted()) {
            return null;
        }
        var maxRetries = typeof maxRetriesOrOpts === 'number' ? maxRetriesOrOpts
            : (maxRetriesOrOpts && typeof maxRetriesOrOpts.maxRetries === 'number' ? maxRetriesOrOpts.maxRetries : 2);
        var _callOpts = (maxRetriesOrOpts && typeof maxRetriesOrOpts === 'object') ? maxRetriesOrOpts : {};
        var _language = languageArg || _callOpts.language || 'English';
        var _isEnglish = typeof _language === 'string' && /^english$/i.test(_language.trim());
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
                        const ttsResult = await fetchTTSBytes(text, voiceName, speed, _language);
                        console.log('[Canvas TTS] fetchTTSBytes result:', ttsResult ? 'got audio (' + (ttsResult.bytes?.length || 0) + ' bytes)' : 'null');
                        if (ttsResult) {
                            const { bytes: pcmBytes } = ttsResult;
                            const wavBuffer = pcmToWav(pcmBytes);
                            const blob = new Blob([wavBuffer], { type: 'audio/wav' });
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
                        const isTransient = msg.includes('401') || msg.includes('403') || msg.includes('503')
                            || msg.includes('model refused') || msg.includes('Transient Error')
                            || msg.includes('empty result');
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
            const localTtsText = text
              .replace(/^\s*\d+\.\s+/gm, '')
              .replace(/^\s*[-*•]\s+/gm, '')
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
            const ttsLang = languageToTTSCode(getLeveledTextLanguage() || getCurrentUiLanguage() || 'English');
            if (ttsLang === 'en') {
                try {
                    if (window._kokoroTTS) {
                        const url = await window._kokoroTTS.speakStreaming(localTtsText, voiceName, speed);
                        if (url) return url;
                    }
                } catch (e) { console.warn('[Canvas TTS] Kokoro fallback failed:', e?.message); }
                try {
                    if (window._piperTTS) {
                        const url = await window._piperTTS.speak(localTtsText, 'en', speed);
                        if (url) return url;
                    }
                } catch (e) { console.warn('[Canvas TTS] Piper en fallback failed:', e?.message); }
            } else {
                try {
                    if (window._piperTTS && window._piperTTS.supportsLanguage(ttsLang)) {
                        const url = await window._piperTTS.speak(localTtsText, ttsLang, speed);
                        if (url) return url;
                    }
                } catch (e) { console.warn('[Canvas TTS] Piper', ttsLang, 'fallback failed:', e?.message); }
            }
            return null;
        }
        // ─── AIProvider TTS routing ───────────────────────────────────
        const _aiUserConfig = getAiUserConfig();
        const _ai = getAi();
        const _ttsOvr = _aiUserConfig?.ttsProvider || 'auto';
        const _isLocalAI = (_aiUserConfig?.backend === 'ollama' || _aiUserConfig?.backend === 'localai');
        if (_ttsOvr === 'local' || _ttsOvr === 'browser' || _ttsOvr === 'off' || (_ttsOvr === 'auto' && _isLocalAI)) {
            try {
                const result = await _ai.textToSpeech(text, { voice: voiceName, speed });
                return result;
            } catch (e) {
                console.warn('[callTTS] AIProvider TTS failed, falling back to Gemini:', e?.message);
            }
        }
        if (Date.now() < state.rateLimitedUntil) {
            console.warn("[TTS] Skipping — global rate-limit cooldown active for", Math.round((state.rateLimitedUntil - Date.now()) / 1000), "more seconds");
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
                const ttsResult = await fetchTTSBytes(text, voiceName, speed, _language);
                if (!ttsResult) { throw new Error("[TTS] fetchTTSBytes returned no audio data"); }
                const { bytes: pcmBytes } = ttsResult;
                const wavBuffer = pcmToWav(pcmBytes);
                const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                state.urlCache.set(cacheKey, url);
                return url;
            } catch (e) {
                lastError = e;
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
        // ─── Canvas: Gemini TTS first → Kokoro/Piper fallback (same cascade as callTTS) ─────
        if (_isCanvasEnv) {
            if (Date.now() >= state.rateLimitedUntil) {
                try {
                    const ttsResult = await fetchTTSBytes(text, voiceName, speed);
                    if (ttsResult) {
                        const { bytes: pcmBytes } = ttsResult;
                        const wavBuffer = pcmToWav(pcmBytes);
                        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                        return URL.createObjectURL(blob);
                    }
                } catch (e) {
                    console.warn('[callTTSDirect] Gemini TTS failed, falling back to local:', e?.message);
                    if (e?.message?.includes('429') || e?.message?.includes('Rate Limited')) {
                        state.rateLimitedUntil = Date.now() + 60000;
                    }
                }
            }
            const ttsLang = languageToTTSCode(getLeveledTextLanguage() || getCurrentUiLanguage() || 'English');
            const cleanedText = text.replace(/^\s*\d+\.\s+/gm, '').replace(/^\s*[-*•]\s+/gm, '').replace(/\be\.g\.\s/gi, 'for example ').replace(/\bi\.e\.\s/gi, 'that is ').replace(/\n{2,}/g, '. ').replace(/\n/g, ', ').replace(/\s{2,}/g, ' ').trim();
            if (ttsLang === 'en') {
                try {
                    if (window._kokoroTTS) {
                        const url = await window._kokoroTTS.speakStreaming(cleanedText, voiceName, speed);
                        if (url) return url;
                    }
                } catch (e) { console.warn('[callTTSDirect] Kokoro failed:', e?.message); }
                try {
                    if (window._piperTTS) {
                        const url = await window._piperTTS.speak(cleanedText, 'en', speed);
                        if (url) return url;
                    }
                } catch (e) { console.warn('[callTTSDirect] Piper en fallback failed:', e?.message); }
            } else {
                try {
                    if (window._piperTTS && window._piperTTS.supportsLanguage(ttsLang)) {
                        const url = await window._piperTTS.speak(cleanedText, ttsLang, speed);
                        if (url) return url;
                    }
                } catch (e) { console.warn('[callTTSDirect] Piper', ttsLang, 'failed:', e?.message); }
            }
            return null;
        }
        // ─── AIProvider TTS routing (same as callTTS) ─────────────────
        const _aiUserConfig = getAiUserConfig();
        const _ai = getAi();
        const _ttsOvrBot = _aiUserConfig?.ttsProvider || 'auto';
        const _isLocalAIBot = (_aiUserConfig?.backend === 'ollama' || _aiUserConfig?.backend === 'localai');
        if (_ttsOvrBot === 'local' || _ttsOvrBot === 'browser' || _ttsOvrBot === 'off' || (_ttsOvrBot === 'auto' && _isLocalAIBot)) {
            try {
                return await _ai.textToSpeech(text, { voice: voiceName, speed });
            } catch (e) {
                console.warn('[callTTSDirect] AIProvider TTS failed, falling back to Gemini:', e?.message);
            }
        }
        if (Date.now() < state.rateLimitedUntil) {
            console.warn("[TTS-Bot] Skipping — global rate-limit cooldown active for", Math.round((state.rateLimitedUntil - Date.now()) / 1000), "more seconds");
            return null;
        }
        const safeVoice = AVAILABLE_VOICES.map(v => v.toLowerCase()).includes((voiceName || '').toLowerCase()) ? voiceName : 'Puck';
        if (safeVoice !== voiceName) console.warn(`[TTS-Bot] Voice "${voiceName}" is not a valid Gemini voice. Falling back to "${safeVoice}".`);
        console.log("[TTS-Bot] 🎤 callTTSDirect called:", { text: text?.substring(0, 40), voice: safeVoice, speed });
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
                        speechConfig: {
                          voiceConfig: { prebuiltVoiceConfig: { voiceName: safeVoice } }
                        }
                      }
                    };
                    const response = await fetch(url, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
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
                    return { bytes, base64: base64Audio };
                });
                state.botQueue = queuedTask.catch(() => {});
                const ttsResult = await queuedTask;
                if (!ttsResult) { throw new Error("[TTS-Bot] fetchTTSBytes returned no audio data"); }
                const { bytes: pcmBytes } = ttsResult;
                const wavBuffer = pcmToWav(pcmBytes);
                const blob = new Blob([wavBuffer], { type: 'audio/wav' });
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
