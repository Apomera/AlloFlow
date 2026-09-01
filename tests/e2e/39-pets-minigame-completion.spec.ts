import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1100,
  appStyles: true,
});

const TOXIC_CORRECT = [
  'Multi-species hazard',
  'Cat-focused hazard',
  'Dog-focused hazard',
  'Dog-focused hazard',
  'Multi-species hazard',
  'Multi-species hazard',
  'Bird-focused hazard',
  'Dog-focused hazard',
  'No listed toxin',
  'No listed toxin',
];

const LIFESPAN_CORRECT = [
  'Under 3 years',
  '10–20 years',
  '50+ years',
  '50+ years',
  '3–10 years',
  '10–20 years',
  '10–20 years',
  '3–10 years',
  '20–50 years',
  '10–20 years',
];

async function toxicIndex(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__toolData.petsLab.tfsIdx);
}

async function lifespanIndex(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__toolData.petsLab.lsIdx);
}

async function answerToxic(page: Page, correct: boolean): Promise<void> {
  const group = page.getByRole('group', { name: 'Choose the best hazard pattern' });
  const index = await toxicIndex(page);
  const right = TOXIC_CORRECT[index];
  if (correct) {
    await group.getByRole('button', { name: right, exact: true }).click();
    return;
  }
  const labels = await group.getByRole('button').evaluateAll((buttons) => buttons.map(
    (button) => button.getAttribute('aria-label') || ''
  ));
  const wrong = labels.find((label) => label !== right);
  if (!wrong) throw new Error('No wrong Toxic Foods choice for item ' + index);
  await group.getByRole('button', { name: wrong, exact: true }).click();
}

async function answerLifespan(page: Page, correct: boolean): Promise<void> {
  const group = page.getByRole('group', { name: 'Pick the lifespan range' });
  const index = await lifespanIndex(page);
  const right = LIFESPAN_CORRECT[index];
  if (correct) {
    await group.getByRole('button', { name: right, exact: true }).click();
    return;
  }
  const labels = await group.getByRole('button').evaluateAll((buttons) => buttons.map(
    (button) => button.getAttribute('aria-label') || ''
  ));
  const wrong = labels.find((label) => label !== right);
  if (!wrong) throw new Error('No wrong Lifespan choice for item ' + index);
  await group.getByRole('button', { name: wrong, exact: true }).click();
}

test.describe('Pets Lab mini-game learning records and completion policy', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('Nutrition leads with an accessible call-first poison response protocol', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'nutrition',
        tfsOpen: true,
        tfsIdx: 0,
        tfsSeed: 1,
        tfsAns: false,
        tfsPick: null,
        tfsScore: 0,
        tfsRounds: 0,
        tfsStreak: 0,
        tfsBest: 0,
        tfsShown: [0],
      },
    }, undefined, { expectCanvas: false });

    const protocol = page.locator('[data-pets-poison-protocol="ready"]');
    await expect(protocol).toHaveAttribute('aria-labelledby', 'pets-poison-protocol-heading');
    await expect(protocol.getByRole('heading', { name: /Suspected poisoning: act now/i })).toBeVisible();
    await expect(protocol).toContainText('Do not wait for symptoms');
    await expect(protocol).toContainText('Do not induce vomiting');
    await expect(protocol).toContainText('estimated amount and time');
    await expect(protocol.getByRole('listitem')).toHaveCount(4);
    await expect(protocol.locator('a[href="tel:+18884264435"]')).toBeVisible();
    await expect(protocol.locator('a[href="tel:+18557647661"]')).toBeVisible();

    await expect(page.locator('[data-pets-hazard-card]')).toHaveCount(8);
    await expect(page.locator('[data-pets-hazard-card]').filter({ hasText: 'Risk context:' })).toHaveCount(8);
    await expect(page.getByText('Threshold:', { exact: true })).toHaveCount(0);

    const boundary = page.locator('[data-pets-hazard-boundary="classification-only"]');
    await expect(boundary).toContainText('cannot rule out poisoning');
    await expect(boundary).toContainText('calculate a safe dose');
    await expect(page.getByRole('group', { name: 'Choose the best hazard pattern' })).toBeVisible();
  });

  test('Nutrition teaches a five-check food-label decoder with disclosure practice', async ({ page }) => {
    await harness.mount(page, {
      petsLab: { view: 'nutrition' },
    }, undefined, { expectCanvas: false });

    const decoder = page.locator('[data-pets-food-label-decoder="evidence-first"]');
    await expect(decoder).toHaveAttribute('aria-labelledby', 'pets-food-label-heading');
    await expect(decoder.getByRole('heading', { name: 'Pet Food Label Decoder' })).toBeVisible();
    await expect(decoder.locator('[data-pets-label-check]')).toHaveCount(5);
    await expect(decoder.locator('[data-pets-label-case]')).toHaveCount(3);

    const contrast = decoder.locator('[data-pets-label-evidence-contrast="shown"]');
    await expect(contrast).toContainText('Nutritional-adequacy');
    await expect(contrast).toContainText("One ingredient's position");

    const moistureNote = decoder.locator('[data-pets-label-moisture-note="as-fed-warning"]');
    await expect(moistureNote).toContainText('cannot be compared directly');
    await expect(moistureNote).toContainText('dry-matter basis');

    const dogTreat = decoder.locator('[data-pets-label-case="dog-treat"]');
    await dogTreat.locator('summary').click();
    await expect(dogTreat).toHaveAttribute('open', '');
    await expect(dogTreat).toContainText('not a nutritionally complete sole diet');

    const sources = decoder.locator('a[target="_blank"]');
    await expect(sources).toHaveCount(3);
    expect(await sources.evaluateAll((links) => links.map((link) => link.getAttribute('rel'))))
      .toEqual(['noopener', 'noopener', 'noopener']);
  });

  test('Household Hazard Sleuth preserves cumulative score through Next and records a sanitized ten-item result', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'nutrition',
        tfsOpen: true,
        tfsIdx: 0,
        tfsSeed: 1,
        tfsAns: false,
        tfsPick: null,
        tfsScore: 0,
        tfsRounds: 0,
        tfsStreak: 0,
        tfsBest: 0,
        tfsShown: [0],
      },
    }, undefined, { expectCanvas: false });

    for (let step = 0; step < 10; step += 1) {
      await answerToxic(page, step !== 0);
      await expect.poll(() => page.evaluate(() => {
        const pets = (window as any).__toolData.petsLab;
        return { rounds: pets.tfsRounds, score: pets.tfsScore };
      })).toEqual({ rounds: step + 1, score: step });

      if (step === 1) {
        await expect(page.getByText('1 / 2', { exact: true })).toBeVisible();
      }
      if (step < 9) {
        await page.getByRole('button', { name: /Next vignette/ }).click();
        await expect.poll(() => page.evaluate(() => (
          (window as any).__toolData.petsLab.tfsAns
        ))).toBe(false);
      }
    }

    await expect(page.getByText(/All 10 vignettes complete/)).toBeVisible();
    await expect(page.locator('[data-pets-target-status="met"]')).toContainText('Activity target met: 8/10 or higher');
    const missedReview = page.locator('[data-pets-toxic-review="available"]');
    await expect(missedReview).toContainText('Review your 1 missed hazard case');
    const missedCase = page.locator('[data-pets-toxic-review-item="0"]');
    await expect(missedCase.locator('summary')).toContainText('Dark chocolate');
    await missedCase.locator('summary').click();
    await expect(missedCase).toContainText('Correct pattern: Multi-species hazard');
    await expect(missedCase).toContainText('Chocolate methylxanthines');
    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      const records = (pets.evidenceRecords || []).filter(
        (record: any) => record.moduleId === 'nutrition' && record.kind === 'activity'
      );
      const record = records.at(-1);
      return {
        details: record?.details,
        detailKeys: Object.keys(record?.details || {}).sort(),
        completion: pets.modulesCompleted?.nutrition?.reason,
      };
    })).toEqual({
      details: {
        score: 9,
        total: 10,
        scorePct: 90,
        needsPractice: 1,
        criterionMet: true,
      },
      detailKeys: ['criterionMet', 'needsPractice', 'score', 'scorePct', 'total'],
      completion: expect.any(String),
    });

    expect(await page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return { missed: pets.tfsMissed, review: pets.tfsReview };
    })).toEqual({ missed: [0], review: null });

    await page.getByRole('button', { name: 'Retry 1 missed case' }).click();
    const focusedRetry = page.locator('[data-pets-toxic-retry="active"]');
    await expect(focusedRetry).toContainText('Dark chocolate');
    const retryGroup = page.getByRole('group', { name: 'Retry the missed hazard case' });
    await retryGroup.getByRole('button', { name: 'No listed toxin', exact: true }).click();
    await expect(focusedRetry).toContainText('Not yet — correct pattern: Multi-species hazard');
    await expect(focusedRetry).toContainText('This case stays in the rotation');
    await page.getByRole('button', { name: 'Try this case again' }).click();
    await retryGroup.getByRole('button', { name: 'Multi-species hazard', exact: true }).click();
    await expect(focusedRetry).toContainText('Correct — Multi-species hazard');
    await page.getByRole('button', { name: 'Finish focused retry' }).click();
    await expect(page.locator('[data-pets-toxic-retry="complete"]')).toContainText(
      'every missed hazard case was identified correctly'
    );
    expect(await page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      const records = (pets.evidenceRecords || []).filter(
        (record: any) => record.moduleId === 'nutrition' && record.kind === 'activity'
      );
      return {
        review: pets.tfsReview,
        recordCount: records.length,
        detailKeys: Object.keys(records.at(-1)?.details || {}).sort(),
      };
    })).toEqual({
      review: { ids: [0], queue: [], pick: null, done: true },
      recordCount: 1,
      detailKeys: ['criterionMet', 'needsPractice', 'score', 'scorePct', 'total'],
    });
  });

  test('Household Hazard Sleuth labels a below-target result and keeps every sanitized miss available', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'nutrition',
        tfsOpen: true,
        tfsIdx: 9,
        tfsSeed: 11,
        tfsAns: true,
        tfsPick: 'safe',
        tfsScore: 7,
        tfsRounds: 10,
        tfsStreak: 1,
        tfsBest: 3,
        tfsShown: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        tfsMissed: [0, 1, 1, 2, 99, 'private-answer'],
      },
    }, undefined, { expectCanvas: false });

    await expect(page.locator('[data-pets-target-status="needs-practice"]')).toContainText(
      'Activity target needs practice: reach 8/10 or higher'
    );
    const review = page.locator('[data-pets-toxic-review="available"]');
    await expect(review).toContainText('Review your 3 missed hazard cases');
    await expect(review.locator('[data-pets-toxic-review-item]')).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Retry 3 missed cases' })).toBeVisible();
    await expect(page.getByText('private-answer')).toHaveCount(0);
  });

  test('Lifespan preserves cumulative score through Next and records a sanitized ten-item result', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'lifespan',
        lsIdx: 6,
        lsSeed: 1,
        lsAns: false,
        lsPick: null,
        lsScore: 0,
        lsRounds: 0,
        lsStreak: 0,
        lsBest: 0,
        lsShown: [6],
      },
    }, undefined, { expectCanvas: false });

    for (let step = 0; step < 10; step += 1) {
      await answerLifespan(page, step !== 0);
      await expect.poll(() => page.evaluate(() => {
        const pets = (window as any).__toolData.petsLab;
        return { rounds: pets.lsRounds, score: pets.lsScore };
      })).toEqual({ rounds: step + 1, score: step });

      if (step === 1) {
        await expect(page.getByText('1 / 2', { exact: true })).toBeVisible();
      }
      if (step < 9) {
        await page.getByRole('button', { name: /Next species/ }).click();
        await expect.poll(() => page.evaluate(() => (
          (window as any).__toolData.petsLab.lsAns
        ))).toBe(false);
      }
    }

    await expect(page.getByText(/All 10 species complete/)).toBeVisible();
    await expect(page.locator('[data-pets-target-status="met"]')).toContainText('Activity target met: 8/10 or higher');
    const missedReview = page.locator('[data-pets-lifespan-review="available"]');
    await expect(missedReview).toContainText('Review your 1 missed species');
    const missedSpecies = page.locator('[data-pets-lifespan-review-item="6"]');
    await expect(missedSpecies.locator('summary')).toContainText('Cockatiel');
    await missedSpecies.locator('summary').click();
    await expect(missedSpecies).toContainText('Typical range: 15-25 years');
    await expect(missedSpecies).toContainText('Accepted bucket: 10–20 years or 20–50 years');
    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      const records = (pets.evidenceRecords || []).filter(
        (record: any) => record.moduleId === 'lifespan' && record.kind === 'activity'
      );
      const record = records.at(-1);
      return {
        details: record?.details,
        detailKeys: Object.keys(record?.details || {}).sort(),
        completion: pets.modulesCompleted?.lifespan?.reason,
      };
    })).toEqual({
      details: {
        score: 9,
        total: 10,
        scorePct: 90,
        needsPractice: 1,
        criterionMet: true,
      },
      detailKeys: ['criterionMet', 'needsPractice', 'score', 'scorePct', 'total'],
      completion: expect.any(String),
    });

    expect(await page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return { missed: pets.lsMissed, review: pets.lsReview };
    })).toEqual({ missed: [6], review: null });

    await page.getByRole('button', { name: 'Retry 1 missed species' }).click();
    const focusedRetry = page.locator('[data-pets-lifespan-retry="active"]');
    await expect(focusedRetry).toContainText('Cockatiel');
    const retryGroup = page.getByRole('group', { name: 'Retry the missed lifespan case' });
    await retryGroup.getByRole('button', { name: '10–20 years', exact: true }).click();
    await expect(focusedRetry).toContainText('Accepted — 10–20 years or 20–50 years');
    await page.getByRole('button', { name: 'Finish focused retry' }).click();
    await expect(page.locator('[data-pets-lifespan-retry="complete"]')).toContainText(
      'every missed species was matched to an accepted lifespan bucket'
    );
    expect(await page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      const records = (pets.evidenceRecords || []).filter(
        (record: any) => record.moduleId === 'lifespan' && record.kind === 'activity'
      );
      return {
        review: pets.lsReview,
        recordCount: records.length,
        detailKeys: Object.keys(records.at(-1)?.details || {}).sort(),
      };
    })).toEqual({
      review: { ids: [6], queue: [], pick: null, done: true },
      recordCount: 1,
      detailKeys: ['criterionMet', 'needsPractice', 'score', 'scorePct', 'total'],
    });
  });

  test('Lifespan labels a below-target result and keeps every sanitized miss available', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'lifespan',
        lsIdx: 9,
        lsSeed: 11,
        lsAns: true,
        lsPick: 'b3',
        lsScore: 7,
        lsRounds: 10,
        lsStreak: 1,
        lsBest: 3,
        lsShown: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        lsMissed: [0, 1, 1, 2, 99, 'private-answer'],
      },
    }, undefined, { expectCanvas: false });

    await expect(page.locator('[data-pets-target-status="needs-practice"]')).toContainText(
      'Activity target needs practice: reach 8/10 or higher'
    );
    const review = page.locator('[data-pets-lifespan-review="available"]');
    await expect(review).toContainText('Review your 3 missed species');
    await expect(review.locator('[data-pets-lifespan-review-item]')).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Retry 3 missed species' })).toBeVisible();
    await expect(page.getByText('private-answer')).toHaveCount(0);
  });

  test('corrupt shown/round combinations cannot render either ten-item completion', async ({ page }) => {
    const shown = Array.from({ length: 10 }, (_, index) => index);
    await harness.mount(page, {
      petsLab: {
        view: 'nutrition',
        tfsOpen: true,
        tfsIdx: 9,
        tfsSeed: 1,
        tfsAns: true,
        tfsPick: 'safe',
        tfsScore: 1,
        tfsRounds: 1,
        tfsStreak: 1,
        tfsBest: 1,
        tfsShown: shown,
      },
    }, undefined, { expectCanvas: false });

    await expect(page.getByText(/All 10 vignettes complete/)).toHaveCount(0);
    expect(await page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        completion: pets.modulesCompleted?.nutrition,
        evidence: (pets.evidenceRecords || []).filter((row: any) => row.moduleId === 'nutrition'),
      };
    })).toEqual({ completion: undefined, evidence: [] });

    await page.evaluate(() => localStorage.clear());
    await harness.mount(page, {
      petsLab: {
        view: 'lifespan',
        lsIdx: 9,
        lsSeed: 1,
        lsAns: true,
        lsPick: 'b3',
        lsScore: 1,
        lsRounds: 1,
        lsStreak: 1,
        lsBest: 1,
        lsShown: shown,
      },
    }, undefined, { expectCanvas: false });

    await expect(page.getByText(/All 10 species complete/)).toHaveCount(0);
    expect(await page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        completion: pets.modulesCompleted?.lifespan,
        evidence: (pets.evidenceRecords || []).filter((row: any) => row.moduleId === 'lifespan'),
      };
    })).toEqual({ completion: undefined, evidence: [] });
  });

  test('manual completion is unavailable for activity modules but remains for a static species module', async ({ page }) => {
    const activityViews = [
      'training', 'nutrition', 'zoonoses', 'bodyLang', 'careSim',
      'quiz', 'aiPractice', 'lifespan', 'sensory',
    ];

    for (const view of activityViews) {
      await page.evaluate(() => localStorage.clear()).catch(() => {});
      await harness.mount(page, { petsLab: { view } }, undefined, { expectCanvas: false });
      await expect(
        page.locator('.petslab-complete-button'),
        view + ' must complete through its activity, not a manual review button'
      ).toHaveCount(0);
    }

    await page.evaluate(() => localStorage.clear());
    await harness.mount(page, { petsLab: { view: 'dogs' } }, undefined, { expectCanvas: false });
    const manual = page.locator('.petslab-complete-button');
    await expect(manual).toHaveCount(1);
    await manual.click();
    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      const record = (pets.evidenceRecords || []).filter(
        (row: any) => row.moduleId === 'dogs'
      ).at(-1);
      return {
        completed: !!pets.modulesCompleted?.dogs,
        kind: record?.kind,
        details: record?.details,
      };
    })).toEqual({ completed: true, kind: 'self-review', details: {} });
  });
});
