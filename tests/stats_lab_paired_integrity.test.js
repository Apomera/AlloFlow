import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function state(overrides = {}) {
  return {
    testsRun: 0, mode: 'test', wizardStep: 0, wizardAnswers: {}, selectedTest: 'ttest_paired',
    sampleId: null,
    twoColData: { aLabel: 'Before', bLabel: 'After', a: [10, 11, 12, 13, 14, 20], b: [9, 10, 11, 12, 13, 10] },
    multiColData: { groups: [{ label: 'Group 1', values: [] }, { label: 'Group 2', values: [] }] },
    oneColData: { values: [], mu0: 0 },
    chiGofData: { observed: [], expected: [], labels: [] },
    chiIndepData: { rows: ['Row 1', 'Row 2'], cols: ['Col 1', 'Col 2'], table: [[0, 0], [0, 0]] },
    twoWayData: null,
    multiRegData: { x: [], y: [], xLabels: ['X1'] },
    powerInputs: { test: 'ttest_independent', effectSize: 0.5, alpha: 0.05, power: 0.8, n: null, solveFor: 'n', vizD: 0.5, vizN: 30, vizAlpha: 0.05 },
    lastResult: null, lastTestType: null,
    interpretationDraft: '', aiGradeResponse: null, aiGradeLoading: false, aiGradeOpens: 0,
    showMath: false, showWizard: false,
    ...overrides,
  };
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_statslab.js', 'statsLab');
});

describe('StatsLab paired-data integrity', () => {
  it('removes a difference-score outlier as one complete matched pair', () => {
    const core = window.__StatsLabCore;
    const stripped = core.stripPairedDifferenceOutliers(
      [10, 11, 12, 13, 14, 20],
      [9, 10, 11, 12, 13, 10],
    );

    expect(stripped.removed).toBe(1);
    expect(stripped.a).toEqual([10, 11, 12, 13, 14]);
    expect(stripped.b).toEqual([9, 10, 11, 12, 13]);
    expect(stripped.differences).toEqual([1, 1, 1, 1, 1]);
  });

  it('counts outliers only in the active analysis data', () => {
    const prepared = window.__StatsLabCore.sensitivityData(state({
      oneColData: { values: [1, 1, 1, 1, 1000], mu0: 0 },
      multiColData: { groups: [
        { label: 'Other A', values: [2, 2, 2, 2, 900] },
        { label: 'Other B', values: [3, 3, 3, 3, 800] },
      ] },
    }), 'ttest_paired');

    expect(prepared.removed).toBe(1);
    expect(prepared.rule).toContain('complete matched pair');
  });

  it('rejects unequal paired columns instead of silently truncating rows', () => {
    const core = window.__StatsLabCore;
    expect(core.ttestPaired([1, 2, 3], [1, 2]).error).toContain('equal column lengths');
    expect(core.pearson([1, 2, 3], [1, 2]).error).toContain('equal column lengths');
    expect(core.linearRegression([1, 2, 3], [1, 2]).error).toContain('equal column lengths');
    expect(core.wilcoxonSignedRank([1, 2, 3], [1, 2]).error).toContain('equal column lengths');
  });

  it('returns instructive errors for zero-variability inferential data', () => {
    const core = window.__StatsLabCore;
    expect(core.ttestOneSample([4, 4, 4, 4], 4).error).toContain('no variability');
    expect(core.ttestPaired([5, 6, 7], [4, 5, 6]).error).toContain('no variability');
    expect(core.pearson([1, 1, 1], [2, 3, 4]).error).toContain('no variability');
    expect(core.linearRegression([1, 2, 3], [8, 8, 8]).error).toContain('outcome has no variability');
  });

  it('teaches and visualizes the paired t assumption using difference scores', () => {
    const html = renderTool('statsLab', { statsLab: state() });
    expect(html).toContain('Difference scores: Small sample');
    expect(html).toContain('Histogram of Before minus After difference scores');
    expect(html).toContain('(loading distribution lib');
    expect(html).toContain('the Wilcoxon signed-rank test');
    expect(html).toContain('Sensitivity: exclude 1 row(s)');
  });
});
