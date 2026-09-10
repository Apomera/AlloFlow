import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
const { inspectHtml } = require('../../dev-tools/document_export_at_acceptance.cjs');

const wrap = (body: string) => '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Residual export fixes</title></head><body><main>' + body + '</main></body></html>';
const base = { title: 'Residual export fixes', language: 'en', headings: [], readingOrder: [], tables: [] };
const expectedTable = (rowHeaders = false, heading = 'Student', rowName = 'Ada') => ({ ...base,
  tables: [{ caption: 'Course scores', headers: [heading, 'Score'], rows: [[rowName, '95']], rowHeaders }] });
const table = ({ table = '', row = '', first = '', second = '', header = '', headerText = 'Student', rowHeaders = false, rowName = 'Ada' } = {}) =>
  '<table ' + table + '><caption>Course scores</caption><tr><th scope="col" ' + header + '>' + headerText + '</th><th scope="col">Score</th></tr><tr ' + row + '>' +
  (rowHeaders ? '<th scope="row" ' + first + '>' + rowName + '</th>' : '<td ' + first + '>' + rowName + '</td>') + '<td ' + second + '>95</td></tr></table>';
const inspect = (browser: any, body: string, expected: any) => inspectHtml(browser, 'unused.html', expected, Buffer.from(wrap(body)));
const check = (report: any, id: string) => report.checks.find((item: any) => item.id === id);
const allPassed = (report: any) => report.checks.every((item: any) => item.status === 'passed');

for (const [name, body, expected] of [
  ['ordinary cells', table(), expectedTable()],
  ['row headers', table({ rowHeaders: true }), expectedTable(true)],
  ['explicit native roles', table({ table: 'role="table"', row: 'role="row"', first: 'role="cell"', second: 'role="cell"' }), expectedTable()],
  ['canonical header names', table({ headerText: 'Cafe\u0301', rowName: 'Cafe\u0301', rowHeaders: true }), expectedTable(true, 'Caf\u00e9', 'Caf\u00e9')],
  ['equal ARIA names', table({ header: 'aria-label="Student"' }), expectedTable()],
  ['image-only header', table({ headerText: '<img alt="Student" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">' }), expectedTable()],
] as const) {
  test('valid table contract retains ' + name, async ({ browser }, testInfo) => {
    const report = await inspect(browser, body, expected);
    fs.writeFileSync(testInfo.outputPath('observations.json'), JSON.stringify(report, null, 2));
    expect(allPassed(report)).toBe(true);
    const cells = check(report, 'html.table-1').observed.accessibility.flat();
    expect(cells.every((cell: any) => cell.exposed && cell.inRow && cell.inTable)).toBe(true);
  });
}

for (const [name, body, expected] of [
  ['hidden data row', table({ row: 'aria-hidden="true"' }), expectedTable()],
  ['hidden data cell', table({ second: 'aria-hidden="true"' }), expectedTable()],
  ['CSS hidden data row', table({ row: 'style="display:none"' }), expectedTable()],
  ['downgraded data role', table({ second: 'role="button"' }), expectedTable()],
  ['downgraded row role', table({ row: 'role="list"' }), expectedTable()],
  ['reassigned data cell', '<div role="table"><div role="row" aria-owns="score"></div></div>' + table({ second: 'id="score"' }), expectedTable()],
  ['wrong column name', table({ header: 'aria-label="Teacher"' }), expectedTable()],
  ['wrong row-header name', table({ rowHeaders: true, first: 'aria-label="Grace"' }), expectedTable(true)],
  ['wrong data name', table({ second: 'aria-label="59"' }), expectedTable()],
  ['unrelated matching header', '<div role="columnheader">Student</div>' + table({ header: 'aria-label="Teacher"' }), expectedTable()],
  ['header accent lost', table({ headerText: 'Cafe' }), expectedTable(false, 'Caf\u00e9')],
  ['header compatibility difference', table({ headerText: 'x2' }), expectedTable(false, 'x²')],
] as const) {
  test('table acceptance rejects ' + name, async ({ browser }, testInfo) => {
    const report = await inspect(browser, body, expected);
    fs.writeFileSync(testInfo.outputPath('observations.json'), JSON.stringify(report, null, 2));
    expect(check(report, 'html.table-1').status).toBe('failed');
    expect(report.coverage.complete).toBe(true);
  });
}

for (const [name, actual, wanted] of [
  ['composed to decomposed', 'Caf\u00e9', 'Cafe\u0301'],
  ['decomposed to composed', 'Cafe\u0301', 'Caf\u00e9'],
  ['combining mark order', 'a\u0315\u0300', 'a\u0300\u0315'],
] as const) {
  test('heading normalization accepts ' + name, async ({ browser }, testInfo) => {
    const report = await inspect(browser, '<h1>' + actual + '</h1>', { ...base, headings: [{ level: 1, name: wanted }] });
    fs.writeFileSync(testInfo.outputPath('observations.json'), JSON.stringify(report, null, 2));
    expect(allPassed(report)).toBe(true);
  });
}

test('heading name and visible text may use different canonical forms', async ({ browser }) => {
  const report = await inspect(browser, '<h1 aria-label="Cafe\u0301">Caf\u00e9</h1>', { ...base, headings: [{ level: 1, name: 'Caf\u00e9' }] });
  expect(allPassed(report)).toBe(true);
});

for (const [name, body, wanted] of [
  ['lost accent', '<h1>Cafe</h1>', 'Caf\u00e9'],
  ['compatibility difference', '<h1>x2</h1>', 'x²'],
  ['wrong accessible name', '<h1 aria-label="Tea">Caf\u00e9</h1>', 'Caf\u00e9'],
  ['wrong level', '<h1 aria-level="2">Caf\u00e9</h1>', 'Caf\u00e9'],
  ['hidden heading with exposed substitute', '<h1 aria-hidden="true">Caf\u00e9</h1><div role="heading" aria-level="1">Cafe\u0301</div>', 'Caf\u00e9'],
  ['ambiguous normalized names', '<h1>Caf\u00e9</h1><div role="heading" aria-level="1">Cafe\u0301</div>', 'Caf\u00e9'],
] as const) {
  test('heading normalization preserves rejection for ' + name, async ({ browser }, testInfo) => {
    const report = await inspect(browser, body, { ...base, headings: [{ level: 1, name: wanted }] });
    fs.writeFileSync(testInfo.outputPath('observations.json'), JSON.stringify(report, null, 2));
    expect(check(report, 'html.heading-navigation-semantics').status).toBe('failed');
    expect(report.coverage.complete).toBe(true);
  });
}
