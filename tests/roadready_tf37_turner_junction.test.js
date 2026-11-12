import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 37, traffic lane (tf37): Ride-Along's "give the junction to a turner" rule.
// Base: Ride-Along stopped at the line for ANY vehicle with a turn intent within 11 m of the junction centre:
// a cross-street driver braking for its own red (sweep: suburban s2 and s4 t 8.7, hard brake on a green), or an
// oncoming driver who must itself wait for a gap (round 34 night s2, base night s4).
// Now: it gives the junction to a turner that has it by the AI's own rules (rrTurnerHasJunction), and always to
// a driver already turning. The last test runs the real updateTraffic: an oncoming turner that Ride-Along no
// longer stops for does wait, and when it does turn the learner has at least the gap the AI needs.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('cannot find ' + from); return src.slice(a, b); };
const seeded = (seed) => { let a = (seed * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const pose = (world, station, lateral, dir) => { const p = RR.mainRoadWorldPoint(world, station, lateral); return { x: p.x, y: p.y, heading: (dir > 0 ? Math.PI / 2 : -Math.PI / 2) - p.heading }; };

// The Ride-Along junction condition, cut from the drive loop and run as it is written there.
let junctionRule;
const makeRule = () => {
  const a = src.indexOf('if (raJunctionSignal && raJunctionAhead < raControlDistance');
  const b = src.indexOf('{\n', a);
  if (a < 0 || b < 0) throw new Error('Ride-Along junction rule not found');
  const cond = src.slice(a + 3, b).trim(); // "( ... )" as written
  return new Function('scope', 'with (scope) { return !!(' + cond + '); }');
};

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  junctionRule = makeRule();
});

const setup = () => {
  const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === 'night'));
  let ci = 0; while (!(world.getChunk(ci) && world.getChunk(ci).hasIntersection)) ci++;
  const st = ci * RR.CHUNK_SIZE + world.getChunk(ci).intersectionY;
  const lane = RR.scenarioRoadLayout('night').laneCenters[0];
  const centre = RR.mainRoadWorldPoint(world, st, 0);
  const signal = { x: centre.x, y: centre.y, type: 'light', state: 'green', _phase: 'main_green', _crossState: 'red', timer: 1,
    greenDur: 600, yellowDur: 4, redDur: 6, allRedDur: 1, _chunk: ci, protectedMainTurns: false };
  return { world, st, lane, signal, ci };
};
// the learner toward +station in its lane, `ahead` m before the junction centre
const learnerAt = (S, ahead, speed) => Object.assign(pose(S.world, S.st - ahead, -S.lane, 1), { speed });
const crossIntent = (dir) => ['left', 'right'].find((i) => RR.rrTurnCrossesOncoming('main', dir, i));
const ruleFor = (S, tc, car) => {
  const rel = RR.mainRoadLocalPoint(S.world, car.x, car.y);
  return junctionRule({ raJunctionSignal: S.signal, raJunctionAhead: S.st - rel.longitudinal, raControlDistance: 90, tc,
    raHeadingMatch: Math.cos((Number(tc.heading) || 0) - car.heading), raWorld: S.world, tList: [tc], car,
    rrTurnerHasJunction: RR.rrTurnerHasJunction, Math });
};
const crossDriver = (S, side, speed, fromCentre, intent) => {
  const pose0 = RR.crossStreetPose(S.signal.x, S.signal.y, S.world.spline.headingAt(S.st), 6.5, RR.CROSS_STREET_LENGTH);
  const dir = side; const p = RR.crossStreetWorldPoint(pose0, -dir * fromCentre, dir > 0 ? 1.5 : -1.5);
  return { id: 'x', type: 'car', x: p.x, y: p.y, heading: RR.crossStreetTravelHeading(pose0, dir), speed, crossStreet: true,
    _crossPose: pose0, _crossDirection: dir, _turnIntent: intent, _turnSignal: S.signal, _chunk: S.ci };
};

describe('Road Ready tf37: Ride-Along gives the junction only to a turner that has it', () => {
  it('a cross-street driver with a turn intent braking for its own red: no stop (base: Ride-Along stopped on its green)', () => {
    const S = setup(); const car = learnerAt(S, 30, 13.4);
    const tc = crossDriver(S, -1, 5, 9.8, 'left'); tc._slowFor = 2;
    expect(RR.trafficSignalMovementIndication(S.signal, 'cross', 'left')).toBe('red');
    expect(ruleFor(S, tc, car)).toBe(false);
  });

  it('the same driver once the cross street has green (the learner then has red): Ride-Along gives it the junction', () => {
    const S = setup(); const car = learnerAt(S, 30, 13.4);
    S.signal.state = 'red'; S.signal._phase = 'cross_green'; S.signal._crossState = 'green';
    expect(ruleFor(S, crossDriver(S, -1, 5, 9.8, 'left'), car)).toBe(true);
  });

  it('a cross-street driver that chose to stop for its yellow: no stop; one that chose to go: stop', () => {
    const S = setup(); const car = learnerAt(S, 30, 13.4);
    S.signal.state = 'red'; S.signal._phase = 'cross_yellow'; S.signal._crossState = 'yellow';
    const tc = crossDriver(S, 1, 6, 9.5, 'right');
    tc._rrYellow = { key: 'k', start: 0, stop: true, signal: S.signal };
    expect(ruleFor(S, tc, car)).toBe(false);
    tc._rrYellow.stop = false;
    expect(ruleFor(S, tc, car)).toBe(true);
  });

  it('an oncoming driver about to turn across the learner, with the learner too close for its gap: no stop (base: stop)', () => {
    const S = setup(); const car = learnerAt(S, 32, 15);
    const intent = crossIntent(-1);
    const tc = Object.assign(pose(S.world, S.st + 10, S.lane, -1), { id: 'o', type: 'car', speed: 14, laneOffset: S.lane, _turnIntent: intent, _turnSignal: S.signal });
    expect(RR.rrTurnAcrossGapClear(S.world, [tc], tc, S.signal, car, 'main', -1, intent)).toBe(false);
    expect(ruleFor(S, tc, car)).toBe(false);
  });

  it('the same oncoming turner with the learner far enough for its gap: Ride-Along gives it the junction', () => {
    const S = setup(); const car = learnerAt(S, 89, 15);
    const intent = crossIntent(-1);
    const tc = Object.assign(pose(S.world, S.st + 8, S.lane, -1), { id: 'o', type: 'car', speed: 6, laneOffset: S.lane, _turnIntent: intent, _turnSignal: S.signal });
    expect(RR.rrTurnAcrossGapClear(S.world, [tc], tc, S.signal, car, 'main', -1, intent)).toBe(true);
    expect(ruleFor(S, tc, car)).toBe(true);
  });

  it('an oncoming turner whose turn stays on its own side of the road: no stop', () => {
    const S = setup(); const car = learnerAt(S, 32, 15);
    const intent = ['left', 'right'].find((i) => !RR.rrTurnCrossesOncoming('main', -1, i));
    const tc = Object.assign(pose(S.world, S.st + 8, S.lane, -1), { id: 'o', type: 'car', speed: 6, laneOffset: S.lane, _turnIntent: intent, _turnSignal: S.signal });
    expect(ruleFor(S, tc, car)).toBe(false);
  });

  it('a driver already turning always has the junction, whatever its light, and so does any turner at a stop sign', () => {
    const S = setup(); const car = learnerAt(S, 32, 15);
    const tc = crossDriver(S, -1, 3, 6, 'left'); tc._turning = true;
    expect(ruleFor(S, tc, car)).toBe(true);
    const tc2 = crossDriver(S, -1, 3, 9, 'left'); S.signal.type = 'stop';
    expect(RR.rrTurnerHasJunction(S.world, [tc2], tc2, S.signal, car)).toBe(true);
  });

  it('the real updateTraffic: the oncoming turner Ride-Along no longer stops for waits, and turns only when the learner is past or has the gap', () => {
    const S = setup();
    const intent = crossIntent(-1);
    const len = RR.vehicleFootprint('car').length;
    const need = RR.rrTurnAcrossClearSeconds('car', 'main', -1, intent);
    const ai = Object.assign(pose(S.world, S.st + 40, S.lane, -1), { id: 'o', type: 'car', speed: 11, laneOffset: S.lane, _roadStation: S.st + 40,
      personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 }, _turnIntent: intent, _turnSignal: S.signal, _turnSignalSeen: S.signal });
    let learnerSt = S.st - 75; const v = 15;
    const car = learnerAt(S, 75, v);
    const time = { current: 30 };
    const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4, trafficRef: { current: [ai] }, infiniteWorldRef: { current: S.world },
      currentScenario: { id: 'night', speedLimit: 40, weather: 'clear', traffic: 'medium' }, currentVehicle: { id: 'sedan' }, carRef: { current: car },
      pedsRef: { current: [] }, signalsRef: { current: [S.signal] }, cyclistsRef: { current: [] }, emergencyRef: { current: null },
      statsRef: { current: { safetyScore: 100, crashes: 0 } }, timeRef: time, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
      blackBoxRef: { current: [] }, addToast() {}, speak() {}, audioRef: { current: {} }, eventToastRef: { current: null } };
    const update = new Function('scope', 'with(scope) {' + cut('        var updateTraffic = function(dt) {', '        var updateWildlife = function(dt)') + '\nreturn updateTraffic;}')(scope);
    const real = Math.random; Math.random = seeded(5);
    let turnedAt = null, learnerToCentreAtTurn = null, ruleFalseFrames = 0;
    try {
      for (let i = 0; i < 160 && turnedAt == null; i++) {
        // the learner holds its speed through the junction (Ride-Along did not stop for this turner)
        if (ai._turnIntent && !ai._turning && !RR.rrTurnerHasJunction(S.world, [ai], ai, S.signal, car)) ruleFalseFrames++;
        time.current += 0.1; learnerSt += v * 0.1; Object.assign(car, pose(S.world, learnerSt, -S.lane, 1), { speed: v });
        update(0.1);
        if (ai._turning) { turnedAt = time.current; learnerToCentreAtTurn = S.st - (learnerSt + len / 2); }
      }
    } finally { Math.random = real; }
    expect(ruleFalseFrames).toBeGreaterThan(5);
    expect(turnedAt, 'the AI never turned').not.toBe(null);
    // it turned only once the learner was past the junction box or still at least its gap away
    const pastBox = learnerToCentreAtTurn <= -3.25;
    const gapSeconds = learnerToCentreAtTurn / v;
    expect(pastBox || gapSeconds >= need, JSON.stringify({ learnerToCentreAtTurn, gapSeconds, need })).toBe(true);
  });
});
