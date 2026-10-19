import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { transformSync } = require('@babel/core');
const { act } = React;
let Dashboard, root, host, aggregateSpy;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.__alloT = key => key;
  const compiled = transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
    parserOpts: { sourceType: 'script', plugins: ['jsx'] }, compact: false,
  }).code;
  Dashboard = new Function('window', 'React', compiled + '\nreturn LiveResultsDashboard;')(window, React);
});

beforeEach(() => {
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(window);
  new Function('window', readFileSync('quiz_ai_helpers.js', 'utf8'))(window);
  aggregateSpy = vi.spyOn(window.AlloModules.QuizLiveAggregators, 'aggregateForMode');
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  delete window.__alloQuizShareResults;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function fixture() {
  return {
    activeSessionCode: 'class-a', gradeLevel: '5th',
    callGemini: vi.fn().mockResolvedValue(JSON.stringify({ status: 'correct', feedback: 'Current feedback' })),
    generatedContent: { id: 'resource-a', data: {
      mode: 'exit-ticket', scoringPolicy: { writtenResponseMode: 'ai-provisional', partialCredit: true },
      questions: [{ type: 'self-explanation', question: 'Explain the evidence.', rubric: 'Identify the observation and connect it to the claim.' }],
    } },
    sessionData: { roster: { learner: { displayName: 'Learner' } }, quizState: {
      activityId: 'activity-a', allResponses: { learner: { 0: { itemType: 'self-explanation', answer: { text: 'The observation supports the claim.' } } } },
    } },
  };
}
function copy(value) { return JSON.parse(JSON.stringify(value)); }
function lastCache() { return aggregateSpy.mock.calls.at(-1)?.[5] || {}; }
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
async function render(props) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  await act(async () => root.render(React.createElement(Dashboard, props)));
}
async function resolveGrade(wait, status, feedback) {
  await act(async () => wait.resolve(JSON.stringify({ status, feedback })));
}

describe('live written grading policy and request ownership', () => {
  it('does not send teacher-review responses to AI and does not expose an old AI grade', async () => {
    const props = fixture();
    await render(props);
    expect(lastCache()['learner:0'].status).toBe('correct');
    const review = { ...props, generatedContent: copy(props.generatedContent) };
    review.generatedContent.data.scoringPolicy.writtenResponseMode = 'teacher-review';
    await render(review);
    expect(props.callGemini).toHaveBeenCalledTimes(1);
    expect(lastCache()).toEqual({});
    await act(async () => root.unmount()); root = null; host.remove(); host = null;
    props.callGemini.mockClear();
    await render(review);
    expect(props.callGemini).not.toHaveBeenCalled();
  });

  it('grades self-explanations against the authored rubric', async () => {
    const props = fixture();
    await render(props);
    expect(props.callGemini.mock.calls[0][0]).toContain(props.generatedContent.data.questions[0].rubric);
    expect(props.callGemini.mock.calls[0][0]).toContain('The observation supports the claim.');
  });

  it.each(['activity', 'resource', 'response', 'rubric', 'answer key'])('ignores a stale grade after the %s changes', async change => {
    const first = deferred(), second = deferred(), props = fixture();
    props.callGemini.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await render(props);
    expect(host.textContent).toContain('AI grading 1');
    const revised = { ...props, generatedContent: copy(props.generatedContent), sessionData: copy(props.sessionData) };
    if (change === 'activity') revised.sessionData.quizState.activityId = 'activity-b';
    if (change === 'resource') revised.generatedContent.id = 'resource-b';
    if (change === 'response') revised.sessionData.quizState.allResponses.learner[0].answer.text = 'A different response.';
    if (change === 'rubric') revised.generatedContent.data.questions[0].rubric = 'Use two observations.';
    if (change === 'answer key') revised.generatedContent.data.questions[0].expectedAnswer = 'A revised expected answer.';
    await render(revised);
    expect(props.callGemini).toHaveBeenCalledTimes(2);
    expect(lastCache()).toEqual({});
    await resolveGrade(second, 'incorrect', 'Revised feedback');
    await resolveGrade(first, 'correct', 'Obsolete feedback');
    expect(lastCache()['learner:0']).toMatchObject({ status: 'incorrect', feedback: 'Revised feedback' });
  });

  it('invalidates completed cached grades when a response is corrected', async () => {
    const props = fixture();
    await render(props);
    const wait = deferred(); props.callGemini.mockReturnValueOnce(wait.promise);
    const revised = { ...props, sessionData: copy(props.sessionData) };
    revised.sessionData.quizState.allResponses.learner[0].answer.text = 'Corrected response';
    await render(revised);
    expect(props.callGemini).toHaveBeenCalledTimes(2);
    expect(lastCache()).toEqual({});
    await resolveGrade(wait, 'partially-correct', 'New response feedback');
    expect(lastCache()['learner:0'].status).toBe('partially-correct');
  });

  it('discards a pending grade when the teacher selects manual review', async () => {
    const wait = deferred(), props = fixture(); props.callGemini.mockReturnValueOnce(wait.promise);
    await render(props);
    const revised = { ...props, generatedContent: copy(props.generatedContent) };
    revised.generatedContent.data.scoringPolicy.writtenResponseMode = 'teacher-review';
    await render(revised);
    await resolveGrade(wait, 'correct', 'Obsolete feedback');
    expect(lastCache()).toEqual({});
    expect(host.textContent).not.toContain('AI grading 1');
  });

  it('offers an explicit retry after a transient grading failure', async () => {
    const props = fixture(); props.callGemini.mockRejectedValueOnce(new Error('Temporarily unavailable'));
    await render(props);
    expect(lastCache()).toEqual({});
    const retry = [...host.querySelectorAll('button')].find(button => button.textContent === 'Retry AI grading');
    expect(retry).toBeTruthy();
    await act(async () => retry.click());
    expect(props.callGemini).toHaveBeenCalledTimes(2);
    expect(lastCache()['learner:0'].status).toBe('correct');
    expect(host.textContent).not.toContain('Retry AI grading');
  });

  it('does not apply a late grade after unmounting', async () => {
    const wait = deferred(), props = fixture(); props.callGemini.mockReturnValueOnce(wait.promise);
    await render(props);
    await act(async () => root.unmount()); root = null;
    const count = aggregateSpy.mock.calls.length;
    await resolveGrade(wait, 'correct', 'Too late');
    expect(aggregateSpy).toHaveBeenCalledTimes(count);
  });
});

describe('live gradebook points match exported scores', () => {
  it.each(['pre-check', 'formative'])('keeps poll responses unscored in %s', async mode => {
    const props = fixture();
    props.generatedContent.data.mode = mode;
    props.generatedContent.data.questions = [{ type: 'opinion-mcq', question: 'Which activity do you prefer?', options: ['Read', 'Discuss'] }];
    props.sessionData.quizState.allResponses.learner = { 0: { itemType: 'opinion-mcq', answer: { optionIdx: 0 } } };
    await render(props);
    expect(props.callGemini).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Unscored');
    expect(host.textContent).not.toContain('0%');
    expect(host.textContent).not.toContain('Needs pre-teaching');
  });

  it.each(['pre-check', 'formative'])('shows partial credit and an IDK-neutral score in %s', async mode => {
    const props = fixture();
    props.generatedContent.data.mode = mode;
    props.callGemini.mockResolvedValue(JSON.stringify({ status: 'partially-correct', feedback: 'Some evidence is missing.' }));
    props.sessionData.roster.other = { displayName: 'Other learner' };
    props.sessionData.quizState.allResponses.other = { 0: { itemType: 'self-explanation', answer: { idk: true } } };
    window.__alloQuizShareResults = vi.fn().mockReturnValue(true);
    await render(props);
    expect(host.textContent).toContain('50% of points');
    expect(host.textContent).toContain('1 partially correct');
    if (mode === 'formative') {
      const share = host.querySelector('[aria-label="quiz.share_results_aria"]');
      await act(async () => share.click());
      expect(window.__alloQuizShareResults).toHaveBeenCalledWith(expect.objectContaining({ items: [expect.objectContaining({ count: '0.5/1 points', percent: 50 })] }));
      expect(host.querySelector('[title="1 partially correct"]').style.width).toBe('50%');
    }
  });

  it('does not label an ungraded pre-check response as needing pre-teaching', async () => {
    const props = fixture(); props.generatedContent.data.mode = 'pre-check';
    props.generatedContent.data.scoringPolicy.writtenResponseMode = 'teacher-review';
    await render(props);
    expect(host.textContent).toContain('No scored responses');
    expect(host.textContent).not.toContain('Needs pre-teaching');
    expect(host.textContent).not.toContain('0% of points');
  });

  it('includes partial credit and excludes IDK from the percentage in both the table and CSV', async () => {
    const props = fixture();
    props.callGemini.mockResolvedValue(JSON.stringify({ status: 'partially-correct', feedback: 'Some evidence is missing.' }));
    props.generatedContent.data.questions.push({ type: 'mcq', question: 'Choose one', options: ['A', 'B'], correctAnswer: 'A' });
    props.sessionData.quizState.allResponses.learner[1] = { itemType: 'mcq', answer: { idk: true } };
    await render(props);
    expect(host.querySelector('table').textContent).toContain('0.5 / 1 (50%)');
    let exportedBlob;
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { exportedBlob = blob; return 'blob:assessment-test'; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await act(async () => host.querySelector('[data-help-key="quiz_csv_export_btn"]').click());
    const csv = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(exportedBlob); });
    expect(csv).toContain('Earned points,Possible points,Score %');
    expect(csv.split('\r\n')[1]).toContain(',0.5,1,50%,');
  });
});

describe('live gradebook question-version review', () => {
  it.each([
    ['changed', 'Question version changed; review the original response.'],
    ['unavailable', 'Question version unavailable; review the original response.'],
    ['current', null],
  ])('keeps %s question versions consistent with grading eligibility', async (version, notice) => {
    const props = fixture();
    const question = {
      type: 'sequence-sense', question: 'Check the steps.', items: ['Heat', 'Cool'],
      presentedOrder: [0, 1], correctOrder: [0, 1],
      principleOptions: ['Heat before cooling', 'Cool before heating'],
      correctPrinciple: 'Heat before cooling',
    };
    props.generatedContent.data.questions = [question];
    const response = {
      itemType: 'sequence-sense', assessmentActivityId: 'activity-a',
      answer: { verifyAnswer: 'yes', principleAnswer: 'Heat before cooling', orderAnswer: [0, 1] },
    };
    if (version !== 'unavailable') response.questionSignature = window.AlloModules.QuizLiveAggregators.assessmentItemSignature(
      version === 'changed' ? { ...question, items: ['Cool', 'Heat'] } : question,
    );
    props.sessionData.quizState.allResponses.learner = { 0: response };
    await render(props);
    await act(async () => host.querySelector('[aria-label="Expand Learner details"]').click());

    expect(host.textContent).toContain('Principle: Heat before cooling');
    const review = host.querySelector('[data-assessment-version-review]');
    const overrides = host.querySelector('[data-help-key="quiz_teacher_override_row"]');
    if (notice) {
      expect(review?.textContent).toBe(notice);
      expect(review?.getAttribute('role')).toBe('status');
      expect(overrides).toBeNull();
      expect(host.querySelector('[aria-label^="Override"]')).toBeNull();
    } else {
      expect(review).toBeNull();
      expect(overrides).not.toBeNull();
      expect(overrides.querySelectorAll('button')).toHaveLength(3);
    }
    expect(props.callGemini).not.toHaveBeenCalled();
  });
});

describe('live dashboard render lifecycle', () => {
  function lifecycleFixture(mode = 'exit-ticket', answered = false) {
    const props = fixture();
    props.conceptMasteryByUid = {};
    props.generatedContent.data.mode = mode;
    props.generatedContent.data.questions = [{ type: 'mcq', question: 'Choose the even number.', options: ['2', '3'], correctAnswer: '2' }];
    props.generatedContent.data.reflections = ['What evidence helped you decide?'];
    props.sessionData.quizState.allResponses = answered ? { learner: {
      0: { itemType: 'mcq', answer: { optionIdx: 0, optionText: '2' } },
      r0: { itemType: 'reflection', answer: { text: 'I checked whether the number divides evenly by two.' } },
    } } : {};
    return props;
  }
  const reflectionToggle = () => [...host.querySelectorAll('button')].find(button => button.textContent.includes('Reflections (1)'));
  async function collapseReflections() {
    expect(reflectionToggle()?.getAttribute('aria-expanded')).toBe('true');
    await act(async () => reflectionToggle().click());
    expect(reflectionToggle()?.getAttribute('aria-expanded')).toBe('false');
  }
  function expectPopulated() {
    expect(host.querySelector('[aria-label="a11y.live_results_dashboard"]')).not.toBeNull();
    expect(host.textContent).not.toContain('Waiting for student responses.');
    expect(reflectionToggle()).toBeTruthy();
  }

  it.each(['exit-ticket', 'pre-check', 'formative', 'review'])('survives empty → first response → restart → response in %s without remounting', async mode => {
    const empty = lifecycleFixture(mode), populated = lifecycleFixture(mode, true);
    await render(empty);
    const mountedRoot = root, mountedHost = host;
    expect(host.textContent).toContain('Waiting for student responses.');
    await render(populated);
    expectPopulated();
    expect(host.textContent).toContain('I checked whether the number divides evenly by two.');
    await collapseReflections();
    await render(empty);
    expect(host.textContent).toContain('Waiting for student responses.');
    expect(reflectionToggle()).toBeUndefined();
    await render(populated);
    expectPopulated();
    expect(root).toBe(mountedRoot); expect(host).toBe(mountedHost);
    expect(reflectionToggle().getAttribute('aria-expanded')).toBe('false');
    expect(host.textContent).not.toContain('I checked whether the number divides evenly by two.');
    expect(populated.callGemini).not.toHaveBeenCalled();
    expect(aggregateSpy).toHaveBeenCalled();
  });

  it('renders after the aggregator loads and retains state if it becomes temporarily unavailable', async () => {
    const props = lifecycleFixture('exit-ticket', true);
    const aggregator = window.AlloModules.QuizLiveAggregators;
    delete window.AlloModules.QuizLiveAggregators;
    try {
      await render(props);
      const mountedRoot = root;
      expect(host.textContent).toBe('');
      window.AlloModules.QuizLiveAggregators = aggregator;
      await render(props);
      expectPopulated();
      await collapseReflections();
      delete window.AlloModules.QuizLiveAggregators;
      await render(props);
      expect(host.textContent).toBe('');
      window.AlloModules.QuizLiveAggregators = aggregator;
      await render(props);
      expectPopulated();
      expect(root).toBe(mountedRoot);
      expect(reflectionToggle().getAttribute('aria-expanded')).toBe('false');
    } finally { window.AlloModules.QuizLiveAggregators = aggregator; }
  });

  it('recovers from an aggregation failure without remounting or resetting reflection visibility', async () => {
    const props = lifecycleFixture('exit-ticket', true);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await render(props);
    const mountedRoot = root;
    expectPopulated();
    await collapseReflections();
    aggregateSpy.mockImplementationOnce(() => { throw new Error('Temporary aggregation failure'); });
    await render(props);
    expect(host.textContent).toBe('');
    expect(warning).toHaveBeenCalledWith('[LiveResultsDashboard] aggregator failed:', expect.any(Error));
    await render(props);
    expectPopulated();
    expect(root).toBe(mountedRoot);
    expect(reflectionToggle().getAttribute('aria-expanded')).toBe('false');
  });
});
