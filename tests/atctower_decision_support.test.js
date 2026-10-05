import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Exercise the production model used by the selected-aircraft panel. A preview
// must explain a command without issuing it or replacing guided flight state.
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const pureSource = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── CALLSIGNS ──'));
const model = new Function(pureSource + '\nreturn { atcAircraftReadback, atcCommandPreview, aircraftEtaMinutes };')();

function aircraft(overrides = {}) {
  return { id: 101, callsign: 'TEST101', state: 'inbound', x: 240, y: 200,
    heading: 350, altitude: 5000, speed: 150, targetHeading: null,
    targetAltitude: null, targetSpeed: null, ...overrides };
}

const runway = { x: 200, y: 200, hdg: 90, len: 40 };
const airport = { id: 'simple', runways: [runway] };

describe('ATC measured current and instructed readback', () => {
  it('reports all three current values and explicit targets in a stable order', () => {
    const result = model.atcAircraftReadback(aircraft({ targetHeading: 360, targetAltitude: 7000, targetSpeed: 120 }));
    expect(result).toEqual({ mode: 'manual', rows: [
      { id: 'heading', current: 350, target: 0, automatic: false },
      { id: 'altitude', current: 5000, target: 7000, automatic: false },
      { id: 'speed', current: 150, target: 120, automatic: false }
    ] });
  });

  it('normalizes north and keeps absent or unusable targets absent', () => {
    const result = model.atcAircraftReadback(aircraft({ heading: 360, targetHeading: NaN,
      targetAltitude: Infinity, targetSpeed: undefined }));
    expect(result.rows).toEqual([
      { id: 'heading', current: 0, target: null, automatic: false },
      { id: 'altitude', current: 5000, target: null, automatic: false },
      { id: 'speed', current: 150, target: null, automatic: false }
    ]);
  });

  it('distinguishes dynamic approach guidance, a hold, and a go-around', () => {
    for (const [state, mode, automatic] of [
      ['approach', 'approach', [true, true, false]],
      ['holding', 'hold', [true, false, false]],
      ['goAround', 'goAround', [false, false, false]],
      ['inbound', 'manual', [false, false, false]]
    ]) {
      const result = model.atcAircraftReadback(aircraft({ state, targetHeading: 70, targetAltitude: 3800 }));
      expect(result.mode).toBe(mode);
      expect(result.rows.map(row => row.automatic)).toEqual(automatic);
    }
  });

  it('does not fabricate readback for missing, retired, or nonfinite current values', () => {
    for (const ac of [null, undefined, {}, aircraft({ state: 'landed' }),
      aircraft({ state: 'departed' }), aircraft({ state: 'crashed' }),
      aircraft({ heading: NaN }), aircraft({ speed: Infinity }), aircraft({ altitude: undefined })]) {
      expect(model.atcAircraftReadback(ac)).toBeNull();
    }
  });
});

describe('ATC command decision preview', () => {
  it('uses the shortest signed turn across north in either direction', () => {
    const right = model.atcCommandPreview(aircraft({ heading: 350 }), 'heading', 10, airport);
    const left = model.atcCommandPreview(aircraft({ heading: 10 }), 'heading', 350, airport);
    expect(right).toMatchObject({ kind: 'heading', current: 350, value: 10, delta: 20, turn: 'right', turnDegrees: 20 });
    expect(left).toMatchObject({ current: 10, value: 350, delta: -20, turn: 'left', turnDegrees: 20 });
  });

  it('matches the simulator left-turn tie and handles an unchanged heading', () => {
    expect(model.atcCommandPreview(aircraft({ heading: 0 }), 'heading', 180, airport))
      .toMatchObject({ delta: -180, turn: 'left', turnDegrees: 180 });
    expect(model.atcCommandPreview(aircraft({ heading: 90 }), 'heading', 90, airport))
      .toMatchObject({ delta: 0, turn: 'straight', turnDegrees: 0 });
  });

  it('accepts zero, north as 360, and both valid speed limits', () => {
    expect(model.atcCommandPreview(aircraft(), 'heading', 0, airport)).toMatchObject({ value: 0 });
    expect(model.atcCommandPreview(aircraft(), 'heading', 360, airport)).toMatchObject({ value: 0 });
    expect(model.atcCommandPreview(aircraft(), 'speed', 60, airport)).toMatchObject({ value: 60, delta: -90 });
    expect(model.atcCommandPreview(aircraft(), 'speed', 250, airport)).toMatchObject({ value: 250, delta: 100 });
  });

  it('rejects blank, nonfinite, fractional, outside-range, and unsupported commands', () => {
    for (const value of ['', '   ', undefined, null, NaN, Infinity, -Infinity, -1, 361, 10.5, 'not a number']) {
      expect(model.atcCommandPreview(aircraft(), 'heading', value, airport)).toBeNull();
    }
    for (const value of ['', '   ', undefined, null, NaN, Infinity, 59, 251, 100.5]) {
      expect(model.atcCommandPreview(aircraft(), 'speed', value, airport)).toBeNull();
    }
    expect(model.atcCommandPreview(aircraft(), 'altitude', 5000, airport)).toBeNull();
  });

  it('rejects unusable and retired aircraft before computing a proposed command', () => {
    for (const ac of [null, {}, aircraft({ state: 'landed' }), aircraft({ state: 'departed' }),
      aircraft({ state: 'crashed' }), aircraft({ heading: NaN }), aircraft({ speed: Infinity }),
      aircraft({ altitude: NaN })]) {
      expect(model.atcCommandPreview(ac, 'heading', 0, airport)).toBeNull();
      expect(model.atcCommandPreview(ac, 'speed', 120, airport)).toBeNull();
    }
  });

  it('explains that a manual heading cancels the approach and maintains current altitude', () => {
    const ac = aircraft({ state: 'approach', assignedRunway: runway, targetAltitude: 3800 });
    expect(model.atcCommandPreview(ac, 'heading', 120, airport)).toMatchObject({
      cancelsApproach: true, releasesHold: false, maintainAltitude: 5000
    });
    expect(model.atcCommandPreview(ac, 'speed', 120, airport)).toMatchObject({
      cancelsApproach: false, releasesHold: false, maintainAltitude: null, turn: null, turnDegrees: null
    });
  });

  it('explains that only a heading command releases an active hold', () => {
    const ac = aircraft({ state: 'holding' });
    expect(model.atcCommandPreview(ac, 'heading', 90, airport)).toMatchObject({
      cancelsApproach: false, releasesHold: true, maintainAltitude: null
    });
    expect(model.atcCommandPreview(ac, 'speed', 120, airport)).toMatchObject({
      cancelsApproach: false, releasesHold: false, maintainAltitude: null,
      currentEtaMinutes: null, proposedEtaMinutes: null
    });
  });

  it('compares present and proposed constant speeds to the assigned runway threshold', () => {
    const otherRunway = { x: 260, y: 200, hdg: 90, len: 40 };
    const ac = aircraft({ assignedRunway: runway });
    const result = model.atcCommandPreview(ac, 'speed', 200, { id: 'other', runways: [otherRunway] });
    expect(result).toMatchObject({ kind: 'speed', current: 150, value: 200, delta: 50,
      distanceNm: 20, currentEtaMinutes: 8, proposedEtaMinutes: 6 });
    expect(result.turn).toBeNull();
    expect(result.turnDegrees).toBeNull();
  });

  it('labels a speed comparison through direct geometry rather than approach-route timing', () => {
    const ac = aircraft({ state: 'approach', approachStage: 'entry', assignedRunway: runway });
    const result = model.atcCommandPreview(ac, 'speed', 200, airport);
    expect(result.distanceNm).toBe(20);
    expect(result.currentEtaMinutes).toBe(8);
    expect(result.proposedEtaMinutes).toBe(6);
    expect(result.currentEtaMinutes).not.toBe(model.aircraftEtaMinutes(ac, runway));
  });

  it('uses an unassigned aircraft airport first runway and defers without valid runway geometry', () => {
    expect(model.atcCommandPreview(aircraft(), 'speed', 120, airport)).toMatchObject({
      distanceNm: 20, currentEtaMinutes: 8, proposedEtaMinutes: 10
    });
    for (const ap of [undefined, { runways: [] }, { runways: [{ ...runway, len: NaN }] }]) {
      expect(model.atcCommandPreview(aircraft(), 'speed', 120, ap)).toMatchObject({
        distanceNm: null, currentEtaMinutes: null, proposedEtaMinutes: null
      });
    }
    expect(model.atcCommandPreview(aircraft({ state: 'goAround' }), 'speed', 120, airport))
      .toMatchObject({ currentEtaMinutes: null, proposedEtaMinutes: null });
  });

  it('retains a valid zero direct distance and zero time estimate', () => {
    const result = model.atcCommandPreview(aircraft({ x: 180, y: 200 }), 'speed', 200, airport);
    expect(result.distanceNm).toBeCloseTo(0, 10);
    expect(result.currentEtaMinutes).toBeCloseTo(0, 10);
    expect(result.proposedEtaMinutes).toBeCloseTo(0, 10);
  });

  it('does not apply a command or change nested flight guidance while rendering previews', () => {
    const ac = aircraft({ state: 'approach', assignedRunway: runway,
      targetHeading: 70, targetAltitude: 3800, targetSpeed: 140 });
    const before = structuredClone(ac);
    const airportBefore = structuredClone(airport);
    model.atcAircraftReadback(ac);
    model.atcCommandPreview(ac, 'heading', 100, airport);
    model.atcCommandPreview(ac, 'speed', 200, airport);
    expect(ac).toEqual(before);
    expect(airport).toEqual(airportBefore);
  });
});
