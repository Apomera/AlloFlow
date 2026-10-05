import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

const action = (day, choiceId, label, cost = '1 AP') => ({ day, choiceId, label, cost });
const plan = () => ({
  plannedActionId: 'plant_wildflowers', predictedMetricId: 'honey', predictedDirection: 'higher',
  question: 'Does one extra forage choice change honey?', hypothesis: 'Extra forage may change honey stores.',
  changedVariable: 'Add wildflowers on Day 2; repeat all other choices.', prediction: 'Compare honey at Day 12.',
});
function fixture(day = 3, overrides = {}, baselineActions = [
  action(1, 'feed_bees', 'Feed bees'), action(3, 'hive_hygiene', 'Hive hygiene'),
  action(5, 'add_super', 'Add super'), action(10, 'winterize', 'Winterize', '2 AP'),
]) {
  const runA = { ...BH.bhCreateNewColonyState(4321, 1), day: 12 };
  baselineActions.forEach((entry) => BH.bhAppendManagementAction(runA, entry));
  const baseline = BH.bhCreateExperimentSnapshot(runA);
  const notebook = { ...plan(), registeredPlan: BH.bhCreateExperimentPlanRegistration(plan(), 2, 1) };
  const current = { ...BH.bhCreateNewColonyState(4321, 2), day, experimentBaseline: baseline, notebook: { experiment: notebook } };
  BH.bhAppendManagementAction(current, action(1, 'feed_bees', 'Feed bees'));
  if (day >= 2) BH.bhAppendManagementAction(current, action(2, 'plant_wildflowers', 'Plant wildflowers'));
  Object.assign(current, overrides);
  return { baseline, current, notebook };
}

describe('Bee derived Run B action schedule', () => {
  it('organizes retained Run A choices into earlier, today, and later without mutating evidence', () => {
    const { baseline, current } = fixture();
    const before = JSON.stringify({ baseline, current });
    const schedule = BH.bhExperimentActionSchedule(baseline, current);
    expect(schedule.rows.map((row) => [row.day, row.phase, row.status])).toEqual([
      [1, 'past', 'matched'], [3, 'today', 'due'], [5, 'future', 'future'], [10, 'future', 'future'],
    ]);
    expect(schedule.today).toHaveLength(1);
    expect(schedule.today[0].target).toBe('[data-management-choice="hive_hygiene"]');
    expect(schedule.planTarget).toBe('[data-conservation-impact="plant_wildflowers"]');
    expect(schedule.plannedInstruction).toContain('Day 2');
    expect(schedule.historyComplete).toBe(true);
    expect(JSON.stringify({ baseline, current })).toBe(before);
  });

  it('previews Run A before the separate run rather than counting Run A as completed B evidence', () => {
    const { baseline, current } = fixture(12, { experimentRunSerial: 1 });
    const schedule = BH.bhExperimentActionSchedule(baseline, current);
    expect(schedule.distinctRuns).toBe(false);
    expect(schedule.currentDay).toBe(0);
    expect(schedule.rows.every((row) => row.status === 'preview')).toBe(true);
    expect(schedule.pastUnmatched).toBe(0);
  });

  it('recognizes stable identities across translated labels while checking day and AP cost', () => {
    const { baseline, current } = fixture(3, { managementTrail: [action(1, 'feed_bees', 'Alimentar abejas')] });
    expect(BH.bhExperimentActionSchedule(baseline, current).rows[0].status).toBe('matched');
    const retimed = { ...current, managementTrail: [action(2, 'feed_bees', 'Feed bees')] };
    expect(BH.bhExperimentActionSchedule(baseline, retimed).rows[0].status).toBe('missed');
    const differentCost = { ...current, managementTrail: [action(1, 'feed_bees', 'Feed bees', '2 AP')] };
    expect(BH.bhExperimentActionSchedule(baseline, differentCost).rows[0].status).toBe('missed');
  });

  it('uses the sequence audit so reordered choices are not all shown as exact matches', () => {
    const entries = [action(3, 'smoke_hive', 'Smoke hive'), action(3, 'add_super', 'Add super')];
    const { baseline, current } = fixture(3, { managementTrail: entries.slice().reverse() }, entries);
    const schedule = BH.bhExperimentActionSchedule(baseline, current);
    expect(schedule.rows.filter((row) => row.status === 'matched').length).toBeLessThan(2);
    expect(schedule.retainedDifferenceCount).toBeGreaterThan(0);
  });

  it('counts repeated identical choices separately instead of reusing one B record twice', () => {
    const repeated = [action(3, 'feed_bees', 'Feed bees'), action(3, 'feed_bees', 'Feed bees')];
    const { baseline, current } = fixture(3, { managementTrail: [repeated[0]] }, repeated);
    const schedule = BH.bhExperimentActionSchedule(baseline, current);
    expect(schedule.today.filter((row) => row.status === 'matched')).toHaveLength(1);
    expect(schedule.today.filter((row) => row.status === 'due')).toHaveLength(1);
  });

  it('highlights possible planned omissions and retiming without inventing the operation', () => {
    const entries = [action(2, 'plant_wildflowers', 'Plant wildflowers'), action(6, 'plant_wildflowers', 'Plant wildflowers')];
    const { baseline, current } = fixture(3, { managementTrail: [] }, entries);
    const schedule = BH.bhExperimentActionSchedule(baseline, current);
    expect(schedule.rows[0]).toMatchObject({ plannedCategory: true, status: 'planned-exception' });
    expect(schedule.rows[1]).toMatchObject({ plannedCategory: true, phase: 'future' });
    expect(schedule.plannedOccurrences).toBe(2);
    expect(schedule.pastUnmatched).toBe(0);
  });

  it('does not match different treatment methods within the same planned category', () => {
    const entries = [action(3, 'varroa_treatment', 'Oxalic Acid Dribble')];
    const { baseline, current } = fixture(3, { managementTrail: [action(3, 'varroa_treatment', 'Formic Acid Pads')] }, entries);
    expect(BH.bhExperimentActionSchedule(baseline, current).today[0].status).toBe('due');
  });

  it('keeps missing history conservative and does not infer vanished choices', () => {
    const entries = Array.from({ length: 30 }, (_, index) => action(index + 1, 'feed_bees', 'Feed bees'));
    const { baseline, current } = fixture(10, { managementTrail: [] }, entries);
    const schedule = BH.bhExperimentActionSchedule(baseline, current);
    expect(schedule.historyComplete).toBe(false);
    expect(schedule.baselineHistory.omittedCount).toBe(6);
    expect(schedule.rows.some((row) => row.day === 1)).toBe(false);
    expect(schedule.rows.find((row) => row.day === 7).status).toBe('unknown');
  });

  it('handles missing baseline, unknown legacy controls, and missing planned choice', () => {
    expect(BH.bhExperimentActionSchedule(null, {})).toBeNull();
    const { baseline, current } = fixture(3, { notebook: { experiment: {} } }, [action(3, '', 'Inspect brood')]);
    const schedule = BH.bhExperimentActionSchedule(baseline, current);
    expect(schedule.today[0].target).toBe('#beehive-colony-interventions');
    expect(schedule.planTarget).toBe('[data-experiment-planned-action]');
  });
});

describe('Bee action schedule rendered controls and history', () => {
  it('exposes the full retained timeline while keeping the immediate list concise', () => {
    const { current } = fixture();
    const container = document.createElement('div');
    container.innerHTML = renderTool('beehive', { beehive: { ...current, viewMode: 'beekeeper' } });
    const schedule = container.querySelector('[data-experiment-action-schedule]');
    expect(schedule).not.toBeNull();
    expect(schedule.querySelector('[data-experiment-schedule-timeline]').open).toBe(false);
    expect(schedule.querySelector('[data-experiment-schedule-timeline]').textContent).toContain('Winterize');
    expect(schedule.querySelector('[data-experiment-schedule-exception]').textContent).toContain('do not change every occurrence');
    expect(container.querySelector('[data-management-choice="hive_hygiene"]')).not.toBeNull();
    expect(container.querySelector('[data-conservation-impact="plant_wildflowers"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-management-choice]')).toHaveLength(9);
  });

  it('shows the retained-record limitation and a warning about matching an earlier choice late', () => {
    const { current } = fixture(4, { managementTrail: [], managementHistory: { schemaVersion: 1, retainedCount: 0, omittedCount: 1, complete: false } });
    const container = document.createElement('div');
    container.innerHTML = renderTool('beehive', { beehive: { ...current, viewMode: 'beekeeper' } });
    expect(container.querySelector('[data-experiment-schedule-limit]').textContent).toContain('cannot establish a fair one-change comparison');
    expect(container.querySelector('[data-experiment-schedule-past-warning]').textContent).toContain('Applying it late changes the timing');
  });
});
