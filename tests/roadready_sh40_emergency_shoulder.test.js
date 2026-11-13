import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 40, lane_shoulder (sh40), problem B: a vehicle on the shoulder where the car would pull over.
// Round 39 base sweep, rain seed 4, t 82: Ride-Along stood in the right lane, an AI truck stood on the shoulder
// level with it (1.2 m ahead, lateral 6.53), and the learner was charged -10 emergencyNoPullRight ("stopped,
// but not on the right"). There was no room: 29-A §2054(4) asks for "as near as practicable to the right-hand
// curb". rrHeldAtControl (the rule the scoring uses to excuse a car that cannot move over) knew a red light, a
// queue and a rider level on the right, not a vehicle on the shoulder. Runs the tool's own updateEmergency
// (cut from the source, as roadready_bk39_emergency_queue does) on the real suburban road.
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
const ST = 150; // between the junctions at 110 and 205; the learner travels toward smaller stations
function road() {
  const scn = RR.SCENARIOS.find((s) => s.id === 'suburban');
  const world = RR.createScenarioWorld(scn);
  const profile = RR.roadProfileAt(world, ST, RR.getContinuousScenarioProfile('suburban'));
  const L = RR.roadLayoutFor(profile);
  const poseAt = (station, lateral) => { const p = RR.mainRoadWorldPoint(world, station, lateral); return { x: p.x, y: p.y, heading: -Math.PI / 2 - p.heading }; };
  return { scn, world, profile, L, poseAt, outer: L.laneCenters[1], inner: L.laneCenters[0], shoulder: RR.trafficRightShoulderOffset(profile, -1),
    raShoulder: Math.max(L.edgeLineOffset - 0.02, Math.min(Math.abs(RR.trafficRightShoulderOffset(profile, -1)), L.pavedHalfWidth - 0.9 - 0.12)) };
}
// other: { aheadM, lat, type } placed at ST - aheadM (ahead of the learner); move(t, car): learner pose update
function run(R, other, move) {
  const car = Object.assign(R.poseAt(ST, R.outer), { speed: 0 });
  const traffic = other ? [Object.assign(R.poseAt(ST - other.aheadM, other.lat), { speed: 0, type: other.type || 'truck', id: 'parked', laneOffset: other.lat })] : [];
  const noop = () => {};
  const state = {
    ...RR, Math: Object.create(Math), MAP_SIZE: 96, d: {}, currentScenario: R.scn, currentVehicle: { id: 'sedan' },
    infiniteWorldRef: { current: R.world }, carRef: { current: car }, emergencyRef: { current: null }, timeRef: { current: 31 },
    trafficRef: { current: traffic }, cyclistsRef: { current: [] }, pedsRef: { current: [] }, wildlifeRef: { current: null }, signalsRef: { current: [] },
    statsRef: { current: { safetyScore: 80 } }, audioRef: { current: {} }, calmDriveRef: { current: false }, eventToastRef: { current: null },
    showDriveAlert: noop, speak: noop, addToast: noop, safeTimeout: noop, unlockBadge: noop, upd: noop, updBadges: noop, rrLiveBadges: () => ({}), __alloT: (k, f) => f,
    maybeSpawnEmergency: () => ({ kind: 'ambulance', icon: 'A', color: '#fff', sirenFreq: 800 }),
  };
  state.Math.random = () => 0;
  vm.createContext(state); vm.runInContext(emergencySource, state);
  state.updateEmergency(DT); state.maybeSpawnEmergency = () => null;
  let closeAt = null; const toasts = [];
  for (let i = 0; i < 60 * 40 && state.emergencyRef.current && !state.emergencyRef.current.checked; i++) {
    const t = state.timeRef.current += DT;
    const em = state.emergencyRef.current;
    if (closeAt == null && (RR.mainRoadLocalPoint(R.world, em.x, em.y).longitudinal - ST) * -1 > -12) closeAt = t;
    if (move) move(t - 31, car, traffic, closeAt == null ? null : t - closeAt);
    state.updateEmergency(DT);
    const tt = state.eventToastRef.current; if (tt && tt.msg && toasts[toasts.length - 1] !== tt.msg) toasts.push(tt.msg);
  }
  return { events: (state.statsRef.current.driveEvents || []).map((e) => e.type), score: state.statsRef.current.safetyScore, yields: state.statsRef.current.emergencyYields || 0, closeAt, toasts };
}

describe('Road Ready sh40: a vehicle on the shoulder where the car would pull over is no room, not a fault', () => {
  it('rain s4 geometry: a truck stopped on the shoulder 1.2 m ahead, level with the learner stopped in the right lane: not charged (base: -10 emergencyNoPullRight)', () => {
    const R = road();
    const r = run(R, { aheadM: 1.2, lat: R.shoulder, type: 'truck' });
    expect(r.closeAt, 'the ambulance came up behind').not.toBeNull();
    expect(r.events, JSON.stringify(r)).not.toContain('emergencyNoPullRight');
    expect(r.events).not.toContain('emergencyNoYield');
    expect(r.score).toBe(80);
    expect(r.toasts.join(' | ')).toMatch(/no room to move right/);
  });

  it('the same for a car level just behind on the shoulder, and a learner in the inner lane with a van level on the shoulder', () => {
    const R = road();
    expect(run(R, { aheadM: -3, lat: R.shoulder, type: 'car' }).events).not.toContain('emergencyNoPullRight');
    expect(RR.rrHeldAtControl(R.world, Object.assign(R.poseAt(ST, R.inner), { speed: 0 }), 4.5, [], [Object.assign(R.poseAt(ST - 2, R.shoulder), { speed: 0, type: 'van' })], [])).toBe(true);
  });

  it('the hold ends when the shoulder clears: the 8 s begin then, and a learner who then pulls right and stops is credited', () => {
    const R = road();
    let lat = R.outer, st = ST, v = 0, goneAt = null;
    const r = run(R, { aheadM: 1.2, lat: R.shoulder, type: 'truck' }, (t, car, traffic, sinceClose) => {
      // the truck drives off along the shoulder 5 s after the ambulance is close; 1 s later the learner moves right
      if (sinceClose != null && sinceClose >= 5) { const p = traffic[0]; const pst = RR.mainRoadLocalPoint(R.world, p.x, p.y).longitudinal - 6 * DT; Object.assign(p, R.poseAt(pst, R.shoulder), { speed: 6 }); if (goneAt == null) goneAt = t; }
      if (goneAt != null && t - goneAt >= 1) {
        if (Math.abs(R.raShoulder - lat) > 0.05) { v = 1.5; lat += Math.sign(R.raShoulder - lat) * Math.min(Math.abs(R.raShoulder - lat), 0.6 * DT); } else v = Math.max(0, v - 2 * DT);
        st -= v * DT;
      }
      Object.assign(car, R.poseAt(st, lat), { speed: v });
    });
    expect(r.events, JSON.stringify(r)).not.toContain('emergencyNoYield');
    expect(r.events).not.toContain('emergencyNoPullRight');
    expect(r.yields).toBe(1);
  });

  it('guards (an empty shoulder still requires pulling right): no vehicle, a truck 15 m ahead on the shoulder, or a truck level in the inner lane: still -10 (a vehicle behind on this narrow shoulder holds the ambulance up, so it is not a case)', () => {
    const R = road();
    for (const other of [null, { aheadM: 15, lat: R.shoulder }, { aheadM: 1.2, lat: R.inner }]) {
      const r = run(R, other);
      expect(r.events, JSON.stringify(other)).toContain('emergencyNoPullRight');
      expect(r.score).toBe(70);
    }
  });

  it('rrHeldAtControl: a vehicle level on the shoulder is a hold; one in the next lane, one far ahead, a cross-street car, or none is not', () => {
    const R = road();
    const car = Object.assign(R.poseAt(ST, R.outer), { speed: 0 });
    const at = (aheadM, lat, extra) => Object.assign(R.poseAt(ST - aheadM, lat), { speed: 0, type: 'truck' }, extra || {});
    expect(RR.rrHeldAtControl(R.world, car, 4.5, [], [at(1.2, R.shoulder)], [])).toBe(true);
    expect(RR.rrHeldAtControl(R.world, car, 4.5, [], [at(1.2, R.shoulder, { speed: 4 })], [])).toBe(true); // moving there now: no room either
    expect(RR.rrHeldAtControl(R.world, car, 4.5, [], [at(1.2, R.inner)], [])).toBe(false);
    expect(RR.rrHeldAtControl(R.world, car, 4.5, [], [at(15, R.shoulder)], [])).toBe(false);
    expect(RR.rrHeldAtControl(R.world, car, 4.5, [], [at(1.2, R.shoulder, { crossStreet: true })], [])).toBe(false);
    expect(RR.rrHeldAtControl(R.world, car, 4.5, [], [], [])).toBe(false);
  });
});
