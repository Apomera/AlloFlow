import { test, expect } from '@playwright/test';
import {
  bootMobile,
  collectConsoleErrors,
  realErrors,
  settle,
  closeOpenHub,
  LAUNCH_PAD,
  HUB_DIALOG,
} from './mobile-helpers';
import {
  findHorizontalOverflow,
  findDocumentScroll,
  findSmallTapTargets,
  findClippedText,
  report,
} from './responsive-helpers';

/**
 * Core chrome on phones and tablets: the launch pad, the workspace shell, and
 * the controls a user needs on every screen.
 */

test.describe('Launch pad', () => {
  test('boots without script errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await bootMobile(page);
    expect(realErrors(errors), `console errors:\n${realErrors(errors).join('\n')}`).toEqual([]);
  });

  test('does not scroll sideways', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/');
    await page.locator(LAUNCH_PAD).waitFor({ state: 'visible', timeout: 60000 });
    await settle(page);

    const doc = await findDocumentScroll(page);
    expect(doc, `launch pad scrolls horizontally: ${doc?.scrollWidth}px in a ${doc?.clientWidth}px viewport`).toBeNull();
    void errors;
  });

  test('every pathway card is reachable and tappable', async ({ page }) => {
    await page.goto('/');
    const pad = page.locator(LAUNCH_PAD);
    await pad.waitFor({ state: 'visible', timeout: 60000 });
    await settle(page);

    const cards = page.locator('.lp-card');
    const count = await cards.count();
    expect(count, 'launch pad should offer pathway cards').toBeGreaterThan(0);

    // The grid is taller than the fixed-height pad, so the pad must scroll
    // internally. If it ever stops scrolling, the lower cards become dead.
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      expect(box, `card ${i} has no layout box`).not.toBeNull();
      const label = (await card.innerText()).trim().split('\n').join(' ').slice(0, 40);
      expect(box!.width, `card "${label}" is too narrow to tap`).toBeGreaterThanOrEqual(44);
      expect(box!.height, `card "${label}" is too short to tap`).toBeGreaterThanOrEqual(44);
    }
  });

  test('choosing a pathway enters its hub', async ({ page }) => {
    await bootMobile(page, 'learning');
    // The pad goes away and the chosen hub opens over the workspace.
    await expect(page.locator(LAUNCH_PAD)).toHaveCount(0);
    await expect(page.locator(HUB_DIALOG).first()).toBeVisible();
  });
});

test.describe('Workspace shell', () => {
  test.beforeEach(async ({ page }) => {
    await bootMobile(page);
    // Boot lands on the Learning Tools hub; close it to reach the workspace
    // underneath, which is what these tests are about.
    await closeOpenHub(page);
    await settle(page);
  });

  test('does not scroll sideways', async ({ page }) => {
    const doc = await findDocumentScroll(page);
    expect(doc, `workspace scrolls horizontally: ${doc?.scrollWidth}px in a ${doc?.clientWidth}px viewport`).toBeNull();
  });

  test('no element overflows the viewport', async ({ page }) => {
    const offenders = await findHorizontalOverflow(page);
    expect(offenders, report('elements overflow the viewport width', offenders)).toEqual([]);
  });

  test('no text is hard-clipped', async ({ page }) => {
    const offenders = await findClippedText(page);
    expect(offenders, report('elements clip their text with no ellipsis', offenders)).toEqual([]);
  });

  test('controls are large enough to tap', async ({ page }) => {
    const offenders = await findSmallTapTargets(page);
    expect(offenders, report('controls are below the 44px touch target minimum', offenders)).toEqual([]);
  });

  /**
   * iOS Safari zooms the whole page when a control with a font smaller than
   * 16px receives focus, and never zooms back out. It is the single most
   * common "the app goes weird when I tap the box" bug on iPad.
   */
  test('text fields do not trigger iOS zoom on focus', async ({ page }) => {
    const offenders = await page.evaluate(() => {
      const out: { desc: string; detail: string }[] = [];
      const fields = document.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select',
      );
      for (const el of Array.from(fields)) {
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const size = parseFloat(style.fontSize);
        if (size < 16) {
          const label = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.id || '';
          out.push({
            desc: `${el.tagName.toLowerCase()}${label ? ` "${label}"` : ''}`,
            detail: `font-size ${size}px < 16px — iOS Safari will zoom on focus`,
          });
        }
      }
      return out.slice(0, 20);
    });
    expect(offenders, report('text fields will trigger iOS zoom-on-focus', offenders)).toEqual([]);
  });

  test('a fixed header does not swallow the top of the content', async ({ page }) => {
    const overlap = await page.evaluate(() => {
      const fixed = Array.from(document.querySelectorAll<HTMLElement>('*')).filter((el) => {
        const r = el.getBoundingClientRect();
        // A *header*, not a full-screen overlay: an unbounded height test
        // matched the modal backdrop (839px tall in an 839px viewport) and
        // reported it as a header swallowing the page.
        if (r.top > 0 || r.height <= 20 || r.height > window.innerHeight * 0.4) return false;
        if (r.width <= window.innerWidth * 0.5) return false;
        return getComputedStyle(el).position === 'fixed';
      });
      if (fixed.length === 0) return null;
      const bar = fixed[0];
      const barRect = bar.getBoundingClientRect();
      const main = document.querySelector('main, [role="main"]');
      if (!main) return null;
      const mainRect = main.getBoundingClientRect();
      return mainRect.top < barRect.bottom - 2
        ? { barBottom: Math.round(barRect.bottom), mainTop: Math.round(mainRect.top) }
        : null;
    });
    expect(
      overlap,
      `fixed header covers the main content (header ends at ${overlap?.barBottom}px, content starts at ${overlap?.mainTop}px)`,
    ).toBeNull();
  });
});

test.describe('Orientation', () => {
  test('rotating does not break the layout', async ({ page }, testInfo) => {
    await bootMobile(page);
    await closeOpenHub(page);
    await settle(page);

    const size = page.viewportSize();
    test.skip(!size, 'no viewport to rotate');

    // Rotate to the opposite orientation and re-run the layout invariants.
    await page.setViewportSize({ width: size!.height, height: size!.width });
    await settle(page, 1200);

    const doc = await findDocumentScroll(page);
    expect(doc, `${testInfo.project.name} rotated: page scrolls horizontally (${doc?.scrollWidth} > ${doc?.clientWidth})`).toBeNull();

    const offenders = await findHorizontalOverflow(page);
    expect(offenders, `rotated: ${report('elements overflow the viewport', offenders)}`).toEqual([]);
  });
});
