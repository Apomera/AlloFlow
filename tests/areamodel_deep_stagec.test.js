// Area Model stage C (2026-11-03): a "Start here" learning path for each grade
// level, tabs ordered for the level, one behaviour across tabs (reveal on request
// after two tries, the same hint ladder, the same feedback style, reveals-off
// everywhere), translated quest labels, factoring with negative tiles and zero
// pairs, remainder stories, and a to-scale division drawing. The math runs; the UI
// is driven.
//
// AREAMODEL_STAGEC_SRC points the suite at another copy (mutation check: the
// stage-B copy must turn these red).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.AREAMODEL_STAGEC_SRC || 'stem_lab/stem_tool_areamodel.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let errors = [];
let C = null;
beforeEach(() => {
  resetStemLab();
  C = loadTool(FILE, 'areamodel')._core;
  document.body.innerHTML = '<div id="root"></div>';
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } }));
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
});
afterEach(async () => {
  if (root) await React.act(async () => { root.unmount(); });
  root = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(seed, extra) {
  const out = { latest: null, award: vi.fn(), announce: vi.fn(), setTool: vi.fn() };
  function App() {
    const [state, setState] = React.useState({ _areamodel: seed || {} });
    out.latest = state._areamodel;
    return window.StemLab._registry.areamodel.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, awardXP: out.award, announceToSR: out.announce, setStemLabTool: out.setTool }, extra || {})));
  }
  if (root) { await React.act(async () => { root.unmount(); }); }
  document.body.innerHTML = '<div id="root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return out;
}
const text = () => {
  const walker = document.createTreeWalker(document.getElementById('root'), NodeFilter.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
  return parts.join(' ').replace(/\s+/g, ' ');
};
const hasNumber = (n, s) => new RegExp('(^|[^\\d.])' + String(n).replace('.', '\\.') + '(?![\\d]|\\.\\d)').test(s == null ? text() : s);
const q = (sel) => document.querySelector(sel);
const qa = (sel) => [...document.querySelectorAll(sel)];
const button = (label) => qa('button').find((b) => b.getAttribute('aria-label') === label || b.textContent.trim() === label);
async function type(el, value) {
  const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
async function click(el) { await React.act(async () => { el.click(); }); }
async function key(el, k) { await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }); }
function seq(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const GRADE = { g3: '3rd Grade', g4: '4th Grade', g5: '5th Grade', g6: '7th Grade' };

describe('core: signed expressions, negative-tile factoring, remainders, to-scale division', () => {
  it('expressions print negatives with a minus sign; positive output is unchanged', () => {
    expect(C.polyStr(1, 5, 6)).toBe('x² + 5x + 6');
    expect(C.polyStr(1, -1, -6)).toBe('x² − x − 6');
    expect(C.polyStr(2, -7, 3)).toBe('2x² − 7x + 3');
    expect(C.polyStr(1, 0, -9)).toBe('x² − 9');
    expect(C.factorStr({ x: 1, c: -3 })).toBe('(x − 3)');
    expect(C.factorStr({ x: 1, c: 3 })).toBe('(x + 3)');
    expect(C.factorStr({ x: 2, c: -5 })).toBe('(2x − 5)');
  });

  it('every generated negative-tile expression has a rectangle the steppers reach, and it really is the expression', () => {
    const r = seq(11);
    for (const diff of ['easy', 'medium', 'hard']) for (let i = 0; i < 120; i += 1) {
      const F = C.facGenSigned(diff, r);
      expect(F.B < 0 || F.C < 0, JSON.stringify(F)).toBe(true);
      expect(F.A).toBe(diff === 'hard' ? 2 : 1);
      const sols = C.facSolutionsSigned(F);
      expect(sols.length, JSON.stringify(F)).toBeGreaterThan(0);
      for (const s of sols) {
        expect(s.p !== 0 && s.q !== 0 && Math.abs(s.p) <= 12 && Math.abs(s.q) <= 12).toBe(true);
        const e = C.algExpand({ x: F.A, c: s.p }, { x: 1, c: s.q });
        expect([e.A, e.B, e.C]).toEqual([F.A, F.B, F.C]);
      }
    }
  });

  it('named sign misconceptions, and the zero pairs are counted', () => {
    const F = { A: 1, B: -1, C: -6 };
    expect(C.facCheckSigned(F, 2, -3)).toBe('ok');
    expect(C.facCheckSigned(F, -3, 2)).toBe('ok');
    expect(C.facCheckSigned(F, -2, 3)).toBe('fac_s_signs_swapped');
    expect(C.facCheckSigned(F, 2, 3)).toBe('fac_s_need_opposite');
    expect(C.facCheckSigned(F, 1, -6)).toBe('fac_s_net_x');
    expect(C.facCheckSigned(F, 1, -2)).toBe('fac_s_units');
    expect(C.facCheckSigned(F, 0, 3)).toBe('fac_s_both');
    const G = { A: 1, B: -5, C: 6 };
    expect(C.facCheckSigned(G, -2, -3)).toBe('ok');
    expect(C.facCheckSigned(G, 2, 3)).toBe('fac_s_signs_swapped');
    expect(C.facCheckSigned(G, -2, 3)).toBe('fac_s_need_same');
    expect(C.facCheckSigned(G, 1, 6)).toBe('fac_s_same_sign_wrong');
    expect(C.facCheckSigned(G, -1, -6)).toBe('fac_s_net_x');
    expect(C.facTiles(F, 2, -3)).toEqual({ pos: 2, neg: 3, pairs: 2, net: -1, u: -6 });
    expect(C.facTiles({ A: 2, B: 1, C: -6 }, -3, 2)).toEqual({ pos: 4, neg: 3, pairs: 3, net: 1, u: -6 });
  });

  it('remainder stories: grades 4 and up, a real remainder, and the answer follows the story', () => {
    const r = seq(23);
    const seen = new Set();
    for (const band of ['g4', 'g5', 'g6']) for (const diff of ['easy', 'medium', 'hard']) for (let i = 0; i < 30; i += 1) {
      const s = C.genStory(band, diff, r, 'remainder');
      expect(s.wkind).toBe('remainder');
      seen.add(s.rk);
      expect(s.n % s.a).toBeGreaterThan(0);
      const q0 = Math.floor(s.n / s.a), r0 = s.n % s.a;
      expect(s.answer).toBe(s.rk === 'up' ? q0 + 1 : s.rk === 'drop' ? q0 : r0);
      expect(C.grade(s, String(s.answer)).correct).toBe(true);
    }
    expect([...seen].sort()).toEqual(['drop', 'rem', 'up']);
    for (let i = 0; i < 200; i += 1) expect(C.genStory('g3', 'medium', r).wkind).not.toBe('remainder');
    const up = { mode: 'word', wkind: 'remainder', rk: 'up', n: 50, a: 6, answer: 9 };
    expect(['8', '8.33', '8 R 2', '2', '300', '9'].map((x) => C.grade(up, x).code || 'ok')).toEqual(['r_dropped', 'r_decimal', 'r_remainder_form', 'r_gave_remainder', 'w_multiplied', 'ok']);
    const drop = { mode: 'word', wkind: 'remainder', rk: 'drop', n: 50, a: 6, answer: 8 };
    expect(['9', '2', '8'].map((x) => C.grade(drop, x).code || 'ok')).toEqual(['r_rounded_up', 'r_gave_remainder', 'ok']);
    const rem = { mode: 'word', wkind: 'remainder', rk: 'rem', n: 50, a: 6, answer: 2 };
    expect(['8', '9', '4', '2'].map((x) => C.grade(rem, x).code || 'ok')).toEqual(['r_gave_quotient', 'r_gave_quotient', 'r_gap', 'ok']);
  });

  it('a finished division is drawn to scale only when every chunk stays visible', () => {
    const a = C.divScale(6, [60, 2], 0, 560, 240);
    expect(a.ok).toBe(true);
    expect(a.unit).toBeCloseTo(560 / 62, 6);
    expect(a.h).toBeCloseTo(6 * 560 / 62, 6);
    expect(C.divScale(6, [50, 10, 2], 3, 560, 240).ok).toBe(true);
    const thin = C.divScale(7, [1000, 400, 10], 6, 560, 240);
    expect(thin).toMatchObject({ ok: false, reason: 'thin_chunk', c: 10 });
    expect(C.divScale(49, [20], 20, 560, 240)).toMatchObject({ ok: false, reason: 'thin_rem' });
    expect(C.divScale(6, [], 0, 560, 240).ok).toBe(false);
  });
});

describe('Start here: a learning path for each grade level', () => {
  const EXPECT = {
    g3: ['g3_grid1', 'g3_grid3', 'g3_dist1', 'g3_dist3', 'g3_word'],
    g4: ['g4_partial', 'g4_algo', 'g4_div', 'g4_longdiv', 'g4_rem'],
    g5: ['g5_dec', 'g5_grid', 'g5_frac', 'g5_word'],
    g6: ['g6_mult', 'g6_factor', 'g6_signed', 'g6_pct', 'g6_word']
  };
  // The path folds to one Next line by default (2026-11-04 follow-up); pathOpen shows the whole list.
  it('each level gets its own ordered steps, ticked from the saved progress counts', async () => {
    for (const band of Object.keys(EXPECT)) {
      await mount({ pathOpen: true }, { gradeLevel: GRADE[band] });
      expect(q('[data-areamodel-path]').getAttribute('data-areamodel-path')).toBe(band);
      expect(qa('[data-path-step]').map((li) => li.getAttribute('data-path-step'))).toEqual(EXPECT[band]);
      expect(qa('[data-path-done="true"]')).toHaveLength(0);
    }
    await mount({ basicSolved: 3, distSolved: 1, pathOpen: true }, { gradeLevel: GRADE.g3 });
    expect(qa('[data-path-step]').map((li) => li.getAttribute('data-path-done'))).toEqual(['true', 'true', 'true', 'false', 'false']);
    expect(q('[data-path-count]').textContent).toBe('3 of 5 done');
    expect(q('[data-path-step="g3_dist3"]').textContent).toContain('(1 of 3)');
    // The next step is the first one not done.
    expect(q('[data-path-go="g3_dist3"]').textContent).toBe('Start');
    expect(q('[data-path-go="g3_dist3"]').getAttribute('aria-label')).toContain('Start step 4');
    expect(errors).toEqual([]);
  });

  it('the buttons open the right tab and mode', async () => {
    let m = await mount({ pathOpen: true }, { gradeLevel: GRADE.g4 });
    await click(q('[data-path-go="g4_rem"]'));
    expect(m.latest.viewMode).toBe('word');
    expect(m.latest.wordKind).toBe('remainder');
    await click(q('[data-path-go="g4_div"]'));
    expect(q('[role="tabpanel"]').id).toBe('stem-areamodel-panel-division');
    m = await mount({ pathOpen: true }, { gradeLevel: GRADE.g6 });
    await click(q('[data-path-go="g6_signed"]'));
    expect(m.latest.algMode).toBe('factor');
    expect(m.latest.fac.signed).toBe(true);
    expect(q('[data-factor-mode]').getAttribute('data-factor-mode')).toBe('signed');
    expect(m.latest.fac.F.B < 0 || m.latest.fac.F.C < 0).toBe(true);
  });

  it('the path collapses, and a teacher can hide it from students', async () => {
    const m = await mount({}, { gradeLevel: GRADE.g5 });
    const tg = q('[data-path-toggle]');
    expect(tg.getAttribute('aria-expanded')).toBe('false');
    expect(q('[data-path-step]')).toBeNull();
    await click(tg);
    expect(m.latest.pathOpen).toBe(true);
    expect(qa('[data-path-step]')).toHaveLength(4);
    expect(q('[data-path-toggle]').getAttribute('aria-expanded')).toBe('true');
    await click(q('[data-path-toggle]'));
    expect(m.latest.pathOpen).toBe(false);
    expect(q('[data-path-step]')).toBeNull();
    expect(q('[data-path-toggle]').getAttribute('aria-expanded')).toBe('false');
    await mount({ teacher: { hidePath: true } }, { gradeLevel: GRADE.g5 });
    expect(q('[data-areamodel-path]')).toBeNull();
    await mount({ teacher: { hidePath: true } }, { gradeLevel: GRADE.g5, isTeacherMode: true });
    expect(q('[data-areamodel-path]')).toBeTruthy();
    expect(q('[data-teacher-control="showPath"]').checked).toBe(false);
  });

  it('a step whose tab the teacher hid is left out of the path', async () => {
    await mount({ pathOpen: true, teacher: { hidden: { division: true } } }, { gradeLevel: GRADE.g4 });
    expect(qa('[data-path-step]').map((li) => li.getAttribute('data-path-step'))).toEqual(['g4_partial', 'g4_algo', 'g4_rem']);
  });
});

describe('tabs ordered for the level', () => {
  it('core tabs come first, the rest under "More", and a first visit opens the first core tab', async () => {
    const order = () => qa('[role="tab"]').map((tb) => tb.id.replace('stem-areamodel-tab-', ''));
    await mount({}, { gradeLevel: GRADE.g3 });
    expect(order().slice(0, 3)).toEqual(['basic', 'distributive', 'word']);
    expect(q('[role="tabpanel"]').id).toBe('stem-areamodel-panel-basic');
    await mount({}, { gradeLevel: GRADE.g6 });
    expect(order().slice(0, 3)).toEqual(['algebra', 'grid100', 'word']);
    expect(order()).toHaveLength(9);
    expect(q('[role="tabpanel"]').id).toBe('stem-areamodel-panel-algebra');
    expect(q('[data-tab-more]')).toBeTruthy();
    expect(q('[data-tab-more]').getAttribute('aria-hidden')).toBe('true');
    await mount({}, { gradeLevel: GRADE.g4 });
    expect(order().slice(0, 4)).toEqual(['multidigit', 'algorithm', 'division', 'word']);
    // A saved tab still opens where the student left off.
    await mount({ viewMode: 'fraction' }, { gradeLevel: GRADE.g4 });
    expect(q('[role="tabpanel"]').id).toBe('stem-areamodel-panel-fraction');
  });

  it('arrow keys follow the visible order, across the More divider', async () => {
    const m = await mount({ viewMode: 'word' }, { gradeLevel: GRADE.g6 });
    await key(q('#stem-areamodel-tab-word'), 'ArrowRight');
    const firstMore = qa('[role="tab"]')[3].id.replace('stem-areamodel-tab-', '');
    expect(m.latest.viewMode).toBe(firstMore);
    await key(q('#stem-areamodel-tab-' + firstMore), 'Home');
    expect(m.latest.viewMode).toBe('algebra');
  });
});

describe('one behaviour across tabs', () => {
  it('a challenge never reveals itself: after three wrong tries the answer still waits for the button', async () => {
    const m = await mount({ viewMode: 'basic', dims: { rows: 7, cols: 8 }, challenge: { id: 'a3', a: 7, b: 8, answer: 56, mode: 'basic', question: 'q' } });
    for (const v of ['15', '30', '50']) { await type(q('[aria-label="Challenge answer"]'), v); await click(button('Check')); }
    expect(m.latest.chWork.revealed).toBe(false);
    expect(q('[data-revealed-answer]')).toBeNull();
    expect(hasNumber(56)).toBe(false);
    expect(q('[data-challenge-feedback]').textContent).toContain('Try again, use a hint, or show the answer (no points).');
    expect(m.latest.revealsUsed || 0).toBe(0);
    await click(q('[data-reveal-button]'));
    expect(q('[data-revealed-answer]')).toBeTruthy();
    expect(m.latest.score.correct).toBe(0);
  });

  it('reveals-off also covers the algorithm lines and the worked-example steps', async () => {
    await mount({ viewMode: 'algorithm', teacher: { noReveal: true }, algo: { a: 23, b: 14, tries: { 0: 2 }, code: { 0: 'algo_generic' } } });
    expect(q('[data-algo-show]')).toBeNull();
    expect(text()).toContain('Your teacher turned off answer reveals');
    await mount({ viewMode: 'algorithm', algo: { a: 23, b: 14, tries: { 0: 2 }, code: { 0: 'algo_generic' } } });
    expect(q('[data-algo-show]').textContent).toBe('Show this line (no points)');
    // Level 3: every step is blank; step 0 has been missed twice.
    const worked = { multidigit: { level: 3, seed: 77, results: { 0: 'box_generic' }, tries: { 0: 2 }, inputs: { 0: '1' } } };
    await mount({ viewMode: 'multidigit', teacher: { noReveal: true }, worked });
    expect(button('Show this step')).toBeUndefined();
    await mount({ viewMode: 'multidigit', worked });
    expect(button('Show this step')).toBeTruthy();
  });

  it('the algorithm tab has the same three-rung hint ladder, and no rung states the line', async () => {
    const m = await mount({ viewMode: 'algorithm', algo: { a: 23, b: 14 } });
    for (let i = 0; i < 4; i += 1) { const b = q('[data-algo-hint]'); if (!b.disabled) await click(b); }
    const lad = q('[data-hint-ladder]');
    expect(lad.getAttribute('data-hint-ladder')).toBe('3');
    expect(lad.textContent).toContain('Hint 3 of 3');
    expect(lad.textContent).toContain('20 × 4');
    expect(hasNumber(92, lad.textContent)).toBe(false);
    expect(q('[data-algo-hint]').disabled).toBe(true);
    expect(m.latest.hintsUsed).toBe(3);
  });

  it('every tab with hints uses the same ladder look', async () => {
    await mount({ viewMode: 'basic', dims: { rows: 7, cols: 8 }, challenge: { id: 'h1', a: 7, b: 8, answer: 56, mode: 'basic', question: 'q' } });
    await click(q('[data-hint-button]'));
    await mount({ viewMode: 'division', div: { n: 372, d: 6 } });
    await click(q('[data-div-hint]'));
    expect(q('[data-hint-ladder]').textContent).toContain('Hint 1 of 3');
    await mount({ viewMode: 'algebra', algMode: 'factor', fac: { F: { A: 1, B: 5, C: 6 }, p: 1, q: 1 } });
    await click(q('[data-fac-hint]'));
    expect(q('[data-hint-ladder]').textContent).toContain('Hint 1 of 3');
  });

  it('the same feedback style: a named mistake, then "Try again." after the first miss', async () => {
    await mount({ viewMode: 'division', div: { n: 372, d: 6 } });
    await type(q('[data-div-input="c"]'), '100');
    await type(q('[data-div-input="area"]'), '600');
    await type(q('[data-div-input="left"]'), '0');
    await click(q('[data-div-check]'));
    expect(q('[data-div-code]').textContent).toMatch(/Try a smaller chunk\. Try again\.$/);
    await mount({ viewMode: 'algebra', algMode: 'factor', fac: { F: { A: 1, B: 5, C: 6 }, p: 1, q: 5 } });
    await click(q('[data-fac-check]'));
    expect(q('[data-fac-code]').textContent).toMatch(/Try again\.$/);
  });
});

describe('quest labels are translated', () => {
  it('labels and progress read the translator of the last render', async () => {
    const tr = { 'stem.areamodel.quest_solve5': 'Resuelve 5 retos de área', 'stem.areamodel.quest_solve5_progress': '{n}/5 resueltos' };
    await mount({}, { t: (k, fb) => (tr[k] != null ? tr[k] : fb) });
    const hook = window.StemLab._registry.areamodel.questHooks.find((x) => x.id === 'solve_5');
    expect(hook.label).toBe('Resuelve 5 retos de área');
    expect(hook.progress({ score: { correct: 2 } })).toBe('2/5 resueltos');
    const ids = window.StemLab._registry.areamodel.questHooks.map((x) => x.id);
    expect(ids).toEqual(['solve_5', 'all_modes', 'streak_5', 'word_3']);
  });
});

describe('factoring with negative tiles, driven through the UI', () => {
  it('x² − x − 6: steppers skip 0, signs are named, zero pairs counted, credit once', async () => {
    const m = await mount({ viewMode: 'algebra', algMode: 'factor', fac: { signed: true, F: { A: 1, B: -1, C: -6 }, p: 1, q: 1 } });
    expect(q('[data-areamodel-focus] p').textContent).toBe('x² − x − 6 = ( ? )( ? )');
    expect(text()).not.toContain('(x + 2)(x − 3)');
    expect(text()).not.toContain('(x − 3)(x + 2)');
    await click(q('[data-fac-step="q-"]'));
    expect(q('[data-fac-value="q"]').textContent).toBe('−1');
    for (let i = 0; i < 2; i += 1) await click(q('[data-fac-step="q-"]'));
    expect(m.latest.fac.q).toBe(-3);
    // p = 2, q = -3 would be right; try the swapped signs first: p = -2, q = 3.
    await click(q('[data-fac-step="p-"]'));
    await click(q('[data-fac-step="p-"]'));
    expect(m.latest.fac.p).toBe(-2);
    // −3 to 3 is five clicks: the stepper skips 0.
    for (let i = 0; i < 5; i += 1) await click(q('[data-fac-step="q+"]'));
    expect(m.latest.fac.q).toBe(3);
    await click(q('[data-fac-check]'));
    expect(m.latest.fac.code).toBe('fac_s_signs_swapped');
    expect(q('[data-fac-code]').textContent).toContain('Right numbers, wrong signs');
    const tbl = q('[data-fac-table]').textContent;
    expect(tbl).toContain('zero pairs (worth 0)');
    // Negative tiles carry a minus sign, not only a colour: 2 negative x tiles + 6 negative units.
    expect(qa('[data-fac-tile="−"]')).toHaveLength(8);
    for (let i = 0; i < 4; i += 1) await click(q('[data-fac-step="p+"]'));
    expect(m.latest.fac.p).toBe(3);
    await click(q('[data-fac-step="p-"]'));
    for (let i = 0; i < 5; i += 1) await click(q('[data-fac-step="q-"]'));
    expect([m.latest.fac.p, m.latest.fac.q]).toEqual([2, -3]);
    await click(q('[data-fac-check]'));
    expect(m.latest.fac.done).toBe('solved');
    expect(m.latest.factorSolved).toBe(1);
    expect(m.latest.factorSignedSolved).toBe(1);
    expect(q('[data-fac-done]').textContent).toContain('x² − x − 6 = (x + 2)(x − 3)');
    expect(q('[data-fac-multiply]')).toBeNull();
    expect(m.award.mock.calls.filter((c) => c[0] === 'areamodel')).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it('the tile toggle starts a negative-tile expression; the teacher log names the sign mistake', async () => {
    const m = await mount({ viewMode: 'algebra', algMode: 'factor' });
    await click(q('[data-fac-signed="true"]'));
    expect(m.latest.fac.signed).toBe(true);
    expect(m.latest.fac.F.B < 0 || m.latest.fac.F.C < 0).toBe(true);
    await mount({ viewMode: 'algebra', algMode: 'factor', fac: { signed: true, F: { A: 1, B: -1, C: -6 }, p: 2, q: 3 } });
    const m2 = await mount({ viewMode: 'algebra', algMode: 'factor', fac: { signed: true, F: { A: 1, B: -1, C: -6 }, p: 2, q: 3 } });
    await click(q('[data-fac-check]'));
    expect(m2.latest.fac.code).toBe('fac_s_need_opposite');
    await mount(m2.latest, { isTeacherMode: true });
    expect(q('[data-teacher-misses]').textContent).toContain('Sign rule for the constant');
    void m;
  });

  it('a shown rectangle earns nothing; damaged signed saves fall back safely', async () => {
    const m = await mount({ viewMode: 'algebra', algMode: 'factor', fac: { signed: true, F: { A: 2, B: 1, C: -6 }, p: 1, q: 1, tries: 2 } });
    await click(q('[data-fac-show]'));
    expect(m.latest.fac.done).toBe('shown');
    expect(C.facCheckSigned({ A: 2, B: 1, C: -6 }, m.latest.fac.p, m.latest.fac.q)).toBe('ok');
    expect(m.latest.factorSignedSolved || 0).toBe(0);
    expect(m.award).not.toHaveBeenCalled();
    for (const fac of [{ signed: true, F: 'junk', p: 0, q: -99 }, { signed: true, F: { A: 1, B: 3, C: 0 } }, { signed: 'yes', F: { A: 1, B: -1, C: -6 } }]) {
      await mount({ viewMode: 'algebra', algMode: 'factor', fac });
      expect(q('[data-factor]')).toBeTruthy();
      expect(q('[data-fac-value="p"]').textContent).not.toBe('0');
    }
    expect(errors).toEqual([]);
  });
});

describe('remainder stories, driven through the UI', () => {
  const VANS = { id: 'rv', mode: 'word', wkind: 'remainder', rk: 'up', wctx: 0, n: 50, a: 6, answer: 9 };
  it('ignoring the context is named, the answer stays hidden, and the solved note explains the remainder', async () => {
    const m = await mount({ viewMode: 'word', challenge: VANS, wordKind: 'remainder' });
    expect(text()).toContain('50 students are going on a field trip. Each van holds 6 students.');
    expect(q('[data-areamodel-focus] p').textContent).toBe('50 ÷ 6 = ? R ?');
    expect(q('[data-remainder-story="up"]')).toBeTruthy();
    expect(text()).not.toContain('8 R 2');
    await type(q('[aria-label="Challenge answer"]'), '8');
    await click(button('Check'));
    expect(m.latest.feedback.code).toBe('r_dropped');
    expect(q('[data-challenge-feedback]').textContent).toContain('You ignored the context of the remainder');
    expect(hasNumber(9, q('[data-challenge-feedback]').textContent)).toBe(false);
    await type(q('[aria-label="Challenge answer"]'), '9');
    await click(button('Check'));
    expect(m.latest.remainderSolved).toBe(1);
    expect(m.latest.wordSolved).toBe(1);
    expect(q('[data-challenge-feedback]').textContent).toContain('50 ÷ 6 = 8 R 2. The 2 left over still need a place');
    expect(q('[data-areamodel-focus] p').textContent).toBe('50 ÷ 6 = 8 R 2. The story’s answer is 9.');
    // Never the false statement "50 ÷ 6 = 9".
    expect(text()).not.toContain('50 ÷ 6 = 9');
    await mount(m.latest, { isTeacherMode: true });
    expect(q('[data-teacher-misses]').textContent).toContain('Ignored the context: left the remainder out');
    expect(errors).toEqual([]);
  });

  it('a generated remainder story can be started from the story picker, and old saves are checked', async () => {
    const m = await mount({ viewMode: 'word', wordKind: 'remainder' }, { gradeLevel: GRADE.g4 });
    await click(button('New word problem'));
    expect(m.latest.challenge.wkind).toBe('remainder');
    expect(m.latest.challenge.n % m.latest.challenge.a).toBeGreaterThan(0);
    // A damaged remainder save (answer does not match the story) is dropped, not graded.
    await mount({ viewMode: 'word', challenge: Object.assign({}, VANS, { answer: 8 }) });
    expect(q('[data-challenge-card="active"]')).toBeNull();
    await mount({ viewMode: 'word', challenge: Object.assign({}, VANS, { rk: 'sideways' }) });
    expect(q('[data-challenge-card="active"]')).toBeNull();
  });
});

describe('division drawn to scale', () => {
  const DONE = { n: 372, d: 6, steps: [{ c: 60 }, { c: 2 }], phase: 'done' };
  it('offered once the division is done and the chunks are wide enough; widths are proportional', async () => {
    const m = await mount({ viewMode: 'division', div: { n: 372, d: 6, steps: [{ c: 60 }] } });
    expect(q('[data-div-scale]')).toBeNull();
    expect(text()).toContain('Finish the division to see it drawn to scale.');
    await mount({ viewMode: 'division', div: DONE });
    expect(q('[data-division-model] text') && text()).toContain('Not drawn to scale.');
    const b = q('[data-div-scale]');
    expect(b.getAttribute('aria-pressed')).toBe('false');
    const m2 = await mount({ viewMode: 'division', div: DONE });
    await click(q('[data-div-scale]'));
    expect(m2.latest.divScale).toBe(true);
    expect(q('[data-div-scaled]')).toBeTruthy();
    expect(q('[data-div-scale]').getAttribute('aria-pressed')).toBe('true');
    const w = qa('[data-div-scaled-chunk]').map((r) => Number(r.getAttribute('width')));
    expect(w).toHaveLength(2);
    expect(w[0] / w[1]).toBeCloseTo(30, 6);
    const hgt = Number(q('[data-div-scaled-chunk]').getAttribute('height'));
    expect(hgt / w[1]).toBeCloseTo(3, 6);
    expect(q('[data-div-scaled] desc').textContent).toContain('Drawn to scale');
    void m;
  });

  it('keeps the honest note when a chunk would be too thin', async () => {
    await mount({ viewMode: 'division', divScale: true, div: { n: 9876, d: 7, steps: [{ c: 1000 }, { c: 400 }, { c: 10 }], phase: 'done' } });
    expect(q('[data-div-scale]')).toBeNull();
    expect(q('[data-div-scaled]')).toBeNull();
    expect(text()).toContain('a chunk of 10 would be thinner than a line');
  });
});

describe('the memoised grid still works by mouse and keyboard', () => {
  it('a click highlights through the delegated handler; arrows move the one tab stop', async () => {
    const m = await mount({ viewMode: 'basic', dims: { rows: 4, cols: 6 } });
    await click(q('[data-cell="2-3"]'));
    expect(m.latest.highlight).toEqual({ rows: 3, cols: 4 });
    expect(q('[data-cell="2-3"]').getAttribute('aria-selected')).toBe('true');
    await key(q('[data-cell="2-3"]'), 'ArrowRight');
    expect(m.latest.gridFocus).toEqual({ r: 2, c: 4 });
    expect(qa('[role="gridcell"][tabindex="0"]').map((c) => c.getAttribute('data-cell'))).toEqual(['2-4']);
    await key(q('[data-cell="2-4"]'), 'Enter');
    expect(m.latest.highlight).toEqual({ rows: 3, cols: 5 });
  });
});

describe('everything mounts cleanly', () => {
  it('new states in light, dark, contrast and teacher mode, at every level', async () => {
    const seeds = [
      { viewMode: 'algebra', algMode: 'factor', fac: { signed: true, F: { A: 2, B: -7, C: 3 }, p: -1, q: -3, tries: 2, code: 'fac_s_net_x', v: { B: '−7', C: '3', pos: 0, neg: 7, net: '−7', u: '3' }, hints: 3 } },
      { viewMode: 'word', challenge: { id: 'r1', mode: 'word', wkind: 'remainder', rk: 'rem', wctx: 1, n: 50, a: 6, answer: 2 }, chWork: { key: 'r1', attempts: 2, hints: 3 } },
      { viewMode: 'division', divScale: true, div: { n: 372, d: 6, steps: [{ c: 60 }, { c: 2 }], phase: 'done' } },
      { viewMode: 'algorithm', algo: { a: 987, b: 65, hints: { 0: 2 }, tries: { 0: 2 }, code: { 0: 'algo_no_carry' } } },
      { pathClosed: 'junk', basicSolved: 'x', teacher: { hidePath: 'no' } },
      { pathOpen: 'junk', distSolved: -2, teacher: { hidden: 'x' } }
    ];
    for (const seed of seeds) for (const extra of [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true, gradeLevel: '8th Grade' }, { gradeLevel: '3rd Grade' }]) {
      await mount(seed, extra);
      expect(q('[role="tabpanel"]')).toBeTruthy();
    }
    expect(errors).toEqual([]);
  }, 30000);
});
