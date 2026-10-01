import { beforeAll, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let R;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_roadready.js', 'roadReady'); R = window.__RR_TEST_EXPORTS__.roadReady; });
const car = () => ({ x: 200, y: 150, heading: -Math.PI / 2, speed: 0, steering: 0, driveGear: 'D' });
it('shows reverse lamps at rest and during very slow reversing, and extinguishes them in Drive', () => {
  const c = car();
  R.parkingControllerKeys(c, {}, { reverse: 1 });
  expect(R.parkingLampState(c)).toEqual({ reverse: true, brake: false });
  R.parkingDrillMotion(c, { _gpThrottle: 0.01 }, 1 / 60);
  expect(c.speed).toBeGreaterThan(-0.5);
  expect(R.parkingLampState(c).reverse).toBe(true);
  c.speed = 0; R.parkingControllerKeys(c, {}, { drive: 1 });
  expect(R.parkingLampState(c).reverse).toBe(false);
});
it('keeps the original reverse indication until an assisted direction change actually stops', () => {
  const c = { ...car(), driveGear: 'R', speed: -5 };
  R.parkingDrillMotion(c, { w: true }, 1 / 60);
  expect(R.parkingLampState(c)).toEqual({ reverse: true, brake: true });
  while (c.speed < 0) R.parkingDrillMotion(c, { w: true }, 1 / 60);
  R.parkingDrillMotion(c, { w: true }, 1 / 60);
  expect(R.parkingLampState(c).reverse).toBe(false);
});
it('distinguishes holding the brake from braking in motion and from a secured car', () => {
  for (const keys of [{ ' ': true }, { _gpBrake: 0.4 }]) {
    const c = { ...car(), driveGear: 'R' };
    R.parkingDrillMotion(c, keys, 1 / 60);
    expect(R.parkingPracticeMetrics(c, R.PARKING_SCENARIOS.tightParallel).motionLabel).toBe('Brake held');
    expect(R.parkingLampState(c)).toEqual({ reverse: true, brake: true });
    c.speed = -4; R.parkingDrillMotion(c, keys, 1 / 60);
    expect(R.parkingPracticeMetrics(c, R.PARKING_SCENARIOS.tightParallel).motionLabel).toBe('Braking');
    c.parkingBrake = true; c.speed = 0;
    expect(R.parkingLampState(c)).toEqual({ reverse: false, brake: false });
    expect(R.parkingPracticeMetrics(c, R.PARKING_SCENARIOS.tightParallel).motionLabel).toBe('Park secured');
  }
});
