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

describe('Cell Atlas Lab real-metric stress test', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    delete window.__alloCellAtlasRealSnapshots;
    loadSnapshot();
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('computes the representation-dependent rankings from checked-in aggregates', () => {
    const pure = window.__alloCellAtlasPure;
    const snapshot = window.__alloCellAtlasRealSnapshots.muraroPancreas;
    const results = pure.benchmarkRealMetrics(snapshot);
    const detection = results.find((item) => item.id === 'detectionPct');
    const relative = results.find((item) => item.id === 'relativeMeanPct');

    expect(detection.totalCount).toBe(7);
    expect(detection.alignedCount).toBe(1);
    expect(detection.distinctPredictions).toEqual(['delta']);
    expect(detection.rows.every((row) => row.ranking.length === 3)).toBe(true);
    expect(Math.max(...detection.rows.map((row) => row.margin))).toBeLessThan(0.02);

    expect(relative.totalCount).toBe(7);
    expect(relative.alignedCount).toBe(7);
    expect(relative.rows.every((row) => row.predictedId === row.actualId)).toBe(true);
    expect(relative.rows.find((row) => row.actualId === 'ductal').margin).toBeLessThan(0.01);
  });

  it('renders agreement, ranking details, and non-validation boundaries', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: {
        tissue: 'pancreas',
        view: 'map',
        evidenceMode: 'real',
        benchmarkMetric: 'detectionPct',
        benchmarkCell: 'acinar',
      },
    });

    expect(html).toContain('Metric stress test');
    expect(html).toContain('Same source cells, different computational representation');
    expect(html).toContain('1 of 7 aligned');
    expect(html).toContain('7 of 7 aligned');
    expect(html).toContain('all seven profiles rank Delta cell first');
    expect(html).toContain('Top three templates for Acinar cell');
    expect(html).toContain('It is not a probability, confidence score, or proof of identity');
    expect(html).toContain('Teaching-template agreement is not validation');
    expect(html).toContain('does not establish that relative mean is universally superior');
  });

  it('requires both ranking views and the representation explanation for its quest', () => {
    const quest = window.StemLab._registry[TOOL_ID].questHooks.find(
      (item) => item.id === 'atlas_metric_stress',
    );
    const complete = {
      benchmarkMetricsSeen: { detectionPct: true, relativeMeanPct: true },
      metricStressAnswer: 'representation',
    };
    expect(quest).toBeDefined();
    expect(quest.check(complete)).toBe(true);
    expect(quest.check({ ...complete, metricStressAnswer: 'labels' })).toBe(false);
    expect(quest.check({
      benchmarkMetricsSeen: { detectionPct: true },
      metricStressAnswer: 'representation',
    })).toBe(false);
  });
});
