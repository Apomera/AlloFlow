import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, liveStep;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('          var netForce = longitudinalNetForce(');
  const end = source.indexOf('          // Weight transfer', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate the live longitudinal integration');
  liveStep = new Function('longitudinalNetForce', 'integrateDrivingMotion', 'thrust',
    'Fd', 'Fr', 'brakeForce', 'car', 'gradeForce', 'veh', 'dt', 'gear',
    'throttleInput', 'brakeInput', source.slice(start, end) + '\nreturn frameMotion;');
});

function step(speed, dt, { rolling = 100, braking = 0, grade = 0, drag = 0 } = {}) {
  return liveStep(RR.longitudinalNetForce, RR.integrateDrivingMotion, 0,
    drag, rolling, braking, { speed }, grade, { mass: 1000 }, dt, 'N', 0, braking ? 1 : 0);
}

describe('neutral rests under balanced static forces instead of oscillating', () => {
  it('can stop at zero without suppressing generic neutral reversals', () => {
    const held = RR.integrateDrivingMotion(0.005, -0.1, 0.1, 'N', 0, true);
    expect(held.speed).toBe(0);
    expect(held.distance).toBeCloseTo(0.000125, 12);
    expect(held.pathLength).toBeCloseTo(held.distance, 12);
    expect(RR.integrateDrivingMotion(1, -2, 1, 'N', 0)).toEqual({ speed: -1, distance: 0, pathLength: 0.5 });
  });

  it.each([30, 60, 144])('comes to rest from either direction at %i Hz', hz => {
    for (const direction of [1, -1]) {
      let speed = 0.005 * direction, distance = 0;
      for (let frame = 0; frame < hz; frame++) {
        const result = step(speed, 1 / hz);
        speed = result.speed;
        distance += result.distance;
      }
      expect(speed).toBe(0);
      expect(distance).toBeCloseTo(direction * 0.000125, 11);
      expect(step(speed, 0.1).distance).toBe(0);
    }
  });

  it('holds after braking stops the car on a grade below the available resistance', () => {
    const result = step(0.005, 0.1, { rolling: 20, braking: 100, grade: 50 });
    expect(result.speed).toBe(0);
    expect(result.distance).toBeGreaterThan(0);
    expect(step(result.speed, 0.1, { rolling: 20, braking: 100, grade: 50 }))
      .toEqual({ speed: 0, distance: 0, pathLength: 0 });
  });

  it('allows gravity to reverse neutral travel when static resistance cannot hold it', () => {
    const result = step(0.005, 0.1, { rolling: 100, grade: 200 });
    expect(result.speed).toBeLessThan(0);
    expect(result.pathLength).toBeGreaterThan(Math.abs(result.distance));
    expect(step(result.speed, 0.1, { rolling: 100, grade: 200 }).speed).toBeLessThan(result.speed);
  });

  it('does not count aerodynamic drag as a force capable of holding the car at rest', () => {
    // Large current-speed drag can decelerate the car, but it becomes zero
    // at rest and therefore cannot balance a grade greater than rolling drag.
    expect(step(0.005, 0.1, { rolling: 100, grade: 200, drag: 1000 }).speed).toBeLessThan(0);
  });
});
