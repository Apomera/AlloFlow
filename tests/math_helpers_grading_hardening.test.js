import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let MathHelpers;

beforeAll(() => {
  loadAlloModule('math_helpers_module.js');
  MathHelpers = window.AlloModules.MathHelpers;
});

const createCheckHarness = ({ resourceId, hints = 0, callGemini, handleScoreUpdate = vi.fn() }) => {
  let results = {};
  const deps = {
    mathCheckResults: results,
    mathHintData: { [resourceId + '_0']: { count: hints, hints: [] } },
    setMathCheckResults: (update) => {
      results = typeof update === 'function' ? update(results) : update;
      deps.mathCheckResults = results;
    },
    addToast: vi.fn(),
    t: vi.fn(() => ''),
    callGemini,
    warnLog: vi.fn(),
    handleScoreUpdate
  };
  return { deps, handleScoreUpdate, getResults: () => results };
};

describe('conservative math-answer equivalence', () => {
  it('accepts exact decimal, grouped-integer, fraction, and Unicode-minus equivalents', () => {
    expect(MathHelpers.areMathAnswersEquivalent('42.000', 42)).toBe(true);
    expect(MathHelpers.areMathAnswersEquivalent('1,000.50', '1000.5')).toBe(true);
    expect(MathHelpers.areMathAnswersEquivalent('1/2', '.5')).toBe(true);
    expect(MathHelpers.areMathAnswersEquivalent('\\(\\frac{1}{2}\\)', '.5')).toBe(true);
    expect(MathHelpers.areMathAnswersEquivalent('−3.50', '-3.5')).toBe(true);
    expect(MathHelpers.areMathAnswersEquivalent('9007199254740993.0', '9007199254740993')).toBe(true);
    expect(MathHelpers.areMathAnswersEquivalent('x = 3.0', 'x = 3')).toBe(true);
    expect(MathHelpers.areMathAnswersEquivalent('x = 1/2', 'x = 0.5')).toBe(true);
  });

  it('rejects prose, expressions, malformed grouping, units, blanks, and near misses', () => {
    expect(MathHelpers.areMathAnswersEquivalent('I tried 4 + 2', '42')).toBe(false);
    expect(MathHelpers.areMathAnswersEquivalent('4 + 2', '42')).toBe(false);
    expect(MathHelpers.areMathAnswersEquivalent('1,00', '100')).toBe(false);
    expect(MathHelpers.areMathAnswersEquivalent('$42', '42')).toBe(false);
    expect(MathHelpers.areMathAnswersEquivalent('', '0')).toBe(false);
    expect(MathHelpers.areMathAnswersEquivalent('1.999', '2')).toBe(false);
    expect(MathHelpers.areMathAnswersEquivalent('9007199254740993', '9007199254740992')).toBe(false);
    expect(MathHelpers.areMathAnswersEquivalent('x = 3.0', 'y = 3')).toBe(false);
  });

  it('fails closed instead of invoking hostile answer coercion', () => {
    const hostile = { toString() { throw new Error('hostile toString'); } };
    expect(() => MathHelpers.areMathAnswersEquivalent(hostile, '1')).not.toThrow();
    expect(MathHelpers.areMathAnswersEquivalent(hostile, '1')).toBe(false);
  });
});

describe('math grading XP and AI response hardening', () => {
  it.each([
    ['4', '4'],
    ['1/2', '0.5'],
    ['-3', '-3'],
    ['50%', '0.5']
  ])('accepts the short exact answer %s before applying the prose-length gate', async (studentWork, expected) => {
    const resourceId = 'grading-short-exact-' + studentWork.replace(/\W/g, '');
    const scoreUpdate = vi.fn();
    const callGemini = vi.fn();
    const harness = createCheckHarness({
      resourceId,
      callGemini,
      handleScoreUpdate: scoreUpdate
    });

    await MathHelpers.handleCheckMathWork(
      resourceId,
      0,
      'Compute the value.',
      expected,
      [],
      studentWork,
      harness.deps
    );

    expect(callGemini).not.toHaveBeenCalled();
    expect(scoreUpdate).toHaveBeenCalledOnce();
    expect(harness.getResults()[resourceId][0]).toMatchObject({
      verdict: 'correct',
      score: 100,
      checked: true,
      fastPath: true
    });
  });

  it('still rejects an empty or whitespace-only response before grading', async () => {
    const resourceId = 'grading-empty-response';
    const callGemini = vi.fn();
    const harness = createCheckHarness({ resourceId, callGemini });

    await MathHelpers.handleCheckMathWork(resourceId, 0, 'Compute.', '4', [], '   ', harness.deps);

    expect(callGemini).not.toHaveBeenCalled();
    expect(harness.handleScoreUpdate).not.toHaveBeenCalled();
    expect(harness.getResults()).toEqual({});
    expect(harness.deps.addToast).toHaveBeenCalledWith(
      'Please enter an answer before checking!',
      'info'
    );
  });

  it('grades a short non-matching math answer instead of trapping it behind a prose limit', async () => {
    const resourceId = 'grading-short-mismatch';
    const callGemini = vi.fn(async () => JSON.stringify({
      verdict: 'incorrect',
      score: 0,
      feedback: 'Check the addition and try again.'
    }));
    const harness = createCheckHarness({ resourceId, callGemini });

    await MathHelpers.handleCheckMathWork(resourceId, 0, 'What is 2 + 2?', '4', [], '3', harness.deps);

    expect(callGemini).toHaveBeenCalledOnce();
    expect(harness.handleScoreUpdate).not.toHaveBeenCalled();
    expect(harness.getResults()[resourceId][0]).toMatchObject({
      verdict: 'incorrect',
      score: 0,
      checked: true,
      fastPath: false
    });
  });

  it('awards fast-path XP through the score callback with the hint multiplier only once', async () => {
    const resourceId = 'grading-fast-xp-once';
    const scoreUpdate = vi.fn();
    const harness = createCheckHarness({
      resourceId,
      hints: 2,
      callGemini: vi.fn(),
      handleScoreUpdate: scoreUpdate
    });

    await MathHelpers.handleCheckMathWork(resourceId, 0, 'What is six times seven?', '42', [], '42.000', harness.deps);
    await MathHelpers.handleCheckMathWork(resourceId, 0, 'What is six times seven?', '42', [], '42.000', harness.deps);

    expect(scoreUpdate).toHaveBeenCalledTimes(1);
    expect(scoreUpdate).toHaveBeenCalledWith(5, 'Math Problem', resourceId);
    expect(harness.getResults()[resourceId][0]).toMatchObject({
      verdict: 'correct',
      score: 100,
      hintsUsed: 2,
      xpAwarded: true,
      fastPath: true
    });
  });

  it('does not concatenate digits from prose into a false fast-path match', async () => {
    const resourceId = 'grading-no-digit-concatenation';
    const callGemini = vi.fn(async () => JSON.stringify({
      verdict: 'incorrect',
      score: 0,
      feedback: 'Keep the operations separate and recompute the result.'
    }));
    const harness = createCheckHarness({ resourceId, callGemini });

    await MathHelpers.handleCheckMathWork(resourceId, 0, 'Find the answer.', '42', [], 'I tried 4 + 2', harness.deps);

    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(harness.handleScoreUpdate).not.toHaveBeenCalled();
    expect(harness.getResults()[resourceId][0]).toMatchObject({
      verdict: 'incorrect',
      score: 0,
      xpAwarded: false,
      fastPath: false
    });
  });

  it('awards validated AI-path XP with the hint multiplier only once across retries', async () => {
    const resourceId = 'grading-ai-xp-once';
    const scoreUpdate = vi.fn();
    const callGemini = vi.fn(async () => JSON.stringify({
      verdict: 'partial',
      score: 80,
      feedback: 'Your setup is sound; recheck the final arithmetic.'
    }));
    const harness = createCheckHarness({
      resourceId,
      hints: 1,
      callGemini,
      handleScoreUpdate: scoreUpdate
    });

    await MathHelpers.handleCheckMathWork(resourceId, 0, 'Explain the calculation.', '42', [], 'My final result was 41.', harness.deps);
    await MathHelpers.handleCheckMathWork(resourceId, 0, 'Explain the calculation.', '42', [], 'I revised it but still got 41.', harness.deps);

    expect(callGemini).toHaveBeenCalledTimes(2);
    expect(scoreUpdate).toHaveBeenCalledTimes(1);
    expect(scoreUpdate).toHaveBeenCalledWith(6, 'Math Problem', resourceId);
    expect(harness.getResults()[resourceId][0]).toMatchObject({
      verdict: 'partial',
      score: 80,
      hintsUsed: 1,
      xpAwarded: true
    });
  });

  it.each([
    [{ verdict: 'amazing', score: 100, feedback: 'Great!' }],
    [{ verdict: 'correct', score: '100', feedback: 'Great!' }],
    [{ verdict: 'correct', score: 101, feedback: 'Great!' }],
    [{ verdict: 'correct', score: 100, feedback: [] }]
  ])('fails closed for malformed AI evaluation payloads', async (payload) => {
    const resourceId = 'grading-invalid-shape-' + JSON.stringify(payload);
    const harness = createCheckHarness({
      resourceId,
      callGemini: vi.fn(async () => JSON.stringify(payload))
    });

    await MathHelpers.handleCheckMathWork(resourceId, 0, 'Explain your work.', '42', [], 'My final result was 41.', harness.deps);

    expect(harness.handleScoreUpdate).not.toHaveBeenCalled();
    expect(harness.getResults()[resourceId][0]).toMatchObject({
      verdict: 'error',
      score: 0,
      checked: false,
      xpAwarded: false
    });
  });

  it.each([
    [{ verdict: 'incorrect', score: 100, feedback: 'Incorrect despite full credit.' }],
    [{ verdict: 'correct', score: 0, feedback: 'Correct despite no credit.' }],
    [{ verdict: 'partial', score: 100, feedback: 'Partial despite full credit.' }]
  ])('fails closed for contradictory AI verdict and score pairs', async (payload) => {
    const resourceId = 'grading-inconsistent-' + payload.verdict;
    const harness = createCheckHarness({
      resourceId,
      callGemini: vi.fn(async () => JSON.stringify(payload))
    });

    await MathHelpers.handleCheckMathWork(
      resourceId,
      0,
      'Explain your work.',
      '42',
      [],
      'My final result was 41.',
      harness.deps
    );

    expect(harness.handleScoreUpdate).not.toHaveBeenCalled();
    expect(harness.getResults()[resourceId][0]).toMatchObject({
      verdict: 'error',
      score: 0,
      checked: false,
      xpAwarded: false,
      xpEarned: 0
    });
  });
});

describe('self-assessment hostile-value containment', () => {
  it('treats throwing problem getters and response proxies as missing data', () => {
    const problem = { id: 'hostile', question: 'What is one?' };
    Object.defineProperty(problem, 'answer', {
      get() { throw new Error('hostile answer getter'); }
    });
    const answers = new Proxy({}, {
      getOwnPropertyDescriptor() { throw new Error('hostile answer map'); }
    });

    expect(() => MathHelpers.gradeMathSelfAssessment([problem], answers)).not.toThrow();
    expect(MathHelpers.gradeMathSelfAssessment([problem], answers)).toMatchObject({
      score: 0,
      total: 1,
      answers: { hostile: '' },
      results: [{ problemId: 'hostile', response: '', correct: false }]
    });
  });
});

describe('math request de-duplication', () => {
  it('coalesces rapid grading checks for the same problem', async () => {
    const resourceId = 'grading-concurrent-request';
    let resolveEvaluation;
    const callGemini = vi.fn(() => new Promise(resolve => {
      resolveEvaluation = resolve;
    }));
    const harness = createCheckHarness({ resourceId, callGemini });

    const first = MathHelpers.handleCheckMathWork(resourceId, 0, 'Explain the calculation.', '42', [], 'My result was forty-one.', harness.deps);
    const second = MathHelpers.handleCheckMathWork(resourceId, 0, 'Explain the calculation.', '42', [], 'My result was forty-one.', harness.deps);

    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(MathHelpers.isMathCheckRequestActive(resourceId, 0)).toBe(true);
    expect(MathHelpers.isMathCheckRequestActive(resourceId, 'other')).toBe(false);
    resolveEvaluation(JSON.stringify({
      verdict: 'incorrect',
      score: 0,
      feedback: 'Recheck the multiplication in your final step.'
    }));
    await Promise.all([first, second]);
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(MathHelpers.isMathCheckRequestActive(resourceId, 0)).toBe(false);
  });

  it('coalesces rapid hint requests and validates the returned text', async () => {
    const resourceId = 'hint-concurrent-request';
    let hintState = {};
    let resolveHint;
    const callGemini = vi.fn(() => new Promise(resolve => {
      resolveHint = resolve;
    }));
    const deps = {
      mathHintData: hintState,
      studentResponses: { [resourceId]: { 0: 'I started by factoring.' } },
      setMathHintData: (update) => {
        hintState = typeof update === 'function' ? update(hintState) : update;
        deps.mathHintData = hintState;
      },
      addToast: vi.fn(),
      callGemini,
      warnLog: vi.fn()
    };

    const first = MathHelpers.handleGetMathHint(resourceId, 0, 'Factor the expression.', 'result', [], deps);
    const second = MathHelpers.handleGetMathHint(resourceId, 0, 'Factor the expression.', 'result', [], deps);

    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(MathHelpers.isMathHintRequestActive(resourceId, 0)).toBe(true);
    expect(MathHelpers.isMathHintRequestActive(resourceId, 'other')).toBe(false);
    resolveHint('Look for the greatest common factor first.');
    await Promise.all([first, second]);
    expect(MathHelpers.isMathHintRequestActive(resourceId, 0)).toBe(false);
    expect(hintState[resourceId][0]).toMatchObject({
      hints: ['Look for the greatest common factor first.'],
      count: 1,
      loading: false
    });
  });
});

const runMathEdit = async ({ failSet = false } = {}) => {
  const generatedContent = {
    id: 'editable-resource',
    type: 'math',
    data: {
      title: 'Original set',
      graphData: { points: [[0, 1]] },
      graphAlt: 'Original accessible graph description.',
      curriculumTag: 'existing-metadata',
      problems: [
        { id: 'existing-problem-id', question: 'Old question', answer: '1', taskType: 'solve', steps: [] }
      ]
    }
  };
  const modelResult = JSON.stringify({
    title: 'Edited set',
    problems: [
      { question: 'Updated question', answer: '2', steps: ['First step'] },
      { question: 'Added question', answer: '3', taskType: 'evaluate', steps: [] }
    ],
    graphData: null,
    graphAlt: 'Updated accessible graph description.',
    teacherNote: 'New safe metadata',
    constructor: 'blocked-shape-key'
  });
  let updatedContent;
  const events = [];
  const onMathProblemsChanged = vi.fn(() => events.push('invalidate'));
  const deps = {
    generatedContent,
    leveledTextLanguage: 'English',
    translationMode: 'off',
    currentUiLanguage: 'English',
    gradeLevel: '6',
    mathSubject: 'Pre-algebra',
    setIsMathEditingChat: vi.fn(),
    setGeneratedContent: (update) => {
      events.push('set');
      if (failSet) throw new Error('setter failed');
      updatedContent = typeof update === 'function' ? update(generatedContent) : update;
    },
    setMathEditInput: vi.fn(),
    callGemini: vi.fn(async () => modelResult),
    cleanJson: value => value,
    safeJsonParse: value => JSON.parse(value),
    addToast: vi.fn(),
    warnLog: vi.fn(),
    onMathProblemsChanged
  };

  await MathHelpers.handleMathEdit('Add one problem and update the first.', deps);
  return { deps, events, generatedContent, onMathProblemsChanged, updatedContent };
};

describe('math edit problem identity', () => {
  it('preserves existing IDs, creates deterministic IDs for additions, and invalidates after the set', async () => {
    const first = await runMathEdit();
    const second = await runMathEdit();
    const firstProblems = first.updatedContent.data.problems;
    const secondProblems = second.updatedContent.data.problems;

    expect(firstProblems[0].id).toBe('existing-problem-id');
    expect(firstProblems[0].taskType).toBe('solve');
    expect(firstProblems[1].id).toMatch(/^math-problem-/);
    expect(firstProblems[1].id).toBe(secondProblems[1].id);
    expect(new Set(firstProblems.map(problem => problem.id)).size).toBe(firstProblems.length);
    expect(first.updatedContent.data).toMatchObject({
      graphData: { points: [[0, 1]] },
      graphAlt: 'Updated accessible graph description.',
      curriculumTag: 'existing-metadata',
      teacherNote: 'New safe metadata'
    });
    expect(Object.prototype.hasOwnProperty.call(first.updatedContent.data, 'constructor')).toBe(false);
    expect(first.events.slice(0, 2)).toEqual(['set', 'invalidate']);
    expect(first.onMathProblemsChanged).toHaveBeenCalledWith('editable-resource');
  });

  it('does not notify the host when setting the edited content fails', async () => {
    const result = await runMathEdit({ failSet: true });
    expect(result.onMathProblemsChanged).not.toHaveBeenCalled();
    expect(result.deps.warnLog).toHaveBeenCalled();
    expect(result.deps.addToast).toHaveBeenCalledWith(
      'Failed to modify problems — try rephrasing your request',
      'error'
    );
  });
});
