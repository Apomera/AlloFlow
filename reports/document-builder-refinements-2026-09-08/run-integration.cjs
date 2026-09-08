const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = process.cwd();
const out = path.join(root, 'reports/document-builder-refinements-2026-09-08');
const files = fs.readdirSync(path.join(root, 'tests')).filter(name =>
  /^(document_builder_|builder_export_recovery\.|export_builder_boundary_hardening\.|guided_builder_handoff\.|pdf_builder_confirmations_a11y\.|pipeline_builder_branching\.|export_preflight_modes\.)/.test(name)
  && name.endsWith('.test.js')
).map(name => 'tests/' + name);
if (!files.includes('tests/audit_coherence_fixes.test.js')) files.push('tests/audit_coherence_fixes.test.js');
const args = ['node_modules/vitest/vitest.mjs', 'run', ...files, '--maxWorkers=1', '--testTimeout=30000', '--reporter=json', '--outputFile=' + path.join(out, 'integration-tests.json')];
fs.writeFileSync(path.join(out, 'integration-files.json'), JSON.stringify(files, null, 2));
const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
fs.writeFileSync(path.join(out, 'integration-tests.log'), result.stdout + '\n' + result.stderr);
if (fs.existsSync(path.join(out, 'integration-tests.json'))) {
  const report = JSON.parse(fs.readFileSync(path.join(out, 'integration-tests.json'), 'utf8'));
  console.log(JSON.stringify({ files: files.length, tests: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests, success: report.success }));
  for (const file of report.testResults || []) for (const test of file.assertionResults || []) {
    if (test.status === 'failed') console.log(JSON.stringify({ file: file.name, test: test.fullName, failure: test.failureMessages?.join('\n').slice(0, 6500) }));
  }
}
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
