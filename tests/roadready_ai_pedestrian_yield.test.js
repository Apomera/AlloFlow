import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, makeUpdater, makePedestrianUpdater;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('        var updateTraffic = function(dt) {');
  const end = source.indexOf('        var updateWildlife = function(dt)', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate live traffic updater');
  makeUpdater = new Function('scope', 'with(scope) {' + source.slice(start, end) + '\nreturn updateTraffic;}');
  const pedStart = source.indexOf('        var updatePeds = function(dt) {');
  const pedEnd = source.indexOf('        // scanSpatialHazards:', pedStart);
  makePedestrianUpdater = new Function('scope', 'with(scope) {' + source.slice(pedStart, pedEnd) + '\nreturn updatePeds;}');
});

function encounter({ direction = -1, theta = 0, bend = 0, farCurb = false, crossing = false, type = 'car', dwell = 0 } = {}) {
  const profile = { lanes: 2, roadHalfWidth: 3.5 };
  const world = theta || bend ? { profile, chunks: {}, getChunk: () => profile,
    spline: bend ? { centerAt: station => 48 + bend * Math.sin((station - 40) * 0.05) * 4,
      headingAt: station => Math.atan(bend * Math.cos((station - 40) * 0.05) * 0.2) }
      : { centerAt: station => 48 + Math.tan(theta) * (station - 40), headingAt: () => theta } } : null;
  const point = (station, lateral) => world ? RR.mainRoadWorldPoint(world, station, lateral)
    : { x: 48 + lateral, y: station };
  const lane = -direction * 1.5;
  const actor = { ...point(40 - direction * 25, lane), id: 'yield-test', type,
    heading: (direction > 0 ? Math.PI / 2 : -Math.PI / 2) - (world ? world.spline.headingAt(40 - direction * 25) : 0),
    laneOffset: lane, speed: 13.4, _busCycleTimer: 100, _stopArmActive: false };
  const pedLateral = crossing ? lane : -direction * (farCurb ? -4.5 : 4.5);
  const pedestrian = { ...point(40, pedLateral), homeX: point(40, pedLateral).x,
    kind: 'adult', waitingAtCrosswalk: true, crossing, crossDwell: dwell,
    crosswalkY: 40, sidewalkLeft: 43.5, sidewalkRight: 52.5,
    _curvedRoadFrame: !!world, _roadStation: 40, _sidewalkOffset: 4.5,
    _sidewalkLateral: pedLateral, crossDirection: Math.sign(pedLateral) };
  const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4,
    trafficRef: { current: [actor] }, pedsRef: { current: [pedestrian] }, signalsRef: { current: [] },
    cyclistsRef: { current: [] }, emergencyRef: { current: null },
    carRef: { current: { x: 90, y: 55, heading: -Math.PI / 2, speed: 0 } },
    infiniteWorldRef: { current: world }, statsRef: { current: { safetyScore: 100 } },
    currentScenario: { id: 'residential', speedLimit: 35, weather: 'clear' }, currentVehicle: { id: 'sedan' },
    timeRef: { current: 0 }, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
    addToast: () => {}, speak: () => {}, audioRef: { current: {} }, eventToastRef: { current: null },
  };
  const updateTraffic = makeUpdater(scope);
  return { actor, pedestrian, scope, world,
    step: dt => { scope.timeRef.current += dt; updateTraffic(dt); },
    distance: () => (40 - (world ? RR.mainRoadLocalPoint(world, actor.x, actor.y).longitudinal : actor.y)) * direction,
  };
}

describe('ordinary traffic yields to pedestrian intent and protects the crossing', () => {
  it.each([30, 60, 144])('lets the actual walker complete the crossing before traffic resumes at %i Hz', hz => {
    for (const direction of [-1, 1]) for (const theta of [0, 0.35]) {
      const run = encounter({ direction, theta, farCurb: true });
      const updatePedestrian = makePedestrianUpdater(run.scope);
      let started = false, completed = false, stopped = false;
      for (let frame = 0; frame < hz * 20; frame++) {
        run.step(1 / hz); updatePedestrian(1 / hz);
        if (run.pedestrian.crossing) started = true;
        if (started && !run.pedestrian.crossing) completed = true;
        if (run.actor.speed < 0.1) stopped = true;
        expect(RR.pointOverlapsVehicle(run.actor, RR.vehicleFootprint('car'), run.pedestrian, 0.28)).toBe(false);
        if (run.distance() < 0) expect(completed).toBe(true);
        if (completed && run.distance() < -5) break;
      }
      expect(stopped).toBe(true); expect(completed).toBe(true);
      expect(run.distance()).toBeLessThan(-5);
    }
  });

  it.each([0, 0.35, -0.35])('stops for either curb in both directions on road angle %s', theta => {
    for (const direction of [-1, 1]) for (const farCurb of [false, true]) {
      const run = encounter({ direction, theta, farCurb });
      let stopped = false;
      for (let frame = 0; frame < 60 * 12; frame++) {
        run.step(1 / 60);
        if (run.actor.speed < 0.1 && run.distance() > RR.vehicleFootprint('car').length / 2) stopped = true;
        if (run.distance() < 0) break;
      }
      expect(stopped, JSON.stringify({ direction, theta, farCurb })).toBe(true);
    }
  });

  it.each([30, 60, 144])('holds every vehicle body before a stationary active crosser at %i Hz and resumes on clearance', hz => {
    for (const type of ['car', 'schoolbus']) for (const theta of [0, 0.35, -0.35]) for (const direction of [-1, 1]) {
      const run = encounter({ direction, theta, type, crossing: true });
      let contacts = 0;
      for (let frame = 0; frame < hz * 6; frame++) {
        run.step(1 / hz);
        if (RR.pointOverlapsVehicle(run.actor, RR.vehicleFootprint(type), run.pedestrian, 0.28)) contacts++;
      }
      expect(contacts, JSON.stringify({ type, theta, direction })).toBe(0);
      expect(run.actor.speed).toBeLessThan(0.1);
      run.scope.pedsRef.current = [];
      for (let frame = 0; frame < hz * 3; frame++) run.step(1 / hz);
      expect(run.actor.speed).toBeGreaterThan(2);
    }
  });

  it.each([30, 60, 144].flatMap(hz => [[hz, false], [hz, true]]))('keeps a mixed-size queue clear at %i Hz with reversed iteration %s', (hz, reversed) => {
    const run = encounter({ crossing: true });
    run.scope.trafficRef.current.push(
      { ...run.actor, id: 'queue-bus', type: 'schoolbus', y: 76 },
      { ...run.actor, id: 'queue-tail', y: 87 });
    const actors = run.scope.trafficRef.current;
    if (reversed) actors.reverse();
    let pedestrianContacts = 0, vehicleContacts = 0;
    for (let frame = 0; frame < hz * 10; frame++) {
      run.step(1 / hz);
      for (let a = 0; a < actors.length; a++) {
        if (RR.pointOverlapsVehicle(actors[a], RR.vehicleFootprint(actors[a].type), run.pedestrian, 0.28)) pedestrianContacts++;
        for (let b = a + 1; b < actors.length; b++) {
          if (RR.vehicleRectsOverlap(actors[a], RR.vehicleFootprint(actors[a].type), actors[b], RR.vehicleFootprint(actors[b].type))) vehicleContacts++;
        }
      }
    }
    expect(pedestrianContacts).toBe(0); expect(vehicleContacts).toBe(0);
    run.scope.pedsRef.current = [];
    for (let frame = 0; frame < hz * 5; frame++) run.step(1 / hz);
    for (const actor of actors) expect(actor.speed).toBeGreaterThan(2);
  });

  it.each([-1, 1])('stops safely along a varying road curve with bend sign %i', bend => {
    for (const direction of [-1, 1]) {
      const run = encounter({ bend, direction, crossing: true, type: 'schoolbus' });
      for (let frame = 0; frame < 360; frame++) {
        run.step(1 / 60);
        expect(RR.pointOverlapsVehicle(run.actor, RR.vehicleFootprint('schoolbus'), run.pedestrian, 0.28)).toBe(false);
      }
      expect(run.actor.speed).toBeLessThan(0.1);
    }
  });

  it.each([30, 60, 144])('can stop a committed turn for a pedestrian without advancing its route through them at %i Hz', hz => {
    const run = encounter({ crossing: true });
    const pose = RR.crossStreetPose(48, 48, 0, 6.5, 40);
    const path = RR.createIntersectionTurnPath(46.5, 48, Math.PI / 2, pose, 1, 'right');
    const signal = { type: 'uncontrolled', x: 48, y: 48 };
    Object.assign(run.actor, { x: 46.5, y: 48, heading: Math.PI / 2, speed: 3,
      _turning: true, _turnPath: path, _turnProgress: 0, _turnIntent: 'right',
      _turnSignal: signal, _turnTarget: path.endHeading, _turnCrossPose: pose, _turnCrossDirection: 1 });
    Object.assign(run.pedestrian, RR.intersectionTurnPoint(path, 0.8));
    run.scope.signalsRef.current = [signal];
    for (let frame = 0; frame < hz * 5; frame++) {
      run.step(1 / hz);
      expect(RR.pointOverlapsVehicle(run.actor, RR.vehicleFootprint('car'), run.pedestrian, 0.28)).toBe(false);
    }
    expect(run.actor.speed).toBeLessThan(0.1);
    const progress = run.actor._turnProgress;
    for (let frame = 0; frame < hz; frame++) run.step(1 / hz);
    expect(run.actor._turnProgress).toBeCloseTo(progress, 10);
    run.scope.pedsRef.current = [];
    for (let frame = 0; frame < hz * 5; frame++) run.step(1 / hz);
    expect(run.actor._turning).toBe(false);
    expect(run.actor.crossStreet).toBe(true);
  });

  it('rejects a recycle endpoint occupied by a pedestrian, then resumes recycling once clear', () => {
    const run = encounter({ crossing: true });
    const profile = { lanes: 2, roadHalfWidth: 3.5 };
    run.scope.infiniteWorldRef.current = { profile, chunks: {}, getChunk: () => profile,
      spline: { centerAt: () => 48, headingAt: () => 0 } };
    Object.assign(run.actor, { y: 120, speed: 10 });
    Object.assign(run.pedestrian, { y: 25.8, crosswalkY: 25.8, _roadStation: 25.8, _curvedRoadFrame: true });
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      run.step(1 / 60);
      expect(RR.pointOverlapsVehicle(run.actor, RR.vehicleFootprint('car'), run.pedestrian, 0.28)).toBe(false);
      expect(run.actor.y).toBeGreaterThan(100);
      run.scope.pedsRef.current = [];
      run.step(1 / 60);
      expect(run.actor.y).toBeCloseTo(25.8, 6);
    } finally { random.mockRestore(); }
  });

  it.each([30, 60, 144])('uses bounded emergency deceleration when a feasible stop begins inside the comfortable envelope at %i Hz', hz => {
    const run = encounter({ crossing: true, type: 'schoolbus' });
    let peakDeceleration = 0;
    for (let frame = 0; frame < hz * 5; frame++) {
      const before = run.actor.speed;
      run.step(1 / hz);
      peakDeceleration = Math.max(peakDeceleration, (before - run.actor.speed) * hz);
    }
    expect(peakDeceleration).toBeLessThanOrEqual(6.5 + 1e-7);
    expect(run.actor.speed).toBeLessThan(0.1);
  });

  it("does not yield to DON'T WALK curb intent but protects an active crossing after the phase changes", () => {
    const run = encounter();
    const signal = { x: 48, y: 40, type: 'light', state: 'green' };
    expect(RR.trafficPedestrianControl(null, run.actor, [run.pedestrian], [signal], 1 / 60).required).toBe(false);
    run.pedestrian.crossing = true;
    expect(RR.trafficPedestrianControl(null, run.actor, [run.pedestrian], [signal], 1 / 60).required).toBe(true);
  });

  it('does not demand another courtesy stop for a pedestrian resting after a completed crossing', () => {
    const run = encounter({ dwell: 8 });
    let slowest = Infinity;
    for (let frame = 0; frame < 60 * 4 && run.distance() > 0; frame++) {
      run.step(1 / 60); slowest = Math.min(slowest, run.actor.speed);
    }
    expect(slowest).toBeGreaterThan(10);
  });
});
