import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.RR_SPAWN_SOURCE || 'stem_lab/stem_tool_roadready.js';
let RR, makeUpdater;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(sourcePath, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync(sourcePath, 'utf8');
  const start = source.indexOf('        var _nextDrillSpawn = 20;');
  const end = source.indexOf('        var updateCyclists = function(dt)', start);
  if (start < 0 || end < start) throw new Error('Live emergency updater not found');
  makeUpdater = new Function('scope', 'with(scope) {' + source.slice(start, end) + '\nreturn updateEmergency;}');
});

function rig({ kind = 'firetruck', direction = -1, theta = 0, finite = false, playerSpeed = 0, drill = false } = {}) {
  const profile = { roadHalfWidth: 3.5, lanes: 2 };
  const world = finite ? null : { profile, chunks: {}, getChunk: () => profile, spline: {
    centerAt: station => 48 + Math.tan(theta) * (station - 48), headingAt: () => theta,
  } };
  const lane = -direction * 1.6, heading = direction * Math.PI / 2 - (finite ? 0 : theta);
  const car = world ? { ...RR.mainRoadWorldPoint(world, 48, lane), heading, speed: playerSpeed }
    : { x: 49.6, y: 48, heading, speed: playerSpeed };
  const station = 48 - direction * (world ? 78 : 26);
  const point = world ? RR.mainRoadWorldPoint(world, station, lane) : { x: car.x, y: station };
  const candidate = { ...point, heading, kind, speed: playerSpeed + 12, _cruiseSpeed: playerSpeed + 12,
    _travelSign: direction, _roadStation: station, _laneOff: world ? lane : 0 };
  const events = { alerts: [], speech: [], toasts: [], requests: 0 };
  const spawn = { kind, icon: kind, color: '#fff', sirenFreq: 600 };
  const scope = { ...RR, Math: Object.create(Math), MAP_SIZE: 96, d: { emergencyDrillMode: drill },
    currentScenario: { id: 'residential', speedLimit: 25, traffic: 'medium' }, currentVehicle: { id: 'sedan' },
    carRef: { current: car }, infiniteWorldRef: { current: world }, emergencyRef: { current: null },
    trafficRef: { current: [] }, cyclistsRef: { current: [] }, pedsRef: { current: [] },
    wildlifeRef: { current: null }, timeRef: { current: 31 }, statsRef: { current: { safetyScore: 100, crashes: 0 } },
    audioRef: { current: {} }, calmDriveRef: { current: true }, eventToastRef: { current: null },
    showDriveAlert: text => events.alerts.push(text), speak: text => events.speech.push(text),
    addToast: text => events.toasts.push(text), safeTimeout() {}, unlockBadge() {}, upd() {},
    maybeSpawnEmergency: () => { events.requests++; return spawn; },
  };
  scope.Math.random = () => 0.5;
  const update = makeUpdater(scope);
  function actor(type, ahead = 0, lateral = 0, speed = 0) {
    return { x: point.x + Math.cos(heading) * ahead - Math.sin(heading) * lateral,
      y: point.y + Math.sin(heading) * ahead + Math.cos(heading) * lateral, heading, type, speed };
  }
  return { scope, world, candidate, events, actor, update,
    step(dt = 1 / 60) { update(dt); scope.timeRef.current += dt; },
    advance(seconds, hz = 60) { for (let frame = 0; frame < Math.ceil(seconds * hz); frame++) this.step(1 / hz); },
  };
}

describe('ordinary-road emergency encounters enter genuine traffic gaps', () => {
  it.each([30, 60, 144])('does not create any responder inside a vehicle body at %i Hz', hz => {
    for (const kind of ['ambulance', 'police', 'firetruck']) for (const direction of [-1, 1]) {
      for (const theta of [-0.35, 0, 0.35]) for (const finite of [false, true]) {
        for (const type of ['car', 'schoolbus', 'truck', 'cyclist', 'motorcycle']) {
          const run = rig({ kind, direction, theta, finite });
          const blocker = run.actor(type);
          (type === 'cyclist' || type === 'motorcycle' ? run.scope.cyclistsRef : run.scope.trafficRef).current = [blocker];
          run.step(1 / hz);
          expect(run.scope.emergencyRef.current, JSON.stringify({ hz, kind, direction, theta, finite, type })).toBeNull();
          expect(run.events.alerts).toEqual([]);
          expect(run.events.speech).toEqual([]);
          expect(run.events.toasts).toEqual([]);
          expect(run.scope.statsRef.current).toEqual({ safetyScore: 100, crashes: 0 });
        }
      }
    }
  });

  it.each([30, 60, 144])('retries the same pending encounter after the body clears at %i Hz', hz => {
    for (const direction of [-1, 1]) {
      const run = rig({ direction, theta: 0.35 });
      run.scope.trafficRef.current = [run.actor('schoolbus')];
      run.step(1 / hz); run.advance(0.4, hz);
      expect(run.scope.emergencyRef.current).toBeNull();
      expect(run.events.requests).toBe(1);
      expect(run.events.alerts).toEqual([]);
      run.scope.maybeSpawnEmergency = () => { throw new Error('A pending encounter must retain its selected responder'); };
      run.scope.trafficRef.current = [];
      run.advance(0.7, hz);
      expect(run.scope.emergencyRef.current?.kind).toBe('firetruck');
      expect(run.events.alerts).toHaveLength(1);
      expect(run.events.speech).toHaveLength(1);
      expect(run.events.toasts).toHaveLength(1);
      expect(run.update._pendingRoadSpawn).toBeNull();
    }
  });

  it.each(['ambulance', 'police', 'firetruck'])('creates %s at a holding speed behind a stopped long bus', kind => {
    for (const direction of [-1, 1]) for (const theta of [-0.35, 0, 0.35]) for (const finite of [false, true]) {
      const run = rig({ kind, direction, theta, finite });
      const own = RR.vehicleFootprint(RR.emergencyVehicleFootprintType(kind));
      const bus = run.actor('schoolbus', (own.length + 10) / 2 + 1.6);
      run.scope.trafficRef.current = [bus];
      run.step();
      const em = run.scope.emergencyRef.current;
      expect(em, JSON.stringify({ kind, direction, theta, finite })).not.toBeNull();
      expect(em._cruiseSpeed).toBe(12);
      expect(em.speed).toBeLessThan(0.1);
      const before = { x: em.x, y: em.y };
      run.advance(1);
      expect(Math.hypot(em.x - before.x, em.y - before.y)).toBeLessThan(0.1);
      expect(RR.vehicleRectsOverlap(em, own, bus, RR.vehicleFootprint('schoolbus'))).toBe(false);
      run.scope.trafficRef.current = [];
      run.advance(2);
      expect(em.speed).toBeGreaterThan(3);
    }
  });

  it.each([30, 60, 144])('does not cut into a fast rear vehicle\'s stopping space at %i Hz', hz => {
    for (const direction of [-1, 1]) for (const finite of [false, true]) {
      for (const type of ['car', 'schoolbus', 'motorcycle']) {
        const run = rig({ direction, finite, theta: 0.2 });
        const own = RR.vehicleFootprint('firetruck');
        const size = type === 'motorcycle' ? RR.vulnerableRoadUserFootprint({ type }) : RR.vehicleFootprint(type);
        const rear = run.actor(type, -(own.length + size.length) / 2 - 10, 0, 35);
        (type === 'motorcycle' ? run.scope.cyclistsRef : run.scope.trafficRef).current = [rear];
        expect(RR.vehicleRectsOverlap(run.candidate, own, rear, size)).toBe(false);
        run.step(1 / hz);
        expect(run.scope.emergencyRef.current).toBeNull();
        expect(run.events.alerts).toEqual([]);
        rear.speed = 12;
        run.advance(0.7, hz);
        expect(run.scope.emergencyRef.current).not.toBeNull();
      }
    }
  });

  it.each(['pedestrian', 'deer', 'child', 'schoolbus_arm', 'learner'])('defers a spawn occupied by an active %s', type => {
    const run = rig(); const point = { x: run.candidate.x, y: run.candidate.y };
    if (type === 'pedestrian') run.scope.pedsRef.current = [point];
    else if (type === 'learner') {
      expect(RR.ordinaryEmergencySpawnState(run.world, run.candidate,
        [{ ...point, heading: run.candidate.heading, type: 'schoolbus', speed: 0 }], [], null, 1 / 60).clear).toBe(false);
      return;
    } else run.scope.wildlifeRef.current = { ...point, heading: run.candidate.heading, kind: type, mass: 'medium', life: 10 };
    run.step();
    expect(run.scope.emergencyRef.current).toBeNull();
    expect(run.events.alerts).toEqual([]);
  });

  it('uses rider dimensions and does not reject clear adjacent, distant, or separate-corridor traffic', () => {
    for (const mode of ['cyclist alongside', 'bus alongside', 'rear far away', 'cross street']) {
      const run = rig(); let other;
      if (mode === 'cyclist alongside') other = run.actor('cyclist', 0, 1.9);
      if (mode === 'bus alongside') other = run.actor('schoolbus', 0, 3.2);
      if (mode === 'rear far away') other = run.actor('car', -110, 0, 35);
      if (mode === 'cross street') other = { ...run.actor('car', -20, 5, 35), heading: 0, crossStreet: true,
        _crossPose: RR.crossStreetPose(48, 48, 0, 6.5, 40), _crossDirection: 1 };
      expect(RR.ordinaryEmergencySpawnState(run.world, run.candidate, [other], [], null, 1 / 60).clear, mode).toBe(true);
    }
  });

  it('keeps the cruising encounter unchanged in an open streamed corridor', () => {
    for (const direction of [-1, 1]) {
      const run = rig({ direction, playerSpeed: 8, theta: 0.35 });
      run.scope.trafficRef.current = [run.actor('car', -25, 0, 20), run.actor('car', 25, 0, 20)];
      run.step();
      expect(run.scope.emergencyRef.current?.speed).toBe(20);
      expect(run.scope.emergencyRef.current?._cruiseSpeed).toBe(20);
    }
  });

  it('ignores retired road users and leaves all active actor records unchanged', () => {
    const run = rig();
    const actors = [{ ...run.actor('schoolbus'), _hit: true }, run.actor('cyclist', 0, 2)];
    const peds = [{ x: run.candidate.x, y: run.candidate.y, _hit: true }];
    const wildlife = { x: run.candidate.x, y: run.candidate.y, kind: 'deer', life: 0 };
    const before = JSON.stringify({ actors, peds, wildlife });
    expect(RR.ordinaryEmergencySpawnState(run.world, run.candidate, actors, peds, wildlife, 1 / 60).clear).toBe(true);
    expect(JSON.stringify({ actors, peds, wildlife })).toBe(before);
  });

  it.each(['mode', 'scenario', 'main-road corridor'])('cancels a deferred encounter when the %s changes', change => {
    const run = rig({ drill: true }); run.scope.trafficRef.current = [run.actor('schoolbus')];
    run.step(); expect(run.scope.emergencyRef.current).toBeNull();
    run.scope.maybeSpawnEmergency = () => null;
    if (change === 'mode') run.scope.d.emergencyDrillMode = false;
    if (change === 'scenario') run.scope.currentScenario.id = 'night';
    if (change === 'main-road corridor') {
      const frame = RR.mainRoadLocalPoint(run.world, run.scope.carRef.current.x, run.scope.carRef.current.y);
      Object.assign(run.scope.carRef.current, RR.mainRoadWorldPoint(run.world, frame.longitudinal, 12));
    }
    run.advance(0.7);
    expect(run.scope.emergencyRef.current).toBeNull();
    expect(run.update._pendingRoadSpawn).toBeNull();
    expect(run.events.alerts).toEqual([]);
  });

  it('does not replace a pending drill with another kind when its next timer passes', () => {
    const run = rig({ drill: true }); run.scope.Math.random = () => 0.9;
    run.scope.trafficRef.current = [run.actor('schoolbus')]; run.step();
    expect(run.scope.emergencyRef.current).toBeNull();
    run.scope.Math.random = () => 0; run.scope.timeRef.current = 100;
    run.step(); expect(run.scope.emergencyRef.current).toBeNull();
    run.scope.trafficRef.current = []; run.advance(0.7);
    expect(run.scope.emergencyRef.current?.kind).toBe('firetruck');
    expect(run.events.alerts).toHaveLength(1);
  });
});
