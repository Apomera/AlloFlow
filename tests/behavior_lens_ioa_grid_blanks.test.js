// Behavior Lens IOA calculator: the interval grid.
//
// WHY: until 2026-09-23 the grid read a blank cell as an observed 0 (and showed "0" as
// its placeholder). Calculate on the untouched 10-row grid reported 100% "Acceptable
// (>=80%)", and a 6-interval session typed into the default 10 rows gained 4 intervals
// of perfect agreement: Obs1 1,1,0,1,0,1 against Obs2 1,0,0,1,1,1 is 4/6 = 66.7%
// (below 80%) but read 8/10 = 80.0% "Acceptable". A row only one observer filled was
// scored against an invented 0. Expected values are worked by hand.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let IOA, API, root;
beforeAll(() => {
  setupBehaviorLens();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.AlloModules.BehaviorLens;
  const source = readFileSync('behavior_lens_module.js', 'utf8');
  new Function(source.replace(/\}\)\(\);\s*$/, 'window.__blIoaGridTest = { IOACalculator };})();'))();
  IOA = window.__blIoaGridTest.IOACalculator;
  API = window.AlloModules.BehaviorLensIOA;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  document.body.innerHTML = '';
});

async function mount() {
  document.body.innerHTML = '<div class="bl-root"><div id="mount"></div></div>';
  root = createRoot(document.getElementById('mount'));
  const toasts = [];
  await act(async () => root.render(React.createElement(IOA, { studentName: 'Test', abcEntries: [], callGemini: null, callGeminiVision: null, t: k => k, addToast: (m, kind) => toasts.push([m, kind]) })));
  return toasts;
}
const cell = (i, obs) => document.querySelector(`input[aria-label="Interval ${i} observer ${obs}"]`);
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
const calculate = () => act(async () => { document.querySelector('button[aria-label="Calculate IOA"]').click(); });
const shown = () => document.querySelector('.text-4xl') && document.querySelector('.text-4xl').textContent;

describe('ioaGridLists', () => {
  it('leaves out rows nobody recorded and flags rows only one observer filled', () => {
    expect(API.ioaGridLists([{ obs1: '1', obs2: '1' }, { obs1: '', obs2: '' }, { obs1: '0', obs2: '' }, { obs1: ' 0 ', obs2: '1' }]))
      .toEqual({ d1: ['1', '0'], d2: ['1', '1'], blankRows: 1, oneSided: [3], rowNumbers: [1, 4] });
  });
});

describe('the grid', () => {
  it('an untouched grid is not "100% Acceptable"', async () => {
    const toasts = await mount();
    await calculate();
    expect(shown()).not.toBe('100%');
    expect(toasts.pop()[1]).toBe('error');
  });
  it('6 intervals in the 10-row grid score 4/6, not 8/10', async () => {
    await mount();
    const o1 = [1, 1, 0, 1, 0, 1], o2 = [1, 0, 0, 1, 1, 1];
    for (let i = 0; i < 6; i += 1) { await type(cell(i + 1, 1), String(o1[i])); await type(cell(i + 1, 2), String(o2[i])); }
    await calculate();
    expect(document.body.textContent).toContain('66.7');                        // old: 80.0, Acceptable
    expect(document.querySelector('[data-ioa-blank]').textContent).toBe('6 intervals scored. 4 blank rows were not counted.');
  });
  it('a row only one observer filled is refused, not scored against a 0', async () => {
    const toasts = await mount();
    await type(cell(1, 1), '1'); await type(cell(1, 2), '1');
    await type(cell(2, 1), '1');
    await calculate();
    const [msg, kind] = toasts.pop();
    expect(kind).toBe('error');
    expect(msg).toBe('Only one observer recorded interval 2. Fill in both observers, or clear the row if nobody recorded it.');
  });
  it('the grid no longer shows 0 as a placeholder', async () => {
    await mount();
    expect(cell(1, 1).getAttribute('placeholder')).toBe(null);
  });
});
