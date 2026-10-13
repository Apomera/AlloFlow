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
  queenHealth: 90, autoAdvance: false, colonySurvived: true, ...patch });
const held = (patch = {}) => BH.bhHiveInteriorSnapshot(colony(patch));
const compare = (before = {}, after = {}, frame = 2) => BH.bhHiveInteriorComparison(held(before), colony(after), frame);

describe('Held hive readings and comparison', () => {
  it('captures independent raw primitives without notebook, cohorts, display defaults or input mutation', () => {
    const raw = colony({ activeEvent: { id: 'rain' }, notebook: { evidence: 'Keep writing' }, broodCohorts: { workers: [10] }, pollen: null });
    const original = structuredClone(raw), snapshot = BH.bhHiveInteriorSnapshot(raw);
    expect(raw).toEqual(original); expect(snapshot.available).toBe(true);
    expect(snapshot.data.activeEvent).toBe(true);
    expect(snapshot.data).not.toHaveProperty('pollen');
    expect(snapshot.data).not.toHaveProperty('notebook');
    expect(snapshot.data).not.toHaveProperty('broodCohorts');
    raw.honey = 99; raw.activeEvent.id = 'changed';
    expect(snapshot.data.honey).toBe(40); expect(snapshot.data.activeEvent).toBe(true);
  });

  it.each(['day', 'experimentRunSerial', 'simulationSeed', 'modelVersion'])('requires recorded %s without invented defaults', key => {
    for (const value of [undefined, null, [], {}, true]) {
      expect(BH.bhHiveInteriorSnapshot(colony({ [key]: value })).available, String(value)).toBe(false);
    }
  });
  it.each([
    ['day', -1], ['day', 0.5], ['day', 10000001], ['experimentRunSerial', 0],
    ['experimentRunSerial', 10000001], ['simulationSeed', -1], ['simulationSeed', 4294967296],
    ['simulationSeed', 1.5], ['modelVersion', ''], ['modelVersion', ' '], ['modelVersion', 'x'.repeat(65)],
    ['modelVersion', 'model\n1']
  ])('rejects invalid %s = %s', (key, value) => expect(held({ [key]: value }).available).toBe(false));

  it('preserves day zero, seed zero, real zero readings and upper identity bounds', () => {
    expect(held({ day: 0, simulationSeed: 0, experimentRunSerial: 10000000 }).available).toBe(true);
    expect(held({ day: 10000000, simulationSeed: 4294967295 }).available).toBe(true);
    const result = compare({ day: 0, honey: 0 }, { day: 0, honey: 0 });
    expect(result).toMatchObject({ available: true, canSave: true, elapsedDays: 0 });
    expect(result.rows[0]).toMatchObject({ before: '0 honey-equivalent lb', current: '0 honey-equivalent lb', delta: 0, direction: 'Unchanged' });
  });

  it('compares an actual Feed patch on the same day without spending actions or mutating either state', () => {
    const raw = colony({ actionPoints: 3, morale: 70 }), copy = structuredClone(raw);
    const reference = BH.bhHiveInteriorSnapshot(raw), action = BH.bhManagementAction(raw, 'feed_bees');
    const next = { ...raw, ...action.patch }, nextCopy = structuredClone(next);
    const result = BH.bhHiveInteriorComparison(reference, next, 2);
    expect(action.eligible).toBe(true); expect(raw).toEqual(copy); expect(next).toEqual(nextCopy);
    expect(result).toMatchObject({ available: true, elapsedDays: 0 });
    expect(result.interval).toContain('Same modeled day');
    expect(result.rows[0]).toMatchObject({ before: '40 honey-equivalent lb', current: '45 honey-equivalent lb', difference: '+5 honey-equivalent lb' });
    expect(result.text).toContain('Food includes syrup. Differences do not isolate a cause.');
  });

  it('subtracts the exact displayed decimals, including the Intl half-rounding boundary', () => {
    const result = compare({ honey: 0.5005, pollen: 12.345678, queenHealth: 90.123456 }, { honey: 0.501, pollen: 12.3445, queenHealth: 89.9999 });
    expect(result.rows[0]).toMatchObject({ before: '0.501 honey-equivalent lb', current: '0.501 honey-equivalent lb', delta: 0 });
    expect(result.rows[1]).toMatchObject({ before: '12.346 lb', current: '12.345 lb', difference: '-0.001 lb' });
    expect(result.rows[3]).toMatchObject({ before: '90.123 / 100', current: '90 / 100', difference: '-0.123 points' });
    expect(result.text).toContain('Queen: 90.123 / 100 → 90 / 100 (-0.123 points)');
  });

  it.each(['experimentRunSerial', 'simulationSeed', 'modelVersion'])('blocks a different %s', key => {
    const changed = key === 'modelVersion' ? 'colony-daily-1.1' : key === 'simulationSeed' ? 1 : 4;
    const result = compare({}, { [key]: changed });
    expect(result).toMatchObject({ available: false, canSave: false, text: '', elapsedDays: null });
    expect(result.reason).toContain('different run, seed or model');
    expect(result.rows.every(row => row.delta === null)).toBe(true);
  });
  it('blocks backward time and respects a permanent invalidation even after the original day returns', () => {
    const reference = held(), rewind = BH.bhHiveInteriorComparison(reference, colony({ day: 14 }), 2);
    expect(rewind.available).toBe(false); expect(rewind.reason).toContain('earlier than the held day');
    expect(BH.bhHiveInteriorComparison({ ...reference, invalidReason: rewind.reason }, colony({ day: 16 }), 2)).toMatchObject({ available: false, reason: rewind.reason });
  });
  it('keeps a missing metric independently unavailable while comparing known readings', () => {
    const result = compare({ pollen: null }, { day: 16, honey: 45 });
    expect(result).toMatchObject({ available: true, canSave: true, elapsedDays: 1 });
    expect(result.rows[1]).toMatchObject({ before: 'Not recorded', current: '12 lb', delta: null, difference: 'Not comparable', direction: 'Unavailable' });
    expect(result.rows[0].delta).toBe(5);
  });
  it('cannot save a reference with no comparable metrics', () => {
    const missing = { honey: null, pollen: null, brood: null, queenHealth: null };
    const result = compare(missing, missing);
    expect(result).toMatchObject({ available: true, canSave: false });
    expect(result.rows.every(row => row.delta === null)).toBe(true);
  });
  it('keeps both schematics on one frame and never changes the held pattern after a live change', () => {
    const reference = held(), before = BH.bhHiveInteriorFrameModel(reference.data, 2);
    const later = colony({ day: 16, brood: 1000, honey: 0, queenHealth: 20 });
    expect(BH.bhHiveInteriorFrameModel(reference.data, 2)).toEqual(before);
    expect(BH.bhHiveInteriorFrameModel(later, 2).cells).not.toEqual(before.cells);
    for (let frame = 0; frame < 6; frame++) {
      const a = BH.bhHiveInteriorFrameModel(reference.data, frame), b = BH.bhHiveInteriorFrameModel(later, frame);
      expect(a.frame).toBe(frame); expect(b.frame).toBe(frame); expect(a.cells).toHaveLength(231);
      for (const cell of a.cells) expect(cell.role).toBe(BH.bhCombCellRole(cell.u, cell.v, { honeyFill: .5, broodFill: .5, pollenLevel: .4, layingRate: .9, frameDepth: Math.abs(frame - 2.5) / 2.5 }));
    }
  });
  it('shows an unavailable pattern when any required raw reading is missing', () => {
    for (const key of ['honey', 'pollen', 'brood', 'queenHealth']) {
      const result = BH.bhHiveInteriorFrameModel(colony({ [key]: null }), 2);
      expect(result.patternKnown).toBe(false); expect(result.cells.every(cell => cell.role === 'unavailable')).toBe(true);
    }
  });
  it('appends exact comparison evidence while preserving writing, metadata and other review marks', () => {
    const result = compare({}, { day: 16, honey: 45 }), entry = { prediction: 'Keep', evidence: 'My observation', explanation: 'Keep explanation', review: { prediction: true, evidence: true, explanation: true }, custom: { keep: true } };
    const original = structuredClone(entry), added = BH.bhAppendNotebookEvidence(entry, result.text);
    expect(entry).toEqual(original); expect(added.status).toBe('added');
    expect(added.entry).toEqual({ ...entry, evidence: entry.evidence + '\n' + result.text, review: { ...entry.review, evidence: false } });
    expect(BH.bhAppendNotebookEvidence(added.entry, result.text).status).toBe('duplicate');
    expect(BH.bhAppendNotebookEvidence({ ...entry, evidence: 'x'.repeat(1200) }, result.text)).toMatchObject({ status: 'full', entry: { evidence: 'x'.repeat(1200) } });
  });
});
