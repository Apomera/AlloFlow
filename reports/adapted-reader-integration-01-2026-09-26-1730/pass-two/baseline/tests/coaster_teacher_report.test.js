import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
const reportBlock = source.slice(source.indexOf('function guidedHtmlEscape(value){'), source.indexOf('function downloadGuidedTeacherReport(){'));
function reportHarness() {
  const calls = [];
  const env = {
    fmt: (v, d) => Number(v).toFixed(d),
    guidedRecord: { conditions: {} },
    renderExperimentComparisonSummary: () => '',
    renderGuidedTraceOverlay: (history, from, to, interactive, distance) => '<p>Cursor: ' + distance + '</p>',
    renderGuidedHistoryTrend: () => '',
    guidedComparisonConclusion: () => 'Generated conclusion',
    guidedRubricSummary: () => ({ earned: 0, max: 8, percent: 0 }),
    guidedReviewStatusText: () => 'Open',
    guidedExperimentQuality: (history, from, to) => { calls.push([from, to]); return { label: 'Pair ' + from + ' to ' + to }; },
    guidedLatestEvidenceQuality: () => ({ label: 'Baseline' }),
    guidedAdaptiveProgress: () => ({ items: [], recommendation: {}, goalsMet: 0, evidenceReady: 0 }),
    guidedAdaptivePlan: () => ({}),
    guidedReflectionPrompt: () => '',
    guidedGoalLabel: goal => goal,
    guidedGoalValueText: () => '',
    renderGuidedEvidenceQuality: quality => quality.label
  };
  const names = Object.keys(env);
  const build = new Function(...names, reportBlock + '\nreturn buildGuidedTeacherReport;')(...Object.values(env));
  return { build, calls };
}

describe('Coaster teacher report selected evidence', () => {
  const runs = [1, 2, 3].map(attempt => ({ attempt, goal: 'hill20', maxSpeed: 10, maxGV: 2 }));
  it('uses the selected pair for evidence quality even when newer runs exist', () => {
    const { build, calls } = reportHarness();
    const html = build(runs, 0, 1, 'My conclusion', 75);
    expect(calls).toEqual([[0, 1]]);
    expect(html).toContain('Pair 0 to 1');
    expect(html).toContain('Cursor: 75');
  });
  it('preserves intentionally blank text and escapes student markup in HTML exports', () => {
    const { build } = reportHarness();
    expect(build(runs, 0, 1, '')).toContain('<div class="conclusion"></div>');
    expect(build(runs, 0, 1, undefined)).toContain('Generated conclusion');
    const html = build(runs, 0, 1, '<img src=x onerror=alert(1)> & evidence');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; evidence');
    expect(html).not.toContain('<img src=x');
  });
});
