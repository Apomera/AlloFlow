import { describe, it, expect } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

function engine() {
  resetStemLab();
  loadTool('stem_lab/stem_tool_treelab.js', 'treeLab');
  return window.__alloTreeLabEngine;
}
const env = { tempC: 22, light: 0.85, soilWater: 0.75, co2ppm: 420 };
const alloc = { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 };

describe('Tree physiology: learnable benefits and costs', () => {
  it('cannot extract water from dry soil or fix carbon without roots', () => {
    const E = engine(), sp = E.speciesById('oak'), tree = E.newTree('oak');
    for (const [t, e] of [[tree, { ...env, soilWater: 0 }], [{ ...tree, rootMass: 0 }, env]]) {
      const photo = E.treePhysiology(t, sp, e);
      expect(photo.gross).toBe(0);
      expect(photo.aperture).toBe(0);
      expect(photo.waterAccess.effectiveWater).toBe(0);
      expect(E.simulateYear(t, sp, e, alloc).rootMass).toBeLessThanOrEqual(t.rootMass);
    }
  });

  it('scales root access with canopy demand, with bounded diminishing returns', () => {
    const E = engine();
    const access = roots => E.rootWaterAccess({ rootMass: roots, leafArea: 10 }, 0.3).effectiveWater;
    expect(access(1)).toBeCloseTo(0.3, 12);
    expect(access(2)).toBeGreaterThan(access(1));
    expect(access(3) - access(2)).toBeLessThan(access(2) - access(1));
    expect(access(1e9)).toBeLessThanOrEqual(0.3 * 1.25);
    expect(E.rootWaterAccess({ rootMass: 10, leafArea: 100 }, 0.3).effectiveWater).toBeCloseTo(access(1), 12);
    expect(E.rootWaterAccess({ rootMass: 1, leafArea: 20 }, 0.3).effectiveWater).toBeLessThan(access(1));
    for (const water of [-1, 0, 0.3, 1, 2, NaN]) {
      const result = E.rootWaterAccess({ rootMass: 100, leafArea: 10 }, water);
      expect(result.effectiveWater).toBeGreaterThanOrEqual(0);
      expect(result.effectiveWater).toBeLessThanOrEqual(1);
    }
  });

  it('more roots improve a thirsty canopy while excessive roots cost more than they earn', () => {
    const E = engine(), sp = E.speciesById('oak');
    const tree = { ...E.newTree('oak'), leafArea: 10, leafMass: 10 / 14, rootMass: 0.25, sapwoodMass: 2 };
    const dry = { ...env, soilWater: 0.25 };
    const low = E.treePhysiology(tree, sp, dry);
    const enough = { ...tree, rootMass: 2 };
    expect(E.treePhysiology(enough, sp, dry).gross).toBeGreaterThan(low.gross);
    expect(E.treePhysiology(enough, sp, dry).aperture).toBeGreaterThan(low.aperture);
    expect(E.maintenanceRespiration(sp, enough)).toBeGreaterThan(E.maintenanceRespiration(sp, tree));
    const excessive = { ...tree, rootMass: 100 };
    const net = t => E.treePhysiology(t, sp, dry).gross - E.maintenanceRespiration(sp, t);
    expect(net(excessive)).toBeLessThan(net(enough));
    expect(E.deriveTreeVisualState(enough, sp, dry, 'summer').waterStress)
      .toBeLessThan(E.deriveTreeVisualState(tree, sp, dry, 'summer').waterStress);
  });

  it('allocation changes future roots, and investment helps access without becoming a free growth bonus', () => {
    const E = engine(), sp = E.speciesById('oak');
    let baseline = E.newTree('oak');
    for (let i = 0; i < 10; i++) baseline = E.simulateYear(baseline, sp, env, alloc);
    const weather = { ...env, soilWater: 0.35 };
    const run = share => {
      let t = baseline;
      for (let i = 0; i < 10; i++) t = E.simulateYear(t, sp, weather, { ...alloc, root: share, wood: 0.55 - share });
      return t;
    };
    const none = run(0), balanced = run(0.2), heavy = run(0.5);
    expect(balanced.rootMass).toBeGreaterThan(none.rootMass);
    expect(E.rootWaterAccess(balanced, weather.soilWater).effectiveWater).toBeGreaterThan(E.rootWaterAccess(none, weather.soilWater).effectiveWater);
    expect(balanced.heightM).toBeGreaterThan(none.heightM);
    expect(heavy.heightM).toBeLessThan(balanced.heightM);
    const firstLow = E.simulateYear(baseline, sp, weather, { ...alloc, root: 0 });
    const firstHigh = E.simulateYear(baseline, sp, weather, { ...alloc, root: 0.5 });
    expect(firstHigh.history.at(-1).gross).toBe(firstLow.history.at(-1).gross);
    expect(firstHigh.rootMass).toBeGreaterThan(firstLow.rootMass);
  });

  it('isolates the shade trait: better low-light capture, lower bright-light capacity, no food in darkness', () => {
    const E = engine(), base = E.speciesById('oak'), tree = E.newTree('oak');
    const intolerant = { ...base, shadeTol: 0.1 }, tolerant = { ...base, shadeTol: 0.9 };
    const gross = (sp, light) => E.treePhysiology(tree, sp, { ...env, light }).gross;
    expect(gross(tolerant, 0.05)).toBeGreaterThan(gross(intolerant, 0.05));
    expect(gross(tolerant, 1)).toBeLessThan(gross(intolerant, 1));
    expect(gross(tolerant, 0)).toBe(0);
    for (const sp of [intolerant, tolerant]) {
      let previous = 0;
      for (let i = 0; i <= 100; i++) {
        const next = gross(sp, i / 100);
        expect(next).toBeGreaterThanOrEqual(previous - 1e-12);
        previous = next;
      }
    }
  });

  it('uses identical physiology in annual, seasonal, and trial results across species and root states', () => {
    const E = engine();
    for (const sp of E.SPECIES) for (const rootMass of [0, 0.02, 0.2]) for (const soilWater of [0, 0.2, 0.75]) {
      const tree = { ...E.newTree(sp.id), rootMass }, weather = { ...env, soilWater };
      const before = JSON.stringify({ tree, weather });
      const live = E.treePhysiology(tree, sp, weather);
      const trace = E.seasonalCarbonTrace(tree, sp, weather);
      const next = E.simulateYear(tree, sp, weather, alloc);
      const trial = E.runExperimentTrial(tree, sp.id, weather, alloc, 1);
      expect(trace.annual.gross).toBeCloseTo(live.gross, 12);
      expect(trace.annual.aperture).toBe(live.aperture);
      expect(next.history[0].gross).toBe(Number(live.gross.toFixed(3)));
      expect(trial.tree.history[0].gross).toBe(next.history[0].gross);
      expect(JSON.stringify({ tree, weather })).toBe(before);
    }
  });

  it('explains delayed root investment and distinguishes the access index from soil moisture', () => {
    engine();
    const html = renderTool('treeLab', { treeLab: { view: 'grow', bandOverride: 'g68' } });
    expect(html).toContain('How roots supply this canopy');
    expect(html).toContain('Allocation builds roots after a year passes');
    expect(html).toContain('It is not a water volume');
    expect(html).toContain('Shade tolerance improves low-light capture');
    expect(html).not.toContain('does not change the simulated light response');
  });
});
