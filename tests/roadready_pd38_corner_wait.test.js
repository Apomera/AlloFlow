// pd38: a walker waiting for a main-road crosswalk waits on the corner, not in a cross-street lane.
// The crosswalk (2.8 m from the junction middle) lies inside the cross street (half width 3.25 m), so in base a walker
// at its end stood 1.3 m from the centre of a cross-street lane (1.5 m): every cross-street and turning driver held
// for them (trafficPedestrianControl, "in the body corridor"), often inside the junction across the learner's lane,
// for as long as they waited. 29-A section 2056(2): a driver passing a pedestrian leaves "not less than 3 feet".
// Real scenario world, real spawn, the live updatePeds cut from the tool, the real trafficPedestrianControl.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let RR, makeUpdater;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(SRC, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync(SRC, 'utf8');
  const start = source.indexOf('        var updatePeds = function(dt) {');
  const end = source.indexOf('        // scanSpatialHazards:', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate live pedestrian updater');
  makeUpdater = new Function('scope', 'with (scope) { ' + source.slice(start, end) + '\nreturn updatePeds; }');
});

function junction(id = 'suburban', crossWalk = false) {
  const scn = RR.SCENARIOS.find((s) => s.id === id);
  const world = RR.createScenarioWorld(scn);
  let k = 0; while (!world.getChunk(k).hasIntersection) k++;
  const chunk = world.getChunk(k);
  const Y = k * RR.CHUNK_SIZE + chunk.intersectionY;
  const signal = { type: 'light', x: world.spline.centerAt(Y), y: Y, _chunk: k, timer: 0, greenDur: 8, yellowDur: 3, redDur: 6,
    state: crossWalk ? 'red' : 'green', _phase: crossWalk ? 'cross_green' : 'main_green', _crossState: crossWalk ? 'green' : 'red' };
  const peds = RR.spawnStreamedPedestrians(scn, world, chunk, k);
  const pose = RR.crossStreetPose(signal.x, Y, world.spline.headingAt(Y), 6.5, 200);
  const scope = { ...RR, currentScenario: scn, currentVehicle: { id: 'sedan' }, signalsRef: { current: [signal] },
    trafficRef: { current: [] }, cyclistsRef: { current: [] }, carRef: { current: { x: 1e4, y: 1e4, heading: 0, speed: 0 } },
    pedsRef: { current: peds }, infiniteWorldRef: { current: world }, timeRef: { current: 0 }, addToast: () => {} };
  const update = makeUpdater(scope);
  const step = (seconds, dt = 1 / 30) => { for (let i = 0; i < Math.round(seconds / dt); i++) { scope.timeRef.current += dt; update(dt); } };
  return { scn, world, signal, peds, pose, Y, step, scope };
}
// A cross-street driver in the lane nearest the walker's crosswalk, 6 m before the walker, heading for them.
function crossDriver(J, ped, type, dir) {
  const local = RR.crossStreetLocalPoint(J.pose, ped.x, ped.y);
  const lane = Math.sign(ped.crosswalkY - J.Y) * 1.5;
  const p = RR.crossStreetWorldPoint(J.pose, local.longitudinal - dir * 6, lane);
  return { id: 'x', type, x: p.x, y: p.y, heading: RR.crossStreetTravelHeading(J.pose, dir), speed: 6.7,
    crossStreet: true, laneOffset: lane, _crossPose: J.pose, _crossDirection: dir };
}

describe("Road Ready pd38: a waiting walker does not hold cross-street drivers", () => {
  it.each(['suburban', 'downtown', 'rain'])('%s: waiting walkers leave every cross-street lane 3 ft (base: 0.4 m from a car)', (id) => {
    const J = junction(id);
    J.step(3);
    expect(J.peds.length).toBeGreaterThan(0);
    for (const ped of J.peds) {
      expect(ped.crossing).toBe(false);
      const local = RR.crossStreetLocalPoint(J.pose, ped.x, ped.y);
      const lane = Math.sign(ped.crosswalkY - J.Y) * 1.5;
      for (const type of ['car', 'truck', 'schoolbus']) {
        const gap = Math.abs(local.lateral - lane) - RR.vehicleFootprint(type).width / 2 - 0.28;
        expect(gap, id + ' ' + type).toBeGreaterThanOrEqual(3 / RR.FT_PER_M - 1e-4);
      }
      // still at its crosswalk's kerb, outside the main road
      expect(Math.abs(RR.mainRoadLocalPoint(J.world, ped.x, ped.y).lateral)).toBeCloseTo(Math.abs(ped._sidewalkLateral), 6);
    }
  });

  it.each(['car', 'schoolbus'])('a %s on the cross street passes walkers waiting on DON\'T WALK (base: held for them)', (type) => {
    const J = junction('suburban');
    J.step(3);
    let held = 0, checked = 0;
    for (const ped of J.peds) for (const dir of [1, -1]) {
      const v = crossDriver(J, ped, type, dir);
      checked++;
      if (RR.trafficPedestrianControl(J.world, v, J.peds, J.scope.signalsRef.current, 1 / 30).required) held++;
    }
    expect(checked).toBeGreaterThan(0);
    expect(held).toBe(0);
  });

  it('still holds a cross-street driver for a walker who is crossing on its crosswalk (guard)', () => {
    const J = junction('suburban', true);
    J.step(1.5); // WALK: they set off
    const walker = J.peds.find((p) => p.crossing);
    expect(walker).toBeTruthy();
    const local = RR.crossStreetLocalPoint(J.pose, walker.x, walker.y);
    const lane = Math.sign(walker.crosswalkY - J.Y) * 1.5;
    const p = RR.crossStreetWorldPoint(J.pose, local.longitudinal - 5, lane);
    const v = { id: 'x', type: 'car', x: p.x, y: p.y, heading: RR.crossStreetTravelHeading(J.pose, 1), speed: 3, crossStreet: true, laneOffset: lane };
    expect(RR.trafficPedestrianControl(J.world, v, [walker], J.scope.signalsRef.current, 1 / 30).required).toBe(true);
  });

  it('walks between the kerb and the crosswalk at walking speed, then crosses on the crosswalk', () => {
    const J = junction('suburban', true);
    const ped = J.peds[0];
    let last = ped._roadStation, maxStep = 0, onCrosswalk = false;
    for (let i = 0; i < 30 * 20; i++) {
      J.step(1 / 30);
      maxStep = Math.max(maxStep, Math.abs(ped._roadStation - last)); last = ped._roadStation;
      if (ped.crossing && Math.abs(ped._roadStation - ped.crosswalkY) < 1e-9 && Math.abs(ped._sidewalkLateral) < 3) onCrosswalk = true;
    }
    expect(maxStep).toBeLessThanOrEqual(1.8 / 30 + 1e-9);
    expect(onCrosswalk).toBe(true);
  });

  it('rrPedestrianWaitStation: 1.5 m lane + half a school bus + 3 ft + 0.28 m from the junction middle; no side, no move', () => {
    const at = RR.rrPedestrianWaitStation({ crosswalkY: 102.8, _crosswalkSide: 1 });
    expect(at - 100).toBeCloseTo(1.5 + 1.25 + 3 / RR.FT_PER_M + 0.28, 10);
    expect(RR.rrPedestrianWaitStation({ crosswalkY: 97.2, _crosswalkSide: -1 }) - 100).toBeCloseTo(-(1.5 + 1.25 + 3 / RR.FT_PER_M + 0.28), 10);
    expect(RR.rrPedestrianWaitStation({ crosswalkY: 40 })).toBe(40);
  });
});
