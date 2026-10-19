// Math review (algebra lane): Algebra CAS grading engine, mode switch, grade band,
// re-click counting and button names. MATH_REVIEW_ALGEBRACAS points the suite at
// another copy of the tool (used to mutation-check these tests).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW_ALGEBRACAS || 'stem_lab/stem_tool_algebracas.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;

beforeEach(() => { resetStemLab(); loadTool(FILE, 'algebraCAS'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });
const cas = () => window.__alloCASPure;

describe('gradeAnswer keeps variables apart', () => {
  it('rejects a system answer with the x and y values swapped', () => {
    expect(cas().gradeAnswer('x=3, y=2', 'x = 2, y = 3')).toMatchObject({ decidable: true, correct: false });
    expect(cas().gradeAnswer('y = 3, x = 2', 'x = 2, y = 3')).toMatchObject({ decidable: true, correct: true });
    expect(cas().gradeAnswer('X=2, Y=3', 'x = 2, y = 3')).toMatchObject({ decidable: true, correct: true });
    expect(cas().gradeAnswer('x = 2', 'x = 2, y = 3')).toMatchObject({ decidable: true, correct: false });
  });

  it('does not read unknown words or other letters as x', () => {
    // sin(x) used to evaluate as x*(x), so it graded equal to x^2 "by the math engine".
    const sin = cas().gradeAnswer('sin(x)', 'x^2');
    expect(sin.decidable && sin.correct).toBe(false);
    const letters = cas().gradeAnswer('y^2', 'x^2');
    expect(letters.decidable && letters.correct).toBe(false);
    // "12 apples" was read as 12x, so the right answer 12 was marked wrong outright.
    const units = cas().gradeAnswer('12', '12 apples');
    expect(units.decidable && !units.correct).toBe(false);
  });

  it('keeps the single-variable grading it already had', () => {
    expect(cas().gradeAnswer('x=3, x=-2', 'x=-2, x=3')).toMatchObject({ decidable: true, correct: true });
    expect(cas().gradeAnswer('2(x+3)', '2x+6')).toMatchObject({ decidable: true, correct: true });
    expect(cas().gradeAnswer('2x+6', '2x+5')).toMatchObject({ decidable: true, correct: false });
    expect(cas().gradeAnswer('a = 3', 'a = 3')).toMatchObject({ decidable: true, correct: true });
    expect(cas().evalAt('3a + 2', 3)).toBe(11);
  });

  it('does not report a failed substitution for an equation in two variables', () => {
    expect(cas().verifySolution('y = 2x + 1', 'x = 1').verified).not.toBe(false);
    expect(cas().verifySolution('2x + 3y = 12', 'x = 3, y = 2').verified).not.toBe(false);
    expect(cas().verifySolution('2x + 5 = 13', 'x = 4').verified).toBe(true);
    expect(cas().verifySolution('2x + 5 = 13', 'x = 5').verified).toBe(false);
  });
});

describe('Solve tab modes and grade band', () => {
  const pressed = (html, label) => new RegExp('aria-pressed="true"[^>]*>' + label).test(html);

  it('Simplify and Expand stay selected after they are clicked', () => {
    for (const [id, label] of [['simplify', '✨ Simplify'], ['expand', '🔎 Expand'], ['factor', '🧩 Factor']]) {
      const html = renderTool('algebraCAS', { algebraCAS: { tab: 'solve', mode: id } });
      expect(pressed(html, label), id).toBe(true);
    }
  });

  it('a 5th grader sees the grade 3-5 introduction', () => {
    const html = renderTool('algebraCAS', { algebraCAS: {} }, { gradeLevel: '5th Grade' });
    expect(html).toContain('Solve linear equations step-by-step.');
    expect(html).not.toContain('Full CAS: polynomials');
    expect(renderTool('algebraCAS', { algebraCAS: {} }, { gradeLevel: '11th Grade' })).toContain('Full CAS: polynomials');
  });

  it('names each example chip by its visible example, not one shared label', () => {
    const html = renderTool('algebraCAS', { algebraCAS: { tab: 'solve', mode: 'solve', expression: '2x + 5 = 13' } });
    expect(html).not.toContain('aria-label="Step-by-Step Solution"');
  });
});

describe('re-clicking Solve on the same equation', () => {
  it('counts one solve and awards XP once', async () => {
    const award = vi.fn();
    let latest;
    function App() {
      const [state, setState] = React.useState({ algebraCAS: { tab: 'solve', mode: 'solve', expression: '2x + 5 = 13' } });
      latest = state;
      return window.StemLab._registry.algebraCAS.render(makeCtx({ toolData: state, setToolData: setState, awardXP: award, callGemini: null }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    const solve = () => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '▶ Solve');
    for (let i = 0; i < 5; i++) await React.act(() => solve().click());
    expect(latest.algebraCAS.result).toContain('ANSWER: 4');
    expect(latest.algebraCAS._solveCount).toBe(1);
    expect(latest.algebraCAS.history.length).toBe(1);
    expect(award.mock.calls.filter((c) => c[2] === 'Exact local solve').length).toBe(1);
  });
});
