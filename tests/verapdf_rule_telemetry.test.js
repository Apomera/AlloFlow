// Architecture telemetry (2026-06-21): records which ISO 14289-1 rules an AlloFlow-tagged export actually
// FAILS (and which the closed-loop is asked to repair) so the "is the pdf-lib/PDFBox repair loop redundant
// with createTaggedPdf?" question can be settled with data, not inference. This pins the helper + its three
// call sites, and exercises the aggregation logic directly.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('veraPDF rule telemetry — wiring', () => {
  it('the recorder is defined and reads failedRules into a window-scoped aggregate', () => {
    expect(view).toMatch(/const _recordVeraPdfRules = \(verdict, source\) =>/);
    expect(view).toMatch(/window\.__alloVeraPdfRuleStats = window\.__alloVeraPdfRuleStats \|\|/);
  });
  it('it is called at all three sites: fresh export, on-demand validate, and repair-request', () => {
    expect(view).toMatch(/_recordVeraPdfRules\(_vrV, 'export'\)/);
    expect(view).toMatch(/_recordVeraPdfRules\(_vr, 'validate'\)/);
    expect(view).toMatch(/_recordVeraPdfRules\(veraPdfResult, 'repair'\)/);
  });
  it('it records only rule IDs (clause + test), never document content', () => {
    // the bucket key is built from clause/testNumber only
    expect(view).toMatch(/'§' \+ \(r\.clause \|\| '\?'\) \+ ' t' \+ \(r\.testNumber/);
    // it must not stuff message/context (which can carry document text) into the aggregate
    expect(view).not.toMatch(/bucket\[[^\]]*\] = [^;]*r\.message/);
  });
});

// Exercise the aggregation logic itself (ported verbatim from the helper) so the counting + clean-export
// ratio are actually tested, not just pinned by string-match.
describe('veraPDF rule telemetry — aggregation', () => {
  const makeRecorder = () => {
    const win = {};
    return {
      win,
      record: (verdict, source) => {
        if (!verdict || verdict.error) return;
        const g = (win.__alloVeraPdfRuleStats = win.__alloVeraPdfRuleStats || { taggedExports: 0, cleanExports: 0, failures: {}, repairRequests: {} });
        const rules = Array.isArray(verdict.failedRules) ? verdict.failedRules : [];
        if (source === 'export' || source === 'validate') { g.taggedExports++; if (verdict.compliant && rules.length === 0) g.cleanExports++; }
        const bucket = source === 'repair' ? g.repairRequests : g.failures;
        for (const r of rules) { const k = '§' + (r.clause || '?') + ' t' + (r.testNumber != null ? r.testNumber : '?'); bucket[k] = (bucket[k] || 0) + (r.count || 1); }
      },
    };
  };

  it('a clean export counts toward clean/total and records no failures', () => {
    const { win, record } = makeRecorder();
    record({ compliant: true, failedRules: [] }, 'export');
    expect(win.__alloVeraPdfRuleStats.cleanExports).toBe(1);
    expect(win.__alloVeraPdfRuleStats.taggedExports).toBe(1);
    expect(Object.keys(win.__alloVeraPdfRuleStats.failures)).toHaveLength(0);
  });
  it('failing rules accumulate by clause+test with counts, separating failures from repair-requests', () => {
    const { win, record } = makeRecorder();
    record({ compliant: false, failedRules: [{ clause: '7.1', testNumber: 3, count: 2 }] }, 'export');
    record({ compliant: false, failedRules: [{ clause: '7.1', testNumber: 3, count: 1 }, { clause: '7.2', testNumber: 1 }] }, 'validate');
    record({ compliant: false, failedRules: [{ clause: '7.21.4.1', testNumber: 1 }] }, 'repair');
    const g = win.__alloVeraPdfRuleStats;
    expect(g.failures['§7.1 t3']).toBe(3);       // 2 + 1 across two exports
    expect(g.failures['§7.2 t1']).toBe(1);
    expect(g.repairRequests['§7.21.4.1 t1']).toBe(1); // repair-requests kept separate
    expect(g.taggedExports).toBe(2);              // the repair-request did not inflate the export count
    expect(g.cleanExports).toBe(0);
  });
  it('an error verdict is ignored entirely', () => {
    const { win, record } = makeRecorder();
    record({ error: 'verapdf unavailable' }, 'export');
    expect(win.__alloVeraPdfRuleStats).toBeUndefined();
  });
});
