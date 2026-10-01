const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const { wrapSimpleIife } = require('../_build_simple_iife_module.js');

const reportDir = path.join('reports', 'report-fixes-2026-09-30');
const suites = [
  'tests/report_generation_recovery_interview.test.js',
  'tests/persona_core_enhancements.test.js',
  'tests/persona_interview_behavior.test.js',
];
const inputs = [
  'personas_source.jsx', 'personas_module.js', 'desktop/web-app/public/personas_module.js',
  'generate_dispatcher_source.jsx', 'generation_helpers_source.jsx',
  'tests/report_generation_recovery.candidate.setup.js',
  'tests/report_generation_recovery_interview.candidate.setup.js',
  'tests/report_generation_recovery_interview.vitest.config.js', ...suites,
];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const hashes = () => Object.fromEntries(inputs.map(file => [file, sha(fs.readFileSync(file))]));
fs.mkdirSync(reportDir, { recursive: true });
const before = hashes();
console.log(JSON.stringify({ runnerPID: process.pid, frozenSourceSHA256: before['personas_source.jsx'], suites }));
const expectedFrozenGeneration = {
  'generate_dispatcher_source.jsx': '189b2d246636c394d7dde7086a3e77797525458d2f94be79e0bab5155fd9195b',
  'generation_helpers_source.jsx': '375ef69704a9e0d2ca9956bad30703089f9180328ad2cfc09da4d5cd0434a6c5',
};
for (const [file, expected] of Object.entries(expectedFrozenGeneration)) {
  if (before[file] !== expected) throw new Error('Completed generation source baseline changed: ' + file);
}
const result = cp.spawnSync(process.execPath, [
  'node_modules/vitest/vitest.mjs', 'run', ...suites,
  '--config', 'tests/report_generation_recovery_interview.vitest.config.js',
  '--pool=threads', '--maxWorkers=1', '--reporter=default', '--reporter=json',
  '--outputFile=' + path.join(reportDir, 'interview-focused-tests.json'),
], { encoding: 'utf8' });
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
fs.writeFileSync(path.join(reportDir, 'interview-focused-validation.log'), (result.stdout || '') + '\n' + (result.stderr || ''));
const after = hashes();
const inputStable = JSON.stringify(before) === JSON.stringify(after);
let counts;
try {
  const report = JSON.parse(fs.readFileSync(path.join(reportDir, 'interview-focused-tests.json'), 'utf8'));
  counts = { total: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests, success: report.success, files: report.testResults.length };
} catch (error) { counts = { reportError: error.message }; }
const canonical = wrapSimpleIife({ source: fs.readFileSync('personas_source.jsx', 'utf8'), guardKey: 'Personas' });
new (require('node:vm').Script)(canonical, { filename: 'personas candidate wrapper' });
const summary = {
  completedAt: new Date().toISOString(), head: cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  exitCode: result.status, executionClean: result.status === 0, sourceOnlyCandidate: true, inputStable,
  pool: 'threads', maxWorkers: 1, suites, counts, hashesBefore: before, hashesAfter: after,
  baseline: {
    sourceSHA256: '3610d127d94289d8df3967b31ef34a5518674ac8f94aec20c3e6876cd8385e29',
    rootSHA256: '64d8d4d73c62fc6c6a48e2fcea262da724382b701e79a05967f04bdb40ea0927',
    publicSHA256: '64d8d4d73c62fc6c6a48e2fcea262da724382b701e79a05967f04bdb40ea0927',
    rootPublicEqual: true, sourceCanonicalMatchesRoot: true,
  },
  canonicalCandidateSHA256: sha(canonical), syntaxPassed: true,
  generatedPairsWrittenByWorker: false, hostIntegrationApplied: false,
  translationRegistryApplied: false, productionDeployment: false,
};
fs.writeFileSync(path.join(reportDir, 'interview-focused-validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ exitCode: result.status, counts, inputStable, sourceSHA256: after['personas_source.jsx'], canonicalCandidateSHA256: summary.canonicalCandidateSHA256 }));
if (result.error) throw result.error;
if (!inputStable) throw new Error('Interview validation inputs changed during the run');
process.exitCode = result.status === 0 ? 0 : result.status || 1;
