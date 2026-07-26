import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import campaignData from '../dev-tools/eppp_feedback_halving_campaign_data.cjs';
import repair from '../dev-tools/repair_eppp_feedback_halving_campaign.cjs';
import deepManifest from '../dev-tools/eppp_distractor_halving_campaign_manifest.cjs';

const root = process.cwd();
const bank = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'eppp_native_items.json'), 'utf8'));
const diagnostics = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json'), 'utf8'));

describe('EPPP feedback-halving campaign', () => {
  it('retains the frozen 680-item baseline cohort deterministically after rollout', () => {
    const entries = campaignData.CURRENT_BASELINE_COHORT;
    expect(entries).toHaveLength(680);
    expect(entries.filter((entry) => entry.family === 'triple-ceg')).toHaveLength(378);
    expect(entries.filter((entry) => entry.family === 'triple-insufficient')).toHaveLength(240);
    expect(entries.filter((entry) => entry.family === 'triple-generic')).toHaveLength(62);
    expect(campaignData.sha256(entries.map((entry) => entry.id).sort().join('\n')))
      .toBe(campaignData.EXPECTED_FINGERPRINTS.selection);
    expect(campaignData.sha256(entries
      .map((entry) => entry.family + ':' + entry.id)
      .join('\n'))).toBe(campaignData.EXPECTED_FINGERPRINTS.composition);
  });

  it('excludes every frozen deep-rewrite id and materializes the 420-item feedback-only lane', () => {
    const excludedIds = new Set(deepManifest.CAMPAIGN_ITEM_IDS);
    const cohort = campaignData.buildCampaignData(
      bank,
      diagnostics,
      campaignData.POST_DEEP_BASELINE_COHORT,
    );
    expect(cohort.entries).toHaveLength(420);
    expect(cohort.entries.filter((entry) => entry.family === 'triple-ceg')).toHaveLength(286);
    expect(cohort.entries.filter((entry) => entry.family === 'triple-insufficient')).toHaveLength(134);
    expect(cohort.ids.some((id) => excludedIds.has(id))).toBe(false);
    expect(cohort.fingerprints).toEqual(campaignData.POST_DEEP_EXPECTED_FINGERPRINTS);
    expect(cohort.entries.map((entry) => ({
      id: entry.id,
      family: entry.family,
      expectedAnswerIndex: entry.expectedAnswerIndex,
    }))).toEqual(campaignData.POST_DEEP_BASELINE_COHORT);
  });

  it('keeps every combined projection below its halving ceiling', () => {
    for (const [metric, ceiling] of Object.entries(campaignData.TARGET_CEILINGS)) {
      expect(campaignData.COMBINED_PROJECTED_SNAPSHOT[metric]).toBeLessThanOrEqual(ceiling);
    }
    expect(campaignData.COMBINED_PROJECTED_SNAPSHOT).toEqual({
      itemsWithWarnings: 641,
      incorrectOptionsWithWarnings: 1803,
      insufficientDetailOptions: 676,
      genericTemplateOptions: 1064,
      choiceRestatementOptions: 437,
      fullKeyEchoOptions: 270,
    });
  });

  it('rematerializes protected fingerprints after a preceding prompt or choice edit but rejects answer-key drift', () => {
    const changed = structuredClone(bank);
    const target = changed.find((item) => item.id === campaignData.POST_DEEP_BASELINE_COHORT[0].id);
    target.prompt = `${target.prompt} `;
    const rematerialized = campaignData.buildCampaignData(changed, diagnostics, campaignData.POST_DEEP_BASELINE_COHORT);
    expect(rematerialized.fingerprints.selection).toBe(campaignData.POST_DEEP_EXPECTED_FINGERPRINTS.selection);
    expect(rematerialized.fingerprints.protectedContent).not.toBe(campaignData.POST_DEEP_EXPECTED_FINGERPRINTS.protectedContent);

    target.answerIndex = (target.answerIndex + 1) % 4;
    expect(() => campaignData.buildCampaignData(
      changed,
      diagnostics,
      campaignData.POST_DEEP_BASELINE_COHORT,
    )).toThrow(/answer index drifted/i);
  });

  it('recognizes all 1,260 live explanations as warning-free without mutating protected content', () => {
    const originalText = JSON.stringify(bank);
    const originalById = new Map(bank.map((item) => [item.id, item]));
    const result = repair.buildCampaign(bank, diagnostics);
    expect(JSON.stringify(bank)).toBe(originalText);
    expect(result.audit.summary).toMatchObject({
      selectedItems: 420,
      explanationsReplaced: 0,
      legacyReasonsExpanded: 0,
      generatedContrastDrafts: 0,
      preclearedExplanationsPreserved: 1260,
      feedbackWhitespaceNormalized: 0,
      keyedExplanationsNormalized: 0,
    });
    expect(result.audit.selectedWarningsAfter).toBe(0);
    expect(result.audit.deepPrerequisiteSatisfied).toBe(true);
    expect(result.audit.halvingTargetsSatisfied).toBe(true);
    expect(result.audit.reviewStatus).toMatch(/no independent human/i);
    expect(result.audit.limitations.join(' ')).toMatch(/editorial drafts/i);

    for (const descriptor of campaignData.POST_DEEP_BASELINE_COHORT) {
      const before = originalById.get(descriptor.id);
      const after = result.bank.find((item) => item.id === descriptor.id);
      expect(campaignData.protectedItemSnapshot(after)).toEqual(campaignData.protectedItemSnapshot(before));
      expect(after.choiceRationales[after.answerIndex]).toBe(after.rationale);
      const incorrect = after.choices.map((_choice, index) => index).filter((index) => index !== after.answerIndex);
      expect(new Set(incorrect.map((index) => repair.normalize(after.choiceRationales[index]))).size).toBe(3);
      for (const optionIndex of incorrect) {
        expect(repair.feedbackCodes(after, optionIndex, after.choiceRationales[optionIndex])).toEqual([]);
      }
    }
  });

  it('normalizes keyed feedback across the whole bank without changing protected content', () => {
    const drifted = structuredClone(bank);
    const target = drifted.find((item) => item.id === 'eppp-pilot-biological-1');
    const before = campaignData.protectedItemSnapshot(target);
    target.choiceRationales[target.answerIndex] = 'A noncanonical paraphrase.';
    const incorrectIndex = target.choices.findIndex((_choice, index) => index !== target.answerIndex);
    target.choiceRationales[incorrectIndex] += ' ';
    const result = repair.buildCampaign(drifted, diagnostics);
    const after = result.bank.find((item) => item.id === target.id);
    expect(result.audit.summary.keyedExplanationsNormalized).toBe(1);
    expect(result.audit.summary.feedbackWhitespaceNormalized).toBe(1);
    expect(after.choiceRationales[after.answerIndex]).toBe(after.rationale);
    expect(after.choiceRationales[incorrectIndex]).toBe(after.choiceRationales[incorrectIndex].trim());
    expect(campaignData.protectedItemSnapshot(after)).toEqual(before);
  });

  it('is idempotent when the same explicit cohort is applied twice', () => {
    const first = repair.buildCampaign(bank, diagnostics);
    const second = repair.buildCampaign(first.bank, diagnostics);
    expect(second.bank).toEqual(first.bank);
    expect(second.audit.selectedWarningsAfter).toBe(0);
    expect(second.audit.summary.explanationsReplaced).toBe(0);
    expect(second.audit.summary.preclearedExplanationsPreserved).toBe(1260);
    expect(second.audit.summary.feedbackWhitespaceNormalized).toBe(0);
    expect(second.audit.summary.keyedExplanationsNormalized).toBe(0);
  });
});
