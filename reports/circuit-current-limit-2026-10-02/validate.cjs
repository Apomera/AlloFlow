const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const expectedSource = 'eb63c510e59a9aba7b6ae27cca7f4e3974fa983c8956d9d5283cf9631f25d8a7';
const expectedCounts = {
  'tests/circuit_lesson_current_limit.test.js': 19,
  'tests/circuit_active_electronics.test.js': 19,
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
assert.equal(receipt.attempts.length, 17);
assert.deepEqual(receipt.changedDuringRun, []);
assert.deepEqual(receipt.filesAtEnd, receipt.files);
assert.equal(receipt.runnerSha256AtEnd, receipt.runnerSha256);
assert.equal(receipt.runnerSha256, hash(path.join(__dirname, 'run-regression.cjs')));
assert.equal(regression.success, true);
assert.equal(regression.numPassedTests, 303);
assert.equal(regression.numFailedTests, 0);
assert.equal(regression.numPendingTests || 0, 0);
assert.equal(regression.testResults.length, 17);
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
assert.equal(receipt.assertionCoverage.length, 17);
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

const expectedScript = '6ad93022c43ae729030eb5f514cce9f643d66692bf30c587c61be6474764ca49';
assert.equal(browserHash, expectedScript);
for (const key of ['limitStates', 'barGeometry', 'numericIntegrity', 'focus']) assert.equal(browser[key].length, 14, key);
const cap = 4.8 / 220;
const sensor = light => {
  const resistance = 100000 * Math.pow(100, -light / 100);
  const junction = (5 / 10000 + .7 / 10000) / (1 / 10000 + 1 / resistance + 1 / 10000);
  return (junction - .7) / 10000 * 100;
};
const independent = { gain: [.003, .008], limit: [.026, .043], sensor: [sensor(80), sensor(20)] };
const inputs = { gain: ['Input: 1.00 V', 'Input: 1.50 V'], limit: ['Input: 3.30 V', 'Input: 5.00 V'], sensor: ['Relative light: 80 / 100', 'Relative light: 20 / 100'] };
const format = value => value === 0 ? '0 A' : Math.abs(value) < .001 ? (value * 1e6).toPrecision(3) + ' µA' : Math.abs(value) < 1 ? (value * 1000).toFixed(2) + ' mA' : value.toFixed(3) + ' A';
const near = (actual, expected, tolerance = 1e-12) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, actual + ' differs from ' + expected);
for (const view of browser.limitStates) {
  assert.ok(Object.hasOwn(independent, view.lesson));
  assert.equal(view.lessonData, view.lesson);
  assert.equal(view.open, true);
  assert.equal(view.summary, 'What sets the lamp current?');
  assert.equal(view.summaryFont, view.labelFont);
  assert.equal(view.summaryColor, view.labelColor);
  assert.equal(view.iconHidden, 'true'); assert.equal(view.iconFocusable, 'false');
  assert.equal(view.verticalDisplay, 'none');
  assert.ok(view.context.includes('saved Before and After') && view.context.includes('smaller term'));
  const maximum = Math.max(...independent[view.lesson], cap);
  near(view.maximum, maximum);
  assert.equal(view.scaleId, view.scaleTarget);
  assert.equal(view.scale, 'All four bars use one scale. Full width = ' + format(maximum) + '.');
  for (const phrase of ['not an additional flowing current', 'fixed lamp resistance', '0.20 V saturation voltage', 'comparisons use unrounded values']) assert.ok(view.note.includes(phrase));
  assert.ok(view.question);
  assert.deepEqual(view.cards.map(card => card.stage), ['before', 'after']);
  for (const [index, card] of view.cards.entries()) {
    const base = independent[view.lesson][index], actual = Math.min(base, cap), limiting = base < cap ? 'base' : base > cap ? 'lamp' : 'both';
    near(card.raw.base, base); near(card.raw.lamp, cap); near(card.raw.actual, actual);
    assert.equal(card.headingId, card.labelledBy);
    assert.equal(card.heading, index ? 'After' : 'Before');
    assert.equal(card.input, inputs[view.lesson][index]);
    assert.equal(card.limiting, limiting);
    assert.equal(card.decision, {base: 'The base-current term is smaller.', lamp: 'The lamp-path limit is smaller.', both: 'Both terms are equal: the saturation boundary.'}[limiting]);
    assert.deepEqual(card.terms.map(term => term.id), ['base', 'lamp']);
    for (const term of card.terms) {
      assert.equal(term.label, {base: 'Base-current term', lamp: 'Lamp-path limit'}[term.id]);
      assert.equal(term.formula, {base: 'β × IB', lamp: '(VCC − 0.20 V) / Rlamp'}[term.id]);
      assert.equal(term.formulaDirection, 'ltr');
      assert.equal(term.sets, String(term.id === limiting || limiting === 'both'));
      assert.equal(term.badge, term.sets === 'true' ? 'Sets the current' : null);
    }
    assert.deepEqual(card.readings.map(value => value.term), ['base', 'lamp', 'actual']);
    assert.deepEqual(card.readings.map(value => value.text), [format(base), format(cap), format(actual)]);
    for (const value of card.readings) {
      assert.equal(value.text, value.magnitude + ' ' + value.unit);
      assert.equal(value.whitespace, ' ');
      assert.equal(value.magnitudeFontSize, value.fontSize);
      assert.equal(value.magnitudeColor, value.color);
      assert.equal(value.magnitudeWhiteSpace, 'nowrap'); assert.equal(value.unitWhiteSpace, 'nowrap');
      assert.equal(value.direction, 'ltr'); assert.equal(value.bidi, 'isolate');
      near(parseFloat(value.unitFontSize), parseFloat(value.fontSize) * .8, .025);
    }
  }
}
const byView = (rows, view) => rows.find(row => row.name === view.name && row.width === view.width);
for (const geometry of browser.barGeometry) {
  const view = byView(browser.limitStates, geometry); assert.ok(view);
  const maximum = Math.max(...independent[view.lesson], cap);
  assert.equal(geometry.bars.length, 4);
  assert.deepEqual(geometry.bars.map(bar => [bar.stage, bar.term]), [['before', 'base'], ['before', 'lamp'], ['after', 'base'], ['after', 'lamp']]);
  for (const bar of geometry.bars) {
    const value = bar.term === 'base' ? independent[view.lesson][bar.stage === 'before' ? 0 : 1] : cap;
    near(bar.value, value); near(bar.maximum, maximum); near(bar.fraction, value / maximum);
    near(bar.inlinePercent, value / maximum * 100, .00011);
    assert.equal(bar.hidden, 'true');
    assert.ok(bar.trackContentWidth > 0);
    near(bar.expectedPixelWidth, bar.trackContentWidth * value / maximum, .001);
    near(bar.fillWidth, bar.expectedPixelWidth, 1);
    near(bar.trackContentWidth, geometry.bars[0].trackContentWidth, 1);
    assert.ok(['0px', 'auto'].includes(bar.minWidth));
  }
}
for (const view of browser.numericIntegrity) {
  assert.equal(view.readings.length, 6);
  for (const reading of view.readings) {
    assert.equal(reading.parts.length, 1);
    assert.equal(reading.parts[0].intact, true);
    assert.equal(reading.parts[0].rects.length, 1);
    assert.equal(reading.parts[0].lineCount, 1);
  }
}
assert.equal(browser.disclosure.length, 2);
assert.deepEqual(browser.disclosure[0].keys, ['Enter', 'Space', 'Enter']);
assert.deepEqual(browser.disclosure[1].keys, ['Space', 'Enter', 'Tab', 'Shift+Tab']);
for (const proof of browser.disclosure) for (const value of Object.values(proof)) if (typeof value === 'boolean') assert.equal(value, true);
assert.ok(browser.disclosure[1].scrollTop > 0);
assert.equal(browser.limitActions.length, 6);
assert.deepEqual(browser.limitActions.map(row => row.action), ['native-start-wrong-predict-test', 'live-input-and-probe', 'Load experiment baseline', 'Load this experiment result', 'Undo active edit', 'lesson-switch-return']);
for (const proof of browser.limitActions) {
  for (const value of Object.values(proof)) if (typeof value === 'boolean') assert.equal(value, true);
  if (proof.writingRows !== undefined) assert.equal(proof.writingRows, 12);
}
assert.equal(browser.lifecycle.length, 2);
assert.deepEqual(browser.lifecycle.map(row => row.action), ['locale-and-writing', 'actual-json-import-restore']);
for (const proof of browser.lifecycle) {
  for (const value of Object.values(proof)) if (typeof value === 'boolean') assert.equal(value, true);
  assert.equal(proof.writingRows, 12);
}
assert.equal(browser.instances.length, 1);
const instances = browser.instances[0]; assert.equal(instances.independentNativeDisclosure, true);
assert.equal(instances.instances.length, 2);
assert.equal(new Set(instances.instances.map(instance => instance.scaleId)).size, 2);
const cardIds = [];
for (const instance of instances.instances) {
  assert.equal(instance.scaleId, instance.describedby); assert.equal(instance.scaleLocal, true); assert.equal(instance.cards.length, 2);
  for (const card of instance.cards) { assert.equal(card.id, card.labelledby); assert.equal(card.local, true); cardIds.push(card.id); }
}
assert.equal(new Set(cardIds).size, 4);
assert.equal(browser.readingOrder.length, 1);
const rtl = browser.readingOrder[0]; assert.equal(rtl.documentDirection, 'rtl'); assert.equal(rtl.actualViewportWidth, 320); assert.equal(rtl.width, 320); assert.equal(rtl.readings.length, 6);
assert.ok(rtl.readings.every(value => value.direction === 'ltr' && value.bidi === 'isolate' && value.ordered));
assert.equal(browser.textResize.reduce((sum, view) => sum + view.fonts.length, 0), 142);
assert.equal(browser.forcedColors.reduce((sum, view) => sum + view.colors.length, 0), 70);
assert.ok(browser.motion.length > 0 && browser.motion.every(value => value.reduced && value.animations === 0));
const expectedShots = ['gain', 'limit', 'sensor'].flatMap(lesson => [1280, 390, 320].map(width => 'current-limit-' + lesson + '-' + width + '.png'))
  .concat(['gain', 'limit'].map(lesson => 'current-limit-' + lesson + '-200pct-text-320.png'))
  .concat(['gain', 'limit'].map(lesson => 'forced-colors-current-limit-' + lesson + '-320.png'))
  .concat(['rtl-current-limit-sensor-320.png']);
assert.deepEqual(browser.screenshots.map(shot => shot.file).sort(), expectedShots.slice().sort());
const screenshotHashes = {};
for (const shot of browser.screenshots) {
  assert.equal(path.basename(shot.file), shot.file);
  const file = path.join(__dirname, shot.file);
  assert.equal(fs.readFileSync(file).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  screenshotHashes[shot.file] = hash(file);
}
const visualReview = read('visual-review.json');
assert.equal(visualReview.passed, true); assert.equal(visualReview.sourceSha256, sourceHash);
assert.equal(visualReview.screenshotsReviewedByCircuitUI, 14);
assert.equal(visualReview.rootInspected.length, 6);
for (const file of visualReview.rootInspected) assert.ok(expectedShots.includes(file));
assert.equal(visualReview.independentModelReview.passed, true);
assert.equal(visualReview.independentModelReview.sourceSha256, sourceHash);
const collect = folder => fs.readdirSync(folder, {withFileTypes:true}).flatMap(entry => {
  const file = path.join(folder, entry.name);
  return entry.isDirectory() ? collect(file) : [path.relative(__dirname, file).replace(/\\/g, '/')];
});
const reportInputs = collect(__dirname).filter(name => name !== 'validation.json').sort();
for (const name of reportInputs.filter(name => /\.(?:md|cjs|json|txt)$/.test(name))) {
  const content = fs.readFileSync(path.join(__dirname, name), 'utf8');
  assert.ok(!content.includes('\uFFFD'), 'Invalid UTF-8: ' + name);
  assert.ok(!/[ \t]+(?:\r?\n|$)/.test(content), 'Trailing whitespace: ' + name);
}
const owned = [source, mirror, 'tests/circuit_lesson_current_limit.test.js', path.relative(root, __dirname)];
const diff = spawnSync('git', ['diff', '--check', '--', ...owned], {cwd:root,encoding:'utf8',windowsHide:true});
assert.equal(diff.status, 0, diff.stdout + diff.stderr);
const validation = {
  passed:true, validatedAt:new Date().toISOString(), sourceSha256:sourceHash, mirrored:true, sourceCompiles:true,
  regression:{passedTests:303,files:17,attempts:17},
  browser:{axeScans:browser.axe.length,fullContrastScans:ordinaryScans.length,forcedColorViews:forcedScans.length,focusChecks:browser.focus.length,
    comparisonViews:browser.limitStates.length,proportionalBars:browser.barGeometry.reduce((sum,view)=>sum+view.bars.length,0),
    intactMagnitudes:browser.numericIntegrity.reduce((sum,view)=>sum+view.readings.length,0),nativeDisclosureChecks:browser.disclosure.length,
    workflows:browser.limitActions.length,lifecycleChecks:browser.lifecycle.length,twoInstanceChecks:browser.instances.length,
    doubledFontMeasurements:browser.textResize.reduce((sum,view)=>sum+view.fonts.length,0),screenshots:browser.screenshots.length,visualIssues:0},
  reportHashes:Object.fromEntries(reportInputs.map(name=>[name,hash(path.join(__dirname,name))])),screenshotHashes,visualReview,whitespaceCheck:true,commitAuthorized:true
};
fs.writeFileSync(path.join(__dirname,'validation.json'),JSON.stringify(validation,null,2)+'\n');
console.log(JSON.stringify({passed:true,sourceSha256:sourceHash,regression:validation.regression,browser:validation.browser},null,2));
