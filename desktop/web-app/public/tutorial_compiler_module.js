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
// WHAT IS ADAPTER-DRIVEN: compileTutorial's capture→drive→narrate→composite
// pipeline. The execution order, cleanup, actual beat timing, and failure
// propagation are live here; production still needs adapters for one real
// Guided Mode flow. Build ONE feature end-to-end first (suggest 'simplified'
// — Text Adaptation, the flagship flow).
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

  // ── Pipeline adapter — capture → narrate/drive → composite ───────────────
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
    //   + highlights GUIDED_TOUR_MAP[id]. deps.spotlight() frames the target;
    //   deps.performStep() executes the deterministic, fixture-safe action.
    //   Seam B (voice): deps.speak(text) → callTTS(text) (Kokoro locally). Await
    //   each beat so the spotlight dwell matches beat.seconds.
    // STAGE 3 — COMPOSITE: stop capture, mux the narration track, add captions
    //   from the beat text (accessibility!), title/end cards.
    //   Seam: the NotebookLM→Remotion editor already in the tree (doc→video).
    //   Feed it { videoBlob, beats:[{text,startSec,endSec}] }.
    //
    // Below is the executable order. The adapters remain outside this module so
    // browser capture, Playwright release capture, and local TTS can share the
    // same deterministic compiler contract.
    log('would compile ' + manifest.steps.length + ' step(s), ~' + Math.round(manifest.totalSeconds) + 's total');
    if (typeof deps.startCapture !== 'function' || typeof deps.speak !== 'function' || typeof deps.performStep !== 'function') {
      return { ok: false, reason: 'adapters-missing', note: 'Wire deps.startCapture()/deps.speak()/deps.performStep(); add deps.composite() for a finished tutorial.' };
    }
    var session = await deps.startCapture();
    if (!session || typeof session.stop !== 'function') {
      throw new Error('compileTutorial: startCapture() must return a session with stop().');
    }
    var nowSeconds = typeof deps.now === 'function'
      ? deps.now
      : function () { return (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) / 1000; };
    var startedAt = Number(nowSeconds()) || 0;
    var timeline = [];
    var pipelineError = null;
    var videoBlob = null;
    try {
      for (var i = 0; i < manifest.steps.length; i++) {
        var step = manifest.steps[i];
        if (typeof deps.spotlight === 'function') await deps.spotlight(step.anchorId, step.id);
        var performed = false;
        for (var j = 0; j < step.beats.length; j++) {
          var beat = step.beats[j];
          // Action narration comes first; then the deterministic tour adapter
          // performs the real UI step before the success narration is spoken.
          if (!performed && beat.kind === 'success') {
            await deps.performStep(step, i);
            performed = true;
            if (timeline.length && timeline[timeline.length - 1].stepId === step.id) {
              timeline[timeline.length - 1].endSec = Math.max(timeline[timeline.length - 1].endSec, (Number(nowSeconds()) || startedAt) - startedAt);
            }
          }
          var beatStart = Math.max(0, (Number(nowSeconds()) || startedAt) - startedAt);
          await deps.speak(beat.text, { step: step, stepIndex: i, beat: beat, beatIndex: j });
          var beatEnd = Math.max(beatStart, (Number(nowSeconds()) || startedAt) - startedAt);
          timeline.push({ stepId: step.id, kind: beat.kind, text: beat.text, startSec: beatStart, endSec: beatEnd });
        }
        if (!performed) {
          await deps.performStep(step, i);
          if (timeline.length && timeline[timeline.length - 1].stepId === step.id) {
            timeline[timeline.length - 1].endSec = Math.max(timeline[timeline.length - 1].endSec, (Number(nowSeconds()) || startedAt) - startedAt);
          }
        }
      }
    } catch (e) {
      pipelineError = e instanceof Error ? e : new Error(String(e || 'Tutorial compilation failed.'));
    }
    // Capture duration ends before stop()/mux finalization; encoder shutdown can
    // take seconds and must not inflate caption or tutorial timeline duration.
    var actualSeconds = Math.max(0, (Number(nowSeconds()) || startedAt) - startedAt);
    try {
      videoBlob = await session.stop();
    } catch (stopError) {
      if (!pipelineError) pipelineError = stopError instanceof Error ? stopError : new Error(String(stopError || 'Capture stop failed.'));
      else pipelineError.stopError = String((stopError && stopError.message) || stopError || 'Capture stop failed.');
    }
    if (pipelineError) throw pipelineError;
    var compiledManifest = Object.assign({}, manifest, { actualSeconds: actualSeconds, timeline: timeline });
    if (typeof deps.composite === 'function') return await deps.composite(videoBlob, compiledManifest);
    return { ok: true, videoBlob: videoBlob, manifest: compiledManifest, timeline: timeline };
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.TutorialCompiler = {
    narrationForStep: narrationForStep,
    estimateNarrationSeconds: estimateNarrationSeconds,
    buildTutorialManifest: buildTutorialManifest,
    compileTutorial: compileTutorial
  };
  window.AlloModules.TutorialCompilerModule = true;
  console.log('[TutorialCompiler] adapter-driven compiler registered (production Guided Mode adapters still required)');
})();
