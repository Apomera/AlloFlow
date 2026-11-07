// Area Model stage B (2026-11-03): division as a missing factor with partial
// quotients and a long-division bridge, factoring with algebra tiles, the hundred
// grid (decimals and percents), real-world stories at every grade, and a live AI
// hint that degrades to the built-in hint. The math runs; the UI is driven.
//
// AREAMODEL_STAGEB_SRC points the suite at another copy (mutation check: the
// stage-A copy must turn these red).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.AREAMODEL_STAGEB_SRC || 'stem_lab/stem_tool_areamodel.js';
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
  vi.useRealTimers();
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
const button = (label) => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === label || b.textContent.trim() === label);
async function type(el, value) {
  const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
async function click(el) { await React.act(async () => { el.click(); }); }
function seq(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
async function divStep(c, area, left) {
  await type(q('[data-div-input="c"]'), String(c));
  await type(q('[data-div-input="area"]'), String(area));
  await type(q('[data-div-input="left"]'), String(left));
  await click(q('[data-div-check]'));
}

describe('division core: partial quotients and long division', () => {
  it('generated divisions are exact (n = q × d + r, r < d) and scale with the grade level', () => {
    const r = seq(11);
    let saw4by1 = false, saw2digitDivisor = false, g3Max = 0, g3Rem = 0;
    for (const band of ['g3', 'g4', 'g5', 'g6']) for (const diff of ['easy', 'medium', 'hard']) {
      for (let i = 0; i < 60; i += 1) {
        const p = C.divGen(band, diff, r);
        expect(p.n).toBe(p.q * p.d + p.r);
        expect(p.r).toBeLessThan(p.d);
        expect(p.r).toBeGreaterThanOrEqual(0);
        expect(p.n).toBeLessThanOrEqual(9999);
        expect(p.d).toBeGreaterThanOrEqual(2);
        if (band === 'g4' && p.n >= 1000 && p.d < 10) saw4by1 = true;
        if (band === 'g5' && p.d >= 10) saw2digitDivisor = true;
        if (band === 'g3') { g3Max = Math.max(g3Max, p.n); g3Rem = Math.max(g3Rem, p.r); }
      }
    }
    expect(saw4by1).toBe(true);
    expect(saw2digitDivisor).toBe(true);
    expect(g3Rem).toBe(0);
    expect(g3Max).toBeLessThanOrEqual(225);
    for (const band of ['g3', 'g4', 'g5', 'g6']) expect(C.divGen(band, 'hard', () => 0.999999).n).toBeLessThanOrEqual(9999);
  });

  it('long division: each digit is a place-value chunk, the chunks add to the quotient, every line leaves less than the divisor', () => {
    for (let n = 2; n <= 9999; n += 97) for (const d of [2, 3, 6, 7, 9, 12, 25, 48]) {
      if (d > n) continue;
      const ld = C.longDiv(n, d);
      expect(ld.q).toBe(Math.floor(n / d));
      const chunkSum = ld.steps.reduce((s, st) => s + st.chunk, 0);
      const areaSum = ld.steps.reduce((s, st) => s + st.chunkArea, 0);
      expect(chunkSum).toBe(ld.q);
      expect(areaSum + ld.r).toBe(n);
      ld.steps.forEach((st) => { expect(st.rem).toBeLessThan(d); expect(st.prod).toBe(st.digit * d); });
      expect(Number(ld.steps.map((st) => st.digit).join(''))).toBe(ld.q);
      // Replaying long division's chunks as partial quotients leaves exactly the remainder.
      const rp = C.divReplay(n, d, ld.steps.filter((st) => st.digit).map((st) => st.chunk));
      expect(rp.left).toBe(ld.r);
      expect(rp.sum).toBe(ld.q);
    }
  });

  it('names the four division misconceptions', () => {
    // 372 ÷ 6 with 372 left: a chunk of 100 (600) is too big.
    expect(C.divStep(372, 6, 100, 600, -228)).toBe('div_chunk_too_big');
    expect(C.divStep(372, 6, 50, 300, 82)).toBe('div_subtract_wrong');
    expect(C.divStep(372, 6, 50, 300, 672)).toBe('div_left_added');
    expect(C.divStep(372, 6, 50, 56, 316)).toBe('div_area_added');
    expect(C.divStep(372, 6, 50, 30, 342)).toBe('div_area_pv');
    expect(C.divStep(372, 6, 50, 300, 72)).toBe('ok');
    // Partial quotients not added.
    expect(C.divFinal([50, 10, 2], 6, 0, 2, 0)).toBe('div_not_added');
    expect(C.divFinal([50, 10, 2], 6, 0, 3, 0)).toBe('div_counted_chunks');
    expect(C.divFinal([50, 10, 2], 6, 0, 372, 0)).toBe('div_added_areas');
    // Remainder larger than the divisor.
    expect(C.divFinal([50, 12], 6, 3, 62, 9)).toBe('div_remainder_too_big');
    expect(C.divFinal([50, 12], 6, 3, 62, 4)).toBe('div_r_wrong');
    expect(C.divFinal([50, 12], 6, 3, 62, 3)).toBe('ok');
    expect(C.divFinal([50, 12], 6, 0, 62, NaN)).toBe('ok');
    expect(C.ldDiagnose(C.longDiv(372, 6).steps[0], 6, 7)).toBe('div_chunk_too_big');
    expect(C.ldDiagnose(C.longDiv(372, 6).steps[0], 6, 5)).toBe('ld_left_too_big');
    expect(C.ldDiagnose(C.longDiv(372, 6).steps[0], 6, 6)).toBe('ok');
  });

  it('the shown chunk is the biggest place-value chunk that fits', () => {
    expect(C.divBestChunk(372, 6)).toBe(60);
    expect(C.divBestChunk(12, 6)).toBe(2);
    expect(C.divBestChunk(5, 6)).toBe(0);
    for (let left = 6; left < 3000; left += 37) {
      const c = C.divBestChunk(left, 6);
      expect(c * 6).toBeLessThanOrEqual(left);
      expect(c).toBeGreaterThan(0);
    }
  });
});

describe('hundred grid, factoring and story cores', () => {
  it('hundred-grid answers are exact and the named mistakes match the misconception', () => {
    const dec = { mode: 'grid100', kind: 'dec', a: 0.3, b: 0.4, answer: 0.12 };
    expect(C.grade(dec, '0.12').correct).toBe(true);
    expect(C.grade(dec, '.12').correct).toBe(true);
    expect(['0.7', '0.58', '12', '1.2', '0.012', '0.5'].map((x) => C.grade(dec, x).code)).toEqual(['g_added', 'g_union', 'g_count', 'g_decimal_big', 'g_decimal_small', 'g_bigger']);
    const pct = { mode: 'grid100', kind: 'pct', a: 0.3, b: 0.4, answer: 12 };
    expect(C.grade(pct, '12%').correct).toBe(true);
    expect(C.grade(pct, '12').correct).toBe(true);
    expect(['0.12', '70', '58', '1200'].map((x) => C.grade(pct, x).code)).toEqual(['g_pct_as_decimal', 'g_added', 'g_union', 'g_pct_not_scaled']);
    const r = seq(3);
    for (const band of ['g3', 'g4', 'g5', 'g6']) for (const diff of ['easy', 'medium', 'hard']) for (let i = 0; i < 30; i += 1) {
      const g = C.gen('grid100', band, diff, r);
      expect(g.a).toBeLessThan(1); expect(g.b).toBeLessThan(1);
      expect(C.grade(g, C.fmt(g.answer) + (g.kind === 'pct' ? '%' : '')).correct).toBe(true);
      if (band !== 'g6') expect(g.kind).toBe('dec');
    }
  });

  it('factoring: every generated expression has a rectangle the steppers reach, and the mistakes are named', () => {
    const r = seq(5);
    for (const diff of ['easy', 'medium', 'hard']) for (let i = 0; i < 80; i += 1) {
      const F = C.facGen(diff, r);
      const sols = C.facSolutions(F).filter((s) => s.p <= 12 && s.q <= 12);
      expect(sols.length).toBeGreaterThan(0);
      sols.forEach((s) => {
        // The rectangle really is the expression: (A x + p)(x + q) expands to A x² + B x + C.
        const e = C.algExpand({ x: F.A, c: s.p }, { x: 1, c: s.q });
        expect([e.A, e.B, e.C]).toEqual([F.A, F.B, F.C]);
      });
      if (diff === 'hard') expect(F.A).toBe(2); else expect(F.A).toBe(1);
    }
    const F = { A: 1, B: 5, C: 6 };
    expect(C.facCheck(F, 2, 3)).toBe('ok');
    expect(C.facCheck(F, 3, 2)).toBe('ok');
    expect(C.facCheck(F, 1, 5)).toBe('fac_swapped');
    expect(C.facCheck(F, 5, 6)).toBe('fac_coefficients');
    expect(C.facCheck(F, 1, 6)).toBe('fac_x_count');
    expect(C.facCheck(F, 4, 1)).toBe('fac_units');
    expect(C.facCheck(F, 4, 4)).toBe('fac_both');
  });

  it('stories: every grade gets its own kinds, and every story grades its own answer', () => {
    const r = seq(9);
    const seen = { g3: new Set(), g4: new Set(), g5: new Set(), g6: new Set() };
    for (const band of ['g3', 'g4', 'g5', 'g6']) for (const diff of ['easy', 'medium', 'hard']) for (let i = 0; i < 60; i += 1) {
      const s = C.genStory(band, diff, r);
      expect(s.mode).toBe('word');
      seen[band].add(s.wkind || 'array');
      const sa = C.storyAs(s);
      const right = sa.mode === 'algebra' ? C.grade(s, '', { A: String(s.answer.A), B: String(s.answer.B), C: String(s.answer.C) })
        : sa.mode === 'fraction' ? C.grade(s, s.answer.num + '/' + s.answer.den)
          : C.grade(s, C.fmt(Number(s.answer)) + (sa.mode === 'grid100' ? '%' : ''));
      expect(right.correct, JSON.stringify(s)).toBe(true);
      if (s.wkind === 'missing') expect(s.n).toBe(s.a * s.answer);
    }
    expect([...seen.g3].sort()).toEqual(['area', 'array', 'missing']);
    expect([...seen.g6]).toEqual(expect.arrayContaining(['percent', 'algebra', 'decimal']));
    expect(seen.g3.has('percent') || seen.g3.has('algebra') || seen.g3.has('decimal')).toBe(false);
    // A missing-side story names multiplying instead of dividing.
    expect(C.grade({ mode: 'word', wkind: 'missing', a: 6, n: 372, answer: 62 }, String(372 * 6)).code).toBe('w_multiplied');
    expect(C.grade({ mode: 'word', wkind: 'missing', a: 6, n: 372, answer: 62 }, '366').code).toBe('w_subtracted');
    // A whole-number area story still names the perimeter.
    expect(C.grade({ mode: 'word', wkind: 'area', a: 6, b: 8, answer: 48 }, '28').code).toBe('perimeter');
  });
});

describe('the Division tab, driven through the UI', () => {
  it('chunks, named mistakes, the remainder rule, partial quotients added, then long division line by line', async () => {
    const m = await mount({ viewMode: 'division', div: { n: 372, d: 6 } });
    expect(q('[role="tabpanel"]').id).toBe('stem-areamodel-panel-division');
    expect(q('[data-areamodel-focus] p').textContent).toBe('372 ÷ 6 = ?');
    expect(hasNumber(62)).toBe(false);
    expect(q('[data-division-model] desc').textContent).toContain('The other side is unknown');
    await divStep(100, 600, 0);
    expect(m.latest.div.code).toBe('div_chunk_too_big');
    expect(text()).toContain('That chunk is too big: 100 groups of 6 is more than the 372 you have left');
    await divStep(50, 300, 82);
    expect(m.latest.div.code).toBe('div_subtract_wrong');
    await divStep(50, 300, 72);
    expect(m.latest.div.steps).toEqual([{ c: 50 }]);
    await divStep(10, 60, 12);
    // Stopping with 12 left: the remainder would be larger than the divisor.
    await click(q('[data-div-finish]'));
    expect(m.latest.div.code).toBe('div_remainder_too_big');
    expect(text()).toContain('The remainder must be smaller than the divisor. 12 is left');
    await divStep(2, 12, 0);
    await click(q('[data-div-finish]'));
    expect(m.latest.div.phase).toBe('final');
    expect(hasNumber(62)).toBe(false);
    await type(q('[data-div-final="q"]'), '2');
    await click(q('[data-div-final-check]'));
    expect(m.latest.div.finCode).toBe('div_not_added');
    expect(text()).toContain('The quotient is all the partial quotients added together');
    await type(q('[data-div-final="q"]'), '62');
    await click(q('[data-div-final-check]'));
    expect(m.latest.div.phase).toBe('done');
    expect(m.latest.divisionSolved).toBe(1);
    expect(m.award.mock.calls.filter((c) => c[0] === 'areamodel')).toHaveLength(1);
    expect(q('[data-areamodel-focus] p').textContent).toBe('372 ÷ 6 = 62 R 0');
    // Long division: 37 ÷ 6.
    expect(q('[data-ld-step="0"]').getAttribute('data-ld-state')).toBe('current');
    await type(q('#am-ld-input'), '7');
    await click(q('[data-ld-check]'));
    expect(m.latest.div.ld.code[0]).toBe('div_chunk_too_big');
    await type(q('#am-ld-input'), '5');
    await click(q('[data-ld-check]'));
    expect(m.latest.div.ld.code[0]).toBe('ld_left_too_big');
    await type(q('#am-ld-input'), '6');
    await click(q('[data-ld-check]'));
    expect(q('[data-ld-step="0"]').textContent).toContain('The 6 is in the tens place, a chunk of 60: 60 × 6 = 360.');
    await type(q('#am-ld-input'), '2');
    await click(q('[data-ld-check]'));
    expect(m.latest.longDivSolved).toBe(1);
    expect(q('[data-ld-done]').textContent).toContain('Long division took the chunks 60 + 2 = 62. Your chunks were 50 + 10 + 2 = 62.');
    // Finishing twice earns nothing more.
    expect(m.award.mock.calls.filter((c) => c[0] === 'areamodel')).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it('a shown chunk ends the problem without credit, and a remainder is checked', async () => {
    const m = await mount({ viewMode: 'division', div: { n: 375, d: 6 } });
    await divStep(100, 600, 0);
    await divStep(90, 540, 0);
    await click(q('[data-div-show]'));
    expect(m.latest.div.aided).toBe(true);
    expect(q('[data-div-input="c"]').value).toBe('60');
    await click(q('[data-div-check]'));
    await divStep(2, 12, 3);
    await click(q('[data-div-finish]'));
    await type(q('[data-div-final="q"]'), '62');
    await type(q('[data-div-final="r"]'), '4');
    await click(q('[data-div-final-check]'));
    expect(m.latest.div.finCode).toBe('div_r_wrong');
    await type(q('[data-div-final="r"]'), '3');
    await click(q('[data-div-final-check]'));
    expect(m.latest.div.phase).toBe('done');
    expect(m.latest.divisionSolved || 0).toBe(0);
    expect(m.award).not.toHaveBeenCalled();
    expect(text()).toContain('You used a shown step');
  });

  it('with reveals off, no division or factoring step can be shown', async () => {
    await mount({ viewMode: 'division', teacher: { noReveal: true }, div: { n: 372, d: 6, tries: 3 } });
    expect(q('[data-div-show]')).toBeNull();
    await mount({ viewMode: 'division', teacher: { noReveal: true }, div: { n: 372, d: 6, steps: [{ c: 62 }], phase: 'final', finTries: 3 } });
    expect(q('[data-div-final-show]')).toBeNull();
    await mount({ viewMode: 'algebra', algMode: 'factor', teacher: { noReveal: true }, fac: { F: { A: 1, B: 5, C: 6 }, p: 1, q: 1, tries: 3 } });
    expect(q('[data-fac-show]')).toBeNull();
    expect(q('[data-fac-hint]')).toBeTruthy();
  });

  it('the teacher log names division mistakes, and a hidden Division tab is hidden', async () => {
    const m = await mount({ viewMode: 'division', div: { n: 372, d: 6 } });
    await divStep(100, 600, 0);
    await mount(m.latest, { isTeacherMode: true });
    expect(q('[data-teacher-misses]').textContent).toContain('Chunk too big');
    await mount({ teacher: { hidden: { division: true } } });
    expect(q('#stem-areamodel-tab-division')).toBeNull();
  });

  it('damaged division saves replay safely', async () => {
    for (const div of [{ n: 'x', d: null, steps: 'no' }, { n: 50, d: 99 }, { n: 372, d: 6, steps: [{ c: 100 }, { c: 50 }], phase: 'done' }, { n: 372, d: 6, steps: [50, { c: 10 }, { c: -3 }], ld: 5, fin: 'q' }]) {
      const m = await mount({ viewMode: 'division', div });
      expect(q('[data-division-model]')).toBeTruthy();
      expect(m.latest.div === div).toBe(true);
    }
    const m = await mount({ viewMode: 'division', div: { n: 372, d: 6, steps: [{ c: 100 }, { c: 50 }], phase: 'done' } });
    // The too-big chunk ends the replay, so nothing counts as done.
    expect(q('[data-div-phase="chunks"]')).toBeTruthy();
    expect(text()).toContain('Step 1: 372 is left.');
    expect(errors).toEqual([]);
    void m;
  });
});

describe('factoring with algebra tiles (grade 8 and up)', () => {
  it('arrange x² + 5x + 6 into a rectangle; swapped sum and product is named; credit once', async () => {
    const m = await mount({ viewMode: 'algebra', algMode: 'factor', fac: { F: { A: 1, B: 5, C: 6 }, p: 1, q: 1 } });
    expect(q('[data-factor]')).toBeTruthy();
    expect(text()).not.toContain('(x + 2)(x + 3)');
    expect(text()).not.toContain('(x + 3)(x + 2)');
    expect(q('[data-areamodel-focus] p').textContent).toBe('x² + 5x + 6 = ( ? )( ? )');
    // p = 1, q = 5: 1 × 5 = 5 and 1 + 5 = 6, the jobs swapped.
    for (let i = 0; i < 4; i += 1) await click(q('[data-fac-step="q+"]'));
    expect(q('[data-fac-value="q"]').textContent).toBe('5');
    await click(q('[data-fac-check]'));
    expect(m.latest.fac.code).toBe('fac_swapped');
    expect(text()).toContain('multiply to the constant term and add to the x term');
    await click(q('[data-fac-step="p+"]'));
    for (let i = 0; i < 2; i += 1) await click(q('[data-fac-step="q-"]'));
    await click(q('[data-fac-check]'));
    expect(m.latest.fac.done).toBe('solved');
    expect(m.latest.factorSolved).toBe(1);
    expect(text()).toContain('x² + 5x + 6 = (x + 2)(x + 3)');
    expect(m.award.mock.calls.filter((c) => c[0] === 'areamodel')).toHaveLength(1);
    await click(q('[data-fac-multiply]'));
    expect(m.latest.algMode).toBe('multiply');
    expect(m.latest.alg.f1).toEqual({ x: 1, c: 2 });
    expect(q('[data-areamodel-focus] p').textContent).toBe('(x + 2)(x + 3) = x² + 5x + 6');
    expect(errors).toEqual([]);
  });

  it('every stepper is a named button of at least 44 px, and a shown rectangle earns nothing', async () => {
    const m = await mount({ viewMode: 'algebra', algMode: 'factor', fac: { F: { A: 2, B: 8, C: 6 }, p: 1, q: 1 } });
    const steps = [...document.querySelectorAll('[data-fac-step]')];
    expect(steps).toHaveLength(4);
    steps.forEach((b) => { expect(b.getAttribute('aria-label')).toMatch(/side/); expect(parseInt(b.style.minHeight, 10)).toBeGreaterThanOrEqual(44); });
    await click(q('[data-fac-check]'));
    await click(q('[data-fac-check]'));
    await click(q('[data-fac-show]'));
    expect(m.latest.fac.done).toBe('shown');
    expect(m.latest.factorSolved || 0).toBe(0);
    expect(m.award).not.toHaveBeenCalled();
    expect(C.facCheck({ A: 2, B: 8, C: 6 }, m.latest.fac.p, m.latest.fac.q)).toBe('ok');
  });

  it('an open multiplication challenge on the Algebra tab locks factor mode', async () => {
    await mount({ viewMode: 'algebra', algMode: 'factor', challenge: { id: 'g', mode: 'algebra', f1: { x: 1, c: 3 }, f2: { x: 1, c: 2 }, answer: { A: 1, B: 5, C: 6 } } });
    expect(q('[data-factor]')).toBeNull();
    expect(q('[data-alg-mode="factor"]').disabled).toBe(true);
  });
});

describe('the Hundred Grid tab', () => {
  it('a decimal challenge hides the product, names added and union mistakes, and counts the solve', async () => {
    const m = await mount({ viewMode: 'grid100', challenge: { id: 'h1', mode: 'grid100', kind: 'dec', a: 0.3, b: 0.4, answer: 0.12 } });
    expect(q('[data-g100-model]')).toBeTruthy();
    expect(document.querySelectorAll('[data-g100-cell="both"]')).toHaveLength(12);
    expect(hasNumber('0.12')).toBe(false);
    expect(q('[data-g100-both]').textContent).toBe('?');
    const ans = q('[aria-label="Challenge answer"]');
    await type(ans, '0.7');
    await click(button('Check'));
    expect(m.latest.feedback.code).toBe('g_added');
    await type(ans, '0.58');
    await click(button('Check'));
    expect(m.latest.feedback.code).toBe('g_union');
    expect(text()).toContain('the squares where the two shadings overlap');
    await type(ans, '0.12');
    await click(button('Check'));
    expect(m.latest.feedback.correct).toBe(true);
    expect(m.latest.grid100Solved).toBe(1);
    expect(q('[data-g100-both]').textContent).toBe('12 of 100');
  });

  it('explore with predict-first: the product waits for a committed prediction', async () => {
    const m = await mount({ viewMode: 'grid100', predictFirst: true, g100: { a: 6, b: 5, as: 'pct' } });
    expect(q('[data-areamodel-focus] p').textContent).toBe('60% × 50% = ?');
    expect(q('[data-g100-both]').textContent).toBe('?');
    expect(q('[data-g100-model]').parentNode.textContent).not.toContain('30%');
    await type(q('#am-predict'), '110%');
    await click(q('[data-predict-check]'));
    expect(m.latest.pred).toMatchObject({ ok: false, code: 'g_added' });
    expect(q('[data-areamodel-focus] p').textContent).toBe('60% × 50% = 30%');
  });

  it('the grid opens the same product in Partial Products', async () => {
    const m = await mount({ viewMode: 'grid100', g100: { a: 3, b: 4 } });
    await click(q('[data-g100-bridge]'));
    expect(m.latest.viewMode).toBe('multidigit');
    expect(m.latest.multiDims).toEqual({ a: 0.3, b: 0.4 });
    expect(q('[data-areamodel-focus] p').textContent).toBe('0.3 × 0.4 = 0.12');
  });
});

describe('real-world stories at every grade, never leaking the answer', () => {
  it('each story kind renders its model and the page never shows the answer while the challenge is open', async () => {
    const r = seq(21);
    for (const band of ['g3', 'g4', 'g5', 'g6']) {
      for (const kind of C.STORY_KINDS[band]) {
        const s = C.genStory(band, 'medium', r, kind);
        s.id = 'st-' + band + kind;
        await mount({ viewMode: 'word', challenge: s, band });
        // Everything about this problem: the hero, the story and its model, and the challenge card.
        const card = q('[data-challenge-card="active"]').textContent;
        const page = [q('[data-areamodel-focus] p').textContent, (q('[data-story]') || q('[data-areamodel-focus]')).textContent, card,
          [...document.querySelectorAll('svg desc')].map((d) => d.textContent).join(' ')].join(' ').replace(/\s+/g, ' ');
        if (kind === 'fraction') expect(page).not.toContain(s.answer.num + '/' + s.answer.den);
        else if (kind === 'algebra') expect(page).not.toContain(C.polyStr(s.answer.A, s.answer.B, s.answer.C));
        else {
          const givens = [s.a, s.b, s.n, s.p1, s.p2].filter((v) => v != null).map(String);
          const ans = C.fmt(Number(s.answer));
          if (!givens.includes(ans)) expect(hasNumber(ans, page), band + ' ' + kind + ' ' + JSON.stringify(s)).toBe(false);
        }
        expect(card.length).toBeGreaterThan(20);
        if (kind !== 'array') expect(q('[data-story="' + kind + '"]')).toBeTruthy();
      }
    }
    expect(errors).toEqual([]);
  // Stage C adds the remainder kind at grades 4 to 6 (3 more mounts) and the learning path.
  }, 20000);

  it('a missing-side story at grade 4: wrong operation named, then solved; Next keeps the story type', async () => {
    const m = await mount({ viewMode: 'word', wordKind: 'missing' }, { gradeLevel: '4th Grade' });
    await click(button('New word problem'));
    const ch = m.latest.challenge;
    expect(ch.wkind).toBe('missing');
    expect(ch.question).toContain(String(ch.n));
    expect(ch.question).toContain(String(ch.a));
    expect(q('[data-areamodel-focus] p').textContent).toBe(ch.n + ' ÷ ' + ch.a + ' = ?');
    const ans = q('[aria-label="Challenge answer"]');
    await type(ans, String(ch.n * ch.a));
    await click(button('Check'));
    expect(m.latest.feedback.code).toBe('w_multiplied');
    expect(text()).toContain('divide to find the missing side');
    await type(ans, String(ch.answer));
    await click(button('Check'));
    expect(m.latest.feedback.correct).toBe(true);
    expect(m.latest.wordSolved).toBe(1);
    await click(button('Next Challenge'));
    expect(m.latest.challenge.wkind).toBe('missing');
    expect(m.latest.challenge.id).not.toBe(ch.id);
  });

  it('a story modelled on the Division tab earns no division credit of its own', async () => {
    const m = await mount({ viewMode: 'word', challenge: { id: 'w1', mode: 'word', wkind: 'missing', wctx: 1, a: 6, n: 72, answer: 12 } });
    await click(q('[data-story-open="division"]'));
    expect(m.latest.viewMode).toBe('division');
    expect(m.latest.div).toMatchObject({ n: 72, d: 6, fromWord: true });
    await divStep(12, 72, 0);
    await click(q('[data-div-finish]'));
    await type(q('[data-div-final="q"]'), '12');
    await click(q('[data-div-final-check]'));
    expect(m.latest.div.phase).toBe('done');
    expect(m.latest.divisionSolved || 0).toBe(0);
    expect(m.award).not.toHaveBeenCalled();
  });

  it('a percent story accepts 12% and names adding the percents', async () => {
    const m = await mount({ viewMode: 'word', challenge: { id: 'w2', mode: 'word', wkind: 'percent', wctx: 0, p1: 30, p2: 40, a: 0.3, b: 0.4, answer: 12 } });
    expect(q('[data-g100-model]')).toBeTruthy();
    expect(text()).toContain('30% of a garden is planted with vegetables');
    const ans = q('[aria-label="Challenge answer"]');
    await type(ans, '70%');
    await click(button('Check'));
    expect(m.latest.feedback.code).toBe('g_added');
    await type(ans, '12%');
    await click(button('Check'));
    expect(m.latest.feedback.correct).toBe(true);
  });

  it('an algebra story takes coefficients', async () => {
    const m = await mount({ viewMode: 'word', challenge: { id: 'w3', mode: 'word', wkind: 'algebra', wctx: 0, f1: { x: 1, c: 3 }, f2: { x: 1, c: 2 }, answer: { A: 1, B: 5, C: 6 } } });
    expect(text()).toContain('A rectangular patio is (x + 3) meters long and (x + 2) meters wide');
    await type(q('[data-coef-input="A"]'), '1');
    await type(q('[data-coef-input="B"]'), '5');
    await type(q('[data-coef-input="C"]'), '6');
    await click(button('Check'));
    expect(m.latest.feedback.correct).toBe(true);
  });

  it('invalid saved stories are dropped instead of crashing', async () => {
    for (const challenge of [{ mode: 'word', wkind: 'missing', a: 6, n: 73, answer: 12 }, { mode: 'word', wkind: 'percent', p1: 300 }, { mode: 'word', wkind: 'zzz', a: 3, b: 4, answer: 12 }, { mode: 'grid100', kind: 'dec', a: 3, b: 0.4, answer: 1.2 }]) {
      await mount({ viewMode: 'word', challenge });
      expect(q('[data-challenge-card="active"]')).toBeNull();
    }
    expect(errors).toEqual([]);
  });
});

describe('live AI hint: through the guarded host helper, with a built-in fallback', () => {
  const OPEN = { viewMode: 'basic', dims: { rows: 7, cols: 8 }, challenge: { id: 'ai1', a: 7, b: 8, answer: 56, mode: 'basic', question: 'q' }, chWork: { key: 'ai1', attempts: 2, hints: 0, boxes: {}, counted: true, lastWrong: '15' } };

  it('shows the AI hint the host sends back, and passes the question, the wrong answer, the answer for the reveal check and the attempts', async () => {
    const getHint = vi.fn((tool, question, wrong, correct, attempts, cb) => cb('💡 Count one row first. — AI hint, may be imperfect.'));
    const m = await mount(OPEN, { getHint, aiHintsEnabled: true });
    await click(q('[data-ai-hint-button]'));
    expect(getHint).toHaveBeenCalledTimes(1);
    expect(getHint.mock.calls[0].slice(0, 5)).toEqual(['areamodel', 'What is 7 × 8? Count the squares in the array.', '15', '56', 2]);
    expect(q('[data-ai-hint="ai"]').textContent).toContain('Count one row first');
    expect(m.announce).toHaveBeenCalledWith('💡 Count one row first. — AI hint, may be imperfect.');
    // One AI hint per question: the button goes away.
    expect(q('[data-ai-hint-button]')).toBeNull();
  });

  it('falls back to the built-in hint when the host throws or answers with nothing', async () => {
    await mount(OPEN, { getHint: () => { throw new Error('offline'); }, aiHintsEnabled: true });
    await click(q('[data-ai-hint-button]'));
    expect(q('[data-ai-hint="fallback"]').textContent).toBe('The AI hint is not available right now, so here is a built-in hint: Count one row first: it has 8 squares.');
    await mount(OPEN, { getHint: (a, b, c, d, e, cb) => cb(''), aiHintsEnabled: true });
    await click(q('[data-ai-hint-button]'));
    expect(q('[data-ai-hint="fallback"]')).toBeTruthy();
  });

  it('falls back after a wait when the host stays silent, and a late AI answer still replaces it', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let late = null;
    await mount(OPEN, { getHint: (a, b, c, d, e, cb) => { late = cb; }, aiHintsEnabled: true });
    await click(q('[data-ai-hint-button]'));
    expect(q('[data-ai-hint="loading"]')).toBeTruthy();
    expect(document.querySelector('#root [role="status"][data-ai-hint]')).toBeNull();
    await React.act(async () => { vi.advanceTimersByTime(12500); });
    expect(q('[data-ai-hint="fallback"]')).toBeTruthy();
    await React.act(async () => { late('Think of 7 rows of 8.'); });
    expect(q('[data-ai-hint="ai"]').textContent).toBe('Think of 7 rows of 8.');
  });

  it('a late answer for an old challenge cannot overwrite the next challenge’s work', async () => {
    let late = null;
    const m = await mount(OPEN, { getHint: (a, b, c, d, e, cb) => { late = cb; }, aiHintsEnabled: true });
    // Found by its text, so the stage-A copy (no data attribute) runs this test too.
    await click(button('Ask the AI for a hint'));
    await click(button('Skip this one'));
    await click(button('Grid Challenge'));
    const id = m.latest.challenge.id;
    await type(q('[aria-label="Challenge answer"]'), '1');
    await click(button('Check'));
    expect(m.latest.chWork).toMatchObject({ key: id, attempts: 1 });
    await React.act(async () => { late('Old hint.'); });
    expect(m.latest.chWork).toMatchObject({ key: id, attempts: 1 });
    expect(text()).not.toContain('Old hint.');
  });

  it('no AI button when the teacher turned AI hints off or the host has no AI', async () => {
    await mount(OPEN, { getHint: vi.fn(), aiHintsEnabled: false });
    expect(q('[data-ai-hint-button]')).toBeNull();
    await mount(OPEN, { getHint: vi.fn(), aiHintsEnabled: true, aiAvailable: false });
    expect(q('[data-ai-hint-button]')).toBeNull();
    await mount(OPEN, {});
    expect(q('[data-ai-hint-button]')).toBeNull();
    expect(q('[data-hint-button]')).toBeTruthy();
  });

  it('the Division step and the factoring task use the same guarded hint', async () => {
    const getHint = vi.fn((t0, question, wrong, correct, attempts, cb) => cb('AI: estimate with 10 groups.'));
    await mount({ viewMode: 'division', div: { n: 372, d: 6, tries: 2, code: 'div_chunk_too_big', v: { c: 100, d: 6, left: 372 } } }, { getHint, aiHintsEnabled: true });
    await click(q('[data-ai-hint-button]'));
    expect(getHint.mock.calls[0][1]).toContain('Divide 372 by 6');
    expect(getHint.mock.calls[0][3]).toBe('62');
    expect(q('[data-ai-hint="ai"]')).toBeTruthy();
    await mount({ viewMode: 'algebra', algMode: 'factor', fac: { F: { A: 1, B: 5, C: 6 }, p: 1, q: 1, tries: 2 } }, { getHint, aiHintsEnabled: true });
    await click(q('[data-ai-hint-button]'));
    expect(getHint.mock.calls[1][1]).toContain('Factor x² + 5x + 6');
  });
});

describe('new tabs mount cleanly everywhere', () => {
  it('Division, Hundred Grid and factoring in light, dark, contrast and teacher mode, with worked examples', async () => {
    const seeds = [{ viewMode: 'division' }, { viewMode: 'grid100' }, { viewMode: 'grid100', g100: { as: 'pct' } }, { viewMode: 'algebra', algMode: 'factor' }, { viewMode: 'word', wordKind: 'percent' },
      { viewMode: 'division', div: { n: 372, d: 6, steps: [{ c: 60 }, { c: 2 }], phase: 'done' } }, { viewMode: 'algebra', algMode: 'factor', fac: { F: 'junk', p: 99, q: -4, done: 'solved' } }, { viewMode: 'grid100', g100: { a: 'x', b: 44 } }];
    for (const seed of seeds) for (const extra of [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true, gradeLevel: '8th Grade' }]) {
      await mount(seed, extra);
      expect(q('[role="tabpanel"]').id).toBe('stem-areamodel-panel-' + seed.viewMode);
    }
    await mount({ viewMode: 'division' });
    expect(q('[data-worked-mode="division"]')).toBeTruthy();
    await mount({ viewMode: 'grid100' });
    expect(q('[data-worked-mode="grid100"]')).toBeTruthy();
    expect(errors).toEqual([]);
  // 34 full mounts: stage C's learning path adds DOM, and jsdom under a loaded machine passes 5 s.
  }, 20000);

  it('the worked division example fades: its last step is a blank the student fills', async () => {
    const m = await mount({ viewMode: 'division' });
    const sec = () => q('[data-worked-mode="division"]');
    await click(sec().querySelector('[data-worked-next]'));
    const blanks = [...sec().querySelectorAll('[data-worked-input]')];
    expect(blanks).toHaveLength(1);
    const prompt = blanks[0].closest('li').textContent;
    const chunks = prompt.match(/Add the chunks ([\d +]+) for the quotient/)[1].split('+').map((x) => Number(x.trim()));
    const qv = chunks.reduce((s, c) => s + c, 0);
    if (chunks.length > 1) {
      await type(blanks[0], String(chunks[0]));
      await click(sec().querySelector('[data-worked-check]'));
      expect(Object.values(m.latest.worked.division.results)).toContain('div_not_added');
    }
    await type(sec().querySelector('[data-worked-input]'), String(qv));
    await click(sec().querySelector('[data-worked-check]'));
    expect(m.latest.worked.division.done).toBe('advance');
  });
});
