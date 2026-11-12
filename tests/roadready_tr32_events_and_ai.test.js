import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 32, traffic lane (tr32):
//  item 3: a lane departure is a scored event, once per departure, with its duration, and has a coaching card;
//  item 4: AI drivers keep the taught following gap behind the learner, and the learner is part of the order of arrival;
//  item 5: the dashboard cue stored with an event is the cue for that kind of event.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const cut = (from, to) => {
  const a = src.indexOf(from), b = src.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error('cannot find ' + from);
  return src.slice(a, b);
};
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});
const freshStats = () => ({ current: { startTime: Date.now(), simTime: 0, distance: 0, safetyScore: 100, driveEvents: [], _lastEvent: {} } });
const stamp = (statsRef, t, cueKey) => { statsRef.current.simTime = t; RR.rrStampDriveContext(statsRef.current, { x: 48, y: 50, heading: -Math.PI / 2, speed: 9 }, 0.72, 25, cueKey, 0.1, null); };

describe('Road Ready tr32 item 3: lane departure is one scored event per departure', () => {
  it('rrLaneDepartureStep: a brush with the line is nothing; 0.7 s records once; it extends; a new one needs 1 s back in lane', () => {
    const state = {};
    const out = [];
    const run = (side, seconds) => { for (let t = 0; t < seconds - 1e-9; t += 0.1) out.push(RR.rrLaneDepartureStep(state, side, 0.1)); };
    run('left', 0.4); run(null, 1.2); // a brush: 0.4 s
    expect(out.filter(Boolean)).toEqual([]);
    out.length = 0; run('left', 3.0);
    expect(out.filter((x) => x === 'record').length).toBe(1);
    expect(out.indexOf('record')).toBe(6); // the 7th frame: 0.7 s
    expect(out.slice(7).every((x) => x === 'extend')).toBe(true);
    out.length = 0; run(null, 0.5); run('left', 1.0); // back in lane for only 0.5 s: the same departure goes on
    expect(out.filter((x) => x === 'record').length).toBe(0);
    out.length = 0; run(null, 1.1); run('right', 1.0); // back for 1.1 s: a new departure
    expect(out.filter((x) => x === 'record').length).toBe(1);
    expect(state.side).toBe('right');
    expect(RR.RR_LANE_DEPARTURE_MIN_SECONDS).toBe(0.7);
    expect(RR.RR_LANE_DEPARTURE_POINTS).toBe(3);
  });

  it('the drive loop scores it through rrScoredEvent, small, with side, line and duration; never twice with "wrong side"', () => {
    const block = cut('          // tr32: a lane departure the dashboard warned about is a scored event', '          // MPG history for sparkline');
    expect(block).toContain('statsRef.current.safetyScore -= RR_LANE_DEPARTURE_POINTS;');
    expect(block).toContain("ldState.event = rrScoredEvent(statsRef, 'laneDeparture', 1, RR_LANE_DEPARTURE_POINTS,");
    // run the block: 4 s over the centre line at 25 mph, then back
    const statsRef = freshStats();
    const world = { profile: { roadHalfWidth: 3.5 }, getChunk: () => ({ roadHalfWidth: 3.5 }), spline: { centerAt: () => 48, headingAt: () => 0 } };
    const scope = { ...RR, statsRef, laneChangeRef: { current: {} }, laneDepartureRef: { current: { side: null } }, emergencyRef: { current: null },
      timeRef: { current: 10 }, scn: { id: 'residential' }, infiniteWorldRef: { current: world }, car: { x: 48.1, y: 50, heading: -Math.PI / 2, speed: 11 }, dt: 0.1 };
    const frame = new Function('scope', 'with(scope) {' + block + '}');
    const drive = (side, seconds) => { for (let t = 0; t < seconds - 1e-9; t += 0.1) { scope.laneDepartureRef.current.side = side; scope.timeRef.current += 0.1; stamp(statsRef, scope.timeRef.current, side ? 'urgent:RETURN TO LANE' : 'good:SAFE BUFFER'); frame(scope); } };
    drive(null, 1); drive('left', 0.3); drive(null, 2); // a brush
    expect(statsRef.current.driveEvents).toEqual([]);
    expect(statsRef.current.safetyScore).toBe(100);
    drive('left', 4); drive(null, 2);
    expect(statsRef.current.driveEvents.length).toBe(1);
    const ev = statsRef.current.driveEvents[0];
    expect(ev.type).toBe('laneDeparture');
    expect(ev.points).toBe(3);
    expect(ev.side).toBe('left');
    expect(ev.line).toBe('center'); // travelling toward smaller stations, the left side is the centre line
    expect(ev.durationSec).toBeGreaterThan(3.8);
    expect(ev.durationSec).toBeLessThan(4.2);
    expect(ev.cue).toBe('RETURN TO LANE');
    expect(statsRef.current.safetyScore).toBe(97);
    expect(statsRef.current.laneDepartures).toBe(1);
    drive('right', 2); drive(null, 2);
    expect(statsRef.current.driveEvents.map((e) => e.type + ':' + e.line)).toEqual(['laneDeparture:center', 'laneDeparture:edge']);
    // a departure that becomes "wrong side" is charged once, as wrong side
    drive('left', 1);
    statsRef.current.safetyScore -= 15; RR.rrScoredEvent(statsRef, 'wrongSide', 3, 15);
    const before = statsRef.current.safetyScore;
    drive('left', 1);
    const third = statsRef.current.driveEvents.filter((e) => e.type === 'laneDeparture')[2];
    expect(third.points).toBe(0);
    expect(third.partOf).toBe('wrongSide');
    expect(statsRef.current.safetyScore).toBe(before + 3);
    // pulling over for an emergency vehicle is not a departure
    drive(null, 2);
    scope.emergencyRef.current = { life: 10 };
    drive('right', 3);
    expect(statsRef.current.driveEvents.filter((e) => e.type === 'laneDeparture').length).toBe(3);
  });

  it('the coaching card is in plain words, through the translator, and belongs to the "lane" habit', () => {
    expect(RR.rrEventFamily('laneDeparture')).toBe('lane');
    const centre = RR.rrCoachCardFor({ type: 'laneDeparture', t: 42, points: 3, durationSec: 2.6, line: 'center', distM: 300 }, { scenarioId: 'residential' });
    expect(centre.title).toBe('Drifted out of your lane');
    expect(centre.what).toBe('The car went over the center line for about 3 seconds. The turn signal was off.');
    expect(centre.cue).toBe('The yellow center line is the left edge of your lane.');
    expect(centre.next).toBe('Look far ahead at the middle of your lane. Signal first when you mean to move over.');
    expect(centre.points).toBe(3);
    const edge = RR.rrCoachCardFor({ type: 'laneDeparture', t: 42, points: 3, durationSec: 0.8, line: 'edge' }, {});
    expect(edge.what).toBe('The car went over the white edge line for about 1 seconds. The turn signal was off.');
    for (const text of [centre.title, centre.what, centre.cue, centre.next, edge.what, edge.cue]) {
      expect(text).not.toMatch(/laneDeparture|undefined|\{/);
      for (const sentence of text.split(/(?<=[.!?])\s+/)) expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(16);
    }
    for (const key of ['tr32_lanedep_title', 'tr32_lanedep_what_center', 'tr32_lanedep_what_edge', 'tr32_lanedep_cue_center', 'tr32_lanedep_cue_edge', 'tr32_lanedep_next']) {
      expect(src).toContain("T('stem.roadready." + key + "', '");
    }
  });
});

describe('Road Ready tr32 item 5: the cue stored with an event is the cue for that kind of event', () => {
  it('a tailgate while "STOP AHEAD" is on top stores no stop cue; it stores the following cue when that was shown in the last 6 s', () => {
    const statsRef = freshStats();
    stamp(statsRef, 10, 'urgent:STOP AHEAD');
    const a = RR.pushDriveEvent(statsRef, 'tailgate', 20, 0.72, 25, 2, { leadDistanceFt: 30, safeFeet: 117 });
    expect(a.cue).toBeUndefined();
    stamp(statsRef, 12, 'caution:ADD FOLLOWING SPACE');
    stamp(statsRef, 13, 'urgent:STOP AHEAD'); // the stop sign takes the dashboard over again
    stamp(statsRef, 15, 'urgent:STOP AHEAD');
    const b = RR.pushDriveEvent(statsRef, 'tailgate', 20, 0.72, 25, 2, {});
    expect(b.cue).toBe('ADD FOLLOWING SPACE');
    stamp(statsRef, 25, 'urgent:STOP AHEAD');
    expect(RR.pushDriveEvent(statsRef, 'tailgate', 20, 0.72, 25, 2, {}).cue).toBeUndefined(); // 13 s ago: too old
  });

  it('stop events keep the stop cue; speeding keeps the speed cue; events with no cue of their own store none', () => {
    const statsRef = freshStats();
    stamp(statsRef, 10, 'urgent:STOP AHEAD');
    expect(RR.rrScoredEvent(statsRef, 'rollingStop', 3, 20).cue).toBe('STOP AHEAD');
    expect(RR.rrScoredEvent(statsRef, 'redLight', 3, 25).cue).toBe('STOP AHEAD');
    expect(RR.rrScoredEvent(statsRef, 'cyclistClose', 2, 10).cue).toBeUndefined();
    expect(RR.rrScoredEvent(statsRef, 'pedNoYield', 3, 20).cue).toBeUndefined();
    expect(RR.rrScoredEvent(statsRef, 'speedViolation', 2, 0).cue).toBeUndefined();
    stamp(statsRef, 13, 'urgent:SLOW DOWN'); // (an unscored event repeats only after 1.5 s)
    expect(RR.rrScoredEvent(statsRef, 'speedViolation', 2, 0).cue).toBe('SLOW DOWN');
    expect(RR.rrScoredEvent(statsRef, 'crash', 3, 25, { into: 'vehicle' }).cue).toBe('SLOW DOWN');
    expect(RR.rrScoredEvent(statsRef, 'crash', 3, 25, { into: 'wall' }).cue).toBeUndefined();
    // every title in the table is a title the dashboard can show
    const titles = new Set();
    [{ signalState: 'red' }, { signalState: 'red', signalDistanceFt: 3, speedMph: 0 }, { signalState: 'stop', signalDistanceFt: 3, speedMph: 0 }, { signalState: 'yellow' }, { gapSeconds: 1, requiredGapSeconds: 4 },
      { speedMph: 40, limitMph: 25 }, { speedMph: 30, limitMph: 25 }, { laneSide: 'left' }].forEach((input) => titles.add(RR.rrRuleCueFor(input).title));
    Object.keys(RR.RR_EVENT_CUE_TITLES).forEach((family) => RR.RR_EVENT_CUE_TITLES[family].forEach((title) => expect(titles.has(title), title).toBe(true)));
  });

  it('a tailgate event carries the vehicle ahead and the gap the dashboard was showing; a stop event carries the signal', () => {
    const statsRef = freshStats();
    stamp(statsRef, 20, 'urgent:STOP AHEAD');
    RR.rrStampCueFacts(statsRef.current, 1.44, 4, { type: 'pickup' }, 'stop');
    const tail = RR.pushDriveEvent(statsRef, 'tailgate', 22, 0.72, 25, 2, { leadDistanceFt: 46, safeFeet: 129 });
    expect(tail.leadType).toBe('pickup');
    expect(tail.gapSec).toBe(1.4);
    expect(tail.needGapSec).toBe(4);
    const card = RR.rrCoachCardFor(tail, { scenarioId: 'residential' });
    expect(card.cue).toBe('The pickup truck ahead was 1.4 seconds in front of you. A safe gap here is 4 seconds.');
    expect(card.cue).not.toContain('STOP AHEAD');
    const roll = RR.rrScoredEvent(statsRef, 'rollingStop', 3, 20, { n: 1 });
    expect(roll.signal).toBe('stop');
    expect(roll.leadType).toBeUndefined();
    expect(RR.rrCoachCardFor(roll, {}).cue).toContain('Just before this, the dashboard said: STOP AHEAD.');
    // stale facts (the HUD has not drawn for over a second) are not used
    statsRef.current.simTime = 23;
    expect(RR.pushDriveEvent(statsRef, 'tailgate', 22, 0.72, 25, 2, {}).leadType).toBeUndefined();
    for (const type of ['car', 'truck', 'suv', 'van', 'schoolbus', 'pickup']) expect(RR.rrLeadVehicleWord(type)).toMatch(/^[A-Za-z ]+$/);
    expect(src).toContain('rrStampCueFacts(statsRef.current, hudGapSeconds, hudRequiredGap, hudClosestAhead, hudSignalState);');
  });
});

describe('Road Ready tr32 item 4: AI drivers and the learner', () => {
  it('trafficHeadwaySpeed: an AI driver settles at the taught gap behind the learner (never less), and stops 2.5 m behind a stopped car', () => {
    for (const weather of ['clear', 'rain', 'snow']) {
      // follower starts 12 m behind a leader doing 10 m/s; step the tool's rule with its own 0.5 s speed smoothing
      let gap = 12, v = 13;
      for (let i = 0; i < 60 * 60; i++) {
        const dt = 1 / 60;
        const target = Math.min(13, RR.trafficHeadwaySpeed(gap, 10, v, weather, 0.9));
        v += (target - v) * (1 - Math.exp(-dt / 0.5));
        gap += (10 - v) * dt;
      }
      expect(gap, weather).toBeGreaterThan(0);
      expect(gap / v, weather).toBeGreaterThanOrEqual(RR.recommendedFollowingMeters(v, weather, 1) / v - 0.05);
      expect(RR.recommendedFollowingMeters(10, weather, 1) / 10).toBeGreaterThanOrEqual(4);
    }
    expect(RR.trafficHeadwaySpeed(2.5, 0, 0, 'clear', 1)).toBe(0);
    expect(RR.trafficHeadwaySpeed(60, 10, 10, 'clear', 1)).toBeGreaterThan(10); // plenty of room: no cap
    expect(RR.trafficHeadwaySpeed(20, 10, 10, 'clear', 0.5)).toBe(RR.trafficHeadwaySpeed(20, 10, 10, 'clear', 1)); // a pushy driver gets no discount
  });

  it('the real updateTraffic: an AI car that catches the learner stays 4 seconds back (it closed to a car length before)', () => {
    const make = new Function('scope', 'with(scope) {' + cut('        var updateTraffic = function(dt) {', '        var updateWildlife = function(dt)') + '\nreturn updateTraffic;}');
    const profile = { roadHalfWidth: 3.5, lanes: 2 };
    const world = { profile, chunks: {}, getChunk: () => profile, spline: { centerAt: () => 48, headingAt: () => 0, heightAt: () => 0 } };
    const car = { x: 49.6, y: 1000, heading: -Math.PI / 2, speed: 8 };
    const ai = { x: 49.6, y: 1030, heading: -Math.PI / 2, type: 'car', id: 'behind', laneOffset: 1.6, speed: 13, _roadStation: 1030, personality: { followMult: 0.9, speedBias: 1, aggro: 0.7, rollsStops: 0 } };
    const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4, trafficRef: { current: [ai] }, infiniteWorldRef: { current: world }, currentScenario: { id: 'rural', speedLimit: 35, weather: 'clear' },
      currentVehicle: { id: 'sedan' }, carRef: { current: car }, pedsRef: { current: [] }, signalsRef: { current: [] }, cyclistsRef: { current: [] }, emergencyRef: { current: null },
      statsRef: { current: { safetyScore: 100, crashes: 0, hardBrakes: 0 } }, timeRef: { current: 30 }, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
      blackBoxRef: { current: [] }, addToast() {}, speak() {}, audioRef: { current: {} }, eventToastRef: { current: null } };
    const update = make(scope);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    let minSeconds = Infinity, lastSeconds = null;
    try {
      for (let i = 0; i < 40 * 30; i++) {
        car.y -= car.speed / 30; scope.timeRef.current += 1 / 30;
        update(1 / 30);
        const gap = (ai.y - car.y) - 4.5;
        if (ai.speed > 3) { lastSeconds = gap / ai.speed; minSeconds = Math.min(minSeconds, lastSeconds); }
      }
    } finally { random.mockRestore(); }
    expect(minSeconds).toBeGreaterThan(1.8); // it starts 30 m back at 13 m/s (2 s) and must not close further
    expect(lastSeconds).toBeGreaterThanOrEqual(3.7);
    expect(Math.abs(ai.speed - 8)).toBeLessThan(0.8); // it matched the learner's speed
  });

  it('order of arrival includes the learner: an AI driver who stopped later waits; the learner is not waited for for ever', () => {
    expect(RR.rrLearnerHasStopSignPriority(10, 11, 12)).toBe(true); // learner stopped at 10, AI at 11
    expect(RR.rrLearnerHasStopSignPriority(10, 10, 12)).toBe(true); // together: the learner goes
    expect(RR.rrLearnerHasStopSignPriority(11, 10, 12)).toBe(false); // AI was first
    expect(RR.rrLearnerHasStopSignPriority(null, 10, 12)).toBe(false); // learner has not stopped at the line
    expect(RR.rrLearnerHasStopSignPriority(10, 11, 10 + RR.RR_STOP_ORDER_PATIENCE_SECONDS + 0.1)).toBe(false);
    expect(RR.RR_STOP_ORDER_PATIENCE_SECONDS).toBe(8);
    const traffic = cut('        var updateTraffic = function(dt) {', '        var updateWildlife = function(dt)');
    expect(traffic).toContain('if (rrLearnerHasStopSignPriority(activeStopSign._playerArrivedAt, t._stopArrivedAt, timeRef.current)) {');
    const check = cut('        var checkSignalCompliance = function() {', '        var updatePeds = function(dt) {');
    expect(check).toContain('if (s._playerArrivedAt == null) s._playerArrivedAt = timeRef.current;');
    expect(check).toContain('s._playerArrivedAt = null;');
  });

  it('the real updateTraffic at a stop sign: the AI car that arrived after the learner stays put until the learner has gone', () => {
    const make = new Function('scope', 'with(scope) {' + cut('        var updateTraffic = function(dt) {', '        var updateWildlife = function(dt)') + '\nreturn updateTraffic;}');
    const run = (learnerArrivedAt) => {
      const profile = { roadHalfWidth: 3.5, lanes: 2 };
      const world = { profile, chunks: {}, getChunk: () => profile, spline: { centerAt: () => 48, headingAt: () => 0, heightAt: () => 0 } };
      const sign = { x: 48, y: 50, type: 'stop', state: 'stop', _chunk: 1, _playerArrivedAt: learnerArrivedAt };
      // oncoming AI car (travelling toward larger stations) 20 m before its stop line
      const ai = { ...RR.mainRoadWorldPoint(world, 50 - 4.1 - 2.25 - 20, -1.6), heading: Math.PI / 2, type: 'car', id: 'oncoming', laneOffset: -1.6, speed: 8, personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 } };
      const car = { ...RR.mainRoadWorldPoint(world, 50 + 4.1 + 2.5, 1.6), heading: -Math.PI / 2, speed: 0 }; // the learner, stopped at the line
      const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4, trafficRef: { current: [ai] }, infiniteWorldRef: { current: world }, currentScenario: { id: 'residential', speedLimit: 25, weather: 'clear' },
        currentVehicle: { id: 'sedan' }, carRef: { current: car }, pedsRef: { current: [] }, signalsRef: { current: [sign] }, cyclistsRef: { current: [] }, emergencyRef: { current: null },
        statsRef: { current: { safetyScore: 100, crashes: 0, hardBrakes: 0 } }, timeRef: { current: 20 }, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
        blackBoxRef: { current: [] }, addToast() {}, speak() {}, audioRef: { current: {} }, eventToastRef: { current: null } };
      const update = make(scope);
      const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      let arrived = null, released = null;
      try {
        for (let i = 0; i < 20 * 30; i++) {
          scope.timeRef.current += 1 / 30; update(1 / 30);
          if (arrived == null && ai._stopArrivedAt) arrived = ai._stopArrivedAt;
          if (released == null && ai._stopReleasedAt) released = ai._stopReleasedAt;
        }
      } finally { random.mockRestore(); }
      return { arrived, released };
    };
    const noLearner = run(null);
    expect(noLearner.arrived).not.toBeNull();
    expect(noLearner.released - noLearner.arrived).toBeLessThan(3.5); // its own wait only
    const learnerFirst = run(20.5); // the learner was stopped at the line before the AI car got there
    expect(learnerFirst.arrived).toBeGreaterThan(20.5);
    // it goes only when the learner's 8 seconds are up (the learner in this run never moves)
    expect(learnerFirst.released).toBeGreaterThanOrEqual(20.5 + RR.RR_STOP_ORDER_PATIENCE_SECONDS - 0.05);
    expect(learnerFirst.released).toBeLessThan(20.5 + RR.RR_STOP_ORDER_PATIENCE_SECONDS + 1.5);
  });
});
