// Read-only application/patch verification; writes only the track 11 report.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { applyPatch } = require('diff');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'reports/lookup-recovery/resilience');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const baseline = JSON.parse(fs.readFileSync(path.join(directory, 'baseline.json'), 'utf8'));
const tests = JSON.parse(fs.readFileSync(path.join(directory, 'tests.json'), 'utf8'));
const report = { inspectedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), files: {}, dependencies: {}, artifacts: {} };
for (const [file, name] of [['dictionary_loader.js', 'dictionary'], ['content_engine_source.jsx', 'engine'], ['view_simplified_source.jsx', 'reader']]) {
  const current = read(file), candidate = fs.readFileSync(path.join(directory, name + '.candidate.source.js'), 'utf8');
  const patch = fs.readFileSync(path.join(directory, name + '.patch'), 'utf8');
  let patchApplies = true, patchError;
  try { execFileSync('git', ['apply', '--check', '--ignore-space-change', '-p0', path.join(directory, name + '.patch')], { cwd: root, encoding: 'utf8', stdio: 'pipe' }); }
  catch (error) { patchApplies = false; patchError = String(error.stderr || error.message); }
  require('@babel/parser').parse(candidate, { sourceType: 'script', plugins: ['jsx'] });
  report.files[file] = {
    testedSourceSha256: baseline.files[file].sourceSha256, currentSourceSha256: hash(current),
    currentMatchesTestedSource: hash(current) === baseline.files[file].sourceSha256,
    candidateMatchesRecordedHash: hash(candidate) === baseline.files[file].candidateSourceSha256,
    patchReproducesCandidate: applyPatch(current.replace(/\r\n/g, '\n'), patch) === candidate,
    patchApplies, ...(patchError ? { patchError } : {}), candidateParses: true
  };
}
for (const [file, expected] of Object.entries(baseline.dependencies)) report.dependencies[file] = { testedSha256: expected, currentSha256: hash(read(file)), currentMatchesTestedSource: hash(read(file)) === expected };
for (const file of ['content_engine_module.candidate.js', 'view_simplified_module.candidate.js', 'host.baseline.source.js', 'tests.json']) report.artifacts[file] = hash(fs.readFileSync(path.join(directory, file)));
report.tests = { passed: tests.numPassedTests, failed: tests.numFailedTests, files: tests.testResults.length, success: tests.success };
report.verified = tests.success && report.head === baseline.head
  && Object.values(report.files).every(file => file.currentMatchesTestedSource && file.candidateMatchesRecordedHash && file.patchReproducesCandidate && file.patchApplies)
  && Object.values(report.dependencies).every(file => file.currentMatchesTestedSource);
fs.writeFileSync(path.join(directory, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ verified: report.verified, head: report.head, tests: report.tests, files: report.files, dependencies: report.dependencies }, null, 2));
if (!report.verified) process.exitCode = 1;
