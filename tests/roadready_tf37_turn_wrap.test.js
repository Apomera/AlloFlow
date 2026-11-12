import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 37, traffic lane (tf37): the round 36 night s3 crash. An AI driver that began a left turn "vanished" for
// 3.5 s and came back inside the junction 22 m ahead of the learner at 36 mph.
// Cause (jump tracer, harness/jumps.cjs, base night seeds 1-5: 10 such moves): at the end of updateTraffic the
// small fixed map's wrap (`if (t.y < -2) t.y = MAP_SIZE + 2; if (t.y > MAP_SIZE + 2) t.y = -2;`) also ran on the
// streamed road for a main-road driver whose `_turning` had just been set, so the driver was sent to y = 98 or
// y = -2, hundreds of metres away. Each next frame the turn path put it back at the junction and the
// pedestrian-sweep guard (guardTrafficPedestrianMotion) undid that move, until one frame it did not: the driver
// reappeared mid-turn in the junction. Now the wrap runs only on the fixed map.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('cannot find ' + from); return src.slice(a, b); };
const seeded = (seed) => { let a = (seed * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const makeUpdate = (scope) => new Function('scope', 'with(scope) {' + cut('        var updateTraffic = function(dt) {', '        var updateWildlife = function(dt)') + '\nreturn updateTraffic;}')(scope);
const pose = (world, station, lateral, dir) => { const p = RR.mainRoadWorldPoint(world, station, lateral); return { x: p.x, y: p.y, heading: (dir > 0 ? Math.PI / 2 : -Math.PI / 2) - p.heading }; };

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

// A driver toward `dir` turns at the first junction whose centre is past the fixed map's edge on that side.
const turnAt = (scenarioId, dir) => {
  const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === scenarioId));
  let ci = 0, st = null;
  for (let k = 0; k < 40 && st == null; k++) {
    const c = dir > 0 ? k : -k; const ch = world.getChunk(c);
    if (!ch || !ch.hasIntersection) continue;
    const s = c * RR.CHUNK_SIZE + ch.intersectionY; const y = RR.mainRoadWorldPoint(world, s, 0).y;
    if (dir > 0 ? y > RR.MAP_SIZE + 10 : y < -10) { ci = c; st = s; }
  }
  if (st == null) return null;
  const lane = RR.scenarioRoadLayout(scenarioId).laneCenters[0];
  const lat = dir > 0 ? -lane : lane;
  const centre = RR.mainRoadWorldPoint(world, st, 0);
  const signal = { x: centre.x, y: centre.y, type: 'light', state: 'green', _phase: 'main_green', _crossState: 'red', timer: 0,
    greenDur: 600, yellowDur: 4, redDur: 6, allRedDur: 1, _chunk: ci, protectedMainTurns: false };
  const intent = ['left', 'right'].find((i) => !RR.rrTurnCrossesOncoming('main', dir, i));
  const aiSt = st - dir * 12;
  const ai = Object.assign(pose(world, aiSt, lat, dir), { type: 'car', id: 'ai', laneOffset: lat, speed: 5.5, _roadStation: aiSt,
    personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 }, _turnIntent: intent, _turnSignal: signal, _turnSignalSeen: signal });
  const car = Object.assign(pose(world, aiSt - dir * 40, lat, dir), { speed: 0 });
  const time = { current: 30 };
  const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4, trafficRef: { current: [ai] }, infiniteWorldRef: { current: world },
    currentScenario: { id: scenarioId, speedLimit: 40, weather: 'clear', traffic: 'medium' }, currentVehicle: { id: 'sedan' }, carRef: { current: car },
    pedsRef: { current: [] }, signalsRef: { current: [signal] }, cyclistsRef: { current: [] }, emergencyRef: { current: null },
    statsRef: { current: { safetyScore: 100, crashes: 0 } }, timeRef: time, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
    blackBoxRef: { current: [] }, addToast() {}, speak() {}, audioRef: { current: {} }, eventToastRef: { current: null } };
  const update = makeUpdate(scope);
  const real = Math.random; Math.random = seeded(11);
  const out = { startedTurn: false, maxStep: 0, maxFromCentre: 0, finished: false, yCentre: +centre.y.toFixed(1) };
  try {
    let px = ai.x, py = ai.y;
    for (let i = 0; i < 120; i++) {
      time.current += 0.1; update(0.1);
      if (ai._turning) out.startedTurn = true;
      const step = Math.hypot(ai.x - px, ai.y - py); px = ai.x; py = ai.y;
      if (step > out.maxStep) out.maxStep = +step.toFixed(2);
      if (out.startedTurn) out.maxFromCentre = Math.max(out.maxFromCentre, +Math.hypot(ai.x - centre.x, ai.y - centre.y).toFixed(1));
      if (out.startedTurn && ai.crossStreet) { out.finished = true; break; }
    }
  } finally { Math.random = real; }
  return out;
};

describe('Road Ready tf37: a driver that begins a turn on the streamed road stays at its junction (the real updateTraffic)', () => {
  it.each([['suburban', 1], ['night', -1], ['night', 1]])('%s, toward %s: it turns and never moves more than a step\'s worth (base: sent to the fixed map\'s edge, y = 98 or -2)', (sc, dir) => {
    const r = turnAt(sc, dir);
    expect(r, 'no junction past the fixed map on this side').not.toBe(null);
    expect(r.startedTurn, JSON.stringify(r)).toBe(true);
    expect(r.maxStep, JSON.stringify(r)).toBeLessThan(2);
    expect(r.maxFromCentre, JSON.stringify(r)).toBeLessThan(15);
    expect(r.finished, JSON.stringify(r)).toBe(true);
  });

  it('the fixed map\'s wrap is still there for the fixed map, and only there', () => {
    const wrap = src.indexOf('if (t.y < -2) t.y = MAP_SIZE + 2;');
    expect(wrap).toBeGreaterThan(0);
    const before = src.slice(src.lastIndexOf('} else', wrap), wrap);
    expect(before).toContain('} else if (!infiniteWorldRef.current) {');
  });
});
