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

describe('Interactive hive cell lens', () => {
  it.each([0, 1, 2, 3, 4, 5])('uses the exact current diagram cells and cell-key labels on frame %s', frame => {
    const data = colony(), model = BH.bhHiveInteriorFrameModel(data, frame);
    for (const cell of model.cells) {
      const lens = BH.bhHiveInteriorLens(data, frame, cell.row, cell.col);
      const key = BH.BH_HIVE_INTERIOR_ROLES.find(role => role.id === roleId(cell.role));
      expect(lens).toMatchObject({ available: true, frame, row: cell.row, col: cell.col });
      expect(lens.selected).toEqual(cell);
      expect(lens.roleId).toBe(key.id);
      expect(lens.label).toBe(key.label);
    }
  });

  it('covers every cell-key role while keeping foundation grouped with unmarked comb', () => {
    const observed = new Map();
    for (let frame = 0; frame < 6; frame++) {
      const model = BH.bhHiveInteriorFrameModel(colony(), frame);
      for (const cell of model.cells) {
        if (!observed.has(cell.role)) observed.set(cell.role, BH.bhHiveInteriorLens(colony(), frame, cell.row, cell.col));
      }
    }
    expect([...observed.keys()].sort()).toEqual(['honey', 'pollen', 'open_brood', 'capped_brood', 'drone_brood', 'empty', 'foundation'].sort());
    for (const [rawRole, lens] of observed) {
      const key = BH.BH_HIVE_INTERIOR_ROLES.find(role => role.id === roleId(rawRole));
      expect(lens.roleId).toBe(key.id);
      expect(lens.label).toBe(key.label);
    }
    expect(observed.get('foundation').selected.role).toBe('foundation');
    expect(observed.get('foundation').label).toBe('Unmarked comb');
    expect(observed.get('empty').label).toBe('Unmarked comb');
  });

  it.each([
    [0, 0, 43, 47, '-12 -1 110 96'],
    [0, 20, 543, 47, '488 -1 110 96'],
    [1, 0, 55.5, 69, '0.5 21 110 96'],
    [5, 10, 305.5, 157, '250.5 109 110 96'],
    [10, 0, 43, 267, '-12 219 110 96'],
    [10, 20, 543, 267, '488 219 110 96']
  ])('centers the magnified drawing on row %s, column %s, including staggered rows', (row, col, x, y, viewBox) => {
    const lens = BH.bhHiveInteriorLens(colony(), 2, row, col);
    expect(lens).toMatchObject({ available: true, row, col, x, y, viewBox });
    expect(lens.selected).toMatchObject({ row, col });
  });

  it('limits nearby cells to the current diagram and the selected five-by-five neighborhood', () => {
    for (let frame = 0; frame < 6; frame++) {
      const model = BH.bhHiveInteriorFrameModel(colony(), frame);
      for (const [row, col] of [[0, 0], [0, 20], [5, 10], [10, 0], [10, 20]]) {
        const lens = BH.bhHiveInteriorLens(colony(), frame, row, col);
        const expected = model.cells.filter(cell => Math.abs(cell.row - row) <= 2 && Math.abs(cell.col - col) <= 2);
        expect(lens.neighbors).toEqual(expected);
        expect(lens.neighbors.length).toBeGreaterThanOrEqual(9);
        expect(lens.neighbors.length).toBeLessThanOrEqual(25);
        expect(lens.neighbors).toContainEqual(lens.selected);
        for (const cell of lens.neighbors) {
          expect(cell.row).toBeGreaterThanOrEqual(0); expect(cell.row).toBeLessThanOrEqual(10);
          expect(cell.col).toBeGreaterThanOrEqual(0); expect(cell.col).toBeLessThanOrEqual(20);
        }
      }
    }
    expect(BH.bhHiveInteriorLens(colony(), 2, 5, 10).neighbors).toHaveLength(25);
    expect(BH.bhHiveInteriorLens(colony(), 2, 0, 0).neighbors).toHaveLength(9);
  });

  it.each([
    [undefined, 10], [null, 10], ['5', 10], [true, 10], [[], 10], [{}, 10],
    [-1, 10], [11, 10], [5.5, 10], [NaN, 10], [Infinity, 10],
    [5, undefined], [5, null], [5, '10'], [5, false], [5, []], [5, {}],
    [5, -1], [5, 21], [5, 10.5], [5, NaN], [5, -Infinity]
  ])('rejects unrecorded or invalid row %s / column %s without choosing a default cell', (row, col) => {
    const lens = BH.bhHiveInteriorLens(colony(), 2, row, col);
    expect(lens).toMatchObject({ available: false, selected: null, neighbors: [] });
    expect(lens.reason).toMatch(/row.*column/i);
  });

  it.each(['honey', 'pollen', 'brood', 'queenHealth'])('keeps the lens unavailable when required %s is missing or invalid', key => {
    for (const value of [undefined, null, NaN, Infinity, -1, '0', [], {}, true]) {
      const data = colony({ [key]: value }), lens = BH.bhHiveInteriorLens(data, 2, 5, 10);
      expect(lens.available, `${key}: ${String(value)}`).toBe(false);
      expect(lens.selected).toMatchObject({ row: 5, col: 10, role: 'unavailable' });
      expect(lens.reason).toMatch(/required.*reading.*not recorded/i);
      expect(lens.neighbors.every(cell => cell.role === 'unavailable')).toBe(true);
    }
  });

  it('does not treat arrays or non-object inputs as recorded colony readings', () => {
    const arrayWithReadings = Object.assign([], colony());
    for (const data of [undefined, null, [], arrayWithReadings, 'colony', 0, true]) {
      const lens = BH.bhHiveInteriorLens(data, 2, 5, 10);
      expect(lens.available).toBe(false);
      expect(lens.selected.role).toBe('unavailable');
      expect(lens.neighbors.every(cell => cell.role === 'unavailable')).toBe(true);
    }
  });

  it('preserves recorded zeros without inventing food, pollen, or brood', () => {
    const data = colony({ day: 0, simulationSeed: 0, honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 });
    for (let frame = 0; frame < 6; frame++) {
      const lens = BH.bhHiveInteriorLens(data, frame, 5, 10);
      expect(lens).toMatchObject({ available: true, roleId: 'empty', label: 'Unmarked comb' });
      expect(lens.selected.role).toBe('empty');
      expect(lens.neighbors.every(cell => cell.role === 'empty' || cell.role === 'foundation')).toBe(true);
    }
  });

  it('does not mutate readings, notebook writing, or management state when examining cells', () => {
    const data = colony({ actionPoints: 3, notebook: { evidence: 'Keep my evidence' }, managementTrail: [{ action: 'feed_bees' }] });
    const before = structuredClone(data);
    BH.bhHiveInteriorLens(data, 4, 6, 11);
    BH.bhHiveInteriorLens(data, 4, null, 11);
    expect(data).toEqual(before);
  });

  it('recomputes current readings at the same coordinate without changing the held reference', () => {
    const data = colony(), reference = BH.bhHiveInteriorSnapshot(data);
    const referenceBefore = structuredClone(reference), heldModel = BH.bhHiveInteriorFrameModel(reference.data, 2);
    const current = colony({ day: 16, honey: 0, pollen: 0, brood: 0, queenHealth: 0 });
    const currentBefore = structuredClone(current), currentModel = BH.bhHiveInteriorFrameModel(current, 2);
    const changedIndex = heldModel.cells.findIndex((cell, index) => cell.role !== currentModel.cells[index].role);
    expect(changedIndex).toBeGreaterThanOrEqual(0);
    const { row, col } = heldModel.cells[changedIndex];
    const heldLens = BH.bhHiveInteriorLens(reference.data, 2, row, col);
    const liveLens = BH.bhHiveInteriorLens(current, 2, row, col);
    expect(heldLens.selected).toEqual(heldModel.cells[changedIndex]);
    expect(liveLens.selected).toEqual(currentModel.cells[changedIndex]);
    expect(liveLens.selected.role).not.toBe(heldLens.selected.role);
    expect(BH.bhHiveInteriorLens(reference.data, 2, row, col)).toEqual(heldLens);
    expect(reference).toEqual(referenceBefore); expect(current).toEqual(currentBefore);
  });
});
