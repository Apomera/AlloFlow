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

describe('Cell Atlas Lab pseudonymous donor-replicate transfer', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    delete window.__alloCellAtlasRealSnapshots;
    loadSnapshot();
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('contains four aggregate-only pseudonymous replicates with exact denominators', () => {
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    expect(snapshot.snapshotVersion).toBe(2);
    expect(snapshot.replicatePolicy).toMatchObject({
      pseudonymized: true,
      sourceDonorIdsIncluded: false,
      lowCellCountThreshold: 10,
    });
    expect(snapshot.replicates.map((item) => ({
      id: item.id,
      primary: item.primaryCellCount,
      mapped: item.mappedCellCount,
    }))).toEqual([
      { id: 'replicate_a', primary: 182, mapped: 172 },
      { id: 'replicate_b', primary: 574, mapped: 510 },
      { id: 'replicate_c', primary: 687, mapped: 681 },
      { id: 'replicate_d', primary: 683, mapped: 654 },
    ]);
    expect(snapshot.replicates.reduce((sum, item) => sum + item.primaryCellCount, 0)).toBe(2126);
    expect(snapshot.replicates.reduce((sum, item) => sum + item.mappedCellCount, 0)).toBe(2017);
    expect(snapshot.replicates[0].cellTypes.stellate.cellCount).toBe(1);
    expect(snapshot.replicates[1].cellTypes.endothelial.cellCount).toBe(2);
    expect(snapshot.replicates[1].cellTypes.endothelial.lowCellCount).toBe(true);
    expect(snapshot.replicates[1].cellTypes.endothelial.genes.KDR.detectionPct).toBe(100);
  });

  it('rotates each held-out replicate against empirical centroids from the other three', () => {
    const pure = window.__alloCellAtlasPure;
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    const relative = pure.leaveOneReplicateOutTransfer(snapshot, 'relativeMeanPct');
    const detection = pure.leaveOneReplicateOutTransfer(snapshot, 'detectionPct');

    expect(relative.map((item) => item.alignedCount)).toEqual([7, 7, 7, 7]);
    expect(relative.every((item) => item.trainingReplicateCount === 3)).toBe(true);
    expect(relative.reduce((sum, item) => sum + item.alignedCount, 0)).toBe(28);
    expect(detection.map((item) => item.alignedCount)).toEqual([3, 7, 5, 7]);
    expect(detection.reduce((sum, item) => sum + item.alignedCount, 0)).toBe(22);
    expect(pure.leaveOneReplicateOutTransfer(snapshot, 'detectionPct')).toBe(detection);
  });

  it('exposes exact replicate evidence without source donor identifiers', () => {
    const pure = window.__alloCellAtlasPure;
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    expect(pure.replicateEvidence(snapshot, 'replicate_b', 'endothelial', 'KDR')).toEqual({
      detectedCells: 2,
      detectionPct: 100,
      meanRawCount: 152,
      relativeMeanPct: 100,
    });
    expect(pure.replicateEvidence(snapshot, 'missing', 'endothelial', 'KDR')).toBeNull();
    const serialized = JSON.stringify(snapshot);
    for (const sourceId of ['D28', 'D29', 'D30', 'D31']) {
      expect(serialized).not.toContain(sourceId);
    }
  });

  it('renders denominator-aware evidence and internal-validation boundaries', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: {
        tissue: 'pancreas',
        view: 'map',
        evidenceMode: 'real',
        replicateId: 'replicate_b',
        replicateCell: 'endothelial',
        replicateGene: 'KDR',
        replicateMetric: 'detectionPct',
      },
    });
    expect(html).toContain('Real donor-replicate evidence');
    expect(html).toContain('Does the pattern transfer across people?');
    expect(html).toContain('Original donor IDs and cell rows are not exported');
    expect(html).toContain('28 of 28');
    expect(html).toContain('22 of 28');
    expect(html).toContain('Replicate B has 2 endothelial cells');
    expect(html).toContain('Held-out here is internal, not external');
    expect(html).toContain('do not establish population coverage or clinical validity');
    expect(html).toContain('External study status: not included');
    expect(html).toContain('separate version-pinned pancreas study');
  });

  it('requires two replicates, both metrics, and cautious denominator reasoning', () => {
    const quest = window.StemLab._registry[TOOL_ID].questHooks.find(
      (item) => item.id === 'atlas_replicates',
    );
    const reproducibilityQuest = window.StemLab._registry[TOOL_ID].questHooks.find(
      (item) => item.id === 'atlas_reproducibility',
    );
    expect(reproducibilityQuest).toBeDefined();
    expect(reproducibilityQuest.check({ reproducibilityInterpretation: 'external-study' })).toBe(true);
    expect(reproducibilityQuest.check({ reproducibilityInterpretation: 'heldout' })).toBe(false);
    const complete = {
      replicatesVisited: { replicate_a: true, replicate_b: true },
      replicateMetricsSeen: { relativeMeanPct: true, detectionPct: true },
      replicateInterpretation: 'cautious',
    };
    expect(quest).toBeDefined();
    expect(quest.check(complete)).toBe(true);
    expect(quest.check({ ...complete, replicateInterpretation: 'population' })).toBe(false);
    expect(quest.check({ ...complete, replicatesVisited: { replicate_a: true } })).toBe(false);
  });
});
