import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderFractions(state = {}) {
  return renderTool('fractions', { _fractions: { navMode: 'practice', ...state } });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_fractions.js', 'fractions');
});

describe('Fractions Lab signed operations', () => {
  it('normalizes denominator signs and zero consistently', () => {
    const normalize = window.__FractionsCore.normalizeFractionPair;
    expect(normalize(4, -6)).toEqual([-2, 3]);
    expect(normalize(-4, -6)).toEqual([2, 3]);
    expect(normalize(0, -8)).toEqual([0, 1]);
  });

  it('classifies positive, zero, negative, and undefined results', () => {
    const classify = window.__FractionsCore.classifyFractionResultSign;
    expect(classify(5, false)).toBe('positive');
    expect(classify(0, false)).toBe('zero');
    expect(classify(-2, false)).toBe('negative');
    expect(classify(2, true)).toBe('undefined');
  });

  it('explains signed-operation reasoning and subtraction rewrites', () => {
    const explain = window.__FractionsCore.buildSignedOperationReasoning;
    const subtraction = explain('sub', -1, 2, -3, 4, 'positive');
    expect(subtraction.title).toBe('Add the opposite');
    expect(subtraction.rewrite).toBe('-1/2 - (-3/4) = -1/2 + (3/4)');
    expect(subtraction.rule).toContain("second addend's positive sign");

    const cancellation = explain('add', -2, 3, 2, 3, 'zero');
    expect(cancellation.rule).toContain('additive inverses');
    expect(cancellation.rule).toContain('cancel to zero');

    expect(explain('mul', -2, 3, 3, 5, 'negative').rule).toContain('different signs');
    expect(explain('div', -1, 2, -3, 4, 'positive').rule).toContain('same signs');
    expect(explain('mul', 0, 5, -7, 8, 'zero').title).toBe('Use the zero rule');
  });

  it('provides a curated mission deck with valid signs across all operations', () => {
    const core = window.__FractionsCore;
    expect(core.signedOperationChallengeCount).toBe(10);
    const operations = new Set();
    const signs = new Set();

    for (let index = 0; index < core.signedOperationChallengeCount; index += 1) {
      const mission = core.getSignedOperationChallenge(index);
      operations.add(mission.opMode);
      let pair;
      if (mission.opMode === 'add') pair = [mission.num1 * mission.den2 + mission.num2 * mission.den1, mission.den1 * mission.den2];
      if (mission.opMode === 'sub') pair = [mission.num1 * mission.den2 - mission.num2 * mission.den1, mission.den1 * mission.den2];
      if (mission.opMode === 'mul') pair = [mission.num1 * mission.num2, mission.den1 * mission.den2];
      if (mission.opMode === 'div') pair = [mission.num1 * mission.den2, mission.den1 * mission.num2];
      const normalized = core.normalizeFractionPair(pair[0], pair[1]);
      signs.add(core.classifyFractionResultSign(normalized[0], mission.opMode === 'div' && mission.num2 === 0));
      expect(mission.label).toBeTruthy();
    }

    expect([...operations].sort()).toEqual(['add', 'div', 'mul', 'sub']);
    expect(signs).toEqual(new Set(['positive', 'negative', 'zero']));
  });

  it('renders mission identity, independent stats, and accessible accuracy', () => {
    const html = renderFractions({
      tab: 'operations',
      signedFractions: true,
      signChallengeIndex: 3,
      signCorrectCount: 4,
      signAttemptCount: 6,
      signStreak: 2,
      signBestStreak: 5,
      num1: -1,
      den1: 2,
      num2: -3,
      den2: 4,
      opMode: 'sub'
    });
    expect(html).toContain('Sign Detective missions');
    expect(html).toContain('Mission 4 of 10: Subtract a negative');
    expect(html).toContain('aria-label="Sign Detective accuracy: 67 percent"');
    expect(html).toContain('Change mission');
  });

  it('offers an accessible predict-reveal workflow for signed operands', () => {
    const html = renderFractions({ tab: 'operations', signedFractions: true, num1: 1, den1: 2, num2: -3, den2: 4, opMode: 'div' });
    expect(html).toContain('Sign Detective: predict the result');
    expect(html).toContain('name="fraction-sign-prediction"');
    expect(html).toContain('Check sign and reveal');
    expect(html).toContain('Predict the sign before revealing the exact value.');
    expect(html).toContain('Strategy: For multiplication and division, decide whether the two nonzero operands have the same sign or different signs.');
    expect(html).not.toContain('The exact result is -2/3');
    expect(html).not.toContain('Reasoning coach:');
  });

  it('reveals a normalized exact result after a prediction check', () => {
    const html = renderFractions({
      tab: 'operations',
      signedFractions: true,
      num1: 1,
      den1: 2,
      num2: -3,
      den2: 4,
      opMode: 'div',
      signPrediction: 'negative',
      signFeedback: { key: 'div|1|2|-3|4', correct: true, actual: 'negative' }
    });
    expect(html).toContain('The exact result is -2/3, which is negative.');
    expect(html).toContain('Reasoning coach: Count negative signs');
    expect(html).toContain('The operands have different signs, so the quotient is negative.');
    expect(html).toContain('Same signs make a positive result; different signs make a negative result.');
    expect(html).toContain('aria-live="polite"');
  });

  it('plots signed operands and subtraction movement on an accessible number line', () => {
    const html = renderFractions({
      tab: 'operations',
      signedFractions: true,
      num1: -1,
      den1: 2,
      num2: -3,
      den2: 4,
      opMode: 'sub',
      signPrediction: 'positive',
      signFeedback: { key: 'sub|-1|2|-3|4', correct: true, actual: 'positive' }
    });
    expect(html).toContain('Signed position map');
    expect(html).toContain('Auto-scaled from -1 to 1');
    expect(html).toContain('role="img"');
    expect(html).toContain('The result is 1 over 4, positive.');
    expect(html).toContain('Subtracting B means adding its opposite, so move right by 3/4 to the result.');
  });

  it('explains multiplication sign rules without implying additive movement', () => {
    const html = renderFractions({
      tab: 'operations',
      signedFractions: true,
      num1: -8,
      den1: 3,
      num2: -9,
      den2: 4,
      opMode: 'mul',
      signPrediction: 'positive',
      signFeedback: { key: 'mul|-8|3|-9|4', correct: true, actual: 'positive' }
    });
    expect(html).toContain('Auto-scaled from -6 to 6');
    expect(html).toContain('The operands have the same signs, so the product is positive.');
    expect(html).not.toContain('Start at A. Adding B');
  });

  it('keeps signed controls bounded and invalidates stale predictions', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fractions.js', 'utf8');
    expect(source).toContain("min: signedFractions ? -20 : 0");
    expect(source).toContain("o.signPrediction = null; o.signFeedback = null;");
    expect(source).toContain("opMode: op[0], signPrediction: null, signFeedback: null");
    expect(source).toContain("role: 'switch', 'aria-checked': signedFractions");
  });
});
