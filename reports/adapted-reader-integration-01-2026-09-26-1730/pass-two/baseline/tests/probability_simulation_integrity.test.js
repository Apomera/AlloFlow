import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_probability.js';

function renderProbability(probability) {
  return renderTool('probability', {
    probability: {
      mode: 'coin',
      results: [],
      trials: 0,
      convergenceHistory: [],
      lastResult: null,
      animTick: 0,
      ...probability,
    },
  });
}

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE_PATH, 'probability');
});

describe('Probability Lab simulation integrity', () => {
  it('normalizes dice sides and clamps random samples to valid faces', () => {
    const roll = window.__ProbabilityCore.rollDicePair;

    expect(roll(6, 0, 0)).toEqual({ first: 1, second: 1, sum: 2 });
    expect(roll(6, 1, 1)).toEqual({ first: 6, second: 6, sum: 12 });
    expect(roll(4.9, 0.5, 0.7499)).toEqual({ first: 3, second: 3, sum: 6 });
    expect(roll(1, 0.999, 0.499)).toEqual({ first: 2, second: 1, sum: 3 });
    expect(roll(Number.NaN, '0.5', '0.999')).toEqual({ first: 4, second: 6, sum: 10 });
    expect(roll(8, -4, 5)).toEqual({ first: 1, second: 8, sum: 9 });
    expect(roll(8, Number.NaN, Number.POSITIVE_INFINITY)).toEqual({ first: 1, second: 1, sum: 2 });
  });

  it('returns a fresh dice-pair result without mutating caller data', () => {
    const roll = window.__ProbabilityCore.rollDicePair;
    const inputs = Object.freeze({ sides: 12, randomA: 0.25, randomB: 0.75 });
    const first = roll(inputs.sides, inputs.randomA, inputs.randomB);
    const second = roll(inputs.sides, inputs.randomA, inputs.randomB);

    expect(first).toEqual({ first: 4, second: 10, sum: 14 });
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    first.first = 99;
    expect(second).toEqual({ first: 4, second: 10, sum: 14 });
    expect(inputs).toEqual({ sides: 12, randomA: 0.25, randomB: 0.75 });
  });

  it('clears every current-run field while a caller merge preserves configuration and lifetime progress', () => {
    const prior = {
      mode: 'dice2',
      diceSides: 12,
      muted: true,
      customOutcomes: [{ label: 'Keep me', count: 3 }],
      totalTrials: 4321,
      experimentsUsed: { coin: true, dice2: true },
      _completedChallenges: ['law1000'],
      results: [7, 9],
      trials: 2,
      convergenceHistory: [{ n: 2, p: 0.5 }],
      lastResult: 9,
      _mbRemaining: ['Red'],
      _piPoints: [{ x: 0.1, y: 0.1, inside: true }],
      _piTotal: 37,
      _piInside: 29,
      _lastPair: [4, 5],
      animTick: 8,
      _mbShaking: true,
      _autoRunning: true,
      _piSlowRunning: true,
      galtonFalling: [{ id: 1 }],
      _aiExplanation: 'stale explanation',
      _aiLoading: true,
      _bestStreak: 6,
    };
    const patch = window.__ProbabilityCore.resetPatch();
    const next = { ...prior, ...patch };

    expect(patch).toEqual({
      results: [], trials: 0, convergenceHistory: [], lastResult: null,
      _mbRemaining: null, _piPoints: [], _piTotal: 0, _piInside: 0,
      _lastPair: null, animTick: 0, _mbShaking: false,
      _autoRunning: false, _piSlowRunning: false, galtonFalling: [],
      _aiExplanation: null, _aiLoading: false, _bestStreak: 0,
    });
    expect(next).toMatchObject({
      mode: 'dice2', diceSides: 12, muted: true,
      customOutcomes: prior.customOutcomes,
      totalTrials: 4321,
      experimentsUsed: prior.experimentsUsed,
      _completedChallenges: prior._completedChallenges,
      ...patch,
    });
    expect(patch).not.toHaveProperty('mode');
    expect(patch).not.toHaveProperty('diceSides');
    expect(patch).not.toHaveProperty('customOutcomes');
    expect(patch).not.toHaveProperty('totalTrials');
    expect(patch).not.toHaveProperty('experimentsUsed');
    expect(patch).not.toHaveProperty('_completedChallenges');
  });

  it('exports the bounded Auto-Run trial limit', () => {
    expect(window.__ProbabilityCore.autoTrialLimit).toBe(10000);
  });

  it('renders no fabricated coin or two-dice result before any trial', () => {
    const coinHtml = renderProbability({ mode: 'coin' });
    expect(coinHtml).not.toContain('Coin showing heads');
    expect(coinHtml).not.toContain('Coin showing tails');

    const diceHtml = renderProbability({ mode: 'dice2', diceSides: 6, _lastPair: null });
    expect(diceHtml).not.toContain('aria-label="d6 showing 1"');
  });

  it('renders an honest no-evidence state for the Monte Carlo pi estimate', () => {
    const html = renderProbability({
      mode: 'pi',
      _piPoints: [],
      _piTotal: 0,
      _piInside: 0,
    });

    expect(html).toContain('No estimate yet — throw a dart.');
    expect(html).toContain('aria-label="Slow-drop 100 points one at a time"');
    expect(html).not.toContain('4 × 0 / 0');
    expect(html).not.toContain('pi estimate 0.0000');
    expect(html).not.toContain('π ≈ 0.0000');
  });

  it('explains the Auto-Run ceiling and disables continuation at the limit', () => {
    const limit = window.__ProbabilityCore.autoTrialLimit;
    const results = Array.from({ length: limit }, (_, index) => index % 2 === 0 ? 'H' : 'T');
    const html = renderProbability({
      mode: 'coin',
      results,
      trials: limit,
      lastResult: 'T',
      _autoRunning: false,
    });
    const autoButton = html.match(/<button[^>]*aria-label="Automatic simulation"[^>]*>/);

    expect(html).toContain('role="group" aria-label="Automatic simulation controls"');
    expect(html).toContain('10,000-trial Auto limit reached. Reset the current run to start again.');
    expect(html).toContain('aria-label="Reset current run"');
    expect(autoButton).not.toBeNull();
    expect(autoButton[0]).toContain('disabled=""');
  });

  it('routes manual and automatic two-dice trials through the same pair helper', () => {
    const source = fs.readFileSync(SOURCE_PATH, 'utf8');
    const manualStart = source.indexOf('var runTrial = function(n)');
    const autoStart = source.indexOf('var runTrialAuto = function()', manualStart);
    const autoEnd = source.indexOf('Compute expected & counts', autoStart);

    expect(manualStart).toBeGreaterThan(-1);
    expect(autoStart).toBeGreaterThan(manualStart);
    expect(autoEnd).toBeGreaterThan(autoStart);
    expect(source.slice(manualStart, autoStart)).toContain('probabilityRollDicePair(');
    expect(source.slice(autoStart, autoEnd)).toContain('probabilityRollDicePair(');
  });
});
