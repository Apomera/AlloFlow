// Read-only validation inventory; writes evidence only beside this script.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const previous = 'reports/document-remediation-residual-fixes-2026-09-09/';
const previousSummary = JSON.parse(read(previous + 'validation-summary.json'));
const workflowFiles = fs.readdirSync(path.join(root, '.github/workflows')).filter(f => /\.ya?ml$/.test(f)).map(f => '.github/workflows/' + f);
const workflowText = workflowFiles.map(file => ({ file, text: read(file) }));
const browserSuites = ['rendered-final.json', 'export-final.json'].flatMap(report => JSON.parse(read(previous + report)).suites.map(suite => ({
  file: 'tests/e2e/' + suite.file, previousPassingTests: suite.specs.length, previousReport: previous + report,
  workflowReferences: workflowText.filter(w => w.text.includes(suite.file)).map(w => w.file),
})));
const gate = read('dev-tools/check_pipeline_tests.cjs');
const include = vm.runInNewContext(gate.match(/const INCLUDE = (\[[\s\S]*?\]);/)[1]);
const exclude = vm.runInNewContext(gate.match(/const EXCLUDE = (\/.*\/);/)[1]);
const unitSuites = previousSummary.unitFiles.map(item => ({ file: item.file, previousPassingTests: item.passed,
  selectedByPipelineGate: include.some(key => path.basename(item.file).includes(key)) && !exclude.test(path.basename(item.file)),
  quarantined: read('tests/QUARANTINE.txt').split(/\r?\n/).some(line => line.trim().split(/\s+/)[0] === item.file),
}));
const implementationHashes = Object.fromEntries(Object.entries(previousSummary.implementationHashes).map(([file, prior]) => {
  const current = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
  return [file, { prior, current, unchanged: prior === current }];
}));
const inventory = {
  inspectedAt: new Date().toISOString(), policyVersion: previousSummary.policyVersion,
  scope: 'Read-only CI and local-gate inventory. Previous passing counts are retained evidence, not a new test run. No live model or deployment.',
  browserSuites, browserTotal: browserSuites.reduce((n, item) => n + item.previousPassingTests, 0),
  suitesWithoutDirectWorkflowReferences: browserSuites.filter(item => !item.workflowReferences.length).length,
  unitSuites,
  unitTestsOmittedFromPipelineGate: unitSuites.filter(item => !item.selectedByPipelineGate).reduce((n, item) => n + item.previousPassingTests, 0),
  omittedUnitSuiteCount: unitSuites.filter(item => !item.selectedByPipelineGate).length,
  humanCalibrationEntries: JSON.parse(read('tests/fixtures/pdf_calibration/manifest.json')).entries.length,
  implementationHashes,
};
fs.writeFileSync(path.join(__dirname, 'inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
console.log(JSON.stringify({ browserTotal: inventory.browserTotal, omittedBrowserSuites: inventory.suitesWithoutDirectWorkflowReferences,
  omittedUnitSuites: inventory.omittedUnitSuiteCount, omittedUnitTests: inventory.unitTestsOmittedFromPipelineGate,
  implementationUnchanged: Object.values(implementationHashes).every(row => row.unchanged), humanCalibrationEntries: inventory.humanCalibrationEntries }));
