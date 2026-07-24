import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const reportName = 'non_eppp_eppp_guided_qa_2026-07-18.json';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function collectHttps(value, output = new Set()) {
  if (Array.isArray(value)) value.forEach((entry) => collectHttps(entry, output));
  else if (value && typeof value === 'object') Object.values(value).forEach((entry) => collectHttps(entry, output));
  else if (typeof value === 'string' && /^https:\/\/\S+$/i.test(value.trim())) output.add(value.trim());
  return output;
}

describe('EPPP-guided QA for every non-EPPP test-prep pack', () => {
  it('publishes an exact passing source/deploy report with honest distinctness accounting', () => {
    const sourceBytes = fs.readFileSync(path.join(sourceDir, reportName));
    const deployBytes = fs.readFileSync(path.join(deployDir, reportName));
    const report = JSON.parse(sourceBytes);

    expect(deployBytes.equals(sourceBytes)).toBe(true);
    expect(report).toMatchObject({
      reviewedAt: '2026-07-18',
      status: 'assistant-reviewed-pass-with-declared-content-gaps',
      verdict: { hardQa: 'pass', contentDistinctness: 'reviewed-gap-open' },
    });
    expect(report.hardFindings).toEqual([]);
    expect(report.perPack).toHaveLength(22);
    expect(report.perPack.every((row) => row.learningActivities === 500 && row.hardFindingCount === 0)).toBe(true);
    const expectedAssistantAuthored = report.perPack.reduce((sum, row) => sum + row.assistantAuthoredIndependentItems, 0);
    const expectedIndependent = report.perPack.reduce((sum, row) => sum + row.independentPracticeItems, 0);
    const expectedGuided = report.perPack.reduce((sum, row) => sum + row.guidedReviewActivities, 0);
    expect(report.aggregate).toMatchObject({
      packsReviewed: 22,
      learningActivitiesStructurallyReviewed: 11000,
      originalSourceItemsReviewed: 4400,
      assistantAuthoredIndependentItemsReviewed: expectedAssistantAuthored,
      independentPracticeItemsReviewed: expectedIndependent,
      guidedReviewActivitiesReviewed: expectedGuided,
      independentQuestionTarget: 11000,
      librariesReviewed: 22,
      chaptersReviewed: 264,
      lessonsReviewed: 1056,
      knowledgeChecksReviewed: 1320,
      flashcardsReviewed: 1650,
      memoryAidsReviewed: 440,
    });
    expect(report.aggregate.distinctIndependentContentKernels + report.aggregate.newIndependentItemsNeeded).toBe(11000);
    expect(report.perPack.every((row) => typeof row.simulation.basis === 'string'
      && row.simulation.basis.length >= 12 && row.simulation.minutes > 0)).toBe(true);
    expect(report.perPack.find((row) => row.stem === 'parapro')).toMatchObject({
      independentPracticeItems: 500,
      distinctIndependentContentKernels: 500,
      guidedReviewActivities: 0,
      newIndependentItemsNeeded: 0,
      contentDistinctnessVerdict: 'target-met',
    });
  });

  it('binds the suite verdict to every reviewed source artifact', () => {
    const report = readJson(path.join(sourceDir, reportName));
    expect(report.snapshot.algorithm).toBe('sha256');
    const expectedPaths = new Set([
      'test_prep/reference_catalog.json',
      'test_prep/eppp_native_qa.json',
      'test_prep/eppp_learning_library.json',
      'dev-tools/authored/non_eppp_eppp_guided_qa_group_a.review.json',
      'dev-tools/authored/non_eppp_eppp_guided_qa_group_b.review.json',
      'dev-tools/authored/non_eppp_eppp_guided_qa_group_c.review.json',
      'dev-tools/authored/test_prep_independent_additions_manifest.json',
    ]);
    for (const file of fs.readdirSync(sourceDir).filter((name) => name.endsWith('_pack.json') && !name.startsWith('eppp_'))) {
      const stem = file.replace('_pack.json', '');
      expectedPaths.add('test_prep/' + file);
      expectedPaths.add('test_prep/' + stem + '_learning_library.json');
      expectedPaths.add('test_prep/' + stem + '_native_qa.json');
      expectedPaths.add('test_prep/' + stem + '_learning_library_qa.json');
      const pack = readJson(path.join(sourceDir, file));
      for (const batch of pack.assistantReview?.independentBatchEvidence || []) {
        for (const evidenceFile of [...(batch.files || []), ...(batch.reviewReports || [])]) {
          expectedPaths.add('dev-tools/authored/' + evidenceFile);
        }
      }
    }
    const dependencyPaths = report.snapshot.dependencies.map((entry) => entry.path).sort();
    expect(report.snapshot.dependencyCount).toBe(expectedPaths.size);
    expect(report.snapshot.dependencies).toHaveLength(expectedPaths.size);
    expect(dependencyPaths).toEqual([...expectedPaths].sort());
    for (const dependency of report.snapshot.dependencies) {
      expect(dependency.sha256, dependency.path).toBe(sha256(fs.readFileSync(path.join(root, dependency.path))));
    }
    expect(report.snapshot.sha256).toBe(sha256(Buffer.from(JSON.stringify(report.snapshot.dependencies))));
  });

  it('requires three current independent reviews covering every pack exactly once', () => {
    const report = readJson(path.join(sourceDir, reportName));
    expect(report.independentReviewEvidence).toHaveLength(3);
    const coverage = report.independentReviewEvidence.flatMap((evidence) => evidence.packs);
    expect(coverage).toHaveLength(22);
    expect(new Set(coverage).size).toBe(22);
    expect(report.independentReviewEvidence.every((evidence) =>
      evidence.reviewedAt === '2026-07-18'
      && /^pass/i.test(evidence.verdict)
      && /OpenAI Codex independent/i.test(evidence.reviewer)
      && evidence.automatedItemsReviewed > 0
      && evidence.manuallyAdjudicatedItems > 0)).toBe(true);
  });

  it('catalogs every learner-visible pack and library source with readable context', () => {
    const catalog = readJson(path.join(sourceDir, 'reference_catalog.json'));
    const packFiles = fs.readdirSync(sourceDir).filter((name) => name.endsWith('_pack.json') && !name.startsWith('eppp_'));
    const references = new Set();
    for (const file of packFiles) {
      collectHttps(readJson(path.join(sourceDir, file)), references);
      collectHttps(readJson(path.join(sourceDir, file.replace('_pack.json', '_learning_library.json'))), references);
    }
    for (const reference of references) {
      expect(catalog[reference], reference).toBeTruthy();
      expect(catalog[reference].title.length, reference).toBeGreaterThanOrEqual(12);
      expect(catalog[reference].organization.length, reference).toBeGreaterThanOrEqual(4);
      expect(catalog[reference].summary.length, reference).toBeGreaterThanOrEqual(40);
      expect(catalog[reference].credibility.length, reference).toBeGreaterThanOrEqual(40);
    }
  });

  it('keeps corrected credential packs and libraries free of known foreign-scope markers', () => {
    const rules = {
      plt_5_9_5623: [/\b5621\b/, /\b5622\b/, /\b5624\b/, /\bK\s*[\-–]\s*6\b/i],
      plt_7_12_5624: [/\b5621\b/, /\b5622\b/, /\b5623\b/, /\bK\s*[\-–]\s*6\b/i],
      plt_early_childhood_5621: [/\b5622\b/, /\b5623\b/, /\b5624\b/, /\bK\s*[\-\u2013]\s*6\b/i],
      special_education_behavior_emotional_5372: [/\b5383\b/, /learning-disabilities specialists?/i],
      special_education_intellectual_disabilities_5322: [/\b5383\b/, /learning-disabilities specialists?/i],
      special_education_early_childhood_5692: [/\byoung childs\b/i, /\ba early\b/i, /early intervention or school program/i, /\bIFSP or IEP\b/i],
      teaching_reading_5205: [/\b5302\b/, /\breading specialists?\b/i, /\bliteracy specialists?\b/i, /phoneme\?grapheme/i, /measure\?s/i],
    };
    for (const [stem, patterns] of Object.entries(rules)) {
      const text = fs.readFileSync(path.join(sourceDir, stem + '_pack.json'), 'utf8')
        + fs.readFileSync(path.join(sourceDir, stem + '_learning_library.json'), 'utf8');
      patterns.forEach((pattern) => expect(text, `${stem}: ${pattern}`).not.toMatch(pattern));
    }
  });

  it('fails the shared release build closed on catalog, audit, and suite QA', () => {
    const builder = fs.readFileSync(path.join(root, 'dev-tools', 'build_test_prep_hub_release.cjs'), 'utf8');
    expect(builder).toContain('build_test_prep_reference_catalog.cjs');
    expect(builder).toContain('write_test_prep_assistant_review.cjs');
    expect(builder).toContain('review_non_eppp_against_eppp.cjs');
    const correctionCall = builder.indexOf('execFileSync(process.execPath,[applyTestPrepSourceReviewCorrectionsPath]');
    const postCorrectionQaCall = builder.indexOf('for (const qaPath of postCorrectionQaPaths)');
    const sourceBindingCall = builder.indexOf('execFileSync(process.execPath,[bindNonEpppNativeQaPath]');
    const additionsCall = builder.indexOf('execFileSync(process.execPath,[applyTestPrepIndependentAdditionsPath]');
    const expansionCall = builder.indexOf('execFileSync(process.execPath,[expandTestPrepPacksPath]');
    const postExpansionQaCall = builder.indexOf('for (const qaPath of postExpansionQaPaths)');
    const finalBindingCall = builder.lastIndexOf('execFileSync(process.execPath,[bindNonEpppNativeQaPath]');
    const catalogCall = builder.indexOf('execFileSync(process.execPath,[buildTestPrepReferenceCatalogPath]');
    const assistantAuditCall = builder.indexOf('execFileSync(process.execPath,[writeTestPrepAssistantReviewPath]');
    const suiteQaCall = builder.indexOf('execFileSync(process.execPath,[reviewNonEpppAgainstEpppPath]');
    const verifyCall = builder.indexOf('execFileSync(process.execPath,[verifyTestPrepAssistantReviewPath]');
    expect([correctionCall, postCorrectionQaCall, sourceBindingCall, additionsCall, expansionCall, postExpansionQaCall, finalBindingCall, catalogCall, assistantAuditCall, suiteQaCall, verifyCall].every((index) => index >= 0)).toBe(true);
    expect(correctionCall).toBeLessThan(postCorrectionQaCall);
    expect(postCorrectionQaCall).toBeLessThan(sourceBindingCall);
    expect(sourceBindingCall).toBeLessThan(additionsCall);
    expect(additionsCall).toBeLessThan(expansionCall);
    expect(expansionCall).toBeLessThan(postExpansionQaCall);
    expect(postExpansionQaCall).toBeLessThan(finalBindingCall);
    expect(finalBindingCall).toBeLessThan(catalogCall);
    expect(catalogCall).toBeLessThan(assistantAuditCall);
    expect(assistantAuditCall).toBeLessThan(suiteQaCall);
    expect(suiteQaCall).toBeLessThan(verifyCall);
  });
});