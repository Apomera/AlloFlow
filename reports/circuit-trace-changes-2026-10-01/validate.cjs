const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const expectedSource = '324026179f177a92b0c87817991a2fc2c425cdac8cfef80740bf4479e4fe1a28';
const expectedCounts = {
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
assert.equal(receipt.attempts.length, 14);
assert.deepEqual(receipt.changedDuringRun, []);
assert.deepEqual(receipt.filesAtEnd, receipt.files);
assert.equal(receipt.runnerSha256AtEnd, receipt.runnerSha256);
assert.equal(receipt.runnerSha256, hash(path.join(__dirname, 'run-regression.cjs')));
assert.equal(regression.success, true);
assert.equal(regression.numPassedTests, 250);
assert.equal(regression.numFailedTests, 0);
assert.equal(regression.numPendingTests || 0, 0);
assert.equal(regression.testResults.length, 14);
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
assert.equal(receipt.assertionCoverage.length, 14);
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
for (const key of ['axe', 'screenshots', 'layouts', 'contentBounds', 'nodeIds', 'numericIntegrity', 'traceGeometry', 'traceStates', 'actions', 'focus']) assert.equal(browser[key].length, 14, key);
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

const measurements = {
  gain: {
    baseCurrent: ['30.0 µA', '80.0 µA', '+50.0 µA'],
    collectorCurrent: ['3.00 mA', '8.00 mA', '+5.00 mA'],
    collectorVoltage: ['4.34V', '3.24V', '-1.10V']
  },
  limit: {
    baseCurrent: ['260 µA', '430 µA', '+170 µA'],
    collectorCurrent: ['21.82 mA', '21.82 mA', '0 A'],
    collectorVoltage: ['200.00 mV', '200.00 mV', '0.00V']
  },
  sensor: {
    baseCurrent: ['25.3 µA', '183 µA', '+158 µA'],
    collectorCurrent: ['2.53 mA', '18.32 mA', '+15.79 mA'],
    collectorVoltage: ['4.44V', '969.61 mV', '-3.47V'],
    driveVoltage: ['953.01 mV', '2.53V', '+1.58V']
  }
};
const labels = { baseCurrent: 'Base current', collectorCurrent: 'Lamp current', collectorVoltage: 'Collector–emitter voltage', driveVoltage: 'Connected divider junction voltage' };
for (const state of browser.traceStates) {
  const expected = measurements[state.lesson];
  assert.ok(expected);
  assert.equal(state.open, true);
  assert.equal(state.summary, 'Trace the change');
  assert.equal(state.readingsLabel, 'Saved experiment measurements');
  assert.equal(state.context, 'Readings from this experiment’s saved before and after circuits. Displayed values are rounded. Change = After − Before, using the unrounded readings.');
  assert.ok(state.question);
  assert.deepEqual(state.rows.map(row => row.key), Object.keys(expected));
  for (const row of state.rows) {
    assert.equal(row.label, labels[row.key]);
    assert.equal(row.difference, row.after - row.before);
    assert.deepEqual(row.cells.map(cell => cell.stage), ['before', 'after', 'change']);
    assert.deepEqual(row.cells.map(cell => cell.text), expected[row.key]);
    for (const cell of row.cells) {
      assert.equal(cell.label, { before: 'Before', after: 'After', change: 'Change' }[cell.stage]);
      assert.equal(cell.text, cell.magnitude + cell.whitespace + cell.unit);
      assert.match(cell.magnitude, /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i);
      assert.equal(cell.magnitudeFontSize, cell.fontSize);
      assert.equal(cell.magnitudeColor, cell.color);
      assert.equal(cell.magnitudeWhiteSpace, 'nowrap');
      assert.equal(cell.unitWhiteSpace, 'nowrap');
      assert.equal(cell.direction, 'ltr');
      assert.equal(cell.bidi, 'isolate');
      assert.ok(Math.abs(parseFloat(cell.unitFontSize) - parseFloat(cell.fontSize) * .8) < .025);
    }
  }
}
for (const view of browser.traceGeometry) {
  const state = browser.traceStates.find(state => state.name === view.name && state.width === view.width && state.scale === view.scale);
  assert.ok(state);
  assert.equal(view.rows.length, state.rows.length);
  for (const row of view.rows) {
    assert.deepEqual(row.cells.map(cell => cell.stage), ['before', 'after', 'change']);
    const change = row.cells[2];
    if (view.width <= 640) {
      assert.ok(Math.abs(change.left - row.left) <= 1);
      assert.ok(Math.abs(change.right - row.right) <= 1);
      assert.ok(change.top >= Math.max(row.cells[0].bottom, row.cells[1].bottom) - 1);
    } else assert.equal(row.columns.split(' ').length, 4);
  }
}
let numericCount = 0;
for (const view of browser.numericIntegrity) {
  const state = browser.traceStates.find(state => state.name === view.name && state.width === view.width && state.scale === view.scale);
  assert.ok(state);
  assert.equal(view.readings.length, state.rows.length * 3);
  for (const reading of view.readings) {
    assert.equal(reading.parts.length, 1);
    assert.equal(reading.parts[0].intact, true);
    assert.equal(reading.parts[0].lineCount, 1);
    numericCount++;
  }
}
assert.equal(numericCount, 144);
assert.equal(browser.readingOrder.length, 1);
assert.equal(browser.readingOrder[0].documentDirection, 'rtl');
assert.equal(browser.readingOrder[0].width, 320);
assert.equal(browser.readingOrder[0].actualViewportWidth, 320);
assert.equal(browser.readingOrder[0].readings.length, 12);
for (const row of browser.readingOrder[0].readings) {
  assert.equal(row.direction, 'ltr');
  assert.equal(row.bidi, 'isolate');
  const sameLine = Math.min(row.numberBottom, row.unitBottom) - Math.max(row.numberTop, row.unitTop) > Math.min(row.numberBottom - row.numberTop, row.unitBottom - row.unitTop) * .5;
  assert.equal(row.sameLine, sameLine);
  assert.equal(row.ordered, true);
  assert.equal(row.ordered, sameLine ? row.numberRight <= row.unitLeft + 1 : row.numberTop < row.unitTop);
}
assert.deepEqual(browser.disclosure, [{ keys: ['Enter', 'Space', 'Enter'], openedClosedReopened: true, focusStayedOnSummary: true, wholeDataUnchanged: true }]);
assert.equal(browser.traceActions.length, 6);
assert.deepEqual(browser.traceActions.map(row => row.action), ['native-start-wrong-predict-test', 'live-input-and-probe', 'Load experiment baseline', 'Load this experiment result', 'Undo active edit', 'lesson-switch-return']);
for (const row of browser.traceActions) for (const value of Object.values(row)) if (typeof value === 'boolean') assert.equal(value, true);
assert.equal(browser.lifecycle.length, 2);
assert.deepEqual(browser.lifecycle.map(row => row.action), ['locale-and-writing', 'actual-json-import-restore']);
for (const row of browser.lifecycle) {
  for (const value of Object.values(row)) if (typeof value === 'boolean') assert.equal(value, true);
  assert.equal(row.writingRows, 12);
}
assert.ok(browser.motion.length > 0 && browser.motion.every(check => check.reduced && check.animations === 0));

const expectedShots = ['saved-trace-gain-1280.png', 'saved-trace-gain-390.png', 'saved-trace-gain-320.png', 'saved-trace-limit-1280.png', 'saved-trace-limit-390.png', 'saved-trace-limit-320.png', 'saved-trace-sensor-1280.png', 'saved-trace-sensor-390.png', 'saved-trace-sensor-320.png', 'saved-trace-limit-200pct-text-320.png', 'saved-trace-sensor-200pct-text-320.png', 'forced-colors-saved-trace-gain-320.png', 'forced-colors-saved-trace-sensor-320.png', 'rtl-saved-trace-sensor-320.png'];
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
const owned = [source, mirror, 'tests/circuit_trace_changes.test.js', path.relative(root, __dirname)];
const diff = spawnSync('git', ['diff', '--check', '--', ...owned], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(diff.status, 0, diff.stdout + diff.stderr);
const validation = {
  passed: true,
  validatedAt: new Date().toISOString(),
  sourceSha256: sourceHash,
  mirrored: true,
  sourceCompiles: true,
  regression: { passedTests: 250, files: 14, attempts: 14 },
  browser: {
    axeScans: browser.axe.length,
    fullContrastScans: ordinaryScans.length,
    forcedColorViews: forcedScans.length,
    focusChecks: browser.focus.length,
    nativeWorkflowChecks: browser.traceActions.length,
    lifecycleChecks: browser.lifecycle.length,
    nativeDisclosureChecks: browser.disclosure.length,
    doubledFontMeasurements: browser.textResize.reduce((sum, check) => sum + check.elements, 0),
    intactNumericMagnitudes: numericCount,
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
