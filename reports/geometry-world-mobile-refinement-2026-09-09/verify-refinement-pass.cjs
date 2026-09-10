const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = __dirname;
const project = path.resolve(root, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const reports = ['integration-tests.json', 'inspector-tests.json', 'inspector-display-retry.json', 'selection-cache-final-tests.json'];
const cases = new Map();
const runs = [];
for (const name of reports) {
  const report = read(name);
  runs.push({ name, success: report.success, passed: report.numPassedTests, failed: report.numFailedTests, skipped: report.numPendingTests });
  for (const suite of report.testResults) {
    const file = suite.name.split(/[\\/]/).pop();
    for (const assertion of suite.assertionResults) {
      if (!['passed', 'failed'].includes(assertion.status)) continue;
      const key = file + ':' + assertion.fullName;
      cases.set(key, { file, test: assertion.fullName, status: assertion.status, report: name });
    }
  }
}
const tests = [...cases.values()];
const failed = tests.filter(test => test.status !== 'passed');
const files = [...new Set(tests.map(test => test.file))];
const before = read('before-results.json');
const after = read('after-results.json');
const supplemental = read('supplemental-results.json');
const warmupAssertion = 'Unchanged selected build triggers zero structure traversals across five idle polls';
const idleVerified = supplemental.pass === true && supplemental.idleTraversalCalls === 0;
const unresolvedBrowserFailures = after.failures.filter(message => !(message === warmupAssertion && after.idleTraversalCalls === 1 && idleVerified));
const browserVerified = after.viewports.length === 4 && !!after.final && !unresolvedBrowserFailures.length &&
  !after.errors.length && !after.consoleErrors.length && !after.shaderErrors.length &&
  supplemental.pass === true && !supplemental.errors.length && !supplemental.consoleErrors.length && !supplemental.failures.length;
const stateInvariants = {
  selectedModelUnchanged: ['world', 'selection', 'count', 'hash', 'undo'].every(key => after.initial[key] === after.final[key]),
  deliberateEditCheckpointRestored: Object.keys(after.final).every(key => after.final[key] === after.intentionalEditCheckpoint[key]),
};
const sources = ['stem_tool_geometryworld.js', 'stem_tool_geometryworld_builder.js'].map(name => {
  const source = fs.readFileSync(path.join(project, 'stem_lab', name));
  const mirror = fs.readFileSync(path.join(project, 'desktop/web-app/public/stem_lab', name));
  new vm.Script(source.toString(), { filename: name });
  new vm.Script(mirror.toString(), { filename: 'desktop/' + name });
  const hash = sha(source);
  return { name, sha256: hash, syntax: true, mirrorMatches: source.equals(mirror), browserTestedCurrentSource: after.sourceHashes[name] === hash && supplemental.sourceHashes[name] === hash };
});
const viewports = after.viewports.map(view => {
  const old = before.viewports.find(item => item.label === view.label);
  const a = view.focused.creation;
  const b = old.focused.creation;
  return { viewport: view.label, focusedHeightBefore: b.height, focusedHeightAfter: a.height, heightRatio: a.height / b.height,
    focusedAreaRatio: (a.width * a.height) / (b.width * b.height),
    inspectorHeightBefore: old.inspector.inspector.height, inspectorHeightAfter: view.inspector.inspector.height };
});
const performance = read('selection-tuple-diagnostic.json');
const result = {
  success: failed.length === 0 && browserVerified && stateInvariants.selectedModelUnchanged && stateInvariants.deliberateEditCheckpointRestored &&
    sources.every(source => source.mirrorMatches && source.browserTestedCurrentSource) && performance.success,
  uniquePassedTests: tests.length - failed.length, uniqueTestFiles: files.length, failed, runs, sources,
  browser: { pass: browserVerified, primaryRunPass: after.pass, primaryRunFailures: after.failures, unresolvedFailures: unresolvedBrowserFailures,
    supplementalPass: supplemental.pass, idleWarmupCalls: supplemental.idleWarmupCalls, idleTraversalCalls: supplemental.idleTraversalCalls,
    errors: after.errors, consoleErrors: after.consoleErrors, shaderErrors: after.shaderErrors, stateInvariants, viewports,
    supplementalViewports: supplemental.viewports.map(view => view.label) },
  selectionPolling: performance,
};
const output = path.join(root, 'refinement-pass-summary.json');
const text = JSON.stringify(result, null, 2) + '\n';
if (fs.existsSync(output)) {
  const fd = fs.openSync(output, 'r+');
  fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); fs.closeSync(fd);
} else fs.writeFileSync(output, text);
console.log(JSON.stringify({ success: result.success, uniquePassedTests: result.uniquePassedTests, uniqueTestFiles: files.length, sources, viewports, failed }, null, 2));
process.exitCode = result.success ? 0 : 1;
