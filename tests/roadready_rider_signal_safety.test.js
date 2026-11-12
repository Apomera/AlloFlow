import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.RR_RIDER_SIGNAL_SOURCE || 'stem_lab/stem_tool_roadready.js';
let RR, makeUpdater, makeBeforeUpdater;
function extract(source) {
  const first = source.indexOf('        var updateCyclists = function(dt) {');
  const last = source.indexOf('        // ── Bus stop-arm compliance', first);
  if (first < 0 || last < first) throw Error('Actual rider updater missing');
  return new Function('scope', 'with(scope){' + source.slice(first, last) + '\nreturn updateCyclists;}');
}
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(sourcePath, 'roadReady'); RR = window.__RR_TEST_EXPORTS__.roadReady;
  makeUpdater = extract(readFileSync(sourcePath, 'utf8'));
  makeBeforeUpdater = extract(readFileSync('tmp/roadready-rider-signals-20261102/before.js', 'utf8'));
});

function junction({ type = 'motorcycle', direction = 1, theta = 0, finite = false,
  cross = false, bend = 0, gap, speed, indication = 'red', signalStation = 50 } = {}) {
  speed ??= type === 'motorcycle' ? 12 : 6;
  gap ??= type === 'motorcycle' ? (finite ? 35 : 45) : 28;
  const profile = { lanes: 2, roadHalfWidth: 3.5, hasBikeLane: true };
  const spline = bend ? {
    centerAt: s => 48 + bend * 4 * Math.sin((s - 50) * 0.05),
    headingAt: s => Math.atan(bend * 0.2 * Math.cos((s - 50) * 0.05)),
  } : { centerAt: s => 48 + Math.tan(theta) * (s - signalStation), headingAt: () => theta };
  const world = finite ? null : { profile, chunks: {}, spline,
    getChunk: index => ({ ...profile, hasIntersection: index === 1, intersectionY: 18 }) };
  const point = (station, lane) => world ? RR.mainRoadWorldPoint(world, station, lane)
    : { x: 48 + lane, y: station, heading: 0 };
  const origin = point(signalStation, 0);
  const signal = { x: origin.x, y: origin.y, type: 'light', _chunk: 1, timer: 0,
    greenDur: 6, redDur: 6, yellowDur: 1, allRedDur: 1 };
  const setIndication = state => {
    if (cross) { signal.state = state === 'red' ? 'green' : 'red'; signal._crossState = state; }
    else { signal.state = state; signal._crossState = state === 'red' ? 'green' : 'red'; }
  };
  setIndication(indication);
  const size = RR.vulnerableRoadUserFootprint({ type });
  const lane = cross ? direction * 1.5 : RR.vulnerableRoadUserLaneOffset(profile, type, direction, -direction * 2.8);
  const pose = RR.crossStreetPose(origin.x, origin.y, finite ? (cross ? theta : 0) : origin.heading, 6.5, 96);
  const lineStation = signalStation - direction * 4.1;
  const line = cross ? RR.crossStreetWorldPoint(pose, -direction * 4.1, lane) : point(lineStation, lane);
  const lineHeading = cross ? -pose.heading : Math.PI / 2 - line.heading;
  const forward = { x: direction * Math.cos(lineHeading), y: direction * Math.sin(lineHeading) };
  let riderPose;
  if (cross) riderPose = RR.crossStreetWorldPoint(pose, -direction * (4.1 + size.length / 2 + gap), lane);
  else if (bend) riderPose = point(signalStation - direction * (4.1 + size.length / 2 + gap), lane);
  else riderPose = { x: line.x - forward.x * (size.length / 2 + gap),
    y: line.y - forward.y * (size.length / 2 + gap), heading: line.heading };
  const heading = cross ? (direction > 0 ? 0 : Math.PI) - pose.heading
    : direction * Math.PI / 2 - riderPose.heading;
  const rider = { ...riderPose, type, id: 'signal-' + type, heading, speed,
    _cruiseSpeed: speed, _roadStation: world ? RR.mainRoadLocalPoint(world, riderPose.x, riderPose.y).longitudinal : riderPose.y,
    _bikeLane: lane, ...(cross ? { crossStreet: true, _crossPose: pose, _chunk: 1 } : {}) };
  if (finite) expect(rider.y >= -2 && rider.y <= 98, 'finite fixture starts within map bounds').toBe(true);
  const parked = cross ? RR.crossStreetWorldPoint(pose, 0, 18) : point(signalStation, lane + 18);
  const scope = { ...RR, MAP_SIZE: 96, CROSS_STREET_LENGTH: 96, RR_CURB_YIELD_HOLD_MAX: 4,
    currentVehicle: { id: 'sedan' }, currentScenario: { id: 'suburban', weather: 'clear' },
    infiniteWorldRef: { current: world }, cyclistsRef: { current: [rider] },
    trafficRef: { current: [] }, pedsRef: { current: [] }, signalsRef: { current: [signal] },
    emergencyRef: { current: null }, wildlifeRef: { current: null },
    carRef: { current: { ...parked, heading, speed: 0 } }, timeRef: { current: 20 },
    statsRef: { current: { safetyScore: 100, crashes: 0 } },
  };
  const update = makeUpdater(scope);
  const bodyGap = () => {
    const along = Math.cos(rider.heading) * forward.x + Math.sin(rider.heading) * forward.y;
    const across = -Math.sin(rider.heading) * forward.x + Math.cos(rider.heading) * forward.y;
    return (line.x - rider.x) * forward.x + (line.y - rider.y) * forward.y -
      Math.abs(along) * size.length / 2 - Math.abs(across) * size.width / 2;
  };
  return { rider, signal, scope, size, world, line, forward, point, pose, lane, direction, cross, bodyGap, setIndication,
    step(dt) { update(dt); scope.timeRef.current += dt; } };
}

describe('ordinary riders obey their actual traffic-light approach', () => {
  it.each([30, 60, 144])('stops full bodies before red and resumes on green at %i Hz', hz => {
    for (const type of ['cyclist', 'motorcycle']) for (const direction of [-1, 1]) {
      for (const theta of [-0.35, 0, 0.35]) for (const finite of [false, true]) for (const cross of [false, true]) {
        const run = junction({ type, direction, theta, finite, cross });
        let closest = Infinity, peak = 0;
        for (let frame = 0; frame < hz * 10; frame++) {
          const speed = run.rider.speed; run.step(1 / hz);
          closest = Math.min(closest, run.bodyGap()); peak = Math.max(peak, (speed - run.rider.speed) * hz);
          expect(run.bodyGap(), JSON.stringify({ hz, type, direction, theta, finite, cross })).toBeGreaterThanOrEqual(-1e-6);
        }
        expect(run.rider.speed).toBeLessThan(0.1); expect(closest).toBeGreaterThan(0.1);
        expect(peak).toBeLessThanOrEqual(6.5 + 1e-6);
        expect(run.scope.statsRef.current).toEqual({ safetyScore: 100, crashes: 0 });
        run.setIndication('green');
        for (let frame = 0; frame < hz * 3; frame++) run.step(1 / hz);
        expect(run.rider.speed).toBeGreaterThan(2); expect(run.bodyGap()).toBeLessThan(-1);
      }
    }
  });

  it.each([30, 60, 144])('protects complete bodies along changing bends at %i Hz', hz => {
    for (const type of ['cyclist', 'motorcycle']) for (const direction of [-1, 1]) for (const bend of [-1, 1]) {
      const run = junction({ type, direction, bend });
      for (let frame = 0; frame < hz * 10; frame++) {
        run.step(1 / hz); expect(run.bodyGap()).toBeGreaterThanOrEqual(-1e-6);
      }
      expect(run.rider.speed).toBeLessThan(0.1);
    }
  });

  it.each([30, 60, 144])('holds a comfortable yellow-stop decision until green at %i Hz', hz => {
    for (const type of ['cyclist', 'motorcycle']) for (const direction of [-1, 1]) for (const cross of [false, true]) {
      const run = junction({ type, direction, cross, theta: 0.3, indication: 'yellow', gap: 30 });
      for (let frame = 0; frame < hz * 12; frame++) {
        run.step(1 / hz); expect(run.bodyGap()).toBeGreaterThanOrEqual(-1e-6);
      }
      expect(run.rider.speed).toBeLessThan(0.1);
      run.setIndication('green');
      for (let frame = 0; frame < hz * 3; frame++) run.step(1 / hz);
      expect(run.rider.speed).toBeGreaterThan(2);
    }
  });

  it.each([30, 60, 144])('lets yellow dilemma-zone riders clear after entry at %i Hz', hz => {
    for (const type of ['cyclist', 'motorcycle']) for (const direction of [-1, 1]) for (const cross of [false, true]) {
      const run = junction({ type, direction, cross, theta: -0.3, indication: 'yellow', gap: 1 });
      for (let frame = 0; frame < hz * 2 && run.bodyGap() >= -0.1; frame++) run.step(1 / hz);
      expect(run.bodyGap()).toBeLessThan(-0.1);
      run.setIndication('red');
      for (let frame = 0; frame < hz; frame++) run.step(1 / hz);
      expect(run.bodyGap()).toBeLessThan(-4); expect(run.rider.speed).toBeGreaterThan(2);
    }
  });

  it.each([1 / 144, 1 / 60, 1 / 30, 0.2])('contains late red entry without recycling through the line at dt=%s', dt => {
    for (const type of ['cyclist', 'motorcycle']) for (const direction of [-1, 1]) for (const cross of [false, true]) {
      const run = junction({ type, direction, cross, finite: true, theta: 0.35,
        speed: 40, gap: 0.05, signalStation: cross ? 50 : direction > 0 ? 96 : 0 });
      const previous = { ...run.rider }; run.step(dt);
      expect(run.bodyGap()).toBeGreaterThanOrEqual(-1e-6); expect(run.rider.speed).toBe(0);
      for (const key of ['y', 'heading', '_roadStation', '_bikeLane']) expect(run.rider[key], key).toBe(previous[key]);
      expect(Math.abs(run.rider.x - previous.x)).toBeLessThanOrEqual(0.002 + 1e-12);
    }
  });

  it.each([30, 60, 144])('keeps all-red clearance closed and follows real signal phase recovery at %i Hz', hz => {
    for (const type of ['cyclist', 'motorcycle']) for (const cross of [false, true]) {
      const run = junction({ type, cross });
      Object.assign(run.signal, { _phase: cross ? 'main_green' : 'cross_green', timer: 0 });
      let held = 0, cleared = false;
      for (let frame = 0; frame < hz * 12; frame++) {
        RR.updateSignals([run.signal], 1 / hz);
        const indication = RR.trafficSignalIndication(run.signal, cross ? 'cross' : 'main');
        run.step(1 / hz);
        if (indication === 'red') expect(run.bodyGap()).toBeGreaterThanOrEqual(-1e-6);
        if (run.rider.speed < 0.1) held++;
        cleared ||= indication === 'green' && run.bodyGap() < -2 && run.rider.speed > 2;
      }
      expect(held).toBeGreaterThan(2); expect(cleared).toBe(true);
    }
  });

  it.each([30, 60, 144])('combines pedestrian and red braking without adding their decelerations at %i Hz', hz => {
    for (const direction of [-1, 1]) {
      const run = junction({ direction, finite: true, gap: 18, speed: 12 });
      const pedestrian = { x: run.line.x + run.forward.x * 0.68, y: run.line.y + run.forward.y * 0.68,
        crossing: true, crosswalkY: run.line.y + run.forward.y * 0.68, _sidewalkOffset: 4.5 };
      run.scope.pedsRef.current = [pedestrian]; let peak = 0;
      for (let frame = 0; frame < hz * 8; frame++) {
        const speed = run.rider.speed; run.step(1 / hz);
        peak = Math.max(peak, (speed - run.rider.speed) * hz);
        expect(run.bodyGap()).toBeGreaterThanOrEqual(-1e-6);
        expect(RR.pointOverlapsVehicle(run.rider, run.size, pedestrian, 0.28)).toBe(false);
      }
      expect(peak).toBeLessThanOrEqual(6.5 + 1e-6); expect(run.rider.speed).toBeLessThan(0.1);
      run.setIndication('green');
      for (let frame = 0; frame < hz; frame++) run.step(1 / hz);
      expect(run.rider.speed).toBeLessThan(0.1);
    }
  });

  it('preserves unaffected motion, impacted riders and both recycling paths', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      for (const type of ['cyclist', 'motorcycle']) for (const finite of [false, true]) {
        for (const hit of [false, true]) for (const recycle of [false, true]) {
          const run = junction({ type, finite, indication: 'green' }); run.rider._hit = hit;
          if (recycle) { run.rider.y = 150; run.rider._roadStation = 150; }
          const before = { ...run.scope, cyclistsRef: { current: [{ ...run.rider }] } };
          makeBeforeUpdater(before)(1 / 60); run.step(1 / 60);
          // round 32 (tr32): a streamed recycle now lands outside the learner's stopping envelope, so it no longer equals the old code
          if (recycle && !finite && !hit) { const away = Math.abs(run.rider._roadStation - RR.mainRoadLocalPoint(run.scope.infiniteWorldRef.current, run.scope.carRef.current.x, run.scope.carRef.current.y).longitudinal); expect(away).toBeGreaterThanOrEqual(RR.RR_SPAWN_BEHIND_MIN_METERS - 1e-6); continue; }
          for (const key of ['x', 'y', 'heading', 'speed', '_roadStation', '_bikeLane', '_hit', '_followingPlayer', '_brakingForPlayer'])
            expect(run.rider[key], key).toEqual(before.cyclistsRef.current[0][key]);
        }
      }
    } finally { random.mockRestore(); }
  });

  it('clears an old yellow decision when a rider recycles', () => {
    const run = junction({ type: 'cyclist', indication: 'yellow', gap: 8 });
    const original = { ...run.rider };
    run.step(1 / 60); expect(run.rider._riderYellowSignal?.stop).toBe(true);
    // round 32 (tr32): a rider ahead of the learner is kept out to about 100 m, so move the car farther to force the recycle
    Object.assign(run.scope.carRef.current, run.point(-140, run.lane + 18)); run.step(1 / 60);
    expect(run.rider._riderYellowSignal).toBeNull();
    Object.assign(run.rider, original);
    Object.assign(run.scope.carRef.current, run.point(50, run.lane + 18));
    for (let frame = 0; frame < 600; frame++) run.step(1 / 60);
    expect(run.rider.speed).toBeLessThan(0.1); expect(run.bodyGap()).toBeGreaterThan(0);
  });

  it('uses the nearest relevant approach instead of an unrelated farther red', () => {
    for (const cross of [false, true]) {
      const run = junction({ type: 'cyclist', cross, indication: 'green', gap: 8 });
      run.scope.signalsRef.current.push({ ...run.signal, x: run.signal.x + (cross ? 25 : 0),
        y: run.signal.y + (cross ? 0 : 25), state: 'red', _crossState: 'red', _chunk: cross ? 2 : 3 });
      run.step(1 / 60); expect(run.rider.speed).toBe(6);
    }
  });

  it('does not treat a protected left arrow as permission for a through rider', () => {
    for (const type of ['cyclist', 'motorcycle']) for (const direction of [-1, 1]) {
      const run = junction({ type, direction });
      Object.assign(run.signal, { _phase: 'main_left_green', protectedMainTurns: true, state: 'red', _crossState: 'red' });
      for (let frame = 0; frame < 600; frame++) {
        run.step(1 / 60); expect(run.bodyGap()).toBeGreaterThanOrEqual(-1e-6);
      }
      expect(run.rider.speed).toBeLessThan(0.1);
    }
  });

  it('keeps its yellow stop when streaming refreshes the same physical signal', () => {
    const run = junction({ type: 'motorcycle', indication: 'yellow', gap: 8, speed: 6 });
    for (let frame = 0; frame < 300; frame++) run.step(1 / 60);
    expect(run.rider.speed).toBeLessThan(0.1);
    run.rider.x += run.forward.x * 0.05; run.rider.y += run.forward.y * 0.05;
    run.rider._roadStation = RR.mainRoadLocalPoint(run.world, run.rider.x, run.rider.y).longitudinal;
    run.scope.signalsRef.current = [{ ...run.signal }];
    for (let frame = 0; frame < 60; frame++) run.step(1 / 60);
    expect(run.rider.speed).toBeLessThan(0.1); expect(run.bodyGap()).toBeGreaterThan(0);
  });
});
