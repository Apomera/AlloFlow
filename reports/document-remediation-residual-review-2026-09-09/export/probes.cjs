'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const implementation = path.join(root, 'dev-tools/document_export_at_acceptance.cjs');
const { inspectHtml } = require(implementation);
const { chromium } = require(path.join(root, 'node_modules/playwright'));
const digest = () => crypto.createHash('sha256').update(fs.readFileSync(implementation)).digest('hex');
const documentHtml = body => '<!doctype html><html lang="en"><head><title>Export residual probe</title></head><body><main>' + body + '</main></body></html>';
const table = ({ header = '', row = '' } = {}) => '<table><caption>Course scores</caption><tr><th scope="col" ' + header + '>Student</th><th scope="col">Score</th></tr><tr ' + row + '><td>Ada</td><td>95</td></tr></table>';
const tableExpected = { title: 'Export residual probe', language: 'en', headings: [], readingOrder: ['Course scores', 'Student', 'Score', 'Ada', '95'], tables: [{ caption: 'Course scores', headers: ['Student', 'Score'], rows: [['Ada', '95']] }] };
const headingExpected = { title: 'Export residual probe', language: 'en', headings: [{ level: 1, name: 'Cafe\u0301' }], readingOrder: ['Cafe\u0301'], tables: [] };
const cases = [
  { id: 'table-valid-control', html: documentHtml(table()), expected: tableExpected, desired: 'passed' },
  { id: 'table-hidden-data-row', html: documentHtml(table({ row: 'aria-hidden="true"' })), expected: tableExpected, desired: 'failed' },
  { id: 'table-header-name-overridden', html: documentHtml(table({ header: 'aria-label="Teacher"' })), expected: tableExpected, desired: 'failed' },
  { id: 'heading-decomposed-control', html: documentHtml('<h1>Cafe\u0301</h1>'), expected: headingExpected, desired: 'passed' },
  { id: 'heading-canonical-equivalent', html: documentHtml('<h1>Caf\u00e9</h1>'), expected: headingExpected, desired: 'passed' },
];
(async () => {
  const output = path.join(__dirname, 'results.json');
  if (fs.existsSync(output)) throw new Error('Review results already exist; do not overwrite saved evidence.');
  const before = digest(), browser = await chromium.launch({ headless: true }), results = [];
  try {
    for (const item of cases) {
      const report = await inspectHtml(browser, path.join(__dirname, item.id + '.html'), item.expected, Buffer.from(item.html));
      const context = await browser.newContext({ javaScriptEnabled: false });
      let native;
      try {
        const page = await context.newPage();
        await page.setContent(item.html);
        native = { aria: await page.locator('body').ariaSnapshot(),
          exposedTables: await page.getByRole('table').count(), exposedCells: await page.getByRole('cell').count(),
          expectedStudentHeader: await page.getByRole('columnheader', { name: 'Student', exact: true }).count(),
          unexpectedTeacherHeader: await page.getByRole('columnheader', { name: 'Teacher', exact: true }).count(),
          expectedHeadingCanonicalTextMatches: item.expected.headings.length ? await page.locator('h1').evaluate((el, wanted) => el.textContent.normalize('NFC') === wanted.normalize('NFC'), item.expected.headings[0].name) : null };
      } finally { await context.close(); }
      const actual = report.checks.every(check => check.status === 'passed') ? 'passed' : 'failed';
      results.push({ ...item, actual, matchesDesired: actual === item.desired, report, native });
      console.log(JSON.stringify({ id: item.id, desired: item.desired, actual, coverageComplete: report.coverage.complete, failedChecks: report.checks.filter(check => check.status !== 'passed').map(check => check.id), native }));
    }
  } finally { await browser.close(); }
  fs.writeFileSync(output, JSON.stringify({ reviewedAt: new Date().toISOString(), scope: 'Read-only synthetic native Chromium probes of baseline export checker; no full pipeline or human screen-reader claims.', browserVersion: browser.version(), implementationSha256: before, implementationUnchanged: before === digest(), results }, null, 2) + '\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
