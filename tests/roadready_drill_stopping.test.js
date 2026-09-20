import { beforeAll, it, expect } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let R;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  R = window.__RR_TEST_EXPORTS__.roadReady;
});

it.each([30, 25])('brakes to rest against held acceleration in the %s-acceleration drill', (acceleration) => {
  for (const direction of [-1, 1]) {
    let speed = direction * 5;
    for (let tick = 0; tick < 30; tick++) {
      const next = R.drivingDrillSpeed(speed, direction === 1, direction === -1, true, acceleration);
      expect(Math.abs(next)).toBeLessThanOrEqual(Math.abs(speed));
      expect(next * direction).toBeGreaterThanOrEqual(0);
      speed = next;
    }
    expect(speed).toBe(0);
    expect(R.drivingDrillSpeed(speed, direction === 1, direction === -1, true, acceleration)).toBe(0);
  }
});

it('stops before engaging the opposite direction and accepts a fresh forward request', () => {
  let speed = 5;
  for (let tick = 0; tick < 100 && speed !== 0; tick++) {
    speed = R.drivingDrillSpeed(speed, false, true, false, 30);
    expect(speed).toBeGreaterThanOrEqual(0);
  }
  expect(speed).toBe(0);
  expect(R.drivingDrillSpeed(speed, false, true, false, 30)).toBeLessThan(0);
  expect(R.drivingDrillSpeed(speed, true, false, false, 30)).toBeGreaterThan(0);
});

it('lets released pedals settle at zero without creeping or conflicting acceleration', () => {
  expect(R.drivingDrillSpeed(0.05, false, false, false, 25)).toBe(0);
  expect(R.drivingDrillSpeed(0, true, true, false, 25)).toBe(0);
});

const stopped = { x: 300, y: 431, heading: -Math.PI / 2, speed: 0 };
it.each([
  [{ speed: -4 }, 'complete stop'],
  [{ speed: 2 }, 'complete stop'],
  [{ x: 280 }, 'whole car'],
  [{ heading: -Math.PI / 2 + 0.12 }, 'Straighten'],
  [{ heading: Math.PI / 2 }, 'Straighten'],
  [{ y: 451 }, 'Past the target'],
])('rejects incomplete backing poses %j with an actionable cue', (change, cue) => {
  const result = R.backingDrillFinishCheck({ ...stopped, ...change }, 430, 275, 325);
  expect(result.ready).toBe(false); expect(result.message).toContain(cue);
});

it('accepts a stopped aligned car in the target and does not finish early', () => {
  expect(R.backingDrillFinishCheck(stopped, 430, 275, 325).ready).toBe(true);
  expect(R.backingDrillFinishCheck({ ...stopped, y: 429 }, 430, 275, 325).ready).toBe(false);
});
