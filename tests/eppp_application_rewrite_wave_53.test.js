import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourceBankPath = path.join(root, 'test_prep/eppp_native_items.json');
const deployBankPath = path.join(root, 'desktop/web-app/public', 'test_prep/eppp_native_items.json');
const data = createRequire(import.meta.url)('../dev-tools/eppp_application_rewrite_wave_53_data.cjs');
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const words = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

describe('EPPP applied rewrite wave 53', () => {
  it('converts twenty-four foundation items into applied intermediate decisions', () => {
    const bank = readJson(sourceBankPath);
    const byId = new Map(bank.map((item) => [item.id, item]));
    expect(data.revisions).toHaveLength(24);
    expect(new Set(data.revisions.map((revision) => revision.id)).size).toBe(24);
    for (const revision of data.revisions) {
      const item = byId.get(revision.id);
      expect(item).toBeTruthy();
      expect(item.answerIndex).toBe(revision.answerIndex);
      expect(item.prompt).toBe(revision.prompt);
      expect(item.choices).toEqual(revision.choices);
      expect(item.rationale).toBe(revision.rationale);
      const expectedFeedback = revision.choiceRationales.slice();
      expectedFeedback[revision.answerIndex] = revision.rationale;
      expect(item.choiceRationales).toEqual(expectedFeedback);
      expect(item.applicationRewriteWave).toBe(data.reviewWave);
      expect(item.applicationRewritePriorDifficulty).toBe('foundation');
      expect(item.difficulty).toBe('intermediate');
      expect(item.cognitiveProcess).toBe('application');
    }
  });

  it('keeps every domain represented and all answer positions frozen', () => {
    const bank = readJson(sourceBankPath);
    const byId = new Map(bank.map((item) => [item.id, item]));
    const domainCounts = data.revisions.reduce((counts, revision) => {
      const domain = byId.get(revision.id).domainId;
      counts.set(domain, (counts.get(domain) || 0) + 1);
      return counts;
    }, new Map());
    expect([...domainCounts.values()]).toEqual(Array(8).fill(3));
    expect(data.revisions.map((revision) => revision.answerIndex).every(
      (answerIndex) => Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < 4,
    )).toBe(true);
  });

  it('keeps option explanations concise and clears all live warning queues', () => {
    const bank = readJson(sourceBankPath);
    const selected = new Set(data.revisions.map((revision) => revision.id));
    const incorrect = bank
      .filter((item) => selected.has(item.id))
      .flatMap((item) => item.choiceRationales.filter((_text, index) => index !== item.answerIndex));
    expect(incorrect).toHaveLength(72);
    expect(incorrect.every((text) => words(text) <= 24)).toBe(true);

    const distractor = readJson(path.join(root, 'test_prep/eppp_distractor_quality_diagnostics.json'));
    const feedback = readJson(path.join(root, 'test_prep/eppp_option_feedback_diagnostics.json'));
    const qa = readJson(path.join(root, 'test_prep/eppp_native_qa.json'));
    expect(distractor.summary).toMatchObject({
      totalItems: 1500,
      uniqueKeyStemLexicalLeakageCandidates: 0,
      asymmetricExtremeDistractorCandidates: 0,
      advancedDirectRecallCandidates: 0,
      semanticConceptDuplicatePairs: 0,
      semanticConceptDuplicateClusters: 0,
      priorityDocketItems: 0,
    });
    expect(feedback.summary).toMatchObject({
      itemsWithWarnings: 0,
      incorrectOptionsWithWarnings: 0,
      priorityDocketItems: 0,
    });
    expect(qa.summary).toMatchObject({
      totalItems: 1500,
      passedItems: 1500,
      reviewRequiredItems: 0,
      status: 'pass',
    });
  });

  it('keeps source/deploy banks and the wave audit synchronized', () => {
    const source = fs.readFileSync(sourceBankPath, 'utf8');
    expect(fs.readFileSync(deployBankPath, 'utf8')).toBe(source);
    const auditPath = path.join(root, 'test_prep/eppp_application_rewrite_audit_wave_53.json');
    const deployAuditPath = path.join(root, 'desktop/web-app/public/test_prep/eppp_application_rewrite_audit_wave_53.json');
    const auditText = fs.readFileSync(auditPath, 'utf8');
    expect(fs.readFileSync(deployAuditPath, 'utf8')).toBe(auditText);
    const audit = JSON.parse(auditText);
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 24,
      duplicatePairRepairs: 0,
      foundationToIntermediate: 24,
      applicationCognitiveProcess: 24,
      incorrectFeedbackOptionsReviewed: 72,
      lexicalCandidatesAfter: 0,
      extremeCandidatesAfter: 0,
      advancedDirectRecallCandidatesAfter: 0,
      duplicatePairsAfter: 0,
      status: 'pass',
    });
    expect(audit.summary.maximumIncorrectFeedbackWordsAfter).toBeLessThanOrEqual(24);
  });
});
