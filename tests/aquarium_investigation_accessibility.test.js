import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });

function point(tick) {
  return { tick, day: Math.floor(tick / 24), hour: tick % 24, chemistry: { dissolvedO2: 6 + tick / 10, nitrate: 20 + tick / 5 }, vitality: { average: 95 - tick / 10 } };
}
function baseline(tick = 8) {
  return { tick, chemistry: { dissolvedO2: 6, nitrate: 20 }, vitalityAverage: 95, plantCount: 0, organismCount: 1, signature: 'legacy baseline', prediction: { oxygen: 'rise', nitrate: 'stable', vitality: 'stable' }, plannedIntervention: 'Keep the original plan.' };
}
async function mount(patch = {}) {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  const announceToSR = vi.fn(), addToast = vi.fn(); let latest, update;
  function Host() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'tank', selectedTank: 'freshwater', aquariumWorkspacePanel: 'investigate', tutorialDismissed: true,
      soundEnabled: false, simRunning: false, simTick: 26, simDay: 1, simHour: 2, fishIdentityVersion: 3,
      tankFish: ['guppy'], fishInstanceIds: ['fish-1'], nextFishInstanceId: 2, fishNames: { 'fish-1': 'Azure' },
      hungerLevels: { 'fish-1': 25 }, fishSickness: {}, fishStress: {}, fishCareLog: {}, quarantinedFish: {},
      tankPlants: [], plantHealth: {}, plantBiomass: {}, habitatLayout: [],
      waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 },
      lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
      equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 }, equipmentFaults: {},
      coins: 50, observationNotes: 'Preserve my observation.', ecosystemInterventionNote: 'Keep my next plan.',
      ecosystemPrediction: { oxygen: 'rise', nitrate: 'stable', vitality: 'stable' },
      ecosystemExchangeHistory: [point(7), point(8), point(9)], ...patch
    } });
    latest = data._aquarium;
    update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    return React.createElement('div', null, tool.render(makeCtx({ toolData: data, setToolData: setData, announceToSR, addToast }, store)), React.createElement('button', { 'data-other-control': 'true' }, 'Another task'));
  }
  await act(async () => root.render(React.createElement(Host)));
  const systems = () => host.querySelector('[data-aquarium-disclosure="aquarium-systems-investigation"]');
  systems().open = true;
  announceToSR.mockClear(); addToast.mockClear();
  return { host, state: () => latest, rawUpdate: values => update(values), announceToSR, addToast, systems,
    history: () => host.querySelector('[data-aquarium-exchange-history]'),
    toggle: () => host.querySelector('[data-aquarium-exchange-history-table-toggle]'),
    table: () => host.querySelector('[data-aquarium-exchange-history-table]'),
    heading: () => host.querySelector('[data-aquarium-exchange-history-heading]'),
    mark: () => host.querySelector('[data-aquarium-ecosystem-baseline="mark"]'),
    clear: () => host.querySelector('[data-aquarium-ecosystem-baseline="clear"]'),
    other: () => host.querySelector('[data-other-control]') };
}
async function activate(button) { await act(async () => { button.focus(); button.click(); }); }

describe('Aquarium ecosystem investigation accessibility', () => {
  it('keeps changing causal evidence in a native list inside its named polite live log', async () => {
    const reasons = ['Fish respiration consumed oxygen.', 'Plants removed nitrate.', 'Surface exchange added oxygen.'];
    const exchange = { phase: 'day', reasons, chemistryDelta: { dissolvedO2: 0.08 } };
    const t = await mount({ lastEcosystemExchange: exchange });
    const log = t.host.querySelector('[data-aquarium-ecosystem-reasons]');
    expect(log.tagName).toBe('DIV'); expect(log.getAttribute('role')).toBe('log');
    expect(log.getAttribute('aria-live')).toBe('polite'); expect(log.getAttribute('aria-label')).toBe('Ecosystem change evidence');
    const list = log.querySelector('ul'); expect(list.getAttribute('role')).toBe('list');
    expect([...list.children].map(item => item.tagName)).toEqual(['LI', 'LI', 'LI']);
    expect([...list.children].map(item => item.textContent)).toEqual(reasons);
    const updatedReasons = ['Nighttime plants consumed oxygen.', 'Surface exchange replaced some oxygen.'];
    await act(async () => t.rawUpdate({ lastEcosystemExchange: { ...exchange, phase: 'night', reasons: updatedReasons } }));
    expect(t.host.querySelector('[data-aquarium-ecosystem-reasons]')).toBe(log);
    expect(log.querySelector('ul')).toBe(list);
    expect([...list.children].map(item => item.textContent)).toEqual(updatedReasons);
    expect(t.state().lastEcosystemExchange.reasons).toEqual(updatedReasons);
    expect(t.state().observationNotes).toBe('Preserve my observation.'); expect(t.announceToSR).not.toHaveBeenCalled();
  });

  it('provides every plotted hour with native table headers, units, and a textual baseline marker', async () => {
    const history = Array.from({ length: 26 }, (_, i) => point(i + 1)); history.splice(12, 0, null, { tick: 12 });
    const t = await mount({ ecosystemExchangeHistory: history, ecosystemBaseline: baseline(8) });
    const wrapper = t.table();
    expect(wrapper.hidden).toBe(true); expect(t.toggle().getAttribute('aria-expanded')).toBe('false');
    expect(t.toggle().getAttribute('aria-controls')).toBe(wrapper.id);
    await activate(t.toggle());
    expect(wrapper.hidden).toBe(false); expect(t.toggle().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(t.toggle());
    expect(wrapper.getAttribute('role')).toBe('region'); expect(wrapper.getAttribute('aria-label')).toBe('Ecosystem history data table'); expect(wrapper.tabIndex).toBe(0);
    const table = wrapper.querySelector('table');
    expect(table.querySelector('caption').textContent).toContain('24 aquarium hours');
    expect([...table.querySelectorAll('thead th')].map(cell => [cell.scope, cell.textContent])).toEqual([
      ['col', 'Aquarium hour (tick)'], ['col', 'Dissolved O₂ (mg/L)'], ['col', 'Nitrate NO₃ (ppm)'], ['col', 'Mean vitality (out of 100)']
    ]);
    const rows = [...table.querySelectorAll('tbody tr')]; expect(rows).toHaveLength(24);
    expect(rows[0].querySelector('th').scope).toBe('row'); expect(rows[0].querySelector('th').textContent).toBe('3');
    expect(rows.at(-1).querySelector('th').textContent).toBe('26');
    expect([...rows[0].querySelectorAll('td')].map(cell => cell.textContent)).toEqual(['6.30', '20.60', '94.7']);
    expect(table.querySelector('[data-aquarium-exchange-history-baseline] th').textContent).toBe('8Baseline');
    const chart = t.history().querySelector('svg[role="img"]');
    expect(document.getElementById(chart.getAttribute('aria-describedby')).textContent).toContain('same recorded aquarium hours');
    expect(chart.textContent).toContain('Hour 3'); expect(chart.textContent).toContain('Hour 26');
    await activate(t.toggle()); expect(t.table()).toBe(wrapper); expect(wrapper.hidden).toBe(true);
    expect(t.state().ecosystemExchangeHistory).toEqual(history); expect(t.state().observationNotes).toBe('Preserve my observation.');
  });

  it('keeps a useful empty disclosure and shows a single record before a line chart can be drawn', async () => {
    const t = await mount({ ecosystemExchangeHistory: [] }); const wrapper = t.table();
    await activate(t.toggle()); expect(wrapper.textContent).toContain('No aquarium hours recorded yet');
    expect(wrapper.hasAttribute('tabindex')).toBe(false); expect(wrapper.querySelector('table')).toBeNull();
    await act(async () => t.rawUpdate({ ecosystemExchangeHistory: [point(6)] }));
    expect(t.table()).toBe(wrapper); expect(wrapper.hidden).toBe(false); expect(wrapper.tabIndex).toBe(0);
    expect(wrapper.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(wrapper.querySelector('tbody th').textContent).toBe('6');
    expect(t.history().querySelector('svg[role="img"]')).toBeNull();
  });

  it('explains a baseline outside the displayed window instead of marking another row', async () => {
    const t = await mount({ ecosystemBaseline: baseline(2) }); await activate(t.toggle());
    expect(t.table().textContent).toContain('outside these displayed records: aquarium hour 2');
    expect(t.table().querySelector('[data-aquarium-exchange-history-baseline]')).toBeNull();
  });

  it('keeps disclosure and chart description relationships unique across two Aquarium instances', async () => {
    const first = await mount(), second = await mount({ ecosystemBaseline: baseline() });
    expect(first.table().id).not.toBe(second.table().id); expect(first.heading().id).not.toBe(second.heading().id);
    for (const t of [first, second]) {
      expect(t.history().getAttribute('aria-labelledby')).toBe(t.heading().id);
      expect(t.toggle().getAttribute('aria-controls')).toBe(t.table().id);
      const chart = t.history().querySelector('svg[role="img"]');
      expect(t.history().contains(document.getElementById(chart.getAttribute('aria-describedby')))).toBe(true);
    }
    await activate(second.toggle()); expect(first.table().hidden).toBe(true); expect(second.table().hidden).toBe(false);
    await activate(second.clear()); expect(document.activeElement).toBe(second.mark());
  });

  it('names Clear precisely, returns its keyboard focus, and preserves evidence and predictions', async () => {
    const t = await mount({ ecosystemBaseline: baseline() }); const before = JSON.parse(JSON.stringify(t.state()));
    const button = t.clear(); expect(button.getAttribute('aria-label')).toBe('Clear ecosystem comparison baseline');
    expect(button.getAttribute('aria-label')).toContain(button.textContent);
    await act(async () => { button.focus(); button.click(); button.click(); });
    expect(t.clear()).toBeNull(); expect(t.state().ecosystemBaseline).toBeNull(); expect(document.activeElement).toBe(t.mark());
    expect(t.mark().textContent).toBe('Mark baseline'); expect(t.mark().disabled).toBe(false);
    expect(t.announceToSR).toHaveBeenCalledOnce(); expect(t.announceToSR).toHaveBeenCalledWith('Ecosystem comparison baseline cleared. Predictions can be edited.');
    for (const key of ['ecosystemPrediction', 'ecosystemExchangeHistory', 'ecosystemInterventionNote', 'observationNotes', 'waterChem', 'tankFish', 'coins']) expect(t.state()[key]).toEqual(before[key]);
  });

  it('uses the history heading as a focus fallback for legacy baselines without predictions', async () => {
    const t = await mount({ ecosystemBaseline: baseline(), ecosystemPrediction: {} });
    expect(t.mark().disabled).toBe(true); await activate(t.clear());
    expect(document.activeElement).toBe(t.heading()); expect(t.heading().tabIndex).toBe(-1);
    expect(t.history().getAttribute('aria-labelledby')).toBe(t.heading().id);
  });

  it('does not reclaim focus after a user moves to another control', async () => {
    const t = await mount({ ecosystemBaseline: baseline() });
    await act(async () => { const clear = t.clear(); clear.focus(); clear.click(); t.other().focus(); });
    expect(document.activeElement).toBe(t.other()); expect(t.state().ecosystemBaseline).toBeNull();
  });

  it.each([{ aquariumWorkspacePanel: 'observe' }, { selectedTank: 'planted' }, { mode: 'learn' }])('cancels the focus handoff when context changes %j', async patch => {
    const t = await mount({ ecosystemBaseline: baseline() });
    await act(async () => { const clear = t.clear(); clear.focus(); clear.click(); t.rawUpdate(patch); });
    expect(document.activeElement).not.toBe(t.mark()); expect(document.activeElement).not.toBe(t.heading());
    for (const [key, value] of Object.entries(patch)) expect(t.state()[key]).toBe(value);
  });

  it('does not move focus into a systems investigation collapsed during the action', async () => {
    const t = await mount({ ecosystemBaseline: baseline() });
    await act(async () => { const clear = t.clear(); clear.focus(); clear.click(); t.systems().open = false; });
    expect(document.activeElement).not.toBe(t.mark()); expect(document.activeElement).not.toBe(t.heading());
    expect(t.systems().open).toBe(false);
  });

  it('exposes named progress with meaningful stage text and untruncated explanations', async () => {
    const t = await mount({ ecosystemBaseline: baseline() });
    const group = t.history().querySelector('[data-aquarium-investigation-progress]');
    expect(group.getAttribute('role')).toBe('group'); expect(group.getAttribute('aria-label')).toBe('Controlled investigation progress');
    const progress = group.querySelector('[role="progressbar"]');
    expect(progress.getAttribute('aria-valuetext')).toBe('Stage 4 of 4: Explain'); expect(progress.getAttribute('aria-valuenow')).toBe('100');
    const steps = [...group.querySelectorAll('[data-aquarium-investigation-stage]')]; expect(steps).toHaveLength(4);
    expect(steps[3].getAttribute('aria-current')).toBe('step'); expect(steps[1].textContent).toContain('legacy recorded intervention');
    steps.forEach(step => { expect(step.querySelector('[title]')).toBeNull(); expect(step.querySelector('.truncate')).toBeNull(); });
    await activate(t.clear()); expect(progress.getAttribute('aria-valuetext')).toBe('Stage 1 of 4: Predict');
  });
});
