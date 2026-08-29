import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let physics;

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_skatelab.js', 'skatelab');
  physics = window.__alloSkatePhysicsPure;
});

function halfpipe(overrides = {}) {
  return physics.simHalfpipe({
    pumps: 3,
    trickId: 'kickflip',
    vehicle: 'skate',
    gravity: 9.81,
    surfaceId: 'standard',
    ...overrides,
  });
}


function gap(overrides = {}) {
  return physics.simGapJump({
    speedMph: 22,
    angleDeg: 40,
    gapFt: 20,
    riderMassKg: 62,
    vehicle: 'skate',
    gravity: 9.81,
    windId: 'calm',
    airDrag: true,
    ...overrides,
  });
}

describe('Skate Lab halfpipe energy ledger', () => {
  it('conserves input energy across mechanical and thermal reservoirs', () => {
    for (const surfaceId of ['wax', 'standard', 'rough']) {
      const result = halfpipe({ surfaceId });

      expect(result.mechanicalJ + result.thermalJ).toBeCloseTo(result.energyInputJ, 10);
      expect(result.mechanicalJ).toBeCloseTo(
        (physics.constants.riderKg + result.vehicle.mass) * result.gravity * result.hAir,
        10,
      );
    }
  });

  it('follows the curved transition with conserved geometry and measured load', () => {
    const result = halfpipe();
    const path = result.transitionPath;
    const first = path[0];
    const bottom = path[Math.floor(path.length / 2)];
    const last = path[path.length - 1];

    expect(path).toHaveLength(181);
    expect(first.x).toBeCloseTo(-4, 10);
    expect(first.y).toBeCloseTo(result.rampDepthM, 10);
    expect(bottom.x).toBeCloseTo(0, 10);
    expect(bottom.y).toBeCloseTo(0, 10);
    expect(last.x).toBeCloseTo(4, 10);
    expect(last.y).toBeCloseTo(result.rampDepthM, 10);
    expect(result.rollTime).toBeCloseTo(last.t, 10);
    expect(first.speedMps).toBeCloseTo(result.exitSpeed, 10);
    expect(bottom.speedMps).toBeCloseTo(
      Math.sqrt(result.exitSpeed ** 2 + 2 * result.gravity * result.rampDepthM),
      10,
    );
    expect(result.bottomSpeed).toBeCloseTo(bottom.speedMps, 10);
    expect(result.bottomNormalG).toBeCloseTo(bottom.normalG, 10);
    expect(result.bottomNormalG).toBeGreaterThan(1);

    for (const index of [0, 30, 90, 150, 180]) {
      expect(path[index].y).toBeCloseTo(
        physics.halfpipeY(path[index].x, result.rampDepthM),
        9,
      );
    }
  });

  it('turns a larger fraction of launch energy into heat on rough surfaces', () => {
    const wax = halfpipe({ surfaceId: 'wax' });
    const standard = halfpipe({ surfaceId: 'standard' });
    const rough = halfpipe({ surfaceId: 'rough' });

    expect(rough.thermalJ).toBeGreaterThan(standard.thermalJ);
    expect(standard.thermalJ).toBeGreaterThan(wax.thermalJ);
    expect(wax.hAir).toBeGreaterThan(standard.hAir);
    expect(standard.hAir).toBeGreaterThan(rough.hAir);
  });

  it('keeps sampled transition and flight frames on one mechanical-energy curve', () => {
    const result = halfpipe();
    const path = result.transitionPath;
    const times = [
      path[0].t,
      path[45].t,
      path[90].t,
      path[135].t,
      result.rollTime,
      result.rollTime + result.airTime * 0.25,
      result.rollTime + result.airTime * 0.5,
      result.motionDuration,
    ];

    for (const time of times) {
      const sample = physics.sampleHalfpipe(result, time / result.motionDuration);
      expect(sample.keJ + sample.peJ).toBeCloseTo(result.runMechanicalJ, 5);
      expect(sample.thermalJ).toBeCloseTo(result.thermalJ, 10);
    }

    const bottom = physics.sampleHalfpipe(
      result,
      path[90].t / result.motionDuration,
    );
    expect(bottom.nx).toBeCloseTo(0, 9);
    expect(bottom.ny).toBeCloseTo(1, 9);
    expect(bottom.normalG).toBeCloseTo(result.bottomNormalG, 7);
  });

  it('scales height and airtime inversely with gravity at fixed launch speed', () => {
    const earth = halfpipe({ gravity: 9.81 });
    const moon = halfpipe({ gravity: 1.62 });
    const gravityRatio = earth.gravity / moon.gravity;

    expect(moon.hAir / earth.hAir).toBeCloseTo(gravityRatio, 10);
    expect(moon.airTime / earth.airTime).toBeCloseTo(gravityRatio, 10);
    expect(moon.mechanicalJ).toBeCloseTo(earth.mechanicalJ, 10);
  });

  it('shows the three-reservoir ledger in the accessible equation walkthrough', () => {
    const html = renderTool('skatelab', {
      skatelab: {
        mode: 'halfpipe',
        pumps: 3,
        trickId: 'kickflip',
        vehicle: 'skate',
        gravity: 9.81,
        surfaceId: 'rough',
        showFormula: true,
      },
    });

    expect(html).toContain('Energy ledger');
    expect(html).toContain('mechanical');
    expect(html).toContain('thermal');
    expect(html).toContain('J input');
  });

  it('does not retain the incorrect Moon-energy or 30-degree guidance', () => {
    const source = readFileSync('stem_lab/stem_tool_skatelab.js', 'utf8');

    expect(source).not.toContain('PE = mgh stay the same on the Moon if h doesn\'t change');
    expect(source).not.toContain('~30° works best when you need to land at the same height');
    expect(source).toContain('range peaks at 45°');
  });
});

describe('Skate Lab deeper motion model', () => {
  it('changes rotation through body-position inertia without changing the flight arc', () => {
    const open = halfpipe({ bodyPositionId: 'open' });
    const neutral = halfpipe({ bodyPositionId: 'neutral' });
    const tuck = halfpipe({ bodyPositionId: 'tuck' });

    expect(open.hAir).toBeCloseTo(neutral.hAir, 10);
    expect(tuck.hAir).toBeCloseTo(neutral.hAir, 10);
    expect(open.airTime).toBeCloseTo(tuck.airTime, 10);
    expect(open.effectiveInertia).toBeGreaterThan(neutral.effectiveInertia);
    expect(neutral.effectiveInertia).toBeGreaterThan(tuck.effectiveInertia);
    expect(open.completed).toBeLessThan(neutral.completed);
    expect(neutral.completed).toBeLessThan(tuck.completed);
    expect(open.angularMomentum).toBeCloseTo(tuck.angularMomentum, 1);
  });

  it('changes energy in joules with rider mass but not the resulting halfpipe height', () => {
    const light = halfpipe({ riderMassKg: 45 });
    const heavy = halfpipe({ riderMassKg: 95 });

    expect(heavy.energyInputJ).toBeGreaterThan(light.energyInputJ);
    expect(heavy.mechanicalJ).toBeGreaterThan(light.mechanicalJ);
    expect(heavy.hAir).toBeCloseTo(light.hAir, 10);
    expect(heavy.airTime).toBeCloseTo(light.airTime, 10);
  });

  it('uses quadratic air drag while preserving the jump energy ledger', () => {
    const ideal = gap({ airDrag: false });
    const drag = gap({ airDrag: true });

    expect(drag.rangeM).toBeLessThan(ideal.rangeM);
    expect(ideal.rangeM).toBeCloseTo(ideal.rangeIdealM, 2);
    expect(ideal.thermalJ).toBe(0);
    expect(drag.thermalJ).toBeGreaterThan(0);
    expect(drag.mechanicalJ + drag.thermalJ).toBeCloseTo(drag.energyInputJ, 10);
  });

  it('builds an exact no-drag reference path beside the modeled trajectory', () => {
    const result = gap({ windId: 'head', airDrag: true });
    const ideal = result.idealFlightPath;
    const first = ideal[0];
    const last = ideal[ideal.length - 1];

    expect(ideal).toHaveLength(73);
    expect(first.x).toBeCloseTo(0, 10);
    expect(first.y).toBeCloseTo(0, 10);
    expect(last.t).toBeCloseTo(result.idealAirTime, 10);
    expect(last.x).toBeCloseTo(result.rangeIdealM, 10);
    expect(last.y).toBeCloseTo(0, 10);
    expect(result.rangeDeltaM).toBeCloseTo(result.rangeM - result.rangeIdealM, 10);
    expect(result.rangeDeltaFt).toBeCloseTo(
      result.rangeDeltaM * physics.constants.metersToFeet,
      10,
    );
    expect(result.rangeDeltaM).toBeLessThan(0);
  });

  it('estimates landing load from vertical speed and stopping compression', () => {
    const result = gap({ airDrag: false });
    const shallow = gap({ airDrag: false, angleDeg: 25 });
    const steep = gap({ airDrag: false, angleDeg: 55 });
    const expectedLoad = 1 + result.landingVelocity.y ** 2
      / (2 * result.gravity * result.landingCompressionM);
    const landedSample = physics.sampleGapJump(result, 1);

    expect(physics.constants.landingCompressionM).toBeCloseTo(0.45, 10);
    expect(result.landingCompressionM).toBeCloseTo(0.45, 10);
    expect(result.landingImpactG).toBeCloseTo(expectedLoad, 10);
    expect(result.landingImpactG).toBeGreaterThan(1);
    expect(landedSample.normalG).toBeCloseTo(result.landingImpactG, 10);
    expect(steep.landingImpactG).toBeGreaterThan(shallow.landingImpactG);
  });

  it('responds directionally to headwinds, tailwinds, and crosswinds', () => {
    const head = gap({ windId: 'head' });
    const tail = gap({ windId: 'tail' });
    const left = gap({ windId: 'cross_left' });
    const right = gap({ windId: 'cross_right' });

    expect(tail.rangeM).toBeGreaterThan(head.rangeM);
    expect(left.crossDriftM).toBeLessThan(0);
    expect(right.crossDriftM).toBeGreaterThan(0);
    expect(Math.abs(left.crossDriftM)).toBeCloseTo(Math.abs(right.crossDriftM), 8);
    expect(left.rangeM).toBeCloseTo(right.rangeM, 8);
  });

  it('samples the same trajectory used by the result readouts and timeline', () => {
    const sim = gap({ windId: 'cross_right' });
    const start = physics.sampleGapJump(sim, 0);
    const apexProgress = (sim.approachTime + sim.peakTime) / sim.motionDuration;
    const apex = physics.sampleGapJump(sim, apexProgress);
    const end = physics.sampleGapJump(sim, 1);

    expect(start.phase).toBe('approaching the ramp');
    expect(start.x).toBeLessThan(0);
    expect(Math.abs(apex.vy)).toBeLessThan(0.1);
    expect(apex.y).toBeCloseTo(sim.peakM, 2);
    expect(end.phase).toBe('landing');
    expect(end.time).toBeCloseTo(sim.motionDuration, 10);
    expect(end.x).toBeCloseTo(sim.rangeM, 10);
    expect(end.z).toBeCloseTo(sim.crossDriftM, 10);
  });
});
