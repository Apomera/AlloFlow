import { test, expect, Page } from '@playwright/test';

/**
 * A shared link must open the TOOL, not the error card.
 *
 * Found 2026-09-10 by opening /app/?tool=zoomGallery in the live app: the
 * header said "Zoom Gallery" and the card said "The plugin loaded but did not
 * register with STEAM Lab." 42-deep-link-visitor.spec.ts was green throughout,
 * because "body contains /zoom gallery/i" is satisfied by the error card's own
 * heading. So this spec asserts what a visitor needs instead:
 *
 *   1. window.StemLab._registry[<id>] exists  (the plugin registered)
 *   2. window.StemLab has the full helper set  (ensureThree etc.; a plugin that
 *      ran before stem_lab_module.js used to leave a six-method shim in place,
 *      so every 3D tool from a shared link lost its engine)
 *   3. no "could not load" card, and the tool's own surface is there
 *
 * Root cause and fix: the deep link requested the plugin <script> before the
 * module had come through the deferred pump. The ANTI loader now holds a STEM
 * plugin until AlloModules.StemLab exists, the module adopts a pre-seeded shim,
 * and the two newest tools install the shim instead of returning. Tools are
 * chosen to cover each path: two that used to `return` (one canvas 2D, one
 * 3D), one that installed a shim and needs ensureThree, and Zoom Gallery.
 *
 * Runs against the deployed shell (baseURL), so it goes green only after the
 * deploy that carries 93d3a517a. Cold boot plus deep-link apply can take
 * 15-75 s headless; every wait is condition-based with a generous ceiling.
 */

test.describe.configure({ timeout: 240000 });

const TOOLS = [
  { id: 'scaleExplorer', name: 'Scale Explorer', surface: '#sx-ladder button', minSurface: 50, needs3d: false },
  { id: 'zoomGallery', name: 'Zoom Gallery', surface: 'button[aria-label*="Earthrise"]', minSurface: 1, needs3d: false },
  { id: 'solarSystem', name: 'Solar System', surface: 'canvas', minSurface: 1, needs3d: true },
  { id: 'geologyExplorer', name: 'Geology Explorer', surface: 'canvas', minSurface: 1, needs3d: true },
];

const HELPERS = ['ensureThree', 'loadScriptResilient', 'setupHiDPI', 'registerTool', 'isRegistered', 'renderTool'];

async function openDeepLink(page: Page, id: string): Promise<void> {
  await page.goto(`./?tool=${id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body && document.body.innerHTML.length > 5000, null, { timeout: 90000 });
}

for (const tool of TOOLS) {
  test(`?tool=${tool.id} registers the plugin and opens ${tool.name}`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));

    await openDeepLink(page, tool.id);

    // 1. Registered. This is the assertion the error card cannot satisfy.
    await page.waitForFunction(
      (id) => { const w = window as any; return !!(w.StemLab && w.StemLab._registry && w.StemLab._registry[id]); },
      tool.id,
      { timeout: 150000 },
    );

    // 2. The full StemLab, not a plugin's shim.
    const keys: string[] = await page.evaluate(() => Object.keys((window as any).StemLab || {}));
    for (const helper of HELPERS) {
      expect(keys, `${tool.id}: StemLab lacks ${helper} (a plugin shim was kept, or the module never ran)`).toContain(helper);
    }

    // 3. No error card, and the tool's own surface rendered.
    await expect(page.locator('body')).not.toContainText(/could not load/i);
    await expect(page.locator(tool.surface).first()).toBeAttached({ timeout: 60000 });
    const surfaceCount = await page.locator(tool.surface).count();
    expect(surfaceCount, `${tool.id}: expected at least ${tool.minSurface} of ${tool.surface}`).toBeGreaterThanOrEqual(tool.minSurface);

    if (tool.needs3d) {
      // A shim-first session used to reach exactly this text.
      await expect(page.locator('body')).not.toContainText(/3D engine could not load/i);
    }

    // Diagnostics only: uncaught errors are worth seeing in the report, but a
    // third-party script's noise must not fail a check about registration.
    test.info().annotations.push({ type: 'pageErrors', description: pageErrors.join(' | ') || 'none' });
  });
}

test('an unknown tool id still opens the plain app (the map validates, it does not guess)', async ({ page }) => {
  await openDeepLink(page, 'notARealToolSlug');
  await page.waitForTimeout(3000);
  await expect(page.locator('body')).not.toContainText(/could not load/i);
  const opened = await page.evaluate(() => !!document.querySelector('[data-stem-lab="true"]'));
  expect(opened, 'an unknown ?tool= must not open the STEAM Lab overlay').toBe(false);
});
