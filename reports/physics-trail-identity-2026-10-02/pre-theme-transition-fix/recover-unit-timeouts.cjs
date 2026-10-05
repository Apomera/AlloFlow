// Run from the repository root after the full unit report finishes.
// Retains original results and reruns missing workers and timeout-affected files.
const fs = require('node:fs'), cp = require('node:child_process');
const path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const report = 'reports/physics-trail-identity-2026-10-02';
const sourcePath = 'stem_lab/stem_tool_physics.js';
const mirrorPath = 'desktop/web-app/public/stem_lab/stem_tool_physics.js';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const source = fs.readFileSync(sourcePath);
assert.equal(digest(source), 'd2761bd2af6147f6e5cff47d44569ceb9fc1d214115ce0fb3186dc7bae422a10');
assert(source.equals(fs.readFileSync(mirrorPath)), 'Source and desktop copy differ');
const initialPath = report + '/unit-results.json', recoveryPath = report + '/unit-recovery-results.json';
const initialBytes = fs.readFileSync(initialPath), initial = JSON.parse(initialBytes);
const initialConsolePath = report + '/unit-thread-console.txt';
const initialConsoleBytes = fs.readFileSync(initialConsolePath);
const initialConsole = initialConsoleBytes.toString('utf8');
const relativeFile = name => path.relative(process.cwd(), name).replaceAll('\\', '/');
const baseline = JSON.parse(fs.readFileSync('reports/physics-point-clarity-2026-10-02/unit-results.json', 'utf8'));
const expectedFiles = baseline.testResults.map(file => relativeFile(file.name)).sort();
assert.equal(expectedFiles.length, 21, 'Unexpected reference unit file set');
assert.equal(new Set(expectedFiles).size, 21);
for (const file of expectedFiles) assert(/^tests\/physics(?:_|\/)[\w/.-]+\.test\.[cm]?[jt]sx?$/.test(file), 'Unexpected unit file: ' + file);
const testBytesBefore = new Map(expectedFiles.map(file => [file, fs.readFileSync(file)]));
const initialFiles = new Set(initial.testResults.filter(file => file.assertionResults.length).map(file => relativeFile(file.name)));
for (const file of initialFiles) assert(expectedFiles.includes(file), 'Unexpected initial unit file: ' + file);
const missing = expectedFiles.filter(file => !initialFiles.has(file));
const failed = initial.testResults.filter(file => file.assertionResults.some(test => test.status === 'failed'));
assert(failed.length > 0 || missing.length > 0, 'No files require recovery');
for (const file of missing) assert(initialConsole.replaceAll('\\', '/').includes('Failed to start threads worker for test files ' + path.resolve(file).replaceAll('\\', '/') + '.'), 'Missing worker lacks captured startup evidence: ' + file);
const timedOutFiles = failed.map(file => {
  for (const test of file.assertionResults.filter(test => test.status === 'failed')) {
    const scanTimeout = relativeFile(file.name) === 'tests/physics_drag_integrator.test.js'
      && test.fullName.includes('scans every stem_lab/stem_tool_*.js')
      && initialConsole.includes('FAIL  tests/physics_drag_integrator.test.js')
      && initialConsole.includes('Error: Test timed out in 180000ms.');
    assert(test.failureMessages.some(message => /test timed out/i.test(message)) || scanTimeout,
      'A failure requires investigation beyond worker/timeout recovery');
  }
  const relative = relativeFile(file.name);
  assert(expectedFiles.includes(relative), 'Unexpected recovery file: ' + relative);
  return relative;
});
const recoveredFiles = [...new Set([...missing, ...timedOutFiles])].sort();
// Warm the cloud-backed files before the scan's unchanged explicit three-minute limit.
if (recoveredFiles.includes('tests/physics_drag_integrator.test.js')) {
  for (const file of fs.readdirSync('stem_lab').filter(file => /^stem_tool_.*\.js$/.test(file))) fs.readFileSync('stem_lab/' + file);
}
try {
  const result = cp.spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...recoveredFiles,
    '--maxWorkers=1', '--pool=threads', '--no-file-parallelism', '--testTimeout=30000', '--hookTimeout=30000', '--reporter=default', '--reporter=json',
    '--outputFile=' + recoveryPath], { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error('Unit recovery exited with status ' + result.status);
} finally {
  assert(fs.readFileSync(sourcePath).equals(source), 'Source changed during unit recovery');
  assert(fs.readFileSync(mirrorPath).equals(source), 'Desktop copy changed during unit recovery');
  assert(fs.readFileSync(initialPath).equals(initialBytes), 'Initial unit report changed during recovery');
  assert(fs.readFileSync(initialConsolePath).equals(initialConsoleBytes), 'Captured initial console changed during recovery');
  for (const [file, bytes] of testBytesBefore) assert(fs.readFileSync(file).equals(bytes), 'Unit test changed during recovery: ' + file);
  fs.writeFileSync(report + '/unit-recovery-integrity.json', JSON.stringify({
    sourceSha256: digest(source), sourceUnchanged: true, mirrorMatches: true, recoveredFiles,
    initialUnitResultsSha256: digest(initialBytes),
    recoveryResultsSha256: fs.existsSync(recoveryPath) ? digest(fs.readFileSync(recoveryPath)) : null,
    initialConsolePath, initialConsoleSha256: digest(initialConsoleBytes),
    unitTestFilesSha256Before: Object.fromEntries([...testBytesBefore].map(([file, bytes]) => [file, digest(bytes)])),
    unitTestFilesSha256After: Object.fromEntries(expectedFiles.map(file => [file, digest(fs.readFileSync(file))])),
    testTimeoutMilliseconds: 30000
  }, null, 2) + '\n');
}
