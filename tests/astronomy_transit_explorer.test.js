import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let model;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); model = window.__alloAstroPure.transitModel; });

describe('Transit explorer geometry', () => {
  it.each([undefined, null, false, true, '', {}, [], NaN, Infinity].map(v => [v]))('recovers malformed geometry (%s)', value => {
    const m = model({ transitPlanetR: value, transitStarR: value, transitImpact: value, transitTime: value });
    expect([m.planet, m.star, m.impact, m.time]).toEqual([1, 1, 0, 0.5]);
    expect(m.current.brightness).toBeGreaterThan(0);
  });
  it('keeps the published small-star radius without slider rounding', () => {
    const m = model({ transitPlanetR: '0.920', transitStarR: '0.1192' });
    expect(m.star).toBe(0.1192);
    expect(m.depth * 100).toBeCloseTo(0.5007, 3);
  });
  it('gives the Earth-Sun reference about 84 ppm', () => {
    expect(model({}).depth * 1e6).toBeCloseTo(84.0486, 2);
  });
  it('quadruples the fully-contained depth when the planet radius doubles', () => {
    expect(model({ transitPlanetR: 2 }).depth).toBeCloseTo(model({}).depth * 4, 12);
  });
  it('uses a lower depth and no inner contacts for a grazing crossing', () => {
    const m = model({ transitPlanetR: 11.2, transitImpact: 1 });
    expect(m.geometry).toBe('grazing');
    expect(m.depth).toBeLessThan(m.centralDepth);
    expect(m.depth).toBeGreaterThan(0);
    expect(m.contacts.second).toBeNull();
    expect(m.contacts.third).toBeNull();
  });
  it('leaves a missed path completely flat', () => {
    const m = model({ transitPlanetR: 11.2, transitImpact: 1.2 });
    expect(m.geometry).toBe('miss');
    expect(m.contacts).toBeNull();
    for (let t = 0; t <= 1; t += 0.01) expect(m.at(t).brightness).toBe(1);
  });
  it('handles an occulting body larger than its star without negative flux', () => {
    const m = model({ transitPlanetR: 12, transitStarR: 0.1 });
    expect(m.geometry).toBe('occultation');
    expect(m.depth).toBe(1);
    expect(m.current.brightness).toBe(0);
  });
  it('places first and last contact on the stellar limb with clear baseline on each side', () => {
    const m = model({ transitPlanetR: 11.2, transitImpact: 0.6 });
    expect(m.at(0).blocked).toBe(0);
    expect(m.at(1).blocked).toBe(0);
    expect(Math.hypot(m.at(m.contacts.first).x, m.impact)).toBeCloseTo(1 + m.ratio, 12);
    expect(Math.hypot(m.at(m.contacts.fourth).x, m.impact)).toBeCloseTo(1 + m.ratio, 12);
    expect(m.at(m.contacts.first + 0.001).blocked).toBeGreaterThan(0);
  });
  it('is symmetric and bounded across all supported geometry extremes', () => {
    for (const planet of [0.3, 1, 12]) for (const star of [0.1, 0.1192, 1, 3]) for (const impact of [0, 0.9, 1, 1.2]) {
      const m = model({ transitPlanetR: planet, transitStarR: star, transitImpact: impact });
      let previous = 0;
      for (let i = 0; i <= 100; i++) {
        const t = i / 200, frame = m.at(t);
        expect(frame.blocked).toBeGreaterThanOrEqual(-1e-12);
        expect(frame.blocked).toBeLessThanOrEqual(1);
        expect(frame.blocked + 1e-8).toBeGreaterThanOrEqual(previous);
        expect(frame.blocked).toBeCloseTo(m.at(1 - t).blocked, 10);
        previous = frame.blocked;
      }
    }
  });
});

describe('Transit teaching interface', () => {
  it('links chart controls, honest scientific limits and accessible measurements', () => {
    const html = renderTool('astronomy', { astronomy: { tab: 'exoplanets', observingList: [] } });
    const document = new window.DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelector('#astronomy-transit-curve').getAttribute('role')).toBe('slider');
    expect(document.querySelector('#astronomy-transit-readout').getAttribute('aria-live')).toBe('polite');
    expect(document.querySelector('#astr-transitStarR').getAttribute('step')).toBe('any');
    expect(html).toContain('A dip alone does not guarantee detection.');
    expect(html).not.toContain('✓ detectable');
    expect(html).not.toContain('✓ visible');
  });
  it('keeps source provenance tied to matching radii and the chosen central path', () => {
    const render = impact => renderTool('astronomy', { astronomy: { tab: 'exoplanets', transitPlanetR: 0.92, transitStarR: 0.1192, transitImpact: impact } });
    expect(render(0)).toContain('Agol et al., 2021');
    expect(render(0)).toContain('chosen central path');
    expect(render(1)).not.toContain('Published radii:');
  });
});
