import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let sky;
beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy');
  sky = window.__alloAstroPure;
});

describe('H-R diagram coordinate and radius model', () => {
  it.each([undefined, null, false, true, '', {}, [], NaN, Infinity, -Infinity].map(value => [value]))(
    'recovers invalid saved values without inventing zero-temperature or dark stars (%s)',
    value => {
      const star = sky.hrStellarModel(value, value);
      expect(star.tempK).toBe(5800);
      expect(star.lumin).toBe(1);
      expect(star.radius).toBeGreaterThan(0);
      expect(Number.isFinite(star.x)).toBe(true);
      expect(Number.isFinite(star.y)).toBe(true);
    }
  );

  it('accepts numeric saved strings and clamps finite values to the supported plot', () => {
    expect(sky.hrStellarModel('5772', '1')).toMatchObject({ tempK: 5772, lumin: 1 });
    expect(sky.hrStellarModel(-10, -2)).toMatchObject({ tempK: 2000, lumin: 0.001 });
    expect(sky.hrStellarModel(90000, 1e9)).toMatchObject({ tempK: 50000, lumin: 100000 });
  });

  it('places hot stars on the left, cool stars on the right, and luminous stars at the top', () => {
    expect(sky.hrStellarModel(50000, 100000)).toMatchObject({ x: 0, y: 0 });
    expect(sky.hrStellarModel(2000, 0.001).x).toBeCloseTo(1, 12);
    expect(sky.hrStellarModel(2000, 0.001).y).toBeCloseTo(1, 12);
    expect(sky.hrStellarModel(Math.sqrt(50000 * 2000), 10).x).toBeCloseTo(0.5, 12);
    expect(sky.hrStellarModel(5800, 10).y).toBeCloseTo(0.5, 12);
  });

  it('gives equal plot spacing to each tenfold luminosity change', () => {
    const levels = [0.001, 0.01, 0.1, 1, 10, 100, 1000, 10000, 100000];
    const stars = levels.map(lumin => sky.hrStellarModel(5800, lumin));
    stars.slice(1).forEach((star, index) => {
      expect(stars[index].y - star.y).toBeCloseTo(0.125, 12);
      expect(star.logLum - stars[index].logLum).toBeCloseTo(1, 12);
    });
  });

  it('recovers the nominal solar radius from solar temperature and luminosity', () => {
    expect(sky.hrStellarModel(5772, 1).radius).toBeCloseTo(1, 12);
  });

  it('uses the Stefan-Boltzmann scaling when luminosity or temperature changes', () => {
    const original = sky.hrStellarModel(6000, 4);
    expect(sky.hrStellarModel(6000, 16).radius).toBeCloseTo(original.radius * 2, 12);
    expect(sky.hrStellarModel(12000, 4).radius).toBeCloseTo(original.radius / 4, 12);
  });

  it('keeps all supported extremes finite and inside the diagram', () => {
    for (const temperature of [2000, 3500, 5772, 12000, 25000, 50000]) {
      for (const luminosity of [0.001, 0.1, 1, 100, 10000, 100000]) {
        const star = sky.hrStellarModel(temperature, luminosity);
        expect(Number.isFinite(star.radius)).toBe(true);
        expect(star.radius).toBeGreaterThan(0);
        expect(star.x).toBeGreaterThanOrEqual(0);
        expect(star.x).toBeLessThanOrEqual(1);
        expect(star.y).toBeGreaterThanOrEqual(0);
        expect(star.y).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('H-R schematic regions avoid unsupported stellar classifications', () => {
  it('puts hot, faint, compact stars in the white-dwarf region', () => {
    const star = sky.hrStellarModel(20000, 0.01);
    expect(star.category).toBe('whiteDwarf');
    expect(star.radius).toBeLessThan(0.12);
  });

  it('does not infer a supergiant from luminosity alone on the hot main sequence', () => {
    expect(sky.hrStellarModel(30000, 10000).category).toBe('mainSeq');
  });

  it.each([
    [3500, 0.03, 'redDwarf'],
    [5772, 1, 'sunLike'],
    [4000, 100, 'redGiant'],
    [12000, 10000, 'supergiant'],
    [10000, 100, 'mainSeq'],
    [3500, 0.1, 'other']
  ])('places %s K, %s solar luminosities in the expected broad region', (temperature, luminosity, category) => {
    expect(sky.hrStellarModel(temperature, luminosity).category).toBe(category);
  });
});

describe('H-R saved observation compatibility', () => {
  it('keeps all five legacy categories and the new regions while rejecting empty or boolean numeric fields', () => {
    const categories = ['redDwarf', 'sunLike', 'redGiant', 'supergiant', 'mainSeq', 'whiteDwarf', 'other'];
    const log = [
      { m: null, t: 5800, l: 1, c: 'sunLike' },
      { m: 1, t: false, l: 1, c: 'sunLike' },
      { m: 1, t: 5800, l: '', c: 'sunLike' },
      ...categories.map(c => ({ m: 1, t: 5800, l: 1, c }))
    ];
    const html = renderTool('astronomy', { astronomy: { tab: 'hrDiagram', observingList: [], hrHunt: { log } } });
    const document = new window.DOMParser().parseFromString(html, 'text/html');
    const rows = document.querySelectorAll('table[aria-label="Logged H-R diagram observations"] tbody tr');
    expect(rows).toHaveLength(7);
    expect(Array.from(rows, row => row.lastElementChild.textContent)).toEqual([
      'Red-dwarf region', 'Sun-like region', 'Giant region', 'Luminous-star region',
      'Main-sequence band', 'White-dwarf region', 'Between common regions'
    ]);
  });
});
