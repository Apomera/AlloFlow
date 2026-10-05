const fs = require('node:fs');
const vm = require('node:vm');
const from = 'reports/micro-lab-annotation-integrity-2026-10-01';
const to = 'reports/micro-lab-measurement-conversion-2026-10-01';
function adapt(file) {
  return fs.readFileSync(from + '/' + file, 'utf8').split(from).join(to)
    .replace(/\b723\b/g, '794').replace(/\b49\b/g, '56').replace(/\b22\b/g, '24').replace(/\b30\b/g, '33');
}
function write(file, text) { new vm.Script(text); fs.writeFileSync(to + '/' + file, text); }
write('check-defaults.cjs', adapt('check-defaults.cjs'));
let summary = adapt('summarize-validation.cjs');
summary = summary.replace("const cp = require('node:child_process');", "const cp = require('node:child_process');\nconst acorn = require('acorn');");
const start = summary.indexOf('const browserFiles = '), end = summary.indexOf('const auditText = ', start);
if (start < 0 || end < 0) throw Error('Summary input-audit block changed.');
summary = summary.slice(0, start) + `const testInputs = {};
for (const runner of runners) {
  if (runner.testInputsStillMatch !== true || runner.syntaxChecksPassed !== true) throw new Error('Runner input or syntax verification failed.');
  const inputs = Object.entries(runner.testInputs || {});
  if (inputs.length !== (runner.kind === 'unit' ? 24 : 9)) throw new Error('Incomplete runner inputs.');
  for (const [file, sha] of inputs) {
    if (crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== sha) throw new Error('A validated test changed: ' + file);
    testInputs[file] = sha;
  }
}
if (Object.keys(testInputs).length !== 33) throw new Error('Expected all 33 validated test inputs.');
` + summary.slice(end);
summary = summary.replace("  run(['--check', file]);", "  acorn.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: file.endsWith('.test.js') ? 'module' : 'script' });");
summary = summary.replace('initial|recovery|outcomes-initial|full-initial', 'initial|recovery|outcomes-initial|full-initial|focused');
summary = summary.replace('initial|recovery|layout', 'initial|recovery|layout|focused');
summary = summary.replace(/    scope: 'Raw-preserving[^\n]+/, "    scope: 'Microscope working-estimate conversion, exact decimal equivalence, raw-state preservation, stale draft and viewing-setting guards, keyboard and narrow layouts, and retained annotations, selected/full portfolios, Growth citations, design, evidence, recovery and navigation workflows.'");
summary = summary.replace('annotation-growth-desktop.png', 'conversion-desktop.png').replace('annotation-resistance-phone.png', 'conversion-phone.png').replace('annotation-zoom.png', 'conversion-zoom.png');
write('summarize-validation.cjs', summary);
const oldTests = `  'tests/microbiology_annotation_integrity.test.js',
  'tests/microbiology_annotation_integrity_workflow.test.js',
  'tests/microbiology_resistance_outcomes.test.js',
  'tests/microbiology_growth_workflow.test.js',
  'tests/microbiology_resistance_sim.test.js',
  'tests/microbiology_growth_citations_workflow.test.js',
  'tests/e2e/microbiology-annotation-integrity.spec.ts'`;
const newTests = `  'tests/microbiology_measurement_conversion.test.js',
  'tests/microbiology_measurement_conversion_workflow.test.js',
  'tests/microbiology_microscope.test.js',
  'tests/e2e/microbiology-measurement-conversion.spec.ts'`;
let commit = adapt('commit-scope.cjs');
if (!commit.includes(oldTests)) throw Error('Commit test scope changed.');
commit = commit.replace(oldTests, newTests);
commit = commit.replace('Expected all 24 unit files and 8 browser specs', 'Expected all 24 unit files and 9 browser specs');
commit = commit.split('Preserve Micro Lab annotations and imported evidence').join('Add explicit microscope estimate unit conversion');
const oldBody = 'Update only the selected Growth explanation or Resistance reflection without rebuilding raw notebooks. Preserve imported overflow, original evidence, metadata and recovery state, and guard against stale record ownership. Keep saved-record navigation equally focused. Report actual observed Resistance trends when no original prediction is available. Include focused unit and Chromium regressions and validation artifacts.';
const newBody = 'Show an unscored equivalent-size preview and let learners explicitly convert a working microscope estimate between micrometers and nanometers. Preserve decimal precision, raw viewing context, checked history and unrelated evidence, and reject stale draft or viewing-setting updates. Include focused unit and Chromium regressions and validation artifacts.';
if (!commit.includes(oldBody)) throw Error('Commit body changed.');
commit = commit.replace(oldBody, newBody);
write('commit-scope.cjs', commit);
let audit = adapt('drafts/verify-commit.cjs');
if (!audit.includes(oldTests)) throw Error('Audit test scope changed.');
audit = audit.replace(oldTests, newTests).replace("assert.equal(added.length, 9,", "assert.equal(added.length, 7,");
write('drafts/verify-commit.cjs', audit);
console.log('Prepared focused report, summary, commit, and independent audit helpers.');
