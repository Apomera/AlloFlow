import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const placeholderData = Array.from({ length: 101 }, (_, step) => ({ step, prey: 1, pred: 1 }));

function renderEcosystem(state = {}) {
  return renderTool('ecosystem', { ecosystem: { tutorialDismissed: true, ...state } });
}

describe('Ecosystem controlled intervention timeline', () => {
  let config;
  let host;
  let reactRoot;

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
  });

  afterEach(async () => {
    if (reactRoot) await act(async () => reactRoot.unmount());
    if (host) host.remove();
    vi.restoreAllMocks();
    reactRoot = null;
    host = null;
  });

  it('exposes all explicitly modeled events and remains available in Beginner mode', () => {
    const html = renderEcosystem({
      tab: 'explore',
      displayProfile: 'beginner',
      analysisView: 'intervention',
      data: placeholderData,
      steps: placeholderData.length
    });

    expect(html).toContain('Controlled intervention timeline');
    expect(html).toContain('Drought');
    expect(html).toContain('Habitat restoration');
    expect(html).toContain('Prey disease pulse');
    expect(html).toContain('Predator removal pulse');
    expect(html).toContain('Run event scenario');
    expect(html).not.toContain('eco-analysis-tab-uncertainty');
  });

  it('recomputes a matched baseline and diverges only at the scheduled event', async () => {
    let latestEcosystemState;
    function Harness() {
      const [toolData, setToolData] = React.useState({
        ecosystem: {
          tutorialDismissed: true,
          tab: 'explore',
          displayProfile: 'advanced',
          analysisView: 'intervention',
          data: placeholderData,
          steps: placeholderData.length,
          interventionType: 'drought',
          interventionStep: 50,
          interventionIntensity: 0.5
        }
      });
      latestEcosystemState = toolData.ecosystem;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    host = document.createElement('div');
    document.body.appendChild(host);
    reactRoot = ReactDOMClient.createRoot(host);
    await act(async () => reactRoot.render(React.createElement(Harness)));

    const runButton = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent === 'Run event scenario');
    expect(runButton).toBeDefined();
    await act(async () => runButton.click());

    const result = latestEcosystemState.interventionResult;
    expect(result.schema).toBe('ecosystem-intervention-v1');
    expect(result.type).toBe('drought');
    expect(result.step).toBe(50);
    expect(result.intensity).toBe(0.5);
    expect(result.baselineData).toHaveLength(101);
    expect(result.scenarioData).toHaveLength(101);
    expect(result.baselineData[0]).toEqual({ step: 0, time: 0, prey: 80, pred: 12 });
    expect(result.baselineData.slice(0, 50)).toEqual(result.scenarioData.slice(0, 50));
    expect(result.scenarioData.slice(50)).not.toEqual(result.baselineData.slice(50));
    expect(latestEcosystemState.replayStep).toBe(50);
    expect(host.querySelector('#eco-intervention-svg-title').textContent)
      .toBe('Baseline and intervention population trajectories');
    expect(host.textContent).toContain('not a field forecast or management recommendation');
  });

  it('documents persistent capacity changes and one-time population pulses in source', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain("eventConfig.type === 'drought'");
    expect(source).toContain("eventConfig.type === 'restoration'");
    expect(source).toContain("eventConfig.type === 'prey_disease'");
    expect(source).toContain("eventConfig.type === 'predator_removal'");
    expect(source).toContain('scenarioStep >= eventConfig.step');
    expect(source).toContain('scenarioStep === eventConfig.step');
    expect(source).toContain("schema: 'ecosystem-intervention-v1'");
    expect(source).toContain('interventionResult: null');
  });

  it('keeps the deployed mirror byte-identical', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    const deployed = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(deployed).toBe(source);
  });
});
