import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Ecosystem calibrated presets and parameter sweep', () => {
  let config;
  let host;
  let reactRoot;
  let latestEcosystemState;

  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const gradient = { addColorStop() {} };
    const canvasContext = new Proxy({}, {
      get(_target, property) {
        if (property === 'measureText') return () => ({ width: 0 });
        if (property === 'createLinearGradient' || property === 'createRadialGradient') return () => gradient;
        return () => {};
      },
      set() { return true; }
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem');
    host = document.createElement('div');
    document.body.appendChild(host);
    reactRoot = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    if (reactRoot) await act(async () => reactRoot.unmount());
    if (host) host.remove();
    vi.restoreAllMocks();
    reactRoot = null;
    host = null;
  });

  async function mount(initialEcosystemState) {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        ecosystem: {
          tutorialDismissed: true,
          ...initialEcosystemState,
        }
      });
      latestEcosystemState = toolData.ecosystem;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => reactRoot.render(React.createElement(Harness)));
  }

  function findButton(text) {
    return Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent.includes(text));
  }

  async function applyPresetAndRun(label) {
    const presetButton = Array.from(host.querySelectorAll('button')).find((button) =>
      button.getAttribute('aria-label')?.includes(label) && button.getAttribute('aria-label')?.includes('preset'));
    await act(async () => presetButton.click());
    const expectedPreset = {
      Equilibrium: { prey0: 20, pred0: 16, preyBirth: 0.1, carryingCapacity: 100 },
      Boom: { prey0: 20, pred0: 0, preyBirth: 0.15, carryingCapacity: 140 },
      Extinction: { prey0: 20, pred0: 35, preyDeath: 0.03, carryingCapacity: 100 },
    }[label];
    expect(latestEcosystemState).toMatchObject(expectedPreset);
    const runButton = host.querySelector('button[aria-label="Run Graph Simulation"]');
    expect(runButton).not.toBeNull();
    await act(async () => runButton.click());
    return latestEcosystemState.data;
  }

  it('makes preset names match observable 10-time-unit behavior', async () => {
    await mount({ tab: 'explore', modelRangeMode: 'full' });

    const equilibrium = await applyPresetAndRun('Equilibrium');
    expect(equilibrium).toHaveLength(101);
    expect(latestEcosystemState).toMatchObject({
      prey0: 20,
      pred0: 16,
      carryingCapacity: 100,
    });
    equilibrium.forEach((point) => {
      expect(point.prey).toBe(20);
      expect(point.pred).toBe(16);
    });

    const boom = await applyPresetAndRun('Boom');
    expect(boom.at(-1).prey).toBeGreaterThan(boom[0].prey);
    expect(boom.every((point) => point.pred === 0)).toBe(true);

    const extinction = await applyPresetAndRun('Extinction');
    expect(Math.min(...extinction.map((point) => point.prey))).toBeLessThan(1);
    expect(extinction.at(-1).pred).toBeGreaterThan(0);
  });

  it('selects a real map cell and transfers its exact setup into Explore', async () => {
    await mount({
      tab: 'inquiry',
      inquiry: {
        predBirth: 50,
        preyLife: 50,
        resScarcity: 30,
        hypothesis: '',
        stuckRevealed: false,
        understood: false,
        explanation: '',
        log: [],
      }
    });

    const targetCell = host.querySelector('button[aria-label^="5 initial prey, 0 initial predators,"]');
    expect(targetCell).not.toBeNull();
    await act(async () => targetCell.click());
    expect(latestEcosystemState.inquiry).toMatchObject({ preyLife: 0, predBirth: 0 });

    const openButton = findButton('Open selected setup in Explore');
    expect(openButton).toBeDefined();
    await act(async () => openButton.click());

    expect(latestEcosystemState).toMatchObject({
      tab: 'explore',
      modelRangeMode: 'full',
      prey0: 5,
      pred0: 0,
      carryingCapacity: 149,
      data: [],
      steps: 0,
    });
  });

  it('clamps advanced settings when learners switch back to Guided range', async () => {
    await mount({
      tab: 'explore',
      modelRangeMode: 'full',
      prey0: 150,
      pred0: 80,
      preyBirth: 0.3,
      preyDeath: 0.05,
      predBirth: 0.05,
      predDeath: 0.3,
      carryingCapacity: 200,
    });

    const guided = host.querySelector('input[name="eco-model-range"][value="guided"]');
    expect(guided).not.toBeNull();
    await act(async () => guided.click());

    expect(latestEcosystemState).toMatchObject({
      modelRangeMode: 'guided',
      prey0: 120,
      pred0: 30,
      preyBirth: 0.15,
      preyDeath: 0.01,
      predBirth: 0.006,
      predDeath: 0.18,
      carryingCapacity: 180,
    });

    const predatorSlider = host.querySelector('input[aria-label="Predator start population"]');
    expect(predatorSlider.min).toBe('4');
    expect(predatorSlider.max).toBe('30');
  });
});
