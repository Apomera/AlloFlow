import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 42, lane ra42: the work-zone deadlock of round 41 (construction s5, F6).
// What the recorder showed: a motorcycle rode its own lane straight through the work zone, past the cones (riders
// did not obey a flagger or take the detour). As a truck leaving the one-lane section moved back into that lane at
// the end of the zone, the motorcycle came level with it. Each one's guard stopped it for the other (the truck's
// move would touch the rider; the truck was "ahead" of the rider in its lane), so neither ever moved again. The
// flagger waited for the section to empty, then after 30 s gave Ride-Along's side SLOW anyway, with the truck and two
// cars behind it still in the single lane (round 41's 3 "against the go" violations), and Ride-Along stopped nose to
// nose with the truck. Fixes: a motorcycle takes the car's path and speed through a work zone and stops at a
// flagger's STOP (rrRiderWorkZoneLane, rrRiderWorkZoneSpeedCap, riderSignalControl), the flagger waits for a
// motorcycle in the section, a motorcycle is not respawned inside one, and the flagger's all-stop is never cut short.
// Maine Driver's License Manual (work zones): obey the flagger's signals. The REAL code is cut from the tool and
// stepped in the drive loop's order (tests/roadready_ra42_sim.cjs).

const require = createRequire(import.meta.url);
const INV = require('./roadready_zn34_invariants.cjs');
const { makeSim } = require('./roadready_ra42_sim.cjs');
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const meta = { weather: 'clear', hardBrakeLine: 5.2, reactionSec: 1.5 };
const seeded = (seed) => { let a = (seed * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const withSeed = (seed, fn) => { const real = Math.random; Math.random = seeded(seed); try { return fn(); } finally { Math.random = real; } };

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

// round 41 construction s5 at t 37.5 (its recorder frames): zone at chunk -5, paddle red (SLOW for travel toward +station)
const s5 = (dt, withQueue) => {
  const S = makeSim(RR, src, { scenario: 'construction' });
  S.t = 37.5;
  const ci = -5, b = RR.workZoneBoundsForChunk(ci);
  S.flaggerFor(ci, 'red', 6.8);
  S.flaggerFor(-8, 'green', 3); S.flaggerFor(-11, 'red', 1); S.flaggerFor(-14, 'green', 5); // the next zones (the app adds one per zone)
  S.placeCar(-111.56, 1.65, 0);                                     // Ride-Along at its line
  const truck = S.vehicle('truck', 'truck', -131.87, 1.6, 1, 8.94, { _workZoneDetour: true }); // leaving the single lane
  const moto = S.rider('moto', 'motorcycle', -138.53, -1.51, 1, 15.12);                         // behind it, in the closed lane
  if (withQueue) { S.vehicle('q1', 'car', -141.2, 1.6, 1, 7.78, { _workZoneDetour: true }); S.vehicle('q2', 'car', -150.7, 1.6, 1, 6.5, { _workZoneDetour: true }); }
  const frames = []; let truckOut = null, motoOut = null, hardBrakesThroughZone = null;
  withSeed(5, () => {
    for (let i = 0; i < 40 / dt; i++) {
      S.step(dt);
      frames.push(S.frame(INV));
      if (truckOut == null && S.local(truck).longitudinal - 2.75 > b.playerStopY) truckOut = S.t;
      if (motoOut == null && S.cyclists.includes(moto) && S.local(moto).longitudinal - 1.1 > b.playerStopY) motoOut = S.t;
      if (hardBrakesThroughZone == null && S.station < b.opposingStopY - 10) hardBrakesThroughZone = S.hardBrakes;
    }
  });
  return { S, b, frames, truckOut, motoOut, hardBrakesThroughZone };
};

describe('Road Ready ra42: the round 41 work-zone deadlock (construction s5), the real drive-loop code', () => {
  it.each([0.1, 1 / 30])('dt %s: the truck and the motorcycle drive out of the zone, and Ride-Along goes through it', (dt) => {
    const r = s5(dt, false);
    expect(r.truckOut, 'the truck leaves the one-lane section').not.toBeNull();
    expect(r.truckOut).toBeLessThan(42);
    expect(r.motoOut, 'the motorcycle leaves it too').not.toBeNull();
    expect(r.S.station, 'Ride-Along has driven through the zone').toBeLessThan(r.b.opposingStopY - 10);
    expect(INV.checkWorkZone({ meta, frames: r.frames })).toEqual([]);
    expect(r.hardBrakesThroughZone, 'no hard brake on the way through').toBe(0);
    expect(r.S.hardBrakes, 'nor after it').toBe(0);
  });

  it('with the two drivers that followed the truck in: all three leave, no one is inside against the go', () => {
    const r = s5(0.1, true);
    expect(r.truckOut).not.toBeNull();
    expect(INV.checkWorkZone({ meta, frames: r.frames })).toEqual([]);
    expect(r.S.station).toBeLessThan(r.b.opposingStopY - 10);
  });
});

describe('Road Ready ra42: a motorcycle goes through a work zone as a car does', () => {
  const ci = -5;
  const lane = () => RR.scenarioRoadLayout('construction').laneCenters[0];

  it('on the closed side it takes the car\'s path (in the open lane beside the cones, never inside the cone line) at 20 mph', () => {
    const S = makeSim(RR, src, { scenario: 'construction', learner: 'scripted' });
    const b = RR.workZoneBoundsForChunk(ci);
    S.flaggerFor(ci, 'red', 0); S.controls[0].redDur = 600;       // SLOW for +1 the whole time
    // just past the previous zone (chunk -8), at the posted 35 mph (as a recycled motorcycle is placed)
    const moto = S.rider('moto', 'motorcycle', b.opposingStopY - 36, -lane(), 1, 35 * RR.MPH_TO_MS);
    S.placeCar(b.opposingStopY - 6, 7, 0); S.keepNear = { actor: moto, offset: 30, lat: 7 }; // the learner off the road, near it (not recycled)
    let beside = 0, taper = 0, inCones = 0, fastest = 0, n = 0;
    withSeed(3, () => {
      for (let i = 0; i < 300; i++) {
        S.step(0.1);
        const f = S.local(moto);
        if (f.longitudinal > b.playerStopY + 5) break;
        if (i > 0) fastest = Math.max(fastest, moto.speed);
        if (f.longitudinal >= b.startY && f.longitudinal <= b.endY) { beside = Math.max(beside, Math.abs(f.lateral - lane())); n++; }
        else if (f.longitudinal >= b.opposingStopY && f.longitudinal <= b.playerStopY) taper = Math.max(taper, Math.abs(f.lateral - RR.workZoneOpposingLaneOffset(f.longitudinal, b, lane())));
        if (f.longitudinal > b.startY && f.longitudinal < b.endY && f.lateral < 0.2) inCones++;
      }
    });
    expect(inCones, 'frames inside the cone line').toBe(0);
    expect(n, 'it rode past the cones').toBeGreaterThan(10);
    expect(beside, 'beside the cones: off the open lane\'s centre (m)').toBeLessThan(0.3);
    expect(taper, 'in the tapers: behind the car path (m; a car lags it 0.4 m)').toBeLessThan(1.0);
    expect(fastest, 'never over 20 mph after the first step').toBeLessThanOrEqual(20 * RR.MPH_TO_MS + 0.05);
  });
  it.each([[1, 'green'], [-1, 'red']])('travelling %s, it stops at the flagger\'s STOP paddle (%s) and goes on SLOW', (dir, stopState) => {
    const S = makeSim(RR, src, { scenario: 'construction', learner: 'scripted' });
    const b = RR.workZoneBoundsForChunk(ci);
    const f = S.flaggerFor(ci, stopState, 0); f.greenDur = 600; f.redDur = 600;
    const line = RR.workZoneStopLineForDirection(b, dir);
    const moto = S.rider('moto', 'motorcycle', line - dir * 60, dir > 0 ? -lane() : lane(), dir, 35 * RR.MPH_TO_MS);
    S.placeCar(line - dir * 90, 7, 0); S.keepNear = { actor: moto, offset: -dir * 30, lat: 7 }; // off the road, outside the section
    let furthest = -Infinity, stoppedFor = 0;
    withSeed(2, () => { for (let i = 0; i < 200; i++) { S.step(0.1); const fr = (S.local(moto).longitudinal + dir * 1.075 - line) * dir; furthest = Math.max(furthest, fr); if (moto.speed < 0.05) stoppedFor += 0.1; } });
    expect(furthest, 'front never past its line under STOP').toBeLessThanOrEqual(0.05);
    expect(stoppedFor).toBeGreaterThan(5);
    f.state = 'yellow'; f.timer = 0; f._flaggerNextState = dir > 0 ? 'red' : 'green'; f.yellowDur = 0.5;
    withSeed(2, () => { for (let i = 0; i < 80; i++) S.step(0.1); });
    expect((S.local(moto).longitudinal - line) * dir, 'gone through on SLOW').toBeGreaterThan(20);
  });

  it('the flagger keeps the all-stop while a motorcycle is in the one-lane section (the drive loop\'s hold block)', () => {
    const S = makeSim(RR, src, { scenario: 'construction', learner: 'scripted' });
    const b = RR.workZoneBoundsForChunk(ci);
    const f = S.flaggerFor(ci, 'yellow', 0); f._flaggerNextState = 'green';
    S.placeCar(b.playerStopY + 10, lane(), 0);
    S.rider('moto', 'motorcycle', (b.startY + b.endY) / 2, lane(), 1, 0.0); // stopped in the single lane, travelling +1
    withSeed(1, () => { for (let i = 0; i < 60; i++) S.step(0.1); });
    expect(f._zoneHold).toBe('clearing');
    expect(f.state).toBe('yellow');
  });

  it('a recycled motorcycle is never placed inside a one-lane section (as a car: 8 m clear)', () => {
    let inside = 0, n = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const S = makeSim(RR, src, { scenario: 'construction', learner: 'scripted' });
      const learnerSt = -100 - seed * 7;
      S.placeCar(learnerSt, lane(), 0);
      const moto = S.rider('moto', 'motorcycle', learnerSt + 70, seed % 3 ? lane() : -lane(), seed % 3 ? -1 : 1, 10); // 70 m behind: recycled
      withSeed(seed, () => S.step(0.1));
      const st = S.local(moto).longitudinal; n++;
      if (RR.workZoneSectionAt(S.world, st, 8)) inside++;
    }
    expect(n).toBe(60);
    expect(inside).toBe(0);
  });
});

describe('Road Ready ra42: a motorcycle already in a one-lane section when its flagger is set up (the real set-up block)', () => {
  // round 42 lane sweep, construction s5: the drive began with a motorcycle inside the first zone, travelling +1, while a
  // car travelling -1 was inside too: the paddle gave -1 the go, the motorcycle rode against it and met Ride-Along (hard brake).
  const block = () => { const a = src.indexOf('                if (isFlagger && workBounds) {'), b = src.indexOf('                // ── Cross-street traffic in Free Explore ──', a); return src.slice(a, b); };
  it.each([[1, 'green'], [-1, 'green']])('a motorcycle travelling %s inside (with a car travelling -1 inside too when it travels +1): paddle %s, never two directions inside', (dir, expected) => {
    const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === 'construction'));
    const ci = -14, b = RR.workZoneBoundsForChunk(ci), lane = RR.scenarioRoadLayout('construction').laneCenters[0];
    const at = (o, st, lat, d) => { const p = RR.mainRoadWorldPoint(world, st, lat); return Object.assign(o, { x: p.x, y: p.y, heading: (d > 0 ? Math.PI / 2 : -Math.PI / 2) - p.heading, _roadStation: st }); };
    const traffic = dir > 0 ? [at({ id: 'down', type: 'car', laneOffset: lane, speed: 8.9 }, b.endY - 4, lane, -1)] : [];
    const moto = at({ id: 'moto', type: 'motorcycle', speed: 8.9, _bikeLane: dir > 0 ? -lane : lane }, b.startY + 6, dir > 0 ? -lane : lane, dir);
    const sp = RR.mainRoadWorldPoint(world, b.playerStopY, 0);
    const signals = [{ x: sp.x, y: b.playerStopY, type: 'flagger', state: 'red', timer: 0, greenDur: 10, yellowDur: 2, redDur: 8, _chunk: ci, _workZoneStartY: b.startY, _workZoneEndY: b.endY }];
    const scope = { ...RR, isFlagger: true, workBounds: b, signalsRef: { current: signals }, trafficRef: { current: traffic }, cyclistsRef: { current: [moto] }, iw: world, sigChunk: world.getChunk(ci) };
    new Function('scope', 'with(scope) {' + block() + '}')(scope);
    expect(signals[0].state, 'the paddle gives the go to the side inside').toBe(expected);
    const st = RR.mainRoadLocalPoint(world, moto.x, moto.y).longitudinal;
    const inside = st > b.opposingStopY + 1 && st < b.playerStopY - 1;
    if (dir > 0) { expect(inside, 'the +1 motorcycle waits behind its own flagger').toBe(false); expect(moto.speed).toBe(0); expect(moto._bikeLane).toBeCloseTo(-lane, 6);
      expect(moto._cruiseSpeed, 'and rides on at its own speed when it gets the go').toBeCloseTo(8.9, 6); }
    else expect(inside, 'the -1 motorcycle has the go and stays').toBe(true);
  });
});
describe('Road Ready ra42: the flagger never sends a side into an occupied one-lane section', () => {
  it('an all-stop with the section not clear stays an all-stop (it used to give way after 32 s)', () => {
    const f = { type: 'flagger', state: 'yellow', _flaggerNextState: 'green', timer: 0, greenDur: 10, yellowDur: 2, redDur: 8, _workZoneStartY: -157, _workZoneEndY: -131 };
    for (let i = 0; i < 1200; i++) { f._zoneHold = 'clearing'; RR.updateSignals([f], 0.1); }
    expect(f.state).toBe('yellow');
    f._zoneHold = null; RR.updateSignals([f], 0.1);
    expect(f.state, 'and gives the go once the section is clear').toBe('green');
  });

  it('the exports', () => {
    expect(typeof RR.rrRiderWorkZoneLane).toBe('function');
    expect(typeof RR.rrRiderWorkZoneSpeedCap).toBe('function');
    expect(src).toContain("if (wzSignal && wzSignal.type === 'flagger') wzSignal._zoneHold = workZoneFlaggerHold(wzSignal, wzHoldVehicles);");
  });
});
