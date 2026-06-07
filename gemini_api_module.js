(function(){"use strict";
if(window.AlloModules&&window.AlloModules.GeminiAPI){console.log("[CDN] GeminiAPI already loaded, skipping"); return;}
// gemini_api_source.jsx — Gemini HTTP wrappers for AlloFlow
// Extracted from AlloFlowANTI.txt on 2026-04-24.
// Pure HTTP orchestration — no React state, no module-level mutable state.
// Three functions: callGemini (text/JSON/search), callGeminiVision (multimodal OCR),
// callGeminiImageEdit (image-to-image editing).
// callImagen is intentionally left in the monolith because it uses React refs
// for rate-limit tracking (imagenRateLimitedRef, imagenQueueRef) — not a
// self-contained fit for this extraction.
const createGeminiAPI = (deps) => {
    const { apiKey, _isCanvasEnv, GEMINI_MODELS, fetchWithExponentialBackoff, optimizeImage, warnLog, debugLog, getAbortSignal } = deps;

    // ── Error classification ──────────────────────────────────────────────
    // Distinguish four real failure modes that users used to all see as
    // "Daily Usage Limit Reached":
    //   quota     — RESOURCE_EXHAUSTED (real per-day or per-minute cap)
    //   auth      — invalid/missing/expired API key (NOT the user's quota)
    //   config    — model name unknown to API (deploy bug, NOT the user's quota)
    //   transient — network/5xx/timeout (retry-friendly)
    //   refusal   — content-safety block (handled gracefully upstream)
    //   other     — anything else
    // Reads HTTP status from the error message (fetchWithExponentialBackoff
    // formats errors as "HTTP <status>: <body>") and inspects the body text
    // for the documented Gemini structured-error codes when present.
    const _classifyGeminiError = (err) => {
      const msg = (err && err.message) ? String(err.message) : '';
      const lower = msg.toLowerCase();
      // Refusal (safety / blocked / finishReason) — keep this FIRST so other
      // string heuristics don't mislabel a content block as quota/auth.
      if (
        msg.includes('Content Blocked') ||
        msg.includes('finishReason: OTHER') ||
        msg.includes('Refusal') ||
        msg.includes('Generation Stopped') ||
        msg.includes('Generation Blocked')
      ) {
        return { kind: 'refusal', userMessage: 'Safety filter blocked the response.', model: null };
      }
      // Genuine quota: HTTP 429 or the structured Gemini code.
      if (msg.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota exceeded')) {
        return { kind: 'quota', userMessage: 'Daily Gemini API quota reached.', model: null };
      }
      // Auth: HTTP 401 + the documented Gemini codes.
      if (
        msg.includes('401') ||
        lower.includes('unauthenticated') ||
        lower.includes('api key not valid') ||
        lower.includes('api_key_invalid') ||
        lower.includes('permission_denied') ||
        msg.includes('403')
      ) {
        // 403 is ambiguous — Gemini returns it for both real quota throttling
        // and permission denials. If the body actually mentions quota, treat
        // it as quota; otherwise as auth.
        if (lower.includes('quota') || lower.includes('rate')) {
          return { kind: 'quota', userMessage: 'Gemini API rate/quota limit hit.', model: null };
        }
        return { kind: 'auth', userMessage: 'Gemini API key is invalid, expired, or missing. AI features are unavailable until it is fixed.', model: null };
      }
      // Config: model not found / unsupported / 404 / INVALID_ARGUMENT.
      if (
        msg.includes('404') ||
        lower.includes('model not found') ||
        lower.includes('not found for api') ||
        lower.includes('models/') && lower.includes('not found') ||
        lower.includes('invalid_argument') ||
        lower.includes('is not supported')
      ) {
        const modelMatch = msg.match(/models\/([a-z0-9.\-]+)/i);
        return { kind: 'config', userMessage: 'Gemini model name is not recognized by the API (deploy-side configuration error).', model: modelMatch ? modelMatch[1] : null };
      }
      // Transient: 5xx / network / abort-ish.
      if (
        msg.match(/HTTP 5\d\d/) ||
        lower.includes('failed to fetch') ||
        lower.includes('networkerror') ||
        lower.includes('timed out') ||
        lower.includes('etimedout') ||
        msg.includes('408')
      ) {
        return { kind: 'transient', userMessage: 'Gemini API temporarily unavailable.', model: null };
      }
      return { kind: 'other', userMessage: msg || 'Unknown Gemini API error.', model: null };
    };

    // ── Persistent quota banner ───────────────────────────────────────────
    // When a genuine quota error fires, surface a sticky banner at the top
    // of the viewport so the user can SEE that the pipeline isn't broken,
    // it's just out of API quota for the day. Uses window state + a custom
    // event so the React app (or any host) can hook in too.
    const _showQuotaBanner = (classification) => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      try {
        window.__alloflowQuotaState = {
          active: true,
          kind: classification.kind,
          message: classification.userMessage,
          model: classification.model,
          hitAt: window.__alloflowQuotaState?.hitAt || (typeof Date !== 'undefined' ? Date.now() : 0)
        };
        // Honor a per-session dismissal so refreshing the banner doesn't get spammy.
        try {
          if (window.sessionStorage && sessionStorage.getItem('__alloflowQuotaBannerDismissed') === '1') return;
        } catch (_) { /* sessionStorage may throw in sandboxed contexts */ }
        let banner = document.getElementById('alloflow-quota-banner');
        if (!banner) {
          banner = document.createElement('div');
          banner.id = 'alloflow-quota-banner';
          banner.setAttribute('role', 'alert');
          banner.setAttribute('aria-live', 'assertive');
          banner.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'right:0',
            'z-index:2147483647',
            'background:#7c1d1d', 'color:#ffffff',
            'padding:12px 16px',
            'font:600 14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
            'box-shadow:0 2px 8px rgba(0,0,0,0.4)',
            'display:flex', 'align-items:center', 'justify-content:space-between',
            'gap:12px'
          ].join(';');
          const msgEl = document.createElement('span');
          msgEl.id = 'alloflow-quota-banner-msg';
          const closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.textContent = 'Dismiss ×';
          closeBtn.setAttribute('aria-label', 'Dismiss quota notice');
          closeBtn.style.cssText = 'background:rgba(255,255,255,0.18);color:#fff;border:0;padding:6px 12px;border-radius:6px;cursor:pointer;font:600 13px system-ui,sans-serif';
          closeBtn.onclick = () => {
            try { if (window.sessionStorage) sessionStorage.setItem('__alloflowQuotaBannerDismissed', '1'); } catch (_) {}
            banner.remove();
          };
          banner.appendChild(msgEl);
          banner.appendChild(closeBtn);
          (document.body || document.documentElement).appendChild(banner);
        }
        const msgEl = document.getElementById('alloflow-quota-banner-msg');
        if (msgEl) {
          const prefix = classification.kind === 'auth' ? '🔑 Auth error: '
                       : classification.kind === 'config' ? '⚙ Configuration error: '
                       : '🛑 Quota reached: ';
          msgEl.textContent = prefix + classification.userMessage +
            ' AI-dependent steps (Vision OCR, rewrite, alt-text) will fail until this is resolved. Deterministic fixes still run.';
        }
        try {
          window.dispatchEvent(new CustomEvent('alloflow:quota-exhausted', { detail: window.__alloflowQuotaState }));
        } catch (_) { /* CustomEvent unavailable in old runtimes */ }
      } catch (bannerErr) {
        // Banner is best-effort — never let DOM failures mask the underlying error.
        if (typeof console !== 'undefined') console.warn('[GeminiAPI] Banner failed:', bannerErr.message);
      }
    };

    // ── Model usage ledger ────────────────────────────────────────────────
    // Captures (requested, served) pairs from every successful Gemini call.
    // The 'served' name comes from data.modelVersion in the API response —
    // it's Google's report of which model actually fulfilled the request,
    // which can differ from what we asked for if a model alias was routed
    // (Canvas previews, deprecation routing, etc.). The ledger lets the
    // Model Diagnostics UI show the user the ground truth.
    const _recordModelServed = (requestedModel, servedModel) => {
      if (typeof window === 'undefined') return;
      try {
        window.__alloGeminiModelUsage = window.__alloGeminiModelUsage || {};
        const served = servedModel || '(unreported)';
        const key = requestedModel + ' → ' + served;
        const now = (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;
        const entry = window.__alloGeminiModelUsage[key] || {
          requested: requestedModel,
          served: servedModel || null,
          count: 0,
          firstSeen: now,
          lastSeen: 0,
          divergent: !!(servedModel && servedModel !== requestedModel)
        };
        entry.count++;
        entry.lastSeen = now;
        window.__alloGeminiModelUsage[key] = entry;
      } catch (_) { /* localStorage/window weirdness — best-effort only */ }
    };

    // ── List available models ─────────────────────────────────────────────
    // Hits the Gemini ListModels endpoint. The returned catalog is whatever
    // the current key has access to: in Canvas, that's Canvas's provisioned
    // catalog (often narrower / has preview names not in public GA); in
    // deploy, that's whatever the user's billed key can see. The Model
    // Diagnostics UI calls this once to populate the per-slot dropdowns.
    const listAvailableModels = async () => {
      if (!apiKey && !_isCanvasEnv) {
        return { error: 'No API key configured', models: [], reachable: false };
      }
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models${apiKey ? `?key=${apiKey}` : ''}`;
        const r = await fetch(url, { method: 'GET' });
        if (!r.ok) {
          const body = await r.text().catch(() => '');
          const cls = _classifyGeminiError(new Error(`HTTP ${r.status}: ${body.substring(0, 500)}`));
          return { error: cls.userMessage + ' (HTTP ' + r.status + ')', models: [], reachable: true, httpStatus: r.status, classification: cls };
        }
        const data = await r.json();
        // Normalize: Gemini returns models as { name: "models/X", displayName, supportedGenerationMethods, ... }
        const models = (data.models || []).map(m => ({
          id: (m.name || '').replace(/^models\//, ''),
          displayName: m.displayName || (m.name || '').replace(/^models\//, ''),
          description: m.description || '',
          inputTokenLimit: m.inputTokenLimit || null,
          outputTokenLimit: m.outputTokenLimit || null,
          supportedMethods: m.supportedGenerationMethods || [],
          version: m.version || null
        }));
        return { error: null, models, reachable: true, fetchedAt: (Date.now ? Date.now() : 0) };
      } catch (e) {
        return { error: e.message || 'Network error', models: [], reachable: false };
      }
    };

    // Public throw helper — classify the underlying error, surface the
    // banner if needed, and throw a typed error so call-sites can branch.
    const _throwClassified = (err) => {
      const cls = _classifyGeminiError(err);
      if (cls.kind === 'quota' || cls.kind === 'auth' || cls.kind === 'config') {
        _showQuotaBanner(cls);
        const out = new Error(cls.kind === 'quota' ? 'API_QUOTA_EXHAUSTED'
                            : cls.kind === 'auth' ? 'API_AUTH_FAILED'
                            : 'API_MODEL_NOT_FOUND');
        out.isQuota = cls.kind === 'quota';
        out.isAuth = cls.kind === 'auth';
        out.isConfig = cls.kind === 'config';
        out.classification = cls;
        out.originalMessage = err && err.message;
        throw out;
      }
      throw err;
    };

    const callGemini = async (prompt, jsonMode = false, useSearch = false, temperature = null, searchQuery = null, signal = null, useCodeExecution = false) => {
      if (!apiKey && !_isCanvasEnv) {
        console.warn('[callGemini] No API key available — skipping request.');
        if (jsonMode) return "{}";
        if (useSearch) return { text: "", groundingMetadata: null };
        return "";
      }
      const _buildUrl = (model) => { console.log(`[callGemini] ✉ Using model: ${model}`); return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent${apiKey ? `?key=${apiKey}` : ''}`; };
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            maxOutputTokens: 65536,
            ...(jsonMode ? { responseMimeType: "application/json" } : {}),
            ...(temperature !== null ? { temperature: temperature } : {})
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
        ]
      };
      // ── Canvas search: use WebSearchProvider instead of google_search tool (which 401s) ──
      let _canvasSearchMetadata = null;
      if (useSearch && _isCanvasEnv && window.WebSearchProvider) {
          try {
              const { contextPrompt, groundingMetadata } = await window.WebSearchProvider.search(prompt, 10, searchQuery);
              _canvasSearchMetadata = groundingMetadata;
              if (contextPrompt) {
                  payload.contents[0].parts[0].text = contextPrompt + prompt;
              }
              console.log('[callGemini] Canvas search via WebSearchProvider:', _canvasSearchMetadata ? 'results found' : 'no results');
          } catch (searchErr) {
              console.warn('[callGemini] Canvas WebSearch failed, proceeding without grounding:', searchErr.message);
          }
      } else if (useSearch) {
          payload.tools = [{ google_search: {} }];
      }
      // Phase 1: Gemini code execution — server-side Python sandbox the model
      // can invoke during generation (arithmetic, table lookups, etc.). Caller
      // opts in per-call so audit prompts stay LLM-only.
      if (useCodeExecution) {
          payload.tools = (payload.tools || []).concat([{ code_execution: {} }]);
      }
      try {
        // Pick up either the caller-supplied signal or the ambient pdf-autocontinue
        // signal (set by runAutoFixLoop and read by every nested callGemini during
        // a run, so Stop actually cancels the in-flight fetch instead of just
        // breaking the loop after the request finishes).
        const _signal = signal || (getAbortSignal ? getAbortSignal() : null) || null;
        const _fetchOpts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), ...(_signal ? { signal: _signal } : {}) };
        let response;
        let _modelUsed = GEMINI_MODELS.default;
        try {
          response = await fetchWithExponentialBackoff(_buildUrl(GEMINI_MODELS.default), _fetchOpts);
        } catch (primaryErr) {
          if (primaryErr?.name === 'AbortError') {
            // Respect caller's abort — don't fall back to the secondary model
            // (that would just burn another 30s and another quota slice).
            console.log('[callGemini] Request aborted by caller — propagating.');
            throw primaryErr;
          }
          // Try the fallback model for any retry-friendly class of error:
          // quota throttling (429), permission gate (403), model-not-found
          // (404), or transient network/5xx. Auth (401) does NOT fall back
          // because the fallback model uses the same key.
          const cls = _classifyGeminiError(primaryErr);
          const shouldFallback = (cls.kind === 'quota' || cls.kind === 'config' || cls.kind === 'transient');
          if (shouldFallback && GEMINI_MODELS.fallback && GEMINI_MODELS.fallback !== GEMINI_MODELS.default) {
            console.warn(`[callGemini] Primary model (${GEMINI_MODELS.default}) ${cls.kind} — falling back to ${GEMINI_MODELS.fallback}`);
            try {
              response = await fetchWithExponentialBackoff(_buildUrl(GEMINI_MODELS.fallback), _fetchOpts);
              _modelUsed = GEMINI_MODELS.fallback;
            } catch (fbErr) {
              // Both models failed — the original error is more informative
              // for classification (the fallback's error is usually the same
              // type cascading), so keep the primary in case of quota/auth.
              console.error('[callGemini] Fallback also failed:', fbErr.message);
              const fbCls = _classifyGeminiError(fbErr);
              // If primary was quota/auth/config, prefer the primary's err so
              // _throwClassified shows the right banner kind.
              throw (cls.kind === 'quota' || cls.kind === 'auth' || cls.kind === 'config') ? primaryErr
                  : (fbCls.kind === 'quota' || fbCls.kind === 'auth' || fbCls.kind === 'config') ? fbErr
                  : fbErr;
            }
          } else {
            throw primaryErr;
          }
        }

        const data = await response.json();
        // Record requested→served for the Model Diagnostics UI. data.modelVersion
        // is Google's report of what model fulfilled this request — it can
        // differ from _modelUsed if the API silently routed an alias.
        _recordModelServed(_modelUsed, data.modelVersion);
        if (data.promptFeedback?.blockReason) {
            warnLog("Gemini Prompt Blocked:", data.promptFeedback);
            throw new Error(`Content Blocked: ${data.promptFeedback.blockReason}`);
        }
        // Collect text from every part (code execution responses can interleave
        // text / executable_code / code_execution_result parts — only the text
        // ones are the model's prose; the code/result parts are reasoning that
        // the model already incorporated into the prose).
        const _parts = data.candidates?.[0]?.content?.parts || [];
        let text = _parts.map(p => (typeof p.text === 'string' ? p.text : '')).join('');
        if (!text && _parts[0]?.text !== undefined) text = _parts[0].text;
        if (data.candidates?.[0]?.finishReason) {
             const reason = data.candidates[0].finishReason;
             if (reason === 'MAX_TOKENS') {
                 warnLog("Gemini Generation hit MAX_TOKENS. Result may be truncated.");
             }
             else if (reason === 'MALFORMED_FUNCTION_CALL' && jsonMode) {
                 warnLog("Gemini returned MALFORMED_FUNCTION_CALL. Initiating self-healing JSON repair...");
                 const repairPrompt = `
                     SYSTEM ALERT: You just generated malformed JSON that crashed the application.
                     Your Malformed Output:
                     """
                     ${text || '(empty response)'}
                     """,
                     TASK: Fix the syntax errors (missing commas, unclosed braces, escaped quotes, trailing commas) and return ONLY the valid JSON. Do not explain or add any text.
                 `;
                 return await callGemini(repairPrompt, true, false, 0.1);
             }
             else if (reason !== 'STOP') {
                 throw new Error(`Generation Stopped: ${reason}`);
             }
        }
        // Defensive cleanup: web-search grounding or the LLM cleanup round-trip at
        // content_engine_source.jsx:760 sometimes leaves a broken markdown link near the
        // end of the text (e.g. "[¹⁴](https://www.webmd." + orphan "\n#"). Iterate so
        // the trailing-link $ anchor keeps reaching the actual tail after each peel.
        if (text && typeof text === 'string' && !jsonMode) {
            const before = text.length;
            let prev = null;
            while (prev !== text) {
                prev = text;
                text = text
                    .replace(/[\s\u00a0]+$/, '')
                    .replace(/\n#+\s*$/, '')
                    .replace(/\n[.,;:!?]+\s*$/, '')
                    .replace(/\s*\[[^\]\n]*\]\(https?:\/\/[^\s)\n]*$/, '')
                    .replace(/\s+https?:\/\/[^\s)\n]*$/, '');
            }
            if (text.length !== before) {
                debugLog && debugLog("[callGemini] Trimmed " + (before - text.length) + " chars of truncated trailing content (broken citation link or orphan fragment).");
            }
        }
        if (useSearch) {
            return {
                text: text || "",
                groundingMetadata: (_isCanvasEnv && _canvasSearchMetadata)
                    ? _canvasSearchMetadata
                    : data.candidates?.[0]?.groundingMetadata
            };
        }
        return text || "";
      } catch (err) {
        if (err && err.name === 'AbortError') throw err;
        const cls = _classifyGeminiError(err);
        console.error(`[callGemini] Error caught (${cls.kind}):`, err.message);
        // Refusals are surfaced gracefully — the caller asked for content the
        // model declined to produce. Return a placeholder so the pipeline
        // keeps moving instead of crashing the whole audit.
        if (cls.kind === 'refusal') {
          warnLog("Gemini Model Refusal caught in callGemini (suppressed crash):", err.message);
          if (jsonMode) return "{}";
          if (useSearch) return { text: "Definition unavailable due to content safety filters.", groundingMetadata: null };
          return "Content unavailable due to safety filters.";
        }
        // Quota / auth / config get the banner + a typed error so call-sites
        // can render distinguishable messages instead of lying that every 401
        // is "Daily Usage Limit Reached" (which masked the gemini-3-flash-preview
        // deploy fabrication for weeks).
        if (cls.kind === 'quota' || cls.kind === 'auth' || cls.kind === 'config') {
          _throwClassified(err);
        }
        throw err;
      }
    };

    const callGeminiImageEdit = async (prompt, base64Image, width = 800, qual = 0.9, referenceBase64 = null) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.image}:generateContent${apiKey ? `?key=${apiKey}` : ''}`;
      // Build parts. Only attach inlineData when an actual base64 image is
      // provided — otherwise Gemini receives an inlineData part with
      // `data: undefined`, which silently fails for text-to-image use.
      const parts = [
        { text: prompt }
      ];
      if (base64Image) {
        parts.push({ inlineData: { mimeType: "image/png", data: base64Image } });
      }
      if (referenceBase64) {
        parts.push({ text: "Reference portrait to match:" });
        parts.push({ inlineData: { mimeType: "image/png", data: referenceBase64 } });
      }
      const payload = {
        contents: [{ parts: parts }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
      };
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePart) throw new Error("No image generated in response");
        const rawUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
        return await optimizeImage(rawUrl, width, qual);
      } catch (err) {
        warnLog("Gemini Image Edit Error", err);
        throw err;
      }
    };

    const callGeminiVision = async (prompt, base64Data, mimeType) => {
      const primaryModel = GEMINI_MODELS.vision || GEMINI_MODELS.flash || GEMINI_MODELS.default;
      const fallbackModel = GEMINI_MODELS.fallback;
      const _visionUrl = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent${apiKey ? `?key=${apiKey}` : ''}`;
      const payload = {
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Data } }
          ]
        }],
        generationConfig: { maxOutputTokens: 65536 }
      };
      const _signal = (typeof getAbortSignal === 'function' ? getAbortSignal() : null) || null;
      const _fetchOpts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), ...(_signal ? { signal: _signal } : {}) };
      let response;
      let modelUsed = primaryModel;
      try {
        try {
          // Use the same backoff wrapper callGemini uses — this gives Vision
          // the same 429/5xx retry behavior + signal propagation.
          response = await fetchWithExponentialBackoff(_visionUrl(primaryModel), _fetchOpts);
        } catch (primaryErr) {
          if (primaryErr?.name === 'AbortError') throw primaryErr;
          const cls = _classifyGeminiError(primaryErr);
          const shouldFallback = (cls.kind === 'quota' || cls.kind === 'config' || cls.kind === 'transient');
          if (shouldFallback && fallbackModel && fallbackModel !== primaryModel) {
            console.warn(`[Vision] ${primaryModel} ${cls.kind} — falling back to ${fallbackModel}`);
            try {
              response = await fetchWithExponentialBackoff(_visionUrl(fallbackModel), _fetchOpts);
              modelUsed = fallbackModel;
            } catch (fbErr) {
              console.error(`[Vision] Fallback ${fallbackModel} also failed:`, fbErr.message);
              throw (cls.kind === 'quota' || cls.kind === 'auth' || cls.kind === 'config') ? primaryErr : fbErr;
            }
          } else {
            throw primaryErr;
          }
        }
        const rawText = await response.text();
        let data;
        try {
          data = JSON.parse(rawText);
          _recordModelServed(modelUsed, data && data.modelVersion);
        } catch (parseErr) {
          warnLog("[Vision] Response JSON truncated — attempting partial extraction", parseErr);
          const partialMatch = rawText.match(/"text"\s*:\s*"([\s\S]*?)(?:"|$)/);
          if (partialMatch) {
            const partial = partialMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
            warnLog("[Vision] Recovered partial text:", partial.substring(0, 100));
            return partial + '\n\n[Note: Document was partially extracted. Some content may be missing due to document size.]';
          }
          throw new Error("Vision API returned invalid response. The document may be too large — try a shorter PDF.");
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          const blockReason = data.candidates?.[0]?.finishReason;
          if (blockReason === 'MAX_TOKENS') {
            const partial = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            return partial + '\n\n[Note: Document was partially extracted due to length. Some content may be missing.]';
          }
          throw new Error("No text generated from vision." + (blockReason ? ` Reason: ${blockReason}` : ''));
        }
        return text;
      } catch (err) {
        if (err && err.name === 'AbortError') throw err;
        const cls = _classifyGeminiError(err);
        console.error(`[Vision] ${modelUsed} error (${cls.kind}):`, err.message || err);
        if (cls.kind === 'quota' || cls.kind === 'auth' || cls.kind === 'config') {
          _throwClassified(err);
        }
        throw err;
      }
    };

    // ── Startup smoke probe ───────────────────────────────────────────────
    // Cheapest possible Gemini call — used at app boot to detect when the
    // GEMINI_MODELS map names a model the API doesn't know (the gemini-3
    // fabrication shipped to deploy for weeks because nothing checked at
    // boot). Returns a classification, not a throw.
    const probeModelHealth = async (modelName) => {
      const model = modelName || GEMINI_MODELS.default;
      if (!apiKey && !_isCanvasEnv) return { kind: 'skipped', reason: 'no-api-key', model };
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent${apiKey ? `?key=${apiKey}` : ''}`;
        const probePayload = {
          contents: [{ parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 1 }
        };
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(probePayload)
        });
        if (r.ok) return { kind: 'ok', model };
        const body = await r.text().catch(() => '');
        const cls = _classifyGeminiError(new Error(`HTTP ${r.status}: ${body.substring(0, 500)}`));
        if (cls.kind === 'quota' || cls.kind === 'auth' || cls.kind === 'config') {
          _showQuotaBanner({ ...cls, model: cls.model || model });
        }
        return { ...cls, model };
      } catch (probeErr) {
        return { kind: 'transient', userMessage: probeErr.message, model };
      }
    };

    return { callGemini, callGeminiImageEdit, callGeminiVision, probeModelHealth, listAvailableModels, _classifyGeminiError };
};

// Registration shim — attach factory to window.AlloModules, then trigger the
// monolith's _upgradeGeminiAPI() so the shim-bridge `let` bindings pick up the
// real implementations. Mirrors the AlloData / UtilsPure registration pattern.
if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.createGeminiAPI = createGeminiAPI;
    window.AlloModules.GeminiAPI = true;
    console.log('[GeminiAPI] Factory registered');
    if (typeof window._upgradeGeminiAPI === 'function') {
        window._upgradeGeminiAPI();
    }
}
})();
