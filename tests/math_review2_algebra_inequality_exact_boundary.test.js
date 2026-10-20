// Math review 2 (algebra lane): the Inequality solver kept 2 decimals, so 3x - 1 < 0
// became "x < 0.33" and, after Graph It, x = 0.332 tested as NOT a solution of
// x < 1/3. Boundaries now stay exact. MATH_REVIEW2_INEQUALITY points the suite at
// another copy (mutation checks).
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const FILE = process.env.MATH_REVIEW2_INEQUALITY || 'stem_lab/stem_tool_inequality.js';
const src = fs.readFileSync(FILE, 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'inequality'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });

const solve = (() => {
  const body = sliceBetween(src, 'var solveInequality = function(raw) {', 'var zoomRange', { file: FILE, label: 'solveInequality' });
  // eslint-disable-next-line no-new-func
  return new Function(body + '\nreturn solveInequality;')();
})();
const solution = (raw) => { const steps = solve(raw); return steps ? steps.solution : null; };

async function mount(inequality) {
  const view = { state: null };
  function App() {
    const [state, setState] = React.useState({ inequality });
    view.state = state;
    return window.StemLab._registry.inequality.render(makeCtx({ toolData: state, setToolData: setState, addToast: vi.fn(), awardXP: vi.fn(), announceToSR: vi.fn() }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return view;
}
async function click(label) {
  const b = document.querySelector('button[aria-label="' + label + '"]');
  expect(b, label).toBeTruthy();
  await React.act(() => b.click());
}
async function testValue(text) {
  const el = document.querySelector('input[aria-label="Test a value against the inequality"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(() => { setter.call(el, text); el.dispatchEvent(new Event('input', { bubbles: true })); });
  return document.body.textContent;
}

describe('exact solver boundaries', () => {
  it('a non-terminating boundary stays a fraction', () => {
    expect(solution('3x - 1 < 0')).toBe('x < 1/3');
    expect(solution('-3x + 1 <= 0')).toBe('x >= 1/3');
    expect(solution('7x + 0 > 1')).toBe('x > 1/7');
    expect(solution('6x - 4 > 0')).toBe('x > 2/3');
    expect(solution('0.3x + 0 < 1')).toBe('x < 10/3');
  });

  it('terminating boundaries print as before', () => {
    expect(solution('-0.5x + 1 < 3')).toBe('x > -4');
    expect(solution('4x - 1 < 0')).toBe('x < 0.25');
    expect(solution('8x - 1 >= 0')).toBe('x >= 0.125');
    expect(solution('x + 0.1 < 0.3')).toBe('x < 0.2');
  });

  it('after Graph It, values just inside and outside x < 1/3 test correctly', async () => {
    await mount({ solverExpr: '3x - 1 < 0' });
    await click('Solve');
    await click('Graph It');
    expect(await testValue('0.332')).toContain('0.332 IS in the solution set');
    expect(await testValue('0.3333')).toContain('0.3333 IS in the solution set');
    expect(await testValue('0.334')).toContain('0.334 is NOT in the solution set');
    expect(await testValue('0.33')).toContain('0.33 IS in the solution set');
  });

  it('the graphed fraction reads as a fraction, not 0.3333333333333333', async () => {
    const view = await mount({ expr: 'x < 1/3' });
    expect(view.state.inequality.expr).toBe('x < 1/3');
    const text = document.body.textContent;
    expect(text).toContain('(-∞, 1/3)');
    expect(text).not.toMatch(/0\.3333333/);
    expect(await testValue('0.332')).toContain('IS in the solution set');
  });
});
