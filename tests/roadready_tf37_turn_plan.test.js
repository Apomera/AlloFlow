import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 37, traffic lane (tf37): when an AI driver decides to turn.
// Base: the turn intent was rolled 5 to 14 m before the junction centre (1 to 8 m before the stop line), at any
// speed. A driver at 36 mph then had to slow to the 12 mph turn speed, or stop at its line for a gap, in a few
// metres: final sweep before this fix (lane2, harness/res/lane2_t37) suburban s4 t 38.0 to 38.5: intent rolled at
// 16 m/s, stopped at the line at 58 and 80 m/s2. Round 36 decision 1: Ride-Along braked hard for such a driver.
// Now: the intent is rolled from where the driver can still stop at its line at its 3.5 m/s2 (with the 0.5 s
// lag), and the 12 mph turn speed is reached at that rate.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('cannot find ' + from); return src.slice(a, b); };
const makeUpdate = (scope) => new Function('scope', 'with(scope) {' + cut('        var updateTraffic = function(dt) {', '        var updateWildlife = function(dt)') + '\nreturn updateTraffic;}')(scope);
const pose = (world, station, lateral, dir) => { const p = RR.mainRoadWorldPoint(world, station, lateral); return { x: p.x, y: p.y, heading: (dir > 0 ? Math.PI / 2 : -Math.PI / 2) - p.heading }; };

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

// One AI driver toward +station at v0 on the night road, 90 m before a junction with a green light; Math.random is
// held at 0.1, so every roll says "turn" and picks the first permitted turn. With `oncoming`, a driver comes the
// other way so a turner that must wait for a gap has to stop at its line.
const approach = (v0, oncoming) => {
  const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === 'night'));
  let ci = 1; while (!(world.getChunk(ci) && world.getChunk(ci).hasIntersection)) ci++;
  const st = ci * RR.CHUNK_SIZE + world.getChunk(ci).intersectionY;
  const lane = RR.scenarioRoadLayout('night').laneCenters[0];
  const centre = RR.mainRoadWorldPoint(world, st, 0);
  const signal = { x: centre.x, y: centre.y, type: 'light', state: 'green', _phase: 'main_green', _crossState: 'red', timer: 0,
    greenDur: 600, yellowDur: 4, redDur: 6, allRedDur: 1, _chunk: ci, protectedMainTurns: false };
  const len = RR.vehicleFootprint('car').length;
  const aiSt = st - (oncoming ? 70 : 90);
  const ai = Object.assign(pose(world, aiSt, -lane, 1), { type: 'car', id: 'ai', laneOffset: -lane, speed: v0, _roadStation: aiSt,
    personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 } });
  const traffic = [ai];
  if (oncoming) traffic.push(Object.assign(pose(world, st + 90, lane, -1), { type: 'car', id: 'on', laneOffset: lane, speed: 15, _roadStation: st + 90,
    personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 }, _turnSignalSeen: signal }));
  // the learner: 30 m behind the AI driver; with a driver coming the other way it waits off the road past the junction,
  // so neither AI driver is recycled (both stay within the learner's recycle range)
  const car = oncoming ? Object.assign(pose(world, st + 40, lane + 4, -1), { speed: 0 }) : Object.assign(pose(world, aiSt - 30, -lane, 1), { speed: 0 });
  const time = { current: 30 };
  const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4, trafficRef: { current: traffic }, infiniteWorldRef: { current: world },
    currentScenario: { id: 'night', speedLimit: 40, weather: 'clear', traffic: 'medium' }, currentVehicle: { id: 'sedan' }, carRef: { current: car },
    pedsRef: { current: [] }, signalsRef: { current: [signal] }, cyclistsRef: { current: [] }, emergencyRef: { current: null },
    statsRef: { current: { safetyScore: 100, crashes: 0 } }, timeRef: time, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
    blackBoxRef: { current: [] }, addToast() {}, speak() {}, audioRef: { current: {} }, eventToastRef: { current: null } };
  const update = makeUpdate(scope);
  const real = Math.random; Math.random = () => 0.1;
  const out = { intent: null, rolledToLine: null, peakAbove10: 0, turned: false, stopped: false, stoppedToLine: null };
  try {
    let prevV = ai.speed;
    for (let i = 0; i < 300 && !ai._turning; i++) {
      time.current += 0.1;
      // the learner follows 30 m behind (AI drivers far from the learner are recycled)
      const aiNow = RR.mainRoadLocalPoint(world, ai.x, ai.y).longitudinal;
      if (!oncoming) Object.assign(car, pose(world, aiNow - 30, -lane, 1), { speed: ai.speed });
      update(0.1);
      if (ai.id !== 'ai') throw new Error('the AI driver was recycled');
      const front = RR.mainRoadLocalPoint(world, ai.x, ai.y).longitudinal + len / 2;
      const toLine = st - 4.1 - front;
      if (ai._turnIntent && out.intent == null) { out.intent = ai._turnIntent; out.rolledToLine = +toLine.toFixed(1); }
      const dec = (prevV - ai.speed) / 0.1;
      if (prevV * RR.MS_TO_MPH >= 10 && dec > out.peakAbove10) out.peakAbove10 = +dec.toFixed(2);
      prevV = ai.speed;
      if (out.intent && ai.speed < 0.05 && !out.stopped) { out.stopped = true; out.stoppedToLine = +toLine.toFixed(2); }
    }
    out.turned = !!ai._turning;
  } finally { Math.random = real; }
  return out;
};

describe('Road Ready tf37: an AI driver decides to turn early enough to slow for it (the real updateTraffic)', () => {
  it.each([16, 13.4])('at %s m/s with no one coming: the turn is decided before its stopping distance and taken without braking over 4.5 m/s2 (base: decided 1 to 8 m before the line)', (v0) => {
    const r = approach(v0, false);
    expect(r.intent, JSON.stringify(r)).not.toBe(null);
    expect(r.rolledToLine, JSON.stringify(r)).toBeGreaterThan(v0 * v0 / 7);
    expect(r.turned, JSON.stringify(r)).toBe(true);
    expect(r.peakAbove10, JSON.stringify(r)).toBeLessThan(4.5);
  });

  it('at 16 m/s with a driver coming the other way: the turner slows at about its own rate and, if it must wait, waits at its line (base: stopped at the line at 77 m/s2)', () => {
    const r = approach(16, true);
    expect(r.intent, JSON.stringify(r)).not.toBe(null);
    if (r.stopped) {
      expect(r.stoppedToLine, JSON.stringify(r)).toBeGreaterThan(-0.3);
      expect(r.stoppedToLine, JSON.stringify(r)).toBeLessThan(1.5);
    }
    expect(r.rolledToLine, JSON.stringify(r)).toBeGreaterThan(16 * 16 / 7);
    expect(r.turned, JSON.stringify(r)).toBe(true);
    expect(r.peakAbove10, JSON.stringify(r)).toBeLessThan(4.5);
  });
});
