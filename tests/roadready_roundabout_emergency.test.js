import { beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, emergencySource;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = fs.readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('        var _nextDrillSpawn = 20;');
  emergencySource = source.slice(start, source.indexOf('        var updateCyclists = function(dt)', start));
});

// Execute the actual live updater with ordinary refs. Keeping the movement,
// response clock, and reward branches together catches routing/grading drift.
function emergencyDrive(car, kind = 'ambulance') {
  const messages = [];
  const noop = () => {};
  const state = {
    ...RR, Math: Object.create(Math), MAP_SIZE: 96, d: {},
    currentScenario: { id: 'roundabout', traffic: 'medium', speedLimit: 25 },
    currentVehicle: { id: 'car' }, infiniteWorldRef: { current: null },
    carRef: { current: car }, emergencyRef: { current: null }, timeRef: { current: 31 },
    trafficRef: { current: [] }, cyclistsRef: { current: [] }, pedsRef: { current: [] },
    wildlifeRef: { current: null },
    statsRef: { current: { safetyScore: 80 } }, audioRef: { current: {} },
    calmDriveRef: { current: false }, eventToastRef: { current: null },
    showDriveAlert: text => messages.push(text), speak: text => messages.push(text),
    addToast: text => messages.push(text), safeTimeout: noop, unlockBadge: noop, upd: noop,
    maybeSpawnEmergency: () => ({ kind, icon: kind, color: '#fff', sirenFreq: 800 }),
  };
  state.Math.random = () => 0;
  vm.createContext(state); vm.runInContext(emergencySource, state);
  state.updateEmergency(1 / 60);
  state.maybeSpawnEmergency = () => null;
  state.messages = messages;
  return state;
}

describe('Roundabout emergency encounters use the connected road network', () => {
  it.each([0, 1, 2, 3])('grades waiting and exit clearance in arm %i coordinates using the whole vehicle', arm => {
    const angle = RR.roundaboutApproach(arm).angle;
    const pose = (radial, lateral, inbound = false) => ({
      x: 48 + Math.cos(angle) * radial - Math.sin(angle) * lateral,
      y: 48 + Math.sin(angle) * radial + Math.cos(angle) * lateral,
      heading: angle + (inbound ? Math.PI : 0), speed: 0,
    });
    const assess = car => RR.roundaboutEmergencyAssessment(car, 'car', { kind: 'firetruck' }, [], {});
    expect(assess(pose(25, -1.75, true)).safe).toBe(true);
    expect(assess(pose(18, -1.75, true)).safe).toBe(false);
    expect(assess(pose(25, -7, true)).safe).toBe(false);
    expect(assess(pose(21, 4.25)).safe).toBe(false); // rear still crosses the marked walk
    expect(assess(pose(25, 4.25)).safe).toBe(true);
    expect(assess(pose(25, 1.75)).safe).toBe(false);
    expect(assess(pose(25, 9)).safe).toBe(false);
    const queued = RR.roundaboutEmergencyAssessment(pose(25, 1.75), 'car', { kind: 'ambulance' },
      [{ ...pose(31, 1.75), type: 'car' }], {});
    expect(queued.blocked).toBe(true);
    expect(queued.eligible).toBe(false);
  });

  it('lets a long responder finish its route amid cars, riders, and active crosswalks without contact', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    try {
      const scenario = { id: 'roundabout', traffic: 'medium' };
      const traffic = RR.spawnRoundaboutTraffic(scenario).concat(RR.spawnCyclists(scenario), RR.spawnMotorcycles(scenario));
      const pedestrians = RR.spawnPedestrians(scenario);
      const player = { x: 75, y: 52.25, heading: 0, speed: 0 };
      const responder = RR.spawnRoundaboutEmergency(player, 'firetruck', traffic, [], pedestrians, 'car');
      let contacts = 0, islandEntries = 0;
      const phases = new Set();
      for (let tick = 0; tick < 60 * 120; tick++) {
        const actors = responder._roundaboutRouteComplete ? traffic : traffic.concat(responder);
        for (const actor of actors) RR.updateRoundaboutTrafficVehicle(actor, 1 / 60, actors, player, 'car', pedestrians);
        for (const pedestrian of pedestrians) RR.updateRoundaboutPedestrian(pedestrian, 1 / 60, actors, player, 'car');
        phases.add(responder._roundaboutState);
        for (let a = 0; a < actors.length; a++) {
          if (Math.hypot(actors[a].x - 48, actors[a].y - 48) < 5.5) islandEntries++;
          for (let b = a + 1; b < actors.length; b++) {
            if (RR.vehicleRectsOverlap(actors[a], RR.roundaboutActorSize(actors[a]), actors[b], RR.roundaboutActorSize(actors[b]))) contacts++;
          }
          for (const pedestrian of pedestrians) {
            if (RR.pointOverlapsVehicle(actors[a], RR.roundaboutActorSize(actors[a]), pedestrian, 0.28)) contacts++;
          }
        }
      }
      expect(contacts).toBe(0); expect(islandEntries).toBe(0);
      expect(responder._roundaboutRouteComplete).toBe(true);
      expect([...phases]).toEqual(expect.arrayContaining(['entering', 'circulating', 'exiting']));
    } finally { random.mockRestore(); }
  });

  it.each(['ambulance', 'firetruck', 'police'])('spawns %s on an authored approach for a circulating learner', kind => {
    const state = emergencyDrive({ x: 56, y: 48, heading: -Math.PI / 2, speed: 3 }, kind);
    const responder = state.emergencyRef.current;
    const map = RR.buildMap('roundabout');
    expect([0, 3]).toContain(map[Math.floor(responder.y)][Math.floor(responder.x)]);
    expect(responder._roundaboutState).toBe('approach');
    expect(responder.type).toBe(RR.emergencyVehicleFootprintType(kind));
    expect(state.messages.join(' ')).toMatch(/exit.*roundabout|roundabout.*exit/i);
    expect(state.messages.join(' ')).not.toMatch(/BEHIND YOU/);
  });

  it.each([30, 60, 144])('routes the responder around the island through an exit at %i Hz', hz => {
    const state = emergencyDrive({ x: 76, y: 52.25, heading: 0, speed: 0 });
    const phases = new Set();
    let islandEntries = 0;
    for (let frame = 0; frame < hz * 50 && state.emergencyRef.current; frame++) {
      state.timeRef.current += 1 / hz;
      state.updateEmergency(1 / hz);
      const responder = state.emergencyRef.current;
      if (!responder) break;
      phases.add(responder._roundaboutState);
      if (Math.hypot(responder.x - 48, responder.y - 48) < 5.5) islandEntries++;
    }
    expect(islandEntries).toBe(0);
    expect(phases.has('entering')).toBe(true);
    expect(phases.has('circulating')).toBe(true);
    expect(phases.has('exiting')).toBe(true);
    expect(state.emergencyRef.current).toBeNull();
  });

  it('does not reward a stopped learner inside the circle as a right-shoulder pull-over', () => {
    const state = emergencyDrive({ x: 51.6, y: 42, heading: -Math.PI / 2, speed: 0 });
    Object.assign(state.emergencyRef.current, { x: 49.75, y: 46.5, heading: -Math.PI / 2, speed: 0, _travelSign: -1 });
    state.updateEmergency(1 / 60);
    expect(state.statsRef.current.emergencyYields || 0).toBe(0);
    expect(state.statsRef.current.safetyScore).toBe(80);
    expect(state.emergencyRef.current._responseWindowStartedAt).toBeUndefined();
  });

  it('rewards a safe approach wait without demanding a shoulder maneuver or entering the circle', () => {
    const state = emergencyDrive({ x: 49.75, y: 72, heading: -Math.PI / 2, speed: 0 });
    for (let frame = 0; frame < 60 * 12 && state.emergencyRef.current; frame++) {
      state.timeRef.current += 1 / 60; state.updateEmergency(1 / 60);
    }
    expect(state.statsRef.current.emergencyYields).toBe(1);
    expect(state.statsRef.current.safetyScore).toBe(85);
  });

  it.each(['circle', 'crosswalk', 'queue'])('suspends an expired response deadline while the learner is held at %s', reason => {
    const car = reason === 'circle' ? { x: 51.6, y: 42, heading: -Math.PI / 2, speed: 0 }
      : { x: reason === 'crosswalk' ? 62 : 72, y: 49.75, heading: 0, speed: 0 };
    const state = emergencyDrive(car);
    state.emergencyRef.current._responseWindowStartedAt = state.timeRef.current - 20;
    if (reason === 'queue') state.trafficRef.current = [{ x: 78, y: 49.75, heading: 0, speed: 0, type: 'car' }];
    if (reason === 'crosswalk') state.pedsRef.current = [{ x: 66, y: 49.75, crossing: true, _roundaboutArm: 1 }];
    state.updateEmergency(1 / 60);
    expect(state.emergencyRef.current._responseWindowStartedAt).toBeUndefined();
    expect(state.emergencyRef.current.checked).toBe(false);
    expect(state.statsRef.current.safetyScore).toBe(80);
  });
});
