// Area Model engagement build (2026-11-04): path Start starts the challenge and lands
// on it, the answer boxes light the rectangle, draggable cut lines with partial
// products from the real model, a rectangle that uses the width, student-facing labels.
// Each block fails on the build start copy (AREAMODEL_ENGAGE_SRC points the suite at it).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.AREAMODEL_ENGAGE_SRC || 'stem_lab/stem_tool_areamodel.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let errors = [];
let C = null;
let scrolled = [];
beforeEach(() => {
  resetStemLab();
  C = loadTool(FILE, 'areamodel')._core;
  document.body.innerHTML = '<div id="root"></div>';
  errors = [];
  scrolled = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } }));
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
  Element.prototype.scrollIntoView = function (opts) { scrolled.push({ el: this, opts }); };
});
afterEach(async () => {
  if (root) await React.act(async () => { root.unmount(); });
  root = null;
  document.body.innerHTML = '';
  delete Element.prototype.scrollIntoView;
  vi.restoreAllMocks();
});

async function mount(seed, extra) {
  const out = { latest: null, award: vi.fn(), announce: vi.fn() };
  function App() {
    const [state, setState] = React.useState({ _areamodel: seed || {} });
    out.latest = state._areamodel;
    return window.StemLab._registry.areamodel.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, awardXP: out.award, announceToSR: out.announce, gradeLevel: '4th Grade' }, extra || {})));
  }
  if (root) { await React.act(async () => { root.unmount(); }); }
  document.body.innerHTML = '<div id="root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return out;
}
const q = (sel) => document.querySelector(sel);
const qa = (sel) => [...document.querySelectorAll(sel)];
const btn = (label) => qa('button').find((b) => b.getAttribute('aria-label') === label || b.textContent.trim() === label);
async function click(el) { await React.act(async () => { el.click(); }); }
async function settle(ms) { await React.act(async () => { await new Promise((r) => setTimeout(r, ms || 30)); }); }
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function key(el, k) { await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }); }
const prompt = () => q('[data-challenge-prompt]');
const regionState = (i) => q('[data-partial-region="' + i + '"]').getAttribute('data-region-state');
const regionText = (i) => { const n = q('[data-region-text="' + i + '"]'); return n ? n.textContent : null; };

describe('1. path Start starts the step\'s challenge and lands the student on it', () => {
  it('grade 4 step 1 opens a Partial Products challenge, focuses its question and scrolls it in', async () => {
    const m = await mount({});
    expect(m.latest.challenge == null).toBe(true);
    await click(q('[data-path-go="g4_partial"]'));
    await settle();
    expect(m.latest.viewMode).toBe('multidigit');
    expect(m.latest.challenge && m.latest.challenge.mode).toBe('multidigit');
    expect(document.activeElement).toBe(prompt());
    expect(prompt().textContent).toContain(m.latest.challenge.a + ' × ' + m.latest.challenge.b);
    // The question sits in the model card, above the rectangle.
    const card = q('[data-partial-card]');
    expect(card.contains(prompt())).toBe(true);
    expect(prompt().compareDocumentPosition(card.querySelector('svg')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(scrolled.some((s) => s.el === prompt() && s.opts && s.opts.block === 'start')).toBe(true);
    expect(errors).toEqual([]);
  });

  it('grade 3 step 1 opens a grid challenge; a step whose challenge is already open keeps it', async () => {
    // The full list is open (pathOpen) so a later step can be opened directly.
    const m = await mount({ pathOpen: true }, { gradeLevel: '3rd Grade' });
    await click(q('[data-path-go="g3_grid1"]'));
    await settle();
    expect(m.latest.challenge && m.latest.challenge.mode).toBe('basic');
    expect(document.activeElement).toBe(prompt());
    const id = m.latest.challenge.id;
    await click(q('[data-path-go="g3_grid3"]'));
    await settle();
    expect(m.latest.challenge.id).toBe(id);
    expect(m.latest.streak || 0).toBe(0);
  });

  it('a step on a tab without challenges focuses its first learning control', async () => {
    await mount({ pathOpen: true });
    await click(q('[data-path-go="g4_algo"]'));
    await settle();
    expect(document.activeElement && document.activeElement.id).toBe('am-algo-input');
  });

  it('starting a challenge from the challenge card does not drop focus to the page', async () => {
    const m = await mount({ viewMode: 'multidigit' });
    await click(btn('Partial'));
    await settle();
    expect(m.latest.challenge.mode).toBe('multidigit');
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(prompt());
  });
});

describe('2. answer boxes are linked to the rectangle', () => {
  const ch = { id: 'e1', a: 23, b: 14, answer: 322, mode: 'multidigit', question: 'Use partial products to find 23 × 14.' };
  it('a right box fills its region with its area; a wrong box outlines its region with the named note', async () => {
    await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 }, challenge: ch });
    expect([0, 1, 2, 3].map(regionState)).toEqual(['open', 'open', 'open', 'open']);
    expect([0, 1, 2, 3].map(regionText)).toEqual(['?', '?', '?', '?']);
    expect(q('[data-partial-model]').textContent).not.toMatch(/200|80|30|12[^0-9]/);
    await type(q('[data-box-input="b0"]'), '200');
    await type(q('[data-box-input="b1"]'), '24');
    await click(q('[data-check-boxes]'));
    expect(regionState(0)).toBe('ok');
    expect(regionText(0)).toBe('200');
    expect(regionState(1)).toBe('wrong');
    expect(regionText(1)).toBe('?');
    expect(q('[data-partial-region="1"]').getAttribute('stroke-dasharray')).toBeTruthy();
    expect(q('[data-region-notes]').textContent).toContain('20 × 4');
    expect(q('[data-region-notes]').textContent).not.toContain('80');
    expect([2, 3].map(regionText)).toEqual(['?', '?']);
    // The student's own right entry shows on its partial-product button too; the others stay hidden.
    expect(q('[data-partial-button="0"]').getAttribute('aria-label')).toBe('Select partial product: 20×10 = 200');
    expect(q('[data-partial-button="1"]').getAttribute('aria-label')).toBe('Select partial product: 20×4');
    expect(q('#am-partial-desc').textContent).toContain('20 × 10 = 200');
    expect(q('#am-partial-desc').textContent).not.toContain('80');
  });

  it('outside a challenge every region prints its area from the model', async () => {
    await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 } });
    const bm = C.boxModel(23, 14);
    expect(bm.boxes.map((bx) => regionText(bx.index))).toEqual(bm.boxes.map((bx) => String(bx.value)));
  });

  it('predict-first keeps the region areas hidden until the prediction is in', async () => {
    await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 }, predictFirst: true });
    expect([0, 1, 2, 3].map(regionText)).toEqual(['?', '?', '?', '?']);
  });
});

describe('3. draggable cut lines, products from the real model', () => {
  it('the core splits a side anywhere and the parts always add back to the product', () => {
    expect(C.defaultCuts(23)).toEqual([20]);
    expect(C.defaultCuts(305)).toEqual([300]);
    expect(C.defaultCuts(7)).toEqual([]);
    expect(C.defaultCuts(2.5)).toEqual([20]);
    expect(C.cleanCuts(23, [0])).toBeNull();
    expect(C.cleanCuts(23, [23])).toBeNull();
    expect(C.cleanCuts(23, [12, 10])).toBeNull();
    expect(C.cleanCuts(23, [1.5])).toBeNull();
    expect(C.cleanCuts(23, [12])).toEqual([12]);
    expect(C.moveCut(23, [20], 0, 99)).toEqual([22]);
    expect(C.moveCut(23, [20], 0, -5)).toEqual([1]);
    expect(C.moveCut(1234, [1000, 1200, 1230], 1, 999)).toEqual([1000, 1001, 1230]);
    for (let k = 0; k < 200; k += 1) {
      const a = 2 + Math.floor(Math.random() * 400), b = 2 + Math.floor(Math.random() * 90);
      const ca = 1 + Math.floor(Math.random() * (a - 1)), cb = 1 + Math.floor(Math.random() * (b - 1));
      const m = C.cutModel(a, b, [ca], [cb]);
      expect(m.total).toBe(a * b);
      expect(m.boxes.map((bx) => bx.value)).toEqual([ca * cb, ca * (b - cb), (a - ca) * cb, (a - ca) * (b - cb)]);
    }
    const d = C.cutModel(2.5, 1.2, [15], [5]);
    expect(d.total).toBe(C.product(2.5, 1.2));
    expect(d.boxes.map((bx) => bx.label)).toEqual(['1.5×0.5', '1.5×0.7', '1×0.5', '1×0.7']);
  });

  it('arrow keys on a cut handle re-split the side; the products come from the model', async () => {
    const m = await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 } });
    const hA = q('[data-cut-handle="A0"]');
    expect(hA.getAttribute('role')).toBe('slider');
    expect(hA.getAttribute('aria-valuetext')).toBe('23 split into 20 + 3');
    hA.focus();
    await key(hA, 'ArrowLeft');
    expect(m.latest.cuts).toEqual({ key: '23x14', A: [19], B: [10] });
    // Focus stays on the handle while it moves.
    expect(document.activeElement).toBe(q('[data-cut-handle="A0"]'));
    expect(q('[data-cut-handle="A0"]').getAttribute('aria-valuetext')).toBe('23 split into 19 + 4');
    const bm = C.cutModel(23, 14, [19], [10]);
    expect(qa('[data-partial-button]').slice(0, 4).map((b) => b.getAttribute('aria-label')).sort()).toEqual(bm.boxes.map((bx) => 'Select partial product: ' + bx.label + ' = ' + bx.value).sort());
    expect(bm.boxes.map((bx) => regionText(bx.index))).toEqual(['190', '76', '40', '16']);
    expect(q('[data-cut-readout]').textContent).toContain('19 + 4');
    await key(q('[data-cut-handle="A0"]'), 'End');
    expect(m.latest.cuts.A).toEqual([22]);
    await key(q('[data-cut-handle="A0"]'), 'Home');
    expect(m.latest.cuts.A).toEqual([1]);
    await click(q('[data-cuts-reset]'));
    expect(m.latest.cuts).toBeNull();
    expect(regionText(0)).toBe('200');
  });

  it('a pointer drag moves a cut line and announces the new split once', async () => {
    const m = await mount({ viewMode: 'multidigit', multiDims: { a: 44, b: 12 } });
    const svg = q('[data-cut-wrap] svg');
    const vb = svg.getAttribute('viewBox').split(' ').map(Number);
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: vb[2], height: vb[3], right: vb[2], bottom: vb[3] });
    const handle = q('[data-cut-handle="A0"]');
    // 44 runs across the top: drag its cut to the middle of the rectangle (x = 65 + half the width).
    const mid = 65 + (vb[2] - 100) / 2;
    const fire = (el, type, x, y) => React.act(async () => { el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 })); });
    m.announce.mockClear();
    await fire(handle, 'pointerdown', 65 + 400, 40);
    await fire(q('[data-cut-handle="A0"]'), 'pointermove', mid, 40);
    await fire(q('[data-cut-handle="A0"]'), 'pointerup', mid, 40);
    expect(m.latest.cuts.A).toEqual([22]);
    expect(m.announce.mock.calls.map((c) => c[0])).toEqual(['44 split into 22 + 22']);
  });

  it('in a challenge the cut moves too, but every area stays "?" until it is typed right', async () => {
    const m = await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 }, challenge: { id: 'e2', a: 23, b: 14, answer: 322, mode: 'multidigit', question: 'q' } });
    await type(q('[data-box-input="b0"]'), '200');
    await click(q('[data-check-boxes]'));
    expect(regionText(0)).toBe('200');
    await key(q('[data-cut-handle="B0"]'), 'ArrowLeft');
    expect(m.latest.cuts.B).toEqual([9]);
    // New boxes, so the old entries are cleared and nothing is shown.
    expect([0, 1, 2, 3].map(regionText)).toEqual(['?', '?', '?', '?']);
    const bm = C.cutModel(23, 14, [20], [9]);
    const text = q('[role="tabpanel"]').textContent;
    bm.boxes.forEach((bx) => expect(text.includes(String(bx.value)), bx.label).toBe(false));
    expect(text).not.toContain('322');
    const box = bm.boxes.find((bx) => bx.label === '20×9');
    await type(q('[data-box-input="b' + box.index + '"]'), '180');
    await click(q('[data-check-boxes]'));
    expect(regionText(box.index)).toBe('180');
    expect(m.award).not.toHaveBeenCalled();
  });
});

describe('4. the rectangle uses the width', () => {
  it('a tall product is drawn with its longer side across, and the drawing may grow to fill the card', async () => {
    await mount({ viewMode: 'multidigit', multiDims: { a: 44, b: 12 } });
    const svg = q('[data-cut-wrap] svg');
    const vb = svg.getAttribute('viewBox').split(' ').map(Number);
    expect(svg.getAttribute('data-across')).toBe('true');
    expect(vb[2]).toBeGreaterThan(vb[3] * 2);
    expect(parseFloat(q('[data-cut-wrap]').style.maxWidth)).toBeGreaterThan(900);
    // To scale: the 40 × 10 region keeps its area ratio to 4 × 10.
    const area = (i) => +q('[data-partial-region="' + i + '"]').getAttribute('width') * +q('[data-partial-region="' + i + '"]').getAttribute('height');
    expect(area(0) / area(2)).toBeCloseTo(10);
    // The table follows the drawing: Factor A's parts head the columns.
    expect(qa('thead th').map((th) => th.textContent)).toEqual(['×', '40', '4']);
  });
  it('a product whose second factor is longer keeps factor A down the side', async () => {
    await mount({ viewMode: 'multidigit', multiDims: { a: 12, b: 44 } });
    expect(q('[data-cut-wrap] svg').getAttribute('data-across')).toBeNull();
    expect(qa('thead th').map((th) => th.textContent)).toEqual(['×', '40', '4']);
  });
});

describe('5. student-facing labels and settings', () => {
  it('no standard codes in the level names students see; level and predict sit in Settings', async () => {
    await mount({});
    const opts = qa('#am-band option').map((o) => o.textContent);
    opts.forEach((o) => expect(o).not.toMatch(/\d\.(NBT|NF|OA)\./));
    expect(q('[data-areamodel-path] h3').textContent).not.toMatch(/NBT/);
    const settings = q('details[data-areamodel-settings]');
    expect(settings).toBeTruthy();
    expect(settings.open).toBe(false);
    expect(settings.contains(q('#am-band'))).toBe(true);
    const predict = qa('input[type="checkbox"]').find((i) => i.parentElement.textContent.includes('Predict before I see the product'));
    expect(settings.contains(predict)).toBe(true);
    expect(settings.querySelector('summary').textContent).toContain('Grade 4');
  });
  it('the teacher panel keeps the standard codes', async () => {
    await mount({}, { isTeacherMode: true });
    const teacherOpts = qa('[data-teacher-control="band"] option').map((o) => o.textContent);
    expect(teacherOpts.join(' ')).toContain('4.NBT.5');
  });
});

// Follow-up (calmer first screen): the path folds to one "Next: step N ... Start" line
// with a "Show all steps" disclosure, so the factors and the model move up.
describe('6. the path folds to one Next line', () => {
  const words = (s) => s.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const toggle = () => q('[data-path-toggle]');
  it('a first visit shows one Next line with a Start button, and no step list', async () => {
    await mount({});
    const path = q('[data-areamodel-path]');
    expect(path.getAttribute('data-path-compact')).toBe('true');
    expect(qa('[data-path-step]')).toHaveLength(0);
    expect(qa('[data-path-go]').map((b) => b.getAttribute('data-path-go'))).toEqual(['g4_partial']);
    const go = q('[data-path-go]');
    expect(go.textContent).toBe('Start');
    expect(go.getAttribute('aria-label')).toBe('Start step 1: Partial Products: solve 2 multi-digit challenges');
    expect(q('[data-path-next]').textContent).toBe('Next: step 1: Partial Products: solve 2 multi-digit challenges (0 of 2)');
    expect(path.querySelector('h3').textContent).toBe('Start here');
    expect(toggle().textContent).toBe('Show all steps');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().hasAttribute('aria-controls')).toBe(false);
    // Short: the folded path is one line of words, not a five-row list.
    expect(words(path.textContent)).toBeLessThanOrEqual(24);
    // Start comes before the disclosure in the tab order; the tabs, then the factors, follow the path.
    expect(go.compareDocumentPosition(toggle()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(path.compareDocumentPosition(q('[role="tablist"]')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(path.nextElementSibling).toBe(q('[role="tablist"]'));
    expect(errors).toEqual([]);
  });

  it('"Show all steps" opens the full list in the level\'s order, keeps focus, and folds again', async () => {
    const m = await mount({});
    toggle().focus();
    const el = toggle();
    await click(el);
    expect(m.latest.pathOpen).toBe(true);
    expect(toggle()).toBe(el);
    expect(document.activeElement).toBe(el);
    expect(el.getAttribute('aria-expanded')).toBe('true');
    expect(el.getAttribute('aria-controls')).toBe('am-path-list');
    expect(q('#am-path-list')).toBeTruthy();
    expect(el.textContent).toBe('Hide the steps');
    expect(qa('[data-path-step]').map((li) => li.getAttribute('data-path-step'))).toEqual(['g4_partial', 'g4_algo', 'g4_div', 'g4_longdiv', 'g4_rem']);
    expect(q('[data-path-next]')).toBeNull();
    expect(q('[data-areamodel-path] h3').textContent).toBe('Start here: Grade 4: multiplying bigger numbers');
    await click(el);
    expect(m.latest.pathOpen).toBe(false);
    expect(qa('[data-path-step]')).toHaveLength(0);
    expect(document.activeElement).toBe(el);
  });

  it('the Next line follows the saved progress, and its Start starts that step', async () => {
    const m = await mount({ basicSolved: 3, distSolved: 1 }, { gradeLevel: '3rd Grade' });
    expect(q('[data-path-next]').getAttribute('data-path-next')).toBe('g3_dist3');
    expect(q('[data-path-next]').textContent).toBe('Next: step 4: Distributive: solve 3 split-array challenges (1 of 3)');
    expect(q('[data-path-count]').textContent).toBe('3 of 5 done');
    await click(q('[data-path-go="g3_dist3"]'));
    await settle();
    expect(m.latest.viewMode).toBe('distributive');
    expect(m.latest.challenge && m.latest.challenge.mode).toBe('distributive');
    expect(document.activeElement).toBe(prompt());
    expect(m.award).not.toHaveBeenCalled();
  });

  it('a finished path says so on the folded line', async () => {
    await mount({ basicSolved: 3, distSolved: 3, wordSolved: 1 }, { gradeLevel: '3rd Grade' });
    expect(q('[data-path-go]')).toBeNull();
    expect(q('[data-path-all-done]').textContent).toBe('You finished the path for this level. Try the More tabs, or a harder level.');
  });

  it('teacher locks still hold: hidden tabs drop out of the Next line, a locked level sets it, a hidden path stays hidden', async () => {
    await mount({ multiSolved: 2, algorithmSolved: 1, teacher: { hidden: { division: true } } });
    expect(q('[data-path-next]').getAttribute('data-path-next')).toBe('g4_rem');
    expect(q('[data-path-next]').textContent).toContain('step 3:');
    expect(q('[data-path-count]').textContent).toBe('2 of 3 done');
    await mount({ band: 'g3', teacher: { lockBand: true, band: 'g5' } });
    expect(q('[data-areamodel-path]').getAttribute('data-areamodel-path')).toBe('g5');
    expect(q('[data-path-go]').getAttribute('data-path-go')).toBe('g5_dec');
    await mount({ teacher: { hidePath: true } });
    expect(q('[data-areamodel-path]')).toBeNull();
  });
});
