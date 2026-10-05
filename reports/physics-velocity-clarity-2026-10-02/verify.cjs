// Run from the repository root after run-checks.cjs.
const fs = require('node:fs'), cp = require('node:child_process'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const report = 'reports/physics-velocity-clarity-2026-10-02';
const sourcePin = '596e6ca995da835bc29767b4671d491be3af1e535131c3abed0a65c5e6f6b4e9';
const baseline = '54d638b3213b0fbd484305feff43b769da8902f7';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(report + '/' + name, 'utf8'));
const source = fs.readFileSync('stem_lab/stem_tool_physics.js');
assert.equal(digest(source), sourcePin);
assert(source.equals(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_physics.js')));
const before = cp.execFileSync('git', ['show', baseline + ':stem_lab/stem_tool_physics.js'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const enginePrefix = text => text.replace(/\r\n/g, '\n').split("window.StemLab.registerTool('physics',")[0];
assert.equal(enginePrefix(source.toString()), enginePrefix(before), 'Numerical and recording helpers changed');
const units = read('unit-results.json');
assert.equal(units.success, true); assert.equal(units.numPassedTests, 356);
assert.equal(units.numFailedTests, 0); assert.equal(units.numPendingTests, 0);
assert.equal(units.testResults.length, 21); assert(units.testResults.every(file => file.status === 'passed'));
let browserCount = 0;
const browserFiles = new Set();
for (const [file, expectedCount] of [['canvas-regression-results.json', 7], ['velocity-results.json', 4], ['browser-results.json', 41]]) {
  const result = read(file), results = [];
  for (const key of ['unexpected', 'flaky', 'skipped']) assert.equal(result.stats[key], 0);
  function walk(suite) {
    if (suite.file && /\.spec\.ts$/.test(suite.file)) browserFiles.add(suite.file.replace(/\\/g, '/').split('/').at(-1));
    for (const spec of suite.specs || []) for (const test of spec.tests) results.push(...test.results);
    for (const child of suite.suites || []) walk(child);
  }
  result.suites.forEach(walk);
  assert.equal(results.length, expectedCount); assert.equal(result.stats.expected, expectedCount);
  assert(results.every(test => test.status === 'passed' && test.retry === 0 && !test.errors.length));
  browserCount += results.length;
}
assert.equal(browserCount, 52); assert.equal(browserFiles.size, 10);
const integrity = read('check-integrity.json');
assert.equal(integrity.sourceSha256, sourcePin); assert.equal(integrity.sourceUnchanged, true);
assert.equal(integrity.mirrorMatches, true); assert.equal(integrity.historicalFilesPreserved, 21);
const configurations = [];
for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) configurations.push(theme + '/' + width);
const visuals = read('visual-results.json');
for (const key of ['sourceSha256', 'mirrorSha256', 'finalSourceSha256', 'finalMirrorSha256']) assert.equal(visuals[key], sourcePin);
assert.equal(visuals.sourceStable, true); assert.equal(visuals.mirrorStable, true); assert.deepEqual(visuals.errors, []);
assert.deepEqual(visuals.configurations.map(item => item.theme + '/' + item.width).sort(), configurations.slice().sort());
const screenshots = [];
for (const item of visuals.configurations) {
  assert(item.minFont >= 11.99); assert(item.minTextContrast >= (item.theme === 'contrast' ? 7 : 4.5));
  assert(item.minSVGContrast >= (item.theme === 'contrast' ? 7 : 3));
  assert(item.noOverflow); assert(item.pageOverflow <= 1); assert(item.row47Gap >= 4);
  assert.equal(item.inspectionCardVisible, true); assert.equal(item.annotationVectorClearance, true); assert(item.cardCount > 0);
  screenshots.push(item.screenshot);
}
for (const archive of ['context-regression', 'recording-regression']) {
  const result = read(archive + '/visual-results.json');
  assert.equal(result.passed, true); assert.equal(result.sourceUnchanged, true);
  assert.equal(result.sourceSha256, sourcePin); assert.equal(result.mirrorSha256, sourcePin);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.configurations.map(item => item.theme + '/' + item.width).sort(), configurations.slice().sort());
  for (const item of result.configurations) {
    assert.equal(item.pageOverflow, 0); assert(item.minFont >= 12);
    assert(item.minContrast >= (item.theme === 'contrast' ? 7 : 4.5));
    screenshots.push(report + '/' + archive + '/' + item.screenshot);
  }
}
screenshots.push(report + '/context-regression/context-data-320.png');
for (const file of screenshots) assert(fs.readFileSync(file).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
const keys = ['plot_velocity_key', 'plot_vx_key', 'plot_vy_key', 'plot_g_key', 'plot_vector_speed_help', 'plot_vector_scale_help'];
const catalogs = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'].map(file => JSON.parse(fs.readFileSync(file, 'utf8')).stem.physics);
assert.deepEqual(catalogs[0], catalogs[1]);
const sourceText = source.toString();
for (const key of keys) assert(sourceText.includes("'stem.physics." + key + "', '" + catalogs[0][key] + "'"));
const verification = { passed: true, sourceSha256: sourcePin, mirrorMatches: true, numericalHelpersUnchanged: true,
  baselineCommit: baseline, unitTests: 356, unitFiles: 21, browserTests: browserCount, browserFiles: [...browserFiles].sort(),
  velocityConfigurations: 9, contextConfigurations: 9, recordingConfigurations: 9, screenshots: screenshots.length,
  historicalFilesPreserved: 21, newEnglishLabels: keys,
  minFont: Math.min(...visuals.configurations.map(item => item.minFont)),
  minTextContrast: Math.min(...visuals.configurations.map(item => item.minTextContrast)),
  minSVGContrast: Math.min(...visuals.configurations.map(item => item.minSVGContrast)),
  minHeaderGap: Math.min(...visuals.configurations.map(item => item.row47Gap)),
  dependencies: Object.fromEntries(['stem_lab/stem_tool_physics.js', 'desktop/web-app/public/stem_lab/stem_tool_physics.js',
    'tests/e2e/physics-velocity-clarity.spec.ts', '.github/workflows/physics.yml', report + '/run-checks.cjs', report + '/verify.cjs']
    .map(file => [file, digest(fs.readFileSync(file))])) };
fs.writeFileSync(report + '/verification.json', JSON.stringify(verification, null, 2) + '\n');
const readme = [
  '# Physics: velocity and trajectory clarity', '',
  'The flight view now distinguishes launch speed from the speed at the displayed point. Directional component arrows and a named legend explain how velocity changes through the flight.', '',
  '## Changes', '',
  '- The launch header labels speed as v₀. The live or selected point shows its current speed |v|, calculated from the displayed horizontal and vertical components.',
  '- Dashed horizontal and vertical arrows have solid heads that follow their signed direction. Exact zero draws no component arrow, and tiny nonzero components retain their proportional length.',
  '- Small live values keep their sign and magnitude instead of rounding to a misleading zero near the apex.',
  '- The legend names total velocity, horizontal velocity, vertical velocity, and gravity. Patterns and units distinguish velocity from downward acceleration. It explains the shared velocity scale, separate gravity scale, and speed at the apex.',
  '- Annotation cards reserve space around the complete arrow bundle so labels cannot cover shafts or arrowheads.', '',
  '## Verification', '',
  '- 356 unit tests passed across 21 files.',
  '- 52 browser cases passed across 10 files, using one worker and no retries.',
  '- Nine velocity layouts cover 1100, 375, and 320 pixel widths in default, dark, and contrast themes. Actual painted cards, arrows, and glyphs were measured.',
  '- Every layout keeps the selected-point annotation visible and clear of all velocity and gravity arrows.',
  '- No page overflow. Minimum measured font: ' + verification.minFont.toFixed(2) + ' px. Minimum text contrast: ' + verification.minTextContrast.toFixed(2) + ':1. Minimum symbol contrast: ' + verification.minSVGContrast.toFixed(2) + ':1.',
  '- The speed reading stays at least ' + verification.minHeaderGap.toFixed(2) + ' px clear of the gravity and mass readings.',
  '- Numerical and recording helpers match baseline commit ' + baseline + ' after line-ending normalization. Recorded points, captured settings, and CSV output retain their original values.',
  '- Source and desktop copy are identical. All 21 earlier report captures were restored; this run retains its new copies in context-regression and recording-regression.', '',
  'An initial broader run exhausted memory in test workers. Its results and failure evidence are preserved in memory-limited-browser-results.json and memory-limited-browser-artifacts. The final run uses a smaller worker heap and nursery.', '',
  '## Visuals', '',
  '[Phone flight view](velocity-default-320.png) · [Desktop flight view](velocity-default-1100.png) · [Contrast flight view](velocity-contrast-320.png)', '',
  '## Reproduce', '',
  'Run from the repository root:', '',
  '```powershell',
  'node reports/physics-velocity-clarity-2026-10-02/run-checks.cjs',
  'node reports/physics-velocity-clarity-2026-10-02/verify.cjs',
  '```', '',
  'Source SHA-256: `' + sourcePin + '`.', '',
  'The enhancements are left uncommitted.', ''
];
fs.writeFileSync(report + '/README.md', readme.join('\n'));
console.log(JSON.stringify(verification, null, 2));
