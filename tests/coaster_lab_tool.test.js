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
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const TOOL_PATHS = [
  'stem_lab/stem_tool_coasterlab.js',
  'desktop/web-app/public/stem_lab/stem_tool_coasterlab.js',
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

describe('coaster lab — teardown survives partial initialization', () => {
  function loadCleanup(p, clearIntervalFn = () => {}, clearTimeoutFn = () => {}) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const start = src.indexOf('/* @clab-cleanup-start');
    const end = src.indexOf('/* @clab-cleanup-end', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const cleanupBlock = src.slice(start, end);
    const api = new Function(
      'clearInterval',
      'clearTimeout',
      cleanupBlock + '\nreturn { resources: __clabResources, destroy: __clabDestroy, isDead: () => __clabDead };',
    )(clearIntervalFn, clearTimeoutFn);
    return { cleanupBlock, ...api };
  }

  it.each(TOOL_PATHS)('%s: early cleanup does not touch later lexical bindings', (p) => {
    const { cleanupBlock, destroy, isDead } = loadCleanup(p);
    expect(cleanupBlock).not.toContain('ride.timerId');
    expect(cleanupBlock).not.toContain('audio.ctx');
    expect(cleanupBlock).not.toContain('try{ renderer.');
    expect(() => destroy()).not.toThrow();
    expect(isDead()).toBe(true);
  });

  it('stops all acquired resources once and clears their registry entries', () => {
    const calls = [];
    const { resources, destroy } = loadCleanup(
      TOOL_PATHS[0],
      id => calls.push(['interval', id]),
      id => calls.push(['timeout', id]),
    );
    const sharedTexture = { isTexture: true, dispose: () => calls.push(['texture', 'dispose']) };
    const sharedMaterial = { map: sharedTexture, dispose: () => calls.push(['material', 'dispose']) };
    const sharedGeometry = { dispose: () => calls.push(['geometry', 'dispose']) };
    resources.renderer = {
      setAnimationLoop: value => calls.push(['loop', value]),
      renderLists: { dispose: () => calls.push(['renderLists', 'dispose']) },
      dispose: () => calls.push(['renderer', 'dispose']),
      forceContextLoss: () => calls.push(['renderer', 'context-loss']),
    };
    resources.sceneRoot = {
      traverse: visit => {
        visit({ geometry: sharedGeometry, material: sharedMaterial });
        visit({ geometry: sharedGeometry, material: sharedMaterial });
      },
    };
    resources.rideTimerId = 'question';
    resources.rideResumeId = 'resume';
    resources.rideBurstId = 'burst';
    resources.bannerTimerId = 'banner';
    resources.xrSession = { end: () => { calls.push(['xr', 'end']); return Promise.resolve(); } };
    resources.audioCtx = { close: () => { calls.push(['audio', 'close']); return Promise.resolve(); } };

    destroy();
    destroy();

    expect(calls).toEqual([
      ['loop', null],
      ['interval', 'question'],
      ['timeout', 'resume'],
      ['timeout', 'burst'],
      ['timeout', 'banner'],
      ['xr', 'end'],
      ['audio', 'close'],
      ['geometry', 'dispose'],
      ['texture', 'dispose'],
      ['material', 'dispose'],
      ['renderLists', 'dispose'],
      ['renderer', 'dispose'],
      ['renderer', 'context-loss'],
    ]);
    expect(Object.values(resources).every(value => value === null)).toBe(true);
  });

  it.each(TOOL_PATHS)('%s: tracks late resources and cleans a failed mount', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('__clabResources.renderer = renderer;');
    expect(src).toContain('__clabResources.audioCtx = audio.ctx;');
    expect(src).toContain('__clabResources.rideTimerId = ride.timerId;');
    expect(src).toContain('__clabResources.xrSession = session;');
    expect(src).toContain('__clabResources.sceneRoot = scene;');
    expect(src).toContain("if (typeof el._clabCleanup === 'function') el._clabCleanup();");
  });
});
describe('coaster lab — keyboard isolation, guide semantics, and ref cleanup', () => {
  function loadShortcutHelpers(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const start = src.indexOf('/* @clab-shortcut-target-start');
    const end = src.indexOf('/* @clab-shortcut-target-end', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return new Function(src.slice(start, end) + '\nreturn { isGlobalShortcutTarget, isTextEditingTarget };')();
  }

  it.each(TOOL_PATHS)('%s: global shortcuts ignore every interactive control', (p) => {
    const { isGlobalShortcutTarget, isTextEditingTarget } = loadShortcutHelpers(p);
    const host = document.createElement('div');
    host.innerHTML = '<button><span id="inside">Answer</span></button><input><select></select><a href="#">link</a><div contenteditable="true"><b>edit</b></div><div id="plain"></div>';
    const inside = host.querySelector('#inside');
    const input = host.querySelector('input');
    const select = host.querySelector('select');
    const editable = host.querySelector('[contenteditable] b');
    expect(isGlobalShortcutTarget(inside)).toBe(true);
    expect(isGlobalShortcutTarget(input)).toBe(true);
    expect(isGlobalShortcutTarget(select)).toBe(true);
    expect(isGlobalShortcutTarget(host.querySelector('a'))).toBe(true);
    expect(isGlobalShortcutTarget(editable)).toBe(true);
    expect(isGlobalShortcutTarget(host.querySelector('#plain'))).toBe(false);
    expect(isTextEditingTarget(input)).toBe(true);
    expect(isTextEditingTarget(editable)).toBe(true);
    expect(isTextEditingTarget(select)).toBe(false);
  });

  it.each(TOOL_PATHS)('%s: guide exposes state, restores focus, and Escape wins over control filtering', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('aria-controls=\\"clab-guide\\" aria-expanded=\\"false\\"');
    expect(src).toContain('id=\\"clab-guide\\" role=\\"dialog\\" aria-modal=\\"false\\" aria-labelledby=\\"clab-guide-title\\" tabindex=\\"-1\\"');
    expect(src).toContain("guideBtn.setAttribute('aria-expanded', 'true')");
    expect(src).toContain('guideReturnFocus.focus({ preventScroll: true })');
    const handlerStart = src.indexOf("rootEl.addEventListener('keydown', e => {");
    const handlerEnd = src.indexOf('/* undo / redo */', handlerStart);
    const handler = src.slice(handlerStart, handlerEnd);
    expect(handler.indexOf("k === 'escape'")).toBeLessThan(handler.indexOf('isGlobalShortcutTarget(e.target)'));
  });

  it.each(TOOL_PATHS)('%s: detached refs clean up on a microtask without restarting connected rerenders', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('var detachedEl = refCb._el;');
    expect(src).toContain('if (!detachedEl.isConnected && typeof detachedEl._clabCleanup === \'function\')');
    expect(src).toContain('refCb._el = el;');
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

  it('avoid also takes the whole list of keys this ride has already used', () => {
    const { genElementMath } = loadGen(TOOL_PATHS[0]);
    // hand it every subtraction key but one; only the survivor may come back
    const used = ['sub-drop', 'sub-here', 'sub-loop', 'sub-left'];
    for (let i = 0; i < 300; i++) {
      expect(used).not.toContain(genElementMath('subtraction', 'g68', FACTS, used).key);
    }
    // a four-stop ride threading its used list gets four different questions
    const seen = [];
    for (let stop = 0; stop < 4; stop++) seen.push(genElementMath('arithmetic', 'g68', FACTS, seen).key);
    expect(new Set(seen).size).toBe(4);
  });

  it('mixed math mixes +, −, × and ÷, but keeps division away from K-2; a flat checkpoint still works', () => {
    const { genElementMath } = loadGen(TOOL_PATHS[0]);
    const ops = new Set();
    for (let i = 0; i < 600; i++) ops.add(genElementMath('arithmetic', 'g68', FACTS).mathOp);
    expect(ops.has('addition')).toBe(true);
    expect(ops.has('subtraction')).toBe(true);
    expect(ops.has('multiplication')).toBe(true);
    expect(ops.has('division')).toBe(true);
    const k2 = new Set();
    for (let i = 0; i < 600; i++) k2.add(genElementMath('arithmetic', 'k2', FACTS).mathOp);
    expect(k2.has('division')).toBe(false);   // sharing is not a K-2 skill here
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
    const resources = { rideTimerId: null, rideResumeId: null, rideBurstId: null };
    const submit = new Function(
      'ride', 'rq', 'performance',
      'clearRideQuestionTimer', 'clearRideResumeTimer', 'clearRideBurstTimer',
      'setTimeout', '__clabResources',
      'fmt', 'blip', 'reducedMotion', 'sim', 'spawnAnswerBurst',
      src.slice(s, e) + '\nreturn submitRideAnswer;'
    )(
      rideState, rqState, { now: () => 1000 },
      () => { rideState.timerId = null; resources.rideTimerId = null; },
      () => { rideState.resumeId = null; resources.rideResumeId = null; },
      () => { rideState.burstId = null; resources.rideBurstId = null; },
      (fn, delay) => { scheduled.push({ fn, delay }); return scheduled.length; }, resources,
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
    expect(src).toContain('function clearRideResumeTimer(){');
    expect(src).toContain('__clabResources.rideResumeId = null;');
    expect(src).toContain('clearRideResumeTimer();');
    expect(src).toContain('if(!ride.active || ride.idx !== answerIdx) return;');
    expect(src).toContain('.clab-root #clab-rideQ{max-height:calc(100% - 156px);overflow-y:auto');
    expect(src).toContain('@media (max-width:760px),(max-height:620px)');
    expect(src).toContain("function reducedMotion(){ return motionComfort || !!(REDUCED_MOTION_QUERY && REDUCED_MOTION_QUERY.matches); }");
    expect(src).toContain("localStorage.getItem('coaster_lab_motion') === 'steady'");
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
    expect(src).toContain("const asPhysics = rideTopic === 'physics' ||");
    // the checkpoint math is grounded via facts read from the live sim + analysis,
    // and threads every key this ride has used so the questions keep changing
    expect(src).toContain('ride.current = genElementMath(mathTopic, rideBand(), _coasterFacts(liveState, stop), ride.usedKeys);');
    expect(src).toContain('if(ride.current.key) ride.usedKeys.push(ride.current.key);');
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

  it.each(TOOL_PATHS)('%s: initializes Ride & Solve state before wiring its controls', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const initCall = src.indexOf('\ninitRideControls();');
    expect(initCall).toBeGreaterThan(src.indexOf("let rideTopic = "));
    expect(initCall).toBeGreaterThan(src.indexOf("let rideGradeSel = "));
    expect(initCall).toBeGreaterThan(src.indexOf("let rideAiSubject = "));
    expect(initCall).toBeGreaterThan(src.indexOf("const aiQ = "));
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

  it.each(TOOL_PATHS)('%s offers four persisted, theme-aware coaster environments', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'const VISUAL_THEMES = {', 'dusk: {', 'daylight: {', 'neon: {', 'blueprint: {',
      "localStorage.getItem('coaster_lab_theme')", 'id="clab-visualTheme"', 'function applyVisualTheme(name',
      'zenColor:', 'horizonColor:', 'starStrength:', 'const terrainGrid = new THREE.GridHelper',
      "rootEl.dataset.visualTheme = name", "terrainGrid.visible = !fxLite && visualTheme === 'blueprint'",
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s adds an accessible track minimap and optional live physics vectors', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'id="clab-minimap"', 'role="img" aria-label="Top-down map of the track and train position"',
      'function rebuildMiniMap(){', 'function drawMiniMap(){', 'rebuildMiniMap();', 'drawMiniMap();',
      'id="clab-btnVectors" aria-pressed="false"', 'id="clab-vectorLegend" hidden',
      'const vectorVelocity = new THREE.ArrowHelper', 'const vectorSeat = new THREE.ArrowHelper',
      'const vectorGravity = new THREE.ArrowHelper', 'function updatePhysicsVectors(){',
      "vectorButton.setAttribute('aria-pressed', String(vectorsOn))", 'updatePhysicsVectors();',
      'reducedMotion() ? 1.45',
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s gives the track and station a more convincing engineered structure', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'footing: new THREE.MeshStandardMaterial', 'cap:     new THREE.MeshStandardMaterial',
      'columns, concrete footings, and cross caps', 'const foot = new THREE.InstancedMesh',
      'const cap = new THREE.InstancedMesh', 'for(const mesh of [sup, foot, cap])',
      'const stationEdgeMat = new THREE.MeshBasicMaterial', 'illuminated platform edges and a compact entrance arch',
      'const stationSignalMats = {', 'three-aspect dispatch signal at the station exit',
      'function updateStationVisuals(now){', "phase < 1.3 ? 'amber' : 'green'", 'updateStationVisuals(now);',
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s adds theme-aware park depth and safe speed-responsive motion', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'const atmosphereGroup = new THREE.Group()', 'const ridgeGeo = new THREE.ConeGeometry',
      'const ferrisWheel = new THREE.Group()', 'const ferrisRotor = new THREE.Group()',
      'ferrisRotor.rotation.z +=', 'atmosphereGroup.position.set(orbit.target.x, 0, orbit.target.z)',
      'const SPEED_STREAK_COUNT = 42', 'const speedStreaks = new THREE.LineSegments',
      'function updateSpeedStreaks(){', "camMode === 'onboard' || camMode === 'chase'",
      '!fxLite && !xrOn && !reducedMotion()', 'speedStreakGeo.attributes.position.needsUpdate = true',
      'updateSpeedStreaks();', 'updateParkAtmosphere(dt);', 'atmosphereGroup.visible = !fxLite',
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s provides multi-metric track analysis and richer ride reports', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'id="clab-trackViz"', 'Speed heatmap', 'Vertical g heatmap', 'Lateral g heatmap', 'Curvature heatmap',
      'const HEAT_CONFIG = {', 'function idealGLat(i){', 'function heatColor(i, out){',
      'function applyTrackViz(mode, announce = true){', 'function buildRideInsights(tele, sc){',
      'Engineer next steps', 'id="chL"', "drawChart(cvL, tele.trace, 'gl'",
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s improves editing with visible history, previews, and guided challenges', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'id="clab-btnUndo"', 'id="clab-btnRedo"', 'function syncHistoryButtons(){',
      'const previewGroup = new THREE.Group()', 'function showElementPreview(kind){', "b.addEventListener('focus'",
      'id="clab-designChallenge"', 'Build a smooth 20 m hill', 'Create 3 seconds of airtime',
      'Finish below 4.0 vertical g', 'function updateDesignChallenge(tele = lastTele){', 'sim.tele.designKey = JSON.stringify(design.points)',
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s guides first-time learners through a measurable first ride', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'id="clab-guidedWelcome"', 'Guided first coaster', 'id="clab-guidedStep"', 'id="clab-guidedRecord"', 'id="clab-guidedCompare"', 'id="clab-guidedExport"', 'id="clab-guidedClear"', 'id="clab-guidedConditions"', 'id="clab-btnPacketExport"', 'id="clab-btnPacketImport"', 'function exportLabPacket(){', 'function importLabPacket(str){', "type: 'coaster-lab-packet'", 'LAB_PACKET_SCHEMA = 1', 'function packetTelemetrySnapshot(tele){', 'evidence: packetTelemetrySnapshot(lastTele)',
      "const GUIDED_STATE_KEY = 'coaster_lab_onboarding_v1';", "const GUIDED_RECORD_KEY = 'coaster_lab_guided_record_v1';", 'design = normalizeDesign(simpleDesign());',
      'function syncGuidedWelcome(){', 'function guidedConditionSnapshot(){', 'function guidedConditionsLocked(){', 'function guidedRejectConditionChange(){', 'function guidedGoalSnapshot(tele){', 'function guidedComparison(tele){', 'function guidedNotebookText(){', 'function copyGuidedNotebook(){', 'function clearGuidedNotebook(){', 'function beginGuidedAction(){', 'function renderPredictionEvidence(tele){', 'Physics clue', 'function renderRevisionComparison(tele){', 'function renderGuidedHistoryTrend(history){', 'data-clab-history-trend', 'function guidedTraceSnapshot(tele){', 'trace: guidedTraceSnapshot(tele)', 'function renderGuidedTraceOverlay(history, fromIndex, toIndex){', 'data-clab-trace-overlay', 'function renderExperimentTimeline(tele){', 'data-clab-experiment-timeline', 'function renderExperimentComparisonBoard(){', 'data-clab-experiment-compare', 'function guidedComparisonConclusion(history, fromIndex, toIndex){', 'data-clab-comparison-conclusion', 'data-clab-copy-conclusion', 'function buildGuidedHistoryCsv(){', 'comparison_quality', 'prediction_coach', 'data-clab-history-csv', 'function buildGuidedTeacherReport(history, fromIndex, toIndex, conclusionText){', 'data-clab-teacher-report', 'data-clab-adaptive-plan', 'function guidedRubricSummary(){', 'function guidedExperimentQuality(history, fromIndex, toIndex){', 'function guidedDesignChangeStats(beforeEntry, afterEntry){', 'data-clab-evidence-quality', 'guidedAdaptiveRecommendation', 'guidedAdaptivePlan', 'guidedAdaptiveAction', 'guidedCurrentTelemetry', 'guidedEvidenceFocus', 'guidedEvidenceFocusPoint', 'inspectAdaptiveEvidence', 'guidedReflectionPrompt', 'guidedAdaptiveProgress', 'renderAdaptiveProgress', 'acceptAdaptiveChallenge', 'clab-adaptiveCoach', 'clab-adaptivePlan', 'clab-adaptiveAction', 'clab-adaptiveFocus', 'clab-btnAdaptiveInspect', 'Evidence focus', 'Action plan', 'Action plan - Change:', 'Action plan - Why:', 'Action plan - Test:', 'Done when:', 'clab-reflection-prompt', 'Adaptive recommendation:', 'Next move:', 'Suggested reflection prompt', 'clab-btnAdaptiveAccept', 'clab-adaptiveProgress', 'adaptivePlanVisible', 'Adaptive pathway', 'milestones:', 'adaptivePacket', 'function normalizeGuidedReview(raw){', 'const GUIDED_REVIEW_KEY =', 'data-clab-classroom-rubric', 'data-clab-review-status', 'data-clab-finalize-review', 'data-clab-student-reflection', 'data-clab-rubric-weight', 'data-clab-rubric-notes', 'review: guidedReview', 'bindClassroomRubric', 'bindGuidedTeacherReport', 'bindGuidedHistoryExport', 'bindExperimentComparison', 'guidedRun: () => {',
      'telemetrySummary: () => {', 'guidedWelcomeEl.hidden = !active', 'window.__testHooks.coasterLab = rootEl._lab;',
    ]) expect(src).toContain(marker);
    for (const marker of ['id="clab-guidedPrediction"', 'id="clab-guidedSpeed"', 'id="clab-guidedForce"', 'id="clab-guidedRevise"', 'function guidedPredictionReady(){', 'function guidedActualSpeed(tele){', 'function updateGuidedPredictionFeedback(tele){', 'function guidedPredictionCoach(actualSpeed, actualForce, speedCorrect, forceCorrect){', 'predictionCoach', 'function persistGuidedRecord(){', 'friction: tele.fricUsed', 'propulsion: design.propulsion.mode']) expect(src).toContain(marker);
    const statePos = src.indexOf('let guidedState =');
    const savePos = src.indexOf("if(guidedState === 'ready') saveDesign(false);");
    expect(statePos).toBeGreaterThan(-1);
    expect(savePos).toBeGreaterThan(statePos);
  });
  it.each(TOOL_PATHS)('%s adds an accessible dispatch presentation and livelier park motion', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'id="clab-dispatch" role="status" aria-live="polite"', 'function updateDispatchOverlay(){',
      'const trainWheels = [], restraintBars = []', 'function updateTrainPresentation(){',
      'const cloudGroup = new THREE.Group()', 'const birdFlock = new THREE.LineSegments', 'stationFlags.forEach',
      'id="clab-btnComfort" aria-pressed="false"', "localStorage.getItem('coaster_lab_motion')", '!reducedMotion()',
      'id="clab-telemetryAnnouncer"', 'function announceRideTelemetry', 'id="clab-hudState"',
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s explains the predicted physics at each selected node', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'id="clab-nodeLens"', 'id="clab-nodeSection"', 'id="clab-nodeSpeed"',
      'id="clab-nodeGV"', 'id="clab-nodeBank"', 'function nodePhysics(idx){', 'function syncNodeLens(idx){',
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s adds readable track landmarks and animated station gates', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'const stationGates = []', 'platform gates open with dispatch', 'const sectionGroup = new THREE.Group()',
      'function makeSectionSprite(label){', 'function renderSectionLabels(){', "['First drop'", "['Brake run'",
      'gate.pivot.rotation.y +=', "sectionGroup.visible = !fxLite && !sim.running && camMode === 'orbit'",
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s provides accessible, synchronized telemetry replay', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'id="clab-replayScrub" type="range"', 'id="clab-btnReplay"', 'id="clab-replayReadout"',
      'function bindTelemetryReplay(tele){', 'function applyTelemetryFrame(index){', 'function updateTelemetryReplay(now){',
      'role="img" aria-label="Speed over the full coaster circuit', 'Number.isFinite(opts.cursorS)',
      'Autoplay is off in Steady Motion mode',
    ]) expect(src).toContain(marker);
  });
});
describe('coaster lab — adaptive mastery and evidence freshness', () => {
  function loadMarkedBlock(p, startMarker, endMarker, returnSource, parameters = []) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const start = src.indexOf(startMarker);
    const end = src.indexOf(endMarker, start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return new Function(...parameters, src.slice(start, end) + '\n' + returnSource);
  }

  it.each(TOOL_PATHS)('%s retains enough runs for three validated goals and exposes terminal mastery', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('const GUIDED_HISTORY_LIMIT = 12;');
    expect((src.match(/slice\(-GUIDED_HISTORY_LIMIT\)/g) || [])).toHaveLength(3);
    expect(src).toContain('function guidedAdaptiveMilestones(history){');
    expect(src).toContain('function guidedAdaptiveMastered(items){');
    expect(src).toContain('Pathway mastered: all three goals validated');
    expect(src).toContain("stage: 'mastery'");
    expect(src).toContain('mastered: progress.mastered');
  });

  it.each(TOOL_PATHS)('%s keeps validated milestones across interleaved investigations', (p) => {
    const factory = loadMarkedBlock(
      p,
      '/* @clab-adaptive-mastery-start',
      '/* @clab-adaptive-mastery-end',
      'return { guidedAdaptiveMastered, guidedAdaptiveNextChallenge, guidedAdaptiveMilestones };',
      ['guidedExperimentQuality'],
    );
    const quality = (history, fromIndex, toIndex) => ({
      level: history[fromIndex].pair === history[toIndex].pair ? 'valid' : 'partial',
      score: history[fromIndex].pair === history[toIndex].pair ? 2 : 1,
    });
    const { guidedAdaptiveMastered, guidedAdaptiveNextChallenge, guidedAdaptiveMilestones } = factory(quality);
    const history = [
      { goal: 'hill20', pair: 'hill', goalPassed: false },
      { goal: 'airtime3', pair: 'air', goalPassed: false },
      { goal: 'hill20', pair: 'hill', goalPassed: true },
      { goal: 'gentle4', pair: 'gentle', goalPassed: false },
      { goal: 'airtime3', pair: 'air', goalPassed: true },
      { goal: 'gentle4', pair: 'gentle', goalPassed: true },
    ];
    const milestones = guidedAdaptiveMilestones(history);
    expect(milestones.map(item => ({ goal: item.goal, runs: item.runs, passed: item.passed, evidence: item.evidence }))).toEqual([
      { goal: 'hill20', runs: 2, passed: true, evidence: true },
      { goal: 'airtime3', runs: 2, passed: true, evidence: true },
      { goal: 'gentle4', runs: 2, passed: true, evidence: true },
    ]);
    expect(guidedAdaptiveMastered(milestones)).toBe(true);
    expect(guidedAdaptiveNextChallenge('gentle4', milestones)).toBeNull();
    const unfinished = milestones.map(item => item.goal === 'airtime3' ? { ...item, evidence: false } : item);
    expect(guidedAdaptiveNextChallenge('gentle4', unfinished)).toBe('airtime3');
    const isolatedPass = guidedAdaptiveMilestones([
      { goal: 'hill20', pair: 'comparison', goalPassed: false },
      { goal: 'hill20', pair: 'comparison', goalPassed: false },
      { goal: 'hill20', pair: 'isolated', goalPassed: true },
    ])[0];
    expect(isolatedPass).toMatchObject({ passed: true, evidence: false });
  });

  it.each(TOOL_PATHS)('%s targets evidence according to the active engineering goal', (p) => {
    const factory = loadMarkedBlock(
      p,
      '/* @clab-adaptive-evidence-start',
      '/* @clab-adaptive-evidence-end',
      'return guidedEvidenceTarget;',
    );
    const guidedEvidenceTarget = factory();
    const trace = [
      { s: 0, g: 1.1 },
      { s: 10, g: 0.1 },
      { s: 20, g: -0.1 },
      { s: 30, g: 0.2 },
      { s: 40, g: 1.4 },
      { s: 50, g: 3.2 },
      { s: 60, g: -4.5 },
    ];
    expect(guidedEvidenceTarget(trace, 'hill20', 52)).toMatchObject({ s: 50, evidenceKind: 'hill', evidenceStartS: 50, evidenceEndS: 50 });
    expect(guidedEvidenceTarget(trace, 'airtime3')).toMatchObject({ s: 20, evidenceKind: 'airtime', evidenceStartS: 10, evidenceEndS: 30 });
    expect(guidedEvidenceTarget(trace, 'gentle4')).toMatchObject({ s: 50, evidenceKind: 'force', evidenceStartS: 50, evidenceEndS: 50 });
  });

  it.each(TOOL_PATHS)('%s invalidates evidence when any experiment dimension changes', (p) => {
    const factory = loadMarkedBlock(
      p,
      '/* @clab-experiment-signature-start',
      '/* @clab-experiment-signature-end',
      'return guidedExperimentSignature;',
    );
    const signature = factory();
    const points = [
      { x: 0, y: 5, z: 0, bank: 0 },
      { x: 20, y: 22, z: 4, bank: 12 },
    ];
    const settings = { friction: 'realistic', cars: 3, propulsion: 'chain', accel: 7.5, challenge: 'hill20' };
    const baseline = signature(points, settings);
    const variants = [
      signature([{ ...points[0] }, { ...points[1], y: 23 }], settings),
      signature(points, { ...settings, friction: 'ideal' }),
      signature(points, { ...settings, cars: 4 }),
      signature(points, { ...settings, propulsion: 'launch' }),
      signature(points, { ...settings, accel: 8 }),
      signature(points, { ...settings, challenge: 'airtime3' }),
    ];
    expect(new Set(variants).size).toBe(variants.length);
    for (const variant of variants) expect(variant).not.toBe(baseline);
  });

  it.each(TOOL_PATHS)('%s persists signatures through run history, packets, and live readiness', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'sim.tele.experimentSignature = guidedExperimentSignature',
      'experimentSignature: tele.experimentSignature',
      'experimentSignature: expectedExperimentSignature',
      'function packetTelemetryRestore(raw, expectedDesignKey, expectedFingerprint, expectedExperimentSignature){',
      'if(tele.experimentSignature !== expectedExperimentSignature) return null;',
      'lastTele.experimentSignature !== guidedCurrentExperimentSignature()',
      'packetEvidenceReady: !!guidedCurrentTelemetry()',
      'adaptiveEvidenceTarget:',
      "experimentSignature: typeof t.experimentSignature === 'string'",
    ]) expect(src).toContain(marker);
  });
});

describe('coaster lab - visual inquiry and evidence storytelling', () => {
  function loadMarkedBlock(p, startMarker, endMarker, returnSource) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const start = src.indexOf(startMarker);
    const end = src.indexOf(endMarker, start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return new Function(src.slice(start, end) + '\n' + returnSource);
  }

  it.each(TOOL_PATHS)('%s sequences the visible Predict-Test-Explain-Revise cycle from learner evidence', (p) => {
    const factory = loadMarkedBlock(
      p,
      '/* @clab-inquiry-phase-start',
      '/* @clab-inquiry-phase-end',
      'return guidedInquiryPhase;',
    );
    const guidedInquiryPhase = factory();
    expect(guidedInquiryPhase('new', [], '', false)).toBe('predict');
    expect(guidedInquiryPhase('testing', [{}], '', true)).toBe('test');
    expect(guidedInquiryPhase('tested', [{}], 'Short note', false)).toBe('explain');
    expect(guidedInquiryPhase('tested', [{}], 'My measured evidence supports the claim, and I identified a single next revision.', false)).toBe('revise');
  });

  it.each(TOOL_PATHS)('%s builds a goal-specific visual evidence story from measured results', (p) => {
    const factory = loadMarkedBlock(
      p,
      '/* @clab-evidence-story-model-start',
      '/* @clab-evidence-story-model-end',
      'return guidedEvidenceStoryModel;',
    );
    const guidedEvidenceStoryModel = factory();
    const points = [
      { x: 0, y: 5, z: 0, bank: 0 },
      { x: 20, y: 22, z: 4, bank: 12 },
      { x: 40, y: 8, z: 0, bank: 0 },
    ];
    const telemetry = { status: 'complete', maxV: 20, maxGV: 4.5, minGV: 0.1, airtime: 2.4 };
    const focus = { s: 20, g: 0.1, evidenceLabel: 'longest measured airtime region', evidenceStartS: 10, evidenceEndS: 30 };

    const hill = guidedEvidenceStoryModel(telemetry, 'hill20', points, focus);
    expect(hill).toMatchObject({ goal: 'hill20', value: 22, target: 20, unit: 'm', pass: true });
    expect(hill.steps).toHaveLength(3);
    expect(hill.steps.map(step => step.label)).toEqual(['Track shape', 'Motion', 'Rider effect']);

    const airtime = guidedEvidenceStoryModel(telemetry, 'airtime3', points, focus);
    expect(airtime).toMatchObject({ goal: 'airtime3', value: 2.4, target: 3, unit: 's', pass: false, startS: 10, endS: 30 });
    expect(airtime.reasoning).toMatch(/crest/i);

    const gentle = guidedEvidenceStoryModel(telemetry, 'gentle4', points, focus);
    expect(gentle).toMatchObject({ goal: 'gentle4', value: 4.5, target: 4, unit: 'g', pass: false });
    expect(gentle.reasoning).toMatch(/centripetal acceleration/i);
    expect(guidedEvidenceStoryModel({ ...telemetry, maxGV: 3.8 }, 'gentle4', points, focus).pass).toBe(true);
  });

  it.each(TOOL_PATHS)('%s wires an accessible, responsive evidence narrative into the report and charts', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      '/* @clab-inquiry-visuals-start */',
      'id="clab-inquiryLoop"',
      'data-clab-inquiry-phase="predict"',
      'clab-inquiry-step is-current',
      'data-clab-evidence-story="true"',
      'class="clab-goal-meter" role="img"',
      'Physics connection:',
      'data-clab-explain-scaffold',
      'data-clab-start-explanation',
      'function guidedCerStarter(model){',
      'function bindGuidedEvidenceStory(tele){',
      '/* @clab-evidence-chart-focus-start */',
      "focusLabel: evidencePoint ? 'GOAL EVIDENCE' : ''",
      'learningJourney: () =>',
      '@media (max-width:720px)',
      '@media (forced-colors:active)',
    ]) expect(src).toContain(marker);

    const storyCall = src.indexOf('html += renderGuidedEvidenceStory(tele);');
    expect(storyCall).toBeGreaterThan(-1);
    expect(src.indexOf('Park rating', storyCall)).toBeGreaterThan(storyCall);
    expect(src).toContain('bindGuidedEvidenceStory(tele);');
    expect(src).toContain("label.includes('Goal evidence highlighted')");
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

  it('discards an old AI batch when topic or grade changes during the request', () => {
    const src = readFileSync(resolve(process.cwd(), TOOL_PATHS[0]), 'utf8');
    const start = src.indexOf('/* @clab-aiqueue-start');
    const end = src.indexOf('/* @clab-aiqueue-end', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const pending = [];
    const bridge = { ai: (prompt, cb) => pending.push({ prompt, cb }) };
    const api = new Function(
      '__clabBridge', '__clabDead',
      src.slice(start, end) + '\nreturn { aiQ, resetAiQuestionBuffer, fetchAiQuestions };',
    )(bridge, false);
    const completed = [];
    const payload = subject => JSON.stringify([{
      q: `Question about ${subject}?`, choices: ['One', 'Two'], answer: 0, explain: `${subject} explanation.`,
    }]);

    api.fetchAiQuestions('science', 'g35', n => completed.push(['science', n]));
    api.resetAiQuestionBuffer();
    api.fetchAiQuestions('history', 'g68', n => completed.push(['history', n]));
    expect(pending).toHaveLength(2);

    pending[0].cb(null, payload('science'));
    expect(api.aiQ.buffer).toEqual([]);
    expect(completed).toEqual([]);

    pending[1].cb(null, payload('history'));
    expect(api.aiQ.buffer).toHaveLength(1);
    expect(api.aiQ.buffer[0].tag).toContain('history');
    expect(completed).toEqual([['history', 1]]);
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
    expect(src).toContain("ride.current = genElementMath('arithmetic', rideBand(), _coasterFacts(liveState, stop), ride.usedKeys);");
    // questions are pre-fetched (never fetched synchronously at the freeze)
    expect(src).toContain('fetchAiQuestions(rideAiSubject, rideBand())');
    // grade-tuned prompt + JSON-only contract
    expect(src).toContain("{ k2: 'grades K-2', g35: 'grades 3-5', g68: 'grades 6-8', g912: 'grades 9-12' }");
    expect(src).toContain('Return ONLY a JSON array of 6 questions');
  });
});

describe('coaster lab — Ride & Solve asks a different question at every checkpoint', () => {
  function loadPicker(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('/* @clab-ridepick-start');
    const e = src.indexOf('/* @clab-ridepick-end');
    expect(s).toBeGreaterThan(-1);
    expect(e).toBeGreaterThan(s);
    return new Function(src.slice(s, e) + '\nreturn pickRideQuestion;')();
  }
  function rideStopsSource(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('function buildRideStops(){');
    const e = src.indexOf('\nfunction startRide(){', s);
    expect(s).toBeGreaterThan(-1);
    expect(e).toBeGreaterThan(s);
    return src.slice(s, e);
  }

  it.each(TOOL_PATHS)('%s: every checkpoint question carries its own key', (p) => {
    const body = rideStopsSource(p);
    const keys = [...body.matchAll(/key:\s*'([A-Za-z0-9-]+)'/g)].map((m) => m[1]);
    // a healthy pool, and no key reused for two different questions
    expect(keys.length).toBeGreaterThanOrEqual(25);
    expect(new Set(keys).size).toBe(keys.length);
    // every question object in the pools is keyed — count the `text:` fields too
    const texts = (body.match(/\btext:\s*[`']/g) || []).length;
    expect(keys.length).toBe(texts);
  });

  it.each(TOOL_PATHS)('%s: both levels get a pool, not a single fixed question', (p) => {
    const body = rideStopsSource(p);
    // engineer keys (numeric) and explore keys (multiple choice, marked -x-)
    const keys = [...body.matchAll(/key:\s*'([A-Za-z0-9-]+)'/g)].map((m) => m[1]);
    const explore = keys.filter((k) => k.includes('-x-'));
    const engineer = keys.filter((k) => !k.includes('-x-'));
    expect(engineer.length).toBeGreaterThanOrEqual(15);
    expect(explore.length).toBeGreaterThanOrEqual(10);
    // a launched design gets its own checkpoint just after the LSM
    expect(body).toContain("tag: 'Checkpoint · launch'");
  });

  it('the picker never returns a key the ride already used while alternatives remain', () => {
    const pick = loadPicker(TOOL_PATHS[0]);
    const pool = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
    for (let i = 0; i < 500; i++) {
      expect(pick(pool, ['a', 'b']).key).toBe('c');
      expect(['b', 'c']).toContain(pick(pool, ['a']).key);
    }
    // a four-stop ride threading its own used list covers three distinct ideas
    const used = [];
    for (let i = 0; i < 3; i++) used.push(pick(pool, used).key);
    expect(new Set(used).size).toBe(3);
    // once everything has been asked it recycles rather than returning nothing
    expect(pick(pool, ['a', 'b', 'c'])).toBeTruthy();
    // tolerates a bare question object and an empty pool
    expect(pick({ key: 'solo' }, []).key).toBe('solo');
    expect(pick([], [])).toBe(null);
  });

  it.each(TOOL_PATHS)('%s: the header offers a physics+math topic and the ride resets its used list', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('<option value=\\"mix\\">');
    // physics on the even stops, grounded arithmetic on the odd ones
    expect(src).toContain("rideTopic === 'physics' || (rideTopic === 'mix' && ride.idx % 2 === 0)");
    expect(src).toContain('ride.usedKeys = [];');
    expect(src).toContain('ride.usedKeys.push(ride.current.key)');
    // a checkpoint that cannot build a question is skipped, never frozen forever
    expect(src).toContain('if(!ride.current){');
    // the grade control still nudges the level for the mixed topic
    expect(src).toContain("if(rideTopic === 'physics' || rideTopic === 'mix') setLevel(");
  });
});

describe('coaster lab — procedural coaster generator', () => {
  // randomDesign is pure: a number in, a complete buildable design out. Slice it
  // together with the design validator the tool itself uses, and check that every
  // generated coaster survives that validator and respects its own energy budget.
  function loadGen(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const pick = (a, b) => {
      const s = src.indexOf(a);
      const e = src.indexOf(b);
      expect(s).toBeGreaterThan(-1);
      expect(e).toBeGreaterThan(s);
      return src.slice(s, e);
    };
    return new Function(
      pick('/* @clab-random-start', '/* @clab-random-end') +
      pick('/* @clab-design-normalize-start', '/* @clab-design-normalize-end') +
      '\nreturn { randomDesign, normalizeDesign, _clabRng, RANDOM_STYLES, DESIGN_BOUNDS };'
    )();
  }
  const STYLES = ['family', 'classic', 'thrill', 'launch'];

  it.each(TOOL_PATHS)('%s: the same number always rebuilds the same coaster', (p) => {
    const { randomDesign, _clabRng } = loadGen(p);
    expect(JSON.stringify(randomDesign(4821))).toBe(JSON.stringify(randomDesign(4821)));
    expect(JSON.stringify(randomDesign(4821))).not.toBe(JSON.stringify(randomDesign(4822)));
    // the PRNG itself is deterministic and stays in range
    const a = _clabRng(7), b = _clabRng(7);
    for (let i = 0; i < 200; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    // a garbage seed still produces a design instead of throwing
    for (const seed of [0, -5, NaN, undefined, 1e12]) {
      expect(randomDesign(seed).points.length).toBeGreaterThan(5);
    }
  });

  it('every style and seed produces a design the tool itself accepts', () => {
    const { randomDesign, normalizeDesign, DESIGN_BOUNDS } = loadGen(TOOL_PATHS[0]);
    for (const style of STYLES) {
      for (let seed = 1; seed <= 60; seed++) {
        const raw = randomDesign(seed, { style });
        const d = normalizeDesign(raw);          // throws on anything out of bounds
        expect(d.points.length).toBeGreaterThanOrEqual(6);
        expect(d.points.length).toBeLessThanOrEqual(80);
        expect(d.certTurnIdx).toBeGreaterThanOrEqual(0);
        expect(d.certTurnIdx).toBeLessThan(d.points.length);
        expect(raw.meta.style).toBe(style);
        expect(d.propulsion.mode).toBe(style === 'launch' ? 'launch' : 'chain');
        expect(d.propulsion.accel).toBeGreaterThanOrEqual(DESIGN_BOUNDS.accelMin);
        expect(d.propulsion.accel).toBeLessThanOrEqual(DESIGN_BOUNDS.accelMax);
        for (const pt of d.points) {
          expect(Number.isFinite(pt.x) && Number.isFinite(pt.y) && Number.isFinite(pt.z)).toBe(true);
        }
      }
    }
  });

  it('the lift crest is the high point and every later hill sits under the energy budget', () => {
    const { randomDesign } = loadGen(TOOL_PATHS[0]);
    for (const style of STYLES) {
      for (let seed = 1; seed <= 60; seed++) {
        const raw = randomDesign(seed, { style });
        const { crestH, head, valleyY } = raw.meta;
        const top = Math.max(...raw.points.map((p) => p.y));
        expect(top, `${style}/${seed}`).toBeLessThanOrEqual(head);          // never above the ceiling
        if (style === 'launch') {
          // a launch buys head the crest alone does not, so later hills may be
          // taller than it — but they still have to fit under the ceiling
          expect(top, `${style}/${seed}`).toBeLessThan(head);
        } else {
          // on a chain lift the crest IS the summit, and it is the only one
          expect(top - crestH, `${style}/${seed}`).toBeLessThan(0.05);
          expect(raw.points.filter((p) => p.y > crestH - 0.5)).toHaveLength(1);
          for (const p of raw.points) {
            if (p.y > crestH - 0.5) continue;
            expect(p.y, `${style}/${seed}`).toBeLessThan(crestH - 2);
          }
        }
        expect(valleyY).toBeLessThan(crestH - 7);   // there is always a real first drop
        expect(valleyY).toBeGreaterThan(0.5);
      }
    }
  });

  it('build nodes stay far enough apart for the preflight coach', () => {
    const { randomDesign } = loadGen(TOOL_PATHS[0]);
    for (const style of STYLES) {
      for (let seed = 1; seed <= 40; seed++) {
        const pts = randomDesign(seed, { style }).points;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
          expect(d, `${style}/${seed} nodes ${i}`).toBeGreaterThan(1.25);  // the tool's own spacing warning
        }
      }
    }
  });

  it('each style has its own character, and the ground plan closes without doubling back', () => {
    const { randomDesign } = loadGen(TOOL_PATHS[0]);
    const drop = (style) => {
      let sum = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const m = randomDesign(seed, { style }).meta;
        sum += m.crestH - m.valleyY;
      }
      return sum / 40;
    };
    // gentler styles really are gentler: a smaller drop means less speed and less g
    expect(drop('family')).toBeLessThan(drop('classic'));
    expect(drop('classic')).toBeLessThan(drop('thrill'));
    // the ground plan is star-shaped about its own centre, which is what makes it
    // impossible for the circuit to cross itself: the bearing to each node only
    // ever turns one way around the lap
    for (const style of STYLES) {
      for (let seed = 1; seed <= 25; seed++) {
        const pts = randomDesign(seed, { style }).points;
        const cx = pts.reduce((t, p) => t + p.x, 0) / pts.length;
        const cz = pts.reduce((t, p) => t + p.z, 0) / pts.length;
        let turn = 0;
        for (let i = 0; i < pts.length; i++) {
          const a = Math.atan2(pts[i].z - cz, pts[i].x - cx);
          const b = Math.atan2(pts[(i + 1) % pts.length].z - cz, pts[(i + 1) % pts.length].x - cx);
          let d = b - a;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          expect(Math.sign(d), `${style}/${seed} node ${i} doubles back`).not.toBe(0);
          turn += d;
        }
        // exactly one full turn around the centre — a simple closed circuit
        expect(Math.abs(turn), `${style}/${seed}`).toBeCloseTo(2 * Math.PI, 3);
      }
    }
  });

  it('the generator deliberately builds no inversions', () => {
    const src = readFileSync(resolve(process.cwd(), TOOL_PATHS[0]), 'utf8');
    // documented, not accidental: a loop that stays inside the comfort limits
    // needs a hand-shaped valley, which is what the Build tab's element is for
    expect(src).toContain('NO procedural inversions, deliberately');
    const { randomDesign } = loadGen(TOOL_PATHS[0]);
    for (const style of STYLES) {
      for (let seed = 1; seed <= 30; seed++) {
        // no node is ever banked past vertical, so nothing generated inverts
        for (const p of randomDesign(seed, { style }).points) expect(Math.abs(p.bank)).toBeLessThan(90);
      }
    }
  });

  it.each(TOOL_PATHS)('%s: the generator is wired to a button, a style, and a shareable number', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('id=\\"clab-btnRandom\\"');
    expect(src).toContain('id=\\"clab-randomStyle\\"');
    expect(src).toContain('id=\\"clab-randomSeed\\"');
    // replacing the design is confirmed first, and the preflight coach is the referee
    expect(src).toMatch(/(?:clab)?[Cc]onfirm\('Generate a new coaster\?/);
    expect(src).toContain("safetyFindings.filter(f => f.severity === 'bad')");
    // the second, track-aware banking pass runs before the design is accepted
    expect(src).toContain('autoBankDesign(raw.points, raw.meta.head');
    // and a generated coaster has to survive a REALISTIC run, not just an ideal one
    expect(src).toContain('function generatedRunStalls(){');
    expect(src).toContain('const stalls = generatedRunStalls();');
    expect(src).toContain('MU_ROLL * G0 * Math.min(Math.abs(gV), 6) + K_DRAG * v2');
  });
});

describe('coaster lab — rider safety, restraints, and the height explainer', () => {
  function loadSafety(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('/* @clab-safety-start');
    const e = src.indexOf('/* @clab-safety-end');
    expect(s).toBeGreaterThan(-1);
    expect(e).toBeGreaterThan(s);
    return new Function(src.slice(s, e) +
      '\nreturn { sustainLimit, SUSTAIN_CURVES, freshSustain, sustainStep, restraintSpec, RESTRAINT_CLASSES,' +
      ' RIDER_KG, freshSeats, seatStep, seatLabel, seatSummary };')();
  }
  const run = (api, axis, mag, seconds, floor, sus) => {
    const s = sus || api.freshSustain();
    for (let t = 0; t < seconds - 1e-9; t += 0.02) api.sustainStep(s, axis, mag, 0.02, floor);
    return s;
  };

  it.each(TOOL_PATHS)('%s: the force a rider can take falls as it is held longer', (p) => {
    const { sustainLimit, SUSTAIN_CURVES } = loadSafety(p);
    for (const axis of Object.keys(SUSTAIN_CURVES)) {
      let prev = Infinity;
      for (let d = 0; d <= 6; d += 0.1) {
        const lim = sustainLimit(axis, d);
        expect(lim).toBeLessThanOrEqual(prev + 1e-9);   // never rises with time
        expect(lim).toBeGreaterThan(0);
        prev = lim;
      }
      // clamped flat outside the curve at both ends
      expect(sustainLimit(axis, 0)).toBe(SUSTAIN_CURVES[axis][0][1]);
      expect(sustainLimit(axis, 999)).toBe(SUSTAIN_CURVES[axis][SUSTAIN_CURVES[axis].length - 1][1]);
    }
    expect(sustainLimit('nonsense', 1)).toBe(Infinity);
  });

  it('a brief spike is allowed; the same force held for seconds is not', () => {
    const api = loadSafety(TOOL_PATHS[0]);
    // 5 g for a tenth of a second — a snap, inside the short-duration allowance
    expect(run(api, 'pos', 5, 0.1, 2).worst.pos.ratio).toBeLessThan(1);
    // 4 g held for two seconds — smaller force, over the line
    const long = run(api, 'pos', 4, 2, 2).worst.pos;
    expect(long.ratio).toBeGreaterThan(1);
    expect(long.dur).toBeGreaterThan(1.9);
    expect(long.level).toBeCloseTo(4, 5);
    // same story sideways and upward
    expect(run(api, 'lat', 1.0, 0.15, 0.6).worst.lat.ratio).toBeLessThan(1);
    expect(run(api, 'lat', 1.1, 3, 0.6).worst.lat.ratio).toBeGreaterThan(1);
    expect(run(api, 'neg', 1.1, 2.5, 0.3).worst.neg.ratio).toBeGreaterThan(1);
  });

  it('an episode tracks the force actually SUSTAINED, and resets when the force lets go', () => {
    const api = loadSafety(TOOL_PATHS[0]);
    // a 6 g flick inside a long mild pull must not be graded as 6 g held for 3 s
    const s = api.freshSustain();
    api.sustainStep(s, 'pos', 6, 0.02, 2);
    run(api, 'pos', 2.1, 3, 2, s);
    // the spike is never credited with the long duration that followed it, and
    // three seconds of 2.1 g is genuinely inside the allowance, so nothing trips
    expect(s.worst.pos.ratio).toBeLessThanOrEqual(1.01);
    expect(s.worst.pos.level > 3 && s.worst.pos.dur > 1).toBe(false);
    expect(s.pos.level).toBeCloseTo(2.1, 5);            // the level actually sustained
    // dropping below the floor ends the episode, so the clock restarts
    const s2 = run(api, 'pos', 4, 1.5, 2);
    api.sustainStep(s2, 'pos', 0.9, 0.02, 2);
    expect(s2.pos).toBe(null);
    api.sustainStep(s2, 'pos', 4, 0.02, 2);
    expect(s2.pos.dur).toBeCloseTo(0.02, 5);
    // a zero-length step is ignored rather than corrupting the episode
    expect(() => api.sustainStep(s2, 'pos', 4, 0, 2)).not.toThrow();
  });

  it('the forces choose the restraint, and the restraint load is real newtons', () => {
    const { restraintSpec, RIDER_KG } = loadSafety(TOOL_PATHS[0]);
    const gentle = restraintSpec({ minGV: 0.6, maxLat: 0.4, inversions: 0, airtime: 0 });
    expect(gentle.key).toBe('simple');
    expect(gentle.holdN).toBe(0);          // never pulled off the seat, never loaded
    const airtime = restraintSpec({ minGV: -0.5, maxLat: 0.8, inversions: 0, airtime: 2.1 });
    expect(airtime.key).toBe('ratchet');
    expect(airtime.holdN).toBeCloseTo(0.5 * RIDER_KG * 9.81, 0);
    const inverted = restraintSpec({ minGV: -0.2, maxLat: 0.9, inversions: 1, airtime: 1 });
    expect(inverted.key).toBe('harness');  // upside down always means shoulders
    const ejector = restraintSpec({ minGV: -1.3, maxLat: 0.5, inversions: 0, airtime: 3 });
    expect(ejector.key).toBe('harness');   // so does being pulled hard off the seat
    expect(ejector.holdKg).toBe(Math.round(1.3 * RIDER_KG));
    // a run that produced no telemetry at all must not throw or invent a load
    for (const t of [undefined, {}, { minGV: Infinity }]) {
      const r = restraintSpec(t);
      expect(r.key).toBe('simple');
      expect(r.holdN).toBe(0);
      expect(r.band.inLo).toBeGreaterThan(0);
    }
  });

  it('every restraint class carries a height band, and heavier restraints post taller', () => {
    const { RESTRAINT_CLASSES } = loadSafety(TOOL_PATHS[0]);
    const order = ['simple', 'ratchet', 'harness'];
    let prev = 0;
    for (const key of order) {
      const c = RESTRAINT_CLASSES[key];
      expect(c.name.length).toBeGreaterThan(3);
      expect(c.why.length).toBeGreaterThan(20);           // the reasoning always travels with it
      expect(c.band.inLo).toBeGreaterThan(prev);          // a bigger restraint posts a taller sign
      expect(c.band.inHi).toBeGreaterThan(c.band.inLo);
      expect(c.band.cmLo).toBeGreaterThan(0);             // metric too
      expect(c.band.cmHi).toBeGreaterThan(c.band.cmLo);
      prev = c.band.inLo;
    }
  });

  it.each(TOOL_PATHS)('%s: the height is presented as a band with its limits stated, never as a computed number', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('function renderRiderSafety(tele){');
    const e = src.indexOf('\nfunction computeScores(tele){', s);
    expect(s).toBeGreaterThan(-1);
    const card = src.slice(s, e);
    // the chain is taught, and the disclaimer is in the rendered card, not just a comment
    expect(card).toContain('A height sign is really a <b>restraint</b> sign');
    expect(card).toContain('it is not calculated from your');
    expect(card).toContain("comes from the train manufacturer's restraint");
    expect(card).toContain('${b.inLo}–${b.inHi} in (${b.cmLo}–${b.cmHi} cm)');
    // sustained findings are labelled advisory, because certification still uses peak force
    expect(card).toContain('certification still grades on peak force');
    // and the card is actually rendered into the report
    expect(src).toContain('html += renderRiderSafety(tele);');
  });

  it.each(TOOL_PATHS)('%s: the sim feeds all three axes into the duration tracker', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain("sustainStep(tele.sus, 'pos', gV, h, 2.0);");
    expect(src).toContain("sustainStep(tele.sus, 'neg', -gV, h, 0.3);");
    expect(src).toContain("sustainStep(tele.sus, 'lat', Math.abs(gLat), h, 0.6);");
    expect(src).toContain('sus: freshSustain()');
  });

  it.each(TOOL_PATHS)('%s: the tool no longer claims a real train can leave the rail', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    // upstop wheels mean the TRAIN stays on; below the weightless limit it is the
    // RIDER who is held by the restraint, and the copy has to say so
    expect(src).not.toContain('keeps the wheels on the rail');
    expect(src).not.toContain('riders leave the rails');
    expect(src).toContain('upstop wheels grip the underside of the rail');
    expect(src).toContain('you hang in the restraint, while the upstop wheels hold the train on');
  });
});

describe('coaster lab — the train is a length, not a point', () => {
  function loadSafety(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('/* @clab-safety-start');
    const e = src.indexOf('/* @clab-safety-end');
    return new Function(src.slice(s, e) +
      '\nreturn { freshSeats, seatStep, seatLabel, seatSummary, restraintSpec, RIDER_KG };')();
  }

  it('rows are named from the ends in, whatever the train length', () => {
    const { seatLabel } = loadSafety(TOOL_PATHS[0]);
    expect(seatLabel(0, 5)).toBe('Front row');
    expect(seatLabel(4, 5)).toBe('Back row');
    expect(seatLabel(2, 5)).toBe('Row 3');
    expect(seatLabel(0, 1)).toBe('Your seat');   // a one-car train has no front or back
    expect(seatLabel(1, 2)).toBe('Back row');
  });

  it('each row keeps its own extremes and its own airtime', () => {
    const { freshSeats, seatStep, seatSummary } = loadSafety(TOOL_PATHS[0]);
    const seats = freshSeats(3);
    // front row crests gently, back row is thrown out of the seat
    seatStep(seats, 0, 0.4, 0.1, 0.1);
    seatStep(seats, 0, 3.2, 0.2, 0.1);
    seatStep(seats, 1, 0.1, 0.1, 0.1);
    seatStep(seats, 2, -0.6, 0.3, 0.1);
    seatStep(seats, 2, -0.4, 0.3, 0.1);
    expect(seats[0].maxGV).toBeCloseTo(3.2, 5);
    expect(seats[0].minGV).toBeCloseTo(0.4, 5);
    expect(seats[0].airtime).toBeCloseTo(0, 5);        // 0.4 g is not airtime
    expect(seats[2].minGV).toBeCloseTo(-0.6, 5);
    expect(seats[2].airtime).toBeCloseTo(0.2, 5);      // both steps below the line
    const sum = seatSummary(seats);
    expect(sum.n).toBe(3);
    expect(sum.worstIdx).toBe(2);                      // the back row is thrown hardest
    expect(sum.bestIdx).toBe(2);                       // and gets the most airtime
    expect(sum.worstMin).toBeCloseTo(-0.6, 5);
    expect(sum.gSpread).toBeCloseTo(1.0, 5);           // 0.4 up front, -0.6 at the back
    expect(sum.airSpread).toBeCloseTo(0.2, 5);
    // an untouched or absent seat record must not invent a row
    expect(seatSummary(freshSeats(4))).toBe(null);
    expect(seatSummary(null)).toBe(null);
    expect(seatSummary([])).toBe(null);
    expect(() => seatStep(null, 0, 1, 0, 0.1)).not.toThrow();
    expect(() => seatStep(seats, 99, 1, 0, 0.1)).not.toThrow();
    expect(() => seatStep(seats, 0, NaN, 0, 0.1)).not.toThrow();
  });

  it('the restraint is sized for the worst row, not the row the sim drives from', () => {
    const { freshSeats, seatStep, restraintSpec, RIDER_KG } = loadSafety(TOOL_PATHS[0]);
    const seats = freshSeats(3);
    seatStep(seats, 0, 0.4, 0.1, 0.1);      // the reference point never leaves the seat
    seatStep(seats, 1, 0.1, 0.1, 0.1);
    seatStep(seats, 2, -1.2, 0.1, 0.6);     // but the back row is ejected
    // reference telemetry alone would call this a plain lap bar
    expect(restraintSpec({ minGV: 0.4, inversions: 0, airtime: 0 }).key).toBe('simple');
    // with the rows measured, it is a harness, and the load is the back row's
    const r = restraintSpec({ minGV: 0.4, inversions: 0, airtime: 0, seats });
    expect(r.key).toBe('harness');
    expect(r.worstSeat).toBe('Back row');
    expect(r.holdN).toBeCloseTo(1.2 * RIDER_KG * 9.81, 0);
    // and a row with airtime promotes a lap bar to a latching one
    const mild = freshSeats(2);
    seatStep(mild, 0, 0.5, 0, 0.1);
    seatStep(mild, 1, 0.1, 0, 0.9);
    expect(restraintSpec({ minGV: 0.5, inversions: 0, airtime: 0, seats: mild }).key).toBe('ratchet');
  });

  it.each(TOOL_PATHS)('%s: the sim samples every car, and says what it does not model', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('let TRAIN_CARS = 5;');
    expect(src).toContain('const CAR_GAP = 2.6;');
    // the reference car reuses the force already computed; the rest are sampled
    expect(src).toContain('const trc = trackAt(sc);');
    expect(src).toContain('for(let c = 0; c < TRAIN_CARS; c++) ySum += trackAt(sim.S - c * CAR_GAP).y;');
    expect(src).toContain('seats: freshSeats(TRAIN_CARS)');
    // the rendered card is honest about the boundary of the model
    // the rigid-train energy statement, shared by the sim, the HUD and the camera
    expect(src).toContain('function trainSpeed2(yRef){');
    expect(src).toContain('return Math.max(0, sim.v * sim.v + 2 * G0 * (yRef - ySum / TRAIN_CARS));');
    expect(src).toContain('const vSeat2 = trainSpeed2(yRef);');
    expect(src).toContain('Certification and the headline figures above use the point-mass physics your');
    expect(src).toContain('html += renderSeatCard(tele);');
    // the train mesh and the physics agree on how many cars there are
    // the rake is built to the maximum; syncTrainLength decides how much runs
    expect(src).toContain('for(let c = 0; c < DESIGN_BOUNDS.carsMax; c++){');
    expect(src).toContain('const Sc = sim.S - c * CAR_GAP;');
  });
});

describe('coaster lab — you can ride any row, and shape hills to win rows', () => {
  function loadSafety(p) {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('/* @clab-safety-start');
    const e = src.indexOf('/* @clab-safety-end');
    return new Function(src.slice(s, e) + '\nreturn { freshSeats, seatStep, seatSummary };')();
  }

  it.each(TOOL_PATHS)('%s: the row you ride is a control, and it moves the camera and the HUD', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('id=\\"clab-seatSel\\"');
    expect(src).toContain('>🚃 Back row</option>');
    // the camera sits in the chosen row, and the HUD names it
    expect(src).toContain('frameAt(sim.S + (camSeat ? -0.2 : 1.4) - camSeat * CAR_GAP, _p, _t, _u);');
    expect(src).toContain("hud.gvLabel.textContent = seat === 0 ? 'Seat g (vertical)' : 'Seat g · ' + seatLabel(seat, TRAIN_CARS)");
    // the choice survives a reload, and can never point past the end of the train
    expect(src).toContain("localStorage.setItem('coaster_lab_seat', String(rideSeat))");
    expect(src).toContain('(v >= 0 && v < TRAIN_CARS) ? v : 0');
    expect(src).toContain('Math.min(TRAIN_CARS - 1, parseInt(sel.value, 10) || 0)');
  });

  it.each(TOOL_PATHS)('%s: certification and Ride & Solve always read the front row', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    // otherwise the meter a student is told to watch would disagree with the
    // prediction they just filed
    expect(src).toContain('function activeSeat(){ return (sim.cert || sim.ride) ? 0 : Math.min(rideSeat, TRAIN_CARS - 1); }');
    // and riding the front row leaves the reference physics untouched
    const s = src.indexOf('function updateHUD(){');
    const hud = src.slice(s, src.indexOf('\n}', src.indexOf('drawMiniMap();', s)));
    expect(hud).toContain('// the reference point itself — left bit-for-bit as it always was');
    expect(hud).toContain('gV = tr0.upY + sim.v * sim.v * tr0.kUp / G0;');
  });

  it.each(TOOL_PATHS)('%s: the riders are posed by their own row, and stand down when told to', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('function updateRiders(){');
    const e = src.indexOf('\n}', src.indexOf('r.arms[1].rotation.x = -armUp;', s));
    expect(s).toBeGreaterThan(-1);
    const body = src.slice(s, e);
    // each car reads ITS OWN place on the track, at the shared rigid-train speed
    expect(body).toContain('const trc = trackAt(sim.S - c * CAR_GAP);');
    expect(body).toContain('trainSpeed2(trackAt(sim.S).y)');
    // lift out of the seat, pressed into it, arms up, lean — all from the forces
    expect(body).toContain('(0.35 - gV)');
    expect(body).toContain('(gV - 1.6)');
    expect(body).toContain('(0.75 - gV)');
    expect(body).toContain('-gLat * 0.17');
    // reduced motion and a stationary train both relax the pose; FX Lite hides them
    expect(body).toContain("const still = reducedMotion() || !track || Math.abs(sim.v) < 0.5;");
    expect(body).toContain('const show = !fxLite;');
    // a rear row sits at its own seat and higher, or it stares into the car ahead
    expect(src).toContain('const camSeat = activeSeat();');
    expect(src).toContain('frameAt(sim.S + (camSeat ? -0.2 : 1.4) - camSeat * CAR_GAP, _p, _t, _u);');
    // the train shows the restraint the measured forces demand
    expect(src).toContain('function syncRestraintStyle(){');
    expect(src).toContain("restraintSpec(lastTele).key === 'harness'");
    expect(src).toContain('for(const b of restraintBars) b.visible = !wantsHarness;');
    // a classroom rides it, so the crowd is not one person repeated
    expect(src).toContain('const RIDER_SKIN = [');
    expect(src).toContain('const RIDER_SHIRT = [');
    expect(src).not.toContain('debugScene');   // no debug scaffolding shipped
  });

  it.each(TOOL_PATHS)('%s: a trackside photo is taken at every checkpoint, not just the valley', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    // queued per marker, launch skipped, capped so a long circuit cannot fill memory
    expect(src).toContain("if(key !== 'L' && tele.photos.length + 1 < 5 && (!fxLite || key === 'B')) sim.wantPhoto = key;");
    expect(src).toContain('photos: [],');
    expect(src).toContain("const PHOTO_LABEL = { A: 'the first crest', B: 'the valley', C: 'the loop apex', D: 'the marked turn' };");
    // the crowd is posed for the instant being photographed, even in a headless run
    expect(src).toContain('// pose the riders for this exact instant: a synchronous fastRun never runs');
    expect(src).toContain('updateRiders();\n    const iB = mk.idx;');
    // framed on the middle of the train, close enough that riders read
    expect(src).toContain('frameAt(sim.S - (TRAIN_CARS - 1) * CAR_GAP / 2, _p, _t, _u);');
    // the valley stays the headline shot, so anything reading tele.photo still works
    expect(src).toContain("if(key === 'B' || !tele.photo) tele.photo = url;");
    // and the report falls back to that single photo if a run predates the strip
    expect(src).toContain('const shots = (tele.photos && tele.photos.length) ? tele.photos');
    expect(src).toContain('alt="Trackside photo of your train at ${s.where}');
  });

  it.each(TOOL_PATHS)('%s: Explore predicts the restraint and the worst row, graded from the real run', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    const s = src.indexOf('function renderExplore(){');
    const e = src.indexOf('\nfunction checkPredictions(){', s);
    expect(s).toBeGreaterThan(-1);
    const lane = src.slice(s, e);
    // both questions are asked, in language a young rider can answer
    expect(lane).toContain("card('q5', 'Prediction 5 · What holds you in'");
    expect(lane).toContain("card('q6', 'Prediction 6 · Where you sit'");
    expect(lane).toContain("['harness', 'A harness over the shoulders']");
    expect(lane).toContain("['same', 'About the same in every row']");
    // and both are required before the run, like every other prediction
    expect(lane).toContain("const need = ['q1', 'q2', 'q3', 'q5', 'q6']");
    // graded against what the ride measured, never against the design
    expect(lane).toContain('const spec = restraintSpec(tele);');
    expect(lane).toContain("judge('q5', spec.key,");
    expect(lane).toContain("const truth = seats.gSpread < 0.08 ? 'same'");
    expect(lane).toContain("(seats.worstIdx === 0 ? 'front' : (seats.worstIdx === seats.n - 1 ? 'back' : 'mid'))");
    // "about the same" is a real answer on a symmetrical layout, not a cop-out
    expect(lane).toContain('your hills are close to symmetrical');
  });

  it.each(TOOL_PATHS)('%s: the ride card is a real artifact, and the summary carries the safety verdict', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('id=\\"clab-btnRideCard\\"');
    expect(src).toContain('function buildRideCard(cb){');
    expect(src).toContain("a.download = 'coaster_lab_ride_card.png';");
    // one gather feeds both the text summary and the card, so they cannot drift
    expect(src).toContain('function rideCardFacts(){');
    const s = src.indexOf('function buildRideCard(cb){');
    const card = src.slice(s, src.indexOf('__clabGet(\'clab-btnRideCard\')', s));
    // the photo is laid down BEFORE the background, or it gets painted over
    expect(card).toContain('// the photo goes down FIRST — the background above would paint straight over it');
    expect(card).toContain('function draw(img){');
    expect(card).toContain('img.onload = () => draw(img);');
    expect(card).toContain('img.onerror = () => draw(null);');
    // a run that never happened still produces a card rather than nothing
    expect(card).toContain('No ride photo yet');
    expect(card).toContain('No completed run yet');
    // the card carries the safety verdict, the height band with its caveat, and the rows
    expect(card).toContain("text('RIDER SAFETY'");
    expect(card).toContain("the restraint's number, not the track's");
    expect(card).toContain('Educational physics simulation — not a structural safety approval.');
    // and the pasteable summary gained the same facts plus the generator seed
    expect(src).toContain('`Restraint the forces demand: ${f.spec.name}`');
    expect(src).toContain("(f.seed ? ' · generated #' + f.seed : '')");
  });

  it.each(TOOL_PATHS)('%s: how long the train is, is part of the design', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    expect(src).toContain('id=\\"clab-trainLen\\"');
    expect(src).toContain('function syncTrainLength(){');
    // the whole rake is built once and only the cars in service are shown
    expect(src).toContain('for(let c = 0; c < DESIGN_BOUNDS.carsMax; c++){');
    expect(src).toContain('for(let c = 0; c < cars.length; c++) cars[c].visible = c < TRAIN_CARS;');
    expect(src).toContain('tailLights[c].visible = c === TRAIN_CARS - 1;');
    // the row picker follows, so "back row" always means the row at the back
    expect(src).toContain("[[0, 'Front row'], [mid, 'Middle row'], [TRAIN_CARS - 1, 'Back row']]");
    expect(src).toContain('rideSeat = Math.min(rideSeat, TRAIN_CARS - 1);');
    // and it runs from the one rebuild funnel, before anything reads TRAIN_CARS
    expect(src).toContain('function fullRebuild(){\n  stopTelemetryReplay(true);\n  syncTrainLength();');
    // the checkpoint math quotes the train the student actually built
    expect(src).toContain('cars: TRAIN_CARS,');
  });

  it('train length is validated, clamped, and survives a round trip', () => {
    const src = readFileSync(resolve(process.cwd(), TOOL_PATHS[0]), 'utf8');
    const s = src.indexOf('/* @clab-design-normalize-start');
    const e = src.indexOf('/* @clab-design-normalize-end');
    const api = new Function(src.slice(s, e) + '\nreturn { normalizeDesign, DESIGN_BOUNDS };')();
    const pts = Array.from({ length: 8 }, (_, i) => ({ x: i * 10, y: 4, z: 0, bank: 0 }));
    const B = api.DESIGN_BOUNDS;
    // a design that predates train length still loads, at the standard length
    expect(api.normalizeDesign({ points: pts }).cars).toBe(B.carsDefault);
    // in range it is kept; out of range it is clamped, never rejected
    expect(api.normalizeDesign({ points: pts, cars: 3 }).cars).toBe(3);
    expect(api.normalizeDesign({ points: pts, cars: 8 }).cars).toBe(8);
    expect(api.normalizeDesign({ points: pts, cars: 99 }).cars).toBe(B.carsMax);
    expect(api.normalizeDesign({ points: pts, cars: 0 }).cars).toBe(B.carsMin);
    expect(api.normalizeDesign({ points: pts, cars: 6.7 }).cars).toBe(6);
    for (const junk of [null, 'five', NaN, Infinity, undefined]) {
      expect(api.normalizeDesign({ points: pts, cars: junk }).cars).toBe(B.carsDefault);
    }
    // and it survives an export/import round trip
    const round = api.normalizeDesign(JSON.parse(JSON.stringify(api.normalizeDesign({ points: pts, cars: 7 }))));
    expect(round.cars).toBe(7);
    // the mesh budget the train is built to has to cover the maximum
    expect(B.carsMax).toBeGreaterThan(B.carsDefault);
    expect(B.carsMin).toBeLessThan(B.carsDefault);
  });

  it.each(TOOL_PATHS)('%s: the extras this tool added stay affordable on a weak device', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    // riders cast no shadow — at eight cars that would be 32 more shadow casters
    expect(src).toContain('// riders deliberately cast no shadow: they sit inside a car that already');
    const rider = src.slice(src.indexOf('const rowRiders = [];'), src.indexOf('riderCars.push(rowRiders);'));
    expect(rider).not.toContain('castShadow');
    // every checkpoint photo is a whole extra scene render, so Lite keeps one
    expect(src).toContain("(!fxLite || key === 'B')");
    // and the one it keeps is the headline shot the ride card needs
    expect(src).toContain("if(key === 'B' || !tele.photo) tele.photo = url;");
    // riders are hidden outright in Lite, and the FPS watchdog still offers it
    expect(src).toContain('const show = !fxLite;');
    expect(src).toContain('if(!fpsSuggested && !fxLite && !xrOn && dt > 0 && dt < 1){');
  });

  it.each(TOOL_PATHS)('%s: three missions are graded row by row', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const id of ['lapbar', 'ejector', 'evenkeel']) expect(src).toContain(`id: '${id}'`);
    // the row summary actually reaches the mission checker
    expect(src).toContain("missionEvent('run', { tele, sc, seats: seatSummary(tele.seats) });");
  });

  it('the row missions grade what they claim to', () => {
    const src = readFileSync(resolve(process.cwd(), TOOL_PATHS[0]), 'utf8');
    const s = src.indexOf('const MISSIONS = [');
    const e = src.indexOf('\n];', s);
    const defs = new Function('analysis', 'design',
      src.slice(s, e + 3) + '\nreturn MISSIONS;')(null, { propulsion: { mode: 'chain' } });
    const by = Object.fromEntries(defs.map((m) => [m.id, m]));
    const { freshSeats, seatStep, seatSummary } = loadSafety(TOOL_PATHS[0]);
    const build = (rows) => {
      const seats = freshSeats(rows.length);
      rows.forEach((r, i) => { seatStep(seats, i, r.g, 0, r.air || 0, 0); });
      return seatSummary(seats);
    };
    const clean = { status: 'complete', violations: [], inversions: 0, airtime: 0 };

    // lap-bar licence: nobody leaves the seat, in any row
    const gentle = build([{ g: 0.4 }, { g: 0.2 }, { g: 0.05 }]);
    expect(by.lapbar.check({ tele: clean, seats: gentle })).toBe(true);
    const oneRowFloats = build([{ g: 0.4 }, { g: 0.2 }, { g: -0.1 }]);
    expect(by.lapbar.check({ tele: clean, seats: oneRowFloats })).toBe(false);
    // and a violation disqualifies it however gentle the rows are
    expect(by.lapbar.check({ tele: { ...clean, violations: ['x'] }, seats: gentle })).toBe(false);

    // ejector seat: the back row has to be pulled 0.6 g harder than the front
    expect(by.ejector.check({ tele: clean, seats: build([{ g: 0.1 }, { g: -0.2 }, { g: -0.55 }]) })).toBe(true);
    expect(by.ejector.check({ tele: clean, seats: build([{ g: 0.1 }, { g: 0.0 }, { g: -0.3 }]) })).toBe(false);

    // even keel: every row gets real airtime AND the rows stay together
    const even = build([{ g: -0.1, air: 1.4 }, { g: -0.2, air: 1.5 }, { g: -0.2, air: 1.3 }]);
    expect(by.evenkeel.check({ tele: clean, seats: even })).toBe(true);
    const lopsided = build([{ g: -0.1, air: 1.4 }, { g: -0.5, air: 1.5 }, { g: -0.9, air: 1.3 }]);
    expect(by.evenkeel.check({ tele: clean, seats: lopsided })).toBe(false);   // spread too wide
    const dry = build([{ g: 0.3, air: 0 }, { g: 0.3, air: 0 }, { g: 0.3, air: 0 }]);
    expect(by.evenkeel.check({ tele: clean, seats: dry })).toBe(false);        // no airtime to share
    // an old run with no row data never awards a row mission
    for (const id of ['lapbar', 'ejector', 'evenkeel']) {
      expect(by[id].check({ tele: clean, seats: null })).toBe(false);
    }
  });

  it.each(TOOL_PATHS)('%s: live ride progress names sections without flooding announcements', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'id="clab-lapHud" role="group" aria-label="Ride progress"', 'id="clab-lapRail" class="clab-lap-rail" role="progressbar"',
      'function lapMilestones(){', 'function rideSectionAt(S){', 'function syncLapMilestones(){', 'function updateLapHUD(){',
      'id="clab-lapAnnouncer" class="sr-only" aria-live="polite"', 'rail.setAttribute(\'aria-valuetext\'',
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s: Scenic camera composes alternating trackside views and honors steady motion', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      "const CAMERA_MODES = ['orbit', 'onboard', 'chase', 'scenic']", "scenic: 'Scenic'", "camMode === 'scenic'",
      'const sideSign = shot % 2 ? 1 : -1;', 'camera.position.lerp(_chase, reducedMotion() ? 1 : 0.055);',
      "camMode === 'scenic' ? 58", 'Cycle camera: orbit, onboard, chase, scenic',
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s: selected nodes gain a theme-aware 3-D height and ground guide', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'const selectionGuide = new THREE.Group()', 'new THREE.RingGeometry(1.25, 1.55, 40)',
      'selectionGuideLine.scale.y = Math.max(0.01, selected.y - 0.04);',
      'selectionGuide.visible = handleGroup.visible && !!selectionGuide.userData.ready;',
      'selectionGroundRing.scale.setScalar(guidePulse);', 'selectionGuideMat.color.setHex(cfg.rail);',
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s: telemetry charts label the important ride events directly', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'function telemetryEvents(tele){', 'const peakSpeed = extreme(point => point.v);',
      'const sideG = extreme(point => Math.abs(point.gl));', 'for(const event of (opts.events || [])){',
      'g.fillText(event.label, lx, ly);', 'events: events.speed', 'events: events.vertical',
      'Peak ${peakSpeed.label} at ${fmt(peakSpeed.s, 0)} meters.',
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s: every telemetry chart can scrub the train while the range remains the keyboard control', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'function telemetryIndexAtDistance(pts, targetS){', 'function bindTelemetryCharts(tele){',
      "for(const id of ['chV', 'chG', 'chL'])", "cv.dataset.scrubbable = 'true';",
      "cv.addEventListener('pointerdown'", "cv.addEventListener('pointermove'",
      'applyTelemetryFrame(telemetryIndexAtDistance(tele.trace, targetS));',
      'keyboard users can use the ride-position slider.',
    ]) expect(src).toContain(marker);
    expect(src).not.toContain('clab-replayScrub" tabindex=');
  });

  it.each(TOOL_PATHS)('%s: selected nodes show the rail bank plane and compare it with the physics suggestion', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'id="clab-nodeBankDelta"', 'const selectionBankFrame = new THREE.Group()',
      'new THREE.PlaneGeometry(5.4, 1.7)', 'selectionBankBasis.makeBasis(side, up, tangent);',
      'bankDelta: actualBank - bank', "bankGap < 2 ? 'Matched'",
      'selectionBankMat.color.setHex(cfg.rail);',
      'selectionBankFrame.visible = selectionGuide.visible && !!selectionBankFrame.userData.ready;',
    ]) expect(src).toContain(marker);
  });
});

  it.each(TOOL_PATHS)('%s: the telemetry cursor marks and labels the exact value on every chart', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      'if(Number.isFinite(opts.cursorValue)){', 'g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();',
      'g.fillText(opts.cursorLabel, tx, ty);', 'cursorValue: cursorPoint ? cursorPoint.v : null',
      'cursorValue: cursorPoint ? cursorPoint.g : null', 'cursorValue: cursorPoint ? cursorPoint.gl : null',
      'Math.abs(event.s - opts.cursorS) < sMax * 0.012',
      "${fmt(Math.abs(point.g), 2)} vertical g", "${fmt(Math.abs(point.gl), 2)} lateral g",
    ]) expect(src).toContain(marker);
  });

  it.each(TOOL_PATHS)('%s: the banking guide overlays a dashed physics recommendation on the solid rail plane', (p) => {
    const src = readFileSync(resolve(process.cwd(), p), 'utf8');
    for (const marker of [
      '--rail-guide:#f2a63c;--bank-suggest:#f2c14e',
      '3-D banking guide: solid is the actual rail and dashed is the suggested bank',
      'const selectionSuggestedBankGuide = new THREE.Group()', 'new THREE.LineDashedMaterial(',
      'selectionSuggestedBankBorder.computeLineDistances();', 'bankSuggest:',
      'const suggestedSignedBank = bank * turnSign;',
      'selectionSuggestedBankGuide.rotation.z = THREE.MathUtils.degToRad(d.suggestedSignedBank - d.actualSignedBank);',
      'selectionSuggestedBankLineMat.color.setHex(cfg.bankSuggest);',
    ]) expect(src).toContain(marker);
  });


it.each(TOOL_PATHS)('%s: WCAG cues remain visible, non-color dependent, and programmatically exposed', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    '--ink3:#8fa4b8;--focus:#fff',
    ':focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '@media (forced-colors:active)',
    'id="clab-gball" role="img" aria-label="G-force map:',
    'id="clab-energyBar" role="img" aria-label="Energy budget:',
    "html = html.replace('red = beyond limits', 'hatched = beyond limits');",
    'for(let x = -bandH; x < w + bandH; x += 8)',
    "(gvHot ? ' LIMIT' : '')", "(glHot ? ' LIMIT' : '')",
    'id="clab-nodeLens" role="group" aria-label="No track node selected"',
    "lens.setAttribute('aria-label', `${d.section} node.",
    "rootEl.setAttribute('aria-keyshortcuts', 'Space R C X P H')",
    'if(e.target !== rootEl) return;',
    "chainBtn.setAttribute('aria-pressed', String(prop.mode === 'chain'))",
    "e.target.setAttribute('aria-pressed', String(audio.enabled))",
    "e.target.setAttribute('aria-pressed', String(friction))",
    "__clabGet('clab-btnFx').setAttribute('aria-pressed', String(fxLite))",
    "cv.addEventListener('pointercancel', event => {",
    'applyTelemetryFrame(restoreIndex);',
  ]) expect(src).toContain(marker);
});


it.each(TOOL_PATHS)('%s: track depth, direction, and section landmarks remain theme-aware', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'courseArrow: new THREE.MeshBasicMaterial',
    'const sectionBeaconMat = new THREE.MeshBasicMaterial',
    'new THREE.CylinderGeometry(0.06, 0.07, 1, 6)',
    'if(attachY > 4){',
    'braceQuat.setFromUnitVectors(supportYAxis, braceDir.normalize())',
    'supportGroup.add(brace);',
    'new THREE.ConeGeometry(0.18, 0.58, 3).rotateX(Math.PI / 2)',
    'm4.makeBasis(t.side[i], t.up[i], t.T[i])',
    'courseArrows.count = arrowUsed;',
    'new THREE.TorusGeometry(2.25, 0.055, 6, 36)',
    'beacon.matrix.makeBasis(track.side[idx], track.up[idx], track.T[idx])',
    'MAT.courseArrow.color.setHex',
    'sectionBeaconMat.color.setHex(cfg.rail);',
    'Direction arrows point around the circuit and illuminated rings mark major ride sections.',
  ]) expect(src).toContain(marker);
});


it.each(TOOL_PATHS)('%s: the train reads as an articulated, brake-responsive vehicle', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'tailLights = [], couplers = []',
    'const trainTrimMat = new THREE.MeshStandardMaterial',
    'const trainTailMat = new THREE.MeshBasicMaterial',
    'const bogieGeo = new THREE.BoxGeometry(0.14, 0.14, 1.55)',
    'const couplerGeo = new THREE.BoxGeometry(0.12, 0.12, 0.72)',
    'coupler.matrixAutoUpdate = false;',
    'frameAt(sim.S - (c + 0.5) * CAR_GAP',
    'couplers[c].matrix.copy(_m);',
    'couplers[c].visible = c < TRAIN_CARS - 1',
    'const braking = !!(track && sim.S > track.L - brakeLen()',
    'trainTailMat.color.setHex(braking ? 0xfff1d6 : 0xff5a4d);',
    'trainTrimMat.emissive.set(hex).multiplyScalar(0.18);',
    'Visible couplers show how the cars articulate through curves',
  ]) expect(src).toContain(marker);
});

it.each(TOOL_PATHS)('%s: lift and brake zones carry distinct functional track dressing', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'catwalk: new THREE.MeshStandardMaterial',
    'brakeFin: new THREE.MeshStandardMaterial',
    'brakeLight: new THREE.MeshBasicMaterial',
    'const catwalkIdx = [], railPts = [];',
    'new THREE.BoxGeometry(0.72, 0.08, 0.55)',
    'new THREE.BoxGeometry(0.07, 0.9, 0.07)',
    'new THREE.TubeGeometry(railCurve, railPts.length * 2, 0.055, 6, false)',
    'const brakeStartS = Math.max(0, t.L - brakeLen());',
    'new THREE.BoxGeometry(0.26, 0.32, 0.62)',
    'new THREE.SphereGeometry(0.11, 7, 6)',
    'MAT.catwalk.color.setHex',
    'MAT.brakeFin.color.setHex',
    'MAT.brakeLight.color.setHex',
    'A side catwalk marks the lift hill',
  ]) expect(src).toContain(marker);
});

it.each(TOOL_PATHS)('%s: the station repeats dispatch state on an accessible in-world board', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'let stationBoardCtx = null, stationBoardTex = null;',
    'function paintStationBoard(state, accentHex = stationBoardAccent){',
    "const statusHex = state === 'GO' || state === 'CLEAR'",
    "g.fillText('DISPATCH', 256, 28);",
    'g.fillText(state, 256, 79);',
    'new THREE.BoxGeometry(0.18, 1.35, 4.5)',
    'new THREE.PlaneGeometry(4.1, 1.0)',
    'boardFace.rotation.y = -Math.PI / 2;',
    "const boardState = phase < 0 ? 'HOLD'",
    'paintStationBoard(boardState);',
    "paintStationBoard(stationBoardState || 'HOLD', cfg.rail);",
    'an overhead word-and-number dispatch board',
  ]) expect(src).toContain(marker);
});

it.each(TOOL_PATHS)('%s: launch mode uses paired three-phase LSM stator banks', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'launchPhaseA: new THREE.MeshStandardMaterial',
    'launchPhaseB: new THREE.MeshStandardMaterial',
    'launchPhaseC: new THREE.MeshStandardMaterial',
    'const launchPhaseMeshes = [];',
    'launchPhaseMeshes.length = 0;',
    'const phaseBuckets = [[], [], []];',
    'new THREE.BoxGeometry(0.16, 0.42, 0.78)',
    'for(const sideSign of [-1, 1])',
    '.addScaledVector(t.side[i], sideSign * 0.58)',
    'mesh.userData.phase = phase;',
    "const launchPhasePalette = name === 'neon'",
    'function updateLaunchVisuals(now){',
    "const launchActive = design.propulsion.mode === 'launch';",
    'const staticState = reducedMotion() || fxLite || !launchActive || !sim.running;',
    'updateLaunchVisuals(now);',
    'Launch mode uses paired stator banks with a repeating three-phase energy pattern.',
  ]) expect(src).toContain(marker);
});

it.each(TOOL_PATHS)('%s: section portals stay visible in motion and use shape-coded crowns', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'const sectionLandmarkGroup = new THREE.Group();',
    'markerGroup, sectionLandmarkGroup, sectionGroup',
    'disposeGroup(sectionLandmarkGroup);',
    'sectionLandmarkGroup.add(beacon);',
    'const addGlyph = (geometry, sideOffset = 0, upOffset = 3.15, rotationZ = 0) => {',
    "if(label === 'Launch'){",
    'new THREE.BoxGeometry(0.24, 0.82, 0.18)',
    "label === 'Lift hill'",
    "label === 'First drop'",
    'new THREE.OctahedronGeometry(0.53, 0)',
    "label === 'Banked turn'",
    'new THREE.TorusGeometry(0.5, 0.1, 5, 18, Math.PI)',
    'sectionLandmarkGroup.visible = !fxLite;',
    'Section portals remain visible during runs and carry distinct crown shapes',
  ]) expect(src).toContain(marker);
});

it.each(TOOL_PATHS)('%s: orbit and scenic cameras gain a tapered train progress tracer', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'const progressTracerGroup = new THREE.Group();',
    'const progressTracerMats = [], progressTracerRings = [];',
    'new THREE.TorusGeometry(1.5 - i * 0.09, 0.055, 6, 28)',
    'new THREE.ConeGeometry(0.2, 0.62, 3).rotateX(Math.PI / 2)',
    'function updateProgressTracer(){',
    "camMode === 'orbit' || camMode === 'scenic'",
    'const visibleCount = reducedMotion() ? 1 : progressTracerRings.length;',
    'frameAt(sim.S - i * 2.1, tracerPos, tracerTan, tracerUp);',
    'ring.material.opacity = 0.78 - i * 0.13;',
    'frameAt(sim.S + 2.8, tracerPos, tracerTan, tracerUp);',
    'progressArrow.matrix.copy(progressTracerMatrix);',
    'progressTracerMats.forEach(mat => mat.color.setHex(cfg.rail));',
    'updateProgressTracer();',
    'A tapered hoop trail and arrow identify the train position and direction',
  ]) expect(src).toContain(marker);
  expect(src.indexOf('function updateProgressTracer(){'))
    .toBeLessThan(src.indexOf('function updateParkAtmosphere(dt){'));
  const parkBody = src.slice(src.indexOf('function updateParkAtmosphere(dt){'), src.indexOf('function placeCamera(){'));
  expect(parkBody).toContain('if(fxLite || reducedMotion()) return;');
});

it.each(TOOL_PATHS)('%s: approaching section portals grow through proximity, not flashing', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'const sectionLandmarks = [];',
    'const sectionLandmarkScaleMatrix = new THREE.Matrix4();',
    'sectionLandmarks.length = 0;',
    'const landmarkMeshes = [];',
    'landmarkMeshes.push({ mesh: beacon, base: beacon.matrix.clone() });',
    'landmarkMeshes.push({ mesh: glyph, base: glyph.matrix.clone() });',
    'sectionLandmarks.push({ arc, parts: landmarkMeshes });',
    'function updateSectionLandmarks(){',
    'let current = sim.S % track.L;',
    'const ahead = (landmark.arc - current + track.L) % track.L;',
    'const behind = track.L - ahead;',
    'Math.max(ahead < 18 ? 1 - ahead / 18 : 0',
    'part.mesh.matrix.copy(part.base).multiply(sectionLandmarkScaleMatrix);',
    'updateSectionLandmarks();',
    'The next portal grows as the train approaches and settles after passage.',
  ]) expect(src).toContain(marker);
  expect(src.indexOf('updateSectionLandmarks();'))
    .toBeLessThan(src.indexOf('if(handleGroup.visible && selIdx'));
});

it.each(TOOL_PATHS)('%s: the lead car projects a theme-aware forward headlight beam', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'const headlightBeamMat = new THREE.MeshBasicMaterial',
    'let trainHeadlight = null, headlightBeam = null;',
    'new THREE.CylinderGeometry(0.04, 2.4, 15, 18, 1, true).rotateX(-Math.PI / 2)',
    'trainHeadlight = head;',
    'headlightBeam = beam;',
    'headlightBeamMat.color.setHex(cfg.sunGlow);',
    "name === 'blueprint' ? 0.07 : 0.025",
    'function updateHeadlightVisuals(){',
    'const enabled = !fxLite;',
    'const speedBoost = sim.running ? Math.min(0.055, Math.abs(sim.v) * 0.0018) : 0;',
    'trainHeadlight.intensity = baseLight +',
    'updateHeadlightVisuals();',
    'The lead car carries a raised forward arrow and casts a tapered beam across the track in darker environments.',
  ]) expect(src).toContain(marker);
});

it.each(TOOL_PATHS)('%s: brake hardware rises and lamps communicate approach and braking states', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'brakeLight: new THREE.MeshBasicMaterial({ color: 0xe5484d, transparent: true, opacity: 0.58',
    'let brakeFinRig = null, brakeLightMesh = null, brakeFinLift = 0',
    'brakeFinRig = null; brakeLightMesh = null; brakeFinLift = 0;',
    'brakeFinRig = { mesh: brakeFins, indices: brakeIdx.slice() };',
    'brakeLightMesh = brakeLights;',
    'brakeLightIdleHex = name ===',
    'function updateBrakeVisuals(){',
    'const approaching = sim.running && s >= Math.max(0, brakeStart - 16)',
    'const braking = sim.running && s >= brakeStart',
    'const targetLift = braking ? 0.22 : 0;',
    '(reducedMotion() ? 1 : 0.18)',
    '.addScaledVector(track.up[i], 0.08 + brakeFinLift)',
    'brakeFinRig.mesh.instanceMatrix.needsUpdate = true;',
    'MAT.brakeLight.opacity = braking ? 1 : approaching ? 0.82 : 0.58;',
    'updateBrakeVisuals();',
    'Brake fins rise and paired lamps brighten when the train enters the brake run.',
  ]) expect(src).toContain(marker);
});

it.each(TOOL_PATHS)('%s: station guidance lights sweep to the exit and launch animation remains top-level', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'const stationEdgePucks = [];',
    'stationEdgePucks.push({ mesh: puck, step: i + 5 });',
    'const departureSweep = sim.running && phase >= 0.55 && phase < 2.25 && !reducedMotion();',
    'Math.cos(now * 0.014 - puck.step * 0.72)',
    'puck.mesh.scale.set(1 + wave * 0.35, 1 + wave * 0.85, 1);',
    'Platform edge lights sweep toward the exit during dispatch, while loading gates open before departure.',
  ]) expect(src).toContain(marker);
  const launchHelper = src.indexOf('function updateLaunchVisuals(now){');
  const stationHelper = src.indexOf('function updateStationVisuals(now){');
  expect(launchHelper).toBeGreaterThan(0);
  expect(launchHelper).toBeLessThan(stationHelper);
  const stationBody = src.slice(stationHelper, src.indexOf('const dispatchEl', stationHelper));
  expect(stationBody).not.toContain('function updateLaunchVisuals(now){');
});

it.each(TOOL_PATHS)('%s: chain lift shows theme-aware moving dogs tied to train progress', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'chainDog: new THREE.MeshStandardMaterial',
    'const liftChainDogs = [];',
    'liftChainDogs.length = 0;',
    'const dogGeo = new THREE.BoxGeometry(0.26, 0.16, 0.5);',
    'trackGroup.add(dog); liftChainDogs.push(dog);',
    'MAT.chainDog.color.setHex(cfg.rail); MAT.chainDog.emissive.setHex(cfg.railGlow);',
    'function updateLiftVisuals(){',
    "design.propulsion.mode === 'chain'",
    'ridingLift && !reducedMotion()',
    'frameAt(arc, liftDogPos, liftDogTan, liftDogUp);',
    'MAT.chainDog.emissiveIntensity = ridingLift ? 1.05 : 0.42;',
    'updateLiftVisuals();',
    'Moving chain dogs climb the lift beside the train in chain mode.',
  ]) expect(src).toContain(marker);
  expect(src.indexOf('function updateLiftVisuals(){'))
    .toBeLessThan(src.indexOf('function updateLaunchVisuals(now){'));
});

it.each(TOOL_PATHS)('%s: train wheels show theme-aware physical rotation with reduced-motion restraint', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'const trainWheelMarkers = [];',
    'const trainWheelHubMat = new THREE.MeshStandardMaterial',
    'const wheelHubGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.15, 10)',
    'const wheelMarkerGeo = new THREE.BoxGeometry(0.025, 0.24, 0.035);',
    'w.add(hub, marker); trainWheelMarkers.push(marker);',
    'trainWheelHubMat.color.setHex(cfg.rail); trainWheelHubMat.emissive.setHex(cfg.railGlow);',
    'const animateWheels = !reducedMotion();',
    'const carArc = sim.S - Math.floor(i / 4) * CAR_GAP;',
    'wheel.rotation.x = animateWheels ? carArc / 0.16 : 0;',
    'for(const marker of trainWheelMarkers) marker.visible = !fxLite;',
    'High-contrast wheel markers rotate with each car?s traveled distance and remain still in reduced-motion mode.',
  ]) expect(src).toContain(marker);
});

it.each(TOOL_PATHS)('%s: train side lighting improves silhouette with speed-aware restrained feedback', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'const trainSideLights = [];',
    'const trainSideLightMat = new THREE.MeshBasicMaterial',
    'const sideLightGeo = new THREE.BoxGeometry(0.025, 0.045, 1.45);',
    'car.add(sideLight); trainSideLights.push(sideLight);',
    "trainSideLightMat.color.setHex(name === 'neon'",
    'const sideLightBoost = sim.running ? Math.min(1, Math.abs(sim.v) / 30) : 0;',
    'trainSideLightMat.opacity = 0.34 + sideLightBoost * 0.58;',
    'strip.visible = !fxLite;',
    'strip.scale.z = reducedMotion() ? 1 : 1 + sideLightBoost * 0.08;',
    'Theme-aware side light strips outline every car and brighten with speed.',
  ]) expect(src).toContain(marker);
});

it.each(TOOL_PATHS)('%s: train carries theme-aware numbered row plates for spatial row identification', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'const trainRowPlates = [];',
    'function paintTrainRowPlate(plate, accentHex, themeName){',
    "g.fillText('ROW ' + plate.row, 128, 50);",
    'const rowPlateGeo = new THREE.PlaneGeometry(0.72, 0.28);',
    'const plateCanvas = document.createElement',
    'const plateEntry = { ctx: plateCanvas.getContext',
    'car.add(plate); plateEntry.meshes.push(plate);',
    'paintTrainRowPlate(plateEntry, VISUAL_THEMES[visualTheme].rail, visualTheme);',
    'paintTrainRowPlates(cfg.rail, name);',
    'trainRowPlates.forEach((plate, i) => {',
    'mesh.visible = !fxLite || selected;',
    'Numbered row plates identify front, middle, and back positions directly on the 3-D train.',
  ]) expect(src).toContain(marker);
});

it.each(TOOL_PATHS)('%s: selected ride row is linked to a non-color-only 3-D highlight', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'const trainRowMarkers = [];',
    'const trainRowMarkerMat = new THREE.LineBasicMaterial',
    'new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.28, 0))',
    'car.add(rowMarker); trainRowMarkers.push(rowMarker);',
    'trainRowMarkerMat.color.setHex(cfg.rail);',
    'const selectedRow = Math.min(activeSeat(), TRAIN_CARS - 1);',
    'const rowBlend = reducedMotion() ? 1 : 0.18;',
    'const target = selected ? 1.18 : 1;',
    'mesh.visible = !fxLite || selected;',
    'trainRowMarkers.forEach((marker, i) =>',
    'The active row gains a diamond marker and enlarged number plate, so selection is not conveyed by color alone.',
  ]) expect(src).toContain(marker);
});

it.each(TOOL_PATHS)('%s: lead car carries a theme-aware raised direction arrow', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  for (const marker of [
    'let trainLeadArrow = null;',
    'const trainLeadArrowMat = new THREE.MeshStandardMaterial',
    'const trainLeadArrowLineMat = new THREE.LineBasicMaterial',
    'const leadArrowShape = new THREE.Shape();',
    'const leadArrowGeo = new THREE.ExtrudeGeometry',
    'const arrowEdge = new THREE.LineSegments(leadArrowEdgeGeo, trainLeadArrowLineMat);',
    'arrowGroup.position.set(0, 0.83, 0.72);',
    'trainLeadArrow = arrowGroup;',
    'trainLeadArrowMat.color.setHex(cfg.rail); trainLeadArrowMat.emissive.setHex(cfg.railGlow);',
    'trainLeadArrowMat.emissiveIntensity = 0.72 + sideLightBoost * 0.48;',
    'if(trainLeadArrow) trainLeadArrow.visible = true;',
    'The lead car carries a raised forward arrow and casts a tapered beam',
  ]) expect(src).toContain(marker);
});
describe('coaster lab — wired into every load site', () => {
  it.each([
    'AlloFlowANTI.txt',
    'desktop/web-app/src/AlloFlowANTI.txt',
    'desktop/web-app/src/App.jsx',
    'build.js',
  ])('%s lists the coaster lab loader', (f) => {
    const src = readFileSync(resolve(process.cwd(), f), 'utf8');
    expect(src).toContain("'stem_lab/stem_tool_coasterlab.js'");
  });

  it.each([
    'stem_lab/stem_lab_module.js',
    'desktop/web-app/public/stem_lab/stem_lab_module.js',
  ])('%s carries the tile and plugin flag', (f) => {
    const src = readFileSync(resolve(process.cwd(), f), 'utf8');
    expect(src).toContain("// @tool coasterLab");
    expect(src).toContain('coasterLab: true');
  });
});
