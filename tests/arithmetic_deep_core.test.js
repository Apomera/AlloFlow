// Arithmetic Strategy Studio deep pass (2026-11-03): estimates, inputs,
// generated practice, named errors, Error Detective balance, fading worked
// examples, standard-algorithm bridges and teacher hooks. Math is checked by
// running it against plain JavaScript arithmetic, not by reading source.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = 'stem_lab/stem_tool_arithmetic.js';
const ID = 'arithmeticStudio';
let root = null;

beforeEach(() => { resetStemLab(); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; });

function pure() { loadTool(FILE, ID); return window.ArithmeticStrategyPure; }

async function mount(initial, overrides) {
  const tool = loadTool(FILE, ID);
  const view = { awards: [], announcements: [], tools: [] };
  function App() {
    const [state, setState] = React.useState(initial);
    view.state = state;
    view.set = setState;
    return tool.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState,
      awardXP: (...args) => view.awards.push(args),
      announceToSR: (m) => view.announcements.push(m),
      setStemLabTool: (id) => view.tools.push(id),
    }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
  view.d = () => view.state._arithmeticStudio || {};
  view.rerender = async (patch) => React.act(async () => view.set((s) => ({ ...s, ...patch })));
  return view;
}
async function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function blur(input) { await React.act(async () => { input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); }); }
function button(label) {
  const el = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
  expect(el, label).toBeTruthy();
  return el;
}
async function click(el) { await React.act(async () => { el.click(); }); }
const numberInputs = () => [...document.querySelectorAll('input[type="number"]')];

describe('estimates accept any reasonable rounding strategy (review A, B)', () => {
  it('accepts natural estimates the old single-benchmark check rejected', () => {
    const P = pure();
    expect(P.assessEstimate('multiply', 23, 14, 200).reasonable).toBe(true);
    expect(P.assessEstimate('multiply', 23, 14, 280).reasonable).toBe(true);
    expect(P.assessEstimate('divide', 156, 12, 10).reasonable).toBe(true);
    expect(P.assessEstimate('divide', 156, 12, 15).reasonable).toBe(true);
    for (const e of [700, 800, 830, 900]) expect(P.assessEstimate('add', 368, 457, e).reasonable, String(e)).toBe(true);
    expect(P.assessEstimate('subtract', 73, 28, 40).reasonable).toBe(true);
    expect(P.assessEstimate('subtract', 73, 28, 50).reasonable).toBe(true);
  });

  it('accepts every stored practice estimate and the exact answer, and still rejects wild ones', () => {
    const P = pure();
    for (const p of P.practice) {
      if (!P.problemNeedsEstimate(p)) continue;
      expect(P.assessEstimate(p.op, p.a, p.b, p.estimate).reasonable, `${p.id} stored ${p.estimate}`).toBe(true);
      expect(P.assessEstimate(p.op, p.a, p.b, p.answer).reasonable, `${p.id} exact`).toBe(true);
      const exact = p.op === 'divide' ? p.a / p.b : p.answer;
      expect(P.assessEstimate(p.op, p.a, p.b, Math.round(exact * 3) + 10).reasonable, `${p.id} triple`).toBe(false);
    }
    expect(P.assessEstimate('add', 27, 35, 999).reasonable).toBe(false);
    expect(P.assessEstimate('multiply', 23, 14, 5000).reasonable).toBe(false);
    expect(P.assessEstimate('add', 27, 35, '').status).toBe('missing');
  });

  it('drops the estimate step for basic facts only', () => {
    const P = pure();
    const byId = Object.fromEntries(P.practice.map((p) => [p.id, p]));
    for (const id of ['m1', 'm2', 'd1']) expect(P.problemNeedsEstimate(byId[id]), id).toBe(false);
    for (const id of ['a1', 'm3', 'd2', 'd4', 's5']) expect(P.problemNeedsEstimate(byId[id]), id).toBe(true);
    for (const skill of ['add20', 'sub20', 'mulGroups', 'mul100', 'divShare', 'div100']) {
      expect(P.problemNeedsEstimate(P.generateProblem(skill, 3)), skill).toBe(false);
    }
    for (const skill of ['add100', 'mul2x2', 'divLong', 'addDec']) expect(P.problemNeedsEstimate(P.generateProblem(skill, 3)), skill).toBe(true);
  });
});

describe('generated practice never runs out and fits each grade band', () => {
  const close = (x, y) => Math.abs(x - y) < 1e-9;
  const dp = (x) => { const s = String(x); return s.includes('.') ? s.split('.')[1].length : 0; };

  it('maps host grade information to a band', () => {
    const P = pure();
    expect(P.bandFromCtx('k2', 'Kindergarten')).toBe('k2');
    expect(P.bandFromCtx('g35', '3rd Grade')).toBe('g3');
    expect(P.bandFromCtx('g35', '4th Grade')).toBe('g4');
    expect(P.bandFromCtx('g35', '5th Grade')).toBe('g5');
    expect(P.bandFromCtx('g68', '7th Grade')).toBe('g5');
    expect(P.bandFromCtx(undefined, '5th Grade')).toBe('g5');
    expect(P.bandFromCtx(undefined, '2nd Grade')).toBe('k2');
    for (const band of P.bands) for (const op of ['add', 'subtract', 'multiply', 'divide']) expect(P.skillsFor(band, op).length, band + op).toBeGreaterThan(0);
  });

  it('every skill gives correct, in-range problems for 400 seeds', () => {
    const P = pure();
    for (const skill of Object.keys(P.skills)) {
      const ids = new Set();
      for (let seed = 1; seed <= 400; seed++) {
        const p = P.generateProblem(skill, seed);
        ids.add(p.a + ':' + p.b);
        const { a, b } = p;
        const tag = `${skill} #${seed}: ${a} ${p.op} ${b} = ${p.answer} r ${p.remainder}`;
        expect(p, tag).toMatchObject({ skill, op: P.skills[skill].op });
        if (p.op === 'add') expect(close(p.answer, Math.round((a + b) * 100) / 100), tag).toBe(true);
        if (p.op === 'subtract') { expect(close(p.answer, Math.round((a - b) * 100) / 100), tag).toBe(true); expect(p.answer, tag).toBeGreaterThan(0); }
        if (p.op === 'multiply') expect(close(p.answer, Math.round(a * b * 10000) / 10000), tag).toBe(true);
        if (p.op === 'divide') {
          if (p.decimal) expect(close(Math.round(p.answer * b * 100) / 100, a), tag).toBe(true);
          else { expect(p.answer * b + p.remainder, tag).toBe(a); expect(p.remainder, tag).toBeLessThan(b); expect(p.remainder, tag).toBeGreaterThanOrEqual(0); }
        }
        if (skill === 'add20') expect(a + b, tag).toBeLessThanOrEqual(20);
        if (skill === 'add100') expect(a + b, tag).toBeLessThanOrEqual(99);
        if (skill === 'add1000') expect(a + b, tag).toBeLessThanOrEqual(999);
        if (skill === 'sub20') expect(a, tag).toBeLessThanOrEqual(20);
        if (skill === 'sub100') expect(a, tag).toBeLessThan(100);
        if (skill === 'sub1000') expect(a, tag).toBeLessThan(1000);
        if (skill === 'mulGroups') expect(Math.max(a, b), tag).toBeLessThanOrEqual(5);
        if (skill === 'mul100') expect(a * b, tag).toBeLessThanOrEqual(100);
        if (skill === 'mulMx1') { expect(b, tag).toBeLessThan(10); expect(a, tag).toBeGreaterThanOrEqual(10); }
        if (skill === 'mul2x2') { expect(String(a).length, tag).toBe(2); expect(String(b).length, tag).toBe(2); }
        if (skill === 'mulMulti') { expect(String(a).length, tag).toBe(3); expect(String(b).length, tag).toBe(2); }
        if (skill === 'div100' || skill === 'divShare') { expect(p.remainder, tag).toBe(0); expect(a, tag).toBeLessThanOrEqual(100); }
        if (skill === 'divRem') { expect(b, tag).toBeLessThan(10); expect(p.hasRemainder, tag).toBe(true); }
        if (skill === 'divLong') { expect(String(b).length, tag).toBe(2); expect(p.hasRemainder, tag).toBe(true); }
        if (skill === 'addDec' || skill === 'subDec') { expect(dp(a), tag).toBe(2); expect(dp(b), tag).toBe(1); }
        if (skill === 'divDec') expect(dp(a), tag).toBeGreaterThan(0);
        expect(P.generateProblem(skill, seed), tag).toEqual(p);
      }
      expect(ids.size, skill).toBeGreaterThan(P.skills[skill].fact || skill === 'mulTens' ? 10 : 200);
    }
  });

  it('includes remainders, internal quotient zeros and regrouping often enough to practise them', () => {
    const P = pure();
    const many = (skill, n = 300) => Array.from({ length: n }, (_, i) => P.generateProblem(skill, i + 1));
    expect(many('divRem').filter((p) => p.remainder > 0).length).toBeGreaterThan(150);
    expect(many('divLong').filter((p) => /\d0\d/.test(String(p.answer))).length).toBeGreaterThan(30);
    expect(many('sub100').filter((p) => p.a % 10 < p.b % 10).length).toBeGreaterThan(60);
    expect(many('add100').filter((p) => p.a % 10 + p.b % 10 >= 10).length).toBeGreaterThan(60);
  });
});

describe('named-error diagnosis', () => {
  it('names the classic misconceptions and stays quiet on right answers', () => {
    const P = pure();
    const cases = [
      ['subtract', 73, 28, 55, null, 'smaller_from_larger'],
      ['subtract', 502, 187, 425, null, 'no_decrement'],
      ['add', 58, 27, 715, null, 'no_regroup'],
      ['add', 58, 27, 75, null, 'no_regroup'],
      ['multiply', 345, 24, 1380, null, 'missing_partial'],
      ['multiply', 24, 13, 96, null, 'misaligned'],
      ['divide', 65, 6, 9, 11, 'remainder_big'],
      ['divide', 2496, 24, 14, 0, 'missing_zero'],
      ['add', 3.45, 12.7, 4.72, null, 'decimal_align'],
      ['multiply', 2.4, 6, 144, null, 'decimal_places'],
      ['multiply', 7, 8, 15, null, 'wrong_operation'],
      ['multiply', 7, 8, 49, null, 'one_group_off'],
      ['divide', 347, 8, 43, 5, 'remainder_wrong'],
    ];
    for (const [op, a, b, g, r, kind] of cases) expect(P.diagnoseAnswer(op, a, b, g, r), `${a} ${op} ${b} = ${g}`).toBe(kind);
    expect(P.diagnoseAnswer('subtract', 73, 28, 45)).toBeNull();
    expect(P.diagnoseAnswer('multiply', 345, 24, 8280)).toBeNull();
    expect(P.diagnoseAnswer('divide', 65, 6, 10, 5)).toBeNull();
  });

  it('decomposes 345 x 24 fully by place value (review F)', () => {
    const P = pure();
    const steps = P.strategySteps('multiply', 345, 24).join(' ');
    expect(steps).toContain('345 = 300 + 40 + 5');
    expect(steps).not.toContain('340');
    expect(P.multiplyRows(345, 24).map((r) => r.value)).toEqual([1380, 6900]);
  });
});

describe('Error Detective generated cases', () => {
  it('reproduce the named misconception and keep the answer choices balanced (review E)', () => {
    const P = pure();
    let keyLongest = 0, total = 0;
    const positions = new Set();
    for (const band of P.bands) {
      for (let index = 4; index < 64; index++) {
        const c = P.genErrorCase(band, index);
        total++;
        expect(new Set(c.order).size).toBe(3);
        expect(c.order).toContain(c.answer);
        positions.add(c.order.indexOf(c.answer));
        if (c.kind === 'remainder_big') {
          expect(c.wrongQ * c.b + c.wrongR).toBe(c.a);
          expect(c.wrongR).toBeGreaterThanOrEqual(c.b);
          expect(P.diagnoseAnswer('divide', c.a, c.b, c.wrongQ, c.wrongR)).toBe('remainder_big');
        } else {
          expect(c.wrong, c.id).not.toBe(c.correct);
          expect(P.diagnoseAnswer(c.op, c.a, c.b, c.wrong, c.op === 'divide' ? 0 : null), `${c.id} ${c.a} ${c.op} ${c.b} = ${c.wrong}`).toBe(c.kind);
        }
      }
    }
    // Render the English labels and measure the length cue.
    resetStemLab();
    loadTool(FILE, ID);
    for (const band of ['g4', 'g5']) {
      for (let index = 4; index < 24; index++) {
        document.body.innerHTML = renderTool(ID, { _arithmeticStudio: { tab: 'errors', errorIndex: index, genBand: band } });
        const choices = [...document.querySelectorAll('[data-error-choice]')];
        const caseId = document.querySelector('[data-error-case-id]').getAttribute('data-error-case-id');
        const key = P.genErrorCase(band, index).answer;
        const lens = choices.map((c) => c.textContent.length);
        const keyLen = choices.find((c) => c.getAttribute('data-error-choice') === key).textContent.length;
        expect(Math.max(...lens) / Math.min(...lens), caseId).toBeLessThanOrEqual(1.2);
        if (lens.filter((l) => l >= keyLen).length === 1) keyLongest++;
      }
    }
    expect(positions.size).toBe(3);
    expect(keyLongest / 40).toBeLessThanOrEqual(0.5);
    expect(total).toBe(240);
  });

  it('no classic case gives its answer away as the longest option', () => {
    const P = pure();
    for (let i = 0; i < 4; i++) {
      const c = P.classicErrorCase(i);
      const keyLen = c.choices.find((x) => x.id === c.answer).label.length;
      const others = c.choices.filter((x) => x.id !== c.answer).map((x) => x.label.length);
      expect(keyLen > Math.max(...others), c.id).toBe(false);
    }
    expect(new Set([0, 1, 2, 3].map((i) => { const c = P.classicErrorCase(i); return c.choices.findIndex((x) => x.id === c.answer); })).size).toBeGreaterThan(1);
  });
});

describe('worked examples and algorithm bridges', () => {
  it('every worked example step is arithmetically right and fades one step at a time', () => {
    const P = pure();
    for (const op of ['add', 'subtract', 'multiply', 'divide']) {
      for (let round = 0; round < 15; round++) {
        for (let stage = 0; stage < 4; stage++) {
          const ex = P.workedExample(op, round, stage);
          const s = ex.steps;
          if (op === 'add') { expect(s[0].ans + s[1].ans).toBe(ex.a + ex.b); expect(s[2].ans).toBe(ex.a + ex.b); }
          if (op === 'subtract') { expect(s[0].vals.x + s[0].ans).toBe(ex.a); expect(s[0].ans).toBeGreaterThanOrEqual(10); expect(s[3].ans).toBe(ex.a - ex.b); expect(s[1].ans + s[2].ans).toBe(ex.a - ex.b); }
          if (op === 'multiply') { expect(s[0].ans + s[1].ans).toBe(ex.a * ex.b); expect(s[2].ans).toBe(ex.a * ex.b); }
          if (op === 'divide') { expect(s[4].ans * ex.b + s[3].ans).toBe(ex.a); expect(s[3].ans).toBeLessThan(ex.b); }
          expect(P.blankCount(stage, s.length)).toBe([0, 1, 2, s.length][stage]);
        }
      }
    }
  });

  it('computes carries, regroups and long-division steps', () => {
    const P = pure();
    const add = P.columnAddition(58, 67);
    expect(add.carryPlaces).toEqual([1, 2]);
    expect(add.colSums).toEqual([15, 12]);
    const sub = P.columnSubtraction(402, 186);
    expect(sub.difference).toBe(216);
    expect(sub.top).toEqual([12, 9, 3]);
    expect(sub.events).toEqual([{ from: 2, to: 1 }, { from: 1, to: 0 }]);
    expect(P.longDivisionSteps(157, 12)).toEqual([{ cur: 15, qd: 1, prod: 12, rem: 3 }, { cur: 37, qd: 3, prod: 36, rem: 1 }]);
    expect(P.longDivisionSteps(2496, 24).map((s) => s.qd).join('')).toBe('104');
  });
});

describe('learn workspace inputs (review C, D, F, G)', () => {
  it('lets the divisor be cleared and retyped without jumping to 1', async () => {
    const view = await mount({ _arithmeticStudio: { operation: 'divide', a: 84, b: 6 } });
    await type(numberInputs()[1], '');
    expect(numberInputs()[1].value).toBe('');
    expect(view.d().b).toBe(6);
    expect(document.body.textContent).toContain('Type a whole number');
    await type(numberInputs()[1], '7');
    expect(numberInputs()[1].value).toBe('7');
    expect(view.d().b).toBe(7);
    await type(numberInputs()[1], '0');
    expect(view.d().b).toBe(7);
    expect(document.body.textContent).toContain('The divisor must be at least 1');
    await blur(numberInputs()[1]);
    expect(numberInputs()[1].value).toBe('7');
  });

  it('keeps the second subtraction number while the first is retyped', async () => {
    const view = await mount({ _arithmeticStudio: { operation: 'subtract', a: 58, b: 27 } });
    await type(numberInputs()[0], '');
    expect(view.d()).toMatchObject({ a: 58, b: 27 });
    await type(numberInputs()[0], '9');
    expect(view.d()).toMatchObject({ a: 9, b: 27 });
    expect(document.querySelector('[data-subtract-invalid]')).toBeTruthy();
    await type(numberInputs()[0], '93');
    expect(view.d()).toMatchObject({ a: 93, b: 27 });
    expect(document.querySelector('[data-subtract-invalid]')).toBeNull();
  });

  it('draws only the places the subtraction needs', () => {
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, { _arithmeticStudio: { operation: 'subtract', a: 58, b: 50 } });
    expect([...document.querySelectorAll('[data-place]')].map((n) => n.getAttribute('data-place'))).toEqual(['10', '1']);
  });

  it('draws every place-value partial for 345 x 24 and bridges to the algorithm', () => {
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, { _arithmeticStudio: { operation: 'multiply', a: 345, b: 24 } });
    const parts = [...document.querySelectorAll('[data-partial-product]')].map((n) => Number(n.getAttribute('data-partial-product')));
    expect(parts).toEqual([6000, 1200, 800, 160, 100, 20]);
    expect(parts.reduce((s, n) => s + n, 0)).toBe(8280);
    expect([...document.querySelectorAll('[data-partial-label]')].map((n) => n.textContent)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    const bridge = document.querySelector('[data-algorithm-bridge="multiply"]');
    expect(bridge.textContent).toContain('345 × 4 = 1380');
    expect(bridge.textContent).toContain('B + D + F');
    expect(bridge.textContent).toContain('A + C + E');
    expect(bridge.textContent).toContain('345 × 20 = 6900');
  });

  it('gives the dark-mode array dots at least 3:1 contrast', () => {
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, { _arithmeticStudio: { operation: 'multiply', a: 7, b: 8 } }, { isDark: true });
    const dot = document.querySelector('[data-array-dot]');
    const hex = getComputedStyle(dot).backgroundColor || dot.style.background;
    const rgb = (s) => (s.startsWith('#') ? [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)) : s.match(/\d+/g).slice(0, 3).map(Number));
    const lum = (c) => { const v = c.map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const ratio = (x, y) => { const [l1, l2] = [lum(rgb(x)), lum(rgb(y))].sort((p, q) => q - p); return (l1 + 0.05) / (l2 + 0.05); };
    expect(ratio(dot.style.background, '#1e293b')).toBeGreaterThanOrEqual(3);
    expect(hex).toBeTruthy();
  });
});

describe('practice: estimate first, named errors, second try, reveal without credit', () => {
  it('asks for the estimate before the answer and shows the student their own estimate', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'practice', operation: 'multiply', level: 2 } });
    expect(document.querySelector('[data-practice-problem-id="m3"]')).toBeTruthy();
    let [est, ans] = numberInputs();
    expect(ans.disabled).toBe(true);
    await type(est, '5000');
    await click(document.querySelector('[data-lock-estimate]'));
    expect(view.d().estimateStatus).toBe('far');
    expect(numberInputs()[1].disabled).toBe(true);
    await type(numberInputs()[0], '200');
    await click(document.querySelector('[data-lock-estimate]'));
    expect(view.d()).toMatchObject({ estimateStatus: 'ok', estimateLocked: true });
    expect(document.querySelector('[data-estimate-status="ok"]').textContent).toContain('Your estimate: 200');
    [est, ans] = numberInputs();
    expect(est.disabled).toBe(true);
    expect(ans.disabled).toBe(false);
    await type(ans, '322');
    await click(button('Check answer'));
    expect(view.d().practiceSolved.m3).toBe(true);
    expect(view.awards).toHaveLength(1);
    expect(document.querySelector('[data-estimate-echo]').textContent).toContain('Your estimate was 200. The exact answer is 322, a difference of 122.');
    // Revisit: the student's own estimate comes back, not the stored 300.
    await click(button('Next problem'));
    await click(document.querySelector('[data-arithmetic-level="2"]').parentElement.querySelector('[data-arithmetic-level="1"]'));
    await click(document.querySelector('[data-arithmetic-level="2"]'));
    expect(numberInputs().map((i) => i.value)).toEqual(['200', '322']);
  });

  it('names the mistake, gives a second try, then reveals without points', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'practice', operation: 'subtract', level: 1 } });
    expect(document.querySelector('[data-practice-problem-id="s1"]')).toBeTruthy();
    await type(numberInputs()[0], '40');
    await click(document.querySelector('[data-lock-estimate]'));
    await type(numberInputs()[1], '55');
    await click(button('Check answer'));
    expect(document.querySelector('[data-named-error]').getAttribute('data-named-error')).toBe('smaller_from_larger');
    expect(document.body.textContent).toContain('smaller digit from the larger');
    expect(document.body.textContent).not.toContain('45');
    expect(view.d().feedback).toBe('try');
    await type(numberInputs()[1], '35');
    await click(button('Check answer'));
    // Stage C: no auto-reveal; after two tries the answer is shown on demand.
    expect(view.d().feedback).toBe('try');
    expect(document.querySelector('[data-practice-revealed]')).toBeNull();
    expect(document.body.textContent).not.toContain('The answer is 45');
    await click(button('Show the answer'));
    expect(view.d().feedback).toBe('revealed');
    expect(document.querySelector('[data-practice-revealed]').textContent).toContain('The answer is 45');
    expect(button('Check answer').disabled).toBe(true);
    expect(view.d().practiceRevealedIds.s1).toBe(true);
    expect(view.d().missLog.at(-1)).toMatchObject({ id: 's1', kind: expect.any(String), revealed: true });
    expect(view.awards).toHaveLength(0);
    // Retrying the missed item counts the solve, but the reveal means no XP.
    await click(button('Next problem'));
    await click(button('Retry missed (1)'));
    expect(document.querySelector('[data-practice-problem-id="s1"]')).toBeTruthy();
    await type(numberInputs()[0], '40');
    await click(document.querySelector('[data-lock-estimate]'));
    await type(numberInputs()[1], '45');
    await click(button('Check answer'));
    expect(view.d().practiceSolved.s1).toBe(true);
    expect(view.awards).toHaveLength(0);
    expect(document.body.textContent).toContain('earns no points');
  });

  it('runs endless generated practice for the grade band and credits each new item once', async () => {
    const tool = loadTool(FILE, ID);
    const P = window.ArithmeticStrategyPure;
    const view = await mount({ _arithmeticStudio: { tab: 'practice', operation: 'divide' } }, { gradeBand: 'g35', gradeLevel: '4th Grade' });
    expect(document.querySelector('[data-arithmetic-band="g4"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-arithmetic-skill="divRem"]').getAttribute('aria-pressed')).toBe('true');
    const seen = new Set();
    for (let i = 0; i < 3; i++) {
      const id = document.querySelector('[data-practice-problem-id]').getAttribute('data-practice-problem-id');
      seen.add(id);
      const p = P.generateProblem(id.split('-')[0], Number(id.split('-')[1]));
      await type(numberInputs()[0], String(Math.round(p.a / p.b)));
      await click(document.querySelector('[data-lock-estimate]'));
      await type(numberInputs()[1], String(p.answer));
      await type(numberInputs()[2], String(p.remainder));
      await click(button('Check answer'));
      expect(view.d().genSolved[id], id).toBe(true);
      await click(button('Next problem'));
    }
    expect(seen.size).toBe(3);
    expect(view.awards).toHaveLength(3);
    expect(view.awards.every((a) => a[0] === 'arithmeticStudio' && a[1] === 2)).toBe(true);
    expect(tool.questHooks.find((q) => q.id === 'practice_5').progress(view.d())).toBe('3/5 correct');
    expect(tool.questHooks.find((q) => q.id === 'all_operations').progress(view.d())).toBe('1/4 operations');
    for (let i = 0; i < 25; i++) { await click(button('Next problem')); seen.add(document.querySelector('[data-practice-problem-id]').getAttribute('data-practice-problem-id')); }
    expect(seen.size).toBe(28);
  });

  it('accepts decimal answers for decimal skills', async () => {
    const P = pure();
    const p = P.generateProblem('addDec', 5);
    const view = await mount({ _arithmeticStudio: { tab: 'practice', operation: 'add', genBand: 'g5', genSkill: 'addDec', genSeed: 5 } });
    await type(numberInputs()[0], String(Math.round(p.a + p.b)));
    await click(document.querySelector('[data-lock-estimate]'));
    expect(view.d().estimateStatus).toBe('ok');
    await type(numberInputs()[1], P.fmtNum(p.answer));
    await click(button('Check answer'));
    expect(view.d().genSolved[p.id]).toBe(true);
  });
});

describe('Error Detective: second try, reveal, generated cases', () => {
  it('gives a hint first, reveals on the second miss and moves on to generated cases', async () => {
    const tool = loadTool(FILE, ID);
    const view = await mount({ _arithmeticStudio: { tab: 'errors', errorIndex: 0 } });
    await click(document.querySelector('[data-error-choice="place"]'));
    expect(document.body.textContent).toContain('Hint: Look at the ones column');
    await click(document.querySelector('[data-error-choice="operation"]'));
    // Stage C: the two tried choices are ruled out and the answer is shown on demand.
    expect(view.d().errorFeedback).toBe('try');
    expect(document.querySelector('[data-error-choice="place"]').disabled).toBe(true);
    expect(document.querySelector('[data-error-choice="regroup"]').disabled).toBe(false);
    await click(button('Show the answer'));
    expect(view.d().errorFeedback).toBe('revealed');
    expect(document.querySelector('[data-error-choice="regroup"]').getAttribute('aria-pressed')).toBe('true');
    expect([...document.querySelectorAll('[data-error-choice]')].every((b) => b.disabled)).toBe(true);
    expect(view.awards).toHaveLength(0);
    for (let i = 0; i < 4; i++) await click(button('Next mistake'));
    const caseEl = document.querySelector('[data-error-case-id]');
    expect(caseEl.getAttribute('data-error-case-id')).toMatch(/^ge-g5-4$/);
    const key = window.ArithmeticStrategyPure.genErrorCase('g5', 4).answer;
    await click(document.querySelector(`[data-error-choice="${key}"]`));
    expect(view.d().errorSolvedCases['ge-g5-4']).toBe(true);
    expect(view.awards).toHaveLength(1);
    expect(tool.questHooks.find((q) => q.id === 'error_detective').progress(view.d())).toBe('1/3 mistakes');
    await click(button('Retry missed (1)'));
    expect(view.d().errorIndex).toBe(0);
  });
});

describe('fading worked examples (mounted)', () => {
  it('moves from a fully worked example to one with a blank the student fills', async () => {
    const view = await mount({ _arithmeticStudio: { operation: 'add' } });
    let section = document.querySelector('[data-worked-example]');
    expect(section.getAttribute('data-worked-blanks')).toBe('0');
    await click(button('Next example'));
    section = document.querySelector('[data-worked-example]');
    expect(section.getAttribute('data-worked-blanks')).toBe('1');
    expect(button('Next example').disabled).toBe(true);
    const ex = window.ArithmeticStrategyPure.workedExample('add', 0, 1);
    const blank = section.querySelector('input[type="number"]');
    await type(blank, String(ex.steps[2].ans + 1));
    await click(button('Check my steps'));
    expect(view.d().weFeedback).toBe('try');
    await type(document.querySelector('[data-worked-example] input'), String(ex.steps[2].ans));
    await click(button('Check my steps'));
    expect(view.d().weFeedback).toBe('correct');
    await click(button('Next example'));
    expect(document.querySelector('[data-worked-example]').getAttribute('data-worked-blanks')).toBe('2');
  });
});

describe('teacher hooks', () => {
  it('shows controls only to teachers and applies them to the student view', async () => {
    loadTool(FILE, ID);
    expect(renderTool(ID, { _arithmeticStudio: {} })).not.toContain('data-arithmetic-teacher');
    const view = await mount({ _arithmeticStudio: { tab: 'practice', operation: 'divide' } }, { isTeacherMode: true });
    expect(document.querySelector('[data-arithmetic-teacher]')).toBeTruthy();
    await click(document.querySelector('[data-teacher-op="divide"]'));
    expect(view.d().teacher.ops).toEqual(['add', 'subtract', 'multiply']);
    expect(document.querySelector('[aria-label="Choose an operation"]').textContent).not.toContain('Division');
    await click(document.querySelector('[data-teacher-band="g3"]'));
    await click(document.querySelector('[data-teacher-lock-band]'));
    await click(document.querySelector('[data-teacher-reveals]'));
    expect(view.d().teacher).toMatchObject({ band: 'g3', lockBand: true, reveals: false });
    // A student sees the locked band, no band buttons and no teacher panel.
    await React.act(async () => root.unmount()); root = null;
    document.body.innerHTML = '<div id="root"></div>';
    const student = await mount({ _arithmeticStudio: { ...view.d(), tab: 'practice', operation: 'add' } });
    expect(document.querySelector('[data-arithmetic-teacher]')).toBeNull();
    expect(document.querySelector('[data-arithmetic-band]')).toBeNull();
    expect(document.body.textContent).toContain('Your teacher set the grade band: Grade 3.');
    expect([...document.querySelectorAll('[data-arithmetic-skill]')].map((b) => b.getAttribute('data-arithmetic-skill'))).toEqual(['add1000']);
    // With reveals off, two misses do not show the answer.
    const id = document.querySelector('[data-practice-problem-id]').getAttribute('data-practice-problem-id');
    const p = window.ArithmeticStrategyPure.generateProblem('add1000', Number(id.split('-')[1]));
    await type(numberInputs()[0], String(p.answer));
    await click(document.querySelector('[data-lock-estimate]'));
    for (const wrong of [p.answer + 1, p.answer + 2]) { await type(numberInputs()[1], String(wrong)); await click(button('Check answer')); }
    expect(student.d().feedback).toBe('try');
    expect(document.querySelector('[data-practice-revealed]')).toBeNull();
    expect(student.d().missLog).toHaveLength(1);
  });

  it('summarises missed items by likely error for the teacher', async () => {
    await mount({ _arithmeticStudio: { missLog: [
      { src: 'practice', id: 's1', op: 'subtract', a: 73, b: 28, given: '55', kind: 'smaller_from_larger', revealed: false },
      { src: 'practice', id: 'm4', op: 'multiply', a: 47, b: 26, given: '423', kind: 'missing_partial', revealed: true },
      { src: 'errors', id: 'e1', op: 'add', prompt: 'A learner says 58 + 27 = 715.', given: 'place', kind: 'diagnosis', revealed: false },
    ] } }, { isTeacherMode: true });
    const table = document.querySelector('[data-teacher-missed]');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(table.textContent).toContain('73 − 28');
    expect(table.textContent).toContain('Smaller digit from larger');
    expect(table.textContent).toContain('Missing partial product');
    expect(table.textContent).toContain('aligned incorrectly');
    await click(button('Clear the list'));
    await click(button('Yes, clear it'));
    expect(document.querySelector('[data-teacher-missed]')).toBeNull();
  });
});

describe('cross-links, accessibility, i18n and old saves', () => {
  it('links to the Multiplication Table and Area Model tools', async () => {
    const view = await mount({ _arithmeticStudio: {} });
    await click(document.querySelector('[data-arithmetic-link="multtable"]'));
    await click(document.querySelector('[data-arithmetic-link="areamodel"]'));
    expect(view.tools).toEqual(['multtable', 'areamodel']);
  });

  it('gives every button a 44 px minimum height in every tab', () => {
    loadTool(FILE, ID);
    for (const tab of ['learn', 'practice', 'errors', 'apply']) {
      document.body.innerHTML = renderTool(ID, { _arithmeticStudio: { tab, operation: 'divide', a: 157, b: 12 } }, { isTeacherMode: true });
      const small = [...document.querySelectorAll('button')].filter((b) => !/min-height:\s*44px/.test(b.getAttribute('style') || ''));
      expect(small.map((b) => b.textContent), tab).toEqual([]);
    }
  });

  it('sends every visible word through t()', async () => {
    loadTool(FILE, ID);
    const leftovers = new Set();
    const states = [];
    for (const tab of ['learn', 'practice', 'errors', 'apply']) {
      for (const operation of ['add', 'subtract', 'multiply', 'divide']) {
        states.push({ tab, operation, a: operation === 'multiply' ? 345 : 157, b: operation === 'multiply' ? 24 : 12, showSteps: true, showPracticeHint: true, showWordPlan: true, errorIndex: tab === 'errors' ? 6 : 0 });
      }
    }
    states.push({ tab: 'practice', operation: 'subtract', level: 1, practiceProblemId: 's1', estimateInput: '40', estimateLocked: true, estimateStatus: 'ok', answerInput: '55', feedback: 'try', practiceTry: 1, practiceErrorKind: 'smaller_from_larger' });
    states.push({ tab: 'errors', errorIndex: 0, errorChoice: 'place', errorFeedback: 'try', errorTries: 1, errorTriesFor: 'e1' });
    for (const s of states) {
      document.body.innerHTML = renderTool(ID, { _arithmeticStudio: s }, { t: () => '§', isTeacherMode: true });
      const textOut = document.body.textContent;
      textOut.split('§').forEach((seg) => {
        const cleaned = seg.replace(/[\d\s.,:;()+\-−×÷=?/'"→←|]+/g, ' ').trim();
        cleaned.split(/\s+/).filter((w) => /[A-Za-z]{2,}/.test(w) && !/^[A-Z]+$/.test(w)).forEach((w) => leftovers.add(w));
      });
    }
    expect([...leftovers]).toEqual([]);
  });

  it('uses only literal translation keys', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    const calls = [...src.matchAll(/\bt\(([^,)]*)/g)].map((m) => m[1].trim()).filter((arg) => arg && arg !== 'key');
    const dynamic = calls.filter((arg) => !/^'stem\.arithmetic\.[a-z0-9_]+'$/.test(arg));
    expect(dynamic).toEqual([]);
    // One English fallback per key, so central registration has no conflicts.
    const fallbacks = {};
    for (const m of src.matchAll(/\bt\('(stem\.arithmetic\.[a-z0-9_]+)',\s*'((?:[^'\\]|\\.)*)'\)/g)) {
      (fallbacks[m[1]] = fallbacks[m[1]] || new Set()).add(m[2]);
    }
    expect(Object.keys(fallbacks).length).toBeGreaterThan(250);
    expect(Object.entries(fallbacks).filter(([, set]) => set.size > 1).map(([key]) => key)).toEqual([]);
  });

  it('loads old saves and hostile state without crashing', () => {
    loadTool(FILE, ID);
    const olds = [
      { _arithmeticStudio: { tab: 'practice', operation: 'add', level: 2, practiceIndex: 1, practiceSolved: { a3: true }, attempts: 4, correct: 1, errorIndex: 3, errorSolvedCases: { e1: true } } },
      { _arithmeticStudio: { tab: 'errors', errorIndex: 'x', teacher: 'nope', missLog: 'bad', genSolved: null, we: 5 } },
      { _arithmeticStudio: 'not an object' },
      { _arithmeticStudio: { tab: 'learn', operation: 'divide', a: -5, b: 0, aDraft: 7, teacher: { ops: [], band: 'zz', lockBand: true } } },
      { _arithmeticStudio: { tab: 'practice', practiceSource: 'generated', genSkill: 'bogus', genSeed: -3, genBand: 'g9' } },
    ];
    for (const state of olds) {
      for (const overrides of [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true }]) {
        const html = renderTool(ID, state, overrides);
        expect(html).toContain('Arithmetic Strategy Studio');
        expect(html).not.toMatch(/NaN|undefined|\[object Object\]/);
      }
    }
  });

  it('mounts every tab and mode with no console errors', async () => {
    const errors = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.join(' ')));
    const warn = vi.spyOn(console, 'warn').mockImplementation((...args) => errors.push(args.join(' ')));
    try {
      for (const tab of ['learn', 'practice', 'errors', 'apply']) {
        for (const overrides of [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true }]) {
          for (const operation of ['add', 'subtract', 'multiply', 'divide']) {
            const view = await mount({ _arithmeticStudio: { tab, operation, a: 345, b: 24 } }, overrides);
            expect(view.d).toBeTruthy();
            await React.act(async () => root.unmount());
            root = null;
            document.body.innerHTML = '<div id="root"></div>';
          }
        }
      }
    } finally { spy.mockRestore(); warn.mockRestore(); }
    expect(errors.slice(0, 5)).toEqual([]);
  });
});
