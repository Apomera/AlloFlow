// Report Writer's date and cited-source checks, as run in the app.
//
// WHY (2026-11-16): the audit's non-AI check is Python and cannot load in the
// desktop app or offline, so there a stated interval that does not match its
// dates, or a cited source that no verified fact mentions, went unchecked. The
// two checks now also exist in the app and run whenever the Python did not.
//
// The saved answers in tests/fixtures/report_writer_python_parity.json come
// from the real Python (dev-tools/build_report_writer_parity_fixture.py). The
// in-app copy must give the same ones.
import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const fixture = JSON.parse(readFileSync(resolve(process.cwd(), 'tests/fixtures/report_writer_python_parity.json'), 'utf8'));
const pythonSource = readFileSync(resolve(process.cwd(), 'pyodide_runtime_module.js'), 'utf8');
let checks;
const comparable = (findings) => findings.map(({ claim, finding, status, severity, fix_hint }) => ({ claim, finding, status, severity, fix_hint }));

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  checks = window.AlloReportWriterTesting;
});

describe('the in-app copy gives the same answers as the Python', () => {
  it('has saved Python answers that cover both checks and both outcomes', () => {
    expect(fixture.cases.length).toBeGreaterThanOrEqual(12);
    expect(fixture.cases.filter(c => c.dates.length).length).toBeGreaterThanOrEqual(3);
    expect(fixture.cases.filter(c => c.citations.length).length).toBeGreaterThanOrEqual(3);
    expect(fixture.cases.filter(c => !c.dates.length && !c.citations.length).length).toBeGreaterThanOrEqual(4);
  });

  it.each(fixture.cases.map((c, i) => [i + 1, c.text.slice(0, 60), c]))('case %i: %s', (_n, _label, c) => {
    expect(comparable(checks.checkDateArithmetic(c.text))).toEqual(c.dates);
    expect(comparable(checks.checkCitations(c.text, fixture.chunks))).toEqual(c.citations);
  });
});

describe('what the checks catch', () => {
  it('flags an interval that does not match its two dates, and not one that does', () => {
    const wrong = checks.checkDateArithmetic('Testing began on 9/2/2026 and ended 4 weeks later on 9/20/2026.');
    expect(wrong).toHaveLength(1);
    expect(wrong[0]).toMatchObject({ status: 'contradicts', finding: "Stated as '4 weeks' (28 days) but actual span is 18 days." });
    expect(checks.checkDateArithmetic('Testing began on 9/2/2026 and ended 4 weeks later on 9/30/2026.')).toEqual([]);
  });

  it('compares a date with the next date only, so a later third date is not measured against the first interval', () => {
    // Before, 9/2 was also paired with 10/30 using "2 weeks", and this correct sentence was flagged.
    const text = 'Sessions were held on 9/2/2026 and 2 weeks later on 9/16/2026, with a follow-up on 10/30/2026.';
    expect(checks.checkDateArithmetic(text)).toEqual([]);
    // The same rule is in the Python the browser runs.
    expect(pythonSource).toContain('for m2, d2 in dates[i + 1:i + 2]:');
  });

  it('only reads something as a date when it carries its year', () => {
    // These number pairs were read as dates (8-12 as August 12), and a flagged
    // interval blocks export. None of them is a date.
    const notDates = 'For ages 8-12 the program ran 2 weeks; grades 9-12 followed, with 3/4 trials correct after 6 weeks and scores of 4-5.';
    expect(checks.checkDateArithmetic(notDates)).toEqual([]);
    expect(checks.checkDateArithmetic('Seen on 9/2 and again 4 weeks later on 9/20.')).toEqual([]);
    // Leap years still count: 2/27/2024 to 3/1/2024 is 3 days, 2/20/2025 to 3/1/2025 is 9.
    expect(checks.checkDateArithmetic('Began 2/27/2024 and ended 3 days later on 3/1/2024.')).toEqual([]);
    expect(checks.checkDateArithmetic('Began 2/20/2025 and ended 3 days later on 3/1/2025.')).toHaveLength(1);
  });

  it('reads written-out months and ISO dates, which it used to miss', () => {
    const wrong = checks.checkDateArithmetic('Testing began on September 2, 2026 and ended 4 weeks later on September 20, 2026.');
    expect(wrong.map(f => f.claim)).toEqual(['2026-09-02 → 2026-09-20 (4 weeks)']);
    expect(checks.checkDateArithmetic('Testing began on September 2, 2026 and ended 4 weeks later on Sept. 30, 2026.')).toEqual([]);
    expect(checks.checkDateArithmetic('Referred 2 March 2026; evaluated 3 months later on 14th December 2026.')).toHaveLength(1);
    expect(checks.checkDateArithmetic('Intake was 2026-01-05 and the review came 1 year later on 2027-01-04.')).toEqual([]);
    // "may" as a verb is not a month.
    expect(checks.checkDateArithmetic('The student may 5, 2026 times respond, and 2 weeks later may 30, 2026 times.')).toEqual([]);
  });

  it('flags a cited source that no verified fact mentions, once, and leaves known and generic ones alone', () => {
    const chunks = [{ text: 'WISC-V Full Scale IQ 97 (standard score; Average)' }];
    const found = checks.checkCitations('Per the WISC-V results and the Teacher report. According to the Zorblax Battery findings; again the Zorblax Battery results.', chunks);
    expect(found.map(f => f.claim)).toEqual(["Cited: 'Zorblax Battery'"]);
    expect(found[0].status).toBe('unsourced');
  });

  it('gives each finding its section', () => {
    const findings = checks.inAppAudit({ History: 'Seen 9/2/2026 and 4 weeks later on 9/20/2026.', Empty: '' }, []);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ section: 'History', source: 'in-app' });
  });
});

// The Python audit's label and percentile checks used one fixed set of ranges for
// every test and read T-scores as standard scores. On correct reports for WJ IV,
// KABC-II, BASC-3 and CELF-5 they blocked export; the app's own score verifier,
// which knows each test's ranges, already checks the same things. They were
// turned off on 2026-11-16 (Aaron's choice). These sample reports, run through the
// real Python by dev-tools/build_report_writer_parity_fixture.py, hold both sides.
describe('sample score reports: the Python audit and the app\'s score verifier', () => {
  const blocking = (f) => f.status === 'contradicts' || (f.status === 'discrepancy' && f.severity === 'high');
  const verify = (report) => window.AlloPsycheck.verifyDraft(report.scores.map(s => ({
    assessment: s.assessment, subtest: s.subtest, score: s.score,
    scoreType: s.scoreType === 'T-score' ? 't_score' : s.scoreType,
    classification: s.classification, percentile: s.percentile, ciLow: s.ciLow, ciHigh: s.ciHigh, ciLevel: s.ciLevel,
  })), '## Results\n' + report.text).discrepancies;
  const correct = fixture.reports.filter(r => r.kind === 'correct');
  const planted = fixture.reports.filter(r => r.kind === 'planted');

  it('covers several tests\' own label sets, and planted label, percentile and score errors', () => {
    expect(correct.length).toBeGreaterThanOrEqual(7);
    expect(planted.length).toBeGreaterThanOrEqual(4);
    const tests = new Set(correct.flatMap(r => r.scores.map(s => s.assessment)));
    for (const name of ['WISC-V', 'WJ-IV ACH', 'KABC-II', 'BASC-3 (Parent)', 'CELF-5', 'Vineland-3']) expect([...tests]).toContain(name);
  });

  it.each(correct.map(r => [r.id, r]))('correct report %s: nothing blocks export, from either check', (_id, report) => {
    expect(report.python.filter(blocking)).toEqual([]);
    expect(verify(report)).toEqual([]);
  });

  it.each(planted.map(r => [r.id + ' (' + r.error + ')', r]))('planted error %s: the app\'s score verifier catches it', (_id, report) => {
    expect(verify(report).length).toBeGreaterThan(0);
  });

  it('the Python still flags a score that is in none of the facts, now that it is given them', () => {
    const wrongScore = fixture.reports.find(r => r.id === 'wisc5-wrong-score');
    expect(wrongScore.python.map(f => [f.status, f.claim])).toEqual([['unsourced', 'SS 103']]);
  });

  it('the Python audit no longer runs the label and percentile checks', () => {
    const start = pythonSource.indexOf('def audit(report_sections_json');
    const body = pythonSource.slice(start, pythonSource.indexOf('def ', start + 10) > 0 ? pythonSource.indexOf('\ndef ', start + 10) : undefined);
    expect(body).toContain('check_date_arithmetic,');
    expect(body).not.toMatch(/^\s+check_classification_mismatch,$/m);
    expect(body).not.toMatch(/^\s+check_ss_percentile_consistency,$/m);
  });
});

describe('the embedded Python stays loadable', () => {
  it('has no backtick or ${ inside the Python text, which would end the JavaScript string around it', () => {
    const start = pythonSource.indexOf('const REPORT_CHECKS_PY = String.raw`') + 'const REPORT_CHECKS_PY = String.raw`'.length;
    const python = pythonSource.slice(start, pythonSource.indexOf('`;', start));
    expect(python.length).toBeGreaterThan(30000);
    expect(python).not.toContain('${');
    expect(python).toContain('def audit(');
    expect(python).toContain('def smoke_test(');
  });
});
