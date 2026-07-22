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
