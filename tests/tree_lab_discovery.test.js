import { describe, it, expect } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

function engine() {
  resetStemLab();
  loadTool('stem_lab/stem_tool_treelab.js', 'treeLab');
  return window.__alloTreeLabEngine;
}
const env = { tempC: 22, light: 0.8, soilWater: 0.7, co2ppm: 420 };

describe('Tree Life Lab discovery evidence', () => {
  it('compares identical baselines, changing only a three-year drought, without mutating inputs', () => {
    const E = engine();
    const tree = E.newTree('oak');
    const allocation = E.normaliseAlloc();
    const before = JSON.stringify({ tree, env, allocation });
    const pair = E.runDroughtDiscovery(tree, 'oak', env, allocation);
    expect(JSON.stringify({ tree, env, allocation })).toBe(before);
    expect(pair.control).toEqual(E.runExperimentTrial(tree, 'oak', { ...env, droughtYears: [] }, allocation, 3));
    expect(pair.drought).toEqual(E.runExperimentTrial(tree, 'oak', { ...env, droughtYears: [1, 2, 3] }, allocation, 3));
    expect(pair.drought.summary.meanNet).toBeLessThan(pair.control.summary.meanNet);
    expect(pair.baseline).not.toBe(tree);
    expect(JSON.parse(JSON.stringify(pair))).toEqual(pair);
  });

  it('keeps paired results reproducible across species and existing drought schedules', () => {
    const E = engine();
    for (const sp of E.SPECIES) {
      const tree = E.newTree(sp.id);
      const a = E.runDroughtDiscovery(tree, sp.id, env, E.normaliseAlloc());
      const b = E.runDroughtDiscovery(tree, sp.id, { ...env, droughtYears: [1, 2, 3, 4, 5] }, E.normaliseAlloc());
      expect(a).toEqual(b);
      expect(a.control.summary.startAge).toBe(a.drought.summary.startAge);
      expect(a.drought.summary.meanNet).toBeLessThan(a.control.summary.meanNet);
    }
  });

  it('never reports a nonzero seedling maintenance cost as zero', () => {
    const E = engine();
    const cost = E.maintenanceRespiration(E.speciesById('oak'), E.newTree('oak'));
    expect(cost).toBeGreaterThan(0);
    expect(E.formatCarbon(cost)).toBe('<0.01 kg C');
    expect(E.formatCarbon(0)).toBe('0 kg C');
    expect(E.formatCarbon(-cost)).toBe('-<0.01 kg C');
  });

  it('does not mark reflection complete simply because a trial has run', () => {
    const E = engine();
    const pair = E.runDroughtDiscovery(E.newTree('oak'), 'oak', env, E.normaliseAlloc());
    const html = renderTool('treeLab', { treeLab: { discovery: { prediction: 'less', record: pair } } });
    const host = document.createElement('div');
    host.innerHTML = html;
    const discovery = host.querySelector('.allo-tree-discovery');
    expect(discovery.dataset.discoveryPhase).toBe('explain');
    expect(discovery.querySelectorAll('[data-done="true"]')).toHaveLength(2);
    expect(discovery.textContent).toContain('What did the dry tree have?');
  });

  it('describes interacting factors in agreement with the actual model', () => {
    const E = engine();
    const sp = E.speciesById('oak');
    const photo = water => E.grossPhotosynthesis(sp, { ...env, soilWater: water }, 50, E.stomatalAperture(water, sp.droughtTol, false));
    expect(photo(0.7).limiting.id).toBe('co2');
    expect(photo(1).limiting.id).toBe('co2');
    expect(photo(1).gross).toBeGreaterThan(photo(0.7).gross);
    const html = renderTool('treeLab', { treeLab: { bandOverride: 'g912' } });
    expect(html).toContain('water and temperature also scale the rate'); // nearby copy must not promise exclusivity
    expect(html).not.toContain('Raising any other input changes nothing');
  });
});

 it('recovers safely from an incomplete saved discovery', () => {
   engine();
   const html = renderTool('treeLab', { treeLab: { discovery: { prediction: 'less', record: { version: 1, baseline: {}, control: { summary: {} }, drought: { summary: {} } } } } });
   const host = document.createElement('div'); host.innerHTML = html;
   expect(host.querySelector('.allo-tree-discovery').dataset.discoveryPhase).toBe('predict');
   expect(host.querySelector('[data-discovery-comparison]')).toBeNull();
 });
