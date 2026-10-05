import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const modelSource = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── AIRPORT CONFIGURATIONS ──'));
const recoverySource = source.slice(source.indexOf('  // ── ATC SHIFT RECOVERY ──'), source.indexOf('  // ── CALLSIGNS ──'));
const snapshot = new Function(modelSource + recoverySource + '\nreturn atcMathSnapshot;')();

const tiedArrival = { type: 'arrival_order', d1: 24, s1: 120, d2: 12, s2: 60,
  answer: 'TIE', explanation: 'Both aircraft take 12 minutes.' };
const zeroSeparation = { type: 'separation', d: 3, sep: 3, rate: 120,
  answer: 0, explanation: 'The model separation boundary has already been reached.' };
const descent = { type: 'descent', altitude: 9000, target: 3000, dist: 20, speed: 120,
  answer: 600, explanation: 'Descend 6,000 feet over 10 minutes.' };
const crosswind = { type: 'wind_correction', rwyHdg: 270, windDir: 360, windSpd: 10,
  answer: 10, explanation: 'A wind perpendicular to the runway is all crosswind.' };

describe('ATC restored math challenges remain answerable', () => {
  it('preserves answerable tied, zero, descent, and crosswind problems', () => {
    for (const challenge of [tiedArrival, zeroSeparation, descent, crosswind,
      { ...crosswind, windDir: 270, answer: 0 }]) {
      const stored = JSON.parse(JSON.stringify(challenge));
      expect(snapshot(stored)).toMatchObject({ type: challenge.type, answer: challenge.answer });
      expect(stored).toEqual(challenge);
    }
  });

  it('discards required fields that are missing, nonfinite, or divide by zero', () => {
    const missingSpeed = { ...tiedArrival };
    delete missingSpeed.s1;
    for (const challenge of [
      missingSpeed,
      { ...tiedArrival, d1: NaN },
      { ...tiedArrival, s2: 0 },
      { ...zeroSeparation, rate: 0 },
      { ...descent, dist: 0 },
      { ...descent, speed: Infinity },
      { ...crosswind, windSpd: NaN }
    ]) expect(snapshot(challenge)).toBeNull();
  });

  it('discards cached answers that disagree with their visible problem', () => {
    for (const challenge of [
      { ...tiedArrival, answer: 'A' },
      { ...zeroSeparation, answer: 10 },
      { ...descent, answer: 1000 },
      { ...crosswind, answer: 0 }
    ]) expect(snapshot(challenge)).toBeNull();
  });

  it('rejects answers above the supported range instead of changing a correct answer', () => {
    expect(snapshot({ ...descent, altitude: 100000, target: 0, dist: 0.1, speed: 600,
      answer: 10000000 })).toBeNull();
  });

  it('discards negative-distance or reversed-descent problems', () => {
    expect(snapshot({ ...tiedArrival, d1: -1 })).toBeNull();
    expect(snapshot({ ...zeroSeparation, d: 2 })).toBeNull();
    expect(snapshot({ ...descent, altitude: 2000 })).toBeNull();
    expect(snapshot({ ...crosswind, rwyHdg: 361 })).toBeNull();
  });
});
