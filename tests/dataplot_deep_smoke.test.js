import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setup, teardown, mount, click, flush, pts, byText } from './dataplot_deep_helpers.js';

// Data Plot mounts in every tab, chart type, level and theme with no console errors.
let errSpy;
beforeEach(() => { setup(); errSpy = vi.spyOn(console, 'error'); });
afterEach(async () => { await teardown(); vi.restoreAllMocks(); });

const TABS = ['chart', 'stats', 'compare', 'quiz', 'cause', 'tools', 'inquiry'];
const CHARTS = ['scatter', 'line', 'bar', 'pie', 'histogram', 'boxplot', 'ogive', 'dotplot', 'pictograph'];

describe('Data Plot deep: smoke', () => {
  for (const band of [undefined, 'k2', 'g35', 'g68', 'g912']) {
    it('every tab renders without console errors (band ' + band + ')', async () => {
      for (const tab of TABS) {
        await mount({ points: pts([3, 5, 4, 9, 12, 11, 30]), activeTab: tab }, { ctx: { gradeBand: band, isTeacherMode: true } });
        expect(document.querySelector('[role="tablist"]')).not.toBeNull();
      }
      expect(errSpy.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
    });
  }
  it('every chart type renders with data, with one point, and empty, in light and contrast themes', async () => {
    for (const contrast of [false, true]) {
      for (const ct of CHARTS) {
        for (const data of [pts([3, 5, 4, 9, 12, 11, 30, -2]), [{ x: 1, y: 10 }], []]) {
          await mount({ points: data, chartType: ct, showResiduals: true, showResidualPlot: true, showCI: true, showOutliers: true, showNormalOverlay: true, tableMode: true }, { ctx: { isContrast: contrast } });
          expect(document.querySelector('#data-plot-panel-chart')).not.toBeNull();
        }
      }
    }
    expect(errSpy.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
    // 54 full mounts: 2.3-5.6 s on the shared machine (start copy 3.8-5.0 s), so the default 5 s
    // limit failed under load. A longer limit only; every check is unchanged (2026-11-04).
  }, 20000);
  it('every quiz type generates, renders and accepts an answer', async () => {
    const m = await mount({ activeTab: 'quiz', quizAllTypes: true });
    for (const type of ['readBar', 'dotPlot', 'centre', 'spread', 'correlation', 'guessR2', 'residual', 'matchChart', 'outlier']) {
      await click(document.querySelector('[data-dataplot-quiz-type="' + type + '"]'));
      await click(document.querySelector('[data-dataplot-quiz-new]'));
      expect(m.latest.dpQuiz.type).toBe(type);
      const choice = document.querySelector('[data-dataplot-choice]');
      if (choice) await click(choice);
      else { document.getElementById('dp-quiz-num').value = '1'; await click(document.querySelector('[data-dataplot-quiz-check]')); }
      expect(m.latest.dpQuiz.tries).toBe(1);
    }
    expect(errSpy.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
  });
  it('old saved state loads: legacy quiz, junk points, junk keys', async () => {
    await mount({ points: [{ x: 1, y: 2 }, null, { x: 'a', y: 3 }, { x: 2, y: 4 }, { x: 3, y: NaN }], dpQuiz: { type: 'correlation', text: 'old', answer: 'Positive', opts: ['Positive'], answered: false }, activeTab: 'quiz', regressionType: 'bogus', chartType: 'nope', corrInquiry: { trueR: 'x' }, statsPred: 5, compare: [], teacher: 'x', undoStack: [null, [{ x: 1, y: 1 }]] });
    expect(byText('button', /Start quiz/)).toBeTruthy();
    for (const tab of ['chart', 'stats', 'inquiry', 'compare']) { await click(document.getElementById('data-plot-tab-' + tab)); }
    expect(errSpy.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
  });
});
