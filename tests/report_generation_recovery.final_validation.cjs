const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');

const reportDir = path.join('reports', 'report-fixes-2026-09-30');
const suites = [
  'tests/report_generation_recovery.test.js',
  'tests/document_citation_adaptation.test.js',
  'tests/novak_generation_preservation.test.js',
  'tests/generate_dispatcher_memory_aid_security.test.js',
  'tests/applied_challenge_generation.test.js',
];
const inputs = [
  'generate_dispatcher_source.jsx', 'generation_helpers_source.jsx',
  'generate_dispatcher_module.js', 'generation_helpers_module.js',
  'desktop/web-app/public/generate_dispatcher_module.js',
  'desktop/web-app/public/generation_helpers_module.js',
  'tests/report_generation_recovery.candidate.setup.js',
  'tests/report_generation_recovery.vitest.config.js', ...suites,
];
const hashes = () => Object.fromEntries(inputs.map(file => [file,
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
fs.mkdirSync(reportDir, { recursive: true });
const before = hashes();
const result = cp.spawnSync(process.execPath, [
  'node_modules/vitest/vitest.mjs', 'run', ...suites,
  '--config', 'tests/report_generation_recovery.vitest.config.js',
  '--pool=threads', '--maxWorkers=1', '--reporter=default', '--reporter=json',
  '--outputFile=' + path.join(reportDir, 'generation-tests.json'),
], { encoding: 'utf8' });
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
const after = hashes();
const inputStable = JSON.stringify(before) === JSON.stringify(after);
let counts = null;
try {
  const report = JSON.parse(fs.readFileSync(path.join(reportDir, 'generation-tests.json'), 'utf8'));
  counts = { total: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests,
    success: report.success, files: report.testResults?.length || 0 };
} catch (error) { counts = { reportError: error.message }; }
const summary = { completedAt: new Date().toISOString(), exitCode: result.status,
  sourceOnlyCandidate: true, pool: 'threads', maxWorkers: 1, suites, counts,
  inputStable, hashesBefore: before, hashesAfter: after,
  hostIntegrationApplied: false, productionDeployment: false };
fs.writeFileSync(path.join(reportDir, 'generation-validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ exitCode: result.status, counts, inputStable }));
if (result.error) throw result.error;
if (!inputStable) throw new Error('Frozen generation inputs changed during validation');
process.exitCode = result.status === 0 ? 0 : result.status || 1;
