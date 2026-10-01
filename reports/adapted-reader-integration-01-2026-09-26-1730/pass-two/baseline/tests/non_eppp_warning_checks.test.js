import { describe, expect, it } from 'vitest';
import warningChecks from '../dev-tools/non_eppp_warning_checks.cjs';

const { warningCodes } = warningChecks;

const detailedFeedback = [
  'This response is incorrect because it addresses a different condition and does not establish the relationship required by the scenario.',
  'This response is correct because the stated evidence directly satisfies the decision rule and accounts for the relevant classroom conditions.',
  'This response is incorrect because the proposed action omits a necessary comparison and therefore cannot support the stated conclusion.',
  'This response is incorrect because the information described is incidental and does not measure the outcome identified in the prompt.',
];

describe('non-EPPP warning diagnostics', () => {
  it('does not treat shared grammatical function words as lexical answer clues', () => {
    const warnings = warningCodes({
      prompt: 'Which option would best fit the scenario with the facts provided?',
      choices: [
        'Record an unrelated classroom preference for later discussion.',
        'Compare the observations with a documented criterion.',
        'Select a convenient action before examining the available record.',
        'Repeat the original claim in a separate document for the team.',
      ],
      answerIndex: 1,
      difficulty: 'application',
      choiceRationales: detailedFeedback,
    });
    expect(warnings).not.toContain('key-stem-lexical-leakage');
  });

  it('retains the warning when a substantive stem term appears uniquely in the key', () => {
    const warnings = warningCodes({
      prompt: 'Which response uses direct observation to evaluate the classroom concern?',
      choices: [
        'Ask a colleague to guess what happened during the lesson.',
        'Use direct observation and record the relevant events across lessons.',
        'Choose an intervention based on a general label for the learner.',
        'Wait for an annual meeting before collecting any classroom information.',
      ],
      answerIndex: 1,
      difficulty: 'application',
      choiceRationales: detailedFeedback,
    });
    expect(warnings).toContain('key-stem-lexical-leakage');
  });
});
