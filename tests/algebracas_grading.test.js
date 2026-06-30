// algebraCAS correctness now comes from a deterministic, CSP-safe expression engine
// (window.__alloCASPure) — NOT the LLM. Grading was previously a /CORRECT:\s*yes/ regex
// on the model's reply; it is now decided by root-multiset match / sample-point
// equivalence, with the model kept for feedback prose only. These tests lock that engine.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_algebracas.js', 'algebraCAS'); });
const cas = () => window.__alloCASPure;

describe('algebraCAS — deterministic evaluator (no eval/Function)', () => {
  it('evaluates with implicit multiplication and unicode glyphs', () => {
    expect(cas().evalAt('2x+5', 3)).toBeCloseTo(11, 6);
    expect(cas().evalAt('3(x-2)', 4)).toBeCloseTo(6, 6);
    expect(cas().evalAt('x²-9', 4)).toBeCloseTo(7, 6);      // unicode superscript
    expect(cas().evalAt('sqrt(x)', 16)).toBeCloseTo(4, 6);
  });
  it('returns NaN on malformed input instead of crashing', () => {
    expect(Number.isNaN(cas().evalAt('x +', 1))).toBe(true);
    expect(Number.isNaN(cas().evalAt('(x', 1))).toBe(true);
  });
});

describe('algebraCAS — deterministic grading (replaces the LLM /CORRECT:yes/ regex)', () => {
  it('grades roots order-independently', () => {
    expect(cas().gradeAnswer('x=3, x=-2', 'x=-2, x=3')).toMatchObject({ decidable: true, correct: true });
    expect(cas().gradeAnswer('x=3', 'x=4')).toMatchObject({ decidable: true, correct: false });
    expect(cas().gradeAnswer('3', 'x = 3')).toMatchObject({ decidable: true, correct: true });
    expect(cas().gradeAnswer('x=3,x=-2', 'x=-2')).toMatchObject({ decidable: true, correct: false }); // extra root
  });
  it('grades factor/expand equivalence by sample points', () => {
    expect(cas().gradeAnswer('x^2-1', '(x-1)(x+1)')).toMatchObject({ decidable: true, correct: true });
    expect(cas().gradeAnswer('x^2+2x+1', '(x+1)^2')).toMatchObject({ decidable: true, correct: true });
    expect(cas().gradeAnswer('x^2+2x+2', '(x+1)^2')).toMatchObject({ decidable: true, correct: false });
  });
  it('falls back to not-decidable when it cannot parse (LLM safety net)', () => {
    expect(cas().gradeAnswer('', 'x=3').decidable).toBe(false);
  });
});

describe('algebraCAS — verifySolution substitutes the root back in', () => {
  it('verifies correct and refutes incorrect solutions', () => {
    expect(cas().verifySolution('2x + 5 = 13', 'x = 4').verified).toBe(true);
    expect(cas().verifySolution('2x + 5 = 13', 'x = 5').verified).toBe(false);
    expect(cas().verifySolution('x^2 - 9 = 0', 'x=3, x=-3').verified).toBe(true);
  });
  it('is not-decidable for a factored (non-numeric) answer', () => {
    expect(cas().verifySolution('factor x^2-9', '(x-3)(x+3)').decidable).toBe(false);
  });
});

describe('algebraCAS — verdict chip is shown for verified grades', () => {
  it('renders "Checked by the math engine" distinctly from the AI feedback', () => {
    const html = renderTool('algebraCAS', {
      algebraCAS: {
        mode: 'practice', activeTab: 'practice', tab: 'practice',
        practiceQ: { problem: '2x+5=13', answer: 'x = 4', hint: '' },
        practiceAnswer: 'x = 4',
        practiceFeedback: { correct: true, text: 'FEEDBACK: Nice work', gradeSource: 'verified', gradeDetail: 'Both give x = 4' }
      }
    });
    expect(html).toContain('Checked by the math engine');
  });
});
