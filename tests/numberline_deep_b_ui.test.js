// Number Line stage B (2026-11-03 pm): live React mounts of decimal zoom,
// ordering, ruler + line plot, integers in context, the CER investigation
// and touch-drag robustness. NUMBERLINE_DEEP_SRC points the suite at another
// copy (the stage A copy must turn these red).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.NUMBERLINE_DEEP_SRC || 'stem_lab/stem_tool_numberline.js';
let root = null, latest = null, xp = [], errors = [], sr = [];

beforeEach(() => {
  resetStemLab();
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({}, { get: (tg, k) => (k in tg ? tg[k] : () => {}), set: (tg, k, v) => { tg[k] = v; return true; } }));
  loadTool(FILE, 'numberline');
  xp = []; errors = []; sr = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
  vi.spyOn(console, 'warn').mockImplementation((...a) => { errors.push('WARN ' + a.map(String).join(' ').slice(0, 300)); });
});
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; document.body.innerHTML = ''; vi.restoreAllMocks(); });

async function mount(nl, over) {
  document.body.innerHTML = '<div id="root"></div>';
  function App() {
    const [state, setState] = React.useState({ _numberline: Object.assign({ muted: true }, nl) });
    latest = state._numberline;
    return window.StemLab._registry.numberline.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState,
      awardXP: (id, amt, why) => xp.push([id, amt, why]),
      announceToSR: (m) => sr.push(m), addToast: () => {},
    }, over || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
}
const txt = () => document.body.textContent.replace(/\s+/g, ' ');
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); }
async function key(el, k) { await React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }); }
async function type(el, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const btn = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
const btnStart = (prefix) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(prefix));
const ENG = () => window.StemLab._registry.numberline._engineB;

describe('every stage B tab mounts cleanly', () => {
  it('mounts all tabs in light, dark and teacher modes with no console errors', async () => {
    for (const over of [{}, { isDark: true }, { isTeacherMode: true }]) {
      for (const tab of ['decimals', 'order', 'measure', 'intctx', 'magCompare']) {
        await mount({ tab }, over);
        const start = btn('Start practice') || btn('Get a data set');
        if (start) await click(start);
        if (tab === 'decimals') { for (const m of ['Place a decimal', 'Compare two decimals']) { await click(btn(m)); await click(btn('Start practice')); } }
        if (tab === 'measure') { await click(btn('Make a line plot')); await click(btn('Get a data set')); }
        expect(document.querySelector('[role="tabpanel"]').textContent.length).toBeGreaterThan(100);
        await React.act(async () => root.unmount()); root = null;
      }
    }
    expect(errors).toEqual([]);
  });
});

const slider = (scope) => document.querySelector((scope || '') + ' svg[role="slider"]');
const correctMarks = (svg) => [...svg.querySelectorAll('polygon')].filter((p) => p.getAttribute('fill') === '#047857').length;
async function presses(el, k, n) { for (let i = 0; i < n; i++) await key(el, k); }
async function setSelect(el, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(el, String(value));
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}
const dzItem = (text) => ({ id: 'dz-test-' + text, kind: 'dzPlace', band: 'b45', places: text.split('.')[1].length, W: 0, text, target: Number(text), tries: 0 });

describe('decimal zoom', () => {
  it('places 0.347 by zooming with the keyboard; graded by position, paid once', async () => {
    await mount({ tab: 'decimals', nlbSolved: { dzPlace: 9 }, dz: { mode: 'place', item: dzItem('0.347'), lo: 0, level: 0, pos: null, status: 'open', tries: 0, hints: 0 } });
    const s = () => slider('[data-nl-decimals]');
    expect(correctMarks(s())).toBe(0);                                   // nothing revealed before the attempt
    await key(s(), 'ArrowRight');
    expect(latest.dz.pos).toBe(0.5);
    await presses(s(), 'ArrowLeft', 2);
    expect(s().getAttribute('aria-valuetext')).toBe('Your marker is on the tick 0.3. Each space here is one tenth.');
    await click(btn('Zoom in on 0.3 to 0.4'));
    expect([latest.dz.lo, latest.dz.level]).toEqual([0.3, 1]);
    expect(sr.at(-1)).toBe('The line now runs from 0.3 to 0.4, cut into ten hundredths.');
    await presses(s(), 'ArrowRight', 4);
    await click(btn('Zoom in on 0.34 to 0.35'));
    await presses(s(), 'ArrowRight', 7);
    expect(s().getAttribute('aria-valuetext')).toBe('Your marker is on the tick 0.347. Each space here is one thousandth.');
    expect([...document.querySelectorAll('[data-dz-chart] td')].map((td) => td.textContent)).toEqual(['0', '3', '4', '7']);
    await click(btn('Check my placement'));
    expect(latest.dz.status).toBe('correct');
    expect(xp.filter((x) => x[0] === 'numberline')).toEqual([['numberline', 3, 'Decimal zoom']]);
    expect(correctMarks(s())).toBe(1);
    expect(btn('Check my placement')).toBeUndefined();
    expect(latest.nlbSolved.dzPlace).toBe(10);
  });
  it('0.305 placed at 0.35 names the dropped zero, then logs a miss after two tries; reveal only then', async () => {
    await mount({ tab: 'decimals', nlbSolved: { dzPlace: 9 }, dz: { mode: 'place', item: dzItem('0.305'), lo: 0.3, level: 1, pos: 0.35, status: 'open', tries: 0, hints: 0 } });
    expect(btn('Show the answer')).toBeUndefined();
    await click(btn('Check my placement'));
    expect(document.querySelector('[data-nlb-mis]').getAttribute('data-nlb-mis')).toBe('dz_zero_dropped');
    expect(txt()).toContain('A zero holds a place');
    expect(latest.ppMissed || []).toHaveLength(0);
    await click(btn('Check my placement'));
    expect(latest.ppMissed).toHaveLength(1);
    expect(latest.ppMissed[0]).toMatchObject({ type: 'dzPlace', mis: 'dz_zero_dropped', correct: '0.305' });
    await click(btn('Show the answer'));
    expect(latest.dz.status).toBe('revealed');
    expect([latest.dz.lo, latest.dz.level]).toEqual([0.3, 2]);
    expect(xp).toEqual([]);
  });
  // Stage C (intended change): a choice item is no longer closed after one miss with the
  // working shown. It names the slip, logs the item for review (a guess among few
  // choices), allows a second try that pays nothing, and reveals only on demand.
  it('compare: choosing "0.4 is less than 0.375" names longer-is-bigger, logs it, allows an unpaid second try', async () => {
    const item = { id: 'dc-1', kind: 'dzCompare', band: 'b45', sa: '0.4', sb: '0.375', a: 0.4, b: 0.375, rel: '>', binary: true, tries: 0 };
    await mount({ tab: 'decimals', nlbSolved: { dzCompare: 9 }, dz: { mode: 'compare', item, status: 'open', tries: 0, hints: 0 } });
    expect(document.querySelectorAll('[data-nl-decimals] svg').length).toBe(0);   // no line before the choice
    await click(btn('0.4 is less than 0.375'));
    await click(btn('Check my answer'));
    expect(txt()).toContain('Longer decimal, bigger number?');
    expect(latest.dz.status).toBe('open');
    expect(txt()).not.toContain('The first place that is different is the tenths place: 4 and 3.');   // no auto-reveal
    expect(btn('Show the answer')).toBeUndefined();
    expect(latest.ppMissed[0]).toMatchObject({ type: 'dzCompare', mis: 'longer_is_bigger', answer: '0.4 < 0.375', correct: '0.4 > 0.375' });
    await click(btn('0.4 is greater than 0.375'));
    await click(btn('Check my answer'));
    expect(latest.dz.status).toBe('correct');
    expect(xp).toEqual([]);
    expect(txt()).toContain('You found it. This one stays on your review list.');
    expect(txt()).toContain('The first place that is different is the tenths place: 4 and 3.');
  });
  it('the teacher cap limits generated decimals to tenths', async () => {
    await mount({ tab: 'decimals', teacher: { dzCap: 1 }, dz: { mode: 'place' } });
    await click(btn('Start practice'));
    expect(latest.dz.item.places).toBe(1);
  });
});

describe('ordering on one line', () => {
  const F = (n, d) => ({ kind: 'frac', text: n + '/' + d, value: n / d, n, d });
  const D = (s) => ({ kind: 'dec', text: s, value: Number(s), places: s.split('.')[1].length });
  const item = { id: 'ord-1', kind: 'order', band: 'b45', nums: [F(3, 4), D('0.375'), { kind: 'pct', text: '8%', value: 0.08, p: 8 }, D('0.5')], line: { min: 0, max: 1, step: 0.1, labels: [0, 0.5, 1], snap: 0.01 }, tries: 0 };
  async function placeAt(v) { const s = slider('[data-nl-order]'); await key(s, 'Home'); await presses(slider('[data-nl-order]'), 'PageUp', Math.floor(v * 10 + 1e-9)); await presses(slider('[data-nl-order]'), 'ArrowRight', Math.round((v * 10 - Math.floor(v * 10 + 1e-9)) * 10)); }
  it('names the percent slip and the swapped pair, then pays support XP on the fixed second try', async () => {
    await mount({ tab: 'order', ord: { item, pos: [null, null, null, null], sel: 0, status: 'open', tries: 0, hints: 0 } });
    const chips = () => [...document.querySelectorAll('[role="radiogroup"] [role="radio"]')];
    expect(chips()).toHaveLength(4);
    expect(chips().filter((c) => c.tabIndex === 0)).toHaveLength(1);
    await click(btn('Check my order'));
    expect(txt()).toContain('Place every number first. 3/4 is not on the line yet.');
    await placeAt(0.75);
    await key(chips()[0], 'ArrowRight');
    expect(latest.ord.sel).toBe(1);
    await placeAt(0.38);
    await click(chips()[2]); await placeAt(0.6);
    await click(chips()[3]); await placeAt(0.5);
    expect(latest.ord.pos).toEqual([0.75, 0.38, 0.6, 0.5]);
    expect(slider('[data-nl-order]').getAttribute('aria-valuetext')).toMatch(/^0\.5: Your marker is on the labelled tick 0\.5\.$/);
    expect(document.getElementById('nl-ord-desc').textContent).toContain('Your line, from left to right: 0.375, 0.5, 8%, 3/4.');
    await click(btn('Check my order'));
    expect(document.querySelector('[data-nlb-mis]').getAttribute('data-nlb-mis')).toBe('ord_percent_whole');
    expect(txt()).toContain('You put 0.5 to the left of 8%, but 0.5 is the greater number.');
    await click(chips()[2]); await placeAt(0.08);
    await click(btn('Check my order'));
    expect(latest.ord.status).toBe('correct');
    expect(xp.filter((x) => x[0] === 'numberline')).toEqual([['numberline', 2, 'Ordering numbers']]);
    expect(txt()).toContain('From least to greatest: 8% < 0.375 < 0.5 < 3/4.');
  });
});

describe('ruler and line plot', () => {
  it('measuring to the nearest half: the exact eighth reading is named, the rounded one is accepted', async () => {
    const item = { id: 'ms-1', kind: 'measure', band: 'b45', rd: 8, prec: 2, start: 0, len: 2.375, end: 2.375, target: 2.5, thing: 'pencil', tries: 0 };
    await mount({ tab: 'measure', nlbSolved: { measure: 9 }, ms: { item, text: '', status: 'open', tries: 0, hints: 0 } });
    const ruler = document.querySelector('svg[data-nl-ruler="8"]');
    expect(ruler.getAttribute('aria-label')).toContain('the tick 3 eighth-inch spaces past the 2-inch mark');
    expect(ruler.getAttribute('aria-label')).not.toMatch(/2 1\/2|2 3\/8|2\.5/);
    const input = document.getElementById('nl-ms-input');
    await type(input, '2 3/8');
    await click(btn('Check my answer'));
    expect(txt()).toContain('Round to the unit asked for');
    await type(document.getElementById('nl-ms-input'), '2 1/2 in');
    await click(btn('Check my answer'));
    expect(latest.ms.status).toBe('correct');
    expect(xp.filter((x) => x[0] === 'numberline')).toEqual([['numberline', 1, 'Ruler measurement']]);
    expect(txt()).toContain('To the nearest 1/2 inch, 2 3/8 inches rounds to 2 1/2 inches.');
  });
  it('builds a line plot from the keyboard, names a missing mark, then answers from the plot', async () => {
    const E = window.StemLab._registry.numberline._engine;
    const item = ENG().genLinePlot('b45', E.seeded(42));
    await mount({ tab: 'measure', msMode: 'plot', lp: { item, counts: item.counts.map(() => 0), sel: 0, struck: {}, status: 'open', tries: 0, q: {} } });
    const cols = () => [...document.querySelectorAll('[role="toolbar"] button')];
    expect(cols()).toHaveLength(item.cols);
    expect(cols().filter((b) => b.tabIndex === 0)).toHaveLength(1);
    const first = item.counts.findIndex((n) => n > 0);
    for (let c = 0; c < item.cols; c++) await presses(cols()[c], 'ArrowUp', item.counts[c] - (c === first ? 1 : 0));
    expect(cols()[first].getAttribute('aria-label')).toMatch(new RegExp(item.counts[first] - 1 + ' X marks$'));
    await click(btn('Check my line plot'));
    expect(document.querySelector('[data-nlb-mis]').getAttribute('data-nlb-mis')).toBe('lp_too_few');
    await key(cols()[first], 'ArrowUp');
    await key(cols()[first], 'ArrowUp');
    await key(cols()[first], 'Delete');
    expect(latest.lp.counts).toEqual(item.counts);
    await click(btn('Check my line plot'));
    expect(latest.lp.status).toBe('correct');
    expect(xp.filter((x) => x[0] === 'numberline')).toEqual([['numberline', 2, 'Line plot']]);
    const q0 = item.questions[0];
    const input = document.getElementById('nl-lpq-0');
    expect(input).toBeTruthy();
    await type(input, ENG().lpText(item, q0.answer));
    await click([...document.querySelectorAll('[data-nl-lp-questions] button')].find((b) => b.textContent === 'Check my answer'));
    expect(latest.lp.q[0].status).toBe('correct');
    expect(xp.filter((x) => x[0] === 'numberline').at(-1)).toEqual(['numberline', 2, 'Line plot question']);
  });
});

describe('integers in context', () => {
  const temp = { min: -20, max: 20, step: 1, labels: [-20, -15, -10, -5, 0, 5, 10, 15, 20], snap: 1, vertical: true };
  const money = { min: -50, max: 50, step: 5, labels: [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50], snap: 5, vertical: false };
  it('a vertical thermometer slider: Up raises, Down lowers, described as "above"; graded by position', async () => {
    const item = { id: 'ic-1', kind: 'icPlace', band: 'b6', ctx: 'temp', unit: 'F', line: temp, target: -7, answer: 'position', names: ['Ana', 'Ben'], tries: 0 };
    await mount({ tab: 'intctx', ic: { item, pos: null, status: 'open', tries: 0, hints: 0 } });
    const s = () => document.querySelector('svg[data-nl-vertical][role="slider"]');
    expect(s().getAttribute('aria-orientation')).toBe('vertical');
    await key(s(), 'ArrowUp');
    expect(latest.ic.pos).toBe(0);
    await presses(s(), 'ArrowDown', 7);
    expect(latest.ic.pos).toBe(-7);
    expect(s().getAttribute('aria-valuetext')).toBe('Your marker is on the tick 3 spaces above the labelled tick −10.');
    await key(s(), 'PageUp');
    expect(latest.ic.pos).toBe(-2);
    await key(s(), 'PageDown');
    await click(btn('Check my placement'));
    expect(xp.filter((x) => x[0] === 'numberline')).toEqual([['numberline', 3, 'Integers in context']]);
    await click(btn('Horizontal line'));
    expect(document.querySelector('svg[data-nl-vertical]')).toBeNull();
    expect(slider('[data-nl-intctx]')).toBeTruthy();
  });
  it('"who owes more" names the balance-versus-debt slip and states the order sentence', async () => {
    const item = { id: 'ic-2', kind: 'icDebt', band: 'b6', ctx: 'money', unit: 'F', line: money, a: -30, b: -10, ask: 'debt', answerIdx: 0, answer: 'choice', binary: true, names: ['Ana', 'Ben'], tries: 0 };
    await mount({ tab: 'intctx', ic: { item, status: 'open', tries: 0, hints: 0 } });
    expect(txt()).toContain('Ana’s balance is −$30. Ben’s balance is −$10. Who owes more money?');
    await click(btn('Ben'));
    await click(btn('Check my answer'));
    expect(txt()).toContain('Owing more is a lower balance');
    // Stage C (intended): the order sentence (the answer) is no longer shown after one miss.
    expect(txt()).not.toContain('Ana owes $30 and Ben owes $10. Ana owes more, even though −30 < −10');
    expect(latest.ic.status).toBe('open');
    expect(latest.ppMissed[0]).toMatchObject({ type: 'icDebt', mis: 'ic_debt_balance', answer: 'Ben', correct: 'Ana' });
    await click(btn('Ana'));
    await click(btn('Check my answer'));
    expect(latest.ic.status).toBe('correct');
    expect(txt()).toContain('Ana owes $30 and Ben owes $10. Ana owes more, even though −30 < −10');
    expect(xp).toEqual([]);
  });
  it('the teacher can lock the line direction', async () => {
    const item = { id: 'ic-3', kind: 'icPlace', band: 'b6', ctx: 'elev', unit: 'F', line: { min: -50, max: 50, step: 5, labels: money.labels, snap: 5, vertical: true }, target: -35, answer: 'position', names: ['Ana', 'Ben'], tries: 0 };
    await mount({ tab: 'intctx', teacher: { icDir: 'horizontal' }, ic: { item, status: 'open', tries: 0 } });
    expect(document.querySelector('svg[data-nl-vertical]')).toBeNull();
    expect(btn('Vertical line').disabled).toBe(true);
    expect(txt()).toContain('Your teacher chose the line direction.');
  });
});

describe('CER investigation', () => {
  it('predict, collect evidence, reject an "always" claim with the student’s own row, accept the backed claim once', async () => {
    await mount({ tab: 'magCompare' });
    const sec = () => document.querySelector('[data-nl-cer]');
    expect(sec().getAttribute('data-nl-cer')).toBe('predict');
    expect(document.getElementById('nl-cer-a0')).toBeNull();            // no evidence tools before a prediction
    await click(document.querySelector('input[name="nl-cer-pred"][value="always"]'));
    await click(btn('Lock in my prediction'));
    const pairs = [[[1, 3], [1, 5]], [[2, 5], [2, 7]], [[3, 4], [1, 2]]];
    for (const [a, b] of pairs) {
      await setSelect(document.getElementById('nl-cer-a0'), a[0]); await setSelect(document.getElementById('nl-cer-a1'), a[1]);
      await setSelect(document.getElementById('nl-cer-b0'), b[0]); await setSelect(document.getElementById('nl-cer-b1'), b[1]);
      await click(btn('Add this pair to my evidence'));
    }
    expect(latest.cer.rows).toHaveLength(3);
    expect(btn('This pair is already in your table').disabled).toBe(true);
    await click(document.querySelector('input[name="nl-cer-claim"][value="always"]'));
    await click(btn('Check my conclusion'));
    expect(txt()).toContain('Look at row 3 of your evidence');
    expect(xp).toEqual([]);
    await click(document.querySelector('input[name="nl-cer-claim"][value="sameNum"]'));
    await setSelect(document.getElementById('nl-cer-cite'), 2);
    await click(document.querySelector('input[name="nl-cer-reason"][value="bigger_numbers"]'));
    await click(btn('Check my conclusion'));
    expect(txt()).toContain('Bigger numbers, bigger fraction?');
    await click(document.querySelector('input[name="nl-cer-reason"][value="pieces"]'));
    await click(btn('Check my conclusion'));
    expect(sec().getAttribute('data-nl-cer')).toBe('done');
    expect(latest.cerDone).toBe(true);
    expect(xp.filter((x) => x[0] === 'numberline')).toEqual([['numberline', 10, 'Fraction investigation']]);
    expect(txt()).toContain('Your evidence changed your mind');
  });
  it('a completed investigation does not pay twice', async () => {
    await mount({ tab: 'magCompare', cerDone: true, cer: { pred: 'sameNum', rows: [{ a: [1, 3], b: [1, 5] }, { a: [2, 5], b: [2, 7] }, { a: [3, 4], b: [1, 2] }], claim: 'sameNum', cite: 2, reason: 'pieces' } });
    expect(txt()).toContain('You finished this investigation before');
    await click(btn('Check my conclusion'));
    expect(latest.cer.done).toBe(true);
    expect(xp).toEqual([]);
  });
});

describe('touch-drag robustness', () => {
  const placeItem = { v: 2, id: 'drag-item', type: 'placeWhole', band: 'b23', answer: 'position', tries: 0, target: 7, text: '7', snap: 1, tol: 0.49, line: { min: 0, max: 10, step: 1, labels: [0, 5, 10] } };
  const ppState = { tab: 'challenges', challengeMode: 'place', ppSolvedByType: { placeWhole: 9 }, pp: { item: placeItem, pos: null, text: '', tries: 0, hints: 0, status: 'open', fb: null, exampleOpen: false } };
  const pev = (type, id, x) => { const e = new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 40 }); Object.defineProperty(e, 'pointerId', { value: id }); return e; };
  const xFor = (v) => 44 + v * 61.2;
  it('captures the pointer, ignores a second finger, and stops when capture is lost', async () => {
    const proto = window.SVGElement.prototype;
    const saved = { set: proto.setPointerCapture, rel: proto.releasePointerCapture, has: proto.hasPointerCapture };
    const cap = vi.fn(), rel = vi.fn();
    proto.setPointerCapture = cap; proto.releasePointerCapture = rel; proto.hasPointerCapture = () => true;
    try {
      await mount(ppState);
      const s = document.querySelector('[data-place-practice] svg[role="slider"]');
      Object.defineProperty(s, 'getBoundingClientRect', { value: () => ({ left: 0, top: 0, width: 700, height: 160, right: 700, bottom: 160 }) });
      await React.act(async () => { s.dispatchEvent(pev('pointerdown', 7, xFor(2))); });
      expect(cap).toHaveBeenCalledWith(7);
      expect(latest.pp.pos).toBe(2);
      await React.act(async () => { window.dispatchEvent(pev('pointermove', 8, xFor(9))); });
      expect(latest.pp.pos).toBe(2);                                   // a second finger does not move it
      await React.act(async () => { window.dispatchEvent(pev('pointermove', 7, xFor(5))); });
      expect(latest.pp.pos).toBe(5);
      await React.act(async () => { s.dispatchEvent(pev('lostpointercapture', 7, 0)); });
      await React.act(async () => { window.dispatchEvent(pev('pointermove', 7, xFor(8))); });
      expect(latest.pp.pos).toBe(5);                                   // the drag ended with the capture
      await React.act(async () => { s.dispatchEvent(pev('pointerdown', 3, xFor(6))); });
      await React.act(async () => { window.dispatchEvent(pev('pointerup', 3, xFor(6))); });
      expect(rel).toHaveBeenCalledWith(3);
    } finally { proto.setPointerCapture = saved.set; proto.releasePointerCapture = saved.rel; proto.hasPointerCapture = saved.has; }
  });
  it('a coarse (touch) pointer gets a taller hit area and a bigger handle', async () => {
    const mm = window.matchMedia;
    window.matchMedia = (q) => ({ matches: /pointer:\s*coarse/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    try {
      await mount(Object.assign({}, ppState, { pp: Object.assign({}, ppState.pp, { pos: 4 }) }));
      const s = document.querySelector('[data-place-practice] svg[role="slider"]');
      expect(s.style.minHeight).toBe('96px');
      expect([...s.querySelectorAll('circle')].some((c) => c.getAttribute('r') === '13')).toBe(true);
    } finally { window.matchMedia = mm; }
  });
});

describe('teacher view, keyboard shortcuts and old saved data', () => {
  it('the missed-items summary names the new misconceptions and item types', async () => {
    const missed = [{ type: 'dzCompare', band: 'b45', prompt: 'Compare 0.4 and 0.375. Choose the sentence that is true.', answer: '0.4 < 0.375', correct: '0.4 > 0.375', mis: 'longer_is_bigger', source: 'nlb', ts: 1 }];
    await mount({ tab: 'decimals', ppMissed: missed, ppStats: { dzCompare: { served: 2, correct: 1, missed: 1 } } }, { isTeacherMode: true });
    const panel = document.querySelector('[data-numberline-teacher]');
    expect(panel.textContent).toContain('Longer decimal, bigger number?');
    expect(panel.textContent).toContain('Decimal zoom: compare decimals');
    expect(panel.textContent).toContain('Results by item type (all activities)');
    await click([...panel.querySelectorAll('button')].find((b) => b.textContent === '1/8'));
    expect(latest.teacher.msPrec).toBe(8);
  });
  it('number keys 6-9 open the new tabs from the tool area', async () => {
    await mount({ tab: 'explore' });
    const panel = document.querySelector('[role="tabpanel"]');
    // Stage C: keys follow the tabs as shown (ordered by grade band), so read the order.
    const shown = [...document.querySelectorAll('[role="tab"]')].map((b) => b.id.replace('numberline-tab-', ''));
    for (const k of ['6', '7', '8', '9']) { await key(document.querySelector('[role="tabpanel"]'), k); expect(latest.tab).toBe(shown[Number(k) - 1]); }
    expect(document.querySelectorAll('[role="tab"]')).toHaveLength(9);
    expect(panel).toBeTruthy();
  });
  it('malformed saved activity state is dropped, never crashes', async () => {
    const bad = [
      { tab: 'decimals', dz: 'junk' },
      { tab: 'decimals', dz: { mode: 'place', item: { kind: 'dzPlace' }, lo: 'NaN', level: 99, pos: 'x' } },
      { tab: 'order', ord: { item: { nums: 5, line: null }, pos: 'x' } },
      { tab: 'order', ord: { item: { nums: [{ text: 1 }], line: {} } } },
      { tab: 'measure', ms: { item: { kind: 'measure', rd: 3 } } },
      { tab: 'measure', msMode: 'plot', lp: { item: { kind: 'lineplot', counts: [1, 2] }, counts: 'bad' } },
      { tab: 'intctx', ic: { item: { kind: 'bogus', line: {} } } },
      { tab: 'intctx', ic: { item: { kind: 'icPlace', line: { min: 0 } } } },
      { tab: 'magCompare', cer: { rows: [{ a: 'x' }, null], a: [0, 0], b: 'y', pred: 'always' } },
    ];
    for (const state of bad) {
      await mount(state);
      expect(document.querySelector('[role="tabpanel"]').textContent.length, JSON.stringify(state)).toBeGreaterThan(50);
      await React.act(async () => root.unmount()); root = null;
    }
    expect(errors).toEqual([]);
  });
});
