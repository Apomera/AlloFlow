import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * ID Mystery Cases rendered its four suspects in authored order, and the answer is
 * the first option in 11 of the 12 cases — so pressing A every time scored 9/12
 * without reading a clue. The repo's position-bias gate credits this tool as
 * shuffled, but that credit comes from the Anatomy quiz; these cases never shuffled.
 *
 * The options are now ordered by a per-case hash. Two properties have to hold
 * together and neither is visible on screen:
 *   - the order must NOT track the authored one (or the bias returns), and
 *   - it must be STABLE for a given case, because a guess is stored as an index
 *     into possibleSpecies and persists across sessions.
 */
test.describe('Raptor Lab mystery-case option order', () => {
  test.describe.configure({ mode: 'serial' });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 1280, height: 900, appStyles: true });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });
  test.beforeEach(async ({ page }) => {
    await harness.mount(page, { raptorHunt: { activeSection: 'hub' } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block;padding:16px}' });
  });

  async function openCase(page: any, idx: number) {
    await page.evaluate((i: number) => {
      (window as any).__toolData.raptorHunt = { activeSection: 'mystery', caseIdx: i };
      (window as any).__rerender();
    }, idx);
    await page.waitForSelector('.rh-mystery-suspect');
  }

  test('guessing one position no longer substitutes for reading the clues', async ({ page }) => {
    const TOTAL = 12;
    const perSlot: number[] = [0, 0, 0, 0];
    for (let i = 0; i < TOTAL; i++) {
      for (let slot = 0; slot < 4; slot++) {
        await openCase(page, i);
        const opts = page.locator('.rh-mystery-suspect');
        if ((await opts.count()) <= slot) continue;
        await opts.nth(slot).click();
        await page.locator('.rh-mystery-submit').click();
        const verdict = await page.locator('[data-mystery-result]').first().getAttribute('data-mystery-result');
        if (verdict === 'correct') perSlot[slot] += 1;
        // clear this case's stored guess before trying the next slot
        await page.evaluate(() => {
          const d = (window as any).__toolData.raptorHunt;
          d.mysteryGuesses = {}; d.caseRevealed = {};
          (window as any).__rerender();
        });
      }
    }
    // Before the fix, slot A scored 9/12. Chance for four options is 3/12.
    // Allow headroom over chance, but nothing like a winning strategy.
    for (let slot = 0; slot < 4; slot++) {
      expect(perSlot[slot], `slot ${'ABCD'[slot]} scored ${perSlot[slot]}/${TOTAL} — position is a strategy again`)
        .toBeLessThanOrEqual(6);
    }
    // And the answers really are spread, not all parked in one other slot.
    expect(perSlot.filter((n) => n > 0).length, `answers only ever appear in ${perSlot.filter((n) => n > 0).length} slot(s)`)
      .toBeGreaterThanOrEqual(3);
    // At least one slot per case is correct. It can exceed TOTAL: case 12
    // (Prairie falcon / Gyrfalcon) accepts two of its four suspects.
    expect(perSlot.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(TOTAL);
  });

  test('a case keeps one order, so a saved guess still means the same bird', async ({ page }) => {
    await openCase(page, 0);
    const first = await page.locator('.rh-mystery-suspect-label').allTextContents();

    // Same case, re-rendered.
    await page.evaluate(() => (window as any).__rerender());
    await page.waitForTimeout(120);
    expect(await page.locator('.rh-mystery-suspect-label').allTextContents()).toEqual(first);

    // Navigate away and back — the order must not be re-rolled.
    await openCase(page, 5);
    await openCase(page, 0);
    expect(await page.locator('.rh-mystery-suspect-label').allTextContents()).toEqual(first);

    // A guess made now still resolves to the species that was clicked.
    const target = 2;
    const name = (await page.locator('.rh-mystery-suspect-label').nth(target).textContent())!.trim();
    await page.locator('.rh-mystery-suspect').nth(target).click();
    await expect(page.locator('.rh-mystery-suspect').nth(target)).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(() => (window as any).__rerender());
    await page.waitForTimeout(120);
    const stillPressed = page.locator('.rh-mystery-suspect[aria-pressed="true"]');
    await expect(stillPressed).toHaveCount(1);
    expect((await stillPressed.locator('.rh-mystery-suspect-label').textContent())!.trim()).toBe(name);
  });

  test('the displayed letters stay A-D in order after shuffling', async ({ page }) => {
    for (const idx of [0, 3, 11]) {
      await openCase(page, idx);
      expect(await page.locator('.rh-mystery-suspect-code').allTextContents()).toEqual(['A', 'B', 'C', 'D']);
      // Every suspect for this case is shown exactly once.
      const shown = await page.locator('.rh-mystery-suspect-label').allTextContents();
      expect(new Set(shown.map((s) => s.trim())).size).toBe(shown.length);
    }
  });
});
