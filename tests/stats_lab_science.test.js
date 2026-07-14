// Statistics correctness for statsLab's descriptive engine, exercised through the
// rendered data-tab summary card (which renders without jStat). Values below are
// hand-verified in docs/stats_lab_review.md. This LOCKS the foundational engine —
// most importantly the sample SD (n-1) and the BIAS-CORRECTED skewness (Excel-SKEW
// / G1 formula, which most implementations get wrong) — so a future refactor of
// this numerically-critical, trusted code can't silently break it.
//
// Inferential p-values delegate to jStat (a trusted CDN lib, absent in jsdom), so
// they aren't asserted here; the test statistics were verified by hand in the doc.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Render the data tab with a single-column dataset; the summary card shows
// M / SD / Mdn / skew (all toFixed(2), sample SD by default).
// Full default state (mirrors STATSLAB_DEFAULTS) so the data-tab render — which
// reads many sibling buckets (chiGofData, multiRegData, …) — doesn't trip on a
// missing key. Only oneColData is overridden with the dataset under test.
function dataTab(values) {
  return renderTool('statsLab', {
    statsLab: {
      testsRun: 0, mode: 'data', wizardStep: 0, wizardAnswers: {}, selectedTest: null,
      sampleId: null,
      twoColData: { aLabel: 'Group A', bLabel: 'Group B', a: [], b: [] },
      multiColData: { groups: [{ label: 'Group 1', values: [] }, { label: 'Group 2', values: [] }] },
      oneColData: { values: values, mu0: 0 },
      chiGofData: { observed: [], expected: [], labels: [] },
      chiIndepData: { rows: ['Row 1', 'Row 2'], cols: ['Col 1', 'Col 2'], table: [[0, 0], [0, 0]] },
      twoWayData: null,
      multiRegData: { x: [], y: [], xLabels: ['X1'] },
      powerInputs: { test: 'ttest_independent', effectSize: 0.5, alpha: 0.05, power: 0.8, n: null, solveFor: 'n', vizD: 0.5, vizN: 30, vizAlpha: 0.05 },
      lastResult: null, lastTestType: null,
      interpretationDraft: '', aiGradeResponse: null, aiGradeLoading: false, aiGradeOpens: 0,
      showMath: false, showWizard: false,
    },
  });
}

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_statslab.js', 'statsLab'); });

describe('statsLab — descriptive engine (rendered, hand-verified)', () => {
  // Classic n=8 set: mean 5, sample SD √(32/7)=2.138→2.14, median 4.5, G1 skew 0.82.
  const SET = [2, 4, 4, 4, 5, 5, 7, 9];
  it('mean, sample SD (n-1), median, and bias-corrected skew', () => {
    const html = dataTab(SET);
    expect(html).toContain('5.00');   // M
    expect(html).toContain('2.14');   // sample SD (population would be 2.00)
    expect(html).toContain('4.50');   // Mdn
    expect(html).toContain('0.82');   // G1 skew (Excel SKEW)
  });

  it('strong right-skew set: G1 skew = 2.35', () => {
    // [1,1,1,2,2,10], n=6: mean 2.833, sample SD 3.545, G1 = 0.3·Σz³ = 2.347.
    expect(dataTab([1, 1, 1, 2, 2, 10])).toContain('2.35');
  });
});
