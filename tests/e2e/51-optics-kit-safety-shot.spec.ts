import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// The safety notes only matter if a learner sees them. This opens the two
// spectroscope kits in a real browser and checks the warning is on screen.

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_optics.js',
  toolId: 'opticsLab',
  width: 1100,
  height: 1600,
  appStyles: true,
});

const OUT = 'C:/Users/cabba/AppData/Local/Temp/claude/C--Users-cabba/3f26ebce-3a20-4426-a764-9fbd1da6f531/scratchpad';

test.describe('Lab kit safety is visible, not just present in the data', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('the CD spectroscope shows its solar and laser warning when opened', async ({ page }) => {
    await harness.mount(page, {
      opticsLab: { mode: 'lab_kits', kitQuery: 'spectroscope', kitOpenId: 'spectroscope' },
    }, undefined, { expectCanvas: false });
    await page.waitForSelector('text=Lab Kits', { timeout: 15000 });

    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(body, 'the spectroscope safety note is not on screen').toMatch(/never the Sun itself/i);
    expect(body).toMatch(/never a laser/i);
    await page.screenshot({ path: `${OUT}/kit_safety_spectroscope.png`, fullPage: true });
  });
});
