const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const expectedSource = 'fff052d145b7e16ea99b424c6d81ccdc4049b6dcf0da85258d970d75a9aef8cf';
const expectedCounts = {
  'tests/circuit_guided_entry.test.js': 26,
  'tests/circuit_lesson_journey.test.js': 27,
  'tests/circuit_experiment_map.test.js': 23,
  'tests/circuit_lesson_continuation.test.js': 23,
  'tests/circuit_lesson_writing_space.test.js': 19,
  'tests/circuit_explanation_guide.test.js': 20,
  'tests/circuit_localization.test.js': 4,
  'tests/circuit_form_labels_a11y.test.js': 4,
  'tests/circuit_active_lesson_records.test.js': 20,
  'tests/circuit_lesson_navigation.test.js': 13,
  'tests/circuit_experiment_plan.test.js': 24,
  'tests/circuit_prediction_choices.test.js': 16
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
assert.equal(receipt.attempts.length, 12);
assert.deepEqual(receipt.changedDuringRun, []);
assert.deepEqual(receipt.filesAtEnd, receipt.files);
assert.equal(receipt.runnerSha256AtEnd, receipt.runnerSha256);
assert.equal(receipt.runnerSha256, hash(path.join(__dirname, 'run-regression.cjs')));
assert.equal(regression.success, true);
assert.equal(regression.numPassedTests, 219);
assert.equal(regression.numFailedTests, 0);
assert.equal(regression.numPendingTests || 0, 0);
assert.equal(regression.testResults.length, 12);
assert.deepEqual(Object.keys(receipt.files).filter(file => file.startsWith('tests/')).sort(), Object.keys(expectedCounts).sort());
for (const [file, expected] of Object.entries(receipt.files)) assert.equal(hash(path.join(root, file)), expected, 'Tested file changed: ' + file);
const completed = [];
for (const attempt of receipt.attempts) {
  assert.equal(attempt.exitCode, 0);
  assert.equal(attempt.runnerSha256AtEnd, receipt.runnerSha256);
  assert.equal(path.basename(attempt.report), attempt.report);
  assert.equal(hash(path.join(__dirname, attempt.report)), attempt.reportSha256);
  assert.deepEqual(attempt.files, receipt.files);
  assert.deepEqual(attempt.filesAtEnd, attempt.files);
  assert.deepEqual(attempt.changedDuringRun, []);
  for (const flag of ['--pool=forks', '--maxWorkers=1', '--testTimeout=30000', '--hookTimeout=60000']) assert.ok(attempt.command.includes(flag));
  for (const kind of ['stdout', 'stderr']) {
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
assert.equal(receipt.assertionCoverage.length, 12);
for (const proof of receipt.assertionCoverage) {
  const file = completed.find(file => relative(file.name) === proof.file);
  assert.ok(file);
  assert.equal(proof.count, expectedCounts[proof.file]);
  assert.deepEqual(proof.fullNames, file.assertionResults.map(test => test.fullName));
}

const initialDir = path.join(__dirname, 'initial-attempt');
const initialRead = name => JSON.parse(fs.readFileSync(path.join(initialDir, name), 'utf8'));
const initialSource = '37dc5a2f2d74096cc95b74ea2a2d5a7e50ba09567d79d3ba5e6197606fa7507c';
assert.equal(crypto.createHash('sha256').update(require('node:zlib').gunzipSync(fs.readFileSync(path.join(initialDir, 'source.js.gz')))).digest('hex'), initialSource);
const initialRegression = initialRead('regression.json');
const initialReceipt = initialRead('regression-receipt.json');
assert.equal(initialRegression.success, true);
assert.equal(initialRegression.numPassedTests, 219);
assert.equal(initialRegression.numFailedTests, 0);
assert.equal(initialRegression.testResults.length, 12);
assert.equal(initialReceipt.exitCode, 0);
assert.equal(initialReceipt.attempts.length, 12);
assert.deepEqual(initialReceipt.changedDuringRun, []);
assert.equal(initialReceipt.runnerSha256, hash(path.join(initialDir, 'run-regression.cjs')));
assert.equal(initialReceipt.runnerSha256AtEnd, initialReceipt.runnerSha256);
for (const attempt of initialReceipt.attempts) {
  assert.equal(attempt.exitCode, 0);
  assert.deepEqual(attempt.filesAtEnd, attempt.files);
  assert.deepEqual(attempt.changedDuringRun, []);
  assert.equal(hash(path.join(initialDir, attempt.report)), attempt.reportSha256);
  for (const kind of ['stdout', 'stderr']) assert.equal(hash(path.join(initialDir, attempt[kind])), attempt[kind + 'Sha256']);
  const raw = initialRead(attempt.report);
  assert.equal(raw.success, true);
  assert.equal(raw.testResults.length, 1);
  assert.ok(raw.testResults[0].assertionResults.every(test => test.status === 'passed'));
}
const initialBrowser = initialRead('browser-results.json');
assert.notEqual(initialBrowser.passed, true);
for (const key of ['sourceSha256', 'sourceSha256AtEnd', 'mirrorSha256', 'mirrorSha256AtEnd']) assert.equal(initialBrowser[key], initialSource);
assert.equal(initialBrowser.scriptSha256, hash(path.join(initialDir, 'browser-check.cjs')));
assert.equal(initialBrowser.scriptSha256AtEnd, initialBrowser.scriptSha256);
assert.equal(initialBrowser.screenshots.length, 6);
assert.ok(initialBrowser.visualIssues.some(issue => issue.type === 'axe' && issue.violations.some(violation => violation.id === 'color-contrast')));
assert.ok(initialBrowser.axe.at(-1).violations.some(violation => violation.nodes.some(node => node.summary.includes('1.07'))));
const browser = read('browser-results.json');
assert.equal(browser.passed, true);
for (const key of ['sourceSha256', 'sourceSha256AtEnd', 'mirrorSha256', 'mirrorSha256AtEnd']) assert.equal(browser[key], sourceHash);
assert.equal(browser.sourceChangedDuringRun, false);
assert.equal(browser.mirrorMatches, true);
const browserHash = hash(path.join(__dirname, 'browser-check.cjs'));
assert.equal(browser.scriptSha256, browserHash);
assert.equal(browser.scriptSha256AtEnd, browserHash);
assert.equal(browser.scriptChangedDuringRun, false);
assert.deepEqual(browser.errors, []);
assert.deepEqual(browser.visualIssues, []);
assert.equal(browser.axe.length, 12);
assert.equal(browser.screenshots.length, 12);
assert.ok(browser.axe.every(scan => scan.violations.length === 0));
const ordinaryScans = browser.axe.filter(scan => !scan.forcedColors);
const forcedScans = browser.axe.filter(scan => scan.forcedColors);
for (const scan of ordinaryScans) {
  assert.deepEqual(scan.excludedRules, []);
  assert.equal(scan.exclusionReason, null);
}
for (const scan of forcedScans) {
  assert.deepEqual(scan.excludedRules, ['color-contrast']);
  assert.ok(scan.exclusionReason.includes('axe 4.12.1'));
}
assert.ok(browser.focus.length > 0 && browser.focus.every(check => check.focused && check.focusVisible && check.visible));
assert.equal(browser.layouts.length, 12);
assert.ok(browser.layouts.every(check => check.scrollWidth <= check.width + 1));
assert.equal(browser.contentBounds.length, 12);
for (const check of browser.contentBounds) {
  assert.ok(check.cards.length > 0);
  assert.ok(check.cards.every(card => card.violations.length === 0 && card.scrollWidth <= card.clientWidth + 1));
}
assert.equal(browser.nodeIds.length, 12);
assert.ok(browser.nodeIds.every(check => check.duplicates.length === 0));
assert.ok(browser.actions.length >= 12);
for (const view of browser.actions) {
  assert.ok(view.actions.length > 0);
  assert.ok(view.actions.every(action => action.width >= 43.9 && action.height >= 43.9));
}
assert.ok(browser.textResize.length > 0);
for (const check of browser.textResize) {
  assert.equal(check.scale, 2);
  assert.equal(check.baselineViewportWidth, 320);
  assert.equal(check.elements, check.fonts.length);
  for (const font of check.fonts) {
    assert.ok(font.normalFontSize > 0);
    assert.equal(font.normalFontSize, font.baselineFontSize);
    assert.equal(font.afterFontSize, font.normalFontSize * 2);
  }
}
assert.ok(browser.forcedColors.length > 0);
for (const review of browser.forcedColors) {
  assert.equal(review.active, true);
  assert.deepEqual(review.violations, []);
  assert.ok(review.colors.length > 0 && review.colors.every(color => Number.isFinite(color.ratio) && color.ratio >= color.required));
}
assert.deepEqual(browser.forcedColorsDiagnostic, {
  file: '../circuit-explanation-guide-2026-10-01/forced-colors-diagnostic.json',
  sha256: '211de59d56f77fdc793293b7bf74730196b3c21d386fd35a6d95387022fbe8d5'
});
const diagnosticFile = path.resolve(__dirname, browser.forcedColorsDiagnostic.file);
assert.equal(hash(diagnosticFile), browser.forcedColorsDiagnostic.sha256);
const diagnostic = JSON.parse(fs.readFileSync(diagnosticFile, 'utf8'));
assert.ok(diagnostic.cases.some(proof => proof.freshPageWithForcedColorsBeforeAxe && proof.forced && proof.axeVersion === '4.12.1' && proof.contrast.length > 0));
assert.equal(hash(path.join(root, diagnostic.provenance.path)), diagnostic.provenance.sha256);
assert.ok(browser.motion.length > 0 && browser.motion.every(check => check.reduced && check.animations === 0));

const expectedShots = [
  'fresh-start-1280.png', 'fresh-start-390.png',
  'prediction-empty-1280.png', 'prediction-empty-390.png', 'prediction-empty-320.png',
  'prediction-more-390.png', 'prediction-same-390.png', 'prediction-less-390.png',
  'prediction-empty-200pct-text-320.png', 'prediction-less-200pct-text-320.png',
  'forced-colors-prediction-empty-320.png', 'forced-colors-prediction-less-320.png'
];
assert.deepEqual(browser.screenshots.map(shot => shot.file).sort(), expectedShots.slice().sort());
assert.equal(ordinaryScans.length, 10);
assert.equal(forcedScans.length, 2);
assert.equal(browser.focus.length, 37);
assert.equal(browser.actions.length, 22);
assert.equal(browser.predictionStates.length, 12);
const labels = { more: 'Increases', same: 'Stays the same', less: 'Decreases' };
assert.equal(browser.predictionStates.filter(state => state.stage === 'start').length, 2);
let labelCount = 0;
for (const state of browser.predictionStates) {
  if (state.stage === 'start') {
    assert.equal(state.action, 'Start transistor prediction');
    assert.equal(state.primary, true);
    assert.equal(state.disabled, false);
    continue;
  }
  assert.equal(state.stage, 'predict');
  assert.equal(state.legend, 'Predict the lamp current');
  assert.equal(state.description, 'Compared with the starting circuit.');
  assert.deepEqual(state.buttons.map(button => button.label), Object.values(labels));
  for (const [index, button] of state.buttons.entries()) {
    labelCount++;
    const chosen = Object.keys(labels)[index] === state.choice;
    assert.equal(button.pressed, String(chosen));
    assert.equal(button.checkOpacity, chosen ? 1 : 0);
    assert.equal(button.describedby, state.descriptionId);
    assert.equal(button.labelColor, button.color);
    assert.equal(button.labelFontSize, button.fontSize);
    assert.deepEqual(button.labelMargins, ['0px', '0px', '0px', '0px']);
    assert.equal(button.diagrams.length, 2);
    assert.ok(button.diagrams.every(diagram => diagram.hidden === 'true' && diagram.wrapperHidden === 'true' && diagram.focusable === 'false'));
  }
  assert.equal(state.test.disabled, state.choice === null);
  assert.equal(state.test.description, state.choice === null ? 'Choose a prediction to enable Test.' : 'Test runs the stated change from the experiment baseline.');
  assert.ok(state.test.describedby);
  assert.equal(state.test.title, null);
}
assert.equal(labelCount, 30);
assert.equal(browser.predictionActions.length, 7);
assert.deepEqual(browser.predictionActions.map(proof => proof.action), ['start', 'predict', 'test', 'predict', 'test', 'predict', 'test']);
for (const key of ['focusedQuestion', 'baselineLoaded', 'undoable', 'notebookPreserved']) assert.equal(browser.predictionActions[0][key], true);
const predictions = browser.predictionActions.filter(proof => proof.action === 'predict');
const tests = browser.predictionActions.filter(proof => proof.action === 'test');
assert.deepEqual(predictions.map(proof => proof.choice), Object.keys(labels));
assert.deepEqual(tests.map(proof => proof.choice), Object.keys(labels));
for (const proof of predictions) {
  assert.ok(['Enter', 'Space'].includes(proof.key));
  for (const key of ['focusRetained', 'preservedBenchAndSavedWork', 'onePressed', 'noNavigationReplay', 'testEnabled']) assert.equal(proof[key], true);
}
assert.equal(new Set(predictions.map(proof => JSON.stringify([proof.visual.background, proof.visual.color, proof.visual.border]))).size, 1);
for (const proof of tests) {
  assert.ok(['Enter', 'Space'].includes(proof.key));
  for (const key of ['savedOriginalPrediction', 'focusedResult', 'explanationPreserved']) assert.equal(proof[key], true);
}
assert.deepEqual(browser.lifecycle, [
  { action: 'locale-and-live-edit', translatedDescriptions: true, sameTextareaAndCaret: true, sameChoicesNode: true, noFocusReplay: true, choicePreserved: true, writingRows: 12 },
  { action: 'actual-json-import-restore', noFocusReplay: true, restoredChoice: 'less', savedWorkRestored: true, writingRows: 12 }
]);
assert.equal(browser.checks.length, 2);
assert.equal(browser.checks[1].otherButtons.length, 5);
assert.ok(browser.checks[1].otherButtons.every(button => !button.choice && button.icons === 0));
assert.equal(browser.styleScope.length, 1);
for (const key of ['Background', 'MinHeight', 'Display']) assert.notEqual(browser.styleScope[0]['live' + key], browser.styleScope[0]['outside' + key]);
assert.equal(browser.textResize.length, 2);
assert.ok(browser.textResize.every(check => check.elements === 19));
assert.equal(browser.forcedColors.length, 2);
assert.deepEqual(browser.forcedColors.map(check => check.colors.length), [6, 7]);
assert.ok(browser.forcedColors.every(check => check.colors.every(color => color.ratio === 21)));
assert.equal(browser.numericIntegrity.length, 12);
assert.ok(browser.numericIntegrity.every(check => check.readings.length === 0));
assert.equal(browser.motion.length, 1);
const screenshotHashes = {};
assert.equal(new Set(browser.screenshots.map(shot => shot.file)).size, browser.screenshots.length);
for (const shot of browser.screenshots) {
  assert.equal(path.basename(shot.file), shot.file);
  const file = path.join(__dirname, shot.file);
  assert.equal(fs.readFileSync(file).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  screenshotHashes[shot.file] = hash(file);
}
const collect = folder => fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(folder, entry.name);
  return entry.isDirectory() ? collect(file) : [path.relative(__dirname, file).replace(/\\/g, '/')];
});
const inputs = collect(__dirname).filter(name => name !== 'validation.json').sort();
for (const name of inputs.filter(name => /\.(?:md|cjs|json)$/.test(name))) {
  const content = fs.readFileSync(path.join(__dirname, name), 'utf8');
  assert.ok(!content.includes('\uFFFD'), 'Invalid encoding: ' + name);
  assert.ok(!/[ \t]+(?:\r?\n|$)/.test(content), 'Trailing whitespace: ' + name);
}
const owned = [
  source, mirror,
  'tests/circuit_prediction_choices.test.js',
  'tests/circuit_lesson_writing_space.test.js',
  'tests/circuit_experiment_map.test.js',
  'tests/circuit_lesson_continuation.test.js',
  'tests/circuit_guided_entry.test.js',
  'tests/circuit_explanation_guide.test.js',
  path.relative(root, __dirname),
  'reports/circuit-lesson-writing-space-2026-10-01',
  'reports/circuit-entry-stages-2026-10-01',
  'reports/circuit-navigation-stages-2026-10-01'
];
const diff = spawnSync('git', ['diff', '--check', '--', ...owned], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(diff.status, 0, diff.stdout + diff.stderr);
const validation = {
  passed: true,
  validatedAt: new Date().toISOString(),
  sourceSha256: sourceHash,
  mirrored: true,
  sourceCompiles: true,
  regression: { passedTests: 219, files: 12, attempts: 12 },
  browser: {
    axeScans: browser.axe.length,
    fullContrastScans: ordinaryScans.length,
    forcedColorViews: forcedScans.length,
    focusChecks: browser.focus.length,
    nativeActionChecks: browser.predictionActions.length,
    lifecycleChecks: browser.lifecycle.length,
    doubledFontMeasurements: browser.textResize.reduce((sum, check) => sum + check.elements, 0),
    screenshots: browser.screenshots.length,
    visualIssues: 0
  },
  reportHashes: Object.fromEntries(inputs.map(name => [name, hash(path.join(__dirname, name))])),
  screenshotHashes,
  whitespaceCheck: true,
  initialAttempt: {
    sourceSha256: initialSource,
    passedTests: 219,
    browserPassed: false,
    screenshots: 6,
    issue: 'Selected label contrast 1.07:1 from a shared Simple-workbench class. The new label now uses its own class and inherits the button color.',
    excludedFromFinalBrowserCount: true
  },
  commitAuthorized: true
};
fs.writeFileSync(path.join(__dirname, 'validation.json'), JSON.stringify(validation, null, 2));
console.log(JSON.stringify({ passed: true, sourceSha256: sourceHash, regression: validation.regression, browser: validation.browser }, null, 2));