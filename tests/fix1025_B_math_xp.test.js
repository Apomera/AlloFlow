// Lane B fixes (2026-10-25 review of the 24 core resources): Math.
//  M1  every problem on a sheet earns XP under the host's real max-score-per-id rule,
//      and the UI only claims XP the host actually added
//  M2  opening the worked solution (which shows the answer) drops a later correct
//      answer to the final-hint rate (25%), and "Try Again" does not clear that
//  M3  student-facing math strings go through t() with English fallbacks
// Mutation hooks: FIX1025_B_MATH_MODULE, FIX1025_B_MATH_VIEW_SRC, FIX1025_B_ANTI.
import fs from 'node:fs';
import vm from 'node:vm';
import { transformSync } from '@babel/core';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const MATH_MODULE = process.env.FIX1025_B_MATH_MODULE || 'math_helpers_module.js';
const VIEW_SRC = process.env.FIX1025_B_MATH_VIEW_SRC || 'view_math_source.jsx';
const ANTI = process.env.FIX1025_B_ANTI || 'AlloFlowANTI.txt';

let MathHelpers;
beforeAll(() => {
  window.AlloModules = {};
  new Function(fs.readFileSync(MATH_MODULE, 'utf8'))();
  MathHelpers = window.AlloModules.MathHelpers;
});

// The host's real handleScoreUpdate, sliced out of ANTI so the test follows it.
function makeHost(seed = []) {
  const anti = fs.readFileSync(ANTI, 'utf8');
  const start = anti.indexOf('const handleScoreUpdate = useCallback((currentScore');
  const endMarker = '}, [completedActivities, t]);';
  const end = anti.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('handleScoreUpdate anchor not found in ' + ANTI);
  const body = anti.slice(start, end + endMarker.length);
  const state = { completed: new Map(seed), points: 0, toasts: [] };
  const factory = new Function('state', `
    const useCallback = fn => fn;
    let completedActivities = state.completed;
    const setCompletedActivities = fn => { completedActivities = fn(completedActivities); state.completed = completedActivities; };
    const setGlobalPoints = fn => { state.points = fn(state.points); };
    const setPointHistory = () => {};
    const addToast = (m) => state.toasts.push(m);
    const t = k => k;
    ${body}
    return handleScoreUpdate;
  `);
  return { handleScoreUpdate: factory(state), state };
}

function harness(resourceId, host, { hints = {} } = {}) {
  let results = {};
  const deps = {
    mathCheckResults: results,
    mathHintData: hints,
    setMathCheckResults: update => {
      results = typeof update === 'function' ? update(results) : update;
      deps.mathCheckResults = results;
    },
    addToast: vi.fn(),
    t: () => '',
    callGemini: vi.fn(),
    warnLog: vi.fn(),
    handleScoreUpdate: host.handleScoreUpdate,
  };
  // Mirrors ANTI handleResetMathCheck ("Try Again").
  const tryAgain = problem => deps.setMathCheckResults(prev => ({
    ...prev,
    [resourceId]: { ...(prev[resourceId] || {}), [problem]: { ...(prev[resourceId]?.[problem] || {}), checking: false, verdict: null, score: 0, feedback: '', checked: false } },
  }));
  return { deps, tryAgain, results: () => results };
}

describe('M1: XP for every problem on a sheet, with the real host max-score rule', () => {
  it('awards 10 XP for each of three correct problems (30 total), not just the first', async () => {
    const host = makeHost();
    const resourceId = 'fix1025-sheet';
    const h = harness(resourceId, host);
    const problems = [['p1', '4'], ['p2', '9'], ['p3', '12']];
    for (const [key, answer] of problems) {
      await MathHelpers.handleCheckMathWork(resourceId, key, 'Solve it.', answer, [], answer, h.deps);
    }
    expect(host.state.points).toBe(30);
    for (const [key] of problems) {
      expect(h.results()[resourceId][key]).toMatchObject({ verdict: 'correct', xpAwarded: true, xpEarned: 10 });
    }
    expect([...host.state.completed.keys()].sort()).toEqual(['fix1025-sheet:p1', 'fix1025-sheet:p2', 'fix1025-sheet:p3']);
  });

  it('claims 0 XP when the host already holds this problem score (e.g. after a reload)', async () => {
    const host = makeHost([['fix1025-reload:p1', 10]]);
    const h = harness('fix1025-reload', host);
    await MathHelpers.handleCheckMathWork('fix1025-reload', 'p1', 'Solve it.', '4', [], '4', h.deps);
    expect(host.state.points).toBe(0);
    expect(h.results()['fix1025-reload'].p1).toMatchObject({ verdict: 'correct', xpAwarded: true, xpEarned: 0 });
  });
});

describe('M2: viewing the answer costs the final-hint rate', () => {
  const wrongThenView = async (resourceId, { view }) => {
    const host = makeHost();
    const h = harness(resourceId, host);
    h.deps.callGemini = vi.fn(async () => JSON.stringify({ verdict: 'incorrect', score: 0, feedback: 'Recheck the sum.' }));
    await MathHelpers.handleCheckMathWork(resourceId, 'p', 'What is 2 + 2?', '4', [], 'It is 5', h.deps);
    expect(host.state.points).toBe(0);
    if (view) MathHelpers.markMathSolutionViewed(resourceId, 'p');
    h.tryAgain('p');
    await MathHelpers.handleCheckMathWork(resourceId, 'p', 'What is 2 + 2?', '4', [], '4', h.deps);
    return { host, h };
  };

  it('a wrong try, then the solution, then Try Again and the answer earns 3 XP, not 10', async () => {
    const { host, h } = await wrongThenView('fix1025-viewed', { view: true });
    expect(host.state.points).toBe(3);
    expect(h.results()['fix1025-viewed'].p).toMatchObject({ verdict: 'correct', xpEarned: 3, solutionViewed: true, hintsUsed: 0 });
  });

  it('a learner who never opened the solution still earns full XP after Try Again', async () => {
    const { host, h } = await wrongThenView('fix1025-not-viewed', { view: false });
    expect(host.state.points).toBe(10);
    expect(h.results()['fix1025-not-viewed'].p).toMatchObject({ xpEarned: 10, solutionViewed: false });
  });

  it('the penalty also applies on the AI-graded path', async () => {
    const host = makeHost();
    const h = harness('fix1025-ai', host);
    MathHelpers.markMathSolutionViewed('fix1025-ai', 'p');
    h.deps.callGemini = vi.fn(async () => JSON.stringify({ verdict: 'correct', score: 100, feedback: 'Right.' }));
    await MathHelpers.handleCheckMathWork('fix1025-ai', 'p', 'Explain.', '4', [], 'Two plus two makes four, so 4 apples.', h.deps);
    expect(h.deps.callGemini).toHaveBeenCalled();
    expect(host.state.points).toBe(3);
  });

  it('a teacher edit of the problem clears the viewed mark', () => {
    MathHelpers.markMathSolutionViewed('fix1025-edit', 'p');
    expect(MathHelpers.hasViewedMathSolution('fix1025-edit', 'p')).toBe(true);
    MathHelpers.invalidateMathProblemRequests('fix1025-edit', 'p');
    expect(MathHelpers.hasViewedMathSolution('fix1025-edit', 'p')).toBe(false);
  });
});

// ---- MathView (shallow element tree, same loader shape as math_view_second_pass) ----
let viewCode;
function loadMathView(mathHelpers) {
  // Transform once: four babel passes over a 116 KB file time out under a loaded runner.
  const code = viewCode || (viewCode = transformSync(fs.readFileSync(VIEW_SRC, 'utf8'), {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
    babelrc: false, configFile: false, parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  }).code);
  const hookSlots = [];
  let cursor = 0;
  const React = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useRef(v) { const i = cursor++; if (!hookSlots[i]) hookSlots[i] = { current: v }; return hookSlots[i]; },
    useLayoutEffect() {}, useEffect() {},
  };
  const icon = () => null;
  const window = { React, AlloIcons: {}, AlloModules: { MathHelpers: mathHelpers }, setTimeout: cb => cb() };
  const context = { console: { error() {}, warn() {}, log() {} }, document: { getElementById: () => null }, window, React,
    EyeOff: icon, Eye: icon, Copy: icon, ImageIcon: icon, CheckCircle2: icon, Pencil: icon, Globe: icon, RefreshCw: icon, Sparkles: icon, ChevronDown: icon };
  vm.runInNewContext(code, context);
  return props => { cursor = 0; return context.MathView(props); };
}
const walk = (n, out = []) => { if (Array.isArray(n)) { n.forEach(c => walk(c, out)); return out; } if (!n || typeof n !== 'object') return out; out.push(n); walk(n.children, out); return out; };
const text = n => Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.children) : String(n);
const artifact = { id: 'r', type: 'math', meta: 'Math - Practice', data: { title: 'Practice', problems: [{ id: 'p', question: 'Find the volume of the cube.', answer: '27', steps: [{ explanation: 'Multiply 3 x 3 x 3.' }] }] } };
const wrongResult = { r: { p: { checked: true, checking: false, verdict: 'incorrect', score: 0, feedback: 'Recheck.', xpAwarded: false, xpEarned: 0 } } };

describe('M2 view: opening the solution records it', () => {
  it('toggling the solution open calls markMathSolutionViewed for that problem', () => {
    const helpers = { markMathSolutionViewed: vi.fn() };
    const MathView = loadMathView(helpers);
    const tree = MathView({ generatedContent: artifact, t: () => '', studentResponses: { r: { p: '26' } }, mathCheckResults: wrongResult });
    const details = walk(tree).find(n => n.type === 'details');
    expect(details, 'solution <details> rendered').toBeTruthy();
    expect(text(details)).toContain('XP for this problem drops');
    details.props.onToggle({ currentTarget: { open: false } });
    expect(helpers.markMathSolutionViewed).not.toHaveBeenCalled();
    details.props.onToggle({ currentTarget: { open: true } });
    expect(helpers.markMathSolutionViewed).toHaveBeenCalledWith('r', 'p');
  }, 30000);
});

describe('M3: student math strings go through t()', () => {
  const keys = ['math.solution.answer_label', 'math.solution.try_with_cubes', 'math.hint.request_first', 'math.solution.xp_note'];
  it('renders translated text when the pack has the key, English when it does not', () => {
    const helpers = { markMathSolutionViewed: vi.fn() };
    const MathView = loadMathView(helpers);
    const t = k => (keys.includes(k) || k === 'math.check.try_checking_again' || k === 'math.check.xp_earned' ? `<<${k}>>` : undefined);
    const translated = text(MathView({ generatedContent: artifact, t, studentResponses: { r: { p: '26' } }, mathCheckResults: wrongResult, mathSubject: 'Geometry' }));
    for (const k of ['math.solution.answer_label', 'math.solution.try_with_cubes', 'math.solution.xp_note']) expect(translated).toContain(`<<${k}>>`);
    expect(translated).not.toContain('Answer: 27');
    const english = text(MathView({ generatedContent: artifact, t: () => undefined, studentResponses: { r: { p: '26' } }, mathCheckResults: wrongResult }));
    expect(english).toContain('Answer: 27');
    expect(english).toContain('Try with cubes');
    const unchecked = MathView({ generatedContent: artifact, t, studentResponses: { r: { p: '26' } }, mathCheckResults: {}, mathHintData: {}, handleGetMathHint: vi.fn() });
    expect(text(unchecked)).toContain('<<math.hint.request_first>>');
    const errored = MathView({ generatedContent: artifact, t, studentResponses: { r: { p: '26' } }, mathCheckResults: { r: { p: { verdict: 'error', checked: false, checking: false, score: 0, feedback: 'x' } } } });
    expect(text(errored)).toContain('<<math.check.try_checking_again>>');
    const correct = MathView({ generatedContent: artifact, t, studentResponses: { r: { p: '27' } }, mathCheckResults: { r: { p: { checked: true, verdict: 'correct', score: 100, feedback: 'ok', xpAwarded: true, xpEarned: 10 } } } });
    expect(text(correct)).toContain('<<math.check.xp_earned>>');
  });

  it('fills {params} in the English fallback', () => {
    const MathView = loadMathView({});
    const correct = MathView({ generatedContent: artifact, t: () => undefined, studentResponses: { r: { p: '27' } }, mathCheckResults: { r: { p: { checked: true, verdict: 'correct', score: 100, feedback: 'ok', hintsUsed: 2, xpAwarded: true, xpEarned: 5 } } } });
    expect(text(correct)).toContain('-2 hints');
    expect(text(correct)).toContain('+5 XP');
  });

  it('math_helpers toasts and feedback use t() keys', async () => {
    const host = makeHost();
    const h = harness('fix1025-i18n', host);
    h.deps.t = k => `<<${k}>>`;
    await MathHelpers.handleCheckMathWork('fix1025-i18n', 'p', 'Q', '4', [], '   ', h.deps);
    expect(h.deps.addToast).toHaveBeenCalledWith('<<math.check.empty_answer>>', 'info');
    await MathHelpers.handleCheckMathWork('fix1025-i18n', 'p', 'Q', '4', [], '4', h.deps);
    expect(h.results()['fix1025-i18n'].p.feedback).toBe('<<math.check.exact_correct>>');
  });
});
