(function() {
'use strict';
if (window.AlloModules && window.AlloModules.GeminiAPI) { console.log('[CDN] GeminiAPI already loaded, skipping'); return; }
// gemini_api_source.jsx — Gemini HTTP wrappers for AlloFlow
// Extracted from AlloFlowANTI.txt on 2026-04-24.
// Pure HTTP orchestration — no React state, no module-level mutable state.
// Three functions: callGemini (text/JSON/search), callGeminiVision (multimodal OCR),
// callGeminiImageEdit (image-to-image editing).
// callImagen is intentionally left in the monolith because it uses React refs
// for rate-limit tracking (imagenRateLimitedRef, imagenQueueRef) — not a
// self-contained fit for this extraction.
const createGeminiAPI = deps => {
  const {
    apiKey,
    _isCanvasEnv,
    GEMINI_MODELS,
    fetchWithExponentialBackoff,
    optimizeImage,
    warnLog,
    debugLog,
    getAbortSignal
  } = deps;
  const callGemini = async (prompt, jsonMode = false, useSearch = false, temperature = null, searchQuery = null, signal = null) => {
    if (!apiKey && !_isCanvasEnv) {
      console.warn('[callGemini] No API key available — skipping request.');
      if (jsonMode) return "{}";
      if (useSearch) return {
        text: "",
        groundingMetadata: null
      };
      return "";
    }
    const _buildUrl = model => {
      console.log(`[callGemini] ✉ Using model: ${model}`);
      return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent${apiKey ? `?key=${apiKey}` : ''}`;
    };
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        maxOutputTokens: 65536,
        ...(jsonMode ? {
          responseMimeType: "application/json"
        } : {}),
        ...(temperature !== null ? {
          temperature: temperature
        } : {})
      },
      safetySettings: [{
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_ONLY_HIGH"
      }, {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_ONLY_HIGH"
      }, {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_ONLY_HIGH"
      }, {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_ONLY_HIGH"
      }]
    };
    // ── Canvas search: use WebSearchProvider instead of google_search tool (which 401s) ──
    let _canvasSearchMetadata = null;
    if (useSearch && _isCanvasEnv && window.WebSearchProvider) {
      try {
        const {
          contextPrompt,
          groundingMetadata
        } = await window.WebSearchProvider.search(prompt, 10, searchQuery);
        _canvasSearchMetadata = groundingMetadata;
        if (contextPrompt) {
          payload.contents[0].parts[0].text = contextPrompt + prompt;
        }
        console.log('[callGemini] Canvas search via WebSearchProvider:', _canvasSearchMetadata ? 'results found' : 'no results');
      } catch (searchErr) {
        console.warn('[callGemini] Canvas WebSearch failed, proceeding without grounding:', searchErr.message);
      }
    } else if (useSearch) {
      payload.tools = [{
        google_search: {}
      }];
    }
    try {
      // Pick up either the caller-supplied signal or the ambient pdf-autocontinue
      // signal (set by runAutoFixLoop and read by every nested callGemini during
      // a run, so Stop actually cancels the in-flight fetch instead of just
      // breaking the loop after the request finishes).
      const _signal = signal || (getAbortSignal ? getAbortSignal() : null) || null;
      const _fetchOpts = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        ...(_signal ? {
          signal: _signal
        } : {})
      };
      let response;
      try {
        response = await fetchWithExponentialBackoff(_buildUrl(GEMINI_MODELS.default), _fetchOpts);
      } catch (primaryErr) {
        if (primaryErr?.name === 'AbortError') {
          // Respect caller's abort — don't fall back to the secondary model
          // (that would just burn another 30s and another quota slice).
          console.log('[callGemini] Request aborted by caller — propagating.');
          throw primaryErr;
        }
        const is429 = primaryErr.message && (primaryErr.message.includes('429') || primaryErr.message.includes('RESOURCE_EXHAUSTED') || primaryErr.message.includes('Failed to fetch') || primaryErr.message.includes('403'));
        if (is429 && GEMINI_MODELS.fallback && GEMINI_MODELS.fallback !== GEMINI_MODELS.default) {
          console.warn(`[callGemini] Primary model error — falling back to ${GEMINI_MODELS.fallback}`);
          try {
            response = await fetchWithExponentialBackoff(_buildUrl(GEMINI_MODELS.fallback), _fetchOpts);
          } catch (fbErr) {
            console.error('[callGemini] Fallback also failed:', fbErr.message);
            throw fbErr;
          }
        } else {
          throw primaryErr;
        }
      }
      const data = await response.json();
      if (data.promptFeedback?.blockReason) {
        warnLog("Gemini Prompt Blocked:", data.promptFeedback);
        throw new Error(`Content Blocked: ${data.promptFeedback.blockReason}`);
      }
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (data.candidates?.[0]?.finishReason) {
        const reason = data.candidates[0].finishReason;
        if (reason === 'MAX_TOKENS') {
          warnLog("Gemini Generation hit MAX_TOKENS. Result may be truncated.");
        } else if (reason === 'MALFORMED_FUNCTION_CALL' && jsonMode) {
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
        } else if (reason !== 'STOP') {
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
          text = text.replace(/[\s\u00a0]+$/, '').replace(/\n#+\s*$/, '').replace(/\n[.,;:!?]+\s*$/, '').replace(/\s*\[[^\]\n]*\]\(https?:\/\/[^\s)\n]*$/, '').replace(/\s+https?:\/\/[^\s)\n]*$/, '');
        }
        if (text.length !== before) {
          debugLog && debugLog("[callGemini] Trimmed " + (before - text.length) + " chars of truncated trailing content (broken citation link or orphan fragment).");
        }
      }
      if (useSearch) {
        return {
          text: text || "",
          groundingMetadata: _isCanvasEnv && _canvasSearchMetadata ? _canvasSearchMetadata : data.candidates?.[0]?.groundingMetadata
        };
      }
      return text || "";
    } catch (err) {
      const isActualQuota = err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED'));
      console.error('[callGemini] Error caught:', err.message);
      if (isActualQuota) {
        const quotaErr = new Error('API_QUOTA_EXHAUSTED');
        quotaErr.isQuota = true;
        throw quotaErr;
      }
      if (err.message && err.message.includes("401")) throw new Error("Daily Usage Limit Reached.");
      const isRefusal = err.message && (err.message.includes("Content Blocked") || err.message.includes("finishReason: OTHER") || err.message.includes("Refusal") || err.message.includes("Generation Stopped"));
      if (isRefusal) {
        warnLog("Gemini Model Refusal caught in callGemini (suppressed crash):", err.message);
        if (jsonMode) {
          return "{}";
        } else {
          if (useSearch) return {
            text: "Definition unavailable due to content safety filters.",
            groundingMetadata: null
          };
          return "Content unavailable due to safety filters.";
        }
      }
      throw err;
    }
  };
  const callGeminiImageEdit = async (prompt, base64Image, width = 800, qual = 0.9, referenceBase64 = null) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.image}:generateContent${apiKey ? `?key=${apiKey}` : ''}`;
    const parts = [{
      text: prompt
    }, {
      inlineData: {
        mimeType: "image/png",
        data: base64Image
      }
    }];
    if (referenceBase64) {
      parts.push({
        text: "Reference portrait to match:"
      });
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: referenceBase64
        }
      });
    }
    const payload = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
    const model = GEMINI_MODELS.flash;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent${apiKey ? `?key=${apiKey}` : ''}`;
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }, {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: base64Data
          }
        }]
      }],
      generationConfig: {
        maxOutputTokens: 65536
      }
    };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        console.error(`[Vision] ${model} HTTP ${response.status}:`, errText.substring(0, 500));
        throw new Error(`Vision API HTTP ${response.status}: ${errText.substring(0, 200)}`);
      }
      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
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
      console.error(`[Vision] ${model} error:`, err.message || err);
      throw err;
    }
  };
  // callGeminiAudio (Phase 3v.4 / 3b.voice) — multimodal audio analysis.
  // Sends audio + text prompt to Gemini in a single request; returns the
  // model's text response. Used by voice_module.js's transcribeAudio
  // (engine='gemini') and gradeAudioJustification (single-call audio
  // → transcript + score + ack + follow-up).
  //
  // Strips the "data:audio/...;base64," prefix recordAudioBlob leaves on
  // the data URI; updates mimeType from the prefix when present so the
  // caller can pass either form.
  const callGeminiAudio = async (prompt, base64Audio, opts = {}) => {
    let mimeType = opts.mimeType || 'audio/webm';
    let cleanData = base64Audio || '';
    const m = cleanData.match(/^data:([^;]+);base64,(.+)$/);
    if (m) { mimeType = m[1] || mimeType; cleanData = m[2]; }
    const model = GEMINI_MODELS.flash;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent${apiKey ? `?key=${apiKey}` : ''}`;
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: cleanData } }
        ]
      }],
      generationConfig: { maxOutputTokens: 4096 }
    };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Gemini audio API error ${response.status}: ${errText}`);
      }
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const blockReason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason;
      if (!text && blockReason) {
        throw new Error(`No text generated from audio. Reason: ${blockReason}`);
      }
      return text;
    } catch (err) {
      console.error('[Audio] error:', err.message || err);
      throw err;
    }
  };
  return {
    callGemini,
    callGeminiImageEdit,
    callGeminiVision,
    callGeminiAudio
  };
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
