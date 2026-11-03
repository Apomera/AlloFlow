import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.RR_RIDER_QUEUE_SOURCE || 'stem_lab/stem_tool_roadready.js';
let RR, makeUpdater, makeBeforeUpdater;
function extract(source) {
  const start = source.indexOf('        var updateCyclists = function(dt) {');
  const end = source.indexOf('        // ── Bus stop-arm compliance', start);
  if (start < 0 || end < start) throw Error('Actual rider updater missing');
  return new Function('scope', 'with(scope){' + source.slice(start, end) + '\nreturn updateCyclists;}');
}
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(sourcePath, 'roadReady'); RR = window.__RR_TEST_EXPORTS__.roadReady;
  makeUpdater = extract(readFileSync(sourcePath, 'utf8'));
  makeBeforeUpdater = extract(readFileSync('tmp/roadready-rider-queues-20261102/before.js', 'utf8'));
});

function scene({ type = 'cyclist', direction = 1, theta = 0, bend = 0,
  finite = true, cross = false, reverse = false, signal = false } = {}) {
  const profile = { lanes: 2, roadHalfWidth: 3.5, hasBikeLane: true };
  const world = finite ? null : { profile, chunks: {},
    getChunk: index => ({ ...profile, hasIntersection: index === 1, intersectionY: 18 }),
    spline: bend ? {
      centerAt: s => 48 + bend * 4 * Math.sin((s - 50) * 0.05),
      headingAt: s => Math.atan(bend * 0.2 * Math.cos((s - 50) * 0.05)),
    } : { centerAt: s => 48 + Math.tan(theta) * (s - 50), headingAt: () => theta } };
  const point = (station, lateral) => world ? RR.mainRoadWorldPoint(world, station, lateral)
    : { x: 48 + lateral, y: station, heading: 0 };
  const center = point(50, 0);
  const pose = RR.crossStreetPose(center.x, center.y, world ? center.heading : theta, 6.5, 96);
  const lane = cross ? direction * 1.5 : RR.vulnerableRoadUserLaneOffset(profile, type, direction, -direction * 2.8);
  function place(actor, progress, lateral = lane) {
    const where = cross ? RR.crossStreetWorldPoint(pose, direction * progress, lateral)
      : point(50 + direction * progress * (world && !bend ? Math.cos(theta) : 1), lateral);
    Object.assign(actor, where, { heading: cross ? (direction > 0 ? 0 : Math.PI) - pose.heading
      : direction * Math.PI / 2 - where.heading });
    actor._roadStation = world ? RR.mainRoadLocalPoint(world, actor.x, actor.y).longitudinal : actor.y;
    actor._bikeLane = lateral;
    if (cross) Object.assign(actor, { crossStreet: true, _crossPose: pose, _crossDirection: direction, _chunk: 1 });
    return actor;
  }
  const leader = place({ id: 'leader', type, speed: 6, _cruiseSpeed: 6 }, -30);
  const follower = place({ id: 'follower', type, speed: 6, _cruiseSpeed: 6 }, -37);
  const light = { x: center.x, y: center.y, type: 'light', _chunk: 1,
    state: cross ? 'green' : 'red', _crossState: cross ? 'red' : 'green' };
  const parked = cross ? RR.crossStreetWorldPoint(pose, 0, lane + 18) : point(50, lane + 18);
  const scope = { ...RR, MAP_SIZE: 96, CROSS_STREET_LENGTH: 96, RR_CURB_YIELD_HOLD_MAX: 4,
    currentVehicle: { id: 'sedan' }, currentScenario: { id: 'suburban', weather: 'clear' },
    infiniteWorldRef: { current: world }, cyclistsRef: { current: reverse ? [follower, leader] : [leader, follower] },
    trafficRef: { current: [] }, signalsRef: { current: signal ? [light] : [] }, pedsRef: { current: [] },
    emergencyRef: { current: null }, wildlifeRef: { current: null },
    carRef: { current: { ...parked, heading: follower.heading, speed: 0 } },
    timeRef: { current: 20 }, statsRef: { current: { safetyScore: 100, crashes: 0 } } };
  const update = makeUpdater(scope);
  const size = actor => actor.type === 'cyclist' || actor.type === 'motorcycle'
    ? RR.vulnerableRoadUserFootprint(actor) : RR.vehicleFootprint(actor.type);
  return { scope, world, leader, follower, light, lane, pose, point, place, size,
    step(dt) { update(dt); scope.timeRef.current += dt; },
    separated(a = follower, b = leader) { return !RR.vehicleRectsOverlap(a, size(a), b, size(b)); },
    green() { light.state = cross ? 'red' : 'green'; light._crossState = cross ? 'green' : 'red'; },
  };
}

const redScenes = [
  { type: 'cyclist', hz: 30 },
  { type: 'motorcycle', direction: -1, hz: 60 },
  { type: 'cyclist', direction: -1, reverse: true, hz: 144 },
  { type: 'motorcycle', reverse: true, hz: 30 },
  { type: 'cyclist', finite: false, theta: 0.35, hz: 60 },
  { type: 'motorcycle', finite: false, direction: -1, theta: -0.35, reverse: true, hz: 144 },
  { type: 'cyclist', cross: true, theta: 0.3, hz: 60 },
  { type: 'motorcycle', cross: true, direction: -1, theta: -0.3, reverse: true, hz: 30 },
  { type: 'cyclist', finite: false, cross: true, theta: -0.35, reverse: true, hz: 144 },
  { type: 'motorcycle', finite: false, cross: true, direction: -1, theta: 0.35, hz: 60 },
  { type: 'cyclist', finite: false, bend: 1, hz: 30 },
  { type: 'motorcycle', finite: false, direction: -1, bend: -1, reverse: true, hz: 60 },
];

describe('ordinary rider queues preserve physical body clearance', () => {
  it.each(redScenes)('holds two riders at red and releases them without contact: %j', options => {
    const run = scene({ ...options, signal: true });
    const dt = 1 / options.hz;
    for (let tick = 0; tick < options.hz * 12; tick++) {
      run.step(dt); expect(run.separated(), 'red queue body contact').toBe(true);
    }
    expect(run.leader.speed).toBeLessThan(0.1); expect(run.follower.speed).toBeLessThan(0.1);
    run.green();
    for (let tick = 0; tick < options.hz * 3; tick++) {
      run.step(dt); expect(run.separated(), 'green queue body contact').toBe(true);
    }
    expect(run.leader.speed).toBeGreaterThan(0.5); expect(run.follower.speed).toBeGreaterThan(0.5);
    expect(run.scope.statsRef.current).toEqual({ safetyScore: 100, crashes: 0 });
  });

  it.each(['cyclist', 'motorcycle'])('stops behind a stationary rider then follows its departure: %s', type => {
    for (const reverse of [false, true]) {
      const run = scene({ type, reverse });
      run.place(run.leader, -15); run.place(run.follower, -22);
      run.leader.speed = 0; run.leader._cruiseSpeed = 0;
      for (let tick = 0; tick < 60 * 8; tick++) {
        run.step(1 / 60); expect(run.separated()).toBe(true);
      }
      expect(run.follower.speed).toBeLessThan(0.1);
      run.leader.speed = 0.1; run.leader._cruiseSpeed = 6;
      for (let tick = 0; tick < 60 * 3; tick++) {
        run.step(1 / 60); expect(run.separated()).toBe(true);
      }
      expect(run.follower.speed).toBeGreaterThan(0.5);
    }
  });

  it.each(['car', 'schoolbus', 'motorcycle'])('follows a stopped and then moving compatible AI leader: %s', leadType => {
    for (const cross of [false, true]) for (const type of ['cyclist', 'motorcycle']) {
      const run = scene({ type, finite: false, theta: 0.25, cross });
      run.scope.cyclistsRef.current = [run.follower]; run.scope.trafficRef.current = [run.leader];
      run.leader.type = leadType; run.leader.speed = 0;
      run.place(run.leader, -12); run.place(run.follower, -24);
      for (let tick = 0; tick < 60 * 8; tick++) {
        run.step(1 / 60); expect(run.separated()).toBe(true);
      }
      expect(run.follower.speed).toBeLessThan(0.1);
      run.leader.speed = 2;
      for (let tick = 0; tick < 60 * 3; tick++) {
        run.place(run.leader, -12 + (tick + 1) * 2 / 60);
        run.step(1 / 60); expect(run.separated()).toBe(true);
      }
      expect(run.follower.speed).toBeGreaterThan(0.5);
    }
  });

  it.each([1 / 144, 1 / 30, 0.2])('does not tunnel through a close leader during a long frame: dt=%s', dt => {
    for (const type of ['cyclist', 'motorcycle']) for (const cross of [false, true]) {
      const run = scene({ type, cross, finite: false, theta: 0.3 });
      run.scope.cyclistsRef.current = [run.follower]; run.scope.trafficRef.current = [run.leader];
      run.leader.type = 'schoolbus'; run.leader.speed = 0;
      run.place(run.leader, -10);
      const centerGap = (run.size(run.leader).length + run.size(run.follower).length) / 2 + 0.05;
      run.place(run.follower, -10 - centerGap); run.follower.speed = 40; run.follower._cruiseSpeed = 40;
      expect(run.separated(), 'close fixture begins clear').toBe(true);
      run.step(dt); expect(run.separated()).toBe(true); expect(run.follower.speed).toBeLessThan(0.5);
    }
  });

  it.each(['adjacent', 'oncoming', 'hit', 'other-cross-street'])('ignores an irrelevant actor: %s', kind => {
    const options = { type: 'motorcycle', finite: false, cross: kind === 'other-cross-street' };
    const run = scene(options), clear = scene(options);
    run.place(run.follower, -15); clear.place(clear.follower, -15);
    run.place(run.leader, -7); run.leader.speed = 0;
    clear.scope.cyclistsRef.current = [clear.follower];
    if (kind === 'adjacent') run.place(run.leader, -7, run.lane + 4);
    if (kind === 'oncoming') { run.leader.heading += Math.PI; run.leader.speed = 5; }
    if (kind === 'hit') run.leader._hit = true;
    if (kind === 'other-cross-street') {
      run.leader._chunk = 2;
      run.leader._crossPose = RR.crossStreetPose(run.pose.x, run.pose.y + 32, run.pose.heading, 6.5, 96);
      Object.assign(run.leader, RR.crossStreetWorldPoint(run.leader._crossPose, -7, run.lane));
    }
    run.step(1 / 60); clear.step(1 / 60);
    expect(run.follower.speed).toBeCloseTo(clear.follower.speed, 10);
    expect(run.follower.x).toBeCloseTo(clear.follower.x, 10); expect(run.follower.y).toBeCloseTo(clear.follower.y, 10);
  });

  it('leaves lone rider motion and learner grading unchanged', () => {
    for (const type of ['cyclist', 'motorcycle']) for (const finite of [false, true]) {
      const run = scene({ type, finite, theta: 0.3 }); run.scope.cyclistsRef.current = [run.follower];
      const oldFollower = { ...run.follower };
      const oldScope = { ...run.scope, cyclistsRef: { current: [oldFollower] },
        timeRef: { current: run.scope.timeRef.current }, statsRef: { current: { safetyScore: 100, crashes: 0 } } };
      const oldUpdate = makeBeforeUpdater(oldScope);
      for (let tick = 0; tick < 60; tick++) {
        run.step(1 / 60); oldUpdate(1 / 60); oldScope.timeRef.current += 1 / 60;
      }
      for (const key of ['x', 'y', 'heading', 'speed', '_roadStation', '_bikeLane'])
        expect(run.follower[key], key).toBeCloseTo(oldFollower[key], 10);
      expect(run.scope.statsRef.current).toEqual(oldScope.statsRef.current);
    }
  });
});
