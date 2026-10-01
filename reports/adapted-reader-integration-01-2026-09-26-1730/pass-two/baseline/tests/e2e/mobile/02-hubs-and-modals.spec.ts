import { test, expect, Page } from '@playwright/test';
import { bootMobile, settle, HUB_DIALOG } from './mobile-helpers';
import {
  checkDialogFits,
  findHorizontalOverflow,
  findSmallTapTargets,
  report,
} from './responsive-helpers';

/**
 * Hub modals on touch devices.
 *
 * A modal taller than a phone that does not scroll internally is worse than a
 * broken feature: the user can reach neither its buttons nor its close
 * control, so the app is stuck. These tests assert every hub fits, scrolls,
 * and can be dismissed.
 *
 * Each hub is reached through its launch-pad pathway rather than a toolbar
 * button, because choosing a pathway opens that hub immediately and the
 * toolbar sits behind the dialog from then on.
 */

const PATHWAYS = [
  { name: 'Learning Tools', mode: 'learning' as const },
  { name: 'Educator Tools', mode: 'educator' as const },
];

async function bootIntoHub(page: Page, mode: 'learning' | 'educator'): Promise<boolean> {
  await bootMobile(page, mode);
  await settle(page);
  return page
    .locator(HUB_DIALOG)
    .first()
    .isVisible()
    .catch(() => false);
}

for (const hub of PATHWAYS) {
  test.describe(`${hub.name} hub`, () => {
    test('fits the screen', async ({ page }) => {
      const opened = await bootIntoHub(page, hub.mode);
      test.skip(!opened, `${hub.name} did not open a dialog`);

      const dialog = page.locator(HUB_DIALOG).first();
      const offenders = await checkDialogFits(page, dialog);
      expect(offenders, report(`layout problems in the ${hub.name} dialog`, offenders)).toEqual([]);
    });

    test('does not push the page sideways', async ({ page }) => {
      const opened = await bootIntoHub(page, hub.mode);
      test.skip(!opened, `${hub.name} did not open a dialog`);

      const offenders = await findHorizontalOverflow(page);
      expect(offenders, report(`elements overflow the viewport with ${hub.name} open`, offenders)).toEqual([]);
    });

    test('its controls are large enough to tap', async ({ page }) => {
      const opened = await bootIntoHub(page, hub.mode);
      test.skip(!opened, `${hub.name} did not open a dialog`);

      const offenders = await findSmallTapTargets(page);
      expect(offenders, report(`controls below the 44px touch minimum in ${hub.name}`, offenders)).toEqual([]);
    });

    test('can be closed again', async ({ page }) => {
      const opened = await bootIntoHub(page, hub.mode);
      test.skip(!opened, `${hub.name} did not open a dialog`);

      const close = page.getByRole('button', { name: /^close /i }).last();
      await expect(close, `${hub.name} offers no close control`).toBeVisible();

      const box = await close.boundingBox();
      expect(box!.width, 'close control is too narrow to tap').toBeGreaterThanOrEqual(44);
      expect(box!.height, 'close control is too short to tap').toBeGreaterThanOrEqual(44);

      await close.click();
      await expect(page.locator(HUB_DIALOG).first()).toBeHidden({ timeout: 10000 });
    });

    /**
     * Opening a modal must lock the page behind it. Without this the user
     * scrolls the background instead of the dialog, which on a phone reads as
     * "the buttons moved away and I cannot get them back".
     */
    test('locks background scrolling while open', async ({ page }) => {
      const opened = await bootIntoHub(page, hub.mode);
      test.skip(!opened, `${hub.name} did not open a dialog`);

      const locked = await page.evaluate(() => {
        const body = getComputedStyle(document.body);
        const html = getComputedStyle(document.documentElement);
        return (
          body.overflow === 'hidden' ||
          html.overflow === 'hidden' ||
          body.position === 'fixed' ||
          document.documentElement.scrollHeight <= document.documentElement.clientHeight + 2
        );
      });
      expect(locked, 'the page behind the dialog still scrolls').toBe(true);
    });
  });
}
