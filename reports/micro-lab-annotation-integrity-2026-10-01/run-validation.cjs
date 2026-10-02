const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const folder = 'reports/micro-lab-annotation-integrity-2026-10-01';
const kind = process.argv[2];
if (!['unit', 'browser'].includes(kind)) throw Error('Use unit or browser.');
const expectedSource = '468efedbbe19d147c15af70184650fab8db3b90a8103d0c64738eafee2574165';
const sourceFiles = ['stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js'];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const statusFile = path.join(folder, kind + '-run-status.json');
if (fs.existsSync(statusFile)) {
  const previous = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
  if (previous.phase === 'running') {
    let alive = false;
    try { process.kill(previous.pid, 0); alive = true; } catch {}
    if (alive) throw Error('A validation runner is already active: ' + previous.pid);
  }
}
const status = { kind, pid: process.pid, started: new Date().toISOString(), phase: 'running', sourceSha256: expectedSource };
fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
function verifySource() {
  for (const file of sourceFiles) if (hash(file) !== expectedSource) throw Error('Validated candidate changed: ' + file);
}
try {
  verifySource();
  let args, env = process.env;
  if (kind === 'unit') {
    const names = ['growth_model', 'growth_workflow', 'microscope', 'resistance_sim', 'mystery_workflow', 'snow_map',
      'quiz_workflow', 'print_reference', 'gram_workflow', 'workspace', 'workspace_resume', 'workspace_navigation',
      'portfolio', 'portfolio_workflow', 'growth_citations', 'growth_citations_workflow', 'portfolio_selection',
      'portfolio_selection_workflow', 'annotation_integrity', 'annotation_integrity_workflow', 'resistance_outcomes'];
    const files = names.map(name => 'tests/microbiology_' + name + '.test.js').concat(['tests/stem_microbiology_quiz.test.js']);
    for (const file of files) cp.execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    args = ['node_modules/vitest/vitest.mjs', 'run', ...files, '--maxWorkers=1', '--pool=forks', '--no-isolate',
      '--testTimeout=60000', '--hookTimeout=60000', '--silent', '--reporter=dot', '--reporter=json', '--outputFile=' + folder + '/unit-results.json'];
    status.expected = 723;
  } else {
    const names = ['annotation-integrity', 'portfolio-selection', 'growth-citations', 'portfolio', 'experiment-design',
      'guided-resume', 'evidence-review', 'evidence-recovery'];
    args = ['node_modules/@playwright/test/cli.js', 'test', ...names.map(name => 'tests/e2e/microbiology-' + name + '.spec.ts'),
      '--project=chromium', '--workers=1', '--retries=0', '--reporter=list,json', '--output=' + folder + '/browser-final-test-output'];
    env = { ...process.env, MICROBIOLOGY_REPORT_DIR: path.resolve(folder), PLAYWRIGHT_JSON_OUTPUT_NAME: path.resolve(folder, 'browser-results.json') };
    status.expected = 49;
  }
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
  const result = cp.spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  verifySource();
  status.exitCode = result.status === null ? 1 : result.status;
  status.signal = result.signal;
  status.phase = status.exitCode === 0 ? 'passed' : 'failed';
  status.finished = new Date().toISOString();
  status.sourceStillMatches = true;
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
  process.exitCode = status.exitCode;
} catch (error) {
  status.phase = 'failed'; status.error = error.message; status.finished = new Date().toISOString();
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
  throw error;
}
