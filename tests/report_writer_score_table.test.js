// The printed and copied report carry a Summary of Scores built from the
// entered data, never by the AI.
//
// WHY (2026-09-23): the exported report held only AI-written prose, so the
// score table a reviewer checks first had to be transcribed by the model (or by
// hand). A table generated from the data cannot be mistranscribed, shows only
// the percentiles and intervals that have a source, and says which percentiles
// are normal-curve estimates.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let U;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  U = window.AlloModules.ReportWriterUtils;
});

const SCORES = [
  { assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard', classification: 'Low Average', percentile: 21, ciLow: 83, ciHigh: 94, ciLevel: 95 },
  { assessment: 'BASC-3 (Teacher)', subtest: 'Attention Problems', score: 66, scoreType: 'T-score', classification: 'At-Risk', percentile: null },
  { assessment: 'BASC-3 (Teacher)', subtest: 'Hyperactivity', score: 71, scoreType: 'T-score', classification: 'Clinically Significant', percentile: 96, percentileSource: 'manual' },
  { assessment: 'WISC-V', subtest: 'Block Design', score: 7, scoreType: 'scaled', classification: 'Unclassified', percentile: 16 },
];
const print = (scoreEntries) => U.buildReportPrintHtml({ reportSections: { Summary: '[Student] was evaluated.' }, studentName: 'Student A', scoreEntries });
const tableOf = (html, caption) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('table')).find(t => t.querySelector('caption').textContent === caption);
};
const cells = (table, scale) => {
  const row = Array.from(table.querySelectorAll('tbody tr')).find(r => r.querySelector('th').textContent === scale);
  return Array.from(row.children).map(c => c.textContent);
};

describe('Summary of Scores in the printed report', () => {
  it('has one table per instrument, in entry order', () => {
    const doc = new DOMParser().parseFromString(print(SCORES), 'text/html');
    expect(doc.querySelector('#rw-print-scores').textContent).toBe('Summary of Scores');
    expect(Array.from(doc.querySelectorAll('table caption')).map(c => c.textContent)).toEqual(['WISC-V', 'BASC-3 (Teacher)']);
  });
  it('carries each score exactly as entered, with its interval only where recorded', () => {
    const html = print(SCORES);
    expect(cells(tableOf(html, 'WISC-V'), 'Full Scale IQ')).toEqual(['Full Scale IQ', '88', 'SS', '21*', '95%: 83–94', 'Low Average']);
    expect(cells(tableOf(html, 'WISC-V'), 'Block Design')).toEqual(['Block Design', '7', 'Scaled', '16*', '—', 'Unclassified']);
  });
  it('shows no percentile for a T-score unless one was recorded, and does not star a recorded one', () => {
    const html = print(SCORES);
    expect(cells(tableOf(html, 'BASC-3 (Teacher)'), 'Attention Problems')[3]).toBe('—');
    expect(cells(tableOf(html, 'BASC-3 (Teacher)'), 'Hyperactivity')[3]).toBe('96');
  });
  it('explains the marks it uses', () => {
    expect(print(SCORES)).toMatch(/\* Percentile estimated from the normal curve/);
  });
  it('is left out when there are no scores', () => {
    expect(print([])).not.toMatch(/Summary of Scores/);
  });
  it('escapes a subtest name typed by the clinician', () => {
    const html = print([{ assessment: 'Custom Assessment', subtest: '<img src=x onerror=alert(1)>', score: 90, scoreType: 'standard', classification: 'Average', percentile: 25 }]);
    expect(html).not.toMatch(/<img src=x/);
    expect(html).toMatch(/&lt;img src=x/);
  });
  it('passes axe checks for data tables', async () => {
    const doc = new DOMParser().parseFromString(print(SCORES), 'text/html');
    const host = document.createElement('main');
    host.innerHTML = doc.querySelector('#rw-print-scores').parentElement.outerHTML.replace(/^<main>|<\/main>$/g, '');
    document.body.appendChild(host);
    const results = await axe.run(host, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }, rules: { 'color-contrast': { enabled: false } } });
    host.remove();
    expect(results.violations.map(v => v.id)).toEqual([]);
  });
});

describe('Summary of Scores in the copied text', () => {
  it('lists the same values', () => {
    const text = U.scoreTableText(SCORES);
    expect(text).toMatch(/^SUMMARY OF SCORES/);
    expect(text).toMatch(/Full Scale IQ: 88 SS; percentile 21\*; CI 95%: 83–94; Low Average/);
    expect(text).toMatch(/Attention Problems: 66 T; percentile —; CI —; At-Risk/);
  });
});
