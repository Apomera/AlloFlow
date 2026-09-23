// Behavior Lens report and checklist counts.
//
// WHY (fixed 2026-09-23):
//   - Progress Report frequency tables divided by the rows SHOWN (top 5 or 8), so
//     shares were inflated and always summed to 100%.
//   - The IEP-Ready FBA Report's "Days of Data" was the elapsed span: one day of data
//     read 0 and Monday to Friday read 4.
//   - Fidelity Checklist counted ticks left over from a longer earlier list: 8 of 6
//     items scored 133%. Its days were UTC days.
//   - Counseling Simulation showed "B" and "5/10" when the AI gave no score.
// Expected values are worked by hand.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime, behaviorLensInternals } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let runtime;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  runtime = behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const entry = (day, over = {}) => runtime.normalizeAbcEntry(Object.assign({
  antecedent: 'A', behavior: 'Left seat', consequence: 'Redirect', setting: 'Room 12', occurredAt: `2026-09-${String(day).padStart(2, '0')}T15:00:00Z`, timezoneOffset: 240,
}, over)).entry;
const capturePages = () => {
  const pages = [];
  vi.spyOn(window, 'open').mockImplementation(() => ({ document: { write: html => pages.push(html), close() {} }, print() {}, focus() {} }));
  return pages;
};

describe('Progress Report frequency tables', () => {
  it('shares are of ALL entries, not of the rows shown', () => {
    const pages = capturePages();
    const antecedents = ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'E', 'F', 'G'];
    const entries = antecedents.map((a, i) => entry(10 + i, { antecedent: a }));
    const q = componentHarness('ProgressReportGenerator', { abcEntries: entries, observationSessions: [], sessionHistory: [], aiAnalysis: null, targetBehaviors: [], studentProfile: {}, selectedStudent: 'Kestrel', callGemini: null, addToast: () => {}, t: () => undefined });
    // Antecedent tables are shown to the IEP team and clinicians, not in the parent report.
    q.all(n => n.props['aria-label'] === '📋 IEP Team')[0].props.onClick(); q.render();
    q.all(n => n.props['aria-label'] === 'Generate Report')[0].props.onClick();
    expect(pages).toHaveLength(1);
    // Top 5 antecedents cover 8 of 10 entries: A is 2 of 10 = 20.0% (old: 2 of 8 = 25.0%).
    expect(pages[0]).toContain('20.0%');
    expect(pages[0]).not.toContain('25.0%');
  });
});

describe('IEP-Ready FBA Report day counts', () => {
  const report = entries => {
    const pages = capturePages();
    vi.useFakeTimers();
    const q = componentHarness('ExportPanel', { abcEntries: entries, observationSessions: [], studentName: 'Kestrel', aiAnalysis: null, t: () => undefined, onOpenAlloSheetReview: () => {} });
    q.button('IEP-Ready FBA Report').props.onClick();
    return pages[0];
  };
  it('one day of data is 1 day, not 0', () => {
    const html = report([entry(14), entry(14, { behavior: 'Yelled' })]);
    expect(html).toMatch(/<div class="stat-val">1<\/div><div class="stat-lbl">Days with Data<\/div>/);
    expect(html).toContain('(1 days)');
  });
  it('Monday to Friday is a 5-day period with 5 days of data (the span read 4)', () => {
    const html = report([14, 15, 16, 17, 18].map(d => entry(d)));
    expect(html).toMatch(/<div class="stat-val">5<\/div><div class="stat-lbl">Days with Data<\/div>/);
    expect(html).toContain('(5 days)');
  });
  it('Monday, Wednesday, Friday: a 5-day period with 3 days of data', () => {
    const html = report([14, 16, 18].map(d => entry(d)));
    expect(html).toMatch(/<div class="stat-val">3<\/div><div class="stat-lbl">Days with Data<\/div>/);
    expect(html).toContain('(5 days)');
  });
});

describe('Fidelity Checklist', () => {
  it('counts ticks on current items only (a saved day with 8 ticks on 6 items read 133%)', () => {
    const today = behaviorLensInternals()('blLocalDateKey')(new Date());
    const ticks = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, true]));
    const q = componentHarness('FidelityChecklist', { studentName: 'Kestrel', studentKey: k => k, abcEntries: [], aiAnalysis: null, callGemini: null, t: () => undefined, addToast: () => {} },
      { __durable: { fidelityItems: ['a', 'b', 'c', 'd', 'e', 'f'], fidelityHistory: { [today]: { checks: ticks, score: 8, total: 8, pct: 100 } } } });
    q.render(true); q.render();
    expect(q.text()).toContain('6/6 (100%)');
    expect(q.text()).not.toContain('133%');
  });
});

describe('Counseling Simulation scores', () => {
  it('a missing AI score is "not scored", never an invented 5/10 or B', () => {
    const score10 = behaviorLensInternals()('aiScore10');
    expect(score10(undefined)).toBeNull();
    expect(score10('')).toBeNull();
    expect(score10(7)).toBe(7);
    expect(score10(14)).toBe(10);
    const src = readFileSync('behavior_lens_module.js', 'utf8');
    expect(src).not.toMatch(/overall_score \|\| 5|_score'\] \|\| 5|overall_grade \|\| 'B'/);
  });
});
