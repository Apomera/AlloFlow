import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 39, lane_bike (bk39), problem C: the emergency response window at a red light.
// Runs the tool's own updateEmergency (cut from the source, as tests/roadready_roundabout_emergency.test.js
// does) on the real suburban scenario road. The learner is queued behind a stopped car at a red light,
// an ambulance comes up behind and waits; the light turns green, the queue moves off, the learner drives
// through the junction and then pulls right and stops. 29-A §2054(4): "as near as practicable to the
// right-hand curb, parallel to the curb and clear of any intersection". A driver who cannot legally move
// is not failing to yield; the 8 s begin when the car can pull over (the comment above the response
// block says so; the code kept counting while the car stood in the queue).
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let RR, emergencySource;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = fs.readFileSync(TOOL, 'utf8');
  const start = source.indexOf('        var _nextDrillSpawn = 20;');
  emergencySource = source.slice(start, source.indexOf('        var updateCyclists = function(dt)', start));
});

const DT = 1 / 60;
// opts: queued (behind a stopped car) or at the line; redFor: seconds of red after the ambulance is close;
// reactFor: seconds after green before the learner moves; stay: the learner never moves (boxed in).
function scenarioRun(opts) {
  const scn = RR.SCENARIOS.find((s) => s.id === 'suburban');
  const world = RR.createScenarioWorld(scn);
  const lane = RR.scenarioRoadLayout('suburban').laneCenters[1];
  const poseAt = (station, lateral) => { const p = RR.mainRoadWorldPoint(world, station, lateral); return { x: p.x, y: p.y, heading: -Math.PI / 2 - p.heading }; };
  const sigStation = 30;
  const sp = RR.mainRoadWorldPoint(world, sigStation, 0);
  const light = { x: sp.x, y: sp.y, type: 'light', state: 'red', timer: 0, _phase: 'cross_green', _crossState: 'green' };
  const probe = Object.assign(poseAt(sigStation + 40, lane), { speed: 0 });
  const line = RR.playerControlApproach(world, light, probe, 4.5).controlCoordinate;
  // the learner travels toward smaller stations; its front bumper 1 m behind the line, or queued behind a car there
  const leaderStation = line + 2.25 + 1;
  let carStation = opts.queued ? leaderStation + 4.5 + 2.5 : leaderStation;
  let carLat = lane, carSpeed = 0;
  const car = Object.assign(poseAt(carStation, carLat), { speed: 0 });
  const leader = Object.assign(poseAt(leaderStation, lane), { speed: 0, type: 'car', id: 'leader' });
  let leaderStationNow = leaderStation;
  const profile = RR.roadProfileAt(world, carStation, RR.getContinuousScenarioProfile('suburban'));
  const shoulder = RR.trafficRightShoulderOffset(profile, -1);
  const layout = RR.roadLayoutFor(profile);
  const shoulderLat = Math.sign(shoulder) * Math.max(layout.edgeLineOffset - 0.02, Math.min(Math.abs(shoulder), layout.pavedHalfWidth - 0.9 - 0.12));
  const noop = () => {};
  const state = {
    ...RR, Math: Object.create(Math), MAP_SIZE: 96, d: {},
    currentScenario: scn, currentVehicle: { id: 'sedan' }, infiniteWorldRef: { current: world },
    carRef: { current: car }, emergencyRef: { current: null }, timeRef: { current: 31 },
    trafficRef: { current: opts.queued ? [leader] : [] }, cyclistsRef: { current: [] }, pedsRef: { current: [] },
    wildlifeRef: { current: null }, signalsRef: { current: [light] },
    statsRef: { current: { safetyScore: 80 } }, audioRef: { current: {} },
    calmDriveRef: { current: false }, eventToastRef: { current: null },
    showDriveAlert: noop, speak: noop, addToast: noop, safeTimeout: noop, unlockBadge: noop, upd: noop, updBadges: noop,
    rrLiveBadges: () => ({}), __alloT: (k, f) => f,
    maybeSpawnEmergency: () => ({ kind: 'ambulance', icon: 'A', color: '#fff', sirenFreq: 800 }),
  };
  state.Math.random = () => 0;
  vm.createContext(state); vm.runInContext(emergencySource, state);
  state.updateEmergency(DT);
  state.maybeSpawnEmergency = () => null;
  const out = { closeAt: null, greenAt: null, movedAt: null, windowStarts: [], end: null };
  let lastWindow;
  for (let i = 0; i < 60 * 60 && state.emergencyRef.current; i++) {
    const t = state.timeRef.current += DT;
    const em = state.emergencyRef.current;
    const emAhead = (RR.mainRoadLocalPoint(world, em.x, em.y).longitudinal - carStation) * -1;
    if (out.closeAt == null && emAhead > -12) out.closeAt = t;
    if (out.closeAt != null && out.greenAt == null && t - out.closeAt >= opts.redFor) {
      out.greenAt = t; Object.assign(light, { state: 'green', _phase: 'main_green', _crossState: 'red' });
    }
    if (out.greenAt != null && opts.queued) { leader.speed = Math.min(10, leader.speed + 2 * DT); leaderStationNow -= leader.speed * DT; Object.assign(leader, poseAt(leaderStationNow, lane)); }
    if (out.greenAt != null && !opts.stay && t - out.greenAt >= opts.reactFor) {
      if (out.movedAt == null) out.movedAt = t;
      const pastMiddle = sigStation - carStation; // metres past the junction middle
      if (pastMiddle < 12) carSpeed = Math.min(8, carSpeed + 1.5 * DT);
      else { carSpeed = Math.max(0, carSpeed - 2 * DT); carLat += Math.max(-1.2 * DT, Math.min(1.2 * DT, shoulderLat - carLat)); }
      carStation -= carSpeed * DT;
    }
    Object.assign(car, poseAt(carStation, carLat), { speed: carSpeed });
    state.updateEmergency(DT);
    const now = state.emergencyRef.current;
    if (now && now._responseWindowStartedAt !== lastWindow) { lastWindow = now._responseWindowStartedAt; if (out.windowStarts.length < 400) out.windowStarts.push(lastWindow == null ? null : +(lastWindow - 31).toFixed(2)); }
    if (now && now.checked && out.end == null) out.end = { t: +(t - 31).toFixed(2), responded: !!now.responded };
  }
  const events = (state.statsRef.current.driveEvents || []).map((e) => e.type);
  return { events, yields: state.statsRef.current.emergencyYields || 0, score: state.statsRef.current.safetyScore, out, line, leaderStation };
}

describe('Road Ready bk39: no emergency penalty for waiting in a queue at a red light', () => {
  it.each([[6, 1.0], [7, 0.6], [5, 2.5]])('queued behind a stopped car, red for %s s after the ambulance arrives, moves off %s s after green: not scored as failing to yield, then the pull-over is credited', (redFor, reactFor) => {
    const r = scenarioRun({ queued: true, redFor, reactFor });
    expect(r.out.closeAt, 'the ambulance came up behind').not.toBeNull();
    expect(r.events, JSON.stringify(r.out)).not.toContain('emergencyNoYield');
    expect(r.events).not.toContain('emergencyNoPullRight');
    expect(r.yields, 'pulled right and stopped after the junction: credited').toBe(1);
  });

  it('guards: boxed in for the whole red and staying put is accepted (held branch); a car at its own line moving off on green is not charged either', () => {
    const boxed = scenarioRun({ queued: true, redFor: 30, reactFor: 0, stay: true });
    expect(boxed.events).not.toContain('emergencyNoYield');
    expect(boxed.events).not.toContain('emergencyNoPullRight');
    expect(boxed.score).toBe(80);
    const atLine = scenarioRun({ queued: false, redFor: 6, reactFor: 1.0 });
    expect(atLine.events).not.toContain('emergencyNoYield');
    expect(atLine.yields).toBe(1);
  });

  it('a rider level with the car on its right holds it too (rrHeldAtControl, the rule the held branch uses): the 8 s begin when the rider has gone', () => {
    const scn = RR.SCENARIOS.find((s) => s.id === 'suburban');
    const world = RR.createScenarioWorld(scn);
    const lane = RR.scenarioRoadLayout('suburban').laneCenters[1];
    const poseAt = (station, lateral) => { const p = RR.mainRoadWorldPoint(world, station, lateral); return { x: p.x, y: p.y, heading: -Math.PI / 2 - p.heading }; };
    const profile = RR.roadProfileAt(world, 150, RR.getContinuousScenarioProfile('suburban'));
    const layout = RR.roadLayoutFor(profile), shoulder = RR.trafficRightShoulderOffset(profile, -1);
    const shoulderLat = Math.sign(shoulder) * Math.max(layout.edgeLineOffset - 0.02, Math.min(Math.abs(shoulder), layout.pavedHalfWidth - 0.9 - 0.12));
    let st = 150, lat = lane, v = 0, riderSt = 150;
    const car = Object.assign(poseAt(st, lat), { speed: 0 });
    const riderLat = RR.bicycleLaneOffsetFor(profile, -1);
    const rider = Object.assign(poseAt(riderSt, riderLat), { speed: 0, type: 'cyclist', id: 'r1' });
    expect(RR.rrHeldAtControl(world, car, 4.5, [], [], [rider])).toBe(true);
    const noop = () => {};
    const state = {
      ...RR, Math: Object.create(Math), MAP_SIZE: 96, d: {}, currentScenario: scn, currentVehicle: { id: 'sedan' },
      infiniteWorldRef: { current: world }, carRef: { current: car }, emergencyRef: { current: null }, timeRef: { current: 31 },
      trafficRef: { current: [] }, cyclistsRef: { current: [rider] }, pedsRef: { current: [] }, wildlifeRef: { current: null }, signalsRef: { current: [] },
      statsRef: { current: { safetyScore: 80 } }, audioRef: { current: {} }, calmDriveRef: { current: false }, eventToastRef: { current: null },
      showDriveAlert: noop, speak: noop, addToast: noop, safeTimeout: noop, unlockBadge: noop, upd: noop, updBadges: noop, rrLiveBadges: () => ({}), __alloT: (k, f) => f,
      maybeSpawnEmergency: () => ({ kind: 'ambulance', icon: 'A', color: '#fff', sirenFreq: 800 }),
    };
    state.Math.random = () => 0;
    vm.createContext(state); vm.runInContext(emergencySource, state);
    state.updateEmergency(DT); state.maybeSpawnEmergency = () => null;
    let closeAt = null, goneAt = null;
    for (let i = 0; i < 60 * 40 && state.emergencyRef.current && !state.emergencyRef.current.checked; i++) {
      const t = state.timeRef.current += DT;
      const em = state.emergencyRef.current;
      if (closeAt == null && (RR.mainRoadLocalPoint(world, em.x, em.y).longitudinal - st) * -1 > -12) closeAt = t;
      // the rider stays level for 6 s after the ambulance is close, then rides on at 5 m/s
      if (closeAt != null && t - closeAt >= 6) { rider.speed = 5; riderSt -= 5 * DT; if (goneAt == null) goneAt = t; }
      Object.assign(rider, poseAt(riderSt, riderLat));
      // 1 s after the rider has gone the car moves right at walking pace and stops on the shoulder
      if (goneAt != null && t - goneAt >= 1) {
        if (Math.abs(shoulderLat - lat) > 0.05) { v = 1.5; lat += Math.sign(shoulderLat - lat) * Math.min(Math.abs(shoulderLat - lat), 0.6 * DT); } else v = Math.max(0, v - 2 * DT);
        st -= v * DT;
      }
      Object.assign(car, poseAt(st, lat), { speed: v });
      state.updateEmergency(DT);
    }
    const events = (state.statsRef.current.driveEvents || []).map((e) => e.type);
    expect(closeAt).not.toBeNull();
    expect(events).not.toContain('emergencyNoYield');
    expect(events).not.toContain('emergencyNoPullRight');
    expect(state.statsRef.current.emergencyYields || 0).toBe(1);
  });

  it('guard: a learner who is free to move and does not pull over is still scored -20 after 8 s', () => {
    // green from the start, no queue: the learner just sits in the lane 25 m before the junction
    const scn = RR.SCENARIOS.find((s) => s.id === 'suburban');
    const world = RR.createScenarioWorld(scn);
    const lane = RR.scenarioRoadLayout('suburban').laneCenters[1];
    const p = RR.mainRoadWorldPoint(world, 120, lane);
    let st = 120; const car = { x: p.x, y: p.y, heading: -Math.PI / 2 - p.heading, speed: 6 };
    const noop = () => {};
    const state = {
      ...RR, Math: Object.create(Math), MAP_SIZE: 96, d: {}, currentScenario: scn, currentVehicle: { id: 'sedan' },
      infiniteWorldRef: { current: world }, carRef: { current: car }, emergencyRef: { current: null }, timeRef: { current: 31 },
      trafficRef: { current: [] }, cyclistsRef: { current: [] }, pedsRef: { current: [] }, wildlifeRef: { current: null }, signalsRef: { current: [] },
      statsRef: { current: { safetyScore: 80 } }, audioRef: { current: {} }, calmDriveRef: { current: false }, eventToastRef: { current: null },
      showDriveAlert: noop, speak: noop, addToast: noop, safeTimeout: noop, unlockBadge: noop, upd: noop, updBadges: noop, rrLiveBadges: () => ({}), __alloT: (k, f) => f,
      maybeSpawnEmergency: () => ({ kind: 'ambulance', icon: 'A', color: '#fff', sirenFreq: 800 }),
    };
    state.Math.random = () => 0;
    vm.createContext(state); vm.runInContext(emergencySource, state);
    state.updateEmergency(DT); state.maybeSpawnEmergency = () => null;
    for (let i = 0; i < 60 * 40 && state.emergencyRef.current && !state.emergencyRef.current.checked; i++) {
      state.timeRef.current += DT; st -= car.speed * DT;
      Object.assign(car, (() => { const q = RR.mainRoadWorldPoint(world, st, lane); return { x: q.x, y: q.y, heading: -Math.PI / 2 - q.heading }; })());
      state.updateEmergency(DT);
    }
    expect((state.statsRef.current.driveEvents || []).map((e) => e.type)).toContain('emergencyNoYield');
  });
});
