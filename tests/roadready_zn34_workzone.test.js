import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 34, zone lane (zn34): the head-on at LATER work zones (round 33: 3 of 5 seeds).
// What the recorder showed (base sweep, construction 10 seeds x 180 s): in 8 of the 11 entries
// against a STOP paddle, a driver waiting with its front on its flagger's line was pushed 0.2 to
// 0.8 m over the line by a driver passing the other way in its own lane, on a bend. The overlap
// pass in updateTraffic compared world-axis boxes; on a bend those overlap although the cars do
// not. Once over the line the flagger was "behind" the driver, so it no longer stopped it, and
// the driver went into the single lane against STOP 0.3 to 0.6 s later. Two more were drivers
// placed at the start 1 to 2 m from the line at 31 mph (they could not stop).
// These tests run the REAL updateTraffic and the REAL flagger set-up block cut from the source.

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
const driver = (world, id, station, lateral, dir, speed) => Object.assign(pose(world, station, lateral, dir), { type: 'car', id, laneOffset: lateral, speed, _roadStation: station,
  personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 } });
const flaggerFor = (world, ci, state) => { const b = RR.workZoneBoundsForChunk(ci), sp = RR.mainRoadWorldPoint(world, b.playerStopY, 0);
  return { x: sp.x, y: b.playerStopY, type: 'flagger', state, timer: 0, greenDur: 600, yellowDur: 2, redDur: 600, _chunk: ci, _workZoneStartY: b.startY, _workZoneEndY: b.endY }; };
const meta = { weather: 'clear', hardBrakeLine: Math.max(0.5, 0.72 * 0.92 * 9.81) * 0.8, reactionSec: 1.5 };
const withSeed = (seed, fn) => { const real = Math.random; Math.random = seeded(seed); try { return fn(); } finally { Math.random = real; } };

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('Road Ready zn34: a driver waiting at a flagger\'s STOP stays there (the real updateTraffic)', () => {
  // chunk -14: a bend (road heading 0.45 rad), the zone where the recorder saw the push; -8 and 1:
  // nearly straight, where a front resting exactly ON the line already read as "past it" on base.
  it.each([[-14, -4], [-14, 2], [-14, 10], [-8, -4], [-8, 6], [1, 0], [1, 8]])('zone at chunk %s, a driver passes the other way starting %s m from the line', (ci, start) => {
    const world = worldFor('construction');
    expect(world.getChunk(ci).workZone).toBe(true);
    const b = RR.workZoneBoundsForChunk(ci);
    const lane = RR.scenarioRoadLayout('construction').laneCenters[0];
    const len = RR.vehicleFootprint('car').length;
    const waitSt = b.opposingStopY - len / 2; // front exactly on the line
    const waiting = driver(world, 'waiting', waitSt, -lane, 1, 0);
    const passing = driver(world, 'passing', b.opposingStopY + start, lane, -1, 8.94); // 20 mph, the zone speed
    const flagger = flaggerFor(world, ci, 'green'); // SLOW for travel toward -station, STOP for the waiting driver
    const car = Object.assign(pose(world, b.playerStopY + 6, lane, -1), { speed: 0 });
    const time = { current: 80 };
    const update = makeUpdate(scopeFor(world, { id: 'construction', speedLimit: 35, weather: 'clear', traffic: 'medium' }, car, [waiting, passing], [flagger], time));
    const frames = []; let furthest = -Infinity, sideways = 0;
    withSeed(4, () => {
      for (let i = 0; i < 60; i++) {
        time.current += 0.1; update(0.1);
        const f = RR.mainRoadLocalPoint(world, waiting.x, waiting.y);
        furthest = Math.max(furthest, f.longitudinal + len / 2);
        sideways = Math.max(sideways, Math.abs(f.lateral + lane));
        frames.push(INV.recordFrame(RR, world, time.current, car, 'sedan', [waiting, passing], [flagger]));
      }
    });
    expect(furthest - b.opposingStopY, 'front never goes over the line').toBeLessThan(0.3);
    expect(sideways, 'not pushed sideways by a driver who does not touch it').toBeLessThan(0.1);
    expect(INV.checkWorkZone({ meta, frames })).toEqual([]);
  });

  it.each([0.3, 1.2])('a driver already %s m over the line is still held by STOP', (over) => {
    const world = worldFor('construction');
    const ci = -14, b = RR.workZoneBoundsForChunk(ci);
    const lane = RR.scenarioRoadLayout('construction').laneCenters[0];
    const len = RR.vehicleFootprint('car').length;
    const waiting = driver(world, 'waiting', b.opposingStopY + over - len / 2, -lane, 1, 0);
    const flagger = flaggerFor(world, ci, 'green');
    let carSt = b.playerStopY + 6;
    const car = Object.assign(pose(world, carSt, lane, -1), { speed: 6 });
    const time = { current: 80 };
    const update = makeUpdate(scopeFor(world, { id: 'construction', speedLimit: 35, weather: 'clear', traffic: 'medium' }, car, [waiting], [flagger], time));
    const frames = []; let furthest = -Infinity;
    withSeed(4, () => {
      for (let i = 0; i < 150; i++) {
        time.current += 0.1; update(0.1);
        carSt -= car.speed * 0.1; Object.assign(car, pose(world, carSt, lane, -1));
        frames.push(INV.recordFrame(RR, world, time.current, car, 'sedan', [waiting], [flagger]));
        furthest = Math.max(furthest, RR.mainRoadLocalPoint(world, waiting.x, waiting.y).longitudinal + len / 2);
      }
    });
    expect(furthest, 'front never moves farther over the line').toBeLessThan(b.opposingStopY + over + 0.3);
    expect(Math.abs(waiting.speed)).toBeLessThan(0.3);
    expect(INV.checkWorkZone({ meta, frames })).toEqual([]);
    expect(INV.checkHeadOn({ meta, frames })).toEqual([]);
  });

  it('the flagger\'s all-stop is not held for ever by a driver waiting just over its line', () => {
    const b = RR.workZoneBoundsForChunk(-14);
    const s = { type: 'flagger', state: 'yellow', _flaggerNextState: 'red', timer: 0, greenDur: 10, yellowDur: 2, redDur: 8, _workZoneStartY: b.startY, _workZoneEndY: b.endY };
    const len = RR.vehicleFootprint('car').length;
    expect(RR.workZoneFlaggerHold(s, [{ station: b.opposingStopY + 1.2 - len / 2, travelSign: 1, speed: 0, length: len, stopMeters: 2 }])).toBeNull();
    // a driver really inside still holds it
    expect(RR.workZoneFlaggerHold(s, [{ station: b.opposingStopY + 6, travelSign: 1, speed: 5, length: len, stopMeters: 6 }])).toBe('clearing');
    // the tolerance stays under the 3 m a SLOW driver is given before the paddle may turn to STOP
    expect(RR.RR_WORK_ZONE_HOLD_PAST_LINE_METERS).toBeLessThan(3);
  });
});

describe('Road Ready zn34: drivers already on the road when a work zone\'s flagger is set up (the real set-up block)', () => {
  const block = () => cut('                if (isFlagger && workBounds) {', '                // ── Cross-street traffic in Free Explore ──');
  const setUp = (world, ci, traffic) => {
    const b = RR.workZoneBoundsForChunk(ci);
    const signals = [flaggerFor(world, ci, 'red')];
    const scope = { ...RR, isFlagger: true, workBounds: b, signalsRef: { current: signals }, trafficRef: { current: traffic }, iw: world, sigChunk: world.getChunk(ci) };
    new Function('scope', 'with(scope) {' + block() + '}')(scope);
    return { b, flagger: signals[0] };
  };
  const station = (world, c) => RR.mainRoadLocalPoint(world, c.x, c.y).longitudinal;

  it('a driver of the side that is held is never put on top of one already queued there', () => {
    const world = worldFor('construction');
    const ci = -14, b = RR.workZoneBoundsForChunk(ci);
    const lane = RR.scenarioRoadLayout('construction').laneCenters[0];
    const down = driver(world, 'down', b.endY - 4, lane, -1, 8.9);           // inside, travelling -1: it gets SLOW
    const insideUp = driver(world, 'insideUp', b.startY + 6, -lane, 1, 8.9);  // inside, travelling +1: sent back to queue
    const queued = driver(world, 'queued', b.opposingStopY - 6.5, -lane, 1, 0); // already where the first queue slot is
    setUp(world, ci, [down, insideUp, queued]);
    const ups = [insideUp, queued].map((c) => station(world, c)).sort((p, q) => q - p);
    expect(ups[0] - ups[1], 'queued drivers keep a car length apart').toBeGreaterThan(6);
    ups.forEach((st) => expect(st + RR.vehicleFootprint('car').length / 2).toBeLessThanOrEqual(b.opposingStopY + 0.01));
  });

  it.each([['red', -1], ['green', 1]])('paddle %s: a driver placed just before its STOP line starts slow enough to stop at it', (state, dir) => {
    const world = worldFor('construction');
    const ci = -14, b = RR.workZoneBoundsForChunk(ci);
    const lane = RR.scenarioRoadLayout('construction').laneCenters[0];
    const len = RR.vehicleFootprint('car').length;
    const line = RR.workZoneStopLineForDirection(b, dir);
    const near = driver(world, 'near', line - dir * (0.7 + len / 2), dir > 0 ? -lane : lane, dir, 13.9); // 31 mph, 0.7 m from the line
    const traffic = [near];
    if (state === 'green') traffic.push(driver(world, 'down', b.endY - 4, lane, -1, 8.9)); // the set-up gives SLOW to -1
    const { flagger } = setUp(world, ci, traffic);
    expect(flagger.state).toBe(state);
    const toLine = (line - station(world, near)) * dir - len / 2;
    // stopping room at the tool's AI braking rate (3.5 m/s2, signalDetectRange in updateTraffic)
    expect(near.speed * near.speed / (2 * 3.5)).toBeLessThanOrEqual(Math.max(0, toLine) + 0.01);
  });
});
