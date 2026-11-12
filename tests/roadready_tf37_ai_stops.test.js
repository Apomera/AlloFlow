import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 37, traffic lane (tf37): AI drivers stopping at a line.
// Base: a driver that met a light already red (it never saw the yellow) rode its 3.5 m/s2 stopping profile with
// a 0.5 s speed lag, reached the line still rolling and was stopped there in one frame (20 to 30 m/s2; round 36
// decision 8). A recycled driver was put down at cruise speed wherever it landed: 2 m before a red light, inside
// a junction box, 10 m behind a stopped queue, and stopped in one frame (base sweep: up to 90 m/s2).
// Now: every stop at a line follows the profile (as yellow stops did since yl36), and a recycled driver is never
// put in a junction and starts no faster than lets it stop at 3.5 m/s2 (rrPlacedSpeedMps).

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('cannot find ' + from); return src.slice(a, b); };
const seeded = (seed) => { let a = (seed * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const makeUpdate = (scope) => new Function('scope', 'with(scope) {' + cut('        var updateTraffic = function(dt) {', '        var updateWildlife = function(dt)') + '\nreturn updateTraffic;}')(scope);
const scopeFor = (world, scenario, car, traffic, signals, time) => ({ ...RR, RR_CURB_YIELD_HOLD_MAX: 4, trafficRef: { current: traffic }, infiniteWorldRef: { current: world },
  currentScenario: scenario, currentVehicle: { id: 'sedan' }, carRef: { current: car },
  pedsRef: { current: [] }, signalsRef: { current: signals }, cyclistsRef: { current: [] }, emergencyRef: { current: null },
  statsRef: { current: { safetyScore: 100, crashes: 0 } }, timeRef: time, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
  blackBoxRef: { current: [] }, addToast() {}, speak() {}, audioRef: { current: {} }, eventToastRef: { current: null } });
const pose = (world, station, lateral, dir) => { const p = RR.mainRoadWorldPoint(world, station, lateral); return { x: p.x, y: p.y, heading: (dir > 0 ? Math.PI / 2 : -Math.PI / 2) - p.heading }; };
const grip = 0.72 * 9.81; // frictionCoef('clear') x g: the tool's own braking limit on dry road (stoppingDistance)

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

const junction = (id) => {
  const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === id));
  let ci = 0; while (!(world.getChunk(ci) && world.getChunk(ci).hasIntersection)) ci++;
  const st = ci * RR.CHUNK_SIZE + world.getChunk(ci).intersectionY;
  const c = RR.mainRoadWorldPoint(world, st, 0);
  return { world, st, ci, x: c.x, y: c.y };
};

// One AI driver toward +station; the light ahead is red from the start (no yellow is ever seen).
const toRed = (type, v0, startAhead) => {
  const J = junction('suburban');
  const scenario = { id: 'suburban', speedLimit: 40, weather: 'clear', traffic: 'medium' };
  const lane = RR.scenarioRoadLayout('suburban').laneCenters[0];
  const line = J.st - 4.1;
  const len = RR.vehicleFootprint(type).length;
  const aiSt = line - startAhead - len / 2;
  const ai = Object.assign(pose(J.world, aiSt, -lane, 1), { type, id: 'ai', laneOffset: -lane, speed: v0, _roadStation: aiSt,
    personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 }, _turnSignalSeen: 'none' });
  const signal = { x: J.x, y: J.y, type: 'light', state: 'red', _phase: 'cross_green', _crossState: 'green', timer: 0,
    greenDur: 8, yellowDur: 4, redDur: 600, allRedDur: 1.5, _chunk: J.ci, protectedMainTurns: false };
  const lane2 = RR.scenarioRoadLayout('suburban').laneCenters[1];
  const car = Object.assign(pose(J.world, aiSt - 15, -lane2, 1), { speed: 0 });
  const follow = () => { const s = RR.mainRoadLocalPoint(J.world, ai.x, ai.y).longitudinal - 15; Object.assign(car, pose(J.world, s, -lane2, 1), { speed: ai.speed }); };
  const time = { current: 40 };
  const update = makeUpdate(scopeFor(J.world, scenario, car, [ai], [signal], time));
  const real = Math.random; Math.random = seeded(7);
  const out = { peak: 0, peakAbove10: 0, crossed: false, stoppedAt: null };
  try {
    let prevV = ai.speed;
    for (let i = 0; i < 300; i++) {
      time.current += 0.1;
      update(0.1); follow();
      if (ai.id !== 'ai') throw new Error('the AI driver was recycled');
      const front = RR.mainRoadLocalPoint(J.world, ai.x, ai.y).longitudinal + len / 2;
      const dec = (prevV - ai.speed) / 0.1;
      if (dec > out.peak) out.peak = +dec.toFixed(2);
      if (prevV * RR.MS_TO_MPH >= 10 && dec > out.peakAbove10) out.peakAbove10 = +dec.toFixed(2);
      prevV = ai.speed;
      if (front > line + 0.05) { out.crossed = true; break; }
      if (ai.speed < 0.02) { out.stoppedAt = +(line - front).toFixed(2); break; }
    }
  } finally { Math.random = real; }
  return out;
};

describe('Road Ready tf37: an AI driver that meets a red it never saw turn yellow (the real updateTraffic)', () => {
  it.each([['car', 17.4, 80], ['car', 13.4, 60], ['suv', 15.6, 70], ['truck', 13.4, 70]])('%s at %s m/s, %s m before the line: stops before the line, never harder than 4.5 m/s2 above 10 mph (base: one-frame stop)', (type, v0, ahead) => {
    const r = toRed(type, v0, ahead);
    expect(r.crossed, JSON.stringify(r)).toBe(false);
    expect(r.stoppedAt, JSON.stringify(r)).not.toBe(null);
    expect(r.stoppedAt).toBeGreaterThanOrEqual(0);
    expect(r.stoppedAt).toBeLessThan(1.5);
    expect(r.peakAbove10, JSON.stringify(r)).toBeLessThan(4.5);
    expect(r.peak, JSON.stringify(r)).toBeLessThan(grip);
  });
});

describe('Road Ready tf37: where and how fast a recycled driver is put down', () => {
  it('rrStationInJunctionBox: between the stop lines of a light or stop sign (plus half a body), and nowhere else', () => {
    const J = junction('night');
    const sig = [{ x: J.x, y: J.y, type: 'light' }];
    const len = RR.vehicleFootprint('car').length;
    expect(RR.rrStationInJunctionBox(J.world, sig, J.st, len)).toBe(true);
    expect(RR.rrStationInJunctionBox(J.world, sig, J.st - 4.1 - len / 2 - 0.5, len)).toBe(true);
    expect(RR.rrStationInJunctionBox(J.world, sig, J.st - 4.1 - len / 2 - 1.5, len)).toBe(false);
    expect(RR.rrStationInJunctionBox(J.world, [{ x: J.x, y: J.y, type: 'flagger' }], J.st, len)).toBe(false);
  });

  it('rrPlacedSpeedMps: no faster than a 3.5 m/s2 stop allows before a red line, a stop sign or a slower vehicle ahead; cruise otherwise', () => {
    const J = junction('night');
    const lane = RR.scenarioRoadLayout('night').laneCenters[0];
    const len = RR.vehicleFootprint('car').length;
    const line = J.st - 4.1;
    const at = (toLine) => Object.assign(pose(J.world, line - toLine - len / 2, -lane, 1), { type: 'car', id: 'r' });
    const red = { x: J.x, y: J.y, type: 'light', state: 'red', _crossState: 'green' };
    const green = Object.assign({}, red, { state: 'green', _crossState: 'red' });
    for (const d of [2, 10, 25, 40]) {
      const v = RR.rrPlacedSpeedMps(J.world, [], [red], at(d), null, 17);
      expect(v * v / (2 * 3.5)).toBeLessThanOrEqual(Math.max(0, d - 0.3) + 1e-6);
      expect(RR.rrPlacedSpeedMps(J.world, [], [Object.assign({}, red, { type: 'stop' })], at(d), null, 17)).toBeCloseTo(v, 6);
    }
    expect(RR.rrPlacedSpeedMps(J.world, [], [green], at(10), null, 17)).toBe(17);
    expect(RR.rrPlacedSpeedMps(J.world, [], [red], at(200), null, 17)).toBe(17);
    // a stopped car 12 m ahead in the same lane, and one in the other lane
    const me = at(150);
    const meSt = RR.mainRoadLocalPoint(J.world, me.x, me.y).longitudinal;
    const stopped = Object.assign(pose(J.world, meSt + 12 + len, -lane, 1), { type: 'car', id: 'q', speed: 0 });
    const v2 = RR.rrPlacedSpeedMps(J.world, [stopped], [], me, null, 17);
    expect(v2 * v2 / 7).toBeLessThanOrEqual(12 - 3 + 1e-6);
    const otherLane = Object.assign(pose(J.world, meSt + 12 + len, lane, -1), { type: 'car', id: 'o', speed: 0 });
    expect(RR.rrPlacedSpeedMps(J.world, [otherLane], [], me, null, 17)).toBe(17);
  });

  it('the real updateTraffic recycles drivers near a red light: none is put in the junction box, none starts too fast to stop at 3.5 m/s2 (base: both happen)', () => {
    const J = junction('night');
    const scenario = { id: 'night', speedLimit: 40, weather: 'clear', traffic: 'medium' };
    const lane = RR.scenarioRoadLayout('night').laneCenters[0];
    const len = RR.vehicleFootprint('car').length;
    const bad = [];
    for (let seed = 1; seed <= 40; seed++) {
      // the learner 70 m before the light; the red light is inside the band where recycled drivers land
      const carSt = J.st - 70;
      const car = Object.assign(pose(J.world, carSt, -lane, 1), { speed: 0 });
      const signal = { x: J.x, y: J.y, type: 'light', state: 'red', _phase: 'cross_green', _crossState: 'green', timer: 0,
        greenDur: 8, yellowDur: 4, redDur: 600, allRedDur: 1, _chunk: J.ci, protectedMainTurns: false };
      // a driver far behind the learner (past the recycle range) going the learner's way
      const far = carSt - 400;
      const ai = Object.assign(pose(J.world, far, -lane, 1), { type: 'car', id: 'ai', laneOffset: -lane, speed: 15, _roadStation: far,
        personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 }, _turnSignalSeen: 'none' });
      const time = { current: 20 };
      const update = makeUpdate(scopeFor(J.world, scenario, car, [ai], [signal], time));
      const real = Math.random; Math.random = seeded(seed);
      try { time.current += 0.1; update(0.1); } finally { Math.random = real; }
      if (ai.id === 'ai') continue; // not recycled this seed
      const aiSt = RR.mainRoadLocalPoint(J.world, ai.x, ai.y).longitudinal;
      const dir = Math.sin(ai.heading) > 0 ? 1 : -1;
      const toLine = (J.st - dir * 4.1 - aiSt) * dir - len / 2;
      const inBox = Math.abs(aiSt - J.st) < 4.1 + len / 2 + 1;
      const tooFast = toLine > -0.5 && ai.speed * ai.speed / 7 > Math.max(0, toLine - 0.3) + 0.5;
      if (inBox || tooFast) bad.push({ seed, aiSt: +(aiSt - J.st).toFixed(1), dir, v: +ai.speed.toFixed(1), toLine: +toLine.toFixed(1), inBox });
    }
    expect(bad, JSON.stringify(bad)).toEqual([]);
  });
});
