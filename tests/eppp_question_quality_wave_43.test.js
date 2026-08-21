import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const wave = require('../dev-tools/eppp_native_quality_wave_43_data.cjs');
const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const words = (v) => String(v || '').trim().split(/\s+/).filter(Boolean).length;
const extreme = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;

describe('EPPP expanded quality wave 43', () => {
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
    const audit = json('test_prep/eppp_question_quality_audit_wave_43.json');
    expect(audit.summary).toMatchObject({ rewrittenItems: 24, domainsCovered: 8, difficultyRetieredItems: 20, applicationItems: 12, analysisItems: 12, keyPositionsPreserved: 24, optionSpecificExplanations: 96, selectedDistractorWarningsAfter: 0, selectedFeedbackWarningsAfter: 0, status: 'pass' });
    expect(audit.summary.distractorWarningsAfter.uniqueKeyStemLexicalLeakageCandidates).toBe(38);
    expect(audit.summary.distractorWarningsAfter.asymmetricExtremeDistractorCandidates).toBe(43);
    expect(audit.summary.distractorWarningsAfter.advancedDirectRecallCandidates).toBe(1);
    expect(audit.summary.distractorWarningsAfter.semanticConceptDuplicatePairs).toBe(51);
    expect(audit.summary.distractorWarningsAfter.semanticConceptDuplicateClusters).toBe(33);
    expect(audit.summary.feedbackWarningsAfter.itemsWithWarnings).toBe(428);
    expect(audit.summary.feedbackWarningsAfter.incorrectOptionsWithWarnings).toBe(1191);
    expect(audit.summary.feedbackWarningsAfter.insufficientDetailOptions).toBe(578);
    expect(audit.summary.feedbackWarningsAfter.genericTemplateOptions).toBe(561);
    expect(audit.summary.feedbackWarningsAfter.choiceRestatementOptions).toBe(135);
    expect(audit.summary.feedbackWarningsAfter.fullKeyEchoOptions).toBe(61);
    expect(audit.summary.feedbackWarningsAfter.currentWaveOptionsWithWarnings).toBe(0);
    expect(read('desktop/web-app/public/test_prep/eppp_native_items.json')).toBe(read('test_prep/eppp_native_items.json'));
    expect(read('desktop/web-app/public/test_prep/eppp_part_one_pack.json')).toBe(read('test_prep/eppp_part_one_pack.json'));
    expect(read('desktop/web-app/public/test_prep/eppp_question_quality_audit_wave_43.json')).toBe(read('test_prep/eppp_question_quality_audit_wave_43.json'));
  });

  it('replays after wave 42', () => {
    const builder = read('dev-tools/build_eppp_1500_expansion.cjs');
    const i42 = builder.indexOf('repair_eppp_native_quality_wave_42.cjs');
    const i43 = builder.indexOf('repair_eppp_native_quality_wave_43.cjs');
    expect(i43).toBeGreaterThan(i42);
  });
});
