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
