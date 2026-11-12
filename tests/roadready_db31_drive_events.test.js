import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 31, debrief lane (db31), item 1. In a 60 s residential drive the live alerts were three
// rolling stops (-20 each), one vehicle collision (-25) and two fender benders (-10 each), but the
// drive's event list held only 2 tailgates and 7 hard brakes: the coaching view had no card for
// any of them and "Next focus" was "Brake earlier" (chosen by count). Every scoring site now
// records an event with type, time, place, speed, severity and points; "Next focus" is ranked by
// points x recency; the 60-event cap drops the cheapest event, not the oldest.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

const newStats = (over) => Object.assign({ simTime: 0, distance: 0, safetyScore: 100, driveEvents: [], _lastEvent: {} }, over || {});

describe('Road Ready db31: every place that takes safety points records a drive event', () => {
  it('each safety deduction in the drive loop has a recorder beside it (completeness gate)', () => {
    const lines = src.split('\n');
    const deduction = /statsRef\.current\.safetyScore\s*(-=|=\s*Math\.max\(0,\s*statsRef\.current\.safetyScore\s*-)/;
    const recorder = /pushDriveEvent\(statsRef|rrScoredEvent\(statsRef|rrDriveEventSpan\(statsRef/;
    const missing = [];
    let count = 0;
    lines.forEach((line, i) => {
      if (!deduction.test(line)) return;
      count++;
      // the vehicle-collision chain (-2 / -40 / -25 / -10) shares one recorder just below it
      const near = lines.slice(Math.max(0, i - 9), i + 22).join('\n');
      if (!recorder.test(near)) missing.push((i + 1) + ': ' + line.trim().slice(0, 90));
    });
    expect(count).toBeGreaterThanOrEqual(38); // the scan is looking at the real sites
    expect(missing).toEqual([]);
  });

  it('the sites named in the play-through and the brief record these types', () => {
    for (const type of ['rollingStop', 'redLight', 'flaggerStop', 'pedNoYield', 'pedestrianStruck', 'childStruck', 'schoolBusPass',
      'emergencyNoYield', 'emergencyNoPullRight', 'emergencyVehicleStruck', 'wrongSide', 'wrongWay', 'noSignal', 'riderStruck',
      'cyclistClose', 'animalStruck', 'ballStruck', 'trainCollision', 'railroadGate', 'railroadBusStop', 'rearEndedBrakeCheck',
      'rearEndedByOther', 'skidLoss', 'hitWhileStopped']) {
      expect(src, type).toMatch(new RegExp("rrScoredEvent\\(statsRef, [^;]*'" + type + "'"));
    }
    // a vehicle collision records its points and the closing speed
    expect(src).toContain("trafficImpactAttribution === 'road_user' ? 2 : impactSpeed > 30 ? 40 : impactSpeed > 10 ? 25 : 10,");
    expect(src).toContain("{ into: 'vehicle', closing: true, speedMph: impactSpeed });");
    // the rolling stop knows which stop sign it was
    expect(src).toContain("rrScoredEvent(statsRef, 'rollingStop', 3, 20, { n: (statsRef.current.stops || 0) + statsRef.current.rollingStops });");
    // spans: speeding, tailgating and skidding are one event with a duration
    expect(src).toContain("rrDriveEventSpan(statsRef, 'speedViolation', dt, speedMph);");
    expect(src).toContain("rrDriveEventSpan(statsRef, 'tailgate', scoringDt);");
    expect(src).toContain("rrDriveEventSpan(statsRef, 'skidLoss', dt);");
    // the context is stamped once per frame, from the live car, limit and dashboard cue
    expect(src).toContain('rrStampDriveContext(statsRef.current, carRef.current, frictionCoef(currentScenario.weather), currentScenario.speedLimit,');
  });

  it('a scored event carries type, time, place, speed, severity, points and the cue shown before it', () => {
    const stats = newStats({ simTime: 13.4, distance: 61 });
    const statsRef = { current: stats };
    RR.rrStampDriveContext(stats, { x: 49.1, y: 26.3, heading: -1.57, speed: 2.4 }, 0.72, 25, 'urgent:STOP AHEAD', 0.1, null);
    stats.stops = 1; stats.rollingStops = 1;
    const ev = RR.rrScoredEvent(statsRef, 'rollingStop', 3, 20, { n: 2 });
    expect(ev).toMatchObject({ type: 'rollingStop', t: 13.4, severity: 3, points: 20, n: 2, x: 49.1, y: 26.3, distM: 61, mu: 0.72, postedLimitMph: 25, cue: 'STOP AHEAD' });
    expect(ev.speedMph).toBe(Math.round(2.4 * RR.MS_TO_MPH));
    expect(ev.quiet).toBeUndefined();
    expect(stats.driveEvents).toHaveLength(1);
    // the frame context never reaches a JSON copy of the stats (it holds the live world)
    expect(Object.keys(stats)).not.toContain('_evCtx');
    expect(JSON.stringify(stats)).not.toContain('_evCtx');
  });

  it('a cue that ended a few seconds ago still counts as "what came before"; an old one does not', () => {
    const stats = newStats({ simTime: 10 });
    const car = { x: 1, y: 2, heading: 0, speed: 9 };
    RR.rrStampDriveContext(stats, car, 0.72, 25, 'urgent:ADD FOLLOWING SPACE', 0.1, null);
    stats.simTime = 12;
    RR.rrStampDriveContext(stats, car, 0.72, 25, 'good:SAFE BUFFER', 0.1, null);
    stats.simTime = 15;
    expect(RR.rrScoredEvent({ current: stats }, 'crash', 3, 25, { into: 'vehicle' }).cue).toBe('ADD FOLLOWING SPACE');
    stats.simTime = 40;
    RR.rrStampDriveContext(stats, car, 0.72, 25, 'good:SAFE BUFFER', 0.1, null);
    expect(RR.rrScoredEvent({ current: stats }, 'crash', 2, 10, { into: 'vehicle' }).cue).toBeUndefined();
  });

  it('scored events are never debounced away; unscored repeats still are', () => {
    const stats = newStats({ simTime: 5 });
    const statsRef = { current: stats };
    RR.rrScoredEvent(statsRef, 'crash', 2, 10, { into: 'vehicle' });
    stats.simTime = 5.4;
    RR.rrScoredEvent(statsRef, 'crash', 3, 25, { into: 'vehicle' });
    expect(stats.driveEvents.map((e) => e.points)).toEqual([10, 25]);
    RR.pushDriveEvent(statsRef, 'hardBrake', 20, 0.72, 25, 2);
    stats.simTime = 5.9;
    RR.pushDriveEvent(statsRef, 'hardBrake', 18, 0.72, 25, 2);
    expect(stats.driveEvents.filter((e) => e.type === 'hardBrake')).toHaveLength(1);
  });

  it('the 60-event cap drops the cheapest old event, so hard brakes cannot push out a collision', () => {
    const stats = newStats();
    const statsRef = { current: stats };
    stats.simTime = 1;
    RR.rrScoredEvent(statsRef, 'crash', 3, 25, { into: 'vehicle' });
    stats.simTime = 3;
    RR.rrScoredEvent(statsRef, 'rollingStop', 3, 20, { n: 1 });
    for (let i = 0; i < 80; i++) { stats.simTime = 10 + i * 2; RR.pushDriveEvent(statsRef, 'hardBrake', 20, 0.72, 25, 2); }
    expect(stats.driveEvents).toHaveLength(60);
    expect(stats.driveEvents.filter((e) => e.type === 'crash')).toHaveLength(1);
    expect(stats.driveEvents.filter((e) => e.type === 'rollingStop')).toHaveLength(1);
    // the newest hard brake is kept, the oldest ones went
    const brakes = stats.driveEvents.filter((e) => e.type === 'hardBrake');
    expect(brakes[brakes.length - 1].t).toBe(10 + 79 * 2);
    expect(brakes[0].t).toBeGreaterThan(10);
  });

  it('a span has one event with its duration and peak speed', () => {
    const stats = newStats({ simTime: 20 });
    const statsRef = { current: stats };
    RR.pushDriveEvent(statsRef, 'speedViolation', 34, 0.72, 25, 2);
    for (let i = 0; i < 50; i++) RR.rrDriveEventSpan(statsRef, 'speedViolation', 0.1, 34 + i * 0.1);
    expect(stats.driveEvents).toHaveLength(1);
    expect(stats.driveEvents[0].durationSec).toBeCloseTo(5, 1);
    expect(stats.driveEvents[0].peakMph).toBe(39);
    // no event yet: a span call does nothing
    RR.rrDriveEventSpan(statsRef, 'tailgate', 0.1);
    expect(stats.driveEvents).toHaveLength(1);
  });

  it('moving time only counts while the car moves', () => {
    const stats = newStats();
    for (let i = 0; i < 100; i++) RR.rrStampDriveContext(stats, { x: 0, y: 0, heading: 0, speed: i < 40 ? 0 : 5 }, 0.72, 25, null, 0.1, null);
    expect(stats.movingSeconds).toBeCloseTo(6, 5);
  });
});

describe('Road Ready db31: the live collision check records the crash and the following gap', () => {
  let makeChecker;
  beforeAll(() => {
    const start = src.indexOf('        var checkCollisions = function');
    const end = src.indexOf('        var threeReady =', start);
    makeChecker = new Function('scope', 'with (scope) { ' + src.slice(start, end) + '\nreturn checkCollisions; }');
  });
  function fixture(gap, leadSpeed) {
    const car = { x: 0, y: 0, heading: Math.PI / 2, speed: 10 };
    const lead = { x: 0, y: gap, heading: Math.PI / 2, speed: leadSpeed, type: 'car', id: 'lead' };
    const stats = newStats({ closeFollows: 0, crashes: 0 });
    const scope = { ...RR, currentVehicle: { id: 'sedan', mass: 1500 }, currentScenario: { id: 'residential', weather: 'clear', speedLimit: 25 },
      carRef: { current: car }, trafficRef: { current: [lead] }, pedsRef: { current: [] }, emergencyRef: { current: null },
      infiniteWorldRef: { current: null }, statsRef: { current: stats }, timeRef: { current: 10 }, crashFxRef: { current: [] },
      addToast: () => {}, showDriveAlert: () => {} };
    return { car, lead, stats, scope, check: makeChecker(scope) };
  }

  it('following about 1 s behind for 12 s fills the "less than 2 seconds" band and records one tailgate span', () => {
    const f = fixture(15, 10); // about 10 m of clear space at 10 m/s
    for (let i = 0; i < 120; i++) { f.scope.timeRef.current += 0.1; f.stats.simTime += 0.1; f.check(0.1); }
    expect(f.stats.gapSeconds).toHaveLength(4);
    const total = f.stats.gapSeconds.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(12, 1);
    const best = f.stats.gapSeconds.indexOf(Math.max(...f.stats.gapSeconds));
    expect(best).toBe(0);
    const tailgates = f.stats.driveEvents.filter((e) => e.type === 'tailgate');
    expect(tailgates).toHaveLength(1);
    expect(tailgates[0].durationSec).toBeGreaterThan(10);
  });

  it('running into the car ahead records a crash with its points and closing speed', () => {
    const f = fixture(4.6, 0); // lead stopped just ahead, closing at 10 m/s
    for (let i = 0; i < 10 && !f.stats.crashes; i++) { f.scope.timeRef.current += 0.05; f.stats.simTime += 0.05; f.car.y += 0.3; f.check(0.05); }
    expect(f.stats.crashes).toBe(1);
    const crash = f.stats.driveEvents.find((e) => e.type === 'crash');
    expect(crash).toBeTruthy();
    expect(crash.into).toBe('vehicle');
    expect(crash.closing).toBe(true);
    expect(RR.rrCoachCardFor(crash).what).toContain('The speed difference was about ' + crash.speedMph + ' mph.');
    expect(RR.rrCoachCardFor({ type: 'crash', into: 'vehicle', speedMph: 12 }).what).toBe('The car hit another vehicle at about 12 mph.');
    expect([10, 25, 40]).toContain(crash.points);
    expect(100 - f.stats.safetyScore).toBeGreaterThanOrEqual(crash.points);
    expect(crash.speedMph).toBeGreaterThan(5);
  });
});

describe('Road Ready db31: "Next focus" is chosen by points x recency, not by count', () => {
  // The reviewer's drive (res_r8_residential_good.json): alerts and times as logged there.
  const r8 = () => [
    { type: 'tailgate', t: 9.7, speedMph: 19, mu: 0.72, postedLimitMph: 25, severity: 2, leadDistanceFt: 42, safeFeet: 85 },
    { type: 'hardBrake', t: 10.0, speedMph: 18, mu: 0.72, postedLimitMph: 25, severity: 3 },
    { type: 'crash', t: 11.6, speedMph: 14, mu: 0.72, postedLimitMph: 25, severity: 3, points: 25, into: 'vehicle' },
    { type: 'hardBrake', t: 12.6, speedMph: 10, mu: 0.72, postedLimitMph: 25, severity: 3 },
    { type: 'rollingStop', t: 13.4, speedMph: 4, mu: 0.72, postedLimitMph: 25, severity: 3, points: 20, n: 1 },
    { type: 'hardBrake', t: 26.2, speedMph: 18, mu: 0.72, postedLimitMph: 25, severity: 3 },
    { type: 'hardBrake', t: 28.4, speedMph: 10, mu: 0.72, postedLimitMph: 25, severity: 3 },
    { type: 'rollingStop', t: 29.5, speedMph: 3, mu: 0.72, postedLimitMph: 25, severity: 3, points: 20, n: 2 },
    { type: 'hardBrake', t: 30.0, speedMph: 3, mu: 0.72, postedLimitMph: 25, severity: 3 },
    { type: 'tailgate', t: 43.3, speedMph: 20, mu: 0.72, postedLimitMph: 25, severity: 2, leadDistanceFt: 43, safeFeet: 87 },
    { type: 'hardBrake', t: 43.6, speedMph: 18, mu: 0.72, postedLimitMph: 25, severity: 3 },
    { type: 'crash', t: 45.6, speedMph: 6, mu: 0.72, postedLimitMph: 25, severity: 2, points: 10, into: 'vehicle' },
    { type: 'hardBrake', t: 46.4, speedMph: 8, mu: 0.72, postedLimitMph: 25, severity: 3 },
    { type: 'rollingStop', t: 46.9, speedMph: 4, mu: 0.72, postedLimitMph: 25, severity: 3, points: 20, n: 3 },
    { type: 'crash', t: 51.3, speedMph: 5, mu: 0.72, postedLimitMph: 25, severity: 2, points: 10, into: 'vehicle' },
  ];

  it('the 60 s mission: first the rolling stops, then the collisions; hard braking (7 of 15 events) is not first', () => {
    const focus = RR.rrPracticeFocusFor(r8(), 4);
    expect(focus.map((f) => f.type)).toEqual(['stop', 'crash', 'tailgate', 'hardBrake']);
    expect(focus[0].label).toBe('Stop all the way');
    expect(focus[0].count).toBe(3);
    expect(focus[0].points).toBe(20);
    expect(focus[3].count).toBe(7);
    // base behaviour, for the record: by count this list started with hardBrake
  });

  it('recency: the same event later in the drive outranks an earlier, slightly costlier one', () => {
    const early = { type: 'crash', t: 5, severity: 3, points: 25, into: 'vehicle' };
    const late = { type: 'rollingStop', t: 55, severity: 3, points: 20, n: 1 };
    expect(RR.rrPracticeFocusFor([early, late], 1)[0].type).toBe('stop');
    // with equal timing the costlier one wins
    expect(RR.rrPracticeFocusFor([Object.assign({}, early, { t: 55 }), late], 1)[0].type).toBe('crash');
  });

  it('a collision with another vehicle is coached as a space problem; a wall crash keeps the turn advice', () => {
    const car = RR.rrPracticeFocusFor([{ type: 'crash', t: 10, severity: 3, points: 25, into: 'vehicle' }], 1)[0];
    expect(car.rule).toBe('Leave a 4-second gap and slow down early.');
    expect(car.advice).toContain('Stay 4 seconds behind the car ahead.');
    const wall = RR.rrPracticeFocusFor([{ type: 'crash', t: 10, severity: 3 }], 1)[0];
    expect(wall.rule).toBe('Brake before the turn; tires cannot fully brake and steer.');
    expect(car.label).toBe(wall.label);
  });

  it('cost comes from recorded data: points, or rate x duration for a span', () => {
    expect(RR.rrEventCost({ type: 'rollingStop', points: 20 })).toBe(20);
    expect(RR.rrEventCost({ type: 'speedViolation', severity: 2, durationSec: 9 })).toBe(18);
    expect(RR.rrEventCost({ type: 'tailgate', severity: 2 })).toBe(6);
    expect(RR.rrEventCost({ type: 'hardBrake', severity: 3 })).toBe(1);
    expect(RR.rrEventCost({ type: 'crash', severity: 3 })).toBe(25);
    // the per-second rates are the ones the scoring sites use
    expect(src).toContain('statsRef.current.safetyScore -= dt * 2;');
    expect(src).toContain('statsRef.current.safetyScore -= 6 * scoringDt;');
    expect(src).toContain('statsRef.current.safetyScore = Math.max(0, statsRef.current.safetyScore - dt * 8);');
    expect(src).toContain('statsRef.current.safetyScore -= 1;\n            pushDriveEvent(statsRef, \'hardBrake\'');
  });

  it("another driver's mistake gets a card but is never the learner's focus", () => {
    const events = [{ type: 'rearEndedByOther', t: 20, severity: 1, points: 2 }, { type: 'hitWhileStopped', t: 30, severity: 1, points: 2 }];
    expect(RR.rrPracticeFocusFor(events, 3)).toEqual([]);
    expect(RR.rrCoachCardFor(events[0]).what).toMatch(/not your fault/);
  });

  it('the menu recommendation follows the same ranking and opens a matching practice view', () => {
    const next = RR.rrNextStepFor({ drivingStats: { events: r8() }, badges: {}, scenariosDriven: {} });
    expect(next.kind).toBe('coach');
    expect(next.focusType).toBe('stop');
    expect(next.title).toBe('Stop all the way');
    expect(next.view).toBe('intersectionGuide');
    expect(src).toContain("if (view === 'intersectionGuide')");
  });
});
