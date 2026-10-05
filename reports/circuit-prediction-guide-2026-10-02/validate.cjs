const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const expectedSource = '6478b21accc3061b34a7328507d83bffec5d7de7d4786565e300e1ddb7d7a4ba';
const expectedCounts = {
  'tests/circuit_prediction_guide.test.js': 12,
  'tests/circuit_explanation_guide.test.js': 20,
  'tests/circuit_prediction_reasoning.test.js': 15,
  'tests/circuit_lesson_journey.test.js': 27,
  'tests/circuit_active_lesson_records.test.js': 20,
  'tests/circuit_localization.test.js': 4,
  'tests/circuit_form_labels_a11y.test.js': 4,
  'tests/circuit_lesson_writing_space.test.js': 19
};
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const relative = name => path.relative(root, name).replace(/\\/g, '/');
const sourceHash = hash(path.join(root, source));
assert.equal(sourceHash, expectedSource);
assert.equal(hash(path.join(root, mirror)), sourceHash);
new vm.Script(fs.readFileSync(path.join(root, source), 'utf8'));

const regression = read('regression.json');
const receipt = read('regression-receipt.json');
assert.equal(receipt.exitCode, 0);
assert.equal(receipt.mode, 'isolated-per-file-processes');
assert.equal(receipt.aggregate, true);
assert.equal(receipt.attempts.length, 8);
assert.deepEqual(receipt.changedDuringRun, []);
assert.deepEqual(receipt.filesAtEnd, receipt.files);
assert.equal(receipt.runnerSha256AtEnd, receipt.runnerSha256);
assert.equal(receipt.runnerSha256, hash(path.join(__dirname, 'run-regression.cjs')));
assert.equal(regression.success, true);
assert.equal(regression.numPassedTests, 121);
assert.equal(regression.numFailedTests, 0);
assert.equal(regression.numPendingTests || 0, 0);
assert.equal(regression.testResults.length, 8);
assert.deepEqual(Object.keys(receipt.files).filter(file => file.startsWith('tests/')).sort(), Object.keys(expectedCounts).sort());
for (const [file, expected] of Object.entries(receipt.files)) assert.equal(hash(path.join(root, file)), expected, 'Tested file changed: ' + file);
const completed = [];
for (const attempt of receipt.attempts) {
  assert.equal(attempt.exitCode, 0);
  assert.equal(attempt.runnerSha256AtEnd, receipt.runnerSha256);
  assert.deepEqual(attempt.files, receipt.files);
  assert.deepEqual(attempt.filesAtEnd, attempt.files);
  assert.deepEqual(attempt.changedDuringRun, []);
  for (const flag of ['--pool=forks', '--maxWorkers=1', '--testTimeout=30000', '--hookTimeout=60000']) assert.ok(attempt.command.includes(flag));
  for (const kind of ['report', 'stdout', 'stderr']) {
    assert.equal(path.basename(attempt[kind]), attempt[kind]);
    assert.equal(hash(path.join(__dirname, attempt[kind])), attempt[kind + 'Sha256']);
  }
  const raw = read(attempt.report);
  assert.equal(raw.success, true);
  assert.equal(raw.numFailedTests, 0);
  assert.equal(raw.testResults.length, 1);
  assert.deepEqual(attempt.command.filter(argument => argument.startsWith('tests/')), [relative(raw.testResults[0].name)]);
  for (const file of raw.testResults) {
    assert.equal(file.status, 'passed');
    assert.ok(file.assertionResults.every(test => test.status === 'passed'));
    assert.equal(file.assertionResults.length, expectedCounts[relative(file.name)]);
    completed.push(file);
  }
}
assert.deepEqual(completed.map(file => relative(file.name)).sort(), Object.keys(expectedCounts).sort());
const sorted = rows => rows.slice().sort((a, b) => a.name.localeCompare(b.name));
assert.deepEqual(sorted(regression.testResults), sorted(completed));
assert.equal(receipt.assertionCoverage.length, 8);
for (const proof of receipt.assertionCoverage) {
  const file = completed.find(file => relative(file.name) === proof.file);
  assert.ok(file);
  assert.equal(proof.count, expectedCounts[proof.file]);
  assert.deepEqual(proof.fullNames, file.assertionResults.map(test => test.fullName));
}

const product = fs.readFileSync(path.join(root, source), 'utf8');
const component = fs.readFileSync(path.join(__dirname, 'component-source.txt'), 'utf8');
assert.equal(hash(path.join(__dirname, 'component-source.txt')), '810e0f2ed7fcb0fa3109c9f2f4ea453538766e9eb6e2f394e29bb3b36b37ff31');
assert.equal(product.split(component).length, 2);
let previous = product.replace(component, '');
const newCall = "      !tested&&h(CircuitActiveLessonPredictionGuide,{React:React,t:props.t,lessonId:selected}),\r\n";
assert.equal(previous.split(newCall).length, 2);
previous = previous.replace(newCall, '');
let removedSelectors = 0;
previous = previous.replace(/^[ \t]*\.circuit-active-root details\.circuit-active-prediction-guide[^\r\n]*\r?\n/gm, () => { removedSelectors++; return ''; });
assert.equal(removedSelectors, 5);
const previousSourceSha256 = crypto.createHash('sha256').update(previous).digest('hex');
assert.equal(previousSourceSha256, 'b207d09a0e834d5abeae5fba88f8303e3e457189ba58088677af6f05e3d543fa');

const priorReceipt = path.join(__dirname, '../circuit-prediction-reasoning-2026-10-02/regression-receipt.json');
assert.equal(hash(priorReceipt), '20324f548a684d9e70da2037c5661fdf62e658cab17515ce0eeeb1e301597264');
for (const [file, expected] of Object.entries(JSON.parse(fs.readFileSync(priorReceipt, 'utf8')).files).filter(([file]) => file.startsWith('tests/'))) assert.equal(hash(path.join(root, file)), expected, 'Existing test changed: ' + file);
const priorValidation = path.join(__dirname, '../circuit-prediction-reasoning-2026-10-02/validation.json');
assert.equal(hash(priorValidation), 'bf0b2cf589e6c33aff5234f33f6e144ea98958767f1c495ddb6e59c7d9997dc1');
const prior = JSON.parse(fs.readFileSync(priorValidation, 'utf8'));
assert.equal(prior.passed, true);
assert.equal(prior.sourceSha256, previousSourceSha256);
assert.equal(prior.regression.passedTests, 318);
assert.equal(prior.browser.views, 14);
const independent = read('independent-review.json');
assert.equal(independent.passed, true);
assert.equal(independent.sourceSha256, sourceHash);
assert.equal(independent.reviewer, 'circuit_journey');
assert.deepEqual(independent.materialIssues, []);

const browser = read('browser-results.json');
assert.equal(browser.passed, true);
assert.deepEqual(browser.errors, []);
assert.deepEqual(browser.visualIssues, []);
for (const key of ['sourceSha256', 'sourceSha256AtEnd', 'mirrorSha256', 'mirrorSha256AtEnd']) assert.equal(browser[key], sourceHash);
assert.equal(browser.sourceChangedDuringRun, false);
assert.equal(browser.scriptChangedDuringRun, false);
assert.equal(browser.mirrorMatches, true);
assert.equal(browser.scriptSha256, '5092cc14d20009cc5ba62bbcb5903a844f803ce9fea0d41f7ceba349e507a391');
assert.equal(browser.scriptSha256AtEnd, browser.scriptSha256);
assert.equal(hash(path.join(__dirname, 'browser-check.cjs')), browser.scriptSha256);
const views = [];
for (const id of ['gain', 'limit', 'sensor']) {
  views.push({ name: 'prediction-guide-closed-' + id, width: 320, scale: 1, forced: false, id, open: false });
  for (const width of [1280, 320]) views.push({ name: 'prediction-guide-open-' + id, width, scale: 1, forced: false, id, open: true });
}
for (const id of ['gain', 'sensor']) views.push({ name: 'prediction-guide-' + id + '-200pct-text', width: 320, scale: 2, forced: false, id, open: true });
for (const id of ['gain', 'sensor']) views.push({ name: 'forced-colors-prediction-guide-' + id, width: 320, scale: 1, forced: true, id, open: true });
views.push({ name: 'prediction-guide-transition-tested', width: 390, scale: 1, forced: false, id: 'gain', open: false, tested: true });
const viewKey = row => row.name + '|' + row.width;
for (const key of ['axe', 'layouts', 'contentBounds', 'actions', 'nodeIds', 'focus', 'screenshots', 'guideStates']) {
  assert.equal(browser[key].length, 14, key);
  assert.deepEqual(browser[key].map(viewKey).sort(), views.map(viewKey).sort(), key);
}
const connections = {
  gain: 'How might changing the input voltage affect the base branch and the lamp path?',
  limit: 'Could anything in the lamp path limit its current as you raise the input voltage?',
  sensor: 'How might less light affect the photoresistor, the connected divider junction, and the lamp path?'
};
for (const view of views) {
  const get = key => browser[key].find(row => viewKey(row) === viewKey(view));
  const axe = get('axe'), layout = get('layouts'), state = get('guideStates');
  assert.deepEqual(axe.violations, []);
  assert.equal(axe.forcedColors, view.forced);
  assert.deepEqual(axe.excludedRules, view.forced ? ['color-contrast'] : []);
  if (view.forced) assert.ok(axe.exclusionReason.includes('axe 4.12.1'));
  assert.equal(layout.scale, view.scale);
  assert.ok(layout.scrollWidth <= view.width + 1);
  assert.deepEqual(get('nodeIds').duplicates, []);
  for (const card of get('contentBounds').cards) {
    assert.deepEqual(card.violations, []);
    assert.ok(card.scrollWidth <= card.clientWidth + 1);
    for (const line of card.lines) assert.ok(line.left >= card.left - 1 && line.right <= card.right + 1);
  }
  assert.ok(get('contentBounds').cards.length);
  for (const action of get('actions').actions) {
    assert.ok(action.width >= 43.9 && action.height >= 43.9);
    for (const duration of action.transitionDuration.split(',')) assert.ok(parseFloat(duration) * (duration.trim().endsWith('ms') ? .001 : 1) <= .0000101);
  }
  assert.equal(get('focus').visible, true);
  assert.equal(get('focus').focused, true);
  assert.equal(get('focus').focusVisible, true);
  assert.equal(state.id, view.id);
  assert.equal(state.open, view.open);
  assert.equal(state.fields, 0);
  assert.equal(state.live, 0);
  assert.deepEqual(state.guideIds, []);
  assert.equal(state.summary, view.tested ? 'Build an explanation' : 'Help me make a prediction');
  if (!view.tested) {
    assert.equal(state.intro, 'Use the experiment plan to develop your own prediction. These prompts are optional.');
    assert.deepEqual(state.steps, [
      { id: 'plan', heading: 'Review the plan', prompt: 'Which setting changes, and which settings stay the same?' },
      { id: 'connect', heading: 'Think through the circuit', prompt: connections[view.id] },
      { id: 'reason', heading: 'Give a reason', prompt: 'What change in lamp current do you expect, and why? You may write your reasoning in the field above.' }
    ]);
    assert.doesNotMatch(state.steps.map(row => row.prompt).join(' '), /\d+(?:\.\d+)?\s*(?:mA|µA|V)|saturation|correct prediction|current will increase/i);
  } else assert.deepEqual(state.steps.map(row => row.id), ['observe', 'connect', 'reflect']);
}
assert.equal(browser.textResize.length, 2);
for (const text of browser.textResize) {
  assert.equal(text.baselineViewportWidth, 320);
  assert.equal(text.scale, 2);
  assert.equal(text.elements, 13);
  assert.equal(text.fonts.length, 13);
  for (const font of text.fonts) {
    assert.equal(font.visible, true);
    assert.equal(font.normalFontSize, font.beforeFontSize);
    assert.equal(font.afterFontSize, font.beforeFontSize * 2);
    assert.equal(font.ratio, 2);
  }
}
assert.equal(browser.forcedColors.length, 2);
for (const forced of browser.forcedColors) {
  assert.equal(forced.width, 320);
  assert.equal(forced.active, true);
  assert.deepEqual(forced.violations, []);
  assert.equal(forced.colors.length, 8);
  for (const color of forced.colors) assert.ok(Number.isFinite(color.ratio) && color.ratio + 1e-6 >= color.required);
}
assert.equal(browser.forcedColorsDiagnostic.file, '../circuit-explanation-guide-2026-10-01/forced-colors-diagnostic.json');
assert.equal(browser.forcedColorsDiagnostic.sha256, '211de59d56f77fdc793293b7bf74730196b3c21d386fd35a6d95387022fbe8d5');
assert.equal(hash(path.join(__dirname, browser.forcedColorsDiagnostic.file)), browser.forcedColorsDiagnostic.sha256);
assert.equal(browser.guideToggles.length, 9);
for (const toggle of browser.guideToggles) {
  assert.ok(['Enter', 'Space'].includes(toggle.key));
  assert.equal(toggle.sameState, true);
  assert.equal(toggle.focused, true);
  assert.equal(toggle.noNavigation, true);
  assert.equal(typeof toggle.writing.value, 'string');
  assert.ok([6, 12].includes(toggle.writing.rows));
  assert.equal(toggle.writing.range.length, 3);
}
assert.deepEqual(browser.checks, [{ name: 'Native Tab skips the guide prompts and Shift+Tab returns to its summary', wholeDataUnchanged: true }]);
assert.deepEqual(browser.transitions, [
  { action: 'native-predict-test', wrongChoicePreserved: true, predictionGuideUnmounted: true, existingExplanationGuideClosed: true, sameTextarea: true, sameDraft: true, sameBackwardSelection: true, rows: 12, resultFocused: true },
  { action: 'empty-writing-test', writingOptional: true, predictionGuideUnmounted: true, existingExplanationGuideClosed: true }
]);
assert.deepEqual(browser.lifecycle, [
  { action: 'locale-live-edit', allGuideTextTranslated: true, sameTextareaAndBackwardSelection: true, sameGuideOpen: true, noAutomaticNavigation: true, rows: 12 },
  { action: 'untested-lesson-switch', sameGuideOpen: true, separateDrafts: true, benchAndNotebookUnchanged: true, rows: 12 },
  { action: 'actual-json-load-restore', sameGuideOpen: true, draftRestored: true, noAutomaticNavigation: true, rows: 12 }
]);
assert.equal(browser.styleScope.length, 1);
assert.equal(browser.styleScope[0].selector, '.circuit-active-prediction-guide');
assert.equal(browser.styleScope[0].outsideBorder, '0px');
assert.equal(browser.styleScope[0].outsideBackground, 'rgba(0, 0, 0, 0)');
assert.deepEqual(browser.motion, [{ reduced: true, animations: 0 }]);

const visual = read('visual-review.json');
assert.equal(visual.approved, true);
assert.equal(visual.passed, true);
assert.equal(visual.sourceSha256, sourceHash);
assert.equal(visual.scriptSha256, browser.scriptSha256);
assert.equal(visual.nativeExitCode, 0);
assert.equal(visual.browserClosedByFinally, true);
assert.equal(visual.browserResultSha256, hash(path.join(__dirname, 'browser-results.json')));
assert.deepEqual(visual.materialIssues, []);
assert.equal(visual.screenshotsReviewedByCircuitUI, 14);
assert.equal(visual.rootInspected.length, 6);
const pngs = [];
for (const screenshot of browser.screenshots) {
  assert.equal(path.basename(screenshot.file), screenshot.file);
  const file = path.join(__dirname, screenshot.file), png = fs.readFileSync(file);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(visual.screenshotSha256[screenshot.file], hash(file));
  assert.equal(visual.screenshots.find(row => row.file === screenshot.file).reviewed, true);
  pngs.push({ file: screenshot.file, sha256: hash(file), width: png.readUInt32BE(16), height: png.readUInt32BE(20) });
}
for (const file of visual.rootInspected) assert.ok(pngs.some(png => png.file === file));
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
for (const file of walk(__dirname).filter(file => /\.(md|json|cjs|js|txt)$/.test(file))) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file));
  assert.ok(!text.includes('\uFFFD'), file);
  assert.ok(!/[ \t]+$/m.test(text), file);
}
const diff = spawnSync('git', ['diff', '--check', '--', source, mirror, ...Object.keys(expectedCounts)], { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
assert.equal(diff.status, 0, diff.stdout + diff.stderr);
const validation = {
  passed: true,
  sourceSha256: sourceHash,
  mirrorSha256: hash(path.join(root, mirror)),
  previousVerifiedSourcePreserved: previousSourceSha256,
  previousPass: { tests: prior.regression.passedTests, browserViews: prior.browser.views },
  regression: { tests: regression.numPassedTests, files: regression.testResults.length, attempts: receipt.attempts.length },
  browser: { views: views.length, visibleFocusChecks: browser.focus.length, nativeToggles: browser.guideToggles.length, nativeTestTransitions: browser.transitions.length, lifecycleChecks: browser.lifecycle.length, measuredFontsAtTwiceNormal: browser.textResize.reduce((n, row) => n + row.fonts.length, 0), forcedTextRows: browser.forcedColors.reduce((n, row) => n + row.colors.length, 0), rootInspected: visual.rootInspected.length, reviewerInspected: visual.screenshotsReviewedByCircuitUI },
  artifacts: { regressionSha256: hash(path.join(__dirname, 'regression.json')), regressionReceiptSha256: hash(path.join(__dirname, 'regression-receipt.json')), browserResultSha256: hash(path.join(__dirname, 'browser-results.json')), visualReviewSha256: hash(path.join(__dirname, 'visual-review.json')), validatorSha256: hash(__filename), screenshots: pngs }
};
fs.writeFileSync(path.join(__dirname, 'validation.json'), JSON.stringify(validation, null, 2) + '\n');
console.log(JSON.stringify(validation, null, 2));
