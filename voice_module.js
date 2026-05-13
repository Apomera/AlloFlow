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
      whisperLoaded: false,
      whisperLoadedTier: null,
      dynamicImport: false
    };
    if (typeof window === 'undefined') return caps;
    caps.webSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    caps.mediaRecorder = typeof window.MediaRecorder !== 'undefined';
    caps.webGPU = !!(navigator && navigator.gpu);
    caps.indexedDB = typeof window.indexedDB !== 'undefined';
    // dynamic import() availability — needed for the @xenova/transformers
    // ESM CDN load. Roughly equivalent to "modern evergreen browser".
    try {
      // Construct (don't invoke) a function whose body uses dynamic import
      // syntax. If the engine's parser doesn't support it, the Function
      // constructor throws SyntaxError. This keeps voice_module.js parseable
      // in older environments while still detecting modern capability.
      new Function('u', 'return import(u)');
      caps.dynamicImport = true;
    } catch (e) {
      caps.dynamicImport = false;
    }
    caps.whisperLoaded = !!whisperPipeline;
    caps.whisperLoadedTier = whisperLoadedTier;
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

      // Result handler — invokes whichever callbacks the caller supplied.
      // Supports two modes (independent; either or both can be wired):
      //   onTranscript(text, isFinal): simple aggregated transcript +
      //     boolean isFinal flag. Mirrors the AlloHaven pattern.
      //   onRichResult({ final, interim, fullEvent }): separates final
      //     and interim transcripts so callers can render in-progress
      //     dictation indicators (used by behavior_lens, story_forge,
      //     llm_literacy migrations in Phase 3v.M).
      // Both callbacks fire on the same event when both are provided.
      r.onresult = function (event) {
        var hasSimple = typeof opts.onTranscript === 'function';
        var hasRich = typeof opts.onRichResult === 'function';
        if (!hasSimple && !hasRich) return;
        var transcript = '';
        var finalText = '';
        var interimText = '';
        var sawFinal = false;
        for (var i = event.resultIndex; i < event.results.length; i++) {
          var res = event.results[i];
          if (!res || !res[0]) continue;
          var chunk = res[0].transcript || '';
          transcript += chunk;
          if (res.isFinal) { finalText += chunk; sawFinal = true; }
          else interimText += chunk;
        }
        if (hasSimple && transcript) {
          opts.onTranscript(transcript, sawFinal);
        }
        if (hasRich) {
          opts.onRichResult({
            final: finalText,
            interim: interimText,
            fullEvent: event
          });
        }
      };

      r.onerror = function (e) {
        if (typeof opts.onError === 'function') opts.onError(e);
        else console.warn('[Voice] speech recognition error:', e);
        active = false;
      };

      r.onend = function () {
        active = false;
        if (typeof opts.onEnd === 'function') opts.onEnd();
        if (settings.restartOnEnd && !intentionallyStopped) {
          // Defer one tick so the browser releases mic before re-acquire.
          // The intentionallyStopped guard prevents user-initiated stops
          // from auto-restarting (the caller asked to stop; respect it).
          setTimeout(function () {
            if (!active && !intentionallyStopped) {
              try { startInternal(); } catch (err) { /* ignore */ }
            }
          }, 50);
        }
      };

      return r;
    }

    // intentionallyStopped tracks whether stopInternal() was called by the
    // caller (vs. the browser ending the session naturally on silence).
    // restartOnEnd reads this so user-initiated stops don't trigger a
    // restart loop. Without this guard, calling stop() would still
    // restart after the 50ms timeout because active is just a transient
    // flag, not an intent flag. (Caught during the Phase 3v.M
    // story_forge migration.)
    var intentionallyStopped = false;

    function startInternal() {
      if (active) return true;
      try {
        intentionallyStopped = false;
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
      intentionallyStopped = true;
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

  // ── recordAudioBlob ───────────────────────────────────────────────
  // Unified MediaRecorder pipeline. Returns a controller object whose
  // .result property is a Promise resolving when recording stops
  // (either via .stop() or maxDurationMs auto-stop).
  //
  // opts (all optional):
  //   maxDurationMs: hard cap (default 60_000). Auto-stops at this point.
  //   preferredMimeType: 'audio/webm;codecs=opus' (default).
  //     Falls back through 'audio/webm', 'audio/mp4', then browser default.
  //   onTick(elapsedMs): fires every ~100ms while recording.
  //   onLevel(level0to1): fires per audio level update (deferred —
  //     needs Web Audio analyser; stubbed for now to keep this commit small).
  //   onError(err): fires on recording error (mic denied, etc.).
  //   onStream(stream): fires once getUserMedia resolves, before the
  //     MediaRecorder is constructed. Callers who need raw stream access
  //     (e.g. Oratory's prosody analyser) wire AudioContext + AnalyserNode
  //     inside this callback. Stream lifecycle is owned by recordAudioBlob;
  //     callers must close their own AudioContext when result resolves.
  //
  // Returns:
  //   { stop(), cancel(), isRecording(), result, mimeType, supported }
  //
  // .result resolves with { base64, blob, mimeType, durationMs, size, stopReason }.
  // .cancel() ends without resolving (rejects with 'cancelled').
  function recordAudioBlob(opts) {
    opts = opts || {};
    var caps = getCapabilities();
    if (!caps.mediaRecorder) {
      return {
        supported: false,
        isRecording: function () { return false; },
        stop: function () { /* noop */ },
        cancel: function () { /* noop */ },
        result: Promise.reject(new Error('MediaRecorder not supported in this browser'))
      };
    }

    var maxDurationMs = typeof opts.maxDurationMs === 'number' ? opts.maxDurationMs : 60000;
    var preferredMime = opts.preferredMimeType || 'audio/webm;codecs=opus';
    var fallbackChain = [preferredMime, 'audio/webm', 'audio/mp4', ''];

    var stream = null;
    var rec = null;
    var chunks = [];
    var startedAt = 0;
    var stopReason = null;            // 'stop' | 'auto' | 'cancel' | null
    var tickInterval = null;
    var maxDurationTimer = null;
    var isRec = false;
    var resolveResult, rejectResult;

    var resultPromise = new Promise(function (res, rej) {
      resolveResult = res;
      rejectResult = rej;
    });

    function pickMime() {
      for (var i = 0; i < fallbackChain.length; i++) {
        var m = fallbackChain[i];
        if (m === '' || (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m))) {
          return m;
        }
      }
      return '';
    }

    function cleanup() {
      if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
      if (maxDurationTimer) { clearTimeout(maxDurationTimer); maxDurationTimer = null; }
      if (stream) {
        try {
          stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) { /* ignore */ } });
        } catch (e) { /* ignore */ }
        stream = null;
      }
    }

    function blobToBase64(blob) {
      return new Promise(function (res, rej) {
        var reader = new FileReader();
        reader.onloadend = function () { res(reader.result); };
        reader.onerror = function () { rej(new Error('Could not read audio blob')); };
        reader.readAsDataURL(blob);
      });
    }

    function startInternal() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        var err = new Error('Microphone access not available in this browser');
        if (typeof opts.onError === 'function') opts.onError(err);
        rejectResult(err);
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
        stream = s;
        // Fire onStream BEFORE constructing the MediaRecorder so callers
        // (e.g. Oratory) can wire AudioContext + AnalyserNode against the
        // raw stream. We swallow callback errors so a misbehaving observer
        // can't break the recording path.
        if (typeof opts.onStream === 'function') {
          try { opts.onStream(stream); } catch (e) { /* ignore observer error */ }
        }
        var mime = pickMime();
        try {
          rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        } catch (constructErr) {
          // Some browsers reject the explicit mimeType; retry with default.
          try { rec = new MediaRecorder(stream); }
          catch (fallbackErr) {
            cleanup();
            if (typeof opts.onError === 'function') opts.onError(fallbackErr);
            rejectResult(fallbackErr);
            return;
          }
        }
        rec.ondataavailable = function (ev) {
          if (ev.data && ev.data.size > 0) chunks.push(ev.data);
        };
        rec.onstop = function () {
          var durationMs = Date.now() - startedAt;
          var actualMime = (rec && rec.mimeType) || mime || 'audio/webm';
          var blob = new Blob(chunks, { type: actualMime });
          cleanup();
          isRec = false;
          if (stopReason === 'cancel') {
            rejectResult(new Error('cancelled'));
            return;
          }
          blobToBase64(blob).then(function (base64) {
            resolveResult({
              base64: base64,
              blob: blob,
              mimeType: actualMime,
              durationMs: durationMs,
              size: blob.size,
              stopReason: stopReason || 'stop'
            });
          }).catch(function (err) {
            rejectResult(err);
          });
        };
        rec.onerror = function (ev) {
          if (typeof opts.onError === 'function') opts.onError(ev);
        };
        startedAt = Date.now();
        isRec = true;
        try { rec.start(100); /* request a chunk every 100ms */ }
        catch (e) {
          // Some browsers reject the timeslice arg; retry without
          try { rec.start(); } catch (e2) {
            cleanup();
            if (typeof opts.onError === 'function') opts.onError(e2);
            rejectResult(e2);
            return;
          }
        }
        // Tick callback for elapsed-time UI
        if (typeof opts.onTick === 'function') {
          tickInterval = setInterval(function () {
            try { opts.onTick(Date.now() - startedAt); } catch (err) { /* ignore */ }
          }, 100);
        }
        // Auto-stop at max duration
        maxDurationTimer = setTimeout(function () {
          if (isRec) { stopReason = 'auto'; try { rec.stop(); } catch (e) { /* ignore */ } }
        }, maxDurationMs);
      }).catch(function (err) {
        cleanup();
        var msg = (err && err.name === 'NotAllowedError')
          ? 'Microphone access denied. Enable it in your browser settings to use voice input.'
          : (err && err.message) || 'Could not start microphone';
        var wrapped = new Error(msg);
        wrapped.original = err;
        if (typeof opts.onError === 'function') opts.onError(wrapped);
        rejectResult(wrapped);
      });
    }

    function stopExternal() {
      if (!isRec || !rec) return;
      stopReason = 'stop';
      try { rec.stop(); } catch (e) { /* ignore */ }
    }

    function cancelExternal() {
      if (!isRec) return;
      stopReason = 'cancel';
      try { if (rec) rec.stop(); } catch (e) { /* ignore */ }
      cleanup();
    }

    // Kick off the capture; the controller is returned synchronously
    // so the caller can stop/cancel even before the mic permission
    // resolves.
    startInternal();

    return {
      supported: true,
      isRecording: function () { return isRec; },
      stop: stopExternal,
      cancel: cancelExternal,
      result: resultPromise,
      mimeType: preferredMime
    };
  }

  // ── Whisper integration (Phase 3v.3) ───────────────────────────────
  // Lazy-loads @xenova/transformers from a CDN ESM build the first time
  // a Whisper-tier engine is invoked. Caches the loaded pipeline + the
  // model files (transformers.js stores the model weights in IndexedDB
  // automatically). Subsequent transcription calls are offline-capable
  // once the model is cached.
  //
  // Audio handling: we pass the data URI directly to the transcriber.
  // Internally transformers.js decodes via Web Audio + resamples to
  // 16 kHz mono (Whisper's expected input). No manual resampling needed.

  var TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
  var transformersModulePromise = null;
  var whisperPipeline = null;
  var whisperLoadingPromise = null;
  var whisperLoadedTier = null;
  var progressObservers = [];

  function notifyProgress(payload) {
    for (var i = 0; i < progressObservers.length; i++) {
      try { progressObservers[i](payload); } catch (e) { /* ignore observer errors */ }
    }
  }

  // Subscribe to Whisper load + transcription progress events.
  // Returns an unsubscribe function. Events:
  //   { phase: 'transformers-fetch' }
  //   { phase: 'model-fetch-progress', file, progress (0-100), loaded, total }
  //   { phase: 'model-loaded', tier }
  //   { phase: 'model-error', tier, error }
  //   { phase: 'transcribe-start', tier }
  //   { phase: 'transcribe-done', tier, transcript }
  function subscribeToVoiceProgress(cb) {
    if (typeof cb !== 'function') return function () {};
    progressObservers.push(cb);
    return function () {
      var idx = progressObservers.indexOf(cb);
      if (idx !== -1) progressObservers.splice(idx, 1);
    };
  }

  // Dynamic-import shim — wraps the import() call in a Function constructor
  // so this file itself parses cleanly on browsers that don't support
  // dynamic-import syntax. Without this, voice_module.js would throw
  // SyntaxError at parse time on older browsers and the whole module
  // would fail to load.
  function dynamicImport(url) {
    try {
      var fn = new Function('u', 'return import(u)');
      return fn(url);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function loadTransformersModule() {
    if (transformersModulePromise) return transformersModulePromise;
    notifyProgress({ phase: 'transformers-fetch' });
    // Dynamic ESM import via the shim. jsdelivr is widely allowlisted
    // in education contexts; if a CSP blocks it the rejection bubbles
    // up cleanly with a Web Speech / text fallback path available.
    transformersModulePromise = dynamicImport(TRANSFORMERS_CDN + '/+esm')
      .catch(function (err) {
        transformersModulePromise = null; // allow retry
        throw err;
      });
    return transformersModulePromise;
  }

  function loadWhisperModel(tier) {
    tier = tier || 'tiny';
    if (whisperPipeline && whisperLoadedTier === tier) {
      return Promise.resolve(whisperPipeline);
    }
    // If a different tier is already loaded, drop it; we don't keep
    // multiple models in memory.
    if (whisperLoadingPromise && whisperLoadedTier === tier) {
      return whisperLoadingPromise;
    }
    whisperPipeline = null;
    whisperLoadedTier = tier;
    whisperLoadingPromise = loadTransformersModule().then(function (transformers) {
      var modelId = 'Xenova/whisper-' + tier + '.en';
      return transformers.pipeline('automatic-speech-recognition', modelId, {
        quantized: true,
        progress_callback: function (p) {
          // p.status: 'progress' | 'done' | 'ready' | 'initiate' | 'download'
          // p.file, p.progress, p.loaded, p.total
          notifyProgress({
            phase: 'model-fetch-progress',
            tier: tier,
            file: p && p.file,
            status: p && p.status,
            progress: typeof p.progress === 'number' ? p.progress : null,
            loaded: p && p.loaded,
            total: p && p.total
          });
        }
      });
    }).then(function (pipe) {
      whisperPipeline = pipe;
      notifyProgress({ phase: 'model-loaded', tier: tier });
      return pipe;
    }).catch(function (err) {
      whisperLoadingPromise = null;
      whisperLoadedTier = null;
      notifyProgress({ phase: 'model-error', tier: tier, error: err });
      throw err;
    });
    return whisperLoadingPromise;
  }

  // Public preloader — call this from Settings UI when user clicks
  // "Load Whisper" so the model fetches without performing a transcribe.
  function preloadWhisper(tier) {
    return loadWhisperModel(tier);
  }

  function isWhisperLoaded(tier) {
    if (!whisperPipeline) return false;
    if (tier && whisperLoadedTier !== tier) return false;
    return true;
  }

  function getLoadedWhisperTier() {
    return whisperLoadedTier;
  }

  // ── transcribeAudio ───────────────────────────────────────────────
  // Routes audio to the configured engine. Phase 3v.3 wires the
  // Whisper path; Web Speech is reachable via initWebSpeechCapture
  // for live continuous transcription; Gemini multimodal arrives in
  // 3v.4. The 'auto' engine picks the first available in this order:
  //   loaded Whisper → Gemini (when shipped) → Web Speech.
  //
  // opts:
  //   engine: 'auto' | 'whisper' | 'webspeech' (overrides preference)
  //   tier:   'tiny' | 'base' | 'small' (Whisper model tier)
  //   lang:   'en-US' (default)
  //
  // Returns Promise<{ transcript, engine, durationMs, audioMimeType? }>.
  function transcribeAudio(audioBase64, opts) {
    opts = opts || {};
    var prefs = loadPreference();
    var engine = opts.engine || prefs.engine || 'auto';
    var tier = opts.tier || prefs.whisperTier || 'tiny';
    if (!audioBase64) {
      return Promise.reject(new Error('No audio data provided'));
    }

    function runWhisper() {
      var startedAt = Date.now();
      return loadWhisperModel(tier).then(function (transcriber) {
        notifyProgress({ phase: 'transcribe-start', tier: tier });
        return transcriber(audioBase64, {
          language: 'english',
          task: 'transcribe',
          return_timestamps: false
        });
      }).then(function (output) {
        var text = (output && output.text) ? output.text.trim() : '';
        notifyProgress({ phase: 'transcribe-done', tier: tier, transcript: text });
        return {
          transcript: text,
          engine: 'whisper-' + tier,
          durationMs: Date.now() - startedAt
        };
      });
    }

    // 'whisper' or 'best' explicitly requests Whisper.
    if (engine === 'whisper' || engine === 'best') {
      return runWhisper();
    }

    // 'auto' — prefer Whisper if a model is already loaded; otherwise
    // fail back to indicating that an inline live transcription path
    // (initWebSpeechCapture) should be used by the caller. We do NOT
    // auto-download a Whisper model on auto — that would surprise users
    // with a 75–500 MB fetch.
    if (engine === 'auto') {
      if (isWhisperLoaded()) return runWhisper();
      return Promise.reject(new Error(
        'Whisper not loaded. Use initWebSpeechCapture for live transcription, ' +
        'or call preloadWhisper(tier) first to download the model.'
      ));
    }

    if (engine === 'gemini') {
      var callGeminiAudio = opts.callGeminiAudio;
      if (typeof callGeminiAudio !== 'function') {
        return Promise.reject(new Error(
          'engine=\'gemini\' requires opts.callGeminiAudio. ' +
          'The caller (e.g. arcade plugin) must thread its AI bridge through.'
        ));
      }
      var startedAtG = Date.now();
      var transcriptPrompt =
        'Transcribe the spoken audio to text. ' +
        'Respond with ONLY the transcript, no commentary, no quotes, no leading "Transcript:" label.';
      return callGeminiAudio(transcriptPrompt, audioBase64, { mimeType: opts.mimeType || 'audio/webm' })
        .then(function (text) {
          var transcript = (typeof text === 'string') ? text.trim() : '';
          // Strip a wrapping "Transcript:" label if the model added one anyway
          transcript = transcript.replace(/^transcript\s*:\s*/i, '');
          // Strip wrapping quotes
          if (transcript.length >= 2 && (
            (transcript.charAt(0) === '"' && transcript.charAt(transcript.length - 1) === '"') ||
            (transcript.charAt(0) === '“' && transcript.charAt(transcript.length - 1) === '”')
          )) {
            transcript = transcript.slice(1, -1).trim();
          }
          return {
            transcript: transcript,
            engine: 'gemini-audio',
            durationMs: Date.now() - startedAtG
          };
        });
    }

    if (engine === 'fast' || engine === 'webspeech') {
      // Web Speech API doesn't transcribe a stored blob — it only does
      // live capture. Direct callers to initWebSpeechCapture for that
      // surface; this transcribeAudio function is for stored audio.
      return Promise.reject(new Error(
        'Web Speech API does not support transcribing stored audio. ' +
        'Use initWebSpeechCapture for live transcription instead.'
      ));
    }

    if (engine === 'off') {
      return Promise.reject(new Error('Voice input is set to Off in Settings.'));
    }

    return Promise.reject(new Error('Unknown engine: ' + engine));
  }

  // ── Gemini multimodal audio (Phase 3v.4) ──────────────────────────
  // Sends audio + a structured rubric prompt to Gemini in a single call.
  // The model returns transcript + 1-20 score + ack + follow-up as JSON,
  // which we parse and return. Primary path for arcade Boss Encounter
  // justification grading — collapses transcription + grading into one
  // API hit, saving the second LLM round-trip vs. a separate
  // Whisper-then-grade pipeline.
  //
  // The caller wires the actual API access via opts.callGeminiAudio,
  // which is expected to be a function (prompt, audioBase64, opts) =>
  // Promise<string>. This keeps voice_module decoupled from any
  // specific AI provider instance — the consumer (e.g. Boss Encounter
  // arcade plugin) plumbs its existing AI helper through.
  //
  // opts:
  //   callGeminiAudio (required): the AI bridge function
  //   rubric: { conceptName, conceptDef, cardName, cardSource ('decoration'|'glossary'),
  //             tier ('Domain-Specific'|'Academic'|'Tier 2'|'Tier 3'),
  //             actionVerb (optional), bossTopic (optional) }
  //   mimeType: 'audio/webm' (default; matches recordAudioBlob output)
  //
  // Returns Promise<{
  //   transcript: string,
  //   score: number 1-20,
  //   ackText: string,    // always-supportive acknowledgement
  //   followUp: string,   // one optional follow-up question
  //   engine: 'gemini-audio',
  //   raw: string         // raw model response for debugging
  // }>
  function gradeAudioJustification(audioBase64, rubric, opts) {
    opts = opts || {};
    rubric = rubric || {};
    var callGeminiAudio = opts.callGeminiAudio;
    if (typeof callGeminiAudio !== 'function') {
      return Promise.reject(new Error('gradeAudioJustification requires opts.callGeminiAudio'));
    }
    if (!audioBase64) {
      return Promise.reject(new Error('No audio data provided'));
    }

    var prompt = buildJustificationRubricPrompt(rubric);
    var startedAt = Date.now();

    return callGeminiAudio(prompt, audioBase64, { mimeType: opts.mimeType || 'audio/webm' })
      .then(function (raw) {
        var parsed = parseRubricResponse(raw);
        return {
          transcript: parsed.transcript || '',
          score: parsed.score,
          ackText: parsed.ackText || '',
          followUp: parsed.followUp || '',
          engine: 'gemini-audio',
          raw: raw,
          durationMs: Date.now() - startedAt
        };
      });
  }

  // Builds the structured rubric prompt sent to Gemini. The prompt
  // explicitly values BRIDGE QUALITY over card-topic alignment — the
  // equal-reward-for-distant-transfer decision from the plan. Domain-
  // Specific tier raises the bar for "strong" but not the score ceiling.
  function buildJustificationRubricPrompt(rubric) {
    var conceptName = rubric.conceptName || rubric.cardName || 'a concept';
    var conceptDef = rubric.conceptDef || '';
    var cardName = rubric.cardName || conceptName;
    var cardSource = rubric.cardSource || 'glossary';
    var tier = rubric.tier || 'Tier 2';
    var actionVerb = rubric.actionVerb || 'spark';
    var bossTopic = rubric.bossTopic || conceptName;

    var lines = [];
    lines.push('You are evaluating a student\'s spoken justification for a card play in an educational game.');
    lines.push('');
    lines.push('CONTEXT:');
    lines.push('- The student plays cards in a cooperative class-vs-AI encounter.');
    lines.push('- Each card play is justified by the student explaining how it fits the topic.');
    lines.push('- Justifications are graded 1–20 (a "d20" score) which determines the action\'s effect.');
    lines.push('');
    lines.push('THIS PLAY:');
    lines.push('- Encounter topic: ' + bossTopic);
    lines.push('- Card name: ' + cardName);
    lines.push('- Card source: ' + cardSource + ' (decoration = student\'s personal collection; glossary = unit lesson term)');
    if (conceptDef) lines.push('- Concept definition: ' + conceptDef);
    lines.push('- Concept tier: ' + tier);
    lines.push('- Action: ' + actionVerb);
    lines.push('');
    lines.push('RUBRIC (read carefully):');
    lines.push('1. Score 1–20 the QUALITY OF THE BRIDGE between the card and the topic. Equal reward for distant transfer:');
    lines.push('   - A creative, well-reasoned bridge between an unrelated card and the topic deserves the SAME high score');
    lines.push('     as a textbook-direct connection. Do NOT penalize a less-obvious card whose justification is strong.');
    lines.push('2. Tier informs the bar, not the ceiling. Domain-Specific concepts require accurate invocation to score 18+;');
    lines.push('   any card can score 1–20 with an appropriate justification.');
    lines.push('3. Be GENEROUS with autistic students whose answers may be literal-but-correct. Concise + accurate beats verbose.');
    lines.push('4. Score band guide:');
    lines.push('   - 1–5:   No meaningful connection or unintelligible audio.');
    lines.push('   - 6–10:  Connection attempted but vague, off-topic, or only superficially related.');
    lines.push('   - 11–14: Solid connection. Concept is invoked correctly; bridge is reasonable.');
    lines.push('   - 15–17: Strong connection. Specific evidence cited; the bridge holds up to scrutiny.');
    lines.push('   - 18–20: Excellent. Either textbook-precise on a Domain-Specific concept, OR a striking creative');
    lines.push('     transfer that genuinely illuminates the topic.');
    lines.push('5. Acknowledgement: ALWAYS lead with what was clear or strong about the response. One short sentence.');
    lines.push('6. Follow-up: ONE thought-provoking question the student could think about. Not graded; just an invitation.');
    lines.push('');
    lines.push('OUTPUT FORMAT — respond with ONLY valid JSON, no surrounding prose, no markdown fences:');
    lines.push('{');
    lines.push('  "transcript": "the student\'s spoken words, transcribed",');
    lines.push('  "score": <integer 1-20>,');
    lines.push('  "ackText": "1 short sentence acknowledging what was clear or strong",');
    lines.push('  "followUp": "1 short thought-provoking question (not graded)"');
    lines.push('}');
    return lines.join('\n');
  }

  function parseRubricResponse(raw) {
    var defaults = { transcript: '', score: 1, ackText: '', followUp: '' };
    if (!raw || typeof raw !== 'string') return defaults;
    // Strip code-fence wrappers if the model added them despite instructions.
    var cleaned = raw.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    // Extract the first JSON object substring (model may add prose).
    var firstBrace = cleaned.indexOf('{');
    var lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return Object.assign({}, defaults, { ackText: cleaned.slice(0, 200) });
    }
    var jsonText = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      var parsed = JSON.parse(jsonText);
      var score = Number(parsed.score);
      if (!isFinite(score) || score < 1) score = 1;
      if (score > 20) score = 20;
      return {
        transcript: typeof parsed.transcript === 'string' ? parsed.transcript : '',
        score: Math.round(score),
        ackText: typeof parsed.ackText === 'string' ? parsed.ackText : '',
        followUp: typeof parsed.followUp === 'string' ? parsed.followUp : ''
      };
    } catch (err) {
      // Couldn't parse — return what we got as ackText so the caller has
      // something to show instead of a blank screen.
      return Object.assign({}, defaults, { ackText: cleaned.slice(0, 200) });
    }
  }

  // ── Public API ─────────────────────────────────────────────────────
  window.AlloFlowVoice = {
    // Phase 3v.1 — shipped
    initWebSpeechCapture: initWebSpeechCapture,
    getCapabilities: getCapabilities,
    loadPreference: loadPreference,
    savePreference: savePreference,
    defaultPreference: defaultPreference,

    // Phase 3v.2 — shipped
    recordAudioBlob: recordAudioBlob,

    // Phase 3v.3 — shipped
    transcribeAudio: transcribeAudio,
    preloadWhisper: preloadWhisper,
    isWhisperLoaded: isWhisperLoaded,
    getLoadedWhisperTier: getLoadedWhisperTier,
    subscribeToVoiceProgress: subscribeToVoiceProgress,

    // Phase 3v.4 — shipped
    gradeAudioJustification: gradeAudioJustification,
    buildJustificationRubricPrompt: buildJustificationRubricPrompt,
    parseRubricResponse: parseRubricResponse,

    // Phase / version markers — let callers detect what's actually wired.
    _phase: '3v.4',
    _shipped: [
      'initWebSpeechCapture', 'getCapabilities', 'loadPreference', 'savePreference',
      'recordAudioBlob', 'recordAudioBlob.onStream', 'recordAudioBlob.result.blob',
      'transcribeAudio', 'preloadWhisper', 'isWhisperLoaded', 'getLoadedWhisperTier', 'subscribeToVoiceProgress',
      'gradeAudioJustification', 'buildJustificationRubricPrompt', 'parseRubricResponse'
    ]
  };

  // Register on window.AlloModules so AlloFlowANTI.txt's loadModule() helper
  // (which checks `window.AlloModules[name]` after script.onload) reports
  // Registration: SUCCESS instead of FAILED. Without this, every page load
  // burned a redundant fetch on the GitHub raw fallback path even though
  // the CDN load actually succeeded — voice_module set window.AlloFlowVoice
  // but never wrote into window.AlloModules.Voice, so the host's check
  // always failed.
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.Voice = window.AlloFlowVoice;

  if (typeof console !== 'undefined') {
    console.log('[Voice] AlloFlowVoice loaded — phase 3v.4');
  }
})();
