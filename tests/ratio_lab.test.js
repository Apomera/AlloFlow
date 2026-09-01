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

const FILE = 'stem_lab/stem_tool_ratios.js';
const ID = 'ratioLab';

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});

describe('Ratios, Rates & Proportions Lab', () => {
  it('registers and exposes reliable proportional-reasoning helpers', () => {
    const tool = loadTool(FILE, ID);
    expect(tool.label).toBe('Ratios, Rates & Proportions Lab');
    expect(tool.category).toBe('math');

    const pure = window.RatioLabPure;
    expect(pure.gcd(18, 24)).toBe(6);
    expect(pure.parsePairs('0,1,2', '0,3,6')).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 3 }, { x: 2, y: 6 },
    ]);
    expect(pure.analyzeProportionalPairs([{ x: 0, y: 0 }, { x: 2, y: 7 }, { x: 4, y: 14 }])).toMatchObject({
      valid: true, proportional: true, constant: 3.5,
    });
    expect(pure.analyzeProportionalPairs([{ x: 0, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 6 }])).toMatchObject({
      proportional: false, hasInvalidOrigin: true,
    });
    expect(pure.analyzeProportionalPairs([
      { x: 1, y: 1_000_000_000_000 }, { x: 2, y: 2_000_000_000_001 },
    ]).proportional).toBe(false);
    expect(pure.analyzeProportionalPairs([
      { x: 1, y: 1_000_000_000_000 }, { x: 2, y: 2_000_000_000_000 },
    ]).proportional).toBe(true);

    const mismatched = pure.parsePairInput('0,1,2', '0,3');
    expect(mismatched.complete).toBe(false);
    expect(mismatched.errors).toContain('Enter the same number of x-values and y-values.');
    expect(pure.analyzeProportionalPairs(mismatched).valid).toBe(false);
    const malformed = pure.parsePairInput('0,1,nope,2', '0,3,999,6');
    expect(malformed.errors).toContain('Row 3: use numbers only.');
    expect(pure.analyzeProportionalPairs(malformed)).toMatchObject({ valid: false, proportional: false });
    expect(pure.parsePairs('0,1,nope,2', '0,3,999,6')).toEqual([]);
    expect(pure.analyzeProportionalPairs(pure.parsePairs('0,1,nope,2', '0,3,999,6'))).toMatchObject({
      valid: false, proportional: false,
    });

    expect(pure.percentSegmentFills(35)).toEqual([1, 1, 1, 0.5, 0, 0, 0, 0, 0, 0]);
    expect(pure.percentSegmentFills(24.5)).toEqual([1, 1, 0.45, 0, 0, 0, 0, 0, 0, 0]);
    expect(pure.percentTapeModel(235)).toMatchObject({
      percent: 235,
      wholeCount: 2,
      remainderPercent: 35,
      totalTapeCount: 3,
      hiddenWholeCount: 0,
    });
    expect(pure.percentTapeModel(235).tapes.map((tape) => tape.percent)).toEqual([100, 100, 35]);
    expect(pure.percentTapeSummary(pure.percentTapeModel(235))).toBe('235% equals 2 complete wholes plus 35% of another whole.');
    expect(pure.percentTapeModel(Number.MAX_VALUE)).toMatchObject({ percent: 1000, limited: true, wholeCount: 10 });
    expect(Number.isFinite(pure.roundTo(Number.MAX_VALUE, 3))).toBe(true);
    expect(pure.roundTo(1.005, 2)).toBe(1.01);
    expect(pure.positiveAxisMaximum([0, 0.1, 0.4])).toBe(0.4);
    expect(pure.positiveAxisMaximum([0, 0])).toBe(1);

    const explorer = tool.questHooks.find((hook) => hook.id === 'ratio_explorer');
    const challenger = tool.questHooks.find((hook) => hook.id === 'ratio_challenger');
    expect(explorer.progress({ modesVisited: { ratioTable: true, bogus: true } })).toBe('1/5 modes');
    expect(challenger.progress({ solvedChallenges: { bogus: true } })).toBe('0/5 solved');
  });

  it('parses challenge answers with strict punctuation and valid numeric symbols', () => {
    loadTool(FILE, ID);
    const pure = window.RatioLabPure;

    expect(pure.parseNumericChallengeAnswer('$1,200.50')).toBe(1200.5);
    expect(pure.parseNumericChallengeAnswer('25%')).toBe(25);
    for (const malformed of ['1$2', '1%2', '1,2', '3,:4', '$12%']) {
      expect(pure.parseNumericChallengeAnswer(malformed)).toBeNull();
    }
    expect(pure.challengeIsCorrect({ answer: 24 }, '$24')).toBe(true);
    expect(pure.challengeIsCorrect({ answer: 24 }, '24%')).toBe(true);
    expect(pure.challengeIsCorrect({ answer: 12 }, '1$2')).toBe(false);
    expect(pure.challengeIsCorrect({ answer: 12 }, '1,2')).toBe(false);
    expect(pure.challengeIsCorrect({ answers: ['3:4', '3/4'] }, '3 : 4')).toBe(true);
    expect(pure.challengeIsCorrect({ answers: ['3:4', '3/4'] }, '3,:4')).toBe(false);
  });

  it('renders exact fractional percent fills and multiple wholes above 100%', () => {
    loadTool(FILE, ID);
    const fractional = renderTool(ID, { _ratioLab: { mode: 'percent', percentValue: 24.5, percentWhole: 80 } });
    expect(fractional).toContain('24.5% fills 24.5% of one whole');
    expect(fractional).toContain('data-tape-percent="24.5"');
    expect(fractional).toContain('data-fill-fraction="0.45"');
    expect(fractional).toContain('The next section is 45% filled, representing 4.5% of the whole');
    expect(fractional).not.toContain('rounded up visually');

    const multiWhole = renderTool(ID, { _ratioLab: { mode: 'percent', percentValue: 235, percentWhole: 80 } });
    expect(multiWhole).toContain('235% equals 2 complete wholes plus 35% of another whole');
    expect(multiWhole).toContain('data-percent-tape-count="3"');
    expect(multiWhole.match(/data-percent-tape="/g)).toHaveLength(3);
    expect(multiWhole).toContain('Whole 3 percent tape: 35% filled');
    expect(multiWhole).toContain('data-fill-fraction="0.5"');
    expect(multiWhole).toContain('aria-labelledby="ratio-percent-tape-title-2 ratio-percent-tape-desc-2"');
  });

  it('bounds extreme percent models without leaking Infinity', () => {
    loadTool(FILE, ID);
    const hugePart = renderTool(ID, {
      _ratioLab: { mode: 'percent', percentKind: 'findPart', percentValue: Number.MAX_VALUE, percentWhole: Number.MAX_VALUE },
    });
    expect(hugePart).toContain('This result is above the 1,000,000 quantity limit');
    expect(hugePart).toContain('Learning-model range: 0% to 1000%; quantities up to 1,000,000');
    expect(hugePart).not.toContain('Infinity');

    const hugeRate = renderTool(ID, {
      _ratioLab: { mode: 'percent', percentKind: 'findPercent', percentPart: 1_000_000, percentWhole: Number.MIN_VALUE },
    });
    expect(hugeRate).toContain('This example is above the 1000% learning-model limit');
    expect(hugeRate).not.toContain('Infinity');
  });

  it('renders all five representations without degraded output', () => {
    loadTool(FILE, ID);
    const expected = {
      ratioTable: 'Equivalent ratio table',
      numberLine: 'Double number line',
      unitRates: 'Cost for 1 unit',
      percent: 'Choose the unknown',
      proportional: 'Table and unit-rate evidence',
    };
    for (const [mode, anchor] of Object.entries(expected)) {
      const html = renderTool(ID, { _ratioLab: { mode } });
      expect(html).toContain('Ratios, Rates &amp; Proportions Lab');
      expect(html).toContain(anchor);
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
    }
  });

  it('handles zero-quantity unit rates and invalid table rows safely', () => {
    loadTool(FILE, ID);
    const rates = renderTool(ID, { _ratioLab: { mode: 'unitRates', amountA: 0, amountB: 0 } });
    expect(rates).toContain('Needs a quantity');
    expect(rates).not.toContain('Infinity');

    const table = renderTool(ID, { _ratioLab: { mode: 'proportional', propX: '0, nope', propY: '2, 4' } });
    expect(table).toContain('Row 2: use numbers only');
    expect(table).not.toContain('Proportional: the unit rate is constant');
    expect(table).not.toContain('NaN');
  });

  it('scales proportional graphs to their actual positive decimal maxima', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {
      _ratioLab: { mode: 'proportional', propX: '0.1,0.2,0.4', propY: '0.15,0.3,0.6' },
    });
    expect(html).toContain('data-axis-max-x="0.4"');
    expect(html).toContain('data-axis-max-y="0.6"');
    expect(html).toContain('cx="332"');
    expect(html).toContain('cy="40"');
    expect(html).toContain('x quantity');
    expect(html).toContain('y quantity');
    expect(html.match(/stroke-dasharray="3 4"/g)).toHaveLength(6);
    expect(html).toContain('Proportional: the unit rate is constant');
  });

  it('bounds unit-rate modeling and never treats non-finite rates as equal', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {
      _ratioLab: { mode: 'unitRates', amountA: 0.1, costA: 1e308, amountB: 1, costB: 1 },
    });
    expect(html).toContain('Option B has the lower cost per unit.');
    expect(html).toContain('max="1000000"');
    expect(html).not.toContain('Infinity');
    expect(html).not.toContain('Both options have the same cost per unit.');

    const overflow = renderTool(ID, {
      _ratioLab: { mode: 'unitRates', amountA: Number.MIN_VALUE, costA: 1, amountB: 1, costB: 1 },
    });
    expect(overflow).toContain('Rate outside model range');
    expect(overflow).not.toContain('Infinity');
    expect(overflow).not.toContain('Both options have the same cost per unit.');

    const underflow = window.RatioLabPure.analyzeProportionalPairs([
      { x: Number.MAX_VALUE, y: Number.MIN_VALUE },
      { x: Number.MAX_VALUE / 2, y: Number.MIN_VALUE },
    ]);
    expect(underflow).toMatchObject({ valid: false, proportional: false, hasUnrepresentableRate: true });
    expect(underflow.errors).toContain('Coordinate magnitudes are too far apart to calculate a reliable unit rate. Use less extreme values.');
  });

  it('distinguishes very small unequal unit rates without rounding both displays to zero', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {
      _ratioLab: { mode: 'unitRates', amountA: 1_000_000, costA: 1, amountB: 1_000_000, costB: 2 },
    });
    expect(html).toContain('Option A has the lower cost per unit.');
    expect(html).not.toContain('Both options have the same cost per unit.');
    expect(html).toContain('$0.000001');
    expect(html).toContain('$0.000002');

    const evidence = window.RatioLabPure.formatUnitRateEvidence([
      { x: 1, y: 1.0001 }, { x: 1, y: 1.0002 },
    ]);
    expect(evidence.digits).toBeGreaterThan(3);
    expect(new Set(evidence.displays).size).toBe(2);

    const proportional = renderTool(ID, {
      _ratioLab: { mode: 'proportional', propX: '1000000,1000000', propY: '1,2' },
    });
    expect(proportional).toContain('Not proportional');
    expect(proportional).toContain('0.000001');
    expect(proportional).toContain('0.000002');
  });

  it('hides stale models while drafts are invalid and exposes accessible field errors', () => {
    loadTool(FILE, ID);
    const ratio = renderTool(ID, {
      _ratioLab: { mode: 'ratioTable', ratioA: 3, ratioB: 5, ratioFactor: 4, ratioADraft: '3.5' },
    });
    expect(ratio).toContain('aria-invalid="true"');
    expect(ratio).toContain('aria-describedby="ratio-field-error-ratioA"');
    expect(ratio).toContain('Enter a whole number for First quantity.');
    expect(ratio).toContain('The equivalent-ratio table is waiting for valid whole-number inputs.');
    expect(ratio).not.toContain('Scaled ratio');

    const percent = renderTool(ID, {
      _ratioLab: { mode: 'percent', percentKind: 'findPart', percentValue: 25, percentWhole: 80, percentWholeDraft: '' },
    });
    expect(percent).toContain('aria-describedby="ratio-field-error-percentWhole"');
    expect(percent).toContain('Enter a value for Whole.');
    expect(percent).toContain('Finish the inputs');
    expect(percent).not.toContain('data-percent-tape-total');

    document.body.innerHTML = renderTool(ID, {
      _ratioLab: { mode: 'ratioTable', ratioA: 3.5, ratioB: 101, ratioFactor: 12.7 },
    });
    expect(document.querySelector('[aria-label="First quantity"]').value).toBe('4');
    expect(document.querySelector('[aria-label="Second quantity"]').value).toBe('100');
    expect(document.querySelector('[aria-label="Scale factor"]').value).toBe('12');
    expect(document.body.textContent).toContain('48:1200');
  });

  it('preserves the percent relationship when the selected unknown changes', async () => {
    const tool = loadTool(FILE, ID);
    let latest;
    const announceToSR = vi.fn();

    function App() {
      const [state, setState] = React.useState({
        _ratioLab: {
          mode: 'percent', percentKind: 'findPart',
          percentWhole: 120, percentValue: 25, percentPart: 999,
          percentWholeDraft: '120.0', percentValueDraft: '25.0', percentPartDraft: '999',
        },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, announceToSR }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    expect(document.getElementById('ratio-percent-result-value').textContent).toBe('30');
    expect(document.querySelector('[role="status"][aria-live="polite"][aria-atomic="true"]')).toBeTruthy();

    let selector = document.getElementById('ratio-percent-kind');
    await React.act(async () => {
      selector.value = 'findPercent';
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(latest._ratioLab).toMatchObject({
      percentKind: 'findPercent', percentWhole: 120, percentPart: 30,
      percentWholeDraft: null, percentValueDraft: null, percentPartDraft: null,
    });
    expect(document.querySelector('[aria-label="Part"]').value).toBe('30');
    expect(document.getElementById('ratio-percent-result-value').textContent).toBe('25%');

    selector = document.getElementById('ratio-percent-kind');
    await React.act(async () => {
      selector.value = 'findWhole';
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(latest._ratioLab).toMatchObject({ percentKind: 'findWhole', percentValue: 25, percentPart: 30 });
    expect(document.getElementById('ratio-percent-result-value').textContent).toBe('120');
    expect(announceToSR).toHaveBeenCalledWith('Now finding Percent.');
    expect(announceToSR).toHaveBeenCalledWith('Now finding Whole.');
    await React.act(async () => { root.unmount(); });
  });

  it('does not model an undefined percent as a zero-percent tape', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {
      _ratioLab: { mode: 'percent', percentKind: 'findPercent', percentWhole: 0, percentPart: 20 },
    });
    expect(html).toContain('The percent is not defined when the whole is zero');
    expect(html).toContain('id="ratio-percent-result-value"');
    expect(html).not.toContain('data-percent-tape-total');
    expect(html).not.toContain('0% fills none of the whole');
  });

  it('clears wrong-answer feedback as soon as the challenge answer changes', async () => {
    const tool = loadTool(FILE, ID);
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _ratioLab: {
          mode: 'ratioTable', challengeId: 'ratio-paint',
          challengeCursorByMode: { ratioTable: 'ratio-paint' },
          challengeAnswer: '10', challengeAnswerId: 'ratio-paint',
        },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    await React.act(async () => { check.click(); });
    let input = document.getElementById('ratio-challenge-answer');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById('ratio-challenge-feedback')).toBeTruthy();

    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    await React.act(async () => {
      valueSetter.call(input, '11');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    input = document.getElementById('ratio-challenge-answer');
    expect(latest._ratioLab.challengeAnswer).toBe('11');
    expect(latest._ratioLab.challengeFeedback).toBeNull();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(document.getElementById('ratio-challenge-feedback')).toBeNull();
    await React.act(async () => { root.unmount(); });
  });

  it('scopes challenge answers, feedback, and cursors to stable challenge IDs', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {
      _ratioLab: {
        mode: 'ratioTable', challengeIndex: 0, challengeId: 'ratio-paint',
        challengeCursorByMode: { ratioTable: 'ratio-scale' },
        challengeAnswer: '12', challengeAnswerId: 'ratio-paint',
        challengeFeedback: { correct: true, message: 'Stale positional feedback' },
      },
    });
    document.body.innerHTML = html;
    expect(document.getElementById('ratio-challenge-prompt').textContent).toContain('Scale the ratio 7:4');
    expect(document.getElementById('ratio-challenge-answer').value).toBe('');
    expect(document.body.textContent).not.toContain('Stale positional feedback');
  });

  it('marks a deterministic mounted challenge solved and awards scoped XP', async () => {
    const tool = loadTool(FILE, ID);
    let latest;
    const awardXP = vi.fn();

    function App() {
      const [state, setState] = React.useState({
        _ratioLab: {
          mode: 'ratioTable', challengeId: 'ratio-paint',
          challengeCursorByMode: { ratioTable: 'ratio-paint' },
          challengeAnswer: '12', challengeAnswerId: 'ratio-paint',
        },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    expect(check).toBeTruthy();
    await React.act(async () => { check.click(); check.click(); });
    expect(latest._ratioLab.solvedChallenges['ratio-paint']).toBe(true);
    expect(document.body.textContent).toContain('Correct!');
    expect(document.body.textContent).toContain('Solved');
    expect(awardXP).toHaveBeenCalledWith('ratioLab', 15, 'Ratio Lab challenge');
    expect(awardXP).toHaveBeenCalledTimes(1);
    const next = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Next challenge');
    await React.act(async () => { next.click(); });
    expect(latest._ratioLab.challengeId).toBe('ratio-simplify');
    expect(latest._ratioLab.challengeCursorByMode.ratioTable).toBe('ratio-simplify');
    expect(latest._ratioLab.challengeAnswerId).toBeNull();
    await React.act(async () => { root.unmount(); });
  });
  it('tracks missed challenges and supports previous and retry navigation', async () => {
    const tool = loadTool(FILE, ID);
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _ratioLab: {
          mode: 'ratioTable', challengeId: 'ratio-paint',
          challengeCursorByMode: { ratioTable: 'ratio-paint' },
          challengeAnswer: '10', challengeAnswerId: 'ratio-paint',
        },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    let button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Check answer');
    await React.act(async () => { button.click(); });
    expect(latest._ratioLab.missedChallenges['ratio-paint']).toBe(true);
    expect(latest._ratioLab.challengeAttempts).toBe(1);
    expect(document.body.textContent).toContain('Retry missed (1)');

    button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Retry missed (1)');
    await React.act(async () => { button.click(); });
    expect(latest._ratioLab.challengeId).toBe('ratio-paint');
    expect(latest._ratioLab.challengeAnswer).toBe('');

    button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Previous challenge');
    await React.act(async () => { button.click(); });
    expect(latest._ratioLab.challengeId).toBe('ratio-scale');
    expect(latest._ratioLab.challengeCursorByMode.ratioTable).toBe('ratio-scale');
    await React.act(async () => { root.unmount(); });
  });
  it('reveals challenge hints in two stages and resets them on navigation', async () => {
    const tool = loadTool(FILE, ID);
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _ratioLab: {
          mode: 'ratioTable', challengeId: 'ratio-paint',
          challengeCursorByMode: { ratioTable: 'ratio-paint' },
        },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    let button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Show hint 1');
    await React.act(async () => { button.click(); });
    expect(latest._ratioLab.challengeHintStage).toBe(1);
    expect(document.getElementById('ratio-challenge-hints').textContent).toContain('one scale factor');
    expect(document.getElementById('ratio-challenge-hints').textContent).not.toContain('multiplied by 4');

    button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Show hint 2');
    await React.act(async () => { button.click(); });
    expect(latest._ratioLab.challengeHintStage).toBe(2);
    expect(document.getElementById('ratio-challenge-hints').textContent).toContain('multiplied by 4');

    button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Next challenge');
    await React.act(async () => { button.click(); });
    expect(latest._ratioLab.challengeHintStage).toBe(0);
    expect(latest._ratioLab.challengeHintId).toBeNull();
    expect(document.getElementById('ratio-challenge-hints')).toBeNull();
    await React.act(async () => { root.unmount(); });
  });
  it('restores and locks the canonical answer and explanation for solved challenges', async () => {
    const tool = loadTool(FILE, ID);

    function App() {
      const [state, setState] = React.useState({
        _ratioLab: {
          mode: 'ratioTable',
          challengeAnswer: '',
          challengeFeedback: { correct: false, message: 'Stale feedback' },
          solvedChallenges: { 'ratio-paint': true },
        },
      });
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const input = document.getElementById('ratio-challenge-answer');
    expect(input.value).toBe('12');
    expect(input.readOnly).toBe(true);
    expect(input.dataset.solvedAnswer).toBe('true');
    expect(input.getAttribute('aria-labelledby')).toBe('ratio-challenge-prompt ratio-challenge-answer-label');
    expect(document.getElementById('ratio-challenge-prompt').textContent).toContain('paint mix');
    expect(document.getElementById('ratio-challenge-answer-label')).toBeTruthy();
    expect(document.getElementById('allo-ratio-lab-focus-css').textContent).toContain(':focus-visible');
    input.focus();
    expect(document.activeElement).toBe(input);
    expect(document.body.textContent).toContain('Solved previously.');
    expect(document.body.textContent).toContain('both quantities were multiplied by 4');
    expect([...document.querySelectorAll('button')].find((button) => button.textContent === 'Solved').disabled).toBe(true);
    await React.act(async () => { root.unmount(); });
  });

  it('refuses malformed coordinate verdicts and models omitted origins honestly', () => {
    loadTool(FILE, ID);
    const mismatched = renderTool(ID, { _ratioLab: { mode: 'proportional', propX: '0,1,2', propY: '0,3' } });
    expect(mismatched).toContain('Enter the same number of x-values and y-values');
    expect(mismatched).toContain('Row 3: enter both an x-value and a y-value');
    expect(mismatched).not.toContain('Proportional: the unit rate is constant');

    const negative = renderTool(ID, { _ratioLab: { mode: 'proportional', propX: '-1,-2', propY: '-3,-6' } });
    expect(negative).toContain('first-quadrant graph requires nonnegative values');
    expect(negative).toContain('No complete set of points is available to graph');
    expect(negative).not.toContain('Proportional: the unit rate is constant');

    const omittedOrigin = renderTool(ID, { _ratioLab: { mode: 'proportional', propX: '1,2', propY: '3,6' } });
    expect(omittedOrigin).toContain('data-proportional-ray="true"');
    expect(omittedOrigin).toContain('origin was not entered');
    expect(omittedOrigin).toContain('Graph of 2 plotted table points');
  });

  it('uses contrast-safe text and surfaces in high-contrast mode', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, { _ratioLab: { mode: 'percent', percentValue: 50 } }, { isContrast: true });
    expect(html).toContain('background:#ffff00;color:#000000');
    expect(html).not.toContain('background:#ffff00;color:#ffffff');
    expect(html).toContain('background:#000000;border:2px solid #ffff00');
    const table = renderTool(ID, { _ratioLab: { mode: 'ratioTable', ratioFactor: 4 } }, { isContrast: true });
    expect(table).toContain('background:#ffff00;color:#000000');
    expect(table).not.toContain('background:#eef2ff;color:#ffffff');
  });

  it('uses a readable dark accent and preserves the challenge focus treatment', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, { _ratioLab: { mode: 'ratioTable' } }, { isDark: true });
    expect(html).toContain('background:#a5b4fc;color:#111827');
    expect(html).not.toContain('background:#4338ca;color:#ffffff');
    expect(html).toContain('class="ratio-challenge-answer');
    expect(html).not.toContain('outline-none');
    expect(html).toContain('aria-labelledby="ratio-challenge-prompt ratio-challenge-answer-label"');
  });

  it('supports Arrow, Home, and End navigation in the mode tablist', async () => {
    const tool = loadTool(FILE, ID);

    function App() {
      const [state, setState] = React.useState({ _ratioLab: { mode: 'ratioTable' } });
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    let tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1, -1]);
    for (const tab of tabs) {
      expect(document.getElementById(tab.getAttribute('aria-controls'))).toBeTruthy();
    }
    tabs[0].focus();
    await React.act(async () => { tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);
    await React.act(async () => { tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); });
    tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs[4].getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe(tabs[4].id);
    await React.act(async () => { root.unmount(); });
  });

  it('is wired into the host catalog, plugin allowlist, lazy loader, and deployment mirrors', () => {
    const host = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const deployedHost = fs.readFileSync('desktop/web-app/public/stem_lab/stem_lab_module.js', 'utf8');
    const app = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(host).toContain("id: 'ratioLab'");
    expect(host).toContain('ratioLab: true');
    expect(deployedHost).toBe(host);
    expect(app).toContain("'stem_lab/stem_tool_ratios.js'");
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_ratios.js', 'utf8')).toBe(fs.readFileSync(FILE, 'utf8'));
  });
});
