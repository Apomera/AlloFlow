'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = process.env.WC_REPO || path.resolve(__dirname, '../..');
const BASELINE = '4fec040c2d54a0df8beedfcf0b8dc93ae332dcab37f9a96c18f82a2aafcced37';
const RUNTIME_FILES = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const TEST_FILE = 'tests/watercycle_process_compare.test.js';
const HARNESS_FILE = 'dev-tools/watercycle_comparison_readability_qa.cjs';
const CASE_LABELS = [
  'cloud-fall-1280-light', 'soil-store-1280-light', 'vapor-390-dark', 'soil-store-320-light',
  'cloud-fall-320-contrast', 'cloud-fall-320-forced', 'soil-store-390-zoom150', 'cloud-fall-host400',
];
const BASELINE_LABELS = ['baseline-soil-store-390-zoom150', 'baseline-cloud-fall-host400'];
const ALL_LABELS = [...CASE_LABELS, ...BASELINE_LABELS];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assert = (passed, message) => { if (!passed) throw Error(message); };
const normalized = file => file.replace(/\\/g, '/');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const validSha = value => /^[a-f0-9]{64}$/.test(value || '');
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length
  && [...a].sort().join('\n') === [...b].sort().join('\n');
function safeFile(base, file) {
  assert(typeof file === 'string' && file.length > 0 && !path.isAbsolute(file), 'Relative artifact path required');
  const resolved = path.resolve(base, file);
  assert(resolved.startsWith(path.resolve(base) + path.sep), 'Artifact escaped its directory: ' + file);
  assert(fs.lstatSync(resolved).isFile() && fs.realpathSync(resolved).startsWith(fs.realpathSync(base) + path.sep),
    'Artifact must be a regular file inside its directory: ' + file);
  return resolved;
}
const read = file => fs.readFileSync(safeFile(__dirname, file));
const json = file => JSON.parse(read(file));
function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    assert(!entry.isSymbolicLink(), 'Report contains a symbolic link');
    return entry.isDirectory() ? filesIn(file) : [normalized(path.relative(__dirname, file))];
  });
}
const snapshotOnly = process.argv.includes('--snapshot-only');
assert(!(snapshotOnly && process.argv.includes('--installed')), 'Use --snapshot-only without --installed');
const inventory = json('artifact-hashes.json');
const SOURCE = inventory.sourceSha256;
assert(validSha(SOURCE) && inventory.baselineSha256 === BASELINE, 'Report runtime identity differs');
assert(Array.isArray(inventory.artifacts) && inventory.artifacts.length > 0, 'Artifact inventory is empty');
assert(sameSet(inventory.artifacts.map(item => normalized(item.file)), filesIn(__dirname).filter(file => file !== 'artifact-hashes.json')),
  'Inventory must contain every report artifact exactly once');
const required = [
  'candidate-runtime.js', 'presentation-changes.json', 'comparison.css', 'verify-source.cjs', 'verify.cjs',
  'unit-receipt.json', 'unit-results.json', 'unit-run.log', 'tested-unit-runner.cjs',
  'unit-inputs/watercycle_process_compare.test.js', 'README.md',
];
for (const file of required) assert(inventory.artifacts.some(item => normalized(item.file) === file), 'Missing inventoried artifact: ' + file);
for (const item of inventory.artifacts) {
  assert(Number.isSafeInteger(item.bytes) && item.bytes > 0 && validSha(item.sha256), 'Invalid artifact metadata: ' + item.file);
  const bytes = read(item.file);
  assert(bytes.length === item.bytes && hash(bytes) === item.sha256, 'Artifact changed: ' + item.file);
}
assert(inventory.totalBytes === inventory.artifacts.reduce((sum, item) => sum + item.bytes, 0), 'Artifact byte total differs');
const candidate = read('candidate-runtime.js');
assert(hash(candidate) === SOURCE, 'Frozen runtime differs');
const manifest = json('presentation-changes.json');
assert(manifest.sourceSha256 === SOURCE && manifest.baselineSha256 === BASELINE && manifest.bytes === candidate.length
  && manifest.changes.length === 1 && manifest.changes[0].id === 'comparison-readability-styles', 'CSS presentation manifest differs');
require('./verify-source.cjs');

const unit = json('unit-receipt.json'), results = json('unit-results.json');
assert(unit.exitCode === 0 && unit.successful === true && results.success === true && unit.sourceSha256 === SOURCE,
  'Native regression run did not pass with the accepted runtime');
assert(unit.passed === 83 && unit.failed === 0 && unit.skipped === 0 && results.numTotalTests === 83
  && results.numPassedTests === 83 && results.numFailedTests === 0 && results.numPendingTests === 0
  && (results.numTodoTests || 0) === 0 && results.numFailedTestSuites === 0 && results.numPendingTestSuites === 0,
  'All 83 comparison assertions must pass without skips');
assert(sameSet(unit.files.map(normalized), [TEST_FILE]) && same(unit.runtimeBefore, unit.runtimeAfter)
  && same(unit.testsBefore, unit.testsAfter), 'Native regression inputs changed');
assert(sameSet(unit.runtimeBefore.map(item => normalized(item.file)), RUNTIME_FILES)
  && unit.runtimeBefore.every(item => item.sha256 === SOURCE), 'Regression runtime stamps differ');
assert(sameSet(unit.testsBefore.map(item => normalized(item.file)), [TEST_FILE])
  && unit.testsBefore.every(item => validSha(item.sha256)
    && hash(read('unit-inputs/' + path.basename(normalized(item.file)))) === item.sha256), 'Frozen test input differs');
assert(Array.isArray(results.testResults) && results.testResults.length === 1, 'One complete native comparison suite required');
const suite = results.testResults[0];
assert(normalized(suite.name) === normalized(path.join(ROOT, TEST_FILE)) && suite.status === 'passed'
  && !suite.message && Array.isArray(suite.assertionResults) && suite.assertionResults.length === 83,
  'Comparison suite identity or full assertion count differs');
assert(suite.assertionResults.every(item => item.status === 'passed' && item.failureMessages.length === 0
  && typeof item.fullName === 'string' && item.fullName.length > 0)
  && new Set(suite.assertionResults.map(item => item.fullName)).size === 83, 'A comparison assertion failed, was skipped, or was duplicated');
assert(results.numPassedTestSuites === results.numTotalTestSuites && results.numTotalTestSuites > 0,
  'Native suite summary contains an incomplete test group');

assert(typeof inventory.browserResults === 'string' && inventory.artifacts.some(item => normalized(item.file) === normalized(inventory.browserResults)),
  'Browser results are not inventoried');
const browser = json(inventory.browserResults);
const browserDirectory = path.dirname(safeFile(__dirname, inventory.browserResults));
assert(browser.successful === true && browser.completed === true && browser.errors.length === 0 && browser.failed === 0
  && browser.browserLaunched === true && browser.browserClosed === true && browser.serverListening === true && browser.serverClosed === true,
  'Browser verification or owned resource cleanup did not complete');
assert(browser.sourceSha256 === SOURCE && browser.publicSourceSha256 === SOURCE && browser.finalSourceSha256 === SOURCE
  && browser.finalPublicSourceSha256 === SOURCE && browser.baselineSha256 === BASELINE, 'Browser runtime hashes differ');
assert(browser.nativePreview.status === 200 && browser.nativePreview.sha256 === SOURCE, 'Native preview served different source bytes');
assert(Array.isArray(browser.checks) && browser.checks.length > 0 && browser.checks.every(item => item.passed === true)
  && browser.passed === browser.checks.length, 'Browser check total or passing status differs');
assert(browser.cases.length === 10 && browser.captures.length === 10 && browser.loadedSources.length === 10
  && sameSet(browser.cases.map(item => item.label), ALL_LABELS)
  && sameSet(browser.captures.map(item => item.file), ALL_LABELS.map(label => label + '.png'))
  && sameSet(browser.loadedSources.map(item => item.label), ALL_LABELS), 'Eight final and two matched baseline cases required');
assert(browser.audits.length === 9 && sameSet(browser.audits.map(item => item.label), [...CASE_LABELS, 'Native comparison controls after interactions'])
  && browser.audits.every(item => item.violations.length === 0), 'Scoped accessibility audits differ or contain violations');
const diagramHashes = new Map();
for (const item of browser.cases) {
  const isBaseline = BASELINE_LABELS.includes(item.label);
  assert(item.baseline === isBaseline && item.config.label === (isBaseline ? item.label.slice(9) : item.label), 'Browser case identity differs: ' + item.label);
  assert(Array.isArray(item.diagrams) && item.diagrams.length === 2
    && same(item.diagrams.map(diagram => diagram.process), item.config.pair), 'Scientific diagram pair differs: ' + item.label);
  for (const diagram of item.diagrams) {
    assert(validSha(diagram.sha256), 'Missing scientific SVG identity');
    if (diagramHashes.has(diagram.process)) assert(diagramHashes.get(diagram.process) === diagram.sha256,
      'Scientific SVG bytes changed between baseline or presentation cases: ' + diagram.process);
    diagramHashes.set(diagram.process, diagram.sha256);
  }
  if (!isBaseline) {
    assert(item.cards.length === 2 && item.uniqueIds === true && item.pageOverflow === false
      && item.scrollWidth <= item.clientWidth + 1, 'Final case overflows or lost its paired structure: ' + item.label);
    assert(item.targets.length > 0 && item.targets.every(target => target.rect.width >= 44 && target.rect.height >= 44),
      'A native target is too small: ' + item.label);
    assert(item.text.length > 0 && item.text.every(text => text.fontSize >= text.minFont && text.fragments.every(count => count === 1)),
      'Final text is too small or splits words: ' + item.label);
    assert(item.cards.every(card => card.states.length === 2 && card.states.every(state => Number.isFinite(state.figureContrast) && state.figureContrast >= 3)),
      'Scientific figure contrast is below 3:1: ' + item.label);
  }
}
assert(sameSet([...diagramHashes.keys()], ['evaporation', 'transpiration', 'condensation', 'precipitation', 'infiltration', 'collection']),
  'All six authored scientific process diagrams required');
for (const item of browser.loadedSources) assert(item.baseline === BASELINE_LABELS.includes(item.label)
  && item.sha256 === (item.baseline ? BASELINE : SOURCE), 'Browser loaded different source bytes: ' + item.label);
for (const item of browser.captures) {
  const label = item.file.slice(0, -4), isBaseline = BASELINE_LABELS.includes(label);
  assert(item.baseline === isBaseline && item.sourceSha256 === (isBaseline ? BASELINE : SOURCE), 'Capture runtime differs: ' + item.file);
  const file = normalized(path.relative(__dirname, safeFile(browserDirectory, item.file)));
  assert(inventory.artifacts.some(artifact => normalized(artifact.file) === file), 'Capture is not inventoried: ' + file);
  const bytes = read(file);
  assert(bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && bytes.length === item.bytes && hash(bytes) === item.sha256, 'Capture PNG identity differs: ' + file);
  assert(Number.isSafeInteger(item.width) && item.width > 0 && Number.isSafeInteger(item.height) && item.height > 0
    && bytes.readUInt32BE(16) === item.width && bytes.readUInt32BE(20) === item.height, 'Capture dimensions differ: ' + file);
}
assert(browser.nativeActions.length === 40 && new Set(browser.nativeActions.map(item => item.label)).size === 40,
  'Forty distinct native comparison interactions required');
for (const item of browser.nativeActions) {
  assert(item.changedFields.every(field => field === 'wcProcessCompare') && same(item.parcelBefore, item.parcelAfter)
    && validSha(item.beforeStateSha256) && validSha(item.afterStateSha256), 'Native action changed protected learner or parcel state: ' + item.label);
  assert(item.comparison.first !== item.comparison.second && ['phase', 'energy'].includes(item.comparison.question)
    && ['', 'first', 'second', 'both', 'neither'].includes(item.comparison.answer)
    && typeof item.comparison.checked === 'boolean', 'Native comparison state differs: ' + item.label);
}
for (const pair of ['evaporation|transpiration', 'condensation|precipitation', 'infiltration|collection']) {
  assert(browser.nativeActions.some(item => item.label === 'Suggested pair ' + pair)
    && browser.nativeActions.some(item => item.label === 'Write reflection ' + pair)
    && ['phase', 'energy'].every(question => browser.nativeActions.some(item => item.label === pair + ' question ' + question)
      && ['agree', 'revisit'].every(match => browser.nativeActions.some(item => item.label === pair + ' ' + question + ' check ' + match))),
    'Native comparison evidence coverage differs: ' + pair);
}
const harnessFile = normalized(path.relative(__dirname, safeFile(browserDirectory, 'tested-harness.cjs')));
assert(inventory.artifacts.some(item => normalized(item.file) === harnessFile)
  && hash(read(harnessFile)) === browser.harnessSha256 && browser.finalHarnessSha256 === browser.harnessSha256,
  'Tested browser harness changed');
assert(inventory.regressionTests === unit.passed && inventory.browserChecks === browser.passed, 'Inventory check totals differ');

if (!snapshotOnly) {
  for (const item of [...unit.runtimeBefore, ...unit.testsBefore]) assert(hash(fs.readFileSync(safeFile(ROOT, item.file))) === item.sha256,
    'Current input differs: ' + item.file);
  assert(hash(fs.readFileSync(safeFile(ROOT, HARNESS_FILE))) === browser.harnessSha256, 'Current browser harness differs');
}
console.log(JSON.stringify({ successful: true, sourceSha256: SOURCE, baselineSha256: BASELINE, cssAppendOnly: true,
  regressionTests: unit.passed, browserChecks: browser.passed, captures: 8, baselineCaptures: 2,
  nativeActions: browser.nativeActions.length, artifactCount: inventory.artifacts.length, totalBytes: inventory.totalBytes, snapshotOnly }));
