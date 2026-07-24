import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

function extractEvidenceHelpers() {
  const start = src.indexOf('function _alloAiAuditHasFullCoverage');
  const end = src.indexOf('function _alloDeriveVerificationState', start);
  if (start < 0 || end < 0) throw new Error('canonical evidence helpers not found');
  return new Function(`${src.slice(start, end)}
    return {
      fullAi: _alloAiAuditHasFullCoverage,
      usableAi: _alloUsableCompleteAiAudit,
      usableAxe: _alloUsableAxeAudit,
      taggedVerdict: _alloTaggedPdfDeliveryVerdict,
      ocrVerdict: _alloOcrTextLayerVerdict,
      liveSignal: _alloLiveAbortSignalOrNull,
    };`)();
}

function extractOutcome(helpersSource) {
  const start = src.indexOf('function _alloRemediationOutcome');
  const end = src.indexOf('function _alloDistributionVerdict', start);
  if (start < 0 || end < 0) throw new Error('canonical remediation outcome not found');
  return new Function(`${helpersSource}
    ${src.slice(start, end)}
    return _alloRemediationOutcome;`)();
}

const helperStart = src.indexOf('function _alloAiAuditHasFullCoverage');
const helperEnd = src.indexOf('function _alloTaggedPdfDeliveryVerdict', helperStart);
const helpersSource = src.slice(helperStart, helperEnd);
const evidence = extractEvidenceHelpers();
const remediationOutcome = extractOutcome(helpersSource);

const completeAi = (overrides = {}) => ({
  score: 96,
  issues: [],
  chunksRequested: 10,
  chunksAudited: 10,
  _partialAudit: false,
  ...overrides,
});
const cleanAxe = (overrides = {}) => ({
  score: 100,
  totalViolations: 0,
  ...overrides,
});
const delivered = (ocrTextLayer) => ({
  roundTrip: { ok: true, checks: [], warnings: [] },
  postExportValidator: { summary: { overall: 'PASS' }, checks: [] },
  ...(ocrTextLayer ? { ocrTextLayer } : {}),
});

describe('remediation evidence predicates', () => {
  it('accepts only exact, full AI section coverage', () => {
    expect(evidence.usableAi(completeAi())).toBe(true);
    expect(evidence.usableAi(completeAi({ chunksAudited: 9 }))).toBe(false);
    expect(evidence.usableAi(completeAi({ chunksRequested: 100, chunksAudited: 99 }))).toBe(false);
    expect(evidence.usableAi(completeAi({ chunksRequested: undefined, chunksAudited: undefined }))).toBe(false);
    expect(evidence.usableAi(completeAi({ _partialAudit: true }))).toBe(false);
    expect(evidence.usableAi(completeAi({ _scoreDegraded: true }))).toBe(false);
    expect(evidence.usableAi(completeAi({ synthesized: true }))).toBe(false);
  });

  it('does not turn missing or malformed axe evidence into a clean audit', () => {
    expect(evidence.usableAxe(cleanAxe())).toBe(true);
    expect(evidence.usableAxe(null)).toBe(false);
    expect(evidence.usableAxe({ score: 100 })).toBe(false);
    expect(evidence.usableAxe({ score: 100, totalViolations: Number.NaN })).toBe(false);
    expect(evidence.usableAxe({ score: 100, totalViolations: -1 })).toBe(false);
  });

  it('never restores an already-aborted global signal', () => {
    const live = { aborted: false };
    expect(evidence.liveSignal(live)).toBe(live);
    expect(evidence.liveSignal({ aborted: true })).toBeNull();
    expect(evidence.liveSignal(null)).toBeNull();
  });
});

describe('tagged-PDF OCR evidence gate', () => {
  const completeLayer = {
    scanned: true,
    coveragePct: 100,
    nonLatinDropped: false,
    droppedChars: 0,
    pagesWithText: 2,
    pagesCovered: 2,
    pagesIncomplete: 0,
    pagesEmpty: 0,
  };

  it('accepts born-digital output and a complete scanned text layer', () => {
    expect(evidence.taggedVerdict(delivered())).toMatchObject({ ok: true, code: 'verified' });
    expect(evidence.taggedVerdict(delivered(completeLayer))).toMatchObject({ ok: true, code: 'verified' });
  });

  it.each([
    ['dropped characters', { droppedChars: 1 }],
    ['sub-100% coverage', { coveragePct: 99 }],
    ['incomplete page', { pagesIncomplete: 1, pagesCovered: 1 }],
    ['empty page', { pagesEmpty: 1 }],
    ['missing page layer', { pagesCovered: 1 }],
  ])('withholds verified delivery for %s', (_label, overrides) => {
    const result = evidence.taggedVerdict(delivered({ ...completeLayer, ...overrides }));
    expect(result).toMatchObject({ ok: false, code: 'ocr-text-layer-incomplete' });
  });
});

describe('canonical remediation outcome', () => {
  const complete = (overrides = {}) => ({
    afterScore: 96,
    verificationAudit: completeAi(),
    axeAudit: cleanAxe(),
    equalAccessAudit: { score: 100, failViolations: 0 },
    verificationState: 'complete',
    requiresManualReview: false,
    _aiVerificationIncomplete: false,
    ...overrides,
  });

  it('claims success only with canonical complete evidence at the configured target', () => {
    expect(remediationOutcome(complete(), { targetScore: 95 })).toMatchObject({
      state: 'success',
      canonicalComplete: true,
      aiCompleted: true,
      axeCompleted: true,
    });
    expect(remediationOutcome(complete({ afterScore: 94 }), { targetScore: 95 }).state).toBe('incomplete');
  });

  it('keeps missing, partial, tested-scope, review, and residual evidence incomplete', () => {
    expect(remediationOutcome(complete({ axeAudit: null }), { targetScore: 95 }).state).toBe('incomplete');
    expect(remediationOutcome(complete({ verificationAudit: completeAi({ chunksAudited: 9 }) }), { targetScore: 95 }).state).toBe('incomplete');
    expect(remediationOutcome(complete({ verificationState: 'complete-for-tested-scope' }), { targetScore: 95 }).state).toBe('incomplete');
    expect(remediationOutcome(complete({ requiresManualReview: true }), { targetScore: 95 }).state).toBe('incomplete');
    expect(remediationOutcome(complete({ axeAudit: cleanAxe({ totalViolations: 1 }) }), { targetScore: 95 }).state).toBe('incomplete');
    expect(remediationOutcome(complete({ equalAccessAudit: { score: 98, failViolations: 1 } }), { targetScore: 95 }).state).toBe('incomplete');
  });
});

describe('source-level anti-drift wiring', () => {
  it('requires fresh complete evidence for promotion and clean/target stops', () => {
    expect(src).toContain('const _passEvidenceComplete = _reAiUsable && _reAxeUsable;');
    expect(src).toContain('const _passIsBest = _passEvidenceComplete');
    expect(src).toContain('else if (_passEvidenceComplete && newAxeViolations === 0');
    expect(src).toContain('if (_passEvidenceComplete && newAxeViolations === 0 && !_reReviewRequired && newAiScore >= targetScore)');
    expect(src).not.toContain('const newAxeViolations = reAxe ? reAxe.totalViolations : bestAxeViolations;');
  });

  it('serializes unknown axe evidence as null and gates green UI on the outcome', () => {
    expect(src).toContain('axeViolations: _alloUsableAxeAudit(axeResults) ? axeResults.totalViolations : null');
    expect(src).toContain("else if (_remediationOutcome.state === 'success')");
    expect(src).not.toContain('axeViolations: axeResults ? axeResults.totalViolations : 0');
  });

  it('uses collision-safe exact-prompt memoization with in-flight deduplication', () => {
    expect(src).toContain("crypto.subtle.digest('SHA-256'");
    expect(src).toContain('const _auditChunkInFlight = new Map();');
    expect(src).toContain('const _auditMemoRunOnce = (key, prompt, producer)');
    expect(src).toContain('rec && rec.prompt === prompt && rec.json');
    expect(src).toContain('await _auditMemoKey(prompt)');
  });

  it('bounds persistent cache work and defaults sensitive retention to 24 hours', () => {
    expect(src).toContain('var _REMEDIATION_DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;');
    expect(src).toContain('window.__alloRemediationLongRetentionOptIn === true');
    expect(src).toContain('const _boundedRemediationCacheAwait');
    expect(src).toContain('const _batchCheckpointBudgetMs = (deadlineTs)');
    expect(src).toContain('const a = rec && (rec.audit || rec.result);');
  });

  it('pins Tesseract to an exact release on both mirrors', () => {
    expect(src).toContain('tesseract.js@5.1.1/dist/tesseract.min.js');
    expect(src).not.toMatch(/tesseract\.js@5\/dist/);
  });
});
