const fs = require('node:fs');
const crypto = require('node:crypto');
const acorn = require('acorn');
const folder = 'reports/bridgelab-guide-energy-2026-10-05/';
const sourceFiles = ['stem_lab/stem_tool_bridgelab.js', 'desktop/web-app/public/stem_lab/stem_tool_bridgelab.js'];
const englishFiles = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
const unitInputFiles = [...sourceFiles, 'tests/bridgelab_immersive_motion.test.js',
  'tests/bridgelab_seismic_model.test.js', 'tests/bridgelab_seismic_inertia.test.js'];
const browserInputFiles = [...sourceFiles, 'tests/e2e/26-bridgelab-gl.spec.ts', ...englishFiles];
const inputSha256 = {}, inputMtimeMs = {}, reportSha256 = {};
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
function readInput(file) {
  const contents = fs.readFileSync(file);
  inputSha256[file] = sha256(contents);
  return contents.toString('utf8');
}
function readReport(name) {
  const file = folder + name;
  const contents = fs.readFileSync(file);
  reportSha256[file] = sha256(contents);
  return JSON.parse(contents.toString('utf8'));
}
function assertInputsPredateRun(files, startTimeMs, label) {
  for (const file of files) {
    if (!Object.hasOwn(inputSha256, file)) readInput(file);
    const modified = fs.statSync(file).mtimeMs;
    if (!Number.isFinite(modified) || modified > startTimeMs) {
      throw Error(label + ' report is stale: input modified after the run started: ' + file);
    }
    inputMtimeMs[file] = modified;
  }
}
const source = readInput(sourceFiles[0]);
if (source !== readInput(sourceFiles[1])) throw Error('Source mirrors differ');
const keys = new Map();
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee.name === '__alloT' && typeof node.arguments[0]?.value === 'string' && typeof node.arguments[1]?.value === 'string') {
    const [key, value] = node.arguments.map(argument => argument.value);
    if (keys.has(key) && keys.get(key) !== value) throw Error('Conflicting fallback ' + key);
    keys.set(key, value);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') walk(value);
  }
}
walk(acorn.parse(source, { ecmaVersion: 'latest' }));
if (keys.size !== 1318) throw Error('Unexpected literal key count');
for (const file of englishFiles) {
  const registry = JSON.parse(readInput(file).replace(/^\uFEFF/, ''));
  for (const [key, value] of keys) if (key.split('.').reduce((object, part) => object?.[part], registry) !== value) throw Error(file + ': mismatched ' + key);
}
const unit = readReport('unit-results.json');
const unitStartTimeMs = unit.startTime;
if (typeof unitStartTimeMs !== 'number' || !Number.isFinite(unitStartTimeMs) || unitStartTimeMs <= 0
  || !Number.isFinite(new Date(unitStartTimeMs).getTime())) throw Error('Missing or invalid unit run start time');
assertInputsPredateRun(unitInputFiles, unitStartTimeMs, 'Unit');
const assertions = unit.testResults.flatMap(suite => suite.assertionResults);
if (!unit.success || unit.numFailedTests || unit.numPendingTests || unit.numPassedTests !== 251 || unit.testResults.length !== 3 || assertions.length !== 251 || assertions.some(assertion => assertion.status !== 'passed')) throw Error('Complete unit suites incomplete');
for (const [name, count] of [['bridgelab_immersive_motion.test.js', 186], ['bridgelab_seismic_model.test.js', 61], ['bridgelab_seismic_inertia.test.js', 4]]) {
  const suite = unit.testResults.find(suite => suite.name.endsWith(name));
  if (!suite || suite.assertionResults.length !== count) throw Error('Wrong suite ' + name);
}
const newChecks = assertions.filter(assertion => (assertion.fullName || assertion.title).includes('guide energy:'));
if (newChecks.length !== 9) throw Error('New guide energy checks incomplete');
const browser = readReport('browser-results.json');
const browserStartTime = browser.stats?.startTime;
const browserStartTimeMs = typeof browserStartTime === 'string' ? Date.parse(browserStartTime) : NaN;
if (!Number.isFinite(browserStartTimeMs) || browserStartTimeMs <= 0
  || new Date(browserStartTimeMs).toISOString() !== browserStartTime) throw Error('Missing or invalid browser run start time; expected an ISO timestamp');
assertInputsPredateRun(browserInputFiles, browserStartTimeMs, 'Browser');
const specs = [];
function collect(suite) {
  for (const item of suite.specs || []) specs.push(item);
  for (const child of suite.suites || []) collect(child);
}
collect(browser);
if (browser.errors?.length || specs.length !== 14 || specs.some(spec => !spec.ok || spec.tests.some(test => test.status !== 'expected' || test.results.some(result => result.status !== 'passed')))) throw Error('Browser workflows incomplete');
for (const [prefix, count] of [['guide energy:', 3], ['guided damping:', 4], ['claim interval:', 4], ['energy questions:', 3]]) if (specs.filter(spec => spec.title.startsWith(prefix)).length !== count) throw Error('Wrong browser group ' + prefix);
const sourceSha256 = sha256(source);
const numeric = readReport('model-invariants.json');
if (numeric.status !== 'passed' || numeric.sourceSha256 !== sourceSha256 || numeric.counts?.sweep?.cases !== 144 || numeric.counts.sweep.pairedWindows !== 576 || numeric.counts.sweep.energyReadings !== 5760 || numeric.counts.sweep.barSegments !== 3456 || numeric.counts.extraPairs.pairedWindows !== 16 || numeric.counts.amplitude.cases !== 72 || numeric.counts.amplitude.pairedWindows !== 288) throw Error('Numeric final-source matrix incomplete');
const captures = ['guide-energy-844-scene-a.png', 'guide-energy-844-fallback.png'];
for (const width of [1000, 320]) for (const view of ['16', 'fractional', 'tiny', 'zero', 'recorded', 'print']) captures.push('guide-energy-' + width + '-' + view + '.png');
for (const file of captures) if (!fs.existsSync(folder + file)) throw Error('Missing capture ' + file);
// Ordinary freshness protection: reject edits after a run or changes while
// reading its evidence. This does not claim tamper-resistant provenance.
assertInputsPredateRun(unitInputFiles, unitStartTimeMs, 'Unit');
assertInputsPredateRun(browserInputFiles, browserStartTimeMs, 'Browser');
for (const [file, expected] of Object.entries({ ...inputSha256, ...reportSha256 })) {
  if (sha256(fs.readFileSync(file)) !== expected) throw Error('Input or report changed during verification: ' + file);
}
const result = { syntax: 'passed', sourceMirrors: 'identical', sourceSha256, matchingEnglishKeys: keys.size,
  completeUnitChecksPassed: assertions.length, newGuideEnergyChecksPassed: newChecks.length,
  browserWorkflowsPassed: specs.length, newBrowserWorkflowsPassed: 3,
  inputCombinations: numeric.counts.sweep.cases, pairWindows: numeric.counts.sweep.pairedWindows,
  extraPairWindows: numeric.counts.extraPairs.pairedWindows, amplitudePairWindows: numeric.counts.amplitude.pairedWindows,
  newFeatureCaptures: captures.length,
  reportFreshness: 'passed: required inputs were last modified no later than each run start',
  runTimestamps: {
    unit: { startTimeMs: unitStartTimeMs, iso: new Date(unitStartTimeMs).toISOString() },
    browser: { startTimeMs: browserStartTimeMs, iso: browserStartTime }
  },
  runInputFiles: { unit: unitInputFiles, browser: browserInputFiles },
  inputMtimeMs, inputSha256, reportSha256,
  commit: 'not created; changes remain uncommitted' };
fs.writeFileSync(folder + 'source-verification.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
