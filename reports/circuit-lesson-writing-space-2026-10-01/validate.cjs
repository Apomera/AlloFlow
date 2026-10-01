const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const expectedSource = '6c61943ab672e958f0b93afd69487231e2604a30af53c78705a85f1ce3591e84';
const expectedCounts = {
  'tests/circuit_lesson_writing_space.test.js': 19,
  'tests/circuit_explanation_guide.test.js': 20,
  'tests/circuit_lesson_journey.test.js': 27,
  'tests/circuit_lesson_continuation.test.js': 20,
  'tests/circuit_active_lesson_records.test.js': 20,
  'tests/circuit_active_notebook_continuity.test.js': 16,
  'tests/circuit_evidence_writing.test.js': 22,
  'tests/circuit_localization.test.js': 4,
  'tests/circuit_a11y.test.js': 3,
  'tests/circuit_lesson_navigation.test.js': 13,
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
assert.deepEqual(receipt.changedDuringRun, []);
assert.equal(receipt.mode, 'isolated-per-file-processes');
assert.equal(receipt.aggregate, true);
assert.equal(receipt.attempts.length, 11);
assert.deepEqual(receipt.filesAtEnd, receipt.files);
assert.equal(receipt.runnerSha256AtEnd, receipt.runnerSha256);
assert.equal(regression.success, true);
assert.equal(regression.numPassedTests, 168);
assert.equal(regression.numFailedTests, 0);
assert.equal(regression.numPendingTests || 0, 0);
assert.equal(regression.testResults.length, 11);
assert.deepEqual(Object.keys(receipt.files).filter(file => file.startsWith('tests/')).sort(), Object.keys(expectedCounts).sort());
for (const [file, expected] of Object.entries(receipt.files)) {
  assert.equal(hash(path.join(root, file)), expected, 'Tested file changed: ' + file);
}
assert.equal(receipt.runnerSha256, hash(path.join(__dirname, 'run-regression-isolated.cjs')));
const failed = receipt.initialFailedAttempt;
assert.equal(failed.coverageIncluded, false);
assert.equal(failed.exitCode, 3221226505);
for (const kind of ['receipt', 'runner', 'stdout', 'stderr']) {
  assert.equal(path.basename(failed[kind]), failed[kind]);
  assert.equal(hash(path.join(__dirname, failed[kind])), failed[kind + 'Sha256']);
}
const failedReceipt = read(failed.receipt);
assert.equal(failedReceipt.exitCode, failed.exitCode);
assert.equal(failedReceipt.reportSha256, null);
assert.deepEqual(failedReceipt.changedDuringRun, []);
const completed = [];
const rawInputs = [];
for (const attempt of receipt.attempts) {
  assert.equal(attempt.exitCode, 0);
  assert.equal(attempt.runnerSha256AtEnd, receipt.runnerSha256);
  assert.equal(path.basename(attempt.report), attempt.report);
  assert.equal(hash(path.join(__dirname, attempt.report)), attempt.reportSha256);
  assert.deepEqual(attempt.files, receipt.files);
  assert.deepEqual(attempt.filesAtEnd, attempt.files);
  assert.deepEqual(attempt.changedDuringRun, []);
  assert.ok(attempt.command.includes('--pool=forks') && attempt.command.includes('--maxWorkers=1'));
  assert.ok(attempt.command.includes('--testTimeout=30000') && attempt.command.includes('--hookTimeout=60000'));
  for (const kind of ['stdout', 'stderr']) {
    assert.equal(path.basename(attempt[kind]), attempt[kind]);
    assert.equal(hash(path.join(__dirname, attempt[kind])), attempt[kind + 'Sha256']);
    rawInputs.push(attempt[kind]);
  }
  rawInputs.push(attempt.report);
  const raw = read(attempt.report);
  assert.equal(raw.success, true);
  assert.equal(raw.testResults.length, 1);
  assert.equal(raw.numFailedTests, 0);
  assert.deepEqual(attempt.command.filter(argument => argument.startsWith('tests/')), [relative(raw.testResults[0].name)]);
  for (const file of raw.testResults) {
    assert.ok(file.assertionResults.every(test => test.status === 'passed'));
    if (file.status === 'passed') completed.push(file);
  }
}
assert.equal(completed.length, 11);
assert.deepEqual(completed.map(file => relative(file.name)).sort(), Object.keys(expectedCounts).sort());
for (const file of completed) assert.equal(file.assertionResults.length, expectedCounts[relative(file.name)]);
const sortResults = rows => rows.slice().sort((a, b) => a.name.localeCompare(b.name));
assert.deepEqual(sortResults(regression.testResults), sortResults(completed));
assert.equal(completed.reduce((total, file) => total + file.assertionResults.length, 0), 168);
assert.equal(receipt.assertionCoverage.length, 11);
for (const proof of receipt.assertionCoverage) {
  const file = completed.find(file => relative(file.name) === proof.file);
  assert.ok(file);
  assert.equal(proof.count, expectedCounts[proof.file]);
  assert.deepEqual(proof.fullNames, file.assertionResults.map(test => test.fullName));
}

const browser = read('browser-results.json');
assert.equal(browser.passed, true);
for (const key of ['sourceSha256', 'sourceSha256AtEnd', 'mirrorSha256', 'mirrorSha256AtEnd']) {
  assert.equal(browser[key], sourceHash);
}
assert.equal(browser.sourceChangedDuringRun, false);
assert.equal(browser.mirrorMatches, true);
const browserHash = hash(path.join(__dirname, 'browser-check.cjs'));
assert.equal(browser.scriptSha256, browserHash);
assert.equal(browser.scriptSha256AtEnd, browserHash);
assert.equal(browser.scriptChangedDuringRun, false);
assert.deepEqual(browser.errors, []);
assert.deepEqual(browser.visualIssues, []);
for (const key of ['layouts', 'contentBounds', 'actions', 'nodeIds', 'writingStates']) assert.equal(browser[key].length, 12);
assert.ok(browser.layouts.every(check => check.scrollWidth <= check.width + 1));
assert.ok(browser.nodeIds.every(check => check.duplicates.length === 0));
for (const state of browser.writingStates) {
  assert.ok(['true', 'false'].includes(state.expanded));
  assert.equal(state.rows, state.expanded === 'true' ? 12 : 6);
  assert.equal(state.inlineHeight, '');
  assert.equal(state.countLive, false);
  assert.equal(state.count, state.expectedCount + ' / 4000 characters');
  assert.equal(state.fieldFontSize, state.scale === 2 ? '32px' : '16px');
  assert.ok(state.fieldWidth > 0 && state.fieldWidth <= state.width && state.fieldHeight > 0);
}
assert.equal(browser.writingToggles.length, 8);
for (const toggle of browser.writingToggles) {
  assert.ok(['Enter', 'Space'].includes(toggle.key));
  for (const key of ['sameNode', 'sameText', 'sameRange', 'sameState', 'buttonFocused', 'noScrollCall']) assert.equal(toggle[key], true);
  assert.equal(toggle.height, '');
  assert.equal(toggle.rows, toggle.expanded ? 12 : 6);
}
assert.ok(browser.writingToggles.some(toggle => toggle.heightBefore === '650px'));
assert.equal(browser.lifecycle.length, 3);
assert.deepEqual(browser.lifecycle.map(check => check.action), ['locale-live-edit-manual-resize', 'lesson-switch', 'actual-json-load-restore']);
for (const check of browser.lifecycle) assert.ok(Object.entries(check).filter(([key]) => key !== 'action').every(([, value]) => value === true));
assert.equal(browser.focusTransitions.length, 2);
assert.deepEqual(browser.focusTransitions.map(check => check.action), ['Write explanation', 'Review explanation']);
for (const check of browser.focusTransitions) for (const key of ['sameNode', 'stateUnchanged', 'focused', 'instant']) assert.equal(check[key], true);
assert.equal(browser.instances.length, 1);
const instance = browser.instances[0];
assert.equal(instance.independentExpansion, true);
assert.equal(instance.fields.length, 2);
assert.equal(new Set(instance.fields.map(field => field.id)).size, 2);
assert.equal(new Set(instance.fields.map(field => field.count)).size, 2);
assert.ok(instance.fields.every(field => field.controls === field.id && field.rows === 6));
assert.equal(browser.axe.length, 12);
assert.ok(browser.axe.every(scan => scan.violations.length === 0));
const ordinary = browser.axe.filter(scan => !scan.forcedColors);
const forced = browser.axe.filter(scan => scan.forcedColors);
assert.equal(ordinary.length, 10);
assert.ok(ordinary.every(scan => scan.excludedRules.length === 0));
assert.equal(forced.length, 2);
assert.ok(forced.every(scan => scan.excludedRules.length === 1 && scan.excludedRules[0] === 'color-contrast' && scan.exclusionReason));
assert.ok(browser.focus.length === 24 && browser.focus.every(check => check.visible));
assert.equal(browser.textResize.length, 2);
for (const check of browser.textResize) {
  assert.equal(check.scale, 2);
  assert.equal(check.baselineViewportWidth, 320);
  assert.ok(check.fonts.length > 0);
  assert.equal(check.elements, check.fonts.length);
  assert.equal(check.elements, 6);
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
assert.equal(browser.forcedColors.length, 2);
for (const review of browser.forcedColors) {
  assert.equal(review.active, true);
  assert.deepEqual(review.violations, []);
  assert.ok(review.colors.length > 0 && review.colors.every(color => Number.isFinite(color.ratio) && color.ratio >= color.required));
}
assert.ok(browser.motion.length > 0 && browser.motion.every(check => check.reduced && check.animations === 0));
assert.equal(browser.screenshots.length, 12);
assert.equal(new Set(browser.screenshots.map(shot => shot.file)).size, 12);
const screenshotHashes = {};
for (const shot of browser.screenshots) {
  assert.equal(path.basename(shot.file), shot.file);
  const file = path.join(__dirname, shot.file);
  assert.equal(fs.readFileSync(file).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  screenshotHashes[shot.file] = hash(file);
}
const inputs = fs.readdirSync(__dirname).filter(name => /\.(?:md|cjs|json|log)$/.test(name) && name !== 'validation.json').sort();
for (const name of rawInputs) assert.ok(inputs.includes(name));
for (const name of inputs.filter(name => !name.endsWith('.log'))) {
  const content = fs.readFileSync(path.join(__dirname, name), 'utf8');
  assert.ok(!content.includes('\uFFFD'), 'Invalid encoding: ' + name);
  assert.ok(!/[ \t]+(?:\r?\n|$)/.test(content), 'Trailing whitespace: ' + name);
}
const diff = spawnSync('git', ['diff', '--check', '--', source, mirror, ...Object.keys(expectedCounts)], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(diff.status, 0, diff.stdout + diff.stderr);
const staged = spawnSync('git', ['diff', '--cached', '--quiet', '--', source, mirror, 'tests/circuit_explanation_guide.test.js', 'tests/circuit_lesson_writing_space.test.js', path.relative(root, __dirname)], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(staged.status, 0, 'This round must remain unstaged and uncommitted.');
const validation = {
  passed: true,
  validatedAt: new Date().toISOString(),
  sourceSha256: sourceHash,
  mirrored: true,
  sourceCompiles: true,
  regression: { passedTests: 168, files: 11, attempts: receipt.attempts.length },
  browser: { axeScans: 12, fullContrastScans: 10, forcedColorsScans: 2, focusChecks: 24, keyboardToggles: 8, focusTransitions: 2, textResizeElements: 12, screenshots: 12, visualIssues: 0 },
  reportHashes: Object.fromEntries(inputs.map(name => [name, hash(path.join(__dirname, name))])),
  screenshotHashes,
  whitespaceCheck: true,
  ownedChangesUnstaged: true,
  commitRequested: false
};
fs.writeFileSync(path.join(__dirname, 'validation.json'), JSON.stringify(validation, null, 2));
console.log(JSON.stringify({ passed: true, sourceSha256: sourceHash, regression: validation.regression, browser: validation.browser }, null, 2));
