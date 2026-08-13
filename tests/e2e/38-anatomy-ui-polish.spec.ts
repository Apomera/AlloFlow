import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const desktopHarness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_anatomy.js',
  toolId: 'anatomy',
  width: 1280,
  height: 1500,
  appStyles: true,
  extraScripts: [
    'vendor/three-r128/OrbitControls.js',
    'vendor/three-r128/GLTFLoader.js',
  ],
});

const mobileHarness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_anatomy.js',
  toolId: 'anatomy',
  width: 390,
  height: 1800,
  appStyles: true,
  extraScripts: [
    'vendor/three-r128/OrbitControls.js',
    'vendor/three-r128/GLTFLoader.js',
  ],
});

const toolState = (extra: Record<string, unknown> = {}) => ({
  anatomy: {
    _activeTab: 'explore',
    system: 'skeletal',
    view: 'anterior',
    complexity: 3,
    selectedStructure: 'femur',
    ...extra,
  },
});

test.describe.configure({ timeout: 150_000 });
test.beforeAll(async () => {
  await desktopHarness.start();
  await mobileHarness.start();
});
test.afterAll(async () => {
  await desktopHarness.stop();
  await mobileHarness.stop();
});

test('model Focus mode enlarges the atlas and restores every surrounding panel', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await desktopHarness.mount(page, toolState(), undefined, { expectCanvas: false });

  const root = page.locator('[data-anatomy-tool="true"]');
  const frame = page.locator('[data-anatomy-canvas-frame="true"]');
  const sidePanel = page.locator('[data-anatomy-panel="explore"]');
  const focus = page.locator('[data-anatomy-model-focus-toggle="true"]');
  const before = await frame.boundingBox();

  const dashboard = page.locator('[data-anatomy-study-dashboard="true"]');
  await expect(dashboard).not.toHaveAttribute('open', '');
  await dashboard.locator('summary').click();
  await expect(dashboard).toHaveAttribute('open', '');
  await expect(dashboard.locator('.anatomy-metric')).toHaveCount(6);
  await dashboard.locator('summary').click();
  await expect(dashboard).not.toHaveAttribute('open', '');

  const tabStrip = page.locator('[data-anatomy-tab-strip="true"]');
  const tabLayout = await tabStrip.evaluate((node) => ({
    wrap: getComputedStyle(node).flexWrap,
    overflowX: getComputedStyle(node).overflowX,
    scrollWidth: (node as HTMLElement).scrollWidth,
    clientWidth: (node as HTMLElement).clientWidth,
  }));
  expect(tabLayout.wrap).toBe('nowrap');
  expect(tabLayout.overflowX).toBe('auto');
  expect(tabLayout.scrollWidth).toBeGreaterThanOrEqual(tabLayout.clientWidth);
  await page.locator('#anatomy-mode-tab-explore').focus();
  await page.keyboard.press('End');
  await expect(page.locator('#anatomy-mode-tab-homeoHunt')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-anatomy-panel="homeoHunt"]')).toHaveAttribute('aria-labelledby', 'anatomy-mode-tab-homeoHunt');
  const railBounds = await tabStrip.boundingBox();
  const activeBounds = await page.locator('#anatomy-mode-tab-homeoHunt').boundingBox();
  expect(railBounds).not.toBeNull();
  expect(activeBounds).not.toBeNull();
  expect(activeBounds!.x).toBeGreaterThanOrEqual(railBounds!.x - 1);
  expect(activeBounds!.x + activeBounds!.width).toBeLessThanOrEqual(railBounds!.x + railBounds!.width + 1);
  await page.locator('#anatomy-mode-tab-explore').click();

  await focus.click();
  await expect(root).toHaveAttribute('data-anatomy-model-focus', 'true');
  await expect(focus).toHaveText('Exit focus');
  await expect(sidePanel).toBeHidden();

  const after = await frame.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(after!.width).toBeGreaterThan(before!.width + 70);
  expect((await page.locator('[data-anatomy-model-shell="true"]').screenshot()).length)
    .toBeGreaterThan(18_000);

  await focus.click();
  await expect(root).toHaveAttribute('data-anatomy-model-focus', 'false');
  await expect(focus).toHaveText('Focus model');
  await expect(sidePanel).toBeVisible();
});

test('mobile Clinical Atlas keeps controls touch-sized and switches kidney to heart cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mobileHarness.mount(
    page,
    toolState({
      system: 'organs',
      view: 'posterior',
      selectedStructure: 'kidneys',
      _bodyView3d: true,
      _body3dStyle: 'clinical',
      _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3',
    }),
    `document.querySelector('[data-anatomy-3d-state="ready-model"]')`,
  );

  const topbarButtons = page.locator('.anatomy-topbar button');
  expect(await topbarButtons.count()).toBeGreaterThanOrEqual(3);
  for (let index = 0; index < await topbarButtons.count(); index += 1) {
    const box = await topbarButtons.nth(index).boundingBox();
    expect(box, `topbar button ${index} has no layout box`).not.toBeNull();
    expect(box!.height, `topbar button ${index} is not touch-sized`).toBeGreaterThanOrEqual(43.5);
  }

  const packSelect = page.locator('[data-anatomy-clinical-pack-switcher="true"] select');
  await expect(packSelect).toBeVisible();
  expect((await packSelect.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);

  await packSelect.selectOption('hra-heart-female-v1.3');
  await page.waitForSelector('[data-anatomy-atlas-pack="hra-heart-female-v1.3"][data-anatomy-3d-state="ready-model"]');
  await expect(page.locator('[data-anatomy-clinical-pack="hra-heart-female-v1.3"]')).toBeVisible();

  const conceptSearch = page.locator('[data-anatomy-clinical-concept-search="true"]');
  await expect(conceptSearch).toBeVisible();
  expect((await conceptSearch.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  await conceptSearch.fill('valve');
  await expect(page.locator('[data-anatomy-clinical-concept-results="true"]')).toContainText('5 of 17 matches');
  await expect(page.locator('[data-anatomy-clinical-concept-scroll="true"] [data-anatomy-clinical-concept]')).toHaveCount(6);
  await expect(page.locator('[data-anatomy-clinical-visual-key="true"]')).toBeVisible();
  await expect(page.locator('.anatomy-marker-legend')).toHaveCount(0);
  await expect(page.locator('[data-anatomy-circulatory-flow-legend="true"]')).toHaveCount(0);
  await conceptSearch.fill('');
  await expect(page.locator('[data-anatomy-clinical-concept-results="true"]')).toContainText('17 available');

  const concepts = page.locator('.anatomy-clinical-concept-grid');
  const overflow = await concepts.evaluate((node) => ({
    client: (node as HTMLElement).clientHeight,
    scroll: (node as HTMLElement).scrollHeight,
  }));
  expect(overflow.scroll).toBeGreaterThan(overflow.client);

  const horizontalLayout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    offenders: Array.from(document.querySelectorAll('body *')).map((node) => {
      const rect = (node as HTMLElement).getBoundingClientRect();
      return { tag: node.tagName, className: (node as HTMLElement).className || '', left: rect.left, right: rect.right, width: rect.width };
    }).filter((item) => item.right > window.innerWidth + 2 || item.left < -2).slice(0, 12),
  }));
  expect(horizontalLayout.pageWidth, `mobile Anatomy overflow: ${JSON.stringify(horizontalLayout.offenders)}`)
    .toBeLessThanOrEqual(horizontalLayout.viewport + 2);
  expect((await page.locator('[data-anatomy-model-shell="true"]').screenshot()).length)
    .toBeGreaterThan(18_000);
});

test('structure list hands focus to detail and Back restores the same visible option', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await desktopHarness.mount(
    page,
    toolState({ selectedStructure: null }),
    undefined,
    { expectCanvas: false },
  );

  const firstOption = page.locator('[data-anatomy-structure-option]').first();
  await expect(firstOption).toBeVisible();
  const structureId = await firstOption.getAttribute('data-anatomy-structure-option');
  expect(structureId, 'first structure option is missing its stable ID').toBeTruthy();
  if (!structureId) throw new Error('First structure option has no stable ID');

  await firstOption.focus();
  await expect(firstOption).toBeFocused();
  await firstOption.click();

  const detail = page.locator(`[data-anatomy-structure-detail="${structureId}"]`);
  const detailHeading = page.locator('[data-anatomy-structure-detail-heading="true"]');
  await expect(detail).toBeVisible();
  await expect(detailHeading).toBeFocused();

  await detail.getByRole('button', { name: /Back to structures from/i }).click();

  const restoredOption = page.locator(`[data-anatomy-structure-option="${structureId}"]`);
  await expect(restoredOption).toBeFocused();
  await expect(restoredOption).toBeVisible();
  await expect(restoredOption).toBeInViewport();
});
