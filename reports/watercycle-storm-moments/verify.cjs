'use strict';
// Inspect saved evidence only; this verifier launches no browser or test runner.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const acorn = require(path.join(root, 'node_modules/acorn'));
const reportDir = path.relative(root, __dirname).replace(/\\/g, '/');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const local = name => reportDir + '/' + name;
const resolve = name => {
  const target = path.resolve(root, name);
  if (!target.startsWith(root + path.sep)) throw new Error('Input outside repository: ' + name);
  return target;
};
const bytes = name => fs.readFileSync(resolve(name));
const json = name => JSON.parse(bytes(name));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const time = value => Date.parse(value);
const tail = name => name.replace(/\\/g, '/').split('/').pop();
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (Array.isArray(value)) value.forEach(item => walk(item, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
function tokens(source) {
  const reader = acorn.tokenizer(source, { ecmaVersion: 'latest' });
  const result = [];
  for (;;) {
    const token = reader.getToken();
    if (token.type.label === 'eof') break;
    result.push([token.type.label, token.value === undefined ? null : token.value]);
  }
  return result;
}
function preservation(baseline, candidate) {
  const ast = acorn.parse(candidate, { ecmaVersion: 'latest' });
  const edits = [], counts = { helper: 0, style: 0, renderer: 0, append: 0, stageCopy: 0, stageGroup: 0, accumulationGroup: 0 };
  walk(ast, node => {
    if (node.type === 'VariableDeclaration') {
      const ids = node.declarations.map(item => item.id && item.id.name);
      for (const [name, label] of [['WCStormMoments', 'helper'], ['WC_STORM_MOMENTS_STYLE', 'style']]) {
        if (ids.includes(name)) {
          if (node.declarations.length !== 1) throw new Error('New declaration shares an existing statement: ' + name);
          counts[label]++; edits.push({ start: node.start, end: node.end, text: '' });
        }
      }
    }
    if (node.type === 'FunctionDeclaration' && node.id && node.id.name === 'renderStormMoments') {
      counts.renderer++; edits.push({ start: node.start, end: node.end, text: '' });
    }
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'renderStormMoments') {
      if (node.arguments.length) throw new Error('Unexpected arguments on comparison append');
      const prefix = candidate.slice(0, node.start), comma = prefix.search(/,\s*$/);
      if (comma < 0) throw new Error('Comparison append is not a separate final child');
      counts.append++; edits.push({ start: comma, end: node.end, text: '' });
    }
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && !node.callee.computed && node.callee.object.name === 'WCStormMoments' && node.callee.property.name === 'currentCopy') {
      if (node.arguments.length !== 1 || node.arguments[0].name !== 'precipModel') throw new Error('Unexpected stage-copy input');
      counts.stageCopy++; edits.push({ start: node.start, end: node.end, text: 'precipModel.lifecycle.stageCopy' });
    }
    if (node.type === 'ObjectExpression') {
      const prop = name => node.properties.find(item => item.type === 'Property' && !item.computed && (item.key.name || item.key.value) === name);
      const className = prop('className'), role = prop('role');
      const groups = { 'wc-storm-stage-segments': 'stageGroup', 'wc-storm-accumulation': 'accumulationGroup' };
      if (className && groups[className.value.value] && role) {
        if (role.value.value !== 'group') throw new Error('Unexpected lifecycle grouping role');
        const comma = candidate.slice(0, role.start).search(/,\s*$/);
        if (comma < 0) throw new Error('Grouping role has no preceding separator');
        counts[groups[className.value.value]]++; edits.push({ start: comma, end: role.end, text: '' });
      }
    }
  });
  if (!Object.values(counts).every(value => value === 1)) throw new Error('Unexpected enhancement boundaries: ' + JSON.stringify(counts));
  edits.sort((a, b) => b.start - a.start);
  let stripped = candidate;
  for (const edit of edits) stripped = stripped.slice(0, edit.start) + edit.text + stripped.slice(edit.end);
  const oldTokens = tokens(baseline), newTokens = tokens(stripped);
  const mismatch = oldTokens.findIndex((token, index) => !same(token, newTokens[index]));
  return { passed: oldTokens.length === newTokens.length && mismatch === -1, boundaries: counts,
    baselineTokens: oldTokens.length, candidatePriorTokens: newTokens.length,
    mismatch: mismatch === -1 ? null : { index: mismatch, baseline: oldTokens.slice(Math.max(0, mismatch - 3), mismatch + 4), candidate: newTokens.slice(Math.max(0, mismatch - 3), mismatch + 4) } };
}
if (process.argv.includes('--review')) {
  const baseline = bytes(local('baseline-runtime.js')), source = bytes('stem_lab/stem_tool_watercycle.js');
  new vm.Script(source.toString('utf8'));
  console.log(JSON.stringify({ baselineSha256: sha(baseline), sourceSha256: sha(source), preservation: preservation(baseline.toString('utf8'), source.toString('utf8')) }, null, 2));
  process.exit(0);
}
const result = { checkedAt: new Date().toISOString(), completed: false, successful: false, checks: [], errors: [] };
const check = (label, passed, details) => result.checks.push({ label, passed: Boolean(passed), ...(details === undefined ? {} : { details }) });
function pin(input, label) {
  const data = bytes(input.path);
  check(label || 'Pinned input ' + input.path, sha(data) === input.sha256 && data.length === input.bytes);
  return data;
}
function closure(report, label, successful = true) {
  if (successful) check(label + ' successful completion', report.completed === true && report.successful === true && (report.errors || []).length === 0 && (report.consoleErrors || []).length === 0);
  check(label + ' owned browser closed', report.browserClosed === true && report.resourcesClosed === true && validTime(report.browserClosedAt));
  check(label + ' no server was used', report.serverUsed === false && report.serverClosed === true && report.serverClosedAt === null);
  check(label + ' valid resource chronology', validTime(report.startedAt) && validTime(report.browserLaunchedAt) && validTime(report.completedAt) && time(report.startedAt) <= time(report.browserLaunchedAt) && time(report.browserLaunchedAt) <= time(report.browserClosedAt) && time(report.browserClosedAt) <= time(report.completedAt));
}
function contrast(foreground, background) {
  const match = foreground.match(/rgba?\(([^)]+)\)/);
  if (!match || !Array.isArray(background) || background.length !== 3) return NaN;
  const color = match[1].split(',').map(Number), alpha = color.length > 3 ? color[3] : 1;
  const front = color.slice(0, 3).map((value, index) => value * alpha + background[index] * (1 - alpha));
  const lum = values => values.map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  return (Math.max(lum(front), lum(background)) + .05) / (Math.min(lum(front), lum(background)) + .05);
}
function png(data) {
  if (data.length < 24 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid PNG artifact');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}
function browserEvidence(report, entry, candidateSha256) {
  closure(report, entry.label);
  check(entry.label + ' supplied runtime agrees with frozen tested bytes', report.sourceSha256 === entry.sourceSha256 && report.sourceBytes === bytes(entry.runtimePath).length && sha(bytes(entry.runtimePath)) === entry.sourceSha256);
  check(entry.label + ' frozen harness agrees with actual executed harness receipt', report.harnessSha256 === sha(bytes(entry.harnessPath)));
  check(entry.label + ' successful native checks', report.checks.length > 0 && report.checks.every(item => item.passed === true));
  if (!entry.baseline) {
    check(entry.label + ' actual DOM script matches candidate', report.loadedRuntimeSha256 === candidateSha256 && report.loadedRuntimeBytes === report.sourceBytes && report.sourceSha256 === candidateSha256 && report.publicHostSha256 === candidateSha256);
    for (const item of report.cases.filter(item => item.context === 'open-comparison')) {
      check(entry.label + ' clear layout ' + item.variant, item.pageOverflow === false && item.scrollWidth <= item.clientWidth + 1 && item.text.length > 0 && item.text.every(text => text.fontSize >= 13 && text.clipped === false) && item.controls.every(control => control.bounds.height >= 43.9 && control.textInside === true));
      check(entry.label + ' independently computed text contrast ' + item.variant, item.text.every(text => text.backgrounds.length > 0 && text.backgrounds.every(background => contrast(text.foreground, background) >= 4.5) && Math.abs(Math.min(...text.backgrounds.map(background => contrast(text.foreground, background))) - text.minimumContrast) < .001));
      check(entry.label + ' schematics remain text-free and fit ' + item.variant, item.svgs.length === 3 && item.svgs.every(svg => svg.hidden === 'true' && svg.textCount === 0 && svg.bounds.x >= svg.view.x && svg.bounds.y >= svg.view.y && svg.bounds.x + svg.bounds.width <= svg.view.x + svg.view.width && svg.bounds.y + svg.bounds.height <= svg.view.y + svg.view.height));
    }
    for (const item of report.cases.filter(item => item.context === 'kernel-readings')) check(entry.label + ' displayed readings match actual kernel ' + item.variant, item.readings.length === 3 && item.readings.every(row => String(row.expectedActivity) === row.activity && String(row.expectedGround) === row.ground));
    for (const item of report.cases.filter(item => item.context === 'kernel-five-track-readings')) check(entry.label + ' all-track actual kernel and phase cues ' + item.label, item.rows.length === 3 && item.rows.every((row, index) => row.stage === ['developing', 'mature', 'weakening'][index] && row.time === [16, 52, 86][index] && String(row.expectedActivity) === row.activity && String(row.expectedGround) === row.ground && row.activityWidth === row.expectedActivity + '%' && row.groundWidth === row.expectedGround + '%' && row.actualPhase === row.phase && row.actualLightning === row.expectedLightning && row.actualEvaporation === (row.phase === 'virga')));
    check(entry.label + ' all native inspections preserve full learner state and paused pixels', report.nativeActions.length > 0 && report.nativeActions.every(action => action.beforeDataSha256 === action.afterDataSha256 && action.beforeCanvasSha256 === action.afterCanvasSha256));
    if (report.mode === 'browser') {
      const variants = report.cases.filter(item => item.context === 'open-comparison').map(item => item.variant).sort();
      check('final full display matrix retained', same(variants, ['desktop', 'phone320', 'phone390', 'host390', 'dark', 'app-contrast', 'forced-phone', 'forced-dark'].sort()));
      const allTracks = report.cases.filter(item => item.context === 'kernel-five-track-readings');
      check('final eight-phase five-track coverage retained', ['clear', 'virga', 'rain', 'snow', 'mix', 'freezing-rain', 'sleet', 'hail'].every(phase => ['snow', 'glaze', 'hail', 'puddling', 'runoff'].every(metric => allTracks.some(item => item.metric === metric && item.label === 'Phase ' + phase + ' ' + metric && item.rows.every(row => row.phase === phase)))));
      const end = report.nativeActions.findIndex(action => action.keyboard && action.key === 'End' && action.focus === 'wcStormMomentMetric');
      const home = report.nativeActions[end + 1];
      check('final consecutive native select changes retain focus without refocusing', end >= 0 && home && home.key === 'Home' && home.focus === 'wcStormMomentMetric' && home.skipFocus === true);
      const three = report.checks.filter(item => item.details && item.details.kind === '3d' && item.details.objects && item.details.identity);
      check('final genuine3D object and hook identities retained', three.length > 0 && three.every(item => item.passed && item.details.healthy === true && Object.values(item.details.objects).every(Boolean) && Object.values(item.details.identity).every(Boolean) && Object.values(item.details.hookTypes).every(type => type === 'function')));
    }
    for (const audit of report.audits) {
      const nodes = audit.incomplete.flatMap(rule => rule.nodes.map(node => ({ rule: rule.id, node })));
      check(entry.label + ' zero scoped axe violations ' + audit.label, audit.violations.length === 0);
      check(entry.label + ' all exact incomplete targets resolved ' + audit.label, nodes.length === audit.manualResolutions.length && nodes.every(({ rule, node }) => audit.manualResolutions.some(resolution => resolution.rule === rule && same(resolution.target, node.target) && resolution.html === node.html && resolution.resolved === true && resolution.clipped === false && resolution.range.width > 0 && resolution.range.height > 0 && resolution.backgrounds.length > 0 && resolution.backgrounds.every(background => contrast(resolution.foreground, background) >= 4.5))));
    }
  }
  for (const capture of report.captures) {
    const data = bytes(path.posix.join(path.posix.dirname(entry.path), capture.path)), dimensions = png(data);
    check(entry.label + ' saved capture ' + capture.path, sha(data) === capture.sha256 && data.length === capture.bytes && dimensions.width === capture.width && dimensions.height === capture.height && capture.sourceSha256 === report.sourceSha256 && validTime(capture.capturedAt) && time(capture.capturedAt) >= time(report.browserLaunchedAt) && time(capture.capturedAt) <= time(report.browserClosedAt));
  }
}
function tests(report, expected, label) {
  const suites = report.testResults || [], identities = [];
  check(label + ' exact test files', same(suites.map(suite => tail(suite.name)).sort(), expected.map(tail).sort()));
  for (const suite of suites) for (const test of suite.assertionResults || []) {
    const identity = tail(suite.name) + '::' + (test.fullName || [...(test.ancestorTitles || []), test.title].join(' > '));
    identities.push(identity);
    check(label + ' passed ' + identity, test.status === 'passed');
  }
  check(label + ' all tests completed successfully', report.success === true && report.numFailedTests === 0 && report.numPendingTests === 0 && report.numTodoTests === 0 && report.numPassedTests === report.numTotalTests && identities.length === report.numTotalTests);
  check(label + ' distinct test identities', new Set(identities).size === identities.length);
  return identities;
}
function testProvenance(report, manifest, label, closures) {
  const before = json(manifest.reports[label + 'Before']), after = json(manifest.reports[label + 'After']);
  check(label + ' raw result binds actual after receipt', same(report.waterCycleStormMomentsVerification, after));
  check(label + ' before receipt retained verbatim', Object.keys(before).every(key => same(before[key], after[key])));
  check(label + ' final runtime expectation', before.expectedRuntimeSha256 === manifest.sourceSha256 && after.expectedRuntimeSha256 === manifest.sourceSha256);
  check(label + ' successful isolated process closed', after.processExitCode === 0 && after.processSignal === null && after.processClosed === true && Number.isInteger(after.processPid) && after.processPid > 0 && after.singleWorker === true && after.fileParallelism === false);
  check(label + ' process chronology', validTime(after.startedAt) && validTime(after.processClosedAt) && validTime(after.completedAt) && time(after.startedAt) <= time(after.processClosedAt) && time(after.processClosedAt) <= time(after.completedAt));
  for (const field of ['sourceSha256Before', 'sourceSha256After', 'publicSha256Before', 'publicSha256After']) check(label + ' ' + field, after[field] === manifest.sourceSha256);
  const wanted = label === 'unit' ? [manifest.testPath] : manifest.regressionFiles;
  check(label + ' exact runtime and test input scopes', same(after.runtimeFiles.map(item => item.path).sort(), [manifest.sourcePath, manifest.publicPath].sort()) && same(after.testFiles.map(item => item.path).sort(), [...wanted].sort()));
  const fixtures = label === 'unit' ? [manifest.baselinePath] : manifest.regressionFixturePaths;
  check(label + ' exact frozen fixture scope', same(after.fixtureFiles.map(item => item.path).sort(), [...fixtures].sort()) && after.fixtureFiles.every(item => item.sha256 === item.expectedSha256));
  for (const kind of ['runtime', 'test', 'fixture']) {
    const inputs = after[kind + 'Files'], outputs = after[kind + 'FilesAfter'];
    const raw = items => items.map(({ path, sha256, bytes }) => ({ path, sha256, bytes }));
    check(label + ' ' + kind + ' inputs retained through process exit', same(raw(inputs), raw(outputs)));
    for (const item of inputs) {
      pin(item, label + ' current ' + kind + ' ' + item.path);
      const reads = after.loadedFiles.filter(read => read.path === item.path);
      check(label + ' actual native file reads ' + item.path, reads.length > 0 && reads.every(read => read.sha256 === item.sha256 && read.bytes === item.bytes && validTime(read.loadedAt) && time(read.loadedAt) >= time(after.startedAt) && time(read.loadedAt) <= time(after.completedAt) && Number.isInteger(read.pid) && read.pid > 0));
    }
  }
  check(label + ' frozen recipes have exact before/after proof', after.recipeFiles.length === 2 && same(after.recipeFiles.map(({ path, sha256, bytes, executionPath }) => ({ path, sha256, bytes, executionPath })), after.recipeFilesAfter.map(({ path, sha256, bytes, executionPath }) => ({ path, sha256, bytes, executionPath }))) && after.recipeFilesAfter.every(item => item.executionSha256After === item.sha256));
  for (const item of after.recipeFiles) pin(item, label + ' frozen recipe ' + item.path);
  const loaded = json(manifest.reports[label + 'Loaded']);
  check(label + ' helper-load report retained', same(loaded, after.loadedReport));
  check(label + ' helper actually loaded both final runtimes', loaded.loadedRuntimes.length === 2 && same(loaded.loadedRuntimes.map(item => item.path).sort(), [manifest.sourcePath, manifest.publicPath].sort()) && loaded.loadedRuntimes.every(item => item.sha256 === manifest.sourceSha256 && (item.bytes === undefined || item.bytes === manifest.sourceBytes)));
  const helperTest = label === 'unit' ? manifest.testPath : manifest.regressionFiles.find(name => tail(name) === 'watercycle_cloud_evidence.test.js');
  check(label + ' helper actually loaded expected test', loaded.loadedTest.path === helperTest && loaded.loadedTest.sha256 === sha(bytes(helperTest)) && (loaded.loadedTest.bytes === undefined || loaded.loadedTest.bytes === bytes(helperTest).length));
  check(label + ' exact owned-browser closure scope', same(after.closureEvidence.map(item => item.path).sort(), closures.map(item => item.path).sort()) && same(after.closureEvidence, after.closureEvidenceAfter));
  for (const item of after.closureEvidence) {
    const saved = closures.find(entry => entry.path === item.path), raw = saved && saved.report;
    check(label + ' bound browser closure ' + item.path, raw && item.sha256 === sha(bytes(item.path)) && item.bytes === bytes(item.path).length && item.mode === raw.mode && item.sourceSha256 === raw.sourceSha256 && item.publicSha256 === (raw.publicSha256 || raw.publicHostSha256) && item.publicHashField === (raw.publicSha256 ? 'publicSha256' : 'publicHostSha256') && item.successful === raw.successful && item.historical === (item.path !== manifest.reports.baseline && item.path !== manifest.reports.browser) && item.browserClosedAt === raw.browserClosedAt && item.resourcesClosed === true && item.serverUsed === false && item.serverClosed === true && item.serverClosedAt === null);
    check(label + ' frozen owned-browser runtime ' + item.path, raw && item.frozenRuntime.sha256 === raw.sourceSha256 && sha(bytes(item.frozenRuntime.path)) === raw.sourceSha256 && bytes(item.frozenRuntime.path).length === item.frozenRuntime.bytes);
    check(label + ' begins after browser closes ' + item.path, time(after.startedAt) >= time(item.browserClosedAt));
  }
  check(label + ' preservation baseline bound', after.preservation.baselinePath === manifest.baselinePath && after.preservation.baselineSha256 === manifest.baselineSha256 && after.preservation.anchors.length > 0 && after.preservation.scoredAnchors.length === 2 && after.preservation.timelineAnchors.length === 5);
  return after;
}
function finalizeManifest() {
  const sourcePath = 'stem_lab/stem_tool_watercycle.js', publicPath = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
  const source = bytes(sourcePath), sourceSha256 = sha(source);
  const reports = { baseline: local('baseline-results.json'), browser: local('browser-results.json'),
    unit: local('unit-results.json'), regression: local('regression-results.json'),
    unitBefore: local('unit-verification-before.json'), unitAfter: local('unit-verification-after.json'),
    regressionBefore: local('regression-verification-before.json'), regressionAfter: local('regression-verification-after.json'),
    unitLoaded: local('unit-loaded-runtime.json'), regressionLoaded: local('regression-loaded-runtime.json'), preview: local('preview-check.json'), processClosure: local('test-process-closure.json') };
  const baseline = json(reports.baseline), browser = json(reports.browser), unit = json(reports.unit), regression = json(reports.regression);
  const unitAfter = json(reports.unitAfter), regressionAfter = json(reports.regressionAfter), preview = json(reports.preview), processClosure = json(reports.processClosure);
  if (!source.equals(bytes(publicPath)) || browser.sourceSha256 !== sourceSha256 || !browser.successful || !browser.browserClosed || !browser.resourcesClosed || !unit.success || !regression.success || !unitAfter.processClosed || !regressionAfter.processClosed || preview.servedRuntimeSha256 !== sourceSha256 || !preview.successful || !processClosure.successful || !processClosure.allOwnedTestProcessesClosed || processClosure.sourceSha256 !== sourceSha256) throw new Error('Final source, closed browser/tests, or learner preview are not ready.');
  if (!same(unitAfter.closureEvidence, regressionAfter.closureEvidence)) throw new Error('Test bundles have different browser closure scopes.');
  const closureReports = unitAfter.closureEvidence.map(item => ({ path: item.path, historical: item.historical, successful: item.successful,
    sourceSha256: item.sourceSha256, runtimePath: item.frozenRuntime.path,
    harnessPath: item.path.replace(/-results\.json$/, '-tested-harness.cjs') }));
  const entry = item => ({ ...item, label: json(item.path).mode + (item.historical ? ' supporting evidence' : ''), baseline: item.path === reports.baseline });
  const browserEvidence = closureReports.filter(item => item.path === reports.baseline || item.path === reports.browser || item.successful && item.sourceSha256 === sourceSha256).map(entry);
  const historicalEvidence = closureReports.filter(item => !browserEvidence.some(entry => entry.path === item.path)).map(entry);
  const identities = report => report.testResults.flatMap(suite => suite.assertionResults.map(test => tail(suite.name) + '::' + test.fullName));
  const allTests = [...identities(unit), ...identities(regression)];
  const counts = { unitTests: unit.numTotalTests, regressionTests: regression.numTotalTests, distinctTests: new Set(allTests).size,
    browserChecks: browser.checks.length, nativeActions: browser.nativeActions.length, scopedAudits: browser.audits.length,
    scopedViolations: browser.audits.reduce((total, audit) => total + audit.violations.length, 0),
    incompleteNodes: browser.audits.reduce((total, audit) => total + audit.incomplete.reduce((n, rule) => n + rule.nodes.length, 0), 0),
    finalCaptures: browser.captures.length, baselineCaptures: baseline.captures.length,
    supportingCaptures: closureReports.filter(item => item.path !== reports.baseline && item.path !== reports.browser).reduce((n, item) => n + json(item.path).captures.length, 0),
    ownedBrowserClosures: closureReports.length };
  const manifest = { title: 'Storm moments verification', status: 'final', enhancementCommitted: false, baselineWasUncommitted: true,
    finalizedAt: new Date().toISOString(), sourcePath, publicPath, sourceSha256, sourceBytes: source.length,
    baselinePath: local('baseline-runtime.js'), baselineSha256: baseline.sourceSha256,
    testedRuntimePath: local('browser-tested-runtime.js'), browserHarnessPath: 'dev-tools/watercycle_storm_moments_qa.cjs',
    testPath: unitAfter.testFiles[0].path, regressionFiles: regressionAfter.testFiles.map(item => item.path),
    regressionFixturePaths: regressionAfter.fixtureFiles.map(item => item.path), reports, closureReports, browserEvidence, historicalEvidence, counts, diagnosticTestReports: [] };
  for (const directory of fs.readdirSync(__dirname, { withFileTypes: true }).filter(item => item.isDirectory() && /^diagnostic-(unit|regression)-/.test(item.name))) {
    for (const mode of ['unit', 'regression']) {
      const base = local(directory.name), reportPath = base + '/' + mode + '-results.json';
      if (fs.existsSync(resolve(reportPath))) manifest.diagnosticTestReports.push({ mode, path: reportPath,
        beforePath: base + '/' + mode + '-verification-before.json', afterPath: base + '/' + mode + '-verification-after.json',
        loadedPath: base + '/' + mode + '-loaded-runtime.json',
        frozenFocusedTestPath: mode === 'unit' ? base + '/unit-tested-test.js' : null,
        recipePaths: [base + '/tested-test-bundle.cjs', base + '/tested-read-audit.cjs'] });
    }
  }
  const note = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
  const finalNote = note.replace('Review and verification are in progress. This enhancement remains uncommitted.', 'The enhancement remains uncommitted. Final native browser checks and tests passed.')
    .replace(/An independent token comparison[\s\S]*?The final saved-evidence verifier will launch no browser or test runner\. Run it with `node reports\/watercycle-storm-moments\/verify\.cjs --read-only` once the manifest is final\./,
      'An independent token comparison confirms that all 352,610 prior JavaScript tokens remain unchanged outside seven presentation boundaries: the new helper, style declaration, local renderer, one lifecycle append call, stage-copy substitution, and two corrected grouping roles.\n\n' +
      '- ' + counts.unitTests + ' focused tests and ' + counts.regressionTests + ' regressions passed (' + counts.distinctTests + ' distinct tests).\n' +
      '- ' + counts.browserChecks + ' final browser checks, ' + counts.nativeActions + ' native actions, and ' + counts.scopedAudits + ' scoped accessibility audits passed.\n' +
      '- ' + counts.scopedViolations + ' scoped accessibility violations; ' + counts.incompleteNodes + ' incomplete targets received exact-node manual resolution.\n' +
      '- ' + counts.finalCaptures + ' final captures and ' + counts.baselineCaptures + ' baseline captures are retained. Supporting and diagnostic captures remain separate from final pass counts.\n' +
      '- All ' + counts.ownedBrowserClosures + ' owned browser runs closed before the test bundles began. Both test processes closed successfully.\n\n' +
      'The first preflight exposed heading order and two existing labeled-container ARIA issues. The initial complete matrix then exposed narrow-host layout and forced-dark title contrast issues. Native select focus was retained to allow consecutive keyboard changes. A draft test fixture was corrected to use an invalid schema version, and a new private helper was renamed to preserve existing unique-name guards. Original reports, frozen inputs, screenshots, test recipes, and closure evidence remain separate from final pass counts.\n\n' +
      'Final source/public/runtime SHA-256: `' + sourceSha256 + '` (' + source.length + ' bytes). The learner preview serves those same bytes at [127.0.0.1:8770](http://127.0.0.1:8770/).\n\n' +
      'The saved-evidence verifier launches no browser or test runner. Run `node reports/watercycle-storm-moments/verify.cjs --read-only` to recheck current source, frozen inputs, actual load receipts, captures, and saved results.');
  fs.writeFileSync(path.join(__dirname, 'README.md'), finalNote);
  const inputs = new Set([sourcePath, publicPath, manifest.browserHarnessPath, 'docs/water-cycle-visual-design.md', manifest.testPath,
    ...manifest.regressionFiles, ...manifest.regressionFixturePaths,
    'dev-tools/.cache/sweep-tailwind.css', 'desktop/web-app/node_modules/react/umd/react.production.min.js',
    'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'desktop/web-app/node_modules/axe-core/axe.min.js',
    'vendor/three-r128/three.min.js', 'vendor/three-r128/OrbitControls.js', 'stem_lab/stem_lab_module.js',
    'node_modules/acorn/dist/acorn.js', 'node_modules/acorn/package.json']);
  function inventory(directory) {
    for (const item of fs.readdirSync(resolve(directory), { withFileTypes: true })) {
      const name = directory + '/' + item.name;
      if (item.isDirectory()) inventory(name);
      else if (!['artifact-summary.json', 'verification-summary.json'].includes(item.name)) inputs.add(name);
    }
  }
  inventory(reportDir);
  manifest.pins = [...inputs].sort().map(name => { const data = bytes(name); return { path: name, sha256: sha(data), bytes: data.length }; });
  fs.writeFileSync(path.join(__dirname, 'artifact-summary.json'), JSON.stringify(manifest, null, 2));
}
if (process.argv.includes('--finalize')) finalizeManifest();
try {
  const manifest = json(local('artifact-summary.json'));
  if (manifest.status !== 'final') throw new Error('Final evidence artifacts are still being prepared.');
  check('enhancement recorded as uncommitted', manifest.enhancementCommitted === false && manifest.baselineWasUncommitted === true);
  for (const input of manifest.pins) pin(input);
  const source = bytes(manifest.sourcePath), mirror = bytes(manifest.publicPath), baseline = bytes(manifest.baselinePath);
  new vm.Script(source.toString('utf8'), { filename: manifest.sourcePath });
  check('current source and public mirror match final candidate', source.equals(mirror) && sha(source) === manifest.sourceSha256 && source.length === manifest.sourceBytes && sha(bytes(manifest.testedRuntimePath)) === manifest.sourceSha256);
  check('frozen baseline remains prior uncommitted groundwater runtime', sha(baseline) === manifest.baselineSha256 && manifest.baselineSha256 === '3677bd11a38cd0f20ff4fd6dfb3808384bda0cbae4b3ebec254a1beb8476405d');
  const prior = preservation(baseline.toString('utf8'), source.toString('utf8'));
  check('all prior source tokens preserved outside seven authorized presentation boundaries', prior.passed, prior);
  for (const entry of manifest.browserEvidence) browserEvidence(json(entry.path), entry, manifest.sourceSha256);
  for (const entry of manifest.historicalEvidence) {
    const report = json(entry.path);
    closure(report, entry.label + ' historical diagnostic', false);
    check('historical diagnostic keeps its actual source and harness ' + entry.path, report.sourceSha256 === entry.sourceSha256 && sha(bytes(entry.runtimePath)) === entry.sourceSha256 && sha(bytes(entry.harnessPath)) === report.harnessSha256);
    for (const capture of report.captures) {
      const data = bytes(path.posix.join(path.posix.dirname(entry.path), capture.path)), dimensions = png(data);
      check('historical capture retains original native receipt ' + entry.path + ' ' + capture.path, sha(data) === capture.sha256 && data.length === capture.bytes && dimensions.width === capture.width && dimensions.height === capture.height && capture.sourceSha256 === report.sourceSha256 && validTime(capture.capturedAt) && time(capture.capturedAt) >= time(report.browserLaunchedAt) && time(capture.capturedAt) <= time(report.browserClosedAt));
    }
  }
  for (const entry of manifest.diagnosticTestReports) {
    const report = json(entry.path), before = json(entry.beforePath), after = json(entry.afterPath), loaded = json(entry.loadedPath);
    check('historical test receipt retained ' + entry.path, same(report.waterCycleStormMomentsVerification, after) && Object.keys(before).every(key => same(before[key], after[key])) && same(loaded, after.loadedReport));
    check('historical test process closed ' + entry.path, after.processClosed === true && after.processSignal === null && after.processExitCode === (report.success ? 0 : 1) && validTime(after.startedAt) && validTime(after.processClosedAt) && validTime(after.completedAt) && time(after.startedAt) <= time(after.processClosedAt) && time(after.processClosedAt) <= time(after.completedAt));
    check('historical test result kept without entering final pass totals ' + entry.path, report.numPassedTests + report.numFailedTests === report.numTotalTests && report.numPendingTests === 0 && report.numTodoTests === 0 && report.testResults.flatMap(suite => suite.assertionResults).length === report.numTotalTests);
    const runtime = manifest.closureReports.find(item => item.sourceSha256 === after.expectedRuntimeSha256);
    check('historical actual-loaded runtime bound to retained bytes ' + entry.path, runtime && sha(bytes(runtime.runtimePath)) === after.expectedRuntimeSha256 && after.runtimeFiles.every(item => item.sha256 === after.expectedRuntimeSha256 && item.bytes === bytes(runtime.runtimePath).length) && loaded.loadedRuntimes.every(item => item.sha256 === after.expectedRuntimeSha256));
    for (const item of [...after.runtimeFiles, ...after.testFiles, ...after.fixtureFiles]) {
      const reads = after.loadedFiles.filter(read => read.path === item.path);
      check('historical actual native file reads ' + entry.path + ' ' + item.path, reads.length > 0 && reads.every(read => read.sha256 === item.sha256 && read.bytes === item.bytes && validTime(read.loadedAt) && time(read.loadedAt) >= time(after.startedAt) && time(read.loadedAt) <= time(after.completedAt)));
      if (entry.mode === 'unit' && item.path === after.testFiles[0].path) check('historical exact draft fixture retained ' + entry.path, sha(bytes(entry.frozenFocusedTestPath)) === item.sha256 && bytes(entry.frozenFocusedTestPath).length === item.bytes && loaded.loadedTest.sha256 === item.sha256);
      else if (!after.runtimeFiles.some(runtime => runtime.path === item.path)) check('historical unchanged test or fixture retained ' + entry.path + ' ' + item.path, sha(bytes(item.path)) === item.sha256 && bytes(item.path).length === item.bytes);
    }
    for (const recipe of after.recipeFiles) {
      const frozen = entry.recipePaths.find(name => tail(name) === tail(recipe.path));
      check('historical executable recipe retained ' + entry.path + ' ' + tail(recipe.path), frozen && sha(bytes(frozen)) === recipe.sha256 && bytes(frozen).length === recipe.bytes);
    }
    for (const old of after.closureEvidence) {
      const retained = manifest.closureReports.find(item => sha(bytes(item.path)) === old.sha256);
      check('historical tests begin after retained browser closure ' + entry.path + ' ' + old.mode, retained && json(retained.path).browserClosedAt === old.browserClosedAt && time(after.startedAt) >= time(old.browserClosedAt));
    }
  }
  const closures = manifest.closureReports.map(entry => ({ ...entry, report: json(entry.path) }));
  const unit = json(manifest.reports.unit), regression = json(manifest.reports.regression);
  const unitIds = tests(unit, [manifest.testPath], 'unit'), regressionIds = tests(regression, manifest.regressionFiles, 'regression');
  const unitAfter = testProvenance(unit, manifest, 'unit', closures), regressionAfter = testProvenance(regression, manifest, 'regression', closures);
  check('test bundles ran sequentially after owned-browser closure', time(unitAfter.completedAt) <= time(regressionAfter.startedAt));
  check('focused and regression tests are distinct', new Set([...unitIds, ...regressionIds]).size === unitIds.length + regressionIds.length);
  const browser = json(manifest.reports.browser), baselineReport = json(manifest.reports.baseline), preview = json(manifest.reports.preview);
  const counts = { unitTests: unit.numTotalTests, regressionTests: regression.numTotalTests, distinctTests: new Set([...unitIds, ...regressionIds]).size,
    browserChecks: browser.checks.length, nativeActions: browser.nativeActions.length, scopedAudits: browser.audits.length,
    scopedViolations: browser.audits.reduce((total, audit) => total + audit.violations.length, 0),
    incompleteNodes: browser.audits.reduce((total, audit) => total + audit.incomplete.reduce((n, rule) => n + rule.nodes.length, 0), 0),
    finalCaptures: browser.captures.length, baselineCaptures: baselineReport.captures.length,
    supportingCaptures: closures.filter(item => item.path !== manifest.reports.baseline && item.path !== manifest.reports.browser).reduce((n, item) => n + item.report.captures.length, 0),
    ownedBrowserClosures: closures.length };
  check('headline totals derive from final successful raw evidence', same(counts, manifest.counts));
  const processClosure = json(manifest.reports.processClosure);
  const processPids = [...new Set([processClosure.runnerPid, unitAfter.processPid, regressionAfter.processPid, ...unitAfter.loadedFiles.map(item => item.pid), ...regressionAfter.loadedFiles.map(item => item.pid)])].sort((a, b) => a - b);
  check('native closure covers actual runner and every observed test process', processClosure.successful === true && processClosure.allOwnedTestProcessesClosed === true && processClosure.aliveProcesses.length === 0 && processClosure.sourceSha256 === manifest.sourceSha256 && processClosure.runnerStatus === 'complete' && same([...processClosure.checkedPids].sort((a, b) => a - b), processPids) && validTime(processClosure.verifiedAt) && validTime(processClosure.runnerCompletedAt) && time(processClosure.verifiedAt) >= time(processClosure.runnerCompletedAt) && time(processClosure.runnerCompletedAt) >= time(regressionAfter.completedAt));
  check('native closure counts and recipes bind final raw evidence', processClosure.focusedTests === counts.unitTests && processClosure.regressionTests === counts.regressionTests && processClosure.totalPassed === counts.distinctTests && processClosure.distinctTestNames === counts.distinctTests && same([...processClosure.recipePaths].sort(), unitAfter.recipeFiles.map(item => item.path).sort()));
  check('final learner preview served exact tested bytes', preview.successful === true && preview.previewStatus === 200 && preview.runtimeStatus === 200 && preview.sourceSha256 === manifest.sourceSha256 && preview.publicHostSha256 === manifest.sourceSha256 && preview.servedRuntimeSha256 === manifest.sourceSha256 && preview.sourceBytes === manifest.sourceBytes && preview.publicHostBytes === manifest.sourceBytes && preview.runtimeBytes === manifest.sourceBytes && preview.browserUsed === false && validTime(preview.checkedAt));
  result.counts = counts; result.sourceSha256 = manifest.sourceSha256;
  result.manifestSha256 = sha(bytes(local('artifact-summary.json'))); result.verifierSha256 = sha(bytes(local('verify.cjs')));
  if (process.argv.includes('--read-only')) {
    const saved = json(local('verification-summary.json'));
    if (!saved.successful || saved.sourceSha256 !== result.sourceSha256 || saved.manifestSha256 !== result.manifestSha256 || saved.verifierSha256 !== result.verifierSha256 || !same(saved.counts, counts) || saved.checks.length !== result.checks.length) throw new Error('Saved verification summary is not bound to the current manifest, verifier, and raw evidence.');
  }
} catch (error) { result.errors.push(error.stack || String(error)); }
result.completed = true;
result.successful = result.errors.length === 0 && result.checks.every(item => item.passed);
if (!process.argv.includes('--read-only')) fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ completed: result.completed, successful: result.successful, checks: result.checks.length, failures: result.checks.filter(item => !item.passed), errors: result.errors }, null, 2));
if (!result.successful) process.exitCode = 1;
