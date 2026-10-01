import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let aggregators;

beforeAll(() => {
  loadAlloModule('quiz_live_aggregators.js');
  aggregators = window.AlloModules.QuizLiveAggregators;
});

const policy = (overrides = {}) => aggregators.normalizeLiveScoringPolicy(overrides);

describe('live quiz scoring policy normalization', () => {
  it('keeps legacy live sessions accuracy-based and makes confidence opt-in', () => {
    expect(policy()).toEqual({
      accuracy: true,
      confidence: false,
      partialCredit: true,
    });
  });

  it('accepts only explicit booleans and fails closed for malformed values', () => {
    expect(policy({
      accuracy: false,
      confidence: true,
      partialCredit: false,
    })).toEqual({
      accuracy: false,
      confidence: true,
      partialCredit: false,
    });

    expect(policy({
      accuracy: 'false',
      confidence: 'true',
      partialCredit: 'false',
    })).toEqual({
      accuracy: true,
      confidence: false,
      partialCredit: true,
    });
  });
});

describe('presentation accuracy weights', () => {
  const multiSelect = {
    type: 'multi-select',
    options: ['A', 'B', 'C'],
    correctAnswers: ['A', 'B'],
  };

  it('normalizes binary and partial item scores to a zero-to-one weight', () => {
    const mcq = { type: 'mcq', options: ['A', 'B'], correctAnswer: 'A' };
    expect(aggregators.presentationAccuracyWeight(
      { answer: { optionIdx: 0 } },
      mcq,
      policy(),
    )).toBe(1);
    expect(aggregators.presentationAccuracyWeight(
      { answer: { optionIdx: 1 } },
      mcq,
      policy(),
    )).toBe(0);

    expect(aggregators.presentationAccuracyWeight(
      { answer: { selectedIndices: [0] } },
      multiSelect,
      policy({ partialCredit: true }),
    )).toBe(0.5);
  });

  it('honors all-or-nothing scoring without changing the shared grader', () => {
    const partial = { answer: { selectedIndices: [0] } };
    expect(aggregators.presentationAccuracyWeight(
      partial,
      multiSelect,
      policy({ partialCredit: true }),
    )).toBe(0.5);
    expect(aggregators.presentationAccuracyWeight(
      partial,
      multiSelect,
      policy({ partialCredit: false }),
    )).toBe(0);
    expect(aggregators.presentationAccuracyWeight(
      { answer: { selectedIndices: [0, 1] } },
      multiSelect,
      policy({ partialCredit: false }),
    )).toBe(1);
  });

  it('returns null when accuracy is disabled or the item is not safely evaluable', () => {
    const mcq = { type: 'mcq', options: ['A', 'B'], correctAnswer: 'A' };
    expect(aggregators.presentationAccuracyWeight(
      { answer: { optionIdx: 0 } },
      mcq,
      policy({ accuracy: false }),
    )).toBeNull();
    expect(aggregators.presentationAccuracyWeight(
      { answer: { text: 'A thoughtful explanation' } },
      { type: 'short-answer', question: 'Explain.' },
      policy(),
    )).toBeNull();
  });
});

describe('optional confidence diagnostics', () => {
  const question = {
    type: 'mcq',
    options: ['A', 'B'],
    correctAnswer: 'A',
  };

  it('builds calibration buckets without turning confidence into bonus points', () => {
    const responses = {
      calibrated: { answer: { optionIdx: 0 }, confidence: 'knew' },
      fragile: { answer: { optionIdx: 0 }, confidence: 'guessed' },
      confidentWrong: { answer: { optionIdx: 1 }, confidence: 'knew' },
      uncertain: { answer: { optionIdx: 1 }, confidence: 'no-idea' },
      missing: { answer: { optionIdx: 0 } },
      invalid: { answer: { optionIdx: 1 }, confidence: 'absolutely' },
    };
    const summary = aggregators.aggregatePresentationResponses(
      question,
      responses,
      policy({ confidence: true }),
    );

    expect(summary).toMatchObject({
      confidenceReportedCount: 4,
      confidenceMissingCount: 2,
      confidenceBuckets: {
        calibrated: 1,
        fragile: 1,
        confidentWrong: 1,
        uncertain: 1,
      },
    });
    expect(summary.correctCount).toBe(3);

    expect(aggregators.presentationAccuracyWeight(
      responses.calibrated,
      question,
      policy({ confidence: true }),
    )).toBe(1);
    expect(aggregators.presentationAccuracyWeight(
      responses.fragile,
      question,
      policy({ confidence: true }),
    )).toBe(1);
  });

  it('keeps missing confidence neutral and ignores confidence when collection is off', () => {
    const responses = {
      one: { answer: { optionIdx: 0 } },
      two: { answer: { optionIdx: 1 }, confidence: 'knew' },
    };
    const enabled = aggregators.aggregatePresentationResponses(
      question,
      responses,
      policy({ confidence: true }),
    );
    expect(enabled).toMatchObject({
      confidenceReportedCount: 1,
      confidenceMissingCount: 1,
    });
    expect(Object.values(enabled.confidenceBuckets).reduce((sum, value) => sum + value, 0)).toBe(1);

    const disabled = aggregators.aggregatePresentationResponses(
      question,
      responses,
      policy({ confidence: false }),
    );
    expect(disabled).toMatchObject({
      confidenceReportedCount: 0,
      confidenceMissingCount: 0,
      confidenceBuckets: {
        calibrated: 0,
        fragile: 0,
        confidentWrong: 0,
        uncertain: 0,
      },
    });
  });
});

describe('poll scoring integrity', () => {
  for (const itemType of ['likert', 'opinion-mcq']) {
    it(`keeps ${itemType} distribution-only even when every live policy is enabled`, () => {
      const question = {
        type: 'mcq',
        itemType,
        options: ['One', 'Two', 'Three'],
        correctAnswer: 'Two',
      };
      const responses = {
        a: { answer: { optionIdx: 0, status: 'correct' }, confidence: 'knew' },
        b: { answer: { optionIdx: 1, status: 'correct' }, confidence: 'guessed' },
      };
      const enabled = policy({
        accuracy: true,
        confidence: true,
        partialCredit: true,
      });
      const summary = aggregators.aggregatePresentationResponses(question, responses, enabled);

      expect(summary).toMatchObject({
        unscored: true,
        evaluative: false,
        gameScorable: false,
        correctCount: 0,
        correctRate: null,
        confidenceReportedCount: 0,
      });
      expect(aggregators.presentationAccuracyWeight(responses.a, question, enabled)).toBeNull();
    });
  }

  it('routes poll-mode analytics to a distribution-capable aggregate, never the gradebook', () => {
    const generatedContent = {
      data: {
        mode: 'poll',
        questions: [{
          type: 'mcq',
          itemType: 'opinion-mcq',
          question: 'Which framing fits best?',
          options: ['One', 'Two'],
          correctAnswer: 'One',
        }],
      },
    };
    const quizState = {
      allResponses: {
        a: { 0: { itemType: 'opinion-mcq', answer: { optionIdx: 0 } } },
        b: { 0: { itemType: 'opinion-mcq', answer: { optionIdx: 1 } } },
      },
    };
    const result = aggregators.aggregateForMode(
      'poll',
      quizState,
      generatedContent,
      { a: {}, b: {} },
    );

    expect(result.variant).not.toBe('gradebook');
    expect(result.variant).toBe('liveHeatmap');
    expect(result.data.bars[0]).toMatchObject({
      unscored: true,
      correct: 0,
      incorrect: 0,
      submitted: 2,
      percentCorrect: null,
    });
  });
});
