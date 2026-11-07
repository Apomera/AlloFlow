// Calculus engagement pass (2026-11-04), driven through the real UI in jsdom:
// (1) the controls at the picture: n and the bounds right under the Integral graph, draggable a/b handles
//     (role=slider, arrow keys) and a plot as wide as its box;
// (2) a calm first screen: no hero tiles, static cards or "Recommended next move"; one-line Next;
// (3) "Go" opens the step's task, scrolls it in, focuses it and announces it;
// (4) the exact integral waits for the over/under answer on EVERY method, and a fewest-rectangles
//     challenge is offered only after that answer (no XP);
// (5) on a phone-width window the graph comes before the path.
// CALCULUS_DEEP_FILE points the suite at another copy of the tool (fail-first checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null, container = null, C = null, innerW = null;

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }));
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  loadTool(FILE, 'calculus');
  C = window.__CalculusCore;
  innerW = window.innerWidth;
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  container.remove();
  Object.defineProperty(window, 'innerWidth', { value: innerW, configurable: true, writable: true });
  delete Element.prototype.scrollIntoView;
  vi.restoreAllMocks();
});

async function mount(init, extra) {
  const out = { latest: null, xp: [], sr: [] };
  function App() {
    const [state, setState] = React.useState({ calculus: Object.assign({}, init || {}) });
    out.latest = state.calculus;
    return window.StemLab._registry.calculus.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, gradeBand: 'g912',
      awardXP: (id, n, why) => out.xp.push([id, n, why]), addToast: () => {}, announceToSR: (m) => out.sr.push(String(m)) }, extra || {})));
  }
  root = ReactDOMClient.createRoot(container);
  await React.act(async () => root.render(React.createElement(App)));
  return out;
}
const btn = (text, scope) => [...(scope || container).querySelectorAll('button')].find((b) => (b.textContent || '').includes(text));
const btnLabel = (label) => [...container.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === label);
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); }
async function key(el, k) { expect(el, 'element for key ' + k).toBeTruthy(); await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }); }
async function slide(el, value) {
  expect(el, 'range input').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const graph = () => container.querySelector('svg[role="img"]');
const label = () => graph().getAttribute('aria-label');
const before = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const handle = (k) => container.querySelector('[role="slider"][data-calc-bound-handle="' + k + '"]');
const text = () => container.textContent;

describe('(2) a calm first screen with one guide', () => {
  it('no hero stat tiles, static three-step cards or "Recommended next move"; the path is one line with Go', async () => {
    await mount({});
    expect(text()).not.toContain('Recommended next move');
    expect(container.querySelector('[aria-label="Calculus reasoning pathway"]')).toBeNull();
    expect(text()).not.toMatch(/ResolutionScore|Represent/);
    const path = container.querySelector('[data-calc-path]');
    expect(path.querySelector('#calc-path-list'), 'the step list starts folded').toBeNull();
    expect(path.querySelector('[data-calc-path-next]').textContent).toBe('Next: Differentiate');
    expect(btnLabel('Go: Differentiate')).toBeTruthy();
    await click(btn('Show the path', path));
    expect(path.querySelectorAll('[data-calc-path-step]').length).toBe(5);
  });
});

describe('(1) the controls at the picture', () => {
  it('n and the bounds sit directly under the Integral graph, and the plot is as wide as its box', async () => {
    await mount({ tab: 'integral', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, mode: 'left' });
    const n = container.querySelector('#calc-int-n');
    expect(n).toBeTruthy();
    expect(before(graph(), n), 'n slider after the graph').toBe(true);
    const ou = container.querySelector('[data-calc-overunder]') || btnLabel('OVERestimate');
    expect(before(n, ou), 'n slider before the over/under question').toBe(true);
    expect(before(n, container.querySelector('[data-calc-antiderivative]'))).toBe(true);
    for (const id of ['#calc-int-xMin', '#calc-int-xMax']) expect(before(graph(), container.querySelector(id)), id).toBe(true);
    const vbW = +graph().getAttribute('viewBox').split(' ')[2];
    expect(vbW, 'wide window: a wide plot').toBeGreaterThan(600);
  });

  it('a and b are handles on the graph: role=slider with values, arrow keys, Page and Home/End', async () => {
    const m = await mount({ tab: 'integral', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, mode: 'left' });
    const b = handle('xMax'), a = handle('xMin');
    expect(b.getAttribute('tabindex')).toBe('0');
    expect(b.getAttribute('aria-label')).toBe('Upper bound b, on the graph');
    expect(b.getAttribute('aria-valuenow')).toBe('3');
    expect(b.getAttribute('aria-valuetext')).toBe('b = 3');
    await key(handle('xMax'), 'ArrowRight');
    expect(m.latest.xMax).toBe(3.5);
    expect(handle('xMax').getAttribute('aria-valuenow')).toBe('3.5');
    await key(handle('xMax'), 'PageUp');
    expect(m.latest.xMax).toBe(5.5);
    await key(handle('xMax'), 'End');
    expect(m.latest.xMax).toBe(10);
    await key(a, 'ArrowLeft');
    expect(m.latest.xMin).toBe(-0.5);
    await key(handle('xMin'), 'Home');
    expect(m.latest.xMin).toBe(-3);
    // a cannot pass b
    await key(handle('xMax'), 'Home');
    expect(m.latest.xMax).toBe(1);
    await key(handle('xMin'), 'End');
    expect(m.latest.xMin).toBe(0.5);
    expect(label()).toContain('from 0.5 to 1');
  });

  it('dragging a handle moves its bound to the point under the pointer, then announces it', async () => {
    const m = await mount({ tab: 'integral', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, mode: 'left' });
    const overlay = handle('xMax').ownerSVGElement;
    const W = +overlay.getAttribute('viewBox').split(' ')[2];
    overlay.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: 300, right: W, bottom: 300 });
    const fire = async (type, x) => React.act(async () => { handle('xMax').dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: 150, button: 0 })); });
    // The x window of [0, 3] is [-0.5, 3.5] over the plot box [40, W - 40].
    const px = (x) => 40 + (x + 0.5) / 4 * (W - 80);
    await fire('pointerdown', px(3));
    await fire('pointermove', px(2));
    expect(m.latest.xMax).toBe(2);
    await fire('pointermove', px(2.26));
    expect(m.latest.xMax, 'snaps to halves').toBe(2.5);
    await fire('pointerup', px(2.26));
    expect(m.sr.join(' | ')).toContain('Upper bound b is now 2.5.');
  });
});

describe('(4) the exact integral waits for the over/under answer on every method', () => {
  it('Midpoint no longer spoils the Left question; answering on any method unlocks this problem', async () => {
    const m = await mount({ tab: 'integral', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, mode: 'left' });
    await click(btn('Midpoint'));
    expect(m.latest.mode).toBe('midpoint');
    expect(label()).toContain('hidden until you answer');
    expect(label()).not.toMatch(/exact integral \d/);
    expect(container.querySelector('[data-signed-area]')).toBeNull();
    expect(text()).toContain('Compare this midpoint estimate with the exact integral');
    await click(btnLabel('UNDERestimate'));
    expect(label()).toContain('exact integral 9.0000');
    expect(text()).toContain('tangent line at its midpoint');
    await click(btn('Left'));
    expect(label(), 'same problem, other method: stays unlocked').toContain('exact integral 9.0000');
    expect(btnLabel('OVERestimate')).toBeUndefined();
    await slide(container.querySelector('#calc-int-xMax'), 4);
    expect(label(), 'a new interval is a new problem').toContain('hidden until you answer');
    expect(m.xp).toEqual([]);
  });

  it('Simpson on x² is EXACT, and a wrong guess there gets the degree-3 hint', async () => {
    await mount({ tab: 'integral', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, mode: 'simpson' });
    await click(btnLabel('OVERestimate'));
    expect(text()).toContain('exact for every polynomial up to degree 3');
    await click(btnLabel('Exact estimate'));
    expect(text()).toContain('The estimate is EXACT at this resolution.');
  });
});

describe('(4) fewest-rectangles challenge', () => {
  const left = { tab: 'integral', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, mode: 'left' };
  // The same sums the graph draws: the smallest n whose left-sum error is under the target.
  const errAt = (n) => Math.abs(C.riemann((x) => x * x, 0, 3, n, 'left').value - 9);

  it('is offered only after the over/under answer, never after a skip, and never pays XP', async () => {
    await mount(left);
    expect(container.querySelector('[data-calc-fewest]')).toBeNull();
    await click(btn('Show the exact value without answering'));
    expect(container.querySelector('[data-calc-fewest]'), 'a skip is not an answer').toBeNull();
    await React.act(async () => root.unmount()); root = null;
    const m = await mount(left);
    await click(btnLabel('UNDERestimate'));
    const sec = container.querySelector('[data-calc-fewest]');
    expect(sec).toBeTruthy();
    const tol = +sec.getAttribute('data-calc-fewest');
    let minN = 2; while (!(errAt(minN) < tol)) minN++;
    expect(minN).toBeGreaterThanOrEqual(4);
    expect(minN).toBeLessThanOrEqual(50);
    expect(text()).toContain('smaller than ' + tol);

    await slide(container.querySelector('#calc-int-n'), minN - 1);
    await click(btn('Lock in n = ' + (minN - 1)));
    expect(text()).toContain('which is not under ' + tol + ' yet');
    await slide(container.querySelector('#calc-int-n'), minN + 3);
    await click(btn('Lock in n = ' + (minN + 3)));
    expect(text()).toContain('Fewer subdivisions also work');
    expect(btn('Show the fewest'), 'offered after two tries').toBeTruthy();
    await slide(container.querySelector('#calc-int-n'), minN);
    await click(btn('Lock in n = ' + minN));
    expect(container.querySelector('[data-calc-fewest-result]').getAttribute('data-calc-fewest-result')).toBe('best');
    expect(text()).toContain('Fewest possible! n = ' + minN);
    expect(m.xp, 'no XP for the challenge').toEqual([]);
    expect(m.sr.some((s) => s.includes('Fewest possible!'))).toBe(true);
  });

  it('a method that is exact for every n says so instead of setting a target', async () => {
    await mount({ tab: 'integral', a: 0, b: 2, c: 0, xMin: 0, xMax: 5, n: 10, mode: 'trapezoid' });
    await click(btnLabel('Exact estimate'));
    expect(container.querySelector('[data-calc-fewest]').getAttribute('data-calc-fewest')).toBe('exact');
  });
});

describe('(3) Go opens, scrolls to, focuses and announces the step’s task', () => {
  it('Go: Differentiate opens the derivative practice and focuses its first field', async () => {
    const scrolled = [];
    Element.prototype.scrollIntoView = function (o) { scrolled.push([this, o]); };
    const m = await mount({});
    await click(btnLabel('Go: Differentiate'));
    expect(m.latest.tab).toBe('derivative');
    expect(m.latest.showDerivTrainer).toBe(true);
    const active = document.activeElement;
    expect(active.closest('[data-calc-deriv-trainer]'), 'focus is in the practice').toBeTruthy();
    expect(active.tagName).toBe('INPUT');
    expect(scrolled.length).toBeGreaterThan(0);
    expect(scrolled.at(-1)[0]).toBe(active);
    expect(m.sr.join(' | ')).toContain('Opened: Differentiate. Derivative: type f′ and the tool checks it at many points.');
  });

  it('Go on the Integrate step lands in the antiderivative box; Go to a challenge lands on Start', async () => {
    Element.prototype.scrollIntoView = function () {};
    await mount({ missionXP: { 'dfx:x²': true } });
    expect(container.querySelector('[data-calc-path-next]').getAttribute('data-calc-path-next')).toBe('anti');
    await click(btnLabel('Go: Integrate'));
    expect(document.activeElement.id).toBe('calc-anti-input');
    await React.act(async () => root.unmount()); root = null;
    const m = await mount({ calcBand: 'pre', missionXP: { 'lim:1': true } });
    await click(btnLabel('Go: Average rate of change'));
    expect(m.latest.tab).toBe('challenge');
    expect(document.activeElement.getAttribute('data-calc-start')).toBe('challenge');
  });
});

describe('(5) on a phone-width window the graph comes before the path', () => {
  it('Integral and Derivative: the path follows the graph and its controls; other tabs keep it on top', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true, writable: true });
    await mount({ tab: 'integral' });
    const path = container.querySelector('[data-calc-path]');
    expect(before(graph(), path)).toBe(true);
    expect(before(container.querySelector('#calc-int-n'), path)).toBe(true);
    expect(container.querySelectorAll('[data-calc-path]').length).toBe(1);
    await React.act(async () => root.unmount()); root = null;
    await mount({ tab: 'derivative' });
    expect(before(graph(), container.querySelector('[data-calc-path]'))).toBe(true);
    await React.act(async () => root.unmount()); root = null;
    await mount({ tab: 'limits' });
    expect(before(container.querySelector('[data-calc-path]'), container.querySelector('[role="tablist"]'))).toBe(true);
    await React.act(async () => root.unmount()); root = null;
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true, writable: true });
    await mount({ tab: 'integral' });
    expect(before(container.querySelector('[data-calc-path]'), graph()), 'wide: path on top').toBe(true);
  });
});
