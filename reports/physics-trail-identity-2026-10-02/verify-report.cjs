// Run from any directory after run-checks.cjs. This checks reports; it never runs tests.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '../..');
const report = __dirname;
const sourcePin = '71e2d584e2e0b64f910150af0ba344830057312e737d09bf65d02d97e54c0c64';
const baseline = '54d638b3213b0fbd484305feff43b769da8902f7';
const testPins = {
  'tests/e2e/physics-trail-identity.spec.ts': '631a884fe9601edaa3c743255e0741cb702987b88847bc127021d601a1dcab5a',
  'tests/e2e/physics-clarity.spec.ts': '2835c6ee259d1af9b6b2ba70b02fb0ac75e6c8883b4140f6e0c9dfff7d4f53b2',
  'tests/e2e/physics-flight-history.spec.ts': 'fcf0d0fefc0f7140e581e0064c94d731fc69b4a733d2ff4ed532df9d4f1fb377'
};
const catalogLabels = {
  plot_unfinished_path: 'Unfinished path',
  plot_role_selected: 'Selected flight',
  plot_role_recorded: 'Recorded flight',
  plot_role_unfinished: 'Unfinished',
  plot_current_trail_speed: 'Current flight speed',
  plot_vacuum_preview_key: 'White dashed · vacuum preview',
  plot_flights_on_plot: 'Flights on the plot',
  plot_trail_identity_help: "The solid path shows the focused flight's speed. Other paths use their run's line pattern; their color shows launch angle."
};
const phaseScreenshots = [
  'selected-launch.png', 'selected-rising.png', 'selected-apex.png', 'selected-near-apex.png',
  'selected-falling.png', 'selected-impact.png', 'selected-after-six-control-changes.png',
  'horizontal-release-unresolved.png', 'horizontal-release-canonical-apex.png', 'unfinished-highest-rising.png'
];
const historicalDirectories = {
  'physics-recorded-flights-2026-10-02': 10,
  'physics-recorded-context-2026-10-02': 11,
  'physics-velocity-clarity-2026-10-02': 10,
  'physics-point-clarity-2026-10-02': 20
};
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const relative = file => path.relative(root, file).replace(/\\/g, '/');
const failures = [], missing = new Set(), checks = [], dependencies = {}, browserFiles = new Set(), screenshots = new Map(), diagnosticScreenshots = new Map();
const summary = { unitTests: 0, unitFiles: 0, browserTests: 0, browserSuites: {}, visualReports: {},
  historicalFilesPreserved: 0, historicalScreenshots: 0, historicalVisualReports: 0 };

function readBytes(file) {
  if (!fs.existsSync(file)) { missing.add(relative(file)); return null; }
  return fs.readFileSync(file);
}
function readJson(file) {
  const bytes = readBytes(file);
  return bytes === null ? null : JSON.parse(bytes.toString('utf8'));
}
function check(name, action) {
  const before = missing.size;
  try { action(); checks.push({ name, status: missing.size === before ? 'passed' : 'incomplete' }); }
  catch (error) { failures.push({ check: name, message: error.message }); checks.push({ name, status: 'failed' }); }
}
function finiteAtLeast(value, floor, label) {
  assert(Number.isFinite(value), label + ' must be finite');
  assert(value >= floor, label + ' below ' + floor + ': ' + value);
}
function png(file, collection = screenshots) {
  const bytes = readBytes(file);
  if (bytes === null) return;
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), relative(file) + ' is not a PNG');
  collection.set(relative(file), digest(bytes));
}
function dependency(file, pin) {
  const absolute = path.join(root, file), bytes = readBytes(absolute);
  if (bytes === null) return null;
  dependencies[file] = digest(bytes);
  if (pin) assert.equal(dependencies[file], pin, file + ' changed');
  return bytes;
}

let source;
check('Pinned source, mirror, and three edited browser specs', () => {
  source = dependency('stem_lab/stem_tool_physics.js', sourcePin);
  const mirror = dependency('desktop/web-app/public/stem_lab/stem_tool_physics.js', sourcePin);
  if (source && mirror) assert(source.equals(mirror), 'Source and desktop copy differ');
  for (const [file, pin] of Object.entries(testPins)) dependency(file, pin);
});
check('Numerical and recording prefix matches baseline commit', () => {
  if (!source) return;
  const original = cp.execFileSync('git', ['show', baseline + ':stem_lab/stem_tool_physics.js'],
    { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  const prefix = value => {
    const normalized = value.replace(/\r\n/g, '\n'), marker = "window.StemLab.registerTool('physics',";
    assert(normalized.includes(marker), 'Physics registration boundary missing');
    return normalized.split(marker)[0];
  };
  assert.equal(prefix(source.toString('utf8')), prefix(original), 'Numerical or recording helpers changed');
});
check('Final theme-transition source and integrity proof', () => {
  const bytes = dependency('reports/physics-trail-identity-2026-10-02/theme-transition-integrity.json');
  if (!bytes || !source) return;
  const integrity = JSON.parse(bytes.toString('utf8'));
  assert.equal(integrity.beforeSha256, 'd2761bd2af6147f6e5cff47d44569ceb9fc1d214115ce0fb3186dc7bae422a10');
  assert.equal(integrity.themeFixedSha256, 'c37fd985765a1129f60fefbc55fd1b2b66989ca2786ed181f3cef82ac1f71250');
  assert.equal(integrity.sourceSha256, sourcePin);
  for (const key of ['mirrorMatches', 'modelPrefixUnchanged', 'legendUsesCurrentRenderTheme', 'canvasUsesCommittedTheme'])
    assert.equal(integrity[key], true, 'Theme transition: ' + key);
  const code = source.toString('utf8');
  assert(code.includes('function physTrajectoryPresentation(cv, contrastOverride) {'), 'Presentation theme override missing');
  assert(code.includes("var contrast = typeof contrastOverride === 'boolean' ? contrastOverride : cv.dataset.sceneTheme === 'contrast';"), 'Theme override must fall back to committed canvas theme');
  assert(code.includes('rows: physTrajectoryPresentation(cv, isContrast)'), 'Legend must use current render theme');
  assert(code.includes('var trajectoryRows = overlayMode ? physTrajectoryPresentation(canvasEl) : [];'), 'Canvas must use committed scene theme');
  summary.themeTransition = integrity;
});
check('Focused swatch source and rendering integrity proof', () => {
  const bytes = dependency('reports/physics-trail-identity-2026-10-02/swatch-rendering-integrity.json');
  if (!bytes || !source) return;
  const integrity = JSON.parse(bytes.toString('utf8'));
  assert.equal(integrity.beforeSha256, 'c37fd985765a1129f60fefbc55fd1b2b66989ca2786ed181f3cef82ac1f71250');
  assert.equal(integrity.sourceSha256, sourcePin);
  for (const key of ['mirrorMatches', 'modelPrefixUnchanged', 'gradientUsesViewBoxCoordinates'])
    assert.equal(integrity[key], true, 'Swatch rendering: ' + key);
  assert.deepEqual(integrity.gradientCoordinates, [2, 8, 54, 8]);
  const code = source.toString('utf8');
  assert(code.includes("React.createElement('linearGradient', { id: gradientId, gradientUnits: 'userSpaceOnUse', x1: 2, y1: 8, x2: 54, y2: 8 }"), 'Focused gradient must use the swatch viewBox coordinates');
  assert(code.includes("React.createElement('path', { d: 'M2 8 L54 8', fill: 'none', stroke: row.active ? 'url(#' + gradientId + ')' : row.color,"), 'Focused gradient must paint the horizontal swatch path');
  summary.swatchRendering = integrity;
});
check('Eight English physics labels and desktop catalog parity', () => {
  const files = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
  const catalogs = files.map(file => {
    const bytes = dependency(file);
    return bytes ? JSON.parse(bytes.toString('utf8')).stem.physics : null;
  });
  if (catalogs.some(value => value === null) || !source) return;
  for (const [key, expected] of Object.entries(catalogLabels)) {
    assert.equal(catalogs[0][key], expected, 'English catalog: ' + key);
    assert.equal(catalogs[1][key], expected, 'Desktop catalog: ' + key);
    const call = "__alloT('stem.physics." + key + "', ";
    const single = "'" + expected.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    assert(source.toString('utf8').includes(call + single + ')') ||
      source.toString('utf8').includes(call + JSON.stringify(expected) + ')'), 'Source fallback: ' + key);
  }
});
check('CI includes the new spec with one worker and no retries', () => {
  const bytes = dependency('.github/workflows/physics.yml');
  if (!bytes) return;
  const workflow = bytes.toString('utf8'), command = workflow.match(/^\s*run:\s*(npx playwright test .+)$/m);
  assert(command, 'Physics browser command missing');
  assert(command[1].split(/\s+/).includes('tests/e2e/physics-trail-identity.spec.ts'));
  assert(command[1].includes('--workers=1')); assert(command[1].includes('--retries=0'));
  assert(workflow.includes("'tests/e2e/*physics*.spec.ts'"), 'Physics spec PR trigger missing');
});

check('356 unit assertions in 21 files, with audited recovery when needed', () => {
  const initialPath = path.join(report, 'unit-results.json'), units = readJson(initialPath);
  const baselinePath = path.join(root, 'reports/physics-point-clarity-2026-10-02/unit-results.json');
  const baselineBytes = readBytes(baselinePath);
  if (!units || !baselineBytes) return;
  assert.equal(digest(baselineBytes), '66e71b4c8a86d614661b9a83c025f540e45c0f5dbb2253f7b3e1f7730b05224d', 'Prior complete unit identity report changed');
  dependencies[relative(baselinePath)] = digest(baselineBytes);
  const prior = JSON.parse(baselineBytes.toString('utf8'));
  const fileName = file => relative(path.resolve(root, file.name));
  function identities(result, label) {
    const files = new Map(), tests = new Map(), failed = [];
    assert(Array.isArray(result.testResults), label + ' testResults missing');
    for (const fileResult of result.testResults) {
      const file = fileName(fileResult);
      assert(/^tests\/physics(?:_|\/)[\w/.-]+\.test\.[cm]?[jt]sx?$/.test(file), 'Unexpected unit file: ' + file);
      assert(!files.has(file), 'Duplicate unit file: ' + file);
      assert(Array.isArray(fileResult.assertionResults) && fileResult.assertionResults.length > 0, 'No executed assertions in ' + file);
      const occurrences = new Map();
      for (const test of fileResult.assertionResults) {
        assert.equal(typeof test.fullName, 'string'); assert(test.fullName.length > 0);
        // Parameterized cases can share a printed fullName; preserve every occurrence.
        const occurrence = (occurrences.get(test.fullName) || 0) + 1; occurrences.set(test.fullName, occurrence);
        assert(['passed', 'failed'].includes(test.status), 'Incomplete unit case: ' + test.fullName);
        assert(Array.isArray(test.failureMessages), 'Missing failure messages: ' + test.fullName);
        tests.set(JSON.stringify([file, test.fullName, occurrence]), test);
        if (test.status === 'failed') failed.push({ file, test });
        else assert.deepEqual(test.failureMessages, [], 'Passing assertion has failure messages: ' + test.fullName);
      }
      assert.equal(fileResult.status, fileResult.assertionResults.some(test => test.status === 'failed') ? 'failed' : 'passed', 'Unit file status: ' + file);
      files.set(file, fileResult);
    }
    assert.equal(result.numTotalTests, tests.size, label + ' total assertions');
    assert.equal(result.numPassedTests, tests.size - failed.length, label + ' passed assertions');
    assert.equal(result.numFailedTests, failed.length, label + ' failed assertions');
    for (const key of ['numPendingTests', 'numTodoTests', 'numPendingTestSuites']) assert.equal(result[key], 0, label + ' ' + key);
    assert.equal(result.success, failed.length === 0, label + ' success');
    return { files, tests, failed };
  }
  const expected = identities(prior, 'Prior complete report');
  assert.equal(expected.files.size, 21); assert.equal(expected.tests.size, 356); assert.equal(expected.failed.length, 0);
  const initial = identities(units, 'Initial report'), latest = new Map(initial.tests);
  const expectedFiles = [...expected.files.keys()].sort();
  for (const [file, result] of initial.files) {
    assert(expected.files.has(file), 'Unexpected initial unit file: ' + file);
    assert.deepEqual(result.assertionResults.map(test => test.fullName).sort(),
      expected.files.get(file).assertionResults.map(test => test.fullName).sort(), 'Initial test identities changed: ' + file);
  }
  const missingFiles = expectedFiles.filter(file => !initial.files.has(file));
  const startupFiles = ['tests/physics_apex_recording.test.js', 'tests/physics_investigation_ui.test.js',
    'tests/physics_recorded_flights.test.js'].sort();
  const scanFile = 'tests/physics_drag_integrator.test.js';
  const scanName = 'no STEM tool has a `return` split from its expression by a comment scans every stem_lab/stem_tool_*.js';
  summary.initialUnitTests = initial.tests.size; summary.initialUnitFiles = initial.files.size;
  summary.initialUnitTestsPassed = units.numPassedTests; summary.initialUnitTimeouts = initial.failed.length;
  summary.initialUnitMissingFiles = missingFiles;
  summary.unitRecoveryTests = 0; summary.unitRecoveryFiles = [];
  if (missingFiles.length) {
    assert.deepEqual(missingFiles, startupFiles, 'Only the three documented worker-startup files may be missing');
    assert.equal(initial.files.size, 18); assert.equal(initial.tests.size, 289); assert.equal(units.numPassedTests, 288);
    assert.equal(initial.failed.length, 1);
    assert.equal(initial.failed[0].file, scanFile); assert.equal(initial.failed[0].test.fullName, scanName);
  } else {
    assert.equal(initial.files.size, 21); assert.equal(initial.tests.size, 356);
  }
  if (missingFiles.length || initial.failed.length) {
    const recoveryPath = path.join(report, 'unit-recovery-results.json');
    const integrityPath = path.join(report, 'unit-recovery-integrity.json');
    const recovery = readJson(recoveryPath), integrity = readJson(integrityPath);
    if (!recovery || !integrity) return;
    assert.equal(integrity.sourceSha256, sourcePin); assert.equal(integrity.sourceUnchanged, true); assert.equal(integrity.mirrorMatches, true);
    assert.equal(integrity.initialUnitResultsSha256, digest(fs.readFileSync(initialPath)));
    assert.equal(integrity.recoveryResultsSha256, digest(fs.readFileSync(recoveryPath)));
    const beforeHashes = integrity.unitTestFilesSha256Before, afterHashes = integrity.unitTestFilesSha256After;
    assert(beforeHashes && typeof beforeHashes === 'object', 'Missing unit test hashes before recovery');
    assert(afterHashes && typeof afterHashes === 'object', 'Missing unit test hashes after recovery');
    assert.deepEqual(Object.keys(beforeHashes).sort(), expectedFiles, 'Before hashes must cover all 21 unit files');
    assert.deepEqual(Object.keys(afterHashes).sort(), expectedFiles, 'After hashes must cover all 21 unit files');
    assert.deepEqual(beforeHashes, afterHashes, 'Unit test files changed during recovery');
    for (const file of expectedFiles) {
      assert.match(beforeHashes[file], /^[a-f0-9]{64}$/, 'Invalid unit test hash: ' + file);
      const bytes = dependency(file, beforeHashes[file]);
      if (!bytes) return;
    }
    let consoleText;
    if (missingFiles.length || initial.failed.some(({ test }) => test.failureMessages.some(message => /STACK_TRACE_ERROR/.test(message)))) {
      assert.equal(typeof integrity.initialConsolePath, 'string', 'Missing initial console path');
      const consolePath = path.resolve(root, integrity.initialConsolePath);
      assert.equal(consolePath, path.join(report, 'unit-thread-console.txt'), 'Initial console must be the preserved report excerpt');
      assert.match(integrity.initialConsoleSha256, /^[a-f0-9]{64}$/, 'Invalid initial console hash');
      const consoleBytes = dependency(relative(consolePath), integrity.initialConsoleSha256);
      if (!consoleBytes) return;
      consoleText = consoleBytes.toString('utf8').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\s*>\s*/g, ' ').replace(/\s+/g, ' ');
      assert(consoleText.includes(scanFile), 'Captured console lacks the failed file');
      assert(consoleText.includes(scanName), 'Captured console lacks the failed test identity');
      assert(/Test timed out in\s*180000\s*ms/i.test(consoleText), 'Captured console lacks the actual 180000ms timeout');
      for (const file of missingFiles) {
        const startupEvidence = 'Failed to start threads worker for test files ' + path.resolve(root, file).replace(/\\/g, '/') + '.';
        assert(consoleText.replace(/\\/g, '/').includes(startupEvidence), 'Captured console lacks worker-startup evidence: ' + file);
      }
    }
    for (const { file, test } of initial.failed) {
      const reportedTimeout = test.failureMessages.some(message => /test timed out in \d+\s*ms|timeout of \d+\s*ms exceeded/i.test(message));
      const documentedStackError = file === scanFile && test.fullName === scanName && consoleText &&
        test.failureMessages.some(message => /Error: STACK_TRACE_ERROR/.test(message));
      assert(reportedTimeout || documentedStackError, 'Initial unit failure requires investigation: ' + test.fullName);
    }
    const recovered = identities(recovery, 'Recovery report');
    assert.equal(recovered.failed.length, 0);
    const requiredFiles = [...new Set([...missingFiles, ...initial.failed.map(item => item.file)])].sort();
    const recoveredFiles = [...recovered.files.keys()].sort();
    assert.deepEqual(recoveredFiles, requiredFiles, 'Recovery reruns only missing startup files and failed timeout files');
    assert(Array.isArray(integrity.recoveredFiles), 'Missing recovered-files manifest');
    assert.deepEqual(integrity.recoveredFiles.map(file => file.replace(/\\/g, '/')).sort(), recoveredFiles);
    for (const [file, result] of recovered.files) {
      assert.deepEqual(result.assertionResults.map(test => test.fullName).sort(),
        expected.files.get(file).assertionResults.map(test => test.fullName).sort(), 'Recovery test identities changed: ' + file);
      summary.unitRecoveryTests += result.assertionResults.length;
    }
    for (const [identity, test] of recovered.tests) latest.set(identity, test);
    if (missingFiles.length) assert.equal(summary.unitRecoveryTests, 79, 'Recovery must execute all 79 assertions in the four required files');
    summary.unitRecoveryFiles = recoveredFiles;
    for (const file of [initialPath, recoveryPath, integrityPath]) dependency(relative(file));
  } else {
    dependency(relative(initialPath));
  }
  assert.deepEqual([...latest.keys()].sort(), [...expected.tests.keys()].sort(), 'Latest actual results must match all 356 prior test identities');
  assert.equal(latest.size, 356); assert([...latest.values()].every(test => test.status === 'passed'), 'A latest actual assertion did not pass');
  summary.unitTests = latest.size; summary.unitFiles = expected.files.size;
  summary.unitDistinctFileFullNames = new Set([...latest.keys()].map(identity => JSON.stringify(JSON.parse(identity).slice(0, 2)))).size;
});
for (const [name, count, expectedFiles] of [
  ['trail', 4, ['physics-trail-identity.spec.ts']],
  ['regression', 18, ['physics-visual-layout.spec.ts', 'physics-clarity.spec.ts', 'physics-flight-history.spec.ts', 'physics-apex-inspection.spec.ts']],
  ['point-regression', 6, ['physics-velocity-clarity.spec.ts']]
]) check(name + ': ' + count + ' browser cases pass once', () => {
  const result = readJson(path.join(report, name + '-results.json'));
  if (!result) return;
  assert.deepEqual(result.errors, [], 'Top-level Playwright errors');
  for (const key of ['unexpected', 'flaky', 'skipped']) assert.equal(result.stats[key], 0, key);
  assert.equal(result.stats.expected, count);
  const tests = [], files = new Set();
  function walk(suite) {
    for (const spec of suite.specs || []) {
      files.add(path.basename(spec.file.replace(/\\/g, '/')));
      assert.equal(spec.ok, true, spec.title);
      for (const test of spec.tests) {
        assert.equal(test.expectedStatus, 'passed'); assert.equal(test.status, 'expected');
        assert.equal(test.results.length, 1, 'Browser case repeated: ' + spec.title);
        tests.push(...test.results);
      }
    }
    for (const child of suite.suites || []) walk(child);
  }
  result.suites.forEach(walk);
  assert.equal(tests.length, count); assert.deepEqual([...files].sort(), [...expectedFiles].sort());
  for (const test of tests) { assert.equal(test.status, 'passed'); assert.equal(test.retry, 0); assert.deepEqual(test.errors, []); }
  files.forEach(file => browserFiles.add(file)); summary.browserTests += count;
  summary.browserSuites[name] = { passed: count, files: [...files].sort(), durationMs: result.stats.duration };
});

const combinations = [];
for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) combinations.push(theme + '/' + width);
function screenshotPixels(file) {
  const bytes = readBytes(file);
  if (!bytes) return null;
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Invalid swatch PNG');
  let header, compressed = [], offset = 8;
  while (offset < bytes.length) {
    assert(offset + 12 <= bytes.length, 'Truncated PNG chunk');
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    assert(offset + length + 12 <= bytes.length, 'Truncated PNG payload');
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') { assert(!header, 'Duplicate PNG header'); assert.equal(length, 13); header = data; }
    if (type === 'IDAT') compressed.push(data);
    offset += length + 12;
    if (type === 'IEND') break;
  }
  assert(header && compressed.length, 'Incomplete PNG');
  const width = header.readUInt32BE(0), height = header.readUInt32BE(4), kind = header[9];
  assert(width > 0 && width <= 4096 && height > 0 && height <= 4096, 'Unexpected swatch PNG dimensions');
  assert.equal(header[8], 8, 'Swatch PNG must use eight-bit channels');
  assert([2, 6].includes(kind), 'Swatch PNG must be RGB or RGBA');
  assert.equal(header[10], 0); assert.equal(header[11], 0); assert.equal(header[12], 0);
  const channels = kind === 6 ? 4 : 3, stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(compressed));
  assert.equal(raw.length, (stride + 1) * height, 'PNG raster size');
  const decoded = Buffer.alloc(stride * height);
  function paeth(left, up, corner) {
    const prediction = left + up - corner, a = Math.abs(prediction - left), b = Math.abs(prediction - up), c = Math.abs(prediction - corner);
    return a <= b && a <= c ? left : b <= c ? up : corner;
  }
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]; assert(filter <= 4, 'Unsupported PNG filter');
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x, left = x >= channels ? decoded[index - channels] : 0;
      const up = y ? decoded[index - stride] : 0, corner = y && x >= channels ? decoded[index - stride - channels] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, corner);
      decoded[index] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
  }
  return { width, height, at(x, y) {
    const index = y * stride + x * channels;
    if (channels === 4) assert.equal(decoded[index + 3], 255, 'Swatch sample must be opaque');
    return [...decoded.subarray(index, index + 3)];
  } };
}
function contrastRatio(first, second) {
  const luminance = rgb => rgb.map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : Math.pow((channel + .055) / 1.055, 2.4); })
    .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
function swatchRasterProof(metrics, file, theme, blank = false) {
  const pixels = screenshotPixels(file);
  if (!pixels) return false;
  assert.equal(metrics.pixelWidth, pixels.width); assert.equal(metrics.pixelHeight, pixels.height);
  assert(Array.isArray(metrics.samples)); assert.equal(metrics.samples.length, metrics.sampledColumns);
  finiteAtLeast(metrics.sampledColumns, 48, 'Swatch sampled columns');
  const expectedColumns = Array.from({ length: pixels.width }, (_, x) => x).filter(x => (x + .5) * 56 / pixels.width >= 3 && (x + .5) * 56 / pixels.width <= 53);
  assert.deepEqual(metrics.samples.map(sample => sample.x), expectedColumns, 'Every center column across the swatch must be measured');
  const stops = [[103, 232, 249], [251, 191, 36], [251, 113, 133]], contrasts = [], errors = [];
  for (const sample of metrics.samples) {
    const svgX = (sample.x + .5) * 56 / pixels.width;
    assert(Math.abs(sample.svgX - svgX) < 1e-9);
    const progress = (svgX - 2) / 52, segment = progress < .5 ? 0 : 1, blend = segment === 0 ? progress * 2 : (progress - .5) * 2;
    const expected = stops[segment].map((value, index) => Math.round(value + (stops[segment + 1][index] - value) * blend));
    assert.deepEqual(sample.expected, expected, 'Swatch expected cyan/amber/rose gradient');
    const rgb = pixels.at(sample.x, Math.floor(pixels.height / 2));
    const surface = pixels.at(sample.x, Math.max(0, Math.floor(pixels.height * 2 / 16)));
    assert.deepEqual(sample.rgb, rgb, 'Reported swatch color must match PNG bytes');
    assert.deepEqual(sample.surface, surface, 'Reported swatch surface must match PNG bytes');
    const contrast = contrastRatio(rgb, surface), error = Math.max(...rgb.map((value, index) => Math.abs(value - expected[index])));
    assert(Math.abs(sample.contrast - contrast) < 1e-7, 'Reported swatch pixel contrast');
    assert.equal(sample.channelError, error); contrasts.push(contrast); errors.push(error);
  }
  const visible = metrics.samples.filter((sample, index) => contrasts[index] >= 3);
  assert.equal(metrics.visibleColumns, visible.length); assert.equal(metrics.matchingColumns, errors.filter(error => error <= 4).length);
  const span = visible.length ? (visible[visible.length - 1].x - visible[0].x + 1) * 56 / pixels.width : 0;
  assert(Math.abs(metrics.visibleSpanCSS - span) < 1e-9, 'Reported visible swatch span');
  assert(Math.abs(metrics.minContrast - Math.min(...contrasts)) < 1e-7);
  assert.equal(metrics.maxChannelError, Math.max(...errors));
  if (blank) {
    assert.equal(metrics.visibleColumns, 0, 'Old gradient must reproduce its blank paint');
    assert.equal(metrics.visibleSpanCSS, 0); assert(metrics.matchingColumns < metrics.sampledColumns);
  } else {
    assert.equal(metrics.visibleColumns, metrics.sampledColumns, 'Focused swatch must paint every sampled column');
    assert.equal(metrics.matchingColumns, metrics.sampledColumns, 'Focused swatch must match the speed gradient');
    finiteAtLeast(metrics.visibleSpanCSS, 48, 'Rendered swatch width');
    finiteAtLeast(metrics.minContrast, theme === 'contrast' ? 7 : 3, 'Rendered swatch contrast');
    assert(metrics.maxChannelError <= 4);
  }
  return true;
}
function visualReport(directory, kind) {
  const visuals = readJson(path.join(directory, 'visual-results.json'));
  if (!visuals) return;
  for (const key of ['sourceSha256', 'mirrorSha256', 'finalSourceSha256', 'finalMirrorSha256']) assert.equal(visuals[key], sourcePin, key);
  assert.equal(visuals.sourceStable, true); assert.equal(visuals.mirrorStable, true); assert.deepEqual(visuals.errors, []);
  assert.deepEqual(visuals.configurations.map(item => item.theme + '/' + item.width).sort(), [...combinations].sort());
  const swatchMetrics = new Map();
  for (const item of visuals.configurations) {
    const textFloor = item.theme === 'contrast' ? 7 : 4.5, graphicFloor = item.theme === 'contrast' ? 7 : 3;
    finiteAtLeast(item.minFont, 11.99, 'Minimum font'); finiteAtLeast(item.minTextContrast, textFloor, 'Text contrast');
    finiteAtLeast(item.minSVGContrast, graphicFloor, 'SVG contrast'); assert.equal(item.noOverflow, true);
    if (kind === 'trails') {
      assert.equal(item.rows, 5); finiteAtLeast(item.minCanvasContrast, graphicFloor, 'Canvas contrast');
      assert.equal(item.titleTextGroups, 5); finiteAtLeast(item.vacuumTextNodes, 1, 'Measured vacuum text nodes');
      assert.equal(item.textGlyphsWithinKeys, true);
      assert.equal(item.sceneFrameVerified, true);
      const focused = path.join(directory, 'swatch-focus-' + item.theme + '-' + item.width + '.png');
      assert(item.renderedSwatch, 'Rendered focused-swatch metrics missing');
      assert.equal(path.resolve(item.renderedSwatch.screenshot), focused, 'Focused swatch screenshot path');
      const metricPath = focused.replace(/\.png$/, '.json'), detailed = readJson(metricPath);
      if (!detailed) return;
      dependency(relative(metricPath)); png(focused);
      for (const key of ['sampledColumns', 'visibleColumns', 'matchingColumns', 'visibleSpanCSS', 'minContrast', 'maxChannelError'])
        assert.equal(item.renderedSwatch[key], detailed[key], 'Focused swatch summary: ' + key);
      if (!swatchRasterProof(detailed, focused, item.theme)) return;
      swatchMetrics.set(item.theme + '/' + item.width, detailed);
    } else {
      finiteAtLeast(item.minCanvasTextContrast, textFloor, 'Canvas text contrast');
      finiteAtLeast(item.minLegendTextContrast, textFloor, 'Legend text contrast');
      assert(Number.isFinite(item.pageOverflow) && item.pageOverflow <= 1);
      finiteAtLeast(item.row47Gap, 4, 'Second header row gap'); finiteAtLeast(item.cardCount, 1, 'Annotation cards');
      assert.equal(item.inspectionCardVisible, true); assert.equal(item.annotationVectorClearance, true);
      assert.equal(item.selectedCardPaintMatchesOriginal, true); assert.equal(item.selectedCardTitle, 'Falling');
      assert.match(item.selectedCardReading, /^y = \d+\.\d+ m · t = \d+\.\d{3} s$/);
    }
    const expected = path.join(directory, (kind === 'trails' ? 'trails-' : 'velocity-') + item.theme + '-' + item.width + '.png');
    assert.equal(path.resolve(item.screenshot), expected, 'Screenshot points outside its report');
    png(expected);
  }
  if (kind === 'trails') {
    const diagnostic = path.join(directory, 'gradient-negative-control');
    const evidencePath = path.join(diagnostic, 'evidence.json'), evidence = readJson(evidencePath);
    if (!evidence) return;
    dependency(relative(evidencePath)); assert.deepEqual(visuals.oldGradientReproduction, evidence, 'Negative control report binding');
    assert.equal(evidence.detectedBlankPaint, true); assert.equal(evidence.restoredPaintVerified, true);
    const negativeScreenshot = path.join(diagnostic, 'old-object-bounding-box.png');
    png(negativeScreenshot, diagnosticScreenshots);
    if (!swatchRasterProof(evidence.negative, negativeScreenshot, 'default', true)) return;
    assert.deepEqual(evidence.restored, swatchMetrics.get('default/1100'), 'Restoring the gradient must restore the measured positive paint');
    summary.gradientNegativeControl = { detectedBlankPaint: true, restoredPaintVerified: true,
      sampledColumns: evidence.negative.sampledColumns, visibleColumns: evidence.negative.visibleColumns };
  }
  summary.visualReports[kind] = {
    configurations: visuals.configurations.length,
    minFont: Math.min(...visuals.configurations.map(item => item.minFont)),
    minTextContrast: Math.min(...visuals.configurations.map(item => item.minTextContrast)),
    minSVGContrast: Math.min(...visuals.configurations.map(item => item.minSVGContrast)),
    ...(kind === 'trails' ? { minCanvasContrast: Math.min(...visuals.configurations.map(item => item.minCanvasContrast)),
      minRenderedSwatchContrast: Math.min(...visuals.configurations.map(item => item.renderedSwatch.minContrast)), focusedSwatchScreenshots: swatchMetrics.size } : {})
  };
}
check('Nine trail width/theme visual configurations', () => visualReport(report, 'trails'));
check('Nine point regression width/theme configurations and ten event screenshots', () => {
  const directory = path.join(report, 'point-regression'); visualReport(directory, 'points');
  phaseScreenshots.forEach(file => png(path.join(directory, file)));
});
check('51 historical files preserve the runner-recorded hashes', () => {
  const integrity = readJson(path.join(report, 'check-integrity.json'));
  if (!integrity) return;
  assert.equal(integrity.sourceSha256, sourcePin); assert.equal(integrity.sourceUnchanged, true); assert.equal(integrity.mirrorMatches, true);
  assert.equal(integrity.historicalFilesPreserved, 51); assert.equal(integrity.historical.length, 51);
  const paths = integrity.historical.map(item => item.path.replace(/\\/g, '/'));
  assert.equal(new Set(paths).size, 51, 'Duplicate historical paths');
  const expected = [];
  for (const [directory, count] of Object.entries(historicalDirectories)) {
    const absolute = path.join(root, 'reports', directory);
    if (!fs.existsSync(absolute)) { missing.add(relative(absolute)); continue; }
    const files = fs.readdirSync(absolute).filter(file => file === 'visual-results.json' || file.endsWith('.png'));
    assert.equal(files.length, count, directory + ' capture count');
    files.forEach(file => expected.push('reports/' + directory + '/' + file));
  }
  assert.deepEqual([...paths].sort(), expected.sort(), 'Historical manifest paths');
  for (const item of integrity.historical) {
    assert.match(item.sha256, /^[a-f0-9]{64}$/);
    const bytes = readBytes(path.join(root, item.path));
    if (bytes === null) continue;
    assert.equal(digest(bytes), item.sha256, 'Historical file changed: ' + item.path);
    if (item.path.endsWith('.png')) {
      assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
      summary.historicalScreenshots++;
    } else { JSON.parse(bytes.toString('utf8')); summary.historicalVisualReports++; }
  }
  assert.equal(summary.historicalScreenshots, 47); assert.equal(summary.historicalVisualReports, 4);
  summary.historicalFilesPreserved = integrity.historicalFilesPreserved;
});
check('Verifier and runner dependency hashes', () => {
  dependency(relative(__filename)); dependency(relative(path.join(report, 'run-checks.cjs')));
});
if (missing.size === 0 && failures.length === 0) check('Complete aggregate totals', () => {
  assert.equal(summary.browserTests, 28); assert.equal(screenshots.size, 37); assert.equal(diagnosticScreenshots.size, 1);
  assert.equal(Object.keys(summary.visualReports).length, 2);
});

const status = failures.length ? 'failed' : missing.size ? 'incomplete' : 'passed';
const verification = { status, passed: status === 'passed', complete: missing.size === 0,
  sourceSha256: sourcePin, baselineCommit: baseline, testPins, catalogKeys: Object.keys(catalogLabels),
  ...summary, browserFiles: [...browserFiles].sort(), screenshots: Object.fromEntries(screenshots), diagnosticScreenshots: Object.fromEntries(diagnosticScreenshots),
  dependencies, checks, missing: [...missing].sort(), failures,
  scope: 'Checks designated final report files and runner-recorded integrity hashes; does not execute tests or rewrite README.',
  completedAt: new Date().toISOString() };
const output = path.join(report, 'verification.json'), temporary = output + '.tmp-' + process.pid;
try { fs.writeFileSync(temporary, JSON.stringify(verification, null, 2) + '\n'); fs.renameSync(temporary, output); }
finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
console.log(JSON.stringify(verification, null, 2));
process.exitCode = status === 'passed' ? 0 : status === 'incomplete' ? 2 : 1;
