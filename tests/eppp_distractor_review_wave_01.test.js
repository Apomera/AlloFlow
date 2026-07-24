import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const bankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const reviewScriptPath = path.join(root, 'dev-tools', 'build_eppp_distractor_review_wave_01.cjs');
const docketScriptPath = path.join(root, 'dev-tools', 'build_eppp_distractor_action_docket.cjs');
const reviewPath = path.join(root, 'test_prep', 'eppp_distractor_review_wave_01.json');
const deployReviewPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_distractor_review_wave_01.json');
const docketPath = path.join(root, 'test_prep', 'eppp_distractor_action_docket.json');
const deployDocketPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_distractor_action_docket.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const reviewedIds = [
  'eppp-v2-professional-040',
  'eppp-b016-social-1',
  'eppp-b022-assessment-1',
  'eppp-v3-professional-030',
  'eppp-v2-professional-030',
];

let bank;
let review;
let docket;
let diagnostics;

beforeAll(() => {
  execFileSync(process.execPath, [reviewScriptPath], { cwd: root, stdio: 'pipe' });
  execFileSync(process.execPath, [docketScriptPath], { cwd: root, stdio: 'pipe' });
  bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  docket = JSON.parse(fs.readFileSync(docketPath, 'utf8'));
  diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
});

describe('EPPP distractor warning adjudication wave 01', () => {
  it('records five source-bound no-revision decisions without changing learner-facing items', () => {
    expect(review).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'eppp-distractor-review-wave-01',
      reportType: 'human-editorial-warning-adjudication',
      summary: {
        reviewedItems: 5,
        retainedWithoutRevision: 5,
        answerPositionsChanged: 0,
        learnerFacingItemsChanged: 0,
        status: 'pass',
      },
    });
    expect(review.items.map((item) => item.id)).toEqual(reviewedIds);
    const bankById = new Map(bank.map((item) => [item.id, item]));
    review.items.forEach((item) => {
      const bankItem = bankById.get(item.id);
      expect(item.resolution).toBe('reviewed-no-revision');
      expect(item.diagnosticsReviewed).toEqual(['semantic-concept-duplicate-candidate']);
      expect(item.sourceCheck.length).toBeGreaterThanOrEqual(160);
      expect(item.sourceUrls.every((url) => bankItem.references.includes(url))).toBe(true);
      expect(item.prompt).toBe(bankItem.prompt);
      expect(item.answerIndex).toBe(bankItem.answerIndex);
      expect(item.keyedChoice).toBe(bankItem.choices[bankItem.answerIndex]);
      expect(item.pairedItems.length).toBeGreaterThan(0);
    });
  });

  it('preserves raw warnings while advancing only unreviewed items into the action docket', () => {
    expect(diagnostics.priorityDocket.map((item) => item.id).slice(0, 5)).toEqual(reviewedIds);
    expect(docket).toMatchObject({
      schemaVersion: 1,
      reportType: 'adjudication-aware-editorial-action-docket',
      summary: {
        rawPriorityDocketItems: 20,
        currentAdjudicationsApplied: 5,
        staleAdjudications: 0,
        actionItems: 15,
        learnerFacingItemsChanged: 0,
        status: 'pass',
      },
    });
    expect(docket.actionItems.some((item) => reviewedIds.includes(item.id))).toBe(false);
    expect(docket.actionItems.map((item) => item.originalDiagnosticRank)).toEqual(
      Array.from({ length: 15 }, (_value, index) => index + 6),
    );
    expect(docket.actionItems.map((item) => item.actionRank)).toEqual(
      Array.from({ length: 15 }, (_value, index) => index + 1),
    );
  });

  it('publishes deterministic source/deploy-identical evidence', () => {
    const firstReview = fs.readFileSync(reviewPath, 'utf8');
    const firstDocket = fs.readFileSync(docketPath, 'utf8');
    expect(fs.readFileSync(deployReviewPath, 'utf8')).toBe(firstReview);
    expect(fs.readFileSync(deployDocketPath, 'utf8')).toBe(firstDocket);
    execFileSync(process.execPath, [reviewScriptPath], { cwd: root, stdio: 'pipe' });
    execFileSync(process.execPath, [docketScriptPath], { cwd: root, stdio: 'pipe' });
    expect(fs.readFileSync(reviewPath, 'utf8')).toBe(firstReview);
    expect(fs.readFileSync(docketPath, 'utf8')).toBe(firstDocket);
  });
});
