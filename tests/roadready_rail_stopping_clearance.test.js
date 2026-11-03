import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, runPlayerRail, makeTrafficUpdater, runRideAlongRail;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const playerStart = source.indexOf('          // Active railroad gates are physical controls.');
  const playerEnd = source.indexOf('          // Wall collision (bounce + penalty)', playerStart);
  const trafficStart = source.indexOf('        var updateTraffic = function(dt) {');
  const trafficEnd = source.indexOf('        var updateWildlife = function(dt)', trafficStart);
  const rideStart = source.indexOf('            var raNearestRail = null;');
  const rideEnd = source.indexOf('            // Pedestrians and wildlife are full-stop hazards.', rideStart);
  if ([playerStart, playerEnd, trafficStart, trafficEnd, rideStart, rideEnd].some(index => index < 0)) {
    throw new Error('Cannot locate production railroad controllers');
  }
  runPlayerRail = new Function('scope', 'with(scope) {' + source.slice(playerStart, playerEnd) +
    '\nreturn { x: newX, y: newY, motionBlocked }; }');
  makeTrafficUpdater = new Function('scope', 'with(scope) {' + source.slice(trafficStart, trafficEnd) +
    '\nreturn updateTraffic; }');
  runRideAlongRail = new Function('scope', 'with(scope) {' + source.slice(rideStart, rideEnd) +
    '\nreturn { target: raTarget, nearest: raNearestRail }; }');
});

// The rendered rails have centers +/-0.72m and 0.10m width. Stop clearance is
// measured from the vehicle's front to the nearer rail's outer edge (+/-0.77m).
const RAIL_EDGE = 0.77;
const MIN_STOP = 15 * 0.3048;
const MAX_STOP = 50 * 0.3048;

function crossingFixture({ direction = -1, theta = 0, type = 'school_bus', active = false } = {}) {
  const crossing = { centerX: 48, centerY: 50, heading: theta, halfWidth: 3.5,
    chunkIdx: 1, cycleOffset: 0, activeControl: active };
  const profile = { lanes: 2, roadHalfWidth: 3.5 };
  const world = { profile, chunks: {}, getChunk: () => profile, _railroadCrossings: [crossing],
    spline: { centerAt: station => 48 + Math.tan(theta) * (station - 50),
      headingAt: () => theta, heightAt: () => 0 } };
  const size = RR.vehicleFootprint(type);
  const heading = (direction > 0 ? Math.PI / 2 : -Math.PI / 2) - theta;
  const pose = (gap, speed = 0, lateral = -direction * 1.6) => {
    const longitudinal = -direction * (RAIL_EDGE + size.length / 2 + gap);
    return { x: crossing.centerX + longitudinal * Math.sin(theta) + lateral * Math.cos(theta),
      y: crossing.centerY + longitudinal * Math.cos(theta) - lateral * Math.sin(theta),
      heading, speed, type };
  };
  const clearance = actor => -direction * ((actor.x - crossing.centerX) * Math.sin(theta) +
    (actor.y - crossing.centerY) * Math.cos(theta)) - size.length / 2 - RAIL_EDGE;
  return { crossing, world, type, direction, theta, pose, clearance };
}

function playerFixture(options = {}) {
  const fixture = crossingFixture(options);
  const car = fixture.pose(8);
  const stats = { safetyScore: 100, majorViolations: 0, stops: 0, crashes: 0 };
  const scope = { ...RR, car, currentVehicle: { id: fixture.type },
    infiniteWorldRef: { current: fixture.world }, timeRef: { current: 5 },
    statsRef: { current: stats }, eventToastRef: { current: null }, addToast: () => {},
    dt: 0.1, newX: car.x, newY: car.y, motionBlocked: false };
  const step = (nextGap, speed = 0, dt = 0.1) => {
    const next = fixture.pose(nextGap, speed);
    car.speed = speed;
    Object.assign(scope, { dt, newX: next.x, newY: next.y, motionBlocked: false });
    const result = runPlayerRail(scope);
    scope.timeRef.current += dt;
    car.x = result.x;
    car.y = result.y;
    return result;
  };
  const place = (gap, speed = 0, lateral) => Object.assign(car, fixture.pose(gap, speed, lateral));
  const dwell = (gap, seconds = 1.2) => {
    place(gap);
    for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += 0.1) step(gap);
  };
  const cross = () => {
    let blocked = false;
    for (let gap = fixture.clearance(car) - 0.2; gap >= -5; gap -= 0.2) {
      if (step(gap, 2).motionBlocked) { blocked = true; break; }
    }
    return blocked;
  };
  return { ...fixture, car, stats, scope, place, step, dwell, cross };
}

describe('railroad stops use front-bumper clearance from the nearest rail', () => {
  it.each([
    { description: 'credits a bus in its lane', stationOffset: 19, lateral: 1.5, legal: true },
    { description: 'rejects a bus parked on grass', stationOffset: 16, lateral: 6, legal: false },
  ])('$description beside the curved rural track', ({ stationOffset, lateral, legal }) => {
    const world = RR.createScenarioWorld({ id: 'rural', speedLimit: 45 });
    const chunkIdx = -39;
    const trackStation = chunkIdx * 32 + 19.2;
    const center = RR.mainRoadWorldPoint(world, trackStation, 0);
    const crossing = { chunkIdx, centerX: center.x, centerY: center.y, heading: center.heading,
      halfWidth: world.getChunk(chunkIdx).roadHalfWidth - 0.3, activeControl: false,
      cycleOffset: ((chunkIdx * 7) % 40 + 40) % 40 };
    world._railroadCrossings = [crossing];
    const point = RR.mainRoadWorldPoint(world, trackStation + stationOffset, lateral);
    const run = playerFixture();
    Object.assign(run.car, { x: point.x, y: point.y, heading: -Math.PI / 2 - point.heading, speed: 0 });
    run.scope.infiniteWorldRef.current = world;
    Object.assign(run.scope, { newX: point.x, newY: point.y });

    // The straight track tangent misses the authored lane and includes nearby
    // grass at this bend. Both bumpers are physically in the 15–50ft band.
    const dx = point.x - center.x, dy = point.y - center.y;
    const trackLateral = dx * Math.cos(center.heading) - dy * Math.sin(center.heading);
    expect(Math.abs(trackLateral) <= crossing.halfWidth).toBe(!legal);
    const body = RR.vehicleFootprint('school_bus');
    const angle = point.heading - center.heading;
    const bodyReach = (body.length * Math.abs(Math.cos(angle)) + body.width * Math.abs(Math.sin(angle))) / 2;
    const clearance = dx * Math.sin(center.heading) + dy * Math.cos(center.heading) - bodyReach - RAIL_EDGE;
    expect(clearance).toBeGreaterThan(MIN_STOP);
    expect(clearance).toBeLessThan(MAX_STOP);
    for (let frame = 0; frame < 12; frame++) {
      runPlayerRail(run.scope);
      run.scope.timeRef.current += run.scope.dt;
    }
    expect(run.stats.stops).toBe(legal ? 1 : 0);
  });

  it.each([-1, 1])('credits a normal in-lane bus stop and allows passage in direction %i', direction => {
    for (const theta of [-0.45, 0, 0.45]) for (const active of [false, true]) {
      const run = playerFixture({ direction, theta, active });
      run.dwell(8);
      expect(run.stats.stops, JSON.stringify({ direction, theta, active })).toBe(1);
      expect(run.cross()).toBe(false);
      expect(run.stats.majorViolations).toBe(0);
    }
  });

  it.each([MIN_STOP, MAX_STOP])('includes the legal stop boundary at %sm from the nearest rail', gap => {
    const run = playerFixture({ theta: 0.4 });
    run.dwell(gap);
    expect(run.stats.stops).toBe(1);
  });

  it.each([MIN_STOP - 0.15, MAX_STOP + 0.15])('does not credit a bus stopped %sm from the nearest rail', gap => {
    const run = playerFixture({ theta: -0.4 });
    run.dwell(gap);
    expect(run.stats.stops).toBe(0);
  });

  it('requires one continuous full stop and counts it once', () => {
    const run = playerFixture();
    run.dwell(8, 0.5);
    run.step(8, 0.5);
    run.dwell(8, 0.5);
    expect(run.stats.stops).toBe(0);
    run.dwell(8, 1.2);
    expect(run.stats.stops).toBe(1);
    run.dwell(8, 2);
    expect(run.stats.stops).toBe(1);
  });

  it.each([-1, 1])('holds a bus at active warning after its mandatory stop in direction %i', direction => {
    const run = playerFixture({ direction, active: true, theta: 0.35 });
    run.dwell(8);
    run.scope.timeRef.current = 21;
    expect(run.cross()).toBe(true);
    expect(run.clearance(run.car)).toBeGreaterThanOrEqual(MIN_STOP - 1e-6);
    expect(run.stats.majorViolations).toBe(1);
    run.scope.timeRef.current = 35;
    expect(run.cross()).toBe(false);
  });

  it.each([true, false])('blocks a bus that skips a stop while the track is clear (equipped gate: %s)', active => {
    const run = playerFixture({ active });
    expect(run.cross()).toBe(true);
    expect(run.clearance(run.car)).toBeGreaterThanOrEqual(MIN_STOP - 1e-6);
    expect(run.stats.majorViolations).toBe(1);
    run.dwell(run.clearance(run.car));
    expect(run.stats.stops).toBe(1);
    expect(run.cross()).toBe(false);
  });

  it.each([-1, 1])('requires a car to wait for an active warning but allows a clear crossing in direction %i', direction => {
    const clear = playerFixture({ direction, type: 'sedan', active: true });
    expect(clear.cross()).toBe(false);
    expect(clear.stats.majorViolations).toBe(0);
    expect(clear.stats.stops).toBe(0);
    const warning = playerFixture({ direction, type: 'sedan', active: true, theta: -0.35 });
    warning.scope.timeRef.current = 21;
    expect(warning.cross()).toBe(true);
    expect(warning.clearance(warning.car)).toBeGreaterThanOrEqual(MIN_STOP - 1e-6);
    expect(warning.stats.majorViolations).toBe(1);
  });

  it('requires a new bus stop after clearing the crossing and returning to the same approach', () => {
    const run = playerFixture({ active: true });
    run.dwell(8);
    expect(run.cross()).toBe(false);
    run.place(-40); run.step(-40);
    run.place(40); run.step(40);
    run.dwell(8);
    expect(run.stats.stops).toBe(2);
    expect(run.cross()).toBe(false);
    expect(run.stats.majorViolations).toBe(0);
  });

  it('does not retain a partial stop when a bus leaves the legal stopping area', () => {
    const run = playerFixture();
    run.dwell(8, 0.5);
    run.place(30); run.step(30);
    run.dwell(8, 0.5);
    expect(run.stats.stops).toBe(0);
  });

  it('allows a car already beyond the stop line to clear the track when the warning begins', () => {
    const run = playerFixture({ active: true, type: 'sedan', theta: 0.35 });
    run.place(MIN_STOP - 0.3, 4);
    run.scope.timeRef.current = 20;
    // A train has not reached the crossing. A car that entered legally can
    // continue across, and the far-side painted line is an opposing stop bar.
    for (let gap = MIN_STOP - 0.5; gap > -18; gap -= 0.2) {
      run.scope.timeRef.current = 20.5;
      expect(run.step(gap, 4).motionBlocked).toBe(false);
    }
    expect(run.stats.majorViolations).toBe(0);
  });
});

describe('automatic drivers share the legal rail stopping clearance', () => {
  const aiApproaches = [-1, 1].flatMap(direction => [
    { direction, active: true, startTime: 1 }, { direction, active: false, startTime: 1 },
    { direction, active: true, startTime: 21 },
  ]);
  it.each(aiApproaches)('AI bus stops before crossing (direction $direction, equipped gate $active, clock $startTime)', ({ direction, active, startTime }) => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      const fixture = crossingFixture({ direction, theta: 0.35, type: 'schoolbus', active });
      const actor = { ...fixture.pose(35, 8), id: 'rail-bus', laneOffset: -direction * 1.6,
        personality: { speedBias: 1, followMult: 1, aggro: 0, rollsStops: 0 } };
      const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4,
        trafficRef: { current: [actor] }, pedsRef: { current: [] }, signalsRef: { current: [] },
        cyclistsRef: { current: [] }, emergencyRef: { current: null },
        carRef: { current: { x: 100, y: 50, heading: -Math.PI / 2, speed: 0 } },
        infiniteWorldRef: { current: fixture.world }, statsRef: { current: { safetyScore: 100, crashes: 0 } },
        currentScenario: { id: 'residential', speedLimit: 35, weather: 'clear' },
        currentVehicle: { id: 'sedan' }, timeRef: { current: startTime },
        stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
        addToast: () => {}, speak: () => {}, audioRef: { current: {} }, eventToastRef: { current: null } };
      const update = makeTrafficUpdater(scope);
      let observedStop = false, passed = false, closestUnderWarning = Infinity;
      for (let frame = 0; frame < 18 * 60; frame++) {
        update(1 / 60);
        const gap = fixture.clearance(actor);
        if (startTime === 21 && scope.timeRef.current < 34) closestUnderWarning = Math.min(closestUnderWarning, gap);
        if (Math.abs(actor.speed) < 0.2 && gap >= MIN_STOP && gap <= MAX_STOP) observedStop = true;
        if (gap < -4) { passed = true; break; }
        scope.timeRef.current += 1 / 60;
      }
      expect(observedStop).toBe(true);
      expect(passed).toBe(true);
      if (startTime === 21) expect(closestUnderWarning).toBeGreaterThanOrEqual(MIN_STOP - 1e-6);
    } finally { random.mockRestore(); }
  });

  it.each([-1, 1])('Ride-Along recognizes an in-lane mandatory bus stop in direction %i', direction => {
    const fixture = playerFixture({ direction, theta: -0.35, active: true });
    const car = fixture.car;
    const scope = { ...RR, car, veh: { id: 'school_bus' }, raWorld: fixture.world,
      ras: { railStops: {} }, rNow: 5, raSpeedMph: 0, raPlanDistance: 100,
      raTarget: 25, scn: { weather: 'clear' }, dt: 0.1 };
    let result = runRideAlongRail(scope);
    expect(result.nearest).not.toBeNull();
    for (let frame = 0; frame < 15; frame++) {
      fixture.step(8);
      scope.rNow = fixture.scope.timeRef.current;
      scope.raTarget = 25;
      result = runRideAlongRail(scope);
    }
    expect(result.target).toBe(25);
    expect(result.nearest).toBeNull();
    scope.rNow = 21;
    scope.raTarget = 25;
    result = runRideAlongRail(scope);
    expect(result.target).toBeLessThan(25);
    expect(result.nearest).not.toBeNull();
    scope.rNow = 35;
    scope.raTarget = 25;
    expect(runRideAlongRail(scope)).toEqual({ target: 25, nearest: null });
  });

  it('Ride-Along ignores a warning outside the finite road approach', () => {
    const fixture = crossingFixture({ theta: 0.35, active: true });
    const scope = { ...RR, car: fixture.pose(8, 0, 8), veh: { id: 'school_bus' },
      raWorld: fixture.world, rNow: 21, raSpeedMph: 0, raPlanDistance: 100,
      ras: { railStops: {} }, raTarget: 25, scn: { weather: 'clear' }, dt: 0.1 };
    expect(runRideAlongRail(scope)).toEqual({ target: 25, nearest: null });
  });
});
