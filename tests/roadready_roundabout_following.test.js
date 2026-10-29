import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

const FRAME_RATES = [30, 60, 144];

function circleActor(id, angle, speed, type = 'car', radius = 8) {
  return {
    ...RR.roundaboutPose(angle, radius), id, type, speed,
    _roundaboutState: 'circulating', _roundaboutAngle: angle,
    _roundaboutRadius: radius, _roundaboutTravel: 0, _roundaboutExitAfter: 100,
  };
}

function overlaps(a, b) {
  return RR.vehicleRectsOverlap(a, RR.vehicleFootprint(a.type), b, RR.vehicleFootprint(b.type));
}

function advanceLeader(leader, dt) {
  leader._roundaboutAngle -= leader.speed / leader._roundaboutRadius * dt;
  Object.assign(leader, RR.roundaboutPose(leader._roundaboutAngle, leader._roundaboutRadius));
}

describe('Road Ready circulating traffic leaves room for occupied vehicles', () => {
  it.each(FRAME_RATES)('brakes before contacting a stopped learner at %i Hz', (hz) => {
    const follower = circleActor('follower', 2.5, 18 * RR.MPH_TO_MS);
    const learner = circleActor('learner', 0, 0, 'sedan');
    expect(overlaps(follower, learner)).toBe(false);
    for (let frame = 0; frame < hz * 10; frame++) {
      RR.updateRoundaboutTrafficVehicle(follower, 1 / hz, [follower], learner, 'sedan');
      expect(overlaps(follower, learner), `contact at ${(frame + 1) / hz}s`).toBe(false);
      expect(follower.speed).toBeGreaterThanOrEqual(0);
    }
    expect(follower.speed).toBeLessThan(0.1);
    // Its accumulated travel must stop before the learner's original position.
    expect(follower._roundaboutTravel).toBeLessThan(2.5);
  });

  it.each(FRAME_RATES)('holds behind stopped ambient traffic across the angle wrap at %i Hz', (hz) => {
    const follower = circleActor('follower', -2.5, 18 * RR.MPH_TO_MS, 'suv');
    const leader = circleActor('leader', 2 * Math.PI - 5, 0, 'van');
    expect(overlaps(follower, leader)).toBe(false);
    for (let frame = 0; frame < hz * 10; frame++) {
      RR.updateRoundaboutTrafficVehicle(follower, 1 / hz, [follower, leader]);
      expect(overlaps(follower, leader), `contact at ${(frame + 1) / hz}s`).toBe(false);
    }
    expect(follower.speed).toBeLessThan(0.1);
    expect(follower._roundaboutTravel).toBeLessThan(2.5);
  });

  it.each(FRAME_RATES)('follows a slower moving learner without touching or stopping indefinitely at %i Hz', (hz) => {
    const follower = circleActor('follower', 2.5, 18 * RR.MPH_TO_MS);
    const learner = circleActor('learner', 0, 3, 'suv');
    for (let frame = 0; frame < hz * 12; frame++) {
      advanceLeader(learner, 1 / hz);
      RR.updateRoundaboutTrafficVehicle(follower, 1 / hz, [follower], learner, 'suv');
      expect(overlaps(follower, learner), `contact at ${(frame + 1) / hz}s`).toBe(false);
    }
    expect(follower.speed).toBeGreaterThan(2);
    expect(follower.speed).toBeLessThan(3.5);
    expect(follower._roundaboutTravel).toBeGreaterThan(3);
  });

  it('resumes once the stopped learner leaves the circulating lane', () => {
    const follower = circleActor('follower', 2.5, 18 * RR.MPH_TO_MS);
    const learner = circleActor('learner', 0, 0, 'sedan');
    for (let frame = 0; frame < 600; frame++) {
      RR.updateRoundaboutTrafficVehicle(follower, 1 / 60, [follower], learner, 'sedan');
    }
    expect(follower.speed).toBeLessThan(0.1);
    const heldTravel = follower._roundaboutTravel;
    for (let frame = 0; frame < 180; frame++) {
      RR.updateRoundaboutTrafficVehicle(follower, 1 / 60, [follower]);
    }
    expect(follower.speed).toBeGreaterThan(2);
    expect(follower._roundaboutTravel).toBeGreaterThan(heldTravel + 0.3);
  });

  it.each([7.5, 8.5])('respects longer vehicles when circulating at radius %sm', (radius) => {
    const follower = circleActor('follower', 20 / radius, 18 * RR.MPH_TO_MS, 'van', radius);
    const leader = circleActor('leader', 0, 0, 'pickup', radius);
    for (let frame = 0; frame < 600; frame++) {
      RR.updateRoundaboutTrafficVehicle(follower, 1 / 60, [follower, leader]);
      expect(overlaps(follower, leader), `contact at ${(frame + 1) / 60}s`).toBe(false);
    }
    expect(follower.speed).toBeLessThan(0.1);
  });

  it('does not accelerate through a co-angular learner already overlapping its lane', () => {
    const follower = circleActor('follower', 0, 0);
    const learner = circleActor('learner', 0, 0, 'sedan');
    for (let frame = 0; frame < 120; frame++) {
      RR.updateRoundaboutTrafficVehicle(follower, 1 / 60, [follower], learner, 'sedan');
    }
    expect(follower.speed).toBe(0);
    expect(follower._roundaboutTravel).toBe(0);
  });

  it.each([5.5, 10.8])('passes a stopped learner at radius %sm when its full footprint is outside the lane', (radius) => {
    const follower = circleActor('follower', 2.5, 18 * RR.MPH_TO_MS);
    const unobstructed = circleActor('unobstructed', 2.5, 18 * RR.MPH_TO_MS);
    const learner = circleActor('learner', 0, 0, 'sedan', radius);
    for (let frame = 0; frame < 60 * 4; frame++) {
      RR.updateRoundaboutTrafficVehicle(follower, 1 / 60, [follower], learner, 'sedan');
      RR.updateRoundaboutTrafficVehicle(unobstructed, 1 / 60, [unobstructed]);
      expect(follower.speed).toBeCloseTo(unobstructed.speed, 10);
      expect(follower._roundaboutTravel).toBeCloseTo(unobstructed._roundaboutTravel, 10);
      expect(overlaps(follower, learner)).toBe(false);
    }
    expect(follower._roundaboutTravel).toBeGreaterThan(2);
  });

  it.each([
    { radius: 11, heading: Math.PI, name: 'inward-facing learner outside the outer edge' },
    { radius: 5, heading: 0, name: 'outward-facing learner inside the inner edge' },
  ])('stops for the protruding body of an $name', ({ radius, heading }) => {
    const follower = circleActor('follower', 2.5, 18 * RR.MPH_TO_MS);
    const learner = { ...circleActor('learner', 0, 0, 'sedan', radius), heading };
    expect(overlaps(follower, learner)).toBe(false);
    for (let frame = 0; frame < 60 * 10; frame++) {
      RR.updateRoundaboutTrafficVehicle(follower, 1 / 60, [follower], learner, 'sedan');
      expect(overlaps(follower, learner), `contact at ${(frame + 1) / 60}s`).toBe(false);
    }
    expect(follower.speed).toBeLessThan(0.1);
    expect(follower._roundaboutTravel).toBeLessThan(2.5);
  });

  it.each([
    { radius: 12, heading: Math.PI },
    { radius: 0, heading: 0 },
  ])('passes a radial-facing learner whose entire body is clear at radius $radius', ({ radius, heading }) => {
    const follower = circleActor('follower', 2.5, 18 * RR.MPH_TO_MS);
    const unobstructed = circleActor('unobstructed', 2.5, 18 * RR.MPH_TO_MS);
    const learner = { ...circleActor('learner', 0, 0, 'sedan', radius), heading };
    for (let frame = 0; frame < 60 * 4; frame++) {
      RR.updateRoundaboutTrafficVehicle(follower, 1 / 60, [follower], learner, 'sedan');
      RR.updateRoundaboutTrafficVehicle(unobstructed, 1 / 60, [unobstructed]);
      expect(follower.speed).toBeCloseTo(unobstructed.speed, 10);
      expect(follower._roundaboutTravel).toBeCloseTo(unobstructed._roundaboutTravel, 10);
      expect(overlaps(follower, learner)).toBe(false);
    }
    expect(follower._roundaboutTravel).toBeGreaterThan(2);
  });
});
