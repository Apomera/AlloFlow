'use strict';
// Verify saved evidence only. This file does not run the product or test suite.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const root = path.resolve(__dirname, '../..');
const result = { checkedAt: new Date().toISOString(), completed: false, successful: false, checks: [], errors: [] };
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const check = (label, passed, details) => result.checks.push({ label, passed: Boolean(passed), ...(details === undefined ? {} : { details }) });
const resolve = name => { const full = path.resolve(root, name); if (!full.startsWith(root + path.sep)) throw new Error('Artifact outside repository: ' + name); return full; };
const bytes = name => fs.readFileSync(resolve(name));
const json = name => JSON.parse(bytes(name));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const tail = name => name.replace(/\\/g, '/').split('/').pop();
const png = buffer => { if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid PNG'); return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }; };
function testIdentities(report, expectedFiles, label) {
  const suites = report.testResults || [];
  const names = suites.map(suite => tail(suite.name)).sort();
  check(label + ' exact test files', same(names, expectedFiles.map(tail).sort()), names);
  const identities = [];
  for (const suite of suites) for (const test of suite.assertionResults || []) {
    const id = tail(suite.name) + '::' + (test.fullName || [...(test.ancestorTitles || []), test.title].join(' > '));
    identities.push(id); check(label + ' passed: ' + id, test.status === 'passed');
  }
  check(label + ' successful and no omitted tests', report.success === true && report.numFailedTests === 0 && report.numPendingTests === 0 && report.numTodoTests === 0 && report.numPassedTests === report.numTotalTests && identities.length === report.numTotalTests);
  check(label + ' unique identities', new Set(identities).size === identities.length);
  return identities;
}
function verifyLoadedReport(report, manifest, label) {
  const meta = report.waterCycleCloudEvidenceVerification;
  if (!meta) throw new Error('Missing runtime metadata in ' + label);
  for (const field of ['sourceSha256Before', 'sourceSha256After', 'publicSha256Before', 'publicSha256After']) check(label + ' ' + field, meta[field] === manifest.sourceSha256);
  check(label + ' clean isolated test process', meta.processExitCode === 0 && meta.singleWorker === true && meta.fileParallelism === false);
  for (const file of meta.testFiles || []) check(label + ' test bytes ' + file.path, file.sha256Before === file.sha256After && sha(bytes(file.path)) === file.sha256After);
  check(label + ' baseline metadata', meta.preservation?.baselinePath === manifest.baselinePath && meta.preservation.baselineSha256 === manifest.baselineSha256);
  return meta;
}
try {
  const manifest = json('reports/watercycle-cloud-evidence/artifact-summary.json');
  if (manifest.status !== 'final') throw new Error('Final report artifacts are not ready.');
  const source = bytes(manifest.sourcePath), mirror = bytes(manifest.publicPath), baseline = bytes(manifest.baselinePath);
  new vm.Script(source.toString('utf8'), { filename: manifest.sourcePath });
  check('source, public and final tested hash', sha(source) === manifest.sourceSha256 && sha(mirror) === manifest.sourceSha256 && source.equals(mirror));
  check('frozen baseline hash', sha(baseline) === manifest.baselineSha256);
  check('frozen browser runtime hash', sha(bytes(manifest.testedRuntimePath)) === manifest.sourceSha256);
  result.sourceSha256 = manifest.sourceSha256;
  result.baselineSha256 = manifest.baselineSha256;
  const pins = manifest.artifacts || [];
  check('unique artifact pins', new Set(pins.map(pin => pin.path)).size === pins.length);
  const requiredPins = [manifest.sourcePath, manifest.publicPath, manifest.baselinePath, manifest.testedRuntimePath, manifest.testPath, manifest.browserHarnessPath, manifest.testedHarnessPath, manifest.focusedHarnessPath, ...Object.values(manifest.reports), ...manifest.regressionFiles];
  check('required inputs are pinned', requiredPins.every(name => pins.some(pin => pin.path === name)));
  for (const pin of pins) {
    check('artifact hash ' + pin.path, sha(bytes(pin.path)) === pin.sha256);
    check('exclude mutable report output ' + pin.path, !['README.md', 'verify.cjs', 'artifact-summary.json', 'verification-summary.json'].includes(tail(pin.path)));
    if (pin.width !== undefined) check('PNG dimensions ' + pin.path, same(png(bytes(pin.path)), { width: pin.width, height: pin.height }));
  }
  const before = json(manifest.reports.baseline), browser = json(manifest.reports.browser);
  check('baseline completed and resources closed', before.completed === true && before.browserClosed === true && before.serverClosed === true && (before.errors || []).length === 0);
  check('baseline rendered frozen buffer', before.sourceSha256 === manifest.baselineSha256);
  const baselineHost = { publicSha256: before.publicSha256, finalSourceSha256: before.finalSourceSha256, finalPublicSha256: before.finalPublicSha256 };
  check('baseline live-host observations are preserved separately', same(baselineHost, manifest.baselineLiveHostSha256));
  check('browser clean completion and closure', browser.completed === true && browser.successful === true && browser.failed === 0 && (browser.errors || []).length === 0 && (browser.failures || []).length === 0 && browser.browserClosed === true && browser.serverClosed === true);
  for (const field of ['sourceSha256', 'publicSha256', 'finalSourceSha256', 'finalPublicSha256']) check('browser ' + field, browser[field] === manifest.sourceSha256);
  check('all native/browser checks passed', browser.checks.length === browser.passed && browser.checks.every(item => item.passed === true));
  const browserCounts = { checks: browser.checks.length, cases: browser.cases.length, actions: browser.actions.length, audits: browser.audits.length, captures: browser.captures.length };
  check('browser manifest counts', same(browserCounts, manifest.browser.counts), browserCounts);
  for (const audit of browser.audits) check('scoped axe ' + audit.name, audit.violations.length === 0);
  const disclosure = json(manifest.reports.disclosure);
  check('disclosure clean completion and closure', disclosure.completed === true && disclosure.successful === true && disclosure.failed === 0 && disclosure.errors.length === 0 && disclosure.failures.length === 0 && disclosure.browserClosed === true && disclosure.serverClosed === true);
  for (const field of ['sourceSha256', 'publicSha256', 'finalSourceSha256', 'finalPublicSha256']) check('disclosure ' + field, disclosure[field] === manifest.sourceSha256);
  check('all disclosure checks passed', disclosure.checks.length === disclosure.passed && disclosure.checks.every(item => item.passed === true));
  const disclosureCounts = { checks: disclosure.checks.length, cases: disclosure.cases.length, actions: disclosure.actions.length, audits: disclosure.audits.length, captures: disclosure.captures.length };
  check('disclosure manifest counts', same(disclosureCounts, manifest.browser.disclosure), disclosureCounts);
  for (const audit of disclosure.audits) check('scoped axe ' + audit.name, audit.violations.length === 0);
  const labels = [...browser.checks, ...disclosure.checks].map(item => item.label);
  const mainLabels = new Set(browser.checks.map(item => item.label));
  const focusedLabels = new Set(disclosure.checks.map(item => item.label));
  const repeated = [...mainLabels].filter(label => focusedLabels.has(label)).sort();
  check('only two generic checks overlap across browser runs', same(repeated, ['Frozen source unchanged throughout QA', 'No browser runtime errors'].sort()));
  // Repeated labels within the main run describe different malformed-import fixtures.
  const combined = { checkInstances: browser.checks.length + disclosure.checks.length, checksExcludingCrossRunGenericDuplicates: browser.checks.length + disclosure.checks.length - repeated.length, uniqueLabelStrings: new Set(labels).size, cases: browser.cases.length + disclosure.cases.length, actions: browser.actions.length + disclosure.actions.length, audits: new Set([...browser.audits, ...disclosure.audits].map(item => item.name)).size, captures: browser.captures.length + disclosure.captures.length };
  check('combined browser instances and label counts', same(combined, manifest.browser.combined), combined);
  result.browser = { main: browserCounts, disclosure: disclosureCounts, combined, repeatedGenericChecks: repeated };
  result.incompleteAudits = browser.audits.filter(audit => audit.incomplete.length).map(audit => ({ name: audit.name, incomplete: audit.incomplete }));
  result.incompleteAudits.push(...disclosure.audits.filter(audit => audit.incomplete.length).map(audit => ({ name: audit.name, incomplete: audit.incomplete })));
  const incompleteCount = [...browser.audits, ...disclosure.audits].reduce((sum, audit) => sum + audit.incomplete.length, 0);
  check('all scoped audits have zero incomplete items', incompleteCount === 0 && incompleteCount === manifest.browser.audits.incompleteItems);
  const gallery = browser.cases.find(item => item.label === 'Native cloud gallery semantics');
  check('native named-gallery role and accessible-name evidence', gallery?.role === 'group' && gallery.accessibleName === 'Choose a cloud type' && same({ role: gallery.role, accessibleName: gallery.accessibleName }, manifest.browser.gallery) && browser.checks.some(item => item.label === 'Cloud gallery has a native named group' && item.passed === true));
  const measurements = browser.cases.filter(item => item.label.endsWith(' measurements'));
  check('all saved layout, target and text checks are clear', measurements.length === 14 && measurements.every(item => !item.pageOverflow && !item.scopeOverflow && item.smallTargets.length === 0 && item.wordClipping.length === 0 && item.smallText.length === 0));
  const contrasts = [...browser.cases, ...disclosure.cases].filter(item => item.label.endsWith(' contrast'));
  check('saved computed text contrast checks match report', contrasts.length === manifest.browser.contrast.cases && Math.min(...contrasts.map(item => item.minimum)) === manifest.browser.contrast.minimumRecordedRatio && contrasts.every(item => item.failures.length === 0));
  const three = browser.cases.filter(item => item.engine?.kind === '3d');
  const identities = ['canvas', 'context', 'sync', 'cleanup', 'reset', 'focus', 'renderer', 'scene', 'camera'];
  check('actual 3D object and hook identities retained', three.length === manifest.browser.engine.threeSnapshots && three.length > 0 && three.every(item => identities.every(name => item.engine[name] === true)));
  const pairs = manifest.captures.pairs;
  const contexts = ['phone320', 'phone390', 'desktop', 'host390', 'dark', 'forced-phone', 'forced-dark'];
  check('seven matched capture contexts', same(pairs.map(pair => pair.context).sort(), contexts.sort()));
  for (const pair of pairs) for (const side of ['before', 'after']) {
    const name = pair[side], owner = side === 'before' ? before : browser;
    const capture = owner.captures.find(item => item.file === tail(name));
    check(side + ' capture ' + pair.context, Boolean(capture) && capture.sha256 === sha(bytes(name)));
    check('capture is dimension/hash pinned ' + name, pins.some(pin => pin.path === name && pin.width > 0 && pin.height > 0));
    check('final capture excludes diagnostics ' + name, !/preflight|diagnostic/.test(name));
  }
  check('filled observation notes captured', manifest.captures.notes.length > 0);
  for (const name of manifest.captures.notes) {
    check('filled notes ' + name, browser.captures.some(item => item.file === tail(name) && item.sha256 === sha(bytes(name))));
    check('filled notes dimension/hash pin ' + name, pins.some(pin => pin.path === name && pin.width > 0 && pin.height > 0));
  }
  for (const name of manifest.captures.disclosure) check('native disclosure capture ' + name, disclosure.captures.some(item => item.file === tail(name) && item.sha256 === sha(bytes(name))) && pins.some(pin => pin.path === name && pin.width > 0 && pin.height > 0));
  const unit = json(manifest.reports.unit), regression = json(manifest.reports.regression);
  const unitMeta = verifyLoadedReport(unit, manifest, 'unit'), regressionMeta = verifyLoadedReport(regression, manifest, 'regression');
  const loaded = json(manifest.reports.loadedRuntime);
  check('captured focused load metadata matches unit report', same(loaded.loadedRuntimes, unitMeta.loadedRuntimes) && same(loaded.loadedTest, unitMeta.loadedTest));
  check('browser summary final hash', json(manifest.reports.browserSummary).sourceSha256 === manifest.sourceSha256);
  const closure = json(manifest.reports.closure);
  const records = Object.values(closure).filter(value => value && typeof value === 'object' && value.report && value.harness);
  check('both browser closures have bound metadata', closure.sourceSha256 === manifest.sourceSha256 && records.length === 2 && same(records.map(value => value.report).sort(), [tail(manifest.reports.browser), tail(manifest.reports.disclosure)].sort()));
  const local = name => path.relative(root, path.join(__dirname, name)).replace(/\\/g, '/');
  for (const record of records) {
    check('closed report/harness ' + record.report, record.successful === true && record.browserClosed === true && record.serverClosed === true && record.reportSha256 === sha(bytes(local(record.report))) && record.harnessSha256 === sha(bytes(local(record.harness))));
    for (const [label, meta] of [['unit', unitMeta], ['regression', regressionMeta]]) check(label + ' starts after ' + record.report + ' closes', Number.isFinite(Date.parse(record.observedClosedAt)) && Date.parse(meta.startedAt) >= Date.parse(record.observedClosedAt) && Date.parse(meta.completedAt) >= Date.parse(meta.startedAt));
  }
  const unitIDs = testIdentities(unit, [manifest.testPath], 'unit');
  const regressionIDs = testIdentities(regression, manifest.regressionFiles, 'regression');
  check('focused and regression identities do not overlap', new Set([...unitIDs, ...regressionIDs]).size === unitIDs.length + regressionIDs.length);
  check('test manifest counts', unitIDs.length === manifest.tests.unit && regressionIDs.length === manifest.tests.regression && unitIDs.length + regressionIDs.length === manifest.tests.total);
  for (const runtime of unitMeta.loadedRuntimes || []) check('loaded focused runtime ' + runtime.path, runtime.sha256 === manifest.sourceSha256 && sha(bytes(runtime.path)) === runtime.sha256);
  check('two focused runtime byte captures', unitMeta.loadedRuntimes?.length === 2);
  check('loaded focused test bytes', unitMeta.loadedTest?.path === manifest.testPath && unitMeta.loadedTest.sha256 === sha(bytes(manifest.testPath)));
  const testSource = bytes(manifest.testPath).toString('utf8');
  const start = testSource.indexOf('const SOURCE_PATH ='), end = testSource.indexOf('const sources =', start);
  if (start < 0 || end <= start) throw new Error('Cannot locate preservation metadata');
  const context = { parse: require('acorn').parse, createHash: crypto.createHash };
  vm.createContext(context);
  new vm.Script(testSource.slice(start, end).replace('export const waterCycleCloudEvidenceVerification', 'const waterCycleCloudEvidenceVerification') + '\nglobalThis.verification = waterCycleCloudEvidenceVerification;').runInContext(context);
  const helper = context.verification;
  check('preservation helper baseline binding', helper.baselinePath === manifest.baselinePath && helper.baselineSha === manifest.baselineSha256 && helper.preservedNames.length === 39);
  for (const [kind, method, count] of [['anchors', 'productionNodes', 39], ['scoring', 'scoredNodes', 2], ['derivations', 'fullDerivations', 2]]) {
    if (typeof helper[method] !== 'function') throw new Error('Missing preservation method ' + method);
    const old = helper[method](baseline.toString('utf8')), current = helper[method](source.toString('utf8'));
    const records = Object.keys(current).sort().map(name => ({ name, sha256: sha(current[name]) }));
    check('preserved ' + kind + ' count', records.length === count);
    for (const record of records) check('preserved ' + kind + ' ' + record.name, current[record.name] === old[record.name]);
    const order = values => [...values].sort((a, b) => a.name.localeCompare(b.name));
    for (const [label, meta] of [['unit', unitMeta], ['regression', regressionMeta]]) check(label + ' ' + kind + ' metadata matches bytes', same(order(meta.preservation[kind]), order(records)));
    check('manifest preserved ' + kind, same(order(manifest.preservation[kind]), order(records)));
  }
  const preview = json(manifest.reports.preview);
  check('preview served final runtime', preview.successful === true && preview.previewStatus === 200 && preview.runtimeStatus === 200 && preview.servedRuntimeSha256 === manifest.sourceSha256 && preview.url === 'http://127.0.0.1:8770/');
  result.tests = { unit: unitIDs.length, regression: regressionIDs.length, total: unitIDs.length + regressionIDs.length };
  result.completed = true;
} catch (error) { result.errors.push(error.stack || String(error)); }
result.passed = result.checks.filter(item => item.passed).length;
result.failed = result.checks.filter(item => !item.passed).length;
result.successful = result.completed && result.errors.length === 0 && result.failed === 0;
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ completed: result.completed, successful: result.successful, passed: result.passed, failed: result.failed, errors: result.errors }));
process.exitCode = result.successful ? 0 : 1;
