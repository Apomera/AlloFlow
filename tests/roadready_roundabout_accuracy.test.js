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

function circulating(angle, speed = 4, type = 'car') {
  return {
    ...RR.roundaboutPose(angle), id: 'circulating', type, speed,
    _roundaboutState: 'circulating', _roundaboutAngle: angle,
    _roundaboutRadius: RR.ROUNDABOUT_LANE_RADIUS,
  };
}

function approachFromEast() {
  const vehicle = RR.spawnRoundaboutTraffic({ traffic: 'medium' })
    .find((actor) => actor._roundaboutState === 'approach');
  const entry = RR.roundaboutPose(0);
  return Object.assign(vehicle, {
    x: entry.x + 20, y: RR.roundaboutApproach(1).y, heading: Math.PI, speed: 18 * RR.MPH_TO_MS,
  });
}

describe('Road Ready roundabout direction is independent of frame rate', () => {
  function driveCircle(hz, direction, startAngle, radius = RR.ROUNDABOUT_LANE_RADIUS, speed = 1.5) {
    let angle = startAngle;
    let previous = { ...RR.roundaboutPose(angle, radius), speed };
    let state = { inCircle: true, lastAngle: angle, wrongWaySeconds: 0 };
    const events = [];
    let firstViolationAt = null;
    for (let frame = 0; frame < hz * 2; frame++) {
      angle += direction * speed / radius / hz;
      const current = { ...RR.roundaboutPose(angle, radius), speed };
      const result = RR.assessRoundaboutFrame(state, previous, current, [], 1, 1 / hz);
      if (result.events.includes('wrong_way') && firstViolationAt === null) {
        firstViolationAt = (frame + 1) / hz;
      }
      events.push(...result.events);
      state = result.state;
      previous = current;
    }
    return { events, firstViolationAt };
  }

  it.each(FRAME_RATES)('detects sustained wrong-way motion at %i Hz, including angle wrap', (hz) => {
    const result = driveCircle(hz, 1, Math.PI - 0.08);
    expect(result.events.filter((event) => event === 'wrong_way')).toHaveLength(1);
    expect(result.firstViolationAt).toBeGreaterThanOrEqual(0.75);
    expect(result.firstViolationAt).toBeLessThanOrEqual(0.75 + 1 / hz + 1e-8);
  });

  it.each(FRAME_RATES)('accepts counterclockwise circulation through angle wrap at %i Hz', (hz) => {
    expect(driveCircle(hz, -1, -Math.PI + 0.08).events).not.toContain('wrong_way');
  });

  it.each(FRAME_RATES)('detects slow wrong-way travel near the outer road edge at %i Hz', (hz) => {
    const result = driveCircle(hz, 1, Math.PI - 0.08, 10.5, 1.1);
    expect(result.events.filter((event) => event === 'wrong_way')).toHaveLength(1);
    expect(result.firstViolationAt).toBeGreaterThanOrEqual(0.75);
    expect(result.firstViolationAt).toBeLessThanOrEqual(0.75 + 1 / hz + 1e-8);
  });
});

describe('Road Ready roundabout entry accounts for complete vehicles', () => {
  it('keeps an entry blocked while a passing sedan rear still occupies it', () => {
    const actor = circulating(-0.1);
    expect(RR.roundaboutGapSeconds([actor], 0, null)).toBe(0);
  });

  it('opens the entry once the rear has cleared, without mistaking it for approaching traffic', () => {
    expect(RR.roundaboutGapSeconds([circulating(-0.6)], 0, null)).toBeGreaterThan(3);
  });

  it('measures approaching gaps to the front bumper and accounts for longer vehicles', () => {
    const carGap = RR.roundaboutGapSeconds([circulating(1, 4, 'car')], 0, null);
    const busGap = RR.roundaboutGapSeconds([circulating(1, 4, 'schoolbus')], 0, null);
    expect(carGap).toBeGreaterThan(0);
    expect(carGap).toBeLessThan(2); // The center takes two seconds to reach the entry.
    expect(busGap).toBeLessThan(carGap);
  });

  it('treats a stopped vehicle across the entry as blocking it', () => {
    expect(RR.roundaboutGapSeconds([circulating(0, 0)], 0, null)).toBe(0);
  });

  it.each(FRAME_RATES)('stops an 18 mph approach before its front enters the circulating road at %i Hz', (hz) => {
    const approach = approachFromEast();
    const blocker = circulating(-Math.PI / 4, 0);
    const traffic = [approach, blocker];
    const center = RR.MAP_SIZE / 2;
    const halfLength = RR.vehicleFootprint(approach.type).length / 2;
    let closestFront = Infinity;
    for (let frame = 0; frame < hz * 8; frame++) {
      const previousX = approach.x;
      RR.updateRoundaboutTrafficVehicle(approach, 1 / hz, traffic);
      closestFront = Math.min(closestFront, approach.x - center - halfLength);
      expect(approach._roundaboutState).toBe('approach');
      expect(approach.x).toBeLessThanOrEqual(previousX + 1e-8);
      expect(approach.y).toBeCloseTo(center - 1.75, 8);
      expect(Math.cos(approach.heading)).toBeLessThan(-0.99);
      expect(approach.speed).toBeGreaterThanOrEqual(0);
    }
    expect(closestFront).toBeGreaterThanOrEqual(10.5 - 1e-8);
    expect(approach.speed).toBeLessThan(0.1);
  });

  it('yields to the learner already in the circle even when ambient traffic is empty', () => {
    const approach = approachFromEast();
    const player = { ...RR.roundaboutPose(-Math.PI / 4 + 0.2), speed: 4, type: 'sedan' };
    for (let frame = 0; frame < 60 * 8; frame++) {
      RR.updateRoundaboutTrafficVehicle(approach, 1 / 60, [approach], player);
      expect(approach._roundaboutState).toBe('approach');
    }
    expect(approach.speed).toBeLessThan(0.1);
    expect(approach.x - RR.MAP_SIZE / 2 - RR.vehicleFootprint(approach.type).length / 2)
      .toBeGreaterThanOrEqual(10.5 - 1e-8);
  });

  it('enters when the circulating roadway is clear', () => {
    const approach = approachFromEast();
    for (let frame = 0; frame < 60 * 12 && approach._roundaboutState !== 'circulating'; frame++) {
      RR.updateRoundaboutTrafficVehicle(approach, 1 / 60, [approach]);
    }
    expect(approach._roundaboutState).toBe('circulating');
  });
});
