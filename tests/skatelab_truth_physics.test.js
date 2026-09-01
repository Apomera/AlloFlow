import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let physics;

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_skatelab.js', 'skatelab');
  physics = window.__alloSkatePhysicsPure;
});

function halfpipe(overrides = {}) {
  return physics.simHalfpipe({
    pumps: 3,
    vehicle: 'skate',
    gravity: 9.81,
    surfaceId: 'standard',
    rotationTarget: 360,
    spinRate: 260,
    riderMassKg: 62,
    rampDepthM: 2.4,
    bodyPositionId: 'neutral',
    ...overrides,
  });
}

function gap(overrides = {}) {
  return physics.simGapJump({
    speedMph: 17,
    angleDeg: 35,
    gapFt: 15,
    riderMassKg: 62,
    landingCompressionM: 0.45,
    vehicle: 'skate',
    gravity: 9.81,
    windId: 'calm',
    airDrag: true,
    ...overrides,
  });
}

describe('Skate Lab truthful contact outcomes', () => {
  it('separates the requested trick from physical wall alignment', () => {
    const baseline = halfpipe();
    const timing = halfpipe({ spinRate: 0 });
    const invertedTarget = halfpipe({
      rotationTarget: 180,
      spinRate: 180 / timing.airTime,
    });
    const safeTargetMiss = halfpipe({
      rotationTarget: 360,
      spinRate: 0,
    });

    expect(baseline.trickGoalMet).toBe(true);
    expect(baseline.contactSafe).toBe(true);
    expect(baseline.runSuccessful).toBe(true);
    expect(baseline.outcome).toBe('landed');

    expect(invertedTarget.completed).toBeCloseTo(180, 8);
    expect(invertedTarget.trickGoalMet).toBe(true);
    expect(invertedTarget.contactAlignmentErrorDeg).toBeCloseTo(180, 8);
    expect(invertedTarget.contactSafe).toBe(false);
    expect(invertedTarget.reentryModeled).toBe(false);
    expect(invertedTarget.runSuccessful).toBe(false);
    expect(invertedTarget.outcome).toBe('unsafe-contact');

    const stopped = physics.sampleHalfpipe(invertedTarget, 1);
    expect(stopped.phase).toContain('unsafe contact');
    expect(stopped.hasSurfaceContact).toBe(true);
    expect(stopped.hasSupport).toBe(false);
    expect(stopped.normalG).toBe(0);
    expect(stopped.vy).toBeCloseTo(-invertedTarget.exitSpeed, 8);
    expect(stopped.rotation).toBeCloseTo(invertedTarget.landingRotationDeg, 8);

    expect(safeTargetMiss.trickGoalMet).toBe(false);
    expect(safeTargetMiss.contactSafe).toBe(true);
    expect(safeTargetMiss.landed).toBe(true);
    expect(safeTargetMiss.runSuccessful).toBe(false);
    expect(safeTargetMiss.outcome).toBe('trick-missed');
    expect(physics.sampleHalfpipe(safeTargetMiss, 1).hasSupport).toBe(true);
  });

  it('resolves long valid flights by terrain contact instead of a 12-second cutoff', () => {
    const result = gap({
      speedMph: 32,
      angleDeg: 70,
      gapFt: 30,
      gravity: 1.62,
      windId: 'calm',
      airDrag: false,
    });

    expect(result.airTime).toBeGreaterThan(12);
    expect(result.solverResolved).toBe(true);
    expect(result.solverLimited).toBe(false);
    expect(result.terminationReason).toBe('platform-top');
    expect(result.hasLandingContact).toBe(true);
    expect(result.terminationPoint.y).toBeCloseTo(0, 10);
    expect(result.outcome).toBe('overshot');
    expect(result.landingImpactG).toBeGreaterThan(1);
  });

  it('continues a short jump below deck height without inventing support or load', () => {
    const result = gap({
      speedMph: 8,
      angleDeg: 10,
      gapFt: 30,
      gravity: 9.81,
      windId: 'calm',
      airDrag: false,
    });
    const terminal = physics.sampleGapJump(result, 1);

    expect(result.rangeResolved).toBe(true);
    expect(result.clearance).toBeLessThan(0);
    expect(result.outcome).toBe('fell-short');
    expect(result.hasTerrainContact).toBe(false);
    expect(result.hasLandingContact).toBe(false);
    expect(result.landed).toBe(false);
    expect(result.landingImpactG).toBe(0);
    expect(result.landingPeakG).toBe(0);
    expect(result.landingAverageForceN).toBe(0);
    expect(result.rolloutDistanceM).toBe(0);
    expect(result.terminationPoint.y).toBeLessThan(0);
    expect(terminal.y).toBeLessThan(0);
    expect(terminal.boardY).toBeCloseTo(terminal.y, 10);
    expect(terminal.vy).toBeLessThan(0);
    expect(terminal.comCompressionM).toBe(0);
    expect(terminal.supportForceN).toBe(0);
    expect(terminal.landingNetImpulseDeliveredNs).toBe(0);
    expect(terminal.landingSupportImpulseDeliveredNs).toBe(0);
    expect(terminal.landingVerticalKineticRemovedJ).toBe(0);
    expect(terminal.landingSupportWorkAbsorbedSoFarJ).toBe(0);
    expect(terminal.normalG).toBe(0);
    expect(terminal.hasSupport).toBe(false);
    expect(terminal.phase).toContain('fell short');
  });

  it('records an unsupported platform-face impact without inventing support or load', () => {
    const result = gap({
      speedMph: 17,
      angleDeg: 10,
      gapFt: 8,
      gravity: 9.81,
      windId: 'calm',
      airDrag: false,
    });
    const terminal = physics.sampleGapJump(result, 1);

    expect(result.terminationReason).toBe('platform-face');
    expect(result.outcome).toBe('platform-face');
    expect(result.hasTerrainContact).toBe(true);
    expect(result.hasLandingContact).toBe(false);
    expect(result.contactPoint).toEqual(result.terminationPoint);
    expect(result.landingContactPoint).toBeNull();
    expect(result.landingImpactG).toBe(0);
    expect(result.contactTravelM).toBe(0);
    expect(terminal.phase).toContain('platform face');
    expect(terminal.boardY).toBeCloseTo(result.terminationPoint.y, 10);
    expect(terminal.comCompressionM).toBe(0);
    expect(terminal.supportForceN).toBe(0);
    expect(terminal.landingNetImpulseDeliveredNs).toBe(0);
    expect(terminal.landingSupportImpulseDeliveredNs).toBe(0);
    expect(terminal.landingVerticalKineticRemovedJ).toBe(0);
    expect(terminal.landingSupportWorkAbsorbedSoFarJ).toBe(0);
    expect(terminal.hasSurfaceContact).toBe(true);
    expect(terminal.hasSupport).toBe(false);
    expect(terminal.normalG).toBe(0);
  });

  it('records the first deck crossing even for a sub-frame flight', () => {
    const result = gap({
      speedMph: 1,
      angleDeg: 1,
      gapFt: 80,
      gravity: 25,
      windId: 'calm',
      airDrag: false,
    });

    expect(result.rangeResolved).toBe(true);
    expect(result.groundPlaneCrossing).not.toBeNull();
    expect(result.groundPlaneCrossing.t).toBeLessThan(1 / 180);
    expect(result.distanceOutcome).toBe('short');
    expect(result.rangeM).toBeGreaterThan(0);
  });

  it('terminates every exposed solver extreme at a finite declared event', () => {
    const cases = [
      { speedMph: 1, angleDeg: 1, gravity: 25, windId: 'head_strong', airDrag: true },
      { speedMph: 60, angleDeg: 85, gravity: 0.5, windId: 'tail_strong', airDrag: true },
      { speedMph: 60, angleDeg: 85, gravity: 0.5, windId: 'calm', airDrag: false },
      { speedMph: 8, angleDeg: 70, gravity: 1.62, windId: 'cross_right', airDrag: true },
    ];

    for (const setup of cases) {
      const result = gap({ gapFt: 80, ...setup });
      expect(result.solverResolved).toBe(true);
      expect(result.solverLimited).toBe(false);
      expect(['platform-top', 'platform-face', 'fall-boundary'])
        .toContain(result.terminationReason);
      for (const value of [
        result.terminationPoint.t,
        result.terminationPoint.x,
        result.terminationPoint.y,
        result.terminationPoint.z,
        result.terminationPoint.vx,
        result.terminationPoint.vy,
        result.terminationPoint.vz,
      ]) {
        expect(Number.isFinite(value)).toBe(true);
      }
      if (result.hasLandingContact) {
        expect(result.terminationPoint.y).toBeCloseTo(0, 8);
      } else {
        expect(result.terminationPoint.y).toBeLessThan(0);
        expect(result.landingImpactG).toBe(0);
      }
    }
  });
});
