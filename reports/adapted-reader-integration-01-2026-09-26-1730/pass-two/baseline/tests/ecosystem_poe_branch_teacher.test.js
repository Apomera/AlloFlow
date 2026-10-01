import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderEcosystem(state = {}) {
  return renderTool('ecosystem', { ecosystem: { tutorialDismissed: true, ...state } });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem');
});

describe('Ecosystem Predict–Observe–Explain and teacher workflow', () => {
  it('renders explicit workflow stages, branching, and teacher tools', () => {
    const html = renderEcosystem({
      tab: 'explore',
      teacherMode: true,
      data: [
        { step: 0, prey: 80, pred: 12 },
        { step: 1, prey: 78, pred: 13 }
      ],
      steps: 2
    });
    expect(html).toContain('Predict');
    expect(html).toContain('Observe');
    expect(html).toContain('Explain');
    expect(html).toContain('Save named branch');
    expect(html).toContain('Teacher / report mode');
    expect(html).toContain('eco-teacher-tools');
    expect(html).toContain('Export teacher report');
    expect(html).toContain('Replay key:');
  });

  it('stores replayable branch parameters and exports evidence', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain('var replayKeyFor = function(params)');
    expect(source).toContain('var saveBranchRun = function()');
    expect(source).toContain('var loadBranchRun = function(record)');
    expect(source).toContain('var markExplanationComplete = function()');
    expect(source).toContain('var buildTeacherReport = function()');
    expect(source).toContain('schema: \'ecosystem-teacher-report-v1\'');
  });

  it('gates graph evidence behind an immutable, ungraded commitment', () => {
    const draftHtml = renderEcosystem({ tab: 'explore' });
    expect(draftHtml).toContain('data-ecosystem-commit-prediction="true"');
    expect(draftHtml).not.toContain('data-ecosystem-run-committed="true"');
    expect(draftHtml).toContain('My ungraded prediction for this modeled system');
    expect(draftHtml).toContain('Both indices persist through repeated or damping oscillations.');

    const commitment = {
      prediction: 'cycle',
      predictionLabel: 'Repeated rises and falls',
      reason: 'Predators respond after prey increase.',
      parameters: {
        prey0: 40,
        pred0: 10,
        preyBirth: 0.12,
        preyDeath: 0.006,
        predBirth: 0.004,
        predDeath: 0.12,
        carryingCapacity: 100
      },
      replayKey: 'locked-test-key',
      committedAt: 123
    };
    const committedHtml = renderEcosystem({
      tab: 'explore',
      runPrediction: 'cycle',
      runPredictionReason: commitment.reason,
      committedRunPrediction: commitment
    });
    expect(committedHtml).toContain('data-ecosystem-run-committed="true"');
    expect(committedHtml).toContain('data-ecosystem-change-prediction="true"');
    expect(committedHtml).toContain('Prediction and model settings are locked before evidence.');

    const observedHtml = renderEcosystem({
      tab: 'explore',
      runPrediction: 'cycle',
      runPredictionReason: commitment.reason,
      completedRunCommitment: { ...commitment, observedAt: 456, aligned: false },
      predictionFeedback: 'The committed prediction differed from this model run. Agreement is not a score.',
      data: [
        { step: 0, prey: 40, pred: 10 },
        { step: 1, prey: 38, pred: 11 }
      ],
      steps: 2
    });
    expect(observedHtml).toContain('data-ecosystem-plan-next="true"');
    expect(observedHtml).toContain('Post-run evidence explanation');
    expect(observedHtml).toContain('data-ecosystem-prediction-comparison="descriptive-ungraded"');
    expect(observedHtml).toContain('Agreement is not a score');
  });

  it('uses completed snapshots for reports and treats the visible map as post-evidence', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain('var completedCommitment = Object.assign({}, runCommitment');
    expect(source).toContain('var reportCommitment = completedRunCommitment || null');
    expect(source).toContain('predictionReason: evidenceCommitment ? evidenceCommitment.reason');
    expect(source).toContain("evidenceMode: 'post-observation-pattern-explanation'");
    expect(source).toContain('This map displays evidence from 121 completed runs');
    expect(source).toContain('Your evidence-based pattern explanation (not a prediction)');
    expect(source).not.toContain('Select a cell, make a prediction, then open that exact setup in Explore.');
  });

  it('keeps the deployed mirror byte-identical', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    const deployed = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(deployed).toBe(source);
  });
});