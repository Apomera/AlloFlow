'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const driverModule = require(path.join(
  repoRoot,
  'desktop',
  'mcp',
  'remediation_headless_driver.cjs',
));
const {
  CHECKPOINT_SCHEMA,
  validateCheckpointEnvelope,
} = require('../server.cjs');

const INPUT_SHA256 = '1'.repeat(64);
const OPTIONS_SHA256 = '2'.repeat(64);
const ENGINE_SHA256 = '3'.repeat(64);
const EXPECTED = {
  inputSha256: INPUT_SHA256,
  optionsSha256: OPTIONS_SHA256,
  engineSha256: ENGINE_SHA256,
};

function htmlBinding(html) {
  return {
    version: 1,
    algorithm: 'SHA-256',
    digest: crypto.createHash('sha256').update(html, 'utf8').digest('hex'),
    utf8ByteLength: Buffer.byteLength(html, 'utf8'),
  };
}

function activeContent() {
  return {
    schema: 1,
    complete: true,
    pageScanFailures: 0,
    unexaminedStructures: 0,
    any: false,
    findings: [],
    externalLinks: 0,
  };
}

function fullRemediation() {
  const accessibleHtml =
    '<!doctype html><html lang=en><body><main><h1>Saved lesson</h1>' +
    '<p>Exact publication content.</p></main></body></html>';
  return {
    accessibleHtml,
    verificationHtmlBinding: htmlBinding(accessibleHtml),
    verificationCoverage: {
      standard: 'WCAG 2.2 AA',
      ai: 'complete',
      axe: 'complete',
      equalAccess: 'complete',
      pdfUaSelfCheck: 'not-run',
    },
    verificationState: 'complete',
    executionState: 'complete',
    outcomeState: 'pass',
    verificationScope: 'full-output',
    testedScopeComplete: true,
    engineExecutionComplete: true,
    fullyVerifiedSuccess: true,
    success: true,
    afterScoreVerified: true,
    requiresManualReview: false,
    verificationReviewCount: 0,
    verificationReasons: [],
    knownFindingCount: 0,
    knownFindings: {
      aiIssues: 0,
      axeViolations: 0,
      equalAccessFailures: 0,
      total: 0,
    },
    scoreEvidence: { ai: 96, axe: 100, equalAccess: 100 },
    evidenceSchemaVersion: 1,
    evidenceProfile: 'document-remediation',
    evidenceProvenance: {
      provenanceVersion: 1,
      evidenceDigest: 'sha256:' + '4'.repeat(64),
    },
    evidenceManifest: {
      schemaVersion: 1,
      manifestDigest: 'sha256:' + '5'.repeat(64),
    },
    afterScore: 96,
    _aiVerificationIncomplete: false,
    _scoreSource: 'min',
    _estimatedMinimumScore: null,
    integrityCoverage: 100,
    integrityWarning: null,
    fidelityNotes: [],
    needsExpertReview: false,
    expertReviewReason: null,
    activeContent: activeContent(),
    documentLanguage: 'en',
    sourceKind: 'pdf',
    isScanned: true,
    groundTruthMethod: 'ocr-tesseract',
    groundTruthPages: [{
      page: 1,
      width: 612,
      height: 792,
      words: [{ text: 'Exact', x: 72, y: 700, width: 30, height: 12 }],
    }],
    sourceStructTree: {
      hasTags: true,
      headings: [{ level: 1, text: 'Saved lesson' }],
    },
    finalText: 'Saved lesson\nExact publication content.',
    ocrAccuracy: { score: 99, band: 'high', confidence: 'high' },
    _experimentEarlyGetPages: false,
    _perLeafScannedOptOut: false,
    runId: 'run-terminal-capsule-01',
    _runId: 'run-terminal-capsule-01',
    axeAudit: {
      score: 100,
      totalViolations: 0,
      critical: [],
      serious: [],
      moderate: [],
      minor: [],
      passes: ['x'.repeat(300_000)],
    },
    secondEngineAudit: {
      score: 100,
      failViolations: 0,
      passes: ['y'.repeat(300_000)],
    },
    verificationAudit: {
      score: 96,
      issues: [],
      evidence: 'z'.repeat(300_000),
    },
    sourceText: 'source '.repeat(50_000),
    issueResolution: { baseline: ['b'.repeat(200_000)] },
    pipelineStats: { payload: { privateTrace: 'p'.repeat(200_000) } },
  };
}

function snapshot(remediation = fullRemediation(), overrides = {}) {
  return {
    schema: CHECKPOINT_SCHEMA,
    stage: 'primary',
    audit: {
      score: 81,
      documentLanguage: 'en',
      requestedAuditors: 5,
      auditorCount: 5,
      sliced: false,
    },
    remediation,
    nextRound: 0,
    roundsRun: 0,
    roundLog: [],
    loopState: {
      lastViolations: null,
      lastDet: -1,
      lastIssues: null,
      stagnant: 0,
    },
    autoContinueDone: true,
    ...overrides,
  };
}

function envelope(value) {
  return {
    schema: CHECKPOINT_SCHEMA,
    sequence: 7,
    stage: value.stage,
    inputSha256: INPUT_SHA256,
    optionsSha256: OPTIONS_SHA256,
    engineSha256: ENGINE_SHA256,
    snapshot: value,
  };
}

test('terminal projection is allowlisted and legacy/unfinished schema-1 snapshots stay compatible', () => {
  const legacy = snapshot();
  const compact = driverModule.compactTerminalCheckpointSnapshot(legacy);
  assert.notStrictEqual(compact, legacy);
  assert.equal(compact.remediation.checkpointCapsuleSchema, 1);
  assert.equal(compact.remediation.accessibleHtml, legacy.remediation.accessibleHtml);
  assert.deepEqual(
    compact.remediation.verificationHtmlBinding,
    legacy.remediation.verificationHtmlBinding,
  );
  assert.deepEqual(compact.remediation.activeContent, legacy.remediation.activeContent);
  assert.deepEqual(
    compact.remediation.groundTruthPages,
    legacy.remediation.groundTruthPages,
  );
  assert.equal(compact.remediation.verificationAudit, undefined);
  assert.equal(compact.remediation.sourceText, undefined);
  assert.equal(compact.remediation.issueResolution, undefined);
  assert.equal(compact.remediation.pipelineStats, undefined);
  assert.ok(
    Buffer.byteLength(JSON.stringify(compact)) <
      Buffer.byteLength(JSON.stringify(legacy)) * 0.1,
  );

  assert.deepEqual(
    validateCheckpointEnvelope(envelope(compact), EXPECTED),
    envelope(compact),
  );
  assert.deepEqual(
    validateCheckpointEnvelope(envelope(legacy), EXPECTED),
    envelope(legacy),
  );

  // Canonical fixAndVerifyPdf results do not normally write these experimental
  // booleans. Their absence has always meant false; scanned state is derived
  // from the persisted OCR method. The capsule must normalize, not serialize
  // undefined/null and then fail the runner's strict boundary.
  const canonicalShape = fullRemediation();
  delete canonicalShape.documentLanguage;
  delete canonicalShape.isScanned;
  delete canonicalShape._experimentEarlyGetPages;
  delete canonicalShape._perLeafScannedOptOut;
  delete canonicalShape._runId;
  const normalized = driverModule.compactTerminalCheckpointSnapshot(
    snapshot(canonicalShape),
  );
  assert.equal(normalized.remediation.isScanned, true);
  assert.equal(normalized.remediation._experimentEarlyGetPages, false);
  assert.equal(normalized.remediation._perLeafScannedOptOut, false);
  assert.equal(normalized.remediation.documentLanguage, null);
  assert.equal(normalized.remediation._runId, null);
  assert.deepEqual(
    validateCheckpointEnvelope(envelope(normalized), EXPECTED),
    envelope(normalized),
  );

  const unfinished = snapshot(fullRemediation(), { autoContinueDone: false });
  assert.strictEqual(
    driverModule.compactTerminalCheckpointSnapshot(unfinished),
    unfinished,
  );
});

test('terminal projection fails closed on tampering, missing publish inputs, or extra keys', () => {
  const compact = driverModule.compactTerminalCheckpointSnapshot(snapshot());
  const invalid = [
    {
      ...compact,
      remediation: {
        ...compact.remediation,
        accessibleHtml: compact.remediation.accessibleHtml + '<!-- changed -->',
      },
    },
    {
      ...compact,
      remediation: { ...compact.remediation, activeContent: null },
    },
    {
      ...compact,
      remediation: { ...compact.remediation, finalText: null },
    },
    {
      ...compact,
      remediation: { ...compact.remediation, unexpectedEvidence: true },
    },
    {
      ...compact,
      remediation: {
        ...compact.remediation,
        axeAudit: { ...compact.remediation.axeAudit, totalViolations: -1 },
      },
    },
    {
      ...compact,
      remediation: {
        ...compact.remediation,
        axeAudit: { ...compact.remediation.axeAudit, score: 101 },
      },
    },
    {
      ...compact,
      remediation: {
        ...compact.remediation,
        secondEngineAudit: {
          ...compact.remediation.secondEngineAudit,
          score: -0.01,
        },
      },
    },
    {
      ...compact,
      remediation: {
        ...compact.remediation,
        activeContent: {
          ...activeContent(),
          any: true,
          findings: [{ type: 'javascript', count: 1, label: '' }],
        },
      },
    },
    { ...compact, autoContinueDone: false },
  ];
  for (const candidate of invalid) {
    assert.equal(validateCheckpointEnvelope(envelope(candidate), EXPECTED), null);
  }

  const unsafe = snapshot({
    ...fullRemediation(),
    activeContent: null,
  });
  assert.strictEqual(
    driverModule.compactTerminalCheckpointSnapshot(unsafe),
    unsafe,
  );

  const staleBinding = snapshot({
    ...fullRemediation(),
    verificationHtmlBinding: htmlBinding('<p>different HTML</p>'),
  });
  assert.strictEqual(
    driverModule.compactTerminalCheckpointSnapshot(staleBinding),
    staleBinding,
  );

  const untypedActiveContent = snapshot({
    ...fullRemediation(),
    activeContent: { ...activeContent(), unexpectedScanPayload: ['large'] },
  });
  assert.strictEqual(
    driverModule.compactTerminalCheckpointSnapshot(untypedActiveContent),
    untypedActiveContent,
  );

  const outOfRangeAxeScore = snapshot({
    ...fullRemediation(),
    axeAudit: { score: 101, totalViolations: 0 },
  });
  const outOfRangeSecondEngineScore = snapshot({
    ...fullRemediation(),
    secondEngineAudit: { score: -0.01, failViolations: 0 },
  });
  const emptyActiveContentLabel = snapshot({
    ...fullRemediation(),
    activeContent: {
      ...activeContent(),
      any: true,
      findings: [{ type: 'javascript', count: 1, label: '' }],
    },
  });
  for (const invalidSource of [
    outOfRangeAxeScore,
    outOfRangeSecondEngineScore,
    emptyActiveContentLabel,
  ]) {
    assert.strictEqual(
      driverModule.compactTerminalCheckpointSnapshot(invalidSource),
      invalidSource,
    );
  }
});

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function scriptedPipeline(remediation, counters) {
  const bindingMatches = (result, html) => {
    if (!result || !result.verificationHtmlBinding) return false;
    const binding = htmlBinding(String(html || ''));
    return binding.digest === result.verificationHtmlBinding.digest &&
      binding.utf8ByteLength === result.verificationHtmlBinding.utf8ByteLength;
  };
  return {
    async runPdfAccessibilityAudit() {
      counters.audit += 1;
      return {
        score: 81,
        documentLanguage: 'en',
        requestedAuditors: 5,
        auditorCount: 5,
        _slicedAudit: false,
      };
    },
    async fixAndVerifyPdf() {
      counters.fix += 1;
      return clone(remediation);
    },
    async rehydrateVerificationHtmlBinding(value) {
      counters.rehydrate += 1;
      return clone(value);
    },
    isLiveVerificationHtmlBound: bindingMatches,
    async autoFixAxeViolations() {
      counters.round += 1;
      throw new Error('terminal checkpoint must not rerun an axe-fix round');
    },
    async aiFixChunked() {
      counters.round += 1;
      throw new Error('terminal checkpoint must not rerun an AI-fix round');
    },
    async auditOutputAccessibility() {
      counters.round += 1;
      throw new Error('terminal checkpoint must not rerun a verification round');
    },
    async finalizeRemediationRound() {
      counters.round += 1;
      throw new Error('terminal checkpoint must not finalize another round');
    },
    distributionVerdict(value, options) {
      const cautions = [];
      if (value.afterScore < options.targetScore) cautions.push('below-target');
      if (value.requiresManualReview) cautions.push('manual-review');
      return {
        level: cautions.length ? 'caution' : 'ready',
        review: [],
        cautions,
        headline: cautions.length ? 'Ready with caution' : 'Ready',
      };
    },
    async createTaggedPdf(_bytes, value, meta) {
      counters.tag += 1;
      const publicationProjection = {
        html: value.accessibleHtml,
        activeContent: value.activeContent,
        sourceKind: value.sourceKind,
        groundTruthMethod: value.groundTruthMethod,
        groundTruthPages: value.groundTruthPages,
        sourceStructTree: value.sourceStructTree,
        finalText: value.finalText,
        ocrAccuracy: value.ocrAccuracy,
        lang: meta.lang,
      };
      return {
        bytes: new Uint8Array(
          crypto.createHash('sha256')
            .update(JSON.stringify(publicationProjection))
            .digest(),
        ),
      };
    },
    taggedPdfDeliveryVerdict() {
      return { ok: true, code: 'scripted-publication-verified' };
    },
    getPipelineStats() {
      return {
        apiCalls: 0,
        visionCalls: 0,
        retries: 0,
        recoveredRetries: 0,
        authThrottles: 0,
        terminalFailures: 0,
      };
    },
  };
}

function scriptedBrowserFactory(remediation, counters) {
  return async () => ({
    on() {},
    async close() {},
    async newContext() {
      const realm = {
        PDFLib: { PDFDocument: {} },
      };
      const factory = () => scriptedPipeline(remediation, counters);
      factory.loopPolicy = {
        roundProgressed: () => true,
        roundRegressed: () => false,
      };
      realm.AlloModules = {
        VerificationPolicy: {},
        DocBuilderRenderer: {},
        createDocPipeline: factory,
      };
      const page = {
        on() {},
        async route() {},
        async goto() {},
        async addScriptTag() {},
        async waitForFunction() {},
        async exposeFunction(name, fn) {
          realm[name] = fn;
        },
        async evaluate(fn, arg) {
          const previousWindow = global.window;
          global.window = realm;
          try {
            return await fn(clone(arg));
          } finally {
            if (previousWindow === undefined) delete global.window;
            else global.window = previousWindow;
          }
        },
      };
      return {
        async newPage() { return page; },
        async close() {},
      };
    },
  });
}

test('real driver resumes a terminal capsule without rerunning fixes and republishes identical evidence-bound output', async (t) => {
  const temporary = await fsp.mkdtemp(
    path.join(os.tmpdir(), 'alloflow-terminal-capsule-'),
  );
  const filePath = path.join(temporary, 'input.pdf');
  await fsp.writeFile(filePath, '%PDF-1.7\nterminal capsule fixture\n%%EOF\n');
  t.after(() => fsp.rm(temporary, { recursive: true, force: true }));

  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'scripted-terminal-capsule-key';
  t.after(() => {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  });

  const remediation = fullRemediation();
  const counters = {
    audit: 0,
    fix: 0,
    round: 0,
    rehydrate: 0,
    tag: 0,
  };
  const driver = driverModule.createDriver({
    browserFactory: scriptedBrowserFactory(remediation, counters),
    log() {},
  });
  t.after(() => driver.close());

  const saved = [];
  const runOptions = {
    filePath,
    targetScore: 95,
    fixPasses: 1,
    polishPasses: 0,
    taggedPdf: true,
    autoContinue: false,
    autoContinueRounds: 3,
  };
  const fresh = await driver.remediate({
    ...runOptions,
    onCheckpoint(value) {
      saved.push(clone(value));
      return { saved: true };
    },
  });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].remediation.checkpointCapsuleSchema, 1);
  assert.deepEqual(
    validateCheckpointEnvelope(envelope(saved[0]), EXPECTED),
    envelope(saved[0]),
  );
  assert.deepEqual(
    { audit: counters.audit, fix: counters.fix, round: counters.round },
    { audit: 1, fix: 1, round: 0 },
  );

  const beforeResume = { ...counters };
  let unexpectedSave = 0;
  const resumed = await driver.remediate({
    ...runOptions,
    resumeCheckpoint: saved[0],
    onCheckpoint() {
      unexpectedSave += 1;
      return { saved: true };
    },
  });

  assert.equal(counters.audit, beforeResume.audit);
  assert.equal(counters.fix, beforeResume.fix);
  assert.equal(counters.round, beforeResume.round);
  assert.equal(counters.tag, beforeResume.tag + 1);
  assert.equal(unexpectedSave, 0);

  const publicationAndVerificationFields = [
    'beforeScore',
    'afterScore',
    'verdict',
    'aiVerificationIncomplete',
    'scoreSource',
    'estimatedMinimumScore',
    'integrityCoverage',
    'integrityWarning',
    'fidelityNotes',
    'verificationState',
    'verificationHtmlBound',
    'remainingAxeViolations',
    'remainingEqualAccessFailures',
    'runId',
    'auditCoverage',
    'accessibleHtml',
    'taggedPdfB64',
    'taggedPdfError',
    'taggedPdfDelivery',
    'taggedPdfExportMode',
    'activeContentScanVerified',
    'activeContentDetected',
  ];
  const project = (value) => Object.fromEntries(
    publicationAndVerificationFields.map((field) => [field, value[field]]),
  );
  assert.deepEqual(project(resumed), project(fresh));
  assert.equal(resumed.verificationHtmlBound, true);
  assert.equal(resumed.activeContentScanVerified, true);
  assert.ok(resumed.taggedPdfB64);
});
