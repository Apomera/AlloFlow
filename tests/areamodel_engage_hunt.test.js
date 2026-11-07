// Independent hunt of the Area Model engagement build (2026-11-04). Each test fails on the
// hunt's start copy (AREAMODEL_HUNT_SRC points the suite at it) and passes on the tool.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.AREAMODEL_HUNT_SRC || 'stem_lab/stem_tool_areamodel.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let C = null;
beforeEach(() => {
  resetStemLab();
  C = loadTool(FILE, 'areamodel')._core;
  document.body.innerHTML = '<div id="root"></div>';
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } }));
  Element.prototype.scrollIntoView = function () {};
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
  if (root) await React.act(async () => { root.unmount(); });
  document.body.innerHTML = '<div id="root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return out;
}
const q = (s) => document.querySelector(s);
const qa = (s) => [...document.querySelectorAll(s)];
async function click(el) { await React.act(async () => { el.click(); }); }
async function settle(ms) { await React.act(async () => { await new Promise((r) => setTimeout(r, ms || 30)); }); }
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function key(el, k) { await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }); }
// A phone-sized drawing: the viewBox shown at `scale` px per unit, at the page origin.
function stubSvg(scale) {
  const svg = q('[data-cut-wrap] svg');
  const vb = svg.getAttribute('viewBox').split(' ').map(Number);
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: vb[2] * scale, height: vb[3] * scale, right: vb[2] * scale, bottom: vb[3] * scale });
  return vb;
}
const fire = (el, type, x, y, id) => React.act(async () => {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  if (id != null) Object.defineProperty(ev, 'pointerId', { value: id });
  el.dispatchEvent(ev);
});
const OPEN = { id: 'h1', a: 23, b: 14, answer: 322, mode: 'multidigit', question: 'Use partial products to find 23 × 14.' };
const lum = (hex) => { const v = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

describe('dragging a cut', () => {
  it('a press where two handles overlap takes the nearer handle, not the one painted last', async () => {
    const m = await mount({ viewMode: 'multidigit', multiDims: { a: 44, b: 12 } });
    stubSvg(0.5);
    // At half scale the handles sit at A (232.5, 84) and B (252.5, 70): 44 px hit boxes overlap.
    await fire(q('[data-cut-handle="B0"]'), 'pointerdown', 233, 84);
    expect(document.activeElement).toBe(q('[data-cut-handle="A0"]'));
    await fire(q('[data-cut-handle="B0"]'), 'pointermove', 173, 84);
    await fire(q('[data-cut-handle="B0"]'), 'pointerup', 173, 84);
    expect(m.latest.cuts.B).toEqual([10]);
    expect(m.latest.cuts.A[0]).toBeLessThan(40);
  });

  it('a press that wobbles under 4 px is a tap: the cut stays and typed boxes survive', async () => {
    const boxes = { b0: { v: '200', st: 'ok' }, b1: { v: '80', st: 'ok' } };
    const m = await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 }, challenge: OPEN, chWork: { key: 'h1', attempts: 0, hints: 0, counted: false, revealed: false, boxes } });
    stubSvg(0.5);
    const h = q('[data-cut-handle="A0"]');
    await fire(h, 'pointerdown', 150, 200);
    await fire(h, 'pointermove', 152, 201);
    await fire(h, 'pointerup', 152, 201);
    expect(m.latest.cuts == null).toBe(true);
    expect(m.latest.chWork.boxes).toEqual(boxes);
  });

  it('a cut pressed off-centre moves by the distance dragged, with no jump', async () => {
    const m = await mount({ viewMode: 'multidigit', multiDims: { a: 44, b: 12 } });
    stubSvg(1);
    // A's handle is at x = 465; press 15 px right of it, then drag 100 px left (10 units at 10 px each).
    const h = q('[data-cut-handle="A0"]');
    await fire(h, 'pointerdown', 480, 168);
    await fire(q('[data-cut-handle="A0"]'), 'pointermove', 380, 168);
    await fire(q('[data-cut-handle="A0"]'), 'pointerup', 380, 168);
    expect(m.latest.cuts.A).toEqual([30]);
  });

  it('the handle being dragged takes focus, so the arrow keys carry on from it', async () => {
    await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 } });
    stubSvg(1);
    const h = q('[data-cut-handle="B0"]');
    await fire(h, 'pointerdown', 505, 180);
    expect(document.activeElement).toBe(q('[data-cut-handle="B0"]'));
    await fire(h, 'pointerup', 505, 180);
  });

  it('a second finger neither takes over the drag nor ends it', async () => {
    const m = await mount({ viewMode: 'multidigit', multiDims: { a: 44, b: 12 } });
    stubSvg(1);
    const a = q('[data-cut-handle="A0"]'), b = q('[data-cut-handle="B0"]');
    await fire(a, 'pointerdown', 465, 168, 1);
    await fire(b, 'pointerdown', 505, 140, 2);
    await fire(a, 'pointermove', 365, 168, 1);
    expect(m.latest.cuts.A).toEqual([30]);
    expect(m.latest.cuts.B).toEqual([10]);
    await fire(b, 'pointermove', 505, 90, 2);
    expect(m.latest.cuts.B).toEqual([10]);
    await fire(b, 'pointerup', 505, 90, 2);
    await fire(a, 'pointermove', 265, 168, 1);
    expect(m.latest.cuts.A).toEqual([20]);
    await fire(a, 'pointerup', 265, 168, 1);
  });
});

describe('touch on the drawn cut line', () => {
  it('the SVG strip is a block, or Chromium ignores its touch-action and cancels the drag (full CDP drag: hunt/probe_touchdrag.cjs)', async () => {
    await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 } });
    const strip = qa('[data-cut-wrap] line').find((l) => l.getAttribute('stroke') === 'transparent');
    expect(strip.style.touchAction).toBe('none');
    expect(strip.style.display).toBe('block');
  });
  it('a cancelled drag still announces where the cut ended up', async () => {
    const m = await mount({ viewMode: 'multidigit', multiDims: { a: 44, b: 12 } });
    stubSvg(1);
    const h = q('[data-cut-handle="A0"]');
    m.announce.mockClear();
    await fire(h, 'pointerdown', 465, 168);
    await fire(q('[data-cut-handle="A0"]'), 'pointermove', 365, 168);
    await fire(q('[data-cut-handle="A0"]'), 'pointercancel', 365, 168);
    expect(m.latest.cuts.A).toEqual([30]);
    expect(m.announce.mock.calls.map((c) => c[0])).toEqual(['44 split into 30 + 14']);
  });
});

describe('cut state', () => {
  it('Reset everything clears the cuts', async () => {
    const m = await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 } });
    await key(q('[data-cut-handle="A0"]'), 'ArrowLeft');
    expect(m.latest.cuts.A).toEqual([19]);
    await click(qa('button').find((b) => b.getAttribute('aria-label') === 'Reset everything'));
    expect(m.latest.cuts == null).toBe(true);
    expect(q('[data-cut-readout]')).toBeNull();
  });

  it('a factor with more than three place-value cuts can still be cut, and the total holds', async () => {
    const m = await mount({ viewMode: 'multidigit', multiDims: { a: 123.45, b: 2 } });
    expect(qa('[data-cut-handle]')).toHaveLength(4);
    await key(q('[data-cut-handle="A0"]'), 'ArrowLeft');
    expect(m.latest.cuts.A).toEqual([9999, 12000, 12300, 12340]);
    expect(q('[data-cut-handle="A0"]').getAttribute('aria-valuetext')).toBe('123.45 split into 99.99 + 20.01 + 3 + 0.4 + 0.05');
    expect(C.cutModel(123.45, 2, m.latest.cuts.A, []).total).toBe(246.9);
    expect(C.cleanCuts(23, [1, 2, 3, 4])).toBeNull();
  });

  it('moving a cut says the typed boxes were cleared, and the hint warned first; nothing is said when none were typed', async () => {
    let m = await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 }, challenge: OPEN });
    expect(q('[data-partial-card]').textContent).toContain('Moving a cut clears your boxes');
    await key(q('[data-cut-handle="A0"]'), 'ArrowLeft');
    expect(m.announce.mock.calls.map((c) => c[0])).toEqual([]);
    m = await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 }, challenge: OPEN });
    await type(q('[data-box-input="b0"]'), '200');
    await key(q('[data-cut-handle="A0"]'), 'ArrowLeft');
    expect(m.announce.mock.calls.map((c) => c[0])).toEqual(['The boxes changed, so your entries were cleared.']);
    expect(m.latest.chWork.boxes).toEqual({});
    await type(q('[data-box-input="b0"]'), '190');
    m.announce.mockClear();
    await click(q('[data-cuts-reset]'));
    expect(m.announce.mock.calls.map((c) => c[0])).toEqual(['The cuts are back at the place values. The boxes changed, so your entries were cleared.']);
  });

  it('several cuts on a side have different names', async () => {
    await mount({ viewMode: 'multidigit', multiDims: { a: 1234, b: 56 } });
    const names = qa('[data-cut-handle^="A"]').map((h) => h.getAttribute('aria-label'));
    expect(names).toEqual(['Cut line 1 on Factor A', 'Cut line 2 on Factor A', 'Cut line 3 on Factor A']);
    expect(q('[data-cut-handle="B0"]').getAttribute('aria-label')).toBe('Cut line on Factor B');
  });

  it('the card does not say "drawn to scale" over a note saying it is not', async () => {
    await mount({ viewMode: 'multidigit', multiDims: { a: 44, b: 12 } });
    expect(q('[data-not-to-scale]')).toBeTruthy();
    expect(q('[data-partial-card]').textContent.includes('Each region is drawn to scale')).toBe(false);
    await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 } });
    expect(q('[data-not-to-scale]')).toBeNull();
    expect(q('[data-partial-card]').textContent).toContain('Each region is drawn to scale');
  });
});

describe('path Start opens what the step counts', () => {
  it('"solve 2 decimal challenges" always opens a decimal challenge', async () => {
    for (let n = 0; n < 25; n += 1) {
      const m = await mount({ band: 'g5' }, { gradeLevel: '5th Grade' });
      await click(q('[data-path-go="g5_dec"]'));
      const ch = m.latest.challenge;
      expect(C.decimalsOf(ch.a) > 0 || C.decimalsOf(ch.b) > 0, ch.a + ' x ' + ch.b).toBe(true);
    }
  });

  it('"find a percent of a percent" always opens a percent challenge', async () => {
    for (let n = 0; n < 25; n += 1) {
      const m = await mount({ pathOpen: true }, { gradeLevel: '7th Grade' });
      await click(q('[data-path-go="g6_pct"]'));
      expect(m.latest.challenge.kind).toBe('pct');
    }
  });

  it('an open challenge the step would not count is replaced; one it counts is kept', async () => {
    const story = { id: 'w', mode: 'word', a: 3, b: 12, answer: 36, ctxIdx: 0, question: 'q' };
    let m = await mount({ pathOpen: true, viewMode: 'word', challenge: story });
    await click(q('[data-path-go="g4_rem"]'));
    expect(m.latest.challenge.wkind).toBe('remainder');
    const dec = { id: 'd', mode: 'multidigit', a: 2.5, b: 1.2, answer: 3, question: 'q' };
    m = await mount({ viewMode: 'multidigit', challenge: dec, multiDims: { a: 2.5, b: 1.2 } }, { gradeLevel: '5th Grade' });
    await click(q('[data-path-go="g5_dec"]'));
    expect(m.latest.challenge.id).toBe('d');
    const whole = { id: 'x', mode: 'multidigit', a: 23, b: 14, answer: 322, question: 'q' };
    m = await mount({ viewMode: 'multidigit', challenge: whole, multiDims: { a: 23, b: 14 } }, { gradeLevel: '5th Grade' });
    await click(q('[data-path-go="g5_dec"]'));
    expect(m.latest.challenge.id).not.toBe('x');
  });

  it('the factor step with an algebra challenge still open lands on that challenge', async () => {
    await mount({ pathOpen: true, viewMode: 'algebra', challenge: { id: 'al', mode: 'algebra', f1: { x: 1, c: 2 }, f2: { x: 1, c: 3 }, answer: { A: 1, B: 5, C: 6 }, question: 'q' } }, { gradeLevel: '7th Grade' });
    await click(q('[data-path-go="g6_factor"]'));
    await settle(400);
    expect(document.activeElement).toBe(q('[data-challenge-prompt]'));
  });
});

describe('themes and targets', () => {
  it('contrast theme: a primary button never sets black ink, which the host paints on black', async () => {
    await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 } }, { isContrast: true, isDark: true, theme: 'contrast' });
    const go = q('[data-path-go]');
    expect(go.style.color).toBe('rgb(255, 255, 0)');
    expect(go.style.background).toBe('rgb(0, 0, 0)');
    expect(go.style.boxShadow).toContain('inset');
    // Light and dark keep their filled primary.
    await mount({}, {});
    expect(q('[data-path-go]').style.color).toBe('rgb(255, 255, 255)');
    expect(q('[data-path-go]').style.background).toBe('rgb(180, 83, 9)');
  });

  it('dark and contrast: a cut line has a casing that shows against every region fill', async () => {
    const FILLS = ['#93c5fd', '#a7f3d0', '#fde68a', '#fbcfe8'];
    for (const extra of [{ isDark: true }, { isContrast: true, isDark: true }, {}]) {
      await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 } }, extra);
      const casing = q('[data-cut-casing="A0"]');
      expect(casing, JSON.stringify(extra)).toBeTruthy();
      expect(Number(casing.getAttribute('stroke-width'))).toBeGreaterThan(Number(q('[data-cut-line="A0"]').getAttribute('stroke-width')));
      FILLS.forEach((f) => expect(contrast(casing.getAttribute('stroke'), f)).toBeGreaterThanOrEqual(3));
      expect(q('[data-cut-handle="A0"] > span').style.boxShadow).toContain('2px');
    }
  });

  it('primary and new challenge controls ask for 44 px', async () => {
    await mount({ pathOpen: true, viewMode: 'multidigit', multiDims: { a: 23, b: 14 }, challenge: OPEN });
    expect(parseInt(q('[data-check-boxes]').style.minHeight, 10)).toBe(44);
    qa('[data-path-go]').forEach((b) => expect(parseInt(b.style.minHeight, 10)).toBe(44));
    await key(q('[data-cut-handle="A0"]'), 'ArrowLeft');
    expect(parseInt(q('[data-cuts-reset]').style.minHeight, 10)).toBe(44);
  });
});

describe('integrity sweep (these held on the start copy too; they guard the fixes above)', () => {
  it('after any cut, no untyped area shows in text or attributes, the checker agrees with the model, and boxes pay no XP', async () => {
    for (const ch of [OPEN, { id: 'h2', a: 2.5, b: 1.25, answer: 3.125, mode: 'multidigit', question: 'q' }, { id: 'h3', a: 305, b: 12, answer: 3660, mode: 'multidigit', question: 'q' }]) {
      const m = await mount({ viewMode: 'multidigit', multiDims: { a: ch.a, b: ch.b }, challenge: ch });
      await key(q('[data-cut-handle="A0"]'), 'ArrowLeft');
      await key(q('[data-cut-handle="B0"]'), 'Home');
      const cuts = m.latest.cuts;
      const bm = C.cutModel(ch.a, ch.b, cuts.A, cuts.B);
      expect(bm.total).toBeCloseTo(ch.answer, 9);
      const root2 = q('[data-areamodel-root]');
      const attrs = [];
      root2.querySelectorAll('[aria-label],[aria-valuetext],title,desc,[title]').forEach((e) => attrs.push(e.getAttribute('aria-label') || '', e.getAttribute('aria-valuetext') || '', e.getAttribute('title') || '', e.tagName === 'desc' || e.tagName === 'title' ? e.textContent : ''));
      const spoken = attrs.join(' | ') + ' | ' + q('[data-partial-card]').textContent + ' | ' + m.announce.mock.calls.map((c) => c[0]).join(' | ');
      bm.boxes.filter((b) => b.value !== b.pa && b.value !== b.pb).forEach((b) => {
        expect(spoken.includes(' = ' + b.value), b.label).toBe(false);
        expect(regionTextFor(b.index)).toBe('?');
      });
      expect(spoken.includes(String(ch.answer))).toBe(false);
      for (const b of bm.boxes) await type(q('[data-box-input="b' + b.index + '"]'), String(b.value));
      await click(q('[data-check-boxes]'));
      bm.boxes.forEach((b) => expect(m.latest.chWork.boxes['b' + b.index].st, b.label).toBe('ok'));
      expect(m.award).not.toHaveBeenCalled();
      expect(m.latest.multiSolved || 0).toBe(0);
      expect((m.latest.score || { total: 0 }).total).toBe(0);
    }
  });
});
function regionTextFor(i) { const n = q('[data-region-text="' + i + '"]'); return n ? n.textContent : '?'; }
