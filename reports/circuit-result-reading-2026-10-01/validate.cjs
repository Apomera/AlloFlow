const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const expectedSource = '2e346c972087af0e115941f2fccb4aa6040625e5f951c5a69a2d80daf37f5f76';
const expectedCounts = {
  'tests/circuit_result_reading.test.js': 15,
  'tests/circuit_prediction_choices.test.js': 16,
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
  'tests/circuit_experiment_plan.test.js': 24
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
assert.equal(receipt.attempts.length, 13);
assert.deepEqual(receipt.changedDuringRun, []);
assert.deepEqual(receipt.filesAtEnd, receipt.files);
assert.equal(receipt.runnerSha256AtEnd, receipt.runnerSha256);
assert.equal(receipt.runnerSha256, hash(path.join(__dirname, 'run-regression.cjs')));
assert.equal(regression.success, true);
assert.equal(regression.numPassedTests, 234);
assert.equal(regression.numFailedTests, 0);
assert.equal(regression.numPendingTests || 0, 0);
assert.equal(regression.testResults.length, 13);
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
assert.equal(receipt.assertionCoverage.length, 13);
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
assert.equal(browserHash, '1b548ebf2d935156b6953ee52075ac42072fc132098197a7c07838145fff95db');
assert.equal(browser.scriptSha256, browserHash);
assert.equal(browser.scriptSha256AtEnd, browserHash);
assert.equal(browser.scriptChangedDuringRun, false);
assert.deepEqual(browser.errors, []);
assert.deepEqual(browser.visualIssues, []);
for (const key of ['axe', 'screenshots', 'layouts', 'contentBounds', 'nodeIds', 'numericIntegrity', 'barGeometry', 'resultStates', 'actions']) assert.equal(browser[key].length, 14, key);
assert.ok(browser.axe.every(scan => scan.violations.length === 0));
const ordinaryScans = browser.axe.filter(scan => !scan.forcedColors);
const forcedScans = browser.axe.filter(scan => scan.forcedColors);
assert.equal(ordinaryScans.length, 12);
assert.equal(forcedScans.length, 2);
for (const scan of ordinaryScans) {
  assert.deepEqual(scan.excludedRules, []);
  assert.equal(scan.exclusionReason, null);
}
for (const scan of forcedScans) {
  assert.deepEqual(scan.excludedRules, ['color-contrast']);
  assert.ok(scan.exclusionReason.includes('axe 4.12.1'));
}
assert.equal(browser.focus.length, 14);
assert.ok(browser.focus.every(check => check.focused && check.focusVisible && check.visible));
assert.ok(browser.layouts.every(check => check.scrollWidth <= check.width + 1));
assert.ok(browser.nodeIds.every(check => check.duplicates.length === 0));
for (const check of browser.contentBounds) {
  assert.ok(check.cards.length > 0);
  assert.ok(check.cards.every(card => card.violations.length === 0 && card.scrollWidth <= card.clientWidth + 1));
}
for (const view of browser.actions) {
  assert.ok(view.actions.length > 0);
  assert.ok(view.actions.every(action => action.width >= 43.9 && action.height >= 43.9));
}
for (const check of browser.numericIntegrity) {
  assert.equal(check.readings.length, 3);
  for (const reading of check.readings) assert.ok(reading.parts.length > 0 && reading.parts.every(part => part.intact && part.lineCount === 1));
}
assert.equal(browser.textResize.length, 2);
for (const check of browser.textResize) {
  assert.equal(check.scale, 2);
  assert.equal(check.baselineViewportWidth, 320);
  assert.equal(check.elements, check.fonts.length);
  assert.ok(check.elements > 0);
  for (const font of check.fonts) {
    assert.ok(font.normalFontSize > 0);
    assert.equal(font.normalFontSize, font.baselineFontSize);
    assert.equal(font.afterFontSize, font.normalFontSize * 2);
  }
}
assert.equal(browser.forcedColors.length, 2);
for (const review of browser.forcedColors) {
  assert.equal(review.active, true);
  assert.deepEqual(review.violations, []);
  assert.ok(review.colors.length > 0 && review.colors.every(color => Number.isFinite(color.ratio) && color.ratio + 1e-6 >= color.required));
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

const measurements = {
  gain: { before: '3.00 mA', after: '8.00 mA', delta: '+5.00 mA', settings: ['Input: 1.00 V', 'Input: 1.50 V'], region: 'Active region' },
  limit: { before: '21.82 mA', after: '21.82 mA', delta: '0 A', settings: ['Input: 3.30 V', 'Input: 5.00 V'], region: 'Saturation' },
  sensor: { before: '2.53 mA', after: '18.32 mA', delta: '+15.79 mA', settings: ['Relative light: 80 / 100', 'Relative light: 20 / 100'], region: 'Active region' }
};
for (const state of browser.resultStates) {
  const expected = measurements[state.lesson];
  assert.ok(expected);
  assert.equal(state.eyebrow, 'SAVED EXPERIMENT RESULT');
  assert.equal(state.describedby.length, 2);
  assert.ok(state.describedby[0].text);
  assert.deepEqual(state.describedby[1], { id: state.context.id, text: state.context.text });
  assert.equal(state.context.role, 'status');
  assert.equal(state.context.beforeChart, true);
  assert.equal(state.context.copies, 1);
  assert.equal(state.context.oldReplayCopies, 0);
  assert.equal(state.context.iconHidden, 'true');
  assert.equal(state.context.iconFocusable, 'false');
  assert.equal(state.readings.length, 3);
  for (const reading of state.readings) {
    assert.equal(reading.text, expected[reading.stage]);
    assert.equal(reading.text, reading.magnitude + ' ' + reading.unit);
    assert.equal(reading.literalSpace, true);
    assert.equal(reading.magnitudeFontSize, reading.fontSize);
    assert.equal(reading.magnitudeColor, reading.color);
    assert.equal(reading.magnitudeWhiteSpace, 'nowrap');
    assert.equal(reading.unitWhiteSpace, 'nowrap');
    assert.equal(reading.direction, 'ltr');
    assert.equal(reading.bidi, 'isolate');
    const unitRatio = reading.stage === 'delta' ? .8 : .65;
    assert.ok(Math.abs(parseFloat(reading.unitFontSize) - parseFloat(reading.fontSize) * unitRatio) < .025);
  }
  assert.deepEqual(state.cards.map(card => card.setting), expected.settings);
  assert.ok(state.cards.every(card => card.settingBeforeValue && card.region === expected.region));
}
for (const view of browser.barGeometry) {
  assert.equal(view.bars.length, 2);
  assert.ok(Math.abs(view.bars[0].trackContentWidth - view.bars[1].trackContentWidth) <= 1);
  for (const bar of view.bars) {
    assert.equal(bar.hidden, 'true');
    assert.ok(Math.abs(bar.inlinePercent - bar.expectedFraction * 100) < .00011);
    assert.ok(Math.abs(bar.fillWidth - bar.expectedPixelWidth) <= 1);
  }
}
assert.equal(browser.readingOrder.length, 1);
assert.equal(browser.readingOrder[0].documentDirection, 'rtl');
assert.equal(browser.readingOrder[0].width, 320);
assert.equal(browser.readingOrder[0].actualViewportWidth, 320);
assert.equal(browser.readingOrder[0].readings.length, 3);
assert.ok(browser.readingOrder[0].readings.every(row => row.direction === 'ltr' && row.bidi === 'isolate' && row.ordered));
for (const row of browser.readingOrder[0].readings) {
  const sameLine = row.numberBottom > row.unitTop && row.unitBottom > row.numberTop;
  assert.equal(row.sameLine, sameLine);
  assert.equal(row.ordered, sameLine ? row.numberRight <= row.unitLeft + 1 : row.numberTop < row.unitTop);
}
assert.equal(browser.resultActions.length, 6);
assert.deepEqual(browser.resultActions.map(row => row.action), ['native-start-wrong-predict-test', 'live-input-and-probe', 'Load experiment baseline', 'Load this experiment result', 'Undo active edit', 'lesson-switch-return']);
for (const row of browser.resultActions) for (const value of Object.values(row)) if (typeof value === 'boolean') assert.equal(value, true);
assert.equal(browser.lifecycle.length, 2);
assert.deepEqual(browser.lifecycle.map(row => row.action), ['locale-and-writing', 'actual-json-import-restore']);
for (const row of browser.lifecycle) {
  for (const value of Object.values(row)) if (typeof value === 'boolean') assert.equal(value, true);
  assert.equal(row.writingRows, 12);
}
assert.ok(browser.motion.length > 0 && browser.motion.every(check => check.reduced && check.animations === 0));

const expectedShots = ['saved-result-gain-1280.png', 'saved-result-gain-390.png', 'saved-result-gain-320.png', 'saved-result-limit-1280.png', 'saved-result-limit-390.png', 'saved-result-limit-320.png', 'saved-result-sensor-1280.png', 'saved-result-sensor-390.png', 'saved-result-sensor-320.png', 'saved-result-limit-200pct-text-320.png', 'saved-result-sensor-200pct-text-320.png', 'forced-colors-saved-result-gain-320.png', 'forced-colors-saved-result-sensor-320.png', 'rtl-saved-result-sensor-320.png'];
assert.deepEqual(browser.screenshots.map(shot => shot.file).sort(), expectedShots.slice().sort());
const screenshotHashes = {};
for (const shot of browser.screenshots) {
  assert.equal(path.basename(shot.file), shot.file);
  const file = path.join(__dirname, shot.file);
  assert.equal(fs.readFileSync(file).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  screenshotHashes[shot.file] = hash(file);
}
const visualReview = read('visual-review.json');
assert.equal(visualReview.passed, true);
assert.equal(visualReview.sourceSha256, sourceHash);
assert.equal(visualReview.screenshotsReviewedByCircuitUI, 14);
assert.equal(visualReview.repeatAudit.actualViewportWidth, 320);
assert.equal(visualReview.repeatAudit.screenshotBytesUnchanged, true);
assert.equal(visualReview.repeatAudit.excludedFromFinalCounts, true);
assert.equal(hash(path.join(__dirname, 'metadata-correction/browser-check.cjs')), visualReview.repeatAudit.preliminaryScriptSha256);
assert.equal(hash(path.join(__dirname, 'metadata-correction/browser-results.json')), visualReview.repeatAudit.preliminaryReceiptSha256);
assert.equal(hash(path.join(__dirname, 'browser-first-run-before-rtl-measurement-fix.json')), visualReview.repeatAudit.preliminaryReceiptSha256);
const preliminaryBrowser = read('metadata-correction/browser-results.json');
assert.equal(preliminaryBrowser.scriptSha256, visualReview.repeatAudit.preliminaryScriptSha256);
assert.equal(preliminaryBrowser.scriptSha256AtEnd, preliminaryBrowser.scriptSha256);
for (const key of ['sourceSha256', 'sourceSha256AtEnd', 'mirrorSha256', 'mirrorSha256AtEnd']) assert.equal(preliminaryBrowser[key], sourceHash);
assert.ok(visualReview.rootInspected.length >= 3);
for (const file of visualReview.rootInspected) assert.ok(expectedShots.includes(file));

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
const owned = [source, mirror, 'tests/circuit_result_reading.test.js', 'tests/circuit_experiment_plan.test.js', path.relative(root, __dirname)];
const diff = spawnSync('git', ['diff', '--check', '--', ...owned], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(diff.status, 0, diff.stdout + diff.stderr);
const validation = {
  passed: true,
  validatedAt: new Date().toISOString(),
  sourceSha256: sourceHash,
  mirrored: true,
  sourceCompiles: true,
  regression: { passedTests: 234, files: 13, attempts: 13 },
  browser: {
    axeScans: browser.axe.length,
    fullContrastScans: ordinaryScans.length,
    forcedColorViews: forcedScans.length,
    focusChecks: browser.focus.length,
    nativeWorkflowChecks: browser.resultActions.length,
    lifecycleChecks: browser.lifecycle.length,
    doubledFontMeasurements: browser.textResize.reduce((sum, check) => sum + check.elements, 0),
    screenshots: browser.screenshots.length,
    visualIssues: 0
  },
  measurements,
  reportHashes: Object.fromEntries(inputs.map(name => [name, hash(path.join(__dirname, name))])),
  screenshotHashes,
  visualReview,
  whitespaceCheck: true,
  commitAuthorized: true
};
fs.writeFileSync(path.join(__dirname, 'validation.json'), JSON.stringify(validation, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, sourceSha256: sourceHash, regression: validation.regression, browser: validation.browser }, null, 2));
