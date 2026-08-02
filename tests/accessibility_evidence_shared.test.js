import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let Evidence;

beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  loadAlloModule('accessibility_evidence_module.js');
  Evidence = window.AlloModules.AccessibilityEvidence;
  if (!Evidence) throw new Error('AccessibilityEvidence module did not register');
});

describe('shared accessibility evidence identity', () => {
  it('implements the canonical SHA-256 test vector', () => {
    expect(Evidence.sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('creates deterministic bindings independent of object key order', () => {
    const first = Evidence.createArtifactBinding({ title: 'Quiz', data: { b: 2, a: 1 } }, {
      rendererRevision: 'workspace-v1',
    });
    const reordered = Evidence.createArtifactBinding({ data: { a: 1, b: 2 }, title: 'Quiz' }, {
      rendererRevision: 'workspace-v1',
    });
    const changed = Evidence.createArtifactBinding({ title: 'Quiz', data: { b: 3, a: 1 } }, {
      rendererRevision: 'workspace-v1',
    });
    expect(first).toMatchObject({ algorithm: 'SHA-256', scope: 'interactive-artifact' });
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(first.digest).toBe(reordered.digest);
    expect(first.digest).not.toBe(changed.digest);
    expect(Evidence.bindingFingerprint(first)).toBe(`sha256:${first.digest}`);
  });
});

describe('shared finding contracts', () => {
  it('canonicalizes known rules and corrects their severity consistently', () => {
    const finding = Evidence.canonicalizeFinding({
      source: 'axe',
      ruleId: 'image-alt',
      severity: 'minor',
      description: 'Image is missing alternative text',
      wcag: '1.1.1',
    });
    expect(finding).toMatchObject({
      source: 'axe',
      ruleId: 'image-alt',
      severity: 'critical',
      findingKey: 'family:missing-alt',
      status: 'open',
    });
    expect(finding._reportedSeverity).toBe('minor');
  });

  it('diffs findings into resolved, persisted, and introduced groups', () => {
    const baseline = [
      { ruleId: 'image-alt', issue: 'Missing alt text', severity: 'critical' },
      { ruleId: 'heading-order', issue: 'Heading order', severity: 'serious' },
    ];
    const current = [
      { ruleId: 'heading-order', issue: 'Heading hierarchy', severity: 'serious' },
      { ruleId: 'button-label', issue: 'Button has no name', severity: 'minor' },
    ];
    const diff = Evidence.diffFindings(baseline, current);
    expect(diff.summary).toMatchObject({
      resolvedCount: 1,
      persistedCount: 1,
      introducedCount: 1,
      totalPre: 2,
    });
    expect(diff.resolved[0].ruleId).toBe('image-alt');
    expect(diff.persisted[0].ruleId).toBe('heading-order');
    expect(diff.introduced[0].ruleId).toBe('button-label');
  });

  it('is consumed by the document pipeline through fail-safe adapters', () => {
    const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
    expect(source).toContain("window.AlloModules && window.AlloModules.AccessibilityEvidence");
    expect(source).toContain("typeof sharedEvidence.findingKey === 'function'");
    expect(source).toContain("typeof sharedEvidence.diffFindings === 'function'");
  });
  it('drives the document pipeline resolution adapter at runtime', () => {
    loadAlloModule('doc_pipeline_module.js');
    const pipeline = window.AlloModules.createDocPipeline({});
    const originalDiff = Evidence.diffFindings;
    let sharedDiffCalls = 0;
    Evidence.diffFindings = (...args) => {
      sharedDiffCalls += 1;
      return originalDiff(...args);
    };
    let result;
    try {
      result = pipeline.recomputeIssueResolution({
        baseline: [
          { ruleId: 'image-alt', issue: 'Missing alt text', severity: 'critical' },
          { ruleId: 'heading-order', issue: 'Heading order', severity: 'serious' },
        ],
      }, {
        issues: [
          { ruleId: 'heading-order', issue: 'Heading hierarchy', severity: 'serious' },
          { ruleId: 'button-label', issue: 'Button has no name', severity: 'minor' },
        ],
      });
    } finally {
      Evidence.diffFindings = originalDiff;
    }
    expect(sharedDiffCalls).toBe(1);
    expect(result.summary).toMatchObject({
      resolvedCount: 1,
      persistedCount: 1,
      introducedCount: 1,
    });
    expect(result.resolved[0].ruleId).toBe('image-alt');
  });
});

describe('evidence provenance and replay', () => {
  it('creates a binding-aware replay key and deterministic evidence digests', () => {
    const binding = Evidence.createArtifactBinding({ title: 'Remediation fixture', body: '<main />' }, {
      rendererRevision: 'doc-renderer-v2',
      scope: 'full-output',
    });
    const provenance = Evidence.createEvidenceProvenance({
      profile: 'document-remediation',
      artifactBinding: binding,
      capturedAt: '2026-08-01T12:00:00Z',
      evidence: {
        ai: { score: 96, issues: [], runAt: '2026-08-01T11:59:00Z' },
        axe: { score: 100, totalViolations: 0, totalIncomplete: 0, engine: 'axe-core', version: '4.12.1', runAt: '2026-08-01T11:59:30Z' },
        equalAccess: { score: 98, failViolations: 0, potentialViolations: 0, manualViolations: 0, reviewFindingCount: 0, runAt: '2026-08-01T12:00:00Z' },
      },
      findings: [{ source: 'axe', ruleId: 'image-alt', issue: 'Missing alt text' }],
    });
    expect(provenance).toMatchObject({
      provenanceVersion: 1,
      schemaVersion: 1,
      profile: 'document-remediation',
      standard: 'WCAG 2.2 AA',
      artifactFingerprint: `sha256:${binding.digest}`,
      capturedAt: '2026-08-01T12:00:00.000Z',
    });
    expect(provenance.lanes).toMatchObject({
      ai: { executed: true, findingCount: 0 },
      axe: { executed: true, findingCount: 0, version: '4.12.1' },
      equalAccess: { executed: true, findingCount: 0 },
    });
    expect(provenance.evidenceDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(provenance.findingDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(provenance.replayKey).toContain('document-remediation:sha256:');
  });

  it('creates and verifies a tamper-evident evidence manifest', () => {
    const binding = Evidence.createArtifactBinding({ title: 'Manifest fixture' }, { rendererRevision: 'lab-v2' });
    const attached = Evidence.attachEvidenceProvenance({
      verificationState: 'complete',
      executionState: 'complete',
      outcomeState: 'pass',
      fullyVerifiedSuccess: true,
      requiresManualReview: false,
      knownFindingCount: 0,
      reviewCount: 0,
      reasons: [],
    }, {
      profile: 'accessibility-lab',
      artifactBinding: binding,
      evidence: {
        manual: { executed: true, findingCount: 0, reviewCount: 0 },
        axe: { executed: true, findingCount: 0, reviewCount: 0, version: '4.12.1' },
      },
    }, 'accessibility-lab');
    expect(attached.evidenceManifest).toMatchObject({
      manifestVersion: 1,
      evidenceProfile: 'accessibility-lab',
      manifestDigest: expect.stringMatching(/^sha256:/),
      manifestId: expect.stringContaining('accessibility-lab:sha256:'),
    });
    expect(Evidence.verifyEvidenceManifest(attached.evidenceManifest)).toMatchObject({ valid: true });
    const tampered = { ...attached.evidenceManifest, verification: { ...attached.evidenceManifest.verification, outcomeState: 'fail' } };
    expect(Evidence.verifyEvidenceManifest(tampered)).toMatchObject({ valid: false, reason: 'manifest-digest-mismatch' });
  });
  it('classifies actionable evidence changes without treating timestamps as staleness', () => {
    const base = {
      provenanceVersion: 1,
      profile: 'accessibility-lab',
      artifactFingerprint: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      rendererRevision: 'lab-v1',
      evidenceDigest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      findingDigest: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      replayKey: 'accessibility-lab:base',
      capturedAt: '2026-08-01T10:00:00.000Z',
    };
    const timestampOnly = Evidence.compareEvidenceProvenance(base, { ...base, capturedAt: '2026-08-01T11:00:00.000Z' });
    expect(timestampOnly).toMatchObject({ changed: false, stale: false, reasons: [] });
    const changed = Evidence.compareEvidenceProvenance(base, {
      ...base,
      artifactFingerprint: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      evidenceDigest: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      replayKey: 'accessibility-lab:changed',
    });
    expect(changed).toMatchObject({ changed: true, stale: true });
    expect(changed.reasons).toEqual(expect.arrayContaining(['artifact-binding-changed', 'engine-evidence-changed']));
  });
  it('attaches provenance to canonical verification results', () => {
    const result = Evidence.deriveVerificationState({
      profile: 'document-remediation',
      evidence: {
        ai: { score: 96, issues: [] },
        axe: { score: 100, totalViolations: 0, totalIncomplete: 0 },
        equalAccess: { score: 98, failViolations: 0, potentialViolations: 0, manualViolations: 0, reviewFindingCount: 0 },
      },
    });
    expect(result).toMatchObject({
      evidenceSchemaVersion: 1,
      evidenceProfile: 'document-remediation',
      evidenceProvenance: { profile: 'document-remediation', evidenceDigest: expect.stringMatching(/^sha256:/) },
    });
  });
});
describe('canonical VerificationPolicy facade', () => {
  it('delegates the standalone policy to shared evidence when available', () => {
    loadAlloModule('verification_policy_module.js');
    const originalDerive = Evidence.deriveVerificationState;
    let sharedCalls = 0;
    Evidence.deriveVerificationState = (...args) => {
      sharedCalls += 1;
      return originalDerive(...args);
    };
    let result;
    try {
      result = window.AlloModules.VerificationPolicy.deriveVerificationState({
        ai: { score: 96, issues: [] },
        axe: { score: 100, totalViolations: 0, totalIncomplete: 0 },
        equalAccess: { score: 98, failViolations: 0, potentialViolations: 0, manualViolations: 0, reviewFindingCount: 0 },
      });
    } finally {
      Evidence.deriveVerificationState = originalDerive;
    }
    expect(sharedCalls).toBe(1);
    expect(result).toMatchObject({
      verificationState: 'complete',
      afterScoreVerified: true,
      requiresManualReview: false,
    });
  });
});
describe('profile-aware verification', () => {
  const manualPass = { executed: true, findingCount: 0, reviewCount: 0 };
  const axePass = { executed: true, findingCount: 0, reviewCount: 0 };

  it('completes the Lab profile with axe plus manual evidence', () => {
    const result = Evidence.deriveProfileVerificationState({
      evidence: { manual: manualPass, axe: axePass },
    }, 'accessibility-lab');
    expect(result).toMatchObject({
      profile: 'accessibility-lab',
      verificationState: 'complete',
      executionState: 'complete',
      outcomeState: 'pass',
      fullyVerifiedSuccess: true,
    });
  });

  it('fails closed for missing evidence and reports known barriers separately', () => {
    const missingAxe = Evidence.deriveProfileVerificationState({
      evidence: { manual: manualPass },
    }, 'accessibility-lab');
    expect(missingAxe).toMatchObject({
      verificationState: 'partial',
      fullyVerifiedSuccess: false,
    });
    expect(missingAxe.reasons).toContain('axe-unavailable');

    const barrier = Evidence.deriveProfileVerificationState({
      evidence: {
        manual: { executed: true, findingCount: 1, reviewCount: 0 },
        axe: axePass,
      },
    }, 'accessibility-lab');
    expect(barrier).toMatchObject({
      verificationState: 'review-required',
      outcomeState: 'fail',
      knownFindingCount: 1,
    });
  });
});
