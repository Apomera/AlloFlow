import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_cellatlas.js';
const DATA_FILE = 'stem_lab/stem_data_cellatlas_muraro.js';
const TOOL_ID = 'cellAtlasLab';

function loadSnapshot() {
  new Function(readFileSync(resolve(process.cwd(), DATA_FILE), 'utf8'))();
}

describe('Cell Atlas Lab pseudoreplication and weighting lesson', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    delete window.__alloCellAtlasRealSnapshots;
    loadSnapshot();
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('computes pooled and equal-replicate summaries from exact aggregate counts', () => {
    const pure = window.__alloCellAtlasPure;
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    const summary = pure.replicateDetectionSummary(snapshot, 'stellate', 'KRT19');

    expect(summary.pooledDetectedCells).toBe(11);
    expect(summary.pooledCellCount).toBe(78);
    expect(summary.pooledDetectionPct).toBe(14.1);
    expect(summary.equalReplicateMeanPct).toBeCloseTo(31.381, 3);
    expect(summary.replicateMinPct).toBe(0);
    expect(summary.replicateMaxPct).toBe(100);
    expect(summary.pooledMatchesReplicateTotals).toBe(true);
    expect(summary.rows.map((row) => [row.detectedCells, row.cellCount])).toEqual([
      [1, 1],
      [0, 6],
      [8, 50],
      [2, 21],
    ]);
  });

  it('labels the cell-level Wilson interval without treating it as donor uncertainty', () => {
    const pure = window.__alloCellAtlasPure;
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    const summary = pure.replicateDetectionSummary(snapshot, 'stellate', 'KRT19');
    const interval = pure.wilsonInterval(11, 78);

    expect(summary.naiveWilsonLowPct).toBeCloseTo(interval.lowPct, 10);
    expect(summary.naiveWilsonHighPct).toBeCloseTo(interval.highPct, 10);
    expect(interval.lowPct).toBeCloseTo(8.1, 1);
    expect(interval.highPct).toBeCloseTo(23.5, 1);
    expect(pure.replicateDetectionSummary(snapshot, 'immune', 'PTPRC')).toBeNull();
  });

  it('renders the weighting contrast and nested-design boundary', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: {
        tissue: 'pancreas',
        view: 'map',
        evidenceMode: 'real',
        pseudorepCell: 'stellate',
        pseudorepGene: 'KRT19',
      },
    });

    expect(html).toContain('Why pooled cells can mislead');
    expect(html).toContain('Cells are nested within people');
    expect(html).toContain('11 detected cells / 78 total cells');
    expect(html).toContain('31.4%');
    expect(html).toContain('0–100%');
    expect(html).toContain('8.1–23.5%');
    expect(html).toContain('not a donor-population confidence interval');
    expect(html).toContain('donor-aware hierarchical or replicate-level model');
  });
});
