import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});
const colony = (patch = {}) => ({ day: 15, experimentRunSerial: 3, simulationSeed: 0,
  modelVersion: 'colony-daily-1.2', honey: 40, syrup: 5, pollen: 12, brood: 6000,
  queenHealth: 90, actionPoints: 3, autoAdvance: false, colonySurvived: true, ...patch });
const compare = (before = {}, after = {}) => BH.bhHiveInteriorComparison(BH.bhHiveInteriorSnapshot(colony(before)), colony(after), 2);
const scale = (comparison, id = 'food') => BH.bhHiveInteriorReadingScale(comparison, id);
const topics = [
  ['food', 'honey', 1000000, 'Food stores', ' honey-equivalent lb'],
  ['pollen', 'pollen', 1000000, 'Pollen stores', ' lb'],
  ['brood', 'brood', 1000000, 'Developing brood', ' cells'],
  ['queen', 'queenHealth', 100, 'Queen', ' / 100']
];
function unknown(result) {
  expect(result).toMatchObject({ available: false, held: null, current: null,
    maximum: null, heldPercent: null, currentPercent: null, scaleLabel: '' });
  expect(result.reason.length).toBeGreaterThan(0);
}
function freezeDeep(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); }
  return value;
}

describe('Held hive whole-colony reading scales', () => {
  it.each(topics)('uses the exact displayed %s pair on a zero-origin scale', (id, key, limit, label, suffix) => {
    const comparison = compare({ [key]: 10.123456 }, { day: 16, [key]: 20.5005 });
    const result = scale(comparison, id), row = comparison.rows.find(item => item.id === id);
    expect(result).toMatchObject({ available: true, id, label, held: 10.123, current: 20.501,
      maximum: id === 'queen' ? 100 : 20.501, reason: '' });
    expect(row.before).toBe(result.held.toLocaleString('en-US', { maximumFractionDigits: 3 }) + suffix);
    expect(row.current).toBe(result.current.toLocaleString('en-US', { maximumFractionDigits: 3 }) + suffix);
    expect(Math.round((result.current - result.held) * 1000) / 1000).toBe(row.delta);
    expect(result.heldPercent).toBe(result.held / result.maximum * 100);
    expect(result.currentPercent).toBe(result.current / result.maximum * 100);
    expect(result.scaleLabel).toBe(id === 'queen' ? 'Scale: 0 to 100 queen-health points.' : 'Scale: 0 to ' + result.maximum.toLocaleString('en-US', { maximumFractionDigits: 3 }) + suffix + '.');
  });

  it('compares a real same-day Feed result without changing either colony or spending actions', () => {
    const raw = colony(), original = structuredClone(raw), held = BH.bhHiveInteriorSnapshot(raw);
    const action = BH.bhManagementAction(raw, 'feed_bees'), next = { ...raw, ...action.patch };
    const nextOriginal = structuredClone(next), comparison = BH.bhHiveInteriorComparison(held, next, 2);
    expect(scale(comparison)).toMatchObject({ available: true, held: 40, current: 45, maximum: 45,
      heldPercent: 40 / 45 * 100, currentPercent: 100 });
    expect(raw).toEqual(original); expect(next).toEqual(nextOriginal);
  });

  it.each(topics)('keeps the larger %s reading as the common maximum after a decrease', (id, key) => {
    expect(scale(compare({ [key]: 60 }, { [key]: 30 }), id)).toMatchObject({
      held: 60, current: 30, maximum: id === 'queen' ? 100 : 60,
      heldPercent: id === 'queen' ? 60 : 100, currentPercent: id === 'queen' ? 30 : 50
    });
  });

  it.each(topics)('preserves recorded zero %s readings without negative zero', (id, key) => {
    const result = scale(compare({ [key]: -0 }, { [key]: 0 }), id);
    expect(result).toMatchObject({ available: true, held: 0, current: 0, maximum: id === 'queen' ? 100 : 0,
      heldPercent: 0, currentPercent: 0, scaleLabel: id === 'queen' ? 'Scale: 0 to 100 queen-health points.' : 'Both readings are zero.' });
    for (const property of ['held', 'current', 'maximum', 'heldPercent', 'currentPercent']) expect(Object.is(result[property], -0)).toBe(false);
  });

  it.each(topics)('scales tiny %s readings from the rounded visible pair', (id, key) => {
    const result = scale(compare({ [key]: 0.00049 }, { [key]: 0.0005 }), id);
    expect(result).toMatchObject({ held: 0, current: 0.001, maximum: id === 'queen' ? 100 : 0.001,
      heldPercent: 0, currentPercent: id === 'queen' ? 0.001 : 100 });
    const roundedZero = scale(compare({ [key]: 0.00001 }, { [key]: 0.00049 }), id);
    expect(roundedZero).toMatchObject({ held: 0, current: 0, heldPercent: 0, currentPercent: 0 });
  });

  it.each(topics)('handles the recorded upper bound for %s with finite percentages', (id, key, limit) => {
    const result = scale(compare({ [key]: limit }, { [key]: limit }), id);
    expect(result).toMatchObject({ available: true, held: limit, current: limit, maximum: limit,
      heldPercent: 100, currentPercent: 100 });
    for (const property of ['held', 'current', 'maximum', 'heldPercent', 'currentPercent']) expect(Number.isFinite(result[property])).toBe(true);
  });

  it.each(topics)('does not turn a missing %s reading into zero', (id, key) => {
    const comparison = compare({ [key]: null }, { [key]: 0 });
    expect(comparison.available).toBe(true); unknown(scale(comparison, id));
    unknown(scale(compare({ [key]: 0 }, { [key]: undefined }), id));
    expect(scale(comparison, id).label).toBe(topics.find(item => item[0] === id)[3]);
  });

  it.each(['experimentRunSerial', 'simulationSeed', 'modelVersion', 'day'])('keeps an identity-invalid %s comparison unavailable', key => {
    const after = key === 'modelVersion' ? 'colony-daily-1.1' : key === 'day' ? 14 : key === 'simulationSeed' ? 1 : 4;
    const comparison = compare({}, { [key]: after }), result = scale(comparison);
    unknown(result); expect(result.reason).toBe(comparison.reason);
  });

  it('keeps a permanently invalid held reference unavailable', () => {
    const held = { ...BH.bhHiveInteriorSnapshot(colony()), invalidReason: 'The reference was rewound. Hold a new reference.' };
    const comparison = BH.bhHiveInteriorComparison(held, colony({ day: 16 }), 2);
    unknown(scale(comparison)); expect(scale(comparison).reason).toBe(held.invalidReason);
  });

  it.each([undefined, null, '', 'honey', 'queenHealth', 'unknown', 0, [], {}])('rejects unknown topic %j without falling back to another reading', id => {
    const result = BH.bhHiveInteriorReadingScale(compare(), id);
    unknown(result); expect(result).toMatchObject({ id: null, label: '' });
  });

  it.each([undefined, null, false, [], {}, { available: 1 }, { available: 'true' }])('rejects an unavailable or malformed comparison %j', comparison => unknown(scale(comparison)));

  it('requires an own finite comparable row delta before scaling', () => {
    for (const delta of [undefined, null, '0', true, NaN, Infinity, -Infinity]) {
      const comparison = compare(), rows = comparison.rows.map(row => row.id === 'food' ? { ...row, delta } : row);
      unknown(scale({ ...comparison, rows }));
    }
    const comparison = compare(), rows = comparison.rows.filter(row => row.id !== 'food');
    unknown(scale({ ...comparison, rows }));
    unknown(scale({ ...comparison, rows: { 0: comparison.rows[0] } }));
  });

  it.each(topics.flatMap(([id, key, limit]) => ['held', 'current'].map(side => [id, key, limit, side])))('rejects invalid recorded %s (%s, maximum %s) values on the %s side', (id, key, limit, side) => {
    for (const value of [undefined, null, '', '0', true, [], {}, NaN, Infinity, -Infinity, -0.001, limit + 0.001]) {
      const comparison = compare(), original = structuredClone(comparison);
      comparison[side].data[key] = value;
      unknown(scale(comparison, id));
      expect(comparison[side].data[key]).toEqual(value);
      expect(original[side].data[key]).toEqual(colony()[key]);
    }
  });

  it.each(['held', 'current'])('rejects inherited and accessor readings from the %s side without executing accessors', side => {
    const comparison = compare(), key = 'honey';
    const inherited = Object.create({ [key]: 40 });
    comparison[side] = { ...comparison[side], data: inherited };
    unknown(scale(comparison));
    const accessor = {};
    Object.defineProperty(accessor, key, { get() { throw new Error('A getter is not a recorded reading'); } });
    comparison[side] = { ...comparison[side], data: accessor };
    expect(() => scale(comparison)).not.toThrow(); unknown(scale(comparison));
    comparison[side] = { ...comparison[side], data: Object.assign([], { [key]: 40 }) };
    unknown(scale(comparison));
  });

  it('rejects inherited comparison gates, rows, snapshot data and row deltas', () => {
    const comparison = compare(), first = comparison.rows[0];
    unknown(scale(Object.create(comparison)));
    unknown(scale({ ...comparison, rows: [Object.create(first)] }));
    const inheritedDelta = Object.assign(Object.create({ delta: 0 }), { id: 'food' });
    unknown(scale({ ...comparison, rows: [inheritedDelta] }));
    unknown(scale({ ...comparison, held: Object.create(comparison.held) }));
    unknown(scale({ ...comparison, current: [] }));
  });

  it('returns fresh primitive results from frozen comparison data without model or notebook writes', () => {
    const comparison = freezeDeep(compare({ honey: 0.5005 }, { honey: 0.501 }));
    const original = JSON.stringify(comparison), first = scale(comparison), second = scale(comparison);
    expect(first).toMatchObject({ held: 0.501, current: 0.501, maximum: 0.501, heldPercent: 100, currentPercent: 100 });
    expect(first).toEqual(second); expect(first).not.toBe(second);
    expect(Object.values(first).every(value => value === null || ['number', 'string', 'boolean'].includes(typeof value))).toBe(true);
    first.held = 999; expect(second.held).toBe(0.501); expect(JSON.stringify(comparison)).toBe(original);
    const unavailable = scale(null), again = scale(null);
    expect(unavailable).toEqual(again); expect(unavailable).not.toBe(again);
  });
});
