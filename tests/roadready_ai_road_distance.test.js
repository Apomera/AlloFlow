import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, makeUpdater;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('        var updateTraffic = function(dt) {');
  const end = source.indexOf('        var updateWildlife = function(dt)', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate live traffic updater');
  makeUpdater = new Function('scope', 'with(scope) {' + source.slice(start, end) + '\nreturn updateTraffic;}');
});

function oneFrame(theta, { gap = 33, direction = -1, playerLeader = false, dt = 1 / 60 } = {}) {
  const profile = { lanes: 2, roadHalfWidth: 3.5 };
  const world = { profile, chunks: {}, getChunk: () => profile,
    spline: { centerAt: station => 48 + Math.tan(theta) * (station - 50), headingAt: () => theta } };
  const lane = -direction * 1.6;
  const pose = station => ({ ...RR.mainRoadWorldPoint(world, station, lane),
    heading: (direction > 0 ? Math.PI / 2 : -Math.PI / 2) - theta });
  const personality = { speedBias: 1, followMult: 1, aggro: 0, rollsStops: 0 };
  const follower = { ...pose(50), id: 'metric-follower', type: 'car',
    laneOffset: lane, speed: 10, personality: { ...personality } };
  // Station is world Y, not arc length. Rotating this straight road changes
  // its station delta while preserving the actual distance between vehicles.
  const leader = { ...pose(50 + direction * gap * Math.cos(theta)),
    id: 'metric-leader', type: playerLeader ? 'sedan' : 'car',
    laneOffset: lane, speed: playerLeader ? 0 : 10, personality: { ...personality } };
  const physicalGap = Math.hypot(leader.x - follower.x, leader.y - follower.y);
  const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4,
    trafficRef: { current: playerLeader ? [follower] : [follower, leader] },
    pedsRef: { current: [] }, signalsRef: { current: [] }, cyclistsRef: { current: [] },
    emergencyRef: { current: null }, carRef: { current: playerLeader ? leader
      : { x: 100, y: 50, heading: -Math.PI / 2, speed: 0 } },
    infiniteWorldRef: { current: world }, statsRef: { current: { safetyScore: 100, crashes: 0 } },
    currentScenario: { id: 'residential', speedLimit: 35, weather: 'clear' },
    currentVehicle: { id: 'sedan' }, timeRef: { current: 10 },
    stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
    addToast: () => {}, speak: () => {}, audioRef: { current: {} }, eventToastRef: { current: null },
  };
  makeUpdater(scope)(dt);
  return { physicalGap, speed: follower.speed, slowFor: follower._slowFor };
}

describe('AI headway uses physical road distance rather than world-Y station differences', () => {
  it('keeps signed center distance independent of heading and leaves overlapping-body spacing unclamped', () => {
    const theta = 0.4;
    const world = { spline: { centerAt: s => 48 + Math.tan(theta) * s, headingAt: () => theta } };
    for (const direction of [-1, 1]) {
      const heading = (direction > 0 ? Math.PI / 2 : -Math.PI / 2) - theta;
      const first = { ...RR.mainRoadWorldPoint(world, 40, 1.6), heading };
      const ahead = { ...RR.mainRoadWorldPoint(world, 40 + direction * 2 * Math.cos(theta), 1.6), heading };
      expect(RR.followingCenterDistance(world, first, ahead)).toBeCloseTo(2, 10);
      expect(RR.followingCenterDistance(world, ahead, first)).toBeCloseTo(-2, 10);
      expect(RR.followingBumperGap(world, first, ahead)).toBe(0);
    }
  });

  it('integrates the lane arc through a bend with the same length in either direction', () => {
    const world = { spline: { centerAt: s => 0.03 * s * s,
      headingAt: s => Math.atan(0.06 * s) } };
    const end = 17.277;
    const first = { ...RR.mainRoadWorldPoint(world, 0, 1.6), heading: Math.PI / 2 };
    const last = { ...RR.mainRoadWorldPoint(world, end, 1.6), heading: Math.PI / 2 - Math.atan(0.06 * end) };
    let expected = 0, previous = RR.mainRoadWorldPoint(world, 0, 1.6);
    for (let i = 1; i <= 5000; i++) {
      const next = RR.mainRoadWorldPoint(world, end * i / 5000, 1.6);
      expected += Math.hypot(next.x - previous.x, next.y - previous.y);
      previous = next;
    }
    const forward = RR.followingCenterDistance(world, first, last);
    expect(Math.abs(forward - expected)).toBeLessThan(0.015);
    expect(forward).toBeGreaterThan(Math.hypot(last.x - first.x, last.y - first.y) + 0.4);
    first.heading -= Math.PI; last.heading -= Math.PI;
    expect(RR.followingCenterDistance(world, last, first)).toBeCloseTo(forward, 8);
  });

  it('preserves metre-based cross-street and finite-road distances without sampling the main spline', () => {
    const pose = RR.crossStreetPose(48, 40, 0.35, 6.5, 30);
    const heading = RR.crossStreetTravelHeading(pose, 1);
    const first = { ...RR.crossStreetWorldPoint(pose, -10, 1.5), heading,
      crossStreet: true, _crossPose: pose, _crossDirection: 1, _chunk: 0 };
    const last = { ...RR.crossStreetWorldPoint(pose, 7, 1.5), heading,
      crossStreet: true, _crossPose: pose, _crossDirection: 1, _chunk: 0 };
    const world = { spline: { centerAt: () => { throw new Error('Cross street must not sample main-road distance'); } } };
    expect(RR.followingCenterDistance(world, first, last)).toBeCloseTo(17, 10);
    expect(RR.followingCenterDistance(null, first, last)).toBeCloseTo(17, 10);
    expect(RR.followingCenterDistance(null, { x: 0, y: 0, heading: 0 },
      { x: 7, y: 0, heading: 0 })).toBe(7);
  });

  it.each([30, 60, 144])('makes the same following decision on equivalent road angles at %i Hz', hz => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      for (const direction of [-1, 1]) for (const gap of [17, 33, 38]) {
        const straight = oneFrame(0, { gap, direction, dt: 1 / hz });
        for (const theta of [0.35, -0.35, 0.6]) {
          const rotated = oneFrame(theta, { gap, direction, dt: 1 / hz });
          expect(rotated.physicalGap).toBeCloseTo(straight.physicalGap, 10);
          expect(rotated.slowFor, JSON.stringify({ theta, direction, gap })).toBe(straight.slowFor);
          expect(rotated.speed).toBeCloseTo(straight.speed, 8);
        }
      }
    } finally { random.mockRestore(); }
  });

  it.each([30, 60, 144])('uses the same physical braking clearance behind the learner at %i Hz', hz => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      // Stay away from the existing exact 10m discrete slowdown boundary;
      // equivalent rotated coordinates can straddle it by floating-point ulps.
      for (const direction of [-1, 1]) for (const gap of [10.5, 17, 33]) {
        const straight = oneFrame(0, { gap, direction, playerLeader: true, dt: 1 / hz });
        for (const theta of [0.35, -0.35]) {
          const rotated = oneFrame(theta, { gap, direction, playerLeader: true, dt: 1 / hz });
          expect(rotated.physicalGap).toBeCloseTo(straight.physicalGap, 10);
          expect(rotated.speed, JSON.stringify({ theta, direction, gap })).toBeCloseTo(straight.speed, 8);
          expect(rotated.slowFor).toBe(straight.slowFor);
        }
      }
    } finally { random.mockRestore(); }
  });
});
