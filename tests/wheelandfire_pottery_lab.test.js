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
    expect(html).toContain('data-experience-mode="studio"');
    expect(html).toContain('Workspace depth');
    expect(html).toContain('Guided');
    expect(html).toContain('Studio');
    expect(html).toContain('Research');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Pottery lifecycle"');
    expect(html).toContain('aria-label="Interactive pottery profile:');
    expect(html).toContain('Clay science');
    expect(html).toContain('Ways of making');
    expect(html).toContain('Dry &amp; fire');
    expect(html).toContain('Use tests');
    expect(html).toContain('Journal');
    expect(html).toContain('Start here');
    expect(html).toContain('Pottery is a sequence');
    expect(html).toContain('blue dashed line marks the work zone');
    expect(html).toContain('What do these numbers mean?');
    expect(html).toContain('Active tool:');
    expect(html).toContain('Inside-hand support');
    expect(html).toContain('Surface lubrication');
    expect(html).toContain('Contact span');
    expect(html).toContain('pale cyan band shows contact span');
    expect(html).toContain('Support 55%');
    expect(html).toContain('Preview only · no clay changed');
    expect(html).toContain('Show predicted profile');
    expect(html).toContain('dashed amber outline predicts the next profile');
    expect(html).toContain('Predicted: stability');
    expect(html).toContain('3D wheel · 42° tilt');
    expect(html).toContain('3D camera tilt');
    expect(html).toContain('wheel-fire-wheel-motion');
    expect(html).toContain('wheel-fire-wobble-motion');
    expect(html).toContain('Centering 38% · strong wobble');
    expect(html).toContain('38 percent centered with strong wobble');
    expect(html).toContain('Optional studio challenges');
    expect(html).toContain('aria-orientation="horizontal"');
    expect(html).toContain('aria-keyshortcuts="ArrowUp ArrowDown Enter Space"');
    expect(html).toContain('data-tooltip=');
    const source = readFileSync(sourceFile, 'utf8');
    expect(source).not.toMatch(/Â|â|Ã/);
    expect(source).toContain('.wheel-fire-shell[data-experience-mode="guided"] .wheel-fire-advanced');
    expect(source).toContain('.wheel-fire-shell:not([data-experience-mode="research"]) .wheel-fire-research-only');
    expect(source).toContain('function finishGesture()');
    expect(source).toContain('onPointerUp: function (event) { finishGesture();');
    const firedHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'performance', vessel: makeGlazeFired(window.__alloPotteryPure) } });
    expect(firedHtml).toContain('Next suggested step');
    expect(firedHtml).toContain('Run a use test');
  });

  it('makes the experiment loop, stage boundaries, and measurable change feedback explicit', () => {
    const pure = window.__alloPotteryPure;
    const wet = pure.makeVessel('stoneware', 'bowl');
    const shaped = pure.applyTool(wet, 'belly', 20, { pressure: 62, rpm: 55, method: 'wheel' });
    const html = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'shape', vessel: shaped, history: [wet], activeTool: 'belly',
      lastChange: { beforeStage: 'wet', afterStage: 'wet', stabilityDelta: 3.4, centeredDelta: 1.2, minWallDelta: -0.08, capacityDelta: 12.5, massDelta: 0, outcome: shaped.lastOutcome }
    } });
    const scienceHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'science', vessel: shaped } });

    expect(scienceHtml).toContain('1. Predict.');
    expect(scienceHtml).toContain('2. Change one thing.');
    expect(scienceHtml).toContain('3. Compare.');
    expect(scienceHtml).toContain('Study protocol');
    expect(scienceHtml).toContain('Baseline needed');
    expect(scienceHtml).toContain('No baseline yet');
    expect(scienceHtml).toContain('Next move.');
    expect(scienceHtml).toContain('Log the current setup as a baseline');
    expect(html).toContain('What changed since the previous checkpoint:');
    expect(html).toContain('stability +3.4 pts');
    expect(html).toContain('minimum wall -0.08 cm');
    expect(html).toContain('capacity +12.5 mL');
    expect(html).toContain('Outcome:');

    const bisqueHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel: makeBisque(pure) } });
    expect(bisqueHtml).toContain('Shaping is paused after leather-hard');
    expect(bisqueHtml).toContain('continue in Dry &amp; fire');
  });

  it('makes repeatable mechanics trials comparable, replayable, and evidence-rich', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'bowl');
    const html = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'science',
      vessel,
      trialSeriesId: 'series-speed',
      trialSeriesName: 'Wheel speed study',
      trialBaselineIds: { 'series-speed': '1' },
      measurementLog: [
        { id: 0, seriesId: 'series-old', seriesName: 'Earlier study', method: 'wheel', tool: 'center', workRing: 10, rpm: 25, pressure: 48, moisture: 70, minWall: '0.94', uniformity: 84, compression: 52, coilBond: 90, overhang: 8, stability: 69, outcome: 'Stable' },
        { id: 1, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 40, pressure: 48, moisture: 70, minWall: '0.90', uniformity: 80, compression: 50, coilBond: 90, overhang: 10, stability: 65, outcome: 'Watch closely' },
        { id: 2, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 65, pressure: 48, moisture: 70, minWall: '0.84', uniformity: 75, compression: 48, coilBond: 90, overhang: 14, stability: 60, outcome: 'Watch closely', hypothesis: 'Higher speed increases wobble.', observation: 'The rim felt softer and began to wander.' }
      ]
    } });

    expect(html).toContain('Reference-to-latest comparison');
    expect(html).toContain('Comparison ready — interpret the evidence');
    expect(html).toContain('Experiment series');
    expect(html).toContain('Wheel speed study');
    expect(html).toContain('Reference trial');
    expect(html).toContain('Reference is Trial 1');
    expect(html).toContain('Trial 1 - wheel - 40 RPM - center - ring 11');
    expect(html).toContain('70% moisture');
    expect(html).toContain('48% pressure');
    expect(html).toContain('Only trials in the selected series are compared');
    expect(html).toContain('2 logged trials');
    expect(html).toContain('Series evidence trail');
    expect(html).toContain('Selected-reference evidence graph');
    expect(html).toContain('Square marker = selected reference');
    expect(html).toContain('Stability moved from 65% at Trial 1 to 60% at Trial 2');
    expect(html).toContain('Reference to latest modeled metrics');
    expect(html).toContain('Path summary:');
    expect(html).toContain('falling path');
    expect(html).toContain('Setup audit:');
    expect(html).toContain('one-variable candidate');
    expect(html).toContain('wheel speed');
    expect(html).toContain('Study protocol');
    expect(html).toContain('Hold constant.');
    expect(html).toContain('Use Trial 1 as your selected reference');
    expect(html).toContain('Change one thing.');
    expect(html).toContain('Observe.');
    expect(html).toContain('Interpret.');
    expect(html).toContain('Next move.');
    expect(html).toContain('reduce one stress input');
    expect(html).toContain('Current setup:');
    expect(html).toContain('One setup input changed from Trial 1 → Trial 2: wheel speed');
    expect(html).toContain('How to read it:');
    expect(html).toContain('Observation recorded:');
    expect(html).toContain('Studio observation (optional)');
    expect(html).toContain('Observation');
    expect(html).toContain('Model deltas:');
    expect(html).toContain('Prediction recorded:');
    expect(html).toContain('Replay in Shape');
    expect(html).toContain('Remove from series');
    expect(html).toContain('Tool');
    expect(html).toContain('Ring');

    const laterReferenceHtml = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'science',
      vessel,
      trialSeriesId: 'series-speed',
      trialSeriesName: 'Wheel speed study',
      trialBaselineIds: { 'series-speed': '2' },
      measurementLog: [
        { id: 1, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 40, pressure: 48, moisture: 70, minWall: '0.90', uniformity: 80, compression: 50, coilBond: 90, overhang: 10, stability: 65, outcome: 'Watch closely' },
        { id: 2, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 65, pressure: 48, moisture: 70, minWall: '0.84', uniformity: 75, compression: 48, coilBond: 90, overhang: 14, stability: 60, outcome: 'Watch closely' }
      ]
    } });
    expect(laterReferenceHtml).toContain('Trial 2 is the reference');
    expect(laterReferenceHtml).toContain('Use Trial 2 as your selected reference');
    expect(laterReferenceHtml).toContain('Reference logged');
    expect(laterReferenceHtml).toContain('comparison needs one more trial');
    expect(laterReferenceHtml).toContain('Trial 2 - wheel - 65 RPM - center - ring 11');
    expect(laterReferenceHtml).not.toContain('Reference-to-latest comparison');
    expect(laterReferenceHtml).not.toContain('Selected-reference evidence graph');

    const nonAdjacentReferenceHtml = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'science',
      vessel,
      trialSeriesId: 'series-speed',
      trialSeriesName: 'Wheel speed study',
      trialBaselineIds: { 'series-speed': '1' },
      measurementLog: [
        { id: 1, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 40, pressure: 48, moisture: 70, minWall: '0.90', uniformity: 80, compression: 50, coilBond: 90, overhang: 10, stability: 65, outcome: 'Watch closely' },
        { id: 2, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 65, pressure: 48, moisture: 70, minWall: '0.84', uniformity: 75, compression: 48, coilBond: 90, overhang: 14, stability: 60, outcome: 'Watch closely' },
        { id: 3, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 65, pressure: 55, moisture: 70, minWall: '0.80', uniformity: 72, compression: 46, coilBond: 90, overhang: 16, stability: 56, outcome: 'Watch closely' }
      ]
    } });
    expect(nonAdjacentReferenceHtml).toContain('Trial 1 → Trial 3');
    expect(nonAdjacentReferenceHtml).toContain('Selected-reference evidence graph');
    expect(nonAdjacentReferenceHtml).toContain('2 setup inputs changed');
    expect(nonAdjacentReferenceHtml).toContain('wheel speed');
    expect(nonAdjacentReferenceHtml).toContain('hand pressure');

    const removedHtml = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'science', vessel, trialSeriesId: 'series-speed', trialSeriesName: 'Wheel speed study',
      measurementLog: [{ id: 1, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 40, pressure: 48, moisture: 70, minWall: '0.90', uniformity: 80, compression: 50, coilBond: 90, overhang: 10, stability: 65, outcome: 'Watch closely' }],
      removedMechanicsTrial: { row: { id: 2 }, seriesId: 'series-speed', seriesName: 'Wheel speed study', trialLabel: 'Trial 2', allIndex: 1, removedKey: '2', wasReference: false }
    } });
    expect(removedHtml).toContain('Trial 2');
    expect(removedHtml).toContain('Comparisons and journal evidence now omit it');
    expect(removedHtml).toContain('Restore removed trial');
    const source = readFileSync(sourceFile, 'utf8');
    expect(source).toContain('function removeTrial(row, index)');
    expect(source).toContain('function restoreRemovedTrial()');

    const guidedHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'science', vessel, experienceMode: 'guided' } });
    expect(guidedHtml).toContain('data-experience-mode="guided"');
    const researchHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'science', vessel, experienceMode: 'research' } });
    expect(researchHtml).toContain('data-experience-mode="research"');
    expect(researchHtml).toContain('Research model-audit lens');
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

  it('models inside support, lubrication, and contact span as tactile forming variables', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'cylinder');
    const unsupported = pure.applyTool(vessel, 'pull', 22, { pressure: 70, rpm: 65, method: 'wheel', handSupport: 0, lubrication: 30, contactSpan: 9 });
    const supported = pure.applyTool(vessel, 'pull', 22, { pressure: 70, rpm: 65, method: 'wheel', handSupport: 90, lubrication: 30, contactSpan: 9 });
    expect(supported.thickness[22]).toBeGreaterThan(unsupported.thickness[22]);
    expect(supported.heightCm).toBeGreaterThan(unsupported.heightCm);
    expect(supported.wobble).toBeLessThanOrEqual(unsupported.wobble);

    const narrow = pure.applyTool(vessel, 'belly', 20, { pressure: 65, rpm: 55, method: 'wheel', handSupport: 50, lubrication: 30, contactSpan: 3 });
    const broad = pure.applyTool(vessel, 'belly', 20, { pressure: 65, rpm: 55, method: 'wheel', handSupport: 50, lubrication: 30, contactSpan: 11 });
    expect(Math.abs(broad.radii[24] - vessel.radii[24])).toBeGreaterThan(Math.abs(narrow.radii[24] - vessel.radii[24]));

    const moderateSlip = pure.analyzeVessel(vessel, { pressure: 48, rpm: 58, method: 'wheel', lubrication: 30 });
    const excessSlip = pure.analyzeVessel(vessel, { pressure: 48, rpm: 58, method: 'wheel', lubrication: 100 });
    expect(excessSlip.stability).toBeLessThan(moderateSlip.stability);
  });

  it('forecasts a dangerous forming move before it changes the vessel', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'cylinder');
    vessel.heightCm = 38;
    vessel.centered = 0;
    vessel.wobble = 1;
    vessel.radii = vessel.radii.map(() => 10.8);
    vessel.thickness = vessel.thickness.map((wall, index) => index < 3 ? wall : 0.23);
    const html = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'shape', vessel, activeTool: 'belly', workRing: 22,
      pressure: 100, rpm: 120, handSupport: 0, lubrication: 100, contactSpan: 3
    } });

    expect(html).toContain('Collapse forecast');
    expect(html).toContain('Use safer touch setup');
    expect(html).toContain('high pressure');
    expect(html).toContain('high wheel speed');
    expect(html).toContain('low inside support');
    expect(html).toContain('excess lubrication');
    expect(html).toContain('concentrated contact');
    expect(html).toContain('stroke-dasharray="9 6"');
    expect(html).toContain('Preview only · no clay changed');
    expect(vessel.collapsed).toBe(false);
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

    const autopsy = pure.analyzeFailureContributors(collapsed, { pressure: 100, rpm: 120, method: 'wheel' });
    expect(autopsy.ready).toBe(true);
    expect(autopsy.eventLabel).toBe('Structural collapse');
    expect(autopsy.contributors.map((item) => item.id)).toContain('pressure');
    expect(autopsy.contributors.map((item) => item.id)).toContain('rpm');
    expect(autopsy.criticalRing).toBeGreaterThanOrEqual(0);

    const autopsyHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel: collapsed, pressure: 100, rpm: 120, history: [pure.makeVessel('porcelain', 'cylinder')] } });
    expect(autopsyHtml).toContain('Modeled outcome autopsy');
    expect(autopsyHtml).toContain('1. Input or condition');
    expect(autopsyHtml).toContain('2. Vulnerable response');
    expect(autopsyHtml).toContain('3. Modeled outcome');
    expect(autopsyHtml).toContain('Restore last safe checkpoint');
    expect(autopsyHtml).toContain('diagnostic hypothesis, not proof');
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
    const repeatedCalibration = pure.compareDimensionalMeasurements(dimensions, [
      { id: 'repeat-1', checkpointIndex: 0, measurementMethod: 'calipers', modeled: { heightCm: dimensions.baseline.heightCm, capacityMl: dimensions.baseline.capacityMl }, measured: { heightCm: dimensions.baseline.heightCm + 0.2, capacityMl: dimensions.baseline.capacityMl - 12 }, uncertainty: { heightCm: 0.25, capacityMl: 5 }, modelSettings },
      { id: 'repeat-2', checkpointIndex: 0, measurementMethod: 'calipers', modeled: { heightCm: dimensions.baseline.heightCm, capacityMl: dimensions.baseline.capacityMl }, measured: { heightCm: dimensions.baseline.heightCm + 0.4, capacityMl: dimensions.baseline.capacityMl - 10 }, uncertainty: { heightCm: 0.25, capacityMl: 5 }, modelSettings }
    ], modelSettings);
    const repeatability = pure.summarizeMeasurementRepeatability(repeatedCalibration.rows);
    expect(repeatability.groupCount).toBe(1);
    expect(repeatability.repeatedGroupCount).toBe(1);
    expect(repeatability.repeatedDimensionCount).toBe(2);
    expect(repeatability.groups[0].metricSummaries.heightCm.range).toBeCloseTo(0.2, 5);
    expect(repeatability.groups[0].metricSummaries.heightCm.count).toBe(2);
    expect(repeatability.groups[0].metricSummaries.capacityMl.meanUncertainty).toBeCloseTo(5, 5);
    expect(repeatability.groups[0].methodConsistency).toBe('consistent');
    expect(repeatability.groups[0].methodLabels).toEqual(['Calipers / diameter gauge']);
    expect(repeatability.summary).toContain('Repeated evidence covers');
    const mixedRepeatability = pure.summarizeMeasurementRepeatability([
      { ...repeatedCalibration.rows[0], measurementMethod: 'calipers' },
      { ...repeatedCalibration.rows[1], measurementMethod: 'water-fill' }
    ]);
    expect(mixedRepeatability.mixedMethodGroupCount).toBe(1);
    expect(mixedRepeatability.groups[0].methodConsistency).toBe('mixed');
    expect(mixedRepeatability.summary).toContain('mixed measurement methods');
    expect(pure.normalizeMeasurementMethod('not-a-method')).toBe('unknown');
    expect(pure.measurementMethodLabel('water-fill')).toBe('Water fill / graduated volume');
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
      claim: 'A higher speed reduces rim stability.',
      evidence: 'The second trial lost five stability points.',
      reasoning: 'The model links speed and wobble while pressure stays fixed.',
      selectedTradition: 'acoma',
      compareTradition: 'onggi',
      visitedTraditions: { acoma: true, onggi: true },
      culturalComparisons: [{ id: 13, firstName: 'Acoma Pueblo pottery', secondName: 'Korean onggi', similarity: 'Both use practiced forming.', difference: 'Their food contexts differ.', evidence: 'Named sources distinguish their histories.' }],
      trialSeriesId: 'series-speed',
      trialSeriesName: 'Rim speed study',
      trialBaselineIds: { 'series-speed': '12' },
      measurementLog: [{ id: 12, seriesId: 'series-speed', seriesName: 'Rim speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 40, pressure: 48, moisture: 70, minWall: '0.90', uniformity: 80, compression: 50, coilBond: 90, overhang: 10, stability: 65, outcome: 'Watch closely', observation: 'Rim felt firm after the second pass.' }],
      gallery: [{ id: 8, name: 'Recipe record', vessel: recipeState, materialRecipe: recipeState.materialRecipe, materialScenarios: [{ id: 7 }], firingSchedules: [{ id: 9 }], cycleProtocols: [{ id: 10 }], sensitivityStudies: [{ id: 11 }], measurementTrials: [{ id: 12, seriesId: 'series-speed', seriesName: 'Rim speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 40, observation: 'Rim felt firm after the second pass.' }], claim: 'A higher speed reduces rim stability.', evidence: 'The second trial lost five stability points.', reasoning: 'The model links speed and wobble while pressure stays fixed.', culturalComparisons: [{ id: 13 }], selectedTradition: 'acoma', trialSeriesId: 'series-speed', trialSeriesName: 'Rim speed study', trialBaselineIds: { 'series-speed': '12' }, method: 'wheel', performanceTests: [] }]
    } });
    expect(journalHtml).toContain('Saved scenarios');
    expect(journalHtml).toContain('1 saved material scenario');
    expect(journalHtml).toContain('Firing schedules');
    expect(journalHtml).toContain('1 saved firing schedule');
    expect(journalHtml).toContain('Reuse protocols');
    expect(journalHtml).toContain('1 saved reuse protocol');
    expect(journalHtml).toContain('Sensitivity studies');
    expect(journalHtml).toContain('1 saved sensitivity study');
    expect(journalHtml).toContain('Mechanics trials');
    expect(journalHtml).toContain('1 saved mechanics trial');
    expect(journalHtml).toContain('Latest field observation');
    expect(journalHtml).toContain('Latest field note:');
    expect(journalHtml).toContain('Reflection fields');
    expect(journalHtml).toContain('3/3 recorded');
    expect(journalHtml).toContain('Cultural comparisons');
    expect(journalHtml).toContain('1 saved cultural comparison');
    expect(journalHtml).toContain('Tradition context: Acoma Pueblo pottery');
    expect(journalHtml).toContain('Trial series: Rim speed study');
    expect(journalHtml).toContain('Mechanics reference');
    expect(journalHtml).toContain('40 RPM');
    expect(journalHtml).toContain('Reference trial: Trial 1');

    const legacyJournalHtml = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'journal',
      trialSeriesId: 'series-legacy',
      trialSeriesName: 'Legacy ring study',
      trialBaselineIds: { 'series-legacy': 'legacy-1' },
      measurementLog: [
        { seriesId: 'series-legacy', method: 'wheel', tool: 'center', workRing: 2, rpm: 20, pressure: 45, moisture: 68 },
        { seriesId: 'series-legacy', method: 'wheel', tool: 'center', workRing: 8, rpm: 45, pressure: 45, moisture: 68 }
      ]
    } });
    expect(legacyJournalHtml).toContain('45 RPM');
    expect(legacyJournalHtml).toContain('ring 9');
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
    expect(html).toContain('Time-scaled kiln schedule');
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
    expect(html).toContain('Measurement method');
    expect(html).toContain('Use the same method when repeating a checkpoint');
    expect(html).toContain('Repeatability study');
    expect(html).toContain('Repeated measurements become useful here');
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

  it('renders live 3D kiln and open-firing sections across the firing cycle', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'bowl');
    const kilnHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel } });
    expect(kilnHtml).toContain('3D kiln cutaway');
    expect(kilnHtml).toContain('Peak soak · 1220°C · oxidation');
    expect(kilnHtml).toContain('Preview schedule time');
    expect(kilnHtml).toContain('Show modeled heat zones');
    expect(kilnHtml).toContain('electric kiln cutaway during peak soak');
    expect(kilnHtml).toContain('Heatwork accumulating at peak.');
    expect(kilnHtml).toContain('Modeled firing shrinkage');
    expect(kilnHtml).toContain('load Δ ≈ 14°C');
    expect(kilnHtml).toContain('Time-scaled kiln schedule');
    expect(kilnHtml).toContain('Teal marker:');
    expect(kilnHtml).toContain('witness cones');

    const heatingHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'gas', atmosphere: 'reduction', kilnPreviewPhase: 20 } });
    expect(heatingHtml).toContain('Heating · 510°C · reduction');
    expect(heatingHtml).toContain('gas kiln cutaway during heating');
    expect(heatingHtml).toContain('Burnout and mineral change.');
    expect(heatingHtml).toContain('burner / firebox');

    const openHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'open', atmosphere: 'oxidation', kilnPreviewPhase: 100 } });
    expect(openHtml).toContain('Open-firing 3D section');
    expect(openHtml).toContain('Cooling · 100°C · oxidation');
    expect(openHtml).toContain('Cooling toward handling range.');
    expect(openHtml).toContain('Open firing: uneven heat and atmosphere exposure');
    expect(openHtml).toContain('not computational fluid dynamics');

    const glazed = pure.glazeVessel(makeBisque(pure), 'clear', 70);
    const glazeHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel: glazed } });
    expect(glazeHtml).toContain('Glaze melt and body maturity.');
    expect(glazeHtml).toContain('glaze development 100%');
  });

  it('maps kiln preview position to schedule time and retains fired material change while cooling', () => {
    const pure = window.__alloPotteryPure;
    const history = pure.estimateThermalHistory({ temperature: 1220, ramp: 110, soak: 10, coolingRate: 100 });
    const heating = pure.sampleThermalHistory(history, 20);
    const soakPosition = (history.segments[0].durationHours + history.segments[1].durationHours * 0.5) / history.totalHours * 100;
    const peak = pure.sampleThermalHistory(history, soakPosition);
    const cooled = pure.sampleThermalHistory(history, 100);

    expect(heating.segmentId).toBe('ramp');
    expect(heating.temperatureC).toBeCloseTo(510.1, 1);
    expect(peak.segmentId).toBe('soak');
    expect(peak.temperatureC).toBe(1220);
    expect(cooled.segmentId).toBe('cool');
    expect(cooled.temperatureC).toBe(100);

    let boneDry = pure.makeVessel('stoneware', 'bowl');
    boneDry = pure.dryVessel(boneDry, { humidity: 48, dryingRate: 40 });
    boneDry = pure.dryVessel(boneDry, { humidity: 48, dryingRate: 40 });
    const peakState = pure.estimateKilnMaterialState(boneDry, peak, { temperature: 1220 });
    const cooledState = pure.estimateKilnMaterialState(boneDry, cooled, { temperature: 1220 });
    expect(peakState.label).toBe('Heatwork accumulating at peak');
    expect(peakState.firingShrinkagePct).toBeGreaterThan(2);
    expect(cooledState.firingShrinkagePct).toBeCloseTo(peakState.firingShrinkagePct, 5);
    expect(cooledState.label).toBe('Cooling toward handling range');
  });

  it('keeps the deployed plugin mirror byte-for-byte synchronized', () => {
    expect(readFileSync('desktop/web-app/public/' + sourceFile, 'utf8')).toBe(readFileSync(sourceFile, 'utf8'));
  });
});
