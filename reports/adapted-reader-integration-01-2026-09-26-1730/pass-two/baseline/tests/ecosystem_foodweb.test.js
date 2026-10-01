import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem'); api = window.StemLab.ecosystemFoodWeb; });
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = null; host = null; });

describe('multi-species food-web model', () => {
  it('runs a reproducible control with identical trajectories and no input mutation', () => {
    const input = { event: 'none', initial: { rabbits: 42 } }, original = JSON.stringify(input);
    const pair = api.compare(input);
    expect(pair.baseline).toEqual(pair.experiment);
    expect(api.compare(input)).toEqual(pair);
    expect(JSON.stringify(input)).toBe(original);
    expect(pair.baseline).toHaveLength(241);
    expect(pair.baseline.at(-1).time).toBe(24);
  });
  it('removes only the selected group at the exact event time and never resurrects it', () => {
    const pair = api.compare({ event: 'remove', target: 'foxes', eventStep: 80 });
    expect(pair.experiment.slice(0, 80)).toEqual(pair.baseline.slice(0, 80));
    expect(pair.experiment[80].values.foxes).toBe(0);
    for (const id of ['plants', 'rabbits', 'voles', 'owls']) expect(pair.experiment[80].values[id]).toBe(pair.baseline[80].values[id]);
    expect(pair.experiment.slice(80).every(row => row.values.foxes === 0)).toBe(true);
    expect(pair.experiment.at(-1).values.plants).not.toBeCloseTo(pair.baseline.at(-1).values.plants, 2);
  });
  it('reduces a group by exactly 80 percent while allowing its remaining biomass to respond', () => {
    const pair = api.compare({ event: 'reduce', target: 'voles', eventStep: 50 });
    expect(pair.experiment[50].values.voles).toBeCloseTo(pair.baseline[50].values.voles * 0.2, 10);
    expect(pair.experiment[51].values.voles).toBeGreaterThan(0);
  });
  it('drought persistently lowers capacity without instantly deleting plant biomass', () => {
    const pair = api.compare({ event: 'drought', eventStep: 100, capacity: 180 });
    expect(pair.experiment[100].values).toEqual(pair.baseline[100].values);
    expect(pair.experiment.slice(100).every(row => row.capacity === 90)).toBe(true);
    expect(pair.experiment.at(-1).values.plants).toBeLessThan(pair.baseline.at(-1).values.plants);
  });
  it('excludes disabled species from all samples', () => {
    const pair = api.compare({ enabled: { voles: false, owls: false }, event: 'none' });
    expect(pair.baseline.every(row => row.values.voles === 0 && row.values.owls === 0)).toBe(true);
  });
  it('an additional herbivore consumes shared resources', () => {
    const alone = api.run({ enabled: { voles: false, foxes: false, owls: false } }, false);
    const shared = api.run({ enabled: { foxes: false, owls: false } }, false);
    expect(shared[20].values.plants).toBeLessThan(alone[20].values.plants);
  });
  it('alternative prey supports foxes when rabbits are absent', () => {
    const none = api.run({ initial: { rabbits: 0 }, enabled: { voles: false, owls: false } }, false);
    const voles = api.run({ initial: { rabbits: 0 }, enabled: { owls: false } }, false);
    expect(voles.at(-1).values.foxes).toBeGreaterThan(none.at(-1).values.foxes);
  });
  it('keeps extreme supported settings finite and nonnegative, including absent resources', () => {
    for (const plants of [0, 1, 160]) {
      const rows = api.run({ capacity: 40, initial: { plants, rabbits: 160, voles: 160, foxes: 160, owls: 160 } }, true);
      for (const row of rows) for (const value of Object.values(row.values)) { expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(0); }
      if (plants === 0) expect(rows.every(row => row.values.plants === 0)).toBe(true);
    }
  });
  it('is stable under timestep refinement', () => {
    const coarse = api.run({}, true, 4), fine = api.run({}, true, 8);
    const maxDifference = Math.max(...coarse.flatMap((row, i) => api.species.map(sp => Math.abs(row.values[sp.id] - fine[i].values[sp.id]))));
    expect(maxDifference).toBeLessThan(0.5);
  });
  it('normalizes stale or invalid saved values without poisoning the model', () => {
    const cfg = api.normalize({ initial: { rabbits: Infinity, voles: -20 }, capacity: NaN, target: 'dragon', event: 'unknown', eventStep: 900 });
    expect(cfg.initial.rabbits).toBe(35); expect(cfg.initial.voles).toBe(0); expect(cfg.capacity).toBe(160);
    expect(cfg.target).toBe('foxes'); expect(cfg.eventStep).toBe(200);
  });
  it('distinguishes tiny positive biomass from removal', () => {
    expect(api.format(0)).toBe('0.0');
    expect(api.format(0.00134)).toBe('<0.1');
    expect(api.format(0.2)).toBe('0.2');
  });
  it('exports every paired value with a consistent CSV schema', () => {
    const pair = api.compare({});
    const rows = api.csv(pair).split('\r\n').map(row => row.split(','));
    expect(rows).toHaveLength(242); expect(rows.every(row => row.length === 15)).toBe(true);
    expect(rows[0]).toContain('foxes_experiment');
    expect(Number(rows[81][8])).toBe(0);
    expect(Number(rows[241][1])).toBeCloseTo(pair.baseline[240].values.plants, 5);
  });
});

it('preserves the committed prediction and invalidates results when the setup changes', async () => {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  let state;
  function Harness() {
    const [data, setData] = React.useState({ ecosystem: { tab: 'foodweb', tutorialDismissed: true, foodWeb: { prediction: 'Owls may benefit.' } } });
    state = data.ecosystem.foodWeb;
    return tool.render(makeCtx({ toolData: data, setToolData: setData }));
  }
  await act(async () => root.render(React.createElement(Harness)));
  expect(host.querySelectorAll('.efw-node')).toHaveLength(5);
  expect(host.querySelector('[data-eco-scenario-picker]')).toBeNull();
  const run = [...host.querySelectorAll('button')].find(el => el.textContent === 'Run food-web comparison');
  await act(async () => run.click());
  expect(state.run.prediction).toBe('Owls may benefit.');
  expect(host.querySelector('[data-efw-results]')).not.toBeNull();
  expect(host.querySelector('[data-efw-chart]').outerHTML).not.toMatch(/NaN|Infinity/);
  const simple = [...host.querySelectorAll('button')].find(el => el.textContent === 'Simple chain');
  await act(async () => simple.click());
  expect(state.run).toBeNull(); expect(state.enabled.voles).toBe(false);
  expect(host.querySelector('[data-efw-results]')).toBeNull();
});
