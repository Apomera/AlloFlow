const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const expectedUnits = Number(process.env.ATC_EXPECTED_UNIT_TESTS || 345);
const expectedFiles = Number(process.env.ATC_EXPECTED_UNIT_FILES || 25);
assert.ok(Number.isSafeInteger(expectedUnits) && expectedUnits > 0, 'ATC_EXPECTED_UNIT_TESTS must be a positive integer');
assert.ok(Number.isSafeInteger(expectedFiles) && expectedFiles > 0, 'ATC_EXPECTED_UNIT_FILES must be a positive integer');

const assetFiles = [
  'stem_lab/stem_tool_atctower.js',
  'desktop/web-app/public/stem_lab/stem_tool_atctower.js',
  'ui_strings.js',
  'desktop/web-app/public/ui_strings.js',
  'dev-tools/i18n/stem_atctower_en.json'
];
const suiteSpecs = [
  ['atc-motion-exploration-2026-10-06', 17],
  ['atc-flight-paths-2026-10-05', 16],
  ['atc-practice-flow-2026-10-04', 17],
  ['atc-visual-design-2026-10-04', 22]
];
const expectedBrowserChecks = suiteSpecs.reduce((sum, [, count]) => sum + count, 0);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assetHashes = () => Object.fromEntries(assetFiles.map(file => [file, digest(fs.readFileSync(path.join(root, file)))]));
const initialHashes = assetHashes();
const proof = {
  startedAt: new Date().toISOString(), sourceSha256: initialHashes[assetFiles[0]],
  frozenAssetHashes: initialHashes, unitTestPool: 'forks',
  expectedUnitTests: expectedUnits, expectedUnitFiles: expectedFiles,
  expectedBrowserChecks, suites: [], complete: false
};
const runDir = path.join(__dirname, 'validation', proof.startedAt.replace(/[^0-9A-Za-z]/g, ''));
const recoveredDir = process.argv[2] ? path.resolve(root, process.argv[2]) : null;
const proofPath = path.join(runDir, 'validation-results.json');
fs.mkdirSync(runDir, { recursive: true });

function saveProof() {
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2) + '\n');
}
function assertFrozen() {
  assert.deepEqual(assetHashes(), proof.frozenAssetHashes, 'Canonical source, desktop mirror, or English catalog changed during validation');
}
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function proofFile(reference, directory) {
  if (!reference || typeof reference !== 'string') return null;
  const candidates = path.isAbsolute(reference) ? [reference] : [
    path.resolve(directory, reference),
    // Earlier runners recorded paths relative to their report root.
    path.resolve(path.dirname(path.dirname(directory)), reference),
    path.resolve(__dirname, reference), path.resolve(root, reference)
  ];
  return candidates.find(file => fs.existsSync(file) && fs.statSync(file).isFile()) || null;
}
function execute(script, logName, resultsPath) {
  const logPath = path.join(runDir, logName), log = fs.openSync(logPath, 'wx');
  let child;
  try {
    child = spawnSync(process.execPath, [path.join(root, script)], {
      cwd: root,
      env: { ...process.env, ATC_TEST_POOL: 'forks', ...(resultsPath ? { ATC_QA_RESULTS_PATH: resultsPath, ATC_QA_ARTIFACT_DIR: path.dirname(resultsPath) } : {}) },
      stdio: ['ignore', log, log]
    });
  } finally { fs.closeSync(log); }
  if (child.error) throw child.error;
  assert.equal(child.status, 0, script + ' failed; inspect ' + logPath);
  assertFrozen();
  return logPath;
}
function browserProofValid(result, count) {
  return !!(result && result.sourceHash === proof.sourceSha256 && result.sourceStable === true &&
    Array.isArray(result.checks) && result.checks.length === count && result.checks.every(check => check.pass === true) &&
    (!result.errors || (Array.isArray(result.errors) && result.errors.length === 0)) &&
    (!result.runtimeErrors || (Array.isArray(result.runtimeErrors) && result.runtimeErrors.length === 0)) &&
    (result.passed == null || result.passed === count) && (result.failed == null || result.failed === 0));
}

saveProof();
try {
  // Save the exact input bytes, including both mirrors and the translation files.
  for (const file of assetFiles) {
    const destination = path.join(runDir, 'frozen', file);
    const bytes = fs.readFileSync(path.join(root, file));
    assert.equal(digest(bytes), proof.frozenAssetHashes[file], file + ' changed before its frozen copy was written');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
  }
  assertFrozen();

  let previousProof = null, sameFrozenInputs = false;
  if (recoveredDir) {
    previousProof = readJson(path.join(recoveredDir, 'validation-results.json'));
    const previousParity = readJson(path.join(recoveredDir, 'parity-check.txt'));
    assert.equal(previousProof.sourceSha256, proof.sourceSha256, 'Recovery requires the same canonical source SHA');
    assert.equal(previousParity.sourceSha256, proof.sourceSha256, 'Recovery requires the same verified source SHA');
    assert.ok(previousParity.syntaxValid && previousParity.toolMirrorsEqual && previousParity.englishNamespacesEqual && previousParity.developmentEnglishCatalogEqual, 'Recovery parity proof must have passed');
    // Older proof files without the frozen-input hashes can be inspected, but
    // cannot establish that all browser inputs are identical and are rerun.
    sameFrozenInputs = !!previousProof.frozenAssetHashes && assetFiles.every(file => previousProof.frozenAssetHashes[file] === proof.frozenAssetHashes[file]);
    if (previousProof.frozenAssetHashes) assert.ok(sameFrozenInputs, 'Recovery input hashes differ; use a fresh validation run');
    proof.resumedFrom = recoveredDir;
    proof.recoveryInputsVerified = sameFrozenInputs;
  }

  const parityLog = execute('reports/atc-motion-exploration-2026-10-06/verify.cjs', 'parity-check.txt');
  const parity = readJson(parityLog);
  assert.equal(parity.sourceSha256, proof.sourceSha256);
  assert.ok(parity.syntaxValid && parity.toolMirrorsEqual && parity.englishNamespacesEqual && parity.developmentEnglishCatalogEqual);
  proof.parityPassed = true;
  proof.englishKeyCount = parity.englishKeyCount;
  proof.parityLog = parityLog;
  saveProof();

  const recoveredUnitLog = previousProof && proofFile(previousProof.unitLog, recoveredDir);
  const reuseUnits = !!(sameFrozenInputs && recoveredUnitLog && previousProof.unitTestPool === 'forks' &&
    previousProof.unitTestsPassed === expectedUnits && previousProof.unitFilesPassed === expectedFiles);
  const unitLog = reuseUnits ? recoveredUnitLog : execute('reports/atc-deep-dive-2026-10-03/run-tests.cjs', 'unit-tests.txt');
  const output = fs.readFileSync(unitLog, 'utf8').replace(/\x1b\[[0-9;]*m/g, '');
  assert.match(output, new RegExp('Test Files\\s+' + expectedFiles + ' passed \\(' + expectedFiles + '\\)'));
  assert.match(output, new RegExp('Tests\\s+' + expectedUnits + ' passed \\(' + expectedUnits + '\\)'));
  proof.unitTestsPassed = expectedUnits;
  proof.unitFilesPassed = expectedFiles;
  proof.unitLog = unitLog;
  proof.unitTestsReused = reuseUnits;
  assertFrozen(); saveProof();
  console.log(expectedUnits + ' unit tests passed in ' + expectedFiles + ' files using forks');

  for (const [name, count] of suiteSpecs) {
    const previousSuite = previousProof && (previousProof.suites || []).find(suite => suite.name === name);
    const declaredFile = previousSuite && proofFile(previousSuite.resultsFile, recoveredDir);
    const conventionalFile = recoveredDir && path.join(recoveredDir, name, 'browser-qa-results.json');
    const previousFile = declaredFile || (conventionalFile && fs.existsSync(conventionalFile) ? conventionalFile : null);
    let prior = null;
    if (sameFrozenInputs && previousFile) {
      try { prior = readJson(previousFile); } catch (_) { /* An interrupted JSON write is rerun. */ }
    }
    const reuse = sameFrozenInputs && browserProofValid(prior, count);
    const resultsPath = reuse ? previousFile : path.join(runDir, name, 'browser-qa-results.json');
    console.log((reuse ? 'Verifying completed ' : 'Running ') + name);
    if (!reuse) {
      fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
      execute('reports/' + name + '/browser-qa.cjs', name + '.txt', resultsPath);
    }
    const result = readJson(resultsPath);
    assert.ok(browserProofValid(result, count), name + ' lacks a complete same-source proof with zero runtime errors; inspect ' + resultsPath);
    assertFrozen();
    proof.suites.push({ name, checksPassed: count, reused: !!reuse, resultsFile: resultsPath });
    proof.browserChecksPassed = proof.suites.reduce((sum, suite) => sum + suite.checksPassed, 0);
    saveProof();
    console.log(count + ' checks passed in ' + name);
  }
  assert.equal(proof.suites.length, suiteSpecs.length);
  assert.equal(proof.browserChecksPassed, expectedBrowserChecks);
  assertFrozen();
  proof.complete = true;
} catch (error) {
  proof.error = error.stack; proof.complete = false;
  process.exitCode = 1; console.error(error.message);
} finally {
  proof.completedAt = new Date().toISOString();
  try {
    const finalHashes = assetHashes();
    proof.sourceStable = finalHashes[assetFiles[0]] === proof.sourceSha256;
    proof.frozenInputsStable = assetFiles.every(file => finalHashes[file] === proof.frozenAssetHashes[file]);
  } catch (error) { proof.sourceStable = false; proof.frozenInputsStable = false; proof.error = proof.error || error.stack; }
  if (!proof.sourceStable || !proof.frozenInputsStable) { proof.complete = false; process.exitCode = 1; }
  saveProof();
  console.log(JSON.stringify({ complete: proof.complete, unitTestsPassed: proof.unitTestsPassed || 0, browserChecksPassed: proof.browserChecksPassed || 0, result: proofPath }));
}
