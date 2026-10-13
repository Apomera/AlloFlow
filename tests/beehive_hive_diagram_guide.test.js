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
  day: 15, experimentRunSerial: 3, simulationSeed: 777,
  modelVersion: 'colony-daily-1.2', honey: 40, syrup: 5, pollen: 12,
  brood: 6000, queenHealth: 90, autoAdvance: false, colonySurvived: true,
  ...patch
});
const roleId = role => role === 'foundation' ? 'empty' : role;
const held = patch => BH.bhHiveInteriorSnapshot(colony(patch));
const unchangedReason = 'The schematic marks stayed the same. Check the whole-colony readings for smaller changes.';
const missingReason = 'Both drawings need recorded food, pollen, brood and queen-health readings to compare their marks. Whole-colony readings may still be available below.';

describe('Held hive diagram change guide', () => {
  it.each([0, 1, 2, 3, 4, 5])('compares the exact visible cell-key categories in row-major order on frame %s', frame => {
    const reference = held();
    const later = colony({ day: 16, honey: 0, syrup: 0, pollen: 0, brood: 1000, queenHealth: 20 });
    const beforeModel = BH.bhHiveInteriorFrameModel(reference.data, frame);
    const currentModel = BH.bhHiveInteriorFrameModel(later, frame);
    const expected = beforeModel.cells.flatMap((cell, index) => {
      const beforeRole = roleId(cell.role), role = roleId(currentModel.cells[index].role);
      if (beforeRole === role) return [];
      return [{
        row: cell.row, col: cell.col, beforeRole, role,
        beforeLabel: BH.BH_HIVE_INTERIOR_ROLES.find(key => key.id === beforeRole).label,
        label: BH.BH_HIVE_INTERIOR_ROLES.find(key => key.id === role).label
      }];
    });
    const result = BH.bhHiveInteriorDiagramChanges(reference, later, frame);
    expect(result).toMatchObject({ available: true, frame, changes: expected });
    expect(result.reason).toBe(expected.length ? 'Outlined marks differ between the held and current drawings.' : unchangedReason);
    expect(new Set(result.changes.map(cell => `${cell.row}:${cell.col}`)).size).toBe(result.changes.length);
    for (const cell of result.changes) {
      expect(cell.beforeRole).not.toBe(cell.role);
      expect(cell.row).toBeGreaterThanOrEqual(0); expect(cell.row).toBeLessThanOrEqual(10);
      expect(cell.col).toBeGreaterThanOrEqual(0); expect(cell.col).toBeLessThanOrEqual(20);
    }
  });

  it('groups foundation and empty comb together even when the raw diagram role changes between them', () => {
    const reference = held({ honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 });
    const later = colony({ honey: 0, syrup: 0, pollen: 0, brood: 12000, queenHealth: 0 });
    let groupedTransitions = 0;
    for (let frame = 0; frame < 6; frame++) {
      const before = BH.bhHiveInteriorFrameModel(reference.data, frame);
      const current = BH.bhHiveInteriorFrameModel(later, frame);
      const result = BH.bhHiveInteriorDiagramChanges(reference, later, frame);
      expect(result.available).toBe(true);
      for (const [index, cell] of before.cells.entries()) {
        const next = current.cells[index];
        if (cell.role !== next.role && roleId(cell.role) === 'empty' && roleId(next.role) === 'empty') {
          groupedTransitions++;
          expect(result.changes.some(change => change.row === cell.row && change.col === cell.col)).toBe(false);
        }
      }
      expect(result.changes.every(change => change.beforeRole !== 'foundation' && change.role !== 'foundation')).toBe(true);
    }
    expect(groupedTransitions).toBeGreaterThan(0);
  });

  it('reports unchanged drawings when an actual Feed choice changes the whole-colony food reading', () => {
    const raw = colony({ actionPoints: 3, morale: 70 });
    const action = BH.bhManagementAction(raw, 'feed_bees');
    expect(action.eligible).toBe(true);
    const later = { ...raw, ...action.patch }, reference = BH.bhHiveInteriorSnapshot(raw);
    expect(BH.bhHiveInteriorComparison(reference, later, 2).rows[0].delta).toBe(5);
    for (let frame = 0; frame < 6; frame++) {
      expect(BH.bhHiveInteriorDiagramChanges(reference, later, frame)).toEqual({ available: true, frame, changes: [], reason: unchangedReason });
    }
  });

  it('treats identical and all-zero recorded readings as available comparisons without invented marks', () => {
    for (const patch of [{}, { day: 0, simulationSeed: 0, honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 }]) {
      const raw = colony(patch), reference = BH.bhHiveInteriorSnapshot(raw);
      for (let frame = 0; frame < 6; frame++) {
        expect(BH.bhHiveInteriorDiagramChanges(reference, raw, frame)).toEqual({ available: true, frame, changes: [], reason: unchangedReason });
      }
    }
  });

  it.each(['held', 'current'].flatMap(side => ['honey', 'pollen', 'brood', 'queenHealth'].map(key => [side, key])))('keeps %s drawings unavailable when %s is missing or invalid', (side, key) => {
    const maximum = key === 'queenHealth' ? 100 : 1000000;
    for (const value of [undefined, null, NaN, Infinity, -1, maximum + 1, '0', [], {}, true]) {
      const reference = side === 'held' ? held({ [key]: value }) : held();
      const current = side === 'current' ? colony({ [key]: value }) : colony();
      const readings = BH.bhHiveInteriorComparison(reference, current, 2);
      expect(readings.available).toBe(true);
      expect(readings.rows.some(row => row.delta !== null)).toBe(true);
      expect(BH.bhHiveInteriorDiagramChanges(reference, current, 2)).toEqual({ available: false, frame: 2, changes: [], reason: missingReason });
    }
  });

  it.each([
    ['experimentRunSerial', 4], ['simulationSeed', 778], ['modelVersion', 'colony-daily-1.1'],
    ['day', 14], ['day', undefined], ['day', -1], ['day', 0.5], ['day', 10000001],
    ['experimentRunSerial', 0], ['simulationSeed', 4294967296], ['simulationSeed', 1.5],
    ['modelVersion', 'unknown-model'], ['modelVersion', ''], ['modelVersion', 'model\n1']
  ])('uses the comparison guard for invalid or changed current %s = %s', (key, value) => {
    const reference = held(), current = colony({ [key]: value });
    const comparison = BH.bhHiveInteriorComparison(reference, current, 4);
    expect(comparison.available).toBe(false);
    expect(BH.bhHiveInteriorDiagramChanges(reference, current, 4)).toEqual({ available: false, frame: comparison.frame, changes: [], reason: comparison.reason });
  });

  it.each(['day', 'experimentRunSerial', 'simulationSeed', 'modelVersion'])('requires recorded held %s before trying diagram comparison', key => {
    const reference = held({ [key]: undefined }), current = colony();
    const comparison = BH.bhHiveInteriorComparison(reference, current, 1);
    expect(comparison.available).toBe(false);
    expect(BH.bhHiveInteriorDiagramChanges(reference, current, 1)).toEqual({ available: false, frame: comparison.frame, changes: [], reason: comparison.reason });
  });

  it('honors sticky reference invalidation even after the original run and day return', () => {
    const invalidReason = 'The colony is earlier than the held day. Hold a new reference before comparing.';
    const reference = { ...held(), invalidReason };
    expect(BH.bhHiveInteriorDiagramChanges(reference, colony({ day: 16 }), 2)).toEqual({ available: false, frame: 2, changes: [], reason: invalidReason });
  });

  it('does not interpret arrays or primitive values as recorded held/current colony data', () => {
    const fakeArray = Object.assign([], colony());
    for (const value of [undefined, null, [], fakeArray, 'colony', 0, true]) {
      const missingCurrent = BH.bhHiveInteriorDiagramChanges(held(), value, 2);
      const missingHeld = BH.bhHiveInteriorDiagramChanges({ data: value }, colony(), 2);
      for (const result of [missingCurrent, missingHeld]) {
        expect(result.available).toBe(false); expect(result.changes).toEqual([]);
        expect(result.reason).toMatch(/recorded.*day|run, seed and model/i);
      }
    }
  });

  it.each([undefined, null, -1, 6, 2.5, '2', NaN, Infinity])('uses the same normalized frame as the underlying comparison for frame %s', frameIndex => {
    const reference = held(), current = colony({ honey: 0, syrup: 0, brood: 0, pollen: 0 });
    const comparison = BH.bhHiveInteriorComparison(reference, current, frameIndex);
    expect(comparison.frame).toBe(0);
    expect(BH.bhHiveInteriorDiagramChanges(reference, current, frameIndex)).toEqual(BH.bhHiveInteriorDiagramChanges(reference, current, 0));
  });

  it('keeps held readings, current management state and notebook writing unchanged across inspection and invalid comparisons', () => {
    const reference = { ...held(), custom: { preserve: ['local reference'] } };
    const current = colony({ day: 16, honey: 0, syrup: 0, brood: 0, pollen: 0,
      actionPoints: 3, notebook: { beekeeper: { prediction: 'Keep my prediction', evidence: 'Keep my evidence', explanation: 'Keep my explanation' } },
      managementTrail: [{ action: 'feed_bees' }], broodCohorts: { workers: [10, 20] } });
    const referenceBefore = structuredClone(reference), currentBefore = structuredClone(current);
    const first = BH.bhHiveInteriorDiagramChanges(reference, current, 2);
    expect(first.changes.length).toBeGreaterThan(0);
    first.changes[0].label = 'Changed returned result';
    first.changes[0].row = 999;
    expect(BH.bhHiveInteriorDiagramChanges(reference, current, 2).changes[0].row).not.toBe(999);
    for (let frame = 0; frame < 6; frame++) BH.bhHiveInteriorDiagramChanges(reference, current, frame);
    BH.bhHiveInteriorDiagramChanges(reference, { ...current, day: 14 }, 2);
    BH.bhHiveInteriorDiagramChanges(reference, { ...current, pollen: null }, 2);
    expect(reference).toEqual(referenceBefore); expect(current).toEqual(currentBefore);
  });
});
