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

describe('Cell Atlas Lab deterministic perturbation-stability extension', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    delete window.__alloCellAtlasRealSnapshots;
    loadSnapshot();
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('evaluates all 256 bounded sign patterns without stochastic drift', () => {
    const pure = window.__alloCellAtlasPure;
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    const first = pure.perturbationStability(snapshot, 'ductal', 'relativeMeanPct', 0.25);
    const second = pure.perturbationStability(snapshot, 'ductal', 'relativeMeanPct', 0.25);

    expect(first.totalPatterns).toBe(256);
    expect(first.baselineTop.id).toBe('ductal');
    expect(first.baselineAligned).toBe(true);
    expect(first.stableCount).toBe(192);
    expect(first.stabilityPct).toBe(75);
    expect(first.outcomes).toEqual([
      { id: 'ductal', label: 'Ductal cell', count: 192, pct: 75 },
      { id: 'immune', label: 'Immune cell', count: 64, pct: 25 },
    ]);
    expect(second).toEqual(first);
    expect(pure.perturbationStability(snapshot, 'immune', 'relativeMeanPct', 0.25)).toBeNull();
  });

  it('separates stability from source-label agreement across metrics', () => {
    const pure = window.__alloCellAtlasPure;
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    const relative = pure.auditPerturbationStability(snapshot, 'relativeMeanPct', 0.25);
    const detection = pure.auditPerturbationStability(snapshot, 'detectionPct', 0.5);

    expect(relative).toHaveLength(7);
    expect(relative.filter((row) => row.stableCount === 256)).toHaveLength(6);
    expect(relative.find((row) => row.cellId === 'ductal').stableCount).toBe(192);
    expect(relative.every((row) => row.baselineAligned)).toBe(true);

    expect(detection).toHaveLength(7);
    expect(detection.filter((row) => row.baselineAligned)).toHaveLength(1);
    expect(detection.find((row) => row.cellId === 'ductal').stableCount).toBe(136);
    expect(detection.find((row) => row.cellId === 'delta').stableCount).toBe(160);
    expect(pure.auditPerturbationStability(snapshot, 'detectionPct', 0.5)).toBe(detection);
  });

  it('renders exact outcomes and rejects probability language', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: {
        tissue: 'pancreas',
        view: 'map',
        evidenceMode: 'real',
        stabilityMetric: 'relativeMeanPct',
        stabilityAmount: 0.25,
        stabilityCell: 'ductal',
      },
    });

    expect(html).toContain('Exact 256-pattern robustness envelope');
    expect(html).toContain('2⁸ = 256 sign patterns');
    expect(html).toContain('192 of 256');
    expect(html).toContain('Ductal cell: 192/256');
    expect(html).toContain('Immune cell: 64/256');
    expect(html).toContain('A robustness envelope is not a confidence interval');
    expect(html).toContain('a stable ranking can still be systematically misaligned');
  });
});
