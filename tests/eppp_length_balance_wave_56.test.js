import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourceBankPath = path.join(root, 'test_prep/eppp_native_items.json');
const deployBankPath = path.join(root, 'desktop/web-app/public', 'test_prep/eppp_native_items.json');
const require = createRequire(import.meta.url);
const data = require('../dev-tools/eppp_length_balance_wave_56/index.cjs');
const { warningCodes } = require('../dev-tools/non_eppp_warning_checks.cjs');
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

describe('EPPP length-balance wave 56', () => {
  it('balances 81 strictly unpinned items and drops EPPP Part 1 below 29% key=longest with zero warnings on touched items', () => {
    const bank = readJson(sourceBankPath);
    const byId = new Map(bank.map((item) => [item.id, item]));
    expect(data.revisions).toHaveLength(81);
    expect(new Set(data.revisions.map((revision) => revision.id)).size).toBe(81);

    for (const revision of data.revisions) {
      const item = byId.get(revision.id);
      expect(item, revision.id).toBeTruthy();
      expect(item.answerIndex, revision.id).toBe(revision.answerIndex);
      expect(item.choices, revision.id).toEqual(revision.choices);
      if (revision.prompt) expect(item.prompt, revision.id).toBe(revision.prompt);
      expect(item.lengthBalanceWave, revision.id).toBe(data.reviewWave);
      const lengths = item.choices.map((choice) => choice.length);
      const keyLength = lengths[item.answerIndex];
      const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
      expect(keyLength, revision.id).toBeLessThan(longestDistractor);
      expect(warningCodes(item), revision.id).toEqual([]);
    }

    let keyIsLongestCount = 0;
    for (const item of bank) {
      const lengths = item.choices.map((choice) => String(choice || '').length);
      const keyLength = lengths[item.answerIndex];
      const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
      if (keyLength >= longestDistractor) keyIsLongestCount += 1;
    }
    expect(keyIsLongestCount).toBeLessThan(430);
  });

  it('keeps zero distractor/feedback warnings, full native QA pass, and synced wave 56 audit', () => {
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

    const auditPath = path.join(root, 'test_prep/eppp_length_balance_audit_wave_56.json');
    const deployAuditPath = path.join(root, 'desktop/web-app/public/test_prep/eppp_length_balance_audit_wave_56.json');
    const auditText = fs.readFileSync(auditPath, 'utf8');
    expect(fs.readFileSync(deployAuditPath, 'utf8')).toBe(auditText);
    expect(JSON.parse(auditText).summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 81,
      keyIsLongestBefore: 498,
      keyIsLongestAfter: 426,
      status: 'pass',
    });
  });
});
