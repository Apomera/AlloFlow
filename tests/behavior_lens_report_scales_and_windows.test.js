// Behavior Lens reports: axis labels, windows, blanks and phases.
//
// WHY: until 2026-09-24
// - The progress-report chart labelled quarter ticks by rounding: with a peak of 3 the
//   lines at 0.75 and 1.5 read "1" and "2", so points sat beside the wrong labels.
// - AlloSheet "last 7 days" was a rolling 168 hours (part of an 8th day came in as a
//   whole day), and a day with no recorded durations exported "0 seconds".
// - The FBA report's temporal grid coloured cells relative to the busiest one (one
//   incident all week read red "High") and dropped weekend and out-of-hours entries
//   without a word.
// - Phases other than exact lowercase names were badged A' (return to baseline) in the
//   portfolio, and "Baseline"/"baseline" were two rows in the FBA phase table.
// - The parent version of the progress report included the staff's free-text notes.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime, behaviorLensInternals } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  behaviorLensRuntime();
});
const realOpen = window.open;
afterEach(() => { window.open = realOpen; });
function captureWindow() {
  const pages = [];
  window.open = () => ({ document: { write: html => pages.push(html), close() {} }, print() {}, focus() {} });
  return pages;
}
const at = (y, m, d, hh) => new Date(y, m - 1, d, hh).toISOString();
const abc = (id, iso, extra = {}) => Object.assign({ id, antecedent: 'Math', behavior: 'Yelling', consequence: 'Break', intensity: 2, occurredAt: iso, timestamp: iso }, extra);

describe('progress report chart', () => {
  function report(entries, audience, profile) {
    const pages = captureWindow();
    const q = componentHarness('ProgressReportGenerator', { abcEntries: entries, observationSessions: [], sessionHistory: [], aiAnalysis: null, targetBehaviors: [], studentProfile: profile || {}, selectedStudent: 'Kestrel', callGemini: null, addToast: () => {}, t: () => undefined, initialScope: null, onBackToReview: null }, { DualLabel: text => text });
    if (audience) { q.all(n => n.type === 'button' && n.props.onClick && new RegExp(audience, 'i').test(q.text(n)))[0].props.onClick(); q.render(); }
    q.all(n => n.props['aria-label'] === 'Generate Report')[0].props.onClick();
    return pages.join('');
  }
  it('labels whole-number ticks', () => {
    const days = [[20, 1], [21, 3], [22, 2]];
    const entries = days.flatMap(([d, n]) => Array.from({ length: n }, (_, i) => abc(d + '-' + i, at(2026, 9, d, 9 + i))));
    const html = report(entries);
    expect([...html.matchAll(/data-bl-tick="(\d+)"/g)].map(m => Number(m[1]))).toEqual([0, 1, 2, 3]);   // was 0, 1, 2, 2, 3
  });
  it('leaves the staff notes out of the parent version', () => {
    const entries = [abc('a', at(2026, 9, 21, 9))];
    const parent = report(entries, null, { strengths: 'Kind to peers', notes: 'STAFF ONLY: custody note' });
    expect(parent).toContain('Kind to peers');
    expect(parent).not.toContain('STAFF ONLY');
  });
});

describe('AlloSheet', () => {
  it('last 7 days is today and the six days before', () => {
    const filter = behaviorLensInternals()('blAlloSheetFilterByDate');
    const now = new Date(2026, 8, 24, 10).getTime();
    const kept = filter([abc('x', at(2026, 9, 17, 14)), abc('y', at(2026, 9, 18, 9)), abc('z', at(2026, 9, 24, 8))], '7d', now).map(e => e.id);
    expect(kept).toEqual(['z', 'y']);                                        // x (Sep 17, 14:00) was in
  });
  it('a day with no recorded durations is blank, not 0 seconds', () => {
    const rows = behaviorLensInternals()('blAlloSheetAbcSummaryRows');
    const noDur = rows([abc('a', at(2026, 9, 21, 9)), abc('b', at(2026, 9, 21, 10))], false, '');
    expect(noDur[0].values.total_duration_seconds).toBe(null);
    const withDur = rows([abc('a', at(2026, 9, 21, 9), { duration: 30 }), abc('b', at(2026, 9, 21, 10))], false, '');
    expect(withDur[0].values.total_duration_seconds).toBe(30);
    const obs = behaviorLensInternals()('blAlloSheetObservationSummaryRows');
    expect(obs([{ method: 'frequency', timestamp: at(2026, 9, 21, 9), data: { totalCount: 3 } }], false, '')[0].values.total_session_duration_seconds).toBe(null);
  });
});

describe('FBA report', () => {
  function fba(entries) {
    const pages = captureWindow();
    const q = componentHarness('ExportPanel', { abcEntries: entries, observationSessions: [], studentName: 'Kestrel', aiAnalysis: null, t: () => undefined, onOpenAlloSheetReview: () => {} }, { DualLabel: text => text });
    q.all(n => n.type === 'button' && /IEP-Ready FBA Report/.test(q.text(n)))[0].props.onClick();
    return pages.join('');
  }
  it('one incident is Low, not High, and entries left out of the grid are counted', () => {
    // Monday 21 Sep 09:00, Saturday 26 Sep 09:00, and Tuesday 22 Sep 20:00 (after hours).
    const html = fba([abc('mon', at(2026, 9, 21, 9)), abc('sat', at(2026, 9, 26, 9)), abc('late', at(2026, 9, 22, 20))]);
    const grid = html.slice(html.indexOf('6. Temporal Patterns'));
    expect(grid).toContain('background:#fef9c3;padding:6px');               // was red: 1 of a max of 1
    expect(grid).not.toContain('background:#dc2626;padding:6px');
    expect(grid).toContain('2 entries on a weekend or outside 7:00-18:59 are not shown.');
  });
  it('phases are one row however they are written', () => {
    const html = fba([abc('a', at(2026, 9, 21, 9), { phase: 'Baseline' }), abc('b', at(2026, 9, 22, 9), { phase: 'baseline' }), abc('c', at(2026, 9, 23, 9), { phase: 'Intervention (B)' })]);
    const table = html.slice(html.indexOf('7. Phase Comparison'));
    expect((table.match(/>Baseline</g) || []).length + (table.match(/>baseline</g) || []).length).toBe(1);
  });
  it('portfolio phase badges', () => {
    const { portfolioPhaseLabel } = window.AlloModules.BehaviorLensPhaseLabel;
    expect(['baseline', 'Baseline', 'Condition A', 'Intervention (B)', 'treatment', 'Maintenance', 'return to baseline', 'Reversal', 'Probe'].map(p => portfolioPhaseLabel(p).short))
      .toEqual(['A', 'A', 'A', 'B', 'B', 'M', "A'", "A'", 'Probe']);        // everything unmatched was A'
  });
});
