import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const wave02 = require('../dev-tools/eppp_distractor_review_wave_02_data.cjs');
const { repairText } = require('../dev-tools/fix_mojibake.cjs');
const {
  normalizeBank,
  remainingLearnerMojibake,
  run: runUnicodeNormalization,
} = require('../dev-tools/normalize_eppp_native_unicode.cjs');

const sha256 = (value) => crypto.createHash('sha256')
  .update(typeof value === 'string' ? value : JSON.stringify(value))
  .digest('hex');

function itemFingerprint(item) {
  return sha256({
    id: item.id,
    prompt: item.prompt,
    choices: item.choices,
    answerIndex: item.answerIndex,
    keyedChoice: item.choices[item.answerIndex],
    references: item.references,
  });
}

function warningFingerprint(docketItem, extremeFinding) {
  return sha256({
    diagnostics: docketItem.diagnostics,
    docketRank: docketItem.rank,
    extremeDistractorIndexes: extremeFinding.extremeDistractorIndexes,
    termsByDistractor: extremeFinding.termsByDistractor,
  });
}

function cp1252Mojibake(character) {
  const cp1252 = {
    0x80: '\u20ac',
    0x92: '\u2019',
    0x93: '\u201c',
    0x94: '\u201d',
    0x96: '\u2013',
    0x97: '\u2014',
    0x99: '\u2122',
    0x9c: '\u0153',
    0x9d: '\u009d',
  };
  return [...Buffer.from(character, 'utf8')]
    .map((byte) => cp1252[byte] || String.fromCharCode(byte))
    .join('');
}

function copy(relativePath, temporaryRoot) {
  const destination = path.join(temporaryRoot, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, relativePath), destination);
}

let temporaryRoot;
let disposableReview;
let disposableDocket;
let firstDocketJson;
let firstReviewJson;

beforeAll(() => {
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eppp-docket-wave02-'));
  for (const relativePath of [
    'dev-tools/build_eppp_distractor_action_docket_v2.cjs',
    'dev-tools/eppp_distractor_review_wave_02_data.cjs',
    'test_prep/eppp_native_items.json',
    'test_prep/eppp_distractor_quality_diagnostics.json',
    'test_prep/eppp_distractor_review_wave_01.json',
  ]) {
    copy(relativePath, temporaryRoot);
  }
  fs.mkdirSync(path.join(temporaryRoot, 'desktop', 'web-app', 'public', 'test_prep'), {
    recursive: true,
  });

  const builder = path.join(
    temporaryRoot,
    'dev-tools',
    'build_eppp_distractor_action_docket_v2.cjs',
  );
  execFileSync(process.execPath, [builder], { cwd: temporaryRoot, stdio: 'pipe' });
  const docketPath = path.join(
    temporaryRoot,
    'test_prep',
    'eppp_distractor_action_docket.json',
  );
  const reviewPath = path.join(
    temporaryRoot,
    'test_prep',
    'eppp_distractor_review_wave_02.json',
  );
  firstDocketJson = fs.readFileSync(docketPath, 'utf8');
  firstReviewJson = fs.readFileSync(reviewPath, 'utf8');
  disposableDocket = JSON.parse(firstDocketJson);
  disposableReview = JSON.parse(firstReviewJson);

  execFileSync(process.execPath, [builder], { cwd: temporaryRoot, stdio: 'pipe' });
});

afterAll(() => {
  if (temporaryRoot) fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

describe('EPPP distractor warning adjudication wave 02', () => {
  it('freezes all 18 unresolved raw entries with exact item and warning fingerprints', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const diagnostics = json('test_prep/eppp_distractor_quality_diagnostics.json');
    const bankById = new Map(bank.map((item) => [item.id, item]));
    const rawById = new Map(diagnostics.priorityDocket.map((item) => [item.id, item]));
    const extremeById = new Map(
      diagnostics.asymmetricExtremeDistractors.map((finding) => [finding.id, finding]),
    );

    expect(wave02).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'eppp-distractor-review-wave-02',
      reportType: 'assisted-editorial-warning-adjudication',
      summary: {
        reviewedItems: 18,
        retainedWithoutRevision: 18,
        revisedItems: 0,
        learnerFacingItemsChanged: 0,
        independentExpertValidated: 0,
        keyDistribution: [4, 5, 3, 6],
        status: 'assisted-editorial-review-complete-expert-pending',
      },
    });
    expect(wave02.items.map((item) => item.previousDocketRank))
      .toEqual(Array.from({ length: 18 }, (_value, index) => index + 3));
    expect(wave02.items.map((item) => item.actionRank))
      .toEqual(Array.from({ length: 18 }, (_value, index) => index + 1));

    // Later question-quality waves (23-33) re-authored all 18 items with the same keys and cleared
    // their extreme-distractor warnings, so the docket retires these adjudications as history.
    // A record still matched by a live raw warning must match it exactly.
    const retiredById = new Map(disposableDocket.retiredAdjudications.map((entry) => [entry.id, entry]));
    for (const review of wave02.items) {
      const item = bankById.get(review.id);
      const raw = rawById.get(review.id);
      const extreme = extremeById.get(review.id);
      expect(item).toBeTruthy();
      expect(review.answerIndex, review.id).toBe(item.answerIndex);
      expect(review.diagnosticsReviewed).toEqual(['asymmetric-extreme-distractors']);
      expect(review.itemFingerprintSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(review.warningFingerprintSha256).toMatch(/^[0-9a-f]{64}$/);
      if (raw || extreme) {
        expect(raw, review.id).toBeTruthy();
        expect(extreme, review.id).toBeTruthy();
        expect(review.prompt).toBe(item.prompt);
        expect(review.keyedChoice).toBe(item.choices[item.answerIndex]);
        expect(review.extremeDistractorFingerprint).toEqual({
          extremeDistractorIndexes: extreme.extremeDistractorIndexes,
          termsByDistractor: extreme.termsByDistractor,
        });
        expect(review.itemFingerprintSha256).toBe(itemFingerprint(item));
        expect(review.warningFingerprintSha256).toBe(warningFingerprint(raw, extreme));
        expect(review.sourceUrls.every((url) => item.references.includes(url))).toBe(true);
      } else {
        expect(retiredById.get(review.id), review.id).toMatchObject({
          reviewWave: 'eppp-distractor-review-wave-02',
          retirementReason: 'reviewed-warning-cleared-by-later-quality-work',
        });
        expect(item.wordingReviewWave, review.id).toMatch(/^eppp-native-quality-wave-\d+$/);
        expect(review.itemFingerprintSha256, review.id).not.toBe(itemFingerprint(item));
      }
      expect(review.resolution).toBe('reviewed-no-revision');
      expect(review.decision.length).toBeGreaterThanOrEqual(250);
      expect(review.sourceCheck.length).toBeGreaterThanOrEqual(180);
      expect(review.sourceUrls.length).toBeGreaterThan(0);
    }
  });

  it('covers prompt, choices, rationale, and all option feedback for every reviewed item', () => {
    const bankById = new Map(
      json('test_prep/eppp_native_items.json').map((item) => [item.id, item]),
    );
    for (const review of wave02.items) {
      const item = bankById.get(review.id);
      expect(item.prompt.length).toBeGreaterThan(20);
      expect(item.choices).toHaveLength(4);
      expect(item.choices.every((choice) => choice.length > 10)).toBe(true);
      expect(item.rationale.length).toBeGreaterThan(120);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales.every((feedback) => feedback.length >= 120)).toBe(true);
      expect(remainingLearnerMojibake(item)).toEqual([]);
    }
  });

  it('closes the bounded cycle with zero stale or actionable records and retained raw warnings', () => {
    expect(disposableDocket).toMatchObject({
      schemaVersion: 2,
      reportType: 'adjudication-aware-editorial-action-docket',
      docketCycle: 'eppp-distractor-action-cycle-02',
      // The wave-49 cleanup cleared every raw warning: all 23 recorded adjudications (wave 01's 5
      // and wave 02's 18; formerly 20 applied + 3 retired) are retained as retired history.
      summary: {
        rawPriorityDocketItems: 0,
        currentAdjudicationsApplied: 0,
        retiredAdjudications: 23,
        staleAdjudications: 0,
        actionItems: 0,
        learnerFacingItemsChanged: 0,
        independentExpertValidated: 0,
        expertValidationStatus: 'pending',
        status: 'pass',
      },
    });
    expect(disposableDocket.actionItems).toEqual([]);
    expect(disposableDocket.staleAdjudications).toEqual([]);
    expect(disposableDocket.appliedAdjudications.map((item) => item.originalDiagnosticRank))
      .toEqual(Array.from({ length: disposableDocket.summary.currentAdjudicationsApplied }, (_value, index) => index + 1));
    const retired = disposableDocket.retiredAdjudications;
    const wave01Ids = json('test_prep/eppp_distractor_review_wave_01.json').items.map((item) => item.id);
    expect(retired.map((item) => item.id).sort())
      .toEqual([...wave01Ids, ...wave02.items.map((item) => item.id)].sort());
    expect(retired.every((item) => item.retirementReason === 'reviewed-warning-cleared-by-later-quality-work')).toBe(true);
    expect(disposableDocket.sourceAdjudications).toHaveLength(2);
    expect(disposableDocket.sourceBankSha256)
      .toBe(sha256(read('test_prep/eppp_native_items.json')));
    expect(disposableDocket.sourceDiagnosticsSha256)
      .toBe(sha256(read('test_prep/eppp_distractor_quality_diagnostics.json')));

    const diagnostics = json('test_prep/eppp_distractor_quality_diagnostics.json');
    expect(diagnostics.summary).toMatchObject({
      totalItems: 1500,
      forbiddenAggregateChoices: 0,
      priorityDocketItems: disposableDocket.summary.rawPriorityDocketItems,
    });
    // Held at or below the wave-02 cycle's global counts.
    for (const [metric, ceiling] of Object.entries({
      uniqueKeyStemLexicalLeakageCandidates: 55,
      asymmetricExtremeDistractorCandidates: 120,
      advancedDirectRecallCandidates: 7,
      semanticConceptDuplicatePairs: 82,
      semanticConceptDuplicateClusters: 46,
    })) {
      expect(diagnostics.summary[metric], metric).toBeLessThanOrEqual(ceiling);
    }
  });

  it('publishes deterministic source/deploy-identical review and docket evidence', () => {
    const sourceDocketPath = path.join(
      temporaryRoot,
      'test_prep',
      'eppp_distractor_action_docket.json',
    );
    const deployDocketPath = path.join(
      temporaryRoot,
      'desktop',
      'web-app',
      'public',
      'test_prep',
      'eppp_distractor_action_docket.json',
    );
    const sourceReviewPath = path.join(
      temporaryRoot,
      'test_prep',
      'eppp_distractor_review_wave_02.json',
    );
    const deployReviewPath = path.join(
      temporaryRoot,
      'desktop',
      'web-app',
      'public',
      'test_prep',
      'eppp_distractor_review_wave_02.json',
    );
    expect(fs.readFileSync(sourceDocketPath, 'utf8')).toBe(firstDocketJson);
    expect(fs.readFileSync(deployDocketPath, 'utf8')).toBe(firstDocketJson);
    expect(fs.readFileSync(sourceReviewPath, 'utf8')).toBe(firstReviewJson);
    expect(fs.readFileSync(deployReviewPath, 'utf8')).toBe(firstReviewJson);
    expect(disposableReview).toEqual(wave02);
  });
});

describe('terminal EPPP Unicode normalization', () => {
  it('repairs a disposable mojibake preimage for every reviewed record without key drift', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const reviewedIds = new Set(wave02.items.map((item) => item.id));
    // Later waves left most reviewed records ASCII-only, so each gets a curly-quoted phrase in one
    // incorrect-option explanation: clean in `expected`, cp1252 mojibake in `fixture`. Any curly
    // apostrophe already in a prompt is corrupted in place as well.
    const expected = structuredClone(bank);
    const fixture = structuredClone(bank);
    const expectedById = new Map(expected.map((item) => [item.id, item]));
    let corruptedPrompts = 0;
    for (const item of fixture.filter((candidate) => reviewedIds.has(candidate.id))) {
      const clean = expectedById.get(item.id);
      const feedbackIndex = item.answerIndex === 0 ? 1 : 0;
      clean.choiceRationales[feedbackIndex] += ' \u201creviewed\u201d';
      item.choiceRationales[feedbackIndex] += ` ${cp1252Mojibake('\u201c')}reviewed${cp1252Mojibake('\u201d')}`;
      if (item.prompt.includes('\u2019')) {
        item.prompt = item.prompt.replace('\u2019', cp1252Mojibake('\u2019'));
        corruptedPrompts += 1;
      }
    }
    expect(corruptedPrompts).toBeGreaterThan(0);

    const beforeKeys = fixture.map((item) => item.answerIndex);
    const normalized = normalizeBank(fixture);
    expect(normalized.changedItems.map((item) => item.id).sort())
      .toEqual([...reviewedIds].sort());
    expect(normalized.bank.map((item) => item.answerIndex)).toEqual(beforeKeys);
    expect(normalized.bank).toEqual(expected);
  });

  it('keeps the current full bank clean, idempotent, and source/deploy-identical', () => {
    const bank = json('test_prep/eppp_native_items.json');
    expect(bank.flatMap((item) => remainingLearnerMojibake(item))).toEqual([]);
    expect(read('desktop/web-app/public/test_prep/eppp_native_items.json'))
      .toBe(read('test_prep/eppp_native_items.json'));

    const normalizationRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eppp-unicode-wave01-'));
    try {
      for (const relativePath of [
        'test_prep/eppp_native_items.json',
        'desktop/web-app/public/test_prep/eppp_native_items.json',
      ]) {
        copy(relativePath, normalizationRoot);
      }
      const first = runUnicodeNormalization({ rootPath: normalizationRoot, write: true });
      const firstText = fs.readFileSync(
        path.join(normalizationRoot, 'test_prep', 'eppp_native_items.json'),
        'utf8',
      );
      const second = runUnicodeNormalization({ rootPath: normalizationRoot, write: true });
      expect(first.summary).toMatchObject({
        changedItems: 0,
        remainingRepairableLearnerFields: 0,
        answerPositionsChanged: 0,
        status: 'pass',
      });
      expect(second.summary).toEqual(first.summary);
      expect(fs.readFileSync(
        path.join(
          normalizationRoot,
          'desktop',
          'web-app',
          'public',
          'test_prep',
          'eppp_native_items.json',
        ),
        'utf8',
      )).toBe(firstText);
    } finally {
      fs.rmSync(normalizationRoot, { recursive: true, force: true });
    }
  });

  it('keeps every native-bank replay writer and revision source fixer-clean', () => {
    const paths = [
      'dev-tools/build_eppp_1500_expansion.cjs',
      'dev-tools/repair_eppp_distractor_halving_campaign.cjs',
      'dev-tools/eppp_distractor_halving_campaign_manifest.cjs',
      'dev-tools/repair_eppp_feedback_halving_campaign.cjs',
      'dev-tools/eppp_feedback_halving_campaign_data.cjs',
      'dev-tools/complete_eppp_option_feedback.cjs',
      ...fs.readdirSync(path.join(root, 'dev-tools'))
        .filter((name) => /^eppp_native_quality_wave_\d+_data\.cjs$/.test(name))
        .map((name) => `dev-tools/${name}`),
    ];

    for (const relativePath of paths) {
      expect(repairText(read(relativePath)).changes, relativePath).toEqual([]);
    }
  });

  it('runs after all learner-facing writers and before final diagnostics and docketing', () => {
    const builder = read('dev-tools/build_eppp_1500_expansion.cjs');
    // The current-quality fast path (runCurrentQualityReplay) is defined first and repeats the
    // terminal steps, so check the order inside the full editorial replay chain.
    const chain = builder.indexOf('const runLatestEditorialReplay=');
    expect(chain).toBeGreaterThanOrEqual(0);
    const feedbackCampaign = builder.indexOf('runFeedbackHalvingCampaign();', chain);
    const normalization = builder.indexOf(
      "runReplayScript('./normalize_eppp_native_unicode.cjs').run({write:true});",
      chain,
    );
    const distractorAudit = builder.indexOf(
      "runReplayScript('./audit_eppp_distractor_quality.cjs');",
      normalization,
    );
    const docket = builder.indexOf(
      "runReplayScript('./build_eppp_distractor_action_docket.cjs');",
      normalization,
    );
    expect(feedbackCampaign).toBeGreaterThan(chain);
    expect(normalization).toBeGreaterThan(feedbackCampaign);
    expect(normalization).toBeLessThan(distractorAudit);
    expect(normalization).toBeLessThan(docket);
  });
});
