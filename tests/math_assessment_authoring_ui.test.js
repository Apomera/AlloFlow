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

const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const teacherProps = (extra = {}) => ({
  generatedContent: artifact({ problems: [{ id: 'p', question: 'Compute 1/2 + 1/3.', answer: '5/6', steps: [{ explanation: 'Use a common denominator.', latex: '3/6+2/6' }] }] }),
  isTeacherMode: true,
  showMathAnswers: true,
  isMathEditing: () => true,
  handleMathProblemEdit: vi.fn(),
  ...extra,
});
const keyboard = (tree, label) => findNode(tree, node => node.props?.['aria-label'] === label);

describe.each([false, true])('assessment authoring keyboard (source=%s)', fromSource => {
  it.each([
    ['answer key 1', 'answer', null, '5/6', '\\frac{5}{6}'],
    ['expression 1 of problem 1', 'step_latex', 0, '3/6+2/6', '\\sqrt{9}'],
    ['explanation 1 of problem 1', 'step_explanation', 0, '', 'Use a common denominator. \\(x^{2}\\)'],
  ])('writes the exact selected %s field through the existing host editor', async (label, field, step, initialLatex, expected) => {
    const inserted = field === 'step_explanation' ? 'x^{2}' : expected;
    const promptEquation = vi.fn(async () => ({ latex: inserted }));
    const { MathView } = loadMathView({ fromSource, promptEquation });
    const props = teacherProps();
    const tree = MathView(props);
    keyboard(tree, 'Open accessible math keyboard for ' + label).props.onClick();
    await flush();
    expect(promptEquation).toHaveBeenCalledWith(expect.objectContaining({ initialLatex }));
    expect(props.handleMathProblemEdit).toHaveBeenCalledExactlyOnceWith(0, field, expected, step, 'p', 'r');
  });

  it.each(['resource', 'hidden', 'step-change', 'read-only', 'edit-end'])('rejects a delayed result after %s', async change => {
    let resolvePrompt;
    const promptEquation = vi.fn(() => new Promise(resolve => { resolvePrompt = resolve; }));
    const { MathView } = loadMathView({ fromSource, promptEquation });
    const props = teacherProps();
    const tree = MathView(props);
    keyboard(tree, 'Open accessible math keyboard for expression 1 of problem 1').props.onClick();
    await flush();
    const next = { ...props };
    if (change === 'resource') next.generatedContent = { ...props.generatedContent, id: 'other' };
    if (change === 'hidden') next.showMathAnswers = false;
    if (change === 'read-only') next.isTeacherMode = false;
    if (change === 'edit-end') next.isMathEditing = () => false;
    if (change === 'step-change') props.generatedContent.data.problems[0].steps[0].explanation = 'Different step';
    MathView(next);
    resolvePrompt({ latex: 'x^2' });
    await flush();
    expect(props.handleMathProblemEdit).not.toHaveBeenCalled();
  });

  it('uses only the latest repeated keyboard result and cancels hidden-to-shown transitions', async () => {
    const resolvers = [];
    const { MathView } = loadMathView({ fromSource, promptEquation: () => new Promise(resolve => resolvers.push(resolve)) });
    const props = teacherProps();
    const button = keyboard(MathView(props), 'Open accessible math keyboard for answer key 1');
    button.props.onClick(); button.props.onClick();
    await flush();
    resolvers[0]({ latex: 'old' });
    await flush();
    expect(props.handleMathProblemEdit).not.toHaveBeenCalled();
    resolvers[1]({ latex: '5/6' });
    await flush();
    expect(props.handleMathProblemEdit).toHaveBeenCalledExactlyOnceWith(0, 'answer', '5/6', null, 'p', 'r');
    props.handleMathProblemEdit.mockClear();
    button.props.onClick(); await flush();
    MathView({ ...props, showMathAnswers: false });
    MathView(props);
    resolvers[2]({ latex: 'stale' }); await flush();
    expect(props.handleMathProblemEdit).not.toHaveBeenCalled();
  });

  it('renders answer and step previews while editing', () => {
    const { MathView } = loadMathView({ fromSource });
    const tree = MathView(teacherProps());
    expect(keyboard(tree, 'Answer key 1 preview')).toBeTruthy();
    expect(keyboard(tree, 'Expression 1 preview for problem 1')).toBeTruthy();
    expect(keyboard(tree, 'Explanation 1 preview for problem 1')).toBeTruthy();
  });

  it('explains the submission save boundary only while self-grading', () => {
    const { MathView } = loadMathView({ fromSource });
    const props = teacherProps({ isTeacherMode: false, mathSelfGradeMode: true });
    const notice = 'Your answers are saved after Submit Assessment completes. Leaving or switching assessments before submitting clears your draft answers.';
    expect(nodeText(MathView(props))).toContain(notice);
    expect(nodeText(MathView({ ...props, mathSelfGradeMode: false }))).not.toContain(notice);
    expect(nodeText(MathView({ ...props, t: (key) => key === 'math.assessment_draft_notice' ? 'Localized draft notice.' : key }))).toContain('Localized draft notice.');
  });

  it('distinguishes preparation, computed verification and teacher review', () => {
    const { MathView } = loadMathView({ fromSource });
    const props = teacherProps({ generatedContent: artifact({
      preparation: { requested: 3, ready: 3, reviewRequired: 0 },
      problems: [
        { id: 'one', question: '2+2', answer: '4', _verification: { verified: true } },
        { id: 'two', question: 'Explain a square.', answer: 'Four equal sides.', _verification: { verified: false, reviewRequired: true, reason: 'unsupported_verification' } },
        { id: 'three', question: 'Explain a root.', answer: 'Reviewed key.', _verification: { verified: false, reviewRequired: false, teacherReviewed: true } },
      ],
    }) });
    const tree = MathView(props);
    const text = nodeText(tree);
    expect(text).toContain('3 prepared');
    expect(text).toContain('1 answer calculations verified');
    expect(text).toContain('1 need teacher review');
    expect(text).toContain('Answer calculation verified');
    expect(text).toContain('Teacher reviewed (not computationally verified)');
    const acknowledge = findNode(tree, node => node.type === 'button' && nodeText(node) === 'I reviewed this question and answer');
    acknowledge.props.onClick();
    expect(props.handleMathProblemEdit).toHaveBeenCalledExactlyOnceWith(1, 'teacher_reviewed', true, null, 'two', 'r');
  });

  it.each([
    { reason: 'question_answer_conflict', isTeacherMode: true },
    { reason: 'missing_answer', isTeacherMode: true },
    { reason: 'unsupported_verification', isTeacherMode: false },
    { reason: 'unsupported_verification', isTeacherMode: true, mathSelfGradeMode: true },
  ])('never offers teacher acknowledgement for a known error or learner view %j', config => {
    const { MathView } = loadMathView({ fromSource });
    const tree = MathView(teacherProps({ ...config, generatedContent: artifact({ problems: [{ id: 'p', question: '2+2', answer: '5', _verification: { verified: false, reviewRequired: true, reason: config.reason } }] }) }));
    expect(findNode(tree, node => node.type === 'button' && nodeText(node) === 'I reviewed this question and answer')).toBeUndefined();
  });
});

