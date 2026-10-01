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

function contactSample(sim, fraction) {
  const contactTime = sim.approachTime + sim.airTime +
    sim.landingStopTimeS * fraction;
  return physics.sampleGapJump(sim, contactTime / sim.motionDuration);
}

function expectAerodynamicEnergyClosure(sim, precision = 8) {
  expect(sim.aerodynamicDissipationJ).toBeGreaterThanOrEqual(-1e-9);
  expect(sim.minimumAerodynamicDissipationJ).toBeGreaterThanOrEqual(-1e-9);
  expect(sim.aerodynamicBodyWorkJ).toBeCloseTo(
    sim.windWorkJ - sim.aerodynamicDissipationJ,
    precision,
  );
  expect(sim.aerodynamicNetWorkJ).toBeCloseTo(
    sim.windWorkJ - sim.aerodynamicDissipationJ,
    precision,
  );
  expect(sim.flightMechanicalEnergyJ + sim.aerodynamicDissipationJ)
    .toBeCloseTo(sim.energyInputJ + sim.windWorkJ, precision);
  expect(sim.energyClosureResidualJ).toBeCloseTo(0, precision);
  expect(sim.energyBalanceOutputJ).toBeCloseTo(
    sim.energyBalanceInputJ,
    precision,
  );
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

  it('uses ramp depth to reshape transition forces while preserving launch energy', () => {
    const shallow = halfpipe({ rampDepthM: 1.5 });
    const deep = halfpipe({ rampDepthM: 4.0 });

    expect(deep.exitSpeed).toBeCloseTo(shallow.exitSpeed, 10);
    expect(deep.hAir).toBeCloseTo(shallow.hAir, 10);
    expect(deep.bottomSpeed).toBeGreaterThan(shallow.bottomSpeed);
    expect(deep.bottomNormalG).toBeGreaterThan(shallow.bottomNormalG);
    expect(shallow.transitionPath[0].y).toBeCloseTo(1.5, 10);
    expect(deep.transitionPath[0].y).toBeCloseTo(4.0, 10);

    for (const result of [shallow, deep]) {
      const peak = result.transitionPath.reduce((highest, point) => (
        point.normalG > highest.normalG ? point : highest
      ));
      const sampledPeak = physics.sampleHalfpipe(
        result,
        result.peakLoadTime / result.motionDuration,
      );

      expect(result.peakNormalG).toBeCloseTo(peak.normalG, 10);
      expect(result.peakLoadTime).toBeCloseTo(peak.t, 10);
      expect(result.peakLoadX).toBeCloseTo(peak.x, 10);
      expect(result.peakLoadY).toBeCloseTo(peak.y, 10);
      expect(result.peakNormalG).toBeGreaterThanOrEqual(result.bottomNormalG);
      expect(sampledPeak.normalG).toBeCloseTo(result.peakNormalG, 7);
    }

    expect(halfpipe({ rampDepthM: 0 }).rampDepthM).toBe(1.2);
    expect(halfpipe({ rampDepthM: 20 }).rampDepthM).toBe(4.5);
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
      result.airLandingTime,
      result.airLandingTime + (result.rollTime - path[135].t),
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

  it('continues through tangent-matched wall re-entry and returns to the bottom', () => {
    const result = halfpipe();
    const touchdown = physics.sampleHalfpipe(
      result,
      result.airLandingTime / result.motionDuration,
    );
    const reentryPeak = physics.sampleHalfpipe(
      result,
      result.reentryPeakTime / result.motionDuration,
    );
    const returned = physics.sampleHalfpipe(result, 1);

    expect(result.bottomTime).toBeCloseTo(
      result.transitionPath[Math.floor(result.transitionPath.length / 2)].t,
      10,
    );
    expect(result.reentryDuration).toBeCloseTo(result.rollTime - result.bottomTime, 10);
    expect(result.airLandingTime).toBeCloseTo(result.rollTime + result.airTime, 10);
    expect(result.motionDuration).toBeCloseTo(
      result.airLandingTime + result.reentryDuration,
      10,
    );
    expect(result.reentryPeakTime).toBeGreaterThanOrEqual(result.airLandingTime);
    expect(result.reentryPeakTime).toBeLessThanOrEqual(result.motionDuration);
    expect(result.reentryPeakNormalG).toBeCloseTo(result.peakNormalG, 7);

    expect(touchdown.phase).toBe('re-entering the wall');
    expect(touchdown.time).toBeCloseTo(result.airLandingTime, 10);
    expect(touchdown.x).toBeCloseTo(4, 9);
    expect(touchdown.y).toBeCloseTo(result.rampDepthM, 9);
    expect(touchdown.vx).toBeCloseTo(0, 8);
    expect(touchdown.vy).toBeCloseTo(-result.exitSpeed, 8);
    expect(touchdown.rotation).toBeCloseTo(result.landingRotationDeg, 10);
    expect(touchdown.trickRotation).toBeCloseTo(result.completed, 10);
    expect(touchdown.surfaceRotationDeg).toBeCloseTo(
      result.takeoffRotationDeg + result.reentryOrientationTurns * 360,
      10,
    );
    expect(touchdown.loadSquat).toBeGreaterThan(0.5);

    expect(reentryPeak.normalG).toBeCloseTo(result.reentryPeakNormalG, 7);
    expect(reentryPeak.loadSquat).toBeCloseTo(1, 7);
    expect(reentryPeak.x).toBeCloseTo(result.reentryPeakX, 7);
    expect(reentryPeak.y).toBeCloseTo(result.reentryPeakY, 7);

    expect(returned.phase).toBe('compressing on the return');
    expect(returned.time).toBeCloseTo(result.motionDuration, 10);
    expect(returned.x).toBeCloseTo(0, 8);
    expect(returned.y).toBeCloseTo(0, 8);
    expect(returned.vx).toBeCloseTo(-result.bottomSpeed, 7);
    expect(returned.vy).toBeCloseTo(0, 7);
    expect(returned.normalG).toBeCloseTo(result.bottomNormalG, 7);
    expect(returned.loadSquat).toBeGreaterThan(0);
    expect(returned.keJ + returned.peJ).toBeCloseTo(result.runMechanicalJ, 5);
  });

  it('keeps board attitude continuous through contact, flight, and re-entry alignment', () => {
    const result = halfpipe();
    const epsilon = 1e-7;
    const start = physics.sampleHalfpipe(result, 0);
    const bottom = physics.sampleHalfpipe(result, result.bottomTime / result.motionDuration);
    const beforeLip = physics.sampleHalfpipe(
      result,
      (result.rollTime - epsilon) / result.motionDuration,
    );
    const liftoff = physics.sampleHalfpipe(result, result.rollTime / result.motionDuration);
    const beforeTouchdown = physics.sampleHalfpipe(
      result,
      (result.airLandingTime - epsilon) / result.motionDuration,
    );
    const touchdown = physics.sampleHalfpipe(
      result,
      result.airLandingTime / result.motionDuration,
    );
    const aligned = physics.sampleHalfpipe(
      result,
      (result.airLandingTime + result.reentryAlignmentDuration) / result.motionDuration,
    );
    const returned = physics.sampleHalfpipe(result, 1);

    expect(start.rotation).toBeCloseTo(90, 8);
    expect(start.surfaceRotationDeg).toBeCloseTo(start.rotation, 10);
    expect(start.alignmentProgress).toBe(1);
    expect(bottom.rotation).toBeCloseTo(0, 8);
    expect(bottom.surfaceRotationDeg).toBeCloseTo(0, 8);
    expect(Math.abs(beforeLip.rotation - result.takeoffRotationDeg)).toBeLessThan(0.001);
    expect(liftoff.rotation).toBeCloseTo(result.takeoffRotationDeg, 10);
    expect(liftoff.trickRotation).toBeCloseTo(0, 10);
    expect(liftoff.surfaceRotationDeg).toBeNull();
    expect(beforeTouchdown.rotation).toBeCloseTo(result.landingRotationDeg, 4);
    expect(touchdown.rotation).toBeCloseTo(result.landingRotationDeg, 10);
    expect(touchdown.alignmentProgress).toBeCloseTo(0, 10);
    expect(touchdown.alignmentErrorDeg).toBeCloseTo(
      Math.abs(touchdown.surfaceRotationDeg - result.landingRotationDeg),
      10,
    );
    expect(aligned.alignmentProgress).toBeCloseTo(1, 8);
    expect(aligned.rotation).toBeCloseTo(aligned.surfaceRotationDeg, 8);
    expect(aligned.alignmentErrorDeg).toBeCloseTo(0, 8);
    expect(returned.rotation).toBeCloseTo(returned.surfaceRotationDeg, 8);
    expect(returned.surfaceRotationDeg).toBeCloseTo(
      result.reentryOrientationTurns * 360,
      8,
    );
    expect(returned.trickRotation).toBeCloseTo(result.completed, 10);
  });

  it('uses the velocity slope as nose-up pitch in both gap views', () => {
    const result = gap({ angleDeg: 35 });
    const launch = physics.sampleGapJump(
      result,
      result.approachTime / result.motionDuration,
    );
    const falling = physics.sampleGapJump(
      result,
      (result.approachTime + result.airTime * 0.8) / result.motionDuration,
    );

    expect(launch.vy).toBeGreaterThan(0);
    expect(launch.rotation).toBeLessThan(0);
    expect(falling.vy).toBeLessThan(0);
    expect(falling.rotation).toBeGreaterThan(0);
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

  it('closes moving-air work minus air-relative dissipation for every wind direction', () => {
    const ideal = gap({ airDrag: false, windId: 'tail_strong' });
    const idealCalm = gap({ airDrag: false, windId: 'calm' });

    expect(ideal.rangeM).toBeCloseTo(ideal.rangeIdealM, 2);
    expect(ideal.rangeM).toBeCloseTo(idealCalm.rangeM, 10);
    expect(ideal.aerodynamicBodyWorkJ).toBe(0);
    expect(ideal.aerodynamicNetWorkJ).toBe(0);
    expect(ideal.aerodynamicDissipationJ).toBe(0);
    expect(ideal.windWorkJ).toBe(0);
    expect(ideal.thermalJ).toBe(0);
    expect(ideal.flightMechanicalEnergyJ).toBeCloseTo(ideal.energyInputJ, 10);
    expectAerodynamicEnergyClosure(ideal, 10);

    for (const windId of [
      'calm',
      'head_strong',
      'tail_strong',
      'cross_left',
      'cross_right',
    ]) {
      const result = gap({ airDrag: true, windId });

      expect(result.aerodynamicDissipationJ).toBeGreaterThan(0);
      expect(result.thermalJ).toBeCloseTo(result.aerodynamicDissipationJ, 10);
      expectAerodynamicEnergyClosure(result);
    }

    const calmDrag = gap({ airDrag: true, windId: 'calm' });
    expect(calmDrag.rangeM).toBeLessThan(idealCalm.rangeM);
    expect(calmDrag.windWorkJ).toBeCloseTo(0, 10);
    expect(calmDrag.aerodynamicNetWorkJ).toBeLessThan(0);
  });

  it('allows a strong tailwind to add more energy than the wake dissipates', () => {
    const result = gap({
      speedMph: 8,
      angleDeg: 35,
      gapFt: 2,
      windId: 'tail_strong',
      airDrag: true,
    });
    const contactEnd = physics.sampleGapJump(result, 1);

    expect(result.windWorkJ).toBeGreaterThan(result.aerodynamicDissipationJ);
    expect(result.aerodynamicNetWorkJ).toBeGreaterThan(0);
    expect(result.flightMechanicalEnergyJ).toBeGreaterThan(result.energyInputJ);
    expect(result.hasLandingContact).toBe(true);
    expect(contactEnd.currentMechanicalEnergyJ).toBeLessThan(0);
    expect(contactEnd.peJ).toBeLessThan(0);
    expect(contactEnd.currentMechanicalEnergyJ).toBeCloseTo(
      contactEnd.keJ + contactEnd.peJ,
      8,
    );
    expectAerodynamicEnergyClosure(result);
  });

  it('uses signed deck-relative potential below the platform', () => {
    const result = gap({
      speedMph: 17,
      angleDeg: 10,
      gapFt: 8,
      windId: 'head_strong',
      airDrag: true,
    });
    const finalSample = physics.sampleGapJump(result, 1);

    expect(result.hasLandingContact).toBe(false);
    expect(result.terminationPoint.y).toBeLessThan(0);
    expect(result.flightPotentialEnergyJ).toBeLessThan(0);
    expect(result.flightPotentialEnergyJ).toBeCloseTo(
      result.massKg * result.gravity * result.terminationPoint.y,
      10,
    );
    expect(finalSample.peJ).toBeCloseTo(result.flightPotentialEnergyJ, 10);
    expect(finalSample.currentMechanicalEnergyJ).toBeCloseTo(
      finalSample.keJ + finalSample.peJ,
      8,
    );
    expectAerodynamicEnergyClosure(result);
  });

  it('samples cumulative aerodynamic energy monotonically and freezes it on contact', () => {
    const result = gap({ windId: 'cross_right', airDrag: true });
    const indexes = [
      0,
      Math.floor(result.flightPath.length * 0.2),
      Math.floor(result.flightPath.length * 0.4),
      Math.floor(result.flightPath.length * 0.6),
      Math.floor(result.flightPath.length * 0.8),
      result.flightPath.length - 1,
    ];
    let previousDissipationJ = -1e-10;

    for (const index of indexes) {
      const pathPoint = result.flightPath[index];
      const sample = physics.sampleGapJump(
        result,
        (result.approachTime + pathPoint.t) / result.motionDuration,
      );

      expect(sample.aerodynamicDissipationJ).toBeGreaterThanOrEqual(
        previousDissipationJ - 1e-8,
      );
      expect(sample.aerodynamicNetWorkJ).toBeCloseTo(
        sample.windWorkJ - sample.aerodynamicDissipationJ,
        10,
      );
      expect(sample.currentMechanicalEnergyJ).toBeCloseTo(
        result.energyInputJ + sample.windWorkJ -
          sample.aerodynamicDissipationJ -
          sample.landingSupportWorkAbsorbedSoFarJ,
        10,
      );
      expect(sample.energyClosureResidualJ).toBeCloseTo(0, 7);
      previousDissipationJ = sample.aerodynamicDissipationJ;
    }

    expect(result.hasLandingContact).toBe(true);
    const touchdown = contactSample(result, 0);
    for (const fraction of [0.2, 0.5, 0.8, 1]) {
      const sample = contactSample(result, fraction);

      expect(sample.aerodynamicDissipationJ)
        .toBeCloseTo(touchdown.aerodynamicDissipationJ, 10);
      expect(sample.windWorkJ).toBeCloseTo(touchdown.windWorkJ, 10);
      expect(sample.aerodynamicNetWorkJ)
        .toBeCloseTo(touchdown.aerodynamicNetWorkJ, 10);
      expect(sample.currentMechanicalEnergyJ).toBeCloseTo(
        sample.keJ + sample.peJ,
        7,
      );
    }
  });

  it('reports an actual air-force vector opposite relative-air velocity', () => {
    const result = gap({ windId: 'cross_right', airDrag: true });
    const flightPoint = result.flightPath[
      Math.max(1, Math.floor(result.flightPath.length * 0.35))
    ];
    const sample = physics.sampleGapJump(
      result,
      (result.approachTime + flightPoint.t) / result.motionDuration,
    );
    const relativeAirX = sample.vx - result.wind.xMps;
    const relativeAirY = sample.vy;
    const relativeAirZ = sample.vz - result.wind.zMps;
    const forceDotRelativeAir =
      sample.airForceX * relativeAirX +
      sample.airForceY * relativeAirY +
      sample.airForceZ * relativeAirZ;
    const idealResult = gap({ windId: 'cross_right', airDrag: false });
    const idealSample = physics.sampleGapJump(
      idealResult,
      (idealResult.approachTime + idealResult.peakTime * 0.5) /
        idealResult.motionDuration,
    );

    expect(sample.phase).toBe('rising');
    expect(sample.relativeAirSpeedMps).toBeGreaterThan(0);
    expect(sample.airForceMagnitudeN).toBeGreaterThan(0);
    expect(forceDotRelativeAir).toBeLessThan(0);
    expect(idealSample.airForceMagnitudeN).toBe(0);
    expect(idealSample.airForceX).toBeCloseTo(0, 10);
    expect(idealSample.airForceY).toBeCloseTo(0, 10);
    expect(idealSample.airForceZ).toBeCloseTo(0, 10);
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

  it('models landing load, stopping time, impulse, and vertical energy absorption', () => {
    const result = gap({ airDrag: false });
    const shallow = gap({ airDrag: false, angleDeg: 25 });
    const steep = gap({ airDrag: false, angleDeg: 55 });
    const verticalSpeed = Math.abs(result.landingVelocity.y);
    const expectedLoad = 1 + verticalSpeed ** 2
      / (2 * result.gravity * result.landingCompressionM);
    const expectedStopTime = 2 * result.landingCompressionM / verticalSpeed;
    const expectedNetImpulse = result.massKg * verticalSpeed;
    const expectedAbsorbedEnergy = 0.5 * result.massKg * verticalSpeed ** 2;
    const expectedGravityWork = result.massKg * result.gravity *
      result.landingCompressionM;
    const expectedSupportWork = expectedAbsorbedEnergy + expectedGravityWork;
    const expectedPeakLoad = 1 + (Math.PI / 2) * (expectedLoad - 1);
    const expectedAverageForce = result.massKg * result.gravity * expectedLoad;
    const expectedPeakForce = result.massKg * result.gravity * expectedPeakLoad;
    const expectedContactImpulse = expectedAverageForce * expectedStopTime;
    const impactProgress = (
      result.approachTime + result.airTime + result.landingStopTimeS * 0.5
    ) / result.motionDuration;
    const impactSample = physics.sampleGapJump(result, impactProgress);
    const contactEndSample = physics.sampleGapJump(result, 1);
    let integratedDeltaV = 0;
    const pulseSlices = 2000;
    for (let pulseIndex = 0; pulseIndex < pulseSlices; pulseIndex += 1) {
      const contactTime = result.approachTime + result.airTime +
        result.landingStopTimeS * (pulseIndex + 0.5) / pulseSlices;
      const contactSample = physics.sampleGapJump(result, contactTime / result.motionDuration);
      integratedDeltaV += (contactSample.normalG - 1) * result.gravity *
        result.landingStopTimeS / pulseSlices;
    }
    const shortStop = gap({ airDrag: false, landingCompressionM: 0.15 });
    const longStop = gap({ airDrag: false, landingCompressionM: 0.8 });

    expect(physics.constants.landingCompressionM).toBeCloseTo(0.45, 10);
    expect(result.landingCompressionM).toBeCloseTo(0.45, 10);
    expect(result.landingVerticalSpeedMps).toBeCloseTo(verticalSpeed, 10);
    expect(result.landingImpactG).toBeCloseTo(expectedLoad, 10);
    expect(result.landingAverageG).toBeCloseTo(expectedLoad, 10);
    expect(result.landingPeakG).toBeCloseTo(expectedPeakLoad, 10);
    expect(result.landingStopTimeS).toBeCloseTo(expectedStopTime, 10);
    expect(result.landingNetImpulseNs).toBeCloseTo(expectedNetImpulse, 10);
    expect(result.landingAbsorbedEnergyJ).toBeCloseTo(expectedAbsorbedEnergy, 10);
    expect(result.landingVerticalKineticRemovedJ).toBeCloseTo(expectedAbsorbedEnergy, 10);
    expect(result.landingGravityWorkJ).toBeCloseTo(expectedGravityWork, 10);
    expect(result.landingSupportWorkAbsorbedJ).toBeCloseTo(expectedSupportWork, 10);
    expect(result.landingAverageForceN).toBeCloseTo(expectedAverageForce, 10);
    expect(result.landingPeakForceN).toBeCloseTo(expectedPeakForce, 10);
    expect(result.landingContactImpulseNs).toBeCloseTo(expectedContactImpulse, 10);
    expect(integratedDeltaV).toBeCloseTo(verticalSpeed, 5);
    expect(result.landingImpactG).toBeGreaterThan(1);
    expect(result.settleTime).toBeCloseTo(result.landingStopTimeS, 10);
    expect(result.rolloutDistanceM).toBe(0);
    expect(result.contactTravelM).toBeCloseTo(
      result.postContactVelocityMps * result.landingStopTimeS,
      10,
    );
    expect(result.motionDuration).toBeCloseTo(
      result.approachTime + result.airTime + result.settleTime,
      10,
    );
    expect(impactSample.phase).toBe('absorbing the landing');
    expect(impactSample.normalG).toBeCloseTo(result.landingPeakG, 10);
    expect(impactSample.supportForceN).toBeCloseTo(result.landingPeakForceN, 8);
    expect(impactSample.landingPulse).toBeCloseTo(1, 10);
    expect(impactSample.landingCompressionUsedM).toBeCloseTo(
      result.landingCompressionM * (0.5 + 1 / Math.PI),
      8,
    );
    expect(impactSample.comCompressionM).toBeCloseTo(
      impactSample.landingCompressionUsedM,
      10,
    );
    expect(impactSample.comCompressionRatio).toBeCloseTo(
      0.5 + 1 / Math.PI,
      8,
    );
    expect(impactSample.landingSquat).toBeCloseTo(
      impactSample.comCompressionRatio,
      10,
    );
    expect(impactSample.boardY).toBeCloseTo(0, 10);
    expect(impactSample.boardRotationDeg).toBeCloseTo(0, 10);
    expect(impactSample.rotation).toBeCloseTo(0, 10);
    expect(Math.abs(impactSample.vy)).toBeCloseTo(verticalSpeed * 0.5, 8);
    expect(impactSample.comVerticalVelocityMps).toBeCloseTo(impactSample.vy, 10);
    expect(impactSample.landingNetImpulseDeliveredNs).toBeCloseTo(
      expectedNetImpulse * 0.5,
      8,
    );
    expect(impactSample.landingSupportImpulseDeliveredNs).toBeCloseTo(
      expectedNetImpulse * 0.5 +
        result.massKg * result.gravity * result.landingStopTimeS * 0.5,
      8,
    );
    expect(impactSample.landingVerticalKineticRemainingJ).toBeCloseTo(
      expectedAbsorbedEnergy * 0.25,
      8,
    );
    expect(impactSample.landingVerticalKineticRemovedJ).toBeCloseTo(
      expectedAbsorbedEnergy * 0.75,
      8,
    );
    expect(impactSample.landingGravityWorkSoFarJ).toBeCloseTo(
      result.massKg * result.gravity * impactSample.comCompressionM,
      8,
    );
    expect(impactSample.landingSupportWorkAbsorbedSoFarJ).toBeCloseTo(
      impactSample.landingVerticalKineticRemovedJ +
        impactSample.landingGravityWorkSoFarJ,
      8,
    );
    expect(impactSample.thermalJ).toBeGreaterThan(result.thermalJ);
    expect(contactEndSample.phase).toBe('contact pulse complete');
    expect(contactEndSample.normalG).toBeCloseTo(1, 10);
    expect(contactEndSample.vy).toBeCloseTo(0, 10);
    expect(contactEndSample.comCompressionM).toBeCloseTo(result.landingCompressionM, 10);
    expect(contactEndSample.comCompressionRatio).toBeCloseTo(1, 10);
    expect(contactEndSample.landingSquat).toBeCloseTo(1, 10);
    expect(contactEndSample.landingNetImpulseDeliveredNs).toBeCloseTo(
      result.landingNetImpulseNs,
      10,
    );
    expect(contactEndSample.landingSupportImpulseDeliveredNs).toBeCloseTo(
      result.landingContactImpulseNs,
      10,
    );
    expect(contactEndSample.landingVerticalKineticRemainingJ).toBeCloseTo(0, 10);
    expect(contactEndSample.landingVerticalKineticRemovedJ).toBeCloseTo(
      result.landingVerticalKineticRemovedJ,
      10,
    );
    expect(contactEndSample.landingSupportWorkAbsorbedSoFarJ).toBeCloseTo(
      result.landingSupportWorkAbsorbedJ,
      10,
    );
    expect(contactEndSample.vx).toBeCloseTo(result.postContactVelocityXMps, 10);
    expect(contactEndSample.x).toBeCloseTo(result.contactEndM, 8);
    expect(contactEndSample.thermalJ).toBeCloseTo(
      result.aerodynamicDissipationJ + result.landingSupportWorkAbsorbedJ,
      8,
    );
    expect(steep.landingImpactG).toBeGreaterThan(shallow.landingImpactG);
    expect(shortStop.rangeM).toBeCloseTo(longStop.rangeM, 10);
    expect(shortStop.landingVelocity.y).toBeCloseTo(longStop.landingVelocity.y, 10);
    expect(shortStop.landingStopTimeS).toBeLessThan(longStop.landingStopTimeS);
    expect(shortStop.landingNetImpulseNs).toBeCloseTo(longStop.landingNetImpulseNs, 10);
    expect(shortStop.landingAbsorbedEnergyJ).toBeCloseTo(longStop.landingAbsorbedEnergyJ, 10);
    expect(shortStop.landingAverageForceN).toBeGreaterThan(longStop.landingAverageForceN);
    expect(shortStop.landingPeakForceN).toBeGreaterThan(longStop.landingPeakForceN);
    expect(shortStop.landingImpactG).toBeGreaterThan(longStop.landingImpactG);
    expect(shortStop.landingPeakG).toBeGreaterThan(longStop.landingPeakG);
    expect(shortStop.landingContactImpulseNs).toBeLessThan(longStop.landingContactImpulseNs);
    expect(gap({ landingCompressionM: 0 }).landingCompressionM).toBe(0.1);
    expect(gap({ landingCompressionM: 2 }).landingCompressionM).toBe(0.9);
  });

  it('keeps contact position, COM kinematics, force, impulse, and work mutually consistent', () => {
    const result = gap({ airDrag: false });
    const start = contactSample(result, 0);
    const end = contactSample(result, 1);
    const fraction = 0.37;
    const epsilon = 0.0001;
    const before = contactSample(result, fraction - epsilon);
    const middle = contactSample(result, fraction);
    const after = contactSample(result, fraction + epsilon);
    const deltaTime = 2 * epsilon * result.landingStopTimeS;
    const compressionRate = (after.comCompressionM - before.comCompressionM) /
      deltaTime;
    const netImpulseRate = (
      after.landingNetImpulseDeliveredNs -
      before.landingNetImpulseDeliveredNs
    ) / deltaTime;

    expect(start.phase).toBe('platform contact');
    expect(start.comCompressionM).toBeCloseTo(0, 10);
    expect(start.landingNetImpulseDeliveredNs).toBeCloseTo(0, 10);
    expect(start.landingVerticalKineticRemainingJ).toBeCloseTo(
      result.landingAbsorbedEnergyJ,
      8,
    );
    expect(end.boardY).toBeCloseTo(0, 10);
    expect(end.comCompressionM).toBeCloseTo(result.landingCompressionM, 10);
    expect(end.comVerticalVelocityMps).toBeCloseTo(0, 10);
    expect(compressionRate).toBeCloseTo(
      Math.abs(middle.comVerticalVelocityMps),
      5,
    );
    expect(netImpulseRate).toBeCloseTo(
      middle.supportForceN - result.massKg * result.gravity,
      3,
    );

    let previous = contactSample(result, 0);
    for (let step = 1; step <= 40; step += 1) {
      const current = contactSample(result, step / 40);
      expect(current.boardY).toBeCloseTo(0, 10);
      expect(current.comCompressionM).toBeGreaterThanOrEqual(
        previous.comCompressionM - 1e-10,
      );
      expect(current.landingNetImpulseDeliveredNs).toBeGreaterThanOrEqual(
        previous.landingNetImpulseDeliveredNs - 1e-8,
      );
      expect(current.landingVerticalKineticRemovedJ).toBeGreaterThanOrEqual(
        previous.landingVerticalKineticRemovedJ - 1e-8,
      );
      expect(current.landingSupportWorkAbsorbedSoFarJ).toBeGreaterThanOrEqual(
        previous.landingSupportWorkAbsorbedSoFarJ - 1e-8,
      );
      previous = current;
    }
  });

  it('explains the board and rider COM as separate landing states', () => {
    const result = gap({ airDrag: false });
    const contact = contactSample(result, 0);
    const absorbing = contactSample(result, 0.5);
    const complete = contactSample(result, 1);

    expect(physics.phaseLearningText(result, contact))
      .toContain('board is supported at deck height');
    expect(physics.phaseLearningText(result, contact))
      .toContain('center of mass still moves downward');
    expect(physics.phaseLearningText(result, absorbing))
      .toContain('board stays on the deck');
    expect(physics.phaseLearningText(result, absorbing))
      .toContain('center of mass has moved');
    expect(physics.phaseLearningText(result, absorbing))
      .toContain('g support load');
    expect(physics.phaseLearningText(result, complete))
      .toContain('COM compression has reached');
    expect(physics.phaseLearningText(result, complete))
      .toContain('vertical speed is zero');
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
    const impactProgress = (
      sim.approachTime + sim.airTime + sim.landingStopTimeS * 0.5
    ) / sim.motionDuration;
    const impact = physics.sampleGapJump(sim, impactProgress);
    const end = physics.sampleGapJump(sim, 1);

    expect(start.phase).toBe('approaching the ramp');
    expect(start.x).toBeLessThan(0);
    expect(Math.abs(apex.vy)).toBeLessThan(0.1);
    expect(apex.y).toBeCloseTo(sim.peakM, 2);
    expect(impact.phase).toBe('absorbing the landing');
    expect(impact.normalG).toBeCloseTo(sim.landingPeakG, 10);
    expect(end.phase).toBe('contact pulse complete');
    expect(end.time).toBeCloseTo(sim.motionDuration, 10);
    expect(end.x).toBeCloseTo(sim.contactEndM, 10);
    expect(end.x).toBeGreaterThan(sim.rangeM);
    expect(end.vx).toBeCloseTo(sim.postContactVelocityXMps, 10);
    expect(end.vz).toBeCloseTo(sim.postContactVelocityZMps, 10);
    expect(end.vz).toBeCloseTo(sim.landingVelocity.z, 10);
    expect(end.z).toBeCloseTo(sim.contactEndZ, 10);
    expect(sim.contactTravelZM).toBeCloseTo(
      sim.postContactVelocityZMps * sim.landingStopTimeS,
      10,
    );
    expect(sim.contactTravelM).toBeCloseTo(
      Math.hypot(sim.contactTravelXM, sim.contactTravelZM),
      10,
    );
    expect(Math.abs(end.z)).toBeGreaterThan(Math.abs(sim.crossDriftM));
    expect(end.vy).toBeCloseTo(0, 10);
  });
});
