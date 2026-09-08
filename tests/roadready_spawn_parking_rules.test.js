import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let RR;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('logical road starts', () => {
  it('starts every streamed lesson in the correct lane, aligned with its actual curved ribbon and clear of intersections', () => {
    for (const scenario of RR.SCENARIOS.filter(s => RR.scenarioUsesContinuousWorld(s.id))) {
      const world = RR.createScenarioWorld(scenario);
      const start = RR.drivingStartPose(world, scenario.id, 81);
      const layout = RR.scenarioRoadLayout(scenario.id);
      const target = scenario.id === 'highway' ? RR.highwayRampPoseAt(start.station, layout).offset : layout.laneCenters.at(-1);
      const point = RR.mainRoadWorldPoint(world, start.station, target);
      expect(start.x, scenario.id).toBeCloseTo(point.x, 8);
      expect(start.y, scenario.id).toBeCloseTo(point.y, 8);
      const before = RR.mainRoadWorldPoint(world, start.station - .1, target);
      const after = RR.mainRoadWorldPoint(world, start.station + .1, target);
      expect(Math.cos(start.heading) * (before.x - after.x) + Math.sin(start.heading) * (before.y - after.y), scenario.id).toBeGreaterThan(0);
      for (const chunk of Object.values(world.chunks)) {
        if (chunk.hasIntersection) expect(Math.abs(start.station - (chunk.index * RR.CHUNK_SIZE + chunk.intersectionY)), scenario.id).toBeGreaterThanOrEqual(14);
      }
      if (scenario.id === 'highway') {
        const ramp = RR.highwayRampPoseAt(start.station, layout);
        expect(ramp.active).toBe(true);
        expect(start.station - ramp.taperY).toBeGreaterThanOrEqual(180);
        expect(ramp.startY - start.station).toBeGreaterThanOrEqual(6);
        expect(ramp.mergeProgress).toBe(0);
      }
    }
  });
});

describe('parking rules and control', () => {
  it('starts all curb courses stationary alongside a clear right-hand curb space', () => {
    for (const scn of Object.values(RR.PARKING_SCENARIOS).filter(s => s.curb.x)) {
      const car = { speed: 0, steering: 0, ...scn.startCar };
      expect(scn.curb.side).toBe('right');
      expect(car.x).toBeLessThan(scn.curb.x);
      expect(car.heading).toBe(-Math.PI / 2);
      expect(scn.obstacles.some(ob => RR.parkingCarHitsObstacle(car, ob)), scn.id).toBe(false);
      expect(RR.parkingCurbGapInches(car, scn.curb.x, 'right')).toBeGreaterThan(18);
    }
  });
  it('accepts each legal curb target and requires the uphill wheel direction', () => {
    for (const scn of Object.values(RR.PARKING_SCENARIOS).filter(s => s.curb.x)) {
      const car = { x: scn.slot.x, y: scn.slot.y, heading: -Math.PI / 2, speed: 0, steering: scn.uphill ? -.3 : 0 };
      expect(RR.parkingFinishCheck(car, scn), scn.id).toMatchObject({ ready: true });
      expect(RR.parkingFinishCheck({ ...car, speed: 1 }, scn).ready).toBe(false);
      expect(RR.parkingFinishCheck({ ...car, heading: Math.PI / 2 }, scn).ready).toBe(false);
      expect(RR.parkingFinishCheck({ ...car, x: scn.curb.x - 12 - 19 / 3.6 }, scn).ready).toBe(false);
      expect(RR.parkingFinishCheck({ ...car, x: scn.curb.x - 11 }, scn).ready).toBe(false);
      if (scn.uphill) expect(RR.parkingFinishCheck({ ...car, steering: 0 }, scn).ready).toBe(false);
    }
  });
  it('rejects overlapping cars, insufficient bumper clearance, and hydrant clearance even inside a broad target', () => {
    const scn = { ...RR.PARKING_SCENARIOS.hydrantParallel, stepCheck: () => true };
    const car = { x: scn.slot.x, y: scn.slot.y, heading: -Math.PI / 2, speed: 0, steering: 0 };
    expect(RR.parkingFinishCheck({ ...car, y: 310 }, scn).ready).toBe(false);
    expect(RR.parkingFinishCheck({ ...car, y: 300 }, scn).message).toContain('2 feet');
    expect(RR.parkingFinishCheck({ ...car, y: 200 }, scn).message).toContain('10 feet');
  });
  it('makes reversing right move the rear toward the right-hand curb, with consistent response across frame rates', () => {
    const run = fps => {
      const car = { x: 254.3, y: 95, heading: -Math.PI / 2, speed: 0, steering: 0 };
      for (let i = 0; i < fps * 2; i++) RR.parkingDrillMotion(car, { s: true, d: true }, 1 / fps);
      return car;
    };
    const slow = run(30), fast = run(120);
    expect(slow.x).toBeGreaterThan(254.3);
    expect(fast.speed).toBeCloseTo(slow.speed, 6);
    expect(Math.hypot(slow.x - fast.x, slow.y - fast.y)).toBeLessThan(1);
    for (let i = 0; i < 120; i++) RR.parkingDrillMotion(fast, { ' ': true }, 1 / 60);
    expect(fast.speed).toBe(0);
  });
});
