import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const wave = require('../dev-tools/eppp_native_quality_wave_49_data.cjs');

describe('EPPP final feedback and distractor cleanup wave 49', () => {
  it('publishes every cleanup revision with its answer position preserved', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const byId = new Map(bank.map((item) => [item.id, item]));
    expect(wave.revisions).toHaveLength(52);
    expect(new Set(wave.revisions.map((revision) => revision.id)).size).toBe(52);
    for (const revision of wave.revisions) {
      const item = byId.get(revision.id);
      expect(item).toBeTruthy();
      expect(item.answerIndex).toBe(revision.answerIndex);
      expect(item.prompt).toBe(revision.prompt);
      expect(item.choices[item.answerIndex]).toBe(revision.key);
      expect(item.wordingCleanupWave).toBe(wave.reviewWave);
      expect(item.choiceRationales[item.answerIndex]).toBe(item.rationale);
    }
  });

  it('clears all requested warning families across the full bank', () => {
    const distractors = json('test_prep/eppp_distractor_quality_diagnostics.json');
    const feedback = json('test_prep/eppp_option_feedback_diagnostics.json');
    expect(distractors.uniqueKeyStemLexicalLeakage).toEqual([]);
    expect(distractors.semanticConceptDuplicates.pairs).toEqual([]);
    expect(feedback.optionFindings).toEqual([]);
    expect(feedback.summary).toMatchObject({
      itemsWithWarnings: 0,
      incorrectOptionsWithWarnings: 0,
      insufficientDetailOptions: 0,
      genericTemplateOptions: 0,
      choiceRestatementOptions: 0,
      fullKeyEchoOptions: 0,
    });
  });

  it('records the zero-warning audit and synchronized runtime artifacts', () => {
    const audit = json('test_prep/eppp_question_quality_audit_wave_49.json');
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 52,
      duplicatePairsBefore: 39,
      lexicalFindingsBefore: 13,
      selectedDistractorWarningsAfter: 0,
      selectedFeedbackWarningsAfter: 0,
      status: 'pass',
    });
    expect(audit.summary.distractorWarningsAfter.uniqueKeyStemLexicalLeakageCandidates).toBe(0);
    expect(audit.summary.distractorWarningsAfter.semanticConceptDuplicatePairs).toBe(0);
    expect(audit.summary.distractorWarningsAfter.semanticConceptDuplicateClusters).toBe(0);
    expect(audit.summary.feedbackWarningsAfter.itemsWithWarnings).toBe(0);
    expect(audit.summary.feedbackWarningsAfter.incorrectOptionsWithWarnings).toBe(0);
    expect(read('desktop/web-app/public/test_prep/eppp_native_items.json')).toBe(read('test_prep/eppp_native_items.json'));
    expect(read('desktop/web-app/public/test_prep/eppp_part_one_pack.json')).toBe(read('test_prep/eppp_part_one_pack.json'));
    expect(read('desktop/web-app/public/test_prep/eppp_question_quality_audit_wave_49.json')).toBe(read('test_prep/eppp_question_quality_audit_wave_49.json'));
  });

  it('keeps wave 49 before the extreme-word and challenge waves on both replay paths', () => {
    const builder = read('dev-tools/build_eppp_1500_expansion.cjs');
    const i48 = builder.indexOf('repair_eppp_native_quality_wave_48.cjs');
    const i49 = builder.indexOf('repair_eppp_native_quality_wave_49.cjs', i48);
    expect(i49).toBeGreaterThan(i48);
    expect(builder).toContain("existingBank.some((item) => item.applicationRewriteWave === 'eppp-application-rewrite-wave-53')");
  });
});
