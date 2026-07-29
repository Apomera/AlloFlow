import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const root = process.cwd();
let aggregators;

beforeAll(() => {
  loadAlloModule('quiz_live_aggregators.js');
  aggregators = window.AlloModules.QuizLiveAggregators;
});

describe('generalized live presentation response aggregation', () => {
  it('keeps numeric MCQ responses compatible and resolves the answer key safely', () => {
    const question = { type: 'mcq', options: ['Mercury', 'Venus', 'Earth'], correctAnswer: 'Earth' };
    const summary = aggregators.aggregatePresentationResponses(question, {
      a: 2,
      b: 1,
      c: { itemType: 'mcq', answer: { optionIdx: 2 } },
    });
    expect(summary).toMatchObject({
      itemType: 'mcq',
      kind: 'options',
      respondentCount: 3,
      evaluableResponseCount: 3,
      correctCount: 2,
      gameScorable: true,
      unscored: false,
    });
    expect(summary.rows.map(row => row.value)).toEqual([0, 1, 2]);
    expect(summary.rows.map(row => row.isCorrect)).toEqual([false, false, true]);
  });

  it('summarizes multi-select envelopes without counting a student more than once per choice', () => {
    const question = {
      type: 'multi-select',
      options: ['A', 'B', 'C', 'D'],
      correctAnswers: ['A', 'C'],
    };
    const summary = aggregators.aggregatePresentationResponses(question, {
      a: { questionIdx: 0, itemType: 'multi-select', answer: { selectedIndices: [0, 2], status: 'correct' } },
      b: { answer: { selectedTexts: ['A', 'B', 'B'], status: 'partially-correct' } },
    });
    expect(summary.kind).toBe('multi-select');
    expect(summary.rows.map(row => row.value)).toEqual([2, 1, 1, 0]);
    expect(summary).toMatchObject({ evaluableResponseCount: 2, correctCount: 1, partialCount: 0, incorrectCount: 1 });
  });

  it('clusters bounded text responses and grades fill blanks against accepted alternatives', () => {
    const question = {
      type: 'fill-blank',
      expectedFill: 'photosynthesis',
      acceptableAlternatives: ['photo synthesis'],
    };
    const summary = aggregators.aggregatePresentationResponses(question, {
      a: { answer: { text: 'Photosynthesis' } },
      b: { text: 'photo synthesis' },
      c: 'respiration',
    });
    expect(summary.kind).toBe('text');
    expect(summary).toMatchObject({ respondentCount: 3, evaluableResponseCount: 3, correctCount: 2 });
    expect(summary.rows.some(row => row.text === 'Photosynthesis' && row.isCorrect)).toBe(true);
    expect(summary.rows.every(row => row.text.length <= 160)).toBe(true);
  });

  it('applies numeric tolerance and accepts both envelopes and bare answer objects', () => {
    const question = { type: 'numeric-response', correctValue: 12.5, tolerance: 0.1, unit: 'cm' };
    const summary = aggregators.aggregatePresentationResponses(question, {
      a: { questionIdx: 0, itemType: 'numeric-response', answer: { numericValue: 12.55, unit: 'cm' } },
      b: { answer: { numericValue: 12.61, unit: 'cm' } },
      c: { answer: { numericValue: 12.4, unit: 'cm' } },
    });
    expect(summary.kind).toBe('numeric');
    expect(summary).toMatchObject({ respondentCount: 3, evaluableResponseCount: 3, correctCount: 2 });
    expect(aggregators.gradePresentationResponse({ numericValue: 12.61, unit: 'cm' }, question).isCorrect).toBe(false);
    expect(aggregators.gradePresentationResponse({
      answer: { numericValue: 12.5, unit: 'm', status: 'correct', score: 100 },
    }, question)).toMatchObject({ status: 'partially-correct', score: 50, valueCorrect: true, unitCorrect: false });

    const unitSummary = aggregators.aggregatePresentationResponses(question, {
      correctUnit: { answer: { numericValue: 12.5, unit: 'cm' } },
      wrongUnit: { answer: { numericValue: 12.5, unit: 'mm', status: 'correct' } },
    });
    expect(unitSummary.rows).toHaveLength(2);
    expect(unitSummary.rows.find(row => row.text === '12.5 cm')).toMatchObject({ value: 1, isCorrect: true });
    expect(unitSummary.rows.find(row => row.text === '12.5 mm')).toMatchObject({ value: 1, isCorrect: false });
  });

  it('never trusts client-reported correctness for canonical structured formats', () => {
    const cases = [
      {
        question: { type: 'mcq', options: ['A', 'B'], correctAnswer: 'A' },
        response: { answer: { optionIdx: 1, status: 'correct' } },
        correctResponse: { answer: { optionIdx: 0, status: 'incorrect' } },
        status: 'incorrect',
      },
      {
        question: { type: 'multi-select', options: ['A', 'B'], correctAnswers: ['A'] },
        response: { answer: { selectedIndices: [1], status: 'correct', score: 100 } },
        correctResponse: { answer: { selectedIndices: [0], status: 'incorrect', score: 0 } },
        status: 'incorrect',
      },
      {
        question: { type: 'fill-blank', expectedFill: 'gravity' },
        response: { answer: { text: 'magnetism', status: 'correct' } },
        correctResponse: { answer: { text: 'gravity', status: 'incorrect' } },
        status: 'incorrect',
      },
      {
        question: { type: 'order', items: ['first', 'second'] },
        response: { answer: { order: [1, 0], status: 'correct' } },
        correctResponse: { answer: { order: [0, 1], status: 'incorrect' } },
        status: 'incorrect',
      },
      {
        question: {
          type: 'relation-mismatch',
          pairs: [{ left: 'Bee', right: 'Hive' }, { left: 'Bird', right: 'Ocean' }],
          wrongPairIndex: 1,
          correctPartnerForWrong: 'Nest',
        },
        response: { answer: { clickedPairIdx: 0, partnerAnswer: 'Hive', status: 'correct', score: 2 } },
        correctResponse: { answer: { clickedPairIdx: 1, partnerAnswer: 'Nest', status: 'incorrect', score: 0 } },
        status: 'incorrect',
      },
      {
        question: {
          type: 'answer-evidence',
          answerOptions: ['Right', 'Wrong'],
          correctAnswer: 'Right',
          evidenceOptions: ['Strong', 'Weak'],
          correctEvidence: 'Strong',
        },
        response: { answer: { answerIdx: 1, evidenceIdx: 1, status: 'correct', score: 2 } },
        correctResponse: { answer: { answerIdx: 0, evidenceIdx: 0, status: 'incorrect', score: 0 } },
        status: 'incorrect',
      },
    ];
    cases.forEach(({ question, response, correctResponse, status }) => {
      expect(aggregators.gradePresentationResponse(response, question).status).toBe(status);
      expect(aggregators.gradeResponseForItem(response, question).status).toBe(status);
      expect(aggregators.gradePresentationResponse(correctResponse, question).status).toBe('correct');
      expect(aggregators.gradeResponseForItem(correctResponse, question).status).toBe('correct');
    });
  });

  it('handles order, sequence diagnostics, and matching outcomes without option arrays', () => {
    const orderQuestion = { type: 'order', items: ['first', 'second', 'third'] };
    expect(aggregators.gradePresentationResponse({ order: [0, 1, 2] }, orderQuestion).isCorrect).toBe(true);
    expect(aggregators.gradePresentationResponse({ answer: { orderedIndices: [1, 0, 2] } }, orderQuestion).isCorrect).toBe(false);

    const sequenceQuestion = {
      type: 'sequence-sense',
      items: ['Plan', 'Build', 'Review'],
      intentionallyWrongIndex: 1,
      orderingPrinciple: 'process',
    };
    const sequence = aggregators.aggregatePresentationResponses(sequenceQuestion, {
      a: { itemType: 'sequence-sense', answer: { verifyAnswer: 'no', clickedIdx: 1, principleAnswer: 'process', status: 'incorrect' } },
      b: { answer: { verifyAnswer: 'yes', clickedIdx: 1, principleAnswer: 'size', status: 'correct' } },
    });
    expect(sequence.kind).toBe('outcomes');
    expect(sequence.rows.map(row => row.text)).toEqual(['Correct', 'Needs review']);
    expect(sequence.gameScorable).toBe(true);
    const correctSequenceResponse = { answer: { verifyAnswer: 'no', clickedIdx: 1, principleAnswer: 'process', status: 'incorrect' } };
    const wrongSequenceResponse = { answer: { verifyAnswer: 'yes', clickedIdx: 1, principleAnswer: 'size', status: 'correct' } };
    for (const grader of [aggregators.gradePresentationResponse, aggregators.gradeResponseForItem]) {
      expect(grader(correctSequenceResponse, sequenceQuestion).status).toBe('correct');
      expect(grader(wrongSequenceResponse, sequenceQuestion).status).toBe('incorrect');
    }

    const matching = aggregators.aggregatePresentationResponses({ type: 'matching', pairs: [] }, {
      a: { matches: [], status: 'correct' },
    });
    expect(matching.rows[0]).toMatchObject({ text: 'Submitted \u2014 teacher review', value: 1 });
    expect(matching.gameScorable).toBe(false);
  });

  it('keeps malformed keys and forged statuses out of games and gradebook totals', () => {
    const malformedQuestion = { type: 'multi-select', options: ['A', 'B'], correctAnswers: ['Missing'] };
    const forged = { itemType: 'multi-select', answer: { selectedIndices: [0], status: 'correct', score: 100 } };
    const presentationGrade = aggregators.gradePresentationResponse(forged, malformedQuestion);
    expect(presentationGrade).toMatchObject({ status: 'submitted', evaluable: false, isCorrect: null });
    expect(aggregators.aggregatePresentationResponses(malformedQuestion, { malicious: forged }))
      .toMatchObject({ gameScorable: false, evaluableResponseCount: 0, correctCount: 0 });

    const keyedQuestion = { type: 'multi-select', options: ['A', 'B'], correctAnswers: ['A'] };
    const wrongButForged = { itemType: 'multi-select', answer: { selectedIndices: [1], status: 'correct', score: 100 } };
    const gradebook = aggregators.aggregateGradebook(
      { allResponses: { malicious: { 0: wrongButForged } } },
      { data: { questions: [keyedQuestion] } },
      { malicious: { name: 'Pseudonymous learner' } },
    );
    expect(gradebook.studentRows[0]).toMatchObject({
      totalAnswered: 1,
      totalEvaluated: 1,
      totalCorrect: 0,
    });

    const mcq = { type: 'mcq', options: ['A', 'B'], correctAnswer: 'A' };
    expect(aggregators.gradePresentationResponse({ answer: { optionIdx: 1, status: 'idk' } }, mcq).status)
      .toBe('incorrect');
    expect(aggregators.gradePresentationResponse({ answer: { idk: true } }, mcq).status).toBe('idk');
  });
});

describe('unscored live poll semantics', () => {
  for (const itemType of ['likert', 'opinion-mcq']) {
    it(`keeps ${itemType} distribution-only across presentation and assessment analytics`, () => {
      const question = {
        type: 'mcq',
        itemType,
        options: ['One', 'Two', 'Three'],
        // A stale key must not make an opinion poll evaluative.
        correctAnswer: 'Two',
      };
      const responses = {
        a: 0,
        b: 1,
        c: { answer: { optionIdx: 1, status: 'correct' }, itemType },
      };
      const presentation = aggregators.aggregatePresentationResponses(question, responses);
      expect(presentation).toMatchObject({
        unscored: true,
        evaluative: false,
        gameScorable: false,
        evaluableResponseCount: 0,
        correctCount: 0,
        correctRate: null,
      });
      expect(presentation.rows.map(row => row.value)).toEqual([1, 2, 0]);
      expect(presentation.rows.every(row => row.isCorrect === false)).toBe(true);
      expect(aggregators.gradePresentationResponse({ answer: { status: 'correct' } }, question))
        .toMatchObject({ status: 'submitted', evaluable: false, unscored: true });

      const allResponses = Object.fromEntries(Object.entries(responses).map(([uid, value]) => [
        uid,
        { 0: { itemType, answer: typeof value === 'number' ? value : value.answer } },
      ]));
      const content = { data: { questions: [question] } };
      const quizState = { allResponses };
      const roster = { a: {}, b: {}, c: {} };
      const heatmap = aggregators.aggregateLiveHeatmap(quizState, content, roster).bars[0];
      expect(heatmap).toMatchObject({ unscored: true, correct: 0, incorrect: 0, submitted: 3, percentCorrect: null });
      const analysis = aggregators.aggregateItemAnalysis(quizState, content, roster).items[0];
      expect(analysis).toMatchObject({ unscored: true, correctRate: null, signalLabel: 'Unscored distribution' });
      expect(analysis.options.map(option => option.count)).toEqual([1, 2, 0]);
      expect(analysis.flags).toEqual([]);
      const row = aggregators.aggregateGradebook(quizState, content, roster).studentRows[0];
      expect(row).toMatchObject({ totalAnswered: 1, totalEvaluated: 0, totalUnscored: 1, totalCorrect: 0 });
    });
  }
});

describe('teacher and dashboard integration guards', () => {
  it('removes the unsafe option-map assumption and gates game scoring with shared metadata', () => {
    const teacher = readFileSync(resolve(root, 'teacher_source.jsx'), 'utf8');
    expect(teacher).not.toContain('const detailedStats = question.options.map');
    expect(teacher).toContain('aggregatePresentationResponses(question || {}, responses || {}, liveScoringPolicy)');
    expect(teacher).toContain("mode === 'boss-battle' && liveQuestionSummary.gameScorable");
    expect(teacher).toContain("mode === 'team-showdown' && liveQuestionSummary.gameScorable");
    expect(teacher).toContain('filter(grade => grade.evaluable)');
    expect(teacher).toContain('Unscored poll — Boss Battle and Team Showdown scoring pause for this round.');
  });

  it('renders unscored poll metadata without a false 0%-correct signal', () => {
    const view = readFileSync(resolve(root, 'view_quiz_source.jsx'), 'utf8');
    expect(view).toContain("bar.unscored ? 'Unscored' : bar.percentCorrect + '%'");
    expect(view).toContain("card.unscored ? 'Unscored poll'");
    expect(view).toContain("item.unscored ? 'Unscored'");
    expect(view).toContain('!cell.unscored && p.activeSessionCode');
    expect(view).toContain('b.total > 0 && !b.unscored');
  });

  it('keeps generated and deployed copies synchronized', () => {
    for (const name of ['teacher_module.js', 'view_quiz_module.js', 'quiz_live_aggregators.js']) {
      expect(readFileSync(resolve(root, 'desktop/web-app/public', name), 'utf8'))
        .toBe(readFileSync(resolve(root, name), 'utf8'));
    }
  });
});
