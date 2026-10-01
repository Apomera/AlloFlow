import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

describe('Galaxy stellar evidence', () => {
  beforeEach(() => {
    resetStemLab();
    window._galaxyHasLoadedOnce = true;
    loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
  });
  const render = metalHunt => {
    const root = document.createElement('div');
    root.innerHTML = renderTool('galaxy', { galaxy: { simMode: 'metalHunt', metalHunt } });
    return root;
  };

  it.each([
    [0, 'Metal-free reference (Population III)'],
    [0.001, 'Very metal-poor composition'],
    [0.049, 'Very metal-poor composition'],
    [0.05, 'Metal-poor composition'],
    [0.3, 'Near-solar composition'],
    [1.3, 'Metal-rich composition'],
  ])('distinguishes composition at %s solar abundance', (metallicity, label) => {
    const root = render({ metallicity });
    expect(root.textContent).toContain(label);
    expect(Number(root.querySelector('#mh-metallicity').value)).toBe(metallicity);
    if (metallicity > 0) expect(root.textContent).not.toContain('Population III');
  });

  it('does not reject an age using a universal metallicity curve', () => {
    const root = render({ metallicity: 2, mass: 0.7, age: 13 });
    expect(root.textContent).toContain('Metallicity alone does not determine age');
    expect(root.textContent).not.toMatch(/far more enrichment|Z☉ expected|Does the chemistry match/);
    expect(root.querySelector('[data-galaxy-metallicity-chart="enrichment"] polygon')).toBeNull();
  });

  it('places the Big Bang at zero without a hidden time clamp', () => {
    const root = render({ metallicity: 0, mass: 0.7, age: 13.8 });
    expect(root.querySelector('[data-galaxy-metallicity-point="current"]').dataset.formationTime).toBe('0');
    expect(root.textContent).toContain('before stars existed');
    expect(root.querySelector('[data-galaxy-metallicity-point="current"] circle').getAttribute('cy')).toBe('178');
  });

  it('recalculates legacy population labels and accepts zero in logs', () => {
    const root = render({ log: [
      { z: 0.02, m: 0.8, a: 12, st: 'popIII' },
      { z: 0, m: 30, a: 0.1, st: 'rich' },
      { z: 1, m: 1, a: 5, st: 'poor' },
      { z: -1, m: 1, a: 5 }, null,
    ] });
    const rows = root.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('Very metal-poor composition');
    expect(rows[0].textContent).not.toContain('Population III');
    expect(rows[1].textContent).toContain('Metal-free reference');
    expect(rows[2].textContent).toContain('Near-solar composition');
    expect(root.querySelectorAll('[data-galaxy-metallicity-point="log"]')).toHaveLength(3);
  });

  it('renders a saved comparison without relying on its log index', () => {
    const root = render({ metallicity: 1, mass: 1, age: 5, log: [], comparison: { z: 0, m: 2, a: 12 } });
    expect(root.querySelector('[data-galaxy-metallicity-comparison]')).not.toBeNull();
    expect(root.querySelector('[data-galaxy-metallicity-point="comparison"]').dataset.z).toBe('0');
    expect(root.querySelector('[data-galaxy-lifetime-marker="comparison"]')).not.toBeNull();
    expect(root.querySelector('[data-galaxy-age-marker="comparison"]')).not.toBeNull();
    const values = [...root.querySelectorAll('[data-galaxy-metallicity-comparison] dd')].map(e => e.textContent);
    expect(values.slice(0, 3)).toEqual(['+1 Z☉', '-1 M☉', '-7 Gyr']);
    expect(root.textContent).not.toMatch(/Infinity|NaN/);
  });

  it.each([null, {}, { z: NaN, m: 1, a: 5 }, { z: 0, m: 51, a: 5 }, { z: 1, m: 1, a: Infinity }])(
    'ignores unusable saved comparison %j', comparison => {
      expect(render({ comparison }).querySelector('[data-galaxy-metallicity-comparison]')).toBeNull();
    },
  );

  it('marks all matching duplicate log entries as the same comparison', () => {
    const entry = { z: 0.02, m: 0.7, a: 12 };
    const root = render({ log: [entry, entry], comparison: entry });
    expect(root.querySelectorAll('[data-galaxy-metallicity-compare][aria-pressed="true"]')).toHaveLength(2);
    expect(root.querySelectorAll('[data-galaxy-metallicity-compare-mobile][aria-pressed="true"]')).toHaveLength(2);
  });

  it('shows a nonzero estimate for high mass and a cosmic age reference', () => {
    const root = render({ metallicity: 1, mass: 50, age: 1 });
    expect(root.textContent).toContain('~2.0 Myr');
    expect(root.textContent).toContain('giant or a remnant');
    expect(root.textContent).not.toContain('0.00 Gyr');
    expect(root.querySelector('[data-galaxy-cosmic-age-marker]')).not.toBeNull();
  });

  it('shows age zero separately from the first logarithmic tick', () => {
    const root = render({ age: 0 });
    expect(root.querySelector('[data-galaxy-age-marker="current"]').getAttribute('x1')).toBe('48');
    expect(root.textContent).toContain('Age you set: 0 Gyr');
  });
});
