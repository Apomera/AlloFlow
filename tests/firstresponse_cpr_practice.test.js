// First Response — CPR + AED lab: what the Practice window actually scores.
//
// The Practice tab used to grade a 30-second run by averaging over the span
// between the FIRST and the LAST tap. That measures the half of CPR a learner
// finds easy (rate) and erases the half that decides survival (not stopping):
// compress well for eight seconds, quit for twenty-two, and the old scorer read
// "110 bpm, in range" and handed out the badge, because the twenty-two seconds
// of nothing fell outside the span being averaged.
//
// So what is pinned here is the SCORING CONTRACT, not the layout:
//   · the window is the full 30 seconds, not the tap span
//   · silence before the first compression and after the last one are pauses
//   · a run can hold a perfect rate and still fail
//   · rate comes from analyzeCprTiming — one verdict, one derivation, shared
//     with the 3D coach rather than re-derived here
//   · the AED walkthrough cannot be finished without seeing an outcome branch
//
// A refactor that reinstates a span average, or lets "Next" skip the shock /
// no-shock decision, still renders perfectly. These tests are what would catch it.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.FR_TOOL_FILE || 'stem_lab/stem_tool_firstresponse.js';
const ID = 'firstResponse';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');

// Slice the pure scoring block out of the source and evaluate it on its own, so
// the maths is testable without a clock, a DOM, or a React tree.
function loadScoring() {
  const start = SRC.indexOf('  var CPR_COACH_SPEC = {');
  const end = SRC.indexOf('  var BREATHING_GATE = [');
  expect(start, 'CPR_COACH_SPEC not found').toBeGreaterThan(-1);
  expect(end, 'BREATHING_GATE not found').toBeGreaterThan(start);
  const chunk = SRC.slice(start, end);
  const tail = '\nreturn { analyzeCprPractice: analyzeCprPractice, analyzeCprTiming: analyzeCprTiming, SPEC: CPR_PRACTICE_SPEC };';
  try {
    // eslint-disable-next-line no-new-func
    return new Function(chunk + tail)();
  } catch (err) {
    // Report the absence per test rather than aborting collection, so a source
    // without the scorer fails these cases one by one instead of hiding the
    // render assertions behind an import-time error.
    const missing = () => {
      throw new Error('analyzeCprPractice is not present in ' + FILE + ': ' + err.message);
    };
    return { analyzeCprPractice: missing, analyzeCprTiming: missing, SPEC: {} };
  }
}

const { analyzeCprPractice, SPEC } = loadScoring();

// Real-host state shape: ctx.update(toolId, key, val) / ctx.updateMulti(toolId, obj).
function applyPatch(store, toolId, patch) {
  const prev = store.toolData[toolId] || {};
  const changed = Object.keys(patch).some((k) => prev[k] !== patch[k]);
  if (!changed) return;
  store.toolData = Object.assign({}, store.toolData, {
    [toolId]: Object.assign({}, prev, patch),
  });
  store.dirty = true;
}

// Render First Response the way the host does, replaying until the tool stops
// writing state, so the 30-second finalize actually runs.
function renderFr(extra, passes = 8) {
  const store = newStore({
    firstResponse: Object.assign({ view: 'cprAed', consentAccepted: true }, extra || {}),
  });
  const cfg = window.StemLab && window.StemLab._registry[ID];
  if (!cfg) throw new Error('renderFr: tool not loaded');
  let html = '';
  for (let pass = 0; pass < passes; pass++) {
    store.dirty = false;
    const ctx = makeCtx({
      toolData: store.toolData,
      update: function (toolId, key, val) {
        const patch = {};
        patch[key] = val;
        applyPatch(store, toolId, patch);
      },
      updateMulti: function (toolId, obj) { applyPatch(store, toolId, obj || {}); },
    }, store);
    const Comp = function () { return cfg.render(ctx); };
    html = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp));
    if (!store.dirty) break;
  }
  return html;
}

// Compressions at `bpm` for `seconds`, anchored to a window that started `agoMs` ago.
function liveTaps(startMs, bpm, seconds) {
  const step = 60000 / bpm;
  const out = [];
  for (let t = 0; t <= seconds * 1000; t += step) out.push(startMs + t);
  return out;
}

const START = 1_000_000;
const WINDOW = 30_000;

// Taps at `bpm`, starting `offsetMs` into the window, for `seconds` seconds.
function taps(bpm, seconds, offsetMs = 0) {
  const step = 60000 / bpm;
  const out = [];
  for (let t = 0; t <= seconds * 1000; t += step) out.push(START + offsetMs + t);
  return out;
}

describe('CPR practice scoring — the window is 30 seconds, not the tap span', () => {
  it('scores a full 30 seconds of good compressions as a pass', () => {
    const s = analyzeCprPractice(taps(110, 30), START, START + WINDOW);
    expect(s.medianBpm).toBeGreaterThanOrEqual(100);
    expect(s.medianBpm).toBeLessThanOrEqual(120);
    expect(s.rateOk).toBe(true);
    expect(s.pauseOk).toBe(true);
    expect(s.fractionOk).toBe(true);
    expect(s.fractionPct).toBeGreaterThanOrEqual(95);
    expect(s.passed).toBe(true);
  });

  it('fails a learner who compresses at the right rate and then stops', () => {
    // The exact defect: 8 seconds of textbook rhythm, 22 seconds of nothing.
    const s = analyzeCprPractice(taps(110, 8), START, START + WINDOW);
    expect(s.rateOk, 'rate itself was fine — that is the trap').toBe(true);
    expect(s.fractionPct).toBeLessThan(SPEC.minFractionPct);
    expect(s.fractionOk).toBe(false);
    expect(s.pauseOk).toBe(false);
    expect(s.passed).toBe(false);
  });

  it('counts the silence AFTER the last compression as a pause', () => {
    const s = analyzeCprPractice(taps(110, 8), START, START + WINDOW);
    // ~22 seconds of tail, which a span average cannot see at all.
    expect(s.longestPauseMs).toBeGreaterThan(20_000);
  });

  it('counts the silence BEFORE the first compression as a pause', () => {
    // Started the timer, froze for 12 seconds, then compressed to the end.
    const s = analyzeCprPractice(taps(110, 18, 12_000), START, START + WINDOW);
    expect(s.longestPauseMs).toBeGreaterThanOrEqual(12_000);
    expect(s.pauseOk).toBe(false);
  });

  it('fails a mid-run interruption even when everything around it is correct', () => {
    const before = taps(110, 9);
    const after = taps(110, 9, 21_000);
    const s = analyzeCprPractice(before.concat(after), START, START + WINDOW);
    expect(s.rateOk).toBe(true);
    expect(s.longestPauseMs).toBeGreaterThanOrEqual(SPEC.maxPauseMs);
    expect(s.pauseOk).toBe(false);
    expect(s.passed).toBe(false);
  });

  it('holds a pause just under the limit as acceptable', () => {
    const before = taps(110, 10);
    const after = taps(110, 11, 19_000); // 9-second gap
    const s = analyzeCprPractice(before.concat(after), START, START + WINDOW);
    expect(s.longestPauseMs).toBeLessThan(SPEC.maxPauseMs);
    expect(s.pauseOk).toBe(true);
  });

  it('fails a run whose rate is only an AVERAGE, not a rhythm', () => {
    // Alternating 400 ms / 700 ms for the full window: median 109 bpm, 99%
    // compression fraction, no pause — and NOT ONE interval inside 100-120.
    const list = [START];
    let t = START;
    let i = 0;
    while (t - START < WINDOW) {
      t += i % 2 ? 700 : 400;
      i++;
      if (t - START <= WINDOW) list.push(t);
    }
    const s = analyzeCprPractice(list, START, START + WINDOW);
    expect(s.medianBpm).toBeGreaterThanOrEqual(100);
    expect(s.medianBpm).toBeLessThanOrEqual(120);
    expect(s.rateOk, 'the median is in band — that is the trap').toBe(true);
    expect(s.fractionOk).toBe(true);
    expect(s.pauseOk).toBe(true);
    expect(s.inRangePct, 'no single interval was actually in the band').toBe(0);
    expect(s.steadyOk).toBe(false);
    expect(s.passed).toBe(false);
  });

  it('does not punish a learner holding a steady rate at the edge of the band', () => {
    // 100 bpm is the band FLOOR, so ordinary jitter drops half the intervals
    // below it. Scoring in-band share instead of dispersion would fail this
    // run, which is exactly the learner the tool wants to keep.
    const jittered = [];
    let t = START;
    let i = 0;
    while (t - START <= WINDOW) {
      jittered.push(t);
      t += 600 + ((i % 3) - 1) * 25;
      i++;
    }
    const s = analyzeCprPractice(jittered, START, START + WINDOW);
    expect(s.inRangePct).toBeLessThan(80);
    expect(s.steadyOk).toBe(true);
    expect(s.passed).toBe(true);
  });

  it('will not call a rhythm steady before there is a rhythm', () => {
    // Two taps have zero spread, so raw consistency reads 100.
    const s = analyzeCprPractice([START, START + 545], START, START + WINDOW);
    expect(s.consistencyPct).toBeGreaterThan(90);
    expect(s.steadyKnown).toBe(false);
    expect(s.steadyOk).toBe(false);
    expect(s.passed).toBe(false);
  });

  it('takes the rate from the median, so one fumbled tap does not define the run', () => {
    const list = taps(110, 30);
    list.splice(10, 0, list[10] - 200); // one double-tap
    const s = analyzeCprPractice(list, START, START + WINDOW);
    expect(s.medianBpm).toBeGreaterThanOrEqual(100);
    expect(s.medianBpm).toBeLessThanOrEqual(120);
  });

  it('does not crash or claim success on an empty run', () => {
    const s = analyzeCprPractice([], START, START + WINDOW);
    expect(s.compressions).toBe(0);
    expect(s.fractionPct).toBe(0);
    expect(s.longestPauseMs).toBe(WINDOW);
    expect(s.passed).toBe(false);
  });

  it('refuses to pass a run with too few compressions to judge', () => {
    const s = analyzeCprPractice(taps(110, 2), START, START + WINDOW);
    expect(s.compressions).toBeLessThan(SPEC.minCompressions);
    expect(s.passed).toBe(false);
  });

  it('states the AHA targets it is scoring against', () => {
    expect(SPEC.maxPauseMs).toBe(10_000);
    expect(SPEC.minFractionPct).toBe(60);
    expect(SPEC.minConsistencyPct).toBe(60);
    expect(SPEC.windowSec).toBe(30);
  });
});

describe('CPR practice scoring — one verdict, one derivation', () => {
  it('routes the Practice tab through the shared analyzer', () => {
    expect(SRC).toContain('var live = analyzeCprPractice(taps, practiceStart');
    expect(SRC).toContain('analyzeCprPractice(practiceTaps || [], practiceStart, practiceStart + windowMs)');
  });

  it('no longer re-derives a rate from the tap span', () => {
    expect(SRC).not.toContain('60 * (taps.length - 1)');
  });

  it('gates the badge on every criterion, not on rate alone', () => {
    expect(SRC).toContain("if (live.passed) awardBadge('cpr_rhythm'");
    // The badge text is what the learner carries away, so it has to name what
    // was actually verified.
    expect(SRC).toMatch(/awardBadge\('cpr_rhythm', 'CPR Rhythm \(steady/);
  });

  it('surfaces steadiness rather than computing it and throwing it away', () => {
    expect(SRC).toContain("stem.firstresponse.stat_steady");
    expect(SRC).toContain("stem.firstresponse.result_steady_label");
  });
});

describe('CPR practice — what the learner is shown', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  function practice(extra) {
    return renderFr(Object.assign({ cprView: 'practice' }, extra || {}));
  }

  it('renders the practice tab at rest', () => {
    const html = practice();
    expect(html).toContain('Practice');
    expect(html).toContain('Start');
  });

  it('shows live rate, hands-off and compression-fraction readouts during a run', () => {
    const now = Date.now();
    const html = practice({
      cprPracticeRunning: true,
      cprPracticeStart: now - 10_000,
      cprPracticeTaps: [now - 2000, now - 1450, now - 900, now - 350],
    });
    expect(html).toContain('Hands off');
    expect(html).toContain('Compressing');
  });

  it('warns on screen once the hands have been off the chest too long', () => {
    const now = Date.now();
    const html = practice({
      cprPracticeRunning: true,
      cprPracticeStart: now - 20_000,
      cprPracticeTaps: [now - 19_000, now - 18_400, now - 17_800],
    });
    expect(html).toContain('Hands off the chest');
    expect(html).toContain('Blood flow stops the moment you stop');
  });

  it('debriefs a stop-and-quit run as a failure, not as 110 bpm', () => {
    // Window already elapsed, so the render finalizes the run for real.
    const start = Date.now() - 40_000;
    const html = practice({
      cprPracticeRunning: true,
      cprPracticeStart: start,
      cprPracticeTaps: liveTaps(start, 110, 8),
    });
    // The rate was perfect and the run still has to read as a failure.
    expect(html).toContain('below the 60% target');
    expect(html).toContain('over 10 seconds');
    expect(html).not.toContain('All four: rate, steadiness, pauses, and compression time');
  });

  it('debriefs a complete, correct run as a pass', () => {
    const start = Date.now() - 40_000;
    const html = practice({
      cprPracticeRunning: true,
      cprPracticeStart: start,
      cprPracticeTaps: liveTaps(start, 110, 30),
    });
    expect(html).toContain('All four: rate, steadiness, pauses, and compression time');
  });

  it('keeps saying it cannot teach depth or recoil', () => {
    const html = practice();
    expect(html).toMatch(/depth \(about 2 inches on an adult\)/);
    expect(html).toContain('redcross.org');
  });
});

describe('AED walkthrough — the decision step is not a slide', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  function aed(extra) {
    return renderFr(Object.assign({ cprView: 'aed' }, extra || {}));
  }

  it('blocks Next on the shock / no-shock step until a branch is picked', () => {
    const html = aed({ aedStep: 4 });
    expect(html).toContain('Pick what the AED said to continue');
    expect(html).toContain('aria-disabled="true"');
    expect(SRC).toContain('var branchNeeded = aedStep === 4 && !aedShockBranch;');
    expect(SRC).toContain('if (branchNeeded) {');
  });

  it('does not block any other step', () => {
    for (const step of [0, 1, 2, 3, 5]) {
      expect(aed({ aedStep: step })).not.toContain('Pick what the AED said to continue');
    }
  });

  it('teaches that "no shock advised" does not mean the patient is fine', () => {
    const html = aed({ aedStep: 4, aedShockBranch: 'noshock' });
    expect(html).toContain('does not mean they are fine');
    expect(html).toContain('resume compressions immediately');
  });

  it('teaches that compressions resume the instant the shock lands', () => {
    const html = aed({ aedStep: 4, aedShockBranch: 'shock' });
    expect(html).toContain('go straight back to compressions');
  });
});

describe('CPR overview — hands-only is scoped, and its exception is named', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  const overview = () => renderFr({ cprView: 'overview' });

  it('still recommends hands-only for a sudden adult collapse', () => {
    const html = overview();
    expect(html).toContain('Hands-only CPR');
    expect(html).toContain('adults who collapse suddenly');
  });

  it('scopes the numbered sequence to an adult, rather than leaving it universal', () => {
    expect(overview()).toContain('For an adult who collapsed in front of you');
  });

  it('names every arrest where compressions alone are not the advice', () => {
    const html = overview();
    // Asphyxial arrest: the blood has run out of oxygen, so moving it does less.
    // The tool already taught this in the drowning and infant scenarios and in
    // the 3D coach; the front page of the CPR lab did not.
    expect(html).toContain('When compressions alone are not enough');
    for (const who of ['Infants and children', 'Drowning', 'Choking', 'Drug or opioid overdose']) {
      expect(html, 'missing exception: ' + who).toContain(who);
    }
  });

  it('gives the ratio, not just the warning', () => {
    expect(overview()).toContain('30 compressions to 2 breaths');
  });

  it('carries the infant airway caveat wherever it asks for breaths', () => {
    // An infant is not a small adult: tilting the head back kinks a short soft
    // trachea shut. Asking for breaths without this is how infant rescue
    // breathing fails.
    const html = overview();
    expect(html).toMatch(/neutral/);
    expect(html).toContain('sniffing');
    expect(html).toMatch(/NOT tilted back/);
  });

  it('never leaves a bystander with breaths as a precondition for starting', () => {
    // The failure mode of this whole card would be a rescuer who freezes
    // because they cannot give breaths. The fallback is load-bearing.
    const html = overview();
    expect(html).toContain('If you cannot or will not give breaths, push anyway');
    expect(html).toContain('far better than nothing');
  });

  it('routes to the 3D coach that actually drills the 30:2 cycle', () => {
    expect(overview()).toContain('Practise 30:2 in 3D');
    expect(SRC).toContain("updMulti({ view: 'body3d', b3dTab: 'coach' })");
  });
});

describe('CPR module — screen readers do not get English', () => {
  it('translates the four tab labels, which feed label + aria-label + announcement', () => {
    expect(SRC).toContain("tabBtn('overview', __alloT('stem.firstresponse.cpr_tab_overview'");
    expect(SRC).toContain("tabBtn('metronome', __alloT('stem.firstresponse.cpr_tab_metronome'");
    expect(SRC).toContain("tabBtn('practice', __alloT('stem.firstresponse.cpr_tab_practice'");
    expect(SRC).toContain("tabBtn('aed', __alloT('stem.firstresponse.cpr_tab_aed'");
  });

  it('translates the metronome and practice controls', () => {
    for (const key of [
      'stem.firstresponse.sr_beats_per_minute_currently',
      'stem.firstresponse.sr_audio_on_click_to_mute',
      'stem.firstresponse.sr_audio_off_click_to_enable',
      'stem.firstresponse.sr_tap_to_record_a_compression',
      'stem.firstresponse.sr_practice_not_running_press_start',
    ]) {
      expect(SRC, 'untranslated: ' + key).toContain(key);
    }
  });

  it('translates the spoken practice result and the AED step announcements', () => {
    expect(SRC).toContain('stem.firstresponse.sr_practice_complete_summary');
    expect(SRC).toContain('stem.firstresponse.sr_practice_stopped_early');
    expect(SRC).toContain('stem.firstresponse.sr_step_n');
    expect(SRC).toContain('stem.firstresponse.sr_next_blocked_pick_a_branch');
  });

  it('leaves no bare English aria-label in the CPR + AED module', () => {
    // Scope the scan to renderCprAed()'s own body.
    const start = SRC.indexOf('function renderCprAed() {');
    const end = SRC.indexOf('// BLEED module');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = SRC.slice(start, end);
    const bare = block.match(/'aria-label': '[^']+'/g) || [];
    expect(bare).toEqual([]);
  });
});

describe('CPR practice — the copy keeps up with the scorer', () => {
  // Copy-vs-data drift has bitten this tool before (a scope line and a menu
  // tile both went stale when the data behind them changed). Write counts as
  // code: adding a criterion means the sentence that lists them is wrong.
  it('promises exactly the number of measures it reports', () => {
    expect(SRC).toContain('This window scores four things');
    expect(SRC).not.toContain('This window scores your rate, your longest hands-off pause, and the share');
  });

  it('does not attribute the steadiness check to the AHA', () => {
    // Rate, pause and fraction targets are guideline numbers. Steadiness is
    // this tool's own derivation and has to be labelled as such.
    expect(SRC).toContain('Steadiness is this tool’s own check');
    expect(SRC).not.toContain("Targets from the 2025 AHA Guidelines for CPR & ECC: 100–120 compressions per minute, interruptions under 10 seconds, chest compression fraction of at least 60%.')");
  });
});

// ── Metronome audio ─────────────────────────────────────────────────────────
// The audio click is the ONLY rhythm channel a blind learner has here: the
// pulsing heart and the row of dots are both aria-hidden. It used to construct
// its AudioContext inside the setInterval callback and never call resume(), so
// on any browser enforcing the autoplay policy the context stayed "suspended"
// and the metronome was silent for the rest of the session — while the button
// read "Audio on".
describe('metronome audio — the one channel a blind learner has', () => {
  // frEnsureAudio lives inside render() and closes over audioCtxRef, so slice it
  // out and run it against an injected ref, the same way the scorer is tested.
  function loadEnsureAudio(ref, win) {
    const start = SRC.indexOf('      function frEnsureAudio() {');
    expect(start, 'frEnsureAudio not found').toBeGreaterThan(-1);
    const open = SRC.indexOf('{', start);
    let depth = 0;
    let end = -1;
    for (let i = open; i < SRC.length; i++) {
      if (SRC[i] === '{') depth++;
      else if (SRC[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    const src = SRC.slice(start, end + 1).trim();
    // eslint-disable-next-line no-new-func
    return new Function('audioCtxRef', 'window', src + '\nreturn frEnsureAudio;')(ref, win);
  }

  function fakeAC(initialState) {
    return function () {
      this.state = initialState;
      this.resumed = 0;
      this.resume = () => { this.resumed++; this.state = 'running'; };
    };
  }

  it('creates a context on first use', () => {
    const ref = { current: null };
    const ensure = loadEnsureAudio(ref, { AudioContext: fakeAC('running') });
    const ac = ensure();
    expect(ac).toBeTruthy();
    expect(ref.current).toBe(ac);
  });

  it('resumes a context the browser suspended — the actual defect', () => {
    const ref = { current: null };
    const ensure = loadEnsureAudio(ref, { AudioContext: fakeAC('suspended') });
    const ac = ensure();
    expect(ac.resumed).toBe(1);
    expect(ac.state).toBe('running');
  });

  it('reuses the one context instead of making one per tick', () => {
    // Browsers cap a tab at roughly 4-6 AudioContexts; this file already lost
    // metronome audio that way once and closes the context on unmount for it.
    const ref = { current: null };
    let built = 0;
    const AC = function () { built++; this.state = 'running'; this.resume = () => {}; };
    const ensure = loadEnsureAudio(ref, { AudioContext: AC });
    ensure(); ensure(); ensure();
    expect(built).toBe(1);
  });

  it('returns null rather than throwing where there is no Web Audio at all', () => {
    const ref = { current: null };
    const ensure = loadEnsureAudio(ref, {});
    expect(ensure()).toBe(null);
  });

  it('survives a constructor that throws', () => {
    const ref = { current: null };
    const ensure = loadEnsureAudio(ref, { AudioContext: function () { throw new Error('blocked'); } });
    expect(() => ensure()).not.toThrow();
    expect(ensure()).toBe(null);
  });

  it('only plays a click through a context that is actually running', () => {
    expect(SRC).toContain("var ac = frEnsureAudio();");
    expect(SRC).toContain("if (ac && ac.state === 'running') {");
  });

  it('unlocks the context from the toggle, which is the real user gesture', () => {
    expect(SRC).toContain('if (!audioOn) frEnsureAudio();');
  });

  it('admits it when the browser is holding the sound', () => {
    expect(SRC).toContain('var audioBlocked = audioOn && !!audioCtxRef.current');
    expect(SRC).toContain("audioCtxRef.current.state !== 'running'");
    // resume() is async, so a grace window keeps the banner from flashing on
    // every successful enable. A warning that cries wolf trains users to ignore it.
    expect(SRC).toContain('(Date.now() - (audioCtxRef.resumeAskedAt || 0)) > 1200');
    expect(SRC).toContain('stem.firstresponse.audio_blocked_title');
  });

  it('does not cry wolf before any context exists', () => {
    // SSR runs no effects and dispatches no clicks, so the ref is null here —
    // exactly the "not started yet" case, which must stay quiet.
    const html = renderFr({ cprView: 'metronome', cprAudio: true });
    expect(html).not.toContain('Your browser is holding the sound');
  });

  it('drops the dead pulseScale helper that no caller ever had', () => {
    // It carried the prefers-reduced-motion comment while being unreachable, so
    // an audit reading it would tick a box nothing implemented. The live
    // accommodation is the inline animation:'none' on the heart.
    expect(SRC).not.toContain('function pulseScale()');
    expect(SRC).toContain("(prefers-reduced-motion: reduce)').matches) ? 'none'");
  });
});

// ── The decision that comes before the steps ────────────────────────────────
// "agonal" appears 21 times in this file and used to appear ZERO times in the
// CPR + AED module — the tool's own highest-stakes teaching point was missing
// from the lab named after it. body3d calls this gate "the fatal error" to get
// backwards, so both branches are pinned, not just the warning.
describe('CPR overview — the breathing gate reaches the 2D lab', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  const overview = () => renderFr({ cprView: 'overview' });

  it('names agonal gasping instead of only saying "not breathing normally"', () => {
    const html = overview();
    expect(html).toContain('agonal breathing');
    expect(html).toContain('Gasping counts as not breathing');
  });

  it('routes gasping to CPR', () => {
    expect(overview()).toContain('Not breathing, or only occasional gasps → CPR');
  });

  it('routes normal breathing to the recovery position, NOT to compressions', () => {
    // A one-sided "when in doubt, push" would trade one fatal error for an
    // injury: this tool marks compressions on a breathing person as harmful.
    const html = overview();
    expect(html).toContain('Breathing normally, but will not wake up → recovery position');
    expect(html).toContain('cause real injury');
  });

  it('puts the gate ahead of the numbered sequence', () => {
    const html = overview();
    expect(html.indexOf('is this cardiac arrest?')).toBeGreaterThan(-1);
    expect(html.indexOf('is this cardiac arrest?'))
      .toBeLessThan(html.indexOf('For an adult who collapsed in front of you'));
  });

  it('keeps the gasping caveat in the numbered Check step too', () => {
    expect(overview()).toContain('gasping counts as not breathing');
  });

  it('routes to the 3D gate that drills the same judgement', () => {
    expect(overview()).toContain('See the difference in 3D');
    expect(SRC).toContain("updMulti({ view: 'body3d', b3dTab: 'gate' })");
  });
});

describe('AED walkthrough — the rule the 2D lab had dropped', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  it('warns about an implanted pacemaker or defibrillator', () => {
    // Present exactly once in the whole file (body3d's AED_RULES) and absent
    // from this walkthrough entirely.
    const html = renderFr({ cprView: 'aed', aedStep: 1 });
    expect(html).toContain('implanted pacemaker or defibrillator');
    expect(html).toMatch(/an inch or so to the side/);
  });

  it('gives the reason a wet chest has to be dried', () => {
    const html = renderFr({ cprView: 'aed', aedStep: 1 });
    expect(html).toContain('water spreads the current across the skin instead of through the chest');
  });
});

// ── Two defects in the practice UI added earlier in this session ────────────
describe('CPR practice UI — state is not carried by colour alone', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  // A run that is going badly: started 20 s ago, three taps right at the start,
  // nothing since.
  function badRun() {
    const now = Date.now();
    return renderFr({
      cprView: 'practice',
      cprPracticeRunning: true,
      cprPracticeStart: now - 20_000,
      cprPracticeTaps: [now - 19_000, now - 18_400, now - 17_800],
    });
  }

  it('labels a failing readout in words, not just in amber', () => {
    // WCAG 1.4.1. Both tile colours clear 8:1 on the card, so this was never a
    // contrast failure — but they sit within 0.5 of each other in luminance,
    // so pass and fail were identical in greyscale and to a deuteranope.
    expect(badRun()).toContain('Needs work');
  });

  it('labels a healthy readout in words too', () => {
    const now = Date.now();
    const taps = [];
    for (let t = 12_000; t >= 0; t -= 545) taps.push(now - t);
    const html = renderFr({
      cprView: 'practice',
      cprPracticeRunning: true,
      cprPracticeStart: now - 12_000,
      cprPracticeTaps: taps,
    });
    expect(html).toContain('On track');
  });

  it('says a steadiness reading is not available yet rather than showing it green', () => {
    expect(badRun()).toContain('Not enough yet');
  });

  it('hides the status glyph from screen readers, which get the word instead', () => {
    expect(SRC).toContain("h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, st.glyph)");
  });
});

describe('CPR practice UI — the hands-off warning does not spam a screen reader', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  // The whole component re-renders once per metronome tick (~545 ms at 110
  // bpm). A role="status" region holding a live seconds counter therefore
  // changed ~110 times a minute, and a screen reader read the entire sentence
  // again every time — during the 30 seconds the learner is trying to hold a
  // rhythm. What must stay constant is the ANNOUNCED text.
  function announcedText(secondsIntoPause) {
    const now = Date.now();
    const html = renderFr({
      cprView: 'practice',
      cprPracticeRunning: true,
      cprPracticeStart: now - (secondsIntoPause + 2) * 1000,
      cprPracticeTaps: [now - secondsIntoPause * 1000],
    });
    const div = document.createElement('div');
    div.innerHTML = html;
    const status = div.querySelector('[role="status"]');
    expect(status, 'no live region rendered at ' + secondsIntoPause + 's').toBeTruthy();
    // Screen readers compute live-region text from the accessibility tree, and
    // aria-hidden subtrees are not in it.
    [...status.querySelectorAll('[aria-hidden="true"]')].forEach((el) => el.remove());
    return status.textContent.trim();
  }

  it('announces the same sentence however long the pause has run', () => {
    const at6 = announcedText(6);
    const at9 = announcedText(9);
    const at14 = announcedText(14);
    expect(at6).toBe(at9);
    expect(at9).toBe(at14);
    expect(at6).toContain('Hands off the chest');
    expect(at6).toContain('Push again now');
  });

  it('still shows the growing seconds to everyone who can see them', () => {
    const now = Date.now();
    const html = renderFr({
      cprView: 'practice',
      cprPracticeRunning: true,
      cprPracticeStart: now - 9000,
      cprPracticeTaps: [now - 7000],
    });
    const div = document.createElement('div');
    div.innerHTML = html;
    const status = div.querySelector('[role="status"]');
    // Visible to anyone reading the screen...
    expect(status.textContent).toMatch(/7 s\./);
    // ...and the count is the ONLY part excluded from the accessibility tree,
    // which is what keeps the announced sentence stable.
    const hidden = [...status.querySelectorAll('[aria-hidden="true"]')];
    expect(hidden).toHaveLength(1);
    expect(hidden[0].textContent).toMatch(/^\d+ s\.\s*$/);
  });
});

// ── Focus survival ─────────────────────────────────────────────────────────
// A browser blurs a focused element the instant it gains the `disabled`
// attribute, and focus falls to <body>. That is tolerable when the user's own
// click caused it; it is not tolerable when a CLOCK causes it, because the
// learner is thrown to the top of the page at a moment they did not choose.
describe('CPR practice — a timer must not steal the learner’s focus', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  it('never hard-disables a control in the CPR + AED module', () => {
    const start = SRC.indexOf('function renderCprAed() {');
    const end = SRC.indexOf('// BLEED module');
    expect(start).toBeGreaterThan(-1);
    const block = SRC.slice(start, end);
    expect(block.match(/\bdisabled:/g) || []).toEqual([]);
  });

  it('marks the tap button unavailable without removing it from the tab order', () => {
    // It auto-disables when the 30 seconds expire — precisely when the debrief
    // the learner needs appears below it.
    const html = renderFr({ cprView: 'practice' });
    const div = document.createElement('div');
    div.innerHTML = html;
    const tap = [...div.querySelectorAll('button')]
      .find((b) => (b.getAttribute('aria-label') || '').startsWith('Practice not running'));
    expect(tap, 'tap button not found').toBeTruthy();
    expect(tap.getAttribute('aria-disabled')).toBe('true');
    expect(tap.hasAttribute('disabled')).toBe(false);
  });

  it('keeps the tap button live while the run is going', () => {
    const now = Date.now();
    const html = renderFr({
      cprView: 'practice',
      cprPracticeRunning: true,
      cprPracticeStart: now - 5000,
      cprPracticeTaps: [now - 1000],
    });
    const div = document.createElement('div');
    div.innerHTML = html;
    const tap = [...div.querySelectorAll('button')]
      .find((b) => b.getAttribute('aria-label') === 'Tap to record a compression');
    expect(tap.getAttribute('aria-disabled')).toBe('false');
  });

  it('does not drop focus twice per cycle in the 30:2 coach either', () => {
    // The breath button locks for 1500 ms after every breath, so a keyboard
    // user lost focus on every single breath of the drill.
    expect(SRC).toContain("'aria-disabled': breathReady ? 'false' : 'true',");
    expect(SRC).not.toContain('disabled: !breathReady,');
    // The handler already refuses a press inside the lock, so the control being
    // reachable cannot let a breath through early.
    expect(SRC).toContain('if (session.lastBreathAt && now - session.lastBreathAt < CPR_COACH_SPEC.breathLockMs) return;');
  });
});
