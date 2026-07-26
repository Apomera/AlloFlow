import path from 'node:path';
import { describe, expect, it } from 'vitest';
import verifier from '../dev-tools/verify_eppp_quality_halving_campaign.cjs';
import distractorManifest from '../dev-tools/eppp_distractor_halving_campaign_manifest.cjs';
import feedbackCampaign from '../dev-tools/eppp_feedback_halving_campaign_data.cjs';

const root = process.cwd();
const auditPresence = verifier.campaignAuditPresence(root);
const liveGate = auditPresence.complete ? it : it.skip;

describe('EPPP final quality-halving verifier', () => {
  it('derives every frozen ceiling as floor(baseline / 2)', () => {
    expect(verifier.deriveHalfCeilings(distractorManifest.BASELINE_METRICS))
      .toEqual(distractorManifest.HALVING_CEILINGS);
    expect(verifier.deriveHalfCeilings(feedbackCampaign.BASELINE_SNAPSHOT))
      .toEqual(feedbackCampaign.TARGET_CEILINGS);
  });

  it('accepts ceiling values and rejects any listed metric one count above its ceiling', () => {
    for (const [baseline, label] of [
      [distractorManifest.BASELINE_METRICS, 'distractor fixture'],
      [feedbackCampaign.BASELINE_SNAPSHOT, 'feedback fixture'],
    ]) {
      const ceilings = verifier.deriveHalfCeilings(baseline);
      expect(verifier.assertMetricsAtOrBelowHalf(ceilings, baseline, label).ceilings)
        .toEqual(ceilings);
      for (const metric of Object.keys(baseline)) {
        const over = { ...ceilings, [metric]: ceilings[metric] + 1 };
        expect(() => verifier.assertMetricsAtOrBelowHalf(over, baseline, label))
          .toThrow(/did not halve every listed metric/i);
      }
    }
  });

  it('extracts only the native EPPP JSON literal from an AlloFlow runtime module', () => {
    const fixture = [
      'const BEFORE = true;',
      `${verifier.START_MARKER}[{"id":"one","answerIndex":0}];`,
      `${verifier.NEXT_MARKER}{"id":"preview"};`,
    ].join('\n');
    expect(verifier.extractEmbeddedEpppItems(fixture, 'fixture runtime')).toEqual([
      { id: 'one', answerIndex: 0 },
    ]);
    expect(() => verifier.extractEmbeddedEpppItems(
      `${fixture}\n${verifier.START_MARKER}[];`,
      'duplicate fixture runtime',
    )).toThrow(/exactly one EPPP native-bank marker/i);
  });

  it('requires truthful review limitations and rejects an independent-validation claim', () => {
    expect(verifier.assertTruthfulLimitations({
      limitation: 'This automated editorial gate is not psychometric calibration or independent licensed-psychologist validation.',
    })).toMatch(/not psychometric calibration/i);
    expect(() => verifier.assertTruthfulLimitations({
      limitation: 'No independent expert validation is otherwise claimed.',
      claim: 'This suite has been independently validated by a licensed psychologist.',
      note: 'Psychometric review remains out of scope.',
    })).toThrow(/unsupported independent-expert validation claim/i);
  });

  it('requires keyed option feedback to exactly equal the item rationale', () => {
    const valid = [{
      id: 'fixture',
      choices: ['A', 'B', 'C', 'D'],
      answerIndex: 2,
      rationale: 'C is supported.',
      choiceRationales: ['A is not supported.', 'B is not supported.', 'C is supported.', 'D is not supported.'],
    }];
    expect(verifier.assertKeyedFeedbackEqualsRationale(valid)).toBe(1);
    const drifted = structuredClone(valid);
    drifted[0].choiceRationales[2] = 'A paraphrase is not exact.';
    expect(() => verifier.assertKeyedFeedbackEqualsRationale(drifted)).toThrow(/exactly equal/i);
  });

  it('never publishes a caller-fabricated pass result', () => {
    expect(() => verifier.writeFinalAudit(root, { status: 'pass', audit: { status: 'pass' } }))
      .toThrow(/successful full verification/i);
  });

  it('allows campaign rollout in paired source/deploy units', () => {
    for (const pair of Object.values(auditPresence.pairs)) {
      expect([0, 2]).toContain(pair.presentCount);
      expect(pair.paired).toBe(true);
    }
  });

  liveGate('enforces the complete live campaign once both paired audits are published', () => {
    const result = verifier.verifyCampaign(root, {
      now: () => '2026-07-26T00:00:00.000Z',
    });
    expect(result.status).toBe('pass');
    expect(result.audit.summary).toMatchObject({
      uniqueItems: 1500,
      answerPositionCounts: [375, 375, 375, 375],
      qaItemsPassing: 1500,
      deepCampaignMarkers: 263,
      feedbackOnlyCampaignMarkers: 420,
      feedbackAuditItems: 420,
      keyedFeedbackMatchingRationale: 1500,
      canonicalRuntimeItemsEqual: true,
      sourceDeployParity: true,
    });
    for (const campaign of ['distractor', 'feedback']) {
      for (const metric of Object.values(result.audit.ceilingStatus[campaign])) {
        expect(metric.value).toBeLessThanOrEqual(metric.ceiling);
        expect(metric.met).toBe(true);
      }
    }
  });
});
