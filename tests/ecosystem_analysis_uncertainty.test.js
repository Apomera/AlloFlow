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

const modelData = [
  { step: 0, prey: 80, pred: 12 },
  { step: 1, prey: 79, pred: 13 },
  { step: 2, prey: 78, pred: 14 }
];

function renderEcosystem(state = {}) {
  return renderTool('ecosystem', { ecosystem: { tutorialDismissed: true, ...state } });
}

describe('Ecosystem unified analysis workspace and uncertainty', () => {
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

  it('shows one selected analytical panel instead of the former full stack', () => {
    const html = renderEcosystem({
      tab: 'explore',
      analysisView: 'moments',
      data: modelData,
      steps: modelData.length
    });

    expect(html).toContain('Analysis workspace');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('eco-analysis-tab-population');
    expect(html).toContain('eco-analysis-tab-moments');
    expect(html).toContain('eco-analysis-tab-uncertainty');
    expect(html).toContain('eco-analysis-tab-phase');
    expect(html).toContain('eco-analysis-tab-trajectory');
    expect(html).toContain('id="eco-analysis-panel-moments"');
    expect(html).toContain('Key moments in this run');
    expect(html).not.toContain('Logistic Predator-Prey Approximation');
    expect(html).not.toContain('3D population trajectory');
    expect((html.match(/id="eco-analysis-panel-[^"]+" role="tabpanel" class=/g) || []).length).toBe(1);
  });

  it('falls back to Population and removes specialist tabs in Beginner mode', () => {
    const html = renderEcosystem({
      tab: 'explore',
      displayProfile: 'beginner',
      analysisView: 'uncertainty',
      data: modelData,
      steps: modelData.length
    });

    expect(html).toContain('id="eco-analysis-panel-population"');
    expect(html).toContain('eco-analysis-tab-moments');
    expect(html).not.toContain('eco-analysis-tab-uncertainty');
    expect(html).not.toContain('eco-analysis-tab-phase');
    expect(html).not.toContain('eco-analysis-tab-trajectory');
  });

  it('reproduces identical collapsed bands when variability is zero', async () => {
    let latestEcosystemState;
    function Harness() {
      const [toolData, setToolData] = React.useState({
        ecosystem: {
          tutorialDismissed: true,
          tab: 'explore',
          analysisView: 'uncertainty',
          data: modelData,
          steps: modelData.length,
          uncertaintyTrials: 10,
          uncertaintyVariation: 0,
          uncertaintySeed: 123
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
      .find((button) => button.textContent === 'Run repeated trials');
    expect(runButton).toBeDefined();
    await act(async () => runButton.click());

    const firstResult = latestEcosystemState.uncertaintyResult;
    expect(firstResult.schema).toBe('ecosystem-uncertainty-v1');
    expect(firstResult.trials).toBe(10);
    expect(firstResult.seed).toBe(123);
    expect(firstResult.series).toHaveLength(101);
    firstResult.series.forEach((point) => {
      expect(point.preyP10).toBe(point.preyMedian);
      expect(point.preyMedian).toBe(point.preyP90);
      expect(point.predP10).toBe(point.predMedian);
      expect(point.predMedian).toBe(point.predP90);
    });
    const firstSerialized = JSON.stringify(firstResult);

    const rerunButton = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent === 'Run repeated trials');
    await act(async () => rerunButton.click());
    expect(JSON.stringify(latestEcosystemState.uncertaintyResult)).toBe(firstSerialized);
    expect(host.textContent).toContain('These are scenario ranges from this teaching model');
    expect(host.querySelector('#eco-uncertainty-svg-title').textContent).toBe('Repeated-trial population ranges');
  });

  it('keeps the tab and uncertainty contracts in both shipped copies', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    const deployed = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain('var makeSeededRandom = function(seed)');
    expect(source).toContain("schema: 'ecosystem-uncertainty-v1'");
    expect(source).toContain('not confidence intervals, fitted forecasts, or field-data estimates');
    expect(deployed).toBe(source);
  });
});
