import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 39, lane_bike (bk39), problem B: the tool's own rider-contact scoring (checkCyclistPassing, cut from
// the source and run with the tool's exports) did not fire when the learner's car moved sideways onto a
// rider riding beside it. Round 38 suburban s9: the car (4 m/s) pulled right onto a cyclist passing it at
// the road edge (5.5 m/s); the bodies overlapped for 80 s and nothing was scored. The trace
// (roadready_bk39_ridealong_rider.test.js runs on base): closing speed on the line between the centres 0 to
// 0.17 m/s, because that line runs mostly along the road while the car's side moves in across it.
// 29-A §2070(1-A): "The collision of a motor vehicle with a person operating a bicycle ... is prima facie
// evidence of a violation of this subsection."
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let RR, checkSource;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = fs.readFileSync(TOOL, 'utf8');
  const start = source.indexOf('        var checkCyclistPassing = function() {');
  checkSource = source.slice(start, source.indexOf('        var updateAudio = function() {', start));
  if (start < 0 || checkSource.length < 200) throw new Error('checkCyclistPassing not found');
});

// the suburban road: the learner's car and one rider, placed by station / lateral (travel toward smaller stations)
function check(carAt, riderAt) {
  const scn = RR.SCENARIOS.find((s) => s.id === 'suburban');
  const world = RR.createScenarioWorld(scn);
  const place = (o) => { const p = RR.mainRoadWorldPoint(world, o.st, o.lat); return { x: p.x, y: p.y, heading: -Math.PI / 2 - p.heading + (o.yaw || 0), speed: o.v }; };
  const car = place(carAt);
  const rider = Object.assign(place(riderAt), { type: 'cyclist', id: 'r1' });
  // measured before the check (a scored impact separates the two)
  const before = { overlap: RR.vehicleRectsOverlap(car, RR.vehicleFootprint('sedan'), rider, RR.vulnerableRoadUserFootprint(rider)), closing: RR.roadUserImpactClosingState(car, rider), side: RR.rrSideIntrusionSpeed ? RR.rrSideIntrusionSpeed(car, rider) : null };
  const toasts = [];
  const state = {
    ...RR, Math, carRef: { current: car }, infiniteWorldRef: { current: world }, currentVehicle: { id: 'sedan' },
    cyclistsRef: { current: [rider] }, statsRef: { current: { safetyScore: 80, crashes: 0, cyclistClose: 0 } }, timeRef: { current: 40 },
    addToast: (t) => toasts.push(t), showDriveAlert: () => {}, __alloT: (k, f) => f,
  };
  vm.createContext(state); vm.runInContext(checkSource, state);
  state.checkCyclistPassing();
  const S = state.statsRef.current;
  return { events: (S.driveEvents || []).map((e) => e.type), crashes: S.crashes, ai: S.aiCausedCrashes || 0, score: S.safetyScore, overlap: before.overlap, closing: before.closing, side: before.side };
}

describe('Road Ready bk39: a car moving sideways onto a rider is a contact', () => {
  it('the round 38 s9 pull-over (car 4 m/s turning right onto a cyclist beside it at 5.5 m/s): scored as striking the rider', () => {
    // car at lateral 5.4 to 5.6 turned 0.15 to 0.2 rad toward the road edge; the rider at the edge beside its front half (riding past it) or its rear
    for (const [carLat, yaw, riderBack, riderV] of [[5.6, 0.15, -1.5, 5.5], [5.4, 0.2, -1.0, 4.5], [5.5, 0.15, -2.0, 7], [5.6, 0.15, 1.5, 5.5]]) {
      const r = check({ st: 100, lat: carLat, v: 4, yaw: yaw }, { st: 100 + riderBack, lat: 6.55, v: riderV });
      const label = JSON.stringify([carLat, yaw, riderBack, riderV]);
      expect(r.overlap, label + ': the bodies overlap').toBe(true);
      // the old measure: (almost) no closing on the centre line, or the contact put on the rider
      expect(r.closing.closingSpeed < 0.5 || r.closing.attribution === 'road_user', label + ' ' + JSON.stringify(r.closing)).toBe(true);
      expect(r.side, label).toBeGreaterThan(0.5);
      expect(r.events, label).toContain('riderStruck');
      expect(r.score).toBe(30);
    }
  });

  it('guards: a rider who rides into a stopped car is not the learner\'s contact; a straight car beside a rider (no overlap) is nothing; a rear-end is still scored', () => {
    const intoStopped = check({ st: 100, lat: 5.6, v: 0 }, { st: 102.5, lat: 6.55, v: 5 });
    expect(intoStopped.overlap).toBe(true);
    expect(intoStopped.events).not.toContain('riderStruck');
    if (intoStopped.side != null) expect(intoStopped.side).toBe(0);
    const beside = check({ st: 100, lat: 4.1, v: 8 }, { st: 100.5, lat: 6.55, v: 5 });
    expect(beside.overlap).toBe(false);
    expect(beside.events).toEqual([]);
    const straightOverlap = check({ st: 100, lat: 5.6, v: 4 }, { st: 101.5, lat: 6.55, v: 5.5 }); // no sideways motion
    if (straightOverlap.side != null) expect(straightOverlap.side).toBeLessThan(0.05); // the road bends a little: no sideways motion to speak of
    expect(straightOverlap.events).not.toContain('riderStruck');
    const rearEnd = check({ st: 100, lat: 6.4, v: 8 }, { st: 97, lat: 6.55, v: 3 });
    expect(rearEnd.overlap).toBe(true);
    expect(rearEnd.events).toContain('riderStruck');
  });
});
