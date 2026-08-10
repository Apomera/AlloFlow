/**
 * Colour-overlay coverage.
 *
 * The overlay is the Irlen-style reading tint (blue / peach / yellow, stored as
 * a plain string under `allo_color_overlay`). A reading tint is meant to cover
 * the visual field, so anything a student reads should sit UNDER it.
 *
 * As shipped it renders inside `.allo-docsuite` as:
 *     <div class="absolute inset-0 pointer-events-none z-[60] …"/>
 *
 * Measured live against the deployed app at 1280x720:
 *     overlay   top=240  height=480   (exactly .allo-docsuite's box)
 *     viewport           height=720   → 67% coverage, top 240px untinted
 *     overlay z=60, highest other layer z=100001
 *
 * So it under-covers for three independent reasons:
 *   1. `absolute`, not `fixed` — clipped to `.allo-docsuite`, missing the
 *      header/toolbar strip above it.
 *   2. `z-[60]` — every modal, toast (z-400), FAB stack (z-180) and watermark
 *      (z-1000) paints on top of it.
 *   3. portals — content portalled to document.body is outside the overlay's
 *      subtree at any z-index.
 *
 * FIXED in AlloFlowANTI.txt (portalled to <body>, fixed inset-0, z-2147483600)
 * and asserted at the source by tests/color_overlay_coverage.test.js.
 *
 * The three `test.fail()` markers below remain ONLY because this spec runs
 * against the DEPLOYED app, which still serves the old build. Once the fix is
 * deployed these flip to "unexpected pass" — that is the signal to delete the
 * markers, not to re-open the bug.
 */
import { test, expect, Page } from '@playwright/test';

async function bootWithOverlay(page: Page, mode: 'blue' | 'peach' | 'yellow' = 'blue') {
  // Seed before first paint — the app reads the preference during mount.
  await page.addInitScript((m) => {
    try { localStorage.setItem('allo_color_overlay', m as string); } catch {}
  }, mode);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
}

/** The tint layer: pointer-events:none, non-transparent, largest such box. */
async function overlayFacts(page: Page) {
  return page.evaluate(() => {
    const cands = Array.from(document.querySelectorAll('div')).filter((el) => {
      const cs = getComputedStyle(el);
      return cs.pointerEvents === 'none'
        && cs.backgroundColor !== 'rgba(0, 0, 0, 0)'
        && (cs.position === 'absolute' || cs.position === 'fixed')
        && /transition-colors/.test((el.className || '').toString());
    });
    if (!cands.length) return null;
    const el = cands.sort((a, b) =>
      (b.getBoundingClientRect().height * b.getBoundingClientRect().width)
      - (a.getBoundingClientRect().height * a.getBoundingClientRect().width))[0];
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    let maxZ = 0;
    for (const other of Array.from(document.querySelectorAll('*'))) {
      if (other === el) continue;
      const z = parseInt(getComputedStyle(other as Element).zIndex || '0', 10);
      // Ignore the landing splash, which is not part of the app chrome.
      if (!Number.isNaN(z) && z > maxZ && z < 2147483000) maxZ = z;
    }
    return {
      position: cs.position,
      zIndex: parseInt(cs.zIndex || '0', 10),
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      viewport: { w: window.innerWidth, h: window.innerHeight },
      parentIsBody: el.parentElement === document.body,
      highestOtherZ: maxZ,
    };
  });
}

test.describe('colour overlay coverage', () => {
  test('the tint renders when the preference is set', async ({ page }) => {
    await bootWithOverlay(page);
    const facts = await overlayFacts(page);
    console.log('overlay facts: ' + JSON.stringify(facts));
    expect(facts, 'the colour overlay should render when allo_color_overlay is set').toBeTruthy();
  });

  test.fail('the tint spans the full viewport', async ({ page }) => {
    await bootWithOverlay(page);
    const facts = await overlayFacts(page);
    expect(facts).toBeTruthy();
    // Today: top=240 of a 720px viewport, so the header strip is untinted.
    expect(facts!.rect.top, 'tint should start at the top of the viewport').toBeLessThanOrEqual(1);
    expect(facts!.rect.height, 'tint should be viewport-tall')
      .toBeGreaterThanOrEqual(facts!.viewport.h - 2);
  });

  test.fail('the tint stacks above every other layer', async ({ page }) => {
    await bootWithOverlay(page);
    const facts = await overlayFacts(page);
    expect(facts).toBeTruthy();
    // Today: 60 vs 100001.
    expect(facts!.zIndex, `tint (z=${facts!.zIndex}) must sit above the top layer (z=${facts!.highestOtherZ})`)
      .toBeGreaterThanOrEqual(facts!.highestOtherZ);
  });

  test.fail('the tint is attached to the body so portalled modals are covered', async ({ page }) => {
    await bootWithOverlay(page);
    const facts = await overlayFacts(page);
    expect(facts).toBeTruthy();
    // A layer nested inside .allo-docsuite can never cover a portal to body.
    expect(facts!.parentIsBody, 'tint should be a direct child of <body>').toBe(true);
  });
});
