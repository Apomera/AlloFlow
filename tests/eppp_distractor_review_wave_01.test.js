import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const bankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
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
  execFileSync(process.execPath, [docketScriptPath], { cwd: root, stdio: 'pipe' });
  bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  docket = JSON.parse(fs.readFileSync(docketPath, 'utf8'));
  diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
});

describe('EPPP distractor warning adjudication wave 01', () => {
  it('retains five source-bound historical decisions and identifies current versus stale fingerprints', () => {
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
    const currentAppliedIds = new Set(docket.appliedAdjudications.map((item) => item.id));
    const retiredIds = new Set(docket.retiredAdjudications.map((item) => item.id));
    review.items.forEach((item) => {
      const bankItem = bankById.get(item.id);
      expect(item.resolution).toBe('reviewed-no-revision');
      expect(item.diagnosticsReviewed).toEqual(['semantic-concept-duplicate-candidate']);
      expect(item.sourceCheck.length).toBeGreaterThanOrEqual(160);
      expect(item.sourceUrls.every((url) => /^https:\/\//.test(url))).toBe(true);
      if (currentAppliedIds.has(item.id)) {
        expect(item.prompt).toBe(bankItem.prompt);
        expect(item.answerIndex).toBe(bankItem.answerIndex);
        expect(item.keyedChoice).toBe(bankItem.choices[bankItem.answerIndex]);
      } else {
        expect(retiredIds.has(item.id)).toBe(true);
      }
      expect(item.pairedItems.length).toBeGreaterThan(0);
    });
  });

  it('preserves raw warnings while retiring cleared history and closing the current cycle', () => {
    const wave01AppliedIds = docket.appliedAdjudications
      .filter((item) => item.reviewWave === 'eppp-distractor-review-wave-01')
      .map((item) => item.id);
    const retiredIds = docket.retiredAdjudications.map((item) => item.id);
    expect(diagnostics.priorityDocket.map((item) => item.id).slice(0, wave01AppliedIds.length))
      .toEqual(wave01AppliedIds);
    // The wave-49 cleanup cleared every raw distractor warning, so all 23 recorded adjudications
    // (formerly 20 applied + 3 retired) are now retired history; none may be lost or go stale.
    expect(diagnostics.priorityDocket).toEqual([]);
    expect(docket).toMatchObject({
      schemaVersion: 2,
      reportType: 'adjudication-aware-editorial-action-docket',
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
    expect(docket.appliedAdjudications).toHaveLength(docket.summary.currentAdjudicationsApplied);
    expect(retiredIds).toHaveLength(docket.summary.retiredAdjudications);
    expect(new Set(retiredIds).size).toBe(retiredIds.length);
    expect(wave01AppliedIds).toEqual([]);
    expect(reviewedIds.every((id) => retiredIds.includes(id))).toBe(true);
    expect(docket.retiredAdjudications.every(
      (item) => item.retirementReason === 'reviewed-warning-cleared-by-later-quality-work',
    )).toBe(true);
    expect(docket.staleAdjudications).toEqual([]);
    expect(docket.actionItems).toEqual([]);
  });
  it('publishes deterministic source/deploy-identical evidence', () => {
    const firstReview = fs.readFileSync(reviewPath, 'utf8');
    const firstDocket = fs.readFileSync(docketPath, 'utf8');
    expect(fs.readFileSync(deployReviewPath, 'utf8')).toBe(firstReview);
    expect(fs.readFileSync(deployDocketPath, 'utf8')).toBe(firstDocket);
    execFileSync(process.execPath, [docketScriptPath], { cwd: root, stdio: 'pipe' });
    expect(fs.readFileSync(reviewPath, 'utf8')).toBe(firstReview);
    expect(fs.readFileSync(docketPath, 'utf8')).toBe(firstDocket);
  });
});
