import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderDNA(state = {}) {
  return renderTool('dnaLab', { dnaLab: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');
});

describe('DNA Lab Scenario Challenge', () => {
  it('renders prediction-before-action controls and a frameshift prompt', () => {
    const html = renderDNA({ tab: 'build' });
    expect(html).toContain('data-dna-scenario-challenge="true"');
    expect(html).toContain('Predict before you experiment');
    expect(html).toContain('Your prediction');
    expect(html).toContain('Run scenario');
    expect(html).toContain('Check prediction');
    expect(html).toContain('Predict what will happen when one base is deleted');
  });

  it('renders the selected scenario, prediction, and result state', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaScenarioId: 'frameshift_insertion',
      dnaScenarioPrediction: 'Frameshift',
      dnaScenarioRun: true,
      dnaScenarioScore: 1,
      dnaScenarioFeedback: 'Prediction correct: the actual effect is Frameshift.',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A', scenario: 'frameshift_insertion' }]
    });
    expect(html).toContain('Insert one base');
    expect(html).toContain('Score: 1/2');
    expect(html).toContain('Scenario run complete');
    expect(html).toContain('data-dna-scenario-result="true"');
    expect(html).toContain('Actual effect');
    expect(html).toContain('Prediction correct: the actual effect is Frameshift.');
  });

  it('keeps scenario progress in the exported report and source implementation', () => {
    const html = renderDNA({ tab: 'mutate', dnaReportOpen: true });
    expect(html).toContain('Scenario Challenge');
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('var DNA_SCENARIO_OPTIONS');
    expect(source).toContain('function runDnaScenario');
    expect(source).toContain('function checkDnaScenarioPrediction');
    expect(source).toContain("'Scenario score: '");
  });
});
