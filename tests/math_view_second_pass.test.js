import fs from 'node:fs';
import vm from 'node:vm';
import { transformSync } from '@babel/core';
import { describe, expect, it, vi } from 'vitest';

const MODULE_PATH = 'view_math_module.js';

let transformedSource;
function currentMathViewSource() {
  if (!transformedSource) {
    transformedSource = transformSync(fs.readFileSync('view_math_source.jsx', 'utf8'), {
      plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
      babelrc: false,
      configFile: false,
      parserOpts: { sourceType: 'script', plugins: ['jsx'] },
    }).code;
  }
  return transformedSource;
}

function loadMathView({ promptEquation, manipulativeGrader, mathHelpers, fromSource = false } = {}) {
  const hookSlots = [];
  const layoutEffects = [];
  let hookCursor = 0;
  const createElement = vi.fn((type, props, ...children) => ({
    type,
    props: props || {},
    children,
  }));
  const document = { getElementById: vi.fn(() => null) };
  const React = {
    Fragment: Symbol('Fragment'),
    createElement,
    useRef(initialValue) {
      const index = hookCursor++;
      if (!hookSlots[index]) hookSlots[index] = { current: initialValue };
      return hookSlots[index];
    },
    useLayoutEffect(effect) {
      layoutEffects.push(effect);
    },
    useEffect: vi.fn(),
  };
  const window = {
    React,
    AlloIcons: {},
    AlloModules: {
      ...(manipulativeGrader ? { MathManipulativeGrader: manipulativeGrader } : {}),
      ...(mathHelpers ? { MathHelpers: mathHelpers } : {}),
    },
    setTimeout: callback => callback(),
    ...(promptEquation ? { AlloMathInput: { promptEquation } } : {}),
  };
  const icon = () => null;
  const context = {
    console: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
    document,
    window,
    React,
    EyeOff: icon,
    Eye: icon,
    Copy: icon,
    ImageIcon: icon,
    CheckCircle2: icon,
    Pencil: icon,
    Globe: icon,
    RefreshCw: icon,
    Sparkles: icon,
    ChevronDown: icon,
  };
  vm.runInNewContext(fromSource ? currentMathViewSource() : fs.readFileSync(MODULE_PATH, 'utf8'), context);
  const RawMathView = fromSource ? context.MathView : window.AlloModules.MathView;
  const MathView = props => {
    hookCursor = 0;
    layoutEffects.length = 0;
    const tree = RawMathView(props);
    layoutEffects.splice(0).forEach(effect => effect());
    return tree;
  };
  return { createElement, document, MathView, window };
}

function walk(node, matches = []) {
  if (Array.isArray(node)) {
    node.forEach(child => walk(child, matches));
    return matches;
  }
  if (!node || typeof node !== 'object') return matches;
  matches.push(node);
  walk(node.children, matches);
  return matches;
}

function nodeText(node) {
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (typeof node === 'object') return nodeText(node.children);
  return '';
}

const artifact = (overrides = {}) => ({
  id: 'r',
  type: 'math',
  meta: 'Math - Practice',
  data: {
    title: 'Practice',
    problems: [{ id: 'p', question: 'What is 2 + 2?', answer: '4', steps: [] }],
    ...overrides,
  },
});

const findNode = (tree, predicate) => walk(tree).find(predicate);
const findNodes = (tree, predicate) => walk(tree).filter(predicate);

describe('MathView second-pass state hardening', () => {
  it('restores hostile records without throwing and disambiguates duplicate keys', () => {
    const { MathView } = loadMathView({ fromSource: true });
    const content = {
      id: '__proto__',
      type: 'math',
      data: {
        title: 'Hostile restore',
        graphData: '<svg><script>alert(1)</script></svg>',
        problems: [
          { id: '__proto__', question: 'First?', answer: { unsafe: true }, steps: [{ explanation: {} }] },
          { id: '__proto__', question: 'Second?', answer: ['bad'], steps: {} },
        ],
      },
    };
    let tree;
    expect(() => {
      tree = MathView({
        generatedContent: content,
        mathStudentAnswers: [],
        mathHintData: [],
        mathCheckResults: [],
        studentResponses: [],
      });
    }).not.toThrow();

    const graph = findNode(tree, node => node.props?.['data-help-key'] === 'math_graph');
    expect(graph).toBeUndefined();
    const sections = findNodes(tree, node => node.type === 'section');
    expect(sections).toHaveLength(2);
    expect(sections[0].props.key).toBeTruthy();
    expect(sections[1].props.key).toBeTruthy();
    expect(sections[0].props.key).not.toBe(sections[1].props.key);
  });

  it('bounds oversized restored collections and rendered text before doing view work', () => {
    const problemReads = [];
    const stepReads = [];
    const hintReads = [];
    const trackIndexes = (target, reads) => new Proxy(target, {
      get(value, key, receiver) {
        if (/^\d+$/.test(String(key))) reads.push(Number(key));
        return Reflect.get(value, key, receiver);
      },
    });
    const steps = trackIndexes(
      Array.from({ length: 80 }, (_, index) => ({ explanation: `Step ${index}` })),
      stepReads,
    );
    const problems = trackIndexes(
      Array.from({ length: 240 }, (_, index) => ({
        id: `p${index}`,
        question: `Question ${index}?`,
        answer: String(index),
        steps: index === 0 ? steps : [],
      })),
      problemReads,
    );
    const hints = trackIndexes(Array.from({ length: 30 }, (_, index) => `Hint ${index}`), hintReads);
    const sanitizeHtml = vi.fn(value => value);
    const { MathView } = loadMathView({ fromSource: true });
    const tree = MathView({
      generatedContent: {
        id: 'bounded',
        type: 'math',
        data: {
          title: 'T'.repeat(5000),
          graphData: 'g'.repeat(300000),
          problems,
        },
      },
      sanitizeHtml,
      mathHintData: { bounded: { p0: { hints } } },
    });

    expect(findNodes(tree, node => node.type === 'section')).toHaveLength(200);
    expect(Math.max(...problemReads)).toBe(199);
    expect(Math.max(...stepReads)).toBe(49);
    expect(Math.max(...hintReads)).toBe(11);
    expect(nodeText(findNode(tree, node => node.type === 'h2'))).toHaveLength(2000);
    expect(sanitizeHtml).toHaveBeenCalledWith(expect.stringMatching(/^g{250000}$/));
  });

  it('contains hostile fallback resource seeds without requiring a host-supplied id', () => {
    const throwingScalar = { toString() { throw new Error('seed boom'); } };
    const { MathView } = loadMathView({ fromSource: true });
    let tree;
    expect(() => {
      tree = MathView({
        generatedContent: {
          type: 'math',
          timestamp: throwingScalar,
          data: {
            title: throwingScalar,
            problems: [{ question: 'Still displayable?', answer: 'yes', steps: [] }],
          },
        },
      });
    }).not.toThrow();
    expect(findNodes(tree, node => node.type === 'section')).toHaveLength(1);
  });

  it.each([
    { checking: true, checked: false },
    { checking: false, checked: true, verdict: 'correct', score: 100, feedback: 'Correct.' },
  ])('locks text and accessible-keyboard mutation for graded state %#', state => {
    const { MathView } = loadMathView({ fromSource: true });
    const tree = MathView({
      generatedContent: artifact(),
      studentResponses: { r: { p: 'My answer is four.' } },
      mathCheckResults: { r: { p: state } },
      handleStudentInput: vi.fn(),
    });
    const textarea = findNode(tree, node => node.type === 'textarea' && String(node.props?.id || '').startsWith('math-response-'));
    const launcher = findNode(tree, node => node.props?.['data-math-input-launch'] === 'math-work');
    expect(textarea.props.disabled).toBe(true);
    expect(launcher.props.disabled).toBe(true);
    expect(launcher.props.onClick).toBeUndefined();
  });

  it('clears only stale restored request flags when helpers explicitly report no live request', () => {
    const isMathCheckRequestActive = vi.fn(() => false);
    const isMathHintRequestActive = vi.fn(() => false);
    const { MathView } = loadMathView({
      fromSource: true,
      mathHelpers: { isMathCheckRequestActive, isMathHintRequestActive },
    });
    const tree = MathView({
      generatedContent: artifact(),
      studentResponses: { r: { p: '4' } },
      mathCheckResults: { r: { p: { checking: true, checked: false } } },
      mathHintData: { r: { p: { loading: true, count: 0, hints: [] } } },
      handleStudentInput: vi.fn(),
      handleCheckMathWork: vi.fn(),
      handleGetMathHint: vi.fn(),
    });
    const textarea = findNode(tree, node => node.type === 'textarea' && String(node.props?.id || '').startsWith('math-response-'));
    const checkButton = findNode(tree, node => node.props?.['data-help-key'] === 'math_check_work');
    const hintButton = findNode(tree, node => node.type === 'button' && node.props?.['aria-busy'] === false && nodeText(node).includes('hint'));
    expect(textarea.props.disabled).toBe(false);
    expect(checkButton.props.disabled).toBe(false);
    expect(checkButton.props['aria-busy']).toBe(false);
    expect(hintButton.props.disabled).toBe(false);
    expect(isMathCheckRequestActive).toHaveBeenCalledWith('r', 'p');
    expect(isMathHintRequestActive).toHaveBeenCalledWith('r', 'p');
  });

  it('keeps genuine helper-confirmed grading and hint requests locked', () => {
    const { MathView } = loadMathView({
      fromSource: true,
      mathHelpers: {
        isMathCheckRequestActive: () => true,
        isMathHintRequestActive: () => true,
      },
    });
    const tree = MathView({
      generatedContent: artifact(),
      studentResponses: { r: { p: '4' } },
      mathCheckResults: { r: { p: { checking: true, checked: false } } },
      mathHintData: { r: { p: { loading: true, count: 0, hints: [] } } },
      handleStudentInput: vi.fn(),
      handleCheckMathWork: vi.fn(),
      handleGetMathHint: vi.fn(),
    });
    const textarea = findNode(tree, node => node.type === 'textarea' && String(node.props?.id || '').startsWith('math-response-'));
    const checkButton = findNode(tree, node => node.props?.['data-help-key'] === 'math_check_work');
    const hintButton = findNode(tree, node => node.type === 'button' && node.props?.['aria-busy'] === true && nodeText(node).includes('Thinking'));
    expect(textarea.props.disabled).toBe(true);
    expect(checkButton.props.disabled).toBe(true);
    expect(checkButton.props['aria-busy']).toBe(true);
    expect(hintButton.props.disabled).toBe(true);
  });

  it.each([
    ['4', false],
    ['x', false],
    ['  7  ', false],
    ['', true],
    ['   \t\n', true],
  ])('allows Check My Work for any non-empty trimmed response (%j)', (studentWork, disabled) => {
    const { MathView } = loadMathView({ fromSource: true });
    const tree = MathView({
      generatedContent: artifact(),
      studentResponses: { r: { p: studentWork } },
      handleStudentInput: vi.fn(),
      handleCheckMathWork: vi.fn(),
    });
    const checkButton = findNode(tree, node => node.props?.['data-help-key'] === 'math_check_work');
    expect(checkButton.props.disabled).toBe(disabled);
  });

  it.each([
    { label: 'unknown', tool: 'unknown-tool' },
    { label: 'reserved name', tool: '__proto__' },
    { label: 'overlong', tool: 'x'.repeat(5000) },
  ])(
    'contains an invalid manipulative response without exposing lab actions ($label)',
    ({ tool }) => {
      const { MathView } = loadMathView({ fromSource: true });
      const setStemLabTool = vi.fn();
      const setShowStemLab = vi.fn();
      const setLabToolData = vi.fn();
      const tree = MathView({
        generatedContent: artifact({
          problems: [{
            id: 'p',
            question: 'Use the manipulative.',
            answer: '',
            steps: [],
            manipulativeResponse: { tool, state: { unsafe: true } },
          }],
        }),
        isTeacherMode: true,
        isIndependentMode: true,
        handleStudentInput: vi.fn(),
        setStemLabTool,
        setStemLabTab: vi.fn(),
        setShowStemLab,
        setLabToolData,
      });
      const diagnostic = findNode(tree, node => node.props?.['data-math-manipulative-error'] === 'invalid-tool');
      expect(diagnostic.props.role).toBe('alert');
      expect(nodeText(diagnostic)).toContain('tool type is invalid');
      expect(findNode(tree, node => node.type === 'button' && nodeText(node).trim().startsWith('Open '))).toBeUndefined();
      expect(findNode(tree, node => node.type === 'button' && nodeText(node).trim() === 'Check My Manipulative')).toBeUndefined();
      expect(setStemLabTool).not.toHaveBeenCalled();
      expect(setShowStemLab).not.toHaveBeenCalled();
      expect(setLabToolData).not.toHaveBeenCalled();
    },
  );

  it('contains throwing and revoked restored problem records without losing valid siblings', () => {
    const throwingProblem = { id: 'throwing' };
    Object.defineProperty(throwingProblem, 'question', {
      enumerable: true,
      get() { throw new Error('restored getter failed'); },
    });
    const revoked = Proxy.revocable({ id: 'revoked', question: 'Never read me' }, {});
    revoked.revoke();
    const { MathView } = loadMathView({ fromSource: true });
    let tree;
    expect(() => {
      tree = MathView({
        generatedContent: artifact({
          problems: [throwingProblem, revoked.proxy, { id: 'safe', question: 'Still visible?', answer: 'yes' }],
        }),
      });
    }).not.toThrow();
    const sections = findNodes(tree, node => node.type === 'section');
    expect(sections).toHaveLength(1);
    expect(sections[0].props.key).toBe('safe');
  });

  it('contains a throwing content-data getter in the recoverable empty state', () => {
    const restored = { type: 'math' };
    Object.defineProperty(restored, 'data', {
      enumerable: true,
      get() { throw new Error('data is unavailable'); },
    });
    const { MathView } = loadMathView({ fromSource: true });
    let tree;
    expect(() => { tree = MathView({ generatedContent: restored }); }).not.toThrow();
    expect(['alert', 'status']).toContain(tree.props.role);
  });

  it('does not let restored prototype keys synthesize a math artifact', () => {
    const restored = JSON.parse(
      '{"__proto__":{"type":"math","data":{"problems":[{"question":"Injected?"}]}}}'
    );
    const { MathView } = loadMathView({ fromSource: true });
    let tree;
    expect(() => { tree = MathView({ generatedContent: restored }); }).not.toThrow();
    expect(tree.props.role).toBe('status');
    expect(findNodes(tree, node => node.type === 'section')).toHaveLength(0);
  });

  it('drops a pending keyboard result if the response becomes locked', async () => {
    let resolvePrompt;
    const promptEquation = vi.fn(() => new Promise(resolve => {
      resolvePrompt = resolve;
    }));
    const { document, MathView } = loadMathView({ promptEquation, fromSource: true });
    const handleStudentInput = vi.fn();
    const tree = MathView({
      generatedContent: artifact(),
      studentResponses: { r: { p: 'My current work.' } },
      handleStudentInput,
    });
    const launcher = findNode(tree, node => node.props?.['data-math-input-launch'] === 'math-work');
    expect(launcher.props.disabled).toBe(false);
    launcher.props.onClick();
    await Promise.resolve();
    expect(promptEquation).toHaveBeenCalled();
    document.getElementById.mockReturnValue({ disabled: true });
    resolvePrompt({ latex: 'x+1' });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(handleStudentInput).not.toHaveBeenCalled();
  });

  it('drops a pending keyboard result after the resource or input value changes', async () => {
    let resolvePrompt;
    const promptEquation = vi.fn(() => new Promise(resolve => {
      resolvePrompt = resolve;
    }));
    const { document, MathView } = loadMathView({ promptEquation, fromSource: true });
    document.getElementById.mockReturnValue({ disabled: false });
    const handleStudentInput = vi.fn();
    const props = {
      generatedContent: artifact(),
      studentResponses: { r: { p: 'Original work.' } },
      handleStudentInput,
    };
    const tree = MathView(props);
    findNode(tree, node => node.props?.['data-math-input-launch'] === 'math-work').props.onClick();
    await Promise.resolve();
    MathView({
      ...props,
      generatedContent: { ...artifact(), id: 'replacement' },
      studentResponses: { replacement: { p: 'Different work.' } },
    });
    resolvePrompt({ latex: 'x+1' });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(handleStudentInput).not.toHaveBeenCalled();
  });

  it('invalidates a pending keyboard result across a locked then unlocked ABA transition', async () => {
    let resolvePrompt;
    const promptEquation = vi.fn(() => new Promise(resolve => {
      resolvePrompt = resolve;
    }));
    const { document, MathView } = loadMathView({ promptEquation, fromSource: true });
    document.getElementById.mockReturnValue({ disabled: false });
    const generatedContent = artifact();
    const handleStudentInput = vi.fn();
    const props = {
      generatedContent,
      studentResponses: { r: { p: 'Same work.' } },
      handleStudentInput,
    };
    const tree = MathView(props);
    findNode(tree, node => node.props?.['data-math-input-launch'] === 'math-work').props.onClick();
    await Promise.resolve();

    MathView({
      ...props,
      mathCheckResults: { r: { p: { checking: false, checked: true, verdict: 'correct', score: 100 } } },
    });
    MathView({ ...props, mathCheckResults: {} });
    resolvePrompt({ latex: 'x+1' });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(handleStudentInput).not.toHaveBeenCalled();
  });

  it('requires the matching manipulative session and honors structured invalid-target diagnostics', () => {
    const evaluateManipulativeResponse = vi.fn(() => ({
      correct: false,
      supported: true,
      reason: 'invalid-actual',
      tool: 'coordinate',
    }));
    const evaluateMathViewManipulativeResponse = vi.fn(() => ({
      correct: false,
      supported: true,
      reason: 'invalid-target',
      tool: 'coordinate',
    }));
    const { MathView } = loadMathView({
      fromSource: true,
      manipulativeGrader: {
        evaluateManipulativeResponse,
        evaluateMathViewManipulativeResponse,
        supportedTools: ['coordinate'],
      },
    });
    const handleStudentInput = vi.fn();
    const addToast = vi.fn();
    const setGridPoints = vi.fn();
    const tree = MathView({
      generatedContent: artifact({
        problems: [{
          id: 'p',
          question: 'Plot the point.',
          answer: '',
          steps: [],
          manipulativeResponse: { tool: 'coordinate', state: { points: [{ x: 2, y: 3 }] } },
        }],
      }),
      isTeacherMode: true,
      isIndependentMode: true,
      handleStudentInput,
      addToast,
      setStemLabTool: vi.fn(),
      setStemLabTab: vi.fn(),
      setShowStemLab: vi.fn(),
      setGridPoints,
      gridPoints: [{ x: 9, y: 9 }],
    });
    const openButton = findNode(tree, node => node.type === 'button' && nodeText(node).trim() === 'Open coordinate');
    const checkButton = findNode(tree, node => node.type === 'button' && nodeText(node).trim() === 'Check My Manipulative');
    checkButton.props.onClick();
    expect(evaluateMathViewManipulativeResponse).not.toHaveBeenCalled();
    openButton.props.onClick();
    expect(setGridPoints).toHaveBeenCalledWith([]);
    checkButton.props.onClick();
    expect(evaluateMathViewManipulativeResponse).toHaveBeenCalledTimes(1);
    expect(evaluateManipulativeResponse).toHaveBeenCalledWith(
      'coordinate',
      undefined,
      expect.objectContaining({ points: expect.any(Array) }),
    );
    expect(handleStudentInput).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenLastCalledWith(expect.stringContaining('invalid manipulative target'), 'error');
  });

  it('uses the shared manipulative response panel for student-link learners', () => {
    const evaluateManipulativeResponse = vi.fn(() => ({
      correct: false,
      supported: true,
      reason: 'invalid-actual',
      tool: 'coordinate',
    }));
    const evaluateMathViewManipulativeResponse = vi.fn(() => ({
      correct: true,
      supported: true,
      reason: 'match',
      tool: 'coordinate',
    }));
    const { MathView } = loadMathView({
      fromSource: true,
      manipulativeGrader: {
        evaluateManipulativeResponse,
        evaluateMathViewManipulativeResponse,
        supportedTools: ['coordinate'],
      },
    });
    const handleStudentInput = vi.fn();
    const handleCheckMathWork = vi.fn();
    const setGridPoints = vi.fn();
    const tree = MathView({
      generatedContent: artifact({
        problems: [{
          id: 'p',
          question: 'Plot the point.',
          answer: '',
          steps: [],
          manipulativeResponse: { tool: 'coordinate', state: { points: [{ x: 2, y: 3 }] } },
        }],
      }),
      isTeacherMode: false,
      handleStudentInput,
      handleCheckMathWork,
      setStemLabTool: vi.fn(),
      setStemLabTab: vi.fn(),
      setShowStemLab: vi.fn(),
      setGridPoints,
      gridPoints: [{ x: 2, y: 3 }],
    });
    const panel = findNode(tree, node => node.props?.['data-math-manipulative-response'] === 'coordinate');
    const openButton = findNode(panel, node => node.type === 'button' && nodeText(node).trim() === 'Open coordinate');
    const checkButton = findNode(panel, node => node.type === 'button' && nodeText(node).trim() === 'Check My Manipulative');
    expect(panel).toBeTruthy();
    expect(openButton).toBeTruthy();
    expect(checkButton).toBeTruthy();
    expect(findNode(tree, node => node.type === 'textarea' && String(node.props?.id || '').startsWith('math-response-'))).toBeUndefined();
    expect(findNode(tree, node => node.props?.['data-help-key'] === 'math_check_work')).toBeUndefined();
    openButton.props.onClick();
    expect(setGridPoints).toHaveBeenCalledWith([]);
    checkButton.props.onClick();
    expect(evaluateMathViewManipulativeResponse).toHaveBeenCalledTimes(1);
    expect(handleStudentInput).toHaveBeenCalledWith('r', 'p', '(Manipulative: CORRECT ✅)');
    expect(handleCheckMathWork).not.toHaveBeenCalled();
  });

  it('falls back to accessible learner work entry for an invalid manipulative target', () => {
    const evaluateManipulativeResponse = vi.fn(() => ({
      correct: false,
      supported: true,
      reason: 'invalid-target',
      tool: 'coordinate',
    }));
    const evaluateMathViewManipulativeResponse = vi.fn();
    const { MathView } = loadMathView({
      fromSource: true,
      manipulativeGrader: {
        evaluateManipulativeResponse,
        evaluateMathViewManipulativeResponse,
        supportedTools: ['coordinate'],
      },
    });
    const tree = MathView({
      generatedContent: artifact({
        problems: [{
          id: 'p',
          question: 'Plot the point.',
          answer: '',
          steps: [],
          manipulativeResponse: { tool: 'coordinate', state: {} },
        }],
      }),
      studentResponses: { r: { p: 'I plotted the point another way.' } },
      handleStudentInput: vi.fn(),
      handleCheckMathWork: vi.fn(),
    });

    const diagnostic = findNode(tree, node => node.props?.['data-math-manipulative-error'] === 'invalid-target');
    expect(diagnostic.props.role).toBe('alert');
    expect(nodeText(diagnostic)).toContain('invalid manipulative target');
    expect(nodeText(diagnostic)).toContain('Type your work instead');
    expect(findNode(tree, node => node.props?.['data-math-manipulative-response'])).toBeUndefined();
    expect(findNode(tree, node => node.type === 'textarea' && String(node.props?.id || '').startsWith('math-response-'))).toBeTruthy();
    expect(findNode(tree, node => node.props?.['data-math-input-launch'] === 'math-work')).toBeTruthy();
    expect(findNode(tree, node => node.props?.['data-help-key'] === 'math_check_work')).toBeTruthy();
    expect(evaluateMathViewManipulativeResponse).not.toHaveBeenCalled();
  });

  it('falls back to accessible teacher-independent work entry when the grader is unavailable', () => {
    const { MathView } = loadMathView({ fromSource: true });
    const tree = MathView({
      generatedContent: artifact({
        problems: [{
          id: 'p',
          question: 'Plot the point.',
          answer: '',
          steps: [],
          manipulativeResponse: { tool: 'coordinate', state: { points: [{ x: 2, y: 3 }] } },
        }],
      }),
      isTeacherMode: true,
      isIndependentMode: true,
      handleStudentInput: vi.fn(),
    });

    const diagnostic = findNode(tree, node => node.props?.['data-math-manipulative-error'] === 'checker-unavailable');
    expect(diagnostic.props.role).toBe('alert');
    expect(nodeText(diagnostic)).toContain('checker is unavailable');
    expect(findNode(tree, node => node.props?.['data-math-manipulative-response'])).toBeUndefined();
    expect(findNode(tree, node => node.type === 'textarea' && node.props?.['data-help-key'] === 'math_student_work')).toBeTruthy();
    expect(findNode(tree, node => node.props?.['data-math-input-launch'] === 'math-work')).toBeTruthy();
  });

  it.each([
    { isTeacherMode: false, isIndependentMode: false },
    { isTeacherMode: true, isIndependentMode: true },
  ])('falls back to typed work when the manipulative lab cannot open %#', mode => {
    const { MathView } = loadMathView({
      fromSource: true,
      manipulativeGrader: {
        supportedTools: ['coordinate'],
        evaluateManipulativeResponse: () => ({
          correct: false,
          supported: true,
          reason: 'invalid-actual',
          tool: 'coordinate',
        }),
        evaluateMathViewManipulativeResponse: vi.fn(),
      },
    });
    const tree = MathView({
      generatedContent: artifact({
        problems: [{
          id: 'p',
          question: 'Plot the point.',
          answer: '',
          steps: [],
          manipulativeResponse: { tool: 'coordinate', state: { points: [{ x: 2, y: 3 }] } },
        }],
      }),
      ...mode,
      handleStudentInput: vi.fn(),
      handleCheckMathWork: vi.fn(),
    });

    const diagnostic = findNode(tree, node => node.props?.['data-math-manipulative-error'] === 'lab-unavailable');
    expect(diagnostic.props.role).toBe('alert');
    expect(nodeText(diagnostic)).toContain('lab is unavailable');
    expect(findNode(tree, node => node.props?.['data-math-manipulative-response'])).toBeUndefined();
    expect(findNode(tree, node => node.type === 'textarea')).toBeTruthy();
    expect(findNode(tree, node => node.props?.['data-math-input-launch'] === 'math-work')).toBeTruthy();
  });

  it.each([
    ['coordinate', { points: [{ x: 2, y: 3 }] }],
    ['base10', { ones: 2 }],
    ['numberline', { markers: [{ value: 2 }] }],
    ['fractions', { numerator: 1, denominator: 4 }],
    ['volume', { dims: { l: 2, w: 3, h: 4 } }],
    ['protractor', { angle: 45 }],
    ['wave', { amplitude: 2, frequency: 3 }],
  ])('keeps typed work available when %s lab state cannot be initialized', (tool, state) => {
    const { MathView } = loadMathView({
      fromSource: true,
      manipulativeGrader: {
        supportedTools: [tool],
        evaluateManipulativeResponse: () => ({
          correct: false,
          supported: true,
          reason: 'invalid-actual',
          tool,
        }),
        evaluateMathViewManipulativeResponse: vi.fn(),
      },
    });
    const tree = MathView({
      generatedContent: artifact({
        problems: [{
          id: 'p',
          question: 'Complete the manipulative.',
          answer: '',
          steps: [],
          manipulativeResponse: { tool, state },
        }],
      }),
      handleStudentInput: vi.fn(),
      handleCheckMathWork: vi.fn(),
      setStemLabTool: vi.fn(),
      setStemLabTab: vi.fn(),
      setShowStemLab: vi.fn(),
    });

    const diagnostic = findNode(tree, node => node.props?.['data-math-manipulative-error'] === 'lab-unavailable');
    expect(diagnostic.props.role).toBe('alert');
    expect(findNode(tree, node => node.props?.['data-math-manipulative-response'])).toBeUndefined();
    expect(findNode(tree, node => node.type === 'textarea')).toBeTruthy();
    expect(findNode(tree, node => node.props?.['data-math-input-launch'] === 'math-work')).toBeTruthy();
  });

  it('hydrates complete number-line and cell visual-support targets', () => {
    const { MathView } = loadMathView();
    const commonProps = {
      isTeacherMode: true,
      isIndependentMode: true,
      setStemLabTool: vi.fn(),
      setStemLabTab: vi.fn(),
      setShowStemLab: vi.fn(),
    };
    const setNumberLineMarkers = vi.fn();
    const setNumberLineRange = vi.fn();
    let tree = MathView({
      ...commonProps,
      generatedContent: artifact({
        problems: [{
          id: 'p',
          question: 'Read the number line.',
          answer: '2',
          steps: [],
          manipulativeSupport: {
            tool: 'numberline',
            state: { markers: [{ value: 2, label: 'A' }], range: { min: -5, max: 5 } },
          },
        }],
      }),
      setNumberLineMarkers,
      setNumberLineRange,
    });
    findNode(tree, node => node.type === 'button' && nodeText(node).includes('Open Visual Support')).props.onClick();
    expect(setNumberLineMarkers).toHaveBeenCalledWith([{ value: 2, label: 'A' }]);
    expect(setNumberLineRange).toHaveBeenCalledWith({ min: -5, max: 5 });

    const setLabToolData = vi.fn();
    tree = MathView({
      ...commonProps,
      generatedContent: artifact({
        problems: [{
          id: 'p',
          question: 'Identify the organelle.',
          answer: 'nucleus',
          steps: [],
          manipulativeSupport: {
            tool: 'cell',
            state: { type: 'animal', selectedOrganelle: 'nucleus' },
          },
        }],
      }),
      setLabToolData,
    });
    findNode(tree, node => node.type === 'button' && nodeText(node).includes('Open Visual Support')).props.onClick();
    const update = setLabToolData.mock.calls[0][0];
    expect(update({ keep: true })).toEqual({
      keep: true,
      cell: {
        type: 'animal',
        selectedOrganelle: 'nucleus',
        mode: 'interior',
        interiorCellType: 'animal',
        interiorSel: 'nucleus',
      },
    });
  });

  it('bounds support hydration and opens a grader-approved fraction response at its declared limit', () => {
    const { MathView } = loadMathView({
      manipulativeGrader: {
        limits: { maxFractionDenominator: 12 },
        supportedTools: ['fractions'],
        evaluateManipulativeResponse: () => ({
          correct: false,
          supported: true,
          reason: 'invalid-actual',
          tool: 'fractions',
        }),
        evaluateMathViewManipulativeResponse: vi.fn(),
      },
      fromSource: true,
    });
    const commonProps = {
      isTeacherMode: true,
      isIndependentMode: true,
      setStemLabTool: vi.fn(),
      setStemLabTab: vi.fn(),
      setShowStemLab: vi.fn(),
    };
    const setFractionPieces = vi.fn();
    let tree = MathView({
      ...commonProps,
      generatedContent: artifact({
        problems: [{
          id: 'p', question: 'Read the fraction.', answer: '1', steps: [],
          manipulativeSupport: { tool: 'fractions', state: { numerator: 999, denominator: 999 } },
        }],
      }),
      setFractionPieces,
    });
    findNode(tree, node => node.type === 'button' && nodeText(node).includes('Open Visual Support')).props.onClick();
    expect(setFractionPieces).toHaveBeenLastCalledWith({ numerator: 12, denominator: 12 });

    tree = MathView({
      ...commonProps,
      generatedContent: artifact({
        problems: [{
          id: 'p', question: 'Build the fraction.', answer: '', steps: [],
          manipulativeResponse: { tool: 'fractions', state: { numerator: 1, denominator: 12 } },
        }],
      }),
      setFractionPieces,
      handleStudentInput: vi.fn(),
    });
    findNode(tree, node => node.type === 'button' && nodeText(node).trim() === 'Open fractions').props.onClick();
    expect(setFractionPieces).toHaveBeenLastCalledWith({ numerator: 0, denominator: 12 });
  });

  it.each([
    {
      support: { tool: 'fractions', state: { numerator: 1, denominator: Symbol('bad') } },
      setterName: 'setFractionPieces',
    },
    {
      support: (() => {
        const { proxy, revoke } = Proxy.revocable({ min: 0, max: 10 }, {});
        revoke();
        return { tool: 'numberline', state: { markers: [{ value: 2 }], range: proxy } };
      })(),
      setterName: 'setNumberLineMarkers',
    },
  ])('contains malformed visual-support state before setter or lab mutation %#', ({ support, setterName }) => {
    const { MathView } = loadMathView({ fromSource: true });
    const addToast = vi.fn();
    const setters = {
      setFractionPieces: vi.fn(),
      setNumberLineMarkers: vi.fn(),
    };
    const setStemLabTool = vi.fn();
    const setStemLabTab = vi.fn();
    const setShowStemLab = vi.fn();
    const tree = MathView({
      generatedContent: artifact({
        problems: [{
          id: 'p',
          question: 'Open the visual support.',
          answer: '1',
          steps: [],
          manipulativeSupport: support,
        }],
      }),
      isTeacherMode: true,
      isIndependentMode: true,
      addToast,
      setStemLabTool,
      setStemLabTab,
      setShowStemLab,
      ...setters,
    });
    const open = findNode(tree, node => node.type === 'button' && nodeText(node).includes('Open Visual Support'));

    expect(() => open.props.onClick()).not.toThrow();
    expect(setters[setterName]).not.toHaveBeenCalled();
    expect(setStemLabTool).not.toHaveBeenCalled();
    expect(setStemLabTab).not.toHaveBeenCalled();
    expect(setShowStemLab).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('invalid data'), 'error');
  });

  it('does not open visual support when its tool state cannot be initialized', () => {
    const { MathView } = loadMathView({ fromSource: true });
    const addToast = vi.fn();
    const setStemLabTool = vi.fn();
    const setStemLabTab = vi.fn();
    const setShowStemLab = vi.fn();
    const tree = MathView({
      generatedContent: artifact({
        problems: [{
          id: 'p',
          question: 'Open the visual support.',
          answer: '1',
          steps: [],
          manipulativeSupport: { tool: 'coordinate', state: { points: [{ x: 2, y: 3 }] } },
        }],
      }),
      isTeacherMode: true,
      isIndependentMode: true,
      addToast,
      setStemLabTool,
      setStemLabTab,
      setShowStemLab,
    });
    const open = findNode(tree, node => node.type === 'button' && nodeText(node).includes('Open Visual Support'));

    expect(() => open.props.onClick()).not.toThrow();
    expect(setStemLabTool).not.toHaveBeenCalled();
    expect(setStemLabTab).not.toHaveBeenCalled();
    expect(setShowStemLab).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('state controls are unavailable'), 'error');
  });

  it('renders an INCORRECT manipulative verdict in red', () => {
    const { MathView } = loadMathView({
      manipulativeGrader: {
        supportedTools: ['coordinate'],
        evaluateManipulativeResponse: vi.fn(() => ({
          correct: false,
          supported: true,
          reason: 'invalid-actual',
          tool: 'coordinate',
        })),
        evaluateMathViewManipulativeResponse: vi.fn(),
      },
    });
    const tree = MathView({
      generatedContent: artifact({
        problems: [{
          id: 'p',
          question: 'Plot the point.',
          answer: '',
          steps: [],
          manipulativeResponse: { tool: 'coordinate', state: { points: [{ x: 2, y: 3 }] } },
        }],
      }),
      setStemLabTool: vi.fn(),
      setStemLabTab: vi.fn(),
      setShowStemLab: vi.fn(),
      setGridPoints: vi.fn(),
      isTeacherMode: true,
      isIndependentMode: true,
      studentResponses: { r: { p: '(Manipulative: INCORRECT ❌)' } },
      handleStudentInput: vi.fn(),
    });
    const status = findNode(tree, node => node.props?.role === 'status' && nodeText(node).includes('INCORRECT'));
    expect(status.props.className).toContain('text-red-600');
    expect(status.props.className).not.toContain('text-green-600');
  });

  it('shows only XP earned by the current attempt', () => {
    const { MathView } = loadMathView();
    const render = xpEarned => MathView({
      generatedContent: artifact(),
      studentResponses: { r: { p: 'My answer is four.' } },
      mathCheckResults: {
        r: { p: { checked: true, verdict: 'correct', score: 100, feedback: 'Correct.', xpAwarded: true, xpEarned } },
      },
      handleStudentInput: vi.fn(),
      handleResetMathCheck: vi.fn(),
    });
    expect(nodeText(render(0))).not.toMatch(/\+\d+ XP/);
    expect(nodeText(render(7))).toContain('+7 XP');
  });

  it('prefers nested hints, repairs counts, and announces loading', () => {
    const { MathView } = loadMathView();
    const tree = MathView({
      generatedContent: artifact(),
      studentResponses: { r: { p: 'My answer is four.' } },
      mathHintData: {
        r: { p: { hints: ['First', 'Second'], count: 0, loading: true } },
        r_p: { hints: ['Legacy should not win'], count: 1, loading: false },
      },
      handleStudentInput: vi.fn(),
      handleGetMathHint: vi.fn(),
    });
    expect(nodeText(tree)).toContain('Preparing a hint for problem 1.');
    expect(nodeText(tree)).toContain('First');
    expect(nodeText(tree)).toContain('Second');
    expect(nodeText(tree)).not.toContain('Legacy should not win');
    const hintButton = findNode(tree, node => node.props?.['aria-busy'] === true && node.type === 'button');
    expect(hintButton.props.disabled).toBe(true);
  });

  it('still reads a legacy flat hint entry when no nested entry exists', () => {
    const { MathView } = loadMathView();
    const tree = MathView({
      generatedContent: artifact(),
      studentResponses: { r: { p: 'My answer is four.' } },
      mathHintData: { r_p: { hints: ['Legacy hint'], count: 1, loading: false } },
      handleStudentInput: vi.fn(),
      handleGetMathHint: vi.fn(),
    });
    expect(nodeText(tree)).toContain('Legacy hint');
  });

  it('disables optional actions instead of throwing', () => {
    const { MathView } = loadMathView();
    let tree;
    expect(() => {
      tree = MathView({ generatedContent: artifact(), isTeacherMode: true, isIndependentMode: true });
    }).not.toThrow();
    const buttons = findNodes(tree, node => node.type === 'button');
    expect(buttons.length).toBeGreaterThan(3);
    expect(buttons.every(button => button.props.disabled === true)).toBe(true);
  });

  it('Ctrl/Command+Enter finishes editing and restores focus', () => {
    const focus = vi.fn();
    const toggleMathEdit = vi.fn();
    const { document, MathView } = loadMathView();
    document.getElementById.mockReturnValue({ focus });
    const tree = MathView({
      generatedContent: artifact(),
      isTeacherMode: true,
      isMathEditing: () => true,
      toggleMathEdit,
      handleMathProblemEdit: vi.fn(),
    });
    const editor = findNode(tree, node => node.type === 'textarea' && typeof node.props?.onKeyDown === 'function');
    const preventDefault = vi.fn();
    editor.props.onKeyDown({ key: 'Enter', ctrlKey: true, metaKey: false, preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(toggleMathEdit).toHaveBeenCalledWith(0, 'p', 'r');
    expect(focus).toHaveBeenCalled();
  });
});

describe('MathView second-pass source contracts', () => {
  const source = fs.readFileSync('view_math_source.jsx', 'utf8');

  it('keeps mobile, status, and response-lock safeguards in source', () => {
    expect(source).toContain('min-h-[44px]');
    expect(source).toContain('overflow-x-auto svg-container');
    expect(source).toContain('aria-live="polite" aria-atomic="true"');
    expect(source).toContain('!canHandleStudentInput || isMathResponseLocked(problem.__viewKey)');
  });

  it('keeps async editor and manipulative state scoped to one MathView instance', () => {
    expect(source).toContain('var accessibleInputRegistryRef = React.useRef(');
    expect(source).toContain('var nextAccessibleInputRegistry = { resourceId: null, artifact: null, contexts: new Map() }');
    expect(source).toContain('React.useLayoutEffect(() => {');
    expect(source).toContain('accessibleInputRegistryRef.current = nextAccessibleInputRegistry');
    expect(source).not.toContain('accessibleInputRegistryRef.current = { resourceId: mathResourceId');
    expect(source).toContain('var activeManipulativeSessionRef = React.useRef(null)');
    expect(source).toContain('accessibleInputPendingRef.current.clear()');
    expect(source).not.toContain('var _mathAccessibleInputRegistry');
    expect(source).not.toContain('var _mathActiveManipulativeSession');
    expect(source).toContain("contextKey: mathAccessibleContextKey('student-work', problem.__viewKey)");
  });

  it('uses structured manipulative diagnostics, neutral hydration, and exact verdict styling', () => {
    expect(source).toContain('evaluateMathViewManipulativeResponse(response, currentManipulativeSnapshot())');
    expect(source).toContain("result.reason === 'invalid-actual'");
    expect(source).toContain('setGridPoints([])');
    expect(source).toContain('setNumberLineMarkers([])');
    expect(source).toContain('setNumberLineMarkers(supportMarkers)');
    expect(source).toContain("} else if (tool === 'protractor') {");
    expect(source).toContain("if (tool === 'circuit') next._circuit = seeded");
    expect(source).toContain('delete next[tool]');
    expect(source).toContain("startsWith('(Manipulative: CORRECT')");
    expect(source).not.toContain("includes('CORRECT')");
  });

  it('shares strict manipulative validation and omits stripped graph markup', () => {
    expect(source).toContain('function _mathIsSupportedManipulativeTool(tool)');
    expect(source).toContain('if (!_mathIsSupportedManipulativeTool(tool))');
    expect(source).toContain('function _mathManipulativeResponseAvailability(response)');
    expect(source).toContain("targetCheck.reason === 'invalid-actual'");
    expect(source).toContain('data-math-manipulative-error={getMathManipulativeResponseAvailability(problem).reason}');
    expect(source).toContain("reason: 'lab-unavailable'");
    expect(source).toContain('canPrepareMathManipulativeTool(problem.manipulativeResponse.tool)');
    expect(source).toContain('if (!canPrepareMathManipulativeTool(tool))');
    expect(source).toContain("typeof window !== 'undefined' && window.AlloModules");
    expect(source).toContain('{graphHtml && (');
    expect(source).not.toContain("{typeof generatedContent.data.graphData === 'string' && generatedContent.data.graphData && (");
  });

  it('reuses the manipulative panel for teacher and student paths and consults live-request APIs', () => {
    expect(source).toContain('var renderMathManipulativeResponse = problem =>');
    expect(source.match(/renderMathManipulativeResponse\(problem\)/g)).toHaveLength(2);
    expect(source).toContain('helpers.isMathCheckRequestActive');
    expect(source).toContain('helpers.isMathHintRequestActive');
    expect(source).toContain("_mathRequestActivity('check', mathResourceId, problemKey) === false");
    expect(source).toContain("_mathRequestActivity('hint', mathResourceId, problemKey) === false");
  });

  it('threads the canonical resource ID through editing contracts', () => {
    expect(source).toContain('var suppliedMathResourceId = _mathScalarText(props.mathResourceId).trim().slice(0, 1000)');
    expect(source).toContain('var mathResourceId = suppliedMathResourceId || (');
    expect(source).toContain('toggleMathEdit(pIdx, problem.__viewKey, mathResourceId)');
    expect(source).toContain('isMathEditing(pIdx, problem.__viewKey, mathResourceId)');
    expect(source).toContain('handleMathEdit(mathEditInput, mathResourceId)');
  });
});
