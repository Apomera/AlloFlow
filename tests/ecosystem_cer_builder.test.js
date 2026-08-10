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

const modelData = Array.from({ length: 101 }, (_, step) => ({
  step,
  prey: Math.max(8, 80 - Math.round(step * 0.45)),
  pred: 12 + Math.round(step * 0.18)
}));

function renderEcosystem(state = {}) {
  return renderTool('ecosystem', { ecosystem: { tutorialDismissed: true, ...state } });
}

describe('Ecosystem claim-evidence-reasoning builder', () => {
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

  it('keeps the structured CER workspace available in Beginner mode', () => {
    const html = renderEcosystem({
      tab: 'explore',
      displayProfile: 'beginner',
      analysisView: 'cer',
      data: modelData,
      steps: modelData.length
    });

    expect(html).toContain('eco-analysis-tab-cer');
    expect(html).toContain('Claim\u2013Evidence\u2013Reasoning');
    expect(html).toContain('aria-label="CER progress"');
    expect(html).toContain('Add current-step evidence');
    expect(html).toContain('Save a branch to compare');
    expect(html).toContain('Run uncertainty trials first');
    expect(html).toContain('Run an intervention first');
    expect(html).not.toContain('eco-analysis-tab-uncertainty');
  });

  it('captures a replay snapshot once and transfers a complete CER to the notebook', async () => {
    let latestEcosystemState;
    function Harness() {
      const [toolData, setToolData] = React.useState({
        ecosystem: {
          tutorialDismissed: true,
          tab: 'explore',
          displayProfile: 'advanced',
          analysisView: 'cer',
          data: modelData,
          steps: modelData.length,
          replayStep: 40,
          cerClaim: 'Predators respond after prey abundance changes.',
          cerReasoning: 'Predator reproduction depends on available prey, so the response follows the prey change.'
        }
      });
      latestEcosystemState = toolData.ecosystem;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    host = document.createElement('div');
    document.body.appendChild(host);
    reactRoot = ReactDOMClient.createRoot(host);
    await act(async () => reactRoot.render(React.createElement(Harness)));

    const addCurrent = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent === 'Add current-step evidence');
    expect(addCurrent).toBeDefined();

    await act(async () => addCurrent.click());
    expect(latestEcosystemState.cerEvidence).toHaveLength(1);
    expect(latestEcosystemState.cerEvidence[0].source).toBe('Current run, step 40');
    expect(latestEcosystemState.cerEvidence[0].text).toContain('62 prey and 19 predators');
    expect(latestEcosystemState.cerEvidence[0].replayKey).toContain('eco-logistic-v2');

    const duplicateButton = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent === 'Add current-step evidence');
    await act(async () => duplicateButton.click());
    expect(latestEcosystemState.cerEvidence).toHaveLength(1);

    const transferButton = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent === 'Use CER in notebook');
    expect(transferButton.disabled).toBe(false);
    await act(async () => transferButton.click());

    expect(latestEcosystemState.poeStage).toBe('explain');
    expect(latestEcosystemState.experimentReflection).toContain('Claim: Predators respond after prey abundance changes.');
    expect(latestEcosystemState.experimentReflection).toContain('Evidence:\n1. At step 40');
    expect(latestEcosystemState.experimentReflection).toContain('Reasoning: Predator reproduction depends on available prey');
  });

  it('offers synchronized evidence from comparison, uncertainty, and intervention results', () => {
    const comparedData = modelData.map((point) => ({ ...point, prey: point.prey - 5, pred: point.pred + 2 }));
    const uncertaintySeries = modelData.map((point) => ({
      step: point.step,
      preyP10: point.prey - 4,
      preyMedian: point.prey,
      preyP90: point.prey + 4,
      predP10: point.pred - 2,
      predMedian: point.pred,
      predP90: point.pred + 2
    }));
    const scenarioData = modelData.map((point) => ({
      ...point,
      prey: point.step >= 50 ? point.prey - 8 : point.prey,
      pred: point.step >= 50 ? point.pred - 3 : point.pred
    }));
    const html = renderEcosystem({
      tab: 'explore',
      analysisView: 'cer',
      data: modelData,
      steps: modelData.length,
      branchRuns: [{
        id: 7,
        label: 'Lower prey branch',
        parameters: { prey0: 75, pred0: 12, preyBirth: 0.55, preyDeath: 0.028, predBirth: 0.012, predDeath: 0.65, carryingCapacity: 100 },
        data: comparedData,
        summary: { key: 'cycle', label: 'Persistent cycle' }
      }],
      compareRunId: '7',
      uncertaintyResult: {
        trials: 30,
        seed: 42,
        series: uncertaintySeries,
        summary: { preyExtinctionPercent: 0, predatorExtinctionPercent: 0 }
      },
      interventionResult: {
        label: 'Drought',
        step: 50,
        baselineData: modelData,
        scenarioData
      }
    });

    expect(html).toContain('Add saved-run comparison');
    expect(html).toContain('Add repeated-trial evidence');
    expect(html).toContain('Add intervention evidence');
  });

  it('ships CER provenance and teacher-report contracts in both copies', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    const deployed = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_ecosystem.js', 'utf8');

    expect(source).toContain("replayKey: replayKeyFor(getModelParameters())");
    expect(source).toContain('claimEvidenceReasoning: {');
    expect(source).toContain("formattedCER = 'Claim: '");
    expect(source).toContain('cerEvidence.concat([evidenceEntry]).slice(-8)');
    expect(deployed).toBe(source);
  });
});