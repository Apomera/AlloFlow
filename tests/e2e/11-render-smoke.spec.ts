import { test, expect, Page } from '@playwright/test';

/**
 * Render smoke test — open each major surface and assert it mounts without a
 * fatal error / ErrorBoundary trip.
 *
 * Why: the static gate (dev-tools/check_render_refs.cjs) catches the
 * undeclared-identifier render-crash + won't-parse classes across all CDN
 * modules. This test catches what static analysis can't — runtime crashes when
 * a surface actually mounts: prop-shape mismatches (the `gameCompletions`
 * object-vs-array TypeError), useEffect-body refs, and anything the host's
 * ErrorBoundary catches. Runs against the deployed app (playwright baseURL).
 *
 * Selectors are the ones proven in specs 06 (STEM Lab) and 07 (SEL Hub /
 * StoryForge / AlloHaven). To extend: add a {name, tile} once the tile's
 * accessible text is confirmed (e.g. Word Sounds, the Teacher dashboard — the
 * surfaces that crashed this cycle; their render-crash class is already covered
 * by the static gate, so this is additive runtime coverage).
 */

const SURFACES: { name: string; tile: RegExp }[] = [
  { name: 'STEM Lab', tile: /STEM Lab.*interactive math/i },
  { name: 'SEL Hub', tile: /SEL Hub.*self-awareness/i },
  { name: 'StoryForge', tile: /StoryForge/i },
  { name: 'AlloHaven', tile: /AlloHaven.*focusing/i },
];

// App-specific crash signatures: the ErrorBoundary/CDN error logs + uncaught
// Reference/Type errors (the classes that have reached the pilot).
const FATAL = /caught by ErrorBoundary|\[CDN-ERROR\]|\[CDN-STACK\]|Uncaught (Reference|Type)Error/i;
// Known third-party / environment noise (mirrors the filter in 01-app-boot).
const NOISE = /firestore|firebase|workbox|favicon|googletagmanager|tracking|GA_|chrome-extension|error_reporter_module|cdn\.jsdelivr.*403/i;

function captureFatals(page: Page): string[] {
  const fatals: string[] = [];
  // Any uncaught exception is a fatal (this is what ErrorBoundary catches).
  page.on('pageerror', (e) => fatals.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (NOISE.test(t)) return;
    if (FATAL.test(t)) fatals.push('console: ' + t.slice(0, 220));
  });
  return fatals;
}

async function openLearningTools(page: Page) {
  await page.goto('/');
  await page.waitForTimeout(3000);
  await page.locator('[role="button"][aria-label^="Learning Tools."]').first().click({ force: true });
  await page.waitForTimeout(2500);
}

test.describe('Render smoke — surfaces mount without a fatal error', () => {
  test('app boots without a fatal error', async ({ page }) => {
    const fatals = captureFatals(page);
    await page.goto('/');
    await page.waitForTimeout(6000);
    expect(fatals, fatals.join('\n')).toEqual([]);
  });

  for (const s of SURFACES) {
    test(`open ${s.name} -> no fatal error`, async ({ page }) => {
      const fatals = captureFatals(page);
      await openLearningTools(page);
      await page.locator('button').filter({ hasText: s.tile }).first().click({ force: true });
      await page.waitForTimeout(7000);
      expect(fatals, `${s.name} produced fatal(s):\n${fatals.join('\n')}`).toEqual([]);
    });
  }
});
