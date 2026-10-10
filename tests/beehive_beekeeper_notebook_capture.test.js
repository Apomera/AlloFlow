import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

const colony = (patch = {}) => ({
  day: 7, workers: 12000, queenHealth: 90, honey: 30.25, syrup: 5.25,
  varroaLevel: 8, morale: 75, colonySurvived: true, activeEvent: null,
  autoAdvance: false, experimentRunSerial: 3, simulationSeed: 0,
  modelVersion: 'colony-daily-1.2', ...patch
});
const capture = (patch = {}) => BH.bhBeekeeperNotebookCapture(colony(patch));
const reading = (record, id) => record.readings.find(item => item.id === id)?.value;

describe('Beekeeper current-day evidence and units', () => {
  it('records the current colony with raw run identity and explicit model units', () => {
    const record = capture();
    expect(record).toMatchObject({ available: true, source: 'current', state: 'manual', sourceLabel: 'Current colony · Manual days' });
    expect(record.context).toBe('Current colony model · Day 7 · Manual days · Run 3 · Seed 0 · Model colony-daily-1.2');
    expect(record.readings).toEqual([
      { id: 'health', label: 'Model health score', value: '73 / 100' },
      { id: 'workers', label: 'Workers', value: '12,000' },
      { id: 'food', label: 'Combined food', value: '30.3 honey-equivalent lb' },
      { id: 'syrup', label: 'Fed syrup (included in food)', value: '5.3 honey-equivalent lb' },
      { id: 'mites', label: 'Mite pressure', value: '8 points' },
      { id: 'stability', label: 'Colony stability', value: '75 points' }
    ]);
    expect(record.text).not.toContain('%');
    expect(record.guide).toContain('calculated model composite');
    expect(record.guide).toContain('not percentages of bees');
    expect(record.guide).toContain('already includes fed syrup');
    expect(record.guide).toContain('difference alone does not establish a cause');
  });

  it('builds the appended record from precisely the preview title, context and readings', () => {
    const record = capture();
    expect(record.text).toBe('Readings from the current colony | Current colony model · Day 7 · Manual days · Run 3 · Seed 0 · Model colony-daily-1.2 | Model health score: 73 / 100 | Workers: 12,000 | Combined food: 30.3 honey-equivalent lb | Fed syrup (included in food): 5.3 honey-equivalent lb | Mite pressure: 8 points | Colony stability: 75 points');
    expect(record.text.length).toBeLessThan(1000);
  });

  it('preserves genuine zero readings, day zero and seed zero', () => {
    const record = capture({ day: 0, workers: 0, queenHealth: 0, honey: 0, syrup: 0, varroaLevel: 0, morale: 0 });
    expect(record.context).toContain('Day 0');
    expect(record.context).toContain('Seed 0');
    expect(reading(record, 'workers')).toBe('0');
    expect(reading(record, 'food')).toBe('0 honey-equivalent lb');
    expect(reading(record, 'syrup')).toBe('0 honey-equivalent lb');
    expect(reading(record, 'mites')).toBe('0 points');
    expect(reading(record, 'stability')).toBe('0 points');
    // Zero mite pressure contributes to this composite; it does not mean every score is zero.
    expect(reading(record, 'health')).toBe('20 / 100');
  });

  it.each([undefined, null, [], {}, 'colony'])('does not invent measurements or provenance for an absent raw record (%j)', (input) => {
    const record = BH.bhBeekeeperNotebookCapture(input);
    expect(record.readings.every(item => item.value === 'Not recorded')).toBe(true);
    expect(record.context).toBe('Current colony model · Day Not recorded · Manual days · Run Not recorded · Seed Not recorded · Model Not recorded');
    expect(record.text).not.toMatch(/10,000|100 \/ 100|20 honey-equivalent|Day 0|Run 1|Seed 0/);
  });

  it.each([undefined, null, NaN, Infinity, -Infinity, '0', true, -1])('keeps invalid raw numeric readings unknown (%s)', (value) => {
    const record = capture({ workers: value, queenHealth: value, honey: value, syrup: value, varroaLevel: value, morale: value });
    expect(record.readings.every(item => item.value === 'Not recorded')).toBe(true);
  });

  it('rejects out-of-range measurements instead of clamping them into evidence', () => {
    const record = capture({ workers: 1000001, queenHealth: 101, honey: 1000001, syrup: 1000001, varroaLevel: 101, morale: 101 });
    expect(record.readings.every(item => item.value === 'Not recorded')).toBe(true);
    expect(reading(capture({ workers: 12.5 }), 'workers')).toBe('Not recorded');
    expect(reading(capture({ workers: 12.5 }), 'health')).toBe('Not recorded');
  });

  it('accepts recorded upper bounds without overflow or fabricated saturation', () => {
    const record = capture({ workers: 1000000, queenHealth: 100, honey: 1000000, syrup: 1000000, varroaLevel: 100, morale: 100 });
    expect(reading(record, 'workers')).toBe('1,000,000');
    expect(reading(record, 'food')).toBe('1000000 honey-equivalent lb');
    expect(reading(record, 'syrup')).toBe('1000000 honey-equivalent lb');
    expect(reading(record, 'mites')).toBe('100 points');
    expect(reading(record, 'stability')).toBe('100 points');
    expect(reading(record, 'health')).toBe('80 / 100');
  });

  it.each([
    [undefined, 0], [null, 0], [NaN, 0], [20, undefined], [20, null],
    [20, NaN], [20, '5'], [20, -1], [20, 20.01], [1000001, 0]
  ])('requires a valid syrup subset of the raw combined food (%s, %s)', (honey, syrup) => {
    expect(reading(capture({ honey, syrup }), 'syrup')).toBe('Not recorded');
  });

  it('validates syrup before rounding and does not derive it from another food field', () => {
    expect(reading(capture({ honey: 20.01, syrup: 20.02 }), 'syrup')).toBe('Not recorded');
    expect(reading(capture({ honey: 20.01, syrup: 20.01 }), 'syrup')).toBe('20 honey-equivalent lb');
    const record = capture({ honey: 20, syrup: undefined, nectarHoney: 15, harvestableNectar: 15 });
    expect(reading(record, 'food')).toBe('20 honey-equivalent lb');
    expect(reading(record, 'syrup')).toBe('Not recorded');
  });

  it('uses current raw readings even when saved history, other roles and derived scores disagree', () => {
    const record = capture({ colonyHealth: 100, healthScore: 100, history: [{ d: 6, w: 99999, h: 999 }],
      queen: { hiveHealth: 1 }, drone: { lastRun: { energyLeft: 1 } },
      experimentProvenance: { runSerial: 99, simulationSeed: 123, modelVersion: 'unrelated' } });
    expect(record).toEqual(capture());
  });
});

describe('Shared colony health calculation', () => {
  it('preserves the established weighted composite and caps only its worker and food contributions', () => {
    expect(BH.bhColonyHealthScore(colony())).toBe(73);
    expect(BH.bhColonyHealthScore(colony({ workers: 30000, queenHealth: 100, varroaLevel: 0, morale: 100, honey: 100 }))).toBe(100);
    expect(BH.bhColonyHealthScore(colony({ workers: 1000000, queenHealth: 100, varroaLevel: 0, morale: 100, honey: 1000000 }))).toBe(100);
    expect(BH.bhColonyHealthScore(colony({ workers: 0, queenHealth: 0, varroaLevel: 100, morale: 0, honey: 0 }))).toBe(0);
    expect(BH.bhColonyHealthScore(colony({ workers: 12000.5 }))).toBe(73);
  });

  it.each(['workers', 'queenHealth', 'varroaLevel', 'morale', 'honey'])('requires every contributing raw field (%s)', (key) => {
    for (const value of [undefined, null, '0', NaN, Infinity, -1]) {
      expect(BH.bhColonyHealthScore(colony({ [key]: value }))).toBeNull();
      expect(reading(capture({ [key]: value }), 'health')).toBe('Not recorded');
    }
  });

  it('does not require syrup or provenance to calculate an otherwise supported composite', () => {
    const record = capture({ syrup: undefined, day: undefined, experimentRunSerial: undefined, simulationSeed: undefined, modelVersion: undefined });
    expect(reading(record, 'health')).toBe('73 / 100');
    expect(reading(record, 'syrup')).toBe('Not recorded');
    expect(record.context).toContain('Run Not recorded · Seed Not recorded · Model Not recorded');
  });
});

describe('Beekeeper clock state and provenance', () => {
  it.each([
    [{ colonySurvived: false, activeEvent: { id: 'storm' }, autoAdvance: true }, 'ended', 'Colony ended'],
    [{ activeEvent: { id: 'storm' }, autoAdvance: true }, 'event', 'Event awaiting review'],
    [{ autoAdvance: true }, 'auto', 'Automatic days on'],
    [{ autoAdvance: false }, 'manual', 'Manual days'],
    [{ colonySurvived: 'false', autoAdvance: 'true' }, 'auto', 'Automatic days on']
  ])('uses the model clock priority for %j', (patch, state, label) => {
    const record = capture(patch);
    expect(record.state).toBe(state);
    expect(record.sourceLabel).toBe('Current colony · ' + label);
    expect(record.context).toContain('Day 7 · ' + label + ' · Run 3');
    expect(record.title).toBe(state === 'ended' ? 'Review the colony’s final-day readings' : 'Readings from the current colony');
  });

  it('does not confuse paused visual motion with the model day clock', () => {
    for (const beekeeperMotionPaused of [true, false]) {
      expect(capture({ motionPaused: beekeeperMotionPaused, paused: true, prefersReducedMotion: true, autoAdvance: true }).state).toBe('auto');
      expect(capture({ motionPaused: beekeeperMotionPaused, paused: false, autoAdvance: false }).state).toBe('manual');
    }
  });

  it.each([undefined, null, NaN, Infinity, '1', -1, 1.5, Number.MAX_SAFE_INTEGER])('does not normalize invalid day, run or seed into recorded provenance (%s)', (value) => {
    const record = capture({ day: value, experimentRunSerial: value, simulationSeed: value });
    expect(record.context).toContain('Day Not recorded');
    expect(record.context).toContain('Run Not recorded · Seed Not recorded');
  });

  it('keeps each provenance field independent, with its own exact bounds', () => {
    const maximum = capture({ day: 10000000, experimentRunSerial: 10000000, simulationSeed: 4294967295 });
    expect(maximum.context).toContain('Day 10000000');
    expect(maximum.context).toContain('Run 10000000 · Seed 4294967295');
    expect(capture({ day: 10000001, experimentRunSerial: 10000001, simulationSeed: 4294967296 }).context).toContain('Run Not recorded · Seed Not recorded');
    expect(capture({ experimentRunSerial: 0 }).context).toContain('Run Not recorded · Seed 0');
    expect(capture({ simulationSeed: undefined }).context).toContain('Run 3 · Seed Not recorded · Model colony-daily-1.2');
  });

  it.each([undefined, null, '', '   ', 12, 'x'.repeat(65), 'model\nforged', 'model\u0000bad', 'model\u007fbad'])('does not invent or print malformed model identity (%j)', (modelVersion) => {
    expect(capture({ modelVersion }).context).toContain('Model Not recorded');
  });

  it('keeps a recorded legacy model identity and trims surrounding whitespace only', () => {
    expect(capture({ modelVersion: '  colony-daily-1.0  ' }).context).toContain('Model colony-daily-1.0');
    expect(capture({ modelVersion: 'x'.repeat(64) }).context).toContain('Model ' + 'x'.repeat(64));
  });

  it('is deterministic, does not mutate frozen inputs, and does not retain mutable references', () => {
    const input = Object.freeze(colony({ activeEvent: Object.freeze({ id: 'storm' }), history: Object.freeze([Object.freeze({ d: 1 })]) }));
    const before = JSON.stringify(input);
    const first = BH.bhBeekeeperNotebookCapture(input);
    expect(first).toEqual(BH.bhBeekeeperNotebookCapture(input));
    first.readings[0].value = 'changed preview';
    expect(reading(BH.bhBeekeeperNotebookCapture(input), 'health')).toBe('73 / 100');
    expect(JSON.stringify(input)).toBe(before);
    expect(first.text).not.toMatch(/capturedAt|timestamp/);
  });
});
