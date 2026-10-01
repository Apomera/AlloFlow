const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const expectedSource = 'bf831e5d4ac6cb0021d82f28b94d9c664f2d1a794b3a66de7aad616c801607a6';
const expectedCounts = {
  'tests/circuit_guided_entry.test.js': 26,
  'tests/circuit_lesson_journey.test.js': 27,
  'tests/circuit_experiment_map.test.js': 23,
  'tests/circuit_lesson_continuation.test.js': 23,
  'tests/circuit_lesson_writing_space.test.js': 19,
  'tests/circuit_explanation_guide.test.js': 20,
  'tests/circuit_localization.test.js': 4,
  'tests/circuit_form_labels_a11y.test.js': 4
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
assert.equal(regression.numPassedTests, 146);
assert.equal(regression.numFailedTests, 0);
assert.equal(regression.numPendingTests || 0, 0);
assert.equal(regression.testResults.length, 8);
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
assert.equal(receipt.assertionCoverage.length, 8);
for (const proof of receipt.assertionCoverage) {
  const file = completed.find(file => relative(file.name) === proof.file);
  assert.ok(file);
  assert.equal(proof.count, expectedCounts[proof.file]);
  assert.deepEqual(proof.fullNames, file.assertionResults.map(test => test.fullName));
}

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
const expectedShots = [
  'map-start-predict-test-1280.png',
  'map-start-predict-test-390.png',
  'map-start-predict-test-320.png',
  'map-saved-stages-390.png',
  'continuation-predict-390.png',
  'continuation-predict-1280.png',
  'continuation-test-390.png',
  'continuation-test-1280.png',
  'map-saved-stages-200pct-text-320.png',
  'continuation-test-200pct-text-320.png',
  'forced-colors-map-saved-stages-320.png',
  'forced-colors-continuation-test-320.png'
];
for (const key of ['axe', 'layouts', 'contentBounds', 'actions', 'nodeIds', 'screenshots', 'navigationStates', 'numericIntegrity']) assert.equal(browser[key].length, 12, key);
assert.deepEqual(browser.screenshots.map(shot => shot.file).sort(), expectedShots.slice().sort());
assert.ok(browser.axe.every(scan => scan.violations.length === 0));
const ordinaryScans = browser.axe.filter(scan => !scan.forcedColors);
const forcedScans = browser.axe.filter(scan => scan.forcedColors);
assert.equal(ordinaryScans.length, 10);
assert.equal(forcedScans.length, 2);
for (const scan of ordinaryScans) {
  assert.deepEqual(scan.excludedRules, []);
  assert.equal(scan.exclusionReason, null);
}
for (const scan of forcedScans) {
  assert.deepEqual(scan.excludedRules, ['color-contrast']);
  assert.ok(scan.exclusionReason.includes('axe 4.12.1'));
}
assert.equal(browser.focus.length, 24);
assert.ok(browser.focus.every(check => check.focused && check.focusVisible && check.visible));
assert.ok(browser.layouts.every(check => check.scrollWidth <= check.width + 1));
assert.ok(browser.nodeIds.every(check => check.duplicates.length === 0));
for (const check of browser.contentBounds) {
  assert.ok(check.cards.length > 0);
  assert.ok(check.cards.every(card => card.violations.length === 0 && card.scrollWidth <= card.clientWidth + 1));
}
for (const view of browser.actions) {
  assert.ok(view.actions.length > 0);
  assert.ok(view.actions.every(action => action.width >= 44 && action.height >= 44 && !action.disabled));
}
const expectedActions = {
  start: 'Open experiment',
  predict: 'Resume prediction',
  test: 'Continue to test',
  explain: 'Review result and explain',
  review: 'Review saved experiment'
};
const expectedValues = { gain: [1, 1.5], limit: [3.3, 5], sensor: [80, 20] };
const coveredStages = new Set();
for (const state of browser.navigationStates) {
  const cards = state.type === 'map' ? state.cards : [state];
  if (state.type === 'map') {
    assert.equal(state.open, true);
    assert.equal(cards.length, 3);
    assert.equal(cards.filter(card => card.selected === 'true').length, 1);
    assert.ok(cards.every(card => card.pressed === card.selected));
  } else {
    assert.equal(state.type, 'continuation');
    assert.equal(state.mode, 'next');
  }
  for (const card of cards) {
    coveredStages.add(card.phase);
    assert.equal(card.action, expectedActions[card.phase]);
    assert.equal(card.accessibleName, card.action + ': ' + card.title);
    assert.deepEqual(card.values, expectedValues[card.id]);
  }
}
assert.deepEqual([...coveredStages].sort(), Object.keys(expectedActions).sort());
assert.equal(browser.navigation.length, 12);
const mapNavigation = browser.navigation.filter(proof => proof.surface === 'map');
const continuationNavigation = browser.navigation.filter(proof => proof.surface === 'continuation');
const allTestedNavigation = browser.navigation.filter(proof => proof.surface === 'all-tested');
assert.deepEqual(mapNavigation.map(proof => proof.stage), ['start', 'predict', 'test', 'explain', 'review', 'review']);
assert.deepEqual(continuationNavigation.map(proof => proof.stage), ['start', 'predict', 'test', 'test']);
assert.deepEqual(allTestedNavigation.map(proof => proof.key), ['Enter', 'Space']);
for (const proof of mapNavigation.concat(continuationNavigation)) {
  assert.ok(['Enter', 'Space'].includes(proof.key));
  assert.equal(proof.target, ['explain', 'review'].includes(proof.stage) ? 'result' : 'question');
  assert.equal(proof.preservedBenchAndSavedWork, true);
  assert.equal(proof.focused, true);
  assert.equal(proof.writingRows, proof.stage === 'start' ? null : 12);
}
for (const proof of mapNavigation) {
  assert.equal(proof.selectedPressed, true);
  assert.equal(proof.open, true);
}
assert.equal(mapNavigation.filter(proof => proof.sameSelection).length, 2);
for (const proof of continuationNavigation) assert.equal(proof.didNotRunTest, true);
for (const proof of allTestedNavigation) {
  assert.equal(proof.target, 'map-summary');
  for (const key of ['sameWholeData', 'sameStateObject', 'focused', 'instant']) assert.equal(proof[key], true);
}
assert.equal(browser.lifecycle.length, 2);
assert.deepEqual(browser.lifecycle[0], {
  action: 'writing-locale-live-edit',
  sameTextareaAndCaret: true,
  translatedNamesIncludeActions: true,
  noNavigationReplay: true,
  writingRows: 12
});
assert.deepEqual(browser.lifecycle[1], {
  action: 'actual-json-import-restore',
  importAction: 'Review result and explain',
  restoreAction: 'Review saved experiment',
  noNavigationReplay: true,
  savedWorkRestored: true,
  sameMapNode: true,
  writingRows: 12
});
assert.equal(browser.checks.length, 2);
assert.ok(browser.checks.every(check => typeof check.name === 'string' && check.name.length > 0));
assert.equal(browser.textResize.length, 2);
assert.deepEqual(browser.textResize.map(check => [check.scope, check.elements]), [
  ['.circuit-active-lesson-map', 64],
  ['.circuit-active-lesson-continuation', 23]
]);
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
assert.equal(browser.textResize.reduce((sum, check) => sum + check.elements, 0), 87);
const readings = browser.numericIntegrity.flatMap(check => check.readings);
assert.equal(readings.length, 48);
for (const reading of readings) {
  assert.ok(reading.parts.length > 0);
  assert.ok(reading.parts.every(part => part.intact && part.lineCount === 1));
}
assert.equal(browser.forcedColors.length, 2);
assert.deepEqual(browser.forcedColors.map(review => [review.name, review.colors.length]), [
  ['forced-colors-map-saved-stages', 37],
  ['forced-colors-continuation-test', 12]
]);
for (const review of browser.forcedColors) {
  assert.equal(review.active, true);
  assert.deepEqual(review.violations, []);
  assert.ok(review.colors.every(color => Number.isFinite(color.ratio) && color.ratio >= color.required));
}
assert.deepEqual(browser.forcedColorsDiagnostic, {
  file: '../circuit-explanation-guide-2026-10-01/forced-colors-diagnostic.json',
  sha256: '211de59d56f77fdc793293b7bf74730196b3c21d386fd35a6d95387022fbe8d5'
});
const diagnosticFile = path.resolve(__dirname, browser.forcedColorsDiagnostic.file);
assert.equal(hash(diagnosticFile), browser.forcedColorsDiagnostic.sha256);
const diagnostic = JSON.parse(fs.readFileSync(diagnosticFile, 'utf8'));
assert.ok(diagnostic.cases.some(proof => proof.freshPageWithForcedColorsBeforeAxe && proof.forced && proof.axeVersion === '4.12.1' && proof.contrast.length > 0));
assert.equal(diagnostic.provenance.path, 'reports/circuit-guided-entry-2026-09-29/forced-colors-diagnostic.json');
assert.equal(diagnostic.provenance.sha256, 'fc110d980e2ff556e8ffcf8115322d10918238e416f411089e5d9026f52afb9e');
assert.equal(hash(path.join(root, diagnostic.provenance.path)), diagnostic.provenance.sha256);
assert.equal(browser.motion.length, 1);
assert.ok(browser.motion.every(check => check.reduced && check.animations === 0));
const screenshotHashes = {};
assert.equal(new Set(browser.screenshots.map(shot => shot.file)).size, browser.screenshots.length);
for (const shot of browser.screenshots) {
  assert.equal(path.basename(shot.file), shot.file);
  const file = path.join(__dirname, shot.file);
  assert.equal(fs.readFileSync(file).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  screenshotHashes[shot.file] = hash(file);
}
const inputs = fs.readdirSync(__dirname).filter(name => /\.(?:md|cjs|json|log)$/.test(name) && name !== 'validation.json').sort();
for (const name of inputs.filter(name => !name.endsWith('.log'))) {
  const content = fs.readFileSync(path.join(__dirname, name), 'utf8');
  assert.ok(!content.includes('\uFFFD'), 'Invalid encoding: ' + name);
  assert.ok(!/[ \t]+(?:\r?\n|$)/.test(content), 'Trailing whitespace: ' + name);
}
const owned = [source, mirror, 'tests/circuit_experiment_map.test.js', 'tests/circuit_lesson_continuation.test.js', path.relative(root, __dirname)];
const diff = spawnSync('git', ['diff', '--check', '--', ...owned], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(diff.status, 0, diff.stdout + diff.stderr);
const staged = spawnSync('git', ['diff', '--cached', '--quiet', '--', ...owned], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(staged.status, 0, 'This round must remain unstaged and uncommitted.');
const validation = {
  passed: true,
  validatedAt: new Date().toISOString(),
  sourceSha256: sourceHash,
  mirrored: true,
  sourceCompiles: true,
  regression: { passedTests: 146, files: 8, attempts: 8 },
  browser: {
    axeScans: 12,
    fullContrastScans: 10,
    forcedColorUsedTextNodes: 49,
    focusChecks: 24,
    navigationChecks: 12,
    lifecycleChecks: 2,
    doubledFontMeasurements: 87,
    intactNumericReadings: 48,
    screenshots: 12,
    visualIssues: 0
  },
  reportHashes: Object.fromEntries(inputs.map(name => [name, hash(path.join(__dirname, name))])),
  screenshotHashes,
  whitespaceCheck: true,
  ownedChangesUnstaged: true,
  commitRequested: false
};
fs.writeFileSync(path.join(__dirname, 'validation.json'), JSON.stringify(validation, null, 2));
console.log(JSON.stringify({ passed: true, sourceSha256: sourceHash, regression: validation.regression, browser: validation.browser }, null, 2));
