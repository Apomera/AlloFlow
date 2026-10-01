const fs = require('node:fs');
const crypto = require('node:crypto');
const acorn = require('acorn');
const folder = 'reports/bridgelab-motion-guides-2026-09-30/';
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
const unitReports = ['unit-results.json', 'unit-final-results.json'];
const latestUnitSuites = new Map();
for (const file of unitReports) {
  const unit = JSON.parse(fs.readFileSync(folder + file, 'utf8'));
  if (!unit.success || unit.numFailedTests || unit.numFailedTestSuites) throw new Error(file + ': unit runner reported failures');
  for (const suite of unit.testResults) latestUnitSuites.set(suite.name, suite);
}
const completed = new Set();
let checks = 0;
for (const suite of latestUnitSuites.values()) {
  const name = suite.name.replaceAll('\\', '/').split('/').pop();
  for (const test of suite.assertionResults) {
    if (test.status === 'failed') throw new Error('Failed assertion: ' + test.fullName);
    if (test.status === 'passed') { completed.add(name); checks++; }
  }
}
for (const name of ['bridgelab_deformation_geometry.test.js', 'bridgelab_immersive_motion.test.js', 'bridgelab_seismic_model.test.js', 'bridgelab_evidence_portfolio.test.js', 'bridgelab_print_analysis.test.js']) {
  if (!completed.has(name)) throw new Error('No completed results for ' + name);
}
if (checks !== 92) throw new Error('Unit coverage incomplete: ' + checks);
const browserReports = ['browser-results.json', 'browser-final-results.json'];
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
if (workflows.size !== 21) throw new Error('Browser coverage incomplete: ' + workflows.size);
for (const [name, test] of workflows) {
  if (test.status !== 'expected' || test.results.at(-1)?.status !== 'passed') throw new Error('Unresolved browser result: ' + name);
}
const result = {
  syntax: 'passed', sourceMirrors: 'identical', sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  matchingEnglishKeys: keys.size, coveredUnitFiles: completed.size,
  unitChecksPassed: checks, browserChecksPassed: workflows.size,
  totalDistinctChecksPassed: checks + workflows.size,
  unitReports, browserReports
};
fs.writeFileSync(folder + 'source-verification.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
