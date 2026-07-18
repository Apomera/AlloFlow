import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderCalculus(state = {}) {
  return renderTool('calculus', { calculus: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_calculus.js', 'calculus');
});

describe('Calculus challenge correctness', () => {
  it('requires the true minimum subdivision count', () => {
    const grade = window.__CalculusCore.challengeAnswerIsCorrect;
    expect(grade('minN', 42, 42)).toBe(true);
    expect(grade('minN', 43, 42)).toBe(false);
    expect(grade('minN', 44, 42)).toBe(false);
  });

  it('finds demanding left-sum targets instead of falling back to n = 2', () => {
    const core = window.__CalculusCore;
    const minimum = core.minimumLeftSubdivisions(2, 1, 0, 3, 0.25, 200);
    expect(minimum).toBeGreaterThan(100);
    expect(Math.abs(core.leftRiemannEstimate(2, 1, 0, 3, minimum) - 22.5)).toBeLessThan(0.25);
    expect(Math.abs(core.leftRiemannEstimate(2, 1, 0, 3, minimum - 1) - 22.5)).toBeGreaterThanOrEqual(0.25);
  });

  it('uses three-decimal precision for exact-integral answers', () => {
    const grade = window.__CalculusCore.challengeAnswerIsCorrect;
    expect(grade('exact', '0.3333', 0.333)).toBe(true);
    expect(grade('exact', '0.34', 0.333)).toBe(false);
    expect(grade('exact', 'not a number', 0.333)).toBe(false);
  });

  it('clamps stale tangent and secant state to the visible controls', () => {
    const html = renderCalculus({
      tab: 'derivative', a: 1, b: 0, c: 0,
      xMin: 0, xMax: 3, x0: 999, secantH: 'invalid'
    });
    expect(html).toContain('Tangent at x 4 has slope 8.000');
    expect(html).toContain('Secant gap h is 1.00');
    expect(html).not.toContain('NaN');
  });

  it('shows rectangles, all signed choices, and selected challenge state', () => {
    const html = renderCalculus({
      tab: 'challenge', calcChallengeMode: 'overunder',
      a: 1, b: 0, c: 0, xMin: 0, xMax: 2, n: 4, mode: 'left',
      calcQuiz: {
        mode: 'overunder', a: 1, b: 0, c: 0, xMin: 0, xMax: 2,
        n: 4, ruleMode: 'left', answer: 'under', answered: false,
        question: 'Is this estimate over, exact, or under?'
      }
    });
    expect(html).toContain('OVERestimate');
    expect(html).toContain('EXACT');
    expect(html).toContain('UNDERestimate');
    expect(html).toContain('rgba(59,130,246,0.18)');
    expect(html).toMatch(/Start .*Over or Under.* challenge[^>]*aria-pressed="true"/);
  });
});
