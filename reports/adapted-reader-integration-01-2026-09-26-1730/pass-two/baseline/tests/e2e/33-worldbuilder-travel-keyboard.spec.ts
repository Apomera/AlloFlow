/**
 * World Builder — travelling between rooms was impossible without a mouse.
 *
 * The room nodes on the world map declared role="button" and an aria-label ("Travel to
 * the Great Hall") and then supplied neither tabIndex nor a key handler. A screen reader
 * announced a travel control that could not be focused or pressed. Travel is the only
 * navigation in the world, so this was not an awkward path — there was no path.
 *
 * REACHING THIS VIEW. Seeding state does not work: the map needs a selected world AND a
 * current room, and seeding selectedWorld alone collapses the whole tool to 46 characters.
 * So this drives the tool's own UI to get there, which is both more robust and closer to
 * what a student does. That approach is what unblocked this site after two earlier
 * attempts stalled on state seeding.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'worldBuilder',
  toolFile: 'stem_lab/stem_tool_worldbuilder.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1100,
  height: 950,
});

test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

/** Open a world by clicking it, exactly as a student would. */
async function enterWorld(page: import('@playwright/test').Page) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.worldBuilder, null, { timeout: 30000 });
  await page.evaluate(() => (window as any).__mount({}));
  await page.waitForTimeout(500);
  await page.locator('#wrap button', { hasText: 'Enchanted Realm' }).first().click();
  await page.waitForSelector('[data-wb-room]', { timeout: 30000 });
  await page.waitForTimeout(300);
}

const room = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as any).__toolData?.worldBuilder?.currentRoom ?? null);

test('every travelable room is focusable and named', async ({ page }) => {
  await enterWorld(page);
  const nodes = await page.evaluate(() =>
    [...document.querySelectorAll('[data-wb-room]')].map((e) => ({
      tab: (e as HTMLElement).tabIndex,
      role: e.getAttribute('role'),
      label: e.getAttribute('aria-label') || '',
    })));
  expect(nodes.length).toBeGreaterThan(0);
  for (const n of nodes) {
    expect(n.role).toBe('button');
    // The role was already here. The tabIndex was not, which is what made the
    // announcement a promise the control could not keep.
    expect(n.tab, 'declares role=button but cannot be focused').toBe(0);
    expect(n.label).toMatch(/^Travel to /);
  }
});

test('Enter travels to the room, which no keyboard could do before', async ({ page }) => {
  await enterWorld(page);
  const start = await room(page);
  expect(start).toBeTruthy();

  const first = page.locator('[data-wb-room]').first();
  const target = await first.getAttribute('data-wb-room');
  await first.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  const now = await room(page);
  expect(now, 'Enter did not move the player').not.toBe(start);
  expect(now).toBe(target);
});

test('Space travels too', async ({ page }) => {
  await enterWorld(page);
  const start = await room(page);
  const first = page.locator('[data-wb-room]').first();
  const target = await first.getAttribute('data-wb-room');
  await first.focus();
  await page.keyboard.press(' ');
  await page.waitForTimeout(400);
  expect(await room(page)).toBe(target);
  expect(await room(page)).not.toBe(start);
});

test('does not swallow Tab', async ({ page }) => {
  await enterWorld(page);
  await page.locator('[data-wb-room]').first().focus();
  const id = await page.locator('[data-wb-room]').first().getAttribute('data-wb-room');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);
  const stuck = await page.evaluate((rid) =>
    (document.activeElement as HTMLElement)?.getAttribute?.('data-wb-room') === rid, id);
  expect(stuck, 'Tab was swallowed — focus is trapped on the map').toBe(false);
});
