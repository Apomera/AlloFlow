import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_arithmetic.js';
const ID = 'arithmeticStudio';

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});

async function enterNumber(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('Arithmetic Strategy Studio', () => {
  it('registers as a math tool and exposes deterministic pure helpers', () => {
    const tool = loadTool(FILE, ID);
    expect(tool.label).toBe('Arithmetic Strategy Studio');
    expect(tool.category).toBe('math');

    const pure = window.ArithmeticStrategyPure;
    expect(pure.calculate('add', 58, 27)).toEqual({ answer: 85, remainder: 0 });
    expect(pure.calculate('subtract', 402, 186)).toEqual({ answer: 216, remainder: 0 });
    expect(pure.calculate('multiply', 24, 13)).toEqual({ answer: 312, remainder: 0 });
    expect(pure.calculate('divide', 65, 6)).toEqual({ answer: 10, remainder: 5 });
    expect(pure.splitPlaceValue(1204)).toEqual([1000, 200, 4]);
    expect(pure.strategySteps('divide', 65, 6).join(' ')).toContain('remainder 5');
    expect(pure.estimateFor('multiply', 7, 8)).toBe(70);
    expect(pure.estimatePlan('multiply', 23, 14)).toMatchObject({ estimate: 280, expression: '20 \u00d7 14' });
    expect(pure.estimateFor('divide', 42, 6)).toBe(7);
    expect(pure.estimateFor('divide', 53, 5)).toBe(10);
    expect(pure.estimatePlan('divide', 347, 8)).toMatchObject({ estimate: 40, expression: '320 \u00f7 8' });
    expect(pure.estimatePlan('divide', 347, 8).estimate).not.toBe(pure.calculate('divide', 347, 8).answer);
    expect(pure.estimatePlan('divide', 1, 9999)).toMatchObject({ estimate: 0, left: 0, expression: '0 \u00f7 9999' });
    expect(pure.estimatePlan('divide', 9998, 9999).estimate).toBe(0);
    expect(pure.assessEstimate('add', 27, 35, '', 60).status).toBe('missing');
    expect(pure.assessEstimate('add', 27, 35, 999, 60).reasonable).toBe(false);

    const wordIds = pure.wordProblems.map((problem) => problem.id);
    expect(wordIds).toEqual(['w1', 'w2', 'w3', 'w4', 'full-teams', 'supply-boxes']);
    expect(new Set(wordIds).size).toBe(wordIds.length);
    expect(pure.nextWordProblemId('w1', wordIds)).toBe('w2');
    expect(pure.missedWordProblemIds({
      wordMissedCases: { w1: true, 'full-teams': true, bogus: true },
      wordSolvedCases: { w1: true },
    })).toEqual(['full-teams']);
    expect(pure.expectedWordResponse(pure.wordProblems.find((problem) => problem.id === 'w4')))
      .toEqual({ answer: 13, remainder: 1, requiresRemainder: true, divisionContext: 'report-remainder' });
    expect(pure.expectedWordResponse(pure.wordProblems.find((problem) => problem.id === 'full-teams')))
      .toEqual({ answer: 8, remainder: 0, requiresRemainder: false, divisionContext: 'discard-remainder' });
    expect(pure.expectedWordResponse(pure.wordProblems.find((problem) => problem.id === 'supply-boxes')))
      .toEqual({ answer: 9, remainder: 0, requiresRemainder: false, divisionContext: 'round-up' });

    const practiceQuest = tool.questHooks.find((hook) => hook.id === 'practice_5');
    const operationQuest = tool.questHooks.find((hook) => hook.id === 'all_operations');
    const errorQuest = tool.questHooks.find((hook) => hook.id === 'error_detective');
    expect(practiceQuest.progress({ practiceSolved: { bogus: true } })).toBe('0/5 correct');
    expect(operationQuest.progress({ operationsUsed: { add: true, subtract: true, multiply: true, divide: true } })).toBe('0/4 operations');
    expect(operationQuest.progress({ practiceSolved: { a1: true, s1: true, m1: true, d1: true } })).toBe('4/4 operations');
    expect(operationQuest.check({ practiceSolved: { a1: true, s1: true, m1: true, d1: true } })).toBe(true);
    expect(errorQuest.progress({ errorSolvedCases: { bogus: true } })).toBe('0/3 mistakes');
  });

  it('renders the default strategy workspace with accessible models and controls', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {});
    expect(html).toContain('Arithmetic Strategy Studio');
    expect(html).toContain('Concrete');
    expect(html).toContain('Choose an operation');
    expect(html).toContain('Place-value table and text alternative');
    expect(html).toContain('role="tablist"');
    expect(html).not.toContain('undefined');
  });

  it('renders every learning section and all four operation models', () => {
    loadTool(FILE, ID);
    for (const tab of ['learn', 'practice', 'errors', 'apply']) {
      for (const operation of ['add', 'subtract', 'multiply', 'divide']) {
        const html = renderTool(ID, {
          _arithmeticStudio: { tab, operation, level: 3, a: 65, b: 6, showSteps: true },
        });
        expect(html.length).toBeGreaterThan(1000);
        expect(html).toContain('Arithmetic Strategy Studio');
        expect(html).not.toContain('render error');
      }
    }
  });

  it('keeps division quotient and remainder reasoning explicit', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {
      _arithmeticStudio: { tab: 'learn', operation: 'divide', a: 65, b: 6, showSteps: true },
    });
    expect(html).toContain('10 remainder 5');
    expect(html).toContain('Equal-groups model');
    expect(html).toContain('with 5 left over');
  });

  it('shows operation choices only where meaningful and keeps pale area-model cells readable', () => {
    loadTool(FILE, ID);
    const learn = renderTool(ID, { _arithmeticStudio: { tab: 'learn', operation: 'multiply', a: 23, b: 14 } }, { isDark: true });
    document.body.innerHTML = learn;
    expect(document.querySelector('[aria-label="Choose an operation"]')).toBeTruthy();
    const areaModel = document.querySelector('[aria-label="Area model showing partial products for 23 times 14"]');
    expect(areaModel).toBeTruthy();
    expect(areaModel.getAttribute('style')).toContain('color:#0f172a');

    const practice = renderTool(ID, { _arithmeticStudio: { tab: 'practice' } });
    const errors = renderTool(ID, { _arithmeticStudio: { tab: 'errors' } });
    const apply = renderTool(ID, { _arithmeticStudio: { tab: 'apply' } });
    expect(practice).toContain('aria-label="Choose an operation"');
    expect(errors).not.toContain('aria-label="Choose an operation"');
    expect(apply).not.toContain('aria-label="Choose an operation"');
  });

  it('updates progress after a correct mounted practice interaction', async () => {
    const tool = loadTool(FILE, ID);
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _arithmeticStudio: { tab: 'practice', operation: 'add', level: 1, answerInput: '62', estimateInput: '60' },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    expect(check).toBeTruthy();
    await React.act(async () => { check.click(); });
    expect(latest._arithmeticStudio.correct).toBe(1);
    expect(latest._arithmeticStudio.attempts).toBe(1);
    expect(latest._arithmeticStudio.operationsCompleted).toEqual({ add: true });
    expect(latest._arithmeticStudio.practiceProblemId).toBe('a1');
    expect(document.body.textContent).toContain('Correct. Your exact answer and estimate support each other');
    await React.act(async () => { root.unmount(); });
  });
  it('tracks and retries missed Practice and Error Detective items by stable ID', async () => {
    const tool = loadTool(FILE, ID);
    let latest;

    function PracticeApp() {
      const [state, setState] = React.useState({
        _arithmeticStudio: { tab: 'practice', operation: 'add', level: 1, answerInput: '61', estimateInput: '60' },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    let root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(PracticeApp)); });
    let button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Check answer');
    await React.act(async () => { button.click(); });
    expect(latest._arithmeticStudio.practiceMissed.a1).toBe(true);
    expect(document.body.textContent).toContain('Retry missed (1)');
    button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Next problem');
    await React.act(async () => { button.click(); });
    expect(latest._arithmeticStudio.practiceProblemId).toBe('a2');
    button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Retry missed (1)');
    await React.act(async () => { button.click(); });
    expect(latest._arithmeticStudio.practiceProblemId).toBe('a1');
    expect(latest._arithmeticStudio.answerInput).toBe('');
    await React.act(async () => { root.unmount(); });

    document.body.innerHTML = '<div id="root"></div>';
    function ErrorApp() {
      const [state, setState] = React.useState({ _arithmeticStudio: { tab: 'errors', errorIndex: 0 } });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(ErrorApp)); });
    await React.act(async () => { document.querySelector('[data-error-choice="place"]').click(); });
    expect(latest._arithmeticStudio.errorMissedCases.e1).toBe(true);
    button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Next mistake');
    await React.act(async () => { button.click(); });
    expect(latest._arithmeticStudio.errorIndex).toBe(1);
    button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Retry missed (1)');
    await React.act(async () => { button.click(); });
    expect(latest._arithmeticStudio.errorIndex).toBe(0);
    expect(latest._arithmeticStudio.errorChoice).toBeNull();
    await React.act(async () => { root.unmount(); });
  });
  it('normalizes blank and numeric-zero practice inputs correctly', () => {
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, { _arithmeticStudio: { tab: 'practice', operation: 'add' } });
    let check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    expect(check.disabled).toBe(true);

    document.body.innerHTML = renderTool(ID, {
      _arithmeticStudio: { tab: 'practice', operation: 'add', answerInput: 0, estimateInput: 0 },
    });
    const inputs = [...document.querySelectorAll('input[type="number"]')];
    expect(inputs[0].value).toBe('0');
    expect(inputs[1].value).toBe('0');
    check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    expect(check.disabled).toBe(false);
  });

  it('uses exact practice bands so Challenge opens challenge work', async () => {
    const tool = loadTool(FILE, ID);
    let latest;
    function App() {
      const [state, setState] = React.useState({
        _arithmeticStudio: { tab: 'practice', operation: 'add', level: 1, answerInput: '62', estimateInput: '60' },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }
    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    expect(document.querySelector('[data-practice-problem-id="a1"]')).toBeTruthy();
    const challenge = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Challenge');
    await React.act(async () => { challenge.click(); });
    expect(latest._arithmeticStudio).toMatchObject({ level: 3, practiceIndex: 0, answerInput: '', estimateInput: '' });
    expect(document.querySelector('[data-practice-problem-id="a5"]')).toBeTruthy();
    expect(document.body.textContent).toContain('12458 + 7896');
    expect([...document.querySelectorAll('input[type="number"]')].every((input) => input.value === '')).toBe(true);
    await React.act(async () => { root.unmount(); });
  });

  it('hydrates attempts by stable problem ID and drops stale cumulative-band state', async () => {
    const tool = loadTool(FILE, ID);
    let latest;
    function App() {
      const [state, setState] = React.useState({
        _arithmeticStudio: {
          tab: 'practice', operation: 'add', level: 2, practiceIndex: 0,
          answerInput: '62', estimateInput: '60', feedback: 'correct', practiceSolved: { a1: true },
        },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }
    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    expect(document.querySelector('[data-practice-problem-id="a3"]')).toBeTruthy();
    let inputs = [...document.querySelectorAll('input[type="number"]')];
    expect(inputs.map((input) => input.value)).toEqual(['', '']);
    expect([...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer').disabled).toBe(true);
    expect(document.body.textContent).not.toContain('Correct. Your exact answer and estimate support each other.');

    await enterNumber(inputs[0], '800');
    expect(latest._arithmeticStudio).toMatchObject({
      practiceProblemId: 'a3', practiceIndex: 0, estimateInput: '800', answerInput: '', remainderInput: '', feedback: null,
    });
    inputs = [...document.querySelectorAll('input[type="number"]')];
    expect(inputs.map((input) => input.value)).toEqual(['800', '']);
    await React.act(async () => { root.unmount(); });

    document.body.innerHTML = renderTool(ID, {
      _arithmeticStudio: {
        tab: 'practice', operation: 'add', level: 2, practiceIndex: 0, practiceProblemId: 'a4',
        answerInput: '2124', estimateInput: '2100', feedback: 'try',
      },
    });
    expect(document.querySelector('[data-practice-problem-id="a4"]')).toBeTruthy();
    inputs = [...document.querySelectorAll('input[type="number"]')];
    expect(inputs.map((input) => input.value)).toEqual(['2100', '2124']);
  });

  it('requires an explicit division remainder, including an explicit zero', () => {
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, {
      _arithmeticStudio: { tab: 'practice', operation: 'divide', level: 1, answerInput: '7', estimateInput: '7' },
    });
    let inputs = [...document.querySelectorAll('input[type="number"]')];
    let check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    expect(inputs.map((input) => input.value)).toEqual(['7', '7', '']);
    expect(inputs[2].required).toBe(true);
    expect(inputs[2].getAttribute('aria-required')).toBe('true');
    expect(check.disabled).toBe(true);

    document.body.innerHTML = renderTool(ID, {
      _arithmeticStudio: { tab: 'practice', operation: 'divide', level: 1, answerInput: '7', estimateInput: '7', remainderInput: 0 },
    });
    inputs = [...document.querySelectorAll('input[type="number"]')];
    check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    expect(inputs[2].value).toBe('0');
    expect(check.disabled).toBe(false);
  });

  it('restores and locks canonical practice values and explanation on revisit', () => {
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, {
      _arithmeticStudio: {
        tab: 'practice', operation: 'divide', level: 2, practiceIndex: 1,
        practiceSolved: { d4: true }, estimateInput: '999', answerInput: '0', remainderInput: '0', feedback: 'try',
      },
    });
    expect(document.querySelector('[data-practice-problem-id="d4"]')).toBeTruthy();
    const inputs = [...document.querySelectorAll('input[type="number"]')];
    expect(inputs.map((input) => input.value)).toEqual(['40', '43', '3']);
    expect(inputs.every((input) => input.disabled)).toBe(true);
    expect(document.body.textContent).toContain('Correct. Your exact answer and estimate support each other.');
    expect(document.body.textContent).toContain('Result: 43 remainder 3.');
  });

  it('persists the whole-number subtraction clamp when operands change', async () => {
    const tool = loadTool(FILE, ID);
    let latest;
    function App() {
      const [state, setState] = React.useState({ _arithmeticStudio: { tab: 'learn', operation: 'subtract', a: 10, b: 9 } });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }
    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const inputs = [...document.querySelectorAll('input[type="number"]')];
    await enterNumber(inputs[0], '5');
    expect(latest._arithmeticStudio).toMatchObject({ a: 5, b: 5 });
    const addition = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Addition'));
    await React.act(async () => { addition.click(); });
    expect(latest._arithmeticStudio).toMatchObject({ operation: 'add', b: 5 });
    expect(latest._arithmeticStudio.operationsUsed).toBeUndefined();
    await React.act(async () => { root.unmount(); });
  });

  it('keeps a correct error diagnosis stable under rapid mixed activation', async () => {
    const tool = loadTool(FILE, ID);
    const awardXP = vi.fn();
    let latest;
    function App() {
      const [state, setState] = React.useState({ _arithmeticStudio: { tab: 'errors' } });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }
    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const correct = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('ten from 15'));
    const wrong = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('aligned incorrectly'));
    await React.act(async () => { correct.click(); wrong.click(); });
    expect(latest._arithmeticStudio).toMatchObject({ errorChoice: 'regroup', errorFeedback: 'correct', errorSolved: 1 });
    expect(awardXP).toHaveBeenCalledTimes(1);
    await React.act(async () => { root.unmount(); });
  });

  it('restores solved Error Detective choices with dark-safe contrast', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {
      _arithmeticStudio: {
        tab: 'errors', operation: 'divide', errorIndex: 3,
        errorSolvedCases: { e4: true }, errorChoice: 'round', errorFeedback: 'try',
      },
    }, { isDark: true });
    document.body.innerHTML = html;
    const correct = document.querySelector('[data-error-choice="remainder"]');
    expect(correct.getAttribute('aria-pressed')).toBe('true');
    expect(correct.disabled).toBe(true);
    expect(correct.getAttribute('style')).toContain('background:#d1fae5');
    expect(correct.getAttribute('style')).toContain('color:#0f172a');
    expect([...document.querySelectorAll('[data-error-choice]')].every((choice) => choice.disabled)).toBe(true);
    expect(document.body.textContent).toContain('65 = 6');
    expect(document.body.textContent).toContain('10 + 5');

    const learnDark = renderTool(ID, {
      _arithmeticStudio: { tab: 'learn', operation: 'divide', a: 65, b: 6 },
    }, { isDark: true });
    expect(learnDark).toContain('color:#6ee7b7');
  });

  it('renders truthful zero models without invalid numeric styles', () => {
    loadTool(FILE, ID);
    for (const [a, b] of [[0, 7], [7, 0]]) {
      const html = renderTool(ID, { _arithmeticStudio: { operation: 'multiply', a, b } });
      expect(html).toContain('Zero-product model');
      expect(html).toContain('Product: 0');
      expect(html).not.toContain('rows of 1 dots');
    }
    const division = renderTool(ID, { _arithmeticStudio: { operation: 'divide', a: 0, b: 6 } });
    expect(division).toContain('0 complete groups of 6');
    expect(division).not.toMatch(/NaN|Infinity/);
  });

  it('requires a reasonable estimate before completing practice', async () => {
    const tool = loadTool(FILE, ID);
    const awardXP = vi.fn();
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _arithmeticStudio: { tab: 'practice', operation: 'add', level: 1, answerInput: '62', estimateInput: '999' },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    await React.act(async () => { check.click(); });
    expect(latest._arithmeticStudio.feedback).toBe('estimate');
    expect(latest._arithmeticStudio.correct).toBe(0);
    expect(awardXP).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Your exact answer is right. Revise the estimate');
    await React.act(async () => { root.unmount(); });
  });

  it('makes practice completion and XP idempotent under rapid activation', async () => {
    const tool = loadTool(FILE, ID);
    const awardXP = vi.fn();
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _arithmeticStudio: { tab: 'practice', operation: 'add', level: 1, answerInput: '62', estimateInput: '60' },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    await React.act(async () => { check.click(); check.click(); });
    expect(latest._arithmeticStudio.attempts).toBe(1);
    expect(latest._arithmeticStudio.correct).toBe(1);
    expect(Object.keys(latest._arithmeticStudio.practiceSolved)).toEqual(['a1']);
    expect(awardXP).toHaveBeenCalledTimes(1);
    await React.act(async () => { root.unmount(); });
  });

  it('makes operation choice part of application reasoning without disclosing the answer', async () => {
    const tool = loadTool(FILE, ID);
    const awardXP = vi.fn();
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _arithmeticStudio: { tab: 'apply', wordProblemId: 'w1' },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    expect(document.querySelector('[data-word-problem-id="w1"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Operation: Addition');
    expect(document.querySelectorAll('[data-word-operation][aria-pressed="true"]')).toHaveLength(0);
    let check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check response');
    expect(check.disabled).toBe(true);

    const addition = document.querySelector('[data-word-operation="add"]');
    await React.act(async () => { addition.click(); });
    await enterNumber(document.querySelector('input[type="number"]'), '423');
    check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check response');
    await React.act(async () => { check.click(); check.click(); });

    expect(latest._arithmeticStudio).toMatchObject({
      wordProblemId: 'w1',
      wordOperation: 'add',
      wordSolved: 1,
      operationsUsed: { add: true },
    });
    expect(latest._arithmeticStudio.wordAttempts.w1).toBe(1);
    expect(latest._arithmeticStudio.wordSolvedCases.w1).toBe(true);
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('Addition models the story');
    await React.act(async () => { root.unmount(); });
  });

  it('restores and locks canonical values when a solved story is revisited', () => {
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, {
      _arithmeticStudio: {
        tab: 'apply', wordProblemId: 'w4', wordSolvedCases: { w4: true },
        wordOperation: null, wordAnswer: '', wordRemainder: '',
      },
    });

    const divide = document.querySelector('[data-word-operation=divide]');
    expect(divide.getAttribute('aria-pressed')).toBe('true');
    expect(divide.disabled).toBe(true);
    const inputs = [...document.querySelectorAll('input[type=number]')];
    expect(inputs.map((input) => input.value)).toEqual(['13', '1']);
    expect(inputs.every((input) => input.disabled)).toBe(true);
    expect(document.body.textContent).toContain('Division models the story');
  });

  it('interprets report, discard, and round-up division contexts distinctly', () => {
    loadTool(FILE, ID);
    const report = renderTool(ID, { _arithmeticStudio: { tab: 'apply', wordProblemId: 'w4' } });
    const legacyReport = renderTool(ID, { _arithmeticStudio: { tab: 'apply', operation: 'divide', wordIndex: 0 } });
    const discard = renderTool(ID, { _arithmeticStudio: { tab: 'apply', wordProblemId: 'full-teams' } });
    const roundUp = renderTool(ID, { _arithmeticStudio: { tab: 'apply', wordProblemId: 'supply-boxes' } });

    expect(report).toContain('Amount left over');
    expect(report).toContain('markers per group');
    expect(legacyReport).toContain('data-word-problem-id="w4"');
    expect(discard).toContain('complete teams');
    expect(discard).not.toContain('Amount left over');
    expect(roundUp).toContain('How many boxes are needed');
    expect(roundUp).not.toContain('Amount left over');
  });

  it('tracks missed application stories and clears them through retry-missed', async () => {
    const tool = loadTool(FILE, ID);
    const awardXP = vi.fn();
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _arithmeticStudio: { tab: 'apply', wordProblemId: 'w1' },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const subtraction = document.querySelector('[data-word-operation="subtract"]');
    await React.act(async () => { subtraction.click(); });
    await enterNumber(document.querySelector('input[type="number"]'), '423');
    let check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check response');
    await React.act(async () => { check.click(); });

    expect(latest._arithmeticStudio.wordFeedback).toBe('operation');
    expect(latest._arithmeticStudio.wordMissedCases.w1).toBe(true);
    expect(document.body.textContent).toContain('Retry missed (1)');

    let retry = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Retry missed (1)');
    await React.act(async () => { retry.click(); });
    expect(latest._arithmeticStudio).toMatchObject({ wordProblemId: 'w1', wordOperation: null, wordAnswer: '' });

    const addition = document.querySelector('[data-word-operation="add"]');
    await React.act(async () => { addition.click(); });
    await enterNumber(document.querySelector('input[type="number"]'), '423');
    check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check response');
    await React.act(async () => { check.click(); });

    expect(latest._arithmeticStudio.wordSolvedCases.w1).toBe(true);
    expect(latest._arithmeticStudio.wordAttempts.w1).toBe(2);
    expect(latest._arithmeticStudio.wordMissedCases.w1).toBeUndefined();
    retry = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Retry missed (0)');
    expect(retry.disabled).toBe(true);
    expect(awardXP).toHaveBeenCalledTimes(1);
    await React.act(async () => { root.unmount(); });
  });

  it('supports roving keyboard navigation across linked tabs', async () => {
    const tool = loadTool(FILE, ID);

    function App() {
      const [state, setState] = React.useState({ _arithmeticStudio: { tab: 'learn' } });
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    let tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(tabs[0].getAttribute('aria-controls')).toBe('arithmetic-studio-panel');
    tabs[0].focus();
    await React.act(async () => { tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);
    await React.act(async () => { tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); });
    tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs[3].getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe(tabs[3].id);
    await React.act(async () => { root.unmount(); });
  });

  it('is wired into the host catalog, plugin allowlist, and lazy loader', () => {
    const host = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const app = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    const deployedHost = fs.readFileSync('desktop/web-app/public/stem_lab/stem_lab_module.js', 'utf8');
    expect(host).toContain("id: 'arithmeticStudio'");
    expect(host).toContain('arithmeticStudio: true');
    expect(deployedHost).toBe(host);
    expect(app).toContain("'stem_lab/stem_tool_arithmetic.js'");
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_arithmetic.js', 'utf8')).toBe(fs.readFileSync(FILE, 'utf8'));
  });
});
