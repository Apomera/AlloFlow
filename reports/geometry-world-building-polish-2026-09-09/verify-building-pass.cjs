const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const directory = __dirname, project = path.resolve(directory, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const normalize = value => value.toString().replace(/\r\n/g, '\n');
const testNames = ['building-regression-tests.json', 'empty-guidance-tests.json', 'accurate-preview-tests.json', 'shape-controls-tests.json', 'return-feedback-tests.json'];
const tests = new Map();
const runs = testNames.map(name => {
  const report = read(name);
  for (const file of report.testResults) for (const result of file.assertionResults) {
    tests.set(file.name + ':' + result.fullName, { file: path.basename(file.name), name: result.fullName, status: result.status });
  }
  return { name, success: report.success, passed: report.numPassedTests, failed: report.numFailedTests, failedSuites: report.numFailedTestSuites };
});
const full = read('after-results.json'), controls = read('supplemental-results.json'), final = read('return-results.json');
// The first browser review caught these issues. Its evidence is retained as-is;
// the final-source follow-up must pass each corrected control/clearance check.
const expectedInitialIssues = [1440, 390, 320].flatMap(width => [
  'Native rotate Space activates exactly once at ' + width,
  'Native rotate Enter activates exactly once at ' + width,
  'Visible feedback includes the current angle at ' + width,
  'Rotation cue is readable in-bounds without covering controls at ' + width,
]);
function beforeFinalCorrections(value) {
  let source = normalize(value);
  function replace(before, after = '') {
    if (!source.includes(before) || source.indexOf(before) !== source.lastIndexOf(before)) throw Error('Nonunique correction: ' + before.slice(0, 80));
    source = source.replace(before, after);
  }
  replace(`        // Older ruler/measurement timers must not dismiss a newer shape cue.
        // Its own expiry and cleanup release ownership before clearing it.
        if (key === 'actionFeedback' && val === '' && shapeActionRef && shapeActionRef.current.timer &&
          shapeActionRef.current.feedback === shapeActionRef.current.shapeFeedback) return;
`);
  replace(`        return function() {
          var ownedCue = shapeActionRef.current;
          if (ownedCue.timer) {
            clearTimeout(ownedCue.timer); ownedCue.timer = null;
            if (ownedCue.feedback === ownedCue.shapeFeedback) upd('actionFeedback', '');
          }
        };`, '        return function() { if (shapeActionRef.current.timer) clearTimeout(shapeActionRef.current.timer); };');
  replace('        shapeActionRef.current.shapeFeedback = feedback;\n');
  replace(`              // Space belongs to focused controls; their native click fires on keyup.
              if (ev.target && ev.target.closest && ev.target.closest('button,select,[role="button"],a[href]')) break;
`);
  replace("          'data-feedback-kind': actionFeedback === shapeActionRef.current.shapeFeedback ? 'shape' : 'action',\n");
  const rules = source.split('\n').filter(line => line.includes('.gw-action-feedback[data-feedback-kind='));
  if (rules.length !== 1) throw Error('Expected one scoped shape cue rule');
  replace(rules[0] + '\n');
  return source;
}
function beforeReturnCorrection(value) {
  return normalize(value)
    .replace("state:Object.assign(copyLocal(ctx.toolData && ctx.toolData.geometryWorld || {}), { actionFeedback:'' }),", "state:copyLocal(ctx.toolData && ctx.toolData.geometryWorld || {}),")
    .replace("Object.assign({}, saved.state, { worldActive:true, showLessonIntro:false, actionFeedback:'',", "Object.assign({}, saved.state, { worldActive:true, showLessonIntro:false,");
}
const sources = ['stem_tool_geometryworld.js', 'stem_tool_geometryworld_builder.js', 'stem_tool_printlab.js'].map(name => {
  const source = fs.readFileSync(path.join(project, 'stem_lab', name));
  const mirror = fs.readFileSync(path.join(project, 'desktop/web-app/public/stem_lab', name));
  new vm.Script(source.toString(), { filename: name });
  new vm.Script(mirror.toString(), { filename: 'desktop/' + name });
  const fullSnapshot = fs.readFileSync(path.join(directory, 'after-source', name));
  const original = name === 'stem_tool_geometryworld.js' ? beforeFinalCorrections(source) : name === 'stem_tool_geometryworld_builder.js' ? beforeReturnCorrection(source) : normalize(source);
  const controlsSnapshot = fs.readFileSync(path.join(directory, 'supplemental-source', name));
  const controlsOriginal = name === 'stem_tool_geometryworld_builder.js' ? beforeReturnCorrection(source) : normalize(source);
  return { name, sha256: hash(source), syntax: true, mirrorMatches: source.equals(mirror), finalBrowserMatches: final.sources[name] === hash(source),
    fullSnapshotMatchesReport: hash(fullSnapshot) === full.sources[name], controlsSnapshotMatchesReport: hash(controlsSnapshot) === controls.sources[name], controlsSourceDiffIsOnlyReturnCorrection: controlsOriginal === normalize(controlsSnapshot), fullSourceDiffIsOnlyVerifiedCorrections: original === normalize(fullSnapshot) };
});
const statuses = [...tests.values()], failures = statuses.filter(test => test.status !== 'passed');
const firstBrowserIssuesFullyAccountedFor = JSON.stringify([...full.failures].sort()) === JSON.stringify(expectedInitialIssues.sort());
const fullPreviewPass = full.cases.length === 6 && full.cases.every(row => row.visual.ghostError === 0 && row.visual.hoverError === 0 && row.visual.outlineError === 0);
const previewsPreserveSource = JSON.stringify(full.initial) === JSON.stringify(full.afterPreviews);
const deniedPlacementPreservesSource = JSON.stringify(full.blocked.before) === JSON.stringify(full.blocked.after);
const controlsPass = JSON.stringify(controls.failures) === JSON.stringify(['Returning from Print Lab does not resurrect a stale shape cue']) && !controls.failure && !controls.errors.length && !controls.consoleErrors.length && !(controls.shaderErrors || []).length;
const finalBrowserPass = final.pass === true && !final.failure && !final.failures.length && !final.errors.length && !final.consoleErrors.length && !(final.shaderErrors || []).length;
const summary = {
  success: runs.every(run => run.success && !run.failed && !run.failedSuites) && !failures.length && sources.every(source => source.mirrorMatches && source.finalBrowserMatches && source.fullSnapshotMatchesReport && source.fullSourceDiffIsOnlyVerifiedCorrections && source.controlsSnapshotMatchesReport && source.controlsSourceDiffIsOnlyReturnCorrection) &&
    firstBrowserIssuesFullyAccountedFor && fullPreviewPass && previewsPreserveSource && deniedPlacementPreservesSource && !full.failure && !full.errors.length && !full.consoleErrors.length && !(full.shaderErrors || []).length && controlsPass && finalBrowserPass,
  uniquePassedTests: statuses.length - failures.length, uniqueTestFiles: new Set(statuses.map(test => test.file)).size,
  failures, runs, sources,
  browser: { firstBrowserIssuesFullyAccountedFor, firstBrowserIssues: full.failures, fullPreviewPass, previewsPreserveSource, deniedPlacementPreservesSource,
    controlsPass, controlsInitialIssues: controls.failures, finalBrowserPass, finalFailures: final.failures, finalErrors: final.errors, finalPreview: final.finalPreview && { ghostError: final.finalPreview.ghostError, hoverError: final.finalPreview.hoverError, outlineError: final.finalPreview.outlineError },
    viewports: controls.shapeActions.map(row => row.size), cueBeforeUnmount: final.cueBeforeUnmount, cueAfterUnmount: final.cueAfterUnmount, cueAfterReturn: final.cueAfterReturn },
};
const output = path.join(directory, 'building-pass-summary.json'), text = JSON.stringify(summary, null, 2) + '\n';
if (fs.existsSync(output)) { const fd = fs.openSync(output, 'r+'); fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); fs.closeSync(fd); }
else fs.writeFileSync(output, text);
console.log(JSON.stringify(summary, null, 2));
process.exitCode = summary.success ? 0 : 1;
