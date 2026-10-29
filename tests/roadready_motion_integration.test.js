import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, liveMove;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  // Execute the production integration and movement statements too, so a
  // correct helper cannot hide a caller that still advances by finalSpeed*dt.
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const between = (first, last) => {
    const start = source.indexOf(first), end = source.indexOf(last, start);
    if (start < 0 || end < 0) throw new Error('Cannot locate the live movement integration');
    return source.slice(start, end);
  };
  liveMove = new Function('integrateDrivingMotion', 'car', 'accel', 'dt', 'gear',
    'throttleInput', 'brakeInput', 'longitudinalNetForce', 'thrust', 'Fr', 'brakeForce', 'gradeForce',
    'integrateDrivingPose', 'steeringGeometry', 'steerEffect',
    between('          var engineDragRate = ', '          // Weight transfer') +
    between('          var framePose = ', '          // Speed-bump crossing detection') +
    '\nreturn { speed: car.speed, x: newX, y: newY, motion: frameMotion };');
});

function integrateFor(initial, acceleration, seconds, gear, dragRate, hz, varying = false) {
  let speed = initial, distance = 0, pathLength = 0, elapsed = 0, frame = 0;
  while (elapsed < seconds - 1e-12) {
    const dt = Math.min(seconds - elapsed, (varying ? [0.5, 1.5, 0.75, 1.25][frame++ % 4] : 1) / hz);
    const step = RR.integrateDrivingMotion(speed, acceleration, dt, gear, dragRate);
    speed = step.speed;
    distance += step.distance;
    pathLength += step.pathLength;
    elapsed += dt;
  }
  return { speed, distance, pathLength };
}

describe('driving speed and distance share one integration', () => {
  it.each([30, 60, 144])('stops after the same physical distance at %i Hz, including varying frame times', hz => {
    for (const varying of [false, true]) {
      const forward = integrateFor(10, -5, 3, 'D', 0, hz, varying);
      const reverse = integrateFor(-5, 2.5, 3, 'R', 0, hz, varying);
      expect(forward.speed).toBe(0);
      expect(forward.distance).toBeCloseTo(10, 9);
      expect(forward.pathLength).toBeCloseTo(10, 9);
      expect(reverse.speed).toBe(0);
      expect(reverse.distance).toBeCloseTo(-5, 9);
      expect(reverse.pathLength).toBeCloseTo(5, 9);
    }
  });

  it('retains the distance traveled before a stop partway through a frame', () => {
    expect(RR.integrateDrivingMotion(0.2, -5, 0.1, 'D', 0)).toMatchObject({ speed: 0 });
    expect(RR.integrateDrivingMotion(0.2, -5, 0.1, 'D', 0).distance).toBeCloseTo(0.004, 12);
    expect(RR.integrateDrivingMotion(-0.2, 5, 0.1, 'R', 0).distance).toBeCloseTo(-0.004, 12);
  });

  it('uses integrated travel in the actual live position update after a partial-frame stop', () => {
    const frame = liveMove(RR.integrateDrivingMotion,
      { x: 10, y: 20, heading: 0, speed: 0.2 }, -5, 0.1, 'D', 0, 1,
      RR.longitudinalNetForce, 0, 0, 5000, 0, RR.integrateDrivingPose, { curvature: 0 }, 1);
    expect(frame.speed).toBe(0);
    expect(frame.x).toBeCloseTo(10.004, 12);
    expect(frame.y).toBe(20);
    expect(frame.motion.pathLength).toBeCloseTo(0.004, 12);
  });

  it('travels at the reverse cap only after the instant that cap is reached', () => {
    const limit = 15 * RR.MPH_TO_MS;
    const timeToCap = (limit - 6) / 2;
    const expectedDistance = -6 * timeToCap - timeToCap ** 2 - limit * (1 - timeToCap);
    const step = RR.integrateDrivingMotion(-6, -2, 1, 'R', 0);
    expect(step.speed).toBeCloseTo(-limit, 12);
    expect(step.distance).toBeCloseTo(expectedDistance, 12);
    for (const hz of [30, 60, 144]) {
      const partitioned = integrateFor(-6, -2, 1, 'R', 0, hz, true);
      expect(partitioned.speed).toBeCloseTo(step.speed, 10);
      expect(partitioned.distance).toBeCloseTo(step.distance, 10);
    }
  });

  it('tracks neutral path length even when forward and backward travel cancel', () => {
    const step = RR.integrateDrivingMotion(1, -2, 1, 'N', 0);
    expect(step.speed).toBe(-1);
    expect(step.distance).toBe(0);
    expect(step.pathLength).toBeCloseTo(0.5, 12);
    for (const hz of [30, 60, 144]) {
      const partitioned = integrateFor(1, -2, 1, 'N', 0, hz, true);
      expect(partitioned.speed).toBeCloseTo(-1, 10);
      expect(partitioned.distance).toBeCloseTo(0, 10);
      expect(partitioned.pathLength).toBeCloseTo(0.5, 10);
    }
  });

  it('keeps Park stationary despite a grade or stored speed', () => {
    expect(RR.integrateDrivingMotion(4, -2, 1, 'P', 0.05)).toEqual({ speed: 0, distance: 0, pathLength: 0 });
  });

  it.each([30, 60, 144])('integrates engine drag analytically at %i Hz', hz => {
    const rate = 0.05, initial = 10, seconds = 4;
    const expectedSpeed = initial * Math.exp(-rate * seconds);
    const expectedDistance = initial * (1 - Math.exp(-rate * seconds)) / rate;
    for (const varying of [false, true]) {
      const step = integrateFor(initial, 0, seconds, 'D', rate, hz, varying);
      expect(step.speed).toBeCloseTo(expectedSpeed, 9);
      expect(step.distance).toBeCloseTo(expectedDistance, 9);
    }
  });

  it('combines grade/resistance acceleration with drag through the exact stopping instant', () => {
    const initial = 10, acceleration = -2, drag = 0.05;
    const stopTime = Math.log(1 + initial * drag / -acceleration) / drag;
    const expectedDistance = initial / drag + acceleration * stopTime / drag;
    const whole = RR.integrateDrivingMotion(initial, acceleration, 6, 'D', drag);
    expect(whole.speed).toBe(0);
    expect(whole.distance).toBeCloseTo(expectedDistance, 10);
    for (const hz of [30, 60, 144]) {
      const partitioned = integrateFor(initial, acceleration, 6, 'D', drag, hz, true);
      expect(partitioned.speed).toBe(0);
      expect(partitioned.distance).toBeCloseTo(expectedDistance, 8);
    }
  });

  it('does not advance on a zero, negative, or invalid time step', () => {
    for (const dt of [0, -1, NaN, Infinity]) {
      expect(RR.integrateDrivingMotion(4, 2, dt, 'D', 0.05)).toEqual({ speed: 4, distance: 0, pathLength: 0 });
    }
  });

  it('continues braking at crawling speed until the integrator reaches an exact stop', () => {
    for (const sign of [1, -1]) {
      const initial = sign * 0.005;
      const acceleration = RR.longitudinalNetForce(0, 145, initial, 0) / 1450;
      expect(acceleration * sign).toBeLessThan(0);
      const step = RR.integrateDrivingMotion(initial, acceleration, 0.1, sign > 0 ? 'D' : 'R', 0);
      expect(step.speed).toBe(0);
      expect(step.pathLength).toBeGreaterThan(0);
      expect(RR.longitudinalNetForce(0, 145, step.speed, 0)).toBe(0);
    }
  });
});

describe('accepted driving travel for the odometer and fuel accounting', () => {
  it('retains full travel when movement is accepted and clips distance at a course boundary', () => {
    const motion = { speed: 2, distance: 2, pathLength: 2 };
    expect(RR.acceptedDrivingMotion(motion, { x: 10, y: 10 }, { x: 12, y: 10 }, false))
      .toEqual({ distance: 2, pathLength: 2 });
    expect(RR.acceptedDrivingMotion(motion, { x: 10, y: 10 }, { x: 10.5, y: 10 }, false))
      .toEqual({ distance: 0.5, pathLength: 0.5 });
  });

  it('adds reverse mileage without treating a collision nudge as driving', () => {
    const motion = { speed: -2, distance: -2, pathLength: 2 };
    expect(RR.acceptedDrivingMotion(motion, { x: 10, y: 10 }, { x: 8, y: 10 }, false))
      .toEqual({ distance: -2, pathLength: 2 });
    expect(RR.acceptedDrivingMotion(motion, { x: 10, y: 10 }, { x: 11, y: 10 }, true))
      .toEqual({ distance: 0, pathLength: 0 });
  });

  it('does not count movement rejected by a railroad gate or channelizer', () => {
    const motion = { speed: 5, distance: 0.5, pathLength: 0.5 };
    expect(RR.acceptedDrivingMotion(motion, { x: 10, y: 10 }, { x: 10, y: 10 }, true))
      .toEqual({ distance: 0, pathLength: 0 });
  });

  it('retains neutral path length when opposite travel cancels within the frame', () => {
    const motion = RR.integrateDrivingMotion(1, -2, 1, 'N', 0);
    expect(RR.acceptedDrivingMotion(motion, { x: 10, y: 10 }, { x: 10, y: 10 }, false))
      .toEqual({ distance: 0, pathLength: 0.5 });
  });
});
