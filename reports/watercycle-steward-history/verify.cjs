'use strict';
// Verify saved evidence only; this file launches no browser or test suite.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const reportDir = path.relative(root, __dirname).replace(/\\/g, '/');
const result = { checkedAt: new Date().toISOString(), completed: false, successful: false, checks: [], errors: [] };
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const check = (label, passed, details) => result.checks.push({ label, passed: Boolean(passed), ...(details === undefined ? {} : { details }) });
const resolve = name => {
  const full = path.resolve(root, name);
  if (!full.startsWith(root + path.sep)) throw new Error('Artifact outside repository: ' + name);
  return full;
};
const bytes = name => fs.readFileSync(resolve(name));
const json = name => JSON.parse(bytes(name));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const ordered = values => [...values].sort((left, right) => left.name.localeCompare(right.name));
const tail = name => name.replace(/\\/g, '/').split('/').pop();
const local = name => reportDir + '/' + name;
const time = value => Date.parse(value);
const validTime = value => Number.isFinite(time(value));
function png(buffer) {
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
function testIdentities(report, expected, label) {
  const suites = report.testResults || [];
  check(label + ' exact test files', same(suites.map(suite => tail(suite.name)).sort(), expected.map(tail).sort()));
  const identities = [];
  for (const suite of suites) for (const test of suite.assertionResults || []) {
    const identity = tail(suite.name) + '::' + (test.fullName || [...(test.ancestorTitles || []), test.title].join(' > '));
    identities.push(identity);
    check(label + ' passed test ' + identity, test.status === 'passed');
  }
  check(label + ' successful with no omitted tests', report.success === true && report.numFailedTests === 0 && report.numPendingTests === 0 && report.numTodoTests === 0 && report.numPassedTests === report.numTotalTests && identities.length === report.numTotalTests);
  check(label + ' distinct test identities', new Set(identities).size === identities.length);
  return identities;
}
function verifyClosure(report, label) {
  check(label + ' completed successfully', report.completed === true && report.successful === true && (report.errors || []).length === 0 && (report.consoleErrors || []).length === 0);
  check(label + ' actual browser closed', report.resourcesClosed === true && report.browserClosed === true && validTime(report.browserClosedAt));
  check(label + ' setContent requires no server', report.serverUsed === false && report.serverClosed === true && report.serverClosedAt === null);
  check(label + ' closure chronology', validTime(report.startedAt) && validTime(report.browserLaunchedAt) && validTime(report.completedAt) && time(report.startedAt) <= time(report.browserLaunchedAt) && time(report.browserLaunchedAt) <= time(report.browserClosedAt) && time(report.browserClosedAt) <= time(report.completedAt));
}
function verifyTestMetadata(report, manifest, label, closures) {
  const before = json(manifest.reports[label + 'Before']);
  const after = json(manifest.reports[label + 'After']);
  check(label + ' raw result binds after metadata', same(report.waterCycleStewardHistoryVerification, after));
  check(label + ' before metadata remains in after', Object.keys(before).every(key => same(before[key], after[key])));
  check(label + ' runtime expectation', before.expectedRuntimeSha256 === manifest.sourceSha256 && after.expectedRuntimeSha256 === manifest.sourceSha256);
  check(label + ' isolated successful process', after.processExitCode === 0 && after.processSignal === null && after.singleWorker === true && after.fileParallelism === false);
  check(label + ' test chronology', validTime(after.startedAt) && validTime(after.completedAt) && time(after.completedAt) >= time(after.startedAt));
  for (const field of ['sourceSha256Before', 'sourceSha256After', 'publicSha256Before', 'publicSha256After']) check(label + ' ' + field, after[field] === manifest.sourceSha256);
  const wantedTests = label === 'unit' ? [manifest.testPath] : manifest.regressionFiles;
  check(label + ' exact metadata file scopes', same(after.runtimeFiles.map(item => item.path).sort(), [manifest.sourcePath, manifest.publicPath].sort()) && same(after.testFiles.map(item => item.path).sort(), [...wantedTests].sort()));
  for (const [kind, inputs, outputs] of [['runtime', after.runtimeFiles, after.runtimeFilesAfter], ['test', after.testFiles, after.testFilesAfter]]) {
    check(label + ' ' + kind + ' before/after pins agree', same(inputs, outputs));
    for (const pin of inputs) {
      const current = bytes(pin.path);
      check(label + ' ' + kind + ' bytes ' + pin.path, sha(current) === pin.sha256 && current.length === pin.bytes);
      const reads = after.loadedFiles.filter(item => item.path === pin.path);
      check(label + ' actual native file reads ' + pin.path, reads.length > 0 && reads.every(item => item.sha256 === pin.sha256 && item.bytes === pin.bytes && validTime(item.loadedAt) && time(item.loadedAt) >= time(after.startedAt) && time(item.loadedAt) <= time(after.completedAt) && Number.isInteger(item.pid) && item.pid > 0));
    }
  }
  const loaded = json(manifest.reports[label + 'Loaded']);
  check(label + ' captured helper-load report', same(loaded, after.loadedReport));
  check(label + ' both helper-loaded runtime hashes', loaded.loadedRuntimes.length === 2 && loaded.loadedRuntimes.every(item => [manifest.sourcePath, manifest.publicPath].includes(item.path) && item.sha256 === manifest.sourceSha256 && sha(bytes(item.path)) === item.sha256));
  const helperTest = label === 'unit' ? manifest.testPath : manifest.regressionFiles.find(name => tail(name) === 'watercycle_cloud_evidence.test.js');
  check(label + ' exact helper-loaded test bytes', loaded.loadedTest.path === helperTest && loaded.loadedTest.sha256 === sha(bytes(helperTest)));
  check(label + ' exact two browser closure inputs', after.closureEvidence.length === closures.length && same(after.closureEvidence.map(item => item.path).sort(), closures.map(item => item.path).sort()));
  for (const closure of after.closureEvidence) {
    const saved = closures.find(item => item.path === closure.path);
    check(label + ' bound closed browser ' + closure.path, saved && closure.sha256 === sha(bytes(closure.path)) && closure.bytes === bytes(closure.path).length && closure.mode === saved.report.mode && closure.sourceSha256 === saved.report.sourceSha256 && closure.publicSha256 === saved.report.publicSha256 && closure.browserClosedAt === saved.report.browserClosedAt && closure.resourcesClosed === true && closure.serverUsed === false && closure.serverClosed === true && closure.serverClosedAt === null);
    check(label + ' starts after ' + closure.mode + ' browser closes', time(after.startedAt) >= time(closure.browserClosedAt));
  }
  check(label + ' preservation metadata binding', after.preservation.baselinePath === manifest.baselinePath && after.preservation.baselineSha256 === manifest.baselineSha256 && same(ordered(after.preservation.anchors), ordered(manifest.preservation.anchors)));
  return after;
}
function ratio(reading) {
  const match = reading.foreground.match(/rgba?\(([^)]+)\)/);
  if (!match || !Array.isArray(reading.background)) return NaN;
  const color = match[1].split(',').map(Number), alpha = color.length > 3 ? color[3] : 1;
  const foreground = color.slice(0, 3).map((value, index) => value * alpha + reading.background[index] * (1 - alpha));
  const luminance = values => values.map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const levels = [luminance(foreground), luminance(reading.background)];
  return (Math.max(...levels) + .05) / (Math.min(...levels) + .05);
}
try {
  const manifest = json(local('artifact-summary.json'));
  if (manifest.status !== 'final') throw new Error('Final campaign evidence artifacts are not ready.');
  const source = bytes(manifest.sourcePath), mirror = bytes(manifest.publicPath), baseline = bytes(manifest.baselinePath);
  new vm.Script(source.toString('utf8'), { filename: manifest.sourcePath });
  check('source/public bytes equal final tested runtime', sha(source) === manifest.sourceSha256 && sha(mirror) === manifest.sourceSha256 && source.equals(mirror) && sha(bytes(manifest.testedRuntimePath)) === manifest.sourceSha256);
  check('committed frozen baseline hash', sha(baseline) === manifest.baselineSha256);
  for (const name of manifest.baselineRuntimeInputs) check('exact baseline capture buffer ' + name, bytes(name).equals(baseline));
  for (const input of manifest.regressionBaselineInputs) check('committed regression baseline ' + input.path, sha(bytes(input.path)) === input.sha256);
  result.sourceSha256 = manifest.sourceSha256;
  result.baselineSha256 = manifest.baselineSha256;
  const pins = manifest.artifacts;
  check('unique artifact paths', new Set(pins.map(pin => pin.path)).size === pins.length);
  check('all declared inputs are pinned', manifest.requiredInputs.every(name => pins.some(pin => pin.path === name)));
  for (const pin of pins) {
    const buffer = bytes(pin.path);
    check('artifact hash/bytes ' + pin.path, sha(buffer) === pin.sha256 && buffer.length === pin.bytes);
    check('exclude mutable outputs and preliminary inputs ' + pin.path, !['README.md', 'verify.cjs', 'artifact-summary.json', 'verification-summary.json'].includes(tail(pin.path)) && !/preflight|diagnostic|runner-state|run\.log/.test(pin.path));
    if (pin.width !== undefined) check('PNG dimensions ' + pin.path, same(png(buffer), { width: pin.width, height: pin.height }));
  }
  const browser = json(manifest.reports.browser), before = json(manifest.reports.baseline);
  verifyClosure(before, 'baseline');
  verifyClosure(browser, 'browser');
  check('baseline uses committed runtime and retains separate public observation', before.sourceSha256 === manifest.baselineSha256 && before.sourceBytes === baseline.length && before.publicSha256 === manifest.baselinePublicSha256);
  check('baseline harness bytes bound', before.harnessSha256 === sha(bytes(manifest.baselineHarnessPath)));
  check('final browser loaded and retained runtime bytes', ['sourceSha256', 'publicSha256', 'sourceAfterSha256', 'publicAfterSha256'].every(key => browser[key] === manifest.sourceSha256) && browser.sourceBytes === source.length);
  check('final browser harness bytes bound', browser.harnessSha256 === sha(bytes(manifest.testedHarnessPath)) && bytes(manifest.testedHarnessPath).equals(bytes(manifest.browserHarnessPath)));
  check('unchanged production fixtures match across baseline/final', same(json(manifest.fixturePaths[0]), json(manifest.fixturePaths[1])));
  check('all final browser check instances pass', browser.checks.length > 0 && browser.checks.every(item => item.passed === true));
  const counts = { checkInstances: browser.checks.length, uniqueCheckLabels: new Set(browser.checks.map(item => item.label)).size, cases: browser.cases.length, nativeActions: browser.nativeActions.length, audits: browser.audits.length, captures: browser.captures.length };
  check('actual browser counts match manifest', same(counts, manifest.browser.counts), counts);
  result.browser = counts;
  const readingCases = browser.cases.filter(item => item.kind === 'exact saved reading');
  const readingIDs = readingCases.map(item => item.component + ':' + item.metric + ':' + item.year).sort();
  const expectedReadingIDs = manifest.browser.componentIDs.flatMap(component => ['quality', 'connectivity', 'support'].flatMap(metric => Array.from({ length: 10 }, (_, index) => component + ':' + metric + ':' + (index + 1)))).sort();
  check('all component/metric/year readings have distinct cases', same(readingIDs, expectedReadingIDs) && new Set(readingIDs).size === readingIDs.length);
  for (const component of manifest.browser.componentIDs) for (const metric of ['quality', 'connectivity', 'support']) {
    for (const suffix of ['exact saved table', 'whole component name', 'plot positions within CSS serialization precision and distinct shape', 'distinct line pattern']) check('saved reading proof ' + component + ' ' + metric + ' ' + suffix, browser.checks.some(item => item.label === component + ' ' + metric + ' ' + suffix && item.passed === true));
    const position = browser.checks.find(item => item.label === component + ' ' + metric + ' plot positions within CSS serialization precision and distinct shape');
    check('explicit CSS percentage tolerance ' + component + ' ' + metric, position?.details.percentagePointTolerance === 1e-4 && position.details.points.length === 10);
  }
  for (const label of manifest.browser.requiredSemanticChecks) check('native semantic proof ' + label, browser.checks.some(item => item.label === label && item.passed === true));
  const campaignChecks = browser.checks.filter(item => item.label.endsWith('retains exact full campaign state'));
  const outerChecks = browser.checks.filter(item => item.label.endsWith('retains full non-history tool data'));
  const rewardChecks = browser.checks.filter(item => item.label.endsWith('awards no rewards'));
  check('native inspection retains campaign/outer data/rewards', campaignChecks.length > 0 && campaignChecks.length === outerChecks.length && campaignChecks.length === rewardChecks.length && [...campaignChecks, ...outerChecks, ...rewardChecks].every(item => item.passed) && outerChecks.every(item => item.details.beforeSha256 === item.details.afterSha256) && browser.statePreservation.finalRewards.length === 0);
  result.incompleteAudits = browser.audits.filter(item => item.incomplete.length).map(item => ({ variant: item.variant, incomplete: item.incomplete, resolution: item.incompleteResolution }));
  for (const audit of browser.audits) {
    check('scoped automated audit ' + audit.variant, audit.selector === '.wc-steward-history' && audit.violations.length === 0);
    const nodes = audit.incomplete.flatMap(item => item.nodes.map(node => ({ rule: item.id, node })));
    check('retained manual incomplete resolution ' + audit.variant, nodes.length === 0 || audit.incompleteResolution?.resolved === true);
    for (const { rule, node } of nodes) {
      const target = node.target.length === 1 && node.target[0].match(/^\.wc-history-x-axis > span:nth-child\((\d+)\)$/);
      const reading = target && audit.incompleteResolution.axisReadings.find(item => item.selector === node.target[0] && item.text === target[1] && item.html === node.html);
      check('manual contrast/text evidence ' + audit.variant + ' ' + node.target.join(' '), rule === 'color-contrast' && target && reading && reading.width > 0 && reading.height > 0 && reading.fontSize >= 12 && reading.ratio >= 4.5 && Math.abs(ratio(reading) - reading.ratio) < 1e-8 && reading.clipped === false && Number.isFinite(reading.scopeBounds?.width) && reading.scopeBounds.width > 0 && Array.isArray(node.any) && Array.isArray(node.all) && Array.isArray(node.none));
    }
  }
  const incompleteItems = browser.audits.reduce((sum, audit) => sum + audit.incomplete.length, 0);
  const incompleteNodes = browser.audits.reduce((sum, audit) => sum + audit.incomplete.reduce((count, item) => count + item.nodes.length, 0), 0);
  check('honest incomplete rule/node counts', incompleteItems === manifest.browser.audit.incompleteItems && incompleteNodes === manifest.browser.audit.incompleteNodes);
  const contrast = browser.contrastReadings.flatMap(item => item.readings);
  const minimum = Math.min(...contrast.map(item => item.ratio));
  check('saved actual text contrast and positive text ranges', contrast.length === manifest.browser.contrast.readings && minimum === manifest.browser.contrast.minimum && contrast.every(item => item.ratio >= 4.5 && item.width > 0 && item.height > 0 && Math.abs(ratio(item) - item.ratio) < 1e-8));
  for (const captureReport of [before, browser]) for (const capture of captureReport.captures) {
    const name = local(capture.path), buffer = bytes(name);
    check('bound capture ' + name, capture.sha256 === sha(buffer) && capture.bytes === buffer.length && same(png(buffer), { width: capture.width, height: capture.height }) && capture.sourceSha256 === captureReport.sourceSha256 && validTime(capture.capturedAt) && time(capture.capturedAt) >= time(captureReport.startedAt) && time(capture.capturedAt) <= time(captureReport.browserClosedAt));
    check('capture hash/dimensions pinned ' + name, pins.some(pin => pin.path === name && pin.sha256 === capture.sha256 && pin.width === capture.width && pin.height === capture.height));
  }
  check('matched capture contexts are distinct', manifest.captures.pairs.length > 0 && new Set(manifest.captures.pairs.map(pair => pair.context)).size === manifest.captures.pairs.length);
  for (const pair of manifest.captures.pairs) check('matched before/after ' + pair.context, before.captures.some(item => local(item.path) === pair.before) && browser.captures.some(item => local(item.path) === pair.after));
  const closures = [{ path: manifest.reports.baseline, report: before }, { path: manifest.reports.browser, report: browser }];
  const unit = json(manifest.reports.unit), regression = json(manifest.reports.regression);
  const unitMeta = verifyTestMetadata(unit, manifest, 'unit', closures), regressionMeta = verifyTestMetadata(regression, manifest, 'regression', closures);
  check('regression begins after focused process completes', time(regressionMeta.startedAt) >= time(unitMeta.completedAt));
  const unitIDs = testIdentities(unit, [manifest.testPath], 'unit'), regressionIDs = testIdentities(regression, manifest.regressionFiles, 'regression');
  check('focused/regression identities do not overlap', new Set([...unitIDs, ...regressionIDs]).size === unitIDs.length + regressionIDs.length);
  check('distinct test counts match manifest', unitIDs.length === manifest.tests.unit && regressionIDs.length === manifest.tests.regression && unitIDs.length + regressionIDs.length === manifest.tests.total);
  result.tests = { unit: unitIDs.length, regression: regressionIDs.length, total: unitIDs.length + regressionIDs.length };
  const testSource = bytes(manifest.testPath).toString('utf8'), start = testSource.indexOf('const SOURCE_PATH ='), end = testSource.indexOf('const loadedAt =');
  if (start < 0 || end <= start) throw new Error('Missing preservation export');
  const helper = vm.runInNewContext(testSource.slice(start, end).replace('export const waterCycleStewardHistoryVerification', 'const waterCycleStewardHistoryVerification') + '\nwaterCycleStewardHistoryVerification;', { parse: require('acorn').parse, createHash: crypto.createHash }, { timeout: 10000 });
  check('independent preservation helper binding', helper.baselinePath === manifest.baselinePath && helper.baselineSha === manifest.baselineSha256 && helper.preservedNames.length === 24);
  const old = helper.productionNodes(baseline.toString('utf8'));
  check('all baseline anchors exist', Object.keys(old).length === helper.preservedNames.length && helper.preservedNames.every(name => Object.hasOwn(old, name)));
  for (const [label, buffer] of [['source', source], ['public', mirror]]) {
    const current = helper.productionNodes(buffer.toString('utf8'));
    check(label + ' exact anchor scope', Object.keys(current).length === helper.preservedNames.length);
    for (const name of helper.preservedNames) check(label + ' preserved campaign/reward anchor ' + name, current[name] === old[name]);
  }
  const anchors = ordered(helper.preservedNames.map(name => ({ name, sha256: sha(old[name]) })));
  check('independent preservation hashes match manifest', same(anchors, ordered(manifest.preservation.anchors)));
  const preview = json(manifest.reports.preview);
  check('preview served tested runtime', preview.successful === true && preview.previewStatus === 200 && preview.runtimeStatus === 200 && preview.servedRuntimeSha256 === manifest.sourceSha256 && preview.url === 'http://127.0.0.1:8770/');
  result.completed = true;
} catch (error) { result.errors.push(error.stack || String(error)); }
result.passed = result.checks.filter(item => item.passed).length;
result.failed = result.checks.filter(item => !item.passed).length;
result.successful = result.completed && result.errors.length === 0 && result.failed === 0;
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ completed: result.completed, successful: result.successful, passed: result.passed, failed: result.failed, errors: result.errors }));
process.exitCode = result.successful ? 0 : 1;
