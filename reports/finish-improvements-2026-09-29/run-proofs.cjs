const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const inputs = ['dev-tools/fixture_subprocess.cjs', 'dev-tools/build_document_at_fixture_suite.cjs', 'doc_pipeline_source.jsx', 'doc_pipeline_module.js', 'desktop/web-app/public/doc_pipeline_module.js', 'app_styles_source.jsx', 'app_styles_module.js', 'desktop/web-app/public/app_styles_module.js', 'tests/fixture_subprocess.test.js', 'tests/export_quiz_html_worksheet_parity.test.js', 'tests/docsuite_theme_contrast.test.js'];
const hashes = () => Object.fromEntries(inputs.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const before = hashes();
const cases = [
  ['budget', 'tests/fixture_subprocess.test.js', 'outer time budgets'],
  ['stderr', 'tests/fixture_subprocess.test.js', 'reports the actual exit'],
  ['cleanup', 'tests/fixture_subprocess.test.js', 'a timeout stops'],
  ['teacher', 'tests/export_quiz_html_worksheet_parity.test.js', 'places the full Memory Aid reference'],
  ['theme', 'tests/docsuite_theme_contrast.test.js', 'AppStyles carries'],
];
const results = [];
for (const [id, files, names] of [['all-r2', [...new Set(cases.map(row => row[1]))], cases.map(row => row[2])]]) {
  const out = path.join(__dirname, 'proof-' + id + '.json');
  const log = fs.openSync(path.join(__dirname, 'proof-' + id + '.log'), 'w');
  let processResult;
  try {
    processResult = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...files, '-t', names.join('|'), '--config', path.join(__dirname, 'proof.config.mjs'), '--reporter=json', '--outputFile=' + out], { cwd: root, windowsHide: true, stdio: ['ignore', log, log], timeout: 300000, env: { ...process.env, ALLO_FINISH_PROOF_CASE: 'all' } });
  } finally { fs.closeSync(log); }
  let report;
  try { report = JSON.parse(fs.readFileSync(out, 'utf8')); } catch (_) {}
  const failed = (report?.testResults || []).flatMap(suite => suite.assertionResults || []).filter(test => test.status === 'failed');
  const proved = processResult.status === 1 && !processResult.error && failed.length === names.length
    && names.every(name => failed.some(test => test.fullName.includes(name)))
    && failed.every(test => test.failureMessages.some(message => /AssertionError/.test(message)) && !test.failureMessages.some(message => /timed out/.test(message)));
  results.push({ id, mutations: cases.map(row => row[0]), exit: processResult.status, signal: processResult.signal, error: processResult.error?.message, failedTests: failed.map(test => test.fullName), proved });
  fs.writeFileSync(path.join(__dirname, 'proof-results.json'), JSON.stringify({ before, after: hashes(), results }, null, 2) + '\n');
  console.log(id + ': ' + (proved ? 'intended assertion rejected mutation' : 'NOT PROVED'));
  if (!proved) { process.exitCode = 1; break; }
}
if (JSON.stringify(before) !== JSON.stringify(hashes())) { console.error('Shared source identity changed during proof.'); process.exitCode = 1; }
