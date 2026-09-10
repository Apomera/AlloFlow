const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const directory = __dirname;
const project = path.resolve(directory, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const reportNames = ['measurement-interior-tests.json', 'print-presentation-tests.json', 'selection-frame-final-tests.json', 'presentation-regression-tests.json', 'inspector-overlap-tests.json'];
const tests = new Map();
const runs = reportNames.map(name => {
  const report = read(name);
  for (const file of report.testResults) {
    for (const assertion of file.assertionResults) tests.set(file.name + ':' + assertion.fullName, { file: path.basename(file.name), name: assertion.fullName, status: assertion.status });
  }
  return { name, success: report.success, passed: report.numPassedTests, failed: report.numFailedTests, failedSuites: report.numFailedTestSuites };
});
const results = [...tests.values()];
const after = read('after-results.json');
const supplemental = read('supplemental-results.json');
const overlapAttribute = "'data-measurement-expanded': isMobile && !!measureResult && measurementDetailsOpen ? 'true' : 'false', ";
const overlapStyle = '#geoworld-fs-workspace[data-builder-panel="measure"][data-measurement-expanded="true"] .gwe-builder-dock[data-collapsed="true"]{visibility:hidden;pointer-events:none}';
const sources = ['stem_tool_geometryworld.js', 'stem_tool_geometryworld_builder.js', 'stem_tool_printlab.js'].map(name => {
  const source = fs.readFileSync(path.join(project, 'stem_lab', name));
  const mirror = fs.readFileSync(path.join(project, 'desktop/web-app/public/stem_lab', name));
  new vm.Script(source.toString(), { filename: name });
  new vm.Script(mirror.toString(), { filename: 'desktop/' + name });
  let fullRunSource = source.toString();
  if (name === 'stem_tool_geometryworld.js') fullRunSource = fullRunSource.replace(overlapAttribute, '');
  if (name === 'stem_tool_geometryworld_builder.js') fullRunSource = fullRunSource.replace('      ,' + JSON.stringify(overlapStyle) + '\n', '');
  const fullRunSourceMatchesExceptOverlapFix = hash(fullRunSource) === after.sources[name];
  return { name, sha256: hash(source), syntax: true, mirrorMatches: source.equals(mirror), fullRunSourceMatchesExceptOverlapFix,
    browserTestedCurrentSource: supplemental.sources[name] === hash(source) && fullRunSourceMatchesExceptOverlapFix };
});
const failures = results.filter(test => test.status !== 'passed');
const summary = {
  success: runs.every(run => run.success && !run.failed && !run.failedSuites) && !failures.length && after.pass === true &&
    !after.errors.length && !after.consoleErrors.length && !after.failures.length && supplemental.pass === true && !supplemental.errors.length && !supplemental.consoleErrors.length && !supplemental.failures.length && sources.every(source => source.mirrorMatches && source.browserTestedCurrentSource),
  uniquePassedTests: results.length - failures.length, uniqueTestFiles: new Set(results.map(test => test.file)).size,
  failures, runs, sources,
  browser: { pass: after.pass, errors: after.errors, consoleErrors: after.consoleErrors, failures: after.failures, shaderErrors: after.shaderErrors || [],
    supplementalPass: supplemental.pass, supplementalFailures: supplemental.failures, supplementalErrors: supplemental.errors,
    supplementalStlUnchanged: supplemental.initial.hash === supplemental.final.hash,
    supplementalWorldUnchanged: supplemental.initial.world === supplemental.final.world,
    supplementalHistoryUnchanged: supplemental.initial.undo === supplemental.final.undo && supplemental.initial.redo === supplemental.final.redo,
    fixture: after.fixture, selectedStlUnchanged: after.initial.hash === after.final.hash,
    worldUnchanged: after.initial.world === after.final.world, historyUnchanged: after.initial.undo === after.final.undo && after.initial.redo === after.final.redo },
};
summary.success = summary.success && !summary.browser.shaderErrors.length && summary.browser.selectedStlUnchanged && summary.browser.worldUnchanged && summary.browser.historyUnchanged && summary.browser.supplementalStlUnchanged && summary.browser.supplementalWorldUnchanged && summary.browser.supplementalHistoryUnchanged;
const output = path.join(directory, 'polish-pass-summary.json');
const text = JSON.stringify(summary, null, 2) + '\n';
if (fs.existsSync(output)) {
  const fd = fs.openSync(output, 'r+'); fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); fs.closeSync(fd);
} else fs.writeFileSync(output, text);
console.log(JSON.stringify(summary, null, 2));
process.exitCode = summary.success ? 0 : 1;
