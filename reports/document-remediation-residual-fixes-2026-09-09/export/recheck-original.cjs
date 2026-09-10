'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const implementation = path.join(root, 'dev-tools/document_export_at_acceptance.cjs');
const implementationSha256 = crypto.createHash('sha256').update(fs.readFileSync(implementation)).digest('hex');
const { inspectHtml } = require(implementation);
const { chromium } = require(path.join(root, 'node_modules/playwright'));
const original = JSON.parse(fs.readFileSync(path.join(root, 'reports/document-remediation-residual-review-2026-09-09/export/results.json'), 'utf8'));
(async () => {
  const output = path.join(__dirname, 'original-case-results.json');
  if (fs.existsSync(output)) throw Error('Refuse to overwrite original-case evidence.');
  const browser = await chromium.launch({ headless: true }), results = [];
  try {
    for (const item of original.results) {
      const report = await inspectHtml(browser, 'unused.html', item.expected, Buffer.from(item.html));
      const actual = report.checks.every(check => check.status === 'passed') ? 'passed' : 'failed';
      results.push({ id: item.id, desired: item.desired, before: item.actual, actual, matchesDesired: actual === item.desired, report });
    }
    fs.writeFileSync(output, JSON.stringify({ measuredAt: new Date().toISOString(), implementationSha256, browserVersion: browser.version(),
      scope: 'Original synthetic HTML export residual fixtures only; no application pipeline, PDF, or human screen-reader conclusion.', results }, null, 2) + '\n');
  } finally { await browser.close(); }
  console.log(JSON.stringify({ cases: results.length, matchesDesired: results.filter(result => result.matchesDesired).length }));
  if (results.some(result => !result.matchesDesired)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
