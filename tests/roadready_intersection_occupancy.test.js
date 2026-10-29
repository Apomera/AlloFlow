import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('Road Ready physical intersection occupancy', () => {
  function junction(heading = 0) {
    const world = {
      profile: RR.CONTINUOUS_SCENARIO_PROFILES.suburban,
      spline: {
        centerAt: y => 48 + Math.tan(heading) * (y - 50),
        headingAt: () => heading,
        heightAt: () => 0,
      },
    };
    const signal = { x: 48, y: 50, type: 'light' };
    const pose = RR.crossStreetPose(48, 50, heading, 6.5, 48);
    const actor = (longitudinal, lateral, facing, speed, type = 'sedan') => ({
      ...RR.crossStreetWorldPoint(pose, longitudinal, lateral),
      heading: facing - heading, speed, type,
    });
    const mainSelf = { ...actor(-1.5, -6.6, Math.PI / 2, 2), id: 'main' };
    const crossSelf = { ...actor(-6.6, 1.5, 0, 2), id: 'cross',
      crossStreet: true, _crossPose: pose, _crossDirection: 1 };
    return { world, signal, pose, actor, mainSelf, crossSelf };
  }

  it('yields to a stopped or creeping transverse player in the junction', () => {
    for (const heading of [0, 0.35, -0.35]) {
      const { world, signal, actor, mainSelf, crossSelf } = junction(heading);
      for (const speed of [0, 0.2, -0.2]) {
        expect(RR.leftTurnGapState([], mainSelf, signal,
          actor(0, 0, 0, speed), world).clear).toBe(false);
        expect(RR.opposingApproachClear(world, [], crossSelf, signal,
          actor(0, 0, Math.PI / 2, speed))).toBe(false);
      }
    }
  });

  it('checks the whole vehicle body even when its center is outside the junction', () => {
    const { world, signal, actor, mainSelf } = junction(0.3);
    const bus = actor(7, 0, 0, 0, 'schoolbus');
    expect(RR.leftTurnGapState([bus], mainSelf, signal, null, world).clear).toBe(false);
    const clearBus = actor(10, 0, 0, 0, 'schoolbus');
    expect(RR.leftTurnGapState([clearBus], mainSelf, signal, null, world).clear).toBe(true);
  });

  it('does not treat vehicles stopped safely behind either stop line as occupants', () => {
    for (const heading of [0, 0.35, -0.35]) {
      const { world, signal, actor, mainSelf, crossSelf } = junction(heading);
      for (const direction of [-1, 1]) {
        for (const type of ['sedan', 'schoolbus']) {
          const stop = RR.vehicleStopCenterCoordinate(0, direction, RR.vehicleFootprint(type).length);
          const stoppedMain = actor(-direction * 1.5, stop, direction * Math.PI / 2, 0, type);
          const stoppedCross = actor(stop, direction * 1.5, direction > 0 ? 0 : Math.PI, 0, type);
          expect(RR.leftTurnGapState([stoppedMain, stoppedCross], mainSelf, signal, null, world).clear).toBe(true);
          expect(RR.opposingApproachClear(world, [stoppedMain, stoppedCross], crossSelf, signal, null)).toBe(true);
        }
      }
    }
  });

  it('yields to reversing traffic approaching from the far side in either road frame', () => {
    for (const heading of [0, 0.35, -0.35]) {
      const { world, signal, actor, mainSelf, crossSelf } = junction(heading);
      const mainReverse = actor(-1.5, 16, Math.PI / 2, -8);
      const crossReverse = actor(16, 1.5, 0, -8);
      expect(RR.leftTurnGapState([], mainSelf, signal, mainReverse, world).clear).toBe(false);
      expect(RR.opposingApproachClear(world, [], crossSelf, signal, crossReverse)).toBe(false);
    }
  });

  it('leaves fully cleared and reverse-away traffic clear', () => {
    for (const heading of [0, 0.35, -0.35]) {
      const { world, signal, actor, mainSelf, crossSelf } = junction(heading);
      for (const harmless of [actor(1.5, -16, -Math.PI / 2, 8),
        actor(1.5, 16, -Math.PI / 2, -8), actor(-1.5, -16, Math.PI / 2, -8)]) {
        expect(RR.leftTurnGapState([], mainSelf, signal, harmless, world).clear).toBe(true);
      }
      for (const harmless of [actor(-16, -1.5, Math.PI, 8),
        actor(16, -1.5, Math.PI, -8), actor(-16, 1.5, 0, -8)]) {
        expect(RR.opposingApproachClear(world, [], crossSelf, signal, harmless)).toBe(true);
      }
    }
  });
});
