import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1700,
  appStyles: true,
});

// Screenshot-only; assertions live in 46-pets-punnett-goals.spec.ts.
test.describe('Pets Punnett challenges - visual review', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('captures unsolved, hint and solved states', async ({ page }, testInfo) => {
    await harness.mount(page, { petsLab: { view: 'genetics' } }, undefined, { expectCanvas: false });
    const panel = page.locator('.petslab-gene-goals');
    await expect(panel).toBeVisible();
    await panel.screenshot({ path: testInfo.outputPath('01-challenges.png') });

    await page.locator('#pets-gene-p1').selectOption('BBEE');
    await page.locator('#pets-gene-p2').selectOption('BBEE');
    await page.locator('.petslab-gene-goal-pick').filter({ hasText: 'yellow puppy' }).click();
    await page.locator('.petslab-gene-goal-hint').click();
    await panel.screenshot({ path: testInfo.outputPath('02-hint.png') });

    await page.locator('#pets-gene-p1').selectOption('bbEE');
    await page.locator('#pets-gene-p2').selectOption('BBee');
    await page.locator('.petslab-gene-goal-pick').filter({ hasText: 'unlike either parent' }).click();
    await expect(page.locator('.petslab-gene-goal-active')).toContainText('satisfies it');
    await panel.screenshot({ path: testInfo.outputPath('03-solved.png') });

    // The Punnett table itself, to confirm the corner header stays invisible.
    await page.locator('.petslab-punnett-table').screenshot({ path: testInfo.outputPath('04-table.png') });
  });
});
