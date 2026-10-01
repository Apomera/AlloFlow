import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let model, observe;
beforeEach(() => {
  resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  model = window.StemLab.evoIslandModel; observe = window.StemLab.evoIslandObservation;
});
const value = (o, trait) => (o.genes[trait][0] + o.genes[trait][1]) / 2;
const frame = (generation, population) => ({ generation, population, habitat: 'meadow', selection: true });

describe('recorded population comparison', () => {
  it('retains real identities, habitats and genes without changing the biological random stream', () => {
    let world = model.create(2026);
    for (let i = 0; i < 6; i++) world = model.step(world);
    const original = JSON.stringify(world), next = model.step(world);
    for (const trait of model.traits) {
      const pair = observe.populations(world, 0, 6, trait);
      for (const [index, generation] of [0, 6].entries()) {
        const population = world.history[generation].population, row = pair.rows[index];
        expect(row.generation).toBe(generation); expect(row.habitat).toBe(world.history[generation].habitat);
        expect(row.selection).toBe(world.history[generation].selection);
        expect(row.distribution.total).toBe(population.length);
        expect(row.distribution.bins.flatMap(bin => bin.members).map(o => o.id).sort((a, b) => a - b)).toEqual(population.map(o => o.id).sort((a, b) => a - b));
        row.distribution.bins.forEach(bin => bin.members.forEach(o => expect(population.find(member => member.id === o.id)).toBe(o)));
        const values = population.map(o => value(o, trait));
        expect(row.distribution.mean).toBeCloseTo(values.reduce((a, b) => a + b, 0) / values.length, 12);
        expect(row.range.minimum).toBe(Math.min(...values)); expect(row.range.maximum).toBe(Math.max(...values));
      }
      expect(pair.difference).toBeCloseTo((pair.rows[1].distribution.mean - pair.rows[0].distribution.mean) * 100, 12);
      expect(observe.populations(world, 6, 0, trait).difference).toBeCloseTo(-pair.difference, 12);
      expect(observe.populations(world, 6, 6, trait).difference).toBe(0);
    }
    expect(JSON.stringify(world)).toBe(original); expect(model.step(world)).toEqual(next);
  });

  it('uses each population’s own denominator and puts every boundary value in exactly one range', () => {
    const population = model.create(17).history[0].population.slice(0, 6);
    [0, .2, .4, .6, .8, 1].forEach((n, i) => { population[i].genes.fur = [n, n]; });
    const world = { seed: 17, history: [frame(0, population), frame(1, population.slice(0, 2))] };
    const pair = observe.populations(world, 0, 1, 'fur');
    expect(pair.rows[0].distribution.bins.map(bin => bin.count)).toEqual([1, 1, 1, 1, 2]);
    expect(pair.rows[1].distribution.bins.map(bin => bin.count)).toEqual([1, 1, 0, 0, 0]);
    expect(pair.rows[0].distribution.bins[0].share).toBe(1 / 6);
    expect(pair.rows[1].distribution.bins[0].share).toBe(1 / 2);
    pair.rows.forEach(row => expect(row.distribution.bins.reduce((sum, bin) => sum + bin.share, 0)).toBeCloseTo(1, 12));
  });

  it('reveals different variation even when the two means are identical', () => {
    const original = model.create(1).history[0].population.slice(0, 6);
    const make = values => values.map((n, i) => ({ ...original[i], genes: { ...original[i].genes, fur: [n, n] } }));
    const world = { seed: 1, history: [frame(0, make([0, 0, 0, 1, 1, 1])), frame(1, make([.5, .5, .5, .5, .5, .5]))] };
    const pair = observe.populations(world, 0, 1, 'fur');
    expect(pair.rows.map(row => row.distribution.mean)).toEqual([.5, .5]); expect(pair.difference).toBe(0);
    expect(pair.rows.map(row => row.distribution.bins.map(bin => bin.count))).toEqual([[3, 0, 0, 0, 3], [0, 0, 6, 0, 0]]);
    expect(pair.rows.map(row => [row.range.minimum, row.range.maximum])).toEqual([[0, 1], [.5, .5]]);
  });

  it('keeps a zero trait and zero-count ranges valid while empty populations have undefined means and shares', () => {
    const organism = model.create(1).history[0].population[0]; organism.genes.fur = [0, 0];
    const world = { seed: 1, history: [frame(0, [organism]), frame(1, [])] };
    const pair = observe.populations(world, 0, 1, 'fur');
    expect(pair.rows[0].distribution.mean).toBe(0); expect(pair.rows[0].range.minimum).toBe(0);
    expect(pair.rows[0].distribution.bins.map(bin => bin.share)).toEqual([1, 0, 0, 0, 0]);
    expect(pair.rows[1].distribution.mean).toBeNull(); expect(pair.rows[1].range).toBeNull();
    expect(pair.rows[1].distribution.bins.map(bin => [bin.count, bin.share])).toEqual(Array.from({ length: 5 }, () => [0, null]));
    expect(pair.difference).toBeNull(); expect(observe.populations(world, 1, 1, 'fur').difference).toBeNull();
    expect(observe.populations(world, 1, 0, 'fur').difference).toBeNull();
  });

  it('requires actual recorded generations and a modeled inherited trait', () => {
    const world = model.step(model.create(1));
    for (const index of [-1, 2, 1.2, '0', null, Infinity, NaN, '__proto__']) {
      expect(observe.populations(world, index, 1, 'fur')).toBeNull(); expect(observe.populations(world, 0, index, 'fur')).toBeNull();
    }
    for (const trait of ['natural', 'survival', '__proto__', null]) expect(observe.populations(world, 0, 1, trait)).toBeNull();
    for (const invalid of [null, {}, { history: [] }, { history: [null, frame(1, [])] }, { history: [frame(0, null), frame(1, [])] }]) expect(observe.populations(invalid, 0, 1, 'fur')).toBeNull();
  });

  it('offers a discoverable report action and keeps the optional comparison collapsed until requested', () => {
    const world = model.step(model.create(2026));
    const html = renderTool('evoLab', { evoLab: { view: 'livingIsland', island: world } });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect([...doc.querySelectorAll('.ei-field-report button')].some(button => button.textContent === 'Compare across generations')).toBe(true);
    const detail = doc.querySelector('[data-population-comparison]');
    expect(detail.tagName).toBe('DETAILS'); expect(detail.hasAttribute('open')).toBe(false);
    expect(detail.querySelector('summary').textContent).toBe('Explore variation through time');
    expect(detail.querySelectorAll('[data-population-bin]')).toHaveLength(0);
  });
});
