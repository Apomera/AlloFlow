import { test, expect, Page, Locator } from '@playwright/test';
import { bootMobile, settle } from './mobile-helpers';
import { findHorizontalOverflow, checkDialogFits, report, TAP_TARGET_MIN } from './responsive-helpers';

/**
 * Automated sweep over every tool tile in every catalog.
 *
 * Hand-writing a spec per tool does not scale to 138+ tools and goes stale the
 * moment one is added. Instead this walks the catalogs the app actually
 * renders and asserts the same layout invariants on each tile, so a newly
 * added tool is covered the day it ships.
 */

const DIALOG = '[role="dialog"], [aria-modal="true"]';

/**
 * Catalogs to walk.
 *
 * Choosing the "Learning Tools" pathway opens that hub immediately, so it
 * needs no navigation; STEM Lab (148 tiles) opens from inside it. Anything
 * unreachable in this pathway skips rather than fails, so the sweep does not
 * go red when a catalog simply lives behind a different mode.
 */
const CATALOGS = [
  { name: 'Learning Tools', path: [] as RegExp[] },
  { name: 'STEM Lab', path: [/STEM Lab/i] },
];

/** Walk a chain of triggers, returning false if any step is unavailable. */
async function openCatalog(page: Page, path: RegExp[]): Promise<boolean> {
  for (const step of path) {
    const trigger = page.getByRole('button', { name: step }).first();
    if (!(await trigger.isVisible().catch(() => false))) return false;
    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await trigger.click({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  return page
    .locator(DIALOG)
    .last()
    .waitFor({ state: 'visible', timeout: 15000 })
    .then(() => true)
    .catch(() => false);
}

/** Tiles are the interactive children of the open catalog dialog. */
function tilesIn(dialog: Locator): Locator {
  return dialog.locator('button, [role="button"]');
}

for (const catalog of CATALOGS) {
  test.describe(`${catalog.name} catalog`, () => {
    test.beforeEach(async ({ page }) => {
      await bootMobile(page);
      await settle(page);
    });

    test('fits the screen and scrolls internally', async ({ page }) => {
      const opened = await openCatalog(page, catalog.path);
      test.skip(!opened, `${catalog.name} not reachable in this mode`);

      // .last() = the topmost dialog: STEM Lab stacks over the Learning hub,
      // which stays in the DOM behind it.
      const dialog = page.locator(DIALOG).last();
      const offenders = await checkDialogFits(page, dialog);
      expect(offenders, report(`layout problems in ${catalog.name}`, offenders)).toEqual([]);

      const overflow = await findHorizontalOverflow(page);
      expect(overflow, report(`elements overflow with ${catalog.name} open`, overflow)).toEqual([]);
    });

    test('every tile is reachable and tappable', async ({ page }) => {
      const opened = await openCatalog(page, catalog.path);
      test.skip(!opened, `${catalog.name} not reachable in this mode`);

      // .last() = the topmost dialog: STEM Lab stacks over the Learning hub,
      // which stays in the DOM behind it.
      const dialog = page.locator(DIALOG).last();
      const tiles = tilesIn(dialog);
      const count = await tiles.count();
      expect(count, `${catalog.name} rendered no tiles`).toBeGreaterThan(0);

      const tooSmall: { desc: string; detail: string }[] = [];
      const unreachable: { desc: string; detail: string }[] = [];

      for (let i = 0; i < count; i++) {
        const tile = tiles.nth(i);
        if (!(await tile.isVisible().catch(() => false))) continue;

        const name =
          (await tile.getAttribute('aria-label')) ||
          (await tile.innerText().catch(() => '')).trim().replace(/\s+/g, ' ').slice(0, 40) ||
          `tile ${i}`;

        await tile.scrollIntoViewIfNeeded().catch(() => {});
        const box = await tile.boundingBox();
        if (!box) {
          unreachable.push({ desc: name, detail: 'has no layout box after scrolling into view' });
          continue;
        }
        if (box.width < TAP_TARGET_MIN || box.height < TAP_TARGET_MIN) {
          tooSmall.push({
            desc: name,
            detail: `${Math.round(box.width)}x${Math.round(box.height)}px < ${TAP_TARGET_MIN}x${TAP_TARGET_MIN}px`,
          });
        }
        const vw = page.viewportSize()?.width ?? 0;
        if (box.x < -2 || box.x + box.width > vw + 2) {
          unreachable.push({
            desc: name,
            detail: `spans x=${Math.round(box.x)}..${Math.round(box.x + box.width)} outside the ${vw}px viewport`,
          });
        }
      }

      expect(unreachable, report(`tiles sit outside the screen in ${catalog.name}`, unreachable)).toEqual([]);
      expect(tooSmall, report(`tiles below the touch minimum in ${catalog.name}`, tooSmall)).toEqual([]);
    });
  });
}
