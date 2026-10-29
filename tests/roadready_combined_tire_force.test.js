import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// These checks target Road Ready's single aggregate contact-force model,
// not cancellation between individual axles in a full vehicle model.
// Opposing drive/brake torques: https://www.mathworks.com/help/vdynblks/ref/longitudinalwheel.html
// Resultant Fx/Fy friction limit: https://vtechworks.lib.vt.edu/bitstream/handle/10919/36615/Chapter2a.pdf
let RR, liveTireBudget;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const between = (first, last) => {
    const start = source.indexOf(first), end = source.indexOf(last, start);
    if (start < 0 || end < 0) throw new Error('Cannot locate live tire-force budget');
    return source.slice(start, end);
  };
  const launchFraction = source.match(/var RR_LAUNCH_TRACTION_FRACTION = [\d.]+;/)?.[0];
  if (!launchFraction) throw new Error('Cannot locate launch traction fraction');
  // Run the real thrust/brake computation, speed integration and friction
  // circle in order. In particular, a stop must not erase the sign of the
  // force that acted during the moving part of this frame.
  liveTireBudget = new Function('scope', 'with (scope) {\n' + launchFraction + '\n' +
    between('          var maxThrust = veh.powerKW', '          // Hill grade:') +
    between('          var netForce = longitudinalNetForce(', '          // Weight transfer') +
    between('          var steeringGeometry = drivingSteeringGeometry(car.speed', '          var framePose = integrateDrivingPose(') +
    '\nreturn { thrust, brakeForce, longitudinalUsed, lateralAvail, steerEffect, skid, frameMotion }; }');
});

function run({ speed = 10, throttle = 0, brake = 0, dt = 1 / 60,
  gear = speed < 0 ? 'R' : 'D', weather = 'clear', steering = 0.6,
  mass = 1450, powerKW = 120, cd = 0.3, area = 2.2, rolling = 0.015, grade = 0 } = {}) {
  const tires = RR.computeTireDynamics(weather, Math.abs(speed) * RR.MS_TO_MPH,
    brake, steering, { absEnabled: true, tread32: 7, psi: 32 }, 0, 1);
  const car = { speed, steering };
  const result = liveTireBudget({ ...RR, veh: { id: 'sedan', mass, powerKW, cd, area },
    absSpeed: Math.abs(speed), reverseMode: gear === 'R', throttleInput: throttle,
    brakeInput: brake, tireDynamics: tires, mu: tires.mu, crr: rolling,
    car, gradeForce: grade, dt, gear,
    skidRef: { current: { active: false, intensity: 0 } },
    statsRef: { current: { safetyScore: 100, skidSeconds: 0 } }, timeRef: { current: 10 } });
  return { ...result, tires, speed: car.speed, mass };
}

describe('the aggregate friction circle uses the resultant longitudinal tire force', () => {
  it('keeps dry steering available during the normal throttle-to-brake handoff', () => {
    const pedal = RR.drivingPedalResponse(1, 0, 0, 1, 1 / 30, 'D');
    const frame = run({ throttle: pedal.throttle, brake: pedal.brake, dt: 1 / 30 });
    expect(frame.tires.wheelLocked).toBe(false);
    expect(frame.tires.absActive).toBe(false);
    expect(frame.longitudinalUsed).toBeCloseTo(Math.abs(frame.thrust - frame.brakeForce) / frame.mass, 10);
    expect(frame.lateralAvail).toBeGreaterThan(6);
    expect(frame.steerEffect).toBeCloseTo(1, 10);
    expect(frame.skid).toBe(false);
  });

  it.each([30, 60, 144])('avoids a zero-steering interval during pedal handoff at %i Hz', hz => {
    let throttle = 1, brake = 0;
    for (let tick = 0; tick < Math.ceil(0.2 * hz); tick++) {
      const pedal = RR.drivingPedalResponse(throttle, brake, 0, 1, 1 / hz, 'D');
      throttle = pedal.throttle; brake = pedal.brake;
      const frame = run({ throttle, brake, dt: 1 / hz });
      expect(frame.lateralAvail).toBeGreaterThan(0);
      expect(frame.steerEffect).toBeGreaterThan(0);
      expect(frame.longitudinalUsed).toBeLessThanOrEqual(frame.tires.mu * 9.81);
    }
  });

  it('subtracts opposed braking in reverse while adding forces that both oppose rollback', () => {
    const reversing = run({ speed: -5, throttle: 0.4, brake: 0.4 });
    expect(reversing.thrust).toBeLessThan(0);
    expect(reversing.longitudinalUsed)
      .toBeCloseTo(Math.abs(reversing.thrust + reversing.brakeForce) / reversing.mass, 10);
    const rollback = run({ speed: -0.2, gear: 'D', throttle: 0.4, brake: 0.4 });
    expect(rollback.longitudinalUsed)
      .toBeCloseTo((rollback.thrust + rollback.brakeForce) / rollback.mass, 10);
  });

  it.each([1, -1])('retains brake force during a partial-frame stop in direction %i', direction => {
    const frame = run({ speed: direction * 0.1, brake: 0.5, dt: 0.1 });
    expect(frame.speed).toBe(0);
    expect(frame.frameMotion.pathLength).toBeGreaterThan(0);
    expect(frame.longitudinalUsed).toBeCloseTo(frame.brakeForce / frame.mass, 10);
  });

  it('does not invent contact force when stationary brakes merely hold residual drive torque', () => {
    const frame = run({ speed: 0, throttle: 0.3, brake: 0.3 });
    expect(frame.speed).toBe(0);
    expect(frame.longitudinalUsed).toBe(0);
    expect(frame.lateralAvail).toBeCloseTo(frame.tires.mu * 9.81, 10);
  });

  it('preserves pure braking/acceleration budgets and excludes external drag and grade', () => {
    const drive = run({ throttle: 0.5 });
    expect(drive.longitudinalUsed).toBeCloseTo(Math.abs(drive.thrust) / drive.mass, 10);
    for (const direction of [1, -1]) {
      const brake = run({ speed: direction * 5, brake: 0.5 });
      expect(brake.longitudinalUsed).toBeCloseTo(brake.brakeForce / brake.mass, 10);
      const loaded = run({ speed: direction * 5, brake: 0.5, grade: 5000, cd: 1.5, area: 9 });
      expect(loaded.longitudinalUsed).toBeCloseTo(brake.longitudinalUsed, 10);
    }
  });
});
