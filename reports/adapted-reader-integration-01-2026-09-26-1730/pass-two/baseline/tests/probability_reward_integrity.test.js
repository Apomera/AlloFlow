import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const mounted = [];

function installBrowserStubs() {
  window.matchMedia = window.matchMedia || (() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
  window.HTMLCanvasElement.prototype.getContext = function() {
    const noop = () => {};
    return {
      clearRect: noop, fillRect: noop, strokeRect: noop,
      beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
      arc: noop, fill: noop, stroke: noop, save: noop, restore: noop,
      translate: noop, rotate: noop, scale: noop, setTransform: noop,
      fillText: noop, measureText: () => ({ width: 0 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
    };
  };
}

async function mountProbability(initialProbability, overrides = {}) {
  const config = window.StemLab._registry.probability;
  const container = document.createElement('div');
  document.body.appendChild(container);
  let latest = { probability: initialProbability };

  function Host() {
    const [toolData, setToolData] = React.useState({ probability: initialProbability });
    latest = toolData;
    return config.render(makeCtx({ toolData, setToolData, ...overrides }));
  }

  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => root.render(React.createElement(Host)));
  mounted.push({ root, container });
  return { container, getState: () => latest };
}

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '';
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  installBrowserStubs();
  loadTool('stem_lab/stem_tool_probability.js', 'probability');
});

afterEach(async () => {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
});

describe('Probability Lab reward integrity', () => {
  it('finds every newly crossed lifetime milestone and preserves claims through run resets', () => {
    const core = window.__ProbabilityCore;

    expect(core.trialMilestones).toEqual([10, 50, 100, 500, 1000]);
    expect(core.newTrialMilestones(100, [10])).toEqual([50, 100]);
    expect(core.newTrialMilestones('500', [10, 50, 100])).toEqual([500]);
    expect(core.newTrialMilestones(Number.POSITIVE_INFINITY, [])).toEqual([]);
    expect(core.newTrialMilestones(-1, [])).toEqual([]);

    const prior = { totalTrials: 100, _awardedTrialMilestones: [10, 50, 100] };
    expect({ ...prior, ...core.resetPatch() }).toMatchObject(prior);
    expect(core.resetPatch()).not.toHaveProperty('_awardedTrialMilestones');
  });

  it('awards cumulative milestones once and cannot farm them by resetting the current run', async () => {
    const awards = [];
    const runtime = await mountProbability({
      mode: 'coin', results: [], trials: 0, convergenceHistory: [],
      totalTrials: 100, _awardedTrialMilestones: [10],
    }, {
      awardXP: (...args) => awards.push(args),
    });

    expect(awards).toEqual([['probability', 10]]);
    expect(runtime.getState().probability._awardedTrialMilestones).toEqual([10, 50, 100]);

    const reset = runtime.container.querySelector('button[aria-label="Reset current run"]');
    const run100 = runtime.container.querySelector('button[aria-label="Run 100 trials"]');
    expect(reset).not.toBeNull();
    expect(run100).not.toBeNull();

    await React.act(async () => reset.click());
    await React.act(async () => run100.click());

    expect(runtime.getState().probability.totalTrials).toBe(200);
    expect(runtime.getState().probability._awardedTrialMilestones).toEqual([10, 50, 100]);
    expect(awards).toEqual([['probability', 10]]);
  });

  it('blocks rapid duplicate claims while preserving two different challenge claims', async () => {
    const awards = [];
    const runtime = await mountProbability({
      mode: 'birthday', birthdayN: 23, results: [], trials: 0,
      convergenceHistory: [], _bestStreak: 5, _completedChallenges: [],
    }, {
      awardXP: (...args) => awards.push(args),
    });
    const claimButtons = Array.from(runtime.container.querySelectorAll('button[aria-label="Claim"]'));
    expect(claimButtons).toHaveLength(2);

    await React.act(async () => {
      claimButtons[0].click();
      claimButtons[0].click();
      claimButtons[1].click();
    });

    expect(awards).toEqual([
      ['probability', 25],
      ['probability', 30],
    ]);
    expect(runtime.getState().probability._completedChallenges).toEqual(['streak5', 'birthday23']);
  });
});
