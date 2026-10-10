const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const reportDir = path.join(root, 'reports/universe-flight-2026-09-29/landmark-journeys/unit');
function argument(name) { return process.argv.slice(2).find(value => value.startsWith('--' + name + '='))?.slice(name.length + 3); }
const expectedUi = argument('ui-sha'), expectedRenderer = argument('renderer-sha'), runLabel = argument('run');
if (!/^[a-f0-9]{64}$/.test(expectedUi || '') || !/^[a-f0-9]{64}$/.test(expectedRenderer || '')) throw new Error('Explicit UI and renderer pins are required.');
if (!/^[a-z0-9-]+$/.test(runLabel || '')) throw new Error('A fresh run label is required.');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceFiles = {
  browserTest: path.join(root, "tests/universe_flight_landmark_browser.test.js"),
  guidanceTest: path.join(root, 'tests/universe_flight_pair_guidance.test.js'),
  renderer: path.join(root, 'stem_lab/universe_flight_scene.js'),
  ui: path.join(root, 'stem_lab/stem_tool_universe.js'),
  pairTest: path.join(root, 'tests/universe_flight_pair_frame.test.js'),
  inspectorTest: path.join(root, 'tests/universe_flight_inspector.test.js'),
  layoutTest: path.join(root, 'tests/universe_flight_pair_layout.test.js'),
};
const pins = () => Object.fromEntries(Object.entries(sourceFiles).map(([key, file]) => [key, hash(file)]));
const before = pins();
if (before.ui !== expectedUi || before.renderer !== expectedRenderer) throw new Error('Source pins do not match requested final sources.');
fs.mkdirSync(reportDir, { recursive: true });
const reportFile = path.join(reportDir, runLabel + '-results.json');
const summaryFile = path.join(reportDir, runLabel + '-summary.json');
const logFile = path.join(reportDir, runLabel + '.log');
for (const file of [reportFile, summaryFile, logFile]) if (fs.existsSync(file)) throw new Error('Choose a fresh run label.');
const output = fs.openSync(logFile, 'w');
const temp = path.join(__dirname, 'unit-temp'); fs.mkdirSync(temp, { recursive: true });
const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', path.join(__dirname, 'layout-node.config.mjs'), '--configLoader=native', '--pool=forks', '--maxWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
const child = spawn(process.execPath, args, { cwd: root, windowsHide: true, env: { ...process.env, TEMP: temp, TMP: temp, NODE_OPTIONS: '--max-old-space-size=256 --max-semi-space-size=4' }, stdio: ['ignore', output, output] });
fs.closeSync(output);
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => {
  const report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : {};
  const after = pins();
  const summary = { exitCode: code, tests: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests, expected: { ui: expectedUi, renderer: expectedRenderer }, before, after, unchanged: JSON.stringify(before) === JSON.stringify(after), expectedPins: after.ui === expectedUi && after.renderer === expectedRenderer };
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2) + '\n');
  for (const name of ['layout-node.config.mjs', 'run-layout-unit.cjs']) fs.copyFileSync(path.join(__dirname, name), path.join(reportDir, name));
  for (const key of ['browserTest', 'guidanceTest', 'pairTest', 'inspectorTest', 'layoutTest']) fs.copyFileSync(sourceFiles[key], path.join(reportDir, 'executed-' + path.basename(sourceFiles[key])));
  console.log(JSON.stringify(summary));
  process.exitCode = code || (summary.unchanged && summary.expectedPins && summary.tests === 30 && summary.passed === 30 && summary.failed === 0 ? 0 : 1);
});
