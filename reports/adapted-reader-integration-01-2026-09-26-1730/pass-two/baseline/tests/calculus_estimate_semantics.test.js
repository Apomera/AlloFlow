import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderCalculus(state = {}) {
  return renderTool('calculus', { calculus: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_calculus.js', 'calculus');
});

describe('Calculus estimate semantics', () => {
  it('keeps Simpson subdivisions even without silently changing methods', () => {
    const normalize = window.__CalculusCore.normalizeSubdivisions;
    expect(normalize(5, 'simpson')).toBe(6);
    expect(normalize(199, 'simpson')).toBe(200);
    expect(normalize(200, 'simpson')).toBe(200);
    expect(normalize(5, 'midpoint')).toBe(5);
    expect(normalize('bad', 'simpson')).toBe(20);
  });

  it('classifies estimates numerically as over, exact, under, or undefined', () => {
    const classify = window.__CalculusCore.classifyApproximation;
    expect(classify(3.1, 3)).toBe('over');
    expect(classify(2.9, 3)).toBe('under');
    expect(classify(3 + 1e-10, 3)).toBe('exact');
    expect(classify(Number.NaN, 3)).toBe('undefined');
  });

  it('offers an exact choice for constant-function Riemann sums', () => {
    const state = { tab: 'integral', mode: 'left', a: 0, b: 0, c: 3, xMin: 1, xMax: 4, n: 5 };
    const questionHtml = renderCalculus(state);
    expect(questionHtml).toContain('aria-label="Exact estimate"');
    expect(questionHtml).not.toContain("Can&#x27;t tell");

    const feedbackHtml = renderCalculus({ ...state, overUnderGuess: 'exact', overUnderChecked: true });
    expect(feedbackHtml).toContain('The estimate is EXACT at this resolution.');
    expect(feedbackHtml).toContain('The numerical error is effectively zero');
  });

  it('describes integral and derivative SVGs with their mathematical state', () => {
    const integralHtml = renderCalculus({
      tab: 'integral', mode: 'simpson', a: 1, b: 0, c: 0,
      xMin: 0, xMax: 1, n: 5
    });
    expect(integralHtml).toContain('role="img"');
    expect(integralHtml).toContain('using 6 simpson subdivisions');
    expect(integralHtml).toContain('exact integral 0.3333');
    expect(integralHtml).toContain('aria-pressed="true"');

    const derivativeHtml = renderCalculus({
      tab: 'derivative', a: 1, b: 0, c: 0,
      xMin: 0, xMax: 3, x0: 1, secantH: 0.1
    });
    expect(derivativeHtml).toContain('Tangent at x 1 has slope 2.000');
    expect(derivativeHtml).toContain('Secant gap h is 0.10');
  });

  it('uses accurate Simpson and mission descriptions', () => {
    const html = renderCalculus({ tab: 'integral' });
    expect(html).toContain('integrates every polynomial through degree 3 exactly when n is even');
    const fileSource = fs.readFileSync('stem_lab/stem_tool_calculus.js', 'utf8');
    expect(fileSource).toContain('Load f(x) = x squared on 0 to 3 with 6 subdivisions');
    expect(fileSource).toContain('Load f(x) = x squared with x zero equal to 1');
  });
});
