import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readRepoFile = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const buildSource = readRepoFile('dev-tools/build_eppp_1500_expansion.cjs');
const runnerSource = readRepoFile('dev-tools/run_eppp_native_quality_wave.cjs');
const wave07Source = readRepoFile('dev-tools/repair_eppp_native_quality_wave_07.cjs');
const wave08Source = readRepoFile('dev-tools/repair_eppp_native_quality_wave_08.cjs');
const { assertNativeQualityWaveReplayPreimage } = require('../dev-tools/run_eppp_native_quality_wave.cjs');
const {
  ITEM_REFERENCE_OVERRIDES,
  hydrateItemSources,
} = require('../dev-tools/eppp_quality_campaign_sources.cjs');

function extractArrowBody(source, name) {
  const match = source.match(new RegExp(`const ${name}=\\(\\)=>\\{([\\s\\S]*?)\\r?\\n\\};`));
  if (!match) throw new Error(`Could not locate ${name}.`);
  return match[1];
}

function collectReplayCalls(body) {
  return [...body.matchAll(
    /runReplayScript\('([^']+)'\)|\b(runDistractorHalvingCampaign|runFeedbackHalvingCampaign|runLatestEditorialReplay)\(\)/g,
  )].map((match) => match[1] || match[2]);
}

describe('EPPP 1,500-item editorial replay orchestration', () => {
  it('runs the complete replay in the frozen quality-campaign order', () => {
    expect(collectReplayCalls(extractArrowBody(buildSource, 'runLatestEditorialReplay'))).toEqual([
      './repair_eppp_native_quality_wave_05.cjs',
      './repair_eppp_native_quality_wave_06.cjs',
      './repair_eppp_option_feedback_wave_07.cjs',
      './repair_eppp_option_feedback_wave_08.cjs',
      './repair_eppp_option_feedback_wave_09.cjs',
      './repair_eppp_option_feedback_wave_10.cjs',
      './repair_eppp_option_feedback_wave_11.cjs',
      './repair_eppp_native_quality_wave_07.cjs',
      './repair_eppp_native_quality_wave_08.cjs',
      './repair_eppp_native_quality_wave_09.cjs',
      './repair_eppp_native_quality_wave_10.cjs',
      './repair_eppp_native_quality_wave_11.cjs',
      './repair_eppp_native_quality_wave_12.cjs',
      './repair_eppp_native_quality_wave_13.cjs',
      './repair_eppp_native_quality_wave_14.cjs',
      './repair_eppp_native_quality_wave_15.cjs',
      './repair_eppp_native_quality_wave_16.cjs',
      './repair_eppp_native_quality_wave_17.cjs',
      './repair_eppp_native_quality_wave_18.cjs',
      './repair_eppp_native_quality_wave_19.cjs',
      './repair_eppp_native_quality_wave_20.cjs',
      './repair_eppp_native_quality_wave_21.cjs',
      './repair_eppp_native_quality_wave_22.cjs',
      './repair_eppp_native_quality_wave_23.cjs',
      'runDistractorHalvingCampaign',
      './audit_eppp_option_feedback.cjs',
      'runFeedbackHalvingCampaign',
      './repair_eppp_native_quality_wave_25.cjs',
      './repair_eppp_native_quality_wave_26.cjs',
      './repair_eppp_native_quality_wave_27.cjs',
      './repair_eppp_native_quality_wave_28.cjs',
      './repair_eppp_native_quality_wave_29.cjs',
      './repair_eppp_native_quality_wave_30.cjs',
      './repair_eppp_native_quality_wave_31.cjs',
      './repair_eppp_native_quality_wave_32.cjs',
      './repair_eppp_native_quality_wave_33.cjs',
      './repair_eppp_native_quality_wave_34.cjs',
      './repair_eppp_native_quality_wave_35.cjs',
      './repair_eppp_native_quality_wave_36.cjs',
      './repair_eppp_native_quality_wave_37.cjs',
      './repair_eppp_native_quality_wave_38.cjs',
      './repair_eppp_native_quality_wave_39.cjs',
      './repair_eppp_native_quality_wave_40.cjs',
      './repair_eppp_native_quality_wave_41.cjs',
      './repair_eppp_native_quality_wave_42.cjs',
      './repair_eppp_native_quality_wave_43.cjs',
      './repair_eppp_native_quality_wave_44.cjs',
      './repair_eppp_native_quality_wave_45.cjs',
      './repair_eppp_native_quality_wave_46.cjs',
      './repair_eppp_native_quality_wave_47.cjs',
      './repair_eppp_native_quality_wave_48.cjs',
      './repair_eppp_native_quality_wave_49.cjs',
      './repair_eppp_extreme_word_cleanup_wave_50.cjs',
      './repair_eppp_challenge_enhancement_wave_51.cjs',
      './repair_eppp_application_rewrite_wave_52.cjs',
      './repair_eppp_application_rewrite_wave_53.cjs',
      './normalize_eppp_native_unicode.cjs',
      './audit_eppp_distractor_quality.cjs',
      './audit_eppp_option_feedback.cjs',
      './build_eppp_distractor_action_docket.cjs',
    ]);

    expect(collectReplayCalls(extractArrowBody(buildSource, 'runEditorialReplay'))).toEqual([
      './repair_eppp_native_quality_wave_01.cjs',
      './repair_eppp_native_quality_wave_02.cjs',
      './repair_eppp_key_alignment_backlog.cjs',
      './complete_eppp_option_feedback.cjs',
      './repair_eppp_native_quality_wave_03.cjs',
      './repair_eppp_native_quality_wave_04.cjs',
      'runLatestEditorialReplay',
    ]);
  });

  it('covers native waves 07 through 23 plus post-campaign waves 25 through 53 on both replay paths', () => {
    const latestCalls = collectReplayCalls(extractArrowBody(buildSource, 'runLatestEditorialReplay'));
    const coveredWaves = latestCalls
      .map((call) => call.match(/repair_eppp_native_quality_wave_(0[7-9]|1[0-9]|2[0-3])\.cjs$/)?.[1])
      .filter(Boolean);
    expect(coveredWaves).toEqual(['07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23']);
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_25.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_26.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_27.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_28.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_29.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_30.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_31.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_32.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_33.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_34.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_35.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_36.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_37.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_38.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_39.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_40.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_41.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_42.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_43.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_44.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_45.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_46.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_47.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_48.cjs');
    expect(latestCalls).toContain('./repair_eppp_native_quality_wave_49.cjs');
    expect(latestCalls).toContain('./repair_eppp_extreme_word_cleanup_wave_50.cjs');
    expect(latestCalls).toContain('./repair_eppp_challenge_enhancement_wave_51.cjs');
    expect(latestCalls).toContain('./repair_eppp_application_rewrite_wave_52.cjs');
    expect(latestCalls).toContain('./repair_eppp_application_rewrite_wave_53.cjs');
    expect(buildSource).toMatch(
      /if\(existingBank\.length===1500&&existingBank\.filter[\s\S]*?\)\{\s*runLatestEditorialReplay\(\);/,
    );
  });

  it('invokes both write campaigns and reloads audits that must run twice', () => {
    expect(buildSource).toContain('delete require.cache[resolved];');
    expect(buildSource).toContain(
      "const runDistractorHalvingCampaign=()=>runReplayScript('./repair_eppp_distractor_halving_campaign.cjs').run({apply:true});",
    );
    expect(buildSource).toContain(
      "const runFeedbackHalvingCampaign=()=>runReplayScript('./repair_eppp_feedback_halving_campaign.cjs').runCampaign(root,{write:true});",
    );
    expect(collectReplayCalls(extractArrowBody(buildSource, 'runLatestEditorialReplay'))
      .filter((call) => call === './audit_eppp_option_feedback.cjs')).toHaveLength(2);
  });
});

describe('native quality-wave replay preimage contract', () => {
  const revision = {
    id: 'replay-fixture',
    expectedActionRank: 7,
    expectedPrompt: 'Frozen source prompt',
    prompt: 'Wave-authored prompt',
  };
  const reviewWave = 'eppp-native-quality-wave-07';

  it('permits the exact frozen prompt after docket ranks advance', () => {
    expect(() => assertNativeQualityWaveReplayPreimage({
      item: { prompt: revision.expectedPrompt },
      action: { actionRank: 999 },
      revision,
      reviewWave,
    })).not.toThrow();
  });

  it('permits the exact historical wave after-state with its own wave marker', () => {
    expect(() => assertNativeQualityWaveReplayPreimage({
      item: { prompt: revision.prompt, wordingReviewWave: reviewWave },
      action: undefined,
      revision,
      reviewWave,
    })).not.toThrow();
  });

  it('permits campaign after-state wording only with an explicit deep-rewrite supersession marker', () => {
    expect(() => assertNativeQualityWaveReplayPreimage({
      item: {
        prompt: 'Campaign-refined prompt',
        wordingReviewWave: reviewWave,
        qualityReviewHistory: [{
          campaignId: 'eppp-distractor-halving-campaign-v1',
          mode: 'deep-rewrite',
        }],
      },
      action: undefined,
      revision,
      reviewWave,
    })).not.toThrow();
  });

  it('rejects arbitrary prompt drift even when a stale own-wave marker remains', () => {
    expect(() => assertNativeQualityWaveReplayPreimage({
      item: { prompt: 'Unrecognized prompt', wordingReviewWave: reviewWave },
      action: undefined,
      revision,
      reviewWave,
    })).toThrowError(/action-docket rank drifted/);
  });

  it('rejects real prompt drift even when the old docket rank still matches', () => {
    expect(() => assertNativeQualityWaveReplayPreimage({
      item: { prompt: 'Unrecognized prompt', wordingReviewWave: 'another-wave' },
      action: { actionRank: revision.expectedActionRank },
      revision,
      reviewWave,
    })).toThrowError(/source prompt drifted/);
  });

  it('rejects unrecognized prompt and docket drift without this wave marker', () => {
    expect(() => assertNativeQualityWaveReplayPreimage({
      item: { prompt: 'Unrecognized prompt' },
      action: undefined,
      revision,
      reviewWave,
    })).toThrowError(/action-docket rank drifted/);
  });

  it('keeps answer-position guards and applies the shared contract in every affected runner', () => {
    const answerGuard = "if (item.answerIndex !== revision.expectedAnswerIndex) throw new Error(revision.id + ' answer position drifted.');";
    for (const source of [runnerSource, wave07Source, wave08Source]) {
      expect(source).toContain(answerGuard);
      expect(source).toContain('assertNativeQualityWaveReplayPreimage({ item, action, revision, reviewWave });');
    }
    expect(wave07Source).toContain(
      'diagnosticsBefore: [...(action?.diagnostics || existingAuditById.get(item.id)?.diagnosticsBefore || [])],',
    );
  });
});

describe('campaign source overrides', () => {
  it('hydrates every item-level override with complete, aligned metadata', () => {
    for (const [id, expectedReferences] of Object.entries(ITEM_REFERENCE_OVERRIDES)) {
      const hydrated = hydrateItemSources({
        id,
        references: [`https://legacy.example.test/${id}`],
        sourceDetails: [],
      }, {});

      expect(hydrated.references).toEqual([...expectedReferences]);
      expect(hydrated.sourceDetails).toHaveLength(expectedReferences.length);
      for (const detail of hydrated.sourceDetails) {
        expect(detail.url.startsWith('https://')).toBe(true);
        expect(detail.title.length).toBeGreaterThanOrEqual(12);
        expect(detail.organization.length).toBeGreaterThanOrEqual(4);
        expect(detail.summary.length).toBeGreaterThanOrEqual(40);
        expect(detail.credibility.length).toBeGreaterThanOrEqual(40);
        expect(hydrated.catalogUpdates[detail.url]).toMatchObject({
          title: detail.title,
          organization: detail.organization,
          summary: detail.summary,
          credibility: detail.credibility,
          metadataSource: 'pack-authored',
        });
      }
    }
  });
});
