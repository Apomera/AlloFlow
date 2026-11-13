import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 40, lane_shoulder (sh40), problem A: AI drivers pulling over for an emergency vehicle.
// Round 39 sweep, suburban seed 4 (Ride-Along forced on), t 72 to 74: Ride-Along was on the shoulder for a
// police car. An SUV level with it in the inner lane and a car stopped 4 to 6 m ahead in the inner lane both
// moved straight across two lanes onto that shoulder (the car at 0 m/s went from 1.55 to 4.15 m lateral in
// 0.5 s) and hit it: two scored crashes. updateTraffic set laneOffset toward the shoulder at 1.5/s with no look
// at what was there. 29-A §2054(4): "draw that vehicle as near as practicable to the right-hand curb".
// Runs the tool's own updateTraffic (cut from the source, as roadready_tf37_ai_stops does) on the suburban road.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('cannot find ' + from); return src.slice(a, b); };
const seeded = (seed) => { let a = (seed * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const makeUpdate = (scope) => new Function('scope', 'with(scope) {' + cut('        var updateTraffic = function(dt) {', '        var updateWildlife = function(dt)') + '\nreturn updateTraffic;}')(scope);
const pose = (world, station, lateral, dir) => { const p = RR.mainRoadWorldPoint(world, station, lateral); return { x: p.x, y: p.y, heading: (dir > 0 ? Math.PI / 2 : -Math.PI / 2) - p.heading }; };
const pers = { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 };

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

// The suburban road, travel toward +station (right side = negative lateral), between the junctions at 15 and 110.
function setup() {
  const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === 'suburban'));
  const profile = RR.roadProfileAt(world, 60, RR.getContinuousScenarioProfile('suburban'));
  const L = RR.roadLayoutFor(profile);
  return { world, profile, inner: -L.laneCenters[0], outer: -L.laneCenters[1], aiShoulder: RR.trafficRightShoulderOffset(profile, 1),
    // where Ride-Along stops on this road (its raShoulderMagnitude rule)
    raShoulder: -Math.max(L.edgeLineOffset - 0.02, Math.min(Math.abs(RR.trafficRightShoulderOffset(profile, 1)), L.pavedHalfWidth - 0.9 - 0.12)) };
}
const aiAt = (S, id, type, station, lateral, speed, extra) => Object.assign(pose(S.world, station, lateral, 1),
  { id, type, laneOffset: lateral, speed, _roadStation: station, personality: pers, _turnSignalSeen: 'none' }, extra || {});

// opts: car (learner) { st, lat, v }, ais [...], riders [...], peds [...], emergency { st, lat } or null, seconds
function run(S, opts) {
  const car = Object.assign(pose(S.world, opts.car.st, opts.car.lat, 1), { speed: opts.car.v || 0 });
  let carSt = opts.car.st;
  const emergency = opts.emergency ? Object.assign(pose(S.world, opts.emergency.st, opts.emergency.lat, 1), { speed: 0, life: 30, responded: false, kind: 'police' }) : null;
  const time = { current: 40 };
  const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4, trafficRef: { current: opts.ais }, infiniteWorldRef: { current: S.world },
    currentScenario: { id: 'suburban', speedLimit: 40, weather: 'clear', traffic: 'medium' }, currentVehicle: { id: 'sedan' }, carRef: { current: car },
    pedsRef: { current: opts.peds || [] }, signalsRef: { current: [] }, cyclistsRef: { current: opts.riders || [] }, emergencyRef: { current: emergency },
    statsRef: { current: { safetyScore: 100, crashes: 0 } }, timeRef: time, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
    blackBoxRef: { current: [] }, addToast() {}, speak() {}, audioRef: { current: {} }, eventToastRef: { current: null } };
  const update = makeUpdate(scope);
  const carSize = RR.vehicleFootprint('sedan');
  const out = { overlaps: [], riderOverlaps: [], maxSideOver: 0, frames: [] };
  const real = Math.random; Math.random = seeded(11);
  const dt = opts.dt || 0.1;
  try {
    for (let i = 0; i < (opts.seconds || 6) / dt; i++) {
      time.current += dt;
      const prev = opts.ais.map((a) => ({ lo: a.laneOffset, lat: RR.mainRoadLocalPoint(S.world, a.x, a.y).lateral }));
      update(dt);
      // the emergency vehicle comes up behind: it stays opts.emergency.behind m behind the first AI driver (updateTraffic does not move it)
      if (emergency && opts.emergency.behind != null) Object.assign(emergency, pose(S.world, RR.mainRoadLocalPoint(S.world, opts.ais[0].x, opts.ais[0].y).longitudinal - opts.emergency.behind, opts.emergency.lat, 1));
      carSt += (opts.car.v || 0) * dt;
      Object.assign(car, pose(S.world, carSt, opts.car.lat, 1), { speed: opts.car.v || 0 });
      opts.ais.forEach((a, k) => {
        const f = RR.mainRoadLocalPoint(S.world, a.x, a.y);
        // sideways speed against Ride-Along's emergency side rate, min(1.6, 0.2 + 0.25 v)
        const side = Math.abs(f.lateral - prev[k].lat) / dt, cap = Math.min(1.6, 0.2 + 0.25 * Math.abs(a.speed));
        if (side - cap > out.maxSideOver) out.maxSideOver = +(side - cap).toFixed(2);
        if (RR.vehicleRectsOverlap(car, carSize, a, RR.vehicleFootprint(a.type))) out.overlaps.push({ t: +(time.current - 40).toFixed(1), id: a.id, lat: +f.lateral.toFixed(2) });
        (opts.riders || []).concat(opts.peds || []).forEach((r) => {
          const rs = r.type === 'pedestrian' ? { length: 0.56, width: 0.56 } : RR.vulnerableRoadUserFootprint(r);
          if (RR.vehicleRectsOverlap(r, rs, a, RR.vehicleFootprint(a.type))) out.riderOverlaps.push({ t: +(time.current - 40).toFixed(1), id: a.id, who: r.type });
        });
      });
      opts.ais.forEach((a, k) => opts.ais.slice(k + 1).forEach((b) => {
        if (RR.vehicleRectsOverlap(a, RR.vehicleFootprint(a.type), b, RR.vehicleFootprint(b.type))) out.overlaps.push({ t: +(time.current - 40).toFixed(1), id: a.id + '/' + b.id });
      }));
      if (i % 5 === 4) out.frames.push(opts.ais.map((a) => a.id + ' ' + RR.mainRoadLocalPoint(S.world, a.x, a.y).lateral.toFixed(2) + ' v' + a.speed.toFixed(1)).join(' | '));
    }
  } finally { Math.random = real; }
  out.final = opts.ais.map((a) => ({ id: a.id, lat: +RR.mainRoadLocalPoint(S.world, a.x, a.y).lateral.toFixed(2), lo: +a.laneOffset.toFixed(2), v: +a.speed.toFixed(2) }));
  return out;
}

describe('Road Ready sh40: AI drivers do not pull over onto a shoulder that is taken (the real updateTraffic)', () => {
  it('suburban s4 geometry: the learner (Ride-Along) stopped on the shoulder, an SUV level with it in the inner lane: no contact, the SUV stops in its lane', () => {
    const S = setup();
    const suv = aiAt(S, 'suv', 'suv', 60, S.inner, 1.8);
    const r = run(S, { car: { st: 61.5, lat: S.raShoulder, v: 0 }, ais: [suv], emergency: { st: 40, lat: S.outer, behind: 15 }, seconds: 6 });
    expect(r.overlaps, JSON.stringify(r)).toEqual([]);
    expect(Math.abs(r.final[0].lat - S.inner), JSON.stringify(r)).toBeLessThan(0.5);
    expect(r.final[0].v).toBeLessThan(0.3);
  });

  it('suburban s4 geometry: a car stopped in the inner lane 6 m ahead while the learner rolls up the shoulder at 3 m/s: no contact', () => {
    const S = setup();
    const ahead = aiAt(S, 'car', 'car', 66, S.inner, 0, { _slowFor: 2 });
    const r = run(S, { car: { st: 60, lat: S.raShoulder, v: 3 }, ais: [ahead], emergency: { st: 40, lat: S.outer, behind: 20 }, seconds: 5 });
    expect(r.overlaps, JSON.stringify(r)).toEqual([]);
  });

  it('a car beside in the outer lane: an inner-lane driver does not move across it (it checks the lane it moves into); no sideways slide faster than Ride-Along\'s side rate', () => {
    const S = setup();
    const inner = aiAt(S, 'in', 'car', 60, S.inner, 4);
    const outerCar = aiAt(S, 'out', 'truck', 60.5, S.outer, 4);
    const r = run(S, { car: { st: 10, lat: S.inner, v: 0 }, ais: [inner, outerCar], emergency: { st: 45, lat: S.inner, behind: 12 }, seconds: 6 });
    expect(r.overlaps, JSON.stringify(r)).toEqual([]); // the two AI bodies never touch
    expect(r.maxSideOver, JSON.stringify(r)).toBeLessThan(0.05);
  });

  it('a cyclist or a walker standing on the shoulder level with the driver: it stays in its lane while they are there (base: moves onto them)', () => {
    const S = setup();
    for (const who of ['cyclist', 'pedestrian']) {
      const ai = aiAt(S, 'ai', 'car', 60, S.outer, 0.4);
      const lat = who === 'cyclist' ? RR.bicycleLaneOffsetFor(S.profile, 1) : S.aiShoulder;
      const user = Object.assign(pose(S.world, 61, lat, 1), { type: who, speed: 0, id: who });
      const r = run(S, { car: { st: 10, lat: S.inner, v: 0 }, ais: [ai], riders: who === 'cyclist' ? [user] : [], peds: who === 'pedestrian' ? [user] : [], emergency: { st: 45, lat: S.inner, behind: 12 }, seconds: 4 });
      expect(r.riderOverlaps, who + JSON.stringify(r)).toEqual([]);
      expect(Math.abs(r.final[0].lo - S.outer), who + JSON.stringify(r)).toBeLessThan(0.3);
    }
  });

  it('after the emergency vehicle has gone, a driver on the shoulder does not slide back into the learner level with it in the lane', () => {
    const S = setup();
    const ai = aiAt(S, 'ai', 'car', 60, S.aiShoulder, 0, { _emergencyPullOver: true, _emergencyHomeLaneOffset: S.outer });
    const r = run(S, { car: { st: 58, lat: S.outer, v: 1 }, ais: [ai], emergency: null, seconds: 4 });
    expect(r.overlaps, JSON.stringify(r)).toEqual([]);
    expect(r.maxSideOver, JSON.stringify(r)).toBeLessThan(0.05);
  });

  it('guards: an empty shoulder is still used (the inner-lane driver reaches the shoulder line and slows), and a stopped driver does not slide sideways faster than 0.2 m/s', () => {
    const S = setup();
    const ai = aiAt(S, 'ai', 'car', 60, S.inner, 7);
    const r = run(S, { car: { st: 35, lat: S.inner, v: 4 }, ais: [ai], emergency: { st: 45, lat: S.inner, behind: 12 }, seconds: 9 });
    expect(Math.abs(r.final[0].lo - S.aiShoulder), JSON.stringify(r)).toBeLessThan(0.15);
    expect(r.maxSideOver, JSON.stringify(r)).toBeLessThan(0.05);
    const still = aiAt(S, 'st', 'car', 60, S.outer, 0, { _slowFor: 2 });
    const r2 = run(S, { car: { st: 10, lat: S.inner, v: 0 }, ais: [still], emergency: { st: 45, lat: S.inner }, seconds: 1 });
    expect(r2.maxSideOver, JSON.stringify(r2)).toBeLessThan(0.05);
  });

  it('rrPullOverStripTaken and trafficEmergencyLaneStep (the rule): level, in the strip, 0.25 m; a car ahead in the same lane does not block', () => {
    const S = setup();
    const me = aiAt(S, 'me', 'car', 60, S.outer, 5);
    const w = RR.vehicleFootprint('car').width;
    const strip = (o) => RR.rrPullOverStripTaken(S.world, me, 4.5, S.outer - w / 2, S.aiShoulder - w / 2, [{ actor: o, length: 4.5, width: 1.8 }], 0);
    expect(strip(Object.assign(pose(S.world, 62, S.aiShoulder, 1), { speed: 0 }))).toBe(true); // level on the shoulder
    expect(strip(Object.assign(pose(S.world, 75, S.aiShoulder, 1), { speed: 0 }))).toBe(false); // 15 m ahead
    expect(strip(Object.assign(pose(S.world, 66, S.outer, 1), { speed: 5 }))).toBe(false); // ahead in my own lane
    // closing: stopped 15 m ahead on the shoulder while I move at 5 m/s for a 2 s move: taken
    expect(RR.rrPullOverStripTaken(S.world, me, 4.5, S.outer - w / 2, S.aiShoulder - w / 2, [{ actor: Object.assign(pose(S.world, 75, S.aiShoulder, 1), { speed: 0 }), length: 4.5, width: 1.8 }], 2)).toBe(true);
    const step = RR.trafficEmergencyLaneStep(S.world, me, S.aiShoulder, 0.1, []);
    expect(step.held).toBe(false);
    expect(Math.abs(step.offset - S.outer)).toBeCloseTo(Math.min(1.6, 0.2 + 0.25 * 5) * 0.1, 6);
  });
});
