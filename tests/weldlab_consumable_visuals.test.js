import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
function page(section, state = {}, ctx = {}) {
  const root = document.createElement('div');
  root.innerHTML = renderTool('weldLab', { weldLab: { view: 'consumables', cons_mode: 'browse', cons_sect: section, ...state } }, ctx);
  return root;
}
const value = (node, attribute) => Number(node.getAttribute(attribute));
const model = () => window.__WeldLabCore.tech2;

beforeEach(() => {
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
});

describe('Consumable specimens follow the validated classification', () => {
  it.each([
    ['E7018', 'smaw', 'Flux coating', 'Steel core'],
    ['ER70S-6', 'solid', 'Solid filler metal', 'Spool or straight filler rods'],
    ['E71T-1C', 'fcaw', 'Metal sheath', 'Flux fill'],
    ['E70C-6M', 'cored', 'Metal sheath', 'Metal powder'],
    ['ER4043', 'alloyfiller', 'Solid filler metal', 'Spool or straight filler rods'],
    ['ER308L', 'alloyfiller', 'Solid filler metal', 'Spool or straight filler rods'],
  ])('shows the actual supply form and anatomy for %s', (code, family, anatomy, other) => {
    const root = page('decoder', { tech2_cons_code: code });
    const specimen = root.querySelector('[data-cons-specimen]');
    expect(specimen.dataset.consSpecimen).toBe(family);
    expect(specimen.dataset.code).toBe(code);
    expect(specimen.textContent).toContain(anatomy);
    expect(specimen.textContent).toContain(other);
    const svg = specimen.querySelector('svg');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain(code);
    expect(svg.getAttribute('aria-label')).toContain('not to scale');
    expect(svg.style.width).toBe('100%');
    expect(svg.querySelector('animate, animateTransform, image')).toBeNull();
    expect(root.querySelector('#tech2-dec-result ol')).toBeTruthy();
  });

  it.each(['', 'E9999', 'ER70S-99', 'E71T-11C', '<script>bad</script>'])('keeps invalid or unsupported input %s visibly unsupported', (code) => {
    const root = page('decoder', { tech2_cons_code: code });
    expect(root.querySelector('[data-cons-specimen]')).toBeNull();
    expect(root.querySelector('#tech2-dec-result').textContent).toMatch(/Type a classification|not a valid classification|not a classification/);
    expect(root.querySelector('#tech2-dec-input').getAttribute('aria-describedby')).toBe('tech2-dec-result');
  });
});

describe('Consumables cost drawings share the existing cost model', () => {
  it('keeps a fixed inch scale: doubling the leg doubles both drawn legs and quadruples the weld metal', () => {
    const small = page('cost', { tech2_cons_leg: 0.125 });
    const large = page('cost', { tech2_cons_leg: 0.25 });
    const s = small.querySelector('[data-cons-cost-section]');
    const l = large.querySelector('[data-cons-cost-section]');
    const drawnLeg = (root) => {
      const nums = root.querySelector('[data-cons-fillet]').getAttribute('points').split(/[ ,]+/).map(Number);
      expect(nums[0]).toBe(nums[2]);
      expect(nums[1]).toBe(nums[5]);
      expect(nums[1] - nums[3]).toBeCloseTo(nums[4] - nums[0], 8);
      return nums[4] - nums[0];
    };
    expect(drawnLeg(large)).toBeCloseTo(2 * drawnLeg(small), 8);
    expect(value(l, 'data-area-in2')).toBeCloseTo(4 * value(s, 'data-area-in2'), 12);
    expect(value(l, 'data-weight-lb-ft')).toBeCloseTo(4 * value(s, 'data-weight-lb-ft'), 12);
    expect(l.getAttribute('aria-label')).toContain('reinforcement excluded');
  });

  it.each(['smaw', 'gmaw_sc', 'gmaw_spray', 'fcaw', 'gtaw', 'saw'])('draws exact filler/labour shares and total for %s', (proc) => {
    const leg = 0.375, rate = 75;
    const expected = model().costPerFoot(proc, leg, rate);
    const root = page('cost', { tech2_cons_proc: proc, tech2_cons_leg: leg, tech2_cons_rate: rate });
    const section = root.querySelector('[data-cons-cost-section]');
    const chart = root.querySelector('[data-cons-cost-breakdown]');
    expect(value(section, 'data-leg-in')).toBe(leg);
    expect(value(section, 'data-weight-lb-ft')).toBeCloseTo(expected.W, 12);
    expect(value(chart, 'data-filler')).toBeCloseTo(expected.filler, 12);
    expect(value(chart, 'data-labour')).toBeCloseTo(expected.labor, 12);
    expect(value(chart, 'data-total')).toBeCloseTo(expected.total, 12);
    const filler = chart.querySelector('[data-cons-cost-component="filler"]');
    const labour = chart.querySelector('[data-cons-cost-component="labour"]');
    expect(value(filler, 'width') + value(labour, 'width')).toBeCloseTo(312, 8);
    expect(value(filler, 'width') / value(labour, 'width')).toBeCloseTo(expected.filler / expected.labor, 10);
    expect(value(labour, 'x')).toBeCloseTo(value(filler, 'x') + value(filler, 'width'), 8);
    expect(chart.getAttribute('aria-label')).toContain(expected.total.toFixed(2) + ' dollars');
    const legend = chart.closest('figure').querySelector('dl');
    expect(legend.textContent).toContain('$' + expected.filler.toFixed(2));
    expect(legend.textContent).toContain('$' + expected.labor.toFixed(2));
    expect(legend.textContent).toContain('$' + expected.total.toFixed(2));
    expect(root.textContent).toContain('Total ≈ $' + expected.total.toFixed(2) + ' per foot');
  });

  it('changes the labour share without changing weld dimensions or filler when only the hourly rate changes', () => {
    const low = page('cost', { tech2_cons_leg: 0.25, tech2_cons_rate: 30 });
    const high = page('cost', { tech2_cons_leg: 0.25, tech2_cons_rate: 90 });
    const a = low.querySelector('[data-cons-cost-breakdown]'), b = high.querySelector('[data-cons-cost-breakdown]');
    expect(value(b, 'data-labour')).toBeCloseTo(3 * value(a, 'data-labour'), 12);
    expect(value(b, 'data-filler')).toBeCloseTo(value(a, 'data-filler'), 12);
    expect(high.querySelector('[data-cons-fillet]').getAttribute('points')).toBe(low.querySelector('[data-cons-fillet]').getAttribute('points'));
  });

  it('keeps malformed saved settings finite and both visuals available', () => {
    const root = page('cost', { tech2_cons_leg: 'bad', tech2_cons_rate: null, tech2_cons_proc: '__proto__' });
    const section = root.querySelector('[data-cons-cost-section]');
    const chart = root.querySelector('[data-cons-cost-breakdown]');
    expect(Number.isFinite(value(section, 'data-weight-lb-ft'))).toBe(true);
    expect(Number.isFinite(value(chart, 'data-total'))).toBe(true);
    expect(root.textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('uses explicit high-contrast ink and patterns without requiring new responsive CSS utilities', () => {
    const root = page('cost', {}, { isContrast: true });
    const visuals = root.querySelector('[data-cons-cost-visuals]');
    expect(visuals.style.display).toBe('flex');
    expect(visuals.style.flexWrap).toBe('wrap');
    root.querySelectorAll('[data-cons-cost-section], [data-cons-cost-breakdown]').forEach((svg) => {
      expect(svg.style.width).toBe('100%');
      expect(svg.closest('figure').style.background).toBe('rgb(0, 0, 0)');
      expect(svg.querySelector('[fill="#ffff00"]')).toBeTruthy();
    });
    expect(root.querySelector('[data-cons-cost-component="filler"]').getAttribute('fill')).toBe('#ffff00');
    expect(root.querySelector('[data-cons-cost-component="labour"]').getAttribute('fill')).toBe('#000000');
  });
});
