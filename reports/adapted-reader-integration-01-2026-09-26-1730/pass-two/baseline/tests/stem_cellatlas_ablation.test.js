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

describe('Cell Atlas Lab marker-ablation robustness lesson', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    delete window.__alloCellAtlasRealSnapshots;
    loadSnapshot();
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('recomputes a profile after one real aggregate feature is set to zero', () => {
    const pure = window.__alloCellAtlasPure;
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    const trial = pure.markerAblation(snapshot, 'beta', 'relativeMeanPct', 'INS');

    expect(trial.baselineTop.id).toBe('beta');
    expect(trial.ablatedTop.id).toBe('alpha');
    expect(trial.changed).toBe(true);
    expect(trial.omittedGeneId).toBe('INS');
    expect(trial.ablatedRanking).toHaveLength(3);
    expect(pure.markerAblation(snapshot, 'immune', 'relativeMeanPct', 'PTPRC')).toBeNull();
  });

  it('finds the representation-specific leave-one-gene-out dependencies', () => {
    const pure = window.__alloCellAtlasPure;
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    const relative = pure.auditMarkerAblation(snapshot, 'relativeMeanPct');
    const detection = pure.auditMarkerAblation(snapshot, 'detectionPct');
    const canonical = {
      acinar: 'PRSS1',
      alpha: 'GCG',
      beta: 'INS',
      delta: 'SST',
      ductal: 'KRT19',
      endothelial: 'KDR',
      stellate: 'COL3A1',
    };

    expect(relative).toHaveLength(7);
    for (const row of relative) {
      expect(row.influentialGenes, row.cellId).toEqual([canonical[row.cellId]]);
    }
    expect(detection).toHaveLength(7);
    expect(detection.every((row) => row.baselineId === 'delta')).toBe(true);
    expect(detection.every((row) => row.influentialGenes.join(',') === 'SST')).toBe(true);
  });

  it('renders the counterfactual result, panel audit, and scientific boundary', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: {
        tissue: 'pancreas',
        view: 'map',
        evidenceMode: 'real',
        ablationMetric: 'relativeMeanPct',
        ablationCell: 'beta',
        ablationGene: 'INS',
      },
    });

    expect(html).toContain('Counterfactual robustness lab');
    expect(html).toContain('How fragile is an eight-gene ranking?');
    expect(html).toContain('Ranking changed: Beta cell');
    expect(html).toContain('Alpha cell');
    expect(html).toContain('Leave-one-gene-out sensitivity');
    expect(html).toContain('Feature ablation is not biological ablation');
    expect(html).toContain('does not simulate a gene knockout');
  });

  it('requires two trials and a panel-bounded interpretation for its quest', () => {
    const quest = window.StemLab._registry[TOOL_ID].questHooks.find(
      (item) => item.id === 'atlas_ablation',
    );
    const complete = {
      ablationTrials: { 'relativeMeanPct:beta:INS': true, 'relativeMeanPct:beta:GCG': true },
      ablationInterpretation: 'panel',
    };
    expect(quest).toBeDefined();
    expect(quest.check(complete)).toBe(true);
    expect(quest.check({ ...complete, ablationInterpretation: 'knockout' })).toBe(false);
    expect(quest.check({
      ablationTrials: { 'relativeMeanPct:beta:INS': true },
      ablationInterpretation: 'panel',
    })).toBe(false);
  });
});
