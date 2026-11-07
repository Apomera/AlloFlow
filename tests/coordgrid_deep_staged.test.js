// Coordinate Grid stage D (2026-11-04): independent bug hunt regressions.
// 1. Judge Kai: a slipped sequence where ANOTHER step could also be swapped for one
//    buildable move (and then map ABC onto DEF) had two right answers, and the
//    student who picked the other one was told "Step n is not a wrong move".
// 2. Start-here ticks: "Find a slanted distance with the Pythagorean theorem" was
//    ticked by grade-6 distances along a grid line (and "with negative
//    coordinates" by quadrant I plots), because both read one shared counter.
// 3. Announcements went to the host AND the tool's own live region: a screen
//    reader heard everything twice.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.COORDGRID_DEEP_FILE || 'stem_lab/stem_tool_coordgrid.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root = null, latest = null, xp = [], sr = [], errors = [], CORE = null;
beforeEach(() => {
  resetStemLab();
  CORE = loadTool(FILE, 'coordinate')._core;
  latest = null; xp = []; sr = []; errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(cg, extra) {
  if (root) { await React.act(async () => root.unmount()); root = null; }
  document.body.innerHTML = '<div id="root"></div>';
  function App() {
    const [state, setState] = React.useState({ _coordGrid: cg });
    const [es, setEs] = React.useState({ correct: 0, total: 0 });
    latest = state._coordGrid;
    return window.StemLab._registry.coordinate.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState, exploreScore: es, setExploreScore: setEs,
      awardXP: (id, amt, why) => xp.push([id, amt, why]), announceToSR: (m) => sr.push(m), addToast: () => {},
    }, extra || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
}
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const byText = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.textContent.trim()));
const pathSteps = () => [...document.querySelectorAll('[data-coordgrid-path-step]')].map((li) => [li.getAttribute('data-coordgrid-path-step'), li.getAttribute('data-done') === 'true']);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const P = (x, y) => ({ x, y });

// Independent geometry (not the tool's): apply one move; rotations counterclockwise.
function ap(p, s) {
  if (s.kind === 'translate') return P(p.x + s.dx, p.y + s.dy);
  if (s.kind === 'reflect') { const a = s.a || 0; return s.line === 'x' ? P(p.x, -p.y) : s.line === 'y' ? P(-p.x, p.y) : s.line === 'yx' ? P(p.y, p.x) : s.line === 'ynx' ? P(-p.y, -p.x) : s.line === 'xa' ? P(2 * a - p.x, p.y) : P(p.x, 2 * a - p.y); }
  if (s.kind === 'rotate') { const dx = p.x - s.cx, dy = p.y - s.cy, r = s.angle * Math.PI / 180, co = Math.round(Math.cos(r)), si = Math.round(Math.sin(r)); return P(s.cx + co * dx - si * dy, s.cy + si * dx + co * dy); }
  return P(s.k * p.x, s.k * p.y);
}
const apSeq = (f, ss) => f.map((p) => ss.reduce(ap, p));
const sameSet = (a, b) => a.length === b.length && a.every((p) => b.some((q) => Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.y - q.y) < 1e-9));
const MOVES = [];
for (let dx = -20; dx <= 20; dx++) for (let dy = -20; dy <= 20; dy++) if (dx || dy) MOVES.push({ kind: 'translate', dx, dy });
for (const l of ['x', 'y', 'yx', 'ynx']) MOVES.push({ kind: 'reflect', line: l, a: 0 });
for (let a = -10; a <= 10; a++) { MOVES.push({ kind: 'reflect', line: 'xa', a }); MOVES.push({ kind: 'reflect', line: 'yb', a }); }
for (const ang of [90, 180, 270]) for (let cx = -10; cx <= 10; cx++) for (let cy = -10; cy <= 10; cy++) MOVES.push({ kind: 'rotate', angle: ang, cx, cy });
const G6_MOVES = MOVES.filter((s) => s.kind === 'translate' || (s.kind === 'reflect' && (s.line === 'x' || s.line === 'y')));

describe('judge Kai: exactly one step can be the wrong one', () => {
  it('no generated slipped sequence lets a different step be repaired by one buildable move', () => {
    let no = 0, yes = 0;
    const bad = [];
    for (let s = 1; s <= 120; s++) {
      for (const lv of ['g6', 'g8']) {
        const j = CORE.genJudge(lv, rng(s * 17 + lv.length), {});
        if (j.maps) { yes++; expect(sameSet(apSeq(j.A, j.proposed), j.B)).toBe(true); continue; }
        no++;
        expect(sameSet(apSeq(j.A, j.proposed), j.B)).toBe(false);
        const fixed = j.proposed.slice(); fixed[j.wrongStep] = j.fixStep;
        expect(sameSet(apSeq(j.A, fixed), j.B)).toBe(true);
        const pool = lv === 'g6' ? G6_MOVES : MOVES;
        for (let i = 0; i < j.proposed.length; i++) {
          if (i === j.wrongStep) continue;
          const rep = pool.find((st) => { const c = j.proposed.slice(); c[i] = st; return sameSet(apSeq(j.A, c), j.B); });
          if (rep) bad.push({ lv, proposed: j.proposed, wrong: j.wrongStep, other: i, rep });
        }
      }
    }
    expect(bad, JSON.stringify(bad.slice(0, 2))).toEqual([]);
    // Still a real yes/no question: both answers come up often.
    expect(yes).toBeGreaterThan(80);
    expect(no).toBeGreaterThan(80);
  });

  it('the ambiguity check finds a known two-answer sequence (reflect in y = x, then a quarter turn)', () => {
    const A = [P(1, 1), P(4, 1), P(1, 3)];
    const B = apSeq(A, [{ kind: 'reflect', line: 'yx', a: 0 }, { kind: 'rotate', angle: 90, cx: 0, cy: 0 }]);
    const kai = [{ kind: 'reflect', line: 'yx', a: 0 }, { kind: 'rotate', angle: 270, cx: 0, cy: 0 }];
    // Step 2 is the slip, but swapping step 1 for a reflection in y = -x also lands on DEF.
    expect(sameSet(apSeq(A, [{ kind: 'reflect', line: 'ynx', a: 0 }, kai[1]]), B)).toBe(true);
    expect(CORE.otherStepRepairs(A, B, kai, 1, 'g8')).toBe(true);
    // A grade-6 slip in a translation that no axis reflection or slide can undo elsewhere.
    const A6 = [P(1, 1), P(4, 1), P(1, 3)];
    const B6 = apSeq(A6, [{ kind: 'reflect', line: 'x', a: 0 }, { kind: 'translate', dx: 2, dy: 5 }]);
    expect(CORE.otherStepRepairs(A6, B6, [{ kind: 'reflect', line: 'x', a: 0 }, { kind: 'translate', dx: 5, dy: 2 }], 1, 'g6')).toBe(false);
  });
});

describe('start-here ticks count the skill the step names', () => {
  it('grade 8: distances along a grid line do not tick the Pythagorean step; slanted ones do', async () => {
    const axis = { 'distance:-3,2>4,2': true, 'distance:1,-5>1,3': true, 'distance:2,2>7,2': true };
    await mount({ cgTab: 'explore', cgLevel: 'g8', distanceSolved: 3, creditedItems: axis });
    expect(pathSteps().find((s) => s[0] === 'pythag')).toEqual(['pythag', false]);
    expect(document.querySelector('[data-coordgrid-path-step="pythag"]').textContent).toContain('0 of 2 solved.');
    await mount({ cgTab: 'explore', cgLevel: 'g8', distanceSolved: 5, creditedItems: Object.assign({ 'distance:1,1>4,5': true, 'distance:-2,1>2,4': true }, axis) });
    expect(pathSteps().find((s) => s[0] === 'pythag')).toEqual(['pythag', true]);
    expect(errors).toEqual([]);
  });

  it('grade 6: slanted distances do not tick "along a grid line"; quadrant I plots do not tick "negative coordinates"', async () => {
    const q1 = { 'plot:1,2': true, 'plot:3,4': true, 'plot:5,6': true, 'distance:1,1>4,5': true, 'distance:-2,1>2,4': true };
    await mount({ cgTab: 'explore', cgLevel: 'g6', plotsSolved: 3, distanceSolved: 2, creditedItems: q1 });
    expect(pathSteps().filter((s) => s[0] === 'plot6' || s[0] === 'distance6')).toEqual([['plot6', false], ['distance6', false]]);
    await mount({ cgTab: 'explore', cgLevel: 'g6', plotsSolved: 6, distanceSolved: 4, creditedItems: Object.assign({ 'plot:-1,2': true, 'plot:3,-4': true, 'plot:-5,0': true, 'distance:-3,2>4,2': true, 'distance:1,-5>1,3': true }, q1) });
    expect(pathSteps().filter((s) => s[0] === 'plot6' || s[0] === 'distance6')).toEqual([['plot6', true], ['distance6', true]]);
  });

  it('a slanted distance solved in the tool ticks the step (and the key kinds are read from itemKey)', async () => {
    expect(CORE.creditedKinds({ 'distance:0,0>3,4': true, 'distance:0,0>0,4': true, 'plot:-1,0': true, 'plot:2,2': true, 'slope:1,1>2,2': true })).toEqual({ plotNeg: 1, axisDist: 1, pythag: 1 });
    expect(CORE.creditedKinds(null)).toEqual({ plotNeg: 0, axisDist: 0, pythag: 0 });
    const ch = { type: 'distance', kind: 'pythag', p1: P(1, 1), p2: P(4, 5), distance: 5, view: null, tries: 0, hint: 0 };
    await mount({ cgTab: 'explore', cgLevel: 'g8', gridChallenge: ch, gridPoints: [ch.p1, ch.p2], gridFeedback: { distanceAnswer: '5' } });
    await click(document.querySelector('button[aria-label="Check"]'));
    expect(latest.gridFeedback.correct).toBe(true);
    expect(CORE.creditedKinds(latest.creditedItems).pythag).toBe(1);
    expect(document.querySelector('[data-coordgrid-path-step="pythag"]').textContent).toContain('1 of 2 solved.');
  });
});

describe('every tab mounts cleanly in every theme', () => {
  it('no console errors on any tab, light / dark / high contrast, student and teacher', async () => {
    const tabs = ['explore', 'transform', 'patterns', 'treasure', 'quadrants', 'quadHunt', 'maps'];
    for (const tab of tabs) {
      for (const theme of [{}, { isDark: true }, { isContrast: true }]) {
        for (const teacher of [false, true]) {
          await mount({ cgTab: tab, cgLevel: 'g8' }, Object.assign({ isTeacherMode: teacher }, theme));
          expect(document.querySelector('[role="tabpanel"]'), tab).toBeTruthy();
        }
      }
    }
    expect(errors).toEqual([]);
  });
});

describe('one announcement channel', () => {
  it('with a host announcer, messages go to the host only (not also the tool live region)', async () => {
    await mount({ cgTab: 'treasure', cgLevel: 'g6' });
    // The region the tool makes at load (mounting replaced document.body).
    let lr = document.getElementById('allo-live-coordgrid');
    if (!lr) { lr = document.createElement('div'); lr.id = 'allo-live-coordgrid'; lr.setAttribute('aria-live', 'polite'); document.body.appendChild(lr); }
    lr.textContent = '';
    await click(byText(/^Start a mission$/));
    expect(sr.some((m) => /Find the buried treasure/.test(m))).toBe(true);
    expect(lr.textContent).toBe('');
  });

  it('without a host announcer, the tool live region carries the message', async () => {
    // (Mounting replaces document.body, so the region made at load is gone: the
    // fallback must make its own rather than go silent.)
    await mount({ cgTab: 'treasure', cgLevel: 'g6' }, { announceToSR: undefined });
    await click(byText(/^Start a mission$/));
    const lr = document.getElementById('allo-live-coordgrid');
    expect(lr && lr.textContent).toMatch(/Find the buried treasure/);
    expect(lr.getAttribute('aria-live')).toBe('polite');
    expect(errors).toEqual([]);
  });
});
