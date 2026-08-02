import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const CELL = readFileSync('stem_lab/stem_tool_cell.js', 'utf8');
const CELL_MIRROR = readFileSync('desktop/web-app/public/stem_lab/stem_tool_cell.js', 'utf8');
const HOST = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
const HOST_MIRROR = readFileSync('desktop/web-app/public/stem_lab/stem_lab_module.js', 'utf8');

describe('cell studio progress persistence contract', () => {
  it('ships the versioned migration and hydration path', () => {
    expect(CELL).toContain('var CELL_PROGRESS_SCHEMA_VERSION = 1;');
    expect(CELL).toContain('function normalizeCellProgress(raw, legacyCell)');
    expect(CELL).toContain('function applyCellProgressToCell(cell, record, type)');
    expect(CELL).toContain('_cellProgressHydrated');
    expect(CELL).toContain('cellProgress: progress');
  });

  it('persists only the portable progress record through both host mirrors', () => {
    expect(HOST).toContain("'cellProgress'");
    expect(HOST_MIRROR).toContain("'cellProgress'");
    expect(HOST_MIRROR).toBe(HOST);
    expect(CELL_MIRROR).toBe(CELL);
  });

  it('exposes explicit portable transfer and reset controls', () => {
    expect(CELL).toContain('function exportCellProgress()');
    expect(CELL).toContain('function importCellProgress()');
    expect(CELL).toContain('function resetAllCellProgress()');
    expect(CELL).toContain('data-cell-progress-portability');
    expect(CELL).toContain('Import failed: this is not valid JSON.');
    expect(CELL).toContain('Import failed: expected a progress object.');
    expect(CELL).toContain('newer version');
  });
});