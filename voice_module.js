(function () {
  if (window.AlloFlowVoice) {
    console.log('[CDN] AlloFlowVoice already loaded, skipping duplicate');
    return;
  }

  // ═══════════════════════════════════════════
  // voice_module.js — shared voice-input infrastructure for AlloFlow
  //
  // Top-level module (sibling to allohaven_module.js, symbol_studio_module.js).
  // The end goal is to consolidate dictation + audio capture surfaces that
  // currently live as 7+ inline reimplementations across:
  //   - allohaven_module.js (voice notes + reflection)
  //   - story_forge_module.js (useDictation hook)
  //   - behavior_lens_module.js
  //   - word_sounds_module.js (phoneme dictation)
  //   - sel_hub/sel_tool_sociallab.js
  //   - sel_hub/sel_tool_peersupport.js
  //   - stem_lab/stem_tool_llm_literacy.js
  //   - adaptive_controller_module.js (gamepad fallback)
  //
  // Plus 4+ MediaRecorder surfaces that should converge:
  //   - allohaven_module.js (voice notes)
  //   - story_forge_module.js (useAudioRecorder)
  //   - story_stage_module.js
  //   - symbol_studio_module.js
  //   - stem_lab/stem_tool_oratory.js
  //
  // This module ships as a ladder:
  //   3v.1 (this commit) — initWebSpeechCapture + isSupported + namespace.
  //                        No migration of existing tools yet; they continue
  //                        with inline implementations until separately
  //                        migrated. New code (the upcoming Boss Encounters
  //                        plugin) imports from here directly.
  //   3v.2 — recordAudioBlob (unified MediaRecorder pipeline) + Voice Quality
  //          preference UI in AlloHaven Settings.
  //   3v.3 — Xenova/Whisper integration via @xenova/transformers, lazy load
  //          model on opt-in, IndexedDB cache, progress UI.
  //   3v.4 — Audio input added to callGemini in ai_backend_module.js;
  //          gradeAudioJustification helper that does transcribe+grade in one
  //          API call (the primary path for arcade Boss Encounter justifications).
  //   3v.M — Migration sweep: replace inline SpeechRecognition + MediaRecorder
  //          across the 7+ surfaces above. ~2-3 lines per tool instead of 40-80.
  //
  // Persistence: voice quality preference stored in
  // localStorage['alloflow_voice_pref'] so it survives across tools and modules.
  // ═══════════════════════════════════════════

  var VOICE_PREF_KEY = 'alloflow_voice_pref';

  function loadPreference() {
    try {
      var raw = localStorage.getItem(VOICE_PREF_KEY);
      if (!raw) return defaultPreference();
      var parsed = JSON.parse(raw);
      return Object.assign(defaultPreference(), parsed);
    } catch (err) {
      return defaultPreference();
    }
  }

  function defaultPreference() {
    return {
      // 'auto' picks the best-available engine in this order:
      //   whisper (if model loaded) → gemini (if connectivity + audio API) → web-speech → off
      // 'best' forces Whisper (downloads if not cached). Costs bandwidth.
      // 'fast' forces Web Speech API. Free per-call but Google-routed in Chrome.
      // 'gemini' forces Gemini multimodal audio. Per-turn cost; highest quality
      //   on a turn-by-turn basis without local model storage.
      // 'off' disables all voice input. Mic buttons hide; text input only.
      engine: 'auto',
      whisperTier: 'tiny',  // 'tiny' | 'base' | 'small'
      lang: 'en-US'
    };
  }

  function savePreference(prefs) {
    try {
      var current = loadPreference();
      var merged = Object.assign({}, current, prefs || {});
      localStorage.setItem(VOICE_PREF_KEY, JSON.stringify(merged));
      return merged;
    } catch (err) {
      return loadPreference();
    }
  }

  // Feature detection — the underlying capabilities. Engines layer on top.
  function getCapabilities() {
    var caps = {
      webSpeech: false,
      mediaRecorder: false,
      webGPU: false,
      indexedDB: false,
      whisperLoaded: false   // flipped true by 3v.3 once @xenova/transformers loads a model
    };
    if (typeof window === 'undefined') return caps;
    caps.webSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    caps.mediaRecorder = typeof window.MediaRecorder !== 'undefined';
    caps.webGPU = !!(navigator && navigator.gpu);
    caps.indexedDB = typeof window.indexedDB !== 'undefined';
    return caps;
  }

  // ── initWebSpeechCapture ──────────────────────────────────────────
  // The unified Web Speech API wrapper. Replaces the 7+ inline
  // reimplementations across tools. Returns a controller with
  // start() and stop() methods so each call site gets independent
  // session control.
  //
  // opts (all optional):
  //   lang: 'en-US' (default)
  //   continuous: true (default — keep listening until stop)
  //   interimResults: false (default — only final transcripts)
  //   onTranscript(text, isFinal): fires per result event
  //   onError(err): fires on recognition error
  //   onEnd(): fires when the recognition session ends naturally
  //   restartOnEnd: false (default — set true for "always-on" surfaces)
  //
  // Returns:
  //   { start(), stop(), isActive(), supported, restart() }
  //
  // start() returns true if the session began; false if not supported
  //   or if an error occurred during construction.
  // stop() ends the session immediately; idempotent.
  // restart() stops + starts (used internally if restartOnEnd=true).
  function initWebSpeechCapture(opts) {
    opts = opts || {};
    var caps = getCapabilities();
    if (!caps.webSpeech) {
      return {
        supported: false,
        isActive: function () { return false; },
        start: function () { return false; },
        stop: function () { /* noop */ },
        restart: function () { return false; }
      };
    }

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var rec = null;
    var active = false;

    // Settings — store on the controller so restart re-applies them.
    var settings = {
      lang: opts.lang || 'en-US',
      continuous: opts.continuous !== false, // default true
      interimResults: !!opts.interimResults,
      restartOnEnd: !!opts.restartOnEnd
    };

    function buildRec() {
      var r = new SR();
      r.continuous = settings.continuous;
      r.interimResults = settings.interimResults;
      r.lang = settings.lang;

      // Aggregates result text per event, mirroring the AlloHaven pattern.
      // For one-shot mode (continuous=false, interimResults=false), the
      // resultIndex+results[] structure is still preferred — onresult will
      // fire once with a single final result.
      r.onresult = function (event) {
        if (typeof opts.onTranscript !== 'function') return;
        var transcript = '';
        var isFinal = false;
        for (var i = event.resultIndex; i < event.results.length; i++) {
          var res = event.results[i];
          if (res && res[0]) transcript += res[0].transcript || '';
          if (res && res.isFinal) isFinal = true;
        }
        if (transcript) opts.onTranscript(transcript, isFinal);
      };

      r.onerror = function (e) {
        if (typeof opts.onError === 'function') opts.onError(e);
        else console.warn('[Voice] speech recognition error:', e);
        active = false;
      };

      r.onend = function () {
        active = false;
        if (typeof opts.onEnd === 'function') opts.onEnd();
        if (settings.restartOnEnd) {
          // Defer one tick so the browser releases mic before re-acquire.
          setTimeout(function () {
            if (!active) {
              try { startInternal(); } catch (err) { /* ignore */ }
            }
          }, 50);
        }
      };

      return r;
    }

    function startInternal() {
      if (active) return true;
      try {
        rec = buildRec();
        rec.start();
        active = true;
        return true;
      } catch (err) {
        if (typeof opts.onError === 'function') opts.onError(err);
        else console.warn('[Voice] could not start speech recognition:', err);
        active = false;
        return false;
      }
    }

    function stopInternal() {
      if (rec) {
        try { rec.stop(); } catch (err) { /* ignore */ }
        rec = null;
      }
      active = false;
    }

    return {
      supported: true,
      isActive: function () { return active; },
      start: startInternal,
      stop: stopInternal,
      restart: function () { stopInternal(); return startInternal(); }
    };
  }

  // ── Stubs for upcoming phases ──────────────────────────────────────
  // These are documented placeholders so call sites can already check
  // capability today; concrete implementations land in 3v.2 / 3v.3 / 3v.4.

  function recordAudioBlob(opts) {
    // Phase 3v.2 — unified MediaRecorder pipeline.
    // Will return a Promise<{ base64, mimeType, durationMs }>.
    if (typeof console !== 'undefined') {
      console.warn('[Voice] recordAudioBlob not yet implemented (Phase 3v.2). Use inline MediaRecorder for now.');
    }
    return Promise.reject(new Error('voice.recordAudioBlob not yet implemented'));
  }

  function transcribeAudio(audioBase64, opts) {
    // Phase 3v.3 + 3v.4 — routes audio to the configured engine.
    // Returns a Promise<{ transcript, engine, durationMs }>.
    if (typeof console !== 'undefined') {
      console.warn('[Voice] transcribeAudio not yet implemented (Phase 3v.3+).');
    }
    return Promise.reject(new Error('voice.transcribeAudio not yet implemented'));
  }

  function gradeAudioJustification(audioBase64, rubric, opts) {
    // Phase 3v.4 — the primary path for arcade Boss Encounter justifications.
    // Sends audio + rubric to Gemini multimodal in a single call;
    // returns Promise<{ transcript, score, ackText, followUp }>.
    // Collapses transcription + grading into one API hit.
    if (typeof console !== 'undefined') {
      console.warn('[Voice] gradeAudioJustification not yet implemented (Phase 3v.4).');
    }
    return Promise.reject(new Error('voice.gradeAudioJustification not yet implemented'));
  }

  // ── Public API ─────────────────────────────────────────────────────
  window.AlloFlowVoice = {
    // Phase 3v.1 — shipped
    initWebSpeechCapture: initWebSpeechCapture,
    getCapabilities: getCapabilities,
    loadPreference: loadPreference,
    savePreference: savePreference,
    defaultPreference: defaultPreference,

    // Phase 3v.2+ — stubs
    recordAudioBlob: recordAudioBlob,
    transcribeAudio: transcribeAudio,
    gradeAudioJustification: gradeAudioJustification,

    // Phase / version markers — let callers detect what's actually wired.
    _phase: '3v.1',
    _shipped: ['initWebSpeechCapture', 'getCapabilities', 'loadPreference', 'savePreference']
  };

  if (typeof console !== 'undefined') {
    console.log('[Voice] AlloFlowVoice loaded — phase 3v.1');
  }
})();
