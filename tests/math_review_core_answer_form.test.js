// A student who copied "4/6" as the answer to "Simplify 4/6" got Check My
// Work's "Perfect! Your answer is exactly right", 100% and full XP, with no AI
// call. The instant pass compared values only (4/6 = 2/3), and the view sent
// the grader the raw question without its "Simplify:" directive. The same hole
// passed "0.75" for "Convert 3/4 to a percent", and self-grade scored both as
// correct. Value-equivalent answers to compute/solve tasks still pass instantly.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const HELPERS = process.env.MATH_REVIEW_HELPERS_MODULE || 'math_helpers_module.js';
const VIEW = process.env.MATH_REVIEW_VIEW_MODULE || 'view_math_module.js';

function loadHelpers() {
  const window = { AlloModules: {} };
  vm.runInNewContext(fs.readFileSync(path.resolve(HELPERS), 'utf8'), {
    window, console: { log() {}, warn() {} }, setTimeout, clearTimeout, AbortController, Promise,
  });
  return window.AlloModules.MathHelpers;
}

let sequence = 0;
function checkHarness() {
  let results = {};
  const deps = {
    mathCheckResults: {},
    mathHintData: {},
    setMathCheckResults: update => { results = typeof update === 'function' ? update(results) : update; },
    addToast: vi.fn(),
    t: () => '',
    callGemini: vi.fn(async () => JSON.stringify({ verdict: 'incorrect', score: 0, feedback: 'That is not in the requested form yet.' })),
    warnLog: vi.fn(),
    handleScoreUpdate: vi.fn(),
  };
  return { deps, results: () => results };
}

async function check(H, question, key, work) {
  const harness = checkHarness();
  const resourceId = 'answer-form-' + (sequence += 1);
  await H.handleCheckMathWork(resourceId, 'p', question, key, [], work, harness.deps);
  return { ...harness.deps, result: harness.results()[resourceId].p };
}

function loadMathView() {
  const hookSlots = [];
  let hookCursor = 0;
  const React = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useRef(initial) {
      const index = hookCursor++;
      if (!hookSlots[index]) hookSlots[index] = { current: initial };
      return hookSlots[index];
    },
    useLayoutEffect() {},
    useEffect() {},
  };
  const window = { React, AlloIcons: {}, AlloModules: {}, setTimeout: callback => callback() };
  vm.runInNewContext(fs.readFileSync(path.resolve(VIEW), 'utf8'), {
    window, React, document: { getElementById: () => null }, console: { log() {}, warn() {}, error() {} },
  });
  return props => { hookCursor = 0; return window.AlloModules.MathView(props); };
}

const walk = (node, out = []) => {
  if (Array.isArray(node)) { node.forEach(child => walk(child, out)); return out; }
  if (!node || typeof node !== 'object') return out;
  out.push(node);
  walk(node.children, out);
  return out;
};
const text = node => Array.isArray(node) ? node.map(text).join('')
  : (typeof node === 'string' || typeof node === 'number') ? String(node)
    : node && typeof node === 'object' ? text(node.children) : '';
const button = (tree, pattern) => walk(tree).find(node => node.type === 'button' && pattern.test(text(node)));

const simplifyArtifact = {
  id: 'r',
  type: 'math',
  data: { title: 'Fractions', problems: [{ id: 'p', question: '4/6', taskType: 'simplify', answer: '2/3', steps: [] }] },
};
const formatMathQuestion = problem => (problem.taskType === 'simplify' ? 'Simplify: ' : '') + problem.question;

describe('Check My Work instant pass respects the requested form', () => {
  it.each([
    ['Simplify: 4/6', '2/3', '4/6'],
    ['Simplify: 8/12', '2/3', '4/6'],
    ['Convert: 3/4 to a percent', '75%', '0.75'],
    ['Convert: 0.75 to a fraction', '3/4', '0.75'],
    ['Write 3/2 as a mixed number', '1 1/2', '3/2'],
  ])('%s with answer %s does not instantly pass %s', async (question, key, work) => {
    const H = loadHelpers();
    const { result, callGemini, handleScoreUpdate } = await check(H, question, key, work);
    expect(result.fastPath, 'a value-only match skipped the grader').toBe(false);
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(callGemini.mock.calls[0][0]).toContain('PROBLEM: ' + question);
    expect(result.verdict).toBe('incorrect');
    expect(handleScoreUpdate).not.toHaveBeenCalled();
  });

  it.each([
    ['Simplify: 4/6', '2/3', '2/3'],
    ['Simplify: 4/6', '2/3', '\\frac{2}{3}'],
    ['Simplify: 4/6', '2/3', '2 / 3'],
    ['Convert: 3/4 to a percent', '75%', '75 %'],
    ['Compute the value.', '0.5', '1/2'],
    ['Solve for x: 2x = 1', 'x = 1/2', 'x = 0.5'],
  ])('%s with answer %s still passes %s instantly', async (question, key, work) => {
    const H = loadHelpers();
    const { result, callGemini, handleScoreUpdate } = await check(H, question, key, work);
    expect(result).toMatchObject({ verdict: 'correct', score: 100, fastPath: true });
    expect(callGemini).not.toHaveBeenCalled();
    expect(handleScoreUpdate).toHaveBeenCalledOnce();
  });
});

describe('self-grade scores the requested form', () => {
  it('rejects unsimplified and unconverted answers but keeps value grading elsewhere', () => {
    const H = loadHelpers();
    const grade = H.gradeMathSelfAssessment([
      { id: 'copied', question: '4/6', taskType: 'simplify', answer: '2/3' },
      { id: 'decimal', question: '3/4 to a percent', taskType: 'convert', answer: '75%' },
      { id: 'mixed', question: 'Write 7/4 as a mixed number', taskType: 'convert', answer: '1 3/4' },
      { id: 'reduced', question: '4/6', taskType: 'simplify', answer: '2/3' },
      { id: 'compute', question: '1/2 + 1/4', taskType: 'compute', answer: '3/4' },
      { id: 'defaulted', question: 'What is 1/2 + 1/4?', taskType: 'simplify', answer: '3/4' },
    ], { copied: '4/6', decimal: '0.75', mixed: '7/4', reduced: '\\frac{2}{3}', compute: '0.75', defaulted: '0.75' });
    const correct = Object.fromEntries(grade.results.map(result => [result.problemId, result.correct]));
    expect(correct).toEqual({ copied: false, decimal: false, mixed: false, reduced: true, compute: true, defaulted: true });
    expect(grade.score).toBe(3);
  });
});

describe('the view sends graders the question as displayed', () => {
  it('passes the directive to Check My Work and hints', () => {
    const MathView = loadMathView();
    const handleCheckMathWork = vi.fn();
    const handleGetMathHint = vi.fn();
    const tree = MathView({
      generatedContent: simplifyArtifact, t: () => '', formatMathQuestion,
      studentResponses: { r: { p: '4/6' } }, handleStudentInput: vi.fn(), handleCheckMathWork, handleGetMathHint,
    });
    button(tree, /Check My Work/).props.onClick();
    button(tree, /hint/i).props.onClick();
    expect(handleCheckMathWork).toHaveBeenCalledWith('r', 'p', 'Simplify: 4/6', '2/3', [], '4/6');
    expect(handleGetMathHint).toHaveBeenCalledWith('r', 'p', 'Simplify: 4/6', '2/3', []);
  });

  it('a copied answer clicked through the real view and helper is not marked exactly right', async () => {
    const H = loadHelpers();
    const MathView = loadMathView();
    const harness = checkHarness();
    let pending;
    const tree = MathView({
      generatedContent: simplifyArtifact, t: () => '', formatMathQuestion,
      studentResponses: { r: { p: '4/6' } }, handleStudentInput: vi.fn(),
      handleCheckMathWork: (...args) => { pending = H.handleCheckMathWork(...args, harness.deps); },
    });
    button(tree, /Check My Work/).props.onClick();
    await pending;
    expect(harness.results().r.p.fastPath).toBe(false);
    expect(harness.deps.handleScoreUpdate).not.toHaveBeenCalled();
  });
});
