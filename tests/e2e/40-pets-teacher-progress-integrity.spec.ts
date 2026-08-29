import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1100,
  appStyles: true,
});

const VALID_TIME = '2026-08-26T12:00:00.000Z';

function progressStat(page: Page, label: string) {
  return page.locator('.petslab-command-stat', {
    has: page.locator('.petslab-command-stat-label', { hasText: label }),
  }).locator('.petslab-command-stat-value');
}

test.describe('Pets Lab teacher evidence and progress integrity', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('Teacher Guide expands all 12 module records and collapses to the latest 10', async ({ page }) => {
    const moduleIds = [
      'dogs', 'cats', 'smallMammals', 'birds', 'reptiles', 'genetics',
      'zoonoses', 'service', 'welfare', 'picker', 'cost', 'famous',
    ];
    const evidenceRecords = moduleIds.map((moduleId, index) => ({
      moduleId,
      kind: 'self-review',
      recordedAt: new Date(Date.UTC(2026, 7, 26, 12, index)).toISOString(),
      details: {},
    }));

    await harness.mount(page, {
      petsLab: { view: 'teacher', evidenceRecords },
    }, undefined, { expectCanvas: false });

    const report = page.locator('.petslab-evidence-report');
    const cards = report.locator('#pets-evidence-grid').getByRole('listitem');
    const toggle = report.locator('.petslab-evidence-expand');

    await expect(cards).toHaveCount(10);
    await expect(report).toContainText('Showing 10 of 12 latest module records');
    await expect(toggle).toHaveText('Show all 12 module records');
    await expect(toggle).toHaveAttribute('aria-controls', 'pets-evidence-grid');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(cards).toHaveCount(12);
    await expect(report).toContainText('Showing 12 latest module records');
    await expect(toggle).toHaveText('Show latest 10');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await toggle.click();
    await expect(cards).toHaveCount(10);
    await expect(report).toContainText('Showing 10 of 12 latest module records');
    await expect(toggle).toHaveText('Show all 12 module records');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('null badge and progress maps render as empty progress', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'menu',
        badges: null,
        modulesVisited: null,
        modulesCompleted: null,
      },
    }, undefined, { expectCanvas: false });

    await expect(page.locator('.petslab-command-stats')).toBeVisible();
    await expect(progressStat(page, 'Started')).toHaveText(/^0 \/ \d+$/);
    await expect(progressStat(page, 'Completed')).toHaveText(/^0 \/ \d+$/);
    await expect(progressStat(page, 'Badges')).toHaveText('0');
    await expect(page.getByText('Badges earned', { exact: true })).toHaveCount(0);
  });

  test('malformed map entries cannot inflate progress or forge badge labels', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'menu',
        badges: {
          pets_quiz_pass: { earned: VALID_TIME, label: 'FORGED BADGE LABEL' },
          pets_quiz_ace: null,
          pets_explorer: [],
          removed_badge: { earned: VALID_TIME, label: 'Removed badge' },
        },
        modulesVisited: {
          dogs: VALID_TIME,
          cats: 'not-a-date',
          birds: null,
          quiz: { visited: VALID_TIME },
          removed_module: VALID_TIME,
        },
        modulesCompleted: {
          dogs: { completed: VALID_TIME, reason: 'Marked complete by learner' },
          cats: null,
          birds: 'not-a-record',
          quiz: { completed: 'not-a-date', reason: 'Activity completed' },
          removed_module: { completed: VALID_TIME, reason: 'Reviewed by learner' },
        },
      },
    }, undefined, { expectCanvas: false });

    await expect(page.locator('.petslab-command-stats')).toBeVisible();
    await expect(progressStat(page, 'Started')).toHaveText(/^1 \/ \d+$/);
    await expect(progressStat(page, 'Completed')).toHaveText(/^1 \/ \d+$/);
    await expect(progressStat(page, 'Badges')).toHaveText('1');
    await expect(page.getByText('Pets Quiz Passed', { exact: true })).toBeVisible();
    await expect(page.locator('#wrap')).not.toContainText('FORGED BADGE LABEL');
    await expect(page.locator('#wrap')).not.toContainText('Removed badge');

    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        badges: Object.keys(pets.badges || {}),
        visited: Object.keys(pets.modulesVisited || {}),
        completed: Object.keys(pets.modulesCompleted || {}),
        badgeLabel: pets.badges?.pets_quiz_pass?.label,
        completionReason: pets.modulesCompleted?.dogs?.reason,
      };
    })).toEqual({
      badges: ['pets_quiz_pass'],
      visited: ['dogs'],
      completed: ['dogs'],
      badgeLabel: 'Pets Quiz Passed',
      completionReason: 'Reviewed by learner',
    });
  });
});
