'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const remote = path.join(root, 'services/alloflow-remote-mcp');
const ts = require(path.join(remote, 'node_modules/typescript'));
function compile(source, context) {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInContext(js, context);
}
const optionsContext = vm.createContext({ exports: {}, require: name => { assert.equal(name, './security'); return { PilotError: class PilotError extends Error {} }; } });
compile(fs.readFileSync(path.join(remote, 'src/remediation-options.ts'), 'utf8'), optionsContext);
const reportContext = vm.createContext({ exports: {}, require: name => {
  assert.equal(name, './remediation-options');
  return optionsContext.exports;
} });
compile(fs.readFileSync(path.join(remote, 'src/remediation-report.ts'), 'utf8'), reportContext);
const testSource = fs.readFileSync(path.join(remote, 'test/remediation-report.test.ts'), 'utf8');
const fixtureContext = vm.createContext({ exports: {} });
compile(testSource.slice(testSource.indexOf('const JOB_ID'), testSource.indexOf('\nfunction expectCode(')) + '\nthis.fixture = legacyReport(); this.expected = expected;', fixtureContext);
const { sanitizeRemediationReport } = reportContext.exports;
const baseline = sanitizeRemediationReport(fixtureContext.fixture, fixtureContext.expected);
const runnerSource = fs.readFileSync(path.join(remote, 'runner/server.cjs'), 'utf8');
const normalizeStart = runnerSource.indexOf('function normalizePdfUaValidation(');
const normalizeEnd = runnerSource.indexOf('\nfunction buildReport(', normalizeStart);
const runnerContext = vm.createContext({});
vm.runInContext(runnerSource.slice(normalizeStart, normalizeEnd), runnerContext);
const runnerValue = runnerContext.normalizePdfUaValidation({ status: 'unavailable', reason: 'attempt_finalization_reserve' });
fixtureContext.fixture.pdfUaValidation = runnerValue;
let failure;
try { sanitizeRemediationReport(fixtureContext.fixture, fixtureContext.expected); }
catch (error) { failure = error.code; }
assert.equal(failure, 'remediation_report_malformed');
console.log(JSON.stringify({ demonstrated: 'Current runner emits a valid reason rejected by the current gateway report sanitizer', baselineAccepted: baseline.status === 'succeeded', runnerProduced: runnerValue, gatewayError: failure, note: 'Executes repository TypeScript after local transpilation and the actual runner normalization function, using the existing test fixture; no network, storage, or model calls.' }, null, 2));

