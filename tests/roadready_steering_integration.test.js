import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, liveSteeringStep, liveAcceptedMotion;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('          var steeringGeometry = drivingSteeringGeometry(car.speed');
  const end = source.indexOf('          // Speed-bump crossing detection', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate the live steering and position integration');
  liveSteeringStep = new Function('drivingSteeringGeometry', 'integrateDrivingPose',
    'car', 'veh', 'thrust', 'brakeForce', 'mu', 'tireDynamics', 'dt', 'frameMotion',
    'skidRef', 'statsRef', 'timeRef', 'longitudinalTireForce', source.slice(start, end) +
    '\nreturn { x: newX, y: newY, heading: car.heading };');
  const acceptStart = source.indexOf('          var acceptedMotion = acceptedDrivingMotion(frameMotion,');
  const acceptEnd = source.indexOf('          // Wheel phase follows accepted driving travel', acceptStart);
  if (acceptStart < 0 || acceptEnd < 0) throw new Error('Cannot locate live accepted-travel accounting');
  liveAcceptedMotion = new Function('acceptedDrivingMotion', 'frameMotion', 'previousCarX',
    'previousCarY', 'car', 'motionBlocked', 'framePose', source.slice(acceptStart, acceptEnd) +
    '\nreturn acceptedMotion;');
});

function step(car, dt, distance, options = {}) {
  return liveSteeringStep(RR.drivingSteeringGeometry, RR.integrateDrivingPose,
    car, { id: 'sedan', mass: 1450 }, options.thrust || 0, options.brakeForce || 0,
    options.mu ?? 0.72, { steeringFactor: options.steeringFactor ?? 1 }, dt, { distance },
    { current: { active: false, intensity: 0 } },
    { current: { safetyScore: 100, skidSeconds: 0 } }, { current: 0 },
    RR.longitudinalNetForce(options.thrust || 0, options.brakeForce || 0, car.speed, 0));
}

function expectedArc(heading, distance, wheelAngle, wheelbase, grip = 1) {
  const curvature = Math.tan(wheelAngle) / wheelbase * grip;
  const yaw = distance * curvature;
  if (Math.abs(curvature) < 1e-12) {
    return { heading, x: distance * Math.cos(heading), y: distance * Math.sin(heading) };
  }
  return { heading: heading + yaw,
    x: (Math.sin(heading + yaw) - Math.sin(heading)) / curvature,
    y: (Math.cos(heading) - Math.cos(heading + yaw)) / curvature };
}

describe('live steering follows the same travel as the longitudinal integrator', () => {
  it.each([30, 60, 144])('follows the bicycle-model arc at %i Hz, including varying frame times', hz => {
    for (const speed of [29.06, -3]) for (const varying of [false, true]) {
      const car = { x: 0, y: 0, heading: 0.3, speed, steering: 0.6 };
      const geometry = RR.drivingSteeringGeometry(speed, car.steering, 'sedan');
      const expected = expectedArc(car.heading, speed * 10, geometry.wheelAngle, geometry.wheelbase);
      let elapsed = 0, frame = 0;
      while (elapsed < 10 - 1e-12) {
        const dt = Math.min(10 - elapsed, (varying ? [0.5, 1.5, 0.75, 1.25][frame++ % 4] : 1) / hz);
        Object.assign(car, step(car, dt, speed * dt));
        elapsed += dt;
      }
      expect(car.heading).toBeCloseTo(expected.heading, 9);
      expect(car.x).toBeCloseTo(expected.x, 7);
      expect(car.y).toBeCloseTo(expected.y, 7);
    }
  });

  it.each([1, -1])('retains the turn before a partial-frame stop in direction %i', direction => {
    const motion = RR.integrateDrivingMotion(direction * 0.2, direction * -5,
      0.05, direction > 0 ? 'D' : 'R', 0);
    const car = { x: 0, y: 0, heading: 0, speed: motion.speed, steering: 0.6 };
    const geometry = RR.drivingSteeringGeometry(car.speed, car.steering, 'sedan');
    const expected = expectedArc(0, motion.distance, geometry.wheelAngle, geometry.wheelbase);
    const result = step(car, 0.05, motion.distance, { brakeForce: 7250 });
    expect(motion.speed).toBe(0);
    expect(result.heading * direction).toBeGreaterThan(0);
    expect(result.heading).toBeCloseTo(expected.heading, 12);
    expect(result.x).toBeCloseTo(expected.x, 12);
    expect(result.y).toBeCloseTo(expected.y, 12);
  });

  it('retraces its arc when neutral travel reverses and signed distance cancels within a frame', () => {
    const motion = RR.integrateDrivingMotion(0.2, -8, 0.05, 'N', 0);
    expect(motion.distance).toBeCloseTo(0, 12);
    expect(motion.pathLength).toBeGreaterThan(0);
    const car = { x: 2, y: 3, heading: 0.4, speed: motion.speed, steering: 0.6 };
    expect(step(car, 0.05, motion.distance)).toEqual({ x: 2, y: 3, heading: 0.4 });
  });

  it('keeps rest and Park stationary even with the wheel turned', () => {
    for (const gear of ['D', 'N', 'P']) {
      const motion = RR.integrateDrivingMotion(0, 0, 0.05, gear, 0);
      const car = { x: 2, y: 3, heading: 0.4, speed: motion.speed, steering: 0.6 };
      expect(step(car, 0.05, motion.distance)).toEqual({ x: 2, y: 3, heading: 0.4 });
    }
  });

  it('preserves the tire steering multiplier and friction-circle limit', () => {
    const car = { x: 0, y: 0, heading: 0, speed: 20, steering: 0.6 };
    const dry = step({ ...car }, 0.05, 1);
    const locked = step({ ...car }, 0.05, 1, { steeringFactor: 0.08 });
    expect(locked.heading).toBeCloseTo(dry.heading * 0.08, 12);
    const limited = step({ ...car }, 0.05, 1, { mu: 0.2 });
    const actualLateralAcceleration = car.speed * car.speed * limited.heading;
    expect(actualLateralAcceleration).toBeCloseTo(0.2 * 9.81, 10);
    expect(limited.heading).toBeLessThan(dry.heading);
  });

  it('counts full arc travel in the live odometer/wheel accounting while retaining clipping and blocking', () => {
    const motion = { distance: 10, pathLength: 10 };
    const pose = RR.integrateDrivingPose(0, motion.distance, 0.1);
    const endpoint = { x: pose.dx, y: pose.dy };
    expect(Math.hypot(pose.dx, pose.dy)).toBeLessThan(motion.distance);
    const accept = (position, blocked = false) => liveAcceptedMotion(RR.acceptedDrivingMotion,
      motion, 0, 0, position, blocked, pose);
    expect(accept(endpoint)).toEqual({ distance: 10, pathLength: 10 });
    expect(accept({ x: endpoint.x / 2, y: endpoint.y / 2 })).toEqual({ distance: 5, pathLength: 5 });
    expect(accept(endpoint, true)).toEqual({ distance: 0, pathLength: 0 });
  });

  it('retains path length when a reversal or full circle has negligible endpoint displacement', () => {
    for (const motion of [RR.integrateDrivingMotion(1, -2, 1, 'N', 0),
      { distance: 20 * Math.PI, pathLength: 20 * Math.PI }]) {
      const pose = RR.integrateDrivingPose(0, motion.distance, 0.1);
      expect(Math.hypot(pose.dx, pose.dy)).toBeLessThan(1e-9);
      expect(liveAcceptedMotion(RR.acceptedDrivingMotion,
        motion, 0, 0, { x: pose.dx, y: pose.dy }, false, pose))
        .toEqual({ distance: motion.distance, pathLength: motion.pathLength });
    }
  });
});
