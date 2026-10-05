const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const expectedSource = '3424b78369802606dd709faf9c308c1d444b0d18633c69062a7e7486e5614453';
const expectedScript = '3256297e1a9b898e210facc11ec4db2e071513bfa4b95a165660155785d5d56f';
const expectedCounts = {
  'tests/circuit_investigation_handoff.test.js': 12,
  'tests/circuit_lesson_continuation.test.js': 23,
  'tests/circuit_lesson_journey.test.js': 27,
  'tests/circuit_guided_entry.test.js': 26,
  'tests/circuit_investigation.test.js': 25,
  'tests/circuit_lesson_writing_space.test.js': 19,
  'tests/circuit_active_lesson_records.test.js': 20,
  'tests/circuit_prediction_guide.test.js': 12,
  'tests/circuit_localization.test.js': 4,
  'tests/circuit_form_labels_a11y.test.js': 4
};
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const hash = file => digest(fs.readFileSync(file));
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const relative = file => path.relative(root, file).replace(/\\/g, '/');
const sourceText = fs.readFileSync(path.join(root, source), 'utf8');
assert.equal(hash(path.join(root, source)), expectedSource);
assert.equal(hash(path.join(root, mirror)), expectedSource);
new vm.Script(sourceText);

const preservation = read('source-preservation.json');
assert.equal(preservation.passed, true);
assert.equal(preservation.sourceSha256, expectedSource);
assert.equal(preservation.mirrorSha256, expectedSource);
assert.equal(preservation.beforeSha256, '6478b21accc3061b34a7328507d83bffec5d7de7d4786565e300e1ddb7d7a4ba');
assert.equal(preservation.changes.length, 9);
let reversed = sourceText.replace(/\r\n/g, '\n');
for (const change of preservation.changes) {
  assert.equal(reversed.split(change.after).length, 2, 'Unique change reversal');
  reversed = reversed.replace(change.after, change.before);
}
assert.equal(digest(reversed), '12c7d24673228e4c3164c68ae9137d712576f8656a9a883c598f8b71c160ca52');
assert.equal(digest(reversed), preservation.canonicalBeforeSha256);

assert.equal(hash(path.join(__dirname, 'independent-review.json')), '160c1789e6a0052897071ba0aadac5563dca2d2eb39ec51f6462ad80dd8ed565');
const correction = read('continuation-helper-correction.json');
const before = fs.readFileSync(path.join(__dirname, correction.before), 'utf8');
const after = fs.readFileSync(path.join(__dirname, correction.after), 'utf8');
assert.equal(digest(before), 'e122e552c4447c08436f7938e4d049d48c3b0e5dd21487b46305b600a1b5060f');
assert.equal(digest(after), 'f1523b68ae96d748524ccba6b057c6719e568902885423f8c550a008ee1a1b7d');
assert.equal(before.split(correction.beforeSelector).length, 2);
assert.equal(before.replace(correction.beforeSelector, correction.afterSelector), after);
assert.equal(fs.readFileSync(path.join(root, correction.test), 'utf8'), after);
assert.equal(correction.assertionsUnchanged, true);

const regression = read('regression.json'), receipt = read('regression-receipt.json');
assert.equal(regression.success, true);
assert.equal(regression.numTotalTests, 172);
assert.equal(regression.numPassedTests, 172);
assert.equal(regression.numFailedTests, 0);
assert.equal(regression.numPendingTests || 0, 0);
assert.equal(regression.testResults.length, 10);
assert.equal(receipt.exitCode, 0);
assert.equal(receipt.mode, 'mixed-isolated-processes-and-grouped-isolated-environments');
assert.deepEqual(receipt.expectedCounts, expectedCounts);
assert.equal(receipt.attempts.length, 3);
assert.deepEqual(receipt.changedDuringRun, []);
assert.deepEqual(receipt.filesAtEnd, receipt.files);
assert.equal(hash(path.join(__dirname, 'run-regression.cjs')), '904f43bab62d11ff5121a0b7a7b6e76806d8bc96cd85bd87bb455a2c48783146');
assert.equal(hash(path.join(__dirname, 'run-regression-grouped.cjs')), 'd2135020814a55036fa667c1b75b9c0eb4538c66e2e9aa8315ed7bf49cfad536');
assert.equal(receipt.reportSha256, hash(path.join(__dirname, 'regression.json')));
assert.equal(hash(path.join(root, 'tests/circuit_investigation_handoff.test.js')), 'adce18c843924d0a249a291dd1bb9457a25ac3babdc55179a8ff2c89cc208f8d');
for (const [file, expected] of Object.entries(receipt.files)) assert.equal(hash(path.join(root, file)), expected, 'Tested file changed: ' + file);
assert.deepEqual(Object.keys(receipt.files).filter(file => file.startsWith('tests/')).sort(), Object.keys(expectedCounts).sort());
const assertions = [];
for (const [index, attempt] of receipt.attempts.entries()) {
  assert.equal(attempt.exitCode, 0); assert.equal(attempt.signal, null); assert.equal(attempt.processError, null);
  assert.deepEqual(attempt.filesAtEnd, attempt.files);
  assert.deepEqual(attempt.changedDuringRun, []);
  assert.equal(attempt.files[source], expectedSource); assert.equal(attempt.files[mirror], expectedSource);
  for (const file of Object.keys(expectedCounts)) assert.equal(attempt.files[file], hash(path.join(root,file)));
  for (const flag of ['--pool=threads', '--maxWorkers=1', '--testTimeout=30000', '--hookTimeout=60000']) assert.ok(attempt.command.includes(flag));
  if(index === 2) assert.ok(attempt.command.includes('--isolate'));
  for (const kind of ['report', 'stdout', 'stderr']) {
    assert.equal(path.basename(attempt[kind]), attempt[kind]);
    assert.equal(hash(path.join(__dirname, attempt[kind])), attempt[kind + 'Sha256']);
  }
  const raw = read(attempt.report);
  assert.equal(raw.success, true); assert.equal(raw.numFailedTests, 0);
  assert.equal(raw.numPendingTests || 0, 0); assert.equal(raw.numTodoTests || 0, 0);
  assert.equal(raw.testResults.length, index === 2 ? 8 : 1);
  assert.deepEqual(attempt.command.filter(argument => argument.startsWith('tests/')).sort(),raw.testResults.map(file=>relative(file.name)).sort());
  const expected = raw.testResults.reduce((count,file)=>count+expectedCounts[relative(file.name)],0);
  assert.equal(raw.numTotalTests, expected); assert.equal(raw.numPassedTests, expected);
  for (const file of raw.testResults) {
    const name = relative(file.name);
    assert.equal(file.status, 'passed');
    assert.equal(file.assertionResults.length, expectedCounts[name]);
    assert.ok(file.assertionResults.every(test => test.status === 'passed'));
    assert.equal(new Set(file.assertionResults.map(test => test.fullName)).size, file.assertionResults.length);
    assertions.push({ file: name, count: file.assertionResults.length, fullNames: file.assertionResults.map(test => test.fullName) });
  }
}
assert.deepEqual(assertions.map(row => row.file).sort(), Object.keys(expectedCounts).sort());
assert.equal(assertions.reduce((count, row) => count + row.count, 0), 172);
assert.deepEqual(assertions.slice().sort((a,b) => a.file.localeCompare(b.file)), receipt.assertionCoverage.slice().sort((a,b)=>a.file.localeCompare(b.file)));
assert.equal(receipt.priorStartupAttempts.length,3);
assert.deepEqual(receipt.priorStartupAttempts.map(attempt=>attempt.path).sort(),['initial-startup-attempt','retry-startup-attempt','threads-startup-attempt'].sort());
for(const archive of receipt.priorStartupAttempts){
  assert.deepEqual(fs.readdirSync(path.join(__dirname,archive.path)).sort(),archive.files.map(file=>path.basename(file.path)).sort());
  for(const file of archive.files){ assert.ok(file.path.startsWith(archive.path+'/')); assert.equal(hash(path.join(__dirname,file.path)),file.sha256); }
  const rawName=archive.path==='threads-startup-attempt'?'regression-file-03-circuit_lesson_journey.json':'regression-file-01-circuit_investigation_handoff.json';
  const failed=read(archive.path+'/'+rawName);
  assert.equal(failed.numTotalTests,0);assert.equal(failed.numPassedTests,0);assert.equal(failed.numFailedTests,0);
  assert.equal(failed.testResults.length,0);assert.equal(failed.success,false);
  const stem=rawName.slice(0,-5), failedReceipt=read(archive.path+'/'+stem+'-receipt.json');
  assert.equal(failedReceipt.exitCode,1); assert.equal(failedReceipt.files[source],expectedSource); assert.equal(failedReceipt.files[mirror],expectedSource);
  for(const kind of ['report','stdout','stderr']) assert.equal(hash(path.join(__dirname,archive.path,failedReceipt[kind])),failedReceipt[kind+'Sha256']);
  assert.match(fs.readFileSync(path.join(__dirname,archive.path,stem+'-stderr.log'),'utf8'),/Timeout waiting for worker to respond/);
}
assert.equal(hash(path.join(__dirname,receipt.workerStrategy.path)),receipt.workerStrategy.sha256);
const strategy=read(receipt.workerStrategy.path);
assert.equal(strategy.retainedIndividualFiles,2); assert.equal(strategy.retainedIndividualAssertions,35);
assert.equal(strategy.groupedFiles,8); assert.equal(strategy.groupedAssertions,137);
assert.equal(strategy.totalAssertions,172); assert.equal(strategy.pool,'threads'); assert.equal(strategy.maxWorkers,1); assert.equal(strategy.isolate,true);
assert.equal(strategy.testTimeout,30000); assert.equal(strategy.hookTimeout,60000);
assert.equal(hash(path.join(root,strategy.cliEvidence.path)),strategy.cliEvidence.sha256);
assert.equal(strategy.cliEvidence.sha256,'23d05ff50f3e0617575a8af46a9dd5ed106bbcd90109da702e3addc620b07ecd');

const browser = read('browser-results.json');
assert.equal(browser.sourceSha256, expectedSource);
assert.equal(browser.scriptSha256, expectedScript);
assert.equal(hash(path.join(__dirname, 'browser-check.cjs')), expectedScript);
assert.deepEqual(browser.errors, []);
for (const key of ['axe', 'layouts', 'contentBounds', 'actions', 'nodeIds', 'screenshots']) assert.equal(browser[key].length, 12, key);
assert.equal(browser.handoffStates.length, 10);
assert.equal(browser.notebookStates.length, 2);
assert.equal(browser.focus.length, 22);
assert.equal(browser.openActions.length, 6);
assert.equal(browser.transitions.length, 1);
assert.equal(browser.lifecycle.length, 2);
assert.equal(browser.instances.length, 1);
assert.equal(browser.readingOrder.length, 1);
assert.equal(browser.textResize.length, 1);
assert.equal(browser.forcedColors.length, 1);
assert.equal(browser.checks.length, 1);
assert.equal(browser.motion.length, 1);
for (const scan of browser.axe) assert.deepEqual(scan.violations, []);
for (const row of browser.handoffStates) {
  assert.equal(row.mode, 'all-tested');
  assert.deepEqual(row.steps.map(step => step.id), ['choose', 'compare']);
  assert.deepEqual(row.steps.map(step => step.number), ['1', '2']);
  assert.ok(row.steps.every(step => step.numberHidden));
  assert.deepEqual(row.actions.map(action => action.text), ['Plan my own investigation', 'Review experiment map']);
  assert.ok(row.actions.every(action => action.disabled === false));
}
for (const action of browser.openActions) {
  assert.equal(action.onlyNotebookOpenChanged, true);
  assert.equal(action.summaryFocused, true);
  assert.ok(action.navigation.length > 0);
  for (const navigation of action.navigation) {
    assert.equal(navigation.owner, action.owner);
    assert.equal(navigation.notebook, true);
    assert.deepEqual(navigation.options, {block:'start', behavior:'instant'});
  }
  assert.equal(action.focus.owner, action.owner);
  assert.deepEqual(action.focus.options, {preventScroll:true});
}
const transition = browser.transitions[0];
for (const key of ['blankWritingAllowed','wrongPredictionsAllowed','allThreeTested','emptyNotebookRetained']) assert.equal(transition[key], true);
assert.equal(transition.rows, 12);
for (const row of browser.lifecycle) assert.equal(row.noAutomaticNavigation, true);
assert.equal(browser.instances[0].count, 2);
assert.equal(browser.instances[0].bothSecondOpenersFocusSecond, true);
assert.equal(browser.instances[0].firstToolUnchanged, true);
assert.equal(browser.readingOrder[0].actualViewportWidth, 320);
assert.equal(browser.readingOrder[0].direction, 'rtl');
assert.deepEqual(browser.readingOrder[0].stepOrder, ['choose','compare']);
for (const row of browser.forcedColors) {
  assert.deepEqual(row.violations, []);
  assert.ok(row.colors.length > 0);
  for (const color of row.colors) assert.ok(color.ratio >= color.required);
}

assert.equal(browser.passed,true);
assert.deepEqual(browser.visualIssues,[]);
assert.equal(browser.sourceSha256AtEnd,expectedSource);
assert.equal(browser.mirrorSha256AtEnd,expectedSource);
assert.equal(browser.scriptSha256AtEnd,expectedScript);
assert.equal(browser.sourceChangedDuringRun,false);
assert.equal(browser.scriptChangedDuringRun,false);
assert.equal(browser.mirrorMatches,true);
for(const scan of browser.axe){
  assert.deepEqual(scan.excludedRules,scan.forcedColors?['color-contrast']:[]);
  if(scan.forcedColors)assert.match(scan.exclusionReason,/axe 4\.12\.1/);
}
for(const row of browser.layouts)assert.ok(row.scrollWidth<=row.width+1);
for(const row of browser.nodeIds)assert.deepEqual(row.duplicates,[]);
for(const row of browser.contentBounds)for(const card of row.cards){assert.deepEqual(card.violations,[]);assert.ok(card.scrollWidth<=card.clientWidth+1);}
for(const row of browser.actions)for(const action of row.actions){assert.ok(action.width>=43.9);assert.ok(action.height>=43.9);}
for(const row of browser.focus)assert.equal(row.visible,true);
for(const row of browser.textResize){
  assert.equal(row.scale,2);assert.equal(row.baselineViewportWidth,320);assert.equal(row.fonts.length,row.elements);
  for(const font of row.fonts){assert.equal(font.beforeFontSize,font.normalFontSize);assert.equal(font.afterFontSize,font.normalFontSize*2);assert.equal(font.ratio,2);}
}
for(const row of browser.notebookStates)assert.equal(row.open,true);
assert.equal(browser.checks[0].wholeDataUnchanged,true);
assert.equal(browser.motion[0].reduced,true);assert.equal(browser.motion[0].animations,0);

const browserArchive=read('initial-attempt/archive-receipt.json');
for(const file of browserArchive.files){assert.equal(hash(path.join(__dirname,'initial-attempt',file.file)),file.sha256);}
const harnessCorrection=read('harness-correction.json');
assert.equal(harnessCorrection.beforeSha256,'436a6afaeead657122e28d773ba7c0bc6a091ab7fd16e513054c02d4980a3d8d');
assert.equal(harnessCorrection.afterSha256,expectedScript);
assert.equal(harnessCorrection.occurrences,2);assert.equal(harnessCorrection.unchangedExceptSelectors,true);

const expectedPNGs = ['investigation-handoff-gain-1280.png','investigation-handoff-gain-320.png','investigation-handoff-limit-1280.png','investigation-handoff-limit-320.png','investigation-handoff-sensor-1280.png','investigation-handoff-sensor-320.png','investigation-handoff-gain-390.png','investigation-handoff-200pct-text-320.png','forced-colors-investigation-handoff-320.png','rtl-investigation-handoff-320.png','handoff-populated-notebook-390.png','handoff-full-notebook-320.png'];
const visual = read('visual-review.json');
assert.equal(visual.passed, true);
assert.equal(visual.sourceSha256, expectedSource);
assert.equal(visual.scriptSha256, expectedScript);
for (const name of expectedPNGs) {
  const bytes = fs.readFileSync(path.join(__dirname, name));
  assert.equal(bytes.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(digest(bytes), visual.screenshotSha256[name], name);
}
assert.equal(visual.screenshotsReviewedByCircuitUI, 12);
assert.ok(visual.rootInspected.length >= 5);

for (const file of fs.readdirSync(__dirname).filter(file => /\.(?:md|cjs|js|json|txt|log)$/.test(file))) {
  const text = fs.readFileSync(path.join(__dirname,file),'utf8');
  assert.ok(!text.includes('\uFFFD'), 'Invalid UTF-8: ' + file);
}
const diff = spawnSync('git',['diff','--check','--',source,mirror,'tests/circuit_investigation_handoff.test.js','tests/circuit_lesson_continuation.test.js'], {cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});
assert.equal(diff.status, 0, diff.stdout + diff.stderr);
const result = {passed:true,sourceSha256:expectedSource,mirrorSha256:expectedSource,canonicalPriorSourcePreserved:true,independentSourceReview:true,existingAssertionsPreserved:true,regression:{tests:172,files:10},browser:{views:12,focus:22,openActions:6,lastTestTransitions:1,lifecycle:2,instances:2,rtlWidth:320},screenshots:{reviewedByCircuitUI:12,rootInspected:visual.rootInspected},gitDiffCheck:true,artifacts:{regressionSha256:hash(path.join(__dirname,'regression.json')),regressionReceiptSha256:hash(path.join(__dirname,'regression-receipt.json')),browserResultsSha256:hash(path.join(__dirname,'browser-results.json')),visualReviewSha256:hash(path.join(__dirname,'visual-review.json')),validatorSha256:hash(__filename)}};
fs.writeFileSync(path.join(__dirname,'validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));

