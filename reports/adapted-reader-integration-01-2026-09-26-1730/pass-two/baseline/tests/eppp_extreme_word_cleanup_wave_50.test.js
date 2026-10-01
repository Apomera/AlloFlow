import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourceBankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployBankPath = path.join(root, 'desktop/web-app/public', 'test_prep', 'eppp_native_items.json');
const data = createRequire(import.meta.url)('../dev-tools/eppp_extreme_word_cleanup_wave_50_data.cjs');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

describe('EPPP extreme-word cleanup wave 50', () => {
  it('applies all twenty-seven answer-tell repairs with preserved answer positions', () => {
    const bank = readJson(sourceBankPath);
    const byId = new Map(bank.map((item) => [item.id, item]));
    expect(data.revisions).toHaveLength(27);
    expect(new Set(data.revisions.map((revision) => revision.id)).size).toBe(27);
    for (const revision of data.revisions) {
      const item = byId.get(revision.id);
      expect(item).toBeTruthy();
      expect(item.answerIndex).toBe(revision.answerIndex);
      expect(item.choices).toEqual(revision.choices);
      expect(item.choices[item.answerIndex]).toBe(revision.key);
      expect(item.extremeWordCleanupWave).toBe(data.reviewWave);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales[item.answerIndex]).toBe(item.rationale);
    }
  });

  it('clears extreme-word, lexical, duplicate, and feedback findings globally', () => {
    const distractor = readJson(path.join(root, 'test_prep/eppp_distractor_quality_diagnostics.json'));
    const feedback = readJson(path.join(root, 'test_prep/eppp_option_feedback_diagnostics.json'));
    const qa = readJson(path.join(root, 'test_prep/eppp_native_qa.json'));
    expect(distractor.asymmetricExtremeDistractors).toEqual([]);
    expect(distractor.uniqueKeyStemLexicalLeakage).toEqual([]);
    expect(distractor.semanticConceptDuplicates.pairs).toEqual([]);
    expect(feedback.optionFindings).toEqual([]);
    expect(feedback.summary.itemsWithWarnings).toBe(0);
    expect(feedback.summary.incorrectOptionsWithWarnings).toBe(0);
    expect(qa.summary).toMatchObject({ totalItems: 1500, passedItems: 1500, reviewRequiredItems: 0, status: 'pass' });
  });

  it('keeps source and deploy banks plus the wave audit synchronized', () => {
    const source = fs.readFileSync(sourceBankPath, 'utf8');
    expect(fs.readFileSync(deployBankPath, 'utf8')).toBe(source);
    const audit = readJson(path.join(root, 'test_prep/eppp_extreme_word_cleanup_audit_wave_50.json'));
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 27,
      extremeCandidatesBefore: 27,
      extremeCandidatesAfter: 0,
      lexicalCandidatesAfter: 0,
      duplicatePairsAfter: 0,
      status: 'pass',
    });
  });
});
