import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { hasChoiceSpecificFeedback } = require('../dev-tools/non_eppp_feedback_checks.cjs');

describe('choice-specific non-EPPP feedback', () => {
  it('accepts substantive paraphrases without requiring the full option text', () => {
    expect(hasChoiceSpecificFeedback(
      'It is a measurement because the child compared the tray with the window without using a number.',
      'A qualitative comparison can be evidence, but calling the location relevant does not itself constitute measurement. The statement proposes a cause from observations.',
    )).toBe(true);
  });

  it('accepts an explanatory quotation of the option', () => {
    expect(hasChoiceSpecificFeedback(
      'Wait until another incident occurs.',
      '“Wait until another incident occurs” delays protection and does not follow current safeguarding procedures.',
    )).toBe(true);
  });

  it('rejects short or generic feedback with no option-specific concept', () => {
    expect(hasChoiceSpecificFeedback('Use a city ordinance.', 'Incorrect.')).toBe(false);
    expect(hasChoiceSpecificFeedback(
      'Use a city ordinance.',
      'This response is not the best available answer because a different response better satisfies the question.',
    )).toBe(false);
  });
});
