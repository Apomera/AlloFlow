import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const wave = require('../dev-tools/eppp_native_quality_wave_25_data.cjs');
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;

describe('EPPP question-quality repair wave 25', () => {
  it('covers all eight domains and preserves every keyed position', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const byId = new Map(bank.map((item) => [item.id, item]));
    const domains = new Set();

    expect(wave.revisions).toHaveLength(8);
    for (const revision of wave.revisions) {
      const item = byId.get(revision.id);
      expect(item).toBeTruthy();
      expect(item.answerIndex).toBe(revision.expectedAnswerIndex);
      expect(item.prompt).toBe(revision.prompt);
      expect(item.choices).toEqual(revision.choices);
      expect(item.rationale).toBe(revision.rationale);
      expect(item.choiceRationales).toEqual(revision.choiceRationales);
      expect(item.wordingReviewWave).toBe(wave.reviewWave);
      expect(item.optionFeedbackRefinementWave).toBe(wave.reviewWave);
      domains.add(item.domainId);
    }
    expect(domains.size).toBe(8);
  });

  it('uses parallel plausible choices without the known absolute-word answer cues', () => {
    for (const revision of wave.revisions) {
      expect(revision.choices).toHaveLength(4);
      expect(new Set(revision.choices.map(normalize)).size).toBe(4);
      expect(revision.choices.some((choice) => extremeCuePattern.test(choice))).toBe(false);
      expect(revision.cognitiveProcess === 'application' || revision.cognitiveProcess === 'analysis').toBe(true);
      expect(revision.distractorDesign).toHaveLength(3);
    }

    const diagnostics = json('test_prep/eppp_distractor_quality_diagnostics.json');
    const ids = new Set(wave.revisions.map((revision) => revision.id));
    const warnedIds = new Set([
      ...diagnostics.uniqueKeyStemLexicalLeakage.map((entry) => entry.id),
      ...diagnostics.asymmetricExtremeDistractors.map((entry) => entry.id),
      ...diagnostics.advancedDirectRecall.map((entry) => entry.id),
      ...diagnostics.semanticConceptDuplicates.pairs.flatMap((pair) => [pair.leftId, pair.rightId]),
    ]);
    expect([...ids].filter((id) => warnedIds.has(id))).toEqual([]);
  });

  it('keeps explanations concise, option-specific, and free of repeated answer text', () => {
    const feedbackDiagnostics = json('test_prep/eppp_option_feedback_diagnostics.json');
    const ids = new Set(wave.revisions.map((revision) => revision.id));

    for (const revision of wave.revisions) {
      expect(revision.choiceRationales).toHaveLength(4);
      expect(revision.choiceRationales[revision.expectedAnswerIndex]).toBe(revision.rationale);
      revision.choiceRationales.forEach((feedback, optionIndex) => {
        expect(wordCount(feedback)).toBeGreaterThanOrEqual(16);
        expect(wordCount(feedback)).toBeLessThanOrEqual(60);
        expect(genericFeedbackPattern.test(feedback)).toBe(false);
        if (optionIndex !== revision.expectedAnswerIndex) {
          expect(normalize(feedback).startsWith(normalize(revision.choices[optionIndex]))).toBe(false);
          expect(normalize(feedback).includes(normalize(revision.choices[revision.expectedAnswerIndex]))).toBe(false);
        }
      });
    }
    expect(feedbackDiagnostics.optionFindings.filter((finding) => ids.has(finding.id))).toEqual([]);
  });

  it('keeps canonical, deploy, and runtime copies synchronized with a passing audit', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_native_items.json'))
      .toBe(read('test_prep/eppp_native_items.json'));
    expect(read('desktop/web-app/public/test_prep/eppp_part_one_pack.json'))
      .toBe(read('test_prep/eppp_part_one_pack.json'));

    const bankById = new Map(json('test_prep/eppp_native_items.json').map((item) => [item.id, item]));
    const packById = new Map(json('test_prep/eppp_part_one_pack.json').items.map((item) => [item.id, item]));
    for (const revision of wave.revisions) expect(packById.get(revision.id)).toEqual(bankById.get(revision.id));

    const audit = json('test_prep/eppp_question_quality_audit_wave_25.json');
    expect(audit.summary).toMatchObject({
      rewrittenItems: 8,
      domainsCovered: 8,
      keyPositionsPreserved: 8,
      selectedDistractorWarningsAfter: 0,
      selectedFeedbackWarningsAfter: 0,
      status: 'pass',
    });
    expect(audit.summary.distractorWarningsAfter.asymmetricExtremeDistractorCandidates)
      .toBeLessThan(audit.summary.distractorWarningsBefore.asymmetricExtremeDistractorCandidates);
    expect(audit.summary.feedbackWarningsAfter.incorrectOptionsWithWarnings)
      .toBeLessThan(audit.summary.feedbackWarningsBefore.incorrectOptionsWithWarnings);
    expect(read('desktop/web-app/public/test_prep/eppp_question_quality_audit_wave_25.json'))
      .toBe(read('test_prep/eppp_question_quality_audit_wave_25.json'));
  });

  it('replays wave 25 after the broad feedback campaign so rebuilds retain it', () => {
    const builder = read('dev-tools/build_eppp_1500_expansion.cjs');
    const feedbackCampaignIndex = builder.indexOf('runFeedbackHalvingCampaign();');
    const wave25Index = builder.indexOf("runReplayScript('./repair_eppp_native_quality_wave_25.cjs');");
    expect(feedbackCampaignIndex).toBeGreaterThan(-1);
    expect(wave25Index).toBeGreaterThan(feedbackCampaignIndex);
  });
});
