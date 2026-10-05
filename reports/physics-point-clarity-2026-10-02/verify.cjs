// Run from the repository root after run-checks.cjs.
const fs = require('node:fs'), cp = require('node:child_process'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const report = 'reports/physics-point-clarity-2026-10-02';
const sourcePin = '6a03a494f50e75343ab912f205832db79bfa287eff45a0a577a1e774f9aebdd1';
const baseline = '54d638b3213b0fbd484305feff43b769da8902f7';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(report + '/' + file, 'utf8'));
const source = fs.readFileSync('stem_lab/stem_tool_physics.js');
assert.equal(digest(source), sourcePin);
assert(source.equals(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_physics.js')));
const before = cp.execFileSync('git', ['show', baseline + ':stem_lab/stem_tool_physics.js'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const prefix = text => text.replace(/\r\n/g, '\n').split("window.StemLab.registerTool('physics',")[0];
assert.equal(prefix(source.toString()), prefix(before), 'Numerical and recording helpers changed');
const units = read('unit-results.json');
assert.equal(units.success, true); assert.equal(units.numPassedTests, 356);
assert.equal(units.numFailedTests, 0); assert.equal(units.numPendingTests, 0);
assert.equal(units.testResults.length, 21); assert(units.testResults.every(file => file.status === 'passed'));
let browserCount = 0;
const browserFiles = new Set();
for (const [file, expectedCount] of [['canvas-regression-results.json', 7], ['point-results.json', 6], ['apex-regression-results.json', 5]]) {
  const result = read(file), cases = [];
  for (const key of ['unexpected', 'flaky', 'skipped']) assert.equal(result.stats[key], 0, file + ': ' + key);
  function walk(suite) {
    if (suite.file && /\.spec\.ts$/.test(suite.file)) browserFiles.add(suite.file.replace(/\\/g, '/').split('/').at(-1));
    for (const spec of suite.specs || []) for (const test of spec.tests) cases.push(...test.results);
    for (const child of suite.suites || []) walk(child);
  }
  result.suites.forEach(walk);
  assert.equal(cases.length, expectedCount); assert.equal(result.stats.expected, expectedCount);
  assert(cases.every(test => test.status === 'passed' && test.retry === 0 && !test.errors.length));
  browserCount += cases.length;
}
const integrity = read('check-integrity.json');
assert.equal(integrity.sourceSha256, sourcePin); assert.equal(integrity.sourceUnchanged, true);
assert.equal(integrity.mirrorMatches, true); assert.equal(integrity.historicalFilesPreserved, 31);
for (const item of integrity.historical) assert.equal(digest(fs.readFileSync(item.path)), item.sha256);
const configurations = [];
for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) configurations.push(theme + '/' + width);
const visuals = read('visual-results.json');
for (const key of ['sourceSha256', 'mirrorSha256', 'finalSourceSha256', 'finalMirrorSha256']) assert.equal(visuals[key], sourcePin);
assert.equal(visuals.sourceStable, true); assert.equal(visuals.mirrorStable, true); assert.deepEqual(visuals.errors, []);
assert.deepEqual(visuals.configurations.map(item => item.theme + '/' + item.width).sort(), configurations.sort());
for (const item of visuals.configurations) {
  assert(item.minFont >= 11.99); assert(item.minTextContrast >= (item.theme === 'contrast' ? 7 : 4.5));
  assert(item.noOverflow); assert(item.pageOverflow <= 1); assert(item.row47Gap >= 4);
  assert.equal(item.inspectionCardVisible, true); assert.equal(item.annotationVectorClearance, true); assert(item.cardCount > 0);
  assert.equal(item.selectedCardPaintMatchesOriginal, true); assert.equal(item.selectedCardTitle, 'Falling');
  assert.match(item.selectedCardReading, /^y = \d+\.\d+ m · t = \d+\.\d{3} s$/);
  assert(fs.readFileSync(item.screenshot).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
}
const phaseScreenshots = ['selected-launch.png', 'selected-rising.png', 'selected-apex.png', 'selected-near-apex.png',
  'selected-falling.png', 'selected-impact.png', 'selected-after-six-control-changes.png',
  'horizontal-release-unresolved.png', 'horizontal-release-canonical-apex.png', 'unfinished-highest-rising.png'];
for (const name of phaseScreenshots) assert(fs.readFileSync(report + '/' + name).subarray(0, 8)
  .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
const keys = ['sample_launch_point', 'sample_phase_rising', 'sample_phase_apex', 'sample_phase_release',
  'sample_phase_falling', 'sample_phase_level', 'sample_ground_impact'];
const catalogs = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'].map(file => JSON.parse(fs.readFileSync(file, 'utf8')).stem.physics);
for (const key of keys) {
  assert.equal(catalogs[0][key], catalogs[1][key]);
  assert(source.toString().includes("'stem.physics." + key + "', '" + catalogs[0][key] + "'"));
}
const verification = { passed: true, sourceSha256: sourcePin, mirrorMatches: true, numericalHelpersUnchanged: true,
  baselineCommit: baseline, unitTests: 356, unitFiles: 21, browserTests: browserCount, browserFiles: [...browserFiles].sort(),
  visualConfigurations: visuals.configurations.length, historicalFilesPreserved: integrity.historicalFilesPreserved,
  screenshots: visuals.configurations.length + phaseScreenshots.length,
  minFont: Math.min(...visuals.configurations.map(item => item.minFont)),
  minTextContrast: Math.min(...visuals.configurations.map(item => item.minTextContrast)),
  dependencies: Object.fromEntries(['stem_lab/stem_tool_physics.js', 'desktop/web-app/public/stem_lab/stem_tool_physics.js',
    'tests/e2e/physics-velocity-clarity.spec.ts', report + '/run-checks.cjs', report + '/verify.cjs']
    .map(file => [file, digest(fs.readFileSync(file))])) };
fs.writeFileSync(report + '/verification.json', JSON.stringify(verification, null, 2) + '\n');
const readme = [
  '# Physics: recorded point clarity', '',
  'Selecting a recorded point now shows its phase or event, height above ground, and time directly on the trajectory. The header identifies the recording, so the point card can focus on the selected moment.', '',
  '## Changes', '',
  '- Point cards distinguish Launch point, Rising, At apex, Falling, Vertical velocity is zero, and Ground impact.',
  '- A canonical horizontal-launch apex at time zero reads Highest point at release. An unresolved release remains Launch point; the highest sample in an unfinished ascent remains Rising.',
  '- Height and time come from the original selected observation. Small signed vertical velocities keep their phase near the apex, and changing all six next-launch settings preserves the selected card and CSV evidence.',
  '- Selecting launch, exact apex, or impact replaces the duplicate event card while keeping its marker ring visible.',
  '- Wider inspection cards have eight extra placement choices around the complete reserved arrow bundle. Every choice uses the existing marker, card, plot-boundary, and leader collision checks.', '',
  '## Verification', '',
  '- ' + verification.unitTests + ' unit tests passed across ' + verification.unitFiles + ' files.',
  '- ' + verification.browserTests + ' browser cases passed across ' + verification.browserFiles.length + ' files, using one worker and no retries.',
  '- Nine visual configurations cover 1100, 375, and 320 pixel widths in default, dark, and contrast themes. Every selected card remains visible, matches the original point, and clears actual velocity and gravity shafts and arrowheads.',
  '- No page overflow. Minimum measured font: ' + verification.minFont.toFixed(2) + ' px. Minimum measured text contrast: ' + verification.minTextContrast.toFixed(2) + ':1.',
  '- Numerical and recording helpers match baseline commit ' + baseline + ' after line-ending normalization. Source and desktop copy are identical; 31 earlier report captures retain their original bytes.', '',
  'The first visual run exposed a missing wider card in a crowded plot and a measurement issue that counted grid text painted beneath an opaque card. The final source adds safe placement choices; the recorder now measures text painted after its matching card fill. Initial results and traces are retained in initial-layout-results.json and initial-layout-artifacts.', '',
  '## Visuals', '',
  '[Phone flight view](velocity-default-320.png) · [Desktop flight view](velocity-default-1100.png) · [Contrast flight view](velocity-contrast-320.png)', '',
  '[Exact apex](selected-apex.png) · [Highest point at release](horizontal-release-canonical-apex.png) · [Unfinished ascent](unfinished-highest-rising.png)', '',
  '## Reproduce', '',
  'Run from the repository root:', '',
  '```powershell',
  'node reports/physics-point-clarity-2026-10-02/run-checks.cjs',
  'node reports/physics-point-clarity-2026-10-02/verify.cjs',
  '```', '',
  'Source SHA-256: `' + sourcePin + '`.', '',
  'The enhancements are left uncommitted.', ''
];
fs.writeFileSync(report + '/README.md', readme.join('\n'));
console.log(JSON.stringify(verification, null, 2));
