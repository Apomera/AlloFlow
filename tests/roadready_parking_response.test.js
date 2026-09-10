import { beforeAll, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let RR;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_roadready.js', 'roadReady'); RR = window.__RR_TEST_EXPORTS__.roadReady; });
const carAt = speed => ({ x: 200, y: 150, heading: -Math.PI / 2, speed, steering: 0 });
it('stops before reversing or moving forward again at different frame rates', () => {
  for (const fps of [30, 60, 120]) for (const direction of [-1, 1]) {
    const car = carAt(direction * 12);
    const keys = direction > 0 ? { s: true } : { w: true };
    let sawStop = false, changed = false;
    for (let i = 0; i < fps * 3; i++) {
      RR.parkingDrillMotion(car, keys, 1 / fps);
      if (car.speed === 0) sawStop = true;
      if (car.speed * direction < 0) { expect(sawStop).toBe(true); changed = true; break; }
    }
    expect(changed).toBe(true);
  }
});
it('gives the brake priority over either direction and stays stopped with opposing inputs', () => {
  for (const keys of [{ w: true, ' ': true }, { s: true, ' ': true }, { w: true, s: true }]) {
    const car = carAt(12);
    for (let i = 0; i < 180; i++) RR.parkingDrillMotion(car, keys, 1 / 60);
    expect(car.speed).toBe(0);
    expect(car.y).toBeLessThan(150);
  }
});
it('cannot move a secured car even when drive inputs remain held', () => {
  const car = { ...carAt(0), parkingBrake: true };
  for (let i = 0; i < 120; i++) RR.parkingDrillMotion(car, { w: true, d: true }, 1 / 60);
  expect(car.speed).toBe(0); expect(car.x).toBe(200); expect(car.y).toBe(150);
});
it('reports actual travel, steering and the assisted stopping state', () => {
  const scn = RR.PARKING_SCENARIOS.tightParallel, car = carAt(12);
  RR.parkingDrillMotion(car, { s: true, a: true }, 1 / 60);
  let readings = RR.parkingPracticeMetrics(car, scn);
  expect(readings.motionLabel).toBe('Stopping before reverse');
  expect(readings.steeringDegrees).toBeLessThan(0); expect(car.braking).toBe(true);
  for (let i = 0; i < 120; i++) RR.parkingDrillMotion(car, { s: true, d: true }, 1 / 60);
  readings = RR.parkingPracticeMetrics(car, scn);
  expect(readings.motionLabel).toBe('Reversing'); expect(readings.steeringDegrees).toBeGreaterThan(35);
  expect(car.braking).toBe(false);
});
