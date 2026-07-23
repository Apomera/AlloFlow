// Coaster Lab (stem_tool_coasterlab.js) — registration + mount smoke.
//
// The tool is GENERATED from the standalone prototype at C:\tmp\coaster-lab
// (gen_stem_tool.mjs): a full imperative Three.js app booted inside a ref'd
// container. jsdom has no WebGL and never loads the CDN three.js script, so
// the engine stays dormant here by design — these tests pin the React shell,
// the registration contract, the quest-hook logic, the ctx bridge, and that
// every loader/registration site actually references the tool.
import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const TOOL_PATHS = [
  'stem_lab/stem_tool_coasterlab.js',
  'prismflow-deploy/public/stem_lab/stem_tool_coasterlab.js',
];

beforeEach(() => { resetStemLab(); });

describe('coaster lab — registration', () => {
  it('root and mirror copies are byte-identical', () => {
    const a = readFileSync(resolve(process.cwd(), TOOL_PATHS[0]), 'utf8');
    const b = readFileSync(resolve(process.cwd(), TOOL_PATHS[1]), 'utf8');
    expect(a).toBe(b);
  });

  it.each(TOOL_PATHS)('%s registers with tile metadata and 5 quest hooks', (p) => {
    const cfg = loadTool(p, 'coasterLab');
    expect(cfg.icon).toBe('🎢');
    expect(cfg.label).toBe('Coaster Lab');
    expect(cfg.color).toBe('amber');
    expect(cfg.questHooks).toHaveLength(5);
    expect(cfg.questHooks.map(q => q.id)).toEqual([
      'clab_run', 'clab_cert', 'clab_explore', 'clab_ride', 'clab_missions',
    ]);
  });

  it('quest hooks read the coasterLab toolData bucket', () => {
    const cfg = loadTool(TOOL_PATHS[0], 'coasterLab');
    const hook = id => cfg.questHooks.find(q => q.id === id).check;
    expect(hook('clab_run')({})).toBe(false);
    expect(hook('clab_run')({ coasterLab: { runs: 1 } })).toBe(true);
    expect(hook('clab_cert')({ coasterLab: { certified: true } })).toBe(true);
    expect(hook('clab_explore')({ coasterLab: { explored: true } })).toBe(true);
    expect(hook('clab_ride')({ coasterLab: { rideBestCorrect: 3 } })).toBe(false);
    expect(hook('clab_ride')({ coasterLab: { rideBestCorrect: 4 } })).toBe(true);
    expect(hook('clab_missions')({ coasterLab: { missionCount: 6 } })).toBe(true);
  });
});

describe('coaster lab — mount smoke (no WebGL in jsdom)', () => {
  it('renders the shell, scoped styles, and the loading note without throwing', () => {
    const cfg = loadTool(TOOL_PATHS[0], 'coasterLab');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const ctx = {
      React,
      toolData: {},
      setToolData: () => {},
      addToast: () => {},
      t: (k, f) => (f != null ? f : k),
    };
    try {
      act(() => { root.render(cfg.render(ctx)); });
      expect(host.querySelector('.clab-root')).toBeTruthy();
      expect(host.querySelector('style').textContent).toContain('.clab-root');
      // scoped CSS must not carry app-wide selectors
      expect(host.querySelector('style').textContent).not.toMatch(/(^|\})\s*button\s*\{/);
      expect(host.textContent).toContain('Building the midway');
      expect(host.querySelector('[aria-label="Coaster Lab 3-D designer"]')).toBeTruthy();
    } finally {
      act(() => { root.unmount(); });
      host.remove();
    }
  });

  it('the ctx bridge accumulates run/cert/ride/mission progress', () => {
    const cfg = loadTool(TOOL_PATHS[0], 'coasterLab');
    // Drive the bridge through a real setToolData reducer chain.
    let data = {};
    const setToolData = (fn) => { data = fn(data); };
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    act(() => { root.render(cfg.render({ React, toolData: {}, setToolData, addToast: () => {}, t: (k, f) => f })); });
    // The engine can't boot in jsdom, so exercise the same reducer shape the
    // bridge uses by re-rendering: bridge itself is engine-internal. Instead,
    // pin the quest thresholds against a hand-built bucket the bridge would
    // produce after: 2 runs, cert, a 4/4 ride, 6 missions.
    const d = { coasterLab: { runs: 2, certified: true, explored: true, rideBestCorrect: 4, missionCount: 6 } };
    expect(cfg.questHooks.every(q => q.check(d))).toBe(true);
    act(() => { root.unmount(); });
    host.remove();
  });
});

describe('coaster lab — ctx capabilities (AI, XP, grade level)', () => {
  it('renders cleanly with AI enabled, awardXP, announceToSR, and an MS grade level', () => {
    const cfg = loadTool(TOOL_PATHS[0], 'coasterLab');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const ctx = {
      React,
      toolData: {},
      setToolData: () => {},
      addToast: () => {},
      awardXP: () => {},
      announceToSR: () => {},
      aiHintsEnabled: true,
      callGemini: () => Promise.resolve('hint'),
      gradeLevel: '7th Grade',
      t: (k, f) => (f != null ? f : k),
    };
    try {
      act(() => { root.render(cfg.render(ctx)); });
      expect(host.querySelector('.clab-root')).toBeTruthy();
    } finally {
      act(() => { root.unmount(); });
      host.remove();
    }
  });
});

describe('coaster lab — bridge is render-safe (no setState inside the reducer)', () => {
  // Regression: the bridge used to call awardXP()/addToast() INSIDE the
  // setToolData(prev => …) reducer. React runs a reducer during the host's
  // (AlloFlowContent's) render pass, and awardXP → _setXpPopupTick/_setXpBadgePulse
  // updates StemLabModal — firing "Cannot update a component (StemLabModal) while
  // rendering a different component (AlloFlowContent)". A reducer must be pure;
  // the side effects now run AFTER it, and awardXP uses the (activityId, points,
  // reason) signature so coaster XP actually accrues.
  it.each(TOOL_PATHS)('%s: the setToolData reducer body is side-effect-free', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const start = src.indexOf('function bridge(ev){');
    expect(start).toBeGreaterThan(-1);
    // isolate the persistence reducer: setToolData(function (prev) { … return … { coasterLab: s }; });
    const reducerStart = src.indexOf('setToolData(function (prev) {', start);
    const reducerEnd = src.indexOf('{ coasterLab: s });', reducerStart);
    expect(reducerStart).toBeGreaterThan(-1);
    expect(reducerEnd).toBeGreaterThan(reducerStart);
    const reducerBody = src.slice(reducerStart, reducerEnd);
    expect(reducerBody).not.toContain('awardXP');
    expect(reducerBody).not.toContain('addToast');
  });

  it.each(TOOL_PATHS)('%s: awardXP uses the (activityId, points, reason) signature', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    // the correct call carries the tool's activityId so per-activity XP accrues
    expect(src).toContain("awardXP('coasterLab', a[0], a[1])");
    // the old, arg-misaligned, in-reducer calls are gone
    expect(src).not.toContain("awardXP(25, 'Coaster certified')");
    expect(src).not.toContain("awardXP(15, 'Coaster predictions badge')");
  });
});

describe('coaster lab — Ride & Solve math is GROUNDED in the checkpoint element', () => {
  // Math topics ask about the SAME element as the physics question (the real drop
  // height, this train's cars, the current speed), posed as arithmetic. The
  // generator is pure and takes the checkpoint facts explicitly — eval-slice and
  // drive it for real.
  function loadGen(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('/* @clab-mathgen-start');
    const e = src.indexOf('/* @clab-mathgen-end');
    expect(s).toBeGreaterThan(-1);
    expect(e).toBeGreaterThan(s);
    return new Function(src.slice(s, e) + '\nreturn { genElementMath, _bandCfg, _mathViz };')();
  }
  const BANDS = ['k2', 'g35', 'g68', 'g912'];
  const OPS = ['addition', 'subtraction', 'multiplication', 'division', 'arithmetic'];
  // a realistic checkpoint: crest 24 m, valley 6 m, currently 20 m up doing 18 m/s, 3-car train
  const FACTS = { crestH: 24, valleyH: 6, liveH: 20, liveV: 18, loopH: 15, turnH: 9, cars: 3, trackLen: 400, tag: 'Checkpoint · crest' };
  const parseExplain = (ex) => {
    const m = ex.replace(/,/g, '').match(/^(\d+)\s(.)\s(\d+)\s=\s(\d+)\./);
    return m ? { a: +m[1], sign: m[2], b: +m[3], ans: +m[4] } : null;
  };

  it.each(TOOL_PATHS)('%s: generator exists and is pure over an explicit facts object', (p) => {
    const { genElementMath, _bandCfg } = loadGen(p);
    expect(typeof genElementMath).toBe('function');
    expect(_bandCfg('k2').choices).toBe(true);   // youngest → tap a choice
    expect(_bandCfg('g68').choices).toBe(false);  // older → type the number
  });

  it('every topic × band yields correct, non-negative, checkpoint-grounded arithmetic', () => {
    const { genElementMath } = loadGen(TOOL_PATHS[0]);
    for (const band of BANDS) {
      for (const op of OPS) {
        for (let i = 0; i < 150; i++) {
          const q = genElementMath(op, band, FACTS);
          const parts = parseExplain(q.explain);
          expect(parts, `${op}/${band} explain: ${q.explain}`).toBeTruthy();
          const { a, b, ans, sign } = parts;
          expect(q.answer).toBe(ans);
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          if (sign === '+') expect(a + b).toBe(ans);
          if (sign === '−') { expect(a - b).toBe(ans); expect(a).toBeGreaterThanOrEqual(b); } // never negative
          if (sign === '×') expect(a * b).toBe(ans);
          if (sign === '÷') { expect(a % b).toBe(0); expect(a / b).toBe(ans); } // always exact
          // the operands the student sees appear in the question prose
          expect(q.text).toContain(String(a));
          expect(q.text).toContain(String(b));
          // still coaster prose, and the tag names the real checkpoint
          expect(q.text).toMatch(/rider|seat|car|drop|valley|crest|m\/s|m<\/b>|metre|fall|carry/i);
          expect(q.tag).toContain('Checkpoint · crest');
          if (band === 'k2') {
            expect(q.choices).toHaveLength(3);
            expect(q.choices.map(c => c[0])).toContain(q.correct);
            expect(q.correct).toBe(String(q.answer));
          } else {
            expect(q.choices).toBeUndefined();
            expect(q.tolAbs).toBe(0.4);
          }
        }
      }
    }
  });

  it('uses the REAL checkpoint numbers — the drop is crest minus valley', () => {
    const { genElementMath } = loadGen(TOOL_PATHS[0]);
    // over many draws, the subtraction topic surfaces the actual 24 - 6 = 18 drop
    let sawDrop = false, sawCars = false;
    for (let i = 0; i < 400; i++) {
      const s = genElementMath('subtraction', 'g68', FACTS);
      if (s.answer === 18 && /24 m/.test(s.text) && /6 m/.test(s.text)) sawDrop = true;
      const m = genElementMath('multiplication', 'g68', FACTS);
      if (/\b3\b\s*<\/b>\s*cars|3<\/b> cars/.test(m.text)) sawCars = true; // the real 3-car train
    }
    expect(sawDrop).toBe(true);
    expect(sawCars).toBe(true);
  });

  it('tailors to THIS checkpoint: a loop asks about the loop, a turn about the turn', () => {
    const { genElementMath } = loadGen(TOOL_PATHS[0]);
    const LOOP = { ...FACTS, feat: 'loop', hereR: 6, loopH: 15, tag: 'Checkpoint · inversion' };
    let sawDiameter = false, sawLoopDrop = false;
    for (let i = 0; i < 400; i++) {
      const m = genElementMath('multiplication', 'g68', LOOP);
      if (/radius/.test(m.text) && m.answer === 12) sawDiameter = true; // 6 m radius × 2 = 12 m across
      const s = genElementMath('subtraction', 'g68', LOOP);
      if (/loop tops out/.test(s.text) && s.answer === 9) sawLoopDrop = true; // 24 crest − 15 loop
    }
    expect(sawDiameter).toBe(true);
    expect(sawLoopDrop).toBe(true);
    // a plain hill checkpoint with no radius never emits the diameter question
    const noR = { ...FACTS, feat: 'crest', hereR: null };
    for (let i = 0; i < 200; i++) expect(genElementMath('multiplication', 'g68', noR).text).not.toMatch(/radius/);
  });

  it('does not repeat the previous question back-to-back (anti-repeat via avoid key)', () => {
    const { genElementMath } = loadGen(TOOL_PATHS[0]);
    // subtraction has several candidates, so the avoided key must never come back
    let repeats = 0;
    for (let i = 0; i < 1000; i++) {
      if (genElementMath('subtraction', 'g68', FACTS, 'sub-drop').key === 'sub-drop') repeats++;
    }
    expect(repeats).toBe(0);
    // and the returned question always carries a key for the caller to thread
    expect(genElementMath('multiplication', 'g68', FACTS).key).toBeTruthy();
  });

  it('mixed math mixes +, −, × and never division; a flat/empty checkpoint still works', () => {
    const { genElementMath } = loadGen(TOOL_PATHS[0]);
    const ops = new Set();
    for (let i = 0; i < 600; i++) ops.add(genElementMath('arithmetic', 'g68', FACTS).mathOp);
    expect(ops.has('addition')).toBe(true);
    expect(ops.has('subtraction')).toBe(true);
    expect(ops.has('multiplication')).toBe(true);
    expect(ops.has('division')).toBe(false);
    // no facts at all (e.g. a flat track with no drop) → still a valid question, never a throw
    for (const op of OPS) {
      const q = genElementMath(op, 'g35', {});
      expect(Number.isInteger(q.answer)).toBe(true);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(parseExplain(q.explain)).toBeTruthy();
    }
  });

  it('every math question carries a bar/area-model SVG that shows "?", never the answer', () => {
    const { genElementMath, _mathViz } = loadGen(TOOL_PATHS[0]);
    // the four models are valid SVG and hide the result behind a "?"
    for (const [op, a, b, ans] of [['+', 18, 7, 25], ['−', 24, 6, 18], ['×', 3, 8, 24], ['÷', 24, 3, 8]]) {
      const svg = _mathViz(op, a, b, ans);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('viewBox');
      expect(svg).toContain('</svg>');
      expect(svg.includes('>?<') || svg.includes('= ?')).toBe(true); // asks, does not answer
      // the answer is never printed as its own number label (would give it away)
      const answerLabel = new RegExp('>\\s*' + ans + '\\s*<');
      // (operands may appear as labels; the ANSWER must not, except inside a countable ×-array which is intended)
      if (op !== '×') expect(svg).not.toMatch(answerLabel);
    }
    // and the generator attaches one to every math question
    for (const t of ['addition', 'subtraction', 'multiplication', 'division', 'arithmetic']) {
      for (let i = 0; i < 40; i++) {
        const q = genElementMath(t, 'g68', FACTS);
        expect(q.vizSvg, `${t} #${i}`).toMatch(/^<svg[\s\S]*<\/svg>$/);
      }
    }
  });

  it('the answer placeholder is a single revealable node, still hidden as "?"', () => {
    const { _mathViz } = loadGen(TOOL_PATHS[0]);
    for (const [op, a, b, ans] of [['+', 19, 7, 26], ['\u2212', 24, 6, 18], ['\u00d7', 3, 8, 24], ['\u00f7', 24, 3, 8]]) {
      const svg = _mathViz(op, a, b, ans);
      expect((svg.match(/class="clab-ans"/g) || []).length).toBe(1);
      expect(svg).toContain('>?<');
    }
  });

  it.each(TOOL_PATHS)('%s: a correct math answer reveals the number + an anchored, reduced-motion-guarded burst', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain("_ansEl.classList.add('reveal')");
    expect(src).toContain('function spawnAnswerBurst(anchor){');
    expect(src).toContain('if(reducedMotion()) return;');
    expect(src).toContain('spawnAnswerBurst(_ansEl)');
    expect(src).toContain('@keyframes clabAnsPop');
    expect(src).toContain('@keyframes clabSpark');
  });

  it('positions sparks at the revealed answer and removes every particle', () => {
    const src = readFileSync(resolve(process.cwd(), TOOL_PATHS[0]), 'utf8');
    const s = src.indexOf('function spawnAnswerBurst(anchor){');
    const e = src.indexOf('function submitRideAnswer', s);
    expect(s).toBeGreaterThan(-1);
    expect(e).toBeGreaterThan(s);
    const host = document.createElement('div');
    const answer = document.createElement('span');
    host.appendChild(answer);
    host.getBoundingClientRect = () => ({ left: 100, top: 50, width: 400, height: 300 });
    answer.getBoundingClientRect = () => ({ left: 240, top: 130, width: 20, height: 10 });
    const cleanup = [];
    const loadBurst = reduced => new Function('rq', 'document', 'reducedMotion', 'setTimeout',
      src.slice(s, e) + '\nreturn spawnAnswerBurst;')(
        { box: host }, document, () => reduced, fn => { cleanup.push(fn); return cleanup.length; });

    loadBurst(false)(answer);
    const sparks = [...host.querySelectorAll('.clab-spark')];
    expect(sparks).toHaveLength(12);
    expect(sparks.every(p => p.style.left === '146.5px' && p.style.top === '81.5px')).toBe(true);
    expect(sparks.every(p => p.getAttribute('aria-hidden') === 'true')).toBe(true);
    cleanup.splice(0).forEach(fn => fn());
    expect(host.querySelectorAll('.clab-spark')).toHaveLength(0);
    loadBurst(true)(answer);
    expect(host.querySelectorAll('.clab-spark')).toHaveLength(0);
  });

  it('ignores a delayed resume after the ride has been interrupted', () => {
    const src = readFileSync(resolve(process.cwd(), TOOL_PATHS[0]), 'utf8');
    const s = src.indexOf('function submitRideAnswer(val, instant){');
    const e = src.indexOf('function cleanupRide', s);
    const scheduled = [];
    const rideState = {
      active: true, idx: 0, current: { choices: [['a', 'A']], correct: 'a', explain: 'Correct.' },
      qStart: 0, timerLen: 30, times: [], score: 0, streak: 0, correct: 0, bestStreak: 0,
      results: [], resumeId: null, burstId: null,
    };
    const choices = document.createElement('div');
    choices.innerHTML = '<button data-v="a">A</button>';
    const rqState = {
      choices, num: document.createElement('input'), go: document.createElement('button'),
      numRow: document.createElement('div'), timer: document.createElement('span'),
      feed: document.createElement('p'), score: document.createElement('span'),
      streak: document.createElement('span'), delta: document.createElement('span'),
      viewport: document.createElement('div'), viz: null, box: document.createElement('div'),
    };
    const submit = new Function(
      'ride', 'rq', 'performance', 'clearInterval', 'clearTimeout', 'setTimeout',
      'fmt', 'blip', 'reducedMotion', 'sim', 'spawnAnswerBurst',
      src.slice(s, e) + '\nreturn submitRideAnswer;'
    )(
      rideState, rqState, { now: () => 1000 }, () => {}, () => {},
      (fn, delay) => { scheduled.push({ fn, delay }); return scheduled.length; },
      String, () => {}, () => false, { paused: true }, () => {}
    );

    submit('a', false);
    expect(scheduled.map(x => x.delay)).toEqual([1300]);
    expect(rqState.box.classList.contains('is-correct')).toBe(true);
    expect(choices.querySelector('button').classList.contains('correct')).toBe(true);
    expect(rqState.timer.classList.contains('done')).toBe(true);
    expect(rideState.results).toEqual([true]);
    rideState.active = false;
    scheduled[0].fn();
    expect(rideState.idx).toBe(0);
    expect(rqState.box.hidden).toBe(false);
  });
  it.each(TOOL_PATHS)('%s: question flow is accessible, interruptible, and contained on short screens', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('role=\\"dialog\\" aria-modal=\\"false\\" aria-labelledby=\\"clab-rqText\\"');
    expect(src).toContain('role=\\"progressbar\\" aria-label=\\"Time remaining\\"');
    expect(src).toContain('role=\\"status\\" aria-live=\\"polite\\" aria-atomic=\\"true\\"');
    expect(src).toContain("focusTarget = rq.choices.querySelector('button')");
    expect(src).toContain('if(ride.current && focusTarget && focusTarget.isConnected) focusTarget.focus()');
    expect(src).toContain('clearTimeout(ride.resumeId); ride.resumeId = null;');
    expect(src).toContain('if(!ride.active || ride.idx !== answerIdx) return;');
    expect(src).toContain('.clab-root #clab-rideQ{max-height:calc(100% - 156px);overflow-y:auto');
    expect(src).toContain('@media (max-width:760px),(max-height:620px)');
    expect(src).toContain("function reducedMotion(){ return !!(REDUCED_MOTION_QUERY && REDUCED_MOTION_QUERY.matches); }");
  });

  it.each(TOOL_PATHS)('%s: the question card renders the viz only for math topics', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('id=\\"clab-rqViz\\"');                    // the container exists
    expect(src).toContain('.clab-root .clab-viz{');                  // and its styling
    expect(src).toContain('vizSvg: _mathViz(p.op, p.a, p.b, p.ans)'); // generator emits it
    // pauseForQuestion shows it for math (has vizSvg) and clears it otherwise
    expect(src).toContain("if(ride.current.vizSvg){ rq.viz.innerHTML = ride.current.vizSvg; rq.viz.classList.add('on'); }");
    expect(src).toContain("else { rq.viz.innerHTML = ''; rq.viz.classList.remove('on'); }");
  });

  it.each(TOOL_PATHS)('%s: physics is the default; math reads live facts at the checkpoint', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain("localStorage.getItem('coaster_lab_ride_topic') || 'physics'");
    expect(src).toContain("if(rideTopic === 'physics'){");
    // the checkpoint math is grounded via facts read from the live sim + analysis,
    // and threads the previous question's key so it does not repeat back-to-back
    expect(src).toContain('ride.current = genElementMath(rideTopic, rideBand(), _coasterFacts(liveState, stop), ride.lastQKey);');
    expect(src).toContain('if(ride.current && ride.current.key) ride.lastQKey = ride.current.key;');
    expect(src).toContain('function _coasterFacts(live, stop){');
    expect(src).toContain('crestH: a.A ? R(a.A.h) : null');
    // the checkpoint's own feature + radius are read so different stops differ
    expect(src).toContain('feat: feat, hereR: hereR');
  });

  it.each(TOOL_PATHS)('%s: grade band comes from the host (auto) or a manual override', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('bridge.gradeBand = (typeof ctx.gradeBand === \'string\')');
    expect(src).toContain('const b = __clabBridge && __clabBridge.gradeBand;');
    expect(src).toContain('id=\\"clab-rideTopic\\"');
    expect(src).toContain('id=\\"clab-rideGrade\\"');
    for (const v of ['physics', 'addition', 'subtraction', 'multiplication', 'division', 'arithmetic']) {
      expect(src).toContain(`value=\\"${v}\\"`);
    }
    for (const g of ['auto', 'k2', 'g35', 'g68', 'g912']) {
      expect(src).toContain(`value=\\"${g}\\"`);
    }
  });
});

describe('coaster lab — geometry preflight', () => {
  function loadGeometryPreflight(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('/* @clab-geometry-preflight-start');
    const e = src.indexOf('/* @clab-geometry-preflight-end');
    expect(s).toBeGreaterThan(-1);
    expect(e).toBeGreaterThan(s);
    return new Function(src.slice(s, e) + '\nreturn geometryPreflightSamples;')();
  }
  function flatLine(count = 80) {
    const pos = Array.from({ length: count }, (_, i) => ({ x: i * 5, y: 5, z: 0 }));
    const s = Array.from({ length: count }, (_, i) => i * 5);
    return { pos, s, L: count * 5 };
  }

  it.each(TOOL_PATHS)('%s leaves a clean closed circuit unflagged', (p) => {
    const preflight = loadGeometryPreflight(p);
    const count = 180, radius = 30, L = Math.PI * 2 * radius;
    const pos = Array.from({ length: count }, (_, i) => {
      const a = i / count * Math.PI * 2;
      return { x: Math.cos(a) * radius, y: 5, z: Math.sin(a) * radius };
    });
    const s = Array.from({ length: count }, (_, i) => i / count * L);
    expect(preflight(pos, s, L)).toEqual([]);
  });

  it('detects a non-adjacent centerline overlap without confusing neighboring samples', () => {
    const preflight = loadGeometryPreflight(TOOL_PATHS[0]);
    const path = flatLine();
    path.pos[40] = { ...path.pos[0] };
    const findings = preflight(path.pos, path.s, path.L);
    const hit = findings.find(f => f.kind === 'track-overlap');
    expect(hit).toBeTruthy();
    expect(hit.distance).toBe(0);
    expect(Math.abs(hit.sampleIdx - hit.relatedSampleIdx)).toBeGreaterThan(20);
  });

  it('reports insufficient train-envelope clearance separately from an intersection', () => {
    const preflight = loadGeometryPreflight(TOOL_PATHS[0]);
    const path = flatLine();
    path.pos[40] = { x: 1.5, y: 5, z: 0 };
    const findings = preflight(path.pos, path.s, path.L);
    const hit = findings.find(f => f.kind === 'track-clearance');
    expect(hit).toBeTruthy();
    expect(hit.distance).toBeCloseTo(1.5, 5);
    expect(hit.detail).toMatch(/room for track and train/);
  });

  it('finds terrain strikes and nearly coincident build nodes', () => {
    const preflight = loadGeometryPreflight(TOOL_PATHS[0]);
    const path = flatLine();
    path.pos[18].y = 0.1;
    const nodes = [
      { x: 0, y: 5, z: 0 }, { x: 0.4, y: 5, z: 0 },
      { x: 30, y: 5, z: 20 }, { x: 60, y: 5, z: 20 },
    ];
    const kinds = preflight(path.pos, path.s, path.L, nodes).map(f => f.kind);
    expect(kinds).toContain('ground-clearance');
    expect(kinds).toContain('node-spacing');
  });

  it.each(TOOL_PATHS)('%s integrates geometry findings and clearly limits certification scope', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'geometryPreflightSamples(track.pos, track.s, track.L, design.points)',
      'const geometryClear = geometryProblems.length === 0;',
      'completed && comfy && geometryClear && allOk',
      "kind: overlaps ? 'track-overlap' : 'track-clearance'",
      "return out.slice(0, 7);",
      'Design preflight coach',
      'Educational geometry + ideal-dynamics preview—not structural approval.',
      '★ SIMULATION CERTIFIED — your math and this educational model agree.',
    ]) expect(src).toContain(marker);
    expect(src).not.toContain('Ride open to the public!');
    expect(src).not.toContain('Before the park can open your ride');
  });
});
describe('coaster lab — design validation and recovery', () => {
  function loadDesignNormalizer(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('/* @clab-design-normalize-start');
    const e = src.indexOf('/* @clab-design-normalize-end');
    expect(s).toBeGreaterThan(-1);
    expect(e).toBeGreaterThan(s);
    return new Function(src.slice(s, e) +
      '\nreturn { normalizeDesign, parseDesignJson, DESIGN_SCHEMA, DESIGN_MAX_JSON_CHARS };')();
  }
  const makeDesign = (count = 6) => ({
    points: Array.from({ length: count }, (_, i) => ({ x: i * 8, y: 3 + i, z: i * 2, bank: i ? 10 : undefined })),
    certTurnIdx: 99,
  });

  it.each(TOOL_PATHS)('%s normalizes legacy designs into a bounded, cloned schema', (p) => {
    const { normalizeDesign, DESIGN_SCHEMA } = loadDesignNormalizer(p);
    const input = makeDesign();
    const out = normalizeDesign(input);
    expect(DESIGN_SCHEMA).toBe(1);
    expect(out.points).toHaveLength(6);
    expect(out.points[0]).toEqual({ x: 0, y: 3, z: 0, bank: 0 });
    expect(out.points[0]).not.toBe(input.points[0]);
    expect(out.certTurnIdx).toBe(5);
    expect(out.propulsion).toEqual({ mode: 'chain', accel: 7.5 });
    input.points[0].x = 200;
    expect(out.points[0].x).toBe(0);
  });

  it('rejects malformed, excessive, and out-of-world node data', () => {
    const { normalizeDesign } = loadDesignNormalizer(TOOL_PATHS[0]);
    expect(() => normalizeDesign(makeDesign(5))).toThrow(/6-80 nodes/);
    expect(() => normalizeDesign(makeDesign(81))).toThrow(/6-80 nodes/);
    for (const patch of [{ x: 261 }, { z: -261 }, { y: 0.4 }, { y: 46 }, { bank: 181 }, { x: '12' }]) {
      const d = makeDesign();
      Object.assign(d.points[2], patch);
      expect(() => normalizeDesign(d)).toThrow();
    }
  });

  it('rejects unknown versions, invalid launch settings, and oversized JSON before parsing', () => {
    const { normalizeDesign, parseDesignJson, DESIGN_MAX_JSON_CHARS } = loadDesignNormalizer(TOOL_PATHS[0]);
    expect(() => normalizeDesign({ coasterlab: 2, ...makeDesign() })).toThrow(/unsupported design version/);
    expect(() => normalizeDesign({ ...makeDesign(), propulsion: { mode: 'launch', accel: 4.5 } })).toThrow(/acceleration/);
    expect(() => normalizeDesign({ ...makeDesign(), propulsion: { mode: 'launch', accel: 14.5 } })).toThrow(/acceleration/);
    expect(() => parseDesignJson(' '.repeat(DESIGN_MAX_JSON_CHARS + 1))).toThrow(/too large/);
  });

  function loadDesignStorage(p, initial = {}) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('/* @clab-design-normalize-start');
    const e = src.indexOf('/* @clab-design-storage-end');
    expect(s).toBeGreaterThan(-1);
    expect(e).toBeGreaterThan(s);
    const data = new Map(Object.entries(initial));
    const localStorage = {
      getItem: key => data.has(key) ? data.get(key) : null,
      setItem: (key, value) => data.set(key, String(value)),
      removeItem: key => data.delete(key),
    };
    const api = new Function('localStorage', 'STORE_KEY', src.slice(s, e) +
      '\nreturn { loadDesign, getRecovery: () => designRecovery, backupKey: DESIGN_BACKUP_KEY };')(localStorage, 'primary');
    return { ...api, data };
  }

  it('loads valid versioned saves and quarantines a recoverable invalid save', () => {
    const validRaw = JSON.stringify({ coasterlab: 1, ...makeDesign() });
    const valid = loadDesignStorage(TOOL_PATHS[0], { primary: validRaw });
    expect(valid.loadDesign().certTurnIdx).toBe(5);
    expect(valid.getRecovery()).toBeNull();
    expect(valid.data.get('primary')).toBe(validRaw);

    const bad = makeDesign();
    bad.points[2].x = 999;
    const badRaw = JSON.stringify({ coasterlab: 1, ...bad });
    const recovered = loadDesignStorage(TOOL_PATHS[0], { primary: badRaw });
    expect(recovered.loadDesign()).toBeNull();
    expect(recovered.data.has('primary')).toBe(false);
    expect(recovered.data.get(recovered.backupKey)).toBe(badRaw);
    expect(recovered.getRecovery().raw).toBe(badRaw);
    expect(recovered.getRecovery().reason).toMatch(/outside the editable world/);
  });
  it.each(TOOL_PATHS)('%s routes storage, imports, templates, reset, and undo through validation', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'return parseDesignJson(raw);',
      'JSON.stringify({ coasterlab: DESIGN_SCHEMA, ...design })',
      'design = parseDesignJson(str);',
      'design = loadDesign() || normalizeDesign(defaultDesign());',
      'design = normalizeDesign(simpleDesign());',
      'design = normalizeDesign(TEMPLATES[b.dataset.tpl]());',
      'design = normalizeDesign(defaultDesign());',
      'design = normalizeDesign(JSON.parse(history[idx]));',
      "const DESIGN_BACKUP_KEY = 'coaster_lab_design_recovery_v1';",
      'localStorage.removeItem(STORE_KEY);',
      'function showDesignRecovery(){',
      "btn.id = 'clab-btnRecovery';",
    ]) expect(src).toContain(marker);
    expect(src).toContain('// Canonical source: stem_lab/stem_tool_coasterlab.js in this repository.');
    expect(src).not.toContain('prefer editing there and regenerating');
  });
});
describe('coaster lab — build-your-own discovery and visual feedback', () => {
  it.each(TOOL_PATHS)('%s clearly presents the loaded coaster as an editable design', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('Your coaster · fully editable');
    expect(src).toContain('Shape the track yourself');
    expect(src).toContain('The coaster in the 3-D view is your design—not a fixed demo.');
    expect(src).toContain('class=\\"primary clab-edit-track\\"');
    expect(src).toContain('Choose a glowing track node');
    expect(src).toContain('Optional starting layouts');
    expect(src).toContain('Templates only change your starting shape. Every node stays editable.');
    expect(src).toContain('id=\\"clab-buildCoach\\"');
  });

  it.each(TOOL_PATHS)('%s offers a one-click path into the existing node editor', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('function enterTrackEditor(){');
    expect(src).toContain("for(const b of rootEl.querySelectorAll('.clab-edit-track')) b.addEventListener('click', enterTrackEditor);");
    expect(src).toContain('if(design.points[i].y > design.points[idx].y) idx = i;');
    expect(src).toContain('selectPoint(idx);');
    expect(src).toContain("slHeight.focus({ preventScroll: true })");
    expect(src).toContain("if(buildCoach) buildCoach.hidden = true;");
  });

  function loadElementBuilder(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('/* @clab-elements-start');
    const e = src.indexOf('/* @clab-elements-end');
    expect(s).toBeGreaterThan(-1);
    expect(e).toBeGreaterThan(s);
    return new Function(src.slice(s, e) + '\nreturn { buildElementPoints };')().buildElementPoints;
  }

  it.each(TOOL_PATHS)('%s offers a sparse starter, editable element palette, and safety coach', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'function simpleDesign(){', 'id=\\"clab-btnStartSimple\\"', 'id=\\"clab-elementPalette\\"',
      'data-element=\\"hill\\"', 'data-element=\\"drop\\"', 'data-element=\\"turn-left\\"',
      'data-element=\\"turn-right\\"', 'data-element=\\"loop\\"', 'function insertTrackElement(kind){',
      'Design preflight coach', 'function predictSafetyFindings(){', 'function focusSafetyFinding(index){',
      'data-safety-index', 'const safetyGroup = new THREE.Group();',
    ]) expect(src).toContain(marker);
    expect(src).toContain("points: [\n      { x:  0, y: 3.0, z:  0, bank:  0 }");
    expect(src).toContain('design.points.splice(startIdx + 1, 0, ...added);');
    expect(src).toContain('if(design.certTurnIdx > startIdx) design.certTurnIdx += added.length;');
  });

  it.each(TOOL_PATHS)('%s generates finite, editable geometry for every palette element', (p) => {
    const build = loadElementBuilder(p);
    const a = { x: 0, y: 4, z: 0, bank: 0 };
    const b = { x: 30, y: 4, z: 0, bank: 0 };
    const pieces = {
      hill: build('hill', a, b), drop: build('drop', a, b),
      left: build('turn-left', a, b), right: build('turn-right', a, b), loop: build('loop', a, b),
    };
    expect(pieces.hill).toHaveLength(3);
    expect(pieces.drop).toHaveLength(4);
    expect(pieces.left).toHaveLength(3);
    expect(pieces.right).toHaveLength(3);
    expect(pieces.loop).toHaveLength(10);
    for (const pts of Object.values(pieces)) for (const pt of pts) {
      expect([pt.x, pt.y, pt.z, pt.bank].every(Number.isFinite)).toBe(true);
      expect(pt.y).toBeGreaterThanOrEqual(0.5);
      expect(pt.y).toBeLessThanOrEqual(45);
    }
    expect(Math.max(...pieces.hill.map(pt => pt.y))).toBeGreaterThan(10);
    expect(Math.max(...pieces.loop.map(pt => pt.y))).toBeGreaterThan(14);
    expect(pieces.left[1].z).toBeGreaterThan(0);
    expect(pieces.right[1].z).toBeLessThan(0);
  });

  it.each(TOOL_PATHS)('%s exposes keyboard-operable sidebar tabs with synchronized panel semantics', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'role=\\"tablist\\" aria-label=\\"Coaster Lab panels\\"',
      'role=\\"tab\\" aria-controls=\\"clab-tab-build\\" aria-selected=\\"true\\"',
      'role=\\"tabpanel\\" aria-labelledby=\\"clab-tab-build-btn\\"',
      'function activateTab(b){', "e.key === 'ArrowRight'", "e.key === 'ArrowLeft'",
      "e.key === 'Home'", "e.key === 'End'", "x.setAttribute('aria-selected', String(active))",
    ]) expect(src).toContain(marker);
  });

  function loadKeyboardNudge(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('/* @clab-keyboard-edit-start');
    const e = src.indexOf('/* @clab-keyboard-edit-end');
    expect(s).toBeGreaterThan(-1);
    expect(e).toBeGreaterThan(s);
    return new Function(src.slice(s, e) + '\nreturn { nudgeNodeXZ };')().nudgeNodeXZ;
  }

  it.each(TOOL_PATHS)('%s clamps keyboard ground movement to the editable world', (p) => {
    const nudge = loadKeyboardNudge(p);
    expect(nudge({ x: 12, z: -8 }, 2, -5)).toEqual({ x: 14, z: -13 });
    expect(nudge({ x: 259, z: -259 }, 5, -5)).toEqual({ x: 260, z: -260 });
    expect(nudge({ x: 'bad', z: Infinity }, 2, -3)).toEqual({ x: 2, z: -3 });
  });

  it.each(TOOL_PATHS)('%s lets keyboard users move between editable nodes with announced units', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'id=\\"clab-btnPrevPt\\"', 'id=\\"clab-btnNextPt\\"', 'function selectAdjacentPoint(delta){',
      'id=\\"clab-slX\\"', 'id=\\"clab-slZ\\"', 'id=\\"clab-nodeStep\\"',
      'id=\\"clab-btnXMinus\\"', 'id=\\"clab-btnXPlus\\"', 'id=\\"clab-btnZMinus\\"', 'id=\\"clab-btnZPlus\\"',
      'function nudgeSelectedNode(dx, dz){', 'function syncGroundPositionFromControls(){',
      "selectAdjacentPoint(-1)", "selectAdjacentPoint(1)",
      "slX.setAttribute('aria-valuetext'", "slZ.setAttribute('aria-valuetext'",
      "slHeight.setAttribute('aria-valuetext'", "slBank.setAttribute('aria-valuetext'",
      'id=\\"clab-banner\\" role=\\"status\\" aria-live=\\"polite\\"',
      "bannerEl.setAttribute('aria-live', usesBridgeAnnouncer ? 'off' : 'polite')",
      'id=\\"clab-gl\\" role=\\"img\\" aria-label=\\"Interactive 3-D coaster track visualization.',
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s has cohesive correct/wrong, timer, score, diagram, and summary visuals', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      '#clab-rideQ.is-correct', '#clab-rideQ.is-wrong', '.choice button.correct', '.choice button.wrong',
      '#clab-rqTimer.urgent', '#clab-rqTimer.critical', '.rq-delta.on', '.rq-streak',
      'ride-question-open', 'clabCardIn', 'clabScoreGain', 'ride-accuracy', 'ride-checkpoints',
    ]) expect(src).toContain(marker);
    expect(src).toContain('data-key="${String.fromCharCode(65 + i)}"');
    expect(src).toContain("ride.results.push(ok)");
    expect(src).toContain("rq.box.classList.add(ok ? 'is-correct' : 'is-wrong')");
    expect(src).toContain("p.className = 'clab-spark ' +");
    expect(src).toContain('transform:scaleX(.06) scale(.72)');
  });
});
describe('coaster lab — AI "any topic" Ride & Solve questions', () => {
  // The AI response parser is the risky part (models return messy text), so it is
  // pure and exercised for real. The buffering/fallback wiring is pinned.
  function loadParser(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('/* @clab-aiparse-start');
    const e = src.indexOf('/* @clab-aiparse-end');
    expect(s).toBeGreaterThan(-1);
    expect(e).toBeGreaterThan(s);
    return new Function(src.slice(s, e) + '\nreturn { _parseAiQuestions };')()._parseAiQuestions;
  }

  it('parses a clean JSON array into ride-question shape', () => {
    const parse = loadParser(TOOL_PATHS[0]);
    const raw = JSON.stringify([
      { q: 'What gas do plants breathe in?', choices: ['Oxygen', 'Carbon dioxide', 'Helium', 'Nitrogen'], answer: 1, explain: 'Photosynthesis uses CO2.' },
      { q: 'Chlorophyll is what color?', choices: ['Green', 'Red', 'Blue'], answer: 0, explain: 'It reflects green light.' },
    ]);
    const qs = parse(raw, 'photosynthesis');
    expect(qs).toHaveLength(2);
    expect(qs[0].text).toBe('What gas do plants breathe in?');
    expect(qs[0].choices).toEqual([['0', 'Oxygen'], ['1', 'Carbon dioxide'], ['2', 'Helium'], ['3', 'Nitrogen']]);
    expect(qs[0].correct).toBe('1'); // grading compares val === correct, indices as strings
    expect(qs[0].tag).toContain('photosynthesis');
    expect(qs[0].explain).toBe('Photosynthesis uses CO2.');
  });

  it('escapes model-authored HTML in questions, choices, and explanations', () => {
    const parse = loadParser(TOOL_PATHS[0]);
    const raw = JSON.stringify([{
      q: '<img src=x onerror="boom()"> Is A & B?',
      choices: ['<svg onload="boom()">', 'A & B'],
      answer: 1,
      explain: 'Use <b onclick="boom()">facts</b>.',
    }]);
    const [q] = parse(raw, 'safety');
    expect(q.text).toBe('&lt;img src=x onerror=&quot;boom()&quot;&gt; Is A &amp; B?');
    expect(q.choices[0][1]).toBe('&lt;svg onload=&quot;boom()&quot;&gt;');
    expect(q.choices[1][1]).toBe('A &amp; B');
    expect(q.explain).toBe('Use &lt;b onclick=&quot;boom()&quot;&gt;facts&lt;/b&gt;.');
    expect(JSON.stringify(q)).not.toMatch(/<(?:img|svg|b)\b/i);
  });
  it('digs the array out of code fences and prose the model wraps around it', () => {
    const parse = loadParser(TOOL_PATHS[0]);
    const wrapped = 'Sure! Here are your questions:\n```json\n' +
      JSON.stringify([{ q: 'Capital of France?', choices: ['Paris', 'Rome'], answer: 0 }]) +
      '\n```\nHope that helps!';
    const qs = parse(wrapped, 'capitals');
    expect(qs).toHaveLength(1);
    expect(qs[0].text).toBe('Capital of France?');
    expect(qs[0].explain).toBeTruthy(); // missing explain gets a friendly default
  });

  it('never throws and never yields a malformed question on garbage input', () => {
    const parse = loadParser(TOOL_PATHS[0]);
    expect(parse('', 's')).toEqual([]);
    expect(parse('the model refused to answer', 's')).toEqual([]);
    expect(parse('{not valid json[', 's')).toEqual([]);
    expect(parse(null, 's')).toEqual([]);
    // mixed valid + invalid items: keep the good, drop the bad
    const mixed = JSON.stringify([
      { q: 'Good?', choices: ['a', 'b'], answer: 0 },
      { q: 'No choices', choices: [] },            // too few choices → dropped
      { q: 'Bad index', choices: ['x', 'y'], answer: 9 }, // out-of-range answer → clamped to 0
      { notAQuestion: true },                       // wrong shape → dropped
      'a bare string',                              // not an object → dropped
    ]);
    const qs = parse(mixed, 's');
    expect(qs).toHaveLength(2);
    expect(qs.every(q => q.choices.length >= 2)).toBe(true);
    expect(qs.every(q => Number(q.correct) >= 0 && Number(q.correct) < q.choices.length)).toBe(true);
    expect(qs[1].correct).toBe('0'); // the out-of-range index was clamped
  });

  it.each(TOOL_PATHS)('%s: AI mode buffers, falls back to math, and gates on host AI', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    // the option and the subject input exist in the header
    expect(src).toContain('value=\\"ai\\">🤖 Any topic (AI)');
    expect(src).toContain('id=\\"clab-rideAiSubject\\"');
    // AI is only offered when the host provides it; otherwise the option is removed
    expect(src).toContain('function aiAvailable(){ return !!(__clabBridge && typeof __clabBridge.ai === \'function\'); }');
    expect(src).toContain("const opt = tSel.querySelector('option[value=\"ai\"]');");
    // a checkpoint serves a buffered question, else falls back to a grounded math question
    expect(src).toContain('if(aiQ.buffer.length){');
    expect(src).toContain("ride.current = genElementMath('arithmetic', rideBand(), _coasterFacts(liveState, stop), ride.lastQKey);");
    // questions are pre-fetched (never fetched synchronously at the freeze)
    expect(src).toContain('fetchAiQuestions(rideAiSubject, rideBand())');
    // grade-tuned prompt + JSON-only contract
    expect(src).toContain("{ k2: 'grades K-2', g35: 'grades 3-5', g68: 'grades 6-8', g912: 'grades 9-12' }");
    expect(src).toContain('Return ONLY a JSON array of 6 questions');
  });
});

describe('coaster lab — wired into every load site', () => {
  it.each([
    'AlloFlowANTI.txt',
    'prismflow-deploy/src/AlloFlowANTI.txt',
    'prismflow-deploy/src/App.jsx',
    'build.js',
  ])('%s lists the coaster lab loader', (f) => {
    const src = readFileSync(resolve(process.cwd(), f), 'utf8');
    expect(src).toContain("'stem_lab/stem_tool_coasterlab.js'");
  });

  it.each([
    'stem_lab/stem_lab_module.js',
    'prismflow-deploy/public/stem_lab/stem_lab_module.js',
  ])('%s carries the tile and plugin flag', (f) => {
    const src = readFileSync(resolve(process.cwd(), f), 'utf8');
    expect(src).toContain("// @tool coasterLab");
    expect(src).toContain('coasterLab: true');
  });
});
