import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_cellatlas.js';
const DATA_FILE = 'stem_lab/stem_data_cellatlas_muraro.js';
const TOOL_ID = 'cellAtlasLab';
const PINNED_SHA = '183673651cfa8c473a26641d42011d43be44eb2fea44e6e6ab8e2b0065d07483';

function loadRealSnapshot() {
  const source = readFileSync(resolve(process.cwd(), DATA_FILE), 'utf8');
  new Function(source)();
  return window.__alloCellAtlasRealSnapshots.muraroPancreas;
}

describe('Cell Atlas Lab version-pinned real-data bridge', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    delete window.__alloCellAtlasRealSnapshots;
    loadRealSnapshot();
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('bundles an aggregate-only snapshot from the exact public dataset version', () => {
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    expect(snapshot.snapshotVersion).toBe(2);
    expect(snapshot.id).toBe('muraro-pancreas-aggregates-v2');
    expect(snapshot.source.collectionId).toBe('6e8c5415-302c-492a-a5f9-f29c57ff18fb');
    expect(snapshot.source.datasetId).toBe('b07e5164-baf6-43d2-bdba-5a249d0da879');
    expect(snapshot.source.datasetVersionId).toBe('ac56150b-add4-4336-9059-6d3d3ce17f3b');
    expect(snapshot.source.assetSha256).toBe(PINNED_SHA);
    expect(snapshot.source.assetBytes).toBe(53067951);
    expect(snapshot.source.rawMatrixShape).toEqual([2126, 15643]);
    expect(snapshot.source.primaryCellCount).toBe(2126);
    expect(snapshot.source.donorCount).toBe(4);
    expect(snapshot.privacy).toEqual({
      aggregateOnly: true,
      containsCellRows: false,
      containsDonorIdentifiers: false,
      containsSequences: false,
    });
    expect(snapshot.replicatePolicy.sourceDonorIdsIncluded).toBe(false);
    expect(snapshot.replicatePolicy.pseudonymized).toBe(true);
    expect(snapshot.replicates).toHaveLength(4);
    expect(JSON.stringify(snapshot)).not.toContain('"D28"');
    expect(JSON.stringify(snapshot)).not.toContain('"D29"');
  });

  it('maps 2,017 source cells without fabricating an unavailable immune group', () => {
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    const pure = window.__alloCellAtlasPure;
    expect(pure.mappedSnapshotCellCount(snapshot)).toBe(2017);
    expect(snapshot.cellTypes.immune.available).toBe(false);
    expect(snapshot.cellTypes.immune.cellCount).toBe(0);
    expect(snapshot.cellTypes.immune.reason).toContain('does not fabricate');
    expect(snapshot.cellTypes.beta.sourceCellType).toBe('type B pancreatic cell');
    expect(snapshot.cellTypes.beta.cellCount).toBe(448);
    expect(snapshot.cellTypes.alpha.cellCount).toBe(812);
  });

  it('preserves real marker magnitude while exposing misleading broad detection', () => {
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    const canonical = {
      beta: 'INS',
      alpha: 'GCG',
      delta: 'SST',
      ductal: 'KRT19',
      acinar: 'PRSS1',
      stellate: 'COL3A1',
      endothelial: 'KDR',
    };
    for (const [cellId, gene] of Object.entries(canonical)) {
      expect(snapshot.cellTypes[cellId].genes[gene].relativeMeanPct, `${cellId}:${gene}`).toBe(100);
    }

    expect(snapshot.cellTypes.acinar.genes.GCG.detectionPct).toBe(100);
    expect(snapshot.cellTypes.acinar.genes.GCG.relativeMeanPct).toBe(2.4);
    expect(snapshot.cellTypes.alpha.genes.GCG.meanRawCount).toBeGreaterThan(
      snapshot.cellTypes.acinar.genes.GCG.meanRawCount * 40,
    );
  });

  it('renders both real metrics with exact provenance and an interpretation checkpoint', () => {
    const detection = renderTool(TOOL_ID, {
      cellAtlasLab: {
        tissue: 'pancreas',
        view: 'map',
        evidenceMode: 'real',
        realMetric: 'detectionPct',
        selectedCell: 'acinar',
        selectedGene: 'GCG',
      },
    });
    expect(detection).toContain('Real Muraro snapshot');
    expect(detection).toContain('raw RNA detection frequency');
    expect(detection).toContain('2126');
    expect(detection).toContain('2017');
    expect(detection).toContain('GCG audit:');
    expect(detection).toContain('100% detected');
    expect(detection).toContain('within-gene relative mean 2.4%');
    expect(detection).toContain('Detected does not mean defining');
    expect(detection).toContain(PINNED_SHA);

    const relative = renderTool(TOOL_ID, {
      cellAtlasLab: {
        tissue: 'pancreas',
        view: 'map',
        evidenceMode: 'real',
        realMetric: 'relativeMeanPct',
        selectedCell: 'alpha',
        selectedGene: 'GCG',
      },
    });
    expect(relative).toContain('within-gene relative mean raw signal');
    expect(relative).toContain('Compare cell types within one gene only');
  });

  it('honestly renders an unavailable source identity instead of a zero profile', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: {
        tissue: 'pancreas',
        view: 'map',
        evidenceMode: 'real',
        selectedCell: 'immune',
        selectedGene: 'PTPRC',
      },
    });
    expect(html).toContain('Not represented in this snapshot');
    expect(html).toContain('does not fabricate one');
    expect(html).toContain('Immune cell *');
  });

  it('shows how the aggregate snapshot can be reproduced and audited', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: { tissue: 'pancreas', view: 'source' },
    });
    expect(html).toContain('Reproducible offline bridge');
    expect(html).toContain('aggregate counts and marker summaries only');
    expect(html).toContain('dev-tools/generate_cellatlas_real_snapshot.py');
    expect(html).toContain('Pinned H5AD asset');
    expect(html).toContain(PINNED_SHA);
  });

  it('loads the data before the tool in every production surface', () => {
    const files = [
      readFileSync(resolve(process.cwd(), 'build.js'), 'utf8'),
      readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8'),
      readFileSync(resolve(process.cwd(), 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8'),
    ];
    for (const source of files) {
      const dataIndex = source.indexOf('stem_lab/stem_data_cellatlas_muraro.js');
      const toolIndex = source.indexOf('stem_lab/stem_tool_cellatlas.js');
      expect(dataIndex).toBeGreaterThan(-1);
      expect(toolIndex).toBeGreaterThan(dataIndex);
    }
    expect(
      readFileSync(resolve(process.cwd(), DATA_FILE), 'utf8'),
    ).toBe(
      readFileSync(
        resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_data_cellatlas_muraro.js'),
        'utf8',
      ),
    );
  });

  it('requires both metrics and a cautious interpretation for its quest', () => {
    const quest = window.StemLab._registry[TOOL_ID].questHooks.find(
      (item) => item.id === 'atlas_real_bridge',
    );
    expect(quest).toBeDefined();
    const complete = {
      realDataViewed: true,
      realMetricsSeen: { detectionPct: true, relativeMeanPct: true },
      realInterpretation: 'cautious',
    };
    expect(quest.check(complete)).toBe(true);
    expect(quest.check({ ...complete, realInterpretation: 'same' })).toBe(false);
  });
});
