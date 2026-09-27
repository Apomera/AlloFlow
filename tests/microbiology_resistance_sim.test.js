import fs from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});

describe('Microbiology resistance investigation', () => {
  it('models a resistance advantage consistently', () => {
    const probabilities = window.__MicrobiologyCore.getResistanceKillProbabilities;
    expect(probabilities(0)).toEqual({ sensitive: 0, resistant: 0 });
    expect(probabilities(5).resistant).toBeLessThan(probabilities(5).sensitive);
    expect(probabilities(100)).toEqual({ sensitive: 1, resistant: 0.05 });
  });

  it('classifies and evaluates observed trends', () => {
    const core = window.__MicrobiologyCore;
    expect(core.classifyResistanceTrend(3, 25)).toBe('increase');
    expect(core.classifyResistanceTrend(50, 53)).toBe('similar');
    expect(core.classifyResistanceTrend(30, 20)).toBe('decrease');
    expect(core.evaluateResistancePrediction(3, 25, 'increase')).toMatchObject({ correct: true, observed: 'increase', change: 22 });
  });

  it('adapts the explanation to initial variation', () => {
    const evaluate = window.__MicrobiologyCore.evaluateResistanceExplanation;
    expect(evaluate(3, 'selection')).toMatchObject({ correct: true, expected: 'selection' });
    expect(evaluate(0, 'variation-required')).toMatchObject({ correct: true, expected: 'variation-required' });
    expect(evaluate(0, 'selection').correct).toBe(false);
  });

  it('treats extinction as an undefined share and reviews the observed mechanism', () => {
    const core = window.__MicrobiologyCore;
    expect(core.classifyResistanceTrend(10, null)).toBe('extinct');
    expect(core.evaluateResistancePrediction(10, null, 'extinct')).toMatchObject({ correct: true, change: null });
    expect(core.evaluateResistanceExplanation(10, 'extinction', { totalAlive: 0, finalPct: null, dose: 100 }).correct).toBe(true);
    expect(core.evaluateResistanceExplanation(10, 'no-selection', { totalAlive: 80, finalPct: 10, dose: 0 }).correct).toBe(true);
    expect(core.evaluateResistanceExplanation(10, 'chance', { totalAlive: 20, finalPct: 5, dose: 60 }).correct).toBe(true);
    expect(core.evaluateResistanceExplanation(10, 'selection', { totalAlive: 20, finalPct: 5, dose: 60 }).correct).toBe(false);
  });

  it('seeds the requested whole-cell count independently of random position', () => {
    const population = window.__MicrobiologyCore.createResistancePopulation;
    for (const random of [() => 0, () => 0.999]) {
      expect(population(0, random).filter(cell => cell.resistant)).toHaveLength(0);
      expect(population(15, random).filter(cell => cell.resistant)).toHaveLength(12);
      expect(population(3, random).filter(cell => cell.resistant)).toHaveLength(2);
      expect(population(100, random)).toHaveLength(80);
    }
  });

  it('normalizes bounded saved runs and reconstructs cells from intact evidence', () => {
    const normalize = window.__MicrobiologyCore.normalizeResistanceInvestigation;
    const corrupt = normalize({ dose: Infinity, duration: 2000, initRes: -5, day: NaN, bact: [{ alive: true }], prediction: {}, explanation: 'unknown', explanationSubmitted: true });
    expect(corrupt).toMatchObject({ version: 1, dose: 60, duration: 30, initRes: 0, day: 0, prediction: null, explanation: null, explanationSubmitted: false });
    expect(corrupt.history).toEqual([{ day: 0, sensitive: 80, resistant: 0 }]);
    expect(corrupt.bact).toHaveLength(80);
    const history = [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 10, resistant: 10 }];
    const restored = normalize({ initRes: 15, history, bact: [], prediction: 'increase', day: 900 });
    expect(restored.day).toBe(1);
    expect(restored.history).toEqual(history);
    expect(restored.bact.filter(cell => cell.alive)).toHaveLength(20);
    expect(restored.bact.filter(cell => cell.alive && cell.resistant)).toHaveLength(10);
    expect(normalize(JSON.parse(JSON.stringify(restored)))).toEqual(restored);
    history[1].resistant = 0;
    expect(restored.history[1].resistant).toBe(10);
    expect(restored.bact.every(cell => Number.isFinite(cell.x) && Number.isFinite(cell.y) && Math.hypot(cell.x - 100, cell.y - 100) < 90.001)).toBe(true);
  });

  it('retains a valid history prefix without inventing cells after extinction or accepting oversized history', () => {
    const normalize = window.__MicrobiologyCore.normalizeResistanceInvestigation;
    const extinct = normalize({ initRes: 0, history: [{ day: 0, sensitive: 80, resistant: 0 }, { day: 1, sensitive: 0, resistant: 0 }, { day: 2, sensitive: 0, resistant: 10 }] });
    expect(extinct.day).toBe(1);
    expect(extinct.history).toHaveLength(2);
    expect(extinct.bact.filter(cell => cell.alive)).toHaveLength(0);
    const bounded = normalize({ duration: 30, history: Array.from({ length: 200 }, (_, day) => ({ day, sensitive: 78, resistant: 2 })) });
    expect(bounded.history).toHaveLength(31);
    expect(bounded.day).toBe(30);
    const broken = normalize({ history: [{ day: 0, sensitive: 78, resistant: 2 }, { day: 1, sensitive: NaN, resistant: 2 }] });
    expect(broken.day).toBe(0);
    expect(broken.history).toHaveLength(1);
  });

  it('keeps the workflow explicit and accessible', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
    expect(source).toContain('1. Predict the resistant share after exposure');
    expect(source).toContain('Choose a prediction to unlock the culture controls.');
    expect(source).toContain('disabled: !investigationReady || finished');
    expect(source).toContain("name: 'micro-resistance-prediction'");
    expect(source).toContain('2. Observe: ');
    expect(source).toContain('3. Explain the observed pattern');
    expect(source).toContain("name: 'micro-resistance-explanation'");
    expect(source).toContain("role: 'status', 'aria-live': 'polite'");
    expect(source).not.toContain('var killRes = 0.05;');
  });
});

describe('Mounted resistance controls', { timeout: 20000 }, () => {
  let container;
  let root;
  let latestData;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    root = null;
    container.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  function mount(seed = {}, awardXP = vi.fn()) {
    const config = window.StemLab._registry.microbiology;
    function Host() {
      const [toolData, setToolData] = React.useState({ microbiology: { tab: 'resistance', ...seed } });
      latestData = toolData;
      return config.render(makeCtx({ toolData, setToolData, awardXP }));
    }
    root = ReactDOMClient.createRoot(container);
    act(() => root.render(React.createElement(Host)));
  }

  function click(text) {
    const button = [...container.querySelectorAll('button')].find(node => node.textContent.trim() === text);
    expect(button, text).toBeDefined();
    act(() => button.click());
    return button;
  }

  function range(label, value) {
    const input = container.querySelector(`input[aria-label="${label}"]`);
    expect(input, label).not.toBeNull();
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(value));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function predict(value) {
    act(() => container.querySelector(`input[name="micro-resistance-prediction"][value="${value}"]`).click());
  }

  function counts() {
    return [...container.querySelectorAll('details table tbody tr')].map(row => [...row.cells].map(cell => cell.textContent));
  }

  function tab(id) { act(() => container.querySelector('#micro-tab-' + id).click()); }

  it('updates the live culture when the slider changes and starts Play and Step from that culture', () => {
    mount();
    range('Initial resistance', 15);
    expect(counts()).toEqual([['0', '68', '12', '15%']]);
    predict('increase');
    click('Step round');
    expect(counts()[1]).toEqual(['1', '0', '12', '100%']);
    click('↺ Reset');
    predict('increase');
    click('▶ Play');
    expect(counts()).toEqual([['0', '68', '12', '15%']]);
    act(() => vi.advanceTimersByTime(600));
    expect(counts()[1]).toEqual(['1', '0', '12', '100%']);
  });

  it('ends an extinct run with an undefined percentage and an extinction explanation', () => {
    mount();
    range('Initial resistance', 0);
    range('Antibiotic exposure strength in the teaching model', 100);
    predict('extinct');
    click('Step round');
    expect(counts()[1]).toEqual(['1', '0', '0', 'Undefined']);
    expect(container.textContent).toContain('Prediction matched. The population died out.');
    expect(container.textContent).toContain('The resistant share is undefined (no survivors)');
    expect(click('Step round').disabled).toBe(true);
    act(() => container.querySelector('input[name="micro-resistance-explanation"][value="extinction"]').click());
    click('Submit explanation');
    expect(container.textContent).toContain('Explanation confirmed. No cells survived.');
  });

  it('keeps the zero-exposure control unchanged and does not claim selection increased resistance', () => {
    mount();
    range('Initial resistance', 15);
    range('Antibiotic exposure strength in the teaching model', 0);
    range('Number of exposure rounds in the teaching model', 3);
    predict('similar');
    for (let i = 0; i < 3; i++) click('Step round');
    expect(counts()[3]).toEqual(['3', '68', '12', '15%']);
    act(() => container.querySelector('input[name="micro-resistance-explanation"][value="no-selection"]').click());
    click('Submit explanation');
    expect(container.textContent).toContain('Explanation confirmed. With zero exposure');
  });

  it('preserves an in-progress culture through tab navigation and pauses until playback is requested again', () => {
    mount({ growthLab: { hypothesis: 'Preserve another investigation' } });
    range('Initial resistance', 15);
    predict('increase');
    click('▶ Play');
    act(() => vi.advanceTimersByTime(600));
    const saved = JSON.parse(JSON.stringify(latestData.microbiology.resistanceInvestigation));
    expect(saved.day).toBe(1);
    expect(saved.history[1]).toEqual({ day: 1, sensitive: 0, resistant: 12 });
    tab('home');
    act(() => vi.advanceTimersByTime(5000));
    expect(latestData.microbiology.resistanceInvestigation).toEqual(saved);
    tab('resistance');
    expect(counts()).toEqual([['0', '68', '12', '15%'], ['1', '0', '12', '100%']]);
    expect(container.querySelector('input[name="micro-resistance-prediction"][value="increase"]').checked).toBe(true);
    expect([...container.querySelectorAll('button')].some(node => node.textContent.trim() === '▶ Play')).toBe(true);
    act(() => vi.advanceTimersByTime(5000));
    expect(latestData.microbiology.resistanceInvestigation).toEqual(saved);
    expect(latestData.microbiology.growthLab.hypothesis).toBe('Preserve another investigation');
    click('▶ Play');
    act(() => vi.advanceTimersByTime(600));
    expect(latestData.microbiology.resistanceInvestigation.day).toBe(2);
  });

  it('restores a submitted explanation after JSON storage and remount without awarding the same work again', () => {
    const awardXP = vi.fn();
    mount({}, awardXP);
    range('Antibiotic exposure strength in the teaching model', 0);
    range('Number of exposure rounds in the teaching model', 3);
    predict('similar');
    for (let i = 0; i < 3; i++) click('Step round');
    act(() => container.querySelector('input[name="micro-resistance-explanation"][value="no-selection"]').click());
    click('Submit explanation');
    const saved = JSON.parse(JSON.stringify(latestData.microbiology));
    expect(saved.resistanceInvestigation).toMatchObject({ day: 3, runAwarded: true, explanationAwarded: true, explanationSubmitted: true });
    expect(awardXP.mock.calls).toEqual([[3], [2]]);
    act(() => root.unmount());
    root = null;
    mount(saved, awardXP);
    expect(container.textContent).toContain('Explanation confirmed. With zero exposure');
    expect(counts()).toHaveLength(4);
    expect(container.querySelector('input[name="micro-resistance-explanation"][value="no-selection"]').checked).toBe(true);
    expect(container.querySelector('input[name="micro-resistance-explanation"][value="no-selection"]').disabled).toBe(true);
    tab('home');
    tab('resistance');
    act(() => vi.advanceTimersByTime(5000));
    expect(awardXP.mock.calls).toEqual([[3], [2]]);
    expect(latestData.microbiology.resistanceInvestigation).toEqual(saved.resistanceInvestigation);
  });

  it('resumes valid saved observations even if a damaged snapshot lacks its original prediction', () => {
    mount({ resistanceInvestigation: { initRes: 15, duration: 3, history: [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 0, resistant: 12 }] } });
    expect(container.textContent).toContain('No prediction was saved for this restored run');
    expect(click('Step round').disabled).toBe(false);
    expect(latestData.microbiology.resistanceInvestigation.day).toBe(2);
  });
});
