const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const expectedSource = '90932f1167d54daf885c256157e4e8a3c647a9cebe62281ccdc0856ec1a3ad63';
const expectedCounts = {
  'tests/circuit_evidence_return.test.js': 15,
  'tests/circuit_trace_changes.test.js': 16,
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
assert.equal(receipt.attempts.length, 15);
assert.deepEqual(receipt.changedDuringRun, []);
assert.deepEqual(receipt.filesAtEnd, receipt.files);
assert.equal(receipt.runnerSha256AtEnd, receipt.runnerSha256);
assert.equal(receipt.runnerSha256, hash(path.join(__dirname, 'run-regression.cjs')));
assert.equal(regression.success, true);
assert.equal(regression.numPassedTests, 265);
assert.equal(regression.numFailedTests, 0);
assert.equal(regression.numPendingTests || 0, 0);
assert.equal(regression.testResults.length, 15);
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
assert.equal(receipt.assertionCoverage.length, 15);
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
for (const key of ['axe', 'screenshots', 'layouts', 'contentBounds', 'nodeIds', 'actions']) assert.equal(browser[key].length, 14, key);
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

assert.equal(browser.focus.length, 42);
assert.equal(browser.returnSemantics.length, 14);
assert.equal(browser.writingStates.length, 14);
for (const state of browser.returnSemantics) {
  assert.equal(state.buttons.length, 2);
  assert.ok(state.buttons[0].className.includes('circuit-lesson-writing-size-toggle'));
  assert.equal(state.buttons[1].className, 'circuit-lesson-evidence-return');
  assert.equal(state.buttons[1].text, 'Review saved readings');
  assert.equal(state.buttons[0].controls, state.fieldId);
  assert.equal(state.buttons[1].controls, state.targetId);
  assert.equal(state.targetInOwnLab, true);
  assert.equal(state.labelFor, state.fieldId);
  assert.deepEqual(state.describedBy, [state.helpId, state.countId]);
  assert.equal(state.iconHidden, 'true');
  assert.equal(state.iconFocusable, 'false');
  assert.equal(state.iconHasTitle, false);
  assert.equal(state.buttonFont, state.labelFont);
  assert.equal(state.buttonColor, state.labelColor);
  assert.equal(state.ordered, true);
  assert.ok(state.fieldScrollWidth <= state.fieldClientWidth + 1);
  assert.equal(state.maxLength, 4000);
}
for (const state of browser.writingStates) {
  assert.ok(['gain', 'limit', 'sensor'].includes(state.lesson));
  assert.equal(state.rows, state.expanded === 'true' ? 12 : 6);
  assert.equal(state.countLive, false);
  assert.equal(state.count, state.expectedCount + ' / 4000 characters');
  assert.ok(state.fieldWidth > 0 && state.fieldHeight > 0);
  assert.equal(state.inlineHeight, '');
}
assert.equal(browser.evidenceReturns.length, 12);
assert.deepEqual(browser.evidenceReturns.map(row => row.action), [
  'written-expanded-roundtrip', 'translated-return', 'live-edit-return', 'probe-return',
  'Load experiment baseline return', 'Load this experiment result return', 'Undo active edit return',
  'limit-selection-return', 'sensor-selection-return', 'imported-return', 'restored-return', 'rtl-return'
]);
for (const proof of browser.evidenceReturns) {
  assert.ok(['Enter', 'Space'].includes(proof.key));
  assert.equal(proof.label.trim(), proof.action === 'translated-return' ? 'Translated: Review saved readings' : 'Review saved readings');
  assert.ok(proof.target);
  for (const key of ['focusedResult', 'wholeDataUnchanged', 'savedReadingsUnchanged', 'explicitInstantScroll', 'targetVisible', 'sameNode', 'sameState', 'sameText', 'sameCaret', 'sameScroll']) assert.equal(proof[key], true, proof.action + ': ' + key);
  assert.ok([6, 12].includes(proof.rows));
}
assert.equal(browser.focusTransitions.length, 2);
assert.deepEqual(browser.focusTransitions.map(row => row.action), ['Write explanation', 'Review explanation']);
for (const proof of browser.focusTransitions) {
  assert.ok(['Enter', 'Space'].includes(proof.key));
  assert.ok(proof.id);
  for (const key of ['sameNode', 'stateUnchanged', 'caretPreserved', 'focused', 'instant']) assert.equal(proof[key], true);
}
assert.equal(browser.lifecycle.length, 4);
assert.deepEqual(browser.lifecycle.map(row => row.action), ['locale', 'live-probe-replay-undo', 'lesson-selection', 'actual-json-import-restore']);
for (const row of browser.lifecycle) {
  for (const value of Object.values(row)) if (typeof value === 'boolean') assert.equal(value, true);
  if (row.writingRows !== undefined) assert.equal(row.writingRows, 12);
}
assert.equal(browser.fieldContrast.length, 2);
for (const row of browser.fieldContrast) {
  assert.ok(row.value);
  assert.ok(Number.isFinite(row.ratio) && row.ratio >= 4.5);
}
assert.deepEqual(browser.readingOrder, [{ documentDirection: 'rtl', actualViewportWidth: 320, buttons: ['Expand writing space', 'Review saved readings'], direction: 'rtl' }]);
assert.ok(browser.motion.length > 0 && browser.motion.every(check => check.reduced && check.animations === 0));

const expectedShots = [
  'evidence-return-gain-1280.png', 'evidence-return-gain-390.png', 'evidence-return-gain-320.png',
  'evidence-return-limit-1280.png', 'evidence-return-limit-390.png', 'evidence-return-limit-320.png',
  'evidence-return-sensor-1280.png', 'evidence-return-sensor-390.png', 'evidence-return-sensor-320.png',
  'evidence-return-gain-200pct-text-320.png', 'evidence-return-sensor-200pct-text-320.png',
  'forced-colors-evidence-return-gain-320.png', 'forced-colors-evidence-return-sensor-320.png',
  'rtl-evidence-return-sensor-320.png'
];
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
const owned = [source, mirror, 'tests/circuit_evidence_return.test.js', path.relative(root, __dirname)];
const diff = spawnSync('git', ['diff', '--check', '--', ...owned], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(diff.status, 0, diff.stdout + diff.stderr);
const validation = {
  passed: true,
  validatedAt: new Date().toISOString(),
  sourceSha256: sourceHash,
  mirrored: true,
  sourceCompiles: true,
  regression: { passedTests: 265, files: 15, attempts: 15 },
  browser: {
    axeScans: browser.axe.length,
    fullContrastScans: ordinaryScans.length,
    forcedColorViews: forcedScans.length,
    focusChecks: browser.focus.length,
    nativeEvidenceReturns: browser.evidenceReturns.length,
    writingJumps: browser.focusTransitions.length,
    lifecycleChecks: browser.lifecycle.length,
    doubledFontMeasurements: browser.textResize.reduce((sum, check) => sum + check.elements, 0),
    screenshots: browser.screenshots.length,
    visualIssues: 0
  },
  reportHashes: Object.fromEntries(inputs.map(name => [name, hash(path.join(__dirname, name))])),
  screenshotHashes,
  visualReview,
  whitespaceCheck: true,
  commitAuthorized: true
};
fs.writeFileSync(path.join(__dirname, 'validation.json'), JSON.stringify(validation, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, sourceSha256: sourceHash, regression: validation.regression, browser: validation.browser }, null, 2));
