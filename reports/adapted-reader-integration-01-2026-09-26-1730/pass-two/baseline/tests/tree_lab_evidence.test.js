import { describe, it, expect } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

function engine() {
  resetStemLab();
  loadTool('stem_lab/stem_tool_treelab.js', 'treeLab');
  return window.__alloTreeLabEngine;
}
const env = { tempC: 22, light: 0.8, soilWater: 0.7, co2ppm: 420 };

describe('Saved discovery evidence', () => {
  it('uses the same signed scale for surplus, deficit, zero and tiny balances', () => {
    const E = engine();
    for (const values of [[0, 0], [1, 2], [-2, -1], [-3, 2], [0.00001, 0.00002]]) {
      const pair = { control: { summary: { meanNet: values[0] / 3, yearsCompleted: 3 } }, drought: { summary: { meanNet: values[1] / 3, yearsCompleted: 3 } } };
      const result = E.discoveryCarbonComparison(pair);
      const span = Math.max(0, ...values) - Math.min(0, ...values) || 1;
      expect(result.zero).toBeGreaterThanOrEqual(0);
      expect(result.zero).toBeLessThanOrEqual(100);
      result.bars.forEach((bar, i) => {
        expect(bar.start).toBeGreaterThanOrEqual(0);
        expect(bar.start + bar.width).toBeLessThanOrEqual(100 + 1e-10);
        expect(bar.width).toBeCloseTo(Math.abs(values[i]) / span * 100, 10);
        expect(values[i] < 0 ? bar.start + bar.width : bar.start).toBeCloseTo(result.zero, 10);
      });
    }
  });

  it('preserves saved evidence while the live tree grows and puts height details behind a disclosure', () => {
    const E = engine(), baseline = E.newTree('oak'), sp = E.speciesById('oak');
    const record = E.runDroughtDiscovery(baseline, sp.id, env, E.normaliseAlloc());
    const expected = E.discoveryCarbonComparison(record);
    let tree = record.drought.tree;
    for (let i = 0; i < 20; i++) tree = E.simulateYear(tree, sp, env, E.normaliseAlloc());
    const html = renderTool('treeLab', { treeLab: { tree, discovery: { prediction: 'less', record } } });
    const host = document.createElement('div'); host.innerHTML = html;
    const balances = [...host.querySelectorAll('[data-carbon-balance]')].map(node => Number(node.dataset.carbonBalance));
    expect(balances).toEqual(expected.values);
    const details = host.querySelector('[data-tree-fold="discovery-details"]');
    expect(details.hasAttribute('open')).toBe(false);
    expect(details.querySelector('.allo-tree-discovery-figure')).not.toBeNull();
    expect(host.querySelector('.allo-tree-food-evidence').closest('details')).toBeNull();
  });

  it('calls out unequal survival times instead of implying three full years for both trees', () => {
    const E = engine();
    const record = E.runDroughtDiscovery(E.newTree('oak'), 'oak', env, E.normaliseAlloc());
    record.drought.summary.yearsCompleted = 1;
    record.drought.summary.alive = false;
    record.drought.summary.meanNet = -0.1;
    const html = renderTool('treeLab', { treeLab: { discovery: { prediction: 'less', record } } });
    expect(html).toContain('One tree died earlier');
    expect(html).toContain('bar left of the zero line');
    expect(html).toContain('Shortfall: needed saved food');
  });

  it('keeps quantitative evidence available to young learners without requiring it in the first result', () => {
    const E = engine();
    const record = E.runDroughtDiscovery(E.newTree('oak'), 'oak', env, E.normaliseAlloc());
    const html = renderTool('treeLab', { treeLab: { bandOverride: 'k2', discovery: { prediction: 'less', record } } });
    const host = document.createElement('div'); host.innerHTML = html;
    expect(host.querySelectorAll('.allo-tree-food-evidence-head strong')).toHaveLength(2);
    expect(host.querySelectorAll('.allo-tree-food-evidence .allo-tree-sr-only')).toHaveLength(2);
    expect(host.querySelector('[data-tree-fold="discovery-details"]').textContent).toContain('kg C');
  });
});
