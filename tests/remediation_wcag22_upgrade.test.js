import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const verificationPolicy = read('verification_policy_source.jsx');
const pipeline = verificationPolicy + '\n' + read('doc_pipeline_source.jsx');
const pipelineModule = read('doc_pipeline_module.js');
const pipelineDeploy = read('desktop/web-app/public/doc_pipeline_module.js');
const view = read('view_pdf_audit_source.jsx');
const coverageGenerator = read('dev-tools/gen_wcag_coverage.cjs');
const coverageDoc = read('docs/wcag_sc_coverage.md');

describe('remediation pipeline WCAG 2.2 upgrade', () => {
  it('runs axe 4.12.1 with WCAG 2.2 A and AA tags in every remediation audit path', () => {
    expect(pipeline).toContain('axe-core@4.12.1/axe.min.js');
    expect(pipeline).toContain('axe-core/4.12.1/axe.min.js');
    expect(pipeline).not.toContain('axe-core@4.10.3/axe.min.js');
    const runOnly = pipeline.match(/values: \['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'\]/g) || [];
    expect(runOnly.length).toBeGreaterThanOrEqual(2);
  });

  it('runs IBM Equal Access under its supported WCAG_2_2 policy', () => {
    expect(pipeline).toContain("checker.check(doc, ['WCAG_2_2'])");
    expect(pipeline).toContain("standard: 'WCAG 2.2 AA'");
    expect(pipeline).not.toContain("checker.check(doc, ['WCAG_2_1'])");
  });

  it('moves cache identity when deterministic rules change', () => {
    expect(pipeline).toContain("const _PIPELINE_PROMPT_VERSION = '20260711-1';");
  });

  it('treats indeterminate automated rules as manual-review evidence, not confirmed failures', () => {
    expect(pipeline).toContain("manualReviewRequired: (results.incomplete || []).length > 0");
    expect(pipeline).toContain("verificationStatus: (results.incomplete || []).length > 0 ? 'complete-with-review' : 'complete'");
    expect(pipeline).toContain("reasons.push('axe-incomplete:' + _axeIncomplete)");
    expect(pipeline).toContain('The structural score counts confirmed failures only; review the incomplete rules');
  });

  it('returns per-engine verification coverage on remediation results', () => {
    expect(pipeline).toContain('function _alloDeriveVerificationState(input)');
    expect(pipeline).toContain("standard: 'WCAG 2.2 AA'");
    expect(pipeline).toContain("axeStatus = 'complete-with-review'");
    expect(pipeline).toContain("eaStatus = 'complete-with-review'");
    expect(pipeline).toContain('verificationCoverage: _verificationState.verificationCoverage');
  });

  it('aligns the secondary HTML remediation lane with Equal Access and manual-review disclosure', () => {
    expect(view).toContain('const [finalAi, finalAxe, finalEa] = await Promise.all');
    expect(view).toContain('equalAccess: finalEa');
    expect(view).toContain('requiresManualReview: verification.requiresManualReview');
    expect(view).toContain("verification.verificationState === 'complete' ? 'success' : 'warning'");
    expect(view).toContain('Static HTML/source audit excludes live scripts, external CSS');
  });

  it('documents every new WCAG 2.2 A/AA criterion as conditional where applicable', () => {
    for (const sc of ['2.4.11', '2.5.7', '2.5.8', '3.2.6', '3.3.7', '3.3.8']) {
      expect(coverageGenerator).toContain(`id: '${sc}'`);
      expect(coverageDoc).toContain(`| ${sc} |`);
    }
    expect(coverageDoc).toContain('WCAG 2.2 Success-Criterion Coverage');
  });

  it('ships byte-identical compiled pipeline artifacts', () => {
    expect(pipelineModule).toContain("checker.check(doc, ['WCAG_2_2'])");
    expect(pipelineModule).toContain("'wcag22aa'");
    expect(pipelineModule).toBe(pipelineDeploy);
  });
});