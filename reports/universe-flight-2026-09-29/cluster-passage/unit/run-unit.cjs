const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const stage = __dirname;
const runLabel = process.argv[2] || 'cluster-unit';
if (!/^[a-z0-9-]+$/.test(runLabel)) throw new Error('Invalid run label.');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const suffix of ['.log', '-results.json', '-summary.json']) {
  if (fs.existsSync(path.join(stage, runLabel + suffix))) throw new Error('Choose a fresh run label to preserve prior results.');
}
const testFile = path.join(root, 'tests/universe_flight_cluster_passage.test.js');
fs.copyFileSync(path.join(stage, 'candidate-cluster.test.js'), testFile);
const renderer = path.join(root, 'stem_lab/universe_flight_scene.js');
const ui = path.join(root, 'stem_lab/stem_tool_universe.js');
const before = { renderer: hash(renderer), ui: hash(ui), test: hash(testFile) };
const reportFile = path.join(stage, runLabel + '-results.json');
const output = fs.openSync(path.join(stage, runLabel + '.log'), 'w');
const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', path.join(stage, 'cluster-node.config.mjs'), '--configLoader=native', '--pool=forks', '--maxWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
const temp = path.join(stage, 'unit-temp'); fs.mkdirSync(temp, { recursive: true });
const child = spawn(process.execPath, args, { cwd: root, windowsHide: true, env: { ...process.env, TEMP: temp, TMP: temp, NODE_OPTIONS: '--max-old-space-size=256 --max-semi-space-size=4' }, stdio: ['ignore', output, output] });
fs.closeSync(output);
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => {
  const report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : {};
  const summary = { exitCode: code, tests: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests, before, after: { renderer: hash(renderer), ui: hash(ui), test: hash(testFile) } };
  fs.writeFileSync(path.join(stage, runLabel + '-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
  process.exitCode = code || (summary.before.renderer !== summary.after.renderer || summary.before.test !== summary.after.test ? 1 : 0);
});
