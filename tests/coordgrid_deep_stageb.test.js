// Coordinate Grid stage B (2026-11-03): transformation sequences and dilations
// (8.G.1-4), patterns to ordered pairs (5.OA.3), tables to graphs (6.EE.9),
// treasure-hunt missions, and the keyboard-cursor focus state that used to
// outlive the tool. The engines are run, not grepped.
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
  if (window._coordGridKeyHandler) { window.removeEventListener('keydown', window._coordGridKeyHandler); window._coordGridKeyHandler = null; }
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
async function type(el, value) {
  expect(el, 'input to type in').toBeTruthy();
  await React.act(async () => {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function key(el, k, extra) {
  await React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
}
const focus = async (el) => { await React.act(async () => { el.focus(); }); };
const blur = async (el) => { await React.act(async () => { el.blur(); }); };
const byText = (re, scope) => [...(scope || document).querySelectorAll('button')].find((b) => re.test(b.textContent.trim()));
const byLabel = (l) => document.querySelector('button[aria-label="' + l + '"]');
const inputLabelled = (l) => document.querySelector('input[aria-label="' + l + '"]');
const labelInput = (text) => { const lab = [...document.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(text)); return lab && lab.querySelector('input, select, textarea'); };
const paid = () => xp.filter((x) => x[0] === 'coordinate');
const svgText = () => [...document.querySelectorAll('#coordinate-section-panel svg text')].map((t) => t.textContent);
const cursorDrawn = () => !!document.querySelector('#coordinate-section-panel svg g[aria-hidden="true"] circle[r="11"]');
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const P = (x, y) => ({ x, y });
const sameSet = (a, b) => a.length === b.length && a.every((p) => b.some((q) => Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.y - q.y) < 1e-9));

// Fixed items used by the UI tests.
const TRI = [P(1, 1), P(4, 1), P(1, 3)];
const SEQ = { type: 'sequence', A: TRI, B: [P(-1, -4), P(-4, -4), P(-1, -2)], steps: [{ kind: 'reflect', line: 'y', a: 0 }, { kind: 'translate', dx: 0, dy: -5 }], similar: false, tries: 0, hint: 0, stage: 'answer' };
const JUDGE = { type: 'judge', A: TRI, B: SEQ.B, proposed: [{ kind: 'reflect', line: 'x', a: 0 }, { kind: 'translate', dx: 0, dy: -5 }], maps: false, wrongStep: 0, slip: 'wrong_mirror', fixStep: { kind: 'reflect', line: 'y', a: 0 }, similar: false, tries: 0, hint: 0, stage: 'yesno' };
const ROT = { type: 'rotate', p: P(3, 1), angle: 90, c: P(0, 0), answer: P(-1, 3), tries: 0, hint: 0, stage: 'answer' };
const DIL = { type: 'dilate', A: TRI, k: 2, q: 1, answer: P(8, 2), image: [P(2, 2), P(8, 2), P(2, 6)], tries: 0, hint: 0, stage: 'answer' };
const PAT = { type: 'patterns', addA: 2, addB: 6, ratio: 3, A: [0, 2, 4, 6, 8], B: [0, 6, 12, 18, 24], tries: 0, hint: 0, stage: 'fill' };
const TAB = { type: 'table', ctx: 'plant', m: 2, b: 3, xstep: 2, xs: [0, 2, 4, 6, 8], ys: [3, 7, 11, 15, 19], askX: 12, askY: 27, tries: 0, hint: 0, stage: 'plot' };
const MISSION = { type: 'mission', lo: 0, hi: 10, T: P(4, 6), lms: [{ id: 'well', p: P(4, 2) }, { id: 'palm', p: P(8, 6) }], clues: [{ kind: 'same_x', lm: 0 }, { kind: 'same_y', lm: 1 }], digs: [], marks: [], tries: 0, hint: 0, done: false };

describe('engine: transformations (8.G.1-4)', () => {
  it('applies each move by its coordinate rule', () => {
    const s = (st, p) => CORE.applyStep(p, st);
    expect(s({ kind: 'rotate', angle: 90, cx: 0, cy: 0 }, P(3, 1))).toEqual(P(-1, 3));
    expect(s({ kind: 'rotate', angle: 180, cx: 0, cy: 0 }, P(3, 1))).toEqual(P(-3, -1));
    expect(s({ kind: 'rotate', angle: 270, cx: 0, cy: 0 }, P(3, 1))).toEqual(P(1, -3));
    expect(s({ kind: 'rotate', angle: 90, cx: 1, cy: 1 }, P(3, 1))).toEqual(P(1, 3));
    expect(s({ kind: 'reflect', line: 'yx' }, P(3, -2))).toEqual(P(-2, 3));
    expect(s({ kind: 'reflect', line: 'ynx' }, P(3, -2))).toEqual(P(2, -3));
    expect(s({ kind: 'reflect', line: 'xa', a: 2 }, P(5, 1))).toEqual(P(-1, 1));
    expect(s({ kind: 'reflect', line: 'yb', a: -1 }, P(5, 1))).toEqual(P(5, -3));
    expect(s({ kind: 'dilate', k: 0.5 }, P(6, -4))).toEqual(P(3, -2));
    expect(CORE.cleanStep({ kind: 'translate', dx: 0, dy: 0 })).toBe(null);
    expect(CORE.cleanStep({ kind: 'rotate', angle: 45 })).toBe(null);
    expect(CORE.cleanStep({ kind: 'dilate', k: 1 })).toBe(null);
  });

  it('generated sequence puzzles are solvable, scaled by grade, and on the grid', () => {
    for (let s = 1; s <= 250; s++) {
      for (const lv of ['g5', 'g6', 'g8']) {
        const q = CORE.genSequence(lv, rng(s), { similar: lv === 'g8' && s % 2 === 0 });
        expect(CORE.diagnoseSequence(q.steps, q), JSON.stringify(q)).toBe('correct');
        expect(CORE.scalene(q.A)).toBe(true);
        const lo = lv === 'g5' ? 0 : -10;
        for (const p of q.B) expect(Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= lo && p.x <= 10 && p.y >= lo && p.y <= 10, JSON.stringify(q)).toBe(true);
        const kinds = q.steps.map((st) => st.kind);
        if (lv === 'g5') expect(kinds.every((k) => k === 'translate')).toBe(true);
        if (lv === 'g6') expect(kinds.every((k) => k === 'translate' || k === 'reflect') && q.steps.every((st) => st.kind !== 'reflect' || st.line === 'x' || st.line === 'y')).toBe(true);
        if (lv === 'g8') {
          expect(q.steps.length).toBeGreaterThanOrEqual(2);
          expect(CORE.isTranslationOf(q.A, q.B)).toBe(false);
          if (q.similar) { expect(kinds).toContain('dilate'); expect(Math.abs(CORE.sizeRatio(q.A, q.B) - 1)).toBeGreaterThan(0.1); }
          else expect(CORE.sizeRatio(q.A, q.B)).toBeCloseTo(1, 9);
        }
      }
    }
  });

  it('names the slip in a sequence: wrong mirror, wrong turn, wrong centre, order, missing moves', () => {
    const A = TRI, B = SEQ.B;
    const task = { A, B, similar: false };
    expect(CORE.diagnoseSequence([{ kind: 'reflect', line: 'x' }, { kind: 'translate', dx: 0, dy: -5 }], task)).toBe('wrong_mirror');
    expect(CORE.diagnoseSequence([{ kind: 'reflect', line: 'y' }, { kind: 'translate', dx: -5, dy: 0 }], task)).toBe('swapped_vector');
    expect(CORE.diagnoseSequence([{ kind: 'reflect', line: 'y' }], task)).toBe('needs_translation');
    expect(CORE.diagnoseSequence([], task)).toBe('empty');
    // Rotation 90 counterclockwise then a slide; the student turns clockwise.
    const rotTask = { A, B: CORE.applySeq(A, [{ kind: 'rotate', angle: 90, cx: 0, cy: 0 }, { kind: 'translate', dx: 2, dy: -1 }]), similar: false };
    expect(CORE.diagnoseSequence([{ kind: 'rotate', angle: 270, cx: 0, cy: 0 }, { kind: 'translate', dx: 2, dy: -1 }], rotTask)).toBe('rotation_direction');
    // Right turn, wrong centre.
    const cTask = { A, B: CORE.applySeq(A, [{ kind: 'rotate', angle: 180, cx: 2, cy: 1 }]), similar: false };
    expect(CORE.diagnoseSequence([{ kind: 'rotate', angle: 180, cx: 0, cy: 0 }], cTask)).toBe('wrong_centre');
    // Right moves, wrong order (rotation and translation do not commute).
    expect(CORE.diagnoseSequence([{ kind: 'translate', dx: 2, dy: -1 }, { kind: 'rotate', angle: 90, cx: 0, cy: 0 }], rotTask)).toBe('order_matters');
    // Size and facing.
    const simTask = { A, B: CORE.applySeq(A, [{ kind: 'dilate', k: 2 }, { kind: 'translate', dx: -6, dy: 0 }]), similar: true };
    expect(CORE.diagnoseSequence([{ kind: 'translate', dx: -6, dy: 0 }], simTask)).toBe('needs_dilation');
    expect(CORE.diagnoseSequence([{ kind: 'dilate', k: 0.5 }, { kind: 'translate', dx: -6, dy: 0 }], simTask)).toBe('reciprocal_scale');
    const flipTask = { A, B: CORE.applySeq(A, [{ kind: 'reflect', line: 'x' }, { kind: 'translate', dx: 3, dy: 0 }]), similar: false };
    expect(CORE.diagnoseSequence([{ kind: 'translate', dx: 3, dy: -4 }], flipTask)).toBe('needs_reflection');
  });

  it('every named sequence slip is a real one-move repair of the student\'s own sequence', () => {
    const OTHER = { x: 'y', y: 'x', yx: 'ynx', ynx: 'yx' };
    const repairs = {
      rotation_direction: (st) => (st.kind === 'rotate' ? [{ angle: 360 - st.angle }] : []),
      wrong_mirror: (st) => (st.kind === 'reflect' ? [{ line: OTHER[st.line] }] : []),
      swapped_vector: (st) => (st.kind === 'translate' ? [{ dx: st.dy, dy: st.dx }] : []),
      reciprocal_scale: (st) => (st.kind === 'dilate' ? [{ k: 1 / st.k }] : []),
    };
    let named = 0;
    for (let s = 1; s <= 200; s++) {
      const q = CORE.genSequence('g8', rng(s), { similar: s % 3 === 0 });
      q.steps.forEach((st, i) => {
        const mutated = q.steps.map((x) => Object.assign({}, x));
        if (st.kind === 'reflect') mutated[i].line = OTHER[st.line];
        else if (st.kind === 'rotate' && st.angle !== 180) mutated[i].angle = 360 - st.angle;
        else return;
        const code = CORE.diagnoseSequence(mutated, q);
        expect(code).not.toBe('correct');
        if (!repairs[code]) return;
        named++;
        const fixed = mutated.some((m, j) => repairs[code](m).some((patch) => { const c = mutated.slice(); c[j] = Object.assign({}, m, patch); return CORE.diagnoseSequence(c, q) === 'correct'; }));
        expect(fixed, code + ' ' + JSON.stringify(mutated)).toBe(true);
      });
    }
    expect(named).toBeGreaterThan(150);
  });

  it('judge items: a "maps" item really maps; a slipped item misses and fixing its one step repairs it', () => {
    let yes = 0, no = 0;
    for (let s = 1; s <= 250; s++) {
      const j = CORE.genJudge(s % 2 ? 'g8' : 'g6', rng(s));
      const img = CORE.applySeq(j.A, j.proposed);
      if (j.maps) { yes++; expect(CORE.sameFigure(img, j.B)).toBe(true); continue; }
      no++;
      expect(CORE.sameFigure(img, j.B)).toBe(false);
      const fixed = j.proposed.slice(); fixed[j.wrongStep] = j.fixStep;
      expect(CORE.sameFigure(CORE.applySeq(j.A, fixed), j.B)).toBe(true);
      expect(CORE.cleanTf(j)).toBeTruthy();
    }
    expect(yes).toBeGreaterThan(80);
    expect(no).toBeGreaterThan(80);
  });

  it('rotations: wrong direction, wrong centre, a flip and a swap without a sign change are named', () => {
    expect(CORE.diagnoseRotate(P(-1, 3), ROT)).toBe('correct');
    expect(CORE.diagnoseRotate(P(1, -3), ROT)).toBe('rotation_direction');
    expect(CORE.diagnoseRotate(P(3, -1), ROT)).toBe('reflected_not_rotated');
    expect(CORE.diagnoseRotate(P(1, 3), ROT)).toBe('swap_no_sign');
    const about = { type: 'rotate', p: P(4, 2), angle: 90, c: P(1, 1), answer: P(0, 4) };
    expect(CORE.diagnoseRotate(P(0, 4), about)).toBe('correct');
    expect(CORE.diagnoseRotate(P(-2, 4), about)).toBe('wrong_centre');
    for (let s = 1; s <= 300; s++) {
      const r = CORE.genRotate(s % 2 ? 'g8' : 'g6', rng(s));
      expect(CORE.diagnoseRotate(r.answer, r)).toBe('correct');
      expect(r.answer).toEqual(CORE.applyStep(r.p, { kind: 'rotate', angle: r.angle, cx: r.c.x, cy: r.c.y }));
      if (!(s % 2)) expect(r.c).toEqual(P(0, 0));
      // No slip lands on the answer, so a slip is never graded right.
      for (const sl of CORE.rotateSlips(r)) expect(sl.p.x === r.answer.x && sl.p.y === r.answer.y).toBe(false);
    }
  });

  it('dilations: scaling the sides from a corner instead of the distances from the centre is named', () => {
    expect(CORE.diagnoseDilate(P(8, 2), DIL)).toBe('correct');
    expect(CORE.diagnoseDilate(P(7, 1), DIL)).toBe('sides_not_centre'); // grown from A(1, 1)
    expect(CORE.diagnoseDilate(P(7, -1), DIL)).toBe('sides_not_centre'); // grown from C(1, 3)
    expect(CORE.diagnoseDilate(P(6, 3), DIL)).toBe('added_scale');
    expect(CORE.diagnoseDilate(P(8, 1), DIL)).toBe('one_coordinate_scaled');
    for (let s = 1; s <= 300; s++) {
      const d = CORE.genDilate('g8', rng(s));
      const V = d.A[d.q];
      expect(d.answer).toEqual(P(d.k * V.x, d.k * V.y));
      for (const W of d.A) {
        if (W === V) continue;
        expect(CORE.diagnoseDilate(P(W.x + d.k * (V.x - W.x), W.y + d.k * (V.y - W.y)), d)).toBe('sides_not_centre');
      }
      for (const p of d.image) expect(Number.isInteger(p.x) && Number.isInteger(p.y) && Math.abs(p.x) <= 10 && Math.abs(p.y) <= 10).toBe(true);
    }
  });

  it('scale factor and similarity: ratio, reciprocal, difference', () => {
    const sc = { type: 'scale', A: [P(1, 1), P(4, 1), P(1, 3)], image: [P(2, 2), P(8, 2), P(2, 6)], k: 2, ask: 'k', len: 3, answer: 2 };
    expect(CORE.diagnoseScale(2, sc)).toBe('correct');
    expect(CORE.diagnoseScale(0.5, sc)).toBe('reciprocal_scale');
    expect(CORE.diagnoseScale(3, sc)).toBe('difference_not_ratio');
    const side = Object.assign({}, sc, { ask: 'side', answer: 6 });
    expect(CORE.diagnoseScale(5, side)).toBe('added_scale');
    expect(CORE.diagnoseScale(3, side)).toBe('same_length');
    for (let s = 1; s <= 300; s++) {
      const g = CORE.genScale('g8', rng(s));
      expect(CORE.diagnoseScale(g.answer, g)).toBe('correct');
      expect(CORE.sizeRatio(g.A, g.image)).toBeCloseTo(g.k, 9);
      expect(g.A[1].y).toBe(g.A[0].y); // AB lies on a grid line, so its length is readable
      expect(Math.abs(g.A[1].x - g.A[0].x)).toBe(g.len);
    }
  });
});

describe('engine: patterns (5.OA.3) and tables (6.EE.9)', () => {
  it('pattern pairs are multiplicative and the slips are named', () => {
    for (let s = 1; s <= 200; s++) {
      const p = CORE.genPatterns('g5', rng(s));
      p.A.forEach((a, i) => { expect(p.B[i]).toBe(p.ratio * a); expect(a).toBe(i * p.addA); });
      expect(p.ratio).toBeGreaterThan(1);
      expect(p.B[4]).toBeLessThanOrEqual(36);
    }
    expect(CORE.diagnoseFill([2, 4, 6, 8], [6, 12, 18, 24], PAT).code).toBe('correct');
    expect(CORE.diagnoseFill([2, 4, 6, 8], [2, 4, 6, 8], PAT)).toEqual({ code: 'pattern_other_rule', which: 'B' });
    expect(CORE.diagnoseFill([3, 6, 9, 12], [6, 12, 18, 24], PAT)).toEqual({ code: 'pattern_wrong_step', which: 'A' });
    expect(CORE.diagnoseFill([2, 4, 8, 16], [6, 12, 18, 24], PAT)).toEqual({ code: 'pattern_multiplied', which: 'A' });
    expect(CORE.diagnoseFill([2, NaN, 6, 8], [6, 12, 18, 24], PAT).code).toBe('incomplete');
    const pairs = PAT.A.map((a, i) => P(a, PAT.B[i]));
    expect(CORE.diagnosePairs(pairs, pairs)).toBe('correct');
    expect(CORE.diagnosePairs(pairs.map((p) => P(p.y, p.x)), pairs)).toBe('swapped');
    expect(CORE.diagnosePairs(pairs.slice(0, 3), pairs)).toBe('missing_points');
    expect(CORE.diagnosePairs(pairs.concat([P(1, 1)]), pairs)).toBe('extra_points');
    expect(CORE.diagnoseRelation(3, PAT)).toBe('correct');
    expect(CORE.diagnoseRelation(4, PAT)).toBe('additive_relation');
    expect(CORE.diagnoseRelation(6, PAT)).toBe('gave_step');
    expect(CORE.diagnoseRelation(1 / 3, PAT)).toBe('inverted_ratio');
  });

  it('tables follow y = mx + b by grade, and the equation slips are named', () => {
    for (let s = 1; s <= 200; s++) {
      for (const lv of ['g5', 'g6', 'g8']) {
        const tb = CORE.genTable(lv, rng(s));
        tb.xs.forEach((x, i) => expect(tb.ys[i]).toBe(tb.m * x + tb.b));
        expect(tb.askY).toBe(tb.m * tb.askX + tb.b);
        if (lv === 'g5') expect(tb.b).toBe(0);
        if (lv === 'g6') expect(tb.b === 0 || tb.m === 1).toBe(true);
        if (lv === 'g8') expect(tb.b).toBeGreaterThan(0);
        expect(CORE.diagnoseEquation(tb.m, tb.b, tb)).toBe('correct');
      }
    }
    expect(CORE.diagnoseEquation(3, 2, TAB)).toBe('swapped_rate_start');
    expect(CORE.diagnoseEquation(4, 3, TAB)).toBe('step_per_row');
    expect(CORE.diagnoseEquation(2, 0, TAB)).toBe('forgot_start');
    const prop = { type: 'table', ctx: 'walk', m: 4, b: 0, xstep: 1, xs: [0, 1, 2, 3, 4], ys: [0, 4, 8, 12, 16], askX: 6, askY: 24 };
    expect(CORE.diagnoseEquation(1, 4, prop)).toBe('added_not_multiplied');
    expect(CORE.diagnosePairs(CORE.tableRowPairs(TAB), CORE.tablePairs(TAB), CORE.tableRowPairs(TAB))).toBe('used_row_number');
    expect(CORE.diagnoseTablePredict(24, TAB)).toBe('forgot_start');
    expect(CORE.diagnoseTablePredict(27, TAB)).toBe('correct');
  });
});

describe('engine: treasure missions', () => {
  // An independent reading of each clue, so the uniqueness check is not the
  // engine grading itself.
  const holds = (c, p, lms) => {
    const L = c.lm != null ? lms[c.lm].p : null;
    return ({
      same_x: () => p.x === L.x, same_y: () => p.y === L.y,
      grid_dist: () => (p.x === L.x && Math.abs(p.y - L.y) === c.n) || (p.y === L.y && Math.abs(p.x - L.x) === c.n),
      x_gt: () => p.x > L.x, x_lt: () => p.x < L.x, y_gt: () => p.y > L.y, y_lt: () => p.y < L.y,
      quadrant: () => p.x !== 0 && p.y !== 0 && (p.x > 0 ? (p.y > 0 ? 'I' : 'IV') : (p.y > 0 ? 'II' : 'III')) === c.q,
      sum: () => p.x + p.y === c.n, opp_x: () => p.x === -L.x, abs_y: () => Math.abs(p.y) === c.n,
      euclid: () => (p.x - L.x) ** 2 + (p.y - L.y) ** 2 === c.n * c.n,
    })[c.kind]();
  };
  it('every mission has exactly one spot that fits all its clues, and no single clue gives it away', () => {
    for (let s = 1; s <= 200; s++) {
      for (const lv of ['g5', 'g6', 'g8']) {
        const m = CORE.genMission(lv, rng(s));
        const all = [];
        for (let x = m.lo; x <= m.hi; x++) for (let y = m.lo; y <= m.hi; y++) all.push(P(x, y));
        const fit = all.filter((p) => m.clues.every((c) => holds(c, p, m.lms)));
        expect(fit, JSON.stringify(m)).toEqual([m.T]);
        expect(m.clues.length).toBeGreaterThanOrEqual(2);
        expect(m.clues.length).toBeLessThanOrEqual(4);
        for (const c of m.clues) expect(all.filter((p) => holds(c, p, m.lms)).length, JSON.stringify(c)).toBeGreaterThan(1);
        if (lv === 'g5') { expect([m.lo, m.hi]).toEqual([0, 10]); expect(m.clues.every((c) => ['quadrant', 'sum', 'opp_x', 'abs_y', 'euclid'].indexOf(c.kind) < 0)).toBe(true); }
        if (lv !== 'g8') expect(m.clues.some((c) => c.kind === 'euclid')).toBe(false);
        for (const l of m.lms) expect(l.p.x === m.T.x && l.p.y === m.T.y).toBe(false);
      }
    }
  });

  it('a dig names the clues it breaks; malformed or ambiguous saved missions are dropped', () => {
    expect(CORE.diagnoseDig(P(6, 4), MISSION)).toEqual({ code: 'swapped', broken: [0, 1] });
    expect(CORE.diagnoseDig(P(4, 5), MISSION)).toEqual({ code: 'off_by_one', broken: [1] });
    expect(CORE.diagnoseDig(P(4, 6), MISSION).code).toBe('correct');
    expect(CORE.cleanMission(MISSION)).toBeTruthy();
    expect(CORE.cleanMission(Object.assign({}, MISSION, { clues: [{ kind: 'same_x', lm: 0 }] }))).toBe(null); // many spots fit
    expect(CORE.cleanMission(Object.assign({}, MISSION, { lms: 'x' }))).toBe(null);
    expect(CORE.cleanMission(Object.assign({}, MISSION, { clues: [{ kind: 'teleport' }] }))).toBe(null);
    expect(CORE.cleanMission(null)).toBe(null);
  });
});

describe('keyboard cursor focus does not outlive the tool (stage-A limitation)', () => {
  it('a saved gridFocused flag draws no cursor; focus is view-only and gone after a remount', async () => {
    await mount({ cgTab: 'explore', gridFocused: true });
    expect(cursorDrawn()).toBe(false);
    const app = document.querySelector('[role="application"].allo-cg-app');
    await focus(app);
    expect(cursorDrawn()).toBe(true);
    expect(latest.gridFocused).toBe(true); // the stale saved value is never rewritten...
    await blur(app);
    expect(cursorDrawn()).toBe(false);
    await focus(app);
    // ...and unmounting with focus inside leaves no cursor behind for the next visit.
    const saved = latest;
    await mount(saved);
    expect(cursorDrawn()).toBe(false);
    const fresh = {};
    await mount(fresh);
    await focus(document.querySelector('[role="application"].allo-cg-app'));
    expect('gridFocused' in latest).toBe(false);
  });
});

describe('Transformations tab', () => {
  it('builds a sequence; the image appears only after the check; the slip is named; second try pays 2 XP', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g6', tfTask: SEQ });
    expect(svgText().some((s) => s === 'A′')).toBe(false);
    await click(byText(/^Reflect$/));
    await click(byText(/^\+ Add this step$/));
    await click(byText(/^Translate$/));
    await type(labelInput('Move in x'), '0');
    await type(labelInput('Move in y'), '-5');
    await click(byText(/^\+ Add this step$/));
    expect(latest.tfSteps).toEqual([{ kind: 'reflect', line: 'x', a: 0 }, { kind: 'translate', dx: 0, dy: -5 }]);
    expect(document.querySelector('[data-coordgrid-steps]').textContent).toContain('Reflect across the x-axis.');
    await click(byLabel('Check my sequence'));
    expect(latest.tfFb.msg).toMatch(/mirror line/);
    expect(latest.tfFb.msg).not.toContain('One sequence that works');
    expect(svgText().some((s) => s === 'A′')).toBe(true); // their own image, after the check
    expect(paid()).toEqual([]);
    await click(byLabel('Remove step 1'));
    await click(byText(/^Reflect$/));
    await type(labelInput('Mirror line'), 'y');
    await click(byText(/^\+ Add this step$/));
    await click(byLabel('Check my sequence'));
    expect(latest.tfFb.correct).toBe(true);
    expect(latest.tfFb.msg).toMatch(/congruent/);
    expect(latest.sequencesSolved).toBe(1);
    expect(paid()).toEqual([['coordinate', 2, 'transformation sequence']]);
    expect(errors).toEqual([]);
  });

  it('two misses reveal a working sequence, lock the item and log the slip; no credit afterwards', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g6', tfTask: SEQ, tfSteps: [{ kind: 'reflect', line: 'y', a: 0 }] });
    await click(byLabel('Check my sequence'));
    expect(latest.tfFb.msg).toMatch(/wrong place/);
    await mount(Object.assign({}, latest, { tfSteps: [{ kind: 'reflect', line: 'y', a: 0 }, { kind: 'reflect', line: 'y', a: 0 }] }));
    await click(byLabel('Check my sequence'));
    // Stage C: closed on the second miss; the answer waits for "Show the answer".
    expect(latest.tfFb.msg).not.toContain('One sequence that works');
    await click(document.querySelector('[data-coordgrid-reveal]'));
    expect(latest.tfFb.msg).toContain('One sequence that works: Reflect across the y-axis.');
    expect(latest.missedLog.map((m) => [m.task, m.code])).toEqual([['sequence', 'needs_reflection']]); // the slip of the changed second answer
    expect(latest.tfTask.done).toBe(true);
    expect(document.querySelector('#coordinate-section-panel [data-coordgrid-locked]')).toBeTruthy();
    // Reloading the same item with the shown answer earns nothing.
    await mount(Object.assign({}, latest, { tfTask: SEQ, tfSteps: SEQ.steps, tfFb: {} }));
    await click(byLabel('Check my sequence'));
    expect(latest.tfFb.correct).toBe(true);
    expect(paid()).toEqual([]);
    expect(latest.sequencesSolved || 0).toBe(0);
  });

  // Stage C: one decision (each step, or "No step is wrong") with the same two
  // tries as every other item; the yes/no stage and its single try are gone.
  it('judge: finding the wrong step first try pays once; Kai\'s image is drawn after the decision', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g8', tfTask: JUDGE });
    expect(svgText().some((s) => s === 'A′')).toBe(false);
    await click(byText(/^Step 1$/));
    expect(latest.tfFb.correct).toBe(true);
    expect(svgText().some((s) => s === 'A′')).toBe(true);
    expect(latest.tfFb.msg).toContain('Kai reflected across the wrong line.');
    expect(latest.tfFb.msg).toContain('Step 1 should be: Reflect across the y-axis.');
    expect(paid()).toEqual([['coordinate', 5, 'judge sequence']]);
    // A wrong first decision rules that choice out and gives a second try, answer hidden.
    await mount({ cgTab: 'transform', cgLevel: 'g8', tfTask: JUDGE });
    await click(byText(/^No step is wrong: Kai is right$/));
    expect(latest.tfTask.done).toBeFalsy();
    expect(latest.tfFb.msg).not.toContain('step 1 is wrong');
    expect(byText(/^No step is wrong: Kai is right$/).disabled).toBe(true);
    expect(svgText().some((s) => s === 'A′')).toBe(true); // now known to miss, so it is drawn
    await click(byText(/^Step 2$/));
    expect(latest.tfTask.done).toBe(true);
    expect(latest.missedLog.map((m) => m.code)).toEqual(['judge_wrong_step']);
    expect(latest.tfFb.msg).not.toContain('step 1 is wrong');
    await click(document.querySelector('[data-coordgrid-reveal]'));
    expect(latest.tfFb.msg).toContain('step 1 is wrong');
    expect(paid().length).toBe(1); // only the first item's 5 XP
  });

  it('predict a rotation with the keyboard cursor; P′ is drawn only after the check', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g8', tfTask: ROT });
    expect(svgText().some((s) => s.startsWith('P′'))).toBe(false);
    const app = document.querySelector('[data-coordgrid-app="tf"]');
    expect(app.getAttribute('tabindex')).toBe('0');
    await focus(app);
    await key(app, 'Home');
    await key(app, 'ArrowLeft');
    await key(app, 'ArrowUp'); await key(app, 'ArrowUp'); await key(app, 'ArrowUp');
    expect(sr[sr.length - 1]).toMatch(/x −1, y 3, in quadrant II\./);
    await key(app, 'Enter');
    expect([latest.tfFb.ansX, latest.tfFb.ansY]).toEqual(['-1', '3']);
    await click(byLabel('Check'));
    expect(latest.tfFb.correct).toBe(true);
    expect(latest.tfFb.msg).toMatch(/\(−y, x\)/);
    expect(svgText().some((s) => s.startsWith('P′'))).toBe(true);
    expect(paid()).toEqual([['coordinate', 5, 'rotation']]);
    expect(latest.rotationsSolved).toBe(1);
  });

  it('rotation about a centre: turning about the origin instead is named', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g8', tfTask: { type: 'rotate', p: P(4, 2), angle: 90, c: P(1, 1), answer: P(0, 4), tries: 0, hint: 0, stage: 'answer' } });
    await type(inputLabelled('Your x-coordinate'), '-2');
    await type(inputLabelled('Your y-coordinate'), '4');
    await click(byLabel('Check'));
    expect(latest.tfFb.msg).toMatch(/centre of the rotation/);
    expect(latest.tfTask.tries).toBe(1);
  });

  it('dilation: growing from a corner is named, then the answer and the whole image are shown', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g8', tfTask: DIL });
    expect(svgText().some((s) => s === 'B′')).toBe(false);
    await type(inputLabelled('Your x-coordinate'), '7');
    await type(inputLabelled('Your y-coordinate'), '1');
    await click(byLabel('Check'));
    expect(latest.tfFb.msg).toMatch(/own corners/);
    expect(svgText().some((s) => s === 'B′')).toBe(false);
    await type(inputLabelled('Your x-coordinate'), '6');
    await type(inputLabelled('Your y-coordinate'), '3');
    await click(byLabel('Check'));
    expect(svgText().some((s) => s === 'B′')).toBe(false); // stage C: shown only on request
    await click(document.querySelector('[data-coordgrid-reveal]'));
    expect(latest.tfFb.msg).toContain('The image is B′ (8, 2).');
    expect(svgText().filter((s) => /^[ABC]′$/.test(s)).length).toBe(3);
    expect(latest.missedLog.map((m) => m.code)).toEqual(['added_scale']);
    expect(paid()).toEqual([]);
  });

  it('a teacher can turn dilations off; the tasks and the builder move disappear', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g8', tfTask: SEQ }, { isTeacherMode: true });
    const panel = document.querySelector('[data-coordgrid-teacher]');
    expect(byText(/^Predict a dilation$/)).toBeTruthy();
    expect(byText(/^Dilate$/)).toBeTruthy();
    const box = [...panel.querySelectorAll('label')].find((l) => /Turn off dilations/.test(l.textContent)).querySelector('input');
    await click(box);
    expect(latest.cgTeacher.noDilate).toBe(true);
    expect(byText(/^Predict a dilation$/)).toBeFalsy();
    expect(byText(/^Scale factor and similarity$/)).toBeFalsy();
    expect(byText(/^Dilate$/)).toBeFalsy();
    await mount(latest);
    expect(document.querySelector('[data-coordgrid-teacher]')).toBe(null);
  });

  it('grade 5 sees translations only, in quadrant I; the rest is stretch', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g5' });
    await click(byText(/^Build a transformation sequence$/));
    const tk = latest.tfTask;
    expect(tk.steps.every((s) => s.kind === 'translate')).toBe(true);
    expect([...tk.A, ...tk.B].every((p) => p.x >= 0 && p.y >= 0)).toBe(true);
    expect(byText(/^Reflect$/)).toBeFalsy();
    expect(svgText().some((s) => s.startsWith('−'))).toBe(false);
    expect(document.body.textContent).toContain('Stretch: beyond this level');
    await mount({ cgTab: 'transform', cgLevel: 'g5', cgTeacher: { hideStretch: true } });
    expect(byText(/^Predict a rotation$/)).toBeFalsy();
  });
});

describe('Patterns and tables tab', () => {
  it('two patterns: fill, plot the pairs, relate them with a reason; slips named; paid once', async () => {
    await mount({ cgTab: 'patterns', cgLevel: 'g5', ptTask: PAT });
    for (let i = 1; i <= 4; i++) {
      await type(inputLabelled('Pattern A, term ' + i), String(2 * i));
      await type(inputLabelled('Pattern B, term ' + i), String(2 * i));
    }
    await click(byLabel('Check the terms'));
    expect(latest.ptFb.msg).toMatch(/Check pattern B\. You used the other pattern's rule/);
    for (let i = 1; i <= 4; i++) await type(inputLabelled('Pattern B, term ' + i), String(6 * i));
    await click(byLabel('Check the terms'));
    expect(latest.ptTask.stage).toBe('plot');
    // One pair by keyboard, the rest typed.
    const app = document.querySelector('[data-coordgrid-app="pt"]');
    await focus(app);
    await key(app, 'Home');
    await key(app, 'Enter');
    expect(latest.ptFb.pts).toEqual([P(0, 0)]);
    for (const [x, y] of [[2, 6], [4, 12], [6, 18], [8, 24]]) {
      await type(labelInput('X coordinate'), String(x));
      await type(labelInput('Y coordinate'), String(y));
      await click(byText(/^Plot or remove point$/));
    }
    // A correct plot is not confirmed before the check (no line through the points yet).
    expect(document.querySelector('#coordinate-section-panel svg polyline')).toBe(null);
    await click(byLabel('Check my points'));
    expect(latest.ptTask.stage).toBe('relate');
    expect(document.querySelector('#coordinate-section-panel svg polyline')).toBeTruthy();
    await type(labelInput('Each pattern B term'), '3');
    await click(byLabel('Check'));
    expect(latest.ptFb.msg).toMatch(/Explain how you know/);
    expect(latest.ptTask.stage).toBe('relate');
    await type(document.querySelector('[data-coordgrid-tab="patterns"] textarea'), 'B adds 6 and A adds 2, and 6 is 3 times 2.');
    await click(byLabel('Check'));
    expect(latest.ptTask.done).toBe(true);
    expect(latest.patternsSolved).toBe(1);
    expect(paid()).toEqual([['coordinate', 2, 'patterns']]);
    expect(errors).toEqual([]);
  });

  it('table to graph: row numbers for x is named; a reveal carries on for practice with no credit', async () => {
    const rows = [[0, 3], [1, 7], [2, 11], [3, 15], [4, 19]];
    await mount({ cgTab: 'patterns', cgLevel: 'g6', ptTask: TAB, ptFb: { pts: rows.map(([x, y]) => P(x, y)) } });
    await click(byLabel('Check my points'));
    expect(latest.ptFb.msg).toMatch(/row number for x/);
    await mount(Object.assign({}, latest, { ptFb: Object.assign({}, latest.ptFb, { pts: rows.slice(0, 4).map(([x, y]) => P(x, y)).concat([P(9, 9)]) }) }));
    await click(byLabel('Check my points'));
    expect(latest.ptTask.missed).toBe(true); // stage C: closed; the pairs wait for "Show the answer"
    expect(latest.ptTask.stage).toBe('plot');
    await click(document.querySelector('[data-coordgrid-reveal]'));
    expect(latest.ptTask.stage).toBe('equation');
    expect(latest.ptTask.missed).toBe(true);
    expect(sameSet(latest.ptFb.pts, TAB.xs.map((x, i) => P(x, TAB.ys[i])))).toBe(true);
    await type(inputLabelled('Rate: the number that multiplies x'), '4');
    await type(inputLabelled('Start: y when x is 0'), '3');
    await click(byLabel('Check'));
    expect(latest.ptFb.msg).toMatch(/goes up by 2 each row/);
    await type(inputLabelled('Rate: the number that multiplies x'), '2');
    await click(byLabel('Check'));
    expect(latest.ptTask.stage).toBe('predict');
    await type(labelInput('y when x is 12'), '24');
    await click(byLabel('Check'));
    expect(latest.ptFb.msg).toMatch(/left out the start/);
    await type(labelInput('y when x is 12'), '27');
    await click(byLabel('Check'));
    expect(latest.ptTask.done).toBe(true);
    expect(latest.tablesSolved || 0).toBe(0);
    expect(paid()).toEqual([]);
    expect(latest.missedLog.map((m) => [m.task, m.code])).toEqual([['table', 'other']]); // the slip of the changed second answer
  });
});

describe('Treasure hunt tab', () => {
  it('a typed dig names the broken clues and the swap; the keyboard finds the treasure', async () => {
    await mount({ cgTab: 'treasure', cgLevel: 'g5', thMission: MISSION });
    const card = document.querySelector('[data-coordgrid-th]');
    expect(card.querySelector('[data-coordgrid-clues]').textContent).toContain('The treasure is on the same vertical line as the well.');
    expect(card.textContent).toContain('the well at (4, 2)');
    await type(labelInput('X coordinate'), '6');
    await type(labelInput('Y coordinate'), '4');
    await click(byText(/^Dig here$/));
    expect(latest.thFb.msg).toMatch(/breaks clues 1, 2/);
    expect(latest.thFb.msg).toMatch(/swapped/);
    expect(latest.thFb.msg).toMatch(/2 digs left/);
    const app = document.querySelector('[data-coordgrid-app="th"]');
    await focus(app);
    await key(app, 'Home');
    await key(app, ' ');
    expect(latest.thMission.marks).toEqual([P(0, 0)]);
    for (let i = 0; i < 4; i++) await key(app, 'ArrowRight');
    await key(app, 'ArrowUp', { shiftKey: true });
    await key(app, 'ArrowUp');
    expect(sr[sr.length - 1]).toBe('x 4, y 6.');
    await key(app, 'Enter');
    expect(latest.thFb.correct).toBe(true);
    expect(latest.treasuresFound).toBe(1);
    expect(paid()).toEqual([['coordinate', 2, 'treasure']]);
    await click(byText(/^Describe the map$/));
    expect(document.querySelector('[data-coordgrid-th-describe]').textContent).toContain('The treasure is at (4, 6).');
  });

  it('three missed digs reveal the spot and lock the mission', async () => {
    await mount({ cgTab: 'treasure', cgLevel: 'g5', thMission: MISSION });
    for (const [x, y] of [[1, 1], [2, 2], [3, 3]]) {
      await type(labelInput('X coordinate'), String(x));
      await type(labelInput('Y coordinate'), String(y));
      await click(byText(/^Dig here$/));
    }
    expect(latest.thMission.done).toBe(true);
    expect(latest.thFb.msg).not.toContain('(4, 6)'); // stage C: shown only on request
    await click(document.querySelector('[data-coordgrid-reveal]'));
    expect(latest.thFb.msg).toContain('The treasure was at (4, 6)');
    expect(latest.missedLog.map((m) => m.task)).toEqual(['treasure']);
    expect(paid()).toEqual([]);
    expect(byText(/^Next mission$/)).toBeTruthy();
  });

  it('a new mission is generated for the student\'s level and announced', async () => {
    await mount({ cgTab: 'treasure', cgLevel: 'g8' });
    await click(byText(/^Start a mission$/));
    expect(latest.thMission.lo).toBe(-8);
    expect(CORE.missionCandidates(latest.thMission)).toEqual([latest.thMission.T]);
    expect(sr[sr.length - 1]).toMatch(/Clue 1:/);
  });
});

describe('stage B: themes, translation, hostile saves', () => {
  const STATES = [
    { cgTab: 'transform', cgLevel: 'g8', tfTask: SEQ, tfSteps: SEQ.steps, tfFb: { checked: SEQ.steps, msg: 'm', correct: false } },
    { cgTab: 'transform', cgLevel: 'g8', tfTask: Object.assign({}, JUDGE, { stage: 'which' }) },
    { cgTab: 'transform', cgLevel: 'g8', tfTask: Object.assign({}, DIL, { done: true, hint: 2 }), tfFb: { correct: true, msg: 'ok' } },
    { cgTab: 'transform', cgLevel: 'g8', tfTask: { type: 'scale', A: TRI, image: DIL.image, k: 2, ask: 'side', len: 3, answer: 6, tries: 1, hint: 1, stage: 'answer' } },
    { cgTab: 'transform', cgLevel: 'g8', tfTask: Object.assign({}, ROT, { hint: 2 }), tfDraft: { kind: 'rotate' } },
    { cgTab: 'patterns', cgLevel: 'g6', ptTask: PAT, ptFb: { vals: { a1: '2' } } },
    { cgTab: 'patterns', cgLevel: 'g6', ptTask: Object.assign({}, PAT, { stage: 'relate', hint: 2 }) },
    { cgTab: 'patterns', cgLevel: 'g8', ptTask: Object.assign({}, TAB, { stage: 'equation' }) },
    { cgTab: 'patterns', cgLevel: 'g8', ptTask: Object.assign({}, TAB, { stage: 'predict', missed: true }) },
    { cgTab: 'treasure', cgLevel: 'g5', thMission: Object.assign({}, MISSION, { digs: [P(1, 1)], marks: [P(2, 2)], hint: 2 }), thDescOpen: true, thFb: { msg: 'x', correct: false } },
    { cgTab: 'treasure', cgLevel: 'g8' },
    { cgTab: 'transform' }, { cgTab: 'patterns' },
  ];

  it('every new state mounts in light, dark and contrast themes, as student and teacher, without console errors', async () => {
    for (const st of STATES) {
      for (const theme of [{}, { isDark: true }, { isContrast: true }]) {
        await mount(st, Object.assign({ isTeacherMode: !!theme.isDark }, theme));
        expect(document.querySelector('[data-coordinate-theme]'), JSON.stringify(st)).toBeTruthy();
        expect(document.querySelector('#coordinate-section-panel[role="tabpanel"]')).toBeTruthy();
      }
    }
    expect(errors).toEqual([]);
  });

  it('no visible English escapes t() on the new tabs', async () => {
    const leaks = new Set();
    for (const st of STATES) {
      await mount(st, { t: () => '§', isTeacherMode: true });
      const walker = document.createTreeWalker(document.getElementById('root'), window.NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) (n.textContent.match(/[A-Za-z]{3,}/g) || []).forEach((w) => leaks.add(w + ' <' + n.parentElement.tagName + '>'));
      document.querySelectorAll('#root [aria-label], #root [placeholder], #root [title]').forEach((el) => {
        ['aria-label', 'placeholder', 'title'].forEach((a) => { (String(el.getAttribute(a) || '').match(/[A-Za-z]{3,}/g) || []).forEach((w) => leaks.add(w + ' @' + a)); });
      });
    }
    expect([...leaks]).toEqual([]);
  });

  it('inline-coloured text on the new tabs meets 4.5:1 in every theme', async () => {
    const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const hex = (c) => { if (!c) return null; if (c[0] === '#') return c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c.slice(0, 7).toLowerCase(); const m = c.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/); return m ? '#' + [m[1], m[2], m[3]].map((v) => (+v).toString(16).padStart(2, '0')).join('') : null; };
    const bgOf = (el) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const b = hex(n.style && (n.style.backgroundColor || n.style.background)); if (b) return b; } return null; };
    const bad = [];
    for (const theme of [{}, { isDark: true }, { isContrast: true }]) {
      for (const st of STATES.slice(0, 11)) {
        await mount(st, Object.assign({ isTeacherMode: true }, theme));
        document.querySelectorAll('#coordinate-section-panel [style]').forEach((el) => {
          if (el.closest('svg') || !el.textContent.trim()) return;
          const fg = hex(el.style.color), bg = bgOf(el);
          if (!fg || !bg) return;
          const r = ratio(fg, bg);
          if (r < 4.5) bad.push(JSON.stringify(theme) + ' ' + el.tagName + ' "' + el.textContent.trim().slice(0, 30) + '" ' + fg + ' on ' + bg + ' ' + r.toFixed(2));
        });
      }
    }
    expect(bad).toEqual([]);
  });

  it('hostile stage B saves render without errors; pre-stage-B saves still load', async () => {
    const hostile = { cgTab: 'transform', tfTask: { type: 'rotate', p: 'x' }, tfSteps: 'bad', tfFb: 7, tfDraft: 3, tfCur: { x: NaN }, ptTask: { type: 'table', xs: [1] }, ptFb: { pts: 'x', vals: 5 }, thMission: { T: P(1, 1), lms: 5, clues: [] }, thFb: [] };
    for (const tab of ['transform', 'patterns', 'treasure']) {
      await mount(Object.assign({}, hostile, { cgTab: tab }), { isTeacherMode: true });
      expect(document.querySelector('[data-coordgrid-tab="' + tab + '"]')).toBeTruthy();
    }
    await mount({ cgTab: 'explore', plotsSolved: 4, namesSolved: 2, creditedItems: { 'plot:1,2': true }, badges: { firstPlot: true } });
    expect(document.querySelector('[data-coordinate-theme]')).toBeTruthy();
    expect(errors).toEqual([]);
  });

  it('the new tabs are reachable from the tab bar and by arrow keys', async () => {
    // Stage C orders tabs by band; grade 6 keeps this order (grade 5 puts Patterns second).
    await mount({ cgTab: 'explore', cgLevel: 'g6' });
    const tabs = [...document.querySelectorAll('[role="tab"]')].map((b) => b.id.replace('coordinate-section-tab-', ''));
    expect(tabs.slice(0, 4)).toEqual(['explore', 'transform', 'patterns', 'treasure']);
    await key(document.getElementById('coordinate-section-tab-explore'), 'ArrowRight');
    expect(latest.cgTab).toBe('transform');
  });
});
