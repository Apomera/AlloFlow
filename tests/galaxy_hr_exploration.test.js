import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

describe('Galaxy H-R exploration', () => {
  beforeEach(() => {
    resetStemLab();
    window._galaxyHasLoadedOnce = true;
    loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
  });
  const render = (data = {}) => {
    const root = document.createElement('div');
    root.innerHTML = renderTool('galaxy', { galaxy: { simMode: 'star', ...data } });
    return root;
  };

  it.each([
    [0.05, ['protostar', 'main_sequence']],
    [0.3, ['protostar', 'main_sequence', 'blue_dwarf', 'white_dwarf']],
    [1, ['protostar', 'main_sequence', 'red_giant', 'planetary_nebula', 'white_dwarf']],
    [12, ['protostar', 'main_sequence', 'red_supergiant']],
    [30, ['protostar', 'main_sequence', 'blue_supergiant']],
  ])('offers only modeled plot stages at mass %s', (mass, stages) => {
    const root = render({ lifecycleMass: mass, activeStage: 'main_sequence' });
    const points = [...root.querySelectorAll('[data-galaxy-hr-stage]')];
    expect(points.map(p => p.dataset.galaxyHrStage)).toEqual(stages);
    expect(points.filter(p => p.getAttribute('tabindex') === '0')).toHaveLength(1);
    expect(points.find(p => p.getAttribute('tabindex') === '0').dataset.galaxyHrStage).toBe('main_sequence');
    expect(points.filter(p => p.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(points.every(p => p.getAttribute('role') === 'button' && p.getAttribute('aria-label').includes('solar luminosities'))).toBe(true);
  });

  it('keeps one plotted point reachable when the active stage is off the chart', () => {
    const root = render({ lifecycleMass: 30, activeStage: 'black_hole' });
    expect(root.querySelector('[data-galaxy-hr-stage][tabindex="0"]').dataset.galaxyHrStage).toBe('protostar');
    expect(root.querySelector('[data-galaxy-hr-stage][aria-pressed="true"]')).toBeNull();
    expect(root.textContent).toContain('Light from a black hole’s surroundings can be observed');
  });

  it('uses the same solar model for the reference and current mass', () => {
    const root = render({ lifecycleMass: 1, stellarMassReference: 1 });
    const values = kind => [...root.querySelectorAll(`[data-galaxy-star-model="${kind}"] dd`)].map(e => e.textContent);
    expect(values('current')).toEqual(values('reference'));
    expect(values('current')).toHaveLength(5);
    expect(root.querySelector('[data-galaxy-star-comparison-ratios]').textContent).toBe('Current / kept: 1× luminosity · 1× radius · 1× hydrogen-burning time');
    const marker = root.querySelector('[data-galaxy-hr-reference]');
    expect(Number(marker.dataset.mass)).toBe(1);
    expect(Number(marker.dataset.temperature)).toBeCloseTo(5778, 8);
    expect(Number(marker.dataset.luminosity)).toBe(1);
  });

  it('compares main-sequence birth masses independently of the current evolved stage', () => {
    const data = { lifecycleMass: 12, stellarMassReference: 0.3 };
    const main = render({ ...data, activeStage: 'main_sequence' });
    const giant = render({ ...data, activeStage: 'red_supergiant' });
    expect(main.querySelector('[data-galaxy-star-comparison]').textContent).toBe(giant.querySelector('[data-galaxy-star-comparison]').textContent);
    expect(main.querySelector('[data-galaxy-hr-reference]').getAttribute('d')).toBe(giant.querySelector('[data-galaxy-hr-reference]').getAttribute('d'));
    expect(main.textContent).not.toMatch(/NaN|Infinity/);
  });

  it.each([null, undefined, 0, 0.079, 50.01, NaN, Infinity, '1', {}])('ignores unusable persisted reference %j', reference => {
    const root = render({ stellarMassReference: reference });
    expect(root.querySelector('[data-galaxy-hr-reference]')).toBeNull();
    expect(root.querySelector('[data-galaxy-star-clear-reference]')).toBeNull();
    expect(root.textContent).not.toMatch(/NaN|Infinity|\[object Object\]/);
  });

  it.each([0.08, 50])('accepts the reference boundary %s', mass => {
    expect(render({ stellarMassReference: mass }).querySelector('[data-galaxy-hr-reference]').dataset.mass).toBe(String(mass));
  });

  it('does not present main-sequence comparison relations for a brown dwarf', () => {
    const root = render({ lifecycleMass: 0.03, stellarMassReference: 1 });
    expect(root.querySelector('[data-galaxy-star-keep]').disabled).toBe(true);
    expect(root.querySelectorAll('[data-galaxy-star-model="current"] dd')).toHaveLength(1);
    expect(root.querySelector('[data-galaxy-star-comparison-ratios]')).toBeNull();
    expect(root.querySelector('[data-galaxy-hr-reference]')).not.toBeNull();
    expect(root.textContent).toContain('main-sequence comparison relations do not apply');
    expect(root.querySelector('[data-galaxy-hr-clipped]')).not.toBeNull();
  });

  it('explains schematic spacing and the cooling radiation of neutron stars', () => {
    const root = render({ lifecycleMass: 12, activeStage: 'neutron_star' });
    expect(root.textContent).toContain('spacing does not show elapsed time');
    expect(root.textContent).toContain('Neutron stars radiate as they cool');
    expect(root.querySelector('[data-galaxy-hr-svg]').getAttribute('dir')).toBe('ltr');
  });
});
