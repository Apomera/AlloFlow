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

describe('Cell Atlas Lab marker-panel design extension', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    delete window.__alloCellAtlasRealSnapshots;
    loadSnapshot();
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('evaluates arbitrary non-empty panels without altering the snapshot', () => {
    const pure = window.__alloCellAtlasPure;
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    const before = JSON.stringify(snapshot);
    const represented = ['INS', 'GCG', 'SST', 'KRT19', 'PRSS1', 'COL3A1', 'KDR'];
    const searchedDetection = ['INS', 'KRT19', 'PRSS1', 'COL3A1', 'KDR'];

    expect(pure.evaluateGenePanel(snapshot, 'relativeMeanPct', represented).alignedCount).toBe(7);
    expect(pure.evaluateGenePanel(snapshot, 'detectionPct', snapshot.genes).alignedCount).toBe(1);
    expect(pure.evaluateGenePanel(snapshot, 'detectionPct', searchedDetection).alignedCount).toBe(5);
    expect(pure.evaluateGenePanel(snapshot, 'relativeMeanPct', []).rows).toEqual([]);
    expect(JSON.stringify(snapshot)).toBe(before);
  });

  it('searches all 255 panels and exposes the best apparent frontier by size', () => {
    const pure = window.__alloCellAtlasPure;
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    const relative = pure.searchGenePanels(snapshot, 'relativeMeanPct');
    const detection = pure.searchGenePanels(snapshot, 'detectionPct');

    expect(pure.searchGenePanels(snapshot, 'relativeMeanPct')).toBe(relative);
    expect(pure.searchGenePanels(snapshot, 'detectionPct')).toBe(detection);
    expect(relative.map((row) => row.size)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(relative.map((row) => row.alignedCount)).toEqual([2, 2, 3, 4, 5, 6, 7, 7]);
    expect(relative.find((row) => row.size === 7).genes).toEqual([
      'INS', 'GCG', 'SST', 'KRT19', 'PRSS1', 'COL3A1', 'KDR',
    ]);
    expect(detection.map((row) => row.alignedCount)).toEqual([1, 2, 3, 4, 5, 5, 1, 1]);
    expect(detection.find((row) => row.size === 5).genes).toEqual([
      'INS', 'KRT19', 'PRSS1', 'COL3A1', 'KDR',
    ]);
  });

  it('renders current-panel results, the search frontier, and the validation warning', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: {
        tissue: 'pancreas',
        view: 'map',
        evidenceMode: 'real',
        panelMetric: 'detectionPct',
        panelGenes: { INS: true, KRT19: true, PRSS1: true, COL3A1: true, KDR: true },
      },
    });

    expect(html).toContain('Exhaustive 255-panel search');
    expect(html).toContain('Can a smaller panel preserve the distinctions?');
    expect(html).toContain('5 of 7');
    expect(html).toContain('Best apparent agreement found at each panel size');
    expect(html).toContain('This is resubstitution, not validation');
    expect(html).toContain('held-out donors, datasets, technologies');
    expect(html).toContain('Adding more genes must always improve');
  });
});
