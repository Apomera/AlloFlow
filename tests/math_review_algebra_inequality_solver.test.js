// Math review (algebra lane): Inequality step-by-step solver, expression badges and
// solver quest counting. MATH_REVIEW_INEQUALITY points the suite at another copy
// of the tool (mutation checks).
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW_INEQUALITY || 'stem_lab/stem_tool_inequality.js';
const src = fs.readFileSync(FILE, 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'inequality'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });

const solve = (() => {
  const start = src.indexOf('var solveInequality = function(raw) {');
  const end = src.indexOf('var zoomRange', start);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn solveInequality;')();
})();
const solution = (raw) => { const steps = solve(raw); return steps ? steps.solution : null; };

describe('step-by-step solver', () => {
  it('solves the whole inequality, including decimal coefficients and the flip', () => {
    expect(solution('-0.5x + 1 < 3')).toBe('x > -4');
    expect(solution('0.5x + 1 < 3')).toBe('x < 4');
    expect(solution('3x - 7 >= 5')).toBe('x >= 4');
    expect(solution('-2x + 4 < 10')).toBe('x > -3');
  });

  it('refuses forms it cannot solve instead of solving a fragment', () => {
    // x + 1 < 2x + 3 has x on both sides; the old pattern solved only "x+1<2" -> x < 1 (true answer x > -2).
    expect(solution('x + 1 < 2x + 3')).toBeNull();
    expect(solution('2x + 3 < 7 + x')).toBeNull();
    expect(solution('0x + 3 < 7')).toBeNull();
  });

  it('prints clean step values', () => {
    const steps = solve('x + 0.1 < 0.3');
    expect(steps.map((s) => s.text).join(' | ')).not.toMatch(/\d{8,}/);
    expect(steps.solution).toMatch(/^x < 0\.20?$/);
  });
});

describe('expression badges', () => {
  it('awards Abs Value once for |x - 3| < 5', () => {
    const toasts = [];
    const award = vi.fn();
    renderTool('inequality', { inequality: { expr: '|x - 3| < 5', graphMode: '1d' } }, { addToast: (m) => toasts.push(m), awardXP: award });
    expect(toasts.filter((m) => /Abs/i.test(m)).length).toBe(1);
    expect(toasts.filter((m) => /Compound/i.test(m)).length).toBe(1);
    expect(award).toHaveBeenCalledTimes(2);
  });
});

describe('graph_first quest', () => {
  it("is not complete from the host's starter expression alone", () => {
    const hook = window.StemLab._registry.inequality.questHooks.find((h) => h.id === 'graph_first');
    expect(hook.check({ expr: 'x > 3', variable: 'x', range: { min: -10, max: 10 } })).toBe(false);
  });

  it('completes when the student picks a preset', async () => {
    let latest;
    function App() {
      const [state, setState] = React.useState({ inequality: { expr: 'x > 3' } });
      latest = state;
      return window.StemLab._registry.inequality.render(makeCtx({ toolData: state, setToolData: setState, addToast: vi.fn() }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    const preset = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'x < -2');
    expect(preset).toBeTruthy();
    await React.act(() => preset.click());
    expect(latest.inequality.expr).toBe('x < -2');
    expect(window.StemLab._registry.inequality.questHooks.find((h) => h.id === 'graph_first').check(latest.inequality)).toBe(true);
  });
});

describe('solver quest', () => {
  it('re-solving the same inequality does not advance solver_3', async () => {
    let latest;
    function App() {
      const [state, setState] = React.useState({ inequality: { solverExpr: '3x - 7 >= 5' } });
      latest = state;
      return window.StemLab._registry.inequality.render(makeCtx({ toolData: state, setToolData: setState, addToast: vi.fn() }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    const btn = () => document.querySelector('button[aria-label="Solve"]');
    expect(btn()).toBeTruthy();
    for (let i = 0; i < 3; i++) await React.act(() => btn().click());
    expect(latest.inequality.solverCount).toBe(1);
    expect(window.StemLab._registry.inequality.questHooks.find((h) => h.id === 'solver_3').check(latest.inequality)).toBe(false);
  });
});
