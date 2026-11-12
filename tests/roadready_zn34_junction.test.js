import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 34, zone lane (zn34): AI drivers turned across the learner's lane at junctions without a gap.
// The main-road movement labels are mirrored (intersectionMovementPath: for travel toward +station the
// turn called 'right' exits on the far side of the centre line), so the opposing-gap wait that ran for
// 'left' never ran for the turn that crosses. At a stop sign the AI only checked for a learner within
// 5 m of the junction centre: a learner pulling away from the opposite line was "not there". (The
// stop-sign path has the same gap rule; a unit case for it passed on base too, so the app sweep is its check.)
// Gap acceptance now: rrTurnCrossesOncoming + rrTurnAcrossGapClear (time for the turn, the driver's own
// length, 0.5 s to roll, the 1.5 s reaction time of stoppingDistance()).
// The invariant checker's gap rule (the same one the app sweep runs): the learner, reacting after 1.5 s,
// must never need more than half the tool's hard-brake line to stay clear.

const require = createRequire(import.meta.url);
const INV = require('./roadready_zn34_invariants.cjs');
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('cannot find ' + from); return src.slice(a, b); };
const seeded = (seed) => { let a = (seed * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const worldFor = (id) => RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === id));
const makeUpdate = (scope) => new Function('scope', 'with(scope) {' + cut('        var updateTraffic = function(dt) {', '        var updateWildlife = function(dt)') + '\nreturn updateTraffic;}')(scope);
const scopeFor = (world, scenario, car, traffic, signals, time) => ({ ...RR, RR_CURB_YIELD_HOLD_MAX: 4, trafficRef: { current: traffic }, infiniteWorldRef: { current: world },
  currentScenario: scenario, currentVehicle: { id: 'sedan' }, carRef: { current: car },
  pedsRef: { current: [] }, signalsRef: { current: signals }, cyclistsRef: { current: [] }, emergencyRef: { current: null },
  statsRef: { current: { safetyScore: 100, crashes: 0 } }, timeRef: time, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
  blackBoxRef: { current: [] }, addToast() {}, speak() {}, audioRef: { current: {} }, eventToastRef: { current: null } });
const pose = (world, station, lateral, dir) => { const p = RR.mainRoadWorldPoint(world, station, lateral); return { x: p.x, y: p.y, heading: (dir > 0 ? Math.PI / 2 : -Math.PI / 2) - p.heading }; };
const meta = { weather: 'clear', hardBrakeLine: Math.max(0.5, 0.72 * 0.92 * 9.81) * 0.8, reactionSec: 1.5 };
const junction = (world) => { let ci = 0; while (!(world.getChunk(ci) && world.getChunk(ci).hasIntersection)) ci--; return { ci, st: ci * RR.CHUNK_SIZE + world.getChunk(ci).intersectionY }; };

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('Road Ready zn34: which turns cross, and the gap they need', () => {
  it('the main-road turn called \'right\' crosses the oncoming lane; every cross-street movement enters the main road', () => {
    for (const sign of [1, -1]) {
      expect(RR.rrTurnCrossesOncoming('main', sign, 'right')).toBe(true);
      expect(RR.rrTurnCrossesOncoming('main', sign, 'left')).toBe(false);
      expect(RR.rrTurnCrossesOncoming('main', sign, 'straight')).toBe(false);
      for (const turn of ['left', 'straight', 'right']) expect(RR.rrTurnCrossesOncoming('cross', sign, turn)).toBe(true);
      // the geometry itself: the path's first and last points lie on opposite sides of the centre line
      const p = RR.intersectionMovementPath('main', sign, 'right').points;
      expect(Math.sign(p[0].x)).toBe(-Math.sign(p[p.length - 1].x));
    }
    const car = RR.rrTurnAcrossClearSeconds('car', 'main', 1, 'right'), bus = RR.rrTurnAcrossClearSeconds('schoolbus', 'main', 1, 'right');
    expect(car).toBeGreaterThan(4.5); expect(car).toBeLessThan(5.5);
    expect(bus).toBeGreaterThan(car + 1);
    expect(RR.rrTurnGapArrivalSeconds(8, 0.5)).toBeLessThan(3); // a driver pulling away covers 8 m in under 3 s
    expect(RR.rrTurnGapArrivalSeconds(60, 15)).toBeCloseTo(4, 6); // above 30 mph: its own speed
  });
});

describe('Road Ready zn34: a driver turning across the learner\'s lane waits for a gap (the real updateTraffic)', () => {
  it.each([[40, 11], [45, 12], [32, 9], [50, 13]])('green light: the learner is %s m from the junction at %s m/s', (dist, speed) => {
    const world = worldFor('suburban');
    const { ci, st } = junction(world);
    const lanes = RR.scenarioRoadLayout('suburban').laneCenters, lane = lanes[lanes.length - 1];
    const signal = { x: world.spline.centerAt(st), y: st, type: 'light', state: 'green', timer: 0, greenDur: 600, yellowDur: 3, redDur: 6, _chunk: ci, protectedMainTurns: false };
    const aiSt = st - 22;
    const ai = Object.assign(pose(world, aiSt, -lane, 1), { type: 'car', id: 'turner', laneOffset: -lane, speed: 8, _roadStation: aiSt,
      _turnIntent: 'right', _turnSignal: signal, _turnSignalSeen: signal, personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 } });
    let carSt = st + dist + RR.vehicleFootprint('sedan').length / 2;
    const car = Object.assign(pose(world, carSt, lane, -1), { speed });
    const time = { current: 50 };
    const update = makeUpdate(scopeFor(world, { id: 'suburban', speedLimit: 35, weather: 'clear', traffic: 'medium' }, car, [ai], [signal], time));
    const frames = []; let turned = false;
    const real = Math.random; Math.random = seeded(9);
    try {
      for (let i = 0; i < 160; i++) {
        time.current += 0.1;
        frames.push(INV.recordFrame(RR, world, time.current, car, 'sedan', [ai], [signal]));
        update(0.1);
        carSt -= car.speed * 0.1; Object.assign(car, pose(world, carSt, lane, -1));
        if (ai._turning || ai.crossStreet) turned = true;
      }
    } finally { Math.random = real; }
    expect(turned, 'it turns once the learner is through').toBe(true);
    const gap = INV.checkGap({ meta, frames });
    expect(gap, JSON.stringify(gap)).toEqual([]);
  });

});

describe('Road Ready zn34: the cross street\'s painted stop bar is where its drivers stop', () => {
  it('outside the main road\'s edge on every road width; unchanged on the 3.5 m roads', () => {
    for (const half of [3.5, 4.5, 6.5, 8]) for (const dir of [1, -1]) {
      const at = RR.rrCrossStreetStopLineOffset(half, dir);
      expect(Math.abs(at), 'bar outside the main road (' + half + ' m half width)').toBeGreaterThan(half);
      expect(Math.sign(at)).toBe(Math.sign(RR.intersectionStopLineCoordinate(0, dir)));
      // the AI rule in updateTraffic (tr32): max(painted-line distance, main-road half width + 0.6 m)
      expect(Math.abs(at)).toBeCloseTo(Math.max(Math.abs(RR.intersectionStopLineCoordinate(0, dir)), half + 0.6), 9);
    }
    expect(RR.rrCrossStreetStopLineOffset(3.5, 1)).toBeCloseTo(RR.intersectionStopLineCoordinate(0, 1), 9);
    // (includes() not toContain: a failing toContain on the 3.5 MB source makes vitest diff all of it)
    expect(src.includes('var crossStopX = rrCrossStreetStopLineOffset(roadHalfW, crossApproachDir);'), 'the painter uses it').toBe(true);
    expect(src.includes('var crossMainEdge = roadLayoutFor(getTrafficProfileAt(crossSignalStation)).roadHalfWidth + 0.6;'), 'the AI rule it mirrors').toBe(true);
  });
});

describe('Road Ready zn34: Ride-Along at a stop sign lets a driver who was just released go first', () => {
  it('rrStopSignClearForLearner waits 1.5 s after another driver\'s release', () => {
    const sign = { x: 0, y: 0 };
    const other = { x: 0, y: 8, speed: 1, _stopReleasedAt: 100 }; // 8 m out, just set off
    expect(RR.rrStopSignClearForLearner(sign, [other], 90, 100.5)).toBe(false);
    expect(RR.rrStopSignClearForLearner(sign, [other], 90, 101.6)).toBe(true);
  });
});
