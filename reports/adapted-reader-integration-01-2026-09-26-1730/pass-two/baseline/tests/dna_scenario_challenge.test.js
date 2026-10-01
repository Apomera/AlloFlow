import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderDNA(state = {}, overrides = {}) {
  return renderTool('dnaLab', { dnaLab: state }, overrides);
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');
});

describe('DNA Lab Scenario Challenge', () => {
  it('shows the exact edit and only scenario-relevant prediction choices', () => {
    const html = renderDNA({ tab: 'build' });
    expect(html).toContain('data-dna-scenario-challenge="true"');
    expect(html).toContain('Predict an outcome before running the model');
    expect(html).toContain('Your prediction');
    expect(html).toContain('Choose a prediction first');
    expect(html).toContain('Save comparison and progress');
    expect(html).toContain('Your prediction is a hypothesis, not a graded answer.');
    expect(html).toContain('Remove C at base 4');
    expect(html).toContain('data-dna-prediction-choice="Frameshift"');
    expect(html).toContain('data-dna-prediction-choice="In-frame indel"');
    expect(html).not.toContain('data-dna-prediction-choice="Missense"');
  });

  it('uses plain-language K-2 choices while retaining the science terms', () => {
    const html = renderDNA({ tab: 'build' }, { gradeLevel: 'Kindergarten' });
    expect(html).toContain('The groups of 3 shift');
    expect(html).toContain('The groups stay lined up');
    expect(html).toContain('Science word: Frameshift');
    expect(html).toContain('Science word: In-frame indel');
    expect(html).toContain('The next groups still start in the same places.');
    expect(html).not.toContain('The edit removes a whole group');
  });

  it('moves to one current step and exposes the run button state explicitly', () => {
    const initialHost = document.createElement('div');
    initialHost.innerHTML = renderDNA({ tab: 'build' });
    const initialRun = Array.from(initialHost.querySelectorAll('button')).find((button) => button.textContent === 'Choose a prediction first');
    expect(initialRun.disabled).toBe(true);
    expect(initialRun.getAttribute('aria-disabled')).toBe('true');

    const selectedHost = document.createElement('div');
    selectedHost.innerHTML = renderDNA({ tab: 'build', dnaScenarioPrediction: 'Frameshift' });
    const currentSteps = selectedHost.querySelectorAll('[data-dna-scenario-steps] [data-state="current"]');
    const completeSteps = selectedHost.querySelectorAll('[data-dna-scenario-steps] [data-state="complete"]');
    const readyRun = Array.from(selectedHost.querySelectorAll('button')).find((button) => button.textContent === 'Lock prediction and run');
    expect(currentSteps).toHaveLength(1);
    expect(currentSteps[0].textContent).toContain('Run');
    expect(completeSteps[0].textContent).toContain('Predict');
    expect(readyRun.disabled).toBe(false);
    expect(readyRun.getAttribute('aria-disabled')).toBe('false');
  });

  it('specifies the substitution and limits choices to possible substitution effects', () => {
    const html = renderDNA({ tab: 'build', dnaScenarioId: 'substitution' }, { gradeLevel: '7th Grade' });
    expect(html).toContain('Change base 4: C');
    expect(html).toContain('CGU to AGU');
    expect(html).toContain('data-dna-prediction-choice="Silent"');
    expect(html).toContain('data-dna-prediction-choice="Missense"');
    expect(html).toContain('data-dna-prediction-choice="Nonsense"');
    expect(html).not.toContain('data-dna-prediction-choice="Frameshift"');
  });

  it('renders the selected scenario, prediction, and result state', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaScenarioId: 'frameshift_insertion',
      dnaScenarioPrediction: 'Frameshift',
      dnaScenarioLockedPrediction: 'Frameshift',
      dnaScenarioRun: true,
      dnaScenarioPlan: {
        scenarioId: 'frameshift_insertion', mutationType: 'Insertion',
        sequenceBefore: 'ATGCGTACCTGAAACTGA', sequenceAfter: 'ATGACGTACCTGAAACTGA',
        pos: 3, position: 4, from: '', to: 'A', beforeMrnaCodon: 'CGU', afterMrnaCodon: 'ACG'
      },
      dnaScenarioScore: 1,
      dnaScenarioFeedback: 'The result matched your prediction: the actual effect is Frameshift.',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A', scenario: 'frameshift_insertion' }]
    });
    expect(html).toContain('Insert one base');
    expect(html).toContain('Inquiry progress: 1/3');
    expect(html).toContain('data-dna-inquiry-credit="commit-evidence-revision"');
    expect(html).toContain('Prediction locked');
    expect(html).toContain('data-dna-scenario-result="true"');
    expect(html).toContain('data-dna-locked-prediction="true"');
    expect(html).toContain('Actual effect');
    expect(html).toContain('Revise from the evidence');
    expect(html).toContain('What evidence strengthened or changed your explanation?');
    expect(html).toContain('The result matched your prediction: the actual effect is Frameshift.');

    const host = document.createElement('div');
    host.innerHTML = html;
    expect(host.querySelector('select[aria-label="Choose a DNA scenario"]').disabled).toBe(true);
    expect(host.querySelector('[data-dna-prediction-choice="Frameshift"] input').disabled).toBe(true);
  });

  it('keeps scenario progress in the exported report and source implementation', () => {
    const html = renderDNA({ tab: 'mutate', dnaReportOpen: true });
    expect(html).toContain('data-dna-lab-report="true"');
    expect(html).toContain('Student DNA lab report');
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('var DNA_SCENARIO_OPTIONS');
    expect(source).toContain('function getDnaScenarioPlan');
    expect(source).toContain('function chooseDnaScenarioPrediction');
    expect(source).toContain('function runDnaScenario');
    expect(source).toContain('function checkDnaScenarioPrediction');
    expect(source).toContain("'Inquiry progress: '");
    expect(source).toContain('prediction accuracy does not affect inquiry progress');
  });
});
