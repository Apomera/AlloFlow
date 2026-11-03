import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.RR_AI_RIDER_SOURCE || 'stem_lab/stem_tool_roadready.js';
let RR, makeTraffic, makeRiders, makeBeforeTraffic;
function extract(source, startText, endText, name) {
  const start = source.indexOf(startText), end = source.indexOf(endText, start);
  if (start < 0 || end < start) throw Error('Actual ' + name + ' updater missing');
  return new Function('scope', 'with(scope){' + source.slice(start, end) + '\nreturn ' + name + ';}');
}
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(sourcePath, 'roadReady'); RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync(sourcePath, 'utf8');
  const trafficStart = '        var updateTraffic = function(dt) {';
  const trafficEnd = '        var updateWildlife = function(dt)';
  makeTraffic = extract(source, trafficStart, trafficEnd, 'updateTraffic');
  makeRiders = extract(source, '        var updateCyclists = function(dt) {', '        // ── Bus stop-arm compliance', 'updateCyclists');
  makeBeforeTraffic = extract(readFileSync('tmp/roadready-ai-rider-following-20261102/before.js', 'utf8'), trafficStart, trafficEnd, 'updateTraffic');
});

function encounter({ type = 'car', riderType = 'motorcycle', finite = true,
  direction = 1, theta = 0, bend = 0, cross = false, light = false } = {}) {
  const profile = { lanes: 2, roadHalfWidth: 3.5, hasBikeLane: true };
  const world = finite ? null : { profile, chunks: {},
    getChunk: index => ({ ...profile, hasIntersection: index === 1, intersectionY: 18 }),
    spline: bend ? { centerAt: s => 48 + bend * 4 * Math.sin((s - 50) * 0.05),
      headingAt: s => Math.atan(bend * 0.2 * Math.cos((s - 50) * 0.05)) }
      : { centerAt: s => 48 + Math.tan(theta) * (s - 50), headingAt: () => theta } };
  const point = (station, lateral) => world ? RR.mainRoadWorldPoint(world, station, lateral)
    : { x: 48 + lateral, y: station, heading: 0 };
  const center = point(50, 0), pose = RR.crossStreetPose(center.x, center.y, world ? center.heading : theta, 6.5, 96);
  const lane = cross ? direction * 1.5 : -direction * 1.6;
  const riderLane = cross ? lane : RR.vulnerableRoadUserLaneOffset(profile, riderType, direction, -direction * 2.8);
  function place(actor, progress, lateral) {
    const where = cross ? RR.crossStreetWorldPoint(pose, direction * progress, lateral)
      : point(50 + direction * progress * (world && !bend ? Math.cos(theta) : 1), lateral);
    Object.assign(actor, where, { heading: cross ? (direction > 0 ? 0 : Math.PI) - pose.heading
      : direction * Math.PI / 2 - where.heading });
    actor._roadStation = world ? RR.mainRoadLocalPoint(world, actor.x, actor.y).longitudinal : actor.y;
    if (actor.type === 'cyclist' || actor.type === 'motorcycle') actor._bikeLane = lateral;
    else actor.laneOffset = lateral;
    if (cross) Object.assign(actor, { crossStreet: true, _crossPose: pose, _crossDirection: direction, _chunk: 1 });
    return actor;
  }
  const traffic = place({ id: 'ai-follower', type, speed: 10,
    personality: { speedBias: 1, followMult: 1, aggro: 0, rollsStops: 0 }, _busCycleTimer: 1000 }, -20, lane);
  const rider = place({ id: 'rider-leader', type: riderType, speed: 0, _cruiseSpeed: 0 }, 0, riderLane);
  const signal = { x: center.x, y: center.y, type: 'light', _chunk: 1,
    state: cross ? 'green' : 'red', _crossState: cross ? 'red' : 'green' };
  traffic._turnSignalSeen = signal;
  const parked = cross ? RR.crossStreetWorldPoint(pose, 0, lane + 18) : point(40, lane + 18);
  const scope = { ...RR, MAP_SIZE: 96, CROSS_STREET_LENGTH: 96, RR_CURB_YIELD_HOLD_MAX: 4,
    trafficRef: { current: [traffic] }, cyclistsRef: { current: [rider] }, signalsRef: { current: light ? [signal] : [] },
    pedsRef: { current: [] }, emergencyRef: { current: null }, wildlifeRef: { current: null },
    infiniteWorldRef: { current: world }, carRef: { current: { ...parked, heading: traffic.heading, speed: 0 } },
    currentVehicle: { id: 'sedan' }, currentScenario: { id: 'suburban', speedLimit: 35, weather: 'clear' },
    timeRef: { current: 10 }, statsRef: { current: { safetyScore: 100, crashes: 0, hardBrakes: 0 } },
    stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
    addToast() {}, speak() {}, audioRef: { current: {} }, eventToastRef: { current: null } };
  const updateTraffic = makeTraffic(scope), updateRiders = makeRiders(scope);
  return { scope, traffic, rider, lane, riderLane, pose, point, place,
    step(dt, moveRiders = false) { updateTraffic(dt); if (moveRiders) updateRiders(dt); scope.timeRef.current += dt; },
    clear(actor = traffic) { return !RR.vehicleRectsOverlap(actor, RR.vehicleFootprint(actor.type), rider, RR.vulnerableRoadUserFootprint(rider)); },
    green() { signal.state = cross ? 'red' : 'green'; signal._crossState = cross ? 'green' : 'red'; },
  };
}

const approaches = [
  { type: 'car', riderType: 'cyclist', hz: 30 },
  { type: 'schoolbus', riderType: 'motorcycle', direction: -1, hz: 60 },
  { type: 'car', riderType: 'motorcycle', direction: -1, hz: 144 },
  { type: 'schoolbus', riderType: 'cyclist', hz: 60 },
  { type: 'car', riderType: 'cyclist', finite: false, theta: 0.35, hz: 144 },
  { type: 'schoolbus', riderType: 'motorcycle', finite: false, theta: -0.35, direction: -1, hz: 30 },
  { type: 'car', riderType: 'motorcycle', finite: false, bend: 1, hz: 60 },
  { type: 'schoolbus', riderType: 'cyclist', finite: false, bend: -1, direction: -1, hz: 60 },
  { type: 'car', riderType: 'cyclist', cross: true, theta: 0.3, hz: 30 },
  { type: 'schoolbus', riderType: 'motorcycle', cross: true, theta: -0.3, direction: -1, hz: 144 },
  { type: 'car', riderType: 'motorcycle', finite: false, cross: true, theta: -0.35, hz: 60 },
  { type: 'schoolbus', riderType: 'cyclist', finite: false, cross: true, theta: 0.35, direction: -1, hz: 60 },
];

describe('ordinary AI traffic follows the full bodies of vulnerable road users', () => {
  it.each(approaches)('stops behind a rider and follows its departure without contact: %j', options => {
    const run = encounter(options), dt = 1 / options.hz;
    let peakDeceleration = 0;
    for (let tick = 0; tick < options.hz * 10; tick++) {
      const before = run.traffic.speed; run.step(dt);
      peakDeceleration = Math.max(peakDeceleration, (before - run.traffic.speed) / dt);
      expect(run.clear(), 'stationary rider body contact').toBe(true);
    }
    expect(run.traffic.speed).toBeLessThan(0.1);
    expect(peakDeceleration, 'ordinary approach starts with enough physical stopping clearance').toBeLessThanOrEqual(5.5 + 1e-6);
    run.rider.speed = 2;
    for (let tick = 0; tick < options.hz * 4; tick++) {
      run.place(run.rider, (tick + 1) * 2 / options.hz, run.riderLane);
      run.step(dt); expect(run.clear(), 'moving rider body contact').toBe(true);
    }
    expect(run.traffic.speed).toBeGreaterThan(0.5);
    expect(run.scope.statsRef.current).toEqual({ safetyScore: 100, crashes: 0, hardBrakes: 0 });
  });

  it.each([
    { type: 'car', riderType: 'motorcycle', hz: 60 },
    { type: 'schoolbus', riderType: 'cyclist', direction: -1, finite: false, hz: 30 },
    { type: 'car', riderType: 'cyclist', cross: true, finite: false, theta: 0.3, hz: 144 },
  ])('joins and releases a real red-light rider queue: %j', options => {
    const run = encounter({ ...options, light: true }), dt = 1 / options.hz;
    run.place(run.traffic, -40, run.lane); run.place(run.rider, -20, run.riderLane);
    run.rider.speed = 6; run.rider._cruiseSpeed = 6;
    for (let tick = 0; tick < options.hz * 12; tick++) {
      run.step(dt, true); expect(run.clear(), 'combined red queue contact').toBe(true);
    }
    expect(run.rider.speed).toBeLessThan(0.1); expect(run.traffic.speed).toBeLessThan(0.1);
    run.green();
    for (let tick = 0; tick < options.hz * 4; tick++) {
      run.step(dt, true); expect(run.clear(), 'combined green queue contact').toBe(true);
    }
    expect(run.rider.speed).toBeGreaterThan(0.5); expect(run.traffic.speed).toBeGreaterThan(0.5);
    expect(run.scope.statsRef.current).toEqual({ safetyScore: 100, crashes: 0, hardBrakes: 0 });
  });

  it.each([1 / 144, 1 / 30, 0.2])('preserves a close full-body gap during late integration: dt=%s', dt => {
    for (const type of ['car', 'schoolbus']) for (const riderType of ['cyclist', 'motorcycle']) {
      for (const cross of [false, true]) for (const direction of [-1, 1]) {
        const run = encounter({ type, riderType, cross, direction, finite: false, theta: 0.3 });
        const gap = (RR.vehicleFootprint(type).length + RR.vulnerableRoadUserFootprint(run.rider).length) / 2 + 0.05;
        run.place(run.traffic, -gap, run.lane); run.traffic.speed = 40;
        expect(run.clear(), 'fixture starts with clear bodies').toBe(true);
        run.step(dt); expect(run.clear()).toBe(true); expect(run.traffic.speed).toBeLessThan(0.5);
      }
    }
  });

  it.each(['hit', 'oncoming', 'adjacent', 'parallel-cross'])('does not queue for an irrelevant rider: %s', kind => {
    const options = { riderType: 'motorcycle', cross: kind === 'parallel-cross', finite: false };
    const run = encounter(options), clear = encounter(options);
    clear.scope.cyclistsRef.current = [];
    run.place(run.traffic, -10, run.lane); clear.place(clear.traffic, -10, clear.lane);
    run.place(run.rider, -6.2, run.lane);
    if (kind === 'hit') run.rider._hit = true;
    if (kind === 'oncoming') { run.rider.heading += Math.PI; run.rider.speed = 5; }
    if (kind === 'adjacent') run.place(run.rider, -6.2, -run.lane);
    if (kind === 'parallel-cross') {
      run.rider._chunk = 2; run.rider._crossPose = RR.crossStreetPose(run.pose.x, run.pose.y + 32, run.pose.heading, 6.5, 96);
      Object.assign(run.rider, RR.crossStreetWorldPoint(run.rider._crossPose, -6.2, run.riderLane));
    }
    run.step(1 / 144); clear.step(1 / 144);
    for (const key of ['x', 'y', 'heading', 'speed']) expect(run.traffic[key], key).toBeCloseTo(clear.traffic[key], 10);
  });

  it.each([false, true])('AI separation cannot push an initially clear car into a rider: reversed=%s', reverse => {
    const run = encounter({ riderType: 'motorcycle' });
    run.place(run.traffic, -15, run.lane); run.traffic.speed = 0;
    const rear = run.place({ ...run.traffic, id: 'close-rear', personality: { ...run.traffic.personality } }, -19.4, run.lane);
    run.place(run.rider, -15 + (RR.vehicleFootprint('car').length + RR.vulnerableRoadUserFootprint(run.rider).length) / 2 + 0.02, run.riderLane);
    run.scope.trafficRef.current = reverse ? [rear, run.traffic] : [run.traffic, rear];
    expect(run.clear()).toBe(true);
    run.step(1 / 60); expect(run.clear(), 'post-separation rider body contact').toBe(true);
  });

  it.each(['main-to-cross', 'cross-to-main'])('holds and resumes a generated turn into a rider destination corridor: %s', route => {
    const fromCross = route === 'cross-to-main';
    const run = encounter({ finite: false, cross: fromCross, light: true, riderType: 'motorcycle' });
    run.green(); run.place(run.traffic, -1, run.lane); run.traffic.speed = 5;
    const actor = run.traffic, signal = run.scope.signalsRef.current[0];
    Object.assign(actor, { _turning: true, _turnIntent: 'right', _turnSignal: signal,
      _turnSignalSeen: signal, _turnProgress: 0 });
    if (!fromCross) Object.assign(actor, { _turnCrossPose: run.pose, _turnCrossDirection: 1, _turnTarget: 0 });
    const path = fromCross
      ? RR.createCrossToMainTurnPath(run.scope.infiniteWorldRef.current, signal, actor, 'right')
      : RR.createIntersectionTurnPath(actor.x, actor.y, actor.heading, run.pose, 1, 'right');
    expect(path).toBeTruthy(); actor._turnPath = path;
    Object.assign(run.rider, { x: path.p3.x + 2.55 * Math.cos(path.endHeading),
      y: path.p3.y + 2.55 * Math.sin(path.endHeading), heading: path.endHeading, speed: 0, _cruiseSpeed: 0 });
    if (fromCross) {
      delete run.rider.crossStreet; delete run.rider._crossPose; delete run.rider._crossDirection; delete run.rider._chunk;
      run.rider._bikeLane = path.laneOffset;
    } else Object.assign(run.rider, { crossStreet: true, _crossPose: run.pose, _crossDirection: 1, _chunk: 1, _bikeLane: 1.5 });
    run.rider._roadStation = RR.mainRoadLocalPoint(run.scope.infiniteWorldRef.current, run.rider.x, run.rider.y).longitudinal;
    expect(run.clear(), 'turn fixture starts clear').toBe(true);
    let stopped = 0, advanced = false;
    const fields = ['x', 'y', 'heading', 'laneOffset', '_roadStation', '_turnProgress'];
    for (let tick = 0; tick < 60 * 4; tick++) {
      const before = Object.fromEntries(fields.map(key => [key, actor[key]]));
      run.step(1 / 60); expect(run.clear(), 'destination rider contact during turn').toBe(true);
      advanced ||= actor._turnProgress > 0.1;
      if (actor.speed === 0 && before._turnProgress > 0.1) {
        stopped++;
        for (const key of fields) expect(actor[key], 'blocked turn restores ' + key).toBe(before[key]);
        expect(actor._turning).toBe(true); expect(actor._turnPath).toBe(path);
        expect(!!actor.crossStreet).toBe(fromCross);
      }
    }
    expect(advanced).toBe(true); expect(stopped).toBeGreaterThan(10); expect(actor._turning).toBe(true);
    run.rider.x += 20 * Math.cos(path.endHeading); run.rider.y += 20 * Math.sin(path.endHeading);
    run.rider._roadStation = RR.mainRoadLocalPoint(run.scope.infiniteWorldRef.current, run.rider.x, run.rider.y).longitudinal;
    for (let tick = 0; tick < 60 * 4 && actor._turning; tick++) {
      run.step(1 / 60); expect(run.clear(), 'released turn rider contact').toBe(true);
    }
    expect(actor._turning).toBe(false); expect(!!actor.crossStreet).toBe(!fromCross);
    expect(Math.hypot(actor.x - path.p3.x, actor.y - path.p3.y)).toBeLessThan(1e-8);
    expect(actor.heading).toBeCloseTo(path.endHeading, 10); expect(actor.laneOffset).toBe(path.laneOffset);
    expect(actor._turnPath).toBeNull(); expect(actor._turnProgress).toBe(0);
    expect(run.scope.statsRef.current).toEqual({ safetyScore: 100, crashes: 0, hardBrakes: 0 });
  });

  it('leaves motion with no riders and learner grades identical to the previous updater', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      for (const type of ['car', 'schoolbus']) for (const finite of [false, true]) for (const cross of [false, true]) {
        const run = encounter({ type, finite, cross, theta: 0.3 }); run.scope.cyclistsRef.current = [];
        const oldCar = { ...run.traffic, personality: { ...run.traffic.personality } };
        const oldScope = { ...run.scope, trafficRef: { current: [oldCar] }, timeRef: { current: run.scope.timeRef.current },
          statsRef: { current: { safetyScore: 100, crashes: 0, hardBrakes: 0 } },
          stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} } };
        const oldStep = makeBeforeTraffic(oldScope);
        for (let tick = 0; tick < 60; tick++) { run.step(1 / 60); oldStep(1 / 60); oldScope.timeRef.current += 1 / 60; }
        for (const key of ['x', 'y', 'heading', 'speed', 'laneOffset']) expect(run.traffic[key], key).toBeCloseTo(oldCar[key], 10);
        expect(run.scope.statsRef.current).toEqual(oldScope.statsRef.current);
      }
    } finally { random.mockRestore(); }
  });
});
