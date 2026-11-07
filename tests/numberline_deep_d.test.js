// Number Line stage D (independent bug hunt, 2026-11-04). Each block reproduces
// a defect found by driving the tool, and fails on the stage C file
// (NUMBERLINE_DEEP_SRC points the suite at another copy).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.NUMBERLINE_DEEP_SRC || 'stem_lab/stem_tool_numberline.js';
const t = (k, fb) => fb;
let root = null, latest = null, xp = [], errors = [];

beforeEach(() => {
  resetStemLab();
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({}, { get: (tg, k) => (k in tg ? tg[k] : () => {}), set: (tg, k, v) => { tg[k] = v; return true; } }));
  loadTool(FILE, 'numberline');
  xp = []; errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
});
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; document.body.innerHTML = ''; vi.restoreAllMocks(); });

const E = () => window.StemLab._registry.numberline._engine;
const B = () => window.StemLab._registry.numberline._engineB;
async function mount(nl, over) {
  document.body.innerHTML = '<div id="root"></div>';
  function App() {
    const [state, setState] = React.useState({ _numberline: Object.assign({ muted: true }, nl) });
    latest = state._numberline;
    return window.StemLab._registry.numberline.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState, awardXP: (id, amt, why) => xp.push([id, amt, why]), announceToSR: () => {}, addToast: () => {},
    }, over || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
}
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); }
async function type(el, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const btn = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
async function predict(v) { await type(document.getElementById('nl-skip-pred'), String(v)); await click(btn('Check my prediction')); }
const skipXp = () => xp.filter((x) => x[2] === 'Skip count prediction').length;

describe('misconception classifier: no false names', () => {
  const frac = (over) => Object.assign({ type: 'placeFraction', answer: 'position', v: 2 }, over);
  it('"whole line used as 1" is named where that student actually puts p/q (T x max), not at T / max', () => {
    // 6/8 on a 0-3 line cut in eighths: treating the whole line as 1 puts 6/8 of the line at 2.25.
    const it1 = frac({ target: 0.75, p: 6, q: 8, tol: 0.49 / 8, snap: 1 / 8, line: { min: 0, max: 3, step: 1 / 8, labels: [0, 1, 2, 3] } });
    expect(E().grade(it1, { pos: 2.25 }).mis).toBe('whole_is_line');
    expect(E().grade(it1, { pos: 0.25 }).mis).not.toBe('whole_is_line');
    // 7/8 on a 0-2 line with no fraction ticks: 7/8 of the line is 1.75.
    const it2 = frac({ target: 0.875, p: 7, q: 8, tol: 0.05, snap: 0.02, noFractionTicks: true, line: { min: 0, max: 2, step: 1, labels: [0, 1, 2] } });
    expect(E().grade(it2, { pos: 1.76 }).mis).toBe('whole_is_line');
    expect(E().grade(it2, { pos: 0.44 }).mis).not.toBe('whole_is_line');
  });
  it('a line with no fraction ticks never blames "counting tick marks" or "one space off"', () => {
    const it3 = frac({ target: 0.375, p: 3, q: 8, tol: 0.04, snap: 0.01, noFractionTicks: true, line: { min: 0, max: 1, step: 1, labels: [0, 1] } });
    expect(E().grade(it3, { pos: 0.25 }).ok).toBe(false);
    expect(E().grade(it3, { pos: 0.25 }).mis).toBeNull();
    expect(E().grade(it3, { pos: 0.5 }).mis).toBeNull();
    // the ticked version still names the slips
    const it4 = frac({ target: 0.375, p: 3, q: 8, tol: 0.49 / 8, snap: 1 / 8, line: { min: 0, max: 1, step: 1 / 8, labels: [0, 1] } });
    expect(E().grade(it4, { pos: 0.25 }).mis).toBe('ticks_not_spaces');
    expect(E().grade(it4, { pos: 0.5 }).mis).toBe('one_space_off');
  });
  it('0.5 vs 0.50 (equal): a wrong < or > gets the trailing-zero message, not a "more hundredths is greater" rule', () => {
    for (const [sa, sb] of [['0.5', '0.50'], ['0.50', '0.5'], ['1.25', '1.250']]) {
      const item = { sa, sb, a: Number(sa), b: Number(sb), rel: '=' };
      for (const rel of ['<', '>']) {
        const g = B().gradeDzCompare(item, rel);
        expect(g.ok).toBe(false);
        expect(g.mis).toBe('dz_trailing_zero');
        const info = B().misInfo(g.mis, item, t);
        expect(info.title).toBeTruthy();
        expect(info.body).toMatch(/equal/);
        expect(info.body).not.toMatch(/more hundredths is greater/);
      }
    }
    // unequal pairs keep their names
    expect(B().gradeDzCompare({ sa: '0.4', sb: '0.45', a: 0.4, b: 0.45, rel: '<' }, '>').mis).toBe('shorter_is_bigger');
  });
});

describe('English plurals: never "1 spaces"', () => {
  it('marker / arrow descriptions say "1 space" one tick past a label', () => {
    const item = { line: { min: 0, max: 10, step: 1, labels: [0, 5, 10] } };
    expect(E().describeSpot(item, 6, t, 'marker')).toBe('Your marker is on the tick 1 space right of the labelled tick 5.');
    expect(E().describeSpot(item, 1, t, 'arrow')).toBe('The arrow points to the tick 1 space right of the labelled tick 0.');
    expect(E().describeSpot(item, 7, t, 'marker')).toBe('Your marker is on the tick 2 spaces right of the labelled tick 5.');
    expect(E().describeSpot(item, 6.5, t, 'marker')).toMatch(/^Your marker is 1 full space right of the labelled tick 5, then about halfway/);
    const ln = B().IC_LINES.temp;
    expect(B().icSpot(ln, 6, true, t)).toBe('Your marker is on the tick 1 space above the labelled tick 5.');
    expect(B().icSpot(ln, 6, false, t)).toBe('Your marker is on the tick 1 space right of the labelled tick 5.');
  });
  it('a sweep of generated items, every marker spot and every worked solution has no "1 spaces" / "1 tenths"', () => {
    const bad = /(^|[^\d.])1 (full )?(spaces|units|tenths|hundredths|tenth-spaces)\b/;
    const hits = [];
    let seed = 11;
    for (const band of E().BANDS) for (const type of E().ALL_TYPES) for (let i = 0; i < 150; i++) {
      const it = E().genItem(type, band, E().seeded(seed++));
      const words = E().steps(it, t).concat([E().describeLine(it, t)]);
      if (!it.line.open) for (let v = it.line.min; v <= it.line.max + 1e-9; v += (it.snap || it.line.step)) words.push(E().describeSpot(it, E().snapPos(it, v), t, 'marker'));
      words.forEach((w) => { if (bad.test(w)) hits.push(w); });
    }
    expect(hits.slice(0, 5)).toEqual([]);
  });
});

describe('skip count: no credit for a hop that was shown before the prediction', () => {
  it('Next hop, then Previous hop, then predicting that hop pays nothing', async () => {
    await mount({ tab: 'skipcount', skipFrom: 0, skipBy: 5, skipCount: 4, skipShown: 0 });
    await click(btn('Next hop'));
    expect(document.body.textContent).toContain('0 + 1 × 5 = 5');
    await click(btn('Previous hop'));
    await predict(5);
    expect(latest.skipShown).toBe(1);
    expect(skipXp()).toBe(0);
    await predict(10);                                    // hop 2 was never shown: it still pays
    expect(skipXp()).toBe(1);
  });
  it('Show all hops, then Start at zero hops: predicting the shown hops pays nothing', async () => {
    await mount({ tab: 'skipcount', skipFrom: 0, skipBy: 5, skipCount: 3, skipShown: 0 });
    await click(btn('Show all hops'));
    await click(btn('Start at zero hops'));
    for (const v of [5, 10, 15]) await predict(v);
    expect(latest.skipShown).toBe(3);
    expect(skipXp()).toBe(0);
  });
  it('"Show the next hop" after two misses, then Previous hop: the revealed hop pays nothing', async () => {
    await mount({ tab: 'skipcount', skipFrom: 3, skipBy: 4, skipCount: 3, skipShown: 0 });
    await predict(4); await predict(3);
    await click(btn('Show the next hop'));
    await click(btn('Previous hop'));
    await predict(7);
    expect(skipXp()).toBe(0);
  });
});

describe('quick questions: no credit by elimination', () => {
  const rounding = { type: 'rounding', roundingValue: 47, roundingBase: 10, answer: 50, question: 'Round 47 to the nearest 10.' };
  const identify = { type: 'identify', _arrowValue: 7, answer: 7, question: 'What number does the arrow point to?' };
  const answer = async (v) => { await type(document.querySelector('input[type="number"]'), String(v)); await click(btn('Check Answer')); };
  it('rounding: the other multiple after a wrong one earns nothing', async () => {
    await mount({ tab: 'challenges', challengeMode: 'quick', range: { min: 30, max: 70 }, challenge: rounding });
    await answer(40); await answer(50);
    expect(latest.challenge.solved).toBe(true);
    expect(xp.filter((x) => x[0] === 'numberline')).toEqual([]);
    expect(latest.score.correct).toBe(0);
    expect(latest.roundingSolved || 0).toBe(0);
  });
  it('guessing: right on the third try earns nothing; right on the second try still earns support XP', async () => {
    await mount({ tab: 'challenges', challengeMode: 'quick', range: { min: 0, max: 10 }, challenge: identify });
    await answer(1); await answer(2); await answer(7);
    expect(latest.challenge.solved).toBe(true);
    expect(xp.filter((x) => x[0] === 'numberline')).toEqual([]);
    expect(latest.score).toEqual({ correct: 0, total: 3 });
    await React.act(async () => root.unmount()); root = null; xp = [];
    await mount({ tab: 'challenges', challengeMode: 'quick', range: { min: 0, max: 10 }, challenge: identify });
    await answer(1); await answer(7);
    expect(xp.filter((x) => x[0] === 'numberline')).toEqual([['numberline', 2, 'number line']]);
    expect(latest.score.correct).toBe(1);
  });
});

describe('keyboard: a digit typed on a focused line-plot cell does not switch tabs', () => {
  it('pressing 3 on a grid cell keeps the line plot open', async () => {
    const item = B().genLinePlot('b45', E().seeded(5));
    await mount({ tab: 'measure', msMode: 'plot', lp: { item, counts: item.counts.map(() => 0), sel: 0, struck: {}, status: 'open', tries: 0, fb: null, q: {} } }, { gradeLevel: '5th Grade' });
    const cell = document.querySelector('[data-lp-cell="0"]');
    expect(cell).toBeTruthy();
    await React.act(async () => { cell.focus(); cell.dispatchEvent(new window.KeyboardEvent('keydown', { key: '3', bubbles: true, cancelable: true })); });
    expect(latest.tab).toBe('measure');
    expect(errors).toEqual([]);
  });
});
