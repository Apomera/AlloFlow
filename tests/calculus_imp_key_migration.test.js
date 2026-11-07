// Approved 2026-11-05: old saves can hold missionXP keys 'imp:<label>|<a>|<b>', where <label> is the
// function a student typed. They become hashed keys on load, with the same credit as before.
// Each block failed on the start copy (CALCULUS_DEEP_FILE points the suite at another copy).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null, container = null, errors = [], C = null;

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }));
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 400)); });
  loadTool(FILE, 'calculus');
  C = window.__CalculusCore;
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

async function mount(init, extra) {
  if (root) { await React.act(async () => root.unmount()); root = null; }
  const out = { latest: null, xp: [] };
  function App() {
    const [state, setState] = React.useState({ calculus: Object.assign({}, init || {}) });
    out.latest = state.calculus;
    return window.StemLab._registry.calculus.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, awardXP: (id, n, why) => out.xp.push([id, n, why]), addToast: () => {} }, extra || {})));
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
const fields = () => [...panel().querySelectorAll('input[type="text"]')];
async function setIntegral(f, a, b) {
  await type(fields()[0], f);
  await type(fields()[1], a);
  await type(fields()[2], b);
}
async function solve(answer) {
  if (answer === 'div') await click(radio('Diverges'));
  else {
    await click(radio('Converges, to the value:'));
    await type(panel().querySelector('input[aria-label="Predicted value of the integral"]'), answer);
  }
  await click(btn('Commit my prediction'));
  expect(panel().textContent, 'graded correct').toContain('Correct.');
}

const HASHED = /^imp:fn:[0-9a-z]+(:(converges|diverges))?$/;
const impKeys = (m) => Object.keys(m.latest.missionXP || {}).filter((k) => k.startsWith('imp:'));
const OLD = { 'imp:1/x^2|1|Infinity': true, 'imp:ln(x)|0|1': true, 'imp:1/sqrt(|x|)|-1|1': true };

describe('the typed function leaves the saved key', () => {
  it('old imp: keys become hashed keys on load, and other keys are left alone', async () => {
    const m = await mount({ tab: 'integral', missionXP: Object.assign({ 'lim:3': true, 'eul:0': true, 'anti:fn:abc': true, 'imp:fn:abc:diverges': true, 'imp:fn:def': true }, OLD) });
    const keys = Object.keys(m.latest.missionXP);
    expect(keys.filter((k) => /\||\^|ln\(|sqrt/.test(k))).toEqual([]);
    expect(JSON.stringify(m.latest.missionXP)).not.toMatch(/x\^2|ln\(x\)|sqrt/);
    expect(impKeys(m).every((k) => HASHED.test(k))).toBe(true);
    expect(impKeys(m).length).toBe(5);
    for (const stay of ['lim:3', 'eul:0', 'anti:fn:abc', 'imp:fn:abc:diverges', 'imp:fn:def']) expect(keys).toContain(stay);
    expect(errors).toEqual([]);
  });

  it('the hashed key carries the verdict the old key was earned for', () => {
    const f = C.compile('1/x^2');
    expect(Object.keys(C.migrateFnKeys({ 'imp:1/x^2|1|Infinity': true }))).toEqual([C.impCreditKey(f, 'converges')]);
    expect(Object.keys(C.migrateFnKeys({ 'imp:1/x^2|0|1': true }))).toEqual([C.impCreditKey(f, 'diverges')]);
    expect(Object.keys(C.migrateFnKeys({ 'imp:1/x^2|zz|1': true }))).toEqual([C.impCreditKey(f)]);
    expect(Object.keys(C.migrateFnKeys({ 'imp:1/x^2||': true }))).toEqual([C.impCreditKey(f)]);
  });

  it('a new write is hashed and holds nothing typed', async () => {
    const m = await mount({ tab: 'integral', impText: '1/x^2', impA: '1', impB: 'inf' });
    await solve('1');
    expect(impKeys(m).length).toBe(1);
    expect(impKeys(m)[0]).toMatch(/^imp:fn:[0-9a-z]+:converges$/);
    expect(JSON.stringify(m.latest.missionXP)).not.toContain('x^2');
  });

  it('a mixed save, with a new write straight after the load, keeps no typed text', async () => {
    const m = await mount({ tab: 'integral', impText: 'e^(-x)', impA: '0', impB: 'inf', missionXP: Object.assign({}, OLD) });
    await solve('1');
    expect(m.xp.length).toBe(1);
    expect(impKeys(m).every((k) => HASHED.test(k))).toBe(true);
    expect(impKeys(m).length).toBe(4);
  });
});

describe('credit survives the migration, without paying twice', () => {
  it('the verdict an old key was earned for is not paid again, on other bounds or in other words', async () => {
    const m = await mount({ tab: 'integral', impText: '1/x^2', impA: '1', impB: 'inf', missionXP: { 'imp:x^(-2)|1|Infinity': true } });
    expect(impKeys(m).every((k) => HASHED.test(k))).toBe(true);
    await solve('1');
    await setIntegral('x^(-2)', '2', 'inf');
    await solve('0.5');
    await setIntegral('1/x^2 + 0', '3', 'inf');
    await solve(String(1 / 3));
    expect(m.xp, 'same function, same verdict').toEqual([]);
  });

  it('the other verdict of the same function still pays, once, as it did before the migration', async () => {
    const m = await mount({ tab: 'integral', impText: '1/x^2', impA: '0', impB: '1', missionXP: { 'imp:x^(-2)|1|Infinity': true } });
    await solve('div');
    expect(m.xp.length).toBe(1);
    await setIntegral('1/x^2', '0', '2');
    await solve('div');
    expect(m.xp.length).toBe(1);
  });

  it('a label holding |x| and a key whose verdict cannot be recomputed keep their credit', async () => {
    const m = await mount({ tab: 'integral', impText: '1/sqrt(|x|)', impA: '0', impB: '1', missionXP: { 'imp:1/sqrt(|x|)|-1|1': true, 'imp:ln(x)||': true } });
    await solve('2');
    await setIntegral('ln(x)', '0', '1');
    await solve('-1');
    await setIntegral('ln(x)', '1', 'inf');
    await solve('div');
    expect(m.xp, 'unknown verdict covers every verdict, as before').toEqual([]);
  });

  it('labels the tool printed itself, with its own minus, dot and pi, read back as the same function', async () => {
    for (const text of ['-x^(-2)', '2x^(-2)', 'x^(-2) - 1/x^3', 'pi/x^2', '3*x^(-2)+e^(-x)', '|x|^(-1/2)']) {
      const f = C.compile(text);
      expect(f.ok, text).toBe(true);
      const migrated = Object.keys(C.migrateFnKeys({ ['imp:' + f.label + '|zz|1']: true }));
      expect(migrated, text + ' printed as ' + f.label).toEqual([C.impCreditKey(f)]);
    }
  });

  it('a function defined at too few sample points keeps its credit too', async () => {
    const f = C.compile('sqrt(x - 1000)');
    expect(f.ok).toBe(true);
    const migrated = C.migrateFnKeys({ ['imp:' + f.label + '|zz|1']: true });
    expect(C.impLegacyEarned(migrated, f, 'converges')).toBe(true);
    expect(C.impLegacyEarned(migrated, f, 'diverges')).toBe(true);
  });

  it('a reload after the migration pays nothing and changes nothing', async () => {
    let m = await mount({ tab: 'integral', impText: '1/x^2', impA: '1', impB: 'inf', missionXP: Object.assign({}, OLD) });
    const saved = JSON.parse(JSON.stringify(m.latest.missionXP));
    m = await mount({ tab: 'integral', impText: '1/x^2', impA: '1', impB: 'inf', missionXP: saved });
    expect(m.latest.missionXP).toEqual(saved);
    await solve('1');
    expect(m.xp).toEqual([]);
    expect(Object.keys(C.migrateFnKeys(saved)).sort()).toEqual(Object.keys(saved).sort());
  });

  it('migrating twice gives the same keys', () => {
    const once = C.migrateFnKeys(Object.assign({ 'anti:x^3': true, 'dfx:x^3': true }, OLD));
    expect(C.migrateFnKeys(once)).toEqual(once);
  });

  it('a different function still pays', async () => {
    const m = await mount({ tab: 'integral', impText: 'e^(-x)', impA: '0', impB: 'inf', missionXP: Object.assign({}, OLD) });
    await solve('1');
    expect(m.xp.length).toBe(1);
  });

  it('an old key still ticks the improper step and the teacher count', async () => {
    const m = await mount({ tab: 'challenge', calcBand: 'bc', missionXP: { 'imp:ln(x)|0|1': true, 'imp:ln(x)|0|2': true, 'imp:1/x|1|Infinity': true } }, { isTeacherMode: true });
    expect(impKeys(m).every((k) => HASHED.test(k))).toBe(true);
    expect(impKeys(m).length, 'same function and verdict merge; a second function stays').toBe(2);
    expect(container.querySelector('[data-calculus-teacher]').textContent).toContain('Improper integrals decided2');
    await click([...container.querySelectorAll('[data-calc-path] button')].find((b) => (b.textContent || '').includes('Show the path')));
    expect(container.querySelector('[data-calc-path-step="improper"]').getAttribute('data-done')).toBe('true');
    expect(errors).toEqual([]);
  });

  it('verdicts and bounds logic stay as they were', async () => {
    const m = await mount({ tab: 'integral', impText: '1/x', impA: '-1', impB: '1', missionXP: Object.assign({}, OLD) });
    await solve('div');
    await setIntegral('1/x^2', '1', 'inf');
    expect(panel().textContent).not.toContain('Correct.');
    await solve('1');
    expect(m.xp.length, '1/x is new; 1/x^2 converging is old').toBe(1);
  });
});

describe('bad saved data', () => {
  const BAD = {
    'imp:': true, 'imp:|': true, 'imp:||': true, 'imp:|||': true, 'imp:((|1|2': true, 'imp:e^(-x)': 'x', 'imp:constructor|0|1': true, 'imp:__proto__|0|1': true,
    'imp:constructor(x)|0|1': true, 'imp:toString|a|b': true, 'imp:hasOwnProperty(x)|1|2': true, 'imp:secret typed words|0|1': true, 'imp:fn:x^2+1|0|1': true, 'imp:fn:abc:weird text': true,
  };

  it.each(Object.keys(BAD))('%s leaves no typed text and no crash', (k) => {
    const out = C.migrateFnKeys({ [k]: BAD[k] });
    const keys = Object.keys(out);
    expect(keys.length).toBe(1);
    expect(keys[0]).toMatch(HASHED);
    expect(out[keys[0]]).toBe(true);
  });

  it('a falsy old key is dropped, and pays no credit', () => {
    expect(C.migrateFnKeys({ 'imp:1/x^2|1|Infinity': false, 'imp:ln(x)|0|1': 0, 'imp:1/x|1|2': null })).toEqual({});
  });

  it('the __proto__ name does not reach the prototype, and non-objects return an empty map', () => {
    const parsed = JSON.parse('{"__proto__":{"imp:fn:abc:converges":true},"constructor":true,"imp:__proto__|0|1":true}');
    const out = C.migrateFnKeys(parsed);
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(out['imp:fn:abc:converges']).toBeUndefined();
    expect(({}).polluted).toBeUndefined();
    for (const v of [null, undefined, 'x', 7]) expect(C.migrateFnKeys(v)).toEqual({});
  });

  it('a save holding all of them mounts, ends with no typed text, and still pays a new function', async () => {
    const m = await mount({ tab: 'integral', impText: 'e^(-x)', impA: '0', impB: 'inf', missionXP: Object.assign(JSON.parse('{"__proto__":true,"constructor":true}'), BAD) });
    expect(errors).toEqual([]);
    expect(impKeys(m).every((k) => HASHED.test(k))).toBe(true);
    expect(JSON.stringify(m.latest.missionXP)).not.toMatch(/secret|\(\(|x\^2|weird|toString/);
    await solve('1');
    expect(m.xp.length).toBe(1);
  });

  it.each([['a string', 'imp:x|0|1'], ['an array', ['imp:x|0|1']], ['a number', 7], ['null', null]])('missionXP as %s does not crash', async (_n, v) => {
    const m = await mount({ tab: 'integral', impText: 'e^(-x)', impA: '0', impB: 'inf', missionXP: v });
    await solve('1');
    expect(errors).toEqual([]);
    expect(m.xp.length).toBe(1);
  });
});
