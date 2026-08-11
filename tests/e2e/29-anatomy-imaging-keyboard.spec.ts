/**
 * Anatomy Lab — the imaging canvas was Class A: announced but dead.
 *
 * It carried role="img" + tabIndex=0 + aria-label + onClick and NO key handler. A
 * keyboard user could tab to it and hear it described, and Enter did nothing. Placing
 * annotation pins and ruler measurements on the scan is the entire activity in that
 * view, so it was not awkward without a mouse, it was impossible.
 *
 * These tests drive REAL KEYS and assert the state changed. An attribute-only test
 * passes straight through a dead handler — that is exactly how the class survives
 * audits, since role and aria-label are all present and axe is satisfied.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_anatomy.js',
  toolId: 'anatomy',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1180,
  height: 1000,
});

test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mountImaging(page: import('@playwright/test').Page) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.anatomy, null, { timeout: 30000 });
  await page.evaluate(() => (window as any).__mount({ anatomy: { _activeTab: 'imaging' } }));
  await page.waitForSelector('[data-anatomy-imaging-canvas]', { timeout: 30000 });
  await page.waitForTimeout(400);
}

/** Annotations the tool has stored for the imaging view. */
async function annotationCount(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const img = (window as any).__toolData?.anatomy?.imaging;
    return (img && Array.isArray(img.annotations)) ? img.annotations.length : 0;
  });
}

test('the canvas takes focus and declares itself operable', async ({ page }) => {
  await mountImaging(page);
  const canvas = page.locator('[data-anatomy-imaging-canvas]');
  await canvas.focus();

  const state = await page.evaluate(() => {
    const c = document.querySelector('[data-anatomy-imaging-canvas]') as HTMLElement;
    return {
      focused: document.activeElement === c,
      role: c.getAttribute('role'),
      tabIndex: c.tabIndex,
      label: c.getAttribute('aria-label') || '',
    };
  });
  expect(state.focused, 'canvas cannot take focus').toBe(true);
  expect(state.tabIndex).toBe(0);
  // role="img" on a focusable, operable surface is a contradiction: an image is not a
  // control, so nothing tells the user there is anything to press.
  expect(state.role).toBe('application');
  expect(state.label).toMatch(/Arrow keys/i);
  expect(state.label).toMatch(/Enter/i);
});

test('Enter places an annotation, which was impossible without a mouse', async ({ page }) => {
  await mountImaging(page);
  const before = await annotationCount(page);

  await page.locator('[data-anatomy-imaging-canvas]').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);

  const after = await annotationCount(page);
  expect(after, 'Enter did not place an annotation').toBeGreaterThan(before);
});

test('arrow keys move the placement cursor before committing', async ({ page }) => {
  await mountImaging(page);
  const canvas = page.locator('[data-anatomy-imaging-canvas]');
  await canvas.focus();

  const read = () => page.evaluate(() => {
    const img = (window as any).__toolData?.anatomy?.imaging || {};
    return { x: img.kbX, y: img.kbY };
  });

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  const moved = await read();
  expect(typeof moved.x, 'ArrowRight did not move the cursor').toBe('number');
  expect(moved.x).toBeGreaterThan(0.5);

  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(250);
  const down = await read();
  expect(down.y).toBeGreaterThan(0.5);

  // The annotation must land where the cursor was driven to, not at a fixed point.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  const placed = await page.evaluate(() => {
    const a = ((window as any).__toolData?.anatomy?.imaging?.annotations) || [];
    return a[a.length - 1];
  });
  expect(placed, 'nothing was placed').toBeTruthy();
  expect(placed.x).toBeCloseTo(down.x, 5);
  expect(placed.y).toBeCloseTo(down.y, 5);
});

test('it does not swallow Tab, which would trap focus', async ({ page }) => {
  await mountImaging(page);
  await page.locator('[data-anatomy-imaging-canvas]').focus();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);
  const stillOnCanvas = await page.evaluate(() =>
    !!(document.activeElement as HTMLElement)?.hasAttribute?.('data-anatomy-imaging-canvas'));
  expect(stillOnCanvas, 'Tab was swallowed — focus is trapped on the canvas').toBe(false);
});
