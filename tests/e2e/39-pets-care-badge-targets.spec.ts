import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1100,
  appStyles: true,
});

test.describe('Pets Lab Care Sim badge targets', () => {
  test.describe.configure({ timeout: 180_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('shows a provisional four-part check and explains final energy misses', async ({ page }) => {
    const careSim = {
      species: 'dog',
      day: 6,
      choices: [
        { choiceId: 'skip' },
        { choiceId: 'long_alone' },
        { choiceId: 'ignore' },
        { choiceId: 'skip' },
        { choiceId: 'nothing' },
        { choiceId: 'alone_visits' },
        { choiceId: 'allow' },
      ],
      phys: 75,
      ment: 78,
      soc: 80,
      env: 76,
      en: 50,
      money: 120,
      startMoney: 800,
      lowMoney: false,
      tiredCare: 0,
      done: false,
      badgeEarned: false,
    };
    await harness.mount(
      page,
      { petsLab: { view: 'careSim', careSim } },
      undefined,
      { expectCanvas: false },
    );

    const current = page.getByRole('region', { name: 'Current badge check' });
    await expect(current).toHaveAttribute('data-pets-care-target-met', 'true');
    await expect(current.locator('.petslab-care-target-count'))
      .toHaveText('4 / 4 requirements met');
    await expect(current).toContainText('provisional until the week ends');
    await expect(current.locator('.petslab-care-target--fatigue'))
      .toHaveAttribute('data-pets-care-target-status', 'met');

    await page.evaluate(() => {
      const w = window as any;
      w.__ctx.update('petsLab', 'careSim', {
        ...w.__toolData.petsLab.careSim,
        en: 20,
        done: true,
        badgeEarned: false,
      });
    });

    const finalTarget = page.getByRole('region', { name: 'Caring Pet-Owner badge result' });
    await expect(finalTarget).toHaveAttribute('data-pets-care-target-met', 'false');
    await expect(finalTarget.locator('.petslab-care-target-count'))
      .toHaveText('3 / 4 requirements met');
    await expect(finalTarget.locator('.petslab-care-target--welfare'))
      .toHaveAttribute('data-pets-care-target-status', 'met');
    await expect(finalTarget.locator('.petslab-care-target--budget'))
      .toHaveAttribute('data-pets-care-target-status', 'met');
    await expect(finalTarget.locator('.petslab-care-target--energy'))
      .toHaveAttribute('data-pets-care-target-status', 'needs-attention');
    await expect(finalTarget.locator('.petslab-care-target--fatigue'))
      .toHaveAttribute('data-pets-care-target-status', 'met');
    await expect(page.locator('.petslab-care-reflection'))
      .toHaveAttribute('data-pets-care-target-met', 'false');
    await expect(page.locator('.petslab-care-reflection').locator(':scope > h3').first())
      .toContainText('caregiver-sustainability target was missed');
    await expect(page.getByText('Badge earned: Caring Pet-Owner')).toHaveCount(0);

    await page.evaluate(() => {
      const w = window as any;
      w.__ctx.update('petsLab', 'careSim', {
        ...w.__toolData.petsLab.careSim,
        en: 45,
        badgeEarned: true,
      });
    });

    await expect(finalTarget).toHaveAttribute('data-pets-care-target-met', 'true');
    await expect(finalTarget.locator('.petslab-care-target-count'))
      .toHaveText('4 / 4 requirements met');
    await expect(finalTarget.locator('.petslab-care-target--energy'))
      .toHaveAttribute('data-pets-care-target-status', 'met');
    await expect(page.locator('.petslab-care-reflection').locator(':scope > h3').first())
      .toContainText('Badge target met');
    await expect(page.getByText('Badge earned: Caring Pet-Owner')).toBeVisible();

    await page.evaluate(() => {
      const w = window as any;
      w.__ctx.update('petsLab', 'careSim', {
        ...w.__toolData.petsLab.careSim,
        lowMoney: true,
        badgeEarned: true,
      });
    });

    await expect(finalTarget).toHaveAttribute('data-pets-care-target-met', 'true');
    await expect(finalTarget.locator('.petslab-care-target--budget'))
      .toHaveAttribute('data-pets-care-target-status', 'met');
    await expect(finalTarget.locator('.petslab-care-target--budget'))
      .not.toContainText('balance went below $0');
    await expect(finalTarget.locator('.petslab-care-target--energy'))
      .toHaveAttribute('data-pets-care-target-status', 'met');
  });
});
