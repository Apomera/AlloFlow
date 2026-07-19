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
    expect(pure.assessEstimate('add', 27, 35, '', 60).status).toBe('missing');
    expect(pure.assessEstimate('add', 27, 35, 999, 60).reasonable).toBe(false);
    const practiceQuest = tool.questHooks.find((hook) => hook.id === 'practice_5');
    const errorQuest = tool.questHooks.find((hook) => hook.id === 'error_detective');
    expect(practiceQuest.progress({ practiceSolved: { bogus: true } })).toBe('0/5 correct');
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
    expect(document.body.textContent).toContain('Correct. Your exact answer and estimate support each other');
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
    const deployedHost = fs.readFileSync('prismflow-deploy/public/stem_lab/stem_lab_module.js', 'utf8');
    expect(host).toContain("id: 'arithmeticStudio'");
    expect(host).toContain('arithmeticStudio: true');
    expect(deployedHost).toBe(host);
    expect(app).toContain("'stem_lab/stem_tool_arithmetic.js'");
    expect(fs.readFileSync('prismflow-deploy/public/stem_lab/stem_tool_arithmetic.js', 'utf8')).toBe(fs.readFileSync(FILE, 'utf8'));
  });
});
