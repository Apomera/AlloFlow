import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, makeGrader;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('        var checkSignalCompliance = function');
  const end = source.indexOf('        var updatePeds = function', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate live signal grader');
  makeGrader = new Function('scope', 'with(scope) {' + source.slice(start, end) + '\nreturn checkSignalCompliance;}');
});

function junction({ theta = 0, direction = 1, type = 'sedan', signalType = 'light' } = {}) {
  const world = { profile: RR.CONTINUOUS_SCENARIO_PROFILES.suburban, spline: {
    centerAt: station => 48 + Math.tan(theta) * (station - 50),
    headingAt: () => theta, heightAt: () => 0,
  } };
  const signal = { x: 48, y: 50, type: signalType, state: signalType === 'light' ? 'red' : 'stop' };
  const car = { heading: (direction > 0 ? Math.PI / 2 : -Math.PI / 2) - theta, speed: 0 };
  const length = RR.vehicleFootprint(type).length;
  const lineStation = 50 - direction * 4.1;
  const place = (bumperGap, speed = 1) => {
    // Independently place the vehicle a physical distance from the painted
    // line; spline station is world Y, so its change includes cos(theta).
    const station = lineStation - direction * (length / 2 + bumperGap) * Math.cos(theta);
    Object.assign(car, RR.mainRoadWorldPoint(world, station, -direction * 1.5), { speed });
    car.heading = (direction > 0 ? Math.PI / 2 : -Math.PI / 2) - theta;
  };
  place(2, 0);
  const stats = { safetyScore: 100, majorViolations: 0, stops: 0 };
  const scope = { ...RR, currentVehicle: { id: type }, carRef: { current: car },
    infiniteWorldRef: { current: world }, signalsRef: { current: [signal] },
    blinkerRef: { current: 0 }, intersectionReservationRef: { current: {} },
    timeRef: { current: 10 }, statsRef: { current: stats }, eventToastRef: { current: null }, addToast: () => {} };
  const grade = makeGrader(scope);
  return { car, signal, stats, scope, place, grade };
}

describe('live signal grading respects the painted line and entering direction', () => {
  it.each([
    { type: 'sedan', theta: 0.55 }, { type: 'sedan', theta: -0.55 },
    { type: 'school_bus', theta: 0.55 }, { type: 'school_bus', theta: -0.55 },
  ])('does not charge a $type still 20 cm before a red stop line on a $theta rad road', ({ type, theta }) => {
    for (const direction of [-1, 1]) {
      const run = junction({ type, theta, direction });
      run.place(1.2); run.grade();
      run.place(0.2); run.grade();
      expect(run.stats.majorViolations).toBe(0);
      expect(run.stats.safetyScore).toBe(100);
    }
  });

  it.each([-1, 1])('does not penalize backing out after legal entry in direction %s', direction => {
    const run = junction({ direction });
    run.signal.state = 'green';
    run.place(1); run.grade();
    run.place(-0.4); run.grade();
    run.signal.state = 'red';
    run.place(0.4, -1); run.grade();
    expect(run.stats.majorViolations).toBe(0);
    expect(run.stats.safetyScore).toBe(100);
  });

  it.each([-1, 1])('still charges actual red-line entry in direction %s on a rotated road', direction => {
    const run = junction({ theta: 0.55, direction });
    run.place(1); run.grade();
    run.place(-0.5); run.grade();
    expect(run.stats.majorViolations).toBe(1);
    expect(run.stats.safetyScore).toBe(75);
  });

  it('does not call a return across a stop line a new rolling-stop entry', () => {
    const run = junction({ signalType: 'stop' });
    run.place(-0.5, -1); run.grade();
    run.place(0.5, -1); run.grade();
    expect(run.stats.majorViolations).toBe(0);
    expect(run.stats.safetyScore).toBe(100);
  });

  it.each([-0.55, 0.55])('credits a bus stopped physically before the line on a %s rad road', theta => {
    for (const direction of [-1, 1]) {
      const run = junction({ theta, direction, type: 'school_bus', signalType: 'stop' });
      run.place(0.25, 0); run.grade();
      run.scope.timeRef.current += 0.6; run.grade();
      expect(run.stats.stops).toBe(1);
      run.place(-0.4); run.grade();
      expect(run.stats.majorViolations).toBe(0);
    }
  });

  it.each([-1, 1])('projects the physical front of an angled cross-street bus in direction %s', direction => {
    const run = junction({ theta: 0.35, direction, type: 'school_bus' });
    const world = run.scope.infiniteWorldRef.current;
    world.getChunk = index => ({ hasIntersection: index === 1, intersectionY: 18 });
    run.signal._chunk = 1;
    run.signal._crossState = 'red';
    const pose = RR.crossStreetPose(48, 50, 0.35, 6.5, 48);
    const headingOffset = 0.4;
    const place = gap => {
      const point = RR.crossStreetWorldPoint(pose,
        -direction * (4.1 + 5 * Math.cos(headingOffset) + gap), direction * 1.5);
      Object.assign(run.car, point, {
        heading: (direction > 0 ? 0 : Math.PI) - 0.35 + headingOffset, speed: 1,
      });
    };
    place(1.2); run.grade();
    place(0.2); run.grade();
    expect(run.stats.majorViolations).toBe(0);
    place(-0.4); run.grade();
    expect(run.stats.majorViolations).toBe(1);
    expect(run.stats.safetyScore).toBe(75);
  });
});
