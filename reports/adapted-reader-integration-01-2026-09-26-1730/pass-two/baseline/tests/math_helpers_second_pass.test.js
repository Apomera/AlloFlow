import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let MathHelpers;

beforeAll(() => {
  loadAlloModule('math_helpers_module.js');
  MathHelpers = window.AlloModules.MathHelpers;
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const checkHarness = ({
  resourceId,
  results = {},
  hints = {},
  callGemini = vi.fn(),
  handleScoreUpdate = vi.fn(),
  timeout
}) => {
  let currentResults = results;
  const deps = {
    mathCheckResults: currentResults,
    mathHintData: hints,
    setMathCheckResults: update => {
      currentResults = typeof update === 'function' ? update(currentResults) : update;
      deps.mathCheckResults = currentResults;
    },
    addToast: vi.fn(),
    t: vi.fn(() => ''),
    callGemini,
    warnLog: vi.fn(),
    handleScoreUpdate,
    ...(timeout ? { mathRequestTimeoutMs: timeout } : {})
  };
  return {
    deps,
    getResults: () => currentResults,
    replaceResults: value => {
      currentResults = value;
      deps.mathCheckResults = value;
    }
  };
};

const mathEditResult = question => JSON.stringify({
  title: 'Edited set',
  problems: [{ question, answer: '2', taskType: 'solve', steps: [] }]
});

const mathEditHarness = ({ resourceId, callGemini }) => {
  const captured = {
    id: resourceId,
    type: 'math',
    activeMarker: 'active metadata',
    data: {
      title: 'Original set',
      problems: [{ id: 'problem-1', question: 'Original question', answer: '1', taskType: 'solve', steps: [] }]
    }
  };
  const historyTarget = {
    ...captured,
    historyMarker: 'history metadata',
    data: { ...captured.data, problems: captured.data.problems.map(problem => ({ ...problem })) }
  };
  const other = {
    id: resourceId + '-other',
    type: 'math',
    data: { title: 'Other set', problems: [{ id: 'other-1', question: 'Other question', answer: '9' }] }
  };
  let active = captured;
  let history = [historyTarget, other];
  const deps = {
    generatedContent: captured,
    leveledTextLanguage: 'English',
    translationMode: 'off',
    currentUiLanguage: 'English',
    gradeLevel: '6',
    mathSubject: 'Pre-algebra',
    setIsMathEditingChat: vi.fn(),
    setGeneratedContent: vi.fn(update => {
      active = typeof update === 'function' ? update(active) : update;
    }),
    setHistory: vi.fn(update => {
      history = typeof update === 'function' ? update(history) : update;
    }),
    setMathEditInput: vi.fn(),
    callGemini,
    cleanJson: value => value,
    safeJsonParse: value => JSON.parse(value),
    addToast: vi.fn(),
    warnLog: vi.fn(),
    onMathProblemsChanged: vi.fn()
  };
  return {
    captured,
    deps,
    historyTarget,
    other,
    getActive: () => active,
    getHistory: () => history,
    navigateTo: resource => { active = resource; }
  };
};

describe('canonical math state keys', () => {
  it('normalizes missing and prototype-reserved resource IDs', () => {
    expect(MathHelpers.canonicalMathStateKey(null)).toBe('math');
    expect(MathHelpers.canonicalMathStateKey('', 'resource-fallback')).toBe('resource-fallback');
    expect(MathHelpers.canonicalMathStateKey('__proto__')).toBe('math-state-__proto__');
    expect(MathHelpers.canonicalMathStateKey(' constructor ')).toBe('math-state-constructor');
  });

  it('derives the exact MathView resource ID for ordinary, reserved, and missing artifact IDs', () => {
    expect(MathHelpers.getMathResourceId({ id: ' ordinary-id ', data: { title: 'Algebra' } })).toBe('ordinary-id');
    expect(MathHelpers.getMathResourceId({ id: '__proto__', data: { title: 'Algebra' } })).toBe('math-resource-1l7yhjt');
    expect(MathHelpers.getMathResourceId({ data: { title: 'Legacy Set' }, timestamp: '1700000000000' })).toBe('legacy-math-1dbksu2');
  });

  it('disambiguates duplicate imported artifacts while preserving restored-clone identity', () => {
    const first = { id: 'duplicate-id', type: 'math', data: { title: 'Same title', problems: [] } };
    const second = { id: 'duplicate-id', type: 'math', data: { title: 'Same title', problems: [] } };
    const history = [first, second];
    const restoredFirst = { ...first, data: first.data };
    const restoredSecond = { ...second, data: second.data };

    expect(MathHelpers.getMathResourceId(first)).toBe(MathHelpers.getMathResourceId(second));
    const firstKey = MathHelpers.getMathResourceInstanceId(first, history);
    const secondKey = MathHelpers.getMathResourceInstanceId(second, history);
    expect(firstKey).toMatch(/^duplicate-id::instance:/);
    expect(secondKey).toMatch(/^duplicate-id::instance:/);
    expect(secondKey).not.toBe(firstKey);
    expect(MathHelpers.getMathResourceInstanceId(restoredFirst, history)).toBe(firstKey);
    expect(MathHelpers.getMathResourceInstanceId(restoredSecond, history)).toBe(secondKey);
    expect(MathHelpers.getMathResourceInstanceId(first, [second, first])).toBe(firstKey);
    expect(MathHelpers.getMathResourceInstanceId(second, [second, first])).toBe(secondKey);
    expect(MathHelpers.getMathResourceInstanceId(second, [second])).toBe(secondKey);

    first._mathResourceStateKey = firstKey;
    second._mathResourceStateKey = firstKey;
    expect(MathHelpers.getMathResourceInstanceId(first, history)).toBe(firstKey);
    expect(MathHelpers.getMathResourceInstanceId(second, history)).toBe(secondKey);
  });

  it('keeps a detached duplicate isolated from the history artifact with the same supplied id', () => {
    const stored = { id: 'detached-duplicate', type: 'math', data: { title: 'Stored', problems: [] } };
    const detached = { id: 'detached-duplicate', type: 'math', data: { title: 'Detached', problems: [] } };

    expect(MathHelpers.getMathResourceInstanceId(stored, [stored])).toBe('detached-duplicate');
    const detachedKey = MathHelpers.getMathResourceInstanceId(detached, [stored]);
    expect(detachedKey).toMatch(/^detached-duplicate::instance:/);
    expect(detachedKey).not.toBe('detached-duplicate');
    expect(MathHelpers.getMathResourceInstanceId(detached, [stored])).toBe(detachedKey);
  });

  it('does not trust an imported runtime pin or collide it with an allocated instance key', () => {
    const imported = {
      id: 'runtime-pin-collision',
      type: 'math',
      _mathResourceStateKey: 'runtime-pin-collision::instance:999999',
      data: { title: 'Imported', problems: [] },
    };
    const sibling = {
      id: 'runtime-pin-collision',
      type: 'math',
      data: { title: 'Sibling', problems: [] },
    };
    const history = [imported, sibling];

    const importedKey = MathHelpers.getMathResourceInstanceId(imported, history);
    const siblingKey = MathHelpers.getMathResourceInstanceId(sibling, history);
    expect(importedKey).toMatch(/^runtime-pin-collision::instance:/);
    expect(importedKey).not.toBe(imported._mathResourceStateKey);
    expect(siblingKey).not.toBe(importedKey);
    expect(siblingKey).not.toBe(imported._mathResourceStateKey);
  });

  it('migrates an instance key across immutable metadata clones that retain data identity', () => {
    const first = { id: 'metadata-clone', type: 'math', data: { title: 'First', problems: [] } };
    const sibling = { id: 'metadata-clone', type: 'math', data: { title: 'Sibling', problems: [] } };
    const key = MathHelpers.getMathResourceInstanceId(first, [first, sibling]);
    const renamed = { ...first, folder: 'Favorites' };

    expect(MathHelpers.getMathResourceInstanceId(renamed, [renamed, sibling])).toBe(key);
    expect(MathHelpers.getMathResourceInstanceId(sibling, [renamed, sibling])).not.toBe(key);
  });

  it('uses the persisted artifact instance id across deep clones and reorder', () => {
    const first = {
      id: 'persistent-duplicate',
      type: 'math',
      _artifactInstanceId: 'artifact-persisted-first',
      data: { title: 'First', problems: [] },
    };
    const sibling = {
      id: 'persistent-duplicate',
      type: 'math',
      _artifactInstanceId: 'artifact-persisted-second',
      data: { title: 'Sibling', problems: [] },
    };
    const firstKey = MathHelpers.getMathResourceInstanceId(first, [first, sibling]);
    const siblingKey = MathHelpers.getMathResourceInstanceId(sibling, [first, sibling]);
    const clonedFirst = JSON.parse(JSON.stringify(first));
    const clonedSibling = JSON.parse(JSON.stringify(sibling));

    expect(firstKey).toBe('persistent-duplicate::artifact:artifact-persisted-first');
    expect(siblingKey).toBe('persistent-duplicate::artifact:artifact-persisted-second');
    expect(MathHelpers.getMathResourceInstanceId(clonedFirst, [clonedSibling, clonedFirst])).toBe(firstKey);
    expect(MathHelpers.getMathResourceInstanceId(clonedSibling, [clonedSibling, clonedFirst])).toBe(siblingKey);
  });

  it('rejects colliding persisted artifact instance ids and isolates both duplicates', () => {
    const first = {
      id: 'persistent-collision',
      type: 'math',
      _artifactInstanceId: 'artifact-colliding-id',
      data: { title: 'First', problems: [] },
    };
    const sibling = {
      id: 'persistent-collision',
      type: 'math',
      _artifactInstanceId: 'artifact-colliding-id',
      data: { title: 'Sibling', problems: [] },
    };
    const history = [first, sibling];
    const firstKey = MathHelpers.getMathResourceInstanceId(first, history);
    const siblingKey = MathHelpers.getMathResourceInstanceId(sibling, history);

    expect(firstKey).toMatch(/^persistent-collision::instance:/);
    expect(siblingKey).toMatch(/^persistent-collision::instance:/);
    expect(firstKey).not.toBe(siblingKey);
  });
});

describe('expanded conservative answer equivalence', () => {
  it.each([
    ['\\[\\frac{ 1 }{ 2 }\\]', '.5'],
    ['$$\\frac{1,000}{2}$$', '500'],
    ['x = 3', '3'],
    ['3', 'x=3'],
    ['50%', '.5'],
    ['12.5%', '1/8'],
    ['1 1/2', '1.5'],
    ['-1 1/2', '-1.5'],
    ['1\\frac{1}{2}', '1.5']
  ])('accepts %s as equivalent to %s', (given, expected) => {
    expect(MathHelpers.areMathAnswersEquivalent(given, expected)).toBe(true);
  });

  it.each([
    ['x=3', 'y=3'],
    ['answer = 3', '3'],
    ['x = 2 + 1', '3'],
    ['50% off', '.5'],
    ['%50', '.5'],
    ['1 + 1/2', '1.5'],
    ['1 1/2 cups', '1.5'],
    ['1 1/0', '1'],
    ['1 2/2', '2'],
    ['1\\frac{1}{2}', '5.5']
  ])('rejects unsafe or malformed equivalence %s / %s', (given, expected) => {
    expect(MathHelpers.areMathAnswersEquivalent(given, expected)).toBe(false);
  });
});

describe('privacy-safe self assessment helper', () => {
  it('returns the exact empty shape for malformed inputs', () => {
    expect(MathHelpers.gradeMathSelfAssessment(null, [])).toEqual({
      score: 0,
      total: 0,
      percentage: 0,
      answers: {},
      results: []
    });
  });

  it('grades supported forms, ignores inherited responses, and omits expected answers', () => {
    const inheritedAnswers = Object.create({ hidden: '3' });
    inheritedAnswers.fraction = '\\frac{1}{2}';
    inheritedAnswers.percent = '50%';
    inheritedAnswers.assignment = '3';
    inheritedAnswers.long = 'x'.repeat(2200);
    const problems = [
      null,
      { id: 'fraction', question: 'Fraction?', answer: '.5' },
      { id: 'percent', question: 'Percent?', answer: '.5' },
      { id: 'assignment', question: 'Solve x.', answer: 'x=3' },
      { id: 'hidden', question: 'Inherited?', answer: '3' },
      { id: 'long', question: 'q'.repeat(2200), answer: 'no' }
    ];
    const grade = MathHelpers.gradeMathSelfAssessment(problems, inheritedAnswers);

    expect(Object.keys(grade)).toEqual(['score', 'total', 'percentage', 'answers', 'results']);
    expect(grade).toMatchObject({ score: 3, total: 5, percentage: 60 });
    expect(grade.results[3]).toMatchObject({ problemId: 'hidden', response: '', correct: false });
    expect(grade.results[4].question).toHaveLength(2000);
    expect(grade.results[4].response).toHaveLength(2000);
    for (const result of grade.results) {
      expect(result).not.toHaveProperty('answer');
      expect(result).not.toHaveProperty('correct_answer');
      expect(result).not.toHaveProperty('expected');
    }
  });
});

describe('current-attempt XP and restored-state recovery', () => {
  it('records positive XP once, then reports zero earned on the retry', async () => {
    const resourceId = 'second-pass-xp-current';
    const score = vi.fn();
    const harness = checkHarness({ resourceId, handleScoreUpdate: score });

    await MathHelpers.handleCheckMathWork(resourceId, 'p', 'Six times seven?', '42', [], '42.000', harness.deps);
    expect(harness.getResults()[resourceId].p).toMatchObject({ xpAwarded: true, xpEarned: 10 });

    await MathHelpers.handleCheckMathWork(resourceId, 'p', 'Six times seven?', '42', [], '42.000', harness.deps);
    expect(score).toHaveBeenCalledTimes(1);
    expect(harness.getResults()[resourceId].p).toMatchObject({ xpAwarded: true, xpEarned: 0 });
  });

  it('ignores stale restored checking and preserves a prior XP award', async () => {
    const resourceId = 'second-pass-restored-checking';
    const callGemini = vi.fn(async () => JSON.stringify({
      verdict: 'partial',
      score: 50,
      feedback: 'Recheck the final step.'
    }));
    const results = { [resourceId]: { p: { checking: true, xpAwarded: true } } };
    const score = vi.fn();
    const harness = checkHarness({ resourceId, results, callGemini, handleScoreUpdate: score });

    await MathHelpers.handleCheckMathWork(resourceId, 'p', 'Explain.', '42', [], 'My answer is 41.', harness.deps);
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(score).not.toHaveBeenCalled();
    expect(harness.getResults()[resourceId].p).toMatchObject({
      checking: false,
      checked: true,
      xpAwarded: true,
      xpEarned: 0
    });
  });
});

describe('nested hint state and request lifecycle', () => {
  it('keeps formerly colliding resource/problem tuples separate', async () => {
    let state = {};
    const deps = {
      mathHintData: state,
      studentResponses: {},
      setMathHintData: update => {
        state = typeof update === 'function' ? update(state) : update;
        deps.mathHintData = state;
      },
      addToast: vi.fn(),
      callGemini: vi.fn(async prompt => prompt.includes('PROBLEM: First') ? 'Hint one.' : 'Hint two.'),
      warnLog: vi.fn()
    };

    await MathHelpers.handleGetMathHint('a_b', 'c', 'First', '1', [], deps);
    await MathHelpers.handleGetMathHint('a', 'b_c', 'Second', '2', [], deps);

    expect(state.a_b.c.hints).toEqual(['Hint one.']);
    expect(state.a.b_c.hints).toEqual(['Hint two.']);
    expect(deps.callGemini).toHaveBeenCalledTimes(2);
  });

  it('recovers a stale loading flag and repairs count from valid hints', async () => {
    const resourceId = 'second-pass-restored-hints';
    let state = {
      [resourceId]: {
        p: { hints: [' one ', null, '', 'two'], count: '1', loading: true }
      }
    };
    const callGemini = vi.fn(async () => 'Third.');
    const deps = {
      mathHintData: state,
      studentResponses: {},
      setMathHintData: update => {
        state = typeof update === 'function' ? update(state) : update;
        deps.mathHintData = state;
      },
      addToast: vi.fn(),
      callGemini,
      warnLog: vi.fn()
    };

    await MathHelpers.handleGetMathHint(resourceId, 'p', 'Question', 'Answer', [], deps);
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(state[resourceId].p).toEqual({
      hints: ['one', 'two', 'Third.'],
      count: 3,
      loading: false
    });
  });

  it('does not resurrect grading state after resource invalidation', async () => {
    const resourceId = 'second-pass-stale-grade';
    const pending = deferred();
    const score = vi.fn();
    const callGemini = vi.fn(() => pending.promise);
    const harness = checkHarness({ resourceId, callGemini, handleScoreUpdate: score });

    const request = MathHelpers.handleCheckMathWork(resourceId, 'p', 'Explain.', '42', [], 'My answer is 41.', harness.deps);
    expect(callGemini).toHaveBeenCalledTimes(1);
    MathHelpers.invalidateMathResourceRequests(resourceId);
    harness.replaceResults({});
    pending.resolve(JSON.stringify({ verdict: 'correct', score: 100, feedback: 'Correct.' }));
    await request;

    expect(harness.getResults()).toEqual({});
    expect(score).not.toHaveBeenCalled();
    expect(harness.deps.addToast).not.toHaveBeenCalledWith(expect.stringContaining('Excellent'), 'success');
  });

  it('times out cleanly and permits an immediate retry', async () => {
    const resourceId = 'second-pass-timeout';
    const callGemini = vi.fn(() => new Promise(() => {}));
    const harness = checkHarness({ resourceId, callGemini, timeout: 5 });

    await MathHelpers.handleCheckMathWork(resourceId, 'p', 'Explain.', '42', [], 'My answer is 41.', harness.deps);
    expect(harness.getResults()[resourceId].p).toMatchObject({ verdict: 'error', checking: false, checked: false });

    await MathHelpers.handleCheckMathWork(resourceId, 'p', 'Explain.', '42', [], 'Still forty-one.', harness.deps);
    expect(callGemini).toHaveBeenCalledTimes(2);
  });

  it('charges a hint that arrives while AI grading is pending', async () => {
    const resourceId = 'second-pass-concurrent-hint-xp';
    const pendingGrade = deferred();
    const score = vi.fn();
    let hintState = {};
    const gradeHarness = checkHarness({
      resourceId,
      hints: hintState,
      callGemini: vi.fn(() => pendingGrade.promise),
      handleScoreUpdate: score
    });
    const hintDeps = {
      mathHintData: hintState,
      studentResponses: {},
      setMathHintData: update => {
        hintState = typeof update === 'function' ? update(hintState) : update;
        hintDeps.mathHintData = hintState;
        gradeHarness.deps.mathHintData = hintState;
      },
      addToast: vi.fn(),
      callGemini: vi.fn(async () => 'Use inverse operations.'),
      warnLog: vi.fn()
    };

    const grading = MathHelpers.handleCheckMathWork(resourceId, 'p', 'Explain.', '42', [], 'My answer is 41.', gradeHarness.deps);
    await MathHelpers.handleGetMathHint(resourceId, 'p', 'Explain.', '42', [], hintDeps);
    pendingGrade.resolve(JSON.stringify({ verdict: 'correct', score: 100, feedback: 'Correct now.' }));
    await grading;

    expect(score).toHaveBeenCalledWith(8, 'Math Problem', resourceId);
    expect(gradeHarness.getResults()[resourceId].p).toMatchObject({ hintsUsed: 1, xpEarned: 8 });
  });
});

describe('full-set math edit lifecycle', () => {
  it('updates only the selected history copy when imported artifacts reuse an ID', async () => {
    const first = {
      id: 'duplicate-edit-id',
      type: 'math',
      data: { title: 'First copy', problems: [{ id: 'p1', question: 'First question', answer: '1', steps: [] }] },
    };
    const second = {
      id: 'duplicate-edit-id',
      type: 'math',
      data: { title: 'Second copy', problems: [{ id: 'p2', question: 'Second question', answer: '2', steps: [] }] },
    };
    let history = [first, second];
    let active = { ...second, data: second.data };
    const mathResourceId = MathHelpers.getMathResourceInstanceId(active, history);
    const deps = {
      generatedContent: active,
      history,
      mathResourceId,
      leveledTextLanguage: 'English',
      gradeLevel: '6',
      mathSubject: 'Math',
      setIsMathEditingChat: vi.fn(),
      setGeneratedContent: vi.fn(update => {
        active = typeof update === 'function' ? update(active) : update;
      }),
      setHistory: vi.fn(update => {
        history = typeof update === 'function' ? update(history) : update;
      }),
      setMathEditInput: vi.fn(),
      callGemini: vi.fn(async () => mathEditResult('Selected copy updated')),
      cleanJson: value => value,
      safeJsonParse: value => JSON.parse(value),
      addToast: vi.fn(),
      warnLog: vi.fn(),
      onMathProblemsChanged: vi.fn(),
    };

    await MathHelpers.handleMathEdit('Update this copy.', deps);

    expect(mathResourceId).toMatch(/^duplicate-edit-id::instance:/);
    expect(history[0]).toBe(first);
    expect(history[0].data.problems[0].question).toBe('First question');
    expect(history[1].data.problems[0].question).toBe('Selected copy updated');
    expect(history[1]._mathResourceStateKey).toBe(mathResourceId);
    expect(active.data.problems[0].question).toBe('Selected copy updated');
    expect(active._mathResourceStateKey).toBe(mathResourceId);
  });

  it('does not overwrite the active resource after navigation and updates only the captured history item', async () => {
    const pending = deferred();
    const harness = mathEditHarness({
      resourceId: 'edit-navigation-target',
      callGemini: vi.fn(() => pending.promise)
    });
    const request = MathHelpers.handleMathEdit('Make the set harder.', harness.deps);
    expect(harness.deps.callGemini).toHaveBeenCalledTimes(1);

    harness.navigateTo(harness.other);
    pending.resolve(mathEditResult('Edited target question'));
    await request;

    expect(harness.getActive()).toBe(harness.other);
    expect(harness.getActive().data.title).toBe('Other set');
    expect(harness.getHistory()[0].data.problems[0].question).toBe('Edited target question');
    expect(harness.getHistory()[1]).toBe(harness.other);
    expect(harness.deps.onMathProblemsChanged).toHaveBeenCalledWith('edit-navigation-target');
  });

  it('coalesces duplicate clicks for the same resource and lifecycle', async () => {
    const pending = deferred();
    const harness = mathEditHarness({
      resourceId: 'edit-duplicate-target',
      callGemini: vi.fn(() => pending.promise)
    });

    const first = MathHelpers.handleMathEdit('Use larger numbers.', harness.deps);
    const duplicate = MathHelpers.handleMathEdit('Use larger numbers.', harness.deps);
    await duplicate;
    expect(harness.deps.callGemini).toHaveBeenCalledTimes(1);

    pending.resolve(mathEditResult('One accepted edit'));
    await first;

    expect(harness.deps.setGeneratedContent).toHaveBeenCalledTimes(1);
    expect(harness.deps.setHistory).toHaveBeenCalledTimes(1);
    expect(harness.deps.onMathProblemsChanged).toHaveBeenCalledTimes(1);
    expect(harness.deps.setIsMathEditingChat.mock.calls).toEqual([[true], [false]]);
  });

  it('keeps active content and the captured history entry in data parity', async () => {
    const harness = mathEditHarness({
      resourceId: 'edit-history-parity',
      callGemini: vi.fn(async () => mathEditResult('Parity question'))
    });
    const untouchedHistoryItem = harness.other;

    await MathHelpers.handleMathEdit('Revise this set.', harness.deps);

    const active = harness.getActive();
    const historyTarget = harness.getHistory()[0];
    expect(active.data).toBe(historyTarget.data);
    expect(active.data.problems[0].question).toBe('Parity question');
    expect(active.activeMarker).toBe('active metadata');
    expect(historyTarget.historyMarker).toBe('history metadata');
    expect(harness.getHistory()[1]).toBe(untouchedHistoryItem);
  });

  it('lets a new lifecycle win and ignores the older racing completion', async () => {
    const older = deferred();
    const newer = deferred();
    const callGemini = vi.fn()
      .mockImplementationOnce(() => older.promise)
      .mockImplementationOnce(() => newer.promise);
    const harness = mathEditHarness({ resourceId: 'edit-lifecycle-race', callGemini });

    const oldRequest = MathHelpers.handleMathEdit('First edit.', harness.deps);
    MathHelpers.invalidateMathResourceRequests('edit-lifecycle-race');
    const newRequest = MathHelpers.handleMathEdit('Second edit.', harness.deps);
    expect(callGemini).toHaveBeenCalledTimes(2);

    newer.resolve(mathEditResult('Newer result'));
    await newRequest;
    older.resolve(mathEditResult('Stale older result'));
    await oldRequest;

    expect(harness.getActive().data.problems[0].question).toBe('Newer result');
    expect(harness.getHistory()[0].data.problems[0].question).toBe('Newer result');
    expect(harness.deps.setGeneratedContent).toHaveBeenCalledTimes(1);
    expect(harness.deps.onMathProblemsChanged).toHaveBeenCalledTimes(1);
  });
});
