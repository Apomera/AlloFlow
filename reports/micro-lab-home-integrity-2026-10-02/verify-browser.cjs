// Verify 70 distinct scenarios from the unchanged full run and its exact recheck.
// The original failed runner remains failed; this is a combined evidence proof.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const sourceSha256 = '02560e3ccade76c6ca803b2bd785de774e4f85d3dcc08d0a1a502cc1eb5fe132';
const expectedFiles = {
  'microbiology-annotation-integrity.spec.ts': 7,
  'microbiology-portfolio-selection.spec.ts': 6,
  'microbiology-growth-citations.spec.ts': 7,
  'microbiology-portfolio.spec.ts': 6,
  'microbiology-experiment-design.spec.ts': 6,
  'microbiology-guided-resume.spec.ts': 5,
  'microbiology-evidence-review.spec.ts': 6,
  'microbiology-evidence-recovery.spec.ts': 6,
  'microbiology-measurement-conversion.spec.ts': 7,
  'microbiology-mystery-integrity.spec.ts': 7,
  'microbiology-home-integrity.spec.ts': 7
};
const knownScenario = {
  id: 'a5d26b7891720041c0d5-6e3b8efb3d39ec32b554',
  file: 'microbiology-annotation-integrity.spec.ts',
  title: 'literal keyboard annotations retain state at 320 pixels and 2×/4× CSS zoom without internal overflow',
  line: 272, column: 5, projectId: 'chromium', projectName: 'chromium', expectedStatus: 'passed', timeout: 90000
};

// These support files were not in the original runner's eleven test hashes.
// Record the evidence as observed: current hashes and modification times that
// precede the full run, rather than claiming hashes were captured before it.
const supportObservedAt = '2026-10-03T04:34:28.006Z';
const support = {
  'playwright.config.ts': { sha256: 'dd25cef775e22bc7fee28a22d3118cce83545f5f14c48cf6e78619998ec73587', size: 2919, mtimeMs: 1786929291279.9229 },
  'tests/e2e/helpers/stem_gl_harness.ts': { sha256: '137cf2792a5d5bef585c1c93e0be141dd761544f27a223cc12d1f0f91a3cb3d6', size: 36899, mtimeMs: 1790119278803.934 },
  'tests/e2e/helpers/png_pixels.ts': { sha256: '866db36c5fa464fb91fb1e66449c5b3ad7e7d65c45196f3c1b3ac2cf76a4f7b4', size: 4701, mtimeMs: 1790114943397.0186 },
  'desktop/web-app/node_modules/react/umd/react.production.min.js': { sha256: 'd949f1c3687aedadcedac85261865f29b17cd273997e7f6b2bfc53b2f9d4c4dd', size: 10751, mtimeMs: 1785082300009.0256 },
  'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js': { sha256: '35f4f974f4b2bcd44da73963347f8952e341f83909e4498227d4e26b98f66f0d', size: 131835, mtimeMs: 1785082305065.4705 },
  'vendor/three-r128/three.min.js': { sha256: '9274bbcec8d96168626c732b5d31c775aa8cfb7eaa0599bec0c175908a2c1ce2', size: 603445, mtimeMs: 1784834670670.0376 },
  'node_modules/@playwright/test/package.json': { sha256: 'cf92117ef1d8cbf1e4b2dffb63a0da552c0173bd6052f0f45711c0f00b79dc99', size: 754, mtimeMs: 1785080049807.1438 },
  'node_modules/playwright/package.json': { sha256: '8be9edc5642a8c761b677e7af8b9937f36c0443a91e14765877716d70034e5bf', size: 1559, mtimeMs: 1785080051174.9424 }
};
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sorted = values => [...values].sort();
const normalizeFile = file => file.replace(/\\/g, '/');
function read(name) {
  const bytes = fs.readFileSync(path.join(__dirname, name));
  return { name, sha256: hash(bytes), value: JSON.parse(bytes.toString('utf8')) };
}
function time(value) {
  const parsed = Date.parse(value); assert(Number.isFinite(parsed), 'Invalid evidence time: ' + value); return parsed;
}
function collect(report) {
  const scenarios = [];
  function visit(suite, titles) {
    for (const spec of suite.specs || []) {
      assert(Array.isArray(spec.tests) && spec.tests.length === 1, 'Each scenario must have exactly one Chromium result.');
      scenarios.push({ spec, test: spec.tests[0], titlePath: [...titles, spec.title] });
    }
    for (const child of suite.suites || []) visit(child, [...titles, child.title]);
  }
  visit(report, []); return scenarios;
}
function identifier(item) {
  const { spec, test, titlePath } = item;
  return { id: spec.id, file: normalizeFile(spec.file), title: spec.title, titlePath,
    line: spec.line, column: spec.column, projectId: test.projectId, projectName: test.projectName,
    expectedStatus: test.expectedStatus, timeout: test.timeout };
}
function configForComparison(config) {
  const result = JSON.parse(JSON.stringify(config));
  // Selection and output locations legitimately differ for an exact recheck.
  for (const key of ['grep', 'grepInvert', 'reporter', 'outputDir']) delete result[key];
  for (const project of result.projects || []) delete project.outputDir;
  return result;
}
function sortedObject(value) {
  if (Array.isArray(value)) return value.map(sortedObject);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortedObject(value[key])]));
  return value;
}

module.exports = function verifyBrowser() {
  const fullReceipt = read('browser-run-status.json'), fullResult = read('browser-results.json');
  const base = fullReceipt.value, complete = base.phase === 'passed';
  assert.equal(base.kind, 'browser'); assert.equal(base.phase, complete ? 'passed' : 'failed'); assert.equal(base.exitCode, complete ? 0 : 1); assert.equal(base.expected, 70);
  const recheckReceipt = complete ? null : read('browser-recheck-run-status.json');
  const recheckResult = complete ? null : read('browser-recheck-results.json');
  const recheck = recheckReceipt && recheckReceipt.value;
  if (!complete) {
    assert.equal(recheck.kind, 'browser-recheck'); assert.equal(recheck.phase, 'passed'); assert.equal(recheck.exitCode, 0); assert.equal(recheck.expected, 1);
  }
  const runners = complete ? [base] : [base, recheck];
  for (const status of runners) {
    assert.equal(status.signal, null); assert.equal(status.sourceSha256, sourceSha256);
    assert(!Object.hasOwn(status, 'error'), 'Runner stopped outside the documented test result.');
    for (const key of ['sourceStillMatches', 'testInputsStillMatch', 'syntaxChecksPassed']) assert.equal(status[key], true);
    assert(time(status.started) < time(status.finished));
  }
  if (!complete) assert(time(base.finished) <= time(recheck.started), 'The original run and recheck must not overlap.');
  for (const file of ['stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js']) {
    assert.equal(hash(fs.readFileSync(path.join(root, file))), sourceSha256, 'Runtime changed: ' + file);
  }
  const inputNames = Object.keys(expectedFiles).map(file => 'tests/e2e/' + file);
  assert.deepEqual(sorted(Object.keys(base.testInputs)), sorted(inputNames));
  if (!complete) assert.deepEqual(Object.keys(recheck.testInputs), ['tests/e2e/' + knownScenario.file]);
  for (const [file, sha256] of Object.entries(base.testInputs)) {
    assert(/^[a-f0-9]{64}$/.test(sha256));
    assert.equal(hash(fs.readFileSync(path.join(root, file))), sha256, 'Browser input changed: ' + file);
  }
  if (!complete) assert.equal(recheck.testInputs['tests/e2e/' + knownScenario.file], base.testInputs['tests/e2e/' + knownScenario.file]);
  for (const [file, expected] of Object.entries(support)) {
    const absolute = path.join(root, file), stats = fs.statSync(absolute);
    assert.equal(hash(fs.readFileSync(absolute)), expected.sha256, 'Support file changed after observation: ' + file);
    assert.equal(stats.size, expected.size); assert.equal(stats.mtimeMs, expected.mtimeMs);
    assert(expected.mtimeMs < time(base.started), 'Support file has no pre-run modification evidence: ' + file);
  }

  const full = fullResult.value, checked = recheckResult && recheckResult.value;
  assert.deepEqual(full.errors, []); if (!complete) assert.deepEqual(checked.errors, []);
  for (const [report, status] of complete ? [[full, base]] : [[full, base], [checked, recheck]]) {
    assert(time(status.started) <= time(report.stats.startTime) && time(report.stats.startTime) <= time(status.finished));
    assert.equal(report.stats.skipped, 0); assert.equal(report.stats.flaky, 0);
    assert(!JSON.stringify(report).includes('[stem_gl_harness] STEM_GL_SUBSTITUTE'), 'A substitute runtime was served.');
    assert.equal(path.resolve(report.config.configFile), path.join(root, 'playwright.config.ts'));
    assert.equal(report.config.workers, 1); assert.equal(report.config.shard, null);
    assert.equal(report.config.projects.length, 1);
    const project = report.config.projects[0];
    assert.equal(project.id, 'chromium'); assert.equal(project.name, 'chromium');
    assert.equal(project.repeatEach, 1); assert.equal(project.retries, 0);
    assert.equal(report.config.version, JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@playwright/test/package.json'), 'utf8')).version);
  }
  const comparableConfig = configForComparison(full.config);
  if (!complete) assert.deepEqual(configForComparison(checked.config), comparableConfig, 'Execution options changed for the recheck.');
  assert.equal(full.stats.expected, complete ? 70 : 69); assert.equal(full.stats.unexpected, complete ? 0 : 1);
  if (!complete) { assert.equal(checked.stats.expected, 1); assert.equal(checked.stats.unexpected, 0); }

  const originals = collect(full), rechecks = complete ? [] : collect(checked);
  assert.equal(originals.length, 70); if (!complete) assert.equal(rechecks.length, 1);
  assert.equal(new Set(originals.map(item => item.spec.id + '\0' + item.test.projectId)).size, 70, 'Original scenarios are not distinct.');
  const counts = Object.fromEntries(Object.keys(expectedFiles).map(file => [file, 0]));
  const failures = [];
  for (const item of originals) {
    const { spec, test } = item, file = normalizeFile(spec.file);
    assert(Object.hasOwn(counts, file), 'Unrecognized original scenario file: ' + file); counts[file]++;
    assert.equal(test.projectId, 'chromium'); assert.equal(test.projectName, 'chromium'); assert.equal(test.expectedStatus, 'passed');
    assert.equal(test.results.length, 1); const result = test.results[0]; assert.equal(result.retry, 0);
    assert(time(base.started) <= time(result.startTime) && time(result.startTime) <= time(base.finished));
    if (test.status === 'expected') {
      assert.equal(spec.ok, true); assert.equal(result.status, 'passed'); assert.deepEqual(result.errors, []); assert(!result.error);
    } else { assert.equal(test.status, 'unexpected'); assert.equal(spec.ok, false); failures.push(item); }
  }
  assert.deepEqual(counts, expectedFiles); assert.equal(failures.length, complete ? 0 : 1);
  function proof(exactScenarioIdentifier) {
    return {
      passed: 70, files: 11, failed: 0, skipped: 0, flaky: 0,
      verificationMode: complete ? 'complete-suite' : 'scenario-recheck', initialFailures: complete ? 0 : 1, rechecked: complete ? 0 : 1, originalPassed: complete ? 70 : 69,
      sourceSha256, testInputs: base.testInputs, runners, exactScenarioIdentifier,
      receiptHashes: Object.fromEntries((complete ? [fullReceipt] : [fullReceipt, recheckReceipt]).map(item => [item.name, item.sha256])),
      resultHashes: Object.fromEntries((complete ? [fullResult] : [fullResult, recheckResult]).map(item => [item.name, item.sha256])),
      configurationSha256: hash(JSON.stringify(sortedObject(comparableConfig))),
      supportEvidence: { evidence: 'current-hashes-and-modification-times-before-full-start', observedAt: supportObservedAt, files: support }
    };
  }
  if (complete) return proof(null);
  const initial = failures[0], initialId = identifier(initial), repeated = rechecks[0];
  for (const [key, value] of Object.entries(knownScenario)) assert.equal(initialId[key], value, 'Unexpected failed scenario identity: ' + key);
  const failure = initial.test.results[0];
  assert.equal(failure.status, 'failed'); assert.equal(failure.errors.length, 1);
  assert(failure.error && failure.error.message.startsWith('TimeoutError: locator.pressSequentially: Timeout 30000ms exceeded.'));
  const errorLocation = { file: path.join(root, 'tests/e2e/' + knownScenario.file), line: 276, column: 67 };
  for (const error of [failure.error, failure.errors[0]]) {
    assert(error.message.startsWith('TimeoutError: locator.pressSequentially: Timeout 30000ms exceeded.'));
    assert.equal(path.resolve(error.location.file), errorLocation.file); assert.equal(error.location.line, errorLocation.line); assert.equal(error.location.column, errorLocation.column);
  }
  assert.deepEqual(identifier(repeated), initialId, 'The recheck is not the exact failed scenario.');
  assert.deepEqual(repeated.spec.tags, initial.spec.tags); assert.deepEqual(repeated.test.annotations, initial.test.annotations);
  assert.equal(repeated.spec.ok, true); assert.equal(repeated.test.status, 'expected'); assert.equal(repeated.test.results.length, 1);
  const result = repeated.test.results[0];
  assert.equal(result.status, 'passed'); assert.equal(result.retry, 0); assert.deepEqual(result.errors, []); assert(!result.error);
  assert(time(recheck.started) <= time(result.startTime) && time(result.startTime) <= time(recheck.finished));

  return proof(initialId);
};
if (require.main === module) process.stdout.write(JSON.stringify(module.exports(), null, 2) + '\n');
