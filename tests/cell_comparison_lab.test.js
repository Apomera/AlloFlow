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
describe('Cell comparison evidence collection', () => {
  it('preserves spaces and line breaks in all draft fields while bounding their length', () => {
    const writing = '  First sentence. \nSecond line.  ';
    const model = C.cellComparisonModel(database, { _cmpDrafts: { '0:1': { claim: writing, evidence: writing, reasoning: writing } } });
    for (const field of ['claim', 'evidence', 'reasoning']) expect(model.draft[field]).toBe(writing);
    expect(C.cellComparisonModel(database, { _cmpDrafts: { '0:1': { claim: 'x'.repeat(3100), evidence: {}, reasoning: null } } }).draft).toMatchObject({ claim: 'x'.repeat(3000), evidence: '', reasoning: '' });
  });
  it('validates selected property keys and keeps them with their unordered pair', () => {
    const raw = { _cmpDrafts: { '0:1': { evidenceKeys: ['movement', 'bad', 'movement', null, 'kingdom'], claim: 'My claim' } } };
    const model = C.cellComparisonModel(database, raw);
    expect(model.kept.map(row => row.key)).toEqual(['kingdom', 'movement']);
    expect(model.draft.evidenceKeys).toEqual(['kingdom', 'movement']);
    const swapped = C.cellComparisonModel(database, { ...raw, _cmpA: 1, _cmpB: 0, _cmpFilter: 'shared' });
    expect(swapped.kept.find(row => row.key === 'movement')).toMatchObject({ a: 'Flagella', b: 'Cilia' });
    expect(swapped.draft.claim).toBe('My claim');
    expect(C.cellComparisonModel(database, { ...raw, _cmpB: 2 }).kept).toEqual([]);
    expect(C.cellComparisonModel(database, { _cmpDrafts: { '0:1': { evidenceKeys: 'movement' } } }).kept).toEqual([]);
  });
  it('exports kept evidence independently of the visible property filter', () => {
    const report = C.cellComparisonReport(database, { _cmpFilter: 'shared', _cmpDrafts: { '0:1': { evidenceKeys: ['movement'], evidence: 'My own explanation. ' } } });
    const kept = report.split('KEPT REFERENCE EVIDENCE\n')[1].split('CLAIM')[0];
    expect(kept).toContain('Movement\nA: Cilia\nB: Flagella');
    expect(kept).not.toContain('Habitat');
    expect(report).toContain('My own explanation. ');
    expect(C.cellComparisonReport(database, {})).not.toContain('KEPT REFERENCE EVIDENCE');
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
