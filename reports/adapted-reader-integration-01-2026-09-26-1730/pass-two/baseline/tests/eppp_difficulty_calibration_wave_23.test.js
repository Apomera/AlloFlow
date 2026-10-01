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
const wave23 = require('../dev-tools/eppp_native_quality_wave_23_data.cjs');
const { assertNativeQualityWaveReplayPreimage } = require('../dev-tools/run_eppp_native_quality_wave.cjs');

const selectedIds = [
  'eppp-v3-biological-012',
  'eppp-v2-cognitive-affective-038',
  'eppp-b004-social-1',
  'eppp-b019-lifespan-2',
  'eppp-b021-assessment-3',
  'eppp-b019-intervention-1',
  'eppp-v2-research-017',
  'eppp-b022-professional-2',
];
const selectedIdSet = new Set(selectedIds);
const expectedAfter = {
  totalItems: 1500,
  warningOnly: true,
  forbiddenAggregateChoices: 0,
  uniqueKeyStemLexicalLeakageCandidates: 55,
  asymmetricExtremeDistractorCandidates: 116,
  advancedDirectRecallCandidates: 4,
  semanticConceptDuplicatePairs: 81,
  semanticConceptDuplicateClusters: 45,
  editorialAnchorsWithActiveWarnings: 2,
  editorialAnchorsWithNoCurrentWarning: 8,
  priorityDocketItems: 20,
};
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim)\b/i;
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function applyWave23(bank) {
  for (const revision of wave23.revisions) {
    const item = bank.find((candidate) => candidate.id === revision.id);
    item.prompt = revision.prompt;
    item.difficulty = revision.targetDifficulty;
    item.choices = [...revision.choices];
    item.rationale = revision.rationale;
    item.choiceRationales = [...revision.choiceRationales];
    item.references = [...revision.references];
    item.sourceDetails = revision.sourceDetails.map((source) => ({ ...source }));
    item.learningObjectiveId = revision.learningObjectiveId;
    item.cognitiveProcess = revision.cognitiveProcess;
  }
}

function runIsolatedAudit() {
  const bank = json('test_prep/eppp_native_items.json');
  applyWave23(bank);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eppp-wave23-audit-'));
  try {
    fs.mkdirSync(path.join(temporaryRoot, 'dev-tools'));
    fs.mkdirSync(path.join(temporaryRoot, 'test_prep'));
    const temporaryAuditScript = path.join(
      temporaryRoot,
      'dev-tools',
      'audit_eppp_distractor_quality.cjs',
    );
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

describe('EPPP exam-like difficulty calibration wave 23', () => {
  it('covers all eight current Part 1 domains with a balanced frozen key distribution', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const bankById = new Map(bank.map((item) => [item.id, item]));
    const keyDistribution = [0, 0, 0, 0];
    const domains = new Set();

    expect(wave23.reviewWave).toBe('eppp-native-quality-wave-23');
    expect(wave23.revisions.map((revision) => revision.id)).toEqual(selectedIds);
    expect(wave23.selectionContract.selectedIds).toEqual(selectedIds);
    expect(new Set(selectedIds).size).toBe(8);
    for (const revision of wave23.revisions) {
      const item = bankById.get(revision.id);
      expect(item).toBeTruthy();
      domains.add(item.domainId);
      keyDistribution[revision.expectedAnswerIndex] += 1;
      expect([revision.expectedPrompt, revision.prompt]).toContain(item.prompt);
      expect([revision.expectedDifficulty, revision.targetDifficulty]).toContain(item.difficulty);
    }

    expect(domains.size).toBe(wave23.selectionContract.expectedDomainsCovered);
    expect(keyDistribution).toEqual([1, 3, 2, 2]);
    expect(keyDistribution).toEqual(wave23.selectionContract.expectedKeyDistribution);
    expect(wave23.revisions.filter(
      (revision) => revision.expectedDifficulty !== revision.targetDifficulty,
    )).toHaveLength(5);
    expect(wave23.revisions.every((revision) => revision.targetDifficulty === 'advanced')).toBe(true);
  });

  it('records the official format basis and a clear psychometric limitation', () => {
    expect(wave23.calibrationBasis.officialBlueprint)
      .toBe('https://asppb.net/wp-content/uploads/EPPP-Candidate-Handbook_01.2026.pdf');
    expect(wave23.calibrationBasis.officialTopics)
      .toBe('https://asppb.net/exams/asppb-examination-for-professional-psychology-eppp/eppp-exam-topics/');
    expect(wave23.calibrationBasis.currentExamModel).toContain('single-best-answer');
    expect(wave23.calibrationBasis.currentExamModel).toContain('eight knowledge domains');
    expect(wave23.calibrationBasis.designIntent).toContain('applied vignettes');
    expect(wave23.calibrationBasis.limitation).toContain('does not claim psychometric equivalence');
  });

  it('authors eight advanced application or analysis items with complete sources and teaching feedback', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const otherPrompts = new Set(bank
      .filter((item) => !selectedIdSet.has(item.id))
      .map((item) => normalize(item.prompt)));

    for (const revision of wave23.revisions) {
      expect(revision.targetDifficulty).toBe('advanced');
      expect(['application', 'analysis']).toContain(revision.cognitiveProcess);
      expect(revision.prompt.trim().split(/\s+/).length).toBeGreaterThanOrEqual(30);
      expect(revision.prompt).not.toBe(revision.expectedPrompt);
      expect(otherPrompts.has(normalize(revision.prompt))).toBe(false);
      expect(revision.choices).toHaveLength(4);
      expect(new Set(revision.choices.map((choice) => normalize(choice))).size).toBe(4);
      expect(revision.choices.some((choice) => extremeCuePattern.test(choice))).toBe(false);
      expect(revision.choiceRationales).toHaveLength(4);
      expect(revision.choiceRationales[revision.expectedAnswerIndex]).toBe(revision.rationale);
      expect(revision.choiceRationales.every(
        (feedback) => feedback.length >= 120 && !genericFeedbackPattern.test(feedback),
      )).toBe(true);
      expect(revision.rationale.length).toBeGreaterThanOrEqual(200);
      expect(revision.sourceCheck.length).toBeGreaterThanOrEqual(150);
      expect(revision.references).toHaveLength(revision.sourceDetails.length);
      expect(revision.sourceDetails).toHaveLength(1);
      for (const source of revision.sourceDetails) {
        expect(revision.references).toContain(source.url);
        expect(source.url.startsWith('https://')).toBe(true);
        expect(source.title.length).toBeGreaterThanOrEqual(20);
        expect(source.organization.length).toBeGreaterThanOrEqual(10);
        expect(source.summary.length).toBeGreaterThanOrEqual(120);
        expect(source.credibility.length).toBeGreaterThanOrEqual(120);
      }
      expect(revision.learningObjectiveId.length).toBeGreaterThanOrEqual(30);
      expect(revision.distractorDesign).toHaveLength(3);
    }
  });

  it('clears every selected warning and improves the global warning snapshot in isolation', () => {
    const protectedPaths = [
      'test_prep/eppp_native_items.json',
      'desktop/web-app/public/test_prep/eppp_native_items.json',
      'test_prep/reference_catalog.json',
      'desktop/web-app/public/test_prep/reference_catalog.json',
      'test_prep/eppp_distractor_quality_diagnostics.json',
      'test_prep/eppp_distractor_action_docket.json',
    ];
    const beforeFiles = new Map(protectedPaths.map((relativePath) => [relativePath, read(relativePath)]));
    const diagnostics = runIsolatedAudit();

    expect(diagnostics.summary).toEqual(expectedAfter);
    expect(diagnostics.uniqueKeyStemLexicalLeakage
      .some((entry) => selectedIdSet.has(entry.id))).toBe(false);
    expect(diagnostics.asymmetricExtremeDistractors
      .some((entry) => selectedIdSet.has(entry.id))).toBe(false);
    expect(diagnostics.advancedDirectRecall
      .some((entry) => selectedIdSet.has(entry.id))).toBe(false);
    expect(diagnostics.semanticConceptDuplicates.pairs.some(
      (pair) => selectedIdSet.has(pair.leftId) || selectedIdSet.has(pair.rightId),
    )).toBe(false);
    expect(diagnostics.summary.asymmetricExtremeDistractorCandidates)
      .toBe(wave23.warningCountsBefore.asymmetricExtremeDistractorCandidates - 4);
    expect(diagnostics.summary.advancedDirectRecallCandidates)
      .toBe(wave23.warningCountsBefore.advancedDirectRecallCandidates - 3);
    expect(diagnostics.summary.semanticConceptDuplicatePairs)
      .toBe(wave23.warningCountsBefore.semanticConceptDuplicatePairs - 1);
    expect(diagnostics.summary.semanticConceptDuplicateClusters)
      .toBe(wave23.warningCountsBefore.semanticConceptDuplicateClusters - 1);

    for (const relativePath of protectedPaths) {
      expect(read(relativePath)).toBe(beforeFiles.get(relativePath));
    }
  }, 30000);

  it('keeps the wave replayable after wave 22 and before the distractor campaign', () => {
    const bank = json('test_prep/eppp_native_items.json');
    for (const revision of wave23.revisions) {
      const item = bank.find((candidate) => candidate.id === revision.id);
      const currentState = assertNativeQualityWaveReplayPreimage({
        item,
        action: undefined,
        revision,
        reviewWave: wave23.reviewWave,
      });
      expect(currentState.matchesFrozenPrompt || currentState.matchesOwnWaveAfterState).toBe(true);
    }

    const repair = read('dev-tools/repair_eppp_native_quality_wave_23.cjs');
    expect(repair).toContain("waveNumber: '23'");
    expect(repair).toContain('expectedRevisionCount: 8');
    const runner = read('dev-tools/run_eppp_native_quality_wave.cjs');
    expect(runner).toContain('if (revision.targetDifficulty) item.difficulty = revision.targetDifficulty;');
    expect(runner).toContain("throw new Error(revision.id + ' difficulty drifted.');");
    expect(runner).toContain('calibrationBasis');

    const builder = read('dev-tools/build_eppp_1500_expansion.cjs');
    const wave22Index = builder.indexOf("runReplayScript('./repair_eppp_native_quality_wave_22.cjs');");
    const wave23Index = builder.indexOf("runReplayScript('./repair_eppp_native_quality_wave_23.cjs');");
    const campaignIndex = builder.indexOf('runDistractorHalvingCampaign();');
    expect(wave23Index).toBeGreaterThan(wave22Index);
    expect(wave23Index).toBeLessThan(campaignIndex);

    const campaignSources = [
      read('dev-tools/eppp_distractor_halving_campaign_manifest.cjs'),
      read('dev-tools/repair_eppp_distractor_halving_campaign.cjs'),
    ].join('\n');
    for (const id of selectedIds) expect(campaignSources).not.toContain(id);
  });
});
