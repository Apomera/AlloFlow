// Arithmetic Strategy Studio stage B (2026-11-03): mental-math number talks,
// bar-model word problems, decimal operations with base-ten disks, read-aloud
// and AI hints. Math is checked by running it against plain arithmetic.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// ARITH_STAGEB_FILE lets the gates be run against an older copy to prove they fail on it.
const FILE = process.env.ARITH_STAGEB_FILE || 'stem_lab/stem_tool_arithmetic.js';
const ID = 'arithmeticStudio';
let root = null;

beforeEach(() => { resetStemLab(); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; });

function pure() { loadTool(FILE, ID); return window.ArithmeticStrategyPure; }

async function mount(initial, overrides) {
  const tool = loadTool(FILE, ID);
  const view = { awards: [], announcements: [], tools: [], spoken: [] };
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
  return view;
}
async function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function choose(select, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  await React.act(async () => { setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); });
}
function button(label) {
  const el = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
  expect(el, label).toBeTruthy();
  return el;
}
function maybeButton(label) { return [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label) || null; }
async function click(el) { await React.act(async () => { el.click(); }); }
async function flush() { await React.act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
const numberInput = (scope) => (scope || document).querySelector('input[type="number"]');

describe('mental-math strategies are modelled from the numbers', () => {
  it('builds each strategy for the classic examples', () => {
    const P = pure();
    const comp = P.mentalFit('compensation', 'add', 49, 26);
    expect(comp).toMatchObject({ applies: true, score: 3, answer: 75 });
    expect(comp.shift).toMatchObject({ x: 49, x2: 50, y: 26, y2: 25, k: 1 });
    expect(comp.line.start).toBe(50);
    expect(comp.line.jumps.map((j) => j.delta)).toEqual([20, 5]);
    const cd = P.mentalFit('constantDifference', 'subtract', 73, 28);
    expect(cd.shift).toMatchObject({ a2: 75, b2: 30, k: 2, dir: 'up' });
    expect(cd.answer).toBe(45);
    const hd = P.mentalFit('halveDouble', 'multiply', 16, 25);
    expect(hd.rects.map((r) => r.x + 'x' + r.y)).toEqual(['16x25', '8x50', '4x100']);
    const mt = P.mentalFit('makeTen', 'add', 38, 5);
    expect(mt.line.jumps.map((j) => j.to)).toEqual([40, 43]);
    const nd = P.mentalFit('nearDoubles', 'add', 25, 26);
    expect(nd.vals).toMatchObject({ s: 25, d: 50, diff: 1 });
    const ba = P.mentalFit('breakApart', 'multiply', 6, 34);
    expect(ba.line.jumps.map((j) => j.delta)).toEqual([180, 24]);
    expect(P.mentalFit('halveDouble', 'multiply', 7, 9)).toMatchObject({ applies: false, reason: 'hd_odd' });
    expect(P.mentalFit('makeTen', 'subtract', 30, 4)).toMatchObject({ applies: false, reason: 'op_mismatch' });
  });

  it('keeps every model faithful to the arithmetic for 3,000 random problems', () => {
    const P = pure();
    let seed = 7;
    const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    for (let k = 0; k < 3000; k++) {
      const op = ['add', 'subtract', 'multiply'][k % 3];
      let a = rnd(op === 'multiply' ? 60 : 2000), b = rnd(op === 'multiply' ? 60 : 2000);
      if (op === 'subtract' && a < b) [a, b] = [b, a];
      const exact = op === 'add' ? a + b : op === 'subtract' ? a - b : a * b;
      for (const fit of P.mentalAll(op, a, b)) {
        const tag = `${fit.id} ${a} ${op} ${b}`;
        expect(fit.answer, tag).toBe(exact);
        if (!fit.applies) continue;
        expect(fit.score, tag).toBeGreaterThan(0);
        if (fit.line && fit.line.jumps.length) {
          let at = fit.line.start;
          for (const j of fit.line.jumps) { expect(j.from, tag).toBe(at); at += j.delta; expect(j.to, tag).toBe(at); }
          expect(at, tag).toBe(exact);
        }
        if (fit.id === 'compensation') expect(fit.shift.x2 + fit.shift.y2, tag).toBe(a + b);
        if (fit.id === 'constantDifference') expect(fit.shift.a2 - fit.shift.b2, tag).toBe(a - b);
        if (fit.rects) fit.rects.forEach((r) => expect(r.x * r.y, tag).toBe(exact));
        expect(fit.steps.filter((s) => s.final).length, tag).toBe(1);
      }
    }
  });

  it('gives "which strategy is efficient" items a clear-cut key, endlessly, in every band', () => {
    const P = pure();
    for (const band of ['k2', 'g3', 'g4', 'g5']) {
      const pairs = new Set();
      for (let i = 0; i < 240; i++) {
        const item = P.genMentalItem('ef', band, i);
        const score = (id) => item.fits.find((f) => f.id === id).score;
        expect(item.order, item.id).toHaveLength(3);
        expect(item.order, item.id).toContain(item.key);
        expect(score(item.key), item.id).toBe(3);
        item.order.filter((id) => id !== item.key).forEach((id) => expect(score(id), item.id + ' ' + id).toBeLessThanOrEqual(1));
        pairs.add(item.op + item.a + ':' + item.b);
        if (band === 'k2') expect(item.op, item.id).not.toBe('multiply');
        if (band === 'k2' && item.op === 'add') expect(item.a + item.b, item.id).toBeLessThanOrEqual(100);
      }
      expect(pairs.size, band).toBeGreaterThan(150);
    }
  });

  it('names the slip when half of a strategy is skipped', () => {
    const P = pure();
    const slip = (id, op, a, b, g) => P.mentalSlip(P.mentalFit(id, op, a, b), g);
    expect(slip('compensation', 'add', 49, 26, 76)).toBe('cp_no_adjust');
    expect(slip('constantDifference', 'subtract', 73, 28, 47)).toBe('cd_one_side');
    expect(slip('halveDouble', 'multiply', 16, 25, 200)).toBe('hd_one_side');
    expect(slip('makeTen', 'add', 38, 5, 40)).toBe('mt_rest');
    expect(slip('nearDoubles', 'add', 25, 26, 50)).toBe('nd_adjust');
    expect(slip('compensation', 'add', 49, 26, 75)).toBeNull();
  });
});

describe('bar models match the story before solving', () => {
  it('generates correct one- and two-step problems that fit each band', () => {
    const P = pure();
    for (const band of ['k2', 'g3', 'g4', 'g5']) {
      const types = new Set();
      for (let i = 0; i < 300; i++) {
        const p = P.genBarProblem(band, i);
        types.add(p.type);
        p.steps.forEach((s, k) => {
          const exact = s.op === 'add' ? s.x + s.y : s.op === 'subtract' ? s.x - s.y : s.op === 'multiply' ? s.x * s.y : s.x / s.y;
          expect(s.answer, p.id).toBe(exact);
          expect(Number.isInteger(s.answer) && s.answer > 0, p.id).toBe(true);
          expect(P.checkBarModel(s, { model: s.model, values: s.values }).ok, p.id).toBe(true);
          if (k === 1) expect(Object.values(s.values).map(String), p.id).toContain(String(p.steps[0].answer));
        });
        if (band === 'k2') {
          expect(p.ops.every((op) => op === 'add' || op === 'subtract'), p.id).toBe(true);
          expect([...Object.values(p.nums), ...p.steps.map((s) => s.answer)].every((n) => n <= 100), p.id).toBe(true);
        }
      }
      expect(types.size, band).toBeGreaterThanOrEqual(6);
    }
  });

  it('names the keyword trap and other model errors', () => {
    const P = pure();
    const diff = P.genBarProblem('g4', 0).steps[0]; // compare: how many more
    expect(diff).toMatchObject({ model: 'compare', unknown: 'difference', keyword: true });
    const L = diff.values.larger, S = diff.values.smaller;
    expect(P.checkBarModel(diff, { model: 'partWhole', values: { partA: S, partB: L, whole: '?' } }).kind).toBe('keyword_more');
    expect(P.checkBarModel(diff, { model: 'compare', values: { larger: '?', smaller: S, difference: L } }).kind).toBe('keyword_more');
    expect(P.checkBarModel(diff, { model: 'compare', values: { larger: S, smaller: L, difference: '?' } }).kind).toBe('bar_compare_swap');
    expect(P.checkBarModel(diff, { model: 'equalGroups', values: { groups: S, size: L, total: '?' } }).kind).toBe('bar_shape');
    expect(P.checkBarAnswer(diff, 'add', String(L + S)).kind).toBe('keyword_more');
    expect(P.checkBarAnswer(diff, 'subtract', String(L + S)).kind).toBe('keyword_more');
    expect(P.checkBarAnswer(diff, 'subtract', String(L - S)).ok).toBe(true);
    const part = P.genBarProblem('g4', 2).steps[0]; // part-whole, part unknown
    expect(part.unknown).toBe('partB');
    const W = part.values.whole, A = part.values.partA;
    expect(P.checkBarModel(part, { model: 'partWhole', values: { partA: '?', partB: A, whole: W } }).ok).toBe(true);
    expect(P.checkBarModel(part, { model: 'partWhole', values: { partA: W, partB: A, whole: '?' } }).kind).toBe('bar_whole_part');
    expect(P.checkBarModel(part, { model: 'partWhole', values: { partA: '?', partB: '?', whole: W } }).kind).toBe('bar_unknown_count');
    const share = P.genBarProblem('g4', 3).steps[0]; // equal groups, size unknown
    expect(share.unknown).toBe('size');
    expect(P.checkBarModel(share, { model: 'equalGroups', values: { groups: '?', size: share.values.groups, total: share.values.total } }).kind).toBe('bar_groups_size');
  });
});

describe('decimal operations with models (5.NBT.7)', () => {
  it('generates exact problems, tenths only in the lower bands', () => {
    const P = pure();
    const dp = (x) => (String(x).split('.')[1] || '').length;
    for (const band of ['k2', 'g3', 'g4', 'g5']) {
      for (const mode of ['addsub', 'mulwhole']) {
        for (let i = 0; i < 250; i++) {
          const it = P.genDecimalItem(mode, band, i);
          const exact = it.op === 'add' ? Math.round((it.a + it.b) * 100) / 100 : it.op === 'subtract' ? Math.round((it.a - it.b) * 100) / 100 : Math.round(it.a * it.b * 10000) / 10000;
          expect(Math.abs(it.answer - exact) < 1e-9 && it.answer > 0, it.id).toBe(true);
          expect(Math.abs(P.decimalStages(it).total - it.answer) < 1e-9, it.id + ' disks').toBe(true);
          if (band === 'k2' || band === 'g3') expect(Math.max(dp(it.a), dp(it.b)), it.id).toBe(1);
          if (mode === 'mulwhole') expect(Number.isInteger(it.a) && !Number.isInteger(it.b), it.id).toBe(true);
        }
      }
    }
  });

  it('names decimal-point and place-alignment errors', () => {
    const P = pure();
    expect(P.diagnoseDecimal('add', 2.47, 1.8, 2.65)).toBe('decimal_align');
    expect(P.diagnoseDecimal('subtract', 3.2, 1.45, 1.13)).toBe('decimal_align');
    expect(P.diagnoseDecimal('add', 2.47, 1.8, 3.27)).toBe('no_regroup');
    expect(P.diagnoseDecimal('subtract', 5, 2.36, 3.36)).toBe('smaller_from_larger');
    expect(P.diagnoseDecimal('multiply', 4, 1.6, 4.24)).toBe('decimal_parts');
    expect(P.diagnoseDecimal('multiply', 4, 0.35, 14)).toBe('decimal_places');
    expect(P.diagnoseDecimal('multiply', 4, 0.35, 0.14)).toBe('decimal_places');
    expect(P.diagnoseDecimal('multiply', 4, 0.35, 1.4)).toBeNull();
  });

  it('keeps the value the same across every disk exchange', () => {
    const P = pure();
    const it = { op: 'multiply', a: 4, b: 0.35, dp: 2, answer: 1.4 };
    const walk = P.decimalStages(it);
    const value = (s) => s.counts.reduce((sum, c, i) => sum + c * Math.pow(10, i), 0);
    expect(walk.stages[0].counts.slice(0, 2)).toEqual([20, 12]);
    walk.stages.forEach((s) => expect(value(s)).toBe(140));
    expect(walk.stages.at(-1).counts.every((c) => c < 10)).toBe(true);
  });
});

describe('number talk: pick a strategy, solve, then see it modelled', () => {
  const start = { tab: 'mental', mmMode: 'talk', genBand: 'g4', ntIndex: 0 };

  it('locks the answer until a strategy is picked and names a compensation slip', async () => {
    const P = pure();
    const item = P.genMentalItem('nt', 'g4', 0);
    expect(item.key).toBe('compensation');
    const fit = P.mentalFit('compensation', 'add', item.a, item.b);
    const view = await mount({ _arithmeticStudio: start });
    expect(document.querySelector('[data-number-talk]').textContent).not.toContain(String(item.answer));
    expect(numberInput().disabled).toBe(true);
    await click(document.querySelector('[data-nt-pick="compensation"]'));
    expect(numberInput().disabled).toBe(false);
    await type(numberInput(), String(item.answer + fit.vals.k));
    await click(button('Check answer'));
    expect(document.querySelector('[data-named-error]').getAttribute('data-named-error')).toBe('cp_no_adjust');
    expect(document.querySelector('[data-nt-pick="compensation"]').disabled).toBe(true);
    expect(document.querySelector('[data-mental-model]')).toBeNull();
    await type(numberInput(), String(item.answer + 100));
    await click(button('Check answer'));
    await click(button('Show the answer'));
    expect(document.querySelector('[data-nt-done]').getAttribute('data-nt-done')).toBe('revealed');
    expect(document.querySelector('[data-mental-model="compensation"]')).toBeTruthy();
    expect(view.awards).toEqual([]);
    expect(view.d().ntRevealed[item.id]).toBe(true);
    expect(view.d().missLog.at(-1)).toMatchObject({ src: 'mental', kind: expect.any(String), revealed: true });
  });

  it('awards once for a correct answer and explains how well the strategy fits', async () => {
    const P = pure();
    const item = P.genMentalItem('nt', 'g4', 0);
    const view = await mount({ _arithmeticStudio: start });
    await click(document.querySelector('[data-nt-pick="breakApart"]'));
    await type(numberInput(), String(item.answer));
    await click(button('Check answer'));
    expect(view.awards).toHaveLength(1);
    expect(view.awards[0]).toEqual(['arithmeticStudio', 2, expect.any(String)]);
    expect(document.querySelector('[data-nt-efficiency]').textContent).toContain('Compensation may be quicker');
    expect(document.querySelector('[data-mental-model="breakApart"]')).toBeTruthy();
    await click(button('Solved'));
    expect(view.awards).toHaveLength(1);
  });
});

describe('strategy explorer hides the last jump until the prediction', () => {
  it('shows the open number line with a ? and reveals it after a correct prediction', async () => {
    await mount({ _arithmeticStudio: { tab: 'mental', mmMode: 'explore', mmStrategy: 'compensation' } });
    const model = () => document.querySelector('[data-mental-model]');
    expect(model().querySelector('svg').textContent).toContain('?');
    expect(model().textContent).not.toContain('75');
    expect(document.querySelector('[data-number-line-text]').textContent).toContain('Where do you land?');
    const predict = [...document.querySelectorAll('input[type="number"]')].at(-1);
    await type(predict, '76');
    await click(button('Check my prediction'));
    expect(document.querySelector('[data-named-error]').getAttribute('data-named-error')).toBe('cp_no_adjust');
    await type([...document.querySelectorAll('input[type="number"]')].at(-1), '75');
    await click(button('Check my prediction'));
    expect(model().textContent).toContain('75');
    expect(document.body.textContent).toContain('So 49 + 26 = 75.');
  });

  it('says why a strategy does not fit the typed numbers and suggests one that does', async () => {
    await mount({ _arithmeticStudio: { tab: 'mental', mmMode: 'explore', mmStrategy: 'halveDouble', mmA: '6', mmB: '34' } });
    expect(document.querySelector('[data-mm-not-apply]').getAttribute('data-mm-not-apply')).toBe('hd_not_friendly');
    expect(document.body.textContent).toContain('For these numbers, try Break apart by place value');
  });
});

describe('which strategy is efficient?', () => {
  it('gives named reasoning for a less efficient choice, then credits the key once', async () => {
    const P = pure();
    const item = P.genMentalItem('ef', 'g4', 0);
    const view = await mount({ _arithmeticStudio: { tab: 'mental', mmMode: 'efficient', genBand: 'g4', efIndex: 0 } });
    const wrong = item.order.find((id) => id !== item.key);
    await click(document.querySelector(`[data-ef-choice="${wrong}"]`));
    expect(document.querySelector('[data-ef-reason]').getAttribute('data-ef-reason')).toBe(wrong);
    expect(view.awards).toEqual([]);
    await click(document.querySelector(`[data-ef-choice="${item.key}"]`));
    expect(view.awards).toHaveLength(1);
    expect(document.body.textContent).toContain('Why not the others');
  });

  it('reveals after two wrong choices with no credit', async () => {
    const P = pure();
    const item = P.genMentalItem('ef', 'g4', 1);
    const view = await mount({ _arithmeticStudio: { tab: 'mental', mmMode: 'efficient', genBand: 'g4', efIndex: 1 } });
    for (const id of item.order.filter((x) => x !== item.key)) await click(document.querySelector(`[data-ef-choice="${id}"]`));
    // Stage C: on demand after two tries, like every other tab.
    expect(view.d().efFeedback).toBe('try');
    await click(button('Show the answer'));
    expect(view.d().efFeedback).toBe('revealed');
    expect(document.querySelector(`[data-ef-choice="${item.key}"]`).disabled).toBe(true);
    expect(view.awards).toEqual([]);
  });
});

describe('bar-model word problems: build, then solve', () => {
  it('names the "more means add" trap in the model and in the answer', async () => {
    const P = pure();
    const step = P.genBarProblem('g4', 0).steps[0];
    const view = await mount({ _arithmeticStudio: { tab: 'bars', genBand: 'g4', barIndex: 0 } });
    expect(document.querySelector('[data-bar-story]').textContent).toContain('How many more');
    expect(document.querySelector('[data-bar-op="subtract"]').disabled).toBe(true);
    await click(document.querySelector('[data-bar-model="partWhole"]'));
    await choose(document.querySelector('[data-bar-slot="partA"]'), String(step.values.smaller));
    await choose(document.querySelector('[data-bar-slot="partB"]'), String(step.values.larger));
    await choose(document.querySelector('[data-bar-slot="whole"]'), '?');
    expect(document.querySelector('[data-bar-model-view]').getAttribute('data-bar-model-view')).toBe('partWhole');
    await click(button('Check my model'));
    expect(document.querySelector('[data-bar-model-error]').getAttribute('data-bar-model-error')).toBe('keyword_more');
    await click(document.querySelector('[data-bar-model="compare"]'));
    await choose(document.querySelector('[data-bar-slot="larger"]'), String(step.values.larger));
    await choose(document.querySelector('[data-bar-slot="smaller"]'), String(step.values.smaller));
    await choose(document.querySelector('[data-bar-slot="difference"]'), '?');
    await click(button('Check my model'));
    expect(view.d().barModelLocked).toBe(true);
    await click(document.querySelector('[data-bar-op="add"]'));
    await type(numberInput(document.querySelector('[data-bar-problem]')), String(step.x + step.y));
    await click(button('Check answer'));
    expect(document.querySelector('[data-named-error]').getAttribute('data-named-error')).toBe('keyword_more');
    await click(document.querySelector('[data-bar-op="subtract"]'));
    await type(numberInput(document.querySelector('[data-bar-problem]')), String(step.answer));
    await click(button('Check answer'));
    expect(document.querySelector('[data-bar-done]').getAttribute('data-bar-done')).toBe('solved');
    expect(document.querySelector('[data-keyword-note]')).toBeTruthy();
    expect(view.awards).toEqual([['arithmeticStudio', 3, expect.any(String)]]);
  });

  it('solves a two-step problem in order, with step 1 feeding step 2', async () => {
    const P = pure();
    const p = P.genBarProblem('g4', 12);
    expect(p.twoStep).toBe(true);
    const view = await mount({ _arithmeticStudio: { tab: 'bars', genBand: 'g4', barIndex: 12 } });
    const build = async (s) => {
      await click(document.querySelector(`[data-bar-model="${s.model}"]`));
      for (const [slot, v] of Object.entries(s.values)) await choose(document.querySelector(`[data-bar-slot="${slot}"]`), String(v));
      await click(button('Check my model'));
    };
    await build(p.steps[0]);
    await click(document.querySelector(`[data-bar-op="${p.steps[0].op}"]`));
    await type(numberInput(document.querySelector('[data-bar-problem]')), String(p.steps[0].answer));
    await click(button('Check answer'));
    await click(button('Go on to step 2'));
    expect(view.d().barStep).toBe(1);
    await click(document.querySelector('[data-bar-model="partWhole"]'));
    const options = [...document.querySelectorAll('[data-bar-slot="partA"] option')].map((o) => o.textContent);
    expect(options).toContain(p.steps[0].answer + ' (step 1 result)');
    await build(p.steps[1]);
    await click(document.querySelector(`[data-bar-op="${p.steps[1].op}"]`));
    await type(numberInput(document.querySelector('[data-bar-problem]')), String(p.steps[1].answer));
    await click(button('Check answer'));
    expect(view.d().barSolved[p.id]).toBe(true);
    expect(view.awards).toEqual([['arithmeticStudio', 4, expect.any(String)]]);
  });

  it('teachers can leave out two-step problems', () => {
    const P = pure();
    const skip = (q) => q.twoStep;
    for (let i = 0; i < 40; i++) {
      const idx = P.nextAllowedIndex((k) => P.genBarProblem('g4', k), i, ['add', 'subtract', 'multiply', 'divide'], skip);
      expect(P.genBarProblem('g4', idx).twoStep).toBe(false);
    }
    loadTool(FILE, ID);
    const html = renderTool(ID, { _arithmeticStudio: { tab: 'bars', genBand: 'g4', barIndex: 12, teacher: { twoStep: false } } });
    expect(html).not.toContain('Step 1 of 2');
  });
});

describe('decimals with base-ten disks', () => {
  it('names an alignment error, offers the place chart, then reveals with no credit', async () => {
    const P = pure();
    const item = P.genDecimalItem('addsub', 'g5', 0);
    expect(item).toMatchObject({ a: 19.1, op: 'add', b: 12.46 });
    const view = await mount({ _arithmeticStudio: { tab: 'decimals', genBand: 'g5', decMode: 'addsub', decIndex: 0 } });
    expect(document.querySelector('[data-dec-walk]')).toBeNull();
    expect(document.querySelector('[data-dec-start]')).toBeTruthy();
    await type(numberInput(), '14.37');
    await click(button('Check answer'));
    expect(document.querySelector('[data-named-error]').getAttribute('data-named-error')).toBe('decimal_align');
    expect(document.body.textContent).toContain('Writing 19.1 as 19.10 can help');
    expect(document.querySelector('[data-dec-chart]').textContent).toContain('(0)');
    expect(document.querySelector('[data-dec-chart]').textContent).not.toContain('31.56');
    await type(numberInput(), '30');
    await click(button('Check answer'));
    await click(button('Show the answer'));
    expect(document.querySelector('[data-dec-done]').getAttribute('data-dec-done')).toBe('revealed');
    expect(document.querySelector('[data-dec-walk]')).toBeTruthy();
    expect(view.awards).toEqual([]);
  });

  it('credits a correct product once and steps through the exchanges', async () => {
    const P = pure();
    const item = P.genDecimalItem('mulwhole', 'g5', 0);
    const view = await mount({ _arithmeticStudio: { tab: 'decimals', genBand: 'g5', decMode: 'mulwhole', decIndex: 0 } });
    await type(numberInput(), String(item.answer));
    await click(button('Check answer'));
    expect(view.awards).toEqual([['arithmeticStudio', 2, expect.any(String)]]);
    const walk = P.decimalStages(item);
    for (let i = 1; i < walk.stages.length; i++) await click(button('Next step'));
    expect(document.querySelector('[data-dec-note]').textContent).toContain('Read the disks: ' + item.answer);
  });

  it('honours a teacher lock on the kind of decimal problem', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, { _arithmeticStudio: { tab: 'decimals', decMode: 'addsub', teacher: { decMode: 'mulwhole' } } });
    expect(html).toContain('Your teacher chose this kind of decimal problem.');
    expect(html).toContain('data-dec-item="dc-mulwhole-');
  });
});

describe('AI hint after two tries, with the offline hint always there', () => {
  const state = { _arithmeticStudio: { tab: 'decimals', genBand: 'g5', decMode: 'addsub', decIndex: 0 } };
  async function twoWrong() {
    await type(numberInput(), '14.37');
    await click(button('Check answer'));
    expect(maybeButton('Ask for an AI hint')).toBeNull();
    await type(numberInput(), '30');
    await click(button('Check answer'));
  }

  it('shows the host hint when getHint replies', async () => {
    const getHint = vi.fn((tool, q, wrong, correct, n, cb) => cb('💡 Line up the decimal points first.'));
    await mount(state, { getHint, aiHintsEnabled: true });
    await twoWrong();
    await click(button('Ask for an AI hint'));
    expect(getHint).toHaveBeenCalledTimes(1);
    expect(getHint.mock.calls[0].slice(0, 5)).toEqual(['arithmeticStudio', '19.1 + 12.46', '30', '31.56', 2]);
    expect(document.querySelector('[data-ai-hint-text]').textContent).toContain('Line up the decimal points');
  });

  it('falls back gracefully when getHint throws, never replies, or hints are off', async () => {
    await mount(state, { getHint: () => { throw new Error('offline'); }, aiHintsEnabled: true });
    await twoWrong();
    await click(button('Ask for an AI hint'));
    expect(document.querySelector('[data-ai-hint]').getAttribute('data-ai-hint')).toBe('none');
    expect(document.querySelector('[data-named-error]')).toBeTruthy();
    await React.act(async () => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>';

    await mount(state, { getHint: () => {}, aiHintsEnabled: true });
    await twoWrong();
    await click(button('Ask for an AI hint'));
    expect(document.querySelector('[data-ai-hint]').getAttribute('data-ai-hint')).toBe('pending');
    expect(document.body.textContent).toContain('the hint from the tool still works');
    expect(document.querySelector('[data-dec-chart]')).toBeTruthy();
    await React.act(async () => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>';

    await mount(state, { getHint: vi.fn(), aiHintsEnabled: false });
    await twoWrong();
    expect(maybeButton('Ask for an AI hint')).toBeNull();
  });
});

describe('read-aloud', () => {
  it('does not read the Learn result before the prediction (regression)', async () => {
    const spoken = [];
    await mount({ _arithmeticStudio: { tab: 'learn', operation: 'add', a: 58, b: 27 } }, { callTTS: (text) => { spoken.push(text); return Promise.resolve('blob:x'); } });
    await click(button('Read strategy aloud'));
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toContain('58');
    expect(spoken[0]).not.toContain('85');
  });

  it('reads fading worked-example steps with blanks, never their answers', async () => {
    const P = pure();
    const ex = P.workedExample('add', 0, 2);
    const spoken = [];
    await mount({ _arithmeticStudio: { tab: 'learn', operation: 'add', we: { add: { stage: 2, round: 0 } } } }, { callTTS: (text) => { spoken.push(text); return Promise.resolve('blob:x'); } });
    await click(button('Read the steps aloud'));
    expect(spoken[0]).toContain('blank');
    expect(spoken[0]).toContain(String(ex.steps[0].ans));
    expect(spoken[0]).not.toContain('= ' + ex.answer);
  });

  it('falls back to browser speech, then to an on-page note', async () => {
    const speak = vi.fn();
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    window.speechSynthesis = { speak, cancel: vi.fn() };
    try {
      await mount({ _arithmeticStudio: { tab: 'learn' } }, { callTTS: () => Promise.resolve(null) });
      await click(button('Read the steps aloud'));
      await flush();
      expect(speak).toHaveBeenCalledTimes(1);
    } finally { delete window.speechSynthesis; delete window.SpeechSynthesisUtterance; }
    await React.act(async () => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>';
    await mount({ _arithmeticStudio: { tab: 'learn' } });
    await click(button('Read the steps aloud'));
    expect(document.body.textContent).toContain('Read-aloud is not available here.');
  });
});

describe('teacher hooks, accessibility, i18n and old saves for the new tabs', () => {
  const NEW_STATES = [
    { tab: 'mental', mmMode: 'explore', mmStrategy: 'constantDifference' },
    { tab: 'mental', mmMode: 'explore', mmStrategy: 'halveDouble' },
    { tab: 'mental', mmMode: 'talk', ntIndex: 3 },
    { tab: 'mental', mmMode: 'efficient', efIndex: 2 },
    { tab: 'bars', barIndex: 1 },
    { tab: 'bars', barIndex: 0, barFor: 'bar-g5-0', barModel: { model: 'compare', values: { larger: '?', smaller: '1', difference: '2' } }, barModelFeedback: 'try', barModelKind: 'keyword_more', barModelTry: 1 },
    { tab: 'decimals', decMode: 'addsub' },
    { tab: 'decimals', decMode: 'mulwhole', decIndex: 2, decFor: 'dc-mulwhole-g5-2', decFeedback: 'try', decTry: 1, decKind: 'decimal_parts', decAnswer: '9.12' },
  ];

  it('respects the teacher operation list', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, { _arithmeticStudio: { tab: 'mental', teacher: { ops: ['divide'] } } });
    expect(html).toContain('Your teacher has turned off the operations these strategies use.');
    const dec = renderTool(ID, { _arithmeticStudio: { tab: 'decimals', teacher: { ops: ['divide'] } } });
    expect(dec).toContain('Your teacher has turned off the operations these problems use.');
  });

  it('gives every button a 44 px minimum height', () => {
    loadTool(FILE, ID);
    for (const s of NEW_STATES) {
      document.body.innerHTML = renderTool(ID, { _arithmeticStudio: s }, { isTeacherMode: true });
      expect(document.getElementById('arithmetic-studio-tab-' + s.tab).getAttribute('aria-selected'), s.tab).toBe('true');
      const small = [...document.querySelectorAll('button')].filter((b) => !/min-height:\s*44px/.test(b.getAttribute('style') || ''));
      expect(small.map((b) => b.textContent), s.tab).toEqual([]);
    }
  });

  it('sends every visible word through t()', () => {
    loadTool(FILE, ID);
    const leftovers = new Set();
    for (const s of NEW_STATES) {
      document.body.innerHTML = renderTool(ID, { _arithmeticStudio: s }, { t: () => '§', isTeacherMode: true });
      expect(document.getElementById('arithmetic-studio-tab-' + s.tab), s.tab).toBeTruthy();
      document.body.textContent.split('§').forEach((seg) => {
        const cleaned = seg.replace(/[\d\s.,:;()+\-−×÷=?/'"→←|…—]+/g, ' ').trim();
        cleaned.split(/\s+/).filter((w) => /[A-Za-z]{2,}/.test(w) && !/^[A-Z]+$/.test(w)).forEach((w) => leftovers.add(w));
      });
    }
    expect([...leftovers]).toEqual([]);
  });

  it('loads hostile and old state for the new keys without crashing', () => {
    loadTool(FILE, ID);
    const hostile = [
      { tab: 'mental', mmMode: 'zz', mmStrategy: 5, mmA: { x: 1 }, mmB: null, ntIndex: 'x', ntSolved: 'no', efIndex: -4, efSolved: [1] },
      { tab: 'mental', mmMode: 'talk', ntFor: 'nt-g5-0', ntPick: 'bogus', ntTry: 'many', ntFeedback: 'revealed' },
      { tab: 'bars', barIndex: 1e12, barModel: 5, barStep: 9, barFor: 'bar-g5-0', barSolved: null, barMissed: 'x' },
      { tab: 'bars', barFor: 'bar-g5-0', barModel: { model: 'nope', values: 3 }, barModelLocked: true, barOp: 'pow' },
      { tab: 'decimals', decMode: 'zz', decIndex: 'q', decStep: 99, decFor: 'dc-addsub-g5-0', teacher: { decMode: 7, twoStep: 'x' } },
    ];
    for (const s of hostile) {
      for (const overrides of [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true }]) {
        const html = renderTool(ID, { _arithmeticStudio: s }, overrides);
        expect(html).toContain('Arithmetic Strategy Studio');
        expect(html).not.toMatch(/NaN|undefined|\[object Object\]/);
      }
    }
  });

  it('mounts every new tab and mode with no console errors', async () => {
    const errors = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.join(' ')));
    const warn = vi.spyOn(console, 'warn').mockImplementation((...args) => errors.push(args.join(' ')));
    try {
      for (const s of NEW_STATES) {
        for (const overrides of [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true, gradeBand: 'k2' }]) {
          await mount({ _arithmeticStudio: s }, overrides);
          await React.act(async () => root.unmount());
          root = null;
          document.body.innerHTML = '<div id="root"></div>';
        }
      }
    } finally { spy.mockRestore(); warn.mockRestore(); }
    expect(errors.slice(0, 5)).toEqual([]);
  });

  it('teacher panel sets the decimal lock and the two-step toggle', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'decimals' } }, { isTeacherMode: true });
    await click(document.querySelector('[data-teacher-dec-mode="mulwhole"]'));
    await click(document.querySelector('[data-teacher-two-step]'));
    expect(view.d().teacher).toMatchObject({ decMode: 'mulwhole', twoStep: false });
    expect(document.querySelector('[data-dec-item]').getAttribute('data-dec-item')).toMatch(/^dc-mulwhole-/);
  });
});
