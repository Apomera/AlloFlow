(function () {
'use strict';
if (window.AlloModules && window.AlloModules.TutorialCompilerModule) { console.log('[CDN] TutorialCompilerModule already loaded, skipping'); return; }

// ============================================================================
// tutorial_compiler_module.js — SCAFFOLD (2026-07-06, handoff task #7)
// ----------------------------------------------------------------------------
// Turns AlloFlow's machine-readable Guided Mode tours into narrated tutorial
// VIDEOS, automatically, per release, in every shipped language.
//
// WHY THIS CAN EXIST CHEAPLY (the whole idea): the app already carries the
// four pieces a tutorial-video system normally has to build from scratch —
//   1. SCRIPT   → GUIDED_STEPS (human-authored { label, action, success } per
//                 step) + GUIDED_TOUR_MAP (step id → DOM anchor). This is a
//                 complete, ordered, narratable walkthrough of every complex
//                 flow, already localized through the t() layer.
//   2. STAGE    → the real app, driven deterministically through the tour
//                 (the tour engine already spotlights each anchor in order).
//   3. VOICE    → Kokoro TTS (window._kokoroTTS / callTTS) narrates locally at
//                 zero marginal cost, in 50+ languages.
//   4. CAMERA   → Video Studio's getDisplayMedia/MediaRecorder capture, and
//                 the NotebookLM→Remotion editor for compositing.
//
// Because the script is DATA, every release can regenerate every video with no
// stale tutorials, ever — and localized tutorials are nearly free.
//
// WHAT IS REAL IN THIS FILE: buildTutorialManifest + its pure helpers. They
// convert the tour data into a clean, testable tutorial script today. Feed
// them GUIDED_STEPS and GUIDED_TOUR_MAP (both live in AlloFlowANTI.txt).
//
// WHAT IS STUBBED: compileTutorial's capture→narrate→composite pipeline. Each
// stage names the exact existing seam to call. Build ONE feature end-to-end
// first (suggest 'simplified' — Text Adaptation, the flagship flow).
//
// TO ACTIVATE: (a) add loadModule('TutorialCompilerModule', '<cdn>/tutorial_
// compiler_module.js?v=<hash>') to the ANTI boot list; (b) enroll a build pair
// if you convert to a _source.jsx; (c) flesh out the three pipeline stages.
// ============================================================================

  // ── Narration: the words spoken over each step ────────────────────────────
  // A tour step becomes two narration beats — the ACTION (what to do) and the
  // SUCCESS (what just happened). tFn (the app's t()) localizes; the raw
  // English strings are the fallback so this works before i18n is wired.
  function narrationForStep(step, tFn) {
    if (!step || typeof step !== 'object') return [];
    var tr = function (key, fallback) {
      try { if (typeof tFn === 'function') { var v = tFn(key); if (v && v !== key) return v; } } catch (_) {}
      return fallback;
    };
    var beats = [];
    var label = tr('guided.' + step.id + '.label', step.label || step.id);
    var action = tr('guided.' + step.id + '.action', step.action || '');
    var success = tr('guided.' + step.id + '.success', step.success || '');
    if (action) beats.push({ kind: 'action', text: (label ? label + '. ' : '') + action });
    if (success) beats.push({ kind: 'success', text: success });
    return beats;
  }

  // ── Duration estimate: how long the narration takes to speak ──────────────
  // ~165 wpm is a comfortable instructional pace; drives the video timeline so
  // the spotlight dwells on each anchor exactly as long as its narration.
  function estimateNarrationSeconds(text, wpm) {
    var words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    var rate = (typeof wpm === 'number' && wpm > 0) ? wpm : 165;
    // Floor of 1.5s so a two-word beat still reads on screen.
    return Math.max(1.5, (words / rate) * 60);
  }

  // ── Manifest: the full tutorial script for one flow (or all) ──────────────
  // guidedSteps: the GUIDED_STEPS array. tourMap: GUIDED_TOUR_MAP (id→anchor).
  // opts.only: restrict to a subset of step ids (e.g. one feature's tutorial).
  // Returns { generatedFrom, totalSeconds, steps:[{ id, anchorId, label,
  //   beats:[{kind,text,seconds}], seconds }] } — ready to drive capture.
  function buildTutorialManifest(guidedSteps, tourMap, tFn, opts) {
    opts = opts || {};
    var only = Array.isArray(opts.only) ? opts.only : null;
    var wpm = opts.wpm;
    var steps = (Array.isArray(guidedSteps) ? guidedSteps : [])
      .filter(function (s) { return s && s.id && (!only || only.indexOf(s.id) >= 0); })
      .map(function (s) {
        var beats = narrationForStep(s, tFn).map(function (b) {
          return { kind: b.kind, text: b.text, seconds: estimateNarrationSeconds(b.text, wpm) };
        });
        var seconds = beats.reduce(function (sum, b) { return sum + b.seconds; }, 0);
        return {
          id: s.id,
          anchorId: (tourMap && tourMap[s.id]) || null,
          label: s.label || s.id,
          beats: beats,
          seconds: seconds
        };
      })
      .filter(function (s) { return s.beats.length > 0; });
    return {
      generatedFrom: 'GUIDED_STEPS',
      version: 1,
      stepCount: steps.length,
      totalSeconds: steps.reduce(function (sum, s) { return sum + s.seconds; }, 0),
      steps: steps
    };
  }

  // ── Pipeline (STUB) — drive → narrate → capture → composite ───────────────
  // Deterministic tour execution beats AI improv here: accuracy over fluency
  // when teaching software. Use Gemini/Codex only to DRAFT/polish the narration
  // strings offline, never to drive the UI live.
  async function compileTutorial(manifest, deps) {
    deps = deps || {};
    var log = function (m) { try { (deps.log || console.log)('[TutorialCompiler] ' + m); } catch (_) {} };
    if (!manifest || !Array.isArray(manifest.steps) || !manifest.steps.length) {
      throw new Error('compileTutorial: empty manifest — build one with buildTutorialManifest first.');
    }

    // STAGE 1 — CAMERA: begin screen capture.
    //   Seam: Video Studio. It already owns getDisplayMedia + MediaRecorder in
    //   a popup context (see video_studio_module.js). Expose a start/stop hook
    //   or reuse its recorder. deps.startCapture() → { stop(): Promise<Blob> }.
    // STAGE 2 — STAGE+VOICE: for each step, spotlight its anchor and speak its
    //   beats in lockstep.
    //   Seam A (spotlight): the guided/spotlight tour engine already scrolls to
    //   + highlights GUIDED_TOUR_MAP[id]. Drive it step-by-step, or scrollIntoView
    //   + a highlight ring on document.getElementById(step.anchorId).
    //   Seam B (voice): deps.speak(text) → callTTS(text) (Kokoro locally). Await
    //   each beat so the spotlight dwell matches beat.seconds.
    // STAGE 3 — COMPOSITE: stop capture, mux the narration track, add captions
    //   from the beat text (accessibility!), title/end cards.
    //   Seam: the NotebookLM→Remotion editor already in the tree (doc→video).
    //   Feed it { videoBlob, beats:[{text,startSec,endSec}] }.
    //
    // Below is the executable ORDER with the calls stubbed — wire the seams and
    // this loop produces a real tutorial. Kept intentionally thin.
    log('would compile ' + manifest.steps.length + ' step(s), ~' + Math.round(manifest.totalSeconds) + 's total');
    if (typeof deps.startCapture !== 'function' || typeof deps.speak !== 'function') {
      return { ok: false, reason: 'scaffold', note: 'Wire deps.startCapture()/deps.speak()/deps.composite() to produce a video. See stage comments.' };
    }
    var session = await deps.startCapture();
    try {
      for (var i = 0; i < manifest.steps.length; i++) {
        var step = manifest.steps[i];
        if (typeof deps.spotlight === 'function') { try { await deps.spotlight(step.anchorId, step.id); } catch (_) {} }
        for (var j = 0; j < step.beats.length; j++) {
          await deps.speak(step.beats[j].text); // resolves when the audio finishes
        }
      }
    } finally {
      var videoBlob = await session.stop();
      if (typeof deps.composite === 'function') return await deps.composite(videoBlob, manifest);
      return { ok: true, videoBlob: videoBlob, manifest: manifest };
    }
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.TutorialCompiler = {
    narrationForStep: narrationForStep,
    estimateNarrationSeconds: estimateNarrationSeconds,
    buildTutorialManifest: buildTutorialManifest,
    compileTutorial: compileTutorial
  };
  window.AlloModules.TutorialCompilerModule = true;
  console.log('[TutorialCompiler] scaffold registered (manifest builder live; capture/narrate/composite stubbed — handoff task #7)');
})();
