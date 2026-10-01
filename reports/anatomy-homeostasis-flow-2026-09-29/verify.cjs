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
const defaults = {
  unitReports: ['initial-unit-results.json'],
  requiredUnitFiles: ['anatomy_homeostasis_flow.test.js', 'anatomy_imaging_guidance.test.js'],
  requiredBrowserFiles: ['anatomy-homeostasis-flow.spec.ts', 'anatomy-imaging-guidance.spec.ts'],
  validationReports: [
    { file: 'homeostasis-browser-validation.json', label: 'Homeostasis', expectedScans: 15 },
    { file: 'imaging-browser-validation.json', label: 'Imaging', expectedScans: 0, requireScans: false, requiredWidths: [390, 1440], kind: 'imaging' }
  ],
  requiredWidths: [320, 390, 768, 1440],
  requiredThemes: ['light', 'dark', 'contrast'],
  requiredExtraTests: ['tests/microdissection_anatomy3d.test.js'],
  expectedBrowserScenarios: 2,
  expectedLocaleLabels: 66
};

function config() {
  const override = fs.existsSync(path.join(folder, 'verification-config.json')) ? read('verification-config.json') : {};
  return { ...defaults, ...override };
}

function errorsEmpty(errors, label) {
  assert.ok(Array.isArray(errors), label + ' must record errors');
  assert.equal(errors.length, 0, label + ' contains browser errors');
}

function browserTests(suites) {
  return suites.flatMap(suite => [
    ...(suite.specs || []).flatMap(spec => {
      assert.equal(spec.ok, true, 'Browser spec failed: ' + spec.title);
      return (spec.tests || []).map(test => ({ ...test, file: spec.file || suite.file }));
    }),
    ...browserTests(suite.suites || [])
  ]);
}

function validationSummary(report, descriptor, settings) {
  const scans = [], measurements = [], errorLists = [], themes = new Set();
  function visit(node, location) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((child, index) => visit(child, location + '[' + index + ']')); return; }
    if (Array.isArray(node.scans)) scans.push(...node.scans);
    if (typeof node.theme === 'string') themes.add(node.theme);
    if ('errors' in node) { errorsEmpty(node.errors, descriptor.label + ' / ' + location); errorLists.push(location); }
    const scrollKey = Number.isFinite(node.scrollWidth) ? 'scrollWidth' : Number.isFinite(node.scroll) ? 'scroll' : null;
    if (Number.isFinite(node.width) && scrollKey) {
      assert.ok(node.width > 0, descriptor.label + ' invalid viewport width');
      assert.ok(node[scrollKey] <= node.width + 0.1, descriptor.label + ' horizontal overflow at ' + node.width);
      measurements.push({ width: node.width, scroll: node[scrollKey], location });
    }
    for (const [key, value] of Object.entries(node)) visit(value, location ? location + '.' + key : key);
  }
  visit(report, descriptor.file);
  assert.ok(errorLists.length > 0, descriptor.label + ' must record an error array');
  if (descriptor.requireScans !== false) assert.ok(scans.length > 0, descriptor.label + ' must record accessibility scans');
  if (descriptor.expectedScans !== null && descriptor.expectedScans !== undefined) assert.equal(scans.length, descriptor.expectedScans, descriptor.label + ' scan count');
  for (const scan of scans) {
    assert.ok(Array.isArray(scan.violations), descriptor.label + ' must record scan violations');
    assert.equal(scan.violations.length, 0, descriptor.label + ' accessibility violations');
  }
  for (const theme of descriptor.requiredThemes || settings.requiredThemes) assert.ok(themes.has(theme), descriptor.label + ' missing theme ' + theme);
  for (const width of descriptor.requiredWidths || settings.requiredWidths) assert.ok(measurements.some(measurement => measurement.width === width), descriptor.label + ' missing overflow measurement at ' + width);
  return { file: descriptor.file, label: descriptor.label, scans: scans.length, violations: 0, measurements, errorArraysChecked: errorLists.length };
}

function imagingSummary(report, descriptor, settings) {
  const summary = validationSummary(report, descriptor, settings);
  const guidance = report.guidance;
  assert.ok(guidance && Array.isArray(guidance.orientation) && Array.isArray(guidance.measurements) && Array.isArray(guidance.visuals), 'Imaging guidance records are missing');
  const regions = ['head', 'chest', 'abdomen'];
  const landmarks = { head: ['Right hemisphere', 'Cerebellum'], chest: ['Trachea', 'Liver dome'], abdomen: ['Liver', 'Bladder'] };
  assert.equal(guidance.orientation.length, 6, 'Imaging orientation correspondence count');
  const orientations = new Set();
  for (const record of guidance.orientation) {
    assert.ok(regions.includes(record.region) && [0, 100].includes(record.slice), 'Unexpected Imaging orientation');
    const key = record.region + '/' + record.slice;
    assert.ok(!orientations.has(key), 'Duplicate Imaging orientation: ' + key);
    orientations.add(key);
    const index = record.slice === 0 ? 0 : 1;
    assert.equal(record.position, index === 0 ? 'Superior slice band' : 'Inferior slice band', 'Imaging band direction');
    assert.equal(record.expectedLandmark, landmarks[record.region][index], 'Imaging expected landmark');
    assert.ok(record.paintedText.includes(landmarks[record.region][index]), 'Imaging landmark was not painted');
    assert.ok(!record.paintedText.includes(landmarks[record.region][1 - index]), 'Opposite Imaging landmark was painted');
    assert.ok([record.top, record.height, record.markerCenter, record.expectedCenter].every(Number.isFinite) && record.height > 0, 'Invalid Imaging band geometry');
    assert.ok(Math.abs(record.expectedCenter - (record.top + record.slice / 100 * record.height)) < 1e-8, 'Imaging expected marker position');
    assert.ok(Math.abs(record.markerCenter - record.expectedCenter) < 1e-8, 'Imaging marker differs from slice position');
  }
  assert.equal(guidance.visuals.length, 6, 'Imaging visual capture count');
  const visualKeys = new Set(guidance.visuals.map(record => record.width + '/' + record.theme));
  for (const width of [390, 1440]) for (const theme of settings.requiredThemes) assert.ok(visualKeys.has(width + '/' + theme), 'Missing Imaging visual state');
  assert.equal(visualKeys.size, guidance.visuals.length, 'Duplicate Imaging visual state');
  assert.equal(guidance.measurements.length, 24, 'Imaging ruler measurement count');
  const measurements = new Set();
  let maximumDistanceErrorMm = 0;
  for (const record of guidance.measurements) {
    assert.ok([320, 390, 768, 1440].includes(record.width) && regions.includes(record.region) && ['CT', 'MRI'].includes(record.modality), 'Unexpected Imaging ruler state');
    const key = [record.width, record.region, record.modality].join('/');
    assert.ok(!measurements.has(key), 'Duplicate Imaging ruler measurement: ' + key);
    measurements.add(key);
    const geometry = record.geometry;
    assert.equal(geometry.sourceWidth, 640, 'Imaging native width');
    assert.equal(geometry.sourceHeight, 480, 'Imaging native height');
    assert.ok(geometry.displayWidth > 0 && geometry.displayHeight > 0, 'Invalid Imaging displayed dimensions');
    assert.equal(geometry.points.length, 2, 'Imaging scale endpoints');
    const [start, end] = geometry.points;
    assert.ok([start.x, start.y, end.x, end.y].every(Number.isFinite), 'Invalid Imaging scale coordinates');
    assert.ok(Math.abs(end.x - start.x - 62.5) < 1e-8 && start.y === end.y, 'Imaging painted 50 mm scale');
    assert.equal(record.pointerEvents.length, 2, 'Imaging pointer endpoints');
    const [first, second] = record.pointerEvents;
    assert.ok([first.sourceX, first.sourceY, second.sourceX, second.sourceY].every(Number.isFinite), 'Invalid Imaging pointer coordinates');
    const span = Math.hypot(second.sourceX - first.sourceX, second.sourceY - first.sourceY);
    const annotation = record.annotation;
    assert.deepEqual({ type: annotation.type, modality: annotation.modality, region: annotation.region, plane: annotation.plane, slice: annotation.slice, note: annotation.note }, { type: 'ruler', modality: record.modality, region: record.region, plane: 'axial', slice: 50, note: 'Scale check' }, 'Imaging annotation context');
    assert.equal(annotation.distanceMm, Math.round(span * 0.8 * 10) / 10, 'Imaging ruler calibration');
    const tolerance = 0.8 * geometry.sourceWidth / geometry.displayWidth + 0.1;
    assert.ok(Math.abs(record.pointerToleranceMm - tolerance) < 1e-8, 'Imaging pointer tolerance');
    const error = Math.abs(annotation.distanceMm - 50);
    assert.ok(error <= tolerance, 'Imaging ruler distance differs from painted scale');
    maximumDistanceErrorMm = Math.max(maximumDistanceErrorMm, error);
  }
  return { ...summary, orientationCorrespondences: guidance.orientation.length, visualCaptures: guidance.visuals.length, rulerMeasurements: guidance.measurements.length, rulerWidths: [320, 390, 768, 1440], maximumDistanceErrorMm };
}

function verify() {
  const settings = config();
  assert.ok(Array.isArray(settings.unitReports) && settings.unitReports.length > 0, 'At least one actual regression report is required');
  const effective = new Map(), effectiveSuites = new Map(), unitRuns = [];
  for (const [index, filename] of settings.unitReports.entries()) {
    const report = read(filename);
    assert.ok(Array.isArray(report.testResults) && report.testResults.length, filename + ' must contain suites');
    let assertions = 0;
    const names = new Set();
    for (const suite of report.testResults) {
      assert.ok(Array.isArray(suite.assertionResults) && suite.assertionResults.length, filename + ' empty suite');
      effectiveSuites.set(suite.name, suite.status);
      const suiteFile = suite.name.split(/[\\/]/).pop();
      for (const test of suite.assertionResults) {
        assert.ok(typeof test.fullName === 'string' && test.fullName, filename + ' missing fullName');
        assert.ok(!names.has(test.fullName), filename + ' duplicate fullName: ' + test.fullName);
        names.add(test.fullName);
        effective.set(test.fullName, { status: test.status, filename, suiteFile });
        assertions++;
      }
    }
    assert.equal(assertions, report.numTotalTests, filename + ' reported assertion count');
    if (index === settings.unitReports.length - 1) {
      assert.equal(report.success, true, filename + ' failed');
      assert.equal(report.numFailedTests, 0, filename + ' failed assertions');
      assert.equal(report.numPassedTests, assertions, filename + ' includes non-passing assertions');
    }
    unitRuns.push({ file: filename, assertions, passed: report.numPassedTests, failed: report.numFailedTests });
  }
  for (const [name, test] of effective) assert.equal(test.status, 'passed', 'Final effective regression failed: ' + name + ' (' + test.filename + ')');
  for (const [suite, status] of effectiveSuites) assert.equal(status, 'passed', 'Final effective suite failed: ' + suite);
  const requiredUnitCounts = {};
  for (const file of settings.requiredUnitFiles) {
    const count = [...effective.values()].filter(test => test.suiteFile === file).length;
    assert.ok(count > 0, 'Missing new regression suite: ' + file);
    requiredUnitCounts[file] = count;
  }

  const browser = read('browser-results.json');
  errorsEmpty(browser.errors, 'Browser reporter');
  assert.equal(browser.stats.unexpected, 0, 'Unexpected browser outcomes');
  assert.equal(browser.stats.flaky, 0, 'Flaky browser outcomes');
  assert.equal(browser.stats.skipped, 0, 'Skipped browser walkthroughs');
  const tests = browserTests(browser.suites);
  assert.ok(tests.length > 0, 'Browser report contains no walkthroughs');
  assert.equal(tests.length, browser.stats.expected, 'Browser reported walkthrough count');
  if (settings.expectedBrowserScenarios !== null) assert.equal(tests.length, settings.expectedBrowserScenarios, 'Configured browser walkthrough count');
  for (const test of tests) {
    assert.equal(test.expectedStatus, 'passed', 'Browser expected status');
    assert.equal(test.status, 'expected', 'Browser final status');
    assert.equal(test.results.length, 1, 'Browser walkthrough must pass without retries');
    assert.equal(test.results[0].status, 'passed', 'Browser walkthrough failed');
    errorsEmpty(test.results[0].errors, 'Browser walkthrough');
  }
  for (const file of settings.requiredBrowserFiles) assert.ok(tests.some(test => test.file.split(/[\\/]/).pop() === file), 'Missing browser flow: ' + file);
  const browserValidation = settings.validationReports.map(descriptor => descriptor.kind === 'imaging'
    ? imagingSummary(read(descriptor.file), descriptor, settings)
    : validationSummary(read(descriptor.file), descriptor, settings));

  const sourcePath = path.join(repoRoot, 'stem_lab/stem_tool_anatomy.js');
  const canonical = fs.readFileSync(sourcePath);
  const mirror = fs.readFileSync(path.join(repoRoot, 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'));
  assert.ok(canonical.equals(mirror), 'Anatomy source mirrors differ');
  cp.execFileSync(process.execPath, ['--check', sourcePath], { cwd: repoRoot, stdio: 'pipe' });
  const localeKeys = stageHelper.localeKeys;
  assert.ok(localeKeys.some(key => key.startsWith('homeo_flow_')), 'Homeostasis flow labels are missing');
  assert.ok(localeKeys.every(key => /^(homeo_flow_|scan_flow_)/.test(key) || stageHelper.legacyLocaleKeys.includes(key)), 'Unexpected locale key scope');
  if (settings.expectedLocaleLabels !== null) assert.equal(localeKeys.length, settings.expectedLocaleLabels, 'Homeostasis locale label count');
  const scope = read('locale-commit-scope.json');
  assert.equal(scope.length, 6, 'Six locale candidates are required');
  const localeCandidateHashes = {};
  for (const language of ['french', 'spanish_latin_america', 'arabic']) {
    const working = JSON.parse(fs.readFileSync(path.join(repoRoot, 'lang/' + language + '.js'), 'utf8'));
    const pair = [];
    for (const target of ['lang/' + language + '.js', 'desktop/web-app/public/lang/' + language + '.js']) {
      const entry = scope.find(item => item.path === target);
      assert.ok(entry, 'Missing candidate scope: ' + target);
      assert.deepEqual(entry.keys.slice().sort(), localeKeys.slice().sort(), 'Candidate locale key scope differs');
      const candidate = fs.readFileSync(path.join(folder, 'staged-locales', target.replaceAll('/', '__')));
      assert.equal(hash(candidate), entry.hash, 'Candidate hash differs from scope: ' + target);
      const data = JSON.parse(candidate.toString('utf8'));
      const workingMirror = JSON.parse(fs.readFileSync(path.join(repoRoot, target), 'utf8'));
      for (const key of localeKeys) {
        assert.ok(typeof working.stem.anatomy[key] === 'string' && working.stem.anatomy[key], 'Missing working label: ' + key);
        assert.equal(data.stem.anatomy[key], working.stem.anatomy[key], 'Candidate translation mismatch: ' + target + ' / ' + key);
        assert.equal(workingMirror.stem.anatomy[key], working.stem.anatomy[key], 'Working locale mirrors differ: ' + target + ' / ' + key);
      }
      pair.push(entry.hash);
    }
    assert.equal(pair[0], pair[1], 'Candidate mirrors differ: ' + language);
    localeCandidateHashes[language] = pair[0];
  }
  const scopedFiles = stageHelper.scopeFiles();
  for (const file of settings.requiredExtraTests) assert.ok(scopedFiles.includes(file), 'Required extra test is missing from commit scope: ' + file);
  const result = {
    uniqueUnitChecks: effective.size,
    uniqueUnitSuites: effectiveSuites.size,
    initialUnitChecks: unitRuns[0].assertions,
    finalTargetedChecks: unitRuns[unitRuns.length - 1].assertions,
    lastUnitReport: unitRuns[unitRuns.length - 1].file,
    lastUnitRunChecks: unitRuns[unitRuns.length - 1].assertions,
    unitResultsMergedBy: 'fullName',
    allEffectiveUnitChecksPassed: true,
    unitRuns,
    requiredUnitCounts,
    browserScenarios: tests.length,
    browserValidation,
    accessibilityScans: browserValidation.reduce((total, report) => total + report.scans, 0),
    accessibilityViolations: 0,
    browserErrors: [],
    sourceSha256: hash(canonical.toString('utf8').replace(/\r\n/g, '\n')),
    sourceHashLineEndings: 'LF',
    sourceMirrorsMatch: true,
    canonicalSyntaxCheckPassed: true,
    localeCandidateMirrorsMatch: true,
    localeLabelsPerPack: localeKeys.length,
    localeKeys,
    localeCandidateHashes,
    requiredCommitExtraTests: settings.requiredExtraTests
  };
  fs.writeFileSync(path.join(folder, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  return result;
}

module.exports = { config, validationSummary, verify };
if (require.main === module) {
  try { verify(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
