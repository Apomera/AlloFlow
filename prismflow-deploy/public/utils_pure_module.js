(function() {
'use strict';
if (window.AlloModules && window.AlloModules.UtilsPureModule) { console.log('[CDN] UtilsPureModule already loaded, skipping'); return; }
// utils_pure_source.jsx — pure utility functions (JSON, storage, network, image).
// Extracted from AlloFlowANTI.txt on 2026-04-21.
// utils_pure_source.jsx — Pure-utility CDN module for AlloFlow
// Extracted from AlloFlowANTI.txt 2026-04-21 (v3 audit — Module A, after
// RIME dead-code dedup).
//
// Contents (~546 lines of pure functions, no React, no JSX, no component state):
//   JSON/data: safeJsonParse, cleanJson, calculateTextEntropy, validateDraftQuality,
//              chunkObject, flattenObject, unflattenObject
//   Text: getAssetManifest
//   Storage: storageDB (IndexedDB + LZString wrapper)
//   Network: fetchWithExponentialBackoff, isGoogleRedirect, isYouTubeUrl, fetchAndCleanUrl
//   Image: optimizeImage (canvas-based base64 optimizer)
//
// fetchAndCleanUrl closes over apiKey / _isCanvasEnv / GEMINI_MODELS — we alias
// them via window at the top of this module. The monolith mirrors these onto
// window near the AIBackend shim so they're available when this CDN loads.
//
// storageDB uses window.idbKeyval + window.LZString (both already loaded as
// external scripts in AlloFlowANTI.txt's preamble). safeJsonParse uses
// window.jsonrepair (lazy-loaded on demand).
//
// Logging: warnLog/debugLog aliased from window; fall back to console.

// ─── Globals aliased from window ──────────────────────────────────────────
var warnLog = (typeof window !== 'undefined' && window.warnLog) || console.warn;
var debugLog = (typeof window !== 'undefined' && (window.__alloDebugLog || window.debugLog)) || function(){};
var apiKey = (typeof window !== 'undefined') ? window.apiKey : undefined;
var _isCanvasEnv = (typeof window !== 'undefined') ? Boolean(window._isCanvasEnv) : false;
var GEMINI_MODELS = (typeof window !== 'undefined' && window.GEMINI_MODELS) || { default: 'gemini-3-flash-preview', fallback: 'gemini-3-flash-preview' };

const safeJsonParse = (text) => {
  if (!text || typeof text !== 'string') return null;
  try {
    const cleaned = cleanJson(text);
    if (!cleaned || cleaned.trim().length === 0 || cleaned === "{}") {
        return null;
    }
    if (typeof window !== 'undefined' && window.jsonrepair) {
      try {
        const repaired = window.jsonrepair(cleaned);
        return JSON.parse(repaired);
      } catch (e) {
        warnLog("safeJsonParse: jsonrepair failed, attempting standard parse...");
      }
    }
    return JSON.parse(cleaned);
  } catch (e) {
    warnLog("safeJsonParse: Parsing failed", e);
    return null;
  }
};
const cleanJson = (text) => {
    if (!text) return "{}";
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    // Sanitize invalid backslash escapes inside JSON strings (keep valid: \" \\ \/ \b \f \n \r \t \u)
    cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;
    if (firstBrace === -1 && firstBracket === -1) return "{}";
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIdx = firstBrace;
        endIdx = cleaned.lastIndexOf('}');
    } else {
        startIdx = firstBracket;
        endIdx = cleaned.lastIndexOf(']');
    }
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        return "{}";
    }
    cleaned = cleaned.substring(startIdx, endIdx + 1);
    cleaned = cleaned.replace(/}\s*{/g, '}, {');
    cleaned = cleaned.replace(/]\s*{/g, '], {');
    cleaned = cleaned.replace(/}\s*\[/g, '}, [');
    cleaned = cleaned.replace(/,\s*]/g, ']');
    cleaned = cleaned.replace(/,\s*}/g, '}');
    cleaned = cleaned.replace(/\.\.\.\s*]/g, ']');
    cleaned = cleaned.replace(/\.\.\.\s*}/g, '}');
    cleaned = cleaned.replace(/("|\d)\s*\n\s*"/g, '$1,\n"');
    cleaned = cleaned.replace(/(true|false|null)\s*\n\s*"/g, '$1,\n"');
    cleaned = cleaned.replace(/"\s*\n\s*"/g, '",\n"');
    cleaned = cleaned.replace(/}\s*\n\s*{/g, '},\n{');
    cleaned = cleaned.replace(/]\s*\n\s*\[/g, '],\n[');
    cleaned = cleaned.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    return cleaned;
};
const calculateTextEntropy = (text) => {
  if (!text || typeof text !== 'string') return 0;
  const cleanText = text.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
  const tokens = cleanText.split(" ");
  if (tokens.length === 0 || (tokens.length === 1 && !tokens[0])) return 0;
  const uniqueTokens = new Set(tokens);
  return uniqueTokens.size / tokens.length;
};
const validateDraftQuality = (text) => {
  if (!text || text.trim().length < 20) {
      return { isValid: false, error: "Submission is too short." };
  }
  const entropy = calculateTextEntropy(text);
  if (entropy < 0.4) {
      return { isValid: false, error: "Text appears too repetitive or spammy." };
  }
  return { isValid: true, error: null };
};
const getAssetManifest = (historyItems) => {
    const assets = historyItems.filter(h =>
        !['lesson-plan', 'udl-advice', 'alignment-report', 'gemini-bridge'].includes(h.type)
    );
    if (assets.length === 0) return "No specific assets generated yet. Suggest general activities.";
    let manifest = "--- AVAILABLE ASSET INVENTORY (THE KIT) ---\n";
    assets.forEach(item => {
        const title = item.title || "Untitled Resource";
        let usage = "";
        switch(item.type) {
            case 'image': usage = "(Visual Anchor / Hook)"; break;
            case 'adventure': usage = "(Engagement / Hook / Application)"; break;
            case 'simplified': usage = "(Core Text / Direct Instruction)"; break;
            case 'glossary': usage = "(Vocabulary Support)"; break;
            case 'timeline': usage = "(Sequence Activity / Guided Practice)"; break;
            case 'concept-sort': usage = "(Categorization Activity / Guided Practice)"; break;
            case 'sentence-frames': usage = "(Writing Support / Independent Practice)"; break;
            case 'dbq': usage = "(Document Analysis / Critical Thinking)"; break;
            case 'storyforge-config': usage = "(Creative Writing Assignment)"; break;
            case 'storyforge-submission': usage = "(Student Story Submission)"; break;
            case 'quiz': usage = "(Assessment / Closure)"; break;
            case 'math': usage = "(STEM Problem Solving)"; break;
            case 'persona': usage = "(Historical Interview Activity)"; break;
            default: usage = "(Supplementary Resource)";
        }
        manifest += `- [${item.type.toUpperCase()}] "${title}" (ID: ${item.id}): ${usage}\n`;
    });
    manifest += "-------------------------------------------\n";
    return manifest;
};
const chunkObject = (obj, maxKeys) => {
  const keys = Object.keys(obj);
  const chunks = [];
  let currentChunk = {};
  let currentCount = 0;
  keys.forEach((key, index) => {
    currentChunk[key] = obj[key];
    currentCount++;
    if (currentCount >= maxKeys || index === keys.length - 1) {
      chunks.push(currentChunk);
      currentChunk = {};
      currentCount = 0;
    }
  });
  return chunks;
};
const flattenObject = (obj, prefix = '') => {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
};
const unflattenObject = (data) => {
    const result = {};
    for (const i in data) {
        const keys = i.split('.');
        keys.reduce((acc, key, idx) => {
            if (idx === keys.length - 1) {
                acc[key] = data[i];
            } else {
                if (!acc[key]) acc[key] = {};
            }
            return acc[key];
        }, result);
    }
    return result;
};
// ── Device-storage bridge mirror (2026-07-14) ──────────────────────────
// In Canvas the app origin is EPHEMERAL: idbKeyval's IndexedDB vanishes
// between sessions, so the automatic autosave/restore that quietly works on
// stable origins loses everything there. When the surface looks like Canvas,
// storageDB writes through to the device-storage bridge (silent partitioned-
// iframe channel on alloflow-cdn.pages.dev — probe-verified 2026-07-14 to
// persist across Canvas sessions) and falls back to it on read misses,
// backfilling the fast local IDB. Values cross the bridge in their stored
// form (LZString-compressed strings), so both sides stay byte-compatible.
// Stable origins never load the bridge — zero behavior change outside Canvas.
const _dsBridgeWanted = (() => {
  try {
    const host = window.location.hostname || '';
    if ((window.location.href || '').startsWith('blob:')) return true;
    return host.includes('googleusercontent') || host.includes('scf.usercontent') ||
           host.includes('code-server') || host.includes('idx.google') || host.includes('run.app');
  } catch (_) { return false; }
})();
const _dsBridge = () => {
  if (!window.__alloDeviceStoragePromise) {
    window.__alloDeviceStoragePromise = window.alloDeviceStorage
      ? Promise.resolve(window.alloDeviceStorage)
      : new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=ds1';
          s.onload = () => {
            // Pages answers missing files with its SPA index as HTML 200 —
            // verify the global actually appeared (lame.min.js lesson).
            if (window.alloDeviceStorage) resolve(window.alloDeviceStorage);
            else reject(new Error('device storage module missing after load'));
          };
          s.onerror = () => reject(new Error('device storage module failed to load'));
          document.head.appendChild(s);
        });
  }
  return window.__alloDeviceStoragePromise.then((ds) => ds.ready().then(() => ds));
};
const _dsMirrorSet = (key, storedValue) => {
  if (!_dsBridgeWanted) return;
  _dsBridge().then((ds) => ds.set('app_kv', key, storedValue))
    .catch((e) => warnLog(`storageDB bridge mirror failed [${key}]:`, e?.code || e?.message || e));
};
// ── Canvas localStorage continuity (2026-07-14) ────────────────────────
// Settings and toggles all over the app (theme, voice, a11y, per-tool
// preferences) live in plain localStorage, which resets every Canvas
// session with the throwaway origin. On Canvas surfaces: hydrate
// localStorage from the bridge at load (only keys the session hasn't
// already written — never clobber fresher values), then snapshot the whole
// store back periodically and on hide/unload. window.__alloPrefsHydrated +
// the allo-prefs-hydrated event let the monolith's mount gate hold first
// paint briefly so boot-time reads (theme, a11y) see restored values.
if (_dsBridgeWanted && typeof window !== 'undefined') {
  const _finishPrefsHydration = (applied) => {
    window.__alloPrefsHydrated = true;
    try { window.dispatchEvent(new CustomEvent('allo-prefs-hydrated', { detail: { applied } })); } catch (_) {}
  };
  _dsBridge().then((ds) => ds.get('ls_prefs', 'all')).then((snap) => {
    let applied = 0;
    if (snap && typeof snap === 'object') {
      Object.keys(snap).forEach((k) => {
        try {
          if (typeof snap[k] === 'string' && localStorage.getItem(k) === null) {
            localStorage.setItem(k, snap[k]);
            applied++;
          }
        } catch (_) {}
      });
    }
    _finishPrefsHydration(applied);
  }).catch(() => _finishPrefsHydration(0));
  // Dirty-check before sending: whole-store payloads can be MBs (AlloHaven
  // keeps its entire world in alloflow_allohaven_v1), so only cross the
  // bridge when something actually changed since the last snapshot.
  let _lsLastSnapshotSig = null;
  const _lsSnapshot = () => {
    try {
      const dump = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) dump[k] = localStorage.getItem(k);
      }
      const sig = JSON.stringify(dump);
      if (sig === _lsLastSnapshotSig) return;
      _dsBridge().then((ds) => ds.set('ls_prefs', 'all', dump))
        .then(() => { _lsLastSnapshotSig = sig; })
        .catch(() => {});
    } catch (_) {}
  };
  setInterval(_lsSnapshot, 30000);
  window.addEventListener('pagehide', _lsSnapshot);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _lsSnapshot();
  });
}
const storageDB = {
  get: async (key) => {
    try {
      if (typeof window === 'undefined') return null;
      if (!window.idbKeyval) { warnLog("storageDB.get: IDB not yet loaded, returning null for", key); return null; }
      let val = await window.idbKeyval.get(key);
      if ((val === undefined || val === null) && _dsBridgeWanted) {
        // Fresh Canvas session: local IDB is empty but the bridge may hold
        // the previous session's autosave. Backfill local so later reads hit
        // the fast path.
        try {
          val = await _dsBridge().then((ds) => ds.get('app_kv', key));
          if (val !== undefined && val !== null) {
            try { await window.idbKeyval.set(key, val); } catch (_) {}
          }
        } catch (e) {
          warnLog(`storageDB bridge read failed [${key}]:`, e?.code || e?.message || e);
          val = null;
        }
      }
      if (val === undefined || val === null) return null;
      if (typeof val === 'object') return val;
      if (window.LZString) {
        let decompressed = window.LZString.decompressFromUTF16(val);
        if (!decompressed) {
            decompressed = window.LZString.decompress(val);
        }
        return decompressed ? JSON.parse(decompressed) : JSON.parse(val);
      }
      return JSON.parse(val);
    } catch (e) {
      warnLog(`storageDB Read Error [${key}]:`, e);
      return null;
    }
  },
  set: async (key, value) => {
    // Reports success as a boolean (2026-07-13): true when the write LANDED,
    // false when it was skipped or failed (quota, IDB unavailable). Durability-
    // sensitive callers (batch checkpoints) check the report; legacy callers
    // that ignore the return keep fire-and-forget semantics — still never throws.
    if (typeof window === 'undefined') return false;
    if (!window.idbKeyval) { warnLog("storageDB.set: IDB not yet loaded, skipping write for", key); return false; }
    try {
      const stringified = JSON.stringify(value);
      const valToStore = window.LZString ? window.LZString.compressToUTF16(stringified) : stringified;
      await window.idbKeyval.set(key, valToStore);
      _dsMirrorSet(key, valToStore);
      return true;
    } catch (e) {
      warnLog(`storageDB Write Error [${key}]:`, e);
      // Local quota blew but the bridge bucket has its own (usually larger)
      // quota — still try to land the durable copy there.
      try {
        const stringified = JSON.stringify(value);
        _dsMirrorSet(key, window.LZString ? window.LZString.compressToUTF16(stringified) : stringified);
      } catch (_) {}
      return false;
    }
  },
  del: async (key) => {
    try {
      if (typeof window !== 'undefined' && window.idbKeyval) await window.idbKeyval.del(key);
    } catch (e) { warnLog(`storageDB Del Error [${key}]:`, e); }
    if (_dsBridgeWanted) {
      _dsBridge().then((ds) => ds.remove('app_kv', key))
        .catch((e) => warnLog(`storageDB bridge del failed [${key}]:`, e?.code || e?.message || e));
    }
  },
  clear: async () => {
    try {
      if (typeof window !== 'undefined' && window.idbKeyval) await window.idbKeyval.clear();
    } catch (e) { warnLog("storageDB Clear Error:", e); }
    if (_dsBridgeWanted) {
      _dsBridge().then((ds) => ds.clearNamespace('app_kv'))
        .catch((e) => warnLog('storageDB bridge clear failed:', e?.code || e?.message || e));
    }
  }
};
const fetchWithExponentialBackoff = async (url, options = {}, maxRetries = 5, perRequestTimeoutMs = 120000) => {
  // Per-request timeout (2026-06-16). The retry cap below only fires when a request FAILS.
  // A request the server accepts but never answers (no response, no error) would otherwise
  // hang this await FOREVER — which silently wedged whole remediation sections ("stuck
  // Fixing…", spinner never clears, no error toast) whenever one AI call never settled. Bound
  // every attempt with an AbortController so a dead request rejects → retries → and ultimately
  // throws, letting callers fail-soft (e.g. the per-section deterministic-only fallback) instead
  // of hanging. The timeout is generous (no legitimate call takes this long) — it only breaks
  // true hangs. We compose with the caller's signal so an explicit Stop still cancels instantly
  // and is NOT retried (a caller abort is final; our own timeout is transient).
  const callerSignal = options.signal || null;
  const _safeUrl = String(url).split('?')[0]; // redact ?key=… from error messages (own-key/self-hosted users land in error reports)
  for (let i = 0; i < maxRetries; i++) {
    const _timeoutCtrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    let _timedOut = false;
    let _timer = null;
    const _onCallerAbort = () => { if (_timeoutCtrl) { try { _timeoutCtrl.abort(); } catch (_) {} } };
    if (_timeoutCtrl) {
      _timer = setTimeout(() => { _timedOut = true; try { _timeoutCtrl.abort(); } catch (_) {} }, perRequestTimeoutMs);
      if (callerSignal) {
        if (callerSignal.aborted) { try { _timeoutCtrl.abort(); } catch (_) {} }
        else { try { callerSignal.addEventListener('abort', _onCallerAbort); } catch (_) {} }
      }
    }
    try {
      const response = await fetch(url, _timeoutCtrl ? { ...options, signal: _timeoutCtrl.signal } : options);
      if (response.ok) {
        return response;
      }
      if (response.status !== 429 && response.status !== 503) {
        let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
        if (response.status === 403) {
          errorMessage = `${response.status} Forbidden: API access denied. Check your API key and permissions.`;
        } else if (response.status === 401) {
          // 401 = bad/expired/missing credentials. Retrying with the identical key cannot
          // succeed; the old code lumped 401 in with 429/503 and retried it through the full
          // exponential backoff (~31s of dead-wait per call) before finally failing — the
          // "freezes then fails" symptom of a misconfigured key. Fail fast so the caller can
          // surface an honest auth error immediately.
          errorMessage = `401 Unauthorized: API authentication failed. Check your API key.`;
        }
        const error = new Error(errorMessage);
        error.isFatal = true;
        if (response.status === 401) error.isAuth = true;
        throw error;
      }
      if (response.status === 429 || response.status === 503) {
        warnLog(`⚠️ Transient API error ${response.status}, retrying (${i+1}/${maxRetries})...`);
        if (i === maxRetries - 1) {
          throw new Error(`HTTP ${response.status} — Failed to fetch ${_safeUrl} after ${maxRetries} retries.`);
        }
      }
    } catch (error) {
      // Caller-initiated abort (e.g. the user pressed Stop): propagate immediately and NEVER
      // retry — re-issuing a request the caller explicitly cancelled is wrong (and would burn
      // another quota slice). Surfaced as a named AbortError so callGemini stops cleanly.
      if (callerSignal && callerSignal.aborted) {
        const _abErr = new Error('Request aborted by caller');
        _abErr.name = 'AbortError';
        _abErr.isFatal = true;
        throw _abErr;
      }
      // Our own per-request timeout: the request hung. Treat as transient (a retry may settle);
      // on the final attempt, surface an honest timeout error instead of hanging forever.
      if (_timedOut || (error && error.name === 'AbortError')) {
        warnLog(`⚠️ Request timed out after ~${Math.round(perRequestTimeoutMs/1000)}s, retrying (${i+1}/${maxRetries})...`);
        if (i === maxRetries - 1) {
          throw new Error(`Timed out after ${maxRetries} attempt(s) (~${Math.round(perRequestTimeoutMs/1000)}s each) — ${_safeUrl}`);
        }
      } else {
        if (error.isFatal) throw error;
        if (i === maxRetries - 1) {
          throw error;
        }
      }
    } finally {
      if (_timer) clearTimeout(_timer);
      if (callerSignal) { try { callerSignal.removeEventListener('abort', _onCallerAbort); } catch (_) {} }
    }
    // Exponential backoff with jitter to prevent thundering herd on parallel requests
    const baseDelay = Math.pow(2, i) * 1000;
    const jitter = Math.random() * baseDelay * 0.5; // 0-50% random jitter
    const delay = baseDelay + jitter;
    warnLog(`[API] Backing off ${Math.round(delay)}ms before retry ${i + 1}...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error(`Failed to fetch ${_safeUrl} after ${maxRetries} retries.`);
};

const isGoogleRedirect = (url) => {
    if (!url) return false;
    return url.includes('google.com/url') || url.includes('google.com/search');
};
const isYouTubeUrl = (url) => {
    if (!url) return false;
    return /(?:youtube\.com\/(?:watch|embed|shorts)|youtu\.be\/)/i.test(url);
};
const fetchAndCleanUrl = async (url, geminiCaller, toastCallback) => {
    if (!url || !url.trim()) return null;
    let targetUrl = url.trim();
    // ─────────────────────────────────────────────────────────────
    // Tier-2 fallback: Gemini URL Context tool
    // Called when Jina + raw-HTML extraction all fail or return garbage.
    // Uses Gemini 3 Flash (or current default) with urlContext enabled.
    // Different IP reputation than Jina — often succeeds where Jina 403s.
    // ─────────────────────────────────────────────────────────────
    const tryGeminiUrlContext = async () => {
        if (!apiKey && !_isCanvasEnv) {
            console.log('[URL Fetch] ⏭️ Gemini URL Context skipped — no API key');
            return null;
        }
        console.log(`[URL Fetch] 🤖 Attempting Gemini URL Context fallback for ${targetUrl}`);
        const urlCtxEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.default}:generateContent${apiKey ? `?key=${apiKey}` : ''}`;
        const urlCtxPayload = {
            contents: [{
                parts: [{
                    text: `Read the web page at this URL: ${targetUrl}\n\nTask:\n1. Extract the main body text of the article, lesson, or educational content.\n2. PRESERVE the original wording exactly — do not paraphrase or summarize.\n3. Remove navigational elements, footers, sidebars, ads, cookie banners, and metadata.\n4. If the page is empty, a login screen, or completely inaccessible, return exactly "ERROR: NO_ARTICLE_FOUND".\n5. Return ONLY the cleaned main text (no preamble, no commentary).`
                }]
            }],
            tools: [{ urlContext: {} }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 65536 }
        };
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000);
            const resp = await fetch(urlCtxEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(urlCtxPayload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!resp.ok) {
                const errBody = await resp.text().catch(() => '');
                console.warn(`[URL Fetch] ❌ Gemini URL Context HTTP ${resp.status}: ${errBody.substring(0, 300)}`);
                return null;
            }
            const data = await resp.json();
            // Check URL retrieval metadata — Gemini tells us whether the URL was actually fetched
            const urlMeta = data?.candidates?.[0]?.urlContextMetadata?.urlMetadata;
            if (Array.isArray(urlMeta) && urlMeta.length > 0) {
                const status = urlMeta[0]?.urlRetrievalStatus;
                console.log(`[URL Fetch] 🤖 Gemini URL retrieval status: ${status}`);
                if (status && status !== 'URL_RETRIEVAL_STATUS_SUCCESS') {
                    console.warn(`[URL Fetch] ❌ Gemini could not retrieve URL (${status})`);
                    return null;
                }
            }
            const extracted = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!extracted || extracted.includes('ERROR: NO_ARTICLE_FOUND')) {
                console.warn('[URL Fetch] ❌ Gemini URL Context returned no article');
                return null;
            }
            if (extracted.trim().length < 50) {
                console.warn(`[URL Fetch] ❌ Gemini URL Context returned ${extracted.trim().length} chars — too short`);
                return null;
            }
            console.log(`[URL Fetch] ✅ Gemini URL Context success: ${extracted.length} chars extracted`);
            return extracted.trim();
        } catch (e) {
            console.warn('[URL Fetch] ❌ Gemini URL Context threw:', e?.message || e);
            return null;
        }
    };
    if (isYouTubeUrl(targetUrl)) {
        if (toastCallback) toastCallback("🎬 YouTube detected — extracting transcript via Gemini...", "info");
        try {
            if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
            const ytUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.default}:generateContent${apiKey ? `?key=${apiKey}` : ''}`;
            const ytPayload = {
                contents: [{
                    parts: [
                        { fileData: { mimeType: "video/*", fileUri: targetUrl } },
                        { text: "Extract the complete spoken transcript from this YouTube video. Return ONLY the transcript text, preserving paragraph breaks. Do not add commentary, timestamps, or section headers — just the spoken words. If the video has no speech, describe the visual content instead." }
                    ]
                }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 65536 }
            };
            const ytResponse = await fetch(ytUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ytPayload)
            });
            if (!ytResponse.ok) {
                const errData = await ytResponse.json().catch(() => ({}));
                const errMsg = errData?.error?.message || `HTTP ${ytResponse.status}`;
                throw new Error(`Gemini YouTube API error: ${errMsg}`);
            }
            const ytData = await ytResponse.json();
            const transcript = ytData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (transcript && transcript.trim().length > 50) {
                if (toastCallback) toastCallback("✅ YouTube transcript extracted successfully!", "success");
                return `Source: ${targetUrl}\n(YouTube transcript extracted via Gemini AI)\n\n${transcript.trim()}`;
            } else {
                throw new Error("Transcript too short or empty.");
            }
        } catch (ytErr) {
            warnLog("[YouTube Transcript] Gemini extraction failed, falling back to standard URL fetch:", ytErr.message);
            if (toastCallback) toastCallback(`YouTube transcript failed (${ytErr.message}). Trying standard fetch...`, "warning");
        }
    }
    try {
        if (isGoogleRedirect(targetUrl)) {
            throw new Error("Cannot fetch Google Redirects directly. Please open the link, copy the final URL from the address bar, and paste it here.");
        }
        new URL(targetUrl);
    } catch (e) {
        if (e.message.startsWith("Cannot fetch")) throw e;
        if (!targetUrl.startsWith('http')) {
            targetUrl = 'https://' + targetUrl;
            try { new URL(targetUrl); } catch (e) {
                throw new Error("Invalid URL format.");
            }
        } else {
            throw new Error("Invalid URL format.");
        }
    }
    try {
        const jinaUrl = `https://r.jina.ai/${targetUrl}`;
        let response;
        let usedRawSource = false;
        // Jina-specific error/rate-limit patterns that indicate we should force raw fallback
        const isJinaGarbage = (t) => {
            if (!t) return true;
            const trimmed = t.trim();
            if (trimmed.length < 500) return true; // short Jina responses are almost always errors or empty shells
            const lower = trimmed.toLowerCase();
            return lower.includes("rate limit") ||
                   lower.includes("too many requests") ||
                   lower.includes("quota exceeded") ||
                   lower.startsWith("warning") ||
                   lower.startsWith("error:") ||
                   (lower.includes("jina") && lower.includes("error"));
        };
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(jinaUrl)}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);
            response = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
        } catch (e) {
            warnLog("Primary proxy failed, attempting fallback...", e);
        }
        if (!response || !response.ok) {
            try {
                const fallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(jinaUrl)}&t=${Date.now()}`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000);
                response = await fetch(fallbackUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
            } catch(e) { warnLog('Caught error:', e?.message || e); }
        }
        let text = "";
        if (response && response.ok) {
            text = await response.text();
        }
        debugLog(`[URL Fetch] Jina returned ${text.length} chars for ${targetUrl}`);
        const lowerText = text.toLowerCase();
        const isBlocked = lowerText.includes("access denied") ||
                          lowerText.includes("security check") ||
                          lowerText.includes("cloudflare") ||
                          lowerText.includes("captcha") ||
                          lowerText.includes("403 forbidden") ||
                          lowerText.includes("verify you are human");
        // Use the new Jina-garbage detector AND the 500-char raw threshold (was 50 — too permissive)
        if (!response || !response.ok || isBlocked || isJinaGarbage(text)) {
             debugLog(`[URL Fetch] Jina result inadequate (${text.length} chars). Attempting direct raw HTML fetch...`);
             const savedJinaText = text; // preserve in case raw fallback also fails
             let rawOk = false;
             // Try corsproxy.io first
             try {
                 const rawProxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
                 const controller = new AbortController();
                 const timeoutId = setTimeout(() => controller.abort(), 20000);
                 const rawResponse = await fetch(rawProxyUrl, { signal: controller.signal });
                 clearTimeout(timeoutId);
                 if (rawResponse.ok) {
                     const rawText = await rawResponse.text();
                     if (rawText && rawText.trim().length > 200) {
                         text = rawText;
                         usedRawSource = true;
                         rawOk = true;
                         debugLog(`[URL Fetch] corsproxy raw HTML: ${rawText.length} chars`);
                     }
                 }
             } catch (directErr) {
                 warnLog("[URL Fetch] corsproxy raw fallback failed:", directErr?.message);
             }
             // Second raw fallback via allorigins
             if (!rawOk) {
                 try {
                     const rawFallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}&t=${Date.now()}`;
                     const controller = new AbortController();
                     const timeoutId = setTimeout(() => controller.abort(), 20000);
                     const rawResponse2 = await fetch(rawFallbackUrl, { signal: controller.signal });
                     clearTimeout(timeoutId);
                     if (rawResponse2.ok) {
                         const rawText2 = await rawResponse2.text();
                         if (rawText2 && rawText2.trim().length > 200) {
                             text = rawText2;
                             usedRawSource = true;
                             rawOk = true;
                             debugLog(`[URL Fetch] allorigins raw HTML: ${rawText2.length} chars`);
                         }
                     }
                 } catch (e) {
                     warnLog("[URL Fetch] allorigins raw fallback failed:", e?.message);
                 }
             }
             // If both raw fallbacks failed but we had usable-ish Jina text, fall back to it
             if (!rawOk && savedJinaText && savedJinaText.trim().length >= 50) {
                 text = savedJinaText;
                 debugLog(`[URL Fetch] Raw fallbacks failed, reverting to original Jina text (${savedJinaText.length} chars)`);
             }
             if (!rawOk && (!savedJinaText || savedJinaText.trim().length < 50)) {
                 if (isBlocked) throw new Error("URL blocked by security check (CAPTCHA/403). Please paste text manually.");
                 throw new Error(`Failed to fetch readable content from ${targetUrl}. The site may be JavaScript-rendered or blocking extraction.`);
             }
        }
        const finalLower = text.toLowerCase();
        if (finalLower.includes("access denied") ||
            finalLower.includes("security check") ||
            finalLower.includes("cloudflare") ||
            finalLower.includes("captcha") ||
            finalLower.includes("403 forbidden") ||
            (finalLower.includes("verify") && finalLower.includes("human"))) {
            throw new Error("URL blocked by security check. Please paste text manually.");
        }
        if (!text || text.trim().length < 50) {
            throw new Error(`Content too short or empty (got ${text ? text.trim().length : 0} chars from ${targetUrl}). The site may be JavaScript-rendered or blocking extraction — try pasting text manually.`);
        }
        text = text.replace(/!\[[^\]]*\]\([^\)]+\)/g, '');
        text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        text = text.replace(/\[\d+\]/g, '');
        text = text.replace(/^\[.+\]:\s*http.+$/gm, '');
        if (geminiCaller) {
            const cleanPrompt = `
                You are an expert content extractor.
                Analyze the following ${usedRawSource ? 'raw HTML source code' : 'raw text'} extracted from a webpage:
                """
                ${text.substring(0, 50000)}
                """
                Task:
                1. Identify and extract the main body text, list content, or educational summary.
                2. Remove all navigational elements, footers, sidebars, advertisements, and metadata.
                3. PRESERVE the original wording exactly.
                4. Only return "ERROR: NO_ARTICLE_FOUND" if the page is completely empty or a Login Screen.
                Return ONLY the cleaned main text.
            `;
            const cleanedText = await geminiCaller(cleanPrompt);
            if (cleanedText && !cleanedText.includes("ERROR: NO_ARTICLE_FOUND")) {
                text = cleanedText;
            }
        }
        console.log(`[URL Fetch] ✅ Jina path success: ${text.trim().length} chars returned (usedRawSource=${usedRawSource})`);
        return `Source: ${targetUrl}\n\n${text.trim()}`;
    } catch (err) {
        // ── Tier-2 fallback: Gemini URL Context before giving up ──
        console.warn(`[URL Fetch] ⚠️ Jina + raw-HTML path failed: ${err.message}. Trying Gemini URL Context fallback...`);
        if (toastCallback) toastCallback("Jina failed — trying Gemini URL Context...", "info");
        const geminiExtracted = await tryGeminiUrlContext();
        if (geminiExtracted) {
            if (toastCallback) toastCallback("✅ Content extracted via Gemini URL Context!", "success");
            return `Source: ${targetUrl}\n(Extracted via Gemini URL Context)\n\n${geminiExtracted}`;
        }
        console.error(`[URL Fetch] ❌ ALL methods failed for ${targetUrl}`);
        if (toastCallback) toastCallback(err.message || "URL import failed.", "error");
        throw err;
    }
};

const optimizeImage = (base64Str, maxWidth = 800, quality = 0.9) => {
    return new Promise((resolve) => {
        if (!base64Str || typeof base64Str !== 'string') {
            resolve(base64Str);
            return;
        }
        const img = new Image();
        img.src = base64Str;
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                const optimizedUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(optimizedUrl);
            } catch (e) {
                warnLog("Image optimization error:", e);
                resolve(base64Str);
            }
        };
        img.onerror = (e) => {
             warnLog("Image load error during optimization:", e);
             resolve(base64Str);
        };
    });
};

// ─── Inline parametric diagram renderer (shared by MathView + QuizView; roadmap step 2/3) ──
// Pure: {tool,state} → ACCESSIBLE SVG string (role=img + <title>/<desc>, escaped labels) for the
// common quantitative manipulative types. ONE canonical copy here so math + quiz + future surfaces
// never drift. Returns null for unsupported tools / missing state (caller falls back).
function _renderDiagramSvg(tool, state, titleText) {
  if (!tool || !state) return null;
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var num = function (v, d) { var n = Number(v); return isFinite(n) ? n : d; };
  if (tool === 'numberline') {
    var range = state.range || {};
    var min = num(range.min, 0), max = num(range.max, 10);
    if (max <= min) max = min + 10;
    var W = 380, padX = 24, axisY = 46;
    var sx = function (v) { return padX + ((num(v, min) - min) / (max - min)) * (W - 2 * padX); };
    var span = max - min;
    var step = span <= 10 ? 1 : span <= 20 ? 2 : span <= 50 ? 5 : Math.ceil(span / 10);
    var ticks = '';
    for (var tv = Math.ceil(min); tv <= max; tv += step) {
      var tx = sx(tv);
      ticks += '<line x1="' + tx + '" y1="' + (axisY - 5) + '" x2="' + tx + '" y2="' + (axisY + 5) + '" stroke="#475569" stroke-width="1.5"/>'
        + '<text x="' + tx + '" y="' + (axisY + 20) + '" font-size="11" fill="#475569" text-anchor="middle">' + esc(tv) + '</text>';
    }
    var markers = '', descParts = [];
    (Array.isArray(state.markers) ? state.markers : []).forEach(function (m) {
      var mv = num(m && m.value, null);
      if (mv == null) return;
      var mx = sx(mv);
      var lbl = (m && m.label) ? String(m.label) : String(mv);
      markers += '<circle cx="' + mx + '" cy="' + axisY + '" r="6" fill="#4f46e5"/>'
        + '<text x="' + mx + '" y="' + (axisY - 12) + '" font-size="11" font-weight="bold" fill="#4f46e5" text-anchor="middle">' + esc(lbl) + '</text>';
      descParts.push(lbl + ' at ' + mv);
    });
    var nlTitle = esc(titleText || 'Number line');
    var nlDesc = esc('Number line from ' + min + ' to ' + max + (descParts.length ? '. Marked: ' + descParts.join(', ') + '.' : '.'));
    return '<svg viewBox="0 0 ' + W + ' 84" role="img" aria-label="' + nlTitle + ': ' + nlDesc + '" width="100%" style="max-width:420px"><title>' + nlTitle + '</title><desc>' + nlDesc + '</desc>'
      + '<line x1="' + padX + '" y1="' + axisY + '" x2="' + (W - padX) + '" y2="' + axisY + '" stroke="#475569" stroke-width="2"/>'
      + ticks + markers + '</svg>';
  }
  if (tool === 'coordinate') {
    var pts = Array.isArray(state.points) ? state.points.filter(function (p) { return p && isFinite(Number(p.x)) && isFinite(Number(p.y)); }) : [];
    var coords = pts.map(function (p) { return Math.abs(Number(p.x)); }).concat(pts.map(function (p) { return Math.abs(Number(p.y)); }));
    var R = coords.length ? Math.max(5, Math.ceil(Math.max.apply(null, coords))) : 10;
    if (R > 20) R = 20;
    var S = 240, pad = 16, origin = S / 2, unit = (S / 2 - pad) / R;
    var cx = function (x) { return origin + num(x, 0) * unit; };
    var cy = function (y) { return origin - num(y, 0) * unit; };
    var grid = '';
    for (var g = -R; g <= R; g++) {
      grid += '<line x1="' + cx(g) + '" y1="' + pad + '" x2="' + cx(g) + '" y2="' + (S - pad) + '" stroke="#e2e8f0" stroke-width="1"/>'
        + '<line x1="' + pad + '" y1="' + cy(g) + '" x2="' + (S - pad) + '" y2="' + cy(g) + '" stroke="#e2e8f0" stroke-width="1"/>';
    }
    var axes = '<line x1="' + pad + '" y1="' + origin + '" x2="' + (S - pad) + '" y2="' + origin + '" stroke="#475569" stroke-width="1.5"/>'
      + '<line x1="' + origin + '" y1="' + pad + '" x2="' + origin + '" y2="' + (S - pad) + '" stroke="#475569" stroke-width="1.5"/>';
    var plotted = '', cDesc = [];
    pts.forEach(function (p) {
      var px = cx(p.x), py = cy(p.y);
      var plbl = (p.label ? String(p.label) + ' ' : '') + '(' + Number(p.x) + ', ' + Number(p.y) + ')';
      plotted += '<circle cx="' + px + '" cy="' + py + '" r="5" fill="#4f46e5"/>'
        + '<text x="' + (px + 7) + '" y="' + (py - 7) + '" font-size="10" font-weight="bold" fill="#4f46e5">' + esc(plbl) + '</text>';
      cDesc.push(plbl);
    });
    var cTitle = esc(titleText || 'Coordinate grid');
    var cDescStr = esc('Coordinate plane, axes from -' + R + ' to ' + R + (cDesc.length ? '. Points: ' + cDesc.join('; ') + '.' : '.'));
    return '<svg viewBox="0 0 ' + S + ' ' + S + '" role="img" aria-label="' + cTitle + ': ' + cDescStr + '" width="100%" style="max-width:300px"><title>' + cTitle + '</title><desc>' + cDescStr + '</desc>'
      + grid + axes + plotted + '</svg>';
  }
  if (tool === 'fractions') {
    var fDen = Math.max(1, Math.round(num(state.denominator, 1)));
    var fNum = Math.max(0, Math.min(fDen, Math.round(num(state.numerator, 0))));
    var fW = 320, fBarY = 12, fBarH = 38, fPadX = 10, fBarW = fW - 2 * fPadX, fpw = fBarW / fDen;
    var fCells = '';
    for (var fi = 0; fi < fDen; fi++) {
      fCells += '<rect x="' + (fPadX + fi * fpw) + '" y="' + fBarY + '" width="' + fpw + '" height="' + fBarH + '" fill="' + (fi < fNum ? '#4f46e5' : '#ffffff') + '" stroke="#475569" stroke-width="1.5"/>';
    }
    var frTitle = esc(titleText || ('Fraction ' + fNum + '/' + fDen));
    var frDesc = esc(fNum + ' of ' + fDen + ' equal parts shaded (' + fNum + '/' + fDen + ').');
    return '<svg viewBox="0 0 ' + fW + ' 78" role="img" aria-label="' + frTitle + ': ' + frDesc + '" width="100%" style="max-width:360px"><title>' + frTitle + '</title><desc>' + frDesc + '</desc>'
      + fCells + '<text x="' + (fW / 2) + '" y="' + (fBarY + fBarH + 22) + '" font-size="14" font-weight="bold" fill="#4f46e5" text-anchor="middle">' + esc(fNum + '/' + fDen) + '</text></svg>';
  }
  if (tool === 'base10') {
    var bH = Math.max(0, Math.round(num(state.hundreds, 0))), bT = Math.max(0, Math.round(num(state.tens, 0))), bO = Math.max(0, Math.round(num(state.ones, 0)));
    var bu = 5, bx = 8, by0 = 8, bParts = '';
    for (var bhi = 0; bhi < Math.min(bH, 9); bhi++) {
      bParts += '<rect x="' + bx + '" y="' + by0 + '" width="' + (bu * 10) + '" height="' + (bu * 10) + '" fill="#c7d2fe" stroke="#4f46e5" stroke-width="1.5"/>';
      for (var bk = 1; bk < 10; bk++) bParts += '<line x1="' + (bx + bk * bu) + '" y1="' + by0 + '" x2="' + (bx + bk * bu) + '" y2="' + (by0 + bu * 10) + '" stroke="#4f46e5" stroke-width="0.4"/><line x1="' + bx + '" y1="' + (by0 + bk * bu) + '" x2="' + (bx + bu * 10) + '" y2="' + (by0 + bk * bu) + '" stroke="#4f46e5" stroke-width="0.4"/>';
      bx += bu * 10 + 10;
    }
    for (var bti = 0; bti < Math.min(bT, 9); bti++) {
      bParts += '<rect x="' + bx + '" y="' + by0 + '" width="' + bu + '" height="' + (bu * 10) + '" fill="#a5b4fc" stroke="#4f46e5" stroke-width="1"/>';
      for (var bk2 = 1; bk2 < 10; bk2++) bParts += '<line x1="' + bx + '" y1="' + (by0 + bk2 * bu) + '" x2="' + (bx + bu) + '" y2="' + (by0 + bk2 * bu) + '" stroke="#4f46e5" stroke-width="0.4"/>';
      bx += bu + 4;
    }
    bx += 8;
    for (var boi = 0; boi < Math.min(bO, 9); boi++) { bParts += '<rect x="' + bx + '" y="' + by0 + '" width="' + bu + '" height="' + bu + '" fill="#818cf8" stroke="#4f46e5" stroke-width="1"/>'; bx += bu + 3; }
    var bTotal = bH * 100 + bT * 10 + bO, bVW = Math.max(bx + 8, 80);
    var bTitle = esc(titleText || ('Base-ten blocks showing ' + bTotal));
    var bDesc = esc(bH + ' hundreds, ' + bT + ' tens, ' + bO + ' ones = ' + bTotal + '.');
    return '<svg viewBox="0 0 ' + bVW + ' 70" role="img" aria-label="' + bTitle + ': ' + bDesc + '" width="100%" style="max-width:' + Math.min(bVW, 460) + 'px"><title>' + bTitle + '</title><desc>' + bDesc + '</desc>' + bParts + '</svg>';
  }
  if (tool === 'protractor') {
    var pAng = Math.max(0, Math.min(180, num(state.angle, 45)));
    var pRad = pAng * Math.PI / 180, pvx = 100, pvy = 112, pLen = 84;
    var pex = (pvx + pLen * Math.cos(pRad)).toFixed(1), pey = (pvy - pLen * Math.sin(pRad)).toFixed(1);
    var prTitle = esc(titleText || (pAng + ' degree angle'));
    var prDesc = esc('An angle of ' + pAng + ' degrees between a horizontal ray and a second ray.');
    return '<svg viewBox="0 0 220 140" role="img" aria-label="' + prTitle + ': ' + prDesc + '" width="100%" style="max-width:240px"><title>' + prTitle + '</title><desc>' + prDesc + '</desc>'
      + '<line x1="' + pvx + '" y1="' + pvy + '" x2="' + (pvx + pLen) + '" y2="' + pvy + '" stroke="#475569" stroke-width="2"/>'
      + '<line x1="' + pvx + '" y1="' + pvy + '" x2="' + pex + '" y2="' + pey + '" stroke="#4f46e5" stroke-width="2"/>'
      + '<circle cx="' + pvx + '" cy="' + pvy + '" r="3" fill="#475569"/>'
      + '<text x="' + (pvx + 30) + '" y="' + (pvy - 14) + '" font-size="14" font-weight="bold" fill="#4f46e5">' + esc(pAng + '°') + '</text></svg>';
  }
  return null;
}

// ─── Registration ───────────────────────────────────────────────────────────
window.AlloModules = window.AlloModules || {};
window.AlloModules.UtilsPure = {
  safeJsonParse,
  cleanJson,
  calculateTextEntropy,
  validateDraftQuality,
  getAssetManifest,
  chunkObject,
  flattenObject,
  unflattenObject,
  storageDB,
  fetchWithExponentialBackoff,
  isGoogleRedirect,
  isYouTubeUrl,
  fetchAndCleanUrl,
  optimizeImage,
  _renderDiagramSvg,
};
if (typeof window._upgradeUtilsPure === 'function') {
  window._upgradeUtilsPure();
}
console.log('[UtilsPureModule] 14 utilities registered; monolith shim upgraded.');

window.AlloModules.UtilsPureModule = true;
})();
