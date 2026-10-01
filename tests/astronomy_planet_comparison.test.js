import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); });
const render = state => new window.DOMParser().parseFromString(renderTool('astronomy', { astronomy: { tab: 'planets', observingList: [], ...state } }), 'text/html');

// NASA/NSSDCA metric reference table, published March 18, 2025.
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/
const referenceRows = [
  ['mercury',4879,57.9,1407.6,4222.6,88], ['venus',12104,108.2,-5832.5,2802,224.7],
  ['earth',12756,149.6,23.9,24,365.2], ['mars',6792,228,24.6,24.7,687],
  ['jupiter',142984,778.5,9.9,9.9,4331], ['saturn',120536,1432,10.7,10.7,10747],
  ['uranus',51118,2867,-17.2,17.2,30589], ['neptune',49528,4515,16.1,16.1,59800]
];

describe('Planet comparison reference model', () => {
  it.each(referenceRows)('uses the sourced physical values for %s', (id, diameter, distance, rotation, day, year) => {
    const m = window.__alloAstroPure.planetComparisonModel({ selectedPlanet: id, planetCompareWith: 'earth' });
    expect(m.selected).toMatchObject({ id, diameterKm: diameter, distanceMillionKm: distance, rotationHours: rotation, solarDayHours: day, yearDays: year });
    expect(m.selectedValue).toBeCloseTo(diameter / 12756, 10);
    expect(m.ratio).toBeCloseTo(diameter / 12756, 10);
    expect(m.selected.auFromSun).toBeCloseTo(distance / 149.6, 10);
  });
  it.each(['size','distance','year'])('uses one honest linear scale for all eight %s bars', mode => {
    const m = window.__alloAstroPure.planetComparisonModel({ selectedPlanet: 'mercury', planetCompareWith: 'neptune', planetCompareMode: mode });
    expect(m.rows).toHaveLength(8);
    expect(m.extent).toBe(Math.max(...m.rows.map(row => row.value)));
    for (const row of m.rows) {
      expect(row.value).toBeGreaterThan(0);
      expect(row.fraction).toBeCloseTo(row.value / m.extent, 12);
      expect(row.fraction).toBeGreaterThan(0);
      expect(row.fraction).toBeLessThanOrEqual(1);
    }
    expect(m.selectedValue).toBe(m.rows[0].value);
    expect(m.referenceValue).toBe(m.rows[7].value);
    if (mode === 'size') expect(m.selectedRadius / m.referenceRadius).toBeCloseTo(4879 / 49528, 12);
  });
  it('counts reference orbits from a single elapsed time and moves counterclockwise in the top view', () => {
    const model = window.__alloAstroPure.planetComparisonModel;
    const start = model({ selectedPlanet: 'neptune', planetCompareWith: 'earth', planetCompareMode: 'year', planetElapsedYears: 0 });
    expect(start.referenceOrbit.x).toBeCloseTo(180, 10);
    expect(start.referenceOrbit.y).toBeCloseTo(51, 10);
    const quarter = model({ selectedPlanet: 'neptune', planetCompareWith: 'earth', planetCompareMode: 'year', planetElapsedYears: 0.25 });
    expect(quarter.referenceOrbit.x).toBeCloseTo(116, 10);
    expect(quarter.referenceOrbit.y).toBeCloseTo(115, 10);
    const five = model({ selectedPlanet: 'neptune', planetCompareWith: 'earth', planetCompareMode: 'year', planetElapsedYears: 5 });
    expect(five.referenceOrbit.turns).toBe(5);
    expect(five.selectedOrbit.turns).toBeCloseTo(5 * 365.2 / 59800, 12);
    expect(five.referenceOrbit.x).toBeCloseTo(start.referenceOrbit.x, 10);
    expect(five.referenceOrbit.y).toBeCloseTo(start.referenceOrbit.y, 10);
  });
  it.each([null, [], false, { selectedPlanet: {}, planetCompareWith: [], planetCompareMode: {}, planetElapsedYears: Infinity }, { planetElapsedYears: 'NaN' }, { planetElapsedYears: true }])('recovers malformed saved state without non-finite geometry', state => {
    const m = window.__alloAstroPure.planetComparisonModel(state);
    expect(m.selected.id).toBe('earth');
    expect(m.reference.id).toBe('jupiter');
    expect(m.mode).toBe('size');
    expect(m.elapsedYears).toBe(0);
    for (const value of [m.ratio,m.extent,m.selectedRadius,m.referenceRadius,m.selectedOrbit.x,m.selectedOrbit.y,m.referenceOrbit.x,m.referenceOrbit.y]) expect(Number.isFinite(value)).toBe(true);
  });
  it('bounds time, accepts finite numeric restoration, and preserves the caller’s data', () => {
    const model = window.__alloAstroPure.planetComparisonModel;
    expect(model({ planetElapsedYears: -100 }).elapsedYears).toBe(0);
    expect(model({ planetElapsedYears: 100 }).elapsedYears).toBe(5);
    const saved = { selectedPlanet: 'venus', planetCompareWith: 'mars', planetCompareMode: 'distance', planetElapsedYears: '1.25' };
    const prior = { ...saved };
    expect(model(saved).elapsedYears).toBe(1.25);
    expect(saved).toEqual(prior);
  });
  it('allows comparing a planet with itself without invalid scale or ratio', () => {
    const m = window.__alloAstroPure.planetComparisonModel({ selectedPlanet: 'earth', planetCompareWith: 'earth', planetCompareMode: 'distance' });
    expect(m.ratio).toBe(1);
    expect(m.pairExtent).toBe(1);
    expect(m.selectedRadius).toBe(72);
    expect(m.referenceRadius).toBe(72);
  });
});

describe('Planet comparison rendered clarity', () => {
  it('distinguishes Venus spin from solar day and states its reference source', () => {
    const doc = render({ selectedPlanet: 'venus', planetCompareWith: 'earth' });
    const metrics = [...doc.querySelectorAll('#astronomy-planet-measurements > div')];
    const value = label => metrics.find(metric => metric.querySelector('dt').textContent === label).querySelector('dd').textContent;
    expect(value('Spin period')).toBe('5,832.5 hours');
    expect(value('Solar day')).toBe('2,802 hours');
    expect(value('Spin direction')).toBe('Retrograde');
    expect(doc.querySelector('#astronomy-planet-day-help').textContent).toContain('one local noon to the next');
    expect(doc.querySelector('a[href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/"]')).toBeTruthy();
    expect(doc.querySelector('#astronomy-planet-comparison').textContent).toContain('March 18, 2025');
  });
  it('keeps one selected planet, real disk ratios and clear names in the size view', () => {
    const doc = render({ selectedPlanet: 'jupiter', planetCompareWith: 'earth' });
    const group = doc.querySelector('[role="group"][aria-label="Planets"]');
    expect(group.querySelectorAll('button')).toHaveLength(8);
    for (const button of group.querySelectorAll('button')) {
      const description = doc.getElementById(button.getAttribute('aria-describedby'));
      expect(description.textContent).toContain('Equatorial diameter:');
      expect(description.textContent).toContain('Earth diameters');
    }
    expect(doc.getElementById(group.querySelector('[data-planet-row="earth"]').getAttribute('aria-describedby')).textContent).toContain('Reference planet');
    expect(group.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    expect(group.querySelector('[aria-pressed="true"]').getAttribute('aria-label')).toBe('Jupiter');
    const primary = doc.querySelector('[data-planet-disk="selected"]');
    const reference = doc.querySelector('[data-planet-disk="reference"]');
    expect(Number(primary.getAttribute('r')) / Number(reference.getAttribute('r'))).toBeCloseTo(142984/12756, 10);
    expect(doc.querySelector('#astronomy-planet-comparison-status').getAttribute('aria-live')).toBe('polite');
    expect(doc.querySelector('#astronomy-planet-reference').value).toBe('earth');
  });
  it('draws mean-distance endpoints from their shared axis instead of inflating small distances', () => {
    const doc = render({ selectedPlanet: 'mercury', planetCompareWith: 'neptune', planetCompareMode: 'distance' });
    const small = doc.querySelector('[data-planet-distance="selected"]');
    const large = doc.querySelector('[data-planet-distance="reference"]');
    expect(Number(small.getAttribute('cx')) - 30).toBeCloseTo(300 * 57.9/4515, 10);
    expect(Number(large.getAttribute('cx'))).toBe(330);
    expect(doc.querySelector('#astronomy-planet-figure-help').textContent).toContain('Planet markers are enlarged');
    expect(doc.querySelector('#astronomy-planet-orbit-controls')).toBeNull();
  });
  it('renders finite restored orbit geometry, bounded time and explicit teaching limits', () => {
    const doc = render({ selectedPlanet: 'neptune', planetCompareWith: 'earth', planetCompareMode: 'year', planetElapsedYears: 999 });
    expect(doc.querySelector('#astronomy-planet-elapsed').value).toBe('5');
    expect(doc.querySelector('[data-planet-orbit="reference"]').getAttribute('data-turns')).toBe('5');
    expect(doc.querySelector('#astronomy-planet-figure-help').textContent).toContain('teaching positions');
    expect(doc.querySelector('#astronomy-planet-comparison').outerHTML).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
  });
});
