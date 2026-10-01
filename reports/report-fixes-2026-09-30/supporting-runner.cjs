const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const root = process.cwd();
const reportPath = path.join(root, 'reports/report-fixes-2026-09-30/supporting-validation.json');
const flowRetry = process.argv.includes('--flow-retry');
const expected = {
  'guided_mode_config_source.jsx': 'db9ce27cfa4c69a090dd66f2a8f8d187216350755a69e132a29045995e9e03f5',
  'tts-server/edge_tts_server.py': '7ab8d7903474a114be740f67e0ab80268d686e9f894665acb42e512692546074',
  'tts-server/piper_server.py': '97d0fbb3524d71acb2d232167924cb940983fd2e904df0c10ce0bb58cb95b6cf',
  'docker/edge-tts-server/server.py': 'b92aed9cc7674f7068992ca29b0791c5babba2884626bccfc6d8d626fefcb0a8',
};
const runtimeStems = ['view_simplified', 'text_utility_helpers', 'generate_dispatcher', 'generation_helpers', 'tts', 'view_kokoro_offer_modal', 'gemini_api', 'guided_mode_config'];
const scope = runtimeStems.flatMap(stem => [`${stem}_source.jsx`, `${stem}_module.js`, `desktop/web-app/public/${stem}_module.js`]);
scope.push('error_reporter_module.js', 'desktop/web-app/public/error_reporter_module.js', ...Object.keys(expected).filter(f => f.endsWith('.py')));
scope.push(...fs.readdirSync(path.join(root, 'tests')).filter(f => /^report_.*\.test\.js$/.test(f)).map(f => `tests/${f}`));
scope.push('tests/test_local_tts_origin_policy.py', 'tests/test_edge_tts_language_review.py', 'tests/tts_pipeline_source_resilience.test.js', 'tests/gemini_auth_debounce.test.js', 'tests/gemini_error_taxonomy_contract.test.js');
const trackedScope = [...new Set(scope)].filter(file => fs.existsSync(path.join(root, file)));
const immutable = [...trackedScope, 'AlloFlowANTI.txt', 'reflective_journal.md'];
const hashes = () => Object.fromEntries(immutable.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const report = flowRetry ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : {
  startedAt: new Date().toISOString(),
  scope: 'Read-only supporting validation of the frozen candidate. No runtime or existing test writes.',
  infrastructureErrors: [],
  sourceHashesBefore: hashes(),
  commands: [],
};
if (flowRetry) {
  const initial = report.commands.find(item => item.name === 'guided-flow-source-and-built-contract' && /Unknown option `--minWorkers`/.test(item.stderr));
  if (!initial) throw new Error('A flow-only retry requires the captured pre-discovery worker-option failure.');
  initial.category = 'test-runner-startup-error';
  report.infrastructureErrors.push({ name: initial.name, error: 'Installed Vitest rejected --minWorkers before discovering tests. The flow-only retry removes that unsupported option.' });
  report.retryStartedAt = new Date().toISOString();
}
report.expectedHashChecks = Object.fromEntries(Object.entries(expected).map(([file, sha]) => [file, { expected: sha, actual: report.sourceHashesBefore[file], matches: report.sourceHashesBefore[file] === sha }]));
function save() { fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n'); }
function run(name, command, args, parser) {
  const startedAt = new Date().toISOString();
  const result = cp.spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 300000, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  const entry = { name, command, args, startedAt, finishedAt: new Date().toISOString(), exitCode: result.status, signal: result.signal, stdout: result.stdout || '', stderr: result.stderr || '' };
  if (result.error) { entry.infrastructureError = String(result.error); report.infrastructureErrors.push({ name, error: entry.infrastructureError }); }
  if (parser) {
    try { Object.assign(entry, parser(entry.stdout, entry.stderr)); }
    catch (error) { entry.resultParseError = String(error); }
  }
  report.commands.push(entry);
  save();
  process.stdout.write(JSON.stringify({ name, exitCode: entry.exitCode, passed: entry.passed, failed: entry.failed, total: entry.total, infrastructureError: entry.infrastructureError }) + '\n');
}
save();
const pythonResults = (_stdout, stderr) => {
  const cases = [...stderr.matchAll(/^([^\r\n]+) \.\.\. (ok|FAIL|ERROR|skipped[^\r\n]*)$/gm)].map(match => ({ name: match[1], result: match[2] }));
  return { total: cases.length, passed: cases.filter(item => item.result === 'ok').length, failed: cases.filter(item => /^(FAIL|ERROR)$/.test(item.result)).length, testCases: cases };
};
if (!flowRetry) {
  run('local-tts-origin-policy', 'python', ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_local_tts_origin_policy.py', '-v'], pythonResults);
  run('edge-tts-language-review', 'python', ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_edge_tts_language_review.py', '-v'], pythonResults);
}
run('guided-flow-source-and-built-contract', process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/report_flow_metadata.test.js', 'tests/guided_mode_config_extraction_contract.test.js', '--pool=threads', '--maxWorkers=1', '--testTimeout=60000', '--reporter=json'], stdout => {
  const start = stdout.indexOf('{');
  const parsed = JSON.parse(stdout.slice(start));
  return { total: parsed.numTotalTests, passed: parsed.numPassedTests, failed: parsed.numFailedTests, success: parsed.success, testResults: parsed.testResults };
});
if (!flowRetry) run('scoped-git-diff-check', 'git', ['diff', '--check', '--', ...trackedScope]);
report.sourceHashesAfter = hashes();
report.changedDuringValidation = immutable.filter(file => report.sourceHashesBefore[file] !== report.sourceHashesAfter[file]);
report.finishedAt = new Date().toISOString();
const latestCommands = [...new Map(report.commands.map(item => [item.name, item])).values()];
report.runtimeHashesPreserved = report.changedDuringValidation.every(file => file.startsWith('tests/'));
report.targetedValidationPassed = latestCommands.every(item => item.exitCode === 0 && !item.resultParseError) && Object.values(report.expectedHashChecks).every(item => item.matches) && report.runtimeHashesPreserved;
report.passed = report.targetedValidationPassed && report.changedDuringValidation.length === 0;
report.limitations = ['git diff --check checks tracked changes only; new untracked tests are preserved and exercised by the targeted suites.', 'No full repository, cloud, browser, screen reader, or release validation is asserted by this supporting run.'];
save();
process.stdout.write(JSON.stringify({ supportingValidationPassed: report.passed, targetedValidationPassed: report.targetedValidationPassed, runtimeHashesPreserved: report.runtimeHashesPreserved, changedDuringValidation: report.changedDuringValidation, expectedHashesMatch: Object.values(report.expectedHashChecks).every(item => item.matches), report: path.relative(root, reportPath) }) + '\n');
process.exitCode = report.targetedValidationPassed ? 0 : 1;
