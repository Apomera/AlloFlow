import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

function actions(count) {
  return Array.from({ length: count }, (_, index) => ({ day: index + 1, label: 'Inspect brood', cost: '1 AP' }));
}

function comparisonFixture() {
  const runA = { ...BH.bhCreateNewColonyState(4321, 1), day: 30, managementTrail: actions(30) };
  const runB = { ...BH.bhCreateNewColonyState(4321, 2), day: 30, honey: 28, managementTrail: actions(30) };
  runA.managementTrail[0] = { day: 1, choiceId: 'feed_bees', label: 'Feed bees', cost: '1 AP' };
  runB.managementTrail[0] = { day: 1, choiceId: 'ban_pesticides', label: 'Advocate no-spray zone', cost: '1 AP' };
  runB.managementTrail[29] = { day: 30, choiceId: 'plant_wildflowers', label: 'Plant wildflowers', cost: '1 AP' };
  const plan = {
    plannedActionId: 'plant_wildflowers', predictedMetricId: 'honey', predictedDirection: 'higher',
    question: 'Does forage change honey stores?', hypothesis: 'More forage increases stores.',
    changedVariable: 'Plant wildflowers once', prediction: 'Run B honey will be higher at Day 30.',
  };
  plan.registeredPlan = BH.bhCreateExperimentPlanRegistration(plan, 2, 1);
  runB.notebook = { experiment: plan };
  return { baseline: BH.bhCreateExperimentSnapshot(runA), runB, plan };
}

describe('Beehive bounded management history integrity', () => {
  it('records known omissions without changing the source and keeps them through checkpoint normalization', () => {
    const state = { ...BH.bhCreateNewColonyState(100, 1), day: 30, managementTrail: actions(30) };
    const original = JSON.parse(JSON.stringify(state));
    const snapshot = BH.bhCreateExperimentSnapshot(state);

    expect(snapshot.managementTrail).toHaveLength(24);
    expect(snapshot.managementHistory).toEqual({ schemaVersion: 1, retainedCount: 24, omittedCount: 6, complete: false });
    expect(BH.bhNormalizeExperimentSnapshot(snapshot)).toEqual(snapshot);
    expect(state).toEqual(original);
  });

  it('distinguishes a fully tracked 24-choice run from an older save whose discarded choices are unknown', () => {
    const tracked = BH.bhCreateNewColonyState(100, 1);
    actions(24).forEach((action) => BH.bhAppendManagementAction(tracked, action));
    expect(tracked.managementHistory).toMatchObject({ retainedCount: 24, omittedCount: 0, complete: true });
    expect(BH.bhCompareManagementTrails(tracked.managementTrail, tracked.managementTrail, tracked.managementHistory, tracked.managementHistory).status).toBe('identical');

    const legacy = BH.bhCreateExperimentSnapshot({ day: 24, managementTrail: actions(24) });
    expect(legacy.managementHistory).toMatchObject({ retainedCount: 24, omittedCount: null, complete: false });
    expect(BH.bhCompareManagementTrails(actions(24), actions(24))).toMatchObject({
      status: 'incomplete-history', retainedStatus: 'identical', historyComplete: false, differenceCount: 0,
    });
    expect(BH.bhCreateExperimentSnapshot({ day: 23, managementTrail: actions(23) }).managementHistory.complete).toBe(true);
  });

  it('accumulates omissions as new actions replace older records and never loses legacy uncertainty', () => {
    const state = BH.bhCreateNewColonyState(100, 1);
    actions(29).forEach((action) => BH.bhAppendManagementAction(state, action));
    expect(state.managementTrail).toHaveLength(24);
    expect(state.managementTrail[0].day).toBe(6);
    expect(state.managementHistory).toMatchObject({ omittedCount: 5, complete: false });
    const snapshot = BH.bhCreateExperimentSnapshot({ ...state, day: 29 });
    expect(BH.bhNormalizeExperimentSnapshot(snapshot).managementHistory.omittedCount).toBe(5);

    const legacy = { managementTrail: actions(24) };
    BH.bhAppendManagementAction(legacy, { day: 25, label: 'Feed bees', cost: '1 AP' });
    expect(legacy.managementHistory).toMatchObject({ omittedCount: null, complete: false });
  });

  it('cannot unlock protected interpretation when an earlier divergence vanished behind one retained change', () => {
    const { baseline, runB } = comparisonFixture();
    const comparison = BH.bhCompareExperiments(baseline, runB);
    expect(comparison.matchedCheckpoint).toBe(true);
    expect(comparison.planRegistration.status).toBe('matched');
    expect(comparison.management).toMatchObject({
      status: 'incomplete-history', retainedStatus: 'one-change', historyComplete: false, differenceCount: 1,
      baselineHistory: { omittedCount: 6 }, currentHistory: { omittedCount: 6 },
    });
    expect(comparison.plannedChoice.status).toBe('waiting');
    expect(comparison.interpretationReady).toBe(false);
  });

  it('keeps omission uncertainty when comparison filters the later checkpoint to a shared day', () => {
    const { baseline, runB } = comparisonFixture();
    const comparison = BH.bhCompareExperiments(baseline, { ...runB, day: 10, managementTrail: actions(10) });
    expect(comparison.management).toMatchObject({ status: 'incomplete-history', comparedThroughDay: 10, checkpointAligned: false });
    expect(comparison.management.baselineHistory.omittedCount).toBe(6);
    expect(comparison.interpretationReady).toBe(false);
  });

  it('compares explicit choice identity and AP cost while allowing localized labels for the same action', () => {
    const a = [{ day: 4, choiceId: 'water_station', label: 'Set up bee waterer', cost: '1 AP' }];
    const localized = [{ day: 4, choiceId: 'water_station', label: 'Instalar bebedero', cost: '1 AP' }];
    expect(BH.bhCompareManagementTrails(a, localized).status).toBe('identical');
    expect(BH.bhCompareManagementTrails(a, [{ ...a[0], choiceId: 'plant_wildflowers' }]).status).toBe('one-change');
    expect(BH.bhCompareManagementTrails(a, [{ ...a[0], cost: '2 AP' }]).status).toBe('one-change');
    expect(BH.bhCompareManagementTrails([{ ...a[0], choiceId: 'future_action_a' }], [{ ...a[0], choiceId: 'future_action_b' }]).status).toBe('one-change');
    const snapshot = BH.bhCreateExperimentSnapshot({ day: 4, managementTrail: [{ ...a[0], choiceId: 'future_action_a' }] });
    expect(snapshot.managementTrail[0].choiceId).toBe('future_action_a');
  });

  it('continues to compare treatment and harvest variants within their broad plan categories', () => {
    const treatment = { day: 4, choiceId: 'varroa_treatment', label: 'Oxalic Acid Dribble', cost: '1 AP' };
    const harvest = { day: 4, choiceId: 'harvest_honey', label: 'Harvest Summer Wildflower', cost: '1 AP' };
    expect(BH.bhCompareManagementTrails([treatment], [{ ...treatment, label: 'Formic Acid Pads' }]).status).toBe('one-change');
    expect(BH.bhCompareManagementTrails([harvest], [{ ...harvest, label: 'Harvest Clover' }]).status).toBe('one-change');
    const legacy = [{ day: 4, label: 'Feed bees', cost: '1 AP' }];
    expect(BH.bhCompareManagementTrails(legacy, legacy).status).toBe('identical');
  });

  it('shows the incomplete coverage in the comparison panel and copied evidence record', () => {
    const { baseline, runB, plan } = comparisonFixture();
    const html = renderTool('beehive', { beehive: { ...runB, viewMode: 'beekeeper', experimentBaseline: baseline } });
    expect(html).toContain('data-management-audit-status="incomplete-history"');
    expect(html).toContain('data-management-audit-final="false"');
    expect(html).toContain('Management history incomplete');
    expect(html).toContain('6 earlier choices omitted');
    expect(html).not.toContain('Protected comparison ready');
    const record = BH.bhBuildExperimentEvidenceRecord(plan, baseline, runB);
    expect(record).toContain('**Comparison status:** Management history incomplete');
    expect(record).toContain('**History coverage:** Run A: 6 earlier choices omitted; Run B: 6 earlier choices omitted');
    expect(record).not.toContain('Protected comparison ready');
  });
});

describe('Beehive action persistence at the management cap', () => {
  let host;
  let root;
  let originalRaf;
  let originalCancelRaf;

  afterEach(() => {
    if (root) act(() => root.unmount());
    host?.remove();
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    vi.restoreAllMocks();
  });

  it('persists exactly one omitted choice after a rapid double-click with one AP left', async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform: vi.fn() });
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const state = { ...BH.bhCreateNewColonyState(100, 1), day: 24, viewMode: 'beekeeper', beeView: 'scene', tutorialDone: true, soundOn: false, actionPoints: 1 };
    actions(24).forEach((action) => BH.bhAppendManagementAction(state, action));
    let latest;
    function Component() {
      const [toolData, setToolData] = React.useState({ beehive: state });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
    const button = host.querySelector('[data-management-action="Super"]');
    expect(button).toBeTruthy();
    await act(async () => { button.click(); button.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(latest.beehive.actionPoints).toBe(0);
    expect(latest.beehive.managementTrail).toHaveLength(24);
    expect(latest.beehive.managementHistory).toEqual({ schemaVersion: 1, retainedCount: 24, omittedCount: 1, complete: false });
    expect(latest.beehive.managementTrail.at(-1).choiceId).toBe('add_super');
    expect(BH.bhCreateExperimentSnapshot(latest.beehive).managementHistory.omittedCount).toBe(1);
  });
});
