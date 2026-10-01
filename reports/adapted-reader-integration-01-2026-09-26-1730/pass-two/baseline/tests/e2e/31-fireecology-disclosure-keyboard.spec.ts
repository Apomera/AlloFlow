/**
 * Fire Ecology — the fire-dependent species gallery was a mouse-only disclosure.
 *
 * Each card expands to reveal how that species depends on fire. With no role, no
 * tabIndex and no key handler, the expanded content did not exist for a keyboard user:
 * not awkward to reach, simply absent.
 *
 * A disclosure needs aria-expanded as much as it needs focusability. Without it a
 * screen-reader user can press the control and get no report of what happened.
 *
 * Drives REAL KEYS and asserts the content appeared. An attribute-only test passes
 * straight through a dead handler.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'fireEcology',
  toolFile: 'stem_lab/stem_tool_fireecology.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1100,
  height: 900,
});

test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: import('@playwright/test').Page) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.fireEcology, null, { timeout: 30000 });
  await page.evaluate(() => (window as any).__mount({ fireEcology: { tab: 'smokeSeeds' } }));
  await page.waitForSelector('[data-fe-seed]', { timeout: 30000 });
  await page.waitForTimeout(300);
}

test('each species card is focusable and reports its state', async ({ page }) => {
  await mount(page);
  const cards = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-fe-seed]')] as HTMLElement[];
    return els.map((e) => ({ tab: e.tabIndex, role: e.getAttribute('role'), exp: e.getAttribute('aria-expanded') }));
  });
  expect(cards.length).toBeGreaterThan(1);
  for (const c of cards) {
    expect(c.tab).toBe(0);
    expect(c.role).toBe('button');
    // Collapsed to begin with, and it must SAY so.
    expect(c.exp).toBe('false');
  }
});

// NOTE ON WHAT THESE ASSERT. The harness stores this tool's state but does not
// re-render it from that slice, so aria-expanded does not flip in the DOM here — and it
// does not flip for a MOUSE click either, which is how I know that is a harness limit
// and not the tool. So activation is asserted where it IS observable: the state the
// handler writes. Enter and Space must land the same value a click lands.
test('Enter writes the same state a click writes', async ({ page }) => {
  await mount(page);
  const read = () => page.evaluate(() =>
    (window as any).__toolData?.fireEcology?.selectedSeed ?? null);
  expect(await read()).toBeNull();

  await page.locator('[data-fe-seed="1"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  expect(await read(), 'Enter did not open the disclosure').toBe(1);
});

test('Space activates too, and a second card replaces the first', async ({ page }) => {
  await mount(page);
  const read = () => page.evaluate(() =>
    (window as any).__toolData?.fireEcology?.selectedSeed ?? null);

  await page.locator('[data-fe-seed="2"]').focus();
  await page.keyboard.press(' ');
  await page.waitForTimeout(350);
  expect(await read(), 'Space did not activate').toBe(2);

  await page.locator('[data-fe-seed="0"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  expect(await read()).toBe(0);
});

test('does not swallow Tab', async ({ page }) => {
  await mount(page);
  await page.locator('[data-fe-seed="0"]').focus();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);
  const stuck = await page.evaluate(() =>
    (document.activeElement as HTMLElement)?.getAttribute?.('data-fe-seed') === '0');
  expect(stuck, 'Tab was swallowed').toBe(false);
});
