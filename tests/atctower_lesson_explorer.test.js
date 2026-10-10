import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('stem_lab/stem_tool_atctower.js', 'utf8');
const helpers = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── EDUCATIONAL LESSONS ──'));
const { explore, fields } = new Function(helpers + '\nreturn { explore: atcLessonExplorer, fields: ATC_EXPLORER_FIELDS };')();

describe('ATC standalone lesson explorers', () => {
  it('rejects unknown and inherited topic names', () => {
    expect(explore('unknown')).toBeNull();
    expect(explore('__proto__')).toBeNull();
    expect(explore('toString')).toBeNull();
  });

  it('provides finite, bounded defaults for all numeric controls', () => {
    for (const kind of Object.keys(fields)) {
      const result = explore(kind);
      for (const [key, [min, max, fallback]] of Object.entries(fields[kind])) {
        expect(result.values[key]).toBe(fallback);
        expect(result.values[key]).toBeGreaterThanOrEqual(min);
        expect(result.values[key]).toBeLessThanOrEqual(max);
      }
    }
  });

  it('flags a conflict only when both normal-pair spacing limits are missed', () => {
    expect(explore('separation', { horizontal: 2.9, vertical: 999 }).conflict).toBe(true);
    expect(explore('separation', { horizontal: 3, vertical: 0 })).toMatchObject({ conflict: false, horizontalMet: true, verticalMet: false });
    expect(explore('separation', { horizontal: 0, vertical: 1000 })).toMatchObject({ conflict: false, horizontalMet: false, verticalMet: true });
  });

  it('expands only the horizontal limit for a heavy or super pair', () => {
    expect(explore('separation', { horizontal: 4, vertical: 500, heavy: false }).conflict).toBe(false);
    expect(explore('separation', { horizontal: 4, vertical: 500, heavy: true })).toMatchObject({ minimum: 6, conflict: true });
    expect(explore('separation', { horizontal: 6, vertical: 0, heavy: true }).conflict).toBe(false);
    expect(explore('separation', { horizontal: 1, vertical: 1000, heavy: true }).conflict).toBe(false);
  });

  it('bounds inputs and replaces non-finite values without trusting strings', () => {
    expect(explore('separation', { horizontal: -10, vertical: 9000 }).values).toMatchObject({ horizontal: 0, vertical: 3000 });
    expect(explore('separation', { horizontal: Infinity, vertical: '1000', heavy: 'true' }).values).toEqual({ horizontal: 2, vertical: 500, heavy: false });
    expect(explore('vectors', { current: NaN, target: 400 }).values).toEqual({ current: 350, target: 360 });
  });

  it('shows a farther aircraft arriving first when its speed is sufficient', () => {
    expect(explore('sequencing')).toMatchObject({ etaA: 20, etaB: 15, first: 'B', gap: 5, horizon: 20 });
  });

  it('updates the order when one speed changes while distances remain fixed', () => {
    expect(explore('sequencing', { speedA: 240 })).toMatchObject({ etaA: 7.5, etaB: 15, first: 'A', gap: 7.5 });
  });

  it('preserves mathematically equal estimates as a tie', () => {
    expect(explore('sequencing', { distanceA: 30, speedA: 120, distanceB: 45, speedB: 180 })).toMatchObject({ first: 'tie', etaA: 15, etaB: 15, gap: 0 });
  });

  it('keeps every arrival inside a finite shared scale and never divides by zero', () => {
    const result = explore('sequencing', { speedA: 0, distanceA: 60, speedB: Infinity, distanceB: 5 });
    expect(result.values.speedA).toBe(60);
    expect(result.etaA).toBe(60);
    expect(result.horizon).toBe(60);
    expect(result.etaB).toBeLessThanOrEqual(result.horizon);
  });

  it('turns clockwise across north using the short route and flight seconds', () => {
    const result = explore('vectors', { current: 350, target: 10 });
    expect(result.turn).toBe(20);
    expect(result.turnSeconds).toBeCloseTo(20 / 3);
  });

  it('turns counterclockwise across north in the opposite case', () => {
    const result = explore('vectors', { current: 10, target: 350 });
    expect(result.turn).toBe(-20);
    expect(result.turnSeconds).toBeCloseTo(20 / 3);
  });

  it('treats zero and 360 degrees as the same heading', () => {
    expect(explore('vectors', { current: 360, target: 0 })).toMatchObject({ turn: 0, turnSeconds: 0 });
  });

  it('uses a sixty-second half turn at the stated three-degree rate', () => {
    expect(explore('vectors', { current: 90, target: 270 })).toMatchObject({ turn: -180, turnSeconds: 60 });
  });

  it('uses wind-from direction for a positive headwind', () => {
    expect(explore('weather', { runway: 270, windFrom: 270, windSpeed: 20 })).toMatchObject({ headwind: 20, crosswind: 0 });
  });

  it('reports an opposing wind as a tailwind', () => {
    expect(explore('weather', { runway: 270, windFrom: 90, windSpeed: 20 })).toMatchObject({ headwind: -20, crosswind: 0 });
  });

  it('has only a crosswind component at ninety degrees', () => {
    expect(explore('weather', { runway: 0, windFrom: 90, windSpeed: 20 })).toMatchObject({ headwind: 0, crosswind: 20 });
  });

  it('returns the same component magnitudes on either side of north', () => {
    const a = explore('weather', { runway: 350, windFrom: 10 });
    const b = explore('weather', { runway: 10, windFrom: 350 });
    expect(a.headwind).toBeCloseTo(b.headwind);
    expect(a.crosswind).toBeCloseTo(b.crosswind);
    expect(a.headwind ** 2 + a.crosswind ** 2).toBeCloseTo(20 ** 2);
  });

  it('cleans calm and perpendicular values rather than displaying negative zero', () => {
    const calm = explore('weather', { runway: 270, windFrom: 90, windSpeed: 0 });
    expect(Object.is(calm.headwind, -0)).toBe(false);
    expect(calm).toMatchObject({ headwind: 0, crosswind: 0 });
  });

  it.each([['heading', 'match'], ['altitude', 'callsign'], ['runway', 'instruction']])('checks the actual mismatch in the %s readback example', (sample, answer) => {
    expect(explore('communication', { sample })).toMatchObject({ answer, correct: null });
    expect(explore('communication', { sample, response: answer }).correct).toBe(true);
    expect(explore('communication', { sample, response: answer === 'match' ? 'callsign' : 'match' }).correct).toBe(false);
  });

  it('ignores invalid readback choices and selects a known example', () => {
    expect(explore('communication', { sample: 'unknown', response: 'unknown' })).toMatchObject({ values: { sample: 'heading', response: '' }, answer: 'match', correct: null });
  });

  it('does not mutate inputs, shared defaults, or unrelated shift data', () => {
    const input = { horizontal: 4, vertical: 500, heavy: true, activeShift: { time: 18 }, practiceLearning: { completed: true } };
    const before = structuredClone({ input, fields });
    explore('separation', input);
    expect({ input, fields }).toEqual(before);
    expect(explore('separation').values.horizontal).toBe(2);
  });
});
