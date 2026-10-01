import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let sessions;

beforeAll(() => {
  loadAlloModule('review_document_session_module.js');
  sessions = window.AlloModules.ReviewDocumentSession;
});

function verifiedRemediation() {
  return {
    accessibleHtml: '<!doctype html><html><body><h1>Verified</h1></body></html>',
    htmlChars: 62,
    keepMe: { source: 'caller-metadata' },
    verificationHtmlBinding: { digest: 'bound-artifact' },
    verificationAudit: { score: 98, issues: [] },
    axeAudit: { score: 100, totalViolations: 0 },
    axeViolations: [],
    secondEngineAudit: { score: 97, failViolations: 0 },
    afterScore: 98,
    afterScoreVerified: true,
    _scoreIsBlended: true,
    _aiVerificationIncomplete: false,
    _estimatedMinimumScore: 95,
    _estimatedScoreBasis: 'three engines',
    _finalAuditRetryAvailable: false,
    _scoreSource: 'verified',
    verificationCoverage: { ai: 'complete', axe: 'complete', equalAccess: 'complete' },
    coverage: { ai: 'complete', axe: 'complete', equalAccess: 'complete' },
    verificationState: 'complete',
    executionState: 'complete',
    outcomeState: 'pass',
    verificationScope: 'full-output',
    testedScopeComplete: true,
    engineExecutionComplete: true,
    fullyVerifiedSuccess: true,
    success: true,
    knownFindingCount: 0,
    knownFindings: { total: 0 },
    scoreEvidence: { ai: 98, axe: 100, equalAccess: 97 },
    verificationReasons: ['three-engine-run-complete'],
    reasons: ['three-engine-run-complete'],
    verificationReviewCount: 0,
    reviewCount: 0,
    requiresManualReview: false,
    issueResolution: { resolved: 4 },
    remainingIssues: [],
    verificationEvidence: { engines: 3 },
    evidenceProvenance: { replayKey: 'replay-1' },
    evidenceManifest: { manifestVersion: 1 },
    evidenceManifestDigest: 'manifest-digest',
    evidenceManifestId: 'manifest-1',
    evidenceDigest: 'evidence-digest',
    evidenceId: 'evidence-1',
    artifactBinding: { digest: 'artifact-digest' },
    provenance: { source: 'verified-run' },
    verificationProvenance: { runId: 'run-1' },
    verificationRunId: 'run-1',
    verifiedAt: '2026-08-13T10:00:00.000Z',
  };
}

describe('ReviewDocumentSession evidence coherence', () => {
  it('invalidates only verification claims while preserving the edited artifact and caller metadata', () => {
    const original = verifiedRemediation();
    Object.defineProperty(original, '_verificationHtmlSnapshot', { value: original.accessibleHtml, enumerable: false });
    Object.defineProperty(original, '_verificationHtmlBindingDigest', { value: 'runtime-proof', enumerable: false });

    const result = sessions.invalidateVerification(original);

    expect(result).not.toBe(original);
    expect(Object.isFrozen(result)).toBe(true);
    expect(original.success).toBe(true);
    expect(original.verificationHtmlBinding).toEqual({ digest: 'bound-artifact' });
    expect(result.accessibleHtml).toBe(original.accessibleHtml);
    expect(result.keepMe).toBe(original.keepMe);
    expect(result).toMatchObject({
      verificationHtmlBinding: null,
      verificationAudit: null,
      axeAudit: null,
      axeViolations: null,
      secondEngineAudit: null,
      afterScore: null,
      afterScoreVerified: false,
      _scoreIsBlended: false,
      _aiVerificationIncomplete: true,
      _estimatedMinimumScore: null,
      _estimatedScoreBasis: null,
      _finalAuditRetryAvailable: true,
      _scoreSource: 'unavailable',
      verificationState: 'unavailable',
      executionState: 'unavailable',
      outcomeState: 'unknown',
      testedScopeComplete: false,
      engineExecutionComplete: false,
      fullyVerifiedSuccess: false,
      success: false,
      knownFindingCount: null,
      knownFindings: null,
      scoreEvidence: null,
      verificationReviewCount: 0,
      requiresManualReview: true,
      issueResolution: null,
      remainingIssues: null,
      verificationEvidence: null,
      evidenceProvenance: null,
      evidenceManifest: null,
      evidenceManifestDigest: null,
      evidenceManifestId: null,
      evidenceDigest: null,
      evidenceId: null,
      artifactBinding: null,
      provenance: null,
      verificationProvenance: null,
      verificationRunId: null,
      verifiedAt: null,
    });
    expect(result.verificationCoverage).toEqual({
      standard: 'WCAG 2.2 AA',
      ai: 'unavailable',
      axe: 'unavailable',
      equalAccess: 'unavailable',
      pdfUaSelfCheck: 'not-run',
    });
    expect(result.coverage).toBe(result.verificationCoverage);
    expect(result.verificationReasons).toEqual([
      'three-engine-run-complete',
      'content-modified-pending-reverification',
    ]);
    expect(result).not.toHaveProperty('_verificationHtmlSnapshot');
    expect(result).not.toHaveProperty('_verificationHtmlBindingDigest');
  });

  it('uses a supplied reason exactly once and safely leaves non-object values alone', () => {
    const result = sessions.invalidateVerification({
      accessibleHtml: '<p>Changed</p>',
      verificationReasons: ['manual-structure-edit'],
    }, 'manual-structure-edit');
    expect(result.verificationReasons).toEqual(['manual-structure-edit']);
    expect(sessions.invalidateVerification(null)).toBeNull();
    expect(sessions.invalidateVerification('html')).toBe('html');
  });

  it('invalidates a session atomically with a revision and typed ledger entry', () => {
    const session = sessions.createSession({
      id: 'review-1',
      workspaceMode: 'advanced-review',
      remediationResult: verifiedRemediation(),
      at: '2026-08-13T11:00:00.000Z',
    });
    const next = sessions.invalidateVerification(session, undefined, {
      at: '2026-08-13T11:01:00.000Z',
      transactionId: 'transaction-1',
    });

    expect(next).not.toBe(session);
    expect(session.revision).toBe(0);
    expect(next.revision).toBe(1);
    expect(Object.isFrozen(next)).toBe(true);
    expect(Object.isFrozen(next.document)).toBe(true);
    expect(Object.isFrozen(next.ledger)).toBe(true);
    expect(next.document.remediationResult.accessibleHtml).toBe(session.document.currentHtml);
    expect(next.document.remediationResult.success).toBe(false);
    expect(next.evidence).toMatchObject({
      state: 'stale',
      stale: true,
      reason: 'content-modified-pending-reverification',
      invalidatedAt: '2026-08-13T11:01:00.000Z',
    });
    expect(next.workflow).toMatchObject({ state: 'needs-review', dirty: true, needsReview: true });
    expect(next.ledger).toHaveLength(1);
    expect(next.ledger[0]).toMatchObject({
      type: 'evidence.invalidate',
      reason: 'content-modified-pending-reverification',
      revision: 1,
      transactionId: 'transaction-1',
    });
  });
});

describe('ReviewDocumentSession workspaces and transactions', () => {
  it('hydrates persisted values, validates workspace modes, and summarizes state', () => {
    const hydrated = sessions.hydrateSession(JSON.stringify(verifiedRemediation()), {
      id: 'hydrated',
      workspaceMode: 'advanced-review',
    });
    const author = sessions.setWorkspaceMode(hydrated, 'author', { at: '2026-08-13T12:00:00.000Z' });

    expect(sessions.isSession(hydrated)).toBe(true);
    expect(hydrated.workspaceMode).toBe('advanced-review');
    expect(author.workspaceMode).toBe('author');
    expect(author.revision).toBe(1);
    expect(author.ledger.at(-1)).toMatchObject({ type: 'workspace.mode', from: 'advanced-review', to: 'author' });
    expect(sessions.setWorkspaceMode(author, 'not-a-mode')).toBe(author);
    expect(sessions.summarize(author)).toMatchObject({
      id: 'hydrated',
      workspaceMode: 'author',
      revision: 1,
      ledgerCount: 1,
      verificationState: 'complete',
    });
  });

  it('commits typed commands and evidence invalidation as one revision', () => {
    const session = sessions.createSession({
      id: 'review-transaction',
      workspaceMode: 'advanced-review',
      remediationResult: verifiedRemediation(),
    });
    let transaction = sessions.beginTransaction(session, { id: 'tx-retag', label: 'Retag heading' });
    transaction = sessions.addCommand(transaction, { type: 'retag', nodeId: 'sem-heading', tag: 'h2' });
    const html = '<!doctype html><html><body><h2 data-allo-semantic-id="sem-heading">Verified</h2></body></html>';
    const next = sessions.commitTransaction(session, transaction, {
      ok: true,
      changed: true,
      html,
      summary: 'Retagged heading',
      at: '2026-08-13T13:00:00.000Z',
    });

    expect(next.revision).toBe(1);
    expect(next.document.currentHtml).toBe(html);
    expect(next.document.remediationResult.accessibleHtml).toBe(html);
    expect(next.document.remediationResult.htmlChars).toBe(html.length);
    expect(next.ledger.map((entry) => entry.type)).toEqual(['command.retag', 'evidence.invalidate']);
    expect(next.ledger.every((entry) => entry.transactionId === 'tx-retag')).toBe(true);
    expect(next.ledger.every((entry) => entry.revision === 1)).toBe(true);
    expect(() => sessions.commitTransaction(next, transaction, { changed: true, html })).toThrow('stale-review-transaction');
  });

  it('does not advance revision for failed or no-op semantic output', () => {
    const session = sessions.createSession({ id: 'no-op', currentHtml: '<p>Same</p>' });
    const command = { type: 'set-language', language: 'en' };
    expect(sessions.applyCommand(session, command, { ok: false, changed: false })).toBe(session);
    expect(sessions.applyCommand(session, command, { ok: true, changed: false, html: '<p>Same</p>' })).toBe(session);
  });
});
