import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let aggregators;

beforeAll(() => {
  loadAlloModule('quiz_live_aggregators.js');
  aggregators = window.AlloModules.QuizLiveAggregators;
});

describe('type-aware live answer guide', () => {
  it('describes canonical keys for option, structured, and numeric items', () => {
    expect(aggregators.describePresentationCorrectAnswer({
      type: 'mcq',
      options: ['Mercury', 'Venus', 'Earth'],
      correctAnswer: 'Earth',
    })).toBe('C. Earth');

    expect(aggregators.describePresentationCorrectAnswer({
      type: 'multi-select',
      options: ['A', 'B', 'C'],
      correctAnswers: ['A', 'C'],
    })).toBe('A. A · C. C');

    expect(aggregators.describePresentationCorrectAnswer({
      type: 'numeric-response',
      correctValue: 12.5,
      unit: 'cm',
      tolerance: 0.1,
    })).toBe('12.5 cm (±0.1)');

    expect(aggregators.describePresentationCorrectAnswer({
      type: 'answer-evidence',
      answerOptions: ['Right', 'Wrong'],
      correctAnswer: 'Right',
      evidenceOptions: ['Strong', 'Weak'],
      correctEvidence: 'Strong',
    })).toBe('Answer: Right · Evidence: Strong');
  });

  it('never invents a correct answer for an opinion poll or review-only prompt', () => {
    expect(aggregators.describePresentationCorrectAnswer({
      type: 'mcq',
      itemType: 'opinion-mcq',
      options: ['One', 'Two'],
      correctAnswer: 'One',
    })).toBe('');

    expect(aggregators.describePresentationCorrectAnswer({
      type: 'short-answer',
      question: 'Explain your reasoning.',
    })).toBe('');
  });
});
