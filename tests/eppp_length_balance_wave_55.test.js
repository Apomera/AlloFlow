import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourceBankPath = path.join(root, 'test_prep/eppp_native_items.json');
const deployBankPath = path.join(root, 'desktop/web-app/public', 'test_prep/eppp_native_items.json');
const data = createRequire(import.meta.url)('../dev-tools/eppp_length_balance_wave_55/index.cjs');
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

describe('EPPP length-balance wave 55', () => {
  it('balances 63 additional unpinned items and drops EPPP Part 1 below one-third key=longest', () => {
    const bank = readJson(sourceBankPath);
    const byId = new Map(bank.map((item) => [item.id, item]));
    expect(data.revisions).toHaveLength(63);
    expect(new Set(data.revisions.map((revision) => revision.id)).size).toBe(63);

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
    expect(keyIsLongestCount).toBeLessThan(500);
  });

  it('keeps zero distractor/feedback warnings, full native QA pass, and synced wave 55 audit', () => {
    const distractor = readJson(path.join(root, 'test_prep/eppp_distractor_quality_diagnostics.json'));
    const feedback = readJson(path.join(root, 'test_prep/eppp_option_feedback_diagnostics.json'));
    const qa = readJson(path.join(root, 'test_prep/eppp_native_qa.json'));
    const source = fs.readFileSync(sourceBankPath, 'utf8');
    expect(fs.readFileSync(deployBankPath, 'utf8')).toBe(source);

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

    const auditPath = path.join(root, 'test_prep/eppp_length_balance_audit_wave_55.json');
    const deployAuditPath = path.join(root, 'desktop/web-app/public/test_prep/eppp_length_balance_audit_wave_55.json');
    const auditText = fs.readFileSync(auditPath, 'utf8');
    expect(fs.readFileSync(deployAuditPath, 'utf8')).toBe(auditText);
    expect(JSON.parse(auditText).summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 63,
      keyIsLongestBefore: 561,
      keyIsLongestAfter: 498,
      status: 'pass',
    });
  });
});
