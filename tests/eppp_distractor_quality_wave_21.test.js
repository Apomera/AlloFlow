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
const wave20 = require('../dev-tools/eppp_native_quality_wave_20_data.cjs');
const wave21 = require('../dev-tools/eppp_native_quality_wave_21_data.cjs');
const wave22 = require('../dev-tools/eppp_native_quality_wave_22_data.cjs');
const { assertNativeQualityWaveReplayPreimage } = require('../dev-tools/run_eppp_native_quality_wave.cjs');

const ids = [
  ...wave21.selectionContract.lexicalIds,
  ...wave21.selectionContract.duplicateClusterIds,
];
const expectedKeys = [1, 3, 0, 0, 1, 2, 2, 3, 0, 1];
const expectedAfter = {
  totalItems: 1500,
  forbiddenAggregateChoices: 0,
  uniqueKeyStemLexicalLeakageCandidates: 55,
  asymmetricExtremeDistractorCandidates: 120,
  advancedDirectRecallCandidates: 7,
  semanticConceptDuplicatePairs: 83,
  semanticConceptDuplicateClusters: 47,
};
function expectSummaryAtOrBeyond(summary, reference) {
  expect(summary).toMatchObject({
    totalItems: reference.totalItems,
    forbiddenAggregateChoices: reference.forbiddenAggregateChoices,
    asymmetricExtremeDistractorCandidates: reference.asymmetricExtremeDistractorCandidates,
    advancedDirectRecallCandidates: reference.advancedDirectRecallCandidates,
  });
  for (const metric of [
    'uniqueKeyStemLexicalLeakageCandidates',
    'semanticConceptDuplicatePairs',
    'semanticConceptDuplicateClusters',
  ]) {
    expect(summary[metric], metric).toBeLessThanOrEqual(reference[metric]);
  }
}
const canonicalAfterWave22 = {
  totalItems: 1500,
  forbiddenAggregateChoices: 0,
  uniqueKeyStemLexicalLeakageCandidates: 55,
  asymmetricExtremeDistractorCandidates: 120,
  advancedDirectRecallCandidates: 7,
  semanticConceptDuplicatePairs: 82,
  semanticConceptDuplicateClusters: 46,
};
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim)\b/i;

function applyWave(bank, wave) {
  const byId = new Map(bank.map((item) => [item.id, item]));
  for (const revision of wave.revisions) {
    const item = byId.get(revision.id);
    item.prompt = revision.prompt;
    item.choices = [...revision.choices];
    item.rationale = revision.rationale;
    item.choiceRationales = [...revision.choiceRationales];
    item.references = [...revision.references];
    item.sourceDetails = revision.sourceDetails.map((source) => ({ ...source }));
    item.learningObjectiveId = revision.learningObjectiveId;
    item.cognitiveProcess = revision.cognitiveProcess;
  }
}

function runIsolatedAudit(waves) {
  const bank = json('test_prep/eppp_native_items.json');
  for (const wave of waves) applyWave(bank, wave);

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eppp-wave21-audit-'));
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

describe('EPPP distractor-quality repair wave 21', () => {
  it('preserves the frozen post-wave-20 evidence for five lexical and five duplicate warnings', () => {
    const frozenAudit = json('test_prep/eppp_native_quality_audit_wave_21.json');
    expect(frozenAudit.summary.warningCountsBefore).toEqual(wave21.warningCountsBefore);
    expect(wave21.revisions.map((revision) => revision.id)).toEqual(ids);
    expect(new Set(ids).size).toBe(10);

    const frozenById = new Map(frozenAudit.items.map((item) => [item.id, item]));
    for (const id of wave21.selectionContract.lexicalIds) {
      expect(frozenById.get(id)?.diagnosticsBefore)
        .toContain('unique-key/stem-lexical-leakage');
    }
    for (const id of wave21.selectionContract.duplicateClusterIds) {
      expect(frozenById.get(id)?.diagnosticsBefore)
        .toContain('semantic-concept-duplicate-candidate');
    }
  });

  it('authors protected-key application or analysis revisions with substantive teaching feedback and sources', () => {
    const bankById = new Map(json('test_prep/eppp_native_items.json').map((item) => [item.id, item]));

    wave21.revisions.forEach((revision, index) => {
      const item = bankById.get(revision.id);
      expect(item).toBeTruthy();
      expect(item.prompt).toBe(revision.prompt);
      expect(item.choices).toEqual(revision.choices);
      expect(item.rationale).toBe(revision.rationale);
      expect(item.choiceRationales).toEqual(revision.choiceRationales);
      expect(item.references).toEqual(revision.references);
      expect(item.sourceDetails).toEqual(revision.sourceDetails);
      expect(item.wordingReviewWave).toBe(wave21.reviewWave);
      expect(item.answerIndex).toBe(revision.expectedAnswerIndex);
      expect(revision.expectedAnswerIndex).toBe(expectedKeys[index]);
      expect(['application', 'analysis']).toContain(revision.cognitiveProcess);
      expect(revision.prompt).not.toBe(revision.expectedPrompt);
      expect(revision.choices).toHaveLength(4);
      expect(new Set(revision.choices.map((choice) => choice.toLowerCase())).size).toBe(4);
      expect(revision.choices.some((choice) => extremeCuePattern.test(choice))).toBe(false);
      expect(revision.choiceRationales).toHaveLength(4);
      expect(revision.choiceRationales[revision.expectedAnswerIndex]).toBe(revision.rationale);
      expect(revision.choiceRationales.every(
        (feedback) => feedback.length >= 120 && !genericFeedbackPattern.test(feedback),
      )).toBe(true);
      expect(revision.rationale.length).toBeGreaterThanOrEqual(180);
      expect(revision.sourceCheck.length).toBeGreaterThanOrEqual(150);
      expect(revision.references).toHaveLength(revision.sourceDetails.length);
      expect(revision.sourceDetails.every((source) => revision.references.includes(source.url)
        && source.title.length >= 20
        && source.organization.length >= 10
        && source.summary.length >= 120
        && source.credibility.length >= 120)).toBe(true);
      expect(revision.distractorDesign).toHaveLength(3);
    });

    expect(read('dev-tools/qa_eppp_native_pack.cjs')).toContain("'psychclassics.yorku.ca'");

    const keyDistribution = wave21.revisions.reduce((counts, revision) => {
      counts[revision.expectedAnswerIndex] += 1;
      return counts;
    }, [0, 0, 0, 0]);
    expect(keyDistribution).toEqual(wave21.selectionContract.expectedKeyDistribution);
    expect(new Set(ids.map((id) => bankById.get(id).domainId)).size)
      .toBe(wave21.selectionContract.expectedDomainsCovered);
  });

  it('keeps the final canonical metrics at or beyond the wave-22 floor under an isolated idempotent replay', () => {
    const protectedPaths = [
      'test_prep/eppp_native_items.json',
      'desktop/web-app/public/test_prep/eppp_native_items.json',
      'test_prep/reference_catalog.json',
      'desktop/web-app/public/test_prep/reference_catalog.json',
      'test_prep/eppp_distractor_quality_diagnostics.json',
      'test_prep/eppp_distractor_action_docket.json',
    ];
    const before = new Map(protectedPaths.map((relativePath) => [relativePath, read(relativePath)]));
    const liveDiagnostics = json('test_prep/eppp_distractor_quality_diagnostics.json');
    const diagnostics = runIsolatedAudit([wave20, wave21, wave22]);
    const selected = new Set(ids);

    expectSummaryAtOrBeyond(liveDiagnostics.summary, canonicalAfterWave22);
    expectSummaryAtOrBeyond(diagnostics.summary, canonicalAfterWave22);
    expect(diagnostics.uniqueKeyStemLexicalLeakage.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.asymmetricExtremeDistractors.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.advancedDirectRecall.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.semanticConceptDuplicates.pairs.some(
      (pair) => selected.has(pair.leftId) || selected.has(pair.rightId),
    )).toBe(false);

    for (const metric of Object.keys(wave21.selectionContract.warningCeilings)) {
      expect(diagnostics.summary[metric]).toBeLessThanOrEqual(wave21.warningCountsBefore[metric]);
      expect(diagnostics.summary[metric]).toBeLessThanOrEqual(
        wave21.selectionContract.warningCeilings[metric],
      );
    }
    expect(diagnostics.summary.uniqueKeyStemLexicalLeakageCandidates)
      .toBeLessThan(wave21.warningCountsBefore.uniqueKeyStemLexicalLeakageCandidates);
    expect(diagnostics.summary.semanticConceptDuplicatePairs)
      .toBeLessThan(wave21.warningCountsBefore.semanticConceptDuplicatePairs);
    expect(diagnostics.summary.semanticConceptDuplicateClusters)
      .toBeLessThan(wave21.warningCountsBefore.semanticConceptDuplicateClusters);

    for (const relativePath of protectedPaths) {
      expect(read(relativePath)).toBe(before.get(relativePath));
    }
  });

  it('keeps frozen and canonical after-states replayable and hooks after wave 20 before the campaign', () => {
    const bankById = new Map(json('test_prep/eppp_native_items.json').map((item) => [item.id, item]));
    for (const revision of wave21.revisions) {
      const frozenState = assertNativeQualityWaveReplayPreimage({
        item: { prompt: revision.expectedPrompt },
        action: undefined,
        revision,
        reviewWave: wave21.reviewWave,
      });
      expect(frozenState.matchesFrozenPrompt).toBe(true);

      const canonicalState = assertNativeQualityWaveReplayPreimage({
        item: bankById.get(revision.id),
        action: undefined,
        revision,
        reviewWave: wave21.reviewWave,
      });
      expect(canonicalState.matchesOwnWaveAfterState || canonicalState.hasCampaignSupersession)
        .toBe(true);
      expect(canonicalState.hasOwnWaveMarker).toBe(true);
    }

    const runner = read('dev-tools/repair_eppp_native_quality_wave_21.cjs');
    expect(runner).toContain('waveNumber: \'21\'');
    expect(runner).toContain('expectedRevisionCount: 10');
    const builder = read('dev-tools/build_eppp_1500_expansion.cjs');
    const wave20Index = builder.indexOf('runReplayScript(\'./repair_eppp_native_quality_wave_20.cjs\');');
    const wave21Index = builder.indexOf('runReplayScript(\'./repair_eppp_native_quality_wave_21.cjs\');');
    expect(wave21Index).toBeGreaterThan(wave20Index);
    expect(wave21Index).toBeLessThan(builder.indexOf('runDistractorHalvingCampaign();'));
  });
});
