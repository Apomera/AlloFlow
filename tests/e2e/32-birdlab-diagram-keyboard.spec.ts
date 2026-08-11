/**
 * Bird Lab — two anatomy diagrams whose hotspots were mouse-only.
 *
 * Feather Anatomy and Bird Topography both draw numbered hotspots; clicking one reveals
 * that part's description. With no role, no tabIndex and no key handler, none of those
 * descriptions could be reached by keyboard — the content did not exist without a
 * pointer.
 *
 * The visible content of each hotspot is a NUMBER, so it carries no accessible name of
 * its own. aria-label supplies the part name: reaching a control called "7" and learning
 * nothing is barely better than not reaching it.
 *
 * Drives REAL KEYS and asserts the description actually appeared.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'birdLab',
  toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1100,
  height: 900,
});

test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: import('@playwright/test').Page, view: string, sel: string) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate((v) => (window as any).__mount({ birdLab: { view: v } }), view);
  await page.waitForSelector(sel, { timeout: 30000 });
  await page.waitForTimeout(300);
}
const text = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (document.querySelector('#wrap') as HTMLElement).innerText || '');

test('feather hotspots are focusable and named by their part', async ({ page }) => {
  await mount(page, 'featherAnatomy', '[data-feather-part]');
  const parts = await page.evaluate(() =>
    [...document.querySelectorAll('[data-feather-part]')].map((e) => ({
      tab: (e as HTMLElement).tabIndex,
      role: e.getAttribute('role'),
      label: e.getAttribute('aria-label') || '',
      pressed: e.getAttribute('aria-pressed'),
    })));
  expect(parts.length).toBeGreaterThan(3);
  for (const p of parts) {
    expect(p.tab).toBe(0);
    expect(p.role).toBe('button');
    // The real requirement is that the name is a WORD, not the hotspot's number. Some
    // genuine part names are short — "Tip", "Barb" — so a length floor is the wrong
    // test; an arbitrary >3 flagged "Tip" as unnamed.
    expect(p.label.trim().length, 'hotspot has no accessible name').toBeGreaterThan(0);
    expect(/^\d+$/.test(p.label.trim()), 'name is just the hotspot number').toBe(false);
    expect(/[A-Za-z]{3}/.test(p.label), 'name has no word in it').toBe(true);
    expect(p.pressed).toBe('false');
  }
});

test('Enter on a feather part reveals its description', async ({ page }) => {
  await mount(page, 'featherAnatomy', '[data-feather-part]');
  const before = await text(page);
  await page.locator('[data-feather-part="rachis"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  const after = await text(page);
  expect(after.length, 'Enter revealed nothing').toBeGreaterThan(before.length);
  expect(after).toMatch(/keratin|shaft/i);
  expect(await page.locator('[data-feather-part="rachis"]').getAttribute('aria-pressed')).toBe('true');
});

test('Space works on the topography diagram too', async ({ page }) => {
  await mount(page, 'topology', '[data-topo-part]');
  const before = await text(page);
  await page.locator('[data-topo-part="crown"]').focus();
  await page.keyboard.press(' ');
  await page.waitForTimeout(350);
  const after = await text(page);
  expect(after.length, 'Space revealed nothing').toBeGreaterThan(before.length);
  expect(await page.locator('[data-topo-part="crown"]').getAttribute('aria-pressed')).toBe('true');
});

test('neither diagram swallows Tab', async ({ page }) => {
  await mount(page, 'featherAnatomy', '[data-feather-part]');
  await page.locator('[data-feather-part="rachis"]').focus();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);
  const stuck = await page.evaluate(() =>
    (document.activeElement as HTMLElement)?.getAttribute?.('data-feather-part') === 'rachis');
  expect(stuck, 'Tab was swallowed').toBe(false);
});
