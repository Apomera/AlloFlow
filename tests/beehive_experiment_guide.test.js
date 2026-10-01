import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

const plan = () => ({
  plannedActionId: 'plant_wildflowers', predictedMetricId: 'honey', predictedDirection: 'higher',
  question: 'Does planting wildflowers change stored honey?', hypothesis: 'Extra forage may increase honey.',
  changedVariable: 'Plant wildflowers once in Run B.', prediction: 'Run B honey will be higher at Day 12.',
});

function trial(day = 12, overrides = {}, notebookOverride = {}) {
  const runA = { ...BH.bhCreateNewColonyState(4321, 1), day: 12, honey: 20 };
  const baseline = BH.bhCreateExperimentSnapshot(runA);
  const notebook = { ...plan(), registeredPlan: BH.bhCreateExperimentPlanRegistration(plan(), 2, 1), ...notebookOverride };
  const current = {
    ...BH.bhCreateNewColonyState(4321, 2), day, honey: 28,
    managementTrail: [{ choiceId: 'plant_wildflowers', day: 4, label: 'Plant wildflowers', cost: '1 AP' }],
    managementHistory: { schemaVersion: 1, retainedCount: 1, omittedCount: 0, complete: true },
    experimentBaseline: baseline, notebook: { experiment: notebook }, ...overrides,
  };
  return { baseline, current, notebook, comparison: BH.bhCompareExperiments(baseline, current, undefined, notebook) };
}

describe('Bee experiment next-step guide', () => {
  it('routes to the first genuinely missing plan field without rewriting the draft', () => {
    const notebook = { ...plan(), question: '', hypothesis: '' };
    const before = JSON.stringify(notebook);
    const next = BH.bhExperimentNextStep(notebook, null, 12);
    expect(next.id).toBe('plan');
    expect(next.target).toBe('[data-experiment-notebook-field="question"]');
    expect(next.detail).toContain('research question, hypothesis');
    expect(JSON.stringify(notebook)).toBe(before);
  });

  it('distinguishes observing Run A from saving an existing checkpoint', () => {
    expect(BH.bhExperimentNextStep(plan(), null, 0).target).toBe('#beehive-next-day');
    expect(BH.bhExperimentNextStep(plan(), null, 12).target).toBe('[data-experiment-baseline-save="save"]');
  });

  it('routes a saved checkpoint in the same colony to the separate Run B control', () => {
    const { comparison, notebook } = trial(12, { experimentRunSerial: 1 });
    expect(comparison.status).toBe('same-run');
    expect(BH.bhExperimentNextStep(notebook, comparison, 12).id).toBe('repeat');
  });

  it('prioritizes unmatched controls over interpreting otherwise aligned metrics', () => {
    const { comparison, notebook } = trial(12, { simulationSeed: 9999 });
    expect(comparison.interpretationReady).toBe(false);
    expect(BH.bhExperimentNextStep(notebook, comparison, 12).id).toBe('controls');
  });

  it('routes an edited plan to a restart rather than treating it as protected', () => {
    const { comparison, notebook } = trial(12, {}, { hypothesis: 'Changed after the restart.' });
    expect(comparison.planRegistration.status).toBe('changed');
    const next = BH.bhExperimentNextStep(notebook, comparison, 12);
    expect(next.id).toBe('registration');
    expect(next.target).toBe('[data-experiment-restart-run-b]');
  });

  it('distinguishes remaining days from an overshot checkpoint', () => {
    const before = trial(7), after = trial(14);
    expect(BH.bhExperimentNextStep(before.notebook, before.comparison, 7)).toMatchObject({ id: 'checkpoint', target: '#beehive-next-day' });
    expect(BH.bhExperimentNextStep(before.notebook, before.comparison, 7).detail).toContain('5 days left');
    const next = BH.bhExperimentNextStep(after.notebook, after.comparison, 14);
    expect(next.id).toBe('overshot');
    expect(next.target).toBe('[data-experiment-restart-run-b]');
    expect(next.detail).toContain('Restart Run B');
  });

  it('keeps identical choices and incomplete history out of the explanation step', () => {
    const identical = trial(12, { managementTrail: [], managementHistory: { schemaVersion: 1, retainedCount: 0, omittedCount: 0, complete: true } });
    expect(BH.bhExperimentNextStep(identical.notebook, identical.comparison, 12).id).toBe('choice');
    const incomplete = trial(12, { managementHistory: { schemaVersion: 1, retainedCount: 1, omittedCount: 2, complete: false } });
    expect(incomplete.comparison.interpretationReady).toBe(false);
    expect(BH.bhExperimentNextStep(incomplete.notebook, incomplete.comparison, 12).id).toBe('history');
  });

  it('accepts a protected result that disagrees with the prediction as useful evidence', () => {
    const { comparison, notebook } = trial(12, { honey: 18 });
    expect(comparison.interpretationReady).toBe(true);
    expect(comparison.prediction.status).toBe('not-aligned');
    expect(BH.bhExperimentNextStep(notebook, comparison, 12)).toMatchObject({ id: 'explain', target: '[data-experiment-notebook-field="observations"]' });
  });

  it('moves from written explanation to self-review and then sharing', () => {
    const written = { observations: 'Run A 20 lb; Run B 28 lb.', alternativeExplanation: 'One modeled trial does not establish cause.', conclusion: 'The displayed direction matches my prediction.' };
    const review = trial(12, {}, written);
    expect(BH.bhExperimentNextStep(review.notebook, review.comparison, 12).id).toBe('review');
    const shared = trial(12, {}, { ...written, review: { singleVariable: true, numericEvidence: true, uncertainty: true } });
    expect(BH.bhExperimentNextStep(shared.notebook, shared.comparison, 12)).toMatchObject({ id: 'share', target: '[data-beehive-copy-experiment]' });
  });
});

describe('Bee experiment guide rendered navigation targets', () => {
  for (const [label, stateBuilder] of [
    ['planning', () => ({ ...BH.bhCreateNewColonyState(4321, 1), notebook: { experiment: {} } })],
    ['Run A saving', () => ({ ...BH.bhCreateNewColonyState(4321, 1), day: 4, notebook: { experiment: plan() } })],
    ['checkpoint', () => trial(7).current],
    ['overshot checkpoint', () => trial(14).current],
    ['explanation', () => trial().current],
  ]) {
    it('provides a real focus target for ' + label, () => {
      const state = { ...stateBuilder(), viewMode: 'beekeeper' };
      const comparison = BH.bhCompareExperiments(state.experimentBaseline, state);
      const next = BH.bhExperimentNextStep(state.notebook.experiment, comparison, state.day);
      const markup = renderTool('beehive', { beehive: state });
      const container = document.createElement('div');
      container.innerHTML = markup;
      expect(container.querySelector('[data-experiment-next-action="' + next.id + '"]')).not.toBeNull();
      expect(container.querySelector(next.target)).not.toBeNull();
      expect(container.querySelector('[data-experiment-protocol-checklist]').open).toBe(false);
      expect(container.querySelectorAll('[data-experiment-protocol-step]')).toHaveLength(8);
      if (next.id === 'overshot') expect(container.querySelector('[data-beehive-experiment-compare]').textContent).not.toContain('Advance Run B to Day 12');
    });
  }
});
