import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem'); api = window.StemLab.ecosystemFoodWeb; });
describe('food-web habitat cover', () => {
  it('normalizes old saves and clamps invalid cover', () => {
    expect(api.normalize({}).cover).toBe(0);
    expect(api.normalize({ cover: NaN }).cover).toBe(0);
    expect(api.normalize({ cover: -10 }).cover).toBe(0);
    expect(api.normalize({ cover: 200 }).cover).toBe(80);
    expect(api.run({}, true)).toEqual(api.run({ cover: 0 }, true));
  });
  it('reduces early predation without directly modifying plant growth or grazing', () => {
    const open = api.run({ cover: 0, event: 'none' }, false);
    const sheltered = api.run({ cover: 80, event: 'none' }, false);
    expect(sheltered[1].values.rabbits).toBeGreaterThan(open[1].values.rabbits);
    expect(sheltered[1].values.voles).toBeGreaterThan(open[1].values.voles);
    expect(sheltered[1].values.foxes).toBeLessThan(open[1].values.foxes);
    expect(sheltered[1].values.owls).toBeLessThan(open[1].values.owls);
    const noPredators = { enabled: { foxes: false, owls: false }, event: 'none' };
    const a = api.run({ ...noPredators, cover: 0 }, false), b = api.run({ ...noPredators, cover: 80 }, false);
    expect(a.map(r => r.values)).toEqual(b.map(r => r.values));
  });
  it('restores cover exactly at event time, keeps the baseline unchanged and has delayed biomass effects', () => {
    const input = { cover: 10, event: 'restoreCover', eventStep: 80 }, saved = JSON.stringify(input);
    const pair = api.compare(input);
    expect(JSON.stringify(input)).toBe(saved);
    expect(pair.experiment.slice(0, 80)).toEqual(pair.baseline.slice(0, 80));
    expect(pair.experiment[80].values).toEqual(pair.baseline[80].values);
    expect(pair.experiment.slice(80).every(r => r.cover === 50)).toBe(true);
    expect(pair.baseline.every(r => r.cover === 10)).toBe(true);
    expect(pair.experiment[81].values.voles).toBeGreaterThan(pair.baseline[81].values.voles);
    expect(pair.experiment[81].capacity).toBe(pair.baseline[81].capacity);
  });
  it('clears cover persistently without instantly removing biomass', () => {
    const pair = api.compare({ cover: 60, event: 'clearCover', eventStep: 10 });
    expect(pair.experiment[10].values).toEqual(pair.baseline[10].values);
    expect(pair.experiment.slice(10).every(r => r.cover === 0)).toBe(true);
    expect(pair.experiment[11].values.voles).toBeLessThan(pair.baseline[11].values.voles);
    expect(pair.baseline.every(r => r.cover === 60)).toBe(true);
  });
  it('caps restoration and preserves identical no-op comparisons', () => {
    expect(api.compare({ cover: 70, event: 'restoreCover' }).experiment[80].cover).toBe(80);
    for (const input of [{ cover: 80, event: 'restoreCover' }, { cover: 0, event: 'clearCover' }, { cover: 60, event: 'none' }]) {
      const pair = api.compare(input); expect(pair.experiment).toEqual(pair.baseline);
    }
  });
  it('stays finite and nonnegative with dense communities and high cover', () => {
    const input = { cover: 80, capacity: 40, initial: Object.fromEntries(api.species.map(sp => [sp.id, 160])), event: 'clearCover' };
    const rows = api.run(input, true);
    for (const row of rows) for (const value of Object.values(row.values)) { expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(0); }
    const fine = api.run(input, true, 8);
    const diff = Math.max(...rows.flatMap((r,i) => api.species.map(sp => Math.abs(r.values[sp.id] - fine[i].values[sp.id]))));
    const finer = api.run(input, true, 16);
    const refinedDiff = Math.max(...fine.flatMap((r,i) => api.species.map(sp => Math.abs(r.values[sp.id] - finer[i].values[sp.id]))));
    expect(diff / 160).toBeLessThan(0.01);
    expect(refinedDiff).toBeLessThan(diff * 0.6);
  });
  it('exports both cover and capacity with each paired sample', () => {
    const rows = api.csv(api.compare({ cover: 10, event: 'restoreCover' })).split('\r\n').map(row => row.split(','));
    expect(rows).toHaveLength(242); expect(rows.every(row => row.length === 15)).toBe(true);
    expect(rows[0].slice(-4)).toEqual(['capacity_baseline', 'capacity_experiment', 'refuge_cover_percent_baseline', 'refuge_cover_percent_experiment']);
    expect(rows[80].slice(-2)).toEqual(['10.00','10.00']);
    expect(rows[81].slice(-2)).toEqual(['10.00','50.00']);
  });
});
