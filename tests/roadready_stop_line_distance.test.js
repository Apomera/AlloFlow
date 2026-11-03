import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

function tiltedRoad(theta, direction, gap, type = 'light', length = 4.5) {
  const world = { profile: RR.CONTINUOUS_SCENARIO_PROFILES.suburban, spline: {
    centerAt: station => 48 + Math.tan(theta) * (station - 50), headingAt: () => theta,
  } };
  const signal = { type, x: 48, y: 50, state: 'yellow' };
  const lineStation = type === 'flagger' ? 50 : 50 - direction * 4.1;
  const line = RR.mainRoadWorldPoint(world, lineStation, -direction * 1.5);
  const car = { x: line.x - direction * Math.sin(theta) * (gap + length / 2),
    y: line.y - direction * Math.cos(theta) * (gap + length / 2),
    heading: (direction > 0 ? Math.PI / 2 : -Math.PI / 2) - theta, speed: 10.5 };
  return { world, signal, car, length };
}

describe('physical bumper distance to an intersection control', () => {
  it.each([-1, 1])('preserves a 20 m yellow stopping decision in direction %s', direction => {
    for (const theta of [0, -0.55, 0.55]) {
      const { world, signal, car, length } = tiltedRoad(theta, direction, 20);
      const ahead = RR.controlDistanceAhead(world, signal, car, length);
      const threshold = RR.stoppingDistance(car.speed * RR.MS_TO_MPH, 'clear', 0.8).total_ft / RR.FT_PER_M + 2;
      expect(ahead).toBeCloseTo(20, 6);
      expect(ahead).toBeGreaterThan(threshold);
      expect(RR.drivingSignalPreview(world, [signal], car, length, 'clear').distanceMeters).toBeCloseTo(20, 6);
    }
  });

  it.each([-1, 1])('applies preview range and 5 cm tolerance in physical metres in direction %s', direction => {
    for (const gap of [42, 0, -0.04, -0.055]) {
      const { world, signal, car, length } = tiltedRoad(0.55, direction, gap, 'stop', 10);
      car.speed = 0; // The stationary preview range is 40 m.
      const preview = RR.drivingSignalPreview(world, [signal], car, length, 'clear');
      if (gap > 40 || gap < -0.05) expect(preview.signal).toBeNull();
      else { expect(preview.signal).toBe(signal); expect(preview.distanceMeters).toBeCloseTo(0, 6); }
    }
  });

  it.each([-1.6, 1.6])('follows the lane at offset %s through a circular bend', lateral => {
    const radius = 60, startAngle = 0.05, endAngle = 0.4;
    const world = { profile: RR.CONTINUOUS_SCENARIO_PROFILES.suburban, spline: {
      centerAt: station => 48 + radius - Math.sqrt(radius ** 2 - station ** 2),
      headingAt: station => Math.asin(station / radius),
    } };
    const front = RR.mainRoadWorldPoint(world, radius * Math.sin(startAngle), lateral);
    const controlStation = radius * Math.sin(endAngle);
    const signal = { type: 'stop', ...RR.mainRoadWorldPoint(world, controlStation + 4.1, 0) };
    const car = { x: front.x - Math.sin(startAngle) * 2.25, y: front.y - Math.cos(startAngle) * 2.25,
      heading: Math.PI / 2 - startAngle, speed: 10.5 };
    const expected = (radius - lateral) * (endAngle - startAngle);
    expect(Math.abs(RR.controlDistanceAhead(world, signal, car, 4.5) - expected)).toBeLessThan(0.01);
  });

  it('preserves the physical axis distance on a rotated cross street', () => {
    const { world, signal } = tiltedRoad(0.35, 1, 20);
    signal._chunk = 1;
    world.getChunk = index => ({ hasIntersection: index === 1, intersectionY: 18 });
    const pose = RR.crossStreetPose(48, 50, 0.35, 6.5, 96);
    for (const direction of [-1, 1]) {
      const car = { ...RR.crossStreetWorldPoint(pose, -direction * (4.1 + 20 + 5), direction * 1.5),
        heading: (direction > 0 ? 0 : Math.PI) - 0.35, speed: 5 };
      expect(RR.playerControlApproach(world, signal, car, 10).approachGroup).toBe('cross');
      expect(RR.controlDistanceAhead(world, signal, car, 10)).toBeCloseTo(20, 6);
    }
  });

  it('measures physical distance to the flagger control without moving its stop line', () => {
    const { world, signal, car, length } = tiltedRoad(-0.55, -1, 20, 'flagger');
    expect(RR.playerControlApproach(world, signal, car, length).controlCoordinate).toBe(50);
    expect(RR.controlDistanceAhead(world, signal, car, length)).toBeCloseTo(20, 6);
  });
});
