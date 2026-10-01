import { test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Screenshot review for the Sleuth predict gate. Not assertions — these exist
// so a human can see what the learner sees at the moment of the decision.

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_optics.js',
  toolId: 'opticsLab',
  width: 1100,
  height: 1500,
  appStyles: true,
});

const OUT = 'C:/Users/cabba/AppData/Local/Temp/claude/C--Users-cabba/3f26ebce-3a20-4426-a764-9fbd1da6f531/scratchpad';

test.describe('Sleuth shots', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('start, before-pick and after-pick', async ({ page }) => {
    await harness.mount(page, { opticsLab: { mode: 'sleuth' } }, undefined, { expectCanvas: false });
    await page.waitForSelector('text=Sign Convention Sleuth', { timeout: 15000 });
    await page.screenshot({ path: `${OUT}/sleuth_1_start.png`, fullPage: true });

    await harness.mount(page, { opticsLab: { mode: 'sleuth', ssIdx: 1, ssShown: [1], ssRounds: 3, ssScore: 2, ssSeed: 9 } },
      undefined, { expectCanvas: false });
    await page.waitForSelector('[role="radiogroup"]', { timeout: 15000 });
    await page.screenshot({ path: `${OUT}/sleuth_2_before.png`, fullPage: true });

    await page.locator('[role="radio"]').nth(1).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/sleuth_3_after_correct.png`, fullPage: true });

    await harness.mount(page, { opticsLab: { mode: 'sleuth', ssIdx: 2, ssShown: [2], ssRounds: 4, ssScore: 2, ssSeed: 5 } },
      undefined, { expectCanvas: false });
    await page.waitForSelector('[role="radiogroup"]', { timeout: 15000 });
    await page.locator('[role="radio"]').nth(0).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/sleuth_4_after_wrong.png`, fullPage: true });
  });
});
