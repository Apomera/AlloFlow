// Follow-up from the independent hunt (2026-11-05): missionXP keys anti:<label> and dfx:<label> held the
// function a student typed, in an autosaved KEY. They are hashed now, like imp:fn:, and old saves keep their
// credit. Each block failed on the start copy (CALCULUS_DEEP_FILE points the suite at another copy).
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
  if (root) { await React.act(async () => root.unmount()); root = null; }
  const out = { latest: null, xp: [] };
  function App() {
    const [state, setState] = React.useState({ calculus: Object.assign({}, init || {}) });
    out.latest = state.calculus;
    return window.StemLab._registry.calculus.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, gradeBand: 'g912',
      awardXP: (id, n, why) => out.xp.push([id, n, why]), addToast: () => {}, announceToSR: () => {} }, extra || {})));
  }
  root = ReactDOMClient.createRoot(container);
  await React.act(async () => root.render(React.createElement(App)));
  return out;
}
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
async function type(el, v) {
  expect(el, 'input').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const checkAnti = () => click(container.querySelector('[data-calc-antiderivative] button[aria-label="Check"]'));
const checkDeriv = async (text) => {
  const box = [...container.querySelectorAll('input[type="text"]')].find((i) => i.value === text);
  expect(box, 'the typed derivative box').toBeTruthy();
  await click(box.closest('div').querySelector('button[aria-label="Check"]') || box.parentElement.parentElement.querySelector('button[aria-label="Check"]'));
};
const HASHED = /^(anti|dfx):fn:[0-9a-z]+$/;
const ANTI = (more) => Object.assign({ tab: 'integral', fnMode: 'typed', fnText: 'x^3 + 7', mode: 'simpson', xMin: 0, xMax: 2, antiText: '0.25x^4 + 7x' }, more || {});
const DERIV = (more) => Object.assign({ tab: 'derivative', fnMode: 'typed', fnText: 'x^3 + 7', x0: 1, xMin: -2, xMax: 2, showDerivTrainer: true, derivTypedText: '3x^2' }, more || {});

describe('a typed function does not sit in a saved key', () => {
  it('anti: the new key is a hash, and holds nothing typed', async () => {
    const m = await mount(ANTI());
    await checkAnti();
    expect(m.xp.filter((x) => /antiderivative/.test(x[2])).length).toBe(1);
    const keys = Object.keys(m.latest.missionXP);
    expect(keys.length).toBe(1);
    expect(keys[0]).toMatch(HASHED);
    expect(keys[0].startsWith('anti:')).toBe(true);
    expect(keys[0].includes('x^3')).toBe(false);
  });

  it('dfx: the new key is a hash, and holds nothing typed', async () => {
    const m = await mount(DERIV());
    await checkDeriv('3x^2');
    expect(m.xp.filter((x) => /typed function/.test(x[2])).length).toBe(1);
    const keys = Object.keys(m.latest.missionXP);
    expect(keys[0]).toMatch(HASHED);
    expect(keys[0].startsWith('dfx:')).toBe(true);
    expect(keys[0].includes('x^3')).toBe(false);
  });

  it('the same function in other words does not pay twice; a different function does', async () => {
    const m = await mount(ANTI());
    await checkAnti();
    const first = Object.keys(m.latest.missionXP)[0];
    expect(C.missionFnKey('anti', '7 + x^3')).toBe(first);
    expect(C.missionFnKey('anti', 'x*x*x + 7')).toBe(first);
    expect(C.missionFnKey('anti', 'x^3 + 8')).not.toBe(first);
    expect(C.missionFnKey('dfx', 'x^3 + 7').slice(4)).toBe(first.slice(5));
  });

  it('a reload with the new key does not pay again', async () => {
    const m = await mount(ANTI());
    await checkAnti();
    const again = await mount(ANTI({ missionXP: m.latest.missionXP }));
    await checkAnti();
    expect(again.xp).toEqual([]);
  });
});

describe('old saves keep their credit, and the typed text leaves the save', () => {
  const old = { 'anti:x^3 + 7': true, 'dfx:x^3 + 7': true };

  it('the old keys become hashed keys on load', async () => {
    const m = await mount(ANTI({ missionXP: Object.assign({ 'lim:3': true, 'imp:fn:abc:diverges': true }, old) }));
    const keys = Object.keys(m.latest.missionXP).sort();
    expect(keys.filter((k) => k.includes('x^3'))).toEqual([]);
    expect(keys.filter((k) => HASHED.test(k)).length).toBe(2);
    expect(keys, 'other keys are left alone').toContain('lim:3');
    expect(keys).toContain('imp:fn:abc:diverges');
    expect(JSON.stringify(m.latest.missionXP).includes('x^3')).toBe(false);
  });

  it('the function an old save was paid for is not paid again, in either tab, even in other words', async () => {
    let m = await mount(ANTI({ missionXP: Object.assign({}, old) }));
    await checkAnti();
    expect(m.xp).toEqual([]);
    m = await mount(DERIV({ missionXP: Object.assign({}, old) }));
    await checkDeriv('3x^2');
    expect(m.xp).toEqual([]);
    m = await mount(ANTI({ fnText: '7 + x^3', missionXP: Object.assign({}, old) }));
    await checkAnti();
    expect(m.xp).toEqual([]);
  });

  it('the path ticks and the teacher counts still read them', async () => {
    const m = await mount({ tab: 'derivative', missionXP: Object.assign({}, old) }, { isTeacherMode: true });
    expect(Object.keys(m.latest.missionXP).filter((k) => /^anti:/.test(k)).length).toBe(1);
    expect(Object.keys(m.latest.missionXP).filter((k) => /^dfx:/.test(k)).length).toBe(1);
  });

  it('a quadratic-slider key from an old save migrates too, and still blocks a repeat', async () => {
    const m = await mount({ tab: 'integral', mode: 'simpson', a: 3, b: 0, c: 0, xMin: 0, xMax: 2, antiText: 'x^3', missionXP: { 'anti:3x²': true } });
    expect(Object.keys(m.latest.missionXP).every((k) => HASHED.test(k))).toBe(true);
    await checkAnti();
    expect(m.xp).toEqual([]);
  });

  it('hostile keys do not crash it, and what is hashed is never pasted back in', async () => {
    const m = await mount(ANTI({ missionXP: { 'anti:': true, 'dfx:((': true, 'anti:fn:abc': true, 'anti:x^2': 'x', 'dfx:x^2': false, constructor: true } }));
    const keys = Object.keys(m.latest.missionXP);
    expect(keys).toContain('anti:fn:abc');
    expect(keys.filter((k) => /^(anti|dfx):/.test(k) && !k.includes(':fn:'))).toEqual([]);
    expect(keys.includes('dfx:x^2')).toBe(false);
    expect(keys.join('|').includes('x^2')).toBe(false);
  });
});
