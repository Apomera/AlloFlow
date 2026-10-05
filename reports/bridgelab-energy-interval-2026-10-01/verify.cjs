const fs = require('node:fs');
const crypto = require('node:crypto');
const acorn = require('acorn');
const folder = 'reports/bridgelab-energy-interval-2026-10-01/';
const source = fs.readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8');
if (source !== fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_bridgelab.js', 'utf8')) throw new Error('Bridge mirrors differ');
const keys = new Map();
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee.name === '__alloT'
    && typeof node.arguments[0]?.value === 'string' && typeof node.arguments[1]?.value === 'string') {
    const [key, value] = node.arguments.map(argument => argument.value);
    if (keys.has(key) && keys.get(key) !== value) throw new Error('Conflicting fallback: ' + key);
    keys.set(key, value);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') walk(value);
  }
}
walk(acorn.parse(source, { ecmaVersion: 'latest' }));
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const registry = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  for (const [key, value] of keys) {
    if (key.split('.').reduce((object, part) => object?.[part], registry) !== value) throw new Error(file + ': mismatch for ' + key);
  }
}
const unitReports = ['unit-results.json', 'unit-worker-recovery-results.json'];
const recoveryFiles = ["bridgelab_seismic_model.test.js","bridgelab_design_workflow.test.js","bridgelab_tabs_a11y.test.js"];
const recovery = JSON.parse(fs.readFileSync(folder + 'unit-worker-recovery-results.json','utf8'));
if (!recovery.success || recovery.numFailedTests) throw new Error('Worker recovery did not complete successfully');
const recovered = new Set(recovery.testResults.filter(suite => suite.status === 'passed').map(suite => suite.name.replaceAll('\\','/').split('/').pop()));
if (recovered.size !== recoveryFiles.length || recoveryFiles.some(name => !recovered.has(name))) throw new Error('Worker recovery scope is incomplete');
const latestAssertions = new Map();
for (const file of unitReports) {
  const unit = JSON.parse(fs.readFileSync(folder + file, 'utf8'));
  if (!unit.success && file !== 'unit-results.json') throw new Error(file + ': runner failed');
  if (unit.numFailedTests || unit.testResults.some(suite => suite.status !== 'passed')) throw new Error(file + ': unresolved unit failure');
  if (file === 'unit-results.json') {
    const firstCompleted = new Set(unit.testResults.map(suite => suite.name.replaceAll('\\','/').split('/').pop()));
    const missing = fs.readdirSync('tests').filter(name => /^bridgelab_.*\.test\.js$/.test(name) && !firstCompleted.has(name));
    if (JSON.stringify(missing.sort()) !== JSON.stringify(recoveryFiles.slice().sort())) throw new Error('Unexpected missing suites from the initial fork run');
  }
  for (const suite of unit.testResults) {
    for (const test of suite.assertionResults) {
      // A targeted follow-up resolves only the same assertion; skipped tests
      // retain their completed results from the full run.
      if (test.status === 'passed' || test.status === 'failed') latestAssertions.set(suite.name + ' / ' + test.fullName, { suite: suite.name, test });
    }
  }
}
const completed = new Set();
let checks = 0;
for (const { suite, test } of latestAssertions.values()) {
  if (test.status !== 'passed') throw new Error('Unresolved assertion: ' + test.fullName);
  completed.add(suite.replaceAll('\\', '/').split('/').pop());
  checks++;
}
for (const name of fs.readdirSync('tests').filter(name => /^bridgelab_.*\.test\.js$/.test(name))) {
  if (!completed.has(name)) throw new Error('No completed results for ' + name);
}
if (checks !== 268) throw new Error('Unit coverage incomplete: ' + checks);
const browserReports = ['browser-results.json', 'browser-interval-final-results.json'];
const workflows = new Map();
function collect(suites, parents = []) {
  for (const suite of suites) {
    const path = [...parents, suite.title];
    for (const spec of suite.specs || []) {
      for (const test of spec.tests) workflows.set([...path, spec.title, test.projectName].join(' / '), test);
    }
    collect(suite.suites || [], path);
  }
}
for (const file of browserReports) {
  const browser = JSON.parse(fs.readFileSync(folder + file, 'utf8'));
  if (browser.errors.length) throw new Error(file + ': browser runner errors');
  collect(browser.suites);
}
if (workflows.size !== 22) throw new Error('Browser coverage incomplete: ' + workflows.size);
for (const [name, test] of workflows) {
  if (test.status !== 'expected' || test.results.at(-1)?.status !== 'passed') throw new Error('Unresolved browser result: ' + name);
}
const result = {
  syntax: 'passed', sourceMirrors: 'identical', sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  matchingEnglishKeys: keys.size, coveredUnitFiles: completed.size,
  unitChecksPassed: checks, browserChecksPassed: workflows.size,
  totalDistinctChecksPassed: checks + workflows.size,
  unitReports, browserReports,
  workerRecovery: { initialCompletedChecks: 214, workerStartFailures: recoveryFiles, pool: 'threads', recoveredChecks: recovery.numPassedTests, status: 'passed' }
};
fs.writeFileSync(folder + 'source-verification.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
