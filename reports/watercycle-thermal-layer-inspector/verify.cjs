'use strict';
// Reads saved evidence only. It launches no browser, test runner, or server.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const acorn = require(path.join(root, 'node_modules/acorn'));
const reportDir = path.relative(root, __dirname).replace(/\\/g, '/');
const local = name => reportDir + '/' + name;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const resolve = name => {
  const target = path.resolve(root, name);
  if (!target.startsWith(root + path.sep)) throw new Error('Input outside repository: ' + name);
  return target;
};
const bytes = name => fs.readFileSync(resolve(name));
const json = name => JSON.parse(bytes(name));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(item => walk(item, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
function tokens(source) {
  const reader = acorn.tokenizer(source, { ecmaVersion: 'latest' }), result = [];
  for (;;) {
    const token = reader.getToken();
    if (token.type.label === 'eof') return result;
    result.push([token.type.label, token.value === undefined ? null : token.value]);
  }
}
function preservation(baseline, candidate) {
  const ast = acorn.parse(candidate, { ecmaVersion: 'latest' });
  const edits = [], counts = { helper: 0, style: 0, renderer: 0, append: 0, coldLabel: 0, warmLabel: 0 };
  let profile;
  walk(ast, node => {
    if (node.type === 'VariableDeclaration') {
      const ids = node.declarations.map(item => item.id && item.id.name);
      for (const [name, label] of [['WCThermalLayerInspector', 'helper'], ['WC_THERMAL_LAYER_INSPECTOR_STYLE', 'style']]) {
        if (!ids.includes(name)) continue;
        if (node.declarations.length !== 1) throw new Error('New declaration shares an existing statement');
        counts[label]++; edits.push({ start: node.start, end: node.end, text: '' });
      }
    }
    if (node.type === 'FunctionDeclaration' && node.id) {
      if (node.id.name === 'renderPrecipTemperatureProfile') profile = node;
      if (node.id.name === 'renderThermalLayerInspector') {
        counts.renderer++; edits.push({ start: node.start, end: node.end, text: '' });
      }
    }
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'renderThermalLayerInspector') {
      if (node.arguments.length) throw new Error('Unexpected inspector append arguments');
      const comma = candidate.slice(0, node.start).search(/,\s*$/);
      if (comma < 0) throw new Error('Inspector append has no preceding child separator');
      counts.append++; edits.push({ start: comma, end: node.end, text: '' });
    }
  });
  if (!profile) throw new Error('Prior thermal profile is missing');
  walk(profile, node => {
    if (node.type !== 'Literal') return;
    const prior = { 'COLD AIR': ['coldLabel', 'FROZEN'], 'WARM AIR': ['warmLabel', 'WARM'] }[node.value];
    if (prior) { counts[prior[0]]++; edits.push({ start: node.start, end: node.end, text: JSON.stringify(prior[1]) }); }
  });
  if (!['helper', 'style', 'renderer', 'append'].every(key => counts[key] === 1) || counts.coldLabel !== counts.warmLabel || counts.coldLabel > 1) throw new Error('Unexpected enhancement boundaries: ' + JSON.stringify(counts));
  edits.sort((a, b) => b.start - a.start);
  let stripped = candidate;
  for (const edit of edits) stripped = stripped.slice(0, edit.start) + edit.text + stripped.slice(edit.end);
  const oldTokens = tokens(baseline), priorTokens = tokens(stripped);
  const mismatch = oldTokens.findIndex((token, index) => !same(token, priorTokens[index]));
  return { passed: oldTokens.length === priorTokens.length && mismatch === -1, boundaries: counts, baselineTokens: oldTokens.length, candidatePriorTokens: priorTokens.length, mismatch: mismatch === -1 ? null : mismatch };
}
if (process.argv.includes('--review')) {
  const baseline = bytes(local('baseline-runtime.js')), source = bytes('stem_lab/stem_tool_watercycle.js');
  new vm.Script(source.toString('utf8'));
  const result = { baselineSha256: sha(baseline), sourceSha256: sha(source), preservation: preservation(baseline.toString('utf8'), source.toString('utf8')) };
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.preservation.passed ? 0 : 1);
}
const result = { checkedAt: new Date().toISOString(), completed: false, successful: false, checks: [], errors: [] };
const check = (label, passed, details) => result.checks.push({ label, passed: Boolean(passed), ...(details === undefined ? {} : { details }) });
const filePin = item => { const data = bytes(item.path); return sha(data) === item.sha256 && data.length === item.bytes; };
const time = value => Date.parse(value);
function contrast(foreground, background) {
  const match = foreground.match(/rgba?\(([^)]+)\)/);
  if (!match || !Array.isArray(background) || background.length !== 3) return NaN;
  const color = match[1].split(',').map(Number), alpha = color.length > 3 ? color[3] : 1;
  const front = color.slice(0, 3).map((value, index) => value * alpha + background[index] * (1 - alpha));
  const lum = values => values.map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  return (Math.max(lum(front), lum(background)) + .05) / (Math.min(lum(front), lum(background)) + .05);
}
function browser(entry, candidateSha) {
  const report = json(entry.path), frozen = bytes(entry.runtimePath), harness = bytes(entry.harnessPath);
  check(entry.path + ' completed and closed', report.completed === true && report.browserClosed === true && report.resourcesClosed === true && report.serverUsed === false && report.serverClosed === true && report.serverClosedAt === null && validTime(report.startedAt) && validTime(report.browserLaunchedAt) && validTime(report.browserClosedAt) && validTime(report.completedAt) && time(report.startedAt) <= time(report.browserLaunchedAt) && time(report.browserLaunchedAt) <= time(report.browserClosedAt) && time(report.browserClosedAt) <= time(report.completedAt));
  check(entry.path + ' actual loaded and frozen runtime/harness', report.sourceSha256 === sha(frozen) && report.publicHostSha256 === report.sourceSha256 && report.sourceBytes === frozen.length && report.loadedRuntimeSha256 === report.sourceSha256 && report.loadedRuntimeBytes === frozen.length && report.harnessSha256 === sha(harness));
  check(entry.path + ' honest outcome', report.successful === entry.successful && (entry.historical || (report.successful === true && report.checks.every(item => item.passed === true) && report.errors.length === 0 && report.consoleErrors.length === 0)));
  const capturesValid = report.captures.every(capture => {
    const data = bytes(path.posix.join(path.posix.dirname(entry.path), capture.path));
    return data.length >= 24 && data.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && sha(data) === capture.sha256 && data.length === capture.bytes && data.readUInt32BE(16) === capture.width && data.readUInt32BE(20) === capture.height && capture.sourceSha256 === report.sourceSha256 && validTime(capture.capturedAt) && time(report.browserLaunchedAt) <= time(capture.capturedAt) && time(capture.capturedAt) <= time(report.browserClosedAt);
  });
  check(entry.path + ' exact PNG receipts and capture chronology', report.captures.length > 0 && capturesValid);
  if (!entry.final) return report;
  check('Final browser loaded current candidate', report.sourceSha256 === candidateSha);
  const displays = report.cases.filter(item => item.context === 'open-inspector');
  check('All eight final display contexts', same(displays.map(item => item.variant).sort(), ['desktop', 'phone320', 'phone390', 'host390', 'dark', 'app-contrast', 'forced-phone', 'forced-dark'].sort()));
  for (const item of displays) {
    check('Clear layout, text and controls: ' + item.variant, item.pageOverflow === false && item.scrollWidth <= item.clientWidth + 1 && item.text.length > 0 && item.text.every(text => text.fontSize >= 13 && text.clipped === false) && item.controls.every(control => control.bounds.height >= 43.9 && control.textInside === true));
    check('Independent text contrast: ' + item.variant, item.text.every(text => text.backgrounds.length > 0 && text.backgrounds.every(background => contrast(text.foreground, background) >= 4.5) && Math.abs(Math.min(...text.backgrounds.map(background => contrast(text.foreground, background))) - text.minimumContrast) < .001));
    check('Text-free decorative plots fit: ' + item.variant, item.svgs.length > 0 && item.svgs.every(svg => svg.hidden === 'true' && svg.textCount === 0 && svg.bounds.x >= svg.view.x && svg.bounds.y >= svg.view.y && svg.bounds.x + svg.bounds.width <= svg.view.x + svg.view.width && svg.bounds.y + svg.bounds.height <= svg.view.y + svg.view.height));
  }
  const readings = report.cases.filter(item => item.context === 'kernel-readings');
  check('Displayed three-level readings match actual kernel', readings.length > 0 && readings.every(item => item.rows.length === 3 && item.rows.every((row, index) => row.id === ['cloud', 'middle', 'surface'][index] && row.progress === [0, .55, 1][index] && String(row.expectedTemperature) === row.actualTemperature && row.expectedPhase === row.actualPhase && row.text.includes(row.expectedText))));
  check('Eight actual particle cues covered', ['clear', 'virga', 'rain', 'snow', 'mix', 'freezing-rain', 'sleet', 'hail'].every(phase => readings.some(item => item.rows.some(row => row.expectedPhase === phase))));
  const plots = report.cases.filter(item => item.context === 'actual-model-plot-geometry');
  check('Actual temperatures, crossings, selected markers and separate surface cues agree', plots.length > 0 && plots.every(item => item.extent === item.actualExtent && item.rows.length === 3 && item.rows.every(row => row.expectedX === row.actualX && row.expectedY === row.actualY && row.expectedProgress === row.actualProgress && row.expectedSelected === row.actualSelected) && item.crossingCount === item.expectedCrossingCount && item.crossings.length === item.crossingCount && item.crossings.every(row => row.expectedKind === row.actualKind && row.expectedProgress === row.actualProgress && row.expectedY === row.actualY) && item.rows.some(row => row.id === item.selected && row.actualSelected && row.actualX === item.ring.x && row.actualY === item.ring.y) && item.detail.temperature === item.detail.expectedTemperature && item.detail.phase === item.detail.expectedPhase && item.detail.glyph === item.detail.phase && item.surface.phase === item.surface.expectedPhase && item.surface.reaches === item.surface.expectedReaches));
  const phases = ['clear', 'virga', 'rain', 'snow', 'mix', 'freezing-rain', 'sleet', 'hail'];
  check('All eight actual model fixtures inspected at each level', same(report.cases.filter(item => item.context === 'actual-thermal-fixture').map(item => item.phase).sort(), phases.slice().sort()) && phases.every(phase => ['cloud', 'middle', 'surface'].every(level => plots.some(item => item.label === 'Fixture ' + phase + ' ' + level && item.selected === level))));
  check('Native inspection preserves learner state and paused pixels', report.nativeActions.length > 0 && report.nativeActions.every(action => action.beforeDataSha256 === action.afterDataSha256 && action.beforeCanvasSha256 === action.afterCanvasSha256));
  check('Scoped final accessibility audits complete', report.audits.length > 0 && report.audits.every(audit => audit.violations.length === 0 && audit.incomplete.length === 0 && audit.manualResolutions.length === 0));
  const genuine3D = report.checks.filter(item => item.details && item.details.kind === '3d' && item.details.objects && item.details.identity);
  check('Genuine 3D resource and function identities preserved', genuine3D.length > 0 && genuine3D.every(item => item.passed === true && item.details.healthy === true && Object.values(item.details.objects).every(Boolean) && Object.values(item.details.identity).every(Boolean) && Object.values(item.details.hookTypes).every(type => type === 'function')));
  return report;
}
function tests(entry, browserEntries, candidateSha) {
  const raw = json(entry.raw), before = json(entry.before), after = json(entry.after), loaded = json(entry.loaded);
  const assertions = raw.testResults.flatMap(suite => suite.assertionResults);
  check(entry.mode + ' all tests pass', raw.success === true && raw.numTotalTests === raw.numPassedTests && raw.numFailedTests === 0 && raw.numPendingTests === 0 && raw.numTodoTests === 0 && assertions.length === entry.count && assertions.every(item => item.status === 'passed') && new Set(assertions.map(item => item.fullName)).size === entry.count);
  check(entry.mode + ' raw receipt binds exact after receipt', same(raw[entry.receiptKey], after));
  check(entry.mode + ' successful process chronology', before.expectedRuntimeSha256 === candidateSha && after.expectedRuntimeSha256 === candidateSha && after.processExitCode === 0 && after.processSignal === null && after.processClosed === true && validTime(before.startedAt) && validTime(after.completedAt) && validTime(after.processClosedAt) && time(before.startedAt) <= time(after.processClosedAt) && time(after.processClosedAt) <= time(after.completedAt));
  const files = [...before.runtimeFiles, ...before.testFiles, ...before.fixtureFiles];
  check(entry.mode + ' frozen input files match before and after', files.every(filePin) && ['runtimeFiles', 'testFiles', 'fixtureFiles'].every(key => same(before[key].map(({ path, sha256, bytes }) => ({ path, sha256, bytes })), after[key + 'After'].map(({ path, sha256, bytes }) => ({ path, sha256, bytes })))));
  check(entry.mode + ' actual file reads match frozen inputs', files.every(item => after.loadedFiles.some(read => read.path === item.path && read.sha256 === item.sha256 && read.bytes === item.bytes && validTime(read.loadedAt) && time(before.startedAt) <= time(read.loadedAt) && time(read.loadedAt) <= time(after.processClosedAt) && Number.isInteger(read.pid))) && after.loadedFiles.every(read => files.some(item => item.path === read.path && item.sha256 === read.sha256 && item.bytes === read.bytes)));
  check(entry.mode + ' helper loaded report retained exactly', same(loaded, after.loadedReport) && loaded.loadedRuntimes.every(filePin) && filePin(loaded.loadedTest) && (entry.mode !== 'unit' || (filePin(loaded.loadedBaseline) && validTime(loaded.loadedAt) && validTime(loaded.completedAt) && time(before.startedAt) <= time(loaded.loadedAt) && time(loaded.completedAt) <= time(after.processClosedAt))));
  check(entry.mode + ' executable recipes stayed exact', before.recipeFiles.length === 2 && same(before.recipeFiles, after.recipeFiles) && after.recipeFilesAfter.every(recipe => filePin(recipe) && recipe.executionSha256After === recipe.sha256 && before.recipeFiles.some(prior => prior.path === recipe.path && prior.executionPath === recipe.executionPath && prior.sha256 === recipe.sha256 && prior.bytes === recipe.bytes)));
  check(entry.mode + ' every owned browser closed before tests', same(before.closureEvidence, after.closureEvidenceAfter) && before.closureEvidence.length === browserEntries.length && before.closureEvidence.every(evidence => {
    const entry = browserEntries.find(item => item.path === evidence.path), report = entry && json(entry.path);
    return entry && filePin(evidence) && evidence.resourcesClosed === true && evidence.browserClosedAt === report.browserClosedAt && time(evidence.browserClosedAt) < time(before.startedAt) && filePin(evidence.frozenRuntime) && evidence.frozenRuntime.path === entry.runtimePath && evidence.sourceSha256 === report.sourceSha256 && evidence.publicSha256 === report.publicHostSha256 && evidence.mode === report.mode && evidence.serverUsed === false && evidence.serverClosed === true && evidence.serverClosedAt === null;
  }));
  check(entry.mode + ' preservation receipts stayed exact', same(before.preservation, after.preservation));
  return { raw, before, after, assertions };
}
function diagnosticTest(entry, candidateSha) {
  const raw = json(entry.raw), before = json(entry.before), after = json(entry.after), loaded = json(entry.loaded), summary = json(entry.summary);
  const snapshot = bytes(entry.testSnapshot), priorTest = before.testFiles[0];
  check('Failed fixture diagnostic remains an honest closed run', raw.success === false && raw.numTotalTests === 34 && raw.numPassedTests === 33 && raw.numFailedTests === 1 && raw.numPendingTests === 0 && after.processExitCode === 1 && after.processClosed === true && same(raw.waterCycleThermalLayerVerification, after) && summary.files.every(filePin) && summary.processChecks.every(item => item.running === false) && validTime(summary.archivedAt) && time(after.processClosedAt) <= time(summary.archivedAt));
  check('Failed fixture diagnostic retains actual executed test and source bytes', sha(snapshot) === priorTest.sha256 && snapshot.length === priorTest.bytes && same(loaded, after.loadedReport) && loaded.loadedTest.sha256 === priorTest.sha256 && loaded.loadedTest.bytes === priorTest.bytes && loaded.loadedRuntimes.every(item => item.sha256 === candidateSha && filePin(item)) && filePin(loaded.loadedBaseline) && after.loadedFiles.every(read => [...before.runtimeFiles, ...before.testFiles, ...before.fixtureFiles].some(item => item.path === read.path && item.sha256 === read.sha256 && item.bytes === read.bytes)));
  return [after.runnerPid, after.processPid, ...after.loadedFiles.map(item => item.pid)];
}
try {
  const manifestBytes = bytes(local('artifact-summary.json')), manifest = JSON.parse(manifestBytes);
  const candidate = bytes(manifest.sourcePath), baseline = bytes(manifest.baselinePath);
  check('Manifest finalized without commit', manifest.status === 'final' && manifest.enhancementCommitted === false && manifest.baselineWasUncommitted === true);
  check('All pinned files retained', manifest.inputs.length > 0 && manifest.inputs.every(filePin));
  check('Main, public and frozen candidate bytes agree', sha(candidate) === manifest.sourceSha256 && candidate.length === manifest.sourceBytes && bytes(manifest.publicPath).equals(candidate) && bytes(manifest.testedRuntimePath).equals(candidate));
  check('Uncommitted starting baseline exact', sha(baseline) === 'd68b832b562d75b4f12eddf0638187eabd27ccf92b0f1ddaa787442566b44603' && baseline.length === 3088929);
  new vm.Script(candidate.toString('utf8'));
  result.preservation = preservation(baseline.toString('utf8'), candidate.toString('utf8'));
  check('Entire prior source token sequence preserved', result.preservation.passed && same(result.preservation, manifest.preservation));
  const browserReports = manifest.browsers.map(entry => browser(entry, manifest.sourceSha256));
  const finalBrowser = browserReports[manifest.browsers.findIndex(entry => entry.final)];
  const testReports = manifest.tests.map(entry => tests(entry, manifest.browsers, manifest.sourceSha256));
  const diagnosticPids = manifest.diagnosticTests.flatMap(entry => diagnosticTest(entry, manifest.sourceSha256));
  check('Sequential test runs have distinct full test names', testReports.every((entry, index) => index === 0 || time(testReports[index - 1].after.completedAt) <= time(entry.before.startedAt)) && new Set(testReports.flatMap(entry => entry.assertions.map(item => item.fullName))).size === testReports.reduce((sum, entry) => sum + entry.assertions.length, 0));
  const closed = json(manifest.reports.processClosure), pids = [...diagnosticPids, ...testReports.flatMap(entry => [entry.after.runnerPid, entry.after.processPid, ...entry.after.loadedFiles.map(item => item.pid)])];
  check('Native process closure covers every failed and final test process', closed.allClosed === true && closed.processes.every(item => item.running === false && item.errorCode === 'ESRCH' && item.origins.length > 0) && same([...new Set(pids)].sort((a, b) => a - b), closed.processes.map(item => item.pid).sort((a, b) => a - b)) && closed.receiptFiles.every(filePin) && closed.runtimeFiles.every(item => item.sha256 === manifest.sourceSha256 && filePin(item)) && validTime(closed.observedAt) && Number.isInteger(closed.observerPid) && testReports.every(entry => time(entry.after.completedAt) <= time(closed.observedAt)));
  const preview = json(manifest.reports.preview);
  check('Learner preview receipt serves exact candidate', preview.successful === true && preview.sourceSha256 === manifest.sourceSha256 && preview.publicHostSha256 === manifest.sourceSha256 && preview.servedRuntimeSha256 === manifest.sourceSha256 && preview.previewStatus === 200 && preview.runtimeStatus === 200 && preview.sourceBytes === candidate.length && preview.publicHostBytes === candidate.length && preview.runtimeBytes === candidate.length && preview.browserUsed === false);
  result.counts = { focusedTests: testReports[0].assertions.length, regressionTests: testReports[1].assertions.length, totalPassed: testReports.reduce((sum, entry) => sum + entry.assertions.length, 0), browserChecks: finalBrowser.checks.length, nativeActions: finalBrowser.nativeActions.length, finalCaptures: finalBrowser.captures.length, scopedAudits: finalBrowser.audits.length, browserRunsClosed: browserReports.length, ownedTestProcessesClosed: closed.processes.length };
  check('Headline totals derive only from final successful runs', same(result.counts, manifest.counts) && closed.distinctFinalTests === result.counts.totalPassed && closed.testCounts.length === testReports.length && closed.testCounts.every((item, index) => item.mode === manifest.tests[index].mode && item.total === testReports[index].assertions.length && item.passed === item.total && item.failed === 0 && item.pending === 0 && item.todo === 0));
  result.manifestSha256 = sha(manifestBytes);
  result.verifierSha256 = sha(fs.readFileSync(__filename));
  if (process.argv.includes('--read-only')) {
    const saved = json(local('verification-summary.json'));
    check('Saved verification binds current manifest, verifier and results', saved.completed === true && saved.successful === true && saved.errors.length === 0 && saved.checks.every(item => item.passed === true) && saved.manifestSha256 === result.manifestSha256 && saved.verifierSha256 === result.verifierSha256 && same(saved.counts, result.counts) && same(saved.preservation, result.preservation));
  }
} catch (error) { result.errors.push(error.stack || String(error)); }
result.completed = true;
result.successful = result.errors.length === 0 && result.checks.every(item => item.passed === true);
if (!process.argv.includes('--read-only')) fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ successful: result.successful, checks: result.checks.length, counts: result.counts, failed: result.checks.filter(item => !item.passed), errors: result.errors }, null, 2));
process.exitCode = result.successful ? 0 : 1;
