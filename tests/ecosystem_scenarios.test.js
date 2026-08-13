import fs from 'node:fs';
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

describe('Ecosystem study scenarios', () => {
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

  async function mount(initialEcosystemState = {}) {
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

  it('switches from meadow to a calibrated kelp-forest baseline', async () => {
    await mount({ tab: 'explore', data: [{ step: 0, prey: 80, pred: 12 }], steps: 1 });

    const kelpButton = host.querySelector('button[data-eco-scenario-id="kelp"]');
    expect(kelpButton).not.toBeNull();
    expect(kelpButton.getAttribute('aria-pressed')).toBe('false');

    await act(async () => kelpButton.click());

    expect(latestEcosystemState).toMatchObject({
      scenarioId: 'kelp',
      biome: 'kelp',
      modelRangeMode: 'guided',
      prey0: 60,
      pred0: 8,
      preyBirth: 0.09,
      preyDeath: 0.004,
      predBirth: 0.002,
      predDeath: 0.08,
      carryingCapacity: 140,
      data: [],
      steps: 0,
      eventHistory: [],
    });

    const canvas = host.querySelector('canvas[data-eco-canvas]');
    expect(canvas.dataset.scenario).toBe('kelp');
    expect(canvas.dataset.biome).toBe('kelp');
    expect(canvas.getAttribute('aria-label')).toContain('Kelp Forest');
    expect(host.querySelector('[data-eco-scenario-brief="kelp"]')).not.toBeNull();
    expect(host.textContent).toContain('Sea urchins');
    expect(host.textContent).toContain('Sea otters');
    expect(host.textContent).toContain('Marine heatwave');
    expect(host.textContent).toContain('Kelp restoration');
  });

  it('keeps the active scenario when an inquiry cell opens in Explore', async () => {
    await mount({
      tab: 'inquiry',
      scenarioId: 'kelp',
      biome: 'kelp',
      prey0: 60,
      pred0: 8,
      carryingCapacity: 140,
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

    const openButton = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Open selected setup in Explore'));
    expect(openButton).toBeDefined();
    expect(openButton.textContent).toContain('Kelp Forest');
    await act(async () => openButton.click());

    expect(latestEcosystemState).toMatchObject({
      tab: 'explore',
      scenarioId: 'kelp',
      biome: 'kelp',
      modelRangeMode: 'full',
      prey0: 5,
      pred0: 0,
      carryingCapacity: 149,
    });
  });

  it('adapts concrete quiz examples to the selected food web', async () => {
    await mount({ tab: 'quiz', scenarioId: 'kelp', quizIndex: 2 });
    expect(host.textContent).toContain('sea otter eating a sea urchin');

    await act(async () => {
      const quizTab = host.querySelector('#stem-ecosystem-tab-quiz');
      quizTab.click();
    });
    expect(host.textContent).not.toContain('fox eating a rabbit');
  });

  it('implements an aquatic scene while preserving explicit model boundaries', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain("id: 'kelp', name: 'Kelp Forest'");
    expect(source).toContain("visual: 'aquatic'");
    expect(source).toContain('var aquaticRender = !!bC.aquatic || isAquaticScene;');
    expect(source).toContain('Kelp is context, not a third simulated population.');
    expect(source).toContain('same two-population equations remain underneath');
    expect(source).toContain('Three-dimensional predator-prey trajectory');
  });
});
