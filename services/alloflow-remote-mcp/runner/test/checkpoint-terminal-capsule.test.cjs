'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

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
    _sourceCoverageExtraction: { pageErrors: [], lowConfidencePages: [] },
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
  assert.equal(compact.remediation.checkpointCapsuleSchema, 2);
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
  assert.equal(compact.remediation.sourceText, legacy.remediation.sourceText);
  assert.deepEqual(compact.remediation._sourceCoverageExtraction, legacy.remediation._sourceCoverageExtraction);
  assert.equal(compact.remediation.issueResolution, undefined);
  assert.equal(compact.remediation.pipelineStats, undefined);
  assert.ok(
    Buffer.byteLength(JSON.stringify(compact)) <
      Buffer.byteLength(JSON.stringify(legacy)) * 0.3,
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

test('terminal rejection evidence is bounded and optional for existing schema-2 capsules', () => {
  const full = fullRemediation();
  full.candidateRejectionCount = Number.MAX_SAFE_INTEGER;
  full.candidateRejections = Array.from({ length: 500 }, () => ({
    pass: 2, chunkId: '1', phase: 'chunk', reason: 'text-shrink', sourceText: 'PRIVATE-CANDIDATE-TEXT',
  }));
  const compact = driverModule.compactTerminalCheckpointSnapshot(snapshot(full));
  assert.equal(compact.remediation.candidateRejectionCount, 1000000);
  assert.equal(compact.remediation.candidateRejections.length, 100);
  assert.equal(JSON.stringify(compact).includes('PRIVATE-CANDIDATE-TEXT'), false);
  const oversized = clone(compact);
  oversized.remediation.candidateRejections = full.candidateRejections;
  const normalized = validateCheckpointEnvelope(envelope(oversized), EXPECTED);
  assert.equal(normalized.snapshot.remediation.candidateRejections.length, 100);
  assert.equal(JSON.stringify(normalized).includes('PRIVATE-CANDIDATE-TEXT'), false);
  const older = clone(compact);
  delete older.remediation.candidateRejectionCount;
  delete older.remediation.candidateRejections;
  const prior = validateCheckpointEnvelope(envelope(older), EXPECTED);
  assert.equal(prior.snapshot.remediation.candidateRejectionCount, 0);
  assert.deepEqual(prior.snapshot.remediation.candidateRejections, []);
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
    { ...compact, remediation: { ...compact.remediation, checkpointCapsuleSchema: 1 } },
    { ...compact, remediation: { ...compact.remediation, sourceText: null } },
    { ...compact, remediation: { ...compact.remediation, _sourceCoverageExtraction: { pageErrors: ['untrusted'], lowConfidencePages: [] } } },
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
  const liveProof = value => {
    const result = clone(value);
    Object.defineProperties(result, {
      _verificationHtmlSnapshot: { value: result.accessibleHtml, configurable: true },
      _verificationHtmlBindingDigest: { value: result.verificationHtmlBinding.digest, configurable: true },
    });
    return result;
  };
  const bindingMatches = (result, html) => {
    if (!result || !result.verificationHtmlBinding
      || result._verificationHtmlSnapshot !== html
      || result._verificationHtmlBindingDigest !== result.verificationHtmlBinding.digest) return false;
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
      return liveProof(remediation);
    },
    async rehydrateVerificationHtmlBinding(value) {
      counters.rehydrate += 1;
      return liveProof(value);
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

function scriptedBrowserFactory(remediation, counters, overrides = {}) {
  return async () => ({
    on() {},
    async close() {},
    async newContext() {
      const dom = new JSDOM('');
      const realm = {
        PDFLib: { PDFDocument: {} },
      };
      const factory = () => ({ ...scriptedPipeline(remediation, counters), ...(overrides.pipeline || {}) });
      factory.loopPolicy = {
        roundProgressed: () => true,
        roundRegressed: () => overrides.regressed === true,
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
          const previousDOMParser = global.DOMParser;
          global.window = realm;
          global.DOMParser = dom.window.DOMParser;
          try {
            return await fn(clone(arg));
          } finally {
            if (previousWindow === undefined) delete global.window;
            else global.window = previousWindow;
            if (previousDOMParser === undefined) delete global.DOMParser;
            else global.DOMParser = previousDOMParser;
          }
        },
      };
      return {
        async newPage() { return page; },
        async close() { dom.window.close(); },
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
  // This publication fixture must retain all source text; the large synthetic
  // source in the projection-size tests is intentionally unrelated to its HTML.
  remediation.sourceText = remediation.finalText;
  remediation.candidateRejectionCount = 7;
  remediation.candidateRejections = [{ pass: 1, chunkId: '2.0', phase: 'half', reason: 'table-cell-transposition', candidateHtml: 'PRIVATE-CANDIDATE-TEXT' }];
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
  assert.equal(fresh.candidateRejectionCount, 7);
  assert.deepEqual(fresh.candidateRejections, [{ chunkId: '2.0', phase: 'half', reason: 'table-cell-transposition', pass: 1 }]);
  assert.equal(JSON.stringify(saved).includes('PRIVATE-CANDIDATE-TEXT'), false);
  assert.equal(fresh.contentCoverage.status, 'matched');
  assert.ok(fresh.taggedPdfB64, fresh.taggedPdfError);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].remediation.checkpointCapsuleSchema, 2);
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
    'candidateRejectionCount',
    'candidateRejections',
    'verificationState',
    'verificationHtmlBound',
    'remainingAxeViolations',
    'remainingEqualAccessFailures',
    'runId',
    'auditCoverage',
    'accessibleHtml',
    'contentCoverage',
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

  // A fresh browser has no OCR globals. Resume must preserve the source
  // warnings from its checkpoint instead of silently upgrading coverage.
  const warningCheckpoint = clone(saved[0]);
  warningCheckpoint.remediation._sourceCoverageExtraction = {
    pageErrors: [1, null], lowConfidencePages: [1],
  };
  const beforeWarnings = { ...counters };
  const warned = await driver.remediate({ ...runOptions, resumeCheckpoint: warningCheckpoint });
  assert.equal(counters.audit, beforeWarnings.audit);
  assert.equal(counters.fix, beforeWarnings.fix);
  assert.equal(counters.tag, beforeWarnings.tag);
  assert.equal(warned.contentCoverage.reviewRequired, true);
  assert.equal(warned.contentCoverage.extraction.pageErrorCount, 2);
  assert.equal(warned.contentCoverage.extraction.lowConfidencePageCount, 1);
  assert.equal(warned.taggedPdfError, 'content_coverage_requires_review');
  assert.equal(warned.taggedPdfB64, null);

  // Old compact capsules omitted the exact source and OCR warning metadata.
  // They must restart work, while legacy full snapshots remain valid above.
  const legacyCapsule = clone(saved[0]);
  legacyCapsule.remediation.checkpointCapsuleSchema = 1;
  delete legacyCapsule.remediation.sourceText;
  delete legacyCapsule.remediation._sourceCoverageExtraction;
  const beforeLegacy = { ...counters };
  const restarted = await driver.remediate({ ...runOptions, resumeCheckpoint: legacyCapsule });
  assert.equal(counters.audit, beforeLegacy.audit + 1);
  assert.equal(counters.fix, beforeLegacy.fix + 1);
  assert.equal(restarted.contentCoverage.status, 'matched');
  assert.ok(restarted.taggedPdfB64, restarted.taggedPdfError);

});

test('headless follow-up deltas survive acceptance, verification failure, and regression without double-counting', async (t) => {
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'scripted-followup-evidence-key';
  t.after(() => {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  });
  const temporary = await fsp.mkdtemp(path.join(os.tmpdir(), 'alloflow-followup-evidence-'));
  const filePath = path.join(temporary, 'input.pdf');
  await fsp.writeFile(filePath, '%PDF-1.7\nfollow-up fixture\n%%EOF\n');
  t.after(() => fsp.rm(temporary, { recursive: true, force: true }));
  for (const kind of ['ai', 'axe']) {
    for (const outcome of ['accepted', 'unverified', 'regressed']) {
      const remediation = fullRemediation();
      remediation.sourceText = remediation.finalText;
      remediation.afterScore = 80;
      remediation.verificationState = 'partial';
      remediation.axeAudit.totalViolations = kind === 'axe' ? 1 : 0;
      remediation.verificationAudit = { score: 80, issues: [{ issue: 'Heading review' }] };
      remediation.candidateRejectionCount = 5;
      remediation.candidateRejections = [{ pass: 1, chunkId: '1', phase: 'single', reason: 'size-shrink' }];
      const counters = { audit: 0, fix: 0, round: 0, rehydrate: 0, tag: 0 };
      const emit = controls => {
        assert.equal(typeof controls.onPassEvidence, 'function', kind);
        // Two distinct pass deltas: aggregate5, two recorded reasons. The
        // counter must add5 once, not add the record lengths a second time.
        for (const count of [3, 2]) controls.onPassEvidence({
          candidateRejectionCount: count,
          candidateRejections: [{ chunkId: '2.0', phase: 'half', reason: 'table-cell-transposition', candidateHtml: 'PRIVATE-CANDIDATE-TEXT' }],
        });
        counters.round++;
      };
      const pipeline = {
        async waitForGeminiCalm() {},
        async aiFixChunked(html, _instructions, _label, _routing, controls) { emit(controls); return html; },
        async autoFixAxeViolations(html, axe, _passes, controls) { emit(controls); return { html, axe, passes: 2 }; },
        async runAxeAudit() { return { score: 100, totalViolations: 0 }; },
        async auditOutputAccessibility() {
          if (outcome === 'unverified') throw Error('fixture verification unavailable');
          return { score: 100, issues: [] };
        },
        async runEqualAccessAudit() { return { score: 100, failViolations: 0 }; },
        async finalizeRemediationRound(cur) {
          // Do not rely on a reducer implicitly carrying non-verification fields.
          const { candidateRejectionCount, candidateRejections, ...rest } = cur;
          assert.equal(cur._verificationHtmlSnapshot, cur.accessibleHtml);
          return { ...rest, verificationState: 'complete', afterScore: 100, _detScore: outcome === 'regressed' ? 40 : 100 };
        },
      };
      const driver = driverModule.createDriver({
        browserFactory: scriptedBrowserFactory(remediation, counters, { pipeline, regressed: outcome === 'regressed' }), log() {},
      });
      try {
        const checkpoints = [];
        const options = { filePath, targetScore: 95, fixPasses: 2, polishPasses: 0, taggedPdf: true, autoContinue: true, autoContinueRounds: 1 };
        const fresh = await driver.remediate({ ...options, onCheckpoint: value => { checkpoints.push(clone(value)); return { saved: true }; } });
        assert.equal(fresh.candidateRejectionCount, 10, kind + ' ' + outcome + ' ' + JSON.stringify({ counters, autoContinue: fresh.autoContinue }));
        assert.equal(fresh.verificationHtmlBound, true, kind + ' ' + outcome + ' must retain non-enumerable live proof');
        assert.equal(fresh.candidateRejections.length, 3);
        assert.equal(fresh.candidateRejections[1].pass, 1);
        assert.equal(JSON.stringify(fresh).includes('PRIVATE-CANDIDATE-TEXT'), false);
        assert.equal(fresh.afterScore, outcome === 'accepted' ? 100 : 80);
        if (outcome === 'accepted') {
          const terminal = checkpoints.at(-1);
          assert.equal(terminal.remediation.checkpointCapsuleSchema, 2);
          const priorRounds = counters.round;
          const resumed = await driver.remediate({ ...options, resumeCheckpoint: terminal });
          assert.equal(counters.round, priorRounds);
          assert.equal(resumed.candidateRejectionCount, fresh.candidateRejectionCount);
          assert.deepEqual(resumed.candidateRejections, fresh.candidateRejections);
        }
      } finally { await driver.close(); }
    }
  }
});

test('browser-serialized rejection sanitizer has no dependency on Node module globals', () => {
  const { runInNewContext } = require('node:vm');
  const policy = require(path.join(repoRoot, 'desktop/mcp/remediation_verification.cjs'));
  const input = { candidateRejectionCount: 7, candidateRejections: [{ pass: 2, chunkId: '1.0', phase: 'half', reason: 'text-shrink', sourceText: 'PRIVATE-CANDIDATE-TEXT' }] };
  const output = runInNewContext('(' + policy.normalizeCandidateRejectionEvidence.toString() + ')(input, schema)', {
    input, schema: structuredClone(policy.CANDIDATE_REJECTION_SCHEMA),
  });
  assert.deepEqual(JSON.parse(JSON.stringify(output)), policy.normalizeCandidateRejectionEvidence(input));
  assert.equal(JSON.stringify(output).includes('PRIVATE-CANDIDATE-TEXT'), false);
});
