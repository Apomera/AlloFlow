const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const acorn = require('acorn');
const folder = 'reports/micro-lab-measurement-conversion-2026-10-01';
const kind = process.argv[2];
if (!['unit-focused', 'browser-focused', 'unit', 'browser'].includes(kind)) throw Error('Use unit-focused, browser-focused, unit, or browser.');
const expectedSource = '398c8511351de27b5198faaf6706b86cfe2803a746d4bdaa95515c79ab144434';
const sourceFiles = ['stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js'];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const unit = kind.startsWith('unit'), focused = kind.endsWith('-focused');
const names = unit ? ['growth_model', 'growth_workflow', 'microscope', 'resistance_sim', 'mystery_workflow', 'snow_map',
  'quiz_workflow', 'print_reference', 'gram_workflow', 'workspace', 'workspace_resume', 'workspace_navigation',
  'portfolio', 'portfolio_workflow', 'growth_citations', 'growth_citations_workflow', 'portfolio_selection',
  'portfolio_selection_workflow', 'annotation_integrity', 'annotation_integrity_workflow', 'resistance_outcomes',
  'measurement_conversion', 'measurement_conversion_workflow'] :
  ['annotation-integrity', 'portfolio-selection', 'growth-citations', 'portfolio', 'experiment-design', 'guided-resume', 'evidence-review', 'evidence-recovery', 'measurement-conversion'];
const files = focused ? (unit ? ['tests/microbiology_measurement_conversion.test.js', 'tests/microbiology_measurement_conversion_workflow.test.js'] : ['tests/e2e/microbiology-measurement-conversion.spec.ts']) :
  (unit ? names.map(name => 'tests/microbiology_' + name + '.test.js').concat(['tests/stem_microbiology_quiz.test.js']) : names.map(name => 'tests/e2e/microbiology-' + name + '.spec.ts'));
const expected = unit ? (focused ? 71 : 794) : (focused ? 7 : 56);
const statusFile = path.join(folder, kind + '-run-status.json');
if (fs.existsSync(statusFile)) {
  const previous = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
  if (previous.phase === 'running') {
    let alive = false;
    try { process.kill(previous.pid, 0); alive = true; } catch {}
    if (alive) throw Error('A validation runner is already active: ' + previous.pid);
  }
}
const testInputs = Object.fromEntries(files.map(file => [file, hash(file)]));
const status = { kind, pid: process.pid, started: new Date().toISOString(), phase: 'running', sourceSha256: expectedSource, expected, testInputs };
fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
function verifyInputs() {
  for (const file of sourceFiles) if (hash(file) !== expectedSource) throw Error('Validated candidate changed: ' + file);
  for (const [file, sha] of Object.entries(testInputs)) if (hash(file) !== sha) throw Error('Validated test changed: ' + file);
}
try {
  verifyInputs();
  for (const file of sourceFiles) acorn.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'script' });
  if (unit) for (const file of files) acorn.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
  const output = path.join(folder, kind === 'unit' || kind === 'browser' ? kind + '-results.json' : kind + '-results.json');
  const args = unit ? ['node_modules/vitest/vitest.mjs', 'run', ...files, '--maxWorkers=1', '--pool=forks', '--no-isolate',
    '--testTimeout=60000', '--hookTimeout=60000', '--silent', '--reporter=dot', '--reporter=json', '--outputFile=' + output] :
    ['node_modules/@playwright/test/cli.js', 'test', ...files, '--project=chromium', '--workers=1', '--retries=0', '--reporter=list,json', '--output=' + folder + '/' + kind + '-test-output'];
  const env = unit ? process.env : { ...process.env, MICROBIOLOGY_REPORT_DIR: path.resolve(folder), PLAYWRIGHT_JSON_OUTPUT_NAME: path.resolve(output) };
  const result = cp.spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  verifyInputs();
  status.exitCode = result.status === null ? 1 : result.status;
  status.signal = result.signal;
  if (status.exitCode === 0) {
    const report = JSON.parse(fs.readFileSync(output, 'utf8'));
    if (unit ? (!report.success || report.numPassedTests !== expected || report.numFailedTests || report.numPendingTests || report.testResults.length !== files.length) :
        (report.stats.expected !== expected || report.stats.unexpected || report.stats.flaky || report.stats.skipped || report.errors.length)) throw Error('Validation report does not contain every expected passing case.');
  }
  status.phase = status.exitCode === 0 ? 'passed' : 'failed';
  status.finished = new Date().toISOString();
  status.sourceStillMatches = true;
  status.testInputsStillMatch = true;
  status.syntaxChecksPassed = true;
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
  process.exitCode = status.exitCode;
} catch (error) {
  status.phase = 'failed'; status.error = error.message; status.finished = new Date().toISOString();
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
  throw error;
}
