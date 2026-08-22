import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourceFile = 'stem_lab/stem_tool_wheelandfire.js';

function makeBisque(pure, body = 'stoneware') {
  let vessel = pure.makeVessel(body, 'bowl');
  vessel = pure.dryVessel(vessel, { humidity: 48, dryingRate: 40 });
  vessel = pure.dryVessel(vessel, { humidity: 48, dryingRate: 40 });
  return pure.fireVessel(vessel, { temperature: 980, ramp: 110, soak: 15, coolingRate: 90, kilnType: 'electric', atmosphere: 'oxidation' });
}

function makeGlazeFired(pure, body = 'stoneware') {
  let vessel = pure.glazeVessel(makeBisque(pure, body), 'clear', 70);
  return pure.fireVessel(vessel, { temperature: body === 'earthenware' ? 1060 : 1220, ramp: 105, soak: 20, coolingRate: 85, kilnType: 'electric', atmosphere: 'oxidation' });
}

beforeEach(() => {
  resetStemLab();
  loadTool(sourceFile, 'wheelAndFire');
});

describe('Wheel & Fire pottery lab', () => {
  it('registers a complete, accessible pottery lifecycle interface', () => {
    const tool = window.StemLab._registry.wheelAndFire;
    const html = renderTool('wheelAndFire', { wheelAndFire: {} });

    expect(tool.label).toBe('Wheel & Fire: Pottery Lab');
    expect(tool.category).toBe('creative');
    expect(tool.questHooks).toHaveLength(5);
    expect(html).toContain('data-wheel-fire-lab="true"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Pottery lifecycle"');
    expect(html).toContain('aria-label="Interactive pottery profile:');
    expect(html).toContain('Clay science');
    expect(html).toContain('Ways of making');
    expect(html).toContain('Dry &amp; fire');
    expect(html).toContain('Use tests');
    expect(html).toContain('Journal');
  });

  it('presents named, sourced cultural process studies without style-copy shortcuts', () => {
    const pure = window.__alloPotteryPure;
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'traditions' } });

    expect(pure.CULTURAL_STUDIES).toHaveLength(5);
    expect(new Set(pure.CULTURAL_STUDIES.map((study) => study.place)).size).toBe(5);
    for (const study of pure.CULTURAL_STUDIES) {
      expect(study.sourceUrl).toMatch(/^https:\/\//);
      expect(study.respect.length).toBeGreaterThan(45);
      expect(study.experiment.method).toMatch(/^(wheel|coil)$/);
      expect(html).toContain(study.name);
    }
    expect(new Set(pure.CULTURAL_STUDIES.map((study) => study.experiment.method))).toEqual(new Set(['wheel', 'coil']));
    expect(html).toContain('process studies—not style filters');
    expect(html).toContain('Cultural care:');
    expect(html).toContain('no motif stamps');
    expect(html).toContain('Context before resemblance');
    expect(html).toContain('Evidence and uncertainty');
  });

  it('approximately conserves clay volume while shaping but not when adding or trimming clay', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'bowl');
    const before = pure.vesselVolume(vessel);
    const expanded = pure.applyTool(vessel, 'belly', 20, { pressure: 62, rpm: 55, method: 'wheel' });
    const after = pure.vesselVolume(expanded);
    expect(Math.abs(after - before) / before).toBeLessThan(0.03);

    const coiled = pure.applyTool(vessel, 'add-coil', 34, { pressure: 70, rpm: 0, method: 'coil' });
    expect(pure.vesselVolume(coiled)).toBeGreaterThan(before);

    const leatherHard = { ...vessel, stage: 'leather-hard' };
    const trimmed = pure.applyTool(leatherHard, 'trim', 6, { pressure: 75, rpm: 45, method: 'wheel' });
    expect(pure.vesselVolume(trimmed)).toBeLessThan(before);
    expect(trimmed.removedVolume).toBeGreaterThan(0);
  });

  it('turns extreme speed, pressure, imbalance, and thin walls into a deterministic collapse', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('porcelain', 'cylinder');
    vessel.heightCm = 38;
    vessel.moisture = 0.98;
    vessel.centered = 0;
    vessel.wobble = 1;
    vessel.radii = vessel.radii.map(() => 10.8);
    vessel.thickness = vessel.thickness.map((wall, index) => index < 3 ? wall : 0.23);

    const collapsed = pure.applyTool(vessel, 'belly', 22, { pressure: 100, rpm: 120, method: 'wheel' });
    expect(collapsed.collapsed).toBe(true);
    expect(collapsed.defects).toContain('structural collapse');
    expect(collapsed.heightCm).toBeLessThan(38);
  });

  it('models coil consolidation and unsupported overhang as structural variables', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('tempered', 'bowl');
    const added = pure.applyTool(vessel, 'add-coil', 34, { pressure: 80, rpm: 0, method: 'coil' });
    expect(added.coilBond).toBeLessThan(vessel.coilBond);
    expect(added.compression).toBeLessThan(vessel.compression);

    const paddled = pure.applyTool(added, 'paddle', 33, { pressure: 70, rpm: 0, method: 'coil' });
    expect(paddled.coilBond).toBeGreaterThan(added.coilBond);
    expect(paddled.compression).toBeGreaterThan(added.compression);

    const overhanging = pure.makeVessel('stoneware', 'cylinder');
    overhanging.radii = overhanging.radii.map((radius, index) => Math.min(12, 4 + index * 0.45));
    const supported = pure.makeVessel('stoneware', 'cylinder');
    supported.radii = supported.radii.map(() => 12);
    const baseline = pure.analyzeVessel(supported, { rpm: 0, method: 'coil' });
    const stressed = pure.analyzeVessel(overhanging, { rpm: 0, method: 'coil' });
    expect(stressed.overhangRisk).toBeGreaterThan(baseline.overhangRisk);
    expect(stressed.stability).toBeLessThan(baseline.stability);
  });

  it('localizes thin-wall risk to the affected ring for focused inspection', () => {
    const pure = window.__alloPotteryPure;
    const baseline = pure.makeVessel('stoneware', 'cylinder');
    const thin = { ...baseline, thickness: [...baseline.thickness] };
    thin.thickness[18] = 0.22;
    const baselineRisks = pure.analyzeRingRisks(baseline, { method: 'wheel' });
    const thinRisks = pure.analyzeRingRisks(thin, { method: 'wheel' });
    expect(thinRisks[18].risk).toBeGreaterThan(baselineRisks[18].risk);
    expect(thinRisks[18].status).toMatch(/Watch|High/);
    expect(pure.analyzeVessel(thin, { method: 'wheel', rpm: 0 }).maxRingRisk).toBeGreaterThan(pure.analyzeVessel(baseline, { method: 'wheel', rpm: 0 }).maxRingRisk);
  });

  it('makes poor coil bonding visible during aggressive drying', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('tempered', 'jar');
    vessel.coilBond = 0.2;
    vessel.compression = 0.25;
    const dried = pure.dryVessel(vessel, { humidity: 10, dryingRate: 100, method: 'coil' });
    expect(dried.defects).toContain('coil separation');
  });

  it('uses ramp and soak to estimate heatwork and predicts porosity from maturation', () => {
    const pure = window.__alloPotteryPure;
    const shortFast = pure.estimateHeatwork({ temperature: 1200, ramp: 280, soak: 0 });
    const longSlow = pure.estimateHeatwork({ temperature: 1200, ramp: 80, soak: 60 });
    const history = pure.estimateThermalHistory({ temperature: 1200, ramp: 80, soak: 60, coolingRate: 80 });
    const dimensions = pure.estimateDimensionalHistory(pure.makeVessel('stoneware', 'bowl'), { humidity: 48, dryingRate: 45, temperature: 1220, ramp: 110, soak: 15, coolingRate: 90, kilnType: 'electric' });
    expect(longSlow.effectiveTemp).toBeGreaterThan(shortFast.effectiveTemp);
    expect(longSlow.cone).toMatch(/^\d+$/);
    expect(history.segments.map((segment) => segment.label)).toEqual(['Ramp up', 'Peak soak', 'Controlled cool']);
    expect(history.segments.reduce((sum, segment) => sum + segment.relativePct, 0)).toBeCloseTo(100, 5);
    expect(history.totalHours).toBeGreaterThan(history.segments[0].durationHours);
    expect(dimensions.snapshots.map((snapshot) => snapshot.label)).toEqual(['Current piece', 'Leather-hard projection', 'Bone-dry projection', 'Bisque projection']);
    expect(dimensions.snapshots.at(-1).capacityChangePct).toBeLessThan(0);
    expect(dimensions.summary).toContain('dimensional checkpoints');
    const targetPlan = pure.estimateDimensionalTargets(dimensions, { capacityMl: dimensions.snapshots.at(-1).capacityMl + 100, heightCm: dimensions.snapshots.at(-1).heightCm + 2 });
    expect(targetPlan.targetedCount).toBe(2);
    expect(targetPlan.results.find((result) => result.id === 'capacityMl').recommendedCurrent).toBeGreaterThan(dimensions.baseline.capacityMl);
    expect(targetPlan.results.find((result) => result.id === 'capacityMl').retentionPct).toBeLessThan(100);
    expect(targetPlan.summary).toContain('Reverse scaling');
    const modelSettings = pure.dimensionModelSettings({ clayBody: 'stoneware', materialRecipe: null, method: 'wheel', humidity: 48, dryingRate: 45, temperature: 1220, ramp: 110, soak: 15, coolingRate: 90, kilnType: 'electric', atmosphere: 'oxidation' });
    expect(modelSettings.modelVersion).toBe(pure.DIMENSION_MODEL_VERSION);
    expect(pure.compareDimensionModelSettings(modelSettings, modelSettings).status).toBe('current');
    const changedSettings = { ...modelSettings, temperature: 1180 };
    expect(pure.compareDimensionModelSettings(modelSettings, changedSettings).changedFields).toContain('temperature');
    expect(pure.compareDimensionModelSettings(modelSettings, changedSettings).status).toBe('stale');
    expect(pure.compareDimensionModelSettings({ humidity: 48 }, modelSettings).status).toBe('incomplete');
    const contextCalibration = pure.compareDimensionalMeasurements(dimensions, [{ id: 'context-1', checkpointIndex: 0, modeled: { heightCm: dimensions.baseline.heightCm }, measured: { heightCm: dimensions.baseline.heightCm + 0.2 }, modelSettings }], changedSettings);
    expect(contextCalibration.staleCount).toBe(1);
    expect(contextCalibration.rows[0].context.status).toBe('stale');
    const uncertaintyCalibration = pure.compareDimensionalMeasurements(dimensions, [{ id: 'uncertainty-1', checkpointIndex: 0, modeled: { heightCm: dimensions.baseline.heightCm, capacityMl: dimensions.baseline.capacityMl }, measured: { heightCm: dimensions.baseline.heightCm + 0.2, capacityMl: dimensions.baseline.capacityMl - 12 }, uncertainty: { heightCm: 0.25, capacityMl: 5 }, modelSettings }], modelSettings);
    expect(uncertaintyCalibration.uncertaintyCount).toBe(2);
    expect(uncertaintyCalibration.withinUncertaintyCount).toBe(1);
    expect(uncertaintyCalibration.outOfBandCount).toBe(1);
    expect(uncertaintyCalibration.uncertaintyCoveragePct).toBeCloseTo(50, 5);
    expect(uncertaintyCalibration.rows[0].compared.find((item) => item.id === 'heightCm').withinUncertainty).toBe(true);
    expect(uncertaintyCalibration.rows[0].compared.find((item) => item.id === 'capacityMl').withinUncertainty).toBe(false);
    const zeroRangeCalibration = pure.compareDimensionalMeasurements(dimensions, [{ id: 'uncertainty-zero', checkpointIndex: 0, modeled: { heightCm: dimensions.baseline.heightCm }, measured: { heightCm: dimensions.baseline.heightCm }, uncertainty: { heightCm: 0 }, modelSettings }], modelSettings);
    expect(zeroRangeCalibration.rows[0].compared[0].withinUncertainty).toBe(true);
    expect(zeroRangeCalibration.rows[0].compared[0].uncertaintyRatio).toBeNull();
    const calibration = pure.compareDimensionalMeasurements(dimensions, [{ id: 'measure-1', checkpointIndex: 0, measured: { heightCm: dimensions.baseline.heightCm + 0.2, capacityMl: dimensions.baseline.capacityMl - 12 }, note: 'calipers and water fill' }]);
    expect(calibration.measurementCount).toBe(1);
    expect(calibration.dimensionCount).toBe(2);
    expect(calibration.rows[0].residuals.heightCm).toBeCloseTo(0.2, 5);
    expect(calibration.rows[0].residuals.capacityMl).toBeCloseTo(-12, 5);
    expect(calibration.meanAbsoluteRelativeErrorPct).toBeGreaterThan(0);
    expect(calibration.summary).toContain('Mean absolute relative error');
    const shiftedHistory = { ...dimensions, snapshots: dimensions.snapshots.map((snapshot, index) => index === 0 ? { ...snapshot, heightCm: snapshot.heightCm + 5 } : snapshot) };
    const frozenCalibration = pure.compareDimensionalMeasurements(shiftedHistory, [{ id: 'measure-frozen', checkpointIndex: 0, checkpointLabel: 'Current piece', modeled: { heightCm: dimensions.baseline.heightCm, capacityMl: dimensions.baseline.capacityMl }, measured: { heightCm: dimensions.baseline.heightCm + 0.2, capacityMl: dimensions.baseline.capacityMl - 12 } }]);
    expect(frozenCalibration.rows[0].modelSource).toBe('logged');
    expect(frozenCalibration.rows[0].residuals.heightCm).toBeCloseTo(0.2, 5);

    const underfired = pure.estimateFiredPorosity('stoneware', 1000, 'electric');
    const mature = pure.estimateFiredPorosity('stoneware', 1230, 'electric');
    expect(mature.maturation).toBeGreaterThan(underfired.maturation);
    expect(mature.porosity).toBeLessThan(underfired.porosity);
  });

  it('separates glaze melt, coverage, fit, and surface-risk signals', () => {
    const pure = window.__alloPotteryPure;
    const bisque = makeBisque(pure, 'stoneware');
    const glazed = pure.glazeVessel(bisque, 'clear', 55);
    const under = pure.analyzeGlazeOutcome(glazed, { temperature: 900, ramp: 110, soak: 0, kilnType: 'electric' });
    const target = pure.analyzeGlazeOutcome(glazed, { temperature: 1080, ramp: 110, soak: 15, kilnType: 'electric' });
    const over = pure.analyzeGlazeOutcome(glazed, { temperature: 1240, ramp: 110, soak: 15, kilnType: 'electric' });
    expect(target.meltIndexPct).toBeGreaterThan(under.meltIndexPct);
    expect(over.meltIndexPct).toBeGreaterThan(target.meltIndexPct);
    expect(pure.analyzeGlazeOutcome({ ...glazed, glazeThickness: 15 }, { temperature: 1080 }).coveragePct).toBeLessThan(target.coveragePct);

    const porcelain = pure.glazeVessel(makeBisque(pure, 'porcelain'), 'tin', 55);
    const mismatch = pure.analyzeGlazeOutcome(porcelain, { temperature: 1040, ramp: 110, soak: 15 });
    expect(mismatch.fitScore).toBeLessThan(target.fitScore);

    const fired = pure.fireVessel(glazed, { temperature: 1080, ramp: 110, soak: 15, coolingRate: 90, kilnType: 'electric', atmosphere: 'oxidation' });
    expect(fired.lastGlazeOutcome).toMatchObject({ glazeId: 'clear', bodyId: 'stoneware' });
    expect(fired.firingLog[1].glazeOutcome).toMatchObject({ glazeId: 'clear' });
  });

  it('compares firing schedules without starting a firing cycle', () => {
    const pure = window.__alloPotteryPure;
    const glazed = pure.glazeVessel(makeBisque(pure, 'stoneware'), 'clear', 55);
    const fast = pure.analyzeFiringSchedule(glazed, { temperature: 1220, ramp: 280, soak: 0, coolingRate: 250, kilnType: 'electric', atmosphere: 'oxidation' });
    const slow = pure.analyzeFiringSchedule(glazed, { temperature: 1220, ramp: 80, soak: 60, coolingRate: 80, kilnType: 'electric', atmosphere: 'oxidation' });
    expect(slow.heatwork.effectiveTemp).toBeGreaterThan(fast.heatwork.effectiveTemp);
    expect(fast.rampRiskPct).toBeGreaterThan(slow.rampRiskPct);
    expect(fast.thermalRiskPct).toBeGreaterThan(slow.thermalRiskPct);
    expect(slow.thermalHistory.segments).toHaveLength(3);
    expect(slow.thermalHistory.totalHours).toBeGreaterThan(fast.thermalHistory.totalHours);
    expect(slow.glazeOutcome).toMatchObject({ glazeId: 'clear' });
    expect(glazed.stage).toBe('glazed');
  });

  it('derives bounded recipe-study tradeoffs without changing the named body baseline', () => {
    const pure = window.__alloPotteryPure;
    const base = pure.makeVessel('stoneware', 'bowl');
    const baseProfile = pure.materialProfile(base);
    expect(base.materialRecipe).toBeNull();
    expect(baseProfile.name).toBe('Stoneware');

    const studied = { ...base, materialRecipe: { label: 'coarse temper trial', temperPercent: 20, plasticityShift: 0, shrinkageShift: 0, porosityShift: 0 } };
    const recipeProfile = pure.materialProfile(studied);
    expect(recipeProfile.name).toContain('coarse temper trial');
    expect(recipeProfile.plasticity).toBeLessThan(baseProfile.plasticity);
    expect(recipeProfile.shrinkage).toBeLessThan(baseProfile.shrinkage);
    expect(recipeProfile.porosity).toBeGreaterThan(baseProfile.porosity);
    expect(recipeProfile.density).toBeLessThan(baseProfile.density);
    expect(pure.analyzeVessel(studied, { rpm: 0 }).massG).toBeLessThan(pure.analyzeVessel(base, { rpm: 0 }).massG);

    const comparison = pure.compareMaterialProfiles(base, studied.materialRecipe, { temperature: 1220, ramp: 105, soak: 20, kilnType: 'electric' });
    expect(comparison.baseline.name).toBe('Stoneware');
    expect(comparison.profile.name).toContain('coarse temper trial');
    expect(comparison.delta.porosity).toBeGreaterThan(0);
    expect(comparison.firedPorosity.porosity).toBeGreaterThan(comparison.baselineFiredPorosity.porosity);

    const normalized = pure.normalizeVessel({ ...studied, materialRecipe: { label: 'bounded', temperPercent: 99, plasticityShift: -99, shrinkageShift: 99, porosityShift: -99 } });
    expect(normalized.materialRecipe).toMatchObject({ temperPercent: 35, plasticityShift: -18, shrinkageShift: 3, porosityShift: -8 });
    expect(pure.estimateFiredPorosity(recipeProfile, 1230, 'electric').porosity).toBeGreaterThan(pure.estimateFiredPorosity(baseProfile, 1230, 'electric').porosity);
  });

  it('renders recipe assumptions with comparison controls and keeps old vessel state readable', () => {
    const pure = window.__alloPotteryPure;
    const oldState = pure.makeVessel('earthenware', 'cylinder');
    delete oldState.materialRecipe;
    const normalized = pure.normalizeVessel(oldState);
    expect(normalized.materialRecipe).toBeNull();
    expect(pure.analyzeVessel(normalized, { rpm: 0 }).status).toBeTruthy();

    const recipeState = { ...normalized, materialRecipe: { label: 'test recipe', temperPercent: 12 } };
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'science', vessel: recipeState, materialScenarios: [{ id: 7, label: 'Saved temper trial', clayBody: 'earthenware', materialRecipe: { temperPercent: 16 } }] } });
    expect(html).toContain('Optional material recipe study');
    expect(html).toContain('Temper proxy');
    expect(html).toContain('Apply recipe to current piece');
    expect(html).toContain('Clear recipe');
    expect(html).toContain('abstract classroom proxy');
    expect(html).toContain('Material comparison shelf');
    expect(html).toContain('Saved recipe hypotheses');
    expect(html).toContain('Load preview');
    expect(html).toContain('Local ring stress map');
    expect(html).toContain('Local ring stress zones');
    expect(html).toContain('Focus ring');

    const journalHtml = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'journal',
      vessel: recipeState,
      materialScenarios: [{ id: 7, label: 'Saved temper trial', clayBody: 'earthenware', materialRecipe: { temperPercent: 16 } }],
      firingSchedules: [{ id: 9, label: 'Slow test', temperature: 1220, ramp: 80, soak: 30, coolingRate: 80, kilnType: 'electric' }],
      cycleProtocols: [{ id: 10, label: 'Slow rinse', cycles: 12, dryingRate: 20, cycleTemperatureDelta: 30 }],
      sensitivityLog: [{ id: 11, label: 'Cycle sensitivity sweep', stage: 'glaze-fired', cycles: 24, dryingRate: 45, cycleTemperatureDelta: 80, damagePct: 18, axes: [], observation: 'Observed no visible change after the short comparison.' }],
      gallery: [{ id: 8, name: 'Recipe record', vessel: recipeState, materialRecipe: recipeState.materialRecipe, materialScenarios: [{ id: 7 }], firingSchedules: [{ id: 9 }], cycleProtocols: [{ id: 10 }], sensitivityStudies: [{ id: 11 }], method: 'wheel', performanceTests: [] }]
    } });
    expect(journalHtml).toContain('Saved scenarios');
    expect(journalHtml).toContain('1 saved material scenario');
    expect(journalHtml).toContain('Firing schedules');
    expect(journalHtml).toContain('1 saved firing schedule');
    expect(journalHtml).toContain('Reuse protocols');
    expect(journalHtml).toContain('1 saved reuse protocol');
    expect(journalHtml).toContain('Sensitivity studies');
    expect(journalHtml).toContain('1 saved sensitivity study');
  });

  it('enforces drying, bisque, glazing, and glaze-firing order with modeled defects', () => {
    const pure = window.__alloPotteryPure;
    let vessel = pure.makeVessel('stoneware', 'bowl');
    const gentleDrying = pure.estimateDryingHistory(vessel, { humidity: 70, dryingRate: 20 });
    const harshDrying = pure.estimateDryingHistory(vessel, { humidity: 10, dryingRate: 100 });
    expect(gentleDrying.segments).toHaveLength(2);
    expect(gentleDrying.segments.reduce((sum, segment) => sum + segment.relativePct, 0)).toBeCloseTo(100, 5);
    expect(harshDrying.segments[0].crackRiskPct).toBeGreaterThan(gentleDrying.segments[0].crackRiskPct);
    expect(gentleDrying.finalStage).toBe('bone-dry');
    const thinWallVessel = { ...vessel, thickness: [...vessel.thickness] };
    thinWallVessel.thickness[18] = 0.22;
    const hotspotHistory = pure.estimateDryingHistory(thinWallVessel, { humidity: 48, dryingRate: 45 });
    expect(hotspotHistory.hotspots).toHaveLength(3);
    expect(hotspotHistory.hotspots[0].index).toBe(18);
    expect(hotspotHistory.hotspots[0].reason).toBe('thin wall');
    vessel = pure.dryVessel(vessel, { humidity: 42, dryingRate: 45 });
    expect(vessel.stage).toBe('leather-hard');
    vessel = pure.dryVessel(vessel, { humidity: 42, dryingRate: 45 });
    expect(vessel.stage).toBe('bone-dry');

    vessel = pure.fireVessel(vessel, { temperature: 980, ramp: 230, soak: 10, coolingRate: 100, kilnType: 'electric', atmosphere: 'oxidation' });
    expect(vessel.stage).toBe('bisque');
    expect(vessel.defects).toContain('thermal crack');

    vessel = pure.glazeVessel(vessel, 'celadon', 50);
    expect(vessel.stage).toBe('glazed');
    vessel = pure.fireVessel(vessel, { temperature: 1260, ramp: 120, soak: 20, coolingRate: 300, kilnType: 'electric', atmosphere: 'reduction' });
    expect(vessel.stage).toBe('glaze-fired');
    expect(vessel.defects).toContain('dunting crack');
    expect(vessel.firedPorosity).toBeLessThan(0.08);
    expect(vessel.firingLog[1]).toMatchObject({ soak: 20, coolingRate: 300, atmosphere: 'oxidation' });
    expect(vessel.firingLog).toHaveLength(2);
  });

  it('renders heatwork and cooling controls with an accessible schedule diagram', () => {
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', kilnTemp: 1220, soak: 30, coolingRate: 90, dimensionTargetCapacity: 220 } });
    expect(html).toContain('Peak soak');
    expect(html).toContain('Cooling rate');
    expect(html).toContain('Modeled drying history');
    expect(html).toContain('Wet to leather-hard');
    expect(html).toContain('Modeled moisture removed');
    expect(html).toContain('Projected final stage');
    expect(html).toContain('crack-risk signal');
    expect(html).toContain('Drying hotspots to inspect');
    expect(html).toContain('Focus one in Shape');
    expect(html).toContain('Simplified kiln schedule');
    expect(html).toContain('Modeled thermal history');
    expect(html).toContain('Ramp up');
    expect(html).toContain('Controlled cool');
    expect(html).toContain('Total modeled schedule time');
    expect(html).toContain('Cooling risk signal');
    expect(html).toContain('Dimensional shrinkage budget');
    expect(html).toContain('Projected dimensional checkpoints');
    expect(html).toContain('Capacity');
    expect(html).toContain('Min wall');
    expect(html).toContain('Plan backward from a target');
    expect(html).toContain('Current-stage target');
    expect(html).toContain('Clear target fields');
    expect(html).toContain('Calibrate with a real measurement');
    expect(html).toContain('Measurement uncertainty');
    expect(html).toContain('Log measured checkpoint');
    expect(html).toContain('Model calibration evidence');
    expect(html).toContain('No measurement uncertainty ranges declared yet');
    expect(html).toContain('rough cone neighborhood');
    expect(html).toContain('Projected maturation');
    expect(html).toContain('Glaze outcome preview');
    expect(html).toContain('Melt window');
    expect(html).toContain('Fit score');
    expect(html).toContain('Firing schedule shelf');
    expect(html).toContain('Save firing scenario');
    const journalHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'journal' } });
    expect(journalHtml).toContain('Model provenance');
    expect(journalHtml).toContain('Dimensional targets');
  });

  it('requires fired clay for use tests and models glaze sealing without claiming certification', () => {
    const pure = window.__alloPotteryPure;
    const wet = pure.evaluateVesselUse(pure.makeVessel('stoneware', 'bowl'), 'water', { durationHours: 4 });
    expect(wet.ready).toBe(false);

    const bisque = makeBisque(pure);
    const glazed = makeGlazeFired(pure);
    const porousResult = pure.evaluateVesselUse(bisque, 'water', { durationHours: 8 });
    const sealedResult = pure.evaluateVesselUse(glazed, 'water', { durationHours: 8 });
    expect(porousResult.ready).toBe(true);
    expect(sealedResult.porosityPct).toBeLessThan(porousResult.porosityPct);
    expect(sealedResult.seepageMl).toBeLessThan(porousResult.seepageMl);
    expect(sealedResult.summary).toContain('does not establish food safety');
  });

  it('responds monotonically to thermal change, applied load, and structural defects', () => {
    const pure = window.__alloPotteryPure;
    const fired = makeGlazeFired(pure, 'porcelain');
    const mildThermal = pure.evaluateVesselUse(fired, 'thermal', { temperatureDelta: 30 });
    const severeThermal = pure.evaluateVesselUse(fired, 'thermal', { temperatureDelta: 200 });
    expect(severeThermal.riskPct).toBeGreaterThan(mildThermal.riskPct);

    const lightLoad = pure.evaluateVesselUse(fired, 'load', { loadKg: 2 });
    const heavyLoad = pure.evaluateVesselUse(fired, 'load', { loadKg: 25 });
    expect(heavyLoad.score).toBeLessThan(lightLoad.score);

    const cracked = { ...fired, defects: [...fired.defects, 'dunting crack'] };
    const intactWater = pure.evaluateVesselUse(fired, 'water', { durationHours: 4 });
    const crackedWater = pure.evaluateVesselUse(cracked, 'water', { durationHours: 4 });
    expect(crackedWater.integrityPct).toBeLessThan(intactWater.integrityPct);
    expect(crackedWater.score).toBeLessThan(intactWater.score);
  });

  it('models accumulated damage across repeated wet-dry cycles', () => {
    const pure = window.__alloPotteryPure;
    const fired = makeGlazeFired(pure, 'stoneware');
    const shortRun = pure.evaluateVesselUse(fired, 'cycles', { cycles: 2 });
    const longRun = pure.evaluateVesselUse(fired, 'cycles', { cycles: 50 });
    const gentleProtocol = pure.evaluateVesselUse(fired, 'cycles', { cycles: 24, dryingRate: 10, cycleTemperatureDelta: 20 });
    const harshProtocol = pure.evaluateVesselUse(fired, 'cycles', { cycles: 24, dryingRate: 100, cycleTemperatureDelta: 220 });
    const protocolComparison = pure.compareCycleProtocols(fired);
    const sensitivitySweep = pure.compareCycleSensitivity(fired, { cycles: 24, dryingRate: 45, cycleTemperatureDelta: 80 });
    expect(shortRun.ready).toBe(true);
    expect(longRun.damagePct).toBeGreaterThan(shortRun.damagePct);
    expect(longRun.score).toBeLessThan(shortRun.score);
    expect(longRun.damageRange.low).toBeLessThanOrEqual(longRun.damagePct);
    expect(longRun.damageRange.high).toBeGreaterThanOrEqual(longRun.damagePct);
    expect(longRun.uncertaintyPct).toBeGreaterThanOrEqual(8);
    expect(longRun.summary).toContain('uncalibrated sensitivity band');
    expect(longRun.uncertaintyDrivers).toHaveLength(5);
    expect(longRun.uncertaintyDrivers.map((driver) => driver.label)).toContain('Open pore pathways');
    expect(longRun.uncertaintyDrivers.reduce((sum, driver) => sum + driver.relativePct, 0)).toBeCloseTo(100, 5);
    expect(harshProtocol.damagePct).toBeGreaterThan(gentleProtocol.damagePct);
    expect(harshProtocol.dryingRate).toBe(100);
    expect(harshProtocol.cycleTemperatureDelta).toBe(220);
    expect(pure.CYCLE_PROTOCOLS).toHaveLength(3);
    expect(protocolComparison.map((protocol) => protocol.label)).toEqual(['Gentle care', 'Everyday service', 'Harsh contrast']);
    expect(protocolComparison[2].result.damagePct).toBeGreaterThan(protocolComparison[0].result.damagePct);
    expect(protocolComparison[1].result.primaryDriver).toBeTruthy();
    expect(sensitivitySweep.map((axis) => axis.label)).toEqual(['Cycle count', 'Drying severity', 'Temperature swing']);
    sensitivitySweep.forEach((axis) => {
      expect(axis.points).toHaveLength(3);
      expect(axis.points[1].label).toBe('Current');
      expect(axis.points[0].result.damagePct).toBeLessThanOrEqual(axis.points[1].result.damagePct);
      expect(axis.points[2].result.damagePct).toBeGreaterThanOrEqual(axis.points[1].result.damagePct);
      expect(axis.points[1].result.damageRange.low).toBeLessThanOrEqual(axis.points[1].result.damagePct);
    });
    expect(longRun.summary).toContain('not a durability certification');
    expect(longRun.summary).toContain('leading modeled driver');
    expect(longRun.cycleDrivers).toHaveLength(3);
    expect(longRun.cycleDrivers.reduce((sum, driver) => sum + driver.relativePct, 0)).toBeCloseTo(100, 5);
    expect(longRun.primaryDriver).toBeTruthy();
    expect(longRun.cycleCheckpoints).toHaveLength(5);
    expect(longRun.cycleCheckpoints[0]).toMatchObject({ cycles: 0, damagePct: 0, phase: 'Baseline' });
    for (let index = 1; index < longRun.cycleCheckpoints.length; index += 1) {
      expect(longRun.cycleCheckpoints[index].damagePct).toBeGreaterThanOrEqual(longRun.cycleCheckpoints[index - 1].damagePct);
    }
    expect(longRun.cycleCheckpoints.at(-1).cycles).toBe(50);

    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'performance', vessel: fired, performanceTest: 'cycles', testCycles: 24 } });
    expect(html).toContain('Repeated wet-dry cycles');
    expect(html).toContain('Wet-dry cycles');
    expect(html).toContain('Accumulated damage');
    expect(html).toContain('Modeled damage range');
    expect(html).toContain('Uncalibrated sensitivity band');
    expect(html).toContain('Read the sensitivity band');
    expect(html).toContain('What widens the band?');
    expect(html).toContain('Band width');
    expect(html).toContain('Base model spread');
    expect(html).toContain('What changes if one input changes?');
    expect(html).toContain('One-variable sensitivity sweep');
    expect(html).toContain('Counterfactual cycle comparison');
    expect(html).toContain('The cells show point damage followed by the uncalibrated band');
    expect(html).toContain('Temperature swing');
    expect(html).toContain('Sensitivity observation (optional)');
    expect(html).toContain('Log sweep as experiment');
    const loggedHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'performance', vessel: fired, performanceTest: 'cycles', sensitivityLog: [{ id: 91, label: 'Logged comparison', stage: 'glaze-fired', cycles: 24, dryingRate: 45, cycleTemperatureDelta: 80, damagePct: 18, axes: [], observation: 'Observed no visible change.' }] } });
    expect(loggedHtml).toContain('Sensitivity experiment log');
    expect(loggedHtml).toContain('Logged comparison');
    expect(loggedHtml).toContain('Observed no visible change.');
    expect(html).toContain('Drying severity');
    expect(html).toContain('Cycle temperature swing');
    expect(html).toContain('Exposure profile');
    expect(html).toContain('Modeled damage progression');
    expect(html).toContain('Modeled driver breakdown');
    expect(html).toContain('Open pore pathways');
    expect(html).toContain('Cycle checkpoints');
    expect(html).toContain('Compare reuse protocols');
    expect(html).toContain('Reuse protocol comparison');
    expect(html).toContain('Gentle care');
    expect(html).toContain('Harsh contrast');
    expect(html).toContain('Apply');
    expect(html).toContain('Saved reuse protocol shelf');
    expect(html).toContain('Protocol label');
    expect(html).toContain('Save current protocol');
    expect(html).toContain('No custom protocols saved yet.');
  });

  it('provides a comparative permeability proxy and a safety-bounded performance interface', () => {
    const pure = window.__alloPotteryPure;
    const bisque = makeBisque(pure, 'earthenware');
    const glazed = makeGlazeFired(pure, 'earthenware');
    const openSurface = pure.evaluateVesselUse(bisque, 'permeability', {});
    const sealedSurface = pure.evaluateVesselUse(glazed, 'permeability', {});
    expect(openSurface.permeabilityIndex).toBeGreaterThan(sealedSurface.permeabilityIndex);

    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'performance', vessel: glazed } });
    expect(html).toContain('Function &amp; material performance lab');
    expect(html).toContain('Not a food-safety test');
    expect(html).toContain('FDA ceramicware guidance');
    expect(html).toContain('Health Canada glazed-ceramics guidance');
    expect(html).toContain('Run and log water retention');
    expect(html).toContain('Observed note (optional)');
    expect(html).toContain('Field notes document an observation');
  });

  it('renders the stored firing schedule as evidence', () => {
    const pure = window.__alloPotteryPure;
    const fired = makeGlazeFired(pure);
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel: fired } });
    expect(html).toContain('Firing evidence log');
    expect(html).toContain('°C eq.');
    expect(html).toContain('Observed model flags');
    expect(html).toContain('Surface outcome');
  });

  it('keeps the deployed plugin mirror byte-for-byte synchronized', () => {
    expect(readFileSync('desktop/web-app/public/' + sourceFile, 'utf8')).toBe(readFileSync(sourceFile, 'utf8'));
  });
});
