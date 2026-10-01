import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import axe from 'axe-core';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});
function plannedLab(actionId = 'feed_bees', direction = 'higher') {
  const lab = { ...BH.bhNewHoneyLab(), step: 3, initialPrediction: 'lower', initialReason: 'Consumption may exceed income.',
    actionId, expectedDirection: direction, planReason: 'Test the changed food pathway.' };
  lab.registeredPlan = BH.bhCreateExperimentPlanRegistration(BH.bhHoneyLabPlan(lab), 2, 1);
  return lab;
}
describe('Bee guided food-budget science', () => {
  it('uses identical Day 0 warm-ups and matched days without changing model parameters', () => {
    const params = JSON.stringify(BH.SIMULATION_PARAMS);
    const a = BH.bhRunHoneyLab(), b = BH.bhRunHoneyLab('feed_bees');
    expect(a.start.day).toBe(52);
    expect(a.state.day).toBe(55);
    expect(b.state.day).toBe(55);
    const { experimentRunSerial: aRun, ...aStart } = a.start;
    const { experimentRunSerial: bRun, ...bStart } = b.start;
    expect(aRun).toBe(1); expect(bRun).toBe(2);
    expect(aStart).toEqual(bStart);
    expect(JSON.stringify(BH.SIMULATION_PARAMS)).toBe(params);
    expect(a.snapshot.exactFromStart).toBe(true);
    expect(a.state.activeEvent).toBeNull();
  });
  it('shows food depletion despite positive flower visits, with every displayed budget reconciled', () => {
    for (const action of [undefined, 'feed_bees', 'plant_wildflowers']) {
      const run = BH.bhRunHoneyLab(action);
      for (const row of run.rows) {
        expect(row.visits).toBeGreaterThan(0);
        expect(row.incoming).toBeLessThan(row.consumed);
        expect(row.before + row.feed + row.incoming - row.consumed + row.rounding).toBeCloseTo(row.stores, 8);
      }
    }
    const a = BH.bhRunHoneyLab();
    expect(a.state.honey).toBeLessThan(a.start.honey);
  });
  it('distinguishes higher stores relative to the control from growing food stores', () => {
    const a = BH.bhRunHoneyLab(), b = BH.bhRunHoneyLab('feed_bees'), flowers = BH.bhRunHoneyLab('plant_wildflowers');
    expect(b.state.honey - a.state.honey).toBeCloseTo(5, 1);
    expect(b.rows.slice(1).every(row => row.net < 0)).toBe(true);
    expect(flowers.rows[0].incoming).toBeGreaterThanOrEqual(a.rows[0].incoming);
    expect(b.rows.reduce((n, r) => n + r.feed, 0)).toBe(5);
    expect(flowers.rows.every(r => r.feed === 0)).toBe(true);
  });
  it('uses the existing comparison and registration audits and rejects changed post-run plans', () => {
    const lab = plannedLab();
    const comparison = BH.bhHoneyLabComparison(lab);
    expect(comparison.interpretationReady).toBe(true);
    expect(comparison.management.status).toBe('one-change');
    expect(comparison.prediction.status).toBe('aligned');
    expect(BH.bhHoneyLabComparison({ ...lab, expectedDirection: 'lower' }).interpretationReady).toBe(false);
    expect(BH.bhHoneyLabRecord({ ...lab, expectedDirection: 'lower' })).toBeNull();
  });
  it('keeps incorrect predictions testable and requires an explanation and transfer check', () => {
    const lab = plannedLab('plant_wildflowers', 'lower');
    expect(BH.bhHoneyLabComparison(lab).prediction.status).toBe('not-aligned');
    expect(BH.bhHoneyLabReady({ ...lab, step: 4, explanationChoice: 'no-flight' })).toBe(false);
    expect(BH.bhHoneyLabReady({ ...lab, step: 4, explanationChoice: 'budget' })).toBe(true);
    expect(BH.bhHoneyLabReady({ ...lab, step: 5, transferPrediction: 'same' })).toBe(false);
    expect(BH.bhHoneyLabReady({ ...lab, step: 5, transferPrediction: 'lower', responseMode: 'writing', transferReason: '' })).toBe(false);
  });
  it('preserves a registered draft through the actual host save contract', () => {
    const source = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const start = source.indexOf('// BEEHIVE_PERSISTENCE_HELPER_START');
    const end = source.indexOf('// BEEHIVE_PERSISTENCE_HELPER_END', start);
    expect(start).toBeGreaterThanOrEqual(0); expect(end).toBeGreaterThan(start);
    const contract = Function(source.slice(start, end) + '\nreturn { save: _serializeBeehiveForPersistence, restore: _deserializeBeehiveFromPersistence };')();
    const original = { day: 17, honey: 31, autoAdvance: true, honeyInvestigation: plannedLab(), notebook: { beekeeper: { evidence: 'Existing observation' } } };
    const restored = contract.restore(JSON.parse(JSON.stringify(contract.save(original))));
    expect(BH.bhNormalizeHoneyLab(restored.honeyInvestigation)).toEqual(original.honeyInvestigation);
    expect(BH.bhHoneyLabComparison(restored.honeyInvestigation).interpretationReady).toBe(true);
    expect(restored.notebook).toEqual(original.notebook);
    expect(restored.autoAdvance).toBeUndefined();
    expect(original.autoAdvance).toBe(true);
  });
  it('returns a damaged saved plan to planning without discarding the learner responses', () => {
    const lab = plannedLab();
    const missing = BH.bhNormalizeHoneyLab({ ...lab, registeredPlan: null, step: 6, saved: true });
    expect(missing).toMatchObject({ step: 2, saved: false, registeredPlan: null, initialReason: lab.initialReason });
    const changed = BH.bhNormalizeHoneyLab({ ...lab, expectedDirection: 'lower' });
    expect(changed).toMatchObject({ step: 2, registeredPlan: null, planReason: lab.planReason });
  });
  it('does not award evidence for treatment counts or a legacy award', () => {
    expect(BH.bhMiteEvidenceReady({ varroaTreats: 50, badges: { varroa_fighter: { earned: true } } })).toBe(false);
    const entry = { prediction: 'Mite pressure will fall', evidence: '24 to 5', explanation: 'The intervention reduced modeled mite pressure', review: { prediction: true, evidence: true, explanation: true } };
    const trail = [{ choiceId: 'varroa_treatment', outcome: { varroaBefore: 24, varroaAfter: 5, reduction: 19 } }];
    expect(BH.bhMiteEvidenceReady({ notebook: { beekeeper: entry }, managementTrail: trail })).toBe(true);
    expect(BH.bhMiteEvidenceReady({ notebook: { beekeeper: entry }, managementTrail: [{ choiceId: 'varroa_treatment', outcome: { varroaBefore: 4, varroaAfter: 0, reduction: 4 } }] })).toBe(false);
  });
});

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
describe('Bee guided investigation learner workflow', () => {
  let host, root, latest;
  beforeEach(() => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const canvas = new Proxy({ measureText: () => ({ width: 80 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient },
      { get: (t,p) => p in t ? t[p] : vi.fn(), set: (t,p,v) => { t[p]=v; return true; } });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvas);
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const initial = { viewMode: 'beekeeper', day: 17, honey: 31, workers: 12345, soundOn: false, motionPaused: true, tutorialDone: true,
      notebook: { beekeeper: { prediction: 'Existing prediction', evidence: 'Existing evidence', explanation: 'Existing explanation' } },
      experimentBaseline: { preserved: true }, honeyInvestigation: BH.bhNewHoneyLab() };
    function Component() {
      const [data, setData] = React.useState({ beehive: initial });
      latest = data;
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    act(() => root.render(React.createElement(Component)));
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  function click(text) {
    const button = [...host.querySelectorAll('button')].find(b => b.textContent === text);
    expect(button, text).toBeTruthy();
    act(() => button.click());
  }
  function select(field, value) {
    const input = [...host.querySelectorAll('input')].find(i => i.name === 'bee-honey-' + field && i.value === value);
    expect(input, field + '=' + value).toBeTruthy();
    act(() => input.click());
  }
  it('completes a selected-response investigation and preserves the ongoing colony and notebook', () => {
    click('Run the baseline'); expect(latest.beehive.honeyInvestigation.step).toBe(0);
    select('initialPrediction', 'higher');
    select('initialReason', 'Flying bees always bring back more food than the colony uses.');
    click('Run the baseline');
    expect(document.activeElement.id).toBe('bee-honey-step-title');
    expect(host.querySelector('table')).toBeTruthy();
    click('Plan a comparison');
    select('actionId', 'feed_bees'); select('expectedDirection', 'higher');
    select('planReason', 'Supplemental food changes the starting food available, but the dearth continues.');
    click('Register plan and run B');
    expect(host.querySelector('[data-honey-fair-comparison]').dataset.honeyFairComparison).toBe('matched');
    click('Explain the result');
    select('explanationChoice', 'no-flight'); click('Try a new situation');
    expect(latest.beehive.honeyInvestigation.step).toBe(4);
    select('explanationChoice', 'budget'); click('Try a new situation');
    select('transferPrediction', 'same'); click('Save investigation');
    expect(latest.beehive.honeyInvestigation.step).toBe(5);
    select('transferPrediction', 'lower'); click('Save investigation');
    expect(latest.beehive.notebook.honeyStores.text).toContain('Run B Day 55');
    expect(latest.beehive.notebook.honeyStores.initialPrediction).toBe('higher');
    expect(latest.beehive.notebook.beekeeper.prediction).toBe('Existing prediction');
    expect(latest.beehive.experimentBaseline).toEqual({ preserved: true });
    expect(latest.beehive).toMatchObject({ day: 17, honey: 31, workers: 12345, soundOn: false, motionPaused: true });
    click('Open Science Notebook');
    expect(host.querySelector('[data-honey-notebook-record]')).toBeTruthy();
    expect(document.activeElement).toBe(host.querySelector('[data-beehive-notebook]'));
  });
  it('does not skip an observation step when a next button is activated twice before rendering', () => {
    select('initialPrediction', 'lower');
    select('initialReason', 'The colony may use more food than the foragers bring in.');
    const button = [...host.querySelectorAll('button')].find(b => b.textContent === 'Run the baseline');
    act(() => { button.click(); button.click(); });
    expect(latest.beehive.honeyInvestigation.step).toBe(1);
    expect(host.querySelector('table')).toBeTruthy();
  });
  it('supports pausing the lesson and returning to the same step', () => {
    select('initialPrediction', 'lower');
    click('Return to my hive');
    expect(latest.beehive.honeyInvestigation.active).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('[data-open-honey-lab]'));
    click('Resume investigation');
    expect(host.querySelector('input[value="lower"]').checked).toBe(true);
    expect(latest.beehive.day).toBe(17);
  });
  it('has named controls and no axe WCAG A/AA findings in the initial investigation', async () => {
    const result = await axe.run(host, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] }, rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map(v => v.id)).toEqual([]);
  });
});
