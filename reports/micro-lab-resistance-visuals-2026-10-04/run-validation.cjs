const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const acorn = require('acorn');
const folder = 'reports/micro-lab-resistance-visuals-2026-10-04';
const phaseName = process.argv[2];
const kind = phaseName.replace(/-(final|polish)$/, '');
const config = JSON.parse(fs.readFileSync(path.join(folder, 'candidate.json'), 'utf8'));
if (!['unit', 'browser', 'unit-focused', 'browser-focused'].includes(kind)) throw Error('Unknown validation kind');
const names = ['growth_model', 'growth_workflow', 'microscope', 'resistance_sim', 'mystery_workflow', 'snow_map',
  'quiz_workflow', 'print_reference', 'gram_workflow', 'workspace', 'workspace_resume', 'workspace_navigation',
  'portfolio', 'portfolio_workflow', 'growth_citations', 'growth_citations_workflow', 'portfolio_selection',
  'portfolio_selection_workflow', 'annotation_integrity', 'annotation_integrity_workflow', 'resistance_outcomes',
  'measurement_conversion', 'measurement_conversion_workflow', 'mystery_integrity', 'home_integrity', 'resistance_rounds', 'resistance_visuals'];
const browserNames = ['annotation-integrity', 'portfolio-selection', 'growth-citations', 'portfolio', 'experiment-design',
  'guided-resume', 'evidence-review', 'evidence-recovery', 'measurement-conversion', 'mystery-integrity', 'home-integrity', 'resistance-rounds', 'resistance-visuals'];
const unit = kind.startsWith('unit'), focused = kind.endsWith('-focused');
const files = focused ? [unit ? 'tests/microbiology_resistance_visuals.test.js' : 'tests/e2e/microbiology-resistance-visuals.spec.ts'] :
  unit ? names.map(x => 'tests/microbiology_' + x + '.test.js').concat(['tests/stem_microbiology_quiz.test.js']) :
    browserNames.map(x => 'tests/e2e/microbiology-' + x + '.spec.ts');
const expected = unit ? (focused ? config.newUnitCases : 1027 + config.newUnitCases) : (focused ? config.newBrowserCases : 78 + config.newBrowserCases);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const runtime = ['stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js'];
const support = ['playwright.config.ts', 'tests/e2e/helpers/stem_gl_harness.ts', 'tests/helpers/stem_widgets_smoke_harness.js', 'tests/e2e/helpers/png_pixels.ts',
  'desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
  'vendor/three-r128/three.min.js', 'node_modules/@playwright/test/package.json', 'node_modules/playwright/package.json',
  'node_modules/playwright-core/package.json'];
const inputs = Object.fromEntries(files.concat(support).map(file => [file, hash(file)]));
const statusFile = path.join(folder, phaseName + '-run-status.json');
if (fs.existsSync(statusFile)) throw Error('Retain prior results; use a fresh phase name for another run.');
const status = { kind, phaseName, pid: process.pid, phase: 'running', started: new Date().toISOString(), sourceSha256: config.sourceSha256, expected,
  files, testInputs: inputs };
function verify() {
  for (const file of runtime) if (hash(file) !== config.sourceSha256) throw Error('Runtime changed: ' + file);
  for (const [file, expectedHash] of Object.entries(inputs)) if (hash(file) !== expectedHash) throw Error('Input changed: ' + file);
}
fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
try {
  verify();
  for (const file of runtime) acorn.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest' });
  if (unit) for (const file of files) acorn.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
  const output = path.join(folder, phaseName + '-results.json');
  const args = unit ? ['node_modules/vitest/vitest.mjs', 'run', ...files, '--maxWorkers=1', '--pool=forks', '--no-isolate',
    '--testTimeout=60000', '--hookTimeout=60000', '--silent', '--reporter=dot', '--reporter=json', '--outputFile=' + output] :
    ['node_modules/@playwright/test/cli.js', 'test', ...files, '--project=chromium', '--workers=1', '--retries=0', '--reporter=list,json', '--output=' + folder + '/' + phaseName + '-test-output'];
  const env = unit ? process.env : { ...process.env, MICROBIOLOGY_REPORT_DIR: path.resolve(folder), PLAYWRIGHT_JSON_OUTPUT_NAME: path.resolve(output) };
  const run = cp.spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (run.error) throw run.error;
  verify();
  status.exitCode = run.status; status.signal = run.signal;
  if (run.status === 0) {
    const report = JSON.parse(fs.readFileSync(output, 'utf8'));
    if (unit ? (!report.success || report.numPassedTests !== expected || report.numFailedTests || report.numPendingTests || report.testResults.length !== files.length) :
      (report.stats.expected !== expected || report.stats.unexpected || report.stats.flaky || report.stats.skipped || report.errors.length)) throw Error('Passing case count does not match the expected suite.');
  }
  status.phase = run.status === 0 ? 'passed' : 'failed';
  status.finished = new Date().toISOString();
  status.sourceStillMatches = true; status.testInputsStillMatch = true; status.syntaxChecksPassed = true;
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
  process.exitCode = run.status || 0;
} catch (error) {
  status.phase = 'failed'; status.error = error.message; status.finished = new Date().toISOString();
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n'); throw error;
}
