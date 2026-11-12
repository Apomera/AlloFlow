import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 36, yellow lane (yl36): the real updateTraffic at a yellow light.
// Base: the AI re-decided every frame. A driver that could stop at its own 3.5 m/s2 rate was "stopping", but its
// target speed (sqrt(2 x 3.5 x distance)) was above its speed, so it did not slow; when it reached the edge of
// that profile the distance test read "too close" and it drove on. Round 34 base sweep (work/ai_yellow.cjs on m_base):
// of 297 drivers able to stop at 3.5 m/s2 at a yellow onset, 45 drove through on yellow and 75 stopped at more than
// 4.5 m/s2 (above 10 mph).
// Now: one choice per yellow (rrAiYellowStops), and a driver that chose to stop does not speed up toward the light.

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

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

// One AI driver toward +station at about 37 mph (it slows from 39 to its cruise speed); the light turns yellow when its front is `atYellow` m from the line.
const drive = (atYellow) => {
  const scenario = { id: 'suburban', speedLimit: 40, weather: 'clear', traffic: 'medium' };
  const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === 'suburban'));
  let ci = 0; while (!(world.getChunk(ci) && world.getChunk(ci).hasIntersection)) ci++;
  const st = ci * RR.CHUNK_SIZE + world.getChunk(ci).intersectionY;
  const lane = RR.scenarioRoadLayout('suburban').laneCenters[0];
  const line = st - 4.1;
  const yellowDur = 4, v0 = 17.4; // 4 s is this light's yellow (40 mph) in both copies, so only the AI rule differs
  const len = RR.vehicleFootprint('car').length;
  const aiSt = line - atYellow - 40 - len / 2; // 40 m more to go before the yellow
  const ai = Object.assign(pose(world, aiSt, -lane, 1), { type: 'car', id: 'ai', laneOffset: -lane, speed: v0, _roadStation: aiSt,
    personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 }, _turnSignalSeen: 'none' });
  const signal = { x: world.spline.centerAt(st), y: st, type: 'light', state: 'green', _phase: 'main_green', _crossState: 'red', timer: 0,
    greenDur: 600, yellowDur, redDur: 6, allRedDur: 1.5, _chunk: ci, protectedMainTurns: false };
  // the learner keeps pace 15 m behind in the other lane (AI drivers far from the learner are recycled)
  const lane2 = RR.scenarioRoadLayout('suburban').laneCenters[1];
  const car = Object.assign(pose(world, aiSt - 15, -lane2, 1), { speed: v0 });
  const follow = () => { const s = RR.mainRoadLocalPoint(world, ai.x, ai.y).longitudinal - 15; Object.assign(car, pose(world, s, -lane2, 1), { speed: ai.speed }); };
  const time = { current: 50 };
  const update = makeUpdate(scopeFor(world, scenario, car, [ai], [signal], time));
  const real = Math.random; Math.random = seeded(3);
  const out = { yellowAt: null, aheadAtYellow: null, vAtYellow: null, crossedOn: null, stoppedAt: null, peak: 0 };
  try {
    let prevV = ai.speed;
    for (let i = 0; i < 300; i++) {
      time.current += 0.1;
      const front = RR.mainRoadLocalPoint(world, ai.x, ai.y).longitudinal + len / 2;
      if (out.yellowAt == null && line - front <= atYellow) { signal.state = 'yellow'; signal._phase = 'main_yellow'; signal.timer = 0; out.yellowAt = time.current; out.aheadAtYellow = +(line - front).toFixed(2); out.vAtYellow = ai.speed; }
      if (out.yellowAt != null) RR.updateSignals([signal], 0.1);
      update(0.1);
      follow();
      const after = RR.mainRoadLocalPoint(world, ai.x, ai.y).longitudinal + len / 2;
      if (ai.id !== 'ai' || Math.abs(after - front) > 3) throw new Error('the AI driver was moved: ' + (after - front));
      if (out.yellowAt != null && out.crossedOn == null && out.stoppedAt == null) {
        const dec = (prevV - ai.speed) / 0.1; if (prevV * RR.MS_TO_MPH >= 10 && dec > out.peak) out.peak = dec; // above 10 mph, the drive loop's RR_HARD_BRAKE_MIN_MPH
        if (after > line) out.crossedOn = signal.state;
        else if (ai.speed < 0.05) out.stoppedAt = +(line - after).toFixed(2);
      }
      prevV = ai.speed;
      if (out.crossedOn || out.stoppedAt != null) break;
    }
  } finally { Math.random = real; }
  return out;
};

describe('Road Ready yl36: an AI driver at a yellow (the real updateTraffic)', () => {
  it.each([55, 65])('the light turns yellow %s m before its line at about 37 mph: it stops before the line at about its own rate (base: it drove through on yellow)', (atYellow) => {
    const r = drive(atYellow);
    const need = 0.4 + r.vAtYellow * r.vAtYellow / 7;
    expect(r.aheadAtYellow).toBeGreaterThan(need); // it can stop at 3.5 m/s2
    expect(r.crossedOn, JSON.stringify(r)).toBe(null);
    expect(r.stoppedAt).toBeGreaterThanOrEqual(0);
    expect(r.peak, JSON.stringify(r)).toBeLessThan(4); // about its own 3.5 m/s2 (the learner's hard-brake line on dry road is 5.2)
  });

  it.each([12, 25])('the light turns yellow %s m before its line: too close to stop at its rate, it goes and is past the line before the red', (atYellow) => {
    const r = drive(atYellow);
    expect(r.aheadAtYellow).toBeLessThan(0.4 + r.vAtYellow * r.vAtYellow / 7);
    expect(r.crossedOn, JSON.stringify(r)).toBe('yellow');
  });
});
