import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.RR_EMERGENCY_PEDESTRIAN_SOURCE || 'stem_lab/stem_tool_roadready.js';
let RR, makeUpdater, makePedestrianUpdater;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(sourcePath, 'roadReady'); RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync(sourcePath, 'utf8');
  const start = source.indexOf('        var _nextDrillSpawn = 20;');
  const end = source.indexOf('        var updateCyclists = function(dt)', start);
  const pedStart = source.indexOf('        var updatePeds = function(dt) {');
  const pedEnd = source.indexOf('        // scanSpatialHazards:', pedStart);
  if (start < 0 || end < start || pedStart < 0 || pedEnd < pedStart) throw Error('Actual updater not found');
  makeUpdater = new Function('scope', 'with(scope){' + source.slice(start, end) + '\nreturn updateEmergency;}');
  makePedestrianUpdater = new Function('scope', 'with(scope){' + source.slice(pedStart, pedEnd) + '\nreturn updatePeds;}');
});

function encounter({ kind = 'firetruck', direction = -1, theta = 0, bend = 0, finite = false,
  ahead = 65, speed = 20, lateral, crossing = true } = {}) {
  const profile = { lanes: 2, roadHalfWidth: 3.5 };
  const world = finite ? null : { profile, chunks: {}, getChunk: () => profile, spline: bend ? {
    centerAt: station => 48 + bend * 4 * Math.sin((station - 48) * 0.05),
    headingAt: station => Math.atan(bend * 0.2 * Math.cos((station - 48) * 0.05)),
  } : { centerAt: station => 48 + Math.tan(theta) * (station - 48), headingAt: () => theta } };
  const lane = -direction * 1.6;
  const point = (station, offset) => world ? RR.mainRoadWorldPoint(world, station, offset)
    : { x: 48 + offset, y: station, heading: 0 };
  const sourceStation = 48 - direction * ahead * (world && !bend ? Math.cos(theta) : 1);
  const source = point(sourceStation, lane);
  const responder = { x: source.x, y: source.y, heading: direction * Math.PI / 2 - source.heading,
    kind, speed, _cruiseSpeed: speed, _travelSign: direction, _laneOff: lane, _homeLaneOff: lane,
    _roadStation: sourceStation, life: 1000, responded: true, checked: true };
  const offset = lateral == null ? lane : lateral, home = point(48, offset);
  const pedestrian = { x: home.x, y: home.y, homeX: home.x, homeY: home.y,
    kind: 'adult', crossing, waitingAtCrosswalk: true, crosswalkY: 48, crossDwell: 0,
    crossDirection: -1, sidewalkLeft: 43.5, sidewalkRight: 52.5,
    _curvedRoadFrame: !!world, _roadStation: 48, _sidewalkOffset: 4.5,
    _sidewalkLateral: offset, _crossTargetLateral: 4.5, vx: 0.6, vy: 0 };
  const parked = point(48 + direction * 80, lane + 12);
  const scope = { ...RR, MAP_SIZE: 96, d: {}, currentVehicle: { id: 'sedan' },
    currentScenario: { id: 'residential', speedLimit: 25, weather: 'clear' },
    carRef: { current: { x: parked.x, y: parked.y, heading: direction * Math.PI / 2 - parked.heading, speed: 0 } },
    emergencyRef: { current: responder }, infiniteWorldRef: { current: world },
    trafficRef: { current: [] }, cyclistsRef: { current: [] }, pedsRef: { current: [pedestrian] },
    signalsRef: { current: [] }, wildlifeRef: { current: null }, timeRef: { current: 31 },
    statsRef: { current: { safetyScore: 100, crashes: 0 } }, audioRef: { current: {} },
    calmDriveRef: { current: true }, eventToastRef: { current: null },
    addToast() {}, speak() {}, showDriveAlert() {}, safeTimeout() {}, unlockBadge() {}, upd() {},
  };
  const update = makeUpdater(scope), updatePedestrian = makePedestrianUpdater(scope);
  const size = RR.vehicleFootprint(RR.emergencyVehicleFootprintType(kind));
  return { responder, pedestrian, scope, world, size, point, direction,
    step(dt) { update(dt); scope.timeRef.current += dt; }, updatePedestrian,
    contact() { return scope.pedsRef.current.includes(pedestrian) &&
      RR.pointOverlapsVehicle(responder, size, pedestrian, 0.28); },
    gap() { return (pedestrian.x - responder.x) * Math.cos(responder.heading) +
      (pedestrian.y - responder.y) * Math.sin(responder.heading) - size.length / 2 - 0.28; },
  };
}

describe('ordinary-road emergency vehicles protect active pedestrians', () => {
  it.each([30, 60, 144])('stops all full responder bodies before the crossing and resumes at %i Hz', hz => {
    for (const kind of ['ambulance', 'police', 'firetruck']) for (const direction of [-1, 1]) {
      for (const theta of [-0.35, 0, 0.35]) for (const finite of [false, true]) {
        const run = encounter({ kind, direction, theta, finite });
        let minimumGap = Infinity, largestDeceleration = 0;
        for (let frame = 0; frame < hz * 7; frame++) {
          const speed = run.responder.speed; run.step(1 / hz);
          expect(run.contact(), JSON.stringify({ hz, kind, direction, theta, finite })).toBe(false);
          minimumGap = Math.min(minimumGap, run.gap());
          largestDeceleration = Math.max(largestDeceleration, (speed - run.responder.speed) * hz);
        }
        expect(run.scope.emergencyRef.current).toBe(run.responder);
        expect(run.responder.speed).toBeLessThan(0.1);
        expect(minimumGap).toBeGreaterThan(0.25);
        expect(largestDeceleration).toBeLessThanOrEqual(6.5 + 1e-6);
        expect(run.scope.statsRef.current).toEqual({ safetyScore: 100, crashes: 0 });
        run.scope.pedsRef.current = [];
        const before = { x: run.responder.x, y: run.responder.y };
        for (let frame = 0; frame < hz * 3; frame++) run.step(1 / hz);
        expect(run.responder.speed).toBeGreaterThan(3);
        expect(Math.hypot(run.responder.x - before.x, run.responder.y - before.y)).toBeGreaterThan(5);
      }
    }
  });

  it.each([30, 60, 144])('rejects a late pedestrian entry inside stopping range without tunnelling at %i Hz', hz => {
    for (const kind of ['ambulance', 'police', 'firetruck']) for (const direction of [-1, 1]) {
      const size = RR.vehicleFootprint(RR.emergencyVehicleFootprintType(kind));
      const run = encounter({ kind, direction, finite: true, ahead: size.length / 2 + 0.4, speed: 40 });
      for (let frame = 0; frame < hz; frame++) { run.step(1 / hz); expect(run.contact()).toBe(false); }
      expect(run.responder.speed).toBeLessThan(0.1);
      expect(run.gap()).toBeGreaterThanOrEqual(0);
    }
  });

  it.each([30, 60, 144])('combines queue and crossing plans without doubling braking at %i Hz', hz => {
    for (const direction of [-1, 1]) {
      const run = encounter({ direction, finite: true });
      const lead = { x: run.pedestrian.x, y: 48 - direction * 12, heading: run.responder.heading, speed: 0, type: 'car' };
      run.scope.trafficRef.current = [lead]; let peak = 0;
      for (let frame = 0; frame < hz * 12; frame++) {
        const speed = run.responder.speed; run.step(1 / hz);
        peak = Math.max(peak, (speed - run.responder.speed) * hz);
        expect(run.contact()).toBe(false);
        expect(RR.vehicleRectsOverlap(run.responder, run.size, lead, RR.vehicleFootprint('car'))).toBe(false);
      }
      expect(peak).toBeLessThanOrEqual(6.5 + 1e-6);
      expect(run.responder.speed).toBeLessThan(0.1);
    }
  });

  it.each([30, 60, 144])('waits for an active crossing from either curb at %i Hz', hz => {
    for (const direction of [-1, 1]) for (const lateral of [-4.5, 4.5]) {
      const run = encounter({ direction, lateral, theta: 0.35 });
      for (let frame = 0; frame < hz * 7; frame++) run.step(1 / hz);
      expect(run.responder.speed).toBeLessThan(0.1);
      const station = RR.mainRoadLocalPoint(run.world, run.responder.x, run.responder.y).longitudinal;
      expect((48 - station) * direction).toBeGreaterThan(run.size.length / 2);
    }
  });

  it.each([30, 60, 144])('keeps the existing clear approach for curb-only walkers at %i Hz', hz => {
    for (const direction of [-1, 1]) for (const lateral of [-4.5, 4.5]) {
      const run = encounter({ direction, lateral, crossing: false, theta: -0.35 });
      for (let frame = 0; frame < hz * 4; frame++) {
        run.step(1 / hz); expect(run.contact()).toBe(false); expect(run.responder.speed).toBe(20);
      }
    }
  });

  it.each([-1, 1])('protects full bodies through a changing road curvature with bend %i', bend => {
    for (const direction of [-1, 1]) for (const kind of ['ambulance', 'police', 'firetruck']) {
      const run = encounter({ direction, kind, bend, speed: 15 });
      for (let frame = 0; frame < 720; frame++) { run.step(1 / 60); expect(run.contact()).toBe(false); }
      expect(run.responder.speed).toBeLessThan(0.1);
    }
  });

  it.each([30, 60, 144])('lets the actual walker finish before crossing and then resumes at %i Hz', hz => {
    for (const direction of [-1, 1]) for (const finite of [false, true]) {
      const run = encounter({ direction, finite, theta: 0.25, lateral: -4.5, speed: 18, ahead: 50 });
      let completed = false, stopped = false, passed = false;
      for (let frame = 0; frame < hz * 18; frame++) {
        run.step(1 / hz); run.updatePedestrian(1 / hz);
        expect(run.contact()).toBe(false);
        completed ||= !run.pedestrian.crossing;
        stopped ||= run.responder.speed < 0.1;
        const station = run.world ? RR.mainRoadLocalPoint(run.world, run.responder.x, run.responder.y).longitudinal : run.responder.y;
        if ((48 - station) * direction < -5) { expect(completed).toBe(true); passed = true; break; }
      }
      expect(stopped).toBe(true); expect(completed).toBe(true); expect(passed).toBe(true);
      expect(run.responder.speed).toBeGreaterThan(3);
    }
  });

  it('uses responder dimensions and keeps ordinary traffic curb intent unchanged', () => {
    const run = encounter({ crossing: false, lateral: -4.5 });
    const options = { vehicleType: 'firetruck', activeOnly: true };
    expect(RR.trafficPedestrianControl(run.world, run.responder, [run.pedestrian], [], 1 / 60).required).toBe(true);
    expect(RR.trafficPedestrianControl(run.world, run.responder, [run.pedestrian], [], 1 / 60, options).required).toBe(false);
    const ped = { ...run.pedestrian, x: run.responder.x, y: run.responder.y - 3.7, crossing: true };
    const previous = { ...run.responder }, vehicle = { ...run.responder };
    expect(RR.guardTrafficPedestrianMotion(vehicle, previous, [ped], 'firetruck')).toBe(false);
    expect(RR.guardTrafficPedestrianMotion({ ...run.responder }, previous, [ped], 'car')).toBe(true);
  });

  it('ignores retired, behind and clear adjacent pedestrians, including completed crossing dwell', () => {
    for (const mode of ['retired', 'behind', 'adjacent', 'dwell']) {
      const run = encounter({ crossing: false, lateral: 4.5 });
      if (mode === 'retired') Object.assign(run.pedestrian, { _hit: true, x: run.responder.x, y: run.responder.y - 5 });
      if (mode === 'behind') Object.assign(run.pedestrian, { crossing: true, y: run.responder.y + 10, crosswalkY: run.responder.y + 10 });
      if (mode === 'adjacent') Object.assign(run.pedestrian, { waitingAtCrosswalk: false, x: run.responder.x + 3 });
      if (mode === 'dwell') run.pedestrian.crossDwell = 8;
      run.step(1 / 60); expect(run.responder.speed, mode).toBe(20);
    }
  });

  it('retains a missing cruise speed before braking and resumes after clearance', () => {
    const run = encounter({ ahead: 30 }); delete run.responder._cruiseSpeed;
    for (let frame = 0; frame < 360; frame++) run.step(1 / 60);
    expect(run.responder._cruiseSpeed).toBe(20); expect(run.responder.speed).toBeLessThan(0.1);
    run.scope.pedsRef.current = [];
    for (let frame = 0; frame < 180; frame++) run.step(1 / 60);
    expect(run.responder.speed).toBeGreaterThan(3);
  });

  it('rolls the spline station and lane interpolation back with a blocked lateral step', () => {
    const run = encounter({ ahead: 4.15, speed: 40 });
    run.responder._targetLaneOff = -1.6;
    const before = { x: run.responder.x, y: run.responder.y, station: run.responder._roadStation, lane: run.responder._laneOff };
    run.step(1 / 30);
    expect(run.contact()).toBe(false); expect(run.responder.speed).toBe(0);
    expect(run.responder.x).toBe(before.x); expect(run.responder.y).toBe(before.y);
    expect(run.responder._roadStation).toBe(before.station); expect(run.responder._laneOff).toBe(before.lane);
  });
});
