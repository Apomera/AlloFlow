import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let model, odds;
beforeEach(() => { resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); model = window.StemLab.evoIslandModel; odds = window.StemLab.evoIslandCountOdds; });

describe('survivor-count probabilities under independent draws', () => {
  it('matches exhaustive survival outcomes for different individual probabilities', () => {
    const chances = [.08, .27, .66, .93], original = [...chances], data = odds.distribution(chances);
    const expected = Array(5).fill(0);
    for (let outcome = 0; outcome < 16; outcome++) {
      let count = 0, probability = 1;
      chances.forEach((p, i) => { const survived = !!(outcome & (1 << i)); count += survived ? 1 : 0; probability *= survived ? p : 1 - p; });
      expected[count] += probability;
    }
    data.mass.forEach((p, i) => expect(p).toBeCloseTo(expected[i], 14));
    expect(chances).toEqual(original);
    expect(data.expected).toBeCloseTo(chances.reduce((a, b) => a + b, 0), 14);
    expect(data.variance).toBeCloseTo(chances.reduce((sum, p) => sum + p * (1 - p), 0), 14);
  });

  it('retains deterministic zero and one chances, including a zero-resident mathematical distribution', () => {
    expect(odds.distribution([])).toEqual({ count: 0, mass: [1], expected: 0, variance: 0 });
    expect(odds.distribution([0, 0, 1, 1])).toEqual({ count: 4, mass: [0, 0, 1, 0, 0], expected: 2, variance: 0 });
    expect(odds.band(odds.distribution([0, 1]), 0, 0)).toBe(0);
    expect(odds.band(odds.distribution([0, 1]), 1, 1)).toBe(1);
    expect(odds.central(odds.distribution([]))).toEqual({ low: 0, high: 0 });
  });

  it('normalizes full populations and preserves distribution moments and discrete central coverage', () => {
    for (const chances of [Array(60).fill(.02), Array(60).fill(.95), Array.from({ length: 60 }, (_, i) => .02 + i / 64), [.1], [.5, .5]]) {
      const data = odds.distribution(chances), band = odds.central(data);
      expect(data.mass).toHaveLength(chances.length + 1); expect(data.mass.every(p => p >= 0 && p <= 1)).toBe(true);
      expect(data.mass.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 12);
      const mean = data.mass.reduce((sum, p, k) => sum + k * p, 0);
      const variance = data.mass.reduce((sum, p, k) => sum + (k - mean) ** 2 * p, 0);
      expect(mean).toBeCloseTo(data.expected, 11); expect(variance).toBeCloseTo(data.variance, 11);
      expect(odds.band(data, band.low, band.high)).toBeGreaterThanOrEqual(.8 - 1e-12);
      expect(odds.band(data, 0, chances.length)).toBeCloseTo(1, 12);
    }
    expect(odds.distribution([.5, .5]).mass).toEqual([.25, .5, .25]);
  });

  it('uses the coming recorded conditions and original individual chances without changing biological replay', () => {
    let world = model.create(2026); for (let i = 0; i < 4; i++) world = model.step(world);
    const original = JSON.stringify(world), next = model.step(world), plan = model.preview(world);
    const data = odds.forecast(world), population = world.history[4].population;
    expect(data.habitat).toBe(next.history[5].habitat); expect(data.habitat).toBe(plan.habitat); expect(data.habitat).not.toBe(world.habitat);
    expect(data.generation).toBe(5); expect(data.count).toBe(population.length);
    expect(data.mass).toEqual(odds.distribution(population.map(o => model.chance(o, model.habitats[plan.habitat], world.selection))).mass);
    for (let i = 0; i < 5; i++) expect(odds.forecast(world)).toEqual(data);
    expect(JSON.stringify(world)).toBe(original); expect(model.step(world)).toEqual(next);
    const neutral = { ...world, selection: false, living: false, habitat: 'drought' };
    expect(odds.forecast(neutral).mass).toEqual(odds.distribution(Array(population.length).fill(.68 * model.habitats.drought.food)).mass);
  });

  it('rejects invalid probabilities and reversed, fractional or out-of-bounds ranges', () => {
    for (const invalid of [null, {}, [NaN], [Infinity], [-.1], [1.1], ['.5'], [undefined], Array(2), Array(61).fill(.5)]) expect(odds.distribution(invalid)).toBeNull();
    const data = odds.distribution([.2, .8]);
    for (const [low, high] of [[-1, 1], [0, 3], [1, 0], [.5, 2], [0, 1.5], ['', 1], [null, 1], [NaN, 1]]) expect(odds.band(data, low, high)).toBeNull();
    expect(odds.band(null, 0, 0)).toBeNull(); expect(odds.central(null)).toBeNull();
  });

  it('offers no future probability forecast after extinction or the expedition limit', () => {
    const world = model.create(1); world.history[0].population = []; world.history[0].stats = model.stats([]);
    expect(odds.forecast(world)).toBeNull();
    let end = { ...model.create(2026), selection: false, living: false }; for (let i = 0; i < 60; i++) end = model.step(end);
    expect(odds.forecast(end)).toBeNull(); expect(odds.forecast(null)).toBeNull(); expect(odds.forecast({})).toBeNull();
  });
});
