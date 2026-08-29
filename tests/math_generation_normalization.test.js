import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let normalizeMath;
let verifyMath;
beforeAll(() => {
  loadAlloModule('generation_helpers_module.js');
  normalizeMath = window.AlloModules.GenerationHelpers.normalizeGeneratedMathContent;
  verifyMath = window.AlloModules.GenerationHelpers.verifyGeneratedMathProblems;
});

const mathGenerationDeps = (overrides = {}) => ({
  mathInput: 'practice arithmetic',
  history: [],
  inputText: '',
  useMathSourceContext: false,
  studentInterests: [],
  gradeLevel: '5',
  mathMode: 'Problem Set Generator',
  mathSubject: 'Math',
  mathQuantity: 1,
  autoAttachManipulatives: false,
  leveledTextLanguage: 'English',
  translationMode: 'off',
  currentUiLanguage: 'English',
  isMathGraphEnabled: false,
  autoSnapshotManipulatives: false,
  setIsProcessing: vi.fn(),
  setGenerationStep: vi.fn(),
  setGenerationStage: vi.fn(),
  setError: vi.fn(),
  setGeneratedContent: vi.fn(),
  setActiveView: vi.fn(),
  setShowMathAnswers: vi.fn(),
  setHistory: vi.fn(),
  setToolSnapshots: vi.fn(),
  addToast: vi.fn(),
  t: key => key,
  callGemini: vi.fn(async () => JSON.stringify({ problems: [{ question: '2 + 2', expression: '2 + 2', answer: '4' }] })),
  cleanJson: value => value,
  safeJsonParse: JSON.parse,
  warnLog: vi.fn(),
  flyToElement: vi.fn(),
  ...overrides,
});

describe('generated math artifact normalization', () => {
  it('preserves graph accessibility and single-problem response fields', () => {
    const support = { tool: 'numberline', state: { markers: [{ value: 3 }] } };
    const response = { tool: 'fractions', state: { numerator: 3, denominator: 4 } };
    const normalized = normalizeMath({
      problem: 'x + 1 = 4', id: 'existing-id', taskType: 'SOLVE',
      expression: '4 - 1', answer: 'x = 3', type: 'algebra',
      realWorld: 'Engineers rearrange equations.',
      manipulativeSupport: support, manipulativeResponse: response,
      customRubric: { strategy: 'inverse operations' },
      steps: { description: 'Subtract one.', math: 'x=3' },
      graphData: '<svg></svg>', graphAlt: 'A line crossing the x-axis at three.'
    }, 'fallback', 'artifact-a');

    expect(normalized.graphAlt).toBe('A line crossing the x-axis at three.');
    expect(normalized.graphData).toBe('<svg></svg>');
    expect(normalized.problems[0]).toMatchObject({
      id: 'existing-id', question: 'x + 1 = 4', taskType: 'solve',
      expression: '4 - 1', answer: 'x = 3', type: 'algebra',
      manipulativeSupport: support, manipulativeResponse: response,
      customRubric: { strategy: 'inverse operations' },
      steps: [{ description: 'Subtract one.', math: 'x=3', explanation: 'Subtract one.', latex: 'x=3' }]
    });
  });

  it('filters malformed problem and step entries before verification', () => {
    const normalized = normalizeMath({ problems: [
      null, ' 2 + 2 ',
      { id: 'kept', question: 'Solve y = 2.', taskType: 'invalid',
        steps: [null, ' First. ', 42, {}, { latex: 'y=2' }, { description: 'Conclude.', math: '2' }] },
      false, [], { answer: 'missing question' },
      { expression: '7 * 8', answer: 56, steps: { expression: '7 * 8' } }
    ] }, 'unused', 'artifact-b');

    expect(normalized.problems.map((p) => p.question)).toEqual(['2 + 2', 'Solve y = 2.', '7 * 8']);
    expect(normalized.problems[1].taskType).toBe('simplify');
    expect(normalized.problems[1].steps).toEqual([
      { explanation: 'First.', latex: '' },
      { latex: 'y=2', explanation: '' },
      { description: 'Conclude.', math: '2', explanation: 'Conclude.', latex: '2' }
    ]);
    expect(normalized.problems[2].steps).toEqual([{ expression: '7 * 8', explanation: '', latex: '' }]);
  });

  it('assigns stable unique IDs while preserving supplied IDs', () => {
    const raw = { problems: [null, { question: 'First' },
      { id: 'teacher-id', question: 'Second' }, { id: 'teacher-id', question: 'Third' }] };
    const first = normalizeMath(raw, '', 'artifact-stable');
    const repeated = normalizeMath(raw, '', 'artifact-stable');
    expect(first.problems.map((problem) => problem.id)).toEqual([
      'artifact-stable-problem-2', 'teacher-id', 'teacher-id-2'
    ]);
    expect(repeated.problems.map((problem) => problem.id)).toEqual(first.problems.map((problem) => problem.id));
  });

  it('accepts bare arrays and drops wholly unusable data', () => {
    expect(normalizeMath(['One', { problem: 'Two' }], '', 'array').problems)
      .toMatchObject([{ question: 'One' }, { question: 'Two' }]);
    expect(normalizeMath([null, false, [], {}, { answer: 9 }], 'unused', 'bad').problems).toEqual([]);
  });

  it('contains throwing raw and problem getters while preserving valid siblings', () => {
    const guardedProblem = { id: 'guarded', question: 'Guarded problem remains usable.' };
    for (const key of ['problem', 'answer', 'steps']) {
      Object.defineProperty(guardedProblem, key, {
        enumerable: true,
        get() { throw new Error('hostile ' + key + ' getter'); }
      });
    }
    const revoked = Proxy.revocable({ question: 'Must not survive.' }, {});
    revoked.revoke();
    const validProblem = {
      id: 'valid', question: 'Valid sibling.', answer: '4', steps: ['Add two and two.']
    };
    const raw = { problems: [guardedProblem, revoked.proxy, validProblem] };
    for (const key of ['data', 'title', 'graphData']) {
      Object.defineProperty(raw, key, {
        enumerable: true,
        get() { throw new Error('hostile raw ' + key + ' getter'); }
      });
    }

    expect(() => normalizeMath(raw, '', 'hostile-artifact')).not.toThrow();
    const normalized = normalizeMath(raw, '', 'hostile-artifact');
    expect(normalized.title).toBe('Math & STEM Solver');
    expect(normalized.graphData).toBeNull();
    expect(normalized.problems.map(problem => problem.id)).toEqual(['guarded', 'valid']);
    expect(normalized.problems[0]).toMatchObject({
      question: 'Guarded problem remains usable.', steps: []
    });
    expect(normalized.problems[0]).not.toHaveProperty('answer');
    expect(normalized.problems[1].steps).toEqual([
      { explanation: 'Add two and two.', latex: '' }
    ]);
  });

  it('falls back to accessible single-problem fields when the problems getter throws', () => {
    const raw = { question: 'Accessible direct question.', answer: '7' };
    Object.defineProperty(raw, 'problems', {
      enumerable: true,
      get() { throw new Error('hostile problems getter'); }
    });

    expect(normalizeMath(raw, '', 'single-hostile').problems).toMatchObject([
      { question: 'Accessible direct question.', answer: '7', steps: [] }
    ]);
  });

  it('verifies guarded snapshots without invoking answer coercion or retaining malformed siblings', () => {
    let coercionCalls = 0;
    const hostileAnswer = {
      toString() {
        coercionCalls += 1;
        throw new Error('hostile answer coercion');
      }
    };
    const guarded = { question: 'Guarded verification.', expression: '2 + 2', answer: hostileAnswer };
    Object.defineProperty(guarded, 'steps', {
      enumerable: true,
      get() { throw new Error('hostile steps getter'); }
    });
    const revoked = Proxy.revocable({ expression: '1 + 1', answer: '2' }, {});
    revoked.revoke();
    const valid = { question: 'Valid verification.', expression: '6 * 7', answer: '41' };

    expect(() => verifyMath([guarded, revoked.proxy, valid])).not.toThrow();
    const verified = verifyMath([guarded, revoked.proxy, valid]);
    expect(coercionCalls).toBe(0);
    expect(verified).toHaveLength(2);
    expect(verified[0]._verification).toEqual({
      verified: false, mismatch: false, computed: 4, autoCorrected: false
    });
    expect(verified[0]).not.toHaveProperty('_originalAnswer');
    expect(verified[1]).toMatchObject({
      question: 'Valid verification.',
      answer: '42',
      _originalAnswer: '41',
      _verification: { computed: 42, mismatch: true, autoCorrected: true }
    });
  });

  it('bounds copied text, problem arrays, and step arrays', () => {
    const raw = {
      title: 'T'.repeat(700),
      problems: Array.from({ length: 205 }, (_, index) => ({
        question: index === 0 ? 'Q'.repeat(13000) : 'Problem ' + index,
        steps: Array.from({ length: 55 }, step => 'Step ' + step)
      }))
    };
    const normalized = normalizeMath(raw, '', 'bounded');
    expect(normalized.title).toHaveLength(500);
    expect(normalized.problems).toHaveLength(200);
    expect(normalized.problems[0].question).toHaveLength(12000);
    expect(normalized.problems[0].steps).toHaveLength(50);
  });

  it('uses an aggregate traversal budget for branching extension data', () => {
    let getterReads = 0;
    const makeSharedBranch = (depth) => {
      if (depth === 0) return 'leaf';
      const child = makeSharedBranch(depth - 1);
      const branch = {};
      for (let index = 0; index < 7; index += 1) {
        Object.defineProperty(branch, 'branch' + index, {
          enumerable: true,
          get() {
            getterReads += 1;
            return child;
          }
        });
      }
      return branch;
    };
    const normalized = normalizeMath({
      problems: [{
        question: 'The usable problem survives bounded extension traversal.',
        steps: [{ explanation: 'The usable step survives too.', latex: '2+2=4' }],
        extension: makeSharedBranch(5)
      }]
    }, '', 'aggregate-budget');

    expect(normalized.problems[0].question)
      .toBe('The usable problem survives bounded extension traversal.');
    expect(normalized.problems[0].steps).toMatchObject([
      { explanation: 'The usable step survives too.', latex: '2+2=4' }
    ]);
    expect(getterReads).toBeLessThanOrEqual(4096);
    expect(readFileSync('generation_helpers_source.jsx', 'utf8'))
      .not.toContain('Object.keys(value).slice');
  });

  it('does not let a hostile identifier consume the valid question sibling budget', () => {
    const makeBranch = depth => {
      if (depth === 0) return 'leaf';
      const branch = {};
      for (let index = 0; index < 7; index += 1) branch['branch' + index] = makeBranch(depth - 1);
      return branch;
    };
    const normalized = normalizeMath({
      problems: [{
        id: makeBranch(5),
        question: 'The semantic question survives hostile identifier traversal.',
        answer: '4',
      }],
    }, '', 'budget-fairness');

    expect(normalized.problems).toHaveLength(1);
    expect(normalized.problems[0].question)
      .toBe('The semantic question survives hostile identifier traversal.');
  });

  it('only auto-verifies complete numeric expressions and plain numeric answers', () => {
    const verified = verifyMath([
      { expression: '2 * (3 + 4)', answer: '13', steps: [{ expression: '3+4' }] },
      { expression: '2x + 3', answer: '5' },
      { expression: 'sqrt(9)', answer: '3' },
      { expression: '1 / 2', answer: '1/2' },
      { expression: '1 + 1', answer: 'x=1 or x=2' },
      { expression: '1e3', answer: '1000' }
    ]);
    expect(verified[0]).toMatchObject({
      answer: '14',
      _originalAnswer: '13',
      _verification: { computed: 14, mismatch: true, autoCorrected: true }
    });
    expect(verified[0].steps[0]).toMatchObject({ _computedResult: 7, _verified: true });
    expect(verified.slice(1).map(problem => problem._verification)).toEqual([
      { verified: false, mismatch: false, computed: null, autoCorrected: false },
      { verified: false, mismatch: false, computed: null, autoCorrected: false },
      { verified: false, mismatch: false, computed: 0.5, autoCorrected: false },
      { verified: false, mismatch: false, computed: 2, autoCorrected: false },
      { verified: false, mismatch: false, computed: null, autoCorrected: false }
    ]);
    for (const problem of verified.slice(1)) {
      expect(problem).not.toHaveProperty('_originalAnswer');
    }
  });

  it('rejects JavaScript comment tokens before numeric expression evaluation', () => {
    const verified = verifyMath([
      { expression: '1/*2*/+3', answer: '3' },
      { expression: '1//2\n+3', answer: '3' }
    ]);

    expect(verified.map(problem => problem.answer)).toEqual(['3', '3']);
    expect(verified.map(problem => problem._verification)).toEqual([
      { verified: false, mismatch: false, computed: null, autoCorrected: false },
      { verified: false, mismatch: false, computed: null, autoCorrected: false }
    ]);
    for (const problem of verified) {
      expect(problem).not.toHaveProperty('_originalAnswer');
    }
  });

  it('fails closed when integer operands or results exceed exact Number range', () => {
    const verified = verifyMath([
      { expression: '9007199254740992 + 1', answer: '9007199254740992' },
      { expression: '9007199254740991 + 1', answer: '9007199254740992' },
      { expression: '10 ^ 300', answer: '0' },
    ]);

    expect(verified.map(problem => problem.answer)).toEqual([
      '9007199254740992', '9007199254740992', '0',
    ]);
    for (const problem of verified) {
      expect(problem._verification).toEqual({
        verified: false, mismatch: false, computed: null, autoCorrected: false,
      });
      expect(problem).not.toHaveProperty('_originalAnswer');
    }
  });

  it('strips forged verifier-owned metadata from problems and unsupported steps', () => {
    const [result] = verifyMath([{
      question: 'Do not trust metadata.',
      expression: '2x',
      answer: '4',
      _verification: { verified: true, computed: 999 },
      _originalAnswer: 'forged',
      _verified: true,
      _computedResult: 999,
      steps: [{
        explanation: 'Unsupported algebraic step.',
        expression: '2x',
        _verified: true,
        _computedResult: 999,
        _originalAnswer: 'forged',
      }],
    }]);

    expect(result._verification).toEqual({
      verified: false, mismatch: false, computed: null, autoCorrected: false,
    });
    expect(result).not.toHaveProperty('_originalAnswer');
    expect(result).not.toHaveProperty('_verified');
    expect(result).not.toHaveProperty('_computedResult');
    expect(result.steps[0]).not.toHaveProperty('_verified');
    expect(result.steps[0]).not.toHaveProperty('_computedResult');
    expect(result.steps[0]).not.toHaveProperty('_originalAnswer');
  });

  it('does not mutate caller-owned problems while adding verification metadata', () => {
    const problem = {
      expression: '6 * 7',
      answer: '41',
      steps: [{ expression: '6 * 7' }]
    };
    const before = JSON.stringify(problem);
    const [result] = verifyMath([problem]);
    expect(JSON.stringify(problem)).toBe(before);
    expect(result.answer).toBe('42');
    expect(result.steps[0]).not.toBe(problem.steps[0]);
  });

  it('uses the artifact ID for generated problem IDs before verification', async () => {
    let generatedContent = null;
    let history = [];
    await window.AlloModules.GenerationHelpers.handleGenerateMath(null, true, null, {
      mathInput: 'practice arithmetic', history, inputText: '', useMathSourceContext: false,
      studentInterests: [], gradeLevel: '5', mathMode: 'Problem Set Generator', mathSubject: 'Math',
      mathQuantity: 2, autoAttachManipulatives: false, leveledTextLanguage: 'English',
      translationMode: 'off', currentUiLanguage: 'English', isMathGraphEnabled: false,
      autoSnapshotManipulatives: false, setIsProcessing: vi.fn(), setGenerationStep: vi.fn(),
      setGenerationStage: vi.fn(), setError: vi.fn(), setActiveView: vi.fn(), setShowMathAnswers: vi.fn(),
      setGeneratedContent: (value) => { generatedContent = typeof value === 'function' ? value(generatedContent) : value; },
      setHistory: (update) => { history = update(history); }, setToolSnapshots: vi.fn(), addToast: vi.fn(),
      t: (key) => key, callGemini: async () => JSON.stringify({ problems: [null, { question: '2 + 2', steps: [null, 'Add.'] }] }),
      cleanJson: (value) => value, safeJsonParse: JSON.parse, warnLog: vi.fn(),
      flyToElement: vi.fn()
    });

    expect(generatedContent.data.problems[0].id).toBe(`${generatedContent.id}-problem-2`);
    expect(generatedContent.data.problems[0].steps).toEqual([{ explanation: 'Add.', latex: '' }]);
    expect(history[0].id).toBe(generatedContent.id);
    expect(generatedContent).toEqual(history[0]);
    expect(generatedContent).toMatchObject({
      type: 'math',
      title: 'Math & STEM Solver',
      meta: 'Math - Problem Set Generator',
      config: {}
    });
  });

  it('allows only the newest overlapping math generation to commit or clear busy state', async () => {
    const pending = [];
    const callGemini = vi.fn(() => new Promise(resolve => pending.push(resolve)));
    let generatedContent = null;
    let history = [];
    const setGeneratedContent = value => {
      generatedContent = typeof value === 'function' ? value(generatedContent) : value;
    };
    const setIsProcessing = vi.fn();
    const baseDeps = {
      mathInput: 'unused', history, inputText: '', useMathSourceContext: false,
      studentInterests: [], gradeLevel: '5', mathMode: 'Problem Set Generator', mathSubject: 'Math',
      mathQuantity: 1, autoAttachManipulatives: false, leveledTextLanguage: 'English',
      translationMode: 'off', currentUiLanguage: 'English', isMathGraphEnabled: false,
      autoSnapshotManipulatives: false, setIsProcessing, setGenerationStep: vi.fn(),
      setGenerationStage: vi.fn(), setError: vi.fn(), setActiveView: vi.fn(), setShowMathAnswers: vi.fn(),
      setGeneratedContent,
      setHistory: update => { history = update(history); },
      setToolSnapshots: vi.fn(), addToast: vi.fn(), t: key => key, callGemini,
      cleanJson: value => value, safeJsonParse: JSON.parse, warnLog: vi.fn(), flyToElement: vi.fn()
    };
    const older = window.AlloModules.GenerationHelpers.handleGenerateMath('older topic', true, null, baseDeps);
    const newer = window.AlloModules.GenerationHelpers.handleGenerateMath('newer topic', true, null, {
      ...baseDeps,
      history
    });
    expect(pending).toHaveLength(2);
    pending[1](JSON.stringify({ problems: [{ question: 'Newest', expression: '2+2', answer: '4' }] }));
    await newer;
    const newestId = generatedContent.id;
    pending[0](JSON.stringify({ problems: [{ question: 'Stale', expression: '1+1', answer: '2' }] }));
    await older;
    expect(generatedContent.id).toBe(newestId);
    expect(generatedContent.data.problems[0].question).toBe('Newest');
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(newestId);
    expect(setIsProcessing.mock.calls.filter(([value]) => value === false)).toHaveLength(1);
  });

  it('rechecks newest-run ownership after a reentrant parser starts a newer generation', async () => {
    let generatedContent = null;
    let history = [];
    let triggered = false;
    let newer;
    const setGeneratedContent = value => {
      generatedContent = typeof value === 'function' ? value(generatedContent) : value;
    };
    const setHistory = update => { history = update(history); };
    const deps = mathGenerationDeps({
      history,
      setGeneratedContent,
      setHistory,
      callGemini: vi.fn(async prompt => JSON.stringify({
        problems: [{ question: prompt.includes('newer topic') ? 'Newest' : 'Stale', answer: '4' }],
      })),
    });
    deps.safeJsonParse = value => {
      if (!triggered) {
        triggered = true;
        newer = window.AlloModules.GenerationHelpers.handleGenerateMath('newer topic', true, null, {
          ...deps,
          history,
          safeJsonParse: JSON.parse,
        });
      }
      return JSON.parse(value);
    };

    await window.AlloModules.GenerationHelpers.handleGenerateMath('older topic', true, null, deps);
    await newer;

    expect(history).toHaveLength(1);
    expect(history[0].data.problems[0].question).toBe('Newest');
    expect(generatedContent).toBe(history[0]);
  });

  it('clears processing and reports safely when an initialization callback throws', async () => {
    const setIsProcessing = vi.fn();
    const setError = vi.fn();
    const addToast = vi.fn();
    const callGemini = vi.fn();
    const deps = mathGenerationDeps({
      setIsProcessing,
      setGenerationStep: vi.fn(() => { throw new Error('init callback failed'); }),
      setError,
      addToast,
      callGemini,
    });

    await expect(window.AlloModules.GenerationHelpers.handleGenerateMath(null, true, null, deps))
      .resolves.toBeUndefined();
    expect(callGemini).not.toHaveBeenCalled();
    expect(setIsProcessing.mock.calls).toEqual([[true], [false]]);
    expect(setError).toHaveBeenCalledWith('math.error_generation');
    expect(addToast).toHaveBeenCalledWith('math.error_generation', 'error');
  });

  it.each(['null', 'revoked'])('contains hostile provider rejections and always releases processing: %s', async kind => {
    let rejection = null;
    if (kind === 'revoked') {
      const revoked = Proxy.revocable({ message: 'revoked' }, {});
      rejection = revoked.proxy;
      revoked.revoke();
    }
    const setIsProcessing = vi.fn();
    const setError = vi.fn();
    const deps = mathGenerationDeps({
      setIsProcessing,
      setError,
      callGemini: vi.fn(async () => { throw rejection; }),
    });

    await expect(window.AlloModules.GenerationHelpers.handleGenerateMath(null, true, null, deps))
      .resolves.toBeUndefined();
    expect(setIsProcessing.mock.calls).toEqual([[true], [false]]);
    expect(setError).toHaveBeenCalledWith('math.error_generation');
  });

  it('allocates distinct resource IDs when time and randomness are identical', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    try {
      let history = [];
      let generatedContent = null;
      const setGeneratedContent = value => {
        generatedContent = typeof value === 'function' ? value(generatedContent) : value;
      };
      const setHistory = update => { history = update(history); };
      const firstDeps = mathGenerationDeps({ history, setGeneratedContent, setHistory });
      await window.AlloModules.GenerationHelpers.handleGenerateMath(null, true, null, firstDeps);
      const firstId = generatedContent.id;
      await window.AlloModules.GenerationHelpers.handleGenerateMath(null, true, null, {
        ...firstDeps,
        history,
      });

      expect(generatedContent.id).not.toBe(firstId);
      expect(new Set(history.map(item => item.id)).size).toBe(2);
    } finally {
      now.mockRestore();
      random.mockRestore();
    }
  });

  it('keeps the deployed module byte-identical to the root build', () => {
    expect(readFileSync('desktop/web-app/public/generation_helpers_module.js', 'utf8'))
      .toBe(readFileSync('generation_helpers_module.js', 'utf8'));
  });
});
