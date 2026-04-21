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
const storageDB = {
  get: async (key) => {
    try {
      if (typeof window === 'undefined') return null;
      if (!window.idbKeyval) { warnLog("storageDB.get: IDB not yet loaded, returning null for", key); return null; }
      const val = await window.idbKeyval.get(key);
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
    if (typeof window === 'undefined') return;
    if (!window.idbKeyval) { warnLog("storageDB.set: IDB not yet loaded, skipping write for", key); return; }
    try {
      const stringified = JSON.stringify(value);
      const valToStore = window.LZString ? window.LZString.compressToUTF16(stringified) : stringified;
      await window.idbKeyval.set(key, valToStore);
    } catch (e) {
      warnLog(`storageDB Write Error [${key}]:`, e);
    }
  },
  del: async (key) => {
    try {
      if (typeof window !== 'undefined' && window.idbKeyval) await window.idbKeyval.del(key);
    } catch (e) { warnLog(`storageDB Del Error [${key}]:`, e); }
  },
  clear: async () => {
    try {
      if (typeof window !== 'undefined' && window.idbKeyval) await window.idbKeyval.clear();
    } catch (e) { warnLog("storageDB Clear Error:", e); }
  }
};
const fetchWithExponentialBackoff = async (url, options = {}, maxRetries = 5) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      if (response.status !== 429 && response.status !== 503 && response.status !== 401) {
        let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
        if (response.status === 403) {
          errorMessage = `${response.status} Forbidden: API access denied. Check your API key and permissions.`;
        }
        const error = new Error(errorMessage);
        error.isFatal = true;
        throw error;
      }
      if (response.status === 401 || response.status === 429 || response.status === 503) {
        warnLog(`⚠️ Transient API error ${response.status}, retrying (${i+1}/${maxRetries})...`);
        if (i === maxRetries - 1) {
          throw new Error(`HTTP ${response.status} — Failed to fetch ${url} after ${maxRetries} retries.`);
        }
      }
    } catch (error) {
      if (error.isFatal) throw error;
      if (i === maxRetries - 1) {
        throw error;
      }
    }
    // Exponential backoff with jitter to prevent thundering herd on parallel requests
    const baseDelay = Math.pow(2, i) * 1000;
    const jitter = Math.random() * baseDelay * 0.5; // 0-50% random jitter
    const delay = baseDelay + jitter;
    warnLog(`[API] Backing off ${Math.round(delay)}ms before retry ${i + 1}...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error(`Failed to fetch ${url} after ${maxRetries} retries.`);
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
};
if (typeof window._upgradeUtilsPure === 'function') {
  window._upgradeUtilsPure();
}
console.log('[UtilsPureModule] 14 utilities registered; monolith shim upgraded.');
