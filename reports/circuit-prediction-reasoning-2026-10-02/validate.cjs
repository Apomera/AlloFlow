const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const expectedSource = 'b207d09a0e834d5abeae5fba88f8303e3e457189ba58088677af6f05e3d543fa';
const expectedCounts = {
  'tests/circuit_prediction_reasoning.test.js': 15,
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
assert.equal(receipt.attempts.length, 18);
assert.deepEqual(receipt.changedDuringRun, []);
assert.deepEqual(receipt.filesAtEnd, receipt.files);
assert.equal(receipt.runnerSha256AtEnd, receipt.runnerSha256);
assert.equal(receipt.runnerSha256, hash(path.join(__dirname, 'run-regression.cjs')));
assert.equal(regression.success, true);
assert.equal(regression.numPassedTests, 318);
assert.equal(regression.numFailedTests, 0);
assert.equal(regression.numPendingTests || 0, 0);
assert.equal(regression.testResults.length, 18);
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
assert.equal(receipt.assertionCoverage.length, 18);
for (const proof of receipt.assertionCoverage) {
  const file = completed.find(file => relative(file.name) === proof.file);
  assert.ok(file);
  assert.equal(proof.count, expectedCounts[proof.file]);
  assert.deepEqual(proof.fullNames, file.assertionResults.map(test => test.fullName));
}

const product = fs.readFileSync(path.join(root, source), 'utf8');
let previous = product;
function reverseOnce(current, original) {
  assert.equal(previous.split(current).length, 2, 'Unexpected source anchor count');
  previous = previous.replace(current, original);
}
for (const line of [
  "  var writingLabel=tested?t('stem.circuit.active_my_lesson_explanation','My explanation for this experiment'):t('stem.circuit.active_my_prediction_reasoning','My prediction reasoning (optional)');",
  "  var writingHelp=tested?t('stem.circuit.active_explanation_help','Use the lamp current and operating regions to explain the change. This response stays with this experiment; your investigation notebook has its own explanation.'):t('stem.circuit.active_prediction_reasoning_help','Explain why you expect the lamp current to change or stay the same. Writing is optional. After Test, use the saved readings to revise it. Your investigation notebook has its own explanation.');",
  "  var writingPlaceholder=tested?t('stem.circuit.active_lesson_explanation_placeholder','I observed… The readings show…'):t('stem.circuit.active_prediction_reasoning_placeholder','I predict… because…');"
]) reverseOnce(line + '\r\n', '');
reverseOnce("h('label',{className:'circuit-active-lesson-explanation',htmlFor:uid+'-explanation'},writingLabel)", "h('label',{className:'circuit-active-lesson-explanation',htmlFor:uid+'-explanation'},t('stem.circuit.active_my_lesson_explanation','My explanation for this experiment'))");
reverseOnce("h('p',{id:uid+'-explanation-help',className:'circuit-active-lesson-help'},writingHelp)", "h('p',{id:uid+'-explanation-help',className:'circuit-active-lesson-help'},t('stem.circuit.active_explanation_help','Use the lamp current and operating regions to explain the change. This response stays with this experiment; your investigation notebook has its own explanation.'))");
reverseOnce("'aria-label':tested?t('stem.circuit.transistor_experiment_explanation','Transistor experiment explanation'):writingLabel", "'aria-label':t('stem.circuit.transistor_experiment_explanation','Transistor experiment explanation')");
reverseOnce("placeholder:writingPlaceholder", "placeholder:t('stem.circuit.active_lesson_explanation_placeholder','I observed… The readings show…')");
const previousSourceSha256 = crypto.createHash('sha256').update(previous).digest('hex');
assert.equal(previousSourceSha256, 'eb63c510e59a9aba7b6ae27cca7f4e3974fa983c8956d9d5283cf9631f25d8a7', 'Previous uncommitted current-limit improvement was changed');

const priorReceiptPath = path.join(__dirname, '../circuit-current-limit-2026-10-02/regression-receipt.json');
assert.equal(hash(priorReceiptPath), '25da130579acba34326ff7d665cf3971900fb3d9238953284d61f9ec65a1b692');
const priorFiles = JSON.parse(fs.readFileSync(priorReceiptPath, 'utf8')).files;
const compatibilityEdits = {
  'tests/circuit_lesson_journey.test.js': [
    "const field = () => lab().querySelector('.circuit-lesson-writing-field');",
    'const field = () => lab().querySelector(\'textarea[aria-label="Transistor experiment explanation"]\');'
  ],
  'tests/circuit_lesson_writing_space.test.js': [
    "expect(heading.querySelector('label').textContent).toBe(tested ? 'My explanation for this experiment' : 'My prediction reasoning (optional)');",
    "expect(heading.querySelector('label').textContent).toBe('My explanation for this experiment');"
  ]
};
for (const [file, priorHash] of Object.entries(priorFiles).filter(([file]) => file.startsWith('tests/'))) {
  let text = fs.readFileSync(path.join(root, file), 'utf8');
  if (compatibilityEdits[file]) {
    const [current, original] = compatibilityEdits[file];
    assert.equal(text.split(current).length, 2);
    text = text.replace(current, original);
  }
  if (file === 'tests/circuit_lesson_writing_space.test.js') {
    const current = "expect(described[0].textContent.toLowerCase()).toContain('your investigation notebook has its own explanation');";
    const original = "expect(described[0].textContent).toContain('your investigation notebook has its own explanation');";
    assert.equal(text.split(current).length, 2);
    text = text.replace(current, original);
  }
  assert.equal(crypto.createHash('sha256').update(text).digest('hex'), priorHash, 'Existing test changed beyond compatibility: ' + file);
}
const independentReview = read('independent-review.json');
assert.equal(independentReview.passed, true);
assert.equal(independentReview.sourceSha256, sourceHash);
assert.equal(independentReview.reviewer, 'circuit_journey');
assert.deepEqual(independentReview.materialIssues, []);

const first = read('initial-attempt/regression-file-01-circuit_prediction_reasoning-receipt.json');
const firstRaw = read('initial-attempt/regression-file-01-circuit_prediction_reasoning.json');
assert.equal(first.exitCode, 1);
assert.deepEqual(first.filesAtEnd, first.files);
assert.deepEqual(first.changedDuringRun, []);
assert.equal(first.files[source], sourceHash);
assert.equal(first.files[mirror], sourceHash);
assert.equal(firstRaw.success, false);
assert.equal(firstRaw.numPassedTests, 14);
assert.equal(firstRaw.numFailedTests, 1);
assert.equal(firstRaw.numTotalTests, 15);
assert.equal(firstRaw.testResults.length, 1);
assert.equal(firstRaw.testResults[0].assertionResults.filter(test => test.status === 'failed').length, 1);
assert.ok(firstRaw.testResults[0].assertionResults.find(test => test.status === 'failed').fullName.includes('waits for a started record'));
for (const kind of ['report', 'stdout', 'stderr']) assert.equal(hash(path.join(__dirname, 'initial-attempt', first[kind])), first[kind + 'Sha256']);
assert.equal(hash(path.join(__dirname, 'initial-attempt/run-regression.cjs')), first.runnerSha256);
assert.equal(first.runnerSha256AtEnd, first.runnerSha256);
const initialTest = fs.readFileSync(path.join(__dirname, 'initial-attempt/circuit_prediction_reasoning.test.js'), 'utf8');
assert.equal(crypto.createHash('sha256').update(initialTest).digest('hex'), first.files['tests/circuit_prediction_reasoning.test.js']);
assert.equal(first.runnerSha256, receipt.runnerSha256);
const finalTest = fs.readFileSync(path.join(root, 'tests/circuit_prediction_reasoning.test.js'), 'utf8');
const originalAssertion = 'expect(translations.map(row => row[0])).not.toContain(predictionKeys[0]);';
const correctedAssertion = "expect(lab().textContent).not.toContain(copy.prediction.label);";
assert.equal(initialTest.split(originalAssertion).length, 2);
assert.equal(initialTest.replace(originalAssertion, correctedAssertion), finalTest, 'Only the overstrict translation-call assertion may change');

for (const directory of ['initial-attempt', 'before-help-assertion-correction']) {
  const metadata = read(directory + '/correction-metadata.json');
  assert.equal(metadata.sourceSha256, sourceHash);
  assert.equal(metadata.productUnchanged, true);
  assert.equal(metadata.timeoutsUnchanged, true);
  assert.equal(metadata.files.length, directory === 'initial-attempt' ? 7 : 63);
  for (const artifact of metadata.files) {
    assert.equal(path.basename(artifact.name), artifact.name);
    assert.equal(hash(path.join(__dirname, directory, artifact.name)), artifact.sha256);
  }
}
const secondDirectory = path.join(__dirname, 'before-help-assertion-correction');
const oldWritingPath = path.join(secondDirectory, 'circuit_lesson_writing_space.test.js');
const oldWriting = fs.readFileSync(oldWritingPath, 'utf8');
assert.equal(hash(oldWritingPath), '314c6e0e0656b2c464faa4148d0f84e3a220ffadb7a6b729fa25fed0725ac783');
const oldHelpAssertion = "expect(described[0].textContent).toContain('your investigation notebook has its own explanation');";
const newHelpAssertion = "expect(described[0].textContent.toLowerCase()).toContain('your investigation notebook has its own explanation');";
assert.equal(oldWriting.split(oldHelpAssertion).length, 2);
assert.equal(oldWriting.replace(oldHelpAssertion, newHelpAssertion), fs.readFileSync(path.join(root, 'tests/circuit_lesson_writing_space.test.js'), 'utf8'));
assert.equal(hash(path.join(secondDirectory, 'circuit_prediction_reasoning.test.js')), hash(path.join(root, 'tests/circuit_prediction_reasoning.test.js')));
assert.equal(hash(path.join(secondDirectory, 'run-regression.cjs')), receipt.runnerSha256);
const secondReceipts = fs.readdirSync(secondDirectory).filter(name => /^regression-file-\d{2}-.+-receipt\.json$/.test(name)).sort();
assert.equal(secondReceipts.length, 12);
let secondTotal = 0, secondPassed = 0, secondFailed = 0;
for (const name of secondReceipts) {
  const attempt = read('before-help-assertion-correction/' + name);
  assert.equal(attempt.runnerSha256, receipt.runnerSha256);
  assert.equal(attempt.runnerSha256AtEnd, receipt.runnerSha256);
  assert.deepEqual(attempt.filesAtEnd, attempt.files);
  assert.deepEqual(attempt.changedDuringRun, []);
  assert.deepEqual(attempt.files, { ...receipt.files, 'tests/circuit_lesson_writing_space.test.js': hash(oldWritingPath) });
  for (const flag of ['--pool=forks', '--maxWorkers=1', '--testTimeout=30000', '--hookTimeout=60000']) assert.ok(attempt.command.includes(flag));
  for (const kind of ['report', 'stdout', 'stderr']) assert.equal(hash(path.join(secondDirectory, attempt[kind])), attempt[kind + 'Sha256']);
  const raw = read('before-help-assertion-correction/' + attempt.report);
  assert.equal(raw.testResults.length, 1);
  const file = raw.testResults[0], fileName = relative(file.name);
  assert.deepEqual(attempt.command.filter(argument => argument.startsWith('tests/')), [fileName]);
  assert.equal(file.assertionResults.length, expectedCounts[fileName]);
  const failed = fileName === 'tests/circuit_lesson_writing_space.test.js';
  assert.equal(attempt.exitCode, failed ? 1 : 0);
  assert.equal(raw.success, !failed);
  assert.equal(raw.numFailedTests, failed ? 1 : 0);
  assert.equal(raw.numPassedTests, expectedCounts[fileName] - (failed ? 1 : 0));
  if (failed) assert.ok(file.assertionResults.find(test => test.status === 'failed').fullName.includes('tested=false'));
  else assert.ok(file.assertionResults.every(test => test.status === 'passed'));
  secondTotal += raw.numTotalTests; secondPassed += raw.numPassedTests; secondFailed += raw.numFailedTests;
}
assert.equal(secondTotal, 233);
assert.equal(secondPassed, 232);
assert.equal(secondFailed, 1);

if (!fs.existsSync(path.join(__dirname, 'browser-results.json'))) {
  const preflight = read('browser-preflight-failure.json');
  const validation = {
    passed: false,
    status: 'browser_verification_pending',
    productPassed: true,
    regressionPassed: true,
    sourceSha256: sourceHash,
    mirrorSha256: hash(path.join(root, mirror)),
    previousUncommittedSourcePreserved: previousSourceSha256,
    regression: { passedTests: regression.numPassedTests, files: regression.testResults.length, attempts: receipt.attempts.length },
    archivedTestCorrections: 2,
    browser: { status: 'blocked', reason: 'Insufficient system-drive space; preflight stopped before Node or Chromium launched.', preflight },
    artifacts: { regressionSha256: hash(path.join(__dirname, 'regression.json')), regressionReceiptSha256: hash(path.join(__dirname, 'regression-receipt.json')), independentReviewSha256: hash(path.join(__dirname, 'independent-review.json')), validatorSha256: hash(__filename) }
  };
  const diff = spawnSync('git', ['diff', '--check', '--', source, mirror, ...Object.keys(expectedCounts)], { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  assert.equal(diff.status, 0, diff.stdout + diff.stderr);
  fs.writeFileSync(path.join(__dirname, 'validation.json'), JSON.stringify(validation, null, 2) + '\n');
  console.log(JSON.stringify(validation, null, 2));
  process.exitCode = 2;
} else {
const browser = read('browser-results.json');
assert.equal(browser.passed, true);
assert.deepEqual(browser.errors, []);
assert.deepEqual(browser.visualIssues, []);
for (const key of ['sourceSha256', 'sourceSha256AtEnd', 'mirrorSha256', 'mirrorSha256AtEnd']) assert.equal(browser[key], sourceHash);
assert.equal(browser.sourceChangedDuringRun, false);
assert.equal(browser.mirrorMatches, true);
assert.equal(browser.scriptChangedDuringRun, false);
assert.equal(browser.scriptSha256, '0518b3f3b88e6bebc615540b57d0e9a82bafd6c219f608e1a4fb5358f23ed2c0');
assert.equal(browser.scriptSha256, hash(path.join(__dirname, 'browser-check.cjs')));
assert.equal(browser.scriptSha256AtEnd, browser.scriptSha256);

const expectedViews = [];
for (const lesson of ['gain', 'limit', 'sensor']) for (const width of [1280, 390, 320]) expectedViews.push({ name: 'prediction-reasoning-' + lesson, width, scale: 1, forced: false });
for (const lesson of ['gain', 'sensor']) expectedViews.push({ name: 'prediction-reasoning-' + lesson + '-200pct-text', width: 320, scale: 2, forced: false });
for (const lesson of ['gain', 'sensor']) expectedViews.push({ name: 'forced-colors-prediction-reasoning-' + lesson, width: 320, scale: 1, forced: true });
expectedViews.push({ name: 'tested-reasoning-wrong-choice', width: 390, scale: 1, forced: false });
const viewKey = view => view.name + '|' + view.width;
for (const key of ['axe', 'layouts', 'contentBounds', 'actions', 'nodeIds', 'writingStates', 'reasoningStates', 'fieldContrast', 'screenshots']) {
  assert.equal(browser[key].length, expectedViews.length, key);
  assert.deepEqual(browser[key].map(viewKey).sort(), expectedViews.map(viewKey).sort(), key);
}
const prediction = {
  label: 'My prediction reasoning (optional)',
  help: 'Explain why you expect the lamp current to change or stay the same. Writing is optional. After Test, use the saved readings to revise it. Your investigation notebook has its own explanation.',
  placeholder: 'I predict… because…'
};
const explanation = {
  label: 'My explanation for this experiment',
  help: 'Use the lamp current and operating regions to explain the change. This response stays with this experiment; your investigation notebook has its own explanation.',
  placeholder: 'I observed… The readings show…'
};
for (const view of expectedViews) {
  const find = key => browser[key].find(row => viewKey(row) === viewKey(view));
  const axe = find('axe'), layout = find('layouts'), bounds = find('contentBounds'), actions = find('actions'), writing = find('writingStates'), reasoning = find('reasoningStates'), contrast = find('fieldContrast');
  assert.deepEqual(axe.violations, []);
  assert.equal(axe.forcedColors, view.forced);
  assert.deepEqual(axe.excludedRules, view.forced ? ['color-contrast'] : []);
  if (view.forced) assert.ok(axe.exclusionReason.includes('axe 4.12.1'));
  assert.equal(layout.scale, view.scale);
  assert.ok(layout.scrollWidth <= view.width + 1);
  assert.deepEqual(find('nodeIds').duplicates, []);
  assert.ok(bounds.cards.length >= 6);
  for (const card of bounds.cards) {
    assert.deepEqual(card.violations, []);
    assert.ok(card.scrollWidth <= card.clientWidth + 1);
    assert.ok(card.lines.length);
    for (const line of card.lines) assert.ok(line.left >= card.left - 1 && line.right <= card.right + 1);
  }
  assert.ok(actions.actions.length);
  for (const action of actions.actions) {
    assert.ok(action.width >= 43.9 && action.height >= 43.9);
    for (const duration of action.transitionDuration.split(',')) assert.ok(parseFloat(duration) * (duration.trim().endsWith('ms') ? .001 : 1) <= .0000101);
  }
  const tested = view.name === 'tested-reasoning-wrong-choice', copy = tested ? explanation : prediction;
  assert.equal(reasoning.tested, tested);
  assert.equal(reasoning.label, copy.label);
  assert.equal(reasoning.accessibleName, tested ? 'Transistor experiment explanation' : copy.label);
  assert.equal(reasoning.help, copy.help);
  assert.equal(reasoning.placeholder, copy.placeholder);
  assert.equal(reasoning.id, reasoning.htmlFor);
  assert.equal(reasoning.id, reasoning.sizeControls);
  assert.deepEqual(reasoning.describedBy, [reasoning.helpId, reasoning.countId]);
  assert.equal(reasoning.value, reasoning.explanation);
  assert.equal(reasoning.count, reasoning.value.length + ' / 4000 characters');
  assert.equal(reasoning.countLive, false);
  assert.equal(reasoning.maxLength, 4000);
  assert.equal(reasoning.returnCount, tested ? 1 : 0);
  assert.equal(reasoning.guideCount, tested ? 1 : 0);
  assert.ok(reasoning.fieldScrollWidth <= reasoning.fieldClientWidth + 1);
  if (!tested) {
    assert.equal(reasoning.choice, null);
    assert.equal(reasoning.phase, 'predict');
    assert.ok(!reasoning.currentSteps.includes('explain'));
  } else assert.equal(reasoning.choice, 'less');
  assert.equal(writing.rows, writing.expanded === 'true' ? 12 : 6);
  assert.equal(writing.rows, reasoning.rows);
  assert.equal(writing.countLive, false);
  assert.equal(contrast.forced, view.forced);
  assert.ok(contrast.value.ratio >= 4.5);
  if (contrast.placeholderVisible) assert.ok(contrast.placeholder.ratio >= 4.5);
}
assert.equal(browser.focus.length, 28);
for (const focus of browser.focus) {
  assert.ok(expectedViews.some(view => viewKey(view) === viewKey(focus)));
  assert.equal(focus.visible, true);
  assert.equal(focus.focused, true);
  assert.equal(focus.focusVisible, true);
}
assert.equal(browser.textResize.length, 2);
for (const text of browser.textResize) {
  assert.equal(text.baselineViewportWidth, 320);
  assert.equal(text.scale, 2);
  assert.ok(text.fonts.length >= 6);
  for (const font of text.fonts) {
    assert.equal(font.normalFontSize, font.baselineFontSize);
    assert.equal(font.afterFontSize, font.normalFontSize * 2);
  }
}
assert.equal(browser.forcedColors.length, 2);
for (const proof of browser.forcedColors) {
  assert.equal(proof.active, true);
  assert.equal(proof.width, 320);
  assert.deepEqual(proof.violations, []);
  assert.ok(proof.colors.length);
  for (const color of proof.colors) assert.ok(Number.isFinite(color.ratio) && color.ratio + 1e-6 >= color.required);
}
assert.equal(browser.forcedColorsDiagnostic.file, '../circuit-explanation-guide-2026-10-01/forced-colors-diagnostic.json');
assert.equal(browser.forcedColorsDiagnostic.sha256, '211de59d56f77fdc793293b7bf74730196b3c21d386fd35a6d95387022fbe8d5');
assert.equal(hash(path.join(__dirname, browser.forcedColorsDiagnostic.file)), browser.forcedColorsDiagnostic.sha256);

assert.deepEqual(browser.labelFocus, [{ nativeLabelFocus: true, nativeTabFromSizeToField: true, wholeDataUnchanged: true }]);
assert.equal(browser.transitions.length, 2);
assert.deepEqual(browser.transitions[0], { action: 'native-draft-predict-test', keys: ['Space', 'Enter'], sameNode: true, sameDraft: true, sameBackwardSelection: true, rows: 12, wrongChoicePreserved: true, testedCopy: true, independentNotebookPreserved: true });
assert.deepEqual(browser.transitions[1], { action: 'empty-draft-test', writingRequired: false, sameNode: true, emptyValue: true, testedCopy: true });
assert.equal(browser.lifecycle.length, 3);
const locale = browser.lifecycle.find(proof => proof.action === 'locale-semantic-keys');
assert.equal(locale.wholeDataUnchanged, true);
assert.equal(locale.sameNodeAndCaret, true);
assert.equal(locale.noAutomaticNavigation, true);
for (const [key, value] of Object.entries({
  'stem.circuit.active_my_prediction_reasoning': prediction.label,
  'stem.circuit.active_prediction_reasoning_help': prediction.help,
  'stem.circuit.active_prediction_reasoning_placeholder': prediction.placeholder
})) assert.equal(locale.keys[key], value);
assert.deepEqual(browser.lifecycle.find(proof => proof.action === 'lesson-drafts'), { action: 'lesson-drafts', separateDraftsPreserved: true, pretestCopy: true, rows: 12 });
assert.deepEqual(browser.lifecycle.find(proof => proof.action === 'actual-json-reload-restore'), { action: 'actual-json-reload-restore', draftRestored: true, optionalCopy: true, noAutomaticNavigation: true, rows: 12 });
assert.equal(browser.instances.length, 1);
const instance = browser.instances[0];
assert.equal(instance.nativeLabelScoped, true);
assert.equal(instance.firstToolUnchanged, true);
assert.equal(instance.instances.length, 2);
assert.notEqual(instance.instances[0].id, instance.instances[1].id);
for (const item of instance.instances) {
  assert.equal(item.id, item.labelFor);
  assert.equal(item.name, prediction.label);
  assert.equal(item.describedLocally, true);
  assert.equal(item.describedBy.length, 2);
}
assert.deepEqual(browser.motion, [{ reduced: true, animations: 0 }]);

const visualReview = read('visual-review.json');
assert.equal(visualReview.passed, true);
assert.equal(visualReview.sourceSha256, sourceHash);
assert.equal(visualReview.screenshotsReviewedByCircuitUI, 14);
assert.ok(visualReview.rootInspected.length >= 5);
assert.deepEqual(visualReview.materialIssues, []);
const pngProof = [];
for (const screenshot of browser.screenshots) {
  assert.equal(path.basename(screenshot.file), screenshot.file);
  const file = path.join(__dirname, screenshot.file), png = fs.readFileSync(file);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0);
  assert.equal(visualReview.screenshotSha256[screenshot.file], hash(file));
  pngProof.push({ file: screenshot.file, sha256: hash(file), width: png.readUInt32BE(16), height: png.readUInt32BE(20) });
}
for (const name of visualReview.rootInspected) assert.ok(pngProof.some(png => png.file === name));

function reportFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? reportFiles(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
for (const file of reportFiles(__dirname).filter(file => /\.(?:md|cjs|js|json|txt)$/.test(file))) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file));
  assert.ok(!text.includes('\uFFFD'), 'Replacement character in report: ' + file);
  assert.ok(!/[ \t]+$/m.test(text), 'Trailing whitespace in report: ' + file);
}
const diff = spawnSync('git', ['diff', '--check', '--', source, mirror, ...Object.keys(expectedCounts)], { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
assert.equal(diff.status, 0, diff.stdout + diff.stderr);
const validation = {
  passed: true,
  sourceSha256: sourceHash,
  mirrorSha256: hash(path.join(root, mirror)),
  previousUncommittedSourcePreserved: previousSourceSha256,
  regression: { passedTests: regression.numPassedTests, files: regression.testResults.length, attempts: receipt.attempts.length },
  archivedTestCorrections: 2,
  browser: {
    views: browser.screenshots.length,
    visibleFocusChecks: browser.focus.length,
    measuredFontsAtTwiceNormal: browser.textResize.reduce((count, row) => count + row.fonts.length, 0),
    nativeTestTransitions: browser.transitions.length,
    lifecycleChecks: browser.lifecycle.length,
    rootInspectedScreenshots: visualReview.rootInspected.length,
    reviewerInspectedScreenshots: visualReview.screenshotsReviewedByCircuitUI
  },
  artifacts: {
    regressionSha256: hash(path.join(__dirname, 'regression.json')),
    regressionReceiptSha256: hash(path.join(__dirname, 'regression-receipt.json')),
    browserResultsSha256: hash(path.join(__dirname, 'browser-results.json')),
    visualReviewSha256: hash(path.join(__dirname, 'visual-review.json')),
    independentReviewSha256: hash(path.join(__dirname, 'independent-review.json')),
    validatorSha256: hash(__filename),
    screenshots: pngProof
  }
};
fs.writeFileSync(path.join(__dirname, 'validation.json'), JSON.stringify(validation, null, 2) + '\n');
console.log(JSON.stringify(validation, null, 2));


}
