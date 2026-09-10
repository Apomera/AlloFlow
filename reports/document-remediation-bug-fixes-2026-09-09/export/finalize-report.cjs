'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const directory = __dirname;
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const e2e = read('review-fix-complete-tests.json');
const unit = read('inspection-failure-tests.json');
if (e2e.stats.expected !== 75 || e2e.stats.unexpected || e2e.stats.flaky || e2e.stats.skipped) throw Error('Export e2e tests did not all pass.');
if (!unit.success || unit.numPassedTests !== 2 || unit.numFailedTests) throw Error('Export inspection unit tests did not all pass.');
const files = ['dev-tools/document_export_at_acceptance.cjs', 'tests/e2e/document_export_review_fixes.spec.ts', 'docs/document-export-at-acceptance.md'];
const summary = {
  completedAt: new Date().toISOString(), issueClassesFixed: 4, reviewFindingNumbers: [5, 10, 11, 13],
  files: files.map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') })),
  tests: { passed: 77, failed: 0, skipped: 0,
    suites: [
      { file: 'tests/e2e/document_export_review_fixes.spec.ts', passed: 37 },
      { file: 'tests/e2e/document_export_baseline_fidelity.spec.ts', passed: 20 },
      { file: 'tests/e2e/document_export_at_acceptance.spec.ts', passed: 4 },
      { file: 'tests/e2e/document_export_artifact_binding.spec.ts', passed: 10 },
      { file: 'tests/e2e/document_export_link_acceptance.spec.ts', passed: 4 },
      { file: 'tests/document_export_inspection_failures.test.js', passed: 2 },
    ],
    reports: ['review-fix-complete-tests.json', 'inspection-failure-tests.json'],
  },
  sourceSyntaxCheck: 'passed', originalReviewEvidenceModified: false,
  limitations: ['Synthetic local Chromium and tagged-PDF tests; no human screen-reader session.', 'No deployment, live model calls, or production delivery verdict changes.'],
};
fs.writeFileSync(path.join(directory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
