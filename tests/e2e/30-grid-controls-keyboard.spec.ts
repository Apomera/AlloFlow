/**
 * Class B mouse-only control: the Manipulatives geoboard.
 *
 * Clicking a peg selects it; clicking a second peg draws a segment between them. With
 * no role, no tabIndex and no key handler, the whole geoboard activity could not be
 * STARTED by keyboard, let alone completed.
 *
 * It is a grid, so it gets the grid pattern rather than N focusable pegs: one tab stop
 * onto the board, arrows to move within it, Enter to activate. Making every peg
 * focusable would put up to 100 tab stops between the board and the rest of the page.
 *
 * These drive REAL KEYS and assert the state changed. An attribute-only test passes
 * straight through a dead handler, which is exactly how this class survives audits.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000 });

test.describe('Manipulatives geoboard', () => {
  const harness = new GlHarness({
    toolFile: 'stem_lab/stem_tool_manipulatives.js',
    toolId: 'base10',
    preScripts: ['stem_lab/stem_lab_module.js'],
    width: 1100,
    height: 900,
  });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  async function mount(page: import('@playwright/test').Page) {
    await page.goto(`${(harness as any).base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.base10, null, { timeout: 30000 });
    await page.evaluate(() => (window as any).__mount({ _manipulatives: { mode: 'geoboard' } }));
    await page.waitForSelector('[data-gb-peg]', { timeout: 30000 });
    await page.waitForTimeout(300);
  }
  const state = (page: import('@playwright/test').Page) => page.evaluate(() => {
    const m = (window as any).__toolData?._manipulatives || {};
    return { selected: m.geoboardSelected, segments: (m.geoboardSegments || []).length, focus: m.geoboardFocus };
  });

  test('exposes exactly one tab stop onto the board', async ({ page }) => {
    await mount(page);
    const counts = await page.evaluate(() => {
      const pegs = [...document.querySelectorAll('[data-gb-peg]')] as HTMLElement[];
      return { total: pegs.length, reachable: pegs.filter((p) => p.tabIndex === 0).length };
    });
    expect(counts.total).toBeGreaterThan(4);
    expect(counts.reachable, 'a grid should not add one tab stop per cell').toBe(1);
  });

  test('Enter selects a peg and a second Enter draws a segment', async ({ page }) => {
    await mount(page);
    const before = await state(page);
    expect(before.segments).toBe(0);

    await page.locator('[data-gb-peg="0,0"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    expect((await state(page)).selected, 'Enter did not select a peg').toBeTruthy();

    // Move two pegs right, then join.
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);

    const after = await state(page);
    expect(after.segments, 'no segment was drawn by keyboard').toBe(1);
    expect(after.selected, 'selection should clear after joining').toBeFalsy();
  });

  test('Escape abandons a half-made segment', async ({ page }) => {
    await mount(page);
    await page.locator('[data-gb-peg="0,0"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(220);
    expect((await state(page)).selected).toBeTruthy();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(220);
    expect((await state(page)).selected, 'Escape did not clear the selection').toBeFalsy();
  });

  test('does not swallow Tab', async ({ page }) => {
    await mount(page);
    await page.locator('[data-gb-peg="0,0"]').focus();
    await page.keyboard.press('Tab');
    await page.waitForTimeout(220);
    const stuck = await page.evaluate(() =>
      !!(document.activeElement as HTMLElement)?.hasAttribute?.('data-gb-peg'));
    expect(stuck, 'Tab was swallowed — focus is trapped in the grid').toBe(false);
  });
});
