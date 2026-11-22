import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourceBankPath = path.join(root, 'test_prep/eppp_native_items.json');
const deployBankPath = path.join(root, 'desktop/web-app/public', 'test_prep/eppp_native_items.json');
const data = createRequire(import.meta.url)('../dev-tools/eppp_length_balance_wave_54/index.cjs');
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

describe('EPPP length-balance wave 54', () => {
  it('balances 168 unpinned items without drifting answer keys or introducing any length tell', () => {
    const bank = readJson(sourceBankPath);
    const byId = new Map(bank.map((item) => [item.id, item]));
    expect(data.revisions).toHaveLength(168);
    expect(new Set(data.revisions.map((revision) => revision.id)).size).toBe(168);

    for (const revision of data.revisions) {
      const item = byId.get(revision.id);
      expect(item, revision.id).toBeTruthy();
      expect(item.answerIndex, revision.id).toBe(revision.answerIndex);
      expect(item.choices, revision.id).toEqual(revision.choices);
      expect(item.lengthBalanceWave, revision.id).toBe(data.reviewWave);
      const lengths = item.choices.map((choice) => choice.length);
      const keyLength = lengths[item.answerIndex];
      const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
      expect(keyLength, revision.id).toBeLessThan(longestDistractor);
    }

    let keyIsLongestCount = 0;
    for (const item of bank) {
      const lengths = item.choices.map((choice) => String(choice || '').length);
      const keyLength = lengths[item.answerIndex];
      const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
      if (keyLength >= longestDistractor) keyIsLongestCount += 1;
    }
    expect(keyIsLongestCount / bank.length).toBeLessThan(0.4);
  });

  it('preserves zero distractor/feedback diagnostic warnings and full native QA pass', () => {
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

  it('keeps source/deploy banks and the wave 54 audit synchronized', () => {
    const source = fs.readFileSync(sourceBankPath, 'utf8');
    expect(fs.readFileSync(deployBankPath, 'utf8')).toBe(source);
    const auditPath = path.join(root, 'test_prep/eppp_length_balance_audit_wave_54.json');
    const deployAuditPath = path.join(root, 'desktop/web-app/public/test_prep/eppp_length_balance_audit_wave_54.json');
    const auditText = fs.readFileSync(auditPath, 'utf8');
    expect(fs.readFileSync(deployAuditPath, 'utf8')).toBe(auditText);
    const audit = JSON.parse(auditText);
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 168,
      keyIsLongestBefore: 729,
      extremeCandidatesAfter: 0,
      lexicalCandidatesAfter: 0,
      duplicatePairsAfter: 0,
      nativeQaPassedItems: 1500,
      status: 'pass',
    });
    expect(audit.summary.keyIsLongestAfter).toBeLessThan(600);
  });
});
