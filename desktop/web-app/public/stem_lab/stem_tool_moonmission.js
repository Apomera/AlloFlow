// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_moonmission.js — Apollo Moon Mission Simulator (standalone CDN module)
// Full mission experience: Launch → Orbit → Transit → Descent → EVA → Return
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('moonMission'))) {

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // AUDIO SYSTEM — Immersive mission sounds
  // ═══════════════════════════════════════════════════════════════
  var _mmAnimPaused = false;   // live pause flag read by every 2D phase loop (see the header toggle)
  var _mmMoonLabels = false;   // lunar-orbit map labels (the phase 4 toggle), read per frame
  var _mmTrueScale = false;    // trans-lunar coast drawn at true scale (the phase 3 toggle)
  var _mmEntryAngle = -6.5;    // the entry-corridor slider, drawn live on the trans-Earth canvas
  var _mmProceedLock = null;   // { phase, at } of the last accepted proceed click
  var _mmSoundOff = false;     // live mute flag — see getMMAC below, and the header toggle
  var _mmAC = null;
  function getMMAC() {
    // The mute gate. Every sound in this tool — mission sfx, the looping ambience, the
    // radio chirps and the rover's drive sonification — asks for the audio context
    // here first, so one check silences all of them and none can be forgotten.
    if (_mmSoundOff) return null;
    if (!_mmAC) { try { _mmAC = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); } catch(e) {} }
    if (_mmAC && _mmAC.state === 'suspended') { try { _mmAC.resume(); } catch(e) {} }
    return _mmAC;
  }
  function mmTone(freq, dur, type, vol) {
    var ac = getMMAC(); if (!ac) return;
    try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = type || 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(vol || 0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (dur || 0.15)); } catch(e) {}
  }
  function mmNoise(dur, vol, filterHz, filterType) {
    var ac = getMMAC(); if (!ac) return;
    try {
      var bufSize = Math.floor(ac.sampleRate * (dur || 0.1));
      var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      var src = ac.createBufferSource(); src.buffer = buf;
      var filt = ac.createBiquadFilter(); filt.type = filterType || 'lowpass'; filt.frequency.value = filterHz || 800;
      var g = ac.createGain(); g.gain.setValueAtTime(vol || 0.04, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.1));
      src.connect(filt); filt.connect(g); g.connect(ac.destination); src.start();
    } catch(e) {}
  }

  // Individual mission sounds
  function sfxCountdown() { mmTone(800, 0.15, 'sine', 0.1); } // Countdown beep
  function sfxLaunch() {
    // Deep rumble + roar
    mmNoise(1.0, 0.12, 200, 'lowpass');
    mmTone(60, 0.8, 'sawtooth', 0.1);
    setTimeout(function() { mmTone(80, 0.6, 'sawtooth', 0.08); mmNoise(0.6, 0.08, 300); }, 200);
    setTimeout(function() { mmTone(100, 0.5, 'sawtooth', 0.06); }, 400);
  }
  function sfxEngineIgnition() { mmNoise(0.3, 0.08, 500, 'bandpass'); mmTone(150, 0.2, 'sawtooth', 0.06); }
  function sfxStageSeparation() {
    mmNoise(0.15, 0.1, 1200, 'bandpass'); // metallic clank
    setTimeout(function() { mmTone(400, 0.08, 'sine', 0.06); }, 80);
    setTimeout(function() { mmTone(300, 0.1, 'sine', 0.04); }, 150);
  }
  function sfxRadioChirp() {
    // Classic NASA radio chirp/static
    mmNoise(0.04, 0.06, 3000, 'bandpass');
    setTimeout(function() { mmTone(1200, 0.03, 'sine', 0.05); }, 30);
  }
  function sfxAlarm() {
    mmTone(880, 0.1, 'square', 0.08);
    setTimeout(function() { mmTone(660, 0.1, 'square', 0.08); }, 120);
    setTimeout(function() { mmTone(880, 0.1, 'square', 0.08); }, 240);
  }
  function sfxThrust() { mmNoise(0.2, 0.06, 300, 'lowpass'); mmTone(80, 0.15, 'sawtooth', 0.04); }
  function sfxLanding() {
    mmNoise(0.3, 0.1, 400, 'lowpass');
    setTimeout(function() { mmTone(200, 0.2, 'sine', 0.06); }, 100);
    setTimeout(function() { mmTone(300, 0.15, 'sine', 0.08); }, 250);
  }
  function sfxBootstep() { mmNoise(0.04, 0.03, 600, 'lowpass'); }
  function sfxSampleCollect() {
    mmTone(523, 0.06, 'sine', 0.06);
    setTimeout(function() { mmTone(659, 0.06, 'sine', 0.06); }, 50);
    setTimeout(function() { mmTone(784, 0.08, 'sine', 0.07); }, 100);
  }
  function sfxSplashdown() {
    mmNoise(0.5, 0.1, 250, 'lowpass');
    setTimeout(function() { mmNoise(0.3, 0.06, 400); }, 200);
  }
  function sfxQuizCorrect() { mmTone(523, 0.08, 'sine', 0.08); setTimeout(function() { mmTone(659, 0.08, 'sine', 0.08); }, 70); setTimeout(function() { mmTone(784, 0.12, 'sine', 0.1); }, 140); }
  function sfxQuizWrong() { mmTone(250, 0.2, 'sawtooth', 0.06); }
  function sfxPhaseAdvance() {
    mmTone(440, 0.06, 'sine', 0.06);
    setTimeout(function() { mmTone(554, 0.06, 'sine', 0.06); }, 50);
    setTimeout(function() { mmTone(659, 0.08, 'sine', 0.07); }, 100);
    setTimeout(function() { mmTone(880, 0.12, 'sine', 0.08); }, 160);
  }
  function sfxMissionComplete() {
    [523, 659, 784, 1047, 1319].forEach(function(f, i) {
      setTimeout(function() { mmTone(f, 0.15, 'sine', 0.08); }, i * 120);
    });
  }

  // Ambient engine loop
  var _mmAmbient = null;
  function ambientTypeForPhase(p) {
    if (p === 1) return 'launch';
    if (p === 5 || p === 7) return 'thrust';
    if (p === 6) return 'eva';
    if (p >= 2 && p <= 4) return 'space';
    if (p === 8) return 'space';
    return null;                     // re-entry and the debrief are deliberately silent
  }
  function startMissionAmbient(type) {
    stopMissionAmbient();
    var ac = getMMAC(); if (!ac) return;
    try {
      var bufSize = ac.sampleRate * 2;
      var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
      var src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      var filt = ac.createBiquadFilter();
      var master = ac.createGain();
      if (type === 'launch' || type === 'thrust') {
        filt.type = 'lowpass'; filt.frequency.value = 250;
        master.gain.setValueAtTime(0, ac.currentTime);
        master.gain.linearRampToValueAtTime(0.015, ac.currentTime + 1);
      } else if (type === 'space') {
        filt.type = 'bandpass'; filt.frequency.value = 400; filt.Q.value = 2;
        master.gain.setValueAtTime(0, ac.currentTime);
        master.gain.linearRampToValueAtTime(0.006, ac.currentTime + 2);
      } else if (type === 'eva') {
        // EVA suit breathing
        filt.type = 'bandpass'; filt.frequency.value = 600; filt.Q.value = 3;
        master.gain.setValueAtTime(0, ac.currentTime);
        master.gain.linearRampToValueAtTime(0.008, ac.currentTime + 1.5);
      }
      src.connect(filt); filt.connect(master); master.connect(ac.destination);
      src.start();
      _mmAmbient = { src: src, master: master };
      // Every type watches for the tool leaving the page. Only the space/EVA chirp
      // timer did before, so closing STEAM Lab from the host (Escape, Alt+B, Close)
      // during launch, landing or ascent left the engine rumble looping until reload,
      // with no mute control left on screen (WCAG 1.4.2).
      _mmAmbient._watch = setInterval(function() {
        if (!document.querySelector('[data-moonmission-tool]')) stopMissionAmbient();
      }, 1000);
      // Periodic radio chirps for space/EVA. Self-cleaning: if the tool has been
      // unmounted by ANY path (not just the Back button), the next tick notices the
      // root marker is gone and stops the loop + audio nodes — no leaked interval.
      if (type === 'space' || type === 'eva') {
        _mmAmbient._interval = setInterval(function() {
          if (!document.querySelector('[data-moonmission-tool]')) { stopMissionAmbient(); return; }
          if (Math.random() > 0.5) sfxRadioChirp();
        }, 4000 + Math.random() * 6000);
      }
    } catch(e) {}
  }
  function stopMissionAmbient() {
    if (_mmAmbient) {
      try {
        var ac = getMMAC();
        if (ac && _mmAmbient.master) _mmAmbient.master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5);
        if (_mmAmbient._interval) clearInterval(_mmAmbient._interval);
        if (_mmAmbient._watch) clearInterval(_mmAmbient._watch);
        var nodes = _mmAmbient;
        setTimeout(function() { try { nodes.src.stop(); } catch(e) {} }, 600);
      } catch(e) {}
      _mmAmbient = null;
    }
  }

  // (Removed the duplicate reduced-motion stylesheet — the shared
  // 'allo-stem-motion-reduce-css' block at the top of this file already covers it —
  // and the .text-slate-200 color override entirely: the app-wide version recolored
  // every .text-slate-200 in the whole app, and this tool mixes a light header with
  // dark mission panels, so ANY blanket override breaks one surface or the other.
  // The one problem element — the MET readout on the light header — now simply uses
  // a dark text class directly.)

  // ═══════════════════════════════════════════════════════════════
  // SHARED PROCEDURAL DRAWING HELPERS
  // Pure canvas draw functions used across all mission phases.
  // ═══════════════════════════════════════════════════════════════

  // Seeded PRNG — deterministic so craters/stars don't jump per frame
  // ── On-screen hold control ──
  // Both hand-flown phases were keyboard-only: no pointer or touch path existed
  // anywhere in this file, so the landing game and the moonwalk were unplayable on a
  // tablet, and unplayable with a mouse alone. These buttons hold while pressed and
  // release on up / cancel / slide-off, and they answer Enter and Space too so a
  // switch or keyboard user reaches the same control rather than a dead button.
  function mmHoldButton(label, aria, size, onDown, onUp) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', aria);
    b.setAttribute('aria-pressed', 'false');
    b.textContent = label;
    b.style.cssText = 'pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;' +
      'min-width:' + size + 'px;min-height:' + size + 'px;padding:0 8px;border-radius:10px;' +
      'border:1px solid rgba(148,163,184,0.55);background:rgba(2,6,23,0.82);color:#e2e8f0;' +
      'font:700 13px/1 system-ui;cursor:pointer;display:inline-flex;align-items:center;justify-content:center';
    var held = false;
    function down(e) {
      if (e && e.cancelable) e.preventDefault();
      if (held) return;
      held = true;
      b.setAttribute('aria-pressed', 'true');
      b.style.background = 'rgba(56,189,248,0.35)';
      b.style.borderColor = 'rgba(125,211,252,0.9)';
      onDown();
    }
    function up() {
      if (!held) return;
      held = false;
      b.setAttribute('aria-pressed', 'false');
      b.style.background = 'rgba(2,6,23,0.82)';
      b.style.borderColor = 'rgba(148,163,184,0.55)';
      if (onUp) onUp();
    }
    // No setPointerCapture: sliding a finger off the button should release it, which
    // is what pointerleave gives us. Capture would hold the control down instead.
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('keydown', function(e) {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      if (!e.repeat) down(null);
    });
    b.addEventListener('keyup', function(e) {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      up();
    });
    b.addEventListener('blur', up);
    b._mmRelease = up;
    return b;
  }
  // Move focus to what a click just put on screen, once React has committed it. The
  // tool has no hooks, so a handler cannot focus content it is about to render: the
  // button pressed to change phase is gone a frame later and focus fell to <body>,
  // sending a keyboard or screen-reader student back to the top of the page with no
  // word about where they now are. Polls briefly for the target. Unless forced, it
  // leaves alone a canvas or a text field the student has already moved to (the
  // descent and moonwalk canvases take focus on purpose).
  function mmFocusWhenReady(selector, force, tries) {
    var left = tries == null ? 20 : tries;
    setTimeout(function () {
      var el = null;
      try { el = document.querySelector(selector); } catch (e) {}
      if (!el) { if (left > 0) mmFocusWhenReady(selector, force, left - 1); return; }
      var ae = document.activeElement;
      if (!force && ae && ae !== document.body && ae.isConnected
          && /^(CANVAS|INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      try { el.focus({ preventScroll: true }); } catch (e2) { try { el.focus(); } catch (e3) {} }
      try {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > (window.innerHeight || 0)) {
          var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          el.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
        }
      } catch (e4) {}
    }, 50);
  }

  // Moonwalk samples carry a stable key: 'sample:<index>' for the eight free-roam rock
  // types, 'traverse' for the geology-traverse specimen. Older saves have no key and
  // are matched by name. The collection used to be counted by list length, so
  // rebuilding the scene (Retry 3D Mode) and picking the same four rocks up again read
  // as "8 / 8 sample types", earned the collector badge and paid the XP twice, and the
  // traverse specimen counted as one of the eight types.
  var MM_TRAVERSE_SAMPLE = 'Traverse Breccia';
  function mmSampleKey(sm) {
    return sm && typeof sm.key === 'string' ? sm.key : 'name:' + String(sm && sm.name);
  }
  function mmDistinctSamples(list) {
    var seen = {};
    return (Array.isArray(list) ? list : []).filter(function (sm) {
      var k = mmSampleKey(sm);
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }
  function mmSampleTypeCount(list) {
    return mmDistinctSamples(list).filter(function (sm) {
      return typeof sm.key === 'string' ? sm.key.indexOf('sample:') === 0 : sm.name !== MM_TRAVERSE_SAMPLE;
    }).length;
  }
  try { window.MoonMissionPure = Object.assign(window.MoonMissionPure || {}, { sampleKey: mmSampleKey, distinctSamples: mmDistinctSamples, sampleTypeCount: mmSampleTypeCount }); } catch (e) {}

  // ── The flight, summarised ──
  // The debrief's cause-and-effect chain, the report a student hands in and the
  // history table are all built from this one summary of what the flight RECORDED,
  // so every line in them is something the student actually did.
  var MM_ARROW = String.fromCharCode(8594), MM_DEG_SIGN = String.fromCharCode(176), MM_DASH = String.fromCharCode(8212);
  var MM_MODE_NAMES = { tourist: 'Tourist', pilot: 'Pilot', commander: 'Commander' };
  function mmNum(v) { return typeof v === 'number' && isFinite(v); }
  function mmIsObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  // What the mission events cost the landing, from the choices the flight recorded.
  // They used to move crew morale and nothing else, so Armstrong's real trade (fly
  // past the boulders, spend the fuel) was free in the sim and landing on the
  // boulders cost nothing at the controls.
  function mmEventCosts(log) {
    var out = { fuel: 0, drift: 0, boulders: false, items: [] };
    (Array.isArray(log) ? log : []).forEach(function (dec) {
      var e = mmIsObj(dec) && mmIsObj(dec.effects) ? dec.effects : null;
      if (!e) return;
      var f = mmNum(e.hoverFuel) ? Math.max(0, e.hoverFuel) : 0;
      var dr = mmNum(e.drift) ? Math.max(0, e.drift) : 0;
      var rough = e.site === 'boulders';
      if (!f && !dr && !rough) return;
      var title = String(dec.title || '');
      while (title.charAt(title.length - 1) === '!') title = title.slice(0, -1);
      out.fuel += f; out.drift += dr; out.boulders = out.boulders || rough;
      out.items.push({ title: title, chosen: String(dec.chosen || ''), note: String(e.note || ''), fuel: f, drift: dr, boulders: rough });
    });
    return out;
  }
  function mmFlightSummary(d, totals, when) {
    totals = totals || {};
    var dl = Array.isArray(d.decisionLog) ? d.decisionLog.filter(mmIsObj) : [];
    var ta = mmIsObj(d.tliAccuracy) ? d.tliAccuracy : null;
    var lr = mmIsObj(d.landingResult) && mmNum(d.landingResult.vVel) ? d.landingResult : null;
    var eo = mmIsObj(d.entryOutcome) && mmNum(d.entryOutcome.angle) ? d.entryOutcome : null;
    return {
      when: when || '',
      difficulty: MM_MODE_NAMES[d.difficulty] ? d.difficulty : 'pilot',
      tli: ta ? { onTime: !!ta.onTime, offByDeg: mmNum(ta.offByDeg) ? ta.offByDeg : 0, side: ta.side === 'late' ? 'late' : 'early' } : null,
      mcc: d.mccChoice === 'corrected' || d.mccChoice === 'skipped' ? d.mccChoice : null,
      landing: lr ? { crashed: !!lr.crashed, score: mmNum(lr.score) ? lr.score : 0, grade: String(lr.grade || ''),
        vVel: lr.vVel, hVel: mmNum(lr.hVel) ? lr.hVel : 0, fuel: mmNum(lr.fuel) ? lr.fuel : 0, fuelUnit: lr.fuelUnit === 's' ? 's' : '%' } : null,
      entry: eo ? { outcome: String(eo.outcome), angle: eo.angle, peakG: mmNum(eo.peakG) ? eo.peakG : 0 } : null,
      quiz: { correct: mmNum(d.quizCorrect) ? d.quizCorrect : 0, total: totals.quiz || 0 },
      samples: mmSampleTypeCount(d.lunarSamples), sampleTotal: totals.samples || 8,
      decisions: { optimal: dl.filter(function (x) { return x.quality === 'optimal'; }).length, total: dl.length },
      events: mmEventCosts(dl),
      morale: mmNum(d.crewMorale) ? d.crewMorale : 75
    };
  }
  // Each graded call and what it caused, in the order it was flown. The flight record
  // already explains each call on its own; this is the part that was missing: how the
  // TLI timing set up the correction, and the correction set up the landing.
  function mmCauseChain(sum) {
    var steps = [];
    var D = MM_DESCENT;
    if (sum.tli) {
      steps.push(sum.tli.onTime
        ? { call: 'TLI fired inside the burn window', result: 'your path already led to the Moon, so the coast needed no correction' }
        : { call: 'TLI fired ' + sum.tli.offByDeg + MM_DEG_SIGN + ' ' + sum.tli.side, result: 'the path would have missed its target, so a mid-course correction was offered' });
    }
    if (sum.mcc === 'corrected') steps.push({ call: 'You burned the mid-course correction', result: 'the Service Module engine fixed the error while it was small, and the landing kept its full fuel budget' });
    else if (sum.mcc === 'skipped') steps.push({ call: 'You declined the correction', result: 'the error grew all the way to the Moon: the landing started with ' + D.skipFuel + ' s less hover fuel and ' + D.skipDrift + ' m/s more drift to cancel' });
    (sum.events ? sum.events.items : []).forEach(function (it) {
      steps.push({ call: 'At ' + it.title + ' you chose "' + it.chosen + '"', result: it.note.charAt(0).toLowerCase() + it.note.slice(1) });
    });
    if (sum.landing) {
      var L = sum.landing;
      var fuelTxt = L.fuelUnit === 's' ? L.fuel + ' s of fuel left' : L.fuel + '% fuel left';
      var land = L.crashed
        ? { call: 'You came down at ' + L.vVel.toFixed(1) + ' m/s', result: 'a hard landing (the limit is 3 m/s)' + (L.fuel <= 0 ? ', with the tanks dry' : '') }
        : { call: 'You touched down at ' + L.vVel.toFixed(1) + ' m/s', result: 'landing grade ' + L.grade + ', with ' + fuelTxt };
      var shortParts = [];
      if (sum.mcc === 'skipped') shortParts.push(D.skipFuel + ' s from the skipped correction');
      (sum.events ? sum.events.items : []).forEach(function (it) { if (it.fuel) shortParts.push(it.fuel + ' s from ' + it.title); });
      var shortBy = (sum.mcc === 'skipped' ? D.skipFuel : 0) + (sum.events ? sum.events.fuel : 0);
      if (shortBy > 0) land.result += '. Your earlier calls are part of that: you started ' + shortBy + ' s short (' + shortParts.join(', ') + ')';
      if (sum.events && sum.events.boulders && !L.crashed) land.result += '. Setting down among the boulders cost points on the score';
      steps.push(land);
    }
    if (sum.decisions.total > 0) {
      steps.push({ call: 'You handled ' + sum.decisions.total + ' mission event' + (sum.decisions.total === 1 ? '' : 's') + ', ' + sum.decisions.optimal + ' the way Apollo would have',
        result: 'crew morale ended at ' + sum.morale + '%' });
    }
    if (sum.entry) {
      var E = sum.entry;
      steps.push({ call: 'You set the entry angle to ' + E.angle.toFixed(1) + MM_DEG_SIGN,
        result: E.outcome === 'nominal' ? 'inside the corridor, about ' + E.peakG + ' g at peak'
          : E.outcome === 'skip' ? 'too shallow: the atmosphere threw the capsule back out'
          : 'too steep: about ' + E.peakG + ' g, harder on the crew and the heat shield' });
    }
    return steps;
  }
  // One row of the flights table: mode, TLI, landing, fuel left, entry, quiz. A saved
  // entry is user data, so every field is checked before it is printed.
  function mmFlightRow(f) {
    f = mmIsObj(f) ? f : {};
    var T = mmIsObj(f.tli) ? f.tli : null, L = mmIsObj(f.landing) ? f.landing : null, E = mmIsObj(f.entry) ? f.entry : null, Q = mmIsObj(f.quiz) ? f.quiz : null;
    return [
      MM_MODE_NAMES[f.difficulty] || MM_DASH,
      !T ? MM_DASH : T.onTime ? 'on time' : (mmNum(T.offByDeg) ? T.offByDeg : '?') + MM_DEG_SIGN + ' ' + (T.side === 'late' ? 'late' : 'early'),
      !L ? MM_DASH : L.crashed ? 'hard landing' : 'grade ' + (L.grade ? String(L.grade) : '?') + (mmNum(L.score) ? ' (' + L.score + ')' : ''),
      !L || !mmNum(L.fuel) ? MM_DASH : L.fuel + (L.fuelUnit === 's' ? ' s' : '%'),
      !E ? MM_DASH : E.outcome === 'nominal' ? 'corridor' : E.outcome === 'skip' ? 'skip-out' : 'too steep',
      !Q || !mmNum(Q.correct) ? MM_DASH : Q.correct + '/' + (mmNum(Q.total) ? Q.total : '?')
    ];
  }
  function mmCompareFlights(prev, cur) {
    prev = mmIsObj(prev) ? prev : {};
    var parts = [];
    var P = mmIsObj(prev.landing) ? prev.landing : null, C = cur.landing;
    var entryName = function (e) { return e.outcome === 'nominal' ? 'in the corridor' : e.outcome === 'skip' ? 'skip-out' : 'too steep'; };
    if (P && C) {
      if (P.crashed && !C.crashed) parts.push('a hard landing became a touchdown');
      else if (!P.crashed && C.crashed) parts.push('a touchdown became a hard landing');
      else if (!C.crashed && mmNum(P.score)) parts.push('landing score ' + P.score + ' ' + MM_ARROW + ' ' + C.score);
      if (mmNum(P.fuel) && P.fuelUnit === C.fuelUnit) parts.push('fuel left ' + P.fuel + ' ' + MM_ARROW + ' ' + C.fuel + (C.fuelUnit === 's' ? ' s' : '%'));
    }
    if (mmIsObj(prev.tli) && cur.tli && !!prev.tli.onTime !== cur.tli.onTime) parts.push(cur.tli.onTime ? 'TLI now inside the window' : 'TLI now outside the window');
    if (mmIsObj(prev.entry) && cur.entry && prev.entry.outcome !== cur.entry.outcome) parts.push('entry ' + entryName(prev.entry) + ' ' + MM_ARROW + ' ' + entryName(cur.entry));
    if (mmIsObj(prev.quiz) && mmNum(prev.quiz.correct) && prev.quiz.correct !== cur.quiz.correct) parts.push('quiz ' + prev.quiz.correct + ' ' + MM_ARROW + ' ' + cur.quiz.correct);
    return parts.length ? parts.join('; ') : 'no change on the calls both flights made';
  }
  // Plain text a student can paste wherever the teacher collects work.
  function mmFlightReport(sum, opts) {
    opts = opts || {};
    var out = [];
    var ln = function (x) { out.push(x); };
    ln('Apollo Moon Mission ' + MM_DASH + ' flight report');
    ln((sum.when ? 'Date: ' + sum.when + '   ' : '') + 'Mode: ' + MM_MODE_NAMES[sum.difficulty]);
    ln('');
    ln('TLI burn: ' + (!sum.tli ? 'not flown' : sum.tli.onTime ? 'inside the window' : sum.tli.offByDeg + MM_DEG_SIGN + ' ' + sum.tli.side + ', outside the window'));
    ln('Mid-course correction: ' + (sum.mcc === 'corrected' ? 'burned' : sum.mcc === 'skipped' ? 'declined' : 'not needed'));
    var L = sum.landing;
    ln('Landing: ' + (!L ? 'not flown'
      : (L.crashed ? 'hard landing at ' : 'touchdown at ') + L.vVel.toFixed(1) + ' m/s, drift ' + L.hVel.toFixed(1) + ' m/s, '
        + (L.fuelUnit === 's' ? L.fuel + ' s of fuel left' : L.fuel + '% fuel left') + (L.crashed ? '' : ', score ' + L.score + ' (' + L.grade + ')')));
    var E = sum.entry;
    ln('Entry: ' + (!E ? 'not flown' : E.angle.toFixed(1) + MM_DEG_SIGN + ', ' + (E.outcome === 'nominal' ? 'in the corridor, about ' + E.peakG + ' g' : E.outcome === 'skip' ? 'too shallow, skip-out' : 'too steep, about ' + E.peakG + ' g')));
    ln('Quiz: ' + sum.quiz.correct + ' / ' + sum.quiz.total + '   Rock types collected: ' + sum.samples + ' / ' + sum.sampleTotal);
    var dec = (Array.isArray(opts.decisions) ? opts.decisions : []).filter(mmIsObj);
    if (dec.length) {
      ln('');
      ln('Mission events:');
      dec.forEach(function (x) { ln('- ' + x.title + ': chose "' + x.chosen + '" (' + x.quality + ')'); });
    }
    var chain = mmCauseChain(sum);
    if (chain.length) {
      ln('');
      ln('What caused what:');
      chain.forEach(function (c, i) { ln((i + 1) + '. ' + c.call + ' ' + MM_ARROW + ' ' + c.result + '.'); });
    }
    var preds = Array.isArray(opts.predictions) ? opts.predictions : [];
    if (preds.length) {
      ln('');
      ln('Predictions: ' + preds.filter(function (p) { return p.right; }).length + ' of ' + preds.length + ' matched the flight');
      preds.forEach(function (p) { ln('- ' + p.short + ': predicted "' + p.chosenLabel + '"' + (p.right ? ' (right)' : ' (the flight showed: ' + p.correctLabel + ')')); });
    }
    if (opts.previous) { ln(''); ln('Compared with my last flight: ' + mmCompareFlights(opts.previous, sum)); }
    var r = mmIsObj(opts.reflection) ? opts.reflection : {};
    ln('');
    ln('The decision that mattered most: ' + (String(r.mattered || '').trim() || '(not answered)'));
    ln('Next time I will: ' + (String(r.next || '').trim() || '(not answered)'));
    return out.join(String.fromCharCode(10));
  }
  try { window.MoonMissionPure = Object.assign(window.MoonMissionPure || {}, { flightSummary: mmFlightSummary, causeChain: mmCauseChain, flightRow: mmFlightRow, compareFlights: mmCompareFlights, flightReport: mmFlightReport, eventCosts: mmEventCosts }); } catch (e) {}
  // Which predictions the student made, and whether each matched what the flight showed.
  function mmPredictionResults(preds, specs) {
    preds = mmIsObj(preds) ? preds : {};
    return (Array.isArray(specs) ? specs : []).map(function (sp) {
      if (typeof preds[sp.id] !== 'string') return null;
      var pick = sp.options.filter(function (o) { return o.id === preds[sp.id]; })[0];
      var answer = sp.options.filter(function (o) { return o.id === sp.correct; })[0];
      return pick ? { id: sp.id, short: sp.short, chosenLabel: pick.label, correctLabel: answer ? answer.label : '', right: pick.id === sp.correct } : null;
    }).filter(Boolean);
  }
  try { window.MoonMissionPure = Object.assign(window.MoonMissionPure || {}, { predictionResults: mmPredictionResults }); } catch (e) {}

  function mmPadRow(aria) {
    var row = document.createElement('div');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', aria);
    row.style.cssText = 'position:absolute;left:0;right:0;bottom:8px;display:flex;justify-content:center;' +
      'align-items:center;gap:8px;z-index:14;pointer-events:none;flex-wrap:wrap;padding:0 8px';
    return row;
  }

  // What the launch HUD shows. The ascent loop runs on its own animation counters
  // (0-20,000 "altitude" units, a velocity that grows every frame) that drive the sky,
  // pitch and plume; printing those raw said ORBIT ACHIEVED at 20 km and 12,970 m/s
  // (faster than Earth escape) at 11 g, while the banner said 185 km and the next
  // phase 7.8 km/s. This maps loop progress onto an Apollo-11-like ascent instead:
  // S-IC to ~67 km and 2.4 km/s with g climbing to ~3.9 as the tanks empty, the drop
  // at each staging, S-II to ~176 km and 6.8 km/s, S-IVB to a 185 km orbit at 7.8 km/s,
  // and 0 g once the engine cuts off, because in orbit you are falling.
  function mmLaunchDisplay(p) {
    p = Math.max(0, p);
    if (p >= 1) return { altKm: 185, velMs: 7800, g: 0, stage: 3, orbit: true };
    var s;
    if (p < 0.1) {
      s = p / 0.1;
      return { altKm: 67 * Math.pow(s, 1.7), velMs: 2400 * Math.pow(s, 1.4), g: 1.2 + 2.7 * Math.pow(s, 1.6), stage: 1, orbit: false };
    }
    if (p < 0.4) {
      s = (p - 0.1) / 0.3;
      return { altKm: 67 + 109 * (1 - Math.pow(1 - s, 1.8)), velMs: 2400 + 4400 * Math.pow(s, 1.1), g: 0.9 + 0.9 * s, stage: 2, orbit: false };
    }
    s = (p - 0.4) / 0.6;
    return { altKm: 176 + 9 * (1 - Math.pow(1 - s, 2)), velMs: 6800 + 1000 * s, g: 0.55 + 0.15 * s, stage: 3, orbit: false };
  }
  // The air the ascent flies through (International Standard Atmosphere): the speed of
  // sound falls with the temperature up to 11 km, and the density thins roughly
  // exponentially above. Together with the launch display model these place Mach 1
  // and Max Q (peak dynamic pressure, half rho v squared) instead of asserting them.
  function mmSoundSpeed(altKm) {
    var T = altKm < 11 ? 288.15 - 6.5 * altKm : altKm < 20 ? 216.65 : 216.65 + (altKm - 20);
    return Math.sqrt(1.4 * 287.05 * T);
  }
  function mmAirDensity(altKm) {
    return altKm < 11 ? 1.225 * Math.pow(1 - 0.0065 * altKm * 1000 / 288.15, 4.2559) : 0.3639 * Math.exp(-(altKm - 11) / 6.34);
  }
  function mmDynamicPressure(altKm, velMs) { return 0.5 * mmAirDensity(altKm) * velMs * velMs; }
  // Share of the atmosphere still overhead: the pressure ratio, since pressure is
  // the weight of the air above. About 22% is left at 11 km and 5% at 20 km.
  function mmAirAbove(altKm) {
    return altKm < 11 ? Math.pow(1 - 0.0065 * altKm * 1000 / 288.15, 5.2559) : 0.2234 * Math.exp(-(altKm - 11) / 6.34);
  }
  // Sky colour from that air. Straight up you look through only the air overhead,
  // so the zenith darkens fast (dark blue by 20 km, black by 50); the horizon is
  // seen through a long slant of air and stays bright much longer.
  function mmSkyAt(altKm) {
    var above = mmAirAbove(Math.max(0, altKm));
    var zen = Math.sqrt(above), hor = Math.pow(above, 0.22), stars = Math.max(0, Math.min(1, (0.3 - zen) / 0.25));
    var mix = function (a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); };
    var rgb = function (c) { return 'rgb(' + c.join(',') + ')'; };
    var space = [2, 4, 14], bottom = mix(space, [150, 198, 236], hor);
    return { top: rgb(mix(space, [46, 110, 184], zen)), bottom: rgb(bottom), limb: rgb(mix(bottom, [143, 193, 236], stars)), stars: stars, haze: hor };
  }
  // An exhaust plume spreads until its pressure matches the air around it, so it
  // balloons as the air thins: over twice as wide by Max Q, 3.5 times in near-vacuum.
  function mmPlumeGrow(altKm) { return 1 + 2.5 * (1 - Math.sqrt(mmAirAbove(Math.max(0, altKm)))); }
  // The trans-Earth coast readouts came from three unrelated formulas: distance fell
  // in a straight line, "closing speed" was 3,200 + p^2 * 36,700 km/h, and the clock
  // counted to 3 days. Integrating that speed over that time covers 1.1 million km,
  // 2.9 times the trip. This falls toward Earth under Earth's gravity instead
  // (energy: v^2 = v0^2 + 2GM(1/r - 1/r0)), starting 384,400 km out at 1.0 km/s.
  // That reproduces Apollo 11's own return: about 2.5 days, and about 39,700 km/h at
  // entry interface, 6,500 km from Earth's centre (Apollo 11: 36,194 ft/s).
  var MM_GM = 398600, MM_R0 = 384400, MM_R_EI = 6500, MM_V0 = 1.0, MM_R_EARTH = 6378;
  var _mmReturnTable = (function () {
    var rows = [{ t: 0, r: MM_R0 }], r = MM_R0, t = 0, dt = 60;
    while (r > MM_R_EI) {
      r -= Math.sqrt(MM_V0 * MM_V0 + 2 * MM_GM * (1 / r - 1 / MM_R0)) * dt;
      t += dt;
      rows.push({ t: t, r: Math.max(MM_R_EI, r) });
    }
    return rows;
  })();
  var MM_RETURN_SECONDS = _mmReturnTable[_mmReturnTable.length - 1].t;
  // What the crew saw ahead on the way home. The return is a long thin ellipse (from
  // entry interface at 6,500 km, -6.5 degrees, about 11 km/s: p = 12,729 km, e = 0.984),
  // so the direction to the spacecraft swings about 156 degrees in the last hours, round
  // through Earth's midnight side to the pre-dawn entry point (about 110 degrees west of
  // noon), which puts the start of the coast 94 degrees from the Sun, where the Moon was.
  // The crew see (1 + cos psi) / 2 of the disc lit, psi being the Sun-Earth-spacecraft
  // angle: half lit for most of the coast, a thinning crescent, nearly dark an hour out.
  function mmReturnView(distKm) {
    var r = Math.max(6500, distKm + MM_R_EARTH), P = 12729, E = 0.9842;
    var nu = function (rr) { return Math.acos(Math.max(-1, Math.min(1, (P / rr - 1) / E))) / MM_DEG; };
    var psi = 250 - (nu(r) - nu(6500));
    return { psiDeg: psi, lit: (1 + Math.cos(psi * MM_DEG)) / 2, angRadiusDeg: Math.asin(Math.min(1, MM_R_EARTH / r)) / MM_DEG };
  }
  // A sphere lit from screen direction sunAng, with the fraction lit as seen: is the disc
  // point (dx, dy) from its centre in daylight? (Sun vector (sin a, 0, cos a) in the Sun's
  // frame, a the phase angle, cos a = 2 lit - 1.)
  function mmPhaseLitAt(dx, dy, r, lit, sunAng) {
    var c = Math.cos(sunAng || 0), s = Math.sin(sunAng || 0), u = dx * c + dy * s, v = -dx * s + dy * c;
    var z = Math.sqrt(Math.max(0, r * r - u * u - v * v)), ca = 2 * lit - 1, sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    return u * sa + z * ca > 0;
  }
  // Paint the dark part of that sphere (fill style set by the caller). The terminator is
  // a half-ellipse r * |2 lit - 1| wide: toward the Sun for a crescent, away past half.
  function mmPhaseShade(ctx, cx, cy, r, lit, sunAng) {
    var a = Math.max(0.01, r * Math.abs(2 * lit - 1));
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(sunAng || 0);
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, true);                       // the half away from the Sun
    ctx.ellipse(0, 0, a, r, 0, Math.PI / 2, -Math.PI / 2, lit <= 0.5);     // back along the terminator
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function mmReturnCoast(p) {
    p = Math.max(0, Math.min(1, p));
    var target = p * MM_RETURN_SECONDS, rows = _mmReturnTable;
    var i = Math.min(rows.length - 1, Math.floor(target / 60));
    var r = rows[i].r;
    var v = Math.sqrt(MM_V0 * MM_V0 + 2 * MM_GM * (1 / r - 1 / MM_R0));
    return { distKm: Math.max(0, r - MM_R_EARTH), speedKmh: v * 3600, days: target / 86400, totalDays: MM_RETURN_SECONDS / 86400 };
  }
  // Re-entry peak deceleration for a given flight-path angle. The slope is set so the
  // Apollo 11 angle (-6.5 deg) gives Apollo 11's roughly 6.5 g; it gave 6.9 before,
  // right beside a sentence saying 6.5.
  function mmEntryPeakG(angleDeg) {
    return Math.round((4 + (Math.abs(angleDeg) - 5.3) * 2.08) * 10) / 10;
  }
  // Powered descent, final approach, in REAL time. The computer flies the braking
  // phase from 15 km (P63/P64); the student takes over 300 m up, as Armstrong did at
  // about 140 m. One engine: tilting it is the only way to move sideways, so every
  // change of drift is paid for in fuel, and fuel burns with throttle, counted in
  // seconds of HOVER, which is how Apollo counted it ("60 seconds", "30 seconds").
  var MM_DESCENT = {
    g: 1.62, maxAcc: 4.0, maxTilt: 0.35,
    handoverAlt: 300, handoverVv: -9, handoverHv: 4,
    pilotFuel: 110, skipFuel: 25, skipDrift: 7,
    landV: 3, landH: 5
  };
  var MM_CALLOUT_BANDS = [250, 200, 150, 100, 75, 50, 30, 20, 10, 5];
  var MM_FUEL_CALLS = [60, 30, 0];
  // One fixed 1/60 s step. st = { alt, vVel, hVel, fuel, thrust, tilt }, mutated.
  function mmDescentStep(st, input, dt) {
    if (input.thrust) st.thrust = Math.min(1, st.thrust + 0.03); else st.thrust *= 0.95;
    var cmd = input.left ? -MM_DESCENT.maxTilt : input.right ? MM_DESCENT.maxTilt : 0;
    st.tilt += (cmd - st.tilt) * 0.07;   // eased, so the vehicle swings rather than snapping
    var acc = st.fuel > 0 ? st.thrust * MM_DESCENT.maxAcc : 0;
    st.vVel += (-MM_DESCENT.g + acc * Math.cos(st.tilt)) * dt;
    st.hVel += acc * Math.sin(st.tilt) * dt;
    st.alt += st.vVel * dt;
    st.fuel = Math.max(0, st.fuel - (acc / MM_DESCENT.g) * dt);
    return st;
  }
  // Score and its parts, so the breakdown under the score shows the points actually
  // earned (it used to print "Soft touch +30 | Low drift +20" whatever happened).
  function mmLandingScore(vAbs, hAbs, fuelSec, rough) {
    var parts = [
      { label: 'Soft touch', pts: vAbs < 1 ? 30 : vAbs < 2 ? 20 : 10 },
      { label: 'Low drift', pts: hAbs < 1 ? 20 : hAbs < 2.5 ? 10 : 0 },
      { label: 'Fuel reserve', pts: fuelSec >= 30 ? 30 : fuelSec >= 15 ? 20 : fuelSec > 0 ? 10 : 0 },
      { label: 'Margin bonus', pts: Math.min(20, Math.floor(Math.max(0, fuelSec) / 3)) }
    ];
    // Landing where the computer aimed, among the boulders (a mission-event choice):
    // up to 20 points off, never below zero, so the parts still add up to the score.
    if (rough) {
      var base = parts.reduce(function (a, p) { return a + p.pts; }, 0);
      parts.push({ label: 'Boulder field', pts: -Math.min(20, base) });
    }
    var total = parts.reduce(function (a, p) { return a + p.pts; }, 0);
    var grade = total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 50 ? 'C' : 'D';
    return { total: total, grade: grade, parts: parts };
  }
  try { window.MoonMissionPure = Object.assign(window.MoonMissionPure || {}, { launchDisplay: mmLaunchDisplay, returnCoast: mmReturnCoast, returnView: mmReturnView, phaseLitAt: mmPhaseLitAt, entryPeakG: mmEntryPeakG, descent: MM_DESCENT, descentStep: mmDescentStep, landingScore: mmLandingScore, earthLandPaths: mmEarthLandPaths, earthClouds: mmEarthClouds, drawEarth: drawDetailedEarth, saturnV: mmDrawSaturnV, saturnVHeight: function () { return MM_SATURN_V_H; }, moonProject: mmMoonProject, moonMaria: mmMoonMariaPaths, moonSites: function () { return MM_MOON_SITES; }, terminatorLon: function () { return MM_TERMINATOR_LON; }, craftInShadow: mmCraftInShadow, splashPose: mmSplashPose, entryState: mmEntryState, coastAt: mmCoastAt, coastSpeed: mmCoastSpeed, soundSpeed: mmSoundSpeed, dynamicPressure: mmDynamicPressure, airAbove: mmAirAbove, skyAt: mmSkyAt, plumeGrow: mmPlumeGrow, equalPull: function () { return MM_EQUAL_PULL; } }); } catch (e) {}

  function _seededRand(seed) {
    var s = (seed * 16807 + 1) % 2147483647;
    return { next: function() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }, s: s };
  }

  // ── Earth's landmasses: low-resolution coastlines, [lon, lat] in degrees ──
  // Enough outline to be recognisable at every size this tool draws Earth (a 14px
  // horizon disc up to a ~90px orbit view). k picks the fill: land, arid overlay
  // painted over land, or ice. Rings are closed implicitly.
  var MM_EARTH_LAND = [
    { k: 'land', p: [[-166,68],[-156,71],[-141,70],[-128,70],[-115,68],[-96,69],[-86,70],[-82,66],[-88,64],[-94,60],[-93,57],[-85,55],[-80,52],[-78,58],[-72,61],[-64,60],[-61,56],[-56,52],[-59,48],[-65,45],[-70,43],[-74,40],[-76,36],[-80,32],[-81,27],[-80,25],[-83,29],[-89,30],[-94,29],[-97,26],[-97,21],[-94,18],[-90,21],[-87,21],[-88,16],[-84,15],[-83,10],[-79,9],[-77,8],[-80,8],[-83,8],[-86,11],[-92,14],[-97,16],[-105,20],[-106,23],[-109,26],[-113,31],[-111,26],[-110,23],[-114,28],[-117,32],[-121,35],[-124,40],[-124,47],[-127,50],[-132,54],[-137,58],[-145,60],[-152,59],[-158,57],[-164,55],[-158,58],[-162,60],[-165,63]] },
    { k: 'land', p: [[-77,8],[-72,12],[-64,11],[-60,8],[-52,5],[-50,1],[-44,-2],[-38,-4],[-35,-7],[-37,-12],[-39,-17],[-41,-22],[-45,-24],[-48,-27],[-53,-33],[-57,-36],[-58,-38],[-62,-39],[-65,-42],[-66,-46],[-69,-50],[-68,-54],[-71,-54],[-74,-50],[-75,-45],[-73,-40],[-72,-33],[-71,-27],[-70,-19],[-75,-15],[-78,-10],[-81,-6],[-80,-2],[-78,1],[-78,4]] },
    { k: 'land', p: [[-17,21],[-16,27],[-13,28],[-10,30],[-9,32],[-6,35],[-2,35],[3,37],[10,37],[11,33],[15,32],[20,32],[20,31],[25,32],[30,31],[32,31],[34,28],[33,27],[35,24],[37,21],[38,18],[39,15],[43,12],[45,11],[51,12],[50,8],[47,4],[43,-1],[41,-2],[40,-6],[39,-11],[40,-15],[36,-18],[35,-22],[33,-25],[32,-29],[28,-33],[25,-34],[20,-35],[18,-33],[17,-29],[15,-26],[13,-22],[12,-17],[12,-13],[13,-9],[12,-5],[9,-1],[9,4],[6,4],[3,6],[-2,5],[-5,5],[-8,4],[-11,6],[-13,8],[-15,11],[-17,14]] },
    { k: 'land', p: [[-9,37],[-9,43],[-2,44],[-1,46],[-4,48],[-1,49],[2,51],[5,53],[8,54],[8,57],[10,59],[5,59],[5,62],[11,64],[15,68],[20,70],[26,71],[31,70],[37,69],[42,67],[44,68],[53,68],[58,70],[67,71],[70,73],[80,73],[87,75],[100,77],[113,74],[124,73],[134,72],[143,73],[153,71],[162,70],[170,70],[180,68],[180,65],[172,61],[163,58],[160,53],[156,51],[156,57],[152,59],[143,59],[137,55],[140,50],[141,48],[137,45],[133,43],[130,42],[129,40],[128,35],[126,35],[126,37],[122,40],[119,39],[118,38],[120,36],[122,31],[121,28],[119,25],[117,23],[114,22],[110,21],[108,21],[106,19],[107,16],[109,12],[106,9],[103,10],[100,13],[99,10],[100,7],[103,2],[104,1],[101,2],[99,5],[98,8],[98,12],[97,17],[94,17],[94,19],[92,22],[89,22],[87,21],[85,19],[80,15],[80,10],[78,8],[76,9],[74,15],[73,19],[72,21],[70,22],[67,24],[62,25],[57,26],[56,27],[52,28],[50,30],[48,30],[49,27],[51,25],[52,24],[56,24],[57,24],[59,22],[57,19],[55,17],[52,16],[48,14],[45,13],[43,13],[42,16],[39,21],[37,25],[35,28],[35,31],[35,33],[36,36],[33,36],[30,36],[28,37],[26,40],[23,40],[22,37],[21,39],[19,42],[16,43],[13,45],[14,42],[16,41],[18,40],[16,38],[15,40],[12,42],[10,44],[7,43],[3,43],[3,42],[0,40],[-1,38],[-2,37],[-5,36],[-6,36]] },
    { k: 'land', p: [[-5,50],[1,51],[2,53],[0,54],[-2,56],[-2,58],[-5,58],[-6,56],[-5,55],[-3,54],[-4,53],[-5,52],[-4,51]] },
    { k: 'land', p: [[-10,52],[-6,52],[-6,55],[-8,55],[-10,54]] },
    { k: 'land', p: [[-24,65],[-22,66],[-16,66],[-14,65],[-18,63],[-22,64]] },
    { k: 'land', p: [[44,-25],[47,-25],[50,-16],[49,-12],[46,-16],[43,-22]] },
    { k: 'land', p: [[130,31],[132,34],[135,34],[140,35],[141,38],[142,40],[141,43],[145,44],[142,45],[140,42],[139,38],[136,36],[132,35]] },
    { k: 'land', p: [[95,5],[98,4],[103,0],[106,-4],[106,-6],[102,-4],[100,-1],[97,2]] },
    { k: 'land', p: [[109,2],[113,4],[117,7],[119,5],[118,1],[117,-2],[114,-4],[110,-3],[109,0]] },
    { k: 'land', p: [[131,-1],[138,-2],[145,-4],[150,-10],[143,-9],[138,-8],[134,-4]] },
    { k: 'land', p: [[114,-22],[122,-18],[126,-14],[130,-12],[136,-12],[137,-16],[140,-18],[142,-11],[146,-19],[150,-22],[153,-25],[153,-29],[151,-33],[150,-37],[147,-38],[144,-38],[141,-38],[138,-35],[136,-35],[134,-32],[130,-31],[124,-34],[119,-35],[115,-34],[115,-30],[113,-26]] },
    { k: 'land', p: [[172,-34],[175,-37],[178,-38],[176,-40],[174,-41],[172,-44],[170,-46],[167,-46],[168,-44],[171,-42],[173,-40]] },
    // Deserts, painted over the land beneath them.
    { k: 'arid', p: [[-16,21],[-10,29],[-2,33],[10,33],[20,31],[31,31],[33,26],[36,22],[32,17],[22,16],[12,15],[2,15],[-8,16],[-15,17]] },
    { k: 'arid', p: [[35,29],[39,21],[42,16],[45,13],[52,16],[55,17],[59,22],[56,24],[51,25],[49,27],[48,30],[45,33],[40,33],[37,31]] },
    { k: 'arid', p: [[55,45],[60,37],[70,37],[80,40],[90,42],[105,42],[115,45],[105,48],[90,48],[75,46],[62,48]] },
    { k: 'arid', p: [[118,-24],[125,-20],[133,-20],[140,-23],[141,-29],[135,-31],[128,-30],[120,-28]] },
    // Ice: Greenland, Antarctica and the Arctic pack. The polar rings run through
    // the pole so each one encloses it.
    { k: 'ice', p: [[-73,78],[-60,82],[-32,83],[-20,81],[-18,76],[-22,70],[-32,68],[-40,65],[-44,60],[-50,62],[-53,67],[-55,71],[-60,76]] },
    { k: 'ice', p: [[-180,-78],[-150,-75],[-120,-73],[-90,-72],[-60,-64],[-57,-63],[-45,-70],[-20,-70],[0,-69],[30,-69],[60,-67],[90,-66],[120,-66],[150,-68],[170,-72],[180,-78],[180,-90],[-180,-90]] },
    { k: 'ice', p: [[-180,80],[-120,81],[-60,82],[0,82],[60,81],[120,79],[180,80],[180,90],[-180,90]] }
  ];
  var MM_EARTH_TILT_DEG = 12;       // view latitude: a little of the north pole shows
  var MM_EARTH_START_LON = 20;      // first frame is centred on Africa, like the Blue Marble
  var MM_EARTH_DEG_PER_TICK = 0.0458; // the old 0.0008 rad per frame, unchanged
  var _mmEarthRings = null;
  // Resample every ring to <= 3 degree steps, once. Dense steps are what let a
  // hidden stretch of coast be traced smoothly along the limb (see below).
  function mmEarthRings() {
    if (_mmEarthRings) return _mmEarthRings;
    var D = Math.PI / 180;
    _mmEarthRings = MM_EARTH_LAND.map(function (shape) {
      var src = shape.p, out = [];
      for (var i = 0; i < src.length; i++) {
        var a = src[i], b = src[(i + 1) % src.length];
        var steps = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 3));
        for (var s = 0; s < steps; s++) {
          var lon = (a[0] + (b[0] - a[0]) * s / steps) * D, lat = (a[1] + (b[1] - a[1]) * s / steps) * D;
          out.push([lon, Math.sin(lat), Math.cos(lat)]);
        }
      }
      out.push(out[0]);   // explicit close so a hidden run ends where it began
      return { k: shape.k, v: out };
    });
    return _mmEarthRings;
  }
  // Orthographic projection of every landmass for a globe of radius r at (cx,cy),
  // turned for frame `tick`. Earth turns eastward, so coast rises over the left limb
  // and sets behind the right one. A vertex on the far side cannot be drawn where it
  // is: clamping each one to the rim independently draws CHORDS straight across the
  // disc whenever consecutive hidden vertices land far apart on the rim. Instead the
  // hidden stretch is traced ALONG the rim, unwrapping the rim angle step by step so
  // the path follows the limb the way the coast does behind it.
  // Returns [{ k, i, pts: [[x,y],...] }] for the landmasses with anything in view;
  // i is the landmass's index in MM_EARTH_LAND.
  function mmEarthLandPaths(cx, cy, r, tick) {
    var D = Math.PI / 180;
    var lam0 = (MM_EARTH_START_LON - (tick || 0) * MM_EARTH_DEG_PER_TICK) * D;
    var sP = Math.sin(MM_EARTH_TILT_DEG * D), cP = Math.cos(MM_EARTH_TILT_DEG * D);
    var rings = mmEarthRings(), out = [];
    for (var ri = 0; ri < rings.length; ri++) {
      var v = rings[ri].v, pts = [], anyVisible = false, prevAng = null, ang = 0;
      for (var i = 0; i < v.length; i++) {
        var dl = v[i][0] - lam0, sl = v[i][1], cl = v[i][2], cd = Math.cos(dl);
        var x = cl * Math.sin(dl), y = cP * sl - sP * cl * cd;
        var visible = sP * sl + cP * cl * cd >= 0;
        var raw = Math.atan2(y, x);
        if (visible) {
          anyVisible = true;
          ang = raw;
          pts.push([cx + x * r, cy - y * r]);
        } else {
          if (prevAng === null) { ang = raw; }
          else {
            var step = raw - prevAng;
            while (step > Math.PI) step -= 2 * Math.PI;
            while (step < -Math.PI) step += 2 * Math.PI;
            // Near the point straight behind the globe a small step on the sphere
            // swings the rim angle a long way (13 degrees measured, in Eurasia).
            // Fill the gap along the arc so the edge follows the limb exactly
            // instead of cutting a straight chord.
            var sub = Math.ceil(Math.abs(step) / 0.05);
            for (var si = 1; si < sub; si++) {
              var sa = ang + step * si / sub;
              pts.push([cx + Math.cos(sa) * r, cy - Math.sin(sa) * r]);
            }
            ang += step;
          }
          pts.push([cx + Math.cos(ang) * r, cy - Math.sin(ang) * r]);
        }
        prevAng = raw;
      }
      if (anyVisible) out.push({ k: rings[ri].k, i: ri, pts: pts });
    }
    return out;
  }

  // ── Detailed Earth with continents, clouds, atmosphere ──
  // Clouds on the globe, placed in longitude and latitude and projected the same way
  // as the coastlines, so they turn with the Earth and flatten toward the limb: the
  // band of storms along the equator, chains of storm cloud at mid-latitudes, and
  // scattered cells. (They were seven fixed arcs round the centre, read as rings.)
  var _mmCloudCells = null;
  function mmCloudCells() {
    if (_mmCloudCells) return _mmCloudCells;
    var s = 20260924, cells = [];
    var rnd = function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
    for (var lon = -180; lon < 180; lon += 9) cells.push([lon + rnd() * 6, 6 + (rnd() - 0.5) * 8, 3 + rnd() * 3]);     // equatorial band
    for (var sy = 0; sy < 9; sy++) {                                                                     // storm chains
      var lat0 = (sy % 2 ? -1 : 1) * (38 + rnd() * 18), lon0 = -180 + sy * 40 + rnd() * 20;
      for (var k = 0; k < 7; k++) cells.push([lon0 + k * 4.5, lat0 + (lat0 > 0 ? -1 : 1) * k * 2.2 + Math.sin(k) * 2, 2.5 + rnd() * 2.5]);
    }
    for (var sc = 0; sc < 40; sc++) cells.push([-180 + rnd() * 360, (rnd() - 0.5) * 130, 1.5 + rnd() * 2.5]);  // scattered
    _mmCloudCells = [];
    cells.forEach(function (c) {                          // each a few overlapping puffs, drawn out east-west
      for (var p = 0; p < 4; p++) {
        _mmCloudCells.push({ lon: c[0] + (rnd() - 0.5) * c[2] * 2.6, lat: c[1] + (rnd() - 0.5) * c[2] * 0.9, size: c[2] * (0.45 + rnd() * 0.4) });
      }
    });
    return _mmCloudCells;
  }
  function mmEarthClouds(cx, cy, r, tick) {
    var D = Math.PI / 180;
    var lam0 = (MM_EARTH_START_LON - (tick || 0) * MM_EARTH_DEG_PER_TICK) * D;
    var sP = Math.sin(MM_EARTH_TILT_DEG * D), cP = Math.cos(MM_EARTH_TILT_DEG * D), out = [];
    mmCloudCells().forEach(function (c, idx) {
      var dl = c.lon * D - lam0, sl = Math.sin(c.lat * D), cl = Math.cos(c.lat * D), cd = Math.cos(dl);
      var z = sP * sl + cP * cl * cd;
      if (z <= 0.05) return;                                   // behind the globe, or edge-on
      var x = cl * Math.sin(dl), y = cP * sl - sP * cl * cd, big = c.size * D * r;
      out.push({ x: cx + x * r, y: cy - y * r, along: big, across: big * z, rot: Math.atan2(-y, x), z: z, i: idx });
    });
    return out;
  }
  function drawDetailedEarth(ctx, cx, cy, r, tick, sunAng, litFrac) {
    if (r < 3) { ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); return; }
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    // Ocean base
    var og = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 0, cx, cy, r);
    og.addColorStop(0, '#4a9aea'); og.addColorStop(0.5, '#2563eb'); og.addColorStop(1, '#1e3a6e');
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Continents, deserts and ice from real (coarse) coastlines. They used to be
    // three bezier blobs whose x swung by cos(rot) around the centre: two green
    // lenses that never set behind the limb, so the globe read as an eye, not Earth.
    var FILL = { land: '#3f7d3a', arid: '#b09359', ice: 'rgba(236,244,250,0.92)' };
    var paths = mmEarthLandPaths(cx, cy, r, tick);
    for (var pi = 0; pi < paths.length; pi++) {
      var pts = paths[pi].pts;
      ctx.fillStyle = FILL[paths[pi].k];
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var qi = 1; qi < pts.length; qi++) ctx.lineTo(pts[qi][0], pts[qi][1]);
      ctx.closePath(); ctx.fill();
    }
    // Clouds (mmEarthClouds), soft and white; too small to see on a tiny globe.
    if (r >= 16) {                                        // one path, so overlaps merge into a shape
      ctx.save();
      ctx.filter = 'blur(' + Math.max(0.6, r * 0.012).toFixed(2) + 'px)';   // ignored where unsupported
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      mmEarthClouds(cx, cy, r, tick).forEach(function (c) {
        ctx.moveTo(c.x + c.across * Math.cos(c.rot), c.y + c.across * Math.sin(c.rot));
        ctx.ellipse(c.x, c.y, c.across, c.along, c.rot, 0, Math.PI * 2);
      });
      ctx.fill();
      ctx.restore();
    }
    // Limb darkening over land as well as sea, so the flat fills read as a sphere.
    var limb = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.35, cx, cy, r);
    limb.addColorStop(0, 'rgba(4,12,40,0)'); limb.addColorStop(0.75, 'rgba(4,12,40,0.12)'); limb.addColorStop(1, 'rgba(4,12,40,0.5)');
    ctx.fillStyle = limb; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    if (typeof sunAng === 'number') {
      // Night side, away from the Sun (sunAng: the direction the light comes from),
      // with a soft terminator and lights along the night-side coasts.
      var sx = Math.cos(sunAng), sy = Math.sin(sunAng), phased = typeof litFrac === 'number';
      if (phased) {                                      // seen at a phase: crescent or gibbous
        ctx.save();
        ctx.filter = 'blur(' + Math.max(0.5, r * 0.02).toFixed(2) + 'px)';
        ctx.fillStyle = 'rgba(2,6,23,0.92)';
        mmPhaseShade(ctx, cx, cy, r * 1.03, litFrac, sunAng);
        ctx.restore();
      } else {
        var ng = ctx.createLinearGradient(cx + sx * r * 0.15, cy + sy * r * 0.15, cx - sx * r, cy - sy * r);
        ng.addColorStop(0, 'rgba(2,6,23,0)'); ng.addColorStop(0.18, 'rgba(2,6,23,0.8)'); ng.addColorStop(1, 'rgba(2,6,23,0.93)');
        ctx.fillStyle = ng; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      ctx.fillStyle = 'rgba(253,224,71,0.85)';
      for (var li = 0; li < paths.length; li++) {
        if (paths[li].k !== 'land') continue;
        var lp = paths[li].pts;
        for (var lj = 0; lj < lp.length; lj += 3) {
          var ldx = lp[lj][0] - cx, ldy = lp[lj][1] - cy;
          if (phased ? mmPhaseLitAt(ldx, ldy, r, Math.min(1, litFrac + 0.08), sunAng) : ldx * sx + ldy * sy > -r * 0.2) continue;   // day side or twilight
          if (ldx * ldx + ldy * ldy > r * r * 0.97) continue;       // traced along the limb
          if ((lj * 7 + li * 13) % 5 > 1) continue;                 // not every coast point
          ctx.fillRect(lp[lj][0] - 0.6, lp[lj][1] - 0.6, 1.2, 1.2);
        }
      }
    }
    ctx.restore();
    // Atmosphere glow, outside the disc only. A radial gradient also paints everything
    // inside its inner circle in its first colour, so filling the whole circle laid a 25%
    // blue wash over the globe and no night side ever looked dark. Rings now: the inner
    // circle is wound the other way, which cuts it out.
    ctx.save();
    ctx.globalAlpha = 0.25;
    var ag = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 1.2);
    ag.addColorStop(0, '#60a5fa'); ag.addColorStop(0.6, '#38bdf8'); ag.addColorStop(1, 'transparent');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2); ctx.arc(cx, cy, r, 0, Math.PI * 2, true); ctx.fill();
    ctx.globalAlpha = 0.07;
    var ag2 = ctx.createRadialGradient(cx, cy, r * 1.1, cx, cy, r * 1.45);
    ag2.addColorStop(0, '#93c5fd'); ag2.addColorStop(1, 'transparent');
    ctx.fillStyle = ag2; ctx.beginPath(); ctx.arc(cx, cy, r * 1.45, 0, Math.PI * 2); ctx.arc(cx, cy, r, 0, Math.PI * 2, true); ctx.fill();
    ctx.restore();
  }

  // ── Saturn V, drawn in its real proportions ──
  // Top to bottom: visible height in metres, diameter at the top and bottom of each
  // section. Each stage's own engines hang inside the interstage below it, so only
  // the part that shows is counted; with the F-1 bells under the base the stack is
  // the 110.6 m the fact card quotes, about 11 times its 10.1 m width. It used to be
  // drawn at ~3.6:1 on the pad (width tied to the canvas WIDTH, height to the HEIGHT,
  // so wide screens made it fatter still) and as a fixed 18x50 block in flight that
  // never shed a stage while the caption announced each separation.
  // `drop` is the flight stage at which a section leaves: the S-IC and its interstage
  // go at the first staging, the S-II and the S-IVB's flared adapter at the second.
  var MM_SATURN_V = [
    { id: 'les',   h: 8.9,  d0: 0.5,  d1: 1.0 },            // launch escape tower
    { id: 'cm',    h: 3.2,  d0: 0.4,  d1: 3.9 },            // command module
    { id: 'sm',    h: 4.4,  d0: 3.9,  d1: 3.9 },            // service module
    { id: 'sla',   h: 8.5,  d0: 3.9,  d1: 6.6 },            // LM adapter (the LM rides inside)
    { id: 'iu',    h: 0.9,  d0: 6.6,  d1: 6.6 },            // instrument unit
    { id: 's4b',   h: 12,   d0: 6.6,  d1: 6.6 },            // third stage
    { id: 's4bis', h: 5.8,  d0: 6.6,  d1: 10.1, drop: 3 },  // S-II/S-IVB adapter
    { id: 's2',    h: 19.2, d0: 10.1, d1: 10.1, drop: 3 },  // second stage
    { id: 's1is',  h: 5.6,  d0: 10.1, d1: 10.1, drop: 2 },  // S-IC/S-II interstage
    { id: 's1',    h: 38.5, d0: 10.1, d1: 10.1, drop: 2 }   // first stage
  ];
  // Exposed nozzle below each stage's base: length, exit and top diameter.
  var MM_SATURN_BELLS = { s1: [3.5, 3.7, 2.4], s2: [3.4, 2.1, 0.9], s4b: [3.4, 2.1, 0.9] };
  var MM_SATURN_V_H = MM_SATURN_V.reduce(function (a, p) { return a + p.h; }, 0) + MM_SATURN_BELLS.s1[0];

  // Draw the stack with its top at (cx, topY), the FULL stack `fullH` tall, as it is
  // during flight stage `stage` (1 = everything). The spacecraft stays put as stages
  // fall away, so the vehicle gets shorter from the bottom. Returns what callers
  // need: the nozzle exit y (where exhaust starts) and the drawn sections, so a
  // tower arm can reach the actual hull.
  //   opts.les  = false once the escape tower has been jettisoned
  //   opts.only = [ids] draws just those sections (a spent stage falling away)
  function mmDrawSaturnV(ctx, cx, topY, fullH, stage, opts) {
    opts = opts || {};
    var k = fullH / MM_SATURN_V_H;
    var y = topY, sections = [];
    for (var i = 0; i < MM_SATURN_V.length; i++) {
      var p = MM_SATURN_V[i];
      var attached = !(p.drop && stage >= p.drop);
      var y1 = y + p.h * k;
      if (opts.only ? opts.only.indexOf(p.id) !== -1 : attached && !(p.id === 'les' && opts.les === false)) {
        mmSaturnSection(ctx, cx, y, y1, p.d0 * k, p.d1 * k, p.id);
        sections.push({ id: p.id, y0: y, y1: y1, w0: p.d0 * k, w1: p.d1 * k });
      }
      if (!opts.only && !attached) break;   // nothing below a dropped stage is attached
      y = y1;
    }
    var last = sections[sections.length - 1];
    var base = last ? last.y1 : topY, nozzle = base;
    var bell = last && MM_SATURN_BELLS[last.id];
    if (bell) {
      // Five F-1s on the S-IC and five J-2s on the S-II (three in view), one J-2 on
      // the S-IVB.
      var xs = last.id === 's4b' ? [0] : [-0.33, 0, 0.33];
      ctx.fillStyle = '#374151';
      xs.forEach(function (f) {
        var bx = cx + f * last.w1;
        ctx.beginPath();
        ctx.moveTo(bx - bell[2] * k / 2, base);
        ctx.lineTo(bx + bell[2] * k / 2, base);
        ctx.lineTo(bx + bell[1] * k / 2, base + bell[0] * k);
        ctx.lineTo(bx - bell[1] * k / 2, base + bell[0] * k);
        ctx.closePath(); ctx.fill();
      });
      nozzle = base + bell[0] * k;
      if (last.id === 's1') {
        // Two of the four fins, in profile, with the engine fairings they sit on.
        var hw = last.w1 / 2;
        ctx.fillStyle = '#e5e7eb';
        [-1, 1].forEach(function (s) {
          ctx.beginPath();
          ctx.moveTo(cx + s * hw, base - 9 * k);
          ctx.lineTo(cx + s * (hw + 2.2 * k), base - 1.2 * k);
          ctx.lineTo(cx + s * (hw + 2.2 * k), nozzle);
          ctx.lineTo(cx + s * hw, base);
          ctx.closePath(); ctx.fill();
        });
      }
    }
    return { nozzle: nozzle, sections: sections, k: k };
  }

  // Centre of a group of sections, as a fraction of the full stack from the top: the
  // point a spent stage tumbles about.
  function mmSaturnSpanCentre(ids) {
    var y = 0, a = -1, b = -1;
    MM_SATURN_V.forEach(function (p) { if (ids.indexOf(p.id) !== -1) { if (a < 0) a = y; b = y + p.h; } y += p.h; });
    return (a + b) / 2 / MM_SATURN_V_H;
  }

  // Half-width of the drawn hull at height y (0 where there is no hull), for arms.
  function mmSaturnHalfWidthAt(geom, y) {
    for (var i = 0; i < geom.sections.length; i++) {
      var s = geom.sections[i];
      if (y >= s.y0 && y <= s.y1) return (s.w0 + (s.w1 - s.w0) * (y - s.y0) / Math.max(1e-6, s.y1 - s.y0)) / 2;
    }
    return 0;
  }

  function mmSaturnSection(ctx, cx, y0, y1, w0, w1, id) {
    var h = y1 - y0, w = Math.max(w0, w1);
    function body(fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.moveTo(cx - w0 / 2, y0); ctx.lineTo(cx + w0 / 2, y0);
      ctx.lineTo(cx + w1 / 2, y1); ctx.lineTo(cx - w1 / 2, y1);
      ctx.closePath(); ctx.fill();
    }
    // Sun from the left: a cylinder lit on one side reads as round, not flat.
    function shade(light, dark) {
      var g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
      g.addColorStop(0, light); g.addColorStop(0.45, light); g.addColorStop(1, dark);
      return g;
    }
    // Black half-panel across [a, b] of this section's height, on the shadow side:
    // the "roll pattern" that let ground cameras read the vehicle's roll.
    function roll(a, b) {
      ctx.fillStyle = '#111827';
      ctx.fillRect(cx, y0 + h * a, w / 2, h * (b - a));
    }
    function ring(frac, thick) {
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(cx - w / 2, y0 + h * frac, w, Math.max(1, thick));
    }
    if (id === 'les') {
      // Truss down to the CM, with the solid escape motor on top.
      ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = Math.max(0.6, w1 * 0.35);
      ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y1); ctx.stroke();
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(cx - w1 / 2, y0 + h * 0.08, w1, h * 0.45);
      return;
    }
    if (id === 'cm') { body(shade('#f8fafc', '#94a3b8')); return; }
    if (id === 'sm') { body(shade('#e5e7eb', '#6b7280')); ring(0.5, h * 0.05); return; }
    if (id === 'sla') { body(shade('#f1f5f9', '#94a3b8')); return; }
    if (id === 'iu') { body(shade('#cbd5e1', '#64748b')); return; }
    body(shade('#ffffff', '#9ca3af'));
    if (id === 's4b') { roll(0.62, 1); return; }
    if (id === 's2') { ring(0, h * 0.02); ring(0.98, h * 0.02); return; }
    if (id === 's1is') { ring(0.1, h * 0.12); return; }
    if (id === 's1') {
      roll(0, 0.2); roll(0.62, 1);
      // "USA" runs down the first stage, drawn only when it is big enough to read.
      if (w0 >= 16) {
        ctx.save();
        ctx.fillStyle = '#b91c1c';
        ctx.font = 'bold ' + Math.round(w0 * 0.42) + 'px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ['U', 'S', 'A'].forEach(function (ch, n) { ctx.fillText(ch, cx - w0 * 0.2, y0 + h * 0.3 + n * w0 * 0.5); });
        ctx.restore();
      }
    }
  }

  // ── Detailed Moon with procedural craters and mare ──
  // The near side as it really is: the dark maria, a few landmark craters and the
  // rays of Tycho and Copernicus, in selenographic degrees (east +, north +) under
  // the same orthographic projection as the Earth globe. It used to be random
  // polka-dot craters over four faint ovals, and the Tranquility Base marker sat
  // where no stated coordinate put it.
  var MM_MOON_MARIA = [
    { n: 'Oceanus Procellarum', c: '#7a7670', label: 'Ocean of Storms', at: [-52, 14], p: [[-40,48],[-50,44],[-60,36],[-67,26],[-72,14],[-73,2],[-68,-6],[-58,-9],[-48,-7],[-42,-3],[-36,1],[-30,-3],[-25,-7],[-19,-5],[-14,0],[-12,5],[-16,11],[-24,13],[-30,17],[-31,24],[-31,32],[-33,40]] },
    { n: 'Mare Imbrium', c: '#75726c', label: 'Sea of Rains', at: [-17, 33], p: [[-35,22],[-28,17],[-18,15],[-8,17],[-2,22],[0,28],[-2,36],[-8,43],[-18,46],[-28,45],[-35,40],[-38,32]] },
    { n: 'Mare Frigoris', c: '#86837c', label: 'Sea of Cold', at: [5, 57], p: [[-40,53],[-20,55],[0,55],[20,55],[40,54],[48,57],[40,61],[20,61],[0,61],[-20,60],[-38,58]] },
    { n: 'Mare Serenitatis', c: '#7d7a74', label: 'Sea of Serenity', at: [21, 33], p: [[8,20],[14,16],[22,17],[28,22],[29,30],[25,37],[17,40],[10,37],[7,29]] },
    { n: 'Mare Vaporum', c: '#7c7973', label: '', p: [[0,10],[5,9],[8,13],[6,17],[1,17],[-1,13]] },
    { n: 'Sinus Medii', c: '#7f7c76', label: '', p: [[-3,0],[3,-1],[6,2],[3,5],[-2,4]] },
    { n: 'Mare Tranquillitatis', c: '#6e6e6f', label: 'Sea of Tranquility', at: [31, 9], p: [[18,4],[20,12],[24,18],[30,20],[36,17],[41,14],[44,8],[42,2],[38,-2],[33,-5],[26,-3],[21,-1]] },
    { n: 'Mare Crisium', c: '#6d6a65', label: 'Sea of Crises', at: [59, 17], p: [[51,17],[53,11],[58,9],[64,10],[68,14],[68,20],[64,25],[58,26],[53,23]] },
    { n: 'Mare Fecunditatis', c: '#7b7872', label: 'Sea of Fertility', at: [51, -8], p: [[42,-2],[47,2],[54,0],[58,-4],[60,-10],[57,-16],[51,-20],[46,-17],[44,-11],[41,-6]] },
    { n: 'Mare Nectaris', c: '#7a7771', label: '', at: [35, -15], p: [[30,-11],[35,-9],[40,-12],[40,-18],[36,-21],[31,-19],[29,-15]] },
    { n: 'Mare Nubium', c: '#817e78', label: 'Sea of Clouds', at: [-17, -21], p: [[-27,-15],[-20,-11],[-11,-12],[-6,-17],[-8,-25],[-14,-30],[-22,-29],[-28,-24]] },
    { n: 'Mare Cognitum', c: '#7d7a74', label: '', p: [[-28,-8],[-22,-6],[-17,-9],[-20,-13],[-26,-13]] },
    { n: 'Mare Humorum', c: '#74716c', label: '', at: [-39, -24], p: [[-45,-21],[-39,-18],[-33,-21],[-33,-27],[-38,-31],[-44,-29]] }
  ];
  // [lon, lat, diameter km, kind]: 'ray' = young and bright with rays, 'dark' = lava floor.
  var MM_MOON_CRATERS = [
    [-11.4, -43.3, 85, 'ray', 'Tycho'], [-20.1, 9.6, 93, 'ray', 'Copernicus'], [-38.0, 8.1, 31, 'ray', 'Kepler'],
    [-47.4, 23.7, 40, 'ray', 'Aristarchus'], [46.8, 16.1, 28, 'ray', 'Proclus'],
    [-9.3, 51.6, 101, 'dark', 'Plato'], [-68.3, -5.2, 172, 'dark', 'Grimaldi'],
    [-14.1, -58.4, 225, 'rim', 'Clavius'], [26.4, -11.4, 100, 'rim', 'Theophilus'], [61.0, -8.9, 132, 'rim', 'Langrenus'],
    [-1.9, -9.2, 153, 'rim', 'Ptolemaeus'], [60.4, -25.3, 177, 'rim', 'Petavius'], [-4.0, 29.7, 81, 'rim', 'Archimedes'],
    [-3.2, -24.6, 60, 'rim', 'Arzachel'], [-7.0, -60.0, 110, 'rim', 'Maginus'], [37.0, -30.0, 90, 'rim', 'Piccolomini']
  ];
  // Where each Apollo crew landed.
  var MM_MOON_SITES = [
    { m: 11, name: 'Tranquility Base', lon: 23.473, lat: 0.674 },
    { m: 12, name: 'Ocean of Storms', lon: -23.422, lat: -3.012, side: -1 },
    { m: 14, name: 'Fra Mauro', lon: -17.471, lat: -3.645, side: 1 },
    { m: 15, name: 'Hadley\u2013Apennine', lon: 3.634, lat: 26.132, side: -1 },
    { m: 16, name: 'Descartes', lon: 15.501, lat: -8.973 },
    { m: 17, name: 'Taurus\u2013Littrow', lon: 30.772, lat: 20.191 }
  ];
  var MM_DEG = Math.PI / 180;
  // Screen position of a near-side point; z > 0 faces the viewer.
  function mmMoonProject(lon, lat, cx, cy, r) {
    var cl = Math.cos(lat * MM_DEG);
    return [cx + r * cl * Math.sin(lon * MM_DEG), cy - r * Math.sin(lat * MM_DEG), cl * Math.cos(lon * MM_DEG)];
  }
  // Landing-day light. Apollo 11 came down with the Sun 10.8 degrees above the site
  // (23.47 E), so the sunrise line was the meridian 10.8 degrees west of it, and from
  // Earth the Moon was a six-day waxing crescent (about 38% lit).
  var MM_TERMINATOR_LON = MM_MOON_SITES[0].lon - 10.8;
  // Night side of a near-side disc: everything west of the morning terminator, with a
  // dimmer band just east of it where the Sun is still low. What is left of the map
  // is the faint earthshine from a gibbous Earth.
  function mmMoonNight(ctx, cx, cy, r, termLon) {
    function band(lonA, lonB) {                           // between two meridians, or from the west limb
      ctx.beginPath();
      if (lonA === null) ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, true);
      else for (var la = 90; la >= -90; la -= 5) { var pa = mmMoonProject(lonA, la, cx, cy, r); ctx.lineTo(pa[0], pa[1]); }
      for (var lb = -90; lb <= 90; lb += 5) { var pb = mmMoonProject(lonB, lb, cx, cy, r); ctx.lineTo(pb[0], pb[1]); }
      ctx.closePath(); ctx.fill();
    }
    ctx.save();
    ctx.fillStyle = 'rgba(4,7,18,0.9)';
    band(null, termLon);
    for (var k = 1; k <= 10; k++) {                       // the low-Sun band, 16 degrees wide
      ctx.fillStyle = 'rgba(4,7,18,' + (0.9 * Math.pow(1 - k / 11, 1.6)) + ')';
      band(termLon + (k - 1) * 1.6, termLon + k * 1.6);
    }
    ctx.restore();
  }
  // Is a spacecraft orbiting at orbitK Moon radii, at angle a round the drawn ellipse
  // (sin a > 0 on the near side), inside the Moon's shadow? The Sun is 90 degrees east
  // of the terminator, on the equator; the shadow is the cylinder behind the Moon.
  function mmCraftInShadow(a, orbitK, termLon) {
    var L = (termLon + 90) * MM_DEG, px = orbitK * Math.cos(a), pz = orbitK * Math.sin(a);
    var s = px * Math.sin(L) + pz * Math.cos(L);
    return s < 0 && orbitK * orbitK - s * s < 1;
  }
  // Chaikin corner-cutting: basins are round, and the outlines are coarse.
  function mmMoonSmooth(p) {
    for (var it = 0; it < 1; it++) {
      var q = [];
      for (var i = 0; i < p.length; i++) {
        var a = p[i], b = p[(i + 1) % p.length];
        q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      p = q;
    }
    return p;
  }
  function mmMoonMariaPaths(cx, cy, r) {
    return MM_MOON_MARIA.map(function (m) {
      // Resample each edge to <= 2 degrees so the limb-ward seas curve with the sphere.
      var pts = [], sm = mmMoonSmooth(m.p);
      for (var i = 0; i < sm.length; i++) {
        var a = sm[i], b = sm[(i + 1) % sm.length];
        var n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 2));
        for (var k = 0; k < n; k++) {
          var q = mmMoonProject(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, cx, cy, r);
          pts.push([q[0], q[1]]);
        }
      }
      return { name: m.n, label: m.label, tone: m.c, pts: pts };
    });
  }
  // Point `d` radians along a great circle from (lon, lat) on bearing `b`.
  function mmMoonAlong(lon, lat, b, d) {
    var p1 = lat * MM_DEG, l1 = lon * MM_DEG;
    var p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
    var l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return [l2 / MM_DEG, p2 / MM_DEG];
  }
  function mmPaintMoon(ctx, cx, cy, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    // Highlands: bright, old, saturated with craters.
    var hg = ctx.createRadialGradient(cx + r * 0.25, cy - r * 0.2, 0, cx, cy, r);
    hg.addColorStop(0, '#e7e4dc'); hg.addColorStop(0.7, '#cfcbc2'); hg.addColorStop(1, '#a9a59d');
    ctx.fillStyle = hg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    // A fine speckle of small highland craters, fixed so it never shimmers.
    var rng = _seededRand(1969);
    for (var s = 0; s < 260; s++) {
      var slon = (rng.next() - 0.5) * 170, slat = -85 + Math.pow(rng.next(), 0.8) * 170, sd = 6 + rng.next() * 36;
      var sp = mmMoonProject(slon, slat, cx, cy, r);
      if (sp[2] <= 0.05) continue;
      var srad = sd / 1737 * r;
      ctx.fillStyle = 'rgba(120,114,104,' + (0.07 + rng.next() * 0.09) + ')';
      ctx.beginPath(); ctx.ellipse(sp[0], sp[1], srad, srad * Math.max(0.2, sp[2]), Math.atan2(sp[1] - cy, sp[0] - cx) + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
    }
    // Maria: dark basalt that flooded the big basins. A soft edge first, then the fill.
    var maria = mmMoonMariaPaths(cx, cy, r);
    function trace(pts) { ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); }
    ctx.lineJoin = 'round';
    ctx.filter = 'blur(' + Math.max(0.5, r * 0.012).toFixed(1) + 'px)';   // lava edges are soft (ignored where unsupported)
    maria.forEach(function (m) { trace(m.pts); ctx.fillStyle = m.tone; ctx.fill(); });
    ctx.filter = 'none';
    ctx.globalAlpha = 0.55;   // a firm core inside the soft edge
    maria.forEach(function (m) { trace(m.pts); ctx.fillStyle = m.tone; ctx.fill(); });
    ctx.globalAlpha = 1;
    // Mottling: flows of slightly different age and titanium content.
    var mr = _seededRand(4242);
    maria.forEach(function (m) {
      var gx = 0, gy = 0;
      m.pts.forEach(function (p) { gx += p[0] / m.pts.length; gy += p[1] / m.pts.length; });
      ctx.save(); trace(m.pts); ctx.clip();
      for (var k = 0; k < 30; k++) {
        var pt = m.pts[Math.floor(mr.next() * m.pts.length)], f = mr.next() * 0.9;
        var mx = gx + (pt[0] - gx) * f, my = gy + (pt[1] - gy) * f;
        ctx.fillStyle = mr.next() < 0.5 ? 'rgba(60,62,66,0.06)' : 'rgba(190,186,178,0.05)';
        ctx.beginPath(); ctx.arc(mx, my, r * (0.01 + mr.next() * 0.03), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
    // Rays: ejecta sprayed along great circles by the youngest impacts.
    MM_MOON_CRATERS.forEach(function (c) {
      if (c[3] !== 'ray') return;
      var big = c[4] === 'Tycho' ? 1 : c[4] === 'Copernicus' ? 0.55 : 0.28;
      var rr = _seededRand(Math.round((c[0] + 200) * 100));
      var nRays = c[4] === 'Tycho' ? 14 : 9;
      for (var k = 0; k < nRays; k++) {
        var bear = (k / nRays) * Math.PI * 2 + rr.next() * 0.4, len = (0.25 + rr.next() * 0.75) * 0.9 * big;
        var prev = null;
        for (var t = 0.02; t <= len; t += 0.02) {
          var ll = mmMoonAlong(c[0], c[1], bear, t), q = mmMoonProject(ll[0], ll[1], cx, cy, r);
          if (q[2] <= 0) break;
          if (prev) {
            ctx.strokeStyle = 'rgba(250,248,240,' + (0.32 * (1 - t / len)) + ')';
            ctx.lineWidth = Math.max(0.5, r * 0.012 * (1 - t / len));
            ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
          }
          prev = q;
        }
      }
    });
    // Landmark craters, foreshortened toward the limb.
    MM_MOON_CRATERS.forEach(function (c) {
      var q = mmMoonProject(c[0], c[1], cx, cy, r);
      if (q[2] <= 0.05) return;
      var rad = c[2] / 2 / 1737 * r, rot = Math.atan2(q[1] - cy, q[0] - cx) + Math.PI / 2, sq = Math.max(0.2, q[2]);
      function oval(k, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(q[0], q[1], rad * k, rad * k * sq, rot, 0, Math.PI * 2); ctx.fill(); }
      if (c[3] === 'dark') { oval(1, 'rgba(96,92,86,0.95)'); return; }
      if (c[3] === 'ray') { oval(1.8, 'rgba(255,253,246,0.45)'); oval(1, 'rgba(255,255,250,0.95)'); oval(0.55, 'rgba(210,206,198,0.9)'); return; }
      oval(1, 'rgba(236,233,226,0.9)'); oval(0.78, 'rgba(160,154,145,0.75)');
    });
    // Limb darkening, and the sun low in the east: it was lunar morning at Tranquility
    // Base, so the western limb is the dim one.
    var lg = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
    lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.8, 'rgba(0,0,0,0.10)'); lg.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = lg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    var sg = ctx.createLinearGradient(cx - r, cy, cx - r * 0.2, cy);
    sg.addColorStop(0, 'rgba(0,0,0,0.42)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  }
  // Painted once into a sprite and scaled: every coast frame used to redraw it all.
  var _mmMoonSprite = null;
  function drawDetailedMoon(ctx, cx, cy, r) {
    if (r < 5) { ctx.fillStyle = '#d1d5db'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); return; }
    if (_mmMoonSprite === null) {
      _mmMoonSprite = false;
      try {
        var sc = document.createElement('canvas'); sc.width = sc.height = 512;
        var sctx = sc.getContext('2d');
        if (sctx) { mmPaintMoon(sctx, 256, 256, 256); _mmMoonSprite = sc; }
      } catch (e) {}
    }
    if (_mmMoonSprite) ctx.drawImage(_mmMoonSprite, cx - r, cy - r, r * 2, r * 2);
    else mmPaintMoon(ctx, cx, cy, r);
  }

  // Whole 1/60 s steps of real time since the last frame, so an animation runs at the
  // same speed on a 30, 60 or 120 Hz screen. The first (untimed) paint steps once; the
  // first timed frame after a start or a resume has no elapsed time yet.
  function mmFrameSteps(clock, ts) {
    if (typeof ts !== 'number') return 1;
    if (clock.last === null) { clock.last = ts; return 0; }
    clock.acc += Math.min(250, Math.max(0, ts - clock.last));   // a stalled tab catches up at most 1/4 s
    clock.last = ts;
    var n = Math.floor(clock.acc / (1000 / 60) + 1e-6);
    clock.acc -= n * (1000 / 60);
    return n;
  }

  // The command module under its chutes and after splashdown, by the re-entry clock
  // (1/60 s steps). Pure so the waterline can be tested: it reaches the sea at 600 and
  // not before, flips to Stable 2 and is righted by its bags, as Apollo 11 was. The
  // horizon holds near eye level on the way down (it starts where the entry view's
  // horizon ends, 7.3 km up) and settles to the waterline at splashdown.
  function mmSplashPose(tick, HR) {
    function sm(v) { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); }
    var sT = tick - 600, afloat = tick > 600, waterY = HR * 0.70;
    return {
      capsuleY: HR * 0.3 + (waterY - 6 - HR * 0.3) * sm((tick - 360) / 240),
      oceanTop: HR * (0.762 - 0.062 * sm((tick - 360) / 240)),
      waterY: waterY, sT: sT, afloat: afloat,
      angle: afloat ? Math.PI * (sm((sT - 20) / 40) - sm((sT - 150) / 50)) : 0,
      bags: afloat ? sm((sT - 90) / 50) : 0
    };
  }

  // The fiery part of re-entry by the same clock (0 at entry interface, 360 at the
  // drogues). Heating is a pulse that peaks under a minute in; the shield's surface
  // follows it by radiative equilibrium (T proportional to the fourth root of the
  // heating), so it peaks at Apollo's 2,760 C and cools as the capsule slows. The
  // path starts at the student's entry angle and bends to vertical as speed bleeds
  // off; a skip-out climbs back out for a while, cooler, before it falls again.
  function mmEntryState(tick, outcome, angle) {
    var s = Math.min(1, Math.max(0, tick / 360));
    var sm = function (v) { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };
    var p = outcome === 'steep' ? 0.34 : 0.42, u = s / p;
    var heat = s <= 0 ? 0 : Math.pow(u, 6) * Math.exp(6 * (1 - u));
    var bump = outcome === 'skip' && s > 0.33 && s < 0.83 ? Math.sin(Math.PI * (s - 0.33) / 0.5) : 0;
    heat *= 1 - 0.75 * bump;
    var g0 = Math.abs(typeof angle === 'number' && isFinite(angle) ? angle : -6.5);
    var gamma = g0 + (90 - g0) * sm((s - 0.55) / 0.45) - (g0 + 5) * bump;
    return {
      h: 7.3 + 114.7 * Math.pow(1 - s, 1.6) + 25 * bump,
      gamma: gamma, heat: heat,
      tempC: Math.max(15, Math.round(3033 * Math.pow(heat, 0.25) - 273))
    };
  }

  // The trans-lunar coast from the energy equation, with Earth's and the Moon's gravity
  // along the line between them (the Moon held still): how far out and how fast after
  // a 10.84 km/s burn 334 km up. Straight-line, so it runs short of Apollo 11's 73
  // hours and is not used for time, but it has the shape that matters: fast off the
  // Earth, slowing all the way out, faster again only once the Moon's pull wins.
  // (MM_TLC_*: the trans-Earth return model above owns MM_R0 / MM_V0 in this scope.)
  var MM_MU_E = 398600.4, MM_MU_M = 4902.8, MM_EM_D = 384400, MM_TLC_R0 = 6712, MM_TLC_V0 = 10.84;
  var MM_COAST_END = MM_EM_D - 1737.4 - 110;                             // 110 km above the Moon
  var MM_EQUAL_PULL = MM_EM_D / (1 + Math.sqrt(MM_MU_M / MM_MU_E));    // from Earth's centre
  function mmCoastSpeed(r) {
    var e = MM_TLC_V0 * MM_TLC_V0 / 2 - MM_MU_E / MM_TLC_R0 - MM_MU_M / (MM_EM_D - MM_TLC_R0);
    return Math.sqrt(Math.max(0, 2 * (e + MM_MU_E / r + MM_MU_M / (MM_EM_D - r))));
  }
  var _mmCoast = null;
  function mmCoastTable() {
    if (_mmCoast) return _mmCoast;
    var rows = [[0, MM_TLC_R0]], t = 0, r = MM_TLC_R0;
    while (r < MM_COAST_END) {
      var dr = Math.min(500, MM_COAST_END - r);
      t += dr / mmCoastSpeed(r + dr / 2); r += dr; rows.push([t, r]);
    }
    return (_mmCoast = rows);
  }
  // Distance from Earth's centre and speed a fraction f (0..1) of the way through the
  // coast in TIME.
  function mmCoastAt(f) {
    var rows = mmCoastTable(), t = Math.min(1, Math.max(0, f)) * rows[rows.length - 1][0];
    var lo = 0, hi = rows.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (rows[mid][0] <= t) lo = mid; else hi = mid; }
    var a = rows[lo], b = rows[hi], k = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 0;
    var r = a[1] + (b[1] - a[1]) * k;
    return { r: r, v: mmCoastSpeed(r) };
  }

  // ── Enhanced starfield with size/color variation ──
  function drawStarfield(ctx, W, H, tick, count) {
    var rng = _seededRand(7919); // fixed seed for stable positions
    var colors = ['#ffffff','#ffffff','#ffffff','#ffffff','#ffffff','#ffffff','#ffffff',
                  '#b8c8ff','#b8c8ff','#fff5d0','#ffd8b0'];
    for (var si = 0; si < (count || 100); si++) {
      var sx = rng.next() * W;
      var sy = rng.next() * H;
      var sr = 0.3 + rng.next() * 1.5;
      var sc = colors[Math.floor(rng.next() * colors.length)];
      var twinkle = 0.7 + 0.3 * Math.sin((tick || 0) * 0.004 + si * 1.7); // smooth breath (the abs() cusp made stars snap at their dimmest)
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = sc;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Cinematic vignette overlay ──
  function drawVignette(ctx, W, H, intensity) {
    var vg = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.3, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
    vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(0,0,0,' + (intensity || 0.25) + ')');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  // ═══════════════════════════════════════════════════════════════
  // THE MOONWALK SURFACE  (mmLunarField and its helpers)
  // ═══════════════════════════════════════════════════════════════
  // One seeded height field owns the EVA landscape from the boots to the skyline:
  // rolling mare swells, a power-law crater population (bowl, raised rim, ejecta,
  // each new crater erasing the relief it landed on), a sinuous rille, boulders
  // thrown out of the one fresh crater, and massifs whose feet sit below the Moon's
  // own curvature. Seeded, never Math.random: a retry lands at the same site, and
  // the e2e suite pins Math.random for the sample scatter.
  var MM_MOON_RADIUS = 1737400;
  // An Apollo-style morning Sun, 17 degrees up in the east-north-east. Low enough
  // for the long, hard shadows that make lunar relief readable at all.
  var MM_EVA_SUN = (function () {
    var el = 17 * Math.PI / 180, az = Math.atan2(15, 40);
    return { x: Math.cos(el) * Math.cos(az), y: Math.sin(el), z: Math.cos(el) * Math.sin(az), tan: Math.tan(el) };
  })();
  // Fixtures the terrain keeps clear: LM, spawn, rover, flag, ALSEP [x, z, radius].
  var MM_EVA_KEEP = [[0, 0, 7.5], [3, 3, 2.6], [8, -4, 3], [4, 2, 1.6], [-6, 5, 3.6]];

  function mmLunarRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), s | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mmLunarHash(ix, iz, seed) {
    var h = (Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // Smooth value noise in -1..1; `period` (optional) makes it tile for textures.
  function mmLunarNoise(x, z, seed, period) {
    var ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    var ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10);
    var x0 = ix, x1 = ix + 1, z0 = iz, z1 = iz + 1;
    if (period) { x0 = ((x0 % period) + period) % period; x1 = ((x1 % period) + period) % period; z0 = ((z0 % period) + period) % period; z1 = ((z1 % period) + period) % period; }
    var a = mmLunarHash(x0, z0, seed), b = mmLunarHash(x1, z0, seed), c = mmLunarHash(x0, z1, seed), d = mmLunarHash(x1, z1, seed);
    return (a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz) * 2 - 1;
  }
  function mmSmooth(e0, e1, v) { var t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

  // The crater profile, with r the rim radius. Fresh craters are deep paraboloids with
  // a sharp crest; degraded ones flatten into shallow dishes with rounded rims. Depth
  // to diameter runs from ~0.2 (fresh) down to ~0.04, as it does on the real Moon.
  function mmCraterShape(t, c) {
    if (t < 1) {
      var tt = t * t, s = tt * (3 - 2 * t);
      var par = -c.depth + (c.depth + c.rim) * tt, sub = -c.depth + (c.depth + c.rim) * s;
      return sub + (par - sub) * c.fresh;
    }
    var q = t - 1, fade = Math.max(0, 1 - q / 1.6);
    return c.rim * Math.exp(-q * 3.0) * fade * fade;
  }

  function mmLunarField(lowPower) {
    var rand = mmLunarRng(0x4c554e41);
    var craters = [];
    var CELL = 40, HALF = 3700, NC = Math.ceil(HALF * 2 / CELL), cells = {};
    function relief(x, z) {
      var h = mmLunarNoise(x / 90, z / 90, 11) * 1.5 + mmLunarNoise(x / 34, z / 34, 12) * 0.5 +
        mmLunarNoise(x / 11, z / 11, 13) * 0.15 + mmLunarNoise(x / 3.7, z / 3.7, 14) * 0.04;
      var r = Math.sqrt(x * x + z * z);
      if (r > 140) {
        // Out past the walkable ground the plain swells into low hills, tapered to
        // nothing before the far edge so that edge always sits below the horizon.
        var w = mmSmooth(140, 600, r) * (1 - mmSmooth(2400, 3300, r));
        h += (mmLunarNoise(x / 700, z / 700, 15) * 16 + mmLunarNoise(x / 240, z / 240, 16) * 5) * w;
      }
      return h;
    }
    function keepClear(x, z, pad) {
      for (var k = 0; k < MM_EVA_KEEP.length; k++) {
        var kp = MM_EVA_KEEP[k];
        if (Math.hypot(x - kp[0], z - kp[1]) < kp[2] + pad) return true;
      }
      return false;
    }
    function add(x, z, r, fresh) {
      var c = { x: x, z: z, r: r, fresh: fresh, depth: r * (0.08 + 0.32 * fresh * fresh + 0.04 * fresh),
        rim: r * (0.012 + 0.04 * fresh), h0: relief(x, z) };
      c.depth = Math.min(c.depth, r * 0.42);
      c.reach = r * 2.6;
      craters.push(c);
    }
    // Hand-placed: one fresh, blocky crater in view of the spawn, and older, softened
    // ones around it. The fresh crater is the one whose boulders litter its rim.
    [[-20, -46, 11, 0.95], [46, -34, 20, 0.28], [-58, 22, 15, 0.35], [30, 66, 11, 0.55],
      [-66, -70, 17, 0.45], [72, 58, 13, 0.4], [60, 8, 7, 0.72], [-30, 64, 8, 0.6]].forEach(function (b) { add(b[0], b[1], b[2], b[3]); });
    // Medium and small craters on a power law: many small, few large.
    var nMed = lowPower ? 26 : 36, nSmall = lowPower ? 240 : 420, tries = 0;
    for (var mi = 0; mi < nMed && tries < 4000; tries++) {
      var mr = 2.5 * Math.pow(1 - rand() * 0.84, -0.9);
      if (mr > 7.5) continue;
      var mx = (rand() - 0.5) * 190, mz = (rand() - 0.5) * 190;
      if (Math.hypot(mx, mz) < 13 + mr || keepClear(mx, mz, mr + 2)) continue;
      add(mx, mz, mr, Math.pow(rand(), 1.6)); mi++;
    }
    for (var si = 0; si < nSmall && tries < 20000; tries++) {
      var sr = 0.9 * Math.pow(1 - rand() * 0.86, -0.75);
      if (sr > 2.6) continue;
      var sx = (rand() - 0.5) * 194, sz = (rand() - 0.5) * 194;
      if (keepClear(sx, sz, sr * 0.9)) continue;
      add(sx, sz, sr, Math.pow(rand(), 2.2)); si++;
    }
    // The far plain: bigger, older craters out to the curving horizon.
    var nFar = lowPower ? 110 : 170;
    for (var fi = 0; fi < nFar && tries < 40000; tries++) {
      var fr = 16 * Math.pow(1 - rand() * 0.93, -0.85);
      if (fr > 260) continue;
      var fa = rand() * Math.PI * 2, fd = Math.sqrt(0.004 + rand() * 0.996) * 3300;
      if (fd < 150 + fr * 1.3) continue;
      add(Math.cos(fa) * fd, Math.sin(fa) * fd, fr, Math.pow(rand(), 1.3)); fi++;
    }
    // Oldest first, so each crater erases the relief of those it landed on.
    craters.sort(function (a, b) { return a.fresh - b.fresh; });
    craters.forEach(function (c, ci) {
      var i0 = Math.max(0, Math.floor((c.x - c.reach + HALF) / CELL)), i1 = Math.min(NC - 1, Math.floor((c.x + c.reach + HALF) / CELL));
      var j0 = Math.max(0, Math.floor((c.z - c.reach + HALF) / CELL)), j1 = Math.min(NC - 1, Math.floor((c.z + c.reach + HALF) / CELL));
      for (var i = i0; i <= i1; i++) for (var j = j0; j <= j1; j++) {
        var key = i * NC + j;
        (cells[key] || (cells[key] = [])).push(ci);
      }
    });
    // A small sinuous rille: a lava channel carved INTO the ground, with low levees.
    var rille = [];
    for (var ri = -3; ri < 34; ri++) rille.push([-40 + ri * 3 + Math.sin(ri * 0.5) * 5, 30 + Math.cos(ri * 0.3) * 8]);
    var RILLE_W = 2.4, RILLE_D = 1.25;
    function rilleCut(x, z) {
      if (x < -55 || x > 65 || z < 14 || z > 46) return 0;
      var best = 1e9;
      for (var k = 0; k < rille.length - 1; k++) {
        var ax = rille[k][0], az = rille[k][1], bx = rille[k + 1][0] - ax, bz = rille[k + 1][1] - az;
        var t = Math.max(0, Math.min(1, ((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz)));
        var dx = x - ax - bx * t, dz = z - az - bz * t, d2 = dx * dx + dz * dz;
        if (d2 < best) best = d2;
      }
      var u = Math.sqrt(best) / RILLE_W;
      if (u > 2.2) return 0;
      var cut = u < 1 ? -RILLE_D * Math.pow(1 - u * u, 0.8) : 0;
      return cut + 0.14 * Math.exp(-((u - 1.25) * (u - 1.25)) / 0.08);
    }
    function height(x, z) {
      var h = relief(x, z);
      var i = Math.floor((x + HALF) / CELL), j = Math.floor((z + HALF) / CELL);
      var list = (i >= 0 && j >= 0 && i < NC && j < NC) ? cells[i * NC + j] : null;
      if (list) {
        for (var k = 0; k < list.length; k++) {
          var c = craters[list[k]];
          var dx = x - c.x, dz = z - c.z, d2 = dx * dx + dz * dz;
          if (d2 >= c.reach * c.reach) continue;
          var t = Math.sqrt(d2) / c.r;
          if (t < 1) {
            var er = c.fresh * 0.85 * (1 - mmSmooth(0.72, 1.0, t));
            h = c.h0 + (h - c.h0) * (1 - er);
          }
          h += mmCraterShape(t, c);
        }
      }
      h += rilleCut(x, z);
      // The descent engine swept the landing site smooth.
      var lr = Math.sqrt(x * x + z * z);
      if (lr < 9) h += (relief(0, 0) - h) * (1 - mmSmooth(3, 9, lr)) * 0.6;
      return h;
    }
    // Albedo: fresh ejecta is bright (unweathered), and the engine blast left a halo.
    function albedo(x, z) {
      var a = 1 + mmLunarNoise(x / 41, z / 41, 20) * 0.08 + mmLunarNoise(x / 17, z / 17, 21) * 0.06 + mmLunarNoise(x / 6, z / 6, 22) * 0.04;
      var i = Math.floor((x + HALF) / CELL), j = Math.floor((z + HALF) / CELL);
      var list = (i >= 0 && j >= 0 && i < NC && j < NC) ? cells[i * NC + j] : null;
      if (list) {
        for (var k = 0; k < list.length; k++) {
          var c = craters[list[k]];
          if (c.fresh < 0.45) continue;
          var dx = x - c.x, dz = z - c.z, t = Math.sqrt(dx * dx + dz * dz) / c.r;
          if (t > 2.6) continue;
          var f = (c.fresh - 0.45) / 0.55, ray = 0.75 + 0.25 * mmLunarNoise(Math.atan2(dz, dx) * 5, t * 0.8, 23);
          a += f * f * (t < 1 ? 0.28 : 0.34 * Math.exp(-(t - 1) * 1.6) * ray);
        }
      }
      var lr = Math.sqrt(x * x + z * z);
      a += 0.1 * (1 - mmSmooth(6, 16, lr));
      return a;
    }
    // Boulders: most from the fresh crater, a scatter elsewhere, and a cobble field
    // densest around the landing site where you actually walk.
    var rocks = [], rr = mmLunarRng(0x524f434b);
    function addRock(x, z, s, blocky) {
      if (Math.abs(x) > 97 || Math.abs(z) > 97) return;
      rocks.push({ x: x, z: z, s: s, sy: 0.55 + rr() * 0.4 * (blocky ? 1 : 0.7), yaw: rr() * Math.PI * 2, tilt: (rr() - 0.5) * 0.5,
        v: (rr() * 3) | 0, tint: 0.82 + rr() * 0.34 });
    }
    craters.forEach(function (c) {
      if (c.fresh < 0.7 || c.r < 6 || Math.hypot(c.x, c.z) > 95) return;
      var n = Math.round(c.r * (lowPower ? 2.6 : 4.4));
      for (var b = 0; b < n; b++) {
        var ang = rr() * Math.PI * 2, t = rr() < 0.18 ? 0.35 + rr() * 0.6 : 1.0 + Math.pow(rr(), 1.8) * 1.5;
        var bs = 0.18 + Math.pow(rr(), 3.2) * 1.7 * (t < 1.4 ? 1 : 0.6);
        addRock(c.x + Math.cos(ang) * t * c.r, c.z + Math.sin(ang) * t * c.r, bs, true);
      }
    });
    var nScatter = lowPower ? 34 : 60;
    for (var bi = 0; bi < nScatter; bi++) {
      var bx = (rr() - 0.5) * 190, bz = (rr() - 0.5) * 190, bsz = 0.16 + Math.pow(rr(), 2.4) * 0.8;
      if (Math.hypot(bx, bz) < 15 || keepClear(bx, bz, 2)) continue;
      addRock(bx, bz, bsz, false);
    }
    var nCobble = lowPower ? 110 : 520;
    for (var ci2 = 0; ci2 < nCobble; ci2++) {
      var cd = 2.5 + Math.pow(rr(), 1.7) * 70, ca = rr() * Math.PI * 2;
      var cx = 3 + Math.cos(ca) * cd, cz = 3 + Math.sin(ca) * cd;
      if (keepClear(cx, cz, -1.2)) continue;
      addRock(cx, cz, 0.035 + Math.pow(rr(), 2.2) * 0.2, rr() < 0.4);
    }
    // Massifs past the horizon, like the walls of Taurus-Littrow: smooth, rounded,
    // sandblasted by four billion years of micrometeorites. [dist m, bearing deg, height, radius]
    var massifs = [[9000, -120, 1900, 4200], [12500, -68, 1350, 3600], [7200, 172, 950, 2700],
      [14000, 100, 1650, 4800], [10500, 32, 720, 3000], [16000, -158, 1150, 3800], [11000, 138, 800, 2600]].map(function (m, mk) {
      var a = m[1] * Math.PI / 180;
      return { x: Math.cos(a) * m[0], z: Math.sin(a) * m[0], h: m[2], r: m[3], seed: 40 + mk };
    });
    // Each massif is three overlapping lobes: rounded crests, long straight
    // flanks near the 25-30 degrees real massif slopes hold, and radial gullies.
    massifs.forEach(function (m) {
      var lr = mmLunarRng(m.seed * 977);
      m.lobes = [[0, 0, 1, 1]];
      for (var k = 0; k < 2; k++) {
        var a = lr() * Math.PI * 2, d = m.r * (0.35 + lr() * 0.3);
        m.lobes.push([Math.cos(a) * d, Math.sin(a) * d, 0.55 + lr() * 0.3, 0.5 + lr() * 0.25]);
      }
    });
    function massifLobe(m, dx, dz, rr) {
      var ang = Math.atan2(dz, dx);
      var warp = 1 + 0.22 * mmLunarNoise(Math.cos(ang) * 1.6 + 7, Math.sin(ang) * 1.6 + 3, m.seed) + 0.1 * mmLunarNoise(Math.cos(ang) * 4, Math.sin(ang) * 4, m.seed + 9);
      var u = Math.sqrt(dx * dx + dz * dz) / (rr * warp);
      if (u >= 1) return 0;
      var k = 0.28, cone = (Math.sqrt(1 + k * k) - Math.sqrt(u * u + k * k)) / (Math.sqrt(1 + k * k) - k);
      var foot = 1 - mmSmooth(0.7, 1, u) * 0.35;
      var gully = 1 - Math.abs(mmLunarNoise(ang * 7 * rr / m.r, u * 2.5, m.seed + 4));
      return cone * foot * (1 + 0.16 * (gully - 0.6) * Math.sin(Math.PI * u));
    }
    function massifHeight(m, x, z) {
      var dx = x - m.x, dz = z - m.z, best = 0;
      for (var k = 0; k < m.lobes.length; k++) {
        var lb = m.lobes[k], hk = massifLobe(m, dx - lb[0], dz - lb[1], m.r * lb[3]) * lb[2];
        best = Math.max(best, hk) + Math.min(best, hk) * 0.25;
      }
      if (best <= 0) return 0;
      return m.h * best * (1 + 0.06 * mmLunarNoise(dx / 700, dz / 700, m.seed + 1) + 0.025 * mmLunarNoise(dx / 220, dz / 220, m.seed + 2));
    }
    function curvature(x, z) { return Math.max(0, x * x + z * z - 20000) / (2 * MM_MOON_RADIUS); }
    return { height: height, relief: relief, albedo: albedo, craters: craters, rocks: rocks, rille: rille,
      massifs: massifs, massifHeight: massifHeight, curvature: curvature };
  }

  // A regular height grid over [x0, x0 + span]^2, sampled bilinearly. The sun and
  // ambient bakes march across these rather than the analytic field.
  function mmLunarGrid(fn, x0, span, n) {
    var g = new Float32Array(n * n), step = span / (n - 1);
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) g[j * n + i] = fn(x0 + i * step, x0 + j * step);
    return {
      x0: x0, span: span, n: n, data: g,
      at: function (x, z) {
        var gx = (x - x0) / step, gz = (z - x0) / step;
        if (gx < 0 || gz < 0 || gx > n - 1 || gz > n - 1) return NaN;
        var i = Math.min(n - 2, Math.floor(gx)), j = Math.min(n - 2, Math.floor(gz)), u = gx - i, v = gz - j, o = j * n + i;
        return (g[o] * (1 - u) + g[o + 1] * u) * (1 - v) + (g[o + n] * (1 - u) + g[o + n + 1] * u) * v;
      }
    };
  }
  // Sun clearance at a point: tan(sun elevation) minus the steepest terrain rise
  // toward the Sun. Positive is sunlit. It is a smooth field, so the shader can cut a
  // crisp shadow edge through it at sub-vertex precision with one smoothstep.
  // solidAt (optional) adds static objects that overhang the ground, like the LM.
  function mmSunClearance(hAt, x, z, h0, maxDist, solidAt) {
    var hx = MM_EVA_SUN.x, hz = MM_EVA_SUN.z, hl = Math.sqrt(hx * hx + hz * hz);
    hx /= hl; hz /= hl;
    var worst = -1e9, s = 0.3;
    while (s < maxDist) {
      var px = x + hx * s, pz = z + hz * s, h = hAt(px, pz);
      if (h === h) { var sl = (h - h0) / s; if (sl > worst) worst = sl; }
      if (solidAt && s < 24 && solidAt(px, pz, h0 + s * MM_EVA_SUN.tan)) return Math.min(-0.04, MM_EVA_SUN.tan - worst);
      s *= 1.17;
    }
    return MM_EVA_SUN.tan - worst;
  }
  // Sky visibility from the horizon angle in a few directions: crater floors and the
  // feet of rocks see less of the bright surroundings than an open plain does.
  function mmSkyView(hAt, x, z, h0, dirs, steps, reach) {
    var sum = 0;
    for (var d = 0; d < dirs; d++) {
      var a = (d + 0.37) / dirs * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a), worst = 0, s = 0.45;
      for (var k = 0; k < steps; k++) {
        var h = hAt(x + cx * s, z + cz * s);
        if (h === h) { var e = (h - h0) / Math.sqrt((h - h0) * (h - h0) + s * s); if (e > worst) worst = e; }
        s *= Math.pow(reach / 0.45, 1 / steps);
      }
      sum += 1 - worst;
    }
    return sum / dirs;
  }

  // The regolith's own photometry, patched into MeshStandardMaterial. The Moon is not
  // a Lambertian surface: it barely darkens toward grazing view (Lommel-Seeliger, the
  // reason the full Moon looks like a flat disc), and it brightens sharply looking
  // straight down-Sun (the opposition surge: the bright halo around an astronaut's
  // shadow in the Apollo photographs). Both are here, with the baked terrain shadow
  // and a weak bounce light in place of an atmosphere's sky fill.
  function mmLunarShade(THREE, mat, kind, lowPower) {
    var rock = kind === 'rock';
    mat.onBeforeCompile = function (shader) {
      shader.uniforms.uLunarOpp = { value: rock ? 0.4 : 0.62 };
      shader.uniforms.uLunarBounce = { value: rock ? 0.34 : 0.3 };
      var vary = rock ? 'varying vec2 vLunarInst;\n' : 'varying vec3 vLunarBake;\n';
      shader.vertexShader = (rock ? 'attribute vec2 lunarInst;\n' : 'attribute vec3 lunarBake;\n') + vary +
        'varying vec2 vLunarXZ;\n' + shader.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\nvec4 lunarW = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nlunarW = instanceMatrix * lunarW;\n#endif\n' +
        'vLunarXZ = (modelMatrix * lunarW).xz;\n' + (rock ? 'vLunarInst = lunarInst;\n' : 'vLunarBake = lunarBake;\n'));
      var head = vary + 'varying vec2 vLunarXZ;\nuniform float uLunarOpp;\nuniform float uLunarBounce;\nfloat lunarSunVis = 1.0;\nfloat lunarAO = 1.0;\n';
      var fs = shader.fragmentShader;
      fs = fs.replace('#include <map_fragment>', rock ? '#include <map_fragment>\ndiffuseColor.rgb *= vLunarInst.y;' :
        '#ifdef USE_MAP\nvec3 lunarT1 = mapTexelToLinear(texture2D(map, vLunarXZ * 0.29)).rgb;\n' +
        'vec3 lunarT2 = mapTexelToLinear(texture2D(map, mat2(0.8, -0.6, 0.6, 0.8) * vLunarXZ * 0.061 + 0.37)).rgb;\n' +
        'diffuseColor.rgb *= lunarT1 * lunarT2 * 21.0;\n#endif\ndiffuseColor.rgb *= vLunarBake.z;');
      if (!rock) {
        fs = fs.replace('#include <bumpmap_pars_fragment>', THREE.ShaderChunk.bumpmap_pars_fragment.replace(
          /vec2 dHdxy_fwd\(\) \{[\s\S]*?return vec2\( dBx, dBy \);\s*\}/,
          'float lunarBumpH(vec2 p) {\n  return texture2D(bumpMap, p * 0.29).x' +
          (lowPower ? '' : ' + 1.6 * texture2D(bumpMap, mat2(0.8, -0.6, 0.6, 0.8) * p * 0.083 + 0.21).x') + ';\n}\n' +
          'vec2 dHdxy_fwd() {\n  vec2 dx = dFdx(vLunarXZ), dy = dFdy(vLunarXZ);\n  float H = bumpScale * lunarBumpH(vLunarXZ);\n' +
          '  return vec2(bumpScale * lunarBumpH(vLunarXZ + dx) - H, bumpScale * lunarBumpH(vLunarXZ + dy) - H);\n}'));
      }
      fs = fs.replace('#include <lights_physical_pars_fragment>', '#include <lights_physical_pars_fragment>\n#undef RE_Direct\n' +
        'void RE_Direct_Lunar(const in IncidentLight directLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {\n' +
        '  float mu0 = saturate(dot(geometry.normal, directLight.direction));\n' +
        '  float mu = max(dot(geometry.normal, geometry.viewDir), 0.0);\n' +
        '  float ls = 2.0 * mu0 / max(mu0 + mu, 0.08);\n' +
        '  float cg = clamp(dot(directLight.direction, geometry.viewDir), -0.999, 1.0);\n' +
        '  float tg = sqrt((1.0 - cg) / (1.0 + cg));\n' +
        '  float surge = 1.0 + uLunarOpp / (1.0 + tg / 0.07);\n' +
        '  float phase = mix(1.0, 0.62, smoothstep(0.0, 1.0, 0.5 - 0.5 * cg));\n' +
        '  reflectedLight.directDiffuse += directLight.color * (ls * surge * phase * lunarSunVis) * material.diffuseColor;\n' +
        '}\n#define RE_Direct RE_Direct_Lunar\n');
      fs = fs.replace('#include <lights_fragment_begin>', (rock ? 'lunarSunVis = vLunarInst.x;\n' :
        'float lunarEdge = 0.018 + length(vViewPosition) * 0.00004;\nlunarSunVis = smoothstep(-lunarEdge, lunarEdge, vLunarBake.x);\nlunarAO = vLunarBake.y;\n') + '#include <lights_fragment_begin>');
      fs = fs.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' +
        'reflectedLight.indirectDiffuse = material.diffuseColor * uLunarBounce * (0.25 + 0.75 * lunarAO * lunarAO);\n' +
        'reflectedLight.indirectSpecular = vec3(0.0);\n');
      shader.fragmentShader = head + fs;
    };
    mat.customProgramCacheKey = function () { return 'mm-lunar-' + kind + (lowPower ? '-lo' : '-hi'); };
    return mat;
  }

  // Tileable regolith detail, height and albedo, painted once. Height carries the
  // micro-craters and pebbles that catch the low Sun; albedo carries glass beads and
  // rock chips. Both are sampled in world space at two scales in the shader, rotated
  // against each other, so the tiling never lines up into a visible grid.
  function mmRegolithDetail(size, seed) {
    var N = size, H = new Float32Array(N * N), A = new Float32Array(N * N), rnd = mmLunarRng(seed);
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var h = 0, a = 0, amp = 0.5, per = 4;
      for (var o = 0; o < 5; o++) {
        h += mmLunarNoise(x / N * per, y / N * per, 70 + o, per) * amp;
        if (o > 1) a += mmLunarNoise(x / N * per, y / N * per, 90 + o, per) * amp;
        per *= 2; amp *= 0.55;
      }
      H[y * N + x] = h * 0.35;
      A[y * N + x] = 1 + a * 0.28;
    }
    function stamp(cx, cy, rad, fn) {
      var r0 = Math.ceil(rad * 2.2);
      for (var dy = -r0; dy <= r0; dy++) for (var dx = -r0; dx <= r0; dx++) {
        var t = Math.sqrt(dx * dx + dy * dy) / rad;
        if (t > 2.2) continue;
        var px = ((Math.round(cx) + dx) % N + N) % N, py = ((Math.round(cy) + dy) % N + N) % N;
        fn(py * N + px, t);
      }
    }
    var nCr = Math.round(N * N / 4200);
    for (var c = 0; c < nCr; c++) {
      var cr = 2.5 * Math.pow(1 - rnd() * 0.9, -0.8) * N / 512, fresh = rnd();
      if (cr > 30 * N / 512) continue;
      var dep = 0.15 + fresh * fresh * 0.9;
      stamp(rnd() * N, rnd() * N, cr, function (i, t) {
        H[i] += t < 1 ? (-dep + (dep + 0.12) * t * t) : 0.12 * Math.exp(-(t - 1) * 3.5);
        if (t < 1.4 && fresh > 0.7) A[i] += 0.08;
      });
    }
    var nPeb = Math.round(N * N / 330);
    for (var p = 0; p < nPeb; p++) {
      var pr = (1 + rnd() * rnd() * 4.5) * N / 512, pb = 0.35 + rnd() * 0.5, tint = (rnd() - 0.45) * 0.5;
      stamp(rnd() * N, rnd() * N, pr, function (i, t) {
        if (t < 1) { H[i] += pb * Math.sqrt(1 - t * t); A[i] += tint * (1 - t); }
      });
    }
    for (var g = 0; g < N * N / 160; g++) {
      var gi = (rnd() * N * N) | 0;
      A[gi] += rnd() < 0.55 ? 0.35 : -0.25;
    }
    var lo = 1e9, hi = -1e9;
    for (var k = 0; k < N * N; k++) { if (H[k] < lo) lo = H[k]; if (H[k] > hi) hi = H[k]; }
    return { size: N, height: H, albedo: A, lo: lo, hi: hi };
  }

  // One boulder shape: an icosahedron pushed about by noise and cut flat underneath.
  // Faces stay flat-normalled, because lunar boulders are angular, not pebbles.
  function mmBoulderGeometry(THREE, seed) {
    var g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position.array;
    for (var i = 0; i < p.length; i += 3) {
      var x = p[i], y = p[i + 1], z = p[i + 2];
      var n = 1 + 0.26 * mmLunarNoise(x * 1.7 + seed, z * 1.7 - seed, seed) + 0.12 * mmLunarNoise(y * 3.1 + seed * 2, x * 3.1, seed + 5);
      x *= n; y *= n; z *= n;
      if (y < -0.25) y = -0.25 + (y + 0.25) * 0.25;
      p[i] = x; p[i + 1] = y; p[i + 2] = z;
    }
    g.computeVertexNormals();
    return g;
  }

  // The Lunar Module as it stood on the surface, at 0.78 scale so it fits the site.
  // Origin is the ground at the centre of the four pads; the ladder faces +Z.
  function mmBuildSurfaceLM(THREE, envMap, lowPower) {
    var S = 0.78, lm = new THREE.Group();
    var foilCv = document.createElement('canvas'); foilCv.setAttribute('aria-hidden', 'true');
    foilCv.width = foilCv.height = lowPower ? 128 : 256;
    var fc = foilCv.getContext('2d'), fr = mmLunarRng(0x464f494c), FN = foilCv.width;
    fc.fillStyle = '#a97f30'; fc.fillRect(0, 0, FN, FN);
    // Crinkled Kapton: facets of slightly different tone catch the Sun one by one.
    for (var fi = 0; fi < (lowPower ? 160 : 520); fi++) {
      var fx = fr() * FN, fy = fr() * FN, fw = 4 + fr() * FN * 0.12, fh = 3 + fr() * FN * 0.06, l = fr();
      fc.fillStyle = 'rgba(' + (l > 0.5 ? '255,226,150,' : '70,45,10,') + (0.1 + fr() * 0.25).toFixed(2) + ')';
      fc.beginPath(); fc.moveTo(fx, fy); fc.lineTo(fx + fw, fy + (fr() - 0.5) * fh); fc.lineTo(fx + fw * (0.3 + fr() * 0.5), fy + fh); fc.closePath(); fc.fill();
    }
    var foilTex = new THREE.CanvasTexture(foilCv); foilTex.encoding = THREE.sRGBEncoding;
    foilTex.wrapS = foilTex.wrapT = THREE.RepeatWrapping; foilTex.repeat.set(2, 1);
    var gold = new THREE.MeshStandardMaterial({ color: 0xffffff, map: foilTex, bumpMap: foilTex, bumpScale: 0.02, metalness: 0.62, roughness: 0.34, envMap: envMap, envMapIntensity: 1.2 });
    var blackFoil = new THREE.MeshStandardMaterial({ color: 0x0e0f11, metalness: 0.15, roughness: 0.62, envMap: envMap });
    var panel = new THREE.MeshStandardMaterial({ color: 0x8d9197, metalness: 0.5, roughness: 0.42, envMap: envMap, flatShading: true });
    var panelDark = new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.35, roughness: 0.58, envMap: envMap, flatShading: true });
    var strutMat = new THREE.MeshStandardMaterial({ color: 0xb08d4a, metalness: 0.65, roughness: 0.38, envMap: envMap });
    var silverMat = new THREE.MeshStandardMaterial({ color: 0xb4b8bd, metalness: 0.8, roughness: 0.3, envMap: envMap });
    var glass = new THREE.MeshStandardMaterial({ color: 0x0b0f16, metalness: 0.9, roughness: 0.08, envMap: envMap });
    var mats = [gold, blackFoil, panel, panelDark, strutMat, silverMat, glass];
    function mesh(geo, mat, x, y, z) { var m = new THREE.Mesh(geo, mat); m.position.set(x * S, y * S, z * S); lm.add(m); return m; }
    // Descent stage: the octagonal gold-foil box, sitting 1.5 m up on its gear.
    var ds = mesh(new THREE.CylinderGeometry(2.25 * S, 2.25 * S, 1.75 * S, 8), gold, 0, 2.45, 0);
    ds.rotation.y = Math.PI / 8;
    var dsBase = mesh(new THREE.CylinderGeometry(2.0 * S, 2.2 * S, 0.22 * S, 8), blackFoil, 0, 1.47, 0);
    dsBase.rotation.y = Math.PI / 8;
    var dsTop = mesh(new THREE.CylinderGeometry(2.27 * S, 2.27 * S, 0.12 * S, 8), blackFoil, 0, 3.3, 0);   // black blanket rim
    dsTop.rotation.y = Math.PI / 8;
    var bell = mesh(new THREE.CylinderGeometry(0.34 * S, 0.8 * S, 0.95 * S, 18, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x3a342f, metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide, envMap: envMap }), 0, 1.02, 0);
    mats.push(bell.material);
    // Ascent stage: the crew cabin is a drum lying on its side, with a flat faceted
    // front carrying the two triangular windows, and an equipment bay behind.
    var cabin = mesh(new THREE.CylinderGeometry(1.2 * S, 1.2 * S, 2.35 * S, 10), panel, 0, 4.25, 0.25);
    cabin.rotation.z = Math.PI / 2;
    var face = mesh(new THREE.BoxGeometry(2.35 * S, 1.55 * S, 0.7 * S), panel, 0, 4.05, 1.35);
    face.rotation.x = -0.12;
    var aft = mesh(new THREE.BoxGeometry(2.7 * S, 1.45 * S, 1.3 * S), panelDark, 0, 4.05, -1.25);
    aft.rotation.x = 0.06;
    mesh(new THREE.BoxGeometry(2.9 * S, 0.5 * S, 3.4 * S), panelDark, 0, 3.35, 0);
    mesh(new THREE.CylinderGeometry(0.5 * S, 0.55 * S, 0.55 * S, 12), panel, 0, 5.6, 0.1);      // docking tunnel
    mesh(new THREE.CylinderGeometry(0.6 * S, 0.6 * S, 0.06 * S, 12), panelDark, 0, 5.9, 0.1);
    [-1, 1].forEach(function (sx) {
      var w = mesh(new THREE.CylinderGeometry(0.34 * S, 0.34 * S, 0.06 * S, 3), glass, sx * 0.62, 4.45, 1.72);
      w.rotation.x = Math.PI / 2 - 0.35; w.rotation.y = sx * 0.25;
      // RCS thruster quads on outriggers at the four corners.
      [-1, 1].forEach(function (sz) {
        var quad = mesh(new THREE.BoxGeometry(0.34 * S, 0.34 * S, 0.34 * S), panelDark, sx * 1.95, 4.5, sz * 1.05);
        for (var nz = 0; nz < 4; nz++) {
          var na = nz * Math.PI / 2;
          var nzl = mesh(new THREE.CylinderGeometry(0.03 * S, 0.08 * S, 0.22 * S, 6), strutMat, sx * 1.95 + Math.cos(na) * 0.26, 4.5, sz * 1.05 + Math.sin(na) * 0.26);
          nzl.rotation.z = na === 0 ? -Math.PI / 2 : (na === Math.PI ? Math.PI / 2 : 0);
          nzl.rotation.x = Math.abs(na - Math.PI / 2) < 0.1 ? Math.PI / 2 : (Math.abs(na - 3 * Math.PI / 2) < 0.1 ? -Math.PI / 2 : 0);
        }
        quad.rotation.y = 0.05;
      });
    });
    var hatch = mesh(new THREE.BoxGeometry(0.8 * S, 0.8 * S, 0.06 * S), panelDark, 0, 3.7, 1.72);
    hatch.rotation.x = -0.12;
    // Steerable S-band dish and the rendezvous radar.
    var boom = mesh(new THREE.CylinderGeometry(0.035 * S, 0.035 * S, 1.1 * S, 6), strutMat, -1.1, 5.35, -0.9);
    boom.rotation.z = 0.7;
    var dish = mesh(new THREE.SphereGeometry(0.45 * S, 14, 6, 0, Math.PI * 2, 0, 0.9), panel, -1.5, 5.8, -0.9);
    dish.rotation.x = -1.1; dish.material = new THREE.MeshStandardMaterial({ color: 0xd8dade, metalness: 0.3, roughness: 0.5, side: THREE.DoubleSide, envMap: envMap });
    mats.push(dish.material);
    var radar = mesh(new THREE.SphereGeometry(0.34 * S, 12, 5, 0, Math.PI * 2, 0, 1.0), dish.material, 0.9, 5.4, 1.35);
    radar.rotation.x = 1.0;
    mesh(new THREE.CylinderGeometry(0.02 * S, 0.02 * S, 1.4 * S, 4), strutMat, 1.25, 5.3, -1.5);   // VHF whip
    // Landing gear: primary strut, two secondary struts and a dish pad on each leg.
    var up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
    function rod(ax, ay, az, bx, by, bz, r, mat) {
      tmp.set((bx - ax) * S, (by - ay) * S, (bz - az) * S);
      var len = tmp.length(), m = new THREE.Mesh(new THREE.CylinderGeometry(r * S, r * S, len, 6), mat);
      m.quaternion.setFromUnitVectors(up, tmp.normalize());
      m.position.set((ax + bx) * 0.5 * S, (ay + by) * 0.5 * S, (az + bz) * 0.5 * S);
      lm.add(m); return m;
    }
    for (var li = 0; li < 4; li++) {
      var la = li * Math.PI / 2, lx = Math.sin(la), lz = Math.cos(la), tx2 = Math.cos(la), tz2 = -Math.sin(la);
      var padR = 4.7, hipR = 2.15, hipY = 3.1, kneeR = 3.7, kneeY = 1.25;
      rod(lx * hipR, hipY, lz * hipR, lx * padR, 0.35, lz * padR, 0.11, strutMat);
      rod(lx * kneeR, kneeY, lz * kneeR, lx * 1.7 + tx2 * 1.2, 1.55, lz * 1.7 + tz2 * 1.2, 0.05, silverMat);
      rod(lx * kneeR, kneeY, lz * kneeR, lx * 1.7 - tx2 * 1.2, 1.55, lz * 1.7 - tz2 * 1.2, 0.05, silverMat);
      var pad = mesh(new THREE.CylinderGeometry(0.47 * S, 0.3 * S, 0.2 * S, 16), silverMat, lx * padR, 0.12, lz * padR);
      pad.userData.mmPad = true;
      if (li === 0) {
        // The ladder down the front leg, and the porch outside the hatch.
        for (var side = -1; side <= 1; side += 2) {
          rod(lx * 2.45 + tx2 * 0.28 * side, 3.1, lz * 2.45 + tz2 * 0.28 * side, lx * 4.35 + tx2 * 0.28 * side, 0.8, lz * 4.35 + tz2 * 0.28 * side, 0.025, strutMat);
        }
        for (var rg = 0; rg < 8; rg++) {
          var f = (rg + 0.5) / 8, rx = lx * (2.45 + 1.9 * f), ry = 3.1 - 2.3 * f, rz = lz * (2.45 + 1.9 * f);
          rod(rx - tx2 * 0.28, ry, rz - tz2 * 0.28, rx + tx2 * 0.28, ry, rz + tz2 * 0.28, 0.018, strutMat);
        }
        var porch = mesh(new THREE.BoxGeometry(0.9 * S, 0.05 * S, 0.8 * S), strutMat, lx * 2.35, 3.28, lz * 2.35);
        porch.rotation.y = la;
      }
    }
    lm.traverse(function (o) { if (o.isMesh && mats.indexOf(o.material) === -1) mats.push(o.material); });
    lm.userData.mmMaterials = mats;
    lm.userData.mmTextures = [foilTex];
    return lm;
  }

  // ── Suit locomotion in one-sixth gravity ──
  // What makes the Moon feel like the Moon underfoot is not the jump height, it is
  // the grip: boots push against the ground with friction, and friction is weight
  // times mu, a sixth of what it is at home. You get going slowly, you stop slowly,
  // hills bite, and at a brisk pace you settle into the Apollo lope. Air control is
  // nil: once you leave the ground you follow a ballistic arc.
  var MM_EVA_GAIT = { g: 1.62, walk: 1.25, lope: 2.3, comfort: 0.7, grip: 1.9, brake: 1.45, air: 0.12, lopeAfter: 1.1 };
  // v: {x, z} velocity (m/s), mutated. wishX/wishZ: unit direction or zero.
  // grade: rise per metre along +x and +z. Returns v.
  function mmEvaFootVelocity(v, wishX, wishZ, lope, comfort, grounded, gradeX, gradeZ, dt) {
    var G = MM_EVA_GAIT, wl = Math.sqrt(wishX * wishX + wishZ * wishZ);
    if (!grounded) {
      if (wl > 0) { v.x += wishX / wl * G.air * dt; v.z += wishZ / wl * G.air * dt; }
      return v;
    }
    var tx = 0, tz = 0;
    if (wl > 0) {
      wishX /= wl; wishZ /= wl;
      var target = (lope ? G.lope : G.walk) * (comfort ? G.comfort : 1) * Math.min(1, wl);
      // Uphill costs speed, downhill gives a little back.
      var along = gradeX * wishX + gradeZ * wishZ;
      target *= Math.max(0.3, Math.min(1.2, 1 - 1.7 * along));
      tx = wishX * target; tz = wishZ * target;
    }
    // Past about 30 degrees the regolith will not hold a boot: traction fades, and
    // you slide.
    var slope = Math.sqrt(gradeX * gradeX + gradeZ * gradeZ);
    var dx = tx - v.x, dz = tz - v.z, dl = Math.sqrt(dx * dx + dz * dz);
    var maxDv = (wl > 0 ? G.grip : G.brake) * dt * Math.max(0, 1 - Math.max(0, slope - 0.58) * 4);
    if (dl > maxDv) { dx *= maxDv / dl; dz *= maxDv / dl; }
    v.x += dx; v.z += dz;
    if (slope > 0.58) {
      var a = G.g * (slope - 0.58) / Math.sqrt(1 + slope * slope);
      v.x -= gradeX / slope * a * dt; v.z -= gradeZ / slope * a * dt;
    }
    return v;
  }
  try { window.MoonMissionPure = Object.assign(window.MoonMissionPure || {}, { lunarField: mmLunarField, lunarGrid: mmLunarGrid, sunClearance: mmSunClearance, skyView: mmSkyView, evaSun: function () { return MM_EVA_SUN; }, evaGait: function () { return MM_EVA_GAIT; }, evaFootVelocity: mmEvaFootVelocity, craterShape: mmCraterShape, regolithDetail: mmRegolithDetail }); } catch (e) {}

  // ═══════════════════════════════════════════════════════════════
  // 3D POWERED DESCENT  (mmBuildDescent3D)
  // ═══════════════════════════════════════════════════════════════
  // The landing is the mission's one graded piloting task, and it teaches the
  // one idea a side-on view cannot show: a lander has no sideways thruster
  // worth the name — it TILTS and points its main engine, so the burn that
  // holds you up is the same burn that pushes you across. Flat elevation hid
  // that trade entirely.
  //
  // This is an OVERLAY, deliberately. The 2D canvas keeps every verified
  // behaviour — physics, grading, callouts, the dataset.descent* pins the
  // tests read, the 1202 alarm, the control pads — and only the WORLD it used
  // to paint moves to WebGL behind it. Nothing already proven is re-proven.
  //
  // Returns null on any failure, and the caller treats null as "keep painting
  // the 2D world", which is why that world is skipped by a flag rather than
  // deleted outright.
  function mmBuildDescent3D(THREE, hostEl, opts) {
    if (!THREE || !hostEl) return null;
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var lowPower = reduce || (!!navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    var W = Math.max(1, (opts && opts.width) || hostEl.offsetWidth || 500);
    var H = Math.max(1, (opts && opts.height) || hostEl.offsetHeight || 420);

    // The GL canvas sits UNDER the 2D HUD canvas and is decorative: the HUD
    // above it already carries the accessible name and role=application, and
    // the callout strip carries the flight state as text. A second labelled
    // canvas would only add a duplicate stop for a screen reader.
    var glCv = document.createElement('canvas');
    glCv.setAttribute('aria-hidden', 'true');
    glCv.setAttribute('data-descent-gl', 'true');
    glCv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0';

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: glCv, antialias: !lowPower, alpha: false });
    } catch (e) {
      console.error('[MoonMission descent] WebGLRenderer creation failed:', e);
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 2));
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000005);
    try { renderer.outputEncoding = THREE.sRGBEncoding; } catch (_encErr) {}

    var scene = new THREE.Scene();
    // Explicit black: without it the page background showed through wherever the
    // terrain did not cover, and lunar sky read navy instead of empty.
    scene.background = new THREE.Color(0x000003);
    var camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 14000);

    // ── Starfield ──
    // Points rather than a textured shell: this camera looks steeply down, and
    // an equirectangular sky map stretches worst exactly at the pole it would
    // be staring through.
    var starGeo = new THREE.BufferGeometry();
    var starN = lowPower ? 420 : 900;
    var starPos = new Float32Array(starN * 3);
    var sRng = _seededRand(7919);
    for (var si = 0; si < starN; si++) {
      // Upper hemisphere only — below the horizon belongs to regolith.
      var su = sRng.next() * 2 - 1, sth = sRng.next() * Math.PI * 2;
      var sr2 = Math.sqrt(Math.max(0, 1 - su * su));
      // Inside the camera's far plane at every altitude, or the shell is clipped
      // away exactly when the camera trucks back and the sky should be fullest.
      starPos[si * 3] = Math.cos(sth) * sr2 * 1800;
      starPos[si * 3 + 1] = Math.abs(su) * 1800;
      starPos[si * 3 + 2] = Math.sin(sth) * sr2 * 1800;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    var starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 5.5, sizeAttenuation: false, depthWrite: false });
    var stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ── Regolith heightfield ──
    // A genuinely displaced plane, so craters have rims that catch the sun and
    // cast shadow across their own floors. The 2D view drew craters as flat
    // grey discs, which read as stains rather than holes.
    // ONE ground mesh, not two. An inner detail plane plus a distant skirt looked
    // reasonable in code and produced hard stair-step terracing on screen: the two
    // displaced surfaces INTERSECT rather than merely overlap, so no y-offset can
    // separate them. A single wide heightfield with radially graded detail has no
    // seam to fight, and costs less than the two planes did together.
    var TERRAIN_SPAN = 16000;
    var seg = lowPower ? 150 : 230;
    var terGeo = new THREE.PlaneGeometry(TERRAIN_SPAN, TERRAIN_SPAN, seg, seg);
    terGeo.rotateX(-Math.PI / 2);
    // Seeded crater field, so the same landing site greets every retry and a
    // student can actually learn the terrain they are aiming at.
    var cRng = _seededRand(19690720);   // 1969-07-20
    var craters = [];
    // Small craters clustered where the lander actually comes down, large ones
    // spread across the whole field. A power law on size, because real crater
    // counts rise steeply as diameter falls: many small, a few huge.
    for (var ci = 0; ci < 260; ci++) {
      var cScale = Math.pow(cRng.next(), 2.1);
      // Concentrate the small craters near the landing point and let the big ones
      // range out to the horizon, so detail sits where the camera actually looks.
      var spread = 0.06 + Math.pow(cRng.next(), 0.7) * 0.94;
      craters.push({
        x: (cRng.next() - 0.5) * TERRAIN_SPAN * spread,
        z: (cRng.next() - 0.5) * TERRAIN_SPAN * spread,
        r: 16 + cScale * 620,
        d: 2.5 + cScale * 74
      });
    }
    // One height function, shared by the mesh and by everything that must sit ON the
    // ground. The lander used to hold a fixed height above y = 0 while drift slid
    // relief of +-110 units under it, so after touchdown the camera could end up
    // inside a hill looking at the ground's underside.
    function terrainHeight(vx, vz) {
      // Rolling mare relief under the craters.
      var hgt = Math.sin(vx * 0.0042) * 7 + Math.cos(vz * 0.0035) * 6
              + Math.sin((vx + vz) * 0.0011) * 11
              + Math.sin(vx * 0.00038) * 46 + Math.cos(vz * 0.00029) * 38;
      for (var cj = 0; cj < craters.length; cj++) {
        var cr = craters[cj];
        var dxc = vx - cr.x, dzc = vz - cr.z;
        var dist = Math.sqrt(dxc * dxc + dzc * dzc);
        if (dist < cr.r * 1.35) {
          var tq = dist / cr.r;
          // Bowl inside, raised ejecta rim just outside. The rim is what makes
          // a crater legible under a low sun — without it the bowl reads flat.
          if (tq < 1) hgt -= cr.d * (1 - tq * tq) * 0.85;
          else hgt += cr.d * 0.32 * (1 - (tq - 1) / 0.35);
        }
      }
      return hgt;
    }
    var terPos = terGeo.attributes.position;
    for (var vi = 0; vi < terPos.count; vi++) terPos.setY(vi, terrainHeight(terPos.getX(vi), terPos.getZ(vi)));
    terGeo.computeVertexNormals();
    // Lunar albedo is about 0.12 — darker than worn asphalt. Photographs read
    // bright only because the Moon sits against pure black with no atmosphere to
    // haze it. Painting the regolith light made the whole scene milky and, worse,
    // pushed it over the bloom threshold so the landing site washed out.
    var terMat = new THREE.MeshStandardMaterial({ color: 0x565149, roughness: 1.0, metalness: 0.0 });
    var terrain = new THREE.Mesh(terGeo, terMat);
    terrain.receiveShadow = !lowPower;
    scene.add(terrain);



    // ── Lighting: a low, hard sun and a weak regolith bounce ──
    // Apollo landed near lunar dawn precisely so shadows would be long and the
    // relief readable from the window. Same reason here.
    // Vacuum: almost nothing fills the shadows except regolith bounce, so the
    // ambient terms stay very low and the shadows stay genuinely dark.
    scene.add(new THREE.AmbientLight(0x141419, 0.28));
    scene.add(new THREE.HemisphereLight(0x05050a, 0x2a251e, 0.3));
    var sun = new THREE.DirectionalLight(0xfff6e0, 1.35);
    // Low sun angle, as Apollo deliberately chose: long shadows are what make
    // relief readable on a surface with almost no colour variation to go by.
    sun.position.set(-700, 260, 360);
    if (!lowPower) {
      sun.castShadow = true;
      sun.shadow.mapSize.width = 1024; sun.shadow.mapSize.height = 1024;
      sun.shadow.camera.near = 1; sun.shadow.camera.far = 1400;
      sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
      sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
      sun.shadow.bias = -0.0015;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    scene.add(sun);
    scene.add(sun.target);

    // ── Lunar Module ──
    // Built to the proportions the 2D art was reaching for: octagonal descent
    // stage in gold foil, canted ascent stage, four splayed legs.
    var lm = new THREE.Group();
    var goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a04a, metalness: 0.55, roughness: 0.52 });
    var silverMat = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 0.5, roughness: 0.44 });
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x2f3338, metalness: 0.3, roughness: 0.8 });

    var descentStage = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 1.65, 8), goldMat);
    descentStage.position.y = 0.82;
    lm.add(descentStage);

    var ascentStage = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.62, 1.72, 8), silverMat);
    ascentStage.position.y = 2.5;
    lm.add(ascentStage);

    var hatch = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.96, 0.12), darkMat);
    hatch.position.set(0, 2.36, 1.58);
    lm.add(hatch);

    // Triangular windows, canted down: the LM's forward windows point at the
    // landing site, which is the whole reason they were shaped that way.
    var winMat = new THREE.MeshStandardMaterial({ color: 0x16212e, metalness: 0.6, roughness: 0.25 });
    for (var wsign = -1; wsign <= 1; wsign += 2) {
      var win = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.1), winMat);
      win.position.set(wsign * 0.5, 3.0, 1.5);
      win.rotation.x = -0.42;
      lm.add(win);
    }

    var bell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.78, 1.15, 14, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x4a4038, metalness: 0.65, roughness: 0.5, side: THREE.DoubleSide }));
    bell.position.y = -0.55;
    lm.add(bell);

    var legMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.55, roughness: 0.45 });
    for (var li = 0; li < 4; li++) {
      var ang = (li / 4) * Math.PI * 2 + Math.PI / 4;
      var lx = Math.cos(ang), lz = Math.sin(ang);
      // A landing leg leans OUT and DOWN. Build it by pointing an explicit
      // direction vector rather than composing Euler angles by hand: the axis
      // signs for "out along +x" and "out along +z" are not mirror images, and
      // getting one wrong splays the pads upward like spider legs.
      var footR = 3.3, footY = -2.05, hipR = 1.9, hipY = -0.15;
      var legVec = new THREE.Vector3(lx * (footR - hipR), footY - hipY, lz * (footR - hipR));
      var legLen = legVec.length();
      var strut = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, legLen, 6), legMat);
      // A cylinder's own axis is +y; point that axis down the leg vector.
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), legVec.clone().normalize());
      strut.position.set(
        lx * (hipR + (footR - hipR) * 0.5),
        hipY + (footY - hipY) * 0.5,
        lz * (hipR + (footR - hipR) * 0.5)
      );
      lm.add(strut);
      var pad = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.5, 0.12, 12), legMat);
      pad.position.set(lx * footR, footY, lz * footR);
      lm.add(pad);
      // Contact probe: the rod that tripped the CONTACT LIGHT a moment before the
      // pads themselves touched. It hangs straight down from the pad.
      var probe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 4), darkMat);
      probe.position.set(lx * footR, footY - 0.72, lz * footR);
      lm.add(probe);
    }
    if (!lowPower) {
      lm.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    }
    scene.add(lm);

    // ── Exhaust plume ──
    // Additive cone plus a bright core. In vacuum there is no air to billow
    // against, so the plume stays tight and hard-edged instead of mushrooming.
    var plumeGrp = new THREE.Group();
    var plumeMat = new THREE.MeshBasicMaterial({
      color: 0xff7a1e, transparent: true, opacity: 0.42,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    var plume = new THREE.Mesh(new THREE.ConeGeometry(0.62, 4.2, 14, 1, true), plumeMat);
    plume.position.y = -2.1; plume.rotation.x = Math.PI;
    plumeGrp.add(plume);
    var coreMat = new THREE.MeshBasicMaterial({
      color: 0xfff2c4, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    var plumeCore = new THREE.Mesh(new THREE.ConeGeometry(0.26, 2.5, 12, 1, true), coreMat);
    plumeCore.position.y = -1.25; plumeCore.rotation.x = Math.PI;
    plumeGrp.add(plumeCore);
    plumeGrp.position.y = -1.1;
    lm.add(plumeGrp);

    // ── Blown dust ──
    // The detail every Apollo landing film is remembered for: below roughly
    // 30 m the plume sheets regolith outward in flat radial streaks. With no
    // air it does not billow or hang — it leaves ballistically and is gone.
    var dustN = lowPower ? 90 : 220;
    var dustGeo = new THREE.BufferGeometry();
    var dustPos = new Float32Array(dustN * 3);
    var dustSeed = [];
    for (var di = 0; di < dustN; di++) {
      dustSeed.push({ a: Math.random() * Math.PI * 2, sp: 14 + Math.random() * 46, t: Math.random() });
      dustPos[di * 3] = 0; dustPos[di * 3 + 1] = -9999; dustPos[di * 3 + 2] = 0;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    var dustMat = new THREE.PointsMaterial({
      color: 0xbcb2a0, size: 1.5, transparent: true, opacity: 0.0,
      depthWrite: false, sizeAttenuation: true
    });
    var dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ── Bloom (guarded, house pattern) ──
    var composer = null;
    (function setupBloom() {
      if (window.AlloPostFXEnabled === false) return;
      var ensure = function (cb) {
        if (window.THREE && window.THREE.EffectComposer && window.THREE.UnrealBloomPass) { cb(); return; }
        var urls = [
          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js',
          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js',
          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js',
          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js',
          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js',
          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js'
        ];
        var i = 0;
        (function nextScript() {
          if (i >= urls.length) { cb(); return; }
          var s = document.createElement('script');
          s.src = urls[i]; s.onload = function () { i++; nextScript(); }; s.onerror = function () { i++; nextScript(); };
          document.head.appendChild(s);
        })();
      };
      ensure(function () {
        try {
          var T = window.THREE;
          if (!T || !T.EffectComposer || !T.RenderPass || !T.UnrealBloomPass) return;
          var res = lowPower ? 0.5 : 1;
          var c = new T.EffectComposer(renderer);
          c.addPass(new T.RenderPass(scene, camera));
          // Only the plume and the sunlit rims should glow. A lower threshold
          // blooms the regolith too, washing out the landing site exactly when
          // a student most needs to read the ground they are dropping onto.
          c.addPass(new T.UnrealBloomPass(
            new T.Vector2(Math.max(1, Math.round(W * res)), Math.max(1, Math.round(H * res))),
            lowPower ? 0.5 : 0.7, 0.4, 0.92));
          composer = c;
        } catch (e) { composer = null; }
      });
    })();

    hostEl.appendChild(glCv);

    var disposed = false;

    // ── Per-frame update ──
    // Driven entirely by the 2D loop's own physics: this owns no state that
    // could ever disagree with the graded simulation.
    function update(s) {
      if (disposed) return;
      var alt = Math.max(0, s.alt);
      var tilt = s.tilt || 0;
      var thrust = s.thrust || 0;
      var burning = thrust > 0.1 && s.fuel > 0 && !s.done;   // the plume stayed lit on a crashed lander

      // The lander holds a fixed world point and the GROUND moves, so craters
      // stream past under lateral drift the way they really would from the
      // window — and a student can see drift they are not correcting.
      // Logarithmic, not linear. A linear map spends the whole descent so high
      // that only the coarse skirt is in frame; compressed this way, 15 km still
      // reads as "very high" while the last 200 m — the part actually flown —
      // gets most of the visual range.
      var altUnits = 2.2 + 96 * Math.log(1 + alt / 60) / Math.log(1 + MM_DESCENT.handoverAlt / 60);   // full visual range across the part actually flown
      lm.rotation.z = -tilt;
      var wrap = TERRAIN_SPAN / 24;
      terrain.position.x = -((s.groundX || 0) % wrap);
      terrain.position.z = -((s.groundZ || 0) % wrap);
      // The terrain slides and the lander does not, so read the ground under it.
      var groundH = terrainHeight(-terrain.position.x, -terrain.position.z);
      lm.position.set(0, groundH + altUnits, 0);
      dust.position.y = groundH;

      sun.target.position.copy(lm.position);
      sun.position.set(lm.position.x - 700, lm.position.y + 260, lm.position.z + 360);

      // Plume length tracks throttle, with a little chug so a held burn never
      // looks like a static decal pasted under the engine.
      plumeGrp.visible = burning;
      if (burning) {
        var chug = 0.9 + Math.sin(s.tick * 0.55) * 0.07 + Math.random() * 0.05;
        plume.scale.set(0.7 + thrust * 0.5, (0.45 + thrust * 1.15) * chug, 0.7 + thrust * 0.5);
        plumeCore.scale.set(0.7 + thrust * 0.4, (0.45 + thrust * 1.0) * chug, 0.7 + thrust * 0.4);
        plumeMat.opacity = 0.3 + thrust * 0.3;
        coreMat.opacity = 0.6 + thrust * 0.3;
      }

      // Dust: only close in, only under thrust, strengthening as you descend.
      var dustStrength = (burning && alt < 30) ? (1 - alt / 30) : 0;
      dustMat.opacity = dustStrength * 0.55;
      if (dustStrength > 0) {
        var dp = dustGeo.attributes.position;
        for (var k = 0; k < dustN; k++) {
          var sd = dustSeed[k];
          sd.t += 0.016 + thrust * 0.012;
          if (sd.t > 1) { sd.t = 0; sd.a = Math.random() * Math.PI * 2; }
          var rad = sd.t * sd.sp;
          // Downrange bias, because the plume points where the vehicle tilts.
          dp.setXYZ(k,
            Math.cos(sd.a) * rad + Math.sin(tilt) * rad * 0.5,
            0.25 + sd.t * 0.7,
            Math.sin(sd.a) * rad);
        }
        dp.needsUpdate = true;
      }

      // ── Camera ──
      // A chase view that trucks back as altitude grows, so the lander keeps a
      // near-constant screen size while the ground scale changes under it.
      // High up you read the approach; near the surface you read the touchdown.
      // Framed off the COMPRESSED altitude, so the lander keeps a readable screen
      // size all the way down instead of shrinking to a speck for most of the run.
      var back = 12 + altUnits * 0.42;
      var up = 4 + altUnits * 0.30;
      var camX = lm.position.x + back * 0.34, camZ = lm.position.z + back;
      var camFloor = terrainHeight(camX - terrain.position.x, camZ - terrain.position.z) + 3;
      camera.position.set(camX, Math.max(lm.position.y + up, camFloor), camZ);
      // Look progressively further ahead of the vehicle as height grows, so high
      // up you read the approach and low down you read the touchdown point.
      camera.lookAt(lm.position.x, Math.max(groundH, lm.position.y - 2 - altUnits * 0.22), lm.position.z);

      // Stars ride the camera so they never parallax — at this range they are
      // effectively at infinity, and drifting them would read as tumbling.
      stars.position.copy(camera.position);

      try {
        if (composer) composer.render();
        else renderer.render(scene, camera);
      } catch (_rErr) {
        try { renderer.render(scene, camera); } catch (_r2Err) {}
      }
    }

    function resize(nw, nh) {
      if (disposed || !nw || !nh) return;
      W = nw; H = nh;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh, false);
      if (composer && composer.setSize) { try { composer.setSize(nw, nh); } catch (_cErr) {} }
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      try {
        scene.traverse(function (o) {
          if (o.geometry && o.geometry.dispose) o.geometry.dispose();
          if (o.material) {
            var mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach(function (m) { if (m && m.dispose) m.dispose(); });
          }
        });
        if (composer && composer.dispose) composer.dispose();
        renderer.dispose();
        // Free the drawing buffer outright: Retry Landing builds a whole new
        // scene, and browsers cap simultaneous WebGL contexts hard.
        var gl = renderer.getContext && renderer.getContext();
        // Only force the loss if the context is still ALIVE. Doing it to an already-
        // lost context can suppress the restore event on a canvas we mean to reuse.
        if (gl && !(gl.isContextLost && gl.isContextLost())) {
          var lose = gl.getExtension && gl.getExtension('WEBGL_lose_context');
          if (lose) lose.loseContext();
        }
      } catch (_dErr) {}
      if (glCv.parentElement) glCv.parentElement.removeChild(glCv);
    }

    return { update: update, resize: resize, dispose: dispose, canvas: glCv };
  }

  // ═══════════════════════════════════════════════════════════════
  // END SHARED HELPERS
  // ═══════════════════════════════════════════════════════════════

  // WCAG live region
  (function() {
    if (document.getElementById('allo-live-moonmission')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-moonmission';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // Inject phase transition animation
  if (!document.getElementById('moon-mission-anim')) {
    var _mmStyle = document.createElement('style');
    _mmStyle.id = 'moon-mission-anim';
    _mmStyle.textContent = '@keyframes mmFadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }';
    document.head.appendChild(_mmStyle);
  }

  window.StemLab.registerTool('moonMission', {
    icon: '\uD83D\uDE80',
    label: 'Moon Mission',
    desc: 'Live a 10-phase Apollo mission from Kennedy to splashdown. Pick decisions at real Apollo moments (oxygen leak, landing fuel margin, abort thresholds), land the Lunar Module, collect rock samples, and decode the science of orbital mechanics + EVA. Includes Apollo historical facts and AI-customizable mission objectives from any source text.',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'complete_mission', label: 'Complete the full Moon mission', icon: '\uD83C\uDF0A', check: function(d) { return (d.missionPhase || 0) >= 10; }, progress: function(d) { return (d.missionPhase || 0) >= 10 ? 'Complete!' : 'Phase ' + ((d.missionPhase || 0) + 1) + '/10'; } },
      { id: 'collect_4_samples', label: 'Collect 4+ lunar rock samples', icon: '\uD83E\uDEA8', check: function(d) { return mmSampleTypeCount(d.lunarSamples) >= 4; }, progress: function(d) { return mmSampleTypeCount(d.lunarSamples) + '/4 samples'; } },
      { id: 'collect_all_samples', label: 'Collect all 8 sample types', icon: '\uD83D\uDC8E', check: function(d) { return mmSampleTypeCount(d.lunarSamples) >= 8; }, progress: function(d) { return mmSampleTypeCount(d.lunarSamples) + '/8 samples'; } },
      { id: 'quiz_5_correct', label: 'Answer 5+ space quiz questions correctly', icon: '\uD83C\uDF93', check: function(d) { return (d.quizCorrect || 0) >= 5; }, progress: function(d) { return (d.quizCorrect || 0) + '/5 correct'; } },
      { id: 'land_on_moon', label: 'Successfully land the Lunar Module', icon: '\uD83C\uDF15', check: function(d) { return (d.missionPhase || 0) >= 6; }, progress: function(d) { return (d.missionPhase || 0) >= 6 ? 'Landed!' : 'Not yet'; } },
      { id: 'commander_mode', label: 'Complete on Commander difficulty', icon: '\uD83D\uDE80', check: function(d) { return (d.missionPhase || 0) >= 10 && d.difficulty === 'commander'; }, progress: function(d) { return d.difficulty === 'commander' ? ((d.missionPhase || 0) >= 10 ? 'Done!' : 'In progress') : 'Wrong difficulty'; } }
    ],
    render: function(ctx) {
      // The mission header strip paints no ground of its own, so it sits on
      // the HOST surface - white in light and dark, pure BLACK in the contrast
      // theme, where the tool's own title measured 1.44:1.
      var isContrast = !!ctx.isContrast;
      var onHostInk = isContrast ? ' text-white' : '';
      // Header controls: 44px targets; a pressed toggle is filled. The host restyles
      // bg-white / text-indigo-700 for its dark and contrast themes.
      function mmHeadBtn(pressed) {
        return 'inline-flex items-center min-h-[44px] px-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ' +
          (pressed ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400');
      }
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var awardStemXP = ctx.awardXP;
      var callTTS = ctx.callTTS;
      var callGemini = ctx.callGemini;
      var sourceText = ctx.sourceText || ctx.inputText || '';
      var announceToSR = ctx.announceToSR;
      var gradeLevel = ctx.gradeLevel;

      // ── State Management ──
      var d = (labToolData && labToolData.moonMission) || {};
      // Saved state is user data: an older, hand-edited or corrupted save can hold the
      // wrong TYPE in any key, and the later phases dereference these (the quiz indexes
      // the bank with quizIdx, the debrief calls .toFixed on the landing and entry
      // records). Normalise the ones that can crash a render once, here.
      d = (function (raw) {
        var s = Object.assign({}, raw);
        var isNum = function (v) { return typeof v === 'number' && isFinite(v); };
        var isObj = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
        ['lunarSamples', 'decisionLog', 'missionLog'].forEach(function (k) {
          if (s[k] != null) s[k] = Array.isArray(s[k]) ? s[k].filter(isObj) : [];
        });
        // One entry per sample: repairs saves that banked the same rocks twice.
        if (s.lunarSamples) s.lunarSamples = mmDistinctSamples(s.lunarSamples);
        if (s.flightHistory != null) s.flightHistory = Array.isArray(s.flightHistory) ? s.flightHistory.filter(isObj).slice(-5) : [];
        if (s.reflection != null && !isObj(s.reflection)) s.reflection = null;
        if (s.predictions != null && !isObj(s.predictions)) s.predictions = null;
        if (s.evaHopTime != null && !isNum(s.evaHopTime)) s.evaHopTime = null;
        if (s.coastSlowest != null && !(isObj(s.coastSlowest) && isNum(s.coastSlowest.v) && isNum(s.coastSlowest.toMoonKm))) s.coastSlowest = null;
        if (s.launchMaxQ != null && !(isObj(s.launchMaxQ) && isNum(s.launchMaxQ.altKm) && isNum(s.launchMaxQ.velMs))) s.launchMaxQ = null;
        if (s.resolvedEvents != null && !Array.isArray(s.resolvedEvents)) s.resolvedEvents = [];
        if (s.earnedBadges != null && !isObj(s.earnedBadges)) s.earnedBadges = {};
        if (s.quizIdx != null && !(isNum(s.quizIdx) && s.quizIdx >= 0 && s.quizIdx % 1 === 0)) s.quizIdx = 0;
        if (s.landingResult != null && !(isObj(s.landingResult) && isNum(s.landingResult.vVel) && isNum(s.landingResult.hVel))) s.landingResult = null;
        if (s.entryOutcome != null && !(isObj(s.entryOutcome) && isNum(s.entryOutcome.angle) && isNum(s.entryOutcome.peakG) && typeof s.entryOutcome.outcome === 'string')) s.entryOutcome = null;
        if (s.deltaVHunt != null && (!isObj(s.deltaVHunt) || (s.deltaVHunt.log != null && !Array.isArray(s.deltaVHunt.log)))) s.deltaVHunt = null;
        return s;
      })(d);
      // `val` may be a plain value OR an updater function that receives the CURRENT
      // stored value. The updater form is mandatory anywhere the write happens outside
      // the render pass that produced `d` — above all inside the EVA render loop, whose
      // closure captures `d` once at canvas mount and never sees a later commit. With
      // the plain form, "collect a sample" recomputed the array from that frozen `d`
      // every time, so each pickup REPLACED the collection with a single rock (both
      // geology badges and the 4-sample quest were unreachable). Same class of bug for
      // two log() calls in one handler: the second silently dropped the first.
      function upd(key, val) {
        setLabToolData(function(prev) {
          var slice = (prev && prev.moonMission) || {};
          var patch = {};
          patch[key] = (typeof val === 'function') ? val(slice[key]) : val;
          return Object.assign({}, prev, { moonMission: Object.assign({}, slice, patch) });
        });
      }

      var phase = d.missionPhase || 0;
      var missionLog = Array.isArray(d.missionLog) ? d.missionLog : [];
      // Animation pause (WCAG 2.2.2): every passive phase canvas loops on its own. The
      // header toggle lets a student freeze them; with no explicit choice we follow the
      // OS reduced-motion setting. The module-level flag is what the loops actually
      // read, because a canvas ref closure never sees a later render's d.
      var _prefersReduce = false;
      try { _prefersReduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
      var animPaused = (d.animPaused != null) ? !!d.animPaused : _prefersReduce;
      _mmAnimPaused = animPaused;
      _mmMoonLabels = !!d.moonLabels;
      _mmTrueScale = !!d.trueScale;
      _mmEntryAngle = (typeof d.entryAngle === 'number' && isFinite(d.entryAngle)) ? d.entryAngle : -6.5;
      // Audio control (WCAG 1.4.2): the phase ambience loops indefinitely once a phase
      // starts, so it needs a stop. Sound stays ON by default — it carries real content
      // here (the launch roar, suit breathing, radio chatter) — but one control silences
      // everything, and the choice persists across phases and replays.
      var soundOff = !!d.soundOff;
      _mmSoundOff = soundOff;
      var missionXP = d.missionXP || 0;
      var samples = d.lunarSamples || [];
      // ── Predict, then watch ──
      // The student commits to an answer before the flight shows it, and the
      // explanation opens only once it has. Nothing waits on a prediction.
      var PREDICTIONS = [
        { id: 'launch_maxq', short: t('stem.moonmission.predict_maxq_short', 'When the air pushes hardest'),
          question: t('stem.moonmission.predict_maxq_q', 'On the way up, when does the air push hardest on the rocket?'),
          options: [
            { id: 'liftoff', label: t('stem.moonmission.predict_maxq_liftoff', 'At liftoff, with the engines at full thrust') },
            { id: 'minute', label: t('stem.moonmission.predict_maxq_minute', 'A minute or so up: fast, and the air still thick') },
            { id: 'top', label: t('stem.moonmission.predict_maxq_top', 'Near the top, when it is going fastest') }],
          correct: 'minute',
          wait: t('stem.moonmission.predict_maxq_wait', 'Watch the launch for the MAX Q call.'),
          explain: t('stem.moonmission.predict_maxq_explain', 'The push of the air grows with how thick the air is and with the square of your speed. At liftoff the rocket is slow, and near the top the air is almost gone. In between it is fast and the air is still thick, so the push peaks there: Max Q, the moment the rocket\'s structure is under the most strain.') },
        { id: 'tli_where', short: t('stem.moonmission.predict_tli_short', 'Where to fire TLI'),
          question: t('stem.moonmission.predict_tli_q', 'To head for the Moon, where in your orbit do you fire the TLI burn?'),
          options: [
            { id: 'near', label: t('stem.moonmission.predict_tli_near', 'On the side of Earth facing where the Moon will be') },
            { id: 'far', label: t('stem.moonmission.predict_tli_far', 'On the far side of Earth, opposite where the Moon will be') },
            { id: 'any', label: t('stem.moonmission.predict_tli_any', 'Anywhere: point the nose at the Moon and burn') }],
          correct: 'far',
          wait: t('stem.moonmission.predict_tli_wait', 'Watch where the green burn window opens.'),
          explain: t('stem.moonmission.predict_tli_explain', 'The burn does not aim at the Moon. It raises the far end of your orbit out to the distance of the Moon, so you fire opposite that far end and coast half an orbit out to meet it. That is why the window opened on the far side.') },
        { id: 'coast_speed', short: t('stem.moonmission.predict_coast_short', 'Speed on the way to the Moon'),
          question: t('stem.moonmission.predict_coast_q', 'Nothing pushes the spacecraft on the coast to the Moon. What does its speed do?'),
          options: [
            { id: 'steady', label: t('stem.moonmission.predict_coast_steady', 'Stays the same: there is no air to slow it') },
            { id: 'slows', label: t('stem.moonmission.predict_coast_slows', 'Slows down the whole way') },
            { id: 'dip', label: t('stem.moonmission.predict_coast_dip', 'Slows down, then speeds up near the Moon') }],
          correct: 'dip',
          wait: t('stem.moonmission.predict_coast_wait', 'Watch the SPEED readout above the coast.'),
          explain: t('stem.moonmission.predict_coast_explain', 'Earth pulls back on you the whole way out, so you keep losing speed: by the point where the Moon starts to pull harder than Earth you are going about a tenth as fast as when you left. From there the Moon takes over and you speed up again.') },
        { id: 'rendezvous_catch', short: t('stem.moonmission.predict_rdv_short', 'How Eagle catches Columbia'),
          question: t('stem.moonmission.predict_rdv_q', 'After lifting off, Eagle is behind Columbia in orbit around the Moon. How does it catch up?'),
          options: [
            { id: 'chase', label: t('stem.moonmission.predict_rdv_chase', 'Fire the engine forward and chase it at the same height') },
            { id: 'lower', label: t('stem.moonmission.predict_rdv_lower', 'Stay in a lower orbit, which goes around faster') },
            { id: 'higher', label: t('stem.moonmission.predict_rdv_higher', 'Climb above it and let it come back around') }],
          correct: 'lower',
          wait: t('stem.moonmission.predict_rdv_wait', 'Watch Eagle\'s height against Columbia\'s as they close.'),
          explain: t('stem.moonmission.predict_rdv_explain', 'Lower orbits go around faster. Firing forward at the same height would lift Eagle into a bigger, slower orbit and let Columbia pull away, so Eagle flew lower, gained on Columbia every minute, and rose to meet it only at the end.') },
        { id: 'descent_sideways', short: t('stem.moonmission.predict_side_short', 'How the lander moves sideways'),
          question: t('stem.moonmission.predict_side_q', 'The lander has one big engine pointing down. How does it cancel sideways drift?'),
          options: [
            { id: 'jets', label: t('stem.moonmission.predict_side_jets', 'Small side thrusters push it sideways') },
            { id: 'tilt', label: t('stem.moonmission.predict_side_tilt', 'It tilts, so the main engine pushes partly sideways') },
            { id: 'none', label: t('stem.moonmission.predict_side_none', 'It cannot: it lands wherever the drift takes it') }],
          correct: 'tilt',
          wait: t('stem.moonmission.predict_side_wait', 'Fly the landing and watch what A and D (or the arrow buttons) do to the lander.'),
          explain: t('stem.moonmission.predict_side_explain', 'Tilting points part of the push from the main engine sideways. The lander does have small thrusters, but they mostly turn it and are far too weak to stop metres per second of drift, so every change of drift is paid for from the tank that holds you up.') },
        { id: 'hop_time', short: t('stem.moonmission.predict_hop_short', 'A hop on the Moon'),
          question: t('stem.moonmission.predict_hop_q', 'The same push that gives a 0.35-second hop on Earth, tried on the Moon. How long are you in the air?'),
          options: [
            { id: 'same', label: t('stem.moonmission.predict_hop_same', 'About the same, 0.35 s') },
            { id: 'double', label: t('stem.moonmission.predict_hop_double', 'About twice as long, 0.7 s') },
            { id: 'six', label: t('stem.moonmission.predict_hop_six', 'About six times as long, 2 s') }],
          correct: 'six',
          wait: t('stem.moonmission.predict_hop_wait', 'On the surface, press Space (or JUMP) and watch the hop timer.'),
          explain: t('stem.moonmission.predict_hop_explain', 'Time in the air is how long gravity takes to cancel your upward speed and bring you back down. The Moon pulls one sixth as hard, so the same push keeps you up about six times as long.') }
      ];
      function predictCard(id, revealed, observed) {
        var sp = PREDICTIONS.filter(function(p) { return p.id === id; })[0];
        var preds = mmIsObj(d.predictions) ? d.predictions : {};
        var mine = typeof preds[id] === 'string' ? preds[id] : null;
        var pick = sp.options.filter(function(o) { return o.id === mine; })[0] || null;
        var answer = sp.options.filter(function(o) { return o.id === sp.correct; })[0];
        var body;
        if (!pick && !revealed) {
          body = h('div', { className: 'flex flex-col gap-1.5' }, sp.options.map(function(o) {
            return h('button', { key: o.id, type: 'button', 'data-moonmission-predict-option': o.id,
              onClick: function() {
                upd('predictions', function(cur) { var nx = Object.assign({}, mmIsObj(cur) ? cur : {}); nx[id] = o.id; return nx; });
                if (typeof announceToSR === 'function') announceToSR(t('stem.moonmission.predict_yours', 'Your prediction:') + ' ' + o.label + '. ' + sp.wait);
              },
              className: 'min-h-[44px] px-3 py-1.5 rounded-lg text-left text-xs font-bold text-white bg-violet-800 hover:bg-violet-700 border border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-300' }, o.label);
          }));
        } else if (!revealed) {
          body = h('p', { className: 'text-[0.6875rem] text-violet-100' },
            h('span', { className: 'font-bold' }, t('stem.moonmission.predict_yours', 'Your prediction:') + ' '), pick.label + '. ' + sp.wait);
        } else {
          body = h('div', null,
            h('p', { className: 'text-[0.6875rem] font-bold ' + (!pick ? 'text-violet-100' : pick.id === sp.correct ? 'text-emerald-300' : 'text-amber-300') },
              !pick ? t('stem.moonmission.predict_skipped', 'No prediction this time. What the flight showed:') + ' ' + answer.label + '.'
                : pick.id === sp.correct ? t('stem.moonmission.predict_right', 'Your prediction matched the flight:') + ' ' + pick.label + '.'
                : t('stem.moonmission.predict_yours', 'Your prediction:') + ' ' + pick.label + '. ' + t('stem.moonmission.predict_showed', 'The flight showed:') + ' ' + answer.label + '.'),
            observed ? h('p', { className: 'text-[0.6875rem] text-white mt-1' }, observed) : null,
            h('p', { className: 'text-[0.6875rem] text-slate-200 mt-1' }, sp.explain));
        }
        return h('div', { className: 'rounded-lg p-3 border bg-violet-950 border-violet-400/50 text-left', role: 'group',
            'aria-label': t('stem.moonmission.predict_title', 'Predict first') + ': ' + sp.question, 'data-moonmission-predict': id },
          h('p', { className: 'text-[0.6875rem] font-black uppercase text-violet-200 mb-0.5' }, t('stem.moonmission.predict_title', 'Predict first')),
          h('p', { className: 'text-xs text-white mb-2' }, sp.question),
          h('div', { role: 'status' }, body));
      }
      function currentFlightSummary(when) {
        return mmFlightSummary(d, { quiz: QUIZ_BANK.length, samples: LUNAR_SAMPLES_DATA.length }, when);
      }
      function copyFlightReport(text) {
        var said = function (msg, kind) {
          if (addToast) addToast(msg, kind);
          if (typeof announceToSR === 'function') announceToSR(msg);
        };
        var ok = function () { said(t('stem.moonmission.report_copied', 'Flight report copied. Paste it wherever your teacher collects work.'), 'success'); };
        var fail = function () { said(t('stem.moonmission.report_copy_failed', 'Copying is blocked here. Open "Show the report text" and copy it from there.'), 'info'); };
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(ok, fail); return; }
        } catch (e) {}
        fail();
      }

      function log(entry) {
        var line = { text: entry, time: new Date().toLocaleTimeString() };
        upd('missionLog', function(cur) { return (cur || []).concat([line]); });
      }

      function setPhase(p) {
        upd('missionPhase', p);
        var phaseName = PHASES[p] ? PHASES[p].name : 'Mission Complete';
        if (typeof announceToSR === 'function') announceToSR(p >= 10 ? 'Mission complete. Splashdown confirmed. Your debrief is ready.' : ('Mission phase ' + (p + 1) + ' of 10: ' + phaseName + '. ' + (PHASES[p] ? PHASES[p].desc : '')));
        // Phase-specific sounds + ambient audio
        sfxPhaseAdvance();
        if (p === 1) { sfxLaunch(); if (window._alloHaptic) window._alloHaptic('launch'); }
        else if (p === 2) { sfxStageSeparation(); if (window._alloHaptic) window._alloHaptic('bump'); }
        else if (p === 3) sfxEngineIgnition();
        else if (p === 4) sfxThrust();
        else if (p === 5) { sfxThrust(); if (window._alloHaptic) window._alloHaptic('launch'); }
        else if (p === 6) { sfxLanding(); if (window._alloHaptic) window._alloHaptic('land'); }
        else if (p === 7) sfxEngineIgnition();
        else if (p === 8) sfxStageSeparation();
        else if (p === 9) sfxSplashdown();
        else if (p >= 10) sfxMissionComplete();
        // One mapping for "what does this phase sound like", shared with the mute
        // control so turning sound back on mid-phase resumes the right bed.
        var _amb = ambientTypeForPhase(p);
        if (_amb) startMissionAmbient(_amb); else stopMissionAmbient();
        mmFocusWhenReady('[data-moonmission-phase-heading="' + p + '"]');
      }

      function addXP(amount) {
        // Updater form, so two same-pass awards (double badge unlock) and awards fired
        // from the long-lived EVA loop both accumulate instead of overwriting each other.
        upd('missionXP', function(cur) { return (cur || 0) + amount; });
        if (typeof awardStemXP === 'function') awardStemXP('moonMission', amount);
      }

      // ── Mission Event System ──
      // advancePhase checks for eligible events before advancing. If an event
      // triggers, it shows the event modal and delays the phase transition until
      // the student makes a choice.
      // One proceed per phase. While an event (or its outcome card) is on screen, the
      // phase buttons stayed live: a second click paid its XP and log again and
      // re-rolled the event, and the outcome card's Continue could later REWIND the
      // mission. The lock also covers a double-click that lands before the render
      // catches up.
      var eventPending = !!(d.activeEvent || d.eventOutcome);
      function canProceed() {
        if (eventPending) return false;
        var now = Date.now();
        if (_mmProceedLock && _mmProceedLock.phase === phase && now - _mmProceedLock.at < 1000) return false;
        _mmProceedLock = { phase: phase, at: now };
        return true;
      }
      // An off-window TLI must be answered at the coast: pressing Arrive without
      // choosing used to cost nothing at all, which beat both real options.
      var mccPending = !!(d.tliAccuracy && !d.tliAccuracy.onTime && !d.mccChoice);

      function advancePhase(targetPhase) {
        if (d.activeEvent || d.eventOutcome) return;
        var resolved = d.resolvedEvents || [];
        var eligible = MISSION_EVENTS.filter(function(evt) {
          return evt.phases.indexOf(targetPhase) >= 0
            && evt.difficulty.indexOf(difficulty) >= 0
            && resolved.indexOf(evt.id) < 0
            && Math.random() < (evt.probability * (diffSettings.eventFreq || 0.5));
        });
        if (eligible.length > 0) {
          var event = eligible[Math.floor(Math.random() * eligible.length)];
          upd('activeEvent', event);
          upd('eventPhaseTarget', targetPhase);
          mmFocusWhenReady('[data-moonmission-event-card]', true);
          log('\u26A0\uFE0F Mission Event: ' + event.title);
          if (typeof announceToSR === 'function') announceToSR('Mission event: ' + event.title + '. ' + event.scenario);
        } else {
          setPhase(targetPhase);
        }
      }

      function resolveEvent(event, chosenOption) {
        // Log the decision
        var optimalLabel = '';
        for (var oi = 0; oi < event.options.length; oi++) { if (event.options[oi].quality === 'optimal') { optimalLabel = event.options[oi].label; break; } }
        var decision = {
          eventId: event.id, title: event.title, chosen: chosenOption.label,
          quality: chosenOption.quality, optimal: optimalLabel,
          historical: event.historical, scienceReward: chosenOption.scienceReward,
          effects: chosenOption.effects ? Object.assign({}, chosenOption.effects) : null
        };
        upd('decisionLog', function(cur) { return (cur || []).concat([decision]); });
        // Mark event as resolved
        upd('resolvedEvents', function(cur) { return (cur || []).concat([event.id]); });
        // Apply resource effects (currently morale only; expanded in Phase 2)
        if (chosenOption.effects) {
          if (chosenOption.effects.morale) {
            upd('crewMorale', function(cur) {
              return Math.max(0, Math.min(100, (cur == null ? 75 : cur) + chosenOption.effects.morale));
            });
          }
        }
        // Award XP
        if (chosenOption.xp) addXP(chosenOption.xp);
        // Show outcome
        upd('eventOutcome', { outcome: chosenOption.scienceReward, quality: chosenOption.quality, label: chosenOption.label,
          impact: chosenOption.effects && chosenOption.effects.note ? chosenOption.effects.note : null });
        upd('activeEvent', null);
        mmFocusWhenReady('[data-moonmission-event-outcome]', true);
        log((chosenOption.quality === 'optimal' ? '\u2B50' : chosenOption.quality === 'adequate' ? '\u2705' : '\u26A0\uFE0F') + ' ' + chosenOption.label);
        if (addToast) addToast(chosenOption.quality === 'optimal' ? '\u2B50 Excellent decision!' : chosenOption.quality === 'adequate' ? '\u2705 Acceptable solution' : '\u26A0\uFE0F Suboptimal choice \u2014 see the science note', chosenOption.quality === 'optimal' ? 'success' : 'info');
      }

      // ── Mission Data ──
      var PHASES = [
        { name: t('stem.moonmission.mission_briefing', 'Mission Briefing'), icon: '\uD83D\uDCCB', desc: t('stem.moonmission.review_your_mission_objectives_and_cre', 'Review your mission objectives and crew assignment') },
        { name: t('stem.moonmission.launch', 'Launch'), icon: '\uD83D\uDE80', desc: t('stem.moonmission.countdown_and_liftoff_from_kennedy_spa', 'Countdown and liftoff from Kennedy Space Center') },
        { name: t('stem.moonmission.earth_orbit', 'Earth Orbit'), icon: '\uD83C\uDF0D', desc: t('stem.moonmission.reach_low_earth_orbit_and_prepare_for_', 'Reach low Earth orbit and prepare for trans-lunar injection') },
        { name: t('stem.moonmission.trans_lunar_coast', 'Trans-Lunar Coast'), icon: '\uD83C\uDF11', desc: t('stem.moonmission.3_day_journey_to_the_moon_384_400_km', '3-day journey to the Moon \u2014 384,400 km') },
        { name: t('stem.moonmission.lunar_orbit', 'Lunar Orbit'), icon: '\uD83C\uDF15', desc: t('stem.moonmission.enter_orbit_around_the_moon', 'Enter orbit around the Moon') },
        { name: t('stem.moonmission.powered_descent', 'Powered Descent'), icon: '\u2B07\uFE0F', desc: t('stem.moonmission.pilot_the_lunar_module_to_the_surface', 'Pilot the Lunar Module to the surface') },
        { name: t('stem.moonmission.moonwalk_eva', 'Moonwalk EVA'), icon: '\uD83D\uDC68\u200D\uD83D\uDE80', desc: t('stem.moonmission.explore_the_lunar_surface_and_collect_', 'Explore the lunar surface and collect samples') },
        { name: t('stem.moonmission.lunar_ascent', 'Lunar Ascent'), icon: '\u2B06\uFE0F', desc: t('stem.moonmission.launch_from_the_moon_and_rendezvous_wi', 'Launch from the Moon and rendezvous with Command Module') },
        { name: t('stem.moonmission.trans_earth_coast', 'Trans-Earth Coast'), icon: '\uD83C\uDF0D', desc: t('stem.moonmission.return_journey_to_earth', 'Return journey to Earth') },
        { name: t('stem.moonmission.re_entry_splashdown', 'Re-entry & Splashdown'), icon: '\uD83C\uDF0A', desc: t('stem.moonmission.survive_re_entry_and_splash_down_in_th', 'Survive re-entry and splash down in the Pacific') }
      ];

      var CREW_ROLES = [
        { role: 'Commander (CDR)', name: 'You', desc: t('stem.moonmission.pilots_the_lunar_module_to_the_surface', 'Pilots the Lunar Module to the surface and leads the EVA'), tasks: 'Landing decisions, EVA leadership, sample selection' },
        { role: 'Command Module Pilot (CMP)', name: t('stem.moonmission.alex', 'Alex'), desc: t('stem.moonmission.orbits_the_moon_alone_in_the_command_m', 'Orbits the Moon alone in the Command Module while CDR and LMP explore'), tasks: 'Orbital science, photography, rendezvous navigation' },
        { role: 'Lunar Module Pilot (LMP)', name: t('stem.moonmission.jordan', 'Jordan'), desc: t('stem.moonmission.assists_with_descent_and_eva_operates_', 'Assists with descent and EVA, operates scientific instruments'), tasks: 'Systems monitoring, instrument deployment, sample documentation' }
      ];

      var APOLLO_FACTS = [
        'Apollo 11 landed on July 20, 1969. Neil Armstrong and Buzz Aldrin walked outside for 2 hours 31 minutes, and spent about 21\u00BD hours on the surface in all.',
        'The Saturn V rocket stood 110.6 meters tall \u2014 taller than the Statue of Liberty.',
        'The Command Module had about the same interior space as a large car.',
        'Apollo astronauts left retroreflectors on the Moon that scientists still bounce lasers off today.',
        'The total Apollo program cost $25.4 billion (roughly $260 billion in today\'s dollars).',
        'Apollo 13\'s real words were "Houston, we\'ve had a problem": Jack Swigert said it first and Jim Lovell repeated it. The 1995 film changed it to "we have a problem."',
        'Several Apollo astronauts said Moon dust smelled like spent gunpowder after it was brought into the cabin.',
        'Long exposure to unfiltered sunlight likely faded the Apollo flags; LRO images show several flag poles still casting shadows.',
        'The Lunar Module had less computing power than a modern calculator.',
        'Apollo 17\'s Gene Cernan was the last human to walk on the Moon (December 1972).',
        'The astronauts\' bootprints could last millions of years \u2014 there\'s no wind or rain to erode them, only a slow rain of micrometeorites.',
        'The Moon is moving away from Earth at 3.8 cm per year.'
      ];

      // Each phase gets ONE fact that holds still. These cards used to call
      // Math.random() during render, so the fact re-rolled on every state change —
      // every difficulty click, every slider drag, every keystroke in the hypothesis
      // box swapped the text out from under whoever was reading it. Keyed off the
      // phase instead: different fact per phase, stable while you are in it.
      function apolloFact() {
        return APOLLO_FACTS[(phase * 7 + 3) % APOLLO_FACTS.length];
      }

      // ── Phase-readiness banner ──
      // Every passive phase already animates toward an unmistakable milestone — orbit
      // achieved, hard dock, splashdown — and the Proceed button underneath knew nothing
      // about any of it. So a student either sat waiting with no idea what they were
      // waiting for, or clicked straight through and missed the thing the phase exists to
      // show. This narrates what the spacecraft is doing right now, and turns green when
      // the milestone lands. Advancing early stays possible on purpose: the point is to
      // make the wait legible, not to enforce it.
      function phaseStatus(ready, waitingText, readyText) {
        return h('div', {
          role: 'status', 'aria-live': 'polite',
          // Opaque grounds: outside the dark phase cards this banner sits on the host's
          // WHITE card in both themes, and the old sky-500/10 tint + sky-300 ink
          // composited to 1.5:1 there (measured at phase 4).
          className: 'mb-2 rounded-lg px-3 py-2 text-[0.6875rem] font-bold border ' +
            (ready ? 'bg-emerald-950 border-emerald-500/50 text-emerald-200'
                   : 'bg-slate-900 border-sky-500/40 text-sky-200')
        }, (ready ? '✅ ' : '⏳ ') + (ready ? readyText : waitingText));
      }

      // ── Glossary ──
      // The mission talks in Apollo shorthand (TLI, LOI, CSM, Δv, hypergolic...) and
      // until now nothing in the tool spelled any of it out for a sighted student. One
      // native details/summary panel: plain meanings, an everyday comparison where it
      // helps. Rendered in the briefing and again in the debrief.
      var GLOSSARY = [
        ['\u0394v (delta-v)', t('stem.moonmission.gl_deltav', 'The change in speed a burn produces. It is rocket currency: every manoeuvre costs some, and the tank only holds so much.')],
        [t('stem.moonmission.gl_burn_term', 'Burn'), t('stem.moonmission.gl_burn', 'Firing an engine for a set time. Short burns steer; long burns change orbits.')],
        [t('stem.moonmission.gl_window_term', 'Burn window'), t('stem.moonmission.gl_window', 'The short stretch when the spacecraft points the right way for a burn. Miss it and you need a correction later.')],
        // The five burn names the mission is built around. They were spelled out only
        // under the briefing diagram, so from phase 1 onward a student who forgot what
        // TEI meant had nowhere to look it up.
        ['TLI', t('stem.moonmission.gl_tli', 'Trans-Lunar Injection: the burn that leaves Earth orbit and starts the three-day coast to the Moon.')],
        ['LOI', t('stem.moonmission.gl_loi', 'Lunar Orbit Insertion: slowing down at the Moon so its gravity captures you instead of flinging you past.')],
        ['PDI', t('stem.moonmission.gl_pdi', 'Powered Descent Initiation: the moment the lander lights its engine to drop out of orbit toward the surface.')],
        ['TEI', t('stem.moonmission.gl_tei', 'Trans-Earth Injection: the burn that leaves lunar orbit and starts the trip home.')],
        ['EI', t('stem.moonmission.gl_ei', 'Entry Interface: where the atmosphere effectively begins on the way home, about 122 km up.')],
        ['CSM / CM / SM', t('stem.moonmission.gl_csm', 'Command and Service Module. The CM is the cone the crew rides home in; the SM behind it carries the engine, power and oxygen and is dropped before entry.')],
        ['LM (Eagle)', t('stem.moonmission.gl_lm', 'Lunar Module, the two-part lander. The descent stage stays on the Moon as a launch pad; the ascent stage flies back up.')],
        ['CDR / CMP / LMP', t('stem.moonmission.gl_crew', 'Commander, Command Module Pilot, Lunar Module Pilot. Two of them land; the CMP stays in orbit alone.')],
        ['S-IVB', t('stem.moonmission.gl_sivb', 'The third stage of the Saturn V. It finishes the climb to orbit, then fires again for TLI.')],
        [t('stem.moonmission.gl_gravturn_term', 'Gravity turn'), t('stem.moonmission.gl_gravturn', 'Tipping the rocket over during ascent so the climb becomes sideways speed. Orbit is mostly about going sideways very fast.')],
        [t('stem.moonmission.gl_orbit_term', 'Orbit'), t('stem.moonmission.gl_orbit', 'Falling around a world so fast that you keep missing it. At 185 km that takes about 28,000 km/h.')],
        [t('stem.moonmission.gl_mcc_term', 'Mid-course correction'), t('stem.moonmission.gl_mcc', 'A small burn during the coast that fixes a trajectory error before it grows. Apollo flew one on nearly every leg.')],
        [t('stem.moonmission.gl_los_term', 'Loss of signal (LOS)'), t('stem.moonmission.gl_los', 'Behind the Moon there is no line of sight to Earth, so the radio goes quiet until the spacecraft comes back around.')],
        [t('stem.moonmission.gl_regolith_term', 'Regolith'), t('stem.moonmission.gl_regolith', 'The loose, powdery surface layer of the Moon, ground up by billions of years of impacts.')],
        [t('stem.moonmission.gl_mare_term', 'Mare / highlands'), t('stem.moonmission.gl_mare', 'Maria are the dark plains of ancient lava; the highlands are the bright, older, heavily cratered terrain.')],
        [t('stem.moonmission.gl_hypergolic_term', 'Hypergolic'), t('stem.moonmission.gl_hypergolic', 'Fuel and oxidiser that ignite on contact, no spark needed. Simple and reliable, which is why the lander used it.')],
        [t('stem.moonmission.gl_rendezvous_term', 'Rendezvous'), t('stem.moonmission.gl_rendezvous', 'Two spacecraft meeting in orbit by matching speed and position, then docking.')],
        [t('stem.moonmission.gl_corridor_term', 'Entry corridor'), t('stem.moonmission.gl_corridor', 'The narrow band of entry angles, about two degrees wide, that is neither a skip-out nor a burn-up.')],
        [t('stem.moonmission.gl_g_term', 'g (g-force)'), t('stem.moonmission.gl_g', 'How hard deceleration presses on the crew, in multiples of Earth gravity. Apollo 11 felt about 6.5 g coming home.')],
        ['MET', t('stem.moonmission.gl_met', 'Mission Elapsed Time: the clock since launch.')]
      ];
      function glossaryPanel(extraClass) {
        // Its own opaque dark ground: on phases 1-9 it renders straight onto the host's
        // WHITE card, where the translucent ground and indigo-200 ink measured 1.49:1.
        return h('details', { className: 'rounded-lg border border-slate-700 bg-slate-900 p-2 ' + (extraClass || ''), 'data-moonmission-glossary': 'true' },
          h('summary', { className: 'text-[0.6875rem] font-bold text-indigo-200 cursor-pointer' }, t('stem.moonmission.glossary_title', '\uD83D\uDCD6 Mission glossary \u2014 what the words mean')),
          h('dl', { className: 'mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5' },
            GLOSSARY.map(function(g) {
              return h('div', { key: g[0] },
                h('dt', { className: 'text-[0.6875rem] font-bold text-amber-200' }, g[0]),
                h('dd', { className: 'text-[0.6875rem] text-slate-300 leading-snug' }, g[1]));
            })));
      }

      var LUNAR_SAMPLES_DATA = [
        { name: t('stem.moonmission.anorthosite', 'Anorthosite'), icon: '\u26AA', type: 'Highland Rock', xp: 15, fact: t('stem.moonmission.this_ancient_rock_from_the_lunar_highl', 'This ancient rock from the lunar highlands is 4.4 billion years old \u2014 nearly as old as the Moon itself. It tells us the Moon once had a global magma ocean.') },
        { name: t('stem.moonmission.basalt', 'Basalt'), icon: '\u26AB', type: 'Mare Rock', xp: 10, fact: t('stem.moonmission.dark_volcanic_basalt_filled_the_moon_s', 'Dark volcanic basalt filled the Moon\'s giant impact basins to create the dark "seas" (maria) visible from Earth. These lavas erupted between about 3 and 3.9 billion years ago; the basalts Apollo 11 brought back are about 3.6 to 3.9 billion years old.') },
        { name: t('stem.moonmission.breccia', 'Breccia'), icon: '\uD83D\uDFE4', type: 'Impact Rock', xp: 12, fact: t('stem.moonmission.a_jumbled_mix_of_rock_fragments_welded', 'A jumbled mix of rock fragments welded together by meteorite impacts. The Moon\'s surface has been pounded for 4+ billion years.') },
        { name: t('stem.moonmission.regolith_core', 'Regolith Core'), icon: '\uD83E\uDEA8', type: 'Soil Sample', xp: 8, fact: t('stem.moonmission.lunar_soil_is_ground_up_rock_from_bill', 'Lunar soil is ground-up rock from billions of years of micrometeorite bombardment. It contains tiny glass beads and even traces of solar wind particles.') },
        { name: t('stem.moonmission.orange_soil', 'Orange Soil'), icon: '\uD83D\uDFE0', type: 'Volcanic Glass', xp: 20, fact: t('stem.moonmission.apollo_17_found_orange_soil_tiny_glass', 'Apollo 17 found orange soil \u2014 tiny glass beads from an ancient volcanic eruption 3.7 billion years ago. This was one of Apollo\'s most exciting discoveries!') },
        { name: t('stem.moonmission.kreep_basalt', 'KREEP Basalt'), icon: '\uD83D\uDC8E', type: 'Rare Mineral', xp: 25, fact: t('stem.moonmission.kreep_stands_for_potassium_k_rare_eart', 'KREEP stands for Potassium (K), Rare Earth Elements, and Phosphorus. These minerals concentrated in the last dregs of the lunar magma ocean.') },
        { name: t('stem.moonmission.impact_glass', 'Impact Glass'), icon: '\u2728', type: 'Glass Bead', xp: 10, fact: t('stem.moonmission.meteorite_impacts_melt_rock_into_glass', 'Meteorite impacts melt rock into glass that flies through space and lands as tiny spheres. Some contain trapped gases from the ancient lunar atmosphere.') },
        { name: t('stem.moonmission.genesis_rock', 'Genesis Rock'), icon: '\uD83D\uDCA0', type: 'Primordial', xp: 30, fact: t('stem.moonmission.apollo_15_found_this_4_1_billion_year_', 'Apollo 15 found this 4.1 billion year old anorthosite, one of the oldest rocks ever collected. It helped prove the magma ocean theory of the Moon\'s formation.') }
      ];

      // ── Quiz Questions (shown between key phases) ──
      // Each question carries `why` — one short line PER DISTRACTOR explaining why that
      // specific wrong pick is wrong (null at the correct index). Misconception-targeted
      // feedback beats bare right/wrong (same pattern as the physics tool's predict quiz).
      var QUIZ_BANK = [
        { q: 'How far is the Moon from Earth?', opts: ['38,440 km', '384,400 km', '3,844,000 km', '38,440,000 km'], a: 1, fact: t('stem.moonmission.the_moon_is_about_384_400_km_away_ligh', 'The Moon is about 384,400 km away \u2014 light takes 1.3 seconds to travel there!'), why: ['That would put the Moon closer than many satellites — about 1/10 of the real distance.', null, 'That is ~10× too far — at that range the Moon would look tiny in our sky.', 'That is ~100× too far — about as far away as Venus at its closest.'] },
        { q: 'How long does it take to reach the Moon?', opts: ['3 hours', '3 days', '3 weeks', '3 months'], a: 1, fact: t('stem.moonmission.apollo_missions_took_about_3_days_each', 'Apollo missions took about 3 days each way, reaching ~39,000 km/h at injection, then coasting slower as it climbed away from Earth.'), why: ['3 hours barely gets you to high Earth orbit — the Moon is ~1,000× farther than the ISS.', null, '3 weeks would mean crawling — even the slowing coast averaged ~5,000 km/h.', '3 months is interplanetary-cruise territory, not a lunar hop.'] },
        { q: 'What is the Moon\'s gravity compared to Earth?', opts: ['1/2', '1/4', '1/6', '1/10'], a: 2, fact: t('stem.moonmission.the_moon_s_gravity_is_1_6_of_earth_s_a', 'The Moon\'s gravity is 1/6 of Earth\'s. A 70 kg person still has 70 kg of mass, but their weight feels like about 12 kg on Earth.'), why: ['1/2 would feel almost Earth-normal — no bunny-hop gait.', '1/4 is closer to Mars (~3/8) — still too strong for the footage you have seen.', null, 'At 1/10 the famous loping gait would look even floatier than it does.'] },
        { q: 'What is the temperature on the Moon\'s sunlit side?', opts: ['50\u00B0C', '127\u00B0C', '200\u00B0C', '327\u00B0C'], a: 1, fact: t('stem.moonmission.the_sunlit_side_reaches_127_c_while_th', 'The sunlit side reaches 127\u00B0C, while the dark side drops to -173\u00B0C!'), why: ['50 Celsius is just a hot day on Earth \u2014 with no atmosphere the Moon swings far wider.', null, 'Hotter than daytime regolith actually gets \u2014 the Moon receives the same sunlight as Earth, just unfiltered.', 'That is Mercury-dayside territory \u2014 the Moon is no closer to the Sun than Earth is.'] },
        { q: 'How many people have walked on the Moon?', opts: ['2', '6', '12', '24'], a: 2, fact: t('stem.moonmission.12_astronauts_walked_on_the_moon_acros', '12 astronauts walked on the Moon across Apollo 11, 12, 14, 15, 16, and 17.'), why: ['2 was just Apollo 11 — five more landings followed.', '6 is the number of LANDINGS — two astronauts walked on each.', null, '24 is roughly how many FLEW to the Moon (including orbit-only crews) — only half walked.'] },
        { q: 'What was the first word in Armstrong\'s famous landing report after touchdown?', opts: ['"Houston"', '"Tranquility"', '"Eagle"', '"That\'s"'], a: 0, fact: t('stem.moonmission.buzz_aldrin_said_contact_light_first_b', 'Armstrong reported: "Houston, Tranquility Base here. The Eagle has landed." Aldrin\'s technical "Contact light" call came just before touchdown.'), why: [null, '“Tranquility” came a beat later, in “Tranquility Base here”.', '“Eagle” was later in the sentence, not the first word.', 'The famous “one small step” line came hours later, on the ladder.'] },
        { q: 'What fuel did the Saturn V first stage use?', opts: ['Hydrogen', 'Kerosene (RP-1)', 'Methane', 'Solid fuel'], a: 1, fact: t('stem.moonmission.the_first_stage_burned_rp_1_kerosene_w', 'The first stage burned RP-1 kerosene with liquid oxygen \u2014 2,000+ tons of fuel in 2.5 minutes!'), why: ['Liquid hydrogen powered the SECOND and THIRD stages — too low-thrust-per-volume for liftoff.', null, 'Methane engines are a modern design — nothing flew on methane in the 1960s.', 'Big solid boosters came with the Shuttle era — the Saturn V was all-liquid.'] },
        { q: 'Why can\'t sound travel through open air on the Moon?', opts: ['Too cold', 'No atmosphere', 'Too much gravity', 'Solar radiation'], a: 1, fact: t('stem.moonmission.sound_needs_a_medium_air_water_to_trav', 'Sound needs matter to vibrate through. With almost no atmosphere, the Moon cannot carry ordinary open-air sound, though astronauts still hear radios and vibrations through suits or equipment.'), why: ['Cold does not stop sound — it travels fine through cold air and even solid ice.', null, 'Lunar gravity is WEAKER (1/6), and gravity does not carry sound anyway.', 'Radiation has nothing to do with it — sound just needs matter to vibrate.'] },
        { q: 'What does Moon dust smell like after it is brought inside a cabin?', opts: ['Nothing', 'Spent gunpowder', 'Sulfur', 'Roses'], a: 1, fact: t('stem.moonmission.every_apollo_astronaut_reported_that_m', 'Several Apollo astronauts reported that Moon dust smelled like spent gunpowder when brought inside the LM.'), why: ['Astronaut reports describe a noticeable smell once the dust came inside the LM.', null, 'Sulfur is a volcanic-Earth smell — lunar dust smelled burnt, not rotten.', 'Apollo reports point to “spent gunpowder,” not flowers.'] },
        { q: 'How old are the oldest Moon rocks collected?', opts: ['1 billion years', '2.5 billion years', '4.4 billion years', '6 billion years'], a: 2, fact: t('stem.moonmission.the_oldest_moon_rocks_are_4_4_billion_', 'The oldest Moon rocks are 4.4 billion years old \u2014 nearly as old as the solar system itself!'), why: ['1 billion years is younger than nearly all of the lunar surface.', '2.5 billion is still younger than the ancient highland crust the crews sampled.', null, '6 billion years would be older than the solar system itself (4.6 billion).'] }
      ];
  // Move each question's correct answer onto a cycling target slot. As
      // authored, 7 of 11 answers sat at index 1; the position scanner had excused this file on phantom
      // arithmetic (any `* n + m %` expression counts as a "rotation"), so the
      // bias shipped. Slot-targeted rather than a fixed shift so the distribution
      // is exactly uniform; runs once at module load so the order is stable across
      // renders, sessions and exports. Same pattern as economicslab / galaxy /
      // advocacy.
      // The per-distractor `why` array is POSITION-ALIGNED with opts (null at the
      // correct index), so it must rotate in lockstep or feedback would explain
      // the wrong option.
      (function () {
        var SLOTS = [0, 2, 1, 3];
        var counter = 0;
        QUIZ_BANK.forEach(function (item) {
          if (!item || !Array.isArray(item.opts) || typeof item.a !== 'number') return;
          var len = item.opts.length;
          if (len < 2 || item.a < 0 || item.a >= len) return;
          var target = SLOTS[counter++ % SLOTS.length] % len;
          var shift = (item.a - target + len) % len;
          if (!shift) return;
          item.opts = item.opts.slice(shift).concat(item.opts.slice(0, shift));
          if (Array.isArray(item.why) && item.why.length === len) {
            item.why = item.why.slice(shift).concat(item.why.slice(0, shift));
          }
          item.a = target;
        });
      })();


      // ── AI-customized content override ──
      // When the teacher ran "Customize from source text," d.aiBriefing holds a parsed
      // { objectives, quiz, samples } object. Use that content in place of the hardcoded
      // defaults so the mission ties to the teacher's uploaded material.
      if (d.aiBriefing && typeof d.aiBriefing === 'object') {
        try {
          if (Array.isArray(d.aiBriefing.samples) && d.aiBriefing.samples.length >= 4) {
            // Preserve icons/types from defaults; apply AI names/facts/descriptions.
            LUNAR_SAMPLES_DATA = d.aiBriefing.samples.slice(0, 8).map(function(s, i) {
              var fallback = LUNAR_SAMPLES_DATA[i] || LUNAR_SAMPLES_DATA[0];
              return {
                name: String(s.name || fallback.name).substring(0, 30),
                icon: fallback.icon,
                type: String(s.desc || fallback.type).substring(0, 60),
                xp: typeof s.xp === 'number' ? Math.max(5, Math.min(30, s.xp)) : fallback.xp,
                fact: String(s.fact || fallback.fact).substring(0, 280)
              };
            });
          }
          if (Array.isArray(d.aiBriefing.quiz) && d.aiBriefing.quiz.length >= 3) {
            QUIZ_BANK = d.aiBriefing.quiz.slice(0, 10).filter(function(q) {
              return q && typeof q.q === 'string' && Array.isArray(q.opts) && q.opts.length >= 2 && typeof q.a === 'number';
            }).map(function(q) {
              return {
                q: String(q.q).substring(0, 220),
                opts: q.opts.slice(0, 4).map(function(o) { return String(o).substring(0, 80); }),
                a: Math.max(0, Math.min((q.opts.length - 1), q.a)),
                fact: String(q.fact || '').substring(0, 220)
              };
            });
            if (QUIZ_BANK.length < 3) {
              // Fallback: if validation dropped too many, restore defaults.
              QUIZ_BANK = [
                { q: 'How far is the Moon from Earth?', opts: ['38,440 km', '384,400 km', '3,844,000 km', '38,440,000 km'], a: 1, fact: t('stem.moonmission.the_moon_is_about_384_400_km_away_ligh_2', 'The Moon is about 384,400 km away \u2014 light takes 1.3 seconds to travel there!') }
              ];
            }
          }
        } catch (_aiErr) { /* fall back to defaults on any parsing issue */ }
      }

      // ═══════════════════════════════════════════════════════════════
      // MISSION EVENTS — Strategic decision points inspired by real missions
      // Each event triggers at phase transitions, presents 2-3 options with
      // different resource effects and quality grades, and logs the choice
      // for post-mission debrief analysis.
      // ═══════════════════════════════════════════════════════════════
      var MISSION_EVENTS = [
        {
          id: 'toilet_clog', title: t('stem.moonmission.waste_management_malfunction', 'Waste Management Malfunction'), emoji: '\uD83D\uDEBD',
          phases: [3, 8], difficulty: ['pilot', 'commander'], probability: 0.7,
          historical: 'Illustrative scenario (based on real spacecraft waste-system troubles — Skylab and ISS crews fought vent-line freezing): frozen liquid blocks a vent line, and the fix is rotating the spacecraft so sunlight thaws the blockage via thermal radiation through the vacuum of space.',
          scenario: 'Houston reports a blockage in the waste management vent line. Frozen waste is preventing the toilet from functioning. With days of coast ahead, this needs solving \u2014 crew comfort and hygiene are critical for mission success.',
          stemConcepts: ['thermal radiation', 'phase changes of matter', 'heat transfer in vacuum'],
          options: [
            { label: t('stem.moonmission.rotate_spacecraft_to_expose_vent_to_su', 'Rotate spacecraft to expose vent to sunlight'), icon: '\u2600\uFE0F',
              effects: { morale: 10 }, quality: 'optimal', xp: 20,
              scienceReward: 'Thermal radiation travels through the vacuum of space \u2014 no air needed! The Sun delivers 1,361 watts per square meter. By rotating the spacecraft, the crew used the Sun as a giant space heater (Apollo crews kept a slow "barbecue roll" going for exactly this reason). This is the same principle that makes the sunlit side of the Moon reach 127\u00B0C while the dark side drops to -173\u00B0C.' },
            { label: t('stem.moonmission.reroute_cabin_heater_duct_to_warm_the_', 'Reroute cabin heater duct to warm the pipe'), icon: '\uD83D\uDD25',
              effects: { morale: 5 }, quality: 'adequate', xp: 10,
              scienceReward: 'An electric heater on the line warms it by direct contact (conduction). It works, but it draws power from your fuel cells, which make electricity by combining hydrogen with oxygen from the same tanks you breathe from. Their by-product is your drinking water.' },
            { label: t('stem.moonmission.seal_the_vent_and_use_backup_waste_bag', 'Seal the vent and use backup waste bags'), icon: '\uD83D\uDDC4\uFE0F',
              effects: { morale: -10 }, quality: 'poor', xp: 5,
              scienceReward: 'Apollo astronauts (1969-1972) had NO toilet at all \u2014 they used adhesive collection bags for every bathroom visit. In microgravity, this was extremely difficult and unpleasant. The modern $23 million Universal Waste Management System was designed to fix this, but as every crewed program since has re-learned, space plumbing is hard!' }
          ]
        },
        {
          id: 'program_alarm', title: t('stem.moonmission.program_alarm_1202', 'Program Alarm 1202!'), emoji: '\u26A0\uFE0F',
          phases: [5], difficulty: ['pilot', 'commander'], probability: 0.8,
          historical: 'Apollo 11 (July 1969): During powered descent, the guidance computer triggered a 1202 "executive overflow" alarm \u2014 it was overloaded with data from the rendezvous radar left on by mistake. 26-year-old engineer Steve Bales in Mission Control made the call: "GO!" Armstrong continued the landing.',
          scenario: 'WARNING: The guidance computer is flashing a 1202 alarm \u2014 executive overflow! The computer is being asked to do more calculations than it can handle. The landing radar and rendezvous radar are both demanding processing time. You have seconds to decide.',
          stemConcepts: ['computer architecture', 'priority scheduling', 'real-time systems'],
          options: [
            { label: t('stem.moonmission.trust_the_computer_and_continue_go', 'Trust the computer and continue \u2014 "GO!"'), icon: '\u2705',
              effects: { morale: 15, note: 'No cost to the landing: the computer shed its low-priority jobs and kept flying the descent' }, quality: 'optimal', xp: 25,
              scienceReward: 'The Apollo Guidance Computer had about 74 KB of memory and a 1.024 MHz clock, doing roughly 40,000 additions a second \u2014 thousands of times slower than your phone. But its software used a brilliant priority-based scheduling system designed by MIT\'s Margaret Hamilton. Low-priority tasks were shed automatically so critical navigation could continue. This is the same "priority scheduling" concept used in every modern operating system!' },
            { label: t('stem.moonmission.abort_the_descent_fire_ascent_engine', 'Abort the descent \u2014 fire ascent engine'), icon: '\uD83D\uDD3A',
              effects: { morale: -5, hoverFuel: 15, note: 'The abort and a second descent burn used 15 s of hover fuel before you take the controls' }, quality: 'adequate', xp: 10,
              scienceReward: 'An abort during powered descent was always an option. The abort guidance system (AGS) was a completely separate computer that could return the LM to orbit independently. Redundancy \u2014 having backup systems \u2014 is a core principle of engineering safety.' },
            { label: t('stem.moonmission.switch_to_full_manual_control', 'Switch to full manual control'), icon: '\uD83D\uDD79\uFE0F',
              effects: { morale: 5, hoverFuel: 8, drift: 3, note: 'Without the computer trimming it you arrive with 3 m/s more drift, and flying it by hand cost 8 s of hover fuel' }, quality: 'risky', xp: 15,
              scienceReward: 'Armstrong actually DID take semi-manual control during the final approach, using the hand controller to fly past a boulder field. But full manual control without ANY computer assistance would require superhuman precision \u2014 the computer was still calculating altitude and velocity even when Armstrong steered.' }
          ]
        },
        {
          id: 'boulder_field', title: t('stem.moonmission.boulder_field_at_landing_site', 'Boulder Field at Landing Site!'), emoji: '\uD83E\uDEA8',
          phases: [5], difficulty: ['tourist', 'pilot', 'commander'], probability: 0.65,
          historical: 'Apollo 11 (1969): Armstrong saw the computer was guiding Eagle toward a crater filled with boulders "the size of automobiles." He took manual control and flew 500 meters past the danger zone, landing with just 25 seconds of fuel remaining. Mission Control called: "60 seconds!" then "30 seconds!"',
          scenario: 'Looking out the window, you see the automated guidance is targeting a field of boulders! Large rocks surround the planned landing zone. You need to decide: trust the computer, take manual control, or abort.',
          stemConcepts: ['terrain analysis', 'fuel management', 'risk assessment'],
          options: [
            { label: t('stem.moonmission.take_manual_control_and_fly_past_the_b', 'Take manual control and fly past the boulders'), icon: '\uD83D\uDD79\uFE0F',
              effects: { morale: 15, hoverFuel: 10, note: 'Flying 500 m past the boulders costs 10 s of hover fuel, the same trade Armstrong made' }, quality: 'optimal', xp: 25,
              scienceReward: 'Armstrong flew the LM like a helicopter, translating horizontally while descending. This cost precious fuel but saved the mission. When he landed, only 25 seconds of hover fuel remained \u2014 about 200 kg of Aerozine-50 and nitrogen tetroxide. The fuel margin was so thin that a single additional hover would have triggered a mandatory abort.' },
            { label: t('stem.moonmission.land_where_the_computer_says', 'Land where the computer says'), icon: '\uD83E\uDD16',
              effects: { morale: -15, site: 'boulders', note: 'No fuel spent, but you set down among boulders: the landing score loses up to 20 points for the rough site' }, quality: 'poor', xp: 5,
              scienceReward: 'The guidance computer\'s landing target was calculated from orbital photographs, but those photos couldn\'t show every boulder. The lesson: automation is powerful but humans must monitor and override when reality differs from the plan. This is called "human-in-the-loop" design.' },
            { label: t('stem.moonmission.abort_and_try_again_next_orbit', 'Abort and try again next orbit'), icon: '\uD83D\uDD04',
              effects: { morale: -5, hoverFuel: 20, note: 'Going round again burns 20 s of hover fuel before the second attempt' }, quality: 'adequate', xp: 10,
              scienceReward: 'Aborting and re-orbiting was always an option, but it would cost fuel and delay the landing by 2 hours. In some scenarios, discretion IS the better part of valor \u2014 but Armstrong\'s instinct told him he could make it, and he was right.' }
          ]
        },
        {
          id: 'fuel_cell_stir', title: t('stem.moonmission.oxygen_tank_pressure_spike', 'Oxygen Tank Pressure Spike'), emoji: '\u26A1',
          phases: [3, 8], difficulty: ['commander'], probability: 0.6,
          historical: 'Apollo 13 (April 1970): A routine "cryo stir" of the oxygen tanks caused an explosion that crippled the Service Module. The crew survived by using the Lunar Module as a lifeboat \u2014 one of the greatest rescues in history. Commander Lovell, Pilot Haise, and Pilot Swigert improvised solutions for 4 days.',
          scenario: 'During a routine cryogenic tank stir, you hear a loud bang and see the pressure gauge in O\u2082 Tank 2 spiking wildly. Cabin pressure is fluctuating. Houston is analyzing telemetry urgently.',
          stemConcepts: ['cryogenics', 'gas laws (Gay-Lussac\'s Law)', 'electrical systems', 'emergency procedures'],
          options: [
            { label: t('stem.moonmission.immediately_isolate_tank_2_and_switch_', 'Immediately isolate Tank 2 and switch to Tank 1'), icon: '\uD83D\uDEE1\uFE0F',
              effects: { morale: 5 }, quality: 'optimal', xp: 20,
              scienceReward: 'Cryogenic oxygen is stored at -183\u00B0C under extreme pressure. When pressure rises uncontrollably, the risk is rupture. Isolating the faulty tank preserves your remaining oxygen supply. Gay-Lussac\'s Law (at a fixed volume, pressure rises in step with temperature) tells us that as the sealed tank heats up, its pressure climbs \u2014 that\'s what the gauges showed.' },
            { label: t('stem.moonmission.vent_tank_2_to_relieve_pressure', 'Vent Tank 2 to relieve pressure'), icon: '\uD83D\uDCA8',
              effects: { morale: -5 }, quality: 'adequate', xp: 10,
              scienceReward: 'Venting releases the pressure but wastes oxygen into space. On Apollo 13, the crew eventually lost ALL oxygen from the Service Module. They survived because the Lunar Module had its own independent life support \u2014 a lesson in the importance of redundant systems.' },
            { label: t('stem.moonmission.try_to_reset_the_tank_heater_circuit', 'Try to reset the tank heater circuit'), icon: '\uD83D\uDD27',
              effects: { morale: -10 }, quality: 'poor', xp: 5,
              scienceReward: 'On Apollo 13, the explosion was caused by damaged wiring inside the tank \u2014 a manufacturing defect from years earlier. Attempting to reset would have made it worse. This teaches a critical engineering principle: when you don\'t understand the root cause, don\'t poke at it \u2014 stabilize first, diagnose second.' }
          ]
        },
        {
          id: 'space_sickness', title: t('stem.moonmission.space_adaptation_syndrome', 'Space Adaptation Syndrome'), emoji: '\uD83E\uDD22',
          phases: [2, 3], difficulty: ['tourist', 'pilot', 'commander'], probability: 0.5,
          historical: 'About 60-80% of astronauts experience Space Adaptation Syndrome (SAS) in the first 1-3 days. Senator Jake Garn\'s 1985 Shuttle flight was so severe that NASA informally named the unit of space sickness the "Garn" \u2014 1 Garn being the maximum possible nausea.',
          scenario: 'A crew member is experiencing severe nausea and disorientation. In microgravity, the inner ear sends confusing signals to the brain because "up" and "down" no longer exist. This affects their ability to work and could impact mission tasks.',
          stemConcepts: ['vestibular system', 'inner ear physiology', 'microgravity adaptation'],
          options: [
            { label: t('stem.moonmission.administer_anti_nausea_medication_and_', 'Administer anti-nausea medication and rest period'), icon: '\uD83D\uDC8A',
              effects: { morale: 5 }, quality: 'optimal', xp: 15,
              scienceReward: 'The vestibular system in your inner ear uses fluid-filled semicircular canals to detect rotation and tiny calcium carbonate crystals (otoliths) to detect gravity. In microgravity, the otoliths float freely, sending signals that conflict with what your eyes see. Anti-nausea medication (like promethazine) blocks the brain\'s emetic center while the vestibular system adapts over 2-3 days.' },
            { label: t('stem.moonmission.tough_it_out_keep_working_through_the_', 'Tough it out \u2014 keep working through the nausea'), icon: '\uD83D\uDCAA',
              effects: { morale: -10 }, quality: 'poor', xp: 5,
              scienceReward: 'Working through severe SAS is counterproductive and dangerous. In microgravity, vomiting is a serious safety hazard \u2014 without gravity to direct it, vomit can be inhaled into the lungs (aspiration). Modern space medicine prioritizes crew health because a sick astronaut is an ineffective astronaut.' },
            { label: t('stem.moonmission.reduce_visual_stimulation_and_close_wi', 'Reduce visual stimulation and close window shades'), icon: '\uD83D\uDE36\u200D\uD83C\uDF2B\uFE0F',
              effects: { morale: 0 }, quality: 'adequate', xp: 10,
              scienceReward: 'Closing eyes or fixing gaze on a stable reference point reduces "sensory conflict" \u2014 the mismatch between what eyes see (floating objects) and what the inner ear feels (no gravity). This is similar to why reading in a car causes motion sickness: eyes say "still" but inner ear says "moving."' }
          ]
        }
      ];

      // ── Difficulty Settings (expanded with event parameters) ──
      var DIFFICULTIES = {
        tourist:    { label: t('stem.moonmission.tourist', 'Tourist'),    icon: '\uD83C\uDF1F', desc: t('stem.moonmission.guided_gentle_margins', 'Guided \u2014 extra fuel and O\u2082, best option hinted. The Moon\'s gravity is the same in every mode.'), gravity: 1.62, fuel: 160, o2Rate: 0.1, eventFreq: 0.55, showEffects: true, showOptimalHint: true },
        pilot:     { label: t('stem.moonmission.pilot', 'Pilot'),      icon: '\u2B50', desc: t('stem.moonmission.standard_apollo_parameters', 'Standard Apollo parameters'), gravity: 1.62, fuel: 110, o2Rate: 0.3, eventFreq: 0.6, showEffects: true, showOptimalHint: false },
        commander: { label: t('stem.moonmission.commander', 'Commander'),  icon: '\uD83C\uDFC5', desc: t('stem.moonmission.realistic_tight_fuel_budget_faster_o_d', 'Realistic \u2014 tight fuel budget, faster O\u2082 drain'), gravity: 1.62, fuel: 90, o2Rate: 0.6, eventFreq: 0.9, showEffects: false, showOptimalHint: false }
      };
      // Any key of DIFFICULTIES. The type-guard pass listed only two of the three, so
      // choosing Tourist stored 'tourist' and then played Pilot with Pilot checked.
      var difficulty = Object.prototype.hasOwnProperty.call(DIFFICULTIES, d.difficulty) ? d.difficulty : 'pilot';
      var diffSettings = DIFFICULTIES[difficulty];

      // ── Achievement Badges ──
      var BADGES = [
        { id: 'first_step', name: t('stem.moonmission.one_small_step', 'One Small Step'), icon: '\uD83D\uDC63', desc: t('stem.moonmission.complete_your_first_eva_moonwalk', 'Complete your first EVA moonwalk'), check: function() { return phase >= 7; } },
        { id: 'geologist', name: t('stem.moonmission.lunar_geologist', 'Lunar Geologist'), icon: '\uD83E\uDEA8', desc: t('stem.moonmission.collect_4_rock_samples', 'Collect 4+ rock samples'), check: function() { return mmSampleTypeCount(d.lunarSamples) >= 4; } },
        { id: 'collector', name: t('stem.moonmission.sample_return', 'Sample Return'), icon: '\uD83D\uDCE6', desc: t('stem.moonmission.collect_all_8_sample_types', 'Collect all 8 sample types'), check: function() { return mmSampleTypeCount(d.lunarSamples) >= 8; } },
        { id: 'mission_complete', name: 'Splashdown!', icon: '\uD83C\uDF0A', desc: t('stem.moonmission.complete_the_full_mission', 'Complete the full mission'), check: function() { return phase >= 10; } },
        { id: 'quiz_master', name: t('stem.moonmission.space_scholar', 'Space Scholar'), icon: '\uD83C\uDF93', desc: t('stem.moonmission.answer_5_quiz_questions_correctly', 'Answer 5+ quiz questions correctly'), check: function() { return (d.quizCorrect || 0) >= 5; } },
        { id: 'commander_diff', name: t('stem.moonmission.right_stuff', 'Right Stuff'), icon: '\uD83D\uDE80', desc: t('stem.moonmission.complete_mission_on_commander_difficul', 'Complete mission on Commander difficulty'), check: function() { return phase >= 10 && difficulty === 'commander'; } }
      ];
      var earnedBadges = d.earnedBadges || {};
      function checkBadges() {
        BADGES.forEach(function(b) {
          if (!earnedBadges[b.id] && b.check()) {
            // The in-place flag is the SAME-PASS re-award guard — checkBadges runs on a
            // 0ms timer after every render, and state has not committed yet when the
            // second badge of the same pass is tested. Do not "clean this up": without
            // it the next tick re-fires the toast and pays the 20 XP again.
            earnedBadges[b.id] = true;
            upd('earnedBadges', (function(id) { return function(cur) { var next = Object.assign({}, cur); next[id] = true; return next; }; })(b.id));
            if (addToast) addToast('\uD83C\uDFC5 Badge Earned: ' + b.name + ' \u2014 ' + b.desc, 'success');
            addXP(20);
          }
        });
      }

      // Check badges whenever phase changes
      setTimeout(checkBadges, 0);   // deferred: unlocking a badge calls upd()+addToast() — never setState during render

      // ── Quiz State ──
      var showQuiz = d.showQuiz || false;
      var quizIdx = d.quizIdx || 0;
      var quizCorrect = d.quizCorrect || 0;
      var quizAnswered = d.quizAnswered || false;
      var quizSelectedAnswer = typeof d.quizSelectedAnswer === 'number' ? d.quizSelectedAnswer : -1;   // 0 is the first option, not 'unanswered'

      // ── Mission Timer ──
      var missionStartTime = d.missionStartTime || 0;
      var missionPausedAt = d.missionPausedAt || 0;
      var missionPausedTotal = d.missionPausedTotal || 0;
      function getMissionElapsed() {
        if (!missionStartTime) return '00:00:00';
        var missionClockNow = missionPausedAt || Date.now();
        var elapsed = Math.max(0, Math.floor((missionClockNow - missionStartTime) / 1000) - missionPausedTotal);
        var hh = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        var mm = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        var ss = (elapsed % 60).toString().padStart(2, '0');
        return hh + ':' + mm + ':' + ss;
      }
      function toggleMissionClock() {
        if (!missionStartTime) return;
        if (missionPausedAt) {
          upd('missionPausedTotal', missionPausedTotal + Math.floor((Date.now() - missionPausedAt) / 1000));
          upd('missionPausedAt', 0);
          if (typeof announceToSR === 'function') announceToSR('Mission clock resumed');
        } else {
          upd('missionPausedAt', Date.now());
          if (typeof announceToSR === 'function') announceToSR('Mission clock paused');
        }
      }

      // Phase 10 is the debrief, not "Re-entry & Splashdown" — which is what clamping to
      // the last PHASES entry made the dashboard say, next to "Phase 11/10" and a Return
      // card still marked Active.
      var COMPLETE_PHASE = { name: t('stem.moonmission.mission_complete_title', 'Mission Complete'), icon: '\uD83C\uDF1F', desc: t('stem.moonmission.splashdown_debrief', 'Splashdown confirmed. Read your flight record, then fly again.') };
      var activePhase = phase >= 10 ? COMPLETE_PHASE : (PHASES[phase] || COMPLETE_PHASE);
      var nextPhase = phase + 1 < PHASES.length ? PHASES[phase + 1] : null;
      // One line per phase saying what the student is supposed to DO here. The dashboard
      // used to name the phase and what came next, and left "so what do I press?" to be
      // worked out from whatever sat under the canvas.
      var PHASE_TASKS = [
        t('stem.moonmission.task_0', 'Pick a difficulty, look over the mission profile, then press Begin Mission.'),
        t('stem.moonmission.task_1', 'Watch the Saturn V climb. When the banner turns green you are in orbit \u2014 press Proceed to Orbit.'),
        t('stem.moonmission.task_2', 'Timing call: wait for the green burn window, then fire TLI. Firing early is allowed, but it costs a correction later.'),
        t('stem.moonmission.task_3', 'Answer the knowledge check, decide on the mid-course correction if one is offered, then head for lunar orbit.'),
        t('stem.moonmission.task_4', 'Watch one orbit: loss of signal behind the Moon, Earthrise, then undock for the descent.'),
        t('stem.moonmission.task_5', 'Fly the landing: W or \u2191 for thrust, A/D to slide. Touch down under 3 m/s down and 5 m/s sideways.'),
        t('stem.moonmission.task_6', 'Walk the surface: collect 4 rocks with F, deploy the seismometer, then End EVA.'),
        t('stem.moonmission.task_7', 'Watch the ascent and docking, then fire the TEI burn to head home.'),
        t('stem.moonmission.task_8', 'Answer the second knowledge check, set the entry angle inside the corridor, then begin re-entry.'),
        t('stem.moonmission.task_9', 'Watch the entry and splashdown, then complete the mission.'),
        t('stem.moonmission.task_10', 'Read your flight record \u2014 four graded calls \u2014 then fly again and beat it.')
      ];
      var phaseTask = PHASE_TASKS[Math.min(phase, 10)];
      var phaseProgressPct = Math.min(100, Math.round((Math.min(phase, 10) / 10) * 100));
      var crewMorale = (typeof d.crewMorale === 'number' && isFinite(d.crewMorale)) ? d.crewMorale : 75;
      var earnedBadgeCount = Object.keys(d.earnedBadges || {}).length;
      var flightPlanGroups = [
        { id: 'brief', label: t('stem.moonmission.plan_brief', 'Brief'), icon: '\uD83D\uDCCB', phases: [0, 1] },
        { id: 'transit', label: t('stem.moonmission.plan_transit', 'Transit'), icon: '\uD83C\uDF0D', phases: [2, 3, 4] },
        { id: 'landing', label: t('stem.moonmission.plan_landing', 'Landing'), icon: '\uD83C\uDF15', phases: [5] },
        { id: 'surface', label: t('stem.moonmission.plan_surface', 'Surface'), icon: '\uD83E\uDEA8', phases: [6, 7] },
        { id: 'return', label: t('stem.moonmission.plan_return', 'Return'), icon: '\uD83C\uDF0A', phases: [8, 9] }
      ];

      // ═══════════════════════════════════
      // RENDER
      // ═══════════════════════════════════

      return h('div', { className: 'max-w-5xl mx-auto px-1 space-y-3', role: 'main', 'data-moonmission-tool': 'true', 'aria-label': 'Apollo Moon Mission Simulator - ' + (phase >= 10 ? 'Mission complete' : 'Phase ' + (phase + 1) + ' of 10: ' + activePhase.name) },

        // Header
        h('div', { className: 'flex items-center justify-between mb-3' },
          h('div', { className: 'flex items-center gap-2' },
            h('button', { onClick: function() {
                // Tear down the EVA WebGL loop + looping mission audio before leaving — neither stops itself
                // on unmount, so exiting mid-EVA used to leak a forever-running render loop + ambient sound.
                var evaCanvas = document.querySelector('[data-eva-canvas]');
                if (evaCanvas && evaCanvas._evaCleanup) evaCanvas._evaCleanup();
                if (typeof stopMissionAmbient === 'function') stopMissionAmbient();
                setStemLabTool(null);
              }, className: 'inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-slate-100 transition-colors', 'aria-label': t('stem.moonmission.back_to_stem_lab', 'Back to STEAM Lab') },
              h(ArrowLeft, { size: 18 })
            ),
            h('div', null,
              h('h3', { className: 'text-lg font-black text-slate-800 flex items-center gap-2' + onHostInk }, t('stem.moonmission.apollo_moon_mission', '\uD83D\uDE80 Apollo Moon Mission')),
              h('p', { className: 'text-[0.6875rem] text-slate-600 -mt-0.5' + onHostInk }, t('stem.moonmission.full_mission_simulation_launch_to_spla', 'Full mission simulation \u2022 Launch to splashdown'))
            )
          ),
          h('div', { className: 'text-right' },
            h('div', { className: 'text-[0.6875rem] text-slate-600 font-mono' + onHostInk }, 'MET ' + getMissionElapsed()),
            h('div', { className: 'flex items-center justify-end gap-2 flex-wrap' },
              // These were 10px underlined words ~15px tall, each named differently from
              // what it showed ("Sound on" was announced as "Mute all mission sound"),
              // and the two toggles flipped their names as well as aria-pressed, so a
              // screen reader heard "Turn mission sound back on, pressed". Toggles now
              // keep one name and let aria-pressed carry the state.
              // Was missionStartTime && h(...): React renders the 0, so a literal "0" sat
              // in the header before launch. The label strings were also double-escaped
              // ('\\u23F8') and showed as the six characters "\u23F8" instead of a glyph.
              missionStartTime ? h('button', { type: 'button', title: missionPausedAt ? t('stem.moonmission.resume_mission_clock', 'Resume mission clock') : t('stem.moonmission.pause_mission_clock', 'Pause mission clock'), onClick: toggleMissionClock, className: mmHeadBtn(false) }, missionPausedAt ? t('stem.moonmission.resume_clock_label', '\u25B6 Resume clock') : t('stem.moonmission.pause_clock_label', '\u23F8 Pause clock')) : null,
              // WCAG 2.2.2: the passive phases animate on their own and loop. One control
              // freezes every 2D phase canvas; the hand-flown landing and the EVA are
              // user-driven and stay live. Defaults to the OS reduced-motion setting.
              h('button', { type: 'button', 'aria-pressed': animPaused ? 'true' : 'false', 'data-moonmission-anim-toggle': 'true',
                title: t('stem.moonmission.anim_toggle_hint', 'Freezes the launch, orbit, coast and re-entry animations. The landing game and the moonwalk are not affected.'),
                onClick: function() { upd('animPaused', !animPaused); },
                className: mmHeadBtn(animPaused) },
                t('stem.moonmission.pause_animation_label', '\u23F8 Pause animation')),
              h('button', { type: 'button', 'aria-pressed': soundOff ? 'true' : 'false', 'data-moonmission-sound-toggle': 'true',
                title: t('stem.moonmission.sound_toggle_hint', 'Silences the engine rumble, radio chatter, suit breathing and every alert tone.'),
                onClick: function() {
                  var next = !soundOff;
                  _mmSoundOff = next;          // the flag the audio path reads, set before we touch it
                  upd('soundOff', next);
                  if (next) {
                    stopMissionAmbient();
                  } else {
                    var at = ambientTypeForPhase(phase);
                    if (at) startMissionAmbient(at); else stopMissionAmbient();
                  }
                  if (typeof announceToSR === 'function') announceToSR(next ? 'Mission sound muted.' : 'Mission sound on.');
                },
                className: mmHeadBtn(soundOff) },
                t('stem.moonmission.mute_sound_label', '\uD83D\uDD07 Mute sound'))
            ),
            h('div', { className: 'text-[0.6875rem] text-indigo-700 font-bold' + onHostInk }, '\u2B50 ' + missionXP + ' XP')
          )
        ),

        h('section', {
          className: 'rounded-2xl overflow-hidden border border-indigo-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-xl shadow-indigo-950/10',
          'data-moonmission-control': 'true',
          'aria-label': t('stem.moonmission.mission_control_dashboard', 'Mission Control dashboard')
        },
          h('div', { className: 'p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4' },
            h('div', { className: 'lg:col-span-7' },
              h('div', { className: 'flex items-center gap-2 text-[0.6875rem] font-black uppercase text-cyan-200' },
                h('span', null, t('stem.moonmission.mission_control', 'Mission Control')),
                h('span', { className: 'px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white' }, DIFFICULTIES[difficulty].icon + ' ' + DIFFICULTIES[difficulty].label)
              ),
              h('div', { className: 'mt-2 flex items-start gap-3' },
                h('div', { className: 'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0' }, activePhase.icon),
                h('div', { className: 'min-w-0' },
                  h('h4', { className: 'text-xl sm:text-2xl font-black leading-tight rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300', tabIndex: -1, 'data-moonmission-phase-heading': String(phase) }, activePhase.name),
                  h('p', { className: 'mt-1 text-[0.75rem] sm:text-sm text-indigo-100/85 leading-relaxed' }, activePhase.desc),
                  // The one line that answers "what am I supposed to do here?".
                  h('p', { className: 'mt-2 text-[0.6875rem] sm:text-xs text-amber-200 font-bold leading-snug', 'data-moonmission-task': 'true' },
                    '\uD83C\uDFAF ' + t('stem.moonmission.your_job_now', 'Your job now: ') + phaseTask),
                  h('p', { className: 'mt-1 text-[0.6875rem] text-cyan-200/90' },
                    nextPhase ? t('stem.moonmission.next_phase_prefix', 'Next: ') + nextPhase.name : t('stem.moonmission.ready_for_debrief', 'Ready for debrief and replay.')
                  )
                )
              ),
              // ONE progress bar. There used to be two (a gradient bar here plus a separate
              // ten-segment bar under the dashboard) saying the same thing, and on a phone
              // the pair helped push the phase content a full screen down.
              h('div', { className: 'mt-3 sm:mt-4', role: 'progressbar', 'aria-valuenow': Math.min(phase + 1, 10), 'aria-valuemin': 1, 'aria-valuemax': 10,
                'aria-label': phase >= 10 ? t('stem.moonmission.mission_progress_complete', 'Mission progress: complete, all 10 phases flown') : ('Mission progress: phase ' + (phase + 1) + ' of 10, ' + activePhase.name) },
                h('div', { className: 'flex gap-0.5 mb-1' },
                  PHASES.map(function(p, i) {
                    var status = phase >= 10 || i < phase ? 'completed' : i === phase ? 'active' : 'pending';
                    return h('div', {
                      key: i, title: p.name,
                      className: 'flex-1 h-1.5 rounded-full transition-all ' +
                        (status === 'completed' ? 'bg-emerald-400' : status === 'active' ? 'bg-cyan-300 animate-pulse motion-reduce:animate-none' : 'bg-white/15')
                    });
                  })
                ),
                h('div', { className: 'flex justify-between text-[0.6875rem] font-bold text-indigo-100/80' },
                  h('span', null, t('stem.moonmission.launch_2', 'Launch')),
                  h('span', null, phase >= 10 ? t('stem.moonmission.all_phases_complete', 'All 10 phases complete') : ('Phase ' + (phase + 1) + '/10 \u2022 ' + phaseProgressPct + '%')),
                  h('span', null, t('stem.moonmission.splashdown', 'Splashdown'))
                )
              )
            ),
            // Three columns on a phone (two rows), two columns beside the title on desktop.
            h('div', { className: 'lg:col-span-5 grid grid-cols-3 lg:grid-cols-2 gap-1.5 sm:gap-2' },
              [
                { label: t('stem.moonmission.met', 'MET'), value: getMissionElapsed(), tone: 'text-cyan-200', hint: t('stem.moonmission.hint_met', 'Mission Elapsed Time: the clock since launch. Pause it from the header.') },
                { label: t('stem.moonmission.mission_xp', 'Mission XP'), value: missionXP + ' XP', tone: 'text-amber-200', hint: t('stem.moonmission.hint_xp', 'Points from good decisions, rock samples and quiz answers.') },
                { label: t('stem.moonmission.samples', 'Samples'), value: mmSampleTypeCount(samples) + '/' + LUNAR_SAMPLES_DATA.length, tone: 'text-lime-200', hint: t('stem.moonmission.hint_samples', 'Rocks bagged during the moonwalk. Four earns the geology badge.') },
                { label: t('stem.moonmission.quiz', 'Quiz'), value: quizCorrect + '/' + QUIZ_BANK.length, tone: 'text-violet-200', hint: t('stem.moonmission.hint_quiz', 'Space knowledge check: five questions after TLI, five after TEI.') },
                { label: t('stem.moonmission.crew_morale', 'Crew morale'), value: crewMorale + '%', tone: crewMorale >= 70 ? 'text-emerald-200' : crewMorale >= 45 ? 'text-amber-200' : 'text-rose-200', hint: t('stem.moonmission.hint_morale', 'Rises or falls with how you handle mission events.') },
                { label: t('stem.moonmission.badges', 'Badges'), value: earnedBadgeCount + '/' + BADGES.length, tone: 'text-sky-200', hint: t('stem.moonmission.hint_badges', 'Achievements unlocked on this flight. All six show in the debrief.') }
              ].map(function(stat) {
                return h('div', { key: stat.label, className: 'rounded-xl bg-white/10 border border-white/10 px-2 py-1.5 sm:px-3 sm:py-2', title: stat.hint },
                  h('div', { className: 'text-[0.5625rem] sm:text-[0.625rem] font-black uppercase text-slate-300 truncate' }, stat.label),
                  h('div', { className: 'text-xs sm:text-sm font-black ' + stat.tone }, stat.value),
                  h('span', { className: 'sr-only' }, stat.hint)
                );
              })
            )
          ),
          // Flight plan: five cards in one row at every width. On a phone the old two-column
          // grid made three rows with an orphan; the status word hides below sm and the
          // card colour carries it (plus aria-label for readers).
          h('div', { className: 'px-3 sm:px-5 pb-3 sm:pb-4 grid grid-cols-5 gap-1 sm:gap-2', 'data-moonmission-flight-plan': 'true' },
            flightPlanGroups.map(function(group) {
              var active = phase < 10 && group.phases.indexOf(phase) >= 0;
              var complete = phase >= 10 || group.phases[group.phases.length - 1] < phase;
              var statusText = active ? t('stem.moonmission.active', 'Active') : complete ? t('stem.moonmission.complete', 'Complete') : t('stem.moonmission.upcoming', 'Upcoming');
              return h('div', { key: group.id, 'aria-label': group.label + ': ' + statusText, title: group.label + ': ' + statusText,
                className: 'rounded-xl border px-1 py-1.5 sm:px-3 sm:py-2 text-center sm:text-left min-w-0 ' + (active ? 'bg-cyan-400/15 border-cyan-300/40 text-cyan-100' : complete ? 'bg-emerald-400/10 border-emerald-300/30 text-emerald-100' : 'bg-white/5 border-white/10 text-slate-300') },
                h('div', { className: 'text-base sm:text-lg leading-none mb-0.5 sm:mb-1' }, complete ? '\u2713' : group.icon),
                h('div', { className: 'text-[0.625rem] sm:text-[0.6875rem] font-black truncate' }, group.label),
                h('div', { className: 'hidden sm:block text-[0.625rem] opacity-75' }, statusText)
              );
            })
          )
        ),

        // ── Mission Event modal (triggered by advancePhase) ──
        (d.activeEvent && typeof d.activeEvent === 'object' && !Array.isArray(d.activeEvent)
              && Array.isArray(d.activeEvent.stemConcepts) && Array.isArray(d.activeEvent.options)) && h('div', {
          className: 'mb-3 bg-gradient-to-br from-amber-950 to-slate-900 rounded-xl p-4 border border-amber-700/50 shadow-lg',
          role: 'alertdialog', 'aria-label': 'Mission event: ' + d.activeEvent.title,
          tabIndex: -1, 'data-moonmission-event-card': 'true'
        },
          h('div', { className: 'flex items-center gap-2 mb-2' },
            h('span', { className: 'text-2xl' }, d.activeEvent.emoji),
            h('div', null,
              h('h5', { className: 'text-sm font-bold text-amber-300' }, d.activeEvent.title),
              h('div', { className: 'flex gap-1 mt-0.5' },
                d.activeEvent.stemConcepts.map(function(c) {
                  return h('span', { key: c, className: 'px-1.5 py-0.5 rounded-full text-[0.6875rem] bg-sky-500/15 text-sky-300 border border-sky-500/20' }, c);
                })
              )
            )
          ),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed mb-3' }, d.activeEvent.scenario),
          h('div', { className: 'space-y-2' },
            d.activeEvent.options.map(function(opt, oi) {
              var isOptimal = opt.quality === 'optimal';
              return h('button', {
                key: oi,
                onClick: function() { resolveEvent(d.activeEvent, opt); },
                className: 'w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.01] active:scale-[0.99] ' +
                  (diffSettings.showOptimalHint && isOptimal ? 'bg-green-500/10 border-green-500/30 hover:border-green-400/50' : 'bg-white/5 border-white/10 hover:border-amber-400/40 hover:bg-amber-500/5')
              },
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', null, opt.icon),
                  h('span', { className: 'text-xs font-bold text-white' }, opt.label)
                ),
                diffSettings.showEffects && opt.effects && h('div', { className: 'flex flex-wrap gap-2 text-[0.6875rem] mt-1' },
                  Object.keys(opt.effects).map(function(k) {
                    var v = opt.effects[k];
                    return h('span', { key: k, className: v > 0 ? 'text-green-400' : 'text-red-400' },
                      (k === 'morale' ? '\uD83D\uDE0A' : k === 'power' ? '\u26A1' : k === 'time' ? '\u23F1' : '\u2699\uFE0F') + ' ' + (v > 0 ? '+' : '') + v + ' ' + k
                    );
                  })
                )
              );
            })
          ),
          h('details', { className: 'mt-3' },
            h('summary', { className: 'text-[0.6875rem] text-slate-400 cursor-pointer hover:text-slate-200 transition-colors' }, t('stem.moonmission.what_really_happened', '\uD83D\uDCDA What really happened?')),
            h('p', { className: 'text-[0.6875rem] text-indigo-300 mt-1 pl-3 leading-relaxed' }, d.activeEvent.historical)
          )
        ),

        // ── Event Outcome card (shown after resolving an event) ──
        d.eventOutcome && h('div', {
          className: 'mb-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-600/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
          tabIndex: -1, 'data-moonmission-event-outcome': 'true'
        },
          h('div', { className: 'flex items-center gap-2 mb-2' },
            h('span', { className: 'text-lg' }, d.eventOutcome.quality === 'optimal' ? '\u2B50' : d.eventOutcome.quality === 'adequate' ? '\u2705' : '\u26A0\uFE0F'),
            h('span', { className: 'text-sm font-bold ' + (d.eventOutcome.quality === 'optimal' ? 'text-green-400' : d.eventOutcome.quality === 'adequate' ? 'text-yellow-400' : 'text-orange-400') },
              d.eventOutcome.quality === 'optimal' ? 'Excellent Decision!' : d.eventOutcome.quality === 'adequate' ? 'Acceptable Solution' : 'Suboptimal Choice'
            )
          ),
          h('p', { className: 'text-[0.6875rem] text-slate-200 mb-1' }, '\u201C' + d.eventOutcome.label + '\u201D'),
          h('div', { className: 'bg-sky-500/10 rounded-lg p-3 border border-sky-500/20' },
            h('p', { className: 'text-[0.6875rem] text-sky-200 leading-relaxed' }, '\uD83D\uDD2C ' + d.eventOutcome.outcome)
          ),
          d.eventOutcome.impact && h('p', { className: 'mt-2 text-[0.6875rem] font-bold text-amber-200', 'data-moonmission-event-impact': 'true' },
            t('stem.moonmission.flight_impact', 'Flight impact:') + ' ' + d.eventOutcome.impact + '.'),
          h('button', {
            onClick: function() {
              var target = d.eventPhaseTarget;
              upd('eventOutcome', null);
              upd('eventPhaseTarget', null);
              if (typeof target === 'number' && target > phase) setPhase(target);
            },
            className: 'w-full mt-3 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md transition-all'
          }, t('stem.moonmission.continue_mission', '\uD83D\uDE80 Continue Mission'))
        ),

        // ── Quiz overlay (shown between key phases) ──
        showQuiz && quizIdx < QUIZ_BANK.length && h('div', { className: 'mb-3 bg-gradient-to-br from-indigo-950 to-slate-900 rounded-xl p-4 border border-indigo-800', role: 'region', 'aria-label': 'Space knowledge quiz question ' + (quizIdx + 1) },
          h('div', { className: 'flex items-center gap-2 mb-3' },
            h('span', { className: 'text-xl' }, '\uD83E\uDDE0'),
            h('div', null,
              h('h5', { className: 'text-sm font-bold text-indigo-300' }, t('stem.moonmission.space_knowledge_check', 'Space Knowledge Check')),
              h('p', { className: 'text-[0.6875rem] text-slate-400' }, 'Question ' + (quizIdx + 1) + '/' + QUIZ_BANK.length + ' \u2022 ' + quizCorrect + ' correct so far')
            )
          ),
          h('p', { className: 'text-xs text-white font-bold mb-3', id: 'mm-quiz-prompt' }, QUIZ_BANK[quizIdx].q),
          // role="radio" is only valid inside a radiogroup — the options were orphaned
          // radios in a plain div, which reads as loose buttons in a screen reader.
          h('div', { className: 'space-y-1.5 mb-3', role: 'radiogroup', 'aria-labelledby': 'mm-quiz-prompt' },
            QUIZ_BANK[quizIdx].opts.map(function(opt, oi) {
              var isCorrect = oi === QUIZ_BANK[quizIdx].a;
              var isSelected = quizSelectedAnswer === oi;
              var showResult = quizAnswered;
              return h('button', {
                key: oi,
                disabled: quizAnswered,
                'aria-label': 'Answer option ' + (oi + 1) + ': ' + opt + (showResult && isCorrect ? ', correct answer' : showResult && isSelected ? ', incorrect' : ''),
                role: 'radio',
                'aria-checked': isSelected ? 'true' : 'false',
                onClick: function() {
                  upd('quizAnswered', true);
                  upd('quizSelectedAnswer', oi);
                  if (oi === QUIZ_BANK[quizIdx].a) {
                    upd('quizCorrect', function(cur) { return (cur || 0) + 1; });
                    addXP(10);
                    sfxQuizCorrect();
                    if (addToast) addToast('\u2705 Correct! +10 XP', 'success');
                    if (typeof announceToSR === 'function') announceToSR('Correct! ' + QUIZ_BANK[quizIdx].fact);
                  } else {
                    sfxQuizWrong();
                    // Per-distractor feedback: explain why THIS wrong pick is wrong, not just what the right one was.
                    var whyLine = (QUIZ_BANK[quizIdx].why && QUIZ_BANK[quizIdx].why[oi]) || '';
                    if (addToast) addToast('\u274C ' + (whyLine || ('Not quite \u2014 the answer is: ' + QUIZ_BANK[quizIdx].opts[QUIZ_BANK[quizIdx].a])), 'info');
                    if (typeof announceToSR === 'function') announceToSR('Incorrect. ' + whyLine + ' The correct answer is ' + QUIZ_BANK[quizIdx].opts[QUIZ_BANK[quizIdx].a] + '. ' + QUIZ_BANK[quizIdx].fact);
                  }
                },
                className: 'w-full text-left px-3 py-2 rounded-lg text-[0.6875rem] transition-all border ' +
                  (showResult && isCorrect ? 'bg-green-600/20 border-green-500 text-green-300' :
                   showResult && isSelected && !isCorrect ? 'bg-red-600/20 border-red-500 text-red-300' :
                   'bg-white/5 border-white/10 text-slate-300 hover:border-indigo-400/40 hover:bg-indigo-500/10')
              }, (showResult && isCorrect ? '\u2705 ' : showResult && isSelected ? '\u274C ' : '') + opt);
            })
          ),
          quizAnswered && quizSelectedAnswer !== QUIZ_BANK[quizIdx].a && QUIZ_BANK[quizIdx].why && QUIZ_BANK[quizIdx].why[quizSelectedAnswer] &&
            h('div', { className: 'bg-amber-500/10 rounded-lg p-2 border border-amber-500/20 mb-2' },
              h('p', { className: 'text-[0.6875rem] text-amber-300' }, '\uD83D\uDD0D ' + QUIZ_BANK[quizIdx].why[quizSelectedAnswer])
            ),
          quizAnswered && h('div', { className: 'bg-sky-500/10 rounded-lg p-2 border border-sky-500/20 mb-3' },
            h('p', { className: 'text-[0.6875rem] text-sky-300' }, '\uD83D\uDCA1 ' + QUIZ_BANK[quizIdx].fact)
          ),
          quizAnswered && h('button', {
            onClick: function() {
              var nextIdx = quizIdx + 1;
              upd('quizIdx', nextIdx);
              upd('quizAnswered', false);
              upd('quizSelectedAnswer', -1);
              if (nextIdx >= QUIZ_BANK.length || nextIdx % 5 === 0) {   // 5-question blocks: the 'answer 5' quest + Space Scholar badge are actually reachable (was % 2 → only 2 ever shown)
                upd('showQuiz', false);
              }
            },
            className: 'w-full py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700'
          }, quizIdx + 1 < QUIZ_BANK.length ? '\u27A1\uFE0F Next Question' : '\u2705 Continue Mission')
        ),

        // ═══ PHASE 0: MISSION BRIEFING ═══
        phase === 0 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl p-4 text-white' },
            h('div', { className: 'text-center mb-3' },
              h('div', { className: 'text-3xl mb-1' }, '\uD83C\uDF15'),
              h('h4', { className: 'text-lg font-black tracking-wide' }, t('stem.moonmission.mission_briefing_2', 'MISSION BRIEFING')),
              h('p', { className: 'text-xs text-slate-400' }, t('stem.moonmission.apollo_style_lunar_landing_mission', 'Apollo-style lunar landing mission'))
            ),
            h('div', { className: 'bg-white/5 rounded-lg p-3 mb-3 border border-white/10' },
              h('p', { className: 'text-[0.6875rem] text-slate-200 font-bold mb-1' },
                t('stem.moonmission.mission_objectives', '\uD83C\uDFAF MISSION OBJECTIVES'),
                d.aiBriefing && Array.isArray(d.aiBriefing.objectives) && h('span', { className: 'ml-2 text-[0.625rem] text-emerald-300 font-normal' }, t('stem.moonmission.ai_customized', '\u2728 AI-customized'))
              ),
              h('div', { id: 'mm-profile-description', className: 'space-y-1' },
                ((d.aiBriefing && Array.isArray(d.aiBriefing.objectives) && d.aiBriefing.objectives.length >= 3)
                  ? d.aiBriefing.objectives.slice(0, 6).map(function(o) { return String(o).substring(0, 120); })
                  : [
                      'Launch from Kennedy Space Center aboard Saturn V',
                      'Enter lunar orbit and descend to the surface',
                      'Conduct EVA: collect geological samples, deploy instruments',
                      'Return safely to Earth with lunar samples'
                    ]
                ).map(function(obj, i) {
                  return h('div', { key: i, className: 'flex items-start gap-2 text-xs text-slate-300' },
                    h('span', { className: 'text-green-400 mt-0.5' }, '\u25CB'),
                    h('span', null, obj)
                  );
                })
              )
            ),
            // ── How the mission works ──
            // An advance organizer: which phases you watch, which you decide, which you
            // fly. Students used to discover the shape of the mission one phase at a time.
            h('div', { className: 'bg-white/5 rounded-lg p-3 mb-3 border border-white/10', 'data-moonmission-howto': 'true' },
              h('p', { className: 'text-[0.6875rem] text-slate-200 font-bold mb-2' }, t('stem.moonmission.how_it_works', '\uD83E\uDDED HOW THIS MISSION WORKS')),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                [
                  ['\uD83D\uDC40', t('stem.moonmission.how_watch', 'Watch'), t('stem.moonmission.how_watch_desc', 'Launch, lunar orbit, ascent and re-entry play out on their own. The banner under each one turns green when its milestone lands.')],
                  ['\uD83C\uDFAF', t('stem.moonmission.how_decide', 'Decide'), t('stem.moonmission.how_decide_desc', 'Three timing calls are graded: the TLI burn window, the mid-course correction, and the entry angle.')],
                  ['\uD83D\uDD79\uFE0F', t('stem.moonmission.how_fly', 'Fly'), t('stem.moonmission.how_fly_desc', 'You land the Lunar Module by hand. Touchdown speed and fuel left go on your record.')],
                  ['\uD83D\uDEB6', t('stem.moonmission.how_walk', 'Walk'), t('stem.moonmission.how_walk_desc', 'On the surface you collect rocks and deploy an instrument. Quizzes come after TLI and TEI, and the debrief grades it all.')]
                ].map(function(item) {
                  return h('div', { key: item[1], className: 'bg-white/5 rounded-lg p-2 border border-white/10' },
                    h('p', { className: 'text-[0.6875rem] font-bold text-sky-300' }, item[0] + ' ' + item[1]),
                    h('p', { className: 'text-[0.6875rem] text-slate-300 leading-snug mt-0.5' }, item[2]));
                })
              )
            ),
            // \u2500\u2500 Mission profile \u2500\u2500
            // The briefing was the one phase with no picture at all, which is backwards:
            // it is the moment a student most needs to see the shape of the thing. This is
            // the diagram every Apollo crew was briefed against \u2014 the whole arc, with the
            // five burns that define it, and a marker walking the route so the order is
            // unmistakable before anyone touches a control.
            h('div', { className: 'mb-3' },
              h('p', { className: 'text-[0.6875rem] text-slate-200 font-bold mb-2' }, t('stem.moonmission.mission_profile', '\uD83D\uDDFA\uFE0F MISSION PROFILE')),
              h('div', { 'data-allo-fs-stage': 'true', ref: function (node) { if (node && typeof window.__alloStemFsBind === 'function') window.__alloStemFsBind(node.querySelector('[data-allo-fs-btn]'), node); },
                className: 'relative rounded-lg overflow-hidden border border-white/10', style: { height: '190px' } },
                h('button', {
                  type: 'button',
                  'data-allo-fs-btn': 'true',
                  'aria-pressed': 'false',
                  'aria-label': t('stem.moonmission.enter_fullscreen', 'View the mission profile fullscreen'),
                  'data-fs-out': t('stem.moonmission.enter_fullscreen', 'View the mission profile fullscreen'),
                  'data-fs-in': t('stem.moonmission.exit_fullscreen', 'Exit fullscreen mission profile (Escape)'),
                  style: { position: 'absolute', top: 8, right: 8, zIndex: 20, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.55)', color: '#e2e8f0', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
                }, h('span', { 'aria-hidden': 'true' }, '⛶')),
                h('canvas', {
                  'data-profile-canvas': 'true',
                  role: 'img',
                  'data-a11y-static': 'true',
                  'aria-describedby': 'mm-profile-description',
                  'aria-label': t('stem.moonmission.mission_profile_diagram', 'Diagram of the whole mission path. From Earth: launch to low Earth orbit, then the trans-lunar injection burn sends the spacecraft on a three-day coast to the Moon. Lunar orbit insertion captures it into orbit, powered descent lands the Lunar Module, ascent returns it to the Command Module, then the trans-Earth injection burn starts the coast home, ending with atmospheric entry and splashdown.'),
                  style: { width: '100%', height: '100%', display: 'block' },
                  ref: function(cvEl) {
                    if (!cvEl || cvEl._profileInit) return;
                    cvEl._profileInit = true;
                    var ctx = cvEl.getContext('2d');
                    if (!ctx) return;
                    var W = cvEl.offsetWidth || 500, HP = cvEl.offsetHeight || 190;
                    cvEl.width = W * 2; cvEl.height = HP * 2; ctx.scale(2, 2);
                    if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== HP)) { W = nw; HP = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }
                    var tick = 0;

                    // One continuous parameterisation of the route, so a single marker can
                    // walk the whole mission without the segments having to know about
                    // each other. Fractions are eyeballed for readability, NOT to scale \u2014
                    // the real coast dwarfs everything else and would flatten the diagram.
                    function profilePoint(p, geom) {
                      var eX = geom.eX, eY = geom.eY, eR = geom.eR, mX = geom.mX, mY = geom.mY, mR = geom.mR;
                      if (p < 0.14) {                                   // launch + LEO
                        var a = -Math.PI * 0.5 + (p / 0.14) * Math.PI * 3;
                        var rr = eR + 12;
                        return { x: eX + Math.cos(a) * rr, y: eY + Math.sin(a) * rr * 0.55 };
                      }
                      if (p < 0.46) {                                   // trans-lunar coast
                        var q = (p - 0.14) / 0.32;
                        var sx = eX + eR + 12, sy = eY;
                        var cx1 = (eX + mX) * 0.5, cy1 = eY - (eY - mY) - 46;
                        var ex1 = mX - mR - 10, ey1 = mY + mR * 0.4;
                        var om = 1 - q;
                        return { x: om * om * sx + 2 * om * q * cx1 + q * q * ex1,
                                 y: om * om * sy + 2 * om * q * cy1 + q * q * ey1 };
                      }
                      if (p < 0.62) {                                   // lunar orbit (2 loops)
                        var b = Math.PI * 0.85 + ((p - 0.46) / 0.16) * Math.PI * 4;
                        var mr = mR + 17;                               // wide enough to read as an orbit, not a smudge
                        return { x: mX + Math.cos(b) * mr, y: mY + Math.sin(b) * mr * 0.62 };
                      }
                      if (p < 0.94) {                                   // trans-Earth coast
                        var q2 = (p - 0.62) / 0.32;
                        var sx2 = mX - mR - 10, sy2 = mY + mR * 0.4;
                        var cx2 = (eX + mX) * 0.5, cy2 = eY + 58;
                        var ex2 = eX + eR + 10, ey2 = eY + 6;
                        var om2 = 1 - q2;
                        return { x: om2 * om2 * sx2 + 2 * om2 * q2 * cx2 + q2 * q2 * ex2,
                                 y: om2 * om2 * sy2 + 2 * om2 * q2 * cy2 + q2 * q2 * ey2 };
                      }
                      var q3 = (p - 0.94) / 0.06;                       // entry
                      return { x: eX + eR + 10 - q3 * (eR + 6), y: eY + 6 - q3 * 4 };
                    }

                    function drawProfile() {
                      if (_mmAnimPaused && tick > 0) { if (document.contains(cvEl)) requestAnimationFrame(drawProfile); return; }
                      tick++;
                      ctx.clearRect(0, 0, W, HP);
                      ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, W, HP);
                      drawStarfield(ctx, W, HP, tick, 55);

                      var geom = {
                        eX: Math.max(52, W * 0.16), eY: HP * 0.58, eR: Math.min(22, HP * 0.13),
                        mX: Math.min(W - 44, W * 0.84), mY: HP * 0.3, mR: Math.min(12, HP * 0.08)
                      };

                      // Route first, so both bodies sit on top of it.
                      ctx.save();
                      ctx.strokeStyle = 'rgba(125,211,252,0.4)';
                      ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]);
                      ctx.beginPath();
                      for (var s = 0; s <= 240; s++) {
                        var pt = profilePoint(s / 240, geom);
                        if (s === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
                      }
                      ctx.stroke(); ctx.setLineDash([]);
                      ctx.restore();

                      drawDetailedEarth(ctx, geom.eX, geom.eY, geom.eR, tick);
                      drawDetailedMoon(ctx, geom.mX, geom.mY, geom.mR, 42);

                      // The five burns that define the shape of the mission.
                      // Explicit label offsets: LOI, PDI and TEI all happen within a few
                      // pixels of the Moon, so without them the three captions stack on top
                      // of each other and LOI simply disappears. A leader line keeps each
                      // caption tied to its own dot.
                      var burns = [
                        { p: 0.14, label: 'TLI', dx: 4, dy: -13 },
                        { p: 0.46, label: 'LOI', dx: -22, dy: -13 },
                        { p: 0.55, label: 'PDI', dx: 6, dy: 20 },
                        { p: 0.62, label: 'TEI', dx: 24, dy: -8 },
                        { p: 0.98, label: 'EI', dx: -6, dy: 22 }
                      ];
                      burns.forEach(function(b) {
                        var bp = profilePoint(b.p, geom);
                        var lx = bp.x + b.dx, ly = bp.y + b.dy;
                        ctx.strokeStyle = 'rgba(251,191,36,0.45)'; ctx.lineWidth = 0.8;
                        ctx.beginPath(); ctx.moveTo(bp.x, bp.y); ctx.lineTo(lx, ly + (b.dy < 0 ? 2 : -6)); ctx.stroke();
                        ctx.fillStyle = '#fbbf24';
                        ctx.beginPath(); ctx.arc(bp.x, bp.y, 2.6, 0, Math.PI * 2); ctx.fill();
                        ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
                        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(5,7,15,0.92)';
                        ctx.strokeText(b.label, lx, ly);
                        ctx.fillStyle = '#fcd34d';
                        ctx.fillText(b.label, lx, ly);
                      });

                      // Marker walking the route.
                      var prog = (tick % 900) / 900;
                      var cur = profilePoint(prog, geom);
                      ctx.save();
                      ctx.shadowColor = 'rgba(125,211,252,0.9)'; ctx.shadowBlur = 8;
                      ctx.fillStyle = '#e0f2fe';
                      ctx.beginPath(); ctx.arc(cur.x, cur.y, 3.1, 0, Math.PI * 2); ctx.fill();
                      ctx.restore();

                      // Name the leg the marker is on.
                      var legName = prog < 0.14 ? 'Launch + Earth orbit'
                        : prog < 0.46 ? 'Trans-lunar coast \u2014 3 days'
                        : prog < 0.62 ? 'Lunar orbit, descent + ascent'
                        : prog < 0.94 ? 'Trans-Earth coast \u2014 3 days'
                        : 'Re-entry + splashdown';
                      ctx.font = 'italic 10px system-ui'; ctx.textAlign = 'center';
                      ctx.fillStyle = 'rgba(165,180,252,0.95)';
                      ctx.fillText(legName, W * 0.5, HP - 8);
                      ctx.font = '8px system-ui'; ctx.fillStyle = 'rgba(148,163,184,0.7)';
                      ctx.fillText('Distances not to scale', W * 0.5, 12);

                      if (document.contains(cvEl)) requestAnimationFrame(drawProfile);
                    }
                    drawProfile();
                  }
                })
              ),
              // The five burn labels on the diagram, spelled out. They were bare acronyms
              // with no expansion anywhere a sighted student could read.
              h('div', { className: 'mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[0.625rem] text-slate-300', 'data-moonmission-burn-legend': 'true' },
                [
                  ['TLI', t('stem.moonmission.burn_tli', 'Trans-Lunar Injection: the burn that leaves Earth orbit')],
                  ['LOI', t('stem.moonmission.burn_loi', 'Lunar Orbit Insertion: slowing down so the Moon captures you')],
                  ['PDI', t('stem.moonmission.burn_pdi', 'Powered Descent Initiation: the lander starts its landing burn')],
                  ['TEI', t('stem.moonmission.burn_tei', 'Trans-Earth Injection: the burn that starts the trip home')],
                  ['EI', t('stem.moonmission.burn_ei', 'Entry Interface: where the atmosphere begins, about 122 km up')]
                ].map(function(b) {
                  return h('span', { key: b[0] }, h('b', { className: 'text-amber-300' }, b[0] + ' '), b[1]);
                })
              )
            ),
            h('div', { className: 'mb-3' },
              h('p', { className: 'text-[0.6875rem] text-slate-200 font-bold mb-2' }, t('stem.moonmission.your_crew', '\uD83D\uDC68\u200D\uD83D\uDE80 YOUR CREW')),
              h('div', { className: 'grid grid-cols-3 gap-2' },
                CREW_ROLES.map(function(crew, i) {
                  return h('div', { key: i, className: 'bg-white/5 rounded-lg p-2 border border-white/10 text-center' },
                    h('div', { className: 'text-lg mb-0.5' }, i === 0 ? '\uD83E\uDDD1\u200D\uD83D\uDE80' : i === 1 ? '\uD83D\uDC68\u200D\uD83D\uDE80' : '\uD83D\uDC69\u200D\uD83D\uDE80'),
                    h('p', { className: 'text-[0.6875rem] font-bold text-indigo-300' }, crew.role),
                    h('p', { className: 'text-[0.6875rem] text-slate-400' }, crew.name),
                    h('p', { className: 'text-[0.6875rem] text-slate-200 mt-1' }, crew.tasks)
                  );
                })
              )
            ),
            // Difficulty selector
            h('div', { className: 'mb-3', role: 'radiogroup', 'aria-label': t('stem.moonmission.mission_difficulty_selection', 'Mission difficulty selection') },
              h('p', { className: 'text-[0.6875rem] text-slate-200 font-bold mb-2', id: 'difficulty-label' }, t('stem.moonmission.mission_difficulty', '\uD83C\uDFAE MISSION DIFFICULTY')),
              h('div', { className: 'grid grid-cols-3 gap-2' },
                Object.keys(DIFFICULTIES).map(function(key) {
                  var diff = DIFFICULTIES[key];
                  var isSelected = difficulty === key;
                  return h('button', {
                    key: key,
                    role: 'radio',
                    'aria-checked': isSelected ? 'true' : 'false',
                    onClick: function() { upd('difficulty', key); },
                    className: 'rounded-lg p-2 border text-center transition-all ' +
                      (isSelected ? 'bg-indigo-600/30 border-indigo-500 ring-1 ring-indigo-400' : 'bg-white/5 border-white/10 hover:border-indigo-400/40')
                  },
                    h('div', { className: 'text-lg', 'aria-hidden': 'true' }, diff.icon),
                    h('p', { className: 'text-[0.6875rem] font-bold ' + (isSelected ? 'text-indigo-300' : 'text-slate-300') }, diff.label),
                    h('p', { className: 'text-[0.6875rem] text-slate-400' }, diff.desc)
                  );
                })
              )
            ),
            glossaryPanel('mb-3'),
            h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20 mb-3' },
              h('p', { className: 'text-[0.6875rem] text-indigo-300' }, '\uD83D\uDCA1 ' + apolloFact())
            ),
            // AI-customize briefing — pulls in teacher's source text and regenerates objectives,
            // quiz questions, and sample descriptions tied to that content.
            callGemini && sourceText && sourceText.trim().length > 120 && h('div', { className: 'bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/30 mb-3' },
              h('p', { className: 'text-[0.6875rem] text-emerald-300 font-bold mb-1' }, d.aiBriefing ? '\u2728 AI-customized briefing active' : '\uD83E\uDDE0 Customize with your source text'),
              h('p', { className: 'text-[0.6875rem] text-emerald-200/80 mb-2' }, d.aiBriefing
                ? 'Objectives, quiz, and sample facts are tied to your uploaded text.'
                : 'Generate mission objectives, quiz questions, and sample descriptions from the text you\'ve loaded (\u223C' + Math.round(sourceText.length / 100) * 100 + ' chars available). Adds ~10-15 sec.'),
              h('button', {
                disabled: !!d.aiBriefingLoading,
                'aria-busy': d.aiBriefingLoading ? 'true' : 'false',
                onClick: function() {
                  if (d.aiBriefingLoading) return;
                  upd('aiBriefingLoading', true);
                  var gradeHint = gradeLevel ? 'Target grade: ' + gradeLevel + '. ' : '';
                  var prompt = 'You are designing a Moon Mission space-exploration simulator for a student. Customize the mission content using this source text as inspiration.\n\n' +
                    gradeHint + 'Source text (first 3000 chars):\n"""\n' + sourceText.substring(0, 3000) + '\n"""\n\n' +
                    'Return ONLY a JSON object with this EXACT structure (no prose, no code fences):\n' +
                    '{\n' +
                    '  "objectives": ["4 short mission-phase objectives (one per line, 50-90 chars each, imperative verbs)"],\n' +
                    '  "quiz": [\n' +
                    '    {"q": "question text", "opts": ["A","B","C","D"], "a": 0, "fact": "1-sentence explanation"}\n' +
                    '  ],\n' +
                    '  "samples": [\n' +
                    '    {"name": "short sample name", "desc": "1-sentence description tying to source text", "fact": "1 educational fact", "xp": 15}\n' +
                    '  ]\n' +
                    '}\n' +
                    'Constraints: 4 objectives, 6 quiz questions (mix of space science and source-text concepts), 8 sample descriptions. All content must be accurate and age-appropriate.';
                  callGemini(prompt, true).then(function(raw) {
                    try {
                      var cleaned = String(raw || '').trim();
                      if (cleaned.indexOf('```') !== -1) { cleaned = cleaned.split('```')[1] || cleaned; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.substring(cleaned.indexOf('\n') + 1); }
                      var parsed = JSON.parse(cleaned);
                      if (!parsed || !Array.isArray(parsed.objectives) || !Array.isArray(parsed.quiz) || !Array.isArray(parsed.samples)) throw new Error('malformed');
                      setLabToolData(function(prev) {
                        return Object.assign({}, prev, { moonMission: Object.assign({}, (prev && prev.moonMission) || {}, {
                          aiBriefing: parsed,
                          aiBriefingLoading: false
                        })});
                      });
                      if (addToast) addToast('\u2728 Mission customized from your source text!', 'success');
                      if (typeof announceToSR === 'function') announceToSR('Mission customized with your source content. Objectives, quiz, and samples updated.');
                    } catch (e) {
                      upd('aiBriefingLoading', false);
                      if (addToast) addToast('Couldn\'t parse AI response \u2014 using default briefing.', 'error');
                    }
                  }).catch(function() {
                    upd('aiBriefingLoading', false);
                    if (addToast) addToast('Couldn\'t reach AI \u2014 using default briefing.', 'error');
                  });
                },
                className: 'w-full py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-all disabled:opacity-60'
              }, d.aiBriefingLoading
                ? '\u231B Customizing mission\u2026'
                : (d.aiBriefing ? '\uD83D\uDD04 Regenerate from source text' : '\u2728 Customize from my source text'))
            )
          ),
          // Max Q comes about two seconds into the flight: too soon to read and answer
          // there, so it is asked before launch and answered during it.
          h('div', { className: 'mb-3' }, predictCard('launch_maxq', false)),
          h('button', {
            // Each phase's action button is named by its visible text, so voice control can
            // say what it sees (WCAG 2.5.3); the fuller line is its title, which a screen
            // reader reads as the description.
            title: 'Begin Moon mission. Proceed to launch phase. Difficulty: ' + DIFFICULTIES[difficulty].label,
            onClick: function() {
              setPhase(1);
              upd('missionStartTime', Date.now());
              upd('missionPausedAt', 0);
              upd('missionPausedTotal', 0);
              log('\uD83D\uDCCB Mission briefing complete (' + DIFFICULTIES[difficulty].label + ' difficulty)' + (d.aiBriefing ? ' \u2014 AI customized' : ''));
              addXP(10);
              if (addToast) addToast('\uD83D\uDE80 Mission authorized! Difficulty: ' + DIFFICULTIES[difficulty].label, 'success');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg transition-all hover:scale-[1.01]'
          }, t('stem.moonmission.begin_mission_proceed_to_launch', '\uD83D\uDE80 Begin Mission \u2014 Proceed to Launch'))
        ),

        // ═══ PHASE 1: LAUNCH ═══
        phase === 1 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            // Launch canvas
            h('div', { className: 'relative', style: { height: '400px' } },
              h('canvas', { 
                'data-launch-canvas': 'true',
                role: 'img',
                'data-a11y-static': 'true',
                'aria-describedby': 'mm-launch-description',
                'aria-label': t('stem.moonmission.launch_canvas_alt', 'Animated Saturn V launch, drawn to the rocket\'s real proportions. After a 5-second countdown it lifts off from the Florida coast, climbs through the clouds and pitches over into a gravity turn out over the Atlantic, trading straight-up climb for the sideways speed that orbit needs. As it climbs, the sky darkens from blue to black, the horizon sinks and curves, and the exhaust plume balloons as the air thins. It passes Mach 1 inside a white condensation cloud. A gauge shows how hard the air is pushing on the rocket, and a callout marks Max Q, the moment it pushes hardest. The first and second stages each drop away and tumble behind it, the escape tower flies off, and the third stage reaches orbit. Shows altitude, velocity, pitch, G-force, the push of the air and stage.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._launchInit) return;
                  cvEl._launchInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, H = cvEl.offsetHeight || 400;
                  cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== H)) { W = nw; H = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  var countdown = 300; // 5 seconds at 60fps
                  var launched = false;
                  var altitude = 0;
                  var velocity = 0;
                  var gForce = 1;
                  var stage = 1;
                  var maxAlt = 0;
                  var shakeIntensity = 0;
                  var jettisoned = [];   // spent stages + escape tower, falling or flying clear
                  var stagedAt = -99, lesOn = true, frameShift = 0, launchedAt = 0;
                  var mach1At = -1, maxQAt = -1, lastQ = 0, machNow = 0, peakQ = 0, maxQKm = 0;   // from the display model
                  var _lastLaunchState = null;   // throttle the readiness publish
                  // Deck + umbilical tower, `lift` px lower: the flight view scrolls them
                  // away under the rising stack instead of cutting straight to open sky.
                  // The tower stands two and a half body radii off the vehicle's side.
                  function drawPadStructures(lift) {
                    var towerX = W * 0.5 + 10.1 * H * 0.58 / MM_SATURN_V_H / 2 * 3.5;
                    ctx.fillStyle = '#4b5563';
                    ctx.fillRect(W * 0.40, H * 0.795 + lift, W * 0.22, H * 0.03);
                    // Launch umbilical tower — lattice, not a plain grey bar
                    ctx.fillStyle = '#6b7280';
                    ctx.fillRect(towerX, H * 0.18 + lift, 7, H * 0.62);
                    ctx.strokeStyle = 'rgba(156,163,175,0.75)';
                    ctx.lineWidth = 1.5;
                    for (var lt = 0; lt < 6; lt++) {
                      var ly = H * (0.22 + lt * 0.1) + lift;
                      ctx.beginPath(); ctx.moveTo(towerX, ly); ctx.lineTo(towerX + 7, ly + H * 0.05); ctx.stroke();
                      ctx.beginPath(); ctx.moveTo(towerX + 7, ly); ctx.lineTo(towerX, ly + H * 0.05); ctx.stroke();
                    }
                    return towerX;
                  }

                  // The scene behind the stack. The sky comes from the air still overhead
                  // (mmSkyAt). The horizon stays at eye level and sinks as the camera climbs
                  // (dip = acos(R / (R + h))); only high up does the Earth look round.
                  // Kennedy is seen from the south: the Atlantic to the east (right), where
                  // the stack will fly, the coast running north to the horizon, the Vehicle
                  // Assembly Building 5.6 km off. A thing D pad-distances away sits
                  // (0.2H + lift) / D below the horizon, so near things drop away fast and
                  // far things slowly; the coast swings under and behind as the stack runs east.
                  var MM_LAUNCH_CLOUDS = [[1.6, 0.16, 1], [2.4, 0.86, 0.8], [3.8, 0.3, 1.2], [5.5, 0.7, 1.05], [8, 0.1, 0.9]];   // [km up, x, nearness]
                  function drawLaunchScene(altKm, lift) {
                    var sky = mmSkyAt(altKm), cx = W * 0.5, drop = H * 0.2 + lift;
                    var hz = H * 0.6 + H * 0.87 * Math.acos(6371 / (6371 + Math.max(0, altKm)));
                    var sg = ctx.createLinearGradient(0, 0, 0, hz);
                    sg.addColorStop(0, sky.top); sg.addColorStop(1, sky.bottom);
                    ctx.fillStyle = sg; ctx.fillRect(-20, -20, W + 40, H + 40);
                    if (sky.stars > 0) { ctx.save(); ctx.globalAlpha = sky.stars; drawStarfield(ctx, W, H, tick, 120); ctx.restore(); }
                    // The Sun: a wide glow while there is air to scatter it, a hard disc above the air.
                    var sunX = W * 0.74, sunY = H * 0.13, halo = H * (0.08 + 0.32 * sky.haze);
                    var sunG = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, halo);
                    sunG.addColorStop(0, 'rgba(255,253,240,1)'); sunG.addColorStop(Math.min(0.5, 7 / halo), 'rgba(255,247,222,0.75)'); sunG.addColorStop(1, 'rgba(255,247,222,0)');
                    ctx.fillStyle = sunG; ctx.beginPath(); ctx.arc(sunX, sunY, halo, 0, Math.PI * 2); ctx.fill();
                    // The Earth: the air seen edge-on along the limb, then the surface.
                    var Rs = W * (2.4 + 60 * Math.pow(1 - Math.min(1, altKm / 120), 3)), ecy = hz + Rs;
                    if (sky.stars > 0) {
                      var limbG = ctx.createRadialGradient(cx, ecy, Rs, cx, ecy, Rs + H * 0.05);
                      limbG.addColorStop(0, 'rgba(147,197,253,' + (0.9 * sky.stars) + ')'); limbG.addColorStop(1, 'rgba(147,197,253,0)');
                      ctx.fillStyle = limbG; ctx.beginPath(); ctx.arc(cx, ecy, Rs + H * 0.05, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.save();
                    ctx.beginPath(); ctx.arc(cx, ecy, Rs, 0, Math.PI * 2); ctx.clip();
                    var seaG = ctx.createLinearGradient(0, hz, 0, H);
                    seaG.addColorStop(0, sky.limb); seaG.addColorStop(0.12, '#5b88ad'); seaG.addColorStop(1, '#16406a');
                    ctx.fillStyle = seaG; ctx.fillRect(-20, hz - 4, W + 40, H - hz + 40);
                    // Cloud tops far below, flattened by the low angle, sliding back as the stack runs east.
                    if (altKm > 12) {
                      ctx.fillStyle = 'rgba(248,250,252,' + Math.min(0.28, (altKm - 12) / 80) + ')';
                      for (var cp = 0; cp < 16; cp++) {
                        var cv = (cp * 0.382 + 0.1) % 1, cpy = hz + (H - hz) * (0.04 + 0.96 * cv * cv), cnear = (cpy - hz) / (H - hz + 1);
                        var cu = ((cp * 0.618 - altKm * (0.004 + 0.02 * cnear)) % 1 + 1) % 1, crx = 6 + 44 * cnear, cry = 1 + 9 * cnear;
                        for (var cq = 0; cq < 4; cq++) {   // a soft cluster, not one hard disc
                          ctx.beginPath(); ctx.ellipse(W * (cu * 1.3 - 0.15) + (cq - 1.5) * crx * 0.7, cpy + ((cq * 7) % 3 - 1) * cry * 0.4, crx * (0.6 + 0.2 * (cq % 2)), cry * (0.7 + 0.15 * (cq % 3)), 0, 0, Math.PI * 2); ctx.fill();
                        }
                      }
                    }
                    // Florida, fading behind as the stack heads out over the ocean.
                    var landA = 1 - Math.min(1, Math.max(0, (altKm - 25) / 45));
                    if (landA > 0) {
                      var coastDx = W * 1.43 - lift * 0.9;              // where the coast runs, per unit of drop
                      var shoreX = function (y) { return cx + coastDx * (y - hz) / drop; };
                      if (altKm < 30) {                                  // the Sun's glitter path on the water
                        for (var gl = 0; gl < 9; gl++) {
                          var gy = hz + 2 + gl * gl * H * 0.0022, gx = sunX + Math.sin(tick * 0.05 + gl * 1.7) * (3 + gl), gw = 6 + gl * 4;
                          if (gx - gw / 2 < shoreX(gy) + 3 || gy > H) continue;
                          ctx.fillStyle = 'rgba(255,250,228,' + (0.55 - gl * 0.045) + ')';
                          ctx.fillRect(gx - gw / 2, gy, gw, 1 + gl * 0.15);
                        }
                      }
                      ctx.globalAlpha = landA;
                      var landG = ctx.createLinearGradient(0, hz, 0, H);
                      landG.addColorStop(0, sky.limb); landG.addColorStop(0.1, '#7d9563'); landG.addColorStop(1, '#3d6030');
                      ctx.fillStyle = landG;
                      ctx.beginPath(); ctx.moveTo(cx, hz); ctx.lineTo(cx + coastDx * 10, hz + drop * 10);
                      ctx.lineTo(-W * 20, hz + drop * 10); ctx.lineTo(-W * 20, hz - 6); ctx.closePath(); ctx.fill();
                      ctx.globalAlpha = landA * 0.7;
                      ctx.strokeStyle = '#dccfa6'; ctx.lineWidth = 1.5;   // the beach
                      ctx.beginPath(); ctx.moveTo(cx, hz); ctx.lineTo(cx + coastDx * 10, hz + drop * 10); ctx.stroke();
                      ctx.globalAlpha = landA;
                      // Scrub in bands, closer ones lower and thicker: they sweep down as you climb.
                      ctx.fillStyle = 'rgba(34,60,30,0.22)';
                      for (var sb = 0; sb < 10; sb++) {
                        var sbs = 1 / (1.3 + sb * 1.6), sby = hz + drop * sbs;
                        if (sby > H + 4) continue;
                        ctx.fillRect(-10, sby, Math.max(0, shoreX(sby) - 6 + 10), 1 + 5 * sbs);
                      }
                      // The Vehicle Assembly Building, 160 m tall, 14 pad-distances off, and
                      // the crawlerway the stack rode out on. Both are gone from view by
                      // 6 km (the pad scroll lags the real height up there).
                      var vabY = hz + drop / 14, vabH = H * 0.06, vabW = vabH * 1.35, vabX = cx - W * 0.357 - vabW / 2;
                      var vabA = landA * (1 - Math.min(1, Math.max(0, (altKm - 2) / 4)));
                      if (vabY - vabH < H && vabA > 0) {
                        ctx.globalAlpha = vabA;
                        ctx.fillStyle = 'rgba(200,196,188,0.75)';
                        ctx.beginPath(); ctx.moveTo(vabX + vabW * 0.46, vabY); ctx.lineTo(vabX + vabW * 0.54, vabY);
                        ctx.lineTo(cx - W * 0.03 + 4, H * 0.8 + lift); ctx.lineTo(cx - W * 0.03 - 4, H * 0.8 + lift); ctx.closePath(); ctx.fill();
                        ctx.fillStyle = '#d6d3ce'; ctx.fillRect(vabX, vabY - vabH, vabW, vabH);
                        ctx.fillStyle = '#9ca3af'; ctx.fillRect(vabX + vabW * 0.64, vabY - vabH, vabW * 0.36, vabH);   // the shaded side
                        ctx.fillStyle = '#6b7280'; ctx.fillRect(vabX + vabW * 0.22, vabY - vabH * 0.86, vabW * 0.09, vabH * 0.86);   // a high-bay door
                        ctx.fillStyle = '#b91c1c'; ctx.fillRect(vabX + vabW * 0.4, vabY - vabH * 0.8, vabW * 0.14, vabH * 0.2);   // the flag
                        ctx.fillStyle = '#1e3a8a'; ctx.fillRect(vabX + vabW * 0.4, vabY - vabH * 0.8, vabW * 0.06, vabH * 0.1);
                        ctx.globalAlpha = landA;
                      }
                      // Pad 39A's raised hardstand under the deck.
                      if (H * 0.8 + lift < H + 20) {
                        ctx.fillStyle = '#a8a295';
                        ctx.beginPath(); ctx.moveTo(W * 0.28, H * 0.87 + lift); ctx.lineTo(W * 0.35, H * 0.805 + lift);
                        ctx.lineTo(W * 0.67, H * 0.805 + lift); ctx.lineTo(W * 0.74, H * 0.87 + lift); ctx.closePath(); ctx.fill();
                      }
                      ctx.globalAlpha = 1;
                    }
                    ctx.restore();   // end Earth clip
                    // Fair-weather cumulus the stack climbs through: nearer ones are bigger
                    // and sweep past faster, so the climb reads as speed.
                    MM_LAUNCH_CLOUDS.forEach(function (c) {
                      var s = H * 0.045 * c[2], y = hz - (c[0] - altKm) * H * 0.09 * c[2], x = W * c[1] + Math.sin(tick * 0.003 + c[0]) * 6;
                      if (y < -3 * s || y > H + 3 * s) return;
                      ctx.fillStyle = 'rgba(203,213,225,0.9)';   // shaded underside
                      [[-1.5, 0.35, 0.75], [-0.4, 0.3, 1], [0.8, 0.35, 0.85], [1.7, 0.4, 0.6]].forEach(function (p) { ctx.beginPath(); ctx.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, Math.PI * 2); ctx.fill(); });
                      ctx.fillStyle = 'rgba(255,255,255,0.95)';
                      [[-1.5, 0.15, 0.7], [-0.5, -0.15, 1], [0.6, -0.35, 1.1], [1.6, 0.1, 0.65]].forEach(function (p) { ctx.beginPath(); ctx.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, Math.PI * 2); ctx.fill(); });
                    });
                  }

                  // The ascent advances in fixed 1/60 s steps of real time, not one step
                  // per painted frame: the "5-second countdown" used to take 2.5 s on a
                  // 120 Hz screen and 10 s on a machine painting 30 frames a second.
                  var LAUNCH_STEP_MS = 1000 / 60, lastTs = null, stepAcc = 0;
                  function stepLaunch() {
                    tick++;
                    if (countdown > 0) {
                      countdown--;
                      // Beep on each second mark (every 60 steps)
                      if (countdown % 60 === 0 && countdown > 0) sfxCountdown();
                      if (countdown <= 0) { launched = true; launchedAt = tick; shakeIntensity = 8; }
                      return;
                    }
                    if (!launched) return;
                    // The loop counters stop at orbit: the S-IVB shuts down there, and
                    // they used to keep climbing to 49 km/s and 40 g on screen.
                    if (altitude <= 20000) {
                      velocity += 0.15 + (stage === 2 ? 0.1 : 0) + (stage === 3 ? 0.05 : 0);
                      altitude += velocity * 0.5;
                    }
                    var air = mmLaunchDisplay(altitude / 20000);
                    machNow = air.velMs / mmSoundSpeed(air.altKm);
                    if (mach1At < 0 && machNow >= 1) mach1At = tick;
                    var qNow = mmDynamicPressure(air.altKm, air.velMs);
                    if (maxQAt < 0 && qNow < lastQ) {                    // the push has peaked
                      maxQAt = tick; shakeIntensity = Math.max(shakeIntensity, 5); maxQKm = Math.round(air.altKm * 10) / 10;
                      upd('launchMaxQ', { altKm: maxQKm, velMs: Math.round(air.velMs) });
                    }
                    lastQ = qNow; peakQ = Math.max(peakQ, qNow);
                    if (altitude > 2000 && stage === 1) { stage = 2; shakeIntensity = 6; stagedAt = tick; jettisoned.push({ only: ['s1is', 's1'], t0: tick, dir: 1 }); }
                    if (altitude > 8000 && stage === 2) { stage = 3; shakeIntensity = 4; stagedAt = tick; jettisoned.push({ only: ['s4bis', 's2'], t0: tick, dir: 1 }); }
                    // The escape tower is dead weight once the S-II is burning well;
                    // it flies off on its own motor.
                    if (lesOn && stage >= 2 && tick - stagedAt > 90) { lesOn = false; jettisoned.push({ only: ['les'], t0: tick, dir: -1 }); }
                    maxAlt = Math.max(maxAlt, altitude);
                    shakeIntensity *= 0.995;
                  }

                  function drawLaunch(ts) {
                    if (_mmAnimPaused && tick > 0) { lastTs = null; if (document.contains(cvEl)) requestAnimationFrame(drawLaunch); return; }
                    var steps = typeof ts === 'number' ? 0 : 1;   // the first paint steps once; a frame with no previous time has no elapsed time
                    if (typeof ts === 'number' && lastTs !== null) {
                      stepAcc += Math.min(250, Math.max(0, ts - lastTs));   // a stalled tab catches up at most 1/4 s
                      steps = Math.floor(stepAcc / LAUNCH_STEP_MS + 1e-6);
                      stepAcc -= steps * LAUNCH_STEP_MS;
                    }
                    if (typeof ts === 'number') lastTs = ts;
                    for (var si = 0; si < steps; si++) stepLaunch();
                    ctx.clearRect(0, 0, W, H);
                    // Narrate the ascent to the button below (state changes only).
                    var lState = countdown > 0 ? 'countdown'
                      : altitude > 20000 ? 'orbit'
                      : ('stage' + stage);
                    if (lState !== _lastLaunchState) {
                      _lastLaunchState = lState;
                      upd('launchStatus', lState);
                    }

                    // Countdown phase
                    if (countdown > 0) {
                      // Background: the morning sky and the coast at Pad 39A
                      drawLaunchScene(0, 0);
                      // Saturn V standing on the deck in its real proportions.
                      var svH = H * 0.58, svCx = W * 0.5, svTop = H * 0.80 - svH;
                      var svHw = 10.1 * svH / MM_SATURN_V_H / 2;
                      var towerX = drawPadStructures(0);
                      var sv = mmDrawSaturnV(ctx, svCx, svTop, svH, 1);
                      // Swing arms to the hull: crew access at the command module hatch,
                      // then the S-IVB, S-II and S-IC (metres down from the tower tip).
                      ctx.fillStyle = '#9ca3af';
                      [10.9, 27, 46, 72].forEach(function (m) {
                        var ay = svTop + m * sv.k, ax = svCx + mmSaturnHalfWidthAt(sv, ay);
                        ctx.fillRect(ax, ay, towerX - ax, 3);
                      });
                      var bodyX = svCx - svHw, bodyW = svHw * 2;
                      // Pre-launch LOX venting — drifting steam puffs at the pad base
                      for (var vp = 0; vp < 5; vp++) {
                        var vph = (tick * 0.6 + vp * 47) % 60;
                        var vpx = bodyX + bodyW * (vp % 2 === 0 ? -0.35 : 1.35) + Math.sin((tick + vp * 30) * 0.05) * 6;
                        ctx.fillStyle = 'rgba(240,244,248,' + (0.28 * (1 - vph / 60)) + ')';
                        ctx.beginPath();
                        ctx.arc(vpx, H * 0.78 - vph * 0.5, 5 + vph * 0.28, 0, Math.PI * 2);
                        ctx.fill();
                      }
                      // Countdown text
                      var countSec = Math.ceil(countdown / 60);
                      ctx.fillStyle = '#ffffff';
                      ctx.font = 'bold 48px monospace';
                      ctx.textAlign = 'center';
                      ctx.globalAlpha = 0.8 + Math.sin(tick * 0.1) * 0.2;
                      ctx.fillText(countSec > 0 ? 'T-' + countSec : 'LIFTOFF!', W * 0.5, H * 0.15);
                      ctx.globalAlpha = 1;
                      ctx.font = '12px system-ui';
                      var kscW = ctx.measureText('Kennedy Space Center, Florida').width + 16;
                      ctx.fillStyle = 'rgba(15,23,42,0.6)';   // grey straight on the green was ~1.3:1
                      ctx.fillRect(W * 0.5 - kscW / 2, H * 0.95 - 13, kscW, 18);
                      ctx.fillStyle = '#e2e8f0';
                      ctx.fillText('Kennedy Space Center, Florida', W * 0.5, H * 0.95);
                    }

                    // Flight phase
                    if (launched) {
                      var engineOn = altitude <= 20000;
                      var launchShown = mmLaunchDisplay(altitude / 20000);
                      gForce = launchShown.g;

                      // Camera shake
                      var sx = (Math.random() - 0.5) * shakeIntensity;
                      var sy = (Math.random() - 0.5) * shakeIntensity;
                      ctx.save();
                      ctx.translate(sx, sy);

                      // Sky, Earth, coast and clouds for this height (drawLaunchScene).
                      drawLaunchScene(launchShown.altKm, altitude * 1.2);

                      // ── Saturn V Rocket (enhanced detail) ──
                      // ── Gravity turn ──
                      // The stack used to climb vertically for the entire ascent, which is
                      // the one thing a launch definitely does not do. Getting to orbit is
                      // about going FAST SIDEWAYS, not high: the vehicle pitches over
                      // shortly after tower clear and spends most of the burn tipping
                      // toward the horizon, trading altitude for orbital velocity. Drawn as
                      // a pitch that grows with altitude plus real downrange drift, so the
                      // shape of the trajectory is visible rather than asserted.
                      var pitchTurn = Math.min(1.15, Math.max(0, (altitude - 400) / 11000) * 1.15);
                      var downrange = Math.min(W * 0.2, Math.max(0, (altitude - 400) / 20000) * W * 0.3);
                      // Liftoff: the camera holds the pad framing while the deck and
                      // tower drop away below, then eases back to the ascent view.
                      var lift = altitude * 1.2;
                      if (lift < H) {
                        var groundY = H * 0.80 + lift;
                        drawPadStructures(lift);
                        // Exhaust thrown sideways out of the flame trench.
                        var spread = Math.min(1, (tick - launchedAt) / 60);
                        for (var ci = 0; ci < 12; ci++) {
                          ctx.fillStyle = 'rgba(236,239,243,' + (0.8 * (1 - ci / 13)) + ')';
                          [-1, 1].forEach(function (sd) {
                            ctx.beginPath();
                            ctx.arc(W * 0.5 + sd * (12 + ci * (6 + 26 * spread)), groundY - 3 - ci * ci * 0.35 * spread, 7 + ci * 2.2 * spread + 5 * spread, 0, Math.PI * 2);
                            ctx.fill();
                          });
                        }
                      }
                      var zoom = Math.min(1, Math.max(0, (lift - H * 0.3) / (H * 0.7)));
                      zoom = zoom * zoom * (3 - 2 * zoom);
                      var rocketX = W * 0.5 + downrange, rocketY = H * (0.51 + 0.04 * zoom);
                      // Real proportions, shedding stages: the camera eases to keep what
                      // is left of the stack centred as the bottom falls away.
                      var fullHF = H * 0.58 + (Math.min(170, H * 0.42) - H * 0.58) * zoom;
                      var svTopF = rocketY - fullHF / 2 + frameShift;
                      ctx.save();                                   // ── vehicle attitude frame ──
                      ctx.translate(rocketX, rocketY);
                      ctx.rotate(pitchTurn);
                      ctx.translate(-rocketX, -rocketY);
                      // Spent pieces, drawn first so the vehicle and its flame are in
                      // front: a stage falls back along the axis, tumbling, and fades;
                      // the escape tower pulls ahead and off to the side.
                      var svF0k = fullHF / MM_SATURN_V_H;
                      jettisoned = jettisoned.filter(function (j) { return tick - j.t0 < 150; });
                      jettisoned.forEach(function (j) {
                        var dt = tick - j.t0;
                        var off = j.dir > 0 ? 0.6 * dt + 0.012 * dt * dt : -(1.2 * dt + 0.02 * dt * dt);
                        var jcy = svTopF + fullHF * mmSaturnSpanCentre(j.only) + off;
                        ctx.save();
                        ctx.globalAlpha = Math.max(0, 1 - dt / 150);
                        ctx.translate(rocketX - j.dir * 0.25 * dt, jcy);
                        ctx.rotate(j.dir * 0.006 * dt);
                        ctx.translate(-rocketX, -jcy);
                        mmDrawSaturnV(ctx, rocketX, svTopF + off, fullHF, 1, { only: j.only });
                        if (j.dir < 0 && dt < 45) {   // the tower's own motor, so the jettison is seen
                          var lesY = svTopF + off + fullHF * 0.045;
                          var lesG = ctx.createRadialGradient(rocketX, lesY, 0, rocketX, lesY, 7 * svF0k);
                          lesG.addColorStop(0, 'rgba(255,237,160,' + (1 - dt / 45) + ')');
                          lesG.addColorStop(1, 'rgba(251,146,60,0)');
                          ctx.fillStyle = lesG;
                          ctx.beginPath(); ctx.arc(rocketX, lesY, 7 * svF0k, 0, Math.PI * 2); ctx.fill();
                        }
                        ctx.restore();
                      });
                      var svF = mmDrawSaturnV(ctx, rocketX, svTopF, fullHF, stage, { les: lesOn });
                      // Near Mach 1 the air round the vehicle drops in pressure so fast that
                      // its water vapour condenses: the white shroud in every Saturn V film.
                      var vapour = machNow > 0.85 && machNow < 1.5 ? Math.max(0, 1 - Math.abs(machNow - 1.1) / 0.4) : 0;
                      if (vapour > 0) {
                        svF.sections.forEach(function(sec) {
                          if (sec.id !== 's1is' && sec.id !== 'sla') return;
                          var w = Math.max(sec.w0, sec.w1), vy = sec.y0, flare = w * (sec.id === 'sla' ? 1.3 : 1.7);
                          var vg = ctx.createLinearGradient(0, vy, 0, vy + flare);
                          vg.addColorStop(0, 'rgba(248,250,252,' + (0.75 * vapour) + ')');
                          vg.addColorStop(1, 'rgba(248,250,252,0)');
                          ctx.fillStyle = vg;
                          ctx.beginPath();
                          ctx.moveTo(rocketX - w * 0.55, vy); ctx.lineTo(rocketX + w * 0.55, vy);
                          ctx.lineTo(rocketX + w * 1.25, vy + flare); ctx.lineTo(rocketX - w * 1.25, vy + flare);
                          ctx.closePath(); ctx.fill();
                        });
                      }
                      frameShift += ((fullHF - (svF.nozzle - svTopF)) / 2 - frameShift) * 0.04;
                      var rBase = svF.nozzle;
                      // ── Engine flame (dual envelope + Mach diamonds + particles) ──
                      if (engineOn && tick - stagedAt > 20) {   // dark between cutoff and the next stage lighting
                      // The plume balloons as the air thins (mmPlumeGrow), fainter as it spreads.
                      var grow = mmPlumeGrow(launchShown.altKm), fade = 1 / Math.sqrt(grow);
                      var flameLen = (svF.k * (17 + Math.random() * 8) + velocity * 1.0) * (1 + 0.35 * (grow - 1));   // scales with the stack, which is bigger on the pad
                      var flameW = svF.k * (stage === 3 ? 2.6 : 5.5) + velocity * 0.15;   // across the nozzles
                      // The F-1s burned kerosene: a bright, sooty orange plume. The J-2s
                      // above them burned hydrogen, whose flame is nearly invisible, so
                      // stages 2 and 3 get a faint blue plume and no smoke.
                      var kero = stage === 1;
                      var alphaAt = function (a) { return Math.round(a * fade * 100) / 100; };
                      // Exhaust trail, behind the flame: a smooth column whose billows stream
                      // back at the climb rate (the old puffs were re-randomised every frame,
                      // so they flickered). It thins out with the air.
                      if (kero) {
                        var trailA = 0.35 * (1 - 0.8 * mmSkyAt(launchShown.altKm).stars);
                        var tTop = rBase + flameLen * 0.8, tLen = H * 1.6, tw0 = flameW * Math.min(grow, 2) * 0.55;
                        var trailG = ctx.createLinearGradient(0, tTop, 0, tTop + tLen);
                        trailG.addColorStop(0, 'rgba(226,232,240,' + trailA + ')'); trailG.addColorStop(1, 'rgba(226,232,240,0)');
                        ctx.fillStyle = trailG;
                        ctx.beginPath(); ctx.moveTo(rocketX - tw0, tTop); ctx.lineTo(rocketX + tw0, tTop);
                        ctx.lineTo(rocketX + tw0 * 3, tTop + tLen); ctx.lineTo(rocketX - tw0 * 3, tTop + tLen); ctx.closePath(); ctx.fill();
                        for (var bi = 0; bi < 9; bi++) {
                          var bp = ((altitude * 0.6 + bi * 48) % 432) / 432;   // 0 at the flame, 1 far behind
                          var bw = tw0 * (1 + 2 * bp);
                          ctx.fillStyle = 'rgba(241,245,249,' + (trailA * 0.8 * (1 - bp)) + ')';
                          ctx.beginPath(); ctx.arc(rocketX + Math.sin(bi * 2.1) * bw * 0.35, tTop + bp * tLen * 0.7, bw * 0.75, 0, Math.PI * 2); ctx.fill();
                        }
                      }
                      // Outer envelope: from the nozzles, swelling to its full width a third of the way down.
                      var outerGrad = ctx.createLinearGradient(rocketX, rBase, rocketX, rBase + flameLen);
                      outerGrad.addColorStop(0, kero ? 'rgba(255,120,0,' + alphaAt(0.8) + ')' : 'rgba(191,219,254,' + alphaAt(0.3) + ')');
                      outerGrad.addColorStop(0.4, kero ? 'rgba(255,60,0,' + alphaAt(0.5) + ')' : 'rgba(129,140,248,' + alphaAt(0.12) + ')');
                      outerGrad.addColorStop(1, kero ? 'rgba(200,0,0,0)' : 'rgba(99,102,241,0)');
                      ctx.fillStyle = outerGrad;
                      ctx.beginPath();
                      ctx.moveTo(rocketX - flameW, rBase);
                      ctx.bezierCurveTo(rocketX - flameW * grow, rBase + flameLen * 0.3, rocketX - flameW * grow * 0.7, rBase + flameLen * 0.75, rocketX, rBase + flameLen);
                      ctx.bezierCurveTo(rocketX + flameW * grow * 0.7, rBase + flameLen * 0.75, rocketX + flameW * grow, rBase + flameLen * 0.3, rocketX + flameW, rBase);
                      ctx.fill();
                      // Inner core (white-yellow, narrow)
                      var innerGrad = ctx.createLinearGradient(rocketX, rBase, rocketX, rBase + flameLen * 0.7);
                      innerGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
                      innerGrad.addColorStop(0.3, kero ? 'rgba(255,240,100,0.7)' : 'rgba(224,231,255,0.4)');
                      innerGrad.addColorStop(1, kero ? 'rgba(255,180,0,0)' : 'rgba(199,210,254,0)');
                      ctx.fillStyle = innerGrad;
                      ctx.beginPath();
                      ctx.moveTo(rocketX - flameW * 0.4, rBase);
                      ctx.quadraticCurveTo(rocketX - flameW * 0.2, rBase + flameLen * 0.3, rocketX, rBase + flameLen * 0.7);
                      ctx.quadraticCurveTo(rocketX + flameW * 0.2, rBase + flameLen * 0.3, rocketX + flameW * 0.4, rBase);
                      ctx.fill();
                      // Mach diamonds (bright spots in the exhaust at high velocity)
                      if (kero && velocity > 5) {
                        ctx.shadowColor = 'rgba(255,240,180,0.9)'; ctx.shadowBlur = 8;
                        ctx.fillStyle = 'rgba(255,255,200,0.6)';
                        for (var md = 0; md < 3; md++) {
                          var mdy = rBase + flameLen * (0.15 + md * 0.18);
                          var mdSize = 2 - md * 0.4;
                          ctx.beginPath(); ctx.arc(rocketX, mdy, mdSize, 0, Math.PI * 2); ctx.fill();
                        }
                        ctx.shadowBlur = 0;
                      }
                      // Exhaust particles (scattered sparks)
                      ctx.globalAlpha = kero ? 0.6 : 0;
                      for (var epi = 0; epi < 6 && kero; epi++) {
                        var epx = rocketX + (Math.random() - 0.5) * flameW * 1.5;
                        var epy = rBase + flameLen * (0.3 + Math.random() * 0.7);
                        var epr = 0.5 + Math.random() * 1.5;
                        ctx.fillStyle = epi < 3 ? 'rgba(255,200,50,0.7)' : 'rgba(255,100,0,0.5)';
                        ctx.beginPath(); ctx.arc(epx, epy, epr, 0, Math.PI * 2); ctx.fill();
                      }
                      ctx.globalAlpha = 1;
                      }   // engineOn
                      ctx.restore(); // ── end vehicle attitude frame (flame + smoke trail
                                     //    stay inside it, so the exhaust follows the nose) ──

                      ctx.restore(); // end shake

                      // HUD overlay
                      ctx.fillStyle = 'rgba(0,0,0,0.5)';
                      ctx.fillRect(8, 8, 150, 108);
                      ctx.fillRect(W - 158, W < 330 ? 124 : 8, 150, 108);   // right box drops under the left on narrow canvases (they collided < ~324px)
                      ctx.font = 'bold 10px monospace';
                      ctx.textAlign = 'left';
                      ctx.fillStyle = '#38bdf8';
                      ctx.fillText('ALTITUDE', 14, 22);
                      ctx.fillStyle = '#ffffff';
                      ctx.font = 'bold 16px monospace';
                      ctx.fillText(launchShown.altKm >= 1 ? launchShown.altKm.toFixed(1) + ' km' : Math.round(launchShown.altKm * 1000) + ' m', 14, 40);
                      ctx.font = 'bold 10px monospace';
                      ctx.fillStyle = '#38bdf8';
                      ctx.fillText('VELOCITY', 14, 56);
                      ctx.fillStyle = '#ffffff';
                      ctx.font = '13px monospace';
                      ctx.fillText(Math.round(launchShown.velMs).toLocaleString('en-US') + ' m/s', 14, 70);
                      ctx.font = 'bold 10px monospace';
                      ctx.fillStyle = '#38bdf8';
                      ctx.fillText('STAGE ' + stage + '/3', 14, 88);
                      // Pitch: 0° is straight up, 90° is flat along the horizon. Watching
                      // this climb is watching the vehicle trade "up" for "sideways", which
                      // is the whole of how you reach orbit.
                      ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 10px monospace';
                      ctx.fillText('PITCH', 14, 104);
                      ctx.fillStyle = '#fff'; ctx.font = '12px monospace';
                      ctx.fillText(Math.round(pitchTurn * 180 / Math.PI) + '° from up', 52, 104);   // '° from vertical' ran past the box edge

                      // G-force meter (right side; follows the narrow-screen drop)
                      ctx.save();
                      if (W < 330) ctx.translate(0, 116);
                      ctx.textAlign = 'right';
                      ctx.font = 'bold 10px monospace';
                      ctx.fillStyle = '#fbbf24';
                      ctx.fillText('G-FORCE', W - 14, 22);
                      ctx.fillStyle = gForce > 4 ? '#ef4444' : gForce > 3 ? '#f59e0b' : '#22c55e';
                      ctx.font = 'bold 20px monospace';
                      ctx.fillText(gForce.toFixed(1) + 'g', W - 14, 44);
                      // G bar
                      ctx.fillStyle = '#1e293b';
                      ctx.fillRect(W - 148, 52, 130, 8);
                      var gPct = Math.min(1, gForce / 6);
                      ctx.fillStyle = gForce > 4 ? '#ef4444' : gForce > 3 ? '#f59e0b' : '#22c55e';
                      ctx.fillRect(W - 148, 52, 130 * gPct, 8);
                      // The push of the air, from the same model as the HUD. The white tick
                      // stays at the highest push so far, so the peak is left behind in view.
                      var qFull = 60000;
                      ctx.textAlign = 'left'; ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#fbbf24';
                      ctx.fillText('AIR PUSH', W - 148, 78);
                      ctx.textAlign = 'right'; ctx.font = '10px monospace'; ctx.fillStyle = '#94a3b8';
                      ctx.fillText('\u00BD\u03C1v\u00B2', W - 14, 78);
                      ctx.fillStyle = '#1e293b'; ctx.fillRect(W - 148, 84, 130, 8);
                      ctx.fillStyle = '#fbbf24'; ctx.fillRect(W - 148, 84, 130 * Math.min(1, lastQ / qFull), 8);
                      if (peakQ > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(W - 149 + 130 * Math.min(1, peakQ / qFull), 81, 2, 14); }
                      if (maxQAt > 0) { ctx.textAlign = 'left'; ctx.font = '10px monospace'; ctx.fillStyle = '#e2e8f0'; ctx.fillText('peak at ' + maxQKm.toFixed(1) + ' km', W - 148, 108); }
                      ctx.restore();

                      // Mach 1 and Max Q, placed by the model (above), explained in words.
                      if (stage === 1 && mach1At > 0) {
                        // Below the HUD boxes (they end 116px down), and below both on a
                        // narrow canvas, where the right box drops under the left.
                        var bnY = W < 330 ? 252 : Math.max(H * 0.3, 136);
                        var qFresh = maxQAt > 0 && tick - maxQAt < 30;   // "now" only while the push is near its peak
                        ctx.textAlign = 'center';
                        ctx.font = '11px system-ui';
                        var bnW = Math.min(W - 16, ctx.measureText('Still speeding up, but the air thins faster, so the push peaks here.').width + 24);
                        ctx.fillStyle = 'rgba(15,23,42,0.55)';   // readable over the vehicle and the sky
                        ctx.fillRect(W * 0.5 - bnW / 2, bnY - 16, bnW, maxQAt > 0 ? 60 : 22);
                        ctx.fillStyle = '#e0f2fe'; ctx.font = 'bold 13px system-ui';
                        ctx.fillText('MACH ' + machNow.toFixed(1) + ' \u2014 faster than sound', W * 0.5, bnY, W - 24);
                        if (maxQAt > 0) {
                          ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 13px system-ui';
                          ctx.fillText(qFresh ? 'MAX Q \u2014 the air is pushing hardest now' : 'MAX Q passed at ' + maxQKm.toFixed(1) + ' km', W * 0.5, bnY + 20, W - 24);
                          ctx.font = '11px system-ui'; ctx.fillStyle = '#e2e8f0';
                          ctx.fillText(qFresh ? 'Still speeding up, but the air thins faster, so the push peaks here.' : 'The air thins faster than the speed builds, so the push is falling.', W * 0.5, bnY + 37, W - 24);
                        }
                      }
                      // Stage separation notification. It used to key off an altitude
                      // window that the vehicle crossed in two to four frames, so it
                      // flashed for about a fifteenth of a second, and it read "STAGE 0"
                      // or "STAGE 1" on the frames before the counter ticked over.
                      if (stage > 1 && tick - stagedAt < 100) {
                        ctx.textAlign = 'center';
                        ctx.fillStyle = '#fbbf24';
                        ctx.font = 'bold 14px system-ui';
                        ctx.fillText('\u26A0 STAGE ' + (stage - 1) + ' SEPARATION', W * 0.5, H * 0.3);
                        ctx.font = '11px system-ui';
                        ctx.fillStyle = '#e2e8f0';
                        ctx.fillText(stage === 2 ? 'First stage (S-IC) falls away \u2022 S-II lights' : 'S-II falls away \u2022 S-IVB lights', W * 0.5, H * 0.3 + 17);
                      }

                      if (tick - launchedAt < 75) {   // down here, clear of the HUD boxes at any width
                        ctx.textAlign = 'center';
                        ctx.globalAlpha = Math.min(1, (75 - (tick - launchedAt)) / 25);
                        ctx.font = 'bold 22px monospace';
                        var lofW = ctx.measureText('LIFTOFF!').width + 20;
                        ctx.fillStyle = 'rgba(15,23,42,0.6)';
                        ctx.fillRect(W * 0.5 - lofW / 2, H * 0.93 - 21, lofW, 29);
                        ctx.fillStyle = '#ffffff';
                        ctx.fillText('LIFTOFF!', W * 0.5, H * 0.93);
                        ctx.globalAlpha = 1;
                      }

                      // Phase complete — reached orbit
                      if (altitude > 20000) {
                        ctx.textAlign = 'center';
                        ctx.fillStyle = '#22c55e';
                        ctx.font = 'bold 18px system-ui';
                        ctx.fillText('\u2705 ORBIT ACHIEVED', W * 0.5, H * 0.2);
                        ctx.font = '11px system-ui';
                        ctx.fillStyle = '#94a3b8';
                        ctx.fillText('Click "Proceed" to continue to Earth orbit phase', W * 0.5, H * 0.26);
                      }
                    }

                    drawVignette(ctx, W, H, 0.3);
                    if (document.contains(cvEl)) requestAnimationFrame(drawLaunch);
                  }
                  drawLaunch();
                }
              })
            ),
            // Launch controls
            h('div', { className: 'p-3 border-t border-slate-700' },
              h('div', { className: 'mb-2' }, (function() {
                var mq = d.launchMaxQ;
                var seen = mmIsObj(mq) && typeof mq.altKm === 'number' && isFinite(mq.altKm) && typeof mq.velMs === 'number' && isFinite(mq.velMs);
                return predictCard('launch_maxq', seen, seen
                  ? t('stem.moonmission.predict_maxq_observed', 'Max Q on this flight:') + ' ' + mq.altKm.toFixed(1) + ' km up, at ' + mq.velMs.toLocaleString('en-US') + ' m/s.'
                  : null);
              })()),
              (function() {
                var ls = d.launchStatus || 'countdown';
                var inOrbit = ls === 'orbit';
                return phaseStatus(inOrbit,
                  ls === 'countdown' ? 'Final countdown at Kennedy \u2014 hold for liftoff.'
                    : ls === 'stage1' ? 'First stage burning \u2014 7.5 million pounds of thrust, and most of that is spent lifting its own fuel. Watch for Mach 1 and Max Q, where the air pushes hardest.'
                    : ls === 'stage2' ? 'Stage 1 away. Second stage burning, and the vehicle is pitching downrange.'
                    : 'Stage 2 away. Third stage pushing for orbital velocity.',
                  'Orbit achieved at 185 km. Ready to plan the trans-lunar burn.');
              })(),
              h('div', { className: 'flex items-center justify-between' },
                h('div', null,
                  h('p', { className: 'text-xs text-slate-400' }, t('stem.moonmission.saturn_v_3_stages_7_5_million_lbs_thru', '\uD83D\uDE80 Saturn V \u2022 3 stages \u2022 7.5 million lbs thrust')),
                  h('p', { id: 'mm-launch-description', className: 'text-[0.6875rem] text-slate-400' }, t('stem.moonmission.watch_the_countdown_and_ascent_through', 'Watch the countdown and ascent through Earth\'s atmosphere'))
                ),
                h('button', {
                  title: t('stem.moonmission.proceed_to_earth_orbit_phase_after_suc', 'Proceed to Earth orbit phase after successful launch'),
                  // Waits for orbit, as the task line tells students to. It was live from
                  // T-5, so a click on the pad logged "Launch successful! Reached Earth
                  // orbit" and toasted "Orbit achieved!" with the Saturn V still standing.
                  // A paused (or reduced-motion) student has frozen the ascent, so for
                  // them it stays the way on rather than a dead end.
                  disabled: eventPending || !(d.launchStatus === 'orbit' || animPaused),
                onClick: function() {
                  if (!(d.launchStatus === 'orbit' || animPaused)) return;
                  if (!canProceed()) return;
                    advancePhase(2);
                    log('\uD83D\uDE80 Launch successful! Reached Earth orbit.');
                    addXP(20);
                    if (addToast) addToast('\uD83C\uDF0D Orbit achieved! Preparing trans-lunar injection.', 'success');
                  },
                  className: 'px-4 py-2 rounded-lg text-xs font-bold text-white bg-green-700 hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                }, t('stem.moonmission.proceed_to_orbit', '\u2705 Proceed to Orbit'))
              )
            )
          )
        ),

        // ═══ PHASE 2: EARTH ORBIT ═══
        phase === 2 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            // Earth orbit canvas — shows CSM orbiting while TLI window sweeps toward Moon alignment
            h('div', { className: 'relative', style: { height: '260px' } },
              h('canvas', {
                role: 'img',
                'data-a11y-static': 'true',
                'aria-describedby': 'mm-earth-orbit-description',
                'aria-label': t('stem.moonmission.leo_canvas_alt', 'Animated view of the spacecraft in low Earth orbit, 185 kilometers up. Sunlight comes from one side, so part of every orbit passes through Earth\'s shadow and a counter adds up the sunrises the crew sees. The trans-lunar injection burn window opens once per orbit and is marked on the orbit. Shows orbit count, altitude, velocity and TLI readiness.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._orbitLeoInit) return;
                  cvEl._orbitLeoInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, HL = cvEl.offsetHeight || 260;
                  cvEl.width = W * 2; cvEl.height = HL * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== HL)) { W = nw; HL = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  // 1.5 orbits over ~22 seconds of viewing (60fps × 22 = 1320 frames → angSpeed ~0.0071)
                  var orbitAngSpeed = 0.0071;
                  var _lastTliState = null, _lastTliOff = -99;   // throttle the state publish
                  // Trans-lunar injection fires on the FAR side of Earth from where the Moon
                  // will be: the burn raises the far end of the orbit out to the Moon's
                  // distance, and the spacecraft coasts half an orbit out to meet it. The
                  // window used to sit on the Moon-facing side (angle 0) under a banner
                  // saying the velocity pointed at the Moon, which is the intuitive mistake.
                  var tliTargetAng = Math.PI;
                  var windowHalfWidth = 0.35;   // radians, about 20 degrees
                  function tliState(tk) {
                    var orbAng = -Math.PI * 0.5 + tk * orbitAngSpeed;
                    var orbits = (tk * orbitAngSpeed) / (Math.PI * 2);
                    var angDiff = ((((orbAng - tliTargetAng + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
                    var inWindow = Math.abs(angDiff) < windowHalfWidth && orbits > 1.35;
                    var readyState = orbits <= 1.35 ? 'systems' : (inWindow ? 'go' : 'aligning');
                    // How long until the window opens: an unexplained wait reads as a
                    // broken button, and the whole point is that they CHOOSE to wait.
                    var toEdge = (-windowHalfWidth) - angDiff;           // angDiff climbs toward 0
                    if (toEdge < 0) toEdge += Math.PI * 2;               // just missed it: next time round
                    var framesAlign = toEdge / orbitAngSpeed;
                    var framesSystems = Math.max(0, (1.35 * Math.PI * 2 / orbitAngSpeed) - tk);
                    return {
                      orbAng: orbAng, orbits: orbits, angDiff: angDiff, inWindow: inWindow, state: readyState,
                      offByDeg: Math.round(Math.abs(angDiff) * 180 / Math.PI),
                      side: angDiff < 0 ? 'early' : 'late',
                      secsToGo: Math.max(0, Math.round(Math.max(framesAlign, framesSystems) / 60))
                    };
                  }
                  // Written only when the state changes or the angle moves 10 degrees, so this
                  // is a few commits per orbit, not one per frame.
                  function publishWindow(st) {
                    if (st.state !== _lastTliState || Math.abs(st.offByDeg - _lastTliOff) >= 10) {
                      _lastTliState = st.state;
                      _lastTliOff = st.offByDeg;
                      upd('tliWindow', { state: st.state, offByDeg: st.offByDeg, side: st.side, secsToGo: st.secsToGo, orbits: Math.round(st.orbits * 100) / 100 });
                    }
                  }
                  // Moon's "future position" sits ~48° ahead of current; TLI must fire when CSM is at the opposite side of its orbit
                  var eoClock = { last: null, acc: 0 };
                  var eoShadow = null, eoSunrises = 0, eoSunriseAt = -999;   // orbital sunrises seen
                  function drawEarthOrbit(ts) {
                    // Paused (or reduced motion): the orbit keeps its clock and publishes the
                    // window, and only the painting stops. It used to return before tick++,
                    // freezing the window at "systems", so every burn by a reduced-motion
                    // student was graded early and billed a mid-course correction.
                    var eoSteps = mmFrameSteps(eoClock, ts);
                    if (_mmAnimPaused && tick > 0) {
                      tick += eoSteps;
                      publishWindow(tliState(tick));
                      if (document.contains(cvEl)) requestAnimationFrame(drawEarthOrbit);
                      return;
                    }
                    tick += eoSteps;
                    ctx.clearRect(0, 0, W, HL);
                    // Space background + stars
                    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, W, HL);
                    drawStarfield(ctx, W, HL, tick, 110);
                    // Earth (left-of-center)
                    // As big as the view allows (it was capped at 42px on any screen).
                    var eX = W * 0.34, eY = HL * 0.52, eR = Math.min(HL * 0.3, W * 0.1), craftK = Math.max(1, eR / 42);
                    // Sunlight comes from the right: half of every 90-minute orbit is in
                    // Earth's shadow, so the crew saw a sunrise every orbit, 16 a day.
                    var sunGlow = ctx.createLinearGradient(W, 0, W - 90, 0);
                    sunGlow.addColorStop(0, 'rgba(253,230,138,0.10)'); sunGlow.addColorStop(1, 'rgba(253,230,138,0)');
                    ctx.fillStyle = sunGlow; ctx.fillRect(W - 90, 0, 90, HL);
                    ctx.fillStyle = 'rgba(253,230,138,0.75)'; ctx.font = '8px system-ui'; ctx.textAlign = 'right';
                    ctx.fillText('\u2190 sunlight', W - 12, HL * 0.74);
                    // Earth's shadow, straight back from the Sun: the band the orbit passes
                    // through for about half of every lap (the chip below counts the sunrises).
                    var umbra = ctx.createLinearGradient(eX, 0, Math.max(0, eX - W * 0.34), 0);
                    umbra.addColorStop(0, 'rgba(0,0,0,0.5)'); umbra.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = umbra; ctx.fillRect(0, eY - eR, eX, eR * 2);
                    ctx.fillStyle = 'rgba(148,163,184,0.55)'; ctx.font = 'italic 8px system-ui'; ctx.textAlign = 'center';
                    ctx.fillText('Earth\'s shadow', Math.max(40, eX - eR - 26 - 44), eY + 3);
                    drawDetailedEarth(ctx, eX, eY, eR, tick, 0);
                    // Orbital ellipse (slight tilt for depth)
                    var orbR = eR + 26;
                    var orbRy = orbR * 0.92;
                    ctx.save();
                    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
                    ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.ellipse(eX, eY, orbR, orbRy, -0.12, 0, Math.PI * 2); ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                    // Moon's future position (far right) with a faint trajectory arc indicating TLI target
                    var moonX = W - 32, moonY = HL * 0.38, moonR = 10;
                    drawDetailedMoon(ctx, moonX, moonY, moonR, 42);
                    ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
                    ctx.fillText('Moon (in 3 days)', moonX, moonY + moonR + 12);
                    // Transfer path: from the burn point on the far side, half an ellipse
                    // up and over to where the Moon will be.
                    var _ct = Math.cos(-0.12), _stt = Math.sin(-0.12);
                    var burnX = eX + (-orbR) * _ct, burnY = eY + (-orbR) * _stt;
                    var _dx = (moonX - moonR - 2) - burnX, _dy = moonY - burnY;
                    var _half = Math.sqrt(_dx * _dx + _dy * _dy) / 2;
                    ctx.save();
                    ctx.beginPath(); ctx.rect(0, 0, W, HL); ctx.arc(eX, eY, eR + 2, 0, Math.PI * 2); ctx.clip('evenodd');   // behind the globe
                    ctx.strokeStyle = 'rgba(251,191,36,0.3)';
                    ctx.setLineDash([2, 5]); ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(burnX + _dx / 2, burnY + _dy / 2, _half, Math.min(_half * 0.32, HL * 0.4), Math.atan2(_dy, _dx), Math.PI, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                    var _tli = tliState(tick);
                    var orbAng = _tli.orbAng, orbits = _tli.orbits, angDiff = _tli.angDiff, inWindow = _tli.inWindow;
                    publishWindow(_tli);
                    // Draw TLI burn window as highlighted arc on the orbit
                    ctx.save();
                    ctx.strokeStyle = inWindow ? 'rgba(34,197,94,0.85)' : 'rgba(251,191,36,0.55)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.ellipse(eX, eY, orbR, orbRy, -0.12, tliTargetAng - windowHalfWidth, tliTargetAng + windowHalfWidth);
                    ctx.stroke();
                    ctx.restore();
                    // Compute CSM position on tilted ellipse
                    var cosT = Math.cos(-0.12), sinT = Math.sin(-0.12);
                    var px = Math.cos(orbAng) * orbR, py = Math.sin(orbAng) * orbRy;
                    var scX = eX + px * cosT - py * sinT;
                    var scY = eY + px * sinT + py * cosT;
                    // Orbit trail (last ~60° of arc)
                    ctx.save();
                    ctx.strokeStyle = 'rgba(56,189,248,0.45)'; ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.ellipse(eX, eY, orbR, orbRy, -0.12, orbAng - 1.0, orbAng);
                    ctx.stroke();
                    ctx.restore();
                    // In Earth's shadow: behind Earth from the Sun, inside its width.
                    var inShadow = scX < eX && Math.abs(scY - eY) < eR;
                    if (eoShadow === true && !inShadow) { eoSunrises++; eoSunriseAt = tick; }
                    eoShadow = inShadow;
                    // CSM + LM stack
                    ctx.save();
                    ctx.globalAlpha = inShadow ? 0.45 : 1;
                    ctx.translate(scX, scY); ctx.scale(craftK, craftK);
                    // Velocity vector indicator (tangent to orbit, points in direction of motion)
                    var tanAng = orbAng + Math.PI * 0.5;
                    ctx.rotate(tanAng - 0.12);
                    // Service module
                    ctx.fillStyle = '#c0c8d0'; ctx.fillRect(-6, -2, 8, 4);
                    // Command module nose
                    ctx.fillStyle = '#e8ecf0';
                    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-1, -2); ctx.lineTo(-4, -2); ctx.lineTo(-4, 2); ctx.lineTo(-1, 2); ctx.closePath(); ctx.fill();
                    // LM adapter
                    ctx.fillStyle = '#a0a8b0'; ctx.fillRect(-10, -2.5, 4, 5);
                    // Window glint
                    ctx.fillStyle = '#38bdf8'; ctx.fillRect(-2, -0.8, 1.5, 1.5);
                    // Engine glow if in TLI window
                    if (inWindow) {
                      var glowR = 3 + Math.sin(tick * 0.12) * 1.5; // ~1.15 Hz engine breath (was ~2.4 Hz, close to the photosensitivity line)
                      var glowGrad = ctx.createRadialGradient(-12, 0, 0, -12, 0, glowR + 2);
                      glowGrad.addColorStop(0, 'rgba(56,189,248,0.9)');
                      glowGrad.addColorStop(1, 'rgba(56,189,248,0)');
                      ctx.fillStyle = glowGrad;
                      ctx.beginPath(); ctx.arc(-12, 0, glowR + 2, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.restore();
                    ctx.globalAlpha = 1;
                    if (tick - eoSunriseAt < 200) {
                      // A bright rim over the top of Earth, where the craft comes out of the
                      // shadow and sees the Sun come up over the limb.
                      ctx.strokeStyle = 'rgba(253,230,138,' + (0.8 * (1 - (tick - eoSunriseAt) / 200)) + ')'; ctx.lineWidth = 2;
                      ctx.beginPath(); ctx.arc(eX, eY, eR + 1, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.35); ctx.stroke();
                    }
                    // HUD — altitude, velocity. As wide as its widest line: the velocity
                    // ran past the 138px panel, and the sunrise rows made it tall enough to
                    // cover Earth at phone width, so they have their own chip below.
                    ctx.font = '11px monospace';
                    var hudW = Math.max(138, ctx.measureText('7.8 km/s (28,000 km/h)').width + 14);
                    ctx.fillStyle = 'rgba(0,0,0,0.55)';
                    ctx.fillRect(8, 8, hudW, 64);
                    ctx.textAlign = 'left'; ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#38bdf8'; ctx.fillText('ALTITUDE', 14, 22);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace';
                    ctx.fillText('185 km', 14, 36);
                    ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#38bdf8';
                    ctx.fillText('VELOCITY', 14, 50);
                    ctx.fillStyle = '#fff'; ctx.font = '11px monospace';
                    ctx.fillText('7.8 km/s (28,000 km/h)', 14, 64);
                    ctx.fillStyle = 'rgba(0,0,0,0.55)';
                    ctx.fillRect(8, HL - 62, 132, 34);
                    ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#fbbf24';
                    ctx.fillText(inShadow ? 'IN EARTH\'S SHADOW' : 'SUNRISES SEEN', 14, HL - 49);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace';
                    ctx.fillText(String(eoSunrises), 14, HL - 35);
                    if (tick - eoSunriseAt < 200) {
                      ctx.font = 'bold 9px system-ui'; ctx.fillStyle = '#fde68a';
                      ctx.fillText('Orbital sunrise! One every 90 minutes: 16 a day.', 148, HL - 42);
                    }
                    // Orbit counter (right side; drops under the left panel below ~270px)
                    ctx.save();
                    if (W < 270) ctx.translate(0, 72);
                    ctx.fillStyle = 'rgba(0,0,0,0.55)';
                    ctx.fillRect(W - 112, 8, 104, 64);
                    ctx.textAlign = 'right'; ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#fbbf24'; ctx.fillText('ORBITS', W - 14, 22);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace';
                    ctx.fillText(orbits.toFixed(2), W - 14, 42);
                    ctx.font = 'bold 9px monospace'; ctx.fillStyle = inWindow ? '#22c55e' : '#94a3b8';
                    ctx.fillText(inWindow ? 'TLI WINDOW \u25B6 GO' : 'TLI WINDOW', W - 14, 58);
                    ctx.font = '8px monospace';
                    ctx.fillText(orbits >= 1.35 ? (inWindow ? 'BURN NOW' : 'aligning...') : ('in ' + Math.max(0, (1.35 - orbits)).toFixed(2) + ' orbit'), W - 14, 68);
                    ctx.restore();
                    // Footer explainer text (fades in after 3s, cycles)
                    var lessons = [
                      'At 7.8 km/s, one orbit takes ~90 minutes.',
                      'TLI must fire at the right point to hit the Moon\'s future position.',
                      'The Moon moves ~1 km/s — you aim where it WILL be.',
                      '1.5 orbits gives Houston time to verify systems before TLI.',
                      'A 1\u00B0 burn error misses the Moon by thousands of km.'
                    ];
                    var lIdx = Math.floor(tick / 260) % lessons.length;
                    var lFade = Math.min(1, (tick % 260) < 210 ? (tick % 260) / 25 : (260 - tick % 260) / 50);
                    if (tick > 120) {
                      ctx.globalAlpha = lFade * 0.85;
                      ctx.textAlign = 'center'; ctx.font = 'italic 10px system-ui';
                      ctx.fillStyle = '#a5b4fc';
                      ctx.fillText(lessons[lIdx], W * 0.5, HL - 10);
                      ctx.globalAlpha = 1;
                    }
                    drawVignette(ctx, W, HL, 0.25);
                    if (document.contains(cvEl)) requestAnimationFrame(drawEarthOrbit);
                  }
                  drawEarthOrbit();
                }
              })
            ),
            h('div', { className: 'p-4 text-white' },
            h('div', { className: 'text-center mb-3' },
              h('div', { className: 'text-3xl' }, '\uD83C\uDF0D'),
              h('h4', { className: 'text-base font-bold' }, t('stem.moonmission.low_earth_orbit', 'Low Earth Orbit')),
              h('p', { id: 'mm-earth-orbit-description', className: 'text-[0.6875rem] text-slate-400' }, t('stem.moonmission.altitude_185_km_speed_28_000_km_h_1_5_', 'Altitude: 185 km \u2022 Speed: 28,000 km/h \u2022 1.5 orbits before TLI burn'))
            ),
            h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10 mb-3' },
              h('p', { className: 'text-[0.6875rem] text-sky-300 font-bold mb-1' }, t('stem.moonmission.trans_lunar_injection_tli', '\uD83D\uDE80 TRANS-LUNAR INJECTION (TLI)')),
              h('p', { className: 'text-[0.6875rem] text-slate-300 leading-relaxed' },
                t('stem.moonmission.the_s_ivb_third_stage_will_fire_for_5_', 'The S-IVB third stage will fire for 5 minutes 47 seconds to accelerate from 28,000 km/h to 38,900 km/h \u2014 trans-lunar injection speed, just under escape velocity. This single burn sends you on a trajectory to the Moon, 384,400 km away.')),
              h('div', { className: 'grid grid-cols-3 gap-2 mt-2' },
                [
                  ['\u0394v needed (change in speed)', '3.13 km/s'],
                  ['Burn Duration', '5m 47s'],
                  ['Coast Time', '~3 days']
                ].map(function(item) {
                  return h('div', { key: item[0], className: 'bg-white/5 rounded p-1.5 text-center' },
                    h('p', { className: 'text-[0.6875rem] text-slate-400' }, item[0]),
                    h('p', { className: 'text-[0.6875rem] font-bold text-sky-300' }, item[1])
                  );
                })
              )
            ),
            h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20' },
              h('p', { className: 'text-[0.6875rem] text-indigo-300' }, '\uD83D\uDCA1 ' + apolloFact())
            )
            )
          ),
          // \u2500\u2500 TLI burn, now actually timed \u2500\u2500
          // Firing outside the window is still allowed: making a student wait out an
          // alignment is a worse lesson than letting them fire early and showing what it
          // costs. Real missions fly mid-course corrections for exactly this reason, so an
          // off-nominal burn buys one \u2014 it just spends propellant and says so.
          (function() {
            var tw = d.tliWindow || { state: 'systems', offByDeg: 0, orbits: 0 };
            var go = tw.state === 'go';
            var waitingOnSystems = tw.state === 'systems';
            // The live region carries the STATE only. With the degrees and seconds inside
            // it, it re-announced every few degrees, about five times a second.
            return h('div', null,
              h('div', { className: 'mb-2' }, predictCard('tli_where', go || !!d.tliAccuracy)),
              h('div', {
                className: 'mb-2 rounded-lg px-3 py-2 text-[0.6875rem] font-bold border ' +
                  (go ? 'bg-emerald-950 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-900 border-amber-500/50 text-amber-200')
              },
                h('p', { role: 'status', 'aria-live': 'polite', 'data-moonmission-tli-state': tw.state },
                  go ? '\u2705 GO for TLI. You are on the far side of Earth from where the Moon will be, so this burn swings you out to meet it half an orbit later.'
                    : waitingOnSystems ? '\u23F3 Houston is verifying systems. The burn window comes round after about an orbit and a half.'
                    : '\u23F3 Aligning with the burn point. Watch for the green arc, or burn now and correct later.'),
                !go && h('p', { className: 'mt-0.5 font-normal', 'data-moonmission-tli-detail': 'true' },
                  (waitingOnSystems ? '' : 'About ' + tw.offByDeg + '\u00B0 ' + (tw.side === 'late' ? 'past' : 'before') + ' the burn point. ')
                  + (tw.secsToGo ? 'Window in about ' + tw.secsToGo + ' s.' : ''))
              ),
              h('button', {
                title: go
                  ? t('stem.moonmission.execute_tli_in_window', 'Execute trans-lunar injection burn. You are inside the burn window.')
                  : t('stem.moonmission.execute_tli_early', 'Execute trans-lunar injection burn early, outside the burn window. This will need a mid-course correction.'),
                disabled: eventPending,
                onClick: function() {
                  if (!canProceed()) return;
                  advancePhase(3);
                  upd('showQuiz', true); // Trigger quiz during coast
                  upd('tliAccuracy', { onTime: go, offByDeg: tw.offByDeg, side: tw.side === 'late' ? 'late' : 'early', beforeGo: waitingOnSystems });
                  if (go) {
                    log('\uD83D\uDE80 TLI burn on time \u2014 trajectory nominal.');
                    addXP(25);
                    if (addToast) addToast('\uD83C\uDF11 Nominal trans-lunar injection! Time for a space knowledge check.', 'success');
                    if (typeof announceToSR === 'function') announceToSR('Trans-lunar injection burn executed inside the window. Trajectory is nominal.');
                  } else {
                    log('\uD83D\uDE80 TLI burn fired ' + tw.offByDeg + '\u00B0 off the window \u2014 a mid-course correction will be needed.');
                    addXP(10);
                    if (addToast) addToast('\uD83C\uDF11 Burn away \u2014 but ' + tw.offByDeg + '\u00B0 off the aim point. You will spend propellant on a mid-course correction.', 'info');
                    if (typeof announceToSR === 'function') announceToSR('Trans-lunar injection executed ' + tw.offByDeg + ' degrees outside the burn window. A mid-course correction will be required.');
                  }
                },
                className: 'w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ' +
                  (go ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700')
              }, go ? t('stem.moonmission.execute_tli_go', '\uD83D\uDE80 Execute TLI Burn \u2014 GO')
                    : t('stem.moonmission.execute_tli_burn_head_to_the_moon', '\uD83D\uDE80 Execute TLI Burn \u2014 Head to the Moon'))
            );
          })()
        ),

        // ═══ PHASE 3: TRANS-LUNAR COAST (Animated Canvas) ═══
        phase === 3 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '280px' } },
              h('canvas', { 
                role: 'img',
                'data-a11y-static': 'true',
                'aria-describedby': 'mm-transit-description',
                'aria-label': t('stem.moonmission.tlc_canvas_alt', 'Animated trans-lunar coast along a figure-8 free-return path, the route that would swing behind the Moon and back to Earth with no engine burn. A marker shows where the Moon\'s pull becomes stronger than Earth\'s. Live readouts show distance from Earth, distance to the Moon and speed. An optional true-scale view shrinks Earth and the Moon to their real sizes and spacing.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._transitInit) return;
                  cvEl._transitInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, H3 = cvEl.offsetHeight || 280;
                  cvEl.width = W * 2; cvEl.height = H3 * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== H3)) { W = nw; H3 = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  var tClock = { last: null, acc: 0 };
                  var _coastReported = false;   // the slowest point, published once for the prediction card
                  function drawTransit(ts) {
                    if (_mmAnimPaused && tick > 0) { tClock.last = null; if (document.contains(cvEl)) requestAnimationFrame(drawTransit); return; }
                    tick += mmFrameSteps(tClock, ts);
                    ctx.clearRect(0, 0, W, H3);
                    // Space background
                    ctx.fillStyle = '#010108'; ctx.fillRect(0, 0, W, H3);
                    // Enhanced starfield
                    drawStarfield(ctx, W, H3, tick, 150);
                    // Where the craft is comes from the energy equation (mmCoastAt), so it
                    // races off Earth, crawls through the long middle and speeds up only
                    // near the Moon. It used to slide across at one steady speed.
                    var coast = mmCoastAt(Math.min(1, tick / 2400));
                    var frac = (coast.r - MM_TLC_R0) / (MM_COAST_END - MM_TLC_R0);
                    var trueScale = _mmTrueScale, cy3 = H3 * 0.5;
                    var earthX = trueScale ? 60 : 70 + frac * 15;
                    var moonX = W - (trueScale ? 60 : 50 + (1 - frac) * 10);
                    var gap = moonX - earthX;
                    // True scale: Earth 12,742 km across, the Moon 3,475, and 384,400 km apart.
                    var earthR = trueScale ? gap * 6371 / MM_EM_D : Math.max(8, 55 * (1 - frac * 0.5));
                    var moonR = trueScale ? gap * 1737.4 / MM_EM_D : 8 + frac * 30;
                    // ── The free-return figure 8 ──
                    // Out over the top from behind Earth (where TLI fires), across, round
                    // behind the Moon (where LOI fires) and, with no burn at all, back to
                    // Earth. Apollo 11 flew out on one. The coast used to be a single arc.
                    var cx8 = (earthX + moonX) / 2, aL = gap / 2 + earthR + 8, aR = gap / 2 + moonR + 12, b8 = H3 * 0.5;
                    function fr8(t) { var c = Math.cos(t); return [cx8 + (c < 0 ? aL : aR) * c, cy3 + b8 * Math.sin(t) * c]; }
                    function fr8T(x) { var c = x < cx8 ? (x - cx8) / aL : (x - cx8) / aR; return Math.acos(Math.max(-1, Math.min(1, c))); }
                    var tNow = fr8T(earthX + gap * coast.r / MM_EM_D);   // pi at TLI, 0 behind the Moon
                    ctx.save();
                    ctx.setLineDash([3, 5]); ctx.lineWidth = 1;
                    ctx.strokeStyle = 'rgba(148,163,184,0.3)';
                    ctx.beginPath();
                    for (var k8 = 0; k8 <= 160; k8++) { var p8 = fr8(Math.PI - k8 / 80 * Math.PI); if (k8) ctx.lineTo(p8[0], p8[1]); else ctx.moveTo(p8[0], p8[1]); }
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.strokeStyle = 'rgba(56,189,248,0.6)'; ctx.lineWidth = 1.4;   // flown so far
                    ctx.beginPath();
                    for (var k9 = 0; k9 <= 60; k9++) { var p9 = fr8(Math.PI - (Math.PI - tNow) * k9 / 60); if (k9) ctx.lineTo(p9[0], p9[1]); else ctx.moveTo(p9[0], p9[1]); }
                    ctx.stroke();
                    ctx.restore();
                    drawDetailedEarth(ctx, earthX, cy3, earthR, tick);
                    drawDetailedMoon(ctx, moonX, cy3, moonR);
                    ctx.font = '8px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(148,163,184,0.75)';
                    ctx.fillText('Free-return path: no burn needed to get home', cx8, cy3 - b8 * 0.5 - 6);
                    // Where the Moon's pull overtakes Earth's: the slowest point of the trip.
                    var pEq = fr8(fr8T(earthX + gap * MM_EQUAL_PULL / MM_EM_D));
                    var passedEq = coast.r >= MM_EQUAL_PULL;
                    if (passedEq && !_coastReported) {
                      _coastReported = true;
                      upd('coastSlowest', { v: Math.round(mmCoastSpeed(MM_EQUAL_PULL) * 100) / 100, toMoonKm: Math.round(MM_EM_D - MM_EQUAL_PULL) });
                    }
                    ctx.fillStyle = passedEq ? '#fbbf24' : 'rgba(251,191,36,0.6)';
                    ctx.beginPath(); ctx.arc(pEq[0], pEq[1], 2.5, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = passedEq ? '#fde68a' : 'rgba(253,230,138,0.7)';
                    ctx.fillText('Moon\'s pull beats Earth\'s here', pEq[0], pEq[1] + 13);
                    // Spacecraft, pointing along its path.
                    var scPt = fr8(tNow), ahead = fr8(tNow - 0.02);
                    var scX = scPt[0], scY = scPt[1];
                    ctx.save();
                    ctx.translate(scX, scY);
                    ctx.rotate(Math.atan2(ahead[1] - scY, ahead[0] - scX));
                    // Blue engine glow
                    ctx.fillStyle = 'rgba(56,189,248,0.3)';
                    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
                    // Service module (silver rectangle)
                    ctx.fillStyle = '#c0c8d0';
                    ctx.fillRect(-8, -2.5, 10, 5);
                    // Command module (white cone)
                    ctx.fillStyle = '#e8ecf0';
                    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(2, -3); ctx.lineTo(-1, -3); ctx.lineTo(-1, 3); ctx.lineTo(2, 3); ctx.closePath(); ctx.fill();
                    // Window
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(1, -1, 2, 2);
                    // LM adapter (wider section behind SM)
                    ctx.fillStyle = '#a0a8b0';
                    ctx.fillRect(-12, -3.5, 4, 7);
                    ctx.restore();
                    if (trueScale) {
                      ctx.fillStyle = 'rgba(186,230,253,0.8)'; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
                      ctx.fillText('spacecraft not to scale', scX, scY - 10);
                    }
                    // ── Distance readout ──
                    // These two lines used to be centred ON the spacecraft, one 12px above
                    // and one 18px below, so both ran straight through the hull and each
                    // other. In a HUD panel like every other phase uses.
                    var distFromEarth = Math.round(coast.r);
                    var distToMoon = MM_EM_D - distFromEarth;
                    // A bar across the top, above the flight path: as a tall corner panel
                    // it sat on top of Earth.
                    var cw = Math.min(130, (W - 28) / 3);
                    ctx.fillStyle = 'rgba(0,0,0,0.55)';
                    ctx.fillRect(8, 6, cw * 3 + 12, 46);
                    ctx.textAlign = 'left';
                    [['FROM EARTH', distFromEarth.toLocaleString() + ' km', '#fff'],
                     ['TO MOON', distToMoon.toLocaleString() + ' km', '#fff'],
                     ['SPEED', coast.v.toFixed(2) + ' km/s ' + (passedEq ? '\u25B2' : '\u25BC'), passedEq ? '#fde68a' : '#fff']
                    ].forEach(function(cell, ci) {
                      ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#38bdf8';
                      ctx.fillText(cell[0], 14 + ci * cw, 17);
                      ctx.font = 'bold 11px monospace'; ctx.fillStyle = cell[2];
                      ctx.fillText(cell[1], 14 + ci * cw, 30);
                    });
                    ctx.font = '8px system-ui'; ctx.fillStyle = '#cbd5e1';
                    ctx.fillText(passedEq ? 'Speeding up: falling toward the Moon.' : 'Slowing down: climbing out of Earth\'s pull.', 14, 45);
                    // Comms chatter
                    var commsMessages = [
                      'Houston: "You are GO for TLI."',
                      'CMP: "Transposition and docking complete."',
                      'CDR: "The Earth is getting smaller every hour."',
                      'LMP: "Mid-course correction burn nominal."',
                      'Houston: "Apollo, you are GO for LOI."',
                      'CDR: "We can see the Moon growing. Incredible."'
                    ];
                    var commsIdx = Math.floor(tick / 300) % commsMessages.length;
                    var commsFade = Math.min(1, (tick % 300) < 240 ? (tick % 300) / 30 : (300 - tick % 300) / 60);
                    ctx.globalAlpha = commsFade * 0.7;
                    ctx.font = 'italic 10px system-ui';
                    ctx.fillStyle = '#a5b4fc';
                    ctx.fillText(commsMessages[commsIdx], W * 0.5, H3 - 12);
                    ctx.globalAlpha = 1;
                    drawVignette(ctx, W, H3, 0.25);
                    if (document.contains(cvEl)) requestAnimationFrame(drawTransit);
                  }
                  drawTransit();
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-slate-700' },
              h('div', { id: 'mm-transit-description', className: 'space-y-1.5 mb-2' },
                [
                  'The Command Module extracts the Lunar Module from the S-IVB third stage.',
                  'The spacecraft rotates slowly ("BBQ roll") to evenly distribute solar heating.',
                  'Even a 1\u00B0 trajectory error would miss the Moon by thousands of kilometers.'
                ].map(function(fact, i) {
                  return h('p', { key: i, className: 'text-[0.6875rem] text-slate-400' }, '\u2022 ' + fact);
                })
              ),
              h('div', { className: 'mb-2' }, (function() {
                var cs = d.coastSlowest;
                var seen = mmIsObj(cs) && typeof cs.v === 'number' && isFinite(cs.v) && typeof cs.toMoonKm === 'number' && isFinite(cs.toMoonKm);
                return predictCard('coast_speed', seen, seen
                  ? t('stem.moonmission.predict_coast_observed', 'Slowest point:') + ' ' + cs.v.toFixed(2) + ' km/s, ' + cs.toMoonKm.toLocaleString('en-US') + ' km from the Moon (you left at ' + MM_TLC_V0 + ' km/s).'
                  : null);
              })()),
              h('button', { type: 'button', 'aria-pressed': d.trueScale ? 'true' : 'false', 'data-moonmission-true-scale': 'true',
                onClick: function() { upd('trueScale', !d.trueScale); },
                className: 'w-full min-h-[44px] px-3 mb-2 rounded-lg border text-xs font-bold transition-colors ' +
                  (d.trueScale ? 'border-sky-400 bg-sky-400/15 text-sky-100' : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-sky-400') },
                t('stem.moonmission.true_scale_toggle', '\uD83D\uDD2D Show Earth and the Moon at true scale')),
              d.trueScale && h('p', { className: 'mb-2 text-[0.6875rem] text-sky-200', 'data-moonmission-true-scale-note': 'true' },
                t('stem.moonmission.true_scale_note', 'At true scale about 30 Earths would fit side by side in the gap. The spacecraft is not to scale: it would be far too small to see.')),
              h('div', { className: 'bg-indigo-500/10 rounded p-1.5 border border-indigo-500/20 mb-2' },
                h('p', { className: 'text-[0.6875rem] text-indigo-300' }, '\uD83D\uDCA1 ' + apolloFact())
              )
            )
          ),
          // \u2500\u2500 Mid-course correction \u2500\u2500
          // The TLI phase already tells a student who burns outside the window that they
          // have bought a mid-course correction. Until now that was a sentence and
          // nothing else happened, which teaches that the timing did not matter after
          // all. This is the bill arriving, and it is a real choice with a real cost on
          // both sides: propellant spent here is propellant the landing does not have,
          // and skipping it means arriving faster than you want to be going.
          (function() {
            var acc = d.tliAccuracy;
            if (!acc) return null;                       // reached this phase another way
            if (acc.onTime) {
              return phaseStatus(true, '',
                'Trajectory nominal. The TLI burn was inside the window, so no mid-course correction is needed \u2014 and that is propellant you keep for the landing.');
            }
            var choice = d.mccChoice;
            if (choice) {
              return phaseStatus(true, '',
                choice === 'corrected'
                  ? 'Mid-course correction complete. The Service Module\'s engine put you back on the nominal path, and the landing keeps its full fuel budget.'
                  : 'Correction declined. You will arrive off the nominal path and faster across the ground, which the landing will have to absorb.');
            }
            return h('div', { className: 'mb-2 rounded-xl p-3 border border-amber-500/50 bg-slate-900' },
              h('p', { className: 'text-[0.6875rem] font-bold text-amber-200 mb-1' },
                '\u26A0\uFE0F MID-COURSE CORRECTION \u2014 your TLI burn was ' + acc.offByDeg + '\u00B0 off the aim point'),
              h('p', { className: 'text-[0.6875rem] text-amber-50 mb-2 leading-relaxed' },
                'A small error at the burn becomes a large one over 384,400 km. Apollo carried propellant for exactly this and used it on nearly every flight. Correcting now costs a little Service Module propellant. Not correcting lets the error grow, and the Lunar Module pays for it at the landing in hover fuel and drift.'),
              h('div', { className: 'flex gap-2 flex-wrap' },
                h('button', {
                  title: t('stem.moonmission.burn_the_correction', 'Burn the mid-course correction with the Service Module engine. Puts you back on the nominal trajectory; the landing keeps its full fuel budget.'),
                  onClick: function() {
                    upd('mccChoice', 'corrected');
                    log('\uD83D\uDEE0\uFE0F Mid-course correction burned \u2014 back on the nominal path.');
                    addXP(15);
                    if (addToast) addToast('\uD83D\uDEE0\uFE0F Correction burned. Back on track, with a lighter fuel margin for the landing.', 'success');
                    if (typeof announceToSR === 'function') announceToSR('Mid-course correction executed. Trajectory nominal; the landing keeps its full fuel budget.');
                  },
                  className: 'flex-1 min-w-[150px] py-2 rounded-lg text-[0.6875rem] font-bold text-white bg-emerald-700 hover:bg-emerald-800'
                }, t('stem.moonmission.burn_correction_label', '\uD83D\uDEE0\uFE0F Burn the correction now')),
                h('button', {
                  title: t('stem.moonmission.press_on_uncorrected', 'Press on without correcting. Saves Service Module propellant now, but the landing starts with less hover fuel and more drift.'),
                  onClick: function() {
                    upd('mccChoice', 'skipped');
                    log('\u27A1\uFE0F Correction declined \u2014 arriving off-nominal to save fuel.');
                    addXP(5);
                    if (addToast) addToast('\u27A1\uFE0F Pressing on. You keep the fuel, but you will arrive moving faster across the ground.', 'info');
                    if (typeof announceToSR === 'function') announceToSR('Correction declined. You will arrive off the nominal path with additional horizontal speed at the landing.');
                  },
                  className: 'flex-1 min-w-[150px] py-2 rounded-lg text-[0.6875rem] font-bold text-white bg-slate-600 hover:bg-slate-700'
                }, t('stem.moonmission.press_on_label', '\u27A1\uFE0F Press on without correcting'))
              )
            );
          })(),
          h('button', {
            title: t('stem.moonmission.arrive_at_the_moon_and_enter_lunar_orb', 'Arrive at the Moon and enter lunar orbit at 110 kilometer altitude'),
            disabled: eventPending || mccPending,
                onClick: function() {
                  if (mccPending || !canProceed()) return;
              advancePhase(4);
              log('\uD83C\uDF15 Approaching the Moon. Preparing for lunar orbit insertion.');
              addXP(15);
              if (addToast) addToast('\uD83C\uDF15 The Moon fills the window! Preparing LOI burn.', 'success');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
          }, t('stem.moonmission.arrive_at_the_moon_enter_lunar_orbit', '\uD83C\uDF15 Arrive at the Moon \u2014 Enter Lunar Orbit')),
          mccPending && h('p', { className: 'mt-1 text-[0.6875rem] text-slate-600 text-center', 'data-moonmission-mcc-required': 'true' },
            t('stem.moonmission.mcc_choose_first', 'Choose above: burn the correction or press on. Arrival waits for that decision.'))
        ),

        // ═══ PHASE 4: LUNAR ORBIT (Animated Canvas) ═══
        phase === 4 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '240px' } },
              h('canvas', { 
                role: 'img',
                'data-a11y-static': 'true',
                'aria-describedby': 'mm-lunar-orbit-description',
                'aria-label': t('stem.moonmission.lunar_orbit_canvas_alt', 'Animated view of the docked Command and Lunar Module stack orbiting the Moon 110 kilometers up. The Moon is its real near side: dark lava seas, bright rayed craters such as Tycho and Copernicus, and Tranquility Base marked on the southwestern shore of the Sea of Tranquility. Each orbit the spacecraft passes behind the Moon and loses radio contact with Earth, and Earth rises over the lunar limb. It is lit from the east, as on landing day: the sunrise line lies just west of Tranquility Base, and the night side glows faintly in earthshine. The stack goes dark while it passes through the Moon\'s shadow. A toggle below names the seas and every Apollo landing site.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._orbitInit) return;
                  cvEl._orbitInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, HO = cvEl.offsetHeight || 240;
                  cvEl.width = W * 2; cvEl.height = HO * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== HO)) { W = nw; HO = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;

                  // The docked stack, drawn to scale and banked along its velocity vector.
                  // Until now this was a 2px white dot with a "CSM + LM" caption — the one
                  // object the whole phase is about, rendered as a speck.
                  function drawOrbitCraft(x, y, ang, dimmed, unlit) {
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(Math.sin(ang) * 0.25);          // slight bank as it comes round
                    if (dimmed) ctx.globalAlpha = 0.35;        // slipping behind the limb
                    else if (unlit) ctx.globalAlpha = 0.3;     // in the Moon's shadow: orbital night
                    // LM, docked nose-to-nose ahead of the CSM
                    ctx.fillStyle = '#c9a04a';
                    ctx.fillRect(7, -2.4, 5, 4.8);
                    ctx.fillStyle = '#b9bcc2';
                    ctx.fillRect(5.6, -1.4, 1.6, 2.8);         // docking tunnel
                    // Service module
                    ctx.fillStyle = '#c0c8d0';
                    ctx.fillRect(-8, -2.2, 12, 4.4);
                    ctx.fillStyle = 'rgba(0,0,0,0.18)';        // shadowed underside
                    ctx.fillRect(-8, 0.8, 12, 1.6);
                    // Engine bell
                    ctx.fillStyle = '#8a929c';
                    ctx.beginPath();
                    ctx.moveTo(-8, -1.6); ctx.lineTo(-11.5, -2.8); ctx.lineTo(-11.5, 2.8); ctx.lineTo(-8, 1.6);
                    ctx.closePath(); ctx.fill();
                    // Command module cone
                    ctx.fillStyle = '#e8ecf0';
                    ctx.beginPath();
                    ctx.moveTo(4, -2.2); ctx.lineTo(5.6, -1.2); ctx.lineTo(5.6, 1.2); ctx.lineTo(4, 2.2);
                    ctx.closePath(); ctx.fill();
                    // Window glint
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(1.5, -0.9, 1.4, 1.4);
                    ctx.restore();
                    if (!dimmed) {
                      // Clear of the hull, and outlined: the caption sat 6px off the craft
                      // and rendered pale blue straight onto the bright lunar disc.
                      ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
                      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(2,6,23,0.85)';
                      ctx.strokeText('CSM + LM', x, y - 18);
                      ctx.fillStyle = '#7dd3fc';
                      ctx.fillText('CSM + LM', x, y - 18);
                    }
                  }

                  var _lastOrbitState = null;   // throttle the readiness publish
                  var orbitClock = { last: null, acc: 0 };   // 1/60 s steps, whatever the screen's frame rate
                  function drawOrbit(ts) {
                    if (_mmAnimPaused && tick > 0) { orbitClock.last = null; if (document.contains(cvEl)) requestAnimationFrame(drawOrbit); return; }
                    tick += mmFrameSteps(orbitClock, ts);
                    ctx.clearRect(0, 0, W, HO);
                    ctx.fillStyle = '#000008'; ctx.fillRect(0, 0, W, HO);
                    // Enhanced starfield
                    drawStarfield(ctx, W, HO, tick, 100);

                    var moonCx = W * 0.5, moonCy = HO * 0.55;
                    var moonR = Math.min(W, HO) * 0.38;

                    // ── Orbit geometry, computed before anything is drawn so the scene can
                    // be layered by depth. The old view had none: the spacecraft was a 2px
                    // dot that slid across the Moon's face and never went behind it, so an
                    // orbit read as a flat circle drawn on top of a picture. ──
                    var orbitR = moonR * 1.2, orbitRy = orbitR * 0.3;
                    var scAngle = tick * 0.012;
                    var scX = moonCx + Math.cos(scAngle) * orbitR;
                    var scY = moonCy + Math.sin(scAngle) * orbitRy;
                    var farSide = Math.sin(scAngle) < 0;                 // upper half of the ellipse = behind the Moon
                    var dxm = scX - moonCx, dym = scY - moonCy;
                    var occluded = farSide && (dxm * dxm + dym * dym) < moonR * moonR;
                    var inShadow = mmCraftInShadow(scAngle, orbitR / moonR, MM_TERMINATOR_LON);
                    // Narrate the orbit to the banner under the canvas (state changes only):
                    // LOI → around the near side → loss of signal behind the Moon → back in
                    // contact → one full orbit surveyed, which is GO for undocking.
                    var oState = scAngle > Math.PI * 2 ? 'ready'
                      : scAngle < 1.0 ? 'loi'
                      : occluded ? 'los'
                      : 'nearside';
                    if (oState !== _lastOrbitState) { _lastOrbitState = oState; upd('orbitStatus', oState); }

                    // ── Earthrise. Drawn BEFORE the Moon, so the lunar disc genuinely
                    // occludes it and the Earth climbs out from behind the limb the way it
                    // does from orbit — the single most famous thing anyone ever saw from
                    // here. (It used to be a fixed 12px dot pinned to the top-right corner.)
                    var riseCycle = (Math.sin(scAngle * 0.5 - 0.6) + 1) / 2;
                    var earthR2 = 13;
                    var earthX2 = moonCx - moonR * 0.62;
                    var earthY2 = Math.max(earthR2 + 38, moonCy - moonR * 0.35 - riseCycle * (moonR * 0.95 + earthR2));   // stays under the HUD line
                    drawDetailedEarth(ctx, earthX2, earthY2, earthR2, tick, 0);   // lit by the same Sun, from the east
                    var earthClear = earthY2 + earthR2 < moonCy - moonR * 0.15;
                    if (earthClear) {
                      ctx.font = '7px system-ui'; ctx.fillStyle = 'rgba(147,197,253,0.65)'; ctx.textAlign = 'center';
                      ctx.fillText('Earthrise', earthX2, earthY2 - earthR2 - 6);
                    }

                    // Far half of the orbit path — dimmer, and behind the Moon.
                    ctx.save();
                    ctx.strokeStyle = 'rgba(56,189,248,0.10)'; ctx.lineWidth = 0.5;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath(); ctx.ellipse(moonCx, moonCy, orbitR, orbitRy, 0, Math.PI, Math.PI * 2); ctx.stroke();
                    ctx.restore();
                    if (farSide) drawOrbitCraft(scX, scY, scAngle, occluded, inShadow);

                    // Moon (large, fills most of the view) — detailed procedural rendering
                    drawDetailedMoon(ctx, moonCx, moonCy, moonR, 77);
                    mmMoonNight(ctx, moonCx, moonCy, moonR, MM_TERMINATOR_LON);   // landing-day light
                    // Landing site marker (over the detailed moon)
                    // Placed from the coordinates printed under this view, on the same map
                    // as the seas (it was a fixed offset nowhere near 23.5\u00B0E).
                    var lsP = mmMoonProject(MM_MOON_SITES[0].lon, MM_MOON_SITES[0].lat, moonCx, moonCy, moonR);
                    var lsX = lsP[0], lsY = lsP[1];
                    function mmOutlined(text, x, y, fill) {
                      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(2,6,23,0.8)';
                      ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y);
                    }
                    if (_mmMoonLabels) {
                      ctx.textAlign = 'center';
                      ctx.font = 'italic 8px system-ui';
                      MM_MOON_MARIA.forEach(function(m) {
                        if (!m.label) return;
                        var mp = mmMoonProject(m.at[0], m.at[1], moonCx, moonCy, moonR);
                        mmOutlined(m.label, mp[0], mp[1] + 3, '#e2e8f0');
                      });
                      ctx.font = 'bold 8px system-ui';
                      MM_MOON_SITES.forEach(function(site) {
                        if (site.m === 11) return;
                        var sp = mmMoonProject(site.lon, site.lat, moonCx, moonCy, moonR);
                        ctx.fillStyle = '#fbbf24';
                        ctx.beginPath(); ctx.arc(sp[0], sp[1], 2.2, 0, Math.PI * 2); ctx.fill();
                        ctx.textAlign = site.side < 0 ? 'right' : 'left';
                        mmOutlined(String(site.m), sp[0] + (site.side < 0 ? -5 : 5), sp[1] + 3, '#fde68a');
                      });
                    }
                    ctx.shadowColor = 'rgba(74,222,128,0.9)'; ctx.shadowBlur = 9;
                    ctx.fillStyle = 'rgba(34,197,94,' + (0.4 + Math.sin(tick * 0.06) * 0.3) + ')';
                    ctx.beginPath(); ctx.arc(lsX, lsY, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.shadowBlur = 0;
                    // Outlined — mid-green on the sunlit regolith was close to unreadable.
                    // To the left of the dot: to the right it ran off the limb.
                    ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'right';
                    mmOutlined('Tranquility Base', lsX - 6, lsY + 3, '#86efac');
                    // Near half of the orbit path \u2014 brighter, and in front of the Moon.
                    ctx.strokeStyle = 'rgba(56,189,248,0.30)'; ctx.lineWidth = 0.9;
                    ctx.beginPath(); ctx.ellipse(moonCx, moonCy, orbitR, orbitRy, 0, 0, Math.PI); ctx.stroke();
                    if (!farSide) drawOrbitCraft(scX, scY, scAngle, false, inShadow);

                    // HUD
                    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText('LUNAR ORBIT \u2022 ALT 110 km \u2022 PERIOD 2h', 10, 14);
                    // \u2500\u2500 Loss of signal. Falls straight out of the new depth handling: while
                    // the stack is behind the Moon there is no line of sight to Earth, which
                    // is why every Apollo crew went silent on the far side. \u2500\u2500
                    if (occluded) {
                      ctx.textAlign = 'left'; ctx.font = 'bold 9px monospace';
                      ctx.fillStyle = '#f59e0b';
                      ctx.fillText('\u26a0 LOS \u2014 NO RADIO CONTACT (far side)', 10, 28);
                    }
                    if (inShadow) {
                      ctx.textAlign = 'left'; ctx.font = 'bold 9px monospace';
                      ctx.fillStyle = '#93c5fd';
                      ctx.fillText('IN THE MOON\'S SHADOW', 10, occluded ? 42 : 28);
                    }
                    // Comms \u2014 silenced during loss of signal.
                    if (!occluded) {
                      var orbitComms = ['Houston: "You are GO for undocking."', 'CMP: "I\'ll keep Columbia warm for you."', 'CDR: "The landing site looks smooth."', 'LMP: "Eagle systems nominal."', 'Houston: "Reacquired you coming around the limb."'];
                      var ocIdx = Math.floor(tick / 250) % orbitComms.length;
                      ctx.globalAlpha = Math.min(1, (tick % 250) < 200 ? (tick % 250) / 30 : (250 - tick % 250) / 50) * 0.6;
                      ctx.font = 'italic 9px system-ui'; ctx.fillStyle = '#a5b4fc'; ctx.textAlign = 'center';
                      ctx.fillText(orbitComms[ocIdx], W * 0.5, HO - 10);
                    }
                    ctx.globalAlpha = 1;
                    drawVignette(ctx, W, HO, 0.2);
                    if (document.contains(cvEl)) requestAnimationFrame(drawOrbit);
                  }
                  drawOrbit();
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-slate-700' },
              h('div', { id: 'mm-lunar-orbit-description', className: 'grid grid-cols-2 gap-2 mb-2' },
                [
                  ['\uD83C\uDF15 Landing Site', 'Mare Tranquillitatis'],
                  ['\uD83D\uDCCD Coordinates', '0.674\u00B0N, 23.473\u00B0E'],
                  ['\uD83D\uDE80 LM "Eagle"', 'CDR + LMP aboard'],
                  ['\uD83D\uDEF0 CM "Columbia"', 'CMP orbiting solo']
                ].map(function(item) {
                  return h('div', { key: item[0], className: 'bg-slate-800 rounded p-1.5' },
                    h('p', { className: 'text-[0.6875rem] text-slate-400' }, item[0]),
                    h('p', { className: 'text-[0.6875rem] font-bold text-slate-200' }, item[1])
                  );
                })
              ),
              h('p', { className: 'text-[0.6875rem] text-slate-300 mb-2', 'data-moonmission-lunar-morning': 'true' },
                t('stem.moonmission.lunar_morning_note', 'Lunar morning: Apollo 11 landed with the Sun about 11 degrees above the site, so the sunrise line lies just west of it and long shadows show every boulder and crater. From Earth that day the Moon was a six-day-old crescent.')),
              h('button', { type: 'button', 'aria-pressed': d.moonLabels ? 'true' : 'false', 'data-moonmission-moon-labels': 'true',
                onClick: function() { upd('moonLabels', !d.moonLabels); },
                className: 'w-full min-h-[44px] px-3 rounded-lg border text-xs font-bold transition-colors ' +
                  (d.moonLabels ? 'border-amber-400 bg-amber-400/15 text-amber-100' : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-amber-400') },
                t('stem.moonmission.moon_map_toggle', '\uD83D\uDDFA\uFE0F Show the seas and every Apollo landing site')),
              d.moonLabels && h('div', { className: 'mt-2 rounded-lg bg-slate-800 p-2 text-[0.6875rem] text-slate-200', 'data-moonmission-moon-sites': 'true' },
                h('p', { className: 'text-amber-200 font-bold mb-1' },
                  t('stem.moonmission.moon_map_note', 'All six landings were on the near side, the half that always faces Earth, so the crew could always talk to Houston.')),
                h('ul', { className: 'grid grid-cols-2 gap-x-3 gap-y-0.5' },
                  MM_MOON_SITES.map(function(site) {
                    return h('li', { key: site.m }, h('span', { className: 'font-mono font-bold text-amber-200' }, 'Apollo ' + site.m), ' \u2014 ' + site.name);
                  })))
            )
          ),
          (function() {
            var os = d.orbitStatus || 'loi';
            return phaseStatus(os === 'ready',
              os === 'loi' ? 'Lunar orbit insertion \u2014 the big SPS engine fires behind the Moon to slow you enough to be captured.'
                : os === 'los' ? 'Loss of signal. Behind the Moon there is no line of sight to Earth, so every Apollo crew went quiet here for about 45 minutes.'
                : 'Around the limb and back in contact. Watch for Earthrise, and for the landing site coming into view on the near side.',
              'One full orbit surveyed. Tranquility Base looks smooth \u2014 GO for undocking.');
          })(),
          h('button', {
            title: t('stem.moonmission.undock_lunar_module_eagle_from_command', 'Undock Lunar Module Eagle from Command Module Columbia and begin powered descent to the Moon surface'),
            disabled: eventPending,
                onClick: function() {
                  if (!canProceed()) return;
              advancePhase(5);
              log('\u2B07\uFE0F Undocked from Columbia. Beginning powered descent.');
              addXP(15);
              if (addToast) addToast('\u2B07\uFE0F "The Eagle has undocked!" Beginning powered descent.', 'success');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-700 hover:to-orange-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
          }, t('stem.moonmission.undock_begin_powered_descent', '\u2B07\uFE0F Undock & Begin Powered Descent'))
        ),

        // ═══ PHASE 5: POWERED DESCENT ═══
        phase === 5 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          predictCard('descent_sideways', !!d.landingResult),
          // Onboarding overlay (before game starts)
          !d.descentStarted && h('div', { className: 'bg-gradient-to-b from-slate-900 to-indigo-950 rounded-xl p-5 border border-slate-700 text-white text-center' },
            h('div', { className: 'text-4xl mb-3' }, '\u2B07\uFE0F'),
            h('h4', { className: 'text-lg font-black mb-2' }, t('stem.moonmission.powered_descent_2', 'Powered Descent')),
            h('p', { className: 'text-xs text-slate-200 mb-4' }, 'The computer has flown the braking phase down from 15 km. You take the controls 300 m up, as Armstrong did at about 140 m, and land it yourself. Fuel is counted in seconds of hover, the way Apollo counted it.'),
            h('div', { className: 'grid grid-cols-3 gap-3 mb-4 max-w-sm mx-auto' },
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '\u2B06\uFE0F'),
                h('p', { className: 'text-[0.6875rem] font-bold text-sky-300' }, t('stem.moonmission.w', 'W / \u2191')),
                h('p', { className: 'text-[0.6875rem] text-slate-400' }, t('stem.moonmission.fire_engines_thrust_up', 'Fire engines (thrust UP)'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '\u2194\uFE0F'),
                h('p', { className: 'text-[0.6875rem] font-bold text-sky-300' }, t('stem.moonmission.a_d_or', 'A/D or \u2190/\u2192')),
                h('p', { className: 'text-[0.6875rem] text-slate-400' }, t('stem.moonmission.lateral_movement', 'Tilt the engine to push sideways (burns fuel)'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '\uD83C\uDFAF'),
                h('p', { className: 'text-[0.6875rem] font-bold text-amber-300' }, t('stem.moonmission.goal', 'Goal')),
                h('p', { className: 'text-[0.6875rem] text-slate-400' }, t('stem.moonmission.v_3_m_s_h_5_m_s', 'V < 3 m/s, H < 5 m/s'))
              )
            ),
            h('p', { className: 'text-[0.6875rem] text-sky-300 mb-4' },
              t('stem.moonmission.descent_touch_hint', '\uD83D\uDC46 No keyboard? The same three controls sit along the bottom of the flight view \u2014 hold them with a finger or the mouse.')),
            // Carry the coast decision forward in words, not just in the numbers. A
            // student who declined the correction should not have to work out for
            // themselves why the ground is moving faster than the briefing implied.
            d.mccChoice && h('div', { className: 'rounded-lg p-3 border mb-4 max-w-sm mx-auto ' +
              (d.mccChoice === 'corrected' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-orange-500/10 border-orange-500/30') },
              h('p', { className: 'text-[0.6875rem] font-bold ' + (d.mccChoice === 'corrected' ? 'text-emerald-300' : 'text-orange-300') },
                d.mccChoice === 'corrected'
                  ? '\uD83D\uDEE0\uFE0F You burned the mid-course correction with the Service Module\'s engine, so you arrive on the nominal path with the full landing fuel budget.'
                  : '\u27A1\uFE0F You declined the correction, so the descent computer had to steer out the error during braking: ' + MM_DESCENT.skipFuel + ' fewer seconds of hover fuel, and ' + MM_DESCENT.skipDrift + ' m/s more drift to cancel.')
            ),
            (function() {
              var ec = mmEventCosts(d.decisionLog);
              if (!ec.items.length) return null;
              return h('div', { className: 'rounded-lg p-3 border mb-4 max-w-sm mx-auto bg-orange-500/10 border-orange-500/30 text-left', 'data-moonmission-event-costs': 'true' },
                h('p', { className: 'text-[0.6875rem] font-bold text-orange-300 mb-1' }, t('stem.moonmission.event_costs_title', 'Your calls on the way down change this landing:')),
                h('ul', { className: 'list-disc pl-4 space-y-0.5' },
                  ec.items.map(function(it, i) {
                    return h('li', { key: i, className: 'text-[0.6875rem] text-orange-100' }, h('span', { className: 'font-bold' }, it.title + ': '), it.note + '.');
                  })));
            })(),
            h('div', { className: 'bg-amber-500/10 rounded-lg p-3 border border-amber-500/20 mb-4 max-w-sm mx-auto' },
              h('p', { className: 'text-[0.6875rem] text-amber-300 font-bold mb-1' }, t('stem.moonmission.tips_from_mission_control', '\u26A0\uFE0F Tips from Mission Control:')),
              h('ul', { className: 'text-[0.6875rem] text-amber-200 space-y-1 text-left pl-4' },
                h('li', null, t('stem.moonmission.start_slowing_down_early_moon_gravity_', 'Start slowing down early \u2014 Moon gravity is gentle but relentless')),
                h('li', null, t('stem.moonmission.watch_your_fuel_gauge_you_can_t_thrust', 'Watch your fuel gauge \u2014 you can\'t thrust without fuel!')),
                h('li', null, t('stem.moonmission.reduce_horizontal_speed_before_focusin', 'Reduce horizontal speed before focusing on vertical')),
                h('li', null, t('stem.moonmission.the_real_apollo_11_landed_with_only_25', 'Apollo 11 touched down just after Houston called "30 seconds" of fuel left.'))
              )
            ),
            h('button', {
              title: t('stem.moonmission.begin_powered_descent_piloting', 'Begin powered descent piloting'),
              onClick: function() { upd('descentStarted', true); },
              className: 'px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-700 hover:to-orange-700 shadow-lg transition-all hover:scale-[1.02]'
            }, t('stem.moonmission.begin_descent_take_the_controls', '\uD83D\uDE80 Begin Descent \u2014 Take the Controls!'))
          ),
          // Game canvas (after onboarding)
          d.descentStarted && h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '420px' } },
              h('canvas', { 
                'data-descent-canvas': 'true',
                role: 'application',
                'aria-label': t('stem.moonmission.interactive_lunar_descent_piloting_gam', 'Interactive lunar descent piloting game. Use W or Up Arrow for thrust, A and D or Left and Right arrows to tilt the engine and push sideways. Land with vertical speed under 3 meters per second and horizontal speed under 5 meters per second.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._descentInit) return;
                  cvEl._descentInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, H = cvEl.offsetHeight || 420;
                  cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== H)) { W = nw; H = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); if (d3) d3.resize(nw, nh); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  // ── Real time, from the hand-over ──
                  // The old game started at 15 km and integrated altitude with a different
                  // time step from speed (alt += vVel * 0.5 per 1/60 s step), so "down 3 m/s" had nothing
                  // to do with how fast the ground came up: 100 m at 3 m/s was followed by
                  // touchdown 1.1 s later. Now the whole approach runs at real speed.
                  var alt = MM_DESCENT.handoverAlt;
                  var vVel = MM_DESCENT.handoverVv;   // negative = descending
                  // ── Where the trans-lunar decisions actually land ──
                  // A correction burned on the coast used the Service Module's engine and
                  // costs the landing nothing. Declining it leaves an error the descent
                  // computer has to steer out during braking: less hover fuel at the
                  // hand-over and extra drift to cancel. Cheap early, expensive late.
                  var _mcc = d.mccChoice || null;
                  var _evCost = mmEventCosts(d.decisionLog);   // the 1202 and boulder-field choices
                  var hVel = MM_DESCENT.handoverHv + (_mcc === 'skipped' ? MM_DESCENT.skipDrift : 0) + _evCost.drift;
                  var fuel = Math.max(10, ((diffSettings && diffSettings.fuel) || MM_DESCENT.pilotFuel) - (_mcc === 'skipped' ? MM_DESCENT.skipFuel : 0) - _evCost.fuel);   // seconds of hover
                  var _calloutBandIdx = 0;
                  var _fuelCallIdx = 0;
                  while (_fuelCallIdx < MM_FUEL_CALLS.length && MM_FUEL_CALLS[_fuelCallIdx] >= fuel) _fuelCallIdx++;
                  var thrust = 0;
                  var landed = false;
                  var crashed = false;
                  var landingRecorded = false;   // outcome is written to state exactly once
                  // Attitude. A rocket has no sideways thruster worth the name: it TILTS and
                  // points its main engine, so the same burn that holds you up also pushes
                  // you across. The LM used to slide laterally bolt upright, like a lift,
                  // which hides the one idea the descent is actually teaching.
                  var tilt = 0;
                  // Ground track. The physics only ever knew a horizontal SPEED;
                  // nothing integrated it into a position, because a fixed side-on
                  // view had nowhere to put one. The 3D ground needs it to slide.
                  var groundX = 0, groundZ = 0;
                  // Fixed-step accumulator. The descent used to advance one physics
                  // step per FRAME, which tied a graded piloting task to the refresh
                  // rate: the same flight scored differently on a fast machine than a
                  // slow one, and adding the 3D world was enough to change the outcome.
                  var _physLast = 0;            // ms timestamp of the last integration
                  var _physAcc = 0;             // unspent milliseconds
                  var PHYS_STEP_MS = 1000 / 60; // one step = the old per-frame step
                  var PHYS_MAX_STEPS = 6;       // cap catch-up after a stall or a hidden tab
                  // The 3D scene, when it is available. Null means WebGL was refused
                  // or Three never loaded, and the 2D world below keeps painting.
                  var d3 = null;
                  var d3Failed = false;
                  var d3Ready = false;   // Three is present; the loop attaches on its next frame
                  var _d3Retried = false; // one rebuild after a context restore, then stay 2D

                  // Controls
                  var keys = {};
                  var padCtl = { thrust: false, left: false, right: false };   // on-screen pad, same effect as the keys
                  cvEl.tabIndex = 0;
                  cvEl.addEventListener('keydown', function(e) { var k = e.key.toLowerCase(); if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].indexOf(k) === -1) return; keys[k] = true; e.preventDefault(); });   // only game keys — Tab must escape (WCAG 2.1.2)
                  cvEl.addEventListener('keyup', function(e) { keys[String(e.key).toLowerCase()] = false; });
                  // Case-folded, and released when focus leaves: releasing Shift before W,
                  // or tabbing away mid-burn, left the engine firing with nobody at the stick.
                  cvEl.addEventListener('blur', function() { keys = {}; });
                  cvEl.focus();

                  // ── Flight callouts ──
                  // A caption strip, not a decoration: it is the only altitude and rate
                  // feedback outside the canvas, so it carries the phase for anyone using
                  // a screen reader and gives everyone else something readable to fly by.
                  // Under the flight view, not on it: the canvas corners already carry the
                  // altitude HUD and the thrust gauge, and on a phone an overlaid caption
                  // runs straight through both.
                  var calloutEl = null;
                  var _dFooter = null;
                  try {
                    _dFooter = cvEl.parentElement && cvEl.parentElement.parentElement
                      ? cvEl.parentElement.parentElement.querySelector('[data-descent-footer]') : null;
                  } catch (_dfErr) {}
                  var _calloutHost = _dFooter || cvEl.parentElement;
                  if (_calloutHost && !_calloutHost.querySelector('[data-descent-callout]')) {
                    calloutEl = document.createElement('div');
                    calloutEl.setAttribute('data-descent-callout', 'true');
                    calloutEl.setAttribute('role', 'status');
                    calloutEl.setAttribute('aria-live', 'polite');
                    // flex-basis 100% claims its own line in the footer's wrapping flex row.
                    calloutEl.style.cssText = 'flex:1 0 100%;order:-1;text-align:center;font:700 12px/1.4 system-ui;' +
                      'color:#bae6fd;background:rgba(2,6,23,0.6);border:1px solid rgba(56,189,248,0.25);' +
                      'border-radius:8px;padding:5px 8px;margin-bottom:2px';
                    _calloutHost.insertBefore(calloutEl, _calloutHost.firstChild);
                  }
                  var _lastCallout = '';
                  function callout(text) {
                    if (text === _lastCallout) return;
                    _lastCallout = text;
                    if (calloutEl) calloutEl.textContent = text;
                  }
                  callout('You have control: ' + Math.round(alt) + ' m up, down ' + Math.abs(vVel).toFixed(1) + ' m/s, drifting '
                    + Math.abs(hVel).toFixed(1) + ' m/s, ' + Math.round(fuel) + ' s of fuel. The computer flew the braking phase from 15 km, through program alarms 1202 and 1201.');

                  // ── On-screen flight controls ──
                  // Shown to everyone, not just touch devices: the landing was the one
                  // graded piloting task in the mission and it could only be flown from a
                  // keyboard. React removes this with the canvas's own wrapper when the
                  // descent unmounts (Retry Landing), so it needs no separate teardown.
                  if (cvEl.parentElement && !cvEl.parentElement.querySelector('[data-descent-pad]')) {
                    var dPad = mmPadRow('Lunar Module flight controls');
                    dPad.setAttribute('data-descent-pad', 'true');
                    var dSize = (cvEl.offsetWidth || W) < 560 ? 52 : 44;
                    var bLeft = mmHoldButton('\u25C0', 'Tilt left \u2014 push sideways to the left. Same as the A or Left Arrow key.', dSize,
                      function() { padCtl.left = true; }, function() { padCtl.left = false; });
                    var bThrust = mmHoldButton('\uD83D\uDD25 THRUST', 'Fire the descent engine. Same as the W or Up Arrow key.', dSize,
                      function() { padCtl.thrust = true; }, function() { padCtl.thrust = false; });
                    var bRight = mmHoldButton('\u25B6', 'Tilt right \u2014 push sideways to the right. Same as the D or Right Arrow key.', dSize,
                      function() { padCtl.right = true; }, function() { padCtl.right = false; });
                    bThrust.style.minWidth = (dSize * 2.4) + 'px';
                    bThrust.style.borderColor = 'rgba(251,191,36,0.75)';
                    dPad.appendChild(bLeft); dPad.appendChild(bThrust); dPad.appendChild(bRight);
                    cvEl.parentElement.appendChild(dPad);
                  }

                  function drawDescent() {
                    // After touchdown the loop only ticks on a timer and writes nothing to
                    // the DOM, so the parent-watching MutationObserver never fired and Retry
                    // Landing / Begin EVA left the WebGL context behind.
                    if (!document.contains(cvEl)) { if (d3) { try { d3.dispose(); } catch (_goneErr) {} d3 = null; } return; }
                    tick++;
                    // Attach here rather than in the ref: by the first frame React has
                    // committed and the canvas is really in the document.
                    if (d3Ready && !d3 && !d3Failed && cvEl.dataset.descent3d !== 'lost') bootDescent3D(window.THREE);
                    ctx.clearRect(0, 0, W, H);

                    // How many fixed steps does the elapsed wall-clock time buy?
                    var _now = (typeof performance !== 'undefined' && performance.now)
                      ? performance.now() : Date.now();
                    if (!_physLast) _physLast = _now;
                    var _elapsed = _now - _physLast;
                    _physLast = _now;
                    // A hidden tab or a long stall must not return and fly the whole
                    // descent in one frame.
                    if (_elapsed > 250) _elapsed = PHYS_STEP_MS;
                    _physAcc += _elapsed;
                    var _steps = Math.floor(_physAcc / PHYS_STEP_MS);
                    if (_steps > PHYS_MAX_STEPS) _steps = PHYS_MAX_STEPS;
                    _physAcc -= _steps * PHYS_STEP_MS;

                    for (var _ps = 0; _ps < _steps && !landed && !crashed; _ps++) {
                      // Controls: up arrow = thrust, left/right = horizontal adjust
                      // Sideways used to be free: the keys added 0.5 m/s a step with no
                      // thrust and no fuel, and hVel *= 0.999 bled drift away like air
                      // drag on an airless Moon. Now the only sideways force is the tilted
                      // main engine, so declining the mid-course correction really costs.
                      var _in = {
                        thrust: !!(padCtl.thrust || keys['arrowup'] || keys['w']),
                        left: !!(padCtl.left || keys['arrowleft'] || keys['a']),
                        right: !!(padCtl.right || keys['arrowright'] || keys['d'])
                      };

                      // Publish the flight state next to the canvas. The HUD is painted
                      // pixels, so without this nothing outside the loop can see the
                      // landing at all — including a test asking whether a control
                      // actually reaches the physics.
                      var _dsAlt = Math.max(0, Math.round(alt));
                      if (cvEl.dataset.descentAlt !== String(_dsAlt)) cvEl.dataset.descentAlt = String(_dsAlt);
                      var _dsV = vVel.toFixed(1);
                      if (cvEl.dataset.descentVspeed !== _dsV) cvEl.dataset.descentVspeed = _dsV;
                      var _dsH = hVel.toFixed(1);
                      if (cvEl.dataset.descentHspeed !== _dsH) cvEl.dataset.descentHspeed = _dsH;
                      var _dsF = Math.max(0, Math.round(fuel));
                      if (cvEl.dataset.descentFuel !== String(_dsF)) cvEl.dataset.descentFuel = String(_dsF);
                      var _dsT = thrust.toFixed(2);
                      if (cvEl.dataset.descentThrust !== _dsT) cvEl.dataset.descentThrust = _dsT;

                      // Integrate the ground track the 3D terrain slides along, at about
                      // 0.6 scene units per metre, the scale the scene has near the ground.
                      groundX += hVel * (PHYS_STEP_MS / 1000) * 0.6;

                      // Callouts fire when a line is CROSSED, not whenever a live number
                      // changes: the old strip re-announced ~30 times a second (it printed
                      // integer drift) and printed the band floor ("5,000 m") while the HUD
                      // read 8.7 km. Apollo's shape: how high, how fast down, how fast across,
                      // and the fuel calls.
                      var rate = Math.abs(vVel).toFixed(1);
                      var lateral = Math.abs(hVel).toFixed(1);
                      var _bandHit = null, _fuelHit = null;
                      while (_calloutBandIdx < MM_CALLOUT_BANDS.length && alt <= MM_CALLOUT_BANDS[_calloutBandIdx]) { _bandHit = MM_CALLOUT_BANDS[_calloutBandIdx]; _calloutBandIdx++; }
                      while (_fuelCallIdx < MM_FUEL_CALLS.length && fuel <= MM_FUEL_CALLS[_fuelCallIdx]) { _fuelHit = MM_FUEL_CALLS[_fuelCallIdx]; _fuelCallIdx++; }
                      if (_fuelHit === 0) {
                        callout('\u26A0 FUEL GONE \u2014 no thrust left. ' + Math.round(alt) + ' m up, falling at ' + rate + ' m/s.');
                      } else if (_fuelHit != null) {
                        callout('\u26A0 ' + _fuelHit + ' SECONDS of fuel \u2014 ' + Math.round(alt) + ' m up, down ' + rate + ' m/s.');
                      } else if (_bandHit != null) {
                        callout(_bandHit + ' m \u2014 down ' + rate + ' m/s, drifting ' + lateral + ' m/s' + (_bandHit <= 50 ? '. Under 3 and 5 to land.' : '.'));
                      }

                      // Physics: one real-time step, the same function the tests fly.
                      var _st = { alt: alt, vVel: vVel, hVel: hVel, fuel: fuel, thrust: thrust, tilt: tilt };
                      mmDescentStep(_st, _in, PHYS_STEP_MS / 1000);
                      alt = _st.alt; vVel = _st.vVel; hVel = _st.hVel; fuel = _st.fuel; thrust = _st.thrust; tilt = _st.tilt;

                      // Landing check
                      if (alt <= 0) {
                        alt = 0;
                        var _vAbs = Math.abs(vVel), _hAbs = Math.abs(hVel);
                        if (_vAbs < 3 && _hAbs < 5) {
                          landed = true;
                          callout('\uD83C\uDF15 CONTACT LIGHT \u2014 touchdown at ' + _vAbs.toFixed(1) + ' m/s, drift '
                            + _hAbs.toFixed(1) + ' m/s, ' + Math.round(fuel) + ' s of fuel left. The Eagle has landed.');
                          if (typeof announceToSR === 'function') announceToSR('Touchdown. Vertical speed ' + _vAbs.toFixed(1)
                            + ' meters per second, lateral drift ' + _hAbs.toFixed(1) + '. The Eagle has landed.');
                        } else {
                          crashed = true;
                          // Name the limit that was actually broken — "you crashed" teaches
                          // nothing, "you were coming down at 7, the limit is 3" teaches the
                          // next attempt.
                          var _why = _vAbs >= 3 && _hAbs >= 5
                            ? 'coming down at ' + _vAbs.toFixed(1) + ' m/s and sliding at ' + _hAbs.toFixed(1) + ' m/s (limits are 3 and 5)'
                            : _vAbs >= 3
                              ? 'coming down at ' + _vAbs.toFixed(1) + ' m/s \u2014 the limit is 3'
                              : 'sliding sideways at ' + _hAbs.toFixed(1) + ' m/s \u2014 the limit is 5';
                          callout('\uD83D\uDCA5 HARD LANDING \u2014 ' + _why + '. Press Retry Landing to fly it again.');
                          if (typeof announceToSR === 'function') announceToSR('Hard landing. You were ' + _why + '. Press Retry Landing to try again.');
                        }
                      }
                    }

                    // ── World ──
                    // With the 3D scene live the canvas holds only the HUD, so it must
                    // be CLEARED rather than filled: a fill would paint over the WebGL
                    // canvas behind it and hide the very thing it was added for.
                    if (d3) {
                      // clearRect, not a fill: the opaque fill below doubled as this
                      // loop's frame clear, and with the 3D scene behind the HUD the
                      // canvas has to end up TRANSPARENT rather than black.
                      ctx.clearRect(0, 0, W, H);
                      d3.update({
                        alt: alt, tilt: tilt, thrust: thrust, fuel: fuel,
                        groundX: groundX, groundZ: groundZ, tick: tick, done: landed || crashed
                      });
                    }
                    if (!d3) {
                    // Background: black space + Moon surface below
                    ctx.fillStyle = '#000005';
                    ctx.fillRect(0, 0, W, H);
                    // Enhanced starfield (upper portion of canvas only)
                    ctx.save();
                    ctx.beginPath(); ctx.rect(0, 0, W, H * 0.45); ctx.clip();
                    drawStarfield(ctx, W, H * 0.45, tick, 80);
                    ctx.restore();

                    // Moon surface (rises as altitude drops)
                    var surfaceY = H * 0.5 + Math.min(H * 0.45, (alt / 15000) * H * 0.45);
                    // ── Moon surface (gradient with procedural craters + boulders) ──
                    var surfGrad = ctx.createLinearGradient(0, surfaceY, 0, H);
                    surfGrad.addColorStop(0, '#9a9288'); surfGrad.addColorStop(0.3, '#8a8278'); surfGrad.addColorStop(1, '#6a6258');
                    ctx.fillStyle = surfGrad;
                    ctx.fillRect(0, surfaceY, W, H - surfaceY);
                    // Procedural craters (seeded so they're stable)
                    var sRng = _seededRand(314);
                    if (surfaceY < H - 10) {
                      for (var ci = 0; ci < 16; ci++) {
                        var crX = sRng.next() * W;
                        var crY = surfaceY + 5 + sRng.next() * Math.max(5, (H - surfaceY) * 0.7);
                        var crR = 3 + sRng.next() * 12;
                        // Shadow
                        ctx.fillStyle = 'rgba(80,70,60,0.3)';
                        ctx.beginPath(); ctx.arc(crX, crY, crR, 0, Math.PI * 2); ctx.fill();
                        // Bright rim (upper-left)
                        ctx.strokeStyle = 'rgba(180,170,160,0.25)';
                        ctx.lineWidth = Math.max(0.5, crR * 0.12);
                        ctx.beginPath(); ctx.arc(crX, crY, crR, -2.5, -0.8); ctx.stroke();
                      }
                      // Scattered boulders
                      ctx.fillStyle = 'rgba(100,90,80,0.4)';
                      for (var bi = 0; bi < 8; bi++) {
                        var bx = sRng.next() * W;
                        var by = surfaceY + 3 + sRng.next() * Math.max(3, (H - surfaceY) * 0.5);
                        var br = 1 + sRng.next() * 3;
                        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
                      }
                    }

                    // ── Enhanced Lunar Module ──
                    var lmX = W * 0.5, lmY = Math.min(surfaceY - 18, H * 0.5);
                    // Everything from here to the end of the exhaust plume is drawn in the
                    // vehicle's own tilted frame, so the engine bell and flame point where
                    // the thrust actually goes.
                    ctx.save();
                    ctx.translate(lmX, lmY);
                    ctx.rotate(tilt);
                    ctx.translate(-lmX, -lmY);
                    // Descent stage (octagonal gold foil)
                    ctx.fillStyle = '#c9a04a';
                    ctx.beginPath();
                    ctx.moveTo(lmX - 14, lmY + 3); ctx.lineTo(lmX - 12, lmY); ctx.lineTo(lmX + 12, lmY);
                    ctx.lineTo(lmX + 14, lmY + 3); ctx.lineTo(lmX + 14, lmY + 13);
                    ctx.lineTo(lmX + 12, lmY + 16); ctx.lineTo(lmX - 12, lmY + 16); ctx.lineTo(lmX - 14, lmY + 13);
                    ctx.closePath(); ctx.fill();
                    // Gold foil texture lines
                    ctx.strokeStyle = 'rgba(160,120,40,0.3)'; ctx.lineWidth = 0.5;
                    for (var fl = 0; fl < 3; fl++) {
                      ctx.beginPath(); ctx.moveTo(lmX - 12, lmY + 4 + fl * 4); ctx.lineTo(lmX + 12, lmY + 4 + fl * 4); ctx.stroke();
                    }
                    // Ascent stage (angular silver with facets)
                    ctx.fillStyle = '#c8c8c8';
                    ctx.beginPath();
                    ctx.moveTo(lmX - 11, lmY); ctx.lineTo(lmX - 9, lmY - 16);
                    ctx.lineTo(lmX + 9, lmY - 16); ctx.lineTo(lmX + 11, lmY);
                    ctx.closePath(); ctx.fill();
                    // Facet shading
                    ctx.fillStyle = 'rgba(0,0,0,0.06)';
                    ctx.beginPath(); ctx.moveTo(lmX, lmY); ctx.lineTo(lmX + 9, lmY - 16); ctx.lineTo(lmX + 11, lmY); ctx.closePath(); ctx.fill();
                    // Triangular windows (like real LM)
                    ctx.fillStyle = '#1a2a3a';
                    ctx.beginPath(); ctx.moveTo(lmX - 5, lmY - 12); ctx.lineTo(lmX - 2, lmY - 6); ctx.lineTo(lmX - 8, lmY - 6); ctx.closePath(); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(lmX + 5, lmY - 12); ctx.lineTo(lmX + 2, lmY - 6); ctx.lineTo(lmX + 8, lmY - 6); ctx.closePath(); ctx.fill();
                    // Antenna dish on top
                    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.8;
                    ctx.beginPath(); ctx.moveTo(lmX + 2, lmY - 16); ctx.lineTo(lmX + 2, lmY - 22); ctx.stroke();
                    ctx.beginPath(); ctx.arc(lmX + 2, lmY - 22, 3, Math.PI, 0); ctx.stroke();
                    // RCS quads (small rectangles on corners)
                    ctx.fillStyle = '#999';
                    ctx.fillRect(lmX - 13, lmY - 10, 3, 4);
                    ctx.fillRect(lmX + 10, lmY - 10, 3, 4);
                    // 4 Legs (spread outward)
                    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(lmX - 14, lmY + 14); ctx.lineTo(lmX - 24, lmY + 27);
                    ctx.moveTo(lmX + 14, lmY + 14); ctx.lineTo(lmX + 24, lmY + 27);
                    ctx.moveTo(lmX - 6, lmY + 16); ctx.lineTo(lmX - 10, lmY + 27);
                    ctx.moveTo(lmX + 6, lmY + 16); ctx.lineTo(lmX + 10, lmY + 27);
                    ctx.stroke();
                    // Foot pads (circles)
                    ctx.fillStyle = '#888';
                    ctx.beginPath(); ctx.arc(lmX - 24, lmY + 28, 2.5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(lmX + 24, lmY + 28, 2.5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(lmX - 10, lmY + 28, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(lmX + 10, lmY + 28, 2, 0, Math.PI * 2); ctx.fill();
                    // ── Descent engine flame (dual envelope) ──
                    if (thrust > 0.1 && fuel > 0) {
                      var fLen = 12 + thrust * 28 + Math.random() * 5;
                      var fW = 4 + thrust * 3;
                      // Outer flame
                      var fOutGrad = ctx.createLinearGradient(lmX, lmY + 16, lmX, lmY + 16 + fLen);
                      fOutGrad.addColorStop(0, 'rgba(255,130,0,0.7)'); fOutGrad.addColorStop(0.5, 'rgba(255,60,0,0.3)'); fOutGrad.addColorStop(1, 'rgba(200,0,0,0)');
                      ctx.fillStyle = fOutGrad;
                      ctx.beginPath();
                      ctx.moveTo(lmX - fW, lmY + 16);
                      ctx.quadraticCurveTo(lmX - fW * 0.5, lmY + 16 + fLen * 0.4, lmX, lmY + 16 + fLen);
                      ctx.quadraticCurveTo(lmX + fW * 0.5, lmY + 16 + fLen * 0.4, lmX + fW, lmY + 16);
                      ctx.fill();
                      // Inner core
                      var fInGrad = ctx.createLinearGradient(lmX, lmY + 16, lmX, lmY + 16 + fLen * 0.65);
                      fInGrad.addColorStop(0, 'rgba(255,255,255,0.9)'); fInGrad.addColorStop(0.4, 'rgba(255,230,80,0.5)'); fInGrad.addColorStop(1, 'rgba(255,180,0,0)');
                      ctx.fillStyle = fInGrad;
                      ctx.beginPath();
                      ctx.moveTo(lmX - fW * 0.3, lmY + 16);
                      ctx.quadraticCurveTo(lmX, lmY + 16 + fLen * 0.3, lmX, lmY + 16 + fLen * 0.65);
                      ctx.quadraticCurveTo(lmX, lmY + 16 + fLen * 0.3, lmX + fW * 0.3, lmY + 16);
                      ctx.fill();
                    }
                    ctx.restore();   // ── end of the vehicle's tilted frame ──
                    // Surface dust, drawn in WORLD space: the regolith does not bank with
                    // the spacecraft. It also blows downrange of the tilt, because that is
                    // where the plume is now pointing.
                    if (thrust > 0.1 && fuel > 0 && alt < 200 && surfaceY < H) {
                      ctx.globalAlpha = 0.15 * (1 - alt / 200);
                      ctx.fillStyle = '#b0a898';
                      for (var di = 0; di < 6; di++) {
                        var dx = lmX + Math.sin(tilt) * 34 + (Math.random() - 0.5) * 60;
                        var dy = surfaceY + 2 + Math.random() * 8;
                        ctx.beginPath(); ctx.arc(dx, dy, 3 + Math.random() * 6, 0, Math.PI * 2); ctx.fill();
                      }
                      ctx.globalAlpha = 1;
                    }
                    }   // ── end of the 2D world fallback ──

                    // HUD
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(6, 6, 140, 100);
                    ctx.fillRect(W - 146, W < 305 ? 110 : 6, 140, 80);   // tracks the right HUD's narrow-screen drop
                    ctx.font = 'bold 9px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillStyle = '#38bdf8'; ctx.fillText('ALTITUDE', 12, 18);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace';
                    ctx.fillText(alt > 1000 ? (alt / 1000).toFixed(2) + ' km' : alt.toFixed(1) + ' m', 12, 34);
                    ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#38bdf8'; ctx.fillText('V/SPEED', 12, 48);
                    ctx.fillStyle = vVel < -5 ? '#ef4444' : '#22c55e'; ctx.font = '12px monospace';
                    ctx.fillText(vVel.toFixed(1) + ' m/s', 12, 60);
                    ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#38bdf8'; ctx.fillText('H/SPEED', 12, 74);
                    ctx.fillStyle = '#fff'; ctx.font = '12px monospace';
                    ctx.fillText(hVel.toFixed(1) + ' m/s', 12, 86);
                    ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 9px monospace'; ctx.fillText('FUEL', 12, 100);
                    ctx.fillStyle = fuel < 30 ? '#ef4444' : fuel < 60 ? '#fbbf24' : '#22c55e'; ctx.font = '12px monospace';
                    ctx.fillText(Math.max(0, fuel).toFixed(0) + ' s', 50, 100);

                    // Right HUD \u2014 drops below the left panel on narrow canvases so the
                    // two fixed-width boxes can't overlap (they collided under ~305px).
                    ctx.save();
                    if (W < 305) ctx.translate(0, 104);
                    ctx.textAlign = 'right';
                    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 9px monospace'; ctx.fillText('THRUST', W - 12, 18);
                    ctx.fillStyle = '#1e293b'; ctx.fillRect(W - 136, 22, 120, 8);
                    ctx.fillStyle = '#fbbf24'; ctx.fillRect(W - 136, 22, 120 * thrust, 8);
                    ctx.fillStyle = '#94a3b8'; ctx.font = '9px system-ui';
                    ctx.fillText('\u2191 or W = thrust', W - 12, 46);
                    ctx.fillText('\u2190\u2192 or A/D = tilt', W - 12, 58);
                    ctx.fillText('Land: V < 3 m/s, H < 5 m/s', W - 12, 72);
                    ctx.restore();

                    // Outcome, on its own backing panel and fitted to the canvas width. At
                    // phone width the old centred lines, and a 1202 banner that blinked on
                    // from 500 m through touchdown, printed straight over both HUD boxes.
                    function outcomePanel(lines) {
                      var maxW = W - 24, y0 = H * 0.34;
                      ctx.save();
                      ctx.textAlign = 'center';
                      var fitted = lines.map(function (ln) {
                        var size = ln.size;
                        ctx.font = (ln.bold ? 'bold ' : '') + size + 'px system-ui';
                        while (size > 8 && ctx.measureText(ln.text).width > maxW - 16) {
                          size -= 1;
                          ctx.font = (ln.bold ? 'bold ' : '') + size + 'px system-ui';
                        }
                        return { text: ln.text, color: ln.color, font: ctx.font, size: size, w: ctx.measureText(ln.text).width };
                      });
                      var boxW = Math.min(maxW, Math.max.apply(null, fitted.map(function (f) { return f.w; })) + 24);
                      var boxH = fitted.reduce(function (a, f) { return a + f.size + 6; }, 14);
                      ctx.fillStyle = 'rgba(2,6,23,0.84)';
                      ctx.fillRect(W * 0.5 - boxW / 2, y0 - 8, boxW, boxH);
                      var y = y0;
                      fitted.forEach(function (f) { ctx.font = f.font; ctx.fillStyle = f.color; y += f.size; ctx.fillText(f.text, W * 0.5, y); y += 6; });
                      ctx.restore();
                    }

                    if (landed) {
                      var _score = mmLandingScore(Math.abs(vVel), Math.abs(hVel), fuel, _evCost.boulders);
                      // Persist the result once. It was computed and painted every frame but
                      // never left the canvas, so the debrief could not report how the student
                      // actually flew the landing, the one piloting task in the whole mission.
                      if (!landingRecorded) {
                        landingRecorded = true;
                        var _lr = { crashed: false, score: _score.total, grade: _score.grade, vVel: Math.abs(vVel), hVel: Math.abs(hVel), fuel: Math.round(fuel), fuelUnit: 's' };
                        upd('landingResult', _lr);
                        log('\uD83C\uDF15 Touchdown \u2014 landing score ' + _score.total + '/100 (grade ' + _score.grade + ')');
                        if (_score.total >= 80) addXP(20);
                        if (typeof announceToSR === 'function') announceToSR('The Eagle has landed. Vertical speed ' + Math.abs(vVel).toFixed(1) + ' meters per second, ' + Math.round(fuel) + ' seconds of fuel left. Landing score ' + _score.total + ' out of 100, grade ' + _score.grade + '.');
                      }
                      outcomePanel([
                        { text: '\uD83C\uDF15 "The Eagle has landed!"', size: 18, bold: true, color: '#22c55e' },
                        { text: 'Touchdown at ' + Math.abs(vVel).toFixed(1) + ' m/s, drift ' + Math.abs(hVel).toFixed(1) + ' m/s, ' + Math.round(fuel) + ' s of fuel left', size: 12, color: '#e2e8f0' },
                        { text: 'Landing score ' + _score.total + '/100 (grade ' + _score.grade + ')', size: 14, bold: true, color: _score.total >= 80 ? '#22c55e' : _score.total >= 50 ? '#fbbf24' : '#f97316' },
                        { text: _score.parts.map(function (p) { return p.label + ' ' + (p.pts < 0 ? String(p.pts) : '+' + p.pts); }).join('  |  '), size: 10, color: '#cbd5e1' },
                        { text: 'Begin EVA below to walk on the Moon.', size: 10, color: '#cbd5e1' }
                      ]);
                    }

                    if (crashed) {
                      if (!landingRecorded) {
                        landingRecorded = true;
                        var _cr = { crashed: true, score: 0, grade: '\u2014', vVel: Math.abs(vVel), hVel: Math.abs(hVel), fuel: Math.round(fuel), fuelUnit: 's' };
                        upd('landingResult', _cr);
                        log('\u26A0\uFE0F Hard landing \u2014 impact at ' + Math.abs(vVel).toFixed(1) + ' m/s (limit 3 m/s)');
                        if (typeof announceToSR === 'function') announceToSR('Hard landing. Impact at ' + Math.abs(vVel).toFixed(1) + ' meters per second against a 3 meter per second limit. Use Retry Landing to fly the descent again, or proceed to the moonwalk.');
                      }
                      outcomePanel([
                        { text: '\u26A0 HARD LANDING', size: 18, bold: true, color: '#f87171' },
                        { text: 'Impact at ' + Math.abs(vVel).toFixed(1) + ' m/s down, ' + Math.abs(hVel).toFixed(1) + ' m/s across (limits 3 and 5)', size: 12, color: '#fecaca' },
                        { text: 'Use Retry Landing below to fly it again.', size: 11, color: '#e2e8f0' }
                      ]);
                    }

                    if (!d3) drawVignette(ctx, W, H, 0.2);
                    if (!landed && !crashed && document.contains(cvEl)) requestAnimationFrame(drawDescent);
                    else {
                      // One more frame render for final state
                      setTimeout(function() { drawDescent(); }, 100);   // drawDescent returns (and releases the scene) once the canvas is gone
                    }
                  }
                  // ── Bring up the 3D world behind the HUD ──
                  // The HUD canvas must go transparent for the WebGL canvas beneath it
                  // to show through; it is opaque black by default.
                  function bootDescent3D(THREE) {
                    if (d3 || d3Failed || !document.contains(cvEl)) return;
                    var host = cvEl.parentElement;
                    if (!host) { d3Failed = true; return; }
                    // inset:0 resolves against the nearest POSITIONED ancestor. Without
                    // this the GL canvas escaped the 840x420 flight view and stretched
                    // across the whole page, rendering the scene off-frame.
                    var hostPos = '';
                    try { hostPos = window.getComputedStyle(host).position; } catch (_gsErr) {}
                    if (!hostPos || hostPos === 'static') host.style.position = 'relative';
                    // Size from the HUD canvas's own box, so the two layers cannot
                    // disagree about how big the flight view is.
                    var hudBox = cvEl.getBoundingClientRect();
                    var built = null;
                    try {
                      built = mmBuildDescent3D(THREE, host, {
                        width: Math.round(hudBox.width) || W,
                        height: Math.round(hudBox.height) || H
                      });
                    } catch (e) {
                      console.error('[MoonMission descent] 3D scene failed, staying 2D:', e);
                    }
                    if (!built) { d3Failed = true; return; }
                    d3 = built;
                    cvEl.style.background = 'transparent';
                    cvEl.style.position = 'relative';
                    cvEl.style.zIndex = '1';
                    cvEl.dataset.descent3d = 'on';

                    // ── WebGL context loss ──
                    // Without preventDefault the context can never be restored, and the
                    // flight view stays black behind a live HUD for the rest of a GRADED
                    // landing. Fall back to the 2D world immediately so the student keeps
                    // a picture; the physics never paused, so the landing stays valid.
                    var glc = built.canvas;
                    if (glc && !glc._mmLossBound) {
                      glc._mmLossBound = true;
                      glc.addEventListener('webglcontextlost', function (ev) {
                        // releaseGl force-loses a canvas after teardown removes it; that is a
                        // normal exit, not a failure. A real loss happens on a canvas still on the page.
                        if (!glc.isConnected) return;
                        ev.preventDefault();
                        console.warn('[MoonMission descent] WebGL context lost — falling back to the 2D view');
                        if (d3) { try { d3.dispose(); } catch (_clErr) {} d3 = null; }
                        cvEl.style.background = '';
                        cvEl.style.zIndex = '';
                        cvEl.dataset.descent3d = 'lost';
                      });
                      glc.addEventListener('webglcontextrestored', function () {
                        // Exactly one rebuild attempt. A scene that cannot come back
                        // should leave a flying 2D view, not thrash on every restore.
                        if (d3 || d3Failed || _d3Retried) return;
                        _d3Retried = true;
                        console.warn('[MoonMission descent] WebGL context restored — rebuilding once');
                        bootDescent3D(window.THREE);
                      });
                    }
                  }

                  // Teardown rides the same ResizeObserver element the loop already
                  // owns. React drops the wrapper on Retry Landing and on leaving the
                  // phase, so a MutationObserver on the parent is the one signal that
                  // fires for both without a second lifecycle to keep in step.
                  if (typeof MutationObserver === 'function' && cvEl.parentElement && cvEl.parentElement.parentElement) {
                    var _d3Watch = new MutationObserver(function() {
                      if (!document.contains(cvEl)) {
                        if (d3) { try { d3.dispose(); } catch (_dspErr) {} d3 = null; }
                        _d3Watch.disconnect();
                      }
                    });
                    _d3Watch.observe(cvEl.parentElement.parentElement, { childList: true, subtree: true });
                  }

                  // Three may already be on the page, or may still be loading. Either
                  // way the BOOT itself waits for the first animation frame (see
                  // drawDescent): a ref fires during React's commit, when the canvas is
                  // not yet in the document, and an attach attempted there silently
                  // does nothing.
                  if (window.THREE) d3Ready = true;
                  else if (window.StemLab && window.StemLab.ensureThree) {
                    window.StemLab.ensureThree({ orbit: false })
                      .then(function() { d3Ready = !!window.THREE; if (!d3Ready) d3Failed = true; })
                      .catch(function() { d3Failed = true; console.error('[MoonMission descent] Three.js failed to load, staying 2D'); });
                  } else { d3Failed = true; }

                  drawDescent();
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-slate-700 flex justify-between items-center gap-2 flex-wrap', 'data-descent-footer': 'true' },
              h('p', { className: 'text-[0.6875rem] text-slate-400' }, t('stem.moonmission.w_thrust_ad_lateral_land_gently', '\u2191/W = thrust \u2022 \u2190\u2192/AD = tilt\u2022 Land gently!')),
              // The crash screen has always told students to "try again" \u2014 but nothing
              // offered a retry, and the frozen canvas never resets itself. Dropping
              // descentStarted unmounts the canvas, so pressing Begin Descent builds a
              // fresh element (and therefore a fresh sim) rather than hitting the
              // _descentInit guard.
              d.landingResult && d.landingResult.crashed && h('button', {
                'aria-label': t('stem.moonmission.retry_the_powered_descent', 'Retry the powered descent from the start'),
                onClick: function() {
                  upd('landingResult', null);
                  upd('descentStarted', false);
                  log('\ud83d\udd04 Resetting for another descent attempt.');
                  if (typeof announceToSR === 'function') announceToSR('Descent reset. Press Begin Descent to take the controls again.');
                },
                className: 'px-4 py-2 rounded-lg text-xs font-bold text-white bg-amber-700 hover:bg-amber-800'
              }, t('stem.moonmission.retry_landing', '\ud83d\udd04 Retry Landing')),
              h('button', {
                title: t('stem.moonmission.begin_extravehicular_activity_moonwalk', 'Begin extravehicular activity moonwalk to explore the lunar surface and collect geological samples'),
                disabled: eventPending || !d.landingResult,
                onClick: function() {
                  if (!d.landingResult || !canProceed()) return;
                  advancePhase(6);
                  log('\uD83C\uDF15 "The Eagle has landed!" Preparing for EVA.');
                  addXP(30);
                  if (addToast) addToast('\uD83D\uDC68\u200D\uD83D\uDE80 "That\'s one small step..." Preparing for moonwalk!', 'success');
                },
                className: 'px-4 py-2 rounded-lg text-xs font-bold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed'
              }, t('stem.moonmission.begin_eva', '\uD83D\uDC68\u200D\uD83D\uDE80 Begin EVA')),
              !d.landingResult && h('p', { className: 'w-full text-[0.6875rem] text-slate-300 text-right', 'data-moonmission-eva-locked': 'true' },
                t('stem.moonmission.eva_after_landing', 'The moonwalk unlocks once the lander is on the surface.'))
            )
          )
        ),

        // ═══ PHASE 6: MOONWALK EVA (3D) ═══
        phase === 6 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          predictCard('hop_time', typeof d.evaHopTime === 'number',
            typeof d.evaHopTime === 'number' ? t('stem.moonmission.predict_hop_observed', 'Your last hop:') + ' ' + d.evaHopTime + ' s in the air.' : null),
          // Onboarding overlay (before EVA starts) — matches the Phase 5
          // pattern so the 3D phases feel consistent. Lists the WASD +
          // Space + F + mouse controls, names the goal (collect 4+ rock
          // samples), and seeds two Apollo-era surface-ops facts.
          !d.evaStarted && h('div', { className: 'bg-gradient-to-b from-slate-900 to-indigo-950 rounded-xl p-5 border border-slate-700 text-white text-center' },
            h('div', { className: 'text-4xl mb-3' }, '👨‍🚀'),
            h('h4', { className: 'text-lg font-black mb-2' }, t('stem.moonmission.moonwalk_eva_2', 'Moonwalk EVA')),
            h('p', { className: 'text-xs text-slate-200 mb-4' }, 'You are standing on the lunar surface in a pressurized suit at one-sixth Earth gravity. Walk the regolith, collect rock samples, and earn science points for each unique geological find.'),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-4 max-w-4xl mx-auto' },
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '🚶'),
                h('p', { className: 'text-[0.6875rem] font-bold text-sky-300' }, 'WASD'),
                h('p', { className: 'text-[0.6875rem] text-slate-300' }, t('stem.moonmission.walk_forward_back_strafe', 'Walk forward/back, strafe'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '🧭'),
                h('p', { className: 'text-[0.6875rem] font-bold text-sky-300' }, 'Q / E'),
                h('p', { className: 'text-[0.6875rem] text-slate-300' }, t('stem.moonmission.turn_left_right_no_mouse_needed', 'Turn left/right (no mouse needed)'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '🦘'),
                h('p', { className: 'text-[0.6875rem] font-bold text-sky-300' }, t('stem.moonmission.space', 'Space')),
                h('p', { className: 'text-[0.6875rem] text-slate-300' }, t('stem.moonmission.jump_low_gravity_hop', 'Jump (low-gravity hop)'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '🪨'),
                h('p', { className: 'text-[0.6875rem] font-bold text-amber-300' }, 'F'),
                h('p', { className: 'text-[0.6875rem] text-slate-300' }, t('stem.moonmission.collect_rock_at_your_feet', 'Collect rock at your feet'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '🔭'),
                h('p', { className: 'text-[0.6875rem] font-bold text-sky-300' }, t('stem.moonmission.mouse', 'Mouse')),
                h('p', { className: 'text-[0.6875rem] text-slate-300' }, t('stem.moonmission.look_around_click_canvas_first', 'Look around (click canvas first)'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '\uD83D\uDE99'),
                h('p', { className: 'text-[0.6875rem] font-bold text-sky-300' }, 'V'),
                h('p', { className: 'text-[0.6875rem] text-slate-300' }, t('stem.moonmission.board_or_exit_the_rover', 'Board / exit the rover (optional \u2014 walk up to it first)'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '\uD83D\uDC46'),
                h('p', { className: 'text-[0.6875rem] font-bold text-sky-300' }, 'M'),
                h('p', { className: 'text-[0.6875rem] text-slate-300' }, t('stem.moonmission.click_to_move_toggle', 'Click-to-move: then click the ground to walk there (no keys needed)'))
              )
            ),
            h('p', { className: 'text-[0.6875rem] text-sky-300 mb-4' },
              t('stem.moonmission.eva_touch_hint', '\uD83D\uDC46 No keyboard? Walk, turn, jump and collect from the buttons along the bottom of the surface view.')),
            h('div', { className: 'bg-amber-500/10 rounded-lg p-3 border border-amber-500/20 mb-4 max-w-xl mx-auto' },
              h('p', { className: 'text-[0.6875rem] text-amber-300 font-bold mb-1' }, t('stem.moonmission.mission_objective_apollo_facts', '🎯 Mission objective + Apollo facts:')),
              h('ul', { className: 'text-[0.6875rem] text-amber-200 space-y-1 text-left pl-4' },
                h('li', null, t('stem.moonmission.eva_goal_checklist', 'Collect at least 4 different rocks and deploy the seismometer. The cuff checklist in the HUD ticks them off, and the \uD83C\uDFAF bearing arrow points to the nearest rock still on the ground.')),
                h('li', null, t('stem.moonmission.apollo_11_brought_back_47_5_lb_of_luna', 'Apollo 11 brought back 47.5 lb of lunar samples; Apollo 17 brought 243 lb.')),
                h('li', null, t('stem.moonmission.in_one_sixth_gravity_a_hop_covers_abou', 'In one-sixth gravity, a hop covers about six times the horizontal distance for the same effort.')),
                h('li', null, t('stem.moonmission.earth_hangs_in_a_fixed_spot_in_the_lun', 'Earth hangs in a fixed spot in the lunar sky because the Moon is tidally locked.'))
              )
            ),
            h('button', {
              title: t('stem.moonmission.begin_eva_on_the_lunar_surface', 'Begin EVA on the lunar surface'),
              onClick: function() { upd('evaStarted', true); },
              className: 'px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-700 hover:to-orange-700 shadow-lg transition-all hover:scale-[1.02]'
            }, t('stem.moonmission.step_onto_the_moon_begin_eva', '👨‍🚀 Step Onto the Moon · Begin EVA'))
          ),
          d.evaStarted && h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '70vh', minHeight: '400px', maxHeight: '700px' } },
              d.webglError ? h('div', {
                className: 'flex flex-col items-center justify-center p-6 text-center text-white',
                style: { height: '100%', background: 'rgba(15, 23, 42, 0.8)' }
              },
                h('span', { style: { fontSize: '48px', marginBottom: '16px' } }, '⚠'),
                h('h4', { className: 'text-lg font-bold text-red-400 mb-2' }, t('stem.moonmission.moonwalk_3d_mode_unresolved', 'Moonwalk 3D Mode Unresolved')),
                h('p', { className: 'text-xs text-slate-300 max-w-sm mb-6' }, t('stem.moonmission.webgl_failed_to_initialize_your_browse', 'WebGL failed to initialize. Your browser or device might not support 3D hardware acceleration.')),
                h('button', {
                  onClick: function() {
                    upd('webglError', false);
                  },
                  className: 'px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg shadow-md transition-colors'
                }, t('stem.moonmission.retry_3d_mode', 'Retry 3D Mode'))
              ) : h('canvas', {
                'data-eva-canvas': 'true',
                role: 'application',
                'aria-label': t('stem.moonmission.interactive_3d_lunar_surface_eva_use_w', 'Interactive 3D lunar surface EVA. Use WASD to walk, Q and E to turn, Space to jump in one-sixth gravity, F to collect rock samples, V to board or exit the optional lunar rover, B to toggle optional LRV drive sonification, and the mouse to look around. Collect geological samples on foot and explore the Moon surface near the Lunar Module.'),
                // A <canvas> is NOT focusable without this, and every EVA key handler
                // is bound to the canvas element — so without it `canvasEl.focus()`
                // below was a silent no-op and a keyboard-only student could never
                // walk, jump or collect a sample. Mouse users were unaffected because
                // clicking requests pointer lock, which routes keystrokes to the
                // locked element and hid the gap. The descriptive aria-label above keeps
                // the keyboard instructions available to assistive-technology users.
                tabIndex: 0,

                style: { width: '100%', height: '100%', display: 'block', cursor: 'crosshair' },
                ref: function(canvasEl) {
                  if (!canvasEl || canvasEl._evaInit) return;
                  canvasEl._evaInit = true;

                  function doEvaInit(THREE) {
                    var W = canvasEl.clientWidth || 800, H2 = canvasEl.clientHeight || 500;
                    var scene = new THREE.Scene();
                    var camera = new THREE.PerspectiveCamera(70, W / H2, 0.1, 30000);   // far enough for massifs 16 km out
                    camera.position.set(0, 1.8, 0); // astronaut eye height in 1/6 gravity suit
                    var renderer;
                    try {
                      renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
                    } catch (e) {
                      console.error('[MoonMission EVA] WebGLRenderer creation failed:', e);
                      setTimeout(function() {
                        upd('webglError', true);
                      }, 0);
                      return;
                    }
                    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                    renderer.setSize(W, H2);
                    renderer.setClearColor(0x000000);
                    renderer.outputEncoding = THREE.sRGBEncoding;
                    // Filmic tone mapping rolls sunlit regolith and foil highlights off the
                    // way the Hasselblad film did, instead of clipping them flat white.
                    renderer.toneMapping = THREE.ACESFilmicToneMapping;
                    renderer.toneMappingExposure = 1.05;

                    // ── WebGL context loss ──
                    // Creation failure is handled (the webglError panel), but a context
                    // lost AFTER init left a black canvas with no error state and no way
                    // back — in the phase a student spends the most time in. Tear down
                    // through the SAME cleanup the unmount uses, then raise the existing
                    // panel so they get the familiar Retry 3D Mode control.
                    if (!canvasEl._evaLossBound) {
                      canvasEl._evaLossBound = true;
                      canvasEl.addEventListener('webglcontextlost', function (ev) {
                        // releaseGl force-loses a canvas after teardown removes it; that is a
                        // normal exit, not a failure. A real loss happens on a canvas still on the page.
                        if (!canvasEl.isConnected) return;
                        // Without this the context can never be restored.
                        ev.preventDefault();
                        console.warn('[MoonMission EVA] WebGL context lost — offering Retry 3D Mode');
                        try { if (canvasEl._evaCleanup) canvasEl._evaCleanup(); } catch (_clErr) {}
                        setTimeout(function () { upd('webglError', true); }, 0);
                      });
                    }

                    // ── Bloom: glow on the Earth + sun over the lunar surface (guarded) ──
                    // Same graceful, fully-guarded pattern as solarsystem — plain render until
                    // the r128 post-processing addons load, then a bloom composer; any failure
                    // falls back to renderer.render. Kill-switch + low-power/reduced-motion tier.
                    var composer = null;
                    (function setupBloom() {
                      if (window.AlloPostFXEnabled === false) return;
                      var ensure = function (cb) {
                        if (window.THREE && window.THREE.EffectComposer && window.THREE.UnrealBloomPass) { cb(); return; }
                        var urls = [
                          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js',
                          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js',
                          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js',
                          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js',
                          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js',
                          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js'
                        ];
                        var i = 0;
                        (function nextScript() {
                          if (i >= urls.length) { cb(); return; }
                          var s = document.createElement('script');
                          s.src = urls[i]; s.onload = function () { i++; nextScript(); }; s.onerror = function () { i++; nextScript(); };
                          document.head.appendChild(s);
                        })();
                      };
                      ensure(function () {
                        try {
                          var T = window.THREE;
                          if (!T || !T.EffectComposer || !T.RenderPass || !T.UnrealBloomPass) return;
                          var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                          var lowPower = reduce || (!!navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
                          var res = lowPower ? 0.5 : 1;
                          // A half-float buffer on WebGL2: an 8-bit linear one bands the
                          // dark shadow gradients and clips highlights before tone mapping.
                          var rtHdr = null;
                          if (!lowPower && renderer.capabilities.isWebGL2 && T.HalfFloatType) {
                            var dbs = renderer.getDrawingBufferSize(new T.Vector2());
                            rtHdr = new T.WebGLRenderTarget(Math.max(1, dbs.x), Math.max(1, dbs.y), { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, type: T.HalfFloatType });
                          }
                          var c = rtHdr ? new T.EffectComposer(renderer, rtHdr) : new T.EffectComposer(renderer);
                          c.addPass(new T.RenderPass(scene, camera));
                          // Threshold above sunlit regolith, so only the Sun, Earth and foil glints glow.
                          c.addPass(new T.UnrealBloomPass(new T.Vector2(Math.max(1, Math.round(W * res)), Math.max(1, Math.round(H2 * res))), lowPower ? 0.55 : 0.75, 0.4, 0.9));
                          composer = c;
                        } catch (e) { composer = null; }
                      });
                    })();

                    var _evaLowPower = false;
                    try { _evaLowPower = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || (!!navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4); } catch (eLP) {}

                    // ── Lunar sky: black, with faint, crisp stars ──
                    // Points, not a texture: the old 512x256 sphere map stretched every star
                    // into a blurry square. Faint on purpose, because with sunlit ground in
                    // view the eye stops down and only the brightest survive, which is why
                    // the Apollo photographs show a black sky. Two in five crowd a tilted
                    // band, a hint of the Milky Way. The shell rides with the camera, so the
                    // stars sit at infinity, and draws first so every hill occludes it.
                    var skyGroup = new THREE.Group();
                    var skyGeos = [], skyMats = [];
                    (function addStars() {
                      var sr = mmLunarRng(0x53544152);
                      [[1.2, 0.3, _evaLowPower ? 700 : 1500], [1.8, 0.5, _evaLowPower ? 200 : 420], [2.6, 0.78, _evaLowPower ? 36 : 70]].forEach(function (tier) {
                        var n = tier[2], pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
                        for (var i = 0; i < n; i++) {
                          var band = sr() < 0.4, lon = sr() * Math.PI * 2;
                          var lat = band ? (sr() + sr() + sr() - 1.5) * 0.16 : Math.asin(sr() * 2 - 1);
                          var sx = Math.cos(lat) * Math.cos(lon), sy = Math.sin(lat), sz = Math.cos(lat) * Math.sin(lon);
                          pos[i * 3] = sx * 9000; pos[i * 3 + 1] = (sy * 0.5 - sz * 0.866) * 9000; pos[i * 3 + 2] = (sy * 0.866 + sz * 0.5) * 9000;
                          var b = tier[1] * (0.4 + sr() * 0.6), warm = sr();
                          col[i * 3] = b * (warm > 0.8 ? 1 : 0.86); col[i * 3 + 1] = b * 0.92; col[i * 3 + 2] = b * (warm < 0.25 ? 1 : 0.82);
                        }
                        var g = new THREE.BufferGeometry();
                        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
                        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
                        var m = new THREE.PointsMaterial({ size: tier[0], sizeAttenuation: false, vertexColors: true, depthWrite: false, toneMapped: false });
                        var pts = new THREE.Points(g, m);
                        pts.renderOrder = -10; pts.frustumCulled = false;
                        skyGroup.add(pts); skyGeos.push(g); skyMats.push(m);
                      });
                    })();
                    scene.add(skyGroup);

                    // ── Earth as a billboard sprite ──
                    // Draw the marble onto a canvas (centered, square), then attach as a
                    // Three.js Sprite so it always faces the camera and never gets distorted
                    // by sphere-projection math. Earth hangs at a fixed point in the lunar
                    // sky, and its phase follows from the same Sun that lights the ground:
                    // lit on the side facing it, gibbous at this morning site. About 3
                    // degrees across; the real Earth is 1.9, slightly enlarged to read.
                    var earthCv = document.createElement('canvas'); earthCv.setAttribute('aria-hidden', 'true'); earthCv.width = 512; earthCv.height = 512;
                    var eCtx = earthCv.getContext('2d');
                    eCtx.clearRect(0, 0, 512, 512);
                    var _earthDir = new THREE.Vector3(-60, 68, -120).normalize();
                    var _earthRight = new THREE.Vector3().crossVectors(_earthDir, new THREE.Vector3(0, 1, 0)).normalize();
                    var _earthUp = new THREE.Vector3().crossVectors(_earthRight, _earthDir);
                    var _evaSunV = new THREE.Vector3(MM_EVA_SUN.x, MM_EVA_SUN.y, MM_EVA_SUN.z);
                    var earthLit = (1 - _evaSunV.dot(_earthDir)) / 2;
                    var earthSunAng = Math.atan2(-_evaSunV.dot(_earthUp), _evaSunV.dot(_earthRight));
                    drawDetailedEarth(eCtx, 256, 256, 172, 500, earthSunAng, earthLit); // halo (r*1.45) fits the texture
                    var earthTex = new THREE.CanvasTexture(earthCv);
                    earthTex.encoding = THREE.sRGBEncoding;
                    var earthSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: earthTex, transparent: true, depthWrite: false }));
                    earthSprite.position.set(-60, 70, -120);
                    earthSprite.scale.set(12, 12, 1);
                    scene.add(earthSprite);

                    // ── The lunar surface ──
                    // mmLunarField owns the landscape and this builds three meshes from it:
                    // the walkable 200 m square, a far field of coarser, curving ground out
                    // to the horizon, and the massifs beyond it. Every vertex carries a baked
                    // [sun clearance, sky view, albedo] for mmLunarShade, so crater shadows
                    // fall across the whole landscape, not only inside the small frustum the
                    // shadow map covers around you.
                    // One world-space function owns vertex generation. PlaneGeometry's
                    // local +Y becomes world -Z after its -90-degree X rotation, hence
                    // negated py at construction. Runtime probes interpolate the exact
                    // cached Float32 vertices below, matching the rendered triangles.
                    var _lunarField = mmLunarField(_evaLowPower);
                    var _LUNAR_SEG = _evaLowPower ? 160 : 256, _LUNAR_N = _LUNAR_SEG + 1, _LUNAR_STEP = 200 / _LUNAR_SEG;
                    // The far field meets this square on a coarser lattice. Near the seam the
                    // square blends onto that lattice's straight edges, so the two meshes
                    // share one boundary and no crack can open between them.
                    var _LUNAR_SEAM = _evaLowPower ? 12.5 : 6.25;
                    var _lunarSeamGrid = mmLunarGrid(_lunarField.height, -100, 200, Math.round(200 / _LUNAR_SEAM) + 1);
                    var _lunarTerrainHeightAt = function(worldX, worldZ) {
                      var h2 = _lunarField.height(worldX, worldZ);
                      var edge = Math.max(Math.abs(worldX), Math.abs(worldZ));
                      if (edge > 84) {
                        h2 += (_lunarSeamGrid.at(Math.max(-100, Math.min(100, worldX)), Math.max(-100, Math.min(100, worldZ))) - h2) * mmSmooth(84, 100, edge);
                      }
                      return h2;
                    };
                    var terrainGeo = new THREE.PlaneGeometry(200, 200, _LUNAR_SEG, _LUNAR_SEG);
                    var tPos = terrainGeo.attributes.position.array;
                    var _lunarTerrainGrid = new Float32Array(_LUNAR_N * _LUNAR_N);
                    for (var vi = 0; vi < tPos.length; vi += 3) {
                      var px = tPos[vi], py = tPos[vi + 1];
                      tPos[vi + 2] = _lunarTerrainHeightAt(px, -py);
                      _lunarTerrainGrid[vi / 3] = tPos[vi + 2];
                    }
                    terrainGeo.computeVertexNormals();
                    var _terrainHeightAt = function(x, z) {
                      if (typeof x !== 'number' || typeof z !== 'number' ||
                          !isFinite(x) || !isFinite(z) ||
                          x < -100 || x > 100 || z < -100 || z > 100) return 0;
                      // PlaneGeometry(200,200,SEG,SEG) lays out (SEG+1)^2 vertices,
                      // row-major from world z=-100 to +100 after rotation.x=-PI/2.
                      var gridX = (x + 100) / _LUNAR_STEP, gridZ = (z + 100) / _LUNAR_STEP;
                      var cellX = Math.min(_LUNAR_SEG - 1, Math.floor(gridX));
                      var cellZ = Math.min(_LUNAR_SEG - 1, Math.floor(gridZ));
                      var u = gridX - cellX, v = gridZ - cellZ;
                      var row0 = cellZ * _LUNAR_N + cellX;
                      var row1 = row0 + _LUNAR_N;
                      var hA = _lunarTerrainGrid[row0];
                      var hB = _lunarTerrainGrid[row1];
                      var hC = _lunarTerrainGrid[row1 + 1];
                      var hD = _lunarTerrainGrid[row0 + 1];
                      // Mirror PlaneGeometry's index order exactly: a-b-d, then b-c-d.
                      if (u + v <= 1) return hA + v * (hB - hA) + u * (hD - hA);
                      return hC + (1 - u) * (hB - hC) + (1 - v) * (hD - hC);
                    };

                    // Heights for the bakes: the exact mesh inside the square, then coarser
                    // grids of the curving far field out to the horizon.
                    var _lunarFarHeight = function (x, z) { return _lunarField.height(x, z) - _lunarField.curvature(x, z); };
                    var _lunarMidGrid = mmLunarGrid(_lunarFarHeight, -1200, 2400, _evaLowPower ? 151 : 241);
                    var _lunarOuterGrid = mmLunarGrid(_lunarFarHeight, -3600, 7200, _evaLowPower ? 121 : 161);
                    var _lunarBakeHeight = function (x, z) {
                      if (x >= -100 && x <= 100 && z >= -100 && z <= 100) return _terrainHeightAt(x, z);
                      var hm = _lunarMidGrid.at(x, z);
                      return hm === hm ? hm : _lunarOuterGrid.at(x, z);
                    };
                    // The LM and the bigger boulders cast into the bake too, so their
                    // shadows exist without a shadow map (low-power tier) and beyond its reach.
                    var _lmBaseY = (_terrainHeightAt(3.67, 0) + _terrainHeightAt(-3.67, 0) + _terrainHeightAt(0, 3.67) + _terrainHeightAt(0, -3.67)) / 4 - 0.04;
                    var _bakeRockCells = {};
                    _lunarField.rocks.forEach(function (r) {
                      if (r.s < 0.45) return;
                      var ck = Math.floor(r.x / 4) * 1000 + Math.floor(r.z / 4), gy = _terrainHeightAt(r.x, r.z);
                      (_bakeRockCells[ck] || (_bakeRockCells[ck] = [])).push([r.x, r.z, r.s * 0.8, gy + r.s * r.sy * 1.05]);
                    });
                    var _bakeSolidAt = function (x, z, y) {
                      var lr2 = x * x + z * z, ly = y - _lmBaseY;
                      if (lr2 < 3.1 && ly > 1.05 && ly < 2.6) return true;      // descent stage
                      if (lr2 < 1.9 && ly >= 2.6 && ly < 4.5) return true;      // ascent stage
                      var list = _bakeRockCells[Math.floor(x / 4) * 1000 + Math.floor(z / 4)];
                      if (list) for (var k = 0; k < list.length; k++) {
                        var rk = list[k], rdx = x - rk[0], rdz = z - rk[1];
                        if (rdx * rdx + rdz * rdz < rk[2] * rk[2] && y < rk[3]) return true;
                      }
                      return false;
                    };
                    var terrainBake = new Float32Array(_LUNAR_N * _LUNAR_N * 3);
                    (function bakeTerrain() {
                      var N = _LUNAR_N, dirs = _evaLowPower ? 6 : 7, steps = _evaLowPower ? 6 : 8;
                      for (var bj = 0; bj < N; bj++) for (var bi = 0; bi < N; bi++) {
                        var bo = bj * N + bi, bx = -100 + bi * _LUNAR_STEP, bz = -100 + bj * _LUNAR_STEP;
                        terrainBake[bo * 3] = mmSunClearance(_lunarBakeHeight, bx, bz, _lunarTerrainGrid[bo], 70, _bakeSolidAt);
                        terrainBake[bo * 3 + 2] = _lunarField.albedo(bx, bz);
                        // Sky view varies slowly: bake every second vertex, fill between.
                        if (bi % 2 === 0 && bj % 2 === 0) {
                          terrainBake[bo * 3 + 1] = mmSkyView(_lunarBakeHeight, bx, bz, _lunarTerrainGrid[bo], dirs, steps, 24);
                        }
                      }
                      for (bj = 0; bj < N; bj++) for (bi = 0; bi < N; bi++) {
                        if (bi % 2 === 0 && bj % 2 === 0) continue;
                        var i0 = bi - (bi % 2), j0 = bj - (bj % 2), i1 = Math.min(N - 1, i0 + 2), j1 = Math.min(N - 1, j0 + 2);
                        var fu = (bi - i0) / 2, fv = (bj - j0) / 2;
                        terrainBake[(bj * N + bi) * 3 + 1] =
                          (terrainBake[(j0 * N + i0) * 3 + 1] * (1 - fu) + terrainBake[(j0 * N + i1) * 3 + 1] * fu) * (1 - fv) +
                          (terrainBake[(j1 * N + i0) * 3 + 1] * (1 - fu) + terrainBake[(j1 * N + i1) * 3 + 1] * fu) * fv;
                      }
                    })();
                    terrainGeo.setAttribute('lunarBake', new THREE.BufferAttribute(terrainBake, 3));

                    // Regolith detail, height and albedo, painted once and sampled in world
                    // space at two rotated scales (see mmLunarShade), so it never tiles into
                    // a visible grid. The old texture was one 256 px noise tile repeated 8x.
                    var lunarMicroSize = _evaLowPower ? 256 : 512;
                    var lunarMicroSeed = 0x6d2b79f5;
                    var _lunarDetail = mmRegolithDetail(lunarMicroSize, lunarMicroSeed);
                    var tCv = document.createElement('canvas'); tCv.setAttribute('aria-hidden', 'true'); tCv.width = tCv.height = lunarMicroSize;
                    var tCx = tCv.getContext('2d');
                    var lunarMicroCv = document.createElement('canvas');
                    lunarMicroCv.setAttribute('aria-hidden', 'true');
                    lunarMicroCv.width = lunarMicroCv.height = lunarMicroSize;
                    var lunarMicroCtx = lunarMicroCv.getContext('2d');
                    (function paintRegolith() {
                      var N = lunarMicroSize, img = tCx.createImageData(N, N), hImg = lunarMicroCtx.createImageData(N, N);
                      var span = (_lunarDetail.hi - _lunarDetail.lo) || 1;
                      for (var k = 0; k < N * N; k++) {
                        var a = Math.max(0.35, Math.min(1.8, _lunarDetail.albedo[k])) * 118, o4 = k * 4;
                        img.data[o4] = Math.min(255, a) | 0; img.data[o4 + 1] = Math.min(255, a * 0.99) | 0;
                        img.data[o4 + 2] = Math.min(255, a * 0.965) | 0; img.data[o4 + 3] = 255;
                        hImg.data[o4] = hImg.data[o4 + 1] = hImg.data[o4 + 2] = ((_lunarDetail.height[k] - _lunarDetail.lo) / span * 255) | 0;
                        hImg.data[o4 + 3] = 255;
                      }
                      tCx.putImageData(img, 0, 0);
                      lunarMicroCtx.putImageData(hImg, 0, 0);
                    })();
                    var terrainTex = new THREE.CanvasTexture(tCv);
                    terrainTex.wrapS = terrainTex.wrapT = THREE.RepeatWrapping;
                    terrainTex.encoding = THREE.sRGBEncoding;
                    terrainTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
                    var lunarMicroTex = new THREE.CanvasTexture(lunarMicroCv);
                    lunarMicroTex.wrapS = lunarMicroTex.wrapT = THREE.RepeatWrapping;
                    lunarMicroTex.generateMipmaps = true;
                    lunarMicroTex.minFilter = THREE.LinearMipmapLinearFilter;
                    lunarMicroTex.magFilter = THREE.LinearFilter;
                    lunarMicroTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
                    var terrainMat = mmLunarShade(THREE, new THREE.MeshStandardMaterial({
                      color: 0x2a2927, map: terrainTex, bumpMap: lunarMicroTex,
                      bumpScale: _evaLowPower ? 0.03 : 0.022,
                      roughness: 0.96,
                      metalness: 0.0
                    }), 'ground', _evaLowPower);
                    var terrain = new THREE.Mesh(terrainGeo, terrainMat);
                    terrain.rotation.x = -Math.PI / 2;
                    terrain.receiveShadow = true;   // lunar scene sells on hard black shadows (sun.castShadow above)
                    scene.add(terrain);

                    // ── Lighting (harsh unfiltered sunlight + no atmosphere) ──
                    // Real lunar look = near-black SHADOWS under a single hard sun, filled
                    // only by bounce off the regolith (it reflects ~12%) instead of a sky.
                    // The ground's own bounce is in mmLunarShade; these two lights fill the
                    // hardware. Shadow map skipped on low-power devices (same tier as bloom).
                    scene.add(new THREE.AmbientLight(0x1a1a1e, 0.12));
                    scene.add(new THREE.HemisphereLight(0x050508, 0x4a433a, 0.32));   // black sky above, regolith bounce below
                    var _sunOffset = new THREE.Vector3(MM_EVA_SUN.x, MM_EVA_SUN.y, MM_EVA_SUN.z).multiplyScalar(60);
                    var sun = new THREE.DirectionalLight(0xfff6e8, 2.3);
                    sun.position.copy(_sunOffset);
                    // The shadow frustum TRACKS the astronaut instead of covering the whole
                    // 120x120 plain from a fixed point. At ±60 with a 1024 map each texel
                    // was ~12cm of ground, so a suit leg landed on about two of them and its
                    // shadow came out as a dark smear. Following the player lets the same
                    // map cover ±26, roughly a 5x gain in shadow detail exactly where anyone
                    // is looking — and lunar shadows are the hardest-edged in the solar
                    // system, so mush is the one thing they must not be.
                    var sunTarget = new THREE.Object3D();
                    scene.add(sunTarget);
                    sun.target = sunTarget;
                    if (!_evaLowPower) {
                      renderer.shadowMap.enabled = true;
                      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                      sun.castShadow = true;
                      // Stays at 1024. The detail gain here comes from the 5x tighter
                      // frustum, not from a bigger map: 2048 with PCFSoft cost enough frame
                      // time under software rendering that the WebGL suite's walk test
                      // stopped registering steps, which is a fair proxy for what it would
                      // do to a low-end classroom laptop. ±26 at 1024 is ~5cm per texel,
                      // against ~12cm before.
                      sun.shadow.mapSize.width = 1024; sun.shadow.mapSize.height = 1024;
                      sun.shadow.camera.left = -26; sun.shadow.camera.right = 26;
                      sun.shadow.camera.top = 26; sun.shadow.camera.bottom = -26;
                      sun.shadow.camera.near = 1; sun.shadow.camera.far = 120;
                      sun.shadow.bias = -0.0009;
                      sun.shadow.normalBias = 0.02;
                      sun.shadow.camera.updateProjectionMatrix();
                    }
                    scene.add(sun);
                    // The sun itself — a hot disc in the sky along the light direction so the
                    // bloom pass (tuned for "Earth + sun glow") finally has a sun to bloom.
                    var _sunSprite = null;
                    (function addSunDisc() {
                      var sc = document.createElement('canvas'); sc.setAttribute('aria-hidden', 'true'); sc.width = 128; sc.height = 128;
                      var sg = sc.getContext('2d');
                      var grad = sg.createRadialGradient(64, 64, 4, 64, 64, 64);
                      grad.addColorStop(0, 'rgba(255,255,250,1)');
                      grad.addColorStop(0.25, 'rgba(255,246,220,0.9)');
                      grad.addColorStop(0.6, 'rgba(255,240,200,0.25)');
                      grad.addColorStop(1, 'rgba(255,240,200,0)');
                      sg.fillStyle = grad; sg.fillRect(0, 0, 128, 128);
                      var st = new THREE.CanvasTexture(sc);
                      var sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
                      var sd = new THREE.Vector3(MM_EVA_SUN.x, MM_EVA_SUN.y, MM_EVA_SUN.z).multiplyScalar(170);
                      sunSprite.position.copy(sd);
                      sunSprite.scale.set(15, 15, 1);
                      scene.add(sunSprite);
                      _sunSprite = sunSprite;
                    })();

                    // ── Reflections for the hardware ──
                    // Foil, the rover and the suit reflect what is actually around them:
                    // bright regolith below the horizon, black sky above. Without an
                    // environment every metal rendered as flat, dark plastic.
                    var _evaEnvRT = null, _evaEnvMap = null;
                    try {
                      var envScene = new THREE.Scene();
                      var envGeo = new THREE.SphereGeometry(50, 48, 24);
                      var envPos = envGeo.attributes.position, envCol = new Float32Array(envPos.count * 3);
                      for (var evi = 0; evi < envPos.count; evi++) {
                        var ey = envPos.getY(evi) / 50, eg = ey < 0.02 ? 0.17 * (0.55 + 0.45 * Math.min(1, -ey * 4 + 0.08)) : 0.004;
                        envCol[evi * 3] = eg * 1.02; envCol[evi * 3 + 1] = eg; envCol[evi * 3 + 2] = eg * 0.94;
                      }
                      envGeo.setAttribute('color', new THREE.BufferAttribute(envCol, 3));
                      var envMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
                      envScene.add(new THREE.Mesh(envGeo, envMat));
                      var envGen = new THREE.PMREMGenerator(renderer);
                      _evaEnvRT = envGen.fromScene(envScene, 0.03);
                      _evaEnvMap = _evaEnvRT.texture;
                      envGen.dispose(); envGeo.dispose(); envMat.dispose();
                    } catch (_envErr) { _evaEnvRT = null; _evaEnvMap = null; }

                    // ── Lunar Module on surface ──
                    // mmBuildSurfaceLM: gold-foil descent stage on four legs with struts and
                    // pads, the faceted ascent stage with its windows, RCS quads and dishes,
                    // and the ladder down the front leg. It replaced two boxes on sticks.
                    var lmGroup = mmBuildSurfaceLM(THREE, _evaEnvMap, _evaLowPower);
                    // ── Flag (grouped, terrain-anchored, real stripes + canton texture, and a
                    // FROZEN ripple — Apollo flags hung from a stiffening rod and kept the
                    // crinkle from handling; there's no air, so it must not animate) ──
                    // (Replaces a solid-red plane + a separately-floating blue patch that were
                    // not grouped, not anchored to the terrain, and read as "not the US flag".)
                    var flagGroup = new THREE.Group();
                    var flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 2.5, 8), new THREE.MeshStandardMaterial({ color: 0xb9bcc2, metalness: 0.6, roughness: 0.35 }));
                    flagPole.position.y = 1.25;
                    flagGroup.add(flagPole);
                    var flagCv = document.createElement('canvas'); flagCv.setAttribute('aria-hidden', 'true'); flagCv.width = 192; flagCv.height = 112;
                    var fCtx = flagCv.getContext('2d');
                    for (var fsi = 0; fsi < 13; fsi++) {                       // 13 stripes
                      fCtx.fillStyle = fsi % 2 === 0 ? '#b22234' : '#f5f2ec';
                      fCtx.fillRect(0, Math.round(fsi * (112 / 13)), 192, Math.ceil(112 / 13));
                    }
                    fCtx.fillStyle = '#3c3b6e'; fCtx.fillRect(0, 0, 77, 60);   // canton
                    fCtx.fillStyle = '#ffffff';                                 // star dots (abstracted at this scale)
                    for (var fr2 = 0; fr2 < 5; fr2++) for (var fc2 = 0; fc2 < 6; fc2++) {
                      fCtx.beginPath(); fCtx.arc(8 + fc2 * 12.5 + (fr2 % 2) * 6, 7 + fr2 * 11.5, 1.7, 0, Math.PI * 2); fCtx.fill();
                    }
                    var flagTex = new THREE.CanvasTexture(flagCv);
                    var flagGeo = new THREE.PlaneGeometry(1.2, 0.7, 12, 4);
                    var fvp = flagGeo.attributes.position.array;
                    for (var fvi = 0; fvi < fvp.length; fvi += 3) {            // frozen crinkle, stronger toward the fly end
                      var fu = (fvp[fvi] + 0.6) / 1.2;
                      fvp[fvi + 2] = Math.sin(fu * 6.0) * 0.045 * fu + Math.sin(fu * 13.0 + 1.7) * 0.02 * fu;
                    }
                    flagGeo.computeVertexNormals();
                    var flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.85 }));
                    flag.position.set(0.61, 2.1, 0);                            // hangs from the top rod, left edge at the pole
                    flagGroup.add(flag);
                    var flagRod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.22, 6), new THREE.MeshStandardMaterial({ color: 0xb9bcc2, metalness: 0.6, roughness: 0.35 }));
                    flagRod.rotation.z = Math.PI / 2; flagRod.position.set(0.61, 2.46, 0);
                    flagGroup.add(flagRod);
                    flagGroup.position.set(4, _terrainHeightAt(4, 2), 2);
                    scene.add(flagGroup);

                    // Settled on the four pads, a few centimetres into the regolith.
                    lmGroup.position.set(0, _lmBaseY, 0);
                    scene.add(lmGroup);

                    // ── ALSEP Science Station ──
                    var alsepX = -6, alsepZ = 5;
                    var alsepY = _terrainHeightAt(alsepX, alsepZ);
                    // Central station box
                    var alsepBox = new THREE.Mesh(
                      new THREE.BoxGeometry(0.6, 0.3, 0.6),
                      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.5, roughness: 0.4 })
                    );
                    alsepBox.position.set(alsepX, alsepY + 0.15, alsepZ);
                    scene.add(alsepBox);
                    // Solar panel wing
                    var alsepPanel = new THREE.Mesh(
                      new THREE.BoxGeometry(1.2, 0.02, 0.4),
                      new THREE.MeshStandardMaterial({ color: 0x1a1a5e, metalness: 0.3, roughness: 0.5 })
                    );
                    alsepPanel.position.set(alsepX, alsepY + 0.35, alsepZ);
                    scene.add(alsepPanel);
                    // Seismometer (small cylinder nearby)
                    var seismo = new THREE.Mesh(
                      new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8),
                      new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.4 })
                    );
                    seismo.position.set(alsepX + 2, alsepY + 0.15, alsepZ + 1);
                    scene.add(seismo);
                    // Laser retroreflector (flat panel angled up)
                    var retroGeo = new THREE.BoxGeometry(0.4, 0.02, 0.4);
                    var retroMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, metalness: 0.8, roughness: 0.1 });
                    var retro = new THREE.Mesh(retroGeo, retroMat);
                    retro.position.set(alsepX - 2, alsepY + 0.3, alsepZ - 1);
                    retro.rotation.x = -0.5;
                    scene.add(retro);

                    // ── Lunar Roving Vehicle ──
                    // EVA remains the default. This parked, procedural rover becomes a
                    // deliberately optional traverse mode only after the learner boards it.
                    // Technical design inspiration: winchxyz/moon-rover, audited at
                    // 8a72604adf2ca465c8a8529effd12803129c3531. This is an original
                    // AlloFlow implementation for the app's existing Three r128 runtime.
                    var roverGrp = new THREE.Group();
                    roverGrp.rotation.order = 'YXZ';
                    var roverMetal = new THREE.MeshStandardMaterial({ color: 0xcbd0d4, metalness: 0.58, roughness: 0.42 });
                    var roverDark = new THREE.MeshStandardMaterial({ color: 0x34383d, metalness: 0.28, roughness: 0.82 });
                    var roverGold = new THREE.MeshStandardMaterial({ color: 0xa88436, metalness: 0.42, roughness: 0.58 });
                    // Chassis and underbody
                    var rChassis = new THREE.Mesh(
                      new THREE.BoxGeometry(1.65, 0.16, 1.0),
                      roverMetal
                    );
                    rChassis.position.y = 0.42; roverGrp.add(rChassis);
                    var rUnderbody = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.13, 0.72), roverDark);
                    rUnderbody.position.y = 0.29; roverGrp.add(rUnderbody);

                    // Four independently suspended wheel mounts. Rotating the geometry
                    // once aligns its axle to local X, leaving mesh.rotation.x free for
                    // visually correct rolling while each front mount steers about Y.
                    var roverWheelGeo = new THREE.TorusGeometry(0.2, 0.035, 8, 18);
                    roverWheelGeo.rotateY(Math.PI / 2);
                    var roverWheelMat = new THREE.MeshStandardMaterial({ color: 0x575c61, metalness: 0.52, roughness: 0.72 });
                    var roverWheelMounts = [], roverWheelMeshes = [];
                    [[-0.78, -0.5, true], [0.78, -0.5, true], [-0.78, 0.5, false], [0.78, 0.5, false]].forEach(function(wp) {
                      var mount = new THREE.Group();
                      mount.position.set(wp[0], 0.2, wp[1]);
                      mount._lrvX = wp[0]; mount._lrvZ = wp[1]; mount._lrvFront = wp[2];
                      mount._lrvVisualSteer = 0;
                      var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6), roverDark);
                      arm.rotation.z = Math.PI / 2;
                      arm.position.x = wp[0] < 0 ? 0.12 : -0.12;
                      mount.add(arm);
                      var wheel = new THREE.Mesh(roverWheelGeo, roverWheelMat);
                      mount.add(wheel);
                      roverGrp.add(mount);
                      roverWheelMounts.push(mount);
                      roverWheelMeshes.push(wheel);
                    });

                    // Two lightweight seats, hand controller, equipment bay and antenna.
                    [-0.38, 0.38].forEach(function(sx) {
                      var seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.48), roverGold);
                      seat.position.set(sx, 0.57, 0.08); roverGrp.add(seat);
                      var back = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.07), roverGold);
                      back.position.set(sx, 0.78, 0.3); back.rotation.x = -0.12; roverGrp.add(back);
                    });
                    var rConsole = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.22), roverDark);
                    rConsole.position.set(0, 0.72, -0.35); rConsole.rotation.x = -0.18; roverGrp.add(rConsole);
                    // Self-lit telemetry aids night-side readability without pretending
                    // the rover casts a headlight beam through lunar vacuum.
                    var rConsoleDisplayMat = new THREE.MeshBasicMaterial({
                      color: 0x67e8f9, transparent: true, opacity: 0.24, depthWrite: false
                    });
                    var rConsoleDisplay = new THREE.Mesh(
                      new THREE.PlaneGeometry(0.29, 0.095), rConsoleDisplayMat);
                    rConsoleDisplay.position.set(0, 0.035, 0.112);
                    rConsole.add(rConsoleDisplay);
                    var rConsoleStatusMat = new THREE.MeshBasicMaterial({
                      color: 0x64748b, transparent: true, opacity: 0.65, depthWrite: false
                    });
                    var rConsoleStatus = new THREE.Mesh(
                      new THREE.CircleGeometry(0.018, 8), rConsoleStatusMat);
                    rConsoleStatus.position.set(0.145, 0.035, 0.114);
                    rConsole.add(rConsoleStatus);
                    var rController = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 6), roverMetal);
                    rController.position.set(-0.2, 0.93, -0.27); rController.rotation.x = -0.45; roverGrp.add(rController);
                    var rBay = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.38, 0.28), roverGold);
                    rBay.position.set(0, 0.56, 0.53); roverGrp.add(rBay);
                    var rDish = new THREE.Mesh(
                      new THREE.CircleGeometry(0.28, 16),
                      new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, metalness: 0.3 })
                    );
                    rDish.position.set(0.48, 1.18, -0.08);
                    rDish.rotation.x = -0.7;
                    roverGrp.add(rDish);
                    var rMast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.68, 6), roverMetal);
                    rMast.position.set(0.48, 0.89, -0.08); roverGrp.add(rMast);
                    // Keep the terrain-following root mathematically stable while a
                    // lightweight child shell supplies short visual suspension impulses.
                    var roverVisualShell = new THREE.Group();
                    while (roverGrp.children.length) roverVisualShell.add(roverGrp.children[0]);
                    roverGrp.add(roverVisualShell);
                    var rvX = 8, rvZ = -4;
                    roverGrp.position.set(rvX, _terrainHeightAt(rvX, rvZ), rvZ);
                    var roverHeading = 0.5;
                    var roverSpeed = 0, roverSteer = 0, roverWheelSpin = 0;
                    var lrvVisualSteerDegrees = 0, lrvGroundedWheelCount = 4;
                    var lrvConsoleState = 'parked';
                    var lrvThrottleSignal = 0, lrvSlipSignal = 0;
                    var lrvGradeRatio = 0, lrvCrossSlopeRatio = 0, lrvGripState = 'Grip';
                    var lrvCameraYawOffset = 0, lrvCameraPitchOffset = 0;
                    var lrvCameraSteerLook = 0;
                    var roverBoarded = false;
                    var LRV_BOARD_RANGE = 3.2;
                    var LRV_VISUAL_WHEELBASE = 1.0, LRV_VISUAL_HALF_TRACK = 0.78;
                    function lrvVisualWheelSteer(mount, centerSteer) {
                      var steerSign = centerSteer < 0 ? -1 : 1;
                      var steerAbs = Math.min(0.42, Math.abs(centerSteer));
                      if (steerAbs < 0.0001) return 0;
                      var turnRadius = LRV_VISUAL_WHEELBASE / Math.tan(steerAbs);
                      // Positive steer/yaw turns toward local -X; that wheel is inside.
                      var inside = steerSign > 0 ? mount._lrvX < 0 : mount._lrvX > 0;
                      var denominator = Math.max(0.55,
                        turnRadius + (inside ? -LRV_VISUAL_HALF_TRACK : LRV_VISUAL_HALF_TRACK));
                      var frontAngle = Math.min(0.62,
                        Math.atan(LRV_VISUAL_WHEELBASE / denominator));
                      return mount._lrvFront
                        ? steerSign * frontAngle
                        : -steerSign * Math.min(0.18, frontAngle * 0.26);
                    }
                    function applyLrvVisualSteering(centerSteer) {
                      var maxFront = 0;
                      for (var vsi = 0; vsi < roverWheelMounts.length; vsi++) {
                        var visualMount = roverWheelMounts[vsi];
                        var visualAngle = lrvVisualWheelSteer(visualMount, centerSteer);
                        visualMount._lrvVisualSteer = visualAngle;
                        visualMount.rotation.y = visualAngle;
                        if (visualMount._lrvFront) maxFront = Math.max(maxFront, Math.abs(visualAngle));
                      }
                      lrvVisualSteerDegrees = maxFront * 180 / Math.PI;
                    }
                    roverGrp.rotation.y = roverHeading;
                    scene.add(roverGrp);

                    // Ballistic regolith grains: lunar dust falls instead of billowing
                    // because there is no atmosphere. A fixed pool keeps this feedback
                    // inexpensive and avoids creating objects during the render loop.
                    var LRV_DUST_COUNT = _evaLowPower ? 18 : 42;
                    var lrvDustSeed = 0x51f15e;
                    function lrvDustRand() {
                      lrvDustSeed = (Math.imul(lrvDustSeed, 1664525) + 1013904223) >>> 0;
                      return lrvDustSeed / 4294967296;
                    }
                    var lrvDustPositions = new Float32Array(LRV_DUST_COUNT * 3);
                    var lrvDustLife = new Float32Array(LRV_DUST_COUNT);
                    var lrvDustVX = new Float32Array(LRV_DUST_COUNT);
                    var lrvDustVY = new Float32Array(LRV_DUST_COUNT);
                    var lrvDustVZ = new Float32Array(LRV_DUST_COUNT);
                    for (var ldi = 0; ldi < LRV_DUST_COUNT; ldi++) lrvDustPositions[ldi * 3 + 1] = -100;
                    var lrvDustGeo = new THREE.BufferGeometry();
                    lrvDustGeo.setAttribute('position', new THREE.BufferAttribute(lrvDustPositions, 3));
                    var lrvDustMat = new THREE.PointsMaterial({
                      color: 0xb8afa3, size: _evaLowPower ? 0.07 : 0.09,
                      transparent: true, opacity: 0.42, depthWrite: false, sizeAttenuation: true
                    });
                    var lrvDust = new THREE.Points(lrvDustGeo, lrvDustMat);
                    scene.add(lrvDust);
                    var lrvDustCursor = 0, lrvDustAccumulator = 0;
                    var roverDistance = 0;
                    var lrvImpactSignal = 0, lrvImpactCount = 0, lrvImpactCooldown = 0;
                    var lrvImpactArmTime = 0, lrvImpactContactValid = false;
                    var lrvImpactPreviousContact = 0, lrvImpactVelocityFiltered = 0;
                    var lrvImpactSpring = 0, lrvImpactSpringVelocity = 0;
                    var lrvImpactAudioEnvelope = 0, lrvImpactCameraEnvelope = 0;
                    var evaLandingImpact = 0, evaLandingImpactEnvelope = 0;
                    var lrvImpactDatasetActive = false, evaLandingDatasetActive = false;
                    canvasEl.dataset.lrvImpact = '0.000';
                    canvasEl.dataset.lrvImpactCount = '0';
                    canvasEl.dataset.evaLandingImpact = '0.000';
                    canvasEl.dataset.lrvVisualProfile = 'contact-4+four-wheel-steer+console';
                    canvasEl.dataset.lrvSteeringMode = 'four-wheel';
                    canvasEl.dataset.lrvVisualSteer = '0.0';
                    canvasEl.dataset.lrvConsoleState = 'parked';
                    canvasEl.dataset.lrvGroundedWheels = '4';

                    function emitLunarDustBurst(x, z, forwardX, forwardZ, strength, count) {
                      var burstCount = Math.min(LRV_DUST_COUNT, Math.max(1, count | 0));
                      for (var ldb = 0; ldb < burstCount; ldb++) {
                        var dustI = lrvDustCursor++ % LRV_DUST_COUNT;
                        var dustO = dustI * 3;
                        var dustAngle = (ldb / burstCount) * Math.PI * 2 + dustI * 0.37 +
                          (lrvDustRand() - 0.5) * 0.42;
                        var dustSpread = (0.12 + strength * 0.28) *
                          (0.78 + lrvDustRand() * 0.44);
                        lrvDustPositions[dustO] = x + Math.cos(dustAngle) * 0.24;
                        lrvDustPositions[dustO + 2] = z + Math.sin(dustAngle) * 0.24;
                        lrvDustPositions[dustO + 1] = _terrainHeightAt(
                          lrvDustPositions[dustO], lrvDustPositions[dustO + 2]) + 0.055;
                        lrvDustVX[dustI] = Math.cos(dustAngle) * dustSpread - forwardX * strength * 0.08;
                        lrvDustVY[dustI] = (0.12 + strength * 0.32) *
                          (0.82 + lrvDustRand() * 0.36);
                        lrvDustVZ[dustI] = Math.sin(dustAngle) * dustSpread - forwardZ * strength * 0.08;
                        lrvDustLife[dustI] = 0.28 + strength * 0.36 + lrvDustRand() * 0.12;
                      }
                    }

                    function resetLrvImpactContact() {
                      lrvImpactArmTime = 0;
                      lrvImpactContactValid = false;
                      lrvImpactVelocityFiltered = 0;
                      lrvImpactSignal = 0;
                    }

                    function resetLrvImpactEffects() {
                      resetLrvImpactContact();
                      lrvImpactAudioEnvelope = 0;
                      lrvImpactCameraEnvelope = 0;
                      lrvImpactSpring = 0;
                      lrvImpactSpringVelocity = 0;
                      lrvCameraSteerLook = 0;
                      roverVisualShell.position.y = 0;
                      if (lrvImpactDatasetActive) {
                        lrvImpactDatasetActive = false;
                        canvasEl.dataset.lrvImpact = '0.000';
                      }
                    }

                    function registerLrvImpact(strength) {
                      var bounded = Math.max(0, Math.min(1, strength));
                      if (bounded <= 0) return;
                      lrvImpactSignal = bounded;
                      lrvImpactCount++;
                      lrvImpactCooldown = 0.28;
                      lrvImpactSpringVelocity -= bounded * 0.16;
                      lrvImpactAudioEnvelope = Math.max(lrvImpactAudioEnvelope, bounded);
                      lrvImpactCameraEnvelope = Math.max(lrvImpactCameraEnvelope, bounded);
                      emitLunarDustBurst(roverGrp.position.x, roverGrp.position.z,
                        lrvForward.x, lrvForward.z, bounded, _evaLowPower ? 3 : 7);
                      lrvImpactDatasetActive = true;
                      canvasEl.dataset.lrvImpact = bounded.toFixed(3);
                      canvasEl.dataset.lrvImpactCount = String(lrvImpactCount);
                    }

                    // ── Rocks: the fresh crater's blocky ejecta, a scatter, and a cobble field ──
                    // Three instanced shapes, so hundreds of rocks cost three draw calls. Each
                    // carries a baked sun visibility (a boulder down in a shadowed crater bowl
                    // must not glow) and a tint; the big ones are solid to walk into.
                    var _rockGeos = [0, 1, 2].map(function (k) { return mmBoulderGeometry(THREE, 3 + k * 7); });
                    var _rockMat = mmLunarShade(THREE, new THREE.MeshStandardMaterial({ color: 0x191816, roughness: 1, metalness: 0 }), 'rock', _evaLowPower);
                    var _rockMeshes = [], _evaRockObstacles = [];
                    (function placeRocks() {
                      var byShape = [[], [], []], dummy = new THREE.Object3D();
                      _lunarField.rocks.forEach(function (r) { byShape[r.v].push(r); });
                      byShape.forEach(function (list, v) {
                        if (!list.length) return;
                        var im = new THREE.InstancedMesh(_rockGeos[v], _rockMat, list.length);
                        var inst = new Float32Array(list.length * 2);
                        list.forEach(function (r, k) {
                          var gy = _terrainHeightAt(r.x, r.z), ry = r.s * r.sy;
                          dummy.position.set(r.x, gy + ry * 0.12, r.z);
                          dummy.rotation.set(r.tilt, r.yaw, r.tilt * 0.6);
                          dummy.scale.set(r.s, ry, r.s * (0.8 + 0.08 * (k % 5)));
                          dummy.updateMatrix();
                          im.setMatrixAt(k, dummy.matrix);
                          inst[k * 2] = mmSmooth(-0.03, 0.03, mmSunClearance(_lunarBakeHeight, r.x, r.z, gy + ry * 0.6, 60));
                          inst[k * 2 + 1] = r.tint;
                          if (r.s >= 0.35) _evaRockObstacles.push([r.x, r.z, r.s * 0.85, gy + ry * 0.8]);
                        });
                        _rockGeos[v].setAttribute('lunarInst', new THREE.InstancedBufferAttribute(inst, 2));
                        im.instanceMatrix.needsUpdate = true;
                        im.frustumCulled = false;     // r128 culls an InstancedMesh by its one source shape
                        im.receiveShadow = true;
                        scene.add(im);
                        _rockMeshes.push(im);
                      });
                    })();

                    // ── The far field: curving ground out to the horizon ──
                    // A lattice that is fine at the square's edge and coarsens outward to
                    // ~3.4 km, with the Moon's curvature taken off (3.4 m at the edge), so
                    // the ground rolls over a true horizon about 2.5 km away instead of
                    // stopping at a cliff. Cells inside the walkable square are skipped.
                    var lunarHorizonGeo = new THREE.BufferGeometry();
                    (function buildFarField() {
                      var coords = [], inner = [], outer = [], d = 100, st = _LUNAR_SEAM;
                      for (var c = -100; c <= 100.001; c += _LUNAR_SEAM) inner.push(c);
                      while (d < 3400) { st *= _evaLowPower ? 1.15 : 1.09; d += st; outer.push(d); }
                      for (var k = outer.length - 1; k >= 0; k--) coords.push(-outer[k]);
                      coords = coords.concat(inner);
                      for (k = 0; k < outer.length; k++) coords.push(outer[k]);
                      var n = coords.length, pos = new Float32Array(n * n * 3), bake = new Float32Array(n * n * 3), idx = [];
                      var hAt = function (x, z) { var hm = _lunarMidGrid.at(x, z); return hm === hm ? hm : _lunarOuterGrid.at(x, z); };
                      for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
                        var fx = coords[i], fz = coords[j], o = j * n + i;
                        var inSq = Math.abs(fx) <= 100.001 && Math.abs(fz) <= 100.001;
                        var fh = inSq ? _lunarSeamGrid.at(fx, fz) : _lunarFarHeight(fx, fz);
                        if (i === 0 || j === 0 || i === n - 1 || j === n - 1) fh -= 60;   // skirt under the far edge
                        pos[o * 3] = fx; pos[o * 3 + 1] = fh; pos[o * 3 + 2] = fz;
                        var reach = Math.max(80, Math.hypot(fx, fz) * 0.25);
                        bake[o * 3] = inSq ? 1 : mmSunClearance(hAt, fx, fz, fh, reach);
                        bake[o * 3 + 1] = inSq ? 1 : mmSkyView(hAt, fx, fz, fh, 4, 5, reach * 0.5);
                        bake[o * 3 + 2] = _lunarField.albedo(fx, fz);
                      }
                      for (j = 0; j < n - 1; j++) for (i = 0; i < n - 1; i++) {
                        if (coords[i] >= -100.001 && coords[i + 1] <= 100.001 && coords[j] >= -100.001 && coords[j + 1] <= 100.001) continue;
                        var a = j * n + i, b = (j + 1) * n + i, cc = (j + 1) * n + i + 1, dd = j * n + i + 1;
                        idx.push(a, b, dd, b, cc, dd);
                      }
                      lunarHorizonGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
                      lunarHorizonGeo.setAttribute('lunarBake', new THREE.BufferAttribute(bake, 3));
                      lunarHorizonGeo.setIndex(idx);
                      lunarHorizonGeo.computeVertexNormals();
                    })();
                    var lunarHorizonMat = terrainMat;
                    var lunarHorizon = new THREE.Mesh(lunarHorizonGeo, lunarHorizonMat);
                    lunarHorizon.castShadow = false; lunarHorizon.receiveShadow = false;
                    lunarHorizon.frustumCulled = false;
                    scene.add(lunarHorizon);

                    // ── Massifs beyond the horizon ──
                    // 7 to 16 km out and up to 1.9 km high, their feet hidden by the curve
                    // of the ground, as the valley walls stood around Apollo 15 and 17.
                    // Highland rock is brighter than the dark mare plain you stand on.
                    var _massifMeshes = [];
                    _lunarField.massifs.forEach(function (m) {
                      var n = _evaLowPower ? 30 : 64, span = m.r * 2.4, x0 = m.x - span / 2, z0 = m.z - span / 2, step = span / (n - 1);
                      var mh = function (x, z) { return _lunarField.massifHeight(m, x, z) - _lunarField.curvature(x, z); };
                      var pos = new Float32Array(n * n * 3), bake = new Float32Array(n * n * 3), idx = [];
                      for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
                        var x = x0 + i * step, z = z0 + j * step, o = j * n + i, h = mh(x, z);
                        if (i === 0 || j === 0 || i === n - 1 || j === n - 1) h -= 150;
                        pos[o * 3] = x; pos[o * 3 + 1] = h; pos[o * 3 + 2] = z;
                        bake[o * 3] = 1;   // shaded by facing alone: a coarse baked edge breaks up into shards
                        bake[o * 3 + 1] = 1;
                        bake[o * 3 + 2] = 0.95 + 0.12 * mmLunarNoise(x / 1400, z / 1400, m.seed + 3);
                        if (j < n - 1 && i < n - 1) idx.push(o, o + n, o + 1, o + n, o + n + 1, o + 1);
                      }
                      var geo = new THREE.BufferGeometry();
                      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
                      geo.setAttribute('lunarBake', new THREE.BufferAttribute(bake, 3));
                      geo.setIndex(idx);
                      geo.computeVertexNormals();
                      var mesh = new THREE.Mesh(geo, terrainMat);
                      mesh._mmNoCast = true;
                      scene.add(mesh);
                      _massifMeshes.push(mesh);
                    });
                    canvasEl.dataset.lunarSurfaceProfile = _evaLowPower
                      ? 'regolith-low+farfield+massifs' : 'regolith-high+farfield+massifs';

                    // All static scenery built → mark it as shadow CASTERS in one pass (the
                    // terrain receives). Sample orbs / bootprints are added after this on
                    // purpose: glowing beacons and decals shouldn't cast, and skipping them
                    // keeps the shadow pass cheap. No-op when shadows are off (low-power).
                    if (!_evaLowPower) {
                      scene.traverse(function (n3) {
                        if (!n3.isMesh || n3 === terrain || n3 === lunarHorizon || n3._mmNoCast) return;
                        var m3 = n3.material;
                        if (m3 && (m3.isSpriteMaterial || m3.side === THREE.BackSide)) return;   // sky shell must NEVER cast — it surrounds the shadow frustum
                        n3.castShadow = true;
                      });
                    }
                    // The rover, ALSEP and flag hardware reflect the same surroundings as the LM.
                    if (_evaEnvMap) {
                      scene.traverse(function (n4) {
                        var m4 = n4.isMesh && n4.material;
                        if (!m4 || !m4.isMeshStandardMaterial || m4.envMap || m4 === terrainMat || m4 === _rockMat) return;
                        m4.envMap = _evaEnvMap; m4.needsUpdate = true;
                      });
                    }

                    // ── Bounded paired LRV wheel tracks ──
                    // One InstancedMesh ring keeps this to one draw call and constant scene
                    // size. Every unused slot begins at zero scale; travelled pairs recycle
                    // old slots after reaching the cap. All temporaries are preallocated.
                    var LRV_TRACK_CAP = _evaLowPower ? 48 : 96; // always even: 24 / 48 pairs
                    var LRV_TRACK_SPACING = _evaLowPower ? 0.9 : 0.68;
                    var lrvTrackGeo = new THREE.PlaneGeometry(0.17, 0.58);
                    var lrvTrackMat = new THREE.MeshBasicMaterial({
                      color: 0x3f3b37,
                      transparent: true,
                      opacity: _evaLowPower ? 0.18 : 0.25,
                      depthWrite: false,
                      side: THREE.DoubleSide,
                      polygonOffset: true,
                      polygonOffsetFactor: -1,
                      polygonOffsetUnits: -1
                    });
                    var lrvTracks = new THREE.InstancedMesh(lrvTrackGeo, lrvTrackMat, LRV_TRACK_CAP);
                    lrvTracks.castShadow = false;
                    lrvTracks.receiveShadow = false;
                    lrvTracks.frustumCulled = false;
                    lrvTracks.renderOrder = 1;
                    if (lrvTracks.instanceMatrix && lrvTracks.instanceMatrix.setUsage && THREE.DynamicDrawUsage) {
                      lrvTracks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                    }
                    var lrvTrackDummy = new THREE.Object3D();
                    var lrvTrackTangent = new THREE.Vector3();
                    var lrvTrackRightAxis = new THREE.Vector3();
                    var lrvTrackUp = new THREE.Vector3();
                    var lrvTrackBasis = new THREE.Matrix4();
                    var lrvTrackQuaternion = new THREE.Quaternion();
                    lrvTrackDummy.scale.set(0, 0, 0);
                    lrvTrackDummy.updateMatrix();
                    for (var lti = 0; lti < LRV_TRACK_CAP; lti++) lrvTracks.setMatrixAt(lti, lrvTrackDummy.matrix);
                    lrvTracks.instanceMatrix.needsUpdate = true;
                    scene.add(lrvTracks);
                    var lrvTrackCursor = 0, lrvTrackCount = 0, lrvTrackDistanceAccumulator = 0;
                    canvasEl.dataset.lrvTrackCount = '0';
                    canvasEl.dataset.lrvTrackCap = String(LRV_TRACK_CAP);

                    function emitLrvTrackPair() {
                      var rearX = roverGrp.position.x - lrvForward.x * 0.5;
                      var rearZ = roverGrp.position.z - lrvForward.z * 0.5;
                      var trackProbe = 0.18;
                      var trackFrontH = _terrainHeightAt(rearX + lrvForward.x * trackProbe, rearZ + lrvForward.z * trackProbe);
                      var trackRearH = _terrainHeightAt(rearX - lrvForward.x * trackProbe, rearZ - lrvForward.z * trackProbe);
                      var trackRightH = _terrainHeightAt(rearX + lrvRight.x * trackProbe, rearZ + lrvRight.z * trackProbe);
                      var trackLeftH = _terrainHeightAt(rearX - lrvRight.x * trackProbe, rearZ - lrvRight.z * trackProbe);
                      lrvTrackTangent.set(lrvForward.x * trackProbe * 2, trackFrontH - trackRearH, lrvForward.z * trackProbe * 2).normalize();
                      lrvTrackRightAxis.set(lrvRight.x * trackProbe * 2, trackRightH - trackLeftH, lrvRight.z * trackProbe * 2).normalize();
                      // x=right, y=tangent, z=up: x cross y = z, so the basis has
                      // positive determinant (no reflected/left-handed track instances).
                      lrvTrackUp.crossVectors(lrvTrackRightAxis, lrvTrackTangent).normalize();
                      lrvTrackRightAxis.crossVectors(lrvTrackTangent, lrvTrackUp).normalize();
                      lrvTrackBasis.makeBasis(lrvTrackRightAxis, lrvTrackTangent, lrvTrackUp);
                      lrvTrackQuaternion.setFromRotationMatrix(lrvTrackBasis).normalize();
                      for (var trackSideI = 0; trackSideI < 2; trackSideI++) {
                        var trackSide = trackSideI === 0 ? -0.71 : 0.71;
                        var trackX = rearX + lrvRight.x * trackSide;
                        var trackZ = rearZ + lrvRight.z * trackSide;
                        lrvTrackDummy.position.set(trackX, _terrainHeightAt(trackX, trackZ) + 0.018, trackZ);
                        lrvTrackDummy.quaternion.copy(lrvTrackQuaternion);
                        lrvTrackDummy.scale.set(1, 1, 1);
                        lrvTrackDummy.updateMatrix();
                        lrvTracks.setMatrixAt(lrvTrackCursor, lrvTrackDummy.matrix);
                        lrvTrackCursor = (lrvTrackCursor + 1) % LRV_TRACK_CAP;
                        lrvTrackCount = Math.min(LRV_TRACK_CAP, lrvTrackCount + 1);
                      }
                      lrvTracks.instanceMatrix.needsUpdate = true;
                      canvasEl.dataset.lrvTrackCount = String(lrvTrackCount);
                    }

                    // ── Sample collection orbs (lunar rocks) ──
                    var lunarSampleOrbs = [];
                    // What earlier runs of this scene already banked (Retry 3D Mode, or
                    // coming back to the moonwalk): those rocks stay collected.
                    var _evaBankedKeys = {};
                    (d.lunarSamples || []).forEach(function(bs) { _evaBankedKeys[mmSampleKey(bs)] = true; });
                    LUNAR_SAMPLES_DATA.forEach(function(sd, sdi) {
                      var ox = 8 + (Math.random() - 0.5) * 60;
                      var oz = 8 + (Math.random() - 0.5) * 60;
                      var oy = _terrainHeightAt(ox, oz) + 0.4;
                      var orbGroup = new THREE.Group();
                      var orbGeo = new THREE.DodecahedronGeometry(0.3, 0);
                      var orbMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, emissive: 0xfbbf24, emissiveIntensity: 1.0, transparent: true, opacity: 0.8 }); // sample orbs bloom as findable beacons
                      orbGroup.add(new THREE.Mesh(orbGeo, orbMat));
                      var ringG = new THREE.Mesh(
                        new THREE.RingGeometry(0.45, 0.55, 12),
                        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
                      );
                      ringG.rotation.x = -Math.PI / 2; ringG.position.y = -0.2;
                      orbGroup.add(ringG);
                      orbGroup.position.set(ox, oy, oz);
                      orbGroup._sampleData = sd;
                      orbGroup._sampleIdx = sdi;
                      orbGroup._collected = !!(_evaBankedKeys['sample:' + sdi] || _evaBankedKeys['name:' + sd.name]);
                      orbGroup.visible = !orbGroup._collected;
                      orbGroup._pulsePhase = Math.random() * Math.PI * 2;
                      scene.add(orbGroup);
                      lunarSampleOrbs.push(orbGroup);
                    });

                    // ── Optional Lunar Geology Traverse ──
                    // A compact authored route layered over free-roam EVA. It owns one
                    // specimen and one low-cost surface marker, but deliberately does not
                    // join landmark discovery or install another F handler.
                    var gtReducedMotion = !!(window.matchMedia &&
                      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                    var gtStatus = 'idle', gtStep = 0, gtActive = false;
                    var gtHomeX = 0, gtHomeZ = 0, gtHomeHeading = 0;
                    var gtSiteX = 0, gtSiteZ = 0, gtElapsed = 0, gtStartDistance = 0;
                    var gtPeakSlip = 0, gtPeakGrade = 0, gtParkDwell = 0;
                    var gtSampleCollected = false, gtSampleEverBanked = !!(_evaBankedKeys.traverse || _evaBankedKeys['name:' + MM_TRAVERSE_SAMPLE]);
                    var gtSampleResult = 'Not collected', gtCompleteLatched = false;
                    var gtTransitionedThisFrame = false, gtLastTargetDistance = -1;
                    var GT_SITE_RADIUS = 2.6, GT_HOME_RADIUS = 3.2;
                    var gtCandidateOffsets = [[22, 8], [24, -8], [28, 0], [18, 12]];
                    var gtForward = new THREE.Vector3(), gtRight = new THREE.Vector3();
                    var gtSurfaceForward = new THREE.Vector3(), gtSurfaceRight = new THREE.Vector3();
                    var gtSurfaceNormal = new THREE.Vector3(), gtSurfaceBasis = new THREE.Matrix4();
                    var gtSurfaceQuaternion = new THREE.Quaternion();

                    var gtBeaconGroup = new THREE.Group();
                    var gtBeaconGeo = new THREE.RingGeometry(1.05, 1.28, 28);
                    var gtBeaconMat = new THREE.MeshBasicMaterial({
                      color: 0x67e8f9, transparent: true, opacity: 0.62,
                      depthWrite: false, side: THREE.DoubleSide,
                      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
                    });
                    var gtBeaconRing = new THREE.Mesh(gtBeaconGeo, gtBeaconMat);
                    var gtBeaconPinGeo = new THREE.CylinderGeometry(0.035, 0.08, 0.75, 8);
                    var gtBeaconPinMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });
                    var gtBeaconPin = new THREE.Mesh(gtBeaconPinGeo, gtBeaconPinMat);
                    gtBeaconPin.rotation.x = Math.PI / 2;
                    gtBeaconPin.position.z = 0.39;
                    gtBeaconGroup.add(gtBeaconRing);
                    gtBeaconGroup.add(gtBeaconPin);
                    gtBeaconGroup.visible = false;
                    gtBeaconGroup.traverse(function(gtNode) {
                      if (gtNode.isMesh) { gtNode.castShadow = false; gtNode.receiveShadow = false; }
                    });
                    scene.add(gtBeaconGroup);

                    var gtSpecimenData = {
                      name: MM_TRAVERSE_SAMPLE, type: 'Field Geology Sample', icon: '\uD83D\uDFE4', xp: 18,
                      fact: 'Angular fragments fused by an ancient impact record how the lunar surface was repeatedly broken and welded together.'
                    };
                    var gtSpecimen = new THREE.Group();
                    var gtSpecimenGeo = new THREE.DodecahedronGeometry(0.34, 0);
                    var gtSpecimenMat = new THREE.MeshStandardMaterial({
                      color: 0x9b8a78, emissive: 0x22d3ee, emissiveIntensity: 0.65,
                      transparent: true, opacity: 0.92, roughness: 0.88
                    });
                    gtSpecimen.add(new THREE.Mesh(gtSpecimenGeo, gtSpecimenMat));
                    var gtSpecimenRingGeo = new THREE.RingGeometry(0.48, 0.6, 16);
                    var gtSpecimenRingMat = new THREE.MeshBasicMaterial({
                      color: 0x67e8f9, transparent: true, opacity: 0.38,
                      depthWrite: false, side: THREE.DoubleSide
                    });
                    var gtSpecimenRing = new THREE.Mesh(gtSpecimenRingGeo, gtSpecimenRingMat);
                    gtSpecimenRing.rotation.x = -Math.PI / 2;
                    gtSpecimenRing.position.y = -0.22;
                    gtSpecimen.add(gtSpecimenRing);
                    gtSpecimen._sampleData = gtSpecimenData;
                    gtSpecimen._collected = false;
                    gtSpecimen._pulsePhase = 0;
                    gtSpecimen._isTraverseSample = true;
                    gtSpecimen.visible = false;
                    scene.add(gtSpecimen);
                    lunarSampleOrbs.push(gtSpecimen);

                    // Soft contact cues improve surface attachment without enlarging the
                    // shadow map. CircleGeometry already has local +Z as its normal.
                    var gtContactGeo = new THREE.CircleGeometry(1, 24);
                    var gtContactMat = new THREE.MeshBasicMaterial({
                      color: 0x171513, transparent: true, opacity: 0.2,
                      depthWrite: false, side: THREE.DoubleSide,
                      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2
                    });
                    var gtRoverContact = new THREE.Mesh(gtContactGeo, gtContactMat);
                    var gtSuitContact = new THREE.Mesh(gtContactGeo, gtContactMat);
                    gtRoverContact.scale.set(1.05, 0.58, 1);
                    gtSuitContact.scale.set(0.3, 0.22, 1);
                    gtRoverContact.renderOrder = gtSuitContact.renderOrder = 1;
                    scene.add(gtRoverContact);
                    scene.add(gtSuitContact);
                    // Four exact-terrain tire contact cues replace the broad rover blob.
                    // A single instance ring is one draw call and never grows with travel.
                    gtRoverContact.visible = false;
                    var lrvWheelContactGeo = new THREE.PlaneGeometry(0.17, 0.34);
                    var lrvWheelContactMat = new THREE.MeshBasicMaterial({
                      color: 0x151311, transparent: true,
                      opacity: _evaLowPower ? 0.13 : 0.21,
                      depthWrite: false, side: THREE.DoubleSide,
                      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2
                    });
                    var lrvWheelContacts = new THREE.InstancedMesh(
                      lrvWheelContactGeo, lrvWheelContactMat, 4);
                    if (lrvWheelContacts.instanceMatrix.setUsage && THREE.DynamicDrawUsage) {
                      lrvWheelContacts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                    }
                    lrvWheelContacts.frustumCulled = false;
                    lrvWheelContacts.castShadow = false;
                    lrvWheelContacts.receiveShadow = false;
                    lrvWheelContacts.renderOrder = 1;
                    scene.add(lrvWheelContacts);
                    var lrvContactDummy = new THREE.Object3D();
                    var lrvContactForward = new THREE.Vector3();
                    var lrvContactRight = new THREE.Vector3();
                    var lrvContactNormal = new THREE.Vector3();
                    var lrvContactBasis = new THREE.Matrix4();
                    var lrvContactQuaternion = new THREE.Quaternion();

                    function poseLrvWheelContact(index, mount, engaged, pulse) {
                      var wheelCos = Math.cos(roverHeading), wheelSin = Math.sin(roverHeading);
                      var wheelX = roverGrp.position.x + mount._lrvX * wheelCos + mount._lrvZ * wheelSin;
                      var wheelZ = roverGrp.position.z - mount._lrvX * wheelSin + mount._lrvZ * wheelCos;
                      var wheelYaw = roverHeading + mount._lrvVisualSteer;
                      var wheelFX = -Math.sin(wheelYaw), wheelFZ = -Math.cos(wheelYaw);
                      var wheelRX = Math.cos(wheelYaw), wheelRZ = -Math.sin(wheelYaw);
                      var wheelH = _terrainHeightAt(wheelX, wheelZ);
                      if (!engaged || !isFinite(wheelH)) {
                        lrvContactDummy.position.set(wheelX, wheelH || -100, wheelZ);
                        lrvContactDummy.quaternion.identity();
                        lrvContactDummy.scale.set(0, 0, 0);
                      } else {
                        var wheelProbe = 0.11;
                        var wheelHF = _terrainHeightAt(wheelX + wheelFX * wheelProbe, wheelZ + wheelFZ * wheelProbe);
                        var wheelHR = _terrainHeightAt(wheelX + wheelRX * wheelProbe, wheelZ + wheelRZ * wheelProbe);
                        lrvContactForward.set(wheelFX * wheelProbe, wheelHF - wheelH,
                          wheelFZ * wheelProbe).normalize();
                        lrvContactRight.set(wheelRX * wheelProbe, wheelHR - wheelH,
                          wheelRZ * wheelProbe).normalize();
                        lrvContactNormal.crossVectors(lrvContactRight, lrvContactForward).normalize();
                        lrvContactRight.crossVectors(lrvContactForward, lrvContactNormal).normalize();
                        lrvContactBasis.makeBasis(
                          lrvContactRight, lrvContactForward, lrvContactNormal);
                        lrvContactQuaternion.setFromRotationMatrix(lrvContactBasis).normalize();
                        lrvContactDummy.position.set(wheelX, wheelH + 0.012, wheelZ);
                        lrvContactDummy.quaternion.copy(lrvContactQuaternion);
                        lrvContactDummy.scale.set(1 + pulse, 1 + pulse * 0.45, 1);
                      }
                      lrvContactDummy.updateMatrix();
                      lrvWheelContacts.setMatrixAt(index, lrvContactDummy.matrix);
                    }

                    function refreshLrvWheelContacts(pulse) {
                      var refreshCos = Math.cos(roverHeading), refreshSin = Math.sin(roverHeading);
                      lrvGroundedWheelCount = 0;
                      for (var rci = 0; rci < roverWheelMounts.length; rci++) {
                        var refreshMount = roverWheelMounts[rci];
                        var refreshX = roverGrp.position.x +
                          refreshMount._lrvX * refreshCos + refreshMount._lrvZ * refreshSin;
                        var refreshZ = roverGrp.position.z -
                          refreshMount._lrvX * refreshSin + refreshMount._lrvZ * refreshCos;
                        var refreshRaw = _terrainHeightAt(refreshX, refreshZ) -
                          roverGrp.position.y + 0.21;
                        var refreshEngaged = refreshRaw >= 0.095;
                        if (refreshEngaged) lrvGroundedWheelCount++;
                        poseLrvWheelContact(rci, refreshMount, refreshEngaged, pulse);
                      }
                      lrvWheelContacts.instanceMatrix.needsUpdate = true;
                    }

                    applyLrvVisualSteering(0);
                    refreshLrvWheelContacts(0);

                    function poseGtSurfaceObject(obj, x, z, lift, probe) {
                      var p = probe || 0.55;
                      var hC = _terrainHeightAt(x, z);
                      var hF = _terrainHeightAt(x + gtForward.x * p, z + gtForward.z * p);
                      var hB = _terrainHeightAt(x - gtForward.x * p, z - gtForward.z * p);
                      var hR = _terrainHeightAt(x + gtRight.x * p, z + gtRight.z * p);
                      var hL = _terrainHeightAt(x - gtRight.x * p, z - gtRight.z * p);
                      gtSurfaceForward.set(gtForward.x * p * 2, hF - hB, gtForward.z * p * 2).normalize();
                      gtSurfaceRight.set(gtRight.x * p * 2, hR - hL, gtRight.z * p * 2).normalize();
                      gtSurfaceNormal.crossVectors(gtSurfaceRight, gtSurfaceForward).normalize();
                      gtSurfaceRight.crossVectors(gtSurfaceForward, gtSurfaceNormal).normalize();
                      gtSurfaceBasis.makeBasis(gtSurfaceRight, gtSurfaceForward, gtSurfaceNormal);
                      gtSurfaceQuaternion.setFromRotationMatrix(gtSurfaceBasis).normalize();
                      obj.position.set(x, hC + lift, z);
                      obj.quaternion.copy(gtSurfaceQuaternion);
                    }

                    function gtConflictsWithScene(x, z) {
                      var fixed = [[0, 0, 7], [4, 2, 4], [alsepX, alsepZ, 6]];
                      for (var fi = 0; fi < fixed.length; fi++) {
                        if (Math.hypot(x - fixed[fi][0], z - fixed[fi][1]) < fixed[fi][2]) return true;
                      }
                      for (var oi = 0; oi < lunarSampleOrbs.length; oi++) {
                        var ordinaryOrb = lunarSampleOrbs[oi];
                        if (!ordinaryOrb._isTraverseSample &&
                            Math.hypot(x - ordinaryOrb.position.x, z - ordinaryOrb.position.z) < 4.5) return true;
                      }
                      return false;
                    }

                    function chooseGtSite() {
                      gtForward.set(-Math.sin(gtHomeHeading), 0, -Math.cos(gtHomeHeading));
                      gtRight.set(Math.cos(gtHomeHeading), 0, -Math.sin(gtHomeHeading));
                      for (var ci = 0; ci < gtCandidateOffsets.length; ci++) {
                        var candidate = gtCandidateOffsets[ci];
                        var x = gtHomeX + gtForward.x * candidate[0] + gtRight.x * candidate[1];
                        var z = gtHomeZ + gtForward.z * candidate[0] + gtRight.z * candidate[1];
                        if (!isFinite(x) || !isFinite(z) || Math.abs(x) > 86 || Math.abs(z) > 86) continue;
                        var p = 0.8;
                        var hc = _terrainHeightAt(x, z);
                        var hf = _terrainHeightAt(x + gtForward.x * p, z + gtForward.z * p);
                        var hb = _terrainHeightAt(x - gtForward.x * p, z - gtForward.z * p);
                        var hr = _terrainHeightAt(x + gtRight.x * p, z + gtRight.z * p);
                        var hl = _terrainHeightAt(x - gtRight.x * p, z - gtRight.z * p);
                        if (![hc, hf, hb, hr, hl].every(isFinite)) continue;
                        if (Math.abs((hf - hb) / (p * 2)) > 0.34 ||
                            Math.abs((hr - hl) / (p * 2)) > 0.34 ||
                            gtConflictsWithScene(x, z)) continue;
                        gtSiteX = x; gtSiteZ = z;
                        poseGtSurfaceObject(gtBeaconGroup, x, z, 0.025, p);
                        gtSpecimen.position.set(x, hc + 0.35, z);
                        return true;
                      }
                      return false;
                    }

                    canvasEl.dataset.geologyTraverseStatus = 'idle';
                    canvasEl.dataset.geologyTraverseStep = '0';
                    canvasEl.dataset.geologyTraverseTargetDistance = '-1.0';
                    canvasEl.dataset.geologyTraverseDistance = '0.0';
                    var gtNarrow = (canvasEl.clientWidth || W) < 560;   // phone-width canvas: panel stays compact until the traverse runs
                    var gtPanel = document.createElement('section');
                    gtPanel.id = 'eva-geology-traverse';
                    gtPanel.setAttribute('aria-label', 'Optional Lunar Geology Traverse');
                    gtPanel.style.cssText = 'position:absolute;top:8px;right:8px;z-index:13;width:min(250px,42%);background:rgba(8,15,28,.9);border:1px solid rgba(103,232,249,.4);border-radius:10px;padding:9px;color:#e2e8f0;font:10px/1.35 system-ui;box-shadow:0 5px 18px rgba(0,0,0,.35)';
                    gtPanel.innerHTML =
                      '<div style="font-weight:800;color:#67e8f9;font-size:11px">Lunar Geology Traverse</div>' +
                      '<div id="eva-gt-summary" style="color:#cbd5e1;margin:3px 0 5px">Optional authored route; free roam remains available.</div>' +
                      '<ol id="eva-gt-steps" style="margin:0 0 6px 18px;padding:0;color:#94a3b8">' +
                      '<li>Board the LRV</li><li>Drive to the geology beacon</li>' +
                      '<li>Park, exit, and collect with F</li><li>Board and return to start</li>' +
                      '<li>Park and exit for debrief</li></ol>' +
                      '<button id="eva-gt-action" type="button" style="pointer-events:auto;width:100%;padding:6px;border-radius:7px;border:1px solid rgba(103,232,249,.55);background:#164e63;color:#ecfeff;font-weight:800;cursor:pointer">Start optional traverse</button>';
                    canvasEl.parentElement.appendChild(gtPanel);
                    var gtSummaryEl = gtPanel.querySelector('#eva-gt-summary');
                    var gtStepsEl = gtPanel.querySelector('#eva-gt-steps');
                    var gtStepEls = gtStepsEl ? gtStepsEl.children : [];
                    var gtActionEl = gtPanel.querySelector('#eva-gt-action');
                    var gtStepNames = [
                      'Board the LRV', 'Drive to the geology beacon',
                      'Park, exit, and collect with F', 'Board and return to start',
                      'Park and exit for debrief'
                    ];

                    function setGtDataset(key, value) {
                      if (canvasEl.dataset[key] !== value) canvasEl.dataset[key] = value;
                    }
                    function renderGtPanel() {
                      var labels = [
                        'Optional authored route; free roam remains available.',
                        'Board the LRV to begin the traverse.',
                        'Drive to the cyan geology beacon and park.',
                        'Exit on foot and press F beside the traverse specimen.',
                        'Board the LRV and return to the start beacon.',
                        'Park, then exit the LRV to finish.'
                      ];
                      if (gtSummaryEl) {
                        var summary = gtStatus === 'complete'
                          ? 'Debrief: ' + gtElapsed.toFixed(1) + ' s · ' +
                            Math.max(0, roverDistance - gtStartDistance).toFixed(1) + ' m · peak slip ' +
                            Math.round(gtPeakSlip * 100) + '% · peak grade ' +
                            (gtPeakGrade * 100).toFixed(1) + '% · ' + gtSampleResult
                          : (gtStatus === 'unavailable' ? 'No safe geology site is available from this parking position.' : labels[gtStep]);
                        if (gtSummaryEl.textContent !== summary) gtSummaryEl.textContent = summary;
                      }
                      for (var si = 0; si < gtStepEls.length; si++) {
                        var done = gtStatus === 'complete' || (gtStep > si + 1);
                        var current = gtStatus === 'active' && gtStep === si + 1;
                        var stepText = (done ? '✓ ' : (current ? '→ ' : '○ ')) + gtStepNames[si];
                        if (gtStepEls[si].textContent !== stepText) gtStepEls[si].textContent = stepText;
                        gtStepEls[si].style.color = done ? '#86efac' : (current ? '#fde68a' : '#94a3b8');
                        gtStepEls[si].style.fontWeight = current ? '800' : '400';
                      }
                      if (gtActionEl) gtActionEl.textContent = gtStatus === 'complete'
                        ? 'Replay traverse' : (gtStatus === 'active' ? 'Restart traverse' : 'Start optional traverse');
                      if (gtNarrow) {
                        var showGtDetail = gtStatus === 'active' || gtStatus === 'complete';
                        if (gtStepsEl) gtStepsEl.style.display = showGtDetail ? '' : 'none';
                        if (gtSummaryEl) gtSummaryEl.style.display = showGtDetail ? '' : 'none';
                      }
                    }
                    function startGtMission() {
                      gtHomeX = roverGrp.position.x;
                      gtHomeZ = roverGrp.position.z;
                      gtHomeHeading = roverHeading;
                      gtElapsed = 0; gtStartDistance = roverDistance;
                      gtPeakSlip = 0; gtPeakGrade = 0; gtParkDwell = 0;
                      gtSampleCollected = false; gtSampleResult = 'Not collected';
                      gtCompleteLatched = false; gtTransitionedThisFrame = false;
                      gtSpecimen._collected = false;
                      gtSpecimen.visible = false;
                      if (!chooseGtSite()) {
                        gtStatus = 'unavailable'; gtStep = 0; gtActive = false;
                        gtSpecimen.visible = false; gtBeaconGroup.visible = false;
                        setGtDataset('geologyTraverseStatus', 'unavailable');
                        renderGtPanel();
                        return;
                      }
                      gtStatus = 'active'; gtStep = 1; gtActive = true;
                      gtSpecimen.visible = false; gtBeaconGroup.visible = true;
                      gtBeaconRing.scale.set(1, 1, 1);
                      setGtDataset('geologyTraverseStatus', 'active');
                      setGtDataset('geologyTraverseStep', '1');
                      setGtDataset('geologyTraverseDistance', '0.0');
                      renderGtPanel();
                      if (typeof announceToSR === 'function') {
                        announceToSR('Optional Lunar Geology Traverse started. First, board the Lunar Roving Vehicle.');
                      }
                    }
                    function onGtAction() {
                      startGtMission();
                      try { canvasEl.focus(); } catch (_gtFocusErr) {}
                    }
                    gtActionEl.addEventListener('click', onGtAction);
                    renderGtPanel();

                    function advanceGtStep(nextStep, announcement) {
                      if (!gtActive || gtTransitionedThisFrame || nextStep <= gtStep) return false;
                      gtTransitionedThisFrame = true;
                      gtStep = nextStep;
                      gtParkDwell = 0;
                      setGtDataset('geologyTraverseStep', String(gtStep));
                      gtSpecimen.visible = gtStep === 3 && !gtSpecimen._collected;
                      if (gtStep >= 4) {
                        gtForward.set(-Math.sin(gtHomeHeading), 0, -Math.cos(gtHomeHeading));
                        gtRight.set(Math.cos(gtHomeHeading), 0, -Math.sin(gtHomeHeading));
                        poseGtSurfaceObject(gtBeaconGroup, gtHomeX, gtHomeZ, 0.025, 0.8);
                      }
                      renderGtPanel();
                      if (announcement && typeof announceToSR === 'function') announceToSR(announcement);
                      return true;
                    }

                    function completeGtMission() {
                      if (!gtActive || gtCompleteLatched || gtTransitionedThisFrame) return;
                      gtTransitionedThisFrame = true;
                      gtCompleteLatched = true;
                      gtActive = false;
                      gtStatus = 'complete';
                      gtStep = 5;
                      gtBeaconGroup.visible = false;
                      gtSpecimen.visible = false;
                      setGtDataset('geologyTraverseStatus', 'complete');
                      setGtDataset('geologyTraverseStep', '5');
                      setGtDataset('geologyTraverseTargetDistance', '0.0');
                      setGtDataset('geologyTraverseDistance',
                        Math.max(0, roverDistance - gtStartDistance).toFixed(1));
                      renderGtPanel();
                      if (addToast) addToast('Lunar Geology Traverse complete — debrief ready.', 'success');
                      if (typeof announceToSR === 'function') {
                        announceToSR('Lunar Geology Traverse complete. The debrief is available in the traverse panel.');
                      }
                    }

                    function updateGtMission(evaDt) {
                      if (!gtActive || _evaVRPaused) return;
                      gtTransitionedThisFrame = false;
                      gtElapsed += evaDt;
                      gtPeakSlip = Math.max(gtPeakSlip, lrvSlipSignal);
                      gtPeakGrade = Math.max(gtPeakGrade, Math.abs(lrvGradeRatio));
                      var targetX = gtStep <= 3 ? gtSiteX : gtHomeX;
                      var targetZ = gtStep <= 3 ? gtSiteZ : gtHomeZ;
                      var targetDistance = Math.hypot(roverGrp.position.x - targetX, roverGrp.position.z - targetZ);
                      gtLastTargetDistance = targetDistance;
                      if (evaTick % 10 === 0) {
                        setGtDataset('geologyTraverseTargetDistance', targetDistance.toFixed(1));
                        setGtDataset('geologyTraverseDistance',
                          Math.max(0, roverDistance - gtStartDistance).toFixed(1));
                      }
                      if (!gtReducedMotion) {
                        var gtPulse = 1 + Math.sin(gtElapsed * 2.4) * 0.055;
                        gtBeaconRing.scale.set(gtPulse, gtPulse, 1);
                      }
                      if (gtStep === 1) {
                        if (roverBoarded) {
                          advanceGtStep(2, 'Drive to the cyan geology beacon and park the rover.');
                        }
                        return;
                      }
                      if (gtStep === 2) {
                        if (roverBoarded && targetDistance <= GT_SITE_RADIUS && Math.abs(roverSpeed) <= 0.12) {
                          gtParkDwell += evaDt;
                          if (gtParkDwell >= 0.65) {
                            advanceGtStep(3, 'Geology site reached. Exit the rover and press F beside the traverse specimen.');
                          }
                        } else {
                          gtParkDwell = 0;
                        }
                        return;
                      }
                      if (gtStep === 3) {
                        gtParkDwell = 0;
                        if (gtSampleCollected) {
                          advanceGtStep(4, 'Traverse sample collected. Board the rover and return to the start beacon.');
                        }
                        return;
                      }
                      if (gtStep === 4) {
                        if (roverBoarded && targetDistance <= GT_HOME_RADIUS && Math.abs(roverSpeed) <= 0.12) {
                          gtParkDwell += evaDt;
                          if (gtParkDwell >= 0.65) {
                            advanceGtStep(5, 'Return parking complete. Exit the rover for the traverse debrief.');
                          }
                        } else {
                          gtParkDwell = 0;
                        }
                        return;
                      }
                      if (gtStep === 5 && !roverBoarded &&
                          targetDistance <= GT_HOME_RADIUS && Math.abs(roverSpeed) <= 0.12) {
                        completeGtMission();
                      }
                    }

                    // ── Bootprint decals (leave prints as you walk) ──
                    // Fixed one-draw instance ring: long EVAs never add scene nodes or
                    // allocate geometry/materials in the animation loop.
                    var EVA_BOOTPRINT_CAP = _evaLowPower ? 64 : 160;
                    var evaBootprintGeo = new THREE.PlaneGeometry(0.15, 0.25);
                    var evaBootprintMat = new THREE.MeshBasicMaterial({
                      color: 0x4b4946, transparent: true,
                      opacity: _evaLowPower ? 0.22 : 0.3,
                      depthWrite: false, side: THREE.DoubleSide,
                      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2
                    });
                    var evaBootprints = new THREE.InstancedMesh(
                      evaBootprintGeo, evaBootprintMat, EVA_BOOTPRINT_CAP);
                    if (evaBootprints.instanceMatrix.setUsage && THREE.DynamicDrawUsage) {
                      evaBootprints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                    }
                    evaBootprints.frustumCulled = false;
                    evaBootprints.castShadow = false;
                    evaBootprints.receiveShadow = false;
                    evaBootprints.renderOrder = 1;
                    scene.add(evaBootprints);
                    var evaBootprintDummy = new THREE.Object3D();
                    var evaBootprintForward = new THREE.Vector3();
                    var evaBootprintRight = new THREE.Vector3();
                    var evaBootprintNormal = new THREE.Vector3();
                    var evaBootprintBasis = new THREE.Matrix4();
                    var evaBootprintQuaternion = new THREE.Quaternion();
                    var evaBootprintCursor = 0, evaBootprintCount = 0, evaBootprintSide = -1;
                    var evaBootprintDistanceAccumulator = 0, evaStepDistanceAccumulator = 0;
                    var EVA_BOOTPRINT_SPACING = _evaLowPower ? 1.5 : 1.05;
                    var EVA_STEP_STRIDE = 1.2;
                    evaBootprintDummy.position.set(0, -100, 0);
                    evaBootprintDummy.scale.set(0, 0, 0);
                    evaBootprintDummy.updateMatrix();
                    for (var ebi = 0; ebi < EVA_BOOTPRINT_CAP; ebi++) {
                      evaBootprints.setMatrixAt(ebi, evaBootprintDummy.matrix);
                    }
                    evaBootprints.instanceMatrix.needsUpdate = true;
                    canvasEl.dataset.evaBootprintCount = '0';
                    canvasEl.dataset.evaBootprintCap = String(EVA_BOOTPRINT_CAP);

                    function emitEvaBootprint(x, z, heading) {
                      evaBootprintSide *= -1;
                      var printFX = -Math.sin(heading), printFZ = -Math.cos(heading);
                      var printRX = Math.cos(heading), printRZ = -Math.sin(heading);
                      var printX = x + printRX * evaBootprintSide * 0.115;
                      var printZ = z + printRZ * evaBootprintSide * 0.115;
                      var printH = _terrainHeightAt(printX, printZ);
                      var printProbe = 0.11;
                      var printHF = _terrainHeightAt(
                        printX + printFX * printProbe, printZ + printFZ * printProbe);
                      var printHR = _terrainHeightAt(
                        printX + printRX * printProbe, printZ + printRZ * printProbe);
                      evaBootprintForward.set(printFX * printProbe, printHF - printH,
                        printFZ * printProbe).normalize();
                      evaBootprintRight.set(printRX * printProbe, printHR - printH,
                        printRZ * printProbe).normalize();
                      evaBootprintNormal.crossVectors(
                        evaBootprintRight, evaBootprintForward).normalize();
                      evaBootprintRight.crossVectors(
                        evaBootprintForward, evaBootprintNormal).normalize();
                      evaBootprintBasis.makeBasis(
                        evaBootprintRight, evaBootprintForward, evaBootprintNormal);
                      evaBootprintQuaternion.setFromRotationMatrix(
                        evaBootprintBasis).normalize();
                      evaBootprintDummy.position.set(printX, printH + 0.011, printZ);
                      evaBootprintDummy.quaternion.copy(evaBootprintQuaternion);
                      evaBootprintDummy.scale.set(1, 1, 1);
                      evaBootprintDummy.updateMatrix();
                      evaBootprints.setMatrixAt(evaBootprintCursor, evaBootprintDummy.matrix);
                      evaBootprintCursor = (evaBootprintCursor + 1) % EVA_BOOTPRINT_CAP;
                      evaBootprintCount = Math.min(EVA_BOOTPRINT_CAP, evaBootprintCount + 1);
                      evaBootprints.instanceMatrix.needsUpdate = true;
                    }

                    // ── Movement (1/6 gravity bouncing) ──
                    // turnLeft/turnRight exist because yaw was mouse-ONLY: arrow keys and A/D
                    // both strafe, so a keyboard-only student could slide around the regolith
                    // but never turn to face anything. Q/E steer the suit.
                    var moveState = { forward: false, back: false, left: false, right: false, sample: false, turnLeft: false, turnRight: false, lope: false };
                    // Height reserved along the bottom edge for the on-screen control pad.
                    // Every other bottom-anchored overlay offsets by this, or the pad simply
                    // covers it — on a phone that hid the rover's own Board button.
                    var evaPadSize = (canvasEl.clientWidth || W) < 560 ? 50 : 40;
                    var evaPadBand = evaPadSize + 16;
                    var yaw = 0, pitch = 0;
                    var playerPos = new THREE.Vector3(3, _terrainHeightAt(3, 3) + 1.8, 3);
                    var playerVelY = 0;   // m/s
                    var isJumping = false;
                    // The jump integrated per FRAME: 0.12 up and 0.0027 down each frame is
                    // 7.2 m/s against 9.72 m/s^2 at 60 fps (Earth's gravity, 2.7 m high) and
                    // twice as strong at 120 Hz, under a label saying one-sixth gravity.
                    // Now per second: 1.7 m/s up against the Moon's 1.62 m/s^2 is a 0.9 m hop
                    // lasting 2.1 s, the "three feet" the LMP's radio line describes.
                    var EVA_G = 1.62, EVA_JUMP_V0 = 1.7;
                    var evaHopStart = 0;   // wall clock at take-off, for the hop timer
                    // Suit state for mmEvaFootVelocity: horizontal velocity, time spent
                    // striding, and the visual bob and knee flex riding on the physics.
                    var evaVel = { x: 0, z: 0 }, evaStrideTime = 0, evaGaitPhase = 0, evaBob = 0, evaKnee = 0, evaKneeVel = 0, evaLope = false;
                    // Things you cannot walk through: the descent stage and its four pads,
                    // the ALSEP central station, the bigger boulders, and the parked rover.
                    // [x, z, radius, top]; you can sail over anything lower than your boots.
                    var _evaSolids = [[0, 0, 1.8, lmGroup.position.y + 4.6], [alsepX, alsepZ, 0.42, alsepY + 0.3]]
                      .concat([[3.67, 0], [-3.67, 0], [0, 3.67], [0, -3.67]].map(function (pd) { return [pd[0], pd[1], 0.4, lmGroup.position.y + 0.22]; }))
                      .concat(_evaRockObstacles);
                    function evaPushOut(ox, oz, r, top, footY) {
                      if (footY > top) return;
                      var dx = playerPos.x - ox, dz = playerPos.z - oz, rr = r + 0.3, d2 = dx * dx + dz * dz;
                      if (d2 >= rr * rr || d2 < 1e-8) return;
                      var d = Math.sqrt(d2), nx = dx / d, nz = dz / d;
                      playerPos.x = ox + nx * rr; playerPos.z = oz + nz * rr;
                      var vn = evaVel.x * nx + evaVel.z * nz;
                      if (vn < 0) { evaVel.x -= vn * nx; evaVel.z -= vn * nz; }
                    }
                    function evaCollide() {
                      var footY = playerPos.y - 1.8;
                      for (var k = 0; k < _evaSolids.length; k++) {
                        var so = _evaSolids[k];
                        if (Math.abs(playerPos.x - so[0]) < so[2] + 0.3 && Math.abs(playerPos.z - so[1]) < so[2] + 0.3) evaPushOut(so[0], so[1], so[2], so[3], footY);
                      }
                      if (!roverBoarded) evaPushOut(roverGrp.position.x, roverGrp.position.z, 0.9, roverGrp.position.y + 1.2, footY);
                    }

                    // ── The astronaut's own body ──
                    // You were a floating camera: no suit, and — because a camera casts
                    // nothing — no shadow. A hard black shadow thrown across the regolith
                    // ahead of you is THE signature of every Apollo surface photograph, and
                    // its absence is most of why the scene read as a diorama rather than a
                    // place you were standing in. This proxy sits below the eye line, so it
                    // is only in frame when you look down at your own boots, but it casts
                    // for real. Added after the caster traverse above, so castShadow is set
                    // by hand here.
                    var suitGroup = new THREE.Group();
                    // Deliberately off-white and very rough. A pure-white suit under a 1.6
                    // sun sails past the bloom threshold and the chest renders as a glowing
                    // ball hanging in the middle of the down-view. Apollo suits do blow out
                    // in the real photographs, but not into a light source.
                    var suitWhite = new THREE.MeshStandardMaterial({ color: 0xbfbfba, roughness: 0.97, metalness: 0.0, envMap: _evaEnvMap });
                    var suitDark = new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.9, metalness: 0.08, envMap: _evaEnvMap });
                    // CapsuleGeometry landed in three r141 and this app pins r128, so the
                    // constructor must be TESTED, not invoked, before choosing.
                    // Sized and placed off the EYE, which sits 1.8 above the ground: chest
                    // top at -0.72 keeps it out of the way at the -1.2 rad pitch limit, and
                    // the boots land at -1.78 so they rest on the regolith rather than
                    // sinking into it. First pass put the chest 0.12 below the eyes and
                    // looking down filled the whole screen with a white wall.
                    // Low-poly on purpose: this body is a shadow caster first and a glimpse
                    // of your own boots second, and every triangle here is paid for twice —
                    // once in the shadow pass and once on screen.
                    var torsoGeo = (typeof THREE.CapsuleGeometry === 'function')
                      ? new THREE.CapsuleGeometry(0.2, 0.42, 3, 10)
                      : new THREE.CylinderGeometry(0.2, 0.2, 0.62, 10);
                    var torso = new THREE.Mesh(torsoGeo, suitWhite);
                    torso.position.y = -1.03;
                    suitGroup.add(torso);
                    if (typeof THREE.CapsuleGeometry !== 'function') {
                      // r128 has no capsule, so the cylinder's flat lid was the first thing
                      // you saw looking down — a white polygon where your chest should be.
                      var shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6), suitWhite);
                      shoulder.position.y = -0.72;
                      shoulder.scale.y = 0.62;
                      suitGroup.add(shoulder);
                    }
                    var plss = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.46, 0.2), suitDark);  // life-support backpack
                    plss.position.set(0, -1.0, 0.25);
                    suitGroup.add(plss);
                    [[-0.13, 0], [0.13, 0]].forEach(function (lp) {
                      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.11, 0.62, 6), suitWhite);
                      leg.position.set(lp[0], -1.46, 0);
                      suitGroup.add(leg);
                      var boot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.3), suitDark);
                      boot.position.set(lp[0], -1.78, 0.05);
                      suitGroup.add(boot);
                    });
                    suitGroup.traverse(function (n) { if (n.isMesh) { n.castShadow = !_evaLowPower; n.receiveShadow = false; } });
                    // The chest is 0.7 below the eye and square-on to a 1.6 sun, so it
                    // renders as a blown-out white ball parked in the middle of the
                    // down-view no matter how far the albedo comes down. Move the upper body
                    // to layer 1, which the camera does not draw but the shadow camera is
                    // told to include: the full silhouette still falls across the regolith,
                    // while what you actually see when you look down is your legs and boots.
                    [torso, plss].concat(typeof shoulder !== 'undefined' && shoulder ? [shoulder] : [])
                      .forEach(function (m) { if (m) m.layers.set(1); });
                    if (!_evaLowPower) sun.shadow.camera.layers.enable(1);
                    scene.add(suitGroup);
                    // Unit vector toward the sun, matching the DirectionalLight above.
                    var _sunDir = new THREE.Vector3(MM_EVA_SUN.x, MM_EVA_SUN.y, MM_EVA_SUN.z);
                    var _glareFwd = new THREE.Vector3();   // reused so the loop allocates nothing
                    var _glarePrev = -1;

                    // Visor glare overlay — a DOM layer rather than a post pass, so it costs
                    // nothing on the GPU and degrades to "no glare" if anything goes wrong.
                    var glareEl = null;
                    try {
                      glareEl = document.createElement('div');
                      glareEl.setAttribute('aria-hidden', 'true');
                      glareEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:8;opacity:0;'
                        + 'background:radial-gradient(circle at 50% 42%, rgba(255,252,238,0.85) 0%, rgba(255,246,214,0.45) 18%, rgba(255,240,200,0.12) 42%, rgba(255,240,200,0) 68%);'
                        + 'transition:opacity 0.12s linear';
                      if (canvasEl.parentElement) canvasEl.parentElement.appendChild(glareEl);
                    } catch (eGl) { glareEl = null; }

                    // ── Comfort mode (reduced motion / mouse-sensitivity / vignette) ──
                    // Auto-enable if OS prefers-reduced-motion; persisted per-student in toolData.
                    var prefersReducedMotion = false;
                    try { prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(_e) {}
                    var storedComfort = (d && typeof d.comfortMode === 'boolean') ? d.comfortMode : null;
                    var comfortMode = storedComfort !== null ? storedComfort : prefersReducedMotion;
                    var lookSensitivity = 0.003;
                    var applyComfortFactors = function() {
                      lookSensitivity = comfortMode ? 0.0012 : 0.003; // ~2.5x slower in comfort mode
                    };
                    applyComfortFactors();
                    // Click-to-move toggle (motor-impaired students: point-and-click instead of WASD)
                    var storedClick = (d && typeof d.clickToMove === 'boolean') ? d.clickToMove : false;
                    var clickToMove = storedClick;
                    var clickTarget = null; // THREE.Vector3 or null
                    // Vignette overlay (reduces peripheral motion-sickness triggers during fast movement)
                    var vignetteEl = null;
                    if (comfortMode) {
                      vignetteEl = document.createElement('div');
                      vignetteEl.setAttribute('aria-hidden', 'true');
                      vignetteEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9;background:radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 95%);opacity:0;transition:opacity 0.35s ease';
                      canvasEl.parentElement.appendChild(vignetteEl);
                    }

                    // A real HTML control supplements V so boarding and exiting are
                    // discoverable, screen-reader named, and available without pointer
                    // lock. It stays optional: the learner must first walk to the rover.
                    var lrvActionEl = document.createElement('button');
                    lrvActionEl.type = 'button';
                    lrvActionEl.id = 'eva-lrv-action';
                    lrvActionEl.style.cssText = 'position:absolute;left:10px;bottom:' + (evaPadBand + 10) + 'px;z-index:13;padding:8px 11px;border-radius:9px;border:1px solid rgba(251,191,36,0.55);background:rgba(15,23,42,0.9);color:#fde68a;font:700 11px system-ui;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.35)';
                    var lrvSampleNoticeAt = 0;
                    function roverPlanarDistance() {
                      var rdx = playerPos.x - roverGrp.position.x;
                      var rdz = playerPos.z - roverGrp.position.z;
                      return Math.sqrt(rdx * rdx + rdz * rdz);
                    }
                    function updateLrvAction() {
                      if (!lrvActionEl) return;
                      if (roverBoarded) {
                        lrvActionEl.textContent = '🚙 Exit LRV (V)';
                        lrvActionEl.setAttribute('aria-label', 'Exit the Lunar Roving Vehicle and continue the EVA on foot');
                      } else {
                        var rd = roverPlanarDistance();
                        var near = rd <= LRV_BOARD_RANGE;
                        lrvActionEl.textContent = near ? '🚙 Board LRV (V)' : '🚙 LRV ' + Math.ceil(rd) + ' m away';
                        lrvActionEl.setAttribute('aria-label', near
                          ? 'Board the Lunar Roving Vehicle'
                          : 'Lunar Roving Vehicle is ' + Math.ceil(rd) + ' meters away. Walk closer to board.');
                      }
                    }
                    function toggleRoverMode() {
                      if (!roverBoarded && roverPlanarDistance() > LRV_BOARD_RANGE) {
                        if (addToast) addToast('🚙 Walk within 3 meters of the LRV before boarding.', 'info');
                        if (typeof announceToSR === 'function') announceToSR('The Lunar Roving Vehicle is too far away. Walk within three meters to board.');
                        updateLrvAction();
                        return;
                      }
                      roverBoarded = !roverBoarded;
                      resetLrvImpactEffects();
                      lrvImpactCooldown = 0.28;
                      applyLrvVisualSteering(0);
                      refreshLrvWheelContacts(0);
                      clickTarget = null;
                      evaVel.x = evaVel.z = 0; evaStrideTime = 0;   // step off standing, not sliding
                      isJumping = false;
                      playerVelY = 0;
                      moveState.sample = false;
                      if (roverBoarded) {
                        roverSpeed = 0;
                        yaw = roverHeading;
                        pitch = -0.12;
                        lrvCameraYawOffset = 0;
                        lrvCameraPitchOffset = 0;
                        suitGroup.visible = false;
                        if (addToast) addToast('🚙 LRV boarded — W/S accelerate or brake, A/D steer, V exits. Samples stay an on-foot activity.', 'success');
                        if (typeof announceToSR === 'function') announceToSR('Lunar rover boarded. Use W and S or up and down arrows to drive, A and D or left and right arrows to steer, and V to exit. Exit the rover to collect samples.');
                      } else {
                        roverSpeed = 0;
                        roverSteer = 0;
                        // Put the astronaut beside the left seat, terrain-anchored.
                        var exitX = roverGrp.position.x - Math.cos(roverHeading) * 1.45;
                        var exitZ = roverGrp.position.z + Math.sin(roverHeading) * 1.45;
                        playerPos.set(exitX, _terrainHeightAt(exitX, exitZ) + 1.8, exitZ);
                        yaw = roverHeading;
                        suitGroup.visible = true;
                        if (addToast) addToast('👨‍🚀 Back on foot — F collects nearby samples.', 'info');
                        if (typeof announceToSR === 'function') announceToSR('Exited the lunar rover. You are back on foot and can collect samples with F.');
                      }
                      updateLrvAudio(!roverBoarded);
                      updateLrvAction();
                    }
                    function onLrvAction() {
                      toggleRoverMode();
                      try { canvasEl.focus(); } catch (_focusErr) {}
                    }
                    lrvActionEl.addEventListener('click', onLrvAction);
                    updateLrvAction();
                    canvasEl.parentElement.appendChild(lrvActionEl);

                    // ── Optional LRV drive sonification ──
                    // Uses the mission's shared AudioContext only after an explicit click
                    // or B key gesture, but owns every node below. The Moon has no airborne
                    // motor sound: this is telemetry sonification for speed and wheel slip.
                    var lrvAudioEnabled = false, lrvAudioUnavailable = false;
                    var lrvAudioOutputAudible = false;
                    var lrvAudioAC = null, lrvAudioMotor = null, lrvAudioMotorFilter = null;
                    var lrvAudioMotorGain = null, lrvAudioTraction = null;
                    var lrvAudioTractionFilter = null, lrvAudioTractionGain = null, lrvAudioMaster = null;
                    canvasEl.dataset.lrvSound = 'off';
                    canvasEl.dataset.lrvAudioLevel = '0.000';

                    function initLrvAudio() {
                      if (lrvAudioMotor && lrvAudioMaster) return true;
                      var ac = getMMAC(); // explicit gesture path only; never called by RAF
                      if (!ac) return false;
                      try {
                        lrvAudioAC = ac;
                        lrvAudioMotor = ac.createOscillator();
                        lrvAudioMotorFilter = ac.createBiquadFilter();
                        lrvAudioMotorGain = ac.createGain();
                        var tractionBuffer = ac.createBuffer(1, Math.max(256, Math.floor(ac.sampleRate * 0.5)), ac.sampleRate);
                        var tractionData = tractionBuffer.getChannelData(0);
                        for (var lai = 0; lai < tractionData.length; lai++) tractionData[lai] = Math.random() * 2 - 1;
                        lrvAudioTraction = ac.createBufferSource();
                        lrvAudioTractionFilter = ac.createBiquadFilter();
                        lrvAudioTractionGain = ac.createGain();
                        lrvAudioMaster = ac.createGain();

                        lrvAudioMotor.type = 'triangle';
                        lrvAudioMotor.frequency.value = 48;
                        lrvAudioMotorFilter.type = 'lowpass';
                        lrvAudioMotorFilter.frequency.value = 320;
                        lrvAudioMotorFilter.Q.value = 0.7;
                        lrvAudioMotorGain.gain.value = 0;
                        lrvAudioTraction.buffer = tractionBuffer;
                        lrvAudioTraction.loop = true;
                        lrvAudioTractionFilter.type = 'bandpass';
                        lrvAudioTractionFilter.frequency.value = 520;
                        lrvAudioTractionFilter.Q.value = 1.2;
                        lrvAudioTractionGain.gain.value = 0;
                        lrvAudioMaster.gain.value = 0;

                        lrvAudioMotor.connect(lrvAudioMotorFilter);
                        lrvAudioMotorFilter.connect(lrvAudioMotorGain);
                        lrvAudioMotorGain.connect(lrvAudioMaster);
                        lrvAudioTraction.connect(lrvAudioTractionFilter);
                        lrvAudioTractionFilter.connect(lrvAudioTractionGain);
                        lrvAudioTractionGain.connect(lrvAudioMaster);
                        lrvAudioMaster.connect(ac.destination);
                        lrvAudioMotor.start();
                        lrvAudioTraction.start();
                        return true;
                      } catch (_lrvAudioInitErr) {
                        shutdownLrvAudio();
                        return false;
                      }
                    }

                    function setLrvAudioParam(param, value, timeConstant) {
                      if (!param || !lrvAudioAC) return;
                      try { param.setTargetAtTime(value, lrvAudioAC.currentTime, timeConstant); } catch (_lrvParamErr) {}
                    }

                    function updateLrvAudio(forceSilent) {
                      var audible = !!(lrvAudioEnabled && lrvAudioMaster && roverBoarded &&
                        !forceSilent && !_evaVRPaused && !document.hidden && evaAlive);
                      if (!audible) {
                        if (canvasEl.dataset.lrvAudioLevel !== '0.000') canvasEl.dataset.lrvAudioLevel = '0.000';
                        // Schedule the mute ramp once when leaving an audible state. While
                        // Off, hidden, in VR, or unboarded the RAF performs no AudioParam work.
                        if (lrvAudioMaster && lrvAudioOutputAudible) {
                          setLrvAudioParam(lrvAudioMaster.gain, 0, 0.035);
                        }
                        lrvAudioOutputAudible = false;
                        return;
                      }
                      var speed01 = Math.min(1, Math.abs(roverSpeed) / 6.2);
                      var throttle01 = Math.min(1, Math.abs(lrvThrottleSignal));
                      var slip01 = Math.min(1, Math.max(0, lrvSlipSignal));
                      var impact01 = Math.min(1, Math.max(0, lrvImpactAudioEnvelope));
                      var level = audible ? Math.min(1, 0.1 + speed01 * 0.55 +
                        throttle01 * 0.18 + slip01 * 0.35 + impact01 * 0.16) : 0;
                      var levelText = level.toFixed(3);
                      if (canvasEl.dataset.lrvAudioLevel !== levelText) canvasEl.dataset.lrvAudioLevel = levelText;
                      setLrvAudioParam(lrvAudioMotor.frequency, 48 + speed01 * 132 + throttle01 * 22, 0.05);
                      setLrvAudioParam(lrvAudioMotorFilter.frequency, 260 + speed01 * 920 + impact01 * 180, 0.08);
                      setLrvAudioParam(lrvAudioMotorGain.gain, 0.07 + speed01 * 0.2 + throttle01 * 0.07, 0.06);
                      setLrvAudioParam(lrvAudioTractionFilter.frequency, 420 + speed01 * 1550 + slip01 * 500, 0.07);
                      setLrvAudioParam(lrvAudioTractionGain.gain, 0.01 + speed01 * 0.025 +
                        slip01 * 0.22 + impact01 * 0.08, 0.05);
                      setLrvAudioParam(lrvAudioMaster.gain, audible ? 0.045 : 0, audible ? 0.08 : 0.035);
                      lrvAudioOutputAudible = true;
                    }

                    function shutdownLrvAudio() {
                      lrvAudioEnabled = false;
                      lrvAudioOutputAudible = false;
                      canvasEl.dataset.lrvSound = 'off';
                      canvasEl.dataset.lrvAudioLevel = '0.000';
                      if (lrvAudioMaster && lrvAudioAC) {
                        try {
                          lrvAudioMaster.gain.cancelScheduledValues(lrvAudioAC.currentTime);
                          lrvAudioMaster.gain.setValueAtTime(0, lrvAudioAC.currentTime);
                        } catch (_lrvAudioMuteErr) {}
                      }
                      try { if (lrvAudioMotor) lrvAudioMotor.stop(); } catch (_lrvMotorStopErr) {}
                      try { if (lrvAudioTraction) lrvAudioTraction.stop(); } catch (_lrvTractionStopErr) {}
                      [lrvAudioMotor, lrvAudioMotorFilter, lrvAudioMotorGain, lrvAudioTraction,
                        lrvAudioTractionFilter, lrvAudioTractionGain, lrvAudioMaster].forEach(function(node) {
                        try { if (node) node.disconnect(); } catch (_lrvDisconnectErr) {}
                      });
                      // The AudioContext is mission-shared: never suspend or close it here.
                      lrvAudioAC = lrvAudioMotor = lrvAudioMotorFilter = lrvAudioMotorGain = null;
                      lrvAudioTraction = lrvAudioTractionFilter = lrvAudioTractionGain = lrvAudioMaster = null;
                    }

                    var lrvSoundEl = document.createElement('button');
                    lrvSoundEl.type = 'button';
                    lrvSoundEl.id = 'eva-lrv-sound';
                    lrvSoundEl.setAttribute('aria-keyshortcuts', 'B');
                    lrvSoundEl.style.cssText = 'position:absolute;left:10px;bottom:' + (evaPadBand + 52) + 'px;z-index:13;padding:7px 10px;border-radius:9px;border:1px solid rgba(125,211,252,0.5);background:rgba(15,23,42,0.9);color:#bae6fd;font:700 10px system-ui;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.3);touch-action:manipulation';
                    function updateLrvSoundControl() {
                      var state = lrvAudioEnabled ? 'On' : 'Off';
                      lrvSoundEl.textContent = 'LRV audio: ' + state + ' (B)';
                      lrvSoundEl.setAttribute('aria-pressed', lrvAudioEnabled ? 'true' : 'false');
                      lrvSoundEl.setAttribute('aria-label', (lrvAudioEnabled ? 'Disable' : 'Enable') +
                        ' LRV drive sonification. Sonified speed and wheel slip; lunar vacuum carries no airborne sound.');
                      lrvSoundEl.title = 'Drive sonification: speed and wheel slip. Lunar vacuum carries no airborne sound.';
                      canvasEl.dataset.lrvSound = lrvAudioEnabled ? 'on' : (lrvAudioUnavailable ? 'unavailable' : 'off');
                    }
                    function toggleLrvAudio() {
                      if (!lrvAudioEnabled) {
                        if (!initLrvAudio()) {
                          if (_mmSoundOff) {
                            // Not a device problem: the mission is muted from the header.
                            if (addToast) addToast('\uD83D\uDD07 Mission sound is muted \u2014 turn it back on in the header to hear the rover.', 'info');
                            if (typeof announceToSR === 'function') announceToSR('Mission sound is muted. Turn mission sound back on in the header to use rover sonification.');
                            return;
                          }
                          lrvAudioUnavailable = true;
                          updateLrvSoundControl();
                          if (addToast) addToast('LRV drive sonification is unavailable on this device.', 'info');
                          return;
                        }
                        lrvAudioEnabled = true;
                      } else {
                        lrvAudioEnabled = false;
                      }
                      updateLrvSoundControl();
                      updateLrvAudio(!lrvAudioEnabled);
                      if (addToast) addToast('LRV drive sonification ' + (lrvAudioEnabled ? 'on' : 'off') + '.', 'info');
                      if (typeof announceToSR === 'function') announceToSR('LRV drive sonification ' + (lrvAudioEnabled ? 'enabled.' : 'disabled.'));
                    }
                    function onLrvSoundAction() {
                      toggleLrvAudio();
                      try { canvasEl.focus(); } catch (_lrvSoundFocusErr) {}
                    }
                    function onLrvVisibilityChange() {
                      resetLrvImpactEffects();
                      updateLrvAudio(document.hidden);
                    }
                    lrvSoundEl.addEventListener('click', onLrvSoundAction);
                    document.addEventListener('visibilitychange', onLrvVisibilityChange);
                    updateLrvSoundControl();
                    canvasEl.parentElement.appendChild(lrvSoundEl);

                    function onEvaKeyDown(e) {
                      switch(e.key.toLowerCase()) {
                        case 'w': case 'arrowup': moveState.forward = true; clickTarget = null; break;
                        case 's': case 'arrowdown': moveState.back = true; clickTarget = null; break;
                        case 'a': case 'arrowleft': moveState.left = true; clickTarget = null; break;
                        case 'd': case 'arrowright': moveState.right = true; clickTarget = null; break;
                        case 'f':
                          if (roverBoarded) {
                            moveState.sample = false;
                            var lrvNoticeNow = Date.now();
                            if (!e.repeat || lrvNoticeNow - lrvSampleNoticeAt > 1500) {
                              lrvSampleNoticeAt = lrvNoticeNow;
                              if (addToast) addToast('🪨 Park and press V to exit before collecting samples.', 'info');
                              if (typeof announceToSR === 'function') announceToSR('Samples are an on-foot EVA activity. Stop the rover and press V to exit before collecting.');
                            }
                          } else moveState.sample = true;
                          break;
                        case 'v': if (!e.repeat) toggleRoverMode(); break;
                        case 'b': if (!e.repeat) toggleLrvAudio(); break;
                        case 'q': moveState.turnLeft = true; break;   // keyboard yaw — no mouse required
                        case 'e': moveState.turnRight = true; break;
                        case 'shift': moveState.lope = true; break;   // lope now; a sustained stride gets there anyway
                        case ' ': if (!roverBoarded && !isJumping) { playerVelY = EVA_JUMP_V0; isJumping = true; evaHopStart = performance.now(); } break; // 1/6 gravity jump!
                        case 'c':
                          // Toggle comfort mode
                          comfortMode = !comfortMode;
                          applyComfortFactors();
                          try { upd('comfortMode', comfortMode); } catch(_){}
                          if (vignetteEl) { vignetteEl.parentElement && vignetteEl.parentElement.removeChild(vignetteEl); vignetteEl = null; }
                          if (comfortMode) {
                            vignetteEl = document.createElement('div');
                            vignetteEl.setAttribute('aria-hidden', 'true');
                            vignetteEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9;background:radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 95%);opacity:0;transition:opacity 0.35s ease';
                            canvasEl.parentElement.appendChild(vignetteEl);
                          }
                          if (addToast) addToast(comfortMode ? '🌿 Comfort mode ON — reduced motion & slower turn' : 'Comfort mode OFF', 'info');
                          if (typeof announceToSR === 'function') announceToSR(comfortMode ? 'Comfort mode enabled. Mouse sensitivity and walk speed reduced.' : 'Comfort mode disabled.');
                          break;
                        case 'm':
                          // Toggle click-to-move
                          clickToMove = !clickToMove;
                          clickTarget = null;
                          try { upd('clickToMove', clickToMove); } catch(_){}
                          if (addToast) addToast(clickToMove ? '🖱 Click-to-move ON — click terrain to walk there' : 'Click-to-move OFF', 'info');
                          if (typeof announceToSR === 'function') announceToSR(clickToMove ? 'Click to move enabled. Click on the ground to walk there.' : 'Click to move disabled.');
                          break;
                      }
                      // Only swallow the EVA control keys — an unconditional preventDefault
                      // also ate Tab, trapping keyboard users on the canvas (WCAG 2.1.2).
                      if (['w', 'a', 's', 'd', 'f', 'v', 'b', 'c', 'q', 'e', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(e.key.toLowerCase()) !== -1) e.preventDefault();
                    }
                    function onEvaKeyUp(e) {
                      switch(e.key.toLowerCase()) {
                        case 'w': case 'arrowup': moveState.forward = false; break;
                        case 's': case 'arrowdown': moveState.back = false; break;
                        case 'a': case 'arrowleft': moveState.left = false; break;
                        case 'd': case 'arrowright': moveState.right = false; break;
                        case 'f': moveState.sample = false; break;
                        case 'q': moveState.turnLeft = false; break;
                        case 'e': moveState.turnRight = false; break;
                        case 'shift': moveState.lope = false; break;
                      }
                    }
                    var isLooking = false;
                    // Mouse down: in click-to-move mode, raycast to terrain; otherwise enable look.
                    function onEvaMouseDown(e) {
                      if (!roverBoarded && clickToMove && e.button === 0) {
                        // Raycast from camera through click point to the terrain plane.
                        try {
                          var rect = canvasEl.getBoundingClientRect();
                          var ndc = new THREE.Vector2(
                            ((e.clientX - rect.left) / rect.width) * 2 - 1,
                            -((e.clientY - rect.top) / rect.height) * 2 + 1
                          );
                          var raycaster = new THREE.Raycaster();
                          raycaster.setFromCamera(ndc, camera);
                          var hits = raycaster.intersectObjects(scene.children, false);
                          for (var hi = 0; hi < hits.length; hi++) {
                            // Prefer terrain hit — big plane rotated flat, positioned at y~0.
                            var hit = hits[hi];
                            if (hit && hit.point && hit.distance < 150) {
                              clickTarget = new THREE.Vector3(hit.point.x, 0, hit.point.z);
                              if (typeof announceToSR === 'function') announceToSR('Walking to selected point.');
                              break;
                            }
                          }
                        } catch (_rcErr) { /* raycast unavailable, fall through to look */ }
                        return;
                      }
                      isLooking = true;
                      canvasEl.requestPointerLock && canvasEl.requestPointerLock();
                    }
                    function onEvaMouseUp() { isLooking = false; }
                    function onMM(e) {
                      if (!isLooking && !document.pointerLockElement) return;
                      if (roverBoarded) {
                        lrvCameraYawOffset = Math.max(-1.25, Math.min(1.25, lrvCameraYawOffset - e.movementX * lookSensitivity));
                        lrvCameraPitchOffset = Math.max(-0.35, Math.min(0.5, lrvCameraPitchOffset - e.movementY * lookSensitivity));
                      } else {
                        yaw -= e.movementX * lookSensitivity;
                        pitch = Math.max(-1.2, Math.min(1.2, pitch - e.movementY * lookSensitivity));
                      }
                    }
                    canvasEl.addEventListener('keydown', onEvaKeyDown);
                    canvasEl.addEventListener('keyup', onEvaKeyUp);
                    // Tabbing or alt-tabbing away while holding W left the astronaut walking
                    // with nobody at the controls; the key-up went to another window.
                    function onEvaBlur() {
                      Object.keys(moveState).forEach(function(k) { moveState[k] = false; });
                    }
                    canvasEl.addEventListener('blur', onEvaBlur);
                    canvasEl.addEventListener('mousedown', onEvaMouseDown);
                    canvasEl.addEventListener('mouseup', onEvaMouseUp);
                    document.addEventListener('mousemove', onMM);
                    canvasEl.focus();

                    // ── EVA HUD ──
                    var evaHud = document.createElement('div');
                    evaHud.style.cssText = 'position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);border-radius:10px;padding:8px 12px;color:#38bdf8;font-family:monospace;font-size:10px;pointer-events:none;z-index:10;border:1px solid rgba(56,189,248,0.2);max-width:200px';
                    // \u2500\u2500 EVA HUD \u2500\u2500
                    // Now carries a cuff checklist and a bearing to the nearest rock. An
                    // Apollo crew never walked out without a wrist-mounted task list, and
                    // more to the point: the old HUD counted what you had done and never
                    // said what to do. Eight small orbs on a 200x200 plain with no pointer
                    // is a scavenger hunt with no clue, which is the least intuitive moment
                    // in the whole tool.
                    evaHud.innerHTML = '<div style="font-weight:bold;font-size:11px;color:#fbbf24;margin-bottom:4px">\uD83D\uDC68\u200D\uD83D\uDE80 LUNAR EVA</div>' +
                      '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 6px">' +
                      '<span style="color:#64748b">O\u2082</span><span id="eva-o2" style="color:#22c55e">100%</span>' +
                      '<span style="color:#64748b">\uD83E\uDEA8</span><span id="eva-samples">0 / ' + LUNAR_SAMPLES_DATA.length + ' samples</span>' +
                      '<span style="color:#64748b">\uD83D\uDC63</span><span id="eva-steps">0 steps</span>' +
                      '<span style="color:#64748b" title="Bearing to the nearest rock still on the ground">\uD83C\uDFAF ROCK</span><span id="eva-target">\u2014</span>' +
                      '<span style="color:#64748b">MODE</span><span id="eva-mode">On foot</span>' +
                      '<span style="color:#64748b">LRV</span><span id="eva-lrv-speed">Parked</span>' +
                      '<span class="eva-lrv-row" style="color:#64748b;display:none">GRADE</span><span class="eva-lrv-row" style="display:none" id="eva-lrv-terrain">--</span>' +
                      '<span class="eva-lrv-row" style="color:#64748b;display:none">GRIP</span><span class="eva-lrv-row" style="display:none" id="eva-lrv-grip">--</span>' +
                      '</div>' +
                      '<div style="border-top:1px solid rgba(56,189,248,0.12);margin-top:5px;padding-top:5px">' +
                      '<div style="color:#fbbf24;font-size:9px;font-weight:bold;margin-bottom:2px">CUFF CHECKLIST</div>' +
                      '<div id="eva-tasks" style="font-size:9px;line-height:1.5;color:#cbd5e1"></div>' +
                      '</div>' +
                      '<div id="eva-key-legend" style="border-top:1px solid rgba(56,189,248,0.1);margin-top:4px;padding-top:4px;color:#94a3b8;font-size:9px;line-height:1.4">ON FOOT: WASD move \u2022 SHIFT lope \u2022 Q/E turn \u2022 SPACE jump \u2022 F collect / deploy<br>LRV: V board / exit \u2022 W/S drive \u2022 A/D steer \u2022 B audio \u2022 samples on foot<br>Mouse look \u2022 C comfort \u2022 M click-to-move</div>';
                    canvasEl.parentElement.appendChild(evaHud);

                    // ── On-screen surface controls ──
                    // The moonwalk was keyboard-only for movement (click-to-move exists but
                    // is itself behind the M key), so a tablet or a mouse-only student could
                    // look around and never take a step. Each button drives the SAME handler
                    // the keys do, so the rover notice, the jump gate and the collect
                    // cooldown all behave identically rather than being re-implemented.
                    var evaPad = mmPadRow('Moonwalk controls');
                    evaPad.setAttribute('data-eva-pad', 'true');
                    var evaBtnSize = evaPadSize;
                    function evaKey(key) {
                      return {
                        down: function() { onEvaKeyDown({ key: key, repeat: false, preventDefault: function() {} }); },
                        up: function() { onEvaKeyUp({ key: key }); }
                      };
                    }
                    [
                      ['\u25C0', 'Turn left. Same as the Q key.', 'q'],
                      ['\u25B2', 'Walk forward. Same as the W key.', 'w'],
                      ['\u25BC', 'Walk backward. Same as the S key.', 's'],
                      ['\u25B6', 'Turn right. Same as the E key.', 'e'],
                      ['\u2B06 JUMP', 'Jump in one-sixth gravity. Same as the Space key.', ' '],
                      ['\uD83E\uDEA8 F', 'Collect the rock at your feet, or deploy the instrument you are standing beside. Same as the F key.', 'f']
                    ].forEach(function(spec) {
                      var k = evaKey(spec[2]);
                      evaPad.appendChild(mmHoldButton(spec[0], spec[1], evaBtnSize, k.down, k.up));
                    });
                    canvasEl.parentElement.appendChild(evaPad);
                    // Measure what the pad really takes: at phone width its six buttons wrap
                    // to two rows, and a band sized for one let the pad cover the rover's
                    // Board button and the discovery card.
                    var _evaPadH = evaPad.offsetHeight || 0;
                    if (_evaPadH > evaPadSize + 4) {
                      evaPadBand = _evaPadH + 16;
                      lrvActionEl.style.bottom = (evaPadBand + 10) + 'px';
                      lrvSoundEl.style.bottom = (evaPadBand + 52) + 'px';
                    }
                    // On a phone-width canvas the keyboard legend is dead weight (no keys to
                    // press) and the full HUD covered most of the scene.
                    if (W < 560) {
                      var legendEl = evaHud.querySelector('#eva-key-legend');
                      if (legendEl) legendEl.style.display = 'none';
                      evaHud.style.maxWidth = '150px';
                      evaHud.style.padding = '6px 8px';
                    }

                    // ── Animation ──
                    var evaTick = 0;
                    var evaO2 = 100;
                    var evaSteps = 0;
                    var evaSampleCount = lunarSampleOrbs.filter(function(o) { return o._collected && !o._isTraverseSample; }).length;
                    var evaSampleCooldown = 0;
                    var _evaLrvRowsDisplay = null;   // HUD GRADE/GRIP rows are shown only while boarded
                    var evaLastFrameTime = 0;
                    var evaAlive = true;
                    var evaRaf = 0;
                    var lrvForward = new THREE.Vector3();
                    var lrvRight = new THREE.Vector3();
                    var evaUpAxis = new THREE.Vector3(0, 1, 0);
                    var evaMoveDir = new THREE.Vector3();
                    var LRV_SCENE_EARTH_G = 4.4;
                    var LRV_LUNAR_G = LRV_SCENE_EARTH_G * 0.165;
                    canvasEl.dataset.lrvGrade = '0.0';
                    canvasEl.dataset.lrvCrossSlope = '0.0';
                    canvasEl.dataset.lrvSlip = '0.000';
                    canvasEl.dataset.lrvGripState = 'Grip';
                    var lrvCameraForward = new THREE.Vector3();
                    var lrvCamDesired = new THREE.Vector3();
                    var lrvCamTarget = new THREE.Vector3();
                    var o2Exhausted = false;   // consumables gone: collection stops, banner + SR announcement
                    // Latches, not value windows. The old test asked whether O2 sat inside a
                    // 0.5-wide band on the exact frame it was sampled, so a difficulty whose
                    // decay step straddled the band would skip the warning entirely and
                    // nothing would report it. Crossing a threshold is the event; fire once.
                    var o2Warned30 = false, o2Warned15 = false;
                    // The seismometer is the one landmark you can DO something with. Every
                    // Apollo surface crew spent a large slice of its EVA deploying ALSEP,
                    // and until now the instruments here were scenery you walked past and
                    // read a card about.
                    var seismoDeployed = !!d.seismoDeployed;
                    var _seismoPulse = 0;
                    // Deliberately just inside the 6-unit radius at which the discovery
                    // card appears, so the card that says "Seismometer" and the range in
                    // which F does something are effectively the same place. A tighter
                    // radius meant the tool told you that you had arrived while the key
                    // still did nothing — which reads as a broken control, not as "walk
                    // three steps closer".
                    var EVA_INTERACT_RANGE = 5;

                    function animateEva(frameTime) {
                      if (!evaAlive) return;
                      // Stop + tear down if the EVA canvas left the DOM (tab switch / tool unmount). The loop
                      // used to reschedule unconditionally → a forever-running WebGL render loop leaked if the
                      // student left via the Back arrow instead of the "End EVA" button.
                      if (!document.contains(canvasEl)) { if (canvasEl._evaCleanup) canvasEl._evaCleanup(); return; }
                      if (_evaVRPaused) return;               // VR session owns the frame loop (AlloVR setAnimationLoop); resumeLoop restarts us
                      evaRaf = requestAnimationFrame(animateEva);
                      evaTick++;
                      var evaNow = (typeof frameTime === 'number' && isFinite(frameTime)) ? frameTime : performance.now();
                      var evaDt = evaLastFrameTime ? Math.min(0.05, Math.max(0.001, (evaNow - evaLastFrameTime) / 1000)) : (1 / 60);
                      // The hop uses real elapsed time. evaDt is clamped to 0.05 s, so below
                      // 20 fps (a weak Chromebook, or SwiftShader) it slows the simulation, and a
                      // 2.1 s hop stretched to 5 s at 8 fps. The step is integrated exactly, so it
                      // can be long: capped at 1 s (a tab coming back from hidden), not 0.25 s,
                      // which still stretched the hop to 4 s on a loaded machine below 4 fps.
                      var evaHopDt = evaLastFrameTime ? Math.min(1.0, Math.max(0.001, (evaNow - evaLastFrameTime) / 1000)) : (1 / 60);
                      evaLastFrameTime = evaNow;

                      // Keyboard yaw (Q/E). Comfort mode turns at the slower rate, matching
                      // the mouse-sensitivity reduction.
                      if (!roverBoarded) {
                        if (moveState.turnLeft) yaw += (comfortMode ? 0.72 : 1.68) * evaDt;
                        if (moveState.turnRight) yaw -= (comfortMode ? 0.72 : 1.68) * evaDt;
                      }

                      // Movement
                      var dir = evaMoveDir.set(0, 0, 0);
                      if (roverBoarded) {
                        // Frame-rate-independent terrain-aware traverse dynamics. Exact
                        // cached mesh probes are sampled before integration so grade forces,
                        // body pose, grip telemetry, dust and sonification describe one frame.
                        var lrvThrottle = (moveState.forward ? 1 : 0) - (moveState.back ? 1 : 0);
                        var lrvSteerInput = (moveState.left || moveState.turnLeft ? 1 : 0)
                          + (moveState.right || moveState.turnRight ? -1 : 0);
                        lrvSteerInput = Math.max(-1, Math.min(1, lrvSteerInput));
                        lrvForward.set(-Math.sin(roverHeading), 0, -Math.cos(roverHeading));
                        lrvRight.set(Math.cos(roverHeading), 0, -Math.sin(roverHeading));
                        var lrvFrontH = _terrainHeightAt(roverGrp.position.x + lrvForward.x * 0.62, roverGrp.position.z + lrvForward.z * 0.62);
                        var lrvRearH = _terrainHeightAt(roverGrp.position.x - lrvForward.x * 0.62, roverGrp.position.z - lrvForward.z * 0.62);
                        var lrvRightH = _terrainHeightAt(roverGrp.position.x + lrvRight.x * 0.76, roverGrp.position.z + lrvRight.z * 0.76);
                        var lrvLeftH = _terrainHeightAt(roverGrp.position.x - lrvRight.x * 0.76, roverGrp.position.z - lrvRight.z * 0.76);
                        lrvGradeRatio = Math.max(-0.75, Math.min(0.75, (lrvFrontH - lrvRearH) / 1.24));
                        lrvCrossSlopeRatio = Math.max(-0.75, Math.min(0.75, (lrvRightH - lrvLeftH) / 1.52));
                        var lrvGradeComponent = lrvGradeRatio / Math.sqrt(1 + lrvGradeRatio * lrvGradeRatio);
                        var lrvGradeAccel = Math.max(-0.52, Math.min(0.52, -LRV_LUNAR_G * lrvGradeComponent));
                        var lrvSpeedBefore = roverSpeed;
                        var lrvSpeedAbsBefore = Math.abs(lrvSpeedBefore);
                        var lrvReversing = lrvThrottle !== 0 && Math.abs(roverSpeed) > 0.001 &&
                          Math.sign(roverSpeed) !== Math.sign(lrvThrottle);
                        var lrvDriveDemand = Math.abs(lrvThrottle) * (lrvReversing ? 4.4 : (lrvThrottle > 0 ? 2.15 : 1.45));
                        var lrvSlopeLoad = Math.min(0.42, Math.abs(lrvGradeRatio) * 0.5 + Math.abs(lrvCrossSlopeRatio) * 0.22);
                        var lrvTractionLimit = Math.max(1.05, 2.55 * (1 - lrvSlopeLoad));
                        var lrvAppliedDrive = Math.min(lrvDriveDemand, lrvTractionLimit);
                        var lrvUnmetDemand = lrvDriveDemand > 0 ? Math.max(0, (lrvDriveDemand - lrvAppliedDrive) / lrvDriveDemand) : 0;
                        var lrvRollingRate = 0.18 + Math.abs(lrvGradeRatio) * 0.08 + Math.abs(lrvCrossSlopeRatio) * 0.06;
                        var lrvNetAccel = lrvGradeAccel;
                        if (lrvThrottle !== 0 && lrvReversing) {
                          // Opposing throttle brakes toward zero; it cannot overshoot into
                          // reverse within the same frame, even at the maximum clamped dt.
                          var lrvBrakeStep = Math.min(lrvSpeedAbsBefore, lrvAppliedDrive * evaDt);
                          roverSpeed -= Math.sign(roverSpeed) * lrvBrakeStep;
                        } else if (lrvThrottle !== 0) {
                          roverSpeed += lrvThrottle * lrvAppliedDrive * evaDt;
                        } else {
                          if (Math.abs(roverSpeed) < 0.025) {
                            // Static regolith friction either holds exactly or yields one
                            // net downhill acceleration; no grade-after-drag dt creep.
                            lrvNetAccel = Math.abs(lrvGradeAccel) <= lrvRollingRate
                              ? 0
                              : lrvGradeAccel - Math.sign(lrvGradeAccel) * lrvRollingRate;
                          } else {
                            var lrvResistanceDirection = Math.sign(roverSpeed);
                            lrvNetAccel = lrvGradeAccel - lrvResistanceDirection * lrvRollingRate;
                            if (roverSpeed * (roverSpeed + lrvNetAccel * evaDt) < 0 &&
                                Math.abs(lrvGradeAccel) <= lrvRollingRate) {
                              lrvNetAccel = -roverSpeed / evaDt;
                            }
                          }
                        }
                        roverSpeed += lrvNetAccel * evaDt;
                        if (lrvReversing && roverSpeed * lrvSpeedBefore < 0) roverSpeed = 0;
                        if (Math.abs(roverSpeed) < 0.025 && Math.abs(lrvGradeAccel) < 0.08 && lrvThrottle === 0) roverSpeed = 0;
                        roverSpeed = Math.max(-2.2, Math.min(6.2, roverSpeed));
                        var lrvSpeed01ForSlip = Math.min(1, Math.abs(roverSpeed) / 6.2);
                        var lrvDemandSlip = lrvUnmetDemand * 0.62;
                        var lrvMotionMismatch = Math.abs(lrvThrottle) *
                          Math.max(0, 1 - Math.abs(roverSpeed) / 0.8) * 0.18;
                        var lrvBrakeSlip = lrvReversing ? Math.min(1, 0.32 + lrvSpeedAbsBefore / 6.2 * 0.48) : 0;
                        var lrvTerrainSlipActive = Math.min(1,
                          Math.abs(lrvThrottle) + Math.abs(roverSpeed) / 0.35 +
                          (Math.abs(lrvNetAccel) > 0.001 ? 1 : 0));
                        var lrvGradeSlip = Math.min(1,
                          (Math.abs(lrvGradeRatio) * 0.5 + Math.abs(lrvCrossSlopeRatio) * 0.28) * lrvTerrainSlipActive);
                        var lrvSteerSlip = Math.abs(lrvSteerInput) * lrvSpeed01ForSlip * 0.72;
                        var lrvSlipTarget = Math.min(1,
                          lrvDemandSlip + lrvMotionMismatch + lrvBrakeSlip + lrvGradeSlip + lrvSteerSlip);
                        lrvSlipSignal += (lrvSlipTarget - lrvSlipSignal) * (1 - Math.exp(-8 * evaDt));
                        var lrvPivotBlend = Math.min(1, Math.abs(roverSpeed) / 0.75);
                        var lrvSteerAuthority = 1 - lrvSlipSignal * 0.58 * lrvPivotBlend;
                        var lrvSteerTarget = lrvSteerInput * (comfortMode ? 0.34 : 0.5) * lrvSteerAuthority;
                        roverSteer += (lrvSteerTarget - roverSteer) * (1 - Math.exp(-7 * evaDt));
                        lrvThrottleSignal = lrvThrottle;
                        lrvGripState = lrvSlipSignal >= 0.64 ? 'Slip' : (lrvSlipSignal >= 0.28 ? 'Scrub' : 'Grip');
                        var lrvFrameTravelDistance = 0;
                        if (Math.abs(roverSpeed) > 0.025) {
                          roverHeading += roverSteer * roverSpeed * 0.38 * evaDt;
                          lrvForward.set(-Math.sin(roverHeading), 0, -Math.cos(roverHeading));
                          lrvRight.set(Math.cos(roverHeading), 0, -Math.sin(roverHeading));
                          var lrvStepX = lrvForward.x * roverSpeed * evaDt;
                          var lrvStepZ = lrvForward.z * roverSpeed * evaDt;
                          var lrvNextX = Math.max(-92, Math.min(92, roverGrp.position.x + lrvStepX));
                          var lrvNextZ = Math.max(-92, Math.min(92, roverGrp.position.z + lrvStepZ));
                          if (lrvNextX !== roverGrp.position.x + lrvStepX || lrvNextZ !== roverGrp.position.z + lrvStepZ) roverSpeed = 0;
                          var lrvTravelX = lrvNextX - roverGrp.position.x;
                          var lrvTravelZ = lrvNextZ - roverGrp.position.z;
                          lrvFrameTravelDistance = Math.sqrt(lrvTravelX * lrvTravelX + lrvTravelZ * lrvTravelZ);
                          roverDistance += lrvFrameTravelDistance;
                          roverGrp.position.x = lrvNextX;
                          roverGrp.position.z = lrvNextZ;
                          lrvTrackDistanceAccumulator += lrvFrameTravelDistance;
                          while (lrvTrackDistanceAccumulator >= LRV_TRACK_SPACING) {
                            lrvTrackDistanceAccumulator -= LRV_TRACK_SPACING;
                            emitLrvTrackPair();
                          }
                        }
                        // Re-probe after travel for exact body pose; dynamics intentionally
                        // used the pre-integration probes above.
                        lrvFrontH = _terrainHeightAt(roverGrp.position.x + lrvForward.x * 0.62, roverGrp.position.z + lrvForward.z * 0.62);
                        lrvRearH = _terrainHeightAt(roverGrp.position.x - lrvForward.x * 0.62, roverGrp.position.z - lrvForward.z * 0.62);
                        lrvRightH = _terrainHeightAt(roverGrp.position.x + lrvRight.x * 0.76, roverGrp.position.z + lrvRight.z * 0.76);
                        lrvLeftH = _terrainHeightAt(roverGrp.position.x - lrvRight.x * 0.76, roverGrp.position.z - lrvRight.z * 0.76);
                        var lrvCenterGround = _terrainHeightAt(roverGrp.position.x, roverGrp.position.z);
                        var lrvGround = (lrvFrontH + lrvRearH + lrvRightH + lrvLeftH) * 0.25;
                        var lrvBodyEase = 1 - Math.exp(-10 * evaDt);
                        roverGrp.position.y += (lrvGround - roverGrp.position.y) * lrvBodyEase;
                        roverGrp.rotation.y = roverHeading;
                        roverGrp.rotation.x += (Math.atan2(lrvFrontH - lrvRearH, 1.24) - roverGrp.rotation.x) * lrvBodyEase;
                        roverGrp.rotation.z += (Math.atan2(lrvRightH - lrvLeftH, 1.52) - roverGrp.rotation.z) * lrvBodyEase;
                        var lrvWheelSlipSpin = lrvThrottle * lrvSlipSignal * (0.35 + Math.abs(roverSpeed) * 0.12);
                        var lrvWheelAngularSpeed = roverSpeed / 0.2 + lrvWheelSlipSpin;
                        if (lrvReversing) lrvWheelAngularSpeed *= Math.max(0, 1 - lrvSlipSignal * 0.72);
                        roverWheelSpin += lrvWheelAngularSpeed * evaDt;
                        applyLrvVisualSteering(roverSteer);
                        var lrvCos = Math.cos(roverHeading), lrvSin = Math.sin(roverHeading);
                        var lrvContactTargetSum = 0;
                        var lrvWheelContactPulse = lrvImpactSignal *
                          (_evaLowPower ? 0.08 : 0.14);
                        lrvGroundedWheelCount = 0;
                        for (var wi = 0; wi < roverWheelMounts.length; wi++) {
                          var mount = roverWheelMounts[wi];
                          var wheelWX = roverGrp.position.x + mount._lrvX * lrvCos + mount._lrvZ * lrvSin;
                          var wheelWZ = roverGrp.position.z - mount._lrvX * lrvSin + mount._lrvZ * lrvCos;
                          var wheelGround = _terrainHeightAt(wheelWX, wheelWZ);
                          // Unsmoothed target relative to this frame's exact post-travel
                          // centre ground: uniform slopes cancel, local compression remains.
                          var wheelContactTarget = Math.max(0.11,
                            Math.min(0.34, wheelGround - lrvCenterGround + 0.21));
                          lrvContactTargetSum += wheelContactTarget;
                          var lrvRawSuspension = wheelGround - roverGrp.position.y + 0.21;
                          var lrvWheelEngaged = lrvRawSuspension >= 0.095;
                          if (lrvWheelEngaged) lrvGroundedWheelCount++;
                          var suspensionY = Math.max(0.11, Math.min(0.34, lrvRawSuspension));
                          mount.position.y += (suspensionY - mount.position.y) * lrvBodyEase;
                          roverWheelMeshes[wi].rotation.x = roverWheelSpin;
                          poseLrvWheelContact(wi, mount, lrvWheelEngaged, lrvWheelContactPulse);
                        }
                        lrvWheelContacts.instanceMatrix.needsUpdate = true;
                        var lrvContactAverage = lrvContactTargetSum * 0.25;
                        lrvImpactCooldown = Math.max(0, lrvImpactCooldown - evaDt);
                        if (!lrvImpactContactValid) {
                          lrvImpactPreviousContact = lrvContactAverage;
                          lrvImpactContactValid = true;
                          lrvImpactArmTime = 0;
                        } else {
                          var lrvContactDelta = lrvContactAverage - lrvImpactPreviousContact;
                          lrvImpactPreviousContact = lrvContactAverage;
                          var lrvImpactMoving = lrvFrameTravelDistance > 0.001 &&
                            Math.abs(roverSpeed) > 0.15;
                          if (Math.abs(lrvContactDelta) > 0.18 || lrvFrameTravelDistance > 0.34) {
                            lrvImpactArmTime = 0;
                            lrvImpactVelocityFiltered = 0;
                          } else if (lrvImpactMoving) {
                            lrvImpactArmTime += evaDt;
                            var lrvCompressionVelocity = Math.max(0, lrvContactDelta / evaDt);
                            lrvImpactVelocityFiltered +=
                              (lrvCompressionVelocity - lrvImpactVelocityFiltered) *
                              (1 - Math.exp(-14 * evaDt));
                            if (lrvImpactArmTime >= 0.08 && lrvImpactCooldown <= 0 &&
                                lrvImpactVelocityFiltered > 0.30) {
                              var lrvImpactStrength = Math.min(1,
                                (lrvImpactVelocityFiltered - 0.30) / 1.25) *
                                Math.min(1, Math.abs(roverSpeed) / 1.2);
                              if (lrvImpactStrength > 0.04) {
                                registerLrvImpact(lrvImpactStrength);
                                lrvImpactVelocityFiltered *= 0.28;
                              }
                            }
                          } else {
                            lrvImpactArmTime = 0;
                            lrvImpactVelocityFiltered *= Math.exp(-12 * evaDt);
                          }
                        }
                        lrvImpactSpringVelocity +=
                          (-58 * lrvImpactSpring - 12 * lrvImpactSpringVelocity) * evaDt;
                        lrvImpactSpring += lrvImpactSpringVelocity * evaDt;
                        lrvImpactSpring = Math.max(-0.09, Math.min(0.07, lrvImpactSpring));
                        var lrvImpactVisualScale = gtReducedMotion ? 0.18 : (_evaLowPower ? 0.62 : 1);
                        roverVisualShell.position.y = lrvImpactSpring * lrvImpactVisualScale;
                        var lrvDustContactFactor = lrvGroundedWheelCount * 0.25;
                        lrvDustAccumulator += Math.abs(roverSpeed) * evaDt *
                          (_evaLowPower ? 2.0 : 4.0) * (1 + lrvSlipSignal * 2.2) *
                          lrvDustContactFactor;
                        var lrvDustEmitBudget = _evaLowPower ? 2 : 4;
                        var lrvDustTravelSign = roverSpeed < 0 ? -1 : 1;
                        while (lrvDustAccumulator >= 1 && lrvDustEmitBudget-- > 0) {
                          lrvDustAccumulator -= 1;
                          var dustI = lrvDustCursor++ % LRV_DUST_COUNT;
                          var dustSide = dustI % 2 ? 0.65 : -0.65;
                          dustSide += (lrvDustRand() - 0.5) * 0.10;
                          var dustO = dustI * 3;
                          lrvDustPositions[dustO] = roverGrp.position.x -
                            lrvForward.x * 0.55 * lrvDustTravelSign + lrvRight.x * dustSide;
                          lrvDustPositions[dustO + 2] = roverGrp.position.z -
                            lrvForward.z * 0.55 * lrvDustTravelSign + lrvRight.z * dustSide;
                          lrvDustPositions[dustO + 1] = _terrainHeightAt(lrvDustPositions[dustO], lrvDustPositions[dustO + 2]) + 0.07;
                          var dustRearSpeed = 0.22 + lrvDustRand() * 0.18;
                          var dustLateralSpeed = (lrvDustRand() - 0.5) * 0.25;
                          lrvDustVX[dustI] = -lrvForward.x * lrvDustTravelSign * dustRearSpeed +
                            lrvRight.x * dustLateralSpeed;
                          lrvDustVY[dustI] = 0.18 + lrvDustRand() * 0.22;
                          lrvDustVZ[dustI] = -lrvForward.z * lrvDustTravelSign * dustRearSpeed +
                            lrvRight.z * dustLateralSpeed;
                          lrvDustLife[dustI] = 0.45 + lrvDustRand() * 0.35;
                        }
                        lrvDustAccumulator = Math.min(lrvDustAccumulator, 1.5);
                        playerPos.set(roverGrp.position.x, roverGrp.position.y + 1.02, roverGrp.position.z);
                        yaw = roverHeading;
                        dir.copy(lrvForward).multiplyScalar(Math.abs(roverSpeed) * evaDt);
                      } else {
                        lrvThrottleSignal = 0;
                        lrvSlipSignal = 0;
                        lrvGradeRatio = 0;
                        lrvCrossSlopeRatio = 0;
                        lrvGripState = 'Grip';
                        // Suit locomotion (mmEvaFootVelocity): grip-limited, so starting,
                        // stopping and turning take the time they took on the Moon, and a
                        // sustained stride settles into the lope. Frame-rate independent.
                        var evaWishX = 0, evaWishZ = 0;
                        if (clickTarget && !moveState.forward && !moveState.back && !moveState.left && !moveState.right) {
                          var dx = clickTarget.x - playerPos.x;
                          var dz = clickTarget.z - playerPos.z;
                          var dist2d = Math.sqrt(dx * dx + dz * dz);
                          if (dist2d < 0.5) {
                            clickTarget = null;
                          } else {
                            var walkAngle = Math.atan2(dx, -dz);
                            var yawDelta = walkAngle - yaw;
                            while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
                            while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
                            yaw += yawDelta * (1 - Math.exp(-(comfortMode ? 3 : 6) * evaDt));
                            // Ease off near the target: at the grip limit a stop takes a metre.
                            var evaEase = Math.min(1, dist2d / 1.6);
                            evaWishX = Math.sin(walkAngle) * evaEase; evaWishZ = -Math.cos(walkAngle) * evaEase;
                          }
                        } else {
                          dir.set((moveState.right ? 1 : 0) - (moveState.left ? 1 : 0), 0, (moveState.back ? 1 : 0) - (moveState.forward ? 1 : 0));
                          if (dir.lengthSq() > 0) {
                            dir.normalize().applyAxisAngle(evaUpAxis, yaw);
                            evaWishX = dir.x; evaWishZ = dir.z;
                          }
                        }
                        var evaMoveDt = Math.min(0.25, evaHopDt);
                        evaStrideTime = (evaWishX !== 0 || evaWishZ !== 0) ? evaStrideTime + evaMoveDt : 0;
                        evaLope = !!moveState.lope || (!comfortMode && evaStrideTime > MM_EVA_GAIT.lopeAfter);
                        var evaGx = _terrainHeightAt(playerPos.x + 0.5, playerPos.z) - _terrainHeightAt(playerPos.x - 0.5, playerPos.z);
                        var evaGz = _terrainHeightAt(playerPos.x, playerPos.z + 0.5) - _terrainHeightAt(playerPos.x, playerPos.z - 0.5);
                        mmEvaFootVelocity(evaVel, evaWishX, evaWishZ, evaLope, comfortMode, !isJumping, evaGx, evaGz, evaMoveDt);
                        var evaPrevX = playerPos.x, evaPrevZ = playerPos.z;
                        playerPos.x += evaVel.x * evaMoveDt;
                        playerPos.z += evaVel.z * evaMoveDt;
                        evaCollide();
                        if (Math.abs(playerPos.x) > 96) { playerPos.x = playerPos.x > 0 ? 96 : -96; evaVel.x = 0; }
                        if (Math.abs(playerPos.z) > 96) { playerPos.z = playerPos.z > 0 ? 96 : -96; evaVel.z = 0; }
                        dir.set(playerPos.x - evaPrevX, 0, playerPos.z - evaPrevZ);   // this frame's stride, for steps and prints
                        var evaSpdH = Math.sqrt(evaVel.x * evaVel.x + evaVel.z * evaVel.z);
                        // Over a crest the ground can curve away faster than one-sixth g can
                        // pull you down after it, and at a lope you sail off crater rims.
                        // Judged on the ground's curvature a quarter-second either side of
                        // you, so the mesh's facet edges never trip it.
                        if (!isJumping && evaSpdH > 0.6) {
                          var evaLook = 0.22, evaUx = evaVel.x * evaLook, evaUz = evaVel.z * evaLook;
                          var evaG0 = _terrainHeightAt(playerPos.x, playerPos.z);
                          var evaGBack = _terrainHeightAt(playerPos.x - evaUx, playerPos.z - evaUz);
                          var evaGFwd = _terrainHeightAt(playerPos.x + evaUx, playerPos.z + evaUz);
                          if ((evaGFwd - 2 * evaG0 + evaGBack) / (evaLook * evaLook) < -EVA_G * 1.15) {
                            isJumping = true;
                            playerVelY = Math.max(-1.5, Math.min(1.2, (evaG0 - evaGBack) / evaLook));
                            evaHopStart = 0;
                          }
                        }
                        // Real-time ballistic hop in lunar gravity. The downward speed at
                        // touchdown (about 1.7 m/s) is only normalized into a landing cue.
                        var evaWasAirborne = isJumping;
                        var footGroundH = _terrainHeightAt(playerPos.x, playerPos.z) + 1.8;
                        if (isJumping) {
                          // Exact for constant gravity at any step size, so a slow frame
                          // cannot change the arc.
                          playerPos.y += playerVelY * evaHopDt - 0.5 * EVA_G * evaHopDt * evaHopDt;
                          playerVelY -= EVA_G * evaHopDt;
                        }
                        if (playerPos.y <= footGroundH || !isJumping) {
                          if (evaWasAirborne && playerVelY < -1.0) {
                            evaLandingImpact = Math.min(1, (-playerVelY - 1.0) / 1.5);
                            evaLandingImpactEnvelope = evaLandingImpact;
                            evaLandingDatasetActive = true;
                            canvasEl.dataset.evaLandingImpact = evaLandingImpact.toFixed(3);
                            emitLunarDustBurst(playerPos.x, playerPos.z,
                              -Math.sin(yaw), -Math.cos(yaw), evaLandingImpact,
                              _evaLowPower ? 2 : 5);
                          }
                          if (evaWasAirborne && evaHopStart) {
                            // The hop timer the moonwalk prediction is checked against.
                            var hopSecs = Math.round((performance.now() - evaHopStart) / 100) / 10;
                            evaHopStart = 0;
                            upd('evaHopTime', hopSecs);
                            if (typeof announceToSR === 'function') announceToSR('Hop: ' + hopSecs + ' seconds in the air.');
                          }
                          // The knees soak up the landing: a slow, springy dip in low g.
                          if (evaWasAirborne) evaKneeVel -= Math.min(0.9, Math.max(0, -playerVelY) * 0.3) * (comfortMode || gtReducedMotion ? 0.35 : 1);
                          playerPos.y = footGroundH;
                          playerVelY = 0;
                          isJumping = false;
                        }
                        // Lope bob and knee flex are visual; the physics above is the truth.
                        // Each loping footfall kicks a little regolith that arcs and falls clean.
                        if (!isJumping && evaSpdH > 0.1) {
                          var evaPrevPhase = evaGaitPhase;
                          evaGaitPhase += evaSpdH * evaMoveDt / (evaLope ? 1.9 : 1.3);
                          if (Math.floor(evaGaitPhase) !== Math.floor(evaPrevPhase) && evaSpdH > 1.1) {
                            emitLunarDustBurst(playerPos.x, playerPos.z, evaVel.x / evaSpdH, evaVel.z / evaSpdH,
                              Math.min(0.45, evaSpdH * 0.15), _evaLowPower ? 1 : 3);
                          }
                        }
                        var evaBobScale = comfortMode ? 0.3 : (gtReducedMotion ? 0.35 : 1);
                        evaBob = isJumping ? evaBob * Math.exp(-10 * evaMoveDt)
                          : Math.abs(Math.sin(Math.PI * evaGaitPhase)) * Math.min(0.06, evaSpdH * 0.026) * evaBobScale;
                        for (var evaKs = Math.ceil(evaMoveDt / 0.02), evaKi = 0; evaKi < evaKs; evaKi++) {
                          var evaKdt = evaMoveDt / evaKs;
                          evaKneeVel += (-64 * evaKnee - 9.6 * evaKneeVel) * evaKdt;
                          evaKnee = Math.max(-0.3, Math.min(0.06, evaKnee + evaKneeVel * evaKdt));
                        }
                      }
                      var groundH = _terrainHeightAt(playerPos.x, playerPos.z) + 1.8;
                      updateLrvAudio(false);
                      lrvImpactSignal *= Math.exp(-10 * evaDt);
                      lrvImpactAudioEnvelope *= Math.exp(-8 * evaDt);
                      lrvImpactCameraEnvelope *= Math.exp(-11 * evaDt);
                      evaLandingImpactEnvelope *= Math.exp(-8 * evaDt);
                      // DOM telemetry changes only on an event and its final reset.
                      if (lrvImpactDatasetActive && lrvImpactSignal < 0.01) {
                        lrvImpactDatasetActive = false;
                        canvasEl.dataset.lrvImpact = '0.000';
                      }
                      if (evaLandingDatasetActive && evaLandingImpactEnvelope < 0.01) {
                        evaLandingDatasetActive = false;
                        evaLandingImpact = 0;
                        canvasEl.dataset.evaLandingImpact = '0.000';
                      }

                      for (var dustN = 0; dustN < LRV_DUST_COUNT; dustN++) {
                        if (lrvDustLife[dustN] <= 0) continue;
                        var dustP = dustN * 3;
                        lrvDustLife[dustN] -= evaDt;
                        if (lrvDustLife[dustN] <= 0) { lrvDustPositions[dustP + 1] = -100; continue; }
                        lrvDustPositions[dustP] += lrvDustVX[dustN] * evaDt;
                        lrvDustPositions[dustP + 1] += lrvDustVY[dustN] * evaDt;
                        lrvDustPositions[dustP + 2] += lrvDustVZ[dustN] * evaDt;
                        lrvDustVY[dustN] -= 1.62 * evaDt;
                        if (lrvDustVY[dustN] <= 0 &&
                            lrvDustPositions[dustP + 1] <= _terrainHeightAt(
                              lrvDustPositions[dustP], lrvDustPositions[dustP + 2]) + 0.012) {
                          lrvDustLife[dustN] = 0;
                          lrvDustPositions[dustP + 1] = -100;
                        }
                      }
                      lrvDustGeo.attributes.position.needsUpdate = true;

                      // Distance-coupled gait evidence is stable across frame rates.
                      // Reduced/low-power tiers alter print density only, never movement.
                      if (!roverBoarded && dir.length() > 0.0005 && !isJumping) {
                        var evaFootTravel = dir.length();
                        evaStepDistanceAccumulator += evaFootTravel;
                        while (evaStepDistanceAccumulator >= EVA_STEP_STRIDE) {
                          evaStepDistanceAccumulator -= EVA_STEP_STRIDE;
                          evaSteps++;
                        }
                        evaBootprintDistanceAccumulator += evaFootTravel;
                        if (evaBootprintDistanceAccumulator >= EVA_BOOTPRINT_SPACING) {
                          evaBootprintDistanceAccumulator -= EVA_BOOTPRINT_SPACING;
                          emitEvaBootprint(playerPos.x, playerPos.z, yaw);
                        }
                      }

                      // Camera
                      if (roverBoarded) {
                        // Speed-responsive, critically damped chase view.
                        var lrvSpeed01 = Math.min(1, Math.abs(roverSpeed) / 6.2);
                        var lrvCameraDistance = (comfortMode ? 4.1 : 4.8) + lrvSpeed01 * (comfortMode ? 0.5 : 1.4);
                        var lrvCameraHeight = (comfortMode ? 2.45 : 2.2) + lrvSpeed01 * 0.55;
                        lrvCameraForward.set(
                          -Math.sin(roverHeading + lrvCameraYawOffset),
                          0,
                          -Math.cos(roverHeading + lrvCameraYawOffset)
                        );
                        lrvCamDesired.copy(roverGrp.position)
                          .addScaledVector(lrvCameraForward, -lrvCameraDistance);
                        lrvCamDesired.y = Math.max(
                          _terrainHeightAt(lrvCamDesired.x, lrvCamDesired.z) + 0.65,
                          roverGrp.position.y + lrvCameraHeight + Math.sin(lrvCameraPitchOffset) * lrvCameraDistance
                        );
                        lrvCamDesired.y += lrvImpactCameraEnvelope *
                          (gtReducedMotion ? 0 : (_evaLowPower ? 0.055 : 0.10));
                        camera.position.lerp(lrvCamDesired, 1 - Math.exp(-(comfortMode ? 4.5 : 7.0) * evaDt));
                        // Lerp follows a chord between frames; re-clamp the ACTUAL camera
                        // after smoothing so that chord can never cut through a ridge.
                        camera.position.y = Math.max(
                          camera.position.y,
                          _terrainHeightAt(camera.position.x, camera.position.z) + 0.75
                        );
                        if (gtReducedMotion) {
                          lrvCameraSteerLook = 0;
                        } else {
                          // Predict from the same signed automotive yaw rate used by
                          // physics. This composes toward the path without changing it.
                          var lrvPredictedYawDelta = roverSteer * roverSpeed * 0.38 * 0.45;
                          var lrvSteerLookTarget = -Math.sin(lrvPredictedYawDelta) *
                            (1.1 + lrvSpeed01 * 1.3) * (comfortMode ? 0.65 : 1);
                          lrvCameraSteerLook += (lrvSteerLookTarget - lrvCameraSteerLook) *
                            (1 - Math.exp(-5 * evaDt));
                        }
                        lrvCamTarget.copy(roverGrp.position).addScaledVector(lrvForward, 1.5 + lrvSpeed01 * 1.5);
                        lrvCamTarget.addScaledVector(lrvRight, lrvCameraSteerLook);
                        lrvCamTarget.y += 0.75;
                        camera.lookAt(lrvCamTarget);
                      } else {
                        camera.position.copy(playerPos);
                        camera.position.y += evaBob + evaKnee;
                        camera.rotation.order = 'YXZ';
                        camera.rotation.y = yaw;
                        camera.rotation.x = pitch;
                      }

                      // Body follows the camera (yaw only — it should not tip when you look up).
                      if (!roverBoarded) {
                        suitGroup.position.copy(playerPos);
                        suitGroup.position.y += evaBob + evaKnee;
                        suitGroup.rotation.y = yaw;
                      }
                      // Allocation-free terrain-conforming contact cues. Local +Z is
                      // the decal normal; R x F = N keeps the basis right-handed.
                      gtForward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
                      gtRight.set(Math.cos(yaw), 0, -Math.sin(yaw));
                      gtSuitContact.visible = !roverBoarded;
                      if (!roverBoarded) {
                        var suitContactPulse = evaLandingImpactEnvelope *
                          (gtReducedMotion ? 0.06 : (_evaLowPower ? 0.18 : 0.34));
                        gtSuitContact.scale.set(0.3 * (1 + suitContactPulse),
                          0.22 * (1 + suitContactPulse), 1);
                        poseGtSurfaceObject(gtSuitContact, playerPos.x, playerPos.z, 0.012, 0.28);
                      }

                      // Keep the tight shadow frustum centred on the astronaut, and hold the
                      // sun and Earth at a fixed bearing in the sky: both are effectively at
                      // infinity, so walking must not shift them.
                      sunTarget.position.set(playerPos.x, roverBoarded ? roverGrp.position.y : groundH - 1.8, playerPos.z);
                      sun.position.copy(sunTarget.position).add(_sunOffset);
                      if (_sunSprite) _sunSprite.position.copy(playerPos).addScaledVector(_sunDir, 170);
                      earthSprite.position.set(playerPos.x - 60, playerPos.y + 68, playerPos.z - 120);
                      skyGroup.position.copy(camera.position);

                      // ── Visor glare ──
                      // With no atmosphere the sun is a bare arc-lamp: turning into it washes
                      // the visor out completely. Driven by how closely the view direction
                      // lines up with the light, so it blooms and fades as you turn rather
                      // than sitting there as a static overlay. Skipped in comfort mode,
                      // where a full-screen brightness sweep is exactly the wrong thing.
                      if (glareEl) {
                        _glareFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
                        var align = _glareFwd.dot(_sunDir);           // 1 = looking straight at it
                        var glare = align > 0.55 ? Math.pow((align - 0.55) / 0.45, 1.6) : 0;
                        glare = comfortMode ? glare * 0.25 : glare * 0.8;
                        // Only touch the DOM when it would actually read differently: writing
                        // style.opacity every frame forces a style recalc and a composite on
                        // every single frame, for a value that mostly does not change.
                        if (Math.abs(glare - _glarePrev) > 0.02 || (glare === 0) !== (_glarePrev === 0)) {
                          _glarePrev = glare;
                          glareEl.style.opacity = glare.toFixed(2);
                        }
                      }

                      // O2 depletion (rate based on difficulty)
                      if (evaTick % 60 === 0) evaO2 = Math.max(0, evaO2 - diffSettings.o2Rate);
                      // O2 warnings
                      if (!o2Warned30 && evaO2 <= 30) {
                        o2Warned30 = true;
                        canvasEl.dataset.evaO2Warned = '30';
                        if (addToast) addToast('\u26A0\uFE0F O\u2082 at ' + Math.round(evaO2) + '% \u2014 Consider returning to the LM soon!', 'info');
                        if (typeof announceToSR === 'function') announceToSR('Oxygen at ' + Math.round(evaO2) + ' percent. Consider returning to the Lunar Module soon.');
                      }
                      if (!o2Warned15 && evaO2 <= 15) {
                        o2Warned15 = true;
                        canvasEl.dataset.evaO2Warned = '15';
                        if (addToast) addToast('\uD83D\uDEA8 CRITICAL: O\u2082 at ' + Math.round(evaO2) + '%! Return to LM immediately!', 'error');
                        if (typeof announceToSR === 'function') announceToSR('Critical. Oxygen at ' + Math.round(evaO2) + ' percent. Return to the Lunar Module immediately.');
                      }
                      // Consumables exhausted. The warnings above had no consequence attached \u2014
                      // O\u2082 ran to zero and the EVA carried on regardless, which quietly taught
                      // that the life-support budget is decorative. Sample collection now stops
                      // and the student is told, plainly, to end the EVA.
                      if (evaO2 <= 0 && !o2Exhausted) {
                        o2Exhausted = true;
                        var outEl = document.createElement('div');
                        outEl.id = 'eva-o2-out';
                        outEl.setAttribute('role', 'status');
                        outEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(127,29,29,0.92);border:1px solid rgba(248,113,113,0.6);border-radius:12px;padding:12px 18px;color:#fee2e2;font-family:system-ui;font-size:12px;text-align:center;pointer-events:none;z-index:14;max-width:280px;line-height:1.5';
                        outEl.innerHTML = '<div style="font-weight:bold;font-size:14px;margin-bottom:4px">\uD83D\uDEA8 CONSUMABLES EXHAUSTED</div>Suit oxygen is gone. Sample collection has stopped \u2014 press <b>End EVA</b> to return to the LM.';
                        if (canvasEl.parentElement && !document.getElementById('eva-o2-out')) canvasEl.parentElement.appendChild(outEl);
                        if (addToast) addToast('\uD83D\uDEA8 Suit O\u2082 exhausted \u2014 sample collection has stopped. End the EVA and return to the LM.', 'error');
                        if (typeof announceToSR === 'function') announceToSR('Suit oxygen exhausted. Sample collection has stopped. Press End EVA to return to the Lunar Module.');
                      }
                      // Vignette effect when O2 low
                      if (evaO2 < 20) {
                        var warningOverlay = document.getElementById('eva-o2-warning');
                        if (!warningOverlay) {
                          warningOverlay = document.createElement('div');
                          warningOverlay.id = 'eva-o2-warning';
                          warningOverlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5;border-radius:inherit';
                          canvasEl.parentElement.appendChild(warningOverlay);
                        }
                        var urgency = (20 - evaO2) / 20;
                        warningOverlay.style.background = 'radial-gradient(ellipse at center, transparent 40%, rgba(220,38,38,' + (urgency * 0.3) + ') 100%)';
                        warningOverlay.style.animation = evaO2 < 10 ? 'pulse 1s infinite' : 'none';
                      }

                      // Sample collection
                      if (evaSampleCooldown > 0) evaSampleCooldown--;
                      lunarSampleOrbs.forEach(function(orb) {
                        if (orb._collected || !orb.visible) return;
                        if (orb._isTraverseSample && (!gtActive || gtStep !== 3)) return;
                        orb.children[0].rotation.y += 0.02;
                        orb.children[0].material.opacity = 0.6 + Math.sin(evaTick * 0.05 + orb._pulsePhase) * 0.2;
                        var sDist = playerPos.distanceTo(orb.position);
                        if (sDist < 2 && moveState.sample && evaSampleCooldown <= 0 && !o2Exhausted) {
                          orb._collected = true; orb.visible = false;
                          evaSampleCooldown = 60;
                          if (!orb._isTraverseSample) evaSampleCount++;
                          var sd = orb._sampleData;
                          var picked = { key: orb._isTraverseSample ? 'traverse' : 'sample:' + orb._sampleIdx, name: sd.name, type: sd.type, icon: sd.icon, fact: sd.fact };
                          // Updater form: this loop's `d` is frozen at canvas mount, so the
                          // plain form rebuilt the array from the pre-EVA collection and every
                          // pickup replaced the one before it.
                          if (!orb._isTraverseSample || !gtSampleEverBanked) {
                            upd('lunarSamples', function(cur) {
                              var bag = cur || [];
                              return bag.some(function(bs) { return mmSampleKey(bs) === picked.key; }) ? bag : bag.concat([picked]);
                            });
                          }
                          if (orb._isTraverseSample) {
                            gtSampleCollected = true;
                            gtSampleResult = sd.name;
                          }
                          sfxSampleCollect();
                          if (addToast) addToast(sd.icon + ' Collected: ' + sd.name + ' \u2014 ' + sd.fact, 'success');
                          // The toast is visual-only; the HUD counter is a pointer-events:none
                          // div. Without this, a screen-reader student got no confirmation that
                          // pressing F had done anything.
                          if (typeof announceToSR === 'function') announceToSR(orb._isTraverseSample
                            ? 'Traverse sample collected: ' + sd.name + ', ' + sd.type + '. ' + sd.fact
                            : 'Sample collected: ' + sd.name + ', ' + sd.type + '. ' + sd.fact + ' ' + evaSampleCount + ' of ' + LUNAR_SAMPLES_DATA.length + ' collected.');
                          if (!orb._isTraverseSample || !gtSampleEverBanked) addXP(sd.xp);
                          if (orb._isTraverseSample) gtSampleEverBanked = true;
                        }
                      });
                      updateGtMission(evaDt);

                      // ── Deploy the seismometer (F, when you are standing at it) ──
                      // F is contextual: a rock at your feet gets collected, the instrument
                      // gets deployed. One key, and what it does is whatever you are next to.
                      if (!seismoDeployed && !o2Exhausted) {
                        var seiDx = playerPos.x - (alsepX + 2), seiDz = playerPos.z - (alsepZ + 1);
                        var seiDist = Math.sqrt(seiDx * seiDx + seiDz * seiDz);
                        if (seiDist < EVA_INTERACT_RANGE) {
                          // Idle pulse so it reads as interactive before you press anything.
                          _seismoPulse += 0.08;
                          seismo.position.y = alsepY + 0.15 + Math.sin(_seismoPulse) * 0.04;
                          if (moveState.sample && evaSampleCooldown <= 0) {
                            seismoDeployed = true;
                            evaSampleCooldown = 60;
                            seismo.position.y = alsepY + 0.15;
                            // Deployed: the instrument levels out and puts up its antenna.
                            var seiMast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6),
                              new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.5, roughness: 0.4 }));
                            seiMast.position.set(alsepX + 2, alsepY + 0.6, alsepZ + 1);
                            if (!_evaLowPower) seiMast.castShadow = true;
                            scene.add(seiMast);
                            var seiDish = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12),
                              new THREE.MeshStandardMaterial({ color: 0xfef3c7, side: THREE.DoubleSide, metalness: 0.3 }));
                            seiDish.position.set(alsepX + 2, alsepY + 0.95, alsepZ + 1);
                            seiDish.rotation.x = -0.9;
                            scene.add(seiDish);
                            upd('seismoDeployed', true);
                            sfxSampleCollect();
                            addXP(20);
                            if (addToast) addToast('📊 Seismometer deployed — it will keep listening for moonquakes long after you leave.', 'success');
                            if (typeof announceToSR === 'function') announceToSR('Seismometer deployed. The Apollo seismometers kept recording moonquakes and meteorite strikes for years after the crews went home.');
                          }
                        }
                      }

                      // ── Proximity-based discovery cards ──
                      if (evaTick % 30 === 0) {
                        var landmarks = [
                          { x: alsepX, z: alsepZ, name: t('stem.moonmission.alsep_science_station', 'ALSEP Science Station'), fact: t('stem.moonmission.the_apollo_lunar_surface_experiments_p', 'The Apollo Lunar Surface Experiments Package ran for years after the astronauts left. The seismometer detected moonquakes and meteorite impacts until 1977.'), icon: '\uD83D\uDEF0' },
                          { x: 4, z: 2, name: t('stem.moonmission.american_flag', 'American Flag'), fact: t('stem.moonmission.the_flags_on_the_moon_have_been_bleach', 'The flags were exposed to decades of harsh sunlight and likely faded badly. Lunar Reconnaissance Orbiter images show several Apollo flag poles still casting shadows; Apollo 11\'s flag was probably knocked over by engine exhaust.'), icon: '\uD83C\uDDFA\uD83C\uDDF8' },
                          { id: 'seismo', x: alsepX + 2, z: alsepZ + 1, name: t('stem.moonmission.seismometer', 'Seismometer'), fact: t('stem.moonmission.lunar_seismometers_detected_deep_moonq', 'Lunar seismometers detected deep moonquakes at 700-1100 km depth, caused by tidal forces from Earth. The Moon still has a partially molten core!'), icon: '\uD83D\uDCCA' },
                          { x: alsepX - 2, z: alsepZ - 1, name: t('stem.moonmission.laser_retroreflector', 'Laser Retroreflector'), fact: t('stem.moonmission.scientists_bounce_lasers_off_this_mirr', 'Scientists bounce lasers off this mirror to measure the Earth-Moon distance to within 1 cm accuracy. The Moon moves 3.8 cm farther from Earth each year.'), icon: '\uD83D\uDD2C' }
                        ];
                        // Once seated, the rover shares the player's coordinates and would
                        // otherwise permanently mask every useful discovery card at distance 0.
                        if (!roverBoarded) landmarks.push(
                          { id: 'lrv', x: roverGrp.position.x, z: roverGrp.position.z, name: t('stem.moonmission.lunar_rover_lrv', 'Lunar Rover (LRV)'), fact: t('stem.moonmission.the_lunar_roving_vehicle_cost_38_milli', 'The Lunar Roving Vehicle cost $38 million. Apollo 17\'s rover traveled 35.7 km \u2014 and it is still parked on the Moon where the crew left it.'), icon: '\uD83D\uDE97' }
                        );
                        var nearestLM = null;
                        var nearestLMDist = 999;
                        landmarks.forEach(function(lm) {
                          var ldist = Math.sqrt(Math.pow(playerPos.x - lm.x, 2) + Math.pow(playerPos.z - lm.z, 2));
                          if (ldist < nearestLMDist) { nearestLMDist = ldist; nearestLM = lm; }
                        });
                        var discEl = document.getElementById('eva-discovery');
                        if (!discEl) {
                          discEl = document.createElement('div');
                          discEl.id = 'eva-discovery';
                          discEl.style.cssText = 'position:absolute;bottom:' + (evaPadBand + 8) + 'px;right:8px;max-width:250px;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);border-radius:12px;padding:10px 14px;color:#e2e8f0;font-family:system-ui;font-size:10px;pointer-events:none;z-index:12;border:1px solid rgba(56,189,248,0.3);opacity:0;transition:opacity 0.5s';
                          canvasEl.parentElement.appendChild(discEl);
                        }
                        if (nearestLM && nearestLMDist < 6) {
                          // If a landmark can be acted on, the card is where the student
                          // finds that out. Nothing else in the scene says the seismometer
                          // is anything but decoration.
                          var prompt = (nearestLM.id === 'lrv' && !roverBoarded && nearestLMDist < LRV_BOARD_RANGE)
                            ? '<div style="margin-top:5px;padding-top:5px;border-top:1px solid rgba(251,191,36,0.3);color:#fbbf24;font-weight:bold">Press V or Board LRV</div>'
                            : (nearestLM.id === 'seismo' && !seismoDeployed && nearestLMDist < EVA_INTERACT_RANGE)
                            ? '<div style="margin-top:5px;padding-top:5px;border-top:1px solid rgba(251,191,36,0.3);color:#fbbf24;font-weight:bold">▸ Press F to deploy it</div>'
                            : (nearestLM.id === 'seismo' && seismoDeployed
                              ? '<div style="margin-top:5px;padding-top:5px;border-top:1px solid rgba(134,239,172,0.3);color:#86efac;font-weight:bold">☑ Deployed — it will outlive the mission</div>'
                              : '');
                          discEl.innerHTML = '<div style="font-weight:bold;font-size:12px;color:#fbbf24;margin-bottom:3px">' + nearestLM.icon + ' ' + nearestLM.name + '</div>' +
                            '<div style="color:#cbd5e1;line-height:1.4">' + nearestLM.fact + '</div>' + prompt;
                          discEl.style.opacity = '1';
                        } else {
                          discEl.style.opacity = '0';
                        }
                      }

                      // ── Radio comms chatter ──
                      if (evaTick % 600 === 0 && evaTick > 0) { // every ~10 seconds
                        var evaComms = [
                          'Houston: "How does it feel up there, Commander?"',
                          'LMP: "The regolith is incredibly fine \u2014 like talcum powder."',
                          'Houston: "Your O\u2082 looks good. Continue exploration."',
                          'CDR: "The colors here \u2014 it\u2019s all grays and browns, but the shadows are so sharp."',
                          'LMP: "No atmosphere means no scattering. The shadows are pure black."',
                          'Houston: "Can you describe the terrain near the rille?"',
                          'CDR: "I can see Earth from here. It\u2019s the most beautiful thing I\u2019ve ever seen."',
                          'LMP: "This rock has green crystals in it \u2014 olivine! Fantastic!"',
                          'Houston: "Roger that. Take a photo for the geologists back home."',
                          'CDR: "The silence is profound. Just my own breathing in the suit."',
                          'LMP: "I just jumped three feet in the air. One-sixth gravity is incredible!"',
                          'Houston: "We\u2019re monitoring your vitals. Heart rate is elevated \u2014 from excitement, we hope."'
                        ];
                        var commsIdx2 = Math.floor(evaTick / 600) % evaComms.length;
                        var commsEl = document.getElementById('eva-comms');
                        if (!commsEl) {
                          commsEl = document.createElement('div');
                          commsEl.id = 'eva-comms';
                          commsEl.style.cssText = 'position:absolute;top:60px;left:50%;transform:translateX(-50%);color:rgba(165,180,252,0.7);font-size:10px;font-style:italic;font-family:system-ui;pointer-events:none;z-index:11;text-align:center;transition:opacity 1s;max-width:350px;text-shadow:0 1px 4px rgba(0,0,0,0.8)';
                          canvasEl.parentElement.appendChild(commsEl);
                        }
                        commsEl.style.opacity = '0';
                        setTimeout(function() {
                          commsEl.textContent = '\uD83D\uDCE1 ' + evaComms[commsIdx2];
                          commsEl.style.opacity = '1';
                        }, 500);
                        setTimeout(function() { commsEl.style.opacity = '0'; }, 8000);
                      }

                      // HUD updates
                      if (evaTick % 10 === 0) {
                        var o2El = document.getElementById('eva-o2');
                        var sampEl = document.getElementById('eva-samples');
                        var stepsEl = document.getElementById('eva-steps');
                        var modeEl = document.getElementById('eva-mode');
                        var lrvSpeedEl = document.getElementById('eva-lrv-speed');
                        var lrvTerrainEl = document.getElementById('eva-lrv-terrain');
                        var lrvGripEl = document.getElementById('eva-lrv-grip');
                        if (o2El) { o2El.textContent = evaO2.toFixed(0) + '%'; o2El.style.color = evaO2 > 50 ? '#22c55e' : evaO2 > 20 ? '#f59e0b' : '#ef4444'; }
                        if (sampEl) sampEl.textContent = evaSampleCount + ' / ' + LUNAR_SAMPLES_DATA.length + ' samples';
                        if (stepsEl) stepsEl.textContent = evaSteps + ' steps';
                        if (modeEl) { modeEl.textContent = roverBoarded ? 'LRV traverse' : 'On foot'; modeEl.style.color = roverBoarded ? '#fde68a' : '#38bdf8'; }
                        if (lrvSpeedEl) lrvSpeedEl.textContent = roverBoarded
                          ? (Math.abs(roverSpeed) * 3.6).toFixed(1) + ' km/h \u2022 ' + Math.round(roverDistance) + ' m'
                          : (roverPlanarDistance() <= LRV_BOARD_RANGE ? 'Ready to board' : Math.ceil(roverPlanarDistance()) + ' m away');
                        var lrvGradeText = (lrvGradeRatio * 100).toFixed(1);
                        var lrvCrossText = (lrvCrossSlopeRatio * 100).toFixed(1);
                        var lrvSlipText = lrvSlipSignal.toFixed(3);
                        if (canvasEl.dataset.lrvGrade !== lrvGradeText) canvasEl.dataset.lrvGrade = lrvGradeText;
                        if (canvasEl.dataset.lrvCrossSlope !== lrvCrossText) canvasEl.dataset.lrvCrossSlope = lrvCrossText;
                        if (canvasEl.dataset.lrvSlip !== lrvSlipText) canvasEl.dataset.lrvSlip = lrvSlipText;
                        if (canvasEl.dataset.lrvGripState !== lrvGripState) canvasEl.dataset.lrvGripState = lrvGripState;
                        var lrvVisualSteerText = lrvVisualSteerDegrees.toFixed(1);
                        if (canvasEl.dataset.lrvVisualSteer !== lrvVisualSteerText) {
                          canvasEl.dataset.lrvVisualSteer = lrvVisualSteerText;
                        }
                        var lrvGroundedText = String(lrvGroundedWheelCount);
                        if (canvasEl.dataset.lrvGroundedWheels !== lrvGroundedText) {
                          canvasEl.dataset.lrvGroundedWheels = lrvGroundedText;
                        }
                        lrvConsoleState = !roverBoarded ? 'parked'
                          : (lrvGripState === 'Slip' ? 'traction'
                            : (Math.abs(roverSpeed) > 0.12 ? 'drive' : 'ready'));
                        if (canvasEl.dataset.lrvConsoleState !== lrvConsoleState) {
                          canvasEl.dataset.lrvConsoleState = lrvConsoleState;
                        }
                        var lrvConsoleColor = lrvConsoleState === 'traction'
                          ? 0xf59e0b : (lrvConsoleState === 'drive' ? 0x67e8f9
                            : (lrvConsoleState === 'ready' ? 0x86efac : 0x64748b));
                        rConsoleStatusMat.color.setHex(lrvConsoleColor);
                        rConsoleDisplayMat.opacity = roverBoarded ? 0.52 : 0.24;
                        var bootprintCountText = String(evaBootprintCount);
                        if (canvasEl.dataset.evaBootprintCount !== bootprintCountText) {
                          canvasEl.dataset.evaBootprintCount = bootprintCountText;
                        }
                        // GRADE / GRIP only mean something with wheels under you.
                        var wantLrvRows = roverBoarded ? '' : 'none';
                        if (_evaLrvRowsDisplay !== wantLrvRows) {
                          _evaLrvRowsDisplay = wantLrvRows;
                          var lrvRowEls = evaHud.querySelectorAll('.eva-lrv-row');
                          for (var lri = 0; lri < lrvRowEls.length; lri++) lrvRowEls[lri].style.display = wantLrvRows;
                        }
                        if (lrvTerrainEl) {
                          var lrvTerrainText = roverBoarded ? lrvGradeText + '% \u2022 cross ' + lrvCrossText + '%' : '--';
                          if (lrvTerrainEl.textContent !== lrvTerrainText) lrvTerrainEl.textContent = lrvTerrainText;
                        }
                        if (lrvGripEl) {
                          var lrvGripText = roverBoarded ? lrvGripState + ' \u2022 ' + Math.round(lrvSlipSignal * 100) + '%' : '--';
                          if (lrvGripEl.textContent !== lrvGripText) lrvGripEl.textContent = lrvGripText;
                        }
                        updateLrvAction();

                        // ── Bearing to the nearest rock still on the ground ──
                        // Rotated relative to where you are FACING, so the arrow means
                        // "walk that way" rather than "north is over there" — which is the
                        // difference between a compass and a hint.
                        var tgtEl = document.getElementById('eva-target');
                        if (tgtEl) {
                          var best = null, bestD = 1e9;
                          for (var ti = 0; ti < lunarSampleOrbs.length; ti++) {
                            var orbT = lunarSampleOrbs[ti];
                            if (orbT._collected || !orbT.visible || orbT._isTraverseSample) continue;
                            var dT = playerPos.distanceTo(orbT.position);
                            if (dT < bestD) { bestD = dT; best = orbT; }
                          }
                          if (!best) {
                            tgtEl.innerHTML = '<span style="color:#22c55e">all rocks collected</span>';
                          } else {
                            var bx = best.position.x - playerPos.x, bz = best.position.z - playerPos.z;
                            var rel = Math.atan2(bx, -bz) - yaw;              // 0 = dead ahead
                            while (rel > Math.PI) rel -= Math.PI * 2;
                            while (rel < -Math.PI) rel += Math.PI * 2;
                            var deg = Math.round(rel * 180 / Math.PI);
                            tgtEl.innerHTML = '<span style="display:inline-block;transform:rotate(' + deg + 'deg)">↑</span> '
                              + Math.round(bestD) + ' m';
                          }
                        }

                        // ── Cuff checklist ──
                        var tasksEl = document.getElementById('eva-tasks');
                        if (tasksEl) {
                          var row = function(done, label) {
                            return '<div style="color:' + (done ? '#86efac' : '#cbd5e1') + '">'
                              + (done ? '☑' : '☐') + ' ' + label + '</div>';
                          };
                          tasksEl.innerHTML =
                            row(evaSampleCount >= 4, 'Collect 4 rock samples (' + Math.min(evaSampleCount, 4) + '/4)') +
                            row(seismoDeployed, 'Deploy the seismometer') +
                            row(evaSampleCount >= LUNAR_SAMPLES_DATA.length, 'Bonus: collect all ' + LUNAR_SAMPLES_DATA.length);
                        }
                      }

                      if (composer) { try { composer.render(); } catch (e) { composer = null; renderer.render(scene, camera); } }
                      else { renderer.render(scene, camera); }
                    }
                    animateEva();

                    // ── WebXR (optional): stand on the Moon — room-scale EVA walk (thumbstick
                    //    glide + teleport + comfort vignette via AlloVR). Loads only when a headset
                    //    is present; presenting-only, so the 2D pointer-lock walk is untouched.
                    //    Seat/bounds are world-units — ON-DEVICE TUNABLE. ──
                    var _evaVR = null, _evaVRPaused = false, _evaVRBtnOff = null;
                    try {
                      if (navigator.xr && navigator.xr.isSessionSupported) {
                        navigator.xr.isSessionSupported('immersive-vr').then(function (ok) {
                          if (!ok || !document.contains(canvasEl)) return;
                          var ensureV = function (cb) {
                            if (window.AlloModules && window.AlloModules.AlloVR) { cb(window.AlloModules.AlloVR); return; }
                            var base = 'https://alloflow-cdn.pages.dev/', q = '';
                            try {
                              var scr = document.querySelectorAll('script[src]');
                              for (var i = 0; i < scr.length; i++) {
                                var m = (scr[i].getAttribute('src') || '').match(/^(.*\/)(?:allo_vr_module|prim3d_module|stem_lab\/stem_tool_[a-z0-9]+)\.js(\?.*)?$/);
                                if (m) { base = m[1]; q = m[2] || ''; break; }
                              }
                            } catch (e) {}
                            try {
                              var s = document.createElement('script'); s.src = base + 'allo_vr_module.js' + q; s.async = true;
                              s.onload = function () { cb(window.AlloModules && window.AlloModules.AlloVR); };
                              s.onerror = function () { cb(null); };
                              document.head.appendChild(s);
                            } catch (e) { cb(null); }
                          };
                          ensureV(function (V) {
                            if (!V || !document.contains(canvasEl)) return;
                            try {
                              _evaVR = V.enable({
                                THREE: THREE, renderer: renderer, scene: scene, camera: camera,
                                seat: { position: [playerPos.x, 0, playerPos.z], scale: 1.0, moveSpeed: 1.6 },   // lunar amble
                                bounds: { minX: -80, maxX: 80, minZ: -80, maxZ: 80 },
                                render: function () { if (composer) { try { composer.render(); return; } catch (e) {} } renderer.render(scene, camera); },
                                pauseLoop: function () {
                                  _evaVRPaused = true;
                                  resetLrvImpactEffects();
                                  updateLrvAudio(true);
                                },
                                resumeLoop: function () {
                                  if (evaAlive && _evaVRPaused) {
                                    _evaVRPaused = false;
                                    resetLrvImpactEffects();
                                    lrvImpactCooldown = 0.28;
                                    updateLrvAudio(false);
                                    animateEva();
                                  }
                                }
                              });
                              _evaVRBtnOff = V.mountButton(evaHud, _evaVR);
                            } catch (e) {}
                          });
                        }).catch(function () {});
                      }
                    } catch (e) {}

                    // Cleanup ref
                    canvasEl._evaCleanup = function() {
                      if (!evaAlive) return;
                      evaAlive = false;
                      gtActive = false;
                      if (evaRaf) { cancelAnimationFrame(evaRaf); evaRaf = 0; }
                      canvasEl._evaCleanup = null;
                      try { if (_evaVRBtnOff) _evaVRBtnOff(); } catch (e) {}
                      try { if (_evaVR && _evaVR.destroy) _evaVR.destroy(); _evaVR = null; } catch (e) {}
                      canvasEl.removeEventListener('keydown', onEvaKeyDown);
                      canvasEl.removeEventListener('blur', onEvaBlur);
                      canvasEl.removeEventListener('keyup', onEvaKeyUp);
                      canvasEl.removeEventListener('mousedown', onEvaMouseDown);
                      canvasEl.removeEventListener('mouseup', onEvaMouseUp);
                      document.removeEventListener('mousemove', onMM);
                      document.removeEventListener('visibilitychange', onLrvVisibilityChange);
                      if (lrvSoundEl) {
                        lrvSoundEl.removeEventListener('click', onLrvSoundAction);
                        if (lrvSoundEl.parentElement) lrvSoundEl.parentElement.removeChild(lrvSoundEl);
                      }
                      shutdownLrvAudio();
                      if (lrvActionEl) {
                        lrvActionEl.removeEventListener('click', onLrvAction);
                        if (lrvActionEl.parentElement) lrvActionEl.parentElement.removeChild(lrvActionEl);
                      }
                      if (gtActionEl) gtActionEl.removeEventListener('click', onGtAction);
                      if (gtPanel && gtPanel.parentElement) gtPanel.parentElement.removeChild(gtPanel);
                      ['geologyTraverseStatus', 'geologyTraverseStep', 'geologyTraverseTargetDistance',
                        'geologyTraverseDistance', 'lrvImpact', 'lrvImpactCount',
                        'evaLandingImpact', 'lunarSurfaceProfile', 'lrvVisualProfile',
                        'lrvSteeringMode', 'lrvVisualSteer', 'lrvConsoleState',
                        'lrvGroundedWheels', 'evaBootprintCount',
                        'evaBootprintCap'].forEach(function(gtKey) {
                        try { delete canvasEl.dataset[gtKey]; } catch (_gtDatasetCleanupErr) {}
                      });
                      try {
                        scene.remove(roverGrp);
                        scene.remove(lrvDust);
                        scene.remove(lrvTracks);
                        scene.remove(gtBeaconGroup);
                        scene.remove(gtSpecimen);
                        scene.remove(gtRoverContact);
                        scene.remove(gtSuitContact);
                        scene.remove(lrvWheelContacts);
                        scene.remove(evaBootprints);
                        scene.remove(lunarHorizon);
                        var lrvDisposedGeometries = [], lrvDisposedMaterials = [];
                        roverGrp.traverse(function(lrvNode) {
                          if (!lrvNode || !lrvNode.isMesh) return;
                          if (lrvNode.geometry && lrvDisposedGeometries.indexOf(lrvNode.geometry) === -1) {
                            lrvDisposedGeometries.push(lrvNode.geometry);
                            lrvNode.geometry.dispose();
                          }
                          var lrvMats = Array.isArray(lrvNode.material) ? lrvNode.material : [lrvNode.material];
                          lrvMats.forEach(function(lrvMat) {
                            if (lrvMat && lrvDisposedMaterials.indexOf(lrvMat) === -1) {
                              lrvDisposedMaterials.push(lrvMat);
                              lrvMat.dispose();
                            }
                          });
                        });
                        lrvDustGeo.dispose();
                        lrvDustMat.dispose();
                        lrvTrackGeo.dispose();
                        lrvTrackMat.dispose();
                        lrvWheelContactGeo.dispose();
                        lrvWheelContactMat.dispose();
                        evaBootprintGeo.dispose();
                        evaBootprintMat.dispose();
                        gtBeaconGeo.dispose();
                        gtBeaconMat.dispose();
                        gtBeaconPinGeo.dispose();
                        gtBeaconPinMat.dispose();
                        gtSpecimenGeo.dispose();
                        gtSpecimenMat.dispose();
                        gtSpecimenRingGeo.dispose();
                        gtSpecimenRingMat.dispose();
                        gtContactGeo.dispose();
                        gtContactMat.dispose();
                        terrainMat.bumpMap = null;
                        lunarMicroTex.dispose();
                        lunarHorizonGeo.dispose();
                        lunarHorizonMat.dispose();
                        lunarMicroTex = null;
                        lunarHorizonGeo = lunarHorizonMat = lunarHorizon = null;
                        terrainTex.dispose(); earthTex.dispose(); terrainGeo.dispose();
                        skyGeos.forEach(function (g) { g.dispose(); });
                        skyMats.forEach(function (m) { m.dispose(); });
                        _rockMeshes.forEach(function (m) { scene.remove(m); });
                        _rockGeos.forEach(function (g) { g.dispose(); });
                        _rockMat.dispose();
                        _massifMeshes.forEach(function (m) { scene.remove(m); m.geometry.dispose(); });
                        lmGroup.traverse(function (n) { if (n.isMesh && n.geometry) n.geometry.dispose(); });
                        (lmGroup.userData.mmMaterials || []).forEach(function (m) { m.dispose(); });
                        (lmGroup.userData.mmTextures || []).forEach(function (tx) { tx.dispose(); });
                        if (_evaEnvRT) { _evaEnvRT.dispose(); _evaEnvRT = _evaEnvMap = null; }
                      } catch (_lrvDisposeErr) {}
                      if (document.pointerLockElement === canvasEl) document.exitPointerLock();
                      if (composer) { try { (composer.passes || []).forEach(function (p) { if (p && p.dispose) p.dispose(); }); } catch (e) {} composer = null; }
                      renderer.dispose(); if (window.StemLab && window.StemLab.releaseGl) window.StemLab.releaseGl(renderer);
                      if (evaHud.parentElement) evaHud.parentElement.removeChild(evaHud);
                      if (evaPad) {
                        // Release anything still held, or a button removed mid-press leaves
                        // moveState stuck true and the astronaut walks on his own.
                        var padBtns = evaPad.querySelectorAll('button');
                        for (var pbi = 0; pbi < padBtns.length; pbi++) {
                          if (padBtns[pbi]._mmRelease) { try { padBtns[pbi]._mmRelease(); } catch (_padErr) {} }
                        }
                        if (evaPad.parentElement) evaPad.parentElement.removeChild(evaPad);
                      }
                      if (vignetteEl && vignetteEl.parentElement) vignetteEl.parentElement.removeChild(vignetteEl);
                      if (glareEl && glareEl.parentElement) glareEl.parentElement.removeChild(glareEl);
                      ['eva-o2-out', 'eva-o2-warning', 'eva-discovery', 'eva-comms'].forEach(function(id) {
                        var el = document.getElementById(id);
                        if (el && el.parentElement) el.parentElement.removeChild(el);
                      });
                    };
                  }

                  if (window.THREE) doEvaInit(window.THREE);
                  else {
                    window.StemLab.ensureThree({ orbit: false }).then(function () { doEvaInit(window.THREE); }).catch(function () { console.error('[MoonMission] Three.js failed to load'); });
                  }
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-slate-700 flex justify-between items-center' },
              h('div', null,
                h('p', { className: 'text-xs text-white font-bold' }, t('stem.moonmission.moonwalk_eva_3', '\uD83D\uDC68\u200D\uD83D\uDE80 Moonwalk EVA')),
                h('p', { className: 'text-[0.6875rem] text-slate-400' }, t('stem.moonmission.explore_collect_samples_jump_in_1_6_gr', 'Explore \u2022 Collect samples \u2022 Jump in 1/6 gravity!'))
              ),
              h('button', {
                title: 'End moonwalk EVA and return to Lunar Module. ' + (d.lunarSamples || []).length + ' samples collected.',
                disabled: eventPending,
                onClick: function() {
                  if (!canProceed()) return;
                  // Clean up EVA canvas (Three.js, RAF, event listeners)
                  var evaCanvas = document.querySelector('[data-eva-canvas]');
                  if (evaCanvas && evaCanvas._evaCleanup) evaCanvas._evaCleanup();
                  advancePhase(7);
                  log('\uD83D\uDC68\u200D\uD83D\uDE80 EVA complete. ' + (d.lunarSamples || []).length + ' samples collected. Preparing for ascent.');
                  addXP(25);
                  if (addToast) addToast('\u2B06\uFE0F EVA complete! Time to go home. Preparing lunar ascent.', 'success');
                },
                className: 'px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'
              }, t('stem.moonmission.end_eva_return_to_lm', '\u2B06\uFE0F End EVA \u2014 Return to LM'))
            )
          )
        ),

        // ═══ PHASE 7: LUNAR ASCENT & RENDEZVOUS (Animated Canvas) ═══
        phase === 7 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '300px' } },
              h('canvas', {
                role: 'img',
                'aria-label': t('stem.moonmission.ascent_canvas_alt', 'Animated lunar ascent and rendezvous. The ascent stage lifts off from the descent stage, its exhaust knocking over the flag, and climbs into orbit. Columbia\'s orbit, about 110 kilometers up, and Eagle\'s are both drawn, with Eagle\'s height and its distance to Columbia shown until it docks. Earth hangs still in the sky above the landing site.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._ascentInit) return;
                  cvEl._ascentInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, HA = cvEl.offsetHeight || 300;
                  cvEl.width = W * 2; cvEl.height = HA * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== HA)) { W = nw; HA = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  var _lastAscentState = null;   // throttle the readiness publish
                  var aClock = { last: null, acc: 0 };
                  function drawAscent(ts) {
                    if (_mmAnimPaused && tick > 0) { aClock.last = null; if (document.contains(cvEl)) requestAnimationFrame(drawAscent); return; }
                    tick += mmFrameSteps(aClock, ts);
                    ctx.clearRect(0, 0, W, HA);
                    // Black lunar sky + stars
                    ctx.fillStyle = '#000008'; ctx.fillRect(0, 0, W, HA);
                    drawStarfield(ctx, W, HA, tick, 130);
                    // Phase timing (frames): 0-90 prelaunch, 90-450 ascent, 450-780 rendezvous, 780+ docked
                    var prelaunch = tick < 90;
                    var launching = tick >= 90 && tick < 450;
                    var rendezvous = tick >= 450 && tick < 780;
                    var docked = tick >= 780;
                    var aState = docked ? 'docked' : rendezvous ? 'rendezvous' : launching ? 'ascent' : 'prelaunch';
                    if (aState !== _lastAscentState) { _lastAscentState = aState; upd('ascentStatus', aState); }
                    // Lunar surface with curving horizon (we're on a small world). Lunar
                    // morning at Tranquility Base: the sun is low in the east (right), so
                    // every rock and crater throws a long shadow to the left.
                    var horizonY = HA * 0.78;
                    ctx.save();
                    var grd = ctx.createLinearGradient(0, horizonY - 6, 0, HA);
                    grd.addColorStop(0, '#a39d93'); grd.addColorStop(0.35, '#8c867d'); grd.addColorStop(1, '#6d6860');
                    ctx.fillStyle = grd;
                    ctx.beginPath();
                    var hzR = W * 4, hzA = Math.asin(0.5 / 4);   // a gentle curve edge to edge
                    ctx.moveTo(0, HA);
                    ctx.arc(W * 0.5, horizonY + hzR, hzR, -Math.PI / 2 - hzA, -Math.PI / 2 + hzA);
                    ctx.lineTo(W, HA); ctx.closePath(); ctx.fill();
                    ctx.clip();
                    // Craters, flattened by perspective: the sunward (left) inner wall is
                    // lit and the far wall in shadow.
                    var gr = _seededRand(11);
                    for (var ci = 0; ci < 14; ci++) {
                      var cfx = gr.next(), cfy = gr.next();
                      var ccy = horizonY + 6 + cfy * cfy * (HA - horizonY - 8);
                      var depth = (ccy - horizonY) / (HA - horizonY);
                      var ccx = cfx * W, crx = (4 + gr.next() * 12) * (0.4 + depth), cry = crx * (0.18 + depth * 0.22);
                      ctx.fillStyle = 'rgba(60,56,50,0.55)';
                      ctx.beginPath(); ctx.ellipse(ccx, ccy, crx, cry, 0, 0, Math.PI * 2); ctx.fill();
                      ctx.fillStyle = 'rgba(200,194,182,0.55)';
                      ctx.beginPath(); ctx.ellipse(ccx - crx * 0.25, ccy, crx * 0.7, cry * 0.75, 0, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
                      ctx.strokeStyle = 'rgba(225,219,206,0.5)'; ctx.lineWidth = 0.8;
                      ctx.beginPath(); ctx.ellipse(ccx, ccy, crx, cry, 0, -Math.PI * 0.1, Math.PI * 0.6); ctx.stroke();
                    }
                    // Rocks and their shadows.
                    for (var ri = 0; ri < 22; ri++) {
                      var rfy = gr.next();
                      var ry = horizonY + 4 + rfy * rfy * (HA - horizonY - 6), rdep = (ry - horizonY) / (HA - horizonY);
                      var rx = gr.next() * W, rs = (0.8 + gr.next() * 2.2) * (0.5 + rdep * 1.6);
                      ctx.fillStyle = 'rgba(30,28,25,0.45)';
                      ctx.fillRect(rx - rs * 5, ry - rs * 0.25, rs * 5, rs * 0.5);
                      ctx.fillStyle = '#b9b2a6';
                      ctx.beginPath(); ctx.ellipse(rx, ry - rs * 0.4, rs, rs * 0.6, 0, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.restore();
                    // Earth hangs high in the sky here, and stays put: the Moon keeps one
                    // face to Earth, so from the near side it never rises or sets. (It was
                    // labelled "Earthrise" and parked on the horizon.)
                    var eX = W * 0.22, eY = HA * 0.2;
                    drawDetailedEarth(ctx, eX, eY, 12, tick);
                    ctx.fillStyle = 'rgba(148,163,184,0.8)'; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
                    ctx.fillText('Earth: it never rises or sets here', eX, eY + 24);
                    // LM descent stage left behind: the launch pad for the ascent stage.
                    var descentX = W * 0.44;
                    var lmK = Math.min(1.8, Math.max(1, W / 560));   // lander scale on wide screens
                    var descentY = horizonY - 8 * lmK, padY = descentY - 10 * lmK;
                    ctx.fillStyle = 'rgba(25,23,20,0.5)';                        // long shadow to the west
                    ctx.beginPath(); ctx.moveTo(descentX + 20 * lmK, descentY + 19 * lmK); ctx.lineTo(descentX - 80 * lmK, descentY + 17 * lmK); ctx.lineTo(descentX - 80 * lmK, descentY + 21 * lmK); ctx.lineTo(descentX + 20 * lmK, descentY + 21 * lmK); ctx.closePath(); ctx.fill();
                    ctx.save();
                    ctx.translate(descentX, descentY); ctx.scale(lmK, lmK);
                    ctx.strokeStyle = '#8b8f96'; ctx.lineWidth = 1.4;                // legs: two in profile, one toward us
                    ctx.beginPath(); ctx.moveTo(-13, 3); ctx.lineTo(-24, 18); ctx.moveTo(-13, 10); ctx.lineTo(-24, 18); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(13, 3); ctx.lineTo(24, 18); ctx.moveTo(13, 10); ctx.lineTo(24, 18); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(-5, 19); ctx.stroke();
                    ctx.fillStyle = '#6b7078';
                    ctx.fillRect(-27, 17.5, 6, 2); ctx.fillRect(21, 17.5, 6, 2); ctx.fillRect(-8, 18.5, 6, 2);
                    ctx.strokeStyle = 'rgba(203,213,225,0.7)'; ctx.lineWidth = 0.6;   // the ladder on the front leg
                    for (var li = 0; li < 4; li++) { ctx.beginPath(); ctx.moveTo(-7, 11 + li * 2); ctx.lineTo(-3, 11 + li * 2); ctx.stroke(); }
                    var foil = ctx.createLinearGradient(-14, 0, 14, 0);                // body: gold foil, lit from the east
                    foil.addColorStop(0, '#8a6a22'); foil.addColorStop(0.55, '#c9a444'); foil.addColorStop(1, '#f1d98a');
                    ctx.fillStyle = foil;
                    ctx.beginPath(); ctx.moveTo(-14, 1); ctx.lineTo(-11, -1); ctx.lineTo(11, -1); ctx.lineTo(14, 1); ctx.lineTo(14, 10); ctx.lineTo(-14, 10); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = 'rgba(20,18,16,0.75)';                             // black foil quadrant
                    ctx.fillRect(3, 2, 8, 6);
                    ctx.fillStyle = '#4b5057';                                         // descent engine skirt
                    ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(4, 10); ctx.lineTo(5.5, 14); ctx.lineTo(-5.5, 14); ctx.closePath(); ctx.fill();
                    ctx.restore();
                    // The flag. Aldrin watched the ascent engine's blast knock it flat.
                    var flagFall = Math.min(1, Math.max(0, (tick - 92) / 18));
                    ctx.save();
                    ctx.translate(descentX - 32 * lmK, descentY + 19 * lmK); ctx.scale(lmK, lmK);
                    ctx.rotate(-flagFall * Math.PI * 0.5);
                    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 0.7;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -23); ctx.stroke();
                    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0.4, -23, 8, 5);
                    ctx.fillStyle = '#b91c1c'; ctx.fillRect(0.4, -22, 8, 1); ctx.fillRect(0.4, -20, 8, 1);
                    ctx.fillStyle = '#1e3a8a'; ctx.fillRect(0.4, -23, 3.4, 2.6);
                    ctx.restore();
                    // CSM orbital position (across the sky)
                    var csmX, csmY;
                    if (prelaunch) {
                      csmX = W * 0.8 - (tick * 0.4);
                      csmY = HA * 0.15 + Math.sin(tick * 0.02) * 2;
                    } else if (launching) {
                      csmX = W * 0.8 - 36 - ((tick - 90) * 0.15);
                      csmY = HA * 0.17 + Math.sin(tick * 0.02) * 2;
                    } else if (rendezvous) {
                      var rF = (tick - 450) / 330;
                      csmX = W * 0.7 - 18 + rF * 8;
                      csmY = HA * 0.22 + rF * 6;
                    } else {
                      csmX = W * 0.62;
                      csmY = HA * 0.3;
                    }
                    // Ascent stage position
                    var ascentX, ascentY, ascentAng = 0;
                    if (prelaunch) {
                      ascentX = descentX; ascentY = padY;
                    } else if (launching) {
                      var lF = (tick - 90) / 360;
                      ascentX = descentX + lF * lF * 70;
                      ascentY = padY - lF * (padY - HA * 0.3);   // into Eagle's low orbit
                      ascentAng = lF * 0.5;
                    } else if (rendezvous) {
                      var rF2 = (tick - 450) / 330;
                      var sX = descentX + 70, sY = HA * 0.3;
                      ascentX = sX + (csmX - 14 - sX) * rF2;
                      // Rides its lower orbit, gaining on Columbia, and climbs to it only
                      // in the last quarter, in step with the altitude readout.
                      ascentY = sY + (csmY - sY) * Math.max(0, (rF2 - 0.75) / 0.25);
                      ascentAng = 0.5 + rF2 * 0.4;
                    } else {
                      ascentX = csmX - 14; ascentY = csmY;
                      ascentAng = 0.9;
                    }
                    // The two orbits: Eagle was put into a low 17 x 83 km orbit below and
                    // behind Columbia (about 110 km) and caught up because a lower orbit
                    // laps faster. The readout used to jump straight to 110 km.
                    if (rendezvous) {
                      ctx.save();
                      ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
                      ctx.font = '8px system-ui'; ctx.textAlign = 'left';
                      [[HA * 0.22, 'rgba(147,197,253,0.55)', 'Columbia ~110 km'], [HA * 0.3, 'rgba(251,191,36,0.55)', 'Eagle 17-83 km']].forEach(function(o) {
                        ctx.strokeStyle = o[1];
                        ctx.beginPath(); ctx.moveTo(W * 0.3, o[0] + 3); ctx.quadraticCurveTo(W * 0.62, o[0] - 5, W * 0.96, o[0] + 3); ctx.stroke();
                        ctx.fillStyle = o[1]; ctx.fillText(o[2], W * 0.3, o[0] - 4);
                      });
                      ctx.restore();
                    }
                    // Trajectory trail (dashed arc from descent stage to ascent stage)
                    if (launching || rendezvous) {
                      ctx.save();
                      ctx.strokeStyle = 'rgba(56,189,248,0.3)';
                      ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
                      ctx.beginPath();
                      ctx.moveTo(descentX, padY);
                      ctx.quadraticCurveTo(descentX + 50, descentY - 60, ascentX, ascentY);
                      ctx.stroke();
                      ctx.setLineDash([]);
                      ctx.restore();
                    }
                    // Dust plume at liftoff
                    if (tick >= 85 && tick < 220) {
                      ctx.save();
                      var dustF = tick - 85;
                      for (var pi = 0; pi < 18; pi++) {
                        var pAlpha = Math.max(0, 0.55 - dustF * 0.004 - pi * 0.015);
                        ctx.globalAlpha = pAlpha;
                        ctx.fillStyle = pi < 9 ? '#e0d8c8' : '#b8b0a0';
                        var ppx = descentX + (Math.sin(pi * 1.7) * 35) + (Math.random() - 0.5) * 8;
                        var ppy = descentY + 10 + (Math.random() - 0.5) * 6;
                        var ppr = 3 + dustF * 0.1 + Math.random() * 2;
                        ctx.beginPath(); ctx.arc(ppx, ppy, ppr, 0, Math.PI * 2); ctx.fill();
                      }
                      ctx.restore();
                    }
                    // Shreds of gold foil thrown off at liftoff, as in the Apollo 17 film.
                    if (tick >= 90 && tick < 150) {
                      var fr = _seededRand(17), fT = tick - 90;
                      for (var fi = 0; fi < 24; fi++) {
                        var fvx = (fr.next() - 0.5) * 3, fvy = 0.6 + fr.next() * 2.2;
                        var fpx = descentX + fvx * fT, fpy = descentY - 4 - fvy * fT + 0.016 * fT * fT;   // one-sixth g
                        if (fpy > horizonY + 12) continue;
                        ctx.globalAlpha = Math.max(0, 1 - fT / 60) * (0.5 + 0.5 * Math.abs(Math.sin(tick * 0.4 + fi)));
                        ctx.fillStyle = fi % 3 ? '#fcd34d' : '#fef3c7';
                        ctx.fillRect(fpx, fpy, 1.6, 1.1);
                      }
                      ctx.globalAlpha = 1;
                    }
                    // Draw CSM (Columbia)
                    ctx.save();
                    ctx.translate(csmX, csmY);
                    // Engine bell (rear)
                    ctx.fillStyle = '#888';
                    ctx.beginPath(); ctx.moveTo(-20, -2.5); ctx.lineTo(-24, -4.5); ctx.lineTo(-24, 4.5); ctx.lineTo(-20, 2.5); ctx.closePath(); ctx.fill();
                    // Service module
                    ctx.fillStyle = '#c0c8d0';
                    ctx.fillRect(-20, -3.5, 22, 7);
                    // Command module cone
                    ctx.fillStyle = '#e8ecf0';
                    ctx.beginPath();
                    ctx.moveTo(7, 0); ctx.lineTo(2, -3.5); ctx.lineTo(-3, -3.5); ctx.lineTo(-3, 3.5); ctx.lineTo(2, 3.5); ctx.closePath(); ctx.fill();
                    // Docking port
                    ctx.fillStyle = '#555';
                    ctx.fillRect(7, -1.5, 2, 3);
                    // Window
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(0, -1.2, 2, 2.4);
                    // RCS thruster quad
                    ctx.fillStyle = '#999';
                    ctx.fillRect(-10, -5, 3, 1.5); ctx.fillRect(-10, 3.5, 3, 1.5);
                    ctx.restore();
                    // CSM label
                    ctx.fillStyle = 'rgba(148,163,184,0.75)';
                    ctx.font = '8px system-ui'; ctx.textAlign = 'center';
                    ctx.fillText('CSM "Columbia"', csmX, csmY - 12);
                    // Draw ascent stage ("Eagle")
                    ctx.save();
                    ctx.translate(ascentX, ascentY); ctx.scale(lmK, lmK);
                    ctx.rotate(ascentAng);
                    // Octagonal ascent body (gold foil) — an actual octagon path now,
                    // with a lit/shadow foil split (the comment used to promise an
                    // octagon while drawing a plain rectangle)
                    ctx.beginPath();
                    ctx.moveTo(-5, -1.5); ctx.lineTo(-3.2, -4); ctx.lineTo(3.2, -4); ctx.lineTo(5, -1.5);
                    ctx.lineTo(5, 1.5); ctx.lineTo(3.2, 4); ctx.lineTo(-3.2, 4); ctx.lineTo(-5, 1.5);
                    ctx.closePath();
                    ctx.fillStyle = '#c9a444';
                    ctx.fill();
                    ctx.fillStyle = 'rgba(90,62,20,0.35)';           // shadowed foil facet
                    ctx.beginPath();
                    ctx.moveTo(5, 1.5); ctx.lineTo(3.2, 4); ctx.lineTo(-3.2, 4); ctx.lineTo(-5, 1.5);
                    ctx.closePath(); ctx.fill();
                    // Top white section (RCS + docking tunnel)
                    ctx.fillStyle = '#e8ecf0';
                    ctx.fillRect(-3, -6, 6, 2);
                    ctx.fillStyle = '#888';
                    ctx.fillRect(-1, -7, 2, 1);
                    // Window (front-facing)
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(-3.5, -2, 2, 2);
                    // Antenna
                    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.5;
                    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(2, -10); ctx.stroke();
                    // Engine flame (below)
                    if (launching || rendezvous) {
                      var flameLen = launching ? (7 + Math.random() * 5) : (2 + Math.random() * 1.5);
                      var flameW = launching ? 3 : 1.5;
                      var fg = ctx.createLinearGradient(0, 4, 0, 4 + flameLen);
                      // Hydrazine and nitrogen tetroxide burn almost clear in vacuum: a
                      // faint glow, not a rocket-poster flame.
                      fg.addColorStop(0, 'rgba(255,237,213,0.75)');
                      fg.addColorStop(0.5, 'rgba(253,186,116,0.28)');
                      fg.addColorStop(1, 'rgba(251,146,60,0)');
                      ctx.fillStyle = fg;
                      ctx.beginPath();
                      ctx.moveTo(-flameW, 4); ctx.lineTo(0, 4 + flameLen); ctx.lineTo(flameW, 4); ctx.closePath();
                      ctx.fill();
                    }
                    ctx.restore();
                    // Ascent label (only during launch/rendezvous, fades when docked)
                    if (!docked) {
                      ctx.fillStyle = 'rgba(251,191,36,0.75)';
                      ctx.font = '8px system-ui'; ctx.textAlign = 'center';
                      ctx.fillText('"Eagle" ascent', ascentX, prelaunch ? padY - 14 * lmK : ascentY + 14 * lmK);
                    }
                    // HUD left (altitude + phase)
                    ctx.fillStyle = 'rgba(0,0,0,0.62)';
                    ctx.fillRect(8, 8, 140, 74);
                    ctx.textAlign = 'left'; ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#fbbf24'; ctx.fillText('LM ASCENT STAGE', 14, 22);
                    ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#94a3b8';
                    ctx.fillText('ALTITUDE', 14, 36);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace';
                    var altKm = 0;
                    if (launching) altKm = ((tick - 90) / 360) * 83;          // into the low 17 x 83 km orbit
                    else if (rendezvous) altKm = 83 + 27 * Math.max(0, ((tick - 450) / 330 - 0.75) / 0.25);   // up to Columbia only at the end
                    else if (docked) altKm = 110;
                    ctx.fillText(altKm.toFixed(1) + ' km', 14, 50);
                    ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#94a3b8';
                    ctx.fillText('PHASE', 14, 64);
                    ctx.font = 'bold 10px monospace';
                    ctx.fillStyle = prelaunch ? '#fbbf24' : launching ? '#ef4444' : rendezvous ? '#38bdf8' : '#22c55e';
                    ctx.fillText(prelaunch ? 'PRE-LAUNCH' : launching ? 'ASCENT' : rendezvous ? 'RENDEZVOUS' : 'DOCKED', 14, 78);
                    // HUD right (distance to CSM; drops under the left panel below ~290px)
                    ctx.save();
                    if (W < 290) ctx.translate(0, 78);
                    ctx.fillStyle = 'rgba(0,0,0,0.62)';
                    ctx.fillRect(W - 128, 8, 120, 58);
                    ctx.textAlign = 'right'; ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#fbbf24'; ctx.fillText('DIST TO CSM', W - 14, 22);
                    // Measured to Columbia's docking port (where Eagle ends up), in a scale
                    // tied to the scene, not the screen: it read 35 km after "HARD DOCK",
                    // and a wider window showed a longer range.
                    var dx1 = (csmX - 14) - ascentX, dy1 = csmY - ascentY;
                    var pxDist = docked ? 0 : Math.sqrt(dx1 * dx1 + dy1 * dy1);
                    var distKm = (pxDist / W * 1250).toFixed(1);
                    ctx.font = 'bold 17px monospace';
                    ctx.fillStyle = pxDist < 10 ? '#22c55e' : pxDist < 60 ? '#fbbf24' : '#fff';
                    ctx.fillText(distKm + ' km', W - 14, 42);
                    ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#94a3b8';
                    ctx.fillText(docked ? 'HARD DOCK' : rendezvous ? 'closing...' : prelaunch ? 'aligned' : 'pursuing', W - 14, 56);
                    ctx.restore();
                    // Countdown during prelaunch
                    if (prelaunch) {
                      var secs = Math.max(1, Math.ceil((90 - tick) / 30));
                      ctx.textAlign = 'center'; ctx.font = 'bold 40px monospace';
                      ctx.globalAlpha = 0.75 + Math.sin(tick * 0.3) * 0.25;
                      ctx.fillStyle = '#fbbf24';
                      ctx.fillText('T-' + secs, W * 0.5, HA * 0.38);
                      ctx.globalAlpha = 1;
                      ctx.font = '10px system-ui'; ctx.fillStyle = '#94a3b8';
                      ctx.fillText('Ascent engine \u2014 single-start, cannot abort', W * 0.5, HA * 0.46);
                    }
                    // DOCKED confirmation
                    if (docked) {
                      var dPulse = 0.65 + Math.sin(tick * 0.15) * 0.3;
                      ctx.globalAlpha = dPulse;
                      ctx.textAlign = 'center'; ctx.font = 'bold 18px system-ui';
                      ctx.fillStyle = '#22c55e';
                      ctx.fillText('\u2705 HARD DOCK CONFIRMED', W * 0.5, HA * 0.52);
                      ctx.globalAlpha = 1;
                      ctx.font = '10px system-ui'; ctx.fillStyle = '#94a3b8';
                      ctx.fillText('Ready to jettison "Eagle" and head home', W * 0.5, HA * 0.58);
                    }
                    // Comms chatter
                    var msgs = prelaunch ? ['Houston: "Eagle, you are GO for ascent."'] :
                               launching ? ['Aldrin: "We\'re lifting off! Beautiful."', 'Houston: "Nominal ascent, Eagle."'] :
                               rendezvous ? ['Collins: "I have visual on Eagle."', 'Armstrong: "Closing to 100 feet."'] :
                                            ['Aldrin: "We are docked, Houston."', 'Houston: "Roger, Eagle. Great job."'];
                    var mIdx = Math.floor(tick / 180) % msgs.length;
                    var mFade = Math.min(1, (tick % 180) < 150 ? (tick % 180) / 25 : (180 - tick % 180) / 30);
                    ctx.globalAlpha = mFade * 0.85;
                    ctx.textAlign = 'center'; ctx.font = 'italic 10px system-ui';
                    ctx.fillStyle = '#a5b4fc';
                    ctx.fillText(msgs[mIdx], W * 0.5, HA - 10);
                    ctx.globalAlpha = 1;
                    drawVignette(ctx, W, HA, 0.25);
                    if (document.contains(cvEl)) requestAnimationFrame(drawAscent);
                  }
                  drawAscent();
                }
              })
            ),
            h('div', { className: 'p-4 text-white border-t border-slate-700' },
              h('div', { className: 'text-center mb-3' },
                h('div', { className: 'text-3xl' }, '\u2B06\uFE0F'),
                h('h4', { className: 'text-base font-bold' }, t('stem.moonmission.lunar_ascent_rendezvous', 'Lunar Ascent & Rendezvous')),
                h('p', { className: 'text-[0.6875rem] text-slate-400' }, t('stem.moonmission.ascent_stage_launches_from_moon_docks_', 'Ascent stage launches from Moon, docks with Columbia'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10 mb-3' },
                h('p', { className: 'text-[0.6875rem] text-slate-300 leading-relaxed' },
                  t('stem.moonmission.the_lm_s_ascent_engine_a_single_start_', 'The LM\'s ascent engine — a deliberately simple hypergolic motor with no backup engine — fires to launch you off the lunar surface. The descent stage serves as the launch pad and stays behind. You rendezvous and dock with Columbia, then jettison "Eagle", which Apollo 11 left in lunar orbit.')),
                h('div', { className: 'mt-2 bg-amber-500/10 rounded p-2 border border-amber-500/20' },
                  h('p', { className: 'text-[0.6875rem] text-amber-300' }, '\uD83E\uDEA8 Samples collected: ' + mmSampleTypeCount(d.lunarSamples) + ' / ' + LUNAR_SAMPLES_DATA.length),
                  (d.lunarSamples || []).map(function(s, i) {
                    return h('p', { key: i, className: 'text-[0.6875rem] text-slate-400 ml-2' }, s.icon + ' ' + s.name + ' (' + s.type + ')');
                  })
                )
              ),
              h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20' },
                h('p', { className: 'text-[0.6875rem] text-indigo-300' }, '\uD83D\uDCA1 ' + apolloFact())
              )
            )
          ),
          predictCard('rendezvous_catch', d.ascentStatus === 'docked',
            d.ascentStatus === 'docked' ? t('stem.moonmission.predict_rdv_observed', 'Eagle caught up from an orbit 17 to 83 km up; Columbia was at about 110 km.') : null),
          (function() {
            var as = d.ascentStatus || 'prelaunch';
            return phaseStatus(as === 'docked',
              as === 'prelaunch' ? 'Ascent engine armed. There is no backup engine; it was built as simply as possible so that it would light.'
                : as === 'ascent' ? 'Ascent burn — climbing off the descent stage, which stays behind as the launch pad.'
                : 'Closing on Columbia. Eagle flies the rendezvous while Collins stands ready to come down and fetch it. Watch the two heights.',
              'Hard dock confirmed. Eagle is secured to Columbia and the samples are aboard.');
          })(),
          h('button', {
            title: t('stem.moonmission.fire_trans_earth_injection_burn_to_beg', 'Fire trans-Earth injection burn to begin the two-and-a-half-day journey home'),
            disabled: eventPending,
                onClick: function() {
                  if (!canProceed()) return;
              advancePhase(8);
              log('\u2B06\uFE0F Docked with Columbia. LM jettisoned.');
              addXP(15);
              // Second quiz block on the way home. showQuiz was raised exactly once in the
              // whole mission (at TLI) and the handler closes the overlay after 5 answers,
              // so questions 6-10 were unreachable content and "answer 5 correctly" \u2014 both
              // a quest hook and the Space Scholar badge \u2014 demanded a flawless 5/5.
              if (quizIdx < QUIZ_BANK.length) upd('showQuiz', true);
              if (addToast) addToast('\uD83C\uDF0D TEI burn complete. Heading home.', 'success');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
          }, t('stem.moonmission.tei_burn_head_home', '\uD83D\uDE80 TEI Burn \u2014 Head Home'))
        ),

        // ═══ PHASE 8: TRANS-EARTH COAST ═══
        phase === 8 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            // The return coast was the ONLY mid-mission phase with no visual at all \u2014 a
            // plain text card wedged between the animated ascent and the re-entry canvas.
            // Mirror of the outbound transit, but carrying its own science: this leg
            // ACCELERATES (Earth's gravity is pulling you in, where the outbound climb
            // slowed the whole way), the CMP takes sextant star sightings to check the
            // trajectory, and the Service Module is cast off before entry.
            h('div', { className: 'relative', style: { height: '280px' } },
              h('canvas', {
                'data-teicoast-canvas': 'true',
                role: 'img',
                'aria-label': t('stem.moonmission.tei_canvas_alt', 'Animated trans-Earth coast. The Moon shrinks behind the spacecraft while Earth grows ahead, its night side and city lights toward the capsule, over the two-and-a-half-day return. A porthole inset shows the crew\'s view ahead: Earth growing, and thinning from half lit to a crescent and almost dark as the path swings round its night side. The Command Module Pilot takes a sextant star sighting, and the Service Module is cast off before entry. Near the end an inset draws the entry corridor and the flight path angle set with the slider below, showing whether the capsule would enter safely, skip off the atmosphere, or come in too steep. Shows distance to Earth, closing speed and coast time.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._teiInit) return;
                  cvEl._teiInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, HT = cvEl.offsetHeight || 280;
                  cvEl.width = W * 2; cvEl.height = HT * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== HT)) { W = nw; HT = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  var teiClock = { last: null, acc: 0 };
                  function drawTEI(ts) {
                    if (_mmAnimPaused && tick > 0) { teiClock.last = null; if (document.contains(cvEl)) requestAnimationFrame(drawTEI); return; }
                    tick += mmFrameSteps(teiClock, ts);
                    ctx.clearRect(0, 0, W, HT);
                    ctx.fillStyle = '#010108'; ctx.fillRect(0, 0, W, HT);
                    drawStarfield(ctx, W, HT, tick, 150);
                    var progress = Math.min(0.97, tick * 0.0005);
                    // Moon receding behind (left), Earth swelling ahead (right)
                    var moonR = Math.max(6, 34 * (1 - progress * 0.82));
                    var moonX = 52 - progress * 18;
                    drawDetailedMoon(ctx, moonX, HT * 0.5, moonR, 42);
                    ctx.fillStyle = 'rgba(1,1,8,0.86)';                 // the same Sun as Earth's, from the right
                    mmPhaseShade(ctx, moonX, HT * 0.5, moonR * 1.02, 0.5, 0);
                    var earthR = 10 + progress * progress * 52;   // grows fastest at the end: you are falling in
                    var earthX = W - earthR - 16 + (1 - progress) * 14;   // whole disc in frame (it ran off the edge)
                    // Sunlight from the far side: Apollo 11 met the atmosphere on the night
                    // side and splashed down before dawn over the Pacific.
                    drawDetailedEarth(ctx, earthX, HT * 0.5, earthR, tick, 0);
                    // Same arc treatment as the outbound leg — a coast is not a straight
                    // horizontal slide, and the trail follows the path actually flown.
                    function teiPos(p) {
                      return {
                        x: moonX + moonR + 18 + (earthX - earthR - moonX - moonR - 40) * p,
                        y: HT * 0.5 - Math.sin(p * Math.PI) * (HT * 0.17)
                      };
                    }
                    var teiPt = teiPos(progress);
                    var scX = teiPt.x;
                    var scY = teiPt.y + Math.sin(tick * 0.008) * 4;
                    var jettisoned = progress > 0.82;   // SM separation shortly before entry interface
                    // Fading dashed trail back toward the Moon, sampled along the same arc
                    ctx.save();
                    ctx.strokeStyle = 'rgba(148,163,184,0.14)';
                    ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
                    ctx.beginPath();
                    for (var tq = 0; tq <= 40; tq++) {
                      var pq = (progress * tq) / 40;
                      var qq = teiPos(pq);
                      if (tq === 0) ctx.moveTo(qq.x, qq.y); else ctx.lineTo(qq.x, qq.y);
                    }
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                    // Jettisoned Service Module tumbling away behind the capsule
                    if (jettisoned) {
                      var jF = (progress - 0.82) / 0.15;
                      ctx.save();
                      ctx.globalAlpha = Math.max(0, 0.85 - jF * 0.6);
                      ctx.translate(scX - 22 - jF * 60, scY + jF * 16);
                      ctx.rotate(tick * 0.02);
                      ctx.fillStyle = '#9aa3ad'; ctx.fillRect(-7, -2.5, 14, 5);
                      ctx.fillStyle = '#6b7280';
                      ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(-11, -3.5); ctx.lineTo(-11, 3.5); ctx.lineTo(-7, 2); ctx.closePath(); ctx.fill();
                      ctx.restore();
                      ctx.globalAlpha = 1;
                    }
                    // CSM, or the bare Command Module once the SM is gone
                    ctx.save();
                    ctx.translate(scX, scY);
                    if (!jettisoned) {
                      ctx.fillStyle = 'rgba(56,189,248,0.28)';
                      ctx.beginPath(); ctx.arc(-6, 0, 6, 0, Math.PI * 2); ctx.fill();
                      ctx.fillStyle = '#c0c8d0'; ctx.fillRect(-9, -2.5, 11, 5);
                      ctx.fillStyle = 'rgba(100,180,255,0.5)';
                      ctx.beginPath(); ctx.arc(-11, 0, 1.5, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.fillStyle = '#e8ecf0';
                    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(2, -3); ctx.lineTo(-2, -3.5); ctx.lineTo(-2, 3.5); ctx.lineTo(2, 3); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = '#38bdf8'; ctx.fillRect(0, -1, 2, 2);
                    ctx.restore();
                    // Sextant star sighting \u2014 a navigation reticle locks onto a star mid-coast
                    if (progress > 0.3 && progress < 0.46) {
                      var starX = W * 0.42, starY = HT * 0.24;
                      ctx.save();
                      ctx.strokeStyle = 'rgba(251,191,36,0.8)'; ctx.lineWidth = 1;
                      ctx.beginPath(); ctx.arc(starX, starY, 11, 0, Math.PI * 2); ctx.stroke();
                      ctx.beginPath();
                      ctx.moveTo(starX - 16, starY); ctx.lineTo(starX - 4, starY);
                      ctx.moveTo(starX + 4, starY); ctx.lineTo(starX + 16, starY);
                      ctx.moveTo(starX, starY - 16); ctx.lineTo(starX, starY - 4);
                      ctx.moveTo(starX, starY + 4); ctx.lineTo(starX, starY + 16);
                      ctx.stroke();
                      ctx.fillStyle = '#fff';
                      ctx.beginPath(); ctx.arc(starX, starY, 1.6, 0, Math.PI * 2); ctx.fill();
                      ctx.fillStyle = 'rgba(251,191,36,0.9)'; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
                      ctx.fillText('SEXTANT MARK \u2014 star sighting', starX, starY + 26);
                      ctx.restore();
                    }
                    // HUD \u2014 everything in the panel. The distance and the configuration
                    // line used to be centred ON the spacecraft and ran through the hull.
                    var _rc = mmReturnCoast(progress);
                    var distToEarth = Math.round(_rc.distKm);
                    ctx.fillStyle = 'rgba(0,0,0,0.55)';
                    ctx.fillRect(8, 8, 158, 92);
                    ctx.textAlign = 'left'; ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#38bdf8'; ctx.fillText('CLOSING SPEED', 14, 22);
                    var closing = Math.round(_rc.speedKmh / 10) * 10;
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace';
                    ctx.fillText(closing.toLocaleString() + ' km/h', 14, 36);
                    ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#38bdf8';
                    ctx.fillText('TO EARTH', 14, 50);
                    ctx.fillStyle = '#fff'; ctx.font = '11px monospace';
                    ctx.fillText(distToEarth.toLocaleString() + ' km', 14, 64);
                    ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#38bdf8';
                    ctx.fillText('COAST ELAPSED', 14, 78);
                    ctx.fillStyle = '#fff'; ctx.font = '11px monospace';
                    ctx.fillText(_rc.days.toFixed(1) + ' of ~' + _rc.totalDays.toFixed(1) + ' days', 14, 92);
                    // Configuration, kept clear of the hull.
                    ctx.textAlign = 'center'; ctx.font = '9px monospace';
                    ctx.fillStyle = jettisoned ? '#fbbf24' : '#94a3b8';
                    ctx.fillText(jettisoned ? 'CM only \u2014 SM jettisoned' : 'CSM \u2014 homeward coast', scX, scY + 24);
                    // Entry corridor, drawn from the slider below as the coast closes in.
                    // Schematic, with the angles exaggerated four times so a two-degree
                    // corridor can be seen at all.
                    var corrA = Math.min(1, Math.max(0, (progress - 0.55) / 0.12));
                    if (corrA > 0) {
                      var ciW = Math.min(200, W * 0.42), ciH = 92, ciX = 8, ciY = HT - ciH - 24;
                      var entryMag = Math.abs(_mmEntryAngle);
                      var entryState = entryMag < 5.3 ? 'skip' : entryMag > 7.4 ? 'steep' : 'ok';
                      ctx.save();
                      ctx.globalAlpha = corrA;
                      ctx.fillStyle = 'rgba(2,6,23,0.8)'; ctx.fillRect(ciX, ciY, ciW, ciH);
                      ctx.strokeStyle = 'rgba(56,189,248,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(ciX + 0.5, ciY + 0.5, ciW - 1, ciH - 1);
                      ctx.beginPath(); ctx.rect(ciX, ciY, ciW, ciH); ctx.clip();
                      // Atmosphere and ground, a gentle curve across the bottom.
                      var gR = ciW * 3, gCx = ciX + ciW * 0.5, gCy = ciY + ciH + gR - 16;
                      ctx.fillStyle = 'rgba(56,189,248,0.22)';
                      ctx.beginPath(); ctx.arc(gCx, gCy, gR + 12, 0, Math.PI * 2); ctx.fill();
                      ctx.fillStyle = '#1e3a5f';
                      ctx.beginPath(); ctx.arc(gCx, gCy, gR, 0, Math.PI * 2); ctx.fill();
                      var eX = ciX + ciW * 0.72, eY = gCy - Math.sqrt((gR + 12) * (gR + 12) - (eX - gCx) * (eX - gCx));
                      var len = ciW * 0.62, k4 = 4 * Math.PI / 180;
                      var ray = function(deg, l) { return [eX - l * Math.cos(deg * k4), eY - l * Math.sin(deg * k4)]; };
                      // The safe wedge, 5.3 to 7.4 degrees.
                      var w1 = ray(5.3, len), w2 = ray(7.4, len);
                      ctx.fillStyle = 'rgba(16,185,129,0.28)';
                      ctx.beginPath(); ctx.moveTo(eX, eY); ctx.lineTo(w1[0], w1[1]); ctx.lineTo(w2[0], w2[1]); ctx.closePath(); ctx.fill();
                      // The student's approach, and what happens next.
                      var col = entryState === 'ok' ? '#34d399' : entryState === 'skip' ? '#fbbf24' : '#f87171';
                      var st = ray(entryMag, len);
                      ctx.strokeStyle = col; ctx.lineWidth = 2;
                      ctx.beginPath(); ctx.moveTo(st[0], st[1]); ctx.lineTo(eX, eY); ctx.stroke();
                      ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(eX, eY);
                      if (entryState === 'skip') ctx.lineTo(eX + ciW * 0.22, eY - ciH * 0.3);          // bounced back out
                      else if (entryState === 'steep') ctx.lineTo(eX + ciW * 0.1, eY + ciH * 0.3);     // straight down, hard
                      else ctx.quadraticCurveTo(eX + ciW * 0.12, eY + 7, eX + ciW * 0.26, eY + 9);     // settles into the air
                      ctx.stroke(); ctx.setLineDash([]);
                      var cf = (tick % 150) / 150, cp = ray(entryMag, len * (1 - cf));
                      ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(cp[0], cp[1], 2.2, 0, Math.PI * 2); ctx.fill();
                      ctx.textAlign = 'left'; ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#38bdf8';
                      ctx.fillText('ENTRY CORRIDOR', ciX + 6, ciY + 12);
                      ctx.font = '8px system-ui'; ctx.fillStyle = '#94a3b8';
                      ctx.fillText('angles drawn x4', ciX + 6, ciY + 23);
                      ctx.textAlign = 'right'; ctx.font = 'bold 9px system-ui'; ctx.fillStyle = col;
                      ctx.fillText(_mmEntryAngle.toFixed(1) + '\u00B0 ' + (entryState === 'ok' ? 'in the corridor' : entryState === 'skip' ? 'skips out' : 'too steep'), ciX + ciW - 6, ciY + 12);
                      ctx.restore();
                    }
                    // Lesson captions (same cadence as the LEO panel)
                    var teiLessons = [
                      'Outbound you slowed the whole way up. Homebound you speed up.',
                      'Earth pulls you in \u2014 the same gravity you fought at launch.',
                      'The CMP sights known stars through a sextant to check the trajectory.',
                      'One small mid-course correction is usually all the return needs.',
                      'The Service Module is cast off before entry \u2014 only the CM has a heat shield.'
                    ];
                    var tIdx = Math.floor(tick / 260) % teiLessons.length;
                    var tFade = Math.min(1, (tick % 260) < 210 ? (tick % 260) / 25 : (260 - tick % 260) / 50);
                    if (tick > 90) {
                      ctx.globalAlpha = tFade * 0.85;
                      ctx.textAlign = 'center'; ctx.font = 'italic 10px system-ui';
                      ctx.fillStyle = '#a5b4fc';
                      ctx.fillText(teiLessons[tIdx], W * 0.5, HT - 10);
                      ctx.globalAlpha = 1;
                    }
                    drawVignette(ctx, W, HT, 0.25);
                    // The crew's view ahead through a window (mmReturnView): Earth growing,
                    // and thinning from half lit to a crescent as the path swings round
                    // through its night side. A 16 degree field, so it ends filling the glass.
                    var crew = mmReturnView(_rc.distKm);
                    var pwR = Math.min(30, W * 0.07), pwX = W - pwR - 14, pwY = pwR + 14;
                    var pwEarth = Math.min(pwR * 3, pwR * Math.tan(crew.angRadiusDeg * MM_DEG) / Math.tan(8 * MM_DEG));
                    ctx.save();
                    ctx.beginPath(); ctx.arc(pwX, pwY, pwR, 0, Math.PI * 2); ctx.clip();
                    ctx.fillStyle = '#01030a'; ctx.fillRect(pwX - pwR, pwY - pwR, pwR * 2, pwR * 2);
                    drawDetailedEarth(ctx, pwX, pwY, Math.max(3, pwEarth), tick, 0, crew.lit);
                    ctx.restore();
                    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3.5;
                    ctx.beginPath(); ctx.arc(pwX, pwY, pwR + 1.5, 0, Math.PI * 2); ctx.stroke();
                    ctx.strokeStyle = 'rgba(15,23,42,0.9)'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.arc(pwX, pwY, pwR + 3.5, 0, Math.PI * 2); ctx.stroke();
                    ctx.textAlign = 'right'; ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#94a3b8';
                    ctx.fillText('CREW\'S VIEW AHEAD', pwX - pwR - 8, pwY - 4);
                    ctx.font = '9px system-ui'; ctx.fillStyle = '#e2e8f0';
                    ctx.fillText('Earth ' + Math.round(crew.lit * 100) + '% lit', pwX - pwR - 8, pwY + 9);
                    if (document.contains(cvEl)) requestAnimationFrame(drawTEI);
                  }
                  drawTEI();
                }
              })
            ),
            h('div', { className: 'p-4 text-white border-t border-slate-700' },
            h('div', { className: 'text-center mb-3' },
              h('div', { className: 'text-3xl' }, '\uD83C\uDF0D'),
              h('h4', { className: 'text-base font-bold' }, t('stem.moonmission.trans_earth_coast_2', 'Trans-Earth Coast')),
              h('p', { className: 'text-[0.6875rem] text-slate-400' }, t('stem.moonmission.returning_home_384_400_km_3_days', 'Returning home \u2022 384,400 km \u2022 ~2.5 days'))
            ),
            h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10 mb-3' },
              h('p', { className: 'text-[0.6875rem] text-slate-300 leading-relaxed' },
                t('stem.moonmission.the_service_module_engine_fires_for_th', 'The Service Module engine fires for the Trans-Earth Injection burn. You coast for about two and a half days back to Earth, jettison the Service Module, and prepare the Command Module for re-entry \u2014 the most dangerous phase of the mission.'))
            ),
            h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20' },
              h('p', { className: 'text-[0.6875rem] text-indigo-300' }, '\uD83D\uDCA1 ' + apolloFact())
            )
            )
          ),
          // \u2500\u2500 Entry corridor \u2500\u2500
          // Re-entry was pure spectacle: an animation and a button. It is also the single
          // most unforgiving number in the mission. Come in too shallow and the atmosphere
          // bounces you back into space; too steep and the deceleration and heating climb
          // fast. Apollo's corridor was about two degrees wide after a quarter of a
          // million miles, which is the fact worth feeling rather than reading.
          (function() {
            var ang = (typeof d.entryAngle === 'number' && isFinite(d.entryAngle)) ? d.entryAngle : -6.5;
            var mag = Math.abs(ang);
            var tooShallow = mag < 5.3, tooSteep = mag > 7.4;
            var inCorridor = !tooShallow && !tooSteep;
            var pct = Math.max(0, Math.min(100, ((mag - 4) / 5) * 100));
            var peakG = mmEntryPeakG(mag);
            return h('div', { className: 'bg-slate-900 rounded-xl p-3 border border-slate-700 mb-2' },
              h('p', { className: 'text-[0.6875rem] font-bold text-sky-300 mb-1' }, t('stem.moonmission.entry_corridor', '\uD83C\uDFAF SET THE ENTRY CORRIDOR')),
              h('p', { className: 'text-[0.6875rem] text-slate-300 mb-2 leading-relaxed' },
                t('stem.moonmission.entry_corridor_help', 'The flight path angle is how steeply you meet the atmosphere. The safe corridor is about two degrees wide, and you have been aiming at it since you left the Moon.')),
              // Corridor bar: the safe band sits between 5.3\u00B0 and 7.4\u00B0 of the 4-9\u00B0 range.
              h('div', { className: 'relative h-6 rounded-full bg-slate-800 overflow-hidden mb-1' },
                h('div', { className: 'absolute inset-y-0 bg-emerald-500/30 border-x border-emerald-400/50',
                  style: { left: (((5.3 - 4) / 5) * 100) + '%', width: (((7.4 - 5.3) / 5) * 100) + '%' } }),
                h('div', { className: 'absolute top-0 bottom-0 w-0.5 bg-white',
                  style: { left: pct + '%', boxShadow: '0 0 6px rgba(255,255,255,0.8)' } })
              ),
              h('div', { className: 'flex justify-between text-[0.6875rem] text-slate-300 mb-2' },
                h('span', null, t('stem.moonmission.skip_out', '4\u00B0 skip out')),
                h('span', { className: 'text-emerald-400 font-bold' }, t('stem.moonmission.corridor', 'corridor')),
                h('span', null, t('stem.moonmission.too_steep', '9\u00B0 too steep'))
              ),
              h('label', { className: 'block text-[0.6875rem] font-bold text-slate-300 mb-1', htmlFor: 'mm-entry-angle' },
                t('stem.moonmission.flight_path_angle', 'Flight path angle: ') + ang.toFixed(1) + '\u00B0'),
              h('input', {
                id: 'mm-entry-angle', type: 'range', min: -9, max: -4, step: 0.1, value: ang,
                'aria-label': t('stem.moonmission.entry_flight_path_angle', 'Entry flight path angle in degrees'),
                'aria-valuetext': ang.toFixed(1) + ' degrees, ' + (tooShallow ? 'too shallow, you will skip off the atmosphere' : tooSteep ? 'too steep, severe deceleration' : 'inside the safe corridor'),
                onChange: function(e) { upd('entryAngle', parseFloat(e.target.value)); },
                className: 'w-full h-11 cursor-pointer accent-emerald-500'   // was 16px tall
              }),
              h('div', {
                role: 'status', 'aria-live': 'polite',
                className: 'mt-2 rounded-lg px-3 py-2 text-[0.6875rem] font-bold border ' +
                  (inCorridor ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-amber-500/10 border-amber-500/40 text-amber-300')
              },
                tooShallow
                  ? '\u26A0\uFE0F Too shallow. You will graze the atmosphere and bounce back out \u2014 a skip-out, and the next pass takes hours you do not have.'
                  : tooSteep
                    ? ('\u26A0\uFE0F Too steep. Peak deceleration about ' + peakG + ' g, and the heat shield gets a harder ride than it was built for.')
                    : ('\u2705 In the corridor. Peak deceleration about ' + peakG + ' g \u2014 Apollo 11 pulled roughly 6.5.')
              )
            );
          })(),
          h('button', {
            title: t('stem.moonmission.begin_atmospheric_re_entry_sequence_at', 'Begin atmospheric re-entry sequence at about 39,700 kilometers per hour'),
            disabled: eventPending,
                onClick: function() {
                  if (!canProceed()) return;
              var ang2 = (typeof d.entryAngle === 'number' && isFinite(d.entryAngle)) ? d.entryAngle : -6.5;
              var mag2 = Math.abs(ang2);
              var outcome = mag2 < 5.3 ? 'skip' : mag2 > 7.4 ? 'steep' : 'nominal';
              upd('entryOutcome', { outcome: outcome, angle: ang2, peakG: mmEntryPeakG(mag2) });
              advancePhase(9);
              log(outcome === 'nominal'
                ? '\uD83C\uDF0D Entry interface at ' + ang2.toFixed(1) + '\u00B0 \u2014 inside the corridor.'
                : outcome === 'skip'
                  ? '\uD83C\uDF0D Entry at ' + ang2.toFixed(1) + '\u00B0 \u2014 too shallow, the capsule skipped before catching.'
                  : '\uD83C\uDF0D Entry at ' + ang2.toFixed(1) + '\u00B0 \u2014 steep, and the crew wore it.');
              addXP(outcome === 'nominal' ? 25 : 10);
              if (typeof announceToSR === 'function') {
                announceToSR(outcome === 'nominal'
                  ? 'Entry interface at ' + ang2.toFixed(1) + ' degrees, inside the corridor.'
                  : outcome === 'skip'
                    ? 'Entry angle too shallow at ' + ang2.toFixed(1) + ' degrees. The capsule skipped off the atmosphere before it caught.'
                    : 'Steep entry at ' + ang2.toFixed(1) + ' degrees. Peak deceleration will be high.');
              }
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
          }, t('stem.moonmission.begin_re_entry_sequence', '\uD83C\uDF0A Begin Re-entry Sequence'))
        ),

        // ═══ PHASE 9: RE-ENTRY & SPLASHDOWN (Animated Canvas) ═══
        phase === 9 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-orange-950 to-slate-900 rounded-xl overflow-hidden border border-orange-900/50' },
            h('div', { className: 'relative', style: { height: '320px' } },
              h('canvas', { 
                role: 'img',
                'aria-label': t('stem.moonmission.reentry_canvas_alt', 'Animated re-entry and recovery. In pre-dawn darkness over the Pacific, the Command Module meets the atmosphere heat shield first at about 39,700 km/h, trailing a glowing wake. The shield heats to 2,760 degrees and cools again, and radio contact is lost in the plasma. Its path bends from the entry angle to straight down as it slows, then it descends under drogue and main parachutes and splashes down just before sunrise. It flips nose-down, is righted by its orange uprighting bags, and a recovery helicopter arrives while swimmers fit a flotation collar.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._reentryInit) return;
                  cvEl._reentryInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, HR = cvEl.offsetHeight || 320;
                  cvEl.width = W * 2; cvEl.height = HR * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== HR)) { W = nw; HR = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  var reentryPhase = 0; // 0=heat, 1=blackout, 2=drogue, 3=main chutes, 4=splash
                  var _lastReentryPhase = -1;   // throttle the readiness publish
                  // Corridor the student set back on the coast, captured at mount.
                  var _entryRes = d.entryOutcome || {};
                  var _entryOutcome = _entryRes.outcome || 'nominal';
                  var _entryAngle = _entryRes.angle != null ? _entryRes.angle : -6.5;
                  var _entryPeakG = _entryRes.peakG != null ? _entryRes.peakG : 6.9;
                  var reClock = { last: null, acc: 0 };
                  // Night over the Pacific: Apollo 11 hit the air in darkness and came down
                  // just before dawn. Stars above; below, the night ocean with the first light
                  // of day on the horizon ahead (left, the way the capsule flies), and the
                  // green airglow layer on the limb while it is still above it. The horizon
                  // rises toward eye level as the capsule descends (dip = acos(R / (R + h))),
                  // and by the drogues the sky has become the dawn the chutes open into.
                  function drawEntrySky(e) {
                    var k = Math.min(1, Math.max(0, 1 - (e.h - 7.3) / 114.7));
                    var mixA = function (a, b, t) { return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')'; };
                    var hz = HR * 0.72 + HR * 0.87 * Math.acos(6371 / (6371 + Math.max(0, e.h)));
                    var sky = ctx.createLinearGradient(0, 0, 0, hz);
                    sky.addColorStop(0, mixA([1, 2, 10], [12, 18, 48], k));
                    sky.addColorStop(0.62, mixA([4, 6, 22], [58, 52, 110], k));
                    sky.addColorStop(1, mixA([34, 42, 92], [214, 118, 84], k * k));
                    ctx.fillStyle = sky; ctx.fillRect(-10, -10, W + 20, HR + 20);
                    ctx.save(); ctx.globalAlpha = 0.8 * (1 - k); drawStarfield(ctx, W, HR, tick, 80); ctx.restore();
                    var Rs = W * (1.8 + 40 * k * k * k), ecy = hz + Rs;
                    if (e.h > 95) {                                  // airglow, about 100 km up
                      ctx.strokeStyle = 'rgba(134,239,172,' + (0.4 * Math.min(1, (e.h - 95) / 20)) + ')'; ctx.lineWidth = 1.5;
                      ctx.beginPath(); ctx.arc(W * 0.5, ecy, Rs + 4, 0, Math.PI * 2); ctx.stroke();
                    }
                    var sea = ctx.createLinearGradient(0, hz, 0, HR);
                    sea.addColorStop(0, mixA([30, 36, 64], [120, 84, 92], k)); sea.addColorStop(0.15, mixA([12, 20, 38], [30, 45, 96], k)); sea.addColorStop(1, mixA([4, 7, 15], [15, 23, 42], k));
                    ctx.fillStyle = sea; ctx.beginPath(); ctx.arc(W * 0.5, ecy, Rs, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(148,163,184,' + (0.06 + 0.08 * k) + ')';   // cloud tops in the dark
                    for (var nc = 0; nc < 10; nc++) {
                      var nv = (nc * 0.382 + 0.2) % 1, ny = hz + (HR - hz) * (0.08 + 0.9 * nv * nv), nn = (ny - hz) / (HR - hz + 1);
                      var nu = ((nc * 0.618 + tick * (0.0006 + 0.004 * nn)) % 1);   // sliding back, away from the flight direction
                      ctx.beginPath(); ctx.ellipse(W * (nu * 1.3 - 0.15), ny, 10 + 60 * nn, 1.5 + 9 * nn, 0, 0, Math.PI * 2); ctx.fill();
                    }
                    var dawnG = ctx.createRadialGradient(W * 0.08, hz, 0, W * 0.08, hz, W * 0.65);
                    dawnG.addColorStop(0, 'rgba(251,146,60,' + (0.1 + 0.3 * k) + ')'); dawnG.addColorStop(1, 'rgba(251,146,60,0)');
                    ctx.fillStyle = dawnG; ctx.fillRect(-10, -10, W + 20, HR + 20);
                  }
                  // In the capsule's own frame (shield at +y, apex at -y), so the plasma follows
                  // its attitude. The wake: air the shield has heated, streaming back past the
                  // shoulders, with bits of the charring shield carried off as sparks.
                  function drawEntryWake(e) {
                    var q = e.heat;
                    if (q < 0.02) return;
                    var L = 70 + 90 * q;
                    var wg = ctx.createLinearGradient(0, 8, 0, -L);
                    wg.addColorStop(0, 'rgba(255,170,90,' + (0.75 * q) + ')');
                    wg.addColorStop(0.35, 'rgba(244,114,182,' + (0.35 * q) + ')');
                    wg.addColorStop(1, 'rgba(167,139,250,0)');
                    ctx.fillStyle = wg;
                    ctx.beginPath(); ctx.moveTo(-13, 9);
                    ctx.bezierCurveTo(-20, -L * 0.25, -9, -L * 0.7, 0, -L);
                    ctx.bezierCurveTo(9, -L * 0.7, 20, -L * 0.25, 13, 9); ctx.closePath(); ctx.fill();
                    for (var ab = 0; ab < 14; ab++) {
                      var af = (tick * (0.021 + (ab % 5) * 0.004) + ab * 0.137) % 1;   // 0 at the rim, 1 far back
                      var ax = (ab % 2 ? 1 : -1) * (11 + 5 * af + Math.sin(ab * 3.1 + tick * 0.2) * 2 * af);
                      ctx.fillStyle = 'rgba(255,' + (220 - ab * 8) + ',120,' + (q * (1 - af)) + ')';
                      ctx.beginPath(); ctx.arc(ax * (1 - 0.6 * af), 9 - af * L * 0.8, 0.6 + (1 - af) * 0.9, 0, Math.PI * 2); ctx.fill();
                    }
                  }
                  // The fireball, and the shock layer standing just off the shield: air
                  // squeezed so hard it glows white, hotter than the surface of the Sun.
                  function drawEntryShock(e) {
                    var q = e.heat;
                    if (q < 0.02) return;
                    var flick = 0.92 + 0.08 * Math.sin(tick * 0.9) * Math.sin(tick * 0.37);
                    var gr = 26 + 20 * q;
                    var glow = ctx.createRadialGradient(0, 14, 0, 0, 14, gr);
                    glow.addColorStop(0, 'rgba(255,237,213,' + (0.55 * q * flick) + ')');
                    glow.addColorStop(0.5, 'rgba(251,146,60,' + (0.25 * q) + ')');
                    glow.addColorStop(1, 'rgba(236,72,153,0)');
                    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 14, gr, 0, Math.PI * 2); ctx.fill();
                    var sd = 4 + 3 * q;
                    var shockG = ctx.createLinearGradient(0, 10, 0, 10 + sd + 4);
                    shockG.addColorStop(0, 'rgba(255,255,255,' + (0.95 * q) + ')');
                    shockG.addColorStop(0.6, 'rgba(254,215,170,' + (0.8 * q) + ')');
                    shockG.addColorStop(1, 'rgba(251,146,60,0)');
                    ctx.fillStyle = shockG;
                    ctx.beginPath(); ctx.moveTo(-14, 9);
                    ctx.quadraticCurveTo(0, 10 + sd * 2.4, 14, 9);
                    ctx.quadraticCurveTo(0, 12.5, -14, 9); ctx.fill();
                  }
                  function drawReentry(ts) {
                    if (_mmAnimPaused && tick > 0) { reClock.last = null; if (document.contains(cvEl)) requestAnimationFrame(drawReentry); return; }
                    for (var reN = mmFrameSteps(reClock, ts); reN > 0; reN--) {
                      tick++;
                      // Phase progression
                      if (tick > 180 && reentryPhase === 0) reentryPhase = 1; // blackout
                      if (tick > 360 && reentryPhase === 1) reentryPhase = 2; // drogue
                      if (tick > 480 && reentryPhase === 2) reentryPhase = 3; // main chutes
                      if (tick > 600 && reentryPhase === 3) reentryPhase = 4; // splash
                    }
                    ctx.clearRect(0, 0, W, HR);
                    if (reentryPhase !== _lastReentryPhase) { _lastReentryPhase = reentryPhase; upd('reentryStatus', reentryPhase); }
                    var entryNow = reentryPhase <= 1 ? mmEntryState(tick, _entryOutcome, _entryAngle) : null;
                    var capsuleY = HR * (0.35 - 0.05 * Math.min(1, Math.max(0, (tick - 300) / 60)));
                    // After splashdown the camera eases in on the capsule, or the recovery
                    // plays out at a 24px capsule on a 1,000px-wide canvas.
                    var reZoom = 1;
                    if (reentryPhase >= 4) { var zk = Math.min(1, Math.max(0, (tick - 600) / 150)); reZoom = 1 + 1.2 * zk * zk * (3 - 2 * zk); }
                    if (reZoom > 1) { ctx.save(); ctx.translate(W * 0.5, HR * 0.70); ctx.scale(reZoom, reZoom); ctx.translate(-W * 0.5, -HR * 0.70); }
                    // Background changes with phase
                    if (reentryPhase <= 1) {
                      drawEntrySky(entryNow);
                      // The fireball lights the air around it.
                      var litG = ctx.createRadialGradient(W * 0.5, capsuleY, 0, W * 0.5, capsuleY, HR * 0.6);
                      litG.addColorStop(0, 'rgba(251,146,60,' + (0.16 * entryNow.heat) + ')'); litG.addColorStop(1, 'rgba(251,146,60,0)');
                      ctx.fillStyle = litG; ctx.fillRect(-10, -10, W + 20, HR + 20);
                      // Blackout static + enhanced interference
                      if (reentryPhase === 1) {
                        ctx.globalAlpha = 0.2;
                        for (var ni = 0; ni < 60; ni++) {
                          ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : (Math.random() > 0.5 ? '#ff4400' : '#ff8800');
                          var nw = 1 + Math.random() * 3;
                          ctx.fillRect(Math.random() * W, Math.random() * HR, nw, 1);
                        }
                        // Scan lines
                        ctx.fillStyle = 'rgba(0,0,0,0.03)';
                        for (var sli = 0; sli < HR; sli += 3) { ctx.fillRect(0, sli, W, 1); }
                        ctx.globalAlpha = 1;
                        ctx.textAlign = 'center'; ctx.font = 'bold 14px monospace';
                        ctx.fillStyle = '#ff4444';
                        ctx.fillText('\u26A0 COMMUNICATIONS BLACKOUT', W * 0.5, 30);
                        ctx.font = '9px system-ui'; ctx.fillStyle = '#f87171';
                        ctx.fillText('Plasma around the capsule is blocking all radio signals...', W * 0.5, 46);
                      }
                    } else {
                      // Under the chutes. The capsule sinks steadily to the sea, the horizon
                      // near eye level, and meets the waterline at splashdown. It used to hop between
                      // three fixed heights and "splash" in mid-air, well above the water,
                      // and the animation froze on that frame.
                      // Dawn. Apollo 11 came down about 5:30 in the morning local time at
                      // 169 degrees west, minutes before sunrise, and the Sun rose during the
                      // recovery. It used to be a flat midday blue.
                      var dawn = Math.min(1, Math.max(0, (tick - 560) / 500));
                      var mixc = function(a, b) { return Math.round(a + (b - a) * dawn); };
                      var rgbc = function(a, b, c) { return 'rgb(' + a + ',' + b + ',' + c + ')'; };
                      var bgGrad2 = ctx.createLinearGradient(0, 0, 0, HR * 0.72);
                      bgGrad2.addColorStop(0, rgbc(mixc(12, 59), mixc(18, 104), mixc(48, 170)));
                      bgGrad2.addColorStop(0.62, rgbc(mixc(58, 150), mixc(52, 142), mixc(110, 190)));
                      bgGrad2.addColorStop(1, rgbc(mixc(214, 253), mixc(118, 196), mixc(84, 150)));
                      ctx.fillStyle = bgGrad2; ctx.fillRect(0, 0, W, HR);
                      // The Sun comes up through the horizon, behind the recovery.
                      var sunUp = Math.min(1, Math.max(0, (tick - 650) / 450));
                      var horizonNow = mmSplashPose(tick, HR).oceanTop;   // the Sun stays below the horizon until it rises
                      var sunX = W * 0.63, sunY = horizonNow + 12 - sunUp * 30;
                      var sunGlow = ctx.createRadialGradient(sunX, horizonNow, 0, sunX, horizonNow, 40 + 80 * sunUp);
                      sunGlow.addColorStop(0, 'rgba(253,186,116,' + (0.25 + 0.35 * dawn) + ')');
                      sunGlow.addColorStop(1, 'rgba(253,186,116,0)');
                      ctx.fillStyle = sunGlow; ctx.fillRect(0, 0, W, HR);
                      ctx.fillStyle = '#fef3c7';
                      ctx.beginPath(); ctx.arc(sunX, sunY, 9, 0, Math.PI * 2); ctx.fill();
                      var pose = mmSplashPose(tick, HR);
                      var oceanTop = pose.oceanTop;
                      capsuleY = pose.capsuleY;
                      if (oceanTop < HR) {
                        var seaGrad = ctx.createLinearGradient(0, oceanTop, 0, HR);
                        seaGrad.addColorStop(0, rgbc(mixc(30, 37), mixc(45, 99), mixc(96, 235))); seaGrad.addColorStop(1, rgbc(mixc(15, 30), mixc(23, 58), mixc(42, 138)));
                        ctx.fillStyle = seaGrad; ctx.fillRect(0, oceanTop, W, HR - oceanTop);   // covers the Sun's lower half
                        ctx.fillStyle = 'rgba(254,215,170,0.55)'; ctx.fillRect(0, oceanTop - 1, W, 2);   // horizon haze
                        if (sunUp > 0) {                                                           // the glitter path
                          for (var gj = 0; gj < 12; gj++) {
                            ctx.fillStyle = 'rgba(253,224,71,' + (0.5 * sunUp * (1 - gj / 12)) + ')';
                            var gw = 4 + gj * 2.5;
                            ctx.fillRect(sunX - gw / 2 + Math.sin(tick * 0.05 + gj) * 3, oceanTop + 3 + gj * 6, gw, 1.5);
                          }
                        }
                        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
                        for (var wi = 0; wi < 5; wi++) {
                          ctx.beginPath();
                          ctx.moveTo(0, oceanTop + wi * 8 + 5);
                          for (var wx = 0; wx < W; wx += 10) {
                            ctx.lineTo(wx, oceanTop + wi * 8 + 5 + Math.sin(wx * 0.03 + tick * 0.02 + wi) * 3);
                          }
                          ctx.stroke();
                        }
                        // USS Hornet, hull down on the horizon.
                        var shipX = W * 0.84;
                        ctx.fillStyle = 'rgba(30,41,59,0.9)';   // a silhouette against the dawn
                        ctx.beginPath(); ctx.moveTo(shipX - 26, oceanTop); ctx.lineTo(shipX - 22, oceanTop - 4); ctx.lineTo(shipX + 24, oceanTop - 4); ctx.lineTo(shipX + 28, oceanTop); ctx.closePath(); ctx.fill();
                        ctx.fillRect(shipX + 4, oceanTop - 8, 6, 4);
                      }
                    }
                    // After splashdown: the real Apollo 11 recovery, step by step.
                    var rp = mmSplashPose(tick, HR);
                    var sT = rp.sT, afloat = rp.afloat, waterY = rp.waterY;
                    var capX = W * 0.5;
                    var capAng = rp.angle, bags = rp.bags;   // Stable 2, then righted by the bags
                    var capScale = 1;
                    if (entryNow) {                             // shield along the path; upright by the drogues
                      capAng = (90 - entryNow.gamma) * Math.PI / 180;
                      capScale = 1 + 1.2 * (1 - Math.min(1, Math.max(0, (tick - 290) / 70)));
                    }
                    if (afloat) {
                      capsuleY += Math.sin(tick * 0.05) * 1.2;
                      // Green dye spreads to mark the spot for the helicopter.
                      var dyeR = 10 + 40 * Math.min(1, Math.max(0, (sT - 200) / 150));
                      if (sT > 200) {                             // flat on the surface: we are at sea level
                        ctx.fillStyle = 'rgba(52,211,153,0.45)';
                        ctx.beginPath(); ctx.ellipse(capX + 6, waterY + 1.5, dyeR, 2.2, 0, 0, Math.PI * 2); ctx.fill();
                      }
                    }
                    // Parachutes: two drogues, then three mains that open in reefed stages.
                    // At splashdown they are cut loose and settle on the water.
                    if (reentryPhase >= 2) {
                      var mains = tick > 480;
                      var chuteCount = mains ? 3 : 2;
                      var chuteColor = mains ? '#ef4444' : '#f59e0b';
                      var openK = mains ? Math.min(1, (tick - 480) / 45) : 1;
                      var chuteFade = afloat ? Math.max(0, 1 - sT / 200) : 1;
                      for (var pi = 0; pi < chuteCount && chuteFade > 0; pi++) {
                        var pxOff = (pi - (chuteCount - 1) / 2) * 25;
                        var cyC = capsuleY - 40 - pi * 5;
                        var flat = 1;
                        if (afloat) {
                          pxOff += 30 + sT * 0.45;
                          cyC = Math.min(waterY - 2, cyC + sT * 1.4);
                          flat = Math.max(0.2, 1 - sT / 50);
                        }
                        ctx.globalAlpha = chuteFade;
                        if (!afloat) {
                          ctx.strokeStyle = '#888'; ctx.lineWidth = 0.5;
                          ctx.beginPath(); ctx.moveTo(capX + pxOff - 15 * openK, cyC + 5); ctx.lineTo(capX - 5, capsuleY - 8); ctx.stroke();
                          ctx.beginPath(); ctx.moveTo(capX + pxOff + 15 * openK, cyC + 5); ctx.lineTo(capX + 5, capsuleY - 8); ctx.stroke();
                        }
                        var rx = 18 * (0.35 + 0.65 * openK), ry = 10 * (0.5 + 0.5 * openK) * flat;
                        ctx.fillStyle = chuteColor;
                        ctx.beginPath(); ctx.ellipse(capX + pxOff, cyC, rx, ry, 0, Math.PI, 0); ctx.fill();
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath(); ctx.ellipse(capX + pxOff, cyC, rx, Math.max(1, 3 * flat), 0, Math.PI, 0); ctx.fill();
                        ctx.globalAlpha = 1;
                      }
                    }
                    // Capsule — the Apollo CM gumdrop: truncated cone with curved shoulder,
                    // shaded silver body, hatch window. Drawn about its centre so it can
                    // capsize and be righted.
                    ctx.save();
                    ctx.translate(capX, capsuleY); ctx.rotate(capAng); ctx.scale(capScale, capScale);
                    if (entryNow) drawEntryWake(entryNow);
                    var capGrad = ctx.createLinearGradient(-12, 0, 12, 0);
                    capGrad.addColorStop(0, '#e8ecf2');
                    capGrad.addColorStop(0.45, '#c3cad4');
                    capGrad.addColorStop(1, '#7d8794');
                    ctx.fillStyle = capGrad;
                    ctx.beginPath();
                    ctx.moveTo(-12, 10);
                    ctx.lineTo(-3.5, -8);
                    ctx.quadraticCurveTo(0, -10.5, 3.5, -8);   // rounded apex (docking tunnel shoulder)
                    ctx.lineTo(12, 10);
                    ctx.closePath(); ctx.fill();
                    ctx.fillStyle = '#64748b';                   // apex docking probe stub
                    ctx.fillRect(-1.5, -12, 3, 3);
                    ctx.fillStyle = '#38bdf8';                   // crew hatch window
                    ctx.beginPath(); ctx.arc(-4.5, 2.5, 1.8, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = 'rgba(71,85,105,0.55)'; ctx.lineWidth = 0.8;   // panel seam
                    ctx.beginPath(); ctx.moveTo(-9.5, 6); ctx.lineTo(9.5, 6); ctx.stroke();
                    if (bags > 0) {                              // three orange uprighting bags at the apex
                      ctx.fillStyle = '#f97316';
                      [[-5, -12], [0, -14.5], [5, -12]].forEach(function(bp) {
                        ctx.beginPath(); ctx.arc(bp[0], bp[1], 4.2 * bags, 0, Math.PI * 2); ctx.fill();
                      });
                    }
                    if (entryNow) {                             // the shield itself, glowing with the heat
                      ctx.fillStyle = 'rgb(' + Math.round(120 + 135 * Math.min(1, entryNow.heat * 1.5)) + ',' + Math.round(60 + 120 * entryNow.heat) + ',' + Math.round(40 + 60 * entryNow.heat) + ')';
                      ctx.beginPath(); ctx.moveTo(-12.5, 9.5); ctx.quadraticCurveTo(0, 13.5, 12.5, 9.5); ctx.lineTo(12, 10); ctx.quadraticCurveTo(0, 11.5, -12, 10); ctx.closePath(); ctx.fill();
                      drawEntryShock(entryNow);
                    }
                    ctx.restore();
                    if (afloat) {
                      // The sea over whatever is under the waterline, in the sea's own
                      // gradient so it does not read as a box.
                      ctx.globalAlpha = 0.82;
                      ctx.fillStyle = seaGrad || '#2563eb';
                      ctx.fillRect(capX - 24, waterY + 0.5, 48, 20);
                      ctx.globalAlpha = 1;
                      // Splash: spray thrown up and falling back, then spreading rings.
                      var sprayRng = _seededRand(711);
                      if (sT < 45) {
                        ctx.fillStyle = 'rgba(255,255,255,' + (0.8 * (1 - sT / 45)) + ')';
                        for (var sprayI = 0; sprayI < 18; sprayI++) {
                          var vx = (sprayRng.next() - 0.5) * 2.4, vy = 1.2 + sprayRng.next() * 1.6;
                          var px = capX + vx * sT, py = waterY - vy * sT + 0.045 * sT * sT;
                          if (py > waterY + 1) continue;
                          ctx.beginPath(); ctx.arc(px, py, 1.2 + sprayRng.next() * 1.8, 0, Math.PI * 2); ctx.fill();
                        }
                      }
                      ctx.lineWidth = 1;
                      for (var rk = 0; rk < 3; rk++) {
                        var rr = (sT - rk * 14) * 0.9;
                        if (rr <= 0 || rr > 70) continue;
                        ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - rr / 70)) + ')';
                        ctx.beginPath(); ctx.ellipse(capX, waterY + 1.5, 12 + rr, 1.5 + rr * 0.04, 0, 0, Math.PI * 2); ctx.stroke();
                      }
                      // Flotation collar, fitted by the swimmers.
                      if (sT > 380) {
                        ctx.fillStyle = 'rgba(234,88,12,0.9)';
                        ctx.beginPath(); ctx.ellipse(capX, waterY + 0.5, 16, 2.4, 0, 0, Math.PI * 2); ctx.fill();
                      }
                      // Recovery helicopter from the Hornet: flies in and hovers.
                      if (sT > 230) {
                        var hk = Math.min(1, (sT - 230) / 140); hk = hk * hk * (3 - 2 * hk);
                        var hx = W + 70 + (capX + 46 - W - 70) * hk, hy = waterY - HR * 0.21 + Math.sin(tick * 0.04) * 1.5;   // in frame once zoomed
                        if (sT > 360) {                          // swimmers going down the line
                          ctx.strokeStyle = 'rgba(226,232,240,0.7)'; ctx.lineWidth = 0.6;
                          ctx.beginPath(); ctx.moveTo(hx - 4, hy + 6); ctx.lineTo(capX + 18, waterY - 2); ctx.stroke();
                          ctx.fillStyle = '#0f172a';
                          ctx.beginPath(); ctx.arc(capX + 16, waterY, 1.8, 0, Math.PI * 2); ctx.fill();
                          ctx.beginPath(); ctx.arc(capX - 15, waterY, 1.8, 0, Math.PI * 2); ctx.fill();
                        }
                        ctx.fillStyle = '#475569';
                        ctx.beginPath(); ctx.ellipse(hx, hy, 13, 5, 0, 0, Math.PI * 2); ctx.fill();          // fuselage
                        ctx.fillRect(hx + 8, hy - 2, 18, 2.5);                                                 // tail boom
                        ctx.fillRect(hx + 24, hy - 6, 2, 6);                                                   // tail rotor fin
                        ctx.fillStyle = '#94a3b8';
                        ctx.fillRect(hx - 9, hy - 2, 6, 2.5);                                                  // cockpit glass
                        ctx.strokeStyle = 'rgba(15,23,42,' + (0.35 + 0.25 * Math.abs(Math.sin(tick * 0.9))) + ')';
                        ctx.lineWidth = 1.2;
                        ctx.beginPath(); ctx.moveTo(hx - 24, hy - 7); ctx.lineTo(hx + 24, hy - 7); ctx.stroke(); // rotor disc
                        ctx.fillStyle = '#334155'; ctx.fillRect(hx - 1, hy - 7, 2, 3);
                      }
                    }
                    if (reZoom > 1) ctx.restore();
                    // Temperature HUD, now reporting the corridor the student chose.
                    if (reentryPhase <= 1) {
                      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(8, HR - 58, 168, 50);
                      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
                      ctx.fillStyle = '#ef4444'; ctx.fillText('HEAT SHIELD', 14, HR - 44);
                      var shieldTemp = entryNow.tempC;
                      ctx.fillStyle = shieldTemp > 2000 ? '#ef4444' : '#f59e0b';
                      ctx.font = 'bold 14px monospace';
                      ctx.fillText(shieldTemp + '\u00B0C', 14, HR - 30);
                      ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#94a3b8';
                      ctx.fillText('ENTRY ' + _entryAngle.toFixed(1) + '\u00B0  \u2022  PEAK ' + _entryPeakG + ' g', 14, HR - 14);
                    }
                    // A skip-out is the one entry mistake the animation can actually show:
                    // the capsule grazes the atmosphere and is thrown back out.
                    if (_entryOutcome === 'skip' && tick > 120 && tick < 300) {
                      ctx.textAlign = 'center'; ctx.font = 'bold 13px monospace';
                      ctx.fillStyle = '#fbbf24';
                      ctx.fillText('\u26A0 SKIP-OUT \u2014 ANGLE TOO SHALLOW', W * 0.5, HR * 0.62);
                      ctx.font = '9px system-ui'; ctx.fillStyle = '#fcd34d';
                      ctx.fillText('The atmosphere threw the capsule back toward space before it caught.', W * 0.5, HR * 0.68);
                    }
                    // Phase label
                    var phaseLabels = ['ATMOSPHERIC ENTRY', 'RADIO BLACKOUT', 'DROGUE CHUTES', 'MAIN CHUTES', 'SPLASHDOWN!'];
                    ctx.textAlign = 'center'; ctx.font = 'bold 11px system-ui';
                    var plW = ctx.measureText(phaseLabels[reentryPhase]).width + 16;
                    ctx.fillStyle = 'rgba(15,23,42,0.62)';   // sky-blue on the dawn glow was about 1.5:1
                    ctx.fillRect(W * 0.5 - plW / 2, HR - 20, plW, 16);
                    ctx.fillStyle = reentryPhase === 4 ? '#4ade80' : reentryPhase <= 1 ? '#fb923c' : '#7dd3fc';
                    ctx.fillText(phaseLabels[reentryPhase], W * 0.5, HR - 8);
                    // Comms — pushed to the bottom during blackout, where the phase label
                    // already lives, because the banner occupies the top three text rows
                    // (y=30 and y=46) and the comms line at y=16 was crowding straight into
                    // it. During blackout the line is also the crew being unheard, so it
                    // belongs away from the warning that explains why.
                    var reComms = ['CDR: "Getting warm in here..."', 'Houston: "...Apollo, do you read?... Apollo..."', 'Houston: "We see your chutes! Welcome back!"', 'CDR: "Main chutes look good!"', 'Houston: "SPLASHDOWN! Welcome home!"'];
                    var reLine = reComms[reentryPhase];
                    if (reentryPhase >= 4) {
                      reLine = sT < 90 ? 'Splashdown just before sunrise, about 24 km from the recovery ship, USS Hornet.'
                        : sT < 150 ? 'Stable 2: the capsule has flipped nose-down, as Apollo 11\'s did.'
                        : sT < 210 ? 'Uprighting bags inflating to roll it back over...'
                        : sT < 360 ? 'Stable 1: upright. Green dye marks the spot for the helicopter.'
                        : 'Recovery helicopter overhead. Swimmers fit a flotation collar.';
                    }
                    ctx.font = 'italic 9px system-ui'; ctx.textAlign = 'center';
                    var reY = reentryPhase === 1 ? (HR - 22) : 16;
                    if (reentryPhase >= 2) {
                      // Lavender at 60% on the daylight sky was about 1.2:1.
                      var rlW = ctx.measureText(reLine).width + 14;
                      ctx.fillStyle = 'rgba(15,23,42,0.62)';
                      ctx.fillRect(W * 0.5 - rlW / 2, reY - 10, rlW, 14);
                      ctx.fillStyle = '#f1f5f9';
                      ctx.fillText(reLine, W * 0.5, reY);
                    } else {
                      ctx.globalAlpha = 0.6; ctx.fillStyle = '#a5b4fc';
                      ctx.fillText(reLine, W * 0.5, reY);
                      ctx.globalAlpha = 1;
                    }
                    drawVignette(ctx, W, HR, 0.35);
                    if (tick < 1180 && document.contains(cvEl)) requestAnimationFrame(drawReentry);   // runs on through the recovery, then rests
                  }
                  drawReentry();
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-orange-900/30' },
              h('p', { className: 'text-[0.6875rem] text-slate-200 mb-2' }, t('stem.moonmission.watch_the_command_module_survive_re_en', 'Watch the Command Module survive re-entry at about 39,700 km/h with its heat shield at 2,760\u00B0C, deploy parachutes, and splash down in the Pacific Ocean.')),
              h('div', { className: 'bg-indigo-500/10 rounded p-1.5 border border-indigo-500/20' },
                h('p', { className: 'text-[0.6875rem] text-indigo-300' }, '\uD83D\uDCA1 ' + apolloFact())
              )
            )
          ),
          (function() {
            var rs = (typeof d.reentryStatus === 'number' && isFinite(d.reentryStatus)) ? d.reentryStatus : 0;
            return phaseStatus(rs >= 4,
              rs === 0 ? 'Entry interface. The heat shield is taking 2,760°C, and it protects you by burning away on purpose.'
                : rs === 1 ? 'Radio blackout. Ionised air around the capsule blocks every signal — Houston cannot hear you, and this is the part everyone counts through.'
                : rs === 2 ? 'Drogue chutes out, slowing and steadying the capsule.'
                : 'Three main chutes. Two would have been enough.',
              'Splashdown in the Pacific. The crew is home.');
          })(),
          h('button', {
            title: t('stem.moonmission.complete_the_mission_with_pacific_ocea', 'Complete the mission with Pacific Ocean splashdown. Welcome home Commander!'),
            onClick: function() {
              setPhase(10);
              log('\uD83C\uDF0A SPLASHDOWN! Mission complete.');
              addXP(50);
              if (addToast) addToast('\uD83C\uDF89 MISSION COMPLETE! Welcome home, Commander!', 'success');
              if (typeof announceToSR === 'function') announceToSR('Mission complete! Splashdown in the Pacific Ocean. Welcome home, Commander.');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-700 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg'
          }, t('stem.moonmission.mission_complete_splashdown', '\uD83C\uDF0A Mission Complete \u2014 SPLASHDOWN!'))
        ),

        // ═══ PHASE 10: MISSION COMPLETE ═══
        phase >= 10 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-xl p-5 text-white text-center' },
            h('div', { className: 'text-5xl mb-2' }, '\uD83C\uDF1F'),
            h('h4', { className: 'text-xl font-black tracking-wide mb-1' }, t('stem.moonmission.mission_complete', 'MISSION COMPLETE')),
            h('p', { className: 'text-sm text-indigo-200 mb-3' }, t('stem.moonmission.welcome_home_commander_the_world_celeb', 'Welcome home, Commander. The world celebrates.')),
            h('div', { className: 'grid grid-cols-3 gap-3 mb-4' },
              [
                ['\uD83D\uDE80', 'Launched', 'Saturn V'],
                ['\uD83C\uDF15', 'Landed', 'Sea of Tranquility'],
                ['\uD83E\uDEA8', 'Collected', (d.lunarSamples || []).length + ' samples']
              ].map(function(item) {
                return h('div', { key: item[0], className: 'bg-white/10 rounded-lg p-3' },
                  h('div', { className: 'text-2xl mb-1' }, item[0]),
                  h('p', { className: 'text-[0.6875rem] text-slate-200' }, item[1]),
                  h('p', { className: 'text-xs font-bold' }, item[2])
                );
              })
            ),
            h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10 text-left mb-3' },
              h('p', { className: 'text-[0.6875rem] text-fuchsia-300 font-bold mb-1' }, t('stem.moonmission.mission_debrief', '\uD83C\uDFC5 MISSION DEBRIEF')),
              h('div', { className: 'grid grid-cols-4 gap-2 mb-2' },
                [
                  ['\u2B50', (d.missionXP || 0) + ' XP', 'Total'],
                  ['\uD83E\uDEA8', mmSampleTypeCount(d.lunarSamples) + '/' + LUNAR_SAMPLES_DATA.length, 'Samples'],
                  ['\uD83E\uDDE0', (d.quizCorrect || 0) + '/' + QUIZ_BANK.length, 'Quiz'],
                  ['\u23F1', getMissionElapsed(), 'Time']
                ].map(function(s) {
                  return h('div', { key: s[2], className: 'bg-white/5 rounded-lg p-1.5 text-center' },
                    h('div', { className: 'text-sm' }, s[0]),
                    h('p', { className: 'text-[0.6875rem] font-bold text-white' }, s[1]),
                    h('p', { className: 'text-[0.6875rem] text-slate-200' }, s[2])
                  );
                })
              ),
              // ── Flight record ──
              // The graded calls, in the order they were flown. They used to appear in the
              // order they were written (entry first, landing last), and the mid-course
              // correction — a decision with a real cost — never showed up at all.
              h('p', { className: 'text-[0.6875rem] text-fuchsia-200 font-bold mb-1 mt-1' }, t('stem.moonmission.flight_record', '\uD83D\uDCDD FLIGHT RECORD \u2014 in the order you flew it')),
              // Burn timing \u2014 the other decision the mission actually grades.
              d.tliAccuracy && h('div', { className: 'bg-white/5 rounded-lg p-2 border border-white/10 mb-2' },
                h('p', { className: 'text-[0.6875rem] font-bold mb-0.5 ' + (d.tliAccuracy.onTime ? 'text-green-300' : 'text-yellow-300') },
                  d.tliAccuracy.onTime
                    ? '\ud83d\ude80 TLI ON TIME \u2014 you burned inside the window'
                    : '\ud83d\ude80 TLI ' + d.tliAccuracy.offByDeg + '\u00b0 ' + (d.tliAccuracy.side === 'late' ? 'LATE' : 'EARLY') + ' \u2014 outside the burn window'),
                h('p', { className: 'text-[0.6875rem] text-slate-200' },
                  d.tliAccuracy.onTime
                    ? 'Your velocity vector pointed at where the Moon was going to be, so the coast needed no correcting.'
                    : 'Apollo flew mid-course corrections for exactly this. It is recoverable \u2014 it just costs propellant you might want later.')
              ),
              // Mid-course correction \u2014 the bill for an off-window TLI, and what it bought.
              d.mccChoice && h('div', { className: 'bg-white/5 rounded-lg p-2 border border-white/10 mb-2' },
                h('p', { className: 'text-[0.6875rem] font-bold mb-0.5 ' + (d.mccChoice === 'corrected' ? 'text-green-300' : 'text-yellow-300') },
                  d.mccChoice === 'corrected'
                    ? '\uD83D\uDEE0\uFE0F MID-COURSE CORRECTION BURNED \u2014 back on the nominal path'
                    : '\u27A1\uFE0F CORRECTION DECLINED \u2014 arrived off-nominal'),
                h('p', { className: 'text-[0.6875rem] text-slate-200' },
                  d.mccChoice === 'corrected'
                    ? 'It used a little Service Module propellant on the coast, the trade Apollo made on almost every flight: fix a small error early, while it is still small.'
                    : 'The error grew all the way to the Moon, and the landing paid for it: ' + MM_DESCENT.skipFuel + ' fewer seconds of hover fuel and ' + MM_DESCENT.skipDrift + ' m/s more drift. Cheap early, expensive late.')
              ),
              // Landing performance \u2014 computed inside the descent canvas and, until now,
              // thrown away with it. The one piloting task in the mission deserves a line
              // in the debrief alongside samples and quiz.
              d.landingResult && h('div', { className: 'bg-white/5 rounded-lg p-2 border border-white/10 mb-2' },
                h('p', { className: 'text-[0.6875rem] font-bold mb-0.5 ' + (d.landingResult.crashed ? 'text-orange-300' : d.landingResult.score >= 80 ? 'text-green-300' : 'text-yellow-300') },
                  d.landingResult.crashed
                    ? '\u26A0\uFE0F HARD LANDING \u2014 impact at ' + d.landingResult.vVel.toFixed(1) + ' m/s (limit 3 m/s)'
                    : '\uD83C\uDF15 TOUCHDOWN \u2014 landing score ' + d.landingResult.score + '/100 (grade ' + d.landingResult.grade + ')'),
                h('p', { className: 'text-[0.6875rem] text-slate-200' },
                  'Vertical ' + d.landingResult.vVel.toFixed(1) + ' m/s \u2022 lateral drift ' + d.landingResult.hVel.toFixed(1) + ' m/s \u2022 ' + (d.landingResult.fuelUnit === 's' ? d.landingResult.fuel + ' s of hover fuel left' : 'fuel remaining ' + d.landingResult.fuel + '%')),
                h('p', { className: 'text-[0.6875rem] text-slate-200 mt-0.5' },
                  d.landingResult.crashed
                    ? 'Apollo 11 touched down at about 0.5 m/s. Bleed vertical speed early \u2014 Moon gravity is gentle, but it never lets up.'
                    : 'For scale: Apollo 11 touched down at roughly 0.5 m/s, just after Houston called "30 seconds" of fuel.')
              ),
              // Surface experiment \u2014 the one thing you left behind that is still working.
              d.seismoDeployed && h('div', { className: 'bg-white/5 rounded-lg p-2 border border-white/10 mb-2' },
                h('p', { className: 'text-[0.6875rem] font-bold text-green-300 mb-0.5' }, '\ud83d\udcca SEISMOMETER DEPLOYED'),
                h('p', { className: 'text-[0.6875rem] text-slate-200' },
                  'The real Apollo seismometers ran until 1977 and recorded thousands of moonquakes and meteorite strikes. Almost everything we know about the inside of the Moon came from instruments the crews set down by hand and walked away from.')
              ),
              // Entry corridor \u2014 the last number the mission asks you to get right.
              d.entryOutcome && h('div', { className: 'bg-white/5 rounded-lg p-2 border border-white/10 mb-2' },
                h('p', { className: 'text-[0.6875rem] font-bold mb-0.5 ' + (d.entryOutcome.outcome === 'nominal' ? 'text-green-300' : 'text-yellow-300') },
                  d.entryOutcome.outcome === 'nominal'
                    ? '\ud83c\udfaf ENTRY IN THE CORRIDOR \u2014 ' + d.entryOutcome.angle.toFixed(1) + '\u00b0, about ' + d.entryOutcome.peakG + ' g'
                    : d.entryOutcome.outcome === 'skip'
                      ? '\u26a0\ufe0f SKIP-OUT \u2014 entered at ' + d.entryOutcome.angle.toFixed(1) + '\u00b0, too shallow'
                      : '\u26a0\ufe0f STEEP ENTRY \u2014 ' + d.entryOutcome.angle.toFixed(1) + '\u00b0, about ' + d.entryOutcome.peakG + ' g'),
                h('p', { className: 'text-[0.6875rem] text-slate-200' },
                  d.entryOutcome.outcome === 'nominal'
                    ? 'A corridor roughly two degrees wide, hit after a quarter of a million miles. Apollo 11 pulled about 6.5 g coming home.'
                    : d.entryOutcome.outcome === 'skip'
                      ? 'Too shallow and the atmosphere behaves like a stone skipping on water \u2014 it throws you back out, and the next chance is hours away.'
                      : 'Steeper means shorter, hotter and heavier. The shield is built to burn away, but the crew feels every g of it.')
              ),
              // What caused what: the calls above, linked in the order they were flown.
              (function() {
                var chain = mmCauseChain(currentFlightSummary(''));
                if (!chain.length) return null;
                return h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-400/30 mb-2', 'data-moonmission-cause-chain': 'true' },
                  h('p', { className: 'text-[0.6875rem] font-bold text-indigo-200 mb-0.5' }, t('stem.moonmission.cause_chain_title', 'WHAT CAUSED WHAT')),
                  h('p', { className: 'text-[0.6875rem] text-slate-300 mb-1' }, t('stem.moonmission.cause_chain_intro', 'Each call you made set up the next one. Read down the chain.')),
                  h('ol', { className: 'list-decimal pl-5 space-y-0.5' },
                    chain.map(function(c, i) {
                      return h('li', { key: i, className: 'text-[0.6875rem] text-slate-200' },
                        h('span', { className: 'font-bold text-white' }, c.call), ' ',
                        h('span', { 'aria-hidden': 'true' }, MM_ARROW),
                        h('span', { className: 'sr-only' }, ', which meant'), ' ',
                        c.result + '.');
                    })));
              })(),
              // Badges earned
              h('p', { className: 'text-[0.6875rem] text-slate-200 font-bold mb-1' }, t('stem.moonmission.badges_earned', '\uD83C\uDFC5 BADGES EARNED:')),
              h('div', { className: 'flex flex-wrap gap-1.5 mb-2' },
                BADGES.map(function(b) {
                  var earned = !!(d.earnedBadges || {})[b.id];
                  return h('div', { key: b.id, className: 'flex items-center gap-1 px-2 py-1 rounded-full text-[0.6875rem] ' + (earned ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-white/5 text-slate-200 border border-white/5'), title: b.desc },
                    h('span', null, earned ? b.icon : '\uD83D\uDD12'),
                    h('span', null, b.name)
                  );
                })
              ),
              // Sample gallery
              (d.lunarSamples || []).length > 0 && h('div', { className: 'mt-2' },
                h('p', { className: 'text-[0.6875rem] text-slate-200 font-bold mb-1.5' }, '\uD83E\uDEA8 LUNAR SAMPLE COLLECTION (' + mmSampleTypeCount(d.lunarSamples) + '/' + LUNAR_SAMPLES_DATA.length + ')'),
                h('div', { className: 'grid grid-cols-2 gap-1.5' },
                  (d.lunarSamples || []).map(function(s, i) {
                    return h('div', { key: i, className: 'bg-white/10 rounded-lg p-2 border border-white/10' },
                      h('div', { className: 'flex items-center gap-1.5 mb-1' },
                        h('span', { className: 'text-lg' }, s.icon),
                        h('div', null,
                          h('p', { className: 'text-[0.6875rem] font-bold text-white' }, s.name),
                          h('p', { className: 'text-[0.6875rem] text-indigo-200' }, s.type)
                        )
                      ),
                      h('p', { className: 'text-[0.6875rem] text-slate-200 leading-relaxed' }, s.fact)
                    );
                  })
                ),
                // Collection completeness
                mmSampleTypeCount(d.lunarSamples) >= LUNAR_SAMPLES_DATA.length && h('div', { className: 'mt-2 bg-amber-500/10 rounded-lg p-2 border border-amber-500/20 text-center' },
                  h('p', { className: 'text-[0.6875rem] font-bold text-amber-300' }, '\uD83C\uDFC6 COMPLETE COLLECTION! All ' + LUNAR_SAMPLES_DATA.length + ' samples recovered.'),
                  h('p', { className: 'text-[0.6875rem] text-amber-400' }, t('stem.moonmission.these_samples_will_be_studied_by_scien', 'These samples will be studied by scientists for decades to come.'))
                )
              )
            ),
            // ── Decision Analysis (from Mission Events) ──
            (d.decisionLog || []).length > 0 && h('div', { className: 'mt-3 bg-white/5 rounded-xl p-3 border border-white/10' },
              h('p', { className: 'text-[0.6875rem] text-slate-200 font-bold mb-2' }, t('stem.moonmission.decision_analysis', '\uD83D\uDCCA DECISION ANALYSIS')),
              (d.decisionLog || []).map(function(dec, i) {
                return h('div', { key: i, className: 'bg-white/5 rounded-lg p-2.5 border border-white/10 mb-1.5' },
                  h('div', { className: 'flex justify-between items-center mb-1' },
                    h('span', { className: 'text-[0.6875rem] font-bold text-white' }, dec.title),
                    h('span', { className: 'text-[0.6875rem] px-2 py-0.5 rounded-full ' +
                      (dec.quality === 'optimal' ? 'bg-green-500/20 text-green-300' :
                       dec.quality === 'adequate' ? 'bg-yellow-500/20 text-yellow-300' :
                       'bg-red-500/20 text-red-300')
                    }, dec.quality.toUpperCase())
                  ),
                  h('p', { className: 'text-[0.6875rem] text-slate-200' }, 'Your choice: "' + dec.chosen + '"'),
                  dec.quality !== 'optimal' && h('p', { className: 'text-[0.6875rem] text-indigo-200 mt-1' },
                    '\uD83D\uDCA1 Better option: "' + dec.optimal + '"'
                  ),
                  h('details', { className: 'mt-1' },
                    h('summary', { className: 'text-[0.6875rem] text-slate-200 cursor-pointer' }, t('stem.moonmission.historical_context', 'Historical context')),
                    h('p', { className: 'text-[0.6875rem] text-slate-200 mt-1 pl-2' }, dec.historical)
                  )
                );
              }),
              // Overall decision score
              (function() {
                var dlog = d.decisionLog || [];
                var optCount = dlog.filter(function(x) { return x.quality === 'optimal'; }).length;
                var total = dlog.length;
                var pct = total > 0 ? Math.round(optCount / total * 100) : 0;
                return h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20 mt-2 text-center' },
                  h('p', { className: 'text-xs font-bold ' + (pct >= 80 ? 'text-green-300' : pct >= 50 ? 'text-yellow-300' : 'text-orange-300') },
                    'Decision Score: ' + optCount + '/' + total + ' optimal (' + pct + '%)'),
                  h('p', { className: 'text-[0.6875rem] text-slate-200 mt-0.5' },
                    pct >= 80 ? 'Outstanding problem-solving! You think like a real mission commander.' :
                    pct >= 50 ? 'Solid decisions. Review the notes above to learn what real astronauts did.' :
                    'Room for improvement \u2014 but every astronaut learns from experience. Try again!')
                );
              })()
            ),

            // Debrief notes, the report to hand in, and the flights so far. "Fly again and
            // beat it" had nothing to beat: Fly Another Mission wiped the flight.
            (function() {
              var refl = mmIsObj(d.reflection) ? d.reflection : {};
              var history = Array.isArray(d.flightHistory) ? d.flightHistory : [];
              var today = new Date().toLocaleDateString();
              var cur = currentFlightSummary(today);
              var last = history.length ? history[history.length - 1] : null;
              var predResults = mmPredictionResults(d.predictions, PREDICTIONS);
              var report = mmFlightReport(cur, { decisions: d.decisionLog, reflection: refl, previous: last, predictions: predResults });
              var setRefl = function(field) {
                return function(e) {
                  var v = e.target.value;
                  upd('reflection', function(prev) { var nx = Object.assign({}, mmIsObj(prev) ? prev : {}); nx[field] = v; return nx; });
                };
              };
              var cols = [
                t('stem.moonmission.history_col_flight', 'Flight'), t('stem.moonmission.history_col_mode', 'Mode'),
                t('stem.moonmission.history_col_tli', 'TLI'), t('stem.moonmission.history_col_landing', 'Landing'),
                t('stem.moonmission.history_col_fuel', 'Fuel left'), t('stem.moonmission.history_col_entry', 'Entry'),
                t('stem.moonmission.history_col_quiz', 'Quiz')
              ];
              var rows = history.map(function(f, i) {
                return { label: t('stem.moonmission.history_flight_n', 'Flight') + ' ' + (i + 1) + (mmIsObj(f) && f.when ? ' (' + f.when + ')' : ''), cells: mmFlightRow(f), current: false };
              }).concat([{ label: t('stem.moonmission.history_this_flight', 'This flight'), cells: mmFlightRow(cur), current: true }]);
              var taCls = 'w-full text-xs rounded-lg p-2 bg-slate-950 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 mb-2';
              return h('div', { className: 'mt-3 bg-white/5 rounded-xl p-3 border border-white/10 text-left', 'data-moonmission-reflection': 'true' },
                predResults.length > 0 && h('div', { className: 'mb-2', 'data-moonmission-predictions': 'true' },
                  h('p', { className: 'text-[0.6875rem] text-violet-200 font-bold mb-0.5' },
                    t('stem.moonmission.predictions_title', 'YOUR PREDICTIONS') + ': ' + predResults.filter(function(p) { return p.right; }).length + ' / ' + predResults.length),
                  h('ul', { className: 'space-y-0.5' }, predResults.map(function(p) {
                    return h('li', { key: p.id, className: 'text-[0.6875rem] ' + (p.right ? 'text-emerald-300' : 'text-amber-300') },
                      h('span', { className: 'font-bold' }, p.short + ': '),
                      p.right ? p.chosenLabel : p.chosenLabel + ' ' + MM_ARROW + ' ' + p.correctLabel);
                  }))),
                h('p', { className: 'text-[0.6875rem] text-fuchsia-200 font-bold mb-1' }, t('stem.moonmission.reflection_title', 'YOUR DEBRIEF NOTES')),
                h('label', { htmlFor: 'mm-reflect-mattered', className: 'block text-[0.6875rem] text-slate-200 font-bold mb-0.5' },
                  t('stem.moonmission.reflection_mattered', 'Which decision mattered most on this flight, and why?')),
                h('textarea', { id: 'mm-reflect-mattered', rows: 2, value: String(refl.mattered || ''), onChange: setRefl('mattered'), className: taCls }),
                h('label', { htmlFor: 'mm-reflect-next', className: 'block text-[0.6875rem] text-slate-200 font-bold mb-0.5' },
                  t('stem.moonmission.reflection_next', 'What will you do differently on your next flight?')),
                h('textarea', { id: 'mm-reflect-next', rows: 2, value: String(refl.next || ''), onChange: setRefl('next'), className: taCls }),
                h('button', { type: 'button', 'data-moonmission-copy-report': 'true', onClick: function() { copyFlightReport(report); },
                  className: 'min-h-[44px] px-4 rounded-lg text-xs font-bold text-white bg-fuchsia-700 hover:bg-fuchsia-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-300' },
                  t('stem.moonmission.report_copy', 'Copy flight report')),
                h('details', { className: 'mt-2' },
                  h('summary', { className: 'text-[0.6875rem] text-slate-200 cursor-pointer min-h-[44px] flex items-center' }, t('stem.moonmission.report_show', 'Show the report text')),
                  h('textarea', { readOnly: true, rows: 12, value: report, 'data-moonmission-report-text': 'true',
                    'aria-label': t('stem.moonmission.report_text_label', 'Flight report text'),
                    onFocus: function(e) { try { e.target.select(); } catch (_selErr) {} },
                    className: 'w-full text-[0.6875rem] font-mono rounded-lg p-2 bg-slate-950 text-slate-200 border border-slate-600' })),
                history.length > 0 && h('div', { className: 'mt-3', 'data-moonmission-history': 'true' },
                  h('p', { className: 'text-[0.6875rem] text-fuchsia-200 font-bold mb-1' }, t('stem.moonmission.history_title', 'YOUR FLIGHTS')),
                  h('p', { className: 'text-[0.6875rem] text-slate-200 mb-1', 'data-moonmission-compare': 'true' },
                    t('stem.moonmission.history_compare', 'Compared with your last flight:') + ' ' + mmCompareFlights(last, cur) + '.'),
                  h('div', { className: 'overflow-x-auto' },
                    h('table', { className: 'w-full text-[0.6875rem] text-left text-slate-200 border-collapse' },
                      h('caption', { className: 'sr-only' }, t('stem.moonmission.history_caption', 'Your last flights, oldest first, with this one at the bottom.')),
                      h('thead', null, h('tr', null, cols.map(function(c) {
                        return h('th', { key: c, scope: 'col', className: 'px-1.5 py-1 font-bold text-slate-300 border-b border-white/10 whitespace-nowrap' }, c);
                      }))),
                      h('tbody', null, rows.map(function(r, i) {
                        return h('tr', { key: i, className: r.current ? 'bg-fuchsia-500/15 text-white font-bold' : '' },
                          h('th', { scope: 'row', className: 'px-1.5 py-1 font-bold whitespace-nowrap' }, r.label),
                          r.cells.map(function(c, j) { return h('td', { key: j, className: 'px-1.5 py-1 whitespace-nowrap' }, c); }));
                      }))))));
            })(),

            glossaryPanel('mt-3 text-left'),
            h('button', {
              title: t('stem.moonmission.reset_and_start_a_new_moon_mission_fro', 'Reset and start a new Moon mission from the beginning'),
              onClick: function() {
                // Keep this flight: "fly again and beat it" needs something to beat.
                var _flown = currentFlightSummary(new Date().toLocaleDateString());
                upd('flightHistory', function(cur) { return (Array.isArray(cur) ? cur : []).concat([_flown]).slice(-5); });
                upd('reflection', null);
                upd('predictions', null);
                upd('evaHopTime', null);
                upd('coastSlowest', null);      // what revealed the coast and launch cards last flight
                upd('launchMaxQ', null);
                upd('missionPhase', 0);
                upd('missionLog', []);
                upd('missionXP', 0);
                upd('lunarSamples', []);
                upd('missionStartTime', 0);
                upd('missionPausedAt', 0);
                upd('missionPausedTotal', 0);
                upd('earnedBadges', {});
                upd('quizCorrect', 0);
                upd('quizIdx', 0);
                upd('showQuiz', false);
                upd('quizAnswered', false);
                // Full mission-slice reset — these were missed, so on replay the random
                // events never re-fired (all ids stuck in resolvedEvents) and the
                // descent/EVA onboarding never re-showed.
                upd('resolvedEvents', []);
                upd('decisionLog', []);
                upd('activeEvent', null);
                upd('eventOutcome', null);
                upd('crewMorale', 75);          // 75 is the first-flight default — replay used to start 25 points richer
                upd('landingResult', null);
                upd('tliWindow', null);
                upd('tliAccuracy', null);
                upd('launchStatus', null);
                upd('ascentStatus', null);
                upd('reentryStatus', null);
                upd('orbitStatus', null);
                upd('seismoDeployed', false);
                upd('mccChoice', null);
                upd('entryAngle', null);
                upd('entryOutcome', null);
                // aiBriefing is kept: it is the teacher's customization of the whole
                // mission (objectives, samples, quiz), not something this flight earned.
                upd('aiBriefingLoading', false);
                upd('eventPhaseTarget', null);   // a stale target rewound the next flight
                upd('webglError', false);        // the next EVA opened on the error panel
                upd('descentStarted', false);
                upd('evaStarted', false);
                upd('quizSelectedAnswer', -1);
                upd('deltaVHunt', null);
                mmFocusWhenReady('[data-moonmission-phase-heading="0"]');
              },
              className: 'min-h-[44px] px-6 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700'
            }, t('stem.moonmission.fly_another_mission', '\uD83D\uDD04 Fly Another Mission'))
          )
        ),

        // The glossary followed the student instead of living only on the two screens
        // where nothing is happening. Collapsed, so it costs one line until it is wanted.
        (phase >= 1 && phase <= 9) && glossaryPanel('mt-3'),

        // === H7b'' inquiry widget: orbital delta-V discovery ===
        // Gated to the briefing + mission-complete phases — this light-theme panel was rendering on EVERY
        // phase, stacking a jarring light card beneath the dark immersive launch/orbit/EVA canvases.
        (phase === 0 || phase >= 10) && (function() {
          var iq = d.deltaVHunt || { massRatio: 3, burnDur: 180, isp: 311, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
          function setIQ(patch) { upd('deltaVHunt', Object.assign({}, iq, patch)); }
          var g = 9.81;
          var deltaV = iq.isp * g * Math.log(iq.massRatio);
          // Orbit needs ~7.8 km/s of speed plus ~1.5 km/s lost to gravity and drag on the
          // way up; the trip to the Moon adds ~3.1 km/s more. The old thresholds ignored
          // the losses, and their "escape" state was out of reach of every setting (best
          // case here is ~11.0 km/s). One stage cannot reach the Moon, and saying so is
          // the lesson: it is why the Saturn V had three.
          var orbit = deltaV < 9400 ? 'insufficient' : (deltaV < 12500 ? 'leo' : 'escape');
          var orbitMeta = {
            insufficient: { label: t('stem.moonmission.insufficient_suborbital', '🔴 Insufficient — suborbital'), color: '#b91c1c', bg: 'rgba(220,38,38,0.10)', border: '#ef4444' },
            leo:          { label: t('stem.moonmission.leo_earth_orbit', '🟢 LEO / Earth orbit'),          color: '#047857', bg: 'rgba(16,185,129,0.10)', border: '#10b981' },
            escape:       { label: t('stem.moonmission.escape_velocity_lunar_beyond', '🚀 Enough for the Moon (about 12.5 km/s)'), color: '#0369a1', bg: 'rgba(14,165,233,0.10)', border: '#0ea5e9' }
          }[orbit];
          function logObs() {
            setIQ({ log: (iq.log || []).concat([{ mr: iq.massRatio, bd: iq.burnDur, isp: iq.isp, dv: Math.round(deltaV), o: orbit }]).slice(-8) });
          }
          return h('details', {
            className: 'mt-3 rounded-lg border border-indigo-400/60 bg-slate-900 overflow-hidden',
            'data-moonmission-deltav': 'true'
          },
            h('summary', { className: 'px-3 py-2 text-[0.6875rem] font-bold text-indigo-200 cursor-pointer' },
              t('stem.moonmission.deltav_summary', '\uD83D\uDEF0\uFE0F Optional lab: the rocket equation \u2014 why fuel decides everything')),
            h('div', { className: 'p-3 bg-slate-50 border-t border-indigo-300' },
            h('div', { className: 'text-sm font-black text-indigo-700 mb-1' }, t('stem.moonmission.orbital_delta_v_discovery', '🛰️ Orbital delta-V discovery')),
            h('p', { className: 'text-[0.6875rem] text-slate-700 mb-2 leading-relaxed' },
              t('stem.moonmission.deltav_intro_student', 'Tsiolkovsky\'s rocket equation decides how much speed a rocket can gain. Change the mass ratio, burn time and specific impulse (Isp), and see whether one stage falls short, reaches Earth orbit, or has enough for the Moon. There is no score: log what you try and look for the pattern.')),
            h('div', { className: 'mb-2 p-2 rounded text-center', style: { background: orbitMeta.bg, border: '1px solid ' + orbitMeta.border } },
              h('div', { className: 'text-sm font-black', style: { color: orbitMeta.color } }, orbitMeta.label),
              h('div', { className: 'text-[0.625rem] text-slate-700 mt-1' }, 'Δv = ' + Math.round(deltaV) + ' m/s')
            ),
            h('div', { className: 'grid grid-cols-3 gap-2 mb-2' },
              [
                { key: 'massRatio', label: t('stem.moonmission.mass_ratio', 'Mass ratio'), val: iq.massRatio, min: 1.2, max: 12, step: 0.1 },
                { key: 'burnDur',   label: t('stem.moonmission.burn_dur_s', 'Burn dur (s)'), val: iq.burnDur,   min: 30, max: 600, step: 10 },
                { key: 'isp',       label: t('stem.moonmission.isp_s', 'Isp (s)'),     val: iq.isp,       min: 100, max: 450, step: 5 }
              ].map(function(s) {
                return h('div', { key: s.key },
                  h('label', { htmlFor: 'dv-' + s.key, className: 'block text-[0.625rem] font-bold text-slate-700 mb-0.5' },
                    s.label + ': ', h('span', { className: 'font-mono text-indigo-700' }, s.val)),
                  h('input', { id: 'dv-' + s.key, type: 'range', 'aria-valuetext': (s.key === 'massRatio' ? (s.val + ' to 1 mass ratio') : s.key === 'isp' ? (s.val + ' seconds specific impulse') : (s.val + ' seconds')), min: s.min, max: s.max, step: s.step, value: s.val,
                    onChange: function(e) { var p = {}; p[s.key] = parseFloat(e.target.value); setIQ(p); },
                    className: 'w-full h-11 cursor-pointer accent-indigo-600', 'aria-label': s.label }));   // was 16px tall
              })
            ),
            h('div', { className: 'flex gap-1 items-center mb-2 flex-wrap' },
              h('button', { onClick: logObs, className: 'min-h-[44px] px-3 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700' }, t('stem.moonmission.log', '📋 Log')),
              h('button', { onClick: function() { setIQ({ massRatio: 3, burnDur: 180, isp: 311, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); },
                className: 'min-h-[44px] px-3 rounded-lg bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-300' }, t('stem.moonmission.reset', '↺ Reset')),
              (iq.log || []).length > 0 && h('span', { className: 'text-[0.625rem] text-slate-500 italic' }, (iq.log || []).length + ' logged')
            ),
            (iq.log || []).length > 0 && h('table', { className: 'text-[0.625rem] w-full border-collapse text-slate-700 mb-2' },
              h('thead', null, h('tr', { className: 'bg-slate-100' },
                ['mass ratio', 'burn s', 'Isp s', 'Δv m/s', 'outcome'].map(function(c, i) { return h('th', { key: 'h' + i, scope: 'col', className: 'px-1 border border-slate-200 text-left' }, c); }))),
              h('tbody', null, iq.log.map(function(o, idx) {
                return h('tr', { key: 'lr' + idx },
                  h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.mr),
                  h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.bd),
                  h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.isp),
                  h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.dv),
                  h('td', { className: 'px-1 border border-slate-200' }, o.o));
              }))
            ),
            h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); },
               'aria-label': t('stem.moonmission.hypothesis_input', 'Mission delta-v hypothesis'), placeholder: t('stem.moonmission.hypothesis_free_text_no_right_answer_w', 'Hypothesis (free text — no right answer): Which lever matters most?'),
              className: 'w-full text-[0.6875rem] border border-slate-300 rounded p-1 font-mono leading-snug mb-2', rows: 2 }),
            !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); },
              className: 'min-h-[44px] px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 border border-amber-300 mb-2' },
              t('stem.moonmission.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
            iq.stuckRevealed && h('div', { className: 'p-2 rounded bg-amber-50 border border-amber-200 text-[0.625rem] text-slate-700 leading-relaxed mb-2' },
              h('ul', { className: 'list-disc pl-4 space-y-0.5' },
                h('li', null, t('stem.moonmission.hold_two_sliders_steady_move_one_watch', 'Hold two sliders steady. Move one. Watch.')),
                h('li', null, t('stem.moonmission.find_two_settings_producing_the_same_o', 'Find two settings producing the same outcome.')),
                h('li', null, t('stem.moonmission.which_slider_affects_v_the_most_use_th', 'Which slider affects Δv the most? Use the log.')),
                h('li', null, t('stem.moonmission.real_spacecraft_trade_fuel_mass_agains', 'Real spacecraft trade fuel mass against Isp. Investigate why.')),
                h('li', null, t('stem.moonmission.deltav_one_stage_moon', 'Orbit takes about 9.4 km/s (7.8 of speed plus losses to gravity and drag); the Moon about 12.5. Can any single-stage setting get there? What did the Saturn V do instead?')))),
            h('div', { className: 'p-2 rounded bg-emerald-50 border border-emerald-200' },
              h('label', { className: 'flex items-center gap-2 min-h-[44px] text-xs font-bold text-emerald-800 cursor-pointer' },
                h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-6 h-6 flex-shrink-0' }),
                t('stem.moonmission.i_think_i_understand_the_trade_offs', 'I think I understand the trade-offs')),
              iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); },
                 'aria-label': t('stem.moonmission.explanation_input', 'Mission delta-v explanation'), placeholder: t('stem.moonmission.explain_in_your_own_words_how_do_mass_', 'Explain in your own words: how do mass ratio, burn duration, and Isp interact?'),
                className: 'w-full text-[0.6875rem] border border-emerald-300 rounded p-1 font-mono leading-snug mt-1', rows: 3 })),
            h('div', { className: 'mt-2 text-[0.625rem] italic text-slate-500' },
              t('stem.moonmission.deltav_no_score_note', 'No score and no answer key here, on purpose: your log and your explanation are the result.'))
            )
          );
        })(),

        // Mission Log (collapsible)
        missionLog.length > 0 && h('details', {
          className: 'mt-3 rounded-lg border border-slate-600 bg-slate-900 overflow-hidden',
          'data-moonmission-log': 'true'
        },
          h('summary', { className: 'px-3 py-2 text-[0.6875rem] font-bold text-slate-200 cursor-pointer' },
            '\uD83D\uDCCB ' + t('stem.moonmission.mission_log_summary', 'Mission log') + ' (' + missionLog.length + ')'),
          h('div', { className: 'p-2 bg-slate-50 border-t border-slate-400 space-y-0.5 max-h-32 overflow-y-auto' },
            missionLog.slice(-8).reverse().map(function(entry, i) {
              return h('div', { key: i, className: 'flex justify-between text-[0.6875rem]' },
                h('span', { className: 'text-slate-600' }, entry.text),
                h('span', { className: 'text-slate-700 font-mono' }, entry.time)
              );
            })
          )
        )
      );
    }
  });
})();
}
