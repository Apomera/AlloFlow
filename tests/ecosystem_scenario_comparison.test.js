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

describe('Ecosystem cross-scenario comparison lab', () => {
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

  async function click(selector) {
    const element = host.querySelector(selector);
    expect(element).not.toBeNull();
    await act(async () => element.click());
    return element;
  }

  it('gates the shared-input comparison behind a prediction and reveals identical trajectories', async () => {
    await mount({ tab: 'explore' });

    expect(host.querySelector('#eco-scenario-comparison-lab')).toBeNull();
    await click('[data-eco-scenario-comparison-toggle="true"]');

    expect(latestEcosystemState.scenarioCompareOpen).toBe(true);
    expect(host.querySelector('#eco-scenario-comparison-lab')).not.toBeNull();
    expect(host.querySelector('[data-eco-scenario-comparison-results="true"]')).toBeNull();
    expect(host.querySelector('[data-eco-run-scenario-comparison="true"]').disabled).toBe(true);

    await click('#eco-scenario-predict-same');
    expect(latestEcosystemState.scenarioComparePrediction).toBe('same');
    expect(host.querySelector('[data-eco-run-scenario-comparison="true"]').disabled).toBe(false);
    await click('[data-eco-run-scenario-comparison="true"]');

    expect(latestEcosystemState.scenarioCompareRevealed).toBe(true);
    expect(host.querySelectorAll('[data-eco-system-comparison]')).toHaveLength(2);
    expect(host.querySelectorAll('[data-eco-system-comparison] svg[role="img"]')).toHaveLength(2);
    expect(host.querySelector('[data-eco-system-comparison="meadow"] title').textContent).toContain('Meadow synchronized population trajectory');
    expect(host.querySelector('[data-eco-system-comparison="kelp"] desc').textContent).toContain('Shared vertical scale');

    const feedback = host.querySelector('[data-eco-scenario-comparison-feedback]');
    expect(feedback.dataset.ecoScenarioComparisonFeedback).toBe('matched');
    expect(feedback.textContent).toContain('identical at every step');
    expect(feedback.textContent).toContain('same equations with the same numeric inputs');
    expect(host.querySelectorAll('[data-eco-scenario-parameter-table] tbody tr')).toHaveLength(2);

    await click('[data-eco-add-system-evidence="true"]');
    expect(latestEcosystemState.cerEvidence).toHaveLength(1);
    expect(latestEcosystemState.cerEvidence[0].kind).toBe('systems');
    expect(latestEcosystemState.cerEvidence[0].text).toContain('identical at every step');
  });

  it('uses a synchronized timeline and reports exact values in accessible chart descriptions', async () => {
    await mount({ tab: 'explore', scenarioCompareOpen: true, scenarioComparePrediction: 'same', scenarioCompareRevealed: true });

    const timeline = host.querySelector('#eco-scenario-comparison-time');
    expect(timeline).not.toBeNull();
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      valueSetter.call(timeline, '25');
      timeline.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(latestEcosystemState.scenarioCompareStep).toBe(25);
    expect(host.querySelector('[data-eco-system-comparison="meadow"] desc').textContent).toContain('modeled time 2.5');
    expect(host.querySelector('[data-eco-system-comparison="kelp"] desc').textContent).toContain('modeled time 2.5');
    expect(timeline.getAttribute('aria-valuetext')).toContain('Modeled time 2.5 of 10.0');
  });

  it('compares distinct calibrated baselines and identifies parameter-driven divergence', async () => {
    await mount({ tab: 'explore', scenarioCompareOpen: true });

    await click('#eco-scenario-protocol-baselines');
    expect(latestEcosystemState).toMatchObject({
      scenarioCompareProtocol: 'baselines',
      scenarioComparePrediction: '',
      scenarioCompareRevealed: false,
    });
    await click('#eco-scenario-predict-different');
    await click('[data-eco-run-scenario-comparison="true"]');

    const feedback = host.querySelector('[data-eco-scenario-comparison-feedback]');
    expect(feedback.dataset.ecoScenarioComparisonFeedback).toBe('matched');
    expect(feedback.textContent).toContain('illustrative baseline parameters and starting indices differ');
    expect(feedback.textContent).toContain('r, a, b, d, K');

    const rows = host.querySelectorAll('[data-eco-scenario-parameter-table] tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Meadow4010');
    expect(rows[0].textContent).toContain('0.120');
    expect(rows[1].textContent).toContain('Kelp Forest608');
    expect(rows[1].textContent).toContain('0.090');
    expect(rows[1].textContent).toContain('140');
  });

  it('requires a fresh prediction after changing the active scenario', async () => {
    await mount({
      tab: 'explore',
      scenarioCompareOpen: true,
      scenarioComparePrediction: 'same',
      scenarioCompareRevealed: true,
    });

    await click('button[data-eco-scenario-id="kelp"]');
    expect(latestEcosystemState).toMatchObject({
      scenarioId: 'kelp',
      scenarioCompareOpen: true,
      scenarioComparePrediction: '',
      scenarioCompareRevealed: false,
    });
    expect(host.querySelector('[data-eco-scenario-comparison-results="true"]')).toBeNull();
  });
});
