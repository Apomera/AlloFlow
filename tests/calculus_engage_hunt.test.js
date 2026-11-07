// Calculus: independent hunt of the 2026-11-04 engagement build. Every test failed on the hunt's start copy, apart from
// the one control named as such.
// CALCULUS_DEEP_FILE points the suite at another copy of the tool (fail-first checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null, container = null, C = null;

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }));
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  loadTool(FILE, 'calculus');
  C = window.__CalculusCore;
  container = document.createElement('div');
  document.body.appendChild(container);
  Element.prototype.scrollIntoView = function () {};
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  container.remove();
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
const q = (s) => container.querySelector(s);
const btn = (text) => [...container.querySelectorAll('button')].find((b) => (b.textContent || '').includes(text));
const btnL = (l) => [...container.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === l);
const tab = (text) => [...container.querySelectorAll('[role="tab"]')].find((t) => (t.textContent || '').includes(text));
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); }
async function key(el, k) { expect(el, 'element for key ' + k).toBeTruthy(); await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }); }
async function slide(el, value) {
  expect(el, 'range input').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const graphLabel = () => q('svg[role="img"]').getAttribute('aria-label');
const panel = () => q('[data-calc-overunder]');
const handle = (k) => q('[data-calc-bound-handle="' + k + '"]');
const X2 = { tab: 'integral', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, mode: 'left' };
const typed = (fnText, xMin, xMax, mode, n) => ({ tab: 'integral', fnMode: 'typed', fnText, xMin, xMax, mode, n: n || 20 });
const OU = { over: 'OVERestimate', under: 'UNDERestimate', exact: 'Exact estimate' };

describe('a verdict belongs to its own problem', () => {
  it('moving a Derivative slider after answering does not carry "Correct!" onto the new function', async () => {
    const m = await mount(X2);
    await click(btnL('UNDERestimate'));
    await click(tab('Derivative'));
    await slide(q('#calc-d-a'), 2);
    expect(m.latest.overUnderChecked).toBe(false);
    await click(tab('Integral'));
    expect(graphLabel()).toContain('hidden until you answer');
    expect(panel().textContent).not.toContain('Correct!');
    expect(btnL('OVERestimate'), 'the new function asks again').toBeTruthy();
  });

  it('a verdict held in state for another problem is ignored even if a route forgot to clear it', async () => {
    await mount(Object.assign({}, X2, { a: 2, overUnderChecked: true, overUnderGuess: 'under', ouAnswered: 'Q|1,0,0|0|3' }));
    expect(panel().textContent).not.toContain('Correct!');
    expect(btnL('OVERestimate')).toBeTruthy();
  });

  it('a save from before these keys keeps its answer, and the name agrees with the panel', async () => {
    await mount(Object.assign({}, X2, { overUnderChecked: true, overUnderGuess: 'under' }));
    expect(panel().textContent).toContain('Correct!');
    expect(graphLabel()).toContain('exact integral 9.0000');
  });

  it('a committed estimate does not carry over to a function changed on the Derivative tab', async () => {
    const m = await mount(Object.assign({}, X2, { predictMode: true, predictInput: '5' }));
    await click(btnL('Compare estimate with exact integral'));
    await click(tab('Derivative'));
    await slide(q('#calc-d-a'), 2);
    expect(m.latest.predictSubmitted).toBe(false);
    await click(tab('Integral'));
    expect(q('[data-calculus-estimate-comparison]')).toBeNull();
    expect(graphLabel()).not.toContain('exact integral 18');
  });

  it('a Derivative slider starts the two tries over, and a mission load does too', async () => {
    const m = await mount(Object.assign({}, X2, { tab: 'derivative', overUnderTries: 2, overUnderGuess: 'over' }));
    await slide(q('#calc-d-a'), 2);
    expect(m.latest.overUnderTries).toBe(0);
    await React.act(async () => root.unmount()); root = null;
    const m2 = await mount(Object.assign({}, X2, { tab: 'discover', missionIdx: 0, missionStep: 0, overUnderTries: 2, predictSubmitted: true }));
    await click(btn('Load f(x)'));
    expect(m2.latest.overUnderTries).toBe(0);
    expect(m2.latest.predictSubmitted).toBe(false);
  });
});

describe('teacher "no reveal"', () => {
  it('has no button that shows the exact value without an answer', async () => {
    await mount(Object.assign({}, X2, { teacherNoReveal: true }));
    expect(btn('Show the exact value without answering')).toBeUndefined();
    expect(graphLabel()).toContain('hidden until you answer');
    await React.act(async () => root.unmount()); root = null;
    await mount(X2);
    expect(btn('Show the exact value without answering'), 'still offered without the lock').toBeTruthy();
  });
});

describe('a sum that lands on a hole has no over/under answer', () => {
  it('sin(x)/x with left endpoints asks nothing that cannot be answered', async () => {
    await mount(typed('sin(x)/x', 0, 3, 'left'));
    expect(panel().textContent).toContain('lands on a point where f is undefined');
    expect(btnL('OVERestimate')).toBeUndefined();
    expect(btnL('UNDERestimate')).toBeUndefined();
    expect(btnL('Exact estimate')).toBeUndefined();
    expect(btn('Show the exact value without answering')).toBeTruthy();
  });
  it('control: the question comes back on a method that has a value', async () => {
    await mount(typed('sin(x)/x', 0, 3, 'left'));
    await click(btn('Midpoint'));
    expect(btnL('OVERestimate')).toBeTruthy();
    expect(panel().textContent).not.toContain('lands on a point');
  });
  it('a fix that hides the buttons never leaves the old false verdict reachable', async () => {
    await mount(Object.assign(typed('(x^2 - 1)/(x - 1)', 0, 3, 'left', 3), { overUnderTries: 2, overUnderGuess: 'over' }));
    expect(btn('Show the answer')).toBeUndefined();
    expect(panel().textContent).not.toContain('UNDERestimate');
  });
});

describe('the feedback matches the curve', () => {
  async function answer(state) {
    const cf = C.compile(state.fnText);
    const cls = C.classifyApproximation(C.riemann(cf.f, state.xMin, state.xMax, state.n, state.mode).value, C.improper(cf.f, state.xMin, state.xMax).value);
    const out = { cls };
    await mount(state);
    await click(btnL(cls === 'over' ? 'UNDERestimate' : 'OVERestimate'));
    out.hint = panel().textContent;
    await click(btnL(OU[cls]));
    out.reason = panel().textContent;
    return out;
  }

  it('a curve that bends one way and crosses the axis gets the bending reason, not "signed area"', async () => {
    const r = await answer(typed('x^2 - 1', 0, 3, 'midpoint', 4));
    expect(r.cls).toBe('under');
    expect(r.reason).toContain('tangent line at its midpoint');
    expect(r.reason).not.toContain('Forgetting signed area');
    expect(r.hint).toContain('Midpoint and bending');
    expect(r.hint).not.toContain('Forgetting signed area');
  });
  it('trapezoid on a curve entirely below the axis', async () => {
    const r = await answer(typed('-x^2', 0, 2, 'trapezoid', 4));
    expect(r.cls).toBe('under');
    expect(r.hint).toContain('Trapezoids and bending');
    expect(r.reason).toContain('chord');
  });
  it('Simpson on a cubic that crosses the axis hints at the degree', async () => {
    await mount(typed('x^3 - 3x', -1, 2, 'simpson', 4));
    await click(btnL('OVERestimate'));
    expect(panel().textContent).toContain('exact for every polynomial up to degree 3');
    expect(panel().textContent).not.toContain('Forgetting signed area');
  });
  it('a curve that changes its bending and crosses the axis says no shortcut decides it', async () => {
    const r = await answer(typed('x^3 - 3x', -1, 2, 'midpoint', 4));
    expect(r.reason).toContain('changes how it bends');
    expect(r.hint).toContain('changes direction or bending');
  });
  it('a straight line is never told it "changes direction or bending"', async () => {
    await mount({ tab: 'integral', a: 0, b: 2, c: 0, xMin: 0, xMax: 5, n: 10, mode: 'midpoint' });
    await click(btnL('OVERestimate'));
    expect(panel().textContent).toContain('straight line');
    expect(panel().textContent).not.toContain('changes direction');
    await React.act(async () => root.unmount()); root = null;
    await mount({ tab: 'integral', a: 0, b: 0, c: 3, xMin: 1, xMax: 4, n: 5, mode: 'left' });
    await click(btnL('OVERestimate'));
    expect(panel().textContent).toContain('straight line');
  });
  it('Simpson with a large error is not called tiny', async () => {
    const r = await answer(typed('e^x', 0, 10, 'simpson', 4));
    expect(r.cls).toBe('over');
    expect(r.reason).not.toMatch(/tiny/);
    expect(r.hint).not.toMatch(/tiny/);
    expect(r.reason).toContain('This estimate is not exact');
  });
  it('core: the challenge hint for midpoint follows the bending whatever the sign', () => {
    expect(C.quizMisconception({ mode: 'overunder', fnText: '-x^2', xMin: 0, xMax: 2, ruleMode: 'midpoint' }, 'under')).toBe('midpoint_concavity');
    expect(C.quizMisconception({ mode: 'overunder', fnText: 'x^2 - 2x', xMin: 0, xMax: 3, ruleMode: 'left' }, 'over')).toBe('forgot_signed');
  });
});

describe('predict mode keeps the sum back until the commit', () => {
  const P = Object.assign({}, X2, { predictMode: true });
  it('neither the caption nor the accessible name gives the sum', async () => {
    await mount(P);
    const sum = C.riemann((x) => x * x, 0, 3, 20, 'left').value.toFixed(4);
    expect(graphLabel()).not.toContain(sum);
    expect(q('svg[role="img"]').textContent).not.toContain(sum);
    expect(graphLabel()).toContain('Commit your estimate');
  });
  it('the over/under verdict and the fewest panel, both of which hold the exact value, wait too', async () => {
    await mount(Object.assign({}, P, { ouAnswered: 'Q|1,0,0|0|3' }));
    expect(q('[data-calc-fewest]')).toBeNull();
    await React.act(async () => root.unmount()); root = null;
    await mount(P);
    expect(panel()).toBeNull();
  });
});

describe('the bounds', () => {
  it('the Lower a slider cannot pass b or move it', async () => {
    const m = await mount(X2);
    await slide(q('#calc-int-xMin'), 4);
    expect(m.latest.xMin).toBe(2.5);
    expect(m.latest.xMax).toBe(3);
    expect(q('#calc-int-xMin').value).toBe('2.5');
    expect(graphLabel()).toContain('from 2.5 to 3');
  });
  it('the Upper b slider cannot pass a', async () => {
    const m = await mount({ tab: 'integral', a: 1, b: 0, c: 0, xMin: 3, xMax: 4, n: 20, mode: 'left' });
    await slide(q('#calc-int-xMax'), 1);
    expect(m.latest.xMax).toBe(3.5);
    expect(m.latest.xMin).toBe(3);
  });
  it('a below the usual range (Derivative View left) stays in its slider, and a key steps it, no jump', async () => {
    const m = await mount(Object.assign({}, X2, { xMin: -5 }));
    const a = handle('xMin');
    expect(a.getAttribute('aria-valuemin')).toBe('-5');
    expect(a.getAttribute('aria-valuenow')).toBe('-5');
    expect(q('#calc-int-xMin').value).toBe('-5');
    await key(a, 'ArrowRight');
    expect(m.latest.xMin).toBe(-4.5);
    await key(handle('xMax'), 'ArrowLeft');
    expect(m.latest.xMax).toBe(2.5);
  });
  it('a saved interval outside the usual range: a key never jumps a bound the wrong way', async () => {
    const m = await mount(Object.assign({}, X2, { xMin: -9, xMax: -8 }));
    const b = handle('xMax');
    expect(+b.getAttribute('aria-valuemin')).toBeLessThanOrEqual(-8);
    await key(b, 'ArrowLeft');
    expect(m.latest.xMax, 'ArrowLeft must not move b up to 1').toBeLessThanOrEqual(-8);
    await React.act(async () => root.unmount()); root = null;
    const m2 = await mount(Object.assign({}, X2, { xMin: 8, xMax: 9 }));
    await key(handle('xMin'), 'ArrowRight');
    expect(m2.latest.xMin, 'ArrowRight must not move a down to 4').toBeGreaterThanOrEqual(8);
  });
  it('every handle reports a value inside its own min and max', async () => {
    for (const s of [{ xMin: -5, xMax: 3 }, { xMin: 8, xMax: 9 }, { xMin: -9, xMax: -8 }, { xMin: 3, xMax: 0 }, { xMin: 2, xMax: 2 }, { xMin: -50, xMax: 50 }]) {
      await mount(Object.assign({}, X2, s));
      for (const k of ['xMin', 'xMax']) {
        const h = handle(k), now = +h.getAttribute('aria-valuenow');
        expect(now, JSON.stringify(s) + k).toBeGreaterThanOrEqual(+h.getAttribute('aria-valuemin'));
        expect(now, JSON.stringify(s) + k).toBeLessThanOrEqual(+h.getAttribute('aria-valuemax'));
      }
      await React.act(async () => root.unmount()); root = null;
    }
  });
  it('the touch rule sits on the overlay root, where Chromium honours it, and lets the page scroll', async () => {
    await mount(X2);
    const overlay = handle('xMax').ownerSVGElement;
    expect(overlay.style.touchAction).toBe('pan-y');
  });
  it('a tap on a handle says nothing, and a real move announces once', async () => {
    const m = await mount(X2);
    const overlay = handle('xMax').ownerSVGElement;
    const W = +overlay.getAttribute('viewBox').split(' ')[2];
    overlay.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: 300, right: W, bottom: 300 });
    const fire = async (type, x) => React.act(async () => { handle('xMax').dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: 150, button: 0 })); });
    const px = (x) => 40 + (x + 0.5) / 4 * (W - 80);
    await fire('pointerdown', px(3));
    await fire('pointerup', px(3));
    expect(m.sr.filter((s) => s.includes('Upper bound b')).length, 'a tap moved nothing').toBe(0);
    await fire('pointerdown', px(3));
    await fire('pointermove', px(2));
    await fire('pointerup', px(2));
    expect(m.sr.filter((s) => s.includes('Upper bound b is now 2.')).length).toBe(1);
  });
  it('grabbing a handle focuses it without scrolling the page', async () => {
    await mount(X2);
    const h = handle('xMax'), spy = vi.spyOn(h, 'focus');
    await React.act(async () => { h.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, button: 0 })); });
    expect(spy).toHaveBeenCalledWith({ preventScroll: true });
  });
  it('the handle focus ring shows on the contrast theme\u2019s black plot', async () => {
    await mount(X2, { isContrast: true, theme: 'contrast' });
    await React.act(async () => { handle('xMax').focus(); });
    expect(handle('xMax').querySelector('rect[stroke-dasharray]').getAttribute('stroke')).toBe('#ffff00');
  });
  it('on the contrast theme\u2019s black plot the curve and captions are not near-black', async () => {
    const K = 'Q|1,0,0|0|3';
    await mount(Object.assign({}, X2, { ouAnswered: K }), { isContrast: true, theme: 'contrast' });
    const plot = q('svg[role="img"]');
    const curves = [...plot.querySelectorAll('polyline')].map((p) => p.getAttribute('stroke'));
    expect(curves.length).toBeGreaterThan(0);
    expect(curves).not.toContain('#1e293b');
    for (const txt of container.querySelectorAll('svg[role="img"] text')) expect(txt.getAttribute('fill'), txt.textContent).toBe('#ffff00');
  });
  it('the hit strip is 44 CSS px on a phone plot', async () => {
    const cw = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () { return this.getAttribute && this.getAttribute('data-calc-int-graph') !== null ? 330 : 0; });
    await mount(X2);
    const W = +handle('xMax').ownerSVGElement.getAttribute('viewBox').split(' ')[2];
    expect(W).toBe(440);
    const hit = handle('xMax').querySelector('rect');
    expect(+hit.getAttribute('width') * 330 / W).toBeGreaterThanOrEqual(44);
    cw.mockRestore();
  });
});

describe('fewest rectangles tells the truth on a bumpy curve', () => {
  it('n above the fewest with a larger error is not told to "try more"', async () => {
    const st = typed('sin(20x)', 0, 3, 'left');
    const m = await mount(st);
    const cf = C.compile('sin(20x)');
    const cls = C.classifyApproximation(C.riemann(cf.f, 0, 3, 20, 'left').value, C.improper(cf.f, 0, 3).value);
    await click(btnL(OU[cls]));
    expect(q('[data-calc-fewest]').getAttribute('data-calc-fewest')).toBe('1');
    await slide(q('#calc-int-n'), 5);
    await click(btn('Lock in n = 5'));
    const res = q('[data-calc-fewest-result]').textContent;
    expect(res).not.toContain('Try more subdivisions');
    expect(res).toContain('does not shrink steadily');
    expect(m.xp).toEqual([]);
  });
  it('an n whose sum lands on a hole says so, instead of quoting a dash as its error', async () => {
    await mount(typed('(x^2 - 1)/(x - 1)', 0, 3, 'left', 4));
    await click(btnL(OU[C.classifyApproximation(C.riemann(C.compile('(x^2 - 1)/(x - 1)').f, 0, 3, 4, 'left').value, 7.5)]));
    expect(q('[data-calc-fewest]')).toBeTruthy();
    await slide(q('#calc-int-n'), 6);
    await click(btn('Lock in n = 6'));
    expect(q('[data-calc-fewest-result]').textContent).toContain('lands on a point where f is undefined');
  });
  it('a partial saved attempt does not print "n = undefined"', async () => {
    const key = 'Q|1,0,0|0|3';
    await mount(Object.assign({}, X2, { ouAnswered: key, fewest: { key: key + '|left|1', tries: 1 } }));
    expect(q('[data-calc-fewest]').textContent).not.toContain('undefined');
    expect(q('[data-calc-fewest-result]')).toBeNull();
  });
});

describe('focus is never dropped when an answer removes the control', () => {
  const inPanel = () => !!(document.activeElement && document.activeElement.closest('[data-calc-overunder]'));
  it('a right answer lands on the result', async () => {
    await mount(X2);
    await click(btnL('UNDERestimate'));
    expect(document.activeElement.getAttribute('data-calc-ou-result')).not.toBeNull();
  });
  it('a second wrong answer lands on the reveal offer, and Show the answer on the result', async () => {
    await mount(X2);
    await click(btnL('OVERestimate'));
    expect(document.activeElement.disabled, 'not left on the disabled button').toBeFalsy();
    expect(inPanel()).toBe(true);
    await click(btnL('Exact estimate'));
    expect(document.activeElement.closest('[data-calc-reveal-offer]')).toBeTruthy();
    await click(btn('Show the answer'));
    expect(document.activeElement.getAttribute('data-calc-ou-result')).not.toBeNull();
  });
  it('Show the exact value and Reset keep focus in the panel', async () => {
    await mount(X2);
    await click(btn('Show the exact value without answering'));
    expect(document.activeElement.getAttribute('data-calc-ou-result')).not.toBeNull();
    await click(btnL('Reset'));
    expect(inPanel()).toBe(true);
    expect(document.activeElement.tagName).toBe('BUTTON');
  });
  it('showing the exact value from a sum with no value lands on the method buttons', async () => {
    await mount(typed('sin(x)/x', 0, 3, 'left'));
    await click(btn('Show the exact value without answering'));
    expect(document.activeElement.closest('[data-calc-methods]')).toBeTruthy();
  });
  it('Show the fewest hands focus to the lock button', async () => {
    const key = 'Q|1,0,0|0|3';
    await mount(Object.assign({}, X2, { ouAnswered: key, fewest: { key: key + '|left|1', tries: 2, lastN: 20 } }));
    await click(btn('Show the fewest'));
    expect(document.activeElement.getAttribute('data-calc-fewest-lock')).not.toBeNull();
  });
});

describe('a wiggly typed function stays responsive', () => {
  it('the signed-area sweep runs once per problem, not on every render, and its cache stays small', async () => {
    delete window._calcSignedCache;
    const st = Object.assign(typed('sin(x)', 0, 3, 'left'), { ouAnswered: null });
    await mount(st);
    await click(btn('Show the exact value without answering'));
    const cache = window._calcSignedCache;
    expect(cache && Object.keys(cache).length).toBe(1);
    const key = Object.keys(cache)[0];
    cache[key] = { positive: 111, negative: 0 };
    await slide(q('#calc-int-n'), 21);
    expect(q('[data-positive-area]').getAttribute('data-positive-area'), 'the render read the stored sweep').toBe('111');
    delete window._calcSignedCache;
  });
  it('the cache cannot grow without limit', async () => {
    window._calcSignedCache = {};
    for (let i = 0; i < 40; i++) window._calcSignedCache['k' + i] = null;
    await mount(typed('sin(x)', 0, 3, 'left'));
    expect(Object.keys(window._calcSignedCache).length).toBeLessThanOrEqual(31);
    delete window._calcSignedCache;
  });
});

describe('Go', () => {
  it('The Fundamental Theorem lands on the mission’s first action, not a field further down', async () => {
    await mount({ missionXP: { 'dfx:x': true, 'anti:x': true } });
    await click(q('[data-calc-path-go]'));
    expect(document.activeElement.tagName).toBe('BUTTON');
    expect(document.activeElement.textContent).toMatch(/Load f\(x\)|Error/);
  });
});
