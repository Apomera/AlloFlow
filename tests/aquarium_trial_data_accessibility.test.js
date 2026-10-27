import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });
function find(node, match) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = find(child, match); if (found) return found; } return null; }
  return match(node) ? node : find(node.props?.children, match);
}
async function mount(patch = {}) {
  resetStemLab(); const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  let latest, tree;
  function Host() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'tank', selectedTank: 'freshwater', aquariumWorkspacePanel: 'investigate', tutorialDismissed: true,
      soundEnabled: false, simRunning: false, simTick: 10, simDay: 0, simHour: 12, fishIdentityVersion: 3,
      tankFish: ['guppy'], fishInstanceIds: ['fish-1'], nextFishInstanceId: 2, hungerLevels: { 'fish-1': 80 },
      tankPlants: ['anubias'], plantHealth: { anubias: 80 }, plantBiomass: { anubias: 2 }, habitatLayout: [],
      waterChem: { temp: 76, pH: 7, ammonia: .1, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 },
      lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
      equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 }, equipmentFaults: {},
      coins: 50, observationNotes: 'My own live-tank observation.', ...patch
    } });
    latest = data._aquarium;
    tree = tool.render(makeCtx({ toolData: data, setToolData: setData, addToast: vi.fn(), announceToSR: vi.fn() }, store));
    return tree;
  }
  await act(async () => root.render(React.createElement(Host)));
  return { host, state: () => latest,
    action: name => host.querySelector('[data-aquarium-trial-action="' + name + '"]'),
    field: name => host.querySelector('[data-aquarium-trial-field="' + name + '"]'),
    history: () => host.querySelector('[data-aquarium-trial-history]'),
    table: () => host.querySelector('[data-aquarium-trial-history-table]'),
    change: (name, value) => act(async () => find(tree, node => node.props?.['data-aquarium-trial-field'] === name).props.onChange({ target: { value } }))
  };
}
async function activate(button) { expect(button).toBeTruthy(); await act(async () => { button.focus(); button.click(); }); }
async function setup() {
  const t = await mount(); await activate([...t.host.querySelectorAll('button')].find(n => n.textContent === 'Save baseline')); return t;
}
async function trial() {
  const t = await setup(); await t.change('prediction', 'Oxygen in B may fall because its biological lights are off.'); await activate(t.action('create')); return t;
}
function live(t) {
  const d = t.state();
  return JSON.parse(JSON.stringify({ tank: d.selectedTank, chemistry: d.waterChem, tick: d.simTick, hour: d.simHour, fish: d.tankFish, ids: d.fishInstanceIds, biomass: d.plantBiomass, coins: d.coins, notes: d.observationNotes, baseline: d.observationBaseline }));
}
function assertRows(t, metric) {
  const exp = t.state().inquiryExperiment, rows = [...t.table().querySelectorAll('tbody tr')];
  expect(rows).toHaveLength(exp.series.length);
  rows.forEach((row, index) => {
    const point = exp.series[index], a = point.a[metric], b = point.b[metric], delta = b - a;
    expect(row.querySelector('th').scope).toBe('row');
    expect(row.querySelector('th').textContent).toBe(String(point.hour) + (point.hour === 0 ? ' · Start' : ''));
    expect([...row.querySelectorAll('td')].map(cell => cell.textContent)).toEqual([a.toFixed(3), b.toFixed(3), (delta > 0 ? '+' : '') + delta.toFixed(3)]);
  });
}

describe('Aquarium paired-trial accessible data and form guidance', () => {
  it('provides the saved starting readings with row and column headers before time advances', async () => {
    const t = await trial();
    expect(t.history().tagName).toBe('DETAILS'); expect(t.history().open).toBe(false);
    expect(t.history().querySelector('summary').textContent).toBe('View hourly readings: Oxygen');
    expect(t.table().querySelector('caption').textContent).toContain('Oxygen (mg/L)');
    expect([...t.table().querySelectorAll('thead th')].every(n => n.scope === 'col')).toBe(true);
    expect([...t.table().querySelectorAll('thead th')].map(n => n.textContent)).toEqual(['Trial hour', 'A · Original (mg/L)', 'B · Changed (mg/L)', 'B − A (mg/L)']);
    expect(t.host.querySelector('[data-aquarium-trial-history-help]').textContent).toContain('aquarium hour 10');
    assertRows(t, 'dissolvedO2');
  });

  it('includes every plotted intermediate hour through the 24-hour completion boundary', async () => {
    const t = await trial(), before = live(t);
    for (let i = 0; i < 4; i++) await activate(t.action('observe-6'));
    expect(t.state().inquiryExperiment.elapsed).toBe(24); expect(t.table().querySelectorAll('tbody tr')).toHaveLength(25); assertRows(t, 'dissolvedO2');
    const completed = JSON.stringify(t.state().inquiryExperiment); await activate(t.action('observe-1')); expect(JSON.stringify(t.state().inquiryExperiment)).toBe(completed);
    expect(live(t)).toEqual(before);
  });

  it('keeps the native disclosure open while changing metrics and updates all values and units', async () => {
    const t = await trial(); await activate(t.action('observe-6'));
    const history = t.history(); history.open = true;
    const exp = JSON.stringify(t.state().inquiryExperiment), before = live(t);
    await t.change('metric', 'nitrate');
    expect(t.history()).toBe(history); expect(history.open).toBe(true); expect(t.table().querySelector('caption').textContent).toContain('Nitrate (ppm)'); assertRows(t, 'nitrate');
    await t.change('metric', 'pH'); expect(t.table().querySelector('caption').textContent).toContain('pH (unitless)'); assertRows(t, 'pH');
    expect(t.host.querySelector('.aquarium-inquiry-chart').getAttribute('aria-label')).toContain('pH over 6 trial hours');
    expect(JSON.stringify(t.state().inquiryExperiment)).toBe(exp); expect(live(t)).toEqual(before);
  });

  it('updates table rows when replaying without losing reflection, disclosure, or action focus', async () => {
    const t = await trial(); await activate(t.action('observe-6')); await t.change('reflection', 'Compare the same hour in both tanks.');
    const history = t.history(); history.open = true;
    await activate(t.action('replay'));
    expect(document.activeElement).toBe(t.action('replay')); expect(t.state().inquiryExperiment.elapsed).toBe(0); expect(t.state().inquiryExperiment.reflection).toBe('Compare the same hour in both tanks.');
    expect(t.history()).toBe(history); expect(history.open).toBe(true); assertRows(t, 'dissolvedO2');
  });

  it('gives each chart and keyboard-scrollable table its own caption and description', async () => {
    const a = await trial(), b = await trial();
    for (const t of [a, b]) {
      const chart = t.host.querySelector('.aquarium-inquiry-chart'), description = document.getElementById(chart.getAttribute('aria-describedby'));
      expect(t.host.contains(description)).toBe(true); expect(description.textContent).toContain('same Oxygen readings as the graph');
      const region = t.host.querySelector('[data-aquarium-trial-history-region]');
      expect(region.getAttribute('role')).toBe('region'); expect(region.tabIndex).toBe(0);
      expect(document.getElementById(region.getAttribute('aria-labelledby'))).toBe(t.table().querySelector('caption'));
      t.history().open = true; region.focus(); expect(document.activeElement).toBe(region);
      expect(t.host.querySelector('[aria-label="Paired tank readings"]').getAttribute('role')).toBe('group');
    }
    expect(a.table().querySelector('caption').id).not.toBe(b.table().querySelector('caption').id);
    expect(a.host.querySelector('.aquarium-inquiry-chart').getAttribute('aria-describedby')).not.toBe(b.host.querySelector('.aquarium-inquiry-chart').getAttribute('aria-describedby'));
  });

  it('explains the required prediction and its limit before enabling creation', async () => {
    const t = await setup(), prediction = t.field('prediction'), before = live(t);
    expect(prediction.required).toBe(true); expect(prediction.maxLength).toBe(1000);
    const help = document.getElementById(prediction.getAttribute('aria-describedby'));
    expect(help.textContent).toContain('Required'); expect(help.textContent).toContain('1,000'); expect(t.host.contains(help)).toBe(true);
    expect(t.action('create').disabled).toBe(true); expect(document.getElementById(t.action('create').getAttribute('aria-describedby')).textContent).toContain('write a prediction');
    await t.change('prediction', '   '); expect(t.action('create').disabled).toBe(true);
    await t.change('prediction', 'An explanation.'); expect(t.action('create').disabled).toBe(false); expect(live(t)).toEqual(before);
  });

  it('associates specific plant bounds and unchanged-value feedback without permitting an invalid trial', async () => {
    const t = await setup(); await t.change('prediction', 'A prediction.'); await t.change('factor', 'plant:anubias');
    for (const value of ['', '-1', '99', '2']) {
      await t.change('value', value); const field = t.field('value');
      expect(field.getAttribute('aria-invalid')).toBe('true'); expect(t.action('create').disabled).toBe(true);
      const descriptions = field.getAttribute('aria-describedby').split(' ').map(id => document.getElementById(id));
      expect(descriptions.every(n => t.host.contains(n))).toBe(true);
      expect(descriptions.map(n => n.textContent).join(' ')).toContain('different from the saved value of 2');
      expect(t.host.querySelector('[data-aquarium-trial-value-error]').textContent).toContain('0 to 3');
    }
    await t.change('value', '1'); expect(t.field('value').getAttribute('aria-invalid')).toBe('false'); expect(t.host.querySelector('[data-aquarium-trial-value-error]')).toBeNull(); expect(t.action('create').disabled).toBe(false);
    expect(t.field('value').getAttribute('aria-describedby').split(' ').every(id => !!document.getElementById(id))).toBe(true);
  });

  it('provides unchanged-setting feedback for native equipment selects and keeps form IDs distinct', async () => {
    const a = await setup(), b = await setup();
    for (const t of [a, b]) { await t.change('factor', 'airPump'); await t.change('value', '0'); expect(t.field('value').getAttribute('aria-invalid')).toBe('true'); expect(t.host.querySelector('[data-aquarium-trial-value-error]').textContent).toContain('Air pump level: 0'); }
    expect(a.field('prediction').getAttribute('aria-describedby')).not.toBe(b.field('prediction').getAttribute('aria-describedby'));
    expect(a.host.querySelector('[data-aquarium-trial-value-error]').id).not.toBe(b.host.querySelector('[data-aquarium-trial-value-error]').id);
  });
});
