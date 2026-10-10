'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const BASELINE = '12132650ea1f18152ac4bf1e07dfd1c4c9d1c9bc84501276904ada975ad3e244';
const RUNTIME_FILES = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const TEST_FILES = [
  'tests/watercycle_land_pathway_groups.test.js',
  'tests/watercycle_heat_actor_clarity.test.js',
  'tests/watercycle_matter_energy.test.js',
  'tests/watercycle_groundwater_lens.test.js',
  'tests/watercycle_groundwater_workspace.test.js',
];
const CASE_LABELS = [
  'soil-1280-light', 'overview-1280-light', 'plants-390-dark', 'soil-320-light',
  'surface-320-contrast', 'soil-320-forced', 'plants-390-zoom150', 'replay-soil-1280-light',
];
const STEPS = ['ground_choice', 'river_runoff', 'infiltrating', 'aquifer_flow', 'plant_absorb', 'transpiring', ''];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assert = (passed, message) => { if (!passed) throw Error(message); };
const normalized = file => file.replace(/\\/g, '/');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sameSet = (left, right) => left.length === right.length && new Set(left).size === left.length
  && [...left].sort().join('\n') === [...right].sort().join('\n');
const safeFile = (base, file) => {
  assert(typeof file === 'string' && file.length > 0 && !path.isAbsolute(file), 'Relative artifact path required');
  const resolved = path.resolve(base, file);
  assert(resolved.startsWith(path.resolve(base) + path.sep), 'Artifact escaped its directory: ' + file);
  return resolved;
};
const read = file => fs.readFileSync(safeFile(__dirname, file));
const json = file => JSON.parse(read(file));
const snapshotOnly = process.argv.includes('--snapshot-only');
assert(!(snapshotOnly && process.argv.includes('--installed')), 'Use --snapshot-only without --installed');

const inventory = json('artifact-hashes.json');
const SOURCE = inventory.sourceSha256;
assert(/^[a-f0-9]{64}$/.test(SOURCE || '') && inventory.baselineSha256 === BASELINE, 'Report runtime identity differs');
assert(Array.isArray(inventory.artifacts) && inventory.artifacts.length > 0, 'Artifact inventory is empty');
assert(new Set(inventory.artifacts.map(item => item.file)).size === inventory.artifacts.length, 'Duplicate artifact path');
const requiredArtifacts = [
  'candidate-runtime.js', 'presentation-changes.json', 'pathways.css', 'land-renderer.js',
  'verify-source.cjs', 'verify.cjs', 'unit-receipt.json', 'unit-results.json', 'unit-run.log',
  'tested-unit-runner.cjs', 'tested-unit-selection.cjs', 'README.md',
  ...TEST_FILES.map(file => 'unit-inputs/' + path.basename(file)),
];
for (const file of requiredArtifacts) assert(inventory.artifacts.some(item => item.file === file), 'Artifact is not inventoried: ' + file);
for (const item of inventory.artifacts) {
  const bytes = read(item.file);
  assert(bytes.length === item.bytes && hash(bytes) === item.sha256, 'Artifact changed: ' + item.file);
}
assert(inventory.artifacts.reduce((sum, item) => sum + item.bytes, 0) === inventory.totalBytes, 'Artifact byte total differs');
assert(hash(read('candidate-runtime.js')) === SOURCE, 'Frozen runtime differs');
const manifest = json('presentation-changes.json');
assert(manifest.sourceSha256 === SOURCE && manifest.baselineSha256 === BASELINE, 'Presentation manifest identity differs');
assert(manifest.changes.length === 2, 'Two presentation slices required');
require('./verify-source.cjs');

const unit = json('unit-receipt.json');
const results = json('unit-results.json');
assert(unit.kind === 'passing-suite-selection' && results.kind === unit.kind && unit.exitCode === null
  && unit.successful === true && results.success === true, 'Whole-suite selection receipt is missing');
assert(unit.sourceSha256 === SOURCE && unit.failed === 0 && unit.skipped === 0, 'Regression runtime or failure count differs');
assert(results.numFailedTests === 0 && results.numPendingTests === 0 && (results.numTodoTests || 0) === 0
  && (results.numFailedTestSuites || 0) === 0 && (results.numPendingTestSuites || 0) === 0, 'Regression contains failed or skipped tests');
assert(unit.passed === 104 && unit.passed === results.numPassedTests
  && results.numTotalTests === unit.passed, 'Regression count differs');
assert(same(unit.runtimeBefore, unit.runtimeAfter) && same(unit.testsBefore, unit.testsAfter), 'Regression inputs changed');
assert(sameSet(unit.files.map(normalized), TEST_FILES), 'Regression suite inputs differ');
assert(sameSet(unit.runtimeBefore.map(item => normalized(item.file)), RUNTIME_FILES)
  && unit.runtimeBefore.every(item => item.sha256 === SOURCE), 'Regression runtime stamps differ');
assert(sameSet(unit.testsBefore.map(item => normalized(item.file)), TEST_FILES), 'Regression test stamps differ');
for (const item of unit.testsBefore) {
  assert(/^[a-f0-9]{64}$/.test(item.sha256 || ''), 'Invalid test input SHA');
  assert(hash(read('unit-inputs/' + path.basename(normalized(item.file)))) === item.sha256, 'Frozen test differs: ' + item.file);
}
assert(Array.isArray(results.testResults) && results.testResults.length === TEST_FILES.length
  && sameSet(results.testResults.map(item => normalized(item.name).slice(normalized(ROOT).length + 1)), TEST_FILES), 'Five distinct passing suites required');
assert(results.testResults.every(item => item.status === 'passed' && item.assertionResults.length > 0
  && item.assertionResults.every(test => test.status === 'passed')), 'A regression assertion did not pass');
assert(results.testResults.reduce((sum, item) => sum + item.assertionResults.length, 0) === unit.passed, 'Assertion total differs');

const suiteFile = suite => {
  const name = normalized(suite.name), prefix = normalized(ROOT) + '/';
  assert(name.startsWith(prefix), 'Regression suite escaped repository');
  return name.slice(prefix.length);
};
const assertionIdentities = suite => suite.assertionResults.map(item => ({
  ancestorTitles: item.ancestorTitles, fullName: item.fullName, title: item.title,
}));
assert(Array.isArray(unit.rawRuns) && sameSet(unit.rawRuns.map(item => item.label), ['unit', 'unit-retry']),
  'Both native unit runs must be retained');
const rawRuns = new Map();
for (const raw of unit.rawRuns) {
  for (const type of ['receipt', 'results', 'log']) {
    const expected = 'unit-runs/' + raw.label + '-' + (type === 'log' ? 'run.log' : type + '.json');
    assert(raw[type] === expected && inventory.artifacts.some(item => item.file === expected),
      'Raw unit evidence is not inventoried: ' + expected);
  }
  const receipt = json(raw.receipt), data = json(raw.results), log = read(raw.log).toString('utf8').replace(/\r\n/g, '\n');
  assert(receipt.sourceSha256 === SOURCE && same(receipt.files, unit.files)
    && same(receipt.runtimeBefore, unit.runtimeBefore) && same(receipt.runtimeAfter, unit.runtimeBefore)
    && same(receipt.testsBefore, unit.testsBefore) && same(receipt.testsAfter, unit.testsBefore),
    'Raw unit inputs differ: ' + raw.label);
  assert(receipt.exitCode === 1 && receipt.successful === false && data.success === false,
    'Raw unit run status differs: ' + raw.label);
  assert(data.testResults.length === TEST_FILES.length && sameSet(data.testResults.map(suiteFile), TEST_FILES),
    'Raw run must contain each complete suite: ' + raw.label);
  const assertions = data.testResults.flatMap(suite => suite.assertionResults);
  assert(assertions.length === unit.passed && assertions.every(item => ['passed', 'failed', 'skipped'].includes(item.status)),
    'Raw run has missing or unsupported assertions: ' + raw.label);
  const counts = Object.fromEntries(['passed', 'failed', 'skipped'].map(status => [status, assertions.filter(item => item.status === status).length]));
  assert(receipt.passed === counts.passed && receipt.failed === counts.failed && receipt.skipped === counts.skipped
    && data.numTotalTests === assertions.length && data.numPassedTests === counts.passed
    && data.numFailedTests === counts.failed && data.numPendingTests === counts.skipped && data.numTodoTests === 0,
    'Raw unit counts differ: ' + raw.label);
  assert(assertions.filter(item => item.status === 'passed').every(item => item.failureMessages.length === 0),
    'A passing raw assertion contains an error: ' + raw.label);
  const failedSuites = data.testResults.filter(suite => suite.status !== 'passed');
  const errorLines = log.match(/^Error:.*$/gm) || [];
  assert(failedSuites.length === 1 && !/AssertionError|Unhandled Error|unhandledRejection/.test(log),
    'Raw run contains an additional failure: ' + raw.label);
  if (raw.label === 'unit') {
    const suite = failedSuites[0], failed = suite.assertionResults.filter(item => item.status === 'failed');
    const title = 'server-renders the visible semantic summary and 2D canvas contract';
    assert(suiteFile(suite) === 'tests/watercycle_matter_energy.test.js' && suite.status === 'failed'
      && suite.message === '' && failed.length === 1 && counts.failed === 1 && counts.skipped === 0,
      'Initial run failure differs from the retained render timeout');
    assert(failed[0].title === title && failed[0].fullName === 'Water Cycle matter and energy trace ' + title
      && failed[0].duration >= 15000 && failed[0].failureMessages.length === 1
      && failed[0].failureMessages[0].startsWith('Error: STACK_TRACE_ERROR\n')
      && failed[0].failureMessages[0].includes('/tests/watercycle_matter_energy.test.js:127:3'),
      'Initial failure is not the documented Vitest timeout stack');
    assert(same(errorLines, ['Error: Test timed out in 15000ms.'])
      && log.includes('FAIL  tests/watercycle_matter_energy.test.js > Water Cycle matter and energy trace > ' + title
        + '\nError: Test timed out in 15000ms.'), 'Initial log does not identify the sole render timeout');
  } else {
    const suite = failedSuites[0];
    const message = 'Hook timed out in 60000ms.\nIf this is a long-running hook, pass a timeout value as the last argument or configure it globally with "hookTimeout".';
    assert(suiteFile(suite) === 'tests/watercycle_groundwater_workspace.test.js' && suite.status === 'failed'
      && suite.message === message && counts.failed === 0 && counts.skipped === 10
      && suite.assertionResults.length === 10
      && suite.assertionResults.every(item => item.status === 'skipped' && item.failureMessages.length === 0),
      'Retry failure differs from the retained workspace setup timeout');
    assert(same(errorLines, ['Error: Hook timed out in 60000ms.'])
      && log.includes('FAIL  tests/watercycle_groundwater_workspace.test.js [ tests/watercycle_groundwater_workspace.test.js ]'
        + '\nError: Hook timed out in 60000ms.'), 'Retry log does not identify the sole setup timeout');
  }
  assert(data.testResults.filter(suite => suite.status === 'passed').every(suite => suite.message === ''
    && suite.assertionResults.length > 0 && suite.assertionResults.every(item => item.status === 'passed')),
    'A raw passing suite is incomplete: ' + raw.label);
  rawRuns.set(raw.label, { receipt, data });
}
assert(Array.isArray(unit.selectedSuites) && unit.selectedSuites.length === TEST_FILES.length
  && sameSet(unit.selectedSuites.map(item => normalized(item.file)), TEST_FILES), 'Five unique whole-suite selections required');
for (const selected of unit.selectedSuites) {
  assert(rawRuns.has(selected.run), 'Selected suite refers to an unknown native run');
  const file = normalized(selected.file), raw = rawRuns.get(selected.run).data.testResults.find(suite => suiteFile(suite) === file);
  const aggregate = results.testResults.find(suite => suiteFile(suite) === file);
  assert(raw && raw.status === 'passed' && raw.assertionResults.length > 0
    && raw.assertionResults.every(item => item.status === 'passed') && same(aggregate, raw),
    'Selected suite must exactly copy an entire passing native suite: ' + file);
  const initial = rawRuns.get('unit').data.testResults.find(suite => suiteFile(suite) === file);
  const retry = rawRuns.get('unit-retry').data.testResults.find(suite => suiteFile(suite) === file);
  assert(same(assertionIdentities(initial), assertionIdentities(retry)), 'Assertions differ between raw runs: ' + file);
  assert(selected.run === (initial.status === 'passed' ? 'unit' : 'unit-retry'), 'Whole-suite selection order differs: ' + file);
}
assert(results.numTotalTestSuites === TEST_FILES.length && results.numPassedTestSuites === TEST_FILES.length,
  'Aggregate must describe five complete passing file suites');

assert(typeof inventory.browserResults === 'string' && inventory.artifacts.some(item => item.file === inventory.browserResults), 'Browser results are not inventoried');
const browser = json(inventory.browserResults);
const browserDirectory = path.dirname(safeFile(__dirname, inventory.browserResults));
assert(browser.successful === true && browser.completed === true && browser.errors.length === 0 && browser.failed === 0
  && browser.browserLaunched === true && browser.browserClosed === true && browser.serverListening === true
  && browser.serverClosed === true, 'Browser verification did not complete');
assert(browser.baselineSha256 === BASELINE && browser.sourceSha256 === SOURCE && browser.publicSourceSha256 === SOURCE
  && browser.finalSourceSha256 === SOURCE && browser.finalPublicSourceSha256 === SOURCE, 'Browser runtime differs');
assert(browser.nativePreview.status === 200 && browser.nativePreview.sha256 === SOURCE, 'Preview did not serve the accepted source');
assert(Array.isArray(browser.checks) && browser.checks.length > 0 && browser.checks.every(item => item.passed === true)
  && browser.checks.length === browser.passed, 'Browser check count differs');
assert(browser.captures.length === CASE_LABELS.length && browser.cases.length === CASE_LABELS.length + STEPS.length * 2
  && browser.loadedSources.length === CASE_LABELS.length && browser.audits.length === CASE_LABELS.length,
  'Capture, case, audit or loaded-source count differs');
assert(sameSet(browser.captures.map(item => item.file), CASE_LABELS.map(label => label + '.png'))
  && sameSet(browser.loadedSources.map(item => item.label), CASE_LABELS)
  && sameSet(browser.audits.map(item => item.label), CASE_LABELS), 'Representative browser cases differ');
assert(new Set(browser.cases.map(item => item.label)).size === browser.cases.length
  && CASE_LABELS.every(label => browser.cases.some(item => item.label === label)), 'Browser case identities differ');
assert(browser.loadedSources.every(item => item.sha256 === SOURCE)
  && browser.audits.every(item => item.violations.length === 0), 'A loaded runtime or scoped audit differs');
for (const item of browser.captures) {
  const absolute = safeFile(browserDirectory, item.file);
  const file = normalized(path.relative(__dirname, absolute));
  assert(inventory.artifacts.some(artifact => normalized(artifact.file) === file), 'Capture is not inventoried: ' + file);
  const bytes = fs.readFileSync(absolute);
  assert(bytes.length === item.bytes && hash(bytes) === item.sha256 && item.sourceSha256 === SOURCE,
    'Capture identity differs: ' + item.file);
  assert(bytes.readUInt32BE(16) === item.width && bytes.readUInt32BE(20) === item.height
    && item.width > 0 && item.height > 0, 'Capture dimensions differ: ' + item.file);
}
assert(browser.nativeActions.length === STEPS.length * 2, 'Fourteen native interactions required');
browser.nativeActions.forEach((item, index) => {
  const follow = index % STEPS.length === STEPS.length - 1;
  const allowed = follow ? ['wcJourneyChapter'] : ['wcJourneyChapter', 'wcJourneyLandStep'];
  assert(item.step === STEPS[index % STEPS.length] && item.follow === follow
    && item.changedFields.every(field => allowed.includes(field)), 'Native action contract differs: ' + item.label);
  assert(same(item.parcelBefore, item.parcelAfter), 'Native action changed the paused parcel: ' + item.label);
  assert(/^[a-f0-9]{64}$/.test(item.beforeStateSha256 || '') && /^[a-f0-9]{64}$/.test(item.afterStateSha256 || ''),
    'Native action state receipt is missing: ' + item.label);
});
const harnessFile = normalized(path.relative(__dirname, path.join(browserDirectory, 'tested-harness.cjs')));
assert(inventory.artifacts.some(item => normalized(item.file) === harnessFile), 'Tested browser harness is not inventoried');
assert(hash(read(harnessFile)) === browser.harnessSha256 && browser.finalHarnessSha256 === browser.harnessSha256,
  'Tested harness differs');
assert(inventory.regressionTests === unit.passed && inventory.browserChecks === browser.passed, 'Inventory counts differ');

if (!snapshotOnly) {
  for (const item of [...unit.runtimeBefore, ...unit.testsBefore]) {
    assert(hash(fs.readFileSync(safeFile(ROOT, item.file))) === item.sha256, 'Current input differs: ' + item.file);
  }
  assert(hash(fs.readFileSync(path.join(ROOT, 'dev-tools/watercycle_land_pathway_groups_qa.cjs'))) === browser.harnessSha256,
    'Current browser harness differs');
}
console.log(JSON.stringify({
  successful: true, sourceSha256: SOURCE, baselineSha256: BASELINE,
  presentationSlices: manifest.changes.length, landPathwayGroups: 3,
  browserChecks: browser.passed, regressionTests: unit.passed, captures: browser.captures.length,
  nativeActions: browser.nativeActions.length, artifactCount: inventory.artifacts.length,
  totalBytes: inventory.totalBytes, regressionKind: unit.kind, rawUnitRuns: unit.rawRuns.length, snapshotOnly,
}));
