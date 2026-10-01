import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const wave21 = require('../dev-tools/eppp_native_quality_wave_21_data.cjs');
const wave22 = require('../dev-tools/eppp_native_quality_wave_22_data.cjs');
const { assertNativeQualityWaveReplayPreimage } = require('../dev-tools/run_eppp_native_quality_wave.cjs');

const selectedId = 'eppp-b004-professional-1';
const duplicatePartnerId = 'eppp-v3-professional-003';
const expectedAfter = {
  totalItems: 1500,
  forbiddenAggregateChoices: 0,
  uniqueKeyStemLexicalLeakageCandidates: 55,
  asymmetricExtremeDistractorCandidates: 116,
  advancedDirectRecallCandidates: 4,
  semanticConceptDuplicatePairs: 81,
  semanticConceptDuplicateClusters: 45,
};
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim)\b/i;
const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function applyWave22(bank) {
  const revision = wave22.revisions[0];
  const item = bank.find((candidate) => candidate.id === revision.id);
  item.prompt = revision.prompt;
  item.choices = [...revision.choices];
  item.rationale = revision.rationale;
  item.choiceRationales = [...revision.choiceRationales];
  item.references = [...revision.references];
  item.sourceDetails = revision.sourceDetails.map((source) => ({ ...source }));
  item.learningObjectiveId = revision.learningObjectiveId;
  item.cognitiveProcess = revision.cognitiveProcess;
}

function runIsolatedAudit() {
  const bank = json('test_prep/eppp_native_items.json');
  applyWave22(bank);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eppp-wave22-audit-'));
  try {
    fs.mkdirSync(path.join(temporaryRoot, 'dev-tools'));
    fs.mkdirSync(path.join(temporaryRoot, 'test_prep'));
    const temporaryAuditScript = path.join(temporaryRoot, 'dev-tools', 'audit_eppp_distractor_quality.cjs');
    fs.copyFileSync(
      path.join(root, 'dev-tools', 'audit_eppp_distractor_quality.cjs'),
      temporaryAuditScript,
    );
    fs.writeFileSync(
      path.join(temporaryRoot, 'test_prep', 'eppp_native_items.json'),
      JSON.stringify(bank, null, 2) + '\n',
    );
    execFileSync(process.execPath, [temporaryAuditScript], {
      cwd: temporaryRoot,
      stdio: 'pipe',
    });
    return JSON.parse(fs.readFileSync(
      path.join(temporaryRoot, 'test_prep', 'eppp_distractor_quality_diagnostics.json'),
      'utf8',
    ));
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

describe('EPPP distractor-quality repair wave 22', () => {
  it('records the final live pair or its frozen post-replay selection evidence', () => {
    const diagnostics = json('test_prep/eppp_distractor_quality_diagnostics.json');
    const livePair = diagnostics.semanticConceptDuplicates.pairs.find((pair) => (
      [pair.leftId, pair.rightId].includes(selectedId)
      && [pair.leftId, pair.rightId].includes(duplicatePartnerId)
    ));
    const auditPath = 'test_prep/eppp_native_quality_audit_wave_22.json';
    const frozenAudit = fs.existsSync(path.join(root, auditPath)) ? json(auditPath) : null;
    const frozenItem = frozenAudit?.items.find((item) => item.id === selectedId);

    expect(Boolean(livePair)
      || frozenItem?.diagnosticsBefore.includes('semantic-concept-duplicate-candidate'))
      .toBe(true);
    if (livePair) {
      expect(diagnostics.summary).toEqual(wave22.warningCountsBefore);
      expect(livePair.sharedIdentifiers).toContain('standard 2.01');
    }
    if (frozenAudit) {
      expect(frozenAudit.summary.warningCountsBefore).toEqual(wave22.warningCountsBefore);
      expect(frozenItem.diagnosticsBefore).toContain('semantic-concept-duplicate-candidate');
    }
    expect(wave22.revisions.map((revision) => revision.id)).toEqual([selectedId]);
  });

  it('authors one protected-B Standard 9.08 application with complete source and feedback gates', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const item = bank.find((candidate) => candidate.id === selectedId);
    const revision = wave22.revisions[0];

    expect(item).toBeTruthy();
    expect([revision.expectedPrompt, revision.prompt]).toContain(item.prompt);
    expect(item.answerIndex).toBe(1);
    expect(revision.expectedAnswerIndex).toBe(1);
    expect(wave22.selectionContract.expectedKeyDistribution).toEqual([0, 1, 0, 0]);
    expect(revision.cognitiveProcess).toBe('analysis');
    expect(revision.prompt).toContain('Standard 9.08');
    expect(revision.prompt).not.toBe(revision.expectedPrompt);
    expect(revision.choices).toHaveLength(4);
    expect(new Set(revision.choices.map((choice) => choice.toLowerCase())).size).toBe(4);
    expect(revision.choices.some((choice) => extremeCuePattern.test(choice))).toBe(false);
    expect(revision.choiceRationales).toHaveLength(4);
    expect(revision.choiceRationales[1]).toBe(revision.rationale);
    expect(revision.choiceRationales.every(
      (feedback) => feedback.length >= 120 && !genericFeedbackPattern.test(feedback),
    )).toBe(true);
    expect(revision.rationale.length).toBeGreaterThanOrEqual(180);
    expect(revision.sourceCheck.length).toBeGreaterThanOrEqual(150);
    expect(revision.references).toEqual(['https://www.apa.org/ethics/code']);
    expect(revision.sourceDetails).toHaveLength(1);
    expect(revision.sourceDetails[0]).toMatchObject({
      url: 'https://www.apa.org/ethics/code',
      organization: 'American Psychological Association',
    });
    expect(revision.sourceDetails[0].title.length).toBeGreaterThanOrEqual(20);
    expect(revision.sourceDetails[0].summary.length).toBeGreaterThanOrEqual(120);
    expect(revision.sourceDetails[0].credibility.length).toBeGreaterThanOrEqual(120);
    expect(revision.distractorDesign).toHaveLength(3);
    expect(read('dev-tools/eppp_distractor_halving_campaign_manifest.cjs'))
      .not.toContain(selectedId);
    expect(read('dev-tools/repair_eppp_distractor_halving_campaign.cjs'))
      .not.toContain(selectedId);
    expect((item.qualityReviewHistory || []).some((entry) => (
      entry?.campaignId === 'eppp-distractor-halving-campaign-v1'
      && entry.mode === 'deep-rewrite'
    ))).toBe(false);

    const otherPrompts = new Set(
      bank.filter((candidate) => candidate.id !== selectedId).map((candidate) => norm(candidate.prompt)),
    );
    expect(otherPrompts.has(norm(revision.prompt))).toBe(false);

    if (item.prompt === revision.prompt) {
      expect(item.choices).toEqual(revision.choices);
      expect(item.rationale).toBe(revision.rationale);
      expect(item.choiceRationales).toEqual(revision.choiceRationales);
      expect(item.references).toEqual(revision.references);
      expect(item.sourceDetails).toEqual(revision.sourceDetails);
      expect(item.wordingReviewWave).toBe(wave22.reviewWave);
    }
  });

  it('eliminates its selected pair while retaining later wave 23 improvements in isolation', () => {
    const protectedPaths = [
      'test_prep/eppp_native_items.json',
      'desktop/web-app/public/test_prep/eppp_native_items.json',
      'test_prep/reference_catalog.json',
      'desktop/web-app/public/test_prep/reference_catalog.json',
      'test_prep/eppp_distractor_quality_diagnostics.json',
      'test_prep/eppp_distractor_action_docket.json',
    ];
    const beforeFiles = new Map(
      protectedPaths.map((relativePath) => [relativePath, read(relativePath)]),
    );
    const diagnostics = runIsolatedAudit();
    const selectedPair = diagnostics.semanticConceptDuplicates.pairs.find((pair) => (
      pair.leftId === selectedId || pair.rightId === selectedId
    ));

    expect(diagnostics.summary).toMatchObject(expectedAfter);
    expect(selectedPair).toBeUndefined();
    expect(diagnostics.uniqueKeyStemLexicalLeakage.some((item) => item.id === selectedId)).toBe(false);
    expect(diagnostics.asymmetricExtremeDistractors.some((item) => item.id === selectedId)).toBe(false);
    expect(diagnostics.advancedDirectRecall.some((item) => item.id === selectedId)).toBe(false);

    for (const metric of ['forbiddenAggregateChoices', 'uniqueKeyStemLexicalLeakageCandidates']) {
      expect(diagnostics.summary[metric]).toBe(wave22.warningCountsBefore[metric]);
    }
    expect(diagnostics.summary.asymmetricExtremeDistractorCandidates)
      .toBe(wave22.warningCountsBefore.asymmetricExtremeDistractorCandidates - 4);
    expect(diagnostics.summary.advancedDirectRecallCandidates)
      .toBe(wave22.warningCountsBefore.advancedDirectRecallCandidates - 3);
    expect(diagnostics.summary.semanticConceptDuplicatePairs)
      .toBe(wave22.warningCountsBefore.semanticConceptDuplicatePairs - 2);
    expect(diagnostics.summary.semanticConceptDuplicateClusters)
      .toBe(wave22.warningCountsBefore.semanticConceptDuplicateClusters - 2);

    for (const relativePath of protectedPaths) {
      expect(read(relativePath)).toBe(beforeFiles.get(relativePath));
    }
  }, 30000);

  it('keeps frozen and own after-states replayable and hooks after wave 21 before the campaign', () => {
    const item = json('test_prep/eppp_native_items.json')
      .find((candidate) => candidate.id === selectedId);
    const revision = wave22.revisions[0];
    const frozenState = assertNativeQualityWaveReplayPreimage({
      item: { prompt: revision.expectedPrompt },
      action: undefined,
      revision,
      reviewWave: wave22.reviewWave,
    });
    const ownState = assertNativeQualityWaveReplayPreimage({
      item: {
        prompt: revision.prompt,
        wordingReviewWave: wave22.reviewWave,
      },
      action: undefined,
      revision,
      reviewWave: wave22.reviewWave,
    });
    const currentState = assertNativeQualityWaveReplayPreimage({
      item,
      action: undefined,
      revision,
      reviewWave: wave22.reviewWave,
    });

    expect(frozenState.matchesFrozenPrompt).toBe(true);
    expect(ownState.matchesOwnWaveAfterState).toBe(true);
    expect(currentState.matchesFrozenPrompt || currentState.matchesOwnWaveAfterState).toBe(true);

    const runner = read('dev-tools/repair_eppp_native_quality_wave_22.cjs');
    expect(runner).toContain('waveNumber: \'22\'');
    expect(runner).toContain('expectedRevisionCount: 1');
    const builder = read('dev-tools/build_eppp_1500_expansion.cjs');
    const wave21Index = builder.indexOf('runReplayScript(\'./repair_eppp_native_quality_wave_21.cjs\');');
    const wave22Index = builder.indexOf('runReplayScript(\'./repair_eppp_native_quality_wave_22.cjs\');');
    const campaignIndex = builder.indexOf('runDistractorHalvingCampaign();');
    expect(wave22Index).toBeGreaterThan(wave21Index);
    expect(wave22Index).toBeLessThan(campaignIndex);
    expect(wave21.revisions.some((revision21) => revision21.id === selectedId)).toBe(false);
  });
});
