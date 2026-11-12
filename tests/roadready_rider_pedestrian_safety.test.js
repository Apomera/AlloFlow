import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.RR_RIDER_SOURCE || 'stem_lab/stem_tool_roadready.js';
let RR, makeUpdater, makePedestrianUpdater, makeBeforeUpdater;
function updater(source, start, end, name) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < from) throw Error('Actual ' + name + ' updater not found');
  return new Function('scope', 'with(scope){' + source.slice(from, to) + '\nreturn ' + name + ';}');
}
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(sourcePath, 'roadReady'); RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync(sourcePath, 'utf8');
  const start = '        var updateCyclists = function(dt) {';
  const end = '        // ── Bus stop-arm compliance';
  makeUpdater = updater(source, start, end, 'updateCyclists');
  makeBeforeUpdater = updater(readFileSync('tmp/roadready-rider-crossings-20261101/before.js', 'utf8'), start, end, 'updateCyclists');
  makePedestrianUpdater = updater(source, '        var updatePeds = function(dt) {',
    '        // scanSpatialHazards:', 'updatePeds');
});

function encounter({ type = 'cyclist', direction = 1, theta = 0, bend = 0, finite = false,
  ahead, speed, pedestrianLateral, crossing = true } = {}) {
  speed ??= type === 'motorcycle' ? 12 : 6;
  ahead ??= type === 'motorcycle' ? 45 : 28;
  const profile = { lanes: 2, roadHalfWidth: 3.5, hasBikeLane: true };
  const world = finite ? null : { profile, chunks: {}, getChunk: () => profile, spline: bend ? {
    centerAt: s => 48 + bend * 4 * Math.sin((s - 48) * 0.05),
    headingAt: s => Math.atan(bend * 0.2 * Math.cos((s - 48) * 0.05)),
  } : { centerAt: s => 48 + Math.tan(theta) * (s - 48), headingAt: () => theta } };
  const lane = RR.vulnerableRoadUserLaneOffset(profile, type, direction, -direction * 2.8);
  const point = (station, lateral) => world ? RR.mainRoadWorldPoint(world, station, lateral)
    : { x: 48 + lateral, y: station, heading: 0 };
  const sourceStation = 48 - direction * ahead * (world && !bend ? Math.cos(theta) : 1);
  const source = point(sourceStation, lane);
  const rider = { ...source, type, heading: direction * Math.PI / 2 - source.heading,
    speed, _cruiseSpeed: speed, _roadStation: sourceStation, _bikeLane: lane };
  const lateral = pedestrianLateral ?? lane, home = point(48, lateral);
  const pedestrian = { ...home, homeX: home.x, homeY: home.y, kind: 'adult', crossing,
    waitingAtCrosswalk: true, crosswalkY: 48, crossDwell: 0, crossDirection: 1,
    sidewalkLeft: 43.5, sidewalkRight: 52.5, _curvedRoadFrame: !!world,
    _roadStation: 48, _sidewalkOffset: 4.5, _sidewalkLateral: lateral,
    _crossTargetLateral: -4.5, vx: 0, vy: 0 };
  const parked = point(48, lane + 18);
  const scope = { ...RR, MAP_SIZE: 96, RR_CURB_YIELD_HOLD_MAX: 4,
    currentVehicle: { id: 'sedan' }, currentScenario: { id: 'residential', weather: 'clear' },
    infiniteWorldRef: { current: world }, cyclistsRef: { current: [rider] },
    trafficRef: { current: [] }, pedsRef: { current: [pedestrian] }, signalsRef: { current: [] },
    emergencyRef: { current: null }, wildlifeRef: { current: null },
    carRef: { current: { ...parked, heading: rider.heading, speed: 0 } },
    timeRef: { current: 20 }, statsRef: { current: { safetyScore: 100, crashes: 0 } },
    addToast() {}, speak() {},
  };
  const step = makeUpdater(scope), walk = makePedestrianUpdater(scope);
  const size = RR.vulnerableRoadUserFootprint(rider);
  return { scope, world, rider, pedestrian, size, direction, lane, point,
    step(dt) { step(dt); scope.timeRef.current += dt; }, walk,
    contact() { return RR.pointOverlapsVehicle(rider, size, pedestrian, 0.28); },
    gap() { return (pedestrian.x - rider.x) * Math.cos(rider.heading) +
      (pedestrian.y - rider.y) * Math.sin(rider.heading) - size.length / 2 - 0.28; },
  };
}

describe('ordinary-road riders protect active pedestrian crossings', () => {
  it.each([30, 60, 144])('brakes and holds full rider bodies clear, then resumes at %i Hz', hz => {
    for (const type of ['cyclist', 'motorcycle']) for (const direction of [-1, 1]) {
      for (const theta of [-0.35, 0, 0.35]) for (const finite of [false, true]) {
        const run = encounter({ type, direction, theta, finite });
        let closest = Infinity, peakDeceleration = 0;
        for (let frame = 0; frame < hz * 9; frame++) {
          const speed = run.rider.speed; run.step(1 / hz);
          expect(run.contact(), JSON.stringify({ hz, type, direction, theta, finite })).toBe(false);
          closest = Math.min(closest, run.gap());
          peakDeceleration = Math.max(peakDeceleration, (speed - run.rider.speed) * hz);
        }
        expect(run.rider.speed).toBeLessThan(0.1);
        expect(closest).toBeGreaterThan(0.25);
        expect(peakDeceleration).toBeLessThanOrEqual(6.5 + 1e-6);
        expect(run.scope.statsRef.current).toEqual({ safetyScore: 100, crashes: 0 });
        run.scope.pedsRef.current = [];
        const before = { x: run.rider.x, y: run.rider.y };
        for (let frame = 0; frame < hz * 2; frame++) run.step(1 / hz);
        expect(run.rider.speed).toBeGreaterThan(2);
        expect(Math.hypot(run.rider.x - before.x, run.rider.y - before.y)).toBeGreaterThan(2);
      }
    }
  });

  it.each([30, 60, 144])('holds on changing bends and releases after the actual walker crosses at %i Hz', hz => {
    for (const type of ['cyclist', 'motorcycle']) for (const direction of [-1, 1]) {
      for (const bend of [-1, 1]) {
        const run = encounter({ type, direction, bend, pedestrianLateral: 4.5 });
        let stopped = 0, completed = false, resumed = false;
        for (let frame = 0; frame < hz * 16; frame++) {
          run.step(1 / hz); run.walk(1 / hz);
          expect(run.contact()).toBe(false);
          if (run.pedestrian.crossing && run.rider.speed < 0.1) stopped++;
          completed ||= !run.pedestrian.crossing;
          const station = RR.mainRoadLocalPoint(run.world, run.rider.x, run.rider.y).longitudinal;
          resumed ||= completed && (station - 48) * direction > 4 && run.rider.speed > 2;
          if (resumed) break;
        }
        expect(stopped).toBeGreaterThan(1); expect(completed).toBe(true); expect(resumed).toBe(true);
      }
    }
  });

  it.each([1 / 144, 1 / 60, 1 / 30, 0.2])('rejects late entry without tunnelling at dt=%s', dt => {
    for (const type of ['cyclist', 'motorcycle']) for (const direction of [-1, 1]) {
      const size = RR.vulnerableRoadUserFootprint({ type });
      const run = encounter({ type, direction, finite: true, speed: 40, ahead: size.length / 2 + 0.4 });
      const previous = { ...run.rider };
      run.step(dt);
      expect(run.contact()).toBe(false);
      if (40 * dt > 0.4) {
        expect(run.rider.speed).toBe(0);
        expect(run.rider.y).toBe(previous.y);
        expect(run.rider._roadStation).toBe(previous._roadStation);
        expect(run.rider._bikeLane).toBe(previous._bikeLane);
      }
    }
  });

  it.each([30, 60, 144])('protects crossings in both cross-street directions at %i Hz', hz => {
    for (const type of ['cyclist', 'motorcycle']) for (const direction of [-1, 1]) {
      const run = encounter({ type, finite: true, ahead: 14, speed: 6 });
      Object.assign(run.rider, { x: 48 - direction * 14, y: 48,
        heading: direction > 0 ? 0 : Math.PI, crossStreet: true });
      Object.assign(run.pedestrian, { x: 48, y: 48 });
      for (let frame = 0; frame < hz * 8; frame++) {
        run.step(1 / hz); expect(run.contact()).toBe(false);
      }
      expect(run.rider.speed).toBeLessThan(0.1); expect(run.gap()).toBeGreaterThan(0.25);
      run.scope.pedsRef.current = [];
      const before = run.rider.x;
      for (let frame = 0; frame < hz * 2; frame++) run.step(1 / hz);
      expect((run.rider.x - before) * direction).toBeGreaterThan(2);
    }
  });

  it('uses narrow rider bodies and lets a close but clear roadside pedestrian remain unblocked', () => {
    for (const type of ['cyclist', 'motorcycle']) {
      const size = RR.vulnerableRoadUserFootprint({ type });
      const rider = { type, x: 48, y: 40, heading: Math.PI / 2, speed: 6 };
      const pedestrian = { x: 48 + size.width / 2 + 0.6, y: 45, crossing: false };
      expect(RR.trafficPedestrianControl(null, rider, [pedestrian], [], 1 / 60,
        { activeOnly: true }).required).toBe(false);
      rider.y = 47;
      expect(RR.guardTrafficPedestrianMotion(rider,
        { x: 48, y: 40, heading: Math.PI / 2 }, [pedestrian])).toBe(true);
    }
  });

  it('protects the complete rider length without treating a bicycle as a full car', () => {
    for (const type of ['cyclist', 'motorcycle']) {
      const size = RR.vulnerableRoadUserFootprint({ type });
      const rider = { type, x: 48, y: 40, heading: Math.PI / 2, speed: 6 };
      const control = RR.trafficPedestrianControl(null, rider,
        [{ x: 48, y: 45, crossing: true }], [], 1 / 60, { activeOnly: true });
      expect(control.distance).toBeCloseTo(5 - size.length / 2 - 1.08, 9);
    }
  });

  it.each([30, 60, 144])('keeps the learner-following cap while a crossing is also active at %i Hz', hz => {
    for (const type of ['cyclist', 'motorcycle']) for (const direction of [-1, 1]) {
      const run = encounter({ type, direction });
      const lead = run.point(48 - direction * 10, run.lane);
      Object.assign(run.scope.carRef.current, lead, { heading: run.rider.heading, speed: 0 });
      for (let frame = 0; frame < hz * 9; frame++) {
        run.step(1 / hz);
        expect(run.contact()).toBe(false);
        expect(RR.vehicleRectsOverlap(run.rider, run.size,
          run.scope.carRef.current, RR.vehicleFootprint('sedan'))).toBe(false);
      }
      expect(run.rider._followingPlayer).toBe(true);
      expect(run.rider.speed).toBeLessThan(0.1);
    }
  });

  it('preserves unaffected rider motion, impacted riders and finite/streamed recycling', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      for (const type of ['cyclist', 'motorcycle']) for (const finite of [false, true]) {
        for (const hit of [false, true]) for (const recycle of [false, true]) {
          const run = encounter({ type, finite }); run.scope.pedsRef.current = [];
          run.rider._hit = hit;
          if (recycle) { run.rider.y = 150; run.rider._roadStation = 150; }
          const beforeScope = { ...run.scope, cyclistsRef: { current: [{ ...run.rider }] } };
          makeBeforeUpdater(beforeScope)(1 / 60); run.step(1 / 60);
          // round 32 (tr32): a streamed recycle now lands outside the learner's stopping envelope, so it no longer equals the old code
          if (recycle && !finite && !hit) { const away = Math.abs(run.rider._roadStation - RR.mainRoadLocalPoint(run.scope.infiniteWorldRef.current, run.scope.carRef.current.x, run.scope.carRef.current.y).longitudinal); expect(away).toBeGreaterThanOrEqual(RR.RR_SPAWN_BEHIND_MIN_METERS - 1e-6); continue; }
          for (const key of ['x', 'y', 'heading', 'speed', '_cruiseSpeed', '_roadStation',
            '_bikeLane', '_hit', '_followingPlayer', '_brakingForPlayer'])
            expect(run.rider[key], key).toEqual(beforeScope.cyclistsRef.current[0][key]);
        }
      }
    } finally { random.mockRestore(); }
  });
});
