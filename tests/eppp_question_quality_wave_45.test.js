import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const wave = require('../dev-tools/eppp_native_quality_wave_45_data.cjs');
const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const words = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;
const extreme = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;

describe('EPPP expanded quality wave 45', () => {
  it('publishes three keyed, applied-or-analytic revisions in every domain', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const byId = new Map(bank.map((item) => [item.id, item]));
    const domains = new Map();
    expect(wave.revisions).toHaveLength(24);
    for (const revision of wave.revisions) {
      const item = byId.get(revision.id);
      expect(item).toBeTruthy();
      expect(item.answerIndex).toBe(revision.expectedAnswerIndex);
      expect(item.prompt).toBe(revision.prompt);
      expect(item.choices).toEqual(revision.choices);
      expect(item.difficulty).toBe(revision.targetDifficulty);
      expect(['application', 'analysis']).toContain(item.cognitiveProcess);
      expect(item.wordingReviewWave).toBe(wave.reviewWave);
      domains.set(item.domainId, (domains.get(item.domainId) || 0) + 1);
    }
    expect([...domains.values()]).toEqual(Array(8).fill(3));
  });

  it('clears clue diagnostics and supplies concise, option-specific feedback', () => {
    const distractors = json('test_prep/eppp_distractor_quality_diagnostics.json');
    const feedback = json('test_prep/eppp_option_feedback_diagnostics.json');
    const ids = new Set(wave.revisions.map((revision) => revision.id));
    const warned = new Set([
      ...distractors.uniqueKeyStemLexicalLeakage.map((entry) => entry.id),
      ...distractors.asymmetricExtremeDistractors.map((entry) => entry.id),
      ...distractors.advancedDirectRecall.map((entry) => entry.id),
      ...distractors.semanticConceptDuplicates.pairs.flatMap((pair) => [pair.leftId, pair.rightId]),
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
        expect(text.length).toBeGreaterThanOrEqual(100);
        expect(words(text)).toBeGreaterThanOrEqual(16);
        expect(words(text)).toBeLessThanOrEqual(60);
        if (index !== revision.expectedAnswerIndex) {
          expect(norm(text).startsWith(norm(revision.choices[index]))).toBe(false);
          expect(norm(text).includes(norm(revision.choices[revision.expectedAnswerIndex]))).toBe(false);
        }
      });
    }
  });

  it('records challenge gains and synchronized source, deploy, and runtime artifacts', () => {
    const audit = json('test_prep/eppp_question_quality_audit_wave_45.json');
    expect(audit.summary).toMatchObject({ rewrittenItems: 24, domainsCovered: 8, difficultyRetieredItems: 24, applicationItems: 13, analysisItems: 11, keyPositionsPreserved: 24, optionSpecificExplanations: 96, selectedDistractorWarningsAfter: 0, selectedFeedbackWarningsAfter: 0, status: 'pass' });
    expect(audit.summary.distractorWarningsAfter.uniqueKeyStemLexicalLeakageCandidates).toBe(31);
    expect(audit.summary.distractorWarningsAfter.asymmetricExtremeDistractorCandidates).toBe(33);
    expect(audit.summary.distractorWarningsAfter.advancedDirectRecallCandidates).toBe(1);
    expect(audit.summary.distractorWarningsAfter.semanticConceptDuplicatePairs).toBe(43);
    expect(audit.summary.distractorWarningsAfter.semanticConceptDuplicateClusters).toBe(31);
    expect(audit.summary.feedbackWarningsAfter.itemsWithWarnings).toBe(404);
    expect(audit.summary.feedbackWarningsAfter.incorrectOptionsWithWarnings).toBe(1125);
    expect(audit.summary.feedbackWarningsAfter.insufficientDetailOptions).toBe(557);
    expect(audit.summary.feedbackWarningsAfter.genericTemplateOptions).toBe(516);
    expect(audit.summary.feedbackWarningsAfter.choiceRestatementOptions).toBe(121);
    expect(audit.summary.feedbackWarningsAfter.fullKeyEchoOptions).toBe(61);
    expect(audit.summary.feedbackWarningsAfter.currentWaveOptionsWithWarnings).toBe(0);
    expect(read('desktop/web-app/public/test_prep/eppp_native_items.json')).toBe(read('test_prep/eppp_native_items.json'));
    expect(read('desktop/web-app/public/test_prep/eppp_part_one_pack.json')).toBe(read('test_prep/eppp_part_one_pack.json'));
    expect(read('desktop/web-app/public/test_prep/eppp_question_quality_audit_wave_45.json')).toBe(read('test_prep/eppp_question_quality_audit_wave_45.json'));
  });

  it('replays after wave 44', () => {
    const builder = read('dev-tools/build_eppp_1500_expansion.cjs');
    const i44 = builder.indexOf('repair_eppp_native_quality_wave_44.cjs');
    const i45 = builder.indexOf('repair_eppp_native_quality_wave_45.cjs', i44);
    expect(i45).toBeGreaterThan(i44);
  });
});
