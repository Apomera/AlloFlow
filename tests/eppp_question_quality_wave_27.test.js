import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const wave = require('../dev-tools/eppp_native_quality_wave_27_data.cjs');
const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const words = (v) => String(v || '').trim().split(/\s+/).filter(Boolean).length;
const extreme = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;

describe('EPPP large-batch quality wave 27', () => {
  it('publishes two keyed, applied-or-analytic revisions in every domain', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const byId = new Map(bank.map((item) => [item.id, item]));
    const domains = new Map();
    expect(wave.revisions).toHaveLength(16);
    for (const revision of wave.revisions) {
      const item = byId.get(revision.id);
      expect(item.answerIndex).toBe(revision.expectedAnswerIndex);
      expect(item.prompt).toBe(revision.prompt);
      expect(item.choices).toEqual(revision.choices);
      expect(item.difficulty).toBe(revision.targetDifficulty);
      expect(['application', 'analysis']).toContain(item.cognitiveProcess);
      expect(item.wordingReviewWave).toBe(wave.reviewWave);
      domains.set(item.domainId, (domains.get(item.domainId) || 0) + 1);
    }
    expect([...domains.values()]).toEqual(Array(8).fill(2));
  });

  it('clears clue diagnostics and supplies concise misconception-specific feedback', () => {
    const distractors = json('test_prep/eppp_distractor_quality_diagnostics.json');
    const feedback = json('test_prep/eppp_option_feedback_diagnostics.json');
    const ids = new Set(wave.revisions.map((revision) => revision.id));
    const warned = new Set([
      ...distractors.uniqueKeyStemLexicalLeakage.map((x) => x.id),
      ...distractors.asymmetricExtremeDistractors.map((x) => x.id),
      ...distractors.advancedDirectRecall.map((x) => x.id),
      ...distractors.semanticConceptDuplicates.pairs.flatMap((x) => [x.leftId, x.rightId]),
    ]);
    expect([...ids].filter((id) => warned.has(id))).toEqual([]);
    expect(feedback.optionFindings.filter((finding) => ids.has(finding.id))).toEqual([]);

    for (const revision of wave.revisions) {
      expect(revision.prompt).not.toMatch(/^complete the statement/i);
      expect(revision.choices.some((choice) => extreme.test(choice))).toBe(false);
      const rationales = Array(4);
      rationales[revision.expectedAnswerIndex] = revision.rationale;
      for (const [index, text] of Object.entries(revision.feedback)) rationales[Number(index)] = text;
      rationales.forEach((text, index) => {
        expect(words(text)).toBeGreaterThanOrEqual(16);
        expect(words(text)).toBeLessThanOrEqual(60);
        if (index !== revision.expectedAnswerIndex) {
          expect(norm(text).startsWith(norm(revision.choices[index]))).toBe(false);
          expect(norm(text).includes(norm(revision.choices[revision.expectedAnswerIndex]))).toBe(false);
        }
      });
    }
  });

  it('records the larger-batch challenge gains and synchronized runtime artifacts', () => {
    const audit = json('test_prep/eppp_question_quality_audit_wave_27.json');
    expect(audit.summary).toMatchObject({ rewrittenItems: 16, domainsCovered: 8, keyPositionsPreserved: 16, optionSpecificExplanations: 64, selectedDistractorWarningsAfter: 0, selectedFeedbackWarningsAfter: 0, status: 'pass' });
    expect(audit.summary.difficultyRetieredItems).toBe(8);
    expect(audit.summary.distractorWarningsAfter.asymmetricExtremeDistractorCandidates).toBeLessThan(audit.summary.distractorWarningsBefore.asymmetricExtremeDistractorCandidates);
    expect(audit.summary.feedbackWarningsAfter.incorrectOptionsWithWarnings).toBeLessThan(audit.summary.feedbackWarningsBefore.incorrectOptionsWithWarnings);
    expect(read('desktop/web-app/public/test_prep/eppp_native_items.json')).toBe(read('test_prep/eppp_native_items.json'));
    expect(read('desktop/web-app/public/test_prep/eppp_part_one_pack.json')).toBe(read('test_prep/eppp_part_one_pack.json'));
    expect(read('desktop/web-app/public/test_prep/eppp_question_quality_audit_wave_27.json')).toBe(read('test_prep/eppp_question_quality_audit_wave_27.json'));
  });

  it('replays after waves 25 and 26', () => {
    const builder = read('dev-tools/build_eppp_1500_expansion.cjs');
    const i25 = builder.indexOf("repair_eppp_native_quality_wave_25.cjs");
    const i26 = builder.indexOf("repair_eppp_native_quality_wave_26.cjs");
    const i27 = builder.indexOf("repair_eppp_native_quality_wave_27.cjs");
    expect(i26).toBeGreaterThan(i25);
    expect(i27).toBeGreaterThan(i26);
  });
});
