import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('roundabout pedestrian impact recovery keeps its authored crossing position', () => {
  it.each([30, 60, 144])('resumes smoothly from the separated position on every arm at %i Hz', hz => {
    for (let arm = 0; arm < 4; arm++) for (const side of [-1, 1]) {
      const crossing = RR.roundaboutCrosswalkPose(arm);
      const lateral = side * 1.75;
      const pedestrian = { _roundaboutArm: arm, _roundaboutLateral: lateral,
        _roundaboutCrossDirection: -side, crossing: true, kind: 'adult',
        x: crossing.x - lateral * Math.sin(crossing.angle),
        y: crossing.y + lateral * Math.cos(crossing.angle) };
      const car = { x: pedestrian.x, y: pedestrian.y, heading: crossing.angle + Math.PI, speed: 2 };
      RR.separatePedestrianAfterImpact(null, car, pedestrian, 1.4);
      const separated = { x: pedestrian.x, y: pedestrian.y };
      car.x = 95; car.y = 95;
      RR.updateRoundaboutPedestrian(pedestrian, 1 / hz, [], car, 'sedan');
      expect(Math.hypot(pedestrian.x - separated.x, pedestrian.y - separated.y), `arm ${arm}, side ${side}`)
        .toBeLessThanOrEqual(1.2 / hz + 1e-8);
      expect(pedestrian._roundaboutLateral).toBeCloseTo(
        -(pedestrian.x - 48) * Math.sin(crossing.angle) + (pedestrian.y - 48) * Math.cos(crossing.angle), 8);
      expect(pedestrian.crossing).toBe(true);
    }
  });

  it('keeps the separated pedestrian outside the stopped vehicle while its path is blocked', () => {
    const pedestrian = { x: 66, y: 46.25, _roundaboutArm: 1, _roundaboutLateral: -1.75,
      _roundaboutCrossDirection: 1, crossing: true, kind: 'adult' };
    const car = { x: 66, y: 46.25, heading: Math.PI, speed: 0 };
    RR.separatePedestrianAfterImpact(null, car, pedestrian, 1.4);
    for (let tick = 0; tick < 180; tick++) {
      RR.updateRoundaboutPedestrian(pedestrian, 1 / 60, [], car, 'sedan');
      expect(RR.pointOverlapsVehicle(car, RR.vehicleFootprint('sedan'), pedestrian, 0.28)).toBe(false);
    }
  });
});
