// Remediation evidence dossier golden (2026-07-01).
// This pins the trust contract districts care about: the report must not be only
// a before/after score. It must carry what changed, what evidence/validators were
// used, what still needs review, and clear non-conformance caveats.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const auditSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const auditMod = readFileSync(resolve(process.cwd(), 'view_pdf_audit_module.js'), 'utf8');
const auditDeploy = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/view_pdf_audit_module.js'), 'utf8');
const golden = JSON.parse(readFileSync(resolve(process.cwd(), 'tests/fixtures/remediation_evidence_dossier.golden.json'), 'utf8'));

const auditArtifacts = [
  ['source', auditSrc],
  ['module', auditMod],
  ['prismflow', auditDeploy],
];

describe('golden remediation evidence dossier shape', () => {
  it('keeps scores, validators, issue resolution, fidelity evidence, expert-review reason, and caveats together', () => {
    expect(golden.validation.pdfUA.validator).toMatch(/veraPDF/);
    expect(golden.validation.note).toMatch(/independent of the content score/);
    expect(golden.remediation.engines).toEqual(expect.arrayContaining([
      expect.stringMatching(/^AI/),
      expect.stringMatching(/^axe-core/),
      expect.stringMatching(/^IBM Equal Access/),
    ]));
    expect(golden.remediation.issueResolution.resolved[0]).toMatchObject({ wcag: '1.1.1', severity: 'serious' });
    expect(golden.remediation.fidelity.notes[0]).toMatchObject({ kind: 'tables' });
    expect(golden.remediation.fidelity.groundTruth).toMatchObject({ method: 'dual-ocr' });
    expect(golden.remediation.expertReview).toEqual({ needed: true, reason: 'content-fidelity' });
  });
});

describe('pipeline evidence is computed before reports consume it', () => {
  it('the fix result carries the evidence fields needed for a defensible dossier', () => {
    expect(dp).toMatch(/issueResolution: _issueResolution/);
    expect(dp).toMatch(/fidelityNotes: _structuralFidelityNotes/);
    expect(dp).toMatch(/fidelityLimited: \(integrityCoverage != null && integrityCoverage < 90\) \|\| _structuralFidelityNotes\.length > 0/);
    expect(dp).toMatch(/ocrAccuracy,/);
    expect(dp).toMatch(/groundTruthCharCount: window\.__lastGroundTruthCharCount \|\| 0/);
    expect(dp).toMatch(/groundTruthMethod: window\.__lastGroundTruthMethod \|\| null/);
    expect(dp).toMatch(/needsExpertReview,/);
    expect(dp).toMatch(/expertReviewReason,/);
    expect(dp).toMatch(/pipelineStats: \{/);
    expect(dp).toMatch(/computeStructuralFidelityNotes: _computeStructuralFidelityNotes/);
  });
});

describe('signed audit trail carries remediation evidence, not just scores', () => {
  it.each(auditArtifacts)('%s payload includes issue-resolution and fidelity evidence', (_name, src) => {
    expect(src).toMatch(/issueResolution: pdfFixResult\.issueResolution \|\| null/);
    expect(src).toMatch(/fidelity:\s*\{/);
    expect(src).toMatch(/notes: pdfFixResult\.fidelityNotes \|\| \[\]/);
    expect(src).toMatch(/limited: !!pdfFixResult\.fidelityLimited/);
    expect(src).toMatch(/ocrAccuracy: pdfFixResult\.ocrAccuracy \|\| null/);
    expect(src).toMatch(/groundTruth:\s*\{/);
    expect(src).toMatch(/charCount: pdfFixResult\.groundTruthCharCount \|\| null/);
    expect(src).toMatch(/method: pdfFixResult\.groundTruthMethod \|\| null/);
    expect(src).toMatch(/expertReview:\s*\{/);
    expect(src).toMatch(/needed: !!pdfFixResult\.needsExpertReview/);
    expect(src).toMatch(/reason: pdfFixResult\.expertReviewReason \|\| null/);
    expect(src).toMatch(/remainingIssues: pdfFixResult\.remainingIssues \?\? null/);
  });

  it('the signed trail still withholds stale or missing PDF/UA claims instead of overclaiming', () => {
    expect(auditSrc).toMatch(/computed on a DIFFERENT set of bytes/);
    expect(auditSrc).toMatch(/NOT an ISO 14289-1 conformance verdict/);
    expect(auditSrc).toMatch(/not a legal accessibility certificate; human review/);
  });
});

describe('research JSON export carries the same evidence summary', () => {
  it('JSON export includes issue-resolution, fidelity, OCR, and expert-review fields', () => {
    expect(auditSrc).toMatch(/issueResolution: pdfFixResult\.issueResolution \|\| null/);
    expect(auditSrc).toMatch(/fidelityNotes: pdfFixResult\.fidelityNotes \|\| \[\]/);
    expect(auditSrc).toMatch(/fidelityLimited: !!pdfFixResult\.fidelityLimited/);
    expect(auditSrc).toMatch(/expertReview: \{ needed: !!pdfFixResult\.needsExpertReview, reason: pdfFixResult\.expertReviewReason \|\| null \}/);
    expect(auditSrc).toMatch(/groundTruth: \{ charCount: pdfFixResult\.groundTruthCharCount \|\| null, method: pdfFixResult\.groundTruthMethod \|\| null \}/);
  });
});