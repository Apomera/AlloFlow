'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const reportDir = __dirname;
const summary = JSON.parse(fs.readFileSync(path.join(reportDir, 'artifact-summary.json'), 'utf8'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(root, relative));
const fail = message => { throw new Error(message); };
const assert = (value, message) => { if (!value) fail(message); };
const { parse } = require(require.resolve('acorn', { paths: [root, path.join(root, 'desktop/web-app')] }));
const checks = [];
function check(label, action) {
  try { const detail = action(); checks.push({ label, pass: true, detail }); }
  catch (error) { checks.push({ label, pass: false, error: error.message }); }
}
function relativeTestName(name) {
  let value = String(name).replace(/\\/g, '/');
  const prefix = root.replace(/\\/g, '/') + '/';
  if (value.toLowerCase().startsWith(prefix.toLowerCase())) value = value.slice(prefix.length);
  assert(value.startsWith('tests/') && !value.includes('..'), 'Unexpected test path: ' + name);
  return value;
}
function testEvidence(report, expectedTests, expectedFiles) {
  assert(report.success === true, 'Test report did not succeed');
  assert(report.numFailedTests === 0 && report.numPendingTests === 0 && report.numTodoTests === 0, 'Test report has failed or incomplete tests');
  const files = new Set();
  const identities = [];
  for (const suite of report.testResults || []) {
    const file = relativeTestName(suite.name);
    files.add(file);
    assert(suite.status === 'passed', 'Suite did not pass: ' + file);
    for (const test of suite.assertionResults || []) {
      assert(test.status === 'passed', 'Test did not pass: ' + test.fullName);
      identities.push(file + '\n' + test.fullName);
    }
  }
  assert(identities.length === expectedTests && new Set(identities).size === expectedTests, 'Test identity count differs');
  assert(report.numTotalTests === expectedTests && report.numPassedTests === expectedTests, 'Declared test counts differ');
  assert(files.size === expectedFiles, 'Test file count differs');
  return { files: [...files].sort(), identities };
}
function verificationExport(text) {
  const start = text.indexOf('const SOURCE_PATH =');
  const end = text.indexOf('\nconst MODEL =', start);
  assert(start >= 0 && end > start, 'Verification export range is missing');
  const body = text.slice(start, end).replace('export const waterCycleJourneyVerification', 'const waterCycleJourneyVerification');
  return new Function('parse', body + '\nreturn waterCycleJourneyVerification;')(parse);
}
function preservedRange(text, start, end) {
  const normalized = text.replace(/\r\n/g, '\n');
  const from = normalized.indexOf(start);
  const to = normalized.indexOf(end, from);
  assert(from >= 0 && to > from, 'Missing derivation range: ' + start);
  return normalized.slice(from, to);
}
function cleanBrowser(report, label) {
  assert(report.completed === true && report.successful === true, label + ' did not complete successfully');
  assert(report.browserClosed === true && report.serverClosed === true, label + ' did not close its owned browser/server');
  assert(Array.isArray(report.errors) && report.errors.length === 0, label + ' has browser errors');
  assert(Array.isArray(report.failures) && report.failures.length === 0 && report.failed === 0, label + ' has failed checks');
  assert(report.checks.length > 0 && report.checks.every(item => item.pass === true), label + ' has incomplete checks');
  for (const field of ['sourceSha256', 'publicSha256', 'finalSourceSha256', 'finalPublicSha256']) assert(report[field] === summary.sourceSha256, label + ' has a different runtime hash');
  assert(report.audits.length > 0 && report.audits.every(audit => Array.isArray(audit.violations) && audit.violations.length === 0 && !audit.error), label + ' has an accessibility violation or audit error');
  return { checks: report.checks.length, cases: report.cases.length, actions: report.actions.length, audits: report.audits.length,
    incompleteAuditItems: report.audits.reduce((count, audit) => count + (Array.isArray(audit.incomplete) ? audit.incomplete.length : 0), 0),
    captures: report.captures.length };
}
check('Exact source, mirror and frozen baseline hashes', () => {
  assert(sha(read(summary.sourcePath)) === summary.sourceSha256, 'Source hash changed');
  assert(sha(read(summary.publicPath)) === summary.sourceSha256, 'Mirror hash changed');
  assert(sha(read(summary.baselinePath)) === summary.baselineSha256, 'Frozen baseline hash changed');
  return { sourceSha256: summary.sourceSha256, baselineSha256: summary.baselineSha256 };
});
check('Exact report, test, script and PNG artifact hashes', () => {
  for (const artifact of summary.artifacts) {
    const bytes = read(artifact.path);
    assert(bytes.length === artifact.bytes && sha(bytes) === artifact.sha256, 'Artifact changed: ' + artifact.path);
    if (artifact.sha256LF) assert(sha(bytes.toString('utf8').replace(/\r\n/g, '\n')) === artifact.sha256LF, 'LF test hash changed: ' + artifact.path);
    if (artifact.png) {
      assert(bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', 'Invalid PNG: ' + artifact.path);
      assert(bytes.readUInt32BE(16) === artifact.png.width && bytes.readUInt32BE(20) === artifact.png.height, 'PNG dimensions changed: ' + artifact.path);
    }
  }
  return { artifacts: summary.artifacts.length, pngs: summary.artifacts.filter(item => item.png).length };
});
check('353 distinct passing tests across 14 files', () => {
  const unitReport = JSON.parse(read(summary.unitReportPath)), regressionReport = JSON.parse(read(summary.regressionReportPath));
  const unit = testEvidence(unitReport, 47, 2);
  const regression = testEvidence(regressionReport, 306, 12);
  const identities = [...unit.identities, ...regression.identities];
  const files = [...new Set([...unit.files, ...regression.files])].sort();
  assert(identities.length === 353 && new Set(identities).size === 353 && files.length === 14, 'Combined tests are not distinct');
  assert(JSON.stringify(files) === JSON.stringify(summary.testFiles.map(item => item.path).sort()), 'Test file inventory differs');
  const browserFinished = Date.parse(JSON.parse(read(summary.browserReportPath)).finishedAt);
  assert(Number.isFinite(browserFinished) && [unitReport, regressionReport].every(report => Number.isFinite(report.startTime) && report.startTime >= browserFinished), 'A test suite began before final browser closure');
  return { tests: identities.length, files: files.length, unit: 47, regression: 306 };
});
check('72 preserved AST anchors and 2 original score blocks', () => {
  const api = verificationExport(read('tests/watercycle_journey_chapters.test.js').toString('utf8'));
  const before = read(summary.baselinePath).toString('utf8');
  const after = read(summary.sourcePath).toString('utf8');
  assert(api.baselineSha === summary.baselineSha256, 'Test baseline pin differs');
  const baselineNodes = api.productionNodes(before);
  const sourceNodes = api.productionNodes(after);
  const names = [...api.preservedNames, ...api.deltaAssignments.map(name => name + ':assignment')];
  assert(names.length === 72 && new Set(names).size === 72, 'Preservation inventory differs');
  const anchors = names.map(name => {
    assert(baselineNodes[name] && sourceNodes[name] && baselineNodes[name] === sourceNodes[name], 'Preserved anchor differs: ' + name);
    return { name, sha256: sha(sourceNodes[name]) };
  });
  const originalScores = api.scoredNodes(before), currentScores = api.scoredNodes(after);
  assert(Object.keys(originalScores).length === 2 && Object.keys(currentScores).length === 2, 'Score-block inventory differs');
  for (const kind of ['quiz', 'myth']) assert(originalScores[kind] && currentScores[kind] === originalScores[kind], 'Score block differs: ' + kind);
  return { anchors, scoreBlocks: Object.fromEntries(Object.entries(currentScores).map(([key, value]) => [key, sha(value)])) };
});
check('Full comparison and signal derivations remain unchanged', () => {
  const before = read(summary.baselinePath).toString('utf8'), after = read(summary.sourcePath).toString('utf8');
  return summary.derivationRanges.map(range => {
    const original = preservedRange(before, range.start, range.end), current = preservedRange(after, range.start, range.end);
    assert(original === current && sha(current) === range.sha256, 'Derivation differs: ' + range.label);
    return { label: range.label, sha256: range.sha256, bytesLF: Buffer.byteLength(current) };
  });
});
check('Final native browser QA and scoped audits are clean and closed', () => cleanBrowser(JSON.parse(read(summary.browserReportPath)), 'Final browser QA'));
check('Readable browser summary matches final native evidence', () => {
  const readable = JSON.parse(read(summary.browserSummaryReportPath));
  const browser = JSON.parse(read(summary.browserReportPath));
  assert(readable.sourceSha256 === summary.sourceSha256 && readable.baselineRuntimeSha256 === summary.baselineSha256 &&
    Object.values(readable.hashes).every(value => value === summary.sourceSha256), 'Readable browser summary hash differs');
  assert(readable.completed === true && readable.successful === true && readable.browserClosed === true &&
    readable.serverClosed === true && readable.errors.length === 0, 'Readable browser summary is incomplete');
  assert(readable.counts.passed === browser.checks.length && readable.counts.failed === 0 &&
    readable.counts.snapshots === browser.cases.length && readable.counts.nativeActions === browser.actions.length &&
    readable.counts.captures === browser.captures.length && readable.counts.scopedAudits === browser.audits.length &&
    readable.metrics.minimumCounterContrast === summary.counterContrast.minimumRatio &&
    readable.metrics.minimumDominantSymbolContrast === summary.diagramContrast.minimumRatio, 'Readable browser counts or measurements differ');
  return readable.counts;
});
check('Separate computed counter contrast measurements meet 4.5:1', () => {
  const report = JSON.parse(read(summary.browserReportPath));
  const recorded = report.checks.filter(item => item.label.includes('recorded counters meet contrast'));
  assert(recorded.length > 0 && recorded.every(item => item.pass === true && Array.isArray(item.detail)), 'Counter measurements are missing or incomplete');
  const measurements = recorded.flatMap(item => item.detail);
  assert(measurements.length > 0 && measurements.every(item => Number.isFinite(item.minimumContrast) && item.minimumContrast >= 4.5 && item.method), 'A measured counter contrast is incomplete or below 4.5:1');
  const actual = { checks: recorded.length, measurements: measurements.length,
    casesWithoutCounters: recorded.filter(item => item.detail.length === 0).length,
    minimumRatio: Math.min(...measurements.map(item => item.minimumContrast)),
    methods: [...new Set(measurements.map(item => item.method))] };
  assert(JSON.stringify(actual) === JSON.stringify(summary.counterContrast), 'Counter contrast inventory differs');
  return actual;
});
check('Dominant phase-symbol and direction measurements meet 3:1', () => {
  const report = JSON.parse(read(summary.browserReportPath));
  const recorded = report.checks.filter(item => item.label.includes('dominant phase symbols and direction glyph meet3to1contrast'));
  assert(recorded.length > 0 && recorded.every(item => item.pass === true && Array.isArray(item.detail) && item.detail.length === 3), 'Diagram measurements are missing or incomplete');
  const measurements = recorded.flatMap(item => item.detail);
  assert(measurements.every(item => Number.isFinite(item.minimumContrast) && item.minimumContrast >= 3 && item.method), 'A measured dominant diagram contrast is incomplete or below 3:1');
  const actual = { checks: recorded.length, measurements: measurements.length,
    minimumRatio: Math.min(...measurements.map(item => item.minimumContrast)),
    methods: [...new Set(measurements.map(item => item.method))] };
  assert(JSON.stringify(actual) === JSON.stringify(summary.diagramContrast), 'Diagram contrast inventory differs');
  return actual;
});
if (summary.preflightReportPath) check('Matching final preflight is clean and closed', () => cleanBrowser(JSON.parse(read(summary.preflightReportPath)), 'Preflight'));
check('Metadata binds the final runtime and test hashes', () => {
  for (const metadata of summary.evidenceMetadata) {
    const object = JSON.parse(read(metadata.path));
    assert(metadata.runtimeHashFields.length > 0, 'No runtime binding: ' + metadata.path);
    for (const field of metadata.runtimeHashFields) {
      let value = object;
      for (const key of field.split('.')) value = value[key];
      assert(value === summary.sourceSha256, 'Runtime metadata differs: ' + metadata.path + ':' + field);
    }
    for (const test of metadata.testHashFields || []) {
      let value = object;
      for (const key of test.field.split('.')) value = value[key];
      const artifact = summary.testFiles.find(item => item.path === test.path);
      assert(artifact && (value === artifact.sha256 || value === artifact.sha256LF), 'Test metadata differs: ' + test.path);
    }
  }
  return summary.evidenceMetadata.map(item => item.path);
});
check('Linked captures and local report links resolve', () => {
  const markdown = fs.readFileSync(path.join(reportDir, 'README.md'), 'utf8');
  const links = [...markdown.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]);
  for (const target of links) {
    if (/^https?:\/\//.test(target)) continue;
    if (target === 'verification-summary.json') continue; // This output is written after all checks finish.
    assert(!target.includes('..') && fs.existsSync(path.join(reportDir, target.split('#')[0])), 'Broken report link: ' + target);
  }
  const browser = JSON.parse(read(summary.browserReportPath));
  for (const capture of browser.captures) {
    const file = typeof capture === 'string' ? capture : capture.path;
    assert(summary.artifacts.some(item => path.basename(item.path) === path.basename(file) && item.png), 'Unbound final capture: ' + file);
  }
  return { localLinks: links.length, finalCaptures: browser.captures.length, generatedSummaryOutput: 'verification-summary.json' };
});
check('JavaScript syntax and scoped whitespace', () => {
  const javascript = [summary.sourcePath, summary.publicPath, summary.browserHarnessPath, ...summary.testFiles.map(item => item.path), path.relative(root, __filename).replace(/\\/g, '/')];
  for (const file of javascript) parse(read(file).toString('utf8'), { ecmaVersion: 'latest', sourceType: file.startsWith('tests/') ? 'module' : 'script' });
  const syntax = spawnSync(process.execPath, ['--check', __filename], { encoding: 'utf8' });
  assert(syntax.status === 0, 'Verifier syntax check failed: ' + syntax.stderr);
  const whitespaceFiles = ['tests/watercycle_journey_chapters.test.js', 'tests/watercycle_journey_controls.test.js', ...summary.artifacts.filter(item => /\.(md|cjs|json)$/.test(item.path) && !/baseline|diagnostic|preflight-runtime|unit-results|regression-results/.test(item.path)).map(item => item.path)];
  for (const file of whitespaceFiles) assert(!/[\t ]+$/m.test(read(file).toString('utf8').replace(/\r\n/g, '\n')), 'Trailing whitespace: ' + file);
  const source = read(summary.sourcePath).toString('utf8');
  const api = verificationExport(read('tests/watercycle_journey_chapters.test.js').toString('utf8'));
  const chapterNames = ['WCJourneyChapters', 'focusWcJourneyChapter', 'inspectWcJourneyChapter', 'inspectWcJourneyLandStep', 'followWcJourneyParcel', 'wcJourneyChapterDiagram', 'renderWcJourneyChapters'];
  const nodes = api.productionNodes(source, chapterNames);
  for (const name of chapterNames) assert(nodes[name] && !/[\t ]+$/m.test(nodes[name]), 'Chapter whitespace or anchor: ' + name);
  return { javascriptFiles: javascript.length, whitespaceFiles: whitespaceFiles.length, chapterScopes: chapterNames.length };
});
check('Scoped Git whitespace in the worktree, index and matching final commit', () => {
  const scopes = [...new Set([...summary.artifacts.map(item => item.path),
    'reports/watercycle-journey-chapters/artifact-summary.json',
    'reports/watercycle-journey-chapters/verification-summary.json',
    'docs/water-cycle-visual-design.md', 'reports/watercycle-check-investigations/README.md'])];
  const excluded = ['baseline-runtime.js', 'tested-runtime.js', 'preflight-runtime.js']
    .map(file => 'reports/watercycle-journey-chapters/' + file);
  const paths = [...scopes, ...excluded.map(file => ':(exclude)' + file)];
  const options = { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 };
  const headSource = spawnSync('git', ['show', 'HEAD:' + summary.sourcePath], options);
  assert(headSource.status === 0, 'Could not inspect committed source: ' + headSource.stderr);
  const headMatchesFinal = sha(headSource.stdout.replace(/\r\n/g, '\n')) === sha(read(summary.sourcePath).toString('utf8').replace(/\r\n/g, '\n'));
  const commands = [['diff', '--check', '--', ...paths], ['diff', '--cached', '--check', '--', ...paths]];
  if (headMatchesFinal) commands.push(['diff', '--check', 'HEAD^', 'HEAD', '--', ...paths]);
  for (const argv of commands) {
    const run = spawnSync('git', argv, options);
    assert(run.status === 0, 'Scoped Git whitespace failed: ' + (run.stdout || '') + (run.stderr || ''));
  }
  return { scopes, archivedByteFixturesExcluded: excluded, headMatchesFinal, commands };
});
const result = { sourceSha256: summary.sourceSha256, baselineSha256: summary.baselineSha256,
  artifactSummarySha256: sha(fs.readFileSync(path.join(reportDir, 'artifact-summary.json'))),
  checkedAt: new Date().toISOString(), completed: true, successful: checks.every(item => item.pass),
  passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks };
fs.writeFileSync(path.join(reportDir, 'verification-summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ successful: result.successful, passed: result.passed, failed: result.failed,
  failures: checks.filter(item => !item.pass) }, null, 2));
if (!result.successful) process.exitCode = 1;
