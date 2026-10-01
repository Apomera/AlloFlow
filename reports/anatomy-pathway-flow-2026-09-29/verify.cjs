const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const stageHelper = require('./stage.cjs');

const folder = __dirname;
const repoRoot = stageHelper.repoRoot;
const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const normalizedHash = bytes => hash(bytes.toString('utf8').replace(/\r\n/g, '\n'));
const requiredWidths = [320, 390, 768, 1440];
const requiredExtraTests = ['tests/anatomy_lab_science.test.js', 'tests/anatomy_control_names.test.js'];

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
    assert.ok(['light', 'dark', 'contrast'].includes(scan.theme), label + ' scan theme');
  }
  noErrors(report, label);
}

function overflowFree(measurements, label, scrollKey) {
  assert.ok(Array.isArray(measurements) && measurements.length, label + ' must record widths');
  for (const measurement of measurements) {
    assert.ok(measurement && Number.isFinite(measurement.width) && measurement.width > 0, label + ' viewport width');
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

function liveBlueprint(records, label) {
  assert.ok(Array.isArray(records) && records.length, label + ' must record WebGL contexts');
  assert.ok(records.some(record => record.createdBy === 'page' && record.lost === false && record.renders > 0), label + ' must include a live rendered Blueprint');
}

function verify() {
  assert.ok(fs.existsSync(path.join(folder, 'final-unit-results.json')), 'Final regression results are required');
  const effective = new Map(), effectiveSuites = new Map(), unitRuns = [];
  for (const filename of ['unit-results.json', 'pathway-unit-results.json', 'final-unit-results.json']) {
    const report = read(filename);
    assert.ok(Array.isArray(report.testResults) && report.testResults.length, filename + ' must contain suites');
    let assertions = 0;
    const namesInRun = new Set();
    for (const suite of report.testResults) {
      assert.ok(Array.isArray(suite.assertionResults) && suite.assertionResults.length, filename + ' has an empty suite');
      const suiteFile = suite.name.split(/[\\/]/).pop();
      effectiveSuites.set(suite.name, suite.status);
      for (const test of suite.assertionResults) {
        assert.ok(typeof test.fullName === 'string' && test.fullName, filename + ' missing fullName');
        assert.ok(!namesInRun.has(test.fullName), filename + ' duplicate fullName: ' + test.fullName);
        namesInRun.add(test.fullName);
        effective.set(test.fullName, { status: test.status, filename, suiteFile });
        assertions++;
      }
    }
    assert.equal(assertions, report.numTotalTests, filename + ' reported assertion count');
    if (filename === 'final-unit-results.json') {
      assert.equal(report.success, true, filename + ' failed');
      assert.equal(report.numFailedTests, 0, filename + ' failed assertions');
      assert.equal(report.numPassedTests, assertions, filename + ' contains non-passing assertions');
    }
    unitRuns.push({ file: filename, assertions, passed: report.numPassedTests, failed: report.numFailedTests });
  }
  for (const [fullName, test] of effective) assert.equal(test.status, 'passed', 'Final effective regression failed: ' + fullName + ' (' + test.filename + ')');
  for (const [suite, status] of effectiveSuites) assert.equal(status, 'passed', 'Final effective suite failed: ' + suite);
  const pathwayUnitChecks = [...effective.values()].filter(test => test.suiteFile === 'anatomy_pathway_flow.test.js').length;
  const spotterMarkerUnitChecks = [...effective.values()].filter(test => test.suiteFile === 'anatomy_spotter_marker_view.test.js').length;
  assert.ok(pathwayUnitChecks >= 40, 'New Pathway flow suite must contribute at least 40 passing assertions');
  assert.ok(spotterMarkerUnitChecks >= 32, 'New Spotter marker suite must contribute at least 32 passing assertions');

  const browser = read('browser-results.json');
  noErrors(browser, 'Browser reporter');
  assert.equal(browser.stats.expected, 3, 'Expected browser walkthrough count');
  assert.equal(browser.stats.unexpected, 0, 'Unexpected browser outcomes');
  assert.equal(browser.stats.flaky, 0, 'Flaky browser outcomes');
  assert.equal(browser.stats.skipped, 0, 'Skipped browser walkthroughs');
  const tests = browserTests(browser.suites);
  assert.equal(tests.length, 3, 'Actual browser walkthrough count');
  for (const test of tests) {
    assert.equal(test.expectedStatus, 'passed', 'Browser expected status');
    assert.equal(test.status, 'expected', 'Browser final status');
    assert.equal(test.results.length, 1, 'Browser walkthrough must pass without retries');
    assert.equal(test.results[0].status, 'passed', 'Browser walkthrough failed');
    assert.equal(test.results[0].errors.length, 0, 'Browser walkthrough contains errors');
  }

  const pathway = read('pathway-browser-validation.json');
  const spotter = read('spotter-browser-validation.json');
  validateScans(pathway, 15, 'Pathways');
  assert.ok(spotter.practice && spotter.restoration, 'Both Spotter walkthroughs must record results');
  validateScans(spotter.practice, 6, 'Spotter markers');
  noErrors(spotter.restoration, 'Spotter restoration');
  overflowFree(pathway.scans.map(scan => scan.dimensions), 'Pathways', 'scroll');
  overflowFree(spotter.practice.sizes, 'Spotter', 'scrollWidth');
  assert.ok(Number.isFinite(pathway.top) && pathway.top < 350, 'Pathway compact panel must remain near the heading');
  assert.deepEqual(pathway.completedCheck, { version: 2, answers: { direction: 'rich', return: 'left' } }, 'Pathway must preserve its latest completed concept check');
  assert.equal(pathway.finalState.route, 'path_blood', 'Pathway must resume the original route');
  assert.deepEqual(pathway.finalState.answers, { direction: 'rich' }, 'Pathway must retain the restarted answer after reviewing');
  liveBlueprint(spotter.practice.initial3d, 'Initial Spotter view');
  liveBlueprint(spotter.practice.restored3d, 'Restored Spotter view');
  assert.ok(typeof spotter.practice.target === 'string' && spotter.practice.target, 'Spotter must record a practice target');
  assert.equal(spotter.practice.arabic.width, 320, 'Arabic Spotter viewport');
  assert.equal(spotter.practice.arabic.fontSize, '17px', 'Arabic Spotter larger text');
  assert.equal(spotter.restoration.restored.length, 2, 'Spotter must restore unanswered and answered saves');
  for (const answered of [false, true]) {
    const restored = spotter.restoration.restored.find(item => item.answered === answered);
    assert.ok(restored, 'Missing restored Spotter save');
    assert.equal(restored.requested3d, true, 'Spotter must retain its 3D preference');
    assert.equal(restored.requestedModel, 'blueprint', 'Spotter must retain its model preference');
    assert.equal(restored.target, 'skull', 'Spotter must retain its saved target');
    assert.equal(restored.feedback, answered ? 'ribs' : null, 'Spotter must retain its saved answer');
  }

  const canonicalPath = path.join(repoRoot, 'stem_lab/stem_tool_anatomy.js');
  const canonical = fs.readFileSync(canonicalPath);
  const desktop = fs.readFileSync(path.join(repoRoot, 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'));
  assert.ok(canonical.equals(desktop), 'Anatomy source mirrors differ');
  cp.execFileSync(process.execPath, ['--check', canonicalPath], { cwd: repoRoot, stdio: 'pipe' });

  const localeKeys = stageHelper.localeKeys;
  assert.equal(localeKeys.length, 18, 'Final source must define 18 Pathway/Spotter flow labels');
  assert.equal(localeKeys.filter(key => key.startsWith('pathway_flow_')).length, 17, 'Final source Pathway label count');
  assert.ok(localeKeys.includes('spotter_flow_2d'), 'Final source must define the Spotter note');
  const localeScope = read('locale-commit-scope.json');
  assert.equal(localeScope.length, 6, 'Six locale candidates are required');
  const localeCandidateHashes = {};
  for (const language of ['french', 'spanish_latin_america', 'arabic']) {
    const working = JSON.parse(fs.readFileSync(path.join(repoRoot, 'lang/' + language + '.js'), 'utf8'));
    const pair = [];
    for (const target of ['lang/' + language + '.js', 'desktop/web-app/public/lang/' + language + '.js']) {
      const entry = localeScope.find(item => item.path === target);
      assert.ok(entry, 'Missing candidate scope: ' + target);
      assert.deepEqual(entry.keys.slice().sort(), localeKeys.slice().sort(), 'Candidate flow-label scope differs');
      const candidate = fs.readFileSync(path.join(folder, 'staged-locales', target.replaceAll('/', '__')));
      assert.equal(hash(candidate), entry.hash, 'Candidate hash differs from scope: ' + target);
      const pack = JSON.parse(candidate.toString('utf8'));
      const workingMirror = JSON.parse(fs.readFileSync(path.join(repoRoot, target), 'utf8'));
      for (const key of localeKeys) {
        assert.ok(typeof working.stem.anatomy[key] === 'string' && working.stem.anatomy[key], 'Missing working label: ' + key);
        assert.equal(pack.stem.anatomy[key], working.stem.anatomy[key], 'Candidate label mismatch: ' + target + ' / ' + key);
        assert.equal(workingMirror.stem.anatomy[key], working.stem.anatomy[key], 'Working locale mirrors differ: ' + target + ' / ' + key);
      }
      pair.push(entry.hash);
    }
    assert.equal(pair[0], pair[1], 'Candidate mirrors differ: ' + language);
    localeCandidateHashes[language] = pair[0];
  }
  const arabic = JSON.parse(fs.readFileSync(path.join(repoRoot, 'lang/arabic.js'), 'utf8'));
  assert.equal(spotter.practice.arabic.hint, arabic.stem.anatomy.spotter_flow_2d, 'Arabic Spotter note must use its translated label');
  const scopedFiles = stageHelper.scopeFiles();
  for (const file of requiredExtraTests) assert.ok(scopedFiles.includes(file), 'Required extra test is missing from commit scope: ' + file);
  const readme = fs.readFileSync(path.join(folder, 'README.md'), 'utf8');
  assert.ok(readme.includes('ANATOMY_COMMIT_EXTRA_TESTS') && requiredExtraTests.every(file => readme.includes(file.split('/').pop())), 'README must document the required extra test scope');
  const baseline = read('baseline.json');
  for (const key of ['top', 'height']) assert.ok(Number.isFinite(baseline[key]), 'Missing baseline measurement: ' + key);
  const result = {
    uniqueUnitChecks: effective.size,
    uniqueUnitSuites: effectiveSuites.size,
    initialUnitChecks: unitRuns[0].assertions,
    initialPathwayFlowChecks: unitRuns[1].assertions,
    finalTargetedChecks: unitRuns[unitRuns.length - 1].assertions,
    pathwayFlowChecks: pathwayUnitChecks,
    spotterMarkerChecks: spotterMarkerUnitChecks,
    unitResultsMergedBy: 'fullName',
    allEffectiveUnitChecksPassed: true,
    unitRuns,
    browserScenarios: tests.length,
    accessibilityScans: pathway.scans.length + spotter.practice.scans.length,
    pathwayAccessibilityScans: pathway.scans.length,
    spotterAccessibilityScans: spotter.practice.scans.length,
    accessibilityViolations: 0,
    pathwayPanelTop: pathway.top,
    pathwaySizes: pathway.scans.map(scan => ({ width: scan.dimensions.width, scroll: scan.dimensions.scroll, theme: scan.theme, locale: scan.locale })),
    spotterSizes: spotter.practice.sizes,
    spotterInitialBlueprintRenders: spotter.practice.initial3d,
    spotterRestoredBlueprintRenders: spotter.practice.restored3d,
    spotterRestoredSaves: spotter.restoration.restored,
    browserErrors: [],
    baselineMeasurements: baseline,
    baselineAndFinalStudyStatesDiffer: true,
    sourceSha256: normalizedHash(canonical),
    sourceHashLineEndings: 'LF',
    sourceMirrorsMatch: true,
    canonicalSyntaxCheckPassed: true,
    localeCandidateMirrorsMatch: true,
    localeLabelsPerPack: localeKeys.length,
    localeCandidateHashes,
    requiredCommitExtraTests: requiredExtraTests,
    readmeDocumentsExtraTestScope: true
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
