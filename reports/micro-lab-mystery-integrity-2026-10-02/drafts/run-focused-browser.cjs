const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const acorn = require('acorn');
const folder = 'reports/micro-lab-mystery-integrity-2026-10-02';
const files = ['tests/e2e/microbiology-mystery-integrity.spec.ts'];
const sourceFiles = ['stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js'];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const expectedSource = hash(sourceFiles[0]);
const statusFile = path.join(folder, 'browser-focused-run-status.json');
const testInputs = Object.fromEntries(files.map(file => [file, hash(file)]));
const status = { kind: 'browser-focused', pid: process.pid, started: new Date().toISOString(), phase: 'running', sourceSha256: expectedSource, expected: 7, testInputs };
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
try {
  for (const file of sourceFiles) {
    if (hash(file) !== expectedSource) throw Error('Source mirror mismatch: ' + file);
    acorn.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'script' });
  }
  const output = path.resolve(folder, 'browser-focused-results.json');
  const args = ['node_modules/@playwright/test/cli.js', 'test', ...files, '--project=chromium', '--workers=1', '--retries=0', '--reporter=list,json', '--output=' + folder + '/browser-focused-test-output'];
  const env = { ...process.env, MICROBIOLOGY_REPORT_DIR: path.resolve(folder), PLAYWRIGHT_JSON_OUTPUT_NAME: output };
  const result = cp.spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  status.exitCode = result.status === null ? 1 : result.status;
  status.signal = result.signal;
  status.sourceStillMatches = sourceFiles.every(file => hash(file) === expectedSource);
  status.testInputsStillMatch = files.every(file => hash(file) === testInputs[file]);
  status.syntaxChecksPassed = true;
  if (status.exitCode === 0) {
    const report = JSON.parse(fs.readFileSync(output, 'utf8'));
    if (report.stats.expected !== 7 || report.stats.unexpected || report.stats.flaky || report.stats.skipped || report.errors.length) throw Error('Expected all seven browser scenarios to pass.');
  }
  status.phase = status.exitCode === 0 ? 'passed' : 'failed';
  process.exitCode = status.exitCode;
} catch (error) {
  status.phase = 'failed'; status.error = error.message; process.exitCode = 1;
} finally {
  status.finished = new Date().toISOString();
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
}
