import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Use the production decision helpers: summaries and command descriptions must
// match live guidance while remaining safe to compute on a paused shift.
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const pureSource = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── CALLSIGNS ──'));
const model = new Function(pureSource + '\nreturn { atcTrafficFrozen, atcImmediateCommandInfo, atcTrafficReview };')();

function aircraft(overrides = {}) {
  return { id: 101, callsign: 'TEST101', state: 'inbound', x: 240, y: 200,
    heading: 90, altitude: 5000, speed: 150, targetHeading: null,
    targetAltitude: null, targetSpeed: null, fuel: 25, ...overrides };
}

const firstRunway = { x: 200, y: 200, hdg: 90, len: 40 };
const secondRunway = { x: 200, y: 200, hdg: 180, len: 40 };
const airport = { id: 'crossing', runways: [firstRunway, secondRunway] };

describe('ATC effective traffic freeze', () => {
  it('reports an ordinary running shift as moving', () => {
    expect(model.atcTrafficFrozen({}, false)).toBe(false);
    expect(model.atcTrafficFrozen({ paused: false, gameOver: false,
      showHelp: false, commandEntry: null, mathChallenge: null }, false)).toBe(false);
  });

  it('reports each independent reason traffic cannot advance', () => {
    for (const game of [{ paused: true }, { gameOver: true }, { showHelp: true },
      { commandEntry: { kind: 'heading', aircraftId: 101 } },
      { mathChallenge: { id: 'rate' } }]) {
      expect(model.atcTrafficFrozen(game, false)).toBe(true);
    }
    expect(model.atcTrafficFrozen({}, true)).toBe(true);
  });

  it('keeps simultaneous freeze reasons and their nested state unchanged', () => {
    const game = { paused: false, showHelp: true, commandEntry: { kind: 'speed', value: '120' },
      mathChallenge: { answer: 4 } };
    const before = structuredClone(game);
    expect(model.atcTrafficFrozen(game, true)).toBe(true);
    expect(game).toEqual(before);
  });
});

describe('ATC immediate command consequences', () => {
  it('builds successive manual altitude instructions from the pending target', () => {
    const ac = aircraft({ targetAltitude: 7000 });
    expect(model.atcImmediateCommandInfo(ac, 'd', airport)).toMatchObject({
      key: 'd', targetAltitude: 6000, cancelsApproach: false, releasesHold: false, unchanged: false
    });
    expect(model.atcImmediateCommandInfo(ac, 'u', airport)).toMatchObject({ targetAltitude: 8000 });
  });

  it('uses current altitude when no usable manual target exists', () => {
    for (const targetAltitude of [null, undefined, NaN]) {
      const ac = aircraft({ targetAltitude });
      expect(model.atcImmediateCommandInfo(ac, 'd', airport)).toMatchObject({ targetAltitude: 4000 });
      expect(model.atcImmediateCommandInfo(ac, 'u', airport)).toMatchObject({ targetAltitude: 6000 });
    }
  });

  it('bases approach altitude commands on actual altitude and cancels guidance', () => {
    const ac = aircraft({ state: 'approach', altitude: 5200, targetAltitude: 3800 });
    expect(model.atcImmediateCommandInfo(ac, 'd', airport)).toMatchObject({
      targetAltitude: 4200, cancelsApproach: true, unchanged: false
    });
    expect(model.atcImmediateCommandInfo(ac, 'u', airport)).toMatchObject({
      targetAltitude: 6200, cancelsApproach: true, unchanged: false
    });
  });

  it('clamps altitude commands at the teaching limits and recognizes existing targets', () => {
    expect(model.atcImmediateCommandInfo(aircraft({ altitude: 1000, targetAltitude: 1000 }), 'd', airport))
      .toMatchObject({ targetAltitude: 1000, unchanged: true });
    expect(model.atcImmediateCommandInfo(aircraft({ altitude: 43000, targetAltitude: 45000 }), 'u', airport))
      .toMatchObject({ targetAltitude: 45000, unchanged: true });
    expect(model.atcImmediateCommandInfo(aircraft({ altitude: 1300 }), 'd', airport))
      .toMatchObject({ targetAltitude: 1000, unchanged: false });
  });

  it('treats canceling a low approach as meaningful even when the numeric target repeats', () => {
    const ac = aircraft({ state: 'approach', altitude: 500, targetAltitude: 1000 });
    expect(model.atcImmediateCommandInfo(ac, 'd', airport)).toMatchObject({
      targetAltitude: 1000, cancelsApproach: true, unchanged: false
    });
  });

  it('describes entering a hold separately from releasing an existing hold', () => {
    expect(model.atcImmediateCommandInfo(aircraft(), 'p', airport))
      .toMatchObject({ key: 'p', cancelsApproach: false, releasesHold: false, targetAltitude: null, unchanged: false });
    expect(model.atcImmediateCommandInfo(aircraft({ state: 'holding', targetAltitude: 6000 }), 'p', airport))
      .toMatchObject({ releasesHold: true, cancelsApproach: false, targetAltitude: null });
    expect(model.atcImmediateCommandInfo(aircraft({ state: 'approach', altitude: 3200, targetAltitude: 1000 }), 'p', airport))
      .toMatchObject({ cancelsApproach: true, releasesHold: false, targetAltitude: 3200 });
  });

  it('cycles runway references and cancels an approach only when assignment changes', () => {
    const ac = aircraft({ state: 'approach', assignedRunway: firstRunway });
    const change = model.atcImmediateCommandInfo(ac, 'r', airport);
    expect(change.nextRunway).toBe(secondRunway);
    expect(change).toMatchObject({ cancelsApproach: true, unchanged: false });
    const keep = model.atcImmediateCommandInfo(ac, 'r', airport, 0);
    expect(keep.nextRunway).toBe(firstRunway);
    expect(keep).toMatchObject({ cancelsApproach: false, unchanged: true });
    expect(model.atcImmediateCommandInfo(aircraft({ assignedRunway: secondRunway }), 'r', airport).nextRunway)
      .toBe(firstRunway);
  });

  it('assigns the first runway to unassigned traffic and validates explicit picks', () => {
    expect(model.atcImmediateCommandInfo(aircraft(), 'r', airport).nextRunway).toBe(firstRunway);
    expect(model.atcImmediateCommandInfo(aircraft(), 'r', airport, 1).nextRunway).toBe(secondRunway);
    for (const index of [-1, 2]) {
      expect(model.atcImmediateCommandInfo(aircraft(), 'r', airport, index).nextRunway).toBeNull();
    }
  });

  it('rejects missing, inactive, unusable aircraft and unsupported keys', () => {
    for (const ac of [null, undefined, aircraft({ state: 'landed' }), aircraft({ state: 'departed' }),
      aircraft({ state: 'crashed' }), aircraft({ altitude: NaN }), aircraft({ altitude: Infinity })]) {
      expect(model.atcImmediateCommandInfo(ac, 'd', airport)).toBeNull();
    }
    expect(model.atcImmediateCommandInfo(aircraft(), 'c', airport)).toBeNull();
  });

  it('does not apply any described command to aircraft, runway, or guidance objects', () => {
    const ac = aircraft({ state: 'approach', assignedRunway: firstRunway,
      targetHeading: 180, targetAltitude: 3800, holdCenter: { x: 190, y: 190 } });
    const acBefore = structuredClone(ac);
    const airportBefore = structuredClone(airport);
    for (const key of ['d', 'u', 'p', 'r']) model.atcImmediateCommandInfo(ac, key, airport);
    expect(ac).toEqual(acBefore);
    expect(airport).toEqual(airportBefore);
    expect(ac.assignedRunway).toBe(firstRunway);
  });
});

describe('ATC traffic review summary', () => {
  it('counts current conflicts, projections, and cautions without merging their meanings', () => {
    const a = aircraft();
    const b = aircraft({ id: 102 });
    const watch = [{ a, b, severity: 'conflict' }, { a, b, severity: 'projected' },
      { a, b, severity: 'projected' }, { a, b, severity: 'caution' }];
    expect(model.atcTrafficReview([a, b], watch, [])).toMatchObject({
      spacingCounts: { conflict: 1, projected: 2, caution: 1 }, spacingTotal: 4
    });
  });

  it('ignores unknown watch severity rather than labeling it as an active warning', () => {
    expect(model.atcTrafficReview([], [{ severity: 'unknown' }], [])).toEqual({
      spacingCounts: { conflict: 0, projected: 0, caution: 0 }, spacingTotal: 0,
      runwayAreas: [], priorityAircraft: []
    });
  });

  it('deduplicates a crossing runway risk by protected movement area', () => {
    const plans = [
      { runway: firstRunway, group: 'intersection', risk: 'spacing' },
      { runway: secondRunway, group: 'intersection', risk: 'spacing' }
    ];
    expect(model.atcTrafficReview([], [], plans).runwayAreas).toEqual([
      { group: 'intersection', risk: 'spacing' }
    ]);
  });

  it('gives occupied risk precedence while retaining other independent runway areas', () => {
    const plans = [
      { group: 'intersection', risk: 'spacing' },
      { group: 'intersection', risk: 'occupied' },
      { group: 'intersection', risk: 'spacing' },
      { group: 'runway-2', risk: 'spacing' },
      { group: 'runway-3', risk: null }
    ];
    expect(model.atcTrafficReview([], [], plans).runwayAreas).toEqual([
      { group: 'intersection', risk: 'occupied' }, { group: 'runway-2', risk: 'spacing' }
    ]);
  });

  it('retains active emergency and low-fuel aircraft references in source order', () => {
    const emergency = aircraft({ id: 102, emergency: { priority: true } });
    const legacyEmergency = aircraft({ id: 103, emergency: { type: 'engine' } });
    const lowFuel = aircraft({ id: 104, fuel: 4.9 });
    const normal = aircraft();
    const result = model.atcTrafficReview([emergency, normal, legacyEmergency, lowFuel], [], []);
    expect(result.priorityAircraft).toEqual([emergency, legacyEmergency, lowFuel]);
    expect(result.priorityAircraft[0]).toBe(emergency);
    expect(result.priorityAircraft[2]).toBe(lowFuel);
  });

  it('excludes informational incidents, nonfinite fuel, and retired priority traffic', () => {
    const excluded = [aircraft({ emergency: { priority: false } }), aircraft({ fuel: 5 }),
      aircraft({ fuel: NaN }), aircraft({ fuel: -Infinity }),
      aircraft({ state: 'landed', fuel: 1 }), aircraft({ state: 'departed', emergency: {} }),
      aircraft({ state: 'crashed', fuel: 0 })];
    expect(model.atcTrafficReview(excluded, [], []).priorityAircraft).toEqual([]);
    const lowFuelIncident = aircraft({ emergency: { priority: false }, fuel: 4 });
    expect(model.atcTrafficReview([lowFuelIncident], [], []).priorityAircraft).toEqual([lowFuelIncident]);
  });

  it('does not reorder or modify traffic, watch pairs, or runway plans during review', () => {
    const a = aircraft({ fuel: 3 });
    const b = aircraft({ id: 102, emergency: { priority: false } });
    const aircraftList = [b, a];
    const watch = [{ a, b, severity: 'conflict', breachTimeSeconds: 0 }];
    const plans = [{ runway: firstRunway, group: 'intersection', risk: 'spacing', arrivals: [{ aircraft: a }] },
      { runway: secondRunway, group: 'intersection', risk: 'occupied' }];
    const before = structuredClone({ aircraftList, watch, plans });
    model.atcTrafficReview(aircraftList, watch, plans);
    expect({ aircraftList, watch, plans }).toEqual(before);
    expect(aircraftList[0]).toBe(b);
    expect(watch[0].a).toBe(a);
    expect(plans[0].runway).toBe(firstRunway);
  });
});
