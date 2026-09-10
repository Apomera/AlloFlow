import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const database = [
  { name: 'A', kingdom: 'Protist', cellType: 'Eukaryote', size: '50 µm', habitat: ' Freshwater  ponds ', feeding: '', reproduction: 'Division', movement: 'Cilia' },
  { name: 'B', kingdom: 'protist', cellType: 'Eukaryote', size: '10 µm', habitat: 'freshwater ponds', reproduction: 'Division', movement: 'Flagella' },
  { name: 'C', kingdom: 'Bacteria', cellType: 'Prokaryote', size: '2 µm', habitat: 'Soil', feeding: 'Sugars', reproduction: 'Division', movement: 'Flagella' },
];
let C;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_cell.js', 'cell');
  C = window.__alloCellPure;
});
describe('Cell comparison model', () => {
  it('recovers invalid selections and filters without losing the comparison', () => {
    for (const value of [999, -1, 1.5, {}, 'missing', null, Infinity]) {
      const model = C.cellComparisonModel(database, { _cmpA: value, _cmpB: value, _cmpFilter: 'invalid' });
      expect(model.aIndex).toBe(0);
      expect(model.bIndex).toBe(1);
      expect(model.visible).toHaveLength(7);
    }
    expect(C.cellComparisonModel(database, { _cmpA: '2', _cmpB: '0' }).aIndex).toBe(2);
  });
  it('normalizes whitespace and case but never counts missing values as shared', () => {
    const model = C.cellComparisonModel(database, {});
    expect(model.shared).toBe(4);
    expect(model.different).toBe(2);
    expect(model.unknown).toBe(1);
    expect(model.rows.find(row => row.key === 'feeding')).toMatchObject({ a: 'Not recorded', b: 'Not recorded', status: 'unknown' });
    expect(C.cellComparisonModel(database, { _cmpFilter: 'different' }).visible.map(row => row.key)).toEqual(['size', 'movement']);
  });
  it('retains the same draft on swapping and isolates another pair', () => {
    const raw = { _cmpDrafts: { '0:1': { claim: 'Different movements', evidence: 'Cilia versus flagella', reasoning: 'Different structures' } } };
    expect(C.cellComparisonModel(database, raw).draft.claim).toBe('Different movements');
    expect(C.cellComparisonModel(database, { ...raw, _cmpA: 1, _cmpB: 0 }).draft.claim).toBe('Different movements');
    expect(C.cellComparisonModel(database, { ...raw, _cmpB: 2 }).draft.claim).toBe('');
  });
  it('reports every property even when the view is filtered', () => {
    const report = C.cellComparisonReport(database, { _cmpFilter: 'different', _cmpDrafts: { '0:1': { claim: 'My claim' } } });
    expect(report).toContain('Habitat (shared)');
    expect(report).toContain('Nutrition (unknown)');
    expect(report).toContain('My claim');
    expect(report).toContain('not results from an experiment');
    expect(C.cellComparisonReport([], {})).toBe('No organisms available.');
  });
});
describe('Cell comparison integrated rendering', () => {
  it('renders invalid saved selections with real organisms and a complete workspace', () => {
    const html = renderTool('cell', { cell: { mode: 'compare', _cmpA: 9999, _cmpB: -1 } });
    expect(html).toContain('data-cell-comparison-lab');
    expect(html).toContain('Amoeba');
    expect(html).toContain('Paramecium');
    expect(html).toContain('Download comparison report');
    expect(html).toContain('Comparison reasoning');
    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('undefined');
  });
  it('explicitly identifies structures absent from a model', () => {
    const html = renderTool('cell', { cell: { mode: 'interior', interiorCompare: true, interiorSel: 'nucleus', interiorCellType: 'animal', interiorPaused: true } });
    expect(html).toContain('Nucleus: absent from this model');
    expect(html).toContain('Nucleus: present in this model');
    expect(html).toContain('not drawn to the same physical scale');
  });
  it('ships the same cell source in the desktop mirror', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_cell.js', 'utf8')).toBe(readFileSync('stem_lab/stem_tool_cell.js', 'utf8'));
  });
});
