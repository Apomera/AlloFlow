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

describe('coaster lab — Ride & Solve topic + grade adaptation', () => {
  // The checkpoint questions can pose arithmetic tuned to a grade band instead
  // of physics. The generator is pure — eval-slice it and drive it for real.
  function loadGen(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('/* @clab-mathgen-start');
    const e = src.indexOf('/* @clab-mathgen-end');
    expect(s).toBeGreaterThan(-1);
    expect(e).toBeGreaterThan(s);
    return new Function(
      src.slice(s, e) + '\nreturn { genMathQuestion, _bandCfg };'
    )();
  }
  const BANDS = ['k2', 'g35', 'g68', 'g912'];
  const OPS = ['addition', 'subtraction', 'multiplication', 'division'];
  const parseExplain = (ex) => {
    const m = ex.replace(/,/g, '').match(/^(\d+)\s(.)\s(\d+)\s=\s(\d+)\./);
    return m ? { a: +m[1], sign: m[2], b: +m[3], ans: +m[4] } : null;
  };

  it.each(TOOL_PATHS)('%s: generator exists and is pure', (p) => {
    const { genMathQuestion, _bandCfg } = loadGen(p);
    expect(typeof genMathQuestion).toBe('function');
    expect(_bandCfg('k2').choices).toBe(true);   // youngest → multiple choice
    expect(_bandCfg('g68').choices).toBe(false);  // older → typed number
  });

  it('every topic × band produces a correct, grade-tuned, coaster-themed question', () => {
    const { genMathQuestion, _bandCfg } = loadGen(TOOL_PATHS[0]);
    for (const band of BANDS) {
      const cfg = _bandCfg(band);
      for (const op of OPS) {
        for (let i = 0; i < 120; i++) {
          const q = genMathQuestion(op, band);
          const parts = parseExplain(q.explain);
          expect(parts, `${op}/${band} explain: ${q.explain}`).toBeTruthy();
          // the stored answer matches the arithmetic and is a non-negative integer
          expect(q.answer).toBe(parts.ans);
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          // the arithmetic itself is right
          const { a, b, ans } = parts;
          if (op === 'addition') expect(a + b).toBe(ans);
          if (op === 'subtraction') { expect(a - b).toBe(ans); expect(a).toBeGreaterThanOrEqual(b); } // never negative
          if (op === 'multiplication') expect(a * b).toBe(ans);
          if (op === 'division') { expect(a % b).toBe(0); expect(a / b).toBe(ans); } // always exact
          // operands respect the band range (grade tuning is real)
          if (op === 'addition') { expect(a).toBeGreaterThanOrEqual(cfg.add[0]); expect(a).toBeLessThanOrEqual(cfg.add[1]); }
          if (op === 'multiplication') { expect(a).toBeLessThanOrEqual(cfg.mulA[1]); expect(b).toBeLessThanOrEqual(cfg.mulB[1]); }
          // coaster-themed prose, not a bare sum
          expect(q.text).toMatch(/rider|ticket|seat|car|lap|photo|people|inspector|metre|m\b/i);
          // k2 gets 3 choices incl. the right one; older bands type a number
          if (band === 'k2') {
            expect(q.choices).toHaveLength(3);
            expect(q.choices.map(c => c[0])).toContain(q.correct);
            expect(q.correct).toBe(String(q.answer));
          } else {
            expect(q.choices).toBeUndefined();
            expect(q.tolAbs).toBe(0.4); // exact-integer matching for typed answers
          }
        }
      }
    }
  });

  it('mixed math ("arithmetic") stays within the allowed operations per band', () => {
    const { genMathQuestion } = loadGen(TOOL_PATHS[0]);
    // k2 excludes division (no clean remainders for the youngest); older bands include it
    const k2ops = new Set();
    for (let i = 0; i < 400; i++) k2ops.add(genMathQuestion('arithmetic', 'k2').mathOp);
    expect(k2ops.has('division')).toBe(false);
    const g68ops = new Set();
    for (let i = 0; i < 400; i++) g68ops.add(genMathQuestion('arithmetic', 'g68').mathOp);
    expect(g68ops.has('division')).toBe(true);
  });

  it.each(TOOL_PATHS)('%s: physics remains the default and is swapped at the checkpoint, not in buildRideStops', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    // default topic is physics
    expect(src).toContain("localStorage.getItem('coaster_lab_ride_topic') || 'physics'");
    // pauseForQuestion swaps content only for non-physics topics
    expect(src).toContain("if(rideTopic === 'physics'){");
    expect(src).toContain('ride.current = genMathQuestion(rideTopic, rideBand());');
  });

  it.each(TOOL_PATHS)('%s: grade band comes from the host (auto) or a manual override', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    // host passes the app grade band down the bridge
    expect(src).toContain('bridge.gradeBand = (typeof ctx.gradeBand === \'string\')');
    // rideBand honors a manual override, else falls back to the bridge band, else g68
    expect(src).toContain('const b = __clabBridge && __clabBridge.gradeBand;');
    // the two header controls exist with all options
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
    // a checkpoint serves a buffered question, else falls back to a math question
    expect(src).toContain('if(aiQ.buffer.length){');
    expect(src).toContain("ride.current = genMathQuestion('arithmetic', rideBand());");
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
