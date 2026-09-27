const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const root = path.resolve(__dirname, '../../../..'), dir = __dirname;
const selection = JSON.parse(fs.readFileSync(path.join(dir, 'selection.json'), 'utf8'));
const git = args => cp.execFileSync('git', ['--no-optional-locks', ...args], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim().split(/\r?\n/).filter(Boolean);
const changed = git(['diff', 'HEAD', '--name-only', '--diff-filter=ACMRT']);
const runtime = [...new Set([...changed.filter(file => !/^(?:tests|reports|docs|dev-tools)\//.test(file) && /\.(?:jsx?|json|css|html|txt)$/.test(file) && file !== 'AGENT_HANDOFF.md'), 'reader_place_store.js', 'reader_support_drafts.js', 'instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'karaoke_audio_store_module.js', 'read_aloud_audio_service_module.js', 'read_aloud_artifact_audio_module.js', 'immersive_reader_source.jsx', 'immersive_reader_module.js', 'export_source.jsx', 'export_module.js', 'utils_pure_module.js', 'app_styles_module.js'])].sort();
const monitored = [...new Set([...runtime, ...selection.selected, 'tests/setup.js', 'vitest.config.js', 'package.json', 'tests/QUARANTINE.txt'])].filter(file => fs.existsSync(path.join(root, file))).sort();
const snapshot = () => ({ at: new Date().toISOString(), head: git(['rev-parse', 'HEAD'])[0], files: Object.fromEntries(monitored.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])) });
const before = snapshot(); fs.writeFileSync(path.join(dir, 'inputs-before.json'), JSON.stringify(before, null, 2) + '\n');
const runs = [], failures = [];
const run = (name, files, extra = []) => new Promise(resolve => {
  const json = path.join(dir, name + '.json'), log = path.join(dir, name + '.stdout.log');
  const args = ['node_modules/vitest/vitest.mjs', 'run', ...files, '--maxWorkers=1', ...extra, '--reporter=default', '--reporter=json', '--outputFile=' + json];
  const started = new Date().toISOString(), output = fs.createWriteStream(log);
  const child = cp.spawn(process.execPath, args, { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  child.stdout.pipe(output, { end: false }); child.stderr.pipe(output, { end: false });
  console.log(JSON.stringify({ event: 'started', name, suites: files.length, pid: child.pid, started }));
  child.on('error', error => { output.end(String(error)); resolve({ name, started, error: String(error), exitCode: null, files, args }); });
  child.on('close', code => { output.end(); const result = { name, started, finished: new Date().toISOString(), exitCode: code, files, args, json: path.relative(root, json), stdout: path.relative(root, log) };
    if (fs.existsSync(json)) { const report = JSON.parse(fs.readFileSync(json, 'utf8')); result.summary = { tests: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests, pending: report.numPendingTests, files: report.testResults?.length, success: report.success };
      for (const suite of report.testResults || []) { const bad = (suite.assertionResults || []).filter(test => test.status === 'failed'); if (suite.status === 'failed' || bad.length) failures.push({ run: name, file: path.relative(root, suite.name).replace(/\\/g, '/'), message: suite.message, tests: bad.map(test => ({ name: test.fullName || test.title, messages: test.failureMessages })) }); }
    } else result.reportMissing = true;
    console.log(JSON.stringify({ event: 'completed', name, exitCode: code, summary: result.summary })); resolve(result);
  });
});
(async () => {
  runs.push(await run('normal', selection.groups.normal));
  runs.push(await run('preview-tree-30s', selection.groups.existing30SecondConvention, ['--testTimeout=30000']));
  const after = snapshot(), drift = monitored.filter(file => before.files[file] !== after.files[file]);
  fs.writeFileSync(path.join(dir, 'inputs-after.json'), JSON.stringify(after, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'failure-list.json'), JSON.stringify(failures, null, 2) + '\n');
  const receipt = { selected: selection.selected.length, beforeHead: before.head, afterHead: after.head, monitoredInputs: monitored.length, drift, runs, failureFiles: failures.length };
  fs.writeFileSync(path.join(dir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ event: 'finished', selected: receipt.selected, monitoredInputs: receipt.monitoredInputs, drift, failureFiles: failures.length, failures: failures.map(x => ({ file: x.file, tests: x.tests.map(t => t.name), suiteMessage: x.message })) }));
  process.exitCode = runs.some(result => result.exitCode !== 0) || drift.length ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
