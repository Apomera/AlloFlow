import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const toolPath = process.env.RR_EMERGENCY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let RR, makeUpdater;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(toolPath, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync(toolPath, 'utf8');
  const start = source.indexOf('        var _nextDrillSpawn = 20;');
  const end = source.indexOf('        var updateCyclists = function(dt)', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate live emergency updater');
  makeUpdater = new Function('scope', 'with(scope) {' + source.slice(start, end) + '\nreturn updateEmergency;}');
});

function queue({ direction = -1, theta = 0, kind = 'ambulance', leadType = 'car',
  ahead = 75, speed = 20, finite = false, lateral = 0 } = {}) {
  const profile = { roadHalfWidth: 3.5, lanes: 2 };
  const world = { profile, chunks: {}, getChunk: () => profile, spline: {
    centerAt: station => 48 + Math.tan(theta) * (station - 48), headingAt: () => theta,
  } };
  const lane = -direction * 1.6, heading = direction * Math.PI / 2 - theta;
  let sourceStation = 48 - direction * ahead * Math.cos(theta), leadStation = 48;
  const responder = { ...RR.mainRoadWorldPoint(world, sourceStation, lane), heading, speed,
    kind, _cruiseSpeed: speed, _travelSign: direction, _laneOff: lane, _homeLaneOff: lane,
    _roadStation: sourceStation, life: 1000, checked: true, responded: true };
  const leader = { ...RR.mainRoadWorldPoint(world, leadStation, lane + lateral), heading,
    type: leadType, id: 'emergency-queue-lead', speed: 0 };
  const scope = { ...RR, MAP_SIZE: 96, d: {}, currentVehicle: { id: 'sedan' },
    currentScenario: { id: 'residential', speedLimit: 25, weather: 'clear' },
    carRef: { current: { x: 70, y: 48, heading, speed: 0 } },
    infiniteWorldRef: { current: finite ? null : world }, emergencyRef: { current: responder },
    trafficRef: { current: [leader] }, pedsRef: { current: [] }, cyclistsRef: { current: [] },
    wildlifeRef: { current: null }, audioRef: { current: {} }, timeRef: { current: 31 },
    statsRef: { current: { safetyScore: 100, crashes: 0 } }, calmDriveRef: { current: true },
    eventToastRef: { current: null }, addToast() {}, speak() {}, showDriveAlert() {},
    safeTimeout() {}, unlockBadge() {}, upd() {},
  };
  if (finite) {
    Object.assign(responder, { x: 49.6, y: 48 - direction * ahead, heading: direction * Math.PI / 2 });
    Object.assign(leader, { x: 49.6 + lateral, y: 48, heading: direction * Math.PI / 2 });
  }
  const update = makeUpdater(scope);
  const sourceSize = RR.vehicleFootprint(RR.emergencyVehicleFootprintType(kind));
  const leadSize = leadType === 'cyclist' || leadType === 'motorcycle'
    ? RR.vulnerableRoadUserFootprint(leader) : RR.vehicleFootprint(leadType);
  return { responder, leader, scope, world, sourceSize, leadSize,
    step(dt) { update(dt); scope.timeRef.current += dt; },
    contact() { return (scope.trafficRef.current.includes(leader) || scope.cyclistsRef.current.includes(leader)) &&
      RR.vehicleRectsOverlap(responder, sourceSize, leader, leadSize); },
    gap() { return ((leader.x - responder.x) * Math.sin(theta) +
      (leader.y - responder.y) * Math.cos(theta)) * direction - (sourceSize.length + leadSize.length) / 2; },
    moveLeader(dt) {
      leadStation += direction * leader.speed * dt * Math.cos(theta);
      Object.assign(leader, RR.mainRoadWorldPoint(world, leadStation, lane + lateral), { heading });
    },
  };
}

describe('ordinary-road emergency responders protect traffic queues', () => {
  it.each([30, 60, 144])('stops all responder classes short of complete queue bodies at %i Hz', hz => {
    for (const kind of ['ambulance', 'firetruck', 'police']) for (const leadType of ['car', 'schoolbus']) {
      for (const direction of [-1, 1]) for (const theta of [-0.35, 0, 0.35]) {
        const run = queue({ kind, leadType, direction, theta });
        let contacts = 0, minimumGap = Infinity, largestDeceleration = 0;
        for (let frame = 0; frame < hz * 12; frame++) {
          const previous = run.responder.speed;
          run.step(1 / hz);
          contacts += Number(run.contact());
          minimumGap = Math.min(minimumGap, run.gap());
          largestDeceleration = Math.max(largestDeceleration, (previous - run.responder.speed) * hz);
        }
        const description = JSON.stringify({ hz, kind, leadType, direction, theta });
        expect(contacts, description).toBe(0);
        expect(minimumGap, description).toBeGreaterThanOrEqual(0.25 - 1e-6);
        expect(run.responder.speed, description).toBeLessThan(0.1);
        expect(largestDeceleration, description).toBeLessThanOrEqual(6.5 + 1e-6);
        expect(run.scope.statsRef.current).toEqual({ safetyScore: 100, crashes: 0 });
      }
    }
  });

  it.each([30, 60, 144])('rejects a late, physically unavoidable queue entry at %i Hz', hz => {
    for (const direction of [-1, 1]) for (const kind of ['ambulance', 'firetruck', 'police']) {
      const size = RR.vehicleFootprint(RR.emergencyVehicleFootprintType(kind));
      const run = queue({ kind, direction, ahead: (size.length + 10) / 2 + 0.4, leadType: 'schoolbus', speed: 40 });
      for (let frame = 0; frame < hz; frame++) {
        run.step(1 / hz);
        expect(run.contact()).toBe(false);
        expect(run.gap()).toBeGreaterThanOrEqual(0.25 - 1e-6);
      }
      expect(run.responder.speed).toBeLessThan(0.1);
    }
  });

  it.each([30, 60, 144])('holds safely on finite roads in both directions at %i Hz', hz => {
    for (const direction of [-1, 1]) {
      const run = queue({ direction, finite: true, ahead: 20 });
      for (let frame = 0; frame < hz * 6; frame++) {
        run.step(1 / hz);
        expect(run.contact()).toBe(false);
      }
      expect(run.responder.speed).toBeLessThan(0.1);
    }
  });

  it.each(['moves forward', 'moves aside', 'is removed'])('resumes after the queue %s', release => {
    for (const direction of [-1, 1]) {
      const run = queue({ direction, theta: 0.35 });
      for (let frame = 0; frame < 720; frame++) run.step(1 / 60);
      expect(run.responder.speed).toBeLessThan(0.1);
      const before = { x: run.responder.x, y: run.responder.y };
      if (release === 'moves forward') run.leader.speed = 6;
      else if (release === 'moves aside') {
        const frame = RR.mainRoadLocalPoint(run.world, run.leader.x, run.leader.y);
        const heading = run.leader.heading;
        Object.assign(run.leader, RR.mainRoadWorldPoint(run.world, frame.longitudinal, frame.lateral + 5), { heading });
      } else run.scope.trafficRef.current = [];
      for (let frame = 0; frame < 360; frame++) {
        if (release === 'moves forward') run.moveLeader(1 / 60);
        run.step(1 / 60);
        expect(run.contact()).toBe(false);
      }
      expect(Math.hypot(run.responder.x - before.x, run.responder.y - before.y)).toBeGreaterThan(15);
      expect(run.responder.speed).toBeGreaterThan(3);
    }
  });

  it('does not brake for vehicles behind, in a clear adjacent lane, or on another corridor', () => {
    for (const mode of ['behind', 'adjacent', 'cross street', 'oncoming']) {
      const run = queue({ lateral: mode === 'adjacent' ? 4 : 0 });
      if (mode === 'behind') Object.assign(run.leader, { y: run.responder.y + 20 });
      if (mode === 'cross street') Object.assign(run.leader, { crossStreet: true,
        _crossPose: RR.crossStreetPose(48, 48, 0, 6.5, 40), _crossDirection: 1, heading: 0 });
      if (mode === 'oncoming') Object.assign(run.leader, { x: 46.4, heading: Math.PI / 2 });
      run.step(1 / 60);
      expect(run.responder.speed, mode).toBe(20);
    }
  });

  it.each([30, 60, 144])('also protects a stopped cyclist using the rider footprint at %i Hz', hz => {
    const run = queue({ leadType: 'cyclist', speed: 12 });
    run.scope.trafficRef.current = [];
    run.scope.cyclistsRef.current = [run.leader];
    for (let frame = 0; frame < hz * 12; frame++) {
      run.step(1 / hz);
      expect(run.contact()).toBe(false);
    }
    expect(run.responder.speed).toBeLessThan(0.1);
    expect(run.gap()).toBeGreaterThan(0.25);
    const adjacent = queue({ leadType: 'cyclist', lateral: 1.7, ahead: 20, speed: 12 });
    adjacent.scope.trafficRef.current = [];
    adjacent.scope.cyclistsRef.current = [adjacent.leader];
    adjacent.step(1 / hz);
    expect(adjacent.responder.speed).toBe(12);
  });

  it.each([30, 60, 144])('guards against a crossing car that appears inside stopping range at %i Hz', hz => {
    const run = queue({ ahead: 3.45, speed: 40 });
    Object.assign(run.leader, { heading: 0, crossStreet: true,
      _crossPose: RR.crossStreetPose(49.6, 48, 0, 6.5, 40), _crossDirection: 1 });
    expect(run.contact()).toBe(false);
    const before = { x: run.responder.x, y: run.responder.y };
    run.step(1 / hz);
    expect(run.contact()).toBe(false);
    expect(run.responder.speed).toBe(0);
    expect(run.responder.x).toBe(before.x);
    expect(run.responder.y).toBe(before.y);
  });

  it('retains lane state while a body blocks lateral movement, then retries when clear', () => {
    const run = queue({ ahead: 0, speed: 0, lateral: 2.1 });
    run.responder._targetLaneOff = run.responder._laneOff + 1;
    let blockedFrames = 0;
    for (let frame = 0; frame < 180; frame++) {
      const previous = { x: run.responder.x, lane: run.responder._laneOff };
      run.step(1 / 60);
      expect(run.contact()).toBe(false);
      if (frame > 30 && run.responder.x === previous.x) {
        blockedFrames++;
        expect(run.responder._laneOff).toBe(previous.lane);
      }
    }
    expect(blockedFrames).toBeGreaterThan(10);
    const heldX = run.responder.x;
    run.scope.trafficRef.current = [];
    for (let frame = 0; frame < 180; frame++) run.step(1 / 60);
    expect(run.responder.x - heldX).toBeGreaterThan(0.5);
    expect(run.responder._laneOff).toBeCloseTo(run.responder._targetLaneOff, 2);
  });

  it('retains a valid cruise target for a responder created without an explicit cruise field', () => {
    const run = queue();
    delete run.responder._cruiseSpeed;
    for (let frame = 0; frame < 720; frame++) run.step(1 / 60);
    expect(run.responder.speed).toBeLessThan(0.1);
    expect(run.responder._cruiseSpeed).toBe(20);
    run.scope.trafficRef.current = [];
    for (let frame = 0; frame < 300; frame++) run.step(1 / 60);
    expect(run.responder.speed).toBeGreaterThan(10);
  });
});
