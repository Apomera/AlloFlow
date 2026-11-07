// Calculus stage E (2026-11-04): improper-integral XP is paid once per FUNCTION, not once per set of
// bounds (Aaron approved option B). "The same function" = the same values at fixed sample points,
// so a respelling (x^(-2) for 1/x^2, "+ 0") is the same function. Legacy credit keys from before the
// change ('imp:<label>|<a>|<b>') still count as earned. Driven through the real UI in jsdom.
// CALCULUS_DEEP_FILE points the suite at another copy of the tool (failing-first proof).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null, container = null, errors = [];

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }));
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 400)); });
  loadTool(FILE, 'calculus');
  window._calcImpCache = {};
  window._calcMainImpCache = {};
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  container.remove();
  vi.restoreAllMocks();
});

async function mount(init) {
  const out = { latest: null, xp: [] };
  function App() {
    const [state, setState] = React.useState({ calculus: Object.assign({}, init || {}) });
    out.latest = state.calculus;
    return window.StemLab._registry.calculus.render(makeCtx({ toolData: state, setToolData: setState, awardXP: (id, n, why) => out.xp.push([id, n, why]), addToast: () => {} }));
  }
  root = ReactDOMClient.createRoot(container);
  await React.act(async () => root.render(React.createElement(App)));
  return out;
}
const panel = () => container.querySelector('[data-calc-improper]');
const btn = (text) => [...panel().querySelectorAll('button')].find((b) => (b.textContent || '').includes(text));
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); }
async function type(el, value) {
  expect(el, 'input to type in').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const radio = (labelText) => { const l = [...panel().querySelectorAll('label')].find((x) => (x.textContent || '').includes(labelText)); expect(l, 'radio ' + labelText).toBeTruthy(); return l.querySelector('input[type="radio"]'); };
const fields = () => [...panel().querySelectorAll('input[type="text"]')]; // f, a, b (then the prediction box)
async function setIntegral(f, a, b) {
  await type(fields()[0], f);
  await type(fields()[1], a);
  await type(fields()[2], b);
}
// Decide the integral in the panel correctly on the first try.
async function solve(answer) {
  if (answer === 'div') await click(radio('Diverges'));
  else {
    await click(radio('Converges, to the value:'));
    await type(panel().querySelector('input[aria-label="Predicted value of the integral"]'), answer);
  }
  await click(btn('Commit my prediction'));
  expect(panel().textContent, 'graded correct').toContain('Correct.');
}

describe('improper-integral XP: once per function, not once per set of bounds', () => {
  it('nudging the bounds on a credited function earns nothing', async () => {
    const m = await mount({ tab: 'integral', impText: 'ln(x)', impA: '0', impB: '1' });
    await solve('-1');
    expect(m.xp.length).toBe(1);
    // Same function, new bounds: ∫0^2 ln x dx = 2 ln 2 − 2.
    await setIntegral('ln(x)', '0', '2');
    await solve('-0.6137');
    await setIntegral('ln(x)', '0', '3');
    await solve(String(3 * Math.log(3) - 3));
    expect(m.xp.length, 'no XP for the same function on other bounds').toBe(1);
    // The same function written another way is still the same function.
    await setIntegral('1/x^2', '1', 'inf');
    await solve('1');
    expect(m.xp.length).toBe(2);
    await setIntegral('x^(-2)', '2', 'inf');
    await solve('0.5');
    await setIntegral('1/x^2 + 0', '3', 'inf');
    await solve(String(1 / 3));
    expect(m.xp.length, 'a respelling is not a new function').toBe(2);
    expect(errors).toEqual([]);
  });

  it('a different function still earns, and the credit is saved in missionXP', async () => {
    const m = await mount({ tab: 'integral', impText: 'ln(x)', impA: '0', impB: '1' });
    await solve('-1');
    await setIntegral('e^(-x)', '0', 'inf');
    await solve('1');
    await setIntegral('1/x', '1', 'inf');
    await solve('div');
    expect(m.xp.length).toBe(3);
    const keys = Object.keys(m.latest.missionXP).filter((k) => k.startsWith('imp:'));
    expect(keys.length, 'one imp: credit per function').toBe(3);
    // The teacher trophy count and the BC path tick still read the imp: prefix.
    expect(new Set(keys).size).toBe(3);
  });

  it('legacy per-bounds credit keys still count as earned for that function', async () => {
    const m = await mount({ tab: 'integral', impText: 'ln(x)', impA: '0', impB: '2', missionXP: { 'imp:ln(x)|0|1': true, 'imp:1/sqrt(|x|)|-1|1': true, 'imp:x^(-2)|1|Infinity': true } });
    await solve('-0.6137');
    expect(m.xp.length, 'legacy ln(x) credit honoured on new bounds').toBe(0);
    // A legacy label holding |…| (absolute value) still parses back to its function.
    await setIntegral('1/sqrt(|x|)', '0', '1');
    await solve('2');
    expect(m.xp.length, 'legacy |x| credit honoured').toBe(0);
    // Legacy credit for x^(-2) covers the same function typed as 1/x^2.
    await setIntegral('1/x^2', '2', 'inf');
    await solve('0.5');
    expect(m.xp.length, 'legacy credit honoured for a respelling').toBe(0);
    // Legacy credit for other functions does not block a new one.
    await setIntegral('e^(-x)', '0', 'inf');
    await solve('1');
    expect(m.xp.length).toBe(1);
    expect(errors).toEqual([]);
  });

  it('hostile legacy keys do not crash or block credit', async () => {
    const m = await mount({ tab: 'integral', impText: 'e^(-x)', impA: '0', impB: 'inf', missionXP: { 'imp:': true, 'imp:|': true, 'imp:((|1|2': true, 'imp:e^(-x)': 'x', 'imp:fn:': true } });
    await solve('1');
    expect(m.xp.length).toBe(1);
    expect(errors).toEqual([]);
  });
});

// Stage E2 (2026-11-04, Aaron approved): once per function AND verdict (res.kind), so the classic pair
// 1/x^2 on [1,inf) (converges) and on [0,1] (diverges) both pay; nudging bounds within a verdict still pays nothing.
describe('improper-integral XP: once per function and verdict', () => {
  it('the classic 1/x^2 pair both pay; nudges inside either verdict pay nothing', async () => {
    const m = await mount({ tab: 'integral', impText: '1/x^2', impA: '1', impB: 'inf' });
    await solve('1');
    expect(m.xp.length).toBe(1);
    await setIntegral('1/x^2', '0', '1');
    await solve('div');
    expect(m.xp.length, 'the diverging case of the same function pays').toBe(2);
    await setIntegral('1/x^2', '0', '2');
    await solve('div');
    await setIntegral('x^(-2)', '2', 'inf');
    await solve('0.5');
    expect(m.xp.length, 'same function + same verdict on new bounds pays nothing').toBe(2);
    const keys = Object.keys(m.latest.missionXP).filter((k) => k.startsWith('imp:'));
    expect(keys.length, 'one imp: credit per function and verdict').toBe(2);
    expect(errors).toEqual([]);
  });

  it('a legacy per-bounds key blocks only the verdict it was earned for', async () => {
    // x^(-2) on [1,inf) converged; ln(x) on [0,1] converged.
    const m = await mount({ tab: 'integral', impText: '1/x^2', impA: '2', impB: 'inf', missionXP: { 'imp:x^(-2)|1|Infinity': true, 'imp:ln(x)|0|1': true } });
    await solve('0.5');
    expect(m.xp.length, 'legacy converges credit blocks converges').toBe(0);
    await setIntegral('1/x^2', '0', '1');
    await solve('div');
    expect(m.xp.length, 'legacy converges credit does not block diverges').toBe(1);
    await setIntegral('ln(x)', '0', '2');
    await solve('-0.6137');
    expect(m.xp.length).toBe(1);
    await setIntegral('ln(x)', '1', 'inf');
    await solve('div');
    expect(m.xp.length, 'ln x diverging on [1,inf) is a new verdict').toBe(2);
    expect(errors).toEqual([]);
  });

  it('a legacy key whose verdict cannot be recomputed covers every verdict (safe side)', async () => {
    const m = await mount({ tab: 'integral', impText: '1/x^2', impA: '1', impB: 'inf', missionXP: { 'imp:1/x^2|zz|1': true, 'imp:ln(x)||': true } });
    await solve('1');
    await setIntegral('1/x^2', '0', '1');
    await solve('div');
    await setIntegral('ln(x)', '1', 'inf');
    await solve('div');
    await setIntegral('ln(x)', '0', '1');
    await solve('-1');
    expect(m.xp.length, 'undeterminable legacy credit blocks every verdict').toBe(0);
    await setIntegral('e^(-x)', '0', 'inf');
    await solve('1');
    expect(m.xp.length).toBe(1);
    expect(errors).toEqual([]);
  });

  it('a stage-E key (function only, no verdict) covers every verdict of that function', async () => {
    const core = window.__CalculusCore;
    const bare = core.impCreditKey(core.compile('1/x^2'));
    expect(bare).toMatch(/^imp:fn:[0-9a-z]+$/);
    const m = await mount({ tab: 'integral', impText: '1/x^2', impA: '1', impB: 'inf', missionXP: { [bare]: true } });
    await solve('1');
    await setIntegral('1/x^2', '0', '1');
    await solve('div');
    expect(m.xp.length).toBe(0);
    await setIntegral('1/x', '1', 'inf');
    await solve('div');
    expect(m.xp.length, 'a different function still pays').toBe(1);
    const keys = Object.keys(m.latest.missionXP).filter((k) => k.startsWith('imp:fn:') && k !== bare);
    expect(keys.length).toBe(1);
    expect(keys[0], 'new keys carry the verdict and keep the imp: prefix').toMatch(/^imp:fn:[0-9a-z]+:diverges$/);
    expect(errors).toEqual([]);
  });
});
