import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, recordTravel, renderWheels;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const between = (first, last) => {
    const start = source.indexOf(first), end = source.indexOf(last, start);
    if (start < 0 || end < 0) throw new Error('Cannot locate the player wheel-travel block');
    return source.slice(start, end);
  };
  recordTravel = new Function('acceptedDrivingMotion', 'frameMotion', 'previousCarX',
    'previousCarY', 'car', 'motionBlocked', 'tireDynamics', 'framePose',
    between('          var acceptedMotion = acceptedDrivingMotion(frameMotion,',
      '          // Roundabout compliance') + '\nreturn acceptedMotion;');
  renderWheels = new Function('s3', 'car', 'timeRef', 'drivingSteeringGeometry', 'currentVehicle',
    between('          // Player wheel rotation + front-wheel steering visualization.',
      '          // High beam toggle + headlight direction tracking'));
});

function scene() {
  return { _lastWheelT: 0, playerCarGroup: { children: ['F', 'R'].map(end => ({
    name: 'rr_playerWheelPivot' + end, rotation: { y: 0 },
    children: [{ name: 'rr_playerWheel' + end, rotation: { y: 0 } }]
  })) } };
}

function car(speed = 0) {
  return { x: 10, y: 20, heading: 0, speed, steering: 0.2, _wheelTravel: 0 };
}

function advance(vehicle, acceleration, dt, gear, { blocked = false, locked = false } = {}) {
  const previousX = vehicle.x, previousY = vehicle.y;
  const motion = RR.integrateDrivingMotion(vehicle.speed, acceleration, dt, gear, 0);
  vehicle.speed = motion.speed;
  vehicle.x += blocked ? -motion.distance * 0.5 : motion.distance;
  recordTravel(RR.acceptedDrivingMotion, motion, previousX, previousY, vehicle,
    blocked, { wheelLocked: locked }, { dx: motion.distance, dy: 0 });
  return motion;
}

function render(view, vehicle, time = 0.1) {
  renderWheels(view, vehicle, { current: time }, RR.drivingSteeringGeometry, { id: 'sedan' });
  return view.playerCarGroup.children[0].children[0].rotation.y;
}

describe('player wheels follow accepted physical travel', () => {
  it('uses integrated acceleration distance instead of final speed times render time', () => {
    const vehicle = car(), view = scene();
    const motion = advance(vehicle, 10, 0.1, 'D');
    expect(motion.distance).toBeCloseTo(0.05, 12);
    expect(render(view, vehicle)).toBeCloseTo(motion.distance / 0.20, 12);
  });

  it('rolls through the portion of a frame before coming to a complete stop', () => {
    const vehicle = car(0.2), view = scene();
    const motion = advance(vehicle, -5, 0.1, 'D');
    expect(vehicle.speed).toBe(0);
    expect(render(view, vehicle)).toBeCloseTo(motion.distance / 0.20, 12);
    expect(render(view, vehicle)).toBeGreaterThan(0);
  });

  it('reverses wheel rotation when accepted travel changes direction', () => {
    const vehicle = car(1), view = scene();
    advance(vehicle, 0, 0.1, 'D');
    const forwardAngle = render(view, vehicle);
    vehicle.speed = -1;
    advance(vehicle, 0, 0.1, 'R');
    expect(render(view, vehicle, 0.2)).toBeCloseTo(0, 12);
    expect(forwardAngle).toBeGreaterThan(0);
    advance(vehicle, 0, 0.1, 'R');
    expect(render(view, vehicle, 0.3)).toBeLessThan(0);
  });

  it('does not spin again on repeated rendering or while simulation travel is paused', () => {
    const vehicle = car(2), view = scene();
    advance(vehicle, 0, 0.1, 'D');
    const angle = render(view, vehicle);
    expect(render(view, vehicle)).toBe(angle);
    expect(render(view, vehicle, 10)).toBe(angle);
  });

  it('does not convert a wall separation nudge or blocked movement into wheel rotation', () => {
    const vehicle = car(2), view = scene();
    advance(vehicle, 0, 0.1, 'D', { blocked: true });
    vehicle.speed *= -0.2;
    expect(render(view, vehicle)).toBe(0);
  });

  it('holds locked wheels still while the vehicle slides, then resumes rolling after release', () => {
    const vehicle = car(4), view = scene();
    const slide = advance(vehicle, -1, 0.1, 'D', { locked: true });
    expect(slide.distance).toBeGreaterThan(0);
    expect(render(view, vehicle)).toBe(0);
    const roll = advance(vehicle, 0, 0.1, 'D');
    expect(render(view, vehicle, 0.2)).toBeCloseTo(roll.distance / 0.20, 12);
  });

  it('preserves phase across a rebuilt 3D view and resets for a new car session', () => {
    const vehicle = car(2), firstView = scene();
    advance(vehicle, 0, 0.1, 'D');
    const angle = render(firstView, vehicle);
    expect(render(scene(), vehicle, 10)).toBe(angle);
    expect(render(firstView, car(), 10)).toBe(0);
  });

  it('preserves front-wheel steering and applies the same rolling phase to rear wheels', () => {
    const vehicle = car(2), view = scene();
    advance(vehicle, 0, 0.1, 'D');
    const angle = render(view, vehicle);
    expect(view.playerCarGroup.children[0].rotation.y)
      .toBeCloseTo(-RR.drivingSteeringGeometry(vehicle.speed, vehicle.steering, 'sedan').wheelAngle, 12);
    expect(view.playerCarGroup.children[1].rotation.y).toBe(0);
    expect(view.playerCarGroup.children[1].children[0].rotation.y).toBe(angle);
  });
});
