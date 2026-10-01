const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const expectedSource = 'bb8f51b53428aa52fe39c22c8411090fe0014a12217ded61ba51ab42507e443a';
const expectedCounts = {
  'tests/circuit_guided_entry.test.js': 26,
  'tests/circuit_lesson_journey.test.js': 27,
  'tests/circuit_experiment_map.test.js': 20,
  'tests/circuit_lesson_continuation.test.js': 20,
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
assert.equal(regression.numPassedTests, 140);
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
const stages = ['start', 'predict', 'test', 'explain', 'review'];
const entryCopy = {
  start: ['fresh', 'Open guided experiment', 'Make a prediction, test a change, and explain the readings.'],
  predict: ['prediction', 'Resume prediction', 'Choose what you expect the lamp current to do, then test the change.'],
  test: ['prediction', 'Continue to test', 'Your prediction is saved. Open the experiment to test the planned change.'],
  explain: ['result', 'Review result and explain', 'The test readings are saved. Use them to support or revise your prediction.'],
  review: ['result', 'Review saved experiment', 'Your prediction, test readings, and explanation are saved. Review them or revise your explanation.']
};
for (const key of ['layouts', 'contentBounds', 'actions', 'nodeIds', 'entryStates', 'numericIntegrity']) assert.equal(browser[key].length, 10);
assert.ok(browser.layouts.every(check => check.scrollWidth <= check.width + 1));
assert.ok(browser.nodeIds.every(check => check.duplicates.length === 0));
assert.ok(browser.numericIntegrity.every(check => check.readings.length === 0));
for (const check of browser.actions) assert.ok(check.actions.length === 1 && check.actions[0].height >= 44 && !check.actions[0].disabled);
assert.deepEqual(browser.entryStates.slice(0, 5).map(check => check.stage), stages);
for (const state of browser.entryStates) {
  assert.ok(entryCopy[state.stage]);
  assert.deepEqual([state.phase, state.action, state.cue], entryCopy[state.stage]);
  assert.equal(state.disabled, false);
  assert.equal(state.count, (state.phase === 'result' ? 1 : 0) + ' of 3 tested');
}
assert.equal(browser.entryActions.length, 5);
assert.deepEqual(browser.entryActions.map(check => check.stage), stages);
for (const check of browser.entryActions) {
  assert.ok(['Enter', 'Space'].includes(check.key));
  assert.equal(check.target, ['explain', 'review'].includes(check.stage) ? 'result' : 'question');
  for (const key of ['sameWholeData', 'sameStateObject', 'instant', 'focus']) assert.equal(check[key], true);
}
assert.equal(browser.lifecycle.length, 3);
assert.deepEqual(browser.lifecycle.map(check => check.action), ['real-start-predict-test-write', 'locale-and-live-edit', 'actual-json-import-restore']);
assert.deepEqual(browser.lifecycle[0].stages, stages);
assert.equal(browser.lifecycle[2].importStage, 'explain');
assert.equal(browser.lifecycle[2].restoreStage, 'review');
for (const check of browser.lifecycle) assert.ok(Object.entries(check).filter(([, value]) => typeof value === 'boolean').every(([, value]) => value === true));
assert.equal(browser.checks.length, 2);
assert.equal(browser.checks[0].ids.title, browser.checks[0].ids.heading);
assert.equal(browser.checks[0].ids.cue, browser.checks[0].ids.described);
assert.equal(browser.checks[0].wrongPredictionPreserved, true);
assert.equal(browser.checks[0].whitespaceIsExplain, true);
assert.equal(browser.axe.length, 10);
assert.ok(browser.axe.every(scan => scan.violations.length === 0));
const ordinary = browser.axe.filter(scan => !scan.forcedColors);
const forced = browser.axe.filter(scan => scan.forcedColors);
assert.equal(ordinary.length, 9);
assert.ok(ordinary.every(scan => scan.excludedRules.length === 0));
assert.equal(forced.length, 1);
assert.deepEqual(forced[0].excludedRules, ['color-contrast']);
assert.ok(forced[0].exclusionReason);
assert.equal(browser.focus.length, 10);
assert.ok(browser.focus.every(check => check.visible));
assert.equal(browser.textResize.length, 2);
for (const check of browser.textResize) {
  assert.equal(check.scale, 2);
  assert.equal(check.baselineViewportWidth, 320);
  assert.ok(check.fonts.length > 0);
  assert.equal(check.elements, check.fonts.length);
  assert.equal(check.elements, 8);
  for (const font of check.fonts) {
    assert.ok(font.normalFontSize > 0);
    assert.equal(font.normalFontSize, font.baselineFontSize);
    assert.equal(font.afterFontSize, font.normalFontSize * 2);
  }
}
assert.equal(browser.forcedColorsDiagnostic.file, '../circuit-explanation-guide-2026-10-01/forced-colors-diagnostic.json');
assert.equal(hash(path.resolve(__dirname, browser.forcedColorsDiagnostic.file)), browser.forcedColorsDiagnostic.sha256);
const diagnostic = JSON.parse(fs.readFileSync(path.resolve(__dirname, browser.forcedColorsDiagnostic.file), 'utf8'));
assert.equal(hash(path.join(root, diagnostic.provenance.path)), diagnostic.provenance.sha256);
assert.ok(diagnostic.cases.some(item => item.freshPageWithForcedColorsBeforeAxe && item.forced && item.contrast.length > 0));
assert.equal(browser.forcedColors.length, 1);
for (const review of browser.forcedColors) {
  assert.equal(review.active, true);
  assert.deepEqual(review.violations, []);
  assert.ok(review.colors.length > 0 && review.colors.every(color => Number.isFinite(color.ratio) && color.ratio >= color.required));
}
assert.ok(browser.motion.length > 0 && browser.motion.every(check => check.reduced && check.animations === 0));
assert.equal(browser.screenshots.length, 10);
assert.equal(new Set(browser.screenshots.map(shot => shot.file)).size, 10);
const screenshotHashes = {};
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
const owned = [source, mirror, 'tests/circuit_guided_entry.test.js', path.relative(root, __dirname)];
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
  regression: { passedTests: 140, files: 8, attempts: 8 },
  browser: { axeScans: 10, fullContrastScans: 9, forcedColorsScans: 1, focusChecks: 10, keyboardActions: 5, lifecycleChecks: 3, textResizeElements: 16, screenshots: 10, visualIssues: 0 },
  reportHashes: Object.fromEntries(inputs.map(name => [name, hash(path.join(__dirname, name))])),
  screenshotHashes,
  whitespaceCheck: true,
  ownedChangesUnstaged: true,
  commitRequested: false
};
fs.writeFileSync(path.join(__dirname, 'validation.json'), JSON.stringify(validation, null, 2));
console.log(JSON.stringify({ passed: true, sourceSha256: sourceHash, regression: validation.regression, browser: validation.browser }, null, 2));
