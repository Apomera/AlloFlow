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
    expect(s.enoughData).toBe(false);
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
    expect(SRC, 'stopping early must score against the full window')
      .toMatch(/analyzeCprPractice\(\s*practiceTaps[^)]*practiceStart\s*\+\s*windowMs\s*\)/);
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
    // The gate's BEHAVIOUR is asserted above (rendered hint + aria-disabled)
    // and end-to-end in the browser suite's "will not let a learner past the
    // AED decision without making it", which clicks Next and checks the step
    // did not advance. Pinning the source spelling here as well would only add
    // a red that fires on a rename.
    expect(SRC, 'the gate must key off step 5 having no branch')
      .toMatch(/branchNeeded\s*=\s*aedStep\s*===\s*4\s*&&\s*!aedShockBranch/);
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
    for (const who of ['Infants and children', 'Drowning', 'Choking', 'Drug or opioid overdose']) {
      expect(html, 'missing exception: ' + who).toContain(who);
    }
  });

  it('states the exception in the summary, so folding it away cannot hide it', () => {
    // The block is a <details> to keep the Overview from becoming a wall, but a
    // learner who never opens it still has to learn that hands-only is scoped.
    const div = document.createElement('div');
    div.innerHTML = overview();
    const summaries = [...div.querySelectorAll('details > summary')].map((s) => s.textContent);
    expect(summaries.some((t) => /infants, children, drowning and overdose need breaths/i.test(t)),
      'the exception is not stated in any summary: ' + JSON.stringify(summaries)).toBe(true);
  });

  it('keeps the breathing gate and the numbered sequence unfolded', () => {
    // The first decision and the action sequence are not objections to be
    // tucked away — only the two blocks that answer an objection fold.
    const div = document.createElement('div');
    div.innerHTML = overview();
    const all = [...div.querySelectorAll('details')];
    const detailsText = all.map((d) => d.textContent).join(' ');
    expect(detailsText, 'the first decision must never be folded away')
      .not.toContain('is this cardiac arrest?');
    expect(detailsText, 'the action sequence must never be folded away')
      .not.toContain('For an adult who collapsed in front of you');

    // Counting disclosures pinned the wrong thing — adding a legitimate one
    // (age-specific hand position) turned it red for no behavioural reason.
    // The real rule is that folding never hides a fact: every summary has to
    // carry its own claim, because a learner who does not open it still reads
    // that line.
    expect(all.length, 'at least one supporting block should fold').toBeGreaterThan(0);
    for (const d of all) {
      const summary = d.querySelector(':scope > summary');
      expect(summary, 'a details with no summary is unopenable and unreadable').toBeTruthy();
      expect(summary.textContent.trim().length, 'summary too short to carry a claim: ' + summary.textContent)
        .toBeGreaterThan(24);
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
    expect(SRC, 'the 30:2 link must open the coach tab')
      .toMatch(/view:\s*'body3d'[^}]*b3dTab:\s*'coach'/);
  });
});

describe('CPR module — screen readers do not get English', () => {
  it('translates the four tab labels, which feed label + aria-label + announcement', () => {
    expect(SRC).toContain("tabBtn('overview', __alloT('stem.firstresponse.cpr_tab_overview'");
    expect(SRC).toContain("tabBtn('metronome', __alloT('stem.firstresponse.cpr_tab_metronome'");
    expect(SRC).toContain("tabBtn('practice', __alloT('stem.firstresponse.cpr_tab_practice'");
    // One key, one string: this label was a duplicate of sr_aed_walkthrough,
    // which the tab's own frAnnounce already used.
    expect(SRC).toContain("tabBtn('aed', __alloT('stem.firstresponse.sr_aed_walkthrough'");
  });

  it('translates the metronome and practice controls', () => {
    for (const key of [
      'stem.firstresponse.sr_beats_per_minute_currently',
      'stem.firstresponse.sr_audio_on_click_to_mute',
      'stem.firstresponse.sr_audio_off_click_to_enable',
      'stem.firstresponse.sr_tap_to_record_a_compression',
      'stem.firstresponse.a11y_tap_off',
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
    expect(SRC, 'the tick must go through the create-or-resume helper')
      .toMatch(/=\s*frEnsureAudio\(\)/);
    expect(SRC, 'a click may only play through a RUNNING context')
      .toMatch(/ac\.state\s*===\s*'running'/);
  });

  it('unlocks the context from the toggle, which is the real user gesture', () => {
    expect(SRC, 'enabling audio must unlock the context inside the gesture')
      .toMatch(/!audioOn\s*\)?\s*frEnsureAudio\(\)/);
  });

  it('admits it when the browser is holding the sound', () => {
    expect(SRC, 'the banner must be driven by the real context state')
      .toMatch(/audioBlocked\s*=\s*audioOn[\s\S]{0,120}state\s*!==\s*'running'/);
    // resume() is async, so a grace window keeps the banner from flashing on
    // every successful enable. A warning that cries wolf trains users to ignore it.
    expect(SRC, 'the banner needs a grace window after a resume attempt')
      .toMatch(/resumeAskedAt[\s\S]{0,20}\)\s*>\s*\d{3,}/);
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
    expect(SRC, 'the live reduced-motion guard on the heart must remain')
      .toMatch(/prefers-reduced-motion:\s*reduce[\s\S]{0,40}'none'/);
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
    expect(SRC, 'the gate link must open the breathing-gate tab')
      .toMatch(/view:\s*'body3d'[^}]*b3dTab:\s*'gate'/);
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
    expect(SRC, 'the status glyph must stay out of the accessibility tree')
      .toMatch(/'aria-hidden':\s*'true'[^}]*}[^,]*,\s*st\.glyph/);
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
      .find((b) => (b.getAttribute('aria-label') || '').startsWith('Off.'));
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
    expect(SRC, 'the breath button must be aria-disabled, not disabled')
      .toMatch(/'aria-disabled':\s*breathReady\s*\?/);
    expect(SRC, 'a hard disabled attribute would drop focus every breath')
      .not.toMatch(/\bdisabled:\s*!breathReady/);
    // The handler already refuses a press inside the lock, so the control being
    // reachable cannot let a breath through early.
    expect(SRC, 'the breath lock must be enforced in the handler, not by the DOM')
      .toMatch(/lastBreathAt\s*<\s*CPR_COACH_SPEC\.breathLockMs\)\s*return/);
  });
});

// ── Structural accessibility, swept across every view ───────────────────────
// These four properties were audited by hand and came back clean (bar the
// heading level). Locking them in costs one render per view and catches the
// whole class rather than the one instance that happened to be found.
describe('First Response — structural a11y across every view', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  const NOW = () => Date.now();
  function views() {
    const now = NOW();
    return [
      ['menu', { view: 'menu' }],
      ['cpr:overview', { view: 'cprAed', cprView: 'overview' }],
      ['cpr:metronome', { view: 'cprAed', cprView: 'metronome' }],
      ['cpr:practice', { view: 'cprAed', cprView: 'practice' }],
      ['cpr:practice:running', { view: 'cprAed', cprView: 'practice', cprPracticeRunning: true,
        cprPracticeStart: now - 12_000, cprPracticeTaps: [now - 9000, now - 8400] }],
      ['cpr:aed', { view: 'cprAed', cprView: 'aed', aedStep: 0 }],
      ['cpr:aed:branch', { view: 'cprAed', cprView: 'aed', aedStep: 4, aedShockBranch: 'shock' }],
      ['body3d:gate', { view: 'body3d', b3dTab: 'gate' }],
      ['body3d:coach', { view: 'body3d', b3dTab: 'coach' }],
    ];
  }

  function dom(state) {
    const div = document.createElement('div');
    div.innerHTML = renderFr(state);
    return div;
  }

  it('never puts a focusable control inside an aria-hidden subtree', () => {
    // Reachable by keyboard, invisible to assistive tech — the worst of both.
    for (const [name, state] of views()) {
      const buried = [];
      for (const hidden of dom(state).querySelectorAll('[aria-hidden="true"]')) {
        for (const el of hidden.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')) {
          buried.push(el.tagName.toLowerCase() + ':' + (el.textContent || '').trim().slice(0, 30));
        }
      }
      expect(buried, 'buried controls in ' + name).toEqual([]);
    }
  });

  it('gives every control an accessible name', () => {
    for (const [name, state] of views()) {
      const nameless = [...dom(state).querySelectorAll('button, a[href], input')]
        .filter((el) => !((el.getAttribute('aria-label') || '').trim()
          || (el.textContent || '').trim()
          || (el.getAttribute('title') || '').trim()))
        .map((el) => el.outerHTML.slice(0, 60));
      expect(nameless, 'unnamed controls in ' + name).toEqual([]);
    }
  });

  it('emits no duplicate ids', () => {
    for (const [name, state] of views()) {
      const seen = {};
      for (const el of dom(state).querySelectorAll('[id]')) seen[el.id] = (seen[el.id] || 0) + 1;
      expect(Object.keys(seen).filter((k) => seen[k] > 1), 'duplicate ids in ' + name).toEqual([]);
    }
  });

  it('leaves the H1 to the host shell, which renders one for every tool', () => {
    // stem_lab_module.js:1887 renders an sr-only <h1> with the tool name. A
    // module emitting its own h1 plants a second one inside it; backBar(),
    // used by the other modules, correctly starts at h2.
    for (const [name, state] of views()) {
      expect([...dom(state).querySelectorAll('h1')].length, 'own h1 in ' + name).toBe(0);
    }
  });

  it('does not skip a heading level in any view', () => {
    for (const [name, state] of views()) {
      const levels = [...dom(state).querySelectorAll('h1,h2,h3,h4,h5,h6')]
        .map((el) => Number(el.tagName.slice(1)));
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i] - levels[i - 1], 'heading jump in ' + name + ': ' + levels.join(' ')).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('CPR practice — no confident readout from too little data', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  it('refuses to call a rate "on track" from two intervals', () => {
    // Found by screenshotting the running tab: "Rate ✓ 110 bpm — On track" sat
    // beside "Steady — Not enough yet" on a run with THREE taps. The scorer
    // already knew 3 was too few; only one of the two tiles asked it.
    const now = Date.now();
    const html = renderFr({
      cprView: 'practice',
      cprPracticeRunning: true,
      cprPracticeStart: now - 20_000,
      cprPracticeTaps: [now - 19_000, now - 18_400, now - 17_800],
    });
    const div = document.createElement('div');
    div.innerHTML = html;
    const tile = [...div.querySelectorAll('div')]
      .find((d) => (d.firstChild && d.firstChild.textContent || '').trim() === 'Rate' && d.children.length >= 3);
    expect(tile, 'Rate tile not found').toBeTruthy();
    expect(tile.textContent).toContain('Not enough yet');
    expect(tile.textContent).not.toContain('On track');
    expect(tile.textContent).not.toMatch(/\d+ bpm/);
  });

  it('shows the rate once there is enough of a rhythm to judge', () => {
    const now = Date.now();
    const taps = [];
    for (let t = 12_000; t >= 1000; t -= 545) taps.push(now - t);
    const html = renderFr({
      cprView: 'practice',
      cprPracticeRunning: true,
      cprPracticeStart: now - 13_000,
      cprPracticeTaps: taps,
    });
    const div = document.createElement('div');
    div.innerHTML = html;
    const tile = [...div.querySelectorAll('div')]
      .find((d) => (d.firstChild && d.firstChild.textContent || '').trim() === 'Rate' && d.children.length >= 3);
    expect(tile.textContent).toMatch(/\d+ bpm/);
    expect(tile.textContent).toContain('On track');
  });

  it('uses one sufficiency flag for both derived readouts', () => {
    expect(SRC, 'one sufficiency flag, named for what it means')
      .toMatch(/enoughData:\s*enough/);
    expect(SRC, 'the old name must be gone so both tiles read the same flag')
      .not.toMatch(/steadyKnown/);
  });
});

// ── WCAG 2.5.3 Label in Name (Level A) ─────────────────────────────────────
// Voice-control users say what they see. axe cannot gate this for us: the rule
// is `label-content-name-mismatch` and it is tagged EXPERIMENTAL, so the
// wcag2a/2aa tag filter every AlloFlow harness uses never runs it. So gate it
// directly. Normalize BOTH sides identically or "30s" vs "30 sec" is noise.
describe('First Response — every visible control label survives into its name', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  const norm = (s) => (s || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}️‍←-⇿■-◿]/gu, ' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  // For a composite control (a card with a title and a description paragraph)
  // the LABEL is the title, not the whole card. Everything else labels itself.
  function visibleLabel(el) {
    const kids = [...el.children];
    if (kids.length >= 2 && (kids[0].textContent || '').trim()) return kids[0].textContent;
    return el.textContent;
  }

  function violations(state) {
    const div = document.createElement('div');
    div.innerHTML = renderFr(state);
    const bad = [];
    for (const el of div.querySelectorAll('button, summary, [role="button"], a[href]')) {
      const name = el.getAttribute('aria-label');
      if (!name) continue;
      const vis = norm(visibleLabel(el));
      if (!vis) continue;
      if (!norm(name).includes(vis)) bad.push(vis + ' -> ' + name);
    }
    return bad;
  }

  const now = () => Date.now();

  it('holds across the CPR + AED module', () => {
    const t = now();
    const taps = [];
    for (let x = 11_000; x >= 1500; x -= 545) taps.push(t - x);
    for (const [name, state] of [
      ['overview', { view: 'cprAed', cprView: 'overview' }],
      ['metronome', { view: 'cprAed', cprView: 'metronome' }],
      ['practice', { view: 'cprAed', cprView: 'practice' }],
      ['practice:running', { view: 'cprAed', cprView: 'practice', cprPracticeRunning: true,
        cprPracticeStart: t - 12_000, cprPracticeTaps: taps }],
      ['aed', { view: 'cprAed', cprView: 'aed', aedStep: 0 }],
      ['aed:branch', { view: 'cprAed', cprView: 'aed', aedStep: 4, aedShockBranch: 'shock' }],
    ]) {
      expect(violations(state), 'label-in-name in ' + name).toEqual([]);
    }
  });

  it('holds on the menu, where each tile is titled then described', () => {
    expect(violations({ view: 'menu' })).toEqual([]);
  });

  it('keeps the off-state tap button self-describing', () => {
    // It read "— off —" while its accessible name never contained "off".
    const html = renderFr({ view: 'cprAed', cprView: 'practice' });
    const div = document.createElement('div');
    div.innerHTML = html;
    const tap = [...div.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Off');
    expect(tap, 'off-state tap button not found').toBeTruthy();
    expect(tap.getAttribute('aria-label')).toMatch(/^Off\./);
  });
});

// ── One key, one English string ────────────────────────────────────────────
describe('First Response — i18n key hygiene', () => {
  const CALLS = () => {
    const re = /__alloT\(\s*'([^']+)'\s*,\s*'((?:[^'\\]|\\.)*)'/g;
    const byKey = new Map();
    let m;
    while ((m = re.exec(SRC))) {
      if (!byKey.has(m[1])) byKey.set(m[1], new Set());
      byKey.get(m[1]).add(m[2]);
    }
    return byKey;
  };

  it('never gives one key two different English strings', () => {
    // This is the direction that actually breaks: the pack stores ONE
    // translation per key, so a second call site with different English renders
    // text nobody translated. Currently clean across ~770 keys — worth keeping.
    const clashes = [...CALLS()]
      .filter(([, v]) => v.size > 1)
      .map(([k, v]) => k + ' => ' + [...v].map((s) => JSON.stringify(s.slice(0, 40))).join(' | '));
    expect(clashes).toEqual([]);
  });

  it('leaves no reference to a key retired during this work', () => {
    for (const dead of [
      'you_re_practicing_rhythm_only_depth_2_',
      'practice_scores_interruptions_too', 'result_all_three', 'result_source',
      'hands_off_warning', 'shake_shout_no_response_not_breathing_',
      'cut_or_tear_off_the_shirt_if_chest_is_', 'open_cpr_rhythm_metronome',
      'walk_through_using_an_aed', 'practice_cpr_rhythm_30_second_window',
      'reset_bpm_to_110', 'start_30_second_practice', 'open_3d_breathing_gate',
      'open_3d_breath_coach', 'sr_practice_not_running_press_start', 'cpr_tab_aed',
    ]) {
      expect(SRC.includes("'stem.firstresponse." + dead + "'"), 'retired key still live: ' + dead).toBe(false);
    }
  });
});

// ── Contrast across a whole input band, not just the default frame ─────────
describe('First Response — readiness chips are legible at every level', () => {
  // Only ONE readiness state renders at any given slider position, so a browser
  // audit of the default view sees one of four. axe caught `developing` at
  // 3.07:1; `novice` (4.41) and `competent` (3.58) were equally broken and
  // simply out of frame. Compute the whole band instead of rendering it.
  function luminance(hex) {
    const channels = [0, 2, 4]
      .map((i) => parseInt(hex.replace('#', '').substr(i, 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }
  function ratio(a, b) {
    const l1 = luminance(a);
    const l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  it('holds 4.5:1 for every state marker against its own tint', () => {
    const block = SRC.slice(SRC.indexOf('novice:'), SRC.indexOf('}[state];'));
    const pairs = [...block.matchAll(/color: '(#[0-9a-f]{6})', bg: '(#[0-9a-f]{6})'/g)];
    expect(pairs.length, 'readiness state map not found').toBe(4);
    for (const [, fg, bg] of pairs) {
      expect(Number(ratio(fg, bg).toFixed(2)), fg + ' on ' + bg).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the action ink readable on the dark card', () => {
    // T.card is #1e293b. The identity `color` stays a chip fill; `ink` is what
    // gets painted as text.
    const block = SRC.slice(SRC.indexOf('var FA_ACTIONS = ['), SRC.indexOf('var FA_ACTIONS = [') + 3000);
    const inks = [...block.matchAll(/ink: '(#[0-9a-f]{6})'/g)].map((m) => m[1]);
    expect(inks.length, 'no ink values found on FA_ACTIONS').toBe(6);
    for (const ink of inks) {
      expect(Number(ratio(ink, '#1e293b').toFixed(2)), ink + ' on card').toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps one canonical action list', () => {
    // renderFirstActionSleuth had shadowed FA_ACTIONS with a byte-identical
    // local copy whose only difference was its i18n keys.
    expect(SRC, 'the play view must alias the canonical list')
      .toMatch(/var\s+ACTIONS\s*=\s*FA_ACTIONS/);
    expect(SRC, 'no second copy of the action list')
      .not.toMatch(/var\s+ACTIONS\s*=\s*\[/);
  });
});

// ── The concept the debrief already relied on ──────────────────────────────
// The debrief calls a rescuer swap one of the only two legitimate reasons to
// pause. Before this, "swapping" appeared exactly once in the whole CPR module
// — in that sentence — and "fatigue" appeared zero times. The lab asked for 30
// seconds and never said what happens over the following ten minutes.
describe('CPR practice — rescuer fatigue and the handover', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  const practice = () => renderFr({ cprView: 'practice' });

  it('says quality falls before the rescuer feels it', () => {
    const html = practice();
    expect(html).toContain('Thirty seconds is the easy part');
    expect(html).toMatch(/rescuer almost never notices/);
  });

  it('gives the swap interval, not just the advice to swap', () => {
    expect(practice()).toContain('Swap compressors about every two minutes');
  });

  it('ties the changeover to the AED analysis, when everyone is already clear', () => {
    const html = practice();
    expect(html).toContain('Use the AED’s analysis as the changeover');
    // …and the AED walkthrough says the same thing from its own side.
    const aed = renderFr({ cprView: 'aed', aedStep: 5 });
    expect(aed).toContain('swap compressors');
  });

  it('bounds the handover so it does not eat the interruption budget', () => {
    // A swap is only "free" if it is fast; the tool has just spent 30 seconds
    // teaching that pauses are what cost lives.
    expect(practice()).toContain('keep it under five seconds');
  });

  it('does not tell a lone rescuer to rest', () => {
    // The dangerous misreading of "swap every two minutes" is "so stop at two
    // minutes". Someone alone has no one to swap with.
    const html = practice();
    expect(html).toContain('Alone? Do not stop to rest.');
    expect(html).toMatch(/stopped compressions move none/);
  });

  it('no longer leaves the debrief referring to something never taught', () => {
    // The debrief only renders after a run, and its pause line is the one that
    // names swapping — so score a run with a pause in it.
    const start = Date.now() - 40_000;
    const html = renderFr({
      cprView: 'practice',
      cprPracticeRunning: true,
      cprPracticeStart: start,
      cprPracticeTaps: liveTaps(start, 110, 8),
    });
    expect(html).toContain('swapping rescuers'); // the debrief's phrasing…
    expect(html).toContain('Swap compressors');  // …and the teaching behind it
  });
});

// ── What silently wastes compressions, and what stops people starting ──────
// Term sweep before this pass: "firm surface"/"mattress" appeared NOWHERE in
// the file; "lean" appeared 36 times, every one of them inside body3d, whose
// CPR_MECHANICS calls leaning the error that "quietly undoes your work".
describe('CPR overview — the two silent wasters', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  const overview = () => renderFr({ cprView: 'overview' });

  it('says to get them onto a firm flat surface', () => {
    const html = overview();
    expect(html).toContain('firm flat surface');
    expect(html, 'the reason is what makes it stick').toMatch(/mattress absorbs the push/);
  });

  it('teaches full recoil, and names leaning as what prevents it', () => {
    const html = overview();
    expect(html).toMatch(/come all the way back up/);
    expect(html).toContain('leaning is easy to do once you are tired');
    expect(html).toMatch(/stops the heart refilling/);
  });

  it('keeps hands in contact while releasing', () => {
    // "Come all the way up" without "keep your hands there" reads as lifting
    // off, which loses the landmark every cycle.
    expect(overview()).toMatch(/keeping your hands in contact/);
  });
});

describe('CPR overview — the reasons bystanders freeze', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  const overview = () => renderFr({ cprView: 'overview' });

  it('answers the broken-rib fear without telling anyone to push gently', () => {
    const html = overview();
    expect(html).toContain('If you are hesitating');
    expect(html).toMatch(/not a reason to stop or to push more gently/);
    expect(html, 'shallow is the commoner error and must be said').toMatch(/Shallow compressions are the more common mistake/);
  });

  it('states the legal position without overstating it', () => {
    // Good Samaritan protections exist in every state but differ; the tool's
    // other references are overdose-specific (Maine). Promising immunity would
    // be a scientific-integrity failure, not a reassurance.
    const html = overview();
    expect(html).toContain('some form of Good Samaritan law');
    expect(html).toMatch(/what each one covers varies/);
    expect(html).not.toMatch(/cannot be sued|you are immune|no legal risk/i);
  });

  it('tells them the dispatcher will do the remembering', () => {
    const html = overview();
    expect(html).toContain('Put the phone on speaker');
    expect(html).toMatch(/count compressions with you/);
  });
});

// ── How to actually put your hands on the chest ────────────────────────────
// Term sweep before this pass: "heel of" appeared 18 times in this file and
// ZERO in the CPR module; "breastbone" 29 and zero. The front page taught
// where, how deep, how fast and when to stop — and never the most basic
// mechanical instruction in CPR. All of it lived in body3d.
describe('CPR overview — hand technique', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  const overview = () => renderFr({ cprView: 'overview' });

  it('states the adult hand position in the action step itself', () => {
    const html = overview();
    expect(html).toMatch(/heel of one hand on the breastbone/);
    expect(html).toMatch(/fingers interlaced/);
  });

  it('teaches the posture that makes depth reachable', () => {
    // Depth is a body-weight problem, not an arm-strength one; without this a
    // learner pushes with their arms and cannot reach 2 inches.
    const html = overview();
    expect(html).toMatch(/[Aa]rms locked straight/);
    expect(html).toMatch(/shoulders stacked directly above your hands/);
    expect(html).toMatch(/body weight and not your arms/);
  });

  it('says a child and an infant are different, even when folded away', () => {
    const div = document.createElement('div');
    div.innerHTML = overview();
    const summaries = [...div.querySelectorAll('details > summary')].map((s) => s.textContent);
    expect(summaries.some((t) => /child or an infant/i.test(t)),
      'age variation is not announced in any summary: ' + JSON.stringify(summaries)).toBe(true);
  });

  it('does not resurrect the two-finger infant method', () => {
    // The tool's own CPR_AGES records that it is no longer recommended because
    // it often fails to reach adequate depth. Writing this section from memory
    // rather than from the tool would have contradicted its 3D module.
    const html = overview();
    expect(html).toContain('two-thumb encircling-hands technique');
    expect(html).toMatch(/two-finger method is no longer recommended/);
  });

  it('tells a rescuer not to go easy on a pregnant patient', () => {
    // The predictable hesitation, and the predictable wrong fix (moving the
    // hands or pushing softly).
    const html = overview();
    expect(html).toMatch(/do not move your hands and do not push more gently/);
    expect(html).toMatch(/mother whose blood is moving/);
  });

  it('agrees with the 3D module rather than paraphrasing it', () => {
    // Both surfaces must teach the same technique in the same words, or they
    // drift — which is the defect this whole session keeps finding.
    const zones = SRC.slice(SRC.indexOf('var CPR_ZONES = ['), SRC.indexOf('var CPR_MECHANICS'));
    expect(zones).toMatch(/fingers interlaced/);
    expect(zones).toMatch(/arms locked/);
    expect(overview()).toMatch(/fingers interlaced/);
  });
});

// ── Mid-CPR events, and the aftermath ──────────────────────────────────────
// "vomit" appeared 7 times in this file — all in recovery-position drainage —
// and zero in the CPR module. "signs of life" and "not your fault" appeared
// nowhere at all.
describe('CPR overview — what happens once you have started', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, ID);
  });

  const overview = () => renderFr({ cprView: 'overview' });

  it('warns that vomiting is common and is not a reason to stop', () => {
    const html = overview();
    expect(html).toMatch(/Vomiting is common/);
    expect(html).toMatch(/resume compressions/);
  });

  it('says what a real sign of life looks like', () => {
    expect(overview()).toMatch(/Breathing normally, moving purposefully, or opening their eyes/);
  });

  it('does not let gasping be mistaken for recovery a second time', () => {
    // The gate card teaches this at the start; the moment it could be unlearned
    // is when the rescuer is exhausted and looking for a reason to stop.
    expect(overview()).toMatch(/Occasional gasping is NOT a sign of life/);
  });

  it('announces the whole thing in the summary, since it folds', () => {
    const div = document.createElement('div');
    div.innerHTML = overview();
    const summaries = [...div.querySelectorAll('details > summary')].map((s) => s.textContent);
    expect(summaries.some((t) => /vomit/i.test(t) && /come round/i.test(t)),
      'mid-CPR events are not announced: ' + JSON.stringify(summaries)).toBe(true);
  });

  it('tells a learner in advance that most arrests are not survived', () => {
    // Someone who does everything right and loses the patient should not read
    // that as their failure — and should hear it before it happens.
    const html = overview();
    expect(html).toMatch(/do not survive it, even when everything is done right/);
    expect(html).toMatch(/that is the arrest, not you/);
  });

  it('pairs that with the reason to act anyway', () => {
    // Survival odds stated alone are a reason not to bother. They have to
    // arrive attached to the effect bystander CPR actually has.
    const html = overview();
    expect(html).toMatch(/doubles or triples/);
    expect(html).toMatch(/Doing nothing is the only choice that removes the chance/);
  });

  it('does not overstate the survival figures', () => {
    const html = overview();
    expect(html).toMatch(/roughly doubles or triples/);
    expect(html).not.toMatch(/guarantee|will survive|saves? their life\b/i);
  });
});
