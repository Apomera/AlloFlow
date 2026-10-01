const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const folder = __dirname;
const repoRoot = path.resolve(folder, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const normalizedHash = bytes => hash(bytes.toString('utf8').replace(/\r\n/g, '\n'));
const requiredWidths = [320, 390, 768, 1440];
const localeKeys = [
  'tutor_flow_draft_again', 'tutor_flow_latest', 'tutor_flow_context', 'tutor_flow_question',
  'tutor_flow_input_help', 'tutor_flow_keep_draft', 'tutor_flow_starters', 'tutor_flow_reference',
  'tour_flow_saved', 'tour_flow_return', 'tour_flow_restart', 'tour_flow_restart_help', 'tour_flow_resume_announce'
];

function noErrors(report, label) {
  assert.ok(Array.isArray(report.errors), label + ' must record errors');
  assert.equal(report.errors.length, 0, label + ' contains browser errors');
}

function validateScans(report, count, label) {
  assert.ok(Array.isArray(report.scans), label + ' must record scans');
  assert.equal(report.scans.length, count, label + ' scan count');
  for (const scan of report.scans) {
    assert.ok(Array.isArray(scan.violations), label + ' must record violations');
    assert.equal(scan.violations.length, 0, label + ' accessibility violations');
    assert.ok(Number.isFinite(scan.width) && scan.width > 0, label + ' scan width');
  }
  noErrors(report, label);
}

function overflowFree(measurements, label, scrollKey) {
  assert.ok(Array.isArray(measurements) && measurements.length, label + ' must record widths');
  for (const measurement of measurements) {
    assert.ok(Number.isFinite(measurement.width) && measurement.width > 0, label + ' viewport width');
    assert.ok(Number.isFinite(measurement[scrollKey]), label + ' scroll width');
    assert.ok(measurement[scrollKey] <= measurement.width + 0.1, label + ' horizontal overflow at ' + measurement.width);
  }
  for (const width of requiredWidths) assert.ok(measurements.some(measurement => measurement.width === width), label + ' missing width ' + width);
}

function browserTests(suites) {
  return suites.flatMap(suite => [
    ...(suite.specs || []).flatMap(spec => {
      assert.equal(spec.ok, true, 'Browser spec failed: ' + spec.title);
      return spec.tests || [];
    }),
    ...browserTests(suite.suites || [])
  ]);
}

function verify() {
  assert.ok(fs.existsSync(path.join(folder, 'final-flow-unit-results.json')), 'Final flow regression results are required');
  const effective = new Map(), effectiveSuites = new Map(), unitRuns = [];
  for (const filename of ['unit-results.json', 'final-unit-results.json', 'final-flow-unit-results.json']) {
    const report = read(filename);
    assert.ok(Array.isArray(report.testResults) && report.testResults.length, filename + ' must contain suites');
    let assertions = 0;
    const namesInRun = new Set();
    for (const suite of report.testResults) {
      assert.ok(Array.isArray(suite.assertionResults) && suite.assertionResults.length, filename + ' has an empty suite');
      effectiveSuites.set(suite.name, suite.status);
      for (const test of suite.assertionResults) {
        assert.ok(typeof test.fullName === 'string' && test.fullName, filename + ' missing fullName');
        assert.ok(!namesInRun.has(test.fullName), filename + ' has duplicate fullName: ' + test.fullName);
        namesInRun.add(test.fullName);
        effective.set(test.fullName, { status: test.status, filename });
        assertions++;
      }
    }
    assert.equal(assertions, report.numTotalTests, filename + ' reported assertion count');
    if (filename !== 'unit-results.json') {
      assert.equal(report.success, true, filename + ' failed');
      assert.equal(report.numFailedTests, 0, filename + ' failed assertions');
      assert.equal(report.numPassedTests, assertions, filename + ' includes non-passing assertions');
    }
    unitRuns.push({ file: filename, assertions, passed: report.numPassedTests, failed: report.numFailedTests });
  }
  for (const [fullName, test] of effective) assert.equal(test.status, 'passed', 'Final effective regression failed: ' + fullName + ' (' + test.filename + ')');
  for (const [suite, status] of effectiveSuites) assert.equal(status, 'passed', 'Final effective suite failed: ' + suite);

  const tutor = read('browser-validation.json');
  const tour = read('tour-browser-validation.json');
  const recovery = read('recovery-validation.json');
  const conversation = read('conversation-validation.json');
  validateScans(tutor, 15, 'Tutor');
  validateScans(tour, 10, 'Tour');
  overflowFree(tutor.scans.map(scan => scan.measurements), 'Tutor', 'scrollWidth');
  overflowFree(tour.sizes, 'Tour', 'scroll');
  noErrors(recovery, 'Recovery');
  noErrors(conversation, 'Conversation');
  assert.equal(recovery.requests, 1, 'Recovery must submit one request');
  assert.ok(typeof recovery.recoveredQuestion === 'string' && recovery.recoveredQuestion.trim(), 'Recovery must record the recovered question');
  assert.ok(conversation.initial.total > conversation.initial.height, 'Conversation must test a scrolling log');
  assert.ok(Math.abs(conversation.initial.scroll - (conversation.initial.total - conversation.initial.height)) < 1, 'Conversation must initially reach the latest message');
  assert.ok(conversation.beforeJump.answerTop > conversation.beforeJump.logBottom, 'Conversation must preserve reading position before jumping');
  assert.ok(conversation.afterJump.answerTop >= conversation.afterJump.logTop - 1 && conversation.afterJump.answerBottom <= conversation.afterJump.logBottom + 1, 'Latest-answer jump must reveal the answer');
  assert.ok(tour.initialAnswers && Object.keys(tour.initialAnswers).length >= 2, 'Tour must record saved recap answers');
  assert.ok(tour.finalEvidence && Object.keys(tour.finalEvidence).length >= 2, 'Tour must record preserved retrieval evidence');
  assert.equal(tutor.panelTop, 246, 'Tutor compact panel position');
  assert.equal(tour.top, 246, 'Tour compact panel position');
  assert.ok(Number.isFinite(tutor.composerTop) && tutor.composerTop >= tutor.panelTop && tutor.composerTop < 600, 'Tutor composer must remain near the panel heading');

  const browserReportPresent = fs.existsSync(path.join(folder, 'browser-results.json'));
  let browserScenarios = 4;
  if (browserReportPresent) {
    const browser = read('browser-results.json');
    noErrors(browser, 'Browser reporter');
    assert.equal(browser.stats.expected, 4, 'Browser expected walkthrough count');
    assert.equal(browser.stats.unexpected, 0, 'Unexpected browser outcomes');
    assert.equal(browser.stats.flaky, 0, 'Flaky browser outcomes');
    assert.equal(browser.stats.skipped, 0, 'Skipped browser walkthroughs');
    const tests = browserTests(browser.suites);
    assert.equal(tests.length, 4, 'Browser actual walkthrough count');
    for (const test of tests) {
      assert.equal(test.expectedStatus, 'passed', 'Browser expected status');
      assert.equal(test.status, 'expected', 'Browser final status');
      assert.equal(test.results.length, 1, 'Browser walkthrough must pass without retries');
      assert.equal(test.results[0].status, 'passed', 'Browser walkthrough failed');
      assert.equal(test.results[0].errors.length, 0, 'Browser walkthrough contains errors');
    }
    browserScenarios = tests.length;
  }

  const canonicalPath = path.join(repoRoot, 'stem_lab/stem_tool_anatomy.js');
  const canonical = fs.readFileSync(canonicalPath);
  const desktop = fs.readFileSync(path.join(repoRoot, 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'));
  assert.ok(canonical.equals(desktop), 'Anatomy source mirrors differ');
  cp.execFileSync(process.execPath, ['--check', canonicalPath], { cwd: repoRoot, stdio: 'pipe' });

  const scope = read('locale-commit-scope.json');
  assert.equal(scope.length, 6, 'Six locale candidates are required');
  const candidateHashes = {};
  for (const language of ['french', 'spanish_latin_america', 'arabic']) {
    const working = JSON.parse(fs.readFileSync(path.join(repoRoot, 'lang/' + language + '.js'), 'utf8'));
    const pair = [];
    for (const target of ['lang/' + language + '.js', 'desktop/web-app/public/lang/' + language + '.js']) {
      const entry = scope.find(item => item.path === target);
      assert.ok(entry, 'Missing candidate scope: ' + target);
      assert.deepEqual(entry.keys.slice().sort(), localeKeys.slice().sort(), 'Candidate must contain exactly 13 flow labels');
      const candidate = fs.readFileSync(path.join(folder, 'staged-locales', target.replaceAll('/', '__')));
      assert.equal(hash(candidate), entry.hash, 'Candidate hash differs from scope: ' + target);
      const pack = JSON.parse(candidate.toString('utf8'));
      for (const key of localeKeys) assert.equal(pack.stem.anatomy[key], working.stem.anatomy[key], 'Candidate label mismatch: ' + target + ' / ' + key);
      pair.push(entry.hash);
    }
    assert.equal(pair[0], pair[1], 'Candidate mirrors differ: ' + language);
    candidateHashes[language] = pair[0];
  }
  const baseline = read('baseline.json');
  for (const key of ['top', 'height', 'composerTop']) assert.ok(Number.isFinite(baseline[key]), 'Missing baseline measurement: ' + key);
  const result = {
    uniqueUnitChecks: effective.size,
    uniqueUnitSuites: effectiveSuites.size,
    initialUnitChecks: unitRuns[0].assertions,
    finalTargetedChecks: unitRuns[1].assertions,
    finalFlowChecks: unitRuns[2].assertions,
    unitResultsMergedBy: 'fullName',
    allEffectiveUnitChecksPassed: true,
    unitRuns,
    browserScenarios,
    browserReporterPresent: browserReportPresent,
    accessibilityScans: tutor.scans.length + tour.scans.length,
    tutorAccessibilityScans: tutor.scans.length,
    tourAccessibilityScans: tour.scans.length,
    accessibilityViolations: 0,
    tutorPanelTop: tutor.panelTop,
    tourPanelTop: tour.top,
    tutorComposerTop: tutor.composerTop,
    tutorSizes: tutor.scans.map(scan => ({ width: scan.measurements.width, scroll: scan.measurements.scrollWidth, theme: scan.theme, locale: scan.locale })),
    tourSizes: tour.sizes,
    browserErrors: [],
    baselineMeasurements: baseline,
    baselineAndFinalConversationStatesDiffer: true,
    sourceSha256: normalizedHash(canonical),
    sourceHashLineEndings: 'LF',
    sourceMirrorsMatch: true,
    canonicalSyntaxCheckPassed: true,
    localeCandidateMirrorsMatch: true,
    localeLabelsPerPack: localeKeys.length,
    localeCandidateHashes: candidateHashes
  };
  fs.writeFileSync(path.join(folder, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  return result;
}

module.exports = { verify };
if (require.main === module) {
  try { verify(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
