import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// The Encyclopedia nav label claimed "120+ optical phenomena" while the
// database holds 72 and the panel itself honestly prints its own length.
// A student who opens the tab sees the label contradicted immediately.
// This reads the REAL rendered label in a browser, which is the only way to
// settle whether the load-time concat has run by the time the nav renders.

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_optics.js',
  toolId: 'opticsLab',
  width: 1200,
  height: 1400,
  appStyles: true,
});

test.describe('Optics Encyclopedia — the tab label matches the database', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('the nav description does not promise more entries than exist', async ({ page }) => {
    await harness.mount(page, { opticsLab: { mode: 'phenomena_db' } },
      undefined, { expectCanvas: false });
    await page.waitForSelector('text=Encyclopedia', { timeout: 15000 });

    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');

    // The panel prints "<n> entries", which is the ground truth.
    const entries = body.match(/(\d+)\s+entries/);
    expect(entries, 'the panel no longer reports its own entry count').toBeTruthy();
    const actual = Number(entries[1]);
    expect(actual).toBeGreaterThan(0);

    // The tab DESCRIPTION renders as the `title` tooltip, not as page text,
    // so reading document text alone would miss the claim entirely. Read the
    // attribute the student actually hovers.
    const tip = await page.locator('[title*="optical phenomena"]').first().getAttribute('title');
    expect(tip, 'the Encyclopedia tooltip is gone').toBeTruthy();

    const promised = tip.match(/(\d+)/);
    expect(promised, `the tooltip carries no count: "${tip}"`).toBeTruthy();
    expect(Number(promised[1]),
      `the tab tooltip says "${tip}" but the database holds ${actual}`).toBe(actual);
    expect(tip, 'the stale 120+ promise is back').not.toMatch(/\d+\+/);
  });
});
