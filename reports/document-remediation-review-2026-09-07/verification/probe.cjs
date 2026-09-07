'use strict';
// Read-only production-code probes: application files are loaded, never modified.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module');
const { EventEmitter } = require('node:events');
const ROOT = process.cwd();
const reportDir = __dirname;
const results = {};

function loadCjsWithPrivateExports(relativePath, names) {
  const file = path.join(ROOT, relativePath);
  const mod = new Module(file, module);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod._compile(fs.readFileSync(file, 'utf8') + '\nmodule.exports.__review = {' + names.join(',') + '};', file);
  return mod.exports.__review;
}

async function main() {
  const epub = require(path.join(ROOT, 'desktop/mcp/remediation_epub_validation.cjs'));
  results.aceEmptyExecution = epub.parseAce({
    '@type': 'earl:report',
    'earl:result': { 'earl:outcome': 'pass' },
    assertions: [{}],
  });
  results.epubcheckContradiction = epub.parseEpubcheck({
    checker: { nError: 0, nFatal: 0, nWarning: 0 },
    messages: [{ severity: 'ERROR', ID: 'RSC-005', message: 'Invalid package.' }],
  });

  const context = vm.createContext({ window: { AlloModules: {} } });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'accessibility_evidence_source.jsx'), 'utf8'), context);
  const input = {
    ai: { score: 100, issues: [], chunksRequested: 10, chunksAudited: 1 },
    axe: { score: 100, totalViolations: 0, totalIncomplete: 0 },
    equalAccess: { score: 100, failViolations: 0, potentialViolations: 0, manualViolations: 0 },
  };
  const shared = context.window.AlloModules.AccessibilityEvidence.deriveVerificationState(input);
  results.sharedIncompleteAiCoverage = {
    verificationState: shared.verificationState,
    fullyVerifiedSuccess: shared.fullyVerifiedSuccess,
    coverage: shared.coverage,
  };
  const negative = context.window.AlloModules.AccessibilityEvidence.deriveVerificationState({
    ...input, ai: { score: 100, issueCount: -1 },
    axe: { score: 100, totalViolations: -1, totalIncomplete: -1 },
    equalAccess: { score: 100, failViolations: -1, potentialViolations: -1, manualViolations: -1 },
  });
  results.sharedNegativeCounts = { verificationState: negative.verificationState, fullyVerifiedSuccess: negative.fullyVerifiedSuccess };
  const V = require(path.join(ROOT, 'desktop/mcp/remediation_verification.cjs'));
  results.equalAccessContradictoryCounts = V.auditChecks({ equalAccess: {
    score: 100, failViolations: 0, reviewFindingCount: 0, potentialViolations: 3, manualViolations: 2,
  } }).equalAccess;

  const { createDriver } = require(path.join(ROOT, 'desktop/mcp/remediation_headless_driver.cjs'));
  const driver = createDriver({
    log() {},
    spawnProcess() {
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.kill = () => true;
      process.nextTick(() => {
        child.stdout.emit('data', JSON.stringify({ report: { jobs: [{ validationResult: [{ compliant: true, details: {} }] }] } }));
        child.emit('close', 1);
      });
      return child;
    },
  });
  const malformed = await driver.validatePdfUaCli({ filePath: path.join(ROOT, 'test-assets/multi-column-sample.pdf'), timeoutMs: 1000 });
  results.pdfCliIncompleteCountsAndFailedExit = malformed;
  results.finalPdfEvidenceFromMalformedCli = V.pdfUaEvidence({
    validator: 'veraPDF CLI', profile: malformed.profile, compliant: malformed.status === 'compliant',
    failedChecks: malformed.failedChecks, failedRuleCount: malformed.failedRules,
    inputSha256: malformed.inputSha256, inputBytes: malformed.inputBytes,
  }, { hasPdf: true, requested: true, sha256: malformed.inputSha256, bytes: malformed.inputBytes });
  await driver.close();

  const runner = loadCjsWithPrivateExports('services/alloflow-remote-mcp/runner/server.cjs', ['buildReport', 'remediationQuality', 'normalizePdfUaValidation']);
  const options = { targetScore: 95, fixPasses: 2, effortProfile: 'standard', ocrLanguage: '', polishPasses: 0, taggedPdf: true, autoContinue: false, autoContinueRounds: 0, validateUa: false, maxRunMinutes: 20 };
  const sourceResult = {
    activeContentScanVerified: true, activeContentDetected: false, verdict: { level: 'ready' },
    verificationState: 'complete', verificationHtmlBound: true, taggedPdfDelivery: { ok: true, code: 'verified' },
    taggedPdfExportMode: 'original_layout', remainingAxeViolations: 0, remainingEqualAccessFailures: 0,
    auditCoverage: { configuredAuditorCap: 5, requestedAuditors: 3, completedAuditors: 3, sliced: false },
    beforeScore: 42, afterScore: 96, estimatedMinimumScore: 96, integrityCoverage: 100, aiVerificationIncomplete: false,
  };
  const failedUa = { status: 'noncompliant', validator: 'veraPDF', profile: 'ua1', validatorVersion: '1.30.2', failedRules: 2, failedChecks: 3, passedRules: 104, passedChecks: 4459, inputSha256: 'b'.repeat(64), inputBytes: 60 };
  const report = runner.buildReport({ jobId: 'review-fixture', options }, { size: 30 }, sourceResult, { size: 50, sha256: 'a'.repeat(64) }, runner.remediationQuality(sourceResult), failedUa);
  results.remoteNoncompliantDelivery = { summary: report.summary, pdfUaValidation: report.pdfUaValidation, artifact: report.artifact };

  const { buildSync } = require('esbuild');
  const compiled = buildSync({ entryPoints: [path.join(ROOT, 'services/alloflow-remote-mcp/src/remediation-report.ts')], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text;
  const tsmod = new Module(path.join(ROOT, 'services/alloflow-remote-mcp/src/remediation-report.ts'), module);
  tsmod._compile(compiled, tsmod.id);
  const expected = { jobId: 'review-fixture', resultSizeBytes: 50, resultSha256: 'a'.repeat(64), targetScore: 95, fixPasses: 2, effortProfile: 'standard', ocrLanguage: '', polishPasses: 0, autoContinueRounds: 0, autoContinueRoundsRun: 0, beforeScore: 42, afterScore: 96 };
  const sanitized = tsmod.exports.sanitizeRemediationReport(report, expected);
  results.remotePublicNoncompliantDelivery = { summary: sanitized.summary, pdfUaValidation: sanitized.pdfUaValidation };
  const reserve = { ...report, pdfUaValidation: runner.normalizePdfUaValidation({ status: 'unavailable', reason: 'attempt_finalization_reserve' }) };
  try {
    tsmod.exports.sanitizeRemediationReport(reserve, expected);
    results.remoteFinalizationReserve = { accepted: true };
  } catch (error) {
    results.remoteFinalizationReserve = { accepted: false, code: error.code, emitted: reserve.pdfUaValidation };
  }
  const destination = path.join(reportDir, 'probe-results.json');
  fs.writeFileSync(destination, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
