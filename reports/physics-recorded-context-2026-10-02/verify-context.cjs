// Run from the repository root after the unit and browser commands in README.md.
const fs = require('fs'), cp = require('child_process'), crypto = require('crypto'), assert = require('assert/strict');
const report = 'reports/physics-recorded-context-2026-10-02';
const sourcePin = '34db61cc62bdb6b6a10a3ef6932225e7deaba2fa310d29a690911ad80ef9279c';
const baseline = '54d638b3213b0fbd484305feff43b769da8902f7';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(report + '/' + name, 'utf8'));
const source = fs.readFileSync('stem_lab/stem_tool_physics.js');
assert.equal(digest(source), sourcePin);
assert(source.equals(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_physics.js')));
const before = cp.execFileSync('git', ['show', baseline + ':stem_lab/stem_tool_physics.js'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const simulationPrefix = text => text.replace(/\r\n/g, '\n').split('function physRenderFlightHistory()')[0];
assert.equal(simulationPrefix(source.toString()), simulationPrefix(before), 'Simulation and recording code changed');
const units = read('unit-results.json');
assert.equal(units.success, true);
assert.equal(units.numPassedTests, 356);
assert.equal(units.numFailedTests, 0);
assert.equal(units.numPendingTests, 0);
assert.equal(units.testResults.length, 21);
assert(units.testResults.every(file => file.status === 'passed'));
const browser = read('browser-results.json');
for (const key of ['unexpected', 'flaky', 'skipped']) assert.equal(browser.stats[key], 0);
const results = [], files = [];
function walk(suite) {
  if (suite.file && /\.spec\.ts$/.test(suite.file)) files.push(suite.file.replace(/\\/g, '/').split('/').at(-1));
  for (const spec of suite.specs || []) for (const test of spec.tests) results.push(...test.results);
  for (const child of suite.suites || []) walk(child);
}
browser.suites.forEach(walk);
const expectedFiles = ['72-physics-lab-behaviour.spec.ts', 'physics-flight-integrity.spec.ts',
  'physics-model-comparison.spec.ts', 'physics-flight-history.spec.ts', 'physics-analysis-workspace.spec.ts',
  'physics-apex-inspection.spec.ts', 'physics-energy-visuals.spec.ts', 'physics-force-clarity.spec.ts',
  'physics-investigation-evidence.spec.ts', 'physics-graph-landmarks.spec.ts', 'physics-sample-inspection.spec.ts',
  'physics-recorded-flights.spec.ts', 'physics-recorded-context.spec.ts'];
assert.deepEqual([...new Set(files)].sort(), expectedFiles.sort());
assert.equal(results.length, browser.stats.expected);
assert.equal(results.length, 82);
assert(results.every(result => result.status === 'passed' && result.retry === 0 && !result.errors.length));
const visuals = read('visual-results.json');
assert.equal(visuals.passed, true);
assert.equal(visuals.sourceUnchanged, true);
assert.equal(visuals.sourceSha256, sourcePin);
assert.equal(visuals.mirrorSha256, sourcePin);
assert.deepEqual(visuals.errors, []);
const configurations = [];
for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) configurations.push(theme + '/' + width);
assert.deepEqual(visuals.configurations.map(item => item.theme + '/' + item.width).sort(), configurations.sort());
const recordingVisuals = read('recording-regression/visual-results.json');
assert.equal(recordingVisuals.passed, true);
assert.equal(recordingVisuals.sourceUnchanged, true);
assert.equal(recordingVisuals.sourceSha256, sourcePin);
assert.equal(recordingVisuals.mirrorSha256, sourcePin);
assert.deepEqual(recordingVisuals.errors, []);
assert.deepEqual(recordingVisuals.configurations.map(item => item.theme + '/' + item.width).sort(), configurations.sort());
for (const item of recordingVisuals.configurations) {
  assert.equal(item.pageOverflow, 0); assert.equal(item.overflow, 0);
  assert(item.minFont >= 12);
  assert(item.minContrast >= (item.theme === 'contrast' ? 7 : 4.5));
  assert(item.targets.every(target => target.width >= 44 && target.height >= 44));
}
const screenshots = visuals.configurations.map(item => item.screenshot).concat('context-data-320.png',
  recordingVisuals.configurations.map(item => 'recording-regression/' + item.screenshot));
for (const item of visuals.configurations) {
  assert.equal(item.pageOverflow, 0);
  assert(item.minFont >= 12);
  assert(item.minContrast >= (item.theme === 'contrast' ? 7 : 4.5));
  assert.equal(item.targets.length, 2);
  assert(item.targets.every(target => target.width >= 44 && target.height >= 44));
  assert.equal(item.selectedRun, 1);
  assert(item.selectedIndex > 0 && item.selectedIndex < item.originalPoints - 1);
}
for (const file of screenshots) assert(fs.readFileSync(report + '/' + file).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
const keys = ['recorded_angle', 'recorded_speed', 'recorded_gravity', 'recorded_mass', 'recorded_height', 'recorded_drag',
  'recorded_next_value', 'recorded_settings_match', 'recorded_settings_one_change', 'recorded_settings_many_changes',
  'reuse_recorded_settings', 'reuse_recorded_settings_flight', 'reuse_recorded_settings_unsupported',
  'reuse_recorded_settings_help', 'show_on_trajectory'];
const physicsCatalog = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.physics;
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const current = JSON.parse(fs.readFileSync(file, 'utf8')).stem.physics;
  const previous = JSON.parse(cp.execFileSync('git', ['show', baseline + ':' + file], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })).stem.physics;
  assert.deepEqual(current, physicsCatalog);
  assert.deepEqual(Object.keys(current).filter(key => !(key in previous)).sort(), keys.slice().sort());
  for (const key of Object.keys(previous)) assert.equal(current[key], previous[key]);
}
const dependencies = ['stem_lab/stem_tool_physics.js', 'desktop/web-app/public/stem_lab/stem_tool_physics.js',
  'tests/physics_recorded_context.test.js', 'tests/e2e/physics-recorded-context.spec.ts',
  'tests/e2e/helpers/stem_gl_harness.ts', 'tests/helpers/physics_element_tree.js', '.github/workflows/physics.yml',
  report + '/run-context-checks.cjs'];
const verification = { passed: true, sourceSha256: sourcePin, mirrorMatches: true, baselineCommit: baseline,
  simulationPrefixUnchanged: true, unitTests: 356, unitFiles: 21, browserTests: results.length, browserFiles: expectedFiles,
  configurations: 9, screenshots: screenshots.length, addedPhysicsKeys: keys,
  minFont: Math.min(...visuals.configurations.map(item => item.minFont)),
  minContrast: Math.min(...visuals.configurations.concat(recordingVisuals.configurations).map(item => item.minContrast)),
  dependencySha256: Object.fromEntries(dependencies.map(file => [file, digest(fs.readFileSync(file))])),
  reportSha256: Object.fromEntries(['unit-results.json', 'browser-results.json', 'visual-results.json', 'recording-regression/visual-results.json', 'verify-context.cjs']
    .concat(screenshots).map(file => [file, digest(fs.readFileSync(report + '/' + file))])) };
fs.writeFileSync(report + '/verification.json', JSON.stringify(verification, null, 2) + '\n');
const readme = [
  '# Physics: recorded settings and repeat trials', '',
  'Recorded flights now show a readable settings card across Motion, Forces, Energy, and Data. Each changed control shows its planned next-launch value beneath the original value.', '',
  '## Improvements', '',
  '- Names the original launch angle, speed, gravity, mass, launch height, and air drag, with units and run identity.',
  '- Shows whether the next launch matches, changes one setting, or changes several settings. A single action prepares the original six settings for a repeat trial.',
  '- Keeps the selected recorded sample, active view, paused playback, complete evidence, and CSV intact when settings are applied. A new repeat launch reproduces the original recorded points.',
  '- Blocks settings reuse during unfinished flights, pending demonstrations, and active missions, challenges, or battles. Queued and stale actions recheck the current controller and retained evidence.',
  '- Adds original sample numbers to the shared timeline and sparse Data rows, plus a Show on trajectory action that focuses the same selected point on the canvas.',
  '- Uses wrapping cards, grouped values and units, visible keyboard focus, readable disabled controls, and three themes at phone and desktop sizes.', '',
  '## Verified results', '',
  '- **356 unit checks passed across 21 files**, including 13 new atomic-update and stale-event cases.',
  '- **82 browser cases passed across 13 files**, with one local Chromium worker and no retries.',
  '- **Nine visual configurations passed**: 1,100, 375, and 320 pixels in light, dark, and high-contrast themes. No horizontal page overflow; minimum text size 12 px; both actions at least 44 × 44 px.',
  '- Minimum measured text contrast: **' + verification.minContrast.toFixed(2) + ':1**. Nineteen screenshots cover settings, recording history, and the phone Data table. Previous dated reports are preserved.',
  '- Source and desktop mirror match SHA-256 `' + sourcePin + '`. The simulation and recording prefix matches the prior physics commit. All 15 new English labels exist in both catalogs.', '',
  'The browser cases use the repository’s local React harness, actual canvas controller, and compiled app stylesheet. They check original observations and exported CSV. These results cover the local code; a deployed build was not exercised.', '',
  'Changes were left uncommitted.', '',
  '## Reproduce', '',
  'Run from the repository root after installing the project dependencies and local Chromium:', '',
  '```powershell', 'node reports/physics-recorded-context-2026-10-02/run-context-checks.cjs', '```', '',
  'The runner executes units and browsers sequentially, then checks the saved reports, original simulation prefix, mirror, catalog keys, and screenshots. The physics CI workflow includes the new browser suite.', '',
  '## Screenshots', '',
  '| Theme | Desktop | 375 px | 320 px |', '| --- | --- | --- | --- |',
  '| Light | [Open](context-default-1100.png) | [Open](context-default-375.png) | [Open](context-default-320.png) |',
  '| Dark | [Open](context-dark-1100.png) | [Open](context-dark-375.png) | [Open](context-dark-320.png) |',
  '| High contrast | [Open](context-contrast-1100.png) | [Open](context-contrast-375.png) | [Open](context-contrast-320.png) |', '',
  '[Phone Data table](context-data-320.png) · [Recording history at 320 px](recording-regression/recordings-default-320.png) · [Verification](verification.json)', ''
].join('\n');
fs.writeFileSync(report + '/README.md', readme);
console.log(JSON.stringify({ passed: true, units: 356, browsers: results.length, configurations: 9, sourceSha256: sourcePin }));
