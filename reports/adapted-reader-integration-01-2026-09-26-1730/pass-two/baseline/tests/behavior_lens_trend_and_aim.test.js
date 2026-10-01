// Behavior Lens trend words and the progress monitor's aim line.
//
// WHY: until 2026-09-23 eight screens called a trend "Increasing" or "Decreasing" when
// the slope passed a FIXED +/-0.1, whatever the unit: a rate that rose tenfold from
// 0.05 to 0.5 per minute (slope 0.045) read "Stable", and a behavior near 30 a day
// that rose by 1 over a week read "Increasing". A phase with 1 or 2 points (no trend
// computed) also read "Stable". The progress monitor's aim line started at the FIRST
// day's count, drew backwards to a goal date before the data, placed phase lines on
// the next day that had entries instead of the start date, and called the average over
// days WITH entries "Avg/Day". Expected values are worked by hand.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let G, PM, runtime;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  runtime = behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  G = window.AlloModules.BehaviorLensGraphMath;
  PM = window.AlloModules.BehaviorLensProgressMonitor;
  if (!G || !G.trendDirection || !PM) throw new Error('trend / progress monitor helpers did not register');
});

describe('trendDirection', () => {
  it('a tenfold rise in a small rate is increasing (was "Stable": slope 0.05 < 0.1)', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(k => k * 0.05);
    expect(G.trendDirection(0.05, 9, values)).toBe('increasing');   // change 0.45 on a level of 0.275
  });
  it('a rise of 1 on a level near 30 is stable (was "Increasing": slope 0.3 > 0.1)', () => {
    expect(G.trendDirection(0.3, 4, [30, 30, 30, 31, 31])).toBe('stable');  // change 1.2 = 4% of 30.4
  });
  it('20% of the level is the line', () => {
    expect(G.trendDirection(1, 2, [10, 10, 10])).toBe('increasing');   // change 2 = 20%
    expect(G.trendDirection(-0.99, 2, [10, 10, 10])).toBe('stable');    // 19.8%
    expect(G.trendDirection(-1, 2, [10, 10, 10])).toBe('decreasing');
  });
  it('fewer than 3 points has no trend; all zeros is stable', () => {
    expect(G.trendDirection(5, 1, [0, 5])).toBe(null);
    expect(G.trendDirection(0, 3, [0, 0, 0, 0])).toBe('stable');
  });
});

describe('the ABA graph visual analysis', () => {
  const session = (n, value) => ({ id: 's' + n, date: `2026-09-${String(n).padStart(2, '0')}T12:00:00Z`, behavior: 'Hitting', count: value, value });
  it('reads the trend against the phase level, and says when a phase has too few points', () => {
    // Baseline 30,30,31,31: split-middle slope 0.5 (old: Increasing), change 1.5 on 30.5 = stable.
    // Intervention 0.05,0.05,0.09,0.09: slope 0.02 (old: Stable), change 0.06 on 0.07 = increasing.
    // Probe 2 points: no trend (old: Stable).
    const values = [30, 30, 31, 31, 0.05, 0.05, 0.09, 0.09, 4, 4];
    const graph = componentHarness('ABAGraphEngine', { sessionHistory: values.map((v, i) => session(i + 1, v)), phases: [{ label: 'Baseline', startSession: 1 }, { label: 'Intervention', startSession: 5 }, { label: 'Probe', startSession: 9 }], t: () => undefined, onExportData: () => {} });
    graph.render(true); graph.render(true);
    expect(graph.all(n => n.props['data-trend'] !== undefined).map(n => [n.props['data-trend'], graph.text(n)])).toEqual([
      ['stable', 'Trend: → Stable'], ['increasing', 'Trend: ↗ Increasing'], ['none', 'Trend: Too few points (3 needed)']]);
  });
});

describe('progressAimLine', () => {
  const days = (pairs) => pairs.map(([date, count]) => ({ date, count }));
  it('starts at the baseline median, not the first day', () => {
    const d = days([['2026-09-01', 12], ['2026-09-02', 4], ['2026-09-03', 5], ['2026-09-04', 6]]);
    expect(PM.progressAimLine(d, [{ label: 'Baseline', startDate: '' }], 1, '2026-09-30'))
      .toEqual({ startDate: '2026-09-03', startLevel: 5, endDate: '2026-09-30', goal: 1, baselineDays: 3, fromPhase: false });
  });
  it('with an intervention phase, baseline is every day before it', () => {
    const d = days([['2026-09-01', 12], ['2026-09-02', 4], ['2026-09-05', 5]]);
    expect(PM.progressAimLine(d, [{ startDate: '' }, { startDate: '2026-09-04' }], 1, '2026-09-30'))
      .toMatchObject({ startDate: '2026-09-02', startLevel: 8, baselineDays: 2, fromPhase: true });
  });
  it('a goal date that is not after the baseline draws nothing and says so', () => {
    const d = days([['2026-09-10', 3], ['2026-09-11', 3], ['2026-09-12', 3]]);
    expect(PM.progressAimLine(d, [], 0, '2026-09-05')).toMatchObject({ problem: 'goal-before-baseline' });
  });
});

describe('the progress monitor panel', () => {
  // 16:00Z is noon at UTC-4, so each note lands on the date written.
  const entries = (spec) => spec.flatMap(([date, n]) => Array.from({ length: n }, (_, k) =>
    runtime.normalizeAbcEntry({ antecedent: 'Math', behavior: 'Calls out', consequence: 'Redirect', occurredAt: `${date}T16:0${k % 10}:00Z`, timezoneOffset: 240 }).entry));
  const mount = (spec, durable) => componentHarness('ProgressMonitorDashboard', { abcEntries: entries(spec), observationSessions: [], sessionHistory: [], t: () => undefined, addToast: () => {} }, { __durable: durable });

  it('draws the aim from the baseline median and labels the averages honestly', () => {
    const q = mount([['2026-09-01', 12], ['2026-09-02', 4], ['2026-09-03', 5], ['2026-09-04', 6]], { progressMonitorGoalCount: 1, progressMonitorGoalDate: '2026-09-30' });
    const aimLine = q.all(n => n.props['data-aim'] !== undefined)[0].props;
    expect(aimLine['data-aim']).toBe('2026-09-03:5>2026-09-30:1');
    // Where it is DRAWN: on the 09-03 point, whose count (5) is the baseline median.
    const dot = q.all(n => n.type === 'circle')[2].props;
    expect([aimLine.x1, aimLine.y1]).toEqual([dot.cx, dot.cy]);
    expect(q.text(q.byAttr('data-aim-note', 'true')[0])).toBe('Aim line starts at the baseline median, 5 a day over 3 days, on 2026-09-03.');
    expect(q.text()).toContain('Avg on days with entries');
    expect(q.text()).toContain('Days with entries');
    expect(q.text()).not.toContain('Avg/Day');
  });
  it('a phase line sits on its start date, not on the next day with entries', () => {
    const q = mount([['2026-09-01', 2], ['2026-09-02', 2], ['2026-09-05', 1], ['2026-09-06', 1], ['2026-09-07', 1]], {});
    q.all(n => n.type === 'button' && /Edit Phase Lines/.test(q.text(n)))[0].props.onClick(); q.render();
    q.all(n => n.props['aria-label'] === '+ Add Phase')[0].props.onClick(); q.render();
    q.all(n => n.props['aria-label'] === 'Phase start date')[1].props.onChange({ target: { value: '2026-09-04' } }); q.render();
    const line = q.byAttr('data-phase-start', '2026-09-04')[0].children[0].props;
    const cx = q.all(n => n.type === 'circle').map(c => c.props.cx);  // 09-01, 09-02, 09-05, 09-06, 09-07
    expect(line.x1).toBeCloseTo(cx[1] + (cx[2] - cx[1]) * 2 / 3, 6);   // two thirds of the way from 09-02 to 09-05
  });
  it('a rise of 1 on a level near 30 is stable', () => {
    const q = mount([['2026-09-01', 30], ['2026-09-02', 30], ['2026-09-03', 30], ['2026-09-04', 31], ['2026-09-05', 31]], {});
    expect(q.text()).toContain('➡️ Stable');
    expect(q.text()).not.toContain('Increasing trend');
  });
});

describe('the progress report', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  it('a rise of 1 on a level near 30 is a stable trend in the preview and the printed page', () => {
    const pages = [];
    vi.spyOn(window, 'open').mockImplementation(() => ({ document: { write: html => pages.push(html), close() {} }, print() {}, focus() {} }));
    const abcEntries = [['2026-09-01', 30], ['2026-09-02', 30], ['2026-09-03', 30], ['2026-09-04', 31], ['2026-09-05', 31]].flatMap(([date, n]) => Array.from({ length: n }, () =>
      runtime.normalizeAbcEntry({ antecedent: 'Math', behavior: 'Calls out', consequence: 'Redirect', occurredAt: `${date}T16:00:00Z`, timezoneOffset: 240 }).entry));
    const q = componentHarness('ProgressReportGenerator', { abcEntries, observationSessions: [], sessionHistory: [], aiAnalysis: null, targetBehaviors: [], studentProfile: {}, selectedStudent: 'Kestrel', callGemini: null, addToast: () => {}, t: () => undefined });
    const tile = q.all(n => n.type === 'div' && n.children.length === 3 && q.text(n.children[2]) === 'Trend')[0];
    expect(q.text(tile.children[1])).toBe('→');   // old: ↑ (slope 0.3 > 0.1)
    q.all(n => n.props['aria-label'] === 'Generate Report')[0].props.onClick();
    expect(pages).toHaveLength(1);
    expect(pages[0]).toContain('The data shows a stable trend');
    expect(pages[0]).toContain('Trend (→ Stable)');
  });
});
