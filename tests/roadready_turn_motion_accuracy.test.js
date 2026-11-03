import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
let RR, makeUpdater;
beforeAll(() => {
  RR = require('../dev-tools/roadready_model.cjs').loadRoadReady();
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('        var updateTraffic = function(dt) {');
  const end = source.indexOf('        var updateWildlife = function(dt)', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate production traffic updater');
  makeUpdater = new Function('scope', 'with(scope) {' + source.slice(start, end) + '\nreturn updateTraffic;}');
});

function turn({ route = 'main-to-cross', direction = 1, theta = 0, intent = 'right',
  speed = 0, stopped = true, progress = 0, type = 'schoolbus' } = {}) {
  const profile = { lanes: 2, roadHalfWidth: 3.5 };
  const world = { profile, chunks: {}, getChunk: () => profile, spline: {
    centerAt: station => 48 + Math.tan(theta) * (station - 48), headingAt: () => theta,
  } };
  const cross = RR.crossStreetPose(48, 48, theta, 6.5, 40);
  const signal = { x: 48, y: 48, type: 'uncontrolled', _chunk: 1 };
  const actor = { id: 'turn-motion', type, speed, _turning: true, _turnProgress: progress,
    _turnIntent: intent, _turnSignal: signal, _chunk: 1, _stopArmActive: stopped,
    _busCycleTimer: 1000, personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 } };
  let path;
  if (route === 'main-to-cross') {
    Object.assign(actor, RR.mainRoadWorldPoint(world, 48 - direction * 2.2, -direction * 1.5),
      { heading: direction * Math.PI / 2 - theta, laneOffset: -direction * 1.5,
        _turnCrossPose: cross, _turnCrossDirection: (direction > 0) === (intent === 'right') ? 1 : -1 });
    path = RR.createIntersectionTurnPath(actor.x, actor.y, actor.heading, cross, actor._turnCrossDirection, intent);
    actor._turnTarget = path.endHeading;
  } else {
    Object.assign(actor, RR.crossStreetWorldPoint(cross, -direction * 2.2, direction * 1.5),
      { heading: RR.crossStreetTravelHeading(cross, direction), laneOffset: direction * 1.5,
        crossStreet: true, _crossPose: cross, _crossDirection: direction });
    path = RR.createCrossToMainTurnPath(world, signal, actor, intent);
  }
  actor._turnPath = path;
  Object.assign(actor, (RR.intersectionTurnPose || RR.intersectionTurnPoint)(path, progress));
  const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4, currentVehicle: { id: 'sedan' },
    currentScenario: { id: 'residential', speedLimit: 25, weather: 'clear' },
    trafficRef: { current: [actor] }, signalsRef: { current: [signal] },
    pedsRef: { current: [] }, cyclistsRef: { current: [] }, emergencyRef: { current: null },
    carRef: { current: { x: 90, y: 55, heading: -Math.PI / 2, speed: 0 } },
    infiniteWorldRef: { current: world }, statsRef: { current: { safetyScore: 100, crashes: 0 } },
    timeRef: { current: 6 }, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
    audioRef: { current: {} }, eventToastRef: { current: null }, addToast() {}, speak() {},
  };
  const update = makeUpdater(scope);
  return { actor, path, scope, step(dt) { update(dt); scope.timeRef.current += dt; } };
}

describe('committed traffic turns use actual vehicle speed', () => {
  it.each([30, 60, 144])('holds position and heading at zero speed for both routes at %i Hz', hz => {
    for (const route of ['main-to-cross', 'cross-to-main']) for (const direction of [-1, 1]) {
      for (const theta of [-0.35, 0, 0.35]) for (const progress of [0, 0.42]) {
        const run = turn({ route, direction, theta, progress });
        const before = { x: run.actor.x, y: run.actor.y, heading: run.actor.heading };
        for (let frame = 0; frame < hz; frame++) run.step(1 / hz);
        const description = JSON.stringify({ route, direction, theta, progress, hz });
        expect(run.actor.speed, description).toBe(0);
        expect(run.actor._turnProgress, description).toBe(progress);
        expect(run.actor.x, description).toBeCloseTo(before.x, 10);
        expect(run.actor.y, description).toBeCloseTo(before.y, 10);
        expect(run.actor.heading, description).toBeCloseTo(before.heading, 10);
        expect(run.actor._turning, description).toBe(true);
      }
    }
  });

  it.each([30, 60, 144])('advances slowly at its reported speed without a minimum creep rate at %i Hz', hz => {
    for (const route of ['main-to-cross', 'cross-to-main']) for (const speed of [0, 0.4, 1.4]) {
      const run = turn({ route, speed, stopped: false, type: 'car' });
      run.step(1 / hz);
      expect(run.actor.speed).toBeLessThan(2);
      expect(run.actor._turnProgress * run.path.length * hz, route + ' initial speed ' + speed)
        .toBeCloseTo(run.actor.speed, 9);
    }
  });

  it.each([30, 60, 144])('resumes a held turn and reaches the authored destination lane at %i Hz', hz => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      for (const route of ['main-to-cross', 'cross-to-main']) for (const direction of [-1, 1]) {
        for (const intent of ['left', 'right']) {
          const run = turn({ route, direction, intent, theta: 0.35, progress: 0.2 });
          for (let frame = 0; frame < hz / 2; frame++) run.step(1 / hz);
          expect(run.actor._turnProgress).toBe(0.2);
          run.actor._stopArmActive = false;
          for (let frame = 0; frame < hz * 12 && run.actor._turning; frame++) run.step(1 / hz);
          const description = JSON.stringify({ route, direction, intent, hz });
          expect(run.actor._turning, description).toBe(false);
          expect(!!run.actor.crossStreet, description).toBe(route === 'main-to-cross');
          expect(run.actor.x, description).toBeCloseTo(run.path.p3.x, 8);
          expect(run.actor.y, description).toBeCloseTo(run.path.p3.y, 8);
          expect(run.actor.heading, description).toBeCloseTo(run.path.endHeading, 8);
          expect(run.actor.laneOffset, description).toBe(run.path.laneOffset);
          expect(run.scope.statsRef.current.crashes).toBe(0);
        }
      }
    } finally { random.mockRestore(); }
  });
});

// A much denser independent walk of the raw curve supplies the reference
// distance. It does not use the production distance table or its inversion.
function distanceReference(path) {
  const samples = 8192, distances = [0];
  let previous = RR.intersectionTurnPoint(path, 0), length = 0;
  for (let index = 1; index <= samples; index++) {
    const next = RR.intersectionTurnPoint(path, index / samples);
    length += Math.hypot(next.x - previous.x, next.y - previous.y);
    distances.push(length);
    previous = next;
  }
  return { length, at(distance) {
    const d = Math.max(0, Math.min(length, distance));
    let low = 0, high = samples;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (distances[middle] < d) low = middle; else high = middle;
    }
    const fraction = (d - distances[low]) / Math.max(1e-12, distances[high] - distances[low]);
    return RR.intersectionTurnPoint(path, (low + fraction) / samples);
  } };
}

const routes = ['main-to-cross', 'cross-to-main'].flatMap(route => [-1, 1].flatMap(direction =>
  [-0.35, 0, 0.35].flatMap(theta => ['left', 'right'].map(intent => ({ route, direction, theta, intent })))));

describe('intersection turns advance by physical curve distance', () => {
  it.each(routes)('keeps $route direction $direction $intent at bend $theta within 2 mm of distance progress', options => {
    const { path } = turn(options);
    const reference = distanceReference(path);
    expect(Math.abs(path.length - reference.length)).toBeLessThan(0.002);
    const poseAt = RR.intersectionTurnPose || RR.intersectionTurnPoint;
    for (let index = 0; index <= 100; index++) {
      const fraction = index / 100, actual = poseAt(path, fraction);
      const expected = reference.at(reference.length * fraction);
      expect(Math.hypot(actual.x - expected.x, actual.y - expected.y), 'fraction ' + fraction).toBeLessThan(0.002);
      expect(Math.abs(Math.atan2(Math.sin(actual.heading - expected.heading),
        Math.cos(actual.heading - expected.heading)))).toBeLessThan(0.01);
      expect(actual.progress).toBe(fraction);
    }
    expect(poseAt(path, -1)).toEqual(poseAt(path, 0));
    expect(poseAt(path, 2)).toEqual(poseAt(path, 1));
  });

  it.each([30, 60, 144])('moves the production actors by their reported curve distance at %i Hz', hz => {
    for (const options of routes) for (const progress of [0, 0.2, 0.5, 0.8]) {
      const run = turn({ ...options, progress, stopped: false, speed: 0.4, type: 'car' });
      const reference = distanceReference(run.path);
      run.step(1 / hz);
      const expected = reference.at(progress * reference.length + run.actor.speed / hz);
      expect(Math.hypot(run.actor.x - expected.x, run.actor.y - expected.y),
        JSON.stringify({ ...options, progress, hz })).toBeLessThan(0.002);
    }
  });

  it('retains the raw cubic sampler for roundabout connectors and legacy paths', () => {
    const { path } = turn({ intent: 'left' });
    const raw = { ...path };
    delete raw.travelDistances;
    for (const progress of [0, 0.2, 0.5, 0.8, 1]) {
      expect(RR.intersectionTurnPose(raw, progress)).toEqual(RR.intersectionTurnPoint(raw, progress));
      expect(RR.intersectionTurnPoint(path, progress)).toEqual(RR.intersectionTurnPoint(raw, progress));
    }
  });
});
