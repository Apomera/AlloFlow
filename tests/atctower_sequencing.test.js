import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Exercise the shipped private helpers without copying their implementation.
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const helpers = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── AIRPORT CONFIGURATIONS ──'));
const model = new Function(helpers + '\nreturn { sortedFlightStrips, separationWatch, runwayScheduleHints };')();
const runway = { hdg: 270, x: 150, y: 200, len: 40 };
const airport = { id: 'simple', runways: [runway] };

function aircraft(extra = {}) {
  return { id: 'test', x: 330, y: 200, heading: 270, speed: 140, altitude: 5000, fuel: 30,
    type: { cat: 'Medium' }, state: 'inbound', targetAltitude: null, assignedRunway: runway, ...extra };
}

describe('ATC arrival sequencing', () => {
  it('orders by speed-derived arrival time rather than radar distance', () => {
    const closer = aircraft({ id: 'closer', x: 200, speed: 90 }); // 10 nm / 90 kt = 6.67 min
    const farther = aircraft({ id: 'farther', x: 215, speed: 180 }); // 15 nm / 180 kt = 5 min
    const original = [closer, farther];
    expect(model.sortedFlightStrips(original, airport)).toEqual([farther, closer]);
    expect(original).toEqual([closer, farther]);
  });

  it('uses the remaining approach path, not direct threshold distance', () => {
    const approach = aircraft({ id: 'approach', x: 170, state: 'approach', approachStage: 'entry', speed: 120 });
    const inbound = aircraft({ id: 'inbound', x: 200, speed: 120 });
    // The approach must still fly out to final entry and back: 24 nm / 120 kt.
    expect(model.sortedFlightStrips([approach, inbound], airport)).toEqual([inbound, approach]);
  });

  it('gives emergencies and critical fuel priority even while holding', () => {
    const ordinary = aircraft({ id: 'ordinary', x: 180 });
    const lowFuel = aircraft({ id: 'low', fuel: 8, x: 185 });
    const critical = aircraft({ id: 'critical', fuel: 4, x: 240 });
    const emergencyHold = aircraft({ id: 'emergency', emergency: { priority: true }, state: 'holding' });
    expect(model.sortedFlightStrips([ordinary, lowFuel, emergencyHold, critical], airport))
      .toEqual([critical, emergencyHold, lowFuel, ordinary]);
  });

  it('preserves insertion order for equal and unknown ETAs', () => {
    const first = aircraft({ id: 'first', x: 200, speed: 120 });
    const second = aircraft({ id: 'second', x: 215, speed: 180 });
    const hold = aircraft({ id: 'hold', state: 'holding' });
    const goAround = aircraft({ id: 'go', state: 'goAround' });
    expect(model.sortedFlightStrips([hold, first, goAround, second], airport)).toEqual([first, second, hold, goAround]);
  });

  it('handles missing runway, zero speed, and nonfinite snapshot fields without unstable comparison', () => {
    const unknown = aircraft({ id: 'unknown', speed: NaN, fuel: NaN });
    const stopped = aircraft({ id: 'stopped', speed: 0 });
    const invalidPosition = aircraft({ id: 'position', x: Infinity });
    const valid = aircraft({ id: 'valid', assignedRunway: null });
    expect(model.sortedFlightStrips([unknown, stopped, invalidPosition, valid], airport))
      .toEqual([valid, unknown, stopped, invalidPosition]);
    expect(model.sortedFlightStrips(null, null)).toEqual([]);
  });

  it('removes completed aircraft and keeps active references intact', () => {
    const live = aircraft({ id: 'live' });
    const sorted = model.sortedFlightStrips([aircraft({ state: 'landed' }), null, live, aircraft({ state: 'departed' })], airport);
    expect(sorted).toHaveLength(1);
    expect(sorted[0]).toBe(live);
  });
});

describe('ATC separation watch', () => {
  const pair = () => [aircraft({ id: 'A', x: 0, y: 0, heading: 90, speed: 180 }),
    aircraft({ id: 'B', x: 36, y: 0, heading: 270, speed: 180 })];

  it('predicts a simultaneous separation breach before the current boundary is crossed', () => {
    const [watch] = model.separationWatch(pair(), 120);
    expect(watch.severity).toBe('projected');
    expect(watch.currentDistanceNm).toBe(12);
    expect(watch.closingKnots).toBeCloseTo(360, 8);
    expect(watch.breachTimeSeconds).toBeCloseTo(90, 8);
    expect(watch.closestTimeSeconds).toBeCloseTo(120, 8);
    expect(watch.closestDistanceNm).toBeCloseTo(0, 8);
    expect(watch.currentVerticalFt).toBe(0);
  });

  it('warns calmly about a closing near miss within the horizon without labeling it a breach', () => {
    const first = aircraft({ x: 0, y: 0, speed: 0 });
    const second = aircraft({ x: 15, y: 0, heading: 270, speed: 180 });
    const [watch] = model.separationWatch([first, second], 20);
    expect(watch.severity).toBe('caution');
    expect(watch.breachTimeSeconds).toBeNull();
    expect(watch.closestDistanceNm).toBeCloseTo(4, 8);
  });

  it('avoids warnings for near-threshold aircraft that are diverging', () => {
    const first = aircraft({ x: 0, y: 0, heading: 270, speed: 100 });
    const second = aircraft({ x: 9.6, y: 0, heading: 90, speed: 100 });
    expect(model.separationWatch([first, second], 120)).toEqual([]);
  });

  it('reports current violations even while aircraft are moving apart', () => {
    const first = aircraft({ x: 0, y: 0, heading: 270 });
    const second = aircraft({ x: 6, y: 0, heading: 90 });
    const [watch] = model.separationWatch([first, second], 120);
    expect(watch.severity).toBe('conflict');
    expect(watch.breachTimeSeconds).toBe(0);
    expect(watch.closingKnots).toBeLessThan(0);
  });

  it('keeps horizontally converging traffic separate when vertical spacing is sufficient', () => {
    const flights = pair();
    flights[1].altitude = 7000;
    expect(model.separationWatch(flights, 120)).toEqual([]);
  });

  it('finds a vertical breach even when vertical spacing is safe at horizontal closest approach', () => {
    const first = aircraft({ x: 0, y: 0, speed: 0, altitude: 5000 });
    const second = aircraft({ x: 6, y: 0, speed: 0, altitude: 8000, targetAltitude: 5000 });
    const [watch] = model.separationWatch([first, second], 120);
    expect(watch.severity).toBe('projected');
    expect(watch.closestTimeSeconds).toBe(0);
    expect(watch.closestVerticalFt).toBe(3000);
    expect(watch.breachTimeSeconds).toBeCloseTo(100, 8);
  });

  it('stops climbing and descending at the current altitude targets', () => {
    const first = aircraft({ x: 0, y: 0, speed: 0, altitude: 5000, targetAltitude: 6000 });
    const second = aircraft({ x: 6, y: 0, speed: 0, altitude: 7200, targetAltitude: 7000 });
    // Both capture targets with exactly 1,000 ft separation. Continuing the
    // initial rates past target capture would incorrectly invent a violation.
    const [watch] = model.separationWatch([first, second], 120);
    expect(watch.severity).toBe('caution');
    expect(watch.breachTimeSeconds).toBeNull();
  });

  it('uses approach descent and an explicit present vertical rate', () => {
    const first = aircraft({ x: 0, y: 0, speed: 0, altitude: 5000 });
    const approach = aircraft({ x: 6, y: 0, speed: 0, altitude: 8000, targetAltitude: 5000, state: 'approach', approachStage: 'final' });
    expect(model.separationWatch([first, approach], 120)[0].breachTimeSeconds).toBeCloseTo(2000 / 30, 8);
    const climbing = aircraft({ x: 6, y: 0, speed: 0, altitude: 2000, verticalRate: 300 });
    expect(model.separationWatch([first, climbing], 180)).toEqual([]);
    expect(model.separationWatch([first, { ...climbing, verticalRate: 1200 }], 180)[0].breachTimeSeconds).toBeCloseTo(100, 8);
  });

  it('checks temporal overlap rather than independent horizontal and vertical minima', () => {
    const first = aircraft({ x: 0, y: 0, heading: 90, speed: 180, altitude: 5000 });
    const second = aircraft({ x: 18, y: 0, heading: 270, speed: 180, altitude: 8500, targetAltitude: 5000 });
    // Horizontal distance is <3 nm between 30 and 90 seconds, while vertical
    // spacing first drops below 1,000 ft after 125 seconds.
    const watch = model.separationWatch([first, second], 180);
    expect(watch.every(entry => entry.severity !== 'projected' && entry.severity !== 'conflict')).toBe(true);
  });

  it('finds a transient vertical breach even when separation is restored by the end of the horizon', () => {
    const climbing = aircraft({ x: 0, y: 0, speed: 0, altitude: 5000, targetAltitude: 9000 });
    const level = aircraft({ x: 6, y: 0, speed: 0, altitude: 7500 });
    // The climb passes through level traffic: the vertical breach starts at
    // 75 seconds and ends at 175, before the 180-second look-ahead ends.
    const [watch] = model.separationWatch([climbing, level], 180);
    expect(watch.severity).toBe('projected');
    expect(watch.breachTimeSeconds).toBeCloseTo(75, 8);
  });

  it('does not treat a tangent that only meets the horizontal boundary as a violation', () => {
    const first = aircraft({ x: 0, y: 0, speed: 0 });
    const second = aircraft({ x: -18, y: 9, heading: 90, speed: 180 });
    const watch = model.separationWatch([first, second], 180);
    expect(watch.every(entry => entry.severity === 'caution')).toBe(true);
  });

  it('applies the model heavy wake threshold and flags turning or held estimates', () => {
    const flights = pair();
    flights[1].type.cat = 'Heavy';
    flights[1].state = 'holding';
    const [watch] = model.separationWatch(flights, 120);
    expect(watch.minimumNm).toBe(6);
    expect(watch.breachTimeSeconds).toBeCloseTo(60, 8);
    expect(watch.turning).toBe(true);
  });

  it('sanitizes bad snapshots and bounds the flight-time horizon without mutation', () => {
    const flights = pair();
    const original = structuredClone(flights);
    expect(model.separationWatch(flights, Infinity)[0].horizonSeconds).toBe(120);
    expect(model.separationWatch(flights, 10000)[0].horizonSeconds).toBe(180);
    expect(model.separationWatch(flights, -1)).toEqual([]);
    expect(model.separationWatch([flights[0], { ...flights[1], speed: NaN }], 120)).toEqual([]);
    expect(model.separationWatch([flights[0], { ...flights[1], heading: Infinity }], 120)).toEqual([]);
    expect(model.separationWatch(null)).toEqual([]);
    expect(flights).toEqual(original);
  });

  it('prioritizes current breaches over future cautions', () => {
    const first = aircraft({ id: 'A', x: 0, y: 0, speed: 0 });
    const current = aircraft({ id: 'B', x: 3, y: 0, speed: 0 });
    const future = aircraft({ id: 'C', x: 15, y: 0, heading: 270, speed: 180 });
    const watch = model.separationWatch([first, current, future], 20);
    expect(watch[0].severity).toBe('conflict');
    expect(watch[watch.length - 1].severity).toBe('caution');
  });
});

describe('ATC runway schedule planning', () => {
  it('flags arrival before current occupancy ends using accelerated clock conversion', () => {
    const flight = aircraft({ x: 176, speed: 120 }); // 2 nm / 120 kt = 1 flight minute = .5 shift seconds.
    const [hint] = model.runwayScheduleHints([flight], airport, { 'runway-0': 12 }, 10);
    expect(hint.occupied).toBe(true);
    expect(hint.occupancySeconds).toBe(2);
    expect(hint.next.aircraft).toBe(flight);
    expect(hint.next.etaMinutes).toBe(1);
    expect(hint.risk).toBe('occupied');
  });

  it('does not flag an arrival that occurs after occupancy clears', () => {
    const [hint] = model.runwayScheduleHints([aircraft({ x: 206, speed: 120 })], airport, { 'runway-0': 12 }, 10);
    expect(hint.occupied).toBe(true);
    expect(hint.next.etaMinutes).toBe(6);
    expect(hint.risk).toBeNull();
  });

  it('chooses the tightest arrival gap and excludes holds and go-arounds from finite estimates', () => {
    const first = aircraft({ id: 'first', x: 200, speed: 120 }); // 5 min
    const middle = aircraft({ id: 'middle', x: 260, speed: 120 }); // 15 min
    const last = aircraft({ id: 'last', x: 266, speed: 120 }); // 16 min
    const [hint] = model.runwayScheduleHints([last, aircraft({ state: 'holding' }), first, middle, aircraft({ state: 'goAround' })], airport);
    expect(hint.arrivals.map(entry => entry.aircraft.id)).toEqual(['first', 'middle', 'last']);
    expect(hint.spacingPair).toEqual([middle, last]);
    expect(hint.spacingMinutes).toBe(1);
    expect(hint.requiredSpacingMinutes).toBe(4);
    expect(hint.risk).toBe('spacing');
  });

  it('allows equality at the model spacing guide and includes heavy/slow planning margins', () => {
    const first = aircraft({ x: 200, speed: 120 });
    const second = aircraft({ x: 224, speed: 120 }); // Four-minute gap.
    expect(model.runwayScheduleHints([first, second], airport)[0].risk).toBeNull();
    const heavy = aircraft({ x: 200, speed: 60, type: { cat: 'Heavy' } });
    const following = aircraft({ x: 215, speed: 60 }); // Five-minute gap, six-minute guide.
    const [hint] = model.runwayScheduleHints([heavy, following], airport);
    expect(hint.spacingMinutes).toBe(5);
    expect(hint.requiredSpacingMinutes).toBe(6);
    expect(hint.risk).toBe('spacing');
  });

  it('shares a crossing-runway schedule and keeps parallel-runway schedules separate', () => {
    const secondRunway = { ...runway, hdg: 180 };
    const crossing = { id: 'crossing', runways: [runway, secondRunway] };
    const first = aircraft({ x: 200, speed: 120 });
    const second = aircraft({ x: 150, y: 147, speed: 120, assignedRunway: secondRunway }); // 11 nm = 5.5 min
    const hints = model.runwayScheduleHints([first, second], crossing);
    expect(hints.map(hint => hint.arrivals.length)).toEqual([2, 2]);
    expect(hints.every(hint => hint.risk === 'spacing')).toBe(true);
    expect(hints[0].group).toBe('intersection');
    const parallel = { id: 'parallel', runways: [runway, secondRunway] };
    expect(model.runwayScheduleHints([first, second], parallel).map(hint => hint.arrivals.length)).toEqual([1, 1]);
  });

  it('does not invent an ETA for unassigned, stopped, or corrupted aircraft', () => {
    const [hint] = model.runwayScheduleHints([aircraft({ assignedRunway: null }), aircraft({ speed: 0 }), aircraft({ x: NaN })], airport,
      { 'runway-0': Infinity }, NaN);
    expect(hint.arrivals).toEqual([]);
    expect(hint.next).toBeNull();
    expect(hint.occupied).toBe(false);
    expect(hint.risk).toBeNull();
    expect(model.runwayScheduleHints([], null)).toEqual([]);
  });
});
